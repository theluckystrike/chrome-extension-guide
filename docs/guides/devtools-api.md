# Chrome DevTools API Guide

## Introduction

The Chrome DevTools API extends Chrome's developer tools with custom panels, sidebars, network monitoring, and profilers. This guide covers all major APIs with practical examples.

## Manifest Configuration

Add `devtools_page` to manifest.json:

```json
{ "devtools_page": "devtools.html" }
```

```html
<!-- devtools.html -->
<!DOCTYPE html>
<html><body><script src="devtools.js"></script></body></html>
```

## chrome.devtools.inspectedWindow

Access the inspected page, get tab ID, reload, evaluate code, access resources.

```javascript
// Get inspected tab ID
const tabId = chrome.devtools.inspectedWindow.tabId;

// Reload with injected script
chrome.devtools.inspectedWindow.reload({
  ignoreCache: true,
  injectedScript: `window.__DEVTOOLS__ = true;`
});

// Get page resources
chrome.devtools.inspectedWindow.getResources((resources) => {
  resources.forEach(r => console.log(r.url, r.type));
});
```

## chrome.devtools.inspectedWindow.eval

Execute JavaScript in the inspected page context.

```javascript
// Basic evaluation
chrome.devtools.inspectedWindow.eval("document.title", (r, e) => {
  if (e) console.error(e.description);
  else console.log("Title:", r);
});

// Content script context
chrome.devtools.inspectedWindow.eval(
  "window.__DATA__",
  { useContentScriptContext: true },
  (result) => console.log(result)
);

// Selected element ($0)
chrome.devtools.inspectedWindow.eval(
  `$0 ? { tag: $0.tagName, id: $0.id } : null`,
  (info) => console.log("Selected:", info)
);
```

## chrome.devtools.panels

Create custom DevTools panels.

```javascript
chrome.devtools.panels.create(
  "My Panel",        // Title
  "icon.png",        // 16x16 icon
  "panel.html",      // Content page
  (panel) => {
    panel.onShown.addListener((win) => console.log("Shown"));
    panel.onHidden.addListener(() => console.log("Hidden"));
  }
);
```

### Theme Support

```javascript
const theme = chrome.devtools.panels.themeName; // "default" or "dark"
document.body.classList.add(theme === "dark" ? "dark" : "light");
```

## chrome.devtools.panels.elements.createSidebarPane

Add sidebar panes to the Elements panel.

```javascript
chrome.devtools.panels.elements.createSidebarPane(
  "Element Details",
  (sidebar) => {
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      sidebar.setExpression(`
        (() => {
          const el = $0;
          if (!el) return "No element";
          return { tag: el.tagName, id: el.id, classes: [...el.classList] };
        })()
      `, "Info");
    });
  }
);

// Alternative methods
sidebar.setObject({ key: "value" }, "Title");  // JSON
sidebar.setPage("sidebar.html");               // HTML page
```

## chrome.devtools.network

Monitor network requests.

```javascript
// Listen for completed requests
chrome.devtools.network.onRequestFinished.addListener((req) => {
  console.log(req.request.url, req.response.status, req.time + "ms");
  req.getContent((body, enc) => console.log("Body:", body));
});

// Clear on navigation
chrome.devtools.network.onNavigated.addListener(() => console.log("Navigated"));

// Get HAR log
chrome.devtools.network.getHAR((har) => {
  har.entries.forEach(e => console.log(e.request.url));
});
```

## chrome.devtools.recorder

Create custom Recorder panels.

```javascript
chrome.devtools.panels.create(
  "Custom Recorder",
  "icon.png",
  "recorder.html",
  (panel) => panel.onShown.addListener((win) => initRecorder(win))
);
```

## Communication: DevTools ↔ Service Worker

DevTools pages can't directly reach content scripts, use background as relay.

### DevTools Side

```javascript
// devtools.js
const port = chrome.runtime.connect({ name: "devtools" });
port.postMessage({ type: "INIT", tabId: chrome.devtools.inspectedWindow.tabId });
port.onMessage.addListener((msg) => console.log("From BG:", msg));
```

### Background Side

```javascript
// background.js
const ports = new Map();
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "devtools") return;
  port.onMessage.addListener((msg) => {
    if (msg.type === "INIT") ports.set(msg.tabId, port);
  });
  port.onDisconnect.addListener(() => {
    for (const [id, p] of ports) if (p === port) ports.delete(id);
  });
});
```

### Panel to DevTools Relay

```javascript
// panel.html sends to devtools.js (parent)
window.parent.postMessage({ target: "devtools", action: "fetch" }, "*");

// devtools.js relays to background
window.addEventListener("message", (e) => {
  if (e.data.target === "devtools") port.postMessage(e.data);
});
```

## Building a Custom Profiler

```javascript
chrome.devtools.panels.create("Profiler", "icon.png", "panel.html", (panel) => {
  let interval = null;
  panel.onShown.addListener((win) => {
    interval = setInterval(() => {
      chrome.devtools.inspectedWindow.eval(
        `({ mem: performance.memory?.usedJSHeapSize, nodes: document.querySelectorAll('*').length })`,
        (r) => r && win.postMessage({ type: "metrics", data: r }, "*")
      );
    }, 1000);
  });
  panel.onHidden.addListener(() => clearInterval(interval));
});
```

## Working Example: mv3-devtools-panel Template

See official Chrome extension samples for complete examples:

```javascript
// Panel with error handling
chrome.devtools.panels.create("Panel", "icon.png", "panel.html", (panel) => {
  if (chrome.runtime.lastError) {
    console.error("Error:", chrome.runtime.lastError.message);
    return;
  }
  panel.onShown.addListener(handleShown);
});

// Safe eval wrapper
function safeEval(expr, ms = 5000) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject("Timeout"), ms);
    chrome.devtools.inspectedWindow.eval(expr, (r, e) => {
      clearTimeout(id);
      e ? reject(e.description) : resolve(r);
    });
  });
}
```

## Best Practices

### Performance

```javascript
// Debounce sidebar updates
let timer;
chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
  clearTimeout(timer);
  timer = setTimeout(() => update(sidebar), 100);
});
```

### Error Handling

```javascript
chrome.devtools.inspectedWindow.eval(expr, (r, e) => {
  if (e) {
    if (e.isError) console.error(e.description);
    else if (e.isException) console.error(e.value);
    return;
  }
  // Use r
});
```

## Reference

- Docs: [developer.chrome.com/docs/extensions/reference/api/devtools](https://developer.chrome.com/docs/extensions/reference/api/devtools)
- Samples: [github.com/GoogleChrome/chrome-extensions-samples](https://github.com/GoogleChrome/chrome-extensions-samples)
- MV3 Guide: [developer.chrome.com/docs/extensions/mv3/devtools](https://developer.chrome.com/docs/extensions/mv3/devtools)
