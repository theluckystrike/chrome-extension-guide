---
layout: post
title: "Chrome Scripting API Complete Reference: Dynamic Code Injection in MV3"
description: "Master the Chrome Scripting API for Manifest V3. Learn executeScript, insertCSS, registerContentScripts, and dynamic code injection patterns with practical examples and best practices."
date: 2025-01-24
last_modified_at: 2025-01-24
categories: [Chrome-Extensions, API-Guide]
tags: [chrome-extension, api, tutorial, manifest-v3]
keywords: "chrome.scripting api, executeScript mv3, dynamic script injection, registerContentScripts, chrome extension scripting, manifest v3 scripting"
canonical_url: "https://bestchromeextensions.com/2025/01/24/chrome-scripting-api-complete-reference/"
---

Chrome Scripting API Complete Reference: Dynamic Code Injection in MV3

The `chrome.scripting` API is one of the most significant additions in Manifest V3, replacing the legacy `chrome.tabs.executeScript()` and `chrome.tabs.insertCSS()` methods with a more powerful, structured, and secure approach to dynamic code injection. Whether you need to inject scripts into web pages on demand, register content scripts programmatically, or apply CSS modifications at runtime, the Scripting API provides the tools you need.

This comprehensive reference covers every method, parameter, and pattern you need to master dynamic code injection in modern Chrome extensions. We will walk through real-world use cases, examine the security model, and provide production-ready code examples that you can adapt for your own projects.

---

Why the Scripting API Exists {#why-scripting-api}

In Manifest V2, developers relied on `chrome.tabs.executeScript()` to inject arbitrary strings of JavaScript into web pages. While powerful, this approach had serious security implications. it allowed extensions to construct and execute arbitrary code strings, making it difficult for the Chrome Web Store review process to audit extension behavior.

Manifest V3 introduced the `chrome.scripting` API to address these concerns. The new API enforces a separation between the code that runs in the extension context and the code injected into web pages. Instead of passing raw code strings, you reference functions or files, making extensions more auditable and secure.

Key Differences from MV2

| Feature | MV2 (`chrome.tabs`) | MV3 (`chrome.scripting`) |
|---------|---------------------|--------------------------|
| Execute script | `chrome.tabs.executeScript()` | `chrome.scripting.executeScript()` |
| Insert CSS | `chrome.tabs.insertCSS()` | `chrome.scripting.insertCSS()` |
| Remove CSS | Not available | `chrome.scripting.removeCSS()` |
| Dynamic content scripts | Not available | `chrome.scripting.registerContentScripts()` |
| Code strings | Allowed | Not allowed (use `func` or `files`) |
| Return values | Flat array | Array of `InjectionResult` objects |

---

Required Permissions and Manifest Setup {#permissions}

Before using the Scripting API, you must declare the appropriate permissions in your `manifest.json`.

Basic Configuration

```json
{
  "manifest_version": 3,
  "name": "Scripting API Demo",
  "version": "1.0",
  "permissions": [
    "scripting",
    "activeTab"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

The `"scripting"` permission is required for all `chrome.scripting` methods. You also need host permissions for the pages you want to inject into. The `"activeTab"` permission grants temporary access to the current tab when the user clicks your extension icon, which is the least-privilege approach.

Host Permissions for Broader Access

If your extension needs to inject scripts without direct user interaction, declare explicit host permissions:

```json
{
  "permissions": ["scripting"],
  "host_permissions": [
    "https://*.example.com/*",
    "https://developer.chrome.com/*"
  ]
}
```

Only request the minimum host permissions your extension actually needs. Broad patterns like `"<all_urls>"` will trigger additional review and may reduce user trust.

---

executeScript(): The Core Injection Method {#executescript}

The `chrome.scripting.executeScript()` method is the primary way to inject JavaScript into web pages dynamically. It accepts a single `ScriptInjection` object that specifies what to inject and where.

Basic Function Injection

The recommended approach is to inject a function reference:

```javascript
// background.js
async function injectGreeting() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: showGreeting
  });

  console.log('Injection results:', results);
}

// This function runs in the web page context
function showGreeting() {
  const banner = document.createElement('div');
  banner.textContent = 'Hello from the extension!';
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0;
    background: #4285f4; color: white;
    padding: 12px; text-align: center;
    z-index: 999999; font-size: 16px;
  `;
  document.body.prepend(banner);
  return 'Banner injected successfully';
}
```

The `func` property takes a function reference. Chrome serializes the function and executes it in the target page's context. The function cannot access variables from the outer scope. it runs in complete isolation.

Passing Arguments with `args`

To pass data into the injected function, use the `args` property:

```javascript
async function highlightText(searchTerm, color) {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: performHighlight,
    args: [searchTerm, color]
  });
}

function performHighlight(term, highlightColor) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  let count = 0;
  const regex = new RegExp(`(${term})`, 'gi');

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (regex.test(node.textContent)) {
      const span = document.createElement('span');
      span.innerHTML = node.textContent.replace(
        regex,
        `<mark style="background:${highlightColor}">$1</mark>`
      );
      node.parentNode.replaceChild(span, node);
      count++;
    }
  }

  return { matchedNodes: count };
}
```

Arguments must be JSON-serializable. You cannot pass functions, DOM elements, or objects with circular references.

File-Based Injection

For larger scripts, inject entire files:

```javascript
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['content-scripts/analyzer.js', 'content-scripts/ui.js']
});
```

Files are executed in order. They share the same isolated world (by default, the `ISOLATED` world), so later files can access variables and functions defined by earlier files.

Targeting Specific Frames

By default, scripts are injected into the main frame only. To target specific frames or all frames:

```javascript
// Inject into all frames
await chrome.scripting.executeScript({
  target: { tabId: tab.id, allFrames: true },
  func: collectFormData
});

// Inject into specific frames by ID
await chrome.scripting.executeScript({
  target: { tabId: tab.id, frameIds: [0, 123, 456] },
  func: processFrame
});

// Inject into specific document IDs (more stable than frameIds)
await chrome.scripting.executeScript({
  target: { tabId: tab.id, documentIds: ['ABCDEF123'] },
  func: handleDocument
});
```

Understanding InjectionResult

`executeScript()` returns an array of `InjectionResult` objects, one per frame:

```javascript
const results = await chrome.scripting.executeScript({
  target: { tabId: tab.id, allFrames: true },
  func: () => {
    return {
      title: document.title,
      url: location.href,
      linkCount: document.querySelectorAll('a').length
    };
  }
});

for (const result of results) {
  console.log(`Frame ${result.frameId}:`, result.result);
  // result.documentId - stable document identifier
  // result.frameId - numeric frame ID
  // result.result - the return value of the injected function
}
```

---

Execution Worlds: ISOLATED vs MAIN {#execution-worlds}

One of the most important concepts in the Scripting API is the execution world, which determines the JavaScript context where your injected code runs.

The ISOLATED World (Default)

By default, injected scripts run in an isolated world. They share the DOM with the page but have their own JavaScript environment:

```javascript
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'ISOLATED',  // This is the default
  func: () => {
    // Can access the DOM
    const heading = document.querySelector('h1');

    // Cannot access page's JavaScript variables
    // window.pageVariable is undefined here

    // Has access to chrome extension APIs
    // (like chrome.runtime.sendMessage)
  }
});
```

The MAIN World

When you need to interact with the page's JavaScript environment. for example, to call functions defined by the page, read JavaScript variables, or intercept network requests. use the `MAIN` world:

```javascript
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'MAIN',
  func: () => {
    // Can access page's JavaScript variables and functions
    console.log(window.somePageVariable);

    // Can intercept page behaviors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      console.log('Fetch intercepted:', args[0]);
      return originalFetch.apply(window, args);
    };
  }
});
```

Security warning: Code running in the `MAIN` world has no special privileges. It is fully accessible to the web page, which means a malicious page could potentially tamper with your injected code. Never expose sensitive extension data or logic in the `MAIN` world.

Communicating Between Worlds

To safely communicate between the `MAIN` world and the `ISOLATED` world, use `window.postMessage()` or custom DOM events:

```javascript
// Injected into MAIN world
function mainWorldScript() {
  const data = window.appState.getUserData();
  window.postMessage({
    source: 'my-extension-main',
    payload: data
  }, '*');
}

// Injected into ISOLATED world
function isolatedWorldListener() {
  window.addEventListener('message', (event) => {
    if (event.data?.source === 'my-extension-main') {
      chrome.runtime.sendMessage({
        type: 'PAGE_DATA',
        data: event.data.payload
      });
    }
  });
}
```

---

insertCSS() and removeCSS() {#css-injection}

The Scripting API provides dedicated methods for CSS injection, which are more efficient and cleaner than injecting style elements via `executeScript()`.

Injecting CSS

```javascript
// Inject inline CSS
await chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: `
    .ad-banner { display: none !important; }
    .sidebar-promo { visibility: hidden !important; }
    body { font-family: 'Inter', sans-serif !important; }
  `
});

// Inject a CSS file
await chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  files: ['styles/custom-theme.css']
});

// Inject into all frames
await chrome.scripting.insertCSS({
  target: { tabId: tab.id, allFrames: true },
  css: '.overlay-popup { display: none !important; }'
});
```

Removing CSS

Unlike MV2, you can now cleanly remove CSS that was previously injected:

```javascript
// Store the CSS for later removal
const darkModeCSS = `
  body { background: #1a1a1a !important; color: #e0e0e0 !important; }
  a { color: #6db3f2 !important; }
`;

// Inject it
await chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: darkModeCSS
});

// Remove it later
await chrome.scripting.removeCSS({
  target: { tabId: tab.id },
  css: darkModeCSS
});
```

The `removeCSS()` call must use the exact same CSS string or file reference that was used in the corresponding `insertCSS()` call.

---

Programmatic Content Script Registration {#dynamic-content-scripts}

One of the most powerful features of the Scripting API is the ability to register, update, and unregister content scripts at runtime. This replaces the need for static `content_scripts` entries in the manifest for many use cases.

Registering Content Scripts

```javascript
await chrome.scripting.registerContentScripts([
  {
    id: 'dark-mode-script',
    matches: ['https://*.example.com/*'],
    js: ['content-scripts/dark-mode.js'],
    css: ['styles/dark-mode.css'],
    runAt: 'document_start',
    allFrames: false,
    persistAcrossSessions: true,
    world: 'ISOLATED'
  },
  {
    id: 'analytics-blocker',
    matches: ['<all_urls>'],
    excludeMatches: ['https://mysite.example.com/*'],
    js: ['content-scripts/blocker.js'],
    runAt: 'document_end',
    matchOriginAsFallback: true
  }
]);
```

Key properties:

- `id` (required): A unique string identifier for the script registration.
- `matches` (required): URL patterns where the script should be injected.
- `js` / `css`: Arrays of script or stylesheet files to inject.
- `runAt`: When to inject. `"document_start"`, `"document_end"`, or `"document_idle"` (default).
- `persistAcrossSessions`: If `true` (the default), the registration survives browser restarts.
- `world`: The execution world, either `"ISOLATED"` (default) or `"MAIN"`.
- `excludeMatches`: URL patterns to exclude from injection.
- `matchOriginAsFallback`: If `true`, matches opaque origins like `about:blank` frames.

Retrieving Registered Scripts

```javascript
// Get all registered content scripts
const allScripts = await chrome.scripting.getRegisteredContentScripts();
console.log('Registered scripts:', allScripts);

// Filter by specific IDs
const specific = await chrome.scripting.getRegisteredContentScripts({
  ids: ['dark-mode-script']
});
```

Updating Content Scripts

You can modify registered scripts without unregistering and re-registering them:

```javascript
await chrome.scripting.updateContentScripts([
  {
    id: 'dark-mode-script',
    matches: ['https://*.example.com/*', 'https://*.another.com/*'],
    css: ['styles/dark-mode-v2.css']
  }
]);
```

Only the properties you specify are updated. Other properties retain their previous values.

Unregistering Content Scripts

```javascript
// Unregister specific scripts
await chrome.scripting.unregisterContentScripts({
  ids: ['analytics-blocker']
});

// Unregister ALL dynamically registered scripts
await chrome.scripting.unregisterContentScripts();
```

---

Real-World Patterns and Use Cases {#real-world-patterns}

User-Configurable Content Scripts

A common pattern is letting users choose which sites to modify. Combine the [Chrome Storage API](/2025/01/24/chrome-storage-api-patterns/) with dynamic content script registration:

```javascript
// background.js
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.enabledSites) {
    const sites = changes.enabledSites.newValue || [];

    // Unregister existing scripts
    await chrome.scripting.unregisterContentScripts({
      ids: ['user-sites']
    }).catch(() => {}); // Ignore if not registered

    if (sites.length > 0) {
      const matches = sites.map(site => `https://${site}/*`);
      await chrome.scripting.registerContentScripts([{
        id: 'user-sites',
        matches,
        js: ['content-scripts/enhance.js'],
        runAt: 'document_idle'
      }]);
    }
  }
});
```

On-Demand Page Analysis

Use `executeScript()` with the [Action API](/2025/01/24/chrome-action-api-guide/) to analyze pages when the user clicks your extension icon:

```javascript
chrome.action.onClicked.addListener(async (tab) => {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: analyzePage
  });

  const analysis = results[0].result;

  // Send results to a popup or side panel
  await chrome.storage.session.set({ lastAnalysis: analysis });
});

function analyzePage() {
  const images = document.querySelectorAll('img');
  const links = document.querySelectorAll('a');
  const scripts = document.querySelectorAll('script');

  return {
    imageCount: images.length,
    imagesWithoutAlt: [...images].filter(img => !img.alt).length,
    linkCount: links.length,
    externalLinks: [...links].filter(a => {
      try {
        return new URL(a.href).origin !== location.origin;
      } catch { return false; }
    }).length,
    scriptCount: scripts.length,
    pageSize: document.documentElement.outerHTML.length,
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.content || '',
  };
}
```

Injecting a Full UI Component

For complex UI injection, use file-based injection with multiple files:

```javascript
async function injectFloatingPanel(tabId) {
  // Inject CSS first
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ['panel/panel.css']
  });

  // Then inject the JavaScript
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['panel/panel-ui.js', 'panel/panel-logic.js']
  });
}
```

---

Error Handling and Edge Cases {#error-handling}

Common Errors and Solutions

```javascript
async function safeInject(tabId, func, args = []) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func,
      args
    });
    return { success: true, results };
  } catch (error) {
    const message = error.message || '';

    if (message.includes('Cannot access a chrome://')) {
      console.warn('Cannot inject into chrome:// pages');
    } else if (message.includes('No tab with id')) {
      console.warn('Tab was closed before injection');
    } else if (message.includes('Cannot access contents of the page')) {
      console.warn('Missing host permissions for this page');
    } else if (message.includes('The extensions gallery cannot be scripted')) {
      console.warn('Cannot inject into Chrome Web Store');
    } else {
      console.error('Unexpected injection error:', error);
    }

    return { success: false, error: message };
  }
}
```

Restricted Pages

You cannot inject scripts into:

- `chrome://` pages (settings, extensions, etc.)
- `chrome-extension://` pages belonging to other extensions
- The Chrome Web Store (`https://chrome.google.com/webstore`)
- `edge://` pages (in Microsoft Edge)

Always handle these cases gracefully in your extension.

Waiting for Page Load

If you need to ensure the page is fully loaded before injecting:

```javascript
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.startsWith('https://')) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: initializeExtensionFeatures
    });
  }
});
```

---

Migration from MV2 {#migration}

If you are migrating an existing extension from Manifest V2, here is a quick reference for updating your scripting calls.

Before (MV2)

```javascript
// Executing code string (no longer allowed)
chrome.tabs.executeScript(tabId, {
  code: 'document.title'
}, (results) => {
  console.log(results[0]);
});

// Executing a file
chrome.tabs.executeScript(tabId, {
  file: 'content.js',
  allFrames: true,
  runAt: 'document_end'
});

// Inserting CSS
chrome.tabs.insertCSS(tabId, {
  file: 'styles.css'
});
```

After (MV3)

```javascript
// Execute a function instead of a code string
const results = await chrome.scripting.executeScript({
  target: { tabId },
  func: () => document.title
});
console.log(results[0].result);

// Execute a file
await chrome.scripting.executeScript({
  target: { tabId, allFrames: true },
  files: ['content.js']
});

// Insert CSS
await chrome.scripting.insertCSS({
  target: { tabId },
  files: ['styles.css']
});
```

Notice that MV3 methods are Promise-based, while MV2 methods used callbacks. All `chrome.scripting` methods return Promises, so you can use `async`/`await` for cleaner code.

---

Performance Best Practices {#performance}

Minimize Injections

Each call to `executeScript()` has overhead. Batch your logic into a single function rather than making multiple injection calls:

```javascript
// Bad: multiple round trips
await chrome.scripting.executeScript({ target: { tabId }, func: step1 });
await chrome.scripting.executeScript({ target: { tabId }, func: step2 });
await chrome.scripting.executeScript({ target: { tabId }, func: step3 });

// Good: single injection
await chrome.scripting.executeScript({
  target: { tabId },
  func: allStepsCombined
});
```

Prefer File Injection for Large Scripts

For scripts larger than a few dozen lines, use file-based injection. The browser can cache the files, and they are easier to debug in DevTools.

Use `runAt` Wisely

When registering content scripts, choose the right `runAt` value:

- `document_start`: Runs before the page DOM is constructed. Use for blocking or intercepting page behavior.
- `document_end`: Runs after the DOM is complete but before subresources (images, etc.) finish loading.
- `document_idle` (default): Runs after the page is fully loaded. Least impact on page performance.

---

Related Resources {#related}

- [Chrome Action API Guide](/2025/01/24/chrome-action-api-guide/). Trigger script injection from toolbar clicks
- [Chrome Runtime API: Messaging and Lifecycle](/2025/01/24/chrome-runtime-api-messaging/). Communicate between injected scripts and your service worker
- [Chrome Storage API Patterns](/2025/01/24/chrome-storage-api-patterns/). Store user preferences that control injection behavior
- [Manifest V3 Migration Guide](/2025/01/16/manifest-v3-migration-complete-guide-2025/). Full migration walkthrough

---

Summary {#summary}

The `chrome.scripting` API is the cornerstone of dynamic content manipulation in Manifest V3 extensions. By understanding its methods. `executeScript()`, `insertCSS()`, `removeCSS()`, and the content script registration family. you can build extensions that modify web pages safely and efficiently.

Key takeaways:

1. Always use `func` with `args` instead of code strings for security and auditability.
2. Choose the right execution world (`ISOLATED` vs `MAIN`) based on whether you need to access the page's JavaScript context.
3. Use dynamic content script registration for user-configurable functionality.
4. Handle errors gracefully. many pages are restricted and cannot be scripted.
5. Batch operations into single injections to minimize performance overhead.

Master these concepts and you will be well-equipped to build powerful, secure Chrome extensions that interact with web content in sophisticated ways.
