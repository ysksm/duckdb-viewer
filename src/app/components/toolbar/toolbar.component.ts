import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { DatabaseService } from '../../services/database.service';
import { TauriService } from '../../services/tauri.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  template: `
    <mat-toolbar color="primary">
      <span class="app-title">DuckDB Viewer</span>

      <button mat-button [matMenuTriggerFor]="fileMenu">
        <mat-icon>folder</mat-icon>
        File
      </button>
      <mat-menu #fileMenu="matMenu">
        <button mat-menu-item (click)="onOpenDatabase()">
          <mat-icon>folder_open</mat-icon>
          <span>Open Database...</span>
        </button>
        <button mat-menu-item (click)="onCreateDatabase()">
          <mat-icon>add</mat-icon>
          <span>New Database...</span>
        </button>
        @if (db.recentDatabases().length > 0) {
          <mat-divider></mat-divider>
          <button mat-menu-item [matMenuTriggerFor]="recentMenu">
            <mat-icon>history</mat-icon>
            <span>Recent</span>
          </button>
        }
        @if (db.isConnected()) {
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="onCloseDatabase()">
            <mat-icon>close</mat-icon>
            <span>Close Database</span>
          </button>
        }
      </mat-menu>
      <mat-menu #recentMenu="matMenu">
        @for (path of db.recentDatabases(); track path) {
          <button mat-menu-item (click)="onOpenRecent(path)">
            {{ getFileName(path) }}
          </button>
        }
      </mat-menu>

      <button mat-button [matMenuTriggerFor]="viewMenu">
        <mat-icon>visibility</mat-icon>
        View
      </button>
      <mat-menu #viewMenu="matMenu">
        <button mat-menu-item (click)="viewChange.emit('query')">
          <mat-icon>code</mat-icon>
          <span>Query Editor</span>
        </button>
        <button mat-menu-item (click)="viewChange.emit('dashboard')">
          <mat-icon>dashboard</mat-icon>
          <span>Dashboard</span>
        </button>
      </mat-menu>

      <button mat-button [matMenuTriggerFor]="toolsMenu" [disabled]="!db.isConnected()">
        <mat-icon>build</mat-icon>
        Tools
      </button>
      <mat-menu #toolsMenu="matMenu">
        <button mat-menu-item [matMenuTriggerFor]="sampleDataMenu">
          <mat-icon>dataset</mat-icon>
          <span>Create Sample Data</span>
        </button>
      </mat-menu>
      <mat-menu #sampleDataMenu="matMenu">
        <button mat-menu-item (click)="createSampleUsers()">
          <mat-icon>people</mat-icon>
          <span>Users Table (100 rows)</span>
        </button>
        <button mat-menu-item (click)="createSampleOrders()">
          <mat-icon>shopping_cart</mat-icon>
          <span>Orders Table (500 rows)</span>
        </button>
        <button mat-menu-item (click)="createSampleProducts()">
          <mat-icon>inventory</mat-icon>
          <span>Products Table (50 rows)</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="createAllSampleData()">
          <mat-icon>auto_awesome</mat-icon>
          <span>Create All Sample Tables</span>
        </button>
      </mat-menu>

      <span class="spacer"></span>

      @if (db.isConnected()) {
        <span class="db-info">
          <mat-icon>storage</mat-icon>
          {{ db.databaseName() }}
        </span>
      }
    </mat-toolbar>
  `,
  styles: [`
    .app-title {
      font-weight: 500;
      margin-right: 16px;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .db-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      opacity: 0.9;
    }

    mat-icon {
      font-size: 20px;
      height: 20px;
      width: 20px;
    }
  `],
})
export class ToolbarComponent {
  db = inject(DatabaseService);
  tauri = inject(TauriService);
  viewChange = output<'query' | 'dashboard'>();

  async onOpenDatabase(): Promise<void> {
    await this.db.openDatabase();
  }

  async onCreateDatabase(): Promise<void> {
    await this.db.createDatabase();
  }

  async onCloseDatabase(): Promise<void> {
    await this.db.closeDatabase();
  }

  async onOpenRecent(path: string): Promise<void> {
    await this.db.openDatabase(path);
  }

  getFileName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  }

  async createSampleUsers(): Promise<void> {
    await this.createSampleAndRefresh('users');
  }

  async createSampleOrders(): Promise<void> {
    await this.createSampleAndRefresh('orders');
  }

  async createSampleProducts(): Promise<void> {
    await this.createSampleAndRefresh('products');
  }

  async createAllSampleData(): Promise<void> {
    await this.createSampleAndRefresh('all');
  }

  private async createSampleAndRefresh(sampleType: string): Promise<void> {
    try {
      await this.tauri.createSampleData(sampleType);
      await this.db.refreshTables();
    } catch (e) {
      console.error('Failed to create sample data:', e);
    }
  }
}
