# Building a Unit Converter Chrome Extension

A comprehensive guide to creating a production-ready Unit Converter Chrome extension with TypeScript, modern architecture, and best practices.

## Overview

A Unit Converter extension allows users to quickly convert values between different measurement units. This guide covers building a complete, production-ready extension using Manifest V3, TypeScript, and modern Chrome extension patterns.

## Architecture and manifest.json Setup

The extension uses a modular architecture with clear separation of concerns:

```
unit-converter/
 manifest.json
 popup/
    popup.html
    popup.ts
    popup.css
 background/
    service-worker.ts
 content-script/
    content-script.ts
 shared/
    types.ts
    conversion.ts
    storage.ts
 icons/
    icon16.png
    icon48.png
    icon128.png
 tests/
     conversion.test.ts
```

### manifest.json Configuration

```json
{
  "manifest_version": 3,
  "name": "Unit Converter",
  "version": "1.0.0",
  "description": "Quickly convert between units of length, weight, temperature, and more",
  "permissions": [
    "storage"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script/content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## Core Implementation with TypeScript

### Shared Types (shared/types.ts)

```typescript
export type UnitCategory = 'length' | 'weight' | 'temperature' | 'volume' | 'area' | 'speed' | 'time';

export interface Unit {
  id: string;
  name: string;
  symbol: string;
  toBase: (value: number) => number;
  fromBase: (value: number) => number;
}

export interface ConversionResult {
  value: number;
  unit: Unit;
  formatted: string;
}

export interface ConversionState {
  category: UnitCategory;
  fromUnit: string;
  toUnit: string;
  inputValue: string;
  result: string | null;
}

export interface StoredPreferences {
  lastCategory: UnitCategory;
  lastFromUnit: string;
  lastToUnit: string;
  favoriteConversions: Array<{from: string; to: string}>;
}
```

### Conversion Logic (shared/conversion.ts)

```typescript
import { Unit, UnitCategory } from './types';

// Length units (base unit: meters)
export const lengthUnits: Record<string, Unit> = {
  meter: {
    id: 'meter',
    name: 'Meter',
    symbol: 'm',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  kilometer: {
    id: 'kilometer',
    name: 'Kilometer',
    symbol: 'km',
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
  centimeter: {
    id: 'centimeter',
    name: 'Centimeter',
    symbol: 'cm',
    toBase: (v) => v / 100,
    fromBase: (v) => v * 100,
  },
  millimeter: {
    id: 'millimeter',
    name: 'Millimeter',
    symbol: 'mm',
    toBase: (v) => v / 1000,
    fromBase: (v) => v * 1000,
  },
  mile: {
    id: 'mile',
    name: 'Mile',
    symbol: 'mi',
    toBase: (v) => v * 1609.344,
    fromBase: (v) => v / 1609.344,
  },
  yard: {
    id: 'yard',
    name: 'Yard',
    symbol: 'yd',
    toBase: (v) => v * 0.9144,
    fromBase: (v) => v / 0.9144,
  },
  foot: {
    id: 'foot',
    name: 'Foot',
    symbol: 'ft',
    toBase: (v) => v * 0.3048,
    fromBase: (v) => v / 0.3048,
  },
  inch: {
    id: 'inch',
    name: 'Inch',
    symbol: 'in',
    toBase: (v) => v * 0.0254,
    fromBase: (v) => v / 0.0254,
  },
};

// Weight units (base unit: kilograms)
export const weightUnits: Record<string, Unit> = {
  kilogram: {
    id: 'kilogram',
    name: 'Kilogram',
    symbol: 'kg',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  gram: {
    id: 'gram',
    name: 'Gram',
    symbol: 'g',
    toBase: (v) => v / 1000,
    fromBase: (v) => v * 1000,
  },
  milligram: {
    id: 'milligram',
    name: 'Milligram',
    symbol: 'mg',
    toBase: (v) => v / 1000000,
    fromBase: (v) => v * 1000000,
  },
  pound: {
    id: 'pound',
    name: 'Pound',
    symbol: 'lb',
    toBase: (v) => v * 0.453592,
    fromBase: (v) => v / 0.453592,
  },
  ounce: {
    id: 'ounce',
    name: 'Ounce',
    symbol: 'oz',
    toBase: (v) => v * 0.0283495,
    fromBase: (v) => v / 0.0283495,
  },
  ton: {
    id: 'ton',
    name: 'Metric Ton',
    symbol: 't',
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
  },
};

// Temperature units (base unit: Celsius)
export const temperatureUnits: Record<string, Unit> = {
  celsius: {
    id: 'celsius',
    name: 'Celsius',
    symbol: '°C',
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  fahrenheit: {
    id: 'fahrenheit',
    name: 'Fahrenheit',
    symbol: '°F',
    toBase: (v) => (v - 32) * 5/9,
    fromBase: (v) => v * 9/5 + 32,
  },
  kelvin: {
    id: 'kelvin',
    name: 'Kelvin',
    symbol: 'K',
    toBase: (v) => v - 273.15,
    fromBase: (v) => v + 273.15,
  },
};

export const unitCategories: Record<UnitCategory, Record<string, Unit>> = {
  length: lengthUnits,
  weight: weightUnits,
  temperature: temperatureUnits,
  volume: {},
  area: {},
  speed: {},
  time: {},
};

export function convert(value: number, fromUnit: Unit, toUnit: Unit): number {
  const baseValue = fromUnit.toBase(value);
  return toUnit.fromBase(baseValue);
}

export function formatResult(value: number, precision: number = 4): string {
  if (Math.abs(value) < 0.0001 || Math.abs(value) > 1000000) {
    return value.toExponential(precision);
  }
  return Number(value.toFixed(precision)).toString();
}
```

### Storage Service (shared/storage.ts)

```typescript
import { StoredPreferences, UnitCategory } from './types';

const STORAGE_KEY = 'unit-converter-preferences';

export async function loadPreferences(): Promise<StoredPreferences> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const defaults: StoredPreferences = {
        lastCategory: 'length',
        lastFromUnit: 'meter',
        lastToUnit: 'foot',
        favoriteConversions: [],
      };
      resolve(result[STORAGE_KEY] || defaults);
    });
  });
}

export async function savePreferences(prefs: StoredPreferences): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: prefs }, () => {
      resolve();
    });
  });
}

export async function updateCategory(category: UnitCategory): Promise<void> {
  const prefs = await loadPreferences();
  prefs.lastCategory = category;
  await savePreferences(prefs);
}
```

## UI Design

### Popup HTML (popup/popup.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unit Converter</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="converter-container">
    <header>
      <h1>Unit Converter</h1>
    </header>
    
    <main>
      <div class="category-selector">
        <label for="category">Category</label>
        <select id="category">
          <option value="length">Length</option>
          <option value="weight">Weight</option>
          <option value="temperature">Temperature</option>
        </select>
      </div>
      
      <div class="conversion-inputs">
        <div class="input-group">
          <label for="from-value">From</label>
          <input type="number" id="from-value" placeholder="Enter value" step="any">
          <select id="from-unit"></select>
        </div>
        
        <button id="swap-units" aria-label="Swap units">⇄</button>
        
        <div class="input-group">
          <label for="to-value">To</label>
          <input type="text" id="to-value" readonly>
          <select id="to-unit"></select>
        </div>
      </div>
      
      <div class="actions">
        <button id="copy-result" class="btn-secondary">Copy Result</button>
      </div>
    </main>
    
    <footer>
      <span id="status-message"></span>
    </footer>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

### Popup TypeScript (popup/popup.ts)

```typescript
import { unitCategories, convert, formatResult } from '../shared/conversion';
import { loadPreferences, savePreferences } from '../shared/storage';
import { UnitCategory, Unit } from '../shared/types';

class UnitConverterPopup {
  private categorySelect!: HTMLSelectElement;
  private fromValueInput!: HTMLInputElement;
  private fromUnitSelect!: HTMLSelectElement;
  private toValueInput!: HTMLInputElement;
  private toUnitSelect!: HTMLSelectElement;
  private swapButton!: HTMLButtonElement;
  private copyButton!: HTMLButtonElement;
  private statusMessage!: HTMLSpanElement;
  
  private currentCategory: UnitCategory = 'length';
  
  async init() {
    this.bindElements();
    this.bindEvents();
    await this.loadState();
    this.updateUnitOptions();
    this.performConversion();
  }
  
  private bindElements() {
    this.categorySelect = document.getElementById('category') as HTMLSelectElement;
    this.fromValueInput = document.getElementById('from-value') as HTMLInputElement;
    this.fromUnitSelect = document.getElementById('from-unit') as HTMLSelectElement;
    this.toValueInput = document.getElementById('to-value') as HTMLInputElement;
    this.toUnitSelect = document.getElementById('to-unit') as HTMLSelectElement;
    this.swapButton = document.getElementById('swap-units') as HTMLButtonElement;
    this.copyButton = document.getElementById('copy-result') as HTMLButtonElement;
    this.statusMessage = document.getElementById('status-message') as HTMLSpanElement;
  }
  
  private bindEvents() {
    this.categorySelect.addEventListener('change', () => this.onCategoryChange());
    this.fromValueInput.addEventListener('input', () => this.performConversion());
    this.fromUnitSelect.addEventListener('change', () => this.performConversion());
    this.toUnitSelect.addEventListener('change', () => this.performConversion());
    this.swapButton.addEventListener('click', () => this.swapUnits());
    this.copyButton.addEventListener('click', () => this.copyResult());
  }
  
  private async loadState() {
    try {
      const prefs = await loadPreferences();
      this.currentCategory = prefs.lastCategory;
      this.categorySelect.value = this.currentCategory;
      this.fromUnitSelect.value = prefs.lastFromUnit;
      this.toUnitSelect.value = prefs.lastToUnit;
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }
  
  private updateUnitOptions() {
    const units = unitCategories[this.currentCategory];
    this.fromUnitSelect.innerHTML = '';
    this.toUnitSelect.innerHTML = '';
    
    for (const [id, unit] of Object.entries(units)) {
      const option1 = new Option(`${unit.name} (${unit.symbol})`, id);
      const option2 = new Option(`${unit.name} (${unit.symbol})`, id);
      this.fromUnitSelect.add(option1);
      this.toUnitSelect.add(option2);
    }
    
    // Set defaults
    const unitIds = Object.keys(units);
    if (!this.fromUnitSelect.value && unitIds.length > 0) {
      this.fromUnitSelect.value = unitIds[0];
    }
    if (!this.toUnitSelect.value && unitIds.length > 1) {
      this.toUnitSelect.value = unitIds[1];
    }
  }
  
  private onCategoryChange() {
    this.currentCategory = this.categorySelect.value as UnitCategory;
    this.updateUnitOptions();
    this.performConversion();
    this.saveState();
  }
  
  private performConversion() {
    const inputValue = parseFloat(this.fromValueInput.value);
    
    if (isNaN(inputValue)) {
      this.toValueInput.value = '';
      return;
    }
    
    const units = unitCategories[this.currentCategory];
    const fromUnit = units[this.fromUnitSelect.value];
    const toUnit = units[this.toUnitSelect.value];
    
    if (!fromUnit || !toUnit) {
      this.toValueInput.value = 'Invalid unit';
      return;
    }
    
    try {
      const result = convert(inputValue, fromUnit, toUnit);
      this.toValueInput.value = formatResult(result);
    } catch (error) {
      console.error('Conversion error:', error);
      this.toValueInput.value = 'Error';
    }
  }
  
  private swapUnits() {
    const fromValue = this.fromValueInput.value;
    const fromUnit = this.fromUnitSelect.value;
    const toUnit = this.toUnitSelect.value;
    
    this.fromValueInput.value = this.toValueInput.value;
    this.fromUnitSelect.value = toUnit;
    this.toUnitSelect.value = fromUnit;
    
    this.performConversion();
    this.saveState();
  }
  
  private async copyResult() {
    const result = this.toValueInput.value;
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result);
      this.showStatus('Copied!');
      setTimeout(() => this.showStatus(''), 2000);
    } catch (error) {
      this.showStatus('Failed to copy');
    }
  }
  
  private showStatus(message: string) {
    this.statusMessage.textContent = message;
  }
  
  private async saveState() {
    const prefs = {
      lastCategory: this.currentCategory,
      lastFromUnit: this.fromUnitSelect.value,
      lastToUnit: this.toUnitSelect.value,
      favoriteConversions: [],
    };
    await savePreferences(prefs);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new UnitConverterPopup().init();
});
```

### Content Script Overlay (content-script/content-script.ts)

```typescript
// Content script for in-page conversion overlay
// Allows users to select text on any page and convert units

interface SelectionContext {
  text: string;
  number: number;
  unit: string | null;
}

document.addEventListener('mouseup', (event: MouseEvent) => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  
  const selectedText = selection.toString().trim();
  const context = parseSelectionContext(selectedText);
  
  if (context && context.number !== null) {
    showConversionPopup(event.clientX, event.clientY, context);
  }
});

function parseSelectionContext(text: string): SelectionContext | null {
  // Match patterns like "100 km" or "5.5 miles"
  const match = text.match(/^([\d.,]+)\s*([a-zA-Z°]+)$/);
  if (!match) return null;
  
  const number = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(number)) return null;
  
  return {
    text,
    number,
    unit: match[2].toLowerCase(),
  };
}

function showConversionPopup(x: number, y: number, context: SelectionContext) {
  // Remove existing popup
  const existing = document.getElementById('unit-converter-overlay');
  if (existing) existing.remove();
  
  const popup = document.createElement('div');
  popup.id = 'unit-converter-overlay';
  popup.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    background: white;
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    max-width: 300px;
  `;
  
  popup.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 8px;">
      Convert: ${context.text}
    </div>
    <div id="conversion-results"></div>
  `;
  
  document.body.appendChild(popup);
  
  // Position popup
  const rect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  let left = x;
  let top = y + 10;
  
  if (left + rect.width > viewportWidth) {
    left = viewportWidth - rect.width - 10;
  }
  if (top + rect.height > viewportHeight) {
    top = y - rect.height - 10;
  }
  
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
  
  // Close on click outside
  setTimeout(() => {
    document.addEventListener('click', () => popup.remove(), { once: true });
  }, 100);
}
```

## Chrome APIs and Permissions

### Required Permissions

For this extension, we need minimal permissions:

```json
{
  "permissions": [
    "storage"
  ],
  "host_permissions": []
}
```

### Storage API Usage

The `chrome.storage.local` API provides persistent storage that syncs across user's Chrome instances when logged in:

```typescript
// Reading with callback
chrome.storage.local.get('key', (result) => {
  console.log(result.key);
});

// Reading with Promise (using wrapper)
const getValue = (key: string): Promise<any> => {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => resolve(result[key]));
  });
};

// Writing
chrome.storage.local.set({ key: 'value' }, () => {
  console.log('Saved');
});
```

### Message Passing

Communication between popup, background script, and content scripts:

```typescript
// From popup to background
chrome.runtime.sendMessage(
  { type: 'CONVERT_UNITS', payload: { value: 100, from: 'm', to: 'ft' } },
  (response) => {
    console.log('Result:', response.result);
  }
);

// In background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONVERT_UNITS') {
    const result = performConversion(message.payload);
    sendResponse({ result });
  }
  return true; // Keep message channel open for async response
});
```

## State Management Patterns

### Using chrome.storage.local

State is persisted using Chrome's storage API:

```typescript
interface AppState {
  category: UnitCategory;
  units: { from: string; to: string };
  recentConversions: Array<{value: number; from: string; to: string; result: number}>;
}

const DEFAULT_STATE: AppState = {
  category: 'length',
  units: { from: 'meter', to: 'foot' },
  recentConversions: [],
};

class StateManager {
  private state: AppState = { ...DEFAULT_STATE };
  private listeners: Array<(state: AppState) => void> = [];
  
  async init() {
    const stored = await this.load();
    this.state = { ...DEFAULT_STATE, ...stored };
    this.notifyListeners();
  }
  
  subscribe(listener: (state: AppState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  update(partial: Partial<AppState>) {
    this.state = { ...this.state, ...partial };
    this.save();
    this.notifyListeners();
  }
  
  private notifyListeners() {
    this.listeners.forEach(l => l(this.state));
  }
  
  private load(): Promise<Partial<AppState>> {
    return new Promise((resolve) => {
      chrome.storage.local.get('appState', (result) => {
        resolve(result.appState || {});
      });
    });
  }
  
  private save() {
    chrome.storage.local.set({ appState: this.state });
  }
}
```

## Error Handling and Edge Cases

### Input Validation

```typescript
function validateInput(value: string): { valid: boolean; value: number; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, value: 0, error: 'Please enter a value' };
  }
  
  const cleaned = value.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) {
    return { valid: false, value: 0, error: 'Invalid number format' };
  }
  
  if (!isFinite(num)) {
    return { valid: false, value: 0, error: 'Number out of range' };
  }
  
  if (Math.abs(num) > Number.MAX_SAFE_INTEGER) {
    return { valid: false, value: 0, error: 'Number too large' };
  }
  
  return { valid: true, value: num };
}
```

### Overflow/Underflow Handling

```typescript
function safeConvert(value: number, fromUnit: Unit, toUnit: Unit): number | null {
  try {
    // Check for potential overflow
    const baseValue = fromUnit.toBase(value);
    if (!isFinite(baseValue)) return null;
    
    const result = toUnit.fromBase(baseValue);
    if (!isFinite(result)) return null;
    
    // Check for reasonable bounds
    const MIN_VALUE = 1e-15;
    const MAX_VALUE = 1e15;
    
    if (Math.abs(result) < MIN_VALUE && result !== 0) return 0;
    if (Math.abs(result) > MAX_VALUE) return null;
    
    return result;
  } catch (error) {
    console.error('Conversion error:', error);
    return null;
  }
}
```

### Error Boundary Pattern

```typescript
class ConversionErrorBoundary {
  private errors: Array<{ timestamp: number; error: Error; context: any }> = [];
  
  wrap<T>(fn: () => T, context: any): T | null {
    try {
      return fn();
    } catch (error) {
      this.errors.push({
        timestamp: Date.now(),
        error: error as Error,
        context,
      });
      this.reportError(error as Error, context);
      return null;
    }
  }
  
  private reportError(error: Error, context: any) {
    // Log to console during development
    console.error('Conversion error:', error.message, context);
    
    // Could also send to error tracking service
    // chrome.runtime.sendMessage({ type: 'ERROR_REPORT', error: {...} });
  }
}
```

## Testing Approach

### Unit Tests (Jest)

```typescript
// tests/conversion.test.ts
import { convert, formatResult, lengthUnits } from '../shared/conversion';

describe('Unit Conversion', () => {
  describe('Length conversions', () => {
    test('converts meters to feet', () => {
      const result = convert(1, lengthUnits.meter, lengthUnits.foot);
      expect(result).toBeCloseTo(3.28084, 4);
    });
    
    test('converts kilometers to miles', () => {
      const result = convert(1, lengthUnits.kilometer, lengthUnits.mile);
      expect(result).toBeCloseTo(0.621371, 4);
    });
    
    test('handles zero value', () => {
      const result = convert(0, lengthUnits.meter, lengthUnits.foot);
      expect(result).toBe(0);
    });
  });
  
  describe('Temperature conversions', () => {
    test('converts Celsius to Fahrenheit (freezing point)', () => {
      const result = convert(0, lengthUnits.celsius, lengthUnits.fahrenheit);
      expect(result).toBe(32);
    });
    
    test('converts Celsius to Fahrenheit (boiling point)', () => {
      const result = convert(100, lengthUnits.celsius, lengthUnits.fahrenheit);
      expect(result).toBe(212);
    });
  });
  
  describe('formatResult', () => {
    test('formats small numbers in scientific notation', () => {
      const result = formatResult(0.00001);
      expect(result).toContain('e');
    });
    
    test('formats regular numbers with fixed precision', () => {
      const result = formatResult(123.456789);
      expect(result).toBe('123.4568');
    });
  });
});
```

### Integration Tests with Puppeteer

```typescript
// tests/integration.test.ts
import puppeteer from 'puppeteer';

describe('Extension Integration Tests', () => {
  let browser: puppeteer.Browser;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('popup renders correctly', async () => {
    const page = await browser.newPage();
    
    // Load extension
    const extensionPath = path.resolve(__dirname, '../../');
    await page.goto(`chrome-extension://${extensionPath}/popup/popup.html`);
    
    // Check title
    const title = await page.title();
    expect(title).toBe('Unit Converter');
    
    // Check category dropdown exists
    const categorySelect = await page.$('#category');
    expect(categorySelect).not.toBeNull();
  });
});
```

## Performance Considerations

### Lazy Loading

Load conversion logic only when needed:

```typescript
// Lazy load unit categories
const unitCategories: Record<string, Unit> = {};

async function getUnitsForCategory(category: UnitCategory): Promise<Record<string, Unit>> {
  if (unitCategories[category]) {
    return unitCategories[category];
  }
  
  // Dynamic import for large conversion tables
  const module = await import(`../shared/conversions/${category}.js`);
  unitCategories[category] = module.default;
  return unitCategories[category];
}
```

### Service Worker Optimization

Minimize service worker wake-ups:

```typescript
// In service worker - use declarative net request for blocking
// Instead of programmatic request interception

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  // Preload commonly used conversions
  preloadConversionData();
});

function preloadConversionData() {
  // Load frequently used units into memory
  // Avoids storage API calls during conversions
}
```

### Popup Performance

```typescript
// Optimize popup rendering
class OptimizedPopup {
  private renderScheduled = false;
  
  scheduleRender() {
    if (this.renderScheduled) return;
    
    this.renderScheduled = true;
    requestAnimationFrame(() => {
      this.doRender();
      this.renderScheduled = false;
    });
  }
  
  private doRender() {
    // Actual rendering logic
  }
}
```

## Publishing Checklist

### Pre-publication

- [ ] Test in Chrome, Edge, and Firefox (if cross-browser)
- [ ] Verify all icons at required sizes (16, 48, 128px)
- [ ] Check for console errors in background and popup
- [ ] Test with dev mode and packaged extension
- [ ] Verify storage persistence works correctly
- [ ] Test keyboard navigation and accessibility
- [ ] Review privacy practices and data handling

### Chrome Web Store Submission

1. Create ZIP package:
   ```bash
   zip -r unit-converter.zip manifest.json popup/ background/ shared/ icons/ content-script/
   ```

2. Store Listing Details:
   - Title: "Unit Converter"
   - Description: Clear, concise explanation
   - Category: Utilities
   - Screenshots: At least one 1280x800 or 640x400
   - Small promo tile: 440x280

3. Privacy Practices:
   - Answer all privacy questionnaire questions
   - If using storage, explain data usage
   - No remote code or external scripts

4. Submit for Review:
   - Upload ZIP to Chrome Web Store
   - Pay one-time developer fee ($5)
   - Submit for review (usually 1-3 days)

### Post-publication

- [ ] Monitor for user feedback and reviews
- [ ] Track crashes and errors via chrome.runtime.lastError
- [ ] Plan for regular updates
- [ ] Set up update notifications

## Summary

This guide covered building a complete Unit Converter Chrome extension with:

- Manifest V3 architecture with proper file organization
- TypeScript for type safety and maintainable code
- Popup UI for quick conversions
- Content script for in-page overlay conversions
- Chrome Storage API for state persistence
- Robust error handling for edge cases
- Testing strategies including unit and integration tests
- Performance optimizations for fast execution
- Publishing checklist for Chrome Web Store submission

The extension demonstrates core Chrome extension patterns that can be extended for more complex functionality like currency conversion, unit favorites, conversion history, and more.
