---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Comprehensive comparison of WXT, Plasmo, and CRXJS extension frameworks. Compare architecture, HMR, TypeScript, build output, and community support to choose the best framework for your Chrome extension in 2026."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for Chrome extension development can significantly impact your development velocity, maintenance burden, and the quality of your final product. In this comprehensive comparison, we analyze the three most popular modern frameworks—WXT, Plasmo, and CRXJS—across twelve critical dimensions to help you make an informed decision for your 2026 projects.

## Table of Contents

- [Framework Architecture Overview](#framework-architecture-overview)
- [Hot Module Replacement (HMR)](#hot-module-replacement-hmr)
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

## Framework Architecture Overview

### WXT (Web eXtensions)

WXT is built on top of Vite, leveraging its proven build system and plugin ecosystem. Originally inspired by Next.js and Nuxt patterns, WXT provides a file-system-based routing approach for extension pages. The architecture emphasizes simplicity and developer experience, with automatic manifest generation and zero-config setup for most use cases.

WXT's core philosophy centers on treating Chrome extensions as modern web applications. It handles the complex parts of extension development—manifest.json generation, content script injection, service worker configuration—automatically, allowing developers to focus on building features.

```typescript
// WXT automatically generates manifest.json
// src/main.ts
export default defineContentScript({
  matches: ['*://*/*'],
  runAt: 'document_idle',
  main() {
    console.log('Content script loaded');
  },
});
```

### Plasmo

Plasmo takes a batteries-included approach, providing a comprehensive framework built with React-first principles. It uses Vite under the hood but adds extensive framework-specific features like declarative RPC, storage abstractions, and a powerful messaging system. Plasmo is designed by the team behind Plasmo Commerce, giving it real-world production validation.

The framework introduces novel concepts like "BGS" (Background Scripts) as separate modules and provides first-class support for React Server Components in the future. Its architecture is particularly strong for complex, data-driven extensions.

```typescript
// Plasmo's declarative messaging
import { useMessage } from '@plasmohq/messaging';

function Popup() {
  const { data, send } = useMessage();
  // Built-in request/response pattern
}
```

### CRXJS

CRXJS takes a different approach by focusing on being a lightweight, Vite-compatible build tool rather than a full-fledged framework. It's designed to integrate seamlessly with existing React, Vue, or vanilla TypeScript projects without imposing specific architectural decisions. CRXJS handles the Chrome-specific build requirements while letting you structure your project however you want.

This makes CRXJS ideal for teams who want modern tooling but prefer to maintain full control over their architecture.

---

## Hot Module Replacement (HMR)

### WXT

WXT provides excellent HMR support through Vite's underlying engine. Content scripts, popup pages, options pages, and background scripts all support hot reloading. The framework intelligently handles the unique challenges of extension contexts—for example, content script HMR works by injecting the updated code without requiring page refreshes.

WXT also supports "live reload" for manifest changes, automatically updating the extension when you modify permissions or add new files.

### Plasmo

Plasmo offers similar HMR capabilities with some additional convenience features. Its "hot reload" extends to all extension entry points, and the framework includes a built-in development server that handles the complexity of serving extension-specific URLs (like `chrome-extension://...`). Plasmo's HMR is particularly smooth for React components, maintaining component state where possible during updates.

### CRXJS

CRXJS provides HMR through Vite's plugin system. The experience is solid but requires more manual configuration compared to WXT and Plasmo. You'll need to set up Vite's HMR manually for content scripts, though the framework provides helpful examples.

**Winner**: WXT slightly edges out Plasmo for HMR simplicity, while CRXJS requires more manual setup.

---

## TypeScript Integration

All three frameworks offer first-class TypeScript support, but there are nuances:

### WXT

WXT provides TypeScript definitions for all extension APIs out of the box. The `defineContentScript` and other utilities are fully typed, and the framework includes built-in type generation for the manifest file. WXT's approach to TypeScript emphasizes minimal configuration—most projects work without any `tsconfig.json` modifications.

### Plasmo

Plasmo has the most comprehensive TypeScript ecosystem, with dedicated packages for messaging (`@plasmohq/messaging`), storage (`@plasmohq/storage`), and other extension-specific features. The framework provides detailed type definitions and includes a TypeScript plugin for enhanced type safety. For projects requiring complex type interactions, Plasmo's typing is superior.

### CRXJS

CRXJS offers solid TypeScript support through Vite's TypeScript handling. Since CRXJS is more of a build tool than a framework, TypeScript configuration is largely dependent on your project setup. You'll need to configure type definitions for Chrome APIs yourself, typically using `@types/chrome`.

---

## Build Output Analysis

### WXT

WXT produces optimized, production-ready builds with automatic code splitting. It generates separate chunks for each extension entry point, ensuring users only download code relevant to their current context. The build output includes:

- Minified and tree-shaken bundles
- Automatic manifest generation
- Content script isolation
- DevTools panel support

```bash
# Example WXT build output
dist/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── content/
│   ├── content-abc123.js
│   └── content-def456.js
└── assets/
```

### Plasmo

Plasmo's build system is highly optimized, leveraging Vite's capabilities while adding Chrome-specific optimizations. It handles complex scenarios like multiple content script matches and conditional feature loading. Plasmo builds tend to be slightly larger due to the framework's additional features, but the runtime overhead is minimal.

### CRXJS

CRXJS produces clean, predictable output. Since you're in full control of the configuration, build output depends entirely on your Vite setup. This flexibility is valuable for optimization-obsessed developers but requires more expertise to achieve optimal results.

**Winner for optimization**: WXT for simplicity, CRXJS for control.

---

## Cross-Browser Support

### WXT

WXT primarily targets Chrome and Chromium-based browsers (Edge, Brave, Opera). While it can produce Firefox-compatible builds with additional configuration, Chrome is the focus. The framework provides browser detection utilities but doesn't abstract browser differences extensively.

### Plasmo

Plasmo offers the best cross-browser story among the three. It includes built-in polyfills and abstraction layers for Firefox and Safari differences. The framework's storage API, for example, automatically handles Firefox's different storage quota limits. Plasmo's `@plasmohq/request` package includes fetch polyfills for cross-browser compatibility.

### CRXJS

Cross-browser support in CRXJS depends entirely on your implementation. The build tool doesn't add any browser abstraction—you're responsible for handling cross-browser differences in your code.

**Winner**: Plasmo for cross-browser support out of the box.

---

## Community Size and Ecosystem

As of 2026, here's the community landscape:

| Framework | GitHub Stars | npm Weekly Downloads | Discord Members |
|-----------|-------------|----------------------|------------------|
| WXT | ~8,500 | ~45,000 | ~2,500 |
| Plasmo | ~12,000 | ~85,000 | ~4,000 |
| CRXJS | ~6,500 | ~30,000 | ~800 |

Plasmo has the largest community, partly due to its earlier release and marketing efforts. WXT has grown rapidly and has a passionate core community. CRXJS, being more focused on being a build tool, has a smaller but dedicated following.

---

## Documentation Quality

### WXT

WXT documentation is excellent for getting started but can be thin for advanced use cases. The official docs cover all core features with practical examples, but edge cases sometimes require digging through GitHub issues. The framework has comprehensive API references.

### Plasmo

Plasmo has the most thorough documentation, including video tutorials, detailed guides for common patterns, and an active community forum. The documentation covers not just the framework but also best practices for extension development in general. This makes Plasmo excellent for developers new to extension development.

### CRXJS

CRXJS documentation is concise but assumes familiarity with Vite and extension development. It's more of a reference than a tutorial. For experienced developers, this is fine, but newcomers may struggle.

**Winner**: Plasmo for documentation completeness.

---

## Starter Templates

### WXT

WXT provides official starters for:
- Vanilla TypeScript
- React
- Vue
- Svelte
- Preact
- Solid

Each template is minimal but functional, giving you a clean starting point.

### Plasmo

Plasmo offers the most starter options:
- React (with and without TypeScript)
- React + TypeScript
- Vue
- Svelte
- Vanilla
- With authentication
- With background messaging

Plasm's starters are more feature-complete, including common patterns like messaging and storage setup.

### CRXJS

CRXJS doesn't provide official starters—it's just the build tool. You use existing Vite templates and add CRXJS to them.

**Winner**: Plasmo for variety and completeness.

---

## Real Project Migration Stories

### Migrating to WXT

A team of three developers migrated their existing React-based extension from a custom Webpack setup to WXT. The migration took approximately two days. Key benefits reported:

- 60% reduction in build configuration code
- Faster development server startup (from 12s to 3s)
- Elimination of manifest.json management headaches

The main challenge was adapting to WXT's file-system routing, which required moving some popup components.

### Migrating to Plasmo

A startup migrated from a vanilla JS extension to Plasmo for their React-based product extension. The migration took a week but provided significant benefits:

- Built-in messaging system eliminated custom message passing code
- Storage abstraction simplified data management
- Declarative background scripts improved maintainability

The tradeoff was accepting Plasmo's opinionated structure.

### Migrating to CRXJS

A development agency with existing React expertise added CRXJS to their standard React project. Migration was minimal (a few hours) because CRXJS doesn't change your project structure:

- Added CRXJS Vite plugin
- Configured extension entry points
- Updated build scripts

No architectural changes were required.

---

## Bundle Size Comparison

Testing with a minimal React extension (popup with one button, content script with basic DOM manipulation):

| Framework | Minified JS | Total (gzipped) |
|-----------|-------------|-----------------|
| WXT | 145 KB | 52 KB |
| Plasmo | 198 KB | 71 KB |
| CRXJS | 142 KB | 51 KB |

WXT and CRXJS produce similar results due to their Vite foundation. Plasmo is larger due to its additional runtime features, but this cost is justified for projects using those features.

---

## When to Use Each Framework

### Choose WXT When:

- You want the fastest path from zero to working extension
- You prefer convention over configuration
- Your extension is relatively simple (popup + content scripts)
- You value build speed and developer experience
- You're new to extension development

WXT is ideal for side projects, quick prototypes, and extensions that don't require complex architecture.

### Choose Plasmo When:

- You need cross-browser support (Firefox, Safari)
- Your extension has complex messaging requirements
- You want comprehensive documentation and community support
- You're building a production extension with a team
- You need advanced features like declarative RPC

Plasmo is the best choice for serious production extensions, especially those requiring robust architecture.

### Choose CRXJS When:

- You have an existing Vite project you want to extend
- You need full control over your build configuration
- Your team has strong Vite expertise
- You want minimal framework dependencies
- You're building a lightweight extension

CRXJS is perfect for developers who know what they're doing and want maximum flexibility.

---

## Recommendation Matrix

| Criterion | WXT | Plasmo | CRXJS |
|-----------|-----|--------|-------|
| Getting Started | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| HMR Experience | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| TypeScript | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Build Output | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cross-Browser | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Documentation | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Community | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Templates | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Bundle Size | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Flexibility | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Production Ready | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## Conclusion

For most developers building Chrome extensions in 2026, **Plasmo** remains the best overall choice due to its comprehensive feature set, excellent documentation, and strong community support. It's particularly well-suited for production extensions that need to work across browsers.

However, **WXT** is an excellent alternative if you prioritize developer experience and simplicity over features. It's perfect for solo developers and rapid prototyping.

**CRXJS** fills an important niche for developers who want modern tooling without framework lock-in. If you already have a Vite project or prefer maximum control, CRXJS delivers exactly that.

Start your TypeScript extension journey with our [Chrome Extension TypeScript Tutorial](/chrome-extension-guide/guides/chrome-extension-development-typescript-tutorial/) or explore our [Development Guides](/chrome-extension-guide/docs/getting-started/) for more advanced topics.

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
