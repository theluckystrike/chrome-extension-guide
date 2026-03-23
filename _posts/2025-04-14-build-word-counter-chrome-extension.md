---
layout: post
title: "Build a Word Counter Chrome Extension: Count Text on Any Webpage"
description: "Learn how to build a word counter Chrome extension that counts text on any webpage. Step-by-step guide covering Manifest V3, content scripts, and character counting."
date: 2025-04-14
categories: [Chrome-Extensions, Tutorials]
tags: [word-counter, text, chrome-extension]
keywords: "chrome extension word counter, count words chrome, text counter chrome extension, build word count extension, character counter chrome"
canonical_url: "https://bestchromeextensions.com/2025/04/14/build-word-counter-chrome-extension/"
---

# Build a Word Counter Chrome Extension: Count Text on Any Webpage

Have you ever needed to quickly count the words in an article you are reading, a document you are editing, or text on any webpage? Whether you are a writer checking article length, a student working on an assignment, or a content creator ensuring your social media posts meet character limits, a word counter is an invaluable tool. we will walk you through building a fully functional word counter Chrome extension that works on any webpage you visit.

Chrome extensions are one of the most practical projects you can build as a beginner developer. They require only HTML, CSS, and JavaScript knowledge, and they provide immediate utility in your daily browsing experience. By the end of this tutorial, you will have created a Chrome extension that can count words, characters, and sentences on any webpage with just a few clicks.

---

Why Build a Word Counter Chrome Extension? {#why-build-word-counter}

Before we dive into the code, let us discuss why building a word counter extension is an excellent project for developers of all skill levels.

Practical Everyday Use

A word counter is something you will actually use. Writers constantly need to check their word count to meet submission requirements or stay within blog post length guidelines. Students need to ensure they meet essay word limits. Social media managers must adhere to character limits on platforms like Twitter (X), LinkedIn, and Instagram. Having a reliable word counter accessible from any webpage solves these real problems.

Learning Fundamental Concepts

Building a word counter Chrome extension teaches you several essential concepts that apply to virtually every Chrome extension you will build in the future. You will learn how to work with content scripts that run on webpages, how to create popup interfaces, how to use Chrome storage APIs, and how to structure a Manifest V3 extension project.

Foundation for More Complex Extensions

The techniques you learn in this project serve as the foundation for more sophisticated text analysis tools. Once you can count words, you can expand into readability scoring, keyword density analysis, grammar checking, and more advanced natural language processing features.

---

Prerequisites {#prerequisites}

Before we begin, make sure you have the following:

- Google Chrome browser installed on your computer
- A text editor such as Visual Studio Code, Sublime Text, or any code editor you prefer
- Basic knowledge of HTML, CSS, and JavaScript
- No prior Chrome extension experience required

That is it! If you can write a simple web page, you can build a Chrome extension.

---

Project Structure {#project-structure}

Every Chrome extension needs a specific file structure. For our word counter extension, we will create the following files:

```
word-counter-extension/
 manifest.json
 popup.html
 popup.js
 popup.css
 content.js
 icons/
     icon16.png
     icon48.png
     icon128.png
```

The manifest.json file tells Chrome about your extension. The popup files create the interface that appears when you click the extension icon. The content.js file is the script that runs on webpages to analyze text. We will create simple placeholder icons for now.

---

Step 1: Creating the Manifest File {#step-1-manifest}

The manifest.json file is the configuration file for your Chrome extension. It defines the extension name, version, permissions, and which files to load. For Manifest V3 (the current standard), here is what our manifest looks like:

```json
{
  "manifest_version": 3,
  "name": "Word Counter Pro",
  "version": "1.0.0",
  "description": "Count words, characters, and sentences on any webpage",
  "permissions": [
    "activeTab",
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

This manifest declares that our extension:
- Uses Manifest V3 (the latest standard)
- Has the name "Word Counter Pro" with version 1.0.0
- Requires permission to access the active tab and run scripts
- Opens a popup when clicked
- Includes icons in three sizes

Notice that we do not need extensive permissions like "storage" or "<all_urls>" for this basic version. We only need "activeTab" to access the current page and "scripting" to execute our content script.

---

Step 2: Creating the Popup Interface {#step-2-popup}

The popup is what users see when they click your extension icon in the Chrome toolbar. We will create a clean, simple interface that displays the word count results.

popup.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Word Counter</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>Word Counter</h1>
    <p class="instruction">Select text on any webpage and click Analyze to count words.</p>
    
    <button id="analyzeBtn" class="btn">Analyze Selection</button>
    
    <div id="results" class="results hidden">
      <div class="stat">
        <span class="label">Words:</span>
        <span id="wordCount" class="value">0</span>
      </div>
      <div class="stat">
        <span class="label">Characters:</span>
        <span id="charCount" class="value">0</span>
      </div>
      <div class="stat">
        <span class="label">Characters (no spaces):</span>
        <span id="charCountNoSpaces" class="value">0</span>
      </div>
      <div class="stat">
        <span class="label">Sentences:</span>
        <span id="sentenceCount" class="value">0</span>
      </div>
      <div class="stat">
        <span class="label">Paragraphs:</span>
        <span id="paragraphCount" class="value">0</span>
      </div>
    </div>
    
    <p id="noSelection" class="message hidden">Please select some text on the page first.</p>
    <p id="error" class="message error hidden">Error analyzing text. Please try again.</p>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

This HTML creates a clean popup with a button to analyze selected text and displays five different metrics: words, characters (with and without spaces), sentences, and paragraphs. We also include error messages for when no text is selected or something goes wrong.

popup.css

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 300px;
  padding: 20px;
  background-color: #ffffff;
  color: #333;
}

h1 {
  font-size: 20px;
  margin-bottom: 10px;
  color: #1a73e8;
}

.instruction {
  font-size: 13px;
  color: #666;
  margin-bottom: 20px;
  line-height: 1.4;
}

.btn {
  width: 100%;
  padding: 12px;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: #1557b0;
}

.btn:active {
  background-color: #0d47a1;
}

.results {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.hidden {
  display: none;
}

.stat {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.stat:last-child {
  border-bottom: none;
}

.label {
  font-size: 13px;
  color: #666;
}

.value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.message {
  margin-top: 15px;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  text-align: center;
}

.error {
  background-color: #ffebee;
  color: #c62828;
}
```

The CSS styles our popup to look modern and professional, matching Chrome's design language. We use a clean white background, the standard Chrome blue (#1a73e0) for the primary action button, and subtle spacing throughout.

---

Step 3: Creating the Content Script {#step-3-content-script}

The content script is what runs on the actual webpage to analyze the selected text. This is where the core logic of our extension lives.

content.js

```javascript
// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeText') {
    try {
      // Get the selected text from the page
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (!selectedText) {
        sendResponse({ error: 'no_selection' });
        return;
      }
      
      // Perform the analysis
      const analysis = analyzeText(selectedText);
      sendResponse({ success: true, data: analysis });
    } catch (error) {
      sendResponse({ error: 'analysis_failed' });
    }
  }
  
  // Return true to indicate we will respond asynchronously
  return true;
});

// Core text analysis function
function analyzeText(text) {
  // Count words (split by whitespace and filter empty strings)
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  // Count characters (including spaces)
  const charCount = text.length;
  
  // Count characters (excluding spaces)
  const charCountNoSpaces = text.replace(/\s/g, '').length;
  
  // Count sentences (split by sentence-ending punctuation)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length || (text.length > 0 ? 1 : 0);
  
  // Count paragraphs (split by line breaks)
  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
  const paragraphCount = paragraphs.length || (text.length > 0 ? 1 : 0);
  
  return {
    wordCount,
    charCount,
    charCountNoSpaces,
    sentenceCount,
    paragraphCount
  };
}
```

The content script listens for messages from the popup and performs text analysis when requested. We use regular expressions to split text into words, sentences, and paragraphs. The core logic is straightforward: we split the text by appropriate delimiters and count the resulting elements.

---

Step 4: Creating the Popup Logic {#step-4-popup-js}

Now we need to connect the popup to the content script. The popup JavaScript handles button clicks and communicates with the content script.

popup.js

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultsDiv = document.getElementById('results');
  const noSelectionMsg = document.getElementById('noSelection');
  const errorMsg = document.getElementById('error');
  
  // Word count display elements
  const wordCountEl = document.getElementById('wordCount');
  const charCountEl = document.getElementById('charCount');
  const charCountNoSpacesEl = document.getElementById('charCountNoSpaces');
  const sentenceCountEl = document.getElementById('sentenceCount');
  const paragraphCountEl = document.getElementById('paragraphCount');
  
  analyzeBtn.addEventListener('click', async () => {
    // Hide previous results and messages
    resultsDiv.classList.add('hidden');
    noSelectionMsg.classList.add('hidden');
    errorMsg.classList.add('hidden');
    
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Execute the content script to analyze selected text
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'analyzeText' });
      
      if (response.error) {
        if (response.error === 'no_selection') {
          noSelectionMsg.classList.remove('hidden');
        } else {
          errorMsg.classList.remove('hidden');
        }
        return;
      }
      
      if (response.success) {
        // Display the results
        wordCountEl.textContent = response.data.wordCount;
        charCountEl.textContent = response.data.charCount;
        charCountNoSpacesEl.textContent = response.data.charCountNoSpaces;
        sentenceCountEl.textContent = response.data.sentenceCount;
        paragraphCountEl.textContent = response.data.paragraphCount;
        
        resultsDiv.classList.remove('hidden');
      }
    } catch (error) {
      console.error('Error:', error);
      errorMsg.classList.remove('hidden');
    }
  });
});
```

The popup script queries the active tab and sends a message to the content script requesting text analysis. When the response comes back, it updates the DOM with the calculated values. We handle three scenarios: successful analysis, no text selected, and errors.

---

Step 5: Loading and Testing the Extension {#step-5-testing}

Now that all the files are created, it is time to load your extension into Chrome and test it.

Loading the Extension

1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click the "Load unpacked" button that appears on the top left
4. Select the folder containing your extension files (the folder with manifest.json)

Your extension should now appear in the Chrome toolbar! You should see a new icon next to your address bar.

Using the Extension

1. Navigate to any webpage with text content (a news article, blog post, or document)
2. Select some text by clicking and dragging
3. Click your Word Counter extension icon in the toolbar
4. Click the "Analyze Selection" button

You should see the word count, character count, and other metrics displayed in the popup. If you get an error, make sure you have selected some text on the page first, the extension requires a text selection to analyze.

Troubleshooting Common Issues

If your extension is not working, here are some common problems and solutions:

The extension icon does not appear: Make sure you loaded the extension correctly in `chrome://extensions/`. Check for any error messages in that page.

The analysis returns zero: Ensure you have selected actual text on the page. The selection must contain visible characters, whitespace alone will not work.

The popup does not open: Check the browser console for errors. Open the popup, right-click, and choose "Inspect" to see any JavaScript errors.

The content script does not run: Some websites have Content Security Policy (CSP) restrictions that prevent external scripts from running. This is a limitation you may encounter on certain sites.

---

Step 6: Enhancing Your Extension {#step-6-enhancements}

Now that you have a working word counter, here are some ideas to make it even better:

Add Page-Wide Analysis

Modify the extension to analyze all text on the page, not just the selected text. This requires adding "document" to the matches array in your manifest and modifying the content script to iterate through all paragraph elements.

Add Reading Time Estimate

Calculate estimated reading time based on an average reading speed of 200-250 words per minute. This is a popular feature in many productivity extensions.

Add Local Storage

Use the Chrome storage API to remember the user's last analysis or track word counts over time. This requires adding "storage" permission to your manifest.

Add Keyboard Shortcut

Register a keyboard shortcut so users can analyze text without using the mouse. This requires adding a "commands" section to your manifest.

Add Copy-Paste Analysis

Allow users to paste text directly into the popup for analysis. This is useful when they want to analyze text from a source outside their browser.

---

How Chrome Extension Architecture Works {#architecture-explained}

Understanding how the different parts of your extension work together will help you build more advanced extensions in the future.

The Popup Lifecycle

The popup is a mini web page that loads when you click the extension icon and unloads when you close it. This means any JavaScript variables you set in the popup are lost when the popup closes. If you need to persist data, use the Chrome storage API.

Content Script Isolation

Content scripts run in the context of the web page but have limited access to the page's JavaScript variables. They share the DOM with the page's scripts but exist in an isolated world. This is a security feature that prevents extensions from accidentally interfering with page functionality.

Message Passing

The popup and content script communicate through Chrome's message passing API. The popup sends a message using `chrome.tabs.sendMessage()`, and the content script listens using `chrome.runtime.onMessage.addListener()`. This architecture keeps the popup lightweight and ensures the content script handles all page interaction.

---

Publishing Your Extension {#publishing}

Once you are satisfied with your extension, you can publish it to the Chrome Web Store:

1. Create a developer account at the Chrome Web Store
2. Package your extension into a ZIP file
3. Upload your ZIP file to the Chrome Web Store Developer Dashboard
4. Add screenshots, a detailed description, and category information
5. Submit for review (usually takes 1-3 business days)

Publishing is free for individual developers, though there is a $5 one-time fee for developer accounts in some regions.

---

Conclusion {#conclusion}

Congratulations! You have successfully built a fully functional word counter Chrome extension from scratch. You learned how to create a Manifest V3 extension, build a popup interface, write a content script for page interaction, and connect everything together with message passing.

This project gave you practical experience with the core concepts of Chrome extension development. The skills you learned, working with content scripts, creating popup interfaces, and using Chrome's APIs, apply directly to any extension you want to build in the future.

Now that you have a working extension, consider expanding it with the enhancement ideas we discussed. Add page-wide analysis, reading time estimates, or local storage to make it even more useful. The Chrome extension ecosystem offers endless possibilities for solving real problems and reaching millions of users through the Chrome Web Store.

Start building today, and you might be surprised at how quickly you can go from idea to working prototype to published extension. The tools and concepts are simpler than you might expect, and the learning curve is gentle if you already know basic web development.

Happy coding!
