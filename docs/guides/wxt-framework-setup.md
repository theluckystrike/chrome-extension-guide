---
layout: default
title: "Chrome Extension WXT Framework — Developer Guide"
description: "Set up your Chrome extension project with this configuration guide covering tools, frameworks, and best practices for development."
---
# WXT Framework Setup

WXT is a Nuxt-inspired Chrome extension framework that handles the complexity of building, bundling, and packaging extensions. Built on top of Vite, WXT provides a first-class developer experience with zero-config defaults while remaining highly configurable for advanced use cases.

## Why WXT

WXT stands out because it brings the same DX philosophy that Nuxt provides for Vue apps to Chrome extension development. The framework handles the tedious parts automatically, like generating the manifest.json, managing multiple entry points, and configuring content script injection. You focus on building your extension features rather than wrestling with bundler configuration.

The main advantages include instant dev server startup through Vite's ESM architecture, automatic manifest generation that stays in sync with your entry points, first-class support for multiple browsers (Chrome, Firefox, Edge, Safari), and a module system that lets you share functionality across projects.

## Project Scaffolding

Initialize a new WXT project using the official scaffolding tool. Run the following command in your terminal:

```bash
npx wxt init my-extension
cd my-extension
npm install
```

The scaffolding process prompts you to select your preferred framework (Vanilla, Vue, React, Svelte, or Preact) and whether to include TypeScript. After installation, your project structure looks like this:

```
my-extension/
  entrypoints/
    background/
      main.ts
    content/
      main.ts
    popup/
      App.vue
      main.ts
      style.css
    options/
      App.vue
      main.ts
  public/
    icon.png
  wxt.config.ts
  package.json
  tsconfig.json
```

The entrypoints directory is where WXT expects your extension code. Each subdirectory represents a different extension context, and WXT automatically generates the appropriate manifest entries based on the files present.

## Configuration

WXT uses wxt.config.ts for all configuration. The defaults are sensible, but you can override them as needed. Here is a typical configuration for a production-ready extension:

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'My Extension',
    version: '1.0.0',
    description: 'A description of what this extension does',
    permissions: ['storage', 'tabs'],
  },
  vite: () => ({
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['react', 'react-dom'],
          },
        },
      },
    },
  }),
});
```

The manifest property merges with WXT's auto-generated manifest, so you only need to specify the fields you want to override. This approach ensures your manifest stays correct without manual maintenance.

## Entrypoint Conventions

WXT follows specific naming conventions for entry points. Understanding these conventions helps you organize your extension code effectively.

Background scripts go in entrypoints/background/main.ts. WXT automatically configures this as a service worker in Manifest V3. For background scripts that need to run on specific events, use the wxt:hook:manifest hook to modify the background service worker configuration.

Content scripts live in entrypoints/content/. Any TypeScript or JavaScript file in this directory becomes a content script. WXT automatically handles script injection and provides options for specifying which pages your scripts run on. Use a file named main.ts for your primary content script logic.

Popup UI lives in entrypoints/popup/ and follows the same patterns as a standard web page. WXT mounts your component to the page and handles hot module replacement during development. The popup directory can contain Vue, React, Svelte, or vanilla JavaScript files depending on your framework choice.

Options pages work similarly to popups and live in entrypoints/options/. WXT generates the appropriate manifest entry automatically, and you can access extension storage APIs directly through the provided utilities.

## Auto Imports

One of WXT's most convenient features is automatic imports. You do not need to manually import extension APIs in every file. WXT automatically imports common extension types and utilities when you use them, keeping your code clean and reducing boilerplate.

The auto-import system includes chrome.runtime, chrome.storage, chrome.tabs, and other commonly used APIs. You can configure additional auto-imports through the imports section of your wxt.config.ts. This feature works seamlessly with TypeScript, providing full type inference for extension APIs.

## Development Mode

Start the development server with the npm run dev command. WXT launches a browser with your extension loaded automatically, typically in about one second. The dev server watches for file changes and triggers near-instant HMR updates to your popup, options, and content scripts.

For content script development, WXT provides a useful feature where changes to your content script code reload automatically in any open tabs that match your injection patterns. This eliminates the need to manually reinstall your extension during development.

The development mode also enables helpful debugging features, including detailed console output for extension-specific events and automatic error overlays when your code has issues.

## Multi-Browser Targeting

WXT supports building for multiple browsers from a single codebase. Configure target browsers in your wxt.config.ts:

```ts
export default defineConfig({
  browsers: ['chrome', 'firefox', 'edge'],
});
```

Each browser gets its own output directory in dist/. WXT handles browser-specific manifest differences automatically, including permission variations and API availability. For Firefox, WXT generates the necessary manifest.json fields for AMO submission. For Edge, it adjusts manifest properties to comply with the Microsoft Edge Add-on Store requirements.

You can also use conditional configuration to include browser-specific code. The wxt.config.ts supports functions that receive the target browser as an argument, allowing you to adjust your build based on the output target.

## Testing with Vitest

WXT integrates with Vitest for unit testing your extension code. Install Vitest as a development dependency, then configure it to work with WXT's environment:

```bash
npm install -D vitest @wxt-dev/resolve-types
```

Create a vitest.config.ts in your project root:

```ts
import { defineConfig } from 'vitest/config';
import { wxtResolver } from 'wxt/resolver';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '#': '/src',
    },
    resolver: wxtResolver(),
  },
});
```

Write tests for your background scripts, utility functions, and content script logic. The wxt:resolve-types package provides TypeScript definitions for extension APIs in your test environment, ensuring type safety even when testing code that uses chrome.runtime or chrome.storage.

## Migrating from Manual Setup

If you have an existing extension built with a manual Vite or webpack setup, migrating to WXT involves several steps. First, move your source files into the entrypoints directory structure that WXT expects. Then remove your manual build configuration files since WXT handles bundling automatically. Finally, create a minimal wxt.config.ts and verify that the manifest generates correctly.

The migration typically takes a few hours for well-structured projects. The biggest effort is reorganizing your file structure to match WXT's conventions, but this reorganization often improves your project maintainability in the long run. You can remove significant amounts of boilerplate code that was previously needed to make your manual setup work.

## Production Build

When you are ready to release, run npm run build. WXT compiles your extension with all optimizations enabled, generates the final manifest.json, and creates browser-specific zip files in the dist/ directory. Each target browser gets its own folder with a properly configured extension ready for submission to the respective store.

The production build process handles minification, tree-shaking unused code, and optimizing assets automatically. WXT's build output is compatible with the Chrome Web Store, Firefox Add-ons, and Microsoft Edge Add-ons without additional modification.

For continuous deployment, consider integrating the build command into your CI/CD pipeline. WXT's output structure makes it straightforward to automate submissions to extension stores using their respective APIs.

This framework significantly reduces the boilerplate required for Chrome extension development. Teams building extensions at zovo.one have found that WXT's opinionated defaults accelerate development while maintaining the flexibility needed for complex extensions.

## Related Articles

- [Plasmo Framework](../guides/plasmo-framework-setup.md)
- [Vite Setup](../guides/vite-extension-setup.md)
