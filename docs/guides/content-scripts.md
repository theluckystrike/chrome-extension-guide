Content Scripts Guide

Overview
Content scripts are JavaScript files that run in the context of web pages. They can read and modify the DOM, respond to user actions, and communicate with the extension's background service worker. Understanding content script mechanics is essential for building effective page modifier extensions.

Content Script Declaration in manifest.json

Content scripts are declared in the manifest under the `content_scripts` key:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.ts"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

Match Patterns

Match patterns control which pages your content script injects into. They follow the format `<scheme>://<host><path>`.

Basic Patterns
```json
{
  "matches": [
    "https://*.example.com/*",      // All HTTPS pages on example.com subdomains
    "https://example.com/page/*",   // Specific path prefix
    "https://example.com/*",        // Any page on example.com
    "<all_urls>"                     // All URLs (use sparingly)
  ]
}
```

Scheme Patterns
```json
{
  "matches": [
    "https://*/*",   // HTTPS only
    "http://*/*",   // HTTP only
    "file://*/*"    // Local files
  ]
}
```

Host Wildcards
```json
{
  "matches": [
    "*://*.google.com/*",     // Any scheme, google.com and subdomains
    "https://*:*/*"          // Any host, any port
  ]
}
```

Path Wildcards
```json
{
  "matches": [
    "https://example.com/*",         // Any path
    "https://example.com/a/b/*",     // Specific path prefix
    "https://example.com/*/edit",    // Ends with /edit
    "https://example.com/a?b=c"      // Query strings
  ]
}
```

Glob Patterns

For more complex matching, use `include_globs` and `exclude_globs`:

```json
{
  "content_scripts": [
    {
      "matches": ["https://example.com/*"],
      "include_globs": ["*article*", "*blog*"],
      "exclude_globs": ["*admin*", "*test*"],
      "js": ["content.js"]
    }
  ]
}
```

Glob patterns support:
- `*` - Matches anything except `/`
- `` - Matches anything including `/`
- `?` - Matches single character
- `[]` - Character classes

Run At Timing

Control when your script executes using `run_at`:

```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

Timing Options
- `document_start` - Executes before any DOM is constructed. Use for CSS injection.
- `document_end` - Executes after DOM is complete but before resources load.
- `document_idle` - Executes after `DOMContentLoaded`. Recommended for most cases.

```typescript
// Run at document_start for early CSS injection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

Isolated World vs Main World

Content scripts run in an "isolated world" - separate from the page's JavaScript.

Isolated World
```typescript
// content.ts - Runs in isolated world
const EXTENSION_VAR = "I'm isolated from page";
window.pageAccess = "Can read but page can't write";
```

The isolated world means:
- Content script variables don't pollute global scope
- Page scripts can't modify content script code
- Page and content scripts share the DOM but not JavaScript globals

Injecting into Main World

To access page variables or avoid conflicts, inject into main world:

```typescript
// Using chrome.scripting.executeScript with world
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    // Runs in main world - can access page globals
    const pageData = window.pageData;
    return pageData;
  },
  world: "MAIN"
});
```

CSS Injection in Content Scripts

Static CSS in Manifest
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "css": ["styles.css"]
    }
  ]
}
```

Dynamic CSS Injection
```typescript
// content.ts
const style = document.createElement('style');
style.textContent = `
  .my-extension-element {
    position: fixed !important;
    z-index: 999999 !important;
  }
`;
document.head.appendChild(style);

// Cleanup on unload
window.addEventListener('unload', () => style.remove());
```

Dynamic Content Script Registration

Register content scripts programmatically with `chrome.scripting`:

```typescript
// background.ts
chrome.scripting.registerContentScripts([
  {
    id: "dynamic-script",
    matches: ["https://example.com/*"],
    js: ["content.js"],
    css: ["styles.css"],
    runAt: "document_idle"
  }
]);

// Unregister when no longer needed
chrome.scripting.unregisterContentScripts(["dynamic-script"]);
```

Programmatic Injection with executeScript

Inject scripts on-demand from background or popup:

```typescript
// Inject a function
await chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: (args) => {
    document.body.style.backgroundColor = args.color;
    return document.body.style.backgroundColor;
  },
  args: [{ color: '#ff0000' }]
});

// Inject a file
await chrome.scripting.executeScript({
  target: { tabId: tabId },
  files: ['content.js']
});

// Inject multiple scripts in order
await chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => { window.ready = true; }
});
```

Shadow DOM for UI Isolation

Use Shadow DOM to prevent page styles from affecting your UI:

```typescript
// content.ts - Create isolated UI
const host = document.createElement('div');
host.id = 'my-extension-root';
document.body.appendChild(host);

const shadow = host.attachShadow({ mode: 'open' });

shadow.innerHTML = `
  <style>
    :host {
      position: fixed;
      z-index: 2147483647;
      font-family: Arial, sans-serif;
    }
    .tooltip {
      background: #333;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
    }
  </style>
  <div class="tooltip">Extension UI</div>
`;

// Page styles won't affect shadow DOM contents
```

MutationObserver for Dynamic Pages

Monitor DOM changes for SPAs and dynamic content:

```typescript
// content.ts
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        handleNewElement(node as Element);
      }
    }
  }
});

function handleNewElement(element: Element) {
  if (element.matches('.dynamic-content')) {
    processDynamicContent(element);
  }
}

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Cleanup on unload
window.addEventListener('unload', () => observer.disconnect());
```

Communication with Service Worker

Sending Messages from Content Script

```typescript
// content.ts - Send to background
chrome.runtime.sendMessage({
  type: 'PAGE_ACTION',
  payload: { url: window.location.href }
}).then(response => {
  console.log('Background response:', response);
});
```

Two-Way Communication

```typescript
// content.ts
async function requestData() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'GET_DATA' },
      (response) => resolve(response)
    );
  });
}

// With async/await wrapper
function sendMessage(message: object): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, resolve);
  });
}
```

Long-Lived Connections

```typescript
// content.ts
const port = chrome.runtime.connect({ name: 'content-port' });

port.onMessage.addListener((msg) => {
  console.log('Received:', msg);
});

port.postMessage({ type: 'INIT', tab: location.href });
```

Accessing Extension Resources

Use `chrome.runtime.getURL` to reference extension files:

```typescript
// content.ts
const iconUrl = chrome.runtime.getURL('images/icon.png');
const scriptUrl = chrome.runtime.getURL('scripts/injected.js');

// Inject an image
const img = document.createElement('img');
img.src = iconUrl;
document.body.appendChild(img);
```

Web Accessible Resources

Declare accessible resources in manifest:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/*", "scripts/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

Then access them:
```typescript
const resourceUrl = chrome.runtime.getURL('images/logo.png');
```

Content Script Lifecycle

When Content Scripts Run
1. User navigates to matching URL
2. Chrome injects content script based on `run_at`
3. Script executes in isolated world
4. Script can access DOM
5. On navigation, script may reload if matches new URL

Cleanup Best Practices

```typescript
// content.ts - Clean up on page unload
let observer: MutationObserver;

function init() {
  // Setup
  observer = new MutationObserver(handleChanges);
  observer.observe(document.body, { subtree: true, childList: true });
}

function cleanup() {
  observer?.disconnect();
  // Remove any injected elements
  document.querySelectorAll('.extension-injected').forEach(el => el.remove());
}

window.addEventListener('unload', cleanup);

// Also handle SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    cleanup();
    init();
  }
}).observe(document.body, { subtree: true });
```

Performance Impact Minimization

Techniques

1. Use `run_at: document_idle` - Don't block page load
2. Lazy load features - Only inject when needed
3. Use CSS selectors efficiently - Avoid expensive queries
4. Debounce observers - Limit mutation callback frequency

```typescript
// Debounced observer
function createDebouncedObserver(callback: MutationCallback, delay: number) {
  let timeout: number;
  return (mutations: MutationRecord[]) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => callback(mutations), delay);
  };
}

const observer = new MutationObserver(
  createDebouncedObserver(handleMutations, 100)
);
```

5. Remove observers when done - Always disconnect
6. Use `contains` instead of deep selectors when possible
7. Cache DOM queries - Store references, don't query repeatedly

Avoiding Conflicts with Page JavaScript

Namespace Everything

```typescript
// content.ts - Wrap in IIFE with unique prefix
(function() {
  const EXTENSION_PREFIX = 'myext_';
  
  function init() {
    // Your code
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

Avoid Global Variables

```typescript
// Bad
const myData = {};

// Good
const ExtensionNamespace = {
  myData: {},
  init: function() { /* ... */ }
};
```

Use Shadow DOM for UI Components

```typescript
// Isolate your UI from page CSS
const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'closed' });
shadow.innerHTML = '<button>Click me</button>';
```

Cross-Origin Restrictions

Content scripts are subject to cross-origin policies:

What Works
- Reading/modifying the page DOM
- Using `fetch` to extension URLs
- Messaging with extension contexts

What Doesn't Work
- Making cross-origin requests to arbitrary sites (use background)
- Reading cookies/storage of other origins
- Accessing `localStorage` of other domains

```typescript
// Use background for cross-origin requests
// content.ts -> background.ts -> external API
chrome.runtime.sendMessage({
  type: 'FETCH_EXTERNAL',
  url: 'https://api.example.com/data'
});
```

Building a Page Modifier Extension

Here's a complete example:

manifest.json
```json
{
  "manifest_version": 3,
  "name": "Page Highlighter",
  "version": "1.0",
  "permissions": ["activeTab", "scripting"],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_popup": "popup.html"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

content.ts
```typescript
interface HighlightConfig {
  color: string;
  minLength: number;
}

class PageHighlighter {
  private config: HighlightConfig;
  private observer: MutationObserver;

  constructor(config: HighlightConfig) {
    this.config = config;
    this.observer = new MutationObserver(
      this.createDebouncedObserver(this.handleMutations, 200)
    );
  }

  init() {
    this.highlightExistingContent();
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private highlightExistingContent() {
    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
    elements.forEach(el => this.processElement(el));
  }

  private processElement(element: Element) {
    if (element.textContent!.length >= this.config.minLength) {
      element.classList.add('extension-highlight');
    }
  }

  private handleMutations(mutations: MutationRecord[]) {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          this.processElement(node as Element);
        }
      });
    });
  }

  private createDebouncedObserver(callback: Function, delay: number) {
    let timeout: number;
    return (...args: unknown[]) => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => callback(...args), delay);
    };
  }

  destroy() {
    this.observer.disconnect();
    document.querySelectorAll('.extension-highlight').forEach(el => {
      el.classList.remove('extension-highlight');
    });
  }
}

// Initialize
const highlighter = new PageHighlighter({ color: 'yellow', minLength: 50 });
highlighter.init();

// Cleanup on navigation/frame destroy
window.addEventListener('unload', () => highlighter.destroy());
```

popup.ts (for user control)
```typescript
document.getElementById('toggle')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id!, { action: 'toggle' }, (response) => {
    console.log('Toggle result:', response);
  });
});
```

Reference
- [Content Scripts Documentation](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome Scripting API](https://developer.chrome.com/docs/extensions/reference/scripting)
- [Match Patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
