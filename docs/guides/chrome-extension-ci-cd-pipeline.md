---
layout: default
title: "Chrome Extension CI/CD Pipeline: Automated Testing and Publishing"
description: "Build a complete CI/CD pipeline for Chrome extensions with GitHub Actions. Automate linting, testing, building, packaging, and publishing to Chrome Web Store."
permalink: /guides/chrome-extension-ci-cd-pipeline/
---

Chrome Extension CI/CD Pipeline: Automated Testing and Publishing

Building a solid CI/CD pipeline is essential for maintaining high-quality Chrome extensions. Manual build and deployment processes are error-prone, time-consuming, and don't scale well with team growth or project complexity. This guide walks you through building a complete automated pipeline that handles everything from code quality checks to production releases on the Chrome Web Store.

Introduction: Why CI/CD Matters for Extension Development

Chrome extensions present unique challenges that make automation critical. Unlike web applications, extensions must work across multiple Chrome versions, handle various permission scenarios, and integrate with browser-specific APIs. Manual testing across these combinations becomes impractical as your extension grows.

A well-designed CI/CD pipeline provides multiple benefits that directly impact your extension's success and your team's productivity.

Consistency and Reliability: Every code change goes through the same verification process, eliminating the "it works on my machine" problems. Automated builds ensure that your extension compiles identically across all environments, whether on a developer's laptop or in the production pipeline.

Faster Iteration Cycles: Automated pipelines reduce the time from code commit to published extension. What might take hours of manual work becomes a push-to-deploy workflow, enabling you to ship bug fixes and new features rapidly.

Quality Gates: By enforcing linting, testing, and build checks before code merges, you catch issues early. This prevents broken builds from reaching users and reduces the manual review burden.

Security and Compliance: Automated pipelines can scan for security vulnerabilities, verify extension manifests, and ensure sensitive credentials never enter the codebase.

Pipeline Architecture

The complete CI/CD pipeline for Chrome extensions consists of six distinct stages, each serving a specific purpose in the development lifecycle. Understanding these stages helps you design a pipeline that matches your team's workflow and quality requirements.

Pipeline Stages Overview

```

                        CHROME EXTENSION CI/CD PIPELINE                      

                                                                              
                            
   TRIGGER     LINT      TEST     BUILD                 
                            
                                                                            
                           Pipeline Flow                                   
                                                                            
                                                       
    PUSH                                            PACKAGE                
                                                       
                                                                              
                                                                              
                                                                    
                                                       PUBLISH                
                                                                    
                                                                              

```

Trigger Events

The pipeline responds to three primary trigger events that correspond to different development workflows.

Push to Main Branch: Every commit to the main branch triggers a full pipeline run. This ensures that the HEAD of your main branch is always in a deployable state. This is the primary event for continuous integration.

Pull Request Creation and Updates: Opening or updating a pull request triggers a pipeline run that validates the proposed changes. This provides immediate feedback to developers before code review begins. PR-triggered runs typically skip the packaging and publishing stages since those are only needed for production builds.

Tag Push: Creating a version tag (e.g., `v1.2.3`) triggers the full pipeline including packaging and publishing. This semantic versioning approach aligns with Chrome Web Store update requirements and provides a clear audit trail.

Stage Details

Lint Stage: This stage catches code quality issues before they reach testing. ESLint analyzes your JavaScript and TypeScript code for syntax errors, style violations, and potential bugs. TypeScript's type checker verifies type correctness, catching impossible states and API misuse at compile time.

Test Stage: Automated tests verify that your extension behaves correctly. Unit tests check individual functions and modules in isolation. Integration tests verify that different parts of your extension work together correctly. For Chrome extensions, you also need to mock browser API responses since the actual Chrome APIs aren't available in the CI environment.

Build Stage: The build process compiles your source code into the final extension bundle. This includes transpilation, minification, tree-shaking to remove unused code, and asset optimization. The build output goes into a designated `dist` directory ready for packaging.

Package Stage: This stage creates the distributable `.zip` file required for Chrome Web Store uploads. It excludes development-only files, source maps (unless needed for debugging), and any other files that shouldn't ship with the production extension.

Publish Stage: The final stage uploads your packaged extension to the Chrome Web Store. This stage should have additional safety controls since it's the only stage that modifies your live extension listing.

GitHub Actions Setup

GitHub Actions provides an excellent foundation for extension CI/CD due to its tight integration with GitHub repositories, generous free tier for open-source projects, and extensive marketplace of pre-built actions.

Complete Workflow YAML

Create the file `.github/workflows/ci-cd.yml` in your extension repository:

{% raw %}
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  push:
    tags:
      - 'v*'

permissions:
  contents: read
  id-token: write  # Required for OIDC token generation

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint

      - name: Run TypeScript type check
        run: pnpm typecheck

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: false

  build:
    name: Production Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build extension
        run: pnpm build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: extension-build
          path: dist/
          retention-days: 7

  package:
    name: Package Extension
    runs-on: ubuntu-latest
    needs: [build]
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: extension-build
          path: dist/

      - name: Create package
        run: |
          cd dist
          zip -r ../extension.zip .

      - name: Upload package
        uses: actions/upload-artifact@v4
        with:
          name: extension-package
          path: extension.zip

  publish:
    name: Publish to Chrome Web Store
    runs-on: ubuntu-latest
    needs: [package]
    if: startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://chromewebstore.google.com/detail/${{ vars.EXTENSION_ID }}
    steps:
      - name: Download package
        uses: actions/download-artifact@v4
        with:
          name: extension-package
          path: .

      - name: Get version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Publish to Chrome Web Store
        uses: michelefavero65/chrome-webstore-upload-action@v1
        with:
          file: extension.zip
          extension-id: ${{ vars.EXTENSION_ID }}
          client-id: ${{ secrets.CWS_CLIENT_ID }}
          client-secret: ${{ secrets.CWS_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CWS_REFRESH_TOKEN }}
          publish-type: "default"
```
{% endraw %}

This workflow implements several best practices worth highlighting. The `needs` declarations create proper dependencies between jobs, ensuring that builds only proceed when earlier stages pass. Matrix testing across multiple Node versions catches version-specific issues early. The conditional `if` statements ensure that packaging and publishing only occur for tagged releases, not for every push to main.

Linting Configuration

Proper linting configuration is crucial for maintaining code quality in Chrome extension projects. Extensions have unique requirements that standard JavaScript linting rules don't address, including Chrome API types and extension-specific patterns.

ESLint Configuration for Chrome Extensions

Install the required ESLint packages:

```bash
pnpm add -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-chrome
```

Create the ESLint configuration file:

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:chrome/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'chrome'],
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // Chrome extension specific rules
    'chrome/no-naive-eslint': 'error',
    'chrome/no-unused-resources': 'warn',
    
    // General code quality
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    {
      files: ['test//*.ts', 'test//*.tsx'],
      env: {
        jest: true,
        node: true,
      },
    },
  ],
};
```

Pre-commit Hooks with Husky

Setting up Husky ensures that code quality checks run before every commit, preventing bad code from entering the repository.

Install Husky and lint-staged:

```bash
pnpm add -D husky lint-staged
```

Initialize Husky:

```bash
npx husky init
```

Configure lint-staged in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "tsc --noEmit"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

Update the Husky pre-commit hook:

```bash
echo 'npx lint-staged' > .husky/pre-commit
```

This setup ensures that every commit passes your linting and type checks, maintaining consistent code quality across all contributors.

Testing in CI

Testing Chrome extensions presents unique challenges because the Chrome APIs (chrome.storage, chrome.runtime, chrome.tabs, etc.) aren't available in the Node.js test environment. You need to mock these APIs to run meaningful tests.

Unit Testing Background Scripts with Vitest

Create a test setup file that mocks Chrome APIs:

```typescript
// test/setup/chrome-mocks.ts
import { vi } from 'vitest';

// Mock chrome.storage
const storageMock = {
  local: {
    get: vi.fn((keys, callback) => {
      if (callback) callback({});
      return Promise.resolve({});
    }),
    set: vi.fn((items, callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    remove: vi.fn((keys, callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    clear: vi.fn((callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
  },
  sync: {
    get: vi.fn((keys, callback) => {
      if (callback) callback({});
      return Promise.resolve({});
    }),
    set: vi.fn((items, callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
  },
};

// Mock chrome.runtime
const runtimeMock = {
  id: 'test-extension-id',
  getURL: vi.fn((path) => `chrome-extension://test-extension-id/${path}`),
  getManifest: vi.fn(() => ({
    manifest_version: 3,
    name: 'Test Extension',
    version: '1.0.0',
  })),
  sendMessage: vi.fn(() => Promise.resolve({})),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  onInstalled: {
    addListener: vi.fn(),
  },
};

// Mock chrome.tabs
const tabsMock = {
  query: vi.fn(() => Promise.resolve([])),
  get: vi.fn((tabId, callback) => {
    if (callback) callback(null);
    return Promise.resolve(null);
  }),
  create: vi.fn(() => Promise.resolve({ id: 1 })),
  update: vi.fn(() => Promise.resolve({})),
};

// Apply mocks globally
Object.defineProperty(global, 'chrome', {
  value: {
    storage: storageMock,
    runtime: runtimeMock,
    tabs: tabsMock,
  },
  writable: true,
});

export { storageMock, runtimeMock, tabsMock };
```

Create a test file for your background script:

```typescript
// test/background/storage-handler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageHandler } from '../../src/background/storage-handler';

describe('StorageHandler', () => {
  let storageHandler: StorageHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    storageHandler = new StorageHandler();
  });

  it('should save user preferences', async () => {
    const preferences = { theme: 'dark', notifications: true };
    
    await storageHandler.savePreferences(preferences);
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { preferences },
      expect.any(Function)
    );
  });

  it('should retrieve user preferences', async () => {
    (chrome.storage.local.get as any).mockResolvedValueOnce({
      preferences: { theme: 'light' }
    });
    
    const result = await storageHandler.getPreferences();
    
    expect(result).toEqual({ theme: 'light' });
  });

  it('should handle storage errors gracefully', async () => {
    (chrome.storage.local.get as any).mockRejectedValueOnce(
      new Error('Storage quota exceeded')
    );
    
    await expect(storageHandler.getPreferences()).rejects.toThrow(
      'Storage quota exceeded'
    );
  });
});
```

Configure Vitest in your project:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup/chrome-mocks.ts'],
    include: ['test//*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['test/', 'node_modules/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

Building for Production

The build stage transforms your source code into a production-ready extension. This involves several optimization steps that reduce bundle size and improve performance.

Build Configuration

For a typical Chrome extension built with TypeScript and a bundler like Vite, your build configuration should include:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
  },
});
```

Environment Variables

Create environment-specific build configurations:

```typescript
// src/config/index.ts
interface AppConfig {
  apiUrl: string;
  analyticsId: string;
  features: {
    beta: boolean;
    debug: boolean;
  };
}

const config: Record<string, AppConfig> = {
  development: {
    apiUrl: 'http://localhost:3000',
    analyticsId: '',
    features: {
      beta: true,
      debug: true,
    },
  },
  production: {
    apiUrl: 'https://api.your-extension.com',
    analyticsId: 'UA-XXXXX-X',
    features: {
      beta: false,
      debug: false,
    },
  },
};

export const getConfig = (): AppConfig => {
  const env = import.meta.env.MODE || 'development';
  return config[env] || config.development;
};
```

Build with specific environment:

```bash
Development build
pnpm build

Production build
NODE_ENV=production pnpm build
```

Packaging the Extension

Packaging creates the `.zip` file required for Chrome Web Store uploads. The package must exclude development files, source maps, and any other files that shouldn't ship with the production extension.

Package Script

Create a packaging script that handles version information and file exclusion:

```bash
#!/bin/bash
scripts/package.sh

set -e

DIST_DIR="dist"
PACKAGE_DIR="package"
VERSION=${1:-$(node -p "require('./package.json').version")}

echo "Packaging extension version: $VERSION"

Clean up any existing package
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

Copy distribution files
cp -r "$DIST_DIR"/* "$PACKAGE_DIR/"

Copy manifest
cp manifest.json "$PACKAGE_DIR/"

Create the zip file
cd "$PACKAGE_DIR"
zip -r "../extension-v${VERSION}.zip" . -x "*.map"

echo "Package created: extension-v${VERSION}.zip"
ls -lh "../extension-v${VERSION}.zip"
```

Exclude Patterns

Configure your bundler or use a `.zipignore` file to exclude unnecessary files:

```
.zipignore
Development files
*.map
*.ts
*.tsx
tsconfig.json
vite.config.ts
.eslintrc.js
.prettierrc

Test files
test/
__tests__/
*.test.ts
*.spec.ts
coverage/

Git
.git/
.gitignore
.gitattributes

IDE
.idea/
.vscode/
*.swp
*.swo

Node
node_modules/
npm-debug.log
yarn-error.log

Misc
.DS_Store
Thumbs.db
*.bak
*.tmp
```

Auto-Publishing to Chrome Web Store

Automating the Chrome Web Store publish process saves significant time and ensures consistent releases. However, this requires careful security handling since publishing directly affects your users.

Prerequisites

Before setting up auto-publishing, you'll need to:

1. Create a Google Cloud project with the Chrome Web Store API enabled
2. Set up OAuth credentials for the Chrome Web Store API
3. Obtain your extension's unique ID from the Chrome Web Store developer dashboard
4. Configure GitHub Secrets for your credentials

GitHub Secrets Configuration

Add the following secrets to your GitHub repository:

- `CWS_CLIENT_ID`: Your Google OAuth client ID
- `CWS_CLIENT_SECRET`: Your Google OAuth client secret
- `CWS_REFRESH_TOKEN`: OAuth refresh token for API access
- `EXTENSION_ID`: Your extension's unique identifier in the Chrome Web Store

Publish Script

Create a publish script that handles the upload:

```javascript
// scripts/publish.js
const fs = require('fs');
const path = require('path');
const { ChromeWebStore } = require('chrome-webstore-upload');

const extensionId = process.env.EXTENSION_ID;
const clientId = process.env.CWS_CLIENT_ID;
const clientSecret = process.env.CWS_CLIENT_SECRET;
const refreshToken = process.env.CWS_REFRESH_TOKEN;

async function publish() {
  if (!extensionId || !clientId || !clientSecret || !refreshToken) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const extensionZip = path.join(__dirname, '../extension.zip');
  
  if (!fs.existsSync(extensionZip)) {
    console.error('Extension package not found:', extensionZip);
    process.exit(1);
  }

  const chromeWebStore = ChromeWebStore({
    extensionId,
    clientId,
    clientSecret,
    refreshToken,
  });

  try {
    console.log('Uploading extension...');
    const uploadResponse = await chromeWebStore.uploadExisting(extensionZip);
    console.log('Upload response:', uploadResponse);

    // Check upload status
    if (uploadResponse.error) {
      console.error('Upload failed:', uploadResponse.error);
      process.exit(1);
    }

    console.log('Publishing extension...');
    const publishResponse = await chromeWebStore.publish('default');
    console.log('Publish response:', publishResponse);

    console.log('Extension published successfully!');
  } catch (error) {
    console.error('Publishing failed:', error.message);
    process.exit(1);
  }
}

publish();
```

Safety Controls

Implement multiple safety controls for publishing:

1. Tag-based releases: Only publish when a version tag is pushed, not for regular commits
2. Manual approval: Use GitHub Environments with required reviewers for production deployments
3. Staged rollout: Initially publish to a small percentage of users to catch issues

{% raw %}
```yaml
Add to your workflow for manual approval
publish:
  name: Publish to Chrome Web Store
  runs-on: ubuntu-latest
  needs: [package]
  if: startsWith(github.ref, 'refs/tags/v')
  environment:
    name: production
    url: https://chromewebstore.google.com/detail/${{ vars.EXTENSION_ID }}
    # Require manual approval before publishing
    deployment_review_required: true
```
{% endraw %}

Version Management

Proper version management ensures consistent releases and helps users understand what changed in each update.

Version Bump Script

Create a script to automate version bumps:

```javascript
// scripts/version-bump.js
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');
const manifestPath = path.join(__dirname, '../manifest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function bumpVersion(currentVersion, bumpType) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump type: ${bumpType}`);
  }
}

const bumpType = process.argv[2] || 'patch';
const packageJson = readJson(packageJsonPath);
const newVersion = bumpVersion(packageJson.version, bumpType);

console.log(`Bumping version: ${packageJson.version} -> ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
writeJson(packageJsonPath, packageJson);

// Update manifest.json
const manifest = readJson(manifestPath);
manifest.version = newVersion;
writeJson(manifestPath, manifest);

// Create git tag
const { execSync } = require('child_process');
execSync(`git add -A && git commit -m "Release v${newVersion}"`, { stdio: 'inherit' });
execSync(`git tag v${newVersion}`, { stdio: 'inherit' });

console.log(`Version bumped to ${newVersion} and tag created.`);
```

Add version scripts to `package.json`:

```json
{
  "scripts": {
    "version:major": "node scripts/version-bump.js major",
    "version:minor": "node scripts/version-bump.js minor",
    "version:patch": "node scripts/version-bump.js patch"
  }
}
```

Version Sync Workflow

The complete version sync workflow:

1. Developer runs `npm run version:patch` (or major/minor)
2. Script updates both `package.json` and `manifest.json`
3. Script creates a git commit and tag
4. Developer pushes: `git push && git push --tags`
5. GitHub Actions detects the tag and runs the full pipeline
6. Package is created and uploaded to Chrome Web Store
7. Users receive the update based on your rollout settings

Branch Protection

Branch protection rules ensure that code changes go through proper review and testing before merging to the main branch.

Required Status Checks

Configure branch protection to require passing CI/CD checks:

1. Go to your repository settings
2. Navigate to "Branches" > "Branch protection rules"
3. Add a rule for `main`
4. Enable "Require status checks to pass before merging"
5. Select the required checks: `lint`, `test`, and `build`

Required Reviews

Require pull request reviews:

1. Enable "Require pull request reviews before merging"
2. Set "Required approving reviews" to 1 or 2 based on your team's needs
3. Enable "Dismiss stale reviews" when new commits are pushed
4. Enable "Require review from code owners" for critical changes

Protection Rules Summary

```markdown
Branch Protection Rules for main

-  Require pull request reviews before merging (minimum 1)
-  Require status checks to pass:
  -  lint (ESLint and TypeScript)
  -  test (Unit tests with Vitest)
  -  build (Production build)
-  Require branches to be up to date before merging
-  Require conversation resolution before merging
-  Include administrators in requirements (optional)
-  Restrict who can push:
  -  Require signed commits (optional, for additional security)
  -  Block force pushes
  -  Prevent branch deletion
```

Monitoring and Rollback

Even with comprehensive testing, issues can make it to production. Having proper monitoring and rollback procedures ensures you can quickly respond to problems.

Chrome Web Store Dashboard Monitoring

The Chrome Web Store developer dashboard provides several metrics:

1. User feedback: Review user reviews and ratings
2. Statistics: Track daily users, installation trends, and crash reports
3. Stack traces: View JavaScript errors reported by users
4. Publishing status: Monitor the review status of published updates

Staged Rollout

When publishing updates, use staged rollout to gradually distribute the update:

1. In the Chrome Web Store publishing flow, select "Percentage of users"
2. Start with 5-10% of users
3. Monitor crash reports and user feedback
4. Gradually increase the percentage if no issues arise
5. After confirming stability, expand to 100%

Rollback Procedure

If critical issues are discovered:

1. Immediate action: Navigate to the Chrome Web Store dashboard
2. Revert to previous version: Use the "Package" section to upload a previous stable package
3. Alternative: Push a new tag for the previous version (e.g., `v1.2.0` if you're at `v1.2.1`)
4. Documentation: Document the issue and steps taken in your release notes

Error Monitoring with Sentry

Integrate Sentry for real-time error monitoring:

```typescript
// src/background/index.ts
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: `extension@${chrome.runtime.getManifest().version}`,
  integrations: [
    Sentry.Integrations.GlobalHandlers,
  ],
});

// Capture errors from background scripts
self.addEventListener('error', (event) => {
  Sentry.captureException(event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  Sentry.captureException(event.reason);
});
```

```typescript
// src/popup/index.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: `extension@${chrome.runtime.getManifest().version}`,
});

export default function Popup() {
  // Your popup component
}
```

Related Resources

For more information on extending your CI/CD pipeline and Chrome extension development, explore these related guides:

- [Extension Monetization Playbook](/../extension-monetization-playbook/): Learn strategies for monetizing your Chrome extension, including one-time purchases, subscriptions, and affiliate models. This guide complements your CI/CD setup by helping you understand the revenue side of extension development.
- [Release Management](/publishing/version-management/): Detailed guidance on managing extension versions, handling updates, and coordinating releases across different channels.
- [GitHub Actions for Extensions](/guides/github-actions-extension-ci-cd/): Additional GitHub Actions patterns specific to Chrome extension development.
- [Extension Security Checklist](/guides/chrome-extension-security-checklist/): Ensure your CI/CD pipeline includes security verification steps.

Conclusion

Implementing a comprehensive CI/CD pipeline for your Chrome extension is one of the most impactful investments you can make in your project's infrastructure. The initial setup time pays dividends through consistent code quality, faster iteration cycles, and reliable releases.

Start with the basic workflow outlined in this guide and progressively add more sophisticated features as your project grows. The modular nature of GitHub Actions makes it easy to extend functionality without disrupting existing functionality.

Remember that CI/CD is not a set-it-and-forget-it system. Regularly review your pipeline metrics, update your test coverage based on real-world issues, and refine your processes as your team and project evolve.

---

Built by [Zovo](https://zovo.one) - Open-source tools and guides for extension developers.
