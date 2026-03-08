---
layout: default
title: "Chrome Extension Sessions Api — Best Practices"
description: "Use the Sessions API to track browser sessions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/sessions-api/"
---

# Chrome Extension Sessions API Patterns

## Overview {#overview}

The Chrome Sessions API (`chrome.sessions`) enables tracking, retrieving, and restoring browser sessions. This guide covers eight production-ready patterns.

---

## Required Permissions {#required-permissions}

```json
{ "permissions": ["sessions", "tabs"], "optional_permissions": ["tabGroups", "storage"] }
```

---

## Pattern 1: Retrieving Recently Closed Tabs {#pattern-1-retrieving-recently-closed-tabs}

Use `chrome.sessions.getRecentlyClosed()` to fetch recently closed tabs and windows:

```typescript
// services/session-service.ts
export interface SessionItem {
  lastModified: number;
  tab?: chrome.tabs.Tab;
  window?: chrome.windows.Window;
}

export async function getRecentlyClosed(maxResults = 25): Promise<SessionItem[]> {
  return new Promise((resolve, reject) => {
    chrome.sessions.getRecentlyClosed({ maxResults }, (sessions) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(sessions as SessionItem[]);
    });
  });
}

export async function getRecentlyClosedTabs(maxResults = 25): Promise<SessionItem[]> {
  const sessions = await getRecentlyClosed(maxResults);
  return sessions.filter((s) => s.tab !== undefined);
}

export async function getRecentlyClosedWindows(maxResults = 25): Promise<SessionItem[]> {
  const sessions = await getRecentlyClosed(maxResults);
  return sessions.filter((s) => s.window !== undefined);
}
```

---

## Pattern 2: Restoring Individual Tabs and Windows {#pattern-2-restoring-individual-tabs-and-windows}

Use `chrome.sessions.restore()` to bring back closed sessions:

```typescript
// services/session-restore.ts
export async function restoreTab(sessionId: string): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve, reject) => {
    chrome.sessions.restore(sessionId, (restored) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(restored.tab || null);
    });
  });
}

export async function restoreTabAndFocus(sessionId: string): Promise<chrome.tabs.Tab | null> {
  const tab = await restoreTab(sessionId);
  if (tab?.id) {
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  }
  return tab;
}

export async function restoreWindow(sessionId: string): Promise<chrome.windows.Window> {
  return new Promise((resolve, reject) => {
    chrome.sessions.restore(sessionId, (restored) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (restored.window) resolve(restored.window);
      else reject(new Error('No window in restored session'));
    });
  });
}
```

---

## Pattern 3: Filtering Sessions by Time Range and Type {#pattern-3-filtering-sessions-by-time-range-and-type}

```typescript
// services/session-filter.ts
export interface TimeRange { startTime: number; endTime: number; }

export function createRecentTimeRange(minutes: number): TimeRange {
  const now = Date.now();
  return { startTime: now - minutes * 60 * 1000, endTime: now };
}

export async function filterSessions(options: {
  type?: 'tab' | 'window';
  timeRange?: TimeRange;
  maxResults?: number;
}): Promise<SessionItem[]> {
  const { type, timeRange, maxResults = 100 } = options;
  const sessions = await getRecentlyClosed(maxResults);
  return sessions.filter((session) => {
    if (type === 'tab' && !session.tab) return false;
    if (type === 'window' && !session.window) return false;
    if (timeRange && session.lastModified) {
      const lastModifiedMs = session.lastModified * 1000; // API returns seconds since epoch
      return lastModifiedMs >= timeRange.startTime && lastModifiedMs <= timeRange.endTime;
    }
    return true;
  });
}
```

---

## Pattern 4: Building a "Recently Closed" Popup UI {#pattern-4-building-a-recently-closed-popup-ui}

```html
<!-- popup.html -->
<div class="popup-container">
  <header><h1>Recently Closed</h1>
    <select id="filter-type"><option value="all">All</option><option value="tab">Tabs</option><option value="window">Windows</option></select>
  </header>
  <div id="sessions-list"></div>
  <template id="session-item-template">
    <div class="session-item" data-session-id="">
      <img class="favicon"><div class="session-info"><div class="session-title"></div><div class="session-url"></div></div>
      <button class="restore-btn">↻</button>
    </div>
  </template>
</div>
```

```typescript
// popup.ts
import { filterSessions, createRecentTimeRange, SessionItem } from './services/session-filter';
import { restoreTabAndFocus } from './services/session-restore';

const state = { sessions: [] as SessionItem[] };

async function loadSessions() {
  const typeFilter = (document.getElementById('filter-type') as HTMLSelectElement).value;
  state.sessions = await filterSessions({
    type: typeFilter === 'all' ? undefined : typeFilter as 'tab' | 'window',
    timeRange: createRecentTimeRange(60), maxResults: 25,
  });
  renderSessions();
}

function renderSessions() {
  const list = document.getElementById('sessions-list')!;
  const template = document.getElementById('session-item-template') as HTMLTemplateElement;
  list.innerHTML = '';
  for (const session of state.sessions) {
    const clone = template.content.cloneNode(true) as HTMLElement;
    const item = clone.querySelector('.session-item')!;
    const tab = session.tab;
    const sessionId = tab?.sessionId || session.window?.sessionId || '';
    item.dataset.sessionId = sessionId;
    item.querySelector('.session-title')!.textContent = tab?.title || 'Window';
    item.querySelector('.session-url')!.textContent = tab?.url ? new URL(tab.url).hostname : '';
    const favicon = item.querySelector('.favicon') as HTMLImageElement;
    if (tab?.favIconUrl) { favicon.src = tab.favIconUrl; favicon.hidden = false; }
    else { favicon.hidden = true; }
    item.querySelector('.restore-btn')!.onclick = async () => { await restoreTabAndFocus(sessionId); item.remove(); };
    list.appendChild(clone);
  }
}
document.addEventListener('DOMContentLoaded', loadSessions);
```

---

## Pattern 5: Session Search and Filtering {#pattern-5-session-search-and-filtering}

```typescript
// services/session-search.ts
export interface SearchOptions { text?: string; domain?: string; urlPattern?: string; }

export async function searchSessions(options: SearchOptions, maxResults = 50): Promise<SessionItem[]> {
  const sessions = await getRecentlyClosed(maxResults);
  return sessions.filter((session) => {
    const tab = session.tab;
    const url = tab?.url || '';
    const title = tab?.title || (session.window ? 'Window' : '');
    if (options.text) {
      const q = options.text.toLowerCase();
      if (!url.toLowerCase().includes(q) && !title.toLowerCase().includes(q)) return false;
    }
    if (options.domain) {
      try { if (!new URL(url).hostname.toLowerCase().includes(options.domain.toLowerCase())) return false; }
      catch { return false; }
    }
    if (options.urlPattern) { try { if (!new RegExp(options.urlPattern).test(url)) return false; } catch {} }
    return true;
  });
}
```

---

## Pattern 6: Batch Restore {#pattern-6-batch-restore}

Restore all tabs from a closed window:

```typescript
// services/batch-restore.ts
import { getRecentlyClosed } from './session-service';
import { restoreTab, restoreWindow } from './session-restore';

export interface BatchRestoreResult { success: number; failed: number; }

export async function restoreMultipleSessions(sessionIds: string[]): Promise<BatchRestoreResult> {
  let success = 0, failed = 0;
  for (const id of sessionIds) {
    try { await restoreTab(id); success++; } catch { failed++; }
  }
  return { success, failed };
}

export async function restoreWindowTabs(sessionId: string): Promise<number> {
  const sessions = await getRecentlyClosed(100);
  const windowSession = sessions.find((s) => s.window?.sessionId === sessionId);
  if (!windowSession?.window?.tabs) throw new Error('Session not found');
  await restoreWindow(sessionId);
  return windowSession.window.tabs.length;
}

export async function restoreTabsToCurrentWindow(sessionId: string): Promise<number> {
  const sessions = await getRecentlyClosed(100);
  const windowSession = sessions.find((s) => s.window?.sessionId === sessionId);
  if (!windowSession?.window?.tabs) throw new Error('Session not found');
  const currentWindow = await chrome.windows.getCurrent();
  let count = 0;
  for (const tab of windowSession.window.tabs) {
    if (tab.url && !tab.url.startsWith('chrome://')) { await chrome.tabs.create({ url: tab.url, windowId: currentWindow.id }); count++; }
  }
  return count;
}
```

---

## Pattern 7: Persisting Session Snapshots {#pattern-7-persisting-session-snapshots}

Using `@theluckystrike/webext-storage` for cross-restart recovery:

```typescript
// storage/session-storage.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

export interface TabSnapshot { url: string; title: string; faviconUrl?: string; }
export interface SessionSnapshot { id: string; name: string; createdAt: number; tabs: TabSnapshot[]; }

const sessionSchema = defineSchema({
  snapshots: [] as SessionSnapshot[],
  maxSnapshots: 10 as number,
});

const sessionStorage = createStorage({ schema: sessionSchema, area: 'local' });

export async function saveSessionSnapshot(name: string): Promise<string> {
  const win = await chrome.windows.getCurrent();
  const tabs = await chrome.tabs.query({ windowId: win.id });
  const snapshot: SessionSnapshot = {
    id: crypto.randomUUID(), name, createdAt: Date.now(),
    tabs: tabs.filter((t) => t.url && !t.url.startsWith('chrome://')).map((t) => ({ url: t.url!, title: t.title || '', faviconUrl: t.favIconUrl })),
  };
  const snapshots = await sessionStorage.get('snapshots');
  const max = await sessionStorage.get('maxSnapshots');
  await sessionStorage.set('snapshots', [snapshot, ...snapshots].slice(0, max));
  return snapshot.id;
}

export async function restoreSessionSnapshot(snapshotId: string): Promise<number> {
  const snapshots = await sessionStorage.get('snapshots');
  const snapshot = snapshots.find((s) => s.id === snapshotId);
  if (!snapshot) throw new Error('Snapshot not found');
  for (const tab of snapshot.tabs) { await chrome.tabs.create({ url: tab.url }); }
  return snapshot.tabs.length;
}

export async function getSnapshots(): Promise<SessionSnapshot[]> { return sessionStorage.get('snapshots'); }
export async function deleteSnapshot(id: string): Promise<void> {
  const snapshots = await sessionStorage.get('snapshots');
  await sessionStorage.set('snapshots', snapshots.filter((s) => s.id !== id));
}
```

---

## Pattern 8: Combining Sessions API with Tab Groups {#pattern-8-combining-sessions-api-with-tab-groups}

Workspace restoration using tab groups (Chrome 120+):

```typescript
// storage/workspace-storage.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

export interface Workspace { id: string; name: string; createdAt: number; tabGroupId?: number; color?: string; tabUrls: string[]; }
const workspaceSchema = defineSchema({ workspaces: [] as Workspace[] });
const workspaceStorage = createStorage({ schema: workspaceSchema, area: 'local' });

// services/workspace-restore.ts
export async function createWorkspace(name: string): Promise<Workspace> {
  const win = await chrome.windows.getCurrent();
  const tabs = await chrome.tabs.query({ windowId: win.id });
  const grouped = tabs.filter((t) => t.groupId && t.groupId >= 0);
  let tabGroupId: number | undefined, color: string | undefined;
  if (grouped.length > 0) {
    tabGroupId = grouped[0].groupId;
    try { const group = await chrome.tabGroups.get(tabGroupId); color = group.color; } catch {}
  }
  const workspace: Workspace = {
    id: crypto.randomUUID(), name, createdAt: Date.now(), tabGroupId, color,
    tabUrls: tabs.filter((t) => t.url && !t.url.startsWith('chrome://')).map((t) => t.url!),
  };
  const workspaces = await workspaceStorage.get('workspaces');
  await workspaceStorage.set('workspaces', [workspace, ...workspaces]);
  return workspace;
}

export async function restoreWorkspace(workspaceId: string, options: { useGroups?: boolean } = {}): Promise<number> {
  const workspaces = await workspaceStorage.get('workspaces');
  const ws = workspaces.find((w) => w.id === workspaceId);
  if (!ws) throw new Error('Workspace not found');
  const tabIds: number[] = [];
  for (const url of ws.tabUrls) { const tab = await chrome.tabs.create({ url }); if (tab.id) tabIds.push(tab.id); }
  if (options.useGroups && tabIds.length > 0 && ws.color) {
    try { const groupId = await chrome.tabs.group({ tabIds }); await chrome.tabGroups.update(groupId, { color: ws.color as chrome.tabGroups.ColorEnum }); } catch {}
  }
  return tabIds.length;
}

export async function listWorkspaces(): Promise<Workspace[]> { return workspaceStorage.get('workspaces'); }
export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const workspaces = await workspaceStorage.get('workspaces');
  await workspaceStorage.set('workspaces', workspaces.filter((w) => w.id !== workspaceId));
}
```

---

## Summary Table {#summary-table}

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

### Key Takeaways {#key-takeaways}

1. **Session IDs are temporary**: They expire after a short period. For permanent storage, save URLs to `chrome.storage` (Pattern 7).
2. **Window vs Tab**: `getRecentlyClosed()` returns `Session` objects with either a `tab` or `window` property set. Access `session.tab.url` for tab sessions or `session.window.tabs` for window sessions.
3. **Error handling**: Always wrap `chrome.sessions.restore()` in try/catch—sessions may expire or URLs may become invalid.
4. **Storage integration**: Use `@theluckystrike/webext-storage` for type-safe session snapshots that survive browser restarts.
5. **Message passing**: For complex UIs, use `@theluckystrike/webext-messaging` to coordinate between popup, background, and content scripts.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
