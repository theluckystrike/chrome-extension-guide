---
layout: default
title: "Chrome Extension State Management — Best Practices"
description: "Centralized state management patterns for extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/state-management/"
---

# State Management Patterns

## Overview

Chrome extensions scatter state across isolated contexts -- background service workers, content scripts, popups, options pages, and side panels. Each has its own memory space and lifecycle. A popup closing destroys its in-memory state. A service worker can terminate at any time. This guide covers eight patterns for managing state reliably using `chrome.storage`, message passing, and careful architectural choices.

---

## Pattern 1: Centralized State Store Backed by chrome.storage

Create a typed store backed by `chrome.storage.local` as the single source of truth:

```ts
// lib/state-store.ts
interface AppState {
  enabled: boolean;
  theme: "light" | "dark" | "system";
  blocklist: string[];
  stats: { pagesProcessed: number; lastRun: number };
}

const DEFAULT_STATE: AppState = {
  enabled: true, theme: "system", blocklist: [],
  stats: { pagesProcessed: 0, lastRun: 0 },
};

const KEY = "appState";

export class StateStore {
  private cache: AppState | null = null;

  async get(): Promise<AppState> {
    if (this.cache) return this.cache;
    const result = await chrome.storage.local.get(KEY);
    this.cache = { ...DEFAULT_STATE, ...result[KEY] };
    return this.cache;
  }

  async update(partial: Partial<AppState>): Promise<AppState> {
    const current = await this.get();
    const next: AppState = { ...current, ...partial };
    await chrome.storage.local.set({ [KEY]: next });
    this.cache = next;
    return next;
  }

  invalidateCache(): void { this.cache = null; }
}

export const store = new StateStore();
```

The cache goes stale when another context writes to storage. Keep it fresh:

```ts
chrome.storage.onChanged.addListener((changes) => {
  if (changes[KEY]) store.invalidateCache();
});
```

---

## Pattern 2: Pub/Sub Pattern Across Extension Contexts

Build publish/subscribe on top of `chrome.runtime` messaging so contexts react to state changes without polling:

```ts
// lib/pubsub.ts
type Handler<T = unknown> = (data: T) => void;
interface PubSubMessage { __pubsub: true; event: string; data: unknown; }

class ExtensionPubSub {
  private handlers = new Map<string, Set<Handler>>();

  constructor() {
    chrome.runtime.onMessage.addListener((msg) => {
      if (typeof msg === "object" && msg?.__pubsub) {
        this.notifyLocal(msg.event, msg.data);
      }
    });
  }

  on<T>(event: string, handler: Handler<T>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as Handler);
    return () => this.handlers.get(event)?.delete(handler as Handler);
  }

  async emit<T>(event: string, data: T): Promise<void> {
    this.notifyLocal(event, data);
    const message: PubSubMessage = { __pubsub: true, event, data };
    chrome.runtime.sendMessage(message).catch(() => {});
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  }

  private notifyLocal(event: string, data: unknown): void {
    for (const handler of this.handlers.get(event) ?? []) {
      try { handler(data); } catch (err) { console.error(`PubSub error [${event}]:`, err); }
    }
  }
}

export const pubsub = new ExtensionPubSub();
```

```ts
// popup — subscribe; background — publish
const unsub = pubsub.on<{ enabled: boolean }>("state:updated", (data) => {
  document.getElementById("status")!.textContent = data.enabled ? "ON" : "OFF";
});
window.addEventListener("unload", unsub);
```

---

## Pattern 3: Derived/Computed State from Storage Values

Compute values from raw state without storing redundant data:

```ts
// lib/derived-state.ts
import { store, type AppState } from "./state-store";

export async function getDerivedState() {
  const state = await store.get();
  return {
    isActive: state.enabled && state.blocklist.length > 0,
    blocklistCount: state.blocklist.length,
    hasRunRecently: Date.now() - state.stats.lastRun < 3600_000,
    statusLabel: computeLabel(state),
  };
}

function computeLabel(state: AppState): string {
  if (!state.enabled) return "Disabled";
  if (state.blocklist.length === 0) return "No rules configured";
  const ago = Date.now() - state.stats.lastRun;
  if (ago < 60_000) return "Active — just ran";
  return ago < 3600_000 ? "Active" : "Active — idle";
}
```

For reactive UIs, create a derived store that recomputes on `chrome.storage.onChanged`:

```ts
// lib/stores/derived.ts
export function derivedStorage<T>(
  storageKey: string,
  deriveFn: (raw: Record<string, unknown>) => T,
  initial: T
) {
  let current = initial;
  const listeners = new Set<(v: T) => void>();

  async function refresh() {
    const result = await chrome.storage.local.get(storageKey);
    current = deriveFn(result[storageKey] ?? {});
    for (const fn of listeners) fn(current);
  }

  chrome.storage.onChanged.addListener((changes) => {
    if (changes[storageKey]) refresh();
  });

  return {
    get: async () => { await refresh(); return current; },
    subscribe: (handler: (v: T) => void) => {
      listeners.add(handler);
      refresh();
      return () => listeners.delete(handler);
    },
  };
}
```

---

## Pattern 4: Undo/Redo with State Snapshots

Maintain a history stack for reversible user actions:

```ts
// lib/undo-redo.ts
interface HistoryEntry<T> { state: T; description: string; }

export class UndoRedoManager<T> {
  private past: HistoryEntry<T>[] = [];
  private future: HistoryEntry<T>[] = [];
  private current: T;

  constructor(initialState: T, private maxHistory = 50) {
    this.current = structuredClone(initialState);
  }

  push(newState: T, description: string): void {
    this.past.push({ state: structuredClone(this.current), description });
    if (this.past.length > this.maxHistory) this.past.shift();
    this.current = structuredClone(newState);
    this.future = [];
  }

  undo(): T | null {
    const entry = this.past.pop();
    if (!entry) return null;
    this.future.push({ state: structuredClone(this.current), description: entry.description });
    this.current = entry.state;
    return structuredClone(this.current);
  }

  redo(): T | null {
    const entry = this.future.pop();
    if (!entry) return null;
    this.past.push({ state: structuredClone(this.current), description: entry.description });
    this.current = entry.state;
    return structuredClone(this.current);
  }

  getCurrent(): T { return structuredClone(this.current); }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
```

```ts
// options/rule-editor.ts
const state = await store.get();
const history = new UndoRedoManager(state.blocklist);

async function addRule(rule: string) {
  const next = [...history.getCurrent(), rule];
  history.push(next, `Add rule: ${rule}`);
  await store.update({ blocklist: next });
}

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "z") {
    e.preventDefault();
    const restored = e.shiftKey ? history.redo() : history.undo();
    if (restored) store.update({ blocklist: restored });
  }
});
```

---

## Pattern 5: Transactional State Updates (All-or-Nothing Writes)

When multiple storage keys must update atomically, roll back on failure:

```ts
// lib/transaction.ts
interface TransactionOp { key: string; value: unknown; }

export async function transaction(
  operations: TransactionOp[],
  area: "local" | "sync" = "local"
): Promise<void> {
  const storage = area === "sync" ? chrome.storage.sync : chrome.storage.local;
  const keys = operations.map((op) => op.key);
  const snapshot = await storage.get(keys);

  const payload: Record<string, unknown> = {};
  for (const op of operations) payload[op.key] = op.value;

  try {
    await storage.set(payload);
  } catch (error) {
    try { await storage.set(snapshot); } catch (e) { console.error("Rollback failed:", e); }
    throw new Error(`Transaction failed: ${error instanceof Error ? error.message : error}`);
  }
}

export async function transactionalUpdate<T extends Record<string, unknown>>(
  storageKey: string,
  updateFn: (current: T) => T,
  validate?: (next: T) => boolean | string
): Promise<T> {
  const result = await chrome.storage.local.get(storageKey);
  const current = result[storageKey] as T;
  const next = updateFn(structuredClone(current));

  if (validate) {
    const v = validate(next);
    if (v !== true) throw new Error(typeof v === "string" ? v : "Validation failed");
  }

  await chrome.storage.local.set({ [storageKey]: next });
  return next;
}
```

---

## Pattern 6: State Selectors and Memoization

Avoid recomputing expensive derived values when unrelated state changes:

```ts
// lib/selectors.ts
type Selector<S, R> = (state: S) => R;

export function createSelector<S, R>(
  selector: Selector<S, R>,
  isEqual: (a: R, b: R) => boolean = Object.is
): Selector<S, R> {
  let lastState: S | undefined;
  let lastResult: R | undefined;

  return (state: S): R => {
    if (lastState !== undefined && state === lastState) return lastResult!;
    const result = selector(state);
    if (lastResult !== undefined && isEqual(result, lastResult)) return lastResult;
    lastState = state;
    lastResult = result;
    return result;
  };
}

export function composeSelectors<S, I, R>(
  input: Selector<S, I>,
  transform: (i: I) => R
): Selector<S, R> {
  let lastInput: I | undefined;
  let lastResult: R | undefined;

  return (state: S): R => {
    const i = input(state);
    if (lastInput !== undefined && Object.is(i, lastInput)) return lastResult!;
    lastInput = i;
    lastResult = transform(i);
    return lastResult;
  };
}
```

```ts
// Usage
const selectBlocklist = (s: AppState) => s.blocklist;
const selectActiveRules = composeSelectors(
  selectBlocklist,
  (list) => list.filter((r) => !r.startsWith("#")).length
);
```

---

## Pattern 7: Cross-Tab State Synchronization via storage.onChanged

Keep all open extension UIs in sync using `chrome.storage.onChanged`:

```ts
// lib/sync-state.ts
type ChangeHandler<T> = (newValue: T, oldValue: T) => void;

export class SyncedState<T extends Record<string, unknown>> {
  private handlers = new Map<keyof T, Set<ChangeHandler<unknown>>>();

  constructor(private storageKey: string) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[this.storageKey]) return;
      const oldState = (changes[this.storageKey].oldValue ?? {}) as T;
      const newState = (changes[this.storageKey].newValue ?? {}) as T;

      for (const key of Object.keys(newState) as (keyof T)[]) {
        if (JSON.stringify(oldState[key]) !== JSON.stringify(newState[key])) {
          for (const h of this.handlers.get(key) ?? []) {
            h(newState[key], oldState[key]);
          }
        }
      }
    });
  }

  watch<K extends keyof T>(key: K, handler: ChangeHandler<T[K]>): () => void {
    if (!this.handlers.has(key)) this.handlers.set(key, new Set());
    this.handlers.get(key)!.add(handler as ChangeHandler<unknown>);
    return () => this.handlers.get(key)?.delete(handler as ChangeHandler<unknown>);
  }
}
```

```ts
// popup/main.ts
const synced = new SyncedState<AppState>("appState");

synced.watch("enabled", (val) => {
  document.getElementById("status")!.textContent = val ? "ON" : "OFF";
});

synced.watch("theme", (val) => {
  document.body.classList.toggle("dark", val === "dark");
});
```

This is critical when options and popup are open simultaneously -- a change in options writes to storage, fires `onChanged` in the popup, and both stay in sync without explicit messaging.

---

## Pattern 8: State Debugging and Time-Travel Inspection

Log every state mutation for development and troubleshooting:

```ts
// lib/state-debugger.ts
interface LogEntry {
  timestamp: number; action: string;
  prevState: unknown; nextState: unknown;
  source: string; duration?: number;
}

class StateDebugger {
  private log: LogEntry[] = [];

  record(entry: Omit<LogEntry, "timestamp">): void {
    this.log.push({ ...entry, timestamp: Date.now() });
    if (this.log.length > 200) this.log.shift();
  }

  getStateAt(index: number): unknown {
    return index >= 0 && index < this.log.length
      ? structuredClone(this.log[index].nextState) : null;
  }

  printSummary(): void {
    console.table(this.log.map((e) => ({
      time: new Date(e.timestamp).toLocaleTimeString(),
      action: e.action, source: e.source,
      duration: e.duration ? `${e.duration}ms` : "-",
    })));
  }

  async persist(): Promise<void> {
    await chrome.storage.local.set({ __stateDebugLog: this.log });
  }
}

export const stateDebugger = new StateDebugger();
```

Wrap the store to log every mutation automatically:

```ts
// lib/state-store-debug.ts
const originalUpdate = store.update.bind(store);

store.update = async function(partial) {
  const prev = await store.get();
  const start = performance.now();
  const next = await originalUpdate(partial);
  stateDebugger.record({
    action: "update", prevState: prev, nextState: next,
    source: typeof ServiceWorkerGlobalScope !== "undefined" ? "background" : "ui",
    duration: performance.now() - start,
  });
  return next;
};

// Access from DevTools console:
// __stateDebug.printSummary()
// __stateDebug.getStateAt(5)
```

---

## Summary

| Pattern | What It Solves |
|---------|---------------|
| Centralized state store | Single source of truth backed by chrome.storage |
| Pub/sub across contexts | Reactive communication between popup, background, content |
| Derived/computed state | Avoid storing redundant data; compute on read |
| Undo/redo with snapshots | Reversible user actions in options and editors |
| Transactional updates | All-or-nothing writes that roll back on failure |
| Selectors and memoization | Skip recomputation when unrelated state changes |
| Cross-tab sync via onChanged | Keep multiple open UIs consistent without messaging |
| State debugging | Time-travel inspection and mutation logging for development |

State in a Chrome extension is inherently distributed. These patterns share a common principle: treat `chrome.storage` as the authoritative store, use `onChanged` as the synchronization primitive, and layer application logic on top. Keep state shapes flat and serializable -- everything that enters `chrome.storage` must survive JSON round-tripping.
