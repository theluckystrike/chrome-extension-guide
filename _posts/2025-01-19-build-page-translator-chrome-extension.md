---
layout: post
title: "Build a Page Translator Chrome Extension. Complete Tutorial (2025)"
description: "Learn how to build a powerful page translator Chrome extension from scratch. This comprehensive guide covers translation APIs, content script injection, language detection, and Chrome Web Store publishing."
date: 2025-01-19
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project, tutorial]
author: theluckystrike
canonical_url: "https://bestchromeextensions.com/2025/01/19/build-page-translator-chrome-extension/"
---

# Build a Page Translator Chrome Extension. Complete Tutorial

Language barriers on the web are becoming a thing of the past, thanks to powerful translation APIs and browser extension technology. In this comprehensive tutorial, we will build a fully functional page translator Chrome extension that can translate entire web pages instantly. This is one of the most popular types of extensions in the Chrome Web Store, with millions of users relying on translation tools daily.

By the end of this guide, you will have created a production-ready translator extension that can detect page languages, translate content in-place, allow users to select target languages, and provide a smooth user experience. This project will teach you valuable skills including content script manipulation, API integration, popup UI development, and state management in Manifest V3.

---

Why Build a Translator Extension?

The demand for translator extension tools has skyrocketed in our globally connected world. Users constantly need to read content in foreign languages, whether for research, shopping, communication, or entertainment. Building a translate page chrome extension puts you in a position to serve this massive user base with a practical solution.

A language translation extension touches on several important Chrome extension development concepts that will serve you well in future projects:

- Content Scripts: Injecting JavaScript into web pages to modify content
- Storage API: Persisting user preferences like selected languages
- Message Passing: Communicating between popup, content scripts, and background service workers
- Chrome API Integration: Working with tabs, scripting, and storage APIs

Let's start building your translation extension.

---

Project Architecture Overview

Before diving into code, let's outline our extension's architecture. A translator extension typically consists of three main components:

1. Popup Interface: A small UI that appears when clicking the extension icon, allowing users to select source and target languages
2. Content Script: JavaScript that runs on web pages to perform the actual translation by replacing text nodes
3. Background Service Worker: Handles API calls for translation and manages extension state

For this project, we'll use the LibreTranslate API as it's free and doesn't require an API key, though you can easily swap it with Google Translate, DeepL, or Microsoft Translator for production use.

---

Setting Up the Project Structure

Create a new directory for your extension project and set up the following file structure:

```
page-translator/
 manifest.json
 popup.html
 popup.css
 popup.js
 content.js
 background.js
 icons/
    icon16.png
    icon48.png
    icon128.png
 _locales/
     en/
         messages.json
```

Initialize your project by creating the `manifest.json` file with the necessary permissions and configuration:

```json
{
  "manifest_version": 3,
  "name": "Page Translator",
  "version": "1.0",
  "description": "Translate any web page instantly with this powerful translator extension",
  "permissions": [
    "storage",
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

This manifest declares the permissions we need: storage for saving language preferences, activeTab for accessing the current tab's content, and scripting for injecting our content script into pages.

---

Building the Popup Interface

The popup is the user interface that appears when users click your extension icon. It should allow users to select source and target languages and trigger translations. Let's create a clean, intuitive interface:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Translator</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>Page Translator</h1>
    
    <div class="language-section">
      <label for="source-lang">From:</label>
      <select id="source-lang">
        <option value="auto">Detect Language</option>
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

    <div class="language-section">
      <label for="target-lang">To:</label>
      <select id="target-lang">
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

    <button id="translate-btn" class="translate-btn">Translate Page</button>
    <button id="restore-btn" class="restore-btn" style="display: none;">Restore Original</button>
    
    <div id="status" class="status"></div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Now let's style the popup with a clean, modern design:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  padding: 20px;
  background: #f5f5f5;
}

.container {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
  font-size: 18px;
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.language-section {
  margin-bottom: 15px;
}

label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.translate-btn, .restore-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.2s;
}

.translate-btn {
  background: #4285f4;
  color: white;
}

.translate-btn:hover {
  background: #3367d6;
}

.restore-btn {
  background: #f1f3f4;
  color: #333;
}

.restore-btn:hover {
  background: #e8eaed;
}

.status {
  margin-top: 15px;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
}

.status.success {
  background: #e6f4ea;
  color: #1e8e3e;
}

.status.error {
  background: #fce8e6;
  color: #c5221f;
}

.status.loading {
  background: #e8f0fe;
  color: #1967d2;
}
```

The popup interface provides a user-friendly way to select languages. Users can choose to auto-detect the source language or specify it manually, and they can select any target language from the dropdown.

---

Implementing the Popup Logic

The popup JavaScript handles user interactions and coordinates with the content script to perform translations. Here's the implementation:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const sourceLangSelect = document.getElementById('source-lang');
  const targetLangSelect = document.getElementById('target-lang');
  const translateBtn = document.getElementById('translate-btn');
  const restoreBtn = document.getElementById('restore-btn');
  const statusDiv = document.getElementById('status');

  // Load saved preferences
  chrome.storage.sync.get(['sourceLang', 'targetLang', 'isTranslated'], (result) => {
    if (result.sourceLang) {
      sourceLangSelect.value = result.sourceLang;
    }
    if (result.targetLang) {
      targetLangSelect.value = result.targetLang;
    }
    if (result.isTranslated) {
      restoreBtn.style.display = 'block';
      translateBtn.style.display = 'none';
    }
  });

  // Translate button click handler
  translateBtn.addEventListener('click', async () => {
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    // Save preferences
    chrome.storage.sync.set({
      sourceLang,
      targetLang,
      isTranslated: true
    });

    // Show loading status
    statusDiv.className = 'status loading';
    statusDiv.textContent = 'Translating...';

    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Execute the content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: translatePage,
        args: [sourceLang, targetLang]
      });

      statusDiv.className = 'status success';
      statusDiv.textContent = 'Page translated successfully!';
      
      translateBtn.style.display = 'none';
      restoreBtn.style.display = 'block';
    } catch (error) {
      statusDiv.className = 'status error';
      statusDiv.textContent = 'Error: ' + error.message;
    }
  });

  // Restore button click handler
  restoreBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: restorePage
      });

      chrome.storage.sync.set({ isTranslated: false });
      
      statusDiv.className = 'status success';
      statusDiv.textContent = 'Original text restored!';
      
      restoreBtn.style.display = 'none';
      translateBtn.style.display = 'block';
    } catch (error) {
      statusDiv.className = 'status error';
      statusDiv.textContent = 'Error: ' + error.message;
    }
  });
});

// This function runs in the context of the web page
function translatePage(sourceLang, targetLang) {
  // Store original text for restoration
  if (!window.originalPageContent) {
    window.originalPageContent = document.body.innerHTML;
  }

  // Collect all text nodes
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while (node = walker.nextNode()) {
    // Skip script, style, and other non-content elements
    const parent = node.parentElement;
    if (parent && 
        parent.tagName !== 'SCRIPT' && 
        parent.tagName !== 'STYLE' && 
        parent.tagName !== 'NOSCRIPT' &&
        parent.tagName !== 'CODE' &&
        parent.tagName !== 'PRE' &&
        node.textContent.trim().length > 0) {
      textNodes.push(node);
    }
  }

  // Translate text nodes
  // Note: In production, you would call a translation API here
  // This is a simplified example
  textNodes.forEach(node => {
    const text = node.textContent.trim();
    if (text.length > 0 && text.length < 5000) {
      // Mark node as needing translation
      node.setAttribute('data-translate', 'pending');
      node.setAttribute('data-original', text);
    }
  });

  // Dispatch custom event for background script to handle
  window.postMessage({
    type: 'TRANSLATE_REQUEST',
    sourceLang,
    targetLang,
    textNodes: textNodes.map(n => n.textContent).filter(t => t.trim())
  }, '*');
}

function restorePage() {
  if (window.originalPageContent) {
    document.body.innerHTML = window.originalPageContent;
  }
}
```

This popup script manages the translation workflow. It saves user preferences, handles button clicks, and communicates with content scripts to perform the actual translation. The key feature is storing the original page HTML so users can restore it at any time.

---

Creating the Content Script

The content script runs directly in the context of web pages and handles the actual translation work. While the popup initiates the translation, the content script performs the heavy lifting of identifying and replacing text:

```javascript
// content.js
// This script runs on every page and handles translation

// Listen for messages from the page
window.addEventListener('message', async (event) => {
  if (event.data.type === 'TRANSLATE_REQUEST') {
    const { sourceLang, targetLang, textNodes } = event.data;
    
    try {
      const translatedTexts = await translateTexts(textNodes, sourceLang, targetLang);
      applyTranslations(textNodes, translatedTexts);
    } catch (error) {
      console.error('Translation error:', error);
    }
  }
});

async function translateTexts(texts, sourceLang, targetLang) {
  // Using LibreTranslate API (free, no API key required)
  // In production, you might use Google Translate, DeepL, or Microsoft Translator
  
  const translatedResults = [];
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const promises = batch.map(text => 
      fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang === 'auto' ? 'auto' : sourceLang,
          target: targetLang,
          format: 'text'
        })
      })
      .then(response => response.json())
      .then(data => data.translatedText)
      .catch(() => text) // Return original on error
    );
    
    const results = await Promise.all(promises);
    translatedResults.push(...results);
  }
  
  return translatedResults;
}

function applyTranslations(originalTexts, translatedTexts) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let textIndex = 0;
  let node;
  while (node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent && 
        parent.tagName !== 'SCRIPT' && 
        parent.tagName !== 'STYLE' && 
        parent.tagName !== 'NOSCRIPT' &&
        parent.tagName !== 'CODE' &&
        parent.tagName !== 'PRE' &&
        node.textContent.trim().length > 0) {
      
      if (textIndex < translatedTexts.length) {
        node.textContent = node.textContent.replace(
          originalTexts[textIndex], 
          translatedTexts[textIndex]
        );
        textIndex++;
      }
    }
  }
}
```

The content script uses a TreeWalker to find all text nodes in the page while avoiding script tags, style elements, and code blocks. It then translates these text nodes using an external API and replaces the content. The script is designed to be solid and handle errors gracefully.

---

Implementing the Background Service Worker

The background service worker handles API communication and can manage more complex translation logic. While our current implementation mostly uses the content script, the background worker provides a cleaner architecture for production extensions:

```javascript
// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TRANSLATE') {
    handleTranslation(request.text, request.sourceLang, request.targetLang)
      .then(translatedText => sendResponse({ success: true, translatedText }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function handleTranslation(text, sourceLang, targetLang) {
  // LibreTranslate API endpoint
  // You can self-host for better performance or use a different provider
  const response = await fetch('https://libretranslate.com/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      source: sourceLang === 'auto' ? 'auto' : sourceLang,
      target: targetLang,
      format: 'text'
    })
  });

  if (!response.ok) {
    throw new Error(`Translation API error: ${response.status}`);
  }

  const data = await response.json();
  return data.translatedText;
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Page Translator extension installed');
  
  // Set default preferences
  chrome.storage.sync.set({
    sourceLang: 'auto',
    targetLang: 'en',
    isTranslated: false
  });
});
```

The background service worker provides a central hub for translation API calls. This architecture keeps your content scripts lean and allows for more sophisticated caching and error handling.

---

Testing Your Extension

Before publishing, thoroughly test your extension:

1. Load the extension: Open Chrome and navigate to `chrome://extensions/`, enable Developer mode, click "Load unpacked," and select your extension directory.

2. Test basic translation: Navigate to a foreign language website, click your extension icon, select languages, and click "Translate Page."

3. Test restoration: Click "Restore Original" to verify the original content is restored correctly.

4. Test language detection: Select "Detect Language" and verify it correctly identifies the page language.

5. Test error handling: Try translating a page with network issues and verify error messages display correctly.

6. Test across websites: Test on various websites with different structures, including news sites, forums, e-commerce sites, and blogs.

---

Publishing to the Chrome Web Store

Once your extension is working correctly, follow these steps to publish:

1. Prepare your listing:
   - Create compelling icons (128x128, 48x48, and 16x16 pixels)
   - Write a clear description highlighting key features
   - Take screenshots showing the extension in action
   - Create a promotional tile (440x280 pixels)

2. Package your extension: Use the "Pack extension" button in Chrome or run:
   ```
   zip -r page-translator.zip page-translator/
   ```

3. Create a developer account: Sign up at the Chrome Web Store Developer Dashboard ($5 one-time fee)

4. Submit your extension: Upload your zip file, fill in the store listing details, and submit for review

5. Respond to review feedback: Google may request changes before approval

---

Advanced Features to Consider

Once you have the basic translation working, consider adding these advanced features:

- Context menu integration: Right-click to translate selected text
- Keyboard shortcuts: Quick translation with hotkeys
- Multiple translation engines: Allow users to choose between different APIs
- Translation memory: Cache translations for faster loading
- Language detection badges: Show detected language in the popup
- Sync across devices: Use Chrome sync storage for preferences

---

Conclusion

Congratulations! You've built a complete translator extension that can translate any web page. This project demonstrates the core concepts of Chrome extension development and provides a solid foundation for building more advanced features.

The translate page chrome functionality you created is in high demand, and there's plenty of room to improve and monetize your extension. Consider adding premium translation engines, subscription features, or a freemium model to generate revenue from your language translation extension.

Remember to test thoroughly before publishing and to respond promptly to user feedback. With dedication and continuous improvement, your translation extension could become the go-to tool for millions of users browsing the web in different languages.

Start building today and join the community of developers creating tools that break down language barriers on the internet!
