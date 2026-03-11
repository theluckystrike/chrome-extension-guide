---
layout: post
title: "Build a Simple Ad Blocker Chrome Extension with declarativeNetRequest"
description: "Learn how to create a simple ad blocker Chrome extension from scratch using declarativeNetRequest API. This step-by-step tutorial covers Manifest V3 setup, blocking rules, and publishing your ad blocker to the Chrome Web Store."
date: 2025-04-20
categories: [Chrome-Extensions, Tutorials]
tags: [ad-blocker, declarativeNetRequest, chrome-extension]
keywords: "chrome extension ad blocker, build ad blocker chrome, declarativeNetRequest ad block, simple ad blocker extension, chrome extension block ads mv3"
author: theluckystrike
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/20/build-simple-ad-blocker-chrome-extension/"
---

# Build a Simple Ad Blocker Chrome Extension with declarativeNetRequest

Ad blockers are among the most popular Chrome extensions available, with millions of users relying on them to enjoy a cleaner, faster browsing experience. Building your own ad blocker is not only a rewarding project but also an excellent way to learn advanced Chrome extension development techniques.

In this comprehensive guide, I'll walk you through creating a simple yet functional ad blocker Chrome extension using the declarativeNetRequest API—the modern, privacy-focused approach introduced with Manifest V3. By the end of this tutorial, you'll have a complete extension that can block ads, is ready for testing, and can be published to the Chrome Web Store.

---

## Prerequisites

Before we begin building our ad blocker, ensure you have the following:

- A Google Chrome browser (for testing your extension)
- A code editor (VS Code is recommended)
- Basic knowledge of JavaScript and JSON
- A Google account (for publishing to the Chrome Web Store)

No prior Chrome extension experience is required—we'll cover everything step by step.

---

## Understanding declarativeNetRequest

The declarativeNetRequest API is Google's recommended way to block or modify network requests in Manifest V3 extensions. Unlike the older webRequest API used in Manifest V2, declarativeNetRequest doesn't require permission to read network requests—instead, you provide Chrome with a set of rules, and Chrome applies them internally.

This approach offers several advantages:

- **Privacy**: Your extension never sees user's network requests
- **Performance**: Chrome applies rules natively without invoking your code for each request
- **Security**: Users don't need to grant broad permissions
- **Reliability**: Rules are applied consistently without race conditions

---

## Step 1: Create the Project Structure

Let's start by setting up our project directory and creating the necessary files:

```bash
my-simple-ad-blocker/
├── manifest.json
├── rules.json
├── popup.html
├── popup.js
├── popup.css
├── background.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

Create a new folder called `my-simple-ad-blocker` and add these files. Don't worry about the icons for now—we'll generate simple placeholder icons or skip them initially.

---

## Step 2: Create the Manifest

The manifest.json file is the heart of every Chrome extension. Create this file with the following content:

```json
{
  "manifest_version": 3,
  "name": "Simple Ad Blocker",
  "version": "1.0.0",
  "description": "Block annoying ads with a simple, lightweight ad blocker extension",
  "permissions": [
    "declarativeNetRequest",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
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

Key points about this manifest:

- **manifest_version: 3** — We're using the latest Manifest V3
- **declarativeNetRequest permission** — Required to block network requests
- **storage permission** — For saving user preferences
- **host_permissions** — Needed to apply rules across all websites

---

## Step 3: Define Blocking Rules

The rules.json file contains our blocking rules. This is where we specify which network requests should be blocked. Create this file:

```json
{
  "rules": [
    {
      "id": 1,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": "doubleclick.net",
        "resourceTypes": ["script", "image", "sub_frame"]
      }
    },
    {
      "id": 2,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": "googlesyndication.com",
        "resourceTypes": ["script", "image", "sub_frame"]
      }
    },
    {
      "id": 3,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": "googleadservices.com",
        "resourceTypes": ["script", "image", "sub_frame"]
      }
    },
    {
      "id": 4,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": "adservice.google.com",
        "resourceTypes": ["script"]
      }
    },
    {
      "id": 5,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": "pagead2.googlesyndication.com",
        "resourceTypes": ["script", "image", "sub_frame"]
      }
    },
    {
      "id": 6,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": "ads.yahoo.com",
        "resourceTypes": ["script", "image", "sub_frame"]
      }
    },
    {
      "id": 7,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": "advertising.com",
        "resourceTypes": ["script", "image", "sub_frame"]
      }
    },
    {
      "id": 8,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": "amazon-adsystem.com",
        "resourceTypes": ["script", "image"]
      }
    },
    {
      "id": 9,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": "facebook.com/tr/",
        "resourceTypes": ["script", "image"]
      }
    },
    {
      "id": 10,
      "priority": 1,
      "action": {
        "type": "block"
      },
      "condition": {
        "urlFilter": "connect.facebook.net/en_US/fbevents",
        "resourceTypes": ["script"]
      }
    }
  ]
}
```

Each rule has:

- **id**: Unique identifier for the rule
- **priority**: Higher priority rules are evaluated first
- **action**: What to do when the condition matches (block, allow, redirect)
- **condition**: The URL pattern to match against

---

## Step 4: Create the Background Script

The background script loads our rules when the extension starts. Create background.js:

```javascript
// Background service worker for Simple Ad Blocker

// Define the rules when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Load the blocking rules from rules.json
  fetch('rules.json')
    .then(response => response.json())
    .then(rules => {
      // Update the rules with declarativeNetRequest
      chrome.declarativeNetRequest.updateDynamicRules({
        addRules: rules.rules,
        removeRuleIds: rules.rules.map(rule => rule.id)
      });
      console.log('Ad blocker rules loaded successfully');
    })
    .catch(error => {
      console.error('Error loading ad blocker rules:', error);
    });
});

// Log when the service worker starts
chrome.runtime.onStartup.addListener(() => {
  console.log('Simple Ad Blocker extension started');
});
```

---

## Step 5: Create the Popup UI

Now let's create a simple popup that shows the extension status. Create popup.html:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple Ad Blocker</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Simple Ad Blocker</h1>
    </div>
    
    <div class="status-container">
      <div class="status-indicator" id="statusIndicator">
        <span class="status-dot active"></span>
        <span class="status-text">Protection Active</span>
      </div>
    </div>
    
    <div class="stats">
      <div class="stat-item">
        <span class="stat-value" id="blockedCount">0</span>
        <span class="stat-label">Ads Blocked</span>
      </div>
    </div>
    
    <div class="info">
      <p>Blocking ads on all websites</p>
    </div>
    
    <button id="toggleBtn" class="toggle-btn">Disable</button>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

---

## Step 6: Style the Popup

Create popup.css to make the popup look professional:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 280px;
  background: #f5f5f5;
}

.container {
  padding: 20px;
}

.header h1 {
  font-size: 18px;
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.status-container {
  background: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ccc;
}

.status-dot.active {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.5);
}

.status-dot.inactive {
  background: #ef4444;
}

.status-text {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.stats {
  background: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #22c55e;
}

.stat-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info {
  text-align: center;
  margin-bottom: 15px;
}

.info p {
  font-size: 12px;
  color: #666;
}

.toggle-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  background: #ef4444;
  color: white;
}

.toggle-btn.active {
  background: #22c55e;
}

.toggle-btn:hover {
  opacity: 0.9;
}
```

---

## Step 7: Add Popup Functionality

Create popup.js to handle user interactions:

```javascript
// Popup script for Simple Ad Blocker

let isEnabled = true;

// Toggle ad blocking on/off
document.getElementById('toggleBtn').addEventListener('click', async () => {
  isEnabled = !isEnabled;
  
  if (isEnabled) {
    // Enable blocking
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['rules']
    });
    updateUI(true);
  } else {
    // Disable blocking
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['rules']
    });
    updateUI(false);
  }
  
  // Save state
  await chrome.storage.local.set({ enabled: isEnabled });
});

// Update the UI based on current state
function updateUI(enabled) {
  const statusDot = document.querySelector('.status-dot');
  const statusText = document.querySelector('.status-text');
  const toggleBtn = document.getElementById('toggleBtn');
  
  if (enabled) {
    statusDot.classList.add('active');
    statusDot.classList.remove('inactive');
    statusText.textContent = 'Protection Active';
    toggleBtn.textContent = 'Disable';
    toggleBtn.classList.add('active');
  } else {
    statusDot.classList.remove('active');
    statusDot.classList.add('inactive');
    statusText.textContent = 'Protection Disabled';
    toggleBtn.textContent = 'Enable';
    toggleBtn.classList.remove('active');
  }
}

// Load saved state on startup
async function loadState() {
  const result = await chrome.storage.local.get('enabled');
  if (result.enabled !== undefined) {
    isEnabled = result.enabled;
    if (!isEnabled) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        disableRulesetIds: ['rules']
      });
    }
    updateUI(isEnabled);
  }
}

// Initialize
loadState();
```

---

## Step 8: Create Placeholder Icons

For the extension to work properly, you need icon files. Create a simple `icons` folder and use any image editor to create three PNG files (16x16, 48x48, and 128x128 pixels). Alternatively, you can use online tools to generate placeholder icons.

For testing purposes, you can also remove the icon references from manifest.json temporarily.

---

## Step 9: Test the Extension

Now let's test our ad blocker:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your `my-simple-ad-blocker` folder
4. Your extension should now appear in the list

Click the extension icon in Chrome's toolbar to see the popup. You should see the status showing "Protection Active" and the toggle button.

To verify the ad blocking is working, visit a website with ads (like a news site) and notice how fewer ads appear.

---

## How to Add More Blocking Rules

The declarativeNetRequest API has some important limitations:

- Maximum of 30,000 dynamic rules
- Rules must be organized by priority
- Each rule can only have one action type

To add more sophisticated blocking, you can:

1. **Block by domain**: Add more domains to your rules.json
2. **Block by content type**: Use resourceTypes to block only scripts or images
3. **Use regex**: For complex patterns (with limitations)
4. **Combine with content scripts**: For blocking in-page ad elements

---

## Publishing to Chrome Web Store

Once you're satisfied with your ad blocker, here's how to publish it:

1. **Prepare your extension**:
   - Create a 128x128 PNG icon
   - Take screenshots of your popup
   - Write a compelling description

2. **Zip your extension**:
   ```bash
   zip -r my-ad-blocker.zip my-simple-ad-blocker/
   ```

3. **Submit to Chrome Web Store**:
   - Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Create a new item
   - Upload your zip file
   - Fill in the required information
   - Submit for review

---

## Advanced Features to Consider

Once you have the basic ad blocker working, here are some features you can add:

### 1. Whitelist Support
Allow users to disable blocking on specific websites:

```javascript
// Check if site is whitelisted
async function isWhitelisted(tabId) {
  const result = await chrome.storage.local.get('whitelist');
  const whitelist = result.whitelist || [];
  const tab = await chrome.tabs.get(tabId);
  return whitelist.some(domain => tab.url.includes(domain));
}
```

### 2. Custom Rules UI
Allow users to add their own blocking rules through the popup interface.

### 3. Filter List Integration
Integrate with popular filter lists like EasyList for comprehensive ad blocking.

### 4. Statistics Dashboard
Track and display how many ads have been blocked over time.

---

## Troubleshooting

Common issues and solutions:

- **Rules not loading**: Check that rules.json is properly formatted
- **Extension not appearing**: Make sure manifest.json has no syntax errors
- **Ads still showing**: Some ads may be loaded dynamically by JavaScript
- **Popup not working**: Check that all files are in the correct locations
- **Rules not applying**: Ensure the background script is properly loading the rules
- **Performance issues**: Too many rules can slow down browser startup; consider using a smaller ruleset

### Debugging Tips

When developing your ad blocker, use Chrome's developer tools to troubleshoot issues effectively. The Extensions Management page (`chrome://extensions/) provides access to the service worker console, where you can view logs from your background script. Additionally, the Network tab in Chrome DevTools allows you to inspect network requests and verify which ones are being blocked by your extension. Understanding how to read these logs will significantly speed up your development process and help you identify issues with rule matching or extension initialization.

### Understanding Rule Priorities

The priority field in your rules is crucial for proper ad blocking behavior. When multiple rules could potentially match the same request, Chrome evaluates them based on priority values, with higher numbers indicating greater importance. In our simple ad blocker, all rules have the same priority (1), which works fine for basic use cases. However, when building more sophisticated blockers with both block and allow rules, understanding priority becomes essential. Allow rules should typically have higher priority than block rules when you want to whitelist specific domains while blocking everything else.

---

## Conclusion

Congratulations! You've built a functional ad blocker Chrome extension using declarativeNetRequest. This extension demonstrates the core concepts of modern Chrome extension development and provides a solid foundation for building more advanced features.

The ad blocker you created:

- Uses the modern Manifest V3 approach
- Blocks common ad networks
- Includes a user-friendly popup interface
- Persists user preferences
- Is ready for Chrome Web Store publication

From here, you can expand your ad blocker with whitelisting, statistics, custom rules, and integration with professional filter lists. The declarativeNetRequest API provides all the tools you need to create a professional-grade ad blocking experience.

Happy coding!

---

**Built by theluckystrike at zovo.one**
