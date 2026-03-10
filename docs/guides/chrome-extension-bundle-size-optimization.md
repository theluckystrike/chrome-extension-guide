---
layout: default
title: "Reduce Chrome Extension Bundle Size: Tree-Shaking, Code Splitting, and Compression"
<<<<<<< HEAD
description: "Master Chrome extension bundle size optimization with webpack, Vite, and Rollup. Learn tree-shaking, dynamic imports, asset compression, and CI size budgets for lightning-fast extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-bundle-size-optimization/"
proficiency_level: "Advanced"
=======
description: "Learn how to reduce your Chrome extension bundle size with tree-shaking, code splitting, compression, and build optimization techniques. Comprehensive guide for extension developers."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-bundle-size-optimization/"
>>>>>>> content/bundle-size-optimization
---

# Reduce Chrome Extension Bundle Size: Tree-Shaking, Code Splitting, and Compression

<<<<<<< HEAD
Bundle size optimization is critical for Chrome extension performance and user experience. Larger bundles mean slower load times, higher memory consumption, and potentially failed Chrome Web Store submissions. This comprehensive guide covers everything you need to know about reducing your extension's bundle size through modern bundling techniques, asset optimization, and CI/CD integration.

Chrome extensions face unique constraints that web applications don't. Your extension must load quickly, use minimal memory across multiple contexts (popup, background service worker, content scripts), and stay within the Chrome Web Store's strict size limits. Understanding these constraints and how to optimize for them will make your extension more performant and more likely to succeed in the marketplace.

---

## Understanding Chrome Web Store Size Limits

Before diving into optimization techniques, you must understand the constraints you're working within. The Chrome Web Store has two important size limits that affect how you build and package your extension.

### The CRX Package Limit

The total size of your extension's CRX package cannot exceed 256 MB. While this might seem generous, it can be surprisingly easy to exceed this limit with large dependencies, uncompressed assets, or unnecessary libraries. Remember that this limit applies to the packaged CRX file, not the unpacked extension directory. This distinction matters because some compression optimizations happen during the packaging process, while others must be implemented in your build pipeline.

For most extensions, 256 MB should be more than sufficient. However, extensions that bundle large libraries, include extensive datasets, or use heavy media assets can quickly approach this limit. The real concern isn't just staying under the limit—it's ensuring your extension loads quickly and doesn't consume excessive memory when users have dozens of tabs open.

### The Initial Download Size Consideration

While the CRX limit is 256 MB, Chrome also imposes implicit pressure on initial download size through user behavior and store listing visibility. Users are more likely to abandon extensions that appear large or slow to install. Additionally, the Chrome Web Store shows the install size in the listing, which can influence user decisions.

More importantly, each extension context (popup, service worker, content scripts) loads its own JavaScript bundle. If you're not careful about code splitting and shared dependencies, users may download far more JavaScript than any single context actually needs. This wasted download size affects perceived performance and creates unnecessary memory pressure on users' systems.

---

## Configuring Modern Bundlers for Extensions

Modern JavaScript bundlers like Webpack, Vite, and Rollup offer powerful optimization features that can dramatically reduce your extension's bundle size. Each bundler has different strengths, and understanding how to configure them specifically for Chrome extensions is essential.

### Webpack Configuration for Size Optimization

Webpack remains the most configurable option for complex extension builds. The key to size optimization lies in properly configuring the optimization section of your webpack configuration:

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  entry: {
    popup: './src/popup/index.tsx',
    options: './src/options/index.tsx',
    background: './src/background/service-worker.ts',
    'content-script': './src/content/script.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    usedExports: true,
    sideEffects: true,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            passes: 2,
          },
          mangle: true,
          output: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 25,
      minSize: 20000,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
=======
Chrome extensions face unique bundle size challenges that web applications don't encounter. Your extension must load quickly across all extension contexts—popup, background service worker, content scripts, and options page—while staying within Chrome Web Store (CWS) limits. This comprehensive guide covers every technique you need to build lean, fast-loading extensions that pass review and delight users.

## Table of Contents {#table-of-contents}

- [Understanding Chrome Web Store Size Limits](#understanding-chrome-web-store-size-limits)
- [Build Tool Configuration for Extensions](#build-tool-configuration-for-extensions)
- [Tree-Shaking Unused APIs and Dependencies](#tree-shaking-unused-apis-and-dependencies)
- [Dynamic Imports in Content Scripts](#dynamic-imports-in-content-scripts)
- [Shared Chunks Between Popup and Background](#shared-chunks-between-popup-and-background)
- [Image and Asset Optimization](#image-and-asset-optimization)
- [Font Subsetting Strategies](#font-subsetting-strategies)
- [WASM vs JavaScript Performance Tradeoffs](#wasm-vs-javascript-performance-tradeoffs)
- [Analyzing Bundle Composition](#analyzing-bundle-composition)
- [CI Size Budgets and Enforcement](#ci-size-budgets-and-enforcement)

---

## Understanding Chrome Web Store Size Limits {#understanding-chrome-web-store-size-limits}

The Chrome Web Store imposes strict size limits that directly impact your development decisions. As of 2024, the limits are:

- **Initial download**: 256 KB (compressed CRX)
- **Installed size**: 2 GB maximum
- **Update package**: Must stay within reasonable bounds for user bandwidth

The 256 KB initial download limit is the most critical constraint. This is what users experience when installing your extension for the first time. Users with slower connections or limited data plans will abandon extensions that take too long to download. Additionally, a smaller bundle means faster installation and less disk space usage on user machines.

Extensions that exceed the initial download limit face rejection during the review process. Google designed this limit to ensure quality extensions and protect users from bloated software. However, you can leverage off-store resources and lazy loading strategies to deliver rich functionality beyond this limit.

Understanding these limits shapes every optimization decision. A 50 KB bundle gives you far more flexibility than a 200 KB bundle. Plan your architecture with these constraints in mind from day one.

---

## Build Tool Configuration for Extensions {#build-tool-configuration-for-extensions}

Modern build tools—Webpack, Vite, and Rollup—offer powerful optimization features, but extensions require specific configuration to work correctly with Chrome's extension contexts.

### Webpack Configuration

Webpack remains the most configurable option for extension bundling. The key is properly defining entry points for each extension context:

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'popup': './src/popup/index.tsx',
    'background': './src/background/index.ts',
    'content-main': './src/content/main.ts',
    'options': './src/options/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
>>>>>>> content/bundle-size-optimization
        },
      },
    },
  },
};
```

<<<<<<< HEAD
The `usedExports` option enables tree-shaking by marking unused exports, while `sideEffects` allows webpack to skip entire modules that have no side effects. The `splitChunks` configuration extracts vendor code and common dependencies into separate chunks that can be cached across builds.

### Vite Configuration for Extensions

Vite offers faster builds and simpler configuration, making it an excellent choice for extension development. However, Vite's default configuration isn't optimized for Chrome extensions, so you'll need to add specific settings:

```javascript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'esnext',
=======
The critical optimization settings include `splitChunks` for code splitting, `treeShaking` (enabled by default in production mode), and proper module resolution to avoid bundling unused files.

### Vite Configuration

Vite offers faster build times with its Rollup-based build system. Extension configuration requires the proper directory structure:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'background.html'),
        options: resolve(__dirname, 'options.html'),
      },
      output: {
        entryFileNames: '[name]/[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
>>>>>>> content/bundle-size-optimization
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
<<<<<<< HEAD
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  esbuild: {
    treeShaking: true,
=======
>>>>>>> content/bundle-size-optimization
  },
});
```

<<<<<<< HEAD
Vite uses esbuild for minification by default, which is extremely fast but may not produce the smallest possible bundles. Switching to Terser (as shown above) can sometimes yield smaller outputs, though at the cost of build speed.

### Rollup Configuration for Maximum Tree-Shaking

Rollup excels at tree-shaking because of its deterministic module analysis. For extensions where bundle size is paramount, Rollup often produces the smallest outputs:

```javascript
// rollup.config.js
export default {
  input: {
    popup: 'src/popup/index.ts',
    background: 'src/background/index.ts',
    'content-script': 'src/content/index.ts',
  },
  output: {
    dir: 'dist',
    format: 'esm',
    entryFileNames: '[name].js',
    chunkFileNames: '[name]-[hash].js',
  },
  treeshake: {
    moduleSideEffects: false,
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false,
  },
  plugins: [
    terser({
      compress: {
        passes: 2,
=======
Vite's native code splitting handles much of this automatically, but the configuration ensures proper file organization for Chrome's manifest requirements.

### Rollup Configuration

For maximum control, Rollup provides granular control over bundling:

```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: {
    popup: 'src/popup/main.ts',
    background: 'src/background/main.ts',
    content: 'src/content/main.ts',
  },
  output: {
    dir: 'dist',
    format: 'es',
    entryFileNames: '[name]/[name].js',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [
    resolve(),
    typescript({ tsconfig: './tsconfig.json' }),
    terser({
      compress: {
>>>>>>> content/bundle-size-optimization
        drop_console: true,
      },
    }),
  ],
};
```

<<<<<<< HEAD
The aggressive tree-shaking options in Rollup can sometimes eliminate code that's actually needed, so test your extension thoroughly after enabling these settings.

---

## Tree-Shaking Unused Chrome APIs

One of the most effective ways to reduce bundle size is eliminating unused Chrome APIs and libraries. Chrome's extension APIs are extensive, and importing the entire API surface can add significant weight to your bundles.

### Importing Specific APIs

Instead of importing all of chrome API, import only what you need:

```typescript
// Bad - imports entire API surface
import * as chromeAPI from 'chrome-types';
console.log(chromeAPI.runtime.getURL);

// Good - imports only what's needed
import { getURL } from 'chrome-runtime';
console.log(getURL());
```

Using TypeScript with the `@types/chrome` package helps your bundler understand which imports you're actually using, enabling more aggressive tree-shaking. Make sure your TypeScript configuration enables `isolatedModules` and that your bundler is configured to respect export usage information.

### Lazy Loading Chrome API

For APIs that aren't needed immediately, consider lazy loading:

```typescript
// Lazy load storage API only when needed
async function getStoredSettings() {
  const { get } = await import('chrome-storage');
  return get('settings');
}
```

This pattern is particularly useful in content scripts, where you want to minimize the initial bundle size to avoid delaying page interaction. The dynamic import only loads the Chrome API wrapper when the function is actually called, keeping your initial bundle small.

---

## Dynamic Imports in Content Scripts

Content scripts have unique performance considerations because they run in the context of every web page. Loading too much JavaScript upfront can slow down page rendering and consume memory unnecessarily.

### Implementing Dynamic Imports

Use dynamic imports to split your content script into essential and non-essential parts:

```typescript
// content-script.ts - Essential code loads immediately
import { initMutationObserver } from './dom/mutations';
import { setupMessageHandler } from './messaging';

// Initialize immediately
initMutationObserver();
setupMessageHandler();

// Non-essential features load on demand
document.addEventListener('click', async (event) => {
  if (event.target.matches('[data-extension-action]')) {
    const { handleExtensionAction } = await import(
      './features/action-handler'
    );
    handleExtensionAction(event.target);
  }
});
```

This pattern ensures that the code needed for initial page interaction loads quickly, while feature code only loads when users actually interact with elements that require it. The browser handles the dynamic import caching, so subsequent interactions don't require re-downloading.

### Message-Driven Lazy Loading

Another effective pattern uses Chrome's message passing system to trigger lazy loading:

```typescript
// content-script.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOAD_ANALYTICS') {
    import('./analytics/tracker').then((module) => {
      module.init(message.config);
      sendResponse({ loaded: true });
    });
    return true; // Keep channel open for async response
  }
});
```

This allows your background script or popup to request heavy features only when needed, keeping content scripts lean by default.

---

## Shared Chunks Between Popup and Background

Chrome extensions typically have multiple entry points that share significant code. Without proper configuration, each entry point includes its own copy of shared dependencies, multiplying your effective bundle size.

### Configuring Shared Dependencies

Webpack's `splitChunks` can extract shared code into common chunks:

```javascript
=======
Each build tool has strengths. Webpack offers the most ecosystem compatibility. Vite provides the fastest development experience. Rollup delivers the smallest production bundles with careful configuration.

---

## Tree-Shaking Unused APIs and Dependencies {#tree-shaking-unused-apis-and-dependencies}

Tree-shaking eliminates dead code—functions, variables, and imports that never execute. Modern bundlers perform tree-shaking based on ES module static analysis, making your code structure critical.

### Optimizing Import Statements

The way you import dependencies determines tree-shaking effectiveness:

```typescript
// Bad: Imports entire library
import _ from 'lodash';
const sorted = _.sortBy(items, 'name');

// Good: Imports only what you need
import sortBy from 'lodash/sortBy';
const sorted = sortBy(items, 'name');

// Best: Imports specific function directly
import sortBy from 'lodash.sortby';
const sorted = sortBy(items, 'name');
```

Lodash demonstrates this clearly. The default import pulls in the entire library—hundreds of kilobytes. Named imports from specific modules reduce this to the actual functions used.

### Side Effects and Tree-Shaking

Tree-shaking only works when bundlers can prove code has no side effects. Mark pure functions explicitly:

```typescript
// Mark function as pure for better tree-shaking
/* @__PURE__ */ function processData(data) {
  return data.map(item => item.value);
}

// Or use JSDoc
/** @__PURE__ */
function transformValue(input) {
  return input * 2;
}
```

The `/* @__PURE__ */` annotation tells Webpack and other bundlers that this function can be safely removed if unused. This is especially valuable for utility functions in shared code.

### Chrome API Tree-Shaking

Chrome's extension APIs are large. Never import the entire `chrome` namespace:

```typescript
// Avoid: Imports massive chrome namespace
import * as chrome from 'chrome';

// Better: Import specific APIs
import { tabs, runtime, storage } from 'chrome';

// Best: Lazy-import when needed
async function getCurrentTab() {
  const { tabs } = await import('chrome');
  const [tab] = await tabs.query({ active: true, currentWindow: true });
  return tab;
}
```

For TypeScript, use the `@types/chrome` package and import only the namespaces you need. This can reduce TypeScript compilation overhead significantly.

---

## Dynamic Imports in Content Scripts {#dynamic-imports-in-content-scripts}

Content scripts load in every page your extension matches, making initial bundle size critical. Dynamic imports defer loading until needed, keeping the initial payload small.

### Lazy Loading Features

Load features on-demand rather than at startup:

```typescript
// content/main.ts - Initial lightweight entry
import { initializeUI } from './ui-core';
import { setupEventListeners } from './events';

// Initialize lightweight core immediately
initializeUI();
setupEventListeners();

// Load heavy features only when triggered
document.addEventListener('click', async (event) => {
  if (event.target.matches('[data-feature="advanced"]')) {
    const { initAdvancedFeature } = await import('./features/advanced');
    initAdvancedFeature();
  }
});
```

This pattern keeps your content script under the initial size limit while providing full functionality when users need it.

### Dynamic Import with User Interaction

Content scripts often need heavy libraries for specific features. Load them only when users trigger those features:

```typescript
// Load charting library only when user opens the dashboard
async function showDashboard() {
  const { renderChart } = await import('./charting-lib');
  const data = await fetchAnalytics();
  renderChart(data);
}
```

The tradeoff is slight latency when users first access those features. Balance this against initial load time—users tolerate brief delays for rare actions but abandon extensions that feel slow on every interaction.

### Communication After Dynamic Import

When using dynamic imports in content scripts, ensure proper message passing:

```typescript
// content/main.ts
import { setupMessageHandler } from './messaging';

document.addEventListener('contextmenu', async (e) => {
  const { showContextMenu } = await import('./context-menu');
  showContextMenu(e);
  
  // Re-establish messaging for dynamically loaded code
  setupMessageHandler();
});
```

Remember that dynamically imported code runs in the same content script context, so it shares the same message channel with your background script.

---

## Shared Chunks Between Popup and Background {#shared-chunks-between-popup-and-background}

Extensions typically have multiple entry points—popup, background service worker, content scripts, options page. Shared code between these contexts should be extracted into common chunks to avoid duplication.

### Configuring Shared Chunks

Webpack's `splitChunks` configuration handles this automatically:

```javascript
// webpack.config.js
>>>>>>> content/bundle-size-optimization
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
<<<<<<< HEAD
      // Extract Chrome API wrappers
      chromeApi: {
        test: /[\\/]node_modules[\\/]chrome-[^/]+[\\/]/,
        name: 'chrome-api',
        chunks: 'all',
        priority: 20,
      },
      // Extract shared utilities
      shared: {
        test: /[\\/]src[\\/]shared[\\/]/,
        name: 'shared',
        chunks: 'all',
        priority: 15,
      },
      // Extract vendor code
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
=======
      // Extract common code used across contexts
      common: {
        name: 'common',
        minChunks: 2,
        priority: -10,
        reuseExistingChunk: true,
      },
      // Vendor code (node_modules) shared across contexts
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendor',
>>>>>>> content/bundle-size-optimization
        chunks: 'all',
        priority: 10,
      },
    },
  },
}
```

<<<<<<< HEAD
This configuration ensures that chrome-api wrappers, shared utilities, and vendor libraries are extracted into separate chunks that all entry points can share. The browser caches these chunks separately, so updates to your application code don't require re-downloading the shared dependencies.

### Avoiding Context Isolation Pitfalls

When using code splitting, be aware of Chrome's context isolation requirements. Service workers and content scripts run in isolated contexts, so shared chunks must be compatible with both environments. Avoid using browser-specific APIs in shared code unless you add proper feature detection or polyfills.

---

## Image Optimization

Images often constitute the largest portion of an extension's size. Proper optimization can reduce their impact dramatically.

### Using Modern Image Formats

WebP and AVIF provide superior compression compared to PNG and JPEG:

```javascript
// webpack.config.js - Image optimization
{
  test: /\.(png|jpe?g)$/i,
  type: 'asset',
  parser: {
    dataUrlCondition: {
      maxSize: 8 * 1024, // 8KB inline threshold
    },
  },
  generator: {
    filename: 'images/[name].[hash:8][ext]',
  },
}
```

Consider using SVG wherever possible, as they scale without quality loss and can be minified to tiny file sizes. For complex images, use WebP with a JPEG fallback for older browsers.

### Implementing Responsive Images

For icons and larger images, provide multiple sizes and let the browser choose:

```html
<picture>
  <source srcset="image.avif" type="image/avif">
  <source srcset="image.webp" type="image/webp">
  <img src="image.png" alt="Description">
</picture>
```

In extension contexts where you're building bundles programmatically, use tools like `sharp` or `imagemin` in your build pipeline to generate optimized variants automatically.

---

## Font Subsetting

Web fonts can add significant weight to your extension. If you're using custom fonts, subsetting them to include only the characters you actually need can reduce file size by 80% or more.

### Subsetting with fonttools

Use fonttools to create custom subsets:

```bash
# Install fonttools
pip install fonttools brotli

# Create Latin subset
pyftsubset fonts/MyFont.ttf \
  --subset-file=fonts/MyFont-latin-subset.woff2 \
  --flavor=woff2 \
  --layout-features=* \
  --unicodes=U+0020-007F,U+00A0-00FF,U+0100-017F,U+0180-024F
```

For extensions that only need basic Latin characters, the subset can be dramatically smaller than the full font file. If your extension supports multiple languages, create separate font files for each language subset and load only what's needed.

### Loading Fonts Dynamically

In popup or options pages, load fonts on demand:

```typescript
// Only load extended character support when needed
async function loadExtendedFont() {
  const font = new FontFace(
    'MyFontExtended',
    'url(/fonts/MyFont-extended.woff2)'
  );
  await font.load();
  document.fonts.add(font);
}
```

---

## WebAssembly vs JavaScript Performance Tradeoffs

WebAssembly (Wasm) offers potential performance benefits for compute-intensive operations, but the decision isn't straightforward for extensions.

### When WebAssembly Makes Sense

Wasm excels at computationally intensive tasks like parsing, encryption, and image processing:

```typescript
// Using a Wasm module for JSON parsing performance
import init, { fastParse } from './parser/pkg/parser';

await init();
const data = fastParse(jsonString);
```

If your extension performs heavy computation that would block the main thread, Wasm can provide significant speedups. The initial Wasm module does add download size, so ensure the runtime performance gains justify the overhead.

### When to Stick with JavaScript

For most extension use cases, JavaScript remains the better choice. The overhead of loading Wasm modules, combined with the communication cost between JavaScript and Wasm, often outweighs benefits for simpler operations. Modern JavaScript engines are highly optimized, and for typical extension functionality, pure JavaScript will be both smaller and faster than adding Wasm.

A good rule of thumb: only consider Wasm if your operation takes more than 100ms in JavaScript and would benefit from the additional optimization opportunities Wasm provides.

---

## Analyzing Bundle Composition

Understanding what's in your bundle is essential for effective optimization. Several tools can help you analyze bundle composition and identify optimization opportunities.

### Using Source Map Explorer

Webpack and other bundlers can generate source maps that let you visualize bundle contents:

```bash
# Install source-map-explorer
npm install -D source-map-explorer

# After building with source maps
npx source-map-explorer dist/*.js
```

This tool displays a treemap showing exactly how much space each module contributes to your bundles. Use it to identify large dependencies that might be replaceable with lighter alternatives.

### Bundle Analysis with webpack-bundle-analyzer

For deeper analysis, use the webpack bundle analyzer:

```javascript
// webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

plugins: [
  new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    reportFilename: 'bundle-report.html',
    openAnalyzer: false,
  }),
];
```

Generate reports regularly and track how bundle composition changes over time. This helps you catch dependencies creeping in before they become problems.

---

## CI Size Budgets

Automated size checks in your CI pipeline prevent bundle bloat from sneaking into production builds.

### Setting Size Limits

Configure your bundler to warn or fail on size violations:

```javascript
// webpack.config.js - Size limits
const SizeLimitPlugin = require('size-limit-plugin');

module.exports = {
  plugins: [
    new SizeLimitPlugin({
      budgets: [
        {
          name: 'popup',
          limit: '50 KB',
        },
        {
          name: 'background',
          limit: '100 KB',
        },
        {
          name: 'content-script',
          limit: '30 KB',
        },
        {
          name: 'total',
          limit: '500 KB',
        },
      ],
=======
This configuration creates a separate `common.js` chunk containing code shared between at least two entry points. The `vendor` chunk holds dependencies that don't change often, allowing long-term browser caching.

### Manual Chunking for Extension APIs

Sometimes automatic splitting doesn't capture your architecture. Manually chunk shared utilities:

```javascript
// webpack.config.js - Manual chunking
optimization: {
  splitChunks: {
    cacheGroups: {
      // Shared utilities used everywhere
      utils: {
        test: /[\\/]src[\\/]utils[\\/]/,
        name: 'utils',
        chunks: 'all',
        priority: 20,
      },
      // Chrome API wrappers
      chromeApi: {
        test: /[\\/]src[\\/]chrome[\\/]/,
        name: 'chrome-api',
        chunks: 'all',
        priority: 15,
      },
    },
  },
}
```

This approach ensures consistent chunking regardless of entry point changes.

### Loading Shared Chunks

Ensure your HTML files load shared chunks before entry points:

```html
<!-- popup.html -->
<script src="vendor.js"></script>
<script src="common.js"></script>
<script src="popup.js"></script>
```

If using a bundler that inlines scripts, verify the output HTML maintains this order or use dynamic imports within your JavaScript.

---

## Image and Asset Optimization {#image-and-asset-optimization}

Images often constitute the largest portion of extension size. Strategic optimization dramatically reduces your bundle.

### Image Formats and Compression

Choose the right format for each image type:

- **Icons**: Use SVG when possible, then PNG at multiple sizes (16, 32, 48, 128)
- **Screenshots**: JPEG at 80% quality, max 1280x800 pixels
- **Promotional images**: WebP with JPEG fallback
- **Inline images**: Data URIs for small images, external URLs for larger ones

For icons, generate multiple sizes and let Chrome select the appropriate one:

```json
{
  "icons": {
    "16": "images/icon16.png",
    "32": "images/icon32.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  }
}
```

### SVG Optimization

SVGs can be heavily optimized. Remove metadata and simplify paths:

```bash
# Using svgo
npx svgo --multipass --folder ./src/icons
```

Remove unnecessary attributes, collapse groups, and round decimal precision. A well-optimized SVG icon can be under 500 bytes.

### Lazy Loading Images

For images within your extension UI, use lazy loading:

```typescript
// Lazy load images in popup
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target as HTMLImageElement;
      img.src = img.dataset.src;
      imageObserver.unobserve(img);
    }
  });
});

document.querySelectorAll('img[data-src]').forEach(img => {
  imageObserver.observe(img);
});
```

This keeps initial payload small while still delivering rich imagery when needed.

---

## Font Subsetting Strategies {#font-subsetting-strategies}

Web fonts can add hundreds of kilobytes to your bundle. Subsetting includes only the characters your extension actually uses.

### Creating Font Subsets

Generate subset fonts for optimal size:

```bash
# Using fonttools
pyftsubset NotoSans-Regular.ttf \
  --text="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" \
  --layout-features-=calt,liga,locl \
  --output-file=NotoSans-Subset.woff2
```

For extensions, subset to ASCII characters plus any specific glyphs you need. This typically reduces font size by 70-90%.

### Using System Fonts

The simplest solution: use system fonts that require no download:

```css
/* popup.css */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
    Oxygen, Ubuntu, Cantarell, sans-serif;
}
```

System fonts render instantly and require zero bundle size. The tradeoff is less visual consistency across platforms.

### Font Display Swap

When you must use custom fonts, prevent FOIT (Flash of Invisible Text):

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
}
```

The `font-display: swap` strategy shows fallback fonts until your custom font loads, improving perceived performance.

---

## WASM vs JavaScript Performance Tradeoffs {#wasm-vs-javascript-performance-tradeoffs}

WebAssembly offers performance benefits in specific scenarios, but often adds overhead for extension use cases.

### When WASM Makes Sense

WASM excels at compute-heavy operations:

- Image/video processing (resizing, filtering, encoding)
- Cryptographic operations (hashing, encryption)
- Data parsing (JSON, XML, binary formats)
- Mathematical computations (statistics, charting)

```typescript
// Using a WASM module for image processing
import init, { resizeImage } from './image-processor/pkg';

await init();
const resized = resizeImage(imageData, 100, 100);
```

The initial WASM module adds startup overhead, but processing is significantly faster for large operations.

### When to Stick with JavaScript

For most extension features, JavaScript is the better choice:

- **UI interactions**: DOM manipulation, event handling
- **Network requests**: Fetch API, WebSocket connections
- **Chrome API calls**: Direct chrome.* namespace usage
- **Data transformation**: JSON parsing, array operations

JavaScript loads faster (no WASM runtime initialization) and integrates more easily with browser APIs. Modern JS engines are remarkably optimized for most use cases.

### Hybrid Approaches

Combine both for optimal results:

```typescript
// Use JS for UI, WASM for heavy computation
import { parseAndTransform } from './transform-wasm';

function handleUserInput(input) {
  // Immediate UI feedback
  showLoadingSpinner();
  
  // Defer heavy processing to WASM
  Promise.resolve().then(() => {
    const result = parseAndTransform(input);
    updateUI(result);
  });
}
```

This pattern provides responsive UI while leveraging WASM for performance-critical operations.

---

## Analyzing Bundle Composition {#analyzing-bundle-composition}

Before optimizing, understand what comprises your bundle. Multiple tools provide detailed analysis.

### Webpack Bundle Analyzer

Visualize your bundle contents:

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
>>>>>>> content/bundle-size-optimization
    }),
  ],
};
```

<<<<<<< HEAD
These limits should be tight enough to catch regressions but realistic enough to allow for legitimate feature additions. Adjust them based on your extension's actual needs.

### GitHub Actions Integration

Add size checks to your CI pipeline:
=======
Run `npm run build` and open the generated HTML report. You'll see exactly which dependencies contribute most to size.

### Source Map Explorer

Analyze source maps to trace back to original source files:

```bash
npx source-map-explorer dist/*.js
```

This shows which of your source files contribute most to the final bundle, helping prioritize optimization efforts.

### Chrome Extension Size Analysis

For extension-specific insights, use the CRX Size Analyzer:

```bash
npx crx-size-analyzer /path/to/extension
```

This tool breaks down your extension by file type, entry point, and manifest sections, showing exactly where space is used.

### Regular Monitoring

Track bundle size over time:

```json
// package.json
{
  "scripts": {
    "analyze": "webpack-bundle-analyzer dist/stats.json",
    "size": "echo 'Bundle size:' && du -sh dist/"
  }
}
```

Set up automated analysis in CI to catch size regressions before they reach production.

---

## CI Size Budgets and Enforcement {#ci-size-budgets-and-enforcement}

Automated size enforcement prevents bundle bloat from creeping into your extension over time.

### Webpack Size Limits

Configure size warnings and failures:

```javascript
// webpack.config.js
const { BundleSizePlugin } = require('webpack-bundle-size-analyzer');

module.exports = {
  performance: {
    hints: 'warning',
    maxEntrypointSize: 250000,
    maxAssetSize: 250000,
  },
};
```

This triggers warnings when bundles approach the Chrome Web Store limit. Set strict limits appropriate for your extension.

### GitHub Actions Size Check

Enforce size limits in CI:
>>>>>>> content/bundle-size-optimization

```yaml
# .github/workflows/size-check.yml
name: Bundle Size Check

on: [push, pull_request]

jobs:
<<<<<<< HEAD
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Check bundle sizes
        run: |
          npx size-limit
        env:
          SIZE_LIMIT_IGNORE: []
```

Failing builds when size limits are exceeded ensures that team members address bloat before merging changes. Make sure to document why limits exist so contributors understand the importance of staying within them.

---

## Cross-References

For more information on related topics, explore these guides:

- [Webpack Extension Setup](./webpack-extension-setup.md) - Complete webpack configuration for extensions
- [Vite Extension Setup](./vite-extension-setup.md) - Fast builds with Vite
- [Chrome Extension Performance Best Practices](./chrome-extension-performance-best-practices.md) - Comprehensive performance optimization guide
- [Chrome Extension Performance Profiling](./chrome-extension-performance-profiling.md) - Using DevTools to find performance bottlenecks
- [Extension Performance Optimization](./extension-performance-optimization.md) - Advanced optimization techniques
=======
  size-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Check CRX size
        run: |
          EXTENSION_SIZE=$(npx crx-size-analyzer dist/ | grep "Total size" | awk '{print $3}')
          echo "Extension size: $EXTENSION_SIZE KB"
          if [ "$EXTENSION_SIZE" -gt 256 ]; then
            echo "Error: Extension exceeds 256KB limit"
            exit 1
          fi
```

This workflow fails builds that exceed size limits, ensuring no oversized extensions reach the Chrome Web Store.

### Size Budget in package.json

Modern build tools support size budgets:

```json
{
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "150KB",
      "maximumError": "250KB"
    },
    {
      "type": "anyComponent",
      "maximumWarning": "50KB",
      "maximumError": "100KB"
    }
  ]
}
```

Angular and other frameworks respect these budgets during builds, providing another enforcement layer.

### Pre-publish Verification

Always verify before publishing:

```bash
# Script to check everything before publish
#!/bin/bash
set -e

echo "Building extension..."
npm run build

echo "Checking CRX size..."
npx crx-size-analyzer dist/

echo "Verifying manifest..."
node scripts/verify-manifest.js

echo "All checks passed!"
```

Run this before every publish to catch issues early.

---

## Conclusion

Chrome extension bundle optimization requires attention to multiple concerns: understanding CWS limits, configuring build tools properly, leveraging tree-shaking and code splitting, optimizing assets, and enforcing size budgets in CI. Each technique contributes to a lean extension that loads quickly and passes review.

Start with the basics—proper import statements and build configuration—then layer on advanced techniques like dynamic imports and WASM where they provide real value. Monitor bundle size continuously to catch regressions before they become problems.

The techniques in this guide work together synergistically. A well-configured build pipeline with proper chunking, tree-shaking enabled, and CI enforcement creates an optimization system that maintains small bundle sizes automatically as your extension evolves.
>>>>>>> content/bundle-size-optimization

---

## Related Articles

<<<<<<< HEAD
- [Rollup Extension Setup](./rollup-extension-setup.md)
- [esbuild Extension Setup](./esbuild-extension-setup.md)
- [Chrome Extension Performance Audit Checklist](./chrome-extension-performance-audit-checklist.md)

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
=======
- [Extension Performance Optimization](../guides/extension-performance-optimization.md)
- [Performance Profiling Guide](../guides/chrome-extension-performance-profiling.md)
- [Content Script Frameworks](../guides/content-script-frameworks.md)
- [WXT Framework Setup](../guides/wxt-framework-setup.md)
- [Plamo Framework Setup](../guides/plamo-framework-setup.md)
- [Extension Bundle Analysis](../guides/extension-bundle-analysis.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
>>>>>>> content/bundle-size-optimization
