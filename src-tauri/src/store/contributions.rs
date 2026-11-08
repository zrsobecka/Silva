use super::{required, Error, Result};
use chrono::NaiveDate;
use rusqlite::{params, types::Type, Connection};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use tauri::Url;

pub const MIGRATION: &str = "
    CREATE TABLE contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        day TEXT NOT NULL,
        link TEXT,
        metrics TEXT NOT NULL CHECK (json_valid(metrics))
    );
    PRAGMA user_version = 2;
";

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
enum Metric {
    Minutes,
    Questions,
    Scripts,
    Tutorials,
    SoloQueue,
    Flex,
    Pages,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Contribution {
    id: i64,
    title: String,
    category: String,
    day: String,
    link: Option<String>,
    metrics: BTreeMap<Metric, u32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Draft {
    id: Option<i64>,
    title: String,
    category: String,
    day: String,
    link: Option<String>,
    metrics: BTreeMap<Metric, u32>,
}

pub fn web_link(value: &str) -> Option<Url> {
    let value = value.trim();
    if value.len() > 2048 || value.chars().any(char::is_control) {
        return None;
    }
    let url = Url::parse(value).ok()?;
    (matches!(url.scheme(), "http" | "https")
        && url.host().is_some()
        && url.username().is_empty()
        && url.password().is_none())
    .then_some(url)
}

pub fn save(connection: &Connection, draft: Draft, today: NaiveDate) -> Result<()> {
    let title = required(&draft.title, 160, "Podaj opis do 160 znaków.")?;
    let category = required(&draft.category, 100, "Podaj aktywność do 100 znaków.")?;
    let invalid_date = Error::Input("Wybierz datę od 2000 roku do dzisiaj.");
    let day = NaiveDate::parse_from_str(&draft.day, "%Y-%m-%d").map_err(|_| invalid_date)?;
    if day > today || day < NaiveDate::from_ymd_opt(2000, 1, 1).unwrap() {
        return Err(Error::Input("Wybierz datę od 2000 roku do dzisiaj."));
    }
    let link = draft
        .link
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .map(|value| web_link(value).ok_or(Error::Input("Podaj poprawny link HTTP lub HTTPS.")))
        .transpose()?;
    if draft
        .metrics
        .values()
        .any(|value| !(1..=999_999).contains(value))
    {
        return Err(Error::Input("Wpisz pełną liczbę od 1 do 999 999."));
    }
    let metrics = serde_json::to_string(&draft.metrics)
        .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;
    let day = day.to_string();
    let link = link.as_ref().map(Url::as_str);
    if let Some(id) = draft.id {
        if connection.execute(
            "UPDATE contributions SET title = ?1, category = ?2, day = ?3, link = ?4, metrics = ?5 WHERE id = ?6",
            params![title, category, day, link, metrics, id],
        )? == 0 {
            return Err(Error::Input("Ten wpis już nie istnieje."));
        }
    } else {
        connection.execute(
            "INSERT INTO contributions (title, category, day, link, metrics) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![title, category, day, link, metrics],
        )?;
    }
    Ok(())
}

pub fn list(connection: &Connection) -> Result<Vec<Contribution>> {
    let mut query = connection.prepare(
        "SELECT id, title, category, day, link, metrics FROM contributions ORDER BY day DESC, id DESC",
    )?;
    let contributions = query.query_map([], |row| {
        let metrics = serde_json::from_str(row.get_ref(5)?.as_str()?).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(5, Type::Text, Box::new(error))
        })?;
        Ok(Contribution {
            id: row.get(0)?,
            title: row.get(1)?,
            category: row.get(2)?,
            day: row.get(3)?,
            link: row.get(4)?,
            metrics,
        })
    })?;
    Ok(contributions.collect::<rusqlite::Result<_>>()?)
}

#[cfg(test)]
mod tests {
    use super::web_link;

    #[test]
    fn links_accept_web_addresses_and_reject_local_files_credentials_and_commands() {
        assert!(web_link("https://example.com/skrypt").is_some());
        for value in [
            "file:///C:/skrypt.py",
            "javascript:alert(1)",
            "https://user@example.com",
            "https://exa\nmple.com",
        ] {
            assert!(web_link(value).is_none(), "accepted {value}");
        }
    }
}
