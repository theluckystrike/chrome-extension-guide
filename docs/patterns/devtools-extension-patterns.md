---
layout: default
title: "Chrome Extension Devtools Extension Patterns. Best Practices"
description: "Build custom DevTools panels and extensions for advanced debugging."
canonical_url: "https://bestchromeextensions.com/patterns/devtools-extension-patterns/"
last_modified_at: 2026-01-15
---

DevTools Extension Patterns

Overview {#overview}

Chrome DevTools extensions extend Chrome's developer tools with custom panels, sidebar panes, and deep integration with the inspected page. DevTools pages run in a privileged context with access to the `chrome.devtools.*` APIs, enabling rich debugging and inspection tooling.

> Manifest requirement: Set `"devtools_page": "devtools.html"` in manifest.json. The DevTools page loads when DevTools opens and serves as the entry point for all DevTools APIs.

---

DevTools Page Lifecycle {#devtools-page-lifecycle}

The `devtools.html` page runs once per DevTools window opening. Use it to register panels and establish communication:

```ts
// devtools.ts. Entry point for all DevTools functionality
chrome.devtools.panels.create(
  "My Panel",
  "icons/panel-16.png",
  "panel.html",
  (panel) => {
    panel.onShown.addListener((window) => {
      console.log("Panel is now visible");
    });
    panel.onHidden.addListener(() => {
      console.log("Panel hidden");
    });
  }
);

// Connect to background service worker
const backgroundPort = chrome.runtime.connect({ name: "devtools" });
backgroundPort.postMessage({ type: "devtools-opened", tabId: chrome.devtools.inspectedWindow.tabId });
```

---

Creating Custom Panels {#creating-custom-panels}

Panels appear as top-level tabs in DevTools. They contain full HTML pages with complete framework support:

```ts
// Create a new panel tab
chrome.devtools.panels.create(
  "Network Monitor",
  "icons/network-16.png",
  "network-panel.html",
  (panel) => {
    // Panel created successfully
  }
);
```

Panels can include React, Vue, or any other framework. they're standard HTML pages embedded in DevTools:

```tsx
// network-panel.tsx. Full React support in panels
import { createRoot } from "react-dom/client";
import { NetworkPanel } from "./NetworkPanel";

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(<NetworkPanel tabId={chrome.devtools.inspectedWindow.tabId} />);
});
```

---

Sidebar Panes for Elements Panel {#sidebar-panes-for-elements-panel}

Add contextual sidebars to the Elements panel that update when users select DOM elements:

```ts
// Create sidebar in Elements panel
chrome.devtools.panels.elements.createSidebarPane(
  "Component Props",
  (sidebar) => {
    // Update when selection changes
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      chrome.devtools.inspectedWindow.eval(
        "$0 && $0.__vue__ ? $0.__vue__ : null",
        (result) => {
          sidebar.setObject(result, "Vue Component Data");
        }
      );
    });
  }
);
```

---

Accessing the Inspected Page {#accessing-the-inspected-page}

Use `chrome.devtools.inspectedWindow.eval()` to execute code in the page context:

```ts
// Evaluate expression in the inspected window
chrome.devtools.inspectedWindow.eval(
  "document.querySelectorAll('.component').length",
  (result, exceptionInfo) => {
    if (!exceptionInfo) {
      console.log("Component count:", result);
    }
  }
);

// Highlight an element in the page
function highlightElement(selector: string) {
  chrome.devtools.inspectedWindow.eval(
    `inspect(document.querySelector("${selector}"))`
  );
}
```

---

Network Monitoring {#network-monitoring}

Capture and analyze HTTP traffic using the Network API:

```ts
// Listen for all network requests
chrome.devtools.network.onRequestFinished.addListener((request) => {
  console.log(`${request.request.method} ${request.request.url} → ${request.response.status}`);
  
  // Get response body
  request.getContent((content, encoding) => {
    console.log("Response:", content);
  });
});

// Get HAR (HTTP Archive) of all recorded requests
chrome.devtools.network.getHAR((har) => {
  console.log("Total requests:", har.entries.length);
});
```

---

Theme Detection {#theme-detection}

Detect whether DevTools is in light or dark mode:

```ts
// Get current DevTools theme
const themeName = chrome.devtools.panels.themeName;
// Returns: "default" (light) or "dark"

document.documentElement.classList.toggle("dark-mode", themeName === "dark");
```

---

Resource Tracking {#resource-tracking}

Monitor all resources loaded by the inspected page:

```ts
// Get all resources
chrome.devtools.inspectedWindow.getResources((resources) => {
  for (const resource of resources) {
    console.log(`${resource.type}: ${resource.url}`);
  }
});

// Watch for new resources
chrome.devtools.inspectedWindow.onResourceAdded.addListener((resource) => {
  console.log("New resource:", resource.url);
});
```

---

Communication Architecture {#communication-architecture}

DevTools pages cannot directly access content scripts. Use message passing through the background service worker:

```
     Messaging      
 DevTools       Background     
 (devtools)                       (service worker)
                    
                                         
                                         
                                  
                                   Content Script 
                                   (page context) 
                                  
```

```ts
// devtools.ts → background.ts
chrome.runtime.sendMessage({ type: "get-page-state", tabId: tabId });

// background.ts → devtools.ts  
const port = chrome.runtime.connect({ name: "devtools" });
port.postMessage({ type: "page-state", data: {...} });
```

---

Summary {#summary}

| API | Purpose |
|-----|---------|
| `chrome.devtools.panels.create()` | Create custom DevTools tabs |
| `chrome.devtools.panels.elements.createSidebarPane()` | Add sidebars to Elements panel |
| `chrome.devtools.inspectedWindow.eval()` | Execute code in page context |
| `chrome.devtools.network.onRequestFinished` | Monitor network requests |
| `chrome.devtools.panels.themeName` | Detect light/dark theme |
| `chrome.devtools.inspectedWindow.getResources()` | Track page resources |

---

Related Documentation {#related-documentation}

- [DevTools API Reference](../api-reference/devtools-api.md)
- [Building DevTools Extensions](../guides/devtools-extensions.md)
- [DevTools Panel Patterns](./devtools-panels.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
