---
layout: default
title: "Chrome Extension Manifest Reference — Developer Guide"
description: "Learn Chrome extension manifest reference with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/manifest-json-reference/"
---
# manifest.json Complete Reference

## Introduction {#introduction}
- The manifest is the blueprint of every Chrome extension
- MV3 required (`"manifest_version": 3`)
- JSON format, no comments allowed

## Required Fields {#required-fields}
- `manifest_version`: Must be `3`
- `name`: Extension display name (max 75 chars)
- `version`: One to four dot-separated integers (e.g., `"1.0.0"` or `"1.2.3.4"`), not semver — each integer 0–65535

## Recommended Fields {#recommended-fields}
- `description`: Short summary (max 132 chars) shown in Chrome Web Store
- `icons`: Object with `"16"`, `"32"`, `"48"`, `"128"` pixel PNG icons

## Background Service Worker {#background-service-worker}
```json
"background": {
  "service_worker": "background.js",
  "type": "module"
}
```
- `type: "module"` enables ES module imports
- Only ONE service worker file (use bundler or imports)
- Cross-ref: `docs/mv3/service-workers.md`

## Content Scripts {#content-scripts}
```json
"content_scripts": [{
  "matches": ["https://*.example.com/*"],
  "js": ["content.js"],
  "css": ["styles.css"],
  "run_at": "document_idle"
}]
```
- `matches`: URL patterns (required)
- `js`/`css`: Files to inject
- `run_at`: `"document_start"` | `"document_idle"` | `"document_end"`
- `all_frames`: boolean, inject into iframes too

## Action (Toolbar Button) {#action-toolbar-button}
```json
"action": {
  "default_popup": "popup.html",
  "default_icon": { "16": "icon16.png", "32": "icon32.png" },
  "default_title": "Click me"
}
```
- Replaces MV2's `browser_action` and `page_action`
- Cross-ref: `docs/mv3/action-api.md`

## Permissions {#permissions}
```json
"permissions": ["storage", "activeTab", "alarms"],
"optional_permissions": ["tabs", "bookmarks"],
"host_permissions": ["https://*.example.com/*"]
```
- `permissions`: Granted at install
- `optional_permissions`: Requested at runtime via `chrome.permissions.request()`
- `host_permissions`: Separate in MV3 (was in `permissions` in MV2)
- Use `@theluckystrike/webext-permissions` for runtime management

## Options Page {#options-page}
```json
"options_ui": {
  "page": "options.html",
  "open_in_tab": true
}
```

## Web Accessible Resources {#web-accessible-resources}
```json
"web_accessible_resources": [{
  "resources": ["images/*.png", "styles.css"],
  "matches": ["https://*.example.com/*"]
}]
```
- MV3 requires specifying which origins can access resources

## Commands (Keyboard Shortcuts) {#commands-keyboard-shortcuts}
```json
"commands": {
  "_execute_action": {
    "suggested_key": { "default": "Ctrl+Shift+Y" },
    "description": "Open popup"
  }
}
```

## Content Security Policy {#content-security-policy}
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```
- MV3 uses object format (not string like MV2)

## Internationalization {#internationalization}
- `"default_locale": "en"` — required if `_locales/` exists

## Other Fields {#other-fields}
- `devtools_page`, `side_panel`, `externally_connectable`, `minimum_chrome_version`, `incognito`, `storage`, `update_url`

## Common Mistakes {#common-mistakes}
- Missing `manifest_version: 3`
- Using MV2 keys like `browser_action` instead of `action`
- Forgetting `host_permissions` (MV3 separates these)
- Wrong icon sizes
- JSON syntax errors (no trailing commas, no comments)

## Related Articles {#related-articles}

- [Manifest Fields](../reference/manifest-fields.md)
- [Cheatsheet](../guides/cheatsheet.md)
