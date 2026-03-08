---
layout: default
title: "Chrome Extension GitHub Actions CI/CD — Developer Guide"
description: "Learn Chrome extension github actions ci/cd with this developer guide covering implementation, best practices, and code examples."
---
# GitHub Actions CI/CD for Chrome Extensions

Automating your extension pipeline with GitHub Actions eliminates manual build steps, reduces human error, and gives you confidence that every change works before it reaches users. This guide walks through setting up continuous integration and deployment for a Chrome extension project.

## Getting Started with Workflows

GitHub Actions uses workflow files stored in `.github/workflows/` at your repository root. Each workflow is a YAML file that defines triggers, jobs, and steps. For extensions, you'll typically want workflows that run on pull requests and pushes to your main branch.

A basic build and test workflow starts with defining when the workflow should execute. Most extension projects trigger on push to main, pull requests, and tagged releases. The workflow runs on ubuntu-latest as a reasonable default, though you may need multiple operating systems if your extension targets Firefox or Edge in addition to Chrome.

Your first workflow should validate that the extension builds successfully and passes basic tests. This means installing dependencies, running type checks if you use TypeScript, linting your code, and running any unit tests you have. Getting this foundation right early saves debugging time later.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

## Linting and Type Checking in CI

Linting catches stylistic issues and potential bugs before they reach production. ESLint is the standard choice for JavaScript and TypeScript projects, and most extension frameworks come with sensible defaults. Run linting as a separate step in your workflow so failures are clear.

Type checking with TypeScript adds another layer of safety. Even if your production code is JavaScript, running TypeScript in check mode validates your types without emitting code. This catches mismatched property names, incorrect API usage, and type inconsistencies across your codebase.

Consider running linting and type checking in parallel with your build step if your setup supports it. This reduces overall CI time while still catching all issues before merge.

## End-to-End Testing with Headless Chrome

Unit tests verify individual functions work correctly, but extensions interact with browser APIs and web pages in complex ways. End-to-end tests run your extension in a real browser environment, loading the extension and interacting with it as a user would.

Puppeteer and Playwright both work well for extension testing. Both libraries can load unpacked extensions and interact with popup pages, options pages, background scripts, and content scripts. Playwright's cross-browser support is particularly valuable since you can test Chrome, Firefox, and Edge with the same test code.

```javascript
// Example E2E test with Playwright
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    args: ['--disable-extensions-except=./dist']
  });
  
  const context = await browser.newContext();
  await context.extensions().load('./dist');
  
  const page = await context.newPage();
  // Test your extension functionality
})();
```

Run these tests in your CI pipeline on every pull request. Use headless mode since CI environments typically don't have displays. Make sure your build step produces the extension files before the test step runs.

## Building and Packaging the Zip

Chrome Web Store requires a zip file containing your extension. Most build tools like Vite, Webpack, or Rollup can produce this, but you may need a separate step to create the archive. The extension contents must include your manifest.json, all JavaScript files, CSS, HTML, and assets.

```yaml
- name: Build extension
  run: npm run build

- name: Package zip
  run: |
    cd dist
    zip -r extension.zip *
```

Store the generated zip as a workflow artifact so you can download and test it manually before publishing. This artifact also serves as a build record you can reference later if you need to debug issues with a specific release.

## Automated Publishing to Chrome Web Store

Manual uploads to the Chrome Web Store are time-consuming and error-prone. The chrome-webstore-upload-cli package automates this process, taking your credentials and zip file and handling the upload for you. You'll need to obtain your Chrome Web Store developer credentials and store them as secrets in your GitHub repository.

```yaml
- name: Publish to Chrome Web Store
  if: startsWith(github.ref, 'refs/tags/v')
  run: |
    npx chrome-webstore-upload-cli@latest \
      --extension-id ${{ secrets.EXTENSION_ID }} \
      --client-id ${{ secrets.CLIENT_ID }} \
      --client-secret ${{ secrets.CLIENT_SECRET }} \
      --refresh-token ${{ secrets.REFRESH_TOKEN }} \
      --upload-zip-file dist/extension.zip \
      --publish-target 'default'
```

This workflow publishes only when you create a version tag, giving you control over when releases go live. The publish-target option lets you publish to the default track, test track, or internal testing depending on your needs.

## Multi-Browser Build Matrix

If your extension targets multiple browsers, run your CI pipeline across all of them. GitHub Actions matrix strategy lets you define multiple browser environments and run tests in each one. Firefox uses the same extension format as Chrome for Manifest V2, but Manifest V3 extensions may need adjustments.

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        browser: ['chrome', 'firefox', 'edge']
        os: [ubuntu-latest, windows-latest]
    steps:
      - run: npm test -- --browser ${{ matrix.browser }}
```

Testing across browsers catches API differences and ensures your extension works for all users regardless of their browser choice.

## PR Preview Builds

Every pull request should produce a downloadable artifact that reviewers can load and test. This preview build lets team members verify changes work as expected before merging. Store the extension zip as an artifact and provide a link in the PR comments.

GitHub Actions can automatically comment on pull requests with download links using the pull-request action. This makes it easy for reviewers to grab the latest build and install it in their browser.

## Version Bumping Automation

Keeping version numbers synchronized across package.json, manifest.json, and git tags is tedious. Tools like standard-version or release-please automate this process. When you're ready to release, these tools bump the version, generate a changelog, and create a git tag.

```yaml
- name: Release
  if: startsWith(github.ref, 'refs/tags/v')
  run: npx standard-version
```

Combine version bumping with your publishing workflow so that tagging a release automatically bumps the version, builds the extension, and publishes it to the Chrome Web Store.

## Summary

Setting up CI/CD for your extension takes some initial effort but pays dividends quickly. Every pull request gets validated automatically, your extension builds consistently, and publishing becomes a single command. As your project grows, add more sophisticated checks like security scanning, performance benchmarking, and automated accessibility testing.

For extensions that need to reach users quickly and reliably, GitHub Actions provides the infrastructure you need without maintaining your own build servers. The combination of automated testing, artifact storage, and integrated publishing creates a smooth path from code to users.

If you're looking to streamline your extension development workflow further, zovo.one offers additional tools and resources for modern extension development.

## Related Articles

- [CI/CD Pipeline](../guides/ci-cd-pipeline.md)
- [Automated Publishing](../guides/chrome-extension-automated-publishing.md)
