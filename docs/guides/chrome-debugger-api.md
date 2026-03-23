# Chrome Debugger API - Comprehensive Guide

## Introduction

The `chrome.debugger` API provides powerful capabilities for extending Chrome DevTools functionality. It allows extensions to instrument network traffic, intercept JavaScript execution, modify DOM and CSS, capture performance profiles, and more. This API acts as a bridge between your extension and the Chrome DevTools Protocol (CDP).

- chrome.debugger API: Extension-specific wrapper around CDP
- Chrome DevTools Protocol (CDP): The underlying wire protocol used by DevTools
- Reference: https://developer.chrome.com/docs/extensions/reference/api/debugger

## Required Permissions

```json
{
  "permissions": ["debugger"],
  "host_permissions": ["<all_urls>"]
}
```

The debugger permission requires user consent each session. Chrome displays an infobar asking the user to grant permission.

## Core API Methods

### chrome.debugger.attach. Attaching to a Target

Attach to a tab or target to begin debugging:
```javascript
chrome.debugger.attach({ tabId: tabId }, "1.3", () => {
  if (chrome.runtime.lastError) {
    console.error("Attach failed:", chrome.runtime.lastError.message);
    return;
  }
  console.log("Successfully attached to tab", tabId);
});
```

### chrome.debugger.detach. Detaching from Target

Always clean up by detaching when done:
```javascript
chrome.debugger.detach({ tabId: tabId }, () => {
  console.log("Detached from tab", tabId);
});
```

### chrome.debugger.sendCommand. Sending CDP Commands

Send raw CDP commands after attaching:
```javascript
const debuggee = { tabId: tabId };

// Enable network domain
chrome.debugger.sendCommand(debuggee, "Network.enable", {}, () => {});

// Get page DOM
chrome.debugger.sendCommand(debuggee, "DOM.getDocument", {}, (response) => {
  console.log("DOM root:", response.root);
});
```

CDP commands follow the pattern: `Domain.method`. Common domains:
- `DOM`: DOM inspection and manipulation
- `Network`: Network request monitoring
- `Performance`: Performance profiling
- `Page`: Page operations (screenshot, PDF, navigation)
- `Runtime`: JavaScript execution
- `CSS`: CSS manipulation

### chrome.debugger.getTargets. Listing Debug Targets

Get all available debug targets:
```javascript
chrome.debugger.getTargets((targets) => {
  targets.forEach((target) => {
    console.log(`Type: ${target.type}, ID: ${target.id}, Tab: ${target.tabId}`);
  });
});
```

### chrome.debugger.onEvent. CDP Event Listener

Listen for CDP domain events:
```javascript
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === "Network.requestWillBeSent") {
    console.log("Request:", params.request.url);
  }
  if (method === "Runtime.consoleAPICalled") {
    console.log("Console:", params.type, params.args);
  }
});
```

### chrome.debugger.onDetach. Detach Event Listener

Handle unexpected detachment:
```javascript
chrome.debugger.onDetach.addListener((source, reason) => {
  console.log(`Detached from tab ${source.tabId}, reason: ${reason}`);
  // Possible reasons: "target_closed", "canceled", "connection_error"
});
```

## Use Cases

### DOM Inspection via CDP

Inspect and traverse the DOM tree:
```javascript
chrome.debugger.sendCommand(debuggee, "DOM.getDocument", {}, (response) => {
  const rootNodeId = response.root.nodeId;
  chrome.debugger.sendCommand(debuggee, "DOM.querySelector", {
    nodeId: rootNodeId,
    selector: "#main-content"
  }, (node) => {
    chrome.debugger.sendCommand(debuggee, "DOM.getOuterHTML", {
      nodeId: node.nodeId
    }, (html) => {
      console.log("HTML:", html.outerHTML);
    });
  });
});
```

### Network Monitoring via CDP

Intercept and analyze network requests:
```javascript
function setupNetworkMonitoring(tabId) {
  chrome.debugger.sendCommand({ tabId }, "Network.enable", {}, () => {
    console.log("Network monitoring enabled");
  });
}

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === "Network.requestWillBeSent") {
    console.log("Request URL:", params.request.url);
  }
  if (method === "Network.responseReceived") {
    console.log("Response:", params.response.status, params.response.url);
  }
});
```

### Performance Profiling via CDP

Capture performance traces:
```javascript
function startPerformanceTrace(tabId) {
  chrome.debugger.sendCommand({ tabId }, "Performance.enable", {}, () => {});
}

function getMetrics(tabId) {
  chrome.debugger.sendCommand({ tabId }, "Performance.getMetrics", {}, 
  (response) => {
    response.metrics.forEach((m) => console.log(`${m.name}: ${m.value}`));
  });
}
```

### Screenshot Capture via CDP

Capture page screenshots:
```javascript
function captureScreenshot(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, "Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    }, (response) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(response.data); // base64-encoded
    });
  });
}
```

### PDF Generation via CDP

Generate PDF from page:
```javascript
function generatePDF(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, "Page.printToPDF", {
      paperWidth: 8.5,
      paperHeight: 11,
      printBackground: true,
      landscape: false
    }, (response) => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(response.data); // base64-encoded PDF
    });
  });
}
```

### JavaScript Evaluation via CDP

Execute JavaScript in page context:
```javascript
function evaluateJS(tabId, jsCode) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, "Runtime.evaluate", {
      expression: jsCode,
      returnByValue: true,
      awaitPromise: true
    }, (response) => {
      if (response.exceptionDetails) {
        reject(response.exceptionDetails.exception.description);
      } else {
        resolve(response.result.value);
      }
    });
  });
}

// Usage
evaluateJS(tabId, "document.title").then(console.log);
evaluateJS(tabId, "[1,2,3].map(x => x * 2)").then(console.log);
```

### CSS Manipulation via CDP

Inspect and modify CSS:
```javascript
function getComputedStyles(tabId, selector) {
  chrome.debugger.sendCommand({ tabId }, "DOM.getDocument", {}, (doc) => {
    chrome.debugger.sendCommand({ tabId }, "DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: selector
    }, (node) => {
      chrome.debugger.sendCommand({ tabId }, "CSS.getComputedStyleForNode", {
        nodeId: node.nodeId
      }, (computed) => {
        console.log("Computed styles:", computed.computedStyle);
      });
    });
  });
}
```

## Security Considerations

- `"debugger"` permission is required in manifest
- User consent is required each session (infobar appears)
- Only one debugger can attach at a time per tab
- Cannot debug chrome:// URLs or other privileged pages

Best Practices:
1. Always detach when done
2. Handle errors from all CDP commands
3. Use consistent CDP version
4. Rate limit requests

## Building a Custom DevTools Extension

```javascript
// devtools.js - Load when DevTools opens
chrome.devtools.panels.create(
  "My Panel",
  "icon.png",
  "panels/panel.html",
  (panel) => {
    panel.onShown.addListener((panelWindow) => {
      // Communicate with background script
    });
  }
);

// panel.js <-> background.js <-> debugger API
chrome.runtime.sendMessage({ 
  action: "captureScreenshot", 
  tabId: chrome.devtools.inspectedWindow.tabId 
});
```

## Reference Links

- Official API Docs: https://developer.chrome.com/docs/extensions/reference/api/debugger
- Chrome DevTools Protocol: https://chromedevtools.github.io/devtools-protocol/
- Protocol Viewer: https://chromedevtools.github.io/devtools-protocol/tot/
