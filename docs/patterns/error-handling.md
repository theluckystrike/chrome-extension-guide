---
layout: default
title: "Chrome Extension Error Handling — Best Practices"
description: "Comprehensive error handling in Chrome extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/error-handling/"
---

# Error Handling Patterns

## Overview

Chrome extensions run code across multiple contexts — background service workers, content scripts, popup pages, and options pages. An unhandled error in one context can silently break functionality without any visible feedback. This guide covers practical patterns for catching, typing, isolating, retrying, and reporting errors across every extension context.

---

## The Error Landscape

```
┌──────────────────────────────────────────────────────┐
│                  Extension Contexts                   │
│                                                      │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Background   │  │  Popup   │  │Content Script │  │
│  │  (SW)         │  │  (UI)    │  │  (per tab)    │  │
│  │              │  │          │  │               │  │
│  │ - fetch fail │  │ - render │  │ - DOM errors  │  │
│  │ - alarm err  │  │   errors │  │ - msg timeout │  │
│  │ - msg errors │  │ - state  │  │ - host page   │  │
│  └──────┬───────┘  └────┬─────┘  └───────┬───────┘  │
│         │               │                │           │
│         └───────────┬───┘────────────────┘           │
│                     │                                │
│            ┌────────▼────────┐                       │
│            │  Error Pipeline │                       │
│            │  (collect/report)│                       │
│            └─────────────────┘                       │
└──────────────────────────────────────────────────────┘
```

Each context has its own global scope, its own error events, and its own failure modes. A centralized strategy is essential.

---

## Pattern 1: Centralized Error Handler

Create a single error handler module that works in every context:

```ts
// lib/error-handler.ts

type ErrorSeverity = "low" | "medium" | "high" | "critical";
type ExtensionContext = "background" | "content" | "popup" | "options";

interface ErrorReport {
  message: string;
  stack?: string;
  context: ExtensionContext;
  severity: ErrorSeverity;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const ERROR_BUFFER: ErrorReport[] = [];
const MAX_BUFFER_SIZE = 100;

function detectContext(): ExtensionContext {
  if (typeof ServiceWorkerGlobalScope !== "undefined") return "background";
  if (location.protocol === "chrome-extension:") {
    if (location.pathname.includes("popup")) return "popup";
    return "options";
  }
  return "content";
}

export function handleError(
  error: unknown,
  severity: ErrorSeverity = "medium",
  metadata?: Record<string, unknown>
): void {
  const report: ErrorReport = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: detectContext(),
    severity,
    timestamp: Date.now(),
    metadata,
  };

  ERROR_BUFFER.push(report);
  if (ERROR_BUFFER.length > MAX_BUFFER_SIZE) {
    ERROR_BUFFER.shift();
  }

  // Always log locally
  console.error(`[${report.context}] ${report.severity}:`, report.message);

  // Forward critical errors to background for aggregation
  if (report.context !== "background" && severity === "critical") {
    chrome.runtime.sendMessage({
      type: "ERROR_REPORT",
      payload: report,
    }).catch(() => {
      // Extension context may be invalid — nothing we can do
    });
  }
}

export function getErrorBuffer(): readonly ErrorReport[] {
  return ERROR_BUFFER;
}

export function clearErrorBuffer(): void {
  ERROR_BUFFER.length = 0;
}
```

Wire it up in each context:

```ts
// background.ts
import { handleError } from "./lib/error-handler";

// Catch unhandled promise rejections in the service worker
self.addEventListener("unhandledrejection", (event) => {
  handleError(event.reason, "high", { type: "unhandledrejection" });
});

// Catch synchronous errors
self.addEventListener("error", (event) => {
  handleError(event.error, "high", { type: "uncaught" });
});

// Listen for error reports from other contexts
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "ERROR_REPORT") {
    handleError(message.payload.message, message.payload.severity, {
      ...message.payload.metadata,
      originalContext: message.payload.context,
    });
  }
});
```

```ts
// content.ts
import { handleError } from "./lib/error-handler";

window.addEventListener("unhandledrejection", (event) => {
  handleError(event.reason, "medium", { type: "unhandledrejection" });
});

window.addEventListener("error", (event) => {
  handleError(event.error, "medium", { type: "uncaught" });
});
```

---

## Pattern 2: Typed Error Classes

Define extension-specific error types so catch blocks can make intelligent decisions:

```ts
// lib/errors.ts

export class ExtensionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = "ExtensionError";
  }
}

export class PermissionError extends ExtensionError {
  constructor(
    public readonly permission: string,
    message?: string
  ) {
    super(
      message ?? `Missing permission: ${permission}`,
      "PERMISSION_DENIED",
      true
    );
    this.name = "PermissionError";
  }
}

export class StorageError extends ExtensionError {
  constructor(operation: "read" | "write", key: string, cause?: Error) {
    super(
      `Storage ${operation} failed for key "${key}"`,
      "STORAGE_FAILURE",
      true
    );
    this.name = "StorageError";
    this.cause = cause;
  }
}

export class MessageError extends ExtensionError {
  constructor(
    public readonly target: string,
    cause?: Error
  ) {
    super(
      `Message to ${target} failed: ${cause?.message ?? "unknown"}`,
      "MESSAGE_FAILURE",
      true
    );
    this.name = "MessageError";
    this.cause = cause;
  }
}

export class NetworkError extends ExtensionError {
  constructor(
    public readonly url: string,
    public readonly status?: number,
    cause?: Error
  ) {
    super(
      `Network request to ${url} failed${status ? ` (${status})` : ""}`,
      "NETWORK_FAILURE",
      true
    );
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export class ContextInvalidatedError extends ExtensionError {
  constructor() {
    super(
      "Extension context invalidated — extension was updated or reloaded",
      "CONTEXT_INVALIDATED",
      false // not recoverable without a page reload
    );
    this.name = "ContextInvalidatedError";
  }
}
```

Use them for branching recovery logic:

```ts
import {
  PermissionError,
  NetworkError,
  ContextInvalidatedError,
} from "./lib/errors";
import { handleError } from "./lib/error-handler";

async function fetchData(url: string): Promise<unknown> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new NetworkError(url, response.status);
    return await response.json();
  } catch (error) {
    if (error instanceof NetworkError && error.status === 429) {
      // Rate limited — retry with backoff (see Pattern 4)
      return retryWithBackoff(() => fetchData(url));
    }
    if (error instanceof ContextInvalidatedError) {
      // Nothing to do — extension is gone
      return null;
    }
    handleError(error, "high", { url });
    throw error;
  }
}
```

---

## Pattern 3: Graceful Degradation for Missing Permissions

Optional permissions can be revoked at any time. Always check before using gated APIs:

```ts
// lib/permissions.ts

export async function hasPermission(
  permission: string
): Promise<boolean> {
  return chrome.permissions.contains({ permissions: [permission] });
}

export async function hasHostPermission(
  origin: string
): Promise<boolean> {
  return chrome.permissions.contains({ origins: [origin] });
}

export async function requirePermission(
  permission: string
): Promise<void> {
  const granted = await hasPermission(permission);
  if (!granted) {
    throw new PermissionError(permission);
  }
}

// Wrap a function with a permission check that falls back gracefully
export function withPermission<T>(
  permission: string,
  fn: () => Promise<T>,
  fallback: T
): () => Promise<T> {
  return async () => {
    const granted = await hasPermission(permission);
    if (!granted) {
      console.warn(
        `Feature degraded: "${permission}" permission not granted`
      );
      return fallback;
    }
    return fn();
  };
}
```

```ts
// background.ts
import { withPermission } from "./lib/permissions";

// Full implementation when tabs permission is available
async function getOpenTabCount(): Promise<number> {
  const tabs = await chrome.tabs.query({});
  return tabs.length;
}

// Exported version gracefully degrades to -1 if permission is missing
export const safeGetOpenTabCount = withPermission(
  "tabs",
  getOpenTabCount,
  -1 // fallback: unknown count
);

// Listen for permission changes and adapt at runtime
chrome.permissions.onRemoved.addListener((permissions) => {
  console.warn("Permissions revoked:", permissions);
  // Notify popup/options to update their UI
  chrome.runtime.sendMessage({
    type: "PERMISSIONS_CHANGED",
    removed: permissions,
  }).catch(() => {});
});

chrome.permissions.onAdded.addListener((permissions) => {
  console.log("Permissions granted:", permissions);
  chrome.runtime.sendMessage({
    type: "PERMISSIONS_CHANGED",
    added: permissions,
  }).catch(() => {});
});
```

---

## Pattern 4: Retry with Exponential Backoff

Network calls from extensions fail often — the user might be offline, the API might be rate-limiting, or the service worker might wake mid-request:

```ts
// lib/retry.ts

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  shouldRetry: () => true,
  onRetry: () => {},
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === config.maxAttempts) break;
      if (!config.shouldRetry(error, attempt)) break;

      // Exponential backoff with jitter
      const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * config.baseDelayMs * 0.5;
      const delay = Math.min(exponentialDelay + jitter, config.maxDelayMs);

      config.onRetry(error, attempt, delay);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

Use it with typed error discrimination:

```ts
import { retryWithBackoff } from "./lib/retry";
import { NetworkError } from "./lib/errors";
import { handleError } from "./lib/error-handler";

async function callExternalApi(endpoint: string): Promise<unknown> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(`https://api.example.com/${endpoint}`, {
        headers: { Authorization: `Bearer ${await getApiKey()}` },
      });
      if (!response.ok) {
        throw new NetworkError(endpoint, response.status);
      }
      return response.json();
    },
    {
      maxAttempts: 4,
      baseDelayMs: 500,
      shouldRetry: (error) => {
        if (error instanceof NetworkError) {
          // Retry on 429 (rate limit) and 5xx (server errors)
          return error.status === 429 || (error.status ?? 0) >= 500;
        }
        // Retry on network failures (no status code)
        return error instanceof TypeError;
      },
      onRetry: (error, attempt, delayMs) => {
        handleError(error, "low", {
          retryAttempt: attempt,
          nextRetryMs: delayMs,
          endpoint,
        });
      },
    }
  );
}
```

---

## Pattern 5: Error Boundaries for Extension UI

Popup and options pages built with frameworks need error boundaries to avoid a blank white page:

```ts
// ui/error-boundary.ts — Framework-agnostic fallback renderer

export function renderErrorFallback(
  container: HTMLElement,
  error: Error,
  onRetry?: () => void
): void {
  container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.style.cssText = `
    padding: 24px;
    font-family: system-ui, sans-serif;
    text-align: center;
    color: #333;
  `;

  const heading = document.createElement("h3");
  heading.textContent = "Something went wrong";

  const details = document.createElement("pre");
  details.textContent = error.message;
  details.style.cssText = `
    margin: 12px 0; padding: 8px; background: #f5f5f5;
    border-radius: 4px; font-size: 11px; overflow: auto;
    text-align: left; max-height: 120px;
  `;

  wrapper.append(heading, details);

  if (onRetry) {
    const btn = document.createElement("button");
    btn.textContent = "Try Again";
    btn.style.cssText = `
      padding: 8px 20px; background: #4285f4; color: white;
      border: none; border-radius: 4px; cursor: pointer;
    `;
    btn.addEventListener("click", onRetry);
    wrapper.appendChild(btn);
  }

  container.appendChild(wrapper);
}
```

```tsx
// ui/ErrorBoundary.tsx — React error boundary for popup/options

import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { handleError } from "../lib/error-handler";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    handleError(error, "high", {
      componentStack: info.componentStack ?? undefined,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: 24, textAlign: "center" }}>
          <h3>Something went wrong</h3>
          <pre style={{ fontSize: 11 }}>{this.state.error?.message}</pre>
          <button onClick={this.handleRetry}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

```tsx
// popup/App.tsx
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { Dashboard } from "./Dashboard";

export function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
```

---

## Pattern 6: Content Script Error Isolation

Content scripts share the page's DOM. An uncaught exception can break page functionality or leak extension internals. Wrap all content script entry points:

```ts
// content.ts
import { handleError } from "./lib/error-handler";

// Wrap the entire content script initialization
function main() {
  try {
    initializeFeatures();
  } catch (error) {
    handleError(error, "high", { phase: "init" });
    // Do NOT re-throw — don't crash the host page
  }
}

function initializeFeatures() {
  // Wrap each feature independently so one failure doesn't block others
  const features = [
    { name: "highlighter", init: initHighlighter },
    { name: "sidebar", init: initSidebar },
    { name: "shortcuts", init: initShortcuts },
  ];

  for (const feature of features) {
    try {
      feature.init();
    } catch (error) {
      handleError(error, "medium", {
        feature: feature.name,
        phase: "feature-init",
      });
      // Continue initializing other features
    }
  }
}

// Wrap event listeners to prevent errors from propagating to the page
function safeListener<E extends Event>(
  featureName: string,
  handler: (event: E) => void
): (event: E) => void {
  return (event: E) => {
    try {
      handler(event);
    } catch (error) {
      handleError(error, "medium", {
        feature: featureName,
        event: event.type,
      });
    }
  };
}

function initHighlighter() {
  document.addEventListener(
    "mouseup",
    safeListener("highlighter", (event: MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      highlightSelection(selection);
    })
  );
}

// Wrap async operations
async function safeAsync<T>(
  featureName: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, "medium", { feature: featureName, async: true });
    return fallback;
  }
}

// Wrap timers so periodic tasks don't crash the host page
function safeInterval(
  featureName: string,
  fn: () => void,
  intervalMs: number
): number {
  return window.setInterval(() => {
    try {
      fn();
    } catch (error) {
      handleError(error, "low", { feature: featureName, timer: true });
    }
  }, intervalMs);
}

main();
```

---

## Pattern 7: Logging and Error Reporting Pipeline

Build a pipeline that captures errors across all contexts and periodically ships them:

```ts
// lib/error-reporter.ts

interface ReporterConfig {
  endpoint?: string;
  batchIntervalMs?: number;
  maxBatchSize?: number;
  enabled?: boolean;
  beforeSend?: (reports: ErrorReport[]) => ErrorReport[];
}

export class ErrorReporter {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private config: ReporterConfig = {}) {
    this.config = {
      batchIntervalMs: 60_000,
      maxBatchSize: 50,
      enabled: true,
      ...config,
    };
  }

  start(): void {
    if (!this.config.enabled) return;

    this.intervalId = setInterval(() => {
      this.flush();
    }, this.config.batchIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async flush(): Promise<void> {
    let reports = [...getErrorBuffer()];
    if (reports.length === 0) return;

    if (reports.length > this.config.maxBatchSize!) {
      reports = reports.slice(-this.config.maxBatchSize!);
    }

    if (this.config.beforeSend) {
      reports = this.config.beforeSend(reports);
    }

    // Always persist to local storage as fallback
    await this.persistLocally(reports);

    // Send to remote endpoint if configured
    if (this.config.endpoint) {
      try {
        await fetch(this.config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extensionId: chrome.runtime.id,
            version: chrome.runtime.getManifest().version,
            reports,
          }),
        });
        clearErrorBuffer();
      } catch {
        // Network failed — errors stay in buffer for next flush
      }
    } else {
      clearErrorBuffer();
    }
  }

  private async persistLocally(reports: ErrorReport[]): Promise<void> {
    try {
      const { errorLog = [] } = await chrome.storage.local.get("errorLog");
      const merged = [...errorLog, ...reports].slice(-200);
      await chrome.storage.local.set({ errorLog: merged });
    } catch {
      // Storage quota exceeded or context invalid — drop silently
    }
  }
}
```

```ts
// background.ts
import { ErrorReporter } from "./lib/error-reporter";

const reporter = new ErrorReporter({
  endpoint: "https://errors.example.com/v1/collect",
  batchIntervalMs: 60_000,
  beforeSend: (reports) =>
    reports.map((r) => ({
      ...r,
      stack: r.stack?.split("\n").slice(0, 3).join("\n"),
    })),
});

reporter.start();
```

View collected errors from the options page:

```ts
// options.ts — Display error log for debugging
async function displayErrorLog(): Promise<void> {
  const { errorLog = [] } = await chrome.storage.local.get("errorLog");

  const container = document.getElementById("error-log")!;
  if (errorLog.length === 0) {
    container.textContent = "No errors recorded.";
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Time</th><th>Context</th><th>Severity</th><th>Message</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement("tbody");
  for (const report of errorLog.reverse()) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${new Date(report.timestamp).toLocaleTimeString()}</td>
      <td>${report.context}</td>
      <td>${report.severity}</td>
      <td title="${report.stack ?? ""}">${report.message}</td>
    `;
    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  container.appendChild(table);
}
```

---

## Pattern 8: chrome.runtime.lastError Handling

Many Chrome APIs use `chrome.runtime.lastError` instead of throwing. Failing to check it produces "Unchecked runtime.lastError" console warnings and silently swallows errors:

```ts
// lib/chrome-api.ts

/**
 * Wraps a callback-style Chrome API call in a Promise that properly
 * checks chrome.runtime.lastError.
 */
export function chromeAsync<T>(
  apiCall: (callback: (result: T) => void) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    apiCall((result: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}
```

```ts
// Usage with various Chrome APIs
import { chromeAsync } from "./lib/chrome-api";

// Tabs — sendMessage requires lastError check
async function sendToTab(tabId: number, message: unknown): Promise<unknown> {
  return chromeAsync((cb) => chrome.tabs.sendMessage(tabId, message, cb));
}

// Cookies — get requires lastError check
async function getCookie(
  url: string,
  name: string
): Promise<chrome.cookies.Cookie | null> {
  return chromeAsync((cb) => chrome.cookies.get({ url, name }, cb));
}
```

For promise-based MV3 APIs, wrap them to add context and filter expected errors:

```ts
// lib/safe-chrome.ts

export const safeChrome = {
  tabs: {
    async sendMessage(
      tabId: number,
      message: unknown
    ): Promise<unknown> {
      try {
        return await chrome.tabs.sendMessage(tabId, message);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("Could not establish connection")) {
          return undefined; // tab was closed
        }
        if (msg.includes("Receiving end does not exist")) {
          return undefined; // content script not injected
        }
        throw error;
      }
    },

    async query(
      queryInfo: chrome.tabs.QueryInfo
    ): Promise<chrome.tabs.Tab[]> {
      try {
        return await chrome.tabs.query(queryInfo);
      } catch {
        return []; // Degrade gracefully
      }
    },
  },

  storage: {
    async get<T extends Record<string, unknown>>(
      keys: string | string[]
    ): Promise<T> {
      try {
        return (await chrome.storage.local.get(keys)) as T;
      } catch (error) {
        throw new StorageError("read", String(keys), error as Error);
      }
    },

    async set(items: Record<string, unknown>): Promise<void> {
      try {
        await chrome.storage.local.set(items);
      } catch (error) {
        throw new StorageError("write", Object.keys(items).join(","), error as Error);
      }
    },
  },
};
```

Handle `sendMessage` when no receivers are listening:

```ts
// lib/messaging.ts

export async function broadcastMessage(message: unknown): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Expected when popup/options are closed — not an error
    if (msg.includes("Receiving end does not exist")) {
      return;
    }
    if (msg.includes("Extension context invalidated")) {
      throw new ContextInvalidatedError();
    }
    throw error;
  }
}
```

---

## Summary

| Pattern | Problem It Solves |
|---------|------------------|
| Centralized error handler | Consistent error capture across all contexts |
| Typed error classes | Intelligent catch blocks with recovery logic |
| Permission degradation | Features that work with or without optional permissions |
| Retry with backoff | Transient network and API failures |
| Error boundaries | Blank white popup/options pages after render errors |
| Content script isolation | Preventing extension errors from crashing host pages |
| Reporting pipeline | Aggregating and shipping errors for debugging |
| lastError handling | Silent failures from callback-based Chrome APIs |

Treat errors as first-class data in your extension. Type them, catch them at every boundary, degrade gracefully when you can, and ship them to a pipeline so you can debug what users actually hit. The worst extension bug is the one nobody sees — because the error was silently swallowed.
