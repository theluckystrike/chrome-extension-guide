---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Compare WXT, Plasmo, and CRXJS frameworks for Chrome extension development. Analyze architecture, HMR, TypeScript, bundle size, and find the best choice for your project."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for Chrome extension development can make or break your developer experience. The difference between a framework that handles HMR correctly versus one that leaves you manually reloading extensions every few minutes is the difference between shipping features in hours versus days. In this comprehensive comparison, we evaluate WXT, Plasmo, and CRXJS across the dimensions that matter most: architecture, developer experience, TypeScript integration, build output, cross-browser support, community size, documentation quality, and real-world performance.

## Table of Contents

- [Framework Overview](#framework-overview)
- [Architecture Comparison](#architecture-comparison)
- [Hot Module Replacement](#hot-module-replacement)
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

## Framework Overview

### WXT

WXT is a modern Chrome extension framework built on top of Vite. It was created to address the shortcomings of earlier frameworks by providing first-class support for Manifest V3, excellent HMR, and a developer experience that feels like building a modern web application. WXT takes a batteries-included approach, bundling everything you need to build, test, and package extensions without requiring you to piece together multiple tools.

### Plasmo

Plasmo is a framework specifically designed for building browser extensions with a focus on React and modern web technologies. It positions itself as the "Next.js of extension development," offering a similar developer experience to building React applications. Plasmo provides built-in support for content script isolation, background service workers, and a declarative approach to defining extension capabilities.

### CRXJS

CRXJS is a Vite-based tool focused specifically on the build process for Chrome extensions. Unlike WXT and Plasmo, which are full frameworks with project scaffolding and development servers, CRXJS is a Vite plugin that handles the complexities of building Chrome extension packages. It's the lightest touch of the three, letting you keep your existing project structure while adding Chrome-specific build capabilities.

---

## Architecture Comparison

### WXT Architecture

WXT uses a file-based routing system where the directory structure directly maps to extension components. Your `entry/` directory becomes the source of truth: `entry/content/` for content scripts, `entry/background/` for service workers, and `entry/popup/` for the popup UI. This approach eliminates the need for complex configuration and makes it obvious where each piece of code belongs.

The framework handles manifest generation automatically through its `@wxt/cli` package, reading your source files and constructing a valid `manifest.json` at build time. WXT also provides a plugin system that lets you customize the build process without forking the core framework.

```typescript
// WXT auto-generates manifest from file structure
// entry/background/index.ts → background.service_worker
// entry/popup/index.ts → action.default_popup
// entry/content/index.ts → content_scripts
```

WXT's architecture shines when building multi-context extensions because it abstracts away the boilerplate of managing multiple entry points while giving you full control when you need it.

### Plasmo Architecture

Plasmo uses a more explicit, configuration-driven architecture. You define your extension's capabilities through a combination of file conventions and a central configuration file. The framework emphasizes React-first development, making it particularly attractive if your extension's UI is a significant portion of the codebase.

Plasmo separates your extension into "nodes" - each node representing a distinct context (popup, background, options, content script). This architectural choice makes it clear which code runs where, but it requires more explicit wiring between components.

```typescript
// Plasmo uses explicit definitions in code
import { defineBackground } from 'wxt';

export default defineBackground({
  runtime: {
    onStartup: () => {
      console.log('Extension starting up');
    }
  }
});
```

### CRXJS Architecture

CRXJS is fundamentally different - it's a Vite plugin, not a framework. You bring your own architecture, and CRXJS handles the Chrome-specific build challenges. This makes it ideal for teams with existing Vite projects who want to add Chrome extension support without rewriting their application structure.

```typescript
// CRXJS as a Vite plugin in vite.config.ts
import { defineConfig } from 'vite';
import crx from '@crxjs/vite-plugin';

export default defineConfig({
  plugins: [
    crx({
      manifest: './manifest.json'
    })
  ]
});
```

---

## Hot Module Replacement

### WXT HMR

WXT delivers the best HMR experience among all Chrome extension frameworks. Because it's built on Vite, changes to any extension component - content scripts, background scripts, popup UI, or options page - are reflected instantly without requiring manual reload. The framework handles the complexity of communicating with Chrome's extension reload mechanism, so you stay in flow.

WXT also supports conditional HMR, where content script changes only reload on matching pages. This is invaluable when developing content scripts that target specific websites, as you can see your changes on the right site without disrupting other tabs.

### Plasmo HMR

Plasmo provides HMR for the popup, options page, and background service worker. However, content script HMR is more limited - changes often require a full page reload or extension reload depending on your configuration. The framework is actively improving this area, but it's not as seamless as WXT out of the box.

### CRXJS HMR

CRXJS provides HMR through Vite's standard mechanism, but Chrome extension reloads still need to be triggered manually for most changes. The plugin handles manifest updates and asset injection well, but the developer experience is closer to traditional development than the instant feedback loops WXT and Plasmo offer.

---

## TypeScript Integration

### WXT TypeScript

WXT has first-class TypeScript support with zero configuration required. The framework generates TypeScript types for your automatically-generated manifest, giving you autocomplete for permissions, host permissions, and extension API features. You can also define your own types for message passing between contexts, and WXT will validate them at build time.

```typescript
// WXT manifest types are auto-generated
// Get autocomplete for chrome.runtime API
chrome.runtime.sendMessage('hello'); // Type-checked
```

WXT also supports type-safe storage through its storage module, which generates TypeScript interfaces from your schema definitions.

### Plasmo TypeScript

Plasmo provides TypeScript support through its own type definitions and React integration. The framework includes types for its declarative APIs and integrates well with standard React TypeScript setups. However, manifest types need to be managed separately, and you may find yourself maintaining your own type definitions for complex extension configurations.

### CRXJS TypeScript

CRXJS doesn't impose any TypeScript requirements - it works with whatever your Vite project uses. This means you have full flexibility, but you also have to set up your own type infrastructure for the Chrome APIs and manifest.

---

## Build Output Analysis

### WXT Build Output

WXT produces optimized, production-ready bundles with tree-shaking, code splitting, and minification handled automatically. The output structure is clean, with separate directories for each context and all assets properly organized. WXT also handles the tricky parts of Chrome extension builds - like generating the correct hashes for the manifest and handling Content Security Policy - automatically.

### Plasmo Build Output

Plasmo's build output is similarly well-optimized, with particular attention paid to React component bundling. The framework produces smaller bundles for React-based UIs due to its understanding of React's runtime requirements. However, the build output can be harder to inspect and debug because Plasmo applies more transformation to the source code.

### CRXJS Build Output

CRXJS produces straightforward Vite-style builds. The output is predictable and follows standard Vite conventions, which makes it easier to debug if something goes wrong. However, achieving the same level of optimization as WXT or Plasmo requires more manual configuration.

---

## Cross-Browser Support

### WXT Browser Support

WXT supports Chrome, Firefox, Edge, and Opera out of the box. The framework generates browser-specific manifest entries and handles the differences between browser extension APIs. However, Firefox support requires additional configuration for WebExt compatibility, and some Chrome-only APIs may need polyfills.

### Plasmo Browser Support

Plasmo primarily targets Chrome and has the strongest Chrome-first focus. Firefox support exists but is less mature, and you may encounter Chrome-specific APIs that don't work in Firefox without modifications.

### CRXJS Browser Support

CRXJS is Chrome-focused by design. While you can configure it for other browsers, the plugin doesn't abstract away browser differences, so you'll need to handle cross-browser compatibility manually.

---

## Community Size and Ecosystem

### WXT Community

WXT has grown rapidly since its initial release, with an active Discord community and increasing npm downloads. The framework is maintained by a small team of dedicated developers who respond quickly to issues. The ecosystem includes official plugins for popular tools like Vue, Svelte, and Tailwind CSS.

### Plasmo Community

Plasmo has the largest community of the three frameworks, with strong adoption among React developers. The framework's Discord server is active, and there are numerous community-created templates and plugins. Plasmo also maintains a marketplace of pre-built components that can speed up development.

### CRXJS Community

CRXJS has a smaller community but benefits from being part of the broader Vite ecosystem. Issues are typically resolved quickly, and the project has steady maintenance. However, you'll find fewer community resources, templates, and third-party integrations compared to the other frameworks.

---

## Documentation Quality

### WXT Documentation

WXT provides comprehensive documentation covering every feature with examples. The documentation includes migration guides from other frameworks, detailed API references, and troubleshooting guides. The framework's documentation site is well-organized and easy to navigate.

### Plasmo Documentation

Plasmo's documentation is extensive but can be overwhelming due to the number of features and options. The framework provides excellent documentation for its core features but some advanced topics require digging through GitHub issues or Discord discussions.

### CRXJS Documentation

CRXJS documentation covers the essentials well but assumes familiarity with Vite. The documentation is clear for its limited scope, but you'll need to supplement it with Vite documentation for advanced build configurations.

---

## Starter Templates

### WXT Templates

WXT offers official starter templates for vanilla JavaScript/TypeScript, Vue, Svelte, React, and Solid. Each template includes a working extension with all the basic pieces - popup, content script, and background service worker - pre-configured. The templates serve as excellent references for best practices.

### Plasmo Templates

Plasmo provides starter templates for React-based extensions with various feature combinations. The templates include authentication examples, content script patterns, and multi-page extensions. Plasmo's templates are more opinionated about React patterns, which can speed up development if you agree with their approach.

### CRXJS Templates

CRXJS doesn't provide official starter templates. Instead, the maintainers recommend using standard Vite templates and adding the CRXJS plugin. This gives you maximum flexibility but requires more setup work.

---

## Real Project Migration Stories

### Migrating to WXT

Teams migrating from Create React App or manual Vite setups to WXT typically report significant productivity improvements. The most common feedback is that HMR alone saves hours of development time per week. Teams building complex extensions with multiple content scripts particularly benefit from WXT's auto-generated manifest and clear file structure.

### Migrating to Plasmo

React teams moving to Plasmo often find the transition smooth because the framework embraces React patterns they're already familiar with. The main challenge comes when extending beyond Plasmo's built-in assumptions, which can require fighting the framework's opinions.

### Migrating to CRXJS

Teams adding Chrome extension support to existing Vite projects find CRXJS the least disruptive option. The migration typically takes a few hours, and you can keep your existing code organization. The tradeoff is that you handle more of the extension-specific complexity yourself.

---

## Bundle Size Comparison

Bundle size directly impacts extension load times and user experience. Here's how the three frameworks compare when building identical functionality:

| Framework | Minified JS | Minified CSS | Total (gzipped) |
|-----------|-------------|--------------|-----------------|
| WXT       | ~45KB       | ~5KB         | ~35KB           |
| Plasmo    | ~65KB*      | ~8KB         | ~55KB           |
| CRXJS     | ~40KB**     | ~4KB         | ~30KB           |

*Plasmo includes React runtime overhead
**CRXJS assumes you bring your own framework

These numbers represent baseline extensions with a popup, content script, and background service worker. Your actual bundle size will vary based on the libraries and frameworks you include in your extension.

---

## When to Use Each Framework

### Choose WXT When:

- You want the best possible HMR experience
- You're building a complex extension with multiple contexts
- You prefer convention over configuration
- You want excellent TypeScript support without setup effort
- Cross-browser support (especially Firefox) matters to you
- You want a framework that stays out of your way but handles the hard parts

### Choose Plasmo When:

- Your extension is primarily a React application
- You want pre-built UI components and patterns
- You're already deeply invested in the React ecosystem
- Documentation and community support are top priorities
- You want a more opinionated framework that makes decisions for you

### Choose CRXJS When:

- You have an existing Vite project and want to add extension support
- You want maximum control over your build process
- You prefer minimal tooling and understand Vite well
- You don't need HMR for most of your development
- You're building a simple extension with straightforward requirements

---

## Recommendation Matrix

| Criteria | WXT | Plasmo | CRXJS |
|----------|-----|--------|-------|
| HMR Experience | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| TypeScript Support | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Build Output | ★★★★★ | ★★★★☆ | ★★★★☆ |
| Cross-Browser | ★★★★★ | ★★★☆☆ | ★★☆☆☆ |
| Documentation | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Community | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| Starter Templates | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| Bundle Size | ★★★★☆ | ★★★☆☆ | ★★★★★ |
| Learning Curve | ★★★★☆ | ★★★★☆ | ★★★★★ |
| Flexibility | ★★★★☆ | ★★★☆☆ | ★★★★★ |

---

## Conclusion

For most Chrome extension projects in 2026, **WXT emerges as the strongest choice** because it delivers the best balance of developer experience, build quality, and cross-browser support. Its HMR implementation alone justifies the choice for any project where you'll spend more than a few hours developing the extension.

Choose **Plasmo** if you're building a React-heavy extension and value the ecosystem of pre-built components and community patterns. Choose **CRXJS** if you have an existing Vite project and want the lightest possible integration path.

Regardless of which framework you choose, all three represent significant improvements over building Chrome extensions with vanilla JavaScript or older tooling. The modern framework approach to extension development - with automatic manifest generation, HMR, and proper TypeScript support - will make you more productive and your extensions more maintainable.

## Related Articles

- [Building Chrome Extensions with TypeScript](../tutorials/building-with-typescript.md)
- [Chrome Extension Development Guide](../guides/getting-started.md)
- [Extension Architecture Patterns](../guides/architecture-patterns.md)
- [Project Structure Best Practices](../guides/chrome-extension-project-structure.md)

---

## Additional Resources

Need to monetize your extension? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one).*
