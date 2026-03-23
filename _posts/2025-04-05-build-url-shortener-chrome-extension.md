---
layout: post
title: "Build a URL Shortener Chrome Extension: Complete Tutorial with API Integration"
description: "Learn how to build a URL shortener Chrome extension with Bitly API integration. Step-by-step tutorial covers Manifest V3, popup UI, API calls, and publishing."
date: 2025-04-05
categories: [Chrome-Extensions, Tutorials]
tags: [url-shortener, tutorial, chrome-extension]
keywords: "chrome extension url shortener, build url shortener extension, shorten links chrome extension, chrome extension bitly, url shortener tutorial"
canonical_url: "https://bestchromeextensions.com/2025/04/05/build-url-shortener-chrome-extension/"
---

# Build a URL Shortener Chrome Extension: Complete Tutorial with API Integration

URL shorteners have become an essential tool for marketers, social media managers, and anyone who shares links online. Long, unwieldy URLs are difficult to share, take up valuable character space on social media platforms, and can look unprofessional. Building a Chrome extension that shortens URLs directly from your browser eliminates the need to visit separate websites or use third-party apps.

In this comprehensive tutorial, we will build a fully functional URL shortener Chrome extension using the Bitly API and Manifest V3. By the end of this guide, you will have a production-ready extension that can shorten any URL with a single click, copy the shortened link to your clipboard, and even view your link history.

---

## Prerequisites {#prerequisites}

Before we begin building our URL shortener extension, make sure you have the following:

1. **Google Chrome Browser** - The extension will be built for Chrome, though it can be easily adapted for other browsers.
2. **A Bitly Account** - You will need a Bitly account to generate an API access token. Bitly offers a free tier that allows you to shorten a limited number of links per month.
3. **A Code Editor** - We recommend using Visual Studio Code, Sublime Text, or any editor you prefer.
4. **Basic Knowledge of HTML, CSS, and JavaScript** - This tutorial assumes you are familiar with web development fundamentals.

---

## Understanding the Architecture {#understanding-architecture}

Our Chrome extension will consist of several key components that work together to provide a seamless URL shortening experience:

- **manifest.json** - The configuration file that defines our extension's properties, permissions, and components.
- **popup.html** - The user interface that appears when clicking the extension icon.
- **popup.js** - The JavaScript logic that handles user interactions and API calls.
- **popup.css** - Styling to make our extension look professional and user-friendly.
- **background.js** - A service worker that can handle long-running tasks and events.

We will use the Bitly API v4 to shorten URLs. The API requires an access token for authentication, which you can obtain from your Bitly account settings.

---

## Step 1: Setting Up the Project Structure {#step-1-setup}

Create a new folder for your extension project. Inside this folder, create the following file structure:

```
url-shortener-extension/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── background.js
├── icon.png
└── README.md
```

The icon.png file should be a 128x128 pixel image that represents your extension. You can use any image editing tool to create a simple icon, or download a placeholder from icon finder websites.

---

## Step 2: Creating the Manifest File {#step-2-manifest}

The manifest.json file is the foundation of every Chrome extension. It tells Chrome about your extension's name, version, permissions, and the files that comprise it. For our URL shortener, we will use Manifest V3, which is the latest version of the Chrome extension platform.

Create a file named manifest.json and add the following content:

```json
{
  "manifest_version": 3,
  "name": "URL Shortener Pro",
  "version": "1.0.0",
  "description": "Quickly shorten URLs with Bitly integration. Copy shortened links to clipboard with one click.",
  "permissions": [
    "activeTab",
    "clipboardWrite",
    "storage"
  ],
  "host_permissions": [
    "https://api-ssl.bitly.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon.png",
      "48": "icon.png",
      "128": "icon.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "icons": {
    "16": "icon.png",
    "48": "icon.png",
    "128": "icon.png"
  }
}
```

Let us break down the key components of this manifest:

- **manifest_version**: We are using version 3, which is the current standard for Chrome extensions.
- **permissions**: We request access to the active tab (to get the current URL), clipboard writing (to copy shortened links), and storage (to save user preferences and history).
- **host_permissions**: We specifically allow access to the Bitly API domain.
- **action**: This defines what happens when the user clicks the extension icon - in our case, it opens the popup.
- **background**: We include a service worker for handling background tasks.

---

## Step 3: Building the Popup UI {#step-3-popup-ui}

The popup is the interface users interact with when they click our extension icon. It should be clean, intuitive, and provide all the functionality users need in a single view.

Create popup.html and add the following:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>URL Shortener</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>🔗 URL Shortener</h1>
    </header>
    
    <main>
      <div class="input-group">
        <label for="url-input">Enter URL to shorten:</label>
        <input type="url" id="url-input" placeholder="https://example.com/very-long-url">
      </div>
      
      <button id="shorten-btn" class="primary-btn">Shorten URL</button>
      
      <div id="result" class="result-container hidden">
        <label>Shortened URL:</label>
        <div class="url-display">
          <input type="text" id="shortened-url" readonly>
          <button id="copy-btn" class="icon-btn" title="Copy to clipboard">📋</button>
        </div>
      </div>
      
      <div id="loading" class="loading hidden">
        <span class="spinner"></span> Shortening...
      </div>
      
      <div id="error" class="error hidden"></div>
    </main>
    
    <footer>
      <div class="settings">
        <label for="api-token">Bitly API Token:</label>
        <input type="password" id="api-token" placeholder="Enter your Bitly token">
        <button id="save-token-btn" class="secondary-btn">Save Token</button>
      </div>
      <p class="help-text">
        <a href="#" id="get-token-link">Get your free Bitly token</a>
      </p>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure provides:
- An input field for entering the URL to shorten
- A button to trigger the shortening process
- A result area that displays the shortened URL with a copy button
- Loading and error states for better user experience
- A settings section for entering and saving the Bitly API token

---

## Step 4: Styling the Extension {#step-4-styling}

Now let us add some CSS to make our extension look professional. Create popup.css:

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
  color: #333;
}

.container {
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

header h1 {
  font-size: 18px;
  color: #1a73e8;
}

.input-group {
  margin-bottom: 15px;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

input[type="url"],
input[type="text"],
input[type="password"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

input:focus {
  outline: none;
  border-color: #1a73e8;
}

.primary-btn {
  width: 100%;
  padding: 12px;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.primary-btn:hover {
  background-color: #1557b0;
}

.primary-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.result-container {
  margin-top: 20px;
  padding: 15px;
  background-color: #e8f5e9;
  border-radius: 6px;
  border: 1px solid #c8e6c9;
}

.result-container label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #2e7d32;
}

.url-display {
  display: flex;
  gap: 8px;
}

.url-display input {
  flex: 1;
  background-color: white;
}

.icon-btn {
  padding: 8px 12px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.icon-btn:hover {
  background-color: #43a047;
}

.hidden {
  display: none !important;
}

.loading {
  text-align: center;
  margin-top: 15px;
  color: #666;
  font-size: 14px;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #1a73e8;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  margin-top: 15px;
  padding: 12px;
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 6px;
  color: #c62828;
  font-size: 13px;
}

footer {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.settings label {
  display: block;
  margin-bottom: 5px;
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.settings input {
  margin-bottom: 10px;
}

.secondary-btn {
  padding: 8px 16px;
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.secondary-btn:hover {
  background-color: #e0e0e0;
}

.help-text {
  margin-top: 10px;
  font-size: 12px;
  color: #888;
}

.help-text a {
  color: #1a73e8;
  text-decoration: none;
}

.help-text a:hover {
  text-decoration: underline;
}
```

This CSS provides a clean, modern design with:
- Proper spacing and typography
- Clear visual hierarchy
- Interactive states for buttons and inputs
- Success and error state styling
- Responsive layout

---

## Step 5: Implementing the JavaScript Logic {#step-5-javascript}

Now comes the core functionality. Create popup.js:

```javascript
// State management
let apiToken = '';

// DOM Elements
const urlInput = document.getElementById('url-input');
const shortenBtn = document.getElementById('shorten-btn');
const resultContainer = document.getElementById('result');
const shortenedUrlInput = document.getElementById('shortened-url');
const copyBtn = document.getElementById('copy-btn');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const apiTokenInput = document.getElementById('api-token');
const saveTokenBtn = document.getElementById('save-token-btn');
const getTokenLink = document.getElementById('get-token-link');

// Initialize extension
document.addEventListener('DOMContentLoaded', async () => {
  await loadApiToken();
  await getCurrentTab();
  loadHistory();
});

// Load API token from storage
async function loadApiToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['bitlyApiToken'], (result) => {
      if (result.bitlyApiToken) {
        apiToken = result.bitlyApiToken;
        apiTokenInput.value = apiToken;
      }
      resolve();
    });
  });
}

// Get current tab URL
async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      urlInput.value = tab.url;
    }
  } catch (error) {
    console.log('Could not get current tab URL:', error);
  }
}

// Save API token
saveTokenBtn.addEventListener('click', async () => {
  const token = apiTokenInput.value.trim();
  if (!token) {
    showError('Please enter a valid API token');
    return;
  }
  
  apiToken = token;
  chrome.storage.local.set({ bitlyApiToken: token }, () => {
    showError('');
    alert('API token saved successfully!');
  });
});

// Shorten URL button click handler
shortenBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  
  if (!url) {
    showError('Please enter a URL');
    return;
  }
  
  if (!isValidUrl(url)) {
    showError('Please enter a valid URL');
    return;
  }
  
  if (!apiToken) {
    showError('Please enter your Bitly API token in the settings below');
    return;
  }
  
  await shortenUrl(url);
});

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
  const url = shortenedUrlInput.value;
  try {
    await navigator.clipboard.writeText(url);
    copyBtn.textContent = '✓';
    setTimeout(() => {
      copyBtn.textContent = '📋';
    }, 2000);
  } catch (error) {
    showError('Failed to copy to clipboard');
  }
});

// Get token link click handler
getTokenLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://bitly.com/a/api' });
});

// Shorten URL function using Bitly API
async function shortenUrl(longUrl) {
  showLoading(true);
  hideError();
  hideResult();
  
  try {
    const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        long_url: longUrl,
        domain: 'bit.ly'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.description || 'Failed to shorten URL');
    }
    
    const data = await response.json();
    displayResult(data.link);
    saveToHistory(longUrl, data.link);
    
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

// Display shortened URL
function displayResult(shortUrl) {
  shortenedUrlInput.value = shortUrl;
  resultContainer.classList.remove('hidden');
}

// Save to local history
function saveToHistory(longUrl, shortUrl) {
  chrome.storage.local.get(['shortenHistory'], (result) => {
    const history = result.shortenHistory || [];
    history.unshift({
      longUrl,
      shortUrl,
      timestamp: Date.now()
    });
    // Keep only last 50 entries
    const trimmedHistory = history.slice(0, 50);
    chrome.storage.local.set({ shortenHistory: trimmedHistory });
  });
}

// Load history
function loadHistory() {
  chrome.storage.local.get(['shortenHistory'], (result) => {
    const history = result.shortenHistory || [];
    // You could add a history display here if needed
  });
}

// Validation helper
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// UI Helper functions
function showLoading(show) {
  if (show) {
    loadingElement.classList.remove('hidden');
    shortenBtn.disabled = true;
  } else {
    loadingElement.classList.add('hidden');
    shortenBtn.disabled = false;
  }
}

function showError(message) {
  if (message) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
  } else {
    hideError();
  }
}

function hideError() {
  errorElement.classList.add('hidden');
}

function hideResult() {
  resultContainer.classList.add('hidden');
}
```

This JavaScript handles:

1. **Initialization** - Loading saved API token and getting the current tab URL
2. **API Token Management** - Saving and retrieving the Bitly API token from Chrome storage
3. **URL Shortening** - Making API calls to Bitly and handling responses
4. **Clipboard Operations** - Copying shortened URLs to the clipboard
5. **History Management** - Saving shortened URLs to local storage for reference
6. **Error Handling** - Displaying user-friendly error messages

---

## Step 6: Creating the Background Service Worker {#step-6-background}

While our popup handles most of the functionality, adding a background service worker allows for additional capabilities like keyboard shortcuts and context menus.

Create background.js:

```javascript
// Background service worker for URL Shortener Extension

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'shorten-current-tab') {
    shortenActiveTab();
  }
});

// Function to shorten the active tab
async function shortenActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    
    // Get API token from storage
    const result = await chrome.storage.local.get(['bitlyApiToken']);
    const apiToken = result.bitlyApiToken;
    
    if (!apiToken) {
      // Open popup if no token
      chrome.action.openPopup();
      return;
    }
    
    // Shorten the URL
    const response = await fetch('https://api-ssl.bitly.com/v4/shorten', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        long_url: tab.url,
        domain: 'bit.ly'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Copy to clipboard
      await navigator.clipboard.writeText(data.link);
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'URL Shortened',
        message: `Short URL copied to clipboard: ${data.link}`
      });
    }
  } catch (error) {
    console.error('Error shortening URL:', error);
  }
}

// Add context menu option
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'shortenLink',
    title: 'Shorten this link',
    contexts: ['link', 'page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'shortenLink') {
    const urlToShorten = info.linkUrl || info.pageUrl;
    // Handle shortening from context menu
  }
});
```

---

## Step 7: Testing Your Extension {#step-7-testing}

Now that we have created all the files, it is time to test our extension:

1. **Open Chrome** and navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top right corner
3. Click **Load unpacked** and select your extension folder
4. The extension icon should appear in your Chrome toolbar
5. Click the icon to open the popup
6. Enter a Bitly API token (see below for how to get one)
7. Click "Shorten URL" to test the functionality

### Getting a Bitly API Token

To use the extension, you need a Bitly API token:

1. Go to [bitly.com](https://bitly.com) and create an account or log in
2. Navigate to Profile Settings > Developer Settings > API
3. Click "Generate Token"
4. Copy the token and paste it into the extension settings

---

## Step 8: Publishing to the Chrome Web Store {#step-8-publishing}

Once you have tested your extension and are satisfied with its functionality, you can publish it to the Chrome Web Store:

1. **Prepare your extension**:
   - Create a 128x128 pixel icon
   - Write a detailed description
   - Take screenshots of your extension in action
   - Create a promotional tile image (440x280 pixels)

2. **Zip your extension**:
   - Select all files in your extension folder
   - Create a ZIP file (do not include the parent folder)

3. **Submit to Chrome Web Store**:
   - Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)
   - Create a developer account (one-time $5 fee)
   - Click "Add new item" and upload your ZIP file
   - Fill in the required information
   - Submit for review

The review process typically takes a few hours to a few days. Once approved, your extension will be available to millions of Chrome users worldwide.

---

## Advanced Features to Consider {#advanced-features}

Once you have the basic URL shortener working, here are some enhancements you can add:

### 1. Multiple Shortener Services
Integrate with other URL shortening services like TinyURL, Rebrandly, or custom self-hosted solutions. This provides redundancy and flexibility.

### 2. Link History Dashboard
Create a more comprehensive history view that shows all previously shortened URLs, their click counts (if using Bitly's analytics), and allows for easy management.

### 3. Bulk URL Shortening
Add functionality to shorten multiple URLs at once, useful for social media managers who need to shorten several links for a campaign.

### 4. Custom Short Domains
Allow users to connect their own custom short domains for branded, professional-looking shortened URLs.

### 5. QR Code Generation
Add the ability to generate QR codes for shortened URLs, useful for offline marketing materials.

---

## Troubleshooting Common Issues {#troubleshooting}

### API Token Not Working
- Ensure you are using the correct token format (Bearer token)
- Check that your Bitly account is active
- Verify the token has not expired

### CORS Errors
- Manifest V3 handles CORS differently than V2
- Ensure you have the correct host_permissions in manifest.json
- Use the fetch API within the extension context

### Clipboard Not Working
- Some Chrome versions require explicit permissions
- Ensure clipboardWrite is in your manifest permissions

### Extension Not Loading
- Check for syntax errors in JSON files
- Ensure all file paths in manifest.json are correct
- Look for errors in the Chrome extensions page

---

## Conclusion {#conclusion}

Congratulations! You have successfully built a fully functional URL shortener Chrome extension with Bitly API integration. This extension demonstrates key concepts in Chrome extension development including:

- Manifest V3 configuration
- Popup UI design and implementation
- API integration with external services
- Local storage for persisting user data
- Clipboard operations
- Error handling and user feedback

The skills you have learned in this tutorial can be applied to build many other types of Chrome extensions. Whether you want to create a productivity tool, a social media helper, or a business application, the fundamentals remain the same.

Remember to test thoroughly before publishing, gather user feedback, and continue improving your extension based on real-world usage. With the Chrome Web Store's massive user base, your URL shortener extension has the potential to reach thousands or even millions of users.

Happy coding, and good luck with your extension!
