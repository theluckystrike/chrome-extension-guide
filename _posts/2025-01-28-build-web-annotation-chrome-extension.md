---
layout: post
title: "Build a Web Annotation Chrome Extension: Complete 2025 Guide"
description: "Learn how to build a web annotation Chrome extension that allows users to highlight text, annotate web pages, and save annotations. This comprehensive guide covers Manifest V3, content scripts, storage APIs, and best practices."
date: 2025-01-28
categories: [Chrome-Extensions, Productivity]
tags: [chrome-extension, productivity, project]
keywords: "web annotation extension, highlight text chrome, annotate web pages, chrome extension development tutorial"
canonical_url: "https://bestchromeextensions.com/2025/01/28/build-web-annotation-chrome-extension/"
---

Build a Web Annotation Chrome Extension: Complete 2025 Guide

Web annotation tools have transformed how we interact with online content. Whether you are a researcher collecting sources, a student studying for exams, or a professional reviewing documents, the ability to highlight text and add notes directly on web pages has become essential. we will walk you through building a fully functional web annotation Chrome extension from scratch.

This project will teach you fundamental Chrome extension development concepts while creating something genuinely useful. By the end of this tutorial, you will have built an extension that allows users to highlight text on any webpage, add personal notes to those highlights, and access their saved annotations whenever needed.

---

Why Build a Web Annotation Extension? {#why-build}

The demand for web annotation tools continues to grow as more people work and study online. A well-designed web annotation extension solves real problems for researchers, students, journalists, and knowledge workers. Building this extension will give you hands-on experience with several Chrome extension APIs while creating a product that people actually want to use.

This project will teach you how to work with content scripts that interact with web page DOM, use the Chrome storage API to persist user data, implement popup interfaces for viewing annotations, and handle cross-page state management. These are essential skills for any Chrome extension developer.

The web annotation extension market is not saturated with quality options. Many existing solutions are either overly complicated, require accounts, or lack essential features. A clean, simple, and fast annotation tool can differentiate itself and attract a loyal user base.

---

Understanding the Extension Architecture {#architecture}

Before writing code, let us understand how our web annotation extension will work. A typical annotation extension consists of several components that work together smoothly.

Core Components

The manifest file defines our extension metadata and declares which permissions we need. For a web annotation extension, we will need permissions to access the active tab, execute content scripts, and store data using the Chrome storage API.

Content scripts are JavaScript files that run in the context of web pages. These scripts will handle text selection, highlight creation, and DOM manipulation. Content scripts can access and modify the page content, which is essential for rendering highlights directly on the web page.

The popup is the small window that appears when clicking our extension icon. This interface will display saved annotations, allow users to manage their highlights, and provide quick access to annotation features.

Background scripts (or service workers in Manifest V3) handle extension-wide logic, message passing between components, and long-running tasks. While our extension might not need complex background processing, understanding this architecture is valuable.

---

Setting Up the Project Structure {#project-structure}

Create a new folder for your extension project and set up the following file structure:

```
web-annotation-extension/
 manifest.json
 popup.html
 popup.js
 popup.css
 content.js
 background.js
 icon.png
 README.md
```

This structure separates our concerns clearly. The manifest defines configuration, content.js handles page interactions, popup files manage the user interface, and background.js handles any server-side logic.

---

Creating the Manifest File {#manifest}

The manifest.json file is the heart of our Chrome extension. Here is our Manifest V3 compatible configuration:

```json
{
  "manifest_version": 3,
  "name": "Web Highlighter Pro",
  "version": "1.0.0",
  "description": "Highlight text and annotate any web page. Save your annotations for later reference.",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "48": "icon.png",
    "128": "icon.png"
  }
}
```

This manifest declares the minimum permissions needed for our annotation functionality. We use the storage permission to save highlights, scripting to inject content scripts, and activeTab to communicate with the current page.

---

Implementing Content Scripts for Text Highlighting {#content-scripts}

The content script is where the magic happens. This JavaScript file runs in the context of every web page and handles text selection, highlight creation, and DOM manipulation.

Basic Content Script Setup

```javascript
// content.js
(function() {
  // State management
  let isAnnotating = false;
  let currentHighlights = [];
  
  // Initialize extension functionality
  function init() {
    document.addEventListener('mouseup', handleTextSelection);
    loadExistingHighlights();
  }
  
  // Handle text selection
  function handleTextSelection(event) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0 && isAnnotating) {
      createHighlight(selection, selectedText);
    }
  }
  
  // Create visual highlight on the page
  function createHighlight(selection, text) {
    const range = selection.getRangeAt(0);
    const highlight = document.createElement('span');
    highlight.className = 'annotation-highlight';
    highlight.style.backgroundColor = '#ffeb3b';
    highlight.style.borderRadius = '2px';
    highlight.style.padding = '0 2px';
    highlight.dataset.text = text;
    highlight.dataset.timestamp = Date.now();
    
    try {
      range.surroundContents(highlight);
      currentHighlights.push({
        text: text,
        timestamp: Date.now(),
        url: window.location.href,
        id: generateId()
      });
      
      saveHighlights();
      selection.removeAllRanges();
    } catch (e) {
      console.log('Cannot highlight across element boundaries');
    }
  }
  
  // Generate unique ID for each highlight
  function generateId() {
    return 'highlight_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Save highlights to Chrome storage
  function saveHighlights() {
    const annotationData = {
      highlights: currentHighlights,
      url: window.location.href,
      lastUpdated: Date.now()
    };
    
    chrome.storage.local.get(['annotations'], function(result) {
      let allAnnotations = result.annotations || {};
      allAnnotations[window.location.href] = currentHighlights;
      chrome.storage.local.set({annotations: allAnnotations});
    });
  }
  
  // Load existing highlights for current page
  function loadExistingHighlights() {
    chrome.storage.local.get(['annotations'], function(result) {
      const annotations = result.annotations || {};
      const pageHighlights = annotations[window.location.href] || [];
      
      pageHighlights.forEach(highlight => {
        highlightTextOnPage(highlight.text);
      });
    });
  }
  
  // Find and highlight text on the page
  function highlightTextOnPage(text) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(text)) {
        const span = document.createElement('span');
        span.className = 'annotation-highlight';
        span.style.backgroundColor = '#ffeb3b';
        span.dataset.text = text;
        
        const regex = new RegExp(`(${text})`, 'gi');
        node.parentNode.replaceChild(
          span.appendChild(document.createTextNode(node.textContent.replace(regex, '$1'))),
          node
        );
        break;
      }
    }
  }
  
  // Toggle annotation mode
  window.toggleAnnotationMode = function() {
    isAnnotating = !isAnnotating;
    document.body.style.cursor = isAnnotating ? 'crosshair' : 'default';
    return isAnnotating;
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

This content script handles the core functionality of selecting and highlighting text. When users select text while in annotation mode, the script wraps the selected text in a styled span element, creating a visible highlight. The highlights are saved to Chrome's local storage, keyed by the page URL, so they persist across sessions.

The script also includes logic to restore highlights when the page is reloaded. It searches through the page content to find matching text and re-applies the highlight styling.

---

Building the Popup Interface {#popup}

The popup provides the interface for viewing and managing annotations. When users click the extension icon, they see a list of their highlights for the current page and can access annotations from other pages.

Popup HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Web Highlighter Pro</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Web Highlighter Pro</h1>
      <button id="toggleMode" class="btn-primary">
        Enable Highlighting
      </button>
    </header>
    
    <section class="current-page">
      <h2>Current Page Highlights</h2>
      <div id="currentHighlights" class="highlights-list">
        <p class="empty-state">No highlights yet. Select text on the page to highlight.</p>
      </div>
    </section>
    
    <section class="all-annotations">
      <h2>All Annotations</h2>
      <div id="allAnnotations" class="highlights-list">
        <p class="empty-state">Loading annotations...</p>
      </div>
    </section>
    
    <footer class="popup-footer">
      <button id="clearAll" class="btn-danger">Clear All</button>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Popup JavaScript Logic

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggleMode');
  const clearBtn = document.getElementById('clearAll');
  const currentHighlightsEl = document.getElementById('currentHighlights');
  const allAnnotationsEl = document.getElementById('allAnnotations');
  
  let isAnnotating = false;
  
  // Toggle annotation mode
  toggleBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { action: 'toggleMode' }, function(response) {
      isAnnotating = !isAnnotating;
      toggleBtn.textContent = isAnnotating ? 'Disable Highlighting' : 'Enable Highlighting';
      toggleBtn.classList.toggle('active', isAnnotating);
    });
  });
  
  // Load current page highlights
  async function loadCurrentPageHighlights() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.storage.local.get(['annotations'], function(result) {
      const annotations = result.annotations || {};
      const pageHighlights = annotations[tab.url] || [];
      
      if (pageHighlights.length === 0) {
        currentHighlightsEl.innerHTML = '<p class="empty-state">No highlights on this page.</p>';
        return;
      }
      
      currentHighlightsEl.innerHTML = pageHighlights.map(highlight => `
        <div class="highlight-item">
          <p class="highlight-text">"${highlight.text}"</p>
          <span class="highlight-time">${new Date(highlight.timestamp).toLocaleString()}</span>
        </div>
      `).join('');
    });
  }
  
  // Load all annotations
  function loadAllAnnotations() {
    chrome.storage.local.get(['annotations'], function(result) {
      const annotations = result.annotations || {};
      
      let allHighlights = [];
      for (const [url, highlights] of Object.entries(annotations)) {
        highlights.forEach(h => {
          allHighlights.push({ ...h, url });
        });
      }
      
      allHighlights.sort((a, b) => b.timestamp - a.timestamp);
      
      if (allHighlights.length === 0) {
        allAnnotationsEl.innerHTML = '<p class="empty-state">No annotations yet.</p>';
        return;
      }
      
      allAnnotationsEl.innerHTML = allHighlights.map(highlight => `
        <div class="highlight-item">
          <p class="highlight-text">"${highlight.text}"</p>
          <a href="${highlight.url}" class="highlight-url" target="_blank">
            ${new URL(highlight.url).hostname}
          </a>
          <span class="highlight-time">${new Date(highlight.timestamp).toLocaleString()}</span>
        </div>
      `).join('');
    });
  }
  
  // Clear all annotations
  clearBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear all annotations?')) {
      chrome.storage.local.clear(function() {
        loadCurrentPageHighlights();
        loadAllAnnotations();
      });
    }
  });
  
  // Initial load
  loadCurrentPageHighlights();
  loadAllAnnotations();
});
```

Popup Styling

```css
/* popup.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  background-color: #f5f5f5;
}

.popup-container {
  padding: 16px;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.popup-header h1 {
  font-size: 16px;
  color: #333;
}

.btn-primary {
  padding: 6px 12px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-primary:hover {
  background-color: #3367d6;
}

.btn-primary.active {
  background-color: #ea4335;
}

.btn-danger {
  padding: 8px 16px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  width: 100%;
}

section {
  margin-bottom: 16px;
}

section h2 {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.highlights-list {
  max-height: 200px;
  overflow-y: auto;
}

.highlight-item {
  background: white;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.highlight-text {
  font-size: 13px;
  color: #333;
  margin-bottom: 4px;
  font-style: italic;
}

.highlight-url {
  font-size: 11px;
  color: #4285f4;
  text-decoration: none;
  display: block;
  margin: 4px 0;
}

.highlight-time {
  font-size: 10px;
  color: #999;
}

.empty-state {
  font-size: 12px;
  color: #999;
  text-align: center;
  padding: 20px;
}

.popup-footer {
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}
```

---

Implementing Background Service Worker {#background}

The background service worker handles extension-wide logic and message passing:

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Web Highlighter Pro extension installed');
  
  // Initialize storage
  chrome.storage.local.set({
    annotations: {},
    settings: {
      highlightColor: '#ffeb3b',
      isEnabled: true
    }
  });
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getAnnotations') {
    chrome.storage.local.get(['annotations'], function(result) {
      sendResponse(result.annotations);
    });
    return true;
  }
  
  if (message.action === 'saveAnnotation') {
    // Handle annotation saving
    sendResponse({ success: true });
  }
});
```

---

Testing Your Extension {#testing}

Now that you have built all the components, it is time to test your extension in Chrome.

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable Developer mode in the top right corner
3. Click Load unpacked and select your extension folder
4. The extension icon should appear in your Chrome toolbar

To test the functionality:
1. Navigate to any web page
2. Click the extension icon and press "Enable Highlighting"
3. Select some text on the page
4. The text should be highlighted in yellow
5. Click the extension icon again to see your saved highlights

---

Best Practices and Improvements {#best-practices}

While this basic implementation works, there are several improvements you can make to create a production-ready extension.

Color Customization

Allow users to choose their preferred highlight colors. Store the color preference in Chrome storage and apply it when creating highlights.

Export and Sync

Implement functionality to export annotations as PDF, Markdown, or JSON. Consider adding Chrome sync storage to synchronize annotations across devices.

Search Functionality

Add a search feature that allows users to find annotations across all pages. This requires indexing all stored annotations and providing a search interface.

Note Attachments

Enhance the highlight functionality to allow attaching notes to each highlight. This turns simple highlights into rich annotations with personal commentary.

Privacy Considerations

Be transparent about data storage. Consider adding an option to store annotations locally only, without any cloud synchronization, for users who prioritize privacy.

---

Publishing Your Extension {#publishing}

Once you have tested your extension and added any desired improvements, you can publish it to the Chrome Web Store.

1. Create a developer account at the Chrome Web Store
2. Package your extension as a ZIP file
3. Upload and fill in the store listing details
4. Submit for review

Ensure your extension follows Chrome Web Store policies, including proper privacy disclosures if you collect any user data.

---

Conclusion {#conclusion}

Building a web annotation Chrome extension is an excellent project that teaches fundamental extension development skills while creating a genuinely useful tool. You have learned how to work with content scripts for DOM manipulation, implement popup interfaces, use Chrome storage for persistence, and structure a Manifest V3 extension.

The basic implementation we built provides solid foundation. From here, you can continue adding features like color customization, annotation search, export functionality, and cloud sync. The web annotation space has room for well-designed, privacy-focused tools that make it easy for users to capture and organize information from the web.

Start building your extension today, and you will have a portfolio piece that demonstrates real Chrome extension development skills while potentially solving problems for thousands of users.
