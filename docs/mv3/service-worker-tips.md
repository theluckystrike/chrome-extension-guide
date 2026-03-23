---
layout: default
title: "Chrome Extension Service Worker Tips. Manifest V3 Guide"
description: "Best practices for Chrome extension service workers in Manifest V3 including lifecycle, debugging, and keep-alive."
canonical_url: "https://bestchromeextensions.com/mv3/service-worker-tips/"
---

MV3 Service Worker Tips

Practical tips for building solid Chrome Extension service workers using Manifest V3.

1. Register Listeners at Top Level (Mandatory) {#1-register-listeners-at-top-level-mandatory}

Service workers terminate unexpectedly. All event listeners must be at the top level.

```javascript
//  CORRECT
chrome.runtime.onInstalled.addListener(() => {});
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'FETCH') { fetchData().then(sendResponse); return true; }
});

//  WRONG - Won't register
async function init() { chrome.runtime.onInstalled.addListener(() => {}); }
```

2. No Global State. Use @theluckystrike/webext-storage {#2-no-global-state-use-theluckystrikewebext-storage}

Global variables are lost on restart. Use `chrome.storage` for persistence.

```javascript
import { Storage } from '@theluckystrike/webext-storage';
const storage = new Storage();
await storage.set('settings', { theme: 'dark' });
const { theme } = await storage.get('settings', { theme: 'light' });
storage.onChanged.addListener((changes) => console.log('Changed:', changes));
```

3. No setInterval. Use chrome.alarms {#3-no-setinterval-use-chromealarms}

`setInterval`/`setTimeout` don't work reliably. Use `chrome.alarms` instead.

```javascript
chrome.alarms.create('sync', { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === 'sync') doSync(); });
```

4. Handle Restart in onStartup {#4-handle-restart-in-onstartup}

Re-initialize state when the service worker starts.

```javascript
chrome.runtime.onStartup.addListener(async () => {
  chrome.alarms.create('sync', { periodInMinutes: 15 });
  const state = await storage.get('appState');
});
```

5. Use Offscreen Docs for DOM APIs {#5-use-offscreen-docs-for-dom-apis}

Service workers cannot access DOM. Use offscreen documents.

```javascript
async function parseHTML(html) {
  // Check if an offscreen document already exists by querying contexts
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: 'Parse HTML'
    });
  }
}
```

6. No window/document/localStorage/XMLHttpRequest {#6-no-windowdocumentlocalstoragexmlhttprequest}

These APIs are unavailable in service workers.

```javascript
//  localStorage.getItem()  // Error!
//  window.document         // Error!
//  XMLHttpRequest         // Error!
//  Use storage + fetch instead
```

7. ES Modules: "type": "module" in manifest {#7-es-modules-type-module-in-manifest}

Enable ES modules in manifest.json.

```json
{ "background": { "service_worker": "sw.js", "type": "module" } }
```

```javascript
import { Storage } from './utils/storage.js';
```

8. Debug at chrome://extensions {#8-debug-at-chromeextensions}

Open `chrome://extensions`, enable Developer mode, click your extension's "service worker" link.

```javascript
const DEBUG = true;
function log(...args) { if (DEBUG) console.log('[SW]', ...args); }
```

9. @theluckystrike/webext-messaging for Typed Messages {#9-theluckystrikewebext-messaging-for-typed-messages}

Use `@theluckystrike/webext-messaging` for reliable message passing.

```javascript
import { MessageChannel } from '@theluckystrike/webext-messaging';
const channel = new MessageChannel('my-app');
await channel.send('content-script', { type: 'UPDATE', data: {} });
channel.onMessage.addListener((msg) => console.log('Received:', msg));
```

Summary {#summary}

| Tip | Action |
|-----|--------|
| Top-level listeners | Register before async |
| No globals | Use storage |
| No setInterval | Use alarms |
| Handle onStartup | Re-initialize |
| DOM APIs | Use offscreen docs |
| No localStorage/XMLHttpRequest | Use storage/fetch |
| ES modules | Add "type": "module" |
| Debug | Use chrome://extensions |
| Messaging | Use webext-messaging |
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
