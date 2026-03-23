# Building a Tab Search Extension for Chrome

This guide walks through creating a Tab Search extension that allows users to quickly find and switch between open browser tabs using fuzzy search. We'll cover architecture, implementation, UI design, and deployment.

## Architecture Overview

A Tab Search extension consists of several interconnected components:

```

                    Extension Popup                          
        
   Search Input   Results List   Tab Preview Panel     
        

                              
                              

                    Background Service                       
        
   Tab Indexer    State Mgmt     Event Handlers        
        

                              
                              

                    Chrome APIs                              
  chrome.tabs    chrome.storage    chrome.commands        

```

## Manifest.json Setup

```json
{
  "manifest_version": 3,
  "name": "Tab Search Pro",
  "version": "1.0.0",
  "description": "Quickly find and switch between tabs with fuzzy search",
  "permissions": [
    "tabs",
    "storage",
    "commands"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "commands": {
    "search-tabs": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Open Tab Search"
    }
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

## Core TypeScript Implementation

### Type Definitions (types.ts)

```typescript
interface TabInfo {
  id: number;
  title: string;
  url: string;
  favicon: string;
  windowId: number;
  active: boolean;
  pinned: boolean;
  lastAccessed: number;
}

interface SearchResult {
  tab: TabInfo;
  score: number;
  matches: MatchRegion[];
}

interface MatchRegion {
  start: number;
  end: number;
}

interface ExtensionState {
  tabs: Map<number, TabInfo>;
  searchQuery: string;
  results: SearchResult[];
  selectedIndex: number;
}
```

### Background Service Worker (background.ts)

```typescript
import { TabInfo, SearchResult, ExtensionState } from './types';

class TabSearchEngine {
  private state: ExtensionState;
  private index: FuzzySearchIndex;

  constructor() {
    this.state = {
      tabs: new Map(),
      searchQuery: '',
      results: [],
      selectedIndex: 0
    };
    this.index = new FuzzySearchIndex(['title', 'url']);
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load initial tabs
    await this.refreshTabIndex();
    
    // Listen for tab changes
    chrome.tabs.onCreated.addListener(() => this.refreshTabIndex());
    chrome.tabs.onRemoved.addListener(() => this.refreshTabIndex());
    chrome.tabs.onUpdated.addListener(() => this.refreshTabIndex());
    chrome.tabs.onMoved.addListener(() => this.refreshTabIndex());
  }

  async refreshTabIndex(): Promise<void> {
    const tabs = await chrome.tabs.query({});
    this.state.tabs.clear();
    
    for (const tab of tabs) {
      const tabInfo: TabInfo = {
        id: tab.id!,
        title: tab.title || 'Untitled',
        url: tab.url || '',
        favicon: tab.favIconUrl || '',
        windowId: tab.windowId,
        active: tab.active,
        pinned: tab.pinned || false,
        lastAccessed: tab.lastAccessed || 0
      };
      this.state.tabs.set(tab.id!, tabInfo);
    }
    
    // Rebuild search index
    this.index.build(Array.from(this.state.tabs.values()));
  }

  search(query: string): SearchResult[] {
    if (!query.trim()) {
      // Return recent tabs when no query
      const recentTabs = Array.from(this.state.tabs.values())
        .sort((a, b) => b.lastAccessed - a.lastAccessed)
        .slice(0, 10)
        .map(tab => ({ tab, score: 1, matches: [] }));
      return recentTabs;
    }

    const results = this.index.search(query);
    return results.map(result => ({
      tab: this.state.tabs.get(result.item.id)!,
      score: result.score,
      matches: result.matches
    }));
  }

  async activateTab(tabId: number): Promise<void> {
    const tab = this.state.tabs.get(tabId);
    if (!tab) return;

    // Focus the window containing the tab
    await chrome.windows.update(tab.windowId, { focused: true });
    
    // Activate the specific tab
    await chrome.tabs.update(tabId, { active: true });
  }
}

// Simple fuzzy search implementation
class FuzzySearchIndex {
  private documents: TabInfo[] = [];
  private fields: string[];

  constructor(fields: string[]) {
    this.fields = fields;
  }

  build(documents: TabInfo[]): void {
    this.documents = documents;
  }

  search(query: string): Array<{item: TabInfo; score: number; matches: any[]} {
    const lowerQuery = query.toLowerCase();
    
    return this.documents
      .map(doc => {
        let score = 0;
        let matches: any[] = [];
        
        for (const field of this.fields) {
          const value = (doc as any)[field]?.toLowerCase() || '';
          if (value.includes(lowerQuery)) {
            score += value === lowerQuery ? 100 : 
                     value.startsWith(lowerQuery) ? 50 : 10;
            matches.push({ field, index: value.indexOf(lowerQuery) });
          }
        }
        
        return { item: doc, score, matches };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
}

// Initialize and set up message handling
const engine = new TabSearchEngine();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEARCH') {
    const results = engine.search(message.query);
    sendResponse({ results });
  }
  return true;
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ACTIVATE_TAB') {
    engine.activateTab(message.tabId);
    sendResponse({ success: true });
  }
  return true;
});
```

### Popup UI (popup.ts)

```typescript
interface UIController {
  searchInput: HTMLInputElement;
  resultsContainer: HTMLElement;
  selectedIndex: number;
  results: SearchResult[];
}

class PopupController implements UIController {
  searchInput: HTMLInputElement;
  resultsContainer: HTMLElement;
  selectedIndex: number = 0;
  results: SearchResult[] = [];

  constructor() {
    this.searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.resultsContainer = document.getElementById('results') as HTMLElement;
    this.setupEventListeners();
    this.loadInitialResults();
  }

  private setupEventListeners(): void {
    // Search on input
    this.searchInput.addEventListener('input', (e) => {
      this.handleSearch((e.target as HTMLInputElement).value);
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrevious();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.activateSelected();
      } else if (e.key === 'Escape') {
        window.close();
      }
    });
  }

  private async handleSearch(query: string): Promise<void> {
    const response = await chrome.runtime.sendMessage({
      type: 'SEARCH',
      query
    });
    
    this.results = response.results;
    this.selectedIndex = 0;
    this.renderResults();
  }

  private renderResults(): void {
    this.resultsContainer.innerHTML = '';
    
    this.results.forEach((result, index) => {
      const element = this.createResultElement(result, index === this.selectedIndex);
      this.resultsContainer.appendChild(element);
    });
  }

  private createResultElement(result: SearchResult, isSelected: boolean): HTMLElement {
    const div = document.createElement('div');
    div.className = `result-item ${isSelected ? 'selected' : ''}`;
    div.dataset.tabId = result.tab.id.toString();
    
    div.innerHTML = `
      <img class="favicon" src="${result.tab.favicon}" alt="" />
      <div class="result-content">
        <div class="title">${this.highlightMatches(result.tab.title, result.matches)}</div>
        <div class="url">${result.tab.url}</div>
      </div>
      ${result.tab.pinned ? '<span class="pin-icon"></span>' : ''}
    `;
    
    div.addEventListener('click', () => this.activateTab(result.tab.id));
    div.addEventListener('mouseenter', () => {
      this.selectedIndex = this.results.findIndex(r => r.tab.id === result.tab.id);
      this.updateSelection();
    });
    
    return div;
  }

  private highlightMatches(text: string, matches: any[]): string {
    if (!matches.length) return text;
    // Implementation for highlighting matched regions
    return text; // Simplified for brevity
  }

  private selectNext(): void {
    if (this.selectedIndex < this.results.length - 1) {
      this.selectedIndex++;
      this.updateSelection();
    }
  }

  private selectPrevious(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      this.updateSelection();
    }
  }

  private updateSelection(): void {
    const elements = this.resultsContainer.querySelectorAll('.result-item');
    elements.forEach((el, index) => {
      el.classList.toggle('selected', index === this.selectedIndex);
    });
    elements[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }

  private async activateSelected(): Promise<void> {
    if (!this.results[this.selectedIndex]) return;
    await this.activateTab(this.results[this.selectedIndex].tab.id);
  }

  private async activateTab(tabId: number): Promise<void> {
    await chrome.runtime.sendMessage({
      type: 'ACTIVATE_TAB',
      tabId
    });
    window.close();
  }

  private async loadInitialResults(): Promise<void> {
    await this.handleSearch('');
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
```

## Chrome APIs and Permissions

### Required Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Access tab titles, URLs, and states |
| `storage` | Persist user preferences and cached data |
| `commands` | Register keyboard shortcuts |

### Host Permissions

```json
"host_permissions": [
  "<all_urls>"
]
```

Required for accessing favicon URLs from all domains.

## State Management Patterns

### Using chrome.storage

```typescript
class StorageManager {
  private static STORAGE_KEY = 'tab-search-config';

  static async saveConfig(config: ExtensionConfig): Promise<void> {
    await chrome.storage.local.set({
      [this.STORAGE_KEY]: config
    });
  }

  static async loadConfig(): Promise<ExtensionConfig> {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] || this.getDefaultConfig();
  }

  private static getDefaultConfig(): ExtensionConfig {
    return {
      maxResults: 20,
      showPinnedFirst: true,
      keyboardShortcut: 'Ctrl+Shift+S'
    };
  }
}
```

## Error Handling

```typescript
class ErrorHandler {
  static handle(error: Error, context: string): void {
    console.error(`[${context}]`, error);
    
    // Log to Chrome storage for debugging
    chrome.storage.local.get('errorLog').then(result => {
      const logs = result.errorLog || [];
      logs.push({
        message: error.message,
        stack: error.stack,
        context,
        timestamp: Date.now()
      });
      // Keep only last 100 errors
      chrome.storage.local.set({ 
        errorLog: logs.slice(-100) 
      });
    });
  }

  static async notifyUser(message: string): Promise<void> {
    // Show notification using chrome.notifications API
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Tab Search',
      message
    });
  }
}
```

## Testing Approach

### Unit Tests with Jest

```typescript
import { FuzzySearchIndex } from './background';

describe('FuzzySearchIndex', () => {
  let index: FuzzySearchIndex;

  beforeEach(() => {
    index = new FuzzySearchIndex(['title', 'url']);
    index.build([
      { id: 1, title: 'Google', url: 'https://google.com', favicon: '', windowId: 1, active: false, pinned: false, lastAccessed: 1000 },
      { id: 2, title: 'GitHub', url: 'https://github.com', favicon: '', windowId: 1, active: false, pinned: false, lastAccessed: 2000 },
      { id: 3, title: 'Stack Overflow', url: 'https://stackoverflow.com', favicon: '', windowId: 1, active: false, pinned: false, lastAccessed: 3000 }
    ]);
  });

  test('should find exact match', () => {
    const results = index.search('Google');
    expect(results).toHaveLength(1);
    expect(results[0].item.title).toBe('Google');
  });

  test('should return empty for no match', () => {
    const results = index.search('xyz123');
    expect(results).toHaveLength(0);
  });
});
```

### Integration Testing

```typescript
describe('Tab Search Integration', () => {
  beforeEach(async () => {
    // Create test tabs
    await chrome.tabs.create({ url: 'https://example.com' });
  });

  afterEach(async () => {
    // Cleanup test tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) await chrome.tabs.remove(tab.id);
    }
  });

  test('should find newly created tab', async () => {
    const results = await chrome.runtime.sendMessage({
      type: 'SEARCH',
      query: 'example'
    });
    expect(results.results.length).toBeGreaterThan(0);
  });
});
```

## Performance Considerations

### 1. Debounce Search Input

```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Usage
const debouncedSearch = debounce((query: string) => {
  // Perform search
}, 150);
```

### 2. Lazy Load Favicons

```typescript
class FaviconCache {
  private cache = new Map<string, string>();
  private loading = new Map<string, Promise<string>>();

  async getFavicon(url: string): Promise<string> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    if (this.loading.has(url)) {
      return this.loading.get(url)!;
    }

    const promise = this.fetchFavicon(url);
    this.loading.set(url, promise);
    
    const favicon = await promise;
    this.cache.set(url, favicon);
    this.loading.delete(url);
    
    return favicon;
  }

  private async fetchFavicon(url: string): Promise<string> {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  }
}
```

### 3. Virtual Scrolling for Large Lists

For users with 100+ tabs, implement virtual scrolling to only render visible items.

## Publishing Checklist

### Pre-submission

- [ ] Test extension in Chrome, Edge, and Brave
- [ ] Verify keyboard shortcuts work on all platforms
- [ ] Check manifest.json for errors using chrome://extensions
- [ ] Ensure all icons are properly sized (16, 48, 128px)
- [ ] Add screenshots for store listing (1280x800)
- [ ] Write privacy policy if collecting any data

### Store Listing

- [ ] Choose unique, descriptive name
- [ ] Write compelling short and long descriptions
- [ ] Select appropriate categories
- [ ] Set pricing (free or one-time purchase)
- [ ] Upload store assets

### After Publication

- [ ] Monitor error reports in Chrome Web Store dashboard
- [ ] Respond to user reviews
- [ ] Plan feature updates based on feedback
- [ ] Update version in manifest.json and update ZIP

## Conclusion

Building a Tab Search extension requires understanding Chrome's extension architecture, implementing efficient search algorithms, and creating a responsive UI. This guide covered the essential patterns and practices to build a production-ready extension. 

Key takeaways:
- Use Manifest V3 with service workers
- Implement fuzzy search for better user experience
- Handle errors gracefully and log for debugging
- Test thoroughly across browsers
- Follow Chrome Web Store guidelines for publishing

For the complete source code and additional examples, visit the [GitHub repository](https://github.com/theluckystrike/chrome-extension-guide).
