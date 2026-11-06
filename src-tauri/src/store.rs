use chrono::{Datelike, Local, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::{path::Path, time::Duration};

mod contributions;
pub use contributions::web_link;

#[derive(Debug)]
pub enum Error {
    Input(&'static str),
    Sql(rusqlite::Error),
}

impl From<rusqlite::Error> for Error {
    fn from(error: rusqlite::Error) -> Self {
        Self::Sql(error)
    }
}

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    today: String,
    tasks: Vec<Task>,
    entries: Vec<Entry>,
    contributions: Vec<contributions::Contribution>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Task {
    id: i64,
    title: String,
    category: String,
    tower: Option<String>,
    cadence: String,
    detail: String,
    scheduled_for: Option<String>,
    archived: bool,
    done: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Entry {
    id: i64,
    task_id: i64,
    title: String,
    category: String,
    tower: Option<String>,
    day: String,
    kind: String,
    note: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Draft {
    id: Option<i64>,
    title: String,
    category: String,
    tower: Option<String>,
    cadence: String,
    detail: String,
    scheduled_for: Option<String>,
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Action {
    Save { draft: Draft },
    Archive { id: i64, archived: bool },
    Complete { id: i64, done: bool },
    AddStep { id: i64, note: String },
    RemoveStep { id: i64 },
    SaveContribution { draft: contributions::Draft },
    RemoveContribution { id: i64 },
}

pub struct Store(Connection);

impl Store {
    pub fn open(path: &Path) -> rusqlite::Result<Self> {
        Self::initialize(Connection::open(path)?)
    }

    fn initialize(mut connection: Connection) -> rusqlite::Result<Self> {
        connection.busy_timeout(Duration::from_secs(3))?;
        connection.execute_batch("PRAGMA foreign_keys = ON")?;
        let transaction =
            connection.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;

        let version: i64 =
            transaction.pragma_query_value(None, "user_version", |row| row.get(0))?;
        match version {
            0 => transaction.execute_batch(include_str!("schema.sql"))?,
            1..=3 => {}
            _ => return Err(rusqlite::Error::InvalidQuery),
        }
        if version < 2 {
            transaction.execute_batch(contributions::MIGRATION)?;
        }
        if version < 3 {
            transaction.execute_batch(
                "ALTER TABLE tasks ADD COLUMN tower TEXT;
                 PRAGMA user_version = 3;",
            )?;
        }
        transaction.commit()?;
        Ok(Self(connection))
    }

    pub fn read(&mut self) -> Result<Snapshot> {
        let transaction = self.0.transaction()?;
        let result = snapshot(&transaction, Local::now().date_naive())?;
        transaction.commit()?;
        Ok(result)
    }

    pub fn apply(&mut self, action: Action) -> Result<Snapshot> {
        self.apply_on(action, Local::now().date_naive())
    }

    fn apply_on(&mut self, action: Action, day: NaiveDate) -> Result<Snapshot> {
        let transaction = self
            .0
            .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)?;
        match action {
            Action::Save { draft } => save(&transaction, draft)?,
            Action::Archive { id, archived } => {
                transaction.execute(
                    "UPDATE tasks SET archived = ?1 WHERE id = ?2",
                    params![archived, id],
                )?;
            }
            Action::Complete { id, done } => complete(&transaction, id, done, day)?,
            Action::AddStep { id, note } => add_step(&transaction, id, &note, day)?,
            Action::RemoveStep { id } => {
                transaction.execute("DELETE FROM entries WHERE id = ?1 AND kind = 'step'", [id])?;
            }
            Action::SaveContribution { draft } => contributions::save(&transaction, draft, day)?,
            Action::RemoveContribution { id } => {
                transaction.execute("DELETE FROM contributions WHERE id = ?1", [id])?;
            }
        }
        let result = snapshot(&transaction, day)?;
        transaction.commit()?;
        Ok(result)
    }
}

fn snapshot(connection: &Connection, day: NaiveDate) -> Result<Snapshot> {
    let mut query = connection.prepare(
        "SELECT id, title, category, cadence, detail, scheduled_for, archived,
          EXISTS(SELECT 1 FROM entries WHERE task_id = tasks.id AND period = CASE tasks.cadence
            WHEN 'daily' THEN ?1 WHEN 'weekly' THEN ?2 WHEN 'monthly' THEN ?3 ELSE tasks.cadence END), tower
         FROM tasks ORDER BY id",
    )?;
    let tasks = query
        .query_map(
            params![
                period("daily", day),
                period("weekly", day),
                period("monthly", day)
            ],
            |row| {
                Ok(Task {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    category: row.get(2)?,
                    cadence: row.get(3)?,
                    detail: row.get(4)?,
                    scheduled_for: row.get(5)?,
                    archived: row.get(6)?,
                    done: row.get(7)?,
                    tower: row.get(8)?,
                })
            },
        )?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut query = connection.prepare(
        "SELECT entries.id, task_id, entries.title, entries.category, day, kind, note, tasks.tower
         FROM entries LEFT JOIN tasks ON tasks.id = entries.task_id ORDER BY day DESC, entries.id DESC",
    )?;
    let entries = query
        .query_map([], |row| {
            Ok(Entry {
                id: row.get(0)?,
                task_id: row.get(1)?,
                title: row.get(2)?,
                category: row.get(3)?,
                day: row.get(4)?,
                kind: row.get(5)?,
                note: row.get(6)?,
                tower: row.get(7)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(Snapshot {
        today: day.to_string(),
        tasks,
        entries,
        contributions: contributions::list(connection)?,
    })
}

fn save(connection: &Connection, draft: Draft) -> Result<()> {
    let title = required(&draft.title, 100, "Podaj nazwę do 100 znaków.")?;
    let category = required(&draft.category, 32, "Podaj grupę do 32 znaków.")?;
    let tower = draft
        .tower
        .as_deref()
        .map(|name| required(name, 32, "Podaj nazwę wieży do 32 znaków."))
        .transpose()?;
    let detail = draft.detail.trim();
    if detail.chars().count() > 240 {
        return Err(Error::Input("Opis może mieć najwyżej 240 znaków."));
    }
    if !matches!(
        draft.cadence.as_str(),
        "daily" | "weekly" | "monthly" | "once" | "goal"
    ) {
        return Err(Error::Input("Wybierz poprawną częstotliwość."));
    }
    let scheduled_for = match (draft.cadence.as_str(), draft.scheduled_for) {
        ("once", Some(date)) => Some(
            NaiveDate::parse_from_str(&date, "%Y-%m-%d")
                .map_err(|_| Error::Input("Podaj poprawną datę."))?
                .to_string(),
        ),
        _ => None,
    };

    if let Some(id) = draft.id {
        if connection.execute(
            "UPDATE tasks SET title = ?1, category = ?2, cadence = ?3, detail = ?4, scheduled_for = ?5, tower = ?6 WHERE id = ?7",
            params![title, category, draft.cadence, detail, scheduled_for, tower, id],
        )? == 0 {
            return Err(Error::Input("To zadanie już nie istnieje."));
        }
    } else {
        connection.execute(
            "INSERT INTO tasks (title, category, cadence, detail, scheduled_for, tower) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![title, category, draft.cadence, detail, scheduled_for, tower],
        )?;
    }
    Ok(())
}

fn complete(connection: &Connection, id: i64, done: bool, day: NaiveDate) -> Result<()> {
    let (title, category, cadence, scheduled_for) = connection
        .query_row(
            "SELECT title, category, cadence, scheduled_for FROM tasks WHERE id = ?1 AND archived = 0",
            [id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, Option<String>>(3)?,
                ))
            },
        )
        .optional()?
        .ok_or(Error::Input("To zadanie jest niedostępne."))?;
    let date = day.to_string();
    let key = period(&cadence, day);
    if done {
        if scheduled_for.is_some_and(|scheduled| scheduled > date) {
            return Err(Error::Input("To zadanie jest zaplanowane na później."));
        }
        connection.execute(
            "INSERT INTO entries (task_id, title, category, day, kind, period)
             VALUES (?1, ?2, ?3, ?4, 'complete', ?5) ON CONFLICT(task_id, period) DO NOTHING",
            params![id, title, category, date, key],
        )?;
    } else {
        connection.execute(
            "DELETE FROM entries WHERE task_id = ?1 AND period = ?2",
            params![id, key],
        )?;
    }
    Ok(())
}

fn add_step(connection: &Connection, id: i64, note: &str, day: NaiveDate) -> Result<()> {
    let note = required(note, 160, "Podaj opis kroku do 160 znaków.")?;
    if connection.execute(
        "INSERT INTO entries (task_id, title, category, day, kind, note)
         SELECT id, title, category, ?1, 'step', ?2 FROM tasks WHERE id = ?3 AND cadence = 'goal' AND archived = 0",
        params![day.to_string(), note, id],
    )? == 0 {
        return Err(Error::Input("Ten cel jest niedostępny."));
    }
    Ok(())
}

fn required<'a>(value: &'a str, max: usize, message: &'static str) -> Result<&'a str> {
    let value = value.trim();
    if value.is_empty() || value.chars().count() > max {
        return Err(Error::Input(message));
    }
    Ok(value)
}

fn period(cadence: &str, day: NaiveDate) -> String {
    match cadence {
        "daily" => day.to_string(),
        "weekly" => {
            let week = day.iso_week();
            format!("{:04}-W{:02}", week.year(), week.week())
        }
        "monthly" => day.format("%Y-%m").to_string(),
        _ => cadence.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn store_with_tasks() -> Store {
        let store = Store::open(Path::new(":memory:")).unwrap();
        store
            .0
            .execute_batch(
                "INSERT INTO tasks (title, category, cadence) VALUES
                ('Uporządkować notatki', 'Organizacja', 'daily'),
                ('Przejrzeć kalendarz', 'Organizacja', 'weekly'),
                ('Zaplanować wydatki', 'Organizacja', 'monthly'),
                ('Przygotować wystawę', 'Projekt', 'goal');",
            )
            .unwrap();
        store
    }

    fn day(year: i32, month: u32, day: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(year, month, day).unwrap()
    }

    fn complete_on(store: &mut Store, id: i64, date: NaiveDate) -> Snapshot {
        store
            .apply_on(Action::Complete { id, done: true }, date)
            .unwrap()
    }

    #[test]
    fn a_new_profile_has_no_tasks_or_history() {
        let mut store = Store::open(Path::new(":memory:")).unwrap();
        let result = store.read().unwrap();
        assert!(result.tasks.is_empty());
        assert!(result.entries.is_empty());
        assert!(result.contributions.is_empty());
    }

    #[test]
    fn a_tower_assignment_reaches_past_and_new_entries_without_changing_their_group() {
        let mut store = store_with_tasks();
        let yesterday = day(2026, 11, 5);
        let today = day(2026, 11, 6);
        complete_on(&mut store, 1, yesterday);
        let change_tower = |tower: Option<&str>| Action::Save {
            draft: Draft {
                id: Some(1),
                title: "Uporządkować notatki".into(),
                category: "Organizacja".into(),
                tower: tower.map(str::to_owned),
                cadence: "daily".into(),
                detail: String::new(),
                scheduled_for: None,
            },
        };
        let result = store.apply_on(change_tower(Some("Nauka")), today).unwrap();
        assert_eq!(result.tasks[0].category, "Organizacja");
        assert_eq!(result.entries.len(), 1);
        assert_eq!(result.entries[0].category, "Organizacja");
        assert_eq!(result.entries[0].tower.as_deref(), Some("Nauka"));

        complete_on(&mut store, 1, today);
        let result = complete_on(&mut store, 1, today);
        assert_eq!(result.entries.len(), 2);
        assert!(result
            .entries
            .iter()
            .all(|entry| entry.tower.as_deref() == Some("Nauka")));
        let result = store.apply_on(change_tower(None), today).unwrap();
        assert_eq!(result.entries.len(), 2);
        assert!(result.entries.iter().all(|entry| entry.tower.is_none()));
    }

    #[test]
    fn upgrading_version_one_preserves_history_and_supports_adding_editing_and_removing_contributions(
    ) {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(include_str!("schema.sql"))
            .unwrap();
        connection.execute_batch(
            "INSERT INTO tasks (id, title, category, cadence) VALUES (1, 'Zagrać', 'LoL', 'daily');
             INSERT INTO entries (task_id, title, category, day, kind, period)
             VALUES (1, 'Zagrać', 'LoL', '2026-11-05', 'complete', '2026-11-05');",
        ).unwrap();
        let mut store = Store::initialize(connection).unwrap();
        let today = day(2026, 11, 6);
        let save = |id, solo| {
            serde_json::from_value(serde_json::json!({
                "type": "saveContribution", "draft": {
                    "id": id, "title": "Wieczorne mecze", "category": "League of Legends",
                    "day": "2026-11-05", "metrics": { "soloQueue": solo, "flex": 1 },
                    "link": "https://example.com/mecze"
                }
            }))
            .unwrap()
        };
        let result = store.apply_on(save(None, 2), today).unwrap();
        assert_eq!(result.entries.len(), 1);
        assert_eq!(result.entries[0].category, "LoL");
        let saved = serde_json::to_value(&result.contributions[0]).unwrap();
        let id = saved["id"].as_i64().unwrap();
        assert_eq!(saved["day"], "2026-11-05");
        assert_eq!(saved["link"], "https://example.com/mecze");
        assert_eq!(
            saved["metrics"],
            serde_json::json!({ "soloQueue": 2, "flex": 1 })
        );
        assert!(matches!(
            store.apply_on(save(Some(id), 0), today),
            Err(Error::Input(_))
        ));
        let unchanged = store.read().unwrap();
        assert_eq!(
            serde_json::to_value(&unchanged.contributions[0]).unwrap(),
            saved
        );
        let edited = store.apply_on(save(Some(id), 3), today).unwrap();
        assert_eq!(edited.contributions.len(), 1);
        assert_eq!(
            serde_json::to_value(&edited.contributions[0]).unwrap()["metrics"]["soloQueue"],
            3
        );
        let result = store
            .apply_on(Action::RemoveContribution { id }, today)
            .unwrap();
        assert!(result.contributions.is_empty());
        assert_eq!(result.entries.len(), 1);
    }

    #[test]
    fn recurring_tasks_reset_on_their_own_calendar_boundaries() {
        let mut store = store_with_tasks();
        let sunday = day(2024, 12, 29);
        let monday = day(2024, 12, 30);
        let january = day(2025, 1, 1);
        for id in [1, 2, 3] {
            complete_on(&mut store, id, sunday);
        }

        let result = snapshot(&store.0, monday).unwrap();
        assert!(!result.tasks[0].done);
        assert!(!result.tasks[1].done);
        assert!(result.tasks[2].done);

        complete_on(&mut store, 2, monday);
        let result = complete_on(&mut store, 2, january);
        assert!(result.tasks[1].done);
        assert!(!result.tasks[2].done);
        assert_eq!(result.entries.len(), 4);
        assert_eq!(result.entries[0].day, "2024-12-30");
    }

    #[test]
    fn undo_removes_only_the_current_period_and_archiving_keeps_history() {
        let mut store = store_with_tasks();
        let yesterday = day(2026, 11, 5);
        let today = day(2026, 11, 6);
        complete_on(&mut store, 1, yesterday);
        complete_on(&mut store, 1, today);
        store
            .apply_on(Action::Complete { id: 1, done: false }, today)
            .unwrap();
        let result = store
            .apply_on(
                Action::Archive {
                    id: 1,
                    archived: true,
                },
                today,
            )
            .unwrap();
        assert!(result.tasks[0].archived);
        assert_eq!(result.entries.len(), 1);
        assert_eq!(result.entries[0].day, "2026-11-05");
    }

    #[test]
    fn edits_keep_the_original_activity_and_goal_steps_are_independent() {
        let mut store = store_with_tasks();
        let date = day(2026, 11, 6);
        store
            .apply_on(
                Action::AddStep {
                    id: 4,
                    note: "Wybrano prace".into(),
                },
                date,
            )
            .unwrap();
        let draft = Draft {
            id: Some(4),
            title: "Przygotować wystawę objazdową".into(),
            category: "Praca".into(),
            tower: None,
            cadence: "goal".into(),
            detail: String::new(),
            scheduled_for: None,
        };
        store.apply_on(Action::Save { draft }, date).unwrap();
        let result = complete_on(&mut store, 4, date);
        assert_eq!(result.entries[0].category, "Praca");
        assert_eq!(result.entries[1].category, "Projekt");
        assert_eq!(result.entries[1].note, "Wybrano prace");
    }

    #[test]
    fn a_future_one_off_task_cannot_be_completed_early() {
        let mut store = Store::open(Path::new(":memory:")).unwrap();
        let today = day(2026, 11, 6);
        let draft = Draft {
            id: None,
            title: "Zakupy".into(),
            category: "Dom".into(),
            tower: None,
            cadence: "once".into(),
            detail: String::new(),
            scheduled_for: Some("2026-11-07".into()),
        };
        let result = store.apply_on(Action::Save { draft }, today).unwrap();
        let id = result.tasks.last().unwrap().id;
        assert!(matches!(
            store.apply_on(Action::Complete { id, done: true }, today),
            Err(Error::Input(_))
        ));
        assert!(store.read().unwrap().entries.is_empty());
    }
}
