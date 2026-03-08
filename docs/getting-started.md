---

title: Chrome Extension Getting Started — Your Complete Guide
description: Learn how to build Chrome extensions from scratch. Step-by-step tutorials, starter templates, and the @theluckystrike/webext-* package ecosystem.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/getting-started/"

---

# Chrome Extension Getting Started

Welcome to the Chrome Extension Guide! This comprehensive resource will take you from zero to publishing your first Chrome extension in minutes.

## Quick Start: Choose Your Path {#quick-start-choose-your-path}

### 🎯 I'm New to Chrome Extensions {#im-new-to-chrome-extensions}

Start here if you've never built a Chrome extension before:

1. **Pick a Starter Template** — Choose a framework that matches your experience:
   - **[Vanilla TypeScript Starter](/chrome-extension-guide/docs/tutorials/build-...)** — Minimal, fast, no framework overhead
   - **[React Starter](https://github.com/theluckystrike/chrome-extension-react-starter)** — React 18 + TypeScript + Vite
   - **[Vue Starter](https://github.com/theluckystrike/chrome-extension-vue-starter)** — Vue 3 + TypeScript + Vite
   - **[Svelte Starter](https://github.com/theluckystrike/chrome-extension-svelte-starter)** — Svelte 4 + TypeScript + Vite

2. **Follow a Tutorial** — Build a complete extension while learning:
   - [Build a Bookmark Manager](/chrome-extension-guide/docs/tutorials/build-bookmark-manager/)
   - [Build a Dark Mode Toggle](/chrome-extension-guide/docs/tutorials/build-dark-mode/)
   - [Build a Color Picker](/chrome-extension-guide/docs/tutorials/build-color-picker/)
   - [Build an AI Writing Assistant](/chrome-extension-guide/docs/tutorials/build-ai-writing-assistant/)

### 🛠️ I Know the Basics — Show Me the Code {#i-know-the-basics-show-me-the-code}

Jump directly to the API reference and patterns:

- **[API Reference](/chrome-extension-guide/docs/api-reference/)** — Complete Chrome APIs documentation
- **[Extension Patterns](/chrome-extension-guide/docs/patterns/)** — Proven patterns for messaging, storage, permissions
- **[Permissions Guide](/chrome-extension-guide/docs/permissions/)** — Understanding Chrome permissions

### 📦 I Need the @theluckystrike/webext-* Packages {#i-need-the-theluckystrikewebext-packages}

Our TypeScript packages make Chrome extension development type-safe and enjoyable:

| Package | What It Does | npm Install |
|---------|--------------|-------------|
| **[webext-storage](/chrome-extension-guide/)** | Typed storage with schema validation | `npm i @theluckystrike/webext-storage` |
| **[webext-messaging](/chrome-extension-guide/)** | Promise-based message passing | `npm i @theluckystrike/webext-messaging` |
| **[webext-permissions](/chrome-extension-guide/)** | Runtime permission helpers | `npm i @theluckystrike/webext-permissions` |
| **[webext-tabs](/chrome-extension-guide/)** | Tab management utilities | `npm i @theluckystrike/webext-tabs` |
| **[webext-badge](/chrome-extension-guide/)** | Badge text and color | `npm i @theluckystrike/webext-badge` |
| **[webext-context-menu](/chrome-extension-guide/)** | Context menu builder | `npm i @theluckystrike/webext-context-menu` |
| **[webext-notifications](/chrome-extension-guide/)** | Toast notifications | `npm i @theluckystrike/webext-notifications` |
| **[webext-offscreen](/chrome-extension-guide/)** | Offscreen document API | `npm i @theluckystrike/webext-offscreen` |

### 🖥️ Specialized Starters {#specialized-starters}

Need a specific extension type? We have dedicated starters:

| Extension Type | Starter Template |
|----------------|------------------|
| Popup only | [chrome-extension-popup-starter](https://github.com/theluckystrike/chrome-extension-popup-starter) |
| Side panel | [chrome-extension-side-panel-starter](https://github.com/theluckystrike/chrome-extension-side-panel-starter) |
| DevTools panel | [chrome-extension-devtools-starter](https://github.com/theluckystrike/chrome-extension-devtools-starter) |
| Content script only | [chrome-extension-content-script-starter](https://github.com/theluckystrike/chrome-extension-content-script-starter) |
| Full-stack | [chrome-extension-full-stack-starter](https://github.com/theluckystrike/chrome-extension-full-stack-starter) |

## What You'll Learn {#what-youll-learn}

### Core Concepts {#core-concepts}
- **Manifest V3** — The latest Chrome extension manifest format
- **Background Scripts** — Service workers for long-running tasks
- **Content Scripts** — Injecting code into web pages
- **Popup & Options** — User interface for extensions
- **Message Passing** — Communication between extension parts
- **Storage API** — Persisting data locally or in the cloud (sync)

### Best Practices {#best-practices}
- **Type Safety** — Using TypeScript with Chrome APIs
- **Security** — Handling user data responsibly
- **Performance** — Optimizing extension load times
- **Publishing** — Listing your extension on the Chrome Web Store

## Next Steps {#next-steps}

1. **Clone a Starter Template** — Pick from our [React](https://github.com/theluckystrike/chrome-extension-react-starter), [Vue](https://github.com/theluckystrike/chrome-extension-vue-starter), [Svelte](https://github.com/theluckystrike/chrome-extension-svelte-starter), or [Vanilla TS](https://github.com/theluckystrike/chrome-extension-vanilla-ts-starter) options

2. **Install the Packages** — Add type safety with our webext-* packages:
   ```bash
   npm i @theluckystrike/webext-storage @theluckystrike/webext-messaging
   ```

3. **Follow a Tutorial** — Build something real with our [step-by-step guides](/chrome-extension-guide/docs/tutorials/)

4. **Read the Patterns** — Learn proven approaches in [Extension Patterns](/chrome-extension-guide/docs/patterns/)

## Resources {#resources}

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Web Store Publish](https://developer.chrome.com/docs/webstore/publish/)
- [Manifest V3 Migration Guide](/chrome-extension-guide/docs/mv3/)
- [Package Catalog](/chrome-extension-guide/docs/package-catalog/)

---

**Built by [theluckystrike](https://github.com/theluckystrike) — Part of the [zovo.one](https://zovo.one) ecosystem**
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
