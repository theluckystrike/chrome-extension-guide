# Build a Text Highlighter Extension

## What You'll Build
- Select text and highlight with color
- Save highlights per URL
- Multiple highlight colors
- Remove highlights on click
- Sidebar listing all highlights
- Export highlights as notes
- Keyboard shortcut: Alt+Shift+H

## Manifest
- permissions: activeTab, storage
- commands with Alt+Shift+H shortcut
- action with popup

---

## Step 1: Manifest Configuration

manifest.json:
```json
{
  "permissions": ["activeTab", "storage"],
  "commands": {
    "toggle-highlighter": {
      "suggested_key": { "default": "Alt+Shift+H", "mac": "Alt+Shift+H" },
      "description": "Toggle text highlighter"
    }
  },
  "action": { "default_popup": "popup.html" }
}
```

Required permissions: `activeTab` for page access, `storage` for persistence.

---

## Step 2: Content Script - Text Selection Listener

content.js:
```javascript
document.addEventListener('mouseup', (e) => {
  const selection = window.getSelection();
  if (selection.toString().length > 0) {
    const range = selection.getRangeAt(0);
    chrome.runtime.sendMessage({
      action: 'text-selected',
      text: selection.toString(),
      range: serializeRange(range)
    });
  }
});

function serializeRange(range) {
  return {
    startPath: getXPath(range.startContainer),
    endPath: getXPath(range.endContainer),
    startOffset: range.startOffset,
    endOffset: range.endOffset
  };
}

function getXPath(node) {
  if (node.id) return `//*[@id="${node.id}"]`;
  let path = [];
  while (node.nodeType === Node.ELEMENT_NODE) {
    let sibling = node;
    let index = 1;
    while (sibling = sibling.previousElementSibling) { index++; }
    path.unshift(`${node.localName}[${index}]`);
    node = node.parentNode;
  }
  return '/' + path.join('/');
}
```

---

## Step 3: Wrapping Text in &lt;mark&gt; Elements

```javascript
function highlightRange(range, color = '#ffeb3b') {
  const mark = document.createElement('mark');
  mark.style.backgroundColor = color;
  mark.dataset.highlightId = generateId();
  mark.className = 'ext-highlight';
  
  try {
    range.surroundContents(mark);
    return mark.dataset.highlightId;
  } catch (e) {
    // Handle highlights across element boundaries
    const frag = document.createDocumentFragment();
    frag.appendChild(range.extractContents());
    mark.appendChild(frag);
    range.insertNode(mark);
    return mark.dataset.highlightId;
  }
}

function generateId() {
  return 'hl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
```

`surroundContents()` fails for complex selections—use extractContents() fallback.

---

## Step 4: Color Picker Popup

popup.html:
```html
<div class="highlight-popup">
  <div class="color-picker">
    <button class="color-btn" data-color="#ffeb3b" style="background:#ffeb3b"></button>
    <button class="color-btn" data-color="#ff9800" style="background:#ff9800"></button>
    <button class="color-btn" data-color="#4caf50" style="background:#4caf50"></button>
    <button class="color-btn" data-color="#2196f3" style="background:#2196f3"></button>
    <button class="color-btn" data-color="#e91e63" style="background:#e91e63"></button>
  </div>
  <div class="highlight-list" id="highlight-list"></div>
  <button id="export-btn">Export as Notes</button>
</div>
```

popup.js:
```javascript
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { action: 'highlight', color: btn.dataset.color });
    });
  });
});
```

---

## Step 5: Saving Highlights to Storage

```javascript
async function saveHighlight(url, highlightData) {
  const key = `highlights_${new URL(url).hostname}`;
  const highlights = await chrome.storage.local.get(key) || [];
  
  highlights.push({
    id: highlightData.id,
    text: highlightData.text,
    color: highlightData.color,
    xpath: highlightData.xpath,
    timestamp: Date.now()
  });
  
  await chrome.storage.local.set({ [key]: highlights });
}
```

Storage key uses hostname for per-site grouping. Store XPath for precise restoration.

---

## Step 6: Restoring Highlights on Page Revisit

```javascript
async function restoreHighlights(tabId) {
  const url = await chrome.tabs.get(tabId).then(t => t.url);
  const key = `highlights_${new URL(url).hostname}`;
  const highlights = await chrome.storage.local.get(key);
  
  if (!highlights[key]) return;
  
  for (const hl of highlights[key]) {
    const node = getNodeByXPath(hl.xpath);
    if (node && node.nodeType === Node.TEXT_NODE) {
      const range = document.createRange();
      range.setStart(node, hl.startOffset);
      range.setEnd(node, hl.endOffset);
      highlightRange(range, hl.color);
    }
  }
}

function getNodeByXPath(xpath) {
  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
  return result.singleNodeValue;
}
```

---

## Step 7: Highlight Sidebar

```javascript
function renderSidebar(highlights) {
  const list = document.getElementById('highlight-list');
  list.innerHTML = highlights.map(hl => `
    <div class="highlight-item" data-id="${hl.id}">
      <span class="color-dot" style="background:${hl.color}"></span>
      <span class="highlight-text">${hl.text.substring(0, 50)}...</span>
      <button class="remove-btn">×</button>
    </div>
  `).join('');
  
  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.highlight-item').dataset.id;
      removeHighlight(id);
    });
  });
}
```

---

## Step 8: Removing Individual Highlights

```javascript
function removeHighlight(id) {
  const mark = document.querySelector(`mark[data-highlight-id="${id}"]`);
  if (mark) {
    const text = document.createTextNode(mark.textContent);
    mark.parentNode.replaceChild(text, mark);
  }
  // Also remove from storage
}
```

Click the × button in sidebar or click highlight directly to remove.

---

## Challenges

### Dynamic Content
Use MutationObserver to detect DOM changes and re-apply highlights:
```javascript
const observer = new MutationObserver((mutations) => {
  // Debounce re-restoration
  clearTimeout(restoreTimeout);
  restoreTimeout = setTimeout(restoreHighlights, 500);
});
observer.observe(document.body, { childList: true, subtree: true });
```

### Page Reflows
Highlights may shift after layout changes. Re-calculate positions on scroll/resize events.

### Cross-Element Boundaries
Selection spanning multiple elements requires splitting into multiple &lt;mark&gt; tags.

---

## Export Highlights as Notes

```javascript
function exportAsMarkdown(highlights) {
  let md = `# Highlights from ${document.title}\n\n`;
  highlights.forEach((hl, i) => {
    md += `${i + 1}. > ${hl.text}\n   - [${hl.color}] ${new Date(hl.timestamp).toLocaleDateString()}\n`;
  });
  return md;
}
```

Download as .md file or copy to clipboard.

---

## Cross-References

- [DOM Observer Patterns](../patterns/dom-observer-patterns.md) — Watching for dynamic content
- [Storage API Deep Dive](../api-reference/storage-api-deep-dive.md) — Advanced storage techniques
- [Content Script Patterns](../guides/content-script-patterns.md) — Content script architecture

---

## Summary

You built a persistent text highlighter with: Selection API for text capture, XPath serialization for range storage, multiple color options, sidebar UI, removal functionality, and markdown export. Test at chrome://extensions/ with Developer mode enabled. Use Alt+Shift+H shortcut for quick access.
