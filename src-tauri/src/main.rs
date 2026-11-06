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

#[tauri::command]
fn open_contribution_link(link: &str) -> Result<(), &'static str> {
    let url = store::web_link(link).ok_or("Podaj poprawny link HTTP lub HTTPS.")?;
    #[cfg(windows)]
    {
        use std::ptr::null;
        use windows_sys::Win32::UI::{Shell::ShellExecuteW, WindowsAndMessaging::SW_SHOWNORMAL};

        let address: Vec<u16> = url.as_str().encode_utf16().chain([0]).collect();
        // SAFETY: address is a validated URL with a terminating NUL and lives through the call.
        let result = unsafe {
            ShellExecuteW(
                std::ptr::null_mut(),
                null(),
                address.as_ptr(),
                null(),
                null(),
                SW_SHOWNORMAL,
            )
        };
        if result as isize > 32 {
            return Ok(());
        }
    }
    #[cfg(not(windows))]
    let _ = url;
    Err("Nie udało się otworzyć linku w przeglądarce.")
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

#[cfg(windows)]
fn style_title_bar(app: &tauri::App) {
    use windows_sys::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_CAPTION_COLOR};

    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Ok(hwnd) = window.hwnd() else {
        return;
    };

    // COLORREF uses BGR order. Match --side in silva.css.
    let caption_color = 0x001d_150e_u32;
    // SAFETY: Tauri provides the HWND and DWM reads a u32 from the pointer during the call.
    unsafe {
        // Older Windows versions keep the system caption color.
        DwmSetWindowAttribute(
            hwnd.0,
            DWMWA_CAPTION_COLOR as u32,
            (&caption_color as *const u32).cast(),
            size_of::<u32>() as u32,
        );
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(windows)]
            style_title_bar(app);

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
        .invoke_handler(tauri::generate_handler![
            read_plan,
            update_plan,
            open_contribution_link
        ])
        .run(tauri::generate_context!())
        .expect("Silva could not start");
}
