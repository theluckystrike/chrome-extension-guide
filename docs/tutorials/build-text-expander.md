---
layout: default
title: "Chrome Extension Text Expander. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-text-expander/"
---
Build a Text Expander Extension

What You'll Build {#what-youll-build}
A text expander that transforms typed shortcuts into full snippets anywhere on the web. Includes an options page for snippet management, dynamic variables like {date} and {clipboard}, and works across all text inputs including contentEditable elements and shadow DOM.

Project Structure {#project-structure}
```
text-expander/
  manifest.json
  background.js
  content.js
  popup/popup.html
  popup/popup.css
  popup/popup.js
  options/options.html
  options/options.css
  options/options.js
```

Manifest {#manifest}
```json
{
  "manifest_version": 3,
  "name": "Text Expander",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab", "clipboardRead"],
  "action": { "default_popup": "popup/popup.html" },
  "options_page": "options/options.html",
  "background": { "service_worker": "background.js" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"] }]
}
```

Step 1: Snippet Storage {#step-1-snippet-storage}
Use @theluckystrike/webext-storage for clean async storage with sync support.

```javascript
// background.js
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  snippets: 'string'  // JSON: { [trigger]: expansion }
}), 'sync');

const DEFAULT_SNIPPETS = {
  '/sig': 'Best regards,\nJohn Doe',
  '/email': 'john.doe@example.com',
  '/addr': '123 Main Street\nCity, State 12345'
};

async function getSnippets() {
  const raw = await storage.get('snippets');
  return raw ? JSON.parse(raw) : DEFAULT_SNIPPETS;
}

async function saveSnippets(snippets) {
  await storage.set('snippets', JSON.stringify(snippets));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_SNIPPETS') {
    getSnippets().then(sendResponse);
    return true;
  }
  if (msg.type === 'SAVE_SNIPPETS') {
    saveSnippets(msg.snippets).then(() => sendResponse({ success: true }));
    return true;
  }
  if (msg.type === 'GET_CLIPBOARD') {
    navigator.clipboard.readText().then(text => sendResponse({ text })).catch(() => sendResponse({ text: '' }));
    return true;
  }
});
```

Step 2: Content Script Input Monitor {#step-2-content-script-input-monitor}
Listen for keyup events and track typed characters to detect triggers.

```javascript
// content.js
let buffer = '';
let bufferTimeout = null;
const BUFFER_CLEAR_MS = 2000;

function isValidInput(el) {
  if (el.tagName === 'INPUT' && (el.type === 'password' || el.type === 'email')) return false;
  return el.tagName === 'TEXTAREA' || el.isContentEditable;
}

async function checkTriggers(inputEl) {
  const snippets = await chrome.runtime.sendMessage({ type: 'GET_SNIPPETS' });
  const triggers = Object.keys(snippets);
  
  for (const trigger of triggers) {
    if (buffer.endsWith(trigger)) {
      const expansion = await processVariables(snippets[trigger]);
      await replaceText(inputEl, trigger, expansion);
      buffer = '';
      return;
    }
  }
}

document.addEventListener('keyup', (e) => {
  if (!isValidInput(e.target)) return;
  
  clearTimeout(bufferTimeout);
  buffer += e.key;
  
  // Limit buffer size
  if (buffer.length > 50) buffer = buffer.slice(-50);
  
  bufferTimeout = setTimeout(() => { buffer = ''; }, BUFFER_CLEAR_MS);
  checkTriggers(e.target);
});
```

Step 3: Text Replacement {#step-3-text-replacement}
Handle different input types with appropriate replacement methods.

```javascript
async function replaceText(inputEl, trigger, expansion) {
  if (inputEl.tagName === 'INPUT' || inputEl.tagName === 'TEXTAREA') {
    const start = inputEl.selectionStart;
    const end = inputEl.selectionEnd;
    const value = inputEl.value;
    
    // Find trigger position
    const triggerStart = start - trigger.length;
    const before = value.slice(0, triggerStart);
    const after = value.slice(end);
    
    inputEl.value = before + expansion + after;
    inputEl.selectionStart = inputEl.selectionEnd = triggerStart + expansion.length;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  } 
  else if (inputEl.isContentEditable) {
    // For contentEditable, use execCommand for reliable insertion
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    
    const range = sel.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType === Node.TEXT_NODE) {
      const offset = range.startOffset;
      const text = textNode.textContent;
      const triggerStart = offset - trigger.length;
      
      textNode.textContent = text.slice(0, triggerStart) + expansion + text.slice(offset);
      
      // Move cursor after expansion
      const newRange = document.createRange();
      newRange.setStart(textNode, triggerStart + expansion.length);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  }
}
```

Step 4: Dynamic Variables {#step-4-dynamic-variables}
Process variables like {date}, {time}, {clipboard}, and {cursor}.

```javascript
async function processVariables(text) {
  let result = text;
  const vars = {
    '{date}': () => new Date().toLocaleDateString(),
    '{time}': () => new Date().toLocaleTimeString(),
    '{datetime}': () => new Date().toLocaleString(),
    '{cursor}': () => '|'  // Marker for cursor position
  };
  
  for (const [pattern, fn] of Object.entries(vars)) {
    if (result.includes(pattern)) {
      result = result.replace(pattern, fn());
    }
  }
  
  if (result.includes('{clipboard}')) {
    try {
      const { text } = await chrome.runtime.sendMessage({ type: 'GET_CLIPBOARD' });
      result = result.replace('{clipboard}', text || '');
    } catch {
      result = result.replace('{clipboard}', '');
    }
  }
  
  return result;
}
```

Step 5: Shadow DOM Support {#step-5-shadow-dom-support}
Extend detection to include shadow DOM inputs.

```javascript
function observeShadowRoots(root = document) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.shadowRoot) {
            attachShadowListeners(node.shadowRoot);
          }
          const shadowChildren = node.querySelectorAll('*');
          shadowChildren.forEach((child) => {
            if (child.shadowRoot) attachShadowListeners(child.shadowRoot);
          });
        }
      });
    });
  });
  
  observer.observe(root, { childList: true, subtree: true });
}

function attachShadowListeners(shadowRoot) {
  shadowRoot.addEventListener('keyup', (e) => {
    if (!isValidInput(e.target)) return;
    // Same buffer logic as main document
    clearTimeout(bufferTimeout);
    buffer += e.key;
    if (buffer.length > 50) buffer = buffer.slice(-50);
    bufferTimeout = setTimeout(() => { buffer = ''; }, BUFFER_CLEAR_MS);
    checkTriggers(e.target);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => observeShadowRoots());
document.addEventListener('focusin', (e) => {
  if (e.target.shadowRoot) attachShadowListeners(e.target.shadowRoot);
});
```

Step 6: Options Page {#step-6-options-page}
Full CRUD interface for managing snippets.

```html
<!-- options/options.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <h1>Text Expander Settings</h1>
  <div class="toolbar">
    <button id="add">+ Add Snippet</button>
    <button id="export">Export JSON</button>
    <button id="import">Import JSON</button>
  </div>
  <div id="list"></div>
  <script src="options.js"></script>
</body>
</html>
```

```javascript
// options/options.js
let snippets = {};

async function load() {
  snippets = await chrome.runtime.sendMessage({ type: 'GET_SNIPPETS' });
  render();
}

function render() {
  const list = document.getElementById('list');
  list.innerHTML = '';
  
  Object.entries(snippets).forEach(([trigger, expansion]) => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <input class="trigger" value="${trigger}" placeholder="Trigger">
      <textarea class="expansion" placeholder="Expansion">${expansion}</textarea>
      <button class="delete">Delete</button>
    `;
    
    row.querySelector('.trigger').onchange = (e) => {
      const old = trigger;
      const val = e.target.value;
      delete snippets[old];
      snippets[val] = expansion;
      save();
    };
    
    row.querySelector('.expansion').onchange = (e) => {
      snippets[trigger] = e.target.value;
      save();
    };
    
    row.querySelector('.delete').onclick = () => {
      delete snippets[trigger];
      save();
      render();
    };
    
    list.appendChild(row);
  });
}

async function save() {
  await chrome.runtime.sendMessage({ type: 'SAVE_SNIPPETS', snippets });
}

document.getElementById('add').onclick = () => {
  snippets[''] = '';
  save();
  render();
};

// Export/Import handlers omitted for brevity
load();
```

Best Practices {#best-practices}
- Unique prefixes: Use consistent prefixes like `/` or `;` to avoid false triggers in regular text
- Buffer timeout: Clear the character buffer after 2 seconds of inactivity to prevent memory buildup
- Skip sensitive fields: Never monitor password or email fields to protect user credentials
- MutationObserver: Watch for dynamically created inputs and shadow DOM changes
- Debounce processing: Add small delays before trigger checking to ensure complete trigger is typed

Cross-references {#cross-references}
- [Content Script Patterns](../guides/content-script-patterns.md)
- [Form Handling](../patterns/form-handling.md)
- [Options Page](../guides/options-page.md)

Next Steps {#next-steps}
- Add trigger suggestions in popup
- Support trigger folders/categories
- Add usage statistics per snippet
- Implement multi-cursor expansion for code snippets
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
