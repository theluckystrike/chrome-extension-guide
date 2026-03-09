---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Comprehensive comparison of WXT, Plasmo, and CRXJS frameworks for Chrome extension development in 2026. Learn architecture, HMR, TypeScript, build output, and find your ideal framework."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for Chrome extension development can significantly impact your productivity, maintainability, and the quality of your final product. In this comprehensive guide, we compare three popular options—WXT, Plasmo, and CRXJS—to help you make an informed decision for your next extension project.

## Framework Architecture Comparison

### WXT Architecture

WXT (Web Extension Toolkit) is built on top of Vite, leveraging its blazing-fast HMR and optimized build system. The architecture follows a convention-over-configuration approach, automatically handling the complex manifest generation and asset bundling that Chrome extensions require.

WXT's core strengths lie in its zero-config philosophy. Out of the box, it supports multiple entry points, automatic manifest generation from your source files, and seamless integration with popular frontend frameworks like Vue, React, Svelte, and vanilla JavaScript. The framework abstracts away the boilerplate while providing sensible defaults that work for most extension types.

The architecture also includes a powerful plugin system that extends functionality for specific use cases. Whether you need content script injection, background service worker optimization, or custom build steps, WXT's plugin ecosystem has you covered.

### Plasmo Architecture

Plasmo takes a battery-included approach, providing a robust framework specifically designed for extension development from the ground up. Unlike WXT which adapts a general-purpose build tool, Plasmo is purpose-built for browser extensions, offering specialized handling for popup pages, options pages, content scripts, and background service workers.

Plasmo uses a declarative approach to defining extension components. Your popup, options page, and content scripts are treated as first-class citizens with built-in support for messaging, storage, and cross-context communication. This architectural decision makes it particularly appealing for developers building complex extensions with multiple interaction points.

The framework also embraces a "framework-agnostic" philosophy, allowing you to use React, Vue, Svelte, or even vanilla TypeScript. However, it provides enhanced support for React developers with additional hooks and utilities specifically designed for extension contexts.

### CRXJS Architecture

CRXJS (Chrome Runtime Extension JavaScript) is the newcomer to the space, built specifically as a modern alternative to the aging Webpack-based tooling. It focuses on providing a streamlined Vite-powered development experience with first-class support for the Manifest V3 standard.

CRXJS distinguishes itself through its emphasis on simplicity and minimal overhead. The architecture is deliberately lean, avoiding the feature bloat that can come with more comprehensive frameworks. This makes it an excellent choice for developers who want direct control over their build process without sacrificing modern developer experience.

The framework provides excellent TypeScript support out of the box and includes smart defaults for common extension patterns. However, it requires more manual configuration compared to WXT and Plasmo for complex scenarios.

## Hot Module Replacement (HMR) Support

### WXT HMR

WXT inherits Vite's industry-leading HMR implementation, providing near-instant updates during development. When you modify your popup code, background script, or content script, changes appear within milliseconds without losing application state. This makes the development workflow exceptionally smooth, especially when iteratively debugging extension behavior.

The HMR system handles all extension contexts intelligently. Changes to popup UI update in real-time, background script changes are injected without service worker restart delays, and content script modifications reflect immediately in injected pages. WXT also provides a useful devtools panel for monitoring extension-specific events during development.

### Plasmo HMR

Plasmo offers comprehensive HMR across all extension contexts. The framework includes a dedicated development server that handles the complexity of serving content to different extension contexts simultaneously. When you modify your popup, options page, or content scripts, Plasmo intelligently refreshes only the affected parts of your extension.

One standout feature is Plasmo's live-reload capability for extension options pages and popup pages. The framework maintains state where possible, meaning you don't lose your popup's current state when making UI changes. This significantly speeds up the iterative development process for complex user interfaces.

### CRXJS HMR

CRXJS provides solid HMR support through its Vite foundation. The framework automatically detects which parts of your extension changed and applies updates accordingly. Content script changes are particularly well-handled, with CRXJS offering options for both full reload and hot replacement depending on your debugging needs.

The development experience is streamlined, though some developers report that HMR for background service workers can occasionally require manual refreshes. Overall, the experience is comparable to other Vite-based solutions, though WXT's specialized extension HMR provides a slight edge.

## TypeScript Integration

All three frameworks offer first-class TypeScript support, but with different approaches and levels of polish.

### WXT TypeScript

WXT provides TypeScript support through comprehensive type definitions and sensible defaults. The framework automatically generates types for your manifest, allowing you to reference extension permissions, content script matches, and other manifest properties with full type safety. This is particularly valuable when working with complex permission requirements or dynamic content script injection.

The TypeScript setup requires minimal configuration, with WXT handling the complex type merging between your source code, Chrome API types, and framework internals. Most projects can achieve full type safety with just `@types/chrome` installed.

### Plasmo TypeScript

Plasmo's TypeScript integration is arguably its strongest feature. The framework includes custom TypeScript definitions for extension-specific patterns, including enhanced types for message passing, storage operations, and cross-context communication. Plasmo's `useStorage`, `useMessage`, and other hooks are fully typed with comprehensive type inference.

The framework also provides TypeScript support for its declarative content script definition system, making it easy to define which pages your content scripts inject into with full type safety. This significantly reduces runtime errors related to content script configuration.

### CRXJS TypeScript

CRXJS offers straightforward TypeScript support through standard Vite configuration. You'll need to manually set up type definitions for Chrome APIs (typically through `@types/chrome`), but beyond that, the experience is similar to developing any modern TypeScript application.

The framework doesn't provide the specialized extension types that Plasmo offers, meaning you'll need to be more explicit about types in certain contexts. However, for developers comfortable with TypeScript, this provides flexibility without unnecessary abstraction.

## Build Output Analysis

### WXT Build Output

WXT produces optimized, production-ready extension bundles. The build process generates separate chunks for each extension context (popup, background, content scripts), ensuring that each part of your extension loads only what's necessary. The framework applies minification, tree-shaking, and code splitting automatically.

One notable advantage is WXT's support for multiple output formats. You can generate Chrome extensions, Firefox add-ons, and even Edge extensions from the same source code, with the framework handling browser-specific differences automatically. The build output is clean and follows Chrome's recommended structure.

### Plasmo Build Output

Plasmo generates highly optimized bundles with intelligent code splitting. The framework separates your code into logical chunks based on extension context, ensuring that popup code doesn't bundle with background script code unnecessarily. This results in smaller overall bundle sizes and faster extension load times.

The build output includes automatic handling of static assets, including icons, images, and HTML files. Plasmo also handles the generation of multiple entry points (popup, options, devtools, new tab) seamlessly, producing a clean, organized extension structure ready for publication.

### CRXJS Build Output

CRXJS produces straightforward, well-organized build output. The framework leverages Vite's build optimization, generating minified bundles with effective tree-shaking. The output structure is clean and follows standard Chrome extension conventions, making it easy to understand and debug.

However, CRXJS doesn't provide the same level of automatic multi-browser support as WXT. You'll need to handle browser-specific manifest differences manually, though the framework does provide utilities to help with this process.

## Cross-Browser Support

### WXT Cross-Browser

WXT excels in cross-browser compatibility. The framework can generate extensions for Chrome, Firefox, Safari (via App Store), and Edge from a single codebase. It handles the divergent APIs and manifest differences between browsers automatically, significantly reducing the effort required to publish across multiple stores.

The cross-browser support extends to testing as well. WXT includes built-in support for running your extension in different browsers during development, making it easier to catch browser-specific issues early in the development process.

### Plasmo Cross-Browser

Plasmo provides solid cross-browser support, though it's more Chrome-focused than WXT. The framework supports Firefox development and build output, but Safari support requires additional configuration. The documentation provides guidance for multi-browser scenarios, but the process is less streamlined than WXT.

For teams primarily targeting the Chrome Web Store with secondary Firefox support, Plasmo's cross-browser capabilities are more than adequate.

### CRXJS Cross-Browser

CRXJS offers basic cross-browser support. The framework can generate Firefox-compatible builds with some manual configuration, but multi-browser development requires more hands-on approach compared to the other frameworks. This is by design—CRXJS prioritizes simplicity and Chrome-focused development.

## Community Size and Documentation Quality

### Community Comparison

As of 2026, Plasmo has the largest community among extension-specific frameworks, with active Discord channels, comprehensive documentation, and a growing ecosystem of plugins and templates. WXT has rapidly gained popularity, particularly among developers who appreciate its Vite foundation and zero-config approach. CRXJS, while newer, has built a passionate following among developers who prefer minimal abstractions.

### Documentation Quality

Plasmo's documentation is exceptional, with detailed guides covering virtually every aspect of extension development. The framework's documentation includes interactive examples, API references, and troubleshooting guides. WXT's documentation is comprehensive if slightly less extensive than Plasmo's, while CRXJS provides solid documentation with room for growth.

## Starter Templates

All three frameworks offer starter templates to accelerate project initialization:

**WXT Templates**: Includes templates for Vue, React, Svelte, vanilla TypeScript, and even framework-agnostic setups. Each template includes sensible defaults and example code demonstrating core extension patterns.

**Plasmo Templates**: Offers React, Next.js, and vanilla TypeScript starters. The React templates are particularly well-developed, with examples for popup pages, options pages, and content scripts with messaging integration.

**CRXJS Templates**: Provides minimal templates focused on specific use cases. The templates prioritize simplicity, giving developers a clean starting point without predefined opinions.

## Real Project Migration Stories

### Migrating from Create React App to WXT

Teams migrating from CRA-based extension development often report significant improvements with WXT. The transition typically involves updating build configuration and adjusting file structure to match WXT's conventions. Most migrations complete within a day, with immediate benefits in build times and development workflow.

### Migrating from Webpack to Plasmo

Developers moving from manual Webpack configurations to Plasmo appreciate the framework's handling of complex extension patterns. Content script injection, background service worker management, and cross-context messaging become significantly simpler. The migration usually requires rethinking component architecture to leverage Plasmo's declarative patterns.

### Starting Fresh with CRXJS

For new projects, CRXJS offers an attractive middle ground. Teams report that the framework provides just enough structure to be productive without imposing specific patterns. This makes it particularly popular among independent developers and small teams who want direct control over their architecture.

## Bundle Size Comparison

In testing with a typical extension featuring a popup, options page, and content script:

- **WXT**: Produces the smallest overall bundle size due to aggressive optimization and effective code splitting
- **Plasmo**: Slightly larger due to additional framework utilities, but still highly optimized
- **CRXJS**: Comparable to WXT for similar configurations, though may require more manual optimization

## When to Use Each Framework

### Choose WXT When:

- You need excellent cross-browser support for Chrome, Firefox, and Safari
- You want zero-config setup with sensible defaults
- You're building extensions that target multiple browsers
- You prefer Vite's development experience

### Choose Plasmo When:

- You're building React-based extensions with complex state management
- You want the best TypeScript experience for extension development
- You need excellent documentation and community support
- You're building a feature-rich extension with multiple interaction points

### Choose CRXJS When:

- You prefer minimal abstractions and direct control
- You're comfortable handling configuration yourself
- You want a lightweight solution focused on Chrome
- You value simplicity over comprehensive features

## Recommendation Matrix

| Feature | WXT | Plasmo | CRXJS |
|---------|-----|--------|-------|
| HMR Speed | ★★★★★ | ★★★★☆ | ★★★★☆ |
| TypeScript | ★★★★☆ | ★★★★★ | ★★★★☆ |
| Cross-Browser | ★★★★★ | ★★★☆☆ | ★★☆☆☆ |
| Documentation | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| Bundle Size | ★★★★★ | ★★★★☆ | ★★★★☆ |
| Setup Complexity | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Community | ★★★★☆ | ★★★★★ | ★★★☆☆ |

## Conclusion

For most new Chrome extension projects in 2026, **WXT** offers the best balance of features, cross-browser support, and developer experience. Its Vite foundation provides industry-leading development speed, while its zero-config approach reduces friction for new projects.

However, if you're building a React-based extension with complex state management and messaging patterns, **Plasmo**'s specialized hooks and excellent TypeScript support make it the superior choice. The framework's documentation and community support are unmatched.

For developers who prefer minimal abstractions and direct control over their build process, **CRXJS** provides a solid foundation without the complexity of more comprehensive frameworks.

Regardless of your choice, all three frameworks represent a significant improvement over traditional extension development approaches. The era of wrestling with Webpack configurations and manual manifest management is over—modern frameworks have made Chrome extension development genuinely enjoyable.

---

**Continue Learning**: Ready to dive deeper? Check out our [TypeScript Extension Development Tutorial](/guides/chrome-extension-development-typescript-tutorial/) or explore our [Development Guides](/guides/) for comprehensive coverage of extension development patterns.

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
