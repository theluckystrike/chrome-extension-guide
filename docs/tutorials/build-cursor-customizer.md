---
layout: default
title: "Chrome Extension Cursor Customizer — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-cursor-customizer/"
---
# Build a Custom Cursor Extension — Full Tutorial

## What We're Building {#what-were-building}
- Replace default cursor with custom images (PNG/SVG)
- Bundled cursor packs with different cursor states
- Per-site enable/disable with domain-level preferences
- Popup UI for cursor pack selection and preview
- Custom cursor upload in options page
- Uses `activeTab`, `storage` permissions with content script on all URLs

## manifest.json — MV3, activeTab + storage permissions, content script matching all URLs {#manifestjson-mv3-activetab-storage-permissions-content-script-matching-all-urls}

## Step 1: Manifest Configuration {#step-1-manifest-configuration}
- `activeTab` permission for user-initiated actions
- `storage` permission for persisting cursor preferences
- Content script registered with `"<all_urls>"` match pattern
- Background service worker for popup communication

```json
{
  "permissions": ["activeTab", "storage"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_start"
  }]
}
```

## Step 2: Content Script — CSS Cursor Injection {#step-2-content-script-css-cursor-injection}
- Apply custom cursor via CSS `cursor` property: `cursor: url('cursor.png'), auto;`
- Multiple fallback cursors: `cursor: url('pointer.svg') 0 0, url('pointer.png'), auto;`
- Apply to `html, body` for global cursor, specific elements for targeted styles

## Step 3: Cursor Pack Management {#step-3-cursor-pack-management}
- Bundled SVG/PNG cursors in extension: default, pointer, text, crosshair, wait
- Cursor states map to CSS pseudo-classes: `:hover`, `:active`, `:focus`
- Manifest `web_accessible_resources` for extension-relative cursor paths
- Fallback chain ensures graceful degradation

## Step 4: Popup UI — Preview and Selection {#step-4-popup-ui-preview-and-selection}
- Toolbar popup shows current cursor preview
- Grid of available cursor packs with thumbnails
- Click to apply immediately, updates storage
- Real-time preview before applying

## Step 5: Per-Site Enable/Disable Toggle {#step-5-per-site-enabledisable-toggle}
- Store domain-specific settings: `{ "example.com": true, "github.com": false }`
- Content script reads `chrome.storage.local.get([host])` on page load
- Popup shows toggle for current domain with enable/disable switch
- Sync to `chrome.storage.sync` for cross-device preferences

## Step 6: Custom Cursor Upload in Options Page {#step-6-custom-cursor-upload-in-options-page}
- Options page with file input accepting `.png`, `.svg`, `.cur`
- Convert uploaded image to base64, store in `chrome.storage.local`
- Validate size (max 32x32 for best compatibility)
- Provide upload UI with preview before saving

## Step 7: CSS Injection Strategy {#step-7-css-injection-strategy}
- Inject `<style id="custom-cursor-styles">` into page head
- Style rules: `html, body { cursor: url(...) !important; }`
- Target specific elements: `a, button { cursor: url(...) !important; }`
- Handle shadow DOM: traverse and inject into open shadow roots
- Remove/reapply on navigation via `MutationObserver`

## Step 8: Handling Cursor States {#step-8-handling-cursor-states}
- Different cursors per interaction state:
  - Default: `cursor: url('default.svg'), auto;`
  - Hover (links/buttons): `cursor: url('pointer.svg'), pointer;`
  - Text selection: `cursor: url('text.svg'), text;`
  - Click/active: `cursor: url('click.svg'), pointer;`
- Store per-domain overrides in `chrome.storage.local`

## Storage Schema {#storage-schema}
```javascript
{
  "cursorPacks": { "default": true, "gaming": false, "custom": false },
  "siteSettings": { "example.com": true, "github.com": false },
  "customCursors": { "default": "base64...", "pointer": "base64..." }
}
```

## Performance: CSS-Only Approach {#performance-css-only-approach}
- No JS cursor following (avoids performance issues)
- CSS `cursor` property handled by browser compositor
- Zero frame drops compared to mousemove-based tracking

## Handling iframes and Shadow DOM {#handling-iframes-and-shadow-dom}
- iframes: content script runs in each frame due to `"all_frames": true`
- Shadow DOM: query `document.querySelectorAll('*')` and check `shadowRoot`
- Re-apply on dynamic content via `MutationObserver`

## Cross-References {#cross-references}
- See [guides/content-script-patterns.md](../guides/content-script-patterns.md) for injection strategies
- Refer to [patterns/theming-dark-mode.md](../patterns/theming-dark-mode.md) for similar CSS injection patterns
- Deep dive: [api-reference/storage-api-deep-dive.md](../api-reference/storage-api-deep-dive.md)

## Testing {#testing}
- Test on various sites with different native cursors
- Verify per-site persistence after page reload
- Check custom upload works with different image formats
- Ensure iframes and shadow DOM properly receive custom cursors

## What You Learned {#what-you-learned}
- CSS `cursor` property with URL values and fallbacks
- Content script CSS injection with style element management
- Per-site storage with domain-level preferences
- Popup UI for real-time preview and selection
- Options page for custom file uploads
- Handling cursor states and interaction types
- Performance optimization with CSS-only approach
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
