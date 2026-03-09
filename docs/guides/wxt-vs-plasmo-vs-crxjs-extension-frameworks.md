---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Comprehensive comparison of WXT, Plasmo, and CRXJS frameworks for Chrome extension development in 2026. Learn about architecture, HMR, TypeScript support, build output, and find the best framework for your project."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for Chrome extension development can significantly impact your development velocity, maintainability, and end-user experience. In this comprehensive comparison, we analyze WXT, Plasmo, and CRXJS—the three leading frameworks in 2026—to help you make an informed decision for your next extension project.

## Introduction

Chrome extension development has evolved dramatically since the introduction of Manifest V3. While you can still build extensions using vanilla JavaScript and manual webpack configurations, modern frameworks offer substantial benefits: hot module replacement (HMR), streamlined build processes, TypeScript support, and cross-browser compatibility out of the box.

WXT, developed by the maintainer of Vue.js creator Evan You's Vitest, Plasmo from the Boston-based startup of the same name, and CRXJS (formerly known as crx-webpack-plugin) represent three distinct approaches to extension development. Each has its strengths, trade-offs, and ideal use cases.

## Framework Architecture Comparison

### WXT Architecture

WXT is built on top of Vite and provides a batteries-included approach to extension development. It uses a directory-based routing system similar to Nuxt.js, where your file structure automatically determines your extension's entry points. The framework handles manifest generation, content script injection, and background worker compilation through Vite's plugin system.

The architecture follows a plugin-first design, allowing you to extend functionality through a rich ecosystem of official and community plugins. WXT's manifest generation is declarative—you define your extension's capabilities in a configuration file, and WXT handles the complex manifest.json creation, including automatic handling of manifest version differences between Chrome, Firefox, and Edge.

WXT's project structure emphasizes convention over configuration. Your `entry/` directory automatically becomes your extension's entry points:

```
entry/
├── background/
│   └── index.ts
├── content/
│   ├── index.ts
│   └── style.css
├── popup/
│   ├── index.html
│   └── main.ts
├── options/
│   └── index.html
└── ...
```

### Plasmo Architecture

Plasmo takes a framework-agnostic approach, designed to work seamlessly with React, Vue, Svelte, or vanilla TypeScript. It uses its own build pipeline based on Parcel (in earlier versions) and now leverages Vite for blazing-fast development builds. The framework emphasizes developer experience with built-in support for React Server Components (in beta), streaming, and edge deployment.

Plasmo's architecture centers around a `src/` directory with automatic routing similar to Next.js file-system routing. The framework generates your manifest.json automatically based on your source files and a declarative configuration object. What sets Plasmo apart is its "Batteries Included" philosophy—storage, messaging, and background processing come with built-in abstractions that work consistently across browsers.

The framework also offers a cloud platform (Plasmo Network) for extension hosting, analytics, and deployment, though this is entirely optional and the core framework remains open-source.

### CRXJS Architecture

CRXJS takes a different approach—it's primarily a webpack plugin rather than a full-fledged framework. Originally known as crx-webpack-plugin, it evolved into CRXJS to encompass a more comprehensive toolkit for extension development. The plugin handles the complexities of building Chrome extensions with webpack, including automatic manifest generation, code splitting, and optimization.

CRXJS is ideal if you already have a webpack-based workflow or need fine-grained control over your build process. It doesn't impose a specific project structure or framework choice, making it flexible but requiring more manual configuration compared to WXT and Plasmo.

The architecture consists of the core `@crxjs/plugin-vite` or `@crxjs/plugin-webpack` packages that you integrate into your existing build configuration. This makes CRXJS particularly attractive for teams migrating existing web applications to Chrome extensions.

## Hot Module Replacement (HMR) Support

### WXT HMR

WXT provides first-class HMR support through Vite's development server. Changes to any entry point—background scripts, content scripts, popup, options page, or new HTML pages—trigger instant updates without requiring extension reload. The development server automatically manages the extension's lifecycle, including background worker restarts when necessary.

WXT's HMR implementation is particularly smooth for popup and options page development, as it behaves like a standard Vite SPA with full state preservation. Content script HMR is also well-supported, though changes may occasionally require a page refresh depending on the complexity of your injection logic.

### Plasmo HMR

Plasmo offers excellent HMR support through its Vite-powered build system. The framework watches all source files and automatically rebuilds affected chunks during development. For content scripts, Plasmo provides a "content script hot reload" feature that injects updated code without requiring full page refreshes in most cases.

Plasmo's HMR extends to its storage layer, allowing you to modify storage schemas and see changes reflected immediately. The development experience is further enhanced by built-in Chrome DevTools debugging integration.

### CRXJS HMR

CRXJS supports HMR through its integration with webpack's Hot Module Replacement system. The plugin automatically watches your entry points and rebuilds changed modules. However, HMR with CRXJS requires more manual setup compared to WXT and Plasmo—you need to configure webpack's HMR plugin and handle background worker restarts yourself.

For content scripts, CRXJS provides a refresh mechanism, but it may not be as seamless as the dedicated content script HMR solutions in WXT and Plasmo.

## TypeScript Integration

### WXT TypeScript

WXT has first-class TypeScript support built into its core. The framework generates type-safe manifest definitions, and all configuration files support full TypeScript syntax. WXT provides type definitions for all Chrome APIs through its own type augmentation system, ensuring excellent IDE support and compile-time safety.

The framework's `defineConfig` utility provides autocomplete for all configuration options, and you can extend types through WXT's plugin system. Type checking is integrated into the build process, with sensible defaults for extension development.

### Plasmo TypeScript

Plasmo offers comprehensive TypeScript support with automatic type generation for your extension's manifest. The framework provides TypeScript definitions for its storage, messaging, and background processing APIs. You can use TypeScript with any supported UI framework (React, Vue, Svelte) and get full type safety throughout your codebase.

Plasmo's TypeScript setup includes `@plasmohq/types` package that augments the global Chrome types with additional utilities. The framework also generates types for your messages, making type-safe inter-component communication straightforward.

### CRXJS TypeScript

CRXJS provides TypeScript support through standard webpack and TypeScript loader configurations. You need to set up your own `tsconfig.json` and configure the TypeScript loader in your webpack configuration. While this requires more boilerplate, it gives you complete control over TypeScript compilation options.

The trade-off is that you lose some of the auto-generated type benefits that WXT and Plasmo provide. However, if your team is comfortable with manual TypeScript configuration, you can achieve the same level of type safety.

## Build Output Analysis

### WXT Build Output

WXT produces optimized build output with automatic code splitting, tree shaking, and minification. The framework generates separate chunks for each entry point, ensuring that users only download the code needed for each part of your extension. Build output follows Chrome's recommended practices, including proper content security policy handling.

WXT's build system automatically handles manifest.json generation with correct file hashes for cache busting. The output directory structure is clean and ready for direct submission to the Chrome Web Store:

```
dist/
├── _metadata/
│   └── computed_hashes.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── ...
└── manifest.json
```

### Plasmo Build Output

Plasmo generates highly optimized builds with automatic chunking based on your entry points and dynamic imports. The framework supports both development and production builds, with production builds including minification, compression, and tree shaking.

Plasmo's build output includes source maps for debugging and provides a manifest.json that's fully compliant with Chrome Web Store requirements. The framework also supports generating multiple extension variants from the same codebase through its target system.

### CRXJS Build Output

CRXJS leverages webpack's powerful optimization capabilities to produce efficient builds. The plugin handles manifest generation, file hashing, and CRX packaging. Since CRXJS is more flexible, the output structure depends on your webpack configuration—you have full control over chunking strategies, compression options, and file naming.

The main advantage of CRXJS's build output is the .crx package format that can be directly loaded into Chrome for testing without using the developer mode.

## Cross-Browser Support

### WXT Cross-Browser

WXT provides excellent cross-browser support out of the box. The framework supports Chrome, Firefox, Edge, and Opera through a unified configuration system. You can define browser-specific manifest modifications using WXT's multi-browser configuration:

```typescript
export default defineConfig({
  browsers: {
    chrome: {
      manifest: {
        name: 'My Extension',
        // Chrome-specific options
      }
    },
    firefox: {
      manifest: {
        name: 'My Extension (Firefox)',
        // Firefox-specific options
      }
    }
  }
})
```

WXT automatically generates the correct manifest format for each browser and handles browser-specific API differences.

### Plasmo Cross-Browser

Plasmo supports Chrome, Firefox, Edge, and Safari (through Kap Safari compatibility). The framework provides cross-browser polyfills and handles API differences automatically. You can use Plasmo's browser detection utilities to conditionally load browser-specific code.

Plasmo's cross-browser support is enhanced by its active development community, which contributes browser-specific bug fixes and compatibility improvements regularly.

### CRXJS Cross-Browser

CRXJS provides cross-browser support through standard webpack configurations. You can define multiple entry points for different browsers or use webpack's conditional compilation features. However, CRXJS doesn't provide built-in cross-browser abstractions—you'll need to handle browser-specific logic manually or use polyfills.

## Community Size and Documentation

### WXT Community

WXT has grown rapidly since its initial release, with an active Discord community and GitHub repository. The documentation is comprehensive and well-structured, covering all major features with examples. The framework has gained significant traction among Vue and Vite users who want a familiar development experience for extensions.

### Plasmo Community

Plasmo has the largest community among the three frameworks, with an active Discord server, YouTube tutorials, and comprehensive documentation. The framework's commercial backing provides stability and regular updates. The Plasmo team actively engages with the community through GitHub discussions and Discord.

### CRXJS Community

CRXJS has a smaller but dedicated community, primarily among developers who prefer webpack-based workflows. Documentation is good but less comprehensive than WXT and Plasmo. The project is well-maintained but updates are less frequent.

## Starter Templates

### WXT Templates

WXT provides official starter templates for vanilla TypeScript, Vue, and React projects. The templates include pre-configured build systems, TypeScript configurations, and example code for common extension patterns. You can create a new project with:

```bash
npm create wxt@latest my-extension
```

### Plasmo Templates

Plasmo offers starter templates for React, Vue, Svelte, and vanilla TypeScript. The templates include integrated UI framework setups, storage configurations, and messaging examples. Creating a new Plasmo project:

```bash
npm create plasmo@latest my-extension
```

### CRXJS Templates

CRXJS doesn't provide official starter templates. However, the GitHub repository includes example configurations for various setups. You'll need to set up your project structure manually, which offers flexibility but requires more initial work.

## Real Project Migration Stories

### WXT Migration

Teams migrating to WXT typically come from manual webpack configurations or Vite-based setups. Common migration paths include:
- Moving from Create React App with custom webpack extension configs
- Migrating from Vue CLI extension projects
- Upgrading from older extension boilerplates

WXT's convention-based structure simplifies these migrations, as the framework handles most configuration automatically.

### Plasmo Migration

Plasmo attracts teams looking for a React-first development experience. Typical migrations include:
- Moving from custom webpack extension builds to Plasmo's Vite setup
- Migrating from wxt (some teams prefer Plasmo's React ecosystem)
- Upgrading from Chrome Extension Boilerplate projects

Plasmo's storage and messaging abstractions simplify the migration of complex extension architectures.

### CRXJS Migration

CRXJS migrations typically involve teams with existing webpack setups:
- Migrating web apps to Chrome extensions using existing webpack configs
- Upgrading from older crx-webpack-plugin versions
- Teams with custom build requirements that need fine-grained control

## Bundle Size Comparison

Bundle size depends heavily on your specific dependencies, but here's a general comparison based on minimal starter projects:

| Framework | Minified Background | Minified Content Script |
|-----------|---------------------|------------------------|
| WXT       | ~15KB               | ~10KB                  |
| Plasmo    | ~25KB               | ~15KB                  |
| CRXJS     | ~20KB*              | ~12KB*                 |

*CRXJS bundle size varies based on your webpack configuration and chosen dependencies.

WXT tends to have the smallest bundle sizes due to Vite's efficient tree shaking and minimal runtime overhead. Plasmo includes additional utilities for storage and messaging, which adds some overhead but provides more features.

## When to Use Each Framework

### Choose WXT if:

- You prefer Vue or want a Vite-like development experience
- Convention over configuration appeals to you
- You need excellent cross-browser support with minimal effort
- Small bundle size is a priority
- You want fast HMR with minimal setup

### Choose Plasmo if:

- React is your primary UI framework
- You want built-in storage and messaging abstractions
- You plan to use the Plasmo Network for hosting/analytics
- You need the largest community and fastest issue resolution
- You want the most complete "batteries included" experience

### Choose CRXJS if:

- You have an existing webpack-based project
- You need fine-grained control over your build process
- You're migrating a web app to an extension
- You prefer minimal abstraction over convenience
- Your team is already experienced with webpack

## Recommendation Matrix

| Feature                    | WXT        | Plasmo     | CRXJS      |
|----------------------------|------------|------------|------------|
| HMR Quality                | Excellent  | Excellent  | Good       |
| TypeScript Support         | Excellent  | Excellent  | Good       |
| Bundle Size                | Best       | Good       | Good       |
| Cross-Browser              | Excellent  | Good       | Good       |
| Documentation              | Good       | Excellent  | Good       |
| Community Size             | Growing    | Largest    | Small      |
| Learning Curve             | Low        | Low        | Medium     |
| Build Flexibility          | Medium     | Medium     | High       |
| React Support              | Yes        | Best       | Yes        |
| Vue Support                | Best       | Yes        | Yes        |

## Conclusion

For most new Chrome extension projects in 2026, **WXT** offers the best balance of developer experience, performance, and cross-browser support. Its Vite-powered foundation provides blazing-fast builds and HMR, while its convention-based approach minimizes configuration overhead.

However, if you're building a React-heavy extension with complex storage and messaging requirements, **Plasmo** provides the most complete developer experience with its batteries-included approach and active community.

Choose **CRXJS** only if you have specific requirements that demand fine-grained webpack control or are migrating an existing webpack-based project.

Regardless of your choice, all three frameworks represent significant improvements over manual extension configuration, and any of them will serve you well for production Chrome extension development.

Cross-references:
- `docs/guides/typescript-extensions.md` — TypeScript setup with these frameworks
- `docs/guides/chrome-extension-development-typescript-2026.md` — Development guide using modern frameworks
- `docs/guides/cross-browser-extension-development.md` — Cross-browser techniques

## Related Articles

- [TypeScript for Extensions](../guides/typescript-extensions.md)
- [Chrome Extension Development Tutorial with TypeScript](../guides/chrome-extension-development-typescript-2026.md)
- [Cross-Browser Extension Development](../guides/cross-browser-extension-development.md)

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
