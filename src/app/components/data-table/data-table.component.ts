import { Component, inject, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { QueryService } from '../../services/query.service';
import { ExportService } from '../../services/export.service';
import { QueryResult, ExportFormat } from '../../models/database.model';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ScrollingModule,
  ],
  template: `
    <div class="table-container">
      @if (queryService.isExecuting()) {
        <div class="loading-overlay">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Executing query...</p>
        </div>
      }

      @if (queryService.currentError()) {
        <div class="error-container">
          <mat-icon>error</mat-icon>
          <div class="error-content">
            <h4>Query Error</h4>
            <p>{{ queryService.currentError() }}</p>
          </div>
        </div>
      } @else if (result()) {
        <div class="result-header">
          <div class="result-info">
            <span class="row-count">{{ result()!.row_count }} rows</span>
            <span class="execution-time">{{ result()!.execution_time_ms }}ms</span>
          </div>
          <div class="result-actions">
            <button mat-button [matMenuTriggerFor]="exportMenu">
              <mat-icon>download</mat-icon>
              Export
            </button>
            <mat-menu #exportMenu="matMenu">
              <button mat-menu-item (click)="onExport('csv')">
                <mat-icon>description</mat-icon>
                <span>CSV</span>
              </button>
              <button mat-menu-item (click)="onExport('excel')">
                <mat-icon>grid_on</mat-icon>
                <span>Excel</span>
              </button>
              <button mat-menu-item (click)="onExport('json')">
                <mat-icon>data_object</mat-icon>
                <span>JSON</span>
              </button>
              <button mat-menu-item (click)="onExport('parquet')">
                <mat-icon>storage</mat-icon>
                <span>Parquet</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <div class="table-wrapper">
          <table mat-table [dataSource]="displayedRows()" matSort (matSortChange)="onSort($event)">
            @for (column of result()!.columns; track column; let i = $index) {
              <ng-container [matColumnDef]="column">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>
                  <div class="header-content">
                    <span class="column-name">{{ column }}</span>
                    <span class="column-type">{{ result()!.column_types[i] }}</span>
                  </div>
                </th>
                <td mat-cell *matCellDef="let row">
                  {{ formatValue(row[column]) }}
                </td>
              </ng-container>
            }

            <tr mat-header-row *matHeaderRowDef="result()!.columns; sticky: true"></tr>
            <tr mat-row *matRowDef="let row; columns: result()!.columns"></tr>
          </table>
        </div>

        <mat-paginator
          [length]="result()!.row_count"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[25, 50, 100, 500]"
          (page)="onPageChange($event)"
          showFirstLastButtons
        ></mat-paginator>
      } @else {
        <div class="empty-state">
          <mat-icon>search</mat-icon>
          <p>Execute a query to see results</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .table-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #252526;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      z-index: 10;
      color: #fff;

      p {
        margin-top: 16px;
      }
    }

    .error-container {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      margin: 16px;
      background: #5a1d1d;
      border: 1px solid #f44336;
      border-radius: 4px;
      color: #ffcdd2;

      mat-icon {
        color: #f44336;
      }

      h4 {
        margin: 0 0 8px 0;
        color: #f44336;
      }

      p {
        margin: 0;
        font-family: monospace;
        white-space: pre-wrap;
      }
    }

    .result-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: #333;
      border-bottom: 1px solid #3c3c3c;
    }

    .result-info {
      display: flex;
      gap: 16px;
      font-size: 13px;
    }

    .row-count {
      color: #4fc3f7;
    }

    .execution-time {
      color: #81c784;
    }

    .table-wrapper {
      flex: 1;
      overflow: auto;
    }

    table {
      width: 100%;
      min-width: max-content;
    }

    .header-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .column-name {
      font-weight: 500;
    }

    .column-type {
      font-size: 10px;
      opacity: 0.6;
      text-transform: uppercase;
    }

    th.mat-header-cell {
      background: #333;
      color: #fff;
      border-bottom: 1px solid #3c3c3c;
    }

    td.mat-cell {
      color: #d4d4d4;
      border-bottom: 1px solid #3c3c3c;
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    tr.mat-row:hover {
      background: #2a2d2e;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #6a6a6a;

      mat-icon {
        font-size: 64px;
        height: 64px;
        width: 64px;
        margin-bottom: 16px;
      }
    }

    mat-paginator {
      background: #333;
      color: #d4d4d4;
      border-top: 1px solid #3c3c3c;
    }
  `],
})
export class DataTableComponent {
  queryService = inject(QueryService);
  exportService = inject(ExportService);

  currentQuery = input<string>('');

  pageSize = signal(100);
  pageIndex = signal(0);
  sortColumn = signal<string | null>(null);
  sortDirection = signal<'asc' | 'desc' | ''>('');

  result = computed(() => this.queryService.currentResult());

  displayedRows = computed(() => {
    const res = this.result();
    if (!res) return [];

    // Transform array rows to object rows with column names as keys
    let rows = res.rows.map(row => {
      const obj: Record<string, unknown> = {};
      res.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    // Apply sorting
    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();
    if (sortCol && sortDir) {
      rows.sort((a, b) => {
        const aVal = a[sortCol];
        const bVal = b[sortCol];

        if (aVal === null || aVal === undefined) return sortDir === 'asc' ? 1 : -1;
        if (bVal === null || bVal === undefined) return sortDir === 'asc' ? -1 : 1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal);
        const bStr = String(bVal);
        return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    // Apply pagination
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    return rows.slice(start, end);
  });

  onSort(sort: Sort): void {
    this.sortColumn.set(sort.active);
    this.sortDirection.set(sort.direction);
    this.pageIndex.set(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
  }

  formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  async onExport(format: ExportFormat): Promise<void> {
    const query = this.currentQuery();
    if (!query) return;

    try {
      await this.exportService.exportData(format, query);
    } catch (e) {
      console.error('Export failed:', e);
    }
  }
}
