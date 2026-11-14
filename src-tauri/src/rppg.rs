use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RppgStatus {
    pub is_running: bool,
    pub source: String,
    pub message: String,
}

impl Default for RppgStatus {
    fn default() -> Self {
        Self {
            is_running: false,
            source: "None".into(),
            message: "rPPG engine standby".into(),
        }
    }
}

pub struct RppgManager {
    child: Arc<Mutex<Option<Child>>>,
    status: Arc<Mutex<RppgStatus>>,
}

impl Default for RppgManager {
    fn default() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            status: Arc::new(Mutex::new(RppgStatus::default())),
        }
    }
}

impl RppgManager {
    pub fn start(&self, app: AppHandle, camera: Option<String>) -> Result<(), String> {
        let mut child_lock = self.child.lock().map_err(|e| e.to_string())?;
        if child_lock.is_some() {
            return Ok(()); // Already running
        }

        // Locate streamer script
        let possible_paths = [
            PathBuf::from("rppg/rppg_streamer.py"),
            PathBuf::from("../rppg/rppg_streamer.py"),
            PathBuf::from("D:/Projects/Astronaut-health-tracking-system-for-NASA/rppg/rppg_streamer.py"),
        ];

        let script_path = possible_paths
            .iter()
            .find(|p| p.exists())
            .cloned()
            .unwrap_or_else(|| PathBuf::from("rppg/rppg_streamer.py"));

        let mut cmd = Command::new("py");
        cmd.arg("-3.14");
        cmd.arg(&script_path);

        if let Some(cam) = camera {
            cmd.arg("--camera");
            cmd.arg(cam);
        }

        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::null());

        let mut child = cmd.spawn().map_err(|e| {
            format!("Failed to spawn rPPG Python sidecar ('py -3.14'): {}", e)
        })?;

        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        *child_lock = Some(child);

        let status_arc = Arc::clone(&self.status);
        let child_arc = Arc::clone(&self.child);

        {
            let mut s = status_arc.lock().map_err(|e| e.to_string())?;
            s.is_running = true;
            s.message = "rPPG sidecar process launched".into();
        }

        // Spawn background reader thread
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                let trimmed = line.trim();
                if trimmed.is_empty() || !trimmed.starts_with('{') {
                    continue;
                }

                if let Ok(json) = serde_json::from_str::<serde_json::Value>(trimmed) {
                    let msg_type = json.get("type").and_then(|t| t.as_str()).unwrap_or("");
                    if msg_type == "telemetry" {
                        let _ = app.emit("rppg-telemetry", &json);
                    } else if msg_type == "status" {
                        if let Ok(mut s) = status_arc.lock() {
                            if let Some(msg) = json.get("message").and_then(|m| m.as_str()) {
                                s.message = msg.to_string();
                            }
                            if let Some(src) = json.get("source").and_then(|m| m.as_str()) {
                                s.source = src.to_string();
                            }
                        }
                        let _ = app.emit("rppg-status", &json);
                    }
                }
            }

            // Cleanup when process terminates
            if let Ok(mut s) = status_arc.lock() {
                s.is_running = false;
                s.message = "rPPG stream terminated".into();
            }
            if let Ok(mut c) = child_arc.lock() {
                *c = None;
            }
        });

        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        let mut child_lock = self.child.lock().map_err(|e| e.to_string())?;
        if let Some(mut child) = child_lock.take() {
            let _ = child.kill();
            let _ = child.wait();
        }

        if let Ok(mut s) = self.status.lock() {
            s.is_running = false;
            s.message = "rPPG sidecar stopped".into();
        }

        Ok(())
    }

    pub fn get_status(&self) -> RppgStatus {
        self.status.lock().map(|s| s.clone()).unwrap_or_default()
    }
}
