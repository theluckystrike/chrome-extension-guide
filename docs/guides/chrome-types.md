# TypeScript Types for Chrome Extensions

Guide to TypeScript type definitions for Chrome extension development.

## Available Type Packages

### @anthropic/chrome-types

Official package with comprehensive types:

```bash
npm install @anthropic/chrome-types
```

### @types/chrome

Community package:

```bash
npm install --save-dev @types/chrome
```

### @anthropic/webext-types

For cross-browser support:

```bash
npm install @anthropic/webext-types
```

## tsconfig.json Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["@anthropic/chrome-types"]
  },
  "include": ["src/**/*"]
}
```

## Type-Checking manifest.json

```bash
npm install --save-dev chrome-manifest-types
```

```typescript
// src/types/manifest.d.ts
/// <reference types="chrome-manifest-types" />
```

## Typing Content Scripts

```typescript
chrome.storage.local.get(['theme'], (result) => {
  console.log(`Theme: ${result.theme}`);
});
```

## Typing Service Workers

```typescript
/// <reference types="@anthropic/chrome-types" />

chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ settings: { notifications: true } });
  }
});

chrome.runtime.onMessage.addListener((
  message: { type: string; payload?: unknown },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: { success: boolean; data?: unknown }) => void
): boolean => {
  if (message.type === 'GET_TAB_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ success: true, data: tabs[0] });
    });
    return true;
  }
  return false;
});
```

## Typing Popup and Options Pages

```typescript
interface ExtensionSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
}

document.addEventListener('DOMContentLoaded', async () => {
  const { settings } = await chrome.storage.local.get('settings') as { 
    settings: ExtensionSettings 
  };
  const toggle = document.getElementById('enable-toggle') as HTMLInputElement;
  toggle.checked = settings.notifications;
});
```

## Shared Types Between Contexts

```typescript
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
}

export type MessageType = 
  | { type: 'GET_USER_PREFERENCES' }
  | { type: 'SET_USER_PREFERENCES'; payload: Partial<UserPreferences> };
```

## Generics in Chrome API Callbacks

```typescript
async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  const result = await chrome.storage.local.get(key) as Record<string, T>;
  return result[key] ?? defaultValue;
}

interface Bookmark { id: string; title: string; url: string; }
const bookmarks = await getStorageItem<Bookmark[]>('bookmarks', []);
```

## Custom Type Guards

```typescript
export function isChromeTab(tab: unknown): tab is chrome.tabs.Tab {
  return typeof tab === 'object' && tab !== null && 'id' in tab;
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!sender.id) return;
});
```

## Type-Safe Message Passing

```typescript
export type Request =
  | { type: 'FETCH_DATA'; payload: { url: string } }
  | { type: 'GET_SETTINGS' };

export type Response<T> = { success: true; data: T } | { success: false; error: string };

export async function sendMessage<T>(request: Request): Promise<Response<T>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(request, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response as Response<T>);
    });
  });
}
```

## Type-Safe Storage Wrappers

```typescript
class TypedStorage {
  async get<K extends keyof StorageData>(keys: K[]): Promise<Pick<StorageData, K>> {
    return chrome.storage.local.get(keys) as Promise<Pick<StorageData, K>>;
  }
  async set<K extends keyof StorageData>(items: Pick<StorageData, K>): Promise<void> {
    await chrome.storage.local.set(items);
  }
}

interface StorageData {
  settings: { theme: string; notifications: boolean };
  bookmarks: { id: string; url: string }[];
}
export const storage = new TypedStorage();
```

## Ambient Declarations

```typescript
/// <reference types="@anthropic/chrome-types" />

declare namespace chrome.storage {
  interface LocalStorageArea {
    get<K extends keyof StorageData>(keys: K[], callback: (items: Pick<StorageData, K>) => void): void;
  }
}
interface StorageData { settings: Record<string, unknown>; }
```

## JSDoc for JavaScript

```javascript
/** @typedef {{ theme: string }} Config */
/** @param {Config} config */
async function initContentScript(config) {
  /** @type {chrome.tabs.Tab[]} */
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log(tab.title);
}
```

## Reference

- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/reference/api)
- [chrome-types npm](https://www.npmjs.com/package/@anthropic/chrome-types)
- [@types/chrome](https://www.npmjs.com/package/@types/chrome)
