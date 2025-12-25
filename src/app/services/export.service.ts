import { Injectable, signal } from '@angular/core';
import { TauriService } from './tauri.service';
import { ExportFormat } from '../models/database.model';

@Injectable({
  providedIn: 'root',
})
export class ExportService {
  private _isExporting = signal(false);
  private _exportError = signal<string | null>(null);

  readonly isExporting = this._isExporting.asReadonly();
  readonly exportError = this._exportError.asReadonly();

  constructor(private tauri: TauriService) {}

  async exportData(
    format: ExportFormat,
    query: string,
    defaultFileName?: string
  ): Promise<void> {
    this._isExporting.set(true);
    this._exportError.set(null);

    try {
      const extension = this.getExtension(format);
      const filters = this.getFilters(format);

      const filePath = await this.tauri.saveFileDialog(
        defaultFileName ? `${defaultFileName}.${extension}` : undefined,
        filters
      );

      if (!filePath) {
        return;
      }

      await this.tauri.exportData(format, filePath, query);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this._exportError.set(errorMessage);
      throw e;
    } finally {
      this._isExporting.set(false);
    }
  }

  async importFile(
    format: 'csv' | 'parquet' | 'excel',
    tableName: string
  ): Promise<void> {
    this._isExporting.set(true);
    this._exportError.set(null);

    try {
      const filters = this.getImportFilters(format);
      const filePath = await this.tauri.openFileDialog(filters);

      if (!filePath) {
        return;
      }

      switch (format) {
        case 'csv':
          await this.tauri.importCsv(filePath, tableName);
          break;
        case 'parquet':
          await this.tauri.importParquet(filePath, tableName);
          break;
        case 'excel':
          await this.tauri.importExcel(filePath, tableName);
          break;
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this._exportError.set(errorMessage);
      throw e;
    } finally {
      this._isExporting.set(false);
    }
  }

  private getExtension(format: ExportFormat): string {
    switch (format) {
      case 'csv':
        return 'csv';
      case 'excel':
        return 'xlsx';
      case 'parquet':
        return 'parquet';
      case 'json':
        return 'json';
    }
  }

  private getFilters(
    format: ExportFormat
  ): { name: string; extensions: string[] }[] {
    switch (format) {
      case 'csv':
        return [{ name: 'CSV Files', extensions: ['csv'] }];
      case 'excel':
        return [{ name: 'Excel Files', extensions: ['xlsx'] }];
      case 'parquet':
        return [{ name: 'Parquet Files', extensions: ['parquet'] }];
      case 'json':
        return [{ name: 'JSON Files', extensions: ['json'] }];
    }
  }

  private getImportFilters(
    format: 'csv' | 'parquet' | 'excel'
  ): { name: string; extensions: string[] }[] {
    switch (format) {
      case 'csv':
        return [{ name: 'CSV Files', extensions: ['csv'] }];
      case 'parquet':
        return [{ name: 'Parquet Files', extensions: ['parquet'] }];
      case 'excel':
        return [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }];
    }
  }

  clearError(): void {
    this._exportError.set(null);
  }
}
