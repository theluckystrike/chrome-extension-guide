# Building a Network Request Logger Chrome Extension

A network request logger captures and displays HTTP requests made by the browser, enabling developers to debug API calls, monitor traffic, and analyze network behavior. This guide covers building a production-ready Network Request Logger extension using Chrome's webRequest API and modern TypeScript patterns.

## Architecture Overview

The extension consists of three main components: service worker (central hub for webRequest events), content scripts (page overlays), and popup/side panel (UI display).

```
          
  Content Script   Service Worker   Popup/Side Panel
  (Page Overlay)        (Event Handler)        (UI Display)   
          
                               
                               
                        
                          chrome.storage  
                          (Persistence)   
                        
```

## Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Network Request Logger",
  "version": "1.0.0",
  "description": "Capture, analyze, and debug network requests",
  "permissions": ["webRequest", "storage", "tabs"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.js", "type": "module" },
  "action": { "default_popup": "popup/popup.html" },
  "side_panel": { "default_path": "sidepanel/sidepanel.html" },
  "icons": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
}
```

## Core TypeScript Implementation

### Types

```typescript
// src/types/network.ts
export interface NetworkRequest {
  id: string; tabId: number; url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  requestHeaders: Record<string, string>; responseHeaders: Record<string, string>;
  statusCode: number; statusText: string;
  requestBodySize: number; responseBodySize: number; duration: number;
  startTime: number; endTime: number; type: ResourceType; initiator: string; error?: string;
}
export type ResourceType = 'main_frame' | 'sub_frame' | 'stylesheet' | 'script' | 'image' | 'font' | 'object' | 'xmlhttprequest' | 'ping' | 'csp_report' | 'media' | 'websocket' | 'other';
export interface FilterOptions { urlPattern?: string; methods?: string[]; statusCodes?: number[]; types?: ResourceType[]; tabId?: number; }
export interface LoggerConfig { maxRequests: number; captureRequestBody: boolean; autoRecord: boolean; filters: FilterOptions; }
```

### Service Worker

```typescript
// src/background/service-worker.ts
import type { NetworkRequest, LoggerConfig } from '../types/network';

class NetworkLogger {
  private requests: Map<string, NetworkRequest> = new Map();
  private config: LoggerConfig = { maxRequests: 1000, captureRequestBody: false, autoRecord: true, filters: {} };

  constructor() { this.initializeListeners(); }

  private initializeListeners(): void {
    chrome.webRequest.onBeforeRequest.addListener(this.handleBeforeRequest.bind(this), { urls: ['<all_urls>'] }, ['requestBody']);
    chrome.webRequest.onBeforeSendHeaders.addListener(this.handleBeforeSendHeaders.bind(this), { urls: ['<all_urls>'] }, ['requestHeaders']);
    chrome.webRequest.onHeadersReceived.addListener(this.handleHeadersReceived.bind(this), { urls: ['<all_urls>'] }, ['responseHeaders']);
    chrome.webRequest.onCompleted.addListener(this.handleCompleted.bind(this), { urls: ['<all_urls>'] });
    chrome.webRequest.onErrorOccurred.addListener(this.handleError.bind(this), { urls: ['<all_urls>'] });
  }

  private generateRequestId(): string { return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; }

  private handleBeforeRequest(details: chrome.webRequest.WebRequestDetails, body?: chrome.webRequest.HttpBody): void {
    const request: NetworkRequest = {
      id: this.generateRequestId(), tabId: details.tabId, url: details.url,
      method: (details.method || 'GET') as NetworkRequest['method'],
      requestHeaders: {}, responseHeaders: {}, statusCode: 0, statusText: '',
      requestBodySize: body?.raw?.[0]?.bytes?.byteLength || 0, responseBodySize: 0, duration: 0,
      startTime: details.timeStamp, endTime: 0, type: details.type as NetworkRequest['type'], initiator: details.initiator || '',
    };
    this.requests.set(details.requestId, request);
    this.pruneOldRequests();
  }

  private handleBeforeSendHeaders(details: chrome.webRequest.WebRequestDetails, headers?: chrome.webRequest.HttpHeaders): void {
    const request = this.requests.get(details.requestId);
    if (request && headers) request.requestHeaders = headers.reduce((acc, h) => { if (h.name) acc[h.name] = h.value || ''; return acc; }, {} as Record<string, string>);
  }

  private handleHeadersReceived(details: chrome.webRequest.WebRequestDetails, headers?: chrome.webRequest.HttpHeaders): void {
    const request = this.requests.get(details.requestId);
    if (request && headers) request.responseHeaders = headers.reduce((acc, h) => { if (h.name) acc[h.name] = h.value || ''; return acc; }, {} as Record<string, string>);
  }

  private handleCompleted(details: chrome.webRequest.WebRequestDetails): void {
    const request = this.requests.get(details.requestId);
    if (request) { request.statusCode = details.statusCode; request.statusText = details.statusLine?.split(' ').slice(1).join(' ') || ''; request.endTime = details.timeStamp; request.duration = request.endTime - request.startTime; this.broadcastUpdate(request); }
  }

  private handleError(details: chrome.webRequest.WebRequestDetails): void {
    const request = this.requests.get(details.requestId);
    if (request) { request.error = details.error || 'Unknown error'; request.endTime = details.timeStamp; request.duration = request.endTime - request.startTime; this.broadcastUpdate(request); }
  }

  private broadcastUpdate(request: NetworkRequest): void {
    chrome.runtime.sendMessage({ type: 'NETWORK_REQUEST_UPDATE', payload: request }).catch(() => {});
    chrome.tabs.sendMessage(request.tabId, { type: 'NETWORK_REQUEST_UPDATE', payload: request }).catch(() => {});
  }

  private pruneOldRequests(): void {
    if (this.requests.size > this.config.maxRequests) {
      const sortedIds = Array.from(this.requests.keys()).sort((a, b) => this.requests.get(b)!.startTime - this.requests.get(a)!.startTime);
      sortedIds.slice(this.config.maxRequests).forEach(id => this.requests.delete(id));
    }
  }

  public getRequests(): NetworkRequest[] { return Array.from(this.requests.values()).sort((a, b) => b.startTime - a.startTime); }
  public clearRequests(): void { this.requests.clear(); }
}

const logger = new NetworkLogger();
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'GET_REQUESTS': sendResponse({ requests: logger.getRequests() }); break;
    case 'CLEAR_REQUESTS': logger.clearRequests(); sendResponse({ success: true }); break;
  }
  return true;
});
```

## UI Design (Popup)

```typescript
// src/popup/popup.ts
import type { NetworkRequest, FilterOptions } from '../types/network';

class PopupController {
  private requests: NetworkRequest[] = []; private filterOptions: FilterOptions = {};
  constructor() { this.init(); }

  private async init(): Promise<void> { await this.loadRequests(); this.setupEventListeners(); this.render(); }

  private async loadRequests(): Promise<void> {
    const response = await chrome.runtime.sendMessage({ type: 'GET_REQUESTS' });
    this.requests = response.requests || [];
  }

  private setupEventListeners(): void {
    document.getElementById('clear-btn')?.addEventListener('click', async () => {
      await chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' });
      this.requests = []; this.render();
    });
    document.getElementById('filter-input')?.addEventListener('input', (e) => {
      this.filterOptions.urlPattern = (e.target as HTMLInputElement).value;
      this.render();
    });
  }

  private render(): void {
    const container = document.getElementById('requests-list');
    if (!container) return;
    const filtered = this.filterOptions.urlPattern ? this.requests.filter(r => new RegExp(this.filterOptions.urlPattern!, 'i').test(r.url)) : this.requests;
    container.innerHTML = filtered.slice(0, 50).map(req => `
      <div class="request-item ${req.statusCode >= 400 ? 'error' : ''}">
        <span class="method">${req.method}</span>
        <span class="url">${this.truncateUrl(req.url)}</span>
        <span class="status ${this.getStatusClass(req.statusCode)}">${req.statusCode || '...'}</span>
        <span class="duration">${req.duration}ms</span>
      </div>
    `).join('');
  }

  private truncateUrl(url: string, maxLength = 40): string {
    try { const urlObj = new URL(url); const path = urlObj.pathname + urlObj.search; return path.length > maxLength ? path.substring(0, maxLength) + '...' : path; } catch { return url.substring(0, maxLength); }
  }

  private getStatusClass(statusCode: number): string {
    if (statusCode === 0) return 'pending'; if (statusCode < 300) return 'success'; if (statusCode < 400) return 'redirect'; if (statusCode < 500) return 'client-error'; return 'server-error';
  }
}
document.addEventListener('DOMContentLoaded', () => new PopupController());
```

## Chrome APIs and Permissions

| Permission | Purpose |
|------------|---------|
| `webRequest` | Observe network requests (required) |
| `webRequestBlocking` | Block/modify requests (optional) |
| `storage` | Persist configuration and cached requests |
| `tabs` | Communicate with tab-specific content scripts |
| `host_permissions` | `<all_urls>` or specific patterns |

webRequest is observe-only in MV3. Use declarativeNetRequest for blocking capabilities.

## State Management

```typescript
// src/background/storage.ts
import type { LoggerConfig } from '../types/network';
export class StorageManager {
  async saveConfig(config: LoggerConfig): Promise<void> { await chrome.storage.local.set({ loggerConfig: config }); }
  async loadConfig(): Promise<LoggerConfig | null> { const result = await chrome.storage.local.get('loggerConfig'); return result.loggerConfig || null; }
  async clearCache(): Promise<void> { await chrome.storage.local.remove(['cachedRequests', 'sessionData']); }
}
```

## Error Handling

```typescript
// src/utils/error-handler.ts
export class ErrorHandler {
  public static handleWebRequestError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('webRequest')) return 'WebRequest API error: Check permissions';
      return error.message;
    }
    return 'Unknown error';
  }
  public static async handleStorageError(operation: () => Promise<void>): Promise<void> {
    try { await operation(); } catch (error) {
      if (error instanceof Error && error.message.includes('QUOTA_BYTES')) {
        console.warn('Storage quota exceeded, clearing old data');
        await chrome.storage.local.remove('cachedRequests');
        await operation();
      } else { throw error; }
    }
  }
}
```

## Testing Strategy

Unit tests with Jest:
```typescript
describe('NetworkLogger', () => {
  let logger: NetworkLogger;
  beforeEach(() => { logger = new NetworkLogger(); });
  test('should generate unique request IDs', () => {
    const id1 = logger['generateRequestId'](); const id2 = logger['generateRequestId']();
    expect(id1).not.toBe(id2);
  });
  test('should prune old requests when limit exceeded', () => {
    for (let i = 0; i < 1005; i++) {
      logger['requests'].set(`req-${i}`, {
        id: `req-${i}`, tabId: 1, url: 'http://example.com', method: 'GET',
        requestHeaders: {}, responseHeaders: {}, statusCode: 200, statusText: 'OK',
        requestBodySize: 0, responseBodySize: 0, duration: 100,
        startTime: Date.now() - i, endTime: Date.now(), type: 'other', initiator: ''
      } as any);
    }
    logger['pruneOldRequests']();
    expect(logger['requests'].size).toBeLessThanOrEqual(1000);
  });
});
```

## Performance Considerations

1. Debounce message passing - Batch updates every 100ms instead of individual messages
2. Limit in-memory storage - Prune requests beyond configured maximum (default 1000)
3. Use Maps for O(1) lookups - Efficient request ID lookups
4. Lazy load details - Fetch full request details only when expanded
5. Virtualize long lists - Use virtualization for 1000+ items in UI

## Publishing Checklist

- [ ] Manifest version 3 with all required fields
- [ ] Minimal permissions - only request what's needed
- [ ] Icons in required sizes (16, 48, 128)
- [ ] Privacy policy if accessing user data
- [ ] Clear description and screenshots
- [ ] Testing across Chrome, Edge, and Brave
- [ ] No console errors or warnings
- [ ] Service worker handles lifecycle events
- [ ] Extension works after reload

## Conclusion

Building a network request logger requires careful consideration of Chrome's MV3 architecture. Use webRequest for observation, implement proper TypeScript typing, design for service worker lifecycle management, consider privacy implications, and test thoroughly across browsers. This guide provides a production-ready foundation for capturing network traffic efficiently while maintaining good performance.
