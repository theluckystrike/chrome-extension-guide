Content Scripts detailed look

Content scripts are JavaScript files that run in the context of web pages, allowing extensions to interact with and manipulate the DOM. Unlike background service workers, content scripts operate within the context of the loaded page, giving them direct access to the page's HTML and JavaScript.

Content Scripts vs Background Scripts

Understanding the distinction between these two execution contexts is fundamental:

| Aspect | Content Scripts | Background Service Workers |
|--------|-----------------|---------------------------|
| Execution Context | Runs in page context | Runs in extension context |
| DOM Access | Full access to page DOM | No direct DOM access |
| Page JavaScript | Can interact with page JS | Cannot access page variables |
| Lifetime | Tied to page lifecycle | Ephemeral, can be terminated |
| Communication | Uses message passing | Uses message passing |
| Chrome APIs | Limited subset | Full access |

Content scripts share the DOM with the page but run in an isolated world, a separate JavaScript execution environment. This means page JavaScript cannot see extension variables, and extension variables cannot directly interact with page JavaScript objects.

Static vs Programmatic Injection

Static Injection (manifest.json)

Declare content scripts in the manifest for automatic injection:

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "js": ["content-script.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }]
}
```

Static declarations are simple but inflexible, the script loads every time a matching page loads, with no runtime control.

Programmatic Injection (chrome.scripting.executeScript)

Inject scripts dynamically from the background service worker:

```javascript
// background.ts
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content-script.js']
  });
  
  await chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ['styles.css']
  });
});
```

Programmatic injection offers fine-grained control, you can inject based on user actions, specific conditions, or runtime state. This is the preferred approach for most modern extensions.

Injecting Functions (Not Just Files)

You can inject inline functions for dynamic code:

```javascript
await chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: (userConfig) => {
    // This runs in page context
    const button = document.createElement('button');
    button.textContent = 'Process Page';
    button.addEventListener('click', () => {
      console.log('Processing with config:', userConfig);
    });
    document.body.appendChild(button);
  },
  args: [{ theme: 'dark', action: 'analyze' }]
});
```

The function is serialized and executed in the target context, with `args` passed as parameters.

Match Patterns and Globs

Control which URLs your content scripts run on using match patterns:

Match Patterns

```json
{
  "content_scripts": [{
    "matches": [
      "https://*.example.com/*",      // All HTTPS on subdomain
      "https://example.com/page/*",   // Specific path
      "http://localhost:3000/*",       // Development
      "<all_urls>"                     // Every page (use sparingly)
    ]
  }]
}
```

Pattern syntax:
- `*` matches any characters within a path segment
- `` matches any characters across path segments
- No scheme matches both http and https

Globs for Complex Matching

Globs provide more granular control with wildcards and exclusions:

```json
{
  "content_scripts": [{
    "matches": ["https://*.example.com/*"],
    "globs": [
      "https://*.example.com/dashboard*",      // Starts with dashboard
      "https://*.example.com/*/settings",       // Ends with settings
      "https://*.example.com/*/user/*/profile"  // Multiple segments
    ],
    "exclude_globs": [
      "https://*.example.com/*/admin*"          // Exclude admin pages
    ]
  }]
}
```

Combining `matches`, `globs`, and `exclude_globs` gives precise control over injection targets.

The run_at Property

Control when your content script executes relative to page load:

document_start

Injects before any DOM content is parsed:

```json
{
  "run_at": "document_start"
}
```

Use cases:
- Inject CSS that must apply before page renders (FOUC prevention)
- Set up listeners for dynamic content
- Modify document metadata before render

```javascript
// content-script.js - runs at document_start
const style = document.createElement('style');
style.textContent = `
  body { visibility: hidden; }
  .extension-loading { display: block; }
`;
document.head.appendChild(style);
```

document_end

Injects after the DOM is complete but before subresources:

```json
{
  "run_at": "document_end"
}
```

Use cases:
- DOM manipulation requiring complete structure
- Performance-sensitive operations
- Working with scripts that run at end of body

document_idle (Default)

Injects after `DOMContentLoaded` and when the page is idle:

```json
{
  "run_at": "document_idle"
}
```

This is the default and most common choice, safe for most DOM operations.

Use `document_idle` unless you have a specific reason otherwise. It's the safest for general DOM manipulation.

Isolated World vs Main World

Content scripts run in an isolated world, separate from the page's JavaScript context.

Isolated World (Default)

```javascript
// content-script.js
const myData = { processed: true };
window.externalData = 'from extension';

// Page JavaScript cannot access myData
// Content script cannot access page window.pageData
```

The isolated world has these characteristics:
- Separate global scope
- No sharing of JavaScript variables with page
- Can still access DOM (shared with main world)
- Useful for security, page scripts can't interfere

Injecting into Main World

To run code in the page's JavaScript context:

```javascript
await chrome.scripting.executeScript({
  target: { tabId: tabId },
  world: 'MAIN',  // Execute in page's context
  func: () => {
    // This runs in the page's JavaScript context
    window.pageVariable = 'accessible from page';
    // Can now interact with page's existing JS
  }
});
```

Caution: Code in the MAIN world can be detected by page scripts and may conflict with page JavaScript. Use sparingly.

Communication: Content Script ↔ Service Worker

Content scripts communicate with background service workers via message passing.

Sending from Content Script to Background

```javascript
// content-script.js
// One-way message
chrome.runtime.sendMessage({
  type: 'PAGE_ANALYZED',
  data: { url: window.location.href, title: document.title }
});

// Request-response pattern
chrome.runtime.sendMessage(
  { type: 'GET_SETTINGS' },
  (response) => {
    console.log('Settings:', response.settings);
  }
);
```

Receiving in Background Service Worker

```javascript
// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAGE_ANALYZED') {
    console.log('Page analyzed:', message.data);
    // Process and optionally respond
    sendResponse({ received: true });
  }
  
  if (message.type === 'GET_SETTINGS') {
    // Async response required
    getSettings().then(settings => sendResponse({ settings }));
    return true; // Keep message channel open for async response
  }
  
  return false; // Synchronous response complete
});
```

Tab-Specific Communication

For messages related to a specific tab:

```javascript
// content-script.js - send to specific tab context
chrome.runtime.sendMessage(
  { type: 'FETCH_DATA', payload: data },
  { tabId: 123 }  // Specify target tab
);
```

Long-Lived Connections

For continuous communication, use ports:

```javascript
// content-script.js
const port = chrome.runtime.connect({ name: 'content-script' });
port.postMessage({ action: 'subscribe', url: location.href });

port.onMessage.addListener((message) => {
  console.log('Received:', message);
});
```

```javascript
// background.ts
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((message) => {
    if (message.action === 'subscribe') {
      // Track this connection
    }
  });
});
```

DOM Manipulation Patterns

Safe DOM Access Patterns

```javascript
// Wait for element before manipulation
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      resolve(document.querySelector(selector));
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found`));
    }, timeout);
  });
}

// Usage
(async () => {
  const container = await waitForElement('#app-container');
  container.classList.add('extension-modified');
})();
```

Observer Patterns for Dynamic Content

```javascript
// React to DOM changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Process new elements
        processNewElement(node);
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

Best Practices

1. Check element existence before manipulation:
```javascript
const element = document.querySelector('.target');
if (element) {
  element.classList.add('modified');
}
```

2. Use event delegation for dynamic elements:
```javascript
document.addEventListener('click', (e) => {
  if (e.target.matches('.dynamic-button')) {
    handleButtonClick(e);
  }
});
```

3. Debounce rapid DOM changes:
```javascript
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

CSS Injection

Programmatic CSS Injection

```javascript
await chrome.scripting.insertCSS({
  target: { tabId: tabId },
  css: `
    .extension-highlight {
      background-color: yellow;
      padding: 2px 4px;
      border-radius: 2px;
    }
  `
});
```

Removing Injected CSS

```javascript
await chrome.scripting.removeCSS({
  target: { tabId: tabId },
  css: '.extension-highlight { background-color: yellow; }'
});
```

Dynamic Style Injection

```javascript
function injectThemeColors(theme) {
  const style = document.createElement('style');
  style.id = 'extension-theme-styles';
  style.textContent = `
    :root {
      --extension-primary: ${theme.primary};
      --extension-secondary: ${theme.secondary};
    }
  `;
  
  // Remove existing theme first
  const existing = document.getElementById('extension-theme-styles');
  if (existing) existing.remove();
  
  document.head.appendChild(style);
}
```

Shadow DOM for UI Isolation

Shadow DOM provides style isolation, your extension UI won't be affected by page styles, and page styles won't affect your UI.

Creating an Isolated Widget

```javascript
function createExtensionWidget() {
  // Create host element
  const host = document.createElement('div');
  host.id = 'extension-widget-root';
  
  // Attach shadow DOM
  const shadow = host.attachShadow({ mode: 'open' });
  
  // Inject styles (isolated from page)
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      font-family: system-ui, sans-serif;
    }
    .widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 16px;
      z-index: 999999;
    }
    .close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      cursor: pointer;
    }
  `;
  
  // Add content
  const container = document.createElement('div');
  container.className = 'widget';
  container.innerHTML = `
    <span class="close-btn">×</span>
    <h3>Extension Widget</h3>
    <p>Isolated from page styles!</p>
  `;
  
  shadow.appendChild(style);
  shadow.appendChild(container);
  
  // Event handling (shadow DOM events bubble)
  container.querySelector('.close-btn').addEventListener('click', () => {
    host.remove();
  });
  
  document.body.appendChild(host);
  return host;
}
```

Benefits of Shadow DOM

1. Style Isolation: Page CSS won't affect your component
2. No Global Pollution: Your class names won't conflict
3. Event Boundary: Events bubble but you control what's exposed

```javascript
// Even if page defines .widget { display: none !important; }
// Shadow DOM :host styles remain unaffected
```

Complete Working Example

Here's a practical extension that demonstrates these concepts:

manifest.json

```json
{
  "manifest_version": 3,
  "name": "Page Annotator",
  "version": "1.0",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_title": "Annotate Page"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

background.js

```javascript
// Handle toolbar click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content-script.js']
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_ANNOTATION') {
    chrome.storage.local.set({
      [message.url]: message.annotations
    });
    sendResponse({ saved: true });
  }
  return true;
});
```

content-script.js

```javascript
// Create Shadow DOM widget
const host = document.createElement('div');
host.id = 'annotation-widget';
const shadow = host.attachShadow({ mode: 'open' });

// Styles (isolated from page)
const style = document.createElement('style');
style.textContent = `
  :host { all: initial; }
  .toolbar {
    position: fixed; top: 20px; right: 20px;
    background: #fff; border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    padding: 12px; z-index: 2147483647;
    font-family: Arial, sans-serif;
  }
  .highlight-btn {
    background: #ffeb3b; border: none;
    padding: 8px 16px; cursor: pointer;
    border-radius: 4px; font-weight: bold;
  }
  .highlight-btn:hover { background: #fdd835; }
  .close-btn {
    position: absolute; top: 4px; right: 8px;
    cursor: pointer; font-size: 18px;
    background: none; border: none;
  }
  .annotation {
    background: rgba(255, 235, 59, 0.4);
    cursor: pointer;
  }
`;

// Toolbar UI
shadow.innerHTML = `
  <div class="toolbar">
    <button class="close-btn">×</button>
    <button class="highlight-btn">Highlight Mode</button>
  </div>
`;

// Mode state
let isHighlightMode = false;

// Toggle highlight mode
shadow.querySelector('.highlight-btn').addEventListener('click', () => {
  isHighlightMode = !isHighlightMode;
  document.body.style.cursor = isHighlightMode ? 'crosshair' : 'default';
});

// Handle page clicks in highlight mode
document.addEventListener('click', (e) => {
  if (!isHighlightMode) return;
  
  const selection = window.getSelection();
  if (selection.toString().trim()) {
    const range = selection.getRangeAt(0);
    const wrapper = document.createElement('span');
    wrapper.className = 'annotation';
    wrapper.textContent = selection.toString();
    
    range.deleteContents();
    range.insertNode(wrapper);
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'SAVE_ANNOTATION',
      url: window.location.href,
      annotations: [wrapper.outerHTML]
    });
  }
});

// Close button
shadow.querySelector('.close-btn').addEventListener('click', () => {
  host.remove();
});

// Inject into page
document.body.appendChild(host);

console.log('Annotation widget loaded');
```

Key Takeaways

1. Choose injection method wisely: Static for universal functionality, programmatic for conditional features.

2. Respect page context: Use isolated world by default; only use MAIN world when necessary.

3. Communicate via message passing: chrome.runtime.sendMessage and ports are your communication channels.

4. Use Shadow DOM for UI components: Provides style isolation and prevents conflicts.

5. Consider timing: Use `run_at` appropriately, document_start for CSS, document_idle for DOM manipulation.

6. Handle dynamic content: MutationObservers and event delegation handle SPAs and dynamic pages.

7. Test thoroughly: Content scripts run in unpredictable page environments, defensive coding is essential.

For more details, see the [official Chrome documentation](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).
