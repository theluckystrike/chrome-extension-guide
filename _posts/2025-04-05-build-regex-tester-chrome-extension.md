---
layout: post
title: "Build a Regex Tester Chrome Extension: Interactive Pattern Matching Tool"
description: "Learn how to build a regex tester Chrome extension from scratch. This comprehensive guide covers Manifest V3, interactive pattern matching, real-time regex validation, and publishing your tool to the Chrome Web Store."
date: 2025-04-05
categories: [Chrome Extensions, Tutorials]
tags: [regex, tools, chrome-extension]
keywords: "chrome extension regex tester, regex chrome extension, build regex tester extension, regular expression chrome, pattern matching extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/05/build-regex-tester-chrome-extension/"
---

# Build a Regex Tester Chrome Extension: Interactive Pattern Matching Tool

Regular expressions (regex) are one of the most powerful tools in a developer's toolkit. Whether you're validating form inputs, parsing log files, or searching through text, regex patterns allow you to match, extract, and transform string data with incredible precision. However, writing and testing regex patterns can be frustrating without the right tools. In this comprehensive guide, we'll walk you through building a fully functional Regex Tester Chrome Extension that provides real-time pattern matching, match highlighting, and customizable regex flags.

This project is perfect for developers who want to add a practical tool to their browser while learning the fundamentals of Chrome extension development with Manifest V3.

---

## Why Build a Regex Tester Chrome Extension? {#why-build-regex-tester}

Before diving into the code, let's explore why building a regex tester extension is worthwhile and what features we want to include.

### The Problem with Regex Development

Regular expressions have a notoriously steep learning curve. The syntax is cryptic, and a small mistake can cause the entire pattern to fail or match unintended text. Developers often struggle with:

- **Debugging complex patterns**: Understanding why a regex isn't working as expected
- **Testing across different inputs**: Manually copying patterns between the code editor and test environment
- **Handling edge cases**: Ensuring the pattern works with various input formats
- **Managing flags**: Understanding the difference between global, case-insensitive, and multiline modes

### Our Solution: Regex Tester Extension

By building a dedicated Chrome extension, we solve these pain points with:

- **Real-time matching**: See results instantly as you type
- **Match highlighting**: Visually identify what the pattern matched
- **Flag toggles**: Easily switch between different regex modes
- **Match groups extraction**: Display captured groups separately
- **Quick reference**: Common regex patterns at your fingertips

This extension will be useful for both beginners learning regex and experienced developers who need a quick testing tool.

---

## Project Structure and Setup {#project-structure}

Let's start by setting up the project structure for our Chrome extension. We'll use Manifest V3, which is the current standard for Chrome extensions.

### Creating the Manifest File

Every Chrome extension needs a `manifest.json` file that describes its configuration. Create a new file called `manifest.json` in your project directory:

```json
{
  "manifest_version": 3,
  "name": "Regex Tester",
  "version": "1.0.0",
  "description": "Interactive regex pattern matching tool with real-time highlighting",
  "permissions": ["activeTab", "scripting"],
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

The manifest defines our extension's name, version, and specifies that we'll use a popup interface. The `permissions` array includes `activeTab` and `scripting` which we'll use to inject content scripts for match highlighting.

### Directory Structure

Create the following directory structure:

```
regex-tester-extension/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── content.js
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Building the Popup Interface {#popup-interface}

The popup is what users see when they click the extension icon. We'll create a clean, intuitive interface with input fields for the regex pattern, test string, and various controls.

### HTML Structure

Create `popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Regex Tester</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Regex Tester</h1>
      <p class="subtitle">Interactive Pattern Matching Tool</p>
    </header>

    <main>
      <div class="input-group">
        <label for="regex-pattern">Regular Expression</label>
        <input type="text" id="regex-pattern" placeholder="Enter regex pattern...">
        <div class="flags">
          <label class="flag-toggle">
            <input type="checkbox" id="flag-g" checked>
            <span>g</span>
            <span class="tooltip">Global</span>
          </label>
          <label class="flag-toggle">
            <input type="checkbox" id="flag-i">
            <span>i</span>
            <span class="tooltip">Case Insensitive</span>
          </label>
          <label class="flag-toggle">
            <input type="checkbox" id="flag-m">
            <span>m</span>
            <span class="tooltip">Multiline</span>
          </label>
          <label class="flag-toggle">
            <input type="checkbox" id="flag-s">
            <span>s</span>
            <span class="tooltip">DotAll</span>
          </label>
          <label class="flag-toggle">
            <input type="checkbox" id="flag-u">
            <span>u</span>
            <span class="tooltip">Unicode</span>
          </label>
        </div>
      </div>

      <div class="input-group">
        <label for="test-string">Test String</label>
        <textarea id="test-string" placeholder="Enter text to test against..."></textarea>
      </div>

      <div class="results-section">
        <h2>Results</h2>
        <div id="match-count" class="match-count">No matches yet</div>
        <div id="matches-container" class="matches-container"></div>
      </div>

      <div class="groups-section" id="groups-section" style="display: none;">
        <h2>Capture Groups</h2>
        <div id="groups-container" class="groups-container"></div>
      </div>

      <div class="error-message" id="error-message" style="display: none;"></div>
    </main>

    <footer>
      <button id="clear-btn" class="btn btn-secondary">Clear All</button>
      <button id="copy-btn" class="btn btn-primary">Copy Pattern</button>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

The HTML provides a clean interface with pattern input, flag toggles, test string textarea, and results display areas. We've included toggles for all common regex flags.

---

## Styling the Extension {#styling}

Create `popup.css` to style our extension:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 400px;
  min-height: 500px;
  background: #f8f9fa;
  color: #333;
}

.container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

header {
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 2px solid #e9ecef;
}

header h1 {
  font-size: 22px;
  color: #2c3e50;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 13px;
  color: #6c757d;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 13px;
  font-weight: 600;
  color: #495057;
}

input[type="text"],
textarea {
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 14px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input[type="text"]:focus,
textarea:focus {
  outline: none;
  border-color: #4dabf7;
  box-shadow: 0 0 0 3px rgba(77, 171, 247, 0.15);
}

textarea {
  min-height: 120px;
  resize: vertical;
}

.flags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.flag-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: monospace;
  transition: all 0.2s;
}

.flag-toggle:hover {
  border-color: #adb5bd;
}

.flag-toggle input {
  display: none;
}

.flag-toggle span:first-of-type {
  font-weight: 600;
  color: #495057;
}

.flag-toggle input:checked + span {
  color: #1971c2;
}

.flag-toggle input:checked {
  background: #d0ebff;
  border-color: #1971c2;
}

.tooltip {
  font-size: 10px;
  color: #868e96;
  margin-left: 4px;
}

.results-section,
.groups-section {
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 12px;
}

.results-section h2,
.groups-section h2 {
  font-size: 14px;
  color: #495057;
  margin-bottom: 8px;
}

.match-count {
  font-size: 13px;
  color: #868e96;
  margin-bottom: 12px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 4px;
}

.match-count.has-matches {
  color: #2f9e44;
  background: #ebfaee;
}

.match-count.has-error {
  color: #e03131;
  background: #fff5f5;
}

.matches-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.match-item {
  padding: 8px 10px;
  background: #f1f3f5;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
  border-left: 3px solid #4dabf7;
}

.match-item .match-text {
  color: #1971c2;
  font-weight: 600;
}

.match-item .match-index {
  color: #868e96;
  font-size: 11px;
  margin-top: 4px;
}

.match-item .match-position {
  color: #868e96;
  font-size: 11px;
}

.groups-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-item {
  padding: 6px 8px;
  background: #fff3bf;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.group-item .group-number {
  color: #f08c00;
  font-weight: 600;
  margin-right: 8px;
}

.error-message {
  padding: 12px;
  background: #ffe3e3;
  border: 1px solid #ffc9c9;
  border-radius: 6px;
  color: #c92a2a;
  font-size: 13px;
}

footer {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #4dabf7;
  color: #fff;
}

.btn-primary:hover {
  background: #339af0;
}

.btn-secondary {
  background: #e9ecef;
  color: #495057;
}

.btn-secondary:hover {
  background: #dee2e6;
}
```

This CSS provides a modern, clean design with proper spacing, colors, and interactive states. The extension will look professional and be comfortable to use.

---

## Implementing the Core Logic {#core-logic}

Now let's create the JavaScript that powers our regex tester. Create `popup.js`:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const regexPatternInput = document.getElementById('regex-pattern');
  const testStringInput = document.getElementById('test-string');
  const matchCount = document.getElementById('match-count');
  const matchesContainer = document.getElementById('matches-container');
  const groupsSection = document.getElementById('groups-section');
  const groupsContainer = document.getElementById('groups-container');
  const errorMessage = document.getElementById('error-message');
  const clearBtn = document.getElementById('clear-btn');
  const copyBtn = document.getElementById('copy-btn');

  // Flag checkboxes
  const flagG = document.getElementById('flag-g');
  const flagI = document.getElementById('flag-i');
  const flagM = document.getElementById('flag-m');
  const flagS = document.getElementById('flag-s');
  const flagU = document.getElementById('flag-u');

  // State
  let currentRegex = null;
  let matches = [];

  // Build flags string from checkboxes
  function getFlags() {
    let flags = '';
    if (flagG.checked) flags += 'g';
    if (flagI.checked) flags += 'i';
    if (flagM.checked) flags += 'm';
    if (flagS.checked) flags += 's';
    if (flagU.checked) flags += 'u';
    return flags;
  }

  // Update regex and re-test
  function updateRegex() {
    const pattern = regexPatternInput.value;
    const testString = testStringInput.value;
    const flags = getFlags();

    // Clear previous state
    matches = [];
    currentRegex = null;
    matchesContainer.innerHTML = '';
    groupsContainer.innerHTML = '';
    errorMessage.style.display = 'none';
    groupsSection.style.display = 'none';

    if (!pattern) {
      matchCount.textContent = 'Enter a pattern to start';
      matchCount.className = 'match-count';
      return;
    }

    try {
      // Create new regex
      currentRegex = new RegExp(pattern, flags);

      if (!testString) {
        matchCount.textContent = 'Enter a test string';
        matchCount.className = 'match-count';
        return;
      }

      // Find matches
      let match;
      if (flags.includes('g')) {
        // Global matching
        while ((match = currentRegex.exec(testString)) !== null) {
          matches.push({
            text: match[0],
            index: match.index,
            groups: match.slice(1),
            namedGroups: match.groups || {}
          });
          
          // Prevent infinite loops with zero-width matches
          if (match.index === currentRegex.lastIndex) {
            currentRegex.lastIndex++;
          }
        }
      } else {
        // Single match
        match = currentRegex.exec(testString);
        if (match) {
          matches.push({
            text: match[0],
            index: match.index,
            groups: match.slice(1),
            namedGroups: match.groups || {}
          });
        }
      }

      // Display results
      displayResults(testString);

    } catch (e) {
      errorMessage.textContent = `Error: ${e.message}`;
      errorMessage.style.display = 'block';
      matchCount.textContent = 'Invalid regex pattern';
      matchCount.className = 'match-count has-error';
    }
  }

  // Display matches
  function displayResults(testString) {
    if (matches.length === 0) {
      matchCount.textContent = 'No matches found';
      matchCount.className = 'match-count';
      return;
    }

    matchCount.textContent = `${matches.length} match${matches.length > 1 ? 'es' : ''} found`;
    matchCount.className = 'match-count has-matches';

    matches.forEach((match, idx) => {
      const matchItem = document.createElement('div');
      matchItem.className = 'match-item';
      matchItem.innerHTML = `
        <span class="match-text">"${escapeHtml(match.text)}"</span>
        <div class="match-position">Position: ${match.index} - ${match.index + match.text.length - 1}</div>
      `;
      matchesContainer.appendChild(matchItem);

      // Display capture groups if present
      if (match.groups && match.groups.length > 0) {
        groupsSection.style.display = 'block';
        
        match.groups.forEach((group, groupIdx) => {
          const groupItem = document.createElement('div');
          groupItem.className = 'group-item';
          groupItem.innerHTML = `
            <span class="group-number">Group ${groupIdx + 1}:</span>
            "${escapeHtml(group || '')}"
          `;
          groupsContainer.appendChild(groupItem);
        });
      }
    });
  }

  // Escape HTML for safe display
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Clear all inputs
  function clearAll() {
    regexPatternInput.value = '';
    testStringInput.value = '';
    matchesContainer.innerHTML = '';
    groupsContainer.innerHTML = '';
    matchCount.textContent = 'No matches yet';
    matchCount.className = 'match-count';
    errorMessage.style.display = 'none';
    groupsSection.style.display = 'none';
  }

  // Copy pattern to clipboard
  async function copyPattern() {
    const pattern = regexPatternInput.value;
    if (!pattern) return;

    try {
      await navigator.clipboard.writeText(pattern);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Pattern';
      }, 1500);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  }

  // Event Listeners
  regexPatternInput.addEventListener('input', updateRegex);
  testStringInput.addEventListener('input', updateRegex);
  
  [flagG, flagI, flagM, flagS, flagU].forEach(flag => {
    flag.addEventListener('change', updateRegex);
  });

  clearBtn.addEventListener('click', clearAll);
  copyBtn.addEventListener('click', copyPattern);

  // Load saved state from storage
  chrome.storage.local.get(['regexPattern', 'testString', 'flags'], (result) => {
    if (result.regexPattern) regexPatternInput.value = result.regexPattern;
    if (result.testString) testStringInput.value = result.testString;
    if (result.flags) {
      if (result.flags.includes('g')) flagG.checked = true;
      if (result.flags.includes('i')) flagI.checked = true;
      if (result.flags.includes('m')) flagM.checked = true;
      if (result.flags.includes('s')) flagS.checked = true;
      if (result.flags.includes('u')) flagU.checked = true;
    }
    updateRegex();
  });

  // Save state on change
  regexPatternInput.addEventListener('change', () => {
    chrome.storage.local.set({ regexPattern: regexPatternInput.value });
  });
  
  testStringInput.addEventListener('change', () => {
    chrome.storage.local.set({ testString: testStringInput.value });
  });
});
```

This JavaScript implements all the core functionality including real-time pattern matching, flag management, capture group extraction, error handling, and state persistence using Chrome's storage API.

---

## Adding Advanced Features with Content Scripts {#content-scripts}

To make our regex tester even more powerful, we can add the ability to test regex patterns against content on the current webpage. Create `content.js`:

```javascript
// Content script for highlighting regex matches on webpage

let currentHighlights = [];

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'highlight') {
    clearHighlights();
    
    try {
      const regex = new RegExp(request.pattern, request.flags);
      highlightMatches(regex, request.text);
      sendResponse({ success: true, matchCount: currentHighlights.length });
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
  } else if (request.action === 'clear') {
    clearHighlights();
    sendResponse({ success: true });
  }
  
  return true;
});

function highlightMatches(regex, text) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach(node => {
    const text = node.textContent;
    const match = regex.exec(text);
    
    if (match) {
      const span = document.createElement('span');
      span.innerHTML = text.replace(
        new RegExp(regex.source, regex.flags),
        `<mark class="regex-highlight" style="background: #ffe066; padding: 0 2px; border-radius: 2px;">${match[0]}</mark>`
      );
      
      if (node.parentNode) {
        node.parentNode.replaceChild(span, node);
        currentHighlights.push(span);
      }
    }
  });
}

function clearHighlights() {
  currentHighlights.forEach(span => {
    const text = span.textContent;
    span.parentNode.replaceChild(
      document.createTextNode(text),
      span
    );
  });
  currentHighlights = [];
}
```

This content script allows users to highlight regex matches on any webpage, making the extension even more useful for real-world regex testing.

---

## Adding a Background Service Worker {#background-worker}

For advanced functionality like keyboard shortcuts or notifications, we need a background service worker. Create `background.js`:

```javascript
// Background service worker for Regex Tester extension

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Regex Tester extension installed');
    
    // Set default storage values
    chrome.storage.local.set({
      regexPattern: '',
      testString: '',
      flags: 'g',
      savedPatterns: []
    });
  }
});

// Handle messages from popup or other scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPatterns') {
    // Return saved regex patterns
    chrome.storage.local.get('savedPatterns', (result) => {
      sendResponse(result.savedPatterns || []);
    });
    return true;
  }

  if (request.action === 'savePattern') {
    chrome.storage.local.get('savedPatterns', (result) => {
      const patterns = result.savedPatterns || [];
      patterns.push({
        name: request.name,
        pattern: request.pattern,
        flags: request.flags,
        timestamp: Date.now()
      });
      
      // Keep only last 20 patterns
      const trimmed = patterns.slice(-20);
      chrome.storage.local.set({ savedPatterns: trimmed });
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle keyboard shortcut (Ctrl+Shift+R)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-regex-tester') {
    chrome.action.openPopup();
  }
});
```

The background worker handles pattern saving, keyboard shortcuts, and installation setup.

---

## Creating Extension Icons {#icons}

Every Chrome extension needs icons. For this guide, we'll use simple placeholder icons. In a production extension, you would create professionally designed icons. Create simple SVG-based PNG icons or use a tool to generate them.

For now, create placeholder icon files. You can generate simple icons using online tools or create basic colored squares with text.

---

## Testing the Extension Locally {#testing}

Before publishing, let's test our extension:

1. **Open Chrome and navigate to** `chrome://extensions/`
2. **Enable "Developer mode"** using the toggle in the top right
3. **Click "Load unpacked"** and select your extension directory
4. **Pin the extension** to your browser toolbar
5. **Click the extension icon** to open the popup
6. **Test the regex tester** with various patterns

Try these test cases:
- Pattern: `\d+` - matches all numbers
- Pattern: `\w+@\w+\.\w+` - matches email-like strings
- Pattern: `https?://[^\s]+` - matches URLs

---

## Publishing to the Chrome Web Store {#publishing}

Once you've tested your extension and are satisfied with its functionality, you can publish it to the Chrome Web Store:

1. **Create a developer account** at the Chrome Web Store Developer Dashboard
2. **Package your extension** using the "Pack extension" button in `chrome://extensions/`
3. **Upload your packaged extension** (.zip file) to the developer dashboard
4. **Fill in the required information**:
   - Extension name
   - Description (detailed explanation of features)
   - Category
   - Screenshots and promotional images
5. **Submit for review** (usually takes 1-3 business days)

---

## Advanced Enhancements {#advanced-enhancements}

Here are some ideas to further improve your regex tester extension:

### Save and Load Patterns
Add functionality to save frequently used regex patterns for quick access later.

### Regex Quick Reference
Include a built-in regex cheat sheet with common patterns for email, URL, phone numbers, etc.

### Export/Import
Allow users to export their test cases and saved patterns for sharing or backup.

### Match Replacement
Add a replace feature to test regex-based find and replace operations.

### Syntax Highlighting
Implement syntax highlighting for the regex pattern input to make it easier to read complex patterns.

### Dark Mode
Add a dark mode option for users who prefer darker interfaces.

---

## Conclusion {#conclusion}

Congratulations! You've built a fully functional Regex Tester Chrome Extension from scratch. This extension provides:

- **Real-time pattern matching** with instant feedback
- **Support for all regex flags** (global, case-insensitive, multiline, dotall, unicode)
- **Capture group extraction** for complex pattern analysis
- **State persistence** using Chrome's storage API
- **Clean, modern UI** with responsive design
- **Error handling** with clear error messages

The extension demonstrates key Chrome extension development concepts including Manifest V3 configuration, popup development, content scripts, background workers, and Chrome storage APIs. These skills are transferable to building any type of Chrome extension.

Regular expressions are an essential skill for developers, and having a reliable testing tool at your fingertips can significantly improve your productivity. This Regex Tester extension will serve as a valuable tool in your browser for years to come.

Happy coding, and enjoy your new regex testing tool!

---

## Additional Resources {#resources}

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Regex Reference on MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- [Manifest V3 Migration Guide](/chrome-extension-guide/articles/manifest-v3-migration-guide/)

