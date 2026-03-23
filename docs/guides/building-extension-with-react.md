---
layout: default
title: "Building Chrome Extensions with React — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with React, covering hooks for Chrome APIs, state management, and advanced patterns."
canonical_url: "https://bestchromeextensions.com/guides/building-extension-with-react/"
---

# Building Chrome Extensions with React

Building Chrome extensions with React provides a powerful combination of modern UI development and browser API access. This guide covers advanced React patterns specifically tailored for extension development, including custom hooks for Chrome APIs, cross-context state management, and architecture patterns that scale.

## Understanding Extension Contexts {#understanding-extension-contexts}

Chrome extensions run in multiple isolated contexts, each with different capabilities and limitations. Understanding these contexts is crucial for building robust React applications:

- **Popup**: Short-lived, terminates when closed
- **Options Page**: Long-lived, accessible via chrome://extensions
- **Side Panel**: Persistent, shares lifetime with browser
- **Content Scripts**: Injected into web pages, isolated from page JavaScript
- **Background Service Worker**: Event-driven, no DOM access

Each context requires its own React root, but they can share state through chrome.storage and message passing.

## Custom Hooks for Chrome APIs {#custom-hooks-for-chrome-apis}

Creating reusable hooks for Chrome APIs is essential for clean, maintainable extension code. Here are the essential hooks every React extension developer should implement:

### useChromeStorage Hook

The storage API is the backbone of extension state persistence. Create a typed hook that handles both sync and local storage:

```typescript
// hooks/useChromeStorage.ts
import { useState, useEffect, useCallback } from 'react';
import type { Storage } from 'webextension-polyfill';

type StorageArea = 'sync' | 'local' | 'managed' | 'session';

interface UseChromeStorageOptions<T> {
  key: string;
  defaultValue: T;
  area?: StorageArea;
}

export function useChromeStorage<T>({
  key,
  defaultValue,
  area = 'sync'
}: UseChromeStorageOptions<T>) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get the appropriate storage area
  const getStorage = useCallback((): Storage.StorageArea => {
    if (area === 'sync') return chrome.storage.sync;
    if (area === 'local') return chrome.storage.local;
    if (area === 'session') return chrome.storage.session;
    return chrome.storage managed;
  }, [area]);

  // Load initial value
  useEffect(() => {
    const loadValue = async () => {
      try {
        const storage = getStorage();
        const result = await storage.get(key);
        setValue(result[key] ?? defaultValue);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };
    loadValue();
  }, [key, defaultValue, getStorage]);

  // Set value with automatic persistence
  const setValueWithStorage = useCallback(async (newValue: T | ((prev: T) => T)) => {
    try {
      const storage = getStorage();
      const valueToStore = typeof newValue === 'function' 
        ? (newValue as (prev: T) => T)(value)
        : newValue;
      
      await storage.set({ [key]: valueToStore });
      setValue(valueToStore);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [key, value, getStorage]);

  // Remove key from storage
  const removeValue = useCallback(async () => {
    try {
      const storage = getStorage();
      await storage.remove(key);
      setValue(defaultValue);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [key, defaultValue, getStorage]);

  return {
    value,
    setValue: setValueWithStorage,
    removeValue,
    isLoading,
    error
  };
}
```

### useChromeMessages Hook

Communication between extension contexts requires a robust message passing system. This hook provides a clean React-friendly interface:

```typescript
// hooks/useChromeMessages.ts
import { useEffect, useCallback, useRef } from 'react';
import type { Runtime } from 'webextension-polyfill';

type MessageHandler = (message: unknown, sender: Runtime.MessageSender) => unknown;

interface UseChromeMessagesOptions {
  onMessage?: MessageHandler;
  onMessageExternal?: MessageHandler;
  shouldRespond?: (message: unknown) => boolean;
}

export function useChromeMessages({
  onMessage,
  onMessageExternal,
  shouldRespond
}: UseChromeMessagesOptions = {}) {
  const handlersRef = useRef<MessageHandler[]>([]);

  // Register handlers
  useEffect(() => {
    const handleMessage = (
      message: unknown, 
      sender: Runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => {
      // Run registered handlers
      handlersRef.current.forEach(async (handler) => {
        const result = await handler(message, sender);
        if (result !== undefined) {
          sendResponse(result);
        }
      });
    };

    // Listen for messages from other extension contexts
    const internalListener = chrome.runtime.onMessage.addListener(handleMessage);

    // Listen for messages from web pages (requires externalt messaging)
    const externalListener = onMessageExternal
      ? chrome.runtime.onMessageExternal.addListener(handleMessage)
      : undefined;

    return () => {
      internalListener();
      externalListener?.();
    };
  }, [onMessageExternal]);

  // Send message to other contexts
  const sendMessage = useCallback(async <T = unknown>(
    message: unknown,
    options?: { includeTlsId?: boolean }
  ): Promise<T> => {
    return chrome.runtime.sendMessage(message) as Promise<T>;
  }, []);

  // Send message to specific tab
  const sendMessageToTab = useCallback(async <T = unknown>(
    tabId: number,
    message: unknown
  ): Promise<T> => {
    return chrome.tabs.sendMessage(tabId, message) as Promise<T>;
  }, []);

  // Register a message handler
  const registerHandler = useCallback((handler: MessageHandler) => {
    handlersRef.current.push(handler);
    return () => {
      const index = handlersRef.current.indexOf(handler);
      if (index > -1) handlersRef.current.splice(index, 1);
    };
  }, []);

  return {
    sendMessage,
    sendMessageToTab,
    registerHandler
  };
}
```

### useChromeTabs Hook

Managing browser tabs is a common requirement. This hook provides reactive tab state:

```typescript
// hooks/useChromeTabs.ts
import { useState, useEffect, useCallback } from 'react';
import type { Tabs } from 'webextension-polyfill';

interface UseChromeTabsOptions {
  currentWindow?: boolean;
  active?: boolean;
}

export function useChromeTabs(options: UseChromeTabsOptions = {}) {
  const [tabs, setTabs] = useState<Tabs.Tab[]>([]);
  const [currentTab, setCurrentTab] = useState<Tabs.Tab | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const queryTabs = useCallback(async () => {
    setIsLoading(true);
    try {
      const query: Tabs.QueryQueryInfoType = {};
      if (options.currentWindow) query.currentWindow = true;
      if (options.active !== undefined) query.active = options.active;
      
      const queriedTabs = await chrome.tabs.query(query);
      setTabs(queriedTabs);
      
      // Find the current active tab
      const active = queriedTabs.find(t => t.active);
      setCurrentTab(active || null);
    } catch (err) {
      console.error('Failed to query tabs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.currentWindow, options.active]);

  // Initial load
  useEffect(() => {
    queryTabs();
  }, [queryTabs]);

  // Listen for tab updates
  useEffect(() => {
    const handleCreated = (tab: Tabs.Tab) => {
      setTabs(prev => [...prev, tab]);
      if (tab.active) setCurrentTab(tab);
    };

    const handleUpdated = (tabId: number, changeInfo: Tabs.TabChangeInfo, tab: Tabs.Tab) => {
      setTabs(prev => prev.map(t => t.id === tabId ? tab : t));
      if (tab.active && changeInfo.url) setCurrentTab(tab);
    };

    const handleRemoved = (tabId: number) => {
      setTabs(prev => prev.filter(t => t.id !== tabId));
    };

    const handleActivated = (activeInfo: Tabs.TabActiveInfo) => {
      chrome.tabs.get(activeInfo.tabId).then(tab => {
        setCurrentTab(tab);
      });
    };

    chrome.tabs.onCreated.addListener(handleCreated);
    chrome.tabs.onUpdated.addListener(handleUpdated);
    chrome.tabs.onRemoved.addListener(handleRemoved);
    chrome.tabs.onActivated.addListener(handleActivated);

    return () => {
      chrome.tabs.onCreated.removeListener(handleCreated);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
      chrome.tabs.onRemoved.removeListener(handleRemoved);
      chrome.tabs.onActivated.removeListener(handleActivated);
    };
  }, []);

  // Update a tab
  const updateTab = useCallback(async (
    tabId: number, 
    updateProperties: Tabs.UpdateUpdatePropertiesType
  ): Promise<Tabs.Tab> => {
    const [tab] = await chrome.tabs.update(tabId, updateProperties);
    return tab;
  }, []);

  // Create a new tab
  const createTab = useCallback(async (
    properties: Tabs.CreateCreatePropertiesType
  ): Promise<Tabs.Tab> => {
    const tab = await chrome.tabs.create(properties);
    return tab;
  }, []);

  // Close a tab
  const closeTab = useCallback(async (tabId: number): Promise<void> => {
    await chrome.tabs.remove(tabId);
  }, []);

  return {
    tabs,
    currentTab,
    isLoading,
    updateTab,
    createTab,
    closeTab,
    refetch: queryTabs
  };
}
```

## State Management Patterns {#state-management-patterns}

### Zustand for Extension State

Zustand is ideal for extensions because it doesn't require context providers and works across different extension contexts:

```typescript
// store/extensionStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ExtensionSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoSave: boolean;
  syncEnabled: boolean;
}

interface ExtensionState {
  // Settings
  settings: ExtensionSettings;
  updateSettings: (settings: Partial<ExtensionSettings>) => void;
  
  // UI State
  isPopupOpen: boolean;
  setPopupOpen: (open: boolean) => void;
  
  // Data
  cachedPages: Map<string, PageData>;
  cachePage: (url: string, data: PageData) => void;
  getCachedPage: (url: string) => PageData | undefined;
}

interface PageData {
  title: string;
  content: string;
  timestamp: number;
}

export const useExtensionStore = create<ExtensionState>()(
  persist(
    (set, get) => ({
      // Default settings
      settings: {
        theme: 'system',
        notifications: true,
        autoSave: true,
        syncEnabled: true,
      },
      
      updateSettings: (newSettings) => 
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        })),
      
      isPopupOpen: false,
      setPopupOpen: (open) => set({ isPopupOpen: open }),
      
      cachedPages: new Map(),
      
      cachePage: (url, data) => 
        set((state) => {
          const newCache = new Map(state.cachedPages);
          newCache.set(url, data);
          // Limit cache size
          if (newCache.size > 100) {
            const firstKey = newCache.keys().next().value;
            newCache.delete(firstKey);
          }
          return { cachedPages: newCache };
        }),
      
      getCachedPage: (url) => get().cachedPages.get(url),
    }),
    {
      name: 'extension-storage',
      storage: createJSONStorage(() => chrome.storage.sync),
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
```

### Cross-Context State Synchronization

Synchronize state between popup, options page, and background using a broadcast channel pattern:

```typescript
// store/syncStore.ts
import { create } from 'zustand';

// Use BroadcastChannel for cross-context communication
const stateChannel = new BroadcastChannel('extension_state_sync');

interface SyncStore {
  sharedState: Record<string, unknown>;
  updateSharedState: (updates: Record<string, unknown>) => void;
  subscribeToChanges: (callback: (state: Record<string, unknown>) => void) => () => void;
}

export const useSyncStore = create<SyncStore>((set, get) => {
  // Listen for state updates from other contexts
  stateChannel.onmessage = (event) => {
    if (event.data.type === 'STATE_UPDATE') {
      set({ sharedState: event.data.payload });
    }
  };

  return {
    sharedState: {},
    
    updateSharedState: (updates) => {
      const newState = { ...get().sharedState, ...updates };
      set({ sharedState: newState });
      
      // Broadcast to other contexts
      stateChannel.postMessage({
        type: 'STATE_UPDATE',
        payload: newState,
      });
    },
    
    subscribeToChanges: (callback) => {
      const listener = (event: MessageEvent) => {
        if (event.data.type === 'STATE_UPDATE') {
          callback(event.data.payload);
        }
      };
      stateChannel.addEventListener('message', listener);
      return () => stateChannel.removeEventListener('message', listener);
    },
  };
});
```

## Extension Architecture Patterns {#extension-architecture-patterns}

### Feature-Based Directory Structure

Organize your extension by feature rather than by file type:

```
src/
├── features/
│   ├── bookmarking/
│   │   ├── components/
│   │   │   ├── BookmarkButton.tsx
│   │   │   └── BookmarkList.tsx
│   │   ├── hooks/
│   │   │   └── useBookmarks.ts
│   │   ├── store/
│   │   │   └── bookmarkStore.ts
│   │   └── index.ts
│   ├── note-taking/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   └── index.ts
│   └── settings/
├── shared/
│   ├── components/
│   ├── hooks/
│   └── utils/
├── popup/
├── options/
├── sidepanel/
├── background/
└── content/
```

### Background-Initiated UI Updates

For features that require the background script to drive UI updates:

```typescript
// background/stateManager.ts
class ExtensionStateManager {
  private port: chrome.runtime.Port | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  connect(port: chrome.runtime.Port) {
    this.port = port;
    
    port.onMessage.addListener((message) => {
      const { type, payload, feature } = message;
      
      if (type === 'STATE_UPDATE' && feature) {
        this.notifyListeners(feature, payload);
      }
    });

    port.onDisconnect.addListener(() => {
      this.port = null;
    });
  }

  broadcast(feature: string, data: unknown) {
    if (this.port) {
      this.port.postMessage({
        type: 'STATE_UPDATE',
        feature,
        payload: data,
      });
    }
  }

  subscribe(feature: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(feature)) {
      this.listeners.set(feature, new Set());
    }
    this.listeners.get(feature)!.add(callback);

    return () => {
      this.listeners.get(feature)?.delete(callback);
    };
  }

  private notifyListeners(feature: string, data: unknown) {
    this.listeners.get(feature)?.forEach(callback => callback(data));
  }
}
```

## Content Script React Integration {#content-script-react-integration}

Injecting React into web pages requires special handling:

```typescript
// content-script/inject.tsx
import { createRoot } from 'react-dom/client';
import { ContentApp } from './ContentApp';

function mountReactComponent() {
  // Create a container that won't interfere with page styles
  const container = document.createElement('div');
  container.id = 'extension-root';
  container.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    top: 0;
    right: 0;
  `;
  
  // Use Shadow DOM for style isolation
  const shadowRoot = container.attachShadow({ mode: 'open' });
  const mountPoint = document.createElement('div');
  shadowRoot.appendChild(mountPoint);
  
  // Inject styles into Shadow DOM
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    /* Extension styles - isolated from page */
    .extension-button {
      background: #4285f4;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
  `;
  shadowRoot.appendChild(styleSheet);
  
  document.body.appendChild(container);
  
  // Mount React
  const root = createRoot(mountPoint);
  root.render(<ContentApp />);
  
  return () => {
    root.unmount();
    container.remove();
  };
}

// Only run once per page
if (!document.getElementById('extension-root')) {
  mountReactComponent();
}
```

## Performance Optimization {#performance-optimization}

### Memoization Strategies

React extensions face unique performance challenges due to multiple contexts and communication overhead:

```typescript
// hooks/useDebouncedStorage.ts
import { useEffect, useRef, useCallback } from 'react';

export function useDebouncedStorage<T>(
  value: T,
  key: string,
  delay: number = 500
) {
  const timeoutRef = useRef<number | null>(null);
  const valueRef = useRef(value);

  // Keep value ref updated
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Debounced save
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(async () => {
      try {
        await chrome.storage.sync.set({ [key]: valueRef.current });
      } catch (error) {
        console.error('Failed to save to storage:', error);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, delay]);

  return value;
}
```

### Lazy Loading Extension Features

Reduce initial load time by lazy loading features:

```typescript
// components/LazyFeature.tsx
import { lazy, Suspense, useState, useEffect } from 'react';

const LazyFeature = lazy(() => import('./HeavyFeature'));

function FeatureLoader() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Load on user interaction
    const handleInteraction = () => {
      setShouldLoad(true);
      document.removeEventListener('click', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    return () => document.removeEventListener('click', handleInteraction);
  }, []);

  if (!shouldLoad) {
    return <button onClick={() => setShouldLoad(true)}>Load Feature</button>;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyFeature />
    </Suspense>
  );
}
```

## Related Guides {#related-guides}

- [React Setup Guide](./chrome-extension-react-setup.md)
- [Content Script Frameworks](./content-script-frameworks.md)
- [Extension State Machines](./chrome-extension-state-machines.md)
- [Vite Extension Setup](./vite-extension-setup.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
