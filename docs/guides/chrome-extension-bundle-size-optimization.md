---
layout: default
title: "Reduce Chrome Extension Bundle Size: Tree-Shaking, Code Splitting, and Compression"
description: "Learn how to optimize your Chrome extension bundle size with tree-shaking, code splitting, dynamic imports, and compression techniques. Includes webpack, Vite, and Rollup configurations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-bundle-size-optimization/"
---

# Chrome Extension Bundle Size Optimization

Chrome extensions face unique constraints that web applications don't. The Chrome Web Store enforces strict size limits, and users expect lightning-fast load times. A bloated extension not only risks rejection during publication but also creates poor user experiences. This comprehensive guide covers every technique you need to minimize your extension's bundle size while maintaining functionality and performance.

## Understanding Chrome Web Store Size Limits {#cws-size-limits}

The Chrome Web Store imposes a **200MB uncompressed size limit** for published extensions. While this sounds generous, it applies to the final packaged extension (.crx file) after compression. Extensions exceeding this limit face rejection during review. Beyond the hard limit, smaller bundles provide significant advantages:

- **Faster installation times** for users on slow connections
- **Quicker updates** that users are more likely to accept
- **Lower storage footprint** on user machines
- **Reduced memory pressure** during runtime
- **Better user ratings** due to perceived performance
- **Faster time-to-interactive** for popup and options pages

For reference, well-optimized extensions typically weigh between **500KB and 3MB** uncompressed. If your extension exceeds 10MB, you have significant optimization opportunities.

### Size Limits by Extension Component

Understanding where size accumulates helps prioritize optimization efforts:

| Component | Typical Size | Optimization Priority |
|-----------|--------------|----------------------|
| JavaScript bundles | 100KB - 2MB | High |
| Icons/Images | 50KB - 500KB | Medium |
| Fonts | 0 - 300KB | Medium |
| HTML/CSS | 10KB - 100KB | Low |
| Data files (JSON) | 0 - 1MB | High |

### Why Size Matters Beyond the Limit

Even if your extension fits within the 200MB limit, size impacts user experience significantly. Large extensions take longer to install, especially on slower connections common in many regions. Users on mobile hotspots or metered connections may abandon installation of large extensions. Additionally, browser updates that include extension code consume more bandwidth, and users may delay accepting updates, leaving them with outdated, potentially insecure versions.

### The Update Problem

Every time you push an update, users must download the entire bundle, not just the changed portions. A 10MB extension with small bug fixes forces users to download all 10MB again. A 500KB optimized extension with the same fixes downloads much faster, increasing the likelihood users will accept updates promptly. This becomes critical for security updates where delayed adoption leaves users vulnerable.

## Build Tool Configuration for Extensions {#build-tool-config}

Choosing the right build tool and configuring it correctly forms the foundation of bundle optimization. Each major bundler offers extension-specific plugins and configurations. The choice depends on your extension's complexity, team familiarity, and specific requirements.

### Why Build Tools Matter for Extensions

Chrome extensions are not single-page applications. They consist of multiple isolated contexts—popup, background service worker, content scripts, options page, side panel—each with different loading behaviors and constraints. A well-configured build tool handles these complexities automatically, generating optimized bundles for each context while ensuring proper sharing of common code.

### Vite Configuration

Vite has become the preferred bundler for Chrome extensions due to its fast development experience and excellent production builds. The [Vite extension setup guide](/docs/guides/esbuild-extension-setup/) covers the basics, but here are the critical optimization settings:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import manifest from './manifest.json';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Generate separate chunks for each context
    rollupOptions: {
      output: {
        entryFileNames: 'src/[name]/[].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
    },
    // Target Chrome MV3
    target: 'chrome110',
    // Generate source maps for debugging
    sourcemap: true,
    // Disable CSS code splitting for inline styles
    cssCodeSplit: false,
    // Chunk size warning limit
    chunkSizeWarningLimit: 500,
  },
});
```

#### Vite with CRX Plugins

Vite's ecosystem includes extension-specific plugins that handle manifest generation and hot reloading:

```javascript
import { defineConfig } from 'vite';
import crx from '@crxjs/vite-plugin';

export default defineConfig({
  plugins: [
    crx({
      manifest: manifestPath,
      contentScripts: {
        refreshOnChange: true,
      },
    }),
  ],
});
```

### Webpack Configuration

Webpack remains popular for complex extensions requiring fine-grained control. Configure it for extension-specific optimization:

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  entry: {
    popup: './src/popup/index.js',
    background: './src/background/index.js',
    'content-main': './src/content/main.js',
    'content-injected': './src/content/injected.js',
  },
  optimization: {
    // Enable tree shaking
    usedExports: true,
    // Minimize code
    minimize: true,
    // Split chunks intelligently
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        chromeapis: {
          test: /[\\/]node_modules[\\/]chrome-[\\/]/,
          name: 'chrome-api-shim',
          chunks: 'all',
          priority: 10,
        },
      },
    },
  },
};
```

### Rollup Configuration

Rollup excels at producing small, clean bundles. Use it for library-style extensions or when you need maximum control:

```javascript
// rollup.config.js
export default {
  input: {
    popup: 'src/popup/index.js',
    background: 'src/background/index.js',
  },
  output: {
    dir: 'dist',
    format: 'esm',
    entryFileNames: '[name]/[].js',
    chunkFileNames: 'chunks/[name]-[hash].js',
  },
  plugins: [
    nodeResolve({ browser: true }),
    commonjs(),
    terser({
      compress: {
        passes: 2,
      },
    }),
  ],
};
```

## Tree-Shaking Unused APIs {#tree-shaking}

Tree-shaking eliminates dead code—functions and variables your extension never uses. Modern bundlers perform this automatically, but you must structure your code correctly for it to work. Understanding how tree-shaking works and what prevents it is essential for achieving minimal bundle sizes.

### How Tree-Shaking Works

Tree-shaking relies on static analysis of ES6 module imports and exports. When you import a specific named export, bundlers can trace which code actually uses that export. Any code that cannot be reached through this analysis is considered dead code and excluded from the final bundle. This works only with ES modules (import/export syntax), not CommonJS (require/module.exports).

### Writing Tree-Shakeable Code

Use ES modules and avoid patterns that prevent tree-shaking:

```javascript
// ❌ Prevents tree-shaking - all imports bundled
import * as ChromeAPI from 'chrome-api';
const tabs = ChromeAPI.tabs;

// ✅ Enables tree-shaking - only imported code bundled
import { tabs, windows } from 'chrome-api';
const tab = await tabs.query({ active: true });

// ❌ Prevents tree-shaking - dynamic module path
const modulePath = './utils';
import(modulePath);

// ✅ Enables tree-shaking - static import with condition
if (condition) {
  import('./heavy-module.js'); // Won't be tree-shaken (dynamic)
}

// ❌ Prevents tree-shaking - namespace re-export
export * from 'lodash'; // Everything from lodash bundled

// ✅ Enables tree-shaking - named re-exports only
export { pick, omit } from 'lodash';
```

### Marking Side Effects

Declare side effects to help bundlers make better decisions. Side effects are code that performs operations beyond returning a value—modifying global state, writing to disk, etc. Bundlers are conservative by default and assume all code might have side effects unless told otherwise:

```javascript
// package.json
{
  "sideEffects": [
    "./src/background/service-worker.js",
    "./src/popup/polyfills.js",
    "*.css"
  ]
}
```

In this configuration, only the specified files are considered to have side effects. All other files with unused exports will be removed from the bundle. Be careful not to mark files as side-effect-free if they actually modify global state or have observable side effects.

### Eliminating Unused Chrome APIs

Chrome's APIs are extensive, and importing the entire library wastes space. Many developers make the mistake of importing entire libraries when they only need a fraction of the functionality:

```javascript
// ❌ Import entire API - bundles everything
import chrome from 'chrome-api';

// ✅ Import only what you need - tree-shakeable
import { tabs, runtime, storage } from 'chrome-types';

// ✅ Use dynamic imports for rarely-used APIs
async function handleBookmarks() {
  const { bookmarks } = await import('chrome-types');
  return bookmarks.getTree();
}
```

### Common Tree-Shaking Pitfalls

Several patterns commonly prevent effective tree-shaking:

**Using CommonJS modules**: The `require()` syntax cannot be statically analyzed, preventing tree-shaking. Many npm packages still use CommonJS. Use dynamic imports or switch to ESM alternatives.

**Babel transformations**: If Babel converts ES6 imports to CommonJS require(), tree-shaking breaks. Configure Babel to preserve module syntax:

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', { modules: false }],
  ],
};
```

**Class constructors with side effects**: If your code instantiates classes at module load time, even unused exports may be retained:

```javascript
// ❌ Side effect at import time
import { ConfigManager } from './config';
const config = new ConfigManager(); // Always runs

// ✅ Lazy instantiation
import { ConfigManager } from './config';
const getConfig = () => new ConfigManager();
```

### Measuring Tree-Shaking Effectiveness

Use webpack's statistics to verify tree-shaking is working:

```javascript
// webpack.config.js
module.exports = {
  // ...
  optimization: {
    usedExports: true,
  },
  stats: {
    usedExports: true,
  },
};
```

Then run `webpack --analyze` to see which exports are marked as unused. This helps identify code that should be removed but isn't due to incorrect import patterns.

## Dynamic Imports in Content Scripts {#dynamic-imports}

Content scripts run in every page your extension injects into, making them critical optimization targets. Unlike popup and background scripts that load once per browser session, content scripts load on every page navigation. Even small savings in content script size multiply across millions of page loads, significantly impacting both user experience and extension performance.

Use dynamic imports to load functionality only when needed:

```javascript
// content-main.js - Lightweight entry point
async function initFeatureDetection() {
  // Check if user has interacted with the page
  document.addEventListener('click', async () => {
    if (!window.featureModuleLoaded) {
      window.featureModuleLoaded = true;
      // Load heavy feature module on demand
      const { enhanceClick } = await import('./features/click-enhancer.js');
      enhanceClick();
    }
  }, { once: true });
}

initFeatureDetection();
```

### Content Script Loading Patterns

Understanding when to load code helps design effective dynamic import strategies:

**On-demand loading**: Load features when users trigger specific actions. This is ideal for features users don't always need—settings panels, advanced tools, or rarely-used functionality.

```javascript
// content-script.js
// Minimal initial code
function init() {
  document.addEventListener('contextmenu', async (e) => {
    // Load advanced menu only when user opens context menu
    const { createAdvancedMenu } = await import('./advanced-menu.js');
    createAdvancedMenu(e);
  });
}

init();
```

**Feature detection**: Load code only for pages where it's applicable:

```javascript
// content-script.js
async function maybeLoadFeature() {
  const isYouTube = window.location.hostname.includes('youtube.com');
  
  if (isYouTube) {
    const { YouTubeEnhancer } = await import('./features/youtube.js');
    new YouTubeEnhancer().init();
  }
  
  const isGmail = window.location.hostname.includes('gmail.com');
  
  if (isGmail) {
    const { GmailEnhancer } = await import('./features/gmail.js');
    new GmailEnhancer().init();
  }
}

maybeLoadFeature();
```

**Progressive enhancement**: Start with minimal functionality and enhance as needed:

```javascript
// content-script.js
// Base functionality loads immediately
function setBadge(count) {
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', count });
}

// Extended features load on demand
async function initAdvancedFeatures() {
  const { analytics } = await import('./analytics.js');
  const { shortcuts } = await import('./shortcuts.js');
  
  analytics.init();
  shortcuts.init();
}
```

### Lazy Loading UI Components

Load popup components only when the user opens the popup. This dramatically reduces initial load time:

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for user interaction before loading heavy components
  const showSettings = () => {
    import('./components/settings-panel.js')
      .then(module => module.render())
      .catch(console.error);
  };

  document.getElementById('settings-btn').addEventListener('click', showSettings);
});
```

### Handling Chunk Loading Errors

Dynamic imports can fail—network issues, file not found, or parsing errors. Always handle failures gracefully:

```javascript
async function loadFeature(featurePath) {
  try {
    const module = await import(featurePath);
    return module.default?.() || module;
  } catch (error) {
    console.error(`Failed to load ${featurePath}:`, error);
    // Fallback behavior or user notification
    showErrorNotification('Feature unavailable');
    return null;
  }
}
```

### Preloading for Perceived Performance

Sometimes you can predict user behavior and preload modules before they're needed:

```javascript
// popup.js
// Preload settings panel when popup opens
document.addEventListener('DOMContentLoaded', () => {
  // Start loading in background
  const settingsPromise = import('./components/settings-panel.js');
  
  // When user clicks, it might already be loaded
  document.getElementById('settings-btn').addEventListener('click', async () => {
    const module = await settingsPromise;
    module.render();
  });
});
```

This technique bridges the gap between lazy loading and perceived performance, giving users near-instant responses for predicted actions while still avoiding the full bundle upfront.

## Shared Chunks Between Contexts {#shared-chunks}

Chrome extensions have multiple entry points—popup, background, content scripts, options page. These often share utility code. Configuring shared chunks prevents duplication:

```javascript
// webpack.config.js - Shared chunk configuration
optimization: {
  splitChunks: {
    chunks: 'all',
    maxInitialRequests: 25,
    minSize: 20000,
    cacheGroups: {
      // Shared utilities between popup and options
      sharedUtils: {
        test: /[\\/]src[\\/]utils[\\/]/,
        name: 'shared-utils',
        chunks: 'all',
        priority: 10,
      },
      // Chrome API wrappers used everywhere
      chromeWrapper: {
        test: /[\\/]src[\\/]lib[\\/]chrome.*\.js$/,
        name: 'chrome-wrapper',
        chunks: 'all',
        priority: 20,
      },
      // Third-party libraries
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
      },
    },
  },
}
```

### Manifest Configuration for Shared Chunks

Ensure your manifest references shared chunks correctly:

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

## Image Optimization {#image-optimization}

Images often comprise the majority of an extension's size. Optimize aggressively. While code can be compressed and tree-shaken, images are often left untouched despite being optimizable. A few hundred kilobytes here and there quickly add up.

### Convert to WebP/AVIF

Use modern formats that offer superior compression. WebP provides 25-35% smaller files than JPEG with equivalent quality. AVIF goes even further, achieving 50% smaller files in many cases, though with longer encoding times:

```javascript
// Image optimization with sharp (Node.js)
import sharp from 'sharp';

const sizes = [16, 32, 48, 128];

async function optimizeIcons() {
  for (const size of sizes) {
    // Convert PNG to WebP
    await sharp(`icons/icon-${size}.png`)
      .webp({ quality: 80 })
      .toFile(`dist/icons/icon-${size}.webp`);
    
    // Optionally also create AVIF for modern browsers
    await sharp(`icons/icon-${size}.png`)
      .avif({ quality: 65 })
      .toFile(`dist/icons/icon-${size}.avif`);
  }
}

optimizeIcons();
```

### Responsive Images with Picture Element

Serve different sizes based on user device capabilities:

```html
<picture>
  <source srcset="icons/icon-128.avif" type="image/avif">
  <source srcset="icons/icon-128.webp" type="image/webp">
  <img src="icons/icon-128.png" alt="Extension Icon" width="128" height="128">
</picture>
```

### Use SVG Whenever Possible

SVGs are resolution-independent and typically much smaller than raster images. They scale perfectly at any size without pixelation:

```xml
<!-- icons/bookmark.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
</svg>
```

Optimize SVGs by removing unnecessary metadata:

```bash
# Using svgo to optimize SVG files
npx svgo --multipass --config .svgo.yml icons/
```

### Lazy Load Large Images

Never bundle images that appear only in modals or rarely-used views. Load them only when needed:

```javascript
// Lazy load hero images in popup
async function loadHeroImage() {
  const img = document.createElement('img');
  img.src = '../assets/hero-image.png';
  img.loading = 'lazy';
  document.querySelector('.hero').appendChild(img);
}
```

### Image Sprites for Icons

For small icons used frequently, combine them into a single sprite sheet:

```css
/* Use CSS sprites to reduce HTTP requests */
.icon-home {
  background-image: url('../images/sprite.svg');
  background-position: 0 0;
  width: 24px;
  height: 24px;
}

.icon-settings {
  background-image: url('../images/sprite.svg');
  background-position: -24px 0;
  width: 24px;
  height: 24px;
}
```

### Compression Tools and Pipelines

Set up automated image optimization in your build pipeline:

```javascript
// build-optimize-images.js
import sharp from 'sharp';
import glob from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';

async function optimizeImages() {
  const images = await glob('src/assets/**/*.{png,jpg,jpeg}');
  
  await fs.ensureDir('dist/assets');
  
  for (const imagePath of images) {
    const outputPath = path.join(
      'dist/assets',
      path.basename(imagePath).replace(/\.(png|jpg|jpeg)$/, '.webp')
    );
    
    await sharp(imagePath)
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPath);
    
    console.log(`Optimized: ${imagePath} -> ${outputPath}`);
  }
}

optimizeImages();
```

### Fallback Strategies

Support older browsers while still benefiting from modern formats:

```javascript
// Determine best image format at runtime
function getBestImageFormat() {
  const avif = document.createElement('img');
  return avif.canPlayType('image/avif') ? 'avif' 
       : avif.canPlayType('image/webp') ? 'webp' 
       : 'png';
}

const format = getBestImageFormat();
const iconUrl = `icons/icon-128.${format}`;
```

## Font Subsetting {#font-subsetting}

Custom fonts can add 50-500KB to your bundle. Subsetting removes unused characters. If your extension uses fonts only for UI text in English, there's no reason to include Chinese characters, Cyrillic, or other glyphs you'll never display. Font subsetting can reduce a 200KB font file to 30KB or less while retaining all needed characters.

### Understanding Font File Sizes

Full font files include glyphs for many writing systems:

| Font | Format | Full Size | Subset Size | Savings |
|------|--------|-----------|--------------|---------|
| Inter | WOFF2 | 200KB | 25KB | 87% |
| Roboto | WOFF2 | 170KB | 20KB | 88% |
| Noto Sans | WOFF2 | 450KB | 35KB | 92% |

### Using fonttools

```bash
# Install fonttools
pip install fonttools brotli

# Subset to common characters only
pyftsubset Inter-Regular.ttf \
  --unicodes=U+0020-007F,U+00A0-00FF,U+2000-206F \
  --output-file=Inter-subset.ttf
```

For extensions supporting multiple languages, create separate subsets:

```bash
# English only (ASCII + Latin-1 Supplement)
pyftsubset Inter-Regular.ttf \
  --unicodes=U+0020-007F,U+00A0-00FF \
  --output-file=Inter-english.ttf

# English + Cyrillic
pyftsubset Inter-Regular.ttf \
  --unicodes=U+0020-007F,U+0400-04FF \
  --output-file=Inter-cyrillic.ttf

# English + CJK (Chinese, Japanese, Korean)
pyftsubset Inter-Regular.ttf \
  --unicodes=U+0020-007F,U+4E00-9FFF,U+3040-309F,U+30A0-30FF \
  --output-file=Inter-cjk.ttf
```

### Automating Subsetting in Build

Integrate font subsetting into your build process:

```javascript
// build-subset-fonts.js
import { execSync } from 'child_process';
import glob from 'fast-glob';
import fs from 'fs-extra';

async function subsetFonts() {
  const fonts = await glob('src/fonts/*.ttf');
  
  for (const font of fonts) {
    const basename = font.replace('src/fonts/', '').replace('.ttf', '');
    
    // Generate multiple subsets based on usage
    const subsets = [
      { name: 'english', range: 'U+0020-007F,U+00A0-00FF' },
      { name: 'extended', range: 'U+0020-007F,U+00A0-00FF,U+0100-017F,U+0180-024F' },
    ];
    
    for (const subset of subsets) {
      const output = `dist/fonts/${basename}-${subset.name}.woff2`;
      execSync(
        `pyftsubset "${font}" --unicodes=${subset.range} --output-file="${output}" --format=woff2`,
        { stdio: 'inherit' }
      );
    }
  }
}

subsetFonts();
```

### WOFF2 Compression

Compress fonts for maximum savings. WOFF2 uses Brotli compression and provides the best compression ratios:

```bash
# Compress with brotli
brotli Inter-subset.ttf -o Inter-subset.woff2

# Or use fonttools
pyftsubset Inter-subset.ttf --format=woff2 --output-file=Inter-subset.woff2
```

### CSS Font Display

Ensure fonts don't block rendering. The `font-display` property controls how fonts render while loading:

```css
@font-face {
  font-family: 'Inter';
  src: url('../fonts/Inter-subset.woff2') format('woff2');
  font-display: swap;
}
```

The `swap` value shows fallback text immediately, then swaps to the custom font once loaded. This prevents invisible text during load. Other options include `block` (short block period, infinite swap), `optional` (browser decides), and `fallback` (shorter blocking than swap).

### Loading Fonts Dynamically

For extensions with multiple language support, load fonts on demand:

```javascript
async function loadFontForLanguage(locale) {
  const fontMap = {
    en: 'Inter-english.woff2',
    ru: 'Inter-cyrillic.woff2',
    ja: 'Inter-japanese.woff2',
    zh: 'Inter-cjk.woff2',
  };
  
  const fontFile = fontMap[locale] || fontMap.en;
  
  const font = new FontFace('Inter', `url(../fonts/${fontFile})`);
  await font.load();
  document.fonts.add(font);
}
```

## WASM vs JavaScript Performance Tradeoffs {#wasm-vs-js}

WebAssembly offers performance benefits for specific use cases, but consider the tradeoffs carefully. While WASM can provide significant performance improvements for certain workloads, it's not always the right choice for Chrome extensions where bundle size and initial load time are critical.

### When WASM Makes Sense

WebAssembly excels in specific scenarios that justify its overhead:

- **Heavy mathematical computations**: Cryptography, image processing, data compression, and complex calculations where JavaScript's number handling creates bottlenecks
- **Data parsing of large datasets**: Processing large JSON files, binary protocols, or streaming data where parsing performance matters
- **Existing C/C++/Rust libraries**: Porting mature libraries that would be difficult to reimplement in JavaScript, such as regex engines or video codecs
- **Game engines and graphics**: WebGL-heavy applications that need near-native performance

```javascript
// Using a WASM image processor
import init, { processImage, applyFilter } from './pkg/image_processor.js';

await init();
// Process a large image buffer
const result = processImage(imageData, { width, height });
const filtered = applyFilter(result, 'blur');
```

### When Stick with JavaScript

For most extension use cases, JavaScript is the better choice:

- **Tree-shaking benefits**: JavaScript bundles can be tree-shaken; WASM modules cannot be tree-shaken, meaning you get all or nothing
- **Initial parsing overhead**: WASM must be compiled before execution, adding startup latency
- **Better debugging**: JavaScript provides superior debugging, source maps work better, and errors are easier to trace
- **Integration complexity**: WASM requires additional setup and glue code, complicating the build process
- **Size overhead**: Even small WASM modules include runtime overhead

For most extensions, well-optimized JavaScript outperforms WASM due to tree-shaking benefits and lower startup overhead. Only consider WASM when you have measurable performance requirements that JavaScript cannot meet.

### Comparing Bundle Sizes

| Implementation | Bundle Size | Parse Time | Execution |
|----------------|-------------|------------|-----------|
| JS (lodash-es) | 70KB | 2ms | 5ms |
| WASM (tinygo) | 45KB | 15ms | 3ms |
| JS (optimized) | 12KB | 1ms | 4ms |

The pure JavaScript solution with proper optimization often beats WASM for real-world extensions because the tree-shaking savings outweigh raw execution speed differences.

### Hybrid Approaches

Some extensions use both JavaScript and WASM strategically:

```javascript
// Use JS for most code, WASM for specific hot paths
import { fastHash } from './utils/hashing.js'; // JavaScript
import init, { compressData } from './wasm/compressor.js'; // WASM

await init();

function processUserData(data) {
  // JavaScript for most processing
  const normalized = normalizeData(data);
  const hashed = fastHash(normalized.id);
  
  // WASM for heavy compression
  const compressed = compressData(normalized.payload);
  
  return { hashed, compressed };
}
```

## Analyzing Bundle Composition {#analyzing-bundle}

Understanding what's in your bundle is the first step to optimization:

### Using Source Map Explorer

```bash
# Install and run
npx source-map-explorer dist/**/*.js
```

### Webpack Bundle Analyzer

```javascript
// webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
    }),
  ],
};
```

### Identifying Large Dependencies

Analyze which packages contribute most to bundle size:

```bash
# List large node_modules
npx du -sh node_modules/* | sort -rh | head -20
```

## CI Size Budgets {#ci-size-budgets}

Automate size checks in your continuous integration to prevent regressions. Size creep happens gradually—one small dependency here, an additional icon there—and before you know it, your extension has doubled in size. CI enforcement catches these issues before they reach users.

### GitHub Actions Size Check

```yaml
# .github/workflows/size-check.yml
name: Bundle Size Check

on: [push, pull_request]

jobs:
  size-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build extension
        run: npm run build
        
      - name: Check bundle size
        run: |
          SIZE=$(du -s dist | cut -f1)
          MAX_SIZE=5000  # 5MB in KB
          
          if [ "$SIZE" -gt "$MAX_SIZE" ]; then
            echo "Bundle size $SIZE KB exceeds limit of $MAX_SIZE KB"
            exit 1
          fi
          echo "Bundle size: $SIZE KB (within limit)"
```

### Enforcing Per-Context Limits

Different contexts have different budgets. Enforce them individually:

```yaml
# .github/workflows/size-limits.yml
- name: Check individual bundle sizes
  run: |
    # Background script: max 100KB
    BG_SIZE=$(du -k dist/background.js | cut -f1)
    if [ "$BG_SIZE" -gt 100 ]; then
      echo "Background script ($BG_SIZE KB) exceeds 100KB limit"
      exit 1
    fi
    
    # Popup: max 200KB
    POPUP_SIZE=$(du -k dist/popup.js | cut -f1)
    if [ "$POPUP_SIZE" -gt 200 ]; then
      echo "Popup ($POPUP_SIZE KB) exceeds 200KB limit"
      exit 1
    fi
    
    # Content script: max 50KB
    CONTENT_SIZE=$(du -k dist/content.js | cut -f1)
    if [ "$CONTENT_SIZE" -gt 50 ]; then
      echo "Content script ($CONTENT_SIZE KB) exceeds 50KB limit"
      exit 1
    fi
    
    echo "All bundle sizes within limits"
```

### Using bundle-size Action

GitHub provides a bundle-size action for tracking changes over time:

{% raw %}
```yaml
# .github/workflows/bundle-size.yml
- name: Measure bundle size
  uses: chromatic-cli/bundle-size-action@v1
  with:
    repo-token: ${{ secrets.GITHUB_TOKEN }}
    build-script: 'npm run build'
```
{% endraw %}

### Slack Notifications for Size Warnings

Alert your team when bundles approach limits:

{% raw %}
```yaml
# .github/workflows/size-alert.yml
- name: Check size and notify
  run: |
    SIZE=$(du -k dist | cut -f1)
    WARN_LIMIT=4000  # Warn at 4MB
    HARD_LIMIT=5000  # Fail at 5MB
    
    if [ "$SIZE" -gt "$WARN_LIMIT" ]; then
      curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
        -d "{\"text\": \"⚠️ Extension bundle size warning: ${SIZE}KB (limit: ${HARD_LIMIT}KB)\"}"
    fi
```
{% endraw %}

### Setting Size Budgets in Build Tools

Webpack and other bundlers can warn or fail on size exceedances:

```javascript
// webpack.config.js
module.exports = {
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,  // 500KB
    maxAssetSize: 256000,       // 250KB per individual file
  },
};
```

Set different limits for different contexts:

```javascript
// webpack.config.js
module.exports = {
  // ... other config
  performance: {
    hints: (entrypoint) => {
      const limits = {
        'popup': 200 * 1024,      // 200KB
        'background': 100 * 1024, // 100KB
        'content': 50 * 1024,     // 50KB
      };
      
      const size = entrypoint?.getFiles()?.[0]?.size || 0;
      const name = entrypoint?.name || '';
      
      for (const [key, limit] of Object.entries(limits)) {
        if (name.includes(key) && size > limit) {
          return 'error';
        }
      }
      return 'warning';
    },
  },
};
```

### Tracking Size Over Time

Maintain a historical record of bundle sizes to identify trends:

{% raw %}
```yaml
# .github/workflows/size-trend.yml
- name: Record bundle size
  run: |
    SIZE=$(du -k dist | cut -f1)
    echo "${{ github.sha }},$SIZE" >> sizes.csv
    
    # Create issue if size increased by more than 10%
    python3 << 'EOF'
    import csv
    with open('sizes.csv') as f:
      sizes = list(csv.reader(f))
    if len(sizes) >= 2:
      current = int(sizes[-1][1])
      previous = int(sizes[-2][1])
      increase = (current - previous) / previous
      if increase > 0.1:
        print(f"::warning::Bundle size increased by {increase*100:.1f}%")
    EOF
```
{% endraw %}

## Best Practices Checklist

Use this checklist when optimizing your extension:

- [ ] Configure build tool for Chrome target
- [ ] Enable tree-shaking with ES modules
- [ ] Use dynamic imports for optional features
- [ ] Set up shared chunks for common code
- [ ] Convert images to WebP/AVIF
- [ ] Subset or remove custom fonts
- [ ] Analyze bundle composition
- [ ] Set CI size budgets
- [ ] Test in Chrome with throttling
- [ ] Monitor Web Store upload size

---

## Related Guides

Continue learning about extension performance with these related guides:

- [Chrome Extension Performance Best Practices](/docs/guides/chrome-extension-performance-best-practices/) - Comprehensive performance optimization techniques
- [Chrome Extension Performance Optimization](/docs/guides/chrome-extension-performance-optimization/) - Advanced optimization strategies
- [Building Extensions with React](/docs/guides/building-extension-with-react/) - Framework-specific performance tips
- [WXT Framework Setup](/docs/guides/wxt-framework-setup/) - Modern build tooling for extensions
- [Plasmo Framework Setup](/docs/guides/plasmo-framework-setup/) - Another popular extension framework
- [ESBuild Extension Setup](/docs/guides/esbuild-extension-setup/) - Fast builds with ESBuild

---

*This guide is part of the Chrome Extension Guide by theluckystrike. For more tutorials and resources, visit [zovo.one](https://zovo.one).*
