---
layout: default
title: "Chrome Extension Background Service Workers — Developer Guide"
description: "Master Chrome extension service workers with this guide covering lifecycle, messaging, and background task implementation."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/background-patterns/"
---
# Background Service Worker Patterns

## Overview {#overview}
The background service worker is the central hub of your extension. It handles events, manages state, coordinates between contexts, and runs business logic. In MV3, it's ephemeral — so patterns must account for termination and restart.

## Manifest Setup {#manifest-setup}
```json
{
  "background": {
    "service_worker": "background.ts",
    "type": "module"
  }
}
```

## Pattern 1: Central Message Hub {#pattern-1-central-message-hub}

Register all handlers at top level:

```ts
// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

type Messages = {
  getSettings: { request: void; response: Settings };
  updateSetting: { request: { key: string; value: unknown }; response: { saved: boolean } };
  getStats: { request: void; response: Stats };
  processPage: { request: { tabId: number }; response: { result: string } };
};

const msg = createMessenger<Messages>();

// MUST be at top level — synchronous registration
msg.onMessage({
  getSettings: async () => storage.getAll(),
  updateSetting: async ({ key, value }) => {
    await storage.set(key as any, value as any);
    return { saved: true };
  },
  getStats: async () => computeStats(),
  processPage: async ({ tabId }) => {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.title,
    });
    return { result: result.result };
  },
});
```

## Pattern 2: State Management with Storage {#pattern-2-state-management-with-storage}

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  isEnabled: true,
  processedCount: 0,
  lastRunTime: 0,
  activeRules: [] as Array<{ id: number; pattern: string }>,
  errorLog: [] as Array<{ message: string; timestamp: number }>,
});

const storage = createStorage({ schema });

// Restore state on service worker startup
async function init() {
  const { isEnabled } = await storage.getAll();
  if (isEnabled) startProcessing();

  // Update badge from stored state
  const count = await storage.get("processedCount");
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
}

init();
```

## Pattern 3: Event-Driven Architecture {#pattern-3-event-driven-architecture}

```ts
// Install/update handler
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    // First install — set defaults
    await storage.setMany({
      isEnabled: true,
      processedCount: 0,
      lastRunTime: Date.now(),
    });
    // Create context menus
    chrome.contextMenus.create({ id: "process", title: "Process page", contexts: ["page"] });
  }
  if (details.reason === "update") {
    // Migration logic
  }
});

// Tab events
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  const enabled = await storage.get("isEnabled");
  if (!enabled) return;
  // Process the tab
});

// Alarm events
chrome.alarms.create("periodic-check", { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "periodic-check") {
    await performPeriodicCheck();
    await storage.set("lastRunTime", Date.now());
  }
});
```

## Pattern 4: Permission-Gated Features {#pattern-4-permission-gated-features}

```ts
import { checkPermission } from "@theluckystrike/webext-permissions";

async function processTab(tabId: number) {
  // Check if we have tabs permission before accessing URL
  const tabsPerm = await checkPermission("tabs");

  if (tabsPerm.granted) {
    const tab = await chrome.tabs.get(tabId);
    await storage.set("lastProcessedUrl", tab.url ?? "");
  }

  // Always safe operations (don't need tabs permission)
  const count = await storage.get("processedCount");
  await storage.set("processedCount", count + 1);
  chrome.action.setBadgeText({ text: String(count + 1) });
}
```

## Pattern 5: Error Logging {#pattern-5-error-logging}

```ts
async function logError(message: string) {
  const log = await storage.get("errorLog");
  log.push({ message, timestamp: Date.now() });
  await storage.set("errorLog", log.slice(-50)); // Keep last 50
}

// Wrap handlers with error catching
function withErrorHandling<T>(fn: () => Promise<T>): () => Promise<T | undefined> {
  return async () => {
    try {
      return await fn();
    } catch (err) {
      await logError(err instanceof Error ? err.message : String(err));
      return undefined;
    }
  };
}
```

## Pattern 6: Multi-Context Coordination {#pattern-6-multi-context-coordination}

Background coordinates between popup, content scripts, and options:

```ts
// Watch for settings changes from options page
storage.watch("isEnabled", async (enabled) => {
  if (enabled) {
    chrome.action.setBadgeBackgroundColor({ color: "#4ade80" });
    chrome.action.setBadgeText({ text: "ON" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
});

storage.watch("activeRules", async (rules) => {
  // Update declarativeNetRequest rules when user changes them in options
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules: rules.map(r => ({
      id: r.id,
      priority: 1,
      action: { type: "block" as const },
      condition: { urlFilter: r.pattern },
    })),
  });
});
```

## Pattern 7: Initialization and Recovery {#pattern-7-initialization-and-recovery}

```ts
// Service worker can restart at any time — always re-initialize
async function ensureInitialized() {
  const lastRun = await storage.get("lastRunTime");
  const timeSinceLastRun = Date.now() - lastRun;

  if (timeSinceLastRun > 60 * 60 * 1000) {
    // More than 1 hour since last run — do cleanup
    await performCleanup();
  }

  // Ensure alarms exist
  const alarms = await chrome.alarms.getAll();
  if (!alarms.find(a => a.name === "periodic-check")) {
    chrome.alarms.create("periodic-check", { periodInMinutes: 30 });
  }

  await storage.set("lastRunTime", Date.now());
}

ensureInitialized();
```

## Service Worker Best Practices {#service-worker-best-practices}
1. Register all event listeners at top level (synchronously)
2. Never rely on in-memory state — always use storage
3. Use alarms instead of setTimeout/setInterval
4. Initialize/restore state on every startup
5. Keep handlers fast — avoid blocking the event loop
6. Use messaging for cross-context communication
7. Log errors to storage for debugging

## Gotchas {#gotchas}
- Service worker terminates after ~30 seconds of inactivity
- All event listeners must be at top level (not inside async functions)
- chrome.storage.session is good for ephemeral state that doesn't need to persist across restarts
- Don't import heavy libraries — affects startup time
- Use dynamic import() for rarely-used code paths

## Related Guides {#related-guides}
- [Service Workers (MV3)](../mv3/service-workers.md)
- [Content Script Patterns](content-script-patterns.md)
- [Popup Patterns](popup-patterns.md)

## Related Articles {#related-articles}

- [Service Worker Lifecycle](../guides/service-worker-lifecycle.md)
- [Service Worker Debugging](../guides/service-worker-debugging.md)
- [Event-Driven Messaging](../patterns/event-driven-messaging.md)
