---
layout: default
title: "Chrome Extension Form Handling — Best Practices"
description: "Handle form submissions in extension pages."
---

# Form Handling Patterns for Chrome Extensions

Practical patterns for building forms in Chrome extension popups, options pages, and content scripts. Covers auto-save, validation, wizards, dynamic fields, import/export, state persistence, cross-context sync, and secure credential storage.

---

## Table of Contents

1. [Options Page Form with Auto-Save](#pattern-1-options-page-form-with-auto-save)
2. [Form Validation with ARIA Error States](#pattern-2-form-validation-with-aria-error-states)
3. [Multi-Step Wizard in Popup](#pattern-3-multi-step-wizard-in-popup)
4. [Dynamic Form Fields from Storage Schema](#pattern-4-dynamic-form-fields-from-storage-schema)
5. [Import/Export Settings via File Input](#pattern-5-importexport-settings-via-file-input)
6. [Form State Persistence Across Popup Reopens](#pattern-6-form-state-persistence-across-popup-reopens)
7. [Synced Form Between Popup and Options Page](#pattern-7-synced-form-between-popup-and-options-page)
8. [Password/API Key Input with Secure Storage](#pattern-8-passwordapi-key-input-with-secure-storage)
9. [Summary Table](#summary-table)

---

## Pattern 1: Options Page Form with Auto-Save

Auto-saving eliminates the need for a "Save" button and gives users immediate feedback. The key is debouncing writes and showing a save indicator.

### HTML Structure

```html
<!-- options.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="options-container">
    <h1>Extension Settings</h1>
    <form id="settings-form">
      <div class="field">
        <label for="site-url">Target Site URL</label>
        <input type="url" id="site-url" name="siteUrl" placeholder="https://example.com">
        <span class="save-indicator" aria-live="polite"></span>
      </div>

      <div class="field">
        <label for="refresh-interval">Refresh Interval (seconds)</label>
        <input type="number" id="refresh-interval" name="refreshInterval" min="5" max="3600" value="30">
        <span class="save-indicator" aria-live="polite"></span>
      </div>

      <div class="field">
        <label>
          <input type="checkbox" id="auto-start" name="autoStart">
          Start automatically on browser launch
        </label>
      </div>

      <div class="field">
        <label for="theme">Theme</label>
        <select id="theme" name="theme">
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    </form>
  </div>
  <script type="module" src="options.js"></script>
</body>
</html>
```

### TypeScript Auto-Save Logic

```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  siteUrl: 'string',
  refreshInterval: 'number',
  autoStart: 'boolean',
  theme: 'string',
});

const storage = createStorage(schema, 'sync');

// Debounce utility
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Show save indicator next to a field
function showSaved(input: HTMLElement): void {
  const indicator = input.closest('.field')?.querySelector('.save-indicator');
  if (!indicator) return;
  indicator.textContent = 'Saved';
  indicator.classList.add('visible');
  setTimeout(() => {
    indicator.textContent = '';
    indicator.classList.remove('visible');
  }, 1500);
}

// Extract value based on input type
function getFieldValue(input: HTMLInputElement | HTMLSelectElement): string | number | boolean {
  if (input instanceof HTMLInputElement && input.type === 'checkbox') {
    return input.checked;
  }
  if (input instanceof HTMLInputElement && input.type === 'number') {
    return parseInt(input.value, 10);
  }
  return input.value;
}

// Debounced save for each field
const saveField = debounce(async (name: string, value: unknown, input: HTMLElement) => {
  await storage.set(name as keyof typeof schema, value as never);
  showSaved(input);
}, 400);

// Attach listeners to all form controls
function initAutoSave(): void {
  const form = document.getElementById('settings-form') as HTMLFormElement;
  form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select').forEach((input) => {
    const event = input.type === 'checkbox' ? 'change' : 'input';
    input.addEventListener(event, () => {
      saveField(input.name, getFieldValue(input), input);
    });
  });
}

// Load saved values on page open
async function loadSettings(): Promise<void> {
  const form = document.getElementById('settings-form') as HTMLFormElement;

  const siteUrl = await storage.get('siteUrl');
  const refreshInterval = await storage.get('refreshInterval');
  const autoStart = await storage.get('autoStart');
  const theme = await storage.get('theme');

  if (siteUrl) (form.querySelector('[name="siteUrl"]') as HTMLInputElement).value = siteUrl;
  if (refreshInterval) (form.querySelector('[name="refreshInterval"]') as HTMLInputElement).value = String(refreshInterval);
  if (autoStart !== undefined) (form.querySelector('[name="autoStart"]') as HTMLInputElement).checked = Boolean(autoStart);
  if (theme) (form.querySelector('[name="theme"]') as HTMLSelectElement).value = theme;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  initAutoSave();
});
```

### CSS for Save Indicator

```css
.save-indicator {
  font-size: 12px;
  color: #00c853;
  opacity: 0;
  transition: opacity 0.3s ease;
  margin-left: 8px;
}

.save-indicator.visible {
  opacity: 1;
}

.field {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
```

**Key takeaway**: Debounce at 300-500ms for text inputs, fire immediately on checkbox/select changes.

---

## Pattern 2: Form Validation with ARIA Error States

Accessible form validation requires proper ARIA attributes so screen readers announce errors. Never rely on color alone.

### Validation Infrastructure

```typescript
interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
}

interface FieldConfig {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  rules: ValidationRule[];
}

class FormValidator {
  private fields: Map<string, FieldConfig> = new Map();
  private errorContainer: Map<string, HTMLElement> = new Map();

  addField(name: string, element: HTMLInputElement, rules: ValidationRule[]): void {
    this.fields.set(name, { element, rules });

    // Create error container with ARIA linkage
    const errorEl = document.createElement('div');
    errorEl.id = `${name}-error`;
    errorEl.className = 'field-error';
    errorEl.setAttribute('role', 'alert');
    errorEl.setAttribute('aria-live', 'assertive');
    element.setAttribute('aria-describedby', errorEl.id);
    element.parentElement?.appendChild(errorEl);
    this.errorContainer.set(name, errorEl);

    // Validate on blur and input
    element.addEventListener('blur', () => this.validateField(name));
    element.addEventListener('input', () => {
      if (element.getAttribute('aria-invalid') === 'true') {
        this.validateField(name); // Re-validate only if already showing error
      }
    });
  }

  validateField(name: string): boolean {
    const config = this.fields.get(name);
    const errorEl = this.errorContainer.get(name);
    if (!config || !errorEl) return true;

    const value = config.element.value;
    const errors: string[] = [];

    for (const rule of config.rules) {
      if (!rule.test(value)) {
        errors.push(rule.message);
      }
    }

    if (errors.length > 0) {
      config.element.setAttribute('aria-invalid', 'true');
      config.element.classList.add('input-error');
      errorEl.textContent = errors[0]; // Show first error
      errorEl.style.display = 'block';
      return false;
    }

    config.element.setAttribute('aria-invalid', 'false');
    config.element.classList.remove('input-error');
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    return true;
  }

  validateAll(): boolean {
    let valid = true;
    for (const name of this.fields.keys()) {
      if (!this.validateField(name)) {
        valid = false;
      }
    }
    // Focus the first invalid field
    if (!valid) {
      const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
    }
    return valid;
  }
}
```

### Usage Example

```typescript
const validator = new FormValidator();

validator.addField('apiEndpoint', document.getElementById('api-endpoint') as HTMLInputElement, [
  {
    test: (v) => v.length > 0,
    message: 'API endpoint is required',
  },
  {
    test: (v) => /^https:\/\//.test(v),
    message: 'Must start with https://',
  },
  {
    test: (v) => {
      try { new URL(v); return true; } catch { return false; }
    },
    message: 'Must be a valid URL',
  },
]);

validator.addField('maxResults', document.getElementById('max-results') as HTMLInputElement, [
  {
    test: (v) => v.length > 0,
    message: 'Max results is required',
  },
  {
    test: (v) => !isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 100,
    message: 'Must be a number between 1 and 100',
  },
]);
```

### Error Styling

```css
.input-error {
  border-color: #d32f2f !important;
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.2);
}

.field-error {
  color: #d32f2f;
  font-size: 12px;
  margin-top: 4px;
  display: none;
}

/* High contrast mode support */
@media (forced-colors: active) {
  .input-error {
    outline: 2px solid Mark;
  }
  .field-error {
    color: Mark;
  }
}
```

**Key takeaway**: Use `aria-invalid`, `aria-describedby`, and `role="alert"` so screen readers announce errors without visual-only cues.

---

## Pattern 3: Multi-Step Wizard in Popup

Chrome extension popups have limited space. A wizard breaks complex setup into manageable steps.

### Wizard Controller

```typescript
interface WizardStep {
  id: string;
  title: string;
  validate?: () => boolean | Promise<boolean>;
}

class PopupWizard {
  private steps: WizardStep[];
  private currentIndex = 0;
  private container: HTMLElement;
  private data: Record<string, unknown> = {};

  constructor(container: HTMLElement, steps: WizardStep[]) {
    this.container = container;
    this.steps = steps;
    this.render();
  }

  private render(): void {
    const step = this.steps[this.currentIndex];

    // Progress bar
    const progress = this.container.querySelector('.wizard-progress') as HTMLElement;
    if (progress) {
      const pct = ((this.currentIndex + 1) / this.steps.length) * 100;
      progress.style.width = `${pct}%`;
      progress.setAttribute('aria-valuenow', String(pct));
      progress.setAttribute('aria-valuetext',
        `Step ${this.currentIndex + 1} of ${this.steps.length}: ${step.title}`);
    }

    // Show current step, hide others
    this.steps.forEach((s, i) => {
      const panel = document.getElementById(`step-${s.id}`);
      if (panel) {
        panel.hidden = i !== this.currentIndex;
        panel.setAttribute('aria-hidden', String(i !== this.currentIndex));
      }
    });

    // Update step title
    const titleEl = this.container.querySelector('.wizard-title');
    if (titleEl) titleEl.textContent = step.title;

    // Button states
    const backBtn = this.container.querySelector('.wizard-back') as HTMLButtonElement;
    const nextBtn = this.container.querySelector('.wizard-next') as HTMLButtonElement;
    if (backBtn) backBtn.disabled = this.currentIndex === 0;
    if (nextBtn) {
      nextBtn.textContent = this.currentIndex === this.steps.length - 1 ? 'Finish' : 'Next';
    }
  }

  async next(): Promise<void> {
    const step = this.steps[this.currentIndex];

    // Validate current step before advancing
    if (step.validate) {
      const valid = await step.validate();
      if (!valid) return;
    }

    // Collect data from current step
    this.collectStepData(step.id);

    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex++;
      this.render();
    } else {
      await this.finish();
    }
  }

  back(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.render();
    }
  }

  private collectStepData(stepId: string): void {
    const panel = document.getElementById(`step-${stepId}`);
    if (!panel) return;
    panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select, textarea')
      .forEach((el) => {
        if (el.name) {
          this.data[el.name] = el.type === 'checkbox'
            ? (el as HTMLInputElement).checked
            : el.value;
        }
      });
  }

  private async finish(): Promise<void> {
    this.collectStepData(this.steps[this.currentIndex].id);
    // Save all collected data
    await chrome.storage.sync.set({ wizardData: this.data, setupComplete: true });
    // Notify background
    chrome.runtime.sendMessage({ type: 'SETUP_COMPLETE', data: this.data });
    // Show success
    this.container.innerHTML = `
      <div class="wizard-complete">
        <h2>Setup Complete</h2>
        <p>Your extension is ready to use.</p>
      </div>`;
  }

  getData(): Record<string, unknown> {
    return { ...this.data };
  }
}
```

### HTML Skeleton

```html
<div class="wizard" role="group" aria-label="Setup wizard">
  <div class="wizard-progress-track">
    <div class="wizard-progress" role="progressbar"
         aria-valuemin="0" aria-valuemax="100" aria-valuenow="33"></div>
  </div>
  <h2 class="wizard-title"></h2>

  <div id="step-account" class="wizard-step">
    <label for="email">Email</label>
    <input type="email" id="email" name="email" required>
    <label for="plan">Plan</label>
    <select id="plan" name="plan">
      <option value="free">Free</option>
      <option value="pro">Pro</option>
    </select>
  </div>

  <div id="step-preferences" class="wizard-step" hidden>
    <label for="language">Language</label>
    <select id="language" name="language">
      <option value="en">English</option>
      <option value="es">Spanish</option>
      <option value="fr">French</option>
    </select>
    <label>
      <input type="checkbox" name="notifications" checked>
      Enable notifications
    </label>
  </div>

  <div id="step-confirm" class="wizard-step" hidden>
    <p>Review your settings and click Finish.</p>
    <div id="summary"></div>
  </div>

  <div class="wizard-actions">
    <button class="wizard-back">Back</button>
    <button class="wizard-next">Next</button>
  </div>
</div>
```

### Initialization

```typescript
const wizard = new PopupWizard(document.querySelector('.wizard')!, [
  {
    id: 'account',
    title: 'Account Setup',
    validate: () => {
      const email = (document.getElementById('email') as HTMLInputElement).value;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
  },
  { id: 'preferences', title: 'Preferences' },
  {
    id: 'confirm',
    title: 'Confirm',
    validate: () => {
      // Populate summary before user sees it
      const data = wizard.getData();
      const summary = document.getElementById('summary')!;
      summary.innerHTML = Object.entries(data)
        .map(([k, v]) => `<div><strong>${k}:</strong> ${v}</div>`)
        .join('');
      return true;
    },
  },
]);

document.querySelector('.wizard-next')!.addEventListener('click', () => wizard.next());
document.querySelector('.wizard-back')!.addEventListener('click', () => wizard.back());
```

**Key takeaway**: Validate each step before advancing; collect data incrementally so nothing is lost if the popup closes.

---

## Pattern 4: Dynamic Form Fields from Storage Schema

Generate forms automatically from a schema definition. Useful for extensions with many configurable options.

### Schema-Driven Form Generator

```typescript
interface FieldSchema {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'color' | 'range';
  default: unknown;
  options?: { value: string; label: string }[]; // For select type
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  group?: string;
}

const settingsSchema: FieldSchema[] = [
  {
    key: 'highlightColor',
    label: 'Highlight Color',
    type: 'color',
    default: '#ffff00',
    group: 'Appearance',
  },
  {
    key: 'fontSize',
    label: 'Font Size',
    type: 'range',
    default: 14,
    min: 10,
    max: 24,
    step: 1,
    description: 'Base font size in pixels',
    group: 'Appearance',
  },
  {
    key: 'enableOverlay',
    label: 'Enable overlay on pages',
    type: 'boolean',
    default: true,
    group: 'Behavior',
  },
  {
    key: 'maxItems',
    label: 'Maximum Items',
    type: 'number',
    default: 50,
    min: 1,
    max: 500,
    group: 'Behavior',
  },
  {
    key: 'displayMode',
    label: 'Display Mode',
    type: 'select',
    default: 'compact',
    options: [
      { value: 'compact', label: 'Compact' },
      { value: 'detailed', label: 'Detailed' },
      { value: 'minimal', label: 'Minimal' },
    ],
    group: 'Appearance',
  },
  {
    key: 'customCssSelector',
    label: 'Custom CSS Selector',
    type: 'text',
    default: '',
    description: 'CSS selector for content injection target',
    group: 'Advanced',
  },
];

function generateForm(schema: FieldSchema[], container: HTMLElement): void {
  // Group fields
  const groups = new Map<string, FieldSchema[]>();
  for (const field of schema) {
    const group = field.group || 'General';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(field);
  }

  for (const [groupName, fields] of groups) {
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = groupName;
    fieldset.appendChild(legend);

    for (const field of fields) {
      const wrapper = document.createElement('div');
      wrapper.className = 'dynamic-field';
      wrapper.innerHTML = createFieldHTML(field);
      fieldset.appendChild(wrapper);
    }

    container.appendChild(fieldset);
  }
}

function createFieldHTML(field: FieldSchema): string {
  const desc = field.description
    ? `<small id="${field.key}-desc" class="field-desc">${field.description}</small>`
    : '';
  const ariaDesc = field.description ? `aria-describedby="${field.key}-desc"` : '';

  switch (field.type) {
    case 'boolean':
      return `
        <label class="toggle-label">
          <input type="checkbox" name="${field.key}" ${ariaDesc}
                 ${field.default ? 'checked' : ''}>
          ${field.label}
        </label>${desc}`;

    case 'select':
      return `
        <label for="${field.key}">${field.label}</label>
        <select id="${field.key}" name="${field.key}" ${ariaDesc}>
          ${field.options!.map((o) =>
            `<option value="${o.value}" ${o.value === field.default ? 'selected' : ''}>${o.label}</option>`
          ).join('')}
        </select>${desc}`;

    case 'range':
      return `
        <label for="${field.key}">${field.label}: <output id="${field.key}-output">${field.default}</output></label>
        <input type="range" id="${field.key}" name="${field.key}" ${ariaDesc}
               min="${field.min}" max="${field.max}" step="${field.step}" value="${field.default}"
               oninput="document.getElementById('${field.key}-output').value = this.value">
        ${desc}`;

    case 'color':
      return `
        <label for="${field.key}">${field.label}</label>
        <input type="color" id="${field.key}" name="${field.key}" ${ariaDesc}
               value="${field.default}">
        ${desc}`;

    case 'number':
      return `
        <label for="${field.key}">${field.label}</label>
        <input type="number" id="${field.key}" name="${field.key}" ${ariaDesc}
               min="${field.min ?? ''}" max="${field.max ?? ''}" value="${field.default}">
        ${desc}`;

    default:
      return `
        <label for="${field.key}">${field.label}</label>
        <input type="text" id="${field.key}" name="${field.key}" ${ariaDesc}
               value="${field.default}">
        ${desc}`;
  }
}
```

### Loading and Saving Dynamic Fields

```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

async function loadDynamicDefaults(
  schema: FieldSchema[],
  form: HTMLFormElement
): Promise<void> {
  const saved = await chrome.storage.sync.get(
    schema.map((f) => f.key)
  );

  for (const field of schema) {
    const value = saved[field.key] ?? field.default;
    const el = form.elements.namedItem(field.key) as HTMLInputElement | HTMLSelectElement;
    if (!el) continue;

    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      el.checked = Boolean(value);
    } else {
      el.value = String(value);
    }

    // Update range outputs
    if (field.type === 'range') {
      const output = document.getElementById(`${field.key}-output`);
      if (output) output.textContent = String(value);
    }
  }
}

function attachDynamicAutoSave(schema: FieldSchema[], form: HTMLFormElement): void {
  for (const field of schema) {
    const el = form.elements.namedItem(field.key) as HTMLInputElement | HTMLSelectElement;
    if (!el) continue;

    el.addEventListener('change', async () => {
      let value: unknown;
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        value = el.checked;
      } else if (field.type === 'number' || field.type === 'range') {
        value = Number(el.value);
      } else {
        value = el.value;
      }
      await chrome.storage.sync.set({ [field.key]: value });
    });
  }
}
```

**Key takeaway**: Define settings as structured data, generate the UI automatically, and you never have to update HTML when adding a new option.

---

## Pattern 5: Import/Export Settings via File Input

Let users back up and restore their extension settings with JSON files.

### Export Function

```typescript
async function exportSettings(): Promise<void> {
  // Gather all storage areas
  const syncData = await chrome.storage.sync.get(null);
  const localData = await chrome.storage.local.get(null);

  const exportPayload = {
    version: chrome.runtime.getManifest().version,
    exportDate: new Date().toISOString(),
    sync: syncData,
    local: localData,
  };

  const blob = new Blob(
    [JSON.stringify(exportPayload, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `extension-settings-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Import Function with Validation

```typescript
interface SettingsExport {
  version: string;
  exportDate: string;
  sync: Record<string, unknown>;
  local: Record<string, unknown>;
}

function isValidExport(data: unknown): data is SettingsExport {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.version === 'string' &&
    typeof obj.exportDate === 'string' &&
    typeof obj.sync === 'object' &&
    typeof obj.local === 'object'
  );
}

async function importSettings(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!isValidExport(data)) {
      return { success: false, message: 'Invalid settings file format.' };
    }

    // Version compatibility check
    const currentVersion = chrome.runtime.getManifest().version;
    const [importMajor] = data.version.split('.');
    const [currentMajor] = currentVersion.split('.');
    if (importMajor !== currentMajor) {
      return {
        success: false,
        message: `Incompatible version: file is v${data.version}, extension is v${currentVersion}.`,
      };
    }

    // Sanitize: remove keys that should not be imported
    const blockedKeys = ['installDate', 'userId', 'authToken'];
    for (const key of blockedKeys) {
      delete data.sync[key];
      delete data.local[key];
    }

    // Apply settings
    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(data.sync);
    await chrome.storage.local.set(data.local);

    return {
      success: true,
      message: `Imported settings from ${new Date(data.exportDate).toLocaleDateString()}.`,
    };
  } catch (err) {
    return { success: false, message: `Import failed: ${(err as Error).message}` };
  }
}
```

### File Input UI

```html
<div class="import-export">
  <button id="export-btn" type="button">Export Settings</button>

  <label for="import-file" class="file-label">
    Import Settings
    <input type="file" id="import-file" accept=".json" hidden>
  </label>

  <div id="import-status" role="status" aria-live="polite"></div>
</div>
```

```typescript
document.getElementById('export-btn')!.addEventListener('click', exportSettings);

document.getElementById('import-file')!.addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const statusEl = document.getElementById('import-status')!;
  statusEl.textContent = 'Importing...';

  const result = await importSettings(file);
  statusEl.textContent = result.message;
  statusEl.className = result.success ? 'status-success' : 'status-error';

  if (result.success) {
    // Reload the form with new values
    setTimeout(() => location.reload(), 1000);
  }

  // Reset input so the same file can be re-selected
  input.value = '';
});
```

**Key takeaway**: Always validate the import file structure, check version compatibility, and exclude sensitive keys like auth tokens.

---

## Pattern 6: Form State Persistence Across Popup Reopens

When a popup closes, all DOM state is lost. Save in-progress form data so users can resume.

### Auto-Persist Controller

```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const draftStorage = createStorage(
  defineSchema({ popupDraft: 'string' }),
  'local'
);

class FormPersistence {
  private form: HTMLFormElement;
  private storageKey: string;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(form: HTMLFormElement, storageKey = 'popupDraft') {
    this.form = form;
    this.storageKey = storageKey;
  }

  // Serialize all form fields
  private serialize(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    const formData = new FormData(this.form);

    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }

    // Checkboxes that are unchecked don't appear in FormData
    this.form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
      if (cb.name) data[cb.name] = cb.checked;
    });

    // Track which step the user is on (for wizards)
    const activeStep = this.form.querySelector('.wizard-step:not([hidden])');
    if (activeStep) data.__activeStep = activeStep.id;

    // Track scroll position within the popup
    data.__scrollY = document.documentElement.scrollTop;

    return data;
  }

  // Restore form fields from saved data
  private restore(data: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('__')) continue; // Skip metadata

      const el = this.form.elements.namedItem(key);
      if (!el) continue;

      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        el.checked = Boolean(value);
      } else if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        el.value = String(value);
      }
    }

    // Restore scroll position
    if (typeof data.__scrollY === 'number') {
      requestAnimationFrame(() => {
        document.documentElement.scrollTop = data.__scrollY as number;
      });
    }
  }

  // Start watching for changes
  watch(): void {
    const events = ['input', 'change'];
    events.forEach((event) => {
      this.form.addEventListener(event, () => this.scheduleSave(), { passive: true });
    });
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 150);
  }

  async save(): Promise<void> {
    const data = this.serialize();
    await draftStorage.set('popupDraft', JSON.stringify({
      key: this.storageKey,
      data,
      timestamp: Date.now(),
    }));
  }

  async load(): Promise<boolean> {
    const raw = await draftStorage.get('popupDraft');
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw);
      if (parsed.key !== this.storageKey) return false;

      // Expire drafts after 24 hours
      if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
        await this.clear();
        return false;
      }

      this.restore(parsed.data);
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await draftStorage.set('popupDraft', '');
  }
}

// Usage
const form = document.getElementById('my-form') as HTMLFormElement;
const persistence = new FormPersistence(form, 'feedback-form');

document.addEventListener('DOMContentLoaded', async () => {
  const restored = await persistence.load();
  if (restored) {
    // Show a subtle "draft restored" indicator
    const notice = document.createElement('div');
    notice.className = 'draft-notice';
    notice.textContent = 'Draft restored';
    notice.setAttribute('role', 'status');
    form.prepend(notice);
    setTimeout(() => notice.remove(), 2000);
  }
  persistence.watch();
});

// Clear draft on successful submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  // ... handle submission ...
  await persistence.clear();
});
```

**Key takeaway**: Serialize the full form state (including checkboxes and scroll position) on every change, and restore it when the popup reopens. Expire stale drafts.

---

## Pattern 7: Synced Form Between Popup and Options Page

When both the popup and options page modify the same settings, they must stay synchronized in real time.

### Shared Storage Layer

```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { createMessenger } from '@theluckystrike/webext-messaging';

// Shared schema used by both popup and options
const settingsSchema = defineSchema({
  enabled: 'boolean',
  targetUrl: 'string',
  refreshRate: 'number',
  theme: 'string',
});

type SettingsKey = keyof typeof settingsSchema;

const storage = createStorage(settingsSchema, 'sync');
const messenger = createMessenger();

// Listen for storage changes and update the form
function watchStorageChanges(form: HTMLFormElement): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;

    for (const [key, { newValue }] of Object.entries(changes)) {
      const el = form.elements.namedItem(key);
      if (!el) continue;

      // Avoid triggering change events that would cause loops
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        if (el.checked !== Boolean(newValue)) {
          el.checked = Boolean(newValue);
          flashField(el);
        }
      } else if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
        if (el.value !== String(newValue)) {
          el.value = String(newValue);
          flashField(el);
        }
      }
    }
  });
}

// Visual feedback when a field updates from another context
function flashField(el: HTMLElement): void {
  el.classList.add('field-synced');
  setTimeout(() => el.classList.remove('field-synced'), 600);
}
```

### Popup Controller

```typescript
// popup.ts
async function initPopupForm(): Promise<void> {
  const form = document.getElementById('quick-settings') as HTMLFormElement;

  // Load current values
  const enabled = await storage.get('enabled');
  const targetUrl = await storage.get('targetUrl');
  const theme = await storage.get('theme');

  (form.elements.namedItem('enabled') as HTMLInputElement).checked = Boolean(enabled);
  (form.elements.namedItem('targetUrl') as HTMLInputElement).value = targetUrl || '';
  (form.elements.namedItem('theme') as HTMLSelectElement).value = theme || 'system';

  // Save on change
  form.addEventListener('change', async () => {
    const fd = new FormData(form);
    await storage.set('enabled', (form.elements.namedItem('enabled') as HTMLInputElement).checked);
    await storage.set('targetUrl', fd.get('targetUrl') as string);
    await storage.set('theme', fd.get('theme') as string);
  });

  // Watch for changes from options page
  watchStorageChanges(form);
}

initPopupForm();
```

### Options Page Controller

```typescript
// options.ts - same pattern, expanded UI
async function initOptionsForm(): Promise<void> {
  const form = document.getElementById('full-settings') as HTMLFormElement;

  // Load all settings
  for (const key of Object.keys(settingsSchema) as SettingsKey[]) {
    const value = await storage.get(key);
    const el = form.elements.namedItem(key);
    if (!el) continue;

    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      el.checked = Boolean(value);
    } else if (el instanceof HTMLInputElement && el.type === 'number') {
      el.value = String(value ?? '');
    } else if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      el.value = String(value ?? '');
    }
  }

  // Debounced auto-save
  let saveTimer: ReturnType<typeof setTimeout>;
  form.addEventListener('input', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveAllFields(form), 300);
  });
  form.addEventListener('change', () => saveAllFields(form));

  watchStorageChanges(form);
}

async function saveAllFields(form: HTMLFormElement): Promise<void> {
  for (const key of Object.keys(settingsSchema) as SettingsKey[]) {
    const el = form.elements.namedItem(key);
    if (!el) continue;

    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      await storage.set(key, el.checked as never);
    } else if (el instanceof HTMLInputElement && el.type === 'number') {
      await storage.set(key, Number(el.value) as never);
    } else if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) {
      await storage.set(key, el.value as never);
    }
  }
}

initOptionsForm();
```

### Sync Animation CSS

```css
.field-synced {
  animation: sync-pulse 0.6s ease;
}

@keyframes sync-pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 200, 83, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(0, 200, 83, 0.2); }
  100% { box-shadow: 0 0 0 0 rgba(0, 200, 83, 0); }
}
```

**Key takeaway**: Use `chrome.storage.onChanged` to detect changes from other contexts. Compare values before updating DOM to avoid feedback loops.

---

## Pattern 8: Password/API Key Input with Secure Storage

API keys and passwords need special handling -- mask display, use `chrome.storage.session` when available, and never log credentials.

### Secure Input Component

```typescript
interface SecureFieldOptions {
  inputId: string;
  storageKey: string;
  placeholder?: string;
  validateFormat?: (value: string) => boolean;
}

class SecureInput {
  private input: HTMLInputElement;
  private toggleBtn: HTMLButtonElement;
  private storageKey: string;
  private isRevealed = false;
  private validateFormat?: (value: string) => boolean;

  constructor(options: SecureFieldOptions) {
    this.storageKey = options.storageKey;
    this.validateFormat = options.validateFormat;

    const container = document.getElementById(options.inputId)!.parentElement!;
    this.input = document.getElementById(options.inputId) as HTMLInputElement;
    this.input.type = 'password';
    this.input.autocomplete = 'off';
    this.input.setAttribute('spellcheck', 'false');
    this.input.setAttribute('autocorrect', 'off');
    this.input.setAttribute('data-lpignore', 'true'); // Disable LastPass
    if (options.placeholder) this.input.placeholder = options.placeholder;

    // Toggle visibility button
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.type = 'button';
    this.toggleBtn.className = 'toggle-visibility';
    this.toggleBtn.textContent = 'Show';
    this.toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
    this.toggleBtn.addEventListener('click', () => this.toggle());
    container.appendChild(this.toggleBtn);
  }

  private toggle(): void {
    this.isRevealed = !this.isRevealed;
    this.input.type = this.isRevealed ? 'text' : 'password';
    this.toggleBtn.textContent = this.isRevealed ? 'Hide' : 'Show';

    // Auto-hide after 5 seconds
    if (this.isRevealed) {
      setTimeout(() => {
        this.isRevealed = false;
        this.input.type = 'password';
        this.toggleBtn.textContent = 'Show';
      }, 5000);
    }
  }

  async save(): Promise<{ success: boolean; error?: string }> {
    const value = this.input.value.trim();

    if (!value) {
      return { success: false, error: 'Value cannot be empty.' };
    }

    if (this.validateFormat && !this.validateFormat(value)) {
      return { success: false, error: 'Invalid format.' };
    }

    // Use session storage if available (cleared when browser closes)
    // Fall back to local storage with a note that it persists
    try {
      if (chrome.storage.session) {
        await chrome.storage.session.set({ [this.storageKey]: value });
      } else {
        await chrome.storage.local.set({ [this.storageKey]: value });
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async load(): Promise<void> {
    let result: Record<string, unknown> = {};

    if (chrome.storage.session) {
      result = await chrome.storage.session.get(this.storageKey);
    }
    if (!result[this.storageKey]) {
      result = await chrome.storage.local.get(this.storageKey);
    }

    if (result[this.storageKey]) {
      this.input.value = result[this.storageKey] as string;
      this.input.placeholder = 'Key saved (hidden)';
    }
  }

  async clear(): Promise<void> {
    this.input.value = '';
    if (chrome.storage.session) {
      await chrome.storage.session.remove(this.storageKey);
    }
    await chrome.storage.local.remove(this.storageKey);
  }
}
```

### Background Script: Secure Key Retrieval

```typescript
// background.ts - Retrieve API key for use in fetch calls

async function getApiKey(key: string): Promise<string | null> {
  // Check session first (preferred, ephemeral)
  if (chrome.storage.session) {
    const session = await chrome.storage.session.get(key);
    if (session[key]) return session[key] as string;
  }

  // Fall back to local
  const local = await chrome.storage.local.get(key);
  return (local[key] as string) || null;
}

// Use in API calls
async function callExternalApi(endpoint: string): Promise<unknown> {
  const apiKey = await getApiKey('apiKey');
  if (!apiKey) {
    // Prompt user to enter key
    chrome.action.openPopup();
    throw new Error('API key not configured');
  }

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401) {
    // Key is invalid, clear it
    await chrome.storage.session?.remove('apiKey');
    await chrome.storage.local.remove('apiKey');
    throw new Error('Invalid API key');
  }

  return response.json();
}
```

### HTML for Secure Input

```html
<div class="secure-field">
  <label for="api-key">API Key</label>
  <div class="input-group">
    <input type="password" id="api-key" autocomplete="off">
    <!-- Toggle button inserted by SecureInput -->
  </div>
  <div class="field-actions">
    <button id="save-key" type="button">Save Key</button>
    <button id="clear-key" type="button" class="danger">Remove Key</button>
  </div>
  <div id="key-status" role="status" aria-live="polite"></div>
</div>
```

```typescript
const secureKey = new SecureInput({
  inputId: 'api-key',
  storageKey: 'apiKey',
  placeholder: 'sk-...',
  validateFormat: (v) => v.startsWith('sk-') && v.length > 20,
});

// Load existing key on popup open
secureKey.load();

document.getElementById('save-key')!.addEventListener('click', async () => {
  const result = await secureKey.save();
  const status = document.getElementById('key-status')!;
  status.textContent = result.success ? 'Key saved securely.' : result.error!;
  status.className = result.success ? 'status-success' : 'status-error';
});

document.getElementById('clear-key')!.addEventListener('click', async () => {
  if (confirm('Remove the saved API key?')) {
    await secureKey.clear();
    document.getElementById('key-status')!.textContent = 'Key removed.';
  }
});
```

**Key takeaway**: Use `chrome.storage.session` for credentials when possible (it clears on browser close). Auto-hide revealed passwords after a timeout. Never log or sync credentials.

---

## Summary Table

| Pattern | Problem Solved | Key API / Technique | Complexity |
|---|---|---|---|
| Options Auto-Save | User forgets to click "Save" | `chrome.storage.sync` + debounce | Low |
| ARIA Validation | Inaccessible error messages | `aria-invalid`, `aria-describedby`, `role="alert"` | Medium |
| Multi-Step Wizard | Complex setup in small popup | Step controller + per-step validation | Medium |
| Dynamic Form Fields | Maintaining forms as settings grow | Schema-driven generation | Medium |
| Import/Export | Settings backup and restore | `Blob` + `File` API + JSON validation | Low |
| State Persistence | Popup closes mid-edit | `chrome.storage.local` + `FormData` serialization | Medium |
| Synced Forms | Popup and options page conflict | `chrome.storage.onChanged` listener | Medium |
| Secure Input | API keys exposed in storage | `chrome.storage.session` + input masking | High |

---

## Further Reading

- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [WAI-ARIA Authoring Practices: Forms](https://www.w3.org/WAI/ARIA/apg/patterns/forms/)
- [Chrome Extension Options Pages](https://developer.chrome.com/docs/extensions/develop/ui/options-page)
