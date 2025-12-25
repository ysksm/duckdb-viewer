import { Injectable, signal } from '@angular/core';
import { TauriService } from './tauri.service';
import { Dashboard, DashboardWidget, WidgetType, WidgetConfig } from '../models/database.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private _dashboards = signal<Dashboard[]>([]);
  private _currentDashboard = signal<Dashboard | null>(null);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  readonly dashboards = this._dashboards.asReadonly();
  readonly currentDashboard = this._currentDashboard.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor(private tauri: TauriService) {
    this.loadDashboards();
  }

  async loadDashboards(): Promise<void> {
    this._isLoading.set(true);
    try {
      const dashboards = await this.tauri.loadDashboards();
      this._dashboards.set(dashboards);
    } catch (e) {
      this._error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this._isLoading.set(false);
    }
  }

  async createDashboard(name: string): Promise<Dashboard> {
    const dashboard: Dashboard = {
      id: crypto.randomUUID(),
      name,
      widgets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const dashboards = [...this._dashboards(), dashboard];
    this._dashboards.set(dashboards);
    await this.tauri.saveDashboards(dashboards);

    return dashboard;
  }

  async updateDashboard(dashboard: Dashboard): Promise<void> {
    dashboard.updatedAt = new Date().toISOString();

    const dashboards = this._dashboards().map((d) =>
      d.id === dashboard.id ? dashboard : d
    );
    this._dashboards.set(dashboards);
    await this.tauri.saveDashboards(dashboards);

    if (this._currentDashboard()?.id === dashboard.id) {
      this._currentDashboard.set(dashboard);
    }
  }

  async deleteDashboard(id: string): Promise<void> {
    const dashboards = this._dashboards().filter((d) => d.id !== id);
    this._dashboards.set(dashboards);
    await this.tauri.saveDashboards(dashboards);

    if (this._currentDashboard()?.id === id) {
      this._currentDashboard.set(null);
    }
  }

  selectDashboard(id: string): void {
    const dashboard = this._dashboards().find((d) => d.id === id);
    this._currentDashboard.set(dashboard || null);
  }

  async addWidget(
    dashboardId: string,
    type: WidgetType,
    title: string,
    query: string,
    config: WidgetConfig = {}
  ): Promise<DashboardWidget> {
    const widget: DashboardWidget = {
      id: crypto.randomUUID(),
      type,
      title,
      query,
      x: 0,
      y: 0,
      cols: type === 'kpi' ? 1 : 2,
      rows: type === 'kpi' ? 1 : 2,
      config,
    };

    const dashboard = this._dashboards().find((d) => d.id === dashboardId);
    if (dashboard) {
      dashboard.widgets.push(widget);
      await this.updateDashboard(dashboard);
    }

    return widget;
  }

  async updateWidget(
    dashboardId: string,
    widget: DashboardWidget
  ): Promise<void> {
    const dashboard = this._dashboards().find((d) => d.id === dashboardId);
    if (dashboard) {
      dashboard.widgets = dashboard.widgets.map((w) =>
        w.id === widget.id ? widget : w
      );
      await this.updateDashboard(dashboard);
    }
  }

  async removeWidget(dashboardId: string, widgetId: string): Promise<void> {
    const dashboard = this._dashboards().find((d) => d.id === dashboardId);
    if (dashboard) {
      dashboard.widgets = dashboard.widgets.filter((w) => w.id !== widgetId);
      await this.updateDashboard(dashboard);
    }
  }

  async updateWidgetPositions(
    dashboardId: string,
    widgets: DashboardWidget[]
  ): Promise<void> {
    const dashboard = this._dashboards().find((d) => d.id === dashboardId);
    if (dashboard) {
      dashboard.widgets = widgets;
      await this.updateDashboard(dashboard);
    }
  }

  clearError(): void {
    this._error.set(null);
  }
}
