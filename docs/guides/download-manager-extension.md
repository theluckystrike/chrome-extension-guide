# Building a Download Manager Chrome Extension

A comprehensive guide to building a production-ready Download Manager extension with TypeScript, modern UI patterns, and robust state management.

## Overview

A Download Manager extension provides enhanced download capabilities beyond Chrome's built-in download manager, including:
- Queue management with priority ordering
- Pause/resume functionality for large files
- Batch download support
- Download history and categorization
- Speed monitoring and bandwidth control
- Integration with cloud storage services

## Architecture and manifest.json Setup

### Project Structure

```
download-manager/
├── manifest.json
├── tsconfig.json
├── webpack.config.js
├── src/
│   ├── background/
│   │   ├── service-worker.ts
│   │   ├── download-manager.ts
│   │   └── storage.ts
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   ├── components/
│   │   ├── DownloadItem.ts
│   │   ├── DownloadQueue.ts
│   │   └── ProgressBar.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── logger.ts
│       └── formatters.ts
└── assets/
    └── icons/
```

### manifest.json Configuration

```json
{
  "manifest_version": 3,
  "name": "Advanced Download Manager",
  "version": "1.0.0",
  "description": "A powerful download manager with queue management and pause/resume support",
  "permissions": [
    "downloads",
    "storage",
    "tabs",
    "notifications",
    "unlimitedStorage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },
  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

## Core Implementation with TypeScript

### Type Definitions

```typescript
// src/types/index.ts

export type DownloadStatus = 
  | 'pending' 
  | 'downloading' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface DownloadItem {
  id: number;
  chromeId?: number;
  url: string;
  filename: string;
  status: DownloadStatus;
  progress: number;
  bytesReceived: number;
  totalBytes: number;
  speed: number;
  startTime: number;
  endTime?: number;
  error?: string;
  retries: number;
  priority: number;
  mimeType?: string;
}

export interface DownloadQueue {
  items: DownloadItem[];
  maxConcurrent: number;
  isProcessing: boolean;
}

export interface DownloadOptions {
  url: string;
  filename?: string;
  saveAs?: boolean;
  headers?: Array<{ name: string; value: string }>;
  priority?: number;
}
```

### Download Manager Service

```typescript
// src/background/download-manager.ts

import { DownloadItem, DownloadOptions, DownloadStatus } from '../types';

class DownloadManager {
  private queue: Map<number, DownloadItem> = new Map();
  private maxConcurrent = 3;
  private listeners: Set<(items: DownloadItem[]) => void> = new Set();

  async addDownload(options: DownloadOptions): Promise<number> {
    const item: DownloadItem = {
      id: Date.now() + Math.random(),
      url: options.url,
      filename: options.filename || this.extractFilename(options.url),
      status: 'pending',
      progress: 0,
      bytesReceived: 0,
      totalBytes: -1,
      speed: 0,
      startTime: Date.now(),
      retries: 0,
      priority: options.priority || 0
    };

    this.queue.set(item.id, item);
    this.notifyListeners();
    this.processQueue();
    
    return item.id;
  }

  async startDownload(itemId: number): Promise<void> {
    const item = this.queue.get(itemId);
    if (!item || item.status !== 'pending' && item.status !== 'paused') {
      throw new Error('Invalid download state');
    }

    item.status = 'downloading';
    this.notifyListeners();

    try {
      const chromeId = await this.initiateChromeDownload(item);
      item.chromeId = chromeId;
      this.queue.set(itemId, item);
    } catch (error) {
      item.status = 'failed';
      item.error = (error as Error).message;
      this.notifyListeners();
    }
  }

  private async initiateChromeDownload(item: DownloadItem): Promise<number> {
    return new Promise((resolve, reject) => {
      chrome.downloads.download({
        url: item.url,
        filename: item.filename,
        conflictAction: 'uniquify'
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (downloadId) {
          resolve(downloadId);
        } else {
          reject(new Error('Download failed to start'));
        }
      });
    });
  }

  async pauseDownload(itemId: number): Promise<void> {
    const item = this.queue.get(itemId);
    if (!item || item.status !== 'downloading') return;

    if (item.chromeId) {
      await chrome.downloads.pause(item.chromeId);
      item.status = 'paused';
      this.notifyListeners();
    }
  }

  async resumeDownload(itemId: number): Promise<void> {
    const item = this.queue.get(itemId);
    if (!item || item.status !== 'paused') return;

    if (item.chromeId) {
      await chrome.downloads.resume(item.chromeId);
      item.status = 'downloading';
      this.notifyListeners();
    }
  }

  async cancelDownload(itemId: number): Promise<void> {
    const item = this.queue.get(itemId);
    if (!item) return;

    if (item.chromeId) {
      await chrome.downloads.cancel(item.chromeId);
    }
    item.status = 'cancelled';
    this.notifyListeners();
  }

  getAllDownloads(): DownloadItem[] {
    return Array.from(this.queue.values());
  }

  subscribe(listener: (items: DownloadItem[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const items = this.getAllDownloads();
    this.listeners.forEach(listener => listener(items));
  }

  private async processQueue(): Promise<void> {
    const downloading = Array.from(this.queue.values())
      .filter(item => item.status === 'downloading').length;

    if (downloading >= this.maxConcurrent) return;

    const pending = Array.from(this.queue.values())
      .filter(item => item.status === 'pending')
      .sort((a, b) => b.priority - a.priority);

    const toStart = pending.slice(0, this.maxConcurrent - downloading);
    await Promise.all(toStart.map(item => this.startDownload(item.id)));
  }

  private extractFilename(url: string): string {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    return path.split('/').pop() || 'download';
  }
}

export const downloadManager = new DownloadManager();
```

### Storage Service

```typescript
// src/background/storage.ts

import { DownloadItem } from '../types';

const STORAGE_KEY = 'download_manager_data';

interface StorageData {
  downloads: DownloadItem[];
  settings: {
    maxConcurrent: number;
    defaultDownloadPath: string;
    autoRetry: boolean;
  };
}

class StorageService {
  async getDownloads(): Promise<DownloadItem[]> {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return (data[STORAGE_KEY] as StorageData)?.downloads || [];
  }

  async saveDownloads(downloads: DownloadItem[]): Promise<void> {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const current: StorageData = data[STORAGE_KEY] || {
      downloads: [],
      settings: { maxConcurrent: 3, defaultDownloadPath: '', autoRetry: true }
    };
    
    current.downloads = downloads;
    await chrome.storage.local.set({ [STORAGE_KEY]: current });
  }

  async getSettings(): Promise<StorageData['settings']> {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return (data[STORAGE_KEY] as StorageData)?.settings || {
      maxConcurrent: 3,
      defaultDownloadPath: '',
      autoRetry: true
    };
  }

  async updateSettings(settings: Partial<StorageData['settings']>): Promise<void> {
    const current = await this.getSettings();
    const merged = { ...current, ...settings };
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const storageData: StorageData = data[STORAGE_KEY] || {
      downloads: [],
      settings: { maxConcurrent: 3, defaultDownloadPath: '', autoRetry: true }
    };
    storageData.settings = merged;
    await chrome.storage.local.set({ [STORAGE_KEY]: storageData });
  }
}

export const storageService = new StorageService();
```

## UI Design

### Popup HTML

```html
<!-- src/popup/popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Download Manager</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Download Manager</h1>
      <span class="stats" id="stats">0 active</span>
    </header>
    
    <div class="download-list" id="downloadList">
      <!-- Download items will be rendered here -->
    </div>

    <div class="add-download">
      <input type="text" id="urlInput" placeholder="Enter URL to download...">
      <button id="addBtn">Add</button>
    </div>

    <footer class="popup-footer">
      <button id="clearCompleted">Clear Completed</button>
      <button id="openDownloads">Open Folder</button>
    </footer>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

### Popup TypeScript

```typescript
// src/popup/popup.ts

import { DownloadItem, DownloadStatus } from '../types';

class PopupController {
  private downloadList: HTMLElement;
  private urlInput: HTMLInputElement;

  constructor() {
    this.downloadList = document.getElementById('downloadList')!;
    this.urlInput = document.getElementById('urlInput') as HTMLInputElement;
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.loadDownloads();
    this.setupMessageListener();
  }

  private setupEventListeners(): void {
    document.getElementById('addBtn')?.addEventListener('click', () => this.addDownload());
    this.urlInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addDownload();
    });
    document.getElementById('clearCompleted')?.addEventListener('click', () => this.clearCompleted());
    document.getElementById('openDownloads')?.addEventListener('click', () => {
      chrome.downloads.showDefaultFolder();
    });
  }

  private async addDownload(): Promise<void> {
    const url = this.urlInput.value.trim();
    if (!url) return;

    try {
      new URL(url);
    } catch {
      alert('Please enter a valid URL');
      return;
    }

    await chrome.runtime.sendMessage({
      type: 'ADD_DOWNLOAD',
      payload: { url }
    });

    this.urlInput.value = '';
  }

  private async loadDownloads(): Promise<void> {
    const response = await chrome.runtime.sendMessage({ type: 'GET_DOWNLOADS' });
    this.renderDownloads(response.downloads);
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'DOWNLOADS_UPDATED') {
        this.renderDownloads(message.downloads);
      }
    });
  }

  private renderDownloads(downloads: DownloadItem[]): void {
    const activeCount = downloads.filter(d => 
      d.status === 'downloading' || d.status === 'pending'
    ).length;
    
    document.getElementById('stats')!.textContent = `${activeCount} active`;
    this.downloadList.innerHTML = downloads.map(d => this.renderDownloadItem(d)).join('');
    this.attachItemListeners(downloads);
  }

  private renderDownloadItem(item: DownloadItem): string {
    const progress = item.totalBytes > 0 
      ? Math.round((item.bytesReceived / item.totalBytes) * 100) 
      : 0;
    
    const statusIcon = this.getStatusIcon(item.status);
    
    return `
      <div class="download-item" data-id="${item.id}">
        <div class="download-info">
          <span class="filename" title="${item.filename}">${item.filename}</span>
          <span class="status">${statusIcon} ${this.formatStatus(item.status)}</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="download-meta">
          <span class="size">${this.formatBytes(item.bytesReceived)} / ${this.formatBytes(item.totalBytes)}</span>
          <span class="speed">${this.formatSpeed(item.speed)}</span>
        </div>
        <div class="download-actions">
          ${this.renderActions(item)}
        </div>
      </div>
    `;
  }

  private renderActions(item: DownloadItem): string {
    switch (item.status) {
      case 'downloading':
        return `<button class="pause-btn" data-action="pause" data-id="${item.id}">⏸</button>`;
      case 'paused':
        return `<button class="resume-btn" data-action="resume" data-id="${item.id}">▶</button>`;
      case 'completed':
        return `<button class="open-btn" data-action="open" data-id="${item.id}">📂</button>`;
      default:
        return `<button class="cancel-btn" data-action="cancel" data-id="${item.id}">✕</button>`;
    }
  }

  private attachItemListeners(downloads: DownloadItem[]): void {
    this.downloadList.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const action = (e.target as HTMLElement).dataset.action;
        const id = parseFloat((e.target as HTMLElement).dataset.id!);
        
        await chrome.runtime.sendMessage({
          type: `ACTION_${action.toUpperCase()}`,
          payload: { id }
        });
      });
    });
  }

  private getStatusIcon(status: DownloadStatus): string {
    const icons: Record<DownloadStatus, string> = {
      pending: '⏳',
      downloading: '⬇️',
      paused: '⏸️',
      completed: '✅',
      failed: '❌',
      cancelled: '🚫'
    };
    return icons[status];
  }

  private formatStatus(status: DownloadStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  private formatBytes(bytes: number): string {
    if (bytes < 0) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond <= 0) return '';
    return `${this.formatBytes(bytesPerSecond)}/s`;
  }

  private async clearCompleted(): Promise<void> {
    await chrome.runtime.sendMessage({ type: 'CLEAR_COMPLETED' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
```

## Chrome APIs Used and Permissions

### Required Permissions

| Permission | Purpose |
|------------|---------|
| `downloads` | Core download functionality |
| `storage` | Persisting download history and settings |
| `tabs` | Accessing current tab URL for quick downloads |
| `notifications` | Desktop notifications for completed/failed downloads |
| `unlimitedStorage` | Large download history storage |

### Key Chrome API Methods

```typescript
// Download API
chrome.downloads.download(options: DownloadOptions, callback?: ...)
chrome.downloads.pause(downloadId: number)
chrome.downloads.resume(downloadId: number)
chrome.downloads.cancel(downloadId: number)
chrome.downloads.search(query: Query, callback?: ...)
chrome.downloads.open(downloadId: number)
chrome.downloads.show(downloadId: number)

// Event Listeners
chrome.downloads.onCreated.addListener(callback)
chrome.downloads.onChanged.addListener(callback)
chrome.downloads.onErased.addListener(callback)
chrome.downloads.onDeterminingFilename.addListener(callback)
```

## State Management and Storage Patterns

### Service Worker State Management

```typescript
// src/background/service-worker.ts

import { downloadManager } from './download-manager';
import { storageService } from './storage';

declare const self: ServiceWorkerGlobalScope;

// Handle download events from Chrome
chrome.downloads.onCreated.addListener(async (downloadItem) => {
  console.log('Download created:', downloadItem.id);
});

chrome.downloads.onChanged.addListener(async (delta) => {
  if (delta.state) {
    console.log(`Download ${delta.id} state: ${delta.state.current}`);
    
    if (delta.state.current === 'complete') {
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icons/icon128.png',
        title: 'Download Complete',
        message: `Download ${delta.id} finished`
      });
    }
  }
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message: any): Promise<any> {
  switch (message.type) {
    case 'ADD_DOWNLOAD':
      const id = await downloadManager.addDownload(message.payload);
      return { success: true, id };
      
    case 'GET_DOWNLOADS':
      return { downloads: downloadManager.getAllDownloads() };
      
    case 'ACTION_PAUSE':
      await downloadManager.pauseDownload(message.payload.id);
      return { success: true };
      
    case 'ACTION_RESUME':
      await downloadManager.resumeDownload(message.payload.id);
      return { success: true };
      
    case 'ACTION_CANCEL':
      await downloadManager.cancelDownload(message.payload.id);
      return { success: true };
      
    case 'ACTION_OPEN':
      if (message.payload.chromeId) {
        await chrome.downloads.open(message.payload.chromeId);
      }
      return { success: true };
      
    case 'CLEAR_COMPLETED':
      // Clear completed downloads from UI
      return { success: true };
      
    default:
      return { error: 'Unknown message type' };
  }
}

// Install and activate
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
  event.waitUntil(clients.claim());
});
```

## Error Handling and Edge Cases

### Retry Logic

```typescript
class DownloadWithRetry {
  private maxRetries = 3;
  private retryDelay = 1000;

  async downloadWithRetry(item: DownloadItem): Promise<void> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.performDownload(item);
        return;
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error;
        }
        await this.delay(this.retryDelay * attempt);
      }
    }
  }

  private async performDownload(item: DownloadItem): Promise<void> {
    // Download logic here
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Error Handling Patterns

```typescript
// Centralized error handling
class ErrorHandler {
  static handleDownloadError(error: Error, item: DownloadItem): void {
    console.error(`Download ${item.id} failed:`, error.message);
    
    // Categorize errors
    if (error.message.includes('net::')) {
      // Network error
      this.handleNetworkError(error, item);
    } else if (error.message.includes('ENOSPC')) {
      // Disk space error
      this.handleDiskSpaceError(error, item);
    } else {
      // Generic error
      this.notifyUser('Download failed', error.message);
    }
  }

  private static handleNetworkError(error: Error, item: DownloadItem): void {
    // Implement network-specific handling
  }

  private static notifyUser(title: string, message: string): void {
    chrome.notifications.create({
      type: 'basic',
      title,
      message
    });
  }
}
```

## Testing Approach

### Unit Testing with Jest

```typescript
// __tests__/download-manager.test.ts

import { DownloadManager } from '../src/background/download-manager';

describe('DownloadManager', () => {
  let manager: DownloadManager;

  beforeEach(() => {
    manager = new DownloadManager();
  });

  test('should add download to queue', async () => {
    const id = await manager.addDownload({
      url: 'https://example.com/file.pdf'
    });
    
    expect(id).toBeDefined();
    const downloads = manager.getAllDownloads();
    expect(downloads).toHaveLength(1);
    expect(downloads[0].url).toBe('https://example.com/file.pdf');
  });

  test('should handle pause/resume', async () => {
    const id = await manager.addDownload({
      url: 'https://example.com/file.pdf'
    });
    
    await manager.startDownload(id);
    await manager.pauseDownload(id);
    
    const downloads = manager.getAllDownloads();
    expect(downloads[0].status).toBe('paused');
  });
});
```

### Integration Testing

```typescript
// __tests__/integration.test.ts

describe('Download Manager Integration', () => {
  test('should complete full download lifecycle', async () => {
    // 1. Add download
    // 2. Verify it's in pending state
    // 3. Start download
    // 4. Monitor progress
    // 5. Verify completion
  });
});
```

## Performance Considerations

### Optimization Tips

1. **Batch Storage Updates**: Don't save to storage on every progress update
2. **Debounce UI Updates**: Update UI at most once per second
3. **Use Offscreen Documents**: For long-running operations
4. **Lazy Load**: Load download history on demand
5. **Efficient Data Structures**: Use Maps for O(1) lookups

```typescript
// Debounced storage saves
import debounce from 'lodash/debounce';

const saveDownloads = debounce(async (downloads: DownloadItem[]) => {
  await storageService.saveDownloads(downloads);
}, 5000);
```

## Publishing Checklist

### Pre-publication Checklist

- [ ] Update version in manifest.json
- [ ] Test in Chrome, Edge, and Firefox (if cross-browser)
- [ ] Verify all permissions are necessary
- [ ] Add clear description and screenshots
- [ ] Create privacy policy if needed
- [ ] Test with Developer Mode enabled
- [ ] Check for console errors
- [ ] Verify offline functionality

### Publishing Steps

1. Package extension: `zip -r extension.zip . -x ".git/*" -x "node_modules/*"`
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload the packaged extension
4. Fill in store listing details
5. Submit for review

### Post-publication

- Monitor crash reports in Web Store console
- Collect and respond to user reviews
- Plan regular updates with version bumps

## Conclusion

Building a Download Manager extension requires careful consideration of:
- Proper use of Chrome Downloads API
- Robust state management and persistence
- Responsive UI with real-time updates
- Comprehensive error handling
- Performance optimization for large download queues

This guide provides a solid foundation for creating a production-ready download manager extension with TypeScript.
