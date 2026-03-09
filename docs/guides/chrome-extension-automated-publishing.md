---
layout: default
title: "Chrome Extension Automated Publishing — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-automated-publishing/"
---
# Automating Chrome Web Store Publishing with CI/CD

Automate your extension publishing workflow using CI/CD pipelines. This guide covers GitHub Actions, API setup, versioning, and best practices for production deployments.

---

## Chrome Web Store API Setup {#chrome-web-store-api-setup}

Before automating, set up API access in Google Cloud Console:

1. **Create a project** in [Google Cloud Console](https://console.cloud.google.com/)
2. **Enable Chrome Web Store API** — search for "Chrome Web Store API" in the API library
3. **Create OAuth2 credentials** — go to APIs & Services > Credentials > Create Credentials > OAuth2 Client ID (Desktop app)
4. **Get a refresh token** — follow the OAuth flow to obtain a refresh token for API access

> **Tip**: Service accounts are not supported for CWS API. Use OAuth2 refresh tokens for authentication.

---

## Authentication {#authentication}

Store your CWS credentials securely in GitHub Secrets:

| Secret | Description |
|--------|-------------|
| `CWS_CLIENT_ID` | OAuth2 client ID |
| `CWS_CLIENT_SECRET` | OAuth2 client secret |
| `CWS_REFRESH_TOKEN` | OAuth2 refresh token |
| `CWS_EXTENSION_ID` | Your extension's unique ID |

> **Security**: Never commit credentials to source control. Use GitHub Secrets or your CI/CD provider's secret management.

---

## CLI Tools {#cli-tools}

The `chrome-webstore-upload-cli` package provides easy CLI access:

```bash
# Install globally or use npx
npx chrome-webstore-upload-cli upload \
  --extension-id $CWS_EXTENSION_ID \
  --client-id $CWS_CLIENT_ID \
  --client-secret $CWS_CLIENT_SECRET \
  --refresh-token $CWS_REFRESH_TOKEN \
  --upload-source dist/extension.zip
```

---

## GitHub Actions Workflow {#github-actions-workflow}

Complete workflow that builds, packages, and publishes on tag push:

{% raw %}
```yaml
# .github/workflows/publish.yml
name: Publish to Chrome Web Store

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Build extension
        run: pnpm build
        
      - name: Create ZIP package
        run: |
          cd dist && zip -r ../extension.zip .
          
      - name: Upload to Chrome Web Store
        uses: asaskevich/chrome-webstore-upload-action@v1
        with:
          extension-id: ${{ secrets.CWS_EXTENSION_ID }}
          client-id: ${{ secrets.CWS_CLIENT_ID }}
          client-secret: ${{ secrets.CWS_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CWS_REFRESH_TOKEN }}
          upload-source: extension.zip
          
      - name: Publish to CWS
        uses: asaskevich/chrome-webstore-upload-action@v1
        with:
          extension-id: ${{ secrets.CWS_EXTENSION_ID }}
          client-id: ${{ secrets.CWS_CLIENT_ID }}
          client-secret: ${{ secrets.CWS_CLIENT_SECRET }}
          refresh-token: ${{ secrets.CWS_REFRESH_TOKEN }}
          action: publish
```
{% endraw %}

---

## Versioning Automation {#versioning-automation}

Sync `manifest.json` version from `package.json` or git tags:

```yaml
- name: Bump version in manifest
  run: |
    VERSION=${GITHUB_REF#refs/tags/v}
    jq --arg version "$VERSION" '.version = $version' manifest.json > tmp.json
    mv tmp.json manifest.json
```

Then create a tag to trigger the workflow:

```bash
git tag v1.2.3 -m "Release 1.2.3"
git push origin v1.2.3
```

---

## Publishing Stages {#publishing-stages}

Control when your extension goes live:

| Stage | Description | Use Case |
|-------|-------------|----------|
| **Upload (draft)** | Upload without publishing | Testing the build |
| **Trusted testers** | `publishTarget: trustedTesters` | Beta testing |
| **Public** | Visible to all users | Production release |

---

## Pre-Publish Checks {#pre-publish-checks}

Run these checks before uploading:

- **Lint** — `pnpm lint` for code quality
- **Test** — `pnpm test` to verify functionality
- **Size check** — Extension must be under 256MB (unpacked)
- **Verify ZIP contents** — Ensure all required files are included

---

## Rollback {#rollback}

To rollback to a previous version:

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Select your extension > Files
3. Click "Revert to previous version"

Or upload a previous tagged version:

```bash
git checkout v1.2.2
# Rebuild and upload
git push origin v1.2.2
```

---

## Multi-Browser Publishing {#multi-browser-publishing}

Publish to both Chrome Web Store and Firefox AMO in the same pipeline:

```yaml
- name: Publish to Firefox
  run: |
    npx web-ext upload --source-dir dist \
      --api-key $AMO_API_KEY \
      --api-secret $AMO_API_SECRET
```

> **Cross-ref**: `docs/guides/cross-browser.md` for multi-browser extension development.

---

## Semantic Release Integration {#semantic-release-integration}

Automate changelog and version bumping with semantic-release:

```yaml
# In package.json
{
  "release": {
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/changelog",
      "@semantic-release/github"
    ]
  }
}
```

Configure to trigger CWS publish on release:

```yaml
- name: Publish on release
  if: github.event_name == 'release'
  run: npx chrome-webstore-upload-cli publish
```

---

## Related Guides {#related-guides}

- [Publishing Guide](../publishing/publishing-guide.md) — Manual publishing process
- [CI/CD Pipeline](../guides/ci-cd-pipeline.md) — Build automation
- [Version Management](../publishing/version-management.md) — Version strategies
- [Chrome Web Store API](../guides/chrome-web-store-api.md) — API reference

## Related Articles {#related-articles}

## Related Articles

- [GitHub Actions CI/CD](../guides/github-actions-extension-ci-cd.md)
- [Chrome Web Store API](../guides/chrome-web-store-api.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
---

## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.