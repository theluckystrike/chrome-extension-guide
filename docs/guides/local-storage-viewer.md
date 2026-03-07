# Building a Local Storage Viewer Chrome Extension

A localStorage viewer is one of the most useful developer tools you can build as a Chrome extension. It allows developers to inspect, edit, and manage localStorage, sessionStorage, and IndexedDB data across all domains. This guide walks through building a production-ready extension with full TypeScript support, modern UI patterns, and robust error handling.

## Table of Contents

- [Architecture and Manifest Setup](#architecture-and-manifest-setup)
- [Core Implementation with TypeScript](#core-implementation-with-typescript)
- [UI Design](#ui-design)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Testing Approach](#testing-approach)
- [Code Examples](#code-examples)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

## Architecture and Manifest Setup

The localStorage viewer extension requires access to multiple browser contexts. We'll use Manifest V3 with a side panel for the main interface, allowing developers to view storage while browsing.

### Recommended Directory Structure

```
local-storage-viewer/
├── manifest.json
├── tsconfig.json
├── webpack.config.js
├── src/
│   ├── manifest.ts
│   ├── background/
│   │   ├── index.ts
│   │   └── service-worker.ts
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── StorageTree.tsx
│   │   │   ├── KeyValueEditor.tsx
│   │   │   ├── StorageStats.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── hooks/
│   │   │   ├── useStorage.ts
│   │   │   ├── useSelectedDomain.ts
│   │   │   └── useSearch.ts
│   │   ├── store/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── main.css
│   ├── content-script/
│   │   └── index.ts
│   ├── shared/
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   └── utils.ts
│   └── mocks/
│       └── chrome-api.ts
├── public/
│   └── icons/
└── tests/
    ├── unit/
    └── e2e/
```

### Manifest Configuration (manifest.ts)

```typescript
import type { Manifest } from 'webpack-ext-manifest';

const manifest: Manifest = {
  manifest_version: 3,
  name: 'Local Storage Viewer',
  version: '1.0.0',
  description: 'View, edit, and manage localStorage, sessionStorage, and IndexedDB',
  permissions: [
    'storage',
    'tabs',
    'sidePanel',
    'scripting',
    'activeTab'
  ],
  host_permissions: [
    '<all_urls>'
  ],
  side_panel: {
    default_path: 'sidepanel/index.html'
  },
  background: {
    service_worker: 'background/index.js',
    type: 'module'
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content-script/index.js'],
      run_at: 'document_end'
    }
  ],
  icons: {
    16: 'icons/icon-16.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png'
  },
  action: {
    default_icon: {
      16: 'icons/icon-16.png',
      48: 'icons/icon-48.png'
    },
    default_title: 'Open Storage Viewer'
  }
};

export default manifest;
```

---

## Core Implementation with TypeScript

### Shared Types (src/shared/types.ts)

```typescript
export interface StorageItem {
  key: string;
  value: unknown;
  type: StorageType;
  size: number;
  lastModified?: number;
}

export type StorageType = 'localStorage' | 'sessionStorage' | 'indexedDB';

export interface DomainStorage {
  domain: string;
  localStorage: StorageItem[];
  sessionStorage: StorageItem[];
  indexedDB: DatabaseInfo[];
}

export interface DatabaseInfo {
  name: string;
  version: number;
  objectStores: ObjectStoreInfo[];
}

export interface ObjectStoreInfo {
  name: string;
  keyPath: string;
  indexCount: number;
  count: number;
}

export interface StorageFilter {
  searchTerm: string;
  storageTypes: StorageType[];
  domain?: string;
}

export interface StorageAction {
  type: 'get' | 'set' | 'remove' | 'clear';
  domain: string;
  key?: string;
  value?: unknown;
}
```

### Content Script for Storage Extraction (src/content-script/index.ts)

The content script runs on each page and extracts storage data. It communicates with the side panel via message passing.

```typescript
import type { StorageItem, DomainStorage, DatabaseInfo, StorageAction } from '../shared/types';

class StorageExtractor {
  async getLocalStorage(): Promise<StorageItem[]> {
    const items: StorageItem[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        items.push({
          key,
          value: this.parseValue(value),
          type: 'localStorage',
          size: new Blob([value || '']).size,
          lastModified: Date.now()
        });
      }
    }
    
    return items;
  }

  async getSessionStorage(): Promise<StorageItem[]> {
    const items: StorageItem[] = [];
    
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        items.push({
          key,
          value: this.parseValue(value),
          type: 'sessionStorage',
          size: new Blob([value || '']).size,
          lastModified: Date.now()
        });
      }
    }
    
    return items;
  }

  async getIndexedDB(): Promise<DatabaseInfo[]> {
    const databases: DatabaseInfo[] = [];
    
    const indexedDBDatabases = await indexedDB.databases();
    
    for (const dbInfo of indexedDBDatabases) {
      if (!dbInfo.name) continue;
      
      const db = await this.openIndexedDB(dbInfo.name, dbInfo.version);
      const objectStores: typeof dbInfo.objectStoreNames = db.objectStoreNames;
      const storeInfos: DatabaseInfo['objectStores'] = [];
      
      for (let i = 0; i < objectStores.length; i++) {
        const storeName = objectStores[i];
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        
        storeInfos.push({
          name: storeName,
          keyPath: store.keyPath as string || 'key',
          indexCount: store.indexNames.length,
          count: await this.countItems(store)
        });
      }
      
      databases.push({
        name: dbInfo.name,
        version: dbInfo.version,
        objectStores: storeInfos
      });
      
      db.close();
    }
    
    return databases;
  }

  private openIndexedDB(name: string, version: number): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private countItems(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private parseValue(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async getAllStorage(): Promise<DomainStorage> {
    const [localStorage, sessionStorage, indexedDB] = await Promise.all([
      this.getLocalStorage(),
      this.getSessionStorage(),
      this.getIndexedDB()
    ]);

    return {
      domain: window.location.hostname,
      localStorage,
      sessionStorage,
      indexedDB
    };
  }

  handleAction(action: StorageAction): void {
    switch (action.type) {
      case 'remove':
        if (action.key) {
          localStorage.removeItem(action.key);
          sessionStorage.removeItem(action.key);
        }
        break;
      case 'clear':
        localStorage.clear();
        sessionStorage.clear();
        break;
    }
  }
}

const extractor = new StorageExtractor();

// Listen for messages from side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_STORAGE') {
    extractor.getAllStorage().then(sendResponse);
    return true;
  }
  
  if (message.type === 'STORAGE_ACTION') {
    extractor.handleAction(message.payload);
    sendResponse({ success: true });
    return true;
  }
});
```

---

## UI Design

### Side Panel Layout

The side panel should display storage in an organized, searchable interface. Use a tree view for nested JSON values and a split-pane layout for key editing.

### Component: StorageTree.tsx

```typescript
import React, { useState, useCallback } from 'react';
import type { StorageItem } from '../../shared/types';

interface Props {
  items: StorageItem[];
  onSelect: (item: StorageItem) => void;
  onDelete: (key: string) => void;
  searchTerm: string;
}

export const StorageTree: React.FC<Props> = ({ 
  items, 
  onSelect, 
  onDelete,
  searchTerm 
}) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const filteredItems = items.filter(item => 
    item.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderValue = (value: unknown, key: string): React.ReactNode => {
    if (typeof value === 'object' && value !== null) {
      const isExpanded = expandedKeys.has(key);
      const entries = Object.entries(value as Record<string, unknown>);
      
      return (
        <div className="nested-value">
          <button 
            className="expand-btn"
            onClick={() => toggleExpand(key)}
          >
            {isExpanded ? '▼' : '▶'} {entries.length} keys
          </button>
          {isExpanded && (
            <div className="nested-content">
              {entries.map(([k, v]) => (
                <div key={k} className="nested-entry">
                  <span className="key">{k}:</span>
                  {renderValue(v, `${key}.${k}`)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    
    return <span className="value">{String(value)}</span>;
  };

  return (
    <div className="storage-tree">
      {filteredItems.map(item => (
        <div key={item.key} className="storage-item">
          <div 
            className="item-header"
            onClick={() => onSelect(item)}
          >
            <span className="key">{item.key}</span>
            <span className="type-badge">{item.type}</span>
            <span className="size">{formatBytes(item.size)}</span>
            <button 
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.key);
              }}
            >
              ×
            </button>
          </div>
          <div className="item-value">
            {renderValue(item.value, item.key)}
          </div>
        </div>
      ))}
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

---

## Chrome APIs and Permissions

### Required Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Access extension's own storage for settings |
| `tabs` | Get current tab info to identify domain |
| `sidePanel` | Enable side panel UI |
| `scripting` | Inject content scripts if needed |
| `activeTab` | Access current tab's data |
| `<all_urls>` | Read storage from any website |

### Message Passing Pattern

```typescript
// In side panel
const getStorage = async (tabId: number): Promise<DomainStorage> => {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: 'GET_STORAGE'
  });
  return response;
};

// Using with current tab
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab?.id) {
    getStorage(tab.id).then(storage => {
      console.log('Storage data:', storage);
    });
  }
});
```

---

## State Management

### Simple Store Implementation

```typescript
import { create } from 'zustand';
import type { DomainStorage, StorageFilter, StorageType } from '../shared/types';

interface StorageState {
  // Data
  currentStorage: DomainStorage | null;
  allStorages: Map<string, DomainStorage>;
  selectedKey: string | null;
  selectedDomain: string;
  
  // Filters
  filter: StorageFilter;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setStorage: (storage: DomainStorage) => void;
  setSelectedKey: (key: string | null) => void;
  setSelectedDomain: (domain: string) => void;
  setFilter: (filter: Partial<StorageFilter>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearStorage: () => void;
}

export const useStorageStore = create<StorageState>((set, get) => ({
  currentStorage: null,
  allStorages: new Map(),
  selectedKey: null,
  selectedDomain: '',
  filter: {
    searchTerm: '',
    storageTypes: ['localStorage', 'sessionStorage', 'indexedDB']
  },
  isLoading: false,
  error: null,

  setStorage: (storage) => set((state) => {
    const newStorages = new Map(state.allStorages);
    newStorages.set(storage.domain, storage);
    return { 
      currentStorage: storage,
      allStorages: newStorages,
      selectedDomain: storage.domain
    };
  }),

  setSelectedKey: (key) => set({ selectedKey: key }),
  
  setSelectedDomain: (domain) => {
    const storage = get().allStorages.get(domain);
    set({ selectedDomain: domain, currentStorage: storage || null });
  },

  setFilter: (filterUpdate) => set((state) => ({
    filter: { ...state.filter, ...filterUpdate }
  })),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearStorage: () => set({ currentStorage: null, selectedKey: null })
}));
```

---

## Error Handling

### Comprehensive Error Handling Pattern

```typescript
class StorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

class StorageService {
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof DOMException) {
        // Handle quota exceeded
        if (error.name === 'QuotaExceededError') {
          throw new StorageError(
            'Storage quota exceeded for this domain',
            'QUOTA_EXCEEDED',
            true
          );
        }
        
        // Handle security errors
        if (error.name === 'SecurityError') {
          throw new StorageError(
            `Cannot access storage on ${context}. Site may be blocking access.`,
            'SECURITY_ERROR',
            false
          );
        }
      }
      
      // Handle cross-origin errors
      if (error instanceof TypeError && error.message.includes('cross-origin')) {
        throw new StorageError(
          'Cannot access storage from cross-origin frames',
          'CROSS_ORIGIN_ERROR',
          false
        );
      }
      
      throw new StorageError(
        `Failed to access storage: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR',
        true
      );
    }
  }

  // Graceful degradation for problematic sites
  async safeGetStorage(tabId: number): Promise<DomainStorage | null> {
    try {
      return await chrome.tabs.sendMessage(tabId, { type: 'GET_STORAGE' });
    } catch {
      // Return null for inaccessible tabs instead of throwing
      return null;
    }
  }
}
```

---

## Testing Approach

### Unit Tests with Vitest

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageTree } from '../components/StorageTree';
import { render, screen, fireEvent } from '@testing-library/react';

describe('StorageTree', () => {
  const mockItems = [
    { key: 'user', value: { name: 'John' }, type: 'localStorage' as const, size: 100 },
    { key: 'token', value: 'abc123', type: 'localStorage' as const, size: 50 }
  ];

  it('renders storage items', () => {
    render(
      <StorageTree 
        items={mockItems}
        onSelect={() => {}}
        onDelete={() => {}}
        searchTerm=""
      />
    );
    
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('token')).toBeInTheDocument();
  });

  it('filters items based on search term', () => {
    render(
      <StorageTree 
        items={mockItems}
        onSelect={() => {}}
        onDelete={() => {}}
        searchTerm="user"
      />
    );
    
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.queryByText('token')).not.toBeInTheDocument();
  });
});
```

### E2E Tests with Playwright

```typescript
import { test, expect } from '@playwright/test';

test('side panel displays storage', async ({ page }) => {
  // Set up test page with storage
  await page.goto('https://example.com');
  await page.evaluate(() => {
    localStorage.setItem('testKey', 'testValue');
    sessionStorage.setItem('sessionKey', 'sessionValue');
  });
  
  // Open extension side panel
  await page.click('[data-extension-id]');
  
  // Verify storage displayed
  await expect(page.locator('.storage-tree')).toContainText('testKey');
  await expect(page.locator('.storage-tree')).toContainText('sessionKey');
});
```

---

## Performance Considerations

### Optimizations for Large Storage

1. **Virtual Scrolling**: Use virtualization for large item lists
   ```typescript
   import { useVirtualizer } from '@tanstack/react-virtual';
   
   const virtualizer = useVirtualizer({
     count: items.length,
     getScrollElement: () => parentRef.current,
     estimateSize: () => 50,
     overscan: 5
   });
   ```

2. **Debounced Search**: Prevent re-renders during typing
   ```typescript
   const debouncedSearch = useMemo(
     () => debounce((term: string) => setFilter({ searchTerm: term }), 300),
     []
   );
   ```

3. **Lazy Loading**: Load IndexedDB data on demand
   ```typescript
   const loadIndexedDBData = useCallback(async (storeName: string) => {
     if (!currentStorage) return;
     // Load only when requested
   }, [currentStorage]);
   ```

4. **Memoization**: Prevent unnecessary re-renders
   ```typescript
   const filteredItems = useMemo(
     () => items.filter(item => matchesFilter(item, filter)),
     [items, filter]
   );
   ```

---

## Publishing Checklist

Before publishing to Chrome Web Store:

- [ ] **Manifest**: Verify all permissions are necessary
- [ ] **Icons**: Create 16x16, 48x48, and 128x128 PNG icons
- [ ] **Screenshots**: Add screenshots showing the extension in action
- [ ] **Description**: Write clear, concise description (< 132 characters for title)
- [ ] **Privacy Policy**: Required if accessing data on all websites
- [ ] **Version Bump**: Increment version in manifest.json
- [ ] **Build**: Run production build
  ```bash
  npm run build
  ```
- [ ] **ZIP**: Create ZIP of dist folder
- [ ] **Store Listing**: Fill all required fields in Developer Dashboard

### Manifest Best Practices

```json
{
  "manifest_version": 3,
  "name": "Local Storage Viewer",
  "version": "1.0.0",
  "description": "View and edit localStorage, sessionStorage, and IndexedDB",
  "short_name": "Storage Viewer",
  "categories": ["developer_tools", "productivity"]
}
```

---

## Summary

Building a localStorage viewer extension requires careful consideration of cross-context communication, security restrictions, and user experience. The key components are:

1. **Manifest V3** with appropriate permissions for storage access
2. **Content script** for extracting storage data from web pages
3. **Side panel UI** for a developer-friendly interface
4. **TypeScript** for type safety and maintainability
5. **Proper error handling** for graceful degradation
6. **Performance optimization** for handling large storage datasets

Following these patterns will result in a production-ready extension that developers find valuable for debugging and managing web storage.
