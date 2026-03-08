---
layout: default
title: "Chrome Extension Translation Tool — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-translation-tool/"
---
# Build a Translation Tool Extension

A Chrome extension that translates selected text instantly, provides a popup interface for manual translation, and maintains translation history.

## What You'll Build {#what-youll-build}

By the end of this tutorial, you'll have created a fully functional translation extension with:

- **Context menu translation**: Right-click selected text to translate
- **Inline translation tooltip**: Floating tooltip appears on text selection
- **Popup interface**: Manual translation with language pickers
- **Translation history**: Persistent storage of all translations
- **Language detection**: Auto-detect source language

## Prerequisites {#prerequisites}

- Chrome browser or Chromium-based browser
- Basic JavaScript and HTML/CSS knowledge
- Chrome Extensions API familiarity

## Project Structure {#project-structure}

```
translation-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/
│   └── content.js
├── background/
│   └── service-worker.js
├── utils/
│   └── translator.js
└── icons/
    └── icon.png
```

## Manifest Configuration {#manifest-configuration}

Create your `manifest.json` with the required permissions:

```json
{
  "manifest_version": 3,
  "name": "Quick Translate",
  "version": "1.0.0",
  "description": "Translate selected text instantly",
  "permissions": [
    "activeTab",
    "storage",
    "contextMenus",
    "scripting",
    "notifications"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": "icons/icon.png"
  },
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/content.js"]
  }]
}
```

## Step 1: Translation API Integration {#step-1-translation-api-integration}

We'll use LibreTranslate as our primary API (free and self-hostable). Create `utils/translator.js`:

```javascript
const API_BASE = 'https://libretranslate.com/translate';

const translationCache = new Map();

async function translate(text, sourceLang, targetLang) {
  const cacheKey = `${text}:${sourceLang}:${targetLang}`;
  
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.translatedText;
    
    translationCache.set(cacheKey, translation);
    return translation;
  } catch (error) {
    console.error('Translation failed:', error);
    throw error;
  }
}

async function detectLanguage(text) {
  try {
    const response = await fetch('https://libretranslate.com/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text })
    });
    const data = await response.json();
    return data[0]?.language || 'en';
  } catch (error) {
    console.error('Language detection failed:', error);
    return 'en';
  }
}
```

## Step 2: Context Menu Translation {#step-2-context-menu-translation}

Set up the context menu in your service worker:

```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translateSelection',
    title: 'Translate "%s"',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translateSelection') {
    const selectedText = info.selectionText;
    
    try {
      const { sourceLang = 'auto', targetLang = 'en' } = await getLanguagePrefs();
      const translation = await translate(selectedText, sourceLang, targetLang);
      
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon.png',
        title: 'Translation',
        message: translation,
        priority: 1
      });
      
      await saveToHistory(selectedText, translation, sourceLang, targetLang);
    } catch (error) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon.png',
        title: 'Translation Error',
        message: error.message,
        priority: 1
      });
    }
  }
});
```

## Step 3: Inline Translation Tooltip {#step-3-inline-translation-tooltip}

Create `content/content.js` for the floating tooltip:

```javascript
let tooltip = null;

document.addEventListener('mouseup', async (event) => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText.length > 0 && selectedText.length < 5000) {
    setTimeout(() => {
      if (window.getSelection().toString().trim() === selectedText) {
        showTooltip(event, selectedText);
      }
    }, 300);
  }
});

function showTooltip(event, text) {
  removeTooltip();
  
  tooltip = document.createElement('div');
  tooltip.id = 'translation-tooltip';
  tooltip.innerHTML = '<span>Translating...</span>';
  
  const rect = window.getSelection().getRangeAt(0).getBoundingClientRect();
  tooltip.style.cssText = `
    position: fixed;
    top: ${rect.top + window.scrollY - 40}px;
    left: ${rect.left + (rect.width / 2)}px;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 999999;
    cursor: pointer;
  `;
  
  document.body.appendChild(tooltip);
  
  translateInline(text, tooltip);
}

async function translateInline(text, tooltipElement) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'translate',
      text: text
    });
    
    tooltipElement.innerHTML = `<span>${response.translation}</span>`;
    tooltipElement.onclick = () => {
      navigator.clipboard.writeText(response.translation);
      tooltipElement.innerHTML = '<span>Copied!</span>';
    };
  } catch (error) {
    tooltipElement.innerHTML = '<span>Translation failed</span>';
  }
}

function removeTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
}

document.addEventListener('mousedown', removeTooltip);
```

## Step 4: Popup UI {#step-4-popup-ui}

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <div class="language-row">
      <select id="sourceLang">
        <option value="auto">Auto Detect</option>
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
        <option value="it">Italian</option>
        <option value="pt">Portuguese</option>
        <option value="ru">Russian</option>
        <option value="zh">Chinese</option>
        <option value="ja">Japanese</option>
        <option value="ko">Korean</option>
      </select>
      <button id="swapBtn" title="Swap Languages">⇄</button>
      <select id="targetLang">
        <option value="en">English</option>
        <option value="es">Spanish</option>
        <option value="fr">French</option>
        <option value="de">German</option>
        <option value="it">Italian</option>
        <option value="pt">Portuguese</option>
        <option value="ru">Russian</option>
        <option value="zh">Chinese</option>
        <option value="ja">Japanese</option>
        <option value="ko">Korean</option>
      </select>
    </div>
    
    <textarea id="sourceText" placeholder="Enter text to translate..."></textarea>
    <button id="translateBtn">Translate</button>
    
    <div id="result" class="result hidden">
      <p id="translationText"></p>
      <button id="copyBtn" title="Copy">📋 Copy</button>
    </div>
    
    <div class="history-section">
      <h3>History</h3>
      <div id="historyList"></div>
      <button id="clearHistory">Clear History</button>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Style with `popup.css`:

```css
.container {
  width: 350px;
  padding: 16px;
  font-family: Arial, sans-serif;
}

.language-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

select {
  flex: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

#swapBtn {
  padding: 8px 12px;
  background: #f0f0f0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

textarea {
  width: 100%;
  height: 100px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
  box-sizing: border-box;
}

button#translateBtn {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.result {
  margin-top: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 4px;
  position: relative;
}

.hidden {
  display: none;
}

#copyBtn {
  margin-top: 8px;
  padding: 4px 8px;
}

.history-section {
  margin-top: 16px;
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.history-item {
  padding: 8px;
  margin: 4px 0;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
```

Popup logic in `popup/popup.js`:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const sourceText = document.getElementById('sourceText');
  const translateBtn = document.getElementById('translateBtn');
  const result = document.getElementById('result');
  const translationText = document.getElementById('translationText');
  const copyBtn = document.getElementById('copyBtn');
  const swapBtn = document.getElementById('swapBtn');
  const clearHistory = document.getElementById('clearHistory');
  const historyList = document.getElementById('historyList');
  
  // Load saved preferences
  const prefs = await chrome.storage.local.get(['sourceLang', 'targetLang']);
  document.getElementById('sourceLang').value = prefs.sourceLang || 'auto';
  document.getElementById('targetLang').value = prefs.targetLang || 'en';
  
  // Load history
  loadHistory();
  
  // Translate button
  translateBtn.addEventListener('click', async () => {
    const text = sourceText.value.trim();
    if (!text) return;
    
    const sourceLang = document.getElementById('sourceLang').value;
    const targetLang = document.getElementById('targetLang').value;
    
    translateBtn.textContent = 'Translating...';
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'translate',
        text,
        sourceLang,
        targetLang
      });
      
      translationText.textContent = response.translation;
      result.classList.remove('hidden');
      
      // Save to history
      await saveToHistory(text, response.translation, sourceLang, targetLang);
      loadHistory();
    } catch (error) {
      translationText.textContent = 'Error: ' + error.message;
      result.classList.remove('hidden');
    }
    
    translateBtn.textContent = 'Translate';
  });
  
  // Swap languages
  swapBtn.addEventListener('click', () => {
    const source = document.getElementById('sourceLang');
    const target = document.getElementById('targetLang');
    
    if (source.value !== 'auto') {
      const temp = source.value;
      source.value = target.value;
      target.value = temp;
    }
  });
  
  // Copy translation
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(translationText.textContent);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = '📋 Copy', 2000);
  });
  
  // Save preferences on change
  document.getElementById('sourceLang').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ sourceLang: e.target.value });
  });
  
  document.getElementById('targetLang').addEventListener('change', async (e) => {
    await chrome.storage.local.set({ targetLang: e.target.value });
  });
  
  // Clear history
  clearHistory.addEventListener('click', async () => {
    await chrome.storage.local.set({ translationHistory: [] });
    loadHistory();
  });
});

async function saveToHistory(source, translation, sourceLang, targetLang) {
  const { translationHistory = [] } = await chrome.storage.local.get('translationHistory');
  
  const entry = {
    id: Date.now(),
    source,
    translation,
    sourceLang,
    targetLang,
    timestamp: new Date().toISOString()
  };
  
  translationHistory.unshift(entry);
  
  // Keep only last 100 entries
  if (translationHistory.length > 100) {
    translationHistory.pop();
  }
  
  await chrome.storage.local.set({ translationHistory });
}

async function loadHistory() {
  const { translationHistory = [] } = await chrome.storage.local.get('translationHistory');
  const historyList = document.getElementById('historyList');
  
  historyList.innerHTML = translationHistory.slice(0, 10).map(item => `
    <div class="history-item" data-source="${item.source}">
      <strong>${item.sourceLang} → ${item.targetLang}</strong><br>
      ${item.source.substring(0, 30)}${item.source.length > 30 ? '...' : ''}<br>
      <em>${item.translation.substring(0, 30)}${item.translation.length > 30 ? '...' : ''}</em>
    </div>
  `).join('');
  
  // Click to restore
  historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const entry = translationHistory.find(h => h.id == item.dataset.id);
      if (entry) {
        document.getElementById('sourceText').value = entry.source;
        document.getElementById('translationText').textContent = entry.translation;
        document.getElementById('result').classList.remove('hidden');
      }
    });
  });
}
```

## Step 5: Handling API Errors and Rate Limits {#step-5-handling-api-errors-and-rate-limits}

Add robust error handling in your service worker:

```javascript
async function translateWithRetry(text, sourceLang, targetLang, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await translate(text, sourceLang, targetLang);
    } catch (error) {
      lastError = error;
      
      if (error.message.includes('429')) {
        // Rate limited - wait before retry
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
      } else if (error.message.includes('500')) {
        // Server error - might recover
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Client error - don't retry
        throw error;
      }
    }
  }
  
  throw lastError;
}
```

## Testing Your Extension {#testing-your-extension}

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select your extension directory
4. Test context menu: Select text on any page, right-click, choose "Translate"
5. Test popup: Click the extension icon, enter text, select languages
6. Test inline tooltip: Select text and wait for the floating tooltip

## Best Practices {#best-practices}

- **Cache translations**: Store frequently used translations to reduce API calls
- **Handle offline**: Show cached results when network is unavailable
- **Respect rate limits**: Implement exponential backoff for API calls
- **User privacy**: Only send text when user explicitly requests translation

## Next Steps {#next-steps}

- Add support for multiple translation APIs as fallbacks
- Implement keyboard shortcuts for quick translation
- Add synchronization across devices with Chrome sync storage
- Create a options page for advanced settings

## Related Resources {#related-resources}

- [Internationalization Guide](../guides/internationalization.md)
- [Content Script Patterns](../guides/content-script-patterns.md)
- [Context Menus API](../permissions/contextMenus.md)
- [i18n API Reference](../api-reference/i18n-api.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
