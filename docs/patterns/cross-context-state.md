---
layout: default
title: "Chrome Extension Cross Context State — Best Practices"
description: "Share state across extension contexts."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/cross-context-state/"
---

# Cross-Context State Management

## The Core Challenge {#the-core-challenge}

Chrome extensions run multiple isolated JavaScript environments: background service workers, content scripts, popups, options pages, and side panels. Each context has its own memory space and lifecycle. A popup closing destroys its state. A service worker can terminate and restart at any time. Nothing is shared by default.

This guide covers patterns for managing state reliably across these boundaries.

---

## Pattern 1: Storage as Single Source of Truth {#pattern-1-storage-as-single-source-of-truth}

Use `chrome.storage.local` as the persistent backbone. Every context reads from and writes to storage, with `onChanged` listeners to react to updates:

```ts
// lib/cross-context-store.ts
interface SharedState {
  user: { id: string; name: string } | null;
  settings: { theme: string; notifications: boolean };
}

const STORAGE_KEY = 'appState';

export class CrossContextStore {
  private listeners: Set<(state: SharedState) => void> = new Set();
  private cache: SharedState | null = null;

  constructor() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEY]) {
        this.cache = changes[STORAGE_KEY].newValue;
        this.listeners.forEach(fn => fn(this.cache!));
      }
    });
  }

  async get(): Promise<SharedState> {
    if (this.cache) return this.cache;
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return this.cache = result[STORAGE_KEY] || { user: null, settings: { theme: 'light', notifications: true } };
  }

  async set(partial: Partial<SharedState>): Promise<void> {
    const current = await this.get();
    const next = { ...current, ...partial };
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    this.cache = next;
  }

  subscribe(fn: (state: SharedState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const store = new CrossContextStore();
```

---

## Pattern 2: Ephemeral State with chrome.storage.session {#pattern-2-ephemeral-state-with-chromestoragesession}

For data that should only live as long as the browser session (or until all extension contexts close), use `chrome.storage.session`:

```ts
// Temporary auth token visible across contexts but cleared on restart
await chrome.storage.session.set({ authToken: 'Bearer xxx' });
const { authToken } = await chrome.storage.session.get('authToken');

// Content script checks auth
chrome.storage.session.get('authToken', (result) => {
  if (result.authToken) fetch('/api/data', { headers: { Authorization: result.authToken } });
});
```

---

## Pattern 3: Port-Based Live Connections {#pattern-3-port-based-live-connections}

For real-time, low-latency communication between contexts, use `chrome.runtime.connect`:

```ts
// background/connection-manager.ts
const activePorts = new Map<number, chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  if (port.sender.tab?.id) {
    activePorts.set(port.sender.tab.id, port);
    port.onDisconnect.addListener(() => activePorts.delete(port.sender.tab!.id!));
  }
});

export function broadcastToAllTabs(message: object) {
  activePorts.forEach(port => port.postMessage(message));
}

// Usage: sync state to content script in real-time
export function notifyTabStateChange(tabId: number, state: SharedState) {
  activePorts.get(tabId)?.postMessage({ type: 'STATE_UPDATE', state });
}
```

---

## Pattern 4: Debounced Storage Writes {#pattern-4-debounced-storage-writes}

Avoid hammering storage on every keystroke. Debounce writes:

```ts
// Utility: debounced storage setter
function debounce<T extends (...args: any[]) => Promise<void>>(fn: T, ms: number) {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), ms);
  };
}

const debouncedSave = debounce(async (key: string, value: unknown) => {
  await chrome.storage.local.set({ [key]: value });
}, 300);

// In popup UI handler
document.getElementById('theme')?.addEventListener('input', (e) => {
  debouncedSave('theme', (e.target as HTMLInputElement).value);
});
```

---

## Pattern 5: Conflict Resolution {#pattern-5-conflict-resolution}

When multiple contexts write simultaneously, last-write-wins by default. For complex scenarios, implement version vectors or timestamps:

```ts
interface VersionedState<T> {
  data: T;
  version: number;
  lastModified: number;
  source: string; // 'popup', 'background', 'options'
}

async function writeWithVersion<T>(key: string, data: T, source: string): Promise<void> {
  const existing = await chrome.storage.local.get(key);
  const current: VersionedState<T> = existing[key] || { data: null as any, version: 0, lastModified: 0, source: '' };
  
  // Simple conflict resolution: higher version wins
  const newVersion = current.version + 1;
  const newState: VersionedState<T> = {
    data,
    version: newVersion,
    lastModified: Date.now(),
    source,
  };
  
  await chrome.storage.local.set({ [key]: newState });
}
```

---

## Architecture: Centralized vs Distributed {#architecture-centralized-vs-distributed}

| Approach | Pros | Cons |
|----------|------|------|
| **Centralized** (background owns state) | Single source, easy to reason about | Background is a single point of failure, SW restarts cause delays |
| **Distributed** (each context caches) | Fast reads, resilient to background restarts | Must sync, potential inconsistencies |

The **storage-backed pub/sub** pattern (Pattern 1) provides a middle ground: storage is the source of truth, but all contexts subscribe to changes.

---

## Cross-References {#cross-references}

- [State Management Patterns](../patterns/state-management.md) — General state patterns
- [Message Passing Patterns Reference](../reference/message-passing-patterns.md) — One-time and port-based messaging
- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md) — Full storage API reference
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
