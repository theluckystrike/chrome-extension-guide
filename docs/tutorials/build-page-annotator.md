---
layout: default
title: "Chrome Extension Page Annotator — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-page-annotator/"
---
# Build a Page Annotator Extension

## What You'll Build {#what-youll-build}
Highlight text on any page, add color-coded notes, persist across visits, sync across devices.

## Project Structure {#project-structure}
```
page-annotator/
  manifest.json
  background.js
  content/annotator.js
  content/annotator.css
  popup/popup.html
  popup/popup.js
```

## Step 1: Manifest {#step-1-manifest}
```json
{
  "manifest_version": 3,
  "name": "Page Annotator",
  "version": "1.0.0",
  "permissions": ["activeTab", "storage"],
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/annotator.js"],
    "css": ["content/annotator.css"],
    "run_at": "document_idle"
  }]
}
```

## Step 2: Content Script CSS {#step-2-content-script-css}
```css
.ext-highlight { background: rgba(255,255,0,0.4); cursor: pointer; border-radius: 2px; }
.ext-highlight.green { background: rgba(0,255,65,0.3); }
.ext-highlight.blue { background: rgba(66,133,244,0.3); }
.ext-highlight.pink { background: rgba(255,64,129,0.3); }
.ext-note-popup {
  position: absolute; background: #1a1a2e; color: #e0e0e0;
  border: 1px solid #00ff41; border-radius: 6px; padding: 10px;
  max-width: 300px; z-index: 999999; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}
.ext-note-popup textarea {
  width: 100%; min-height: 60px; background: #0d0d1a; color: #e0e0e0;
  border: 1px solid #333; border-radius: 4px; padding: 4px; margin-top: 6px;
}
.ext-note-popup .actions { display: flex; gap: 6px; margin-top: 6px; justify-content: flex-end; }
.ext-note-popup button { padding: 4px 8px; border: 1px solid #00ff41; background: transparent; color: #00ff41; border-radius: 4px; cursor: pointer; }
.ext-note-popup button.delete { border-color: #ff4444; color: #ff4444; }
```

## Step 3: Content Script JavaScript {#step-3-content-script-javascript}
```javascript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  annotations: 'string' // JSON: { [url]: Annotation[] }
}), 'sync');

// Annotation: { id, text, note, color, selector }

async function restoreAnnotations() {
  const url = location.origin + location.pathname;
  const raw = await storage.get('annotations');
  const all = raw ? JSON.parse(raw) : {};
  (all[url] || []).forEach(ann => {
    try { applyHighlight(ann); } catch (e) { /* page changed */ }
  });
}

// Listen for text selection to create highlights
document.addEventListener('mouseup', () => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
  const range = sel.getRangeAt(0);
  const ann = {
    id: Date.now().toString(36),
    text: sel.toString().trim(),
    note: '', color: 'yellow',
    selector: buildSelector(range.startContainer.parentElement)
  };
  applyHighlight(ann);
  saveAnnotation(ann);
  sel.removeAllRanges();
});

function applyHighlight(ann) {
  const el = document.querySelector(ann.selector);
  if (!el) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.includes(ann.text)) {
      const range = document.createRange();
      const i = node.textContent.indexOf(ann.text);
      range.setStart(node, i);
      range.setEnd(node, i + ann.text.length);
      const mark = document.createElement('mark');
      mark.className = `ext-highlight ${ann.color}`;
      mark.dataset.id = ann.id;
      mark.onclick = (e) => { e.preventDefault(); showNotePopup(mark, ann); };
      range.surroundContents(mark);
      return;
    }
  }
}

function showNotePopup(mark, ann) {
  document.querySelectorAll('.ext-note-popup').forEach(p => p.remove());
  const popup = document.createElement('div');
  popup.className = 'ext-note-popup';
  popup.innerHTML = `
    <strong>"${ann.text.slice(0,50)}${ann.text.length>50?'...':''}"</strong>
    <textarea placeholder="Add a note...">${ann.note||''}</textarea>
    <div>Color: <select>
      ${['yellow','green','blue','pink'].map(c =>
        `<option value="${c}" ${ann.color===c?'selected':''}>${c}</option>`).join('')}
    </select></div>
    <div class="actions">
      <button class="delete">Delete</button>
      <button class="save">Save</button>
    </div>`;
  popup.querySelector('.save').onclick = async () => {
    ann.note = popup.querySelector('textarea').value;
    ann.color = popup.querySelector('select').value;
    mark.className = `ext-highlight ${ann.color}`;
    await saveAnnotation(ann);
    popup.remove();
  };
  popup.querySelector('.delete').onclick = async () => {
    await deleteAnnotation(ann.id);
    mark.outerHTML = mark.innerHTML;
    popup.remove();
  };
  const rect = mark.getBoundingClientRect();
  popup.style.top = (scrollY + rect.bottom + 8) + 'px';
  popup.style.left = (scrollX + rect.left) + 'px';
  document.body.appendChild(popup);
}

function buildSelector(el) {
  if (el.id) return '#' + el.id;
  const parts = [];
  while (el && el !== document.body) {
    let s = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string')
      s += '.' + el.className.trim().split(/\s+/).join('.');
    const sibs = el.parentElement?.children;
    if (sibs?.length > 1) s += `:nth-child(${[...sibs].indexOf(el)+1})`;
    parts.unshift(s);
    el = el.parentElement;
  }
  return parts.join(' > ');
}

async function saveAnnotation(ann) {
  const url = location.origin + location.pathname;
  const raw = await storage.get('annotations');
  const all = raw ? JSON.parse(raw) : {};
  const page = all[url] || [];
  const idx = page.findIndex(a => a.id === ann.id);
  if (idx >= 0) page[idx] = ann; else page.push(ann);
  all[url] = page;
  await storage.set('annotations', JSON.stringify(all));
}

async function deleteAnnotation(id) {
  const url = location.origin + location.pathname;
  const raw = await storage.get('annotations');
  const all = raw ? JSON.parse(raw) : {};
  all[url] = (all[url] || []).filter(a => a.id !== id);
  if (!all[url].length) delete all[url];
  await storage.set('annotations', JSON.stringify(all));
}

// Respond to popup queries
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_ANNOTATIONS') {
    const url = location.origin + location.pathname;
    storage.get('annotations').then(raw => {
      const all = raw ? JSON.parse(raw) : {};
      sendResponse({ annotations: all[url] || [] });
    });
    return true;
  }
});

restoreAnnotations();
```

## Step 4: Popup — Annotation List {#step-4-popup-annotation-list}
```html
<!DOCTYPE html>
<html>
<head>
<style>
body { width: 320px; padding: 12px; font-family: system-ui; background: #1a1a2e; color: #e0e0e0; margin: 0; }
h2 { font-size: 14px; color: #00ff41; margin: 0 0 8px; }
.item { padding: 6px 0; border-bottom: 1px solid #333; font-size: 12px; }
.text { font-style: italic; color: #aaa; }
.note { margin-top: 2px; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
#empty { color: #666; }
button { margin-top: 8px; padding: 6px; border: 1px solid #00ff41; background: transparent; color: #00ff41; border-radius: 4px; cursor: pointer; width: 100%; }
</style>
</head>
<body>
  <h2>Page Annotations</h2>
  <div id="list"></div>
  <div id="empty" style="display:none">Select text on any page to highlight it.</div>
  <button id="export">Export All</button>
  <script>
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_ANNOTATIONS' }, (res) => {
        const anns = res?.annotations || [];
        if (!anns.length) { document.getElementById('empty').style.display = 'block'; return; }
        const list = document.getElementById('list');
        const colors = { yellow:'#ffff00', green:'#00ff41', blue:'#4285f4', pink:'#ff4081' };
        anns.forEach(a => {
          const d = document.createElement('div');
          d.className = 'item';
          d.innerHTML = '<span class="dot" style="background:'+(colors[a.color]||'#ffff00')+'"></span> '
            + '<span class="text">"'+a.text.slice(0,80)+(a.text.length>80?'...':'') +'"</span>'
            + (a.note ? '<div class="note">'+a.note+'</div>' : '');
          list.appendChild(d);
        });
      });
    });
    document.getElementById('export').onclick = async () => {
      const raw = await chrome.storage.sync.get('annotations');
      const blob = new Blob([raw.annotations||'{}'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: 'annotations.json' }).click();
      URL.revokeObjectURL(url);
    };
  </script>
</body>
</html>
```

## Next Steps {#next-steps}
- Side panel for annotation overview across all pages
- Markdown/HTML export
- Keyboard shortcut to highlight selection
- Improved selector fallbacks for dynamic pages
