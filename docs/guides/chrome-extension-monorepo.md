---
layout: default
title: "Chrome Extension Monorepo Setup — Developer Guide"
description: "Learn Chrome extension monorepo setup with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-monorepo/"
---
# Chrome Extension Monorepo

Monorepo architecture organizes multiple projects in a single repository. For Chrome extensions, this approach becomes valuable when building complex systems with shared code, multiple extensions, or accompanying web applications. This guide covers when to use monorepos, tooling options, package structures, and practical patterns for scaling extension development.

## Table of Contents {#table-of-contents}

- [When to Use a Monorepo](#when-to-use-a-monorepo)
- [Monorepo Tools Comparison](#monorepo-tools-comparison)
- [Package Structure](#package-structure)
- [Shared Code Patterns](#shared-code-patterns)
- [Build Orchestration](#build-orchestration)
- [TypeScript Project References](#typescript-project-references)
- [Versioning Strategies](#versioning-strateges)
- [CI/CD for Monorepos](#cicd-for-monorepos)
- [Testing in Monorepos](#testing-in-monorepos)
- [Development Workflow](#development-workflow)
- [Publishing](#publishing)
- [Common Pitfalls](#common-pitfalls)

---

## When to Use a Monorepo {#when-to-use-a-monorepo}

Monorepos provide the most value in specific scenarios that justify their added complexity. Understanding when to adopt this architecture prevents over-engineering while ensuring you capture the benefits when they matter.

### Extension Plus Website {#extension-plus-website}

When your Chrome extension ships with a companion web application, a monorepo keeps both projects in sync. The shared authentication logic, user preferences, and API clients can be maintained in a single `packages/` directory. Developers working on either project see changes immediately without publishing npm packages or copying files.

```
packages/
├── extension/     # Chrome extension
├── web/           # Companion web app
└── shared/       # Shared code
```

This structure eliminates version drift between the extension and website. When you update the API client in `shared/`, both the extension and website use the same code on their next build.

### Multiple Extensions Sharing Code {#multiple-extensions-sharing-code}

Organizations often maintain several extensions with overlapping functionality. A CRM platform might offer separate extensions for Gmail, Outlook, and Salesforce, all sharing authentication, API clients, and UI components. Without a monorepo, teams either duplicate code across repositories or maintain complex npm package workflows with multiple version releases.

Monorepos solve this by placing all extensions in one repository with shared packages. A UI component library built once works across all extensions. Bug fixes propagate immediately rather than requiring coordinated npm publishes.

### Extension Plus Backend Services {#extension-plus-backend-services}

Extensions that communicate with custom backend services benefit from monorepo organization when the backend also lives in the same repository. This approach works well for teams practicing trunk-based development where backend and frontend engineers collaborate closely.

The extension, backend services, and shared types live together. Protocol buffer definitions or TypeScript interfaces stay synchronized automatically. CI/CD pipelines build and test everything together.

### When Not to Use a Monorepo {#when-not-to-use-a-monorepo}

Single extensions with no companion projects should not use monorepo architecture. The overhead of managing multiple packages, build orchestration, and tooling exceeds the benefits for simple projects.

Teams without experience managing monorepos should start with standard repository structures. The complexity of build pipelines, dependency management, and tooling configuration requires upfront learning investment.

---

## Monorepo Tools Comparison {#monorepo-tools-comparison}

Each monorepo tool offers different tradeoffs between features, complexity, and ecosystem integration. Choosing the right tool depends on your team's experience and project requirements.

### npm Workspaces {#npm-workspaces}

npm workspaces provide the simplest monorepo solution by leveraging npm's native package management. No additional tooling is required beyond npm 7 or later. Your `package.json` declares workspace children, and npm handles dependency hoisting automatically.

```json
{
  "name": "extension-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ]
}
```

The main limitation is the lack of build orchestration. Running build commands across multiple packages requires custom scripts or tools like npm-run-all. There is no built-in affected-package detection for CI/CD.

### pnpm Workspaces {#pnpm-workspaces}

pnpm workspaces offer similar simplicity to npm workspaces but with stricter dependency handling. pnpm's hard linking and symlink structure prevents accidental access to transitive dependencies, improving consistency across packages.

```json
{
  "name": "extension-monorepo",
  "private": true,
  "packages": [
    "packages/*"
  ]
}
```

pnpm's `pnpm -r` command runs scripts recursively across packages, providing basic orchestration without additional tools. The workspace protocol `workspace:*` ensures packages always resolve to local versions rather than npm registry copies.

### Turborepo {#turborepo}

Turborepo adds intelligent build orchestration on top of existing package managers. It caches build outputs, runs tasks in parallel, and determines which packages need rebuilding based on file changes. This dramatically speeds up CI/CD pipelines in large monorepos.

```json
{
  "name": "extension-monorepo",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

The learning curve is moderate, but the performance benefits for large projects justify the investment. Turborepo handles task scheduling, caching, and remote execution for distributed builds.

### Nx {#nx}

Nx provides the most comprehensive monorepo tooling with built-in testing, linting, and deployment capabilities. It offers sophisticated affected detection, distributed caching, and plugin ecosystems for most frameworks and tools.

```json
{
  "projects": {
    "extension": {
      "root": "packages/extension",
      "targets": { "build": {}, "test": {} }
    },
    "shared": {
      "root": "packages/shared",
      "targets": { "build": {} }
    }
  }
}
```

Nx's complexity suits large teams with complex build requirements. For Chrome extension projects, the full feature set is often overkill, but Nx's Google-backed stability attracts teams building mission-critical browser tools.

---

## Package Structure {#package-structure}

A well-organized package structure separates concerns while keeping related code together. The specific structure depends on your project but typically follows predictable patterns.

### Recommended Directory Layout {#recommended-directory-layout}

```
my-extension-monorepo/
├── packages/
│   ├── extension/          # Main Chrome extension
│   │   ├── src/
│   │   │   ├── background/
│   │   │   ├── popup/
│   │   │   ├── options/
│   │   │   ├── content/
│   │   │   └── shared/    # Extension-specific shared code
│   │   ├── manifest.json
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared/            # Pure utilities, no extension dependencies
│   │   ├── src/
│   │   │   ├── utils/
│     │   │   ├── types/
│   │   │   └── api-client/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                # Shared UI component library
│   │   ├── src/
│   │   │   ├── button/
│   │   │   ├── modal/
│   │   │   └── components/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                # Companion website (optional)
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── package.json            # Root package.json
├── pnpm-workspace.yaml     # or npm workspaces config
├── turbo.json              # or nx.json
├── tsconfig.base.json      # Base TypeScript config
└── .eslintrc.base.json    # Base ESLint config
```

### Package Responsibilities {#package-responsibilities}

Each package should have a clear, single responsibility. The `shared/` package contains pure TypeScript code with no Chrome APIs, browser dependencies, or framework-specific code. This makes it usable anywhere: extension, website, backend, or even Node.js scripts.

The `ui/` package contains components used across extensions and websites. These components should be framework-agnostic or use a shared framework version. React components built for the extension popup should also work in the companion website without modification.

The `extension/` package brings everything together. It depends on `shared/` for utilities, `ui/` for components, and potentially `web/` types. The extension's build process outputs a distribution folder ready for Chrome loading.

### Extension Package Structure {#extension-package-structure}

Inside the extension package, organize code by feature rather than by file type:

```
packages/extension/
├── src/
│   ├── background/
│   │   ├── index.ts
│   │   ├── messages.ts
│   │   └── services/
│   │
│   ├── popup/
│   │   ├── Popup.tsx
│   │   ├── components/
│   │   └── hooks/
│   │
│   ├── features/
│   │   ├── capture/
│   │   ├── sync/
│   │   └── analytics/
│   │
│   ├── shared/            # Re-exported from packages/shared
│   │
│   └── entrypoints/       # Extension entry points
│       ├── background.ts
│       ├── popup.ts
│       ├── content.ts
│       └── options.ts
│
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── web-ext-config.js
```

This structure groups related code together. When working on the capture feature, all relevant files reside in `src/features/capture/`, from background service logic to popup components.

---

## Shared Code Patterns {#shared-code-patterns}

Sharing code across packages requires careful boundary management. Without clear separation, packages become tightly coupled, defeating the purpose of modular architecture.

### Common Utilities {#common-utilities}

Pure TypeScript utilities belong in the `shared/` package. Functions for date formatting, string manipulation, data validation, and generic algorithms work anywhere without modification.

```typescript
// packages/shared/src/utils/date.ts
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
```

These utilities have no dependencies beyond TypeScript's standard library, making them trivial to test and maintain.

### Shared Types {#shared-types}

Type definitions for API responses, configuration objects, and domain models live in `shared/`. Both the extension and website use identical types, preventing runtime surprises from type mismatches.

```typescript
// packages/shared/src/types/api.ts
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  preferences: UserPreferences;
}

export interface SyncStatus {
  lastSyncedAt: Date | null;
  pendingChanges: number;
  isSyncing: boolean;
}
```

When backend APIs change, updating types in `shared/` immediately highlights affected code across all packages.

### UI Component Library {#ui-component-library}

Components used in both the extension popup and companion website should live in a shared UI package. This ensures consistent styling and behavior while avoiding code duplication.

```typescript
// packages/ui/src/components/Button.tsx
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  const baseStyles = 'font-medium rounded transition-colors';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  
  return (
    <button className={`${baseStyles} ${variantStyles[variant]}`} {...props}>
      {children}
    </button>
  );
}
```

Both the extension's popup and the website import `Button` from `ui/`. Changes propagate to both locations automatically.

### API Client Patterns {#api-client-patterns}

HTTP clients handling communication with backend services belong in `shared/`. The client should be configured but not bound to specific extension contexts.

```typescript
// packages/shared/src/api-client/createClient.ts
export function createApiClient(config: ApiConfig) {
  const client = axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout ?? 10000,
  });
  
  client.interceptors.request.use((req) => {
    req.headers.Authorization = `Bearer ${config.getToken()}`;
    return req;
  });
  
  return client;
}
```

Extension-specific authentication handling (reading from `chrome.storage` or handling OAuth flows) wraps the shared client in the extension package.

---

## Build Orchestration {#build-orchestration}

Building multiple packages requires understanding dependency chains. Shared packages must build before packages that depend on them. Extension packages typically build last since they depend on everything else.

### Build Order {#build-order}

Most monorepo tools handle build ordering automatically through dependency graphs. When you run `turbo run build`, Turborepo analyzes package dependencies and builds in the correct order.

For manual orchestration, npm scripts can express dependencies:

```json
// package.json
{
  "scripts": {
    "build:shared": "pnpm --filter @myorg/shared build",
    "build:ui": "pnpm --filter @myorg/ui build",
    "build:extension": "pnpm --filter @myorg/extension build",
    "build": "pnpm build:shared && pnpm build:ui && pnpm build:extension"
  }
}
```

The `&&` operator ensures sequential execution. Each package builds completely before the next begins.

### Vite Configuration for Extension {#vite-configuration-for-extension}

Extensions built with Vite require specific configuration to output files Chrome understands:

```typescript
// packages/extension/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/entrypoints/background.ts'),
        popup: resolve(__dirname, 'src/entrypoints/popup.ts'),
        options: resolve(__dirname, 'src/entrypoints/options.ts'),
        content: resolve(__dirname, 'src/entrypoints/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@myorg/shared': resolve(__dirname, '../shared/src'),
      '@myorg/ui': resolve(__dirname, '../ui/src'),
    },
  },
});
```

The alias configuration imports packages directly from source, enabling hot module replacement during development.

### Development Build Strategy {#development-build-strategy}

During development, you want fast rebuilds while editing any package. Configure your tools to watch all relevant packages:

```json
// turbo.json
{
  "task": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

Running `turbo run dev --filter=extension` starts the extension dev server while Turborepo watches dependent packages for changes.

---

## TypeScript Project References {#typescript-project-references}

TypeScript project references enable incremental builds across packages. Without them, changing a shared package triggers rebuilds of every dependent package.

### Base Configuration {#base-configuration}

Create a base TypeScript configuration shared across packages:

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true
  }
}
```

Each package extends this base and adds package-specific options.

### Package Configuration {#package-configuration}

The shared package builds first and outputs type declarations:

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": []
}
```

Dependent packages reference the shared package:

```json
// packages/extension/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../shared" },
    { "path": "../ui" }
  ]
}
```

### Incremental Builds {#incremental-builds}

With project references configured, TypeScript only rebuilds packages affected by recent changes. Running `tsc -b packages/extension` automatically builds dependencies first, then builds the extension using their output.

This dramatically improves build times in large monorepos. Changing one line in `shared/` rebuilds only `shared/` and its direct dependents, not the entire codebase.

---

## Versioning Strategies {#versioning-strategies}

Monorepo versioning determines how package versions are managed. Different strategies suit different team sizes and release cadences.

### Independent Versioning {#independent-versioning}

Each package in the monorepo maintains its own version number. You might release `shared@1.2.0` while `extension` stays at `1.0.0`. This provides maximum flexibility but requires managing many version numbers.

Tools like Changesets or lerna-changelog generate changelogs automatically by analyzing commits since the last release. This approach works well when packages have different release cycles.

### Fixed Versioning {#fixed-versioning}

All packages share the same version. Releasing version 2.0.0 bumps every package simultaneously. This simplifies version management but can be inflexible when packages need different release schedules.

Fixed versioning suits projects where all packages release together by design. The Chrome extension and its companion website might always release in lockstep.

### Independent Versioning with Fixed Core {#independent-versioning-with-fixed-core}

The most common hybrid approach uses independent versioning but keeps a core set of packages synchronized. The `shared/` and `ui/` packages version together as the "core," while experimental features in specific packages version independently.

---

## CI/CD for Monorepos {#cicd-for-monorepos}

Continuous integration in monorepos requires determining which packages changed to run only relevant tests and builds.

### Affected Package Detection {#affected-package-detection}

Turborepo's affected detection identifies packages changed since a base commit:

{% raw %}
```yaml
{% raw %}
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - id: affected
        run: |
          AFFECTED=$(pnpm turbo run build --dry-run=json | jq -r '.packages | join(" ")')
          echo "affected=$AFFECTED" >> $GITHUB_OUTPUT

      - run: pnpm turbo run build --filter=...[${{ steps.affected.outputs.affected }}]
{% endraw %}
```
{% endraw %}

The `--dry-run=json` flag outputs a JSON report of which packages would be built without actually building them. This drives conditional execution of test and build jobs.

### Parallel Job Execution {#parallel-job-execution}

CI platforms can run jobs in parallel when they don't depend on each other:

```yaml
jobs:
  test-shared:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm --filter @myorg/shared test

  test-ui:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm --filter @myorg/ui test

  test-extension:
    runs-on: ubuntu-latest
    needs: [test-shared, test-ui]
    steps:
      - run: pnpm --filter @myorg/extension test
```

The extension tests depend on shared and UI tests completing, but the shared and UI tests run simultaneously.

### Caching Build Outputs {#caching-build-outputs}

CI caching dramatically speeds up monorepo builds by reusing outputs from previous runs:

{% raw %}
```yaml
{% raw %}
- uses: actions/cache@v4
  with:
    path: |
      node_modules/.cache
      packages/*/dist
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-turbo-
{% endraw %}
```
{% endraw %}

Turborepo also supports remote caching through Vercel or self-hosted servers, enabling cache sharing across CI runners.

---

## Testing in Monorepos {#testing-in-monorepos}

Testing strategies in monorepos balance thoroughness with execution speed.

### Unit Tests {#unit-tests}

Each package runs its own unit tests. Shared utility packages test pure functions in isolation. UI components test rendering with shallow mounting.

```json
// packages/shared/package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Integration Tests {#integration-tests}

Integration tests verify packages work together correctly. The extension package tests against the built versions of shared and UI packages.

```typescript
// packages/extension/src/__tests__/api.integration.test.ts
import { createApiClient } from '@myorg/shared/api-client';

describe('API Client Integration', () => {
  it('includes auth token in requests', async () => {
    const mockGetToken = vi.fn(() => 'test-token');
    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getToken: mockGetToken,
    });

    // Test implementation
  });
});
```

### E2E Tests {#e2e-tests}

Playwright tests load the actual extension in Chrome. These tests run against the full extension build and verify real browser behavior.

```typescript
// packages/extension/e2e/popup.test.ts
import { test, expect } from '@playwright/test';

test('popup displays user profile', async ({ page }) => {
  await page.goto('chrome-extension://<id>/popup.html');
  await expect(page.locator('.user-name')).toBeVisible();
});
```

---

## Development Workflow {#development-workflow}

Efficient development in monorepos requires tooling that handles cross-package changes smoothly.

### Watch Mode Across Packages {#watch-mode-across-packages}

Configure packages to watch dependencies for changes. Vite's `--watch` mode rebuilds on file changes:

```bash
# Terminal 1: Watch shared package
cd packages/shared && pnpm watch

# Terminal 2: Watch UI package (depends on shared)
cd packages/ui && pnpm watch

# Terminal 3: Run extension dev server
cd packages/extension && pnpm dev
```

When you edit `shared/`, the UI package detects the change and rebuilds automatically.

### Hot Module Replacement {#hot-module-replacement}

Extensions using Vite support HMR during development. Changes to popup components reflect immediately without manual reload.

```typescript
// packages/extension/vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    hmr: {
      port: 5174,
    },
  },
});
```

The HMR server connects to Chrome's extension reload mechanism for instant updates.

### VS Code Workspace {#vs-code-workspace}

A VS Code workspace file configures the monorepo for optimal editing:

```json
// chrome-extension.code-workspace
{
  "folders": [
    { "path": "." },
    { "path": "packages/extension" },
    { "path": "packages/shared" },
    { "path": "packages/ui" }
  ],
  "settings": {
    "typescript.preferences.includePackageJsonAutoImports": "on",
    "typescript.updateImportsOnFileMove.enabled": "always"
  }
}
```

This enables TypeScript's auto-import feature across all packages and configures intelligent import handling when files move.

---

## Publishing {#publishing}

Monorepo publishing requires deciding which packages reach the npm registry and how.

### Publishing to npm {#publishing-to-npm}

Use the `publishConfig` field in `package.json` to control registry access:

```json
// packages/shared/package.json
{
  "name": "@myorg/shared",
  "publishConfig": {
    "access": "public",
    "registry": "https://npm.pkg.github.com"
  }
}
```

Private packages omit the `access` field or set it to `restricted`.

### Publishing the Extension {#publishing-the-extension}

The extension package never publishes to npm. Its `package.json` marks it as private:

```json
// packages/extension/package.json
{
  "name": "@myorg/extension",
  "private": true
}
```

The build output zips for Chrome Web Store submission:

```bash
cd packages/extension
pnpm build
cd dist
zip -r extension.zip *
```

### Automated Publishing {#automated-publishing}

GitHub Actions can automate publishing on tag creation:

{% raw %}
```yaml
{% raw %}
# .github/workflows/publish.yml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish-shared:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' # check affected
    steps:
      - uses: actions/checkout@v4
      - run: pnpm publish -r --filter @myorg/shared
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
{% endraw %}
```
{% endraw %}

---

## Common Pitfalls {#common-pitfalls}

Monorepos introduce complexity that can become problematic without careful attention.

### Circular Dependencies {#circular-dependencies}

Package dependencies must form a directed acyclic graph. If `shared` depends on `ui`, and `ui` depends on `shared`, builds fail or behave unpredictably.

Enforce this with tooling:

```typescript
// packages/shared/package.json - NO dependencies on other packages
{
  "dependencies": {}
}
```

The `shared` package stands alone. The `extension` package depends on both.

### Build Order Issues {#build-order-issues}

Incorrect build configurations cause missing module errors during development. Always verify that dependency packages build before dependent packages.

Turborepo's `dependsOn: ["^build"]` enforces this automatically. Manual scripts require explicit ordering.

### Conflicting Dependencies {#conflicting-dependencies}

Different package versions of the same dependency cause bugs. React 17 in one package and React 18 in another breaks hooks and context.

Use `pnpm dedupe` or configure `peerDependencies` to ensure consistent versions:

```json
// pnpm-workspace.yaml
onlyBuiltDependencies:
  - react
  - react-dom
```

### Over-Sharing {#over-sharing}

Not everything belongs in shared packages. Extension-specific code, Chrome API calls, and popup-specific components should remain in the extension package.

Create shared packages only when code genuinely serves multiple purposes. Premature abstraction adds complexity without benefit.

---

## Related Guides {#related-guides}

- [Chrome Extension Project Structure](./chrome-extension-project-structure.md) - Single-package structure fundamentals
- [CI/CD Pipeline](./ci-cd-pipeline.md) - GitHub Actions setup for extension builds
- [TypeScript Extensions](./typescript-extensions.md) - TypeScript configuration for browser extensions
- [Extension Testing with Playwright](./extension-testing-with-playwright.md) - E2E testing strategies

## Related Articles {#related-articles}

## Related Articles

- [Project Structure](../guides/chrome-extension-project-structure.md)
- [Environment Variables](../guides/chrome-extension-env-variables.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
