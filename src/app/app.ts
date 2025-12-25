import { Component, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { SqlEditorComponent } from './components/sql-editor/sql-editor.component';
import { DataTableComponent } from './components/data-table/data-table.component';
import { SchemaViewerComponent } from './components/schema-viewer/schema-viewer.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TableInfo } from './models/database.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatTabsModule,
    ToolbarComponent,
    SidebarComponent,
    SqlEditorComponent,
    DataTableComponent,
    SchemaViewerComponent,
    DashboardComponent,
  ],
  template: `
    <div class="app-container">
      <app-toolbar (viewChange)="currentView.set($event)" />

      <mat-sidenav-container class="main-container">
        <mat-sidenav mode="side" opened class="sidebar">
          <app-sidebar (tableSelect)="onTableSelect($event)" />
        </mat-sidenav>

        <mat-sidenav-content class="content">
          @if (currentView() === 'query') {
            <div class="query-view">
              <div class="editor-panel">
                <app-sql-editor #sqlEditor />
              </div>
              <div class="resizer" (mousedown)="startResize($event)"></div>
              <div class="results-panel" [style.height.px]="resultsPanelHeight()">
                <mat-tab-group class="results-tabs">
                  <mat-tab label="Data">
                    <div class="tab-content">
                      <app-data-table [currentQuery]="currentQuery()" />
                    </div>
                  </mat-tab>
                  <mat-tab label="Schema">
                    <div class="tab-content">
                      <app-schema-viewer />
                    </div>
                  </mat-tab>
                </mat-tab-group>
              </div>
            </div>
          } @else {
            <app-dashboard />
          }
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: #1e1e1e;
    }

    .main-container {
      flex: 1;
      overflow: hidden;
    }

    .sidebar {
      width: 250px;
      background: #252526;
      border-right: 1px solid #3c3c3c;
    }

    .content {
      background: #1e1e1e;
      display: flex;
      flex-direction: column;
    }

    .query-view {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .editor-panel {
      flex: 1;
      min-height: 100px;
      display: flex;
      flex-direction: column;
    }

    .resizer {
      height: 4px;
      background: #3c3c3c;
      cursor: row-resize;

      &:hover {
        background: #0e639c;
      }
    }

    .results-panel {
      min-height: 200px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .results-tabs {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .tab-content {
      height: 100%;
      overflow: auto;
    }

    ::ng-deep .results-tabs .mat-mdc-tab-body-wrapper {
      flex: 1;
      overflow: hidden;
    }

    ::ng-deep .results-tabs .mat-mdc-tab-body {
      overflow: hidden !important;
    }

    ::ng-deep .results-tabs .mat-mdc-tab-body-content {
      height: 100%;
      overflow: hidden;
    }

    app-data-table, app-schema-viewer {
      display: block;
      height: 100%;
      overflow: auto;
    }

    app-dashboard {
      display: block;
      height: 100%;
      width: 100%;
    }
  `],
})
export class App {
  currentView = signal<'query' | 'dashboard'>('query');
  currentQuery = signal('');
  showSchema = signal(false);
  resultsPanelHeight = signal(400);

  sqlEditor = viewChild<SqlEditorComponent>('sqlEditor');

  private isResizing = false;
  private startY = 0;
  private startHeight = 0;

  async onTableSelect(table: TableInfo): Promise<void> {
    // Show both schema and data when selecting a table
    this.showSchema.set(true);
    const query = `SELECT * FROM "${table.name}" LIMIT 100`;
    this.currentQuery.set(query);

    const editor = this.sqlEditor();
    if (editor) {
      editor.setQuery(query);
      // Auto-execute the query when a table is selected
      await editor.executeQuery();
    }
  }

  startResize(event: MouseEvent): void {
    this.isResizing = true;
    this.startY = event.clientY;
    this.startHeight = this.resultsPanelHeight();

    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    event.preventDefault();
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isResizing) return;

    const delta = this.startY - event.clientY;
    const newHeight = Math.max(200, Math.min(800, this.startHeight + delta));
    this.resultsPanelHeight.set(newHeight);
  };

  private onMouseUp = (): void => {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  };
}
