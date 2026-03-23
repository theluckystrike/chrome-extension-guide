# Building a Clipboard Manager Chrome Extension

## Introduction
A clipboard manager extension stores, searches, and retrieves clipboard history. This guide covers building a complete MV3 clipboard manager with TypeScript.

## Architecture Overview
```
    chrome.runtime    
   Popup UI     Service Worker     
  - Search                             - Clipboard polling
  - Item list                          - Storage management
                       
                                                   
                                          chrome.storage
```

## manifest.json Setup
```json
{
  "name": "Clipboard Manager Pro",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": [
    "storage",
    "notifications",
    "clipboardRead",
    "clipboardWrite"
  ],
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background.js", "type": "module" }
}
```

## Core TypeScript Implementation

### Type Definitions
```typescript
// types/clipboard.ts
export interface ClipboardItem {
  id: string;
  content: string;
  type: 'text' | 'image' | 'html' | 'link';
  timestamp: number;
  sourceUrl?: string;
  preview: string;
  favorite: boolean;
}
```

### Clipboard Service
```typescript
// services/clipboardService.ts
const MAX_ITEMS = 500;
const POLL_INTERVAL = 1000;

export class ClipboardService {
  private lastContent = '';
  private pollTimer: number | null = null;

  async initialize(): Promise<void> {
    this.startMonitoring();
  }

  startMonitoring(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.checkClipboard(), POLL_INTERVAL);
  }

  stopMonitoring(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private async checkClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text !== this.lastContent) {
        this.lastContent = text;
        await this.addItem(text);
      }
    } catch {
      await this.fallbackClipboardCheck();
    }
  }

  private async fallbackClipboardCheck(): Promise<void> {
    const textarea = document.createElement('textarea');
    textarea.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('paste');
    const content = textarea.value;
    document.body.removeChild(textarea);
    if (content && content !== this.lastContent) {
      this.lastContent = content;
      await this.addItem(content);
    }
  }

  private detectType(content: string): ClipboardItem['type'] {
    if (/^https?:\/\/[^\s]+$/.test(content.trim())) return 'link';
    if (/<[a-z][\s\S]*>/i.test(content)) return 'html';
    return 'text';
  }

  async addItem(content: string): Promise<ClipboardItem> {
    const item: ClipboardItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      type: this.detectType(content),
      timestamp: Date.now(),
      preview: content.length > 100 ? content.slice(0, 100) + '...' : content,
      favorite: false
    };

    const items = await this.getItems();
    items.unshift(item);
    const trimmed = items.slice(0, MAX_ITEMS);
    await chrome.storage.local.set({ clipboard_items: trimmed });
    
    chrome.runtime.sendMessage({ type: 'CLIPBOARD_UPDATED', payload: item });
    return item;
  }

  async getItems(): Promise<ClipboardItem[]> {
    const result = await chrome.storage.local.get('clipboard_items');
    return result.clipboard_items || [];
  }

  async deleteItem(id: string): Promise<void> {
    const items = await this.getItems();
    const filtered = items.filter(item => item.id !== id);
    await chrome.storage.local.set({ clipboard_items: filtered });
  }

  async toggleFavorite(id: string): Promise<void> {
    const items = await this.getItems();
    const item = items.find(i => i.id === id);
    if (item) {
      item.favorite = !item.favorite;
      await chrome.storage.local.set({ clipboard_items: items });
    }
  }

  async searchItems(query: string): Promise<ClipboardItem[]> {
    const items = await this.getItems();
    return items.filter(item => 
      item.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  async copyToClipboard(content: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(content);
      this.lastContent = content;
      return true;
    } catch (e) { return false; }
  }
}
```

## UI Design (Popup)

### HTML Structure
```html
<!-- popup/popup.html -->
<div class="popup-container">
  <header>
    <h1>Clipboard Manager</h1>
    <button id="clear-btn">Clear</button>
  </header>
  <div class="search">
    <input type="text" id="search-input" placeholder="Search...">
  </div>
  <div id="clipboard-list"></div>
  <footer><span id="count">0 items</span></footer>
</div>
<script type="module" src="popup.js"></script>
```

### Popup Controller
```typescript
// popup/popup.ts
export class PopupController {
  private items: ClipboardItem[] = [];

  async init(): Promise<void> {
    this.bindEvents();
    this.items = await this.loadItems();
    this.render();
  }

  private bindEvents(): void {
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.filter((e.target as HTMLInputElement).value);
    });
    
    document.getElementById('clear-btn')?.addEventListener('click', () => 
      this.clearAll()
    );
    
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'CLIPBOARD_UPDATED') {
        this.items.unshift(msg.payload);
        this.render();
      }
    });
  }

  private async loadItems(): Promise<ClipboardItem[]> {
    const result = await chrome.storage.local.get('clipboard_items');
    return result.clipboard_items || [];
  }

  private filter(query: string): void {
    const filtered = query 
      ? this.items.filter(i => i.content.toLowerCase().includes(query.toLowerCase()))
      : this.items;
    this.render(filtered);
  }

  private render(items = this.items): void {
    const list = document.getElementById('clipboard-list');
    if (!list) return;
    
    list.innerHTML = items.map(item => `
      <div class="item" data-id="${item.id}">
        <div class="preview">${item.preview}</div>
        <div class="meta">${item.type} • ${this.timeAgo(item.timestamp)}</div>
        <div class="actions">
          <button class="copy">Copy</button>
          <button class="fav">${item.favorite ? '' : ''}</button>
          <button class="del"></button>
        </div>
      </div>
    `).join('');
    
    this.bindItemActions();
    document.getElementById('count')!.textContent = `${items.length} items`;
  }

  private bindItemActions(): void {
    document.querySelectorAll('.copy').forEach(btn => 
      btn.addEventListener('click', async (e) => {
        const id = (e.target as HTMLElement).closest('.item')!.dataset.id;
        const item = this.items.find(i => i.id === id);
        if (item) await navigator.clipboard.writeText(item.content);
      })
    );
  }

  private timeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  private async clearAll(): Promise<void> {
    if (confirm('Clear all?')) {
      await chrome.storage.local.set({ clipboard_items: [] });
      this.items = [];
      this.render();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => new PopupController().init());
```

## Chrome APIs & Permissions

| API | Permission | Purpose |
|-----|------------|---------|
| `chrome.storage` | storage | Persist clipboard items |
| `chrome.clipboard` | clipboardRead/Write | Read/write clipboard |
| `chrome.contextMenus` | contextMenus | Right-click integration |
| `chrome.commands` | commands | Keyboard shortcuts |

### Keyboard Shortcuts (manifest.json)
```json
{
  "commands": {
    "toggle-popup": {
      "suggested_key": { "default": "Ctrl+Shift+V" },
      "description": "Open clipboard manager"
    }
  }
}
```

## State Management
```typescript
// Simple store pattern
class ClipboardStore {
  private listeners: Set<(items: ClipboardItem[]) => void> = new Set();
  
  async get(): Promise<ClipboardItem[]> {
    const r = await chrome.storage.local.get('clipboard_items');
    return r.clipboard_items || [];
  }
  
  async set(items: ClipboardItem[]): Promise<void> {
    await chrome.storage.local.set({ clipboard_items: items });
    this.notify(items);
  }
  
  subscribe(fn: (items: ClipboardItem[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  
  private notify(items: ClipboardItem[]): void {
    this.listeners.forEach(fn => fn(items));
  }
}
```

## Error Handling
```typescript
async function safeClipboardRead(): Promise<string | null> {
  try { return await navigator.clipboard.readText(); }
  catch (e) {
    if (e instanceof DOMException && e.name === 'NotAllowedError') {
      console.warn('Clipboard requires user gesture');
    }
    return null;
  }
}
```

## Testing Approach

### Unit Tests (Jest)
```typescript
describe('ClipboardService', () => {
  it('should detect URL type', async () => {
    const item = await service.addItem('https://example.com');
    expect(item.type).toBe('link');
  });

  it('should enforce max items', async () => {
    for (let i = 0; i < 600; i++) await service.addItem(`item ${i}`);
    const items = await service.getItems();
    expect(items.length).toBeLessThanOrEqual(500);
  });
});
```

### Integration Tests (Playwright)
```typescript
test('copy button works', async ({ page }) => {
  await page.goto('popup.html');
  await page.click('.copy');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toBeTruthy();
});
```

## Performance Considerations
- Virtual scrolling for large lists (>100 items)
- Debounced search (300ms delay)
- Lazy load storage with compression for large content
- Cleanup timer to remove old items periodically

## Publishing Checklist

### Pre-submission
- [ ] MV3 manifest with minimal permissions
- [ ] Icons (16, 48, 128px)
- [ ] Privacy policy (if storing data)
- [ ] Store screenshots (1280x800)

### Testing
- [ ] Works on Chrome, Edge, Brave
- [ ] Keyboard shortcuts functional
- [ ] Context menu integration works
- [ ] Large content (>1MB) handled gracefully

### Post-publish
- Monitor error reports
- Respond to reviews
- Regular dependency updates
