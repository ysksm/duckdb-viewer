import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardWidget, WidgetType, WidgetConfig } from '../../models/database.model';
import { QueryService } from '../../services/query.service';
import { DatabaseService } from '../../services/database.service';

export interface WidgetDialogData {
  type: WidgetType;
  widget: DashboardWidget | null;
}

export interface WidgetDialogResult {
  title: string;
  query: string;
  config: WidgetConfig;
}

@Component({
  selector: 'app-widget-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.widget ? 'Edit' : 'Add' }} {{ getTypeLabel(data.type) }} Widget
    </h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Title</mat-label>
        <input matInput [(ngModel)]="title" placeholder="Widget title" />
      </mat-form-field>

      <!-- Table Selection -->
      @if (db.tables().length > 0) {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Select Table (optional)</mat-label>
          <mat-select [(ngModel)]="selectedTable" (selectionChange)="onTableSelect()">
            <mat-option [value]="null">-- Custom Query --</mat-option>
            @for (table of db.tables(); track table.name) {
              <mat-option [value]="table.name">{{ table.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>SQL Query</mat-label>
        <textarea
          matInput
          [(ngModel)]="query"
          placeholder="SELECT ..."
          rows="4"
        ></textarea>
      </mat-form-field>

      <div class="query-actions">
        <button
          mat-stroked-button
          (click)="executeQuery()"
          [disabled]="!query.trim() || isExecuting()"
        >
          @if (isExecuting()) {
            <mat-spinner diameter="18"></mat-spinner>
          } @else {
            <mat-icon>play_arrow</mat-icon>
          }
          Test Query
        </button>
        @if (columns().length > 0) {
          <span class="column-info">{{ columns().length }} columns found</span>
        }
        @if (queryError()) {
          <span class="error-info">{{ queryError() }}</span>
        }
      </div>

      @if (data.type === 'chart' && columns().length > 0) {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Chart Type</mat-label>
          <mat-select [(ngModel)]="config.chartType">
            <mat-option value="bar">Bar Chart</mat-option>
            <mat-option value="line">Line Chart</mat-option>
            <mat-option value="pie">Pie Chart</mat-option>
            <mat-option value="doughnut">Doughnut Chart</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Label Column</mat-label>
          <mat-select [(ngModel)]="config.labelColumn">
            @for (col of columns(); track col) {
              <mat-option [value]="col">{{ col }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Value Column</mat-label>
          <mat-select [(ngModel)]="config.valueColumn">
            @for (col of columns(); track col) {
              <mat-option [value]="col">{{ col }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      @if (data.type === 'chart' && columns().length === 0) {
        <p class="hint">Click "Test Query" to load available columns</p>
      }

      @if (data.type === 'kpi' && columns().length > 0) {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Value Column</mat-label>
          <mat-select [(ngModel)]="config.valueColumn">
            @for (col of columns(); track col) {
              <mat-option [value]="col">{{ col }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      @if (data.type === 'kpi' && columns().length === 0) {
        <p class="hint">Click "Test Query" to load available columns</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="!isValid()">
        {{ data.widget ? 'Update' : 'Add' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    mat-dialog-content {
      min-width: 450px;
    }

    .query-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;

      mat-spinner {
        display: inline-block;
      }
    }

    .column-info {
      color: #81c784;
      font-size: 13px;
    }

    .error-info {
      color: #f44336;
      font-size: 13px;
    }

    .hint {
      color: #999;
      font-size: 13px;
      margin: 0 0 16px 0;
    }
  `],
})
export class WidgetDialogComponent {
  dialogRef = inject(MatDialogRef<WidgetDialogComponent>);
  data: WidgetDialogData = inject(MAT_DIALOG_DATA);
  queryService = inject(QueryService);
  db = inject(DatabaseService);

  title = this.data.widget?.title || '';
  query = this.data.widget?.query || '';
  config: WidgetConfig = this.data.widget?.config || {
    chartType: 'bar',
  };

  selectedTable: string | null = null;
  columns = signal<string[]>([]);
  isExecuting = signal(false);
  queryError = signal<string | null>(null);

  constructor() {
    // If editing an existing widget, try to load columns
    if (this.data.widget?.query) {
      this.executeQuery();
    }
  }

  getTypeLabel(type: WidgetType): string {
    switch (type) {
      case 'chart':
        return 'Chart';
      case 'table':
        return 'Table';
      case 'kpi':
        return 'KPI';
    }
  }

  onTableSelect(): void {
    if (this.selectedTable) {
      this.query = `SELECT * FROM "${this.selectedTable}" LIMIT 100`;
      this.executeQuery();
    }
  }

  async executeQuery(): Promise<void> {
    if (!this.query.trim()) return;

    this.isExecuting.set(true);
    this.queryError.set(null);

    try {
      const result = await this.queryService.executeQuery(this.query);
      this.columns.set(result.columns);

      // Auto-select first columns if not set
      if (!this.config.labelColumn && result.columns.length > 0) {
        this.config.labelColumn = result.columns[0];
      }
      if (!this.config.valueColumn && result.columns.length > 1) {
        this.config.valueColumn = result.columns[1];
      } else if (!this.config.valueColumn && result.columns.length > 0) {
        this.config.valueColumn = result.columns[0];
      }
    } catch (e) {
      this.queryError.set(e instanceof Error ? e.message : String(e));
      this.columns.set([]);
    } finally {
      this.isExecuting.set(false);
    }
  }

  isValid(): boolean {
    return this.title.trim().length > 0 && this.query.trim().length > 0;
  }

  save(): void {
    if (!this.isValid()) return;

    const result: WidgetDialogResult = {
      title: this.title.trim(),
      query: this.query.trim(),
      config: this.config,
    };

    this.dialogRef.close(result);
  }
}
