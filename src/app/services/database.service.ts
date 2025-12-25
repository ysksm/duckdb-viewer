import { Injectable, signal, computed } from '@angular/core';
import { TauriService } from './tauri.service';
import {
  DatabaseInfo,
  TableInfo,
  TableSchema,
} from '../models/database.model';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private _isConnected = signal(false);
  private _currentDatabase = signal<string | null>(null);
  private _tables = signal<TableInfo[]>([]);
  private _selectedTable = signal<string | null>(null);
  private _selectedTableSchema = signal<TableSchema | null>(null);
  private _recentDatabases = signal<string[]>([]);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  readonly isConnected = this._isConnected.asReadonly();
  readonly currentDatabase = this._currentDatabase.asReadonly();
  readonly tables = this._tables.asReadonly();
  readonly selectedTable = this._selectedTable.asReadonly();
  readonly selectedTableSchema = this._selectedTableSchema.asReadonly();
  readonly recentDatabases = this._recentDatabases.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly databaseName = computed(() => {
    const path = this._currentDatabase();
    if (!path) return null;
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  });

  constructor(private tauri: TauriService) {
    this.loadRecentDatabases();
  }

  private async loadRecentDatabases(): Promise<void> {
    try {
      const recent = await this.tauri.loadRecentDatabases();
      this._recentDatabases.set(recent);
    } catch (e) {
      console.error('Failed to load recent databases:', e);
    }
  }

  private async addToRecentDatabases(path: string): Promise<void> {
    const recent = this._recentDatabases();
    const filtered = recent.filter((p) => p !== path);
    const updated = [path, ...filtered].slice(0, 10);
    this._recentDatabases.set(updated);
    await this.tauri.saveRecentDatabases(updated);
  }

  async openDatabase(path?: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      let dbPath = path;
      if (!dbPath) {
        const selected = await this.tauri.openFileDialog();
        if (!selected) {
          this._isLoading.set(false);
          return;
        }
        dbPath = selected;
      }

      const info = await this.tauri.openDatabase(dbPath);
      this._currentDatabase.set(info.path);
      this._isConnected.set(true);
      await this.addToRecentDatabases(info.path);
      await this.refreshTables();
    } catch (e) {
      this._error.set(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      this._isLoading.set(false);
    }
  }

  async createDatabase(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const path = await this.tauri.saveFileDialog();
      if (!path) {
        this._isLoading.set(false);
        return;
      }

      const info = await this.tauri.createDatabase(path);
      this._currentDatabase.set(info.path);
      this._isConnected.set(true);
      await this.addToRecentDatabases(info.path);
      this._tables.set([]);
    } catch (e) {
      this._error.set(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      this._isLoading.set(false);
    }
  }

  async closeDatabase(): Promise<void> {
    try {
      await this.tauri.closeDatabase();
      this._currentDatabase.set(null);
      this._isConnected.set(false);
      this._tables.set([]);
      this._selectedTable.set(null);
      this._selectedTableSchema.set(null);
    } catch (e) {
      this._error.set(e instanceof Error ? e.message : String(e));
      throw e;
    }
  }

  async refreshTables(): Promise<void> {
    if (!this._isConnected()) return;

    try {
      const tables = await this.tauri.getTables();
      this._tables.set(tables);
    } catch (e) {
      this._error.set(e instanceof Error ? e.message : String(e));
      throw e;
    }
  }

  async selectTable(tableName: string): Promise<void> {
    this._selectedTable.set(tableName);
    try {
      const schema = await this.tauri.getTableSchema(tableName);
      this._selectedTableSchema.set(schema);
    } catch (e) {
      this._error.set(e instanceof Error ? e.message : String(e));
      throw e;
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
