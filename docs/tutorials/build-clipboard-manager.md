---
layout: default
title: "Chrome Extension Clipboard Manager — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-clipboard-manager/"
---
# Build a Clipboard Manager Extension

## What You'll Build {#what-youll-build}
Popup clipboard history with search, pinned favorites, one-click paste. Uses offscreen document for clipboard access in MV3.

## Project Structure {#project-structure}
```
clipboard-manager/
  manifest.json
  background.js
  offscreen.html
  offscreen.js
  popup/popup.html
  popup/popup.css
  popup/popup.js
  content.js
```

## Step 1: Manifest {#step-1-manifest}
```json
{
  "manifest_version": 3,
  "name": "Clipboard Manager",
  "version": "1.0.0",
  "permissions": ["clipboardRead", "clipboardWrite", "offscreen", "activeTab", "storage"],
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background.js" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"] }],
  "commands": {
    "_execute_action": {
      "suggested_key": { "default": "Ctrl+Shift+V", "mac": "Command+Shift+V" },
      "description": "Open clipboard history"
    }
  }
}
```

## Step 2: Content Script {#step-2-content-script}
```javascript
// Detect copy events on any page
document.addEventListener('copy', () => {
  setTimeout(() => chrome.runtime.sendMessage({ type: 'COPY_DETECTED' }), 100);
});
```

## Step 3: Offscreen Document {#step-3-offscreen-document}
```html
<!-- offscreen.html -->
<!DOCTYPE html>
<html><body><textarea id="cb"></textarea><script src="offscreen.js"></script></body></html>
```
```javascript
// offscreen.js — clipboard read/write in MV3
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const ta = document.getElementById('cb');
  if (msg.type === 'READ_CLIPBOARD') {
    ta.focus();
    document.execCommand('paste');
    sendResponse({ text: ta.value });
    ta.value = '';
  }
  if (msg.type === 'WRITE_CLIPBOARD') {
    ta.value = msg.text;
    ta.select();
    document.execCommand('copy');
    sendResponse({ success: true });
  }
  return true;
});
```

## Step 4: Background Service Worker {#step-4-background-service-worker}
```javascript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  clipHistory: 'string'  // JSON: Array<{ text, time, pinned }>
}), 'local');

const MAX = 200;

async function ensureOffscreen() {
  const ctx = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (!ctx.length) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html', reasons: ['CLIPBOARD'],
      justification: 'Clipboard access'
    });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'COPY_DETECTED') {
    (async () => {
      await ensureOffscreen();
      const { text } = await chrome.runtime.sendMessage({ type: 'READ_CLIPBOARD' });
      if (!text?.trim()) return;
      const raw = await storage.get('clipHistory');
      const history = raw ? JSON.parse(raw) : [];
      if (history[0]?.text === text) return; // Skip duplicate
      const filtered = history.filter(i => i.text !== text);
      filtered.unshift({ text, time: Date.now(), pinned: false });
      const pinned = filtered.filter(i => i.pinned);
      const unpinned = filtered.filter(i => !i.pinned).slice(0, MAX);
      await storage.set('clipHistory', JSON.stringify([...pinned, ...unpinned]));
    })();
  }
  if (msg.type === 'PASTE_TEXT') {
    (async () => {
      await ensureOffscreen();
      await chrome.runtime.sendMessage({ type: 'WRITE_CLIPBOARD', text: msg.text });
      sendResponse({ success: true });
    })();
    return true;
  }
  if (msg.type === 'TOGGLE_PIN') {
    (async () => {
      const raw = await storage.get('clipHistory');
      const h = raw ? JSON.parse(raw) : [];
      const item = h.find(i => i.time === msg.time);
      if (item) item.pinned = !item.pinned;
      await storage.set('clipHistory', JSON.stringify(h));
      sendResponse({});
    })();
    return true;
  }
  if (msg.type === 'DELETE_ITEM') {
    (async () => {
      const raw = await storage.get('clipHistory');
      const h = raw ? JSON.parse(raw) : [];
      await storage.set('clipHistory', JSON.stringify(h.filter(i => i.time !== msg.time)));
      sendResponse({});
    })();
    return true;
  }
  if (msg.type === 'CLEAR_UNPINNED') {
    (async () => {
      const raw = await storage.get('clipHistory');
      const h = raw ? JSON.parse(raw) : [];
      await storage.set('clipHistory', JSON.stringify(h.filter(i => i.pinned)));
      sendResponse({});
    })();
    return true;
  }
});
```

## Step 5: Popup {#step-5-popup}
```html
<!DOCTYPE html>
<html>
<head>
<style>
body { width: 350px; max-height: 500px; margin: 0; font-family: system-ui; background: #1a1a2e; color: #e0e0e0; }
.header { display: flex; padding: 8px; gap: 8px; border-bottom: 1px solid #333; }
#search { flex: 1; padding: 6px; border: 1px solid #333; border-radius: 4px; background: #0d0d1a; color: #e0e0e0; }
#clear { padding: 6px 10px; border: 1px solid #ff4444; background: transparent; color: #ff4444; border-radius: 4px; cursor: pointer; }
#list { overflow-y: auto; max-height: 450px; }
.item { padding: 8px 12px; border-bottom: 1px solid #222; cursor: pointer; display: flex; gap: 8px; align-items: center; }
.item:hover { background: rgba(0,255,65,0.1); }
.item.pinned { border-left: 3px solid #ffd700; }
.text { flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 12px; }
.actions button { border: none; background: transparent; color: #888; cursor: pointer; }
</style>
</head>
<body>
  <div class="header">
    <input type="search" id="search" placeholder="Search clips...">
    <button id="clear">Clear</button>
  </div>
  <div id="list"></div>
  <script>
    function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    async function load(filter='') {
      const raw = await chrome.storage.local.get('clipHistory');
      let items = raw.clipHistory ? JSON.parse(raw.clipHistory) : [];
      if (filter) items = items.filter(i => i.text.toLowerCase().includes(filter.toLowerCase()));
      items.sort((a,b) => (b.pinned-a.pinned) || (b.time-a.time));
      const list = document.getElementById('list');
      list.innerHTML = '';
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item' + (item.pinned ? ' pinned' : '');
        div.innerHTML = '<div class="text" title="'+esc(item.text)+'">'+esc(item.text)+'</div>'
          + '<div class="actions"><button class="pin">'+(item.pinned?'Unpin':'Pin')+'</button><button class="del">X</button></div>';
        div.querySelector('.pin').onclick = (e) => { e.stopPropagation(); chrome.runtime.sendMessage({ type:'TOGGLE_PIN', time:item.time }).then(()=>load(filter)); };
        div.querySelector('.del').onclick = (e) => { e.stopPropagation(); chrome.runtime.sendMessage({ type:'DELETE_ITEM', time:item.time }).then(()=>load(filter)); };
        div.onclick = async () => {
          await chrome.runtime.sendMessage({ type:'PASTE_TEXT', text:item.text });
          div.style.background = 'rgba(0,255,65,0.3)';
          setTimeout(() => window.close(), 300);
        };
        list.appendChild(div);
      });
    }
    document.getElementById('search').oninput = (e) => load(e.target.value);
    document.getElementById('clear').onclick = () => chrome.runtime.sendMessage({ type:'CLEAR_UNPINNED' }).then(()=>load());
    load();
  </script>
</body>
</html>
```

## Next Steps {#next-steps}
- Image clipboard support
- Rich text preview
- Sync pinned items across devices
- Keyboard navigation in popup
