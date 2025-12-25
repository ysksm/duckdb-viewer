import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-schema-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatChipsModule,
  ],
  template: `
    @if (db.selectedTableSchema()) {
      <div class="schema-container">
        <div class="schema-header">
          <mat-icon>table_chart</mat-icon>
          <h3>{{ db.selectedTableSchema()!.table_name }}</h3>
        </div>

        <table mat-table [dataSource]="db.selectedTableSchema()!.columns" class="schema-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Column</th>
            <td mat-cell *matCellDef="let column">
              <div class="column-name">
                @if (column.is_primary_key) {
                  <mat-icon class="pk-icon">key</mat-icon>
                }
                {{ column.name }}
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="type">
            <th mat-header-cell *matHeaderCellDef>Type</th>
            <td mat-cell *matCellDef="let column">
              <mat-chip>{{ column.data_type }}</mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="nullable">
            <th mat-header-cell *matHeaderCellDef>Nullable</th>
            <td mat-cell *matCellDef="let column">
              @if (column.nullable) {
                <mat-icon class="nullable-yes">check_circle</mat-icon>
              } @else {
                <mat-icon class="nullable-no">cancel</mat-icon>
              }
            </td>
          </ng-container>

          <ng-container matColumnDef="default">
            <th mat-header-cell *matHeaderCellDef>Default</th>
            <td mat-cell *matCellDef="let column">
              {{ column.default_value || '-' }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      </div>
    }
  `,
  styles: [`
    .schema-container {
      padding: 16px;
      background: #252526;
    }

    .schema-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      color: #d4d4d4;

      mat-icon {
        color: #4fc3f7;
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }
    }

    .schema-table {
      width: 100%;
      background: #1e1e1e;
    }

    th.mat-header-cell {
      background: #333;
      color: #d4d4d4;
      font-weight: 500;
    }

    td.mat-cell {
      color: #d4d4d4;
      border-bottom: 1px solid #3c3c3c;
    }

    .column-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pk-icon {
      font-size: 16px;
      height: 16px;
      width: 16px;
      color: #ffd54f;
    }

    mat-chip {
      font-size: 12px;
      min-height: 24px;
    }

    .nullable-yes {
      color: #81c784;
    }

    .nullable-no {
      color: #e57373;
    }
  `],
})
export class SchemaViewerComponent {
  db = inject(DatabaseService);

  displayedColumns = ['name', 'type', 'nullable', 'default'];
}
