---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Compare WXT, Plasmo, and CRXJS extension frameworks in 2026. Analyze architecture, HMR, TypeScript, bundle size, and find your perfect build tool."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---
# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for building Chrome extensions has never been more important. With Manifest V3 now mandatory and Chrome's increased focus on performance and security, developers need build tools that handle the complexities of multi-context applications while providing a smooth developer experience. Three frameworks have emerged as the leading choices: **WXT**, **Plasmo**, and **CRXJS**. This comprehensive comparison will help you decide which framework best suits your project in 2026.

## Table of Contents {#table-of-contents}

- [Framework Architecture Comparison](#framework-architecture-comparison)
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

## Framework Architecture Comparison {#framework-architecture-comparison}

### WXT Architecture

WXT (Web eXtension) is built on top of Vite and represents the modern generation of extension frameworks. It leverages Vite's powerful plugin system while handling the unique challenges of Chrome extension development—particularly the complexity of generating multiple entry points for popup, background service worker, content scripts, and options pages.

WXT's architecture follows a file-based routing convention similar to Nuxt. Place files in the `entry/` directory, and WXT automatically generates the appropriate manifest entries. This approach eliminates much of the manual manifest configuration that plague traditional extension projects.

```typescript
// WXT entry point example
// entry/popup/main.ts
import { defineComponent } from 'vue'

export default defineComponent({
  render() {
    return <div>Hello from WXT!</div>
  }
})
```

The framework abstracts away the intricacies of manifest.json generation, content script injection, and web-accessible resources, allowing developers to focus on building features rather than configuring build pipelines.

### Plasmo Architecture

Plasmo takes a different approach, positioning itself as a "framework for extensions." It uses a declarative configuration system where you define your extension's capabilities through a combination of `manifest.ts` files and framework-specific hooks. Plasmo is built on top of Next.js principles, which means it inherits many of Next.js's patterns for routing, data fetching, and API handling.

```typescript
// Plasmo example
import { useStorage } from "@plasmohq/storage"

function App() {
  const [value, setValue] = useStorage("my-key")
  return <input value={value} onChange={e => setValue(e.target.value)} />
}
```

Plasmo's architecture excels at handling complex state management across extension contexts. The framework provides built-in storage abstractions, messaging utilities, and a powerful messaging system that simplifies communication between content scripts, background workers, and the popup.

### CRXJS Architecture

CRXJS takes a minimalist approach, focusing specifically on the build tooling aspect. Unlike WXT and Plasmo, CRXJS is not a full-fledged framework—it's a Vite plugin that adds Chrome extension support to any Vite-based project. This makes CRXJS the most flexible option, as it doesn't impose specific patterns or directory structures.

```javascript
// CRXJS configuration
import { defineConfig } from 'vite'
import crx from '@crxjs/vite-plugin'

export default defineConfig({
  plugins: [
    crx({
      manifest: {
        manifest_version: 3,
        name: "My Extension",
        version: "1.0.0"
      }
    })
  ]
})
```

CRXJS's architecture is ideal for developers who want full control over their project structure and prefer to build their own abstractions rather than adopt framework-specific patterns.

---

## Hot Module Replacement (HMR) {#hot-module-replacement-hmr}

HMR is critical for developer productivity, and all three frameworks handle it differently.

### WXT HMR

WXT provides out-of-the-box HMR for all extension contexts. When you modify a content script, WXT automatically reloads the affected script without requiring a full extension reload. The popup and options page benefit from Vite's standard HMR, while the background service worker receives updates through Chrome's experimental hot reload API. WXT's HMR implementation is particularly smooth because it automatically handles the tricky parts of extension reloading.

### Plasmo HMR

Plasmo offers excellent HMR through its Next.js-derived architecture. The framework watches for file changes and automatically injects updated code into running extension contexts. Plasmo's HMR is especially impressive for content scripts, where changes appear almost instantly without manual intervention. The framework also provides a dedicated development server that handles manifest regeneration and extension reloading automatically.

### CRXJS HMR

CRXJS provides solid HMR support through Vite's ecosystem. Since CRXJS is just a Vite plugin, you get the standard Vite HMR experience—which is excellent for popup and options pages. Content script HMR requires more manual setup, as CRXJS doesn't provide the automatic injection that WXT and Plasmo offer. However, developers familiar with Vite will find the experience familiar and customizable.

**Winner**: WXT and Plasmo tie for the best HMR experience, with both frameworks providing seamless automatic reloading across all extension contexts. CRXJS requires more manual configuration but offers greater flexibility.

---

## TypeScript Integration {#typescript-integration}

All three frameworks have excellent TypeScript support, but the experience differs slightly.

### WXT TypeScript

WXT was designed with TypeScript from the ground up. The framework includes built-in type definitions for Chrome APIs, manifest generation, and extension-specific utilities. You can import types directly from the framework:

```typescript
import { defineContentScript } from 'wxt'
import type { Chrome } from 'wxt/utils'

export default defineContentScript({
  main() {
    chrome.runtime.onInstalled.addListener(() => {
      console.log('Extension installed')
    })
  }
})
```

WXT also provides type-safe storage utilities and manifest type generation that automatically infer types from your configuration.

### Plasmo TypeScript

Plasmo offers first-class TypeScript support with comprehensive type definitions. The framework generates TypeScript types for your manifest and provides strongly-typed hooks for storage, messaging, and API communication. Plasmo's TypeScript integration is particularly strong for its storage system:

```typescript
import { useStorage } from "@plasmohq/storage/hook"

const [settings, setSettings] = useStorage<ExtensionSettings>("settings")
```

### CRXJS TypeScript

CRXJS provides TypeScript support through standard Vite configuration. You'll need to install `@types/chrome` separately, and manifest types require additional setup. The experience is good but less integrated than the other frameworks.

For a comprehensive TypeScript setup guide, see our [Building Chrome Extensions with TypeScript tutorial]({{ site.baseurl }}{% link docs/guides/chrome-extension-development-typescript-tutorial.md %}) and the [Chrome Extension Development TypeScript Guide]({{ site.baseurl }}{% link docs/guides/chrome-extension-development-typescript-2026.md %}).

---

## Build Output Analysis {#build-output-analysis}

### WXT Build Output

WXT produces highly optimized builds with automatic code splitting across extension contexts. The framework intelligently separates vendor code, extension-specific code, and shared utilities. A typical WXT build creates separate chunks for the popup, background, content scripts, and options page, ensuring each context loads only what's necessary.

### Plasmo Build Output

Plasmo builds tend to be larger due to the Next.js dependencies it inherits. However, the framework compensates with excellent tree-shaking and code elimination. Plasmo's build includes automatic manifest generation with all required permissions and host permissions accurately computed from your code.

### CRXJS Build Output

CRXJS gives you complete control over build output. Without framework opinions, you can optimize aggressively or implement custom chunking strategies. The trade-off is that you must configure optimization manually.

---

## Cross-Browser Support {#cross-browser-support}

### WXT

WXT supports Chrome, Firefox, Edge, and Opera out of the box. The framework abstracts browser-specific API differences and provides polyfills where necessary. WXT's browser targeting is configured through its configuration file:

```typescript
// wxt.config.ts
export default defineConfig({
  browsers: ['chrome', 'firefox', 'edge']
})
```

### Plasmo

Plasmo primarily targets Chrome and Firefox, with limited support for other Chromium-based browsers. The framework provides browser detection utilities but doesn't offer the same level of abstraction as WXT.

### CRXJS

CRXJS supports any browser that uses the Chrome extension manifest format. Since CRXJS is just a build plugin, cross-browser support depends entirely on your implementation and the APIs you use.

---

## Community Size and Ecosystem {#community-size-and-ecosystem}

### WXT

WXT has grown rapidly since its release, with an active Discord community and growing npm package usage. The framework has excellent integration with popular frontend libraries and maintains its own ecosystem of plugins for common extension features.

### Plasmo

Plasmo has the largest community among extension-specific frameworks, with over 15,000 GitHub stars and active Discord support. The framework has spawned a vibrant ecosystem of community plugins, templates, and tutorials. Many extension developers have built their products on Plasmo, creating a robust knowledge base.

### CRXJS

CRXJS has a smaller community but benefits from the broader Vite ecosystem. Since CRXJS is a thin wrapper around Vite, developers can leverage the massive Vite plugin ecosystem for additional functionality.

---

## Documentation Quality {#documentation-quality}

### WXT

WXT documentation is comprehensive and well-organized, covering every feature with examples. The documentation includes migration guides, API references, and tutorials for common extension patterns. The WXT team maintains an active blog with tips and best practices.

### Plasmo

Plasmo excels in documentation quality. The official docs include interactive examples, API references, and detailed guides for every feature. The framework also provides a comprehensive "Batteries Included" documentation covering storage, messaging, and deployment.

### CRXJS

CRXJS documentation focuses on the core functionality—manifest generation and build tooling. Additional documentation is sparse, and developers often need to consult Vite documentation for advanced configurations.

---

## Starter Templates {#starter-templates}

### WXT

WXT offers official starter templates for React, Vue, Svelte, and vanilla TypeScript. Each template includes pre-configured TypeScript, styling, and testing setups. The templates are production-ready and serve as excellent references.

### Plasmo

Plasmo provides the most extensive template library, including starters for React, Next.js, Vue, and Svelte. Additional community templates cover specific use cases like side panel extensions, dev tools, and email extensions.

### CRXJS

CRXJS doesn't provide official templates, but the Vite ecosystem offers numerous extension-adjacent templates that can be adapted with CRXJS.

---

## Real Project Migration Stories {#real-project-migration-stories}

### Migrating from Webpack to WXT

Teams migrating from webpack-based extension projects to WXT report 60-80% reduction in build times and significantly improved developer experience. The automatic manifest generation eliminates a common source of bugs, and the file-based routing reduces boilerplate code substantially.

### Migrating from Vanilla to Plasmo

Developers who've built extensions with vanilla JavaScript often migrate to Plasmo for better state management and developer tooling. The transition typically involves adopting the framework's patterns for storage and messaging, but the productivity gains justify the learning curve.

### Migrating from CRA/Next.js to CRXJS

Teams using Create React App or Next.js for extensions have found CRXJS to be a natural migration path. The minimal configuration overhead and familiar Vite experience make the transition straightforward while maintaining full control over the project structure.

---

## Bundle Size Comparison {#bundle-size-comparison}

| Framework | Minified Popup | Minified Background | Content Script |
|-----------|---------------|---------------------|----------------|
| WXT | ~45 KB | ~35 KB | ~15 KB |
| Plasmo | ~120 KB | ~80 KB | ~25 KB |
| CRXJS | ~40 KB | ~30 KB | ~12 KB |

*Note: Bundle sizes vary based on dependencies and optimization settings. Values represent typical production builds with comparable functionality.*

WXT and CRXJS produce similar bundle sizes, while Plasmo's additional abstractions result in larger bundles. However, Plasmo's bundle includes many features that would require manual implementation with other frameworks.

---

## When to Use Each Framework {#when-to-use-each-framework}

### Choose WXT When:

- You want a balance of power and simplicity
- Your project uses React, Vue, Svelte, or vanilla TypeScript
- Automatic manifest generation is important to you
- You need excellent cross-browser support
- Developer experience is a top priority

### Choose Plasmo When:

- You need built-in storage and messaging abstractions
- Your team is familiar with Next.js patterns
- You want the largest ecosystem of plugins and templates
- You need rapid development with minimal configuration
- Your extension requires complex state management

### Choose CRXJS When:

- You want maximum flexibility and control
- You're already using Vite for other projects
- You prefer to build your own abstractions
- Bundle size is critical
- You need minimal dependencies

---

## Recommendation Matrix {#recommendation-matrix}

| Criteria | WXT | Plasmo | CRXJS |
|----------|-----|--------|-------|
| Ease of Setup | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| HMR Experience | ★★★★★ | ★★★★★ | ★★★★☆ |
| TypeScript Support | ★★★★★ | ★★★★★ | ★★★★☆ |
| Bundle Size | ★★★★☆ | ★★★☆☆ | ★★★★★ |
| Documentation | ★★★★★ | ★★★★★ | ★★★☆☆ |
| Community | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| Flexibility | ★★★★☆ | ★★★☆☆ | ★★★★★ |
| Cross-Browser | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| Enterprise Ready | ★★★★☆ | ★★★★★ | ★★★☆☆ |

---

## Conclusion

For most new Chrome extension projects in 2026, **WXT** emerges as the best overall choice. It provides an excellent balance of developer experience, build performance, and cross-browser support without the overhead of larger frameworks. The file-based routing and automatic manifest generation significantly reduce boilerplate while maintaining full flexibility.

However, if your project requires the sophisticated storage and messaging abstractions that Plasmo provides, or if your team is already deeply familiar with Next.js patterns, Plasmo remains an excellent choice with the strongest ecosystem.

**CRXJS** is best suited for experienced developers who need maximum control over their build process and prefer to implement their own patterns rather than adopt framework conventions.

Whatever framework you choose, ensure your team is comfortable with the TypeScript setup. Proper typing significantly reduces runtime errors and makes maintenance easier long-term. See our [TypeScript tutorial]({{ site.baseurl }}{% link docs/guides/chrome-extension-development-typescript-tutorial.md %}) and [development guides]({{ site.baseurl }}{% link docs/guides/chrome-extension-development-typescript-2026.md %}) for in-depth help getting started.

---

## Related Articles

- [Building Chrome Extensions with TypeScript]({{ site.baseurl }}{% link docs/guides/chrome-extension-development-typescript-tutorial.md %})
- [Chrome Extension Development Tutorial]({{ site.baseurl }}{% link docs/guides/chrome-extension-development-typescript-2026.md %})
- [Chrome Extension Architecture Patterns]({{ site.baseurl }}{% link docs/guides/architecture-patterns.md %})
- [Cross-Browser Extension Development]({{ site.baseurl }}{% link docs/guides/cross-browser-extension-development.md %})

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
