---
layout: default
title: "Chrome Extension Edge Migration — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-migration-edge/"
---
# Porting Chrome Extensions to Microsoft Edge

Microsoft Edge is built on the Chromium engine, which means most Chrome extensions can be ported with minimal or no modifications. This guide covers the key considerations for publishing your extension on the Edge Add-ons store.

## Compatibility Overview {#compatibility-overview}

Edge is Chromium-based, so Chrome extensions typically work without changes. The `chrome.*` namespace is fully supported. Edge also supports the `browser.*` namespace (Promise-based, similar to Firefox) if you prefer cross-browser compatibility.

### Manifest Support {#manifest-support}

Both Manifest V2 and Manifest V3 are supported in Edge. However, we recommend migrating to MV3 for future-proofing and better compatibility across browsers.

## Key Differences {#key-differences}

### Edge-Specific APIs {#edge-specific-apis}

Edge provides some unique APIs beyond Chrome:
- `sidePanel` API: Similar to Chrome's side panel but with different behavior
- Enterprise APIs: Additional group policy support for organizational deployments

### Feature Detection {#feature-detection}

Always check for Edge-specific features before using them:

```javascript
// Edge detection
const isEdge = navigator.userAgent.includes('Edg/');

if (isEdge && window.sidePanel) {
  // Use Edge-specific side panel API
}
```

### Build Script for Dual Publishing {#build-script-for-dual-publishing}

Create a build configuration that works for both stores:

```javascript
// build.config.js
const config = {
  chrome: {
    store: 'Chrome Web Store',
    output: 'dist/chrome'
  },
  edge: {
    store: 'Edge Add-ons',
    output: 'dist/edge'
  }
};

module.exports = config;
```

## Edge Add-ons Store {#edge-add-ons-store}

### Submission Process {#submission-process}

1. Create a Microsoft account
2. Register as an Edge extension developer
3. Upload the same ZIP file (identical to CWS)
4. Provide store-specific metadata:
   - Edge-specific keywords
   - Screenshots optimized for Edge store
   - Privacy policy URL

### Store Listing Optimization {#store-listing-optimization}

- Add "Edge" and "Microsoft" to keywords
- Use screenshots that show the extension in Edge
- Highlight Edge-specific features in description

## Analytics {#analytics}

Set up separate analytics for Edge users:

```javascript
// Separate tracking for Edge
const analytics = isEdge ? 'UA-Edge-XXXX' : 'UA-Chrome-XXXX';
```

## Review Process {#review-process}

Edge's review process is similar to CWS but typically faster (24-48 hours). They have similar policies but may be more lenient on certain enterprise-focused extensions.

## Testing {#testing}

Load your extension in Edge for testing:
1. Open `edge://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select your extension directory

## Dual Publishing {#dual-publishing}

Maintain a single codebase for both stores:
- Use environment variables for store-specific configurations
- Test thoroughly on both browsers before release
- Monitor separate analytics for each platform

## Cross-Reference {#cross-reference}

- [Cross-Browser Extension Development](./cross-browser.md)
- [Browser Compatibility Reference](../reference/browser-compatibility.md)
- [Firefox Migration Guide](./chrome-extension-migration-firefox.md)

## Related Articles {#related-articles}

## Related Articles

- [Firefox Migration](../guides/chrome-extension-migration-firefox.md)
- [MV2 to MV3 Migration](../guides/mv2-to-mv3-migration.md)
