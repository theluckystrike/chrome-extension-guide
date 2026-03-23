---
layout: default
title: "Chrome Extension Architecture Patterns. Developer Guide"
description: "Learn Chrome extension architecture patterns with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/architecture-patterns/"
---
# Extension Architecture Patterns

How you structure a Chrome extension determines how maintainable it will be six months from now. A simple tab-modifier can live in a single file. A full-featured productivity tool with a side panel, options page, multiple content scripts, and a service worker needs deliberate architectural decisions. This guide presents proven patterns for extensions at every scale, from single-purpose utilities to complex multi-context applications.

Table of Contents {#table-of-contents}

- [Single-Purpose Extension](#single-purpose-extension)
- [Standard Extension](#standard-extension)
- [Complex Extension](#complex-extension)
- [Monorepo Structure](#monorepo-structure)
- [Feature-Based Directory Organization](#feature-based-directory-organization)
- [Shared Types Across Contexts](#shared-types-across-contexts)
- [Dependency Injection for Chrome API Mocking](#dependency-injection-for-chrome-api-mocking)
- [Event Bus Pattern for Cross-Context Communication](#event-bus-pattern-for-cross-context-communication)
- [Plugin/Module System for Extensible Extensions](#pluginmodule-system-for-extensible-extensions)
- [When to Split Into Multiple Extensions](#when-to-split-into-multiple-extensions)

---

Single-Purpose Extension {#single-purpose-extension}

The simplest architecture: one content script, no background service worker, no popup. This pattern is appropriate for extensions that modify page appearance, inject small utilities, or read page data without needing persistent state.

Directory Structure {#directory-structure}

```
my-highlighter/
  manifest.json
  content.js
  content.css
  icons/
    icon-16.png
    icon-48.png
    icon-128.png
```

Manifest {#manifest}

```json
{
  "manifest_version": 3,
  "name": "Text Highlighter",
  "version": "1.0.0",
  "description": "Highlights selected text in yellow",
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

When This Pattern Works {#when-this-pattern-works}

- The extension reacts only to page content (no cross-tab state).
- No network requests to external APIs are needed.
- No user-configurable settings beyond what CSS can handle.
- No communication with other extension contexts is required.

Limitations {#limitations}

Without a service worker, you cannot use `chrome.storage`, `chrome.alarms`, declarativeNetRequest, or any API that requires a background context. If you need any of these, move to the standard pattern.

---

Standard Extension {#standard-extension}

The workhorse pattern: a popup for user interaction, a service worker for background logic, and one or more content scripts for page interaction. Most published extensions follow this structure.

Directory Structure {#directory-structure}

```
my-extension/
  manifest.json
  background.js
  popup/
    popup.html
    popup.js
    popup.css
  content/
    content.js
    content.css
  icons/
    icon-16.png
    icon-48.png
    icon-128.png
```

Communication Flow {#communication-flow}

```
     chrome.runtime     
  Popup       Service     
  (UI)         .sendMessage         Worker      
                          (Background)
                                    
                                           
                                    chrome.tabs
                                    .sendMessage
                                           
                                    
                                      Content     
                                      Script      
                                      (Page)      
                                    
```

The popup and content scripts communicate through the service worker. Direct popup-to-content-script messaging is possible via `chrome.tabs.sendMessage` from the popup, but routing through the service worker gives you a central point for logging, validation, and state management.

Manifest {#manifest}

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content/content.js"],
      "css": ["content/content.css"]
    }
  ],
  "permissions": ["storage", "activeTab"]
}
```

State Management {#state-management}

In this pattern, the service worker owns the canonical state. The popup reads state on open and writes state through messages. Content scripts request state as needed:

```javascript
// background.js -- central state
let appState = { enabled: true, count: 0 };

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.action) {
    case 'getState':
      sendResponse(appState);
      break;
    case 'setState':
      appState = { ...appState, ...msg.payload };
      chrome.storage.local.set({ appState });
      sendResponse(appState);
      break;
  }
  return true;
});

// Restore state on service worker startup
chrome.storage.local.get('appState', (result) => {
  if (result.appState) appState = result.appState;
});
```

---

Complex Extension {#complex-extension}

When your extension has a side panel, options page, multiple content scripts targeting different sites, and a service worker coordinating everything, the flat file structure breaks down. You need clear boundaries between features and contexts.

Directory Structure {#directory-structure}

```
my-complex-extension/
  manifest.json
  src/
    background/
      index.js
      handlers/
        tabs.js
        messages.js
        alarms.js
      services/
        api-client.js
        storage.js
    content/
      github/
        index.js
        styles.css
      jira/
        index.js
        styles.css
      shared/
        dom-utils.js
        observer.js
    popup/
      index.html
      index.js
      components/
        status-bar.js
        settings-toggle.js
      styles.css
    sidepanel/
      index.html
      index.js
      components/
        task-list.js
        detail-view.js
      styles.css
    options/
      index.html
      index.js
      styles.css
    shared/
      constants.js
      types.js
      message-types.js
      utils.js
  icons/
  _locales/
```

Manifest {#manifest}

```json
{
  "manifest_version": 3,
  "name": "Project Tracker",
  "version": "2.0.0",
  "background": {
    "service_worker": "src/background/index.js",
    "type": "module"
  },
  "action": {
    "default_popup": "src/popup/index.html"
  },
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  },
  "options_page": "src/options/index.html",
  "content_scripts": [
    {
      "matches": ["https://github.com/*"],
      "js": ["src/content/github/index.js"],
      "css": ["src/content/github/styles.css"]
    },
    {
      "matches": ["https://*.atlassian.net/*"],
      "js": ["src/content/jira/index.js"],
      "css": ["src/content/jira/styles.css"]
    }
  ],
  "permissions": ["storage", "sidePanel", "activeTab", "alarms"]
}
```

Key Principles {#key-principles}

1. Group by context first, then by feature. Each execution context (background, content, popup) has its own directory because they run in isolation and are bundled separately.

2. Shared code lives in a dedicated directory. Constants, type definitions, and utility functions that multiple contexts import go in `src/shared/`.

3. Content scripts are grouped by target site. Each site-specific content script has its own subdirectory. Shared DOM utilities go in `src/content/shared/`.

4. The service worker uses handler modules. Split event listeners into separate handler files to keep the main service worker entry point clean:

```javascript
// src/background/index.js
import { registerTabHandlers } from './handlers/tabs.js';
import { registerMessageHandlers } from './handlers/messages.js';
import { registerAlarmHandlers } from './handlers/alarms.js';

registerTabHandlers();
registerMessageHandlers();
registerAlarmHandlers();

console.log('[Background] All handlers registered');
```

```javascript
// src/background/handlers/tabs.js
export function registerTabHandlers() {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      // Handle tab load complete
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    // Clean up tab-specific state
  });
}
```

---

Monorepo Structure {#monorepo-structure}

When your project includes not just the extension but also a companion website, a shared component library, or a backend API, a monorepo keeps everything in sync.

Directory Structure {#directory-structure}

```
project-root/
  package.json            # Workspace root
  pnpm-workspace.yaml     # or npm/yarn workspaces config
  packages/
    extension/
      package.json
      manifest.json
      src/
      tsconfig.json
      webpack.config.js
    web-app/
      package.json
      src/
      tsconfig.json
    shared/
      package.json
      src/
        types/
          api.ts
          messages.ts
        utils/
          validation.ts
          formatting.ts
      tsconfig.json
    api-server/
      package.json
      src/
      tsconfig.json
```

Workspace Configuration {#workspace-configuration}

```yaml
pnpm-workspace.yaml
packages:
  - 'packages/*'
```

```json
// packages/extension/package.json
{
  "name": "@myproject/extension",
  "dependencies": {
    "@myproject/shared": "workspace:*"
  }
}
```

Shared Code Between Extension and Web App {#shared-code-between-extension-and-web-app}

The `shared` package contains types and utilities used by both the extension and the web app. This ensures API types stay in sync:

```typescript
// packages/shared/src/types/api.ts
export interface Task {
  id: string;
  title: string;
  status: 'open' | 'in-progress' | 'done';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  pagination?: {
    page: number;
    totalPages: number;
  };
}
```

Both the extension and the web app import from `@myproject/shared`:

```typescript
// packages/extension/src/background/services/api-client.ts
import type { Task, ApiResponse } from '@myproject/shared/types/api';

async function fetchTasks(): Promise<Task[]> {
  const response = await fetch('https://api.myproject.com/tasks');
  const result: ApiResponse<Task[]> = await response.json();
  return result.data;
}
```

Build Considerations {#build-considerations}

The extension package needs its own bundler configuration that produces files Chrome can load. The shared package should be built as a library (or used as TypeScript source via project references):

```json
// packages/extension/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../shared" }
  ]
}
```

---

Feature-Based Directory Organization {#feature-based-directory-organization}

As extensions grow, organizing by feature rather than by file type prevents the "utils folder with 40 files" problem.

Comparison: Type-Based vs Feature-Based {#comparison-type-based-vs-feature-based}

Type-based (avoid for large extensions):
```
src/
  components/
    TaskList.js
    UserProfile.js
    SettingsForm.js
    BookmarkTree.js
  services/
    taskService.js
    userService.js
    bookmarkService.js
  utils/
    taskUtils.js
    userUtils.js
    bookmarkUtils.js
```

Feature-based (scales better):
```
src/
  features/
    tasks/
      TaskList.js
      taskService.js
      taskUtils.js
      taskTypes.ts
    users/
      UserProfile.js
      userService.js
      userTypes.ts
    bookmarks/
      BookmarkTree.js
      bookmarkService.js
      bookmarkUtils.js
      bookmarkTypes.ts
  shared/
    ui/
      Button.js
      Modal.js
    chrome/
      storage.js
      messaging.js
```

Benefits of Feature-Based Organization {#benefits-of-feature-based-organization}

- Locality: everything related to a feature is in one place. When you work on "tasks", you open one directory.
- Deletion: removing a feature means deleting one directory, not hunting across five folders.
- Ownership: in a team, each developer can own a feature directory without merge conflicts in shared folders.
- Lazy loading: each feature directory maps naturally to a dynamic import boundary.

---

Shared Types Across Contexts {#shared-types-across-contexts}

TypeScript makes extension development dramatically safer by catching message type mismatches, storage key typos, and API contract violations at compile time.

Defining Message Types {#defining-message-types}

```typescript
// src/shared/message-types.ts

// Define all possible messages as a discriminated union
export type ExtensionMessage =
  | { action: 'GET_TASKS'; payload?: never }
  | { action: 'CREATE_TASK'; payload: { title: string; status: string } }
  | { action: 'DELETE_TASK'; payload: { id: string } }
  | { action: 'GET_SETTINGS'; payload?: never }
  | { action: 'UPDATE_SETTINGS'; payload: Partial<Settings> };

// Define response types mapped to each action
export type MessageResponseMap = {
  GET_TASKS: Task[];
  CREATE_TASK: Task;
  DELETE_TASK: { success: boolean };
  GET_SETTINGS: Settings;
  UPDATE_SETTINGS: Settings;
};

export interface Task {
  id: string;
  title: string;
  status: string;
}

export interface Settings {
  theme: 'light' | 'dark';
  notifications: boolean;
  syncEnabled: boolean;
}
```

Type-Safe Message Sending {#type-safe-message-sending}

```typescript
// src/shared/messaging.ts
import type { ExtensionMessage, MessageResponseMap } from './message-types';

export function sendMessage<T extends ExtensionMessage>(
  message: T
): Promise<MessageResponseMap[T['action']]> {
  return chrome.runtime.sendMessage(message);
}

// Usage -- fully type-checked
const tasks = await sendMessage({ action: 'GET_TASKS' });
// tasks is typed as Task[]

const newTask = await sendMessage({
  action: 'CREATE_TASK',
  payload: { title: 'Write docs', status: 'open' }
});
// newTask is typed as Task
```

Type-Safe Storage {#type-safe-storage}

```typescript
// src/shared/storage-types.ts

export interface StorageSchema {
  tasks: Task[];
  settings: Settings;
  lastSync: number;
  userToken: string;
}

// Type-safe wrapper around chrome.storage
export async function getStorage<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

export async function setStorage<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}
```

---

Dependency Injection for Chrome API Mocking {#dependency-injection-for-chrome-api-mocking}

Chrome APIs are only available in the extension runtime, making unit tests difficult. Dependency injection solves this by decoupling your logic from the Chrome API surface.

The Problem {#the-problem}

```typescript
// This function is untestable outside Chrome
async function saveBookmark(url: string, title: string) {
  const existing = await chrome.bookmarks.search({ url });
  if (existing.length > 0) {
    return existing[0];
  }
  return chrome.bookmarks.create({ url, title });
}
```

The Solution: Inject the API {#the-solution-inject-the-api}

```typescript
// src/shared/chrome-api.ts

export interface BookmarkApi {
  search(query: chrome.bookmarks.SearchQuery): Promise<chrome.bookmarks.BookmarkTreeNode[]>;
  create(bookmark: chrome.bookmarks.CreateDetails): Promise<chrome.bookmarks.BookmarkTreeNode>;
}

export interface StorageApi {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface ChromeApi {
  bookmarks: BookmarkApi;
  storage: StorageApi;
}

// Production implementation
export const chromeApi: ChromeApi = {
  bookmarks: {
    search: (query) => chrome.bookmarks.search(query),
    create: (details) => chrome.bookmarks.create(details),
  },
  storage: {
    get: (keys) => chrome.storage.local.get(keys),
    set: (items) => chrome.storage.local.set(items),
  },
};
```

Using the Injected API {#using-the-injected-api}

```typescript
// src/features/bookmarks/bookmarkService.ts
import type { ChromeApi } from '../../shared/chrome-api';

export function createBookmarkService(api: ChromeApi) {
  return {
    async saveBookmark(url: string, title: string) {
      const existing = await api.bookmarks.search({ url });
      if (existing.length > 0) {
        return existing[0];
      }
      return api.bookmarks.create({ url, title });
    },

    async getAll() {
      const result = await api.storage.get('savedBookmarks');
      return (result.savedBookmarks as string[]) || [];
    }
  };
}
```

Testing with a Mock {#testing-with-a-mock}

```typescript
// tests/bookmarkService.test.ts
import { createBookmarkService } from '../src/features/bookmarks/bookmarkService';
import type { ChromeApi } from '../src/shared/chrome-api';

function createMockApi(): ChromeApi {
  const storage = new Map<string, unknown>();

  return {
    bookmarks: {
      search: async () => [],
      create: async (details) => ({
        id: '1',
        title: details.title || '',
        url: details.url,
      }),
    },
    storage: {
      get: async (keys) => {
        const result: Record<string, unknown> = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const key of keyList) {
          if (storage.has(key)) result[key] = storage.get(key);
        }
        return result;
      },
      set: async (items) => {
        for (const [key, value] of Object.entries(items)) {
          storage.set(key, value);
        }
      },
    },
  };
}

test('saveBookmark creates new bookmark when none exists', async () => {
  const api = createMockApi();
  const service = createBookmarkService(api);

  const result = await service.saveBookmark('https://example.com', 'Example');
  expect(result.url).toBe('https://example.com');
  expect(result.title).toBe('Example');
});
```

---

Event Bus Pattern for Cross-Context Communication {#event-bus-pattern-for-cross-context-communication}

As extensions grow, point-to-point messaging between contexts becomes tangled. An event bus provides a centralized, decoupled communication pattern.

The Event Bus {#the-event-bus}

```typescript
// src/shared/event-bus.ts

type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler as EventHandler);
    };
  }

  async emit<T>(event: string, data: T): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    const promises = Array.from(handlers).map((handler) => handler(data));
    await Promise.all(promises);
  }
}
```

Cross-Context Event Bus Using Chrome Messaging {#cross-context-event-bus-using-chrome-messaging}

The basic event bus works within a single context. To make it work across contexts (background, popup, content script), bridge it with Chrome messaging:

```typescript
// src/shared/cross-context-bus.ts

interface BusMessage {
  __bus_event: string;
  __bus_data: unknown;
}

function isBusMessage(msg: unknown): msg is BusMessage {
  return typeof msg === 'object' && msg !== null && '__bus_event' in msg;
}

export class CrossContextBus extends EventBus {
  constructor(private contextName: string) {
    super();
    this.listenForRemoteEvents();
  }

  private listenForRemoteEvents() {
    chrome.runtime.onMessage.addListener((msg, sender) => {
      if (isBusMessage(msg)) {
        // Call local handlers only -- do not re-broadcast
        super.emit(msg.__bus_event, msg.__bus_data);
      }
    });
  }

  // Override emit to also broadcast to other contexts
  async emit<T>(event: string, data: T): Promise<void> {
    // Handle locally
    await super.emit(event, data);

    // Broadcast to other contexts
    const message: BusMessage = {
      __bus_event: event,
      __bus_data: data,
    };

    // Send to service worker / other extension pages
    try {
      await chrome.runtime.sendMessage(message);
    } catch {
      // Other context may not be listening
    }
  }
}

// Usage in each context
const bus = new CrossContextBus('background');

bus.on('task:created', (task) => {
  console.log('New task created:', task);
});

bus.emit('task:created', { id: '1', title: 'New task' });
```

Broadcasting to Content Scripts {#broadcasting-to-content-scripts}

Content scripts do not receive `chrome.runtime.sendMessage` broadcasts. The service worker must explicitly forward events to tabs:

```typescript
// src/background/bus-bridge.ts

export function setupBusBridge(bus: CrossContextBus) {
  // Forward select events to all content scripts
  const broadcastEvents = ['settings:updated', 'theme:changed'];

  for (const event of broadcastEvents) {
    bus.on(event, async (data) => {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              __bus_event: event,
              __bus_data: data,
            });
          } catch {
            // Content script not loaded in this tab
          }
        }
      }
    });
  }
}
```

---

Plugin/Module System for Extensible Extensions {#pluginmodule-system-for-extensible-extensions}

Some extensions benefit from an internal plugin architecture -- think of a content blocker with multiple filter modules, or a developer tool with pluggable panels. A module system lets you add features without modifying core code.

Defining a Plugin Interface {#defining-a-plugin-interface}

```typescript
// src/shared/plugin-types.ts

export interface ExtensionPlugin {
  / Unique identifier for this plugin */
  id: string;

  / Human-readable name */
  name: string;

  / Called when the plugin is loaded */
  initialize(context: PluginContext): Promise<void>;

  / Called when the plugin is unloaded */
  destroy(): Promise<void>;
}

export interface PluginContext {
  / Access to the event bus */
  bus: EventBus;

  / Scoped storage for this plugin */
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
  };

  / Register a content script handler */
  registerContentHandler(pattern: string, handler: () => void): void;
}
```

Plugin Manager {#plugin-manager}

```typescript
// src/background/plugin-manager.ts

export class PluginManager {
  private plugins = new Map<string, ExtensionPlugin>();
  private contexts = new Map<string, PluginContext>();

  constructor(private bus: EventBus) {}

  async register(plugin: ExtensionPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    const context = this.createContext(plugin.id);
    this.plugins.set(plugin.id, plugin);
    this.contexts.set(plugin.id, context);

    await plugin.initialize(context);
    console.log(`[PluginManager] Loaded plugin: ${plugin.name}`);
  }

  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      await plugin.destroy();
      this.plugins.delete(pluginId);
      this.contexts.delete(pluginId);
    }
  }

  private createContext(pluginId: string): PluginContext {
    const storagePrefix = `plugin_${pluginId}_`;

    return {
      bus: this.bus,
      storage: {
        async get(key: string) {
          const result = await chrome.storage.local.get(storagePrefix + key);
          return result[storagePrefix + key];
        },
        async set(key: string, value: unknown) {
          await chrome.storage.local.set({ [storagePrefix + key]: value });
        },
      },
      registerContentHandler(pattern, handler) {
        // Store handler registration for dynamic content script injection
        console.log(`[Plugin:${pluginId}] Registered handler for ${pattern}`);
      },
    };
  }

  getLoadedPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }
}
```

Example Plugin {#example-plugin}

```typescript
// src/plugins/word-counter.ts
import type { ExtensionPlugin, PluginContext } from '../shared/plugin-types';

export const wordCounterPlugin: ExtensionPlugin = {
  id: 'word-counter',
  name: 'Word Counter',

  async initialize(context: PluginContext) {
    context.bus.on('page:loaded', async (data: { tabId: number; url: string }) => {
      // React to page loads
      const count = await context.storage.get('totalWords') as number || 0;
      await context.storage.set('totalWords', count);
    });

    context.registerContentHandler('https://*/*', () => {
      // Content script logic for this plugin
    });
  },

  async destroy() {
    // Clean up any resources
  },
};
```

Loading Plugins {#loading-plugins}

```typescript
// src/background/index.js
import { PluginManager } from './plugin-manager';
import { wordCounterPlugin } from '../plugins/word-counter';
import { readingModePlugin } from '../plugins/reading-mode';

const bus = new EventBus();
const pluginManager = new PluginManager(bus);

// Register all plugins
await pluginManager.register(wordCounterPlugin);
await pluginManager.register(readingModePlugin);

// Allow users to enable/disable plugins via settings
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'togglePlugin') {
    const { pluginId, enabled } = msg.payload;
    if (enabled) {
      // Re-register the plugin
    } else {
      pluginManager.unregister(pluginId);
    }
    sendResponse({ success: true });
  }
  return true;
});
```

---

When to Split Into Multiple Extensions {#when-to-split-into-multiple-extensions}

Sometimes one extension is not the right answer. Here are the signals that you should split your project into separate extensions.

Split When {#split-when}

Permissions diverge significantly. If half your features need `<all_urls>` access and the other half only need `activeTab`, users who want the limited features are forced to grant broad permissions. Two extensions with different permission sets let users choose their comfort level.

Target audiences are different. A "developer tools" extension and a "reading mode" extension serve different users even if they share code. Ship them separately so each can be marketed and reviewed independently.

Chrome Web Store policies conflict. The Web Store requires that each extension have a single, clear purpose. If reviewers flag your extension for doing too many unrelated things, that is a signal to split.

Performance budgets differ. A lightweight content script injected on every page should not be bundled with a heavy side panel application. Separate extensions keep the lightweight part fast.

Update cadences differ. If your content scripts are stable but your popup UI changes weekly, separate extensions prevent unnecessary content script re-injection on every update.

Keep Together When {#keep-together-when}

Features share state. If the side panel needs data from the content script and the popup controls both, splitting means you need `externally_connectable` and cross-extension messaging, which adds complexity.

The user experience is unified. If disabling one feature breaks others, they belong together.

Permissions overlap heavily. If both halves need the same permissions, splitting forces the user to grant the same permissions twice.

Cross-Extension Communication {#cross-extension-communication}

If you do split, extensions can communicate using `chrome.runtime.sendMessage` with an explicit extension ID:

```javascript
// Extension A sending to Extension B
chrome.runtime.sendMessage(
  'EXTENSION_B_ID',
  { action: 'getData' },
  (response) => {
    console.log('Response from Extension B:', response);
  }
);

// Extension B receiving from Extension A
// Requires "externally_connectable" in manifest
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {
  if (sender.id === 'EXTENSION_A_ID') {
    sendResponse({ data: 'hello from B' });
  }
});
```

```json
// Extension B manifest.json
{
  "externally_connectable": {
    "ids": ["EXTENSION_A_ID"]
  }
}
```

---

Summary {#summary}

The right architecture depends on your extension's scope:

| Scale | Pattern | Key Characteristics |
|---|---|---|
| Minimal | Single content script | No background, no UI, one file |
| Standard | Popup + SW + content script | Central state in service worker |
| Complex | Multi-context with modules | Feature directories, handler modules |
| Multi-package | Monorepo with shared library | Workspace packages, shared types |

Regardless of scale, these principles apply:

- Type your messages. A discriminated union of message types catches bugs before they reach production.
- Inject Chrome APIs. Decoupling from `chrome.*` makes your business logic testable outside the browser.
- Use an event bus at scale. Point-to-point messaging becomes unmaintainable past a handful of message types.
- Organize by feature, not by file type. Colocating related code reduces the cognitive load of navigating a large codebase.
- Split extensions only when the costs of coupling exceed the costs of coordination. Cross-extension messaging is powerful but adds operational complexity.

Start simple. Refactor toward complexity only when the code demands it.

Related Articles {#related-articles}

Related Articles

- [Extension Architecture](../guides/extension-architecture.md)
- [Project Structure](../guides/chrome-extension-project-structure.md)
- [State Persistence](../patterns/extension-state-persistence.md)
-e 
---


---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
