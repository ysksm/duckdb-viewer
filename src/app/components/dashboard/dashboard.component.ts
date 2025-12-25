import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { DashboardService } from '../../services/dashboard.service';
import { QueryService } from '../../services/query.service';
import { Dashboard, DashboardWidget, WidgetType } from '../../models/database.model';
import { WidgetDialogComponent } from './widget-dialog.component';
import { InputDialogComponent } from './input-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCardModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    MatMenuModule,
    MatTabsModule,
    BaseChartDirective,
  ],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <div class="dashboard-tabs">
          @for (dashboard of dashboardService.dashboards(); track dashboard.id) {
            <button
              mat-button
              [class.active]="dashboardService.currentDashboard()?.id === dashboard.id"
              (click)="selectDashboard(dashboard.id)"
            >
              {{ dashboard.name }}
            </button>
          }
          <button mat-icon-button (click)="createDashboard()">
            <mat-icon>add</mat-icon>
          </button>
        </div>

        @if (dashboardService.currentDashboard()) {
          <div class="dashboard-actions">
            <button mat-button [matMenuTriggerFor]="addWidgetMenu">
              <mat-icon>add_chart</mat-icon>
              Add Widget
            </button>
            <mat-menu #addWidgetMenu="matMenu">
              <button mat-menu-item (click)="addWidget('chart')">
                <mat-icon>bar_chart</mat-icon>
                <span>Chart</span>
              </button>
              <button mat-menu-item (click)="addWidget('table')">
                <mat-icon>table_chart</mat-icon>
                <span>Table</span>
              </button>
              <button mat-menu-item (click)="addWidget('kpi')">
                <mat-icon>speed</mat-icon>
                <span>KPI</span>
              </button>
            </mat-menu>
            <button mat-icon-button [matMenuTriggerFor]="dashboardMenu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #dashboardMenu="matMenu">
              <button mat-menu-item (click)="renameDashboard()">
                <mat-icon>edit</mat-icon>
                <span>Rename</span>
              </button>
              <button mat-menu-item (click)="deleteDashboard()">
                <mat-icon>delete</mat-icon>
                <span>Delete</span>
              </button>
            </mat-menu>
          </div>
        }
      </div>

      @if (dashboardService.currentDashboard()) {
        <div class="widget-grid">
          @for (widget of dashboardService.currentDashboard()!.widgets; track widget.id) {
            <div class="grid-widget">
              <mat-card class="widget-card">
                <mat-card-header>
                  <mat-card-title>{{ widget.title }}</mat-card-title>
                  <button mat-icon-button [matMenuTriggerFor]="widgetMenu">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #widgetMenu="matMenu">
                    <button mat-menu-item (click)="editWidget(widget)">
                      <mat-icon>edit</mat-icon>
                      <span>Edit</span>
                    </button>
                    <button mat-menu-item (click)="refreshWidget(widget)">
                      <mat-icon>refresh</mat-icon>
                      <span>Refresh</span>
                    </button>
                    <button mat-menu-item (click)="removeWidget(widget.id)">
                      <mat-icon>delete</mat-icon>
                      <span>Remove</span>
                    </button>
                  </mat-menu>
                </mat-card-header>
                <mat-card-content>
                  @switch (widget.type) {
                    @case ('chart') {
                      <div class="chart-container">
                        @if (widgetData()[widget.id]) {
                          <canvas
                            baseChart
                            [type]="widget.config.chartType || 'bar'"
                            [data]="widgetData()[widget.id].chartData"
                            [options]="chartOptions"
                          ></canvas>
                        }
                      </div>
                    }
                    @case ('kpi') {
                      <div class="kpi-container">
                        <div class="kpi-value">
                          {{ widgetData()[widget.id]?.value || '-' }}
                        </div>
                        <div class="kpi-label">
                          {{ widget.config.valueColumn || 'Value' }}
                        </div>
                      </div>
                    }
                    @case ('table') {
                      <div class="table-widget">
                        @if (getWidgetData(widget.id)?.rows?.length) {
                          <table>
                            <thead>
                              <tr>
                                @for (col of getWidgetData(widget.id).columns; track col) {
                                  <th>{{ col }}</th>
                                }
                              </tr>
                            </thead>
                            <tbody>
                              @for (row of getWidgetData(widget.id).rows.slice(0, 10); track $index) {
                                <tr>
                                  @for (cell of row; track $index) {
                                    <td>{{ formatCell(cell) }}</td>
                                  }
                                </tr>
                              }
                            </tbody>
                          </table>
                        } @else {
                          <div class="no-data">No data available</div>
                        }
                      </div>
                    }
                  }
                </mat-card-content>
              </mat-card>
            </div>
          }
        </div>
      } @else {
        <div class="empty-state">
          <mat-icon>dashboard</mat-icon>
          <p>No dashboard selected</p>
          <button mat-raised-button color="primary" (click)="createDashboard()">
            Create Dashboard
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }

    .dashboard-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      background: #1e1e1e;
      overflow: hidden;
    }

    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
    }

    .dashboard-tabs {
      display: flex;
      align-items: center;
      gap: 4px;

      button.active {
        background: #0e639c;
        color: #fff;
      }
    }

    .dashboard-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .widget-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 16px;
      padding: 16px;
      overflow: auto;
      background: #1e1e1e;
    }

    .grid-widget {
      min-height: 300px;
      background: #252526;
      border-radius: 4px;
      overflow: hidden;
    }

    .widget-card {
      height: 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      background: #252526;
      color: #d4d4d4;
      margin: 0;
      border-radius: 0;
      box-shadow: none;
    }

    ::ng-deep .widget-card .mat-mdc-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #333;
      flex-shrink: 0;
    }

    ::ng-deep .widget-card .mat-mdc-card-content {
      flex: 1;
      padding: 16px;
      overflow: auto;
      min-height: 0;
    }

    .chart-container {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .kpi-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .kpi-value {
      font-size: 48px;
      font-weight: 700;
      color: #4fc3f7;
    }

    .kpi-label {
      font-size: 14px;
      color: #999;
      margin-top: 8px;
    }

    .table-widget {
      overflow: auto;
      height: 100%;

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #3c3c3c;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      th {
        background: #333;
        font-weight: 500;
      }

      .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #666;
      }
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

      p {
        margin-bottom: 16px;
      }
    }
  `],
})
export class DashboardComponent {
  dashboardService = inject(DashboardService);
  queryService = inject(QueryService);
  dialog = inject(MatDialog);

  widgetData = signal<Record<string, any>>({});

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' },
    },
  };

  selectDashboard(id: string): void {
    this.dashboardService.selectDashboard(id);
    this.refreshAllWidgets();
  }

  createDashboard(): void {
    const dialogRef = this.dialog.open(InputDialogComponent, {
      width: '400px',
      data: {
        title: 'Create Dashboard',
        label: 'Dashboard Name',
        placeholder: 'Enter dashboard name',
      },
    });

    dialogRef.afterClosed().subscribe(async (name: string | null) => {
      if (name) {
        const dashboard = await this.dashboardService.createDashboard(name);
        this.dashboardService.selectDashboard(dashboard.id);
      }
    });
  }

  renameDashboard(): void {
    const current = this.dashboardService.currentDashboard();
    if (!current) return;

    const dialogRef = this.dialog.open(InputDialogComponent, {
      width: '400px',
      data: {
        title: 'Rename Dashboard',
        label: 'Dashboard Name',
        value: current.name,
      },
    });

    dialogRef.afterClosed().subscribe(async (name: string | null) => {
      if (name && name !== current.name) {
        current.name = name;
        await this.dashboardService.updateDashboard(current);
      }
    });
  }

  deleteDashboard(): void {
    const current = this.dashboardService.currentDashboard();
    if (!current) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Dashboard',
        message: `Are you sure you want to delete "${current.name}"?`,
        confirmText: 'Delete',
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        await this.dashboardService.deleteDashboard(current.id);
      }
    });
  }

  async addWidget(type: WidgetType): Promise<void> {
    const current = this.dashboardService.currentDashboard();
    if (!current) return;

    const dialogRef = this.dialog.open(WidgetDialogComponent, {
      width: '500px',
      data: { type, widget: null },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        const widget = await this.dashboardService.addWidget(
          current.id,
          type,
          result.title,
          result.query,
          result.config
        );
        await this.refreshWidget(widget);
      }
    });
  }

  async editWidget(widget: DashboardWidget): Promise<void> {
    const current = this.dashboardService.currentDashboard();
    if (!current) return;

    const dialogRef = this.dialog.open(WidgetDialogComponent, {
      width: '500px',
      data: { type: widget.type, widget },
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        widget.title = result.title;
        widget.query = result.query;
        widget.config = result.config;
        await this.dashboardService.updateWidget(current.id, widget);
        await this.refreshWidget(widget);
      }
    });
  }

  removeWidget(widgetId: string): void {
    const current = this.dashboardService.currentDashboard();
    if (!current) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Remove Widget',
        message: 'Are you sure you want to remove this widget?',
        confirmText: 'Remove',
      },
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        await this.dashboardService.removeWidget(current.id, widgetId);
      }
    });
  }

  async refreshWidget(widget: DashboardWidget): Promise<void> {
    try {
      const result = await this.queryService.executeQuery(widget.query);

      const data: any = {
        columns: result.columns,
        rows: result.rows,
      };

      if (widget.type === 'chart') {
        const labelCol = widget.config.labelColumn || result.columns[0];
        const valueCol = widget.config.valueColumn || result.columns[1];
        const labelIndex = result.columns.indexOf(labelCol);
        const valueIndex = result.columns.indexOf(valueCol);

        data.chartData = {
          labels: result.rows.map((row) => String(row[labelIndex] || '')),
          datasets: [
            {
              label: valueCol,
              data: result.rows.map((row) => Number(row[valueIndex]) || 0),
              backgroundColor: [
                '#4fc3f7', '#81c784', '#ffb74d', '#f06292',
                '#ba68c8', '#4db6ac', '#ff8a65', '#a1887f',
              ],
            },
          ],
        };
      } else if (widget.type === 'kpi') {
        const valueCol = widget.config.valueColumn || result.columns[0];
        const valueIndex = result.columns.indexOf(valueCol);
        data.value = result.rows[0]?.[valueIndex] ?? '-';
      }

      this.widgetData.update((current) => ({
        ...current,
        [widget.id]: data,
      }));
    } catch (e) {
      console.error('Failed to refresh widget:', e);
    }
  }

  async refreshAllWidgets(): Promise<void> {
    const current = this.dashboardService.currentDashboard();
    if (!current) return;

    for (const widget of current.widgets) {
      await this.refreshWidget(widget);
    }
  }

  getWidgetData(widgetId: string): any {
    return this.widgetData()[widgetId];
  }

  formatCell(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

}
