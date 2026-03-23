---
layout: post
title: "Build a Custom Chrome DevTools Panel Extension: Complete Tutorial"
description: "Learn to build a custom Chrome DevTools panel extension from scratch. This tutorial covers panel creation, DevTools API integration, and publishing."
date: 2025-02-20
categories: [Chrome-Extensions, DevTools]
tags: [devtools, chrome-extension, tutorial]
keywords: "chrome devtools extension, devtools panel chrome extension, custom devtools tab, chrome developer tools extension, build devtools plugin"
canonical_url: "https://bestchromeextensions.com/2025/02/20/build-chrome-devtools-panel-extension/"
---

# Build a Custom Chrome DevTools Panel Extension: Complete Tutorial

Chrome DevTools is the most powerful browser-based development environment available today. It provides web developers with a comprehensive suite of debugging, profiling, and inspection tools. But did you know you can extend DevTools itself? By building a custom DevTools panel extension, you can add entirely new functionality to Chrome's developer toolkit, creating specialized tools tailored to your workflow or your users' needs.

In this complete tutorial, we will walk through building a custom Chrome DevTools panel extension from scratch. You will learn how to create a DevTools panel, communicate with the inspected page, leverage the Chrome Extensions API, and package your extension for distribution. By the end of this guide, you will have a fully functional DevTools panel extension that you can extend and customize further.

---

## Understanding Chrome DevTools Panel Extensions {#understanding-devtools-panels}

Before we dive into code, it is essential to understand what DevTools panel extensions are and how they differ from regular Chrome extensions.

### What Are DevTools Panel Extensions?

A DevTools panel extension is a special type of Chrome extension that adds a custom tab to the Chrome DevTools window. When users open DevTools (F12 or right-click and Inspect), they will see your custom panel alongside built-in tabs like Elements, Console, Network, and Performance.

DevTools panels can:

- Display custom UI built with HTML, CSS, and JavaScript
- Inspect and interact with the currently inspected page
- Access the DOM and JavaScript context of the inspected page
- Use Chrome Extension APIs to extend functionality beyond DevTools
- Communicate bidirectionally with content scripts and background scripts

### Use Cases for DevTools Panels

DevTools panel extensions are perfect for:

1. **Custom Debugging Tools**: Build specialized debugging interfaces for your framework or library
2. **Visual Inspectors**: Create visual property editors or component explorers
3. **Performance Profilers**: Add custom performance monitoring and analysis tools
4. **API Clients**: Build REST or GraphQL clients directly within DevTools
5. **State Viewers**: Display application state in a human-readable format
6. **Design Tools**: Add color pickers, measurement tools, or accessibility checkers

Popular examples include React DevTools, Vue DevTools, Angular Augury, and various API testing tools that integrate directly into the browser's development environment.

---

## Setting Up the Project Structure {#project-setup}

Let us start by setting up the project structure for our DevTools panel extension. We will create a well-organized project that follows Chrome extension best practices.

### Creating the Directory Structure

Create a new folder for your extension and set up the following structure:

```
devtools-panel-extension/
├── manifest.json
├── background.js
├── devtools/
│   ├── devtools.js
│   └── panel.html
├── content/
│   └── content.js
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── styles/
    └── panel.css
```

### The Manifest File

Every Chrome extension starts with a `manifest.json` file. For DevTools panel extensions, we need to declare the DevTools page and ensure proper permissions.

```json
{
  "manifest_version": 3,
  "name": "Custom DevTools Panel",
  "version": "1.0.0",
  "description": "A custom DevTools panel extension for web developers",
  "permissions": [
    "activeTab",
    "scripting"
  ],
  "devtools_page": "devtools/devtools.html",
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The key difference from regular extensions is the `"devtools_page"` field, which tells Chrome where to find your DevTools extension entry point.

---

## Creating the DevTools Page {#devtools-page}

The DevTools page (`devtools.html`) is a special page that Chrome loads when DevTools opens. It does not have a visible UI but is responsible for registering your custom panel.

### The DevTools HTML File

Create `devtools/devtools.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body>
  <script src="devtools.js"></script>
</body>
</html>
```

### Registering the Panel

Create `devtools/devtools.js`. This script runs in the context of the DevTools page and registers your custom panel:

```javascript
// Create the custom panel
chrome.devtools.panels.create(
  "My Custom Panel",           // Panel title
  "icons/icon16.png",         // Panel icon
  "devtools/panel.html",      // Panel HTML file
  function(panel) {
    // Panel callback - called when panel is created
    console.log("Custom panel created:", panel);
    
    // You can add event listeners here
    panel.onShown.addListener(function(panelWindow) {
      console.log("Panel shown:", panelWindow);
    });
    
    panel.onHidden.addListener(function() {
      console.log("Panel hidden");
    });
  }
);
```

The `chrome.devtools.panels.create()` method takes four parameters:
- **title**: The name displayed in the DevTools tab bar
- **icon**: A 16x16 icon shown next to the title
- **page**: The HTML file that contains your panel's UI
- **callback**: A function called with the panel object after creation

---

## Building the Panel UI {#panel-ui}

Now let us create the actual panel interface that users will see. Our panel will demonstrate several key capabilities: inspecting the DOM, executing scripts in the context of the inspected page, and displaying information in real-time.

### The Panel HTML

Create `devtools/devtools/panel.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="../../styles/panel.css">
</head>
<body>
  <div class="panel-container">
    <header class="panel-header">
      <h1>DevTools Panel</h1>
      <button id="refresh-btn" class="btn">Refresh Data</button>
    </header>
    
    <div class="panel-content">
      <section class="info-section">
        <h2>Page Information</h2>
        <div id="page-info" class="info-box">
          <p>Loading page information...</p>
        </div>
      </section>
      
      <section class="dom-section">
        <h2>DOM Inspector</h2>
        <div class="controls">
          <input type="text" id="selector-input" placeholder="Enter CSS selector">
          <button id="query-btn" class="btn">Query Element</button>
        </div>
        <div id="dom-result" class="result-box">
          <p>Results will appear here...</p>
        </div>
      </section>
      
      <section class="console-section">
        <h2>Execute Code</h2>
        <textarea id="code-input" placeholder="Enter JavaScript code to execute in page context"></textarea>
        <button id="execute-btn" class="btn">Execute</button>
        <div id="exec-result" class="result-box">
          <p>Execution results will appear here...</p>
        </div>
      </section>
    </div>
  </div>
  
  <script src="panel.js"></script>
</body>
</html>
```

### Styling the Panel

Create `styles/panel.css` to make our panel look professional:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  font-size: 13px;
  color: #333;
  background: #fff;
}

.panel-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.panel-header h1 {
  font-size: 16px;
  font-weight: 600;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

section {
  margin-bottom: 24px;
}

section h2 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #555;
}

.info-box, .result-box {
  background: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px;
  min-height: 60px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.controls input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 12px;
}

.controls input:focus {
  outline: none;
  border-color: #4285f4;
}

textarea {
  width: 100%;
  height: 80px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  resize: vertical;
  margin-bottom: 8px;
}

textarea:focus {
  outline: none;
  border-color: #4285f4;
}

.btn {
  padding: 6px 14px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.btn:hover {
  background: #3367d6;
}

.btn:active {
  background: #2a5bb8;
}

.error {
  color: #d32f2f;
}

.success {
  color: #388e3c;
}
```

---

## Implementing Panel Logic {#panel-logic}

The panel JavaScript handles user interactions and communicates with the inspected page. This is where the real functionality lives.

### The Panel JavaScript

Create `devtools/devtools/panel.js`:

```javascript
// Reference to the inspected page's window object
let inspectedWindow = null;

// Set up the panel when it is shown
chrome.devtools.panels.elements.createSidebarPane(
  "Element Properties",
  function(sidebar) {
    function updateSidebar() {
      chrome.devtools.inspectedWindow.eval(
        "window.getSelection().toString()",
        function(result, isException) {
          if (!isException && result) {
            sidebar.setExpression("(" + getElementProperties.toString() + ")('" + result + "')");
          }
        }
      );
    }
    
    chrome.devtools.panels.elements.onSelectionChanged.addListener(updateSidebar);
    updateSidebar();
  }
);

function getElementProperties(selection) {
  return "Selected: " + selection;
}

// Button event listeners
document.addEventListener('DOMContentLoaded', function() {
  
  // Refresh button
  document.getElementById('refresh-btn').addEventListener('click', function() {
    refreshPageInfo();
  });
  
  // Query element button
  document.getElementById('query-btn').addEventListener('click', function() {
    var selector = document.getElementById('selector-input').value;
    queryElement(selector);
  });
  
  // Execute code button
  document.getElementById('execute-btn').addEventListener('click', function() {
    var code = document.getElementById('code-input').value;
    executeCode(code);
  });
  
  // Initial load
  refreshPageInfo();
});

// Refresh page information from the inspected window
function refreshPageInfo() {
  var infoBox = document.getElementById('page-info');
  infoBox.innerHTML = '<p class="success">Loading...</p>';
  
  chrome.devtools.inspectedWindow.eval(
    '({' +
    '  title: document.title,' +
    '  url: window.location.href,' +
    '  readyState: document.readyState,' +
    '  elementsCount: document.getElementsByTagName("*").length,' +
    '  scriptsCount: document.scripts.length,' +
    '  imagesCount: document.images.length' +
    '})',
    function(result, isException) {
      if (isException) {
        infoBox.innerHTML = '<p class="error">Error: ' + isException.value + '</p>';
        return;
      }
      
      var info = result;
      infoBox.innerHTML = 
        '<p><strong>Title:</strong> ' + escapeHtml(info.title) + '</p>' +
        '<p><strong>URL:</strong> ' + escapeHtml(info.url) + '</p>' +
        '<p><strong>Ready State:</strong> ' + info.readyState + '</p>' +
        '<p><strong>Elements:</strong> ' + info.elementsCount + '</p>' +
        '<p><strong>Scripts:</strong> ' + info.scriptsCount + '</p>' +
        '<p><strong>Images:</strong> ' + info.imagesCount + '</p>';
    }
  );
}

// Query an element using CSS selector
function queryElement(selector) {
  var resultBox = document.getElementById('dom-result');
  
  if (!selector || selector.trim() === '') {
    resultBox.innerHTML = '<p class="error">Please enter a CSS selector</p>';
    return;
  }
  
  var expression = '(function() {' +
    '  var elements = document.querySelectorAll("' + selector.replace(/"/g, '\\"') + '");' +
    '  if (elements.length === 0) return { error: "No elements found" };' +
    '  var info = [];' +
    '  for (var i = 0; i < Math.min(elements.length, 10); i++) {' +
    '    var el = elements[i];' +
    '    info.push({' +
    '      tag: el.tagName.toLowerCase(),' +
    '      id: el.id || null,' +
    '      classes: el.className || null,' +
    '      text: el.textContent ? el.textContent.substring(0, 50) + "..." : null' +
    '    });' +
    '  }' +
    '  return { count: elements.length, elements: info };' +
    '})()';
  
  chrome.devtools.inspectedWindow.eval(expression, function(result, isException) {
    if (isException) {
      resultBox.innerHTML = '<p class="error">Error: ' + isException.value + '</p>';
      return;
    }
    
    if (result.error) {
      resultBox.innerHTML = '<p class="error">' + result.error + '</p>';
      return;
    }
    
    var html = '<p class="success">Found ' + result.count + ' element(s)</p>';
    
    if (result.elements && result.elements.length > 0) {
      html += '<ul style="margin-top: 8px; padding-left: 20px;">';
      result.elements.forEach(function(el) {
        var classes = el.classes ? '.' + el.classes.split(' ').join('.') : '';
        html += '<li>&lt;' + el.tag + (el.id ? '#' + el.id : '') + classes + '&gt;';
        if (el.text) {
          html += '<br><span style="color: #666;">' + escapeHtml(el.text) + '</span>';
        }
        html += '</li>';
      });
      html += '</ul>';
    }
    
    resultBox.innerHTML = html;
  });
}

// Execute code in the context of the inspected page
function executeCode(code) {
  var resultBox = document.getElementById('exec-result');
  
  if (!code || code.trim() === '') {
    resultBox.innerHTML = '<p class="error">Please enter some code to execute</p>';
    return;
  }
  
  chrome.devtools.inspectedWindow.eval(code, function(result, isException) {
    if (isException) {
      resultBox.innerHTML = '<p class="error">Error: ' + isException.value + '</p>';
      return;
    }
    
    var resultStr = '';
    try {
      resultStr = JSON.stringify(result, null, 2);
    } catch (e) {
      resultStr = String(result);
    }
    
    resultBox.innerHTML = '<p class="success">Result:</p><pre>' + escapeHtml(resultStr) + '</pre>';
  });
}

// Utility function to escape HTML
function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

---

## Working with the Inspected Window {#inspected-window}

One of the most powerful features of DevTools panel extensions is the ability to interact with the page being inspected. The `chrome.devtools.inspectedWindow` API provides this capability.

### Key Inspected Window Methods

The `chrome.devtools.inspectedWindow` API offers several important methods:

1. **`eval(expression, callback)`**: Executes JavaScript in the context of the inspected page
2. **`getResources(callback)`**: Retrieves a list of resources loaded by the page
3. **`reload()`**: Reloads the inspected page
4. **`captureScreenshot(callback)`**: Captures a screenshot of the inspected page

### Communication Patterns

There are several ways to communicate between your panel and the inspected page:

**Direct Evaluation**: Use `chrome.devtools.inspectedWindow.eval()` to run code directly in the page context:

```javascript
chrome.devtools.inspectedWindow.eval(
  "document.title",
  function(result, isException) {
    console.log("Page title:", result);
  }
);
```

**PostMessage Communication**: Set up message passing between the panel and content scripts:

```javascript
// In panel.js
chrome.devtools.inspectedWindow.postMessage(
  "myExtensionMessage",
  { data: "hello from panel" }
);

// In content.js
window.addEventListener("message", function(event) {
  if (event.data.source === "chrome-devtools-page") {
    console.log("Received from panel:", event.data);
  }
});
```

---

## Advanced Features {#advanced-features}

Now that we have covered the basics, let us explore some advanced features that can make your DevTools panel even more powerful.

### Creating a Sidebar Pane

Sidebar panes appear alongside the Elements panel and are perfect for displaying contextual information:

```javascript
chrome.devtools.panels.elements.createSidebarPane(
  "My Sidebar",
  function(sidebar) {
    // Set the sidebar content
    sidebar.setExpression("document.body.innerHTML.length");
    
    // Or set HTML content directly
    sidebar.setPage({ path: "sidebar.html" });
  }
);
```

### Accessing the Selection

You can track the user's selection in the Elements panel:

```javascript
chrome.devtools.panels.elements.onSelectionChanged.addListener(function() {
  chrome.devtools.inspectedWindow.eval(
    "$0", // $0 is the currently selected element
    function(selectedElement) {
      // Do something with the selected element
      console.log("Selected:", selectedElement);
    }
  );
});
```

### Adding a Theme

DevTools supports both light and dark themes. Your panel should adapt accordingly:

```javascript
// Detect the current theme
chrome.devtools.panels.getThemeName(function(themeName) {
  console.log("Current theme:", themeName); // "dark" or "light"
  
  if (themeName === "dark") {
    document.body.classList.add("dark-theme");
  }
});
```

---

## Testing Your Extension {#testing}

Testing is crucial to ensure your DevTools panel works correctly. Here is how to load and test your extension.

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension directory
4. Open a new tab and press F12 to open DevTools
5. Look for your custom panel in the DevTools tab bar

### Debugging Tips

Use the DevTools console to debug your panel:

```javascript
// In your panel.js
console.log("Panel loaded");

// Access the inspected window console
chrome.devtools.inspectedWindow.eval(
  "console.log('From panel to page')"
);
```

Check the background service worker console at `chrome://extensions/` by clicking "service worker" under your extension.

---

## Publishing Your Extension {#publishing}

Once your DevTools panel extension is working, you can publish it to the Chrome Web Store.

### Preparation

1. Create icon files in the `icons/` folder (16, 32, 48, and 128 pixels)
2. Test thoroughly across different pages and scenarios
3. Create a detailed description for the store listing
4. Prepare screenshots and a promotional image

### Publishing Steps

1. Zip your extension directory (excluding development files)
2. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
3. Create a new item and upload your zip file
4. Fill in the store listing details
5. Submit for review

---

## Conclusion {#conclusion}

Congratulations! You have successfully built a custom Chrome DevTools panel extension from scratch. Throughout this tutorial, we covered:

- The fundamentals of DevTools panel extensions and their architecture
- Setting up the project structure with proper manifest configuration
- Creating the DevTools page and registering your panel
- Building an interactive panel UI with HTML and CSS
- Implementing functionality to inspect and interact with the inspected page
- Advanced features like sidebar panes and theme detection
- Testing and debugging techniques
- Publishing your extension to the Chrome Web Store

DevTools panel extensions open up incredible possibilities for enhancing the development workflow. Whether you are building tools for your own use, your team, or distributing to millions of developers worldwide, the techniques you have learned here provide a solid foundation.

Continue experimenting with the Chrome Extensions APIs, explore the DevTools protocol, and consider what unique tools you can build to make web development even more productive and enjoyable.
