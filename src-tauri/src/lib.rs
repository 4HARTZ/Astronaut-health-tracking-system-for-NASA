pub mod models;
pub mod db;
pub mod rppg;

use std::{path::PathBuf, sync::Arc};
use tauri::{AppHandle, Manager, State};
use db::Database;
use models::{CheckInRecord, ImportResult, StorageStats};
use rppg::{RppgManager, RppgStatus};

pub struct AppState {
    pub db_dir: PathBuf,
    pub rppg: Arc<RppgManager>,
}

fn account_database(state: &AppState, account_id: &str) -> Result<Database, String> {
    if !matches!(account_id, "ryan" | "tharusha" | "hansaja" | "apurwa") {
        return Err("Unknown crew account.".into());
    }
    Database::new(state.db_dir.join(format!("orbit_crew_{account_id}.db")))
}

#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "app_version": env!("CARGO_PKG_VERSION"),
        "app_name": "NASA ORBIT",
        "database": "SQLite 3 (WAL mode)",
        "rppg_engine": "Experimental MediaPipe camera estimator (requires Python)",
        "status": "operational"
    })
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Welcome aboard, {}. All systems operational. ORBIT v{}", name, env!("CARGO_PKG_VERSION"))
}

#[tauri::command]
fn db_get_entries(state: State<AppState>, account_id: String) -> Result<Vec<CheckInRecord>, String> {
    account_database(&state, &account_id)?.get_entries()
}

#[tauri::command]
fn db_save_entry(state: State<AppState>, account_id: String, entry: CheckInRecord) -> Result<CheckInRecord, String> {
    account_database(&state, &account_id)?.save_entry(&entry)
}

#[tauri::command]
fn db_delete_entry(state: State<AppState>, account_id: String, id: String) -> Result<bool, String> {
    account_database(&state, &account_id)?.delete_entry(&id)
}

#[tauri::command]
fn db_import_backup(state: State<AppState>, account_id: String, entries: Vec<CheckInRecord>) -> Result<ImportResult, String> {
    account_database(&state, &account_id)?.import_backup(&entries)
}

#[tauri::command]
fn db_get_stats(state: State<AppState>, account_id: String) -> Result<StorageStats, String> {
    account_database(&state, &account_id)?.get_stats()
}

#[tauri::command]
fn rppg_start(app: AppHandle, state: State<AppState>, camera: Option<String>) -> Result<(), String> {
    state.rppg.start(app, camera)
}

#[tauri::command]
fn rppg_stop(state: State<AppState>) -> Result<(), String> {
    state.rppg.stop()
}

#[tauri::command]
fn rppg_status(state: State<AppState>) -> RppgStatus {
    state.rppg.get_status()
}

use std::fs::OpenOptions;
use std::io::Write;

fn log_debug(msg: &str) {
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open("orbit_runtime_log.txt") {
        let _ = writeln!(f, "{}", msg);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    log_debug("ORBIT starting...");
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            log_debug("Setup hook entered");
            let app_data_dir = app.path().app_local_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));
            std::fs::create_dir_all(&app_data_dir)
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            log_debug(&format!("Account database directory: {:?}", app_data_dir));

            app.manage(AppState {
                db_dir: app_data_dir,
                rppg: Arc::new(RppgManager::default()),
            });
            log_debug("Setup completed successfully");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            greet,
            db_get_entries,
            db_save_entry,
            db_delete_entry,
            db_import_backup,
            db_get_stats,
            rppg_start,
            rppg_stop,
            rppg_status
        ])
        .build(tauri::generate_context!())
        .expect("error while building ORBIT application");

    log_debug("Entering application event loop...");
    app.run(|_app_handle, event| {
        match &event {
            tauri::RunEvent::Ready => log_debug("Event: Ready"),
            tauri::RunEvent::WindowEvent { label, event, .. } => {
                log_debug(&format!("Event: WindowEvent for '{}': {:?}", label, event));
            }
            tauri::RunEvent::Exit => {
                if let Some(state) = _app_handle.try_state::<AppState>() {
                    let _ = state.rppg.stop();
                }
            }
            tauri::RunEvent::ExitRequested { code, api: _, .. } => {
                log_debug(&format!("Event: ExitRequested with code: {:?}", code));
            }
            _ => {}
        }
    });
    log_debug("Event loop ended.");
}
