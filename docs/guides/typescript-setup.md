# TypeScript Configuration for Chrome Extensions

TypeScript brings type safety, better tooling, and maintainability to Chrome extension development. This guide covers the definitive setup for TypeScript in Manifest V3 extensions, from compiler configuration to advanced patterns for typed messaging and storage.

## Table of Contents

- [Base tsconfig.json for Chrome Extensions](#base-tsconfigjson-for-chrome-extensions)
- [Chrome API Type Definitions](#chrome-api-type-definitions)
- [Multiple tsconfig Files for Different Contexts](#multiple-tsconfig-files-for-different-contexts)
- [Project References for Shared Types](#project-references-for-shared-types)
- [Shared Message Types and Storage Schemas](#shared-message-types-and-storage-schemas)
- [Path Aliases for Clean Imports](#path-aliases-for-clean-imports)
- [Declaration Files for Chrome APIs](#declaration-files-for-chrome-apis)
- [Strict Mode Recommendations](#strict-mode-recommendations)
- [Build Configuration with Vite and TypeScript](#build-configuration-with-vite-and-typescript)
- [Common TypeScript Errors and Fixes](#common-typescript-errors-and-fixes)
- [Type Guards for Message Handling](#type-guards-for-message-handling)
- [Generic Patterns for Typed Storage and Messaging](#generic-patterns-for-typed-storage-and-messaging)

---

## Base tsconfig.json for Chrome Extensions

Chrome extensions run in a browser environment, but the service worker context lacks DOM APIs. A well-tuned `tsconfig.json` accounts for these constraints.

```jsonc
// tsconfig.json (base configuration)
{
  "compilerOptions": {
    // Target ES2022 for top-level await, private fields, and Array.at()
    "target": "ES2022",

    // ESNext modules; bundler will handle resolution
    "module": "ESNext",
    "moduleResolution": "bundler",

    // Include DOM for popup/content scripts, Chrome types separately
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    // Output settings
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    // Strict type checking (see Strict Mode section)
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Module interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,

    // Skip type checking node_modules
    "skipLibCheck": true,

    // Resolve JSON imports (useful for manifest)
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### Key Setting Rationale

| Setting | Value | Why |
|---------|-------|-----|
| `target` | `ES2022` | Chrome 109+ supports ES2022 natively; no transpilation overhead |
| `module` | `ESNext` | Lets Vite/webpack handle module bundling |
| `moduleResolution` | `bundler` | Aligns with how modern bundlers resolve imports |
| `lib` | `ES2022, DOM` | ES2022 for language features, DOM for content scripts and popups |
| `isolatedModules` | `true` | Required by most bundlers (Vite, esbuild) for per-file transpilation |
| `noUncheckedIndexedAccess` | `true` | Prevents unsafe property access on objects and arrays |

---

## Chrome API Type Definitions

Several npm packages provide TypeScript definitions for the `chrome.*` namespace. Understanding the differences matters.

### Package Comparison

| Package | Source | Notes |
|---------|--------|-------|
| `chrome-types` | Auto-generated from Chromium source | Most accurate, updated frequently |
| `@anthropic-ai/chrome-types` | Fork with MV3 improvements | Better service worker typing |
| `@anthropic-ai/browser-types` | Cross-browser WebExtension types | Use for cross-browser extensions |
| `@anthropic-ai/chrome-types` | Enhanced Chrome API types | Stricter generics, better docs |
| `@anthropic-ai/browser-types` | Browser extension standard types | Maps to `browser.*` namespace |
| `@anthropic-ai/chrome-types` | Chrome-specific MV3 types | Includes experimental APIs |
| `@anthropic-ai/browser-types` | WebExtension polyfill compatible | Works with `webextension-polyfill` |

### Installation and Setup

```bash
# Option 1: chrome-types (community standard)
npm install -D chrome-types

# Option 2: @anthropic-ai/chrome-types (enhanced, MV3-focused)
npm install -D @anthropic-ai/chrome-types

# Option 3: cross-browser support
npm install -D @anthropic-ai/browser-types
```

After installation, add the types to your `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "types": ["chrome-types"]
    // or: "types": ["@anthropic-ai/chrome-types"]
  }
}
```

Alternatively, use a triple-slash directive at the top of files that use Chrome APIs:

```typescript
/// <reference types="chrome-types" />
```

### Verifying Types Work

```typescript
// This should compile without errors
chrome.runtime.onInstalled.addListener((details) => {
  // 'details' is typed as chrome.runtime.InstalledDetails
  console.log(`Installed: ${details.reason}`);
});

// This should produce a type error
chrome.runtime.onInstalled.addListener((details) => {
  details.nonExistentProperty; // Error: Property does not exist
});
```

---

## Multiple tsconfig Files for Different Contexts

Chrome extensions have three distinct execution contexts, each with different available APIs. Use separate tsconfig files to enforce correct API usage per context.

### Directory Structure

```
my-extension/
  src/
    background/
      service-worker.ts
      alarms.ts
    content/
      injector.ts
      observer.ts
    popup/
      popup.ts
      components/
    shared/
      types.ts
      messages.ts
      storage.ts
  tsconfig.json           # Base config
  tsconfig.background.json
  tsconfig.content.json
  tsconfig.popup.json
```

### Background Script Config

The service worker has no DOM access. Exclude DOM from `lib`:

```jsonc
// tsconfig.background.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "WebWorker"],
    "outDir": "dist/background",
    "rootDir": "src",
    "types": ["chrome-types"]
  },
  "include": [
    "src/background/**/*.ts",
    "src/shared/**/*.ts"
  ]
}
```

Using `"lib": ["ES2022", "WebWorker"]` instead of `"DOM"` prevents accidentally referencing `document`, `window`, or other DOM globals in the service worker -- the compiler will flag them as errors.

### Content Script Config

Content scripts have DOM access but limited Chrome API access:

```jsonc
// tsconfig.content.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist/content",
    "rootDir": "src",
    "types": ["chrome-types"]
  },
  "include": [
    "src/content/**/*.ts",
    "src/shared/**/*.ts"
  ]
}
```

### Popup/Options Page Config

Popup pages are standard web pages with full DOM and Chrome API access:

```jsonc
// tsconfig.popup.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist/popup",
    "rootDir": "src",
    "jsx": "react-jsx",
    "types": ["chrome-types"]
  },
  "include": [
    "src/popup/**/*.ts",
    "src/popup/**/*.tsx",
    "src/shared/**/*.ts"
  ]
}
```

### Running Type Checks Per Context

```bash
# Check each context independently
npx tsc --project tsconfig.background.json --noEmit
npx tsc --project tsconfig.content.json --noEmit
npx tsc --project tsconfig.popup.json --noEmit
```

Add these to `package.json` scripts:

```json
{
  "scripts": {
    "typecheck": "npm run typecheck:bg && npm run typecheck:content && npm run typecheck:popup",
    "typecheck:bg": "tsc -p tsconfig.background.json --noEmit",
    "typecheck:content": "tsc -p tsconfig.content.json --noEmit",
    "typecheck:popup": "tsc -p tsconfig.popup.json --noEmit"
  }
}
```

---

## Project References for Shared Types

TypeScript project references let you split a project into smaller pieces with explicit dependency relationships. This is ideal for extension contexts that share types.

```jsonc
// tsconfig.json (root, references only)
{
  "files": [],
  "references": [
    { "path": "./tsconfig.shared.json" },
    { "path": "./tsconfig.background.json" },
    { "path": "./tsconfig.content.json" },
    { "path": "./tsconfig.popup.json" }
  ]
}
```

```jsonc
// tsconfig.shared.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist/shared",
    "rootDir": "src/shared",
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  },
  "include": ["src/shared/**/*.ts"]
}
```

Each context config then references the shared project:

```jsonc
// tsconfig.background.json (with references)
{
  "compilerOptions": {
    "composite": true,
    "lib": ["ES2022", "WebWorker"],
    "outDir": "dist/background",
    "rootDir": "src",
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["chrome-types"]
  },
  "include": ["src/background/**/*.ts"],
  "references": [
    { "path": "./tsconfig.shared.json" }
  ]
}
```

Build with `--build` to respect references:

```bash
npx tsc --build
```

---

## Shared Message Types and Storage Schemas

Define a single source of truth for message payloads and storage shapes used across all contexts.

### Message Type Definitions

```typescript
// src/shared/messages.ts

/** All possible message types in the extension */
export type MessageType =
  | 'FETCH_DATA'
  | 'UPDATE_SETTINGS'
  | 'CONTENT_EXTRACTED'
  | 'TAB_ACTIVATED'
  | 'BADGE_UPDATE';

/** Base message shape */
interface BaseMessage<T extends MessageType, P = void> {
  type: T;
  payload: P;
  timestamp: number;
}

/** Message payloads by type */
export type FetchDataMessage = BaseMessage<'FETCH_DATA', {
  url: string;
  options?: RequestInit;
}>;

export type UpdateSettingsMessage = BaseMessage<'UPDATE_SETTINGS', {
  theme: 'light' | 'dark';
  notifications: boolean;
}>;

export type ContentExtractedMessage = BaseMessage<'CONTENT_EXTRACTED', {
  title: string;
  text: string;
  url: string;
}>;

export type TabActivatedMessage = BaseMessage<'TAB_ACTIVATED', {
  tabId: number;
  windowId: number;
}>;

export type BadgeUpdateMessage = BaseMessage<'BADGE_UPDATE', {
  count: number;
  color?: string;
}>;

/** Union of all messages */
export type ExtensionMessage =
  | FetchDataMessage
  | UpdateSettingsMessage
  | ContentExtractedMessage
  | TabActivatedMessage
  | BadgeUpdateMessage;

/** Response types mapped to message types */
export type MessageResponseMap = {
  FETCH_DATA: { data: unknown; status: number };
  UPDATE_SETTINGS: { success: boolean };
  CONTENT_EXTRACTED: { saved: boolean; id: string };
  TAB_ACTIVATED: void;
  BADGE_UPDATE: void;
};
```

### Storage Schema

```typescript
// src/shared/storage.ts

/** Shape of data in chrome.storage.local */
export interface LocalStorageSchema {
  settings: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
  cache: {
    lastFetch: number;
    data: Record<string, unknown>;
  };
  history: Array<{
    url: string;
    visitedAt: number;
    title: string;
  }>;
}

/** Shape of data in chrome.storage.sync */
export interface SyncStorageSchema {
  preferences: {
    fontSize: number;
    showBadge: boolean;
  };
  savedItems: string[];
}
```

---

## Path Aliases for Clean Imports

Path aliases prevent deeply nested relative imports like `../../../shared/types`.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@background/*": ["src/background/*"],
      "@content/*": ["src/content/*"],
      "@popup/*": ["src/popup/*"]
    }
  }
}
```

Usage in source files:

```typescript
// Before: messy relative imports
import { ExtensionMessage } from '../../../shared/messages';
import { LocalStorageSchema } from '../../../shared/storage';

// After: clean alias imports
import { ExtensionMessage } from '@shared/messages';
import { LocalStorageSchema } from '@shared/storage';
```

### Vite Alias Configuration

Vite needs its own alias configuration to resolve these paths at build time:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@background': resolve(__dirname, 'src/background'),
      '@content': resolve(__dirname, 'src/content'),
      '@popup': resolve(__dirname, 'src/popup'),
    },
  },
});
```

---

## Declaration Files for Chrome APIs

When Chrome types packages lag behind the latest APIs or you use experimental features, write ambient declaration files to fill the gaps.

```typescript
// src/types/chrome-extensions.d.ts

/**
 * Ambient declarations for Chrome APIs not yet in published types.
 * Remove entries as official types catch up.
 */

declare namespace chrome.sidePanel {
  interface SidePanelOptions {
    tabId?: number;
    path?: string;
    enabled?: boolean;
  }

  function setOptions(options: SidePanelOptions): Promise<void>;
  function getOptions(options: { tabId?: number }): Promise<SidePanelOptions>;
  function open(options: { tabId?: number; windowId?: number }): Promise<void>;
  function setPanelBehavior(
    behavior: { openPanelOnActionClick: boolean }
  ): Promise<void>;
}

declare namespace chrome.readingList {
  interface ReadingListEntry {
    url: string;
    title: string;
    hasBeenRead: boolean;
    lastUpdateTime: number;
    creationTime: number;
  }

  function addEntry(entry: {
    url: string;
    title: string;
    hasBeenRead?: boolean;
  }): Promise<void>;
  function removeEntry(info: { url: string }): Promise<void>;
  function query(info: Partial<ReadingListEntry>): Promise<ReadingListEntry[]>;
  function updateEntry(info: {
    url: string;
    title?: string;
    hasBeenRead?: boolean;
  }): Promise<void>;
}
```

Include the declaration file in your tsconfig:

```jsonc
{
  "include": [
    "src/**/*.ts",
    "src/types/**/*.d.ts"
  ]
}
```

---

## Strict Mode Recommendations

Enable all strict checks. Each one prevents a real category of bugs in extension code.

```jsonc
{
  "compilerOptions": {
    // The "strict" flag enables all of these:
    "strict": true,
    // Plus these additional strict checks:
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

### Why Each Flag Matters for Extensions

**`strictNullChecks`** (included in `strict`): Chrome APIs frequently return `undefined`. Tabs may not exist, storage may be empty.

```typescript
// Without strictNullChecks -- silent bug
const tab = await chrome.tabs.get(tabId);
console.log(tab.url.length); // Runtime crash if tab.url is undefined

// With strictNullChecks -- caught at compile time
const tab = await chrome.tabs.get(tabId);
console.log(tab.url?.length); // Must handle undefined
```

**`noUncheckedIndexedAccess`**: Storage data and message payloads often use dynamic keys.

```typescript
const data = await chrome.storage.local.get('settings');
// Without: data['settings'] is typed as any
// With: data['settings'] is typed as unknown | undefined -- must check
```

**`exactOptionalPropertyTypes`**: Prevents passing `undefined` where a property should be omitted entirely. Relevant for Chrome API options objects.

```typescript
// With exactOptionalPropertyTypes
interface NotificationOptions {
  title: string;
  iconUrl?: string; // means "string if present", NOT "string | undefined"
}

// Error: undefined is not assignable
const opts: NotificationOptions = { title: 'Hi', iconUrl: undefined };

// Correct: omit the property
const opts: NotificationOptions = { title: 'Hi' };
```

---

## Build Configuration with Vite and TypeScript

Vite provides fast builds with native ESM support. Here is a complete Vite setup for a Chrome extension.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Output to dist/ for loading as unpacked extension
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        // Each entry point becomes a separate bundle
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/injector.ts'),
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
      },
      output: {
        // Predictable file names (no hashes) for manifest.json references
        entryFileNames: '[name]/index.js',
        chunkFileNames: 'shared/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },

    // No minification during development for easier debugging
    minify: process.env.NODE_ENV === 'production',
    sourcemap: process.env.NODE_ENV !== 'production' ? 'inline' : false,

    // Target Chrome's V8 directly
    target: 'esnext',
  },

  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@background': resolve(__dirname, 'src/background'),
      '@content': resolve(__dirname, 'src/content'),
      '@popup': resolve(__dirname, 'src/popup'),
    },
  },
});
```

### Package Scripts

```json
{
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "tsc --noEmit && vite build --mode production",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview"
  }
}
```

### Using CRXJS Vite Plugin

The `@crxjs/vite-plugin` simplifies extension builds by reading `manifest.json` directly:

```typescript
// vite.config.ts with CRXJS
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    target: 'esnext',
  },
});
```

This approach lets Vite auto-discover entry points from the manifest and handles HMR for popup and options pages during development.

---

## Common TypeScript Errors and Fixes

### Error: Property does not exist on type 'chrome'

**Cause**: Missing or outdated type definitions.

```bash
# Fix: install or update chrome types
npm install -D chrome-types@latest
```

### Error: Cannot find name 'document' in service worker

**Cause**: Using DOM APIs in a service worker context.

```typescript
// Wrong: DOM not available in service worker
document.getElementById('app'); // Error with WebWorker lib

// Right: use message passing to have content script interact with DOM
chrome.tabs.sendMessage(tabId, { type: 'GET_ELEMENT' });
```

### Error: Type 'void' is not assignable to type 'boolean | undefined'

**Cause**: `onMessage` listener return type mismatch. The listener must return `true` to indicate it will send an asynchronous response.

```typescript
// Wrong
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetchData().then((data) => sendResponse(data));
  // Implicitly returns void, but Chrome expects true for async
});

// Right
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  fetchData().then((data) => sendResponse(data));
  return true; // Keep the message channel open
});
```

### Error: Argument of type 'string' is not assignable to parameter

**Cause**: Chrome APIs expect string literal unions, not plain `string`.

```typescript
// Wrong
const reason: string = 'install';
if (details.reason === reason) { } // Works but loses type narrowing

// Right
const reason: chrome.runtime.OnInstalledReason = 'install';
if (details.reason === reason) { } // Proper literal type
```

### Error: Promise returned but not awaited

**Cause**: MV3 Chrome APIs return promises, but older patterns used callbacks.

```typescript
// Old callback style (still works but types may conflict)
chrome.storage.local.get(['key'], (result) => { });

// Modern async/await style
const result = await chrome.storage.local.get(['key']);
```

---

## Type Guards for Message Handling

Type guards narrow the `ExtensionMessage` union to specific message types, giving you safe access to payload properties.

### Basic Type Guard

```typescript
import type { ExtensionMessage, MessageType } from '@shared/messages';

function isMessageType<T extends MessageType>(
  message: ExtensionMessage,
  type: T
): message is Extract<ExtensionMessage, { type: T }> {
  return message.type === type;
}

// Usage in message listener
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (isMessageType(message, 'FETCH_DATA')) {
    // message.payload is typed as { url: string; options?: RequestInit }
    fetch(message.payload.url, message.payload.options)
      .then((res) => res.json())
      .then((data) => sendResponse({ data, status: 200 }));
    return true;
  }

  if (isMessageType(message, 'UPDATE_SETTINGS')) {
    // message.payload is typed as { theme: 'light' | 'dark'; notifications: boolean }
    applySettings(message.payload);
    sendResponse({ success: true });
  }
});
```

### Exhaustive Message Handler

Use a `switch` statement with `never` checking to ensure all message types are handled:

```typescript
function handleMessage(message: ExtensionMessage): void {
  switch (message.type) {
    case 'FETCH_DATA':
      handleFetchData(message.payload);
      break;
    case 'UPDATE_SETTINGS':
      handleUpdateSettings(message.payload);
      break;
    case 'CONTENT_EXTRACTED':
      handleContentExtracted(message.payload);
      break;
    case 'TAB_ACTIVATED':
      handleTabActivated(message.payload);
      break;
    case 'BADGE_UPDATE':
      handleBadgeUpdate(message.payload);
      break;
    default:
      // If you add a new MessageType but forget to handle it here,
      // TypeScript will report an error on this line
      const _exhaustive: never = message;
      throw new Error(`Unhandled message type: ${(_exhaustive as ExtensionMessage).type}`);
  }
}
```

### Runtime Validation

For messages received from external sources (other extensions or web pages), validate at runtime:

```typescript
function isValidExtensionMessage(value: unknown): value is ExtensionMessage {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.type !== 'string') return false;
  if (typeof obj.timestamp !== 'number') return false;

  const validTypes: MessageType[] = [
    'FETCH_DATA', 'UPDATE_SETTINGS', 'CONTENT_EXTRACTED',
    'TAB_ACTIVATED', 'BADGE_UPDATE',
  ];

  return validTypes.includes(obj.type as MessageType);
}
```

---

## Generic Patterns for Typed Storage and Messaging

### Typed Storage Wrapper

Wrap `chrome.storage` with generics so that keys and values are always type-safe:

```typescript
// src/shared/typed-storage.ts
import type { LocalStorageSchema, SyncStorageSchema } from './storage';

type StorageArea = 'local' | 'sync';
type SchemaFor<A extends StorageArea> = A extends 'local'
  ? LocalStorageSchema
  : SyncStorageSchema;

class TypedStorage<A extends StorageArea> {
  private area: chrome.storage.StorageArea;

  constructor(area: A) {
    this.area = area === 'local' ? chrome.storage.local : chrome.storage.sync;
  }

  async get<K extends keyof SchemaFor<A>>(
    key: K
  ): Promise<SchemaFor<A>[K] | undefined> {
    const result = await this.area.get(key as string);
    return result[key as string] as SchemaFor<A>[K] | undefined;
  }

  async set<K extends keyof SchemaFor<A>>(
    key: K,
    value: SchemaFor<A>[K]
  ): Promise<void> {
    await this.area.set({ [key as string]: value });
  }

  async remove<K extends keyof SchemaFor<A>>(key: K): Promise<void> {
    await this.area.remove(key as string);
  }

  onChange<K extends keyof SchemaFor<A>>(
    key: K,
    callback: (newValue: SchemaFor<A>[K], oldValue: SchemaFor<A>[K]) => void
  ): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== (this.area === chrome.storage.local ? 'local' : 'sync')) {
        return;
      }
      const change = changes[key as string];
      if (change) {
        callback(
          change.newValue as SchemaFor<A>[K],
          change.oldValue as SchemaFor<A>[K]
        );
      }
    });
  }
}

// Export typed instances
export const localStorage = new TypedStorage('local');
export const syncStorage = new TypedStorage('sync');
```

Usage:

```typescript
import { localStorage } from '@shared/typed-storage';

// Fully typed -- key must be keyof LocalStorageSchema, value matches
await localStorage.set('settings', {
  theme: 'dark',
  notifications: true,
  language: 'en',
});

// Type error: 'invalid' is not a valid key
await localStorage.get('invalid');

// Type error: wrong value shape
await localStorage.set('settings', { wrong: true });
```

### Typed Message Sender

```typescript
// src/shared/typed-messaging.ts
import type {
  ExtensionMessage,
  MessageType,
  MessageResponseMap,
} from './messages';

/** Send a typed message and get a typed response */
export async function sendMessage<T extends MessageType>(
  message: Extract<ExtensionMessage, { type: T }>
): Promise<MessageResponseMap[T]> {
  return chrome.runtime.sendMessage(message);
}

/** Send a typed message to a specific tab */
export async function sendTabMessage<T extends MessageType>(
  tabId: number,
  message: Extract<ExtensionMessage, { type: T }>
): Promise<MessageResponseMap[T]> {
  return chrome.tabs.sendMessage(tabId, message);
}

/** Helper to create a properly typed message */
export function createMessage<T extends MessageType>(
  type: T,
  payload: Extract<ExtensionMessage, { type: T }>['payload']
): Extract<ExtensionMessage, { type: T }> {
  return {
    type,
    payload,
    timestamp: Date.now(),
  } as Extract<ExtensionMessage, { type: T }>;
}
```

Usage:

```typescript
import { sendMessage, createMessage } from '@shared/typed-messaging';

// Type-safe message creation and sending
const message = createMessage('FETCH_DATA', {
  url: 'https://api.example.com/data',
});

const response = await sendMessage(message);
// response is typed as { data: unknown; status: number }

// Type error: wrong payload for this message type
const bad = createMessage('FETCH_DATA', { theme: 'dark' });
```

### Typed Event Emitter for Internal Communication

```typescript
// src/shared/typed-events.ts

type EventMap = {
  settingsChanged: { key: string; value: unknown };
  dataFetched: { url: string; data: unknown };
  error: { code: string; message: string };
};

class TypedEventEmitter {
  private listeners = new Map<string, Set<Function>>();

  on<K extends keyof EventMap>(
    event: K,
    handler: (data: EventMap[K]) => void
  ): () => void {
    const handlers = this.listeners.get(event as string) ?? new Set();
    handlers.add(handler);
    this.listeners.set(event as string, handlers);

    // Return unsubscribe function
    return () => handlers.delete(handler);
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const handlers = this.listeners.get(event as string);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}

export const events = new TypedEventEmitter();
```

---

## Summary

A well-configured TypeScript setup for Chrome extensions involves:

1. **Separate tsconfig files** per execution context to prevent DOM usage in service workers and enforce API boundaries.
2. **Project references** for shared types that are consumed by all contexts.
3. **Strict compiler flags** to catch the null-safety and type-narrowing bugs that Chrome APIs are prone to.
4. **Typed wrappers** around `chrome.storage` and `chrome.runtime.sendMessage` to eliminate `any` at API boundaries.
5. **Type guards** and exhaustive switches for message handling to ensure every message type is accounted for.
6. **Path aliases** synced between `tsconfig.json` and your bundler for clean imports across contexts.

These patterns scale from small utility extensions to complex multi-context applications with dozens of message types and storage schemas.
