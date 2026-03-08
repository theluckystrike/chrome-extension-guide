---
layout: default
title: "Chrome Extension Tab Management — Best Practices"
description: "Implement advanced tab management features."
---

# Tab Management Patterns

## Overview

Chrome's `chrome.tabs` API is the backbone of most extensions. This guide provides production patterns for managing tabs at scale: singleton tabs, tab groups, lifecycle tracking, batch operations, state machines, pinned tabs, per-tab badges, and window-tab relationships. Each pattern includes TypeScript code ready for your service worker.

> **Permissions**: Most patterns require `"tabs"` in your manifest. Tab groups require `"tabGroups"`. Badge updates need `"action"`.

---

## Pattern 1: Singleton Tabs (Open or Focus Existing)

Avoid opening duplicate extension pages. If the tab already exists, focus it:

```ts
// background.ts
async function openSingletonTab(path: string): Promise<chrome.tabs.Tab> {
  const extensionUrl = chrome.runtime.getURL(path);

  // Find any existing tab with this URL
  const [existing] = await chrome.tabs.query({ url: extensionUrl });

  if (existing?.id) {
    // Focus the existing tab and its window
    await chrome.tabs.update(existing.id, { active: true });
    if (existing.windowId) {
      await chrome.windows.update(existing.windowId, { focused: true });
    }
    return existing;
  }

  // No existing tab — create one
  return chrome.tabs.create({ url: extensionUrl });
}

// Usage
chrome.action.onClicked.addListener(() => {
  openSingletonTab("dashboard.html");
});
```

For URLs outside your extension, match by URL prefix:

```ts
async function openOrFocusUrl(targetUrl: string): Promise<chrome.tabs.Tab> {
  const url = new URL(targetUrl);
  const matchPattern = `${url.origin}${url.pathname}*`;

  const tabs = await chrome.tabs.query({ url: matchPattern });

  if (tabs.length > 0 && tabs[0].id) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    if (tabs[0].windowId) {
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    }
    return tabs[0];
  }

  return chrome.tabs.create({ url: targetUrl });
}
```

---

## Pattern 2: Tab Groups — Create, Color, Collapse

Organize related tabs into color-coded, collapsible groups:

```ts
// background.ts
interface GroupOptions {
  title: string;
  color: chrome.tabGroups.ColorEnum;
  collapsed?: boolean;
  tabIds: number[];
}

async function createTabGroup(options: GroupOptions): Promise<number> {
  const groupId = await chrome.tabs.group({ tabIds: options.tabIds });

  await chrome.tabGroups.update(groupId, {
    title: options.title,
    color: options.color,
    collapsed: options.collapsed ?? false,
  });

  return groupId;
}

// Group all tabs from the same domain
async function groupTabsByDomain(): Promise<void> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const domainMap = new Map<string, number[]>();

  for (const tab of tabs) {
    if (!tab.url || !tab.id) continue;
    try {
      const { hostname } = new URL(tab.url);
      const domain = hostname.replace(/^www\./, "");
      const ids = domainMap.get(domain) ?? [];
      ids.push(tab.id);
      domainMap.set(domain, ids);
    } catch {
      // Skip invalid URLs (chrome://, etc.)
    }
  }

  const colors: chrome.tabGroups.ColorEnum[] = [
    "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange",
  ];

  let colorIndex = 0;
  for (const [domain, tabIds] of domainMap) {
    if (tabIds.length < 2) continue; // Only group 2+ tabs
    await createTabGroup({
      title: domain,
      color: colors[colorIndex % colors.length],
      tabIds,
    });
    colorIndex++;
  }
}
```

Monitor group changes:

```ts
chrome.tabGroups.onUpdated.addListener((group) => {
  console.log(`Group "${group.title}" is now ${group.collapsed ? "collapsed" : "expanded"}`);
});

chrome.tabGroups.onCreated.addListener((group) => {
  console.log(`New group created: ${group.id}`);
});

chrome.tabGroups.onRemoved.addListener((group) => {
  console.log(`Group removed: ${group.id}`);
});
```

---

## Pattern 3: Tab Lifecycle Tracking

Build a complete picture of tab activity using created/updated/removed events:

```ts
// background.ts
interface TabRecord {
  id: number;
  url: string;
  title: string;
  createdAt: number;
  lastAccessed: number;
  navigations: number;
  status: "loading" | "complete" | "unloaded";
}

const tabRegistry = new Map<number, TabRecord>();

chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.id) return;
  tabRegistry.set(tab.id, {
    id: tab.id,
    url: tab.pendingUrl ?? tab.url ?? "",
    title: tab.title ?? "",
    createdAt: Date.now(),
    lastAccessed: Date.now(),
    navigations: 0,
    status: "loading",
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const record = tabRegistry.get(tabId);
  if (!record) return;

  if (changeInfo.url) {
    record.url = changeInfo.url;
    record.navigations++;
  }
  if (changeInfo.title) {
    record.title = changeInfo.title;
  }
  if (changeInfo.status) {
    record.status = changeInfo.status as TabRecord["status"];
  }
  record.lastAccessed = Date.now();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  const record = tabRegistry.get(tabId);
  if (record) {
    record.lastAccessed = Date.now();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const record = tabRegistry.get(tabId);
  if (record) {
    // Persist or log before removing
    console.log(`Tab closed after ${Date.now() - record.createdAt}ms, ${record.navigations} navigations`);
    tabRegistry.delete(tabId);
  }
});

// Initialize registry with existing tabs on service worker startup
async function initializeRegistry(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.id) continue;
    tabRegistry.set(tab.id, {
      id: tab.id,
      url: tab.url ?? "",
      title: tab.title ?? "",
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      navigations: 0,
      status: (tab.status as TabRecord["status"]) ?? "complete",
    });
  }
}

initializeRegistry();
```

---

## Pattern 4: Batch Tab Operations

Close duplicates, sort tabs by URL, and move tabs between windows:

```ts
// background.ts

// Close duplicate tabs — keep the earliest instance
async function closeDuplicateTabs(): Promise<number> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const seen = new Map<string, number>();
  const duplicateIds: number[] = [];

  for (const tab of tabs) {
    if (!tab.url || !tab.id) continue;
    // Normalize by stripping fragments
    const normalized = tab.url.split("#")[0];
    if (seen.has(normalized)) {
      duplicateIds.push(tab.id);
    } else {
      seen.set(normalized, tab.id);
    }
  }

  if (duplicateIds.length > 0) {
    await chrome.tabs.remove(duplicateIds);
  }
  return duplicateIds.length;
}

// Sort tabs by domain, then path
async function sortTabsByUrl(): Promise<void> {
  const tabs = await chrome.tabs.query({ currentWindow: true, pinned: false });

  const sorted = [...tabs].sort((a, b) => {
    const urlA = a.url ?? "";
    const urlB = b.url ?? "";
    return urlA.localeCompare(urlB);
  });

  // Move tabs one at a time to their sorted position
  for (let i = 0; i < sorted.length; i++) {
    const tab = sorted[i];
    if (tab.id) {
      await chrome.tabs.move(tab.id, { index: i });
    }
  }
}

// Move selected tabs to a new window
async function moveTabsToNewWindow(tabIds: number[]): Promise<chrome.windows.Window> {
  if (tabIds.length === 0) throw new Error("No tabs to move");

  // Create window with the first tab
  const [firstId, ...restIds] = tabIds;
  const newWindow = await chrome.windows.create({ tabId: firstId });

  // Move remaining tabs into the new window
  if (restIds.length > 0 && newWindow.id) {
    await chrome.tabs.move(restIds, {
      windowId: newWindow.id,
      index: -1, // Append at end
    });
  }

  return newWindow;
}

// Close all tabs older than a threshold
async function closeOldTabs(maxAgeMs: number): Promise<number> {
  const now = Date.now();
  const staleIds: number[] = [];

  for (const [tabId, record] of tabRegistry) {
    if (now - record.lastAccessed > maxAgeMs) {
      staleIds.push(tabId);
    }
  }

  if (staleIds.length > 0) {
    await chrome.tabs.remove(staleIds);
  }
  return staleIds.length;
}
```

---

## Pattern 5: Tab State Machine

Model tab status transitions explicitly to avoid race conditions:

```ts
// background.ts
type TabState = "created" | "loading" | "complete" | "error" | "frozen" | "discarded";

interface TabStateMachine {
  tabId: number;
  state: TabState;
  transitions: Array<{ from: TabState; to: TabState; at: number }>;
}

const stateMachines = new Map<number, TabStateMachine>();

const VALID_TRANSITIONS: Record<TabState, TabState[]> = {
  created:   ["loading"],
  loading:   ["complete", "error", "loading"], // loading -> loading for redirects
  complete:  ["loading", "frozen", "discarded"],
  error:     ["loading"],
  frozen:    ["loading", "discarded"],
  discarded: ["loading"],
};

function transition(tabId: number, to: TabState): boolean {
  const machine = stateMachines.get(tabId);
  if (!machine) return false;

  const allowed = VALID_TRANSITIONS[machine.state];
  if (!allowed.includes(to)) {
    console.warn(`Invalid transition: ${machine.state} -> ${to} for tab ${tabId}`);
    return false;
  }

  machine.transitions.push({
    from: machine.state,
    to,
    at: Date.now(),
  });
  machine.state = to;
  return true;
}

// Wire up Chrome events to the state machine
chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.id) return;
  stateMachines.set(tab.id, {
    tabId: tab.id,
    state: "created",
    transitions: [],
  });
  transition(tab.id, "loading");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    transition(tabId, "loading");
  } else if (changeInfo.status === "complete") {
    transition(tabId, "complete");
  }

  if (changeInfo.discarded) {
    transition(tabId, "discarded");
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  stateMachines.delete(tabId);
});

// Query tabs in a specific state
function getTabsInState(state: TabState): number[] {
  const result: number[] = [];
  for (const [tabId, machine] of stateMachines) {
    if (machine.state === state) {
      result.push(tabId);
    }
  }
  return result;
}
```

---

## Pattern 6: Pinned Tab Management

Enforce pinned tabs for important pages and protect them from accidental closure:

```ts
// background.ts
const PINNED_URLS = [
  "https://mail.google.com/*",
  "https://calendar.google.com/*",
];

// Auto-pin tabs matching certain URL patterns
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url || tab.pinned) return;

  const shouldPin = PINNED_URLS.some((pattern) => {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, "\\?") + "$"
    );
    return regex.test(changeInfo.url!);
  });

  if (shouldPin) {
    await chrome.tabs.update(tabId, { pinned: true });
  }
});

// Restore pinned tabs on browser startup
chrome.runtime.onStartup.addListener(async () => {
  const { pinnedUrls = [] } = await chrome.storage.local.get("pinnedUrls");

  for (const url of pinnedUrls as string[]) {
    // Check if already open
    const [existing] = await chrome.tabs.query({ url });
    if (!existing) {
      await chrome.tabs.create({ url, pinned: true });
    }
  }
});

// Persist pinned tab URLs when they change
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.pinned === undefined) return;
  await savePinnedTabUrls();
});

chrome.tabs.onRemoved.addListener(async () => {
  await savePinnedTabUrls();
});

async function savePinnedTabUrls(): Promise<void> {
  const pinnedTabs = await chrome.tabs.query({ pinned: true });
  const pinnedUrls = pinnedTabs
    .map((t) => t.url)
    .filter((url): url is string => url !== undefined);
  await chrome.storage.local.set({ pinnedUrls });
}
```

---

## Pattern 7: Tab-Specific Badge and Title Updates

Show per-tab counters and dynamic titles on the extension action icon:

```ts
// background.ts
interface TabBadgeState {
  count: number;
  color: string;
  title: string;
}

const badgeStates = new Map<number, TabBadgeState>();

async function updateTabBadge(tabId: number, state: Partial<TabBadgeState>): Promise<void> {
  const current = badgeStates.get(tabId) ?? { count: 0, color: "#4688F1", title: "" };
  const merged = { ...current, ...state };
  badgeStates.set(tabId, merged);

  // Badge text — empty string hides the badge
  const text = merged.count > 0 ? String(merged.count) : "";
  await chrome.action.setBadgeText({ text, tabId });

  // Badge color
  await chrome.action.setBadgeBackgroundColor({
    color: merged.color,
    tabId,
  });

  // Tooltip title
  if (merged.title) {
    await chrome.action.setTitle({ title: merged.title, tabId });
  }
}

// Example: count blocked requests per tab
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
  const tabId = info.request.tabId;
  if (tabId < 0) return;

  const current = badgeStates.get(tabId);
  const count = (current?.count ?? 0) + 1;

  updateTabBadge(tabId, {
    count,
    color: count > 10 ? "#E53935" : "#4688F1",
    title: `${count} requests blocked`,
  });
});

// Clear badge when tab navigates to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    updateTabBadge(tabId, { count: 0, title: "" });
  }
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  badgeStates.delete(tabId);
});
```

For dynamic icons per tab, use `chrome.action.setIcon`:

```ts
async function setTabIcon(tabId: number, variant: "active" | "inactive" | "error"): Promise<void> {
  const iconPaths: Record<string, Record<string, string>> = {
    active:   { "16": "icons/active-16.png", "32": "icons/active-32.png" },
    inactive: { "16": "icons/inactive-16.png", "32": "icons/inactive-32.png" },
    error:    { "16": "icons/error-16.png", "32": "icons/error-32.png" },
  };

  await chrome.action.setIcon({ path: iconPaths[variant], tabId });
}
```

---

## Pattern 8: Window and Tab Relationship Management

Track which tabs belong to which windows and handle cross-window operations:

```ts
// background.ts
class WindowManager {
  private windowTabs = new Map<number, Set<number>>();

  constructor() {
    this.init();
    this.attachListeners();
  }

  private async init(): Promise<void> {
    const windows = await chrome.windows.getAll({ populate: true });
    for (const win of windows) {
      if (!win.id) continue;
      const tabIds = new Set(
        (win.tabs ?? []).map((t) => t.id).filter((id): id is number => id !== undefined)
      );
      this.windowTabs.set(win.id, tabIds);
    }
  }

  private attachListeners(): void {
    chrome.tabs.onCreated.addListener((tab) => {
      if (!tab.id || !tab.windowId) return;
      this.getOrCreateSet(tab.windowId).add(tab.id);
    });

    chrome.tabs.onRemoved.addListener((tabId, { windowId }) => {
      this.windowTabs.get(windowId)?.delete(tabId);
    });

    chrome.tabs.onAttached.addListener((tabId, { newWindowId }) => {
      this.getOrCreateSet(newWindowId).add(tabId);
    });

    chrome.tabs.onDetached.addListener((tabId, { oldWindowId }) => {
      this.windowTabs.get(oldWindowId)?.delete(tabId);
    });

    chrome.windows.onRemoved.addListener((windowId) => {
      this.windowTabs.delete(windowId);
    });
  }

  private getOrCreateSet(windowId: number): Set<number> {
    let set = this.windowTabs.get(windowId);
    if (!set) {
      set = new Set();
      this.windowTabs.set(windowId, set);
    }
    return set;
  }

  getTabCount(windowId: number): number {
    return this.windowTabs.get(windowId)?.size ?? 0;
  }

  getWindowForTab(tabId: number): number | undefined {
    for (const [windowId, tabs] of this.windowTabs) {
      if (tabs.has(tabId)) return windowId;
    }
    return undefined;
  }

  async mergeWindows(targetWindowId: number): Promise<void> {
    for (const [windowId, tabIds] of this.windowTabs) {
      if (windowId === targetWindowId) continue;
      const ids = [...tabIds];
      if (ids.length > 0) {
        await chrome.tabs.move(ids, { windowId: targetWindowId, index: -1 });
      }
    }
  }

  async splitTabToWindow(tabId: number): Promise<chrome.windows.Window> {
    return chrome.windows.create({ tabId });
  }
}

const windowManager = new WindowManager();
```

Detect when tabs are dragged between windows:

```ts
chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  console.log(`Tab ${tabId} detached from window ${detachInfo.oldWindowId}`);
});

chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  console.log(`Tab ${tabId} attached to window ${attachInfo.newWindowId} at index ${attachInfo.newPosition}`);
});
```

---

## Summary

| Pattern | Use Case |
|---------|----------|
| Singleton tabs | Prevent duplicate extension pages |
| Tab groups | Organize tabs by domain, project, or topic |
| Lifecycle tracking | Monitor tab creation, navigation, and closure |
| Batch operations | Deduplicate, sort, and move tabs in bulk |
| State machine | Model tab status transitions without race conditions |
| Pinned tab management | Auto-pin important pages and restore on startup |
| Per-tab badges | Show counters, colors, and titles per tab |
| Window-tab relationships | Track cross-window tab movement and merging |

Tab management is the foundation of power-user extensions. Combine these patterns with `@theluckystrike/webext-patterns` for reusable utilities, and always initialize your registries on service worker startup to survive restarts.
