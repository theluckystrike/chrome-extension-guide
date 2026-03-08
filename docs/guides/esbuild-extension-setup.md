---
layout: default
title: "Chrome Extension Esbuild Setup — Developer Guide"
description: "Learn how to build a Esextension Setup Chrome extension with this comprehensive tutorial covering architecture, implementation, and best practices."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/esbuild-extension-setup/"
---
# esbuild Setup for Chrome Extensions

## Overview {#overview}

esbuild is an extremely fast JavaScript bundler written in Go that offers blazing-fast build times for Chrome extensions. Known for its parallel compilation and native code performance, esbuild can bundle extension code in milliseconds compared to seconds or minutes with traditional bundlers.

This guide covers setting up esbuild for Chrome extension development, configuring multi-entry builds for different extension contexts, and establishing efficient development and production workflows.

## Why esbuild {#why-esbuild}

esbuild offers several compelling advantages for Chrome extension development. First and most importantly, its build speed is orders of magnitude faster than traditional bundlers—esbuild can bundle entire extensions in under a second, making the development cycle nearly instantaneous. This speed comes from its Go-based architecture that compiles to native code and utilizes all available CPU cores through parallel processing.

esbuild includes built-in support for TypeScript without requiring additional configuration or separate compilation steps. You can use TypeScript syntax directly in your source files, and esbuild will transpile them correctly while preserving type annotations for IDE support. The minification engine is similarly impressive, producing smaller bundles than terser or other JavaScript minifiers while being significantly faster.

The configuration system uses a straightforward JavaScript API that is easier to learn than webpack's complex DSL. Despite its simplicity, esbuild is highly capable, supporting code splitting, tree shaking, source maps, and plugin architecture for custom processing.

## Project Structure {#project-structure}

A typical Chrome extension project built with esbuild follows a structured directory layout:

```
src/
  background/
    service-worker.ts      # Background service worker entry
  content/
    content-script.ts     # Content script entry
  popup/
    popup.ts              # Popup entry
    popup.css             # Popup styles
    popup.html            # Popup HTML
  options/
    options.ts            # Options page entry
    options.css           # Options styles
    options.html          # Options HTML
  shared/
    types.ts              # Shared TypeScript types
    utils.ts              # Shared utility functions
manifest.json             # Extension manifest
esbuild.config.mjs       # esbuild configuration
package.json              # Dependencies and scripts
tsconfig.json             # TypeScript configuration
```

This structure keeps each extension context isolated while allowing shared code to be imported where needed. The manifest.json stays in the project root and gets copied to the dist folder during the build process.

## esbuild Configuration {#esbuild-configuration}

The esbuild configuration for Chrome extensions requires setting up multiple entry points, each corresponding to a different extension context. Here is a comprehensive configuration:

```javascript
// esbuild.config.mjs
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');
const isProd = process.env.NODE_ENV === 'production';

// Ensure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// Copy manifest to dist
copyFileSync('manifest.json', 'dist/manifest.json');

// Common build options
const baseConfig = {
  bundle: true,
  sourcemap: isProd ? false : true,
  minify: isProd,
  target: ['chrome110'],
  format: 'iife',
};

// Define entry points for each extension context
const entries = [
  {
    entry: 'src/background/service-worker.ts',
    outfile: 'dist/background.js',
    name: 'background',
  },
  {
    entry: 'src/content/content-script.ts',
    outfile: 'dist/content.js',
    name: 'content',
  },
  {
    entry: 'src/popup/popup.ts',
    outfile: 'dist/popup.js',
  },
  {
    entry: 'src/options/options.ts',
    outfile: 'dist/options.js',
  },
];

// Build function
async function build() {
  const promises = entries.map((entry) =>
    esbuild.build({
      ...baseConfig,
      entryPoints: [entry.entry],
      outfile: entry.outfile,
      // Keep background and content as single files
      ...(entry.name === 'background' || entry.name === 'content'
        ? { format: 'iife', inlineDynamicImports: true }
        : {}),
    })
  );

  await Promise.all(promises);
  console.log('Build complete!');
}

// Watch mode for development
async function watch() {
  const ctx = await esbuild.context({
    ...baseConfig,
    entryPoints: entries.map((e) => e.entry),
    outdir: 'dist',
    splitting: false,
    write: true,
  });

  await ctx.watch();
  console.log('Watching for changes...');
}

// Start appropriate build mode
if (isWatch) {
  watch();
} else {
  build();
}
```

This configuration defines four entry points: popup, options, background, and content. Each entry produces a corresponding JavaScript file in the dist directory.

## Service Worker Build {#service-worker-build}

The background service worker presents unique challenges because it runs in a special Chrome context without access to the DOM. Unlike popup and options pages, the service worker cannot use true HMR—each change requires reloading the extension in Chrome. Additionally, the service worker must be a single bundled file with no dynamic imports, as Chrome loads it as a single script.

Configure the service worker to ensure all dependencies are bundled into a single file:

```javascript
{
  entryPoints: ['src/background/service-worker.ts'],
  outfile: 'dist/background.js',
  format: 'iife',
  inlineDynamicImports: true, // Force single bundle
  target: 'chrome110',
  bundle: true,
}
```

The inlineDynamicImports option ensures all code is bundled into one file, which is required for service workers. Some developers prefer to create a separate build configuration specifically for the service worker to have more granular control over the output.

## Content Script Build {#content-script-build}

Content scripts are injected into web pages and must be completely self-contained since they run in the context of arbitrary websites. They cannot rely on any external dependencies being present, and Chrome requires them to be specified as single files in the manifest.

Configure content script builds to output a single file without code splitting:

```javascript
{
  entryPoints: ['src/content/content-script.ts'],
  outfile: 'dist/content.js',
  format: 'iife',
  inlineDynamicImports: true,
  target: 'chrome110',
  bundle: true,
}
```

If your content script requires CSS, you can either extract CSS into a separate file and include it in the manifest's css array, or inject styles programmatically using JavaScript.

## Watch Mode and Hot Reload {#watch-mode-and-hot-reload}

esbuild's watch mode rebuilds your extension automatically when source files change. For a complete development experience with automatic extension reloading, you can combine esbuild watch with the Chrome Extension Reload VS Code extension or use a custom script:

```javascript
// watch.mjs - Development watcher with auto-reload
import * as esbuild from 'esbuild';
import { spawn } from 'child_process';

const ctx = await esbuild.context({
  entryPoints: [
    'src/background/service-worker.ts',
    'src/content/content-script.ts',
    'src/popup/popup.ts',
    'src/options/options.ts',
  ],
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  sourcemap: true,
  target: 'chrome110',
  splitting: false,
  write: true,
});

await ctx.watch();
console.log('Watching for changes...');

// Optional: Notify Chrome to reload extension
// This requires chrome.runtime.reload() called from a helper
function notifyReload() {
  // Use chrome.management API or a separate reload mechanism
  console.log('Rebuilt at', new Date().toISOString());
}

// Watch for rebuild events
ctx.rebuild().then(() => notifyReload());
```

For true hot reload in popup and options pages, consider using a development server with the CRXJS dev server or manually reloading the extension after each build.

## TypeScript Support {#typescript-support}

esbuild has native TypeScript support built-in. Simply use .ts files as entry points, and esbuild will transpile them automatically:

```bash
npm install --save-dev typescript @types/chrome
```

Your tsconfig.json can be minimal since esbuild handles the transpilation:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Install Chrome types for full autocomplete support:

```bash
npm install --save-dev @types/chrome
```

## Package.json Scripts {#packagejson-scripts}

Add the following scripts to your package.json for convenient building:

```json
{
  "scripts": {
    "build": "NODE_ENV=production node esbuild.config.mjs",
    "dev": "node esbuild.config.mjs --watch",
    "clean": "rm -rf dist",
    "zip": "zip -r extension.zip dist/",
    "release": "npm run build && npm run zip"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.244",
    "esbuild": "^0.20.0",
    "typescript": "^5.3.0"
  }
}
```

For TypeScript type checking before builds, add a separate script:

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "npm run typecheck && NODE_ENV=production node esbuild.config.mjs"
  }
}
```

## Manifest Copying {#manifest-copying}

After building your JavaScript files, you need to copy the manifest.json to the dist directory. Include any static assets as well:

```javascript
// esbuild.config.mjs - Manifest and asset copying
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'fs';

function copyAssets() {
  // Create dist directory if needed
  if (!existsSync('dist')) {
    mkdirSync('dist', { recursive: true });
  }

  // Copy manifest
  copyFileSync('manifest.json', 'dist/manifest.json');

  // Copy static assets (icons, images, etc.)
  if (existsSync('src/assets')) {
    cpSync('src/assets', 'dist/assets', { recursive: true });
  }

  // Copy HTML files for popup and options
  if (existsSync('src/popup/popup.html')) {
    copyFileSync('src/popup/popup.html', 'dist/popup.html');
  }
  if (existsSync('src/options/options.html')) {
    copyFileSync('src/options/options.html', 'dist/options.html');
  }
}

copyAssets();
```

Update your manifest.json to reference the correct built file paths:

```json
{
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "js": ["content.js"],
      "matches": ["<all_urls>"]
    }
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "options_page": "options.html"
}
```

## Production Build {#production-build}

The production build process creates optimized files ready for distribution. Enable minification and disable sourcemaps:

```javascript
const isProd = process.env.NODE_ENV === 'production';

const config = {
  bundle: true,
  sourcemap: isProd ? false : true,
  minify: isProd,
  target: ['chrome110'],
  // ... other options
};
```

Run the production build:

```bash
npm run build
```

After building, you can upload the resulting zip file to the Chrome Web Store using the developer dashboard or the chrome-webstore-upload tool.

## Code Examples {#code-examples}

### Complete esbuild.config.mjs {#complete-esbuildconfigmjs}

```javascript
import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, cpSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');
const isProd = process.env.NODE_ENV === 'production';

// Ensure dist directory exists
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}

// Copy manifest
copyFileSync('manifest.json', 'dist/manifest.json');

// Copy HTML files
['popup.html', 'options.html'].forEach((file) => {
  if (existsSync(`src/${file}`)) {
    copyFileSync(`src/${file}`, `dist/${file}`);
  }
});

// Copy assets if exists
if (existsSync('src/assets')) {
  cpSync('src/assets', 'dist/assets', { recursive: true });
}

// Common build options
const buildOptions = {
  bundle: true,
  sourcemap: isProd ? false : true,
  minify: isProd,
  target: ['chrome110'],
  format: 'iife',
  logLevel: 'info',
};

// Entry point configurations
const entries = [
  {
    entry: 'src/background/service-worker.ts',
    outfile: 'dist/background.js',
    options: { inlineDynamicImports: true },
  },
  {
    entry: 'src/content/content-script.ts',
    outfile: 'dist/content.js',
    options: { inlineDynamicImports: true },
  },
  {
    entry: 'src/popup/popup.ts',
    outfile: 'dist/popup.js',
    options: {},
  },
  {
    entry: 'src/options/options.ts',
    outfile: 'dist/options.js',
    options: {},
  },
];

async function build() {
  try {
    await Promise.all(
      entries.map((entry) =>
        esbuild.build({
          ...buildOptions,
          ...entry.options,
          entryPoints: [entry.entry],
          outfile: entry.outfile,
        })
      )
    );
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

async function watch() {
  const ctx = await esbuild.context({
    ...buildOptions,
    entryPoints: entries.map((e) => e.entry),
    outdir: 'dist',
    write: true,
  });

  await ctx.watch();
  console.log('Watching for changes...');
}

if (isWatch) {
  watch();
} else {
  build();
}
```

### Service Worker Entry Example {#service-worker-entry-example}

```typescript
// src/background/service-worker.ts
/// <reference types="chrome-types/background" />

import { handleMessage } from '../shared/message-handler';
import { initializeStorage } from '../shared/storage';

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  initializeStorage();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});
```

## Cross-References {#cross-references}

For more information on related topics, see these guides:

- [TypeScript Extensions](./typescript-extensions.md) - TypeScript configuration and type definitions for Chrome APIs
- [CI/CD Pipeline](./ci-cd-pipeline.md) - Automated testing and deployment workflows
- [Vite Extension Setup](./vite-extension-setup.md) - Alternative build tool comparison

## Related Articles {#related-articles}

## Related Articles

- [Vite Setup](../guides/vite-extension-setup.md)
- [Webpack Setup](../guides/webpack-extension-setup.md)
