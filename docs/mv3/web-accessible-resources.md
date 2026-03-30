---
layout: default
title: "Chrome Extension Web Accessible Resources. Manifest V3 Guide"
description: "Configure web accessible resources in Manifest V3 for content script and page access."
canonical_url: "https://bestchromeextensions.com/mv3/web-accessible-resources/"
last_modified_at: 2026-01-15
---

Web Accessible Resources in Manifest V3

Introduction {#introduction}
- Files in your extension that web pages and content scripts can access
- MV3 changes: must explicitly declare which origins can access which resources
- Security improvement over MV2's blanket `web_accessible_resources` array

MV2 vs MV3 {#mv2-vs-mv3}
- MV2: `"web_accessible_resources": ["images/*.png", "styles.css"]`. any page could access
- MV3: must specify `matches` (which origins) or `extension_ids` (which extensions)

manifest.json Setup {#manifestjson-setup}
```json
"web_accessible_resources": [{
  "resources": ["images/*.png", "inject.css", "widget.html"],
  "matches": ["https://*.example.com/*"]
}, {
  "resources": ["shared-data.json"],
  "extension_ids": ["abcdefghijklmnop"]
}, {
  "resources": ["content-styles.css"],
  "matches": ["<all_urls>"],
  "use_dynamic_url": true
}]
```

Accessing Resources {#accessing-resources}
```javascript
// From content script or web page
const url = chrome.runtime.getURL("images/icon.png");
// Returns: chrome-extension://<extension-id>/images/icon.png

// In content script. inject CSS
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = chrome.runtime.getURL("inject.css");
document.head.appendChild(link);
```

Fields {#fields}
- `resources`: Array of file paths/globs to expose
- `matches`: URL patterns for which web pages can access these resources
- `extension_ids`: Other extensions that can access (for inter-extension communication)
- `use_dynamic_url`: If true, resource URL changes per session (prevents fingerprinting)

use_dynamic_url {#use-dynamic-url}
- Default: false (static URL based on extension ID)
- When true: URL includes session-specific token
- Prevents websites from detecting extension by probing known URLs
- Trade-off: URL changes on browser restart, can't be hardcoded

Common Use Cases {#common-use-cases}
- CSS injection: Content script injects extension stylesheet into page
- Images/icons: Display extension branding in injected UI
- HTML widgets: Inject iframe with extension page into web page
- Fonts: Custom fonts used by injected content
- Shared data: JSON config files accessible to content scripts

Content Script + WAR Pattern {#content-script-war-pattern}
```javascript
// content.js. inject extension UI into page
const container = document.createElement("div");
container.innerHTML = `<iframe src="${chrome.runtime.getURL('widget.html')}" style="..."></iframe>`;
document.body.appendChild(container);
```
- iframe with `chrome-extension://` URL has limited API access; use `chrome.runtime.sendMessage()` to communicate with the service worker for full API access
- Communicate between iframe and content script via `window.postMessage` or `@theluckystrike/webext-messaging`

Security Considerations {#security-considerations}
- Only expose files that MUST be accessible. minimize attack surface
- Use `matches` to restrict to specific origins, not `<all_urls>`
- Enable `use_dynamic_url` to prevent extension fingerprinting
- Never expose sensitive files (config with API keys, internal scripts)
- Web pages CAN read exposed file contents via fetch. don't expose secrets

Common Mistakes {#common-mistakes}
- Exposing everything with `<all_urls>`. use specific origins
- Forgetting to declare resources. content script can't load them
- Using MV2 flat array format. must use MV3 object array format
- Not using `chrome.runtime.getURL()`. hardcoded paths won't work
- Exposing JavaScript files that contain sensitive logic
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
