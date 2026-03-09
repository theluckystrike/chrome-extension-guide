---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Comprehensive comparison of WXT, Plasmo, and CRXJS extension frameworks. Compare architecture, HMR, TypeScript, bundle size, and find your best choice for 2026."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for building Chrome extensions has become significantly more complex as the ecosystem matures. What started as simple build scripts has evolved into full-featured development platforms with dramatically different philosophies. This comprehensive guide compares WXT, Plasmo, and CRXJS—the three most popular modern frameworks—as of 2026, helping you make an informed decision for your next extension project.

## Table of Contents

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

## Framework Architecture Comparison

### WXT Architecture

WXT (Web eXtension Toolkit) represents the newest entrant in this space, built specifically for the modern extension developer. It leverages Vite under the hood, bringing the full power of Vite's ecosystem to extension development. The architecture is remarkably clean: WXT treats your extension as a web application rather than a collection of disparate scripts.

The framework automatically handles the complexity of Manifest V3, including service worker lifecycle management, which has become one of the most painful aspects of extension development. WXT's architecture abstracts away the differences between Chrome, Firefox, Safari, and Edge, presenting a unified development experience.

From a technical standpoint, WXT uses a file-system-based routing system similar to Nuxt. Your `entrypoints/` directory defines popup, options, background, and content scripts. The framework automatically generates the manifest and handles the intricate details of bundling each entry point appropriately.

### Plasmo Architecture

Plasmo takes a different approach, positioning itself as a "browser extension framework" rather than a build tool. It extends the capabilities of Vite with a custom plugin specifically designed for extension development. The framework emphasizes developer experience with built-in support for React, Svelte, and Vue.

What sets Plasmo apart is its storage system and messaging framework. The Plasmo storage API provides a type-safe wrapper around Chrome's storage API, while their messaging system simplifies the notoriously complex communication between extension contexts. This makes Plasmo particularly attractive for developers building data-heavy extensions.

The architecture also includes built-in support for i18n, making it easier to localize your extension. This is a feature that other frameworks require manual setup for, making Plasmo a strong choice for extensions targeting international markets.

### CRXJS Architecture

CRXJS takes a minimalist approach, focusing on being a Vite plugin rather than a full framework. This philosophy means you retain more control over your build process while getting extension-specific optimizations. The plugin handles manifest generation, chunk splitting, and automatic updates.

CRXJS's architecture is intentionally less opinionated. It provides the building blocks for extension development without enforcing a particular project structure or state management solution. This flexibility appeals to developers who want to understand every aspect of their build or who have specific architectural requirements that don't fit into the more prescriptive frameworks.

The trade-off is that CRXJS requires more manual configuration. However, this also means fewer surprises when the framework updates, as there's less "magic" happening behind the scenes.

---

## Hot Module Replacement (HMR) Support

Hot Module Replacement has become essential for productive extension development. The ability to see changes instantly without reloading the entire extension dramatically improves development velocity.

### WXT HMR

WXT provides excellent HMR support out of the box. Changes to popup UI, options pages, and content scripts reflect immediately. The background service worker gets automatic reloading when changes are detected, though due to Chrome's architecture, this requires a manual trigger to fully activate. WXT handles this gracefully with a notification system that guides you through the reload process.

The HMR implementation is particularly smooth for React, Vue, and Svelte components. State is preserved across component hot updates, making it possible to iteratively develop UI without losing context.

### Plasmo HMR

Plasmo's HMR is equally impressive, with a particular strength in maintaining state during development. The framework uses a custom HMR protocol that preserves data across hot updates more reliably than some competitors. Content script HMR is handled elegantly, with automatic re-injection when necessary.

One unique feature is Plasmo's "live panel" functionality, which allows you to develop your extension's side panel or popup in a separate browser window. This is invaluable for debugging and allows using browser developer tools directly.

### CRXJS HMR

CRXJS leverages Vite's HMR capabilities, which are robust and well-tested. The main limitation is that background script HMR is more complex due to service worker constraints. However, CRXJS provides clear documentation on managing this workflow.

For content scripts and UI components, CRXJS delivers a smooth experience comparable to the other frameworks. The difference is most noticeable in how you configure and customize the HMR behavior.

---

## TypeScript Integration

TypeScript has become the standard for serious extension development, and all three frameworks provide first-class support.

### WXT TypeScript

WXT was built with TypeScript from the ground up. The framework includes well-typed APIs for Chrome extension features, content script injection, storage operations, and more. TypeScript configuration works out of the box with zero additional setup for most projects.

The framework provides type definitions for manifest fields, making it easy to catch configuration errors during development. WXT also includes utilities for type-safe messaging between extension contexts.

### Plasmo TypeScript

Plasmo offers comprehensive TypeScript support with automatic type generation from your manifest configuration. The storage API is fully typed, and the messaging system includes TypeScript decorators for defining message handlers. This leads to excellent IDE autocomplete and compile-time error checking.

Plasmo's TypeScript setup requires minimal configuration, similar to WXT. The framework also provides type definitions for common extension patterns, though the ecosystem is slightly smaller than what's available for WXT.

### CRXJS TypeScript

CRXJS provides TypeScript support through Vite's standard mechanisms. This means you get solid type checking, but extension-specific types require additional setup. You'll need to install `@types/chrome` and potentially configure type checking for content scripts and background scripts separately.

The trade-off is more manual control over your TypeScript configuration. For teams with existing TypeScript setups or specific requirements, this flexibility is valuable.

---

## Build Output Analysis

Understanding what each framework produces helps with debugging and optimization.

### WXT Build Output

WXT produces clean, organized output with separate chunks for each entry point. The framework handles code splitting intelligently, separating vendor code from your application code. Output includes source maps by default in development, making debugging straightforward.

The build produces a directory structure that can be directly loaded into Chrome. WXT also supports zip creation for store submissions, with configuration options for excluding specific files.

### Plasmo Build Output

Plasmo's build output is similarly well-organized, with additional optimization for common extension patterns. The framework automatically handles the injection of content script CSS, solving a historically tricky problem in extension development.

Plasmo includes built-in support for bundling multiple entry points efficiently. The output is production-ready with minification and tree-shaking applied.

### CRXJS Build Output

CRXJS provides granular control over the build output. You can configure chunk splitting, asset handling, and manifest generation in detail. This flexibility is valuable for optimizing large extensions or those with unusual requirements.

The build output is predictable and well-documented, making it easier to integrate with CI/CD systems that have specific requirements.

---

## Cross-Browser Support

Building for multiple browsers extends your potential user base significantly.

### WXT Cross-Browser

WXT provides the strongest cross-browser support out of the box. The framework includes presets for Chrome, Firefox, Safari, and Edge, handling the differences in extension APIs automatically. You can generate browser-specific builds with a single command.

The framework maintains compatibility matrices for each browser, updating quickly when browser vendors change their APIs. This is particularly valuable for Firefox and Safari, which have different extension APIs than Chrome.

### Plasmo Cross-Browser

Plasmo supports multiple browsers with a focus on the Chromium ecosystem. Firefox support exists but requires more manual configuration than Chrome. Safari support is available but less polished than the Chrome experience.

The framework is transparent about browser limitations, providing clear documentation on what features work in which browsers.

### CRXJS Cross-Browser

CRXJS is primarily Chrome-focused, reflecting its origins as a Vite plugin for Chrome extension development. Cross-browser support requires more manual configuration and doesn't have the same level of automation as WXT.

---

## Community Size and Ecosystem

The community around a framework directly impacts how quickly you can get help and find third-party resources.

### WXT Community

WXT has grown rapidly since its 2022 release, building a passionate community of developers. The Discord server is active, and GitHub discussions provide helpful support. The npm package has millions of downloads, indicating significant production usage.

### Plasmo Community

Plasmo has the largest community among these frameworks, with an active Discord server, comprehensive documentation, and numerous tutorials created by the community. The framework has been around longer and has a mature ecosystem of plugins and templates.

### CRXJS Community

CRXJS has a smaller but dedicated community. The focus on being a Vite plugin rather than a full framework means it's often used by developers already familiar with Vite's ecosystem.

---

## Documentation Quality

### WXT Documentation

WXT documentation is excellent, with clear guides, API references, and examples. The documentation covers advanced topics thoroughly and includes troubleshooting guides for common issues.

### Plasmo Documentation

Plasmo provides extensive documentation with interactive examples. The framework's website includes a playground for experimenting with different configurations. Documentation is well-organized and covers most use cases.

### CRXJS Documentation

CRXJS documentation is solid but more concise, reflecting the framework's minimalist philosophy. The Vite plugin documentation is comprehensive, but some extension-specific topics require more research.

---

## Starter Templates

### WXT Templates

WXT includes official templates for React, Vue, Svelte, and vanilla TypeScript projects. Templates are available via the CLI and can be customized after creation.

### Plasmo Templates

Plasmo offers the widest range of starter templates, including options for React, Svelte, Vue, and Solid. The framework also provides templates for specific use cases like side panel apps andDevTools extensions.

### CRXJS Templates

CRXJS doesn't provide official templates, instead relying on the Vite ecosystem. This means you can use any Vite template, but you'll need to configure extension-specific settings manually.

---

## Real Project Migration Stories

### Migrating to WXT

Teams migrating from vanilla extension development or older build systems report significant productivity improvements. The most common feedback is appreciation for the automatic manifest handling and the unified development experience. Migration typically takes 1-2 days for medium-sized extensions.

### Migrating to Plasmo

Plasmo migrations are popular among React developers already familiar with similar frameworks. The storage and messaging abstractions require some learning but pay dividends in reduced boilerplate. Teams report migration times of 2-3 days for typical extensions.

### Migrating to CRXJS

CRXJS migrations are straightforward for teams already using Vite. The main effort is in configuring extension-specific settings. Developers appreciate the control this provides after migrating from less flexible build systems.

---

## Bundle Size Comparison

For a typical extension with popup, options page, and content script, here are typical production bundle sizes:

| Framework | Minified JS | Gzipped |
|-----------|-------------|---------|
| WXT       | ~45KB       | ~15KB   |
| Plasmo    | ~55KB       | ~18KB   |
| CRXJS     | ~40KB       | ~13KB   |

These numbers vary based on your specific dependencies, but CRXJS tends to produce the smallest bundles due to its minimal approach, while WXT and Plasmo include more runtime overhead in exchange for developer experience.

---

## When to Use Each Framework

### Choose WXT When

- You need strong cross-browser support (especially Firefox and Safari)
- You want the best balance of developer experience and production quality
- You prefer convention over configuration
- You're building an extension that may need to target multiple browsers

### Choose Plasmo When

- You're building a data-heavy extension requiring robust storage and messaging
- You need internationalization support
- You want the largest ecosystem of templates and plugins
- You're building a React-based extension with complex state management

### Choose CRXJS When

- You already have a Vite project and want extension capabilities
- You need maximum control over your build process
- Bundle size is your primary concern
- You prefer minimal abstractions and full understanding of your build

---

## Recommendation Matrix

| Criteria | Best Choice |
|----------|-------------|
| Cross-browser support | WXT |
| Developer experience | WXT or Plasmo |
| Bundle size | CRXJS |
| TypeScript support | WXT |
| Community size | Plasmo |
| Documentation | WXT or Plasmo |
| Starter templates | Plasmo |
| Flexibility/control | CRXJS |
| Production apps | WXT |
| Learning curve | WXT or Plasmo |

---

## Conclusion

All three frameworks represent excellent choices for Chrome extension development in 2026. WXT offers the most balanced approach with strong cross-browser support and developer experience. Plasmo excels for teams prioritizing storage, messaging, and React-based architectures. CRXJS provides maximum control for developers who understand their build requirements deeply.

For most new projects in 2026, **WXT** is our top recommendation due to its comprehensive feature set, excellent documentation, and strong cross-browser support. However, your specific requirements may favor one of the alternatives.

To get started with TypeScript extension development, see our [Chrome Extension Development TypeScript Tutorial](/docs/guides/chrome-extension-development-typescript-tutorial/) and [TypeScript Setup Guide](/docs/guides/typescript-setup/).

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
