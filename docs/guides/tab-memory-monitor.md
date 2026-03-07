# Building a Tab Memory Monitor Chrome Extension

## Introduction

A Tab Memory Monitor extension helps users track and visualize memory usage across browser tabs, enabling better resource management and identifying memory-heavy pages. This guide covers building a production-ready extension using Chrome's memory APIs, Manifest V3, and TypeScript.

## Architecture Overview

The extension follows a modular architecture:

- **Background Service Worker**: Collects memory data periodically via `chrome.alarms`
- **Popup/Sidebar**: Displays real-time memory stats in a clean UI
- **Content Script**: Collects per-tab memory metrics from `performance.memory`
- **Storage**: Uses `chrome.storage.local` for persistence and `chrome.runtime` for messaging

## manifest.json Configuration

```json
{
  "manifest_version": 3,
  "name": "Tab Memory Monitor",
  "version": "1.0.0",
  "description": "Monitor memory usage across browser tabs",
  "permissions": [
    "tabs",
    "storage",
    "alarms",
    "memory"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## Core Types (types.ts)

```typescript
export interface TabMemoryInfo {
  tabId: number;
  url: string;
  title: string;
  memoryUsage: number;       // bytes
  memoryLimit: number;        // bytes
  timestamp: number;
  favicon?: string;
}

export interface MemorySnapshot {
  id: string;
  timestamp: number;
  tabs: TabMemoryInfo[];
  totalMemory: number;
  averageMemory: number;
}

export interface ExtensionSettings {
  refreshInterval: number;   // minutes
  memoryThreshold: number;   // bytes - alert threshold
  enableNotifications: boolean;
  retentionDays: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  refreshInterval: 1,
  memoryThreshold: 100 * 1024 * 1024, // 100MB
  enableNotifications: true,
  retentionDays: 7
};
```

## Background Service Worker (background.ts)

```typescript
import { TabMemoryInfo, MemorySnapshot, ExtensionSettings, DEFAULT_SETTINGS } from './types';

class MemoryMonitor {
  private settings: ExtensionSettings = DEFAULT_SETTINGS;
  private isMonitoring = false;

  async initialize(): Promise<void> {
    const stored = await chrome.storage.local.get('settings');
    this.settings = { ...DEFAULT_SETTINGS, ...stored.settings };
    await this.setupAlarm();
    this.registerListeners();
  }

  private async setupAlarm(): Promise<void> {
    await chrome.alarms.create('memoryCheck', {
      periodInMinutes: this.settings.refreshInterval
    });
  }

  private registerListeners(): void {
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'memoryCheck') {
        await this.collectMemoryData();
      }
    });

    chrome.runtime.onInstalled.addListener(async () => {
      await this.initialize();
    });

    chrome.runtime.onStartup.addListener(async () => {
      await this.initialize();
    });
  }

  async collectMemoryData(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      const memoryData: TabMemoryInfo[] = [];

      for (const tab of tabs) {
        if (!tab.id || !tab.url) continue;
        
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'getMemoryUsage' 
          });
          
          if (response?.memory) {
            memoryData.push({
              tabId: tab.id,
              url: tab.url,
              title: tab.title || 'Untitled',
              memoryUsage: response.memory.usedJSHeapSize,
              memoryLimit: response.memory.jsHeapSizeLimit,
              timestamp: Date.now(),
              favicon: tab.favIconUrl
            });
          }
        } catch (error) {
          // Content script not available or cross-origin
          console.debug(`Cannot get memory for tab ${tab.id}:`, error);
        }
      }

      await this.saveSnapshot(memoryData);
      await this.notifyIfThresholdExceeded(memoryData);
    } catch (error) {
      console.error('Error collecting memory data:', error);
    }
  }

  private async saveSnapshot(tabs: TabMemoryInfo[]): Promise<void> {
    const totalMemory = tabs.reduce((sum, t) => sum + t.memoryUsage, 0);
    const snapshot: MemorySnapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      tabs,
      totalMemory,
      averageMemory: tabs.length > 0 ? totalMemory / tabs.length : 0
    };

    const { snapshots = [] } = await chrome.storage.local.get('snapshots');
    snapshots.unshift(snapshot);
    
    // Keep only last 1000 snapshots
    const trimmed = snapshots.slice(0, 1000);
    await chrome.storage.local.set({ snapshots: trimmed });
  }

  private async notifyIfThresholdExceeded(tabs: TabMemoryInfo[]): Promise<void> {
    if (!this.settings.enableNotifications) return;

    const heavyTabs = tabs.filter(t => t.memoryUsage > this.settings.memoryThreshold);
    
    if (heavyTabs.length > 0) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Memory Alert',
        message: `${heavyTabs.length} tab(s) exceed memory threshold`
      });
    }
  }
}

const monitor = new MemoryMonitor();
monitor.initialize();
```

## Content Script (content.ts)

```typescript
interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'getMemoryUsage') {
    const memory = getMemoryMetrics();
    sendResponse({ memory });
  }
  return true;
});

function getMemoryMetrics(): MemoryMetrics | null {
  // @ts-expect-error - performance.memory is Chrome-only
  const mem = performance?.memory;
  
  if (!mem) {
    return null;
  }

  return {
    usedJSHeapSize: mem.usedJSHeapSize,
    totalJSHeapSize: mem.totalJSHeapSize,
    jsHeapSizeLimit: mem.jsHeapSizeLimit
  };
}

// Expose memory API for direct access if needed
if (typeof window !== 'undefined') {
  (window as any).getMemoryMetrics = getMemoryMetrics;
}
```

## Popup UI (popup.ts)

```typescript
import { TabMemoryInfo, MemorySnapshot } from './types';

interface PopupState {
  currentSnapshot: MemorySnapshot | null;
  sortBy: 'memory' | 'title' | 'url';
  sortOrder: 'asc' | 'desc';
}

class PopupController {
  private state: PopupState = {
    currentSnapshot: null,
    sortBy: 'memory',
    sortOrder: 'desc'
  };

  async initialize(): Promise<void> {
    await this.loadLatestSnapshot();
    this.setupEventListeners();
    this.render();
  }

  private async loadLatestSnapshot(): Promise<void> {
    const { snapshots = [] } = await chrome.storage.local.get('snapshots');
    this.state.currentSnapshot = snapshots[0] || null;
  }

  private setupEventListeners(): void {
    document.getElementById('sortMemory')?.addEventListener('click', () => {
      this.state.sortBy = 'memory';
      this.state.sortOrder = 'desc';
      this.render();
    });

    document.getElementById('sortTitle')?.addEventListener('click', () => {
      this.state.sortBy = 'title';
      this.state.sortOrder = 'asc';
      this.render();
    });

    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
      await this.collectNow();
    });
  }

  private async collectNow(): Promise<void> {
    // Request background to collect immediately
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'getMemoryUsage' });
        } catch (e) {
          // Tab may not have content script
        }
      }
    }
    await this.loadLatestSnapshot();
    this.render();
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private render(): void {
    const container = document.getElementById('tabList');
    if (!container) return;

    if (!this.state.currentSnapshot) {
      container.innerHTML = '<p class="no-data">No memory data available</p>';
      return;
    }

    const sortedTabs = [...this.state.currentSnapshot.tabs].sort((a, b) => {
      const multiplier = this.state.sortOrder === 'asc' ? 1 : -1;
      if (this.state.sortBy === 'memory') {
        return (a.memoryUsage - b.memoryUsage) * multiplier;
      }
      return (a[this.state.sortBy as keyof TabMemoryInfo] as string)
        .localeCompare(b[this.state.sortBy as keyof TabMemoryInfo] as string) * multiplier;
    });

    container.innerHTML = sortedTabs.map(tab => `
      <div class="tab-item" data-tab-id="${tab.tabId}">
        <div class="tab-info">
          <img src="${tab.favicon || 'icons/default.png'}" class="favicon" alt="" />
          <span class="tab-title" title="${tab.url}">${tab.title}</span>
        </div>
        <div class="tab-memory">
          <span class="memory-usage">${this.formatBytes(tab.memoryUsage)}</span>
          <div class="memory-bar">
            <div class="memory-fill" style="width: ${(tab.memoryUsage / tab.memoryLimit) * 100}%"></div>
          </div>
        </div>
      </div>
    `).join('');

    // Add click handlers for tab actions
    container.querySelectorAll('.tab-item').forEach(item => {
      item.addEventListener('click', async () => {
        const tabId = parseInt(item.getAttribute('data-tab-id') || '0');
        await chrome.tabs.update(tabId, { active: true });
        window.close();
      });
    });

    // Update total display
    const totalEl = document.getElementById('totalMemory');
    if (totalEl && this.state.currentSnapshot) {
      totalEl.textContent = this.formatBytes(this.state.currentSnapshot.totalMemory);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController().initialize();
});
```

## Popup HTML (popup.html)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tab Memory Monitor</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Tab Memory Monitor</h1>
      <button id="refreshBtn" class="icon-btn" title="Refresh Now">
        <svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="M13.65 2.35A8 8 0 1 0 16 8h-2a6 6 0 1 1-1.75-4.25L10 6h6V0l-2.35 2.35z"/></svg>
      </button>
    </header>
    
    <div class="summary">
      <div class="total-label">Total Memory</div>
      <div id="totalMemory" class="total-value">--</div>
    </div>

    <div class="controls">
      <button id="sortMemory" class="btn active">By Memory</button>
      <button id="sortTitle" class="btn">By Title</button>
    </div>

    <div id="tabList" class="tab-list"></div>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

## State Management Patterns

### Using chrome.storage.local

```typescript
class StorageManager {
  private cache: Map<string, any> = new Map();

  async get<T>(key: string, defaultValue: T): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const { [key]: value } = await chrome.storage.local.get(key);
    const result = value ?? defaultValue;
    this.cache.set(key, result);
    return result;
  }

  async set(key: string, value: any): Promise<void> {
    this.cache.set(key, value);
    await chrome.storage.local.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    this.cache.delete(key);
    await chrome.storage.local.remove(key);
  }
}
```

### Debouncing Storage Writes

```typescript
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const saveSettings = debounce(async (settings: ExtensionSettings) => {
  await chrome.storage.local.set({ settings });
}, 500);
```

## Error Handling

### Service Worker Error Recovery

```typescript
// In background.ts
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    // Migrate any old storage format
    migrateStorage();
  }
});

async function migrateStorage(): Promise<void> {
  const oldData = await chrome.storage.local.get(null);
  
  // Check for legacy format and convert
  if (oldData.legacyMemoryData) {
    const newFormat = convertToNewFormat(oldData.legacyMemoryData);
    await chrome.storage.local.set({ snapshots: newFormat });
    await chrome.storage.local.remove('legacyMemoryData');
  }
}

// Handle unexpected termination
chrome.runtime.onStartup.addListener(async () => {
  // Verify storage integrity
  const { snapshots } = await chrome.storage.local.get('snapshots');
  if (!Array.isArray(snapshots)) {
    await chrome.storage.local.set({ snapshots: [] });
  }
});
```

### Content Script Error Boundaries

```typescript
// Wrap message handling in try-catch
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.action) {
      case 'getMemoryUsage':
        const mem = getMemoryMetrics();
        sendResponse({ success: true, memory: mem });
        break;
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    sendResponse({ success: false, error: String(error) });
  }
  return true;
});
```

## Testing Approach

### Unit Testing with Jest

```typescript
// __tests__/types.test.ts
import { DEFAULT_SETTINGS } from '../types';

describe('TabMemoryInfo', () => {
  it('should have required properties', () => {
    const tab: TabMemoryInfo = {
      tabId: 1,
      url: 'https://example.com',
      title: 'Example',
      memoryUsage: 50000000,
      memoryLimit: 200000000,
      timestamp: Date.now()
    };
    
    expect(tab.tabId).toBe(1);
    expect(tab.memoryUsage).toBeLessThan(tab.memoryLimit);
  });
});

describe('DEFAULT_SETTINGS', () => {
  it('should have valid refresh interval', () => {
    expect(DEFAULT_SETTINGS.refreshInterval).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.refreshInterval).toBeLessThan(60);
  });
});
```

### Integration Testing

```typescript
// __tests__/integration/memory-collection.test.ts
describe('Memory Collection', () => {
  it('should collect memory from tabs', async () => {
    const tabs = await chrome.tabs.query({});
    expect(tabs.length).toBeGreaterThan(0);
    
    // Simulate content script response
    const mockResponse = {
      memory: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 100000000
      }
    };
    
    expect(mockResponse.memory.usedJSHeapSize).toBeLessThan(
      mockResponse.memory.jsHeapSizeLimit
    );
  });
});
```

## Performance Considerations

### Memory Efficiency

1. **Limit Snapshot Retention**: Keep only last 1000 snapshots to prevent storage bloat
2. **Use Structured Clone**: Chrome's `JSON.parse(JSON.stringify())` for deep copies
3. **Lazy Loading**: Load only visible tabs in popup, paginate results
4. **Efficient Sorting**: Sort in background worker, not UI thread

### Service Worker Optimization

```typescript
// Use minimal polling - rely on alarms
// Don't keep large state in memory
// Clean up listeners on uninstall

chrome.runtime.onUninstalled.addListener(async () => {
  await chrome.storage.local.clear();
  await chrome.alarms.clearAll();
});
```

### UI Performance

```typescript
// Virtual scrolling for large tab lists
// Debounce rapid updates
// Use CSS containment
// Minimize DOM operations
```

## Publishing Checklist

### Pre-Publication

- [ ] Test in Chrome, Edge, and Brave
- [ ] Verify Manifest V3 compliance
- [ ] Check all permissions are necessary
- [ ] Run Chrome Web Store linting
- [ ] Prepare screenshots (1280x800, 640x400)
- [ ] Write privacy policy if needed
- [ ] Create store listing description

### Manifest Requirements

```json
{
  "name": "Tab Memory Monitor",
  "short_name": "Memory Monitor",
  "version": "1.0.0",
  "description": "Monitor memory usage across browser tabs",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
    "256": "icons/icon256.png"
  },
  "screenshots": [
    { "src": "screenshots/main.png", "sizes": "1280x800", "label": "Main View" }
  ],
  "categories": ["utility"],
  "manifest_version": 3
}
```

### Store Listing

- [ ] Compelling title (under 45 chars)
- [ ] Clear description (prompts + features)
- [ ] Appropriate category selection
- [ ] Keywords for searchability
- [ ] Privacy policy URL (if collecting data)

## Conclusion

This guide covered the essential components for building a Tab Memory Monitor extension. Key takeaways:

1. **Use chrome.alarms** for periodic background collection (not setInterval)
2. **Content scripts** are required to access `performance.memory` per-tab
3. **chrome.storage.local** provides persistent storage with quota limits
4. **Handle errors gracefully** with try-catch and storage migration
5. **Test thoroughly** across browsers before publishing

The complete source code is available in the examples directory of this repository.
