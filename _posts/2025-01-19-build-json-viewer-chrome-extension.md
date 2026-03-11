---
layout: post
title: "Build a JSON Viewer Chrome Extension: Complete Developer's Guide"
description: "Learn how to build a powerful JSON viewer Chrome extension from scratch. This comprehensive tutorial covers Manifest V3, content scripts, syntax highlighting, tree navigation, and publishing to the Chrome Web Store."
date: 2025-01-19
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, tutorial, project]
keywords: "json viewer chrome extension, json formatter extension, pretty json extension, build chrome extension, chrome extension development"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/19/build-json-viewer-chrome-extension/"
---

# Build a JSON Viewer Chrome Extension: Complete Developer's Guide

JSON (JavaScript Object Notation) has become the universal language of data exchange on the web. Every developer works with JSON daily — whether parsing API responses, debugging network requests, or inspecting configuration files. Yet browsers still display JSON as unstructured, hard-to-read text. This creates a genuine problem that affects millions of developers worldwide.

In this comprehensive guide, we will build a fully functional JSON viewer Chrome extension from scratch. By the end of this tutorial, you will have created an extension that automatically formats raw JSON data, provides syntax highlighting, enables tree navigation, and allows users to copy specific values. This is a practical project that solves real developer pain points, and it demonstrates many essential Chrome extension development concepts.

---

## Why Build a JSON Viewer Extension? {#why-build-json-viewer}

Before we dive into the code, let us consider why a JSON viewer extension is a valuable project to build in 2025.

### The Problem with Raw JSON

When you make an API request in your browser or view a JSON file, Chrome typically displays it as unformatted text. Consider this example of a typical API response:

```json
{"users":[{"id":1,"name":"John Doe","email":"john@example.com","address":{"city":"New York","zip":"10001"}},{"id":2,"name":"Jane Smith","email":"jane@example.com","address":{"city":"Los Angeles","zip":"90001"}}],"total":2,"page":1}
```

This raw format makes it incredibly difficult to understand the data structure, locate specific values, or identify nested objects. Developers often resort to copying and pasting into online JSON formatters, which disrupts their workflow and wastes valuable time.

### Market Demand for JSON Tools

The demand for good JSON viewer extensions is substantial. A quick search in the Chrome Web Store reveals that JSON formatter extensions have millions of users. This category consistently ranks among the most popular developer tools. Building a JSON viewer demonstrates your ability to create practical, user-focused extensions that solve real problems.

### Learning Opportunities

This project covers numerous essential Chrome extension development skills:

- **Content script injection**: Automatically detecting and formatting JSON on web pages
- **DOM manipulation**: Creating interactive UI elements within web pages
- **Message passing**: Communicating between content scripts and popup interfaces
- **Storage API**: Persisting user preferences across sessions
- **Chrome DevTools integration**: Debugging and testing your extension

Let us start building.

---

## Project Architecture {#project-architecture}

Our JSON viewer extension will consist of three main components:

1. **The Popup Interface**: A toolbar popup where users can toggle formatting, adjust settings, and access formatting controls
2. **The Content Script**: Injected into web pages to detect and format JSON data
3. **The Background Service Worker**: Handles extension lifecycle events and manages state

Here is the complete project structure:

```
json-viewer-extension/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── content.js
├── content.css
├── background.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── utils/
    └── jsonFormatter.js
```

---

## Step 1: Creating the Manifest {#step-1-manifest}

Every Chrome extension begins with the manifest file. This JSON configuration tells Chrome about your extension's capabilities, permissions, and file structure.

```json
{
  "manifest_version": 3,
  "name": "JSON Viewer Pro",
  "version": "1.0.0",
  "description": "Format, highlight, and navigate JSON data with ease. The ultimate JSON viewer for developers.",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Key manifest configuration points worth explaining:

**Permissions**: We request `activeTab` for accessing the current tab, `storage` for persisting user preferences, and `scripting` for programmatic script injection. The `host_permissions` with `<all_urls>` allows the content script to run on all websites, which is necessary since JSON can appear anywhere on the web.

**Content Scripts**: We use `run_at: "document_end"` to ensure our script runs after the page fully loads, ensuring we can access all page content including dynamically loaded JSON.

---

## Step 2: Building the JSON Formatter Utility {#step-2-formatter}

Before creating the UI components, let us build the core JSON formatting logic. This utility will handle the heavy lifting of parsing and rendering JSON data.

```javascript
// utils/jsonFormatter.js

export class JsonFormatter {
  constructor(options = {}) {
    this.options = {
      indent: options.indent || 2,
      theme: options.theme || 'default',
      collapsible: options.collapsible !== false,
      copyEnabled: options.copyEnabled !== false,
      maxDepth: options.maxDepth || 10,
      ...options
    };
  }

  format(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return this.render(parsed, 0);
    } catch (error) {
      return this.renderError(error, jsonString);
    }
  }

  render(data, depth, key = null) {
    if (depth > this.options.maxDepth) {
      return this.renderPrimitive(data, key);
    }

    if (data === null) {
      return this.renderNull(key);
    }

    if (typeof data === 'object') {
      return Array.isArray(data) 
        ? this.renderArray(data, depth, key)
        : this.renderObject(data, depth, key);
    }

    return this.renderPrimitive(data, key);
  }

  renderObject(obj, depth, key) {
    const entries = Object.entries(obj);
    const isEmpty = entries.length === 0;
    const bracket = isEmpty ? '{}' : '{';
    
    let html = `<div class="json-object ${this.options.collapsible ? 'collapsible' : ''}" data-depth="${depth}">`;
    
    if (key !== null) {
      html += `<span class="json-key">"${key}"</span>: `;
    }
    
    html += `<span class="json-bracket">${bracket}</span>`;
    
    if (!isEmpty) {
      html += `<span class="json-toggle">▼</span>`;
      html += `<div class="json-children">`;
      
      entries.forEach(([k, v], index) => {
        const isLast = index === entries.length - 1;
        html += this.render(v, depth + 1, k);
        if (!isLast) html += `<span class="json-comma">,</span>`;
      });
      
      html += `</div>`;
      html += `<span class="json-bracket">}</span>`;
    } else {
      html += `<span class="json-bracket">}</span>`;
    }
    
    html += `</div>`;
    return html;
  }

  renderArray(arr, depth, key) {
    const isEmpty = arr.length === 0;
    const bracket = isEmpty ? '[]' : '[';
    
    let html = `<div class="json-array ${this.options.collapsible ? 'collapsible' : ''}" data-depth="${depth}">`;
    
    if (key !== null) {
      html += `<span class="json-key">"${key}"</span>: `;
    }
    
    html += `<span class="json-bracket">${bracket}</span>`;
    
    if (!isEmpty) {
      html += `<span class="json-toggle">▼</span>`;
      html += `<div class="json-children">`;
      
      arr.forEach((item, index) => {
        const isLast = index === arr.length - 1;
        html += this.render(item, depth + 1, null);
        if (!isLast) html += `<span class="json-comma">,</span>`;
      });
      
      html += `</div>`;
      html += `<span class="json-bracket">]</span>`;
    } else {
      html += `<span class="json-bracket">]</span>`;
    }
    
    html += `</div>`;
    return html;
  }

  renderPrimitive(value, key) {
    let html = '<div class="json-primitive">';
    
    if (key !== null) {
      html += `<span class="json-key">"${key}"</span>: `;
    }
    
    const type = typeof value;
    let valueHtml;
    
    switch (type) {
      case 'string':
        valueHtml = `<span class="json-string">"${this.escapeHtml(value)}"</span>`;
        break;
      case 'number':
        valueHtml = `<span class="json-number">${value}</span>`;
        break;
      case 'boolean':
        valueHtml = `<span class="json-boolean">${value}</span>`;
        break;
      default:
        valueHtml = `<span class="json-null">null</span>`;
    }
    
    html += valueHtml;
    html += '</div>';
    return html;
  }

  renderNull(key) {
    let html = '<div class="json-primitive">';
    if (key !== null) {
      html += `<span class="json-key">"${key}"</span>: `;
    }
    html += '<span class="json-null">null</span>';
    html += '</div>';
    return html;
  }

  renderError(error, original) {
    return `<div class="json-error">
      <span class="json-error-title">Invalid JSON</span>
      <span class="json-error-message">${error.message}</span>
      <pre class="json-raw">${this.escapeHtml(original)}</pre>
    </div>`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export function detectJson(text) {
  const trimmed = text.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

export function extractJsonFromPage() {
  const scripts = document.querySelectorAll('script[type="application/json"], script[id*="json"], script[data-json]');
  const elements = document.querySelectorAll('[data-json], [type="application/ld+json"]');
  
  const results = [];
  
  scripts.forEach((script, index) => {
    if (script.textContent.trim()) {
      results.push({
        source: `script#${script.id || index}`,
        content: script.textContent
      });
    }
  });
  
  elements.forEach((el, index) => {
    const content = el.textContent || el.dataset.json;
    if (content && content.trim()) {
      results.push({
        source: `${el.tagName.toLowerCase()}.${el.className || index}`,
        content: content
      });
    }
  });
  
  return results;
}
```

This formatter handles various JSON structures including nested objects, arrays, primitive values, and null values. It also provides error handling for invalid JSON.

---

## Step 3: Creating the Content Script {#step-3-content-script}

The content script is the heart of our extension. It runs in the context of web pages and handles JSON detection, formatting, and user interactions.

```javascript
// content.js

import { JsonFormatter, detectJsonFromPage, extractJsonFromPage } from './utils/jsonFormatter.js';

class JsonViewerExtension {
  constructor() {
    this.formatter = null;
    this.viewerContainer = null;
    this.isEnabled = true;
    this.init();
  }

  async init() {
    this.loadSettings();
    this.createViewerContainer();
    this.scanAndFormatPage();
    this.setupMutationObserver();
    this.attachKeyboardShortcuts();
  }

  async loadSettings() {
    const settings = await chrome.storage.local.get([
      'enabled',
      'indent',
      'theme',
      'collapsible',
      'copyEnabled'
    ]);
    
    this.isEnabled = settings.enabled !== false;
    this.formatter = new JsonFormatter({
      indent: settings.indent || 2,
      theme: settings.theme || 'default',
      collapsible: settings.collapsible !== false,
      copyEnabled: settings.copyEnabled !== false
    });
  }

  createViewerContainer() {
    const container = document.createElement('div');
    container.id = 'json-viewer-container';
    container.innerHTML = `
      <div class="json-viewer-header">
        <span class="json-viewer-title">JSON Viewer</span>
        <div class="json-viewer-controls">
          <button class="json-btn json-btn-collapse" title="Collapse All">[-]</button>
          <button class="json-btn json-btn-expand" title="Expand All">[+]</button>
          <button class="json-btn json-btn-copy" title="Copy All">[Copy]</button>
          <button class="json-btn json-btn-close" title="Close">[×]</button>
        </div>
      </div>
      <div class="json-viewer-content"></div>
    `;
    container.style.display = 'none';
    document.body.appendChild(container);
    this.viewerContainer = container;
    this.attachContainerListeners();
  }

  attachContainerListeners() {
    const closeBtn = this.viewerContainer.querySelector('.json-btn-close');
    closeBtn.addEventListener('click', () => this.hideViewer());

    const collapseBtn = this.viewerContainer.querySelector('.json-btn-collapse');
    collapseBtn.addEventListener('click', () => this.collapseAll());

    const expandBtn = this.viewerContainer.querySelector('.json-btn-expand');
    expandBtn.addEventListener('click', () => this.expandAll());

    const copyBtn = this.viewerContainer.querySelector('.json-btn-copy');
    copyBtn.addEventListener('click', () => this.copyAll());
  }

  scanAndFormatPage() {
    if (!this.isEnabled) return;

    const jsonElements = extractJsonFromPage();
    
    if (jsonElements.length > 0) {
      this.showViewer(jsonElements[0].content);
    } else {
      this.detectRawJsonOnPage();
    }
  }

  detectRawJsonOnPage() {
    const preElements = document.querySelectorAll('pre');
    preElements.forEach(pre => {
      const text = pre.textContent;
      if (detectJson(text)) {
        pre.classList.add('json-viewer-detected');
        pre.addEventListener('click', (e) => {
          if (e.altKey) {
            this.showViewer(text);
          }
        });
        pre.style.cursor = 'pointer';
        pre.title = 'Alt+Click to format JSON';
      }
    });
  }

  showViewer(jsonString) {
    const content = this.viewerContainer.querySelector('.json-viewer-content');
    content.innerHTML = this.formatter.format(jsonString);
    this.viewerContainer.style.display = 'block';
    this.attachClickHandlers(content);
    this.setupCopyFunctionality(content);
  }

  hideViewer() {
    this.viewerContainer.style.display = 'none';
  }

  attachClickHandlers(container) {
    container.querySelectorAll('.json-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const parent = e.target.closest('.collapsible');
        parent.classList.toggle('collapsed');
        e.target.textContent = parent.classList.contains('collapsed') ? '▶' : '▼';
      });
    });

    container.querySelectorAll('.json-key').forEach(key => {
      key.addEventListener('click', (e) => {
        this.copyToClipboard(e.target.textContent.replace(/"/g, ''));
        this.showCopiedFeedback(e.target);
      });
    });
  }

  setupCopyFunctionality(container) {
    container.querySelectorAll('.json-string, .json-number, .json-boolean, .json-null').forEach(el => {
      el.addEventListener('click', (e) => {
        let value = e.target.textContent;
        if (e.target.classList.contains('json-string')) {
          value = value.replace(/^"|"$/g, '');
        }
        this.copyToClipboard(value);
        this.showCopiedFeedback(e.target);
      });
    });
  }

  copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  showCopiedFeedback(element) {
    const originalText = element.textContent;
    element.textContent = 'Copied!';
    setTimeout(() => {
      element.textContent = originalText;
    }, 500);
  }

  collapseAll() {
    this.viewerContainer.querySelectorAll('.collapsible').forEach(el => {
      el.classList.add('collapsed');
      const toggle = el.querySelector('.json-toggle');
      if (toggle) toggle.textContent = '▶';
    });
  }

  expandAll() {
    this.viewerContainer.querySelectorAll('.collapsible').forEach(el => {
      el.classList.remove('collapsed');
      const toggle = el.querySelector('.json-toggle');
      if (toggle) toggle.textContent = '▼';
    });
  }

  async copyAll() {
    const content = this.viewerContainer.querySelector('.json-viewer-content');
    const jsonText = content.textContent;
    await this.copyToClipboard(jsonText);
    
    const copyBtn = this.viewerContainer.querySelector('.json-btn-copy');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 1000);
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          this.detectRawJsonOnPage();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  attachKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        if (this.viewerContainer.style.display === 'none') {
          this.scanAndFormatPage();
        } else {
          this.hideViewer();
        }
      }
    });
  }
}

const jsonViewer = new JsonViewerExtension();
```

This content script provides a full-featured JSON viewing experience with collapsible sections, copy functionality, and keyboard shortcuts.

---

## Step 4: Styling the Content Script {#step-4-content-css}

The CSS provides the visual styling for the JSON viewer overlay.

```css
/* content.css */

#json-viewer-container {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 500px;
  max-height: 80vh;
  background: #1e1e1e;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  z-index: 2147483647;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.json-viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #3d3d3d;
}

.json-viewer-title {
  color: #e0e0e0;
  font-weight: 600;
  font-size: 14px;
}

.json-viewer-controls {
  display: flex;
  gap: 8px;
}

.json-btn {
  background: #3d3d3d;
  border: none;
  color: #e0e0e0;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.json-btn:hover {
  background: #4d4d4d;
}

.json-viewer-content {
  padding: 16px;
  overflow-y: auto;
  max-height: calc(80vh - 50px);
  color: #d4d4d4;
}

/* JSON Syntax Highlighting */
.json-key {
  color: #9cdcfe;
}

.json-string {
  color: #ce9178;
}

.json-number {
  color: #b5cea8;
}

.json-boolean {
  color: #569cd6;
}

.json-null {
  color: #569cd6;
}

.json-bracket {
  color: #d4d4d4;
}

.json-comma {
  color: #d4d4d4;
}

/* Collapsible Elements */
.json-toggle {
  display: inline-block;
  cursor: pointer;
  margin-right: 4px;
  color: #808080;
  user-select: none;
  font-size: 10px;
}

.json-children {
  margin-left: 20px;
  border-left: 1px solid #3d3d3d;
  padding-left: 8px;
}

.collapsed .json-children {
  display: none;
}

.collapsed .json-toggle {
  color: #569cd6;
}

/* Error Display */
.json-error {
  padding: 16px;
  background: #2d2d2d;
  border-radius: 4px;
  border-left: 4px solid #f44336;
}

.json-error-title {
  display: block;
  color: #f44336;
  font-weight: 600;
  margin-bottom: 8px;
}

.json-error-message {
  display: block;
  color: #e0e0e0;
  margin-bottom: 12px;
}

.json-raw {
  background: #1e1e1e;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  color: #808080;
  font-size: 12px;
}

/* Detected JSON on Page */
.json-viewer-detected {
  outline: 2px solid #1a73e8;
  outline-offset: 2px;
}

.json-viewer-detected:hover {
  outline-color: #34a853;
}

/* Scrollbar Styling */
.json-viewer-content::-webkit-scrollbar {
  width: 8px;
}

.json-viewer-content::-webkit-scrollbar-track {
  background: #2d2d2d;
}

.json-viewer-content::-webkit-scrollbar-thumb {
  background: #4d4d4d;
  border-radius: 4px;
}

.json-viewer-content::-webkit-scrollbar-thumb:hover {
  background: #5d5d5d;
}
```

---

## Step 5: Building the Popup Interface {#step-5-popup}

The popup provides quick access to the extension's settings without needing to navigate to a full options page.

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JSON Viewer Pro</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <div class="logo">
        <span class="logo-icon">{ }</span>
        <h1>JSON Viewer Pro</h1>
      </div>
    </header>

    <main class="popup-content">
      <section class="control-section">
        <label class="toggle-label">
          <span class="toggle-text">Enable on this page</span>
          <input type="checkbox" id="enableToggle" checked>
          <span class="toggle-slider"></span>
        </label>
      </section>

      <section class="control-section">
        <h3>Formatting Options</h3>
        
        <div class="setting-row">
          <label for="indentSize">Indent Size</label>
          <select id="indentSize">
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>

        <div class="setting-row">
          <label for="themeSelect">Color Theme</label>
          <select id="themeSelect">
            <option value="default">Default Dark</option>
            <option value="light">Light</option>
            <option value="monokai">Monokai</option>
            <option value="github">GitHub</option>
          </select>
        </div>

        <div class="setting-row">
          <label class="toggle-label">
            <span>Collapsible sections</span>
            <input type="checkbox" id="collapsibleToggle" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-row">
          <label class="toggle-label">
            <span>Click to copy values</span>
            <input type="checkbox" id="copyToggle" checked>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </section>

      <section class="control-section">
        <h3>Keyboard Shortcut</h3>
        <div class="shortcut-display">
          <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>J</kbd>
          <span class="shortcut-hint">Toggle viewer</span>
        </div>
      </section>
    </main>

    <footer class="popup-footer">
      <button id="formatBtn" class="action-btn primary">Format JSON</button>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

```css
/* popup.css */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
}

.popup-container {
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.popup-header {
  background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
  color: white;
  padding: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 10px;
  border-radius: 6px;
}

.logo h1 {
  font-size: 16px;
  font-weight: 600;
}

.popup-content {
  flex: 1;
  padding: 16px;
}

.control-section {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.control-section h3 {
  font-size: 12px;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-row label {
  font-size: 13px;
  color: #333;
}

.setting-row select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
}

/* Toggle Switch */
.toggle-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.toggle-label input {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 40px;
  height: 22px;
  background: #ccc;
  border-radius: 11px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  bottom: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

input:checked + .toggle-slider {
  background: #1a73e8;
}

input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

.shortcut-display {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.shortcut-display kbd {
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 4px 8px;
  font-family: monospace;
  font-size: 11px;
}

.shortcut-hint {
  display: block;
  width: 100%;
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.popup-footer {
  padding: 16px;
  background: white;
  border-top: 1px solid #eee;
}

.action-btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn.primary {
  background: #1a73e8;
  color: white;
}

.action-btn.primary:hover {
  background: #1557b0;
}
```

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const enableToggle = document.getElementById('enableToggle');
  const indentSize = document.getElementById('indentSize');
  const themeSelect = document.getElementById('themeSelect');
  const collapsibleToggle = document.getElementById('collapsibleToggle');
  const copyToggle = document.getElementById('copyToggle');
  const formatBtn = document.getElementById('formatBtn');

  loadSettings();

  enableToggle.addEventListener('change', saveSettings);
  indentSize.addEventListener('change', saveSettings);
  themeSelect.addEventListener('change', saveSettings);
  collapsibleToggle.addEventListener('change', saveSettings);
  copyToggle.addEventListener('change', saveSettings);

  formatBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'formatPage' });
    window.close();
  });

  async function loadSettings() {
    const settings = await chrome.storage.local.get([
      'enabled',
      'indent',
      'theme',
      'collapsible',
      'copyEnabled'
    ]);

    enableToggle.checked = settings.enabled !== false;
    indentSize.value = settings.indent || '2';
    themeSelect.value = settings.theme || 'default';
    collapsibleToggle.checked = settings.collapsible !== false;
    copyToggle.checked = settings.copyEnabled !== false;
  }

  async function saveSettings() {
    const settings = {
      enabled: enableToggle.checked,
      indent: indentSize.value,
      theme: themeSelect.value,
      collapsible: collapsibleToggle.checked,
      copyEnabled: copyToggle.checked
    };

    await chrome.storage.local.set(settings);
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { 
      action: 'settingsChanged', 
      settings 
    });
  }
});
```

---

## Step 6: Background Service Worker {#step-6-background}

The service worker handles extension lifecycle events and can manage extension-wide state.

```javascript
// background.js

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('JSON Viewer Pro installed');
    
    chrome.storage.local.set({
      enabled: true,
      indent: 2,
      theme: 'default',
      collapsible: true,
      copyEnabled: true
    });
  } else if (details.reason === 'update') {
    console.log('JSON Viewer Pro updated');
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  chrome.tabs.sendMessage(tab.id, { action: 'toggleViewer' });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    chrome.storage.local.get([
      'enabled',
      'indent',
      'theme',
      'collapsible',
      'copyEnabled'
    ]).then(sendResponse);
    return true;
  }
});
```

---

## Step 7: Loading and Testing {#step-7-testing}

Now that all the files are created, let us load the extension into Chrome and test it.

### Loading Your Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" button
4. Select the folder containing your extension files
5. The extension icon should appear in your toolbar

### Testing the Extension

Create a test HTML file to verify the JSON viewer works correctly:

```html
<!DOCTYPE html>
<html>
<head>
  <title>JSON Test Page</title>
</head>
<body>
  <h1>API Response Viewer</h1>
  
  <h2>User Data</h2>
  <script type="application/json" id="user-data">
  {
    "users": [
      {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com",
        "profile": {
          "avatar": "https://example.com/avatar1.jpg",
          "bio": "Software developer",
          "settings": {
            "theme": "dark",
            "notifications": true
          }
        }
      },
      {
        "id": 2,
        "name": "Jane Smith",
        "email": "jane@example.com",
        "profile": {
          "avatar": "https://example.com/avatar2.jpg",
          "bio": "UX Designer",
          "settings": {
            "theme": "light",
            "notifications": false
          }
        }
      }
    ],
    "metadata": {
      "total": 2,
      "page": 1,
      "hasMore": false
    }
  }
  </script>

  <h2>Product Catalog</h2>
  <pre id="product-data">{"products":[{"id":"p1","name":"Widget","price":29.99,"inStock":true,"tags":["electronics","sale"]},{"id":"p2","name":"Gadget","price":49.99,"inStock":false,"tags":["electronics"]}],"categories":["electronics","accessories"]}</pre>
</body>
</html>
```

When you load this test page, your extension should automatically detect the JSON data and provide formatting capabilities.

---

## Step 8: Publishing to the Chrome Web Store {#step-8-publishing}

Once you have thoroughly tested your extension, you can publish it to reach millions of users.

### Preparing for Publication

1. **Create icon files**: You need 16x16, 48x48, and 128x128 PNG icons
2. **Write a compelling description**: Explain what your extension does and its key features
3. **Take screenshots**: Capture screenshots showing your extension in action
4. **Create a privacy policy**: Required for extensions that access web content

### Submitting Your Extension

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click "New Item" and upload your extension as a ZIP file
3. Fill in the store listing details
4. Submit for review

Google's review process typically takes 1-3 business days. Ensure your extension follows all Chrome Web Store policies to avoid rejection.

---

## Enhancements and Future Improvements {#enhancements}

Your JSON viewer extension has a solid foundation. Here are some ideas for additional features you could add:

### Advanced Features

1. **JSON Schema Validation**: Validate JSON against JSON Schema to ensure data structure matches expectations
2. **Search and Filter**: Add the ability to search for specific keys or values within large JSON objects
3. **Diff View**: Compare two JSON objects and highlight differences
4. **Export Options**: Export formatted JSON to file or copy as various formats (minified, YAML, etc.)
5. **Multiple Tabs**: Support viewing multiple JSON objects in tabs within the viewer panel

### Performance Optimizations

1. **Lazy Rendering**: Only render visible portions of very large JSON objects
2. **Web Workers**: Move JSON parsing to a web worker to avoid blocking the main thread
3. **Virtual Scrolling**: Implement virtual scrolling for large lists to maintain smooth performance

---

## Troubleshooting Common Issues {#troubleshooting}

Here are solutions to common problems you might encounter:

### Extension Not Loading

- Check for syntax errors in your manifest.json
- Ensure all file paths in the manifest are correct
- Look for errors in `chrome://extensions/` error messages

### Content Script Not Injecting

- Verify the content script matches are correct
- Check that the page has finished loading (use `run_at: "document_end"`)
- Look for console errors in the page's DevTools

### JSON Not Being Detected

- Ensure the JSON is properly formatted (valid syntax)
- Check that script elements have the correct type attribute
- Verify the detection logic handles your specific JSON format

### Popup Not Working

- Make sure the popup HTML and JS files are correctly linked
- Check that the popup.js is included as a module if using ES6 imports
- Look for console errors in the popup's DevTools (right-click popup → Inspect)

---

## Conclusion {#conclusion}

Congratulations! You have built a fully functional JSON viewer Chrome extension from scratch. This project demonstrates essential Chrome extension development concepts including content scripts, popup interfaces, the Storage API, message passing, and extension lifecycle management.

The extension you built solves a real problem faced by millions of developers daily. With further enhancements like schema validation, search functionality, and export options, it has the potential to become a widely-used developer tool.

Remember these key principles as you continue developing Chrome extensions:

- **Start with user problems**: Build extensions that solve real pain points
- **Follow Manifest V3**: The latest platform provides better security and performance
- **Request minimal permissions**: Only ask for what your extension needs
- **Test thoroughly**: Test across different websites and edge cases
- **Iterate based on feedback**: Listen to users and improve continuously

The Chrome extension ecosystem offers incredible opportunities for developers to create tools that impact millions of users. Your JSON viewer is just the beginning — let your creativity guide you to building even more powerful extensions.

---

*This guide is part of the [Chrome Extension Guide](https://theluckystrike.github.io/chrome-extension-guide/) by theluckystrike — your comprehensive resource for Chrome extension development.*
