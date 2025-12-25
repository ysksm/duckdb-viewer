use std::fs::File;
use std::io::Write;
use std::path::Path;

use rust_xlsxwriter::Workbook;

use crate::models::QueryResult;

pub fn export_to_csv(result: &QueryResult, file_path: &str) -> Result<(), String> {
    let file = File::create(file_path).map_err(|e| e.to_string())?;
    let mut writer = csv::Writer::from_writer(file);

    // Write header
    writer
        .write_record(&result.columns)
        .map_err(|e| e.to_string())?;

    // Write data rows
    for row in &result.rows {
        let string_row: Vec<String> = row
            .iter()
            .map(|v| match v {
                serde_json::Value::Null => String::new(),
                serde_json::Value::String(s) => s.clone(),
                other => other.to_string(),
            })
            .collect();
        writer
            .write_record(&string_row)
            .map_err(|e| e.to_string())?;
    }

    writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn export_to_excel(result: &QueryResult, file_path: &str) -> Result<(), String> {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    // Write header
    for (col, header) in result.columns.iter().enumerate() {
        worksheet
            .write_string(0, col as u16, header)
            .map_err(|e| e.to_string())?;
    }

    // Write data rows
    for (row_idx, row) in result.rows.iter().enumerate() {
        for (col_idx, value) in row.iter().enumerate() {
            let row_num = (row_idx + 1) as u32;
            let col_num = col_idx as u16;

            match value {
                serde_json::Value::Null => {
                    worksheet
                        .write_string(row_num, col_num, "")
                        .map_err(|e| e.to_string())?;
                }
                serde_json::Value::Bool(b) => {
                    worksheet
                        .write_boolean(row_num, col_num, *b)
                        .map_err(|e| e.to_string())?;
                }
                serde_json::Value::Number(n) => {
                    if let Some(i) = n.as_i64() {
                        worksheet
                            .write_number(row_num, col_num, i as f64)
                            .map_err(|e| e.to_string())?;
                    } else if let Some(f) = n.as_f64() {
                        worksheet
                            .write_number(row_num, col_num, f)
                            .map_err(|e| e.to_string())?;
                    }
                }
                serde_json::Value::String(s) => {
                    worksheet
                        .write_string(row_num, col_num, s)
                        .map_err(|e| e.to_string())?;
                }
                other => {
                    worksheet
                        .write_string(row_num, col_num, &other.to_string())
                        .map_err(|e| e.to_string())?;
                }
            }
        }
    }

    workbook.save(file_path).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn export_to_json(result: &QueryResult, file_path: &str) -> Result<(), String> {
    let mut records: Vec<serde_json::Map<String, serde_json::Value>> = Vec::new();

    for row in &result.rows {
        let mut record = serde_json::Map::new();
        for (i, value) in row.iter().enumerate() {
            if let Some(col_name) = result.columns.get(i) {
                record.insert(col_name.clone(), value.clone());
            }
        }
        records.push(record);
    }

    let json = serde_json::to_string_pretty(&records).map_err(|e| e.to_string())?;

    let mut file = File::create(file_path).map_err(|e| e.to_string())?;
    file.write_all(json.as_bytes())
        .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn export_to_parquet_via_duckdb(
    db_path: &Path,
    query: &str,
    file_path: &str,
) -> Result<(), String> {
    let conn = duckdb::Connection::open(db_path).map_err(|e| e.to_string())?;

    // Use DuckDB's native COPY TO for Parquet export
    let export_sql = format!("COPY ({}) TO '{}' (FORMAT PARQUET)", query, file_path);

    conn.execute(&export_sql, []).map_err(|e| e.to_string())?;

    Ok(())
}
