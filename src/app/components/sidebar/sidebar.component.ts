import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatabaseService } from '../../services/database.service';
import { TableInfo } from '../../models/database.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>Tables</h3>
        @if (db.isConnected()) {
          <button mat-icon-button (click)="onRefresh()" matTooltip="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
        }
      </div>

      @if (!db.isConnected()) {
        <div class="empty-state">
          <mat-icon>storage</mat-icon>
          <p>No database connected</p>
          <button mat-stroked-button (click)="onOpenDatabase()">
            Open Database
          </button>
        </div>
      } @else if (db.isLoading()) {
        <div class="loading">
          <mat-spinner diameter="32"></mat-spinner>
        </div>
      } @else if (db.tables().length === 0) {
        <div class="empty-state">
          <mat-icon>table_chart</mat-icon>
          <p>No tables found</p>
        </div>
      } @else {
        <mat-nav-list>
          @for (table of db.tables(); track table.name) {
            <a
              mat-list-item
              [class.selected]="db.selectedTable() === table.name"
              (click)="onSelectTable(table)"
            >
              <mat-icon matListItemIcon>table_chart</mat-icon>
              <span matListItemTitle>{{ table.name }}</span>
              <span matListItemMeta class="row-count">
                {{ formatRowCount(table.row_count) }}
              </span>
            </a>
          }
        </mat-nav-list>
      }
    </div>
  `,
  styles: [`
    .sidebar {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--mat-sidenav-container-background-color);
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-bottom: 1px solid var(--mat-divider-color);

      h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        opacity: 0.7;
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
      text-align: center;
      opacity: 0.7;

      mat-icon {
        font-size: 48px;
        height: 48px;
        width: 48px;
        margin-bottom: 16px;
      }

      p {
        margin: 0 0 16px 0;
      }
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }

    .selected {
      background: var(--mat-list-active-indicator-color);
    }

    .row-count {
      font-size: 12px;
      opacity: 0.6;
    }

    mat-nav-list {
      flex: 1;
      overflow-y: auto;
    }
  `],
})
export class SidebarComponent {
  db = inject(DatabaseService);
  tableSelect = output<TableInfo>();

  async onOpenDatabase(): Promise<void> {
    await this.db.openDatabase();
  }

  async onRefresh(): Promise<void> {
    await this.db.refreshTables();
  }

  async onSelectTable(table: TableInfo): Promise<void> {
    await this.db.selectTable(table.name);
    this.tableSelect.emit(table);
  }

  formatRowCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }
}
