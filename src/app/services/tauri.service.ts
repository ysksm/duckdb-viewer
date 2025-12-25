import { Injectable, signal, computed } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { Store } from '@tauri-apps/plugin-store';
import {
  DatabaseInfo,
  TableInfo,
  TableSchema,
  QueryResult,
  ExportFormat,
  Dashboard,
} from '../models/database.model';

@Injectable({
  providedIn: 'root',
})
export class TauriService {
  private store: Store | null = null;

  private async getStore(): Promise<Store> {
    if (!this.store) {
      this.store = await Store.load('settings.json');
    }
    return this.store;
  }

  // Database operations
  async openDatabase(path: string): Promise<DatabaseInfo> {
    return invoke<DatabaseInfo>('open_database', { path });
  }

  async createDatabase(path: string): Promise<DatabaseInfo> {
    return invoke<DatabaseInfo>('create_database', { path });
  }

  async closeDatabase(): Promise<void> {
    return invoke('close_database');
  }

  async getCurrentDatabase(): Promise<string | null> {
    return invoke<string | null>('get_current_database');
  }

  // Table operations
  async getTables(): Promise<TableInfo[]> {
    return invoke<TableInfo[]>('get_tables');
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    return invoke<TableSchema>('get_table_schema', { tableName });
  }

  async getTableData(
    tableName: string,
    limit: number,
    offset: number
  ): Promise<QueryResult> {
    const result = await invoke<QueryResult>('get_table_data', { tableName, limit, offset });
    console.log('getTableData result:', JSON.stringify(result, null, 2));
    return result;
  }

  // Query operations
  async executeQuery(sql: string): Promise<QueryResult> {
    const result = await invoke<QueryResult>('execute_query', { sql });
    console.log('executeQuery result:', JSON.stringify(result, null, 2));
    return result;
  }

  // Export operations
  async exportData(
    format: ExportFormat,
    filePath: string,
    query: string
  ): Promise<void> {
    return invoke('export_data', { format, filePath, query });
  }

  // Import operations
  async importCsv(filePath: string, tableName: string): Promise<void> {
    return invoke('import_csv', { filePath, tableName });
  }

  async importParquet(filePath: string, tableName: string): Promise<void> {
    return invoke('import_parquet', { filePath, tableName });
  }

  async importExcel(
    filePath: string,
    tableName: string,
    sheetName?: string
  ): Promise<void> {
    return invoke('import_excel', { filePath, tableName, sheetName });
  }

  // Sample data operations
  async createSampleData(sampleType: string): Promise<void> {
    return invoke('create_sample_data', { sampleType });
  }

  // Dialog operations
  async openFileDialog(filters?: { name: string; extensions: string[] }[]): Promise<string | null> {
    const result = await open({
      multiple: false,
      filters: filters || [
        { name: 'DuckDB Database', extensions: ['duckdb', 'db'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result as string | null;
  }

  async saveFileDialog(
    defaultPath?: string,
    filters?: { name: string; extensions: string[] }[]
  ): Promise<string | null> {
    const result = await save({
      defaultPath,
      filters: filters || [
        { name: 'DuckDB Database', extensions: ['duckdb', 'db'] },
      ],
    });
    return result;
  }

  // Store operations for dashboard persistence
  async saveDashboards(dashboards: Dashboard[]): Promise<void> {
    const store = await this.getStore();
    await store.set('dashboards', dashboards);
    await store.save();
  }

  async loadDashboards(): Promise<Dashboard[]> {
    const store = await this.getStore();
    const dashboards = await store.get<Dashboard[]>('dashboards');
    return dashboards || [];
  }

  async saveRecentDatabases(paths: string[]): Promise<void> {
    const store = await this.getStore();
    await store.set('recentDatabases', paths);
    await store.save();
  }

  async loadRecentDatabases(): Promise<string[]> {
    const store = await this.getStore();
    const paths = await store.get<string[]>('recentDatabases');
    return paths || [];
  }
}
