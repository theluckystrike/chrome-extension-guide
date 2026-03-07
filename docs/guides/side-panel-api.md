# Side Panel API Guide

## Overview
The Chrome Side Panel API allows extensions to display a persistent panel alongside the main browser content. Introduced in Chrome 114, this API provides a modern alternative to popup windows that stays open while users navigate or interact with the page.

## Manifest Configuration

The side panel requires configuration in the manifest.json:

```json
{
  "name": "My Side Panel Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["sidePanel"],
  "side_panel": {
    "default_path": "sidepanel.html"
  }
}
```

The side_panel key accepts:
- `default_path`: Path to the default side panel HTML file (required)
- `default_title`: Optional title for accessibility
- `default_icon`: Optional 16x16 icon

## Core API Methods

### chrome.sidePanel.setOptions(config)

Configures the side panel for a specific tab or globally:

```javascript
// Set panel for current tab only
chrome.sidePanel.setOptions({
  tabId: chrome.tabs.TAB_ID_NONE,  // Current tab
  page: 'research-panel.html'
});

// Set global default (applies to all tabs without specific config)
chrome.sidePanel.setOptions({
  tabId: chrome.tabs.TAB_ID_NONE,
  page: 'default-panel.html'
});

// Per-tab specific configuration
chrome.sidePanel.setOptions({
  tabId: 123,
  page: 'custom-panel.html'
});
```

The `tabId` can be:
- A specific tab ID: Targets that exact tab
- `chrome.tabs.TAB_ID_NONE`: Current active tab
- Omitted: Sets global default

### chrome.sidePanel.getOptions(tabId?, callback)

Reads the current panel configuration:

```javascript
// Get options for current tab
chrome.sidePanel.getOptions(chrome.tabs.TAB_ID_NONE, (config) => {
  console.log('Current panel:', config.page);
});

// Get global options (pass undefined or TAB_ID_NONE)
chrome.sidePanel.getOptions(undefined, (config) => {
  console.log('Global panel:', config.page);
});

// Get specific tab's config
chrome.sidePanel.getOptions(123, (config) => {
  if (config) {
    console.log('Tab has custom panel:', config.page);
  } else {
    console.log('Tab uses global default');
  }
});
```

### chrome.sidePanel.open(tabId?, callback)

Programmatically opens the side panel:

```javascript
// Open panel for current tab
chrome.sidePanel.open((result) => {
  if (chrome.runtime.lastError) {
    console.error('Failed to open:', chrome.runtime.lastError);
  } else {
    console.log('Panel opened successfully');
  }
});

// Open for specific tab
chrome.sidePanel.open({ tabId: 123 }, () => {
  console.log('Panel opened for tab 123');
});
```

Note: User gesture required in most contexts. The Promise resolves once the panel is shown.

### chrome.sidePanel.setPanelBehavior(config)

Configures automatic panel opening on action click:

```javascript
// Open side panel when toolbar icon clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Disable auto-open
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
```

### chrome.sidePanel.getPanelBehavior(callback)

Reads the current panel behavior configuration:

```javascript
chrome.sidePanel.getPanelBehavior((config) => {
  console.log('Auto-open enabled:', config.openPanelOnActionClick);
});
```

## Per-Tab vs Global Side Panels

### Global Side Panel
Single panel shown across all tabs:
```javascript
// Set once, applies everywhere
chrome.sidePanel.setOptions({
  tabId: chrome.tabs.TAB_ID_NONE,
  page: 'shared-panel.html'
});
```

### Per-Tab Side Panels
Different panels for different contexts:
```javascript
// Listen for tab updates to set appropriate panel
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (tab.url.includes('youtube.com')) {
      chrome.sidePanel.setOptions({ tabId, page: 'youtube-tools.html' });
    } else if (tab.url.includes('github.com')) {
      chrome.sidePanel.setOptions({ tabId, page: 'github-tools.html' });
    }
  }
});
```

## Communication: Side Panel ↔ Service Worker

Use chrome.runtime messages for communication:

### From Side Panel to Service Worker:
```javascript
// sidepanel.js
chrome.runtime.sendMessage({
  type: 'GET_ANALYSIS',
  url: window.location.href
}, (response) => {
  document.getElementById('result').textContent = response.data;
});

// background.js (service worker)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_ANALYSIS') {
    // Process and respond
    sendResponse({ data: 'Analysis result...' });
  }
});
```

### From Service Worker to Side Panel:
```javascript
// background.js
chrome.tabs.sendMessage(tabId, {
  type: 'UPDATE_CONTENT',
  data: newData
}, (response) => {
  console.log('Message sent:', response?.success);
});
```

### Using chrome.storage for State Sharing:
```javascript
// sidepanel.js - Save state
chrome.storage.local.set({ lastQuery: 'search term' });

// background.js - Read state
chrome.storage.local.get('lastQuery', (result) => {
  console.log('Last query:', result.lastQuery);
});
```

## Lifecycle and Persistence

### Panel Lifecycle
- Panel opens and loads when needed
- Panel remains open during navigation within same tab
- Panel closes when user explicitly closes it or extension is disabled
- Service worker may terminate while panel is open

### Persistence Behavior
```javascript
// Panel stays open across navigations
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    // Refresh panel content if needed
    chrome.tabs.sendMessage(details.tabId, { type: 'PAGE_LOADED' });
  }
});

// Handle service worker restart
// Panel can reconnect using chrome.runtime.connect
```

### Handling Service Worker Lifecycle
```javascript
// sidepanel.js
// Re-establish connection on load
const port = chrome.runtime.connect({ name: 'sidepanel' });

port.onMessage.addListener((message) => {
  // Handle messages from service worker
});
```

## Side Panel vs Popup: When to Use Which

| Feature | Side Panel | Popup |
|---------|-----------|-------|
| **Persistence** | Stays open during navigation | Closes on blur |
| **Size** | Resizable, up to 600px width | Fixed, ~300x400px max |
| **Lifetime** | Independent of user action | Triggered by click |
| **Communication** | Persistent connection possible | Ephemeral |
| **Use Case** | Research tools, notes, AI assistants | Quick actions, settings |

### Choose Side Panel for:
- Research assistants that analyze page content
- Note-taking that persists across pages
- AI tools that need ongoing context
- Reading aids (dictionaries, translators)

### Choose Popup for:
- Quick actions (bookmark, copy, toggle)
- Settings forms
- One-time notifications
- Simple interactions

## Responsive Design for Variable Panel Widths

The side panel can resize (user-controlled, up to 600px). Handle width changes:

```javascript
// sidepanel.js
function handleResize() {
  const width = document.body.clientWidth;
  
  if (width < 300) {
    document.body.classList.add('compact');
  } else if (width < 450) {
    document.body.classList.add('medium');
  } else {
    document.body.classList.add('expanded');
  }
}

// Use ResizeObserver for efficient monitoring
const observer = new ResizeObserver(handleResize);
observer.observe(document.body);

// CSS example
body.compact .sidebar { display: none; }
body.medium .extra-content { display: none; }
```

### Best Practices
- Use CSS Grid/Flexbox with flexible units
- Test at 300px, 400px, 500px, and 600px widths
- Consider collapsing secondary content at narrow widths

## Building a Research Assistant Side Panel

Complete example combining all concepts:

```javascript
// manifest.json
{
  "permissions": ["sidePanel", "storage", "activeTab"],
  "side_panel": { "default_path": "panel.html" },
  "action": { "default_title": "Research Assistant" }
}

// background.js
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ANALYZE_PAGE') {
    analyzePage(message.content).then(result => sendResponse(result));
    return true; // Keep message channel open for async response
  }
});

async function analyzePage(content) {
  // AI processing logic
  return { summary: '...', entities: [] };
}

// panel.html (simplified)
<script src="panel.js"></script>
<div id="app">
  <button id="analyze">Analyze Page</button>
  <div id="results"></div>
</div>

// panel.js
document.getElementById('analyze').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Inject content script to get page content
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText.substring(0, 5000)
  });
  
  chrome.runtime.sendMessage({
    type: 'ANALYZE_PAGE',
    content: results[0].result
  }, (response) => {
    document.getElementById('results').textContent = response.summary;
  });
});
```

## Reference
- [Official API Documentation](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Chrome Extensions Blog: Side Panel API](https://developer.chrome.com/blog/new-extensions-api/#side-panel)
- Manifest V3 Required
- Minimum Chrome Version: 114
