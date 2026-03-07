# Speed Dial Implementation Guide

## Overview
Speed dial extensions provide users with quick access to their favorite websites via a visually appealing grid layout. This guide covers building a production-ready speed dial Chrome extension with modern patterns.

## Architecture and Manifest Setup

### Manifest Configuration (Manifest V3)
```json
{
  "manifest_version": 3,
  "name": "Quick Speed Dial",
  "version": "1.0.0",
  "description": "Fast access to your favorite websites",
  "permissions": ["storage", "tabs", "bookmarks"],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" }
  },
  "side_panel": { "default_path": "sidepanel.html" },
  "background": { "service_worker": "background.js" },
  "icons": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" }
}
```

## Core TypeScript Implementation

### Types and Interfaces
```typescript
// src/types/speed-dial.ts
export interface DialItem {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  thumbnail?: string;
  position: number;
  createdAt: number;
  lastVisited?: number;
  visitCount: number;
}

export interface SpeedDialConfig {
  gridColumns: number;
  gridRows: number;
  theme: 'light' | 'dark' | 'auto';
  showThumbnails: boolean;
  showFavicons: boolean;
  openInNewTab: boolean;
}

export interface StorageSchema {
  items: DialItem[];
  config: SpeedDialConfig;
}
```

### Background Service Worker
```typescript
// src/background/index.ts
import { Storage } from '@storage/storage';
import { MessageHandler } from '@messaging/handler';

const storage = new Storage();

// Handle tab open requests from popup/sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_DIAL') {
    const { url, openInNewTab } = message.payload;
    chrome.tabs.create({ url, active: !openInNewTab });
    updateVisitStats(message.payload.id);
    return true;
  }
  
  if (message.type === 'GET_DIALS') {
    storage.getItems().then(sendResponse);
    return true;
  }
});

async function updateVisitStats(itemId: string) {
  const items = await storage.getItems();
  const item = items.find(i => i.id === itemId);
  if (item) {
    item.lastVisited = Date.now();
    item.visitCount++;
    await storage.saveItems(items);
  }
}

// Optional: Sync with bookmarks
chrome.bookmarks.onCreated.addListener(async (_, bookmark) => {
  if (bookmark.url) {
    const items = await storage.getItems();
    if (!items.find(i => i.url === bookmark.url)) {
      items.push({
        id: bookmark.id,
        title: bookmark.title,
        url: bookmark.url,
        position: items.length,
        createdAt: Date.now(),
        visitCount: 0
      });
      await storage.saveItems(items);
    }
  }
});
```

### Storage Layer
```typescript
// src/storage/storage.ts
import { DialItem, SpeedDialConfig, StorageSchema } from '../types/speed-dial';

const DEFAULT_CONFIG: SpeedDialConfig = {
  gridColumns: 4,
  gridRows: 3,
  theme: 'auto',
  showThumbnails: true,
  showFavicons: true,
  openInNewTab: true
};

export class Storage {
  private storageArea: chrome.storage.StorageArea;

  constructor(area: 'local' | 'sync' = 'local') {
    this.storageArea = chrome.storage[area];
  }

  async getItems(): Promise<DialItem[]> {
    const result = await this.storageArea.get('items');
    return result.items || [];
  }

  async saveItems(items: DialItem[]): Promise<void> {
    await this.storageArea.set({ items });
  }

  async addItem(item: Omit<DialItem, 'id' | 'createdAt' | 'visitCount' | 'position'>): Promise<DialItem> {
    const items = await this.getItems();
    const newItem: DialItem = {
      ...item,
      id: crypto.randomUUID(),
      position: items.length,
      createdAt: Date.now(),
      visitCount: 0
    };
    items.push(newItem);
    await this.saveItems(items);
    return newItem;
  }

  async removeItem(id: string): Promise<void> {
    const items = await this.getItems();
    const filtered = items.filter(i => i.id !== id);
    await this.saveItems(filtered);
  }

  async updateItemPosition(id: string, newPosition: number): Promise<void> {
    const items = await this.getItems();
    const itemIndex = items.findIndex(i => i.id === id);
    if (itemIndex === -1) return;
    
    const [item] = items.splice(itemIndex, 1);
    items.splice(newPosition, 0, item);
    items.forEach((i, idx) => i.position = idx);
    await this.saveItems(items);
  }

  async getConfig(): Promise<SpeedDialConfig> {
    const result = await this.storageArea.get('config');
    return { ...DEFAULT_CONFIG, ...result.config };
  }

  async saveConfig(config: Partial<SpeedDialConfig>): Promise<void> {
    const current = await this.getConfig();
    await this.storageArea.set({ config: { ...current, ...config } });
  }
}
```

## UI Design Implementation

### Side Panel (Main Speed Dial UI)
```typescript
// src/sidepanel/sidepanel.ts
import { Storage } from '../storage/storage';
import { DialItem, SpeedDialConfig } from '../types/speed-dial';
import { createDialGrid, renderDialItem } from '../ui/grid';

const storage = new Storage();

document.addEventListener('DOMContentLoaded', async () => {
  const items = await storage.getItems();
  const config = await storage.getConfig();
  const grid = document.getElementById('dial-grid')!;
  
  grid.style.gridTemplateColumns = `repeat(${config.gridColumns}, 1fr)`;
  grid.innerHTML = items.map(item => renderDialItem(item, config)).join('');
  
  // Drag and drop reordering
  initDragAndDrop(grid, items, config);
  
  // Add new dial button
  document.getElementById('add-dial')?.addEventListener('click', showAddDialModal);
});

function initDragAndDrop(grid: HTMLElement, items: DialItem[], config: SpeedDialConfig) {
  let draggedItem: DialItem | null = null;
  
  grid.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement;
    if (target.dataset.id) {
      draggedItem = items.find(i => i.id === target.dataset.id) || null;
      target.classList.add('dragging');
    }
  });
  
  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const rect = grid.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const colWidth = rect.width / config.gridColumns;
    const dropCol = Math.floor(x / colWidth);
  });
  
  grid.addEventListener('drop', async (e) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const dropTarget = target.closest('[data-id]');
    if (draggedItem && dropTarget) {
      const targetId = dropTarget.getAttribute('data-id')!;
      const items = await storage.getItems();
      const newPos = items.findIndex(i => i.id === targetId);
      await storage.updateItemPosition(draggedItem.id, newPos);
      location.reload();
    }
  });
}
```

### HTML Templates
```html
<!-- sidepanel.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <header class="dial-header">
    <h1>Speed Dial</h1>
    <button id="add-dial" class="icon-btn" title="Add new dial">+</button>
  </header>
  <div id="dial-grid" class="dial-grid"></div>
  <div id="add-dial-modal" class="modal hidden">
    <form id="add-dial-form">
      <input type="text" name="title" placeholder="Title" required>
      <input type="url" name="url" placeholder="https://example.com" required>
      <button type="submit">Add</button>
    </form>
  </div>
  <script type="module" src="sidepanel.js"></script>
</body>
</html>
```

## Chrome APIs and Permissions

| API | Permission | Purpose |
|-----|------------|---------|
| `chrome.storage` | `storage` | Persist dial items and config |
| `chrome.tabs` | `tabs` | Open URLs in new tabs |
| `chrome.bookmarks` | `bookmarks` | Optional bookmark sync |
| `chrome.sidePanel` | `sidePanel` | Side panel UI |
| `chrome.action` | N/A (manifest) | Toolbar icon/popup |
| `chrome.favicon` | N/A | Fetch favicons |

## Error Handling Patterns
```typescript
// Robust error handling in async operations
async function safeGetFavicon(url: string): Promise<string | null> {
  try {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
    const response = await fetch(faviconUrl);
    return response.ok ? faviconUrl : null;
  } catch (error) {
    console.error('Failed to fetch favicon:', error);
    return null;
  }
}

// URL validation
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// Storage quota handling
async function checkStorageQuota(): Promise<boolean> {
  const bytesInUse = await chrome.storage.local.getBytesInUse();
  const quota = 10 * 1024 * 1024; // 10MB typical limit
  return bytesInUse < quota;
}
```

## Testing Approach

### Unit Testing Storage Layer
```typescript
// __tests__/storage.test.ts
import { Storage } from '../storage/storage';

describe('Storage', () => {
  let storage: Storage;
  
  beforeEach(() => {
    chrome.storage.local.clear();
    storage = new Storage('local');
  });
  
  test('should add and retrieve items', async () => {
    const item = await storage.addItem({
      title: 'Test',
      url: 'https://test.com',
      position: 0
    });
    
    const items = await storage.getItems();
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Test');
  });
  
  test('should update item position', async () => {
    await storage.addItem({ title: 'A', url: 'https://a.com', position: 0 });
    await storage.addItem({ title: 'B', url: 'https://b.com', position: 1 });
    
    const items = await storage.getItems();
    await storage.updateItemPosition(items[0].id, 1);
    
    const updated = await storage.getItems();
    expect(updated[0].title).toBe('B');
  });
});
```

### Integration Testing with Puppeteer
```typescript
// __tests__/integration.test.ts
import { test, expect } from '@playwright/test';

test('side panel loads and displays dials', async ({ extensionId }) => {
  await extensionPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  
  const grid = extensionPage.locator('#dial-grid');
  await expect(grid).toBeVisible();
  
  const items = grid.locator('.dial-item');
  await expect(items).toHaveCount(3);
});
```

## Performance Considerations

1. **Lazy Loading**: Only load visible items in large grids
2. **Image Caching**: Use chrome.storage to cache favicons/thumbnails
3. **Debounced Saves**: Debounce storage writes during drag operations
4. **Virtual Scrolling**: For 50+ items, use virtual scrolling
5. **Service Worker**: Keep background minimal; offload to offscreen documents for heavy tasks

```typescript
// Debounced storage save
function debounce<T extends (...args: any[]) => Promise<void>>(
  fn: T, delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const debouncedSave = debounce((items: DialItem[]) => storage.saveItems(items), 300);
```

## Publishing Checklist

- [ ] Verify manifest.json is valid
- [ ] Test in Chrome, Edge, and Firefox (if cross-browser)
- [ ] Add privacy policy URL in manifest
- [ ] Ensure all permissions are necessary
- [ ] Create store listing screenshots (1280x800)
- [ ] Write compelling short and long descriptions
- [ ] Set up OAuth2 if using identity API
- [ ] Configure automated reviews with extend-manifest
- [ ] Test extension with Developer Mode enabled
- [ ] Check for console errors in all contexts
