---
layout: default
title: "Migrating Your Chrome Extension from Manifest V2 to V3. Complete Guide"
description: "A comprehensive step-by-step tutorial for migrating Chrome extensions from Manifest V2 to V3, covering service workers, declarativeNetRequest, and more."
canonical_url: "https://bestchromeextensions.com/tutorials/migrating-to-manifest-v3/"
---

# Migrating Your Chrome Extension from Manifest V2 to V3

Google began disabling Manifest V2 extensions in June 2024, with full removal from the stable channel in October 2024. If you haven't migrated your extension to Manifest V3 (MV3) yet, now is the time. This guide walks you through every aspect of the migration process.

---

Key Differences Between Manifest V2 and V3

Understanding the fundamental changes in MV3 is essential before starting your migration. Here are the most significant differences:

1. Background Pages → Service Workers

In Manifest V2, background pages were persistent HTML pages that stayed open as long as your extension was installed. They had full access to the DOM and could run continuously.

In Manifest V3, background pages are replaced by service workers. event-driven scripts that:
- Load when needed and terminate when idle
- Don't have access to the DOM or `window` object
- Use `chrome.alarms` instead of `setTimeout`/`setInterval`
- Must persist state using `chrome.storage` or external storage

```javascript
// Manifest V2 (background)
background: {
  scripts: ['background.js'],
  persistent: true
}

// Manifest V3 (service worker)
background: {
  service_worker: 'background.js'
}
```

2. Blocking webRequest → declarativeNetRequest

Manifest V2 allowed you to block or modify network requests using `chrome.webRequest` with the `blocking` permission. This was powerful but required broad permissions.

Manifest V3 uses `declarativeNetRequest`, which:
- Works declaratively through rules you define
- Doesn't require access to request content
- Provides better privacy and performance
- Supports static rules (in `rules.json`) and dynamic rules

```javascript
// Manifest V2
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    return { cancel: true };
  },
  { urls: ['*://*.ads.example.com/*'] },
  ['blocking']
);

// Manifest V3 - rules.json
{
  "rules": [{
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": { "urlFilter": "*://*.ads.example.com/*" }
  }]
}
```

3. Remotely Hosted Code Removal

Manifest V2 allowed loading external scripts via `<script src="https://...">`. This was a security risk as it allowed malicious code injection.

Manifest V3 requires:
- All extension code to be bundled locally
- No `eval()`, `new Function()`, or similar dynamic code execution
- All resources to be packaged with the extension

```javascript
// Manifest V2 - NOT ALLOWED in MV3
const script = document.createElement('script');
script.src = 'https://external.cdn.com/library.js';
document.head.appendChild(script);

// Manifest V3 - Must bundle locally
// <script src="library.js"></script>
```

4. Promise-Based APIs

Many Chrome extension APIs now return Promises instead of using callbacks. This makes async code cleaner and more maintainable.

```javascript
// Callback style (still works, but deprecated for many APIs)
chrome.storage.local.get('key', (result) => {
  console.log(result.key);
});

// Promise style (recommended)
const result = await chrome.storage.local.get('key');
console.log(result.key);
```

---

Step-by-Step Migration Checklist

Follow this checklist to migrate your extension systematically:

Step 1: Update manifest.json

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "2.0.0",
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": [
    "<all_urls>"
  ],
  "permissions": [
    "storage",
    "alarms"
  ]
}
```

Key changes:
- `"manifest_version": 2` → `"manifest_version": 3`
- `"browser_action"` → `"action"`
- `"page_action"` → `"action"`
- Move host permissions from `"permissions"` to `"host_permissions"`
- `"background": { "scripts": [...] }` → `"background": { "service_worker": "..." }`

Step 2: Migrate Background Script to Service Worker

1. Remove all DOM references. Service workers don't have DOM access
2. Replace XHR with fetch. Use `fetch()` instead of `XMLHttpRequest`
3. Replace timers with alarms:
   ```javascript
   // Instead of setTimeout(fn, delay)
   chrome.alarms.create('myAlarm', { delayInMinutes: 5 });
   
   chrome.alarms.onAlarm.addListener((alarm) => {
     if (alarm.name === 'myAlarm') {
       // Handle alarm
     }
   });
   ```
4. Move state to storage. Use `chrome.storage` instead of global variables

Step 3: Migrate webRequest to declarativeNetRequest

1. Create a `rules.json` file:
   ```json
   {
     "rules": [
       {
         "id": 1,
         "priority": 1,
         "action": { "type": "block" },
         "condition": { "urlFilter": "||ads.example.com^" }
       },
       {
         "id": 2,
         "priority": 1,
         "action": {
           "type": "redirect",
           "redirect": { "url": "https://example.com" }
         },
         "condition": { "urlFilter": "||old-site.com^" }
       }
     ]
   }
   ```
2. Add permissions:
   ```json
   {
     "permissions": ["declarativeNetRequest"],
     "host_permissions": ["<all_urls>"]
   }
   ```
3. Load rules in your service worker:
   ```javascript
   chrome.declarativeNetRequest.updateDynamicRules({
     addRules: rules
   });
   ```

Step 4: Update Action API

Replace all `chrome.browserAction.*` calls with `chrome.action.*`:

```javascript
// Before (MV2)
chrome.browserAction.setBadgeText({ text: '5' });
chrome.browserAction.setPopup({ popup: 'popup.html' });

// After (MV3)
chrome.action.setBadgeText({ text: '5' });
chrome.action.setPopup({ popup: 'popup.html' });
```

Step 5: Handle Offscreen Documents

If your extension needs DOM access (for canvas, audio, clipboard, etc.), use offscreen documents:

```javascript
// Create offscreen document
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons=['CLIPBOARD'],
  justification: 'Need clipboard access'
});

// Communicate with it
chrome.runtime.sendMessage({
  target: 'offscreen',
  action: 'copy-to-clipboard',
  data: text
});
```

Step 6: Update Permissions

1. Move URL patterns to `host_permissions`:
   ```json
   {
     "permissions": ["storage", "tabs"],
     "host_permissions": ["https://*.example.com/*"]
   }
   ```
2. Remove unused permissions
3. Consider using `optional_permissions` for features that don't need to work immediately

Step 7: Fix Content Security Policy

Remove any CSP that allows `unsafe-eval` or remote scripts:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

---

Common Migration Pitfalls

Pitfall 1: Forgetting Service Worker Termination

Service workers can be terminated at any time. Don't rely on in-memory state:

```javascript
// BAD - Will lose state when SW terminates
let cachedData = null;
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'cache') cachedData = msg.data;
});

// GOOD - Persist state
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'cache') {
    chrome.storage.local.set({ cachedData: msg.data });
  }
});
```

Pitfall 2: Not Registering Event Listeners at Top Level

Event listeners must be registered synchronously at the top level of your service worker:

```javascript
// BAD - Listener registered async (may miss events)
async function init() {
  await loadConfig();
  chrome.runtime.onMessage.addListener(handleMessage);
}

// GOOD - Listener registered at top level
chrome.runtime.onMessage.addListener(handleMessage);

async function init() {
  await loadConfig();
}
```

Pitfall 3: Using Timers Instead of Alarms

`setTimeout` and `setInterval` don't work reliably in service workers:

```javascript
// BAD - Won't work consistently
setInterval(() => doSomething(), 60000);

// GOOD - Use chrome.alarms
chrome.alarms.create('periodic', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodic') doSomething();
});
```

Pitfall 4: Not Handling Promise-Based APIs Correctly

Remember that `chrome.storage` is always async in MV3:

```javascript
// BAD - Race condition
chrome.storage.local.set({ value: 123 });
chrome.storage.local.get('value', (r) => console.log(r.value)); // May not see 123!

// GOOD - Use async/await
await chrome.storage.local.set({ value: 123 });
const result = await chrome.storage.local.get('value');
console.log(result.value);
```

---

Testing After Migration

1. Test Service Worker Lifecycle

Open `chrome://extensions`, enable your extension, and:
- Check that the service worker appears in the "Service Workers" section
- Test that it terminates after being idle
- Verify it restarts when events fire

2. Test Background Script Behavior

- Verify all event listeners are firing correctly
- Test that state persists across service worker restarts
- Check that alarms work as expected

3. Test Network Blocking

- Verify declarativeNetRequest rules are blocking/modifying correctly
- Test redirect behavior
- Check that header modifications work

4. Test All Features

- Test the popup
- Test content scripts
- Test any background tasks
- Verify all permissions are working

5. Check for Errors

- Look for errors in `chrome://extensions` (Extensions page)
- Check the service worker console
- Test with `chrome://inspect/extensions` service worker debugging

---

Migration Tools

For automated assistance with your migration, check out the [Chrome Extension Manifest V3 Migrator](https://github.com/GoogleChromeLabs/mv3-migrate) tool. This CLI tool can help automate parts of the migration process, including:

- Converting background pages to service workers
- Updating manifest.json files
- Migrating webRequest to declarativeNetRequest
- Fixing common issues automatically

```bash
npx @chrome-extension/mv3-migrate --help
```

---

Related Articles {#related-articles}

- [MV3 Migration Checklist](mv3/migration-checklist.html). Quick reference checklist for all migration steps
- [Service Workers Guide](mv3/service-workers.html). Detailed look into MV3 service worker architecture
- [Declarative Net Request API](mv3/declarative-net-request.html). Complete guide to network request modification
- [Manifest V3 Overview](mv3/index.html). Introduction to all MV3 changes and new features
- [Promise-Based APIs](mv3/promise-based-apis.html). Working with Promises in Chrome extension APIs
- [Offscreen Documents](mv3/offscreen-documents.html). Handling DOM operations in MV3

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
