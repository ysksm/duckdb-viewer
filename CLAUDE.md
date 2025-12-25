# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DuckDB Viewer is a desktop application for viewing and managing DuckDB databases, built with Tauri 2.x (Rust backend) and Angular 21 (frontend).

## Development Commands

```bash
# Install dependencies
npm install

# Development (starts Angular dev server and Tauri)
npm run tauri dev

# Build Angular frontend only
npm run build

# Build production Tauri app
npm run tauri build

# Run Angular tests
npm run test

# Lint
npm run lint
```

## Architecture

### Frontend (Angular 21)
- `src/app/components/` - UI components (toolbar, sidebar, sql-editor, data-table, dashboard)
- `src/app/services/` - Services for Tauri IPC, database, query, export, dashboard
- `src/app/models/` - TypeScript interfaces

Key services:
- `TauriService` - Wrapper for Tauri invoke calls and dialog APIs
- `DatabaseService` - Database connection state management using Signals
- `QueryService` - SQL query execution and history
- `DashboardService` - Dashboard CRUD with Tauri Store persistence

### Backend (Rust/Tauri)
- `src-tauri/src/lib.rs` - Tauri app setup and command registration
- `src-tauri/src/commands.rs` - Tauri command handlers
- `src-tauri/src/db.rs` - DuckDB connection management (connect-per-operation pattern)
- `src-tauri/src/export.rs` - Export to CSV, Excel, JSON, Parquet
- `src-tauri/src/models.rs` - Rust structs for data transfer

Key design decisions:
- Database connections are opened per-operation and closed immediately (no persistent connections)
- Data is loaded into memory for processing
- Dashboard settings are persisted via Tauri Store plugin

### Tauri Commands
```rust
open_database, create_database, close_database, get_current_database
get_tables, get_table_schema, get_table_data
execute_query
export_data, import_csv, import_parquet, import_excel
```

## Dependencies

### Key Rust Crates
- `duckdb` (1.4.3, bundled) - DuckDB database
- `tauri` (2.x) with dialog plugin
- `tauri-plugin-store` - Settings persistence
- `rust_xlsxwriter` - Excel export
- `csv` - CSV export

### Key npm Packages
- `@angular/material` - UI components
- `@tauri-apps/api` - Tauri frontend API
- `@tauri-apps/plugin-store` - Settings persistence
- `ng2-charts` / `chart.js` - Dashboard charts
- `angular-gridster2` - Dashboard grid layout
