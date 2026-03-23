---
layout: default
title: "Chrome Extension DevTools Panel. How to Build Custom Developer Tools"
description: "Learn how to build custom Chrome DevTools panels with the chrome.devtools API. Create panels, inspect elements, extend the network panel, and add custom sidebars."
canonical_url: "https://bestchromeextensions.com/guides/devtools-extension/"
---
Chrome Extension DevTools Panel. How to Build Custom Developer Tools

Introduction {#introduction}
Chrome DevTools is the most powerful browser development environment, and Chrome extensions can extend it in powerful ways. The `chrome.devtools` API enables you to create custom panels that integrate directly into DevTools, add sidebars to existing panels like Elements and Network, and build specialized debugging tools tailored to your workflow or your users' needs.

This guide covers the fundamentals of building DevTools extensions: creating custom panels, adding sidebar panes, communicating between your extension and DevTools, and understanding the lifecycle of DevTools pages.

Understanding chrome.devtools API {#understanding-chrome-devtools-api}
The `chrome.devtools` API provides several namespaces for extending DevTools functionality:

- `chrome.devtools.panels`. Create custom panels and access existing ones
- `chrome.devtools.inspectionWindow`. Work with the inspected window
- `chrome.devtools.network`. Interact with network requests
- `chrome.devtools.recording`. Record and replay user actions

Each of these namespaces unlocks different extensibility patterns, from building entirely new panels to adding context-aware sidebars to existing tools.

manifest.json Setup {#manifestjson-setup}
To extend DevTools, you need to declare the appropriate permissions and add a dedicated DevTools page:

```json
{
  "name": "My DevTools Extension",
  "version": "1.0.0",
  "devtools_page": "devtools.html",
  "permissions": ["devtools_page"]
}
```

The `devtools_page` points to an HTML file that loads your DevTools scripts. This page has access to the `chrome.devtools` API:

```html
<!DOCTYPE html>
<html>
<head>
  <script src="devtools.js"></script>
</head>
</html>
```

Creating Custom Panels {#creating-custom-panels}

chrome.devtools.panels.create() {#chromedevtoolspanelscreate}
The `create()` method adds a new panel to the DevTools toolbar:

```javascript
chrome.devtools.panels.create(
  "My Extension Panel",  // Title shown in toolbar
  "icon.png",            // 16x16 toolbar icon
  "panel.html",          // Panel's content page
  (panel) => {
    // Panel created successfully
    panel.onShown.addListener((panelWindow) => {
      console.log("Panel is now visible");
    });
  }
);
```

The callback receives a `Panel` object with event listeners:
- `onShown`. Fired when the panel becomes active
- `onHidden`. Fired when the user switches to another panel
- `onSearch`. Fired when the user performs a search in the panel

Panel Content Page {#panel-content-page}
The panel's HTML page operates in an isolated world. To communicate with the inspected page or your extension's backend, use `chrome.devtools.inspectedWindow`:

```javascript
// In panel.html
const { hostname } = window.location;
console.log("Panel loaded for:", hostname);
```

The panel has access to the standard DOM APIs plus some DevTools-specific features. You can include scripts, styles, and frameworks just like any web page.

Extending the Elements Panel {#extending-the-elements-panel}

Adding Sidebar Panes {#adding-sidebar-panes}
You can add custom sidebars to the Elements panel that display contextual information about the selected element:

```javascript
chrome.devtools.panels.elements.createSidebarPane(
  "Element Details",
  (sidebar) => {
    // Set initial content
    sidebar.setExpression("($0)");
    
    // Update when selection changes
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      sidebar.setExpression("($0)");
    });
  }
);
```

The `setExpression()` method evaluates JavaScript in the context of the inspected page. `$0` is a built-in DevTools variable pointing to the currently selected element.

Dynamic Sidebar Content {#dynamic-sidebar-content}
For more complex visualizations, set HTML content directly:

```javascript
sidebar.setPage({
  html: `<div class="element-info">
    <h3>Selected Element</h3>
    <p>Tag: ${element.tagName}</p>
    <p>Classes: ${element.className}</p>
  </div>`
});
```

Extending the Network Panel {#extending-the-network-panel}

chrome.devtools.network {#chromedevtoolsnetwork}
The Network panel can be extended to display additional information about requests:

```javascript
chrome.devtools.network.onRequestFinished.addListener((request) => {
  console.log("Request URL:", request.request.url);
  console.log("Method:", request.request.method);
  console.log("Status:", request.response.status);
  
  // Get response body
  request.getContent((content, encoding) => {
    console.log("Response:", content);
  });
});
```

Creating Custom Network Tabs {#creating-custom-network-tabs}
You can add custom tabs to individual network request details:

```javascript
chrome.devtools.panels.network.createRequestDetailsTab(
  "My Custom Tab",
  "tab.html",
  (tab) => {
    // Tab created
  }
);
```

This is useful for adding specialized viewers for API responses, JWT decoders, or custom protocol analyzers.

Communicating with Your Extension {#communicating-with-your-extension}

Using chrome.runtime messaging {#using-chrome-runtime-messaging}
DevTools pages can communicate with your extension's background service worker using standard messaging:

```javascript
// From DevTools page to background
chrome.runtime.sendMessage({ greeting: "from-devtools" }, (response) => {
  console.log("Background responded:", response);
});

// From background to DevTools
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.url.includes("devtools")) {
    sendResponse({ message: "received" });
  }
});
```

Using chrome.runtime.connect() {#using-chromeruntimeconnect}
For persistent connections, use `connect()`:

```javascript
// In DevTools page
const port = chrome.runtime.connect({ name: "devtools-panel" });

port.postMessage({ type: "INIT", tabId: chrome.devtools.inspectedWindow.tabId });
port.onMessage.addListener((message) => {
  console.log("Received:", message);
});
```

Inspecting the Inspected Window {#inspecting-the-inspected-window}

chrome.devtools.inspectedWindow {#chromedevtoolsinspectedwindow}
This namespace provides access to the page being inspected:

```javascript
// Reload the inspected page with custom user agent
chrome.devtools.inspectedWindow.reload({
  userAgent: "MyCustomAgent/1.0"
});

// Evaluate JavaScript in the page context
chrome.devtools.inspectedWindow.eval(
  "document.title",
  (result, isException) => {
    if (!isException) {
      console.log("Page title:", result);
    }
  }
);

// Access the tab ID
const tabId = chrome.devtools.inspectedWindow.tabId;
```

Injecting Scripts {#injecting-scripts}
You can inject scripts into the inspected page:

```javascript
chrome.devtools.inspectedWindow.injectScript(
  "console.log('Injected from DevTools extension');",
  (result, isException) => {
    if (isException) {
      console.error("Injection failed:", result);
    }
  }
);
```

Best Practices {#best-practices}

Performance Considerations {#performance-considerations}
- Lazy-load panel content. don't initialize everything when the panel is created
- Use `onShown` and `onHidden` listeners to start/stop expensive operations
- Throttle updates when listening to network requests or DOM changes

User Experience {#user-experience}
- Provide clear iconography that matches DevTools design language
- Support keyboard shortcuts for common actions
- Make panels responsive and test at different DevTools widths

Security {#security}
- Always validate data received from the inspected window
- Use content security policy in your panel pages
- Be cautious when evaluating code. use `Function` or `eval` only with trusted input

Common Mistakes {#common-mistakes}
- Creating panels in the wrong context. must be in the `devtools_page`
- Not handling the asynchronous nature of DevTools APIs
- Attempting to access `chrome` APIs from injected scripts (they run in page context)
- Forgetting to account for the panel being hidden/unhidden during long operations

Related Articles {#related-articles}

- [Chrome Debugger API](../guides/debugger-api.md)
- [Chrome DevTools Protocol](../guides/chrome-devtools-protocol.md)
- [Extension Debugging Guide](../guides/debugging.md)
- [Service Workers in Extensions](../guides/service-workers.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
