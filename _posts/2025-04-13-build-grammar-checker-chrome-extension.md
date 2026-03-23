---
layout: post
title: "Build a Grammar Checker Chrome Extension: AI-Powered Writing Assistant"
description: "Learn to build an AI-powered grammar checker Chrome extension with spell check, style improvements, and writing suggestions. Complete Manifest V3 tutorial."
date: 2025-04-13
categories: [Chrome-Extensions, AI]
tags: [grammar, writing, chrome-extension]
keywords: "chrome extension grammar checker, build grammar extension, writing assistant chrome, spell check chrome extension, chrome extension grammarly clone"
canonical_url: "https://bestchromeextensions.com/2025/04/13/build-grammar-checker-chrome-extension/"
---

# Build a Grammar Checker Chrome Extension: AI-Powered Writing Assistant

In an era where written communication dominates both professional and personal spheres, having a reliable grammar checker Chrome extension has become essential for millions of users worldwide. Whether you are drafting emails, writing blog posts, crafting social media content, or filling out online forms, the ability to produce polished, error-free text significantly impacts how you are perceived by others. This comprehensive guide will walk you through the process of building a fully functional AI-powered grammar checker Chrome extension that can rival commercial solutions like Grammarly, all while learning valuable skills in Chrome extension development, natural language processing, and modern web development techniques.

The demand for writing assistant chrome extensions has exploded in recent years, driven by the increasing importance of digital communication and the rise of remote work. People who once relied on traditional word processors now spend most of their writing time in web browsers, making browser-based grammar checking solutions more relevant than ever. By building your own grammar checker extension, you not only create a useful tool for yourself but also gain the skills to potentially monetize your creation or build more sophisticated AI-powered extensions in the future.

This tutorial assumes you have basic familiarity with JavaScript, HTML, and CSS, though we will explain every concept in detail to ensure even intermediate developers can follow along successfully. We will use Manifest V3, the latest Chrome extension framework, to ensure your extension meets modern security standards and provides optimal performance. Throughout this guide, you will learn how to integrate AI-powered grammar checking, implement real-time spell checking, create an intuitive user interface, and publish your extension to the Chrome Web Store.

---

Why Build an AI-Powered Grammar Checker Extension {#why-build-grammar-checker}

The decision to build a grammar checker Chrome extension offers numerous benefits that extend beyond simply having a useful tool at your disposal. Understanding these benefits will help you stay motivated throughout the development process and inspire ideas for additional features that could make your extension stand out from existing solutions.

The Growing Market for Writing Assistant Extensions

The writing assistant chrome extension market has experienced tremendous growth, with millions of users actively seeking tools that can help improve their written communication. This popularity creates opportunities for developers who can deliver high-quality, reliable grammar checking solutions. Unlike basic spell checkers built into browsers, dedicated grammar checker extensions offer more sophisticated analysis that goes beyond simple dictionary lookups to understand context, style, and tone.

Building a spell check chrome extension also provides excellent learning opportunities. You will work with complex concepts including text analysis algorithms, browser extension architecture, user interface design, and AI integration. These skills are highly transferable and valuable in many other development contexts. Additionally, the project allows you to explore natural language processing without requiring extensive prior experience in the field, as there are many libraries and APIs available that simplify the technical complexity.

Competitive Advantage Through AI Integration

Traditional rule-based grammar checkers have significant limitations because they cannot understand context or adapt to individual writing styles. By incorporating AI and machine learning into your extension, you can provide suggestions that feel more natural and accurate. Modern AI models can understand nuance, detect awkward phrasing, and even suggest improvements for clarity and readability that rule-based systems would completely miss.

A grammar checker chrome extension with AI capabilities can learn from user behavior over time, offering personalized suggestions based on writing patterns and preferences. This personalization creates a more compelling user experience and demonstrates the power of AI in practical applications. Furthermore, AI integration allows your extension to handle complex grammatical constructions that would require thousands of explicit rules in traditional systems.

---

Project Architecture and Core Components {#project-architecture}

Before writing any code, it is crucial to understand the architecture of a Chrome extension and how the various components work together to create a smooth user experience. A well-planned architecture will make development smoother and your extension more maintainable over time.

Chrome Extension Architecture Overview

Chrome extensions consist of several interconnected components that each serve specific purposes within the application. Understanding these components and their interactions is essential for building a grammar checker extension that functions correctly and provides a good user experience. The main components include the manifest file, background scripts, content scripts, popup interface, and optional side panel.

The manifest.json file serves as the configuration center for your extension, declaring permissions, defining the extension's capabilities, and specifying which files Chrome should load. For a grammar checker extension, you will need permissions to access the active tab, execute scripts on web pages, and potentially communicate with external APIs for advanced grammar checking. Background scripts run in the background and handle tasks that do not require immediate user interaction, such as managing extension state or processing data from external services.

Content scripts are injected directly into web pages and are responsible for detecting text input, analyzing content, and displaying grammar suggestions to users. This is where the core grammar checking logic lives. The popup interface appears when users click your extension icon and provides a convenient way to access grammar checking features, view statistics, and adjust settings. With Manifest V3, you also have the option to implement a side panel that stays visible alongside the web page content.

Choosing Your Grammar Checking Approach

One of the most important architectural decisions you will make is choosing how to implement grammar checking functionality. There are three primary approaches, each with distinct advantages and trade-offs that you should consider carefully before starting development.

The first approach uses client-side libraries like LanguageTool, Compromise, or Nspell directly in your content script. This method offers privacy benefits since text never leaves the user's browser, works offline after initial library loading, and has no API costs. However, client-side libraries may not be as accurate as API-based solutions and can impact extension performance on slower devices.

The second approach integrates with external grammar checking APIs such as LanguageTool API, Grammarly's hidden API, or custom AI models hosted on services like OpenAI. This method provides more sophisticated analysis, better accuracy, and access to advanced features but requires internet connectivity and may involve usage costs or rate limits.

The third approach combines both methods, using client-side libraries for quick local checks while sending more complex queries to external APIs when needed. This hybrid architecture provides the best user experience by balancing speed, accuracy, and functionality. For this tutorial, we will implement a hybrid approach using LanguageTool's free API alongside local spell checking for an optimal balance of features and performance.

---

Step-by-Step Implementation Guide {#implementation-guide}

Now that you understand the architecture, let us dive into the actual implementation. This section provides detailed code examples and explanations for building each component of your grammar checker extension. We will start with the manifest file and work through each component systematically.

Creating the Manifest V3 Configuration

The manifest.json file defines your extension and tells Chrome how it should behave. For our AI-powered grammar checker, we need to specify appropriate permissions and declare the extension's components. Create a new folder for your project and add the following manifest.json file:

```json
{
  "manifest_version": 3,
  "name": "AI Grammar Checker - Writing Assistant",
  "version": "1.0.0",
  "description": "AI-powered grammar checker and writing assistant with spell check, style improvements, and real-time suggestions.",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "*://*/*"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "side_panel": {
    "default_path": "sidepanel/sidepanel.html"
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest configuration grants the necessary permissions for your grammar checker to function. The activeTab permission allows the extension to access the currently active tab for analysis. The scripting permission enables content script injection, while storage lets you save user preferences. The host_permissions field allows communication with external grammar checking APIs. The side_panel configuration enables the writing assistant panel that stays visible alongside web content.

Building the Content Script for Text Analysis

The content script is the heart of your grammar checker extension, responsible for detecting text input, communicating with the grammar checking service, and displaying suggestions to users. Create the content/content.js file with the following implementation:

```javascript
// Content script for grammar checking functionality
class GrammarChecker {
  constructor() {
    this.apiEndpoint = 'https://api.languagetool.org/v2/check';
    this.highlightedElements = new Map();
    this.isChecking = false;
    this.init();
  }

  async init() {
    // Wait for page to fully load
    document.addEventListener('DOMContentLoaded', () => {
      this.attachToTextAreas();
      this.observeNewElements();
    });
    
    // Also attach immediately in case DOM is already loaded
    this.attachToTextAreas();
    this.observeNewElements();
  }

  attachToTextAreas() {
    // Find all text inputs and textareas
    const textElements = document.querySelectorAll('input[type="text"], textarea, [contenteditable="true"]');
    
    textElements.forEach(element => {
      if (!element.dataset.grammarCheckerAttached) {
        element.dataset.grammarCheckerAttached = 'true';
        element.addEventListener('input', this.debounce(() => this.checkText(element), 500));
        element.addEventListener('blur', () => this.checkText(element));
      }
    });
  }

  observeNewElements() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          this.attachToTextAreas();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async checkText(element) {
    const text = this.getTextContent(element);
    if (!text || text.trim().length < 3 || this.isChecking) {
      return;
    }

    this.isChecking = true;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `text=${encodeURIComponent(text)}&language=auto`
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      this.displaySuggestions(element, data.matches, text);
    } catch (error) {
      console.error('Grammar check failed:', error);
    } finally {
      this.isChecking = false;
    }
  }

  getTextContent(element) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return element.value;
    }
    return element.innerText || element.textContent;
  }

  displaySuggestions(element, matches, originalText) {
    // Clear previous highlights
    this.clearHighlights(element);

    if (!matches || matches.length === 0) {
      return;
    }

    // Create a tooltip element for showing suggestions
    const tooltip = document.createElement('div');
    tooltip.className = 'grammar-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: #2d2d2d;
      color: #fff;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      max-width: 300px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    document.body.appendChild(tooltip);

    matches.forEach(match => {
      const context = match.context;
      if (!context) return;

      const offset = context.offset;
      const length = match.length;
      const errorText = originalText.substring(offset, offset + length);

      // Create highlight wrapper
      const wrapper = document.createElement('span');
      wrapper.className = 'grammar-highlight';
      wrapper.dataset.error = errorText;
      wrapper.dataset.suggestions = JSON.stringify(match.replacements);
      wrapper.dataset.message = match.message;
      
      wrapper.style.cssText = `
        background-color: rgba(255, 99, 71, 0.3);
        border-bottom: 2px solid tomato;
        cursor: pointer;
        position: relative;
      `;

      // Find and wrap the text in the element
      this.wrapText(element, errorText, wrapper, tooltip);
    });
  }

  wrapText(element, errorText, wrapper, tooltip) {
    const text = this.getTextContent(element);
    const index = text.indexOf(errorText);
    
    if (index === -1) return;

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      // For input/textarea, we cannot directly highlight
      // Instead, we'll show a floating indicator
      const rect = element.getBoundingClientRect();
      wrapper.style.position = 'absolute';
      wrapper.style.left = `${rect.left + index * 8}px`;
      wrapper.style.top = `${rect.bottom + 5}px`;
    } else {
      // For contenteditable, we can directly manipulate DOM
      const walker = document.createTreeWalker(
        element, 
        NodeFilter.SHOW_TEXT, 
        null, 
        false
      );
      
      let currentIndex = 0;
      let node;
      
      while (node = walker.nextNode()) {
        const nodeLength = node.textContent.length;
        
        if (currentIndex + nodeLength > index) {
          const startInNode = index - currentIndex;
          const endInNode = startInNode + errorText.length;
          
          if (node.textContent.substring(startInNode, endInNode) === errorText) {
            const range = document.createRange();
            range.setStart(node, startInNode);
            range.setEnd(node, endInNode);
            range.surroundContents(wrapper.cloneNode(true));
          }
          break;
        }
        currentIndex += nodeLength;
      }
    }

    wrapper.addEventListener('mouseenter', (e) => {
      const rect = wrapper.getBoundingClientRect();
      tooltip.style.display = 'block';
      tooltip.style.left = `${rect.left}px`;
      tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
      
      const suggestions = JSON.parse(wrapper.dataset.suggestions || '[]');
      const message = wrapper.dataset.message || '';
      
      tooltip.innerHTML = `
        <div style="margin-bottom: 8px; font-weight: 600;">${message}</div>
        <div style="color: #aaa; font-size: 12px; margin-bottom: 8px;">Suggestions:</div>
        ${suggestions.slice(0, 5).map(s => 
          `<div class="suggestion-item" style="padding: 4px 8px; cursor: pointer; border-radius: 4px; margin: 2px 0; background: #404040;" 
               onmouseover="this.style.background='#505050'" 
               onmouseout="this.style.background='#404040'">${s}</div>`
        ).join('')}
      `;
      
      // Add click handlers for suggestions
      tooltip.querySelectorAll('.suggestion-item').forEach((item, idx) => {
        item.addEventListener('click', () => {
          this.applyCorrection(element, wrapper.dataset.error, suggestions[idx]);
        });
      });
    });

    wrapper.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

    document.body.appendChild(wrapper);
  }

  applyCorrection(element, oldText, newText) {
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const currentValue = element.value;
      element.value = currentValue.replace(oldText, newText);
    } else {
      const html = element.innerHTML;
      element.innerHTML = html.replace(oldText, newText);
    }
    
    // Re-check after correction
    this.checkText(element);
  }

  clearHighlights(element) {
    const highlights = document.querySelectorAll('.grammar-highlight, .grammar-tooltip');
    highlights.forEach(el => el.remove());
  }
}

// Initialize the grammar checker
const grammarChecker = new GrammarChecker();

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkText') {
    grammarChecker.checkText(document.activeElement);
  }
});
```

This content script handles text detection across web pages, communicates with the LanguageTool API for grammar checking, and displays suggestions with an interactive tooltip interface. The implementation includes debouncing to prevent excessive API calls, solid text detection for various input types, and an intuitive correction mechanism.

Creating the Side Panel Interface

The side panel provides a dedicated space for users to check their writing without interrupting their workflow. Create the sidepanel/sidepanel.html and sidepanel/sidepanel.js files:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>AI Grammar Checker</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      padding: 20px;
    }
    
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #333;
    }
    
    .header img {
      width: 32px;
      height: 32px;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: 600;
    }
    
    .textarea-container {
      margin-bottom: 20px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      color: #aaa;
    }
    
    textarea {
      width: 100%;
      height: 200px;
      padding: 15px;
      border: 1px solid #333;
      border-radius: 8px;
      background: #16213e;
      color: #eee;
      font-size: 14px;
      resize: none;
      font-family: inherit;
    }
    
    textarea:focus {
      outline: none;
      border-color: #4a90d9;
    }
    
    .check-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #4a90d9, #357abd);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .check-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(74, 144, 217, 0.4);
    }
    
    .check-btn:active {
      transform: translateY(0);
    }
    
    .results {
      margin-top: 20px;
    }
    
    .result-item {
      background: #16213e;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 12px;
      border-left: 3px solid #4a90d9;
    }
    
    .result-item.error {
      border-left-color: #e74c3c;
    }
    
    .result-item.warning {
      border-left-color: #f39c12;
    }
    
    .result-item.info {
      border-left-color: #3498db;
    }
    
    .error-text {
      color: #e74c3c;
      font-weight: 600;
      margin-bottom: 5px;
    }
    
    .suggestion {
      color: #2ecc71;
      margin-bottom: 8px;
    }
    
    .message {
      font-size: 13px;
      color: #aaa;
      line-height: 1.5;
    }
    
    .apply-btn {
      margin-top: 8px;
      padding: 6px 12px;
      background: #333;
      border: none;
      border-radius: 4px;
      color: #fff;
      font-size: 12px;
      cursor: pointer;
    }
    
    .apply-btn:hover {
      background: #444;
    }
    
    .stats {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
      padding: 15px;
      background: #16213e;
      border-radius: 8px;
    }
    
    .stat {
      text-align: center;
      flex: 1;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #4a90d9;
    }
    
    .stat-label {
      font-size: 11px;
      color: #aaa;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1> AI Grammar Checker</h1>
  </div>
  
  <div class="stats">
    <div class="stat">
      <div class="stat-value" id="wordCount">0</div>
      <div class="stat-label">Words</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="charCount">0</div>
      <div class="stat-label">Characters</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="issueCount">0</div>
      <div class="stat-label">Issues</div>
    </div>
  </div>
  
  <div class="textarea-container">
    <label for="textInput">Enter or paste your text:</label>
    <textarea id="textInput" placeholder="Type or paste your text here to check for grammar and spelling errors..."></textarea>
  </div>
  
  <button class="check-btn" id="checkBtn">Check Grammar</button>
  
  <div class="results" id="results"></div>
  
  <script src="sidepanel.js"></script>
</body>
</html>
```

```javascript
// Side panel functionality for grammar checking
document.addEventListener('DOMContentLoaded', () => {
  const textInput = document.getElementById('textInput');
  const checkBtn = document.getElementById('checkBtn');
  const resultsContainer = document.getElementById('results');
  const wordCountEl = document.getElementById('wordCount');
  const charCountEl = document.getElementById('charCount');
  const issueCountEl = document.getElementById('issueCount');
  
  // Update stats on input
  textInput.addEventListener('input', updateStats);
  
  function updateStats() {
    const text = textInput.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    
    wordCountEl.textContent = words;
    charCountEl.textContent = chars;
  }
  
  // Check button handler
  checkBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    
    if (!text) {
      resultsContainer.innerHTML = '<p style="color: #aaa; text-align: center;">Please enter some text to check.</p>';
      return;
    }
    
    checkBtn.textContent = 'Checking...';
    checkBtn.disabled = true;
    
    try {
      const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `text=${encodeURIComponent(text)}&language=auto`
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      displayResults(data.matches, text);
      
    } catch (error) {
      resultsContainer.innerHTML = `<p style="color: #e74c3c;">Error: ${error.message}</p>`;
    } finally {
      checkBtn.textContent = 'Check Grammar';
      checkBtn.disabled = false;
    }
  });
  
  function displayResults(matches, originalText) {
    resultsContainer.innerHTML = '';
    
    if (!matches || matches.length === 0) {
      resultsContainer.innerHTML = '<div class="result-item" style="border-left-color: #2ecc71;"><p style="color: #2ecc71;"> No issues found! Your text looks great.</p></div>';
      issueCountEl.textContent = 0;
      return;
    }
    
    issueCountEl.textContent = matches.length;
    
    matches.forEach(match => {
      const resultItem = document.createElement('div');
      resultItem.className = `result-item ${getSeverityClass(match)}`;
      
      const errorText = match.context ? match.context.text : '';
      const replacements = match.replacements || [];
      const mainSuggestion = replacements.length > 0 ? replacements[0] : '';
      
      resultItem.innerHTML = `
        <div class="error-text">"${escapeHtml(errorText)}"</div>
        ${mainSuggestion ? `<div class="suggestion">→ ${escapeHtml(mainSuggestion)}</div>` : ''}
        <div class="message">${escapeHtml(match.message)}</div>
        ${mainSuggestion ? `<button class="apply-btn" data-replacement="${escapeHtml(mainSuggestion)}">Apply Fix</button>` : ''}
      `;
      
      // Add apply button handler
      const applyBtn = resultItem.querySelector('.apply-btn');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          applyCorrection(match.context.offset, match.context.text, applyBtn.dataset.replacement);
        });
      }
      
      resultsContainer.appendChild(resultItem);
    });
  }
  
  function getSeverityClass(match) {
    // Determine severity based on rule categories
    const categories = match.rule?.category?.id || '';
    
    if (categories.includes('TYPOS') || categories.includes('SPELLING')) {
      return 'error';
    } else if (categories.includes('GRAMMAR')) {
      return 'warning';
    }
    return 'info';
  }
  
  function applyCorrection(offset, oldText, newText) {
    const text = textInput.value;
    const newTextValue = text.replace(oldText, newText);
    textInput.value = newTextValue;
    updateStats();
    
    // Re-check the text
    checkBtn.click();
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});
```

Building the Popup Interface

The popup provides quick access to grammar checking from the Chrome toolbar. Create the popup/popup.html file:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Grammar Checker</title>
  <style>
    body {
      width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      padding: 15px;
    }
    
    h2 {
      font-size: 16px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .status {
      padding: 10px;
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 15px;
    }
    
    .status.ready {
      background: rgba(46, 204, 113, 0.2);
      color: #2ecc71;
    }
    
    .status.error {
      background: rgba(231, 76, 60, 0.2);
      color: #e74c3c;
    }
    
    .btn {
      width: 100%;
      padding: 10px;
      background: #4a90d9;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      cursor: pointer;
      margin-bottom: 10px;
    }
    
    .btn:hover {
      background: #357abd;
    }
    
    .btn-secondary {
      background: #333;
    }
    
    .btn-secondary:hover {
      background: #444;
    }
    
    .info {
      font-size: 12px;
      color: #888;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h2> Grammar Checker</h2>
  <div class="status ready" id="status">Ready to check</div>
  <button class="btn" id="checkPage">Check Current Page</button>
  <button class="btn btn-secondary" id="openSidePanel">Open Side Panel</button>
  <div class="info">Select text on any page and click "Check Current Page" for instant feedback.</div>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const checkPageBtn = document.getElementById('checkPage');
  const openSidePanelBtn = document.getElementById('openSidePanel');
  const statusEl = document.getElementById('status');
  
  checkPageBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      statusEl.textContent = 'Checking...';
      statusEl.className = 'status';
      
      // Send message to content script
      await chrome.tabs.sendMessage(tab.id, { action: 'checkText' });
      
      statusEl.textContent = 'Analysis complete!';
      statusEl.className = 'status ready';
      
    } catch (error) {
      statusEl.textContent = 'Error: ' + error.message;
      statusEl.className = 'status error';
    }
  });
  
  openSidePanelBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.sidePanel.open({ tabId: tab.id });
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: 'sidepanel/sidepanel.html'
    });
  });
});
```

Background Service Worker

The background script handles extension lifecycle events and can manage data synchronization. Create background/background.js:

```javascript
// Background service worker for grammar checker extension

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Grammar Checker extension installed:', details.reason);
  
  // Set default settings
  if (details.reason === 'install') {
    chrome.storage.sync.set({
      language: 'auto',
      enableNotifications: true,
      checkOnBlur: true
    });
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    // Return extension usage statistics
    chrome.storage.local.get(['checksPerformed', 'wordsChecked'], (result) => {
      sendResponse({
        checksPerformed: result.checksPerformed || 0,
        wordsChecked: result.wordsChecked || 0
      });
    });
    return true;
  }
});

// Track usage for analytics
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.checksPerformed) {
    // Could send analytics data here
    console.log('Total checks:', changes.checksPerformed.newValue);
  }
});
```

---

Styling and User Experience Enhancements {#styling-enhancements}

Creating a visually appealing and consistent user experience is crucial for any successful Chrome extension. The content/content.css file provides styling for the grammar highlights and tooltips that appear on web pages:

```css
/* Content script styles for grammar highlighting */

.grammar-highlight {
  background-color: rgba(255, 99, 71, 0.25);
  border-bottom: 2px solid tomato;
  border-radius: 2px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.grammar-highlight:hover {
  background-color: rgba(255, 99, 71, 0.4);
}

.grammar-tooltip {
  position: absolute;
  background: #2d2d2d;
  color: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  max-width: 350px;
  z-index: 999999;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  line-height: 1.5;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.grammar-tooltip::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 20px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid #2d2d2d;
}

.suggestion-item {
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 4px;
  margin: 4px 0;
  background: #404040;
  transition: background 0.15s;
}

.suggestion-item:hover {
  background: #505050;
}
```

---

Testing Your Extension {#testing-extension}

Before publishing your grammar checker extension, thorough testing ensures it functions correctly across different websites and browsers. This section covers essential testing procedures and common issues to watch for.

Loading Your Extension in Chrome

To test your extension during development, open Chrome and navigate to chrome://extensions/. Enable Developer mode using the toggle in the top right corner. Click the "Load unpacked" button and select the folder containing your extension files. Your extension should now appear in the extension list and toolbar.

Test your extension on various websites to verify it correctly identifies text inputs and displays suggestions. Pay special attention to different types of web pages including email clients, social media platforms, content management systems, and productivity tools. Each website may implement text inputs differently, so you might need to adjust your content script to handle edge cases.

Debugging Common Issues

Several common issues frequently appear during extension development. Textarea detection may fail on some websites that use custom input components. If users report that the extension does not work on specific websites, examine those sites using developer tools to understand their DOM structure. You may need to add custom selectors to target their specific implementation.

API rate limiting can cause issues if users check text extremely frequently. Implement appropriate caching and consider adding user-facing rate limiting messages. Performance can become problematic with very long text inputs, so consider implementing character limits or chunking for large documents.

---

Publishing to Chrome Web Store {#publishing}

Once your grammar checker extension is thoroughly tested and polished, you can publish it to the Chrome Web Store to reach millions of potential users. This section covers the publishing process and optimization strategies.

Preparing for Publication

Before publishing, ensure your extension meets Chrome Web Store policies. Review the developer program policies and ensure your extension does not contain deceptive behavior, excessive permissions, or harmful functionality. Create appealing store listing assets including a clear icon, promotional images, and a compelling description.

Generate a ZIP file of your extension folder, excluding any development files like node_modules or source maps. Upload this ZIP through the Chrome Web Store developer dashboard, fill in the required store listing information, and submit for review. The review process typically takes from a few hours to several days.

---

Conclusion and Future Improvements {#conclusion}

Congratulations on building your AI-powered grammar checker Chrome extension! You have created a fully functional writing assistant that can help users improve their written communication across the web. This project demonstrates the power of combining modern web technologies with external APIs to create sophisticated browser extensions.

The foundation you have built can be extended in many exciting ways. Consider integrating machine learning models for more accurate suggestions, adding support for multiple languages, implementing cloud sync for user preferences, or creating a premium version with advanced features. With the skills you have gained from this tutorial, you are well-equipped to explore these possibilities and continue your journey in Chrome extension development.

Remember that successful extensions evolve based on user feedback. Monitor reviews, gather user feedback, and continuously improve your extension to provide the best possible writing assistant experience. The grammar checker extension market continues to grow, and with dedication and quality, your extension can become a valuable tool for writers everywhere.
