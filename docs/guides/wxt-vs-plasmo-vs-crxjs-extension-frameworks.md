---
layout: guide
title: WXT vs Plasmo vs CRXJS — Best Chrome Extension Framework in 2026
description: A comprehensive comparison of WXT, Plasmo, and CRXJS extension frameworks. Analyze architecture, HMR, TypeScript, build output, cross-browser support, and community to choose the best framework for your Chrome extension in 2026.
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

Choosing the right framework for building Chrome extensions has become significantly more complex as the ecosystem matures. What started as simple build tools has evolved into full-fledged development frameworks with their own philosophies, strengths, and trade-offs. This comprehensive guide compares WXT, Plasmo, and CRXJS—the three most popular modern frameworks—to help you make an informed decision for your extension project in 2026.

For more information on development tools and setup, check out our [Chrome Extension Development Guides](/chrome-extension-guide/docs/guides/) and [Vite Extension Setup](/chrome-extension-guide/docs/guides/vite-extension-setup/) for alternative build tools.

## Framework Architecture Comparison

### WXT: The Next-Generation Extension Framework

WXT represents a fundamental rethinking of how Chrome extensions should be built. Built on top of Vite, WXT leverages the power of modern frontend tooling while providing extension-specific optimizations out of the box. The architecture centers around a zero-config approach that automatically handles the complex manifest generation, content script injection, and background service worker lifecycle management that typically plague extension developers.

The framework's architecture distinguishes itself through its file-system based routing. Components in the `/pages` directory automatically become extension entry points—whether they're popup pages, options pages, or devtools panels. This convention-over-configuration approach dramatically reduces boilerplate while maintaining flexibility for customization. WXT also pioneered the concept of "auto-import" for extension APIs, meaning you can use `chrome.storage` directly without explicit imports in your code.

Under the hood, WXT uses a multi-stage build process. The first stage handles module bundling using Vite's powerful plugin system, while the second stage performs extension-specific transformations including manifest generation, content script injection configuration, and hot module replacement setup. This separation allows for cleaner separation of concerns and easier debugging when things go wrong.

### Plasmo: The Browser Extension Developer Platform

Plasmo takes a platform-oriented approach, positioning itself as a complete development platform rather than just a build tool. The framework provides an opinionated structure that handles everything from hot module replacement to deployment, with strong emphasis on developer experience and rapid iteration. Its architecture is built around the concept of "frames"—the various contexts in which your extension code runs (popup, options, content script, background, etc.).

What sets Plasmo apart architecturally is its deep integration with the Chrome ecosystem. The framework understands the nuances of different manifest versions, browser-specific APIs, and extension lifecycle events. This knowledge is encoded in its build pipeline, which automatically applies browser-specific transformations based on your target configuration. Plasmo also provides a comprehensive SDK for common extension patterns, reducing the need to reinvent wheels for features like storage management, messaging, and authentication.

The framework's architecture emphasizes modularity through its "features" system. You can enable or disable specific capabilities—like i18n support, storage abstractions, or messaging patterns—through a declarative configuration. This makes it easier to start simple and progressively adopt more advanced features as your extension grows.

### CRXJS: The Developer-Friendly Build Tool

CRXJS takes a more minimalistic approach, focusing primarily on the build and packaging process rather than providing a complete development framework. Built specifically for Chrome extension development, CRXJS handles the complex task of generating valid Chrome extension packages while providing sensible defaults for modern JavaScript development.

The architecture of CRXJS is fundamentally different from the other two frameworks. Rather than imposing a specific project structure or development paradigm, CRXJS works with your existing code and adds extension-specific capabilities through a configuration file. This makes it particularly attractive for teams that have existing codebases they want to adapt for extension development, or developers who prefer to maintain full control over their project structure.

CRXJS's strength lies in its build pipeline, which is specifically optimized for the unique requirements of Chrome extensions. It handles the intricacies of content script injection, background script bundling, and manifest generation with minimal configuration while providing detailed error messages when something goes wrong.

## Hot Module Replacement (HMR) Support

Hot Module Replacement has become essential for productive extension development, and all three frameworks approach it differently.

**WXT** provides arguably the most seamless HMR experience among the three. Because it builds on Vite, WXT inherits a mature HMR system that handles most scenarios gracefully. The framework automatically reloads affected extension contexts when files change, whether you're editing popup UI, background scripts, or content scripts. WXT also supports "smart injection"—it only reloads the specific parts of the extension that changed rather than performing a full reload, preserving state where possible.

**Plasmo** offers comprehensive HMR with a focus on developer convenience. The framework's "live reload" system automatically detects which parts of your extension need updating and pushes changes without requiring manual reload. One notable feature is its "stateful reload" for popup and options pages, which preserves user input and scroll position across HMR updates—a significant productivity improvement for UI-heavy extensions.

**CRXJS** provides HMR through its development server, though it's less sophisticated than the dedicated frameworks. The build tool can watch for changes and trigger reloads, but it doesn't offer the same level of context awareness. You'll often need to manually reload the extension in chrome://extensions to see changes, though this has improved significantly with recent versions.

## TypeScript Integration

TypeScript support varies significantly across the three frameworks, impacting development experience and code quality. For a comprehensive introduction to TypeScript in extension development, see our [Building Chrome Extensions with TypeScript](/chrome-extension-guide/docs/tutorials/building-with-typescript/) tutorial.

For framework-specific TypeScript setup guides, refer to:
- [TypeScript Setup Guide](/chrome-extension-guide/docs/guides/typescript-setup/) for general TypeScript configuration
- [WXT Framework TypeScript Setup](/chrome-extension-guide/docs/guides/wxt-framework-setup/) for WXT-specific configuration
- [Chrome Extension Development with TypeScript 2026](/chrome-extension-guide/docs/guides/chrome-extension-development-typescript-2026/) for modern TypeScript patterns

**WXT** offers first-class TypeScript support with comprehensive type definitions for all Chrome APIs. The framework includes type augmentation for `chrome` namespace, meaning you get autocomplete and type checking for Chrome APIs out of the box. WXT also provides its own type definitions for framework-specific features like auto-imports and page routing, creating a fully typed development experience.

**Plasmo** includes TypeScript support through its CLI and build system, with type definitions available for both Chrome APIs and framework-specific features. The platform provides TypeScript configurations optimized for extension development, including proper handling of content script isolation and service worker contexts. However, some developers report needing additional configuration for advanced type scenarios.

**CRXJS** supports TypeScript through standard webpack or Vite configurations, meaning your TypeScript setup depends on your bundler choice. This provides flexibility but requires more manual configuration. You'll need to set up type definitions for Chrome APIs yourself, typically through the @types/chrome package.

## Build Output Analysis

Understanding what each framework produces helps with debugging and optimization.

**WXT** generates a clean, organized output directory with separate folders for each extension context (popup, options, background, content scripts). The build produces a `manifest.json` with all correct declarations, properly bundled scripts, and optimized assets. WXT's output is particularly well-organized for debugging, with source maps included by default in development builds.

**Plasmo** produces output that's optimized for the Chrome Web Store, with automatic asset compression and manifest validation. The framework includes build-time checks for common issues like invalid permissions or missing icons. Plasmo also generates multiple variants for different browsers if configured, handling the nuances of each platform's extension API.

**CRXJS** focuses on producing valid CRX packages that pass Chrome Web Store validation. The output includes properly structured extension files with all necessary metadata. CRXJS is particularly good at handling complex scenarios like multi-entry content scripts and dynamic background script loading.

## Cross-Browser Support

Building extensions that work across multiple browsers requires different configurations and APIs.

**WXT** provides experimental cross-browser support through its configuration system. The framework can target Chrome, Firefox, Edge, and Safari, though browser-specific code often requires conditional logic. WXT's cross-browser capabilities are improving but currently require more manual intervention than dedicated solutions.

**Plasmo** offers the strongest cross-browser support out of the box. The framework maintains browser-specific build configurations and can generate variants for Chrome, Firefox, Edge, and Safari from a single codebase. This makes it the best choice for teams prioritizing multi-browser distribution.

**CRXJS** focuses primarily on Chrome/Chromium browsers, with limited built-in support for other browsers. While you can configure it for Firefox or Safari, you'll need to handle browser-specific differences manually.

## Community Size and Documentation Quality

**WXT** has experienced rapid growth since its initial release, with an active Discord community and growing GitHub repository. Documentation is comprehensive and well-organized, though some advanced topics could use more examples. The framework maintains good changelog hygiene, making it easy to track updates.

**Plasmo** has the largest community among extension frameworks, with extensive documentation, tutorials, and a supportive Discord server. The platform provides learning resources ranging from quick starts to advanced patterns, making it accessible for developers at all experience levels. However, documentation quality varies in some areas, with newer features sometimes lacking detailed explanations.

**CRXJS** has a smaller but dedicated community, primarily centered on GitHub issues and discussions. Documentation covers core functionality well but assumes familiarity with build tools. The focused scope means less community content compared to full frameworks.

## Starter Templates

All three frameworks provide starter templates to accelerate project initialization.

**WXT** offers official templates for React, Vue, Svelte, and Vanilla TypeScript through its CLI. Templates are minimal but functional, including proper TypeScript configurations and essential extension components. The framework also maintains community templates for additional frameworks.

**Plasmo** provides the most comprehensive template system, with options for React, Vue, Svelte, and vanilla JavaScript/TypeScript. Each template includes not just the basic extension structure but also common patterns like storage setup, messaging infrastructure, and example features. This makes Plasmo templates particularly useful for learning.

**CRXJS** doesn't provide official templates, relying instead on community examples and documentation. This gives flexibility but requires more setup work.

## Real Project Migration Stories

Understanding how teams have migrated between frameworks provides valuable insights.

Teams migrating **to WXT** often come from manual webpack configurations or create-react-app based setups. Common motivations include faster development cycles, better TypeScript support, and reduced configuration complexity. Reports indicate migration typically takes 1-3 days for medium-sized extensions, with the main challenge being adjustment to WXT's file-based routing conventions.

Teams migrating **to Plasmo** frequently cite the comprehensive feature set and cross-browser capabilities as primary reasons. Organizations building extensions for multiple browsers find Plasmo's platform approach reduces maintenance overhead. Migration time varies more significantly depending on existing project complexity.

Teams adopting **CRXJS** typically do so to simplify existing webpack or Rollup setups without adopting a full framework. The migration is often straightforward since CRXJS integrates with existing code rather than requiring structural changes.

## Bundle Size Comparison

Bundle size affects extension load time and user experience, particularly for extensions that run on every page.

In typical scenarios with a React-based popup and content script, **WXT** produces the smallest bundles due to Vite's optimized tree-shaking. A standard extension might compile to 50-80KB gzipped for the popup and 20-40KB for content scripts.

**Plasmo** bundles tend to be slightly larger due to the additional framework features and SDK code. Expect 70-100KB gzipped for popup code and 30-50KB for content scripts, though these numbers vary significantly based on which Plasmo features you use.

**CRXJS** bundle size depends entirely on your bundler configuration. Using Vite with CRXJS produces similar results to WXT, while webpack configurations typically produce larger bundles.

## When to Use Each Framework

**Choose WXT when:**
- You want the fastest development experience with minimal configuration
- Your team values modern tooling and developer experience
- You need excellent TypeScript support out of the box
- Bundle size is a critical concern
- You're building a Chrome-only extension

**Choose Plasmo when:**
- You need cross-browser support (Chrome, Firefox, Edge, Safari)
- You want a complete platform with built-in patterns and best practices
- You're building a complex extension with multiple contexts
- You prefer opinionated conventions over configuration
- Your team values comprehensive documentation and community resources

**Choose CRXJS when:**
- You have an existing codebase to adapt for extension development
- You prefer minimal framework overhead
- You need fine-grained control over your build process
- You're comfortable handling extension-specific complexities yourself
- Your project has unique bundling requirements

## Recommendation Matrix

| Feature | WXT | Plasmo | CRXJS |
|---------|-----|--------|-------|
| HMR Quality | ★★★★★ | ★★★★★ | ★★★☆☆ |
| TypeScript Support | ★★★★★ | ★★★★☆ | ★★★☆☆ |
| Cross-Browser | ★★★☆☆ | ★★★★★ | ★★☆☆☆ |
| Bundle Size | ★★★★★ | ★★★★☆ | ★★★★☆ |
| Documentation | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| Community | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| Learning Curve | ★★★★★ | ★★★★☆ | ★★★★☆ |
| Flexibility | ★★★★☆ | ★★★☆☆ | ★★★★★ |

## Conclusion

The choice between WXT, Plasmo, and CRXJS ultimately depends on your specific project requirements, team experience, and long-term maintenance considerations. WXT offers the best balance of modern developer experience and performance for Chrome-focused projects. Plasmo provides the most comprehensive platform for teams building across multiple browsers. CRXJS remains the choice for projects requiring maximum control or integration with existing codebases.

For most new extension projects in 2026, we recommend starting with WXT if you're building Chrome-only, or Plasmo if you need cross-browser support. Both frameworks represent the current state of the art in extension development and will serve you well as your project scales.

---

**Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)**
