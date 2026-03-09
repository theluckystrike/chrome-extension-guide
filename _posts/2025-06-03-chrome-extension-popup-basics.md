---
layout: post
title: "Chrome Extension Popup Basics"
<<<<<<< HEAD
description: "Create your first extension popup - a complete guide to building user interfaces for Chrome extensions"
=======
description: "Create Chrome extension popup interfaces with HTML, CSS, and JavaScript. Learn Manifest V3 action config, styling best practices, and size constraints."
>>>>>>> quality/fix-frontmatter-a9-r2
date: 2025-06-03
categories: [tutorial]
tags: [popup, ui, basics, manifest-v3, html]
---

The popup is the small window that appears when users click your extension icon in the Chrome toolbar. It's often the primary way users interact with your extension, making good popup design essential for user experience. In this guide, we'll cover everything from basic popup creation to advanced patterns.

## Creating a Basic Popup

Your popup needs an HTML file and must be declared in the manifest. The popup appears when users click your extension's icon in the toolbar. Let's build a complete popup from scratch.

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

The "action" key replaces the "browser_action" key from older manifest versions. In Manifest V3, all extension icons in the toolbar are managed through the action API.

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

.primary-button:active {
  background-color: #2a5bb8;
}

.error-message {
  color: #d93025;
  font-size: 12px;
  margin-top: 8px;
}

.success-message {
  color: #188038;
  font-size: 12px;
  margin-top: 8px;
}
```

## Popup Size Constraints

Chrome imposes reasonable limits on popup dimensions:

- **Maximum width**: 800 pixels
- **Maximum height**: 600 pixels
- **Minimum size**: No explicit minimum, but 25x25 is practical
- **Default size**: Chrome uses 350x400 if no width/height is specified

The popup automatically closes when users click outside of it or navigate to another page. This behavior is automatic and cannot be changed.

### Responsive Design for Popups

Design your popup to work well at different sizes:

```css
.container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-height: 300px) {
  .container {
    flex-direction: row;
    align-items: center;
  }
  
  h1 {
    margin-bottom: 0;
  }
}
```

## Adding Interactivity

Connect your HTML to JavaScript for dynamic functionality:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('actionBtn');
  
  button.addEventListener('click', async () => {
    try {
      // Get current tab information
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Execute a script on the current page
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => alert('Hello from your extension!')
      });
    } catch (error) {
      console.error('Error:', error);
    }
  });
});
```

### Handling Errors Gracefully

```javascript
async function handleButtonClick() {
  const button = document.getElementById('actionBtn');
  const messageDiv = document.getElementById('message');
  
  try {
    button.disabled = true;
    button.textContent = 'Loading...';
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.startsWith('http')) {
      throw new Error('Cannot run on this page');
    }
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.style.backgroundColor = 'lightblue'
    });
    
    messageDiv.textContent = 'Success!';
    messageDiv.className = 'success-message';
  } catch (error) {
    messageDiv.textContent = error.message;
    messageDiv.className = 'error-message';
  } finally {
    button.disabled = false;
    button.textContent = 'Get Started';
  }
}
```

## Communicating with Background Scripts

Popups often need to communicate with background scripts for persistent operations:

```javascript
// From popup.js to background.js
document.getElementById('actionBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ 
    action: 'processData', 
    data: { example: 'value' } 
  }, (response) => {
    console.log('Response:', response);
    if (response && response.success) {
      showMessage('Data processed successfully!');
    }
  });
});

function showMessage(text) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = text;
  messageDiv.className = 'success-message';
}
```

### Setting Up the Background Listener

In your service worker (background.js):

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'processData') {
    // Process the data
    const result = { success: true, processed: message.data };
    sendResponse(result);
  }
  return true; // Keep the message channel open for async response
});
```

## Best Practices for Popup Design

### Keep It Lightweight

Popups should be fast and focused. Avoid loading heavy libraries or making numerous network requests. Consider:

- Using vanilla JavaScript instead of frameworks
- Lazy loading any additional scripts
- Minimizing external dependencies
- Keeping your total popup size under 100KB

### Responsive Layout

Design for different screen sizes and consider that users may have different DPI settings:

```css
/* Use relative units */
button {
  padding: 0.5em 1em;
  font-size: 14px;
}

/* Flexible layouts */
.container {
  display: flex;
  flex-wrap: wrap;
}

/* Handle overflow gracefully */
.content {
  overflow-y: auto;
  max-height: 400px;
}
```

### Clear Actions

Place primary actions prominently and use clear labels. Users should understand what each button does immediately.

- Use descriptive button text ("Save Bookmark" not "Submit")
- Group related actions together
- Provide visual feedback for all interactions
- Include clear error messages when things go wrong

### Graceful Degradation

If your popup requires permissions users haven't granted, show a helpful message explaining how to enable them:

```javascript
async function checkPermissions() {
  const hasPermissions = await chrome.permissions.contains({
    permissions: ['activeTab']
  });
  
  if (!hasPermissions) {
    document.getElementById('permissionNotice').style.display = 'block';
  }
}
```

### Accessibility

Make your popup accessible to all users:

```html
<!-- Use proper labels -->
<button id="actionBtn" aria-label="Process current page">
  Process Page
</button>

<!-- Provide status messages -->
<div role="status" aria-live="polite" id="message"></div>
```

```css
/* High contrast focus states */
button:focus {
  outline: 2px solid #4285f4;
  outline-offset: 2px;
}

/* Support reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

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

### Implementing Page Navigation

```javascript
// In popup.js - redirect to a full settings page
document.getElementById('openSettings').addEventListener('click', () => {
  chrome.tabs.create({ url: 'settings.html' });
});

// Or in background.js
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: 'fullpage.html' });
});
```

### Deciding Between Popup and Full Page

Use a full page when:
- You need more screen real estate
- Complex forms or data input is required
- Users will spend significant time interacting
- You need to include iframes or complex layouts

Use a popup when:
- Quick actions are the primary use case
- Simple interfaces suffice
- Speed is important
- Frequent interactions are expected

## Conclusion

Well-designed popups create positive user experiences and make your extension feel professional. Focus on clarity, speed, and intuitive interactions. Remember that the popup is often users' first impression of your extension, so make it count!

Additional tips for success:
- Test your popup on different screen sizes
- Measure popup open/close times
- Gather user feedback about the interface
- Iterate on the design based on usage patterns
- Consider adding keyboard shortcuts for power users
