# Build a Language Translator Extension

A step-by-step tutorial for building a Chrome extension that translates selected text via context menu, popup, or inline tooltip.

## What You'll Build

By the end of this tutorial, you'll have created a translation extension with:

- **Text selection translation**: Select any text on a webpage and translate it
- **Context menu integration**: Right-click menu option for quick translation
- **Popup interface**: Manual translation with language selection
- **Translation history**: Persistent storage of past translations
- **Language detection**: Auto-detect source language

## Prerequisites

- Chrome browser or Chromium-based browser
- Basic JavaScript, HTML, and CSS knowledge
- Familiarity with Chrome Extensions API

## Project Structure

```
language-translator/
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

## Manifest Configuration

Create `manifest.json` with the necessary permissions:

```json
{
  "manifest_version": 3,
  "name": "Page Translator",
  "version": "1.0.0",
  "description": "Translate selected text with context menu and popup",
  "permissions": [
    "activeTab",
    "storage",
    "contextMenus",
    "scripting"
  ],
  "action": {
    "default_popup": "popup/popup.html"
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

## Step 1: Set Up Context Menu

Create `background/service-worker.js` to handle context menu creation:

```javascript
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateSelection",
    title: "Translate selection",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateSelection") {
    chrome.tabs.sendMessage(tab.id, {
      action: "translate",
      text: info.selectionText
    });
  }
});
```

## Step 2: Content Script for Selection

Create `content/content.js` to handle text selection and show translation:

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    showTranslationTooltip(request.text, request.translation);
  }
});

function showTranslationTooltip(text, translation) {
  const tooltip = document.createElement('div');
  tooltip.className = 'translator-tooltip';
  tooltip.textContent = translation;
  document.body.appendChild(tooltip);
  
  setTimeout(() => tooltip.remove(), 5000);
}
```

## Step 3: Translation API Integration

Create `utils/translator.js` for API calls:

```javascript
const API_URL = 'https://api.mymemory.translated.net/get';

async function translateText(text, sourceLang, targetLang) {
  const url = `${API_URL}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return data.responseData.translatedText;
}

async function detectLanguage(text) {
  // Use first two characters as hint or default to 'en'
  return 'en';
}
```

## Step 4: Popup Interface

Create `popup/popup.html` and `popup/popup.js` for manual translation:

```html
<input type="text" id="sourceText" placeholder="Enter text">
<select id="targetLang">
  <option value="es">Spanish</option>
  <option value="fr">French</option>
  <option value="de">German</option>
</select>
<button id="translateBtn">Translate</button>
<div id="result"></div>
```

## Step 5: Options Page

Add an options page for user preferences:

```javascript
// options.js
chrome.storage.sync.get(['targetLanguage', 'apiKey'], (result) => {
  document.getElementById('targetLang').value = result.targetLanguage || 'es';
});
```

## Step 6: Translation History

Store translations in chrome.storage:

```javascript
async function saveHistory(original, translated, sourceLang, targetLang) {
  const history = await chrome.storage.local.get('history');
  const entries = history.history || [];
  
  entries.unshift({
    original,
    translated,
    sourceLang,
    targetLang,
    timestamp: Date.now()
  });
  
  await chrome.storage.local.set({ history: entries.slice(0, 100) });
}
```

## Testing Your Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select your extension folder
4. Select text on any webpage and right-click to translate
5. Test the popup interface for manual translation

## Next Steps

- Add keyboard shortcuts for quick translate
- Implement rate limiting to respect API limits
- Add support for RTL languages
- Integrate more translation APIs for reliability
- Add translation history popup

## Related Resources

- [Context Menus API](../api-reference/context-menus-api.md)
- [Keyboard Shortcuts](../guides/keyboard-shortcuts.md)
- [Storage API](../api-reference/storage-api.md)
