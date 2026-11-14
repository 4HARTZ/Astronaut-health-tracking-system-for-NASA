use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RppgStatus {
    pub is_running: bool,
    pub source: String,
    pub message: String,
}

#[derive(Default)]
pub struct RppgManager {
    child: Arc<Mutex<Option<Child>>>,
    status: Arc<Mutex<RppgStatus>>,
}

fn script_path(resource_dir: Option<PathBuf>) -> Result<PathBuf, String> {
    let mut paths = Vec::new();
    if let Some(dir) = resource_dir { paths.push(dir.join("rppg/rppg_streamer.py")); }
    // A development-only fallback, independent of the process working directory.
    if cfg!(debug_assertions) {
        paths.push(Path::new(env!("CARGO_MANIFEST_DIR")).join("../rppg/rppg_streamer.py"));
    }
    paths.into_iter().find(|p| p.is_file())
        .ok_or_else(|| "Camera script is missing from the application resources. Rebuild Orbit.".into())
}

fn python_command() -> Command {
    if let Some(python) = std::env::var_os("ORBIT_PYTHON") {
        return Command::new(python);
    }
    // Prefer the documented project environment during development.
    if cfg!(debug_assertions) {
        let env_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../.venv-rppg");
        let python = env_dir.join(if cfg!(windows) { "Scripts/python.exe" } else { "bin/python" });
        if python.is_file() { return Command::new(python); }
    }
    if cfg!(windows) {
        let mut command = Command::new("py");
        command.arg("-3");
        command
    } else {
        Command::new("python3")
    }
}

impl RppgManager {
    pub fn start(&self, app: AppHandle, camera: Option<String>) -> Result<(), String> {
        let mut slot = self.child.lock().map_err(|e| e.to_string())?;
        if slot.is_some() { return Ok(()); }
        let script = script_path(app.path().resource_dir().ok())?;
        let mut command = python_command();
        command.arg("-u").arg(&script).arg("--model")
            .arg(script.with_file_name("face_landmarker.task"))
            .arg("--camera").arg(camera.unwrap_or_else(|| "0".into()))
            .stdout(Stdio::piped()).stderr(Stdio::piped());
        let mut child = command.spawn().map_err(|e| format!(
            "Could not start camera Python: {e}. Set ORBIT_PYTHON to the full path of a Python environment with the rPPG dependencies."
        ))?;
        let stdout = child.stdout.take().ok_or("Cannot read camera output")?;
        let stderr = child.stderr.take().ok_or("Cannot read camera errors")?;
        let pid = child.id();
        *slot = Some(child);
        *self.status.lock().map_err(|e| e.to_string())? = RppgStatus {
            is_running: true, source: "Starting experimental camera".into(),
            message: "Starting camera; no measurement is available yet.".into(),
        };
        // Surface import failures and permission errors instead of discarding stderr.
        let error_app = app.clone();
        thread::spawn(move || {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                eprintln!("[Orbit camera] {line}");
                let _ = error_app.emit("rppg-diagnostic", &line);
            }
        });
        let status = Arc::clone(&self.status);
        let children = Arc::clone(&self.child);
        thread::spawn(move || {
            let mut error = None;
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&line) {
                    match json.get("type").and_then(|v| v.as_str()).unwrap_or("") {
                        "telemetry" => { let _ = app.emit("rppg-telemetry", &json); }
                        "status" | "error" | "warning" => {
                            if let Some(message) = json.get("message").and_then(|v| v.as_str()) {
                                if let Ok(mut s) = status.lock() { s.message = message.into(); }
                                if json["type"] == "error" { error = Some(message.to_string()); }
                            }
                            if let Some(source) = json.get("source").and_then(|v| v.as_str()) {
                                if let Ok(mut s) = status.lock() { s.source = source.into(); }
                            }
                            let _ = app.emit("rppg-status", &json);
                        }
                        _ => {}
                    }
                }
            }
            // An old reader must not clear a newer process after a quick restart.
            if let Ok(mut slot) = children.lock() {
                if slot.as_ref().map(Child::id) == Some(pid) {
                    if let Some(mut child) = slot.take() { let _ = child.wait(); }
                    let message = error.unwrap_or_else(|| "Camera stopped. Check Python dependencies and camera permissions if unexpected.".into());
                    if let Ok(mut s) = status.lock() { s.is_running = false; s.message = message.clone(); }
                    let _ = app.emit("rppg-status", serde_json::json!({"state":"stopped", "message":message}));
                }
            }
        });
        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut slot = self.child.lock().map_err(|e| e.to_string())?;
        if let Some(mut child) = slot.take() { let _ = child.kill(); let _ = child.wait(); }
        if let Ok(mut s) = self.status.lock() {
            s.is_running = false; s.message = "Camera stopped.".into(); s.source.clear();
        }
        Ok(())
    }

    pub fn get_status(&self) -> RppgStatus {
        self.status.lock().map(|s| s.clone()).unwrap_or_default()
    }
}

impl Drop for RppgManager {
    fn drop(&mut self) { let _ = self.stop(); }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn resolves_bundled_script_without_working_directory() {
        let dir = std::env::temp_dir().join(format!("orbit-camera-test-{}", std::process::id()));
        std::fs::create_dir_all(dir.join("rppg")).unwrap();
        std::fs::write(dir.join("rppg/rppg_streamer.py"), "# fixture").unwrap();
        assert_eq!(script_path(Some(dir.clone())).unwrap(), dir.join("rppg/rppg_streamer.py"));
        std::fs::remove_dir_all(dir).unwrap();
    }
}
