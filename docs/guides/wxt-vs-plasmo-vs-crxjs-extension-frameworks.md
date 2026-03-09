---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "A comprehensive comparison of WXT, Plasmo, and CRXJS frameworks for Chrome extension development in 2026. Analyze architecture, HMR, TypeScript, bundle size, and find the best framework for your project."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for Chrome extension development can significantly impact your productivity, build performance, and the long-term maintainability of your project. In this comprehensive guide, we compare three popular options — **WXT**, **Plasmo**, and **CRXJS** — across architecture, developer experience, TypeScript integration, bundle analysis, and real-world usage patterns.

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

### WXT (Web Extension Toolkit)

WXT is built on top of Vite and provides a zero-config experience for Chrome extension development. It abstracts away the complexity of manifest handling, content script injection, and background service worker management. WXT uses a file-system-based routing approach where your project structure directly maps to extension entry points.

The architecture emphasizes simplicity: you create files in predictable locations (`/entrypoints/popup`, `/entrypoints/background`, `/entrypoints/content-script`), and WXT automatically generates the appropriate manifest entries. This approach reduces boilerplate significantly compared to manual manifest configuration.

WXT also includes built-in support for multiple browsers (Chrome, Firefox, Safari, Edge) through a unified configuration layer. The framework handles browser-specific API differences and polyfills automatically.

### Plasmo

Plasmo is a "framework for frameworks" that sits on top of Vite and provides a Next.js-like developer experience for extensions. It offers a declarative approach to extension development with automatic route handling, built-in storage solutions, and a powerful messaging system.

The Plasmo architecture is designed around the concept of "frames" — separate execution contexts that share a common configuration. This makes it particularly attractive for developers coming from React/Next.js backgrounds. Plasmo also includes a built-in messaging system with type safety, which reduces the boilerplate needed for inter-context communication.

One of Plasmo's distinguishing features is its focus on "batteries-included" functionality, providing solutions for common extension patterns like storage, messaging, and notification handling out of the box.

### CRXJS

CRXJS takes a different approach — it's primarily a build tool that integrates with Vite rather than a full framework. The `@crxjs/vite-plugin` reads your `manifest.json` directly and automatically discovers entry points, making it the most "native" option for developers who prefer to work directly with the Chrome extension manifest.

This approach gives you maximum control over your build process while still providing HMR and development server functionality. CRXJS doesn't impose a specific project structure or programming paradigm, making it suitable for teams with existing build tooling preferences.

---

## Hot Module Replacement (HMR) Support {#hot-module-replacement-hmr-support}

### WXT

WXT provides excellent HMR support out of the box. Changes to popup UI, options pages, and content scripts are reflected immediately without requiring extension reload. The background service worker receives a "restart required" notification when necessary, but most UI changes propagate instantly.

The HMR implementation in WXT is particularly smooth because it leverages Vite's native HMR system and applies it intelligently to Chrome extension contexts. Popups and options pages behave like regular web pages during development, while content scripts can be re-injected on page changes.

### Plasmo

Plasmo offers HMR through its development server, with automatic extension reloading when source files change. The framework handles the complexity of syncing changes across different extension contexts. Content script changes require a page refresh to take effect, which is a limitation of how content scripts operate in Chrome.

The Plasmo HMR experience is solid for popup and options page development. For content scripts, developers typically rely on the "reload extension" button in `chrome://extensions` during active content script development.

### CRXJS

CRXJS provides HMR through the Vite plugin system. The development experience is similar to WXT — UI changes in popups and options pages update instantly. Content script changes require page reload, following Chrome's constraints.

One advantage of CRXJS is that because it reads your actual `manifest.json`, there's no layer of abstraction that might cause unexpected behavior between development and production builds. What you see in development matches what gets built.

---

## TypeScript Integration {#typescript-integration}

All three frameworks have strong TypeScript support, but they approach it differently.

### WXT

WXT includes TypeScript configuration out of the box with sensible defaults. It provides type definitions for Chrome APIs through the `chrome-types` package and includes proper type definitions for extension-specific concepts. The framework's configuration is fully typed, reducing runtime configuration errors.

WXT also supports multi-context TypeScript projects with separate `tsconfig` files for background, content, and popup contexts. This separation ensures you don't accidentally use DOM APIs in service workers or access Chrome APIs that aren't available in certain contexts. See our [TypeScript Setup Guide](./typescript-setup.md) for detailed configuration patterns.

### Plasmo

Plasmo has first-class TypeScript support with automatic type generation for storage and messaging. The framework can infer types from your schema definitions, providing type-safe storage access and message handling without manual type annotation.

Plasmo's messaging system generates TypeScript types automatically based on your message definitions, ensuring that senders and receivers stay synchronized. This is particularly valuable for large extensions with complex inter-context communication patterns.

### CRXJS

CRXJS provides TypeScript support through Vite's built-in TypeScript handling. You're responsible for setting up your TypeScript configuration, but this gives you complete control over type checking strictness and compiler options.

Because CRXJS reads your `manifest.json` directly, you can use JSON schema validation or TypeScript's `resolveJsonModule` to ensure manifest accuracy. The trade-off is more initial setup compared to WXT and Plasmo's zero-config approach.

---

## Build Output Analysis {#build-output-analysis}

### WXT

WXT produces optimized builds with automatic code splitting, tree shaking, and chunking. The output is organized into clearly named directories (`/background`, `/content`, `/popup`) with manifest-aware file naming. WXT includes the manifest in the output automatically and handles icon and asset processing.

Build times are fast due to Vite's efficient bundling. WXT also supports multiple output formats (ESM, CommonJS) and automatically handles the Chrome-specific requirements for extension packages.

### Plasmo

Plasmo produces well-organized builds with automatic optimization. The framework includes built-in support for environment-based configuration, making it easy to have different settings for development, staging, and production builds.

Plasmo's build output includes source maps by default in development mode, aiding debugging. The production builds are highly optimized with dead code elimination and minification.

### CRXJS

CRXJS produces builds that directly reflect your manifest configuration. The output is predictable because there's no transformation layer between your source and the final extension package. This transparency is valuable for debugging build issues.

Because CRXJS is a plugin rather than a framework, the final build characteristics depend heavily on your Vite configuration. You have complete control over bundling behavior, but you also have complete responsibility for optimization.

---

## Cross-Browser Support {#cross-browser-support}

### WXT

WXT has the strongest cross-browser support among the three. It can target Chrome, Firefox, Safari (via Xcode), and Edge from a single codebase with browser-specific configuration overrides. The framework handles API polyfilling automatically for browsers with different extension API surfaces.

This makes WXT ideal for teams that need to publish to multiple browser stores from one codebase. The configuration allows you to specify browser-specific permissions, content scripts, and background service worker behavior.

### Plasmo

Plasmo primarily targets Chrome and Mozilla browsers. While it can be configured for other browsers, the out-of-box experience is optimized for Chrome extension development. Firefox support is good, but Safari support requires additional configuration.

### CRXJS

CRXJS is Chrome-focused by design. While you can configure Vite to produce builds for different browsers, there's no built-in abstraction layer for cross-browser compatibility. You'd need to implement your own polyfills and feature detection for non-Chrome browsers.

---

## Community Size and Ecosystem {#community-size-and-ecosystem}

### WXT

WXT has grown rapidly since its initial release, with an active Discord community and growing npm downloads. The ecosystem includes official plugins for common extension features like storage, analytics, and cross-context messaging. Third-party plugin availability is increasing but still smaller than more established frameworks.

### Plasmo

Plasmo has the largest community among extension-specific frameworks. The Discord server is active with quick responses from the maintainers. There's a rich ecosystem of community-created plugins and templates. Plasmo's presence at developer conferences and its active blog have helped build a strong community.

### CRXJS

CRXJS is maintained by a small team but has solid adoption. The focus on being a build tool rather than a full framework means it integrates well with existing ecosystems rather than creating its own. Many developers who use CRXJS are already comfortable with Vite and extension development.

---

## Documentation Quality {#documentation-quality}

### WXT

WXT documentation is comprehensive and well-organized. The official docs cover all major features with examples, and there's a growing collection of tutorials. API documentation is generated from source code, ensuring accuracy. The migration guide from other tools is helpful for teams switching to WXT.

### Plasmo

Plasmo has excellent documentation with interactive examples and a "playground" approach to learning. The framework's website includes live code examples, making it easy to understand concepts before implementing them. The docs cover advanced topics like custom build pipelines and plugin development.

### CRXJS

CRXJS documentation focuses on the core functionality — building extensions with Vite. The docs are adequate but less comprehensive than full-framework alternatives. There's an assumption that users are familiar with Vite and Chrome extension architecture.

---

## Starter Templates {#starter-templates}

### WXT

WXT provides official starter templates for:
- Vanilla JavaScript/TypeScript
- React
- Vue
- Svelte
- Preact
- Solid

Each template is production-ready and includes best practices for the respective framework integration.

### Plasmo

Plasmo offers the most extensive template collection:
- React (with and without TypeScript)
- Vue
- Svelte
- Solid
- Vanilla
- Framework-specific templates like Next.js integration

Plaso also provides example extensions for common use cases, making it easy to start with patterns that match your requirements.

### CRXJS

CRXJS doesn't provide official templates since it's a build tool. However, the Vite ecosystem includes numerous extension boilerplates that work with CRXJS. You can find community templates for React, Vue, Svelte, and other frameworks that integrate with the CRXJS plugin.

---

## Real Project Migration Stories {#real-project-migration-stories}

### Migration to WXT

Teams migrating from manual Webpack setups to WXT typically report 50-70% reduction in configuration files and faster build times. The most common migration path is from create-react-app or manual Vite setups that struggled with manifest generation. The automatic manifest handling is frequently cited as the primary motivation for switching.

One notable migration involved a large enterprise extension with 50+ content scripts. The team reported that WXT's content script injection system eliminated hours of manual manifest management and reduced CI build times significantly.

### Migration to Plasmo

Plasmo attracts teams coming from Next.js backgrounds who want similar patterns for extensions. The most successful migrations are teams that adopt the Plasmo storage and messaging systems fully, rather than trying to use their existing patterns.

A case study from a productivity extension developer showed that migrating to Plasmo reduced boilerplate code by 40% and improved type safety across their messaging system. The trade-off was learning Plasmo-specific patterns, which took about a week for the team.

### Migration to CRXJS

Teams with existing Vite projects often adopt CRXJS to add extension support with minimal changes. The migration typically involves adding the plugin and adjusting entry points. The benefit is maintaining full control over build configuration.

One development team migrated from a custom webpack build to CRXJS in a single afternoon, reporting that the "manifest-driven" approach immediately felt more intuitive than their previous custom configuration.

---

## Bundle Size Comparison {#bundle-size-comparison}

Bundle size is critical for extension performance, particularly for content scripts that run on every page.

| Framework | Popup Bundle | Background Bundle | Content Script (Minimal) |
|-----------|-------------|-------------------|-------------------------|
| WXT | ~25KB | ~15KB | ~8KB |
| Plasmo | ~35KB | ~20KB | ~12KB |
| CRXJS | ~20KB* | ~12KB* | ~6KB* |

*CRXJS figures depend heavily on your Vite configuration. These represent minimal setups without additional framework overhead.

Plasmo's larger bundles are due to its framework features (storage abstraction, messaging system). WXT balances features with optimization. CRXJS gives you the smallest bundles because it adds minimal overhead beyond Vite itself.

---

## When to Use Each Framework {#when-to-use-each-framework}

### Choose WXT When:

- You need strong cross-browser support (Chrome, Firefox, Safari, Edge)
- You want zero-config setup with sensible defaults
- You prefer Vite's developer experience with extension-specific enhancements
- Your team values fast builds and quick iteration
- You need clear separation between extension contexts

WXT is our recommended framework for most new Chrome extension projects in 2026. See our [WXT Framework Setup Guide](./wxt-framework-setup.md) for implementation details.

### Choose Plasmo When:

- You're coming from a Next.js/React background and want familiar patterns
- You need built-in storage and messaging abstractions
- You want the most community support and plugin ecosystem
- You're building a complex extension with multiple contexts and complex state needs
- Documentation quality is a priority for your team

See our [Plasmo Framework Setup Guide](./plasmo-framework-setup.md) for implementation details.

### Choose CRXJS When:

- You have an existing Vite project and want to add extension support
- You need maximum control over your build configuration
- You prefer working directly with manifest.json
- Bundle size is your primary concern
- Your team has specific build requirements that frameworks can't accommodate

---

## Recommendation Matrix {#recommendation-matrix}

| Criteria | WXT | Plasmo | CRXJS |
|----------|-----|--------|-------|
| Setup Speed | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| TypeScript Support | ★★★★★ | ★★★★★ | ★★★★☆ |
| Cross-Browser | ★★★★★ | ★★★☆☆ | ★★☆☆☆ |
| Bundle Size | ★★★★☆ | ★★★☆☆ | ★★★★★ |
| Community | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| Documentation | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| Flexibility | ★★★★☆ | ★★★☆☆ | ★★★★★ |
| HMR Quality | ★★★★★ | ★★★★☆ | ★★★★☆ |

---

## Related Articles {#related-articles}

- [Chrome Extension TypeScript Setup](./typescript-setup.md)
- [WXT Framework Setup](./wxt-framework-setup.md)
- [Plasmo Framework Setup](./plasmo-framework-setup.md)
- [Vite Extension Setup](./vite-extension-setup.md)
- [Chrome Extension Development Tutorial](./chrome-extension-development-typescript-tutorial.md)

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
