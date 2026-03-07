# Time Zone Converter Extension Guide

## Overview

This guide covers building a production-ready Chrome extension for converting time zones. We'll explore architecture, implementation patterns, and best practices using TypeScript and Manifest V3.

## Architecture and Manifest.json Setup

### Project Structure

```
timezone-converter/
├── src/
│   ├── manifest.json
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── styles.css
│   ├── background/
│   │   └── background.ts
│   ├── content/
│   │   └── content.ts
│   ├── shared/
│   │   ├── types.ts
│   │   ├── timezone.ts
│   │   └── storage.ts
│   └── utils/
│       └── logger.ts
├── tsconfig.json
├── webpack.config.js
└── package.json
```

### Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "Time Zone Converter",
  "version": "1.0.0",
  "description": "Convert times between different time zones",
  "permissions": [
    "storage",
    "alarms",
    "notifications"
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
    "service_worker": "background/background.js",
    "type": "module"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/content.js"],
    "run_at": "document_idle"
  }],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## Core Implementation with TypeScript

### Type Definitions

```typescript
// src/shared/types.ts

export interface TimeZoneInfo {
  id: string;
  name: string;
  offset: number; // offset in minutes from UTC
  abbreviation: string;
}

export interface ConversionResult {
  original: {
    time: Date;
    timezone: string;
  };
  converted: {
    time: Date;
    timezone: string;
    offset: number;
  };
}

export interface SavedLocation {
  id: string;
  name: string;
  timezone: string;
  isFavorite: boolean;
}

export interface AppState {
  locations: SavedLocation[];
  homeTimezone: string;
  selectedDate: string;
  selectedTime: string;
  use24HourFormat: boolean;
}
```

### Time Zone Logic

```typescript
// src/shared/timezone.ts

import { TimeZoneInfo, ConversionResult } from './types';

export const COMMON_TIMEZONES: TimeZoneInfo[] = [
  { id: 'UTC', name: 'UTC', offset: 0, abbreviation: 'UTC' },
  { id: 'America/New_York', name: 'New York', offset: -300, abbreviation: 'EST' },
  { id: 'America/Los_Angeles', name: 'Los Angeles', offset: -480, abbreviation: 'PST' },
  { id: 'Europe/London', name: 'London', offset: 0, abbreviation: 'GMT' },
  { id: 'Europe/Paris', name: 'Paris', offset: 60, abbreviation: 'CET' },
  { id: 'Asia/Tokyo', name: 'Tokyo', offset: 540, abbreviation: 'JST' },
  { id: 'Asia/Shanghai', name: 'Shanghai', offset: 480, abbreviation: 'CST' },
  { id: 'Australia/Sydney', name: 'Sydney', offset: 660, abbreviation: 'AEST' },
];

export function getTimezoneById(id: string): TimeZoneInfo | undefined {
  return COMMON_TIMEZONES.find(tz => tz.id === id);
}

export function convertTimezone(
  date: Date,
  fromTimezone: string,
  toTimezone: string
): ConversionResult {
  const fromTz = getTimezoneById(fromTimezone);
  const toTz = getTimezoneById(toTimezone);
  
  if (!fromTz || !toTz) {
    throw new Error('Invalid timezone specified');
  }
  
  // Get UTC time first
  const utcTime = new Date(date.toISOString());
  
  // Calculate offset difference and apply
  const offsetDiff = toTz.offset - fromTz.offset;
  const convertedTime = new Date(utcTime.getTime() + offsetDiff * 60000);
  
  return {
    original: { time: date, timezone: fromTimezone },
    converted: {
      time: convertedTime,
      timezone: toTimezone,
      offset: toTz.offset
    }
  };
}

export function formatTime(date: Date, use24Hour: boolean): string {
  return use24Hour
    ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
```

## UI Design Patterns

### Popup Implementation

```typescript
// src/popup/popup.ts

import { AppState, SavedLocation } from '../shared/types';
import { convertTimezone, COMMON_TIMEZONES, formatTime } from '../shared/timezone';
import { StorageManager } from '../shared/storage';

class PopupController {
  private storage: StorageManager;
  private state: AppState;
  
  constructor() {
    this.storage = new StorageManager();
    this.state = this.getDefaultState();
    this.init();
  }
  
  private getDefaultState(): AppState {
    return {
      locations: [],
      homeTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      selectedDate: new Date().toISOString().split('T')[0],
      selectedTime: '12:00',
      use24HourFormat: false
    };
  }
  
  private async init(): Promise<void> {
    await this.loadState();
    this.render();
    this.bindEvents();
  }
  
  private async loadState(): Promise<void> {
    const saved = await this.storage.get<AppState>('appState');
    this.state = { ...this.getDefaultState(), ...saved };
  }
  
  private async saveState(): Promise<void> {
    await this.storage.set('appState', this.state);
  }
  
  private render(): void {
    this.renderTimezoneSelects();
    this.renderLocations();
    this.updateConversion();
  }
  
  private renderTimezoneSelects(): void {
    const selects = document.querySelectorAll('.timezone-select');
    selects.forEach(select => {
      if (select instanceof HTMLSelectElement) {
        COMMON_TIMEZONES.forEach(tz => {
          const option = document.createElement('option');
          option.value = tz.id;
          option.textContent = `${tz.name} (${tz.abbreviation})`;
          select.appendChild(option);
        });
      }
    });
  }
  
  private renderLocations(): void {
    const container = document.getElementById('locations-list');
    if (!container) return;
    
    container.innerHTML = this.state.locations.map(loc => `
      <div class="location-item" data-id="${loc.id}">
        <span>${loc.name}</span>
        <span>${loc.timezone}</span>
        <button class="remove-btn" data-id="${loc.id}">×</button>
      </div>
    `).join('');
  }
  
  private updateConversion(): void {
    const dateInput = document.getElementById('date-input') as HTMLInputElement;
    const timeInput = document.getElementById('time-input') as HTMLInputElement;
    const fromSelect = document.getElementById('from-timezone') as HTMLSelectElement;
    const toSelect = document.getElementById('to-timezone') as HTMLSelectElement;
    const resultDiv = document.getElementById('result');
    
    if (!dateInput || !timeInput || !fromSelect || !toSelect || !resultDiv) return;
    
    const dateTime = new Date(`${dateInput.value}T${timeInput.value}`);
    const result = convertTimezone(dateTime, fromSelect.value, toSelect.value);
    
    resultDiv.textContent = formatTime(result.converted.time, this.state.use24HourFormat);
  }
  
  private bindEvents(): void {
    document.getElementById('convert-btn')?.addEventListener('click', () => {
      this.updateConversion();
    });
    
    document.getElementById('add-location-btn')?.addEventListener('click', async () => {
      await this.addCurrentAsLocation();
    });
  }
  
  private async addCurrentAsLocation(): Promise<void> {
    const location: SavedLocation = {
      id: crypto.randomUUID(),
      name: 'New Location',
      timezone: 'UTC',
      isFavorite: false
    };
    
    this.state.locations.push(location);
    await this.saveState();
    this.renderLocations();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
```

### Content Script Overlay

```typescript
// src/content/content.ts

interface PageTimeElement {
  element: Element;
  originalText: string;
  timezone: string;
}

class TimeOverlay {
  private observedElements: PageTimeElement[] = [];
  private userTimezone: string = 'UTC';
  
  constructor() {
    this.init();
  }
  
  private async init(): Promise<void> {
    // Get user's selected timezone from storage
    const result = await chrome.storage.local.get('userTimezone');
    this.userTimezone = result.userTimezone || 'UTC';
    
    this.scanAndObserve();
  }
  
  private scanAndObserve(): void {
    // Find elements that might contain times
    const timeSelectors = [
      'time',
      '[datetime]',
      '.timestamp',
      '.time',
      '[data-time]'
    ];
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node instanceof Element) {
              this.processElement(node);
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Initial scan
    document.querySelectorAll(timeSelectors.join(', ')).forEach(el => {
      this.processElement(el);
    });
  }
  
  private processElement(element: Element): void {
    // Check if it's a datetime element
    const datetime = element.getAttribute('datetime');
    if (datetime) {
      this.enhanceTimeElement(element, datetime);
    }
    
    // Check for inline times
    const text = element.textContent || '';
    const timeMatch = text.match(/\d{1,2}:\d{2}(?:\s*(?:AM|PM))?/i);
    if (timeMatch) {
      this.addConversionTooltip(element);
    }
  }
  
  private enhanceTimeElement(element: Element, datetime: string): void {
    const date = new Date(datetime);
    if (isNaN(date.getTime())) return;
    
    // Add tooltip with conversions
    element.title = `Click to see time zone conversions`;
    element.addEventListener('click', (e) => {
      e.preventDefault();
      this.showConversionPopup(date, element);
    });
  }
  
  private addConversionTooltip(element: Element): void {
    element.classList.add('tz-convertible');
    element.addEventListener('mouseenter', () => {
      // Show quick conversion on hover
    });
  }
  
  private showConversionPopup(date: Date, anchor: Element): void {
    // Create and show popup
    const popup = document.createElement('div');
    popup.className = 'tz-popup';
    popup.innerHTML = `
      <div class="tz-popup-header">Time Zone Conversions</div>
      <div class="tz-popup-content">
        <div>UTC: ${date.toUTCString()}</div>
        <div>Local: ${date.toLocaleString()}</div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // Position near anchor element
    const rect = anchor.getBoundingClientRect();
    popup.style.top = `${rect.bottom + window.scrollY}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;
    
    // Remove on click outside
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!popup.contains(e.target as Node)) {
          popup.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 100);
  }
}

new TimeOverlay();
```

## Chrome APIs and Permissions

### Storage Pattern

```typescript
// src/shared/storage.ts

export class StorageManager {
  private cache: Map<string, unknown> = new Map();
  
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }
    
    // Fall back to chrome.storage
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        const value = result[key] as T | undefined;
        if (value !== undefined) {
          this.cache.set(key, value);
          resolve(value);
        } else {
          resolve(null);
        }
      });
    });
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }
  
  async remove(key: string): Promise<void> {
    this.cache.delete(key);
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve();
      });
    });
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}
```

### Alarms for Scheduled Updates

```typescript
// src/background/background.ts

chrome.alarms.create('updateTimezones', {
  periodInMinutes: 60
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateTimezones') {
    // Update timezone data
    updateTimezoneData();
  }
});

function updateTimezoneData(): void {
  // Refresh any cached timezone information
  chrome.storage.local.get('timezoneCache', (result) => {
    const cache = result.timezoneCache || {};
    const now = Date.now();
    
    // Check if cache is stale (older than 24 hours)
    if (cache.timestamp && now - cache.timestamp > 24 * 60 * 60 * 1000) {
      // Refresh timezone data
      refreshTimezoneData();
    }
  });
}
```

## State Management Patterns

### Redux-like Pattern with TypeScript

```typescript
// src/shared/store.ts

type Action<T = unknown> = {
  type: string;
  payload?: T;
};

type Reducer<S, A extends Action = Action> = (state: S, action: A) => S;

type Listener = () => void;

export class Store<S> {
  private state: S;
  private reducers: Map<string, Reducer<S>> = new Map();
  private listeners: Set<Listener> = new Set();
  
  constructor(private initialState: S) {
    this.state = initialState;
  }
  
  getState(): S {
    return this.state;
  }
  
  dispatch(action: Action): void {
    const reducer = this.reducers.get(action.type);
    if (reducer) {
      this.state = reducer(this.state, action);
      this.notify();
    }
  }
  
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
  
  registerReducer(type: string, reducer: Reducer<S>): void {
    this.reducers.set(type, reducer);
  }
}

// Action creators
export const setLocations = (locations: SavedLocation[]): Action<SavedLocation[]> => ({
  type: 'SET_LOCATIONS',
  payload: locations
});

export const addLocation = (location: SavedLocation): Action<SavedLocation> => ({
  type: 'ADD_LOCATION',
  payload: location
});

export const removeLocation = (id: string): Action<string> => ({
  type: 'REMOVE_LOCATION',
  payload: id
});
```

## Error Handling and Edge Cases

```typescript
// src/utils/errors.ts

export class TimezoneError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'TimezoneError';
  }
}

export function handleTimezoneError(error: unknown): string {
  if (error instanceof TimezoneError) {
    console.error(`Timezone Error [${error.code}]:`, error.message);
    return error.recoverable
      ? 'Unable to convert time. Please check your timezone settings.'
      : 'A critical error occurred. Please reinstall the extension.';
  }
  
  if (error instanceof RangeError) {
    return 'Invalid date or time format provided.';
  }
  
  console.error('Unexpected error:', error);
  return 'An unexpected error occurred.';
}

// Edge case handlers
export function handleDSTTransition(date: Date, timezone: string): void {
  // Check for DST boundaries
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  
  const janOffset = jan.getTimezoneOffset();
  const julOffset = jul.getTimezoneOffset();
  const currentOffset = date.getTimezoneOffset();
  
  if (currentOffset !== janOffset && currentOffset !== julOffset) {
    // We're in a DST transition period
    console.warn('Date falls within DST transition period');
  }
}

export function handleInvalidTimezone(timezone: string): TimezoneError {
  return new TimezoneError(
    `Invalid timezone: ${timezone}`,
    'INVALID_TIMEZONE',
    true
  );
}
```

## Testing Approach

### Unit Tests with Jest

```typescript
// __tests__/timezone.test.ts

import { convertTimezone, COMMON_TIMEZONES, formatTime } from '../src/shared/timezone';

describe('Timezone Conversion', () => {
  test('converts UTC to EST correctly', () => {
    const utcDate = new Date('2024-01-15T12:00:00Z');
    const result = convertTimezone(utcDate, 'UTC', 'America/New_York');
    
    expect(result.converted.time.getHours()).toBe(7);
  });
  
  test('handles same timezone conversion', () => {
    const date = new Date('2024-01-15T12:00:00');
    const result = convertTimezone(date, 'America/New_York', 'America/New_York');
    
    expect(result.original.time.getTime()).toBe(result.converted.time.getTime());
  });
});

describe('formatTime', () => {
  test('formats 24-hour time correctly', () => {
    const date = new Date('2024-01-15T14:30:00');
    expect(formatTime(date, true)).toBe('14:30');
  });
  
  test('formats 12-hour time correctly', () => {
    const date = new Date('2024-01-15T14:30:00');
    expect(formatTime(date, false)).toMatch(/2:30/);
  });
});
```

### Integration Testing

```typescript
// __tests__/integration.test.ts

import { StorageManager } from '../src/shared/storage';

describe('Storage Integration', () => {
  let storage: StorageManager;
  
  beforeEach(() => {
    storage = new StorageManager();
    chrome.storage.local.clear();
  });
  
  test('saves and retrieves data', async () => {
    await storage.set('testKey', { value: 'testValue' });
    const result = await storage.get('testKey');
    
    expect(result).toEqual({ value: 'testValue' });
  });
});
```

## Performance Considerations

### Optimization Strategies

```typescript
// Performance optimizations

// 1. Lazy load timezone data
const timezoneCache = new Map<string, LazyLoadedTimezone>();

function getTimezoneData(id: string): TimeZoneInfo {
  if (timezoneCache.has(id)) {
    return timezoneCache.get(id)!;
  }
  
  const data = loadTimezoneData(id); // Expensive operation
  timezoneCache.set(id, data);
  return data;
}

// 2. Debounce user input
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// 3. Memoize conversions
const conversionCache = new Map<string, ConversionResult>();

function memoizedConvert(
  date: Date,
  from: string,
  to: string
): ConversionResult {
  const key = `${date.toISOString()}-${from}-${to}`;
  
  if (conversionCache.has(key)) {
    return conversionCache.get(key)!;
  }
  
  const result = convertTimezone(date, from, to);
  conversionCache.set(key, result);
  
  return result;
}

// 4. Use requestAnimationFrame for UI updates
function updateUI(state: AppState): void {
  requestAnimationFrame(() => {
    render(state);
  });
}
```

## Publishing Checklist

### Pre-submission Requirements

- [ ] Update `manifest.json` version number
- [ ] Replace placeholder icons with actual icons (16, 48, 128px)
- [ ] Add screenshots for Chrome Web Store (1280x800)
- [ ] Write privacy policy if storing user data
- [ ] Test in Chrome, Edge, and Brave
- [ ] Verify all permissions are necessary
- [ ] Check for console errors
- [ ] Test offline functionality

### Submission Steps

1. Package extension: `npm run build && zip -r extension.zip dist/`
2. Open [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Create new item and upload ZIP
4. Fill in store listing details
5. Submit for review

### Post-publication

- Monitor error reports in Developer Dashboard
- Set up update notifications for users
- Track user reviews and respond promptly
- Maintain backwards compatibility

## Conclusion

This guide covered the essential components for building a production-ready Chrome extension. Key takeaways:

1. Use TypeScript for type safety and better developer experience
2. Implement clean architecture with separated concerns
3. Handle errors gracefully with user-friendly messages
4. Test thoroughly before submission
5. Follow Chrome Web Store guidelines for successful publication
