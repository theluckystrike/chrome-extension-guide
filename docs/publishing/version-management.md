---
layout: default
title: "Chrome Extension Version Management — Publishing Guide"
description: "Manage extension versions effectively for smooth updates and rollbacks."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/publishing/version-management/"
---

# Version Management Strategies

## manifest.json Version Fields {#manifestjson-version-fields}
- `"version"`: Required. 1-4 dot-separated integers (e.g., `"1.2.3"` or `"1.2.3.4"`)
- `"version_name"`: Optional display string (e.g., `"1.2 Beta"`) — shown in CWS listing
- CWS requires `version` to increase with each upload — can't re-use or go backwards

## Semantic Versioning for Extensions {#semantic-versioning-for-extensions}
- **Major** (X.0.0): Breaking changes, major UI overhaul, permission changes
- **Minor** (0.X.0): New features, new permissions (optional)
- **Patch** (0.0.X): Bug fixes, performance improvements, copy changes
- Chrome's 4-part format: `major.minor.patch.build`

## Automated Version Bumping {#automated-version-bumping}
```bash
# npm version bumps package.json AND can run scripts
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.1 -> 1.1.0
npm version major  # 1.1.0 -> 2.0.0
```
- Sync manifest.json version from package.json in build step
- Or use a script to bump manifest.json directly

## CI/CD Version Management {#cicd-version-management}
```yaml
# GitHub Actions example
- name: Bump version
  run: |
    VERSION=$(jq -r '.version' manifest.json)
    PATCH=$(echo $VERSION | cut -d. -f3)
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION=$(echo $VERSION | sed "s/\.[0-9]*$/.$NEW_PATCH/")
    jq ".version = \"$NEW_VERSION\"" manifest.json > tmp && mv tmp manifest.json
```
- Trigger on tag push: `v1.2.3` -> build -> upload to CWS
- Cross-ref: `docs/guides/chrome-web-store-api.md`

## Git Tags for Releases {#git-tags-for-releases}
```bash
git tag -a v1.2.3 -m "Release 1.2.3: bug fixes"
git push origin v1.2.3
```
- One tag per CWS release
- Enables easy rollback reference and changelog generation

## Changelog Generation {#changelog-generation}
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Auto-generate changelog from git log between tags
- Tools: `conventional-changelog`, `release-please`

## Handling Hotfixes {#handling-hotfixes}
- Branch from the release tag, not main
- Bump patch version, submit to CWS
- CWS review typically 1-3 days — no instant deploys

## Rollback Strategies {#rollback-strategies}
- CWS now supports rollback to a previously published version via the Developer Dashboard
- You can also publish a NEW version with the fix if preferred
- Always keep previous release tag for reference
- Fast-track: have a "known good" build ready to publish

## Staged Rollouts {#staged-rollouts}
- CWS supports percentage rollouts (5%, 10%, 50%, 100%)
- Set via the Developer Dashboard or CWS API
- Monitor crash rates and user feedback at each stage
- Cross-ref: `docs/publishing/beta-testing.md` (upcoming)

## Beta Testing Channel {#beta-testing-channel}
- `"publishTarget": "trustedTesters"` — only visible to your testers
- Maintain separate `beta` branch with higher version number
- Promote beta to stable by re-publishing to default target

## Version in Extension UI {#version-in-extension-ui}
```javascript
const manifest = chrome.runtime.getManifest();
document.getElementById('version').textContent = `v${manifest.version}`;
```
- Show in options/about page
- Track with `@theluckystrike/webext-storage` for update detection (cross-ref: `docs/guides/extension-updates.md`)

## Common Mistakes {#common-mistakes}
- Uploading with same or lower version — CWS rejects it
- Using `version_name` where `version` is expected — they're different fields
- Not tagging releases — loses ability to reference specific builds
- Manual version bumps — error-prone, automate with CI
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
