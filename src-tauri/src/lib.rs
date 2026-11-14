pub mod models;
pub mod db;
pub mod rppg;
pub mod ai;

use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use db::Database;
use models::{CheckInRecord, ImportResult, StorageStats};
use rppg::{RppgManager, RppgStatus};
use ai::{calculate_fatigue_forecast, FatigueModelOutput, SimulationInput};

pub struct AppState {
    pub db: Arc<Database>,
    pub rppg: Arc<RppgManager>,
}

#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "app_version": env!("CARGO_PKG_VERSION"),
        "app_name": "NASA ORBIT",
        "database": "SQLite 3 (WAL mode)",
        "rppg_engine": "MediaPipe Face Landmarker (Sidecar)",
        "status": "operational"
    })
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Welcome aboard, {}. All systems operational. ORBIT v{}", name, env!("CARGO_PKG_VERSION"))
}

#[tauri::command]
fn db_get_entries(state: State<AppState>) -> Result<Vec<CheckInRecord>, String> {
    state.db.get_entries()
}

#[tauri::command]
fn db_save_entry(state: State<AppState>, entry: CheckInRecord) -> Result<CheckInRecord, String> {
    state.db.save_entry(&entry)
}

#[tauri::command]
fn db_delete_entry(state: State<AppState>, id: String) -> Result<bool, String> {
    state.db.delete_entry(&id)
}

#[tauri::command]
fn db_import_backup(state: State<AppState>, entries: Vec<CheckInRecord>) -> Result<ImportResult, String> {
    state.db.import_backup(&entries)
}

#[tauri::command]
fn db_get_stats(state: State<AppState>) -> Result<StorageStats, String> {
    state.db.get_stats()
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

#[tauri::command]
#[allow(dead_code)]
fn ai_forecast_fatigue(input: SimulationInput) -> FatigueModelOutput {
    calculate_fatigue_forecast(input)
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
            let db_path = app_data_dir.join("orbit_crew_health.db");
            
            log_debug(&format!("Initializing SQLite at: {:?}", db_path));
            let database = Database::new(&db_path)
                .map_err(|e| {
                    log_debug(&format!("DATABASE INIT ERROR: {}", e));
                    Box::new(std::io::Error::new(std::io::ErrorKind::Other, e)) as Box<dyn std::error::Error>
                })?;

            app.manage(AppState {
                db: Arc::new(database),
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
            rppg_status,
            ai_forecast_fatigue
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
            tauri::RunEvent::ExitRequested { code, api: _, .. } => {
                log_debug(&format!("Event: ExitRequested with code: {:?}", code));
            }
            _ => {}
        }
    });
    log_debug("Event loop ended.");
}
