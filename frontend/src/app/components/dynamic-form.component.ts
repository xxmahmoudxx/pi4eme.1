import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FormFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date';
  required: boolean;
  placeholder?: string;
  default?: any;
  custom?: boolean; // user-added field
}

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form (ngSubmit)="submit()" class="dynamic-form">
      <div class="form-fields">
        <div class="form-row" *ngFor="let field of fields; let i = index">
          <div class="form-group" [class.full-width]="i === fields.length - 1 && fields.length % 2 !== 0">
            <div class="label-row">
              <label>{{ field.label }} {{ field.required ? '*' : '' }}</label>
              <button type="button" class="btn-remove-field" *ngIf="field.custom" (click)="removeField(i)" title="Remove field">&times;</button>
            </div>
            <input
              *ngIf="field.type === 'text'"
              type="text"
              [(ngModel)]="formData[field.name]"
              [name]="field.name"
              [placeholder]="field.placeholder || ''"
              [required]="field.required"
            />
            <input
              *ngIf="field.type === 'number'"
              type="number"
              [(ngModel)]="formData[field.name]"
              [name]="field.name"
              step="0.01"
              min="0"
              [required]="field.required"
            />
            <input
              *ngIf="field.type === 'date'"
              type="date"
              [(ngModel)]="formData[field.name]"
              [name]="field.name"
              [required]="field.required"
            />
          </div>
        </div>
      </div>

      <!-- Add Custom Field -->
      <div class="add-field-row">
        <input type="text" [(ngModel)]="newFieldName" name="newFieldName" placeholder="New field name..." class="add-field-input" />
        <select [(ngModel)]="newFieldType" name="newFieldType" class="add-field-select">
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
        </select>
        <button type="button" class="btn-add-field" (click)="addField()" [disabled]="!newFieldName.trim()">+ Add Field</button>
      </div>

      <button class="btn-submit" type="submit" [disabled]="loading">
        {{ loading ? 'Saving...' : submitLabel }}
      </button>
    </form>
  `,
  styles: [`
    .dynamic-form { display: flex; flex-direction: column; gap: 12px; }
    .form-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-row { display: contents; }
    .form-group { display: flex; flex-direction: column; gap: 4px; }
    .form-group.full-width { grid-column: 1 / -1; }
    .label-row { display: flex; align-items: center; justify-content: space-between; }
    .label-row label { font-size: 11px; font-weight: 700; color: #5483B3; text-transform: uppercase; letter-spacing: 0.5px; }
    .btn-remove-field {
      background: none; border: none; color: #c0392b; font-size: 16px; cursor: pointer;
      padding: 0 4px; font-weight: 700; line-height: 1;
    }
    .btn-remove-field:hover { color: #e74c3c; }
    .form-group input, .form-group select {
      padding: 9px 12px; border: 1.5px solid #C1E8FF; border-radius: 8px;
      font-size: 13px; font-family: inherit; color: #021024; transition: border-color 0.2s;
    }
    .form-group input:focus, .form-group select:focus {
      outline: none; border-color: #5483B3; box-shadow: 0 0 0 3px rgba(84,131,179,0.12);
    }
    .add-field-row {
      display: flex; gap: 8px; padding: 10px; background: #f8fbff; border-radius: 8px;
      border: 1px dashed #C1E8FF; align-items: center;
    }
    .add-field-input {
      flex: 1; padding: 7px 10px; border: 1.5px solid #C1E8FF; border-radius: 7px;
      font-size: 12px; font-family: inherit;
    }
    .add-field-input:focus { outline: none; border-color: #5483B3; }
    .add-field-select {
      padding: 7px 8px; border: 1.5px solid #C1E8FF; border-radius: 7px;
      font-size: 12px; font-family: inherit; background: white;
    }
    .btn-add-field {
      padding: 7px 14px; border: 1.5px solid #5483B3; border-radius: 7px;
      background: white; color: #052659; font-size: 12px; font-weight: 600;
      font-family: inherit; cursor: pointer; white-space: nowrap;
    }
    .btn-add-field:hover:not(:disabled) { background: #C1E8FF; }
    .btn-add-field:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-submit {
      padding: 10px; border: none; border-radius: 8px;
      background: linear-gradient(135deg, #052659 0%, #5483B3 100%);
      color: white; font-size: 14px; font-weight: 700; font-family: inherit;
      cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(5,38,89,0.25);
    }
    .btn-submit:hover:not(:disabled) { background: linear-gradient(135deg, #021024 0%, #052659 100%); transform: translateY(-1px); }
    .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class DynamicFormComponent implements OnInit {
  @Input() fields: FormFieldDef[] = [];
  @Input() loading = false;
  @Input() submitLabel = 'Submit';
  @Output() formSubmitted = new EventEmitter<Record<string, any>>();

  formData: Record<string, any> = {};
  newFieldName = '';
  newFieldType: 'text' | 'number' | 'date' = 'text';

  ngOnInit() {
    this.resetForm();
  }

  resetForm() {
    this.formData = {};
    for (const f of this.fields) {
      this.formData[f.name] = f.default !== undefined ? f.default : (f.type === 'number' ? 0 : '');
    }
  }

  addField() {
    const name = this.newFieldName.trim().replace(/\s+/g, '_').toLowerCase();
    if (!name || this.fields.some((f) => f.name === name)) return;
    this.fields.push({
      name,
      label: this.newFieldName.trim(),
      type: this.newFieldType,
      required: false,
      custom: true,
    });
    this.formData[name] = this.newFieldType === 'number' ? 0 : '';
    this.newFieldName = '';
  }

  removeField(index: number) {
    const field = this.fields[index];
    if (field.custom) {
      delete this.formData[field.name];
      this.fields.splice(index, 1);
    }
  }

  submit() {
    this.formSubmitted.emit({ ...this.formData });
    this.resetForm();
  }
}
