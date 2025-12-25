mod commands;
mod db;
mod export;
mod models;

use db::DatabaseManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(DatabaseManager::new())
        .invoke_handler(tauri::generate_handler![
            commands::open_database,
            commands::create_database,
            commands::close_database,
            commands::get_current_database,
            commands::get_tables,
            commands::get_table_schema,
            commands::get_table_data,
            commands::execute_query,
            commands::export_data,
            commands::import_csv,
            commands::import_parquet,
            commands::import_excel,
            commands::create_sample_data,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
