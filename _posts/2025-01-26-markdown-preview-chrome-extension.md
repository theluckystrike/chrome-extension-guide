---
layout: post
title: "Build a Live Markdown Preview Chrome Extension"
description: "Learn how to build a powerful live markdown preview chrome extension with this comprehensive guide. Create a markdown renderer extension that renders markdown in real-time as you type, complete with code highlighting and GitHub-flavored markdown support."
date: 2025-01-26
last_modified_at: 2025-01-26
categories: [guides, chrome-extensions, development-tools]
tags: [markdown preview extension, live markdown chrome, markdown renderer extension, chrome extension development, markdown editor, markdown previewer]
keywords: "markdown preview extension, live markdown chrome, markdown renderer extension"
canonical_url: "https://bestchromeextensions.com/2025/01/26/markdown-preview-chrome-extension/"
---

Build a Live Markdown Preview Chrome Extension

Markdown has become the de facto standard for writing documentation, notes, and content across the web. Whether you are a developer writing README files, a technical writer creating documentation, or a blogger crafting articles, the ability to see a live preview of your markdown as you type dramatically improves productivity. we will walk through building a powerful live markdown preview Chrome extension that renders your markdown in real-time with full GitHub-flavored markdown support and syntax highlighting.

This project will teach you essential Chrome extension development skills including content scripts, background scripts, message passing between components, and working with the DOM. By the end of this guide, you will have a fully functional extension that you can use in your daily workflow or extend with additional features.

---

Understanding the Architecture {#architecture}

Before diving into code, it is crucial to understand how Chrome extensions work and how our markdown preview extension will function. A Chrome extension is essentially a collection of files, HTML, CSS, JavaScript, and images, that extend the browser's functionality. Our extension will use a split-pane interface with markdown input on one side and live preview on the other.

The architecture consists of several key components working together. The popup interface provides the user interface where users can write markdown and see the preview. Content scripts allow the extension to interact with web pages, enabling features like previewing markdown on GitHub README files or documentation sites. The background script handles extension lifecycle events and can coordinate between different parts of the extension.

When the user opens the extension popup, they will see a text area for entering markdown and a preview pane showing the rendered HTML. As the user types, the extension will parse the markdown in real-time and update the preview instantly. This live preview capability is what makes the extension so useful for writers and developers.

---

Setting Up the Project Structure {#project-structure}

Every Chrome extension requires a manifest file called `manifest.json` that describes the extension's capabilities and permissions. For our markdown preview extension, we will use Manifest V3, which is the current standard for Chrome extensions. Let us create the project structure and the manifest file.

Create a new folder for your extension and add the following files. First, the `manifest.json` file defines the extension's configuration, including the name, version, description, and the permissions it requires. We need the `activeTab` permission to access the content of the current tab when the user requests a preview.

```json
{
  "manifest_version": 3,
  "name": "Live Markdown Preview",
  "version": "1.0",
  "description": "Preview markdown in real-time with live rendering",
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

The manifest declares that our extension will have a popup interface (`popup.html`), uses the `activeTab` permission to access the current tab's content, and uses `scripting` to execute content scripts when needed. The icon files are referenced but we will create simple placeholder icons for now.

---

Creating the Popup Interface {#popup-interface}

The popup is the main user interface of our extension. It contains the markdown input area and the live preview pane. We will use a split-pane design with the input on the left and preview on the right. The HTML file defines the structure while CSS handles the styling.

Create `popup.html` with the following content:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Markdown Preview</title>
  <link rel="stylesheet" href="popup.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
</head>
<body>
  <div class="container">
    <div class="pane input-pane">
      <textarea id="markdown-input" placeholder="Enter your markdown here..."></textarea>
    </div>
    <div class="pane preview-pane">
      <div id="markdown-preview" class="markdown-body"></div>
    </div>
  </div>
  <div class="toolbar">
    <button id="copy-html">Copy HTML</button>
    <button id="insert-page">Preview Selection</button>
  </div>
  <script src="marked.min.js"></script>
  <script src="highlight.min.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

The popup includes two panes: an input area for writing markdown and a preview area showing the rendered result. We include `github-markdown-css` to give our preview the familiar GitHub markdown styling. The toolbar at the bottom provides additional actions like copying the generated HTML or previewing selected content from the current page.

Now let us create the styling for the popup in `popup.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 800px;
  height: 500px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.container {
  display: flex;
  height: calc(100% - 40px);
}

.pane {
  width: 50%;
  height: 100%;
  overflow: auto;
}

.input-pane {
  border-right: 1px solid #e1e4e8;
}

#markdown-input {
  width: 100%;
  height: 100%;
  padding: 16px;
  border: none;
  resize: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  background-color: #f6f8fa;
}

#markdown-input:focus {
  outline: none;
}

.preview-pane {
  padding: 16px;
  background-color: #ffffff;
}

.markdown-body {
  font-size: 14px;
  line-height: 1.5;
}

.toolbar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 12px;
  background-color: #f6f8fa;
  border-top: 1px solid #e1e4e8;
}

.toolbar button {
  padding: 6px 12px;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  background-color: #ffffff;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.toolbar button:hover {
  background-color: #f3f4f6;
}
```

The CSS creates a clean, split-pane interface with the input area on the left and preview on the right. The input uses a monospace font for comfortable markdown editing, while the preview area uses the GitHub markdown styling. The toolbar provides action buttons for additional functionality.

---

Implementing the Core Functionality {#core-functionality}

The JavaScript in `popup.js` handles the live preview logic. We will use two popular libraries: `marked` for parsing markdown and `highlight.js` for syntax highlighting code blocks. Let us create the popup script:

```javascript
// Initialize marked with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {}
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

const markdownInput = document.getElementById('markdown-input');
const markdownPreview = document.getElementById('markdown-preview');

// Live preview function
function updatePreview() {
  const markdown = markdownInput.value;
  const html = marked.parse(markdown);
  markdownPreview.innerHTML = html;
}

// Event listener for real-time preview
markdownInput.addEventListener('input', updatePreview);

// Copy HTML button
document.getElementById('copy-html').addEventListener('click', () => {
  const html = markdownPreview.innerHTML;
  navigator.clipboard.writeText(html).then(() => {
    const button = document.getElementById('copy-html');
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => button.textContent = originalText, 1500);
  });
});

// Preview selected text from page
document.getElementById('insert-page').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getSelection
  }, (results) => {
    if (results && results[0] && results[0].result) {
      markdownInput.value = results[0].result;
      updatePreview();
    }
  });
});

function getSelection() {
  return window.getSelection().toString();
}

// Load sample markdown on startup
markdownInput.value = `# Welcome to Markdown Preview

This is a live preview extension for Chrome.

Features

- Live rendering as you type
- GitHub-flavored markdown support
- Syntax highlighting for code blocks

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

> Blockquotes work too!

- Item 1
- Item 2
- Item 3

[Link to Chrome Extension Guide](https://developer.chrome.com/docs/extensions)
`;

updatePreview();
```

The script initializes the marked library with syntax highlighting support. It listens for input events on the textarea and updates the preview in real-time as the user types. The copy button copies the generated HTML to the clipboard, and the insert button gets the selected text from the current web page and loads it into the editor.

We also include a sample markdown document that demonstrates various markdown features when the extension first opens. This helps users understand what the extension can do and serves as a helpful reference.

---

Adding Syntax Highlighting Support {#syntax-highlighting}

For syntax highlighting to work, we need to include the highlight.js library. While you can download these libraries locally, for this example we will use the CDN versions. However, for a production extension, you should bundle these libraries locally to ensure they work offline and comply with Chrome Web Store policies.

Download `marked.min.js` and `highlight.min.js` from their respective GitHub repositories or use a package manager. Place these files in your extension directory. You can find them at:

- Marked: https://github.com/markedjs/marked
- Highlight.js: https://github.com/highlightjs/highlight.js

For the icons, you can create simple PNG files or use any image editing tool to generate placeholder icons in the required sizes (16x16, 48x48, and 128x128 pixels).

---

Testing the Extension Locally {#testing}

Before publishing your extension, you need to test it locally to ensure everything works correctly. Chrome provides a simple way to load unpacked extensions for testing.

Open Chrome and navigate to `chrome://extensions/` in the address bar. Enable the "Developer mode" toggle in the top-right corner of the page. This reveals additional options including the "Load unpacked" button.

Click "Load unpacked" and select the folder containing your extension files. Chrome will load the extension and display it in the extension list. You should see your extension icon in the Chrome toolbar. Clicking the icon opens the popup with the markdown editor and live preview.

Test the extension by typing markdown in the input area and watching the preview update in real-time. Try various markdown syntax including headings, bold and italic text, code blocks, lists, links, and blockquotes. Verify that the syntax highlighting works for code blocks in different programming languages.

---

Advanced Features and Enhancements {#advanced-features}

Now that you have a working basic extension, consider adding these advanced features to make it even more powerful. These enhancements will demonstrate more advanced Chrome extension APIs and improve the user experience.

Page Preview Feature

One particularly useful feature is the ability to preview markdown from the current web page. For example, when viewing a README.md file on GitHub or a markdown document on a documentation site, users should be able to preview that content directly. Implement this by injecting a content script into the page to extract the markdown content.

Create a content script file called `content.js`:

```javascript
// Extract markdown from common sources
function extractMarkdown() {
  // GitHub README files
  const readme = document.querySelector('.markdown-body');
  if (readme) {
    return readme.innerText;
  }
  
  // Common README patterns
  const readmeLinks = document.querySelectorAll('a[href$=".md"]');
  if (readmeLinks.length > 0) {
    return 'Found markdown files: ' + 
      Array.from(readmeLinks).map(a => a.href).join(', ');
  }
  
  return null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMarkdown') {
    const markdown = extractMarkdown();
    sendResponse({ markdown: markdown });
  }
  return true;
});
```

Update the manifest to include the content script:

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }
]
```

Keyboard Shortcuts

Add keyboard shortcuts to improve productivity. Users can press Ctrl+Enter to copy the HTML, or use other shortcuts for common actions. Implement this in the popup script:

```javascript
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    document.getElementById('copy-html').click();
  }
});
```

Persistence

Currently, the markdown is lost when the popup is closed. Add local storage persistence to save the user's work:

```javascript
// Save to local storage
function saveContent() {
  localStorage.setItem('markdown-content', markdownInput.value);
}

// Load from local storage
function loadContent() {
  const saved = localStorage.getItem('markdown-content');
  if (saved) {
    markdownInput.value = saved;
    updatePreview();
  }
}

markdownInput.addEventListener('input', saveContent);
loadContent();
```

---

Publishing to the Chrome Web Store {#publishing}

Once you have tested your extension thoroughly, you can publish it to the Chrome Web Store. This makes it available to millions of Chrome users worldwide. The publishing process involves creating a zip file of your extension, signing up for a developer account, and submitting your extension for review.

Before submitting, ensure your extension meets all the Chrome Web Store policies. Remove any debugging code, ensure all external resources are accessible, and verify that your extension does not contain malicious behavior. The review process typically takes a few days, after which your extension will be available for installation.

---

Conclusion {#conclusion}

Congratulations! You have built a complete live markdown preview Chrome extension from scratch. This extension demonstrates fundamental Chrome extension development concepts including popup interfaces, content scripts, message passing, and working with the DOM. The skills you have learned here provide a solid foundation for building more complex extensions.

The markdown preview extension you created includes live rendering as you type, GitHub-flavored markdown support, syntax highlighting for code blocks, the ability to copy generated HTML, and integration with web page content. These features make it a genuinely useful tool for developers, technical writers, and anyone who works with markdown regularly.

Consider extending this project further by adding features like export to PDF, integration with note-taking apps, themes, or a split-view mode for wider screens. The Chrome extension platform offers extensive APIs that enable building powerful browser-based tools. Happy coding!
