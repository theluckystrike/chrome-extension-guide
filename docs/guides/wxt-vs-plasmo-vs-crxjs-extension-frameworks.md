---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Comprehensive comparison of WXT, Plasmo, and CRXJS Chrome extension frameworks. Compare architecture, HMR, TypeScript, bundle size, and community to choose the best framework for your extension in 2026."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for building Chrome extensions has become significantly more complex in 2026. What started as simple build tools has evolved into full-fledged development frameworks with their own ecosystems, patterns, and trade-offs. This guide provides a comprehensive comparison of three popular options: WXT, Plasmo, and CRXJS—helping you make an informed decision for your next extension project.

## Table of Contents

- [Framework Overview](#framework-overview)
- [Architecture Comparison](#architecture-comparison)
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

## Framework Overview

### WXT

WXT (Web Extension Toolkit) emerged as a modern answer to the complexities of building extensions with Vite. Created by the developer behind the popular Vue extension ecosystem, WXT positions itself as a "next-generation" framework that prioritizes developer experience and zero-configuration setups. It builds on Vite's excellent performance while handling the unique challenges of Chrome extension development.

### Plasmo

Plasmo is a framework specifically designed for building browser extensions with a focus on React and modern web technologies. It bills itself as the "Radiant Framework for Browser Extensions" and offers a batteries-included approach with built-in support for storage, messaging, and declarative intents. Plasmo has gained significant traction among developers building React-based extensions.

### CRXJS

CRXJS (Chrome Extension JavaScript) takes a different approach as a Vite plugin rather than a full framework. It's designed to integrate seamlessly with existing Vite projects, providing Chrome-specific build features without requiring you to adopt a particular framework or library pattern. CRXJS is ideal for developers who want Vite's power without the overhead of learning a new framework.

---

## Architecture Comparison

### WXT Architecture

WXT uses a file-based routing system that mirrors the extension's manifest structure. Your `entries` directory directly corresponds to extension entry points—background scripts, content scripts, popup, options page, and side panel. This approach provides intuitive organization that naturally maps to how Chrome loads extension components.

The framework abstracts away the complexity of manifest handling through its `wxt.config.ts` configuration. WXT automatically generates MV3 manifests and handles the intricate details of content script injection, service worker lifecycle, and multi-browser targeting.

```typescript
// wxt.config.ts
export default defineConfig({
  srcDir: 'entries',
  manifest: {
    name: 'My Extension',
    version: '1.0.0',
    permissions: ['storage', 'tabs'],
  },
  modules: ['@wxt-dev/module-vue'],
});
```

WXT's plugin system extends its functionality through a well-designed hook system that allows you to inject custom logic at various build stages. The architecture emphasizes convention over configuration while remaining highly customizable.

### Plasmo Architecture

Plasmo employs a more opinionated, full-stack approach to extension development. It introduces the concept of "declarative intents" and provides built-in abstractions for common extension patterns. The framework uses a Next.js-like directory structure with special handling for background scripts, content scripts, and popup components.

```typescript
// Background script with Plasmo
import { run } from '@plasmohq/messaging'

run({ name: 'hello', handler: () => 'world' })

// Content script component
import { useMessage } from '@plasmohq/messaging/hook'

function App() {
  const [resp, sendMessage] = useMessage()
  // ...
}
```

Plasmo's architecture shines when building data-driven extensions that require complex state management. Its built-in storage abstraction, message passing system, and declarative API patterns reduce boilerplate significantly.

### CRXJS Architecture

CRXJS is fundamentally a Vite plugin that adds Chrome extension-specific capabilities to your existing build pipeline. It doesn't impose any particular directory structure or framework choice—you maintain full control over your architecture.

```typescript
// vite.config.ts with CRXJS
import { defineConfig } from 'vite'
import crx from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [
    crx({ manifest })
  ],
  build: {
    outDir: 'dist'
  }
})
```

This minimal approach makes CRXJS particularly attractive for teams with existing Vite projects or those who want maximum flexibility in how they structure their extensions.

---

## Hot Module Replacement (HMR)

### WXT HMR

WXT provides excellent HMR support through its deep integration with Vite. The framework watches all extension entry points and can reload specific components without rebuilding the entire extension. Content scripts, background scripts, popup, and options page all support HMR with varying degrees of capability.

One of WXT's standout features is its "live reload" capability that can update the extension in your browser without manual reloading. This works seamlessly for popup, options page, and side panel changes. Content script HMR requires the "Allow unsigned extensions" flag in Chrome, which limits its utility in production development but accelerates iteration significantly during development.

### Plasmo HMR

Plasmo offers robust HMR through its development server architecture. The framework runs a local development server that injects your extension code, enabling near-instant updates for most changes. Content script HMR in Plasmo requires the same Chrome flag consideration as WXT.

Plasmo's HMR implementation includes automatic manifest regeneration and extension reload triggers, reducing the manual intervention required during development cycles.

### CRXJS HMR

CRXJS leverages Vite's HMR capabilities directly. Since CRXJS is just a plugin, you get whatever HMR experience your chosen framework provides. With vanilla Vite, you get basic HMR; with Vue, React, or Svelte integrations, you get framework-specific HMR.

The trade-off is that CRXJS provides less specialized extension HMR handling compared to WXT and Plasmo, which have custom implementations optimized for extension development patterns.

---

## TypeScript Integration

All three frameworks provide first-class TypeScript support, but with different emphases.

### WXT TypeScript

WXT includes TypeScript configuration out of the box with sensible defaults for extension development. The framework provides type definitions for its configuration API, making autocomplete and type checking available for your `wxt.config.ts` files. WXT also generates TypeScript types for your manifest, ensuring type safety when defining extension permissions and capabilities.

### Plasmo TypeScript

Plasmo has invested heavily in TypeScript support, particularly for its messaging and storage abstractions. The framework generates TypeScript types from your message handlers and storage schemas, providing excellent IDE support. Plasmo's TypeScript integration extends to its declarative patterns, where type inference works seamlessly with the framework's API.

### CRXJS TypeScript

CRXJS provides TypeScript definitions for its plugin API but leaves framework-specific TypeScript integration to you. If you're using React, Vue, or Svelte, you get those frameworks' TypeScript support. The manifest configuration can be typed using JSON Schema or dedicated packages like `crx-manifest-types`.

For guidance on setting up TypeScript in your extension project, see our [TypeScript Setup Guide](/docs/guides/typescript-setup/) and [Chrome Extension Development with TypeScript](/docs/guides/chrome-extension-development-typescript-tutorial/).

---

## Build Output Analysis

### WXT Build Output

WXT produces highly optimized build output with automatic code splitting across extension entry points. The framework separates background scripts, content scripts, popup, and options page into appropriately sized bundles. WXT's build includes manifest generation, icon processing, and locale file handling as part of its standard output.

```
dist/
├── _locales/
├── icons/
├── background.js
├── content.js
├── popup.html
├── popup.js
├── manifest.json
└── ...
```

### Plasmo Build Output

Plasmo generates Next.js-style output optimized for extension distribution. The framework produces separate bundles for each context while implementing aggressive optimization for production builds. Plasmo's output includes pre-rendered popup pages and optimized asset loading.

### CRXJS Build Output

CRXJS output depends entirely on your Vite configuration. By default, you get standard Vite build output with Chrome extension-specific handling for manifest and extension assets. The flexibility means you can optimize output to your exact specifications but requires more configuration effort.

---

## Cross-Browser Support

### WXT

WXT explicitly targets Chrome, Firefox, Edge, and Safari with a unified configuration approach. The framework's browser-specific configuration allows you to define permissions, content scripts, and manifest properties per browser. WXT handles the complexity of browser-specific manifest differences, generating appropriate manifests for each target.

### Plasmo

Plasmo focuses primarily on Chrome and Firefox, with more limited support for other browsers. The framework provides browser detection utilities and conditional logic for browser-specific features, but the cross-browser story is less comprehensive than WXT.

### CRXJS

CRXJS itself is Chrome-focused, but Vite's multi-browser capabilities allow you to configure cross-browser builds. You'll need to handle manifest differences manually, but the plugin architecture provides hooks for custom browser handling.

---

## Community Size and Ecosystem

As of 2026, the community sizes differ significantly:

- **WXT**: Growing rapidly with strong adoption in the Vue and Nuxt ecosystem. Active Discord community and regular updates.
- **Plasmo**: Largest community among extension-specific frameworks. Active Discord, comprehensive documentation, and third-party module ecosystem.
- **CRXJS**: Established community within the Vite ecosystem. Benefits from Vite's massive adoption but less extension-specific community engagement.

---

## Documentation Quality

### WXT Documentation

WXT provides excellent documentation covering all major features with practical examples. The documentation includes migration guides, API references, and configuration explanations. The framework's docs site offers interactive examples and clear explanations of extension-specific concepts.

### Plasmo Documentation

Plasmo offers comprehensive documentation with tutorials, API references, and example projects. The framework's docs cover advanced patterns including messaging, storage, and declarative intents with working code examples. Plasmo's documentation particularly excels in explaining React-specific extension patterns.

### CRXJS Documentation

CRXJS documentation focuses on plugin configuration and Vite integration. While complete, it assumes familiarity with Vite and provides less guidance on broader extension development patterns. The docs are more reference-style than tutorial-oriented.

---

## Starter Templates

### WXT Starters

WXT provides official templates for vanilla, Vue, React, Svelte, and Solid. Each template includes a working extension with example functionality demonstrating popup, options page, and content script patterns.

```bash
npm create wxt@latest my-extension
# Select your preferred framework
```

### Plasmo Starters

Plasmo offers templates for React with TypeScript, including examples for background scripts, content scripts, and popup with common patterns pre-configured. The starter templates include built-in examples of messaging and storage usage.

```bash
npm create plasmo my-extension
```

### CRXJS Templates

CRXJS doesn't provide official templates. Developers typically start from their own Vite templates or community examples. This approach offers maximum flexibility but requires more initial setup effort.

---

## Real Project Migration Stories

### Migrating to WXT

Teams migrating from vanilla extension setups report significant productivity improvements with WXT. The most common migration pattern involves moving from manual Vite builds to WXT's zero-configuration approach. Developers appreciate the automatic manifest handling and HMR capabilities, citing 30-50% reduction in development iteration time.

### Migrating to Plasmo

React teams moving from create-react-app or manual builds to Plasmo report smooth transitions, particularly for extensions that already use React. The messaging and storage abstractions require some learning but eliminate significant boilerplate code. Teams building complex, data-driven extensions particularly benefit from Plasmo's patterns.

### Migrating to CRXJS

Developers with existing Vite projects find CRXJS integration straightforward. The migration typically involves adding the plugin and configuring the manifest. Teams appreciate maintaining their existing architecture and framework choices while gaining Chrome-specific build optimizations.

---

## Bundle Size Comparison

Bundle size varies significantly based on your implementation, but general observations from community benchmarks:

| Framework | Minimal Bundle | React Baseline |
|-----------|---------------|-----------------|
| WXT | ~50KB | ~150KB |
| Plasmo | ~80KB | ~200KB |
| CRXJS | ~40KB | ~140KB |

WXT and CRXJS produce similar minimal bundles due to their Vite foundation. Plasmo's baseline includes more framework overhead but provides more built-in functionality. React extensions show the most variance depending on which libraries you include.

---

## When to Use Each Framework

### Choose WXT When:

- You want zero-configuration setup with sensible defaults
- You're building a Vue, Svelte, or Solid extension
- Cross-browser support is important (Chrome, Firefox, Edge, Safari)
- You want excellent developer experience with minimal friction
- You prefer convention over configuration

### Choose Plasmo When:

- You're building a React-based extension
- You need built-in messaging and storage abstractions
- You want declarative patterns for common extension features
- Documentation quality is a priority
- You're building a complex, data-driven extension

### Choose CRXJS When:

- You have an existing Vite project
- You want maximum flexibility in your architecture
- You prefer minimal dependencies
- You're building non-React extensions with other frameworks
- You want to understand every part of your build process

---

## Recommendation Matrix

| Criteria | WXT | Plasmo | CRXJS |
|----------|-----|--------|-------|
| **Setup Speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Cross-Browser** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **React Support** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **TypeScript** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Documentation** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Bundle Size** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Flexibility** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Community** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## Conclusion

The "best" framework depends entirely on your specific requirements, existing expertise, and project characteristics. WXT offers the best balance of developer experience and cross-browser support for most new projects. Plasmo excels for React developers building complex, feature-rich extensions. CRXJS provides maximum flexibility for teams with existing Vite infrastructure.

For most new Chrome extension projects in 2026, we recommend starting with WXT if you want a batteries-included experience, or Plasmo if you're deeply invested in React. CRXJS remains an excellent choice when integration with existing projects or maximum architectural control is paramount.

Remember that all three frameworks are actively maintained and represent solid choices. Your team's familiarity with the underlying patterns often matters more than marginal feature differences.

---

**Related Resources:**

- [TypeScript Setup Guide](/docs/guides/typescript-setup/)
- [Chrome Extension Development Tutorial](/docs/guides/chrome-extension-development-typescript-tutorial/)
- [Cross-Browser Extension Development](/docs/guides/cross-browser-extension-development/)
- [Architecture Patterns](/docs/guides/architecture-patterns/)

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
