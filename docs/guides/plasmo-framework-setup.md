---
layout: default
title: "Chrome Extension Plasmo Framework — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/plasmo-framework-setup/"
---
# Plasmo Framework Setup Guide

## What is Plasmo {#what-is-plasmo}
Plasmo is a browser extension framework built on top of Vite that provides a batteries-included developer experience. It handles boilerplate, build tooling, and common extension patterns so you can focus on your extension logic.

The framework supports React, Vue, Svelte, and vanilla TypeScript out of the box. It generates MV3 extensions with manifest v3 compliance and includes hot module replacement during development.

## Why Choose Plasmo Over Manual Setup {#why-choose-plasmo-over-manual-setup}
Manual extension setup requires configuring webpack or Vite from scratch, managing manifest.json, setting up content script injection, configuring the background service worker, and handling build output. Plasmo eliminates this friction.

The framework provides several key advantages. Developer experience improvements come from zero-config TypeScript support, automatic manifest generation, and built-in support for multiple frontend frameworks. Content script UI (CSUI) lets you render React, Vue, or Svelte components directly inside web pages without style conflicts using shadow DOM encapsulation. Built-in messaging via @plasmohq/messaging gives you type-safe communication between content scripts and the background worker. Auto-reloading works out of the box during development.

## Getting Started {#getting-started}
Initialize a new Plasmo project:

```bash
npx create-plasmo
```

Select your preferred framework. The CLI scaffolds this structure:

```
my-extension/
├── plasmo.conf.mjs
├── source/
│   ├── background.ts
│   ├── content.ts
│   ├── content-ui/
│   ├── options.tsx
│   └── popup.tsx
```

Plasmo automatically generates manifest.json based on files in source. Background scripts go in background.ts, content scripts in content.ts, Content Script UI in content-ui, popup in popup.tsx, and options in options.tsx.

## Content Script UI {#content-script-ui}
One of Plasmo's most powerful features is Content Script UI (CSUI). This lets you render UI components directly inside web pages while keeping them isolated using shadow DOM.

```tsx
import { useState } from "react";
import { createCSUI } from "@plasmohq/messaging/csui";

function MyPanel() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="my-panel">
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && <div className="content">Hello from CSUI</div>}
    </div>
  );
}

export default createCSUI({
  component: MyPanel,
  matches: ["<all_urls>"]
});
```

Inject from content script:

```ts
import MyPanel from "./content-ui/my-panel";
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "toggle-panel") MyPanel.toggle();
});
```

The component renders inside shadow DOM, so styles will not leak.

## Background Service Worker {#background-service-worker}
The background service worker works like a standard extension:

```ts
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.id) {
    // Handle tab update
  }
});
```

Plasmo handles the service worker lifecycle automatically.

## Messaging with @plasmohq/messaging {#messaging-with-plasmohqmessaging}
Plasmo provides a type-safe messaging API:

```ts
import { createMessageHandler } from "@plasmohq/messaging/handler";
const handler = createMessageHandler();

handler.handle("fetch-data", async (req) => {
  const response = await fetch(req.body.url);
  return { status: response.status };
});
```

Send messages from content scripts or popup:

```ts
import { sendMessage } from "@plasmohq/messaging";
const response = await sendMessage({
  name: "fetch-data",
  body: { url: "https://api.example.com" }
});
```

## Storage with @plasmohq/storage {#storage-with-plasmohqstorage}
Managing extension storage is simplified:

```ts
import { createStorage } from "@plasmohq/storage";
const storage = createStorage();

await storage.set("settings.theme", "dark");
const theme = await storage.get("settings.theme");

storage.watch("settings.theme", (newValue) => {
  console.log(`Theme changed to ${newValue}`);
});
```

## Building for Production {#building-for-production}
Build for distribution:

```bash
pnpm build
```

This generates a production-ready build in dist folder. Use pnpm package to create a zip for Chrome Web Store submission.

## Common Gotchas {#common-gotchas}
The service worker restarts frequently. Since MV3 service workers terminate after inactivity, always store state in chrome.storage rather than relying on in-memory variables.

Content Script UI requires the scripting permission. If CSUI components are not rendering, check that you have the "scripting" permission.

Hot reloading only works with the dev server running. In production builds, you need to manually reload the extension.

Message handlers must be registered at top level, not inside async functions.

For more details, check docs.plasmo.com. If you are building a production extension and need a reliable hosting platform, consider deploying your extension documentation or related web services at zovo.one.

## Related Articles {#related-articles}

- [Vite Setup](../guides/vite-extension-setup.md)
- [WXT Framework](../guides/wxt-framework-setup.md)
