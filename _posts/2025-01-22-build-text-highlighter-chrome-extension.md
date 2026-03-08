---
layout: post
title: "Build a Text Highlighter Chrome Extension: Complete 2025 Tutorial"
description: "Learn how to build a text highlighter Chrome extension from scratch. This comprehensive tutorial covers web annotation extension development, highlighting text in Chrome, and how to create your own text highlighter extension using modern JavaScript."
date: 2025-01-22
categories: [Chrome Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "text highlighter extension, highlight text chrome, web annotation extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/22/build-text-highlighter-chrome-extension/"
---

# Build a Text Highlighter Chrome Extension: Complete 2025 Tutorial

Text highlighting is one of the most useful features for web browsing, research, and online learning. Whether you are conducting academic research, collecting inspiration for a design project, or simply want to mark important information for later reference, a **text highlighter extension** can significantly improve your browsing experience. In this comprehensive tutorial, I will walk you through building a fully functional **highlight text Chrome** extension from scratch using Manifest V3 and modern JavaScript.

This project will teach you essential Chrome extension development concepts including content scripts, message passing, local storage for persistence, and browser action interactions. By the end of this guide, you will have a production-ready **web annotation extension** that users can install and use immediately.

---

## Why Build a Text Highlighter Extension? {#why-build}

The demand for text highlighting tools in browsers continues to grow for several compelling reasons. First, the amount of information available online has exploded, making it essential to have tools that help users organize and remember important content. Second, students, researchers, professionals, and casual browsers all benefit from the ability to mark and save text across different websites.

Building a **text highlighter extension** is also an excellent learning project because it touches on many core concepts of Chrome extension development. You will work with the DOM directly, handle user interactions, store data persistently, and create a clean user interface. These skills transfer directly to other extension projects you might want to build in the future.

From a commercial perspective, highlight and annotation tools have proven to be commercially successful. Extensions like Weava, Liner, and Stacks have attracted millions of users. While our tutorial builds a foundation, you can extend this project with features like cloud synchronization, PDF export, sharing capabilities, and collaboration features to create a full-fledged product.

---

## Project Architecture Overview {#architecture}

Before writing any code, let us understand the architecture of our Chrome extension. A typical **text highlighter extension** consists of several components working together.

The **manifest.json** file serves as the configuration file that tells Chrome about our extension, its permissions, and which files to load. The **popup HTML and JavaScript** provide the user interface that appears when clicking the extension icon. The **content script** runs on web pages and handles the actual text selection and highlighting functionality. Finally, the **background service worker** manages long-running tasks and coordinates communication between different parts of the extension.

For this project, we will use Manifest V3, which is the current standard for Chrome extensions. Manifest V3 offers improved security, better performance, and more predictable behavior compared to the older Manifest V2.

---

## Step 1: Setting Up the Project Structure {#setup}

Create a new folder for your extension project. Inside this folder, create the following directory structure:

```
text-highlighter/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── background.js
├── styles.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

You will need to create simple icon files for your extension. For development purposes, you can use placeholder images or create simple colored squares. When you are ready to publish, you should create proper icons following Google's icon guidelines.

---

## Step 2: Creating the Manifest File {#manifest}

The manifest.json file is the heart of every Chrome extension. Here is the complete manifest for our **text highlighter extension**:

```json
{
  "manifest_version": 3,
  "name": "Text Highlighter Pro",
  "version": "1.0.0",
  "description": "Highlight and annotate text on any webpage with ease",
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["styles.css"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

This manifest declares that our extension needs storage permissions to save highlighted text, activeTab permissions to work with the current tab, and scripting permissions to inject JavaScript into web pages. The host permissions allow our extension to work on any website.

---

## Step 3: Building the Content Script {#content-script}

The content script is where the magic happens. This JavaScript file runs in the context of web pages and handles text selection, highlighting, and DOM manipulation. Here is a comprehensive content script for our **web annotation extension**:

```javascript
// content.js - Core highlighting functionality

class TextHighlighter {
  constructor() {
    this.highlights = [];
    this.colors = {
      yellow: '#ffeb3b',
      green: '#a5d6a7',
      blue: '#90caf9',
      pink: '#f48fb1',
      orange: '#ffcc80'
    };
    this.currentColor = 'yellow';
    this.init();
  }

  init() {
    // Load saved highlights when page loads
    this.loadHighlights();
    
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getHighlights') {
        sendResponse({ highlights: this.highlights });
      } else if (request.action === 'clearHighlights') {
        this.clearAllHighlights();
        sendResponse({ success: true });
      } else if (request.action === 'setColor') {
        this.currentColor = request.color;
        sendResponse({ success: true });
      }
    });

    // Handle text selection
    document.addEventListener('mouseup', (event) => {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      
      if (selectedText.length > 0) {
        this.showHighlightMenu(event, selectedText);
      }
    });
  }

  showHighlightMenu(event, text) {
    // Remove existing menu if any
    const existingMenu = document.getElementById('highlighter-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    // Create highlight menu
    const menu = document.createElement('div');
    menu.id = 'highlighter-menu';
    menu.innerHTML = `
      <div class="highlighter-menu-content">
        <div class="highlighter-colors">
          ${Object.entries(this.colors).map(([name, color]) => `
            <button class="color-btn" data-color="${name}" 
                    style="background-color: ${color}" 
                    title="${name}"></button>
          `).join('')}
        </div>
        <button class="highlight-btn">Highlight</button>
      </div>
    `;

    // Position menu near selection
    menu.style.position = 'absolute';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY + 10}px`;
    
    document.body.appendChild(menu);

    // Add event listeners
    menu.querySelector('.highlight-btn').addEventListener('click', () => {
      this.createHighlight(text);
      menu.remove();
    });

    menu.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.currentColor = e.target.dataset.color;
        menu.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
  }

  createHighlight(text) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    // Create highlight span
    const highlightSpan = document.createElement('span');
    highlightSpan.className = 'user-highlight';
    highlightSpan.style.backgroundColor = this.colors[this.currentColor];
    highlightSpan.dataset.highlightId = Date.now().toString();
    highlightSpan.dataset.text = selectedText;
    
    try {
      range.surroundContents(highlightSpan);
    } catch (e) {
      // Handle complex selections that span multiple elements
      console.error('Cannot highlight complex selection:', e);
      return;
    }

    // Save highlight data
    const highlightData = {
      id: highlightSpan.dataset.highlightId,
      text: selectedText,
      color: this.currentColor,
      url: window.location.href,
      timestamp: Date.now()
    };
    
    this.highlights.push(highlightData);
    this.saveHighlights();
    
    // Clear selection
    selection.removeAllRanges();
  }

  saveHighlights() {
    // Save to chrome storage
    const pageUrl = window.location.href;
    const pageHighlights = this.highlights.filter(h => h.url === pageUrl);
    
    chrome.storage.local.get(['allHighlights'], (result) => {
      const allHighlights = result.allHighlights || {};
      allHighlights[pageUrl] = pageHighlights;
      chrome.storage.local.set({ allHighlights });
    });
  }

  loadHighlights() {
    const pageUrl = window.location.href;
    
    chrome.storage.local.get(['allHighlights'], (result) => {
      const allHighlights = result.allHighlights || {};
      this.highlights = allHighlights[pageUrl] || [];
      this.rebuildHighlights();
    });
  }

  rebuildHighlights() {
    // Remove existing highlights from DOM
    document.querySelectorAll('.user-highlight').forEach(el => {
      const text = el.textContent;
      el.replaceWith(document.createTextNode(text));
    });

    // Rebuild highlights
    this.highlights.forEach(highlight => {
      this.findAndHighlight(highlight.text, highlight.color, highlight.id);
    });
  }

  findAndHighlight(text, color, id) {
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.includes(text)) {
        const regex = new RegExp(`(${this.escapeRegex(text)})`, 'gi');
        const span = document.createElement('span');
        span.innerHTML = node.textContent.replace(regex, 
          `<span class="user-highlight" data-highlight-id="${id}" 
           data-text="${text}" style="background-color: ${this.colors[color]}">$1</span>`;
        
        if (node.parentNode) {
          node.parentNode.replaceChild(span, node);
        }
      }
    }
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  clearAllHighlights() {
    document.querySelectorAll('.user-highlight').forEach(el => {
      const text = el.textContent;
      el.replaceWith(document.createTextNode(text));
    });
    
    this.highlights = [];
    this.saveHighlights();
  }
}

// Initialize the highlighter
new TextHighlighter();
```

This content script provides comprehensive functionality for highlighting text on any webpage. It includes color selection, persistent storage, and DOM manipulation to create visual highlights.

---

## Step 4: Creating the Popup Interface {#popup}

The popup provides the user interface that appears when users click the extension icon. It allows users to manage their highlights and access extension features. Here is the popup HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      width: 300px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
    }
    
    h2 {
      font-size: 18px;
      margin-bottom: 12px;
      color: #333;
    }
    
    .stats {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    
    .stat-item {
      text-align: center;
      flex: 1;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #4285f4;
    }
    
    .stat-label {
      font-size: 12px;
      color: #666;
    }
    
    .btn {
      width: 100%;
      padding: 10px;
      margin-bottom: 8px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    .btn-primary {
      background: #4285f4;
      color: white;
    }
    
    .btn-primary:hover {
      background: #3367d6;
    }
    
    .btn-danger {
      background: #ea4335;
      color: white;
    }
    
    .btn-danger:hover {
      background: #d33426;
    }
    
    .color-picker {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      justify-content: center;
    }
    
    .color-option {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    .color-option:hover {
      transform: scale(1.1);
    }
    
    .color-option.active {
      border-color: #333;
    }
  </style>
</head>
<body>
  <h2>Text Highlighter Pro</h2>
  
  <div class="stats">
    <div class="stat-item">
      <div class="stat-value" id="highlightCount">0</div>
      <div class="stat-label">Highlights</div>
    </div>
  </div>
  
  <p style="margin-bottom: 12px; font-size: 14px; color: #666;">
    Select text on any page and click the highlight button to save it.
  </p>
  
  <div class="color-picker">
    <div class="color-option active" data-color="yellow" style="background: #ffeb3b" title="Yellow"></div>
    <div class="color-option" data-color="green" style="background: #a5d6a7" title="Green"></div>
    <div class="color-option" data-color="blue" style="background: #90caf9" title="Blue"></div>
    <div class="color-option" data-color="pink" style="background: #f48fb1" title="Pink"></div>
    <div class="color-option" data-color="orange" style="background: #ffcc80" title="Orange"></div>
  </div>
  
  <button class="btn btn-primary" id="viewHighlights">View All Highlights</button>
  <button class="btn btn-danger" id="clearHighlights">Clear Page Highlights</button>
  
  <script src="popup.js"></script>
</body>
</html>
```

The popup JavaScript handles user interactions and communicates with the content script:

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', () => {
  let currentColor = 'yellow';
  
  // Color picker functionality
  document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', async (e) => {
      currentColor = e.target.dataset.color;
      
      // Update UI
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
      e.target.classList.add('active');
      
      // Send color to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { 
        action: 'setColor', 
        color: currentColor 
      });
    });
  });

  // Get highlight count
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getHighlights' }, (response) => {
        if (response && response.highlights) {
          document.getElementById('highlightCount').textContent = response.highlights.length;
        }
      });
    }
  });

  // Clear highlights
  document.getElementById('clearHighlights').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'clearHighlights' }, () => {
      document.getElementById('highlightCount').textContent = '0';
    });
  });

  // View highlights - could open a new page with all highlights
  document.getElementById('viewHighlights').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getHighlights' }, (response) => {
          if (response && response.highlights && response.highlights.length > 0) {
            // Create a simple alert for now - you could expand this
            const highlightsList = response.highlights.map(h => h.text).join('\n');
            alert(`Your Highlights:\n\n${highlightsList}`);
          } else {
            alert('No highlights on this page yet. Select text to create your first highlight!');
          }
        });
      }
    });
  });
});
```

---

## Step 5: Adding CSS Styles {#styles}

The styles.css file provides visual styling for the highlights and popup:

```css
/* styles.css */

.user-highlight {
  border-radius: 2px;
  padding: 1px 0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.user-highlight:hover {
  filter: brightness(0.95);
}

/* Highlight menu styles */
#highlighter-menu {
  z-index: 2147483647;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 8px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.highlighter-menu-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.highlighter-colors {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.color-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.color-btn:hover {
  transform: scale(1.15);
}

.color-btn.active {
  border-color: #333;
  box-shadow: 0 0 0 2px white, 0 0 0 4px #333;
}

.highlight-btn {
  padding: 8px 16px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.highlight-btn:hover {
  background: #3367d6;
}
```

---

## Step 6: Background Service Worker {#background}

The background service worker handles extension lifecycle events and coordinates between different parts of the extension:

```javascript
// background.js

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Text Highlighter Pro installed!');
    
    // Initialize storage
    chrome.storage.local.set({ 
      allHighlights: {},
      settings: {
        defaultColor: 'yellow',
        showNotifications: true
      }
    });
  }
});

// Handle extension icon click (if no popup)
chrome.action.onClicked.addListener((tab) => {
  // This fires when there's no popup defined
  // Since we have a popup, this won't be called
  console.log('Extension icon clicked');
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'analytics') {
    // You could add analytics tracking here
    console.log('Analytics event:', message.data);
  }
});
```

---

## Step 7: Loading and Testing Your Extension {#testing}

Now that you have created all the necessary files, it is time to load your extension into Chrome and test it. Follow these steps to load your unpacked extension:

First, open Chrome and navigate to `chrome://extensions/` in the address bar. Alternatively, you can click the three-dot menu in Chrome, go to "Extensions," and then "Manage Extensions." In the top right corner of the Extensions page, toggle on "Developer mode." This enables additional features that allow you to load unpacked extensions.

Once developer mode is enabled, you will see new buttons appear in the top left corner of the page. Click the "Load unpacked" button and select the folder containing your extension files. Chrome will load your extension and display it in the list of installed extensions.

If there are any errors, Chrome will show warning messages or error indicators next to your extension. Common issues include malformed JSON in the manifest file, missing files referenced in the manifest, or JavaScript syntax errors. Check the console output and the "Errors" section of the Extensions page for troubleshooting information.

To test your extension, navigate to any webpage and select some text with your mouse. A highlight menu should appear near your selection. Click the highlight button to create a highlight in the selected color. The highlight will persist even if you refresh the page or navigate to a different page on the same domain.

---

## Step 8: Extending Your Extension {#extending}

Once you have the basic **text highlighter extension** working, there are many ways to extend its functionality. Consider adding these features to make your extension more powerful and useful:

**Export and Import**: Allow users to export their highlights to various formats including JSON, CSV, PDF, or HTML. You could also add import functionality so users can transfer highlights between devices or back up their data.

**Cloud Synchronization**: Implement cloud storage using Firebase, AWS, or another backend service to sync highlights across multiple devices. This transforms your extension from a local tool into a cross-platform annotation system.

**Search Functionality**: Add the ability to search through all saved highlights. Users could search by text content, URL, date, or color tag.

**Annotation Notes**: Allow users to add notes or comments to their highlights. This transforms simple highlights into full annotations with additional context.

**Collaboration Features**: Add sharing functionality so users can share specific highlights or highlight collections with others via links or email.

**PDF Support**: Extend your extension to work with PDF files using PDF.js or similar libraries. This is particularly valuable for academic and professional users.

---

## Conclusion {#conclusion}

Congratulations! You have built a fully functional **text highlighter Chrome extension** from scratch. This project demonstrates core Chrome extension development concepts including Manifest V3 configuration, content scripts, popup interfaces, storage persistence, and inter-component communication.

The **highlight text chrome** extension you created is ready for personal use, and with some additional work, it could be published to the Chrome Web Store. The skills you have learned in building this extension transfer directly to other Chrome extension projects, whether they are productivity tools, developer utilities, or commercial products.

Remember that the Chrome extension ecosystem continues to evolve, and Google regularly updates the platform with new features and requirements. Stay current with the latest Chrome extension documentation and best practices to ensure your extensions remain functional and competitive.

Start by testing your extension thoroughly, then consider adding the extension ideas mentioned above to create a more comprehensive tool. With a solid foundation in Chrome extension development, you are well-equipped to build the next generation of browser-based tools that millions of users will find valuable.
