#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod store;

use std::{path::PathBuf, sync::Mutex};
use tauri::{Manager, State};

use store::{Action, Snapshot, Store};

struct Database {
    directory: PathBuf,
    store: Mutex<Option<Store>>,
}

impl Database {
    fn access(
        &self,
        operation: impl FnOnce(&mut Store) -> store::Result<Snapshot>,
    ) -> Result<Snapshot, String> {
        let mut guard = self
            .store
            .lock()
            .map_err(|_| "Zamknij i uruchom Silvę ponownie.".to_string())?;
        if guard.is_none() {
            let message =
                "Nie udało się otworzyć lokalnej bazy Silvy. Spróbuj ponownie.".to_string();
            std::fs::create_dir_all(&self.directory).map_err(|_| message.clone())?;
            *guard = Some(Store::open(&self.directory.join("silva.sqlite3")).map_err(|_| message)?);
        }
        operation(guard.as_mut().expect("database initialized")).map_err(report_error)
    }
}

#[tauri::command]
fn read_plan(database: State<'_, Database>) -> Result<Snapshot, String> {
    database.access(Store::read)
}

#[tauri::command]
fn update_plan(action: Action, database: State<'_, Database>) -> Result<Snapshot, String> {
    database.access(|store| store.apply(action))
}

fn report_error(error: store::Error) -> String {
    match error {
        store::Error::Input(message) => message.to_string(),
        store::Error::Sql(error) => {
            eprintln!("Silva SQLite: {error}");
            "Nie udało się uzyskać dostępu do danych Silvy. Spróbuj ponownie.".to_string()
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let directory = match std::env::var_os("SILVA_DATA_DIR") {
                Some(path) if PathBuf::from(&path).is_absolute() => PathBuf::from(path),
                _ => app.path().app_local_data_dir()?,
            };
            app.manage(Database {
                directory,
                store: Mutex::new(None),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_plan, update_plan])
        .run(tauri::generate_context!())
        .expect("Silva could not start");
}
