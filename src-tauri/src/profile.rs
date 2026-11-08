use rusqlite::{Connection, OpenFlags};
use std::path::{Path, PathBuf};

pub struct Profile {
    pub directory: PathBuf,
    pub legacy: Vec<PathBuf>,
}

impl Profile {
    pub fn for_home(home: &Path, legacy_directory: PathBuf) -> Self {
        // AppData is virtualized when launched by a packaged application (e.g. Codex).
        // A user-owned directory outside AppData stays the same for every launcher.
        let local = home.join("AppData/Local");
        Self {
            directory: home.join(".silva"),
            legacy: vec![
                legacy_directory.join("silva.sqlite3"),
                local.join("pl.zrsobecka.silva/silva.sqlite3"),
                local.join("app.silva.desktop/silva.sqlite3"),
                local.join("Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/pl.zrsobecka.silva/silva.sqlite3"),
                local.join("Packages/OpenAI.Codex_2p2nqsd0c76g0/LocalCache/Local/app.silva.desktop/silva.sqlite3"),
            ],
        }
    }

    pub fn prepare(&self) -> Result<PathBuf, String> {
        let target = self.directory.join("silva.sqlite3");
        if target.try_exists().map_err(|e| e.to_string())? {
            return Ok(target);
        }
        std::fs::create_dir_all(&self.directory).map_err(|e| e.to_string())?;
        let mut populated = Vec::new();
        for candidate in &self.legacy {
            if !candidate.try_exists().map_err(|e| e.to_string())? {
                continue;
            }
            let path = std::fs::canonicalize(candidate).map_err(|e| e.to_string())?;
            if populated.contains(&path) {
                continue;
            }
            let connection = open_read_only(&path)?;
            let mut count = 0_i64;
            for table in ["tasks", "entries", "contributions"] {
                let exists: bool = connection.query_row(
                    "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
                    [table], |row| row.get(0),
                ).map_err(|e| e.to_string())?;
                if exists {
                    count += connection
                        .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                            row.get::<_, i64>(0)
                        })
                        .map_err(|e| e.to_string())?;
                }
            }
            if count > 0 {
                populated.push(path);
            }
        }
        if populated.len() > 1 {
            return Err("Znaleziono kilka profili Silvy z zapisami. Nie połączono ich automatycznie; oryginalne dane są zachowane.".into());
        }
        if let Some(source) = populated.first() {
            // SQLite makes a consistent copy, including any committed WAL content.
            // Keep the original and publish only a fully written database.
            let temporary = self
                .directory
                .join(format!("migration-{}.sqlite3", std::process::id()));
            let connection = open_read_only(source)?;
            connection
                .execute("VACUUM INTO ?1", [temporary.to_string_lossy().as_ref()])
                .map_err(|e| format!("Nie udało się skopiować poprzednich danych: {e}"))?;
            // A hard link publishes without replacing a destination created by another process.
            std::fs::hard_link(&temporary, &target).map_err(|e| e.to_string())?;
            let _ = std::fs::remove_file(&temporary);
        }
        Ok(target)
    }
}

fn open_read_only(path: &Path) -> Result<Connection, String> {
    Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(|e| {
        format!(
            "Nie udało się odczytać poprzedniego profilu {}: {e}",
            path.display()
        )
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    static NEXT: AtomicUsize = AtomicUsize::new(0);

    fn profile() -> Profile {
        let root = std::env::temp_dir().join(format!(
            "silva-profile-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        std::fs::create_dir_all(&root).unwrap();
        Profile {
            directory: root.join("stable"),
            legacy: vec![root.join("desktop.sqlite3"), root.join("codex.sqlite3")],
        }
    }

    fn seed(path: &Path, populated: bool) {
        let db = Connection::open(path).unwrap();
        db.execute_batch("CREATE TABLE tasks (title TEXT); PRAGMA user_version = 1;")
            .unwrap();
        if populated {
            db.execute("INSERT INTO tasks VALUES ('Saved task')", [])
                .unwrap();
        }
    }

    #[test]
    fn recovers_packaged_launcher_profile_and_keeps_original() {
        let profile = profile();
        seed(&profile.legacy[0], false);
        seed(&profile.legacy[1], true);
        let target = profile.prepare().unwrap();
        for path in [&target, &profile.legacy[1]] {
            let db = open_read_only(path).unwrap();
            assert_eq!(
                db.query_row("SELECT title FROM tasks", [], |row| row.get::<_, String>(0))
                    .unwrap(),
                "Saved task"
            );
        }
        assert_eq!(profile.prepare().unwrap(), target);
        // Later writes must not change the original recovery source.
        let db = Connection::open(&target).unwrap();
        db.execute("INSERT INTO tasks VALUES ('New task')", [])
            .unwrap();
        let old = open_read_only(&profile.legacy[1]).unwrap();
        assert_eq!(
            old.query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get::<_, i64>(0))
                .unwrap(),
            1
        );
    }

    #[test]
    fn refuses_to_hide_a_second_populated_profile() {
        let profile = profile();
        for path in &profile.legacy {
            seed(path, true);
        }
        assert!(profile.prepare().is_err());
        assert!(!profile.directory.join("silva.sqlite3").exists());
    }

    #[test]
    fn stable_location_does_not_depend_on_identifier_or_launcher() {
        let home = Path::new("user-home");
        assert_eq!(
            Profile::for_home(home, "old-id".into()).directory,
            Profile::for_home(home, "new-id".into()).directory
        );
    }
}
