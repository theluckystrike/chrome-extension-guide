---
layout: default
title: "Chrome DevTools API Complete Reference"
description: "The Chrome DevTools API extends Chrome Developer Tools with custom panels, sidebars, network tools, and inspection capabilities for debugging extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/devtools-api/"
---

# chrome.devtools API Reference

The `chrome.devtools` API extends Chrome DevTools with custom panels, sidebars, and network tools.

## Overview
- Create custom DevTools panels alongside built-in ones (Elements, Console, Network)
- Add sidebar panes to existing panels like Elements
- Interact with the inspected page using eval and reload
- Monitor network requests and responses
- No permission required (use `devtools_page` key in manifest)
- Only available when DevTools is open

## Manifest Configuration
```json
{ "devtools_page": "devtools.html" }
```
```html
<script src="devtools.js"></script>
```

## chrome.devtools.panels

### panels.create(title, iconPath, pagePath, callback)
Creates a new panel in DevTools.
```javascript
chrome.devtools.panels.create("My Panel", "icon.png", "panel.html", p => { });
```

### panels.elements.createSidebarPane(title, callback)
Adds a sidebar pane to the Elements panel.
```javascript
chrome.devtools.panels.elements.createSidebarPane("Info", s => s.setObject({ x: 1 }));
```

### panels.themeName
Returns current theme: `"default"` or `"dark"`.

### ExtensionPanel Events
- **onShown**: Fired when panel becomes visible
- **onHidden**: Fired when panel is hidden

### ExtensionSidebarPane Methods
- **setObject(object, rootTitle?)**: Set JSON object display
- **setExpression(expression, rootTitle?)**: Evaluate expression
- **setPage(pagePath)**: Display HTML page

## chrome.devtools.inspectedWindow

### inspectedWindow.tabId
ID of the inspected tab.

### inspectedWindow.eval(expression, callback)
Evaluates JavaScript in the context of the inspected page.
```javascript
chrome.devtools.inspectedWindow.eval("document.title", (r, e) => { if(!e) console.log(r); });
```

### inspectedWindow.reload(options, callback)
Reloads page. Options: `ignoreCache`, `userAgent`, `injectedScript`.

### inspectedWindow.getResources(callback)
Returns list of resources on the page.

## chrome.devtools.network

### network.getHAR(callback)
Returns HAR log containing all network requests.

### network.onRequestFinished
Event fired when a network request completes.
```javascript
chrome.devtools.network.onRequestFinished.addListener(r => {
  console.log(r.request.url, r.response.status);
  r.getContent((c, enc) => { /* body */ });
});
```

### network.onNavigated
Event fired when page navigates to a new URL.
```javascript
chrome.devtools.network.onNavigated.addListener(url => console.log(url));
```

## Communication Patterns

### Extension to Inspected Page
```javascript
chrome.devtools.inspectedWindow.eval("window.customFunction()", fn);
```

### Extension to Service Worker
```javascript
// devtools.js
chrome.runtime.sendMessage({ action: "data", payload: "hello" });
// background.js
chrome.runtime.onMessage.addListener(m => console.log(m.payload));
```

## Code Examples

### Custom Debug Panel
```javascript
chrome.devtools.panels.create("Debug", null, "panel.html", p => p.onShown.addListener(w => { }));
```

### Elements Sidebar Extension
```javascript
chrome.devtools.panels.elements.createSidebarPane("CSS", s =>
  chrome.devtools.panels.elements.onSelectionChanged.addListener(() => s.setExpression("$0.style.cssText"))
);
```

### Network Request Logger
```javascript
chrome.devtools.network.onRequestFinished.addListener(r => console.log(r.request.url, r.response.status));
```

## Cross-References
- [DevTools Extensions Guide](../guides/devtools-extensions.md)
- [DevTools Panels Pattern](../patterns/devtools-panels.md)
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/mv3/devtools/)
