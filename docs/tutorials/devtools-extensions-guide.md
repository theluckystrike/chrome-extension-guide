---
layout: default
title: "Building DevTools Extensions for Chrome"
description: "A comprehensive tutorial on building Chrome DevTools extensions. Learn to create custom panels, sidebars, use the inspectedWindow API, evaluate code in page context, intercept network requests, and extend the Elements panel."
canonical_url: "https://bestchromeextensions.com/tutorials/devtools-extensions-guide/"
---

Building DevTools Extensions for Chrome

Chrome DevTools extensions allow you to extend Chrome's built-in developer tools with custom panels, sidebars, network analyzers, and more. Whether you want to build a performance profiler, API tester, or DOM inspector, DevTools extensions provide deep integration with the browser's debugging capabilities.

This tutorial covers all aspects of building DevTools extensions, from manifest configuration to advanced communication patterns.

Prerequisites {#prerequisites}

Before starting, ensure you have:
- Chrome 88 or later (for full DevTools API support)
- Basic familiarity with HTML, CSS, and JavaScript
- Understanding of Chrome extension architecture (manifest V3)
- Knowledge of the extension's background service worker concept

Step 1: Manifest Configuration {#step-1-manifest-configuration}

DevTools extensions require specific manifest configuration using the `devtools_page` field:

```json
{
  "manifest_version": 3,
  "name": "DevTools Network Profiler",
  "version": "1.0",
  "description": "Advanced network profiling and request interception",
  "devtools_page": "devtools.html",
  "background": {
    "service_worker": "background.js"
  },
  "permissions": [
    "storage",
    "tabs"
  ]
}
```

Key manifest entries:
- `devtools_page`. Required. Points to an HTML file that loads the DevTools initialization script
- `permissions`. Additional permissions your extension needs
- `background`. Service worker for long-running tasks and communication

```html
<!-- devtools.html -->
<!DOCTYPE html>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DevTools Initialization</title>
</head>
<body>
  <script src="devtools.js"></script>
</body>
</html>
```

Step 2: DevTools Page Lifecycle {#step-2-devtools-page-lifecycle}

The DevTools page (`devtools.js`) is loaded every time DevTools opens. Understanding its lifecycle is crucial:

```javascript
// devtools.js

// This runs when DevTools opens
console.log('DevTools page loaded');

// Track DevTools panel visibility
let isVisible = false;

// Create custom panels
chrome.devtools.panels.create(
  'Network Profiler',
  'assets/icon-16.png',
  'panel.html',
  (panel) => {
    // Panel is created successfully
    panel.onShown.addListener((panelWindow) => {
      isVisible = true;
      console.log('Panel shown');
      // Initialize panel content
      panelWindow.initPanel();
    });

    panel.onHidden.addListener(() => {
      isVisible = false;
      console.log('Panel hidden');
      // Pause expensive operations
    });
  }
);

// Create custom sidebar
chrome.devtools.panels.elements.createSidebarPane(
  'Element Stats',
  (sidebar) => {
    sidebar.setObject({ 
      status: 'Ready',
      elementCount: 0 
    });
    
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      // Update sidebar when element selection changes
      updateSidebar(sidebar);
    });
  }
);

function updateSidebar(sidebar) {
  chrome.devtools.inspectedWindow.eval(
    'document.querySelectorAll("*").length',
    (count) => {
      if (!chrome.runtime.lastError) {
        sidebar.setObject({
          elementCount: count,
          status: 'Updated'
        });
      }
    }
  );
}

// Cleanup when DevTools closes
window.addEventListener('unload', () => {
  console.log('DevTools closing');
  // Release resources
});
```

Lifecycle Events Summary

| Event | Description |
|-------|-------------|
| DevTools open | `devtools.js` loads and initializes |
| Panel shown | `panel.onShown` fires |
| Panel hidden | `panel.onHidden` fires |
| Tab changes | New `devtools.js` instance loads |
| DevTools close | Resources released |

Step 3: Creating Custom Panels {#step-3-creating-custom-panels}

Custom panels appear as new tabs in DevTools. Here's how to create a fully functional panel:

```json
{
  "manifest_version": 3,
  "name": "Custom DevTools Panel",
  "version": "1.0",
  "devtools_page": "devtools.html",
  "permissions": ["storage"]
}
```

```javascript
// devtools.js

// Panel creation with full callback support
chrome.devtools.panels.create(
  'My Custom Panel',    // Panel title
  'images/panel-icon.png',  // 16x16 icon
  'panel.html',         // Panel content
  (panel) => {
    // onShown: Panel becomes visible
    panel.onShown.addListener((panelWindow) => {
      console.log('Custom panel shown');
      
      // Access panel's window object
      const panelDoc = panelWindow.document;
      const statusEl = panelDoc.getElementById('status');
      if (statusEl) {
        statusEl.textContent = 'Active';
      }
    });

    // onHidden: Panel is hidden
    panel.onHidden.addListener(() => {
      console.log('Custom panel hidden');
    });

    // onSearch: Search action in panel
    panel.onSearch.addListener((action, queryString) => {
      console.log('Search:', action, queryString);
    });
  }
);
```

```html
<!-- panel.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Custom Panel</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      margin: 0;
      background: #fff;
    }
    .dark {
      background: #242424;
      color: #f0f0f0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    .dark .header {
      border-bottom-color: #404040;
    }
    h2 {
      margin: 0;
      font-size: 16px;
    }
    button {
      padding: 6px 12px;
      background: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background: #3367d6;
    }
    .content {
      display: grid;
      gap: 12px;
    }
    .card {
      padding: 12px;
      background: #f5f5f5;
      border-radius: 6px;
    }
    .dark .card {
      background: #333;
    }
    .label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }
    .dark .label {
      color: #999;
    }
    .value {
      font-size: 14px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Page Analyzer</h2>
    <button id="refresh-btn">Refresh</button>
  </div>
  
  <div class="content">
    <div class="card">
      <div class="label">Page Title</div>
      <div class="value" id="page-title">Loading...</div>
    </div>
    <div class="card">
      <div class="label">URL</div>
      <div class="value" id="page-url">Loading...</div>
    </div>
    <div class="card">
      <div class="label">DOM Elements</div>
      <div class="value" id="element-count">-</div>
    </div>
    <div class="card">
      <div class="label">Scripts</div>
      <div class="value" id="script-count">-</div>
    </div>
  </div>

  <script>
    // Detect theme
    const isDark = chrome.devtools.panels.themeName === 'dark';
    if (isDark) {
      document.body.classList.add('dark');
    }

    // Initialize panel
    function initPanel() {
      // Get page information using inspectedWindow API
      chrome.devtools.inspectedWindow.eval(
        'document.title',
        (title) => {
          if (!chrome.runtime.lastError) {
            document.getElementById('page-title').textContent = title;
          }
        }
      );

      chrome.devtools.inspectedWindow.eval(
        'window.location.href',
        (url) => {
          if (!chrome.runtime.lastError) {
            document.getElementById('page-url').textContent = url;
          }
        }
      );

      chrome.devtools.inspectedWindow.eval(
        'document.querySelectorAll("*").length',
        (count) => {
          if (!chrome.runtime.lastError) {
            document.getElementById('element-count').textContent = count;
          }
        }
      );

      chrome.devtools.inspectedWindow.eval(
        'document.scripts.length',
        (count) => {
          if (!chrome.runtime.lastError) {
            document.getElementById('script-count').textContent = count;
          }
        }
      );
    }

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', initPanel);

    // Initialize on load
    initPanel();
  </script>
</body>
</html>
```

Step 4: Creating Custom Sidebars {#step-4-creating-custom-sidebars}

Sidebars appear alongside existing panels like Elements, Console, or Network. This is perfect for showing contextual information:

```javascript
// devtools.js

// Create sidebar in Elements panel
chrome.devtools.panels.elements.createSidebarPane(
  'Element Properties',
  (sidebar) => {
    // Set initial content
    sidebar.setObject({ status: 'Select an element' });

    // Update when selection changes
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      // Get selected element info ($0)
      chrome.devtools.inspectedWindow.eval(
        `($0) => {
          if (!$0) return null;
          return {
            tag: $0.tagName.toLowerCase(),
            id: $0.id || '(no id)',
            class: $0.className || '(no class)',
            attributes: Array.from($0.attributes).map(a => a.name + '="' + a.value + '"'),
            computedStyles: {
              display: window.getComputedStyle($0).display,
              position: window.getComputedStyle($0).position,
              width: window.getComputedStyle($0).width,
              height: window.getComputedStyle($0).height
            }
          };
        }($0)`,
        (result) => {
          if (!chrome.runtime.lastError && result) {
            sidebar.setObject(result);
          } else {
            sidebar.setObject({ status: 'No element selected' });
          }
        }
      );
    });
  }
);

// Create sidebar with expression evaluation
chrome.devtools.panels.elements.createSidebarPane(
  'Accessibility',
  (sidebar) => {
    // Use setExpression for reactive updates
    sidebar.setExpression(
      '(() => {
        if (!$0) return "Select an element";
        const issues = [];
        
        // Check aria attributes
        if (!$0.hasAttribute("role") && $0.tagName !== "DIV" && $0.tagName !== "SPAN") {
          issues.push("Missing role attribute");
        }
        
        // Check keyboard accessibility
        const style = window.getComputedStyle($0);
        if (style.display !== "none" && style.visibility !== "hidden") {
          if (!$0.hasAttribute("tabindex") && !$0.hasAttribute("href")) {
            issues.push("Not keyboard accessible");
          }
        }
        
        return issues.length ? issues.join(", ") : "No issues found";
      })()',
      'Accessibility Issues'
    );
  }
);

// Create sidebar in Network panel
chrome.devtools.panels.network.createSidebarPane(
  'Request Details',
  (sidebar) => {
    // Note: Network panel events require HAR listener
    chrome.devtools.network.onRequestFinished.addListener((request) => {
      // Show last request details
      const details = {
        url: request.request.url,
        method: request.request.method,
        status: request.response.status,
        size: request.response.bodySize,
        time: request.time
      };
      sidebar.setObject(details);
    });
  }
);
```

Step 5: Using the inspectedWindow API {#step-5-using-the-inspectedwindow-api}

The `chrome.devtools.inspectedWindow` API provides access to the inspected page:

```javascript
// devtools.js

// Get the tab ID being inspected
const tabId = chrome.devtools.inspectedWindow.tabId;
console.log('Inspecting tab:', tabId);

// Reload the page with options
function reloadWithOptions() {
  chrome.devtools.inspectedWindow.reload({
    ignoreCache: true,           // Ignore cache
    userAgent: 'Custom Agent',   // Override user agent
    injectedScript: `
      window.__DEVTOOLS_LOADED__ = true;
      console.log('Injected script executed');
    `,
    timeout: 10000               // Reload timeout in ms
  });
}

// Get all resources on the page
chrome.devtools.inspectedWindow.getResources((resources) => {
  resources.forEach(resource => {
    console.log(`Resource: ${resource.url} (${resource.type})`);
  });
});

// Get page URL
chrome.devtools.inspectedWindow.eval(
  'window.location.href',
  (url) => {
    console.log('Page URL:', url);
  }
);

// Access DOM directly ($0, $1, $2, $3)
function getSelectedElements() {
  chrome.devtools.inspectedWindow.eval(
    `({
      $0: $0 ? $0.outerHTML : null,
      $1: $1 ? $1.outerHTML : null,
      $2: $2 ? $2.outerHTML : null,
      $3: $3 ? $3.outerHTML : null
    })`,
    (result) => {
      console.log('Selected elements:', result);
    }
  );
}

// Capture page screenshot
function captureScreenshot() {
  chrome.devtools.inspectedWindow.eval(
    `(() => {
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      html2canvas(document.body).then(canvas => canvas.toDataURL());
    })()`,
    (result) => {
      if (result) {
        console.log('Screenshot data URL available');
      }
    }
  );
}
```

Step 6: Eval in Inspected Page Context {#step-6-eval-in-inspected-page-context}

Running code in the inspected page context requires understanding content scripts and page context:

```javascript
// devtools.js

// Basic evaluation in page context
chrome.devtools.inspectedWindow.eval(
  'document.title',
  (result, error) => {
    if (error) {
      console.error('Eval error:', error.description);
    } else {
      console.log('Page title:', result);
    }
  }
);

// Evaluate with content script context
// This accesses variables defined in content scripts
chrome.devtools.inspectedWindow.eval(
  'window.__REACT_DATA__',
  { useContentScriptContext: true },
  (result) => {
    console.log('React data:', result);
  }
);

// Evaluate with predefined variables
// Define $ and $$ for querySelector
chrome.devtools.inspectedWindow.eval(
  `(() => {
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelector(sel));
    return $$('a').map(a => a.href);
  })()`,
  (links) => {
    console.log('All links:', links);
  }
);

// Inject content script-like code
function injectScript(script) {
  chrome.devtools.inspectedWindow.eval(
    `(function() {
      ${script}
    })()`,
    (result, error) => {
      if (error) {
        console.error('Injection failed:', error);
      }
    }
  );
}

// Example: Extract all form data
function extractForms() {
  chrome.devtools.inspectedWindow.eval(
    `Array.from(document.forms).map(form => ({
      action: form.action,
      method: form.method,
      fields: Array.from(form.elements).map(el => ({
        name: el.name,
        type: el.type,
        value: el.value
      }))
    }))`,
    (forms) => {
      console.log('Forms:', forms);
    }
  );
}

// Example: Get computed styles of selected element
function getSelectedElementStyles() {
  chrome.devtools.inspectedWindow.eval(
    `(() => {
      if (!$0) return null;
      const style = window.getComputedStyle($0);
      return {
        display: style.display,
        position: style.position,
        width: style.width,
        height: style.height,
        color: style.color,
        background: style.background,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily
      };
    })()`,
    (styles) => {
      console.log('Computed styles:', styles);
    }
  );
}

// Safe evaluation with error handling
async function safeEval(expression) {
  return new Promise((resolve) => {
    chrome.devtools.inspectedWindow.eval(
      expression,
      (result, error) => {
        if (error) {
          resolve({ error: error.description });
        } else {
          resolve({ result });
        }
      }
    );
  });
}
```

Step 7: Network Request Interception {#step-7-network-request-interception}

Monitor and analyze network requests using the HAR (HTTP Archive) API:

```javascript
// devtools.js

// Listen for all network requests
chrome.devtools.network.onRequestFinished.addListener((request) => {
  console.log('Request:', request.request.url);
  console.log('Method:', request.request.method);
  console.log('Status:', request.response.status);
});

// Get request/response content
chrome.devtools.network.onRequestFinished.addListener((request) => {
  // Get response body
  request.getContent((content, encoding) => {
    console.log('Response body:', content);
    console.log('Encoding:', encoding);
  });

  // Get request body
  if (request.request.postData) {
    console.log('Request body:', request.request.postData.text);
  }
});

// Listen for request with specific patterns
function setupNetworkMonitoring() {
  const monitoredUrls = [];
  
  chrome.devtools.network.onRequestFinished.addListener((request) => {
    const url = request.request.url;
    
    // Filter API calls
    if (url.includes('/api/')) {
      request.getContent((body) => {
        try {
          const json = JSON.parse(body);
          console.log('API Response:', json);
        } catch (e) {
          console.log('Non-JSON response:', body.substring(0, 200));
        }
      });
    }
    
    // Track slow requests
    if (request.time > 1000) {
      console.warn('Slow request:', url, request.time + 'ms');
    }
  });
}

// Create custom network request
function createTestRequest() {
  // Note: Extensions can't directly make network requests from DevTools
  // Instead, inject code that makes the request
  chrome.devtools.inspectedWindow.eval(
    `fetch('/api/test').then(r => r.json()).then(console.log)`,
    (result) => {
      console.log('Test result:', result);
    }
  );
}

// Simulate request interception (for demo)
function simulateRequest() {
  // Get HAR entries
  chrome.devtools.network.getHAR((harLog) => {
    harLog.entries.forEach(entry => {
      console.log(`${entry.request.method} ${entry.request.url} → ${entry.response.status}`);
    });
  });
}
```

Step 8: Extending the Elements Panel {#step-8-extending-the-elements-panel}

Add custom functionality to the Elements panel through sidebars and context menus:

```javascript
// devtools.js

// Create Elements panel sidebar
chrome.devtools.panels.elements.createSidebarPane(
  'CSS Overview',
  (sidebar) => {
    // Update on selection change
    chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      chrome.devtools.inspectedWindow.eval(
        `(() => {
          if (!$0) return null;
          const computed = window.getComputedStyle($0);
          return {
            boxModel: {
              width: $0.offsetWidth,
              height: $0.offsetHeight,
              paddingTop: computed.paddingTop,
              paddingRight: computed.paddingRight,
              paddingBottom: computed.paddingBottom,
              paddingLeft: computed.paddingLeft,
              borderTop: computed.borderTopWidth,
              borderRight: computed.borderRightWidth,
              borderBottom: computed.borderBottomWidth,
              borderLeft: computed.borderLeftWidth
            },
            layout: {
              display: computed.display,
              position: computed.position,
              float: computed.float,
              clear: computed.clear
            },
            colors: {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              borderTopColor: computed.borderTopColor,
              borderBottomColor: computed.borderBottomColor
            },
            typography: {
              fontFamily: computed.fontFamily,
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight,
              lineHeight: computed.lineHeight
            }
          };
        })()`,
        (result) => {
          if (!chrome.runtime.lastError) {
            sidebar.setObject(result || {});
          }
        }
      );
    });
  }
);

// Add context menu to Elements panel
chrome.devtools.panels.elements.createSidebarPane(
  'Quick Actions',
  (sidebar) => {
    // Add button to sidebar
    sidebar.setExpression(
      `"<button id=\\"copy-selector\\">Copy Selector</button> <button id=\\"copy-xpath\\">Copy XPath</button>"`,
      'Actions'
    );
    
    // Handle clicks via message passing
    chrome.devtools.inspectedWindow.eval(
      `document.addEventListener('click', function(e) {
        if (e.target.id === 'copy-selector' && $0) {
          // Generate CSS selector
          const path = [];
          let el = $0;
          while (el && el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.tagName.toLowerCase();
            if (el.id) {
              selector += '#' + el.id;
              path.unshift(selector);
              break;
            } else {
              let sib = el, nth = 1;
              while (sib = sib.previousElementSibling) {
                if (sib.tagName === el.tagName) nth++;
              }
              if (nth > 1) selector += ':nth-of-type('+nth+')';
            }
            path.unshift(selector);
            el = el.parentElement;
          }
          navigator.clipboard.writeText(path.join(' > '));
        }
        if (e.target.id === 'copy-xpath' && $0) {
          // Generate XPath
          if (window.getXPath) return;
          window.getXPath = function(el) {
            if (el.id) return '//*[@id="' + el.id + '"]';
            let xpath = '';
            while (el && el.nodeType === Node.ELEMENT_NODE) {
              let sib = el, nth = 1;
              while (sib = sib.previousElementSibling) {
                if (sib.tagName === el.tagName) nth++;
              }
              xpath = '/' + el.tagName.toLowerCase() + (nth > 1 ? '['+nth+']' : '') + xpath;
              el = el.parentElement;
            }
            return '//html' + xpath;
          };
          navigator.clipboard.writeText(window.getXPath($0));
        }
      }, true);`,
      () => {}
    );
  }
);

// Monitor DOM mutations
chrome.devtools.inspectedWindow.eval(
  `(() => {
    if (window.__mutationObserver) return;
    window.__mutationObserver = new MutationObserver((mutations) => {
      console.log('DOM Mutation:', mutations.length);
    });
    window.__mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  })()`,
  (result) => {
    console.log('Mutation observer ready');
  }
);
```

Step 9: Communication Between DevTools and Background {#step-9-communication-between-devtools-and-background}

DevTools pages can communicate with the background service worker and other extension components:

```javascript
// devtools.js - Sending messages TO background

// Send message to background service worker
function sendToBackground(action, data) {
  chrome.runtime.sendMessage({
    from: 'devtools',
    to: 'background',
    action: action,
    data: data
  }, (response) => {
    console.log('Background response:', response);
  });
}

// Notify background of panel open
chrome.devtools.panels.create(
  'My Panel',
  null,
  'panel.html',
  (panel) => {
    panel.onShown.addListener(() => {
      sendToBackground('panel_opened', {
        timestamp: Date.now(),
        tabId: chrome.devtools.inspectedWindow.tabId
      });
    });
    
    panel.onHidden.addListener(() => {
      sendToBackground('panel_closed', {
        timestamp: Date.now()
      });
    });
  }
);

// Request data from background
async function requestDataFromBackground(key) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'getData', key: key },
      resolve
    );
  });
}
```

```javascript
// background.js - Receiving messages FROM DevTools

// Listen for messages from DevTools pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check if message is from DevTools
  if (sender.url && sender.url.includes('devtools')) {
    console.log('Message from DevTools:', message);
    
    if (message.action === 'panel_opened') {
      handlePanelOpen(message.data);
    } else if (message.action === 'panel_closed') {
      handlePanelClose(message.data);
    } else if (message.action === 'getData') {
      // Return stored data
      chrome.storage.local.get(message.key, (result) => {
        sendResponse(result[message.key]);
      });
      return true; // Keep channel open for async response
    }
  }
});

function handlePanelOpen(data) {
  console.log('Panel opened at:', new Date(data.timestamp));
  // Initialize resources
}

function handlePanelClose(data) {
  console.log('Panel closed at:', new Date(data.timestamp));
  // Clean up resources
}

// Send message to DevTools page
function sendToDevTools(tabId, message) {
  chrome.tabs.sendMessage(tabId, message, (response) => {
    console.log('DevTools response:', response);
  });
}
```

```javascript
// panel.js - Communication from panel to DevTools to background

// Send via DevTools to background
function forwardToBackground(action, data) {
  // Panel can send directly to background
  chrome.runtime.sendMessage({
    from: 'panel',
    to: 'background',
    action: action,
    data: data
  }, (response) => {
    console.log('Background response:', response);
  });
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.from === 'background') {
    console.log('From background:', message.data);
    handleBackgroundMessage(message.data);
  }
});

function handleBackgroundMessage(data) {
  // Update panel UI
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = data.message;
  }
}
```

Communication Flow Diagram

```
     chrome.runtime.sendMessage      
                                     
  DevTools Page                                         Background     
  (devtools.js)      Service Worker 
                      chrome.runtime.onMessage          (background.js)
                                     
                                                                
         chrome.tabs.sendMessage                               
                                                                
                                     
  Content Page                                          Popup/Options  
 (injected.js)                                           (HTML/JS)     
                                     
```

Step 10: Advanced Patterns {#step-10-advanced-patterns}

Theme Support

```javascript
// devtools.js

// Detect current theme
const currentTheme = chrome.devtools.panels.themeName;
// 'default' or 'dark'

// Apply theme-specific styles
if (currentTheme === 'dark') {
  document.body.classList.add('dark-theme');
}

// Listen for theme changes
// Note: Theme changes require DevTools reload
```

Panel State Persistence

```javascript
// devtools.js

// Save panel state to storage
function savePanelState(state) {
  chrome.storage.local.set({
    'devtools-panel-state': state
  });
}

// Load panel state
function loadPanelState() {
  chrome.storage.local.get('devtools-panel-state', (result) => {
    if (result['devtools-panel-state']) {
      restorePanelState(result['devtools-panel-state']);
    }
  });
}

// Auto-save on changes
function setupAutoSave() {
  const state = { filters: [], sorting: null };
  
  // Save every 5 seconds if changed
  setInterval(() => {
    savePanelState(state);
  }, 5000);
}
```

Debugging Tips

```javascript
// devtools.js

// Enable debug mode
const DEBUG = true;

function log(...args) {
  if (DEBUG) {
    console.log('[DevTools]', ...args);
  }
}

// Error handling
chrome.devtools.inspectedWindow.eval(
  'someCode()',
  (result, error) => {
    if (error) {
      // Detailed error information
      console.error('Error code:', error.code);
      console.error('Error description:', error.description);
      console.error('Error details:', error.details);
    }
  }
);

// Console to DevTools console
function logToDevToolsConsole(message) {
  chrome.devtools.inspectedWindow.eval(
    `console.log(${JSON.stringify(message)})`
  );
}
```

Testing Your Extension {#testing-your-extension}

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select your extension folder
4. Open DevTools (F12 or right-click → Inspect)
5. Your custom panel should appear as a new tab
6. Check the Console for initialization messages
7. Test sidebars in the Elements panel

Common Issues and Solutions {#common-issues-and-solutions}

DevTools Page Not Loading

- Verify `devtools_page` is correctly set in manifest
- Check that the HTML file exists and loads correctly
- Look for JavaScript errors in the console

Communication Failures

- Use `chrome.runtime.lastError` to check for errors
- Ensure message listeners are properly set up
- Verify the extension has required permissions

Eval Not Working

- Some page scripts may block evaluation
- Use try-catch in evaluated code
- Check for CSP (Content Security Policy) restrictions

Styles Not Matching

- DevTools uses its own stylesheet isolation
- Use explicit pixel values when needed
- Test in both light and dark themes

Related Articles {#related-articles}

- [Chrome DevTools API Guide](../guides/devtools-api.html). Complete reference for the chrome.devtools APIs
- [Chrome Debugger API Guide](../guides/chrome-debugger-api.html). Programmatic debugging with the Debugger API
- [Chrome DevTools Protocol Guide](../guides/chrome-devtools-protocol.html). Using Chrome DevTools Protocol for advanced debugging

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
---

Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.