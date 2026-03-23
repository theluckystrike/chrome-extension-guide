---
layout: post
title: "Chrome Extension Development with TypeScript in 2025: Complete Setup Guide"
description: "Master TypeScript for Chrome extensions in 2025 with this complete setup guide. Learn Manifest V3 patterns, type-safe development, and build production-ready extensions with confidence."
date: 2025-02-21
categories: [Chrome-Extensions, TypeScript]
tags: [typescript, chrome-extension, setup]
keywords: "chrome extension typescript, typescript chrome extension, chrome extension ts setup, manifest v3 typescript, type safe chrome extension"
canonical_url: "https://bestchromeextensions.com/2025/02/21/chrome-extension-typescript-setup-2025/"
---

Chrome Extension Development with TypeScript in 2025: Complete Setup Guide

TypeScript has become the standard for building solid Chrome extensions in 2025. With its powerful type system, intelligent autocomplete, and compile-time error detection, TypeScript transforms extension development from a debugging-heavy experience into a streamlined, maintainable workflow. Whether you are building a simple popup tool or a complex extension with service workers and multiple content scripts, TypeScript provides the type safety that modern development demands.

This comprehensive guide walks you through setting up a production-ready Chrome extension project with TypeScript in 2025. We will cover everything from project initialization to building, testing, and deploying type-safe extensions that use the full power of Manifest V3.

---

Why Use TypeScript for Chrome Extensions? {#why-typescript}

The Chrome extension ecosystem has evolved significantly, and with Manifest V3 came increased complexity in extension architecture. Service workers, multiple content script contexts, message passing between components, and the chrome.runtime API all benefit tremendously from TypeScript's type definitions.

Type Safety Catches Bugs Early

One of the most compelling reasons to adopt TypeScript is its ability to catch errors before runtime. Consider the difference between JavaScript and TypeScript when working with the Chrome Storage API:

```javascript
// JavaScript - prone to runtime errors
chrome.storage.local.get('settings', (result) => {
  const settings = result.settings;
  settings.theme = 'dark'; // TypeError if settings is undefined
  chrome.storage.local.set({ settings });
});
```

```typescript
// TypeScript - compile-time safety
chrome.storage.local.get('settings').then((result) => {
  const settings = result.settings;
  if (settings) {
    settings.theme = 'dark';
    chrome.storage.local.set({ settings });
  }
});
```

With TypeScript, you get immediate feedback about potential null or undefined values, ensuring you handle edge cases before your users encounter them.

Enhanced Developer Experience

TypeScript dramatically improves the developer experience through intelligent autocomplete. The Chrome Types library provides comprehensive type definitions for every Chrome API, showing you available methods, parameters, and return types as you code. This turns what used to be a constant cycle of checking documentation into a fluid, efficient coding experience.

Better Collaboration and Maintenance

As extensions grow in complexity, especially in team settings, TypeScript's explicit type annotations serve as documentation. When you define interfaces for your extension's data structures, new developers can understand the data flow without reading through implementation details. This makes maintenance and feature additions significantly easier.

---

Setting Up Your TypeScript Project {#project-setup}

Let us walk through setting up a complete TypeScript project for Chrome extension development in 2025.

Prerequisites

Before starting, ensure you have Node.js 18 or higher installed. You will also need npm or your preferred package manager. We will use Vite as our build tool because of its excellent support for Chrome extensions and fast development experience.

Initialize the Project

Create a new directory for your extension and initialize the project:

```bash
mkdir my-extension && cd my-extension
npm init -y
```

Install Dependencies

Install the necessary development dependencies:

```bash
npm install -D typescript vite @types/chrome @types/node
```

The `@types/chrome` package provides TypeScript definitions for the Chrome extension API, while `@types/node` gives you type definitions for Node.js APIs used in your build process.

Configure TypeScript

Create a `tsconfig.json` file optimized for Chrome extension development:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src//*"],
  "exclude": ["node_modules", "dist"]
}
```

The `strict: true` option enables all strict type-checking options, which is essential for catching potential issues early. The `DOM` and `ES2022` libraries ensure you have access to browser and modern JavaScript APIs.

Set Up Vite for Extension Bundling

Create a `vite.config.ts` file to handle the extension-specific build requirements:

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
```

---

Creating the Extension Structure {#extension-structure}

Organize your extension with a clear directory structure that separates concerns and makes maintenance straightforward.

Recommended Directory Structure

```
my-extension/
 src/
    background/
       index.ts
       types.ts
    content/
       index.ts
       types.ts
    popup/
       index.ts
       Popup.tsx (if using React)
       styles.css
    shared/
       types.ts
       utils.ts
    manifest.json
 public/
    icons/
    _locales/
 package.json
 tsconfig.json
 vite.config.ts
 manifest.ts
```

Defining the Manifest V3

Create your `manifest.ts` file that will be compiled to `manifest.json`:

```typescript
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'My TypeScript Extension',
  version: '1.0.0',
  description: 'A type-safe Chrome extension built with TypeScript',
  permissions: ['storage', 'activeTab', 'scripting'],
  action: {
    default_popup: 'popup.html',
    default_icon: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['content.js'],
    },
  ],
});
```

This approach using the CRXJS Vite plugin ensures your manifest is properly typed and validated at build time, catching configuration errors before they cause issues.

---

Writing Type-Safe Extension Code {#writing-type-safe-code}

Now let us explore how to write properly typed code for each component of your extension.

Background Service Worker

The service worker handles events and manages extension state. Here is how to write type-safe background scripts:

```typescript
// src/background/index.ts
import type { Chrome } from '@types/chrome';

interface ExtensionSettings {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  autoSave: boolean;
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  theme: 'light',
  notificationsEnabled: true,
  autoSave: true,
};

// Type-safe message handling
type MessageType = 
  | { type: 'GET_SETTINGS'; payload?: undefined }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ExtensionSettings> }
  | { type: 'OPEN_POPUP'; payload: { tabId: number } };

type MessageResponse<T extends MessageType> = 
  T extends { type: 'GET_SETTINGS' } 
    ? ExtensionSettings 
    : { success: boolean };

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    console.log('Extension installed with default settings');
  }
});

chrome.runtime.onMessage.addListener(
  (message: MessageType, sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // Keep message channel open for async response
  }
);

async function handleMessage(message: MessageType): Promise<MessageResponse<MessageType>> {
  switch (message.type) {
    case 'GET_SETTINGS': {
      const result = await chrome.storage.local.get('settings');
      return (result.settings ?? DEFAULT_SETTINGS) as MessageResponse<MessageType>;
    }
    case 'UPDATE_SETTINGS': {
      await chrome.storage.local.get('settings').then((result) => {
        const current = result.settings ?? DEFAULT_SETTINGS;
        return chrome.storage.local.set({
          settings: { ...current, ...message.payload },
        });
      });
      return { success: true } as MessageResponse<MessageType>;
    }
    default:
      return { success: false } as MessageResponse<MessageType>;
  }
}
```

Content Scripts

Content scripts run in the context of web pages and need careful type handling:

```typescript
// src/content/index.ts
interface PageData {
  title: string;
  url: string;
  selectedText?: string;
}

interface ContentMessage {
  type: 'PAGE_INFO';
  payload: PageData;
}

// Ensure we are running in a content script context
if (typeof window !== 'undefined') {
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (selectedText && selectedText.length > 0) {
      // Send selected text to background script
      chrome.runtime.sendMessage({
        type: 'TEXT_SELECTED',
        payload: { text: selectedText },
      } as ContentMessage);
    }
  });
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'HIGHLIGHT_ELEMENTS') {
    highlightElements(message.payload.selector);
  }
});

function highlightElements(selector: string): void {
  const elements = document.querySelectorAll(selector);
  elements.forEach((el) => {
    (el as HTMLElement).style.outline = '2px solid #4CAF50';
  });
}
```

Popup Scripts

The popup runs in its own context with access to the DOM:

```typescript
// src/popup/index.ts
interface PopupState {
  isEnabled: boolean;
  itemCount: number;
}

document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('enable-toggle') as HTMLInputElement;
  const countDisplay = document.getElementById('item-count');

  // Load current state
  const result = await chrome.storage.local.get(['enabled', 'count']);
  const state: PopupState = {
    isEnabled: result.enabled ?? true,
    itemCount: result.count ?? 0,
  };

  // Update UI
  toggle.checked = state.isEnabled;
  if (countDisplay) {
    countDisplay.textContent = state.itemCount.toString();
  }

  // Handle toggle changes
  toggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ enabled: toggle.checked });
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'SETTINGS_CHANGED',
      payload: { enabled: toggle.checked },
    });
  });
});
```

---

Type-Safe Message Passing {#message-passing}

One of the most important aspects of extension development is communication between different components. TypeScript makes this significantly safer.

Define Shared Types

Create a shared types file that all components can import:

```typescript
// src/shared/types.ts

// Message types for extension communication
export type ExtensionMessageType =
  | { type: 'GET_STATE'; payload?: undefined }
  | { type: 'SET_STATE'; payload: ExtensionState }
  | { type: 'FETCH_DATA'; payload: FetchRequest }
  | { type: 'DATA_RESPONSE'; payload: FetchResponse };

export interface ExtensionState {
  isActive: boolean;
  userId?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
}

export interface FetchRequest {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

export interface FetchResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// Storage types
export interface StorageSchema {
  settings: UserPreferences;
  cache: Record<string, unknown>;
  lastSync: number;
}
```

Using the Shared Types

Import these types in your background, content, and popup scripts:

```typescript
// In any component
import type { ExtensionMessageType, ExtensionState } from '../shared/types';

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessageType, sender, sendResponse) => {
    // TypeScript now knows exactly what each message type contains
    switch (message.type) {
      case 'GET_STATE':
        // Handle get state
        break;
      case 'SET_STATE':
        // message.payload is typed as ExtensionState
        break;
    }
  }
);
```

---

Working with Chrome APIs {#chrome-apis}

TypeScript provides excellent autocomplete and type safety for Chrome APIs through the `@types/chrome` package.

Storage API

```typescript
// Fully typed storage operations
interface MyData {
  items: string[];
  timestamp: number;
}

async function saveData(data: MyData): Promise<void> {
  await chrome.storage.local.set({ myData: data });
}

async function loadData(): Promise<MyData | null> {
  const result = await chrome.storage.local.get('myData');
  return result.myData ?? null;
}

// Storage change listener with types
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.myData) {
    const newValue = changes.myData.newValue as MyData;
    const oldValue = changes.myData.oldValue as MyData | undefined;
    console.log('Storage changed:', { newValue, oldValue });
  }
});
```

Tabs API

```typescript
// Query and manipulate tabs with full type safety
async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      console.log('Content script injected');
    },
  });
}
```

Context Menus

```typescript
// Create context menus with proper typing
chrome.contextMenus.create({
  id: 'selection-action',
  title: 'Process Selected Text',
  contexts: ['selection'],
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'selection-action' && info.selectionText) {
    // selectionText is properly typed as string | undefined
    processSelectedText(info.selectionText);
  }
});

function processSelectedText(text: string): void {
  console.log('Processing:', text);
}
```

---

Building and Testing {#building-testing}

Development Mode

Run your extension in development mode with hot reload:

```bash
npm run dev
```

This starts Vite in watch mode, rebuilding your extension whenever you make changes. Use the "Load unpacked" option in Chrome's extension management page to load your `dist` folder.

Production Build

Create a production build:

```bash
npm run build
```

This generates optimized, minified files in the `dist` directory ready for publication.

Testing Considerations

While Chrome extension testing can be challenging, TypeScript helps significantly:

1. Type checking catches runtime errors before they happen
2. Use Chrome's built-in debugging - The popup, background script, and content script each have their own DevTools panel
3. Test across contexts - Ensure messages between components are properly typed and handled
4. Use Chrome Storage carefully - Remember it is asynchronous and may fail

---

Best Practices for Type-Safe Extensions {#best-practices}

Follow these practices to maximize the benefits of TypeScript in your extension development:

Enable Strict Mode

Always enable strict mode in your `tsconfig.json`. This forces you to handle null and undefined values explicitly, preventing countless runtime errors.

Use Type Inference

Let TypeScript infer types when they are obvious. You do not need to annotate every variable:

```typescript
// TypeScript infers the type automatically
const settings = await chrome.storage.local.get('settings');
// settings is typed correctly

// Only add explicit types when necessary or for function parameters
function initializeExtension(config: ExtensionConfig): void {
  // ...
}
```

Create Custom Type Definitions

For complex extension features, create custom types:

```typescript
// For complex feature flags
type FeatureFlags = {
  experimentalUI: boolean;
  advancedAnalytics: boolean;
  betaFeatures: string[];
};

// For API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

Document Untyped Libraries

When using libraries without type definitions, create declaration files:

```typescript
// src/types/untyped-lib.d.ts
declare module 'some-library' {
  export function doSomething(param: string): void;
  export class SomeClass {
    constructor(options: Record<string, unknown>);
    method(): string;
  }
}
```

---

Conclusion {#conclusion}

TypeScript has become an essential tool for Chrome extension development in 2025. The type safety it provides catches errors early, the intelligent autocomplete speeds up development significantly, and the explicit type annotations make your code more maintainable and easier to collaborate on.

Setting up a TypeScript project for Chrome extensions is straightforward with the right tools and configuration. By following the patterns and practices outlined in this guide, you can build robust, type-safe extensions that use the full power of Manifest V3 while avoiding common pitfalls.

The initial setup investment pays dividends throughout your extension's lifecycle. As your extension grows in complexity, TypeScript's type system becomes increasingly valuable, ensuring that changes and additions do not introduce unexpected bugs.

Start your next Chrome extension project with TypeScript, and experience the difference that type safety makes in your development workflow.

---

Additional Resources {#resources}

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [CRXJS Vite Plugin](https://crxjs.dev/vite-plugin)
- [@types/chrome GitHub](https://github.com/DefinitelyTyped/DefinitelyTyped)
