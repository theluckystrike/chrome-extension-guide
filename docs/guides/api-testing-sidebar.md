# API Testing Sidebar Chrome Extension

A comprehensive guide to building a professional API testing sidebar extension using Chrome's Side Panel API, TypeScript, and modern extension architecture patterns.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Manifest Configuration](#manifest-configuration)
- [Core TypeScript Implementation](#core-typescript-implementation)
- [UI Design Patterns](#ui-design-patterns)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Testing Approach](#testing-approach)
- [Performance Optimization](#performance-optimization)
- [Publishing Checklist](#publishing-checklist)

---

## Architecture Overview

API testing sidebar extensions provide developers with quick access to HTTP request testing directly within the browser's side panel. This architecture leverages Chrome's Side Panel API (Manifest V3) to provide a persistent, non-intrusive interface that works alongside any webpage.

### Core Components

```
api-tester-sidebar/
├── manifest.json           # Extension manifest (MV3)
├── background/
│   └── service-worker.ts   # Background service worker
├── sidepanel/
│   ├── sidepanel.html      # Sidebar UI
│   ├── sidepanel.ts        # Sidebar logic
│   └── styles.css          # Component styles
├── content-script/
│   └── interceptor.ts      # Request interception
├── shared/
│   ├── types.ts            # Shared TypeScript types
│   ├── http-client.ts      # HTTP request executor
│   └── storage.ts          # Storage utilities
└── icons/                  # Extension icons
```

---

## Manifest Configuration

The manifest.json defines the extension's capabilities, permissions, and entry points. For an API testing sidebar, we need careful permission management.

```json
{
  "manifest_version": 3,
  "name": "API Tester Sidebar",
  "version": "1.0.0",
  "description": "Professional API testing tool in your browser sidebar",
  "permissions": [
    "sidePanel",
    "storage",
    "scripting",
    "activeTab",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_title": "Open API Tester"
  },
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### Permission Rationale

- **sidePanel**: Required to use the Side Panel API
- **storage**: Persist request history and user preferences
- **scripting**: Inject content scripts for request interception
- **activeTab**: Access current tab context for page interaction
- **tabs**: Read tab URLs and manage tab state
- **host_permissions**: `<all_urls>` needed for making requests to any domain

---

## Core TypeScript Implementation

### Shared Types (shared/types.ts)

```typescript
export interface HttpRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  url: string;
  headers: Record<string, string>;
  body?: string;
  contentType?: string;
}

export interface HttpResponse {
  id: string;
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  size: number;
  timestamp: number;
}

export interface RequestHistory {
  requests: HttpRequest[];
  responses: Map<string, HttpResponse>;
}

export interface ExtensionSettings {
  timeout: number;
  followRedirects: boolean;
  validateSsl: boolean;
  defaultHeaders: Record<string, string>;
}

export type RequestStatus = 'pending' | 'loading' | 'success' | 'error';

export interface SidebarState {
  currentRequest: HttpRequest | null;
  response: HttpResponse | null;
  history: RequestHistory;
  settings: ExtensionSettings;
  isLoading: boolean;
  error: string | null;
}
```

### HTTP Client (shared/http-client.ts)

```typescript
import { HttpRequest, HttpResponse } from './types';

export class HttpClient {
  private static instance: HttpClient;

  static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient();
    }
    return HttpClient.instance;
  }

  async execute(request: HttpRequest, timeout = 30000): Promise<HttpResponse> {
    const requestId = crypto.randomUUID();
    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions: RequestInit = {
        method: request.method,
        headers: request.headers,
        signal: controller.signal,
      };

      if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        fetchOptions.body = request.body;
      }

      const response = await fetch(request.url, fetchOptions);
      clearTimeout(timeoutId);

      const endTime = performance.now();
      const responseBody = await response.text();
      const responseHeaders: Record<string, string> = {};

      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        id: crypto.randomUUID(),
        requestId,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        duration: Math.round(endTime - startTime),
        size: new Blob([responseBody]).size,
        timestamp: Date.now(),
      };
    } catch (error) {
      const endTime = performance.now();
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw new Error(`Request failed: ${error.message}`);
      }
      throw new Error('Unknown error occurred');
    }
  }

  parseHeaders(headerString: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const lines = headerString.trim().split('\n');
    
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }
    
    return headers;
  }
}
```

### Storage Manager (shared/storage.ts)

```typescript
import { HttpRequest, HttpResponse, ExtensionSettings } from './types';

const STORAGE_KEYS = {
  HISTORY: 'api_tester_history',
  SETTINGS: 'api_tester_settings',
  SESSIONS: 'api_tester_sessions',
} as const;

const DEFAULT_SETTINGS: ExtensionSettings = {
  timeout: 30000,
  followRedirects: true,
  validateSsl: true,
  defaultHeaders: {
    'User-Agent': 'API-Tester-Sidebar/1.0',
  },
};

export class StorageManager {
  static async saveRequest(request: HttpRequest): Promise<void> {
    const history = await this.getHistory();
    history.requests.unshift(request);
    
    // Keep only last 100 requests
    if (history.requests.length > 100) {
      history.requests = history.requests.slice(0, 100);
    }
    
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
  }

  static async saveResponse(response: HttpResponse): Promise<void> {
    const history = await this.getHistory();
    history.responses.set(response.requestId, response);
    await chrome.storage.local.set({ 
      [STORAGE_KEYS.HISTORY]: {
        requests: history.requests,
        responses: Object.fromEntries(history.responses),
      }
    });
  }

  static async getHistory(): Promise<RequestHistory> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    const stored = result[STORAGE_KEYS.HISTORY];
    
    if (stored) {
      return {
        requests: stored.requests || [],
        responses: new Map(Object.entries(stored.responses || {})),
      };
    }
    
    return { requests: [], responses: new Map() };
  }

  static async getSettings(): Promise<ExtensionSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  }

  static async saveSettings(settings: ExtensionSettings): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  }

  static async clearHistory(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.HISTORY);
  }
}
```

---

## UI Design Patterns

### Side Panel HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Tester</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="sidebar-container">
    <header class="sidebar-header">
      <h1>API Tester</h1>
      <button id="settings-btn" class="icon-btn" aria-label="Settings">
        ⚙️
      </button>
    </header>

    <section class="request-builder">
      <div class="method-url-row">
        <select id="method-select" class="method-select">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
          <option value="HEAD">HEAD</option>
          <option value="OPTIONS">OPTIONS</option>
        </select>
        <input 
          type="text" 
          id="url-input" 
          class="url-input" 
          placeholder="Enter request URL"
        >
      </div>

      <div class="tabs">
        <button class="tab active" data-tab="headers">Headers</button>
        <button class="tab" data-tab="body">Body</button>
        <button class="tab" data-tab="params">Params</button>
      </div>

      <div id="headers-panel" class="tab-panel active">
        <textarea 
          id="headers-input" 
          class="code-input" 
          placeholder="Content-Type: application/json&#10;Authorization: Bearer token"
        ></textarea>
      </div>

      <div id="body-panel" class="tab-panel">
        <textarea 
          id="body-input" 
          class="code-input" 
          placeholder='{"key": "value"}'
        ></textarea>
      </div>

      <button id="send-btn" class="send-btn">Send Request</button>
    </section>

    <section id="response-section" class="response-section">
      <div class="response-meta">
        <span id="status-badge" class="status-badge"></span>
        <span id="response-time" class="response-meta-item"></span>
        <span id="response-size" class="response-meta-item"></span>
      </div>
      
      <div class="response-tabs">
        <button class="tab active" data-tab="response-body">Response</button>
        <button class="tab" data-tab="response-headers">Headers</button>
      </div>

      <div id="response-body-panel" class="tab-panel active">
        <pre id="response-body" class="response-body"></pre>
      </div>

      <div id="response-headers-panel" class="tab-panel">
        <pre id="response-headers" class="response-body"></pre>
      </div>
    </section>
  </div>

  <script type="module" src="sidepanel.ts"></script>
</body>
</html>
```

### Side Panel TypeScript Implementation

```typescript
import { HttpRequest, HttpResponse } from '../shared/types';
import { HttpClient } from '../shared/http-client';
import { StorageManager } from '../shared/storage';

class SidebarController {
  private httpClient: HttpClient;
  private elements: Record<string, HTMLElement> = {};

  constructor() {
    this.httpClient = HttpClient.getInstance();
    this.initializeElements();
    this.attachEventListeners();
    this.loadHistory();
  }

  private initializeElements(): void {
    const ids = [
      'method-select', 'url-input', 'headers-input', 'body-input',
      'send-btn', 'status-badge', 'response-time', 'response-size',
      'response-body', 'response-headers'
    ];
    
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) this.elements[id] = el;
    });
  }

  private attachEventListeners(): void {
    const sendBtn = this.elements['send-btn'] as HTMLButtonElement;
    sendBtn?.addEventListener('click', () => this.handleSendRequest());

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e));
    });

    // Keyboard shortcut: Cmd/Ctrl + Enter to send
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        this.handleSendRequest();
      }
    });
  }

  private async handleSendRequest(): Promise<void> {
    const methodSelect = this.elements['method-select'] as HTMLSelectElement;
    const urlInput = this.elements['url-input'] as HTMLInputElement;
    const headersInput = this.elements['headers-input'] as HTMLTextAreaElement;
    const bodyInput = this.elements['body-input'] as HTMLTextAreaElement;

    const method = methodSelect.value as HttpRequest['method'];
    const url = urlInput.value.trim();

    if (!url) {
      this.showError('Please enter a URL');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.showError('Please enter a valid URL');
      return;
    }

    this.setLoading(true);

    const request: HttpRequest = {
      id: crypto.randomUUID(),
      name: url,
      method,
      url,
      headers: this.httpClient.parseHeaders(headersInput.value),
      body: bodyInput.value || undefined,
    };

    try {
      const settings = await StorageManager.getSettings();
      const response = await this.httpClient.execute(request, settings.timeout);
      
      await StorageManager.saveRequest(request);
      await StorageManager.saveResponse(response);
      
      this.displayResponse(response);
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Request failed');
    } finally {
      this.setLoading(false);
    }
  }

  private displayResponse(response: HttpResponse): void {
    const statusBadge = this.elements['status-badge'];
    const responseTime = this.elements['response-time'];
    const responseSize = this.elements['response-size'];
    const responseBody = this.elements['response-body'];
    const responseHeaders = this.elements['response-headers'];

    statusBadge.textContent = `${response.status} ${response.statusText}`;
    statusBadge.className = `status-badge status-${Math.floor(response.status / 100)}xx`;
    
    responseTime.textContent = `${response.duration}ms`;
    responseSize.textContent = this.formatSize(response.size);
    
    // Try to format JSON response
    try {
      const json = JSON.parse(response.body);
      responseBody.textContent = JSON.stringify(json, null, 2);
    } catch {
      responseBody.textContent = response.body;
    }

    responseHeaders.textContent = Object.entries(response.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  private switchTab(e: Event): void {
    const target = e.target as HTMLElement;
    const tabName = target.dataset.tab;
    const parent = target.closest('.tabs, .response-tabs');
    
    parent?.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    target.classList.add('active');

    const panels = document.querySelectorAll(`[id$="-panel"]`);
    panels.forEach(p => p.classList.remove('active'));
    
    const activePanel = document.getElementById(`${tabName}-panel`);
    activePanel?.classList.add('active');
  }

  private setLoading(loading: boolean): void {
    const btn = this.elements['send-btn'] as HTMLButtonElement;
    btn.disabled = loading;
    btn.textContent = loading ? 'Sending...' : 'Send Request';
  }

  private showError(message: string): void {
    const statusBadge = this.elements['status-badge'];
    statusBadge.textContent = message;
    statusBadge.className = 'status-badge status-error';
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private async loadHistory(): Promise<void> {
    const history = await StorageManager.getHistory();
    console.log('Loaded history:', history.requests.length, 'requests');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SidebarController();
});
```

---

## Chrome APIs and Permissions

### Service Worker Setup (background/service-worker.ts)

```typescript
// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('API Tester Sidebar installed');
  }
});

// Handle side panel toggle from popup/icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

// Message passing between contexts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_REQUEST') {
    // Handle cross-context request execution
    handleExecuteRequest(message.payload)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function handleExecuteRequest(request: unknown): Promise<HttpResponse> {
  // Implementation
  return {} as HttpResponse;
}
```

---

## State Management

The extension uses a combination of Chrome Storage API and in-memory state management. For complex applications, consider using a state management library like Zustand or building a custom pub/sub system.

### Event-Based Communication Pattern

```typescript
type EventCallback<T = unknown> = (data: T) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on<T>(event: string, callback: EventCallback<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<T>(event: string, callback: EventCallback<T>): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<T>(event: string, data: T): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

export const eventBus = new EventBus();
```

---

## Error Handling

### Comprehensive Error Handling Strategy

```typescript
class ErrorHandler {
  static handleApiError(error: unknown, context: string): string {
    console.error(`Error in ${context}:`, error);
    
    if (error instanceof TypeError) {
      return 'Network error: Please check your internet connection';
    }
    
    if (error instanceof SyntaxError) {
      return 'Invalid response format received';
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }

  static isRetryable(error: string): boolean {
    const retryablePatterns = [
      'timeout',
      'network',
      'ECONNRESET',
      'ETIMEDOUT',
    ];
    
    return retryablePatterns.some(pattern => 
      error.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}
```

---

## Testing Approach

### Unit Testing with Vitest

```typescript
import { describe, it, expect, vi } from 'vitest';
import { HttpClient } from '../shared/http-client';

describe('HttpClient', () => {
  it('should execute GET request successfully', async () => {
    const client = HttpClient.getInstance();
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      text: () => Promise.resolve('{"success": true}'),
    });

    const result = await client.execute({
      id: '1',
      name: 'test',
      method: 'GET',
      url: 'https://api.example.com/test',
      headers: {},
    });

    expect(result.status).toBe(200);
  });

  it('should handle request timeout', async () => {
    const client = HttpClient.getInstance();
    
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 10)
      )
    );

    await expect(
      client.execute({ id: '1', name: 'test', method: 'GET', url: 'https://example.com', headers: {} }, 5)
    ).rejects.toThrow('timeout');
  });
});
```

### Integration Testing

Use Chrome's testing APIs and Playwright for end-to-end testing of the sidebar functionality.

---

## Performance Optimization

### Key Optimizations

1. **Lazy Loading**: Load heavy components only when needed
2. **Request Debouncing**: Debounce input changes to reduce re-renders
3. **Virtual Scrolling**: For large response bodies or history lists
4. **Caching**: Cache parsed responses and templates
5. **Web Workers**: Offload heavy JSON parsing to web workers

```typescript
// Debounce utility
function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

---

## Publishing Checklist

Before publishing to Chrome Web Store:

- [ ] Test in incognito mode
- [ ] Verify all permissions are necessary
- [ ] Add meaningful icons (16, 48, 128px)
- [ ] Write clear description
- [ ] Take screenshots for listing
- [ ] Set up OAuth for analytics (optional)
- [ ] Create privacy policy if needed
- [ ] Test with all host permissions
- [ ] Verify manifest.json syntax
- [ ] Run Chrome Lighthouse extension audit

### Building for Production

```bash
# Build with TypeScript
npx tsc

# Package with web-ext or manual zip
npx web-ext build

# Verify with Chrome Extension Test
npx chrome-extension-test
```

---

## Conclusion

Building an API testing sidebar extension requires careful consideration of Chrome's extension architecture, security permissions, and user experience. This guide covered the essential patterns for creating a professional-grade extension using Manifest V3, TypeScript, and modern web technologies.

Key takeaways:
- Use the Side Panel API for persistent sidebar functionality
- Implement proper error handling and retry logic
- Keep permissions minimal and specific
- Test extensively across different scenarios
- Follow Chrome Web Store guidelines for publishing

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, [Stripe integration](https://theluckystrike.github.io/extension-monetization-playbook/monetization/stripe-integration), subscription architecture, and [API monetization strategies](https://theluckystrike.github.io/extension-monetization-playbook/monetization/api-monetization) for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
