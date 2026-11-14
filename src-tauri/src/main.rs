// Prevents additional console window on Windows in release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::File;
use std::io::Write;
use std::panic;

fn main() {
    panic::set_hook(Box::new(|info| {
        let msg = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            format!("{:?}", info)
        };
        let err_msg = format!("Panic occurred: {}\nLocation: {:?}\n", msg, info.location());
        if let Ok(mut file) = File::create("orbit_crash_log.txt") {
            let _ = file.write_all(err_msg.as_bytes());
        }
    }));

    orbit_crew_health_lib::run();
}
