---
layout: default
title: "Chrome Extension Copy as Markdown. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-copy-as-markdown/"
---
# Build a Copy-as-Markdown Chrome Extension

This tutorial guides you through building a Chrome extension that converts web content to Markdown format. The extension will copy selected HTML, links, and page titles as clean Markdown.

Prerequisites {#prerequisites}

- Chrome browser
- Basic JavaScript knowledge
- Code editor (VS Code recommended)

Step 1: Create the Manifest {#step-1-create-the-manifest}

The manifest defines permissions and the extension's configuration. For this extension, we need three key permissions:

- `activeTab`: Access to the current tab's content
- `contextMenus`: Add items to the right-click context menu
- `clipboardWrite`: Write to the user's clipboard

```json
{
  "manifest_version": 3,
  "name": "Copy as Markdown",
  "version": "1.0",
  "description": "Copy web content as clean Markdown",
  "permissions": ["activeTab", "contextMenus", "clipboardWrite"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

Step 2: Set Up Context Menus {#step-2-set-up-context-menus}

Create the background script to register context menu items for different copy scenarios. The extension supports three context menu types: selection text, links, and the page itself.

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copySelection",
    title: "Copy as Markdown",
    contexts: ["selection"]
  });
  
  chrome.contextMenus.create({
    id: "copyLink",
    title: "Copy Link as Markdown",
    contexts: ["link"]
  });
  
  chrome.contextMenus.create({
    id: "copyPage",
    title: "Copy Page as Markdown",
    contexts: ["page"]
  });
});
```

Step 3: Build the HTML-to-Markdown Converter {#step-3-build-the-html-to-markdown-converter}

Create a utility function that converts HTML elements to Markdown. This converter handles headings (`h1`-`h6`), bold (`strong`, `b`), italic (`em`, `i`), links (`a`), lists (`ul`, `ol`), images (`img`), and code blocks (`pre`, `code`).

```javascript
// converter.js
function htmlToMarkdown(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Handle headings
  temp.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
    const level = el.tagName[1];
    el.replaceWith('#'.repeat(level) + ' ' + el.textContent + '\n');
  });
  
  // Handle bold and italic
  el.replaceWith('' + el.textContent + ''); // bold
  el.replaceWith('*' + el.textContent + '*');   // italic
  
  // Handle links: <a href="url">text</a> -> [text](url)
  el.replaceWith('[' + el.textContent + '](' + el.href + ')');
  
  // Handle images: <img src="url" alt="text"> -> ![alt](url)
  el.replaceWith('![' + el.alt + '](' + el.src + ')');
  
  return temp.textContent;
}
```

Step 4: Handle Text Selection {#step-4-handle-text-selection}

When users select text on a page, retrieve the HTML content using `window.getSelection()`. Pass this to the converter to generate Markdown. This approach preserves formatting better than using `textContent` alone.

```javascript
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "copySelection") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection();
        const html = selection.getRangeAt(0).cloneContents();
        return htmlToMarkdown(html.innerHTML);
      }
    }).then(results => {
      navigator.clipboard.writeText(results[0].result);
    });
  }
});
```

Step 5: Copy Links as Markdown {#step-5-copy-links-as-markdown}

When right-clicking a link, extract the URL and text to format as `[text](url)`. The context menu provides `info.linkText` and `info.linkUrl` for this purpose.

```javascript
if (info.menuItemId === "copyLink") {
  const markdown = `[${info.linkText}](${info.linkUrl})`;
  navigator.clipboard.writeText(markdown);
}
```

Step 6: Copy Page Title and URL {#step-6-copy-page-title-and-url}

For copying the entire page, use the tab's title and URL. This creates a reference link in Markdown: `[Page Title](https://example.com)`.

```javascript
if (info.menuItemId === "copyPage") {
  const markdown = `[${tab.title}](${tab.url})`;
  navigator.clipboard.writeText(markdown);
}
```

Step 7: Add a Popup with Preview {#step-7-add-a-popup-with-preview}

Create `popup.html` to show a preview of the converted Markdown before copying. This gives users confidence that the conversion worked correctly.

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 10px; font-family: sans-serif; }
    textarea { width: 100%; height: 200px; }
    button { margin-top: 10px; }
  </style>
</head>
<body>
  <h3>Copy as Markdown</h3>
  <textarea id="preview"></textarea>
  <button id="copyBtn">Copy to Clipboard</button>
  <script src="popup.js"></script>
</body>
</html>
```

Advanced Features {#advanced-features}

Table Conversion {#table-conversion}

Convert HTML tables to Markdown pipe tables with proper alignment:

```javascript
function tableToMarkdown(table) {
  const rows = table.querySelectorAll('tr');
  return Array.from(rows, row => {
    const cells = row.querySelectorAll('th, td');
    return '| ' + Array.from(cells, c => c.textContent).join(' | ') + ' |';
  }).join('\n');
}
```

Markdown Flavor Options {#markdown-flavor-options}

Support different Markdown flavors (GFM, CommonMark) by adding an options page. GFM supports tables, task lists, and strikethrough, while CommonMark is more strict.

Copy Notification {#copy-notification}

Provide visual feedback when content is copied using the Chrome notifications API or a simple toast in the popup.

Related Patterns {#related-patterns}

- See [Clipboard Patterns](/patterns/clipboard-patterns.md) for best practices
- Reference [Context Menus API](/api-reference/context-menus-api.md) for full API details
- Check [Context Menu Patterns](/patterns/context-menu-patterns.md) for UI patterns

Conclusion {#conclusion}

This extension demonstrates core Chrome extension concepts: context menus, clipboard access, and content script injection. With these foundations, you can extend functionality to support more Markdown features or integrate with note-taking apps.
-e 
---

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
