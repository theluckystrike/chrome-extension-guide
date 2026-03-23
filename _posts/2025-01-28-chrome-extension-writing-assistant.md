---
layout: post
title: "Build a Writing Assistant Chrome Extension: Complete 2025 Guide"
description: "Learn how to build a writing assistant Chrome extension with grammar checking, style suggestions, and productivity features. This comprehensive tutorial covers Manifest V3, content scripts, and real-world implementation."
date: 2025-01-28
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "writing assistant extension, grammar help chrome, writing tool"
canonical_url: "https://bestchromeextensions.com/2025/01/28/chrome-extension-writing-assistant/"
---

# Build a Writing Assistant Chrome Extension: Complete 2025 Guide

In today's digital age, clear and polished writing is more important than ever. Whether you're crafting emails, writing blog posts, or composing professional documents, a writing assistant extension can significantly improve your productivity and the quality of your output. This comprehensive guide will walk you through building a fully functional writing assistant Chrome extension from scratch.

We'll cover everything from project setup to advanced features like grammar checking, style improvements, and text analysis. By the end of this tutorial, you'll have a production-ready extension that users can install from the Chrome Web Store.

---

## Why Build a Writing Assistant Extension? {#why-build}

The demand for writing assistance tools has exploded in recent years. Professionals, students, and content creators are constantly looking for ways to improve their writing efficiency and quality. Here's why building a writing assistant extension is an excellent project:

### Market Opportunity

The global grammar checking software market continues to grow rapidly. Writers at all levels seek tools that can help them produce error-free content quickly. A Chrome extension that works directly in the browser can capture this market effectively since most writing happens online—in email clients, document editors, social media platforms, and content management systems.

Building a writing assistant extension also gives you valuable experience with several key Chrome extension concepts, including content scripts, message passing, browser storage, and user interface design within the browser chrome itself.

### Technical Benefits

From a development perspective, a writing assistant extension teaches you how to:

- Manipulate text content on any webpage
- Integrate with external APIs for advanced language processing
- Build responsive popup interfaces
- Manage user preferences and settings
- Handle asynchronous operations efficiently

These skills are transferable to many other extension projects and general web development work.

---

## Project Overview and Architecture {#project-overview}

Before writing any code, let's outline what our writing assistant extension will do:

### Core Features

1. **Grammar Checking**: Detect and suggest corrections for grammatical errors
2. **Spelling Verification**: Identify misspelled words and provide suggestions
3. **Style Suggestions**: Offer improvements for readability and tone
4. **Word Counter**: Track word and character counts in real-time
5. **Quick Actions**: Provide easy access to common writing tools via popup

### Extension Architecture

Our extension will use the following components:

- **manifest.json**: Extension configuration (Manifest V3)
- **content.js**: Script that runs on web pages to analyze text
- **popup.html/js/css**: The extension popup interface
- **background.js**: Service worker for handling events and API calls

Let's build each component step by step.

---

## Step 1: Setting Up the Project Structure {#setup}

Create a new folder for your extension project and set up the basic file structure:

```bash
mkdir writing-assistant-extension
cd writing-assistant-extension
mkdir -p icons
touch manifest.json popup.html popup.js popup.css content.js background.js
```

### Project Structure Overview

```
writing-assistant-extension/
├── manifest.json      # Extension configuration
├── popup.html         # Popup interface
├── popup.js           # Popup logic
├── popup.css          # Popup styling
├── content.js         # Content script
├── background.js      # Service worker
└── icons/             # Extension icons
```

---

## Step 2: Creating the Manifest {#manifest}

The manifest.json file is the heart of every Chrome extension. For Manifest V3 (the current standard), we need to define permissions, content scripts, and the extension's capabilities:

```json
{
  "manifest_version": 3,
  "name": "Writing Assistant Pro",
  "version": "1.0.0",
  "description": "Your personal writing assistant with grammar checking, style suggestions, and productivity tools",
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": []
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest grants the extension the ability to run on all websites, access browser storage, and interact with the active tab. The content script will analyze text on any page, while the popup provides the user interface.

---

## Step 3: Building the Content Script {#content-script}

The content script is what runs on web pages to analyze and interact with text. This is where the core writing assistance logic lives:

```javascript
// content.js - Runs on web pages

class WritingAssistant {
  constructor() {
    this.isEnabled = true;
    this.analysisResults = null;
    this.init();
  }

  init() {
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'analyzeText') {
        const text = this.getSelectedText() || this.getPageText();
        const analysis = this.analyzeText(text);
        sendResponse({ success: true, data: analysis });
      }
      if (request.action === 'getStats') {
        const stats = this.getTextStats();
        sendResponse({ success: true, data: stats });
      }
      return true;
    });
  }

  getSelectedText() {
    return window.getSelection().toString().trim();
  }

  getPageText() {
    // Get text from common content areas
    const selectors = ['article', 'main', '.content', '.post', '#content', 'textarea', '[contenteditable="true"]'];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.length > 100) {
        return element.innerText;
      }
    }
    return document.body.innerText;
  }

  analyzeText(text) {
    const results = {
      issues: [],
      suggestions: [],
      score: 100
    };

    if (!text || text.length === 0) {
      return results;
    }

    // Grammar and spelling checks
    const commonErrors = this.checkGrammar(text);
    results.issues = commonErrors.issues;
    results.suggestions = commonErrors.suggestions;

    // Calculate readability score
    results.readabilityScore = this.calculateReadability(text);
    results.wordCount = this.countWords(text);
    results.charCount = text.length;
    results.sentenceCount = this.countSentences(text);

    // Update score based on issues found
    results.score = Math.max(0, 100 - (results.issues.length * 5) - (results.suggestions.length * 2));

    return results;
  }

  checkGrammar(text) {
    const issues = [];
    const suggestions = [];

    // Common grammar patterns to check
    const patterns = [
      { regex: /\bi\s+am\b/gi, suggestion: "I'm", type: 'grammar', message: "Consider using contraction 'I'm'" },
      { regex: /\bdo\s+not\b/gi, suggestion: "don't", type: 'grammar', message: "Consider using contraction 'don't'" },
      { regex: /\bcannot\b/gi, suggestion: "can't", type: 'style', message: "'Can't' is more conversational" },
      { regex: /\bvery\s+unique\b/gi, suggestion: "unique", type: 'style', message: "'Unique' is absolute—something is either unique or it isn't" },
      { regex: /\breally\s+very\b/gi, suggestion: "very", type: 'style', message: "Redundant—'very' alone is sufficient" },
      { regex: /\bensure\b(?=\s+that)/gi, suggestion: "make sure", type: 'style', message: "Consider simpler phrasing" },
      { regex: /\butilize\b/gi, suggestion: "use", type: 'style', message: "'Use' is clearer than 'utilize'" },
      { regex: /\bhowever\b(?=[,.])/gi, suggestion: ", however,", type: 'punctuation', message: "Use comma after 'however' when used as conjunction" },
    ];

    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(text)) !== null) {
        issues.push({
          type: pattern.type,
          original: match[0],
          suggestion: pattern.suggestion,
          message: pattern.message,
          position: match.index
        });
        suggestions.push({
          text: pattern.suggestion,
          reason: pattern.message
        });
      }
    });

    return { issues, suggestions };
  }

  calculateReadability(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0);

    if (words.length === 0 || sentences.length === 0) return 0;

    // Simplified Flesch Reading Ease formula
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  countWords(text) {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  countSentences(text) {
    return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  }

  getTextStats() {
    const text = this.getSelectedText() || this.getPageText();
    return {
      wordCount: this.countWords(text),
      charCount: text.length,
      charCountNoSpaces: text.replace(/\s/g, '').length,
      sentenceCount: this.countSentences(text),
      paragraphCount: text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
    };
  }
}

// Initialize the assistant
const assistant = new WritingAssistant();
```

This content script provides comprehensive text analysis capabilities. It can detect common grammar issues, provide style suggestions, calculate readability scores, and gather text statistics. The script listens for messages from the popup and responds with analysis results.

---

## Step 4: Creating the Popup Interface {#popup-interface}

The popup is what users see when they click the extension icon. Let's build an intuitive and functional interface:

```html
<!-- popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Writing Assistant</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>✍️ Writing Assistant</h1>
      <p class="tagline">Improve your writing instantly</p>
    </header>

    <div class="stats-panel">
      <div class="stat-item">
        <span class="stat-label">Words</span>
        <span class="stat-value" id="wordCount">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Characters</span>
        <span class="stat-value" id="charCount">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Sentences</span>
        <span class="stat-value" id="sentenceCount">0</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Readability</span>
        <span class="stat-value" id="readabilityScore">-</span>
      </div>
    </div>

    <div class="score-panel">
      <div class="score-circle" id="scoreCircle">
        <span id="overallScore">-</span>
      </div>
      <p class="score-label">Writing Score</p>
    </div>

    <button id="analyzeBtn" class="primary-btn">Analyze Text</button>

    <div class="issues-panel" id="issuesPanel">
      <h3>Suggestions</h3>
      <ul id="issuesList"></ul>
    </div>

    <div class="actions-panel">
      <button id="copyBtn" class="action-btn">Copy Selected</button>
      <button id="clearBtn" class="action-btn secondary">Clear</button>
    </div>

    <footer>
      <label class="toggle">
        <input type="checkbox" id="enableToggle" checked>
        <span>Enable on this page</span>
      </label>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

---

## Step 5: Styling the Popup {#popup-styling}

A clean, modern design helps your extension feel professional and trustworthy:

```css
/* popup.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background: #ffffff;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #1a73e8;
  margin-bottom: 4px;
}

.tagline {
  font-size: 12px;
  color: #666;
}

.stats-panel {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.stat-item {
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 6px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1a73e8;
}

.score-panel {
  text-align: center;
  margin-bottom: 16px;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4caf50, #8bc34a);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
}

.score-circle span {
  font-size: 24px;
  font-weight: 700;
  color: white;
}

.score-label {
  font-size: 12px;
  color: #666;
}

.primary-btn {
  width: 100%;
  padding: 12px;
  background: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn:hover {
  background: #1557b0;
}

.issues-panel {
  margin-top: 16px;
  max-height: 150px;
  overflow-y: auto;
}

.issues-panel h3 {
  font-size: 14px;
  margin-bottom: 8px;
  color: #333;
}

.issues-panel ul {
  list-style: none;
}

.issues-panel li {
  padding: 8px;
  background: #fff3e0;
  border-left: 3px solid #ff9800;
  margin-bottom: 6px;
  border-radius: 0 4px 4px 0;
  font-size: 12px;
}

.issues-panel li.grammar {
  background: #ffebee;
  border-left-color: #f44336;
}

.issues-panel li.style {
  background: #e3f2fd;
  border-left-color: #2196f3;
}

.actions-panel {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f5f5f5;
}

.action-btn.secondary {
  color: #666;
}

footer {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

.toggle input {
  cursor: pointer;
}
```

---

## Step 6: Implementing Popup Logic {#popup-logic}

Now let's add the JavaScript to make the popup functional:

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const enableToggle = document.getElementById('enableToggle');
  
  const wordCountEl = document.getElementById('wordCount');
  const charCountEl = document.getElementById('charCount');
  const sentenceCountEl = document.getElementById('sentenceCount');
  const readabilityScoreEl = document.getElementById('readabilityScore');
  const overallScoreEl = document.getElementById('overallScore');
  const scoreCircle = document.getElementById('scoreCircle');
  const issuesList = document.getElementById('issuesList');

  // Analyze text when button clicked
  analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.textContent = 'Analyzing...';
    analyzeBtn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const results = await chrome.tabs.sendMessage(tab.id, { action: 'analyzeText' });
      
      if (results && results.success) {
        updateUI(results.data);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      issuesList.innerHTML = '<li>Could not analyze this page. Try selecting text first.</li>';
    }

    analyzeBtn.textContent = 'Analyze Text';
    analyzeBtn.disabled = false;
  });

  // Copy selected text
  copyBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const results = await chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' });
      
      if (results && results.text) {
        await navigator.clipboard.writeText(results.text);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy Selected', 2000);
      }
    } catch (error) {
      console.error('Copy error:', error);
    }
  });

  // Clear results
  clearBtn.addEventListener('click', () => {
    wordCountEl.textContent = '0';
    charCountEl.textContent = '0';
    sentenceCountEl.textContent = '0';
    readabilityScoreEl.textContent = '-';
    overallScoreEl.textContent = '-';
    issuesList.innerHTML = '';
    scoreCircle.style.background = 'linear-gradient(135deg, #4caf50, #8bc34a)';
  });

  // Toggle extension on/off
  enableToggle.addEventListener('change', async (e) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, { 
      action: 'toggleEnabled', 
      enabled: e.target.checked 
    });
  });

  function updateUI(data) {
    // Update stats
    wordCountEl.textContent = data.wordCount || 0;
    charCountEl.textContent = data.charCount || 0;
    sentenceCountEl.textContent = data.sentenceCount || 0;
    readabilityScoreEl.textContent = data.readabilityScore || '-';
    overallScoreEl.textContent = data.score || '-';

    // Update score color
    const score = data.score || 0;
    let color = '#4caf50';
    if (score < 70) color = '#ff9800';
    if (score < 50) color = '#f44336';
    scoreCircle.style.background = `linear-gradient(135deg, ${color}, ${adjustColor(color, 20)})`;

    // Update issues list
    issuesList.innerHTML = '';
    
    if (data.issues && data.issues.length > 0) {
      data.issues.slice(0, 10).forEach(issue => {
        const li = document.createElement('li');
        li.className = issue.type;
        li.innerHTML = `<strong>${issue.message}</strong><br>Suggestion: ${issue.suggestion}`;
        issuesList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.style.background = '#e8f5e9';
      li.style.borderLeftColor = '#4caf50';
      li.innerHTML = '<strong>Great job!</strong><br>No issues found in your text.';
      issuesList.appendChild(li);
    }
  }

  function adjustColor(color, amount) {
    return color; // Simplified for demo
  }
});
```

---

## Step 7: Setting Up the Service Worker {#service-worker}

The background service worker handles extension lifecycle events and can manage long-running tasks:

```javascript
// background.js

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Writing Assistant extension installed');
    
    // Set default preferences
    chrome.storage.sync.set({
      enabled: true,
      showInline: true,
      autoAnalyze: false
    });
  }
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
  }
  return true;
});

// Handle keyboard shortcuts (if any defined in manifest)
chrome.commands.onCommand.addListener((command) => {
  console.log('Command triggered:', command);
});
```

---

## Step 8: Testing Your Extension {#testing}

Now let's test the extension in Chrome:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension folder
4. The extension icon should appear in your toolbar

Click the extension icon to open the popup. Navigate to any webpage with text and click "Analyze Text" to see the writing assistant in action.

---

## Step 9: Advanced Features to Consider {#advanced-features}

Once you have the basic extension working, consider adding these advanced features:

### Integration with Language APIs

For more sophisticated grammar checking, integrate with APIs like LanguageTool, Grammarly API, or Microsoft Editor. These services offer more comprehensive analysis beyond basic pattern matching.

### Custom Dictionaries

Allow users to add words to a custom dictionary so they won't be flagged as errors in future checks.

### Writing Goals

Implement word count goals, reading time estimates, and progress tracking for long-form writing projects.

### Multiple Language Support

Expand beyond English to support multiple languages with appropriate grammar rules.

---

## Publishing Your Extension {#publishing}

When you're ready to share your extension with the world:

1. Create icons in required sizes (16x16, 48x48, 128x128)
2. Prepare screenshots for the Chrome Web Store
3. Write a compelling description with relevant keywords
4. Submit for review through the Chrome Web Store Developer Dashboard

Your writing assistant extension is now complete! This project demonstrates fundamental Chrome extension development concepts while creating a genuinely useful tool that can help writers improve their craft.

---

## Conclusion {#conclusion}

Building a writing assistant Chrome extension is an excellent project that combines practical utility with meaningful technical challenges. You've learned how to create content scripts that analyze text on any webpage, build responsive popup interfaces, and implement core writing assistance features like grammar checking and readability analysis.

The skills you developed in this tutorial—working with content scripts, managing browser storage, handling asynchronous operations, and creating polished user interfaces—are directly applicable to countless other Chrome extension projects.

Remember, this is just the beginning. The writing assistant framework you've built can be extended with AI-powered analysis, integration with third-party services, and advanced features like tone detection and plagiarism checking. The possibilities are endless, and the Chrome Web Store awaits your creativity.

Start building today, and help writers around the world create better content with your extension!
