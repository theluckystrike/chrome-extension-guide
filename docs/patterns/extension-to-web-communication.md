---
layout: default
title: "Chrome Extension Extension To Web Communication. Best Practices"
description: "Communicate from extensions to web pages."
canonical_url: "https://bestchromeextensions.com/patterns/extension-to-web-communication/"
last_modified_at: 2026-01-15
---

Extension-to-Web Communication

This pattern describes how Chrome extensions communicate with websites they are not injected into. Unlike content scripts which run in the context of web pages, extension-to-web communication allows external websites to interact with your extension's backend.

Manifest Configuration: externally_connectable {#manifest-configuration-externally-connectable}

To enable communication from websites, declare the `externally_connectable` manifest key in your `manifest.json`:

```json
{
  "manifest_version": 3,
  "externally_connectable": {
    "matches": ["https://example.com/*", "https://*.example.org/*"]
  }
}
```

The `matches` array defines which websites can send messages to your extension. Omitting `matches` means no web pages can connect (only other extensions can). Note: `externally_connectable` is a manifest key, not a permission -- it does not go in the `permissions` array.

Sending Messages from Website to Extension {#sending-messages-from-website-to-extension}

Web pages use `chrome.runtime.sendMessage()` to communicate with the extension:

```javascript
// From a website
chrome.runtime.sendMessage(
  "extension-id-from-manifest",
  { action: "getUserData", token: "abc123" },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error("Extension not available");
    } else {
      console.log("Received:", response);
    }
  }
);
```

Receiving Messages in the Extension {#receiving-messages-in-the-extension}

The extension must set up a listener in its service worker or background script:

```javascript
// In background.js (MV3 service worker)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // Validate sender origin for security
  if (!sender.url.startsWith("https://trusted-site.com")) {
    sendResponse({ error: "Unauthorized" });
    return;
  }

  if (message.action === "getUserData") {
    // Process request and respond
    sendResponse({ data: { user: "example" } });
  }
  return true; // Keep message channel open for async response
});
```

Web-Accessible Resources {#web-accessible-resources}

Share static files with websites using `web_accessible_resources`:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/logo.png", "scripts/injected.js"],
      "matches": ["https://example.com/*"]
    }
  ]
}
```

Websites can then load these resources directly via URL.

Content Script as Bridge {#content-script-as-bridge}

For bidirectional communication, use a content script as intermediary:

1. Website posts to `window.postMessage()`
2. Content script listens and forwards to background
3. Background processes and responds back

```javascript
// Content script bridge
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  chrome.runtime.sendMessage(event.data);
});
```

DOM-Based Communication {#dom-based-communication}

For simple state sharing without message passing:

```javascript
// Extension sets data on page
document.body.dataset.extensionStatus = "active";
document.body.dataset.userId = "12345";

// Website reads data
const status = document.body.dataset.extensionStatus;
```

Or use CustomEvents for reactive communication:

```javascript
// Extension dispatches event
document.dispatchEvent(new CustomEvent("extensionReady", {
  detail: { apiVersion: 2 }
}));
```

Use Cases {#use-cases}

- Detect extension installation: Website checks `chrome.runtime.sendMessage` callback
- Extension provides API: Expose functionality like authentication, data processing
- Authentication bridge: Share auth state between extension and website

Security Best Practices {#security-best-practices}

Always validate the sender's origin:

```javascript
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const allowedOrigins = ["https://trusted.com", "https://app.trusted.com"];
  if (!allowedOrigins.includes(sender.origin)) {
    return sendResponse({ error: "Forbidden" });
  }
  // Process message...
});
```

Limit `externally_connectable` to specific domains rather than using wildcards.

Related Patterns {#related-patterns}

- [Extension to Extension Communication](./extension-to-extension.md)
- [Content Script Isolation Guide](../guides/content-script-isolation.md)
- [Web Accessible Resources](../mv3/web-accessible-resources.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
