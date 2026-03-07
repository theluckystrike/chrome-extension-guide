# Building a URL Shortener Chrome Extension

A URL shortener extension is a practical project that demonstrates many Chrome extension concepts: popup interaction, background service workers, content scripts, Chrome storage APIs, and external API communication. This guide walks through building a production-ready URL shortener extension using TypeScript and Manifest V3.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Manifest Configuration](#manifest-configuration)
- [Core TypeScript Implementation](#core-typescript-implementation)
- [UI Design Patterns](#ui-design-patterns)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Testing Approach](#testing-approach)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

## Architecture Overview

A URL shortener extension typically consists of three main components:

1. **Popup** - Primary user interface for entering URLs and viewing results
2. **Service Worker** - Handles API calls, storage, and background processing
3. **Content Script** - Optional overlay for context-menu shortening on pages

### Recommended Directory Structure

```
url-shortener/
├── manifest.json
├── package.json
├── tsconfig.json
├── src/
│   ├── background/
│   │   ├── index.ts          # Service worker entry point
│   │   ├── shorten.ts        # URL shortening logic
│   │   └── storage.ts        # Storage management
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts          # Popup entry point
│   │   ├── components/
│   │   │   ├── ShortenerForm.ts
│   │   │   ├── ShortLinkList.ts
│   │   │   └── CopyButton.ts
│   │   └── styles/
│   │       └── popup.css
│   ├── content/
│   │   └── overlay.ts        # In-page overlay script
│   ├── shared/
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── constants.ts      # Shared constants
│   │   └── utils.ts          # Utility functions
│   └── types/
│       └── global.d.ts       # Type declarations
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── dist/                     # Build output
```

---

## Manifest Configuration

The manifest.json defines the extension's capabilities and permissions. For a URL shortener using external APIs, you'll need careful permission configuration.

```json
{
  "manifest_version": 3,
  "name": "QuickShort - URL Shortener",
  "version": "1.0.0",
  "description": "Quickly shorten URLs with one click",
  "permissions": [
    "storage",
    "contextMenus",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://api.example.com/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/overlay.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### Permission Explanation

| Permission | Purpose |
|------------|---------|
| `storage` | Save shortened URLs and user preferences |
| `contextMenus` | Add right-click menu for URL shortening |
| `activeTab` | Access current tab's URL when needed |
| `scripting` | Inject content scripts for overlays |
| `host_permissions` | Allow API calls to shortener service |

---

## Core TypeScript Implementation

### Shared Types

Define TypeScript interfaces for type safety across contexts:

```typescript
// src/shared/types.ts

export interface ShortenedUrl {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  createdAt: number;
  clicks: number;
}

export interface ShortenerApiResponse {
  success: boolean;
  data?: {
    shortCode: string;
    shortUrl: string;
  };
  error?: string;
}

export interface ExtensionSettings {
  defaultService: 'bitly' | 'tinyurl' | 'custom';
  customApiEndpoint?: string;
  autoCopy: boolean;
  showNotifications: boolean;
}

export interface MessagePayload {
  action: 'shorten' | 'getHistory' | 'clearHistory' | 'updateSettings';
  payload?: unknown;
}

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}
```

### Background Service Worker

The service worker handles API calls and storage:

```typescript
// src/background/index.ts

import { shortenUrl } from './shorten';
import { getHistory, clearHistory, saveToHistory } from './storage';
import { MessagePayload, MessageResponse } from '../shared/types';

const DEFAULT_API = 'https://api.tinyurl.com/create';

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener(
  (message: MessagePayload, sender, sendResponse: (response: MessageResponse) => void) => {
    (async () => {
      try {
        let result: MessageResponse;

        switch (message.action) {
          case 'shorten': {
            const url = message.payload as string;
            if (!isValidUrl(url)) {
              throw new Error('Invalid URL provided');
            }
            const shortUrl = await shortenUrl(url);
            await saveToHistory({ originalUrl: url, shortUrl });
            result = { success: true, data: { shortUrl } };
            break;
          }

          case 'getHistory': {
            const history = await getHistory();
            result = { success: true, data: history };
            break;
          }

          case 'clearHistory': {
            await chrome.storage.local.remove('urlHistory');
            result = { success: true };
            break;
          }

          default:
            throw new Error(`Unknown action: ${message.action}`);
        }

        sendResponse(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        sendResponse({ success: false, error: errorMessage });
      }
    })();

    return true; // Keep message channel open for async response
  }
);

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Initialize context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'shortenUrl',
    title: 'Shorten this URL',
    contexts: ['page', 'link']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'shortenUrl') {
    const urlToShorten = info.linkUrl || info.pageUrl;
    if (urlToShorten) {
      try {
        const shortUrl = await shortenUrl(urlToShorten);
        await chrome.clipboard.writeText(shortUrl);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'URL Shortened',
          message: `Copied to clipboard: ${shortUrl}`
        });
      } catch (error) {
        console.error('Failed to shorten URL:', error);
      }
    }
  }
});
```

### URL Shortening Logic

```typescript
// src/background/shorten.ts

import { ShortenerApiResponse } from '../shared/types';

const API_ENDPOINTS = {
  tinyurl: 'https://api.tinyurl.com/create',
  bitly: 'https://api-ssl.bitly.com/v4/shorten'
};

export async function shortenUrl(
  url: string,
  service: 'tinyurl' | 'bitly' = 'tinyurl',
  apiToken?: string
): Promise<string> {
  const endpoint = API_ENDPOINTS[service];
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {})
    },
    body: JSON.stringify({
      url,
      ...(service === 'tinyurl' ? { 'domain': 'tinyurl.com' } : {})
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }

  const data: ShortenerApiResponse = await response.json();

  if (!data.data?.shortUrl) {
    throw new Error('Failed to extract short URL from response');
  }

  return data.data.shortUrl;
}
```

### Storage Management

```typescript
// src/background/storage.ts

import { ShortenedUrl } from '../shared/types';

const STORAGE_KEY = 'urlHistory';
const MAX_HISTORY_ITEMS = 100;

export async function saveToHistory(entry: { originalUrl: string; shortUrl: string }): Promise<void> {
  const history = await getHistory();
  
  const newEntry: ShortenedUrl = {
    id: generateId(),
    originalUrl: entry.originalUrl,
    shortCode: extractShortCode(entry.shortUrl),
    shortUrl: entry.shortUrl,
    createdAt: Date.now(),
    clicks: 0
  };

  history.unshift(newEntry);

  // Limit history size
  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
  
  await chrome.storage.local.set({ [STORAGE_KEY]: trimmedHistory });
}

export async function getHistory(): Promise<ShortenedUrl[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function extractShortCode(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace('/', '');
  } catch {
    return url;
  }
}
```

---

## UI Design Patterns

### Popup Component Structure

```typescript
// src/popup/popup.ts

import './styles/popup.css';
import { ShortenerForm } from './components/ShortenerForm';
import { ShortLinkList } from './components/ShortLinkList';

document.addEventListener('DOMContentLoaded', async () => {
  const app = document.getElementById('app');
  if (!app) return;

  const form = new ShortenerForm();
  const list = new ShortLinkList();

  app.appendChild(form.render());
  app.appendChild(list.render());

  // Load history
  const history = await loadHistory();
  list.updateHistory(history);
});

async function loadHistory(): Promise<unknown[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getHistory' }, (response) => {
      if (response.success) {
        resolve(response.data as unknown[]);
      } else {
        resolve([]);
      }
    });
  });
}
```

### Form Component

```typescript
// src/popup/components/ShortenerForm.ts

export class ShortenerForm {
  private form: HTMLFormElement;
  private input: HTMLInputElement;
  private submitButton: HTMLButtonElement;
  private resultContainer: HTMLDivElement;
  private loading = false;

  constructor() {
    this.form = document.createElement('form');
    this.input = document.createElement('input');
    this.submitButton = document.createElement('button');
    this.resultContainer = document.createElement('div');
    
    this.setupElements();
    this.attachEvents();
  }

  private setupElements(): void {
    this.form.className = 'shortener-form';
    
    this.input.type = 'url';
    this.input.placeholder = 'Enter URL to shorten...';
    this.input.required = true;
    this.input.className = 'url-input';
    
    this.submitButton.type = 'submit';
    this.submitButton.textContent = 'Shorten';
    this.submitButton.className = 'submit-button';
    
    this.resultContainer.className = 'result-container';
    
    this.form.appendChild(this.input);
    this.form.appendChild(this.submitButton);
    this.form.appendChild(this.resultContainer);
  }

  private attachEvents(): void {
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
  }

  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();
    
    if (this.loading) return;
    
    const url = this.input.value.trim();
    if (!url) return;

    this.setLoading(true);
    this.clearResult();

    try {
      const response = await this.sendShortenRequest(url);
      
      if (response.success) {
        this.displayResult(response.data.shortUrl);
        this.input.value = '';
      } else {
        this.displayError(response.error || 'Failed to shorten URL');
      }
    } catch (error) {
      this.displayError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.setLoading(false);
    }
  }

  private sendShortenRequest(url: string): Promise<{
    success: boolean;
    data?: { shortUrl: string };
    error?: string;
  }> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'shorten', payload: url },
        (response) => resolve(response as { success: boolean; data?: { shortUrl: string }; error?: string })
      );
    });
  }

  private setLoading(loading: boolean): void {
    this.loading = loading;
    this.submitButton.disabled = loading;
    this.submitButton.textContent = loading ? 'Shortening...' : 'Shorten';
  }

  private clearResult(): void {
    this.resultContainer.innerHTML = '';
    this.resultContainer.className = 'result-container';
  }

  private displayResult(shortUrl: string): void {
    this.resultContainer.className = 'result-container success';
    this.resultContainer.innerHTML = `
      <div class="result-content">
        <input type="text" readonly value="${shortUrl}" class="short-url" />
        <button type="button" class="copy-button" data-url="${shortUrl}">Copy</button>
      </div>
    `;
    
    const copyButton = this.resultContainer.querySelector('.copy-button');
    copyButton?.addEventListener('click', () => {
      navigator.clipboard.writeText(shortUrl);
      copyButton.textContent = 'Copied!';
      setTimeout(() => copyButton.textContent = 'Copy', 2000);
    });
  }

  private displayError(message: string): void {
    this.resultContainer.className = 'result-container error';
    this.resultContainer.textContent = message;
  }

  render(): HTMLFormElement {
    return this.form;
  }
}
```

### Content Script Overlay

For an in-page overlay that appears when text is selected:

```typescript
// src/content/overlay.ts

interface SelectionState {
  selectedText: string;
  x: number;
  y: number;
}

let currentSelection: SelectionState | null = null;

document.addEventListener('mouseup', (e: MouseEvent) => {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  
  if (text && isValidUrl(text)) {
    currentSelection = {
      selectedText: text,
      x: e.clientX,
      y: e.clientY
    };
    showOverlay(text, e.clientX, e.clientY);
  }
});

document.addEventListener('mousedown', (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.url-shortener-overlay')) {
    hideOverlay();
  }
});

function showOverlay(url: string, x: number, y: number): void {
  hideOverlay();
  
  const overlay = document.createElement('div');
  overlay.className = 'url-shortener-overlay';
  overlay.style.cssText = `left: ${x}px; top: ${y}px;`;
  
  const button = document.createElement('button');
  button.className = 'shorten-button';
  button.textContent = 'Shorten URL';
  
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Shortening...';
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'shorten',
        payload: url
      });
      
      if (response.success) {
        await navigator.clipboard.writeText(response.data.shortUrl);
        button.textContent = 'Copied!';
      } else {
        button.textContent = 'Error';
      }
    } catch {
      button.textContent = 'Error';
    }
    
    setTimeout(hideOverlay, 2000);
  });
  
  overlay.appendChild(button);
  document.body.appendChild(overlay);
}

function hideOverlay(): void {
  document.querySelectorAll('.url-shortener-overlay').forEach(el => el.remove());
}

function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
```

---

## State Management

### Using Chrome Storage API

The Chrome Storage API provides automatic synchronization across contexts:

```typescript
// src/shared/utils.ts

import { ExtensionSettings } from './types';

const DEFAULT_SETTINGS: ExtensionSettings = {
  defaultService: 'tinyurl',
  autoCopy: true,
  showNotifications: true
};

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...result.settings };
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.sync.set({
    settings: { ...current, ...settings }
  });
}
```

---

## Error Handling

### Service Worker Error Handling

```typescript
// Global error handler for service worker
self.onerror = (event) => {
  console.error('Service worker error:', event.error);
  
  // Log to storage for debugging
  chrome.storage.local.set({
    lastError: {
      message: event.error?.message || 'Unknown error',
      stack: event.error?.stack,
      timestamp: Date.now()
    }
  });
};

self.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Notify user of failures
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: 'Extension Error',
    message: 'An unexpected error occurred. Check extension logs.'
  });
};
```

### Network Error Handling

```typescript
async function shortenWithRetry(
  url: string,
  maxRetries = 3,
  delay = 1000
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await shortenUrl(url);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }
  
  throw lastError;
}
```

---

## Testing Approach

### Unit Testing with Vitest

```typescript
// tests/storage.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { getHistory, saveToHistory, clearHistory } from '../src/background/storage';

describe('Storage', () => {
  beforeEach(async () => {
    await clearHistory();
  });

  it('should save and retrieve URL history', async () => {
    await saveToHistory({
      originalUrl: 'https://example.com',
      shortUrl: 'https://tinyurl.com/abc123'
    });

    const history = await getHistory();
    
    expect(history).toHaveLength(1);
    expect(history[0].originalUrl).toBe('https://example.com');
    expect(history[0].shortUrl).toBe('https://tinyurl.com/abc123');
  });

  it('should limit history to 100 items', async () => {
    for (let i = 0; i < 150; i++) {
      await saveToHistory({
        originalUrl: `https://example.com/${i}`,
        shortUrl: `https://tinyurl.com/${i}`
      });
    }

    const history = await getHistory();
    expect(history).toHaveLength(100);
  });
});
```

### Integration Testing

Use Playwright to test the popup UI:

```typescript
// tests/popup.test.ts

import { test, expect } from '@playwright/test';

test('popup shortens URL', async ({ page }) => {
  // Load extension popup
  await page.goto('chrome-extension://<extension-id>/popup/popup.html');
  
  // Enter URL
  await page.fill('input.url-input', 'https://example.com/very/long/url');
  
  // Submit form
  await page.click('button.submit-button');
  
  // Wait for result
  await expect(page.locator('.result-container.success')).toBeVisible();
  
  // Verify short URL is displayed
  const shortUrl = await page.inputValue('.short-url');
  expect(shortUrl).toContain('tinyurl.com');
});
```

---

## Performance Considerations

### Service Worker Lifecycle

The Manifest V3 service worker has a lifetime of about 30 seconds of idle time. Handle this carefully:

```typescript
// Use chrome.alarms to keep service worker alive for critical tasks
import { keepAlive } from './keepAlive';

// At the start of your service worker
keepAlive();

// keepAlive.ts
export function keepAlive(): void {
  chrome.alarms.create('keepAlive', { delayInMinutes: 0.1 });
  
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
      chrome.alarms.create('keepAlive', { delayInMinutes: 0.1 });
    }
  });
}
```

### Memory Management

```typescript
// Clean up listeners and DOM references in content scripts
function cleanup(): void {
  chrome.runtime.onMessage.removeListener(handleMessage);
  document.removeEventListener('scroll', handleScroll);
  
  // Remove any injected elements
  document.querySelectorAll('.url-shortener-overlay').forEach(el => el.remove());
}

// Run cleanup when navigating away
navigation.addEventListener('navigate', cleanup);
```

---

## Publishing Checklist

Before publishing to the Chrome Web Store, ensure:

### Required Items
- [ ] Complete `manifest.json` with all required fields
- [ ] At least one 128x128 icon (PNG format)
- [ ] Privacy policy URL (for extensions with permissions)
- [ ] Store listing screenshots (at least 1, recommended 4-8)
- [ ] Detailed description explaining permissions

### Manifest Requirements
- [ ] Set appropriate `host_permissions` (specific domains, not `<all_urls>`)
- [ ] Use minimal permissions - only what's needed
- [ ] Set `manifest_version`: 3
- [ ] Include `action` or `background` (or both)

### Code Quality
- [ ] No console errors in background or popup
- [ ] Handle all API errors gracefully
- [ ] Test on Chrome, Edge, and Brave
- [ ] Verify service worker doesn't crash on load

### Testing Checklist
- [ ] Test right-click context menu functionality
- [ ] Verify storage sync works across devices
- [ ] Test with slow network connections
- [ ] Verify extension works after browser restart

### Submission
1. Zip the extension root directory (exclude `node_modules`, `.git`, etc.)
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the zip file
4. Complete store listing details
5. Submit for review

---

## Conclusion

Building a URL shortener extension demonstrates core Chrome extension development concepts including:

- **Multi-context architecture** with popup, background, and content scripts
- **Chrome APIs** for storage, context menus, and notifications
- **TypeScript** for type-safe development
- **Modern UI patterns** with component-based design
- **Error handling** and edge case management

This foundation can be extended with features like:
- Multiple shortener service support
- URL analytics and click tracking
- Custom short codes
- Bookmark integration
- Cloud sync across devices
