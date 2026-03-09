---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "A comprehensive comparison of WXT, Plasmo, and CRXJS extension frameworks covering architecture, HMR, TypeScript, build output, cross-browser support, and recommendations for 2026."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for building Chrome extensions has become significantly more complex as the ecosystem matures. What started as simple manifest.json files has evolved into sophisticated build systems with hot module replacement, multi-browser targeting, and complex state management. In this comprehensive guide, we compare three leading frameworks—WXT, Plasmo, and CRXJS—to help you make an informed decision for your extension project in 2026.

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

WXT represents a modern approach to extension development, built on top of Vite and designed specifically for the unique requirements of browser extensions. The architecture emphasizes a "frontend-first" philosophy, allowing developers to leverage their existing React, Vue, Svelte, or vanilla JavaScript skills without learning extension-specific APIs.

The core architecture revolves around a unified entry point system where WXT automatically generates the appropriate manifest.json based on file conventions. Content scripts, background workers, popup pages, and options pages are all treated as individual "pages" that can import shared modules. This approach eliminates the traditional separation anxiety between different extension contexts.

WXT's plugin system deserves special mention. The framework provides first-class support for extending its functionality through plugins, with official plugins for handling web resources, auto-importing components, and even integrating with popular frameworks like Tailwind CSS. The architecture is modular by design, allowing you to include only what your extension needs.

### Plasmo Architecture

Plasmo takes a different approach, positioning itself as a "framework for extensions" rather than a build tool with extension support. The architecture is built around the concept of "pages" and "panels," with strong opinions about how extension code should be organized.

One of Plasmo's distinguishing architectural decisions is its embrace of the "content script as a component" paradigm. Instead of treating content scripts as isolated JavaScript files, Plasmo allows you to write content scripts as React components that can leverage the full React ecosystem. This dramatically simplifies complex content script logic and enables proper state management within injected scripts.

The framework also introduces the concept of "flux" for messaging between different extension contexts. This is an opinionated but powerful pattern that replaces the traditional chrome.runtime.sendMessage with a more developer-friendly API. For teams coming from React backgrounds, this architectural decision will feel immediately familiar.

### CRXJS Architecture

CRXJS takes a minimalist approach, focusing primarily on the build process rather than providing a comprehensive framework. Built on top of Vite, CRXJS is essentially a Vite plugin that handles the complexities of extension bundling while leaving architectural decisions to the developer.

This lightweight approach means CRXJS doesn't impose any specific directory structure or coding patterns. You can use it with React, Vue, vanilla JavaScript, or any combination. The plugin handles manifest generation, code bundling, and extension packaging, but everything else is up to you.

The architectural philosophy here is clear: CRXJS trusts developers to make their own decisions while handling the tedious parts of extension builds. This makes it an excellent choice for teams with strong existing preferences about how to structure their code.

---

## Hot Module Replacement (HMR) Support

### WXT HMR

WXT provides the most seamless HMR experience among the three frameworks. Because it's built on Vite, WXT inherits Vite's excellent HMR capabilities and extends them for extension-specific contexts. When you modify a popup component, only the popup reloads. When you change a content script, that specific script reinjects without affecting other parts of your extension.

The framework automatically handles the tricky parts of extension HMR, such as managing service worker updates and ensuring content script reloading doesn't break page state. This transparent handling is one of WXT's strongest features for developer experience.

One notable advantage is WXT's ability to maintain popup state during HMR updates. Unlike other approaches that completely reload the popup, WXT can preserve React component state and form data across updates, significantly improving the debugging workflow.

### Plasmo HMR

Plasmo also provides robust HMR support through its development server. The framework watches for file changes and automatically rebuilds affected parts of your extension. However, the HMR experience is somewhat less refined than WXT's, particularly for content scripts.

When developing content scripts with Plasmo, you may experience more frequent full page reloads compared to WXT. The framework attempts to reinject content scripts, but complex content script logic with significant state may require manual refreshes.

That said, Plasmo's HMR works well for popup and options page development. The React component hot-reloading works as expected, and the development server provides quick feedback for UI changes.

### CRXJS HMR

CRXJS relies on Vite's native HMR capabilities, which are excellent for web applications but require additional configuration for extensions. You'll need to manually configure how different extension contexts should handle updates.

The good news is that CRXJS provides sensible defaults and examples for common scenarios. The not-so-good news is that you're responsible for setting up and maintaining these configurations. For simple extensions, this works well. For complex extensions with multiple content scripts and background workers, you may need to invest more effort in getting HMR working smoothly.

---

## TypeScript Integration

All three frameworks provide first-class TypeScript support, but with different levels of out-of-the-box experience. For a comprehensive guide to setting up TypeScript in your extension project, see our [Building Chrome Extensions with TypeScript](https://theluckystrike.github.io/chrome-extension-guide/tutorials/building-with-typescript/) tutorial.

### WXT TypeScript

WXT includes TypeScript configuration out of the box with sensible defaults for extension development. The framework provides type definitions for Chrome APIs through its own type augmentation, making autocomplete work seamlessly for chrome.runtime, chrome.storage, and other extension APIs.

The DX (Developer Experience) around TypeScript in WXT is exceptional. You get type checking, autocompletion, and refactoring support without any additional configuration. Shared types can be defined in a dedicated directory and automatically imported across all extension contexts.

### Plasmo TypeScript

Plasmo's TypeScript integration is equally strong, with one key advantage: automatic Chrome API typing through the @plasmohq/type definers. This means you don't need to install separate @types/chrome packages—Plasmo handles this internally.

The framework also provides TypeScript types for its own APIs, including the flux messaging system and panel components. For teams building React-based extensions, this comprehensive typing coverage significantly accelerates development.

### CRXJS TypeScript

CRXJS provides TypeScript support through its Vite foundation but requires manual setup for Chrome API types. You'll need to install @types/chrome or use a third-party solution like chrome-types. This isn't a significant drawback, but it does require additional initial configuration.

Once configured, TypeScript works well with CRXJS. The lack of framework-specific types means you're on your own for type definitions, but for experienced TypeScript developers, this flexibility is often appreciated.

---

## Build Output Analysis

### WXT Build Output

WXT produces clean, production-ready builds with intelligent code splitting. The framework automatically separates vendor code from your application code, resulting in smaller update packages and faster loading times.

The build output includes a manifest.json that automatically includes all necessary permissions based on your code's imports. This "manifest from code" approach eliminates manual manifest maintenance and reduces the risk of shipping unnecessary permissions.

WXT also handles the complex task of generating multiple entry points (popup, options, background, content scripts) with appropriate bundling for each context. The output is production-optimized with minification, tree-shaking, and compression.

### Plasmo Build Output

Plasmo's build output is similarly optimized, with automatic code splitting and vendor chunk separation. The framework produces a well-organized dist directory with clear separation between different extension components.

One advantage of Plasmo's build system is its handling of static assets. Images, fonts, and other resources are automatically processed and included in the final extension package with proper caching hashes.

### CRXJS Build Output

CRXJS produces builds comparable to WXT and Plasmo in terms of optimization. Because it's built on Vite, you get modern bundling with esbuild under the hood for extremely fast build times.

The main difference is in manifest generation. CRXJS provides a more manual approach to manifest configuration, which gives you more control but requires more explicit configuration.

---

## Cross-Browser Support

### WXT Cross-Browser

WXT targets Chrome, Firefox, Safari, and Edge out of the browser. The framework's multi-browser support is first-class, with configuration options to specify browser-specific code and manifests.

The browser targeting system in WXT is elegant: you can have a base manifest with browser-specific overrides. This makes supporting multiple browsers from a single codebase practical rather than a maintenance nightmare.

### Plasmo Cross-Browser

Plasmo focuses primarily on Chrome and Firefox, with Safari support being less mature. The framework provides some cross-browser abstractions, but you'll find more browser-specific code in Plasmo extensions compared to WXT.

For projects prioritizing Chrome and Firefox with secondary Safari support, Plasmo remains a viable choice. However, if multi-browser support is a primary requirement, WXT has the edge.

### CRXJS Cross-Browser

CRXJS provides the building blocks for cross-browser extensions but leaves the implementation to you. There's no built-in browser targeting system—you'll need to manage browser-specific builds through your own build configuration.

This flexible approach works well for teams with specific cross-browser requirements. You have complete control over how browser-specific code is handled.

---

## Community Size and Ecosystem

### WXT Community

WXT has experienced significant growth since its initial release, with an active Discord community and growing npm downloads. The framework is maintained by the team behind VueUse, bringing experienced maintainers to the project.

The ecosystem around WXT is still developing, with essential plugins available for common use cases. You can expect the community to continue growing as more developers discover WXT's developer experience.

### Plasmo Community

Plasmo has the largest community among extension-specific frameworks. The Discord server is active, and the framework has been featured in numerous developer podcasts and articles. Many successful extensions have been built with Plasmo, providing social proof of its viability.

The Plasmo ecosystem includes third-party plugins, starter templates, and integrations with popular tools. For teams new to extension development, this established community provides valuable resources for solving common problems.

### CRXJS Community

CRXJS has a smaller but dedicated community. Being a Vite plugin rather than a full framework, it benefits from Vite's massive ecosystem. Many web developers already familiar with Vite find CRXJS approachable.

---

## Documentation Quality

### WXT Documentation

WXT provides comprehensive documentation covering all major features with examples. The documentation site includes interactive examples and API references. The maintainers actively update documentation with each release.

### Plasmo Documentation

Plasmo's documentation is excellent, with detailed guides, API references, and tutorials. The framework's "framework" nature means there's documentation for most common extension development scenarios.

### CRXJS Documentation

CRXJS documentation is concise, covering the essentials without overwhelming detail. For a Vite plugin, this approach makes sense—you're expected to understand Vite fundamentals.

---

## Starter Templates

### WXT Templates

WXT provides official starter templates for React, Vue, Svelte, and vanilla TypeScript. These templates include all necessary configuration and demonstrate best practices for extension development.

### Plasmo Templates

Plasmo offers the most extensive template collection, with templates for React, Next.js, and various UI frameworks. The templates are production-ready and include common extension patterns.

### CRXJS Templates

CRXJS doesn't provide official templates, but the Vite ecosystem offers numerous extension-related templates. You can find community-maintained templates for various frameworks.

---

## Real Project Migration Stories

Teams migrating to these frameworks report significant improvements in development velocity. WXT users particularly appreciate the quick iteration cycle from excellent HMR. Plasmo users value the framework's opinionated structure for team onboarding. CRXJS users enjoy the flexibility to maintain existing patterns.

A common migration pattern involves moving from manual extension builds (webpack scripts) to these modern frameworks. The reduction in build configuration maintenance is frequently cited as a primary motivation.

---

## Bundle Size Comparison

All three frameworks produce comparable bundle sizes for similar functionality. The differences are negligible for most projects:

- **WXT**: ~15-25KB base overhead (excluding your code)
- **Plasmo**: ~20-30KB base overhead (includes React abstractions)
- **CRXJS**: ~10-20KB base overhead (minimal framework)

For typical extensions, these differences are insignificant compared to your application code.

---

## When to Use Each Framework

### Choose WXT When:

- You want the best developer experience with minimal configuration
- Multi-browser support is a priority
- You prefer convention over configuration
- You want excellent TypeScript support without setup headaches

### Choose Plasmo When:

- You're building a React-based extension
- You want a framework with strong opinions
- You value the established community and ecosystem
- You need features like flux messaging out of the box

### Choose CRXJS When:

- You already have a Vite-based build system
- You prefer maximum flexibility
- You have specific architectural requirements
- You want minimal framework overhead

---

## Recommendation Matrix

| Feature | WXT | Plasmo | CRXJS |
|---------|-----|--------|-------|
| HMR Experience | Excellent | Good | Manual Setup |
| TypeScript | Excellent | Excellent | Good |
| Multi-Browser | Excellent | Good | Manual |
| React Support | Good | Excellent | Good |
| Flexibility | Good | Fair | Excellent |
| Documentation | Excellent | Excellent | Good |
| Community | Growing | Largest | Smaller |
| Bundle Size | Good | Good | Excellent |
| Learning Curve | Low | Low | Medium |

---

## Conclusion

For most new extension projects in 2026, WXT emerges as the strongest recommendation. Its excellent developer experience, comprehensive TypeScript support, and first-class multi-browser targeting make it the most well-rounded choice. The framework balances power with simplicity, allowing you to focus on building your extension rather than configuring build tools.

For more detailed development guides, check out our [Chrome Extension Development Tutorial](https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-development-tutorial-typescript-2026/) to get started with extension development.

However, the best framework ultimately depends on your specific requirements. If you're building a React-heavy extension and value the ecosystem, Plasmo remains an excellent choice. If you need maximum flexibility and already understand Vite, CRXJS provides the control you need.

Whichever framework you choose, you'll benefit from modern development practices that dramatically improve the extension development experience compared to manual build configurations.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
