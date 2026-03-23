---
layout: default
title: "Chrome DevTools API Complete Reference"
description: "The Chrome DevTools API extends Chrome Developer Tools with custom panels, sidebars, network tools, and inspection capabilities for debugging extensions."
canonical_url: "https://bestchromeextensions.com/api-reference/devtools-api/"
---

# chrome.devtools API Reference

The `chrome.devtools` API extends Chrome DevTools with custom panels, sidebars, and network tools.

Overview {#overview}
- Create custom DevTools panels alongside built-in ones (Elements, Console, Network)
- Add sidebar panes to existing panels like Elements
- Interact with the inspected page using eval and reload
- Monitor network requests and responses
- No permission required (use `devtools_page` key in manifest)
- Only available when DevTools is open

Manifest Configuration {#manifest-configuration}
```json
{ "devtools_page": "devtools.html" }
```
```html
<script src="devtools.js"></script>
```

chrome.devtools.panels {#chromedevtoolspanels}

panels.create(title, iconPath, pagePath, callback) {#panelscreatetitle-iconpath-pagepath-callback}
Creates a new panel in DevTools.
```javascript
chrome.devtools.panels.create("My Panel", "icon.png", "panel.html", p => { });
```

panels.elements.createSidebarPane(title, callback) {#panelselementscreatesidebarpanetitle-callback}
Adds a sidebar pane to the Elements panel.
```javascript
chrome.devtools.panels.elements.createSidebarPane("Info", s => s.setObject({ x: 1 }));
```

panels.themeName {#panelsthemename}
Returns current theme: `"default"` or `"dark"`.

ExtensionPanel Events {#extensionpanel-events}
- onShown: Fired when panel becomes visible
- onHidden: Fired when panel is hidden

ExtensionSidebarPane Methods {#extensionsidebarpane-methods}
- setObject(object, rootTitle?): Set JSON object display
- setExpression(expression, rootTitle?): Evaluate expression
- setPage(pagePath): Display HTML page

chrome.devtools.inspectedWindow {#chromedevtoolsinspectedwindow}

inspectedWindow.tabId {#inspectedwindowtabid}
ID of the inspected tab.

inspectedWindow.eval(expression, callback) {#inspectedwindowevalexpression-callback}
Evaluates JavaScript in the context of the inspected page.
```javascript
chrome.devtools.inspectedWindow.eval("document.title", (r, e) => { if(!e) console.log(r); });
```

inspectedWindow.reload(options, callback) {#inspectedwindowreloadoptions-callback}
Reloads page. Options: `ignoreCache`, `userAgent`, `injectedScript`.

inspectedWindow.getResources(callback) {#inspectedwindowgetresourcescallback}
Returns list of resources on the page.

chrome.devtools.network {#chromedevtoolsnetwork}

network.getHAR(callback) {#networkgetharcallback}
Returns HAR log containing all network requests.

network.onRequestFinished {#networkonrequestfinished}
Event fired when a network request completes.
```javascript
chrome.devtools.network.onRequestFinished.addListener(r => {
  console.log(r.request.url, r.response.status);
  r.getContent((c, enc) => { /* body */ });
});
```

network.onNavigated {#networkonnavigated}
Event fired when page navigates to a new URL.
```javascript
chrome.devtools.network.onNavigated.addListener(url => console.log(url));
```

Communication Patterns {#communication-patterns}

Extension to Inspected Page {#extension-to-inspected-page}
```javascript
chrome.devtools.inspectedWindow.eval("window.customFunction()", fn);
```

Extension to Service Worker {#extension-to-service-worker}
```javascript
// devtools.js
chrome.runtime.sendMessage({ action: "data", payload: "hello" });
// background.js
chrome.runtime.onMessage.addListener(m => console.log(m.payload));
```

Code Examples {#code-examples}

Custom Debug Panel {#custom-debug-panel}
```javascript
chrome.devtools.panels.create("Debug", null, "panel.html", p => p.onShown.addListener(w => { }));
```

Elements Sidebar Extension {#elements-sidebar-extension}
```javascript
chrome.devtools.panels.elements.createSidebarPane("CSS", s =>
  chrome.devtools.panels.elements.onSelectionChanged.addListener(() => s.setExpression("$0.style.cssText"))
);
```

Network Request Logger {#network-request-logger}
```javascript
chrome.devtools.network.onRequestFinished.addListener(r => console.log(r.request.url, r.response.status));
```

Cross-References {#cross-references}
- [DevTools Extensions Guide](../guides/devtools-extensions.md)
- [DevTools Panels Pattern](../patterns/devtools-panels.md)
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/mv3/devtools/)
Frequently Asked Questions

How do I create a DevTools extension?
Add "devtools_page" in manifest.json and create an HTML page that loads your JavaScript to interact with DevTools.

What can I do with DevTools API?
You can create custom panels, add sidebar panes, access network request data, and instrument page execution.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
