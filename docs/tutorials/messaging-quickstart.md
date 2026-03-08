---
layout: default
title: "Chrome Extension Messaging Quickstart — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Messaging Quickstart

## Overview

`@theluckystrike/webext-messaging` provides fully-typed, promise-based message passing between extension contexts (background, content scripts, popups).

## Install

```bash
npm install @theluckystrike/webext-messaging
```

## Step 1: Define Your Message Map

Create a `MessageMap` type mapping message names to `{ request, response }` shapes:

```ts
type Messages = {
  getUser: {
    request: { id: number };
    response: { name: string; email: string };
  };
  saveSettings: {
    request: { theme: string; fontSize: number };
    response: { success: boolean };
  };
  ping: {
    request: void;
    response: "pong";
  };
};
```

## Step 2: Create a Messenger (Recommended)

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();
```

The `Messenger<M>` interface has three methods:

- `send<K>(type, payload)` — sends via `chrome.runtime.sendMessage`
- `sendTab<K>(options, type, payload)` — sends via `chrome.tabs.sendMessage`
- `onMessage(handlers)` — registers typed handlers

## Step 3: Handle Messages (Background)

```ts
// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  getUser: {
    request: { id: number };
    response: { name: string; email: string };
  };
  ping: {
    request: void;
    response: "pong";
  };
};

const msg = createMessenger<Messages>();

// Simulated user fetch
async function fetchUser(id: number) {
  return { name: "John Doe", email: "john@example.com" };
}

const unsubscribe = msg.onMessage({
  getUser: async (payload, sender) => {
    // payload typed as { id: number }
    const user = await fetchUser(payload.id);
    return { name: user.name, email: user.email };
  },
  ping: () => "pong",
});
```

**Key points:**

- `onMessage()` wraps `chrome.runtime.onMessage.addListener`
- Async handlers work correctly — returns `true` to keep channel open
- Returns an unsubscribe function for cleanup
- `sender` is typed as `chrome.runtime.MessageSender`

## Step 4: Send Messages (Content Script / Popup)

```ts
// content.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  getUser: {
    request: { id: number };
    response: { name: string; email: string };
  };
  ping: {
    request: void;
    response: "pong";
  };
};

const msg = createMessenger<Messages>();

const user = await msg.send("getUser", { id: 42 });
// user typed as { name: string; email: string }

const pong = await msg.send("ping", undefined);
// pong typed as "pong"
```

## Step 5: Send to Specific Tabs (Background -> Content Script)

```ts
const result = await msg.sendTab(
  { tabId: 123 },
  "saveSettings",
  { theme: "dark", fontSize: 14 }
);

// With frame targeting
const result2 = await msg.sendTab(
  { tabId: 123, frameId: 0 },
  "ping",
  undefined
);
```

`TabMessageOptions`: `{ tabId: number; frameId?: number }`

## Step 6: Error Handling with MessagingError

```ts
import { createMessenger, MessagingError } from "@theluckystrike/webext-messaging";

type Messages = {
  getUser: {
    request: { id: number };
    response: { name: string; email: string };
  };
};

const msg = createMessenger<Messages>();

try {
  const user = await msg.send("getUser", { id: 1 });
} catch (err) {
  if (err instanceof MessagingError) {
    console.error("Messaging failed:", err.message);
    console.error("Original error:", err.originalError);
  }
}
```

`MessagingError` wraps `chrome.runtime.lastError`. Has `.originalError` for the underlying cause.

## Step 7: Using Low-Level Functions

```ts
import { sendMessage, sendTabMessage, onMessage } from "@theluckystrike/webext-messaging";

type Messages = {
  getUser: {
    request: { id: number };
    response: { name: string; email: string };
  };
  ping: {
    request: void;
    response: "pong";
  };
};

// Send to extension (background)
const user = await sendMessage<Messages, "getUser">("getUser", { id: 1 });

// Send to specific tab
const result = await sendTabMessage<Messages, "ping">(
  { tabId: 123 },
  "ping",
  undefined
);

// Register handlers (returns unsubscribe)
const unsub = onMessage<Messages>({
  ping: () => "pong",
});
```

## Step 8: Complete Example — Tab Manager Extension

This example demonstrates a complete extension with shared message types, a background script handler, and a popup sender.

### Shared Types (`src/types.ts`)

```ts
// Shared message types used by both background and popup
export type Messages = {
  getActiveTab: {
    request: void;
    response: { id: number; title: string; url: string } | null;
  };
  getTabTitle: {
    request: { tabId: number };
    response: string;
  };
  closeTab: {
    request: { tabId: number };
    response: boolean;
  };
};
```

### Background Script (`src/background.ts`)

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";
import type { Messages } from "./types";

const msg = createMessenger<Messages>();

// Get the currently active tab
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return null;
  return {
    id: tab.id,
    title: tab.title || "",
    url: tab.url || "",
  };
}

// Handler for messages from popup
const unsubscribe = msg.onMessage({
  getActiveTab: async () => {
    return await getActiveTab();
  },
  getTabTitle: async (payload) => {
    const tab = await chrome.tabs.get(payload.tabId);
    return tab.title || "";
  },
  closeTab: async (payload) => {
    try {
      await chrome.tabs.remove(payload.tabId);
      return true;
    } catch {
      return false;
    }
  },
});

// Cleanup on uninstall
// unsubscribe();
```

### Popup Script (`src/popup.ts`)

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";
import type { Messages } from "./types";

const msg = createMessenger<Messages>();

async function init() {
  // Get active tab info
  const tab = await msg.send("getActiveTab", undefined);
  
  if (tab) {
    console.log("Active tab:", tab.title, tab.url);
    
    // Get full title from background
    const fullTitle = await msg.send("getTabTitle", { tabId: tab.id });
    console.log("Full title:", fullTitle);
  }
  
  // Close button handler
  document.getElementById("close-btn")?.addEventListener("click", async () => {
    if (tab) {
      await msg.send("closeTab", { tabId: tab.id });
      window.close();
    }
  });
}

init();
```

## Wire Format

Messages sent as `Envelope`: `{ type: string, payload: request }`. Automatic — never construct manually.

## Next Steps

- [Storage Quickstart](storage-quickstart.md)
- [Permissions Quickstart](permissions-quickstart.md)
