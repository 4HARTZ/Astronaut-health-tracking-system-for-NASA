use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use crate::models::{CheckInRecord, ImportResult, StorageStats};

pub struct Database {
    conn: Mutex<Connection>,
    path: PathBuf,
}

impl Database {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let path_buf = path.as_ref().to_path_buf();
        if let Some(parent) = path_buf.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create database directory: {}", e))?;
        }

        let conn = Connection::open(&path_buf)
            .map_err(|e| format!("Failed to open SQLite database: {}", e))?;

        // Enable write-ahead logging (WAL) for concurrency & crash resilience
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA foreign_keys = ON;
             PRAGMA synchronous = NORMAL;"
        ).map_err(|e| format!("Failed to configure SQLite PRAGMAs: {}", e))?;

        let db = Self {
            conn: Mutex::new(conn),
            path: path_buf,
        };

        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS check_ins (
                id TEXT PRIMARY KEY,
                time TEXT NOT NULL,
                context TEXT NOT NULL,
                notes TEXT,
                heart_rate REAL,
                systolic REAL,
                diastolic REAL,
                temperature REAL,
                sleep REAL,
                quality REAL,
                mood REAL,
                stress REAL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT
            );

            CREATE TABLE IF NOT EXISTS outbox (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id TEXT NOT NULL,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_check_ins_time ON check_ins (time DESC);
            CREATE INDEX IF NOT EXISTS idx_check_ins_deleted ON check_ins (deleted_at);"
        ).map_err(|e| format!("Migration failed: {}", e))?;

        Ok(())
    }

    pub fn get_entries(&self) -> Result<Vec<CheckInRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, time, context, notes, heart_rate, systolic, diastolic, temperature, sleep, quality, mood, stress
             FROM check_ins
             WHERE deleted_at IS NULL
             ORDER BY time DESC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok(CheckInRecord {
                id: row.get(0)?,
                time: row.get(1)?,
                context: row.get(2)?,
                notes: row.get(3)?,
                heart_rate: row.get(4)?,
                systolic: row.get(5)?,
                diastolic: row.get(6)?,
                temperature: row.get(7)?,
                sleep: row.get(8)?,
                quality: row.get(9)?,
                mood: row.get(10)?,
                stress: row.get(11)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(row.map_err(|e| e.to_string())?);
        }
        Ok(entries)
    }

    pub fn save_entry(&self, entry: &CheckInRecord) -> Result<CheckInRecord, String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();

        let tx = conn.transaction().map_err(|e| e.to_string())?;

        tx.execute(
            "INSERT INTO check_ins (
                id, time, context, notes, heart_rate, systolic, diastolic, temperature, sleep, quality, mood, stress, created_at, updated_at, deleted_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, NULL)
            ON CONFLICT(id) DO UPDATE SET
                time = excluded.time,
                context = excluded.context,
                notes = excluded.notes,
                heart_rate = excluded.heart_rate,
                systolic = excluded.systolic,
                diastolic = excluded.diastolic,
                temperature = excluded.temperature,
                sleep = excluded.sleep,
                quality = excluded.quality,
                mood = excluded.mood,
                stress = excluded.stress,
                updated_at = excluded.updated_at,
                deleted_at = NULL",
            params![
                entry.id,
                entry.time,
                entry.context,
                entry.notes,
                entry.heart_rate,
                entry.systolic,
                entry.diastolic,
                entry.temperature,
                entry.sleep,
                entry.quality,
                entry.mood,
                entry.stress,
                now,
            ],
        ).map_err(|e| format!("Save record failed: {}", e))?;

        // Append to outbox journal
        tx.execute(
            "INSERT INTO outbox (record_id, action, timestamp) VALUES (?1, 'UPSERT', ?2)",
            params![entry.id, now],
        ).map_err(|e| format!("Outbox journal append failed: {}", e))?;

        tx.commit().map_err(|e| e.to_string())?;
        Ok(entry.clone())
    }

    pub fn delete_entry(&self, id: &str) -> Result<bool, String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();

        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let affected = tx.execute(
            "UPDATE check_ins SET deleted_at = ?1, updated_at = ?1 WHERE id = ?2 AND deleted_at IS NULL",
            params![now, id],
        ).map_err(|e| e.to_string())?;

        if affected > 0 {
            tx.execute(
                "INSERT INTO outbox (record_id, action, timestamp) VALUES (?1, 'DELETE', ?2)",
                params![id, now],
            ).map_err(|e| e.to_string())?;
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(affected > 0)
    }

    pub fn import_backup(&self, entries: &[CheckInRecord]) -> Result<ImportResult, String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();
        let mut added = 0;
        let mut duplicates = 0;
        let mut conflicts = 0;

        let tx = conn.transaction().map_err(|e| e.to_string())?;

        for entry in entries {
            let existing: Option<(String, String)> = tx.query_row(
                "SELECT time, context FROM check_ins WHERE id = ?1",
                params![entry.id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            ).optional().map_err(|e| e.to_string())?;

            match existing {
                Some((time, context)) => {
                    if time == entry.time && context == entry.context {
                        duplicates += 1;
                    } else {
                        conflicts += 1; // Preserve local conflicting record
                    }
                }
                None => {
                    tx.execute(
                        "INSERT INTO check_ins (
                            id, time, context, notes, heart_rate, systolic, diastolic, temperature, sleep, quality, mood, stress, created_at, updated_at, deleted_at
                        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?13, NULL)",
                        params![
                            entry.id,
                            entry.time,
                            entry.context,
                            entry.notes,
                            entry.heart_rate,
                            entry.systolic,
                            entry.diastolic,
                            entry.temperature,
                            entry.sleep,
                            entry.quality,
                            entry.mood,
                            entry.stress,
                            now,
                        ],
                    ).map_err(|e| e.to_string())?;

                    tx.execute(
                        "INSERT INTO outbox (record_id, action, timestamp) VALUES (?1, 'INSERT', ?2)",
                        params![entry.id, now],
                    ).map_err(|e| e.to_string())?;

                    added += 1;
                }
            }
        }

        tx.commit().map_err(|e| e.to_string())?;
        Ok(ImportResult { added, duplicates, conflicts })
    }

    pub fn get_stats(&self) -> Result<StorageStats, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let total_records: usize = conn.query_row(
            "SELECT COUNT(*) FROM check_ins WHERE deleted_at IS NULL",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        let pending_outbox: usize = conn.query_row(
            "SELECT COUNT(*) FROM outbox",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        let db_size_bytes = fs::metadata(&self.path)
            .map(|m| m.len())
            .unwrap_or(0);

        Ok(StorageStats {
            total_records,
            pending_outbox,
            db_path: self.path.to_string_lossy().to_string(),
            db_size_bytes,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqlite_checkin_lifecycle() {
        let temp_dir = std::env::temp_dir().join(format!("orbit_test_{}", uuid::Uuid::new_v4()));
        let db_file = temp_dir.join("test_health.db");
        let db = Database::new(&db_file).expect("Failed to initialize test db");

        let sample = CheckInRecord {
            id: "rec-test-1".into(),
            time: "2026-11-14T12:00:00Z".into(),
            context: "Resting".into(),
            notes: Some("Test astronaut entry".into()),
            heart_rate: Some(64.0),
            systolic: Some(118.0),
            diastolic: Some(76.0),
            temperature: Some(36.6),
            sleep: Some(8.0),
            quality: Some(4.0),
            mood: Some(4.0),
            stress: Some(2.0),
        };

        // Save
        let saved = db.save_entry(&sample).expect("Failed to save");
        assert_eq!(saved.id, "rec-test-1");

        // Read
        let entries = db.get_entries().expect("Failed to get entries");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].heart_rate, Some(64.0));

        // Stats
        let stats = db.get_stats().expect("Failed to get stats");
        assert_eq!(stats.total_records, 1);
        assert_eq!(stats.pending_outbox, 1);

        // Delete
        let deleted = db.delete_entry("rec-test-1").expect("Failed to delete");
        assert!(deleted);

        // Confirm soft-delete
        let entries_after = db.get_entries().expect("Failed to get entries after delete");
        assert_eq!(entries_after.len(), 0);

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}

