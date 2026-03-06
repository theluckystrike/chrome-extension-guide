# Sessions API Patterns

## Overview

The Chrome Sessions API (`chrome.sessions`) provides powerful capabilities for tracking, retrieving, and restoring browser sessions. This guide covers eight production-ready patterns for building session management features in your extension.

---

## Required Permissions

```jsonc
// manifest.json
{
  "permissions": ["sessions", "tabs"],
  "permissions": ["sessions", "tabs", "storage"],
  "permissions": ["sessions", "tabs", "tabGroups"]
}
```

---

## Pattern 1: Retrieving Recently Closed Tabs

The `chrome.sessions.getRecentlyClosed()` method retrieves recently closed tabs and windows:

```ts
// services/session-service.ts
export async function getRecentlyClosed(
  maxResults: number = 25
): Promise<chrome.sessions.Session[]> {
  return new Promise((resolve, reject) => {
    chrome.sessions.getRecentlyClosed({ maxResults }, (sessions) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(sessions);
      }
    });
  });
}

export async function getRecentlyClosedTabs(maxResults: number = 25) {
  const sessions = await getRecentlyClosed(maxResults);
  return sessions.filter((s): s is chrome.sessions.Session => "url" in s);
}

export async function getRecentlyClosedWindows(maxResults: number = 25) {
  const sessions = await getRecentlyClosed(maxResults);
  return sessions.filter((s): s is chrome.sessions.SessionGroup => "tabs" in s);
}
```

---

## Pattern 2: Restoring Individual Tabs and Windows

Use `chrome.sessions.restore()` to bring back sessions:

```ts
// services/session-restore.ts
export async function restoreTab(sessionId: string): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve, reject) => {
    chrome.sessions.restore(sessionId, (restored) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(restored as unknown as chrome.tabs.Tab);
      }
    });
  });
}

export async function restoreTabAndFocus(sessionId: string): Promise<chrome.tabs.Tab | null> {
  const tab = await restoreTab(sessionId);
  if (tab?.id) {
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId!, { focused: true });
  }
  return tab;
}

export async function restoreWindow(sessionId: string): Promise<chrome.windows.Window> {
  return new Promise((resolve, reject) => {
    chrome.sessions.restore(sessionId, (restored) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (restored.window) {
        resolve(restored.window);
      } else {
        reject(new Error("No window in restored session"));
      }
    });
  });
}
```

---

## Pattern 3: Filtering Sessions by Time Range and Type

```ts
// services/session-filter.ts
export interface TimeRange {
  startTime: number;
  endTime: number;
}

export async function filterSessions(
  options: {
    type?: "tab" | "window";
    timeRange?: TimeRange;
    maxResults?: number;
  } = {}
): Promise<chrome.sessions.Session[]> {
  const sessions = await getRecentlyClosed(options.maxResults || 100);

  return sessions.filter((session) => {
    if (options.type === "tab" && !("url" in session)) return false;
    if (options.type === "window" && !("tabs" in session)) return false;
    if (options.timeRange) {
      const time = session.lastAccessTime || 0;
      return time >= options.timeRange.startTime && time <= options.timeRange.endTime;
    }
    return true;
  });
}

export function createRecentTimeRange(minutes: number): TimeRange {
  const now = Date.now();
  return { startTime: now - minutes * 60 * 1000, endTime: now };
}
```

---

## Pattern 4: Building a "Recently Closed" Popup UI

Full popup implementation with one-click restore:

```html
<!-- popup.html -->
<div class="popup-container">
  <header>
    <h1>Recently Closed</h1>
    <select id="filter-type">
      <option value="all">All</option>
      <option value="tab">Tabs</option>
      <option value="window">Windows</option>
    </select>
  </header>
  <div id="sessions-list"></div>
  <template id="session-item-template">
    <div class="session-item" data-session-id="">
      <img class="favicon" hidden>
      <div class="session-info">
        <div class="session-title"></div>
        <div class="session-url"></div>
      </div>
      <button class="restore-btn">Restore</button>
    </div>
  </template>
</div>
```

```ts
// popup.ts
import { filterSessions, createRecentTimeRange } from "./services/session-filter";
import { restoreTab } from "./services/session-restore";

const state = { sessions: [] as chrome.sessions.Session[] };

async function loadSessions() {
  const typeFilter = (document.getElementById("filter-type") as HTMLSelectElement).value;
  state.sessions = await filterSessions({
    type: typeFilter === "all" ? undefined : typeFilter as "tab" | "window",
    timeRange: createRecentTimeRange(60),
    maxResults: 25,
  });
  renderSessions();
}

function renderSessions() {
  const list = document.getElementById("sessions-list")!;
  const template = document.getElementById("session-item-template") as HTMLTemplateElement;
  list.innerHTML = "";

  for (const session of state.sessions) {
    const clone = template.content.cloneNode(true) as HTMLElement;
    const item = clone.querySelector(".session-item")!;
    item.querySelector(".session-title")!.textContent = session.title || "Untitled";
    item.querySelector(".session-url")!.textContent = session.url ? new URL(session.url).hostname : "";
    item.querySelector(".restore-btn")!.onclick = async () => {
      await restoreTab(session.sessionId);
      item.remove();
    };
    list.appendChild(clone);
  }
}

document.addEventListener("DOMContentLoaded", loadSessions);
```

---

## Pattern 5: Session Search and Filtering

```ts
// services/session-search.ts
export async function searchSessions(query: {
  text?: string;
  domain?: string;
  urlPattern?: string;
}): Promise<chrome.sessions.Session[]> {
  const sessions = await getRecentlyClosed(100);

  return sessions.filter((session) => {
    const url = session.url || "";
    const title = session.title || "";

    if (query.text) {
      const q = query.text.toLowerCase();
      if (!url.toLowerCase().includes(q) && !title.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (query.domain) {
      try {
        if (!new URL(url).hostname.toLowerCase().includes(query.domain.toLowerCase())) {
          return false;
        }
      } catch {
        return false;
      }
    }

    if (query.urlPattern) {
      try {
        if (!new RegExp(query.urlPattern).test(url)) return false;
      } catch {}
    }

    return true;
  });
}

// Usage
const results = await searchSessions({ text: "github", domain: "github.com" });
```

---

## Pattern 6: Batch Restore

Restore all tabs from a closed window:

```ts
// services/batch-restore.ts
export async function restoreWindowTabs(sessionId: string): Promise<number> {
  await chrome.sessions.restore(sessionId);
  return 1; // Window restored
}

export async function restoreMultipleSessions(
  sessionIds: string[]
): Promise<{ success: number; failed: number }> {
  let success = 0, failed = 0;

  for (const id of sessionIds) {
    try {
      await restoreWindowTabs(id);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

// Custom batch: open tabs in current window
export async function restoreTabsToCurrentWindow(sessionId: string): Promise<number> {
  const sessions = await getRecentlyClosed(100);
  const windowSession = sessions.find(
    (s) => s.sessionId === sessionId && "tabs" in s
  ) as chrome.sessions.SessionGroup | undefined;

  if (!windowSession) throw new Error("Session not found");

  const currentWindow = await chrome.windows.getCurrent();
  let count = 0;

  for (const tab of windowSession.tabs) {
    await chrome.tabs.create({ url: tab.url, windowId: currentWindow.id });
    count++;
  }

  return count;
}
```

---

## Pattern 7: Persisting Session Snapshots

Using `@theluckystrike/webext-storage` for cross-restart recovery:

```ts
// storage/session-storage.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const sessionSchema = defineSchema({
  snapshots: [] as Array<{
    id: string;
    name: string;
    createdAt: number;
    tabs: Array<{ url: string; title: string; faviconUrl?: string }>;
  }>,
  maxSnapshots: 10 as number,
});

const sessionStorage = createStorage({ schema: sessionSchema, area: "local" });

export async function saveSessionSnapshot(
  name: string,
  tabs?: chrome.tabs.Tab[]
): Promise<string> {
  if (!tabs) {
    const win = await chrome.windows.getCurrent();
    tabs = await chrome.tabs.query({ windowId: win.id });
  }

  const snapshot = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    tabs: tabs
      .filter((t) => t.url && !t.url.startsWith("chrome://"))
      .map((t) => ({ url: t.url!, title: t.title || "", faviconUrl: t.favIconUrl })),
  };

  const snapshots = await sessionStorage.get("snapshots");
  const max = await sessionStorage.get("maxSnapshots");
  await sessionStorage.set("snapshots", [snapshot, ...snapshots].slice(0, max));

  return snapshot.id;
}

export async function restoreSessionSnapshot(snapshotId: string): Promise<number> {
  const snapshots = await sessionStorage.get("snapshots");
  const snapshot = snapshots.find((s) => s.id === snapshotId);

  if (!snapshot) throw new Error("Snapshot not found");

  for (const tab of snapshot.tabs) {
    await chrome.tabs.create({ url: tab.url });
  }

  return snapshot.tabs.length;
}

export async function getSessionSnapshots() {
  return sessionStorage.get("snapshots");
}

export async function deleteSessionSnapshot(id: string): Promise<void> {
  const snapshots = await sessionStorage.get("snapshots");
  await sessionStorage.set("snapshots", snapshots.filter((s) => s.id !== id));
}
```

---

## Pattern 8: Combining Sessions API with Tab Groups

Workspace restoration using tab groups (Chrome 120+):

```ts
// services/workspace-restore.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const workspaceSchema = defineSchema({
  workspaces: [] as Array<{
    id: string;
    name: string;
    createdAt: number;
    groupId?: number;
    tabIds: number[];
    color?: string;
  }>,
});

const workspaceStorage = createStorage({ schema: workspaceSchema, area: "local" });

export async function createWorkspace(name: string, color?: string) {
  const win = await chrome.windows.getCurrent();
  const tabs = await chrome.tabs.query({ windowId: win.id });
  const grouped = tabs.filter((t) => t.groupId >= 0);

  const workspace = {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
    groupId: grouped[0]?.groupId,
    tabIds: tabs.map((t) => t.id!).filter((id) => id >= 0),
    color,
  };

  const workspaces = await workspaceStorage.get("workspaces");
  await workspaceStorage.set("workspaces", [workspace, ...workspaces]);
  return workspace;
}

export async function restoreWorkspace(
  workspaceId: string,
  options: { useGroups?: boolean } = {}
): Promise<number> {
  const workspaces = await workspaceStorage.get("workspaces");
  const ws = workspaces.find((w) => w.id === workspaceId);

  if (!ws) throw new Error("Workspace not found");

  // Get URLs from storage (tab IDs aren't persistent)
  const tabUrls = await getWorkspaceTabUrls(workspaceId);
  const tabIds: number[] = [];

  for (const { url } of tabUrls) {
    const tab = await chrome.tabs.create({ url });
    tabIds.push(tab.id!);
  }

  if (options.useGroups && tabIds.length > 0) {
    try {
      const groupId = await chrome.tabs.group({ tabIds });
      if (ws.color) {
        await chrome.tabGroups.update(groupId, { color: ws.color as chrome.tabGroups.ColorEnum });
      }
    } catch {}
  }

  return tabIds.length;
}

// Store tab URLs separately (since tab IDs aren't persistent)
const workspaceTabsStorage = createStorage({
  schema: defineSchema({ tabs: {} as Record<string, Array<{ url: string; title: string }>> }),
  area: "local",
});

export async function saveWorkspaceTabs(
  workspaceId: string,
  tabs: Array<{ url: string; title: string }>
): Promise<void> {
  const all = await workspaceTabsStorage.get("tabs");
  all[workspaceId] = tabs;
  await workspaceTabsStorage.set("tabs", all);
}

export async function getWorkspaceTabUrls(
  workspaceId: string
): Promise<Array<{ url: string; title: string }>> {
  const all = await workspaceTabsStorage.get("tabs");
  return all[workspaceId] || [];
}

export async function listWorkspaces() {
  return workspaceStorage.get("workspaces");
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const workspaces = await workspaceStorage.get("workspaces");
  await workspaceStorage.set("workspaces", workspaces.filter((w) => w.id !== workspaceId));

  const all = await workspaceTabsStorage.get("tabs");
  delete all[workspaceId];
  await workspaceTabsStorage.set("tabs", all);
}
```

---

## Summary Table

| Pattern | Use Case | Key APIs | Storage |
|---------|----------|----------|---------|
| **1: Get Recently Closed** | Fetch last N closed tabs/windows | `chrome.sessions.getRecentlyClosed()` | None |
| **2: Restore Tab/Window** | Bring back a session | `chrome.sessions.restore()` | None |
| **3: Filter by Time/Type** | Show only tabs/windows from a time range | Filtering logic | None |
| **4: Popup UI** | One-click restore from popup | All above + UI | Optional |
| **5: Search** | Find sessions by URL/title | Regex/domain filtering | Optional |
| **6: Batch Restore** | Restore all tabs from a closed window | Loop `chrome.tabs.create()` | None |
| **7: Storage Snapshots** | Cross-restart persistence | `@theluckystrike/webext-storage` | `chrome.storage.local` |
| **8: Tab Groups + Sessions** | Workspace restoration | `chrome.tabGroups` | `chrome.storage.local` |

### Key Takeaways

1. **Session IDs are temporary**: They expire after a short period. For permanent storage, save URLs to `chrome.storage` (Pattern 7).

2. **Window vs Tab**: `getRecentlyClosed()` returns both. Windows have a `tabs` array; tabs have a direct `url` property.

3. **Error handling**: Always wrap `chrome.sessions.restore()` in try/catch—sessions may expire or URLs may become invalid.

4. **Storage integration**: Use `@theluckystrike/webext-storage` for type-safe session snapshots that survive browser restarts.

5. **Message passing**: For complex UIs, use `@theluckystrike/webext-messaging` to communicate between popup, background, and content scripts.
