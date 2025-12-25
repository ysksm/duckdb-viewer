use std::path::PathBuf;
use std::time::Duration;
use tauri::State;
use tokio::time::timeout;

use crate::db::DatabaseManager;
use crate::export::{export_to_csv, export_to_excel, export_to_json, export_to_parquet_via_duckdb};
use crate::models::{ColumnInfo, DatabaseInfo, ExportFormat, QueryResult, TableInfo, TableSchema};

/// Default timeout for database operations (30 seconds)
const DB_TIMEOUT: Duration = Duration::from_secs(30);

/// Helper to run blocking database operations with timeout
async fn run_blocking<F, T>(f: F) -> Result<T, String>
where
    F: FnOnce() -> Result<T, String> + Send + 'static,
    T: Send + 'static,
{
    let result = timeout(
        DB_TIMEOUT,
        tokio::task::spawn_blocking(f)
    )
    .await
    .map_err(|_| "Operation timed out".to_string())?
    .map_err(|e| format!("Task failed: {}", e))?;

    result
}

// ============================================================================
// Database Commands
// ============================================================================

#[tauri::command]
pub async fn open_database(
    path: String,
    db: State<'_, DatabaseManager>,
) -> Result<DatabaseInfo, String> {
    let path_clone = path.clone();

    let result = run_blocking(move || {
        let conn = duckdb::Connection::open(&path_clone)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let tables = get_table_names(&conn)?;

        Ok(DatabaseInfo {
            path: path_clone,
            tables,
        })
    })
    .await?;

    db.set_path(Some(PathBuf::from(&path)));
    Ok(result)
}

#[tauri::command]
pub async fn create_database(
    path: String,
    db: State<'_, DatabaseManager>,
) -> Result<DatabaseInfo, String> {
    let path_clone = path.clone();

    run_blocking(move || {
        let _conn = duckdb::Connection::open(&path_clone)
            .map_err(|e| format!("Failed to create database: {}", e))?;
        Ok(())
    })
    .await?;

    db.set_path(Some(PathBuf::from(&path)));

    Ok(DatabaseInfo {
        path,
        tables: vec![],
    })
}

#[tauri::command]
pub async fn close_database(db: State<'_, DatabaseManager>) -> Result<(), String> {
    db.set_path(None);
    Ok(())
}

#[tauri::command]
pub async fn get_current_database(db: State<'_, DatabaseManager>) -> Result<Option<String>, String> {
    Ok(db.get_path().map(|p| p.to_string_lossy().to_string()))
}

// ============================================================================
// Table Commands
// ============================================================================

#[tauri::command]
pub async fn get_tables(db: State<'_, DatabaseManager>) -> Result<Vec<TableInfo>, String> {
    let path = db.get_path().ok_or("No database selected")?;

    run_blocking(move || {
        let conn = duckdb::Connection::open(&path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let table_names = get_table_names(&conn)?;

        let mut tables = Vec::new();
        for name in table_names {
            let count_sql = format!("SELECT COUNT(*) FROM \"{}\"", name);
            let row_count: i64 = conn
                .query_row(&count_sql, [], |row| row.get(0))
                .unwrap_or(0);
            tables.push(TableInfo { name, row_count });
        }

        Ok(tables)
    })
    .await
}

#[tauri::command]
pub async fn get_table_schema(
    table_name: String,
    db: State<'_, DatabaseManager>,
) -> Result<TableSchema, String> {
    let path = db.get_path().ok_or("No database selected")?;

    run_blocking(move || {
        let conn = duckdb::Connection::open(&path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let sql = format!("PRAGMA table_info('{}')", table_name);
        let mut stmt = conn.prepare(&sql)
            .map_err(|e| format!("Failed to prepare query: {}", e))?;

        let columns: Vec<ColumnInfo> = stmt
            .query_map([], |row| {
                Ok(ColumnInfo {
                    name: row.get(1)?,
                    data_type: row.get(2)?,
                    nullable: !row.get::<_, bool>(3)?,
                    default_value: row.get(4).ok(),
                    is_primary_key: row.get::<_, bool>(5).unwrap_or(false),
                })
            })
            .map_err(|e| format!("Failed to execute query: {}", e))?
            .filter_map(|r| r.ok())
            .collect();

        Ok(TableSchema { table_name, columns })
    })
    .await
}

#[tauri::command]
pub async fn get_table_data(
    table_name: String,
    limit: usize,
    offset: usize,
    db: State<'_, DatabaseManager>,
) -> Result<QueryResult, String> {
    let path = db.get_path().ok_or("No database selected")?;
    let sql = format!(
        "SELECT * FROM \"{}\" LIMIT {} OFFSET {}",
        table_name, limit, offset
    );

    run_blocking(move || execute_query_sync(&path, &sql)).await
}

// ============================================================================
// Query Commands
// ============================================================================

#[tauri::command]
pub async fn execute_query(
    sql: String,
    db: State<'_, DatabaseManager>,
) -> Result<QueryResult, String> {
    let path = db.get_path().ok_or("No database selected")?;

    run_blocking(move || execute_query_sync(&path, &sql)).await
}

/// Synchronous query execution (runs in blocking thread)
fn execute_query_sync(path: &std::path::Path, sql: &str) -> Result<QueryResult, String> {
    use serde_json::Value as JsonValue;

    let start = std::time::Instant::now();

    let conn = duckdb::Connection::open(path)
        .map_err(|e| format!("Failed to open database: {}", e))?;

    let mut stmt = conn.prepare(sql)
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    // Execute query and collect rows
    let mut rows_result = stmt.query([])
        .map_err(|e| format!("Failed to execute query: {}", e))?;

    let mut all_rows: Vec<Vec<JsonValue>> = Vec::new();
    let mut column_count = 0;

    while let Some(row) = rows_result.next().map_err(|e| format!("Error: {}", e))? {
        let mut values = Vec::new();
        let mut col_idx = 0;

        // Use get_ref to probe columns - this tells us if column exists
        loop {
            match row.get_ref(col_idx) {
                Ok(val_ref) => {
                    // Convert ValueRef to JSON
                    let json_val = value_ref_to_json(val_ref);
                    values.push(json_val);
                    col_idx += 1;
                }
                Err(_) => {
                    // Column doesn't exist - we've reached the end
                    break;
                }
            }
            if col_idx > 500 {
                break;
            }
        }

        if column_count == 0 {
            column_count = col_idx;
        }
        all_rows.push(values);
    }

    // Release borrow on statement
    drop(rows_result);

    // Get column names (statement is executed now)
    let columns: Vec<String> = (0..column_count)
        .map(|i| {
            stmt.column_name(i)
                .map(|s| s.to_string())
                .unwrap_or_else(|_| format!("column_{}", i))
        })
        .collect();

    // Infer types from first row
    let column_types: Vec<String> = if let Some(first_row) = all_rows.first() {
        first_row.iter().map(infer_type_from_value).collect()
    } else {
        vec!["Unknown".to_string(); column_count]
    };

    let row_count = all_rows.len();
    let execution_time_ms = start.elapsed().as_millis();

    Ok(QueryResult {
        columns,
        column_types,
        rows: all_rows,
        row_count,
        execution_time_ms,
    })
}

/// Convert DuckDB ValueRef to JSON Value
fn value_ref_to_json(val_ref: duckdb::types::ValueRef) -> serde_json::Value {
    use duckdb::types::ValueRef;
    use serde_json::Value as JsonValue;

    match val_ref {
        ValueRef::Null => JsonValue::Null,
        ValueRef::Boolean(b) => JsonValue::from(b),
        ValueRef::TinyInt(i) => JsonValue::from(i),
        ValueRef::SmallInt(i) => JsonValue::from(i),
        ValueRef::Int(i) => JsonValue::from(i),
        ValueRef::BigInt(i) => JsonValue::from(i),
        ValueRef::HugeInt(i) => JsonValue::from(i.to_string()),
        ValueRef::UTinyInt(i) => JsonValue::from(i),
        ValueRef::USmallInt(i) => JsonValue::from(i),
        ValueRef::UInt(i) => JsonValue::from(i),
        ValueRef::UBigInt(i) => JsonValue::from(i),
        ValueRef::Float(f) => serde_json::Number::from_f64(f as f64)
            .map(JsonValue::Number)
            .unwrap_or(JsonValue::Null),
        ValueRef::Double(f) => serde_json::Number::from_f64(f)
            .map(JsonValue::Number)
            .unwrap_or(JsonValue::Null),
        ValueRef::Decimal(d) => JsonValue::from(d.to_string()),
        ValueRef::Text(bytes) => JsonValue::from(String::from_utf8_lossy(bytes).to_string()),
        ValueRef::Blob(bytes) => JsonValue::from(format!("<{} bytes>", bytes.len())),
        ValueRef::Timestamp(_, micros) => {
            // Convert microseconds to readable format
            let secs = micros / 1_000_000;
            let nsecs = ((micros % 1_000_000) * 1000) as u32;
            if let Some(dt) = chrono::DateTime::from_timestamp(secs, nsecs) {
                JsonValue::from(dt.format("%Y-%m-%d %H:%M:%S").to_string())
            } else {
                JsonValue::from(micros.to_string())
            }
        }
        ValueRef::Date32(days) => {
            // Days since 1970-01-01
            if let Some(date) = chrono::NaiveDate::from_ymd_opt(1970, 1, 1)
                .and_then(|d| d.checked_add_days(chrono::Days::new(days as u64)))
            {
                JsonValue::from(date.format("%Y-%m-%d").to_string())
            } else {
                JsonValue::from(days.to_string())
            }
        }
        ValueRef::Time64(_, micros) => {
            let secs = (micros / 1_000_000) as u32;
            let nanos = ((micros % 1_000_000) * 1000) as u32;
            if let Some(time) = chrono::NaiveTime::from_num_seconds_from_midnight_opt(secs, nanos) {
                JsonValue::from(time.format("%H:%M:%S").to_string())
            } else {
                JsonValue::from(micros.to_string())
            }
        }
        ValueRef::Interval { months, days, nanos } => {
            JsonValue::from(format!("{}m {}d {}ns", months, days, nanos))
        }
        ValueRef::Enum(e, _) => JsonValue::from(format!("{:?}", e)),
        _ => JsonValue::Null,
    }
}

/// Infer type from JSON value
fn infer_type_from_value(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => "Null".to_string(),
        serde_json::Value::Bool(_) => "Boolean".to_string(),
        serde_json::Value::Number(n) => {
            if n.is_i64() {
                "Integer".to_string()
            } else {
                "Float".to_string()
            }
        }
        serde_json::Value::String(_) => "String".to_string(),
        serde_json::Value::Array(_) => "Array".to_string(),
        serde_json::Value::Object(_) => "Object".to_string(),
    }
}

/// Get table names from connection
fn get_table_names(conn: &duckdb::Connection) -> Result<Vec<String>, String> {
    let sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' AND table_type = 'BASE TABLE'";
    let mut stmt = conn.prepare(sql)
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tables: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| format!("Failed to execute query: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(tables)
}

// ============================================================================
// Export Commands
// ============================================================================

#[tauri::command]
pub async fn export_data(
    format: ExportFormat,
    file_path: String,
    query: String,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    let path = db.get_path().ok_or("No database selected")?;

    run_blocking(move || {
        let result = execute_query_sync(&path, &query)?;

        match format {
            ExportFormat::Csv => export_to_csv(&result, &file_path),
            ExportFormat::Excel => export_to_excel(&result, &file_path),
            ExportFormat::Json => export_to_json(&result, &file_path),
            ExportFormat::Parquet => export_to_parquet_via_duckdb(&path, &query, &file_path),
        }
    })
    .await
}

// ============================================================================
// Import Commands
// ============================================================================

#[tauri::command]
pub async fn import_csv(
    file_path: String,
    table_name: String,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    let path = db.get_path().ok_or("No database selected")?;

    run_blocking(move || {
        let conn = duckdb::Connection::open(&path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let sql = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\" AS SELECT * FROM read_csv_auto('{}')",
            table_name, file_path
        );
        conn.execute(&sql, [])
            .map_err(|e| format!("Failed to import CSV: {}", e))?;

        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn import_parquet(
    file_path: String,
    table_name: String,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    let path = db.get_path().ok_or("No database selected")?;

    run_blocking(move || {
        let conn = duckdb::Connection::open(&path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let sql = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\" AS SELECT * FROM read_parquet('{}')",
            table_name, file_path
        );
        conn.execute(&sql, [])
            .map_err(|e| format!("Failed to import Parquet: {}", e))?;

        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn import_excel(
    file_path: String,
    table_name: String,
    sheet_name: Option<String>,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    let path = db.get_path().ok_or("No database selected")?;

    run_blocking(move || {
        let conn = duckdb::Connection::open(&path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        conn.execute("INSTALL spatial", [])
            .map_err(|e| format!("Failed to install spatial extension: {}", e))?;
        conn.execute("LOAD spatial", [])
            .map_err(|e| format!("Failed to load spatial extension: {}", e))?;

        let sheet_clause = sheet_name
            .map(|s| format!(", sheet_name='{}'", s))
            .unwrap_or_default();

        let sql = format!(
            "CREATE TABLE IF NOT EXISTS \"{}\" AS SELECT * FROM st_read('{}'{});",
            table_name, file_path, sheet_clause
        );
        conn.execute(&sql, [])
            .map_err(|e| format!("Failed to import Excel: {}", e))?;

        Ok(())
    })
    .await
}

// ============================================================================
// Sample Data Commands
// ============================================================================

#[tauri::command]
pub async fn create_sample_data(
    sample_type: String,
    db: State<'_, DatabaseManager>,
) -> Result<(), String> {
    let path = db.get_path().ok_or("No database selected")?;

    run_blocking(move || {
        let conn = duckdb::Connection::open(&path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let sql = match sample_type.as_str() {
            "users" => r#"
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR,
                    email VARCHAR,
                    age INTEGER,
                    city VARCHAR,
                    created_at TIMESTAMP
                );
                DELETE FROM users;
                INSERT INTO users
                SELECT
                    i as id,
                    'User ' || i as name,
                    'user' || i || '@example.com' as email,
                    20 + (i % 50) as age,
                    CASE (i % 5)
                        WHEN 0 THEN 'Tokyo'
                        WHEN 1 THEN 'Osaka'
                        WHEN 2 THEN 'Nagoya'
                        WHEN 3 THEN 'Fukuoka'
                        ELSE 'Sapporo'
                    END as city,
                    NOW() - INTERVAL (i * 24) HOUR as created_at
                FROM generate_series(1, 100) as t(i);
            "#,
            "products" => r#"
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY,
                    name VARCHAR,
                    category VARCHAR,
                    price DECIMAL(10,2),
                    stock INTEGER,
                    rating DECIMAL(2,1)
                );
                DELETE FROM products;
                INSERT INTO products
                SELECT
                    i as id,
                    'Product ' || i as name,
                    CASE (i % 5)
                        WHEN 0 THEN 'Electronics'
                        WHEN 1 THEN 'Clothing'
                        WHEN 2 THEN 'Food'
                        WHEN 3 THEN 'Books'
                        ELSE 'Home'
                    END as category,
                    ROUND(10 + (random() * 990), 2) as price,
                    CAST(random() * 1000 AS INTEGER) as stock,
                    ROUND(1 + (random() * 4), 1) as rating
                FROM generate_series(1, 50) as t(i);
            "#,
            "orders" => r#"
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER,
                    product_id INTEGER,
                    quantity INTEGER,
                    total_price DECIMAL(10,2),
                    status VARCHAR,
                    order_date DATE
                );
                DELETE FROM orders;
                INSERT INTO orders
                SELECT
                    i as id,
                    1 + (i % 100) as user_id,
                    1 + (i % 50) as product_id,
                    1 + (i % 10) as quantity,
                    ROUND(100 + (random() * 900), 2) as total_price,
                    CASE (i % 4)
                        WHEN 0 THEN 'pending'
                        WHEN 1 THEN 'processing'
                        WHEN 2 THEN 'shipped'
                        ELSE 'delivered'
                    END as status,
                    CURRENT_DATE - INTERVAL (i % 365) DAY as order_date
                FROM generate_series(1, 500) as t(i);
            "#,
            "all" => r#"
                -- Users
                CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name VARCHAR, email VARCHAR, age INTEGER, city VARCHAR, created_at TIMESTAMP);
                DELETE FROM users;
                INSERT INTO users SELECT i, 'User ' || i, 'user' || i || '@example.com', 20 + (i % 50), CASE (i % 5) WHEN 0 THEN 'Tokyo' WHEN 1 THEN 'Osaka' WHEN 2 THEN 'Nagoya' WHEN 3 THEN 'Fukuoka' ELSE 'Sapporo' END, NOW() - INTERVAL (i * 24) HOUR FROM generate_series(1, 100) as t(i);

                -- Products
                CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name VARCHAR, category VARCHAR, price DECIMAL(10,2), stock INTEGER, rating DECIMAL(2,1));
                DELETE FROM products;
                INSERT INTO products SELECT i, 'Product ' || i, CASE (i % 5) WHEN 0 THEN 'Electronics' WHEN 1 THEN 'Clothing' WHEN 2 THEN 'Food' WHEN 3 THEN 'Books' ELSE 'Home' END, ROUND(10 + (random() * 990), 2), CAST(random() * 1000 AS INTEGER), ROUND(1 + (random() * 4), 1) FROM generate_series(1, 50) as t(i);

                -- Orders
                CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, user_id INTEGER, product_id INTEGER, quantity INTEGER, total_price DECIMAL(10,2), status VARCHAR, order_date DATE);
                DELETE FROM orders;
                INSERT INTO orders SELECT i, 1 + (i % 100), 1 + (i % 50), 1 + (i % 10), ROUND(100 + (random() * 900), 2), CASE (i % 4) WHEN 0 THEN 'pending' WHEN 1 THEN 'processing' WHEN 2 THEN 'shipped' ELSE 'delivered' END, CURRENT_DATE - INTERVAL (i % 365) DAY FROM generate_series(1, 500) as t(i);
            "#,
            _ => return Err(format!("Unknown sample type: {}", sample_type)),
        };

        // Execute each statement separately
        for statement in sql.split(';').filter(|s| !s.trim().is_empty()) {
            conn.execute(statement.trim(), [])
                .map_err(|e| format!("Failed to create sample data: {}", e))?;
        }

        Ok(())
    })
    .await
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_execute_query_sync() {
        let db_path = Path::new("/Users/kasamatsu/src/github/duckdb-viewer/sample2.duckdb");

        let result = execute_query_sync(db_path, "SELECT id, name, city FROM users LIMIT 5");

        match result {
            Ok(qr) => {
                println!("Columns: {:?}", qr.columns);
                println!("Column types: {:?}", qr.column_types);
                println!("Row count: {}", qr.row_count);
                println!("Rows:");
                for (i, row) in qr.rows.iter().enumerate() {
                    println!("  Row {}: {:?}", i, row);
                }
                assert!(qr.row_count > 0, "Expected some rows");
                assert_eq!(qr.columns.len(), 3, "Expected 3 columns");
            }
            Err(e) => {
                panic!("Query failed: {}", e);
            }
        }
    }

    #[test]
    fn test_value_ref_to_json() {
        use duckdb::types::ValueRef;
        use serde_json::Value as JsonValue;

        // Test null
        let null_val = value_ref_to_json(ValueRef::Null);
        assert_eq!(null_val, JsonValue::Null);

        // Test int
        let int_val = value_ref_to_json(ValueRef::Int(42));
        assert_eq!(int_val, JsonValue::from(42));

        // Test text
        let text_val = value_ref_to_json(ValueRef::Text(b"hello"));
        assert_eq!(text_val, JsonValue::from("hello"));
    }
}
