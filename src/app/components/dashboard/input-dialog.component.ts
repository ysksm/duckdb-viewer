import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface InputDialogData {
  title: string;
  label: string;
  value?: string;
  placeholder?: string;
}

@Component({
  selector: 'app-input-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ data.label }}</mat-label>
        <input
          matInput
          [(ngModel)]="value"
          [placeholder]="data.placeholder || ''"
          (keydown.enter)="onSubmit()"
        />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!value.trim()">
        OK
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
    mat-dialog-content {
      min-width: 300px;
    }
  `],
})
export class InputDialogComponent {
  dialogRef = inject(MatDialogRef<InputDialogComponent>);
  data: InputDialogData = inject(MAT_DIALOG_DATA);

  value: string = this.data.value || '';

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.value.trim()) {
      this.dialogRef.close(this.value.trim());
    }
  }
}
