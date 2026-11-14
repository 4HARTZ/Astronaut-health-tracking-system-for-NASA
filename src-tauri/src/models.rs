use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckInRecord {
    pub id: String,
    pub time: String,
    pub context: String,
    pub notes: Option<String>,
    #[serde(default)]
    pub heart_rate: Option<f64>,
    #[serde(default)]
    pub systolic: Option<f64>,
    #[serde(default)]
    pub diastolic: Option<f64>,
    #[serde(default)]
    pub temperature: Option<f64>,
    #[serde(default)]
    pub sleep: Option<f64>,
    #[serde(default)]
    pub quality: Option<f64>,
    #[serde(default)]
    pub mood: Option<f64>,
    #[serde(default)]
    pub stress: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResult {
    pub added: usize,
    pub duplicates: usize,
    pub conflicts: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageStats {
    pub total_records: usize,
    pub pending_outbox: usize,
    pub db_path: String,
    pub db_size_bytes: u64,
}
