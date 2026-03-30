---
layout: post
title: "Build a Code Formatter Chrome Extension: Complete Developer's Guide"
description: "Learn how to build a code formatter Chrome extension from scratch. This comprehensive guide covers Prettier integration, code beautification, and publishing your extension to the Chrome Web Store."
date: 2025-01-26
last_modified_at: 2025-01-26
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, developer-tools]
keywords: "code formatter extension, prettier chrome extension, code beautifier, chrome extension code formatter, format code in browser"
canonical_url: "https://bestchromeextensions.com/2025/01/26/build-code-formatter-chrome-extension/"
---

Build a Code Formatter Chrome Extension: Complete Developer's Guide

Every developer knows the pain of working with poorly formatted code. Whether you are reviewing pull requests, browsing GitHub repositories, or debugging in the browser, inconsistent code formatting makes understanding code significantly harder. A code formatter extension for Chrome can solve this problem by instantly beautifying code directly in your browser. we will walk through building a production-ready code formatter Chrome extension using Prettier, the most popular code formatter in the JavaScript ecosystem.

This tutorial assumes you have basic knowledge of HTML, CSS, and JavaScript. By the end of this guide, you will have a fully functional code formatter extension that can format code in textareas, code editors, and web-based IDEs.

---

Why Build a Code Formatter Chrome Extension? {#why-build}

The demand for code formatting tools has never been higher. With the rise of remote collaboration and code review tools like GitHub, GitLab, and Bitbucket, developers constantly read code written by others. A browser-based code formatter offers several unique advantages over IDE-based formatters:

Instant Formatting Everywhere

Unlike IDE extensions that only work within specific editors, a Chrome extension works across all websites. You can format code in GitHub pull requests, Stack Overflow answers, CodePen demos, and any web-based code editor. This universal accessibility makes your extension valuable to a wide audience.

No Configuration Required

Setting up Prettier in each project can be time-consuming. A Chrome extension provides out-of-the-box formatting without requiring users to configure their development environment. This is especially valuable for quick code reviews or when working on unfamiliar projects.

Learning Opportunity

Building a code formatter extension teaches you valuable skills about Chrome extension architecture, content scripts, message passing, and integrating with popular JavaScript libraries. These skills transfer to other extension projects you might build.

---

Project Architecture {#architecture}

Before writing code, let us understand the architecture of our code formatter extension. We will use the modern Manifest V3 format, which is required for all new Chrome extensions.

Components Overview

Our extension will consist of several key components:

1. Manifest V3 Configuration - The `manifest.json` file that defines extension metadata and permissions
2. Popup Interface - A simple UI for selecting formatting options
3. Content Script - Injected JavaScript that detects and formats code on web pages
4. Prettier Integration - Bundled Prettier library for code formatting

Let us start building each component.

---

Setting Up the Project {#setup}

Create a new folder for your extension and set up the basic structure:

```bash
mkdir chrome-code-formatter
cd chrome-code-formatter
mkdir -p icons js css
```

The folder structure will look like this:

```
chrome-code-formatter/
 manifest.json
 popup.html
 popup.js
 popup.css
 content.js
 icons/
    icon16.png
    icon48.png
    icon128.png
 README.md
```

---

Creating the Manifest {#manifest}

The manifest.json file is the heart of every Chrome extension. For our code formatter, we need specific permissions to interact with web pages:

```json
{
  "manifest_version": 3,
  "name": "Code Formatter Pro",
  "version": "1.0.0",
  "description": "Format and beautify code in any website using Prettier",
  "permissions": [
    "activeTab",
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
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Key manifest fields explained:

- manifest_version: 3 - Uses the latest Chrome extension format
- permissions: We need `activeTab` to access the current tab and `scripting` to execute content scripts
- host_permissions: `<all_urls>` allows our extension to work on any website
- action: Defines the popup that appears when clicking the extension icon

---

Building the Popup Interface {#popup}

The popup is what users see when they click your extension icon. We will create a simple interface with language selection and formatting options:

popup.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Code Formatter</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>Code Formatter Pro</h1>
    
    <div class="options">
      <label for="language">Programming Language:</label>
      <select id="language">
        <option value="javascript">JavaScript</option>
        <option value="typescript">TypeScript</option>
        <option value="html">HTML</option>
        <option value="css">CSS</option>
        <option value="json">JSON</option>
        <option value="markdown">Markdown</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
      </select>
    </div>

    <div class="options">
      <label for="tabWidth">Tab Width:</label>
      <select id="tabWidth">
        <option value="2">2 spaces</option>
        <option value="4">4 spaces</option>
      </select>
    </div>

    <div class="options checkbox">
      <label>
        <input type="checkbox" id="semi" checked>
        Add semicolons (JS)
      </label>
    </div>

    <div class="options checkbox">
      <label>
        <input type="checkbox" id="singleQuote" checked>
        Single quotes (JS)
      </label>
    </div>

    <button id="formatBtn" class="primary-btn">Format Code</button>
    <button id="formatAllBtn" class="secondary-btn">Format All Code Blocks</button>
    
    <div id="status" class="status"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

popup.css

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  padding: 20px;
  background: #ffffff;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

h1 {
  font-size: 18px;
  color: #333;
  text-align: center;
  margin-bottom: 10px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.options.checkbox {
  flex-direction: row;
  align-items: center;
}

label {
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

select {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

select:focus {
  outline: none;
  border-color: #4a90d9;
}

input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

button {
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}

button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

.primary-btn {
  background: #4a90d9;
  color: white;
}

.primary-btn:hover {
  background: #3a7bc8;
}

.secondary-btn {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.secondary-btn:hover {
  background: #eeeeee;
}

.status {
  font-size: 12px;
  text-align: center;
  padding: 8px;
  border-radius: 4px;
  display: none;
}

.status.success {
  display: block;
  background: #d4edda;
  color: #155724;
}

.status.error {
  display: block;
  background: #f8d7da;
  color: #721c24;
}
```

popup.js

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const formatBtn = document.getElementById('formatBtn');
  const formatAllBtn = document.getElementById('formatAllBtn');
  const status = document.getElementById('status');

  function getOptions() {
    return {
      language: document.getElementById('language').value,
      tabWidth: parseInt(document.getElementById('tabWidth').value),
      semi: document.getElementById('semi').checked,
      singleQuote: document.getElementById('singleQuote').checked
    };
  }

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.className = 'status ' + (isError ? 'error' : 'success');
    setTimeout(() => {
      status.className = 'status';
    }, 3000);
  }

  formatBtn.addEventListener('click', async () => {
    const options = getOptions();
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'formatSelection',
        options: options
      });
      
      showStatus('Code formatted successfully!');
    } catch (error) {
      showStatus('No code selected or page not supported', true);
    }
  });

  formatAllBtn.addEventListener('click', async () => {
    const options = getOptions();
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const results = await chrome.tabs.sendMessage(tab.id, { 
        action: 'formatAllCode',
        options: options
      });
      
      if (results && results.count > 0) {
        showStatus(`Formatted ${results.count} code blocks!`);
      } else {
        showStatus('No code blocks found on this page', true);
      }
    } catch (error) {
      showStatus('Unable to format this page', true);
    }
  });
});
```

---

The Content Script {#content-script}

The content script is the core of our extension. It runs in the context of web pages and handles code detection and formatting. We will integrate Prettier via CDN to avoid bundling complexity:

```javascript
// content.js

// Prettier configurations for different languages
const PRETTIER_CONFIG = {
  javascript: { parser: 'babel' },
  typescript: { parser: 'typescript' },
  html: { parser: 'html' },
  css: { parser: 'css' },
  json: { parser: 'json' },
  markdown: { parser: 'markdown' },
  python: { parser: 'python' },
  java: { parser: 'java' }
};

// Load Prettier and its plugins
let prettier = null;
let prettierPlugins = [];

async function loadPrettier() {
  if (prettier) return prettier;

  // Load Prettier core
  prettier = await import('https://cdn.jsdelivr.net/npm/prettier@3.2.5/standalone.mjs');
  
  // Load necessary plugins
  const pluginBabel = await import('https://cdn.jsdelivr.net/npm/prettier@3.2.5/plugins/babel.mjs');
  const pluginEstree = await import('https://cdn.jsdelivr.net/npm/prettier@3.2.5/plugins/estree.mjs');
  const pluginHtml = await import('https://cdn.jsdelivr.net/npm/prettier@3.2.5/plugins/html.mjs');
  const pluginCss = await import('https://cdn.jsdelivr.net/npm/prettier@3.2.5/plugins/postcss.mjs');
  const pluginMarkdown = await import('https://cdn.jsdelivr.net/npm/prettier@3.2.5/plugins/markdown.mjs');
  const pluginPython = await import('https://cdn.jsdelivr.net/npm/prettier@3.2.5/plugins/python.mjs');
  const pluginJava = await import('https://cdn.jsdelivr.net/npm/prettier@3.2.5/plugins/java.mjs');

  prettierPlugins = [
    pluginBabel,
    pluginEstree,
    pluginHtml,
    pluginCss,
    pluginMarkdown,
    pluginPython,
    pluginJava
  ];

  return prettier;
}

function buildPrettierOptions(language, options) {
  const config = {
    plugins: prettierPlugins,
    ...PRETTIER_CONFIG[language]
  };

  if (language === 'javascript' || language === 'typescript') {
    config.semi = options.semi;
    config.singleQuote = options.singleQuote;
    config.parser = language === 'typescript' ? 'typescript' : 'babel';
  }

  config.tabWidth = options.tabWidth;

  return config;
}

async function formatCode(code, options) {
  await loadPrettier();
  
  try {
    const formatted = await prettier.format(code, buildPrettierOptions(options.language, options));
    return formatted;
  } catch (error) {
    console.error('Prettier formatting error:', error);
    return code;
  }
}

// Find code elements on the page
function findCodeElements() {
  const selectors = [
    'pre code',
    'pre',
    'textarea.code',
    '[data-code]',
    '.highlight pre',
    '.codehilite pre',
    'code[class*="language-"]'
  ];

  const elements = [];
  for (const selector of selectors) {
    const found = document.querySelectorAll(selector);
    found.forEach(el => {
      if (!elements.includes(el)) {
        elements.push(el);
      }
    });
  }

  return elements;
}

// Format a single code element
async function formatCodeElement(element, options) {
  const originalCode = element.textContent;
  const formattedCode = await formatCode(originalCode, options);
  
  if (formattedCode !== originalCode) {
    element.textContent = formattedCode;
    return true;
  }
  return false;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'formatSelection') {
    handleSelectionFormatting(message.options).then(sendResponse);
    return true;
  }

  if (message.action === 'formatAllCode') {
    handleAllCodeFormatting(message.options).then(result => {
      sendResponse(result);
    });
    return true;
  }
});

async function handleSelectionFormatting(options) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return { success: false };

  const range = selection.getRangeAt(0);
  const selectedText = range.toString();

  if (!selectedText.trim()) {
    return { success: false, message: 'No text selected' };
  }

  const formattedText = await formatCode(selectedText, options);

  // Replace selected text
  range.deleteContents();
  range.insertNode(document.createTextNode(formattedText));
  
  return { success: true };
}

async function handleAllCodeFormatting(options) {
  const codeElements = findCodeElements();
  let formattedCount = 0;

  for (const element of codeElements) {
    const formatted = await formatCodeElement(element, options);
    if (formatted) formattedCount++;
  }

  return { count: formattedCount };
}

// Initialize: add formatting buttons to code blocks
function initializeFormattingButtons() {
  const codeElements = findCodeElements();
  
  codeElements.forEach(element => {
    if (element.dataset.formatButtonAdded) return;
    element.dataset.formatButtonAdded = 'true';
    
    // Make code elements editable for easy formatting
    element.contentEditable = 'true';
    element.dataset.originalText = element.textContent;
  });
}

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFormattingButtons);
} else {
  initializeFormattingButtons();
}

// Observe DOM changes to handle dynamic content
const observer = new MutationObserver((mutations) => {
  initializeFormattingButtons();
});

observer.observe(document.body, { 
  childList: true, 
  subtree: true 
});
```

---

Testing Your Extension {#testing}

Now that we have built all the components, let us test the extension:

1. Create icon files: You will need three PNG icon files (16x16, 48x48, and 128x128 pixels). You can create simple placeholder icons or download free icons from a resource like [IconFinder](https://www.iconfinder.com).

2. Open Chrome Extensions: Navigate to `chrome://extensions/` in your browser.

3. Enable Developer Mode: Toggle the "Developer mode" switch in the top-right corner.

4. Load Unpacked: Click "Load unpacked" and select your extension folder.

5. Test the Extension: Visit any website with code (like GitHub or Stack Overflow) and click your extension icon to test formatting.

---

Improving the Extension {#improvements}

There are several ways to enhance your code formatter extension:

Add Keyboard Shortcuts

You can add Chrome commands to allow keyboard-driven formatting:

```json
"commands": {
  "format-code": {
    "suggested_key": {
      "default": "Ctrl+Shift+F",
      "mac": "Command+Shift+F"
    },
    "description": "Format selected code"
  }
}
```

Support More Languages

Prettier supports many more languages. Add support for Go, Rust, PHP, and others by loading the appropriate plugins.

Add Copy to Clipboard

Implement a copy-to-clipboard feature that automatically copies formatted code after formatting.

Store User Preferences

Use Chrome's storage API to remember user preferences:

```javascript
chrome.storage.sync.set({ 
  language: 'javascript',
  tabWidth: 2 
});
```

---

Publishing to Chrome Web Store {#publishing}

Once your extension is working, follow these steps to publish:

1. Prepare your extension: Run through the [Chrome extension quality guidelines](https://developer.chrome.com/docs/webstore/program-policies/quality-guidelines/)

2. Create a developer account: Sign up at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

3. Zip your extension: Package your extension as a ZIP file (do not include the .git folder)

4. Upload and publish: Upload your ZIP file, fill in the store listing details, and submit for review

---

Conclusion {#conclusion}

You have now built a fully functional code formatter Chrome extension! This extension demonstrates several important concepts in Chrome extension development:

- Manifest V3 architecture for modern extension design
- Content scripts for interacting with web page content
- Message passing between popup and content scripts
- Prettier integration for professional-grade code formatting
- User interface design with options and controls

The code formatter extension you built can be extended in many ways. Consider adding support for more programming languages, implementing code syntax highlighting, or integrating with popular code hosting platforms. The skills you have learned in this tutorial provide a solid foundation for building more complex Chrome extensions.

Remember to test thoroughly across different websites and browsers before publishing to ensure the best user experience. Good luck with your Chrome extension development journey!

---

Additional Resources {#resources}

- [Prettier Documentation](https://prettier.io/docs/en/)
- [Chrome Extension Development Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Web Store Publishing Guide](https://developer.chrome.com/docs/webstore/publish/)
