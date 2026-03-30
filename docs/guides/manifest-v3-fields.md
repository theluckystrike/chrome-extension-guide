---
layout: default
title: "Chrome Extension Manifest V3 Fields. Developer Guide"
description: "Learn Chrome extension manifest v3 fields with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/manifest-v3-fields/"
last_modified_at: 2026-01-15
---
Manifest.json Complete Field Reference (Manifest V3)

Every field available in a Chrome Extension MV3 manifest.json, explained with valid values, defaults, and working examples.

> For a concise overview, see [Manifest JSON Reference](manifest-json-reference.md).

---

Table of Contents {#table-of-contents}

1. [Required Fields](#1-required-fields)
2. [Recommended Fields](#2-recommended-fields)
3. [action](#3-action)
4. [background](#4-background)
5. [content_scripts](#5-content_scripts)
6. [permissions, optional_permissions, host_permissions](#6-permissions-optional_permissions-host_permissions)
7. [web_accessible_resources](#7-web_accessible_resources)
8. [content_security_policy](#8-content_security_policy)
9. [commands](#9-commands)
10. [omnibox](#10-omnibox)
11. [devtools_page](#11-devtools_page)
12. [chrome_url_overrides](#12-chrome_url_overrides)
13. [options_ui](#13-options_ui)
14. [side_panel](#14-side_panel)
15. [externally_connectable](#15-externally_connectable)
16. [storage](#16-storage)
17. [declarative_net_request](#17-declarative_net_request)
18. [Additional Fields](#18-additional-fields)
19. [Complete Example Manifest](#19-complete-example-manifest)

---

1. Required Fields {#1-required-fields}

manifest_version {#manifest-version}

```json
{ "manifest_version": 3 }
```

Must be the integer `3`. MV2 is deprecated and blocked on the Chrome Web Store.

name {#name}

```json
{ "name": "My Extension" }
```

Display name shown in the Web Store, toolbar, and `chrome://extensions`. Max 75 characters. Supports `__MSG_name__` for i18n.

version {#version}

```json
{ "version": "1.2.3" }
```

One to four dot-separated integers (each 0-65535). Not semver -- no pre-release tags. Chrome uses this for auto-update comparison.

Valid: `"1"`, `"1.0"`, `"1.0.0"`, `"1.0.0.1"`. Invalid: `"1.0.0-beta"`, `"v1.0"`.

---

2. Recommended Fields {#2-recommended-fields}

description {#description}

```json
{ "description": "A short summary of what this extension does" }
```

Max 132 characters. Shown in Web Store and `chrome://extensions`.

icons {#icons}

```json
{ "icons": { "16": "icons/16.png", "32": "icons/32.png", "48": "icons/48.png", "128": "icons/128.png" } }
```

| Size | Used For |
|------|----------|
| 16 | Favicon, context menus |
| 32 | Windows taskbar |
| 48 | Extensions management page |
| 128 | Web Store, install dialog |

PNG format. SVG not supported. Missing sizes are scaled from nearest available.

default_locale {#default-locale}

```json
{ "default_locale": "en" }
```

Required if `_locales/` directory exists. Must match a subdirectory name.

version_name {#version-name}

```json
{ "version_name": "1.2.3 beta" }
```

Human-readable version for display. Does not affect update logic.

---

3. action {#3-action}

Toolbar button. Replaces MV2's `browser_action` and `page_action`.

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/action16.png", "32": "icons/action32.png" },
    "default_title": "Click to open"
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `default_popup` | string | none | HTML page shown on click |
| `default_icon` | string/object | Extension icon | Toolbar icon |
| `default_title` | string | Extension name | Hover tooltip |

If `default_popup` is omitted, `chrome.action.onClicked` fires on click. If set, `onClicked` does NOT fire.

---

4. background {#4-background}

```json
{ "background": { "service_worker": "background.js", "type": "module" } }
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `service_worker` | string | required | Path to the service worker JS file |
| `type` | string | `"classic"` | `"module"` enables ES `import`/`export` |

Only one entry point. Use modules or a bundler for multiple files. No DOM, no `window`, terminates after ~30s idle.

---

5. content_scripts {#5-content-scripts}

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle",
    "match_about_blank": false,
    "match_origin_as_fallback": false,
    "world": "ISOLATED",
    "all_frames": false,
    "exclude_matches": ["https://example.com/admin/*"],
    "include_globs": ["*example*"],
    "exclude_globs": ["*private*"]
  }]
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `matches` | string[] | required | URL match patterns for injection |
| `js` | string[] | `[]` | JavaScript files to inject (in order) |
| `css` | string[] | `[]` | CSS files to inject |
| `run_at` | string | `"document_idle"` | `"document_start"`, `"document_end"`, or `"document_idle"` |
| `match_about_blank` | boolean | `false` | Inject into `about:blank` frames |
| `match_origin_as_fallback` | boolean | `false` | Inject into `about:`, `data:`, `blob:` frames whose creator matches |
| `world` | string | `"ISOLATED"` | `"ISOLATED"` (own JS context) or `"MAIN"` (page's context) |
| `all_frames` | boolean | `false` | Inject into all frames, not just top |
| `exclude_matches` | string[] | `[]` | URL patterns to skip |
| `include_globs` | string[] | `[]` | Additional glob filter (must also match `matches`) |
| `exclude_globs` | string[] | `[]` | Glob patterns to skip |

run_at: `document_start` runs after CSS but before DOM/scripts. `document_end` runs after DOM completes (like DOMContentLoaded). `document_idle` runs after `document_end` or `window.onload`, whichever is first.

---

6. permissions, optional_permissions, host_permissions {#6-permissions-optional-permissions-host-permissions}

permissions {#permissions}

Granted at install. User sees these during installation.

```json
{ "permissions": ["activeTab", "alarms", "storage", "scripting", "tabs", "notifications"] }
```

Common permissions: `activeTab`, `alarms`, `bookmarks`, `clipboardRead`, `clipboardWrite`, `contextMenus`, `cookies`, `debugger`, `declarativeContent`, `declarativeNetRequest`, `declarativeNetRequestFeedback`, `desktopCapture`, `downloads`, `favicon`, `gcm`, `geolocation`, `history`, `identity`, `idle`, `management`, `nativeMessaging`, `notifications`, `offscreen`, `pageCapture`, `power`, `printing`, `privacy`, `scripting`, `search`, `sessions`, `sidePanel`, `storage`, `system.cpu`, `system.display`, `system.memory`, `system.storage`, `tabCapture`, `tabGroups`, `tabs`, `topSites`, `tts`, `unlimitedStorage`, `webNavigation`, `webRequest`.

Key notes:
- `activeTab` -- temporary host permission on user click; preferred over broad hosts
- `tabs` -- needed for `Tab.url`, `Tab.title`, `Tab.favIconUrl`
- `unlimitedStorage` -- removes 10 MB limit on `chrome.storage.local`

optional_permissions {#optional-permissions}

Requested at runtime via `chrome.permissions.request()`. Not shown at install.

```json
{ "optional_permissions": ["bookmarks", "history"] }
```

host_permissions {#host-permissions}

URL patterns for sites the extension can access.

```json
{ "host_permissions": ["https://*.example.com/*", "*://mail.google.com/*"] }
```

Match pattern format: `<scheme>://<host>/<path>`. Special: `<all_urls>`. In MV3, users can restrict host access at runtime.

optional_host_permissions {#optional-host-permissions}

```json
{ "optional_host_permissions": ["https://*/*"] }
```

Request at runtime with `chrome.permissions.request({ origins: [...] })`.

---

7. web_accessible_resources {#7-web-accessible-resources}

Files web pages can access via `chrome.runtime.getURL()`.

```json
{
  "web_accessible_resources": [{
    "resources": ["images/logo.png", "styles/inject.css"],
    "matches": ["https://*.example.com/*"]
  }, {
    "resources": ["scripts/inject.js"],
    "extension_ids": ["other-ext-id"],
    "use_dynamic_url": true
  }]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resources` | string[] | Yes | File paths (supports `*` wildcards) |
| `matches` | string[] | Conditional | Origins that can access the resources |
| `extension_ids` | string[] | Conditional | Other extensions that can access them |
| `use_dynamic_url` | boolean | No | URL changes per session to prevent fingerprinting |

Either `matches` or `extension_ids` must be provided.

---

8. content_security_policy {#8-content-security-policy}

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts; script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  }
}
```

| Field | Applies To | Notes |
|-------|-----------|-------|
| `extension_pages` | Popup, options, all extension HTML | No remote sources, no `unsafe-eval`, no `unsafe-inline`. `wasm-unsafe-eval` allowed. |
| `sandbox` | Pages in the `sandbox` manifest key | `unsafe-eval` and `unsafe-inline` allowed |

---

9. commands {#9-commands}

```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": { "default": "Ctrl+Shift+Y", "mac": "Command+Shift+Y" },
      "description": "Open popup"
    },
    "toggle-feature": {
      "suggested_key": { "default": "Alt+Shift+T" },
      "description": "Toggle feature"
    }
  }
}
```

Reserved names: `_execute_action` (opens popup/fires onClicked), `_execute_side_panel` (opens side panel). All others fire `chrome.commands.onCommand`.

Key combos must include `Ctrl` or `Alt`. Keys: `A`-`Z`, `0`-`9`, `Comma`, `Period`, `Home`, `End`, `PageUp`, `PageDown`, `Space`, `Insert`, `Delete`, arrows, media keys. Omit `suggested_key` to let users assign via `chrome://extensions/shortcuts`.

---

10. omnibox {#10-omnibox}

```json
{ "omnibox": { "keyword": "ext" } }
```

When the user types `ext` then presses Tab or Space, Chrome activates your extension's omnibox mode. Handle input with:

```javascript
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  suggest([
    { content: text + ' option1', description: 'First suggestion for <match>' + text + '</match>' },
    { content: text + ' option2', description: 'Second suggestion' }
  ]);
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  // disposition: 'currentTab', 'newForegroundTab', 'newBackgroundTab'
  const url = `https://example.com/search?q=${encodeURIComponent(text)}`;
  if (disposition === 'currentTab') {
    chrome.tabs.update({ url });
  } else {
    chrome.tabs.create({ url });
  }
});
```

---

11. devtools_page {#11-devtools-page}

```json
{ "devtools_page": "devtools.html" }
```

HTML file that runs in the DevTools context. It is loaded each time DevTools opens and typically creates panels or sidebars:

```javascript
// devtools.js (loaded by devtools.html)
chrome.devtools.panels.create('My Panel', 'icons/panel.png', 'panel.html');

chrome.devtools.panels.elements.createSidebarPane('Props', (sidebar) => {
  sidebar.setExpression('document.querySelector("body").dataset');
});
```

The DevTools page cannot access the inspected page directly. Use `chrome.devtools.inspectedWindow.eval()` or messaging through the background service worker.

---

12. chrome_url_overrides {#12-chrome-url-overrides}

```json
{ "chrome_url_overrides": { "newtab": "newtab.html" } }
```

Overridable pages: `newtab`, `history`, `bookmarks`. One per key. Only one extension can override each page.

---

13. options_ui {#13-options-ui}

```json
{ "options_ui": { "page": "options.html", "open_in_tab": false } }
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | string | required | Options HTML file |
| `open_in_tab` | boolean | `false` | `false` = embedded in chrome://extensions; `true` = new tab |

---

14. side_panel {#14-side-panel}

```json
{ "side_panel": { "default_path": "sidepanel.html" } }
```

Requires `"sidePanel"` permission. Opens beside page content. Control programmatically with `chrome.sidePanel.open()` and `chrome.sidePanel.setOptions()`.

---

15. externally_connectable {#15-externally-connectable}

```json
{
  "externally_connectable": {
    "matches": ["https://*.example.com/*"],
    "ids": ["other-ext-id", "*"],
    "accepts_tls_channel_id": false
  }
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `matches` | string[] | `[]` | Web pages that can connect (must include second-level domain) |
| `ids` | string[] | `[]` | Extension IDs (`"*"` = all extensions) |
| `accepts_tls_channel_id` | boolean | `false` | Accept TLS channel IDs |

If omitted, all extensions can connect but no web pages can.

---

16. storage {#16-storage}

Declares a managed storage schema for enterprise policy configuration.

```json
{ "storage": { "managed_schema": "schema.json" } }
```

The schema file uses JSON Schema format to define enterprise-managed settings:

```json
{
  "type": "object",
  "properties": {
    "serverUrl": { "type": "string", "description": "Corporate API endpoint" },
    "enableLogging": { "type": "boolean", "description": "Enable debug logging" },
    "blockedDomains": { "type": "array", "items": { "type": "string" } }
  }
}
```

Administrators set these values via Chrome enterprise policies. Read them with:

```javascript
const config = await chrome.storage.managed.get(['serverUrl', 'enableLogging']);
```

Managed storage is read-only from the extension's perspective.

---

17. declarative_net_request {#17-declarative-net-request}

```json
{
  "declarative_net_request": {
    "rule_resources": [
      { "id": "ruleset_1", "enabled": true, "path": "rules/block.json" },
      { "id": "ruleset_2", "enabled": false, "path": "rules/redirect.json" }
    ]
  }
}
```

Max 100 static rulesets (since Chrome 120; was 50 before), 50 enabled simultaneously (since Chrome 120; was 10 before), 300,000 total static rules shared across all extensions. Disabled rulesets toggled at runtime with `chrome.declarativeNetRequest.updateEnabledRulesets()`.

---

18. Additional Fields {#18-additional-fields}

| Field | Example | Description |
|-------|---------|-------------|
| `sandbox` | `{ "pages": ["sandbox.html"] }` | Pages with relaxed CSP (can use eval) |
| `minimum_chrome_version` | `"116"` | Minimum Chrome version for install |
| `incognito` | `"spanning"` | `"spanning"` (shared), `"split"` (separate), `"not_allowed"` |
| `update_url` | `"https://example.com/updates.xml"` | Self-hosted update URL (not for Web Store) |
| `author` | `{ "email": "dev@example.com" }` | Author info |
| `homepage_url` | `"https://example.com"` | Link shown in chrome://extensions |
| `short_name` | `"MyExt"` | Short display name (max 12 chars) |
| `key` | `"MIIBIjANBg..."` | Public key to preserve extension ID in dev |
| `oauth2` | `{ "client_id": "...", "scopes": [...] }` | For `chrome.identity.getAuthToken()` |
| `export` / `import` | See docs | Shared modules between extensions |

---

19. Complete Example Manifest {#19-complete-example-manifest}

```json
{
  "manifest_version": 3,
  "name": "Productivity Tracker",
  "version": "2.1.0",
  "description": "Track time spent on websites and boost your productivity",
  "default_locale": "en",
  "minimum_chrome_version": "116",

  "icons": {
    "16": "icons/16.png", "32": "icons/32.png",
    "48": "icons/48.png", "128": "icons/128.png"
  },

  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/action16.png", "32": "icons/action32.png" },
    "default_title": "View Stats"
  },

  "background": { "service_worker": "background.js", "type": "module" },

  "content_scripts": [{
    "matches": ["https://*/*"],
    "js": ["content/tracker.js"],
    "run_at": "document_idle"
  }],

  "permissions": ["activeTab", "alarms", "notifications", "storage", "tabs", "sidePanel"],
  "optional_permissions": ["history", "bookmarks"],
  "host_permissions": ["https://*.example.com/*"],
  "optional_host_permissions": ["https://*/*"],

  "web_accessible_resources": [{
    "resources": ["images/*", "styles/inject.css"],
    "matches": ["https://*/*"]
  }],

  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },

  "options_ui": { "page": "options.html", "open_in_tab": false },
  "side_panel": { "default_path": "sidepanel.html" },

  "commands": {
    "_execute_action": {
      "suggested_key": { "default": "Ctrl+Shift+P", "mac": "Command+Shift+P" },
      "description": "Open popup"
    }
  },

  "externally_connectable": { "matches": ["https://*.example.com/*"] },
  "storage": { "managed_schema": "schema/managed.json" },

  "declarative_net_request": {
    "rule_resources": [{ "id": "trackers", "enabled": true, "path": "rules/trackers.json" }]
  }
}
```

---

Further Reading {#further-reading}

- [Extension Architecture](extension-architecture.md)
- [Permissions Model](permissions-model.md)
- [MV2 to MV3 Migration Guide](mv2-to-mv3-migration.md)
- [Content Script Patterns](content-script-patterns.md)
- [Service Worker Lifecycle](service-worker-lifecycle.md)

Related Articles {#related-articles}

Related Articles

- [Manifest Fields](../reference/manifest-fields.md)
- [Manifest Reference](../guides/manifest-json-reference.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
