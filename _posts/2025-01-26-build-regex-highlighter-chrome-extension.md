---
layout: post
title: "Build a Regex Highlighter Chrome Extension"
description: "Learn how to create a powerful regex highlighter extension for Chrome. This comprehensive developer guide covers pattern matching, text highlighting, regex helper tools, and building production-ready Chrome extensions with Manifest V3."
date: 2025-01-26
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, developer-tools]
keywords: "regex highlighter extension, pattern matcher chrome, regex helper, chrome regex tool, regex pattern matcher, text highlighter chrome extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/26/build-regex-highlighter-chrome-extension/"
---

# Build a Regex Highlighter Chrome Extension

Regular expressions are one of the most powerful tools in a developer's toolkit. Whether you are validating input, parsing logs, searching through code, or extracting data, regex patterns provide unmatched flexibility. However, working with complex regex patterns can be challenging without visual feedback. A regex highlighter extension for Chrome can transform this process, giving developers instant visual confirmation of pattern matches across any webpage. This comprehensive guide will walk you through building a complete regex highlighter Chrome extension from scratch using Manifest V3.

In this tutorial, you will learn how to create a Chrome extension that allows users to input regex patterns, apply them to any webpage text, and visually highlight all matches in real-time. This project will cover essential Chrome extension concepts including content scripts, popup interfaces, message passing, and storage APIs. By the end of this guide, you will have a fully functional regex helper tool that you can use daily and extend with additional features.

---

## Understanding Regex Highlighter Extensions {#understanding-regex-highlighters}

### Why Build a Regex Highlighter?

A regex highlighter extension serves multiple purposes for developers and non-developers alike. For developers, it provides immediate visual feedback when crafting and testing regular expressions. Instead of switching between a regex testing website and your code, you can test patterns directly in the context where they will be used. This is particularly valuable when working with complex HTML documents, log files, or data extraction tasks.

Beyond development work, regex highlighters are invaluable for content editors, data analysts, and anyone who works with structured text. A marketing team member might use pattern matching to find email addresses across a webpage for outreach. A data analyst might identify phone numbers, dates, or currency amounts scattered through document archives. The applications are virtually limitless, making this a versatile tool for any Chrome user.

### How Regex Highlighter Extensions Work

At its core, a regex highlighter extension works by injecting JavaScript into web pages that scans text content against a user-defined pattern. When matches are found, the extension wraps them in styled HTML elements that create the visual highlight effect. This process involves several key components working together seamlessly.

The extension's popup provides the user interface where users input their regex patterns and configure highlight options. The content script runs on each webpage, performing the actual text scanning and highlighting. The background script, while not strictly necessary for this basic implementation, can handle extension lifecycle events and coordinate between different parts of the extension. Together, these components create a cohesive user experience that feels like a native feature of the browser.

---

## Project Setup and Manifest Configuration {#project-setup}

Every Chrome extension begins with the manifest file, and our regex highlighter is no exception. Let us set up a proper Manifest V3 configuration that defines the extension's capabilities and permissions.

### Creating the Manifest

Create a new directory for your project and add the following manifest.json file:

```json
{
  "manifest_version": 3,
  "name": "Regex Highlighter",
  "version": "1.0",
  "description": "Highlight regex patterns on any webpage with customizable colors and styling",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
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

This manifest defines several important elements. The permissions array specifies what the extension can access. We include "activeTab" to work with the current tab, "storage" to save user preferences and recent patterns, and "scripting" to execute content scripts that perform the highlighting. The action section defines our popup, which is the interface users will interact with.

### Creating Icon Assets

Every extension needs icons to represent it in the Chrome toolbar and extension management pages. For development purposes, you can create simple placeholder icons or use the following approach to generate basic icons programmatically. Create an icons directory and add three PNG files: icon16.png (16x16 pixels), icon48.png (48x48 pixels), and icon128.png (128x128 pixels). These can be simple colored squares or more elaborate designs representing pattern matching.

---

## Building the Popup Interface {#popup-interface}

The popup is the user-facing part of our extension where users input their regex patterns and control the highlighting behavior. Let us create a clean, functional interface.

### HTML Structure

Create popup.html with the following structure:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Regex Highlighter</title>
  <style>
    body {
      width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      background: #ffffff;
      color: #333;
    }
    
    h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #1a73e8;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 6px;
      color: #555;
    }
    
    input[type="text"], 
    input[type="number"] {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      box-sizing: border-box;
    }
    
    input[type="text"]:focus,
    input[type="number"]:focus {
      outline: none;
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
    }
    
    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .checkbox-group input {
      width: 16px;
      height: 16px;
    }
    
    .checkbox-group label {
      margin: 0;
      font-weight: 400;
    }
    
    .color-picker {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .color-option {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .color-option input[type="color"] {
      width: 32px;
      height: 32px;
      padding: 0;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .buttons {
      display: flex;
      gap: 8px;
    }
    
    button {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .btn-primary {
      background: #1a73e8;
      color: white;
    }
    
    .btn-primary:hover {
      background: #1557b0;
    }
    
    .btn-secondary {
      background: #f1f3f4;
      color: #333;
    }
    
    .btn-secondary:hover {
      background: #e8eaed;
    }
    
    .btn-danger {
      background: #fce8e6;
      color: #c5221f;
    }
    
    .btn-danger:hover {
      background: #fad2cf;
    }
    
    .status {
      margin-top: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      display: none;
    }
    
    .status.success {
      display: block;
      background: #e6f4ea;
      color: #1e8e3e;
    }
    
    .status.error {
      display: block;
      background: #fce8e6;
      color: #c5221f;
    }
    
    .flags {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .flag-option {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .flag-option input {
      width: 14px;
      height: 14px;
    }
    
    .flag-option label {
      font-size: 12px;
      margin: 0;
      font-weight: 400;
    }
    
    .recent-patterns {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;
    }
    
    .recent-patterns h3 {
      font-size: 12px;
      color: #666;
      margin: 0 0 8px 0;
    }
    
    .pattern-tag {
      display: inline-block;
      padding: 4px 8px;
      background: #f1f3f4;
      border-radius: 4px;
      font-size: 11px;
      margin: 2px;
      cursor: pointer;
    }
    
    .pattern-tag:hover {
      background: #e8eaed;
    }
  </style>
</head>
<body>
  <h2>Regex Highlighter</h2>
  
  <div class="form-group">
    <label for="regexPattern">Regular Expression</label>
    <input type="text" id="regexPattern" placeholder="e.g., \b\w+@\w+\.\w+\b">
  </div>
  
  <div class="flags">
    <div class="flag-option">
      <input type="checkbox" id="flagG" checked>
      <label for="flagG">Global (g)</label>
    </div>
    <div class="flag-option">
      <input type="checkbox" id="flagI">
      <label for="flagI">Case Insensitive (i)</label>
    </div>
    <div class="flag-option">
      <input type="checkbox" id="flagM">
      <label for="flagM">Multiline (m)</label>
    </div>
  </div>
  
  <div class="form-group">
    <label>Highlight Color</label>
    <div class="color-picker">
      <div class="color-option">
        <input type="color" id="highlightColor" value="#ffeb3b">
        <span>Yellow</span>
      </div>
    </div>
  </div>
  
  <div class="checkbox-group">
    <input type="checkbox" id="caseSensitive" checked>
    <label for="caseSensitive">Case Sensitive Matching</label>
  </div>
  
  <div class="buttons">
    <button id="highlightBtn" class="btn-primary">Highlight</button>
    <button id="clearBtn" class="btn-danger">Clear</button>
  </div>
  
  <div id="status" class="status"></div>
  
  <div class="recent-patterns" id="recentPatterns" style="display: none;">
    <h3>Recent Patterns</h3>
    <div id="patternList"></div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

This popup interface provides all the controls users need to work with regex patterns effectively. The main input field accepts regex patterns, while checkboxes allow configuration of flags like global matching and case sensitivity. The color picker lets users choose their preferred highlight color, and recent patterns are stored for quick access.

---

## Implementing Popup Logic {#popup-logic}

Now let us create the JavaScript that handles user interactions in the popup. This script will validate regex patterns, communicate with content scripts, and manage user preferences.

### Popup JavaScript

Create popup.js with the following implementation:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const regexInput = document.getElementById('regexPattern');
  const highlightBtn = document.getElementById('highlightBtn');
  const clearBtn = document.getElementById('clearBtn');
  const statusDiv = document.getElementById('status');
  const flagG = document.getElementById('flagG');
  const flagI = document.getElementById('flagI');
  const flagM = document.getElementById('flagM');
  const highlightColor = document.getElementById('highlightColor');
  const recentPatternsDiv = document.getElementById('recentPatterns');
  const patternList = document.getElementById('patternList');
  
  // Load saved preferences
  loadPreferences();
  
  // Load recent patterns
  loadRecentPatterns();
  
  // Highlight button click handler
  highlightBtn.addEventListener('click', async () => {
    const pattern = regexInput.value.trim();
    
    if (!pattern) {
      showStatus('Please enter a regex pattern', 'error');
      return;
    }
    
    // Build flags string
    let flags = '';
    if (flagG.checked) flags += 'g';
    if (flagI.checked) flags += 'i';
    if (flagM.checked) flags += 'm';
    
    try {
      // Validate the regex
      new RegExp(pattern, flags);
      
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, {
        action: 'highlight',
        pattern: pattern,
        flags: flags,
        color: highlightColor.value
      });
      
      // Save to recent patterns
      saveRecentPattern(pattern);
      
      showStatus(`Highlighted matches on the page`, 'success');
    } catch (error) {
      showStatus(`Invalid regex: ${error.message}`, 'error');
    }
  });
  
  // Clear button click handler
  clearBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'clear'
      });
      
      showStatus('Cleared all highlights', 'success');
    } catch (error) {
      showStatus('No highlights to clear', 'error');
    }
  });
  
  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
  
  // Load saved preferences
  async function loadPreferences() {
    try {
      const result = await chrome.storage.local.get(['lastPattern', 'lastColor', 'lastFlags']);
      
      if (result.lastPattern) {
        regexInput.value = result.lastPattern;
      }
      
      if (result.lastColor) {
        highlightColor.value = result.lastColor;
      }
      
      if (result.lastFlags) {
        flagG.checked = result.lastFlags.includes('g');
        flagI.checked = result.lastFlags.includes('i');
        flagM.checked = result.lastFlags.includes('m');
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }
  
  // Save recent pattern
  async function saveRecentPattern(pattern) {
    try {
      // Save current preferences
      await chrome.storage.local.set({
        lastPattern: pattern,
        lastColor: highlightColor.value,
        lastFlags: (flagG.checked ? 'g' : '') + 
                   (flagI.checked ? 'i' : '') + 
                   (flagM.checked ? 'm' : '')
      });
      
      // Update recent patterns
      let recent = await chrome.storage.local.get(['recentPatterns']);
      recent = recent.recentPatterns || [];
      
      // Add to front if not already there
      if (!recent.includes(pattern)) {
        recent.unshift(pattern);
        // Keep only last 10
        recent = recent.slice(0, 10);
        await chrome.storage.local.set({ recentPatterns: recent });
        loadRecentPatterns();
      }
    } catch (error) {
      console.error('Error saving pattern:', error);
    }
  }
  
  // Load recent patterns
  async function loadRecentPatterns() {
    try {
      const result = await chrome.storage.local.get(['recentPatterns']);
      const recent = result.recentPatterns || [];
      
      if (recent.length > 0) {
        recentPatternsDiv.style.display = 'block';
        patternList.innerHTML = recent.map(p => 
          `<span class="pattern-tag" data-pattern="${p}">${escapeHtml(p)}</span>`
        ).join('');
        
        // Add click handlers
        patternList.querySelectorAll('.pattern-tag').forEach(tag => {
          tag.addEventListener('click', () => {
            regexInput.value = tag.dataset.pattern;
          });
        });
      }
    } catch (error) {
      console.error('Error loading recent patterns:', error);
    }
  }
  
  // Escape HTML for display
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
```

This popup script handles all user interactions and communicates with the content script that runs on the webpage. It validates regex patterns before sending them, stores user preferences using the Chrome storage API, and maintains a history of recent patterns for quick access. The error handling ensures that invalid regex patterns are caught before they are sent to the content script, providing a smooth user experience.

---

## Creating the Content Script {#content-script}

The content script is the heart of our extension. It runs on every webpage and performs the actual text scanning and highlighting. This script receives messages from the popup and manipulates the DOM to create visual highlights.

### Content Script Implementation

Create a file named content.js in your project directory:

```javascript
// Store for highlight elements
let highlightElements = [];

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlight') {
    try {
      clearHighlights();
      applyHighlights(message.pattern, message.flags, message.color);
      sendResponse({ success: true, count: highlightElements.length });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  } else if (message.action === 'clear') {
    clearHighlights();
    sendResponse({ success: true });
  }
  return true;
});

// Apply highlights to the page
function applyHighlights(pattern, flags, color) {
  // Create regex with provided flags
  const regex = new RegExp(pattern, flags);
  
  // Walk through all text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  
  while (node = walker.nextNode()) {
    // Skip script, style, and other non-content elements
    const parent = node.parentElement;
    if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT'].includes(parent.tagName)) {
      // Only process nodes with potential matches
      if (regex.test(node.textContent)) {
        textNodes.push(node);
      }
      // Reset regex lastIndex
      regex.lastIndex = 0;
    }
  }
  
  // Process each text node
  textNodes.forEach(textNode => {
    highlightTextNode(textNode, regex, color);
  });
}

// Highlight matches in a single text node
function highlightTextNode(textNode, regex, color) {
  const text = textNode.textContent;
  const parent = textNode.parentNode;
  
  // Reset regex
  regex.lastIndex = 0;
  
  let lastIndex = 0;
  let match;
  const fragments = [];
  
  // Find all matches
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      fragments.push(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    
    // Create highlight span
    const span = document.createElement('span');
    span.className = 'regex-highlight';
    span.textContent = match[0];
    span.style.cssText = `
      background-color: ${color};
      border-radius: 2px;
      padding: 0 2px;
      font-weight: inherit;
    `;
    fragments.push(span);
    highlightElements.push(span);
    
    lastIndex = regex.lastIndex;
    
    // Prevent infinite loop for zero-length matches
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    fragments.push(document.createTextNode(text.slice(lastIndex)));
  }
  
  // Replace the original text node with fragments
  if (fragments.length > 0) {
    const wrapper = document.createDocumentFragment();
    fragments.forEach(f => wrapper.appendChild(f));
    parent.replaceChild(wrapper, textNode);
  }
}

// Clear all highlights
function clearHighlights() {
  highlightElements.forEach(element => {
    if (element.parentNode) {
      const text = document.createTextNode(element.textContent);
      element.parentNode.replaceChild(text, element);
    }
  });
  highlightElements = [];
}
```

This content script uses the TreeWalker API to efficiently traverse all text nodes in the document. It skips non-content elements like scripts and styles to avoid breaking page functionality. When matches are found, it creates styled span elements that visually highlight the matching text. The script also maintains a reference to all highlight elements so they can be cleared when needed.

---

## Testing Your Extension {#testing}

Now that we have created all the necessary files, let us test our regex highlighter extension. Follow these steps to load it into Chrome and verify it works correctly.

### Loading the Extension in Chrome

Open Chrome and navigate to chrome://extensions/. Enable Developer mode using the toggle in the top right corner. Click the Load unpacked button and select your project directory. The extension should appear in your extension list with the name "Regex Highlighter."

Once loaded, navigate to any webpage with text content. Click the extension icon in the Chrome toolbar to open the popup. Enter a regex pattern such as `\b\w+@\w+\.\w+\b` to match email addresses, or `\d{3}-\d{3}-\d{4}` to match phone numbers in common formats. Click the Highlight button to see all matches highlighted on the page.

Try different patterns and flags to explore the extension's capabilities. The case insensitive flag is useful for matching text regardless of capitalization. The multiline flag changes how ^ and $ anchors work, treating line breaks as delimiters. The global flag ensures all matches are highlighted, not just the first one.

### Debugging Common Issues

If the extension does not work as expected, open the Chrome DevTools for the page you are testing. Check the console for any error messages that might indicate issues with the content script. Common problems include invalid regex patterns, which are caught and displayed in the popup status message.

Another common issue is highlighting not appearing on dynamically loaded content. Our current implementation only processes the page when the Highlight button is clicked. For pages that load content asynchronously, you might need to add a MutationObserver to detect new content and reapply highlights automatically.

---

## Advanced Features and Improvements {#advanced-features}

Now that you have a working regex highlighter, consider adding these advanced features to make it even more powerful and useful.

### Real-Time Highlighting

Instead of clicking the Highlight button, you could implement real-time highlighting that updates as users type their regex patterns. This would require debouncing the input to avoid excessive processing and could provide immediate feedback about pattern validity and match count.

### Match Navigation

Add buttons to navigate between matches, similar to the find functionality built into browsers. This would involve tracking all match positions and providing next/previous buttons in the popup to scroll the page to each match sequentially.

### Multiple Pattern Support

Allow users to define multiple regex patterns simultaneously, each with its own color. This is useful for comparing different patterns or highlighting different types of content in distinct colors.

### Export Functionality

Add the ability to export highlighted content or matched text to a file. This could be valuable for data extraction tasks where users want to capture all matches for further processing.

### Keyboard Shortcuts

Implement keyboard shortcuts to quickly activate the extension and toggle highlighting. Chrome supports commands in the manifest that can bind specific key combinations to extension actions.

---

## Conclusion {#conclusion}

You have successfully built a fully functional regex highlighter Chrome extension. This project demonstrates several important concepts in Chrome extension development, including content scripts for page manipulation, popup interfaces for user interaction, message passing between extension components, and the storage API for persisting user preferences.

The extension you created is practical and immediately useful for developers and non-developers alike. It provides visual feedback for regex patterns directly in the context where they will be used, eliminating the need to switch between separate testing tools and actual work contexts.

As you continue developing Chrome extensions, remember that Manifest V3 has specific requirements around background scripts, permissions, and content script execution. Our regex highlighter follows these best practices and provides a solid foundation for more complex extensions.

Consider expanding this project with the advanced features outlined above, or use it as a starting point for other Chrome extension ideas. The skills you have learned here—working with content scripts, building popup interfaces, handling user input, and managing extension state—transfer directly to any Chrome extension project you undertake in the future.
