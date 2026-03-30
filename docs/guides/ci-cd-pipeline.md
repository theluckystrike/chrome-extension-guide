---
layout: default
title: "Chrome Extension CI/CD Pipeline. Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/ci-cd-pipeline/"
last_modified_at: 2026-01-15
---
Chrome Extension CI/CD Pipeline

A complete guide to automating Chrome extension builds, testing, and publishing using GitHub Actions, Playwright, and the Chrome Web Store API.

GitHub Actions Workflow for Extension Builds {#github-actions-workflow-for-extension-builds}

Basic Build Workflow {#basic-build-workflow}

{% raw %}
```yaml
.github/workflows/build.yml
name: Build & Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20]

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Type check
        run: pnpm typecheck

      - name: Run unit tests
        run: pnpm test

      - name: Build extension
        run: pnpm build

      - name: Validate manifest
        run: node scripts/validate-manifest.js

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-build
          path: dist/
          retention-days: 7
```
{% endraw %}

Multi-Browser Build Matrix {#multi-browser-build-matrix}

Build for Chrome, Firefox, and Edge in parallel:

{% raw %}
```yaml
.github/workflows/multi-browser.yml
name: Multi-Browser Build

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        browser: [chrome, firefox, edge]

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build for ${{ matrix.browser }}
        run: pnpm build:${{ matrix.browser }}
        env:
          TARGET_BROWSER: ${{ matrix.browser }}

      - name: Upload ${{ matrix.browser }} build
        uses: actions/upload-artifact@v4
        with:
          name: extension-${{ matrix.browser }}
          path: dist/${{ matrix.browser }}/
```
{% endraw %}

The build script uses the `TARGET_BROWSER` env to adjust the manifest and polyfills:

```typescript
// scripts/build.ts
import { build } from 'vite';
import { readFileSync, writeFileSync } from 'fs';

const browser = process.env.TARGET_BROWSER ?? 'chrome';

// Transform manifest for target browser
function transformManifest(browser: string): Record<string, unknown> {
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf-8'));

  if (browser === 'firefox') {
    // Firefox uses browser_specific_settings instead of some MV3 fields
    manifest.browser_specific_settings = {
      gecko: {
        id: 'extension@yourservice.com',
        strict_min_version: '109.0',
      },
    };
    // Firefox MV3 uses scripts array for background
    if (manifest.background?.service_worker) {
      manifest.background = {
        scripts: [manifest.background.service_worker],
        type: 'module',
      };
    }
  }

  if (browser === 'edge') {
    // Edge uses the same manifest as Chrome with minor tweaks
    // No changes needed for most extensions
  }

  return manifest;
}

async function main() {
  await build({
    define: {
      __BROWSER__: JSON.stringify(browser),
    },
    build: {
      outDir: `dist/${browser}`,
    },
  });

  const manifest = transformManifest(browser);
  writeFileSync(`dist/${browser}/manifest.json`, JSON.stringify(manifest, null, 2));

  console.log(`Built for ${browser}`);
}

main();
```

Automated Testing with Playwright {#automated-testing-with-playwright}

Setting Up Extension Testing {#setting-up-extension-testing}

Playwright can load unpacked Chrome extensions for end-to-end testing:

```typescript
// tests/setup.ts
import { chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

export async function createExtensionContext(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const extensionPath = path.resolve(__dirname, '../dist/chrome');

  const context = await chromium.launchPersistentContext('', {
    headless: false,  // Extensions require headed mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--disable-gpu',
    ],
  });

  // Wait for the service worker to register and extract the extension ID
  let extensionId = '';

  // The service worker URL reveals the extension ID
  const serviceWorker = context.serviceWorkers()[0]
    ?? await context.waitForEvent('serviceworker');

  const swUrl = serviceWorker.url();
  const match = swUrl.match(/chrome-extension:\/\/([a-z]+)\//);
  extensionId = match?.[1] ?? '';

  if (!extensionId) {
    throw new Error('Could not determine extension ID from service worker URL');
  }

  return { context, extensionId };
}
```

Testing the Popup {#testing-the-popup}

```typescript
// tests/popup.spec.ts
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createExtensionContext } from './setup';

let context: BrowserContext;
let extensionId: string;

test.beforeAll(async () => {
  ({ context, extensionId } = await createExtensionContext());
});

test.afterAll(async () => {
  await context.close();
});

test('popup renders correctly', async () => {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

  // Verify the popup title
  await expect(popupPage.locator('h1')).toHaveText('My Extension');

  // Verify the settings button exists
  await expect(popupPage.getByRole('button', { name: 'Settings' })).toBeVisible();
});

test('popup toggle saves state', async () => {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

  const toggle = popupPage.getByRole('switch', { name: 'Enable feature' });

  // Toggle on
  await toggle.click();
  await expect(toggle).toBeChecked();

  // Reload and verify persistence
  await popupPage.reload();
  await expect(
    popupPage.getByRole('switch', { name: 'Enable feature' })
  ).toBeChecked();
});

test('popup displays tab count', async () => {
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

  const tabCount = popupPage.getByTestId('tab-count');
  await expect(tabCount).toBeVisible();

  // The count should be a number greater than 0
  const text = await tabCount.textContent();
  expect(Number(text)).toBeGreaterThan(0);
});
```

Testing Content Scripts {#testing-content-scripts}

```typescript
// tests/content-script.spec.ts
import { test, expect, type BrowserContext } from '@playwright/test';
import { createExtensionContext } from './setup';

let context: BrowserContext;

test.beforeAll(async () => {
  ({ context } = await createExtensionContext());
});

test.afterAll(async () => {
  await context.close();
});

test('content script injects overlay on matching pages', async () => {
  const page = await context.newPage();
  await page.goto('https://example.com');

  // Wait for the content script to inject its overlay
  const overlay = page.locator('#my-extension-overlay');
  await expect(overlay).toBeVisible({ timeout: 5000 });

  // Verify overlay content
  await expect(overlay.locator('.overlay-title')).toHaveText('Page Info');
});

test('content script does not inject on non-matching pages', async () => {
  const page = await context.newPage();
  await page.goto('https://google.com');

  // Give it time to potentially inject
  await page.waitForTimeout(2000);

  const overlay = page.locator('#my-extension-overlay');
  await expect(overlay).not.toBeVisible();
});
```

Playwright CI Configuration {#playwright-ci-configuration}

```yaml
Addition to .github/workflows/build.yml
  e2e:
    runs-on: ubuntu-latest
    needs: build

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Download build artifact
        uses: actions/download-artifact@v4
        with:
          name: extension-build
          path: dist/

      - name: Install Playwright browsers
        run: pnpm exec playwright install chromium

      - name: Run E2E tests
        run: pnpm exec playwright test
        env:
          # Extensions need headed mode. use xvfb
          DISPLAY: ':99'

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,  // Extensions require sequential execution
  reporter: process.env.CI ? 'github' : 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

Bundle Size Monitoring {#bundle-size-monitoring}

Track your extension size to prevent bloat:

```typescript
// size-limit.config.ts
import type { SizeLimitConfig } from 'size-limit';

const config: SizeLimitConfig = [
  {
    name: 'Background script',
    path: 'dist/chrome/background.js',
    limit: '50 KB',
  },
  {
    name: 'Content script',
    path: 'dist/chrome/content.js',
    limit: '30 KB',
  },
  {
    name: 'Popup',
    path: 'dist/chrome/popup.js',
    limit: '80 KB',
  },
  {
    name: 'Total extension',
    path: 'dist/chrome//*.{js,css,html}',
    limit: '300 KB',
  },
];

export default config;
```

Add to your CI workflow:

```yaml
      - name: Check bundle size
        run: pnpm exec size-limit
```

For PR comments showing size changes, use the size-limit GitHub Action:

{% raw %}
```yaml
  size:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile

      - uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          build_script: build
```
{% endraw %}

Manifest Validation in CI {#manifest-validation-in-ci}

Catch manifest errors before they reach the Web Store:

```typescript
// scripts/validate-manifest.ts
import { readFileSync } from 'fs';

interface ValidationError {
  field: string;
  message: string;
}

function validateManifest(manifestPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  // Required fields
  const required = ['manifest_version', 'name', 'version', 'description'];
  for (const field of required) {
    if (!manifest[field]) {
      errors.push({ field, message: `Missing required field: ${field}` });
    }
  }

  // Manifest version must be 3
  if (manifest.manifest_version !== 3) {
    errors.push({
      field: 'manifest_version',
      message: `Expected 3, got ${manifest.manifest_version}`,
    });
  }

  // Version must be valid (1-4 dot-separated integers)
  const versionRegex = /^\d+(\.\d+){0,3}$/;
  if (manifest.version && !versionRegex.test(manifest.version)) {
    errors.push({
      field: 'version',
      message: `Invalid version format: ${manifest.version}`,
    });
  }

  // Name length limit
  if (manifest.name && manifest.name.length > 45) {
    errors.push({
      field: 'name',
      message: `Name exceeds 45 characters (${manifest.name.length})`,
    });
  }

  // Description length limit
  if (manifest.description && manifest.description.length > 132) {
    errors.push({
      field: 'description',
      message: `Description exceeds 132 characters (${manifest.description.length})`,
    });
  }

  // Check for dangerous permissions
  const dangerousPerms = ['debugger', 'nativeMessaging', 'proxy'];
  const allPerms = [...(manifest.permissions ?? []), ...(manifest.optional_permissions ?? [])];
  for (const perm of dangerousPerms) {
    if (allPerms.includes(perm)) {
      errors.push({
        field: 'permissions',
        message: `Uses sensitive permission "${perm}". expect extended review`,
      });
    }
  }

  // Icons should include all required sizes
  const requiredIconSizes = ['16', '48', '128'];
  if (manifest.icons) {
    for (const size of requiredIconSizes) {
      if (!manifest.icons[size]) {
        errors.push({
          field: 'icons',
          message: `Missing ${size}x${size} icon`,
        });
      }
    }
  } else {
    errors.push({ field: 'icons', message: 'No icons defined' });
  }

  return errors;
}

// Run validation
const errors = validateManifest('dist/chrome/manifest.json');

if (errors.length > 0) {
  console.error('Manifest validation failed:');
  for (const error of errors) {
    console.error(`  [${error.field}] ${error.message}`);
  }
  process.exit(1);
} else {
  console.log('Manifest validation passed.');
}
```

Automated Chrome Web Store Publishing {#automated-chrome-web-store-publishing}

Setting Up chrome-webstore-upload {#setting-up-chrome-webstore-upload}

First, obtain Chrome Web Store API credentials:

1. Go to the Google Cloud Console and create a project
2. Enable the Chrome Web Store API
3. Create OAuth2 credentials (client ID and client secret)
4. Obtain a refresh token using the OAuth2 flow

Store these as GitHub repository secrets:
- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`
- `CWS_EXTENSION_ID`

Publish Workflow {#publish-workflow}

{% raw %}
```yaml
.github/workflows/publish.yml
name: Publish to Chrome Web Store

on:
  release:
    types: [published]

permissions:
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Build extension
        run: pnpm build

      - name: Package extension
        run: |
          cd dist/chrome
          zip -r ../../extension.zip .

      - name: Upload to Chrome Web Store
        run: node scripts/publish-cws.js
        env:
          CWS_CLIENT_ID: ${{ secrets.CWS_CLIENT_ID }}
          CWS_CLIENT_SECRET: ${{ secrets.CWS_CLIENT_SECRET }}
          CWS_REFRESH_TOKEN: ${{ secrets.CWS_REFRESH_TOKEN }}
          CWS_EXTENSION_ID: ${{ secrets.CWS_EXTENSION_ID }}
```
{% endraw %}

Publishing Script {#publishing-script}

```typescript
// scripts/publish-cws.ts
import ChromeWebStore from 'chrome-webstore-upload';
import { readFileSync, createReadStream } from 'fs';

async function publish() {
  const {
    CWS_CLIENT_ID,
    CWS_CLIENT_SECRET,
    CWS_REFRESH_TOKEN,
    CWS_EXTENSION_ID,
  } = process.env;

  if (!CWS_CLIENT_ID || !CWS_CLIENT_SECRET || !CWS_REFRESH_TOKEN || !CWS_EXTENSION_ID) {
    throw new Error('Missing Chrome Web Store credentials in environment');
  }

  const store = ChromeWebStore({
    extensionId: CWS_EXTENSION_ID,
    clientId: CWS_CLIENT_ID,
    clientSecret: CWS_CLIENT_SECRET,
    refreshToken: CWS_REFRESH_TOKEN,
  });

  const zipFile = createReadStream('extension.zip');

  console.log('Uploading extension...');
  const uploadResult = await store.uploadExisting(zipFile);

  if (uploadResult.uploadState === 'FAILURE') {
    console.error('Upload failed:', uploadResult.itemError);
    process.exit(1);
  }

  console.log('Upload successful. Publishing...');

  // Publish to the default (production) channel
  const publishResult = await store.publish('default');

  if (publishResult.status.includes('OK')) {
    console.log('Published successfully.');
  } else {
    console.error('Publish failed:', publishResult.statusDetail);
    process.exit(1);
  }
}

publish().catch((err) => {
  console.error('Publish error:', err);
  process.exit(1);
});
```

Version Bumping Strategies {#version-bumping-strategies}

Semantic Versioning from Conventional Commits {#semantic-versioning-from-conventional-commits}

Use `standard-version` or `conventional-changelog` to auto-bump versions:

```json
{
  "scripts": {
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major"
  }
}
```

Chrome Web Store uses a four-part version: `major.minor.patch.build`. Sync it with your semver:

```typescript
// scripts/bump-version.ts
import { readFileSync, writeFileSync } from 'fs';

function bumpVersion(type: 'major' | 'minor' | 'patch'): string {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf-8'));

  const [major, minor, patch] = pkg.version.split('.').map(Number);

  let newVersion: string;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }

  // Update package.json
  pkg.version = newVersion;
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

  // Update manifest.json (Chrome uses same format)
  manifest.version = newVersion;
  writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');

  console.log(`Version bumped to ${newVersion}`);
  return newVersion;
}

const type = (process.argv[2] as 'major' | 'minor' | 'patch') ?? 'patch';
bumpVersion(type);
```

Auto-Version from Git Tags in CI {#auto-version-from-git-tags-in-ci}

```yaml
      - name: Set version from tag
        run: |
          VERSION=${GITHUB_REF_NAME#v}
          echo "VERSION=$VERSION" >> $GITHUB_ENV
          node -e "
            const fs = require('fs');
            const m = JSON.parse(fs.readFileSync('manifest.json','utf-8'));
            m.version = '$VERSION';
            fs.writeFileSync('manifest.json', JSON.stringify(m, null, 2) + '\n');
          "
```

Code Signing and Key Management {#code-signing-and-key-management}

Extension Key Management {#extension-key-management}

Chrome extensions are identified by their public key. Manage it securely:

```typescript
// scripts/inject-key.ts
// In development, the key is auto-generated. For production, use a consistent key.
import { readFileSync, writeFileSync } from 'fs';

function injectKey(): void {
  const key = process.env.EXTENSION_PUBLIC_KEY;
  if (!key) {
    console.log('No EXTENSION_PUBLIC_KEY set. skipping key injection (dev mode)');
    return;
  }

  const manifest = JSON.parse(readFileSync('dist/chrome/manifest.json', 'utf-8'));
  manifest.key = key;
  writeFileSync('dist/chrome/manifest.json', JSON.stringify(manifest, null, 2) + '\n');

  console.log('Extension key injected into manifest');
}

injectKey();
```

Store the private key (`.pem` file) as an encrypted GitHub secret and never commit it:

{% raw %}
```yaml
      - name: Inject extension key
        run: node scripts/inject-key.js
        env:
          EXTENSION_PUBLIC_KEY: ${{ secrets.EXTENSION_PUBLIC_KEY }}
```
{% endraw %}

.gitignore for Key Files {#gitignore-for-key-files}

```gitignore
Never commit extension keys
*.pem
*.key
key.json
```

Release Notes Generation {#release-notes-generation}

Conventional Commits to Changelog {#conventional-commits-to-changelog}

```typescript
// scripts/generate-release-notes.ts
import { execSync } from 'child_process';

interface CommitGroup {
  type: string;
  label: string;
  commits: string[];
}

function generateReleaseNotes(fromTag: string): string {
  const log = execSync(
    `git log ${fromTag}..HEAD --pretty=format:"%s" --no-merges`,
    { encoding: 'utf-8' }
  ).trim();

  if (!log) return 'No changes.';

  const groups: CommitGroup[] = [
    { type: 'feat', label: 'New Features', commits: [] },
    { type: 'fix', label: 'Bug Fixes', commits: [] },
    { type: 'perf', label: 'Performance', commits: [] },
    { type: 'refactor', label: 'Refactoring', commits: [] },
    { type: 'docs', label: 'Documentation', commits: [] },
    { type: 'chore', label: 'Maintenance', commits: [] },
  ];

  for (const line of log.split('\n')) {
    const match = line.match(/^(\w+)(?:\(.+?\))?:\s*(.+)$/);
    if (match) {
      const [, type, description] = match;
      const group = groups.find((g) => g.type === type);
      if (group) {
        group.commits.push(description);
      }
    }
  }

  const sections = groups
    .filter((g) => g.commits.length > 0)
    .map((g) => {
      const items = g.commits.map((c) => `- ${c}`).join('\n');
      return `### ${g.label}\n\n${items}`;
    })
    .join('\n\n');

  return sections || 'Miscellaneous changes.';
}

// Usage: node scripts/generate-release-notes.js v1.0.0
const fromTag = process.argv[2];
if (!fromTag) {
  console.error('Usage: generate-release-notes <from-tag>');
  process.exit(1);
}

console.log(generateReleaseNotes(fromTag));
```

Automated GitHub Release with Notes {#automated-github-release-with-notes}

{% raw %}
```yaml
.github/workflows/release.yml
name: Create Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for changelog generation

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Package extension
        run: |
          cd dist/chrome && zip -r ../../extension.zip .
          cd ../firefox && zip -r ../../extension-firefox.zip .

      - name: Generate release notes
        id: notes
        run: |
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -n "$PREV_TAG" ]; then
            NOTES=$(node scripts/generate-release-notes.js "$PREV_TAG")
          else
            NOTES="Initial release."
          fi
          echo "notes<<EOF" >> $GITHUB_OUTPUT
          echo "$NOTES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          body: ${{ steps.notes.outputs.notes }}
          files: |
            extension.zip
            extension-firefox.zip
```
{% endraw %}

Canary and Beta Channel Deployment {#canary-and-beta-channel-deployment}

Channel-Based Publishing {#channel-based-publishing}

Chrome Web Store supports publishing to `trustedTesters` before going public:

```typescript
// scripts/publish-channel.ts
import ChromeWebStore from 'chrome-webstore-upload';
import { createReadStream } from 'fs';

type Channel = 'default' | 'trustedTesters';

async function publishToChannel(channel: Channel) {
  const store = ChromeWebStore({
    extensionId: process.env.CWS_EXTENSION_ID!,
    clientId: process.env.CWS_CLIENT_ID!,
    clientSecret: process.env.CWS_CLIENT_SECRET!,
    refreshToken: process.env.CWS_REFRESH_TOKEN!,
  });

  const zipFile = createReadStream('extension.zip');

  console.log(`Uploading extension for ${channel} channel...`);
  const uploadResult = await store.uploadExisting(zipFile);

  if (uploadResult.uploadState === 'FAILURE') {
    console.error('Upload failed:', uploadResult.itemError);
    process.exit(1);
  }

  console.log(`Publishing to ${channel}...`);
  const publishResult = await store.publish(channel);

  if (publishResult.status.includes('OK')) {
    console.log(`Published to ${channel} successfully.`);
  } else {
    console.error('Publish failed:', publishResult.statusDetail);
    process.exit(1);
  }
}

const channel = (process.argv[2] as Channel) ?? 'trustedTesters';
publishToChannel(channel);
```

Staged Rollout Workflow {#staged-rollout-workflow}

{% raw %}
```yaml
.github/workflows/staged-rollout.yml
name: Staged Rollout

on:
  workflow_dispatch:
    inputs:
      channel:
        description: 'Publish channel'
        required: true
        type: choice
        options:
          - trustedTesters
          - default

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Package
        run: cd dist/chrome && zip -r ../../extension.zip .

      - name: Publish to ${{ github.event.inputs.channel }}
        run: node scripts/publish-channel.js ${{ github.event.inputs.channel }}
        env:
          CWS_CLIENT_ID: ${{ secrets.CWS_CLIENT_ID }}
          CWS_CLIENT_SECRET: ${{ secrets.CWS_CLIENT_SECRET }}
          CWS_REFRESH_TOKEN: ${{ secrets.CWS_REFRESH_TOKEN }}
          CWS_EXTENSION_ID: ${{ secrets.CWS_EXTENSION_ID }}
```
{% endraw %}

Beta Version Numbering {#beta-version-numbering}

Use the fourth version segment for beta builds:

```typescript
// scripts/beta-version.ts
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

function setBetaVersion(): void {
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf-8'));
  const baseVersion = manifest.version; // e.g., "1.2.0"

  // Use the commit count since the last tag as the build number
  const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();

  const betaVersion = `${baseVersion}.${commitCount}`;
  manifest.version = betaVersion;
  manifest.version_name = `${baseVersion} Beta ${commitCount}`;

  writeFileSync('manifest.json', JSON.stringify(manifest, null, 2) + '\n');

  console.log(`Beta version set to ${betaVersion} (${manifest.version_name})`);
}

setBetaVersion();
```

Complete Pipeline Example {#complete-pipeline-example}

Here is a full workflow that ties everything together:

{% raw %}
```yaml
.github/workflows/pipeline.yml
name: Extension Pipeline

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

permissions:
  contents: write

jobs:
  # 1. Lint, type-check, and unit test
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  # 2. Build and validate
  build:
    needs: check
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chrome, firefox]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:${{ matrix.browser }}
      - run: node scripts/validate-manifest.js dist/${{ matrix.browser }}/manifest.json
      - uses: actions/upload-artifact@v4
        with:
          name: extension-${{ matrix.browser }}
          path: dist/${{ matrix.browser }}/

  # 3. E2E tests (Chrome only. Playwright limitation)
  e2e:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: extension-chrome
          path: dist/chrome/
      - run: pnpm exec playwright install chromium
      - run: xvfb-run pnpm exec playwright test

  # 4. Publish on tag push
  publish:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: [build, e2e]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - uses: actions/download-artifact@v4
        with:
          name: extension-chrome
          path: dist/chrome/
      - run: cd dist/chrome && zip -r ../../extension.zip .
      - run: node scripts/publish-cws.js
        env:
          CWS_CLIENT_ID: ${{ secrets.CWS_CLIENT_ID }}
          CWS_CLIENT_SECRET: ${{ secrets.CWS_CLIENT_SECRET }}
          CWS_REFRESH_TOKEN: ${{ secrets.CWS_REFRESH_TOKEN }}
          CWS_EXTENSION_ID: ${{ secrets.CWS_EXTENSION_ID }}
```
{% endraw %}

Summary {#summary}

A mature CI/CD pipeline for Chrome extensions includes:

1. Build automation. reproducible builds triggered on push and PR
2. Multi-browser matrix. build for Chrome, Firefox, and Edge in parallel
3. Playwright E2E testing. load the extension in a real browser and test popup, content scripts, and background behavior
4. Bundle size monitoring. catch size regressions before they ship
5. Manifest validation. automated checks for required fields, version format, and dangerous permissions
6. Chrome Web Store publishing. fully automated upload and publish via API
7. Version management. semver synced between package.json and manifest.json
8. Key management. extension keys stored as secrets, never committed
9. Release notes. auto-generated from conventional commits
10. Staged rollout. publish to trusted testers before going public

Cross-references:
- `docs/guides/testing-extensions.md`. unit and integration testing strategies
- `docs/guides/cross-browser.md`. browser compatibility considerations
- `docs/guides/extension-updates.md`. update lifecycle and migration
- `docs/guides/security-hardening.md`. security checks to add to your pipeline

Related Articles {#related-articles}

Related Articles

- [GitHub Actions CI/CD](../guides/github-actions-extension-ci-cd.md)
- [Release Notes](../guides/extension-release-notes.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
