---
layout: default
title: "Chrome Extension Badge Action Ui. Best Practices"
description: "Update badge text and colors to indicate extension state to users."
canonical_url: "https://bestchromeextensions.com/patterns/badge-action-ui/"
---

Badge and Action UI Patterns

Overview {#overview}

The `chrome.action` API controls the extension's toolbar button. its icon, badge text, popup, and click behavior. Combined with per-tab state management, these APIs let you build rich, context-aware UI indicators without opening a full page. This guide covers practical patterns for badges, icons, popups, and action button behavior.

---

The Action Button Anatomy {#the-action-button-anatomy}

```

  Chrome Toolbar                         
                                         
                         
                             
      Icon      < 16x16 / 32x32   
                    swappable        
                             
                                   
    3  badge    < text + color     
                                   
                         
          click                         
                             
      Popup     < or onClicked event 
      (HTML)                           
                             

```

Key facts:
- Badge: Up to 4 characters of text overlaid on the icon, with a configurable background color
- Icon: 16x16 and 32x32 pixel images (or canvas-drawn), swappable at runtime
- Popup: An HTML page shown on click. mutually exclusive with the `onClicked` event
- Title: Tooltip text shown on hover

---

Pattern 1: Dynamic Badge Text and Color Based on State {#pattern-1-dynamic-badge-text-and-color-based-on-state}

Update the badge to reflect extension state. active/inactive, error conditions, or status indicators:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  isEnabled: { type: "boolean", default: true },
  lastError: { type: "string", default: "" },
});

const storage = createStorage(schema);

type ExtensionState = "active" | "inactive" | "error" | "loading";

const BADGE_CONFIG: Record<
  ExtensionState,
  { text: string; color: string }
> = {
  active: { text: "ON", color: "#4CAF50" },
  inactive: { text: "OFF", color: "#9E9E9E" },
  error: { text: "ERR", color: "#F44336" },
  loading: { text: "...", color: "#FF9800" },
};

async function setBadgeState(state: ExtensionState): Promise<void> {
  const config = BADGE_CONFIG[state];
  await Promise.all([
    chrome.action.setBadgeText({ text: config.text }),
    chrome.action.setBadgeBackgroundColor({ color: config.color }),
  ]);
}

// React to storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if (changes.lastError?.newValue) {
    setBadgeState("error");
  } else if (changes.isEnabled) {
    setBadgeState(changes.isEnabled.newValue ? "active" : "inactive");
  }
});

// Set initial state on install/startup
chrome.runtime.onStartup.addListener(async () => {
  const enabled = await storage.get("isEnabled");
  setBadgeState(enabled ? "active" : "inactive");
});
```

---

Pattern 2: Per-Tab Badge State Management {#pattern-2-per-tab-badge-state-management}

Show different badge states on different tabs. for example, the number of blocked items on each page:

```ts
// background.ts

// Track per-tab counts
const tabCounts = new Map<number, number>();

function incrementTabCount(tabId: number): void {
  const current = tabCounts.get(tabId) ?? 0;
  const next = current + 1;
  tabCounts.set(tabId, next);

  // Update badge for this specific tab
  chrome.action.setBadgeText({
    text: next > 999 ? "999+" : String(next),
    tabId,
  });
  chrome.action.setBadgeBackgroundColor({
    color: "#2196F3",
    tabId,
  });
}

// Reset count when tab navigates to a new page
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    tabCounts.set(tabId, 0);
    chrome.action.setBadgeText({ text: "", tabId });
  }
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  tabCounts.delete(tabId);
});

// Example: count blocked requests per tab
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  if (info.request.tabId > 0) {
    incrementTabCount(info.request.tabId);
  }
});
```

When you pass `tabId` to `setBadgeText`, the badge only changes for that tab. Other tabs keep their own badge state. Omitting `tabId` sets the global default.

---

Pattern 3: Badge as a Counter (Unread Count, Active Items) {#pattern-3-badge-as-a-counter-unread-count-active-items}

Use the badge as a live counter that updates from external data sources:

```ts
// background.ts

interface CounterConfig {
  pollIntervalMinutes: number;
  fetchCount: () => Promise<number>;
  maxDisplay: number;
}

function createBadgeCounter(config: CounterConfig): void {
  const { pollIntervalMinutes, fetchCount, maxDisplay } = config;

  async function updateBadge(): Promise<void> {
    try {
      const count = await fetchCount();

      if (count === 0) {
        await chrome.action.setBadgeText({ text: "" });
        return;
      }

      const displayText =
        count > maxDisplay ? `${maxDisplay}+` : String(count);

      await Promise.all([
        chrome.action.setBadgeText({ text: displayText }),
        chrome.action.setBadgeBackgroundColor({
          color: count > 10 ? "#F44336" : "#2196F3",
        }),
      ]);
    } catch {
      await chrome.action.setBadgeText({ text: "!" });
      await chrome.action.setBadgeBackgroundColor({ color: "#FF9800" });
    }
  }

  // Poll with chrome.alarms (survives SW termination)
  chrome.alarms.create("badge-counter", {
    periodInMinutes: pollIntervalMinutes,
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "badge-counter") {
      updateBadge();
    }
  });

  // Initial update
  updateBadge();
}

// Usage: unread email counter
createBadgeCounter({
  pollIntervalMinutes: 1,
  maxDisplay: 99,
  fetchCount: async () => {
    const response = await fetch("https://api.example.com/unread-count", {
      headers: { Authorization: `Bearer ${await getToken()}` },
    });
    const data = await response.json();
    return data.count;
  },
});

async function getToken(): Promise<string> {
  const result = await chrome.storage.session.get("authToken");
  return result.authToken ?? "";
}
```

---

Pattern 4: Action Icon Swapping (Enabled/Disabled States) {#pattern-4-action-icon-swapping-enableddisabled-states}

Swap the toolbar icon to visually indicate the extension's state. Provide both 16px and 32px versions for crisp rendering:

```ts
// background.ts

interface IconSet {
  "16": string;
  "32": string;
}

const ICONS: Record<string, IconSet> = {
  active: {
    "16": "icons/active-16.png",
    "32": "icons/active-32.png",
  },
  inactive: {
    "16": "icons/inactive-16.png",
    "32": "icons/inactive-32.png",
  },
  warning: {
    "16": "icons/warning-16.png",
    "32": "icons/warning-32.png",
  },
};

async function setIconState(
  state: keyof typeof ICONS,
  tabId?: number
): Promise<void> {
  await chrome.action.setIcon({
    path: ICONS[state],
    ...(tabId !== undefined && { tabId }),
  });
}

// Use canvas to generate icons dynamically (no image files needed)
async function setDynamicIcon(
  color: string,
  tabId?: number
): Promise<void> {
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext("2d")!;

  // Draw a colored circle
  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Add a border
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 2;
  ctx.stroke();

  const imageData = ctx.getImageData(0, 0, 32, 32);

  await chrome.action.setIcon({
    imageData: { "32": imageData },
    ...(tabId !== undefined && { tabId }),
  });
}

// Grayscale the icon to indicate "disabled" state
async function setGrayscaleIcon(tabId?: number): Promise<void> {
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext("2d")!;

  const response = await fetch(chrome.runtime.getURL("icons/active-32.png"));
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, 32, 32);

  // Convert to grayscale
  for (let i = 0; i < imageData.data.length; i += 4) {
    const avg =
      imageData.data[i] * 0.299 +
      imageData.data[i + 1] * 0.587 +
      imageData.data[i + 2] * 0.114;
    imageData.data[i] = avg;
    imageData.data[i + 1] = avg;
    imageData.data[i + 2] = avg;
  }

  await chrome.action.setIcon({
    imageData: { "32": imageData },
    ...(tabId !== undefined && { tabId }),
  });
}
```

---

Pattern 5: Action Popup vs Programmatic Action Handling {#pattern-5-action-popup-vs-programmatic-action-handling}

You can either show a popup HTML page on click, or handle the click programmatically. but not both at the same time. Choose based on your UX needs:

```ts
// background.ts

// Option A: Use a popup (set in manifest or at runtime)
// When a popup is set, chrome.action.onClicked does NOT fire
async function enablePopup(): Promise<void> {
  await chrome.action.setPopup({ popup: "popup.html" });
}

// Option B: Handle clicks programmatically
// First, clear any popup so onClicked fires
async function enableProgrammaticAction(): Promise<void> {
  await chrome.action.setPopup({ popup: "" });
}

// This only fires when NO popup is set
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  // Toggle the extension on/off for this tab
  const isActive = await getTabState(tab.id);

  if (isActive) {
    await deactivateOnTab(tab.id);
    await chrome.action.setBadgeText({ text: "OFF", tabId: tab.id });
  } else {
    await activateOnTab(tab.id);
    await chrome.action.setBadgeText({ text: "ON", tabId: tab.id });
  }
});

// Option C: Hybrid. toggle between popup and programmatic based on context
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  const url = tab.url ?? "";

  if (url.startsWith("https://app.example.com")) {
    // Show the full popup on supported sites
    await chrome.action.setPopup({ popup: "popup.html", tabId });
  } else {
    // Use click-to-toggle on other sites
    await chrome.action.setPopup({ popup: "", tabId });
  }
});

async function getTabState(tabId: number): Promise<boolean> {
  const result = await chrome.storage.session.get(`tab-${tabId}`);
  return result[`tab-${tabId}`] ?? false;
}

async function activateOnTab(tabId: number): Promise<void> {
  await chrome.storage.session.set({ [`tab-${tabId}`]: true });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
}

async function deactivateOnTab(tabId: number): Promise<void> {
  await chrome.storage.session.set({ [`tab-${tabId}`]: false });
  await chrome.tabs.sendMessage(tabId, { type: "deactivate" });
}
```

---

Pattern 6: Dynamic Popup Selection Based on Context {#pattern-6-dynamic-popup-selection-based-on-context}

Show different popup pages depending on the current tab, authentication state, or extension configuration:

```ts
// background.ts

const POPUPS = {
  default: "popup/default.html",
  login: "popup/login.html",
  dashboard: "popup/dashboard.html",
  settings: "popup/settings.html",
  unsupported: "popup/unsupported.html",
} as const;

// Choose popup based on tab URL and auth state
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const popup = await selectPopup(tabId);
  await chrome.action.setPopup({ popup, tabId });
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    const popup = await selectPopup(tabId);
    await chrome.action.setPopup({ popup, tabId });
  }
});

async function selectPopup(tabId: number): Promise<string> {
  // Check authentication first
  const { authToken } = await chrome.storage.session.get("authToken");
  if (!authToken) {
    return POPUPS.login;
  }

  // Check tab URL
  const tab = await chrome.tabs.get(tabId);
  const url = tab.url ?? "";

  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
    return POPUPS.unsupported;
  }

  if (url.startsWith("https://app.example.com")) {
    return POPUPS.dashboard;
  }

  return POPUPS.default;
}

// Listen for auth changes and update all tabs
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "session" || !changes.authToken) return;

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      const popup = await selectPopup(tab.id);
      await chrome.action.setPopup({ popup, tabId: tab.id });
    }
  }
});
```

---

Pattern 7: Animated Badge Updates {#pattern-7-animated-badge-updates}

Draw attention to badge changes with a brief animation effect. useful for notifications or state transitions:

```ts
// background.ts

// Flash the badge color to draw attention
async function flashBadge(
  text: string,
  flashColor: string,
  restColor: string,
  flashes: number = 3
): Promise<void> {
  await chrome.action.setBadgeText({ text });

  for (let i = 0; i < flashes; i++) {
    await chrome.action.setBadgeBackgroundColor({ color: flashColor });
    await sleep(300);
    await chrome.action.setBadgeBackgroundColor({ color: restColor });
    await sleep(300);
  }
}

// Counting animation. rolls up from 0 to target
async function animateCount(target: number): Promise<void> {
  const steps = Math.min(target, 10);
  const increment = Math.ceil(target / steps);

  for (let i = increment; i <= target; i += increment) {
    await chrome.action.setBadgeText({ text: String(i) });
    await sleep(80);
  }

  // Ensure we show the exact final number
  await chrome.action.setBadgeText({
    text: target > 999 ? "999+" : String(target),
  });
}

// Color fade transition
async function fadeBadgeColor(
  from: [number, number, number],
  to: [number, number, number],
  steps: number = 5
): Promise<void> {
  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    const r = Math.round(from[0] + (to[0] - from[0]) * ratio);
    const g = Math.round(from[1] + (to[1] - from[1]) * ratio);
    const b = Math.round(from[2] + (to[2] - from[2]) * ratio);

    await chrome.action.setBadgeBackgroundColor({
      color: [r, g, b, 255],
    });
    await sleep(100);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Usage: notify user of new items
async function notifyNewItems(count: number): Promise<void> {
  await animateCount(count);
  await flashBadge(
    String(count),
    "#FF5722", // flash orange
    "#4CAF50", // rest green
    3
  );
}
```

> Warning: Badge animations rely on `setTimeout`, which does not keep the service worker alive. These animations work best when triggered during an active event handler (message, alarm, etc.) or from a popup/offscreen document. For critical indicators, set the final state first, then animate.

---

Pattern 8: Action Title and Tooltip Management {#pattern-8-action-title-and-tooltip-management}

Set dynamic tooltip text to provide context about what clicking the action button will do:

```ts
// background.ts

// Basic title management
async function updateTitle(tabId?: number): Promise<void> {
  const isEnabled = await chrome.storage.local.get("isEnabled");

  const title = isEnabled
    ? "MyExtension. Click to disable"
    : "MyExtension. Click to enable";

  await chrome.action.setTitle({
    title,
    ...(tabId !== undefined && { tabId }),
  });
}

// Rich title with status information
async function setDetailedTitle(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  const url = tab.url ?? "";
  const hostname = new URL(url).hostname;

  const stats = await getTabStats(tabId);

  const lines = [
    `MyExtension`,
    `Site: ${hostname}`,
    `Blocked: ${stats.blocked} requests`,
    `Modified: ${stats.modified} headers`,
    `Status: ${stats.isActive ? "Active" : "Paused"}`,
  ];

  await chrome.action.setTitle({
    title: lines.join("\n"),
    tabId,
  });
}

// Update titles when tabs change
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    await setDetailedTitle(tabId);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  await setDetailedTitle(tabId);
});

// Enable/disable the action button itself
async function setActionEnabled(
  enabled: boolean,
  tabId?: number
): Promise<void> {
  if (enabled) {
    await chrome.action.enable(tabId);
    await chrome.action.setTitle({
      title: "MyExtension. Active",
      ...(tabId !== undefined && { tabId }),
    });
  } else {
    await chrome.action.disable(tabId);
    await chrome.action.setTitle({
      title: "MyExtension. Not available on this page",
      ...(tabId !== undefined && { tabId }),
    });
  }
}

// Disable on chrome:// and other restricted pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;

  const url = tab.url ?? "";
  const isRestricted =
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("about:");

  await setActionEnabled(!isRestricted, tabId);
});

interface TabStats {
  blocked: number;
  modified: number;
  isActive: boolean;
}

async function getTabStats(tabId: number): Promise<TabStats> {
  const result = await chrome.storage.session.get(`stats-${tabId}`);
  return (
    result[`stats-${tabId}`] ?? {
      blocked: 0,
      modified: 0,
      isActive: true,
    }
  );
}
```

---

Common Pitfalls {#common-pitfalls}

1. Badge Text Length {#1-badge-text-length}

```ts
// Badge text is limited to ~4 characters.
// Longer text is silently truncated and may render poorly.
await chrome.action.setBadgeText({ text: "12345" }); // truncated to "1234" or less

// Use abbreviations:
function formatBadgeNumber(n: number): string {
  if (n === 0) return "";
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(0)}k`;
  return "9k+";
}
```

2. Popup and onClicked Are Mutually Exclusive {#2-popup-and-onclicked-are-mutually-exclusive}

```ts
// If you set a popup in manifest.json, chrome.action.onClicked NEVER fires.
// To use onClicked, either:
// a) Don't set "default_popup" in manifest
// b) Clear it at runtime:
chrome.action.setPopup({ popup: "" }); // now onClicked will fire
```

3. Per-Tab State Is Not Persisted {#3-per-tab-state-is-not-persisted}

```ts
// Per-tab badge/icon/title state is lost when:
// - The service worker restarts
// - The tab is discarded and restored
// Always re-apply tab-specific state in tabs.onUpdated:
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    await reapplyTabState(tabId);
  }
});
```

---

Summary {#summary}

| Pattern | When to Use |
|---------|------------|
| Dynamic badge text & color | Reflecting global extension state (on/off/error) |
| Per-tab badge state | Showing tab-specific data (blocked count, status) |
| Badge counter | Unread counts, polling external APIs |
| Icon swapping | Visual enabled/disabled indicators, state changes |
| Popup vs programmatic | Choosing between a rich UI and click-to-toggle |
| Dynamic popup selection | Context-dependent UI (auth gate, site-specific) |
| Animated badge updates | Drawing attention to changes, notification effects |
| Title and tooltip management | Providing hover context, accessibility labels |

The action button is your extension's front door. Keep badge text short, icon changes meaningful, and tooltip text descriptive. Use per-tab state to make every tab feel like the extension understands its context.-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
