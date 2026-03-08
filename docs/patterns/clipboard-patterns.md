---
layout: default
title: "Chrome Extension Clipboard Patterns — Best Practices"
description: "Read and write clipboard content in Chrome extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/clipboard-patterns/"
---

# Clipboard API Patterns

## Overview {#overview}

Clipboard access in Chrome extensions is split across contexts: content scripts can use `document.execCommand` or the async Clipboard API on user-visible pages, service workers have no DOM and no clipboard access at all, and offscreen documents bridge the gap. This guide covers eight patterns for reading, writing, monitoring, and managing clipboard data across extension contexts.

---

## Required Permissions {#required-permissions}

```jsonc
// manifest.json
{
  "permissions": ["offscreen", "clipboardRead", "clipboardWrite"],
  // For context menu integration
  "permissions": ["offscreen", "clipboardRead", "clipboardWrite", "contextMenus"]
}
```

---

## Pattern 1: Reading Clipboard Text from Different Contexts {#pattern-1-reading-clipboard-text-from-different-contexts}

Each extension context has different clipboard capabilities. Here is how to read text in each:

### Content Script (direct access) {#content-script-direct-access}

Content scripts run on web pages and can use the async Clipboard API when the page is focused:

```ts
// content-script.ts
async function readClipboardInContentScript(): Promise<string | null> {
  try {
    // Requires the page to be focused and clipboardRead permission
    return await navigator.clipboard.readText();
  } catch (err) {
    console.warn("Clipboard read failed:", err);
    return null;
  }
}
```

### Popup / Side Panel (direct access) {#popup-side-panel-direct-access}

Extension pages have their own origin and can read the clipboard while they are focused:

```ts
// popup.ts
document.getElementById("paste-btn")!.addEventListener("click", async () => {
  const text = await navigator.clipboard.readText();
  document.getElementById("output")!.textContent = text;
});
```

### Service Worker (via offscreen document) {#service-worker-via-offscreen-document}

Service workers cannot access the clipboard. Delegate to an offscreen document:

```ts
// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type ClipboardMessages = {
  "clipboard:read": { request: void; response: { text: string } };
  "clipboard:write": { request: { text: string }; response: { ok: boolean } };
};

const messenger = createMessenger<ClipboardMessages>();

async function ensureOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  if (contexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: "Read/write clipboard from background",
  });
}

async function readClipboard(): Promise<string> {
  await ensureOffscreen();
  const result = await messenger.send("clipboard:read", undefined);
  return result.text;
}
```

---

## Pattern 2: Writing to Clipboard from Background {#pattern-2-writing-to-clipboard-from-background}

The service worker must route clipboard writes through an offscreen document or a content script:

```ts
// offscreen.ts — Clipboard write handler
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "clipboard:write") {
    navigator.clipboard.writeText(msg.text)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.type === "clipboard:read") {
    navigator.clipboard.readText()
      .then((text) => sendResponse({ text }))
      .catch(() => sendResponse({ text: "" }));
    return true;
  }
});
```

```ts
// background.ts
async function writeClipboard(text: string): Promise<boolean> {
  await ensureOffscreen();

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "clipboard:write", text },
      (response) => resolve(response?.ok ?? false)
    );
  });
}

// Example: copy a generated URL from the service worker
chrome.action.onClicked.addListener(async (tab) => {
  const shareUrl = `https://example.com/share?page=${encodeURIComponent(tab.url ?? "")}`;
  const ok = await writeClipboard(shareUrl);
  if (ok) {
    chrome.action.setBadgeText({ text: "OK", tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: "", tabId: tab.id }), 2000);
  }
});
```

---

## Pattern 3: Clipboard Monitoring (Watch for Changes) {#pattern-3-clipboard-monitoring-watch-for-changes}

The Clipboard API has no change event. Poll by comparing snapshots at an interval:

```ts
// offscreen.ts — Clipboard watcher
let lastClipboardText = "";
let watchInterval: ReturnType<typeof setInterval> | null = null;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "clipboard:watch-start") {
    startWatching(msg.intervalMs ?? 1000);
    sendResponse({ ok: true });
  } else if (msg.type === "clipboard:watch-stop") {
    stopWatching();
    sendResponse({ ok: true });
  }
  return true;
});

function startWatching(intervalMs: number): void {
  stopWatching();
  watchInterval = setInterval(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text !== lastClipboardText) {
        lastClipboardText = text;
        chrome.runtime.sendMessage({
          type: "clipboard:changed",
          text,
          timestamp: Date.now(),
        });
      }
    } catch {
      // Clipboard read can fail if another app has locked it
    }
  }, intervalMs);
}

function stopWatching(): void {
  if (watchInterval) {
    clearInterval(watchInterval);
    watchInterval = null;
  }
}
```

```ts
// background.ts — React to clipboard changes
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "clipboard:changed") {
    // Store in history, trigger actions, etc.
    saveToHistory(msg.text, msg.timestamp);
  }
});
```

> **Note:** Aggressive polling drains battery. Use intervals of 1-2 seconds and let the user toggle monitoring on/off. Chrome may also restrict clipboard reads when the extension page is not focused.

---

## Pattern 4: Rich Content -- Copying HTML and Images {#pattern-4-rich-content-copying-html-and-images}

The async Clipboard API supports `ClipboardItem` for rich content. Use this from a content script or offscreen document:

```ts
// content-script.ts — Copy selection as HTML
async function copySelectionAsHTML(): Promise<boolean> {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  const container = document.createElement("div");
  container.appendChild(range.cloneContents());
  const html = container.innerHTML;
  const plainText = selection.toString();

  try {
    const item = new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([plainText], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.error("Rich copy failed:", err);
    return false;
  }
}
```

### Copying an Image {#copying-an-image}

```ts
// content-script.ts — Copy an image element to clipboard
async function copyImageToClipboard(imgElement: HTMLImageElement): Promise<boolean> {
  try {
    const response = await fetch(imgElement.src);
    const blob = await response.blob();

    // Clipboard API only supports PNG for images
    let pngBlob = blob;
    if (blob.type !== "image/png") {
      pngBlob = await convertToPNG(blob);
    }

    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": pngBlob }),
    ]);
    return true;
  } catch (err) {
    console.error("Image copy failed:", err);
    return false;
  }
}

function convertToPNG(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/png"
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
```

---

## Pattern 5: Clipboard History Manager {#pattern-5-clipboard-history-manager}

Store clipboard entries in `chrome.storage.local` for a searchable history:

```ts
// clipboard-history.ts
import { createStorage } from "@theluckystrike/webext-storage";

interface ClipboardEntry {
  id: string;
  text: string;
  timestamp: number;
  source: "manual" | "monitor";
  preview: string; // truncated for display
}

const storage = createStorage<{ clipboardHistory: ClipboardEntry[] }>();

const MAX_HISTORY = 200;
const PREVIEW_LENGTH = 120;

async function saveToHistory(text: string, source: "manual" | "monitor"): Promise<void> {
  const history = (await storage.get("clipboardHistory")) ?? [];

  // Deduplicate — don't store the same text consecutively
  if (history.length > 0 && history[0].text === text) return;

  const entry: ClipboardEntry = {
    id: crypto.randomUUID(),
    text,
    timestamp: Date.now(),
    source,
    preview: text.length > PREVIEW_LENGTH
      ? text.slice(0, PREVIEW_LENGTH) + "..."
      : text,
  };

  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;

  await storage.set("clipboardHistory", history);
}

async function searchHistory(query: string): Promise<ClipboardEntry[]> {
  const history = (await storage.get("clipboardHistory")) ?? [];
  if (!query) return history;

  const lower = query.toLowerCase();
  return history.filter((entry) => entry.text.toLowerCase().includes(lower));
}

async function clearHistory(): Promise<void> {
  await storage.set("clipboardHistory", []);
}

async function deleteEntry(id: string): Promise<void> {
  const history = (await storage.get("clipboardHistory")) ?? [];
  await storage.set(
    "clipboardHistory",
    history.filter((e) => e.id !== id)
  );
}
```

The popup can then call `searchHistory(query)` to render a filterable list of past clips, with each entry showing its `preview` and `timestamp`.

---

## Pattern 6: Context Menu "Copy as..." {#pattern-6-context-menu-copy-as}

Add right-click menu items that transform selected text before copying:

```ts
// background.ts
chrome.contextMenus.create({
  id: "copy-as-markdown",
  title: 'Copy as Markdown link',
  contexts: ["selection"],
});

chrome.contextMenus.create({
  id: "copy-as-json",
  title: "Copy as JSON string",
  contexts: ["selection"],
});

chrome.contextMenus.create({
  id: "copy-as-uppercase",
  title: "Copy as UPPERCASE",
  contexts: ["selection"],
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText || !tab?.id) return;

  let transformed: string;

  switch (info.menuItemId) {
    case "copy-as-markdown":
      transformed = `[${info.selectionText}](${info.pageUrl})`;
      break;
    case "copy-as-json":
      transformed = JSON.stringify(info.selectionText);
      break;
    case "copy-as-uppercase":
      transformed = info.selectionText.toUpperCase();
      break;
    default:
      return;
  }

  // Write via the content script (already has page focus)
  await chrome.tabs.sendMessage(tab.id, {
    type: "clipboard:write-text",
    text: transformed,
  });
});
```

```ts
// content-script.ts — Handle write requests from background
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "clipboard:write-text") {
    navigator.clipboard.writeText(msg.text)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});
```

---

## Pattern 7: Paste Interception in Content Scripts {#pattern-7-paste-interception-in-content-scripts}

Intercept paste events to transform or validate content before it enters the page:

```ts
// content-script.ts — Paste interceptor
function setupPasteInterceptor(
  selector: string,
  transform: (text: string) => string
): void {
  document.addEventListener("paste", (event) => {
    const target = event.target as HTMLElement;
    if (!target.matches(selector)) return;

    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const text = clipboardData.getData("text/plain");
    if (!text) return;

    event.preventDefault();

    const transformed = transform(text);

    // Insert transformed text at cursor position
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const start = target.selectionStart ?? 0;
      const end = target.selectionEnd ?? 0;
      target.value = target.value.slice(0, start) + transformed + target.value.slice(end);
      target.selectionStart = target.selectionEnd = start + transformed.length;
      target.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (target.isContentEditable) {
      document.execCommand("insertText", false, transformed);
    }
  }, true);
}

// Example: strip tracking parameters from pasted URLs
setupPasteInterceptor("input[type=url], textarea", (text) => {
  try {
    const url = new URL(text);
    const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid"];
    trackingParams.forEach((p) => url.searchParams.delete(p));
    return url.toString();
  } catch {
    return text; // Not a URL — return as-is
  }
});

// Example: sanitize HTML on paste into contentEditable
setupPasteInterceptor("[contenteditable]", (text) => {
  // Strip all HTML, keep only plain text
  return text.replace(/<[^>]*>/g, "");
});
```

---

## Pattern 8: Clipboard Permissions and User Consent {#pattern-8-clipboard-permissions-and-user-consent}

Clipboard access can fail silently or throw depending on context and focus state. Handle permissions defensively:

```ts
// permissions.ts
async function checkClipboardPermission(
  mode: "read" | "write"
): Promise<"granted" | "denied" | "prompt"> {
  try {
    const name = mode === "read" ? "clipboard-read" : "clipboard-write";
    const result = await navigator.permissions.query({
      name: name as PermissionName,
    });
    return result.state;
  } catch {
    // Permissions API may not support clipboard queries in all contexts
    return "prompt";
  }
}

async function safeClipboardRead(): Promise<{ text: string; error?: string }> {
  const permission = await checkClipboardPermission("read");

  if (permission === "denied") {
    return { text: "", error: "Clipboard read permission denied by user" };
  }

  try {
    const text = await navigator.clipboard.readText();
    return { text };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message.includes("not focused")) {
      return { text: "", error: "Page must be focused to read clipboard" };
    }
    if (message.includes("not allowed")) {
      return { text: "", error: "Clipboard access requires user gesture" };
    }

    return { text: "", error: message };
  }
}
```

Ensure clipboard reads/writes happen in response to user gestures (clicks, key presses):

```ts
// popup.ts — Gate clipboard access behind a button click
document.getElementById("read-btn")!.addEventListener("click", async () => {
  // This runs inside a user gesture — clipboard access is allowed
  const result = await safeClipboardRead();

  if (result.error) {
    showError(result.error);
    return;
  }

  showResult(result.text);
});
```

---

## Summary {#summary}

| Pattern | Use Case |
|---------|----------|
| Reading from different contexts | Content script, popup, or offscreen depending on where you need the data |
| Writing from background | Route through offscreen document or content script |
| Clipboard monitoring | Poll for changes with configurable interval |
| Rich content (HTML/images) | `ClipboardItem` API for multi-format copy |
| History manager | Searchable clipboard history in `chrome.storage.local` |
| Context menu "Copy as..." | Transform selected text before copying |
| Paste interception | Validate or clean pasted content in content scripts |
| Permissions and consent | Defensive error handling and user-gesture gating |

Clipboard access in extensions requires routing through the right context. Service workers cannot touch the clipboard directly — always delegate to an offscreen document or content script. Handle permission errors gracefully, gate operations behind user gestures, and give users control over monitoring and history retention.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
