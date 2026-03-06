# Manifest.json Field Reference

Complete reference for all manifest.json fields in Chrome Extension Manifest V3.

## Required Fields

### manifest_version
```json
"manifest_version": 3
```
Integer specifying the manifest version. Must be `3` for MV3 extensions.

### name
```json
"name": "My Extension"
```
String (max 45 characters) - the display name shown in Chrome Web Store and chrome://extensions.

### version
```json
"version": "1.0.0"
```
String (1-4 dot-separated integers) - extension version for updates.

---

## Recommended Fields

### description
```json
"description": "A brief description of what the extension does"
```
String (max 132 characters) - shown in Chrome Web Store listing.

### icons
```json
"icons": {
  "16": "images/icon16.png",
  "48": "images/icon48.png",
  "128": "images/icon128.png"
}
```
Object mapping size to icon path. Sizes: 16, 48, 128 (required for store).

### action
```json
"action": {
  "default_popup": "popup.html",
  "default_icon": { "16": "images/icon16.png" },
  "default_title": "My Extension"
}
```
Controls the toolbar icon click behavior. See UI section for full details.

---

## Background Scripts

### background.service_worker
```json
"background": {
  "service_worker": "background.js",
  "type": "module"
}
```
- `service_worker`: Path to the service worker file (required)
- `type`: Set to `"module"` for ES6 module support

---

## Content Scripts

### content_scripts
```json
"content_scripts": [
  {
    "matches": ["https://*.example.com/*"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle",
    "world": "ISOLATED"
  }
]
```
- `matches`: URL patterns to inject into
- `js`: Array of JS file paths to inject
- `css`: Array of CSS file paths to inject
- `run_at`: Timing - `"document_start"`, `"document_end"`, `"document_idle"`
- `world`: `"ISOLATED"` (default) or `"MAIN"` for shared scope with page

---

## Permissions

### permissions
```json
"permissions": ["storage", "alarms", "contextMenus"]
```
Array of API permissions and feature permissions.

### optional_permissions
```json
"optional_permissions": ["bookmarks", "geolocation"]
```
Permissions requested at runtime via `chrome.permissions.request()`.

### host_permissions
```json
"host_permissions": [
  "https://*.example.com/*",
  "*://*/*"
]
```
URL patterns for website access (shown as install warnings).

### optional_host_permissions
```json
"optional_host_permissions": ["https://*/*"]
```
Host permissions requested at runtime.

---

## User Interface

### action
```json
"action": {
  "default_popup": "popup.html",
  "default_icon": {
    "16": "images/toolbar-icon-16.png",
    "32": "images/toolbar-icon-32.png"
  },
  "default_title": "Click to open",
  "default_badged_icon": "images/badge.png"
}
```
Toolbar icon configuration. Use `default_popup` for popup UI, or handle `onClicked` event.

### side_panel
```json
"side_panel": {
  "default_path": "sidepanel.html"
}
```
Enables side panel UI. Requires `"sidePanel"` permission.

### options_page
```json
"options_page": "options.html"
```
Legacy options page URL (opens in new tab).

### options_ui
```json
"options_ui": {
  "page": "options.html",
  "open_in_tab": true
}
```
Modern options page with additional configuration options.

### chrome_url_overrides
```json
"chrome_url_overrides": {
  "newtab": "newtab.html"
}
```
Overrides built-in Chrome pages: `"newtab"`, `"history"`, `"bookmarks"`.

---

## Commands

### commands
```json
"commands": {
  "toggle-feature": {
    "suggested_key": {
      "default": "Ctrl+Shift+1",
      "mac": "MacCtrl+Shift+1"
    },
    "description": "Toggle the feature"
  }
}
```
Keyboard shortcuts. Special keys: `"Ctrl"`, `"Alt"`, `"Shift"`, `"Meta"`, `"Command"`, `"MacCtrl"`.

---

## Web Accessible Resources

### web_accessible_resources
```json
"web_accessible_resources": [
  {
    "resources": ["images/*.png", "fonts/*"],
    "matches": ["https://*.example.com/*"],
    "extension_ids": ["kpdbobohjnfdddbhilkiclpgebbdgfjp"],
    "use_dynamic_url": true
  }
]
```
- `resources`: Paths accessible to web pages
- `matches`: URL patterns that can access
- `extension_ids`: Specific extensions allowed (default: all)
- `use_dynamic_url`: Generates unique URL per session (MV3+)

---

## Content Security Policy

### content_security_policy
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'",
  "sandbox": "sandbox allow-scripts; script-src 'self'"
}
```
- `extension_pages`: CSP for extension pages (default restricts to `'self'`)
- `sandbox`: CSP for sandboxed extension pages

---

## Other Fields

### externally_connectable
```json
"externally_connectable": {
  "matches": ["https://example.com/*"],
  "accepts_tls_channel_id": false
}
```
Allows communication with specific web pages or extensions.

### oauth2
```json
"oauth2": {
  "client_id": "your-client-id.apps.googleusercontent.com",
  "scopes": ["https://www.googleapis.com/auth/drive"]
}
```
OAuth 2.0 configuration for authentication flows.

### declarative_net_request
```json
"declarative_net_request": {
  "rule_resources": [{
    "id": "ruleset_1",
    "enabled": true,
    "path": "rules.json"
  }]
}
```
Declarative network request rules for modifying network requests.

### tts_engine
```json
"tts_engine": {
  "voices": [
    { "voice_name": "My Voice", "lang": "en-US", "gender": "male" }
  ]
}
```
Text-to-speech engine implementation.

### sandbox
```json
"sandbox": {
  "pages": ["sandboxed.html"],
  "content_security_policy": "sandbox allow-scripts"
}
```
Sandboxed pages with custom CSP.

### incognito
```json
"incognito": "spanning"
```
- `"spanning"`: Single instance across normal and incognito
- `"split"`: Separate background script in incognito

### minimum_chrome_version
```json
"minimum_chrome_version": "120"
```
Minimum Chrome version required (e.g., "120", "120.0.1").

### key
```json
"key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
```
RSA public key for extension identity (used in unpacked extensions).

### update_url
```json
"update_url": "https://example.com/update.xml"
```
Custom update URL for self-hosted extensions.

### homepage_url
```json
"homepage_url": "https://example.com"
```
Extension homepage link.

### author
```json
"author": "Your Name"
```
Extension author (shown in chrome://extensions).

### short_name
```json
"short_name": "MyExt"
```
Short name for limited UI space (max 12 characters).

### default_locale
```json
"default_locale": "en"
```
Default locale for i18n (used with `_locales` folder).

### offline_enabled
```json
"offline_enabled": false
```
Whether extension works offline (default: true).

---

## Examples

### Minimal Manifest
```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "action": {
    "default_popup": "popup.html"
  }
}
```

### Full-Featured Manifest
```json
{
  "manifest_version": 3,
  "name": "My Full-Featured Extension",
  "short_name": "MyExt",
  "version": "1.0.0",
  "description": "A comprehensive Chrome extension example",
  "author": "Your Name",
  "homepage_url": "https://example.com",
  "default_locale": "en",
  "offline_enabled": true,
  "minimum_chrome_version": "120",
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "images/icon16.png" },
    "default_title": "My Extension"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "permissions": ["storage", "alarms"],
  "optional_permissions": ["bookmarks", "geolocation"],
  "host_permissions": ["https://*.example.com/*"],
  "optional_host_permissions": ["https://*/*"],
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "commands": {
    "toggle-feature": {
      "suggested_key": {
        "default": "Ctrl+Shift+1",
        "mac": "MacCtrl+Shift+1"
      },
      "description": "Toggle the feature"
    }
  },
  "web_accessible_resources": [
    {
      "resources": ["images/*"],
      "matches": ["https://*.example.com/*"]
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

---

## See Also
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/mv3/manifest/)
- [Manifest V3 Migration Guide](../mv3/manifest-v3-migration.md)
- [Permissions Best Practices](../permissions/best-practices.md)
