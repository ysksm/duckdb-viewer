use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub path: String,
    pub tables: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub row_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub nullable: bool,
    pub default_value: Option<String>,
    pub is_primary_key: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableSchema {
    pub table_name: String,
    pub columns: Vec<ColumnInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub column_types: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
    pub execution_time_ms: u128,
}

/// Export options for batch export operations.
/// Future use: Unified export API that accepts options as a single struct
/// instead of individual parameters, enabling features like:
/// - Export presets/templates
/// - Bulk export with multiple queries
/// - Export job queuing
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub file_path: String,
    pub format: ExportFormat,
    pub query: Option<String>,
    pub table_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Csv,
    Excel,
    Parquet,
    Json,
}

/// Import options for batch import operations.
/// Future use: Unified import API that accepts options as a single struct
/// instead of separate commands per format, enabling features like:
/// - Auto-detect file format from extension
/// - Import with column mapping/transformation
/// - Batch import from multiple files
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportOptions {
    pub file_path: String,
    pub table_name: String,
    pub format: ImportFormat,
}

/// Supported import file formats.
/// Future use: Used with ImportOptions for unified import API
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImportFormat {
    Csv,
    Parquet,
    Excel,
}
