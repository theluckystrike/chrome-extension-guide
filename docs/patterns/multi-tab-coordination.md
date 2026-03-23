---
layout: default
title: "Chrome Extension Multi Tab Coordination — Best Practices"
description: "Coordinate actions across multiple tabs with patterns for tab groups, sessions, and shared state."
canonical_url: "https://bestchromeextensions.com/patterns/multi-tab-coordination/"
---

# Multi-Tab Coordination Patterns

## Overview {#overview}

Coordinating behavior across multiple tabs is a common extension pattern. The background service worker acts as the central coordinator, broadcasting events, managing shared state, and ensuring consistency. This guide covers production patterns for tab coordination.

> **Permissions**: Requires `"tabs"` permission. Storage sync uses `"storage"`.

---

## Pattern 1: Broadcast to All Tabs {#pattern-1-broadcast-to-all-tabs}

The background script can send messages to all extension tabs:

```ts
// background.ts
async function broadcastToAllTabs(message: object): Promise<void> {
  const tabs = await chrome.tabs.query({});
  
  await Promise.all(
    tabs
      .filter(tab => tab.id && !tab.incognito)
      .map(tab => chrome.tabs.sendMessage(tab.id!, message))
  );
}

// Notify all tabs when extension state changes
export function broadcastStateUpdate(state: AppState): void {
  broadcastToAllTabs({ type: "STATE_UPDATE", payload: state });
}
```

---

## Pattern 2: Selective Broadcast by URL Pattern {#pattern-2-selective-broadcast-by-url-pattern}

Filter tabs by URL before broadcasting:

```ts
async function broadcastByPattern(pattern: string, message: object): Promise<void> {
  const tabs = await chrome.tabs.query({ url: pattern });
  
  await Promise.all(
    tabs.map(tab => tab.id && chrome.tabs.sendMessage(tab.id, message))
  );
}

// Example: Notify only tabs on example.com
broadcastByPattern("*://*.example.com/*", { type: "REFRESH_DATA" });
```

---

## Pattern 3: Tab-Specific State with tabId Keys {#pattern-3-tab-specific-state-with-tabid-keys}

Store per-tab state using `tabId` as the key:

```ts
// background.ts
const tabState = new Map<number, TabContext>();

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id) {
    tabState.set(tab.id, { initialized: false, data: null });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabState.delete(tabId);
});

function getTabContext(tabId: number): TabContext | undefined {
  return tabState.get(tabId);
}
```

---

## Pattern 4: Leader Election for Exclusive Operations {#pattern-4-leader-election-for-exclusive-operations}

Ensure only one tab performs an exclusive operation:

```ts
// background.ts
let currentLeaderTabId: number | null = null;

async function electLeader(tabId: number): Promise<boolean> {
  if (currentLeaderTabId === null) {
    currentLeaderTabId = tabId;
    chrome.tabs.sendMessage(tabId, { type: "YOU_ARE_LEADER" });
    return true;
  }
  
  chrome.tabs.sendMessage(tabId, { type: "ELECTION_FAILED", leader: currentLeaderTabId });
  return false;
}

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentLeaderTabId) {
    currentLeaderTabId = null; // Re-election needed
  }
});
```

---

## Pattern 5: Cross-Tab State Synchronization {#pattern-5-cross-tab-state-synchronization}

Use `storage.onChanged` to sync state across all contexts:

```ts
// background.ts
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" && area !== "local") return;
  
  const stateChange = changes["appState"];
  if (!stateChange) return;
  
  broadcastToAllTabs({
    type: "STORAGE_SYNC",
    oldValue: stateChange.oldValue,
    newValue: stateChange.newValue
  });
});
```

---

## Pattern 6: Tab Counting & Duplicate Detection {#pattern-6-tab-counting-duplicate-detection}

Track tabs per domain and detect duplicates:

```ts
async function getTabCountByDomain(): Promise<Map<string, number>> {
  const tabs = await chrome.tabs.query({});
  const counts = new Map<string, number>();
  
  for (const tab of tabs) {
    if (!tab.url) continue;
    try {
      const domain = new URL(tab.url).hostname;
      counts.set(domain, (counts.get(domain) || 0) + 1);
    } catch {}
  }
  
  return counts;
}

async function hasDuplicate(url: string): Promise<boolean> {
  const tabs = await chrome.tabs.query({ url: `${new URL(url).origin}*` });
  return tabs.length > 1;
}
```

---

## Pattern 7: Focus Management {#pattern-7-focus-management}

Coordinate tab focus across the extension:

```ts
async function focusTabByUrl(pattern: string): Promise<void> {
  const [tab] = await chrome.tabs.query({ url: pattern, active: true });
  
  if (tab?.id) {
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
  }
}
```

---

## Related Patterns {#related-patterns}

- [Tabs API](../api-reference/tabs-api.md) - Full tabs API reference
- [Tab Management](./tab-management.md) - Basic tab operations
- [Cross-Context State](./cross-context-state.md) - State sharing patterns
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
