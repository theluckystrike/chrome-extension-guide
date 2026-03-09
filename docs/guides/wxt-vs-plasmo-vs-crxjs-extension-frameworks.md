---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Comprehensive comparison of WXT, Plasmo, and CRXJS frameworks for Chrome extension development. Compare architecture, HMR, TypeScript, bundle size, and community to choose the best framework for your project."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for Chrome extension development can significantly impact your productivity, maintainability, and end-user experience. In this comprehensive guide, we compare three leading frameworks—WXT, Plasmo, and CRXJS—to help you make an informed decision for your next extension project in 2026.

## Introduction

The Chrome extension development landscape has matured considerably. Gone are the days of manual manifest.json editing and complex webpack configurations. Modern frameworks now offer sophisticated tooling that rivals mainstream web application development. However, each framework takes a different approach to solving these challenges.

WXT emerged as a purpose-built solution for extension development, Plasmo gained popularity for its developer experience and React-first approach, while CRXJS became the foundation for many build tools seeking a more minimal footprint. Understanding their differences is crucial for making the right choice for your project.

## Framework Architecture Comparison

### WXT Architecture

WXT (Web eXtensions) is built on top of Vite and specifically designed for browser extension development. Its architecture emphasizes zero-configuration while providing sensible defaults that work out of the box.

The framework uses a file-system based routing approach where your project structure directly maps to extension components. The `entry/` directory contains your popup, options page, side panel, and background scripts, while the `pages/` directory handles content scripts and other assets.

```typescript
// WXT project structure
/
├── entry/
│   ├── popup/main.ts       // Popup entry
│   ├── options/main.ts     // Options page
│   ├── background/main.ts  // Service worker
│   └── sidepanel/main.ts   // Side panel
├── pages/
│   └── content/            // Content scripts
├── public/
│   └── icons/              // Extension icons
└── wxt.config.ts           // Configuration
```

WXT's architecture automatically handles manifest generation based on your project structure, reducing boilerplate significantly. The framework also includes built-in support for multiple browsers through a unified configuration layer.

### Plasmo Architecture

Plasmo takes a framework-agnostic approach but defaults to React for UI development. Its architecture is designed around the concept of "pages" and "background scripts" with automatic manifest generation.

The framework uses a more conventional approach with explicit configuration:

```typescript
// Plasmo project structure
/
├── src/
│   ├── content.ts          // Content script
│   ├── background.ts       // Service worker
│   ├── popup.tsx           // Popup (React)
│   └── options.tsx         // Options page (React)
├── assets/
│   └── icons/              // Extension icons
└── package.json            // Dependencies
```

Plasmo's key architectural strength is its streaming server and hot module replacement system, which provides instant feedback during development. The framework also includes built-in support for storage, messaging, and other common extension APIs through a unified hook-based API.

### CRXJS Architecture

CRXJS takes a fundamentally different approach as primarily a build tool rather than a full framework. It focuses on the build process for Chrome extensions using Vite under the hood.

```typescript
// CRXJS is typically combined with other frameworks
// A typical setup with vanilla TypeScript:
/
├── src/
│   ├── background.ts
│   ├── content.ts
│   ├── popup.ts
│   └── options.ts
├── html/
│   ├── popup.html
│   └── options.html
├── manifest.json           // Must be manually configured
└── vite.config.ts          // CRXJS plugin configuration
```

CRXJS requires more manual setup but offers greater flexibility. It doesn't enforce any specific framework or project structure, making it ideal for developers who want full control over their extension architecture.

## Hot Module Replacement (HMR) Support

### WXT HMR

WXT provides excellent HMR support through its Vite foundation. Changes to popup, options, side panel, and background scripts are reflected almost instantly. The framework handles the complexity of reloading extension components automatically.

Content script HMR is particularly well-implemented, with WXT automatically detecting changes and injecting updated scripts without requiring full page reloads in most cases.

### Plasmo HMR

Plasmo's HMR implementation is its standout feature. The framework's streaming development server can update popup, options, and background scripts in under 100ms. Content script updates are equally impressive, often completing in under 200ms.

The framework uses a sophisticated module replacement strategy that preserves application state where possible, making iterative development significantly smoother.

### CRXJS HMR

CRXJS provides HMR through Vite's standard mechanisms. While functional, it's not as optimized for extension development as WXT or Plasmo. Content script HMR requires additional configuration and may occasionally require manual page refreshes.

## TypeScript Integration

### WXT TypeScript

WXT offers first-class TypeScript support with comprehensive type definitions for Chrome APIs through the `@wxt-dev/type` package. The framework includes type-safe wrappers for common operations and generates types for your manifest automatically.

TypeScript configuration is handled automatically, with sensible defaults that can be customized through `tsconfig.json` overrides in your `wxt.config.ts`.

### Plasmo TypeScript

Plasmo provides excellent TypeScript integration with auto-generated types for your extension's permissions, content scripts, and background scripts. The framework includes `@plasmohq/types` for Chrome API type definitions.

React components benefit from full TypeScript support with JSX and generic type inference working out of the box.

### CRXJS TypeScript

CRXJS has no built-in TypeScript support—it relies on your chosen setup. Most implementations use standard Vite TypeScript configurations, which work well but require manual Chrome API type installation through packages like `@types/chrome`.

## Build Output Analysis

### WXT Build Output

WXT produces highly optimized build output with automatic code splitting and tree shaking. The framework generates separate chunks for each extension component, resulting in minimal duplicate code.

Typical build output characteristics:
- Popup bundle: ~50-150KB (depending on UI framework)
- Background bundle: ~20-80KB
- Content scripts: ~10-50KB per script
- Total extension size: ~200-500KB (typical)

WXT also supports output in both ES modules and IIFE formats for maximum compatibility.

### Plasmo Build Output

Plasmo's build output is slightly larger due to its additional runtime code, but remains competitive. The framework uses aggressive optimization and code splitting.

Typical build output characteristics:
- Popup bundle: ~80-200KB (includes React runtime)
- Background bundle: ~30-100KB
- Content scripts: ~15-60KB per script
- Total extension size: ~300-600KB (typical)

### CRXJS Build Output

CRXJS output depends entirely on your implementation. With proper configuration, you can achieve the smallest possible bundle sizes since you're in full control.

Typical build output characteristics vary widely:
- Minimal implementations can achieve <100KB total
- React-based implementations similar to WXT/Plasmo
- Full control over chunking and optimization strategies

## Cross-Browser Support

### WXT

WXT explicitly supports multiple browsers including Chrome, Firefox, Safari, and Edge. The framework uses an abstraction layer that allows you to define browser-specific configurations:

```typescript
// wxt.config.ts
export default defineConfig({
  browser: 'chrome', // default
  browsers: ['chrome', 'firefox', 'safari', 'edge']
})
```

### Plasmo

Plasmo primarily targets Chrome and Chromium-based browsers. Firefox support exists but requires additional configuration. Safari support is limited and often requires platform-specific workarounds.

### CRXJS

CRXJS supports any browser that uses the Chrome Web Store format. With manual manifest configuration, you can target Firefox (using WebExt format), Safari, and Edge. The build tool itself is browser-agnostic.

## Community Size and Documentation

### WXT

- **GitHub Stars**: ~15,000+
- **Weekly Downloads**: ~50,000
- **Contributors**: 100+
- **Documentation**: Comprehensive with examples for all features
- **Community**: Active Discord and GitHub discussions

### Plasmo

- **GitHub Stars**: ~25,000+
- **Weekly Downloads**: ~100,000+
- **Contributors**: 200+
- **Documentation**: Excellent with interactive examples
- **Community**: Very active Discord and strong GitHub presence

### CRXJS

- **GitHub Stars**: ~8,000
- **Weekly Downloads**: ~30,000
- **Contributors**: 50+
- **Documentation**: Solid but minimal—assumes Vite knowledge
- **Community**: Smaller but dedicated user base

## Starter Templates

### WXT Templates

WXT offers official templates for:
- Vanilla TypeScript (minimal)
- React
- Vue
- Svelte
- Preact
- Solid

All templates include TypeScript by default and follow modern best practices.

### Plasmo Templates

Plasmo provides official templates for:
- React (default)
- React with Redux
- Vue
- Svelte
- Vanilla TypeScript

Templates include examples for common extension patterns like storage, messaging, and permissions.

### CRXJS

CRXJS doesn't provide official templates. Developers typically combine it with:
- Create React App
- Vite templates
- Custom configurations

## Real Project Migration Stories

### Migrating from Vanilla to WXT

A developer migration from raw webpack to WXT reported:
- 70% reduction in configuration files
- 50% faster build times
- Improved type safety
- Simplified cross-browser support

The main challenge was adapting to WXT's file-system routing convention.

### Migrating from Webpack to Plasmo

Teams migrating from Create React App or webpack to Plasmo report:
- Dramatically faster development server (10x improvement)
- Smaller bundle sizes
- Better HMR experience

The React-first approach required minimal code changes for React-based extensions.

### Building with CRXJS from Scratch

Developers choosing CRXJS for greenfield projects appreciate:
- Maximum flexibility
- Minimal abstractions
- Full control over build process
- No framework lock-in

The trade-off is more upfront configuration and maintenance.

## Bundle Size Comparison

| Framework | Popup (KB) | Background (KB) | Min Content (KB) | Total (KB) |
|-----------|------------|-----------------|------------------|------------|
| WXT       | 50-150     | 20-80           | 10-50            | 200-500    |
| Plasmo    | 80-200     | 30-100          | 15-60            | 300-600    |
| CRXJS*    | 20-200     | 10-100          | 5-60             | 100-600    |

*CRXJS varies significantly based on implementation choices

## When to Use Each Framework

### Choose WXT When:

- You want the fastest path to a production-ready extension
- You need excellent cross-browser support (Chrome, Firefox, Safari, Edge)
- You prefer convention over configuration
- You want built-in support for multiple UI frameworks
- TypeScript is a priority for your project

WXT is ideal for teams that want to focus on building features rather than configuring build systems.

### Choose Plasmo When:

- React is your preferred UI framework
- Developer experience is paramount
- You need streaming HMR for rapid iteration
- You want excellent TypeScript support out of the box
- You need storage and messaging abstractions

Plasmo excels for teams familiar with React and those prioritizing development speed.

### Choose CRXJS When:

- You need maximum control over your build process
- You have unique requirements that don't fit standard patterns
- You want minimal dependencies
- You're building a lightweight extension
- You prefer to understand every part of your build

CRXJS suits experienced developers who need flexibility and have specific architectural requirements.

## Recommendation Matrix

| Criteria | WXT | Plasmo | CRXJS |
|----------|-----|--------|-------|
| Setup Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| TypeScript | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| HMR | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Bundle Size | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cross-Browser | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Documentation | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Community | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Flexibility | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| React Support | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## Getting Started

Ready to build your next Chrome extension? Here's how to begin:

1. **Choose Your Framework**: Based on the comparison above, select the framework that matches your requirements

2. **Set Up TypeScript**: Follow our [TypeScript extension development guide](/chrome-extension-guide/docs/guides/chrome-extension-development-typescript-2026/) for proper TypeScript configuration

3. **Learn the Basics**: Check out our [comprehensive development tutorials](/chrome-extension-guide/docs/tutorials/) for step-by-step guidance

4. **Explore Patterns**: Our [extension patterns](/chrome-extension-guide/docs/patterns/) documentation covers messaging, storage, and more

## Conclusion

For most new projects in 2026, we recommend **WXT** as the default choice. Its excellent balance of features, performance, and developer experience makes it suitable for a wide range of extension projects. The framework's cross-browser support is particularly valuable for teams targeting multiple browsers.

However, if React is your preferred framework and development speed is critical, **Plasmo** remains an excellent choice with its superior HMR and streaming development server.

For projects requiring maximum control or minimal footprint, **CRXJS** provides the flexibility you need, though it requires more setup expertise.

The best framework ultimately depends on your specific requirements, team expertise, and project constraints. All three frameworks are production-ready and used by thousands of extensions in the Chrome Web Store.

---

**Related Resources:**
- [Chrome Extension Development Tutorial with TypeScript](/chrome-extension-guide/docs/guides/chrome-extension-development-typescript-2026/)
- [Build Your First Extension](/chrome-extension-guide/docs/tutorials/)
- [Extension Patterns and Best Practices](/chrome-extension-guide/docs/patterns/)
- [Cross-Browser Extension Development](/chrome-extension-guide/docs/guides/cross-browser-extension-development/)

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
