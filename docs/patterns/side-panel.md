---
layout: default
title: "Chrome Extension Side Panel. Best Practices"
description: "Implement side panels in Manifest V3 with the chrome.sidePanel API."
canonical_url: "https://bestchromeextensions.com/patterns/side-panel/"
---

# Side Panel Patterns

Overview {#overview}

The [Side Panel API reference](../mv3/side-panel.md) covers the basics. This guide provides production patterns for building rich side panel experiences: tab-specific panels, navigation, real-time page interaction, persistent state, and responsive layouts.

---

Pattern 1: Tab-Specific Side Panels {#pattern-1-tab-specific-side-panels}

Show different content based on which tab is active:

```ts
// background.ts
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  const url = tab.url ?? "";

  if (url.includes("github.com")) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel-github.html",
      enabled: true,
    });
  } else if (url.includes("docs.google.com")) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel-docs.html",
      enabled: true,
    });
  } else {
    // Use default panel for other sites
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled: true,
    });
  }
});

// Also update when a tab navigates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.url) {
    // Re-evaluate which panel to show
    await updatePanelForTab(tabId, changeInfo.url);
  }
});
```

---

Pattern 2: Open Side Panel from Action Click {#pattern-2-open-side-panel-from-action-click}

Replace the popup with a side panel toggle:

```ts
// background.ts
// In manifest.json, remove "default_popup" from action and add:
// "side_panel": { "default_path": "sidepanel.html" }

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Or open for the whole window
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.windowId) return;
  await chrome.sidePanel.open({ windowId: tab.windowId });
});
```

---

Pattern 3: Side Panel with In-Page Navigation {#pattern-3-side-panel-with-in-page-navigation}

Build a SPA-like experience within the side panel:

```ts
// sidepanel.ts
type Route = "home" | "settings" | "search" | "detail";

class SidePanelRouter {
  private container: HTMLElement;
  private currentRoute: Route = "home";
  private history: Route[] = ["home"];

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.render();

    // Handle back navigation
    window.addEventListener("popstate", () => {
      this.history.pop();
      this.currentRoute = this.history[this.history.length - 1] ?? "home";
      this.render();
    });
  }

  navigate(route: Route) {
    this.currentRoute = route;
    this.history.push(route);
    window.history.pushState({ route }, "", `#${route}`);
    this.render();
  }

  back() {
    if (this.history.length > 1) {
      window.history.back();
    }
  }

  private render() {
    const views: Record<Route, () => string> = {
      home: () => `
        <h2>Home</h2>
        <button data-navigate="search">Search</button>
        <button data-navigate="settings">Settings</button>
      `,
      settings: () => `
        <button data-back>Back</button>
        <h2>Settings</h2>
        <label>
          <input type="checkbox" id="dark-mode" /> Dark mode
        </label>
      `,
      search: () => `
        <button data-back>Back</button>
        <h2>Search</h2>
        <input type="search" id="search-input" placeholder="Search..." />
        <div id="search-results"></div>
      `,
      detail: () => `
        <button data-back>Back</button>
        <h2>Detail</h2>
        <div id="detail-content"></div>
      `,
    };

    this.container.innerHTML = views[this.currentRoute]();
    this.bindNavigation();
  }

  private bindNavigation() {
    this.container.querySelectorAll<HTMLElement>("[data-navigate]").forEach((el) => {
      el.addEventListener("click", () => {
        this.navigate(el.dataset.navigate as Route);
      });
    });
    this.container.querySelectorAll("[data-back]").forEach((el) => {
      el.addEventListener("click", () => this.back());
    });
  }
}

const router = new SidePanelRouter("app");
```

---

Pattern 4: Real-Time Page Interaction {#pattern-4-real-time-page-interaction}

The side panel can communicate with the active tab's content script:

```ts
// sidepanel.ts. Send commands to the active page
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  "get-page-info": {
    request: void;
    response: { title: string; wordCount: number; url: string };
  };
  "highlight-text": {
    request: { query: string; color: string };
    response: { count: number };
  };
  "scroll-to-element": {
    request: { selector: string };
    response: { found: boolean };
  };
};

const msg = createMessenger<Messages>();

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function sendToActiveTab<K extends keyof Messages>(
  type: K,
  payload: Messages[K]["request"]
): Promise<Messages[K]["response"]> {
  const tabId = await getActiveTabId();
  if (!tabId) throw new Error("No active tab");
  return msg.sendTab({ tabId }, type, payload);
}

// UI event handlers
document.getElementById("highlight-btn")?.addEventListener("click", async () => {
  const query = (document.getElementById("search-input") as HTMLInputElement).value;
  const result = await sendToActiveTab("highlight-text", {
    query,
    color: "#ffeb3b",
  });
  document.getElementById("match-count")!.textContent = `${result.count} matches`;
});
```

```ts
// content.ts. Respond to side panel commands
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();

msg.onMessage("get-page-info", async () => ({
  title: document.title,
  wordCount: document.body.innerText.split(/\s+/).length,
  url: location.href,
}));

msg.onMessage("highlight-text", async ({ query, color }) => {
  // Remove previous highlights
  document.querySelectorAll(".ext-highlight").forEach((el) => {
    const parent = el.parentNode!;
    parent.replaceChild(document.createTextNode(el.textContent ?? ""), el);
    parent.normalize();
  });

  if (!query) return { count: 0 };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const matches: { node: Text; index: number }[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const idx = node.textContent?.toLowerCase().indexOf(query.toLowerCase()) ?? -1;
    if (idx >= 0) matches.push({ node, index: idx });
  }

  for (const { node, index } of matches.reverse()) {
    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + query.length);

    const mark = document.createElement("mark");
    mark.className = "ext-highlight";
    mark.style.backgroundColor = color;
    range.surroundContents(mark);
  }

  return { count: matches.length };
});
```

---

Pattern 5: Persistent Side Panel State {#pattern-5-persistent-side-panel-state}

The side panel stays open across tab switches, but its JavaScript context reloads. Persist state:

```ts
// sidepanel.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  panelState: {
    currentRoute: "home" as string,
    searchQuery: "",
    scrollPosition: 0,
    collapsedSections: [] as string[],
  },
});

const storage = createStorage({ schema, area: "session" });

// Save state on every change
async function saveState(updates: Partial<typeof schema.panelState>) {
  const current = await storage.get("panelState");
  await storage.set("panelState", { ...current, ...updates });
}

// Restore state on load
async function restoreState() {
  const state = await storage.get("panelState");
  if (!state) return;

  // Restore route
  if (state.currentRoute !== "home") {
    router.navigate(state.currentRoute as Route);
  }

  // Restore search query
  const searchInput = document.getElementById("search-input") as HTMLInputElement;
  if (searchInput && state.searchQuery) {
    searchInput.value = state.searchQuery;
  }

  // Restore scroll position
  requestAnimationFrame(() => {
    document.documentElement.scrollTop = state.scrollPosition;
  });
}

document.addEventListener("DOMContentLoaded", restoreState);

// Save scroll position periodically
let scrollTimer: ReturnType<typeof setTimeout>;
document.addEventListener("scroll", () => {
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    saveState({ scrollPosition: document.documentElement.scrollTop });
  }, 200);
});
```

---

Pattern 6: Responsive Side Panel Layout {#pattern-6-responsive-side-panel-layout}

Side panels can be resized by the user. Handle varying widths:

```css
/* sidepanel.css */
:root {
  --panel-padding: 12px;
}

body {
  margin: 0;
  padding: var(--panel-padding);
  font-family: system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  /* Prevent horizontal overflow */
  overflow-x: hidden;
}

/* Stack layout for narrow panels */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

/* Side-by-side when panel is wide enough */
@container (min-width: 400px) {
  .card-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Use container queries for panel width awareness */
#app {
  container-type: inline-size;
}

/* Truncate long text */
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Compact controls */
.toolbar {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.toolbar button {
  flex: 0 0 auto;
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.toolbar button:hover {
  background: #f5f5f5;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  body {
    background: #1a1a1a;
    color: #e0e0e0;
  }
  .toolbar button {
    background: #2a2a2a;
    border-color: #444;
    color: #e0e0e0;
  }
}
```

---

Pattern 7: Side Panel with Background Sync {#pattern-7-side-panel-with-background-sync}

Keep the side panel updated with live data from the service worker:

```ts
// background.ts. Push updates to side panel
function broadcastToSidePanel(data: unknown) {
  chrome.runtime.sendMessage({ type: "side-panel-update", data }).catch(() => {
    // Side panel may not be open. ignore
  });
}

// Poll or listen for data changes
chrome.alarms.create("check-updates", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "check-updates") {
    const freshData = await fetchUpdates();
    broadcastToSidePanel(freshData);
  }
});
```

```ts
// sidepanel.ts. Receive live updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "side-panel-update") {
    updateUI(msg.data);
  }
});
```

---

Pattern 8: Disabling Side Panel Per-Site {#pattern-8-disabling-side-panel-per-site}

```ts
// background.ts. Disable side panel on specific sites
const BLOCKED_SITES = ["chrome://", "chrome-extension://", "about:"];

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (!changeInfo.url) return;

  const blocked = BLOCKED_SITES.some((prefix) => changeInfo.url!.startsWith(prefix));

  await chrome.sidePanel.setOptions({
    tabId,
    enabled: !blocked,
  });
});
```

---

Summary {#summary}

| Pattern | Use Case |
|---------|----------|
| Tab-specific panels | Different UI per site/context |
| Action click open | Replace popup with persistent side panel |
| In-panel navigation | Multi-view SPA within the panel |
| Page interaction | Highlight, scroll, extract from active tab |
| Persistent state | Survive panel reloads and tab switches |
| Responsive layout | Adapt to user-resized panel width |
| Background sync | Live data pushed from service worker |
| Per-site disable | Hide panel on incompatible pages |

The Side Panel API is Chrome's answer to the ephemeral popup. Use it when your extension needs persistent, always-available UI that interacts deeply with page content.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
