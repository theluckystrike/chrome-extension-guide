---
layout: default
title: "Chrome Extension Word Counter — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-word-counter/"
---
# Build a Word Counter Chrome Extension

In this tutorial, we'll build a Chrome extension that counts words, characters, sentences, and more on any webpage. We'll implement selection counting, readability metrics, and a badge display.

**Prerequisites:** Basic JavaScript and HTML knowledge.

## Step 1: Manifest with activeTab Permission {#step-1-manifest-with-activetab-permission}

Create `manifest.json` with `activeTab` permission for secure page access:

```json
{
  "manifest_version": 3,
  "name": "Word Counter Pro",
  "version": "1.0",
  "permissions": ["activeTab", "clipboardWrite"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  }
}
```

The `activeTab` permission ensures we only access the page when the user explicitly invokes our extension.

## Step 2: Popup Showing Page Statistics {#step-2-popup-showing-page-statistics}

Create `popup.html` to display word count, character count, sentences, and paragraphs:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 15px; font-family: system-ui; }
    .stat { display: flex; justify-content: space-between; margin: 8px 0; }
    button { width: 100%; margin-top: 10px; padding: 8px; }
  </style>
</head>
<body>
  <h3>Page Statistics</h3>
  <div class="stat"><span>Words:</span><span id="words">-</span></div>
  <div class="stat"><span>Characters:</span><span id="chars">-</span></div>
  <div class="stat"><span>Sentences:</span><span id="sentences">-</span></div>
  <div class="stat"><span>Paragraphs:</span><span id="paragraphs">-</span></div>
  <div class="stat"><span>Avg Word Length:</span><span id="avgLen">-</span></div>
  <div class="stat"><span>Reading Time:</span><span id="readTime">-</span></div>
  <div class="stat"><span>Flesch-Kincaid:</span><span id="grade">-</span></div>
  <button id="copyBtn">Copy Stats</button>
  <script src="popup.js"></script>
</body>
</html>
```

## Step 3: Content Script Extracting Page Text {#step-3-content-script-extracting-page-text}

Create `content.js` to extract text from the page using `document.body.innerText`:

```javascript
// content.js - runs on page to extract text
function getPageText() {
  return document.body.innerText || document.body.textContent;
}

function getSelectedText() {
  const selection = window.getSelection();
  return selection ? selection.toString() : '';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    const text = request.includeSelection ? getSelectedText() : getPageText();
    sendResponse({ text, hasSelection: !!getSelectedText() });
  }
  return true;
});
```

**Edge Cases:** Handle frames by iterating through `document.frames`, skip empty elements, and trim whitespace.

## Step 4: Text Analysis Functions {#step-4-text-analysis-functions}

Implement analysis functions in `popup.js`:

```javascript
function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function countCharacters(text) {
  return text.length;
}

function countSentences(text) {
  return (text.match(/[.!?]+/g) || []).length || 1;
}

function countParagraphs(text) {
  return text.split(/\n\n+/).filter(p => p.trim().length > 0).length;
}

function averageWordLength(text) {
  const words = text.trim().split(/\s+/).filter(w => w.length > 0);
  if (!words.length) return 0;
  const total = words.reduce((sum, w) => sum + w.length, 0);
  return (total / words.length).toFixed(1);
}
```

## Step 5: Selection Counting {#step-5-selection-counting}

Detect selected text and show stats for the selection. Update `popup.js`:

```javascript
document.getElementById('includeSelection').addEventListener('change', async (e) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { 
    action: 'getStats', 
    includeSelection: e.target.checked 
  }, updateStats);
});
```

When text is selected, the popup updates to show stats for only that selection.

## Step 6: Readability Metrics {#step-6-readability-metrics}

Add Flesch-Kincaid grade level and reading time estimates:

```javascript
function fleschKincaid(text) {
  const words = countWords(text);
  const sentences = countSentences(text);
  const syllables = text.split(/[aeiouy]+/).length - 1;
  if (!words || !sentences) return 0;
  return (0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59).toFixed(1);
}

function readingTime(text) {
  const words = countWords(text);
  const minutes = Math.ceil(words / 200); // 200 WPM avg
  return `${minutes} min`;
}
```

## Step 7: Badge Showing Word Count {#step-7-badge-showing-word-count}

Update `manifest.json` to include background script, then in `popup.js`:

```javascript
chrome.action.setBadgeText({ text: String(wordCount) });
chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
```

The badge displays the word count directly on the extension icon.

## Step 8: Copy Stats to Clipboard {#step-8-copy-stats-to-clipboard}

Add clipboard functionality using `navigator.clipboard` (see `patterns/clipboard-patterns.md`):

```javascript
document.getElementById('copyBtn').addEventListener('click', async () => {
  const stats = `Words: ${wordCount}\nCharacters: ${charCount}\nSentences: ${sentenceCount}`;
  await navigator.clipboard.writeText(stats);
});
```

## Performance Considerations {#performance-considerations}

- Run analysis on demand (not continuously)
- Use `requestAnimationFrame` for UI updates
- Debounce user input for selection counting
- For large pages, use Web Workers to prevent UI blocking

## Cross-References {#cross-references}

- Content script patterns: see `guides/content-script-patterns.md`
- Clipboard API: see `patterns/clipboard-patterns.md`
- Badge UI: see `patterns/badge-action-ui.md`

Your word counter extension is ready! Install it via `chrome://extensions` in developer mode.
-e 
---

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
