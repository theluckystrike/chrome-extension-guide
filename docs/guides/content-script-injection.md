---
layout: default
title: "Chrome Extension Content Script Injection. Static vs Programmatic Injection"
description: "A comprehensive guide covering content script injection methods in Chrome extensions: manifest-based static injection, programmatic injection with chrome.scripting.executeScript, world types, CSS injection, and dynamic rules."
canonical_url: "https://bestchromeextensions.com/guides/content-script-injection/"
---

Chrome Extension Content Script Injection. Static vs Programmatic Injection

Content script injection is a fundamental technique in Chrome extension development, enabling extensions to execute code within the context of web pages. Understanding the different injection methods is crucial for building solid and performant extensions. This guide explores both static (manifest-based) and programmatic injection approaches, along with advanced concepts like world types and dynamic rules.

Static Injection via Manifest {#static-injection-via-manifest}

The most straightforward approach to content script injection is declaring scripts in `manifest.json` under the `content_scripts` key. These scripts automatically execute on matching pages, providing a declarative way to inject code without additional runtime logic.

```json
{
  "content_scripts": [
    {
      "matches": ["https://*.example.com/*"],
      "js": ["content.js"],
      "css": ["styles/content.css"],
      "run_at": "document_idle"
    }
  ]
}
```

The `matches` field uses URL patterns to specify which pages should receive the injection. You can use wildcards (`<all_urls>` for all pages) or specific patterns like `https://*.example.com/*`. The `run_at` property controls when the script executes: `document_start` runs before the DOM is built, `document_end` runs after the DOM is parsed but before subresources load, and `document_idle` (the default) runs after the page fully loads.

Static injection offers simplicity and reliability, scripts load automatically without requiring additional permissions or runtime calls. However, they cannot be conditionally disabled at runtime without removing them from the manifest and reloading the extension.

Programmatic Injection with chrome.scripting.executeScript {#programmatic-injection-with-chromescriptingexecutescript}

Manifest V3 introduced the `chrome.scripting` API for programmatic content script injection, providing finer control over when and how scripts execute. This approach requires the `scripting` permission in your manifest.

```javascript
// In a background script or service worker
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});
```

The `executeScript` method allows injection on demand, triggered by user actions like clicking the extension icon or toolbar button. You can also inject inline code directly:

```javascript
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    console.log('Injected at:', new Date().toISOString());
    document.body.style.border = '2px solid red';
  }
});
```

Programmatic injection excels in scenarios requiring conditional logic, such as injecting different scripts based on user preferences or page context. It's also essential for features like context menus, keyboard shortcuts, or automatic page analysis triggered by specific events.

World Types: MAIN vs ISOLATED {#world-types-main-vs-isolated}

Chrome extensions operate in two distinct worlds: the isolated world and the main world. Understanding this distinction is vital for effective content script development.

Isolated World is the default environment for content scripts. Scripts run in an isolated JavaScript context, meaning they cannot access page variables or functions, and the page cannot access extension variables. This provides strong security isolation but requires messaging (via `window.postMessage` or Chrome's message passing API) to communicate with page scripts.

```javascript
// Content script in isolated world
const pageData = document.querySelector('.data');
// Cannot access page's window.someVariable
```

Main World (available via `world: "MAIN"` in Manifest V3) allows content scripts to run in the same JavaScript context as the page. This enables direct access to page variables and functions but requires careful consideration of security implications.

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["content.js"],
    "world": "MAIN"
  }]
}
```

Choosing between worlds depends on your use case. Use the isolated world for security-sensitive operations and when you don't need direct page script access. Use the main world when you must interact with existing page JavaScript or need smooth DOM manipulation without isolation barriers.

CSS Injection Techniques {#css-injection-techniques}

Content scripts frequently need to inject CSS to style page elements or create visual overlays. Chrome provides both static and dynamic CSS injection methods.

Static CSS injection via the manifest:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "css": ["styles/injected.css"]
  }]
}
```

Dynamic CSS injection using the Scripting API:

```javascript
await chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: '.highlight { background-color: yellow; }'
});
```

To remove dynamically injected CSS:

```javascript
await chrome.scripting.removeCSS({
  target: { tabId: tab.id },
  css: '.highlight { background-color: yellow; }'
});
```

Dynamic CSS injection is particularly useful for toggleable features, theme customization, or applying styles conditionally based on user actions.

Dynamic Rules with Declarative Content {#dynamic-rules-with-declarative-content}

While `content_scripts` in the manifest provides static injection, Chrome offers dynamic rule-based injection through the Declarative Content API. This allows content scripts to execute based on page conditions without needing host permissions.

```json
{
  "permissions": ["declarativeContent"],
  "content_scripts": [{
    "js": ["content.js"],
    "matches": ["https://*.example.com/*"]
  }]
}
```

```javascript
// In background script
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [
      new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostSuffix: 'example.com' },
        css: ['.dynamic-content']
      })
    ],
    actions: [new chrome.declarativeContent.ShowAction()]
  }]);
});
```

The Declarative Content API enables conditions based on URL patterns, CSS selectors, and page content. When conditions are met, you can trigger actions like showing the extension icon. This approach balances automation with permission efficiency, extensions can run on more pages without requesting broad host permissions.

Choosing the Right Injection Method {#choosing-the-right-injection-method}

Selecting between static and programmatic injection depends on your extension's requirements. Use static manifest-based injection for always-on features that should run on specific sites automatically. Use programmatic injection for on-demand functionality triggered by user interactions. Consider world types based on whether you need page script access, and use dynamic rules for intelligent, conditional execution without excessive permissions.

Understanding these injection techniques empowers you to build Chrome extensions that are both powerful and respectful of user security and privacy.
