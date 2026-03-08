---
layout: default
title: "Chrome Extension Language Translator — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-language-translator/"
---
# Build a Page Language Translator Extension

This tutorial walks you through building a Chrome extension that translates selected text on any webpage. The extension will support context menu translation, popup translation, keyboard shortcuts, and translation history.

## Prerequisites

- Basic knowledge of JavaScript and HTML
- Chrome browser installed
- A code editor (VS Code recommended)

## Step 1: Set Up Manifest with Required Permissions

Create your `manifest.json` with the necessary permissions for context menus, active tab access, and storage:

```json
{
  "manifest_version": 3,
  "name": "Quick Translate",
  "version": "1.0",
  "description": "Translate selected text on any page",
  "permissions": [
    "contextMenus",
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "commands": {
    "translate-selection": {
      "suggested_key": { "default": "Ctrl+Shift+T" },
      "description": "Translate selected text"
    }
  }
}
```

## Step 2: Create Context Menu for Translation

In your background script (`background.js`), create the context menu item:

```javascript
chrome.contextMenus.create({
  id: "translate-selection",
  title: "Translate selection",
  contexts: ["selection"]
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate-selection") {
    chrome.tabs.sendMessage(tab.id, {
      action: "translate",
      text: info.selectionText
    });
  }
});
```

## Step 3: Content Script for Tooltip Display

Create `content.js` to handle selected text and display translation in a tooltip:

```javascript
let tooltip = null;

function showTooltip(text, translation, x, y) {
  if (tooltip) tooltip.remove();
  
  tooltip = document.createElement('div');
  tooltip.className = 'translate-tooltip';
  tooltip.textContent = translation;
  tooltip.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y + 20}px;
    background: #fff;
    border: 1px solid #ccc;
    padding: 8px 12px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 999999;
    max-width: 400px;
    font-size: 14px;
  `;
  document.body.appendChild(tooltip);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "translate") {
    translateText(message.text, message.targetLang)
      .then(translation => {
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showTooltip(message.text, translation, rect.left + window.scrollX, rect.top + window.scrollY);
      });
  }
});
```

## Step 4: Integrate Translation API

Use a free translation API like MyMemory or LibreTranslate:

```javascript
async function translateText(text, targetLang = 'en') {
  const langpair = `auto|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.responseStatus === 200) {
    return data.responseData.translatedText;
  }
  throw new Error(data.responseDetails);
}
```

## Step 5: Popup for Manual Translation

Create `popup.html` and `popup.js` for manual translation input:

```html
<style>
  body { width: 300px; padding: 16px; font-family: Arial; }
  textarea { width: 100%; height: 80px; margin-bottom: 10px; }
  select, button { width: 100%; margin-bottom: 10px; padding: 8px; }
  #result { margin-top: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px; }
</style>

<textarea id="input" placeholder="Enter text to translate..."></textarea>
<select id="targetLang">
  <option value="en">English</option>
  <option value="es">Spanish</option>
  <option value="fr">French</option>
  <option value="de">German</option>
</select>
<button id="translateBtn">Translate</button>
<div id="result"></div>
```

```javascript
document.getElementById('translateBtn').addEventListener('click', async () => {
  const text = document.getElementById('input').value;
  const targetLang = document.getElementById('targetLang').value;
  
  const translation = await translateText(text, targetLang);
  document.getElementById('result').textContent = translation;
  
  // Save to history
  saveToHistory(text, translation, targetLang);
});
```

## Step 6: Options Page for User Preferences

Create `options.html` for configuring default target language and API settings:

```javascript
// options.js
async function saveOptions() {
  const targetLang = document.getElementById('targetLang').value;
  const apiKey = document.getElementById('apiKey').value;
  
  await chrome.storage.sync.set({ targetLang, apiKey });
}

async function loadOptions() {
  const { targetLang, apiKey } = await chrome.storage.sync.get(['targetLang', 'apiKey']);
  document.getElementById('targetLang').value = targetLang || 'en';
  document.getElementById('apiKey').value = apiKey || '';
}
```

## Step 7: Translation History

Store translation history in Chrome storage:

```javascript
async function saveToHistory(original, translated, targetLang) {
  const history = await chrome.storage.local.get('history');
  const entries = history.history || [];
  
  entries.unshift({
    original,
    translated,
    targetLang,
    timestamp: Date.now()
  });
  
  // Keep only last 50 entries
  await chrome.storage.local.set({ history: entries.slice(0, 50) });
}
```

## Step 8: Keyboard Shortcut Handler

Register the keyboard command in your background script:

```javascript
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "translate-selection") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const [{result: selection}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });
    if (selection) {
      const { targetLang } = await chrome.storage.sync.get(['targetLang']);
      const translation = await translateText(selection, targetLang || 'en');

      // Show in tooltip or notification
      chrome.tabs.sendMessage(tab.id, {
        action: "showTranslation",
        translation
      });
    }
  }
});
```

## Handling Edge Cases

### RTL Languages Support

```javascript
function isRTL(lang) {
  const rtlLangs = ['ar', 'he', 'fa', 'ur'];
  return rtlLangs.includes(lang);
}

function applyRTL(text, detectedLang) {
  return isRTL(detectedLang) ? 
    `<div dir="rtl" style="text-align:right">${text}</div>` : text;
}
```

### Long Text Handling

```javascript
async function translateLongText(text, targetLang, maxLength = 500) {
  const chunks = text.match(new RegExp(`.{1,${maxLength}}(\\s|$)`, 'g'));
  const translations = await Promise.all(
    chunks.map(chunk => translateText(chunk, targetLang))
  );
  return translations.join(' ');
}
```

### Rate Limiting

```javascript
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async function rateLimitedTranslate(text, targetLang) {
  const now = Date.now();
  const waitTime = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequestTime));
  
  if (waitTime > 0) {
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  return translateText(text, targetLang);
}
```

### HTML Content Stripping

```javascript
function stripHTML(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function preserveFormatting(text, translation) {
  // Handle basic formatting preservation
  return translation;
}
```

## Cross-References

- [Context Menus API](../api-reference/context-menus-api.md)
- [Keyboard Shortcuts](../guides/keyboard-shortcuts.md)
- [Context Menu Patterns](../patterns/context-menu-patterns.md)

## Testing Your Extension

1. Load unpacked extension in Chrome (`chrome://extensions`)
2. Enable Developer mode
3. Click "Load unpacked" and select your extension folder
4. Select text on any webpage and right-click to see "Translate selection"
5. Test the popup and keyboard shortcut

## Conclusion

You now have a fully functional translation extension with context menu support, popup translation, keyboard shortcuts, and history. Expand on this foundation by adding features like:
- Multiple translation API support
- Language detection improvement
- Translation memory
- Cloud sync for history
