import { Component, inject, signal, effect, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { QueryService } from '../../services/query.service';
import { DatabaseService } from '../../services/database.service';

@Component({
  selector: 'app-sql-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="editor-container">
      <div class="editor-toolbar">
        <button
          mat-raised-button
          color="primary"
          (click)="executeQuery()"
          [disabled]="!db.isConnected() || queryService.isExecuting() || !sql()"
          matTooltip="Execute (Ctrl+Enter)"
        >
          @if (queryService.isExecuting()) {
            <mat-spinner diameter="20"></mat-spinner>
          } @else {
            <mat-icon>play_arrow</mat-icon>
          }
          Run
        </button>
        <button
          mat-stroked-button
          (click)="clearEditor()"
          [disabled]="!sql()"
          matTooltip="Clear editor"
        >
          <mat-icon>clear</mat-icon>
          Clear
        </button>
      </div>
      <div class="editor-wrapper">
        <textarea
          #editorTextarea
          class="sql-textarea"
          [value]="sql()"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"
          placeholder="Enter SQL query..."
          spellcheck="false"
        ></textarea>
      </div>
    </div>
  `,
  styles: [`
    .editor-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #1e1e1e;
    }

    .editor-toolbar {
      display: flex;
      gap: 8px;
      padding: 8px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
    }

    .editor-wrapper {
      flex: 1;
      overflow: hidden;
    }

    .sql-textarea {
      width: 100%;
      height: 100%;
      padding: 16px;
      border: none;
      outline: none;
      resize: none;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.5;
      background: #1e1e1e;
      color: #d4d4d4;
      tab-size: 2;
    }

    .sql-textarea::placeholder {
      color: #6a6a6a;
    }

    mat-spinner {
      display: inline-block;
    }
  `],
})
export class SqlEditorComponent {
  queryService = inject(QueryService);
  db = inject(DatabaseService);

  sql = signal('SELECT * FROM ');
  editorTextarea = viewChild<ElementRef<HTMLTextAreaElement>>('editorTextarea');

  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.sql.set(textarea.value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      this.executeQuery();
    }

    // Handle Tab key for indentation
    if (event.key === 'Tab') {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      textarea.value = value.substring(0, start) + '  ' + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      this.sql.set(textarea.value);
    }
  }

  async executeQuery(): Promise<void> {
    const query = this.sql().trim();
    if (!query || !this.db.isConnected()) return;

    try {
      await this.queryService.executeQuery(query);
    } catch (e) {
      console.error('Query execution failed:', e);
    }
  }

  clearEditor(): void {
    this.sql.set('');
    this.queryService.clearResult();
  }

  setQuery(query: string): void {
    this.sql.set(query);
    const textarea = this.editorTextarea();
    if (textarea) {
      textarea.nativeElement.value = query;
    }
  }
}
