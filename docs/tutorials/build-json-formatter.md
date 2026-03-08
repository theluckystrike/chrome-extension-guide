---
layout: default
title: "Chrome Extension JSON Formatter — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a JSON Formatter Chrome Extension

This tutorial walks through building a Chrome extension that detects, formats, and visualizes JSON in browser tabs.

## Step 1: Manifest Configuration

Create `manifest.json` with `activeTab` permission and content script matching JSON content-type pages:

```json
{
  "manifest_version": 3,
  "name": "JSON Formatter Pro",
  "version": "1.0",
  "permissions": ["activeTab", "clipboardWrite"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["styles.css"]
  }],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  }
}
```

## Step 2: Detect Raw JSON

Content script to detect JSON in the page. Check `document.contentType` or analyze body text:

```javascript
// content.js
function detectJSON() {
  const contentType = document.contentType;
  const isJSONPage = contentType.includes('json') || 
                     contentType.includes('text/plain');
  
  if (isJSONPage) {
    const text = document.body.innerText.trim();
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }
  return null;
}
```

## Step 3: JSON Parser and Tree Builder

Build a recursive DOM structure to display JSON as an interactive tree:

```javascript
function buildJSONTree(data, path = 'root') {
  const container = document.createElement('div');
  container.className = 'json-tree';
  
  if (data === null) {
    container.appendChild(createValue('null', 'null', path));
    return container;
  }
  
  if (typeof data === 'object') {
    const isArray = Array.isArray(data);
    const type = isArray ? 'array' : 'object';
    const bracket = isArray ? ['[', ']'] : ['{', '}'];
    
    const toggle = document.createElement('span');
    toggle.className = 'toggle';
    toggle.textContent = '▼';
    toggle.onclick = () => container.classList.toggle('collapsed');
    
    const label = document.createElement('span');
    label.className = `bracket ${type}`;
    label.textContent = `${bracket[0]}...${bracket[1]}`;
    
    container.appendChild(toggle);
    container.appendChild(label);
    
    const children = document.createElement('div');
    children.className = 'children';
    
    Object.entries(data).forEach(([key, value]) => {
      const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`;
      const childContainer = buildJSONTree(value, childPath);
      
      const keySpan = document.createElement('span');
      keySpan.className = 'key';
      keySpan.textContent = isArray ? '' : `"${key}": `;
      
      childContainer.prepend(keySpan);
      children.appendChild(childContainer);
    });
    
    container.appendChild(children);
  } else {
    container.appendChild(createValue(data, typeof data, path));
  }
  
  return container;
}
```

## Step 4: Syntax Highlighting

Apply CSS classes for different JSON types:

```css
/* styles.css */
.json-tree .string { color: #98c379; }
.json-tree .number { color: #d19a66; }
.json-tree .boolean { color: #56b6c2; }
.json-tree .null { color: #c678dd; }
.json-tree .key { color: #e06c75; }
.json-tree .bracket { color: #abb2bf; font-weight: bold; }
```

## Step 5: Collapsible Nodes

Toggle collapse/expand with click handlers:

```javascript
function createToggle() {
  const toggle = document.createElement('span');
  toggle.className = 'toggle-btn';
  toggle.textContent = '▼';
  toggle.onclick = (e) => {
    e.stopPropagation();
    const container = e.target.closest('.json-node');
    container.classList.toggle('collapsed');
  };
  return toggle;
}
```

## Step 6: Copy Value/Path to Clipboard

Implement clipboard functionality:

```javascript
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  });
}

function createValue(value, type, path) {
  const span = document.createElement('span');
  span.className = `value ${type}`;
  span.textContent = type === 'string' ? `"${value}"` : value;
  span.onclick = () => {
    if (event.shiftKey) {
      copyToClipboard(path);
    } else {
      copyToClipboard(JSON.stringify(value));
    }
  };
  return span;
}
```

## Step 7: Search/Filter Functionality

Add search to filter JSON nodes:

```javascript
function addSearchBar(container) {
  const search = document.createElement('input');
  search.type = 'text';
  search.placeholder = 'Search keys or values...';
  search.className = 'json-search';
  search.oninput = (e) => {
    const query = e.target.value.toLowerCase();
    container.querySelectorAll('.json-node').forEach(node => {
      const text = node.textContent.toLowerCase();
      node.style.display = text.includes(query) ? '' : 'none';
    });
  };
  container.prepend(search);
}
```

## Step 8: Dark/Light Theme Toggle

Support theme switching (see also `patterns/theming-dark-mode.md`):

```javascript
function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  document.body.classList.toggle('light-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
```

## Edge Cases

### Large JSON (Virtualized Rendering)
For documents > 1MB, implement lazy rendering:

```javascript
const LAZY_THRESHOLD = 1000;
function renderLazy(data, container) {
  if (Object.keys(data).length > LAZY_THRESHOLD) {
    container.classList.add('lazy');
    // Render first 100 items, load more on scroll
  }
}
```

### Invalid JSON
Display clear error messages:

```javascript
try {
  data = JSON.parse(text);
} catch (e) {
  showError(`Invalid JSON: ${e.message}`);
}
```

### JSONL Format (JSON Lines)
Parse line-by-line:

```javascript
function parseJSONL(text) {
  return text.split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}
```

## Related Patterns

- See `patterns/clipboard-patterns.md` for clipboard best practices
- See `guides/content-script-patterns.md` for content script architecture
- See `patterns/theming-dark-mode.md` for theme implementation
