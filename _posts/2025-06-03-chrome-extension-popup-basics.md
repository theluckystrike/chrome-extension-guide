---
layout: post
title: "Chrome Extension Popup Basics"
<<<<<<< HEAD
<<<<<<< HEAD
description: "Create Chrome extension popups from scratch. Learn HTML popup files, Manifest V3 configuration, CSS styling, and JavaScript for user interfaces in this guide."
=======
description: "Learn to create Chrome extension popup interfaces with HTML, CSS, and JavaScript. Master Manifest V3 action config, styling best practices, and constraints."
>>>>>>> quality/fix-frontmatter-a7-r4
=======
description: "Learn how to create Chrome extension popups from scratch. This guide covers HTML structure, CSS styling, JavaScript interactivity, popup size constraints, and best practices for building user-friendly extension interfaces."
>>>>>>> quality/fix-frontmatter-a10-r3
date: 2025-06-03
categories: [tutorial]
tags: [popup, ui, basics, manifest-v3, html]
keywords: "chrome extension popup, extension popup tutorial, chrome popup html css, extension ui design, manifest v3 action popup"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/06/03/chrome-extension-popup-basics/"
---

The popup is the small window that appears when users click your extension icon in the Chrome toolbar. It's often the primary way users interact with your extension, making good popup design essential for user experience.

## Creating a Basic Popup

Your popup needs an HTML file and must be declared in the manifest. The popup appears when users click your extension's icon in the toolbar.

### Step 1: Define the Popup in Manifest V3

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  }
}
```

The "action" key replaces the "browser_action" key from older manifest versions.

### Step 2: Create the HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Extension</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>Extension Title</h1>
    <p>Welcome to my extension!</p>
    <button id="actionBtn" class="primary-button">Get Started</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### Step 3: Style Your Popup

```css
body {
  width: 320px;
  min-height: 400px;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #ffffff;
}

.container {
  padding: 16px;
}

h1 {
  font-size: 18px;
  margin-bottom: 8px;
  color: #333;
}

.primary-button {
  background-color: #4285f4;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
  font-size: 14px;
}

.primary-button:hover {
  background-color: #3367d6;
}
```

## Popup Size Constraints

Chrome imposes reasonable limits on popup dimensions:

- **Maximum width**: 800 pixels
- **Maximum height**: 600 pixels
- **Minimum size**: No explicit minimum, but 25x25 is practical

The popup automatically closes when users click outside of it or navigate to another page.

## Adding Interactivity

Connect your HTML to JavaScript for dynamic functionality:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('actionBtn');
  
  button.addEventListener('click', async () => {
    // Get current tab information
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Execute a script on the current page
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => alert('Hello from your extension!')
    });
  });
});
```

## Communicating with Background Scripts

Popups often need to communicate with background scripts for persistent operations:

```javascript
// From popup.js to background.js
chrome.runtime.sendMessage({ 
  action: 'processData', 
  data: { example: 'value' } 
}, (response) => {
  console.log('Response:', response);
});
```

## Best Practices for Popup Design

### Keep It Lightweight
Popups should be fast and focused. Avoid loading heavy libraries or making numerous network requests.

### Responsive Layout
Design for different screen sizes and consider that users may have different DPI settings.

### Clear Actions
Place primary actions prominently and use clear labels. Users should understand what each button does immediately.

### Graceful Degradation
If your popup requires permissions users haven't granted, show a helpful message explaining how to enable them.

## Advanced: Opening a Full Page

Sometimes a popup isn't enough. You can open a full page instead:

```json
{
  "action": {
    "default_title": "Open Settings",
    "default_click_handler": "openSettingsPage"
  }
}
```

## Conclusion

Well-designed popups create positive user experiences and make your extension feel professional. Focus on clarity, speed, and intuitive interactions. Remember that the popup is often users' first impression of your extension, so make it count!
