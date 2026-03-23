CI/CD for Chrome Extensions

A comprehensive guide to building, testing, and publishing Chrome extensions using continuous integration and deployment pipelines.

---

GitHub Actions Workflow Setup

Create a `.github/workflows/` directory for your CI/CD workflows:

```bash
mkdir -p .github/workflows
```

Basic CI Workflow

```yaml
.github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Lint
        run: pnpm lint
        
      - name: Type check
        run: pnpm typecheck
        
      - name: Test
        run: pnpm test
```

---

Automated Building and Bundling

Build your extension in CI before any deployment:

```yaml
.github/workflows/build.yml
name: Build

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      
      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-build
          path: dist/
          retention-days: 30
```

Use Web-ext or webpack with extensions support for bundling:

```bash
Using web-ext for packaging
npx web-ext build --source-dir dist --artifacts-dir web-ext-build
```

---

Automated Testing in CI

Run unit and integration tests in your pipeline:

```yaml
- name: Test with coverage
  run: pnpm test --coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

Test Configuration

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

Chrome Extension Linting

Use specialized linters for extension code:

```yaml
.github/workflows/lint.yml
name: Lint

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run ESLint
        run: pnpm lint
        
      - name: Run ext-lint
        run: npx @extensionjs/cli lint
```

ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended'],
  env: {
    browser: true,
    webextensions: true,
  },
  rules: {
    'no-undef': 'error',
  },
};
```

---

Manifest Validation in CI

Validate your manifest.json before building:

```yaml
- name: Validate manifest
  run: |
    npx @webextension-toolbox/validate-manifest manifest.json
    
Or use Chrome's official validator
- name: Check manifest
  run: npx chrome-manifest-loader validate
```

Manifest Validation Script

```javascript
// scripts/validate-manifest.js
const fs = require('fs');
const path = require('path');

function validateManifest() {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  
  const required = ['manifest_version', 'name', 'version', 'description'];
  const missing = required.filter(field => !manifest[field]);
  
  if (missing.length > 0) {
    console.error(`Missing required fields: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  if (manifest.manifest_version === 3) {
    if (!manifest.action && !manifest.declarative_net_request) {
      console.error('MV3 requires action or declarative_net_request');
      process.exit(1);
    }
  }
  
  console.log('Manifest validation passed');
}

validateManifest();
```

---

Version Bumping Automation

Automate version updates using standard-version or semantic-release:

```yaml
.github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: pnpm install -g standard-version
        
      - name: Bump version
        run: standard-version
        
      - name: Push changes
        run: git push origin main --follow-tags
```

Version Bump Script

```yaml
- name: Update manifest version
  run: |
    VERSION=${GITHUB_REF#refs/tags/v}
    jq --arg version "$VERSION" '.version = $version' manifest.json > tmp.json
    mv tmp.json manifest.json
```

---

Changelog Generation

Generate changelogs automatically:

```yaml
- name: Generate changelog
  run: |
    npx conventional-changelog-cli -p angular -i CHANGELOG.md -s
    
- name: Commit changelog
  run: |
    git add CHANGELOG.md
    git commit -m "docs: update changelog"
```

Standard Version Configuration

```json
// package.json
{
  "standard-version": {
    "releaseFiles": ["CHANGELOG.md"],
    "types": [
      { "type": "feat", "release": "minor"},
      { "type": "fix", "release": "patch"},
      { "type": "perf", "release": "patch"},
      { "type": "revert", "release": "patch"}
    ]
  }
}
```

---

Automated Chrome Web Store Upload

Using chrome-webstore-upload-cli

```bash
Install the CLI
npm install -g chrome-webstore-upload-cli

Upload extension
npx chrome-webstore-upload-cli upload \
  --extension-id $CWS_EXTENSION_ID \
  --client-id $CWS_CLIENT_ID \
  --client-secret $CWS_CLIENT_SECRET \
  --refresh-token $CWS_REFRESH_TOKEN \
  --upload-source dist/extension.zip
```

GitHub Action for CWS Upload

{% raw %}
```yaml
- name: Upload to Chrome Web Store
  uses: asaskevich/chrome-webstore-upload-action@v1
  with:
    extension-id: ${{ secrets.CWS_EXTENSION_ID }}
    client-id: ${{ secrets.CWS_CLIENT_ID }}
    client-secret: ${{ secrets.CWS_CLIENT_SECRET }}
    refresh-token: ${{ secrets.CWS_REFRESH_TOKEN }}
    upload-source: extension.zip
```
{% endraw %}

---

Staged Rollout Automation

Control your rollout percentage:

```yaml
- name: Publish to percentage
  run: |
    npx chrome-webstore-upload-cli publish \
      --extension-id $CWS_EXTENSION_ID \
      --client-id $CWS_CLIENT_ID \
      --client-secret $CWS_CLIENT_SECRET \
      --refresh-token $CWS_REFRESH_TOKEN \
      --publish-target trustedTesters  # or public with rolloutPercentage
```

Rollout Strategy

| Stage | Percentage | Use Case |
|-------|------------|----------|
| Draft | 0% | Testing builds |
| Trusted Testers | 0% | Beta testing |
| Percentage | 10-100% | Gradual rollout |

---

Firefox Add-on Store Automation

Use web-ext for Firefox:

```bash
Install web-ext
npm install -g web-ext

Sign and upload to AMO
web-ext sign \
  --source-dir dist \
  --api-key $AMO_API_KEY \
  --api-secret $AMO_API_SECRET
```

Firefox CI Configuration

```yaml
- name: Publish to Firefox
  run: |
    npx web-ext sign \
      --source-dir dist \
      --api-key $AMO_API_KEY \
      --api-secret $AMO_API_SECRET
  env:
    NODE_ENV: production
```

---

Edge Add-ons Store Automation

```yaml
- name: Publish to Edge
  run: |
    npx edge-webstore-upload upload \
      --extension-id $EDGE_EXTENSION_ID \
      --client-id $EDGE_CLIENT_ID \
      --client-secret $EDGE_CLIENT_SECRET \
      --access-token-url $EDGE_TOKEN_URL \
      --upload-source dist/extension.zip
```

---

Multi-Browser CI Matrix

Run builds for multiple browsers simultaneously:

{% raw %}
```yaml
.github/workflows/multi-browser.yml
name: Multi-Browser CI

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        browser: [chrome, firefox, edge]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build for ${{ matrix.browser }}
        run: pnpm build:${{ matrix.browser }}
        
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-${{ matrix.browser }}
          path: dist-${{ matrix.browser }}/
```
{% endraw %}

---

Release Branch Strategy

Follow a structured release workflow:

```
main (production)
  
   develop (development)
       
        feature/new-feature
  
   release/v1.2.0 (release branch)
        
         hotfix/critical-fix
```

Release Branch Workflow

{% raw %}
```yaml
Create release branch
- name: Create release branch
  run: |
    git checkout -b release/v${{ github.event.inputs.version }}
    # Make version changes
    git push origin release/v${{ github.event.inputs.version }}
```
{% endraw %}

---

Tag-Based Releases

Trigger releases on git tags:

```yaml
.github/workflows/publish.yml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Get version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_ENV
        
      - name: Build
        run: pnpm build
        
      - name: Create ZIP
        run: |
          cd dist
          zip -r ../extension.zip .
          
      - name: Upload to CWS
        run: npx chrome-webstore-upload-cli upload ...
```

---

Artifact Management

Store and manage build artifacts:

```yaml
- name: Upload release artifacts
  uses: actions/upload-artifact@v4
  with:
    name: release-assets
    path: |
      extension.zip
      changelog.md
    retention-days: 90
```

Download Artifacts in Subsequent Jobs

```yaml
- name: Download artifacts
  uses: actions/download-artifact@v4
  with:
    name: extension-build
```

---

E2E Tests in CI with Puppeteer

Test your extension in a real browser:

```yaml
.github/workflows/e2e.yml
name: E2E Tests

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Chrome
        run: |
          wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
          echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
          apt-get update
          apt-get install -y google-chrome-stable
          
      - name: Run E2E tests
        run: pnpm test:e2e
```

Puppeteer Test Example

```javascript
// tests/e2e/extension.spec.js
const { test, expect } = require('@playwright/test');

test('extension popup loads', async ({ page }) => {
  // Load unpacked extension
  const extensionPath = process.env.EXTENSION_PATH;
  
  const context = await page.context().browser().newContext({
    args: [`--disable-extensions-except=${extensionPath}`]
  });
  
  // Test extension functionality
  await context.close();
});
```

---

Secret Management for Store Credentials

Store credentials securely in GitHub Secrets:

| Secret | Description |
|--------|-------------|
| `CWS_CLIENT_ID` | Chrome Web Store OAuth2 client ID |
| `CWS_CLIENT_SECRET` | Chrome Web Store OAuth2 client secret |
| `CWS_REFRESH_TOKEN` | Chrome Web Store refresh token |
| `CWS_EXTENSION_ID` | Your extension's unique ID |
| `AMO_API_KEY` | Firefox AMO API key |
| `AMO_API_SECRET` | Firefox AMO API secret |
| `EDGE_CLIENT_ID` | Edge Add-ons client ID |
| `EDGE_CLIENT_SECRET` | Edge Add-ons client secret |

---

Complete CI/CD Pipeline Example

{% raw %}
```yaml
.github/workflows/release.yml
name: Release Pipeline

on:
  push:
    tags:
      - 'v*'

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      
  build:
    needs: ci
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      
      - name: Package
        run: cd dist && zip -r ../extension.zip .
        
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension
          path: extension.zip
          
  publish:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: extension
          
      - name: Upload to CWS
        uses: asaskevich/chrome-webstore-upload-action@v1
        with:
          extension-id: ${{ secrets.CWS_EXTENSION_ID }}
          client-id: ${{ secrets.CWS_CLIENT_ID }}
          client-secret: ${{ secrets.CWS_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CWS_REFRESH_TOKEN }}
          upload-source: extension.zip
          action: publish
```
{% endraw %}

---

References

- [Chrome Web Store Publishing API](https://developer.chrome.com/docs/webstore/using-api)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Firefox web-ext Documentation](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

Related Guides

- [Publishing Guide](../publishing/publishing-guide.md). Manual publishing
- [Version Management](../publishing/version-management.md). Version strategies
- [Cross-Browser Extensions](./cross-browser-extensions.md). Multi-browser support
