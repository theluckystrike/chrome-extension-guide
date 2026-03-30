---
layout: default
title: "Chrome Extension DevTools Extensions. Developer Guide"
description: "Learn Chrome extension devtools extensions with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/devtools-extensions/"
last_modified_at: 2026-01-15
---
Building DevTools Extensions

Introduction {#introduction}
- Extend Chrome DevTools with custom panels, sidebars, and functionality
- Use cases: React DevTools, Redux DevTools, performance profilers, API inspectors
- Requires `"devtools_page"` in manifest.json

manifest.json Setup {#manifestjson-setup}
```json
{
  "devtools_page": "devtools.html"
}
```
- No special permission needed for basic DevTools panels
- The devtools page is a hidden HTML page that runs when DevTools is open

DevTools Page (devtools.html / devtools.js) {#devtools-page-devtoolshtml-devtoolsjs}
```html
<!DOCTYPE html>
<html><body><script src="devtools.js"></script></body></html>
```
```javascript
// devtools.js. runs once when DevTools opens for a tab
chrome.devtools.panels.create(
  "My Panel",           // Panel title in DevTools tab bar
  "icon.png",           // 16x16 icon
  "panel.html",         // Panel content page
  (panel) => {
    panel.onShown.addListener((window) => { /* panel visible */ });
    panel.onHidden.addListener(() => { /* panel hidden */ });
  }
);
```

chrome.devtools.panels API {#chromedevtoolspanels-api}

create(). Custom Panels {#create-custom-panels}
- Creates a new tab in DevTools (like Elements, Console, Network)
- `panel.html` has full DOM, can use frameworks (React, Vue, etc.)

elements.createSidebarPane(). Elements Sidebar {#elementscreatesidebarpane-elements-sidebar}
```javascript
chrome.devtools.panels.elements.createSidebarPane("My Sidebar", (sidebar) => {
  sidebar.setPage("sidebar.html");
  // Or set content dynamically:
  sidebar.setObject({ key: "value" });
  sidebar.setExpression("document.querySelector('body').dataset");
});
```
- Adds a pane to the Elements panel sidebar (next to Styles, Computed, etc.)

themes {#themes}
```javascript
const theme = chrome.devtools.panels.themeName; // "default" or "dark"
```
- Match your panel UI to the user's DevTools theme

chrome.devtools.inspectedWindow API {#chromedevtoolsinspectedwindow-api}

eval(). Execute in Inspected Page {#eval-execute-in-inspected-page}
```javascript
chrome.devtools.inspectedWindow.eval(
  "document.querySelectorAll('img').length",
  (result, error) => {
    if (error) console.error(error);
    else console.log("Images on page:", result);
  }
);
```
- Runs JavaScript in the context of the inspected page
- Not subject to extension CSP (runs in page context)
- Use for reading page state, not for persistent modifications

getResources(). List Page Resources {#getresources-list-page-resources}
```javascript
chrome.devtools.inspectedWindow.getResources((resources) => {
  resources.forEach(r => console.log(r.url, r.type));
});
```

reload(options) {#reloadoptions}
```javascript
chrome.devtools.inspectedWindow.reload({
  injectedScript: "window.__DEVTOOLS_HOOK__ = true;"
});
```
- Reload the inspected page with optional injected script

tabId {#tabid}
```javascript
const tabId = chrome.devtools.inspectedWindow.tabId;
```
- Get the tab ID of the page being inspected
- Use with `@theluckystrike/webext-messaging` `sendTabMessage()` to communicate with content scripts

chrome.devtools.network API {#chromedevtoolsnetwork-api}

getHAR(). HTTP Archive {#gethar-http-archive}
```javascript
chrome.devtools.network.getHAR((harLog) => {
  harLog.entries.forEach(entry => {
    console.log(entry.request.url, entry.response.status, entry.time);
  });
});
```

onRequestFinished {#onrequestfinished}
```javascript
chrome.devtools.network.onRequestFinished.addListener((request) => {
  request.getContent((body, encoding) => {
    console.log("Response body:", body);
  });
});
```
- Monitor network requests in real-time

Communication Architecture {#communication-architecture}
```
DevTools Page <-> Background Service Worker <-> Content Script <-> Inspected Page
```
- DevTools page cannot directly access content scripts
- Use background as relay with `@theluckystrike/webext-messaging`:
  ```typescript
  // devtools.js
  const messenger = createMessenger<Messages>();
  const data = await messenger.sendMessage('getPageData', { tabId });

  // background.js
  messenger.onMessage('getPageData', async (req) => {
    return await messenger.sendTabMessage(req.tabId, 'extractData', {});
  });
  ```

Panel UI Best Practices {#panel-ui-best-practices}
- Use the DevTools theme (`chrome.devtools.panels.themeName`) for colors
- Keep panels lightweight. DevTools already uses significant memory
- Lazy-load panel content (use `onShown`/`onHidden` events)
- Store panel preferences with `@theluckystrike/webext-storage`

Common Patterns {#common-patterns}

Network Inspector Panel {#network-inspector-panel}
- Listen to `onRequestFinished`, filter by domain/type
- Display in custom table with search/filter

Page State Inspector {#page-state-inspector}
- Use `inspectedWindow.eval()` to read page state
- Display React/Vue component trees, global variables, etc.

Performance Monitor {#performance-monitor}
- Track `onRequestFinished` timing data
- Display charts and metrics in custom panel

Common Mistakes {#common-mistakes}
- Trying to access `chrome.devtools.*` outside the devtools page. only available in devtools context
- Panel pages don't have access to `chrome.devtools.*`. communicate via messaging to devtools.js
- `inspectedWindow.eval()` runs in page context, not extension context. can't access Chrome APIs there
- Forgetting that DevTools pages are destroyed when DevTools closes

Related Articles {#related-articles}

Related Articles

- [DevTools Patterns](../patterns/devtools-extension-patterns.md)
- [Debugging Extensions](../guides/debugging-extensions.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
