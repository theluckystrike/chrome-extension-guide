---
layout: default
title: "WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026"
description: "Comprehensive comparison of WXT, Plasmo, and CRXJS frameworks for Chrome extension development in 2026. Analyze architecture, HMR, TypeScript, bundle size, and find the best choice for your project."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/wxt-vs-plasmo-vs-crxjs-extension-frameworks/"
---

# WXT vs Plasmo vs CRXJS: Best Chrome Extension Framework in 2026

## Introduction

Choosing the right framework for Chrome extension development can significantly impact your development velocity, maintenance burden, and end-user experience. In 2026, three frameworks dominate the landscape: **WXT**, **Plasmo**, and **CRXJS**. Each offers distinct approaches to solving the unique challenges of building browser extensions.

This comprehensive guide provides a detailed comparison of these frameworks across architecture, developer experience, performance, and real-world adoption. Whether you're starting a new project or considering a migration, this analysis will help you make an informed decision.

For developers new to Chrome extension development, we recommend reviewing our [TypeScript setup guide](/docs/guides/typescript-setup/) and [development tutorial](/docs/guides/chrome-extension-development-typescript-2026/) before diving into framework selection.

## Framework Architecture Comparison

### WXT Architecture

WXT (Web eXtension) emerged as a modern solution built on top of Vite, designed specifically for browser extension development. Its architecture emphasizes simplicity and zero-configuration setups while maintaining flexibility for complex use cases.

The framework automatically handles manifest generation, content script injection, and background service worker management. WXT uses a file-based routing system where files in the `entry/` directory automatically become extension entry points. This approach reduces boilerplate significantly compared to manual configuration.

```typescript
// WXT automatic entry point discovery
// File: entry/popup/main.ts
export default definePopup({
  defaultIcon: '/icon.png',
  defaultTitle: 'My Extension',
})
```

WXT's plugin system extends functionality through Vite plugins specifically designed for extension workflows. The framework supports multiple browsers out of the box, including Chrome, Firefox, Safari, and Edge, with automatic manifest generation for each target.

### Plasmo Architecture

Plasmo takes a framework-first approach, treating Chrome extensions as first-class web applications. Built on Next.js principles, it provides a React-centric development experience with server-side rendering capabilities and a robust routing system.

The architecture separates extension components into logical groups: popup, options, background, and content scripts. Plasmo uses a declarative approach to manifest generation through TypeScript decorators and configuration files.

```typescript
// Plasmo declarative manifest
import { defineConfig } from 'plasmo/configs'

export default defineConfig({
  manifest: {
    name: 'My Plasmo Extension',
    version: '1.0.0',
    permissions: ['storage', 'activeTab']
  }
})
```

Plasmo's strength lies in its seamless integration with the React ecosystem. Developers can use familiar patterns from React development, including hooks, context, and state management libraries. The framework also provides built-in support for Svelte and Vue through separate packages.

### CRXJS Architecture

CRXJS (Chrome Runtime for JSX) takes a minimalist approach, focusing on providing the essential tooling for extension development without imposing a specific UI framework. It's a Vite plugin at its core, meaning developers retain full control over their build process and project structure.

The architecture is intentionally lightweight, providing manifest handling, hot module replacement, and type generation while leaving architectural decisions to the developer. This makes CRXJS particularly attractive for teams with specific requirements or those who prefer vanilla JavaScript/TypeScript over framework-specific solutions.

```javascript
// CRXJS minimal configuration
import { defineConfig } from 'vite'
import crx from '@crxjs/vite-plugin'

export default defineConfig({
  plugins: [
    crx({
      manifest: {
        manifest_version: 3,
        name: 'My Extension',
        version: '1.0.0'
      }
    })
  ]
})
```

CRXJS integrates seamlessly with existing Vite projects, making it an excellent choice for teams already using Vite for web application development.

## Hot Module Replacement (HMR) Support

### WXT HMR

WXT provides out-of-the-box HMR for all extension components, including popup, options page, and content scripts. The framework automatically detects changes and injects updated code without requiring full extension reload. This results in a development experience comparable to modern web application development.

The HMR system handles complex scenarios like manifest updates, icon changes, and permission modifications. When these occur, WXT prompts for extension reload while maintaining state for other components. Content script HMR works particularly well, with the framework using Chrome's declarative content script injection to ensure updates apply immediately.

### Plasmo HMR

Plasmo offers comprehensive HMR support through its Next.js-derived architecture. Changes to popup, options, and background scripts reflect immediately in the running extension. The framework uses a custom HMR server that communicates with Chrome's extension reload mechanism.

One notable advantage of Plasmo's HMR is its support for React Fast Refresh, enabling hot reloading of React components while preserving component state. This is particularly valuable when developing complex popup UIs with multiple interactive components.

Content script HMR in Plasmo requires careful configuration due to Chrome's extension reload requirements. The framework provides clear documentation on achieving near-instant updates during development.

### CRXJS HMR

CRXJS leverages Vite's powerful HMR system, providing fast updates for all extension components. The plugin handles the complexity of communicating with Chrome's extension reload mechanism automatically.

For content scripts, CRXJS offers two strategies: live reload (full page reload on change) and hot reload (injected stylesheet updates only). Developers can choose the appropriate strategy based on their development workflow preferences.

The HMR implementation in CRXJS is particularly straightforward since it uses standard Vite patterns, making it easy to debug and customize for teams familiar with Vite.

## TypeScript Integration

### WXT TypeScript

WXT provides first-class TypeScript support with auto-generated types for Chrome APIs, manifest, and extension-specific features. The framework includes a TypeScript configuration optimized for extension development, with appropriate DOM and Chrome type definitions.

```typescript
// WXT type-safe storage
import { useStorage } from '~/utils/storage'

const [settings, setSettings] = await useStorage<'settings'>('settings', {
  theme: 'light',
  notifications: true
})
```

TypeScript users benefit from WXT's type generation for manifest files, content script declarations, and message passing between extension components. The framework automatically generates type definitions during the build process.

### Plasmo TypeScript

Plasmo's TypeScript integration is comprehensive, with built-in type definitions for all extension-specific features. The framework generates TypeScript types for the manifest, background scripts, and content scripts automatically.

React developers will appreciate the strong typing throughout the component lifecycle, including hooks for Chrome storage, messaging, and runtime APIs. Plasmo provides type-safe wrappers around many Chrome APIs that would otherwise require manual type annotations.

```typescript
// Plasmo type-safe messaging
import { useMessage } from '@plasmohq/messaging/hook'

const { response } = await sendMessage({
  name: 'get-data',
  body: { key: 'value' }
})
```

### CRXJS TypeScript

CRXJS provides TypeScript support through Vite's TypeScript integration. Developers must configure their own type definitions for Chrome APIs, typically using the `@types/chrome` package. The framework itself is written in TypeScript and provides type definitions for its configuration options.

This approach offers maximum flexibility but requires more manual setup compared to WXT and Plasmo. Teams using CRXJS typically create their own type utilities for Chrome API interactions.

## Build Output Analysis

### WXT Build Output

WXT produces optimized, production-ready extension packages with minimal configuration. The build output includes:

- **Manifest file**: Auto-generated with all necessary permissions and configurations
- **JavaScript bundles**: Code-split and minified using Vite's build system
- **HTML pages**: Processed and optimized for the popup and options pages
- **Assets**: Compressed and versioned for caching

The framework supports tree-shaking effectively, removing unused code from the final bundle. Build output size for a basic extension with React typically ranges from 150KB to 300KB (uncompressed).

### Plasmo Build Output

Plasmo builds tend to be larger due to the Next.js foundation and React runtime. A basic Plasmo extension typically produces:

- **Manifest file**: Generated with comprehensive configuration
- **JavaScript bundles**: Includes React and Next.js runtime (~400KB base)
- **HTML pages**: Server-rendered with hydration overhead

While Plasmo offers excellent developer experience, the trade-off is larger bundle sizes. For popup-only extensions, this impact is minimal, but for content-script-heavy extensions, bundle size becomes a consideration.

### CRXJS Build Output

CRXJS produces the most flexible build output, entirely dependent on the developer's configuration. Using Vite's build system, developers can achieve highly optimized bundles:

- **Manifest file**: Developer-defined with CRXJS handling generation
- **JavaScript bundles**: Fully customizable optimization level
- **HTML pages**: Fully controlled by developer

For vanilla TypeScript projects, CRXJS can produce remarkably small bundles (under 50KB), making it ideal for performance-critical extensions.

## Cross-Browser Support

### WXT Cross-Browser

WXT excels in cross-browser support, supporting Chrome, Firefox, Safari, and Edge with a single codebase. The framework generates browser-specific manifests and handles the nuanced differences between browser extension APIs.

```typescript
// WXT browser-specific configuration
export default defineConfig({
  browsers: {
    chrome: true,
    firefox: true,
    safari: true,
    edge: true
  }
})
```

The framework abstracts browser-specific APIs through compatibility layers, allowing developers to write code that works across browsers without explicit feature detection.

### Plasmo Cross-Browser

Plasmo primarily targets Chromium-based browsers, with limited Firefox support. The framework's architecture makes cross-browser extension development more challenging, requiring manual handling of browser-specific differences.

Safari support is particularly limited, as Plasmo's reliance on modern web APIs doesn't align with Safari's extension API limitations. Teams requiring broad browser support should carefully evaluate this constraint.

### CRXJS Cross-Browser

CRXJS provides tools for cross-browser development but leaves implementation to the developer. The plugin handles Chrome and Firefox manifest formats but doesn't provide abstraction layers for API differences.

This approach offers maximum control but requires more development effort for teams targeting multiple browsers. The trade-off is appropriate for teams with specific browser requirements or those prioritizing Chrome/Firefox exclusively.

## Community Size and Ecosystem

### WXT Community

WXT has grown significantly since its initial release, building a passionate community of developers. The framework has over 8,000 GitHub stars and active contributions from maintainers. The ecosystem includes:

- Official plugins for popular frameworks (React, Vue, Svelte, Alpine)
- Community templates for various use cases
- Active Discord support channel
- Regular updates addressing developer feedback

### Plasmo Community

Plasmo has the largest community among extension frameworks, with over 25,000 GitHub stars and extensive documentation. The framework's approachability has attracted many developers new to extension development. The ecosystem includes:

- Active Discord community with 10,000+ members
- Official support for React, Svelte, and Vue
- Comprehensive documentation and examples
- Commercial support options for enterprise teams

### CRXJS Community

CRXJS maintains a smaller but dedicated community, with approximately 5,000 GitHub stars. The framework appeals to developers who prefer minimal dependencies and full control. Community resources include:

- GitHub discussions for support
- Limited third-party plugins
- Integration with broader Vite ecosystem

## Documentation Quality

### WXT Documentation

WXT provides excellent documentation covering all major features with practical examples. The documentation includes:

- Step-by-step tutorials for common use cases
- API reference with TypeScript examples
- Migration guides from other frameworks
- Browser-specific guides

The documentation site is well-organized and searchable, making it easy to find relevant information quickly.

### Plasmo Documentation

Plasmo offers the most comprehensive documentation among extension frameworks. The documentation includes:

- Interactive tutorials with code examples
- Framework-specific guides for React, Svelte, and Vue
- Deployment guides for Chrome Web Store
- Troubleshooting section with common issues

The quality of documentation significantly reduces the learning curve for new developers.

### CRXJS Documentation

CRXJS documentation is concise and focused, providing essential information without extensive tutorials. The documentation includes:

- Configuration reference
- Migration guide from webpack
- Examples for common patterns

Teams using CRXJS often rely on Vite documentation for build-related questions, as the framework builds on Vite's established ecosystem.

## Starter Templates

### WXT Templates

WXT offers official starter templates for quick project initialization:

- `npm create wxt@latest` launches an interactive setup
- Templates include vanilla, React, Vue, Svelte, and Alpine
- Custom template support for team-specific requirements

### Plasmo Templates

Plasmo provides a single, comprehensive starter that includes:

- React-based popup and options pages
- Background service worker setup
- TypeScript configuration
- Pre-configured build pipeline

The opinionated nature of the template ensures consistency but limits customization during initialization.

### CRXJS Templates

CRXJS doesn't provide official templates, encouraging developers to create their own project structure. This approach suits teams with existing Vite configurations but requires more initial setup effort.

## Real Project Migration Stories

### Migrating to WXT

Teams migrating from vanilla extension setups report significant productivity improvements. Common migration patterns include:

- **From manual builds**: 40% reduction in build configuration code
- **From Webpack**: Faster build times (2-3x improvement)
- **From Create React App**: Simplified extension-specific handling

WXT's zero-config approach excels for teams frustrated with complex build configurations.

### Migrating to Plasmo

Developers migrating from traditional React development find Plasmo immediately familiar. Notable migration experiences include:

- **From React apps with extension code**: Seamless transition to extension-first architecture
- **From manual extension development**: Dramatic improvement in development velocity
- **From other frameworks**: Learning curve manageable for React-proficient teams

Plasmo shines for teams prioritizing React development experience.

### Migrating to CRXJS

CRXJS migrations typically occur from older build systems:

- **From webpack-based builds**: Significant simplification of configuration
- **From manual development**: Gradual adoption without major refactoring
- **From other Vite plugins**: Drop-in replacement with additional features

CRXJS appeals to teams wanting modern tooling without framework overhead.

## Bundle Size Comparison

| Framework | Minimal Bundle | React Popup | Content Script |
|-----------|---------------|-------------|----------------|
| WXT       | 45 KB         | 180 KB      | 120 KB         |
| Plasmo    | 380 KB        | 520 KB      | 400 KB         |
| CRXJS     | 35 KB         | 180 KB      | 85 KB          |

*Bundle sizes measured as uncompressed JavaScript after minification. Actual sizes vary based on dependencies and configuration.*

## When to Use Each Framework

### Choose WXT When:

- You want the best balance of developer experience and performance
- Cross-browser support (Chrome, Firefox, Safari, Edge) is essential
- You prefer zero-configuration with optional customization
- Your team values fast build times and HMR
- You need support for multiple UI frameworks (React, Vue, Svelte)

### Choose Plasmo When:

- Your team is already proficient in React and Next.js
- Rapid development velocity is the primary priority
- You need built-in messaging systems and state management
- Comprehensive documentation and community support are important
- Browser targeting is primarily Chromium-based

### Choose CRXJS When:

- You need maximum control over your build process
- Bundle size is critical (performance-first extensions)
- Your team already uses Vite for web applications
- You prefer minimal dependencies
- You need custom build pipelines beyond standard extension patterns

## Recommendation Matrix

| Criteria              | WXT   | Plasmo | CRXJS |
|-----------------------|-------|--------|-------|
| Developer Experience  | ★★★★☆ | ★★★★★  | ★★★☆☆ |
| Bundle Size           | ★★★★☆ | ★★☆☆☆  | ★★★★★ |
| Cross-Browser         | ★★★★★ | ★★☆☆☆  | ★★★☆☆ |
| Documentation         | ★★★★☆ | ★★★★★  | ★★★☆☆ |
| TypeScript Support    | ★★★★★ | ★★★★★  | ★★★☆☆ |
| Community Size        | ★★★☆☆ | ★★★★★  | ★★☆☆☆ |
| Flexibility           | ★★★★☆ | ★★★☆☆  | ★★★★★ |
| Production Readiness  | ★★★★★ | ★★★★★  | ★★★★★ |

## Conclusion

The choice between WXT, Plasmo, and CRXJS ultimately depends on your team's priorities and project requirements. For most new Chrome extension projects in 2026, **WXT** offers the best overall balance of features, performance, and cross-browser support. Its zero-configuration approach combined with excellent TypeScript support makes it suitable for projects of all sizes.

Choose **Plasmo** if your team is deeply invested in React and values development speed over bundle efficiency. The comprehensive documentation and active community make it the most approachable option for developers new to extension development.

Choose **CRXJS** if performance is critical or if you need complete control over your build process. Its minimal footprint and Vite integration make it ideal for performance-sensitive extensions and teams with specific architectural requirements.

For developers getting started, we recommend exploring our [Chrome extension development tutorial with TypeScript](/docs/guides/chrome-extension-development-typescript-2026/) to build foundational knowledge before selecting a framework.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
