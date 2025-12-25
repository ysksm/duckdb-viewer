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
import { Gridster, GridsterItem, GridsterConfig, GridsterItemConfig } from 'angular-gridster2';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { DashboardService } from '../../services/dashboard.service';
import { QueryService } from '../../services/query.service';
import { Dashboard, DashboardWidget, WidgetType } from '../../models/database.model';
import { WidgetDialogComponent } from './widget-dialog.component';

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
    Gridster,
    GridsterItem,
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
        <gridster [options]="options">
          @for (widget of dashboardService.currentDashboard()!.widgets; track widget.id) {
            <gridster-item [item]="toGridsterItem(widget)">
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
                        @if (widgetData()[widget.id]?.rows) {
                          <table>
                            <thead>
                              <tr>
                                @for (col of widgetData()[widget.id].columns; track col) {
                                  <th>{{ col }}</th>
                                }
                              </tr>
                            </thead>
                            <tbody>
                              @for (row of widgetData()[widget.id].rows.slice(0, 10); track $index) {
                                <tr>
                                  @for (cell of row; track $index) {
                                    <td>{{ cell }}</td>
                                  }
                                </tr>
                              }
                            </tbody>
                          </table>
                        }
                      </div>
                    }
                  }
                </mat-card-content>
              </mat-card>
            </gridster-item>
          }
        </gridster>
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
    .dashboard-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #1e1e1e;
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

    gridster {
      flex: 1;
      background: #1e1e1e;
    }

    .widget-card {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #252526;
      color: #d4d4d4;

      mat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        background: #333;
      }

      mat-card-content {
        flex: 1;
        padding: 16px;
        overflow: auto;
      }
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

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        padding: 8px 12px;
        text-align: left;
        border-bottom: 1px solid #3c3c3c;
      }

      th {
        background: #333;
        font-weight: 500;
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

  options: GridsterConfig = {
    gridType: 'fit',
    displayGrid: 'onDrag&Resize',
    pushItems: true,
    draggable: { enabled: true },
    resizable: { enabled: true },
    minCols: 4,
    maxCols: 12,
    minRows: 4,
    maxRows: 100,
    itemChangeCallback: (item: GridsterItemConfig) => this.onItemChange(item),
  };

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

  async createDashboard(): Promise<void> {
    const name = prompt('Enter dashboard name:');
    if (name) {
      const dashboard = await this.dashboardService.createDashboard(name);
      this.dashboardService.selectDashboard(dashboard.id);
    }
  }

  async renameDashboard(): Promise<void> {
    const current = this.dashboardService.currentDashboard();
    if (!current) return;

    const name = prompt('Enter new name:', current.name);
    if (name && name !== current.name) {
      current.name = name;
      await this.dashboardService.updateDashboard(current);
    }
  }

  async deleteDashboard(): Promise<void> {
    const current = this.dashboardService.currentDashboard();
    if (!current) return;

    if (confirm(`Delete dashboard "${current.name}"?`)) {
      await this.dashboardService.deleteDashboard(current.id);
    }
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

  async removeWidget(widgetId: string): Promise<void> {
    const current = this.dashboardService.currentDashboard();
    if (!current) return;

    if (confirm('Remove this widget?')) {
      await this.dashboardService.removeWidget(current.id, widgetId);
    }
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

  toGridsterItem(widget: DashboardWidget): GridsterItemConfig {
    return {
      x: widget.x,
      y: widget.y,
      cols: widget.cols,
      rows: widget.rows,
    };
  }

  async onItemChange(item: GridsterItemConfig): Promise<void> {
    const current = this.dashboardService.currentDashboard();
    if (!current) return;

    // Find the widget by position
    const widget = current.widgets.find((w) =>
      w.x === item.x && w.y === item.y
    );
    if (widget) {
      widget.cols = item.cols ?? widget.cols;
      widget.rows = item.rows ?? widget.rows;
      await this.dashboardService.updateWidget(current.id, widget);
    }
  }
}
