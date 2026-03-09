---
layout: post
title: "Build a Translation Chrome Extension: Translate Selected Text Instantly"
description: "Learn how to build a Chrome extension that translates selected text instantly. This step-by-step guide covers Manifest V3, content scripts, translation APIs, and publishing your extension to the Chrome Web Store."
date: 2025-04-12
categories: [Chrome Extensions, Tutorials]
tags: [translation, language, chrome-extension]
keywords: "chrome extension translate, build translation extension, translate text chrome extension, chrome extension translator, language translation chrome"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/12/build-translation-chrome-extension/"
---

# Build a Translation Chrome Extension: Translate Selected Text Instantly

Have you ever been reading a webpage in a foreign language and wished you could instantly translate just a few words without leaving the page? Perhaps you're researching topics in multiple languages, communicating with international clients, or simply exploring content from around the world. A translation Chrome extension that translates selected text with a single right-click or keyboard shortcut can dramatically improve your browsing experience and productivity.

In this comprehensive guide, we will walk you through the complete process of building a translation Chrome extension from scratch. You'll learn how to use the Chrome Extension Manifest V3, capture selected text from any webpage, integrate with translation APIs, display translations in a sleek popup, and publish your extension to the Chrome Web Store. By the end of this tutorial, you'll have a fully functional translation extension that you can use daily and share with the world.

---

## Why Build a Translation Chrome Extension? {#why-build-translation-extension}

The demand for translation tools continues to grow as the internet becomes increasingly globalized. Users frequently encounter content in languages they don't understand, whether it's product reviews from international shoppers, technical documentation in foreign languages, or social media posts from around the world. While browser-based translation tools exist, they often require copying and pasting text into separate tabs or using keyboard shortcuts that interrupt your workflow.

Building your own translation extension allows you to customize the user experience exactly as you want it. You can choose which translation service to use, design the popup interface to match your preferences, add keyboard shortcuts for quick access, and implement features like automatic language detection or history tracking. This project is an excellent learning opportunity because it covers many essential concepts in Chrome extension development, including content scripts, background service workers, browser storage, and message passing between different extension components.

Moreover, translation extensions are among the most popular categories in the Chrome Web Store. A well-designed translation tool with unique features can attract thousands or even millions of users, making it a potentially valuable project whether you're building it for learning, personal use, or as a commercial product.

---

## Prerequisites and Setup {#prerequisites}

Before we dive into coding, let's ensure you have everything you need to build this extension. You'll need a basic understanding of HTML, CSS, and JavaScript, as these are the core technologies used in Chrome extension development. No prior experience with Chrome extensions is required, but familiarity with web development concepts will help you follow along more easily.

You'll also need Google Chrome installed on your computer for testing your extension during development. Additionally, you'll need a code editor like Visual Studio Code, Sublime Text, or any other editor you prefer. For the translation functionality, we'll use the MyMemory Translation API, which is a free translation service that doesn't require an API key for basic usage, making it perfect for learning and prototyping.

Let's start by creating the project directory structure. Create a new folder called `translation-extension` and add the following files and folders:

- manifest.json — The configuration file that tells Chrome about your extension
- popup.html — The HTML for the extension's popup interface
- popup.js — The JavaScript that handles popup interactions
- popup.css — The styling for the popup
- content.js — A content script that captures selected text
- background.js — A service worker for handling background tasks
- icons/ — A folder containing your extension icons

---

## Creating the Manifest File {#manifest-file}

The manifest.json file is the heart of every Chrome extension. It defines the extension's permissions, resources, and behavior. For our translation extension, we need to specify the manifest version (Manifest V3 is the current standard), declare the permissions we need, and configure the popup and background scripts.

```json
{
  "manifest_version": 3,
  "name": "Instant Translate",
  "version": "1.0",
  "description": "Translate selected text instantly with a right-click or keyboard shortcut",
  "permissions": [
    "contextMenus",
    "storage",
    "activeTab"
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest file grants our extension the ability to add context menu items, store user preferences, and interact with the active tab. The content script will run on all URLs, allowing users to select and translate text from any webpage. The background service worker handles the context menu creation and coordinates communication between components.

---

## Building the Content Script {#content-script}

The content script is the part of your extension that runs in the context of web pages. It can read and modify page content, detect user interactions like text selection, and communicate with other parts of your extension. For our translation extension, the content script will listen for text selection events and send the selected text to the background script or popup.

Create a new file called `content.js` and add the following code:

```javascript
// Listen for text selection events
document.addEventListener('mouseup', function() {
  const selectedText = window.getSelection().toString().trim();
  
  if (selectedText.length > 0) {
    // Store the selected text temporarily
    chrome.storage.local.set({ selectedText: selectedText });
    
    // Notify the background script that text is available
    chrome.runtime.sendMessage({
      action: 'textSelected',
      text: selectedText
    });
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getSelectedText') {
    const selectedText = window.getSelection().toString().trim();
    sendResponse({ text: selectedText });
  }
  return true;
});
```

This script listens for the mouseup event, which fires when a user releases the mouse button after selecting text. When text is selected, it stores the text in Chrome's local storage and notifies the background script. It also listens for messages from the popup, allowing the popup to request the currently selected text on demand.

---

## Creating the Background Service Worker {#background-service-worker}

The background service worker in Manifest V3 handles tasks that need to run independently of any particular webpage. For our translation extension, the background script will create the context menu item that appears when users right-click on selected text, and it will manage communication between different parts of the extension.

Create `background.js` with the following code:

```javascript
// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: 'translateSelection',
    title: 'Translate: "%s"',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'translateSelection') {
    // Send message to content script to get selected text
    chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, function(response) {
      if (response && response.text) {
        // Open popup with the selected text
        chrome.action.openPopup();
      }
    });
  }
});

// Listen for text selection from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'textSelected') {
    // Store the latest selected text
    chrome.storage.local.set({ pendingText: request.text });
  }
});
```

The background script creates a context menu item labeled "Translate" that appears whenever a user selects text on any webpage. When clicked, it retrieves the selected text and opens the extension's popup. This provides an alternative way to trigger translation beyond clicking the extension icon.

---

## Designing the Popup Interface {#popup-interface}

The popup is what users see when they click the extension icon in the Chrome toolbar. For our translation extension, the popup will display the selected text, allow users to choose source and target languages, show the translation result, and provide options to copy the translation or swap languages.

Create `popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instant Translate</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Instant Translate</h1>
    </header>
    
    <div class="translation-panel">
      <div class="language-selector">
        <select id="sourceLang">
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
        <span class="swap-btn" id="swapBtn">⇄</span>
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
      
      <div class="text-container">
        <div class="input-section">
          <textarea id="sourceText" placeholder="Select text on any page or type here to translate..."></textarea>
        </div>
        
        <div class="output-section">
          <div id="translationResult" class="result-text"></div>
        </div>
      </div>
      
      <div class="actions">
        <button id="translateBtn" class="primary-btn">Translate</button>
        <button id="copyBtn" class="secondary-btn">Copy Translation</button>
      </div>
    </div>
    
    <footer>
      <p>Select text on any webpage and click translate</p>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

The popup interface is clean and intuitive, with dropdown menus for selecting source and target languages, a swap button to quickly reverse the translation direction, text areas for input and output, and action buttons for translating and copying the result.

---

## Styling the Popup {#popup-styling}

Create `popup.css` to make your extension visually appealing:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 350px;
  background-color: #f5f5f5;
}

.container {
  padding: 16px;
}

header h1 {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
  text-align: center;
}

.translation-panel {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.language-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.language-selector select {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.swap-btn {
  cursor: pointer;
  font-size: 18px;
  color: #666;
  padding: 4px 8px;
  transition: transform 0.2s;
}

.swap-btn:hover {
  transform: scale(1.2);
  color: #333;
}

.text-container {
  margin-bottom: 12px;
}

.input-section textarea {
  width: 100%;
  height: 80px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
}

.input-section textarea:focus {
  outline: none;
  border-color: #4a90d9;
}

.output-section {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  min-height: 80px;
  margin-bottom: 12px;
}

.result-text {
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  word-wrap: break-word;
}

.actions {
  display: flex;
  gap: 8px;
}

.primary-btn {
  flex: 1;
  padding: 10px;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-btn:hover {
  background: #357abd;
}

.secondary-btn {
  flex: 1;
  padding: 10px;
  background: #e0e0e0;
  color: #333;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.secondary-btn:hover {
  background: #d0d0d0;
}

footer {
  text-align: center;
  margin-top: 12px;
}

footer p {
  font-size: 12px;
  color: #888;
}
```

The CSS provides a clean, modern interface with proper spacing, readable typography, and interactive hover states for buttons. The layout is responsive and handles different text lengths gracefully.

---

## Implementing Translation Logic {#translation-logic}

Now comes the most important part — making the translation actually work. Create `popup.js` to handle the user interactions and communicate with the translation API:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  const sourceText = document.getElementById('sourceText');
  const translationResult = document.getElementById('translationResult');
  const sourceLang = document.getElementById('sourceLang');
  const targetLang = document.getElementById('targetLang');
  const translateBtn = document.getElementById('translateBtn');
  const copyBtn = document.getElementById('copyBtn');
  const swapBtn = document.getElementById('swapBtn');
  
  // Load saved text from storage when popup opens
  chrome.storage.local.get(['selectedText', 'pendingText'], function(result) {
    if (result.pendingText) {
      sourceText.value = result.pendingText;
      chrome.storage.local.remove('pendingText');
    } else if (result.selectedText) {
      sourceText.value = result.selectedText;
    }
  });
  
  // Translate button click handler
  translateBtn.addEventListener('click', async function() {
    const text = sourceText.value.trim();
    if (!text) {
      translationResult.textContent = 'Please enter or select text to translate';
      return;
    }
    
    const source = sourceLang.value;
    const target = targetLang.value;
    
    translationResult.textContent = 'Translating...';
    
    try {
      const translatedText = await translateText(text, source, target);
      translationResult.textContent = translatedText;
    } catch (error) {
      translationResult.textContent = 'Error: ' + error.message;
    }
  });
  
  // Copy button click handler
  copyBtn.addEventListener('click', function() {
    const text = translationResult.textContent;
    if (text && text !== 'Translating...' && !text.startsWith('Error:')) {
      navigator.clipboard.writeText(text).then(function() {
        copyBtn.textContent = 'Copied!';
        setTimeout(function() {
          copyBtn.textContent = 'Copy Translation';
        }, 2000);
      });
    }
  });
  
  // Swap languages button
  swapBtn.addEventListener('click', function() {
    const temp = sourceLang.value;
    sourceLang.value = targetLang.value;
    
    // If source was auto, don't swap to it
    if (temp !== 'auto') {
      targetLang.value = temp;
    }
    
    // Also swap the text
    if (translationResult.textContent && 
        translationResult.textContent !== 'Translating...' && 
        !translationResult.textContent.startsWith('Error:')) {
      sourceText.value = translationResult.textContent;
      translationResult.textContent = '';
    }
  });
  
  // Translation function using MyMemory API
  async function translateText(text, source, target) {
    const langPair = source === 'auto' ? '' : `${source}|`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}${target}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Translation service unavailable');
    }
    
    const data = await response.json();
    
    if (data.responseStatus !== 200) {
      throw new Error(data.responseDetails || 'Translation failed');
    }
    
    return data.responseData.translatedText;
  }
  
  // Handle Enter key in textarea
  sourceText.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      translateBtn.click();
    }
  });
});
```

This JavaScript file handles all the interactivity in the popup. It retrieves any previously selected text from storage, calls the MyMemory Translation API to perform the translation, displays the result in the popup, and provides convenient copy and language swap features. The translation function makes an asynchronous API call and properly handles errors.

---

## Creating Extension Icons {#extension-icons}

Every Chrome extension needs icons in various sizes. For development purposes, you can create simple placeholder images. The Chrome Web Store requires 16x16, 48x48, and 128x128 pixel icons. Create an `icons` folder and add placeholder PNG images in those sizes. You can use any image editing software or even generate simple colored squares for testing.

For a production extension, you should design professional-looking icons that represent translation functionality — common choices include globe icons, language bubbles, or arrow symbols indicating conversion between languages.

---

## Testing Your Extension {#testing-extension}

Now that we've created all the necessary files, let's test the extension in Chrome. Open Chrome and navigate to `chrome://extensions/`. Enable "Developer mode" using the toggle in the top right corner. Click "Load unpacked" and select your `translation-extension` folder.

The extension should now appear in your toolbar. Visit any webpage, select some text with your mouse, and click the extension icon. The selected text should appear in the popup, and clicking "Translate" should display the translation. You can also right-click on selected text to see the "Translate" context menu option.

If you encounter any issues, check the extension's background page for error messages. You can access this from the Chrome extensions page by clicking "Service worker" under your extension's entry.

---

## Publishing to the Chrome Web Store {#publishing}

Once you're satisfied with your extension and have tested it thoroughly, you can publish it to the Chrome Web Store. First, create a developer account at the Chrome Web Store if you don't already have one. Package your extension by going to `chrome://extensions/`, clicking "Pack extension", and selecting your extension folder.

You'll receive a `.zip` file and a key file. Upload the `.zip` file to the Chrome Web Store Developer Dashboard. Fill in the required information, including the extension name, description, and screenshots. After review, your extension will be available for Chrome users worldwide.

---

## Conclusion {#conclusion}

Congratulations! You've successfully built a fully functional translation Chrome extension from scratch. This project demonstrates many fundamental concepts in Chrome extension development, including Manifest V3 configuration, content scripts for interacting with web pages, background service workers for managing extension state, popup interfaces for user interaction, and integration with external APIs.

The extension you built can be extended in many ways. You could add support for more translation APIs, implement translation history with local storage, add keyboard shortcuts for quick access, support more languages, or integrate with dictionary services to show definitions alongside translations. The possibilities are endless, and the skills you've learned in this tutorial provide a solid foundation for building any type of Chrome extension you can imagine.

Remember to keep your extension updated, respond to user feedback, and continuously improve the user experience. With dedication and creativity, your translation extension could become a valuable tool for millions of Chrome users around the world. Happy coding!
