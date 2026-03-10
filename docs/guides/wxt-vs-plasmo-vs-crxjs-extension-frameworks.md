---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "A comprehensive comparison of WXT, Plasmo, and CRXJS frameworks for Chrome extension development. Analyze architecture, HMR, TypeScript, bundle size, and community to choose the best framework for your project in 2026."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for Chrome extension development can significantly impact your development velocity, maintenance burden, and end-user experience. In this comprehensive comparison, we analyze **WXT**, **Plasmo**, and **CRXJS** across critical dimensions including architecture, developer experience, build output, and community support to help you make an informed decision for your 2026 projects.

## Table of Contents {#table-of-contents}

- [Framework Architecture Comparison](#framework-architecture-comparison)
- [Hot Module Replacement (HMR) Support](#hot-module-replacement-hmr-support)
- [TypeScript Integration](#typescript-integration)
- [Build Output Analysis](#build-output-analysis)
- [Cross-Browser Support](#cross-browser-support)
- [Community Size and Ecosystem](#community-size-and-ecosystem)
- [Documentation Quality](#documentation-quality)
- [Starter Templates](#starter-templates)
- [Real Project Migration Stories](#real-project-migration-stories)
- [Bundle Size Comparison](#bundle-size-comparison)
- [When to Use Each Framework](#when-to-use-each-framework)
- [Recommendation Matrix](#recommendation-matrix)

---

## Framework Architecture Comparison {#framework-architecture-comparison}

### WXT Architecture

WXT (Web eXtension) is built on top of Vite and takes a **zero-config approach** to Chrome extension development. It handles the complex manifest generation, multi-page builds, and content script bundling automatically. WXT uses a file-system-based routing system where your `entry/` directory structure directly maps to extension entry points.

The architecture separates concerns into distinct directories:
- `entry/background` for service workers
- `entry/popup` for popup UI
- `entry/options` for options page
- `entry/content` for content scripts

WXT's strength lies in its **automatic manifest generation** from your code structure, reducing boilerplate significantly. It also handles the intricacies of MV3 (Manifest V3) including service worker lifecycle management.

### Plasmo Architecture

Plasmo is a **framework-first** approach built on Next.js principles. It provides a React-centric development experience with built-in support for popups, options pages, content scripts, and background workers. Plasmo uses a declarative configuration system through `plasmo.config.js` rather than file-system conventions.

The framework emphasizes **component-based architecture** with first-class support for React. It handles message passing between contexts through a typed API and provides built-in storage abstractions. Plasmo also offers a unique "storage panel" for debugging and a hot-reload enabled development server.

### CRXJS Architecture

CRXJS (Chrome Extension JavaScript) takes a **Vite plugin approach**, integrating directly into your existing Vite workflow. It's more of a build tool than a full framework, focusing on the bundling and packaging process. CRXJS provides excellent TypeScript support and handles manifest generation through type-safe configurations.

Unlike WXT and Plasmo, CRXJS doesn't impose a specific project structure or framework choice. This flexibility makes it ideal for developers who want modern bundling without framework lock-in.

---

## Hot Module Replacement (HMR) Support {#hot-module-replacement-hmr-support}

### WXT HMR

WXT provides **comprehensive HMR** across all extension contexts. Changes to popup, options, and content scripts trigger automatic reload without losing extension state. The development server watches for file changes and injects updates in real-time. Background service workers receive updates on the next invocation rather than full reload, which aligns with Chrome's MV3 behavior.

```bash
npm run dev
# WXT starts development server with HMR enabled
```

### Plasmo HMR

Plasmo offers **live reload** through its development server, but with some caveats for background service workers. Due to MV3 restrictions, the service worker doesn't hot-reload; instead, it reloads completely on the next message or tab interaction. However, popup and options pages enjoy full HMR support. Plasmo's HMR is particularly smooth for React component changes.

### CRXJS HMR

CRXJS leverages Vite's HMR capabilities but requires manual configuration for extension-specific behaviors. Content scripts and popup pages receive HMR updates, while background service workers need manual triggering or extension reloading. The experience depends heavily on your specific setup and Vite configuration.

**Winner**: WXT provides the most seamless HMR experience out of the box, followed closely by Plasmo for React projects.

---

## TypeScript Integration {#typescript-integration}

### WXT TypeScript

WXT has **first-class TypeScript support** with zero additional configuration. Type definitions for Chrome APIs are included, and the framework generates type-safe manifest configurations. You can extend types through declaration files, and the build process maintains type safety throughout.

```typescript
// WXT automatically provides Chrome API types
chrome.runtime.sendMessage({ type: 'GET_DATA' }, (response) => {
  // response is properly typed
});
```

### Plasmo TypeScript

Plasmo provides excellent TypeScript integration with **generated types** for your messages, storage, and manifest. The framework uses Zod schemas to derive TypeScript types automatically. Plasmo's `useStorage` hook is fully typed, and message passing benefits from type inference.

```typescript
import { useStorage } from 'plasmohq/storage';

function MyComponent() {
  const [value, setValue] = useStorage<string>('my-key');
  // Fully typed without additional configuration
}
```

### CRXJS TypeScript

CRXJS relies on Vite's TypeScript handling, which is mature and well-documented. You'll need to configure type definitions for Chrome APIs manually, typically through `@types/chrome`. The manifest configuration in `vite.config.ts` can be strongly typed with proper setup.

**Winner**: WXT and Plasmo both excel with zero-config TypeScript, while CRXJS requires more manual setup but offers equal final quality.

---

## Build Output Analysis {#build-output-analysis}

### WXT Build Output

WXT produces **optimized, chunked output** with automatic code splitting. It generates separate bundles for each entry point, applying minification and tree-shaking. The output structure is clean and directly loadable by Chrome:

```
dist/
├── manifest.json (generated)
├── background/
│   └── index.js
├── popup/
│   └── index.js
├── content/
│   └── index.js
└── assets/
```

WXT also handles the complex MV3 requirement of serving content scripts as ES modules or traditional scripts based on your configuration.

### Plasmo Build Output

Plasmo generates a **well-organized output** with separate directories for each context. It uses Next.js-style bundling with optimized chunks. The build includes source maps for debugging and handles asset fingerprinting for caching.

```
build/
├── manifest.json
├── background.js
├── popup.html + popup.js
├── options.html + options.js
└── content.js
```

### CRXJS Build Output

CRXJS output depends on your Vite configuration. By default, it produces standard Vite-style chunks. The key advantage is full control over the output structure and chunking strategy. You can optimize for your specific use case, whether that's minimal initial load or efficient caching.

**Winner**: WXT produces the most extension-ready output with minimal configuration, while CRXJS offers the most control.

---

## Cross-Browser Support {#cross-browser-support}

### WXT Cross-Browser

WXT supports **Chrome, Firefox, Edge, and Opera** through a unified configuration. You can define browser-specific manifest overrides, and the build process generates appropriate packages for each target. The framework handles browser-specific API differences automatically.

### Plasmo Cross-Browser

Plasmo primarily targets Chrome/Chromium browsers but provides **limited Firefox support**. Firefox compatibility requires additional configuration and testing. The framework is actively improving cross-browser support but currently lags behind WXT.

### CRXJS Cross-Browser

CRXJS doesn't impose browser restrictions—your Vite configuration determines browser support. Combined with appropriate polyfills and conditional code, you can target any browser the WebExtensions API supports.

**Winner**: WXT provides the best cross-browser support out of the box.

---

## Community Size and Ecosystem {#community-size-and-ecosystem}

### WXT Community

WXT has grown rapidly since its 2022 release, with **5,000+ GitHub stars** and active development. The ecosystem includes official plugins for Vue, Svelte, and Tailwind CSS. Community contributions are active on GitHub discussions.

### Plasmo Community

Plasmo has established a **larger community** with 10,000+ GitHub stars and extensive documentation. The framework has a dedicated Discord server and active community forums. Numerous starter templates and example projects are available.

### CRXJS Community

CRXJS maintains a smaller but **highly dedicated community** with 3,000+ GitHub stars. It's maintained by a core team focused on quality over growth. The documentation is comprehensive, and issues receive prompt responses.

**Winner**: Plasmo leads in community size, but WXT shows the fastest growth trajectory.

---

## Documentation Quality {#documentation-quality}

### WXT Documentation

WXT provides **excellent documentation** with interactive examples, API references, and migration guides. The documentation covers all major features with code samples. However, some advanced topics could benefit from deeper exploration.

### Plasmo Documentation

Plasmo offers **comprehensive documentation** including video tutorials, API references, and conceptual guides. The Plasmo Docs site is well-organized and covers edge cases thoroughly. The framework's Next.js heritage makes the React patterns particularly well-documented.

### CRXJS Documentation

CRXJS documentation is **technical and precise**, focusing on the build process and configuration. It assumes familiarity with Vite and doesn't provide conceptual tutorials. For developers comfortable with Vite, this is efficient; for beginners, additional learning resources may be needed.

**Winner**: Plasmo provides the most accessible documentation for newcomers.

---

## Starter Templates {#starter-templates}

### WXT Starters

WXT offers official starters for:
- Vanilla JavaScript/TypeScript
- Vue 3
- Svelte
- React
- Tailwind CSS

Templates can be initialized with `npm create wxt@latest`.

### Plasmo Starters

Plasmo provides diverse starters including:
- Basic (minimal setup)
- With Redux
- With Tailwind CSS
- With messaging patterns
- Framework examples

Initialize with `npm create plasmo@latest`.

### CRXJS Starters

CRXJS doesn't provide official starters but works with any Vite template. You add the CRXJS plugin to an existing Vite project, giving maximum flexibility but requiring more setup effort.

**Winner**: Plasmo offers the most diverse official starters.

---

## Real Project Migration Stories {#real-project-migration-stories}

### Migrating to WXT

Teams migrating from raw webpack or manual manifest management report **significant reduction in build configuration time**—often from days to hours. The automatic manifest generation eliminates a common source of bugs. Service worker handling improvements have resolved MV3 migration pain points for several projects.

### Migrating to Plasmo

React teams moving from Create React App or custom webpack setups praise Plasmo's **component-centric approach**. The storage abstractions simplify data management, and the message typing reduces runtime errors. Some teams report a learning curve around the Plasmo-specific patterns.

### Migrating to CRXJS

Developers with existing Vite projects find CRXJS migration straightforward. The primary benefit is **improved build times** and better chunking. The tradeoff is losing some automatic features that WXT and Plasmo provide.

---

## Bundle Size Comparison {#bundle-size-comparison}

For a typical extension with popup, options page, and content script using React:

| Framework | Initial Bundle | Gzipped |
|-----------|---------------|---------|
| WXT | ~85 KB | ~28 KB |
| Plasmo | ~120 KB | ~40 KB |
| CRXJS (custom) | Variable | Variable |

WXT's smaller bundle size results from its tree-shaking optimization and minimal runtime overhead. Plasmo's larger size comes from the Next.js foundation, but this includes additional features. CRXJS bundle size depends entirely on your configuration.

**Winner**: WXT produces the smallest bundles by default.

---

## When to Use Each Framework {#when-to-use-each-framework}

### Choose WXT When:

- You want **zero-configuration** setup
- Cross-browser support is critical
- Bundle size is a priority
- You prefer file-system routing over config files
- You need excellent HMR experience

### Choose Plasmo When:

- You're building a **React-first** extension
- You want extensive starter templates
- You need storage abstractions and message typing
- Community support is important to you
- You prefer convention over configuration

### Choose CRXJS When:

- You have an **existing Vite project**
- You need maximum control over build output
- You're comfortable with manual configuration
- You want framework-agnostic flexibility

---

## Recommendation Matrix {#recommendation-matrix}

| Criteria | WXT | Plasmo | CRXJS |
|----------|-----|--------|-------|
| **Ease of Setup** | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| **TypeScript** | ★★★★★ | ★★★★★ | ★★★★☆ |
| **HMR Experience** | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| **Bundle Size** | ★★★★★ | ★★★★☆ | ★★★★☆ |
| **Cross-Browser** | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| **Community** | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| **Documentation** | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| **Flexibility** | ★★★★☆ | ★★★☆☆ | ★★★★★ |

### Final Verdict

For **2026 Chrome extension development**, we recommend:

1. **WXT** for new projects prioritizing developer experience, cross-browser support, and minimal bundle size
2. **Plasmo** for React teams wanting extensive ecosystem support and starter templates
3. **CRXJS** for existing Vite projects requiring maximum build control

All three frameworks are production-ready and actively maintained. Your choice should align with your team expertise, project requirements, and long-term maintenance considerations.

---

## Related Articles {#related-articles}

- [TypeScript Setup Guide](../guides/typescript-setup.md)
- [Chrome Extension Development Tutorial](../guides/chrome-extension-development-tutorial-typescript-2026.md)
- [Cross-Browser Extension Development](../guides/cross-browser-extension-development.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
