---
layout: default
title: "Chrome Extension Service Worker Lifecycle — Best Practices"
description: "Understand the service worker lifecycle in Manifest V3."
canonical_url: "https://bestchromeextensions.com/patterns/service-worker-lifecycle/"
---

# Service Worker Lifecycle Patterns

## Overview {#overview}

The [MV3 service workers guide](../mv3/service-workers.md) covers the basics of migrating from background pages. This article goes deeper into lifecycle events, keep-alive strategies, state persistence, error recovery, and advanced patterns for working with Chrome's ephemeral service worker model.

---

## Lifecycle States {#lifecycle-states}

```
                    ┌──────────┐
        install ──> │ Starting │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
   events arrive -> │  Active  │ <── wake up
                    └────┬─────┘
                         │ idle (~30s)
                    ┌────▼─────┐
                    │  Idle    │
                    └────┬─────┘
                         │ timeout
                    ┌────▼──────┐
                    │ Terminated│
                    └───────────┘
```

Key facts:
- **Active**: Processing events, running code
- **Idle**: No pending events, countdown to termination begins (~30 seconds)
- **Terminated**: All memory released, global state lost
- **Wake up**: Chrome restarts the worker when an event fires

---

## Pattern 1: Synchronous Event Registration {#pattern-1-synchronous-event-registration}

All `chrome.*` event listeners **must** be registered synchronously at the top level of your service worker. This is the most critical lifecycle requirement:

```ts
// background.ts

// CORRECT: Top-level, synchronous registration
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.action.onClicked.addListener(handleActionClick);
chrome.tabs.onUpdated.addListener(handleTabUpdate);
chrome.contextMenus.onClicked.addListener(handleMenuClick);
chrome.alarms.onAlarm.addListener(handleAlarm);

// WRONG: Conditional or async registration
// These listeners may not be registered when the SW wakes up
async function setup() {
  const settings = await chrome.storage.local.get("features");
  if (settings.features.contextMenu) {
    // This might not fire — the SW could wake for this event
    // before this async code runs
    chrome.contextMenus.onClicked.addListener(handleMenuClick);
  }
}
// setup(); // DON'T DO THIS

// Instead: Always register, check conditions inside the handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const settings = await chrome.storage.local.get("features");
  if (!settings.features.contextMenu) return; // no-op if disabled
  handleMenuClick(info, tab);
});
```

---

## Pattern 2: State Persistence Across Restarts {#pattern-2-state-persistence-across-restarts}

Global variables are lost when the service worker terminates. Choose the right storage for each type of state:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

// Persistent state — survives browser restart
const persistentSchema = defineSchema({
  userSettings: { theme: "light" as "light" | "dark", notifications: true },
  totalActions: 0,
});
const persistent = createStorage({ schema: persistentSchema, area: "local" });

// Session state — survives SW restart, cleared on browser restart
const sessionSchema = defineSchema({
  activeTab: 0,
  pendingQueue: [] as string[],
  lastCheck: 0,
});

// chrome.storage.session for SW-restart-safe ephemeral state
async function getSessionState<K extends string>(key: K) {
  const result = await chrome.storage.session.get(key);
  return result[key];
}

async function setSessionState(items: Record<string, unknown>) {
  await chrome.storage.session.set(items);
}

// Usage — restoring state after SW wake
chrome.action.onClicked.addListener(async () => {
  const pendingQueue = (await getSessionState("pendingQueue")) ?? [];
  pendingQueue.push(Date.now().toString());
  await setSessionState({ pendingQueue });
});
```

### State Machine Pattern {#state-machine-pattern}

```ts
// background.ts — Persistent state machine
type ExtensionState = "idle" | "scanning" | "paused" | "error";

async function getState(): Promise<ExtensionState> {
  const { extensionState } = await chrome.storage.session.get("extensionState");
  return (extensionState as ExtensionState) ?? "idle";
}

async function setState(state: ExtensionState) {
  await chrome.storage.session.set({ extensionState: state });
  // Update badge to reflect state
  const badges: Record<ExtensionState, { text: string; color: string }> = {
    idle: { text: "", color: "#4285f4" },
    scanning: { text: "...", color: "#fbbc04" },
    paused: { text: "||", color: "#9e9e9e" },
    error: { text: "!", color: "#ea4335" },
  };
  const badge = badges[state];
  await chrome.action.setBadgeText({ text: badge.text });
  await chrome.action.setBadgeBackgroundColor({ color: badge.color });
}

async function transition(from: ExtensionState, to: ExtensionState): Promise<boolean> {
  const current = await getState();
  if (current !== from) return false;
  await setState(to);
  return true;
}
```

---

## Pattern 3: Keep-Alive Strategies {#pattern-3-keep-alive-strategies}

Sometimes you need the service worker to stay active beyond 30 seconds:

### Using chrome.alarms (Recommended) {#using-chromealarms-recommended}

```ts
// background.ts
// Alarms wake up the SW — minimum interval is 1 minute in production
chrome.alarms.create("keepalive", { periodInMinutes: 0.5 }); // 30 sec in dev

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "keepalive") {
    // Do periodic work here
    await checkForUpdates();
  }
});
```

### Using Long-Lived Connections {#using-long-lived-connections}

```ts
// popup.ts or content.ts — keeps SW alive while connected
const port = chrome.runtime.connect({ name: "keepalive" });

// Send periodic pings to prevent port timeout (5 min max)
const pingInterval = setInterval(() => {
  port.postMessage({ type: "ping" });
}, 25_000); // every 25 seconds

port.onDisconnect.addListener(() => {
  clearInterval(pingInterval);
});

// background.ts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "keepalive") {
    port.onMessage.addListener((msg) => {
      if (msg.type === "ping") {
        port.postMessage({ type: "pong" });
      }
    });
  }
});
```

### Using offscreen Documents (Chrome 109+) {#using-offscreen-documents-chrome-109}

```ts
// background.ts
async function createKeepAliveDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });

  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.BLOBS],
    justification: "Keep service worker alive for ongoing operation",
  });
}
```

---

## Pattern 4: Handling the Install/Update Lifecycle {#pattern-4-handling-the-installupdate-lifecycle}

```ts
// background.ts
chrome.runtime.onInstalled.addListener(async (details) => {
  switch (details.reason) {
    case "install":
      await handleFirstInstall();
      break;

    case "update":
      await handleUpdate(details.previousVersion!);
      break;

    case "chrome_update":
      // Browser was updated — re-register context menus, etc.
      await reinitialize();
      break;
  }
});

async function handleFirstInstall() {
  // Set default settings
  await chrome.storage.local.set({
    userSettings: { theme: "light", notifications: true },
    totalActions: 0,
  });

  // Create context menus
  chrome.contextMenus.create({
    id: "main-action",
    title: "Process Selection",
    contexts: ["selection"],
  });

  // Open onboarding page
  await chrome.tabs.create({ url: "onboarding.html" });
}

async function handleUpdate(previousVersion: string) {
  // Run migrations
  const [major] = previousVersion.split(".").map(Number);

  if (major < 2) {
    // Migrate v1 storage format to v2
    const old = await chrome.storage.local.get("legacySettings");
    if (old.legacySettings) {
      await chrome.storage.local.set({
        userSettings: migrateSettings(old.legacySettings),
      });
      await chrome.storage.local.remove("legacySettings");
    }
  }
}

async function reinitialize() {
  // Context menus are wiped on browser update — recreate them
  chrome.contextMenus.create({
    id: "main-action",
    title: "Process Selection",
    contexts: ["selection"],
  });
}
```

---

## Pattern 5: Error Recovery {#pattern-5-error-recovery}

Service workers can crash. Handle unexpected termination gracefully:

```ts
// background.ts

// Mark operations as in-progress so they can be resumed
async function performLongOperation(operationId: string) {
  // Record that we're starting
  await chrome.storage.session.set({
    [`op_${operationId}`]: {
      status: "running",
      startedAt: Date.now(),
      progress: 0,
    },
  });

  try {
    for (let i = 0; i < 100; i++) {
      await doChunk(i);
      // Checkpoint progress
      await chrome.storage.session.set({
        [`op_${operationId}`]: {
          status: "running",
          startedAt: Date.now(),
          progress: i + 1,
        },
      });
    }

    await chrome.storage.session.remove(`op_${operationId}`);
  } catch (error) {
    await chrome.storage.session.set({
      [`op_${operationId}`]: {
        status: "error",
        error: String(error),
      },
    });
  }
}

// On startup, check for interrupted operations
async function resumeInterruptedOperations() {
  const allSession = await chrome.storage.session.get(null);

  for (const [key, value] of Object.entries(allSession)) {
    if (key.startsWith("op_") && (value as any).status === "running") {
      const operationId = key.slice(3);
      const progress = (value as any).progress ?? 0;
      console.log(`Resuming operation ${operationId} from progress ${progress}`);
      // Resume from checkpoint
      await performLongOperation(operationId);
    }
  }
}

resumeInterruptedOperations();
```

---

## Pattern 6: Startup Time Optimization {#pattern-6-startup-time-optimization}

Fast startup means events are handled quickly:

```ts
// background.ts

// 1. Register all listeners FIRST (synchronous, fast)
chrome.runtime.onInstalled.addListener(onInstalled);
chrome.action.onClicked.addListener(onActionClicked);
chrome.tabs.onUpdated.addListener(onTabUpdated);
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.runtime.onMessage.addListener(onMessage);

// 2. Do async initialization AFTER listener registration
initializeAsync();

async function initializeAsync() {
  // This runs after all listeners are registered
  // So events arriving during init will be queued
  const settings = await chrome.storage.local.get("userSettings");
  // ... setup based on settings
}

// 3. Inside handlers, lazy-load heavy modules
async function onActionClicked(tab: chrome.tabs.Tab) {
  // Dynamic import — only loads when needed
  const { processTab } = await import("./tab-processor.js");
  await processTab(tab);
}
```

---

## Pattern 7: Monitoring SW Health {#pattern-7-monitoring-sw-health}

```ts
// background.ts
const SW_START = Date.now();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "sw-health") {
    sendResponse({
      uptime: Date.now() - SW_START,
      timestamp: Date.now(),
    });
    return true;
  }
});

// popup.ts — Check SW status
async function checkServiceWorkerHealth() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "sw-health" });
    console.log(`SW uptime: ${(response.uptime / 1000).toFixed(0)}s`);
    return { alive: true, ...response };
  } catch {
    console.warn("Service worker not responding");
    return { alive: false };
  }
}
```

---

## Common Pitfalls {#common-pitfalls}

### 1. setTimeout/setInterval {#1-settimeoutsetinterval}

```ts
// Bad: Timer is killed when SW terminates
setTimeout(() => doWork(), 60_000);

// Good: Use chrome.alarms
chrome.alarms.create("do-work", { delayInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "do-work") doWork();
});
```

### 2. Fetch with No Listener {#2-fetch-with-no-listener}

```ts
// Bad: SW terminates before fetch completes if no event keeps it alive
fetch("https://api.example.com/data").then(processData);

// Good: Use waitUntil-like pattern
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "fetch-data") {
    // Returning true keeps the message channel open → SW stays alive
    fetch("https://api.example.com/data")
      .then((r) => r.json())
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // keeps SW alive until sendResponse is called
  }
});
```

### 3. WebSocket Connections {#3-websocket-connections}

```ts
// WebSockets close when SW terminates. Use chrome.alarms to poll instead,
// or use an offscreen document for persistent connections.
```

---

## Summary {#summary}

| Pattern | When to Use |
|---------|------------|
| Synchronous registration | Always — every event listener, every project |
| Session storage state | Ephemeral state that survives SW restarts |
| chrome.alarms keep-alive | Periodic background work |
| Port-based keep-alive | While popup/content script is actively connected |
| Install/update handlers | Schema migrations, context menu setup |
| Operation checkpointing | Long-running tasks that might be interrupted |
| Lazy imports | Heavy modules not needed on every wake |
| Health monitoring | Debugging and user-facing status |

The service worker lifecycle is not a limitation to fight — it's a design constraint to embrace. Build your extension as a series of small, fast event handlers that persist their state externally and resume gracefully.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
