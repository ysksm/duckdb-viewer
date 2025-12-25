import { Injectable, signal } from '@angular/core';
import { TauriService } from './tauri.service';
import { QueryResult } from '../models/database.model';

export interface QueryHistoryItem {
  id: string;
  sql: string;
  executedAt: Date;
  rowCount: number;
  executionTimeMs: number;
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class QueryService {
  private _isExecuting = signal(false);
  private _currentResult = signal<QueryResult | null>(null);
  private _currentError = signal<string | null>(null);
  private _queryHistory = signal<QueryHistoryItem[]>([]);

  readonly isExecuting = this._isExecuting.asReadonly();
  readonly currentResult = this._currentResult.asReadonly();
  readonly currentError = this._currentError.asReadonly();
  readonly queryHistory = this._queryHistory.asReadonly();

  constructor(private tauri: TauriService) {}

  async executeQuery(sql: string): Promise<QueryResult> {
    this._isExecuting.set(true);
    this._currentError.set(null);

    const historyItem: QueryHistoryItem = {
      id: crypto.randomUUID(),
      sql,
      executedAt: new Date(),
      rowCount: 0,
      executionTimeMs: 0,
      success: false,
    };

    try {
      const result = await this.tauri.executeQuery(sql);
      this._currentResult.set(result);

      historyItem.rowCount = result.row_count;
      historyItem.executionTimeMs = result.execution_time_ms;
      historyItem.success = true;

      this.addToHistory(historyItem);
      return result;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this._currentError.set(errorMessage);
      historyItem.error = errorMessage;
      this.addToHistory(historyItem);
      throw e;
    } finally {
      this._isExecuting.set(false);
    }
  }

  async getTableData(
    tableName: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<QueryResult> {
    this._isExecuting.set(true);
    this._currentError.set(null);

    try {
      const result = await this.tauri.getTableData(tableName, limit, offset);
      this._currentResult.set(result);
      return result;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this._currentError.set(errorMessage);
      throw e;
    } finally {
      this._isExecuting.set(false);
    }
  }

  private addToHistory(item: QueryHistoryItem): void {
    const history = this._queryHistory();
    const updated = [item, ...history].slice(0, 100); // Keep last 100 queries
    this._queryHistory.set(updated);
  }

  clearHistory(): void {
    this._queryHistory.set([]);
  }

  clearResult(): void {
    this._currentResult.set(null);
    this._currentError.set(null);
  }
}
