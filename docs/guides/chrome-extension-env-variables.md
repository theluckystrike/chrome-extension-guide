---
layout: default
title: "Chrome Extension Environment Variables — Developer Guide"
description: "Learn Chrome extension environment variables with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-env-variables/"
---
# Environment Variables in Chrome Extensions

Chrome extensions run in a browser context where Node.js APIs like `process.env` are unavailable. Unlike traditional web applications, extensions cannot read `.env` files at runtime. This guide covers the patterns for managing configuration and environment variables throughout the extension development lifecycle.

## Table of Contents {#table-of-contents}

- [The Core Challenge](#the-core-challenge)
- [Build-Time Injection](#build-time-injection)
- [Vite Configuration](#vite-configuration)
- [Webpack Configuration](#webpack-configuration)
- [Conditional Code Paths](#conditional-code-paths)
- [Multiple Environments](#multiple-environments)
- [API Key Management](#api-key-management)
- [Runtime Configuration](#runtime-configuration)
- [Extension ID Differences](#extension-id-differences)
- [CI/CD Integration](#cicd-integration)

---

## The Core Challenge {#the-core-challenge}

Extensions load in the browser with no access to Node.js runtime:

```javascript
// This will NOT work in extension contexts
console.log(process.env.API_KEY); // undefined
```

You must inject environment variables at build time, or read them from storage at runtime. Build-time injection is preferred for values that are constant across all users.

---

## Build-Time Injection {#build-time-injection}

### Vite: Using define {#vite-using-define}

Vite provides the `define` option to replace strings at build time:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import chromeExtension from 'vite-plugin-chrome-extension';

export default defineConfig({
  plugins: [chromeExtension()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL),
    'import.meta.env.VITE_API_KEY': JSON.stringify(process.env.VITE_API_KEY),
    'import.meta.env.DEV': JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
```

### Vite: Using .env Files {#vite-using-env-files}

Vite automatically loads variables from `.env` files prefixed with `VITE_`:

```bash
# .env.development
VITE_API_URL=http://localhost:3000
VITE_DEBUG=true
```

```javascript
// Any extension script
if (import.meta.env.VITE_DEBUG) {
  console.log('[Dev] Debug logging enabled');
}
```

### Webpack: DefinePlugin {#webpack-defineplugin}

Webpack's DefinePlugin replaces global constants:

```javascript
// webpack.config.js
const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
      'process.env.DEBUG': JSON.stringify(process.env.NODE_ENV === 'development'),
    }),
  ],
};
```

### Rollup: @rollup/plugin-replace {#rollup-rollupplugin-replace}

```javascript
// rollup.config.js
import replace from '@rollup/plugin-replace';

export default {
  plugins: [
    replace({
      preventAssignment: true,
      'process.env.API_URL': JSON.stringify(process.env.API_URL),
    }),
  ],
};
```

---

## Conditional Code Paths {#conditional-code-paths}

Use environment flags to include or exclude code based on the build:

```javascript
// Development-only logging
if (import.meta.env.DEV || process.env.NODE_ENV === 'development') {
  console.log('[Extension] Initialized with config:', config);
}

// Production-only feature flags
const FEATURE_PREMIUM = import.meta.env.VITE_ENABLE_PREMIUM === 'true';

if (FEATURE_PREMIUM) {
  // Load premium features only in production builds
}
```

---

## Multiple Environments {#multiple-environments}

Create separate `.env` files for each environment:

```
.env              # Shared defaults
.env.development  # Local dev (loaded by default with vite)
.env.staging      # Staging builds
.env.production   # Production builds
```

```bash
# Build for specific environment
VITE_API_URL=https://staging.api.com vite build
```

---

## API Key Management {#api-key-management}

**Never commit API keys to version control.**

1. Add `.env` to `.gitignore`:

```
.env
.env.local
.env.*.local
```

2. Create `.env.example` with placeholder values:

```
# .env.example
VITE_API_KEY=your_api_key_here
VITE_API_URL=https://api.example.com
```

3. Document required variables in your README or CONTRIBUTING guide.

---

## Runtime Configuration {#runtime-configuration}

For user-specific or sensitive values, use the options page:

```javascript
// options.js - save user-provided API key
document.getElementById('save-btn').addEventListener('click', () => {
  const apiKey = document.getElementById('api-key').value;
  chrome.storage.local.set({ userApiKey: apiKey });
});
```

```javascript
// background.js - read at runtime
async function getApiKey() {
  const { userApiKey } = await chrome.storage.local.get('userApiKey');
  return userApiKey || import.meta.env.VITE_API_KEY; // Fallback to build-time key
}
```

---

## Extension ID Differences {#extension-id-differences}

The extension ID changes between development (unpacked) and production (Chrome Web Store):

```javascript
// Get current extension ID
const extensionId = chrome.runtime.id;

// Dev: "abcdefghijklmnopqrstuvwxyz123456"
// Prod: "a1b2c3d4e5f6g7h8i9j0"
```

Handle different IDs in your configuration:

```javascript
const isDev = chrome.runtime.id.length < 32; // Dev IDs are longer
const redirectUri = isDev
  ? 'http://localhost:3000/callback'
  : 'https://your-app.com/callback';
```

---

## CI/CD Integration {#cicd-integration}

Inject secrets from CI environment variables:

{% raw %}
```yaml
{% raw %}
# GitHub Actions example
- name: Build Extension
  env:
    VITE_API_KEY: ${{ secrets.API_KEY }}
    VITE_API_URL: ${{ secrets.API_URL }}
  run: npm run build
{% endraw %}
```
{% endraw %}

```yaml
# Netlify example
[build.environment]
  VITE_API_KEY = "@my-api-key-secret"
```

---

## See Also {#see-also}

- [Vite Extension Setup Guide](./vite-extension-setup.md)
- [Webpack Extension Setup Guide](./webpack-extension-setup.md)
- [CI/CD Pipeline Guide](./ci-cd-pipeline.md)

## Related Articles {#related-articles}

## Related Articles

- [Monorepo Setup](../guides/chrome-extension-monorepo.md)
- [Linting & Code Quality](../guides/linting-code-quality.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
