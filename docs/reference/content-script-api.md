# Content Script API Reference

## Available Chrome APIs {#available-chrome-apis}
Content scripts run in an isolated world within web pages. Only a subset of `chrome.*` APIs are available.

### Fully Available {#fully-available}
| API | Notes |
|---|---|
| `chrome.runtime.sendMessage()` | Send messages to service worker |
| `chrome.runtime.connect()` | Open long-lived port to service worker |
| `chrome.runtime.onMessage` | Receive messages from service worker |
| `chrome.runtime.onConnect` | Receive port connections |
| `chrome.runtime.getURL(path)` | Get extension resource URL |
| `chrome.runtime.id` | Extension ID |
| `chrome.runtime.getManifest()` | Read manifest |
| `chrome.storage.local` | Full CRUD access |
| `chrome.storage.sync` | Full CRUD access |
| `chrome.storage.session` | Full access (if `accessLevel` set) |
| `chrome.storage.onChanged` | Storage change events |
| `chrome.i18n.getMessage()` | Internationalization |
| `chrome.i18n.getUILanguage()` | Get browser language |

### NOT Available (Must Message Service Worker) {#not-available-must-message-service-worker}
- `chrome.tabs.*`. use `chrome.runtime.sendMessage` to ask SW
- `chrome.bookmarks.*`
- `chrome.history.*`
- `chrome.downloads.*`
- `chrome.notifications.*`
- `chrome.alarms.*`
- `chrome.contextMenus.*`
- `chrome.action.*`
- `chrome.commands.*`
- `chrome.webNavigation.*`
- `chrome.scripting.*`
- Most other `chrome.*` APIs

## DOM Access {#dom-access}
```typescript
// Full DOM access
const title = document.title;
const links = document.querySelectorAll('a');
const body = document.body.innerHTML;

// Create/modify elements
const div = document.createElement('div');
div.id = 'my-extension-overlay';
document.body.appendChild(div);

// MutationObserver
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    console.log('DOM changed:', mutation.type);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
```

## World Isolation {#world-isolation}

### ISOLATED World (Default) {#isolated-world-default}
```typescript
// Content script runs in isolated world
// - Own JavaScript execution context
// - Shares DOM with page
// - Cannot access page's JS variables
// - Page cannot access content script's variables
// - window object is different from page's window

// This does NOT see page's variables:
console.log(window.myPageVar); // undefined
```

### MAIN World {#main-world}
```json
// manifest.json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["main-world.js"],
    "world": "MAIN"
  }]
}
```
```typescript
// Runs in page's world. can access page JS variables
// BUT: cannot use chrome.* APIs
// Must use window.postMessage to communicate with ISOLATED world scripts
console.log(window.myPageVar); // accessible!
```

### Cross-World Communication {#cross-world-communication}
```typescript
// MAIN world script
window.postMessage({ type: 'FROM_PAGE', data: window.pageData }, '*');

// ISOLATED world script
window.addEventListener('message', (event) => {
  if (event.data.type === 'FROM_PAGE') {
    chrome.runtime.sendMessage({ pageData: event.data.data });
  }
});
```

## Messaging from Content Scripts {#messaging-from-content-scripts}

### Using @theluckystrike/webext-messaging {#using-theluckystrikewebext-messaging}
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  PAGE_DATA: { request: { url: string; title: string }; response: { saved: boolean } };
  GET_SETTINGS: { request: {}; response: { enabled: boolean; theme: string } };
};

const m = createMessenger<Messages>();

// Send to service worker
const result = await m.sendMessage('PAGE_DATA', {
  url: location.href,
  title: document.title
});

// Receive from service worker
m.onMessage('UPDATE_UI', async (data) => {
  applyTheme(data.theme);
  return { ok: true };
});
```

### Using @theluckystrike/webext-storage {#using-theluckystrikewebext-storage}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  enabled: 'boolean',
  theme: 'string',
  blockedSelectors: 'string'
});
const storage = createStorage(schema, 'sync');

// Read settings
const enabled = await storage.get('enabled');
const theme = await storage.get('theme');

// Watch for changes
storage.watch('enabled', (newVal) => {
  if (newVal) enableFeature();
  else disableFeature();
});
```

## CSS Injection {#css-injection}
```typescript
// Inject CSS from content script
const style = document.createElement('style');
style.textContent = `
  .my-ext-highlight { background: yellow !important; }
  #my-ext-sidebar { position: fixed; right: 0; top: 0; width: 300px; }
`;
document.head.appendChild(style);

// Or use insertCSS from service worker
// (requires scripting permission + host permission)
```

## Web APIs Available {#web-apis-available}
Content scripts have access to all standard Web APIs:
- `fetch()`. subject to the same CORS rules as the host page (since Chrome 83); use the service worker for cross-origin requests
- `XMLHttpRequest`
- `localStorage`. accesses the host page's localStorage (not the extension's); use `chrome.storage` instead
- `navigator.*`. standard navigator APIs
- `MutationObserver`
- `IntersectionObserver`
- `ResizeObserver`
- Web Components (`customElements`)
- `Shadow DOM`
- `Canvas` / `WebGL`

## fetch() in Content Scripts {#fetch-in-content-scripts}
```typescript
// fetch from content script uses the HOST PAGE's origin (not the extension's)
// Subject to CORS since Chrome 83. send cross-origin requests from the service worker instead
const response = await fetch('https://api.example.com/data');
const data = await response.json();
```

## Injection Timing {#injection-timing}
| `run_at` | When |
|---|---|
| `document_start` | Before DOM is constructed |
| `document_end` | After DOM is ready, before subresources |
| `document_idle` | Between `document_end` and just after `window.onload` (default) |

## Shadow DOM for UI Isolation {#shadow-dom-for-ui-isolation}
```typescript
// Prevent page CSS from affecting your UI
const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'closed' });
shadow.innerHTML = `
  <style>
    .panel { all: initial; font-family: system-ui; background: white; }
  </style>
  <div class="panel">My Extension UI</div>
`;
document.body.appendChild(host);
```

## Security Notes {#security-notes}
- Content scripts share the page's DOM. page can observe your DOM changes
- Use Shadow DOM for sensitive UI
- Never inject secrets into the page DOM
- Be cautious with `eval()` or `innerHTML` from page data (XSS risk)
- ISOLATED world protects JS scope, not DOM

## Cross-References {#cross-references}
- Guide: `docs/guides/content-script-patterns.md`
- Guide: `docs/guides/content-script-isolation.md`
- MV3: `docs/mv3/dynamic-content-scripts.md`
- Permission: `docs/permissions/scripting.md`, `docs/permissions/activeTab.md`
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
