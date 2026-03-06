# Complete MV2 to MV3 Migration Guide

A definitive, step-by-step guide for migrating Chrome extensions from Manifest V2 to Manifest V3. Covers every breaking change, common gotchas, and before/after code for each task.

> For a quick side-by-side cheatsheet, see [MV3 Migration Cheatsheet](mv3-migration-cheatsheet.md).

---

## Table of Contents

1. [Migration Overview](#1-migration-overview)
2. [Background Page to Service Worker](#2-background-page-to-service-worker)
3. [browserAction/pageAction to action](#3-browseractionpageaction-to-action)
4. [tabs.executeScript to scripting.executeScript](#4-tabsexecutescript-to-scriptingexecutescript)
5. [Blocking webRequest to declarativeNetRequest](#5-blocking-webrequest-to-declarativenetrequest)
6. [Content Security Policy Changes](#6-content-security-policy-changes)
7. [web_accessible_resources Format](#7-web_accessible_resources-format)
8. [Promise-Based APIs](#8-promise-based-apis)
9. [Removed APIs and Replacements](#9-removed-apis-and-replacements)
10. [Storage Migration](#10-storage-migration)
11. [Step-by-Step Migration Workflow](#11-step-by-step-migration-workflow)
12. [Testing Your Migrated Extension](#12-testing-your-migrated-extension)
13. [Common Migration Failures and Fixes](#13-common-migration-failures-and-fixes)

---

## 1. Migration Overview

MV2 is fully deprecated. Extensions on the Chrome Web Store must use MV3.

| Area | MV2 | MV3 |
|------|-----|-----|
| Background | Persistent/event page | Service worker |
| Toolbar button | `browser_action` / `page_action` | `action` |
| Script injection | `chrome.tabs.executeScript` | `chrome.scripting.executeScript` |
| Network blocking | `webRequest` (blocking) | `declarativeNetRequest` |
| CSP format | String | Object with keys |
| Web resources | Flat array | Array of objects with `matches` |
| Host permissions | Inside `permissions` | Separate `host_permissions` key |
| Remote code | Allowed | Forbidden |

---

## 2. Background Page to Service Worker

This is the largest and most error-prone migration task.

### Manifest Change

**MV2:**
```json
{ "background": { "scripts": ["bg.js"], "persistent": false } }
```

**MV3:**
```json
{ "background": { "service_worker": "bg.js", "type": "module" } }
```

Only one entry point is allowed. Use `"type": "module"` with `import` statements, or use a bundler to combine files.

### Gotcha: No DOM Access

Service workers have no `document`, `window`, `XMLHttpRequest`, or `localStorage`.

```javascript
// MV2 background page
const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');
localStorage.setItem('title', doc.querySelector('title').textContent);

// MV3 service worker - use offscreen documents for DOM parsing
await chrome.offscreen.createDocument({
  url: 'offscreen.html', reasons: ['DOM_PARSER'],
  justification: 'Parse HTML'
});
const title = await chrome.runtime.sendMessage({ action: 'parseHTML', html });
await chrome.storage.local.set({ title });
```

### Gotcha: Service Worker Termination

Workers terminate after ~30 seconds of inactivity. All in-memory state is lost.

```javascript
// MV2: global state lives forever
let count = 0;
chrome.runtime.onMessage.addListener(() => { count++; });

// MV3: persist state to storage
chrome.runtime.onMessage.addListener(async () => {
  const { count = 0 } = await chrome.storage.session.get('count');
  await chrome.storage.session.set({ count: count + 1 });
});
```

### Gotcha: Top-Level Event Registration

All listeners must be registered synchronously at the top level. Listeners registered inside async callbacks are lost on restart.

```javascript
// WRONG - listener lost after restart
chrome.storage.local.get('settings', (s) => {
  if (s.enableFeature) chrome.tabs.onUpdated.addListener(handle);
});

// CORRECT - register unconditionally, check inside
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings?.enableFeature) return;
  handle(tabId, info, tab);
});
```

### Gotcha: Timers

`setInterval`/`setTimeout` are unreliable because the worker can terminate before they fire.

```javascript
// MV2
setInterval(checkForUpdates, 5 * 60 * 1000);

// MV3 - use alarms (minimum 30-second interval)
chrome.alarms.create('check', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === 'check') checkForUpdates();
});
```

### Gotcha: Multiple Scripts

```javascript
// MV2 allowed: "scripts": ["utils.js", "api.js", "bg.js"]
// MV3: single entry with imports
import { utils } from './utils.js';
import { api } from './api.js';
```

### Gotcha: XMLHttpRequest

Replace with `fetch()` -- XHR is unavailable in service workers.

---

## 3. browserAction/pageAction to action

MV3 unifies both into `action`.

```json
// MV2                                    // MV3
{ "browser_action": {                     { "action": {
    "default_popup": "popup.html",            "default_popup": "popup.html",
    "default_icon": { "16": "i.png" }         "default_icon": { "16": "i.png" }
  }                                         }
}                                         }
```

```javascript
// MV2
chrome.browserAction.setBadgeText({ text: '5' });
chrome.pageAction.show(tabId);

// MV3
chrome.action.setBadgeText({ text: '5' });
chrome.action.enable(tabId);   // replaces pageAction.show
chrome.action.disable(tabId);  // replaces pageAction.hide
```

For page_action-style show/hide behavior, use `chrome.declarativeContent`:

```javascript
chrome.action.disable();
chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([{
      conditions: [new chrome.declarativeContent.PageStateMatcher({
        pageUrl: { hostSuffix: '.example.com' }
      })],
      actions: [new chrome.declarativeContent.ShowAction()]
    }]);
  });
});
```

---

## 4. tabs.executeScript to scripting.executeScript

Add `"scripting"` to permissions. The API is a complete redesign.

### File Injection

```javascript
// MV2
chrome.tabs.executeScript(tabId, { file: 'content.js' }, (results) => {});

// MV3
const results = await chrome.scripting.executeScript({
  target: { tabId },
  files: ['content.js']  // plural array, not singular string
});
```

### Inline Code

```javascript
// MV2 - arbitrary code strings allowed
chrome.tabs.executeScript(tabId, { code: 'document.title' }, (r) => {});

// MV3 - must use a function reference
const results = await chrome.scripting.executeScript({
  target: { tabId },
  func: () => document.title
});
console.log(results[0].result);
```

### Passing Arguments

```javascript
const results = await chrome.scripting.executeScript({
  target: { tabId },
  func: (sel, attr) => document.querySelector(sel)?.getAttribute(attr),
  args: ['#main', 'data-version']
});
```

### CSS and Frames

```javascript
// CSS injection (replaces chrome.tabs.insertCSS)
await chrome.scripting.insertCSS({ target: { tabId }, files: ['style.css'] });
await chrome.scripting.removeCSS({ target: { tabId }, files: ['style.css'] });

// All frames
await chrome.scripting.executeScript({
  target: { tabId, allFrames: true }, files: ['content.js']
});

// Execution world: 'ISOLATED' (default) or 'MAIN' (page context)
await chrome.scripting.executeScript({
  target: { tabId }, files: ['inject.js'], world: 'MAIN'
});
```

---

## 5. Blocking webRequest to declarativeNetRequest

Often the most complex migration, especially for ad blockers and privacy tools.

### Manifest

```json
{
  "permissions": ["declarativeNetRequest", "declarativeNetRequestFeedback"],
  "host_permissions": ["<all_urls>"],
  "declarative_net_request": {
    "rule_resources": [{ "id": "rules_1", "enabled": true, "path": "rules.json" }]
  }
}
```

### Blocking

```javascript
// MV2
chrome.webRequest.onBeforeRequest.addListener(
  () => ({ cancel: true }),
  { urls: ["*://*.ads.example.com/*"] }, ["blocking"]
);
```

```json
// MV3 rules.json
[{
  "id": 1, "priority": 1,
  "action": { "type": "block" },
  "condition": {
    "urlFilter": "*://*.ads.example.com/*",
    "resourceTypes": ["script","image","stylesheet","xmlhttprequest","sub_frame"]
  }
}]
```

### Header Modification

```json
[{
  "id": 2, "priority": 1,
  "action": {
    "type": "modifyHeaders",
    "requestHeaders": [{ "header": "User-Agent", "operation": "set", "value": "Custom" }]
  },
  "condition": { "urlFilter": "*", "resourceTypes": ["main_frame"] }
}]
```

### Redirects

```json
[{
  "id": 3, "priority": 1,
  "action": { "type": "redirect", "redirect": { "transform": { "scheme": "https" } } },
  "condition": { "urlFilter": "http://*", "resourceTypes": ["main_frame"] }
}]
```

### Dynamic Rules

```javascript
await chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [{ id: 100, priority: 1, action: { type: 'block' },
    condition: { urlFilter: pattern, resourceTypes: ['script'] } }],
  removeRuleIds: [100]
});
```

### Limits and Caveats

- 300,000 static rules max, 30,000 dynamic+session rules
- Cannot inspect/modify request or response bodies
- Regex rules limited to 1,000 and must be RE2-compatible
- Observational `webRequest` (non-blocking) still works in MV3

---

## 6. Content Security Policy Changes

**MV2 (string):**
```json
{ "content_security_policy": "script-src 'self' https://apis.google.com; object-src 'self'" }
```

**MV3 (object):**
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts; script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  }
}
```

Key restrictions in MV3:
- Remote code is forbidden in extension pages
- `'unsafe-eval'` forbidden in `extension_pages` (allowed in `sandbox` only)
- `wasm-unsafe-eval` is allowed for WebAssembly
- All scripts must be bundled locally

To migrate `eval()`/`new Function()` usage, move it to a sandboxed iframe and communicate via `postMessage`.

---

## 7. web_accessible_resources Format

**MV2 (flat array):**
```json
{ "web_accessible_resources": ["images/logo.png", "inject.js"] }
```

**MV3 (objects with match patterns):**
```json
{
  "web_accessible_resources": [{
    "resources": ["images/logo.png"],
    "matches": ["https://*.example.com/*"]
  }, {
    "resources": ["inject.js"],
    "matches": ["<all_urls>"],
    "use_dynamic_url": true
  }]
}
```

Each entry requires `matches` and/or `extension_ids`. Setting `use_dynamic_url: true` changes the resource URL per session, preventing extension fingerprinting.

---

## 8. Promise-Based APIs

Nearly all `chrome.*` APIs return promises in MV3 when no callback is provided.

```javascript
// MV2 callback style
chrome.storage.local.get(['key'], (result) => {
  if (chrome.runtime.lastError) { console.error(chrome.runtime.lastError); return; }
  console.log(result.key);
});

// MV3 promise style
try {
  const result = await chrome.storage.local.get(['key']);
  console.log(result.key);
} catch (e) { console.error(e); }
```

Event listeners (`.addListener`) remain callback-based. For async message responses, return `true` from the listener and call `sendResponse` later:

```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleAsync(msg).then(sendResponse);
  return true; // keep channel open
});
```

---

## 9. Removed APIs and Replacements

| Removed | Replacement |
|---------|-------------|
| `chrome.extension.getURL()` | `chrome.runtime.getURL()` |
| `chrome.extension.getBackgroundPage()` | `chrome.runtime.sendMessage()` |
| `chrome.extension.sendRequest()` | `chrome.runtime.sendMessage()` |
| `chrome.tabs.getAllInWindow()` | `chrome.tabs.query({ windowId })` |
| `chrome.tabs.getSelected()` | `chrome.tabs.query({ active: true, windowId })` |
| `chrome.tabs.sendRequest()` | `chrome.tabs.sendMessage()` |
| `localStorage` in background | `chrome.storage.local` / `chrome.storage.session` |
| `XMLHttpRequest` in background | `fetch()` |
| `window` / `document` in background | Not available; use offscreen documents |
| Remote code execution | Bundle all code locally |

`chrome.extension.getBackgroundPage()` was commonly used in popups to call background functions directly. Replace with messaging:

```javascript
// MV2 popup
const bg = chrome.extension.getBackgroundPage();
bg.doSomething();

// MV3 popup
const result = await chrome.runtime.sendMessage({ action: 'doSomething' });
```

---

## 10. Storage Migration

### localStorage to chrome.storage

```javascript
// MV2 background
const token = localStorage.getItem('authToken');

// MV3 service worker
const { authToken } = await chrome.storage.local.get('authToken');
```

### chrome.storage.session (MV3 only)

In-memory storage cleared when browser closes. Ideal for transient state:

```javascript
await chrome.storage.session.set({ tempData: value });
// Allow content scripts to access it:
await chrome.storage.session.setAccessLevel({
  accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
});
```

### Data Preservation

`chrome.storage.local` and `chrome.storage.sync` data survives the MV2-to-MV3 update. `localStorage` data from the background page is lost. Migrate it in your final MV2 release:

```javascript
// Final MV2 version: copy localStorage to chrome.storage
for (const key of ['authToken', 'settings', 'prefs']) {
  const val = localStorage.getItem(key);
  if (val !== null) {
    chrome.storage.local.set({ [key]: JSON.parse(val) || val });
  }
}
```

Host permissions moved from `permissions` to `host_permissions`. In MV3, users can restrict host access at runtime, so always check with `chrome.permissions.contains()` before relying on host access.

---

## 11. Step-by-Step Migration Workflow

1. **Update `manifest_version`** to `3`
2. **Move host permissions** from `permissions` to `host_permissions`
3. **Replace `browser_action`/`page_action`** with `action`
4. **Convert CSP** from string to object format
5. **Convert `web_accessible_resources`** to array-of-objects format
6. **Migrate background page** to service worker (remove DOM refs, persist state, register listeners at top level)
7. **Migrate script injection** to `chrome.scripting` (add `scripting` permission)
8. **Migrate blocking webRequest** to `declarativeNetRequest` rules
9. **Replace removed APIs** per the table above
10. **Convert callbacks to promises** with async/await
11. **Bundle all remote code** locally
12. **Test thoroughly** (see below)

---

## 12. Testing Your Migrated Extension

1. Load unpacked at `chrome://extensions` with Developer mode on
2. Check the Errors section for manifest issues
3. Click "Inspect views: service worker" to open DevTools
4. **Test service worker restart**: stop the worker manually, trigger an event, verify listeners fire
5. **Verify state persistence**: stop/start the worker, confirm storage-backed state is restored
6. **Test declarativeNetRequest**: use `chrome.declarativeNetRequest.onRuleMatchedDebug` (requires `declarativeNetRequestFeedback` permission)
7. **Check permissions**: verify host permission prompts appear and the extension degrades gracefully when denied
8. Run your existing test suite with focus on background logic, content script messaging, and network rules

---

## 13. Common Migration Failures and Fixes

### Service worker registration failed
Syntax error or top-level `document`/`window` reference. Remove all DOM globals from the service worker.

### Cannot read properties of undefined (reading 'executeScript')
Missing `"scripting"` permission in manifest.json.

### Refused to execute inline script
MV3 CSP blocks inline scripts. Move all `<script>` and `onclick` handlers to external `.js` files.

### CORS errors on fetch
Missing domain in `host_permissions`.

### Event listeners not firing after restart
Listeners registered inside async callbacks. Move all `.addListener` calls to the top level.

### Alarm delay less than minimum
`chrome.alarms` minimum is 30 seconds. For shorter delays, use `setTimeout` (acceptable for one-shot tasks while the worker is active).

### Maximum dynamic rules exceeded
Use static rulesets for large rule lists. Consolidate with regex rules where possible.

### Badge text disappears
Badge state resets on worker restart. Save it to `chrome.storage.session` and restore in `chrome.runtime.onStartup`.

### Popup loses connection to background
Handle `port.onDisconnect` and reconnect when using long-lived ports via `chrome.runtime.connect()`.

---

## Further Reading

- [Service Worker Lifecycle](service-worker-lifecycle.md)
- [Scripting API Guide](scripting-api.md)
- [Web Request Patterns](web-request-patterns.md)
- [Permissions Model](permissions-model.md)
- [MV3 Migration Cheatsheet](mv3-migration-cheatsheet.md)
