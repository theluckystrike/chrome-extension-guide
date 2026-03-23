---
layout: default
title: "Building Chrome Extensions with TypeScript — Developer Guide"
description: "A comprehensive tutorial for building Chrome extensions with TypeScript, covering project setup, tsconfig configuration, typed Chrome APIs, messaging patterns, storage wrappers, and build tooling."
canonical_url: "https://bestchromeextensions.com/tutorials/building-with-typescript/"
---

# Building Chrome Extensions with TypeScript

TypeScript has become the standard for building robust Chrome extensions. It provides compile-time type safety for Chrome APIs, enables intelligent autocomplete, and catches errors before runtime. This comprehensive guide covers everything you need to build type-safe Chrome extensions.

## Table of Contents

- [Project Setup](#project-setup)
- [Configuring tsconfig.json](#configuring-tsconfigjson)
- [Typing Chrome APIs](#typing-chrome-apis)
- [Typed Messaging](#typed-messaging)
- [Typed Storage Wrappers](#typed-storage-wrappers)
- [Build Tooling](#build-tooling)
- [Common Type Patterns](#common-type-patterns)
- [Debugging TypeScript Extensions](#debugging-typescript-extensions)

---

## Project Setup {#project-setup}

### Initializing Your Project

Create a new extension project with TypeScript:

```bash
mkdir my-typescript-extension && cd my-typescript-extension
npm init -y
npm install --save-dev typescript @types/chrome esbuild
mkdir -p src/background src/content src/popup src/shared
```

### Directory Structure

A well-organized TypeScript extension project:

```
my-extension/
├── src/
│   ├── background/
│   │   └── service-worker.ts    # Background service worker
│   ├── content/
│   │   └── content-script.ts    # Content script
│   ├── popup/
│   │   ├── popup.ts             # Popup logic
│   │   └── popup.html           # Popup UI
│   ├── options/
│   │   ├── options.ts           # Options page
│   │   └── options.html         # Options UI
│   └── shared/
│       ├── types.ts             # Shared type definitions
│       └── messages.ts          # Message type definitions
├── dist/                        # Compiled output
├── manifest.json
├── tsconfig.json
└── package.json
```

---

## Configuring tsconfig.json {#configuring-tsconfigjson}

### Base Configuration

Chrome extensions run in multiple contexts—some with DOM (popup, options, content scripts) and some without (service worker). Your `tsconfig.json` must account for these differences:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Context-Specific Configurations

For complex extensions, use separate tsconfig files for different contexts:

```json
// tsconfig.background.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["chrome"]
  },
  "include": ["src/background/**/*", "src/shared/**/*"]
}
```

```json
// tsconfig.ui.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome"]
  },
  "include": ["src/popup/**/*", "src/options/**/*", "src/shared/**/*"]
}
```

---

## Typing Chrome APIs {#typing-chrome-apis}

### Installing Type Definitions

Install the official Chrome type definitions:

```bash
npm install --save-dev @types/chrome
```

This provides full type support for all Chrome extension APIs.

### Using Typed Chrome APIs

With `@types/chrome` installed, you get full autocomplete and type checking:

```typescript
// Fully typed - TypeScript knows the exact shape
const queryOptions = { active: true, currentWindow: true };

chrome.tabs.query(queryOptions, (tabs) => {
  // tabs is fully typed as chrome.tabs.Tab[]
  const activeTab = tabs[0];
  
  if (activeTab.id && activeTab.url) {
    console.log(activeTab.id, activeTab.url);
  }
});

// Async/await pattern with proper typing
async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

// Typed storage operations
async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

async function loadSettings(): Promise<Settings | null> {
  const result = await chrome.storage.local.get('settings');
  return result.settings ?? null;
}
```

### Extending Chrome Types

When Chrome APIs don't cover your use case, extend the types:

```typescript
// src/shared/types/chrome-extensions.d.ts

declare namespace chrome.storage {
  interface StorageArea {
    get<T>(keys: string | string[] | null): Promise<Record<string, T>>;
    set<T>(items: Record<string, T>): Promise<void>;
  }
}

// Extend Tab type with custom properties
interface CustomTab extends chrome.tabs.Tab {
  customData?: {
    lastAccessed: number;
    visitCount: number;
  };
}
```

---

## Typed Messaging {#typed-messaging}

### Defining Message Types

Create a centralized message type definition:

```typescript
// src/shared/messages.ts

export type MessageMap = {
  // Request-response messages
  getSettings: {
    request: void;
    response: Settings;
  };
  
  saveBookmark: {
    request: { url: string; title: string; tags: string[] };
    response: { id: string; success: boolean };
  };
  
  // Fire-and-forget messages
  logAnalytics: {
    request: { event: string; data: Record<string, unknown> };
    response: void;
  };
  
  // Tab-specific messages
  highlightElements: {
    request: { selector: string; color: string };
    response: { count: number };
  };
};

export type MessageType = keyof MessageMap;
export type Request<T extends MessageType> = MessageMap[T]['request'];
export type Response<T extends MessageType> = MessageMap[T]['response'];
```

### Typed Message Handler

Create type-safe message handlers:

```typescript
// src/background/message-handler.ts

import { MessageMap } from '../shared/messages';

type MessageHandler<T extends keyof MessageMap> = (
  request: MessageMap[T]['request']
) => Promise<MessageMap[T]['response']>;

const handlers: {
  [K in keyof MessageMap]?: MessageHandler<K>;
} = {};

export function registerHandler<T extends keyof MessageMap>(
  type: T,
  handler: MessageHandler<T>
): void {
  handlers[type] = handler;
}

export async function handleMessage(
  message: { type: string; payload?: unknown },
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  const handler = handlers[message.type as keyof MessageMap];
  
  if (!handler) {
    throw new Error(`No handler registered for message type: ${message.type}`);
  }
  
  return handler(message.payload as any);
}

// Register handlers
registerHandler('getSettings', async () => {
  const result = await chrome.storage.local.get('settings');
  return result.settings ?? DEFAULT_SETTINGS;
});

registerHandler('saveBookmark', async (request) => {
  const id = generateId();
  await chrome.storage.local.set({ [id]: request });
  return { id, success: true };
});
```

### Sending Typed Messages

```typescript
// src/content/content-script.ts

import { MessageMap } from '../shared/messages';

async function sendMessage<T extends keyof MessageMap>(
  type: T,
  payload: MessageMap[T]['request']
): Promise<MessageMap[T]['response']> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Usage - fully typed
const settings = await sendMessage('getSettings', void 0);
const result = await sendMessage('saveBookmark', {
  url: 'https://example.com',
  title: 'Example',
  tags: ['bookmark'],
});
```

---

## Typed Storage Wrappers {#typed-storage-wrappers}

### Basic Typed Storage

Create a type-safe storage wrapper:

```typescript
// src/shared/storage.ts

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  maxResults: number;
  syncEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  notifications: true,
  maxResults: 50,
  syncEnabled: false,
};

class TypedStorage {
  private area: chrome.storage.StorageArea;
  
  constructor(area: 'local' | 'sync' | 'managed') {
    this.area = chrome.storage[area];
  }
  
  async get<K extends keyof Settings>(
    key: K
  ): Promise<Settings[K]> {
    const result = await this.area.get(key);
    return (result[key] ?? DEFAULT_SETTINGS[key]) as Settings[K];
  }
  
  async set<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ): Promise<void> {
    await this.area.set({ [key]: value });
  }
  
  async getAll(): Promise<Settings> {
    const result = await this.area.get(null);
    return { ...DEFAULT_SETTINGS, ...result } as Settings;
  }
  
  async setAll(settings: Partial<Settings>): Promise<void> {
    await this.area.set({ ...DEFAULT_SETTINGS, ...settings });
  }
}

export const localStorage = new TypedStorage('local');
export const syncStorage = new TypedStorage('sync');
```

### Storage with Validation

Add runtime validation with Zod:

```typescript
// src/shared/storage-validated.ts

import { z } from 'zod';

const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  notifications: z.boolean().default(true),
  maxResults: z.number().min(1).max(100).default(50),
  syncEnabled: z.boolean().default(false),
});

type Settings = z.infer<typeof SettingsSchema>;

class ValidatedStorage {
  private storage: chrome.storage.StorageArea;
  private schema: z.ZodSchema;
  
  constructor(area: chrome.storage.StorageArea, schema: z.ZodSchema) {
    this.storage = area;
    this.schema = schema;
  }
  
  async getAll(): Promise<unknown> {
    const data = await this.storage.get(null);
    return this.schema.parse(data);
  }
  
  async set(value: unknown): Promise<void> {
    const validated = this.schema.parse(value);
    await this.storage.set(validated);
  }
}
```

---

## Build Tooling {#build-tooling}

### esbuild Configuration

esbuild is the fastest option for building extensions:

```typescript
// build.ts

import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const isWatch = process.argv.includes('--watch');
const isProd = process.argv.includes('--production');

const commonOptions: esbuild.BuildOptions = {
  sourcemap: !isProd,
  minify: isProd,
  target: ['chrome110'],
  format: 'iife',
  bundle: true,
  logLevel: 'info',
};

async function build() {
  // Background service worker
  await esbuild.build({
    ...commonOptions,
    entryPoints: ['src/background/service-worker.ts'],
    outfile: 'dist/background/service-worker.js',
    target: ['chrome110'],
  });
  
  // Content scripts
  await esbuild.build({
    ...commonOptions,
    entryPoints: ['src/content/content-script.ts'],
    outfile: 'dist/content/content-script.js',
  });
  
  // Popup
  await esbuild.build({
    ...commonOptions,
    entryPoints: ['src/popup/popup.ts'],
    outfile: 'dist/popup/popup.js',
  });
  
  // Copy static files
  copyFileSync('src/popup/popup.html', 'dist/popup/popup.html');
  copyFileSync('manifest.json', 'dist/manifest.json');
}

build();
```

### Vite Configuration

Vite provides an excellent developer experience:

```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
        content: resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const map: Record<string, string> = {
            background: 'background/service-worker.js',
            content: 'content/content-script.js',
          };
          return map[chunkInfo.name] ?? `${chunkInfo.name}/index.js`;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
```

### webpack Configuration

For complex builds with code splitting:

```javascript
// webpack.config.js

const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    'background/service-worker': './src/background/service-worker.ts',
    'content/content-script': './src/content/content-script.ts',
    'popup/popup': './src/popup/popup.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
```

---

## Common Type Patterns {#common-type-patterns}

### Nullable Tab Handling

```typescript
// Safe tab access with proper null handling
async function safeTabAccess(tabId: number): Promise<string | null> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.url ?? null;
  } catch (error) {
    console.error('Tab not found:', error);
    return null;
  }
}

// Optional chaining for nested properties
function getTabTitle(tab: chrome.tabs.Tab): string {
  return tab.title ?? 'Untitled';
}
```

### Manifest Type Safety

```typescript
// Typed manifest configuration
import type { Manifest } from './types/manifest';

const manifest: Manifest.V3 = {
  manifest_version: 3,
  name: 'My Extension',
  version: '1.0.0',
  background: {
    service_worker: 'background/service-worker.js',
    type: 'module',
  },
  permissions: ['storage', 'tabs'],
  host_permissions: ['<all_urls>'],
};
```

### Promise-Based Chrome API Wrapper

```typescript
// Convert callback-based APIs to promises
function getStoredValue<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] ?? null);
    });
  });
}

function setStoredValue<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}
```

### Event Type Safety

```typescript
// Typed event listeners
chrome.tabs.onUpdated.addListener(
  (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      console.log('Tab loaded:', tab.url);
    }
  }
);

// Custom event types
interface ExtensionEvent<T> {
  addListener(callback: (data: T) => void): void;
  removeListener(callback: (data: T) => void): void;
}
```

---

## Debugging TypeScript Extensions {#debugging-typescript-extensions}

### Source Maps in Production

Enable source maps for debugging deployed extensions:

```json
// tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

In your build configuration:

```typescript
// esbuild build options
{
  sourcemap: true,
  minify: false, // Disable minification for easier debugging
}
```

### Chrome DevTools Tips

1. **Service Worker Debugging**: Open `chrome://extensions` and click "service worker" link to access background context
2. **Content Script Debugging**: Use the page's DevTools (not extension DevTools) for content scripts
3. **Console Filtering**: Filter by context using dropdown in Console tab

### Type-Safe Console Logging

```typescript
// Debug utilities with type information
function debug<T>(label: string, value: T): void {
  console.log(`[${label}]`, value);
  console.log(`Type: ${typeof value}`);
}

function debugJson<T>(label: string, value: T): void {
  console.log(`[${label}]`, JSON.stringify(value, null, 2));
}
```

### Common TypeScript Errors

**Error: `Property 'X' does not exist on type 'Y'`**
- Solution: Ensure `@types/chrome` is installed and `lib` includes correct context

**Error: `Module '"chrome"' has no exported member 'storage'`**
- Solution: Add `"types": ["chrome"]` to tsconfig compilerOptions

**Error: `Expression of type 'X' can't be used to index type 'Y'`**
- Solution: Use type guards or exact optional property types

---

## Related Articles

- [TypeScript Setup Guide](https://bestchromeextensions.com/guides/typescript-setup/) — Detailed TypeScript configuration for Chrome extensions
- [TypeScript Extensions](https://bestchromeextensions.com/guides/typescript-extensions/) — Additional TypeScript patterns and practices
- [Message Passing Best Practices](https://bestchromeextensions.com/guides/message-passing-best-practices/) — Comprehensive guide to typed messaging between extension components

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
