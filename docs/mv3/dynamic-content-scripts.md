---
layout: default
title: "Chrome Extension Dynamic Content Scripts — Manifest V3 Guide"
description: "Register and manage content scripts dynamically at runtime with chrome.scripting API in Manifest V3."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/mv3/dynamic-content-scripts/"
---

# Dynamic Content Scripts in MV3

## Overview {#overview}
MV3 introduces `chrome.scripting.registerContentScripts` for runtime content script registration. Scripts persist across service worker restarts.

## Static vs Dynamic {#static-vs-dynamic}
| Feature | Static (manifest) | Dynamic (scripting API) |
|---------|-------------------|------------------------|
| Declaration | `content_scripts` in manifest | `chrome.scripting.registerContentScripts()` |
| Modifiable | No | Yes |
| User configurable | No | Yes |
| Persist across SW restart | Yes | Yes (default) |

## Register {#register}
```javascript
await chrome.scripting.registerContentScripts([{
  id: 'my-script',
  matches: ['https://*.example.com/*'],
  js: ['content/inject.js'],
  css: ['content/styles.css'],
  runAt: 'document_idle',
  world: 'ISOLATED',        // or 'MAIN'
  allFrames: false,
  excludeMatches: ['*://example.com/admin/*'],
  persistAcrossSessions: true
}]);
```

## Update {#update}
```javascript
await chrome.scripting.updateContentScripts([{
  id: 'my-script',
  matches: ['https://*.newsite.com/*']
}]);
```

## Unregister {#unregister}
```javascript
await chrome.scripting.unregisterContentScripts({ ids: ['my-script'] });
await chrome.scripting.unregisterContentScripts(); // Remove ALL
```

## List Registered {#list-registered}
```javascript
const scripts = await chrome.scripting.getRegisteredContentScripts();
scripts.forEach(s => console.log(`${s.id}: ${s.matches.join(', ')}`));
```

## User-Configurable Sites {#user-configurable-sites}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  enabledSites: 'string'
}), 'sync');

async function updateSites(sites) {
  await storage.set('enabledSites', JSON.stringify(sites));
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: ['user-sites'] });
  if (existing.length > 0) {
    await chrome.scripting.updateContentScripts([{ id: 'user-sites', matches: sites }]);
  } else {
    await chrome.scripting.registerContentScripts([{
      id: 'user-sites', matches: sites, js: ['content/inject.js'], runAt: 'document_idle'
    }]);
  }
}
```

## World Configuration {#world-configuration}
```javascript
// ISOLATED (default): separate JS, shared DOM
await chrome.scripting.registerContentScripts([{
  id: 'safe', matches: ['<all_urls>'], js: ['safe.js'], world: 'ISOLATED'
}]);

// MAIN: runs in page's JS context, access page variables
await chrome.scripting.registerContentScripts([{
  id: 'page-access', matches: ['https://app.example.com/*'], js: ['hook.js'], world: 'MAIN'
}]);
```

## One-Time Execution {#one-time-execution}
```javascript
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['one-time.js']
});

// Inline function
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (color) => { document.body.style.background = color; },
  args: ['#00ff41']
});
```

## CSS Injection {#css-injection}
```javascript
await chrome.scripting.insertCSS({ target: { tabId }, files: ['styles.css'] });
await chrome.scripting.removeCSS({ target: { tabId }, files: ['styles.css'] });
```

## MV2 Migration {#mv2-migration}
```javascript
// MV2: chrome.tabs.executeScript(tabId, { file: 'inject.js' })
// MV3: chrome.scripting.executeScript({ target: { tabId }, files: ['inject.js'] })
```

## Common Mistakes {#common-mistakes}
- Re-registering without checking if exists (throws error)
- Forgetting `persistAcrossSessions` defaults to `true`
- Using MAIN world without understanding security implications
- Invalid match patterns cause silent failure
- Not verifying registration with `getRegisteredContentScripts`
