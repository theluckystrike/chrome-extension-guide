---
layout: default
title: "Chrome Extension CI/CD Pipeline: Automated Testing & Publishing"
description: "Build a complete CI/CD pipeline for Chrome extensions with GitHub Actions. Automate linting, testing, building, packaging, and publishing to Chrome Web Store."
permalink: /guides/chrome-extension-ci-cd-pipeline/
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-ci-cd-pipeline/"
---

# Chrome Extension CI/CD Pipeline: Automated Testing & Publishing

Continuous Integration and Continuous Deployment (CI/CD) are essential practices for building production-ready Chrome extensions. While manual builds and testing might work for personal projects, they become unsustainable as your extension grows in complexity, user base, and feature set. A well-designed CI/CD pipeline automates the entire process from code commit to Chrome Web Store publication, ensuring consistent quality, faster iteration cycles, and reduced human error.

This comprehensive guide walks you through building a complete CI/CD pipeline for Chrome extensions using GitHub Actions. You'll learn how to automate linting, testing, building, packaging, and publishing—transforming your development workflow from a series of manual steps into a streamlined, reliable machine.

## Introduction: Why CI/CD Matters for Chrome Extension Development

Chrome extensions present unique challenges that make CI/CD pipelines particularly valuable. Unlike traditional web applications, extensions must work across multiple Chrome versions, handle browser-specific APIs, and pass Chrome Web Store's review process. The manifest.json file dictates extension behavior, permissions affect user trust, and any runtime error can result in a one-star review that tanks your reputation.

Manual builds are error-prone for several reasons. Developers forget to increment version numbers, accidentally include debug code, or miss testing on different operating systems. When multiple contributors work on an extension, inconsistent local environments lead to "works on my machine" bugs that only surface after publication. The Chrome Web Store review process adds another layer of complexity—rejections due to unused permissions or deprecated APIs can delay releases by days.

A robust CI/CD pipeline addresses these challenges systematically. Every pull request triggers automated tests that catch bugs before they reach production. Consistent build environments eliminate environment-specific issues. Automated packaging ensures every release follows the same process. And when something does go wrong, the pipeline provides clear audit trails showing exactly what changed and when.

The pipeline you'll build in this guide covers these stages:

1. **Trigger** – Push to main, pull request creation, or tag push
2. **Lint** – ESLint and TypeScript type checking
3. **Test** – Unit tests with Vitest or Jest
4. **Build** – Production build with optimizations
5. **Package** – Create .zip for Chrome Web Store upload
6. **Publish** – Optional auto-publish to Chrome Web Store

## Pipeline Architecture

Understanding the overall architecture helps you design a pipeline that's both robust and maintainable. Here's the complete pipeline flow:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   TRIGGER   │────▶│    LINT     │────▶│    TEST     │────▶│    BUILD    │
│             │     │             │     │             │     │             │
│ - Push      │     │ - ESLint    │     │ - Vitest    │     │ - Vite      │
│ - PR        │     │ - TypeScript│     │ - Jest      │     │ - esbuild   │
│ - Tag       │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   MONITOR   │◀────│  PUBLISH    │◀────│  PACKAGE    │◀────│   ARTIFACT  │
│             │     │             │     │             │     │             │
│ - Dashboard │     │ - CWS API   │     │ - Zip file  │     │ - dist/     │
│ - Rollback  │     │ - Staged    │     │ - Version   │     │ - .zip      │
│ - Sentry    │     │ - Secrets   │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

Each stage serves a specific purpose in the delivery pipeline. The trigger determines when the pipeline runs—typically on every push to main, every pull request, and when version tags are pushed. Linting catches code quality issues and type errors before they reach testing. Tests verify that your code works as expected. Building creates the production-ready artifacts. Packaging prepares the extension for upload. Publishing delivers it to users.

## GitHub Actions Setup

GitHub Actions provides an excellent foundation for extension CI/CD because it's tightly integrated with GitHub repositories and offers generous free tier for public repositories. Create a `.github/workflows` directory in your extension repository and add the following comprehensive workflow file:

```yaml
# .github/workflows/ci.yml
name: Chrome Extension CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  release:
    types: [published]
  workflow_dispatch:

env:
  NODE_VERSION: '20'

jobs:
  lint:
    name: Lint and Type Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript type check
        run: npm run typecheck

  test:
    name: Test (Node.js ${{ matrix.node-version }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: [18, 20, 22]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  build:
    name: Build Extension
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build extension
        run: npm run build
        env:
          NODE_ENV: production
          API_URL: ${{ secrets.API_URL }}

      - name: Upload built extension
        uses: actions/upload-artifact@v4
        with:
          name: extension-dist
          path: dist/
          retention-days: 7

  package:
    name: Package Extension
    runs-on: ubuntu-latest
    needs: [build]
    outputs:
      version: ${{ steps.package.outputs.version }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Download built extension
        uses: actions/download-artifact@v4
        with:
          name: extension-dist
          path: dist/

      - name: Read version from manifest
        id: version
        run: |
          VERSION=$(node -p "require('./dist/manifest.json').version")
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "Extension version: $VERSION"

      - name: Create ZIP package
        id: package
        run: |
          VERSION=$(node -p "require('./dist/manifest.json').version")
          zip -r "extension-v${VERSION}.zip" dist/
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Upload package artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-package
          path: extension-*.zip
          retention-days: 30

  publish:
    name: Publish to Chrome Web Store
    runs-on: ubuntu-latest
    needs: [package]
    if: github.event_name == 'release' && github.event.action == 'published'
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Download package artifact
        uses: actions/download-artifact@v4
        with:
          name: extension-package
          path: .

      - name: Publish to Chrome Web Store
        uses: peaceiris/actions-gh-release@v1
        with:
          files: extension-*.zip
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload to CWS
        run: |
          npx chrome-webstore-upload@latest upload \
            --extension-id ${{ secrets.EXTENSION_ID }} \
            --client-id ${{ secrets.CWS_CLIENT_ID }} \
            --client-secret ${{ secrets.CWS_CLIENT_SECRET }} \
            --refresh-token ${{ secrets.CWS_REFRESH_TOKEN }} \
            --zip-path extension-*.zip
```

This workflow demonstrates several best practices. It uses a matrix strategy to test on multiple Node.js versions, ensuring compatibility across environments. It separates concerns into distinct jobs that run sequentially, with later jobs depending on earlier ones. It uploads artifacts between jobs, preserving build outputs without rebuilding. And it includes conditional publishing that only triggers on release events.

## Linting Configuration for Chrome Extensions

ESLint configuration for Chrome extensions requires special handling because extensions use browser-specific globals and APIs that aren't available in Node.js environments. Here's a complete ESLint configuration optimized for Manifest V3 extensions:

```javascript
// .eslintrc.js
const path = require('path');

module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'promise'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    
    // React rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    
    // Chrome extension specific
    'no-restricted-globals': ['error', 'window', 'document', 'navigator'],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        project: path.resolve(__dirname, 'tsconfig.json'),
      },
    },
    {
      files: ['src/background/**/*'],
      env: {
        serviceworker: true,
      },
    },
  ],
};
```

For TypeScript type checking, install the Chrome types package to get autocompletion and type safety for Chrome extension APIs:

```bash
npm install -D @anthropic-ai/chrome-types
```

Then add it to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["chrome", "node"]
  }
}
```

Pre-commit hooks with Husky and lint-staged ensure code quality before it reaches your repository:

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  },
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run typecheck"
    }
  }
}
```

## Testing in CI: Running Extension Tests Headlessly

Testing Chrome extensions requires mocking browser APIs since tests run in Node.js environments. Create a comprehensive mock setup for Chrome APIs:

```typescript
// tests/__mocks__/chrome.ts
const createChromeMock = () => ({
  runtime: {
    id: 'test-extension-id',
    getManifest: () => ({
      manifest_version: 3,
      name: 'Test Extension',
      version: '1.0.0',
    }),
    getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    lastError: null,
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    sendMessage: jest.fn(),
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setTitle: jest.fn(),
    setIcon: jest.fn(),
  },
  alarms: {
    create: jest.fn(),
    get: jest.fn(),
    clear: jest.fn(),
    clearAll: jest.fn(),
    getAll: jest.fn(),
  },
  permissions: {
    request: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(),
  },
  contextMenus: {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    removeAll: jest.fn(),
  },
  declarativeNetRequest: {
    getDynamicRules: jest.fn(),
    updateDynamicRules: jest.fn(),
  },
});

global.chrome = createChromeMock();

export {};
```

Now you can write tests for your background scripts:

```typescript
// tests/background/storage.test.ts
import { handleStorageSet } from '../../src/background/storage';

describe('Background Storage Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save user preferences to storage', async () => {
    const mockData = { theme: 'dark', notifications: true };
    
    await handleStorageSet('preferences', mockData);
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      preferences: mockData,
    });
  });

  it('should handle storage errors gracefully', async () => {
    (chrome.storage.local.set as jest.Mock).mockImplementation(
      (_data, callback) => {
        if (callback) callback();
      }
    );
    
    await expect(
      handleStorageSet('invalid-key', { value: 'test' })
    ).rejects.toThrow('Invalid storage key');
  });

  it('should validate data before storing', async () => {
    const invalidData = { unknownField: 'value' };
    
    await handleStorageSet('preferences', invalidData);
    
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });
});
```

Configure Vitest or Jest to work with your extension's module system:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## Building for Production: Optimized Extension Builds

Production builds must minimize bundle size while maintaining debuggability. Use a build tool like Vite or esbuild with proper configuration:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.API_URL': JSON.stringify(process.env.API_URL),
  },
});
```

Environment variables require special handling for extensions. Create separate `.env` files for different environments:

```bash
# .env.production
API_URL=https://api.production.com
DEBUG_MODE=false
ANALYTICS_ID=UA-XXXXX-X

# .env.development
API_URL=http://localhost:3000
DEBUG_MODE=true
```

## Packaging the Extension: Creating the Uploadable ZIP

After building, you need to package the extension into a ZIP file suitable for Chrome Web Store upload. Create a packaging script:

```typescript
// scripts/package-extension.ts
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DIST_DIR = path.join(process.cwd(), 'dist');
const OUTPUT_DIR = path.join(process.cwd(), 'release');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readManifest(): { version: string; name: string } {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

function createPackage() {
  ensureDir(OUTPUT_DIR);
  
  const manifest = readManifest();
  const version = manifest.version;
  const zipName = `extension-v${version}.zip`;
  const zipPath = path.join(OUTPUT_DIR, zipName);
  
  // Remove existing zip
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  
  // Files and directories to exclude
  const excludePatterns = [
    '.DS_Store',
    'Thumbs.db',
    '*.map',
    '*.test.js',
    '*.test.ts',
    '__tests__',
    'node_modules',
    '.git',
  ];
  
  // Create ZIP using native macOS/Linux zip command
  const distFiles = fs.readdirSync(DIST_DIR).filter(file => 
    !excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        return regex.test(file);
      }
      return file === pattern;
    })
  );
  
  execSync(`cd ${DIST_DIR} && zip -r ${zipPath} .`, { stdio: 'inherit' });
  
  console.log(`✓ Created ${zipName} (${(fs.statSync(zipPath).size / 1024).toFixed(2)} KB)`);
  console.log(`  Version: ${version}`);
  console.log(`  Path: ${zipPath}`);
  
  return { zipPath, version };
}

createPackage();
```

Add the package script to your `package.json`:

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "package": "npm run build && tsx scripts/package-extension.ts",
    "release": "npm run package"
  }
}
```

## Auto-Publishing to Chrome Web Store

The Chrome Web Store provides an API for programmatic uploads. First, set up your credentials through the Google Cloud Console and Chrome Web Store Developer Dashboard, then store them as GitHub Secrets:

- `CWS_CLIENT_ID` – OAuth2 client ID
- `CWS_CLIENT_SECRET` – OAuth2 client secret
- `CWS_REFRESH_TOKEN` – OAuth2 refresh token
- `EXTENSION_ID` – Your extension's unique ID

Create a publish script that handles the upload:

```typescript
// scripts/publish-to-cws.ts
import { chromeWebstoreUpload } from 'chrome-webstore-upload';
import fs from 'fs';
import path from 'path';

interface PublishOptions {
  extensionId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  zipPath: string;
  publishTarget?: 'default' | 'trustedTesters';
}

async function publishToCWS(options: PublishOptions) {
  const {
    extensionId,
    clientId,
    clientSecret,
    refreshToken,
    zipPath,
    publishTarget = 'default',
  } = options;

  // Create the upload credentials
  const credentials = {
    extId: extensionId,
    clientId,
    clientSecret,
    refreshToken,
  };

  // Create the store
  const store = chromeWebstoreUpload(credentials);

  // Read the ZIP file
  const fileBuffer = fs.readFileSync(zipPath);

  try {
    // Upload the new version
    console.log('Uploading extension to Chrome Web Store...');
    const uploadResponse = await store.uploadExisting(fileBuffer, {
      extensionsId: extensionId,
    });

    console.log('Upload response:', uploadResponse);

    if (uploadResponse.uploadState === 'SUCCESS') {
      // Publish the extension
      console.log('Publishing extension...');
      const publishResponse = await store.publish({
        extensionsId: extensionId,
        publishTarget,
      });

      console.log('Publish response:', publishResponse);
      
      if (publishResponse.status.includes('OK')) {
        console.log('✅ Successfully published to Chrome Web Store!');
      } else {
        console.log('⚠️ Upload successful, but publish may require manual approval');
      }
    }

    return uploadResponse;
  } catch (error) {
    console.error('Failed to publish to CWS:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  publishToCWS({
    extensionId: process.env.EXTENSION_ID!,
    clientId: process.env.CWS_CLIENT_ID!,
    clientSecret: process.env.CWS_CLIENT_SECRET!,
    refreshToken: process.env.CWS_REFRESH_TOKEN!,
    zipPath: args[0] || './release/extension.zip',
    publishTarget: (process.env.PUBLISH_TARGET as any) || 'default',
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { publishToCWS };
```

For security, only publish on version tags. Configure your workflow to require manual approval for releases:

```yaml
# .github/workflows/release.yml
name: Release to Chrome Web Store

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    name: Publish Release
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Download built extension
        uses: actions/download-artifact@v4
        with:
          name: extension-package

      - name: Publish to CWS
        run: npx tsx scripts/publish-to-cws.ts extension-*.zip
        env:
          EXTENSION_ID: ${{ secrets.EXTENSION_ID }}
          CWS_CLIENT_ID: ${{ secrets.CWS_CLIENT_ID }}
          CWS_CLIENT_SECRET: ${{ secrets.CWS_CLIENT_SECRET }}
          CWS_REFRESH_TOKEN: ${{ secrets.CWS_REFRESH_TOKEN }}
```

## Version Management: Keeping Versions in Sync

Chrome extensions require version synchronization between multiple files. Create a version bump script that updates all relevant files:

```typescript
// scripts/bump-version.ts
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

type BumpType = 'major' | 'minor' | 'patch';

function getCurrentVersion(): string {
  const packageJson = JSON.parse(
    fs.readFileSync('./package.json', 'utf-8')
  );
  return packageJson.version;
}

function bumpVersion(version: string, type: BumpType): string {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

function updateManifestVersion(version: string) {
  const manifestPath = './src/manifest.json';
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.version = version;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function updatePackageVersion(version: string) {
  execSync(`npm version ${version} --no-git-tag-version`, { stdio: 'inherit' });
}

function main() {
  const type = (process.argv[2] as BumpType) || 'patch';
  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, type);
  
  console.log(`Bumping version: ${currentVersion} → ${newVersion}`);
  
  updateManifestVersion(newVersion);
  updatePackageVersion(newVersion);
  
  console.log(`✅ Version bumped to ${newVersion}`);
  console.log('Remember to commit and tag: git add -A && git commit -m "Bump version" && git tag v' + newVersion);
}

main();
```

## Branch Protection and Review: GitHub Settings

Configure branch protection rules to ensure code quality before merging:

1. Go to your repository's **Settings** → **Branches**
2. Add a rule for `main` branch
3. Enable these settings:
   - **Require pull request reviews before merging** – Require at least 1 approval
   - **Require status checks to pass before merging** – Require CI jobs to pass
   - **Require conversation resolution before merging** – Ensure all comments are addressed
   - **Include administrators** – Apply rules to everyone

Required status checks should include:
- `lint` – ESLint and TypeScript checks
- `test` – Test suite passing on all Node.js versions
- `build` – Successful production build

## Monitoring and Rollback: Post-Deploy

After publishing, monitor your extension's performance through the Chrome Web Store Developer Dashboard. Key metrics to track include:

- **User reviews** – Respond promptly to negative feedback
- **Crash reports** – Use Sentry or similar error tracking
- **Active users** – Monitor for sudden drops indicating issues
- **Retention rates** – Track user engagement over time

For staged rollouts, start with a small percentage and increase gradually. If issues arise, rollback by publishing a previous version:

```bash
# Rollback procedure
git checkout <previous-tag>
npm run package
npx tsx scripts/publish-to-cws.ts
```

Set up Sentry for extension error monitoring:

```typescript
// src/background/error-tracking.ts
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: process.env.NODE_ENV,
  release: `my-extension@${chrome.runtime.getManifest().version}`,
  
  // Filter out expected Chrome errors
  beforeSend(event) {
    if (event.exception?.values?.some(e => 
      e.value?.includes('Extension context invalidated')
    )) {
      return null;
    }
    return event;
  },
});

// Add error handling
chrome.runtime.onInstalled.addListener(() => {
  Sentry.captureMessage('Extension installed');
});
```

## Conclusion

A robust CI/CD pipeline transforms Chrome extension development from a manual, error-prone process into a reliable, automated workflow. By implementing the pipeline described in this guide, you'll catch bugs earlier, release more confidently, and scale your development team effectively.

The key components include GitHub Actions for workflow automation, ESLint and TypeScript for code quality, Vitest or Jest for testing with Chrome API mocks, Vite for optimized builds, and the Chrome Web Store API for programmatic publishing.

For more details on Chrome Web Store publishing, see our [Publishing Guide](/chrome-extension-guide/docs/publishing/publishing-guide/). For information about release management strategies, check out our upcoming [Release Management](/chrome-extension-guide/docs/guides/release-management/) guide.

---

Built by [Zovo](https://zovo.one) - Open-source tools and guides for extension developers.
