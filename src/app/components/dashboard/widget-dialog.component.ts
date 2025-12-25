import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DashboardWidget, WidgetType, WidgetConfig } from '../../models/database.model';

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

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>SQL Query</mat-label>
        <textarea
          matInput
          [(ngModel)]="query"
          placeholder="SELECT ..."
          rows="5"
        ></textarea>
      </mat-form-field>

      @if (data.type === 'chart') {
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
          <input matInput [(ngModel)]="config.labelColumn" placeholder="Column name for labels" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Value Column</mat-label>
          <input matInput [(ngModel)]="config.valueColumn" placeholder="Column name for values" />
        </mat-form-field>
      }

      @if (data.type === 'kpi') {
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Value Column</mat-label>
          <input matInput [(ngModel)]="config.valueColumn" placeholder="Column name for KPI value" />
        </mat-form-field>
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
      min-width: 400px;
    }
  `],
})
export class WidgetDialogComponent {
  dialogRef = inject(MatDialogRef<WidgetDialogComponent>);
  data: WidgetDialogData = inject(MAT_DIALOG_DATA);

  title = this.data.widget?.title || '';
  query = this.data.widget?.query || '';
  config: WidgetConfig = this.data.widget?.config || {
    chartType: 'bar',
  };

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
