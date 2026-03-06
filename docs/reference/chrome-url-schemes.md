# Chrome URL Schemes Reference

## Overview

Chrome and Chrome extensions use several special URL schemes for different purposes. Understanding these schemes is essential for content script matching, permissions configuration, and proper navigation within extensions.

This reference documents the URL schemes you'll encounter when building Chrome extensions and explains what each scheme supports.

## chrome:// URLs

Chrome's internal pages use the `chrome://` URL scheme. These are built-in pages that provide access to browser settings, extension management, and debugging tools.

### Available chrome:// URLs

| URL | Description |
|-----|-------------|
| `chrome://extensions` | Extension management page |
| `chrome://extensions/shortcuts` | Configure keyboard shortcuts for extensions |
| `chrome://settings` | Chrome settings and preferences |
| `chrome://flags` | Experimental features and flags |
| `chrome://policy` | Enterprise policy management |
| `chrome://serviceworker-internals` | Service worker debugging and diagnostics |
| `chrome://downloads` | Download history manager |
| `chrome://history` | Browsing history viewer |
| `chrome://bookmarks` | Bookmark manager |

### Important Limitations

Extensions **cannot** inject content scripts into `chrome://` pages. This is a deliberate security restriction. You also cannot use `chrome://` URLs in the `matches` field of content script declarations.

```json
// This will NOT work
{
  "content_scripts": [{
    "matches": ["chrome://extensions/*"],
    "js": ["content.js"]
  }]
}
```

## chrome-extension:// URLs

Extensions use the `chrome-extension://` scheme to reference their own resources. This scheme is essential for loading extension assets.

### URL Format

```
chrome-extension://{extension-id}/{path}
```

For example, if your extension ID is `abcdefghijklmnopqrstuvwxyz012345` and you have an icon at `images/icon.png`, the full URL would be:

```
chrome-extension://abcdefghijklmnopqrstuvwxyz012345/images/icon.png
```

### Getting URLs Programmatically

Use `chrome.runtime.getURL()` to get the full extension URL for any resource:

```javascript
// Get URL for a resource within your extension
const iconUrl = chrome.runtime.getURL('images/icon.png');
console.log(iconUrl); // chrome-extension://{id}/images/icon.png

// Useful for:
// - Setting CSS background images
// - Loading scripts or stylesheets
// - Embedding iframes
// - Creating download links
```

### Web-Accessible Resources

By default, extension resources are not accessible from web pages. To make resources available, declare them as web-accessible in `manifest.json`:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/icon.png", "content/*"],
      "matches": ["https://example.com/*"]
    }
  ]
}
```

Only resources listed here can be loaded by web pages.

## about: URLs

Chrome supports several `about:` URLs for built-in pages:

| URL | Description |
|-----|-------------|
| `about:blank` | Empty page |
| `about:newtab` | New tab page |
| `about:version` | Chrome version information |
| `about:history` | Browsing history |

### Special Case: about:blank

**Important**: Content scripts **can** run on `about:blank` pages. This makes it useful for extensions that need to create blank pages for intermediate processing or when using the page as a canvas for content script operations.

## data: URLs

Data URLs embed content directly in the URL itself using the format `data:{mime-type};base64,{data}`.

### Limitations for Extensions

- Content scripts **do NOT** run on `data:` URLs
- You **cannot** navigate to `data:` URLs using `chrome.tabs.update()`
- However, `data:` URLs can be used within extension pages for:
  - Inline images
  - Iframe sources
  - CSS content

```javascript
// This won't run content scripts
chrome.tabs.update(tabId, { url: 'data:text/html,<h1>Hello</h1>' });
// The above will not execute content scripts
```

## blob: URLs

Blob URLs are created dynamically using `URL.createObjectURL()` and represent objects in memory.

### Key Characteristics

- Scoped to the context that created them
- Valid only within the same origin
- Must be revoked using `URL.revokeObjectURL()` when no longer needed
- Useful for downloading dynamically generated content

```javascript
// Create a blob URL for downloading generated content
const blob = new Blob(['Hello, World!'], { type: 'text/plain' });
const url = URL.createObjectURL(blob);

// Create a download link
const a = document.createElement('a');
a.href = url;
a.download = 'hello.txt';
a.click();

// Clean up
URL.revokeObjectURL(url);
```

## file:// URLs

Accessing local files requires special handling in Chrome extensions.

### Requirements

- The extension must have **"Allow access to file URLs"** enabled in `chrome://extensions`
- This permission is **not enabled by default** for security reasons
- Content scripts can match `file://` URLs when the appropriate permission is granted

```json
{
  "permissions": [
    "file://*/*"
  ],
  "content_scripts": [{
    "matches": ["file://*/*"],
    "js": ["content.js"]
  }]
}
```

### Security Considerations

Be cautious when granting file URL access, as it allows the extension to read any local file the user has access to.

## URL Matching Patterns

Understanding what your match patterns can and cannot match is critical for proper content script and permission configuration.

### Pattern Syntax

| Pattern | Matches |
|---------|---------|
| `*://*/*` | All HTTP and HTTPS URLs (the `*` scheme matches http and https only) |
| `https://*/*` | All HTTPS URLs |
| `https://example.com/*` | All paths on example.com |
| `<all_urls>` | HTTP, HTTPS, and file URLs (not chrome://, about:, data:, etc.) |

### What `<all_urls>` Does NOT Match

The `<all_urls>` special value does **NOT** match:

- `chrome://*` URLs
- `chrome-extension://` URLs
- `about:` URLs
- `data:` URLs
- `blob:` URLs

Note: `<all_urls>` **does** match `file://` URLs, but the user must enable "Allow access to file URLs" for the extension. The `*://*/*` pattern matches only `http` and `https` URLs (not `file://`).

### Recommended Patterns

```json
{
  "content_scripts": [{
    // For HTTP and HTTPS only
    "matches": ["*://*/*"],
    "js": ["content.js"]
  }],
  "permissions": [
    // Explicitly specify what you need
    "activeTab",
    "storage"
  ]
}
```

## What Extensions Can and Cannot Access

### CAN Access

- `http://*/*` - HTTP websites (with permission)
- `https://*/*` - HTTPS websites (with permission)
- `ftp://*/*` - FTP sites (with permission)
- `file://*/*` - Local files (with permission and user approval)
- `about:blank` - Empty page (special case)

### CANNOT Access

- `chrome://*` - Chrome internal pages
- `chrome-extension://` - Other extensions' resources
- `about:` (most) - About pages except `about:blank`
- `data:` - Cannot run content scripts
- `blob:` - Cannot run content scripts directly

### Special Cases

- **about:blank**: Accessible and can run content scripts
- **Your own extension**: Can always access `chrome-extension://` your own extension's resources

## Cross-References

For more information, see:

- [Manifest Fields Reference](manifest-fields.md) - Complete manifest.json documentation
- [Permissions Model](guides/permissions-model.md) - Understanding extension permissions
- [Web Accessible Resources](mv3/web-accessible-resources.md) - Configuring accessible resources
