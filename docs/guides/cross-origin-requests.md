---
layout: default
title: "Chrome Extension Cross-Origin Requests — CORS, Host Permissions, and Fetch API"
description: "Learn how Chrome extensions handle cross-origin requests in Manifest V3, including host permissions, CORS rules, Fetch API usage from background scripts, and content script limitations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/cross-origin-requests/"
---

# Chrome Extension Cross-Origin Requests

## Overview {#overview}

Cross-origin requests are a fundamental part of building Chrome extensions that interact with external APIs or fetch resources from third-party servers. Unlike regular web pages, Chrome extensions have a unique permission model that determines which origins they can access. Understanding how this works is essential for building extensions that can reliably communicate with external services.

In Manifest V3, the extension's ability to make cross-origin requests is controlled by host permissions declared in the manifest file. These permissions determine the scope of network access your extension will have, and getting them right is crucial for both functionality and user trust.

## Host Permissions {#host-permissions}

Host permissions in Chrome extensions specify which origins an extension can access. Unlike API permissions that grant access to specific Chrome APIs, host permissions allow your extension to make network requests to specified domains. You declare host permissions in the `host_permissions` field of your manifest.json file.

```json
{
  "host_permissions": [
    "https://api.example.com/*",
    "https://*.google.com/*",
    "<all_urls>"
  ]
}
```

The permission `https://api.example.com/*` grants access to all paths on that domain. Using wildcards like `https://*.google.com/*` allows access to multiple subdomains. The `<all_urls>` permission grants access to all URLs, but this requires careful consideration as it triggers additional warnings during installation and may affect your extension's review process in the Chrome Web Store.

When requesting host permissions, always be as specific as possible. Instead of requesting `<all_urls>`, specify the exact domains your extension needs to access. This follows the principle of least privilege and gives users more confidence in installing your extension.

## CORS in Manifest V3 {#cors-in-mv3}

Cross-Origin Resource Sharing (CORS) behaves differently in Chrome extensions compared to regular web pages. The same-origin policy still applies, but Chrome extensions have special privileges that modify how CORS works.

In the background service worker or other extension contexts (popup, options page), cross-origin requests bypass CORS restrictions when the appropriate host permissions are granted. This means you can make requests to external APIs without encountering CORS errors, provided your extension has the necessary permissions declared.

However, this relaxed CORS policy only applies within extension contexts. When your extension makes a request from a content script, the request is treated as coming from the page's origin due to how content scripts are integrated into web pages. This is a critical distinction that many developers overlook when building extensions that interact with external APIs.

The service worker acts as a privileged bridge for cross-origin communication. Your content script can send a message to the background service worker, which then makes the cross-origin request on behalf of the extension. The service worker has the necessary permissions to bypass CORS, and it can send the response back to your content script through the messaging API.

## Fetch from Background Service Worker {#fetch-from-background}

The recommended approach for making cross-origin requests in Manifest V3 is to perform them from the background service worker. This approach leverages the extension's privileged position and avoids the CORS limitations of content scripts.

```javascript
// In content script
chrome.runtime.sendMessage(
  { action: "fetchData", url: "https://api.example.com/data" },
  (response) => {
    if (response.data) {
      console.log("Data received:", response.data);
    }
  }
);

// In background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fetchData") {
    fetch(message.url)
      .then((response) => response.json())
      .then((data) => sendResponse({ data: data }))
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
});
```

This pattern keeps your sensitive logic in the privileged extension context while allowing your content script to trigger network requests. The service worker serves as a proxy, handling the actual communication with external servers.

For more complex scenarios, you might want to implement request queuing, caching, or authentication token management in the service worker. This centralizes your network logic and makes it easier to maintain and debug.

## Content Script Limitations {#content-script-limitations}

Content scripts run in the context of web pages, which means they inherit the page's origin for network requests. This is a fundamental aspect of how content scripts work in Chrome extensions. When a content script makes a fetch request, it's subject to the same CORS restrictions as any JavaScript running on that page.

This limitation exists for security reasons. Allowing content scripts to bypass CORS would create a potential vector for cross-origin attacks. If a malicious extension could make unrestricted cross-origin requests from any page, it could exfiltrate data or perform actions on behalf of the user on other domains.

To work around this limitation, always route your cross-origin requests through the background service worker. Your content script should not make direct fetch calls to external APIs. Instead, use the messaging API to communicate with the service worker, which handles the actual network request.

```javascript
// ❌ Don't do this in content scripts
fetch("https://api.example.com/data")
  .then((response) => response.json())
  .then((data) => console.log(data));

// ✅ Do this instead - send message to background
chrome.runtime.sendMessage(
  { type: "FETCH_API", url: "https://api.example.com/data" },
  (response) => console.log(response.data)
);
```

Understanding this limitation is crucial for designing robust extensions. Plan your architecture to keep network logic in the service worker, and use content scripts only for page interaction and DOM manipulation.

## Content Security Policy Headers {#csp-headers}

Chrome extensions are subject to Content Security Policy (CSP) restrictions defined by the browser and the extension manifest. The default CSP in Manifest V3 is restrictive and affects what types of network requests you can make and from which contexts.

The manifest can specify custom CSP rules using the `content_security_policy` field:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.example.com"
  }
}
```

This policy restricts scripts to the extension's own files, and limits connect-src to specific domains. Understanding CSP is important because overly restrictive policies can break your extension's functionality, while overly permissive policies can create security vulnerabilities.

When designing your extension's CSP, consider which origins need to be accessible from which contexts. The service worker and popup can have different requirements than content scripts. You may need to adjust CSP to allow specific API endpoints while maintaining security for other operations.

If your extension needs to make requests to many different domains dynamically, you might need to use the `connect-src` directive carefully or implement a proxy pattern through your own server. Always test your extension with the strictest CSP settings possible to ensure it will work in production environments.

## Summary {#summary}

Cross-origin requests in Chrome extensions require careful consideration of the permission model and context from which requests are made. Host permissions in the manifest control which domains your extension can access. The background service worker serves as the recommended location for cross-origin network requests, as it bypasses CORS restrictions that apply to content scripts. Content scripts are limited to the page's origin for network requests and must use message passing to communicate with the service worker for external API calls. Finally, Content Security Policy headers provide an additional layer of control over what network requests are allowed. By understanding these concepts, you can build extensions that securely and reliably interact with external services.

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
