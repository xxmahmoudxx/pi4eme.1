import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

export interface FormFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'checkbox';
  required: boolean;
  placeholder?: string;
  default?: any;
  custom?: boolean; // user-added field
  autocomplete?: 'customer' | 'supplier'; // autocomplete type
}

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <form (ngSubmit)="submit()" class="dynamic-form">
      <div class="form-fields">
        <div class="form-row" *ngFor="let field of fields; let i = index">
          <div class="form-group" [class.full-width]="i === fields.length - 1 && fields.length % 2 !== 0">
            <div class="label-row">
              <label>{{ field.label | translate }} {{ field.required ? '*' : '' }}</label>
              <button type="button" class="btn-remove-field" *ngIf="field.custom" (click)="removeField(i)" [title]="'SETTINGS.REMOVE' | translate">&times;</button>
            </div>

            <!-- Autocomplete field -->
            <div class="autocomplete-wrapper" *ngIf="field.autocomplete">
              <input
                type="text"
                [(ngModel)]="formData[field.name]"
                [name]="field.name"
                [placeholder]="(field.placeholder || '') | translate"
                [required]="field.required"
                (input)="onAutocompleteInput(field)"
                (focus)="onAutocompleteFocus(field)"
                (blur)="onAutocompleteBlur(field)"
                autocomplete="off"
              />
              <div class="autocomplete-dropdown" *ngIf="activeAutocomplete === field.name && suggestions.length > 0">
                <div class="autocomplete-item"
                     *ngFor="let item of suggestions"
                     (mousedown)="selectSuggestion(field, item)">
                  <span class="suggestion-name">{{ item.name }}</span>
                  <span class="suggestion-meta" *ngIf="item.email">{{ item.email }}</span>
                </div>
                <div class="autocomplete-hint" *ngIf="formData[field.name]?.trim() && !hasSuggestionMatch()">
                  <span class="new-badge">NEW</span> "{{ formData[field.name] }}" {{ 'COMMON.WILL_BE_CREATED' | translate }}
                </div>
              </div>
              <div class="autocomplete-dropdown" *ngIf="activeAutocomplete === field.name && suggestions.length === 0 && formData[field.name]?.trim()">
                <div class="autocomplete-hint">
                  <span class="new-badge">NEW</span> "{{ formData[field.name] }}" {{ 'COMMON.WILL_BE_CREATED' | translate }}
                </div>
              </div>
            </div>

            <!-- Regular text input -->
            <input
              *ngIf="field.type === 'text' && !field.autocomplete"
              type="text"
              [(ngModel)]="formData[field.name]"
              [name]="field.name"
              [placeholder]="(field.placeholder || '') | translate"
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

              <!-- Checkbox input -->
              <div class="checkbox-wrapper" *ngIf="field.type === 'checkbox'">
                <input
                  type="checkbox"
                  [(ngModel)]="formData[field.name]"
                  [name]="field.name"
                  [id]="field.name + '_' + i"
                />
                <label [for]="field.name + '_' + i">{{ (field.placeholder || 'COMMON.YES') | translate }}</label>
              </div>
            </div>
          </div>
        </div>

      <!-- Add Custom Field -->
      <div class="add-field-row">
        <input type="text" [(ngModel)]="newFieldName" name="newFieldName" [placeholder]="'COMMON.NEW_FIELD_NAME' | translate" class="add-field-input" />
        <select [(ngModel)]="newFieldType" name="newFieldType" class="add-field-select">
          <option value="text">{{ 'COMMON.TEXT' | translate }}</option>
          <option value="number">{{ 'COMMON.NUMBER' | translate }}</option>
          <option value="date">{{ 'COMMON.DATE' | translate }}</option>
        </select>
        <button type="button" class="btn-add-field" (click)="addField()" [disabled]="!newFieldName.trim()">+ {{ 'COMMON.ADD_FIELD' | translate }}</button>
      </div>

      <button class="btn-submit" type="submit" [disabled]="loading">
        {{ loading ? ('COMMON.SAVING' | translate) : (submitLabel | translate) }}
      </button>
    </form>
  `,
  styles: [`
    .dynamic-form { display: flex; flex-direction: column; gap: 12px; }
    .form-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-row { display: contents; }
    .form-group { display: flex; flex-direction: column; gap: 4px; position: relative; }
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

    /* Autocomplete */
    .autocomplete-wrapper { position: relative; }
    .autocomplete-wrapper input { width: 100%; box-sizing: border-box; }
    .autocomplete-dropdown {
      position: absolute; top: 100%; left: 0; right: 0;
      background: white; border: 1.5px solid #C1E8FF; border-top: none;
      border-radius: 0 0 8px 8px; box-shadow: 0 6px 20px rgba(2,16,36,0.1);
      z-index: 50; max-height: 200px; overflow-y: auto;
      animation: dropIn 0.15s ease;
    }
    @keyframes dropIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .autocomplete-item {
      padding: 8px 12px; cursor: pointer; display: flex; flex-direction: column;
      gap: 1px; transition: background 0.15s;
    }
    .autocomplete-item:hover { background: rgba(84,131,179,0.06); }
    .suggestion-name { font-size: 13px; font-weight: 600; color: #021024; }
    .suggestion-meta { font-size: 11px; color: #7DA0CA; }
    .autocomplete-hint {
      padding: 8px 12px; font-size: 12px; color: #5483B3;
      display: flex; align-items: center; gap: 6px;
      border-top: 1px solid rgba(84,131,179,0.08);
    }
    .new-badge {
      display: inline-block; padding: 1px 6px; border-radius: 4px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white; font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
    }

    .checkbox-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 4px;
    }
    .checkbox-wrapper input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin: 0;
      cursor: pointer;
    }
    .checkbox-wrapper label {
      font-size: 13px;
      color: #021024;
      text-transform: none;
      letter-spacing: 0;
      cursor: pointer;
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
export class DynamicFormComponent implements OnInit, OnDestroy {
  @Input() fields: FormFieldDef[] = [];
  @Input() loading = false;
  @Input() submitLabel = 'Submit';
  @Output() formSubmitted = new EventEmitter<Record<string, any>>();

  formData: Record<string, any> = {};
  newFieldName = '';
  newFieldType: 'text' | 'number' | 'date' = 'text';

  // Autocomplete state
  activeAutocomplete: string | null = null;
  suggestions: any[] = [];
  private searchSubject = new Subject<{ field: FormFieldDef; query: string }>();
  private blurTimeout: any;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.resetForm();

    // Setup debounced search
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => a.query === b.query && a.field.name === b.field.name),
      switchMap(({ field, query }) => {
        if (!query || query.trim().length < 1) return of([]);
        if (field.autocomplete === 'customer') {
          return this.api.searchCustomers(query);
        } else if (field.autocomplete === 'supplier') {
          return this.api.searchSuppliers(query);
        }
        return of([]);
      }),
    ).subscribe(results => {
      this.suggestions = results;
    });
  }

  ngOnDestroy() {
    if (this.blurTimeout) clearTimeout(this.blurTimeout);
  }

  resetForm() {
    this.formData = {};
    for (const f of this.fields) {
      if (f.default !== undefined) {
        this.formData[f.name] = f.default;
      } else {
        this.formData[f.name] = f.type === 'number' ? 0 : (f.type === 'checkbox' ? false : '');
      }
    }
  }

  // ── Autocomplete handlers ──
  onAutocompleteInput(field: FormFieldDef) {
    this.activeAutocomplete = field.name;
    const query = this.formData[field.name] || '';
    this.searchSubject.next({ field, query });
  }

  onAutocompleteFocus(field: FormFieldDef) {
    if (this.blurTimeout) { clearTimeout(this.blurTimeout); this.blurTimeout = null; }
    this.activeAutocomplete = field.name;
    const query = this.formData[field.name] || '';
    this.searchSubject.next({ field, query });
  }

  onAutocompleteBlur(field: FormFieldDef) {
    // Delay to allow click on suggestion
    this.blurTimeout = setTimeout(() => {
      this.activeAutocomplete = null;
      this.suggestions = [];
    }, 200);
  }

  selectSuggestion(field: FormFieldDef, item: any) {
    this.formData[field.name] = item.name;
    this.activeAutocomplete = null;
    this.suggestions = [];
    if (this.blurTimeout) { clearTimeout(this.blurTimeout); this.blurTimeout = null; }
  }

  hasSuggestionMatch(): boolean {
    const current = (this.formData[this.activeAutocomplete || ''] || '').toLowerCase().trim();
    return this.suggestions.some(s => s.name.toLowerCase().trim() === current);
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
