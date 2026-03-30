---
layout: default
title: "Chrome Extension Popup Patterns. Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/popup-patterns/"
last_modified_at: 2026-01-15
---
Popup Patterns

Overview {#overview}
The popup is the most common UI surface for Chrome extensions. It opens when the user clicks the toolbar icon and closes when they click away. This guide covers patterns for building effective popups with the @theluckystrike/webext-* toolkit.

Popup Lifecycle {#popup-lifecycle}
- Opens on toolbar icon click
- Runs fresh each time (no state persisted in memory)
- Closes when focus is lost
- Has its own document (popup.html)
- Can communicate with background via messaging

Manifest Setup {#manifest-setup}
```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png" }
  }
}
```

Pattern 1: Display Data from Background {#pattern-1-display-data-from-background}

Popup requests data from background service worker:

```ts
// shared/messages.ts
type Messages = {
  getStats: { request: void; response: { blocked: number; allowed: number; lastUpdate: number } };
  getRecentItems: { request: { limit: number }; response: Array<{ title: string; url: string }> };
};

// popup.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();

async function render() {
  const stats = await msg.send("getStats", undefined);
  document.getElementById("blocked")!.textContent = String(stats.blocked);
  document.getElementById("allowed")!.textContent = String(stats.allowed);

  const items = await msg.send("getRecentItems", { limit: 10 });
  const list = document.getElementById("items")!;
  list.innerHTML = items.map(i => `<li><a href="${i.url}">${i.title}</a></li>`).join("");
}

render();
```

Pattern 2: Quick Settings Toggle {#pattern-2-quick-settings-toggle}

Toggle a feature on/off from popup, persisted in storage:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";
import { createMessenger } from "@theluckystrike/webext-messaging";

const schema = defineSchema({ enabled: true, blockCount: 0 });
const storage = createStorage({ schema });

type Messages = {
  toggleFeature: { request: { enabled: boolean }; response: { enabled: boolean } };
};
const msg = createMessenger<Messages>();

async function init() {
  const enabled = await storage.get("enabled");
  updateToggleUI(enabled);

  document.getElementById("toggle")?.addEventListener("click", async () => {
    const current = await storage.get("enabled");
    const newState = !current;
    await storage.set("enabled", newState);
    await msg.send("toggleFeature", { enabled: newState });
    updateToggleUI(newState);
  });
}
```

Pattern 3: Current Tab Context {#pattern-3-current-tab-context}

Show info about the active tab:

```ts
async function showCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  document.getElementById("tab-title")!.textContent = tab.title ?? "Unknown";
  document.getElementById("tab-url")!.textContent = tab.url ?? "";
}
```

Pattern 4: Action Buttons (Run on Current Page) {#pattern-4-action-buttons-run-on-current-page}

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  extractData: { request: { tabId: number }; response: { wordCount: number; links: number } };
  injectCSS: { request: { tabId: number; theme: string }; response: { success: boolean } };
};
const msg = createMessenger<Messages>();

document.getElementById("extract")?.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;
  const data = await msg.send("extractData", { tabId: tab.id });
  document.getElementById("results")!.textContent = `${data.wordCount} words, ${data.links} links`;
});
```

Pattern 5: Form Input with Storage {#pattern-5-form-input-with-storage}

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  quickNote: "",
  savedNotes: [] as Array<{ text: string; timestamp: number }>,
});
const storage = createStorage({ schema });

// Load last note
const quickNote = await storage.get("quickNote");
(document.getElementById("note") as HTMLTextAreaElement).value = quickNote;

// Auto-save as user types
document.getElementById("note")?.addEventListener("input", async (e) => {
  await storage.set("quickNote", (e.target as HTMLTextAreaElement).value);
});

// Save button
document.getElementById("save-note")?.addEventListener("click", async () => {
  const text = await storage.get("quickNote");
  if (!text.trim()) return;
  const notes = await storage.get("savedNotes");
  notes.push({ text, timestamp: Date.now() });
  await storage.setMany({ savedNotes: notes, quickNote: "" });
  (document.getElementById("note") as HTMLTextAreaElement).value = "";
  renderNotesList(notes);
});
```

Pattern 6: Loading States and Error Handling {#pattern-6-loading-states-and-error-handling}

```ts
import { MessagingError } from "@theluckystrike/webext-messaging";

async function loadData() {
  const loading = document.getElementById("loading")!;
  const content = document.getElementById("content")!;
  const error = document.getElementById("error")!;

  loading.style.display = "block";
  content.style.display = "none";
  error.style.display = "none";

  try {
    const data = await msg.send("getData", {});
    content.style.display = "block";
    renderData(data);
  } catch (err) {
    error.style.display = "block";
    if (err instanceof MessagingError) {
      error.textContent = "Could not connect to background service.";
    } else {
      error.textContent = "An unexpected error occurred.";
    }
  } finally {
    loading.style.display = "none";
  }
}
```

Pattern 7: Badge Updates from Popup {#pattern-7-badge-updates-from-popup}

```ts
// Update badge after action
document.getElementById("mark-read")?.addEventListener("click", async () => {
  await msg.send("markAllRead", undefined);
  chrome.action.setBadgeText({ text: "" });
});
```

Popup Size and Layout Tips {#popup-size-and-layout-tips}
- Default max size: 800x600px (set via CSS, not manifest)
- Use `body { width: 350px; min-height: 200px; }` for consistent sizing
- Popups close on blur. don't use modal dialogs
- Links with target="_blank" open in new tab (popup stays open briefly)
- Use `chrome.tabs.create()` for navigation (popup closes)

Complete popup.html Template {#complete-popuphtml-template}

Provide a minimal but complete template:
- HTML structure with header, content area, footer
- TypeScript entry point
- CSS for dark/light theme support
- Loading/error/content states

Gotchas {#gotchas}
- Popup re-initializes every time it opens. always load state from storage
- No persistent connections. use messaging for each request
- `window.close()` closes the popup programmatically
- Console logs appear in the popup's own DevTools (right-click popup > Inspect)
- Popup HTML must be a local file (no remote URLs)

Related Articles {#related-articles}

Related Articles

- [Popup Communication](../patterns/popup-communication.md)
- [Popup Data Loading](../patterns/popup-data-loading.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
