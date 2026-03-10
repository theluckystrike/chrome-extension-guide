---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Comprehensive comparison of WXT, Plasmo, and CRXJS frameworks for Chrome extension development in 2026. Architecture, HMR, TypeScript, bundle size, and recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

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
