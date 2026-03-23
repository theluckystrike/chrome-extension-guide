---
layout: default
title: "Chrome Extension Bundle Analysis. Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/extension-bundle-analysis/"
---
# Extension Bundle Analysis

This guide covers analyzing and optimizing your Chrome extension's bundle size for better performance and user experience.

Why Bundle Size Matters {#why-bundle-size-matters}

Extension bundle size directly impacts several critical factors:

- Install Speed: Smaller extensions install faster, reducing friction for new users
- Review Time: Google's review process may be faster for leaner extensions
- Storage Quota: Users have limited disk space; smaller extensions are more appealing
- Update Bandwidth: Smaller bundles mean faster updates for existing users

The Chrome Web Store allows extension packages up to 2GB, but well-optimized extensions should aim for under 5MB for optimal performance.

Bundle Analysis Tools {#bundle-analysis-tools}

Webpack Bundle Analyzer {#webpack-bundle-analyzer}

Visualize your bundle contents as an interactive treemap:

```javascript
// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
    }),
  ],
};
```

Run with: `npx webpack --profile --json > stats.json && npx webpack-bundle-analyzer stats.json`

Rollup Plugin Visualizer {#rollup-plugin-visualizer}

For Rollup-based builds:

```javascript
// rollup.config.js
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      filename: 'bundle-stats.html',
      open: false,
      gzipSize: true,
    }),
  ],
};
```

Source Map Explorer {#source-map-explorer}

Analyze source maps to understand original source contributions:

```bash
npx source-map-explorer dist//*.js
```

Measuring Bundle Size {#measuring-bundle-size}

Total Extension Size {#total-extension-size}

```bash
Check unpacked size
du -sh dist/

Check compressed vs raw
gzip -c dist/*.js | wc -c  # Compare to sum of file sizes
```

Per-File Breakdown {#per-file-breakdown}

Generate a detailed size report:

```javascript
// analysis script
const fs = require('fs');
const path = require('path');

function analyzeBundle(dir) {
  const files = {};
  
  function walk(dir, prefix = '') {
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath, prefix + file + '/');
      } else {
        files[prefix + file] = stats.size;
      }
    });
  }
  
  walk(dir);
  
  const sorted = Object.entries(files)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
    
  console.table(sorted.map(([k, v]) => [k, (v / 1024).toFixed(2) + ' KB']));
}

analyzeBundle('./dist');
```

Common Bloat Sources {#common-bloat-sources}

1. Unused Dependencies: Importing entire libraries when only a function is needed
2. Large Libraries: moment.js (~300KB), lodash full (~70KB), full React (~100KB)
3. Unoptimized Images: PNG/JPG instead of WebP or SVG
4. Source Maps in Production: Never ship .map files to production
5. Duplicate Code: Multiple versions of the same dependency

Optimization Strategies {#optimization-strategies}

Tree Shaking {#tree-shaking}

Ensure ES modules are used throughout your codebase:

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true,
    sideEffects: true, // Check package.json "sideEffects" field
  },
};
```

Verify tree-shaking is working:

```javascript
// In your bundle, unused exports should be marked with /* unused export */
import { isEmpty } from 'lodash';

// Should be tree-shaken: /* unused export isEqual */
import { isEmpty, isEqual } from 'lodash';
```

Code Splitting by Context {#code-splitting-by-context}

Separate bundles for different extension contexts:

```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      cacheGroups: {
        popup: {
          test: /[\\/]popup[\\/]/,
          name: 'popup',
          chunks: 'all',
        },
        background: {
          test: /[\\/]background[\\/]/,
          name: 'background',
          chunks: 'all',
        },
        contentScript: {
          test: /[\\/]content[\\/]/,
          name: 'content-script',
          chunks: 'all',
        },
      },
    },
  },
};
```

Dynamic Imports {#dynamic-imports}

Lazy load features in extension pages:

```javascript
// popup.js - Only load heavy components when needed
document.getElementById('advanced-settings').addEventListener('click', async () => {
  const { AdvancedSettingsModal } = await import('./components/AdvancedSettings.js');
  new AdvancedSettingsModal().show();
});
```

Replacing Heavy Libraries {#replacing-heavy-libraries}

| Library | Replacement | Savings |
|---------|-------------|---------|
| moment.js | date-fns or dayjs | ~280KB → ~2KB |
| lodash (full) | lodash-es + tree-shaking | ~70KB → ~1KB per function |
| React (full) | Preact + preact/compat | ~100KB → ~4KB |
| Axios | fetch + small wrapper | ~15KB → ~0KB |

Date Library Migration {#example-date-library-migration}

```javascript
// Before (moment.js)
import moment from 'moment';
const formatted = moment(date).format('YYYY-MM-DD');

// After (date-fns)
import { format } from 'date-fns';
const formatted = format(new Date(date), 'yyyy-MM-dd');
```

Image Optimization {#image-optimization}

- Icons: Use SVG for all icons and UI elements
- Photos: Convert to WebP for significant size reduction
- Simple Graphics: CSS or inline SVG instead of images
- Compression: Run PNG/JPG through pngquant or imagemin

```javascript
// webpack image optimization
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpe?g)$/i,
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: { progressive: true, quality: 75 },
              optipng: { enabled: false },
              pngquant: { quality: [0.65, 0.90], speed: 4 },
            },
          },
        ],
      },
    ],
  },
};
```

Font Subsetting {#font-subsetting}

For custom fonts, create subsets including only needed characters:

```bash
Using fonttools
pyftsubset font.woff2 --unicodes=U+0-FF --layout-features=...
```

CI Size Monitoring {#ci-size-monitoring}

Using size-limit {#using-size-limit}

```json
// package.json
{
  "size-limit": [
    {
      "path": "dist/popup.js",
      "limit": "50 KB"
    },
    {
      "path": "dist/background.js",
      "limit": "100 KB"
    },
    {
      "path": "dist/*.js",
      "limit": "500 KB"
    }
  ]
}
```

Run: `npx size-limit`

Using bundlesize {#using-bundlesize}

```json
// package.json
{
  "bundlesize": [
    {
      "path": "dist/popup.js",
      "maxSize": "50kB"
    }
  ]
}
```

```yaml
GitHub Actions
- name: Check bundle size
  run: npx bundlesize
```

Best Practices Summary {#best-practices-summary}

1. Analyze bundles regularly during development
2. Set size budgets in CI to catch regressions
3. Prefer lighter alternatives to common libraries
4. Use dynamic imports for non-critical features
5. Never ship source maps or debug code to production
6. Optimize all images and consider WebP/SVG
7. Verify tree-shaking is working on each dependency

Related Guides {#related-guides}

- [Extension Size Optimization](extension-size-optimization.md) - Detailed look into size reduction techniques
- [Performance](performance.md) - Runtime performance best practices
- [Lazy Loading Patterns](lazy-loading-patterns.md) - Code splitting and lazy loading strategies

Related Articles {#related-articles}

Related Articles

- [Bundle Optimization](../patterns/bundle-optimization.md)
- [Size Optimization](../guides/extension-size-optimization.md)
-e 
---

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
