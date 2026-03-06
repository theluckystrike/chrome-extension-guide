# Code Quality and Linting for Chrome Extensions

Maintaining code quality in Chrome extensions requires tooling that understands the unique constraints of extension development: multiple execution contexts, browser API patterns, service worker limitations, and Chrome Web Store policies. This guide covers a complete linting, formatting, and CI pipeline tailored for Manifest V3 extensions.

## Table of Contents

- [ESLint Flat Config for Chrome Extensions](#eslint-flat-config-for-chrome-extensions)
- [Recommended Rules for Extension Patterns](#recommended-rules-for-extension-patterns)
- [Custom ESLint Rules](#custom-eslint-rules)
- [Prettier Configuration](#prettier-configuration)
- [Husky and lint-staged Pre-Commit Hooks](#husky-and-lint-staged-pre-commit-hooks)
- [TypeScript Strict Checks Worth Enabling](#typescript-strict-checks-worth-enabling)
- [Extension-Specific Code Smells](#extension-specific-code-smells)
- [Bundle Analysis and Dead Code Detection](#bundle-analysis-and-dead-code-detection)
- [Dependency Audit](#dependency-audit)
- [Chrome Extension Lint Tools](#chrome-extension-lint-tools)
- [CI Integration with GitHub Actions](#ci-integration-with-github-actions)
- [Pre-Publish Checklist Automation](#pre-publish-checklist-automation)

---

## ESLint Flat Config for Chrome Extensions

ESLint 9+ uses the flat config format (`eslint.config.js`). This replaces `.eslintrc.*` files with a single JavaScript module that exports an array of configuration objects.

```javascript
// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js'],
  },

  // Base config for all TypeScript files
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Background service worker context
  {
    files: ['src/background/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        chrome: 'readonly',
      },
    },
    rules: {
      // No DOM access in service workers
      'no-restricted-globals': ['error',
        'document', 'window', 'localStorage', 'sessionStorage',
        'alert', 'confirm', 'prompt', 'XMLHttpRequest',
      ],
    },
  },

  // Content script context
  {
    files: ['src/content/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
    },
    rules: {
      // Content scripts should not use eval or innerHTML
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },

  // Popup and options pages
  {
    files: ['src/popup/**/*.ts', 'src/popup/**/*.tsx', 'src/options/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
    },
  },

  // Test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
```

### Installation

```bash
npm install -D eslint @eslint/js typescript-eslint globals
```

---

## Recommended Rules for Extension Patterns

Beyond the defaults, these rules catch common extension bugs.

```javascript
// Additional rules block in eslint.config.js
{
  files: ['src/**/*.ts'],
  rules: {
    // Prevent forgotten console.log in production code
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Chrome APIs return promises in MV3 -- must be awaited
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',

    // Prevent async functions where sync is expected (event listeners)
    '@typescript-eslint/promise-function-async': 'error',

    // Force explicit return types on exported functions
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],

    // Prevent unused variables (common in message handler params)
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],

    // Disallow any -- force proper typing of Chrome API responses
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',

    // Enforce consistent type imports
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      fixStyle: 'inline-type-imports',
    }],

    // Require switch exhaustiveness for message type handlers
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
  },
}
```

### Why `no-floating-promises` Is Critical

In MV3, nearly every Chrome API call returns a promise. A forgotten `await` means errors are silently swallowed:

```typescript
// BAD: floating promise -- error is silently lost
chrome.storage.local.set({ key: 'value' });

// GOOD: awaited -- errors surface properly
await chrome.storage.local.set({ key: 'value' });
```

---

## Custom ESLint Rules

Write custom rules for patterns specific to extension development. Place these in a local plugin.

### No innerHTML in Content Scripts

Using `innerHTML` in content scripts is a security risk (XSS via page-controlled data) and violates Chrome Web Store policy.

```javascript
// eslint-plugins/no-innerhtml-in-content.js
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow innerHTML/outerHTML in content scripts',
    },
    messages: {
      noInnerHTML:
        'Do not use {{property}} in content scripts. Use DOM APIs ' +
        '(createElement, textContent, append) or a sanitizer instead.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename ?? context.getFilename();
    if (!filename.includes('/content/')) return {};

    return {
      MemberExpression(node) {
        if (
          node.property.type === 'Identifier' &&
          ['innerHTML', 'outerHTML'].includes(node.property.name)
        ) {
          // Allow reads (getting innerHTML), flag writes
          const parent = node.parent;
          if (
            parent.type === 'AssignmentExpression' &&
            parent.left === node
          ) {
            context.report({
              node,
              messageId: 'noInnerHTML',
              data: { property: node.property.name },
            });
          }
        }
      },
    };
  },
};
```

### Require Error Handling on Chrome APIs

Chrome API calls can reject. Ensure they are wrapped in try/catch or have a `.catch()` handler.

```javascript
// eslint-plugins/require-chrome-error-handling.js
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require error handling on chrome.* API calls',
    },
    messages: {
      missingCatch:
        'Chrome API calls must have error handling. ' +
        'Wrap in try/catch or add .catch() handler.',
    },
    schema: [],
  },
  create(context) {
    return {
      AwaitExpression(node) {
        if (!isChromeApiCall(node.argument)) return;

        // Check if inside a try block
        let current = node.parent;
        while (current) {
          if (current.type === 'TryStatement') return; // Has try/catch
          current = current.parent;
        }

        context.report({ node, messageId: 'missingCatch' });
      },

      'CallExpression > MemberExpression'(node) {
        if (!isChromeApiCall(node.parent)) return;

        // Check for .catch() or .then(_, errorHandler)
        const grandparent = node.parent.parent;
        if (
          grandparent?.type === 'MemberExpression' &&
          grandparent.property.name === 'catch'
        ) {
          return; // Has .catch()
        }
      },
    };

    function isChromeApiCall(node) {
      if (node?.type !== 'CallExpression') return false;
      const text = context.sourceCode.getText(node.callee);
      return text.startsWith('chrome.');
    }
  },
};
```

### Registering Custom Rules

```javascript
// eslint.config.js (add to the config array)
import noInnerHTML from './eslint-plugins/no-innerhtml-in-content.js';
import requireChromeErrorHandling from './eslint-plugins/require-chrome-error-handling.js';

const extensionPlugin = {
  meta: { name: 'eslint-plugin-chrome-extension' },
  rules: {
    'no-innerhtml-in-content': noInnerHTML,
    'require-chrome-error-handling': requireChromeErrorHandling,
  },
};

// Then in your config array:
{
  plugins: {
    'chrome-extension': extensionPlugin,
  },
  rules: {
    'chrome-extension/no-innerhtml-in-content': 'error',
    'chrome-extension/require-chrome-error-handling': 'warn',
  },
}
```

---

## Prettier Configuration

Prettier handles formatting so ESLint can focus on logic errors.

```json
// .prettierrc
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 90,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

```text
// .prettierignore
dist/
node_modules/
*.crx
*.zip
*.pem
```

### ESLint and Prettier Integration

Use `eslint-config-prettier` to disable ESLint rules that conflict with Prettier:

```bash
npm install -D prettier eslint-config-prettier
```

```javascript
// eslint.config.js -- add at the end of the config array
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // ... other configs
  prettierConfig, // Must be last to override conflicting rules
);
```

Run formatting separately from linting:

```json
{
  "scripts": {
    "lint": "eslint src/",
    "format": "prettier --write 'src/**/*.{ts,tsx,json,css,html}'",
    "format:check": "prettier --check 'src/**/*.{ts,tsx,json,css,html}'"
  }
}
```

---

## Husky and lint-staged Pre-Commit Hooks

Catch issues before they reach the repository.

### Setup

```bash
npm install -D husky lint-staged
npx husky init
```

### Configuration

```json
// package.json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "src/**/*.{json,css,html}": [
      "prettier --write"
    ],
    "manifest.json": [
      "node scripts/validate-manifest.js"
    ]
  }
}
```

```bash
# .husky/pre-commit
npx lint-staged
```

### Manifest Validation Script

Validate `manifest.json` on every commit to catch permission and field errors early:

```javascript
// scripts/validate-manifest.js
import { readFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const errors = [];

// Required fields
if (manifest.manifest_version !== 3) {
  errors.push('manifest_version must be 3');
}
if (!manifest.name || manifest.name.length > 45) {
  errors.push('name is required and must be <= 45 characters');
}
if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  errors.push('version must be in semver format (x.y.z)');
}

// Dangerous permissions check
const dangerous = ['debugger', 'declarativeNetRequest', '<all_urls>'];
const perms = [...(manifest.permissions ?? []), ...(manifest.host_permissions ?? [])];
const found = perms.filter((p) => dangerous.includes(p));
if (found.length > 0) {
  console.warn(`WARNING: High-risk permissions detected: ${found.join(', ')}`);
}

// CSP check
if (manifest.content_security_policy?.extension_pages?.includes('unsafe-eval')) {
  errors.push('CSP must not include unsafe-eval');
}

if (errors.length > 0) {
  console.error('Manifest validation failed:');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('Manifest validation passed.');
```

---

## TypeScript Strict Checks Worth Enabling

Beyond `"strict": true`, these additional checks prevent real extension bugs.

| Flag | What It Catches |
|------|----------------|
| `noUncheckedIndexedAccess` | Unsafe `storage.get()` result access |
| `exactOptionalPropertyTypes` | Passing `undefined` vs omitting a Chrome API option |
| `noImplicitReturns` | Forgetting `return true` in `onMessage` listeners |
| `noFallthroughCasesInSwitch` | Missing `break` in message type switch statements |
| `noPropertyAccessFromIndexSignature` | Forces bracket notation for dynamic keys |

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

### Real-World Impact

**`noImplicitReturns`** catches the most common MV3 messaging bug:

```typescript
// Bug: some paths return true, others implicitly return undefined
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FETCH') {
    fetch(msg.url).then((r) => r.json()).then(sendResponse);
    return true; // Keep channel open
  }
  // noImplicitReturns error: not all code paths return a value
  // This catches the missing return for other message types
});
```

---

## Extension-Specific Code Smells

These patterns compile and lint clean but cause real problems in production extensions.

### Global State in Service Workers

Service workers are terminated after 30 seconds of inactivity. Any in-memory state is lost.

```typescript
// SMELL: global variable will be reset when service worker restarts
let requestCount = 0;

chrome.webRequest.onCompleted.addListener(() => {
  requestCount++; // Lost on restart
});

// FIX: persist state in chrome.storage
chrome.webRequest.onCompleted.addListener(async () => {
  const { requestCount = 0 } = await chrome.storage.session.get('requestCount');
  await chrome.storage.session.set({ requestCount: requestCount + 1 });
});
```

### Synchronous Listeners with Async Operations

Chrome event listeners that return a value synchronously cannot use `await` directly.

```typescript
// SMELL: async listener returns Promise<boolean>, not boolean
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  const data = await fetchData(msg.url);
  sendResponse(data); // Too late -- channel already closed
  return true; // This return is inside the promise, not the listener
});

// FIX: do not make the listener async; use .then() and return true synchronously
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FETCH') {
    fetchData(msg.url)
      .then((data) => sendResponse(data))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // Synchronous return keeps channel open
  }
});
```

### Unbounded Arrays in Storage

`chrome.storage.sync` has a 100KB total limit and 8KB per-item limit. `chrome.storage.local` defaults to 10MB.

```typescript
// SMELL: array grows without bound
async function logVisit(url: string): Promise<void> {
  const { visits = [] } = await chrome.storage.local.get('visits');
  visits.push({ url, timestamp: Date.now() });
  await chrome.storage.local.set({ visits }); // Eventually hits quota
}

// FIX: cap the array and rotate old entries
const MAX_VISITS = 1000;

async function logVisit(url: string): Promise<void> {
  const { visits = [] } = await chrome.storage.local.get('visits');
  visits.push({ url, timestamp: Date.now() });
  if (visits.length > MAX_VISITS) {
    visits.splice(0, visits.length - MAX_VISITS);
  }
  await chrome.storage.local.set({ visits });
}
```

### Other Smells to Watch For

- **`setTimeout`/`setInterval` in service workers**: Use `chrome.alarms` instead. Timers do not survive worker termination.
- **Content scripts modifying `document.cookie`**: Violates CSP and may be blocked. Use `chrome.cookies` from the background.
- **Registering duplicate listeners**: Each `chrome.runtime.onMessage.addListener` call in a re-imported module adds another listener. Guard with a flag or register only at the top level.
- **Using `fetch` without timeout**: Network requests in service workers can stall and prevent termination. Use `AbortController` with a timeout.

---

## Bundle Analysis and Dead Code Detection

### Visualize Bundle Size

```bash
npm install -D rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'bundle-stats.html',
      gzipSize: true,
      template: 'treemap',
    }),
  ],
});
```

Run `npm run build` then open `bundle-stats.html` to identify oversized dependencies.

### Dead Code Detection with knip

```bash
npm install -D knip
```

```json
// knip.json
{
  "entry": [
    "src/background/service-worker.ts",
    "src/content/injector.ts",
    "src/popup/popup.ts"
  ],
  "project": ["src/**/*.ts"],
  "ignore": ["src/types/**/*.d.ts"],
  "ignoreDependencies": ["chrome-types"]
}
```

```bash
npx knip  # Reports unused files, exports, and dependencies
```

### Extension Size Budget

Chrome Web Store has size limits and large extensions get additional review. Add a size check:

```javascript
// scripts/check-bundle-size.js
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const MAX_SIZE_MB = 5;
const distDir = 'dist';

function getDirSize(dir) {
  let size = 0;
  for (const file of readdirSync(dir, { recursive: true })) {
    const stat = statSync(join(dir, file));
    if (stat.isFile()) size += stat.size;
  }
  return size;
}

const sizeMB = getDirSize(distDir) / (1024 * 1024);
console.log(`Bundle size: ${sizeMB.toFixed(2)} MB`);

if (sizeMB > MAX_SIZE_MB) {
  console.error(`ERROR: Bundle exceeds ${MAX_SIZE_MB} MB limit`);
  process.exit(1);
}
```

---

## Dependency Audit

### npm audit

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Production-only audit (skip devDependencies)
npm audit --omit=dev
```

### Snyk Integration

```bash
npm install -D snyk
npx snyk auth
npx snyk test
```

Add to CI:

```yaml
- name: Security audit
  run: npx snyk test --severity-threshold=high
```

### Lockfile Linting

Prevent unexpected dependency changes:

```bash
npm install -D lockfile-lint
```

```json
{
  "scripts": {
    "lint:lockfile": "lockfile-lint --type npm --path package-lock.json --validate-https --allowed-hosts npm"
  }
}
```

### Extension-Specific Dependency Concerns

- **Avoid polyfills for APIs the background context does not have**: Including DOM polyfills in the service worker bundle wastes space and masks bugs.
- **Check for Node.js built-in usage**: Packages that import `fs`, `path`, or `crypto` (Node module) will fail at runtime. Use `resolve.alias` in your bundler to catch these.
- **Prefer vendoring small utilities**: A 2KB utility function does not need a 50KB npm package in your extension bundle.

---

## Chrome Extension Lint Tools

### web-ext lint (Firefox Compatibility)

If you target Firefox as well, Mozilla's `web-ext` tool validates against WebExtension standards:

```bash
npm install -D web-ext
npx web-ext lint --source-dir dist/
```

Common issues it catches:
- Deprecated APIs
- Missing manifest fields for Firefox
- Insecure CSP directives
- Temporary addon ID requirements

### Chrome Extension CLI Checks

Use the Chrome Extension CLI to validate the built extension before publishing:

```bash
# Verify the dist/ can be loaded as unpacked
# (Manual step in chrome://extensions, but automate the build check)
node -e "
  const manifest = require('./dist/manifest.json');
  const required = ['manifest_version', 'name', 'version'];
  const missing = required.filter(f => !manifest[f]);
  if (missing.length) {
    console.error('Missing required fields:', missing);
    process.exit(1);
  }
  console.log('Manifest OK:', manifest.name, manifest.version);
"
```

---

## CI Integration with GitHub Actions

A complete workflow that runs lint, type checking, build, and security audit on every push and pull request.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Lint
        run: npx eslint src/ --max-warnings 0

      - name: Type check (background)
        run: npx tsc -p tsconfig.background.json --noEmit

      - name: Type check (content)
        run: npx tsc -p tsconfig.content.json --noEmit

      - name: Type check (popup)
        run: npx tsc -p tsconfig.popup.json --noEmit

      - name: Format check
        run: npx prettier --check 'src/**/*.{ts,tsx,json,css,html}'

  build:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Build
        run: npm run build

      - name: Check bundle size
        run: node scripts/check-bundle-size.js

      - name: Validate manifest
        run: node scripts/validate-manifest.js

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-dist
          path: dist/
          retention-days: 7

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: npm audit
        run: npm audit --omit=dev --audit-level=high

      - name: Lockfile lint
        run: npx lockfile-lint --type npm --path package-lock.json --validate-https --allowed-hosts npm
```

### Branch Protection Rules

Configure GitHub branch protection to require these checks:

- `lint-and-typecheck` must pass
- `build` must pass
- `security` must pass (or set as non-blocking warning)

---

## Pre-Publish Checklist Automation

Automate the checks you run before uploading to the Chrome Web Store.

```javascript
// scripts/pre-publish.js
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const checks = [
  {
    name: 'Clean working tree',
    run: () => {
      const status = execSync('git status --porcelain').toString().trim();
      if (status) throw new Error(`Uncommitted changes:\n${status}`);
    },
  },
  {
    name: 'On main branch',
    run: () => {
      const branch = execSync('git branch --show-current').toString().trim();
      if (branch !== 'main') throw new Error(`On branch ${branch}, not main`);
    },
  },
  {
    name: 'Lint passes',
    run: () => execSync('npx eslint src/ --max-warnings 0', { stdio: 'pipe' }),
  },
  {
    name: 'Type check passes',
    run: () => execSync('npx tsc --noEmit', { stdio: 'pipe' }),
  },
  {
    name: 'Tests pass',
    run: () => execSync('npm test', { stdio: 'pipe' }),
  },
  {
    name: 'Build succeeds',
    run: () => execSync('npm run build', { stdio: 'pipe' }),
  },
  {
    name: 'Manifest version bumped',
    run: () => {
      const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
      const tag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo "0.0.0"')
        .toString().trim().replace(/^v/, '');
      if (manifest.version === tag) {
        throw new Error(`Version ${manifest.version} matches latest tag. Bump version.`);
      }
    },
  },
  {
    name: 'No TODO/FIXME in production code',
    run: () => {
      const result = execSync('grep -rn "TODO\\|FIXME" src/ || true').toString().trim();
      if (result) {
        console.warn(`  Warnings:\n${result}`);
        // Non-fatal: just warn
      }
    },
  },
  {
    name: 'Bundle size within limits',
    run: () => execSync('node scripts/check-bundle-size.js', { stdio: 'pipe' }),
  },
  {
    name: 'No .env or secrets in dist/',
    run: () => {
      const dangerous = ['.env', 'credentials.json', '.key', '.pem'];
      for (const file of dangerous) {
        if (existsSync(`dist/${file}`)) {
          throw new Error(`Secret file found in dist/: ${file}`);
        }
      }
    },
  },
  {
    name: 'Security audit clean',
    run: () => execSync('npm audit --omit=dev --audit-level=high', { stdio: 'pipe' }),
  },
];

console.log('Running pre-publish checks...\n');
let passed = 0;
let failed = 0;

for (const check of checks) {
  try {
    check.run();
    console.log(`  PASS  ${check.name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${check.name}`);
    console.error(`        ${err.message.split('\n')[0]}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('\nReady to publish.');
```

Add to `package.json`:

```json
{
  "scripts": {
    "prepublish:check": "node scripts/pre-publish.js",
    "publish:crx": "npm run prepublish:check && node scripts/upload-to-cws.js"
  }
}
```

---

## Summary

A robust code quality pipeline for Chrome extensions includes:

1. **ESLint flat config** with per-context globals and rules that prevent DOM usage in service workers.
2. **Custom ESLint rules** for extension-specific hazards like `innerHTML` in content scripts and unhandled Chrome API errors.
3. **Prettier** for consistent formatting, integrated with ESLint via `eslint-config-prettier`.
4. **Husky and lint-staged** to enforce standards on every commit, including manifest validation.
5. **TypeScript strict flags** that catch real MV3 bugs: missing returns in listeners, unsafe storage access, and optional property misuse.
6. **Awareness of extension code smells**: global state in service workers, async listeners, unbounded storage arrays, and raw timers.
7. **Bundle analysis** with rollup-plugin-visualizer and dead code detection with knip.
8. **Security auditing** via npm audit and Snyk, with lockfile validation.
9. **GitHub Actions CI** that runs lint, type check, build, and security checks on every PR.
10. **Pre-publish automation** that validates everything before uploading to the Chrome Web Store.
