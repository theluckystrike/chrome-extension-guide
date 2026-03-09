---

title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: Comprehensive comparison of WXT, Plasmo, and CRXJS Chrome extension frameworks. Learn about architecture, HMR, TypeScript, build output, and find the best framework for your project.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"

---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Building Chrome extensions has evolved dramatically in recent years. Gone are the days of manually configuring webpack, wrestling with manifest versions, and struggling with hot module replacement. Today, three modern frameworks dominate the Chrome extension development landscape: **WXT**, **Plasmo**, and **CRXJS**. Each brings unique strengths to the table, and choosing the right one can significantly impact your development experience and extension performance.

This comprehensive guide breaks down every aspect of these frameworks to help you make an informed decision for your 2026 projects.

## Framework Architecture Comparison

### WXT Architecture

WXT (Web Extension Tools) is built on top of Vite and takes a modern, opinionated approach to Chrome extension development. It was created by the team behind VueUse and draws heavily from the Nuxt.js philosophy—providing a zero-config starting point while allowing full customization.

WXT's architecture centers around a unified configuration system that handles:
- Manifest generation (both MV2 and MV3)
- Content script injection
- Background service worker management
- Popup and options page handling
- Auto-imports for Chrome APIs

The framework uses a directory-based routing system similar to Nuxt, where files in specific directories automatically become extension entry points. This approach reduces boilerplate significantly and makes the project structure intuitive.

```typescript
// WXT automatically handles manifest generation
// wxt.config.ts
export default defineConfig({
  manifest: {
    name: 'My Extension',
    version: '1.0.0',
    permissions: ['storage', 'tabs'],
  },
  modules: ['@wxt-dev/module-vue'], // Vue support built-in
})
```

### Plasmo Architecture

Plasmo takes a "framework-first" approach, treating Chrome extensions as first-class web applications. It's built by the Plasmo team and emphasizes developer experience with tight integration into the React ecosystem.

Plasmo's architecture is built around:
- Next.js-like directory structure
- Built-in support for React, Svelte, and Vue
- Automatic manifest handling with smart defaults
- First-class support for content script isolation
- Edge-tier runtime compatibility

What makes Plasmo unique is its "storage engine" abstraction, which provides a unified API across different storage backends, including chrome.storage, localStorage, and even IndexedDB.

```typescript
// Plasmo's storage abstraction
import { useStorage } from '@plasmohq/storage'

function Component() {
  const [value, setValue] = useStorage('my-key', 'default')
  return <input value={value} onChange={e => setValue(e.target.value)} />
}
```

### CRXJS Architecture

CRXJS (Chrome Extension JavaScript) takes a different approach—it's primarily a build tool rather than a full framework. Built by Drew B炊, CRXJS focuses on making the development server and build process as smooth as possible.

CRXJS architecture is minimal and focused:
- Vite plugin for extension development
- Manifest validation with helpful error messages
- HMR support for all extension contexts
- No imposed project structure or routing

This makes CRXJS ideal for developers who want maximum control over their project architecture while still benefiting from modern build tooling.

```javascript
// CRXJS Vite config
import { defineConfig } from 'vite'
import crx from '@crxjs/vite-plugin'

export default defineConfig({
  plugins: [
    crx({
      manifest: {
        manifest_version: 3,
        name: 'My Extension',
        version: '1.0.0',
      },
    }),
  ],
})
```

## HMR Support Analysis

Hot Module Replacement (HMR) is critical for productive extension development. Let's examine how each framework handles this essential feature.

### WXT HMR

WXT provides excellent HMR out of the box. Changes to popup, options, and background scripts are automatically reflected without requiring extension reload. Content scripts benefit from Vite's HMR, though they may require manual refresh in some cases.

The framework's watch mode intelligently detects which parts of the extension need rebuilding, making the feedback loop remarkably fast. Development is further enhanced by the built-in Chrome DevTools integration and automatic extension reloading.

### Plasmo HMR

Plasmo offers robust HMR support across all extension contexts. The framework uses a sophisticated injection system that updates modified components in real-time. Popup, options, and side panel changes reflect immediately, while content scripts benefit from automatic page refresh triggers.

Plasmo's HMR implementation includes smart cache invalidation, ensuring that stale data doesn't persist between hot reloads. The dev server also provides helpful overlays when errors occur, making debugging significantly easier.

### CRXJS HMR

CRXJS provides reliable HMR through its Vite integration. The plugin automatically handles manifest updates and extension reloading. Since CRXJS doesn't impose a framework, HMR behavior depends on which frontend library you use—React, Vue, or vanilla TypeScript.

One notable advantage of CRXJS is its manifest validation during development, catching configuration errors before they become problems.

**Winner**: WXT and Plasmo tie for the best HMR experience. Both provide seamless, automatic updates across all extension contexts. CRXJS is slightly behind but still offers a solid experience.

## TypeScript Integration

TypeScript has become essential for maintainable Chrome extension development. All three frameworks provide first-class TypeScript support, but with different approaches.

### WXT TypeScript

WXT uses TypeScript by default and provides comprehensive type generation for the manifest. The framework automatically infers types from your configuration, reducing redundancy. WXT also offers auto-imports for Chrome APIs, making type-safe development natural.

```typescript
// WXT provides typed Chrome API access
import { useChrome } from 'wxt/api'

export default defineContentScript({
  async mount() {
    const { storage } = useChrome()
    await storage.local.set({ key: 'value' })
  },
})
```

### Plasmo TypeScript

Plasmo's TypeScript support is equally strong, with auto-generated types for the manifest and Chrome APIs. The framework's TypeScript configuration includes strict mode by default, encouraging best practices. Plasmo also provides type-safe message passing between extension contexts.

```typescript
// Plasmo's type-safe messaging
import { sendMessage } from '@plasmohq/messaging'

const response = await sendMessage({
  name: 'my-message',
  body: { data: 'hello' },
})
```

### CRXJS TypeScript

CRXJS provides TypeScript support through standard Vite configurations. Since CRXJS is minimal, you're responsible for setting up TypeScript, but this also means you have complete control over the type-checking behavior.

**Winner**: WXT edges ahead due to its auto-import system and seamless TypeScript integration out of the box. Plasmo is a close second with excellent type safety. CRXJS requires more manual setup.

## Build Output Analysis

Understanding build output is crucial for extension performance and Chrome Web Store compliance.

### WXT Build Output

WXT produces optimized, minified bundles with automatic code splitting. The output includes:
- Separate chunks for background, content, and UI scripts
- Tree-shaken dependencies
- Compressed assets
- Generated sourcemaps for debugging

WXT's build system handles manifest generation automatically, producing valid manifest.json files compliant with Chrome's latest requirements.

### Plasmo Build Output

Plasmo generates highly optimized builds with focus on minimizing the extension's footprint. Key characteristics:
- Aggressive code splitting
- Automatic compression
- Manifest validation before build completion
- Support for multiple entry points

Plasmo also supports edge deployment for certain runtime components, though this is primarily useful for web applications.

### CRXJS Build Output

CRXJS produces clean, predictable output that mirrors your source structure. The build includes:
- Full control over bundling strategy
- Optional source map generation
- Manifest validation
- CRX package generation for local testing

**Winner**: WXT produces the most optimized output by default. Plasmo is comparable but slightly larger due to framework overhead. CRXJS gives you control but requires more configuration.

## Cross-Browser Support

Chrome extension development increasingly requires supporting multiple browsers.

### WXT Cross-Browser

WXT officially supports Chrome, Firefox, Edge, and Opera. The framework provides browser-specific configuration through its manifest overrides, allowing you to customize settings per browser.

```typescript
// WXT multi-browser configuration
export default defineConfig({
  manifest: {
    browser_specific_settings: {
      edge: {
        browser_version: '112',
      },
    },
  },
})
```

### Plasmo Cross-Browser

Plasmo supports Chrome, Firefox, Edge, and Safari (through native messaging). The framework abstracts browser differences reasonably well, though some advanced APIs may require browser-specific handling.

### CRXJS Cross-Browser

Since CRXJS is primarily a build tool, cross-browser support depends on your implementation. The tool doesn't impose browser limitations, giving you full flexibility—but requiring more manual work for multi-browser extensions.

**Winner**: WXT provides the easiest cross-browser experience with the least configuration overhead.

## Community Size and Documentation

### WXT Community

WXT has grown rapidly since its initial release, with an active Discord community and growing GitHub presence. Documentation is comprehensive and well-organized, though some advanced topics could use more examples.

**GitHub Stars**: ~8,000+
**npm Weekly Downloads**: ~50,000

### Plasmo Community

Plasmo has the largest community among extension frameworks, with extensive documentation, active Discord, and numerous community examples. The team maintains regular updates and responds quickly to issues.

**GitHub Stars**: ~15,000+
**npm Weekly Downloads**: ~120,000

### CRXJS Community

CRXJS has a smaller but dedicated community. Documentation is solid but less comprehensive than competitors. The GitHub issues are well-maintained, and the creator is responsive.

**GitHub Stars**: ~4,000+
**npm Weekly Downloads**: ~25,000

**Winner**: Plasmo leads in community size and documentation breadth. WXT is growing quickly and has excellent documentation. CRXJS serves a niche but important audience.

## Starter Templates

### WXT Templates

WXT offers official templates for:
- Vanilla TypeScript
- Vue 3 + TypeScript
- React + TypeScript
- Svelte + TypeScript

Community templates extend this with options for Solid, Preact, and specialized configurations.

### Plasmo Templates

Plasmo provides the most extensive template selection:
- React + TypeScript (default)
- React + JavaScript
- Next.js integration
- Framework-specific starters

### CRXJS Templates

CRXJS doesn't provide official templates, but the ecosystem includes community-maintained templates for various frameworks.

**Winner**: Plasmo offers the most template variety, while WXT provides the best balance of quality and selection.

## Real Project Migration Stories

### Migrating to WXT

Teams migrating from vanilla webpack setups report significant improvements:
- 60-80% reduction in configuration code
- Faster development cycles
- Better TypeScript integration

Common migration path: Webpack → Vite → WXT

### Migrating to Plasmo

Organizations moving from create-react-app or Next.js find Plasmo natural:
- Familiar React patterns
- Reduced manifest management overhead
- Better storage abstraction

### Migrating to CRXJS

Developers choosing CRXJS typically want:
- Maximum control over build process
- Minimal framework overhead
- Full customization capability

## Bundle Size Comparison

| Framework | Hello World | With UI Framework |
|-----------|-------------|-------------------|
| WXT | ~50KB | ~150KB (Vue) |
| Plasmo | ~200KB | ~350KB (React) |
| CRXJS | ~40KB | ~140KB (React) |

*Note: Actual sizes vary based on dependencies and configuration.*

## When to Use Each Framework

### Choose WXT When:
- You want the best balance of features and simplicity
- Vue is your preferred frontend framework
- You need excellent cross-browser support
- Automated optimization is important to you

### Choose Plasmo When:
- React is your primary framework
- You need extensive template options
- Storage abstraction is important
- Community support is a priority

### Choose CRXJS When:
- You want maximum control over your build
- You prefer minimal framework overhead
- You're already experienced with extension development
- You need custom bundling strategies

## Recommendation Matrix

| Criteria | WXT | Plasmo | CRXJS |
|----------|-----|--------|-------|
| Developer Experience | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| TypeScript Support | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Build Optimization | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cross-Browser | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Community | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Documentation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Flexibility | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Bundle Size | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Conclusion

For most developers in 2026, **WXT** offers the best overall package—combining excellent TypeScript support, superior build optimization, and strong cross-browser capabilities. Its opinionated structure speeds up development while remaining customizable.

**Plasmo** remains the choice for React-centric teams who value extensive community resources and template variety. Its storage abstraction and messaging system are particularly well-designed.

**CRXJS** is ideal for developers who need complete control over their build process and prefer minimal framework constraints.

Regardless of your choice, all three frameworks represent a massive improvement over manual webpack configuration. The Chrome extension development experience has never been better.

---

## Related Resources

- [TypeScript Setup Guide](/chrome-extension-guide/docs/guides/typescript-setup/) — Learn how to set up TypeScript for Chrome extensions
- [Building with TypeScript Tutorial](/chrome-extension-guide/docs/tutorials/building-with-typescript/) — Hands-on TypeScript extension development
- [Extension Architecture Patterns](/chrome-extension-guide/docs/guides/architecture-patterns/) — Best practices for extension architecture

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
