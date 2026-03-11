---
<<<<<<< HEAD
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Comprehensive comparison of WXT, Plasmo, and CRXJS frameworks for Chrome extension development in 2026. Architecture, HMR, TypeScript, bundle size, and recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
=======

title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: Comprehensive comparison of WXT, Plasmo, and CRXJS Chrome extension frameworks. Learn about architecture, HMR, TypeScript, build output, and find the best framework for your project.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"

>>>>>>> content/extension-frameworks-comparison
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

<<<<<<< HEAD
Choosing the right framework for Chrome extension development can significantly impact your productivity, build times, and the quality of your final product. In this comprehensive comparison, we analyze the three most popular modern frameworks—WXT, Plasmo, and CRXJS—across architecture, developer experience, performance, and community support to help you make an informed decision for your next extension project.

## Framework Architecture Comparison {#architecture-comparison}

Understanding the underlying architecture of each framework is crucial for making the right choice. Each framework takes a different approach to solving Chrome extension development challenges.

### WXT Architecture

WXT (Web Extension Tools) represents a modern, opinionated approach built on top of Vite. It leverages Vite's powerful dev server and build system while adding extension-specific optimizations. WXT handles the complexity of manifest generation, multi-page entry points, and content script injection through a declarative configuration system.

The framework uses a file-system-based routing approach where your project structure directly maps to extension components. Placing a file in `entry/popup/index.html` automatically creates the popup, while `entry/options/index.html` generates the options page. This convention-over-configuration pattern reduces boilerplate and speeds up development.

WXT abstracts away the differences between Chrome's extension API and other browser implementations, providing a unified interface that generates browser-specific builds. The framework includes built-in support for:
- Automatic manifest generation (MV2 and MV3)
- Content script bundling and injection
- Background service worker management
- HTML entry point handling
- Asset optimization and hashing

### Plasmo Architecture

Plasmo takes a framework-first approach, treating Chrome extension development similar to building a modern web application. It extends Next.js-like patterns to extension development, offering file-based routing, server-side rendering capabilities for extension pages, and a component-based architecture.

The framework uses a sophisticated build pipeline based on Webpack, with custom loaders for handling extension-specific assets. Plasmo's architecture emphasizes developer experience through hot module replacement (HMR) and provides a rich set of APIs for common extension patterns like messaging, storage, and authentication.

Plasmo's key architectural features include:
- Component-based architecture using React
- Built-in support for extension-specific hooks
- Messaging system abstraction
- Storage wrapper with TypeScript support
- Support for both MV2 and MV3 manifests

### CRXJS Architecture

CRXJS (Chrome Extension JavaScript) takes a different approach by focusing on being a build tool rather than a full framework. It integrates with existing Vite projects to handle the Chrome extension-specific build requirements while letting you maintain control over your project's architecture.

The framework emphasizes simplicity and flexibility. CRXJS handles manifest generation, content script injection, and cross-browser compatibility without imposing rigid project structures or requiring specific frameworks like React. This makes it ideal for developers who want modern build tooling without the framework overhead.

CRXJS provides:
- Vite plugin for extension development
- Manifest V3 support
- Content script bundling
- Automatic extension reloading
- Cross-browser manifest generation

## Hot Module Replacement (HMR) Support {#hmr-support}

Fast iteration cycles are essential for productive extension development. Let's examine how each framework handles HMR.

### WXT HMR

WXT provides excellent HMR through Vite's native capabilities. Changes to popup pages, options pages, and content scripts trigger instant updates without requiring extension reload. The framework intelligently distinguishes between files that require full page reloads and those that can update in-place.

Background service worker updates require extension reload, but WXT minimizes this by supporting partial reload capabilities. The dev server automatically handles extension manifest updates, ensuring your extension remains functional during development.

### Plasmo HMR

Plasmo's HMR implementation is particularly sophisticated, offering near-instant updates for most code changes. The framework maintains a persistent connection to the browser, pushing updates as soon as files change. React component updates reflect immediately, while background script changes trigger selective reloads.

Plasmo's messaging system integrates with HMR, allowing developers to test inter-component communication without manual intervention. The framework provides development-specific APIs that behave differently during hot reloads, enabling advanced testing scenarios.

### CRXJS HMR

CRXJS leverages Vite's HMR system, providing fast updates for most development scenarios. The main limitation involves background service workers, which require extension reload due to browser restrictions. CRXJS addresses this by providing clear reload notifications and minimizing the scope of required reloads.

## TypeScript Integration {#typescript-integration}

TypeScript support varies significantly across frameworks, affecting type safety and developer experience.

### WXT TypeScript Support

WXT includes first-class TypeScript support with automatic type generation for extension APIs. The framework provides type definitions for:
- Chrome extension APIs
- Manifest schema
- Message passing
- Storage operations

TypeScript configuration requires minimal setup, with sensible defaults that work for most projects. WXT generates type definitions from your configuration, ensuring type safety between your code and the generated manifest.

### Plasmo TypeScript Support

Plasmo offers comprehensive TypeScript integration through custom type definitions and integration with TypeScript's language server. The framework provides:
- Full type coverage for extension APIs
- Storage type wrappers
- Message type inference
- Component prop typing

Plasmo's TypeScript support extends to its messaging system, enabling type-safe inter-component communication. The framework's CLI includes type checking in its build process, catching type errors before deployment.

### CRXJS TypeScript Support

CRXJS provides TypeScript support through Vite's TypeScript integration. While not as extension-specific as WXT or Plasmo, CRXJS supports TypeScript configuration and provides extension-related type definitions through community packages.

Developers using CRXJS often combine it with `@types/chrome` for extension API types and maintain custom types for their specific extension patterns.

## Build Output Analysis {#build-output}

Understanding build output helps optimize extension performance and manage bundle sizes.

### WXT Build Output

WXT generates optimized builds with automatic code splitting and tree shaking. The framework produces separate chunks for:
- Popup and options page bundles
- Background service worker
- Content scripts
- Shared dependencies

Build output includes versioned assets with content hashing for cache busting. WXT's build system minimizes duplication between content script bundles and other extension components.

### Plasmo Build Output

Plasmo's Webpack-based build produces well-organized output with clear separation between entry points. The framework handles dependency deduplication automatically, ensuring shared code appears only once in the final bundle.

Build output includes source maps for debugging, with options to disable them for production builds. Plasmo provides build analysis tools to identify large dependencies and optimization opportunities.

### CRXJS Build Output

CRXJS generates builds using Vite's Rollup-based bundler, producing highly optimized output with automatic code splitting. The framework's build output is particularly clean, with minimal framework overhead.

Vite's build system provides excellent tree shaking, removing unused code from the final bundle. CRXJS supports chunk splitting strategies to optimize loading performance.

## Cross-Browser Support {#cross-browser}

Modern extensions often target multiple browsers. Here's how each framework handles cross-browser compatibility.

### WXT Cross-Browser

WXT provides excellent cross-browser support through its abstraction layer. The framework generates browser-specific builds targeting:
- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Opera
- Brave

Configuration options allow specifying browser-specific APIs and fallbacks for features not supported across all browsers. WXT handles manifest differences automatically, generating appropriate manifests for each target browser.

### Plasmo Cross-Browser

Plasmo focuses primarily on Chrome extension APIs but provides fallbacks for Firefox compatibility. The framework's configuration system supports defining browser-specific behaviors through conditional logic.

Firefox support requires additional configuration and testing, as some Chrome-specific features need polyfills or alternatives. Plasmo's documentation includes guidance for common cross-browser scenarios.

### CRXJS Cross-Browser

CRXJS generates cross-browser manifests through its configuration system. The framework supports Chrome, Firefox, and Edge manifest formats, handling the differences between browser extension platforms.

Developers using CRXJS have full control over browser-specific implementations, allowing precise optimization for each target browser without framework-imposed limitations.

## Community Size and Documentation {#community-docs}

Community support and documentation quality significantly impact developer success.

### WXT Community

WXT has grown rapidly since its release, building a supportive community on GitHub and Discord. The framework's documentation is comprehensive, with guides covering common scenarios and API references for all features. Community contributions enhance documentation with real-world examples and tutorials.

GitHub stars and active issue resolution indicate strong community engagement. WXT's maintainer, [@antfu](https://github.com/antfu), brings experience from the Vue/Vite ecosystem, contributing to the framework's quality and adoption.

### Plasmo Community

Plasmo has established the largest community among extension frameworks, with active Discord channels, comprehensive documentation, and numerous community tutorials. The framework's popularity stems from its developer-friendly approach and early market presence.

Documentation quality is excellent, with step-by-step guides, API references, and example projects. The Plasmo team actively engages with the community through GitHub discussions and Discord, addressing issues promptly.

### CRXJS Community

CRXJS has a smaller but dedicated community, with focus on GitHub discussions and documentation. While not as extensive as Plasmo's, the documentation covers all essential features with clear examples.

The framework's simpler scope means less community contribution, but active maintainers ensure issues receive attention.

## Starter Templates {#starter-templates}

Quick project setup accelerates development. Each framework offers starter options.

### WXT Templates

WXT provides official starter templates through its CLI:
- Vanilla JavaScript/TypeScript
- React
- Vue
- Svelte
- Preact

Templates include essential configurations and demonstrate best practices for each framework combination. The CLI's interactive prompts guide you through template selection and configuration.

### Plasmo Templates

Plasmo offers comprehensive starter templates:
- React (default)
- React with TypeScript
- React with Redux
- Framework examples for various UI libraries

Templates include pre-configured build tooling, testing setups, and example extension components demonstrating messaging and storage patterns.

### CRXJS Templates

CRXJS focuses on integration with existing Vite templates rather than providing extension-specific starters. Developers typically:
1. Create a Vite project with their preferred framework
2. Add the CRXJS Vite plugin
3. Configure extension-specific settings

This approach provides maximum flexibility but requires more initial setup.

## Real Project Migration Stories {#migration-stories}

Understanding real-world migration experiences provides valuable insights.

### Migrating to WXT

Developers migrating from manual extension setup or older tools report significant productivity improvements. Common migration paths include:
- Plain JavaScript projects → WXT with React/Vue
- Chrome extension boilerplate → WXT for better HMR
- Create-react-app extensions → WXT for modern tooling

Key benefits reported include reduced build times (often 50%+ faster), improved HMR reliability, and cleaner project structure.

### Migrating to Plasmo

Plasmo migrations often involve teams moving from custom build setups or older frameworks like extensionizr. Common patterns include:
- Plain extensions → Plasmo for component architecture
- WXT → Plasmo for more React-centric patterns
- Custom Webpack → Plasmo for better HMR

Teams appreciate Plasmo's opinionated structure, which reduces architectural decisions and speeds up onboarding new developers.

### Migrating to CRXJS

CRXJS appeals to developers wanting modern tooling without framework commitment:
- Plain extensions → CRXJS for Vite benefits
- Other frameworks → CRXJS for simpler architecture
- Webpack projects → CRXJS for Vite migration

Developers maintaining multiple extensions appreciate CRXJS's flexibility in adapting to different project structures.

## Bundle Size Comparison {#bundle-size}

Bundle size affects extension loading performance and user experience. These comparisons represent typical production builds with similar functionality.

| Framework | Base Bundle | With React | Content Script |
|-----------|-------------|------------|----------------|
| WXT | ~50KB | ~120KB | ~15KB |
| Plasmo | ~80KB | ~150KB | ~25KB |
| CRXJS | ~45KB | ~110KB | ~12KB |

Note: Actual sizes vary based on dependencies, code splitting, and optimization settings. WXT and CRXJS benefit from Vite's efficient bundling, while Plasmo's additional features contribute to larger base bundles.

## When to Use Each Framework {#when-to-use}

### Choose WXT When

- You want the best balance of features and simplicity
- Vite ecosystem integration is important to you
- Cross-browser support is a priority
- You prefer Vue, Svelte, or Preact over React
- Clean, maintainable project structure matters
- You want active development and modern tooling

### Choose Plasmo When

- React is your primary framework
- You need extensive starter templates
- Community support and resources are important
- Framework-provided patterns speed up development
- You want built-in messaging and storage abstractions
- Extension-specific hooks save development time

### Choose CRXJS When

- You want minimal framework overhead
- Flexibility in project architecture is crucial
- You're migrating from existing Vite projects
- You prefer manual control over build configuration
- Simplicity aligns with your development philosophy
- You want to use any UI framework without constraints

## Recommendation Matrix {#recommendation-matrix}

| Criteria | WXT | Plasmo | CRXJS |
|----------|-----|--------|-------|
| Architecture | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| HMR Support | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| TypeScript | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Build Output | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Cross-Browser | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Community | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Documentation | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Templates | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Bundle Size | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Conclusion

All three frameworks represent excellent choices for Chrome extension development in 2026. Your decision should align with your project requirements, team expertise, and development preferences.

For most new projects, **WXT** offers the best overall package—modern tooling, excellent cross-browser support, flexible framework choices, and active development. Its balance of features and simplicity makes it our top recommendation.

**Plasmo** remains excellent for teams committed to React and wanting maximum community resources and extension-specific abstractions. The framework's opinionated approach accelerates development when it aligns with your needs.

**CRXJS** serves developers who value simplicity and flexibility, offering modern Vite-based tooling without framework constraints. It's ideal for projects where minimal overhead and maximum control are priorities.

Regardless of your choice, all three frameworks provide significant improvements over manual extension development, making Chrome extension creation more accessible and maintainable than ever before.

---

## Related Articles

- [Chrome Extension Development with TypeScript Tutorial](../guides/chrome-extension-development-typescript-tutorial.md)
- [TypeScript Setup for Extensions](../guides/typescript-setup.md)
- [Chrome Extension Development Guide](../guides/chrome-extension-development-tutorial-typescript-2026.md)
- [Architecture Patterns for Extensions](../guides/architecture-patterns.md)

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one).*
=======
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
>>>>>>> content/extension-frameworks-comparison
