# Bundle Optimization Patterns for Chrome Extensions

Chrome extensions ship as self-contained bundles downloaded by users, making bundle size a direct factor in install conversion and update speed. Unlike web apps served from CDNs, every kilobyte in an extension package is stored locally and re-downloaded on each update. This guide covers eight patterns for optimizing extension bundles, from code splitting across extension contexts to production build configuration.

> **Related guides:** For runtime performance analysis, see [Performance Profiling](performance-profiling.md). For enforcing code quality standards that support these patterns, see [Linting & Code Quality](../guides/linting-code-quality.md).

---

## Pattern 1: Code Splitting Per Extension Context

Chrome extensions run code in distinct contexts -- service workers, content scripts, popups, options pages, and side panels. Each context has different API access and lifecycle characteristics. Bundling all code into a single file wastes bytes by shipping irrelevant code to each context.

### Webpack Multi-Entry Configuration

```javascript
// webpack.config.js
const path = require("path");

module.exports = {
  entry: {
    "service-worker": "./src/service-worker.ts",
    "content-script": "./src/content-script.ts",
    popup: "./src/popup/index.tsx",
    options: "./src/options/index.tsx",
    "side-panel": "./src/side-panel/index.tsx",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  optimization: {
    splitChunks: false, // Content scripts cannot load extra chunks
  },
};
```

### Vite Multi-Entry Configuration

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        "service-worker": resolve(__dirname, "src/service-worker.ts"),
        popup: resolve(__dirname, "src/popup/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
        "side-panel": resolve(__dirname, "src/side-panel/index.html"),
        "content-script": resolve(__dirname, "src/content-script.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
      },
    },
  },
});
```

### Why Content Scripts Need Special Treatment

Content scripts are injected into web pages and cannot load additional chunks via dynamic imports or script tags. They must be self-contained single files. Configure your bundler to exclude content scripts from chunk splitting:

```javascript
// webpack.config.js — content script isolation
module.exports = {
  optimization: {
    splitChunks: {
      chunks(chunk) {
        return chunk.name !== "content-script";
      },
    },
  },
};
```

---

## Pattern 2: Tree Shaking for Chrome API Imports

Many extension utility libraries export dozens of helpers, but a given context may only use a handful. Tree shaking eliminates dead code, but only works reliably with ES module syntax.

### Ensuring Sideeffect-Free Modules

```json
// package.json
{
  "sideEffects": false
}
```

For modules that do have side effects (e.g., polyfills), declare them explicitly:

```json
{
  "sideEffects": ["./src/polyfills.ts", "*.css"]
}
```

### Writing Tree-Shakeable Chrome API Wrappers

```typescript
// src/lib/storage.ts — each function is independently importable
export function getLocal<T>(key: string): Promise<T | undefined> {
  return chrome.storage.local.get(key).then((r) => r[key] as T | undefined);
}

export function setLocal(key: string, value: unknown): Promise<void> {
  return chrome.storage.local.set({ [key]: value });
}

export function getSync<T>(key: string): Promise<T | undefined> {
  return chrome.storage.sync.get(key).then((r) => r[key] as T | undefined);
}

// Avoid: export default { getLocal, setLocal, getSync }
// Default object exports defeat tree shaking
```

### Verifying Tree Shaking Works

Use webpack's stats output or rollup's `--treeshake` flag to audit what gets included:

```bash
# Webpack — generate stats for analysis
npx webpack --profile --json=stats.json
npx webpack-bundle-analyzer stats.json

# Vite/Rollup — visualize output
npx vite build --mode production
npx rollup-plugin-visualizer
```

---

## Pattern 3: Dynamic Imports in Extension Pages

Extension pages (popup, options, side panel) run in the extension's own origin and fully support dynamic `import()`. This allows deferring heavy modules until they are actually needed.

### Route-Based Splitting in Options Page

```typescript
// src/options/index.tsx
import { lazy, Suspense } from "react";

const GeneralSettings = lazy(() => import("./tabs/GeneralSettings"));
const AdvancedSettings = lazy(() => import("./tabs/AdvancedSettings"));
const ImportExport = lazy(() => import("./tabs/ImportExport"));

function OptionsApp() {
  const [tab, setTab] = useState("general");

  return (
    <Suspense fallback={<Spinner />}>
      {tab === "general" && <GeneralSettings />}
      {tab === "advanced" && <AdvancedSettings />}
      {tab === "import-export" && <ImportExport />}
    </Suspense>
  );
}
```

### Feature-Gated Dynamic Imports

```typescript
// Load a heavy library only when the user triggers a specific feature
async function handleExportClicked() {
  const { generatePDF } = await import("./export/pdf-generator");
  const blob = await generatePDF(data);
  downloadBlob(blob, "export.pdf");
}
```

### Service Worker Caveat

Service workers support dynamic `import()` in Chrome 116+ when declared as an ES module in the manifest:

```json
{
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  }
}
```

Without `"type": "module"`, dynamic imports in the service worker will fail silently. Always test this in your target minimum Chrome version.

---

## Pattern 4: Shared Chunks Between Popup and Options

When popup and options pages share UI components or utility functions, extracting shared code into a common chunk avoids duplication.

### Webpack Shared Chunks

```javascript
// webpack.config.js
module.exports = {
  entry: {
    popup: "./src/popup/index.tsx",
    options: "./src/options/index.tsx",
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        shared: {
          name: "shared",
          chunks(chunk) {
            return ["popup", "options"].includes(chunk.name);
          },
          minChunks: 2,
          priority: 10,
        },
        vendor: {
          name: "vendor",
          test: /[\\/]node_modules[\\/]/,
          chunks(chunk) {
            return chunk.name !== "content-script";
          },
          minChunks: 2,
          priority: 20,
        },
      },
    },
  },
};
```

### HTML Template Updates

Shared chunks must be loaded in the HTML pages that reference them:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
  <head>
    <script src="vendor.js"></script>
    <script src="shared.js"></script>
    <script src="popup.js"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

### Measuring the Impact

Compare before and after sizes to verify that shared chunking actually reduces total bundle size. Duplication only matters when shared modules are large enough to justify the extra HTTP request (on extension pages, this is a local file read, so the threshold is low):

```bash
# Before shared chunks
popup.js    180 KB
options.js  210 KB
Total:      390 KB

# After shared chunks
popup.js     45 KB
options.js   75 KB
shared.js    90 KB
vendor.js    55 KB
Total:      265 KB  (32% reduction)
```

---

## Pattern 5: Asset Optimization (Images, Icons, Fonts)

Extension packages include icons, promotional images, and sometimes custom fonts. These static assets often account for a significant portion of the total package size.

### Icon Optimization

Chrome requires icons at specific sizes (16, 32, 48, 128 px). Use optimized PNGs or, for simple icons, SVG where supported:

```bash
# Optimize PNGs with pngquant
pngquant --quality=65-80 --output icons/icon-128.png icons/icon-128-original.png

# Generate all required sizes from a single high-res source
for size in 16 32 48 128; do
  npx sharp-cli resize $size $size \
    --input icons/icon-source.png \
    --output icons/icon-${size}.png
done
```

### Font Subsetting

If your extension includes custom fonts, subset them to only the characters you actually use:

```bash
# Subset a font to Latin characters only
npx glyphhanger --whitelist="U+0000-00FF" --subset=fonts/CustomFont.woff2
```

```css
/* Use the subsetted font */
@font-face {
  font-family: "CustomFont";
  src: url("fonts/CustomFont-subset.woff2") format("woff2");
  font-display: swap;
}
```

### Image Compression in Build Pipeline

```javascript
// vite.config.ts — automatic image optimization
import imagemin from "vite-plugin-imagemin";

export default defineConfig({
  plugins: [
    imagemin({
      gifsicle: { optimizationLevel: 3 },
      optipng: { optimizationLevel: 5 },
      mozjpeg: { quality: 75 },
      svgo: {
        plugins: [
          { name: "removeViewBox", active: false },
          { name: "removeDimensions", active: true },
        ],
      },
    }),
  ],
});
```

### Avoiding Unnecessary Assets

Audit your manifest for unused web-accessible resources. Every file declared in `web_accessible_resources` is included in the package even if no code references it:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["injected.css"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## Pattern 6: Monitoring Bundle Size with size-limit

Preventing bundle bloat requires automated size monitoring. The `size-limit` tool integrates with CI to fail builds when bundles exceed defined thresholds.

### Installation and Configuration

```bash
npm install -D size-limit @size-limit/file
```

```json
// package.json
{
  "size-limit": [
    {
      "name": "Service Worker",
      "path": "dist/service-worker.js",
      "limit": "50 KB"
    },
    {
      "name": "Content Script",
      "path": "dist/content-script.js",
      "limit": "30 KB"
    },
    {
      "name": "Popup Bundle",
      "path": "dist/popup.js",
      "limit": "80 KB"
    },
    {
      "name": "Total Package",
      "path": "dist/**/*.{js,css,html,json,png,woff2}",
      "limit": "500 KB"
    }
  ],
  "scripts": {
    "size": "size-limit",
    "size:check": "npm run build && size-limit"
  }
}
```

### CI Integration

```yaml
# .github/workflows/size.yml
name: Bundle Size Check
on: [pull_request]

jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### Budget Tracking Over Time

Add a script to log sizes to a JSON file for historical tracking:

```bash
#!/bin/bash
# scripts/log-size.sh
BUILD_SIZE=$(du -sb dist | cut -f1)
DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "{\"date\":\"$DATE\",\"size\":$BUILD_SIZE}" >> .size-history.json
```

---

## Pattern 7: Lazy Loading UI Components in Side Panel

Side panels persist longer than popups and can benefit from progressive loading. Load the initial view immediately, then fetch heavier components as the user navigates.

### Progressive Loading Strategy

```typescript
// src/side-panel/index.tsx
import { lazy, Suspense, useState } from "react";

// Immediate — the default view loads with the panel
import Dashboard from "./views/Dashboard";

// Deferred — loaded only when accessed
const DetailView = lazy(() => import("./views/DetailView"));
const SettingsView = lazy(() => import("./views/SettingsView"));
const HistoryView = lazy(() => import("./views/HistoryView"));

function SidePanel() {
  const [view, setView] = useState<string>("dashboard");

  return (
    <div className="side-panel">
      <Nav onNavigate={setView} />
      <Suspense fallback={<ViewSkeleton />}>
        {view === "dashboard" && <Dashboard />}
        {view === "detail" && <DetailView />}
        {view === "settings" && <SettingsView />}
        {view === "history" && <HistoryView />}
      </Suspense>
    </div>
  );
}
```

### Preloading on Hover

Anticipate navigation by preloading chunks when the user hovers over a nav item:

```typescript
function NavItem({
  label,
  loader,
  onClick,
}: {
  label: string;
  loader: () => Promise<any>;
  onClick: () => void;
}) {
  return (
    <button onMouseEnter={() => loader()} onClick={onClick}>
      {label}
    </button>
  );
}

// Usage
<NavItem
  label="History"
  loader={() => import("./views/HistoryView")}
  onClick={() => setView("history")}
/>;
```

### Skeleton Screens for Perceived Performance

```typescript
function ViewSkeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-header" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}
```

```css
.skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Pattern 8: Production Build Configuration

The final optimization step is configuring your bundler for production: minification, source map strategy, and dead code elimination.

### Webpack Production Config

```javascript
// webpack.config.prod.js
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

module.exports = {
  mode: "production",
  devtool: "hidden-source-map", // Generate maps but don't reference them in output
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Remove console.log in production
            drop_debugger: true,
            pure_funcs: ["console.debug", "console.trace"],
          },
          mangle: {
            reserved: [], // No Chrome API names to preserve
          },
        },
      }),
      new CssMinimizerPlugin(),
    ],
    usedExports: true,
  },
  plugins: [
    process.env.ANALYZE &&
      new BundleAnalyzerPlugin({ analyzerMode: "static" }),
  ].filter(Boolean),
};
```

### Vite Production Config

```typescript
// vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    sourcemap: "hidden",
    reportCompressedSize: true,
    chunkSizeWarningLimit: 100, // Warn at 100KB for extension chunks
  },
});
```

### Source Map Strategy

Extensions have a specific source map consideration: if you publish source maps inside the `.crx` package, anyone who downloads the extension can read your source code. Options:

| Strategy | `devtool` / `sourcemap` | Included in Package | Use Case |
|---|---|---|---|
| Hidden maps | `hidden-source-map` | No (upload separately) | Production with error tracking |
| No maps | `false` | No | Smallest package, no debugging |
| Inline maps | `inline-source-map` | Yes | Development only |

For production, generate hidden source maps and upload them to your error tracking service (e.g., Sentry):

```bash
# Upload source maps to Sentry, then delete them from dist
npx sentry-cli sourcemaps upload --release="$VERSION" dist/
rm dist/*.map
```

### Complete Build Script

```json
{
  "scripts": {
    "build": "webpack --config webpack.config.prod.js",
    "build:analyze": "ANALYZE=true npm run build",
    "build:measure": "npm run build && size-limit",
    "package": "npm run build && cd dist && zip -r ../extension.zip . -x '*.map'"
  }
}
```

### Environment-Specific Builds

```javascript
// webpack.config.js — conditional configuration
const isProd = process.env.NODE_ENV === "production";

module.exports = {
  mode: isProd ? "production" : "development",
  devtool: isProd ? "hidden-source-map" : "inline-source-map",
  optimization: {
    minimize: isProd,
  },
};
```

---

## Summary

| Pattern | Key Technique | Typical Savings |
|---|---|---|
| Code splitting per context | Multi-entry bundler config | 30-50% per context |
| Tree shaking | ES module exports + `sideEffects: false` | 10-40% on utility code |
| Dynamic imports | `import()` in extension pages | Faster initial load |
| Shared chunks | `splitChunks` for popup/options | 20-35% deduplication |
| Asset optimization | PNG compression, font subsetting | 40-70% on assets |
| Bundle monitoring | `size-limit` with CI checks | Prevents regression |
| Lazy loading UI | React.lazy + Suspense | Faster panel open |
| Production config | Terser + hidden source maps | 30-60% minification |

These patterns are most effective when applied together. Start with code splitting per context (Pattern 1) as the foundation, layer on tree shaking (Pattern 2) and shared chunks (Pattern 4), then add automated monitoring (Pattern 6) to prevent regressions. The production build configuration (Pattern 8) ties everything together into a release-ready pipeline.
