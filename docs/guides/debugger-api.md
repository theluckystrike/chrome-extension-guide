---
layout: default
title: "Chrome Extension Debugger API. Developer Guide"
description: "Learn how to use the Chrome Extension Debugger API with this developer guide covering methods, permissions, and implementation examples."
canonical_url: "https://bestchromeextensions.com/guides/debugger-api/"
---
# Chrome Extension Debugger API

Introduction {#introduction}

The `chrome.debugger` API is a powerful Chrome Extension API that allows you to instrument, inspect, and debug web pages using the Chrome DevTools Protocol (CDP). Unlike the standard DevTools that are designed for human interaction, the Debugger API enables programmatic control over browser inspection, making it possible to build powerful developer tools, testing utilities, and automation scripts.

This guide covers everything you need to know to build DevTools-powered extensions using the `chrome.debugger` API.

1. Chrome DevTools Protocol Overview {#1-chrome-devtools-protocol-overview}

What is CDP? {#what-is-cdp}

The Chrome DevTools Protocol (CDP) is a protocol that allows tools to instrument, inspect, debug, and profile Chromium-based browsers. It provides a set of commands and events that enable external clients to interact with browser tabs, network traffic, JavaScript execution, and more.

CDP operates over a WebSocket-like communication channel, though in Chrome Extensions, we access it through the `chrome.debugger` API. Each command consists of:
- Method: The CDP domain and method name (e.g., `Network.enable`, `Runtime.evaluate`)
- Parameters: Optional JSON object with method-specific parameters
- Session ID: Optional identifier for multi-target debugging

CDP Domains {#cdp-domains}

CDP is organized into domains, each providing related functionality:

| Domain | Purpose |
|--------|---------|
| Page | Page lifecycle, navigation, frame handling |
| Network | HTTP/HTTPS request interception, response bodies |
| Runtime | JavaScript execution, console, remote objects |
| DOM | DOM tree inspection and modification |
| Debugger | Breakpoints, stepping, call frames |
| Console | Console API access |
| Performance | Performance tracing and metrics |
| Memory | Heap snapshots, memory profiling |

Protocol Versioning {#protocol-versioning}

CDP evolves with Chrome releases. Check your Chrome version to ensure compatibility:

```javascript
chrome.debugger.getTargets((targets) => {
  console.log('Available targets:', targets);
});
```

2. Manifest Configuration {#2-manifest-configuration}

Required Permissions {#required-permissions}

To use the `chrome.debugger` API, you need to declare it in your manifest:

```json
{
  "name": "My Debugger Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "debugger"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

Important Notes {#important-notes}

- Manifest V3: The debugger API is available but requires a service worker in MV3
- Host Permissions: Host permissions are NOT required for the debugger API; only the `"debugger"` permission is needed
- User Warning: Chrome shows a warning bar when a debugger is attached to a tab

3. Attaching to Tabs {#3-attaching-to-tabs}

Basic Attachment {#basic-attachment}

The first step in using CDP is attaching to a tab:

```javascript
// background.js
const TAB_ID = chrome.runtime.id;

function attachToTab(tabId) {
  const debuggee = { tabId: tabId };

  chrome.debugger.attach(debuggee, "1.3", (() => {
    if (chrome.runtime.lastError) {
      console.error('Attach failed:', chrome.runtime.lastError.message);
      return;
    }
    console.log('Successfully attached to tab', tabId);
  }));
}

// Attach when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url.startsWith('http')) {
    attachToTab(tabId);
  }
});
```

The attach() Method {#the-attach-method}

```javascript
chrome.debugger.attach(debuggee, protocolVersion, callback)
```

Parameters:
- debuggee: Object with properties:
  - `tabId`: The ID of the tab to debug (required)
  - `extensionId`: Your extension's ID (optional, for background debugging)
  - `targetId`: Specific target within a target (optional)
- protocolVersion: String specifying CDP version (typically "1.3")
- callback: Called when the operation completes

Detaching from Tabs {#detaching-from-tabs}

Always detach when done to clean up:

```javascript
function detachFromTab(tabId) {
  const debuggee = { tabId: tabId };
  
  chrome.debugger.detach(debuggee, () => {
    if (chrome.runtime.lastError) {
      console.error('Detach failed:', chrome.runtime.lastError.message);
      return;
    }
    console.log('Detached from tab', tabId);
  });
}
```

4. Sending CDP Commands {#4-sending-cdp-commands}

Using sendCommand() {#using-sendcommand}

After attaching, send CDP commands using `sendCommand`:

```javascript
function enableNetworkLogging(tabId) {
  const debuggee = { tabId: tabId };
  
  // Enable the Network domain
  chrome.debugger.sendCommand(debuggee, "Network.enable", {}, () => {
    if (chrome.runtime.lastError) {
      console.error('Network.enable failed:', chrome.runtime.lastError.message);
      return;
    }
    console.log('Network logging enabled');
  });
}

// Send a command with parameters - evaluate JavaScript
function evaluateScript(tabId, script) {
  const debuggee = { tabId: tabId };
  
  chrome.debugger.sendCommand(
    debuggee,
    "Runtime.evaluate",
    {
      expression: script,
      returnByValue: true,
      awaitPromise: true
    },
    (result) => {
      if (chrome.runtime.lastError) {
        console.error('Runtime.evaluate failed:', chrome.runtime.lastError.message);
        return;
      }
      console.log('Script result:', result.result);
    }
  );
}
```

Command Response Format {#command-response-format}

CDP commands return results in this format:

```javascript
{
  id: 1,                    // Request ID
  result: { ... },          // Command-specific result
  sessionId: "...",         // Session identifier
  error?: {                 // Error object (if failed)
    code: "error_code",
    message: "Error description"
  }
}
```

Common CDP Commands {#common-cdp-commands}

#### Runtime Domain

```javascript
// Evaluate JavaScript in page context
chrome.debugger.sendCommand(debuggee, "Runtime.evaluate", {
  expression: "document.title",
  returnByValue: true
});

// Get object properties
chrome.debugger.sendCommand(debuggee, "Runtime.getProperties", {
  objectId: "...",
  ownProperties: true
});

// Call function on object
chrome.debugger.sendCommand(debuggee, "Runtime.callFunctionOn", {
  functionDeclaration: "function() { return this.href; }",
  objectId: "..."
});
```

#### DOM Domain

```javascript
// Get document root node
chrome.debugger.sendCommand(debuggee, "DOM.getDocument", {
  depth: 1
});

// Query selector
chrome.debugger.sendCommand(debuggee, "DOM.querySelector", {
  nodeId: rootNodeId,
  selector: ".my-class"
});

// Get node details
chrome.debugger.sendCommand(debuggee, "DOM.getAttributes", {
  nodeId: nodeId
});
```

#### Page Domain

```javascript
// Navigate to URL
chrome.debugger.sendCommand(debuggee, "Page.navigate", {
  url: "https://example.com"
});

// Get frame tree
chrome.debugger.sendCommand(debuggee, "Page.getFrameTree");

// Capture screenshot
chrome.debugger.sendCommand(debuggee, "Page.captureScreenshot", {
  format: "png",
  quality: 100
});
```

5. Handling Events {#5-handling-events}

onEvent Listener {#onevent-listener}

The `chrome.debugger.onEvent` event fires when CDP sends events from the browser:

```javascript
// Listen for all CDP events
chrome.debugger.onEvent.addListener((source, method, params) => {
  // source: { tabId, extensionId, sessionId }
  // method: CDP method name (e.g., "Network.requestWillBeSent")
  // params: Event parameters
  
  console.log(`Event: ${method}`, params);
  
  // Handle specific events
  if (method === "Network.requestWillBeSent") {
    handleNetworkRequest(params);
  } else if (method === "Runtime.consoleAPICalled") {
    handleConsoleAPI(params);
  }
});

function handleNetworkRequest(params) {
  console.log('Request URL:', params.request.url);
  console.log('Request Method:', params.request.method);
  console.log('Document URL:', params.documentURL);
}

function handleConsoleAPI(params) {
  console.log('Console type:', params.type); // log, error, warning, etc.
  params.args.forEach(arg => {
    console.log('Console arg:', arg.value || arg.description);
  });
}
```

onDetach Listener {#ondetach-listener}

Handle disconnection events:

```javascript
chrome.debugger.onDetach.addListener((source, reason) => {
  console.log('Debugger detached from tab', source.tabId);
  console.log('Reason:', reason);

  // Possible reasons (DetachReason enum):
  // - "target_closed": Target page was closed
  // - "canceled_by_user": User canceled the debugging session

  if (reason === "target_closed") {
    // Optionally re-attach or clean up
    cleanupForTab(source.tabId);
  }
});
```

Complete Event Example {#complete-event-example}

Here's a practical example capturing all network requests:

```javascript
class NetworkDebugger {
  constructor(tabId) {
    this.tabId = tabId;
    this.debuggee = { tabId: tabId };
    this.requests = new Map();
  }
  
  start() {
    // Enable Network domain
    chrome.debugger.sendCommand(this.debuggee, "Network.enable", {}, () => {
      console.log('Network debugging enabled');
    });
    
    // Set up event listener
    this.onEvent = this.onEvent.bind(this);
    chrome.debugger.onEvent.addListener(this.onEvent);
  }
  
  onEvent(source, method, params) {
    if (source.tabId !== this.tabId) return;
    
    switch (method) {
      case "Network.requestWillBeSent":
        this.requests.set(params.requestId, {
          url: params.request.url,
          method: params.request.method,
          headers: params.request.headers,
          timestamp: params.timestamp,
          type: params.type
        });
        break;
        
      case "Network.responseReceived":
        const req = this.requests.get(params.requestId);
        if (req) {
          req.status = params.response.status;
          req.statusText = params.response.statusText;
          req.responseHeaders = params.response.headers;
        }
        break;
        
      case "Network.loadingFinished":
        const completed = this.requests.get(params.requestId);
        if (completed) {
          completed.encodedDataLength = params.encodedDataLength;
          completed.endTime = params.timestamp;
          console.log('Completed request:', completed);
        }
        break;
    }
  }
  
  stop() {
    chrome.debugger.sendCommand(this.debuggee, "Network.disable");
    chrome.debugger.onEvent.removeListener(this.onEvent);
  }
  
  getRequests() {
    return Array.from(this.requests.values());
  }
}
```

6. Common CDP Domains in Detail {#6-common-cdp-domains-in-detail}

Network Domain {#network-domain}

The Network domain provides comprehensive access to HTTP/HTTPS traffic:

```javascript
// Enable network tracking
await sendCommand(tabId, "Network.enable");

// Set request interception
await sendCommand(tabId, "Network.setRequestInterception", {
  patterns: [{ urlPattern: "*://api.example.com/*" }]
});

// Get response body
await sendCommand(tabId, "Network.getResponseBody", {
  requestId: requestId
});

// Clear browser cache
await sendCommand(tabId, "Network.clearBrowserCache");

// Set extra HTTP headers
await sendCommand(tabId, "Network.setExtraHTTPHeaders", {
  headers: { "X-Custom-Header": "my-value" }
});
```

DOM Domain {#dom-domain}

Inspect and manipulate the DOM tree:

```javascript
// Get the DOM tree
const docResult = await sendCommand(tabId, "DOM.getDocument", { depth: -1 });

// Find node by selector
const queryResult = await sendCommand(tabId, "DOM.querySelector", {
  nodeId: docResult.root.nodeId,
  selector: "#main-content"
});

// Get node's HTML
const resolveResult = await sendCommand(tabId, "DOM.resolveNode", {
  nodeId: queryResult.nodeId
});

// Get box model for element
const boxResult = await sendCommand(tabId, "DOM.getBoxModel", {
  nodeId: queryResult.nodeId
});
```

Runtime Domain {#runtime-domain}

Execute and inspect JavaScript:

```javascript
// Simple evaluation
const evalResult = await sendCommand(tabId, "Runtime.evaluate", {
  expression: "2 + 2",
  returnByValue: true
});
console.log(evalResult.result.value); // 4

// Evaluate with side effects allowed
const sideEffectResult = await sendCommand(tabId, "Runtime.evaluate", {
  expression: "document.body.innerHTML = '<p>Modified</p>'",
  awaitPromise: false,
  silent: false
});

// Remote object handling
const objResult = await sendCommand(tabId, "Runtime.evaluate", {
  expression: "window.localStorage"
});

// Get properties of remote object
const propsResult = await sendCommand(tabId, "Runtime.getProperties", {
  objectId: objResult.result.objectId,
  ownProperties: true
});
```

Page Domain {#page-domain}

Control page navigation and capture content:

```javascript
// Navigate to URL
await sendCommand(tabId, "Page.navigate", { url: "https://example.com" });

// Wait for navigation to complete
await sendCommand(tabId, "Page.enable");
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === "Page.loadEventFired") {
    console.log('Page loaded at', params.timestamp);
  }
});

// Get frame tree
const frameTree = await sendCommand(tabId, "Page.getFrameTree");

// Get layout metrics
const metrics = await sendCommand(tabId, "Page.getLayoutMetrics");

// Print to PDF
const pdf = await sendCommand(tabId, "Page.printToPDF", {
  landscape: true,
  printBackground: true,
  paperWidth: 8.5,
  paperHeight: 11
});
```

7. Building DevTools-Powered Extensions {#7-building-devtools-powered-extensions}

Complete Extension Example {#complete-extension-example}

Here's a complete extension that monitors console output:

```javascript
// manifest.json
{
  "manifest_version": 3,
  "name": "Console Monitor",
  "version": "1.0",
  "permissions": ["debugger", "storage"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

```javascript
// background.js
class ConsoleMonitor {
  constructor() {
    this.activeTabs = new Map();
    this.setupListeners();
  }
  
  setupListeners() {
    // Attach to new tabs
    chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
      if (info.status === 'complete' && this.shouldMonitor(tab.url)) {
        this.attach(tabId);
      }
    });
    
    // Handle detachment
    chrome.debugger.onDetach.addListener((source, reason) => {
      this.activeTabs.delete(source.tabId);
    });
    
    // Forward console events to extension
    chrome.debugger.onEvent.addListener((source, method, params) => {
      if (method === "Runtime.consoleAPICalled") {
        this.handleConsoleEvent(source.tabId, params);
      }
    });
  }
  
  shouldMonitor(url) {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
  }
  
  attach(tabId) {
    const debuggee = { tabId };
    
    chrome.debugger.attach(debuggee, "1.3", async () => {
      if (chrome.runtime.lastError) {
        console.error('Attach error:', chrome.runtime.lastError.message);
        return;
      }
      
      // Enable Runtime domain to receive console events
      await this.sendCommand(tabId, "Runtime.enable");
      
      // Also enable console domain
      await this.sendCommand(tabId, "Console.enable");
      
      this.activeTabs.set(tabId, true);
      console.log('Attached to tab:', tabId);
    });
  }
  
  sendCommand(tabId, method, params = {}) {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand(
        { tabId },
        method,
        params,
        (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        }
      );
    });
  }
  
  handleConsoleEvent(tabId, params) {
    const message = {
      tabId,
      type: params.type,
      timestamp: params.timestamp,
      args: params.args.map(arg => this.formatValue(arg))
    };
    
    // Store in extension storage
    chrome.storage.local.get(['messages'], (result) => {
      const messages = result.messages || [];
      messages.push(message);
      // Keep only last 1000 messages
      if (messages.length > 1000) {
        messages.splice(0, messages.length - 1000);
      }
      chrome.storage.local.set({ messages });
    });
    
    console.log('[Console]', message.type, message.args);
  }
  
  formatValue(arg) {
    if (arg.type === "string") return arg.value;
    if (arg.type === "number") return arg.value;
    if (arg.type === "boolean") return arg.value;
    if (arg.type === "object") return arg.description;
    if (arg.type === "function") return arg.description;
    return arg.description;
  }
}

// Initialize
new ConsoleMonitor();
```

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 400px; padding: 10px; font-family: system-ui; }
    .console-entry { padding: 5px; border-bottom: 1px solid #eee; }
    .console-entry.error { color: red; }
    .console-entry.warning { color: orange; }
    .console-entry.log { color: black; }
  </style>
</head>
<body>
  <h3>Console Monitor</h3>
  <div id="messages"></div>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['messages'], (result) => {
    const messages = result.messages || [];
    const container = document.getElementById('messages');
    
    messages.slice(-20).forEach(msg => {
      const div = document.createElement('div');
      div.className = `console-entry ${msg.type}`;
      div.textContent = `${msg.type}: ${msg.args.join(' ')}`;
      container.appendChild(div);
    });
  });
});
```

8. Security Restrictions and User Consent {#8-security-restrictions-and-user-consent}

Extension Permissions {#extension-permissions}

The `chrome.debugger` API requires specific permissions:

1. "debugger" permission: Required in manifest
2. User awareness: Chrome shows a warning bar when debugger attaches to a tab

User Warning Banner {#user-warning-banner}

When your extension attaches to a tab, Chrome displays a warning bar at the top of the page informing the user that an extension is debugging the tab. The user can cancel the debugging session, which will trigger the `onDetach` event with reason `"canceled_by_user"`.

Best Practices for Security {#best-practices-for-security}

```javascript
// Always check for user consent
chrome.debugger.attach(debuggee, "1.3", (() => {
  if (chrome.runtime.lastError) {
    if (chrome.runtime.lastError.message.includes('canceled')) {
      console.log('User canceled debugger access');
      return;
    }
    // Handle other errors
  }
}));

// Minimize the data you access
// Only enable domains you need
async function attachMinimal(tabId) {
  const debuggee = { tabId };
  
  // Only enable what you need
  await sendCommand(tabId, "Runtime.enable");  // For JS evaluation only
  // Don't enable Network unless you need it
  // Don't enable DOM unless you need it
}
```

Content Security Policy {#content-security-policy}

Debuggee pages operate under their own CSP. Some considerations:

```javascript
// Script injection might be blocked by CSP
// Use Runtime.evaluate to execute scripts in page context

// Note: This runs in page context, subject to page's CSP
chrome.debugger.sendCommand(debuggee, "Runtime.evaluate", {
  expression: "document.cookie",
  includeCommandLineAPI: false
});
```

9. Debugging Tips and Common Issues {#9-debugging-tips-and-common-issues}

Debugging Your Extension {#debugging-your-extension}

```javascript
// Add logging to track CDP communication
const originalSendCommand = chrome.debugger.sendCommand;
chrome.debugger.sendCommand = function(...args) {
  console.log('CDP Send:', args[1], args[2]);
  return originalSendCommand.apply(this, args);
};

chrome.debugger.onEvent.addListener((source, method, params) => {
  console.log('CDP Event:', method, params);
});
```

Common Errors {#common-errors}

| Error | Cause | Solution |
|-------|-------|----------|
| "Target closed" | Tab closed during operation | Check tab existence before sending commands |
| "User canceled" | User denied permission | Handle gracefully, notify user |
| "Debuggee not found" | Invalid tab ID | Verify tab ID is valid |
| "Connection failed" | Extension not loaded | Reload extension |
| "Protocol version mismatch" | CDP version incompatible | Use "1.3" or check Chrome version |

Handling Race Conditions {#handling-race-conditions}

```javascript
// Use callbacks or promises to ensure ordering
async function sequence(commands) {
  for (const cmd of commands) {
    await sendCommand(tabId, cmd.method, cmd.params);
  }
}

// Example: Navigate then wait for load
await sequence([
  { method: "Page.enable" },
  { method: "Page.navigate", params: { url: "https://example.com" } }
]);

// Listen for load event
await new Promise(resolve => {
  const handler = (source, method, params) => {
    if (method === "Page.loadEventFired") {
      chrome.debugger.onEvent.removeListener(handler);
      resolve();
    }
  };
  chrome.debugger.onEvent.addListener(handler);
});

console.log('Page fully loaded');
```

10. Advanced Topics {#10-advanced-topics}

Multi-Tab Debugging {#multi-tab-debugging}

```javascript
// Debug multiple tabs simultaneously
class MultiDebugger {
  constructor() {
    this.debuggers = new Map();
  }
  
  attachAll(tabIds) {
    return Promise.all(tabIds.map(id => this.attach(id)));
  }
  
  attach(tabId) {
    return new Promise((resolve, reject) => {
      const debuggee = { tabId };
      chrome.debugger.attach(debuggee, "1.3", () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          this.debuggers.set(tabId, debuggee);
          resolve();
        }
      });
    });
  }
  
  broadcast(method, params) {
    const promises = Array.from(this.debuggers.keys()).map(
      tabId => this.sendCommand(tabId, method, params)
    );
    return Promise.all(promises);
  }
}
```

Using with Other APIs {#using-with-other-apis}

Combine debugger with other Chrome Extension APIs:

```javascript
// Capture screenshot and save to downloads
async function captureAndSave(tabId) {
  // Get the tab
  const tab = await chrome.tabs.get(tabId);
  
  // Capture screenshot using CDP
  const result = await sendCommand(tabId, "Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true
  });
  
  // Convert base64 to blob
  const blob = base64ToBlob(result.data, "image/png");
  
  // Save to downloads
  chrome.downloads.download({
    url: URL.createObjectURL(blob),
    filename: `screenshot-${tab.title}.png`,
    saveAs: true
  });
}

function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
```

Summary {#summary}

The `chrome.debugger` API provides powerful capabilities for building Chrome Extensions that can:

1. Inspect page content, network traffic, and JavaScript execution
2. Modify DOM, JavaScript state, and network requests
3. Automate testing, monitoring, and debugging workflows
4. Build custom DevTools extensions and developer tools

Key takeaways:
- Always request minimal permissions
- Handle user consent gracefully
- Clean up with detach() when done
- Use event handlers to react to browser events
- Combine with other Extension APIs for powerful integrations

For more information, refer to the official [Chrome Debugger API documentation](https://developer.chrome.com/docs/extensions/mv3/reference/debugger) and the [Chrome DevTools Protocol Viewer](https://chromedevtools.github.io/devtools-protocol/).

Related Articles {#related-articles}

Related Articles

- [Debugging Extensions](../guides/debugging-extensions.md)
- [Advanced Debugging](../guides/advanced-debugging.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
