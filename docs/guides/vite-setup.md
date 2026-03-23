---
layout: default
title: "Chrome Extension Vite Setup. Fast Development Environment"
description: "Learn how to set up Vite for Chrome extensions with this developer guide covering configuration, HMR, and rapid development workflows."
canonical_url: "https://bestchromeextensions.com/guides/vite-setup/"
---
# Chrome Extension Vite Setup. Fast Development Environment

Vite has revolutionized frontend tooling with its lightning-fast dev server and streamlined production builds. For Chrome extension development, Vite offers an compelling alternative to traditional bundlers, providing near-instant hot module replacement and a developer experience that significantly reduces iteration time. This guide covers setting up Vite specifically for Chrome extensions, including configurations for multiple entry points and proper extension manifest handling.

Why Vite for Chrome Extensions

Vite's development server leverages native ES modules and the browser's module loading capabilities to deliver exceptional performance. Unlike Webpack, which bundles everything before serving, Vite serves files as-is during development and only bundles when necessary. This approach translates to startup times measured in milliseconds rather than seconds, even for larger extension projects.

The Chrome extension development workflow benefits enormously from this speed. Each time you modify a popup component, content script, or background worker, Vite's HMR can update the relevant parts of your extension almost instantaneously. For developers accustomed to rebuilding entire bundles or manually reloading extensions, this represents a dramatic improvement in daily productivity.

Beyond speed, Vite's configuration system is refreshingly straightforward. The plugin architecture handles most extension-specific tasks without requiring extensive custom code, and the sensible defaults work well out of the box for typical extension structures.

Project Setup and Dependencies

Begin by creating a new extension project and installing the necessary dependencies. While Vite handles most bundling tasks, you'll need additional tools for manifest management and Chrome API types:

```bash
npm create vite@latest my-extension -- --template vanilla-ts
cd my-extension
npm install
npm install --save-dev vite-plugin-chrome-extension
npm install --save-dev @types/chrome
```

The vite-plugin-chrome-extension is essential as it handles the complexities of generating a valid extension manifest and managing multiple entry points. This plugin watches your configuration and automatically updates the manifest during development.

Directory Structure

Organize your extension source code to separate different extension contexts while keeping related files together:

```
my-extension/
 src/
    manifest.ts
    popup/
       main.ts
       popup.css
    background/
       service-worker.ts
    content/
       content-script.ts
    options/
       main.ts
       options.css
    shared/
        types.ts
 public/
    icons/
 index.html
 vite.config.ts
 tsconfig.json
 package.json
```

This structure mirrors how Chrome expects files to be organized in the final build while maintaining a logical separation during development.

Vite Configuration for Extensions

Configure Vite to handle Chrome extension specifics. The key is properly defining multiple entry points and using the Chrome extension plugin:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import chromeExtension from 'vite-plugin-chrome-extension';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    chromeExtension({
      manifest: resolve(__dirname, 'src/manifest.ts'),
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
```

The plugin automatically generates the manifest.json from your TypeScript manifest file and handles the appropriate script injection for each extension context.

Manifest Configuration

Create a type-safe manifest file using TypeScript. This approach provides autocomplete and catches configuration errors before build time:

```typescript
// src/manifest.ts
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'My Vite Extension',
  version: '1.0.0',
  description: 'A Chrome extension built with Vite',
  permissions: ['storage', 'tabs'],
  action: {
    default_popup: 'index.html',
    default_icon: {
      '16': 'icons/icon16.png',
      '48': 'icons/icon48.png',
      '128': 'icons/icon128.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/content-script.ts'],
    },
  ],
  options_page: 'src/options/index.html',
});
```

The @crxjs/vite-plugin package provides the defineManifest helper that generates a valid manifest.json during the build process. This is preferable to manually writing manifest.json because TypeScript validates the configuration.

Hot Module Replacement for Extensions

Vite's HMR works differently for each extension context. Understanding these differences is crucial for an effective development workflow:

For popup and options pages, HMR updates the page automatically when you modify its scripts or styles. The popup will reflect changes immediately after saving, though you may need to close and reopen it to see certain updates.

Content scripts benefit from Vite's HMR but operate in an isolated context. Changes to content scripts require either reloading the extension or refreshing the page to take effect. The vite-plugin-chrome-extension handles most of this automatically.

Background service workers cannot use standard HMR because Chrome reloads them when changes are detected. Vite's watch mode detects these changes and triggers a service worker reload. Configure your development workflow to handle this:

```typescript
// In your service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Use reload detection
let extensionId: string;

chrome.management.getSelf((info) => {
  extensionId = info.id;
});

// Development helper
if (import.meta.env.DEV) {
  chrome.runtime.reload();
}
```

Development Workflow

Configure your package.json with scripts that match Chrome extension development patterns:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  }
}
```

During development, use the `npm run dev` command to start Vite's development server. The vite-plugin-chrome-extension provides a special URL that loads your extension in Chrome. Open chrome://extensions, enable developer mode, and load the unpacked extension from your dist directory.

For the best experience, configure Chrome to automatically reload when files change. You can use the Chrome extension "Extension Reloader" or manually click the reload button after each significant change.

Handling Multiple Entry Points

Chrome extensions typically have several distinct entry points, each running in its own context. Vite handles this through its multi-page app configuration:

```typescript
// vite.config.ts with multiple entries
import { defineConfig } from 'vite';
import chromeExtension from 'vite-plugin-chrome-extension';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    chromeExtension({
      manifest: resolve(__dirname, 'src/manifest.ts'),
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
    },
  },
});
```

Each input becomes a separate output file that Chrome can load independently. This separation ensures that changes to the options page don't affect the popup, and vice versa.

Styling and CSS

Vite handles CSS naturally through standard imports. For Chrome extensions, consider using CSS modules or a utility-first framework to keep styles scoped:

```typescript
// In your popup component
import './popup.css';

// Or with CSS modules
import styles from './popup.module.css';
document.querySelector('body')?.classList.add(styles.container);
```

For content scripts, be careful about style leakage. Content scripts run in the page's context, so your styles can affect the host page. Use shadow DOM or careful selectors to isolate your styles:

```typescript
// content-script.ts
const host = document.createElement('div');
host.attachShadow({ mode: 'open' });
host.shadowRoot.innerHTML = `
  <style>
    .my-widget { /* isolated styles */ }
  </style>
  <div class="my-widget">Content</div>
`;
document.body.appendChild(host);
```

TypeScript and Chrome APIs

Install Chrome API types to get full TypeScript support for extension APIs:

```bash
npm install --save-dev @types/chrome
```

Create a types file for shared type definitions:

```typescript
// src/shared/types.ts
export interface Message {
  type: 'GET_DATA' | 'SET_DATA';
  payload?: unknown;
}

export interface ExtensionMessage {
  source: 'popup' | 'background' | 'content';
  data: Message;
}
```

With proper types, your code gains significant robustness through compile-time checking of API calls and message structures.

Production Builds

When building for production, ensure your configuration generates optimized, minified output:

```typescript
// Production-specific configuration
export default defineConfig({
  plugins: [
    chromeExtension({
      manifest: resolve(__dirname, 'src/manifest.ts'),
    }),
  ],
  build: {
    minify: true,
    sourcemap: false,
  },
});
```

Run `npm run build` to generate the final extension package. The output in the dist folder is ready to be packaged for the Chrome Web Store or distributed as a loadable unpacked extension.

Troubleshooting Common Issues

Several issues commonly arise when setting up Vite for Chrome extensions. The most frequent is manifest generation failures, usually caused by incorrect file paths in the manifest configuration. Double-check that all referenced files exist and that paths are relative to the project root.

Another common issue involves service worker module loading. Ensure your manifest specifies `"type": "module"` for the background service worker, and remember that ES modules in service workers have specific scoping rules that affect how you can import other files.

Finally, if HMR isn't working as expected, verify that your extension is loaded as an unpacked extension in developer mode. Some HMR features require the development server to be accessible from Chrome's extension context.

Conclusion

Vite provides an exceptionally fast development experience for Chrome extensions. The combination of instant server startup, effective HMR, and straightforward configuration makes it an excellent choice for modern extension development. While you may occasionally encounter edge cases specific to extension contexts, the overall developer experience significantly outweighs these minor inconveniences. Start your next extension project with Vite and experience the difference that fast tooling makes in your development workflow.
