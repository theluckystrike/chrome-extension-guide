---
layout: default
title: "Chrome Extension Devtools Panels. Best Practices"
description: "Create custom DevTools panels for extension debugging."
canonical_url: "https://bestchromeextensions.com/patterns/devtools-panels/"
---

# DevTools Panel Patterns

Overview {#overview}

Chrome extensions can extend the DevTools with custom panels, sidebar panes, and deep integration with the inspected page. This guide covers production patterns for building DevTools extensions: creating panels, communicating with the inspected page, watching network traffic, and persisting panel state.

> Manifest requirement: DevTools pages require `"devtools_page": "devtools.html"` in your manifest. The DevTools page runs once per open DevTools window and acts as the entry point for all `chrome.devtools.*` APIs.

---

Pattern 1: Creating a Custom DevTools Panel {#pattern-1-creating-a-custom-devtools-panel}

Register a new top-level tab in DevTools:

```ts
// devtools.ts. Runs in the DevTools page context
chrome.devtools.panels.create(
  "My Extension",        // Tab title
  "icons/panel-32.png",  // Icon path (relative to extension root)
  "panel.html",          // Panel HTML page
  (panel) => {
    // Panel created. set up lifecycle hooks
    let panelWindow: Window | null = null;

    panel.onShown.addListener((win) => {
      panelWindow = win;
      // Panel is now visible. start updating UI
      win.document.dispatchEvent(new CustomEvent("panel-shown"));
    });

    panel.onHidden.addListener(() => {
      panelWindow = null;
      // Panel hidden. pause expensive operations
    });
  }
);
```

```html
<!-- devtools.html. Minimal shell, just loads the script -->
<!DOCTYPE html>
<html>
  <body>
    <script src="devtools.js"></script>
  </body>
</html>
```

```ts
// panel.ts. Runs inside panel.html
document.addEventListener("panel-shown", () => {
  refreshData();
});

async function refreshData() {
  const el = document.getElementById("output")!;
  el.textContent = "Panel is active for tab " + chrome.devtools.inspectedWindow.tabId;
}
```

---

Pattern 2: DevTools Sidebar Pane for Elements Panel {#pattern-2-devtools-sidebar-pane-for-elements-panel}

Add a sidebar pane that updates when the user selects a DOM element:

```ts
// devtools.ts
chrome.devtools.panels.elements.createSidebarPane(
  "Component Props",
  (sidebar) => {
    // Update sidebar whenever the selected element changes
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      updateSidebar(sidebar);
    });

    // Initial update
    updateSidebar(sidebar);
  }
);

function updateSidebar(sidebar: chrome.devtools.panels.ExtensionSidebarPane) {
  // Option 1: Evaluate an expression and display the result
  sidebar.setExpression(`
    (function() {
      const el = $0; // $0 is the currently selected element
      if (!el) return { error: "No element selected" };

      return {
        tagName: el.tagName.toLowerCase(),
        id: el.id || "(none)",
        classes: [...el.classList].join(", ") || "(none)",
        dimensions: {
          width: el.offsetWidth,
          height: el.offsetHeight,
        },
        dataset: { ...el.dataset },
        computedRole: el.getAttribute("role") || el.computedRole || "(implicit)",
        childCount: el.children.length,
      };
    })()
  `, "Element Info");
}
```

```ts
// Alternative: Set sidebar content to a rendered HTML page
function updateSidebarWithPage(
  sidebar: chrome.devtools.panels.ExtensionSidebarPane
) {
  sidebar.setPage("sidebar.html");
}

// Alternative: Set sidebar content to a JSON object directly
function updateSidebarWithObject(
  sidebar: chrome.devtools.panels.ExtensionSidebarPane,
  data: Record<string, unknown>
) {
  sidebar.setObject(data, "Inspection Result");
}
```

---

Pattern 3: Inspected Window Evaluation {#pattern-3-inspected-window-evaluation}

Execute code in the context of the inspected page. This is the primary way DevTools panels interact with page content:

```ts
// panel.ts
interface PageMetrics {
  domNodes: number;
  listeners: number;
  scriptCount: number;
  styleSheetCount: number;
  memoryEstimate: string;
}

async function evaluateInPage<T>(expression: string): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(
      expression,
      (result: T, exceptionInfo) => {
        if (exceptionInfo) {
          if (exceptionInfo.isError) {
            reject(new Error(exceptionInfo.description));
          } else if (exceptionInfo.isException) {
            reject(new Error(exceptionInfo.value));
          }
          return;
        }
        resolve(result);
      }
    );
  });
}

async function collectPageMetrics(): Promise<PageMetrics> {
  return evaluateInPage<PageMetrics>(`
    (function() {
      const walker = document.createTreeWalker(
        document.documentElement,
        NodeFilter.SHOW_ELEMENT
      );
      let domNodes = 0;
      while (walker.nextNode()) domNodes++;

      return {
        domNodes,
        listeners: typeof getEventListeners === "function"
          ? Object.keys(getEventListeners(document)).length
          : -1,
        scriptCount: document.scripts.length,
        styleSheetCount: document.styleSheets.length,
        memoryEstimate: performance.memory
          ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1) + " MB"
          : "N/A",
      };
    })()
  `);
}

// Use with options for different execution contexts
async function evaluateInContentScript(expression: string) {
  return new Promise((resolve, reject) => {
    chrome.devtools.inspectedWindow.eval(
      expression,
      { useContentScriptContext: true },
      (result, exceptionInfo) => {
        if (exceptionInfo) {
          reject(new Error(exceptionInfo.description ?? exceptionInfo.value));
          return;
        }
        resolve(result);
      }
    );
  });
}
```

---

Pattern 4: DevTools to Background Communication {#pattern-4-devtools-to-background-communication}

DevTools pages cannot use `chrome.runtime.onMessage` directly. Use a persistent connection:

```ts
// devtools.ts. Establish a long-lived connection
const port = chrome.runtime.connect({ name: "devtools" });

// Send the inspected tab ID so the background knows which tab we're debugging
port.postMessage({
  type: "init",
  tabId: chrome.devtools.inspectedWindow.tabId,
});

// Relay messages between panel and background
port.onMessage.addListener((msg) => {
  // Forward to panel window if it's open
  if (panelWindow) {
    panelWindow.postMessage(msg, "*");
  }
});

// Clean up when DevTools closes
port.onDisconnect.addListener(() => {
  // Connection lost. DevTools window was closed
});
```

```ts
// background.ts. Track active DevTools connections
const devtoolsConnections = new Map<number, chrome.runtime.Port>();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "devtools") return;

  const listener = (msg: { type: string; tabId?: number; [key: string]: unknown }) => {
    if (msg.type === "init" && msg.tabId) {
      devtoolsConnections.set(msg.tabId, port);
    } else {
      // Handle other messages from DevTools
      handleDevToolsMessage(msg, port);
    }
  };

  port.onMessage.addListener(listener);

  port.onDisconnect.addListener(() => {
    port.onMessage.removeListener(listener);
    // Remove from tracking map
    for (const [tabId, p] of devtoolsConnections) {
      if (p === port) {
        devtoolsConnections.delete(tabId);
        break;
      }
    }
  });
});

// Send data to DevTools for a specific tab
function sendToDevTools(tabId: number, message: unknown) {
  const port = devtoolsConnections.get(tabId);
  if (port) {
    port.postMessage(message);
  }
}

function handleDevToolsMessage(
  msg: Record<string, unknown>,
  port: chrome.runtime.Port
) {
  // Process commands from DevTools panels
  switch (msg.type) {
    case "get-extension-state":
      port.postMessage({
        type: "extension-state",
        data: { /* ... */ },
      });
      break;
  }
}
```

```ts
// panel.ts. Communicate through the DevTools page relay
function sendToBackground(message: unknown) {
  // Post to the devtools.html page, which relays via port
  window.parent.postMessage({ direction: "to-background", payload: message }, "*");
}

window.addEventListener("message", (event) => {
  if (event.source !== window.parent) return;
  // Messages relayed from background via devtools.ts
  handleBackgroundMessage(event.data);
});
```

---

Pattern 5: Network Request Inspection from DevTools {#pattern-5-network-request-inspection-from-devtools}

Capture and analyze HTTP traffic from the inspected tab:

```ts
// devtools.ts or panel.ts
interface RequestEntry {
  url: string;
  method: string;
  status: number;
  type: string;
  size: number;
  time: number;
  timestamp: number;
}

const capturedRequests: RequestEntry[] = [];

chrome.devtools.network.onRequestFinished.addListener(
  (request: chrome.devtools.network.Request) => {
    const entry: RequestEntry = {
      url: request.request.url,
      method: request.request.method,
      status: request.response.status,
      type: request.response.content.mimeType,
      size: request.response.content.size,
      time: request.time ?? 0,
      timestamp: Date.now(),
    };

    capturedRequests.push(entry);
    updateRequestTable(entry);

    // Optionally get response body
    if (shouldCaptureBody(entry)) {
      request.getContent((content, encoding) => {
        if (content) {
          storeResponseBody(entry.url, content, encoding);
        }
      });
    }
  }
);

// Monitor navigation events
chrome.devtools.network.onNavigated.addListener((url) => {
  capturedRequests.length = 0;
  updateUI({ navigatedTo: url, cleared: true });
});

function shouldCaptureBody(entry: RequestEntry): boolean {
  // Only capture JSON API responses under 1 MB
  return (
    entry.type.includes("application/json") &&
    entry.size < 1_048_576
  );
}

function getRequestSummary() {
  const byType = new Map<string, { count: number; totalSize: number }>();

  for (const req of capturedRequests) {
    const category = categorizeRequest(req.type);
    const existing = byType.get(category) ?? { count: 0, totalSize: 0 };
    existing.count++;
    existing.totalSize += req.size;
    byType.set(category, existing);
  }

  return {
    total: capturedRequests.length,
    byType: Object.fromEntries(byType),
    slowest: [...capturedRequests].sort((a, b) => b.time - a.time).slice(0, 5),
    largest: [...capturedRequests].sort((a, b) => b.size - a.size).slice(0, 5),
    errors: capturedRequests.filter((r) => r.status >= 400),
  };
}

function categorizeRequest(mimeType: string): string {
  if (mimeType.includes("javascript")) return "JS";
  if (mimeType.includes("css")) return "CSS";
  if (mimeType.includes("image")) return "Image";
  if (mimeType.includes("json")) return "API";
  if (mimeType.includes("font")) return "Font";
  if (mimeType.includes("html")) return "Document";
  return "Other";
}
```

---

Pattern 6: Custom Panel with React/Framework Integration {#pattern-6-custom-panel-with-reactframework-integration}

Mount a React application inside a DevTools panel:

```ts
// devtools.ts
chrome.devtools.panels.create(
  "React Panel",
  "icons/panel-32.png",
  "panel.html",
  (panel) => {
    let root: ReturnType<typeof createRoot> | null = null;

    panel.onShown.addListener((win) => {
      // Mount React only once, then show/hide
      if (!root) {
        const container = win.document.getElementById("root")!;
        root = createRoot(container);
        root.render(createElement(PanelApp, {
          tabId: chrome.devtools.inspectedWindow.tabId,
        }));
      }
      // Notify the app it's visible
      win.document.dispatchEvent(new Event("devtools-panel-shown"));
    });

    panel.onHidden.addListener(() => {
      // Don't unmount. just pause updates
    });
  }
);
```

```tsx
// PanelApp.tsx
import { useState, useEffect, useCallback } from "react";

interface PanelAppProps {
  tabId: number;
}

export function PanelApp({ tabId }: PanelAppProps) {
  const [metrics, setMetrics] = useState<PageMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const onShown = () => setIsVisible(true);
    const onHidden = () => setIsVisible(false);

    document.addEventListener("devtools-panel-shown", onShown);
    document.addEventListener("devtools-panel-hidden", onHidden);
    return () => {
      document.removeEventListener("devtools-panel-shown", onShown);
      document.removeEventListener("devtools-panel-hidden", onHidden);
    };
  }, []);

  const refresh = useCallback(async () => {
    const data = await evaluateInPage<PageMetrics>(METRICS_EXPRESSION);
    setMetrics(data);
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [isVisible, refresh]);

  if (!metrics) return <div className="loading">Collecting metrics...</div>;

  return (
    <div className="panel-app">
      <header>
        <h1>Page Inspector</h1>
        <span className="tab-badge">Tab {tabId}</span>
        <button onClick={refresh}>Refresh</button>
      </header>
      <div className="metrics-grid">
        <MetricCard label="DOM Nodes" value={metrics.domNodes} />
        <MetricCard label="Scripts" value={metrics.scriptCount} />
        <MetricCard label="Stylesheets" value={metrics.styleSheetCount} />
        <MetricCard label="Memory" value={metrics.memoryEstimate} />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}
```

---

Pattern 7: DevTools Panel State Persistence {#pattern-7-devtools-panel-state-persistence}

Preserve panel state across DevTools close/reopen cycles using `chrome.storage.session`:

```ts
// panel-state.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface PanelFilter {
  method: string[];
  statusRange: [number, number];
  urlPattern: string;
}

const schema = defineSchema({
  devtoolsState: {
    activeTab: "network" as "network" | "metrics" | "logs",
    filters: {
      method: ["GET", "POST"],
      statusRange: [0, 599],
      urlPattern: "",
    } as PanelFilter,
    columnWidths: {} as Record<string, number>,
    sortColumn: "timestamp" as string,
    sortDirection: "desc" as "asc" | "desc",
    expandedRows: [] as string[],
  },
});

const storage = createStorage({ schema, area: "session" });

export class PanelStateManager {
  private state!: typeof schema.devtoolsState;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  async init() {
    const saved = await storage.get("devtoolsState");
    this.state = saved ?? schema.devtoolsState;
    return this.state;
  }

  get current() {
    return this.state;
  }

  update(patch: Partial<typeof schema.devtoolsState>) {
    Object.assign(this.state, patch);
    this.debouncedSave();
  }

  updateFilter(patch: Partial<PanelFilter>) {
    Object.assign(this.state.filters, patch);
    this.debouncedSave();
  }

  private debouncedSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      storage.set("devtoolsState", this.state);
    }, 300);
  }
}

// Usage in panel
const stateManager = new PanelStateManager();
const initialState = await stateManager.init();
renderPanel(initialState);

document.getElementById("tab-network")?.addEventListener("click", () => {
  stateManager.update({ activeTab: "network" });
  showTab("network");
});
```

---

Pattern 8: Resource and Source Watching {#pattern-8-resource-and-source-watching}

Monitor resource changes and source file updates in the inspected page:

```ts
// devtools.ts
// Get all resources loaded by the inspected page
chrome.devtools.inspectedWindow.getResources((resources) => {
  for (const resource of resources) {
    console.log(`[Resource] ${resource.type}: ${resource.url}`);

    // Get resource content
    resource.getContent((content, encoding) => {
      if (resource.type === "document" || resource.type === "script") {
        indexResourceContent(resource.url, content);
      }
    });
  }
});

// Watch for new resources added after page load (e.g., lazy-loaded scripts)
chrome.devtools.inspectedWindow.onResourceAdded.addListener((resource) => {
  notifyPanel({
    type: "resource-added",
    url: resource.url,
    resourceType: resource.type,
  });

  // Watch this resource for content changes (e.g., live-reload)
  resource.onContentCommitted.addListener((updatedContent) => {
    notifyPanel({
      type: "resource-updated",
      url: resource.url,
      contentLength: updatedContent.length,
    });
  });
});
```

```ts
// panel.ts. Source change tracker UI
interface ResourceChange {
  url: string;
  type: string;
  timestamp: number;
  contentLength: number;
}

const resourceChanges: ResourceChange[] = [];

function handleResourceEvent(event: {
  type: "resource-added" | "resource-updated";
  url: string;
  resourceType?: string;
  contentLength?: number;
}) {
  const change: ResourceChange = {
    url: event.url,
    type: event.type,
    timestamp: Date.now(),
    contentLength: event.contentLength ?? 0,
  };

  resourceChanges.unshift(change);
  renderResourceLog();
}

function renderResourceLog() {
  const container = document.getElementById("resource-log")!;
  container.innerHTML = resourceChanges
    .slice(0, 50)
    .map(
      (change) => `
      <div class="resource-entry ${change.type}">
        <span class="badge">${change.type === "resource-added" ? "NEW" : "UPD"}</span>
        <span class="url" title="${change.url}">${shortenUrl(change.url)}</span>
        <span class="time">${formatTime(change.timestamp)}</span>
      </div>
    `
    )
    .join("");
}

// Reload the inspected page and watch for changes
document.getElementById("reload-btn")?.addEventListener("click", () => {
  chrome.devtools.inspectedWindow.reload({
    ignoreCache: true,
    // Optionally inject a script before the page loads
    injectedScript: `console.time("page-load");
      window.addEventListener("load", () => console.timeEnd("page-load"));`,
  });
});

function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split("/").pop() ?? parsed.pathname;
  } catch {
    return url.slice(-40);
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}
```

---

Summary {#summary}

| Pattern | Use Case |
|---------|----------|
| Custom DevTools panel | Add a dedicated tab for extension-specific tooling |
| Sidebar pane | Augment the Elements panel with contextual data |
| Inspected window eval | Read and manipulate the page from the panel |
| Background communication | Exchange data between DevTools and the service worker |
| Network inspection | Capture and analyze HTTP traffic in real time |
| Framework integration | Build rich React/Vue panels with proper lifecycle |
| State persistence | Preserve filters, layout, and tabs across sessions |
| Resource watching | Monitor source changes and lazy-loaded assets |

DevTools extensions are uniquely powerful because they combine privileged page access with a persistent UI context. Use `chrome.devtools.inspectedWindow.eval` sparingly and prefer structured messaging via the background service worker for anything that touches extension state.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
