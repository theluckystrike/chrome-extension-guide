# Chrome DevTools Protocol in Extensions

## Overview

The Chrome DevTools Protocol (CDP) provides powerful capabilities for inspecting and controlling Chrome browsers and extensions. Through the `chrome.debugger` API, extensions can attach to tabs, send commands to control browser behavior, and listen for events. This enables advanced use cases like network interception, DOM inspection, performance profiling, and automated testing.

## Required Permission

To use the `chrome.debugger` API, you must declare the `"debugger"` permission in your extension's `manifest.json`:

```json
{
  "name": "My Debugger Extension",
  "version": "1.0",
  "permissions": [
    "debugger"
  ],
  "manifest_version": 3
}
```

The debugger permission provides access to all CDP domains and allows your extension to instrument browser tabs at a low level.

## chrome.debugger API Overview

The `chrome.debugger` API provides four core methods:

- `chrome.debugger.attach(target, requiredVersion, callback)` - Attach to a debugging target
- `chrome.debugger.detach(target, callback)` - Detach from a debugging target
- `chrome.debugger.sendCommand(target, method, params, callback)` - Send a CDP command
- `chrome.debugger.onEvent.addListener(callback)` - Listen for CDP events
- `chrome.debugger.onDetach.addListener(callback)` - Handle detach events

## Attaching to Tabs with chrome.debugger.attach

Before you can interact with a tab using CDP, you must attach to it. The attach method requires a target and a protocol version.

```javascript
// Attach to the active tab
async function attachToActiveTab() {
  // Get the currently active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const target = { tabId: tab.id };
  const requiredVersion = "1.3";
  
  return new Promise((resolve, reject) => {
    chrome.debugger.attach(target, requiredVersion, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(target);
      }
    });
  });
}
```

The `requiredVersion` parameter specifies the minimum CDP protocol version your extension requires. Using `"1.3"` is generally safe for modern Chrome versions.

## Sending Commands with chrome.debugger.sendCommand

Once attached, you can send CDP commands to interact with the page. CDP commands are organized into domains (like Network, DOM, Page, Runtime).

```javascript
// Send a CDP command
async function sendDebuggerCommand(target, method, params = {}) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand(target, method, params, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Example: Enable network tracking
async function enableNetworkTracking(target) {
  await sendDebuggerCommand(target, "Network.enable");
}

// Example: Get page DOM
async function getDocument(target) {
  const response = await sendDebuggerCommand(target, "DOM.getDocument");
  return response.root;
}
```

Common CDP domains include:
- `Network` - Network request interception and monitoring
- `DOM` - DOM tree inspection and manipulation
- `Page` - Page lifecycle and navigation control
- `Runtime` - JavaScript execution and console access
- `Performance` - Performance metrics collection

## Listening for Events with chrome.debugger.onEvent

You can listen for CDP events to monitor browser behavior in real-time. Events are fired for network requests, DOM changes, console output, and more.

```javascript
// Listen for network events
chrome.debugger.onEvent.addListener((source, method, params) => {
  // source contains { tabId, extensionId }
  // method is the event name (e.g., "Network.requestWillBeSent")
  // params contains event-specific data
  
  if (method === "Network.requestWillBeSent") {
    console.log("Request:", params.request.url);
  }
  
  if (method === "Network.responseReceived") {
    console.log("Response:", params.response.status, params.response.url);
  }
  
  if (method === "Runtime.consoleAPICalled") {
    console.log("Console:", params.type, params.args);
  }
});
```

The `source` parameter identifies which tab the event came from, allowing you to filter events from specific tabs.

## Common Use Cases

### Network Interception

Monitor and modify network requests:

```javascript
async function setupNetworkInterception(target) {
  // Enable network domain
  await sendDebuggerCommand(target, "Network.enable");
  
  // Set request interception (for modifying/blocking requests)
  await sendDebuggerCommand(target, "Network.setRequestInterception", {
    patterns: [{ urlPattern: "*://*.example.com/*" }]
  });
}
```

### DOM Inspection

Access and traverse the DOM tree:

```javascript
async function findElementsBySelector(target, selector) {
  // First get the document node
  const { root } = await sendDebuggerCommand(target, "DOM.getDocument");
  
  // Query for nodes matching a selector
  const { nodeIds } = await sendDebuggerCommand(target, "DOM.querySelector", {
    nodeId: root.nodeId,
    selector: selector
  });
  
  // Get details for each node
  for (const nodeId of nodeIds) {
    const { node } = await sendDebuggerCommand(target, "DOM.getAttributes", { nodeId });
    console.log("Found:", node);
  }
  
  return nodeIds;
}
```

### Performance Profiling

Collect performance metrics:

```javascript
async function startPerformanceProfiling(target) {
  // Start performance recording
  await sendDebuggerCommand(target, "Performance.enable");
  
  // Get metrics
  const { metrics } = await sendDebuggerCommand(target, "Performance.getMetrics");
  
  // Find specific metrics
  const getMetric = (name) => metrics.find(m => m.name === name)?.value;
  
  return {
    JSHeapUsedSize: getMetric("JSHeapUsedSize"),
    LayoutCount: getMetric("LayoutCount"),
    ScriptDuration: getMetric("ScriptDuration")
  };
}
```

## User Experience Considerations

### The Debugger Banner

When your extension is attached to a tab using `chrome.debugger`, Chrome displays a warning banner at the top of the page:

```
Chrome is being controlled by automated test software
```

This banner:
- Is displayed to inform users that debugging is active
- Cannot be hidden by extensions (intentionally for transparency)
- Appears in all windows where debugger is attached
- Is accompanied by a Chrome debugger icon in the extension toolbar

This is an important consideration for user experience. Users should be aware when your extension is using debugger capabilities.

### Best Practices

1. **Attach only when needed** - Attach to tabs only when performing debugging operations and detach when done.

2. **Inform users** - Clearly communicate in your extension's UI when debugger functionality is active.

3. **Handle detach events** - Listen for `chrome.debugger.onDetach` to handle cases where the debugger disconnects unexpectedly (e.g., user closes the tab).

4. **Handle permissions gracefully** - Users must grant explicit permission for debugger access in some cases.

```javascript
// Handle unexpected detach
chrome.debugger.onDetach.addListener((source, reason) => {
  console.log(`Debugger detached from tab ${source.tabId}: ${reason}`);
  // Update UI, notify user, or attempt re-attach
});
```

## Detaching Properly with chrome.debugger.detach

Always detach from tabs when you're done to clean up resources and remove the debugger banner:

```javascript
// Properly detach from a tab
async function detachFromTab(target) {
  return new Promise((resolve, reject) => {
    chrome.debugger.detach(target, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// Example: Attach, do work, detach
async function performDebugging(tabId) {
  const target = { tabId };
  
  try {
    await chrome.debugger.attach(target, "1.3");
    
    // Enable and capture network events
    await sendDebuggerCommand(target, "Network.enable");
    
    // ... perform debugging operations ...
    
  } catch (error) {
    console.error("Debugging error:", error);
  } finally {
    // Always detach when done
    await detachFromTab(target);
  }
}
```

Note: The debugger automatically detaches when the extension is unloaded or the tab is closed, but explicit detachment is best practice.

## Code Examples

### Network Logger Extension

A complete example of a network logging extension:

```javascript
// background.js - Background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startLogging") {
    startNetworkLogging(sender.tab.id);
  } else if (message.action === "stopLogging") {
    stopNetworkLogging(sender.tab.id);
  }
});

async function startNetworkLogging(tabId) {
  const target = { tabId };
  
  // Attach debugger
  await chrome.debugger.attach(target, "1.3");
  
  // Enable network tracking
  await sendDebuggerCommand(target, "Network.enable");
  
  // Set up event listener
  chrome.debugger.onEvent.addListener((source, method, params) => {
    if (source.tabId === tabId && method === "Network.requestWillBeSent") {
      // Log request details
      console.log("Request:", params.request.url, params.request.method);
    }
  });
}

async function stopNetworkLogging(tabId) {
  const target = { tabId };
  await chrome.debugger.detach(target);
}
```

### DOM Scraper Extension

A complete example of a DOM scraping extension:

```javascript
// background.js - Background service worker
async function scrapeDOM(tabId, selector) {
  const target = { tabId };
  
  try {
    // Attach to tab
    await chrome.debugger.attach(target, "1.3");
    
    // Get the document
    const { root } = await sendDebuggerCommand(target, "DOM.getDocument");
    
    // Query for elements
    const { nodeIds } = await sendDebuggerCommand(target, "DOM.querySelector", {
      nodeId: root.nodeId,
      selector: selector
    });
    
    // Extract data from each node
    const results = [];
    for (const nodeId of nodeIds) {
      const { node } = await sendDebuggerCommand(target, "DOM.resolveNode", {
        nodeId: nodeId
      });
      
      // Get text content
      const { backendNodeId } = await sendDebuggerCommand(target, "DOM.getOuterHTML", {
        nodeId: nodeId
      });
      
      results.push({
        tagName: node.nodeName,
        attributes: node.attributes,
        id: node.attributes?.find(a => a.name === "id")?.value
      });
    }
    
    return results;
    
  } finally {
    // Always detach
    await chrome.debugger.detach(target);
  }
}
```

## Security Considerations

The debugger API provides powerful capabilities that can access sensitive data:

- **User consent** - Chrome may prompt users to allow debugger access
- **Scope limitations** - Debugger only works on tabs the user has access to
- **HTTPS requirement** - Debugger connections should use HTTPS when possible
- **Extension lifecycle** - Debugger automatically detaches when extension is disabled

## Reference

For more information, see:
- [chrome.debugger API Reference](https://developer.chrome.com/docs/extensions/reference/api/debugger)
- [Chrome DevTools Protocol Viewer](https://chromedevtools.github.io/devtools-protocol/)
- [Chrome Extension Debugging](https://developer.chrome.com/docs/extensions/mv3/devtools/)

The Chrome DevTools Protocol is continuously evolving. Always check the official documentation for the latest protocol versions and available domains.
