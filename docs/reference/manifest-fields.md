# Chrome Extension Manifest V3 Reference

Complete reference for all manifest.json fields in Chrome Extension Manifest V3.

## Required Fields {#required-fields}

| Field | Type | Description |
|-------|------|-------------|
| `manifest_version` | integer | Must be `3` for MV3 |
| `name` | string | Extension name (max 45 chars) |
| `version` | string | Version string (e.g., "1.0.0") |

## Recommended Fields {#recommended-fields}

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Extension description (max 132 chars) |
| `icons` | object | Extension icons (16, 48, 128px) |
| `action` | object | Browser action configuration |

## Background Section {#background-section}

| Field | Type | Description |
|-------|------|-------------|
| `background.service_worker` | string | Path to service worker script |
| `background.type` | string | Set to `module` for ES modules |

```json
"background": {
  "service_worker": "background.js",
  "type": "module"
}
```

## Content Scripts {#content-scripts}

| Field | Type | Description |
|-------|------|-------------|
| `matches` | array | URL patterns to inject scripts |
| `js` | array | JavaScript files to inject |
| `css` | array | CSS files to inject |
| `run_at` | string | When to run: `document_idle`, `document_start`, `document_end` |
| `world` | string | Execution world: `MAIN` or `ISOLATED` (default: ISOLATED) |

```json
"content_scripts": [{
  "matches": ["<all_urls>"],
  "js": ["content.js"],
  "css": ["styles.css"],
  "run_at": "document_idle"
}]
```

## Permissions {#permissions}

| Field | Type | Description |
|-------|------|-------------|
| `permissions` | array | API permissions (e.g., "storage", "tabs") |
| `host_permissions` | array | Host permissions for URLs |
| `optional_permissions` | array | Permissions requested at runtime |

```json
"permissions": ["storage", "tabs"],
"host_permissions": ["<all_urls>"],
"optional_permissions": ["notifications"]
```

## UI Components {#ui-components}

| Field | Type | Description |
|-------|------|-------------|
| `action` | object | Toolbar icon and popup |
| `side_panel` | object | Side panel configuration |
| `options_ui` | object | Options page settings |
| `chrome_url_overrides` | object | Override browser pages |

```json
"action": {
  "default_popup": "popup.html",
  "default_icon": "icon.png"
},
"side_panel": {
  "default_path": "sidepanel.html"
},
"options_ui": {
  "page": "options.html",
  "open_in_tab": true
},
"chrome_url_overrides": {
  "newtab": "newtab.html"
}
```

## Web Accessible Resources {#web-accessible-resources}

| Field | Type | Description |
|-------|------|-------------|
| `web_accessible_resources` | array | Resources accessible from web pages |

```json
"web_accessible_resources": [{
  "resources": ["images/*", "styles/*.css"],
  "matches": ["<all_urls>"]
}]
```

## Content Security Policy {#content-security-policy}

| Field | Type | Description |
|-------|------|-------------|
| `content_security_policy` | object | CSP object with `extension_pages` and `sandbox` keys |

In MV3, `content_security_policy` is an object, not a string. The default enforced minimum is `script-src 'self' 'wasm-unsafe-eval'; object-src 'self'`.

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

## Other Extensions Features {#other-extensions-features}

| Field | Type | Description |
|-------|------|-------------|
| `commands` | object | Keyboard shortcuts |
| `externally_connectable` | object | Messaging with external apps |
| `oauth2` | object | OAuth2 configuration |
| `declarative_net_request` | object | Declarative Net Request rules |

```json
"commands": {
  "toggle-feature": {
    "suggested_key": "Ctrl+Shift+Y",
    "description": "Toggle feature"
  }
},
"declarative_net_request": {
  "rule_resources": [{
    "id": "ruleset_1",
    "enabled": true,
    "path": "rules.json"
  }]
}
```

## Minimal Manifest Example {#minimal-manifest-example}

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0"
}
```

## Full-Featured Manifest Example {#full-featured-manifest-example}

```json
{
  "manifest_version": 3,
  "name": "Full Featured Extension",
  "version": "1.0.0",
  "description": "A complete extension example",
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": "images/icon.png"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }],
  "permissions": ["storage", "tabs", "activeTab"],
  "host_permissions": ["<all_urls>"],
  "optional_permissions": ["notifications"],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  },
  "web_accessible_resources": [{
    "resources": ["images/*"],
    "matches": ["<all_urls>"]
  }],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  },
  "commands": {
    "toggle-feature": {
      "suggested_key": "Ctrl+Shift+Y",
      "description": "Toggle feature"
    }
  },
  "declarative_net_request": {
    "rule_resources": [{
      "id": "ruleset_1",
      "enabled": true,
      "path": "rules.json"
    }]
  }
}
```

## See Also {#see-also}

- [Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extensions GitHub Repository](https://github.com/GoogleChrome/chrome-extensions-samples)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
