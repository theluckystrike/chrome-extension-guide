# Chrome Extension Guide

[![webext-storage - npm version badge](https://img.shields.io/npm/v/@theluckystrike/webext-storage?label=webext-storage)](https://www.npmjs.com/package/@theluckystrike/webext-storage)
[![webext-messaging - npm version badge](https://img.shields.io/npm/v/@theluckystrike/webext-messaging?label=webext-messaging)](https://www.npmjs.com/package/@theluckystrike/webext-messaging)
[![webext-permissions - npm version badge](https://img.shields.io/npm/v/@theluckystrike/webext-permissions?label=webext-permissions)](https://www.npmjs.com/package/@theluckystrike/webext-permissions)
[![GitHub stars](https://img.shields.io/github/stars/theluckystrike/chrome-extension-guide?style=flat&color=FFD700)](https://github.com/theluckystrike/chrome-extension-guide/stargazers)
[![License](https://img.shields.io/github/license/theluckystrike/chrome-extension-guide?color=blue)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/theluckystrike/chrome-extension-guide?color=green)](https://github.com/theluckystrike/chrome-extension-guide/commit/main)
[![webext-storage](https://img.shields.io/npm/v/@theluckystrike/webext-storage?label=webext-storage)](https://www.npmjs.com/package/@theluckystrike/webext-storage)
[![webext-messaging](https://img.shields.io/npm/v/@theluckystrike/webext-messaging?label=webext-messaging)](https://www.npmjs.com/package/@theluckystrike/webext-messaging)
[![webext-permissions](https://img.shields.io/npm/v/@theluckystrike/webext-permissions?label=webext-permissions)](https://www.npmjs.com/package/@theluckystrike/webext-permissions)

> The complete resource for building production-ready Chrome extensions with TypeScript. Step-by-step tutorials, API references, design patterns, and the @theluckystrike/webext-* toolkit.

## ✨ Features

- **📚 Comprehensive Documentation** — From getting started to advanced patterns, covers every aspect of Chrome extension development
- **🛠️ Type-Safe Packages** — @theluckystrike/webext-* toolkit for typed storage, messaging, and permissions
- **🚀 Starter Templates** — Pre-configured templates for React, Vue, Svelte, and Vanilla TypeScript
- **📖 50+ Tutorials** — Hands-on guides to build real-world extensions
- **🔐 Best Practices** — Security, performance, and production-ready patterns

## 🚀 Quick Start

```bash
# Install the type-safe packages
npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging @theluckystrike/webext-permissions
```

```typescript
// Type-safe storage with schema validation
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  theme: "dark" as "dark" | "light",
  count: 0,
});

const storage = createStorage({ schema, area: "local" });
await storage.set("theme", "light");
```

**Choose a Starter Template:**
- [React Starter](https://github.com/theluckystrike/chrome-extension-react-starter)
- [Vue Starter](https://github.com/theluckystrike/chrome-extension-vue-starter)
- [Svelte Starter](https://github.com/theluckystrike/chrome-extension-svelte-starter)
- [Vanilla TS Starter](https://github.com/theluckystrike/chrome-extension-vanilla-ts-starter)

## 📋 Table of Contents

### Getting Started
- [Getting Started](docs/getting-started.md)

### Guides
- [Guides Overview](docs/guides/index.md)
  - [Extension Architecture](docs/guides/extension-architecture.md)
  - [Service Worker Lifecycle](docs/guides/service-worker-lifecycle.md)
  - [Background Patterns](docs/guides/background-patterns.md)
  - [Content Script Patterns](docs/guides/content-script-patterns.md)
  - [Tab Management](docs/guides/tab-management.md)
  - [Window Management](docs/guides/window-management.md)
  - [Bookmark API](docs/guides/bookmark-api.md)
  - [Context Menus](docs/guides/context-menus.md)
  - [Download Management](docs/guides/download-management.md)
  - [Alarms Scheduling](docs/guides/alarms-scheduling.md)
  - [Notifications](docs/guides/notifications-guide.md)
  - [Popup Patterns](docs/guides/popup-patterns.md)
  - [Options Page](docs/guides/options-page.md)
  - [DevTools Extensions](docs/guides/devtools-extensions.md)
  - [Manifest Reference](docs/guides/manifest-json-reference.md)
  - [Security Best Practices](docs/guides/security-best-practices.md)
  - [Performance Optimization](docs/guides/performance.md)
  - [Memory Management](docs/guides/memory-management.md)
  - [Debugging](docs/guides/debugging-extensions.md)
  - [Testing](docs/guides/testing-extensions.md)
  - [Accessibility](docs/guides/accessibility.md)
  - [Internationalization](docs/guides/internationalization.md)
  - [Cross-Browser Development](docs/guides/cross-browser.md)
  - [Extension Updates](docs/guides/extension-updates.md)
  - [Chrome Web Store API](docs/guides/chrome-web-store-api.md)

### API Reference
- [API Reference](docs/api-reference/index.md)
  - [Tabs API](docs/api-reference/tabs-api.md)
  - [Windows API](docs/api-reference/windows-api.md)
  - [Bookmarks API](docs/api-reference/bookmarks-api.md)
  - [History API](docs/api-reference/history-api.md)
  - [Downloads API](docs/api-reference/downloads-api.md)
  - [Alarms API](docs/api-reference/alarms-api.md)
  - [Notifications API](docs/api-reference/notifications-api.md)
  - [Context Menus API](docs/api-reference/context-menus-api.md)
  - [Storage API Deep Dive](docs/api-reference/storage-api-deep-dive.md)
  - [Runtime API](docs/api-reference/runtime-api.md)

### Design Patterns
- [Design Patterns](docs/patterns/index.md)
  - [Authentication Patterns](docs/patterns/authentication-patterns.md)
  - [State Management](docs/patterns/state-management.md)
  - [Message Passing](docs/patterns/event-driven-messaging.md)
  - [Content Script Communication](docs/patterns/content-script-communication-bridge.md)
  - [Storage Patterns](docs/patterns/storage-encryption.md)
  - [Performance Profiling](docs/patterns/performance-profiling.md)

### Permissions
- [Permissions Guide](docs/permissions/index.md)
  - [activeTab](docs/permissions/activeTab.md)
  - [alarms](docs/permissions/alarms.md)
  - [bookmarks](docs/permissions/bookmarks.md)
  - [contextMenus](docs/permissions/contextMenus.md)
  - [cookies](docs/permissions/cookies.md)
  - [debugger](docs/permissions/debugger.md)
  - [declarativeNetRequest](docs/permissions/declarativeNetRequest.md)
  - [downloads](docs/permissions/downloads.md)
  - [history](docs/permissions/history.md)
  - [identity](docs/permissions/identity.md)
  - [notifications](docs/permissions/notifications.md)
  - [proxy](docs/permissions/proxy.md)
  - [scripting](docs/permissions/scripting.md)
  - [storage](docs/permissions/storage.md)
  - [tabs](docs/permissions/tabs.md)
  - [tts](docs/permissions/tts.md)
  - [webRequest](docs/permissions/webRequest.md)

### Manifest V3
- [Manifest V3 Guide](docs/mv3/index.md)
  - [Service Workers](docs/mv3/service-workers.md)
  - [Promise-Based APIs](docs/mv3/promise-based-apis.md)
  - [Offscreen Documents](docs/mv3/offscreen-documents.md)
  - [Side Panel](docs/mv3/side-panel.md)
  - [Migration Checklist](docs/mv3/migration-checklist.md)

### Tutorials
- [Tutorials](docs/tutorials/index.md)
  - [Storage Quickstart](docs/tutorials/storage-quickstart.md)
  - [Messaging Quickstart](docs/tutorials/messaging-quickstart.md)
  - [Permissions Quickstart](docs/tutorials/permissions-quickstart.md)
  - [Build a Bookmark Manager](docs/tutorials/build-bookmark-manager.md)
  - [Build a Dark Mode Toggle](docs/tutorials/build-dark-mode.md)
  - [Build a Color Picker](docs/tutorials/build-color-picker.md)
  - [Build an AI Writing Assistant](docs/tutorials/build-ai-writing-assistant.md)

### Publishing
- [Publishing Guide](docs/publishing/index.md)
  - [Publishing Guide](docs/publishing/publishing-guide.md)
  - [Listing Optimization](docs/publishing/listing-optimization.md)
  - [Beta Testing](docs/publishing/beta-testing.md)
  - [Common Rejections](docs/publishing/common-rejections.md)

### Packages
- [Package Catalog](docs/package-catalog.md)
  - [@theluckystrike/webext-storage](https://www.npmjs.com/package/@theluckystrike/webext-storage)
  - [@theluckystrike/webext-messaging](https://www.npmjs.com/package/@theluckystrike/webext-messaging)
  - [@theluckystrike/webext-permissions](https://www.npmjs.com/package/@theluckystrike/webext-permissions)

## 📦 Packages

### @theluckystrike/webext-storage
Typed Chrome storage wrapper with schema validation.

```typescript
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  theme: "dark" as "dark" | "light",
  count: 0,
  enabled: true,
});

const storage = createStorage({ schema, area: "local" });
await storage.set("theme", "light");
const theme = await storage.get("theme"); // typed as "dark" | "light"
```

### @theluckystrike/webext-messaging
Promise-based typed message passing for Chrome extensions.

```typescript
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  getUser: { request: { id: number }; response: { name: string } };
  ping: { request: void; response: "pong" };
};

const msg = createMessenger<Messages>();
const user = await msg.send("getUser", { id: 1 });
```

### @theluckystrike/webext-permissions
Runtime permission helpers with human-readable descriptions.

```typescript
import { checkPermission, requestPermission } from "@theluckystrike/webext-permissions";

const result = await checkPermission("tabs");
console.log(result.description); // "Read information about open tabs"

if (!result.granted) {
  const req = await requestPermission("tabs");
  if (req.granted) console.log("Permission granted!");
}
```

## PACKAGE CATALOG

Browse the complete **[Package Catalog](docs/package-catalog.md)** — every `@theluckystrike` package organized by category: Storage, Tabs & Windows, UI Components, Messaging, Security, Browser APIs, System APIs, and Utilities.

## INTEGRATION EXAMPLES

See [examples/](examples/) for complete working examples using multiple packages together:

- [Tab Manager with Storage](examples/tab-manager-with-storage/) — webext-storage + webext-messaging + webext-permissions
- [Page Analyzer](examples/page-analyzer/) — webext-storage + webext-messaging + context menus
- [Clipboard Manager](examples/clipboard-manager/) — webext-storage + webext-messaging + offscreen API

## TEMPLATES

Looking for a starting point? The [Chrome Extension Toolkit](https://github.com/theluckystrike/chrome-extension-toolkit) features 10 fully configured starter repositories:

- [React Starter](https://github.com/theluckystrike/chrome-extension-react-starter)
- [Svelte Starter](https://github.com/theluckystrike/chrome-extension-svelte-starter)
- [Vue Starter](https://github.com/theluckystrike/chrome-extension-vue-starter)
- [Vanilla TS Starter](https://github.com/theluckystrike/chrome-extension-vanilla-ts-starter)
- [Content Script Starter](https://github.com/theluckystrike/chrome-extension-content-script-starter)
- [Popup Starter](https://github.com/theluckystrike/chrome-extension-popup-starter)
- [DevTools Starter](https://github.com/theluckystrike/chrome-extension-devtools-starter)
- [Side Panel Starter](https://github.com/theluckystrike/chrome-extension-side-panel-starter)
- [Full-Stack Starter](https://github.com/theluckystrike/chrome-extension-full-stack)
- [Minimal MV3 Starter](https://github.com/theluckystrike/chrome-extension-mv3-minimal)

## INSTALLATION

```bash
npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging @theluckystrike/webext-permissions
```

## API REFERENCE

- [Tabs API](docs/api-reference/tabs-api.md)
- [Windows API](docs/api-reference/windows-api.md)
- [Bookmarks API](docs/api-reference/bookmarks-api.md)
- [History API](docs/api-reference/history-api.md)
- [Downloads API](docs/api-reference/downloads-api.md)
- [Alarms API](docs/api-reference/alarms-api.md)
- [Notifications API](docs/api-reference/notifications-api.md)
- [Context Menus API](docs/api-reference/context-menus-api.md)
- [Storage API Deep Dive](docs/api-reference/storage-api-deep-dive.md)
- [Runtime API](docs/api-reference/runtime-api.md)

## GUIDES

- [Extension Architecture](docs/guides/extension-architecture.md)
- [Service Worker Lifecycle](docs/guides/service-worker-lifecycle.md)
- [Background Service Worker Patterns](docs/guides/background-patterns.md)
- [Content Script Patterns](docs/guides/content-script-patterns.md)
- [Content Script Isolation](docs/guides/content-script-isolation.md)
- [Tab Management Patterns](docs/guides/tab-management.md)
- [Window Management](docs/guides/window-management.md)
- [Bookmark API Guide](docs/guides/bookmark-api.md)
- [Context Menus](docs/guides/context-menus.md)
- [Download Management](docs/guides/download-management.md)
- [Background Scheduling with Alarms](docs/guides/alarms-scheduling.md)
- [Rich Notifications](docs/guides/notifications-guide.md)
- [Popup Patterns](docs/guides/popup-patterns.md)
- [Building an Options Page](docs/guides/options-page.md)
- [Building DevTools Extensions](docs/guides/devtools-extensions.md)
- [manifest.json Reference](docs/guides/manifest-json-reference.md)
- [Security Best Practices](docs/guides/security-best-practices.md)
- [Performance Optimization](docs/guides/performance.md)
- [Memory Management](docs/guides/memory-management.md)
- [Debugging Extensions](docs/guides/debugging-extensions.md)
- [Testing Extensions](docs/guides/testing-extensions.md)
- [Accessibility](docs/guides/accessibility.md)
- [Internationalization (i18n)](docs/guides/internationalization.md)
- [Cross-Browser Development](docs/guides/cross-browser.md)
- [Handling Extension Updates](docs/guides/extension-updates.md)
- [Chrome Web Store Publish API](docs/guides/chrome-web-store-api.md)

## MONETIZATION

> Ready to make money from your Chrome extension? Check out the
> [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) —
> covering freemium, subscriptions, Stripe integration, pricing strategies, and more.

- [Market Research](docs/monetization/market-research.md)

## PERMISSIONS

- [activeTab](docs/permissions/activeTab.md)
- [alarms](docs/permissions/alarms.md)
- [bookmarks](docs/permissions/bookmarks.md)
- [contextMenus](docs/permissions/contextMenus.md)
- [cookies](docs/permissions/cookies.md)
- [debugger](docs/permissions/debugger.md)
- [declarativeNetRequest](docs/permissions/declarativeNetRequest.md)
- [downloads](docs/permissions/downloads.md)
- [history](docs/permissions/history.md)
- [identity](docs/permissions/identity.md)
- [notifications](docs/permissions/notifications.md)
- [proxy](docs/permissions/proxy.md)
- [scripting](docs/permissions/scripting.md)
- [storage](docs/permissions/storage.md)
- [tabs](docs/permissions/tabs.md)
- [tts](docs/permissions/tts.md)
- [webRequest](docs/permissions/webRequest.md)

## TUTORIALS

- [Storage Quickstart](docs/tutorials/storage-quickstart.md)
- [Messaging Quickstart](docs/tutorials/messaging-quickstart.md)
- [Permissions Quickstart](docs/tutorials/permissions-quickstart.md)

## REQUIREMENTS
## 🔧 Requirements

- Chrome 116+ (Manifest V3)
- TypeScript 5.0+

## 📜 License

MIT

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on how to get started.

---

Built at [zovo.one](https://zovo.one) by [theluckystrike](https://github.com/theluckystrike)

## Related Projects
- [Claude Skills Guide](https://theluckystrike.github.io/claude-skills-guide/) — 700+ Claude Code tutorials
- [Chrome Tips](https://theluckystrike.github.io/chrome-tips/) — Chrome performance optimization guides
