---
layout: post
title: "Build a JSON Viewer Chrome Extension: Pretty Print API Responses"
description: "Learn how to build a JSON viewer Chrome extension that formats and pretty prints API responses. Complete step-by-step tutorial for developers in 2025."
date: 2025-04-06
categories: [Chrome-Extensions, Tutorials]
tags: [json, viewer, chrome-extension]
keywords: "chrome extension json viewer, build json formatter extension, json pretty print chrome, chrome extension format json, json viewer tutorial"
canonical_url: "https://bestchromeextensions.com/2025/04/06/build-json-viewer-chrome-extension/"
---

Build a JSON Viewer Chrome Extension: Pretty Print API Responses

Working with JSON data is an everyday task for web developers. Whether you are debugging API responses, inspecting database outputs, or analyzing configuration files, raw JSON can be difficult to read and navigate. This is where a JSON viewer Chrome extension becomes invaluable. In this comprehensive tutorial, I will walk you through building a fully functional JSON viewer extension from scratch using Manifest V3.

By the end of this guide, you will have created an extension that automatically detects JSON content on web pages, formats it with syntax highlighting, allows collapsible tree navigation, and provides copy functionality. This is a practical project that will teach you essential Chrome extension development skills while producing a tool you can actually use in your daily development workflow.

Why Build a JSON Viewer Extension? {#why-build-json-viewer}

JSON (JavaScript Object Notation) has become the universal data format for web APIs. However, raw JSON responses are often minified, compressed into a single line, and virtually impossible to read without formatting. While browser developer tools do include JSON formatting capabilities, they require manual navigation and often lack features like search, collapsible sections, and customizable themes.

Building your own JSON viewer extension gives you complete control over the user experience. You can add features that matter most to your workflow, integrate with specific APIs, or customize the visual presentation to match your preferences. Additionally, this project covers several core concepts in Chrome extension development that you will use in virtually every extension you build.

The Chrome Web Store already has JSON viewer extensions with millions of downloads, demonstrating strong user demand. However, building your own gives you the freedom to create something unique, learn the underlying concepts, and potentially publish your own version if you add innovative features.

Project Overview and Features {#project-overview}

Before writing any code, let us define what our JSON viewer extension will do. We will build an extension with the following features:

First, automatic JSON detection. The extension will automatically identify when a web page contains unformatted JSON data, such as API response pages, JSON-viewing endpoints, or raw JSON text in textareas. This detection should be intelligent enough to avoid false positives while catching the most common use cases.

Second, pretty printing functionality. When JSON is detected, the extension will format it with proper indentation, making it readable and easy to navigate. The formatted output will include syntax highlighting with different colors for keys, strings, numbers, booleans, and null values.

Third, collapsible tree view. Users will be able to collapse and expand objects and arrays, making it easy to focus on specific parts of complex JSON structures. This feature is crucial when working with deeply nested data.

Fourth, copy functionality. A one-click copy button will allow users to copy the formatted or raw JSON to their clipboard, useful for sharing or further processing.

Fifth, theme support. The extension will include both light and dark themes to accommodate different user preferences and work environments.

These features provide a solid foundation while keeping the project manageable for a tutorial. You can always add more advanced features later, such as JSON validation, search functionality, or JSONPath queries.

Setting Up the Project Structure {#project-structure}

Every Chrome extension needs a well-organized structure. Let us set up our project files. Create a new folder for your extension and add the following files:

First, the manifest.json file. This is the heart of your extension and tells Chrome about your extension's capabilities:

```json
{
  "manifest_version": 3,
  "name": "JSON Viewer Pro",
  "version": "1.0.0",
  "description": "Format and pretty print JSON responses with syntax highlighting",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"]
    }
  ]
}
```

The manifest declares our extension name, version, and permissions. We use Manifest V3, which is the current standard. The permissions array includes activeTab and scripting, which we need for our functionality. The content_scripts section tells Chrome to inject our content script and styles on all web pages.

Second, the popup.html file. This defines the interface that appears when users click the extension icon:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>JSON Viewer Pro</h1>
    <div class="controls">
      <button id="formatBtn" class="btn primary">Format Page JSON</button>
      <button id="clearBtn" class="btn secondary">Clear Formatting</button>
    </div>
    <div class="settings">
      <label>
        <input type="checkbox" id="autoFormat"> Auto-format on page load
      </label>
    </div>
    <div class="status" id="status"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

The popup provides basic controls for manual formatting and a setting for automatic formatting. This gives users flexibility in how they use the extension.

Third, the styles.css file. Good styling makes your extension professional and usable:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 300px;
  padding: 16px;
  background: #ffffff;
  color: #333333;
}

.container h1 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #1a73e8;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn.primary {
  background: #1a73e8;
  color: white;
}

.btn.primary:hover {
  background: #1557b0;
}

.btn.secondary {
  background: #f1f3f4;
  color: #333;
}

.btn.secondary:hover {
  background: #e8eaed;
}

.settings {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 12px;
}

.settings label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}

.status {
  font-size: 12px;
  color: #666;
  text-align: center;
}

.status.success {
  color: #34a853;
}

.status.error {
  color: #ea4335;
}
```

Fourth, the popup.js file. This handles user interactions in the popup:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  const formatBtn = document.getElementById('formatBtn');
  const clearBtn = document.getElementById('clearBtn');
  const autoFormat = document.getElementById('autoFormat');
  const status = document.getElementById('status');
  
  // Load saved preferences
  chrome.storage.local.get(['autoFormat'], function(result) {
    autoFormat.checked = result.autoFormat || false;
  });
  
  formatBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'formatJSON'}, function(response) {
        if (response && response.success) {
          status.textContent = 'JSON formatted successfully!';
          status.className = 'status success';
        } else {
          status.textContent = 'No JSON found on this page';
          status.className = 'status error';
        }
      });
    });
  });
  
  clearBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'clearJSON'}, function(response) {
        status.textContent = 'Formatting cleared';
        status.className = 'status';
      });
    });
  });
  
  autoFormat.addEventListener('change', function() {
    chrome.storage.local.set({autoFormat: autoFormat.checked});
  });
});
```

The popup script handles button clicks and sends messages to the content script. It also manages the auto-format setting using Chrome's storage API.

Implementing the Content Script {#content-script}

The content script is where the real magic happens. This script runs on web pages and handles JSON detection, formatting, and rendering. Let us create content.js:

```javascript
// Content script for JSON Viewer Pro

let formattedContainer = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'formatJSON') {
    formatPageJSON();
    sendResponse({success: true});
  } else if (request.action === 'clearJSON') {
    clearFormatting();
    sendResponse({success: true});
  } else if (request.action === 'checkAutoFormat') {
    chrome.storage.local.get(['autoFormat'], function(result) {
      if (result.autoFormat) {
        formatPageJSON();
      }
    });
  }
  return true;
});

// Main formatting function
function formatPageJSON() {
  // Remove existing formatting if any
  clearFormatting();
  
  // Find JSON content on the page
  const jsonData = findJSONOnPage();
  
  if (!jsonData) {
    console.log('JSON Viewer Pro: No JSON found on this page');
    return;
  }
  
  // Create formatted display
  createFormattedDisplay(jsonData);
}

// Find JSON content in various elements
function findJSONOnPage() {
  // Check pre and code elements
  const preElements = document.querySelectorAll('pre');
  for (const pre of preElements) {
    const text = pre.textContent.trim();
    if (isValidJSON(text)) {
      return JSON.parse(text);
    }
  }
  
  // Check script tags with JSON type
  const scriptElements = document.querySelectorAll('script[type="application/json"], script[type="text/json"]');
  for (const script of scriptElements) {
    const text = script.textContent.trim();
    if (isValidJSON(text)) {
      return JSON.parse(text);
    }
  }
  
  // Check body text for raw JSON
  const bodyText = document.body.innerText;
  const jsonMatch = bodyText.match(/^\s*[\[{]/);
  if (jsonMatch && isValidJSON(bodyText)) {
    return JSON.parse(bodyText);
  }
  
  return null;
}

// Validate JSON string
function isValidJSON(str) {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null;
  } catch (e) {
    return false;
  }
}

// Create the formatted display container
function createFormattedDisplay(data) {
  formattedContainer = document.createElement('div');
  formattedContainer.id = 'json-viewer-pro-container';
  formattedContainer.innerHTML = '<div class="json-viewer-pro-header"><h2>JSON Viewer Pro</h2><button id="json-viewer-pro-copy">Copy JSON</button></div><div class="json-viewer-pro-content"></div>';
  
  document.body.appendChild(formattedContainer);
  
  const content = formattedContainer.querySelector('.json-viewer-pro-content');
  content.appendChild(createTreeView(data));
  
  // Add copy functionality
  document.getElementById('json-viewer-pro-copy').addEventListener('click', function() {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    this.textContent = 'Copied!';
    setTimeout(() => this.textContent = 'Copy JSON', 2000);
  });
}

// Create collapsible tree view
function createTreeView(data, key = null) {
  const container = document.createElement('div');
  container.className = 'json-tree-node';
  
  if (data === null) {
    container.innerHTML = '<span class="json-null">null</span>';
    return container;
  }
  
  if (typeof data === 'boolean') {
    container.innerHTML = `<span class="json-boolean">${data}</span>`;
    return container;
  }
  
  if (typeof data === 'number') {
    container.innerHTML = `<span class="json-number">${data}</span>`;
    return container;
  }
  
  if (typeof data === 'string') {
    container.innerHTML = `<span class="json-string">"${data}"</span>`;
    return container;
  }
  
  if (Array.isArray(data)) {
    const wrapper = document.createElement('div');
    wrapper.className = 'json-array';
    
    const header = document.createElement('span');
    header.className = 'json-toggle';
    header.textContent = ' ';
    const bracket = document.createElement('span');
    bracket.textContent = '[';
    header.appendChild(bracket);
    wrapper.appendChild(header);
    
    const items = document.createElement('div');
    items.className = 'json-children';
    
    if (data.length === 0) {
      header.innerHTML = ' []';
    } else {
      data.forEach((item, index) => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'json-item';
        
        const indexSpan = document.createElement('span');
        indexSpan.className = 'json-index';
        indexSpan.textContent = `${index}: `;
        itemContainer.appendChild(indexSpan);
        
        itemContainer.appendChild(createTreeView(item));
        items.appendChild(itemContainer);
      });
      
      const closeBracket = document.createElement('div');
      closeBracket.textContent = ']';
      items.appendChild(closeBracket);
    }
    
    wrapper.appendChild(items);
    
    header.addEventListener('click', function() {
      this.classList.toggle('collapsed');
      items.style.display = this.classList.contains('collapsed') ? 'none' : 'block';
      this.textContent = this.classList.contains('collapsed') ? ' ' : ' ';
    });
    
    return wrapper;
  }
  
  if (typeof data === 'object') {
    const wrapper = document.createElement('div');
    wrapper.className = 'json-object';
    
    const keys = Object.keys(data);
    const header = document.createElement('span');
    header.className = 'json-toggle';
    
    if (keys.length === 0) {
      header.textContent = '{}';
      wrapper.appendChild(header);
    } else {
      header.textContent = ' {';
      wrapper.appendChild(header);
      
      const items = document.createElement('div');
      items.className = 'json-children';
      
      keys.forEach(key => {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'json-item';
        
        const keySpan = document.createElement('span');
        keySpan.className = 'json-key';
        keySpan.textContent = `"${key}": `;
        itemContainer.appendChild(keySpan);
        
        itemContainer.appendChild(createTreeView(data[key], key));
        items.appendChild(itemContainer);
      });
      
      const closeBracket = document.createElement('div');
      closeBracket.textContent = '}';
      items.appendChild(closeBracket);
      
      wrapper.appendChild(items);
    }
    
    header.addEventListener('click', function() {
      this.classList.toggle('collapsed');
      items.style.display = this.classList.contains('collapsed') ? 'none' : 'block';
      this.textContent = this.classList.contains('collapsed') ? ' {' : ' {';
    });
    
    return wrapper;
  }
  
  return container;
}

// Clear all formatting
function clearFormatting() {
  if (formattedContainer) {
    formattedContainer.remove();
    formattedContainer = null;
  }
}

// Add styles for the tree view
const style = document.createElement('style');
style.textContent = `
  #json-viewer-pro-container {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 500px;
    max-height: 80vh;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 999999;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 13px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .json-viewer-pro-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: #1a73e8;
    color: white;
  }
  
  .json-viewer-pro-header h2 {
    font-size: 16px;
    font-weight: 500;
  }
  
  .json-viewer-pro-header button {
    padding: 6px 12px;
    background: white;
    color: #1a73e8;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
  }
  
  .json-viewer-pro-content {
    padding: 16px;
    overflow-y: auto;
    max-height: calc(80vh - 50px);
  }
  
  .json-tree-node {
    margin-left: 20px;
  }
  
  .json-toggle {
    cursor: pointer;
    user-select: none;
    color: #5f6368;
  }
  
  .json-toggle:hover {
    color: #1a73e8;
  }
  
  .json-key {
    color: #881391;
  }
  
  .json-string {
    color: #0d652d;
  }
  
  .json-number {
    color: #1c00cf;
  }
  
  .json-boolean {
    color: #0d47a1;
  }
  
  .json-null {
    color: #808080;
  }
  
  .json-index {
    color: #660099;
  }
  
  .json-children {
    margin-left: 20px;
  }
  
  .collapsed + .json-children {
    display: none;
  }
`;
document.head.appendChild(style);

// Check if auto-format is enabled on page load
chrome.storage.local.get(['autoFormat'], function(result) {
  if (result.autoFormat) {
    formatPageJSON();
  }
});
```

This content script is comprehensive and handles multiple JSON detection methods. It creates a collapsible tree view with syntax highlighting and includes all necessary styles.

Testing Your Extension {#testing}

Now that we have created all the necessary files, let us test the extension. Open Chrome and navigate to chrome://extensions/. Enable Developer mode in the top right corner if it is not already enabled. Click the Load unpacked button and select your extension folder.

Once loaded, you should see the JSON Viewer Pro icon in your Chrome toolbar. Navigate to any page that contains JSON data, such as a JSON API endpoint or a page with code samples. Click the extension icon and try formatting the JSON.

If you encounter issues, right-click the extension icon and select Inspect popup to view console logs. Common issues include missing files, incorrect file paths in the manifest, or JavaScript errors in the content script.

Enhancing Your Extension {#enhancements}

Now that you have a working JSON viewer, consider adding these enhancements to make it even more useful:

First, dark mode support. Add a theme toggle that switches between light and dark color schemes for the JSON display. This is particularly useful for developers who work in dark-mode IDEs.

Second, JSON validation. Add error handling that displays helpful messages when invalid JSON is detected, explaining what might be wrong with the format.

Third, search functionality. Implement a search feature that highlights matching keys or values within the JSON tree, making it easier to navigate large documents.

Fourth, export options. Add buttons to download the formatted JSON as a file or export it to other formats.

Fifth, URL patterns. Modify the content script to only run on specific URLs where JSON is commonly found, improving performance on other pages.

Publishing Your Extension {#publishing}

Once you are satisfied with your extension, you can publish it to the Chrome Web Store. Create a zip file of your extension folder (excluding any development files). Sign in to the Chrome Web Store Developer Dashboard, add a new item, upload your zip file, and fill in the store listing details including name, description, and screenshots.

The publishing process includes a review period where Google checks for policy violations. Ensure your extension follows the Chrome Web Store policies, particularly around user data handling and functionality.

Conclusion {#conclusion}

You have successfully built a fully functional JSON viewer Chrome extension from scratch. This project covered essential Chrome extension development concepts including Manifest V3 configuration, popup development, content scripts, message passing between components, and dynamic DOM manipulation.

The extension you built includes automatic JSON detection, pretty printing with syntax highlighting, collapsible tree navigation, copy functionality, and styling that matches Chrome's native design language. These are the same fundamental skills you will use in virtually every Chrome extension project you undertake.

JSON viewer extensions remain one of the most popular categories in the Chrome Web Store, indicating strong ongoing demand. With the foundation you have built in this tutorial, you have everything you need to enhance this extension further or build other Chrome extensions for different use cases.

Remember that the best extensions solve real problems. As you continue developing, consider what problems you encounter in your daily development work and how you might build tools to address them. Chrome extension development is an incredibly accessible way to create software that impacts millions of users worldwide.
