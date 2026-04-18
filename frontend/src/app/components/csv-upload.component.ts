import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-csv-upload',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="csv-upload" (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)" [class.dragging]="dragging">
      <div class="upload-area">
        <span class="upload-icon">☁️</span>
        <p class="upload-text" [innerHTML]="'CSV.DRAG_DROP' | translate"></p>
        <p class="upload-sub">{{ 'COMMON.OR' | translate }}</p>
        <label class="btn-browse">
          {{ 'CSV.BROWSE' | translate }}
          <input type="file" accept=".csv" (change)="onFileChange($event)" hidden />
        </label>
        <span *ngIf="selected" class="file-name">📄 {{ selected.name }}</span>
      </div>
      <button class="btn-upload" type="button" (click)="emitFile()" [disabled]="!selected">
        {{ 'CSV.UPLOAD_BTN' | translate }}
      </button>
    </div>
  `,
  styles: [
    `
      .csv-upload {
        display: flex; flex-direction: column; gap: 14px;
      }
      .upload-area {
        display: flex; flex-direction: column; align-items: center;
        gap: 8px; padding: 24px;
        border: 2px dashed #7DA0CA; border-radius: 12px;
        background: #f9fdff; cursor: pointer;
        transition: all 0.2s;
        text-align: center;
      }
      .csv-upload.dragging .upload-area {
        border-color: #052659; background: #C1E8FF;
      }
      .upload-icon { font-size: 32px; }
      .upload-text { margin: 0; font-size: 14px; color: #5483B3; }
      .upload-sub { margin: 0; font-size: 12px; color: #7DA0CA; }
      .btn-browse {
        padding: 8px 18px; border-radius: 7px;
        border: 1.5px solid #5483B3;
        background: transparent; color: #052659;
        font-size: 13px; font-weight: 600; font-family: inherit;
        cursor: pointer; transition: all 0.15s;
      }
      .btn-browse:hover { background: #C1E8FF; }
      .file-name {
        font-size: 12.5px; color: #052659; font-weight: 600;
        background: #C1E8FF; padding: 4px 12px; border-radius: 6px;
        margin-top: 4px;
      }
      .btn-upload {
        width: 100%; padding: 11px;
        background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
        color: white; border: none; border-radius: 8px;
        font-size: 14px; font-weight: 700; font-family: inherit;
        cursor: pointer; transition: all 0.2s;
        box-shadow: 0 2px 8px rgba(5,38,89,0.25);
      }
      .btn-upload:hover:not(:disabled) {
        background: linear-gradient(135deg, #021024 0%, #052659 100%);
        box-shadow: 0 4px 14px rgba(5,38,89,0.35);
        transform: translateY(-1px);
      }
      .btn-upload:disabled { opacity: 0.45; cursor: not-allowed; }
    `,
  ],
})
export class CsvUploadComponent {
  @Output() fileSelected = new EventEmitter<File>();
  selected?: File;
  dragging = false;

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) { this.selected = file; }
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging = true;
  }

  onDragLeave(e: DragEvent) {
    this.dragging = false;
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
    const file = e.dataTransfer?.files?.[0];
    if (file && file.name.endsWith('.csv')) { this.selected = file; }
  }

  emitFile() {
    if (this.selected) {
      this.fileSelected.emit(this.selected);
    }
  }
}
