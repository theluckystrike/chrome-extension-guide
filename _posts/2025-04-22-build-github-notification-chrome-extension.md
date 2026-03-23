---
layout: post
title: "Build a GitHub Notification Chrome Extension: Never Miss a PR or Issue"
description: "Learn to build a GitHub notification Chrome extension that monitors PRs, issues, and reviews. Complete guide with Manifest V3, GitHub API integration, and real-time alerts."
date: 2025-04-22
categories: [Chrome-Extensions, Tutorials]
tags: [github, notifications, chrome-extension]
keywords: "chrome extension github notifications, github notification extension, build github chrome extension, github alert chrome, pr notification extension"
canonical_url: "https://bestchromeextensions.com/2025/04/22/build-github-notification-chrome-extension/"
---

# Build a GitHub Notification Chrome Extension: Never Miss a PR or Issue

If you work with GitHub professionally, you know how easy it is to miss important pull requests, issue assignments, or review requests. The native GitHub notifications are good, but they require you to visit the site constantly or rely on email alerts that often get buried in your inbox. Building a custom GitHub notification Chrome extension gives you real-time desktop notifications directly in your browser, ensuring you never miss a critical update again.

In this comprehensive guide, we will walk through building a fully functional GitHub notification Chrome extension using Manifest V3, the GitHub REST API, and Chrome's notification system. By the end of this tutorial, you will have a working extension that monitors your repositories, tracks pull requests, watches for issue updates, and sends instant browser notifications when important events occur.

---

## Why Build a GitHub Notification Extension? {#why-build}

The default GitHub notification system has several limitations that a custom extension can address effectively. Understanding these challenges will help you design a better extension that solves real problems for developers.

### The Problem with Default Notifications

GitHub's native notification system requires you to either check the notifications page manually or rely on email alerts. Email notifications suffer from several issues: they are easily missed, can get filtered as spam, lack real-time urgency, and do not provide quick-action buttons to respond immediately. Additionally, email notifications cannot differentiate between high-priority items like review requests on your code and lower-priority updates like new comments on issues you are watching.

A custom Chrome extension solves these problems by providing instant browser-based notifications that appear the moment an event occurs. Users can click on notifications to jump directly to the relevant GitHub page, take quick actions, or dismiss alerts without leaving their current workflow. This creates a much more efficient workflow for developers who need to stay on top of multiple repositories.

### Benefits of a Custom Extension

Building your own GitHub notification extension provides several advantages over existing solutions. First, you have complete control over which events trigger notifications, allowing you to filter noise and focus only on what matters. You can set up different notification rules for different repositories, prioritizing critical projects while silencing less urgent updates.

Second, a custom extension can integrate additional context that GitHub's default notifications lack. You can show diff previews, highlight specific files changed, display reviewer information, or include any other metadata that helps you understand the notification at a glance. This context switching reduction saves significant time throughout your workday.

Finally, building this extension is an excellent learning opportunity. You will work with the GitHub API, implement OAuth authentication, handle Chrome's extension APIs, manage background workers, and create intuitive user interfaces. These skills transfer directly to other extension projects and general web development work.

---

## Project Architecture and Prerequisites {#architecture}

Before writing any code, let us establish a solid architectural foundation for our extension. Understanding the components and how they interact will make the development process much smoother.

### Extension Components Overview

Our GitHub notification extension will consist of five main components working together. The manifest file defines extension metadata and permissions. The background service worker handles API polling and manages notification scheduling. The popup interface provides users with configuration options and a quick status view. The content scripts handle any page-specific modifications, and the options page allows users to configure their notification preferences and GitHub authentication.

This modular architecture follows Chrome's best practices for Manifest V3 extensions and ensures clean separation of concerns. Each component has a specific responsibility, making the code easier to maintain and extend.

### Prerequisites and Tools

To follow this guide effectively, you will need a few prerequisites. You should have a basic understanding of JavaScript, HTML, and CSS, as these are the core technologies for Chrome extensions. Familiarity with asynchronous JavaScript patterns, particularly Promises and async/await, is essential since we will be making API calls that require handling asynchronous responses.

You will also need Node.js installed on your development machine to run local servers and test your extension. A code editor like Visual Studio Code with extensions for JSON validation and JavaScript linting will improve your development experience significantly. Finally, you will need a GitHub account to generate a personal access token for API authentication.

---

## Step 1: Setting Up the Manifest File {#manifest}

Every Chrome extension begins with the manifest.json file. This file tells Chrome about your extension's capabilities, permissions, and file structure. For our GitHub notification extension, we will use Manifest V3, which is the current standard.

Create a new folder for your extension and add the manifest.json file:

```json
{
  "manifest_version": 3,
  "name": "GitHub Notification Monitor",
  "version": "1.0.0",
  "description": "Real-time GitHub notifications for PRs, issues, and reviews",
  "permissions": [
    "notifications",
    "storage",
    "alarms",
    "activeTab"
  ],
  "host_permissions": [
    "https://api.github.com/*"
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

This manifest declares the permissions our extension needs. The "notifications" permission allows us to display browser notifications. The "storage" permission lets us save user preferences and cached data. The "alarms" permission enables periodic background polling for new notifications. The "host_permissions" allow our extension to make API calls to GitHub.

---

## Step 2: Implementing the Background Service Worker {#background}

The background service worker is the heart of our extension. It runs continuously in the background, periodically fetching notifications from the GitHub API and displaying alerts when new items are found.

Create the background.js file with the following implementation:

```javascript
// Configuration constants
const API_BASE = 'https://api.github.com';
const POLL_INTERVAL_MINUTES = 2;
const STORAGE_KEYS = {
  TOKEN: 'github_token',
  LAST_CHECK: 'last_check_timestamp',
  NOTIFICATIONS: 'cached_notifications'
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
  // Set up periodic alarm for checking notifications
  chrome.alarms.create('checkNotifications', {
    periodInMinutes: POLL_INTERVAL_MINUTES
  });
  
  console.log('GitHub Notification Monitor installed');
});

// Handle alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkNotifications') {
    checkForNewNotifications();
  }
});

// Main notification checking function
async function checkForNewNotifications() {
  try {
    // Get stored token
    const { github_token } = await chrome.storage.local.get('github_token');
    
    if (!github_token) {
      console.log('No GitHub token configured');
      return;
    }
    
    // Fetch notifications from GitHub API
    const response = await fetch(`${API_BASE}/notifications`, {
      headers: {
        'Authorization': `Bearer ${github_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const notifications = await response.json();
    
    // Get last check timestamp
    const { last_check_timestamp } = await chrome.storage.local.get('last_check_timestamp');
    
    // Filter for new notifications since last check
    const newNotifications = notifications.filter(notification => {
      const notificationTime = new Date(notification.updated_at).getTime();
      return !last_check_timestamp || notificationTime > last_check_timestamp;
    });
    
    // Store current timestamp for next check
    await chrome.storage.local.set({
      last_check_timestamp: Date.now()
    });
    
    // Store notifications for popup access
    await chrome.storage.local.set({
      cached_notifications: notifications.slice(0, 20)
    });
    
    // Display notifications for new items
    for (const notification of newNotifications) {
      await displayNotification(notification);
    }
    
    // Update badge with unread count
    updateBadge(notifications.length);
    
  } catch (error) {
    console.error('Error checking notifications:', error);
  }
}

// Display a Chrome notification
async function displayNotification(notification) {
  const subject = notification.subject;
  const repository = notification.repository.full_name;
  
  let title = '';
  let message = '';
  let iconUrl = 'icons/icon128.png';
  
  switch (notification.subject.type) {
    case 'PullRequest':
      title = 'New Pull Request';
      message = `${subject.title} in ${repository}`;
      break;
    case 'Issue':
      title = 'New Issue';
      message = `${subject.title} in ${repository}`;
      break;
    case 'Release':
      title = 'New Release';
      message = `${subject.title} in ${repository}`;
      break;
    default:
      title = 'GitHub Notification';
      message = `${subject.title} in ${repository}`;
  }
  
  await chrome.notifications.create({
    type: 'basic',
    iconUrl: iconUrl,
    title: title,
    message: message,
    priority: 1,
    buttons: [
      { title: 'View on GitHub' }
    ]
  });
}

// Update extension badge with notification count
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#FF453A' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}
```

This background script handles several critical functions. First, it sets up an alarm that triggers every two minutes to check for new notifications. When triggered, it fetches notifications from the GitHub API using the user's stored token, filters for items updated since the last check, and displays Chrome notifications for new items. It also updates the extension badge to show the current unread count.

---

## Step 3: Creating the Popup Interface {#popup}

The popup interface provides users with quick access to their notification status and configuration options. It displays recent notifications and allows users to enter their GitHub personal access token.

Create popup.html:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Notifications</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      width: 360px;
      min-height: 400px;
      background: #0d1117;
      color: #c9d1d9;
    }
    
    .header {
      padding: 16px;
      background: #161b22;
      border-bottom: 1px solid #30363d;
    }
    
    .header h1 {
      font-size: 16px;
      font-weight: 600;
      color: #f0f6fc;
      margin-bottom: 4px;
    }
    
    .header p {
      font-size: 12px;
      color: #8b949e;
    }
    
    .token-section {
      padding: 16px;
      border-bottom: 1px solid #30363d;
    }
    
    .token-section label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #c9d1d9;
    }
    
    .token-section input {
      width: 100%;
      padding: 8px 12px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #c9d1d9;
      font-size: 12px;
      font-family: monospace;
    }
    
    .token-section input:focus {
      outline: none;
      border-color: #58a6ff;
    }
    
    .token-section button {
      width: 100%;
      margin-top: 8px;
      padding: 8px 16px;
      background: #238636;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .token-section button:hover {
      background: #2ea043;
    }
    
    .notifications-list {
      max-height: 300px;
      overflow-y: auto;
    }
    
    .notification-item {
      padding: 12px 16px;
      border-bottom: 1px solid #30363d;
      cursor: pointer;
    }
    
    .notification-item:hover {
      background: #161b22;
    }
    
    .notification-type {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 600;
      color: #58a6ff;
      margin-bottom: 4px;
    }
    
    .notification-title {
      font-size: 13px;
      font-weight: 500;
      color: #f0f6fc;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .notification-repo {
      font-size: 11px;
      color: #8b949e;
    }
    
    .empty-state {
      padding: 32px 16px;
      text-align: center;
    }
    
    .empty-state p {
      font-size: 13px;
      color: #8b949e;
    }
    
    .footer {
      padding: 12px 16px;
      background: #161b22;
      border-top: 1px solid #30363d;
      text-align: center;
    }
    
    .footer button {
      background: transparent;
      border: 1px solid #30363d;
      color: #c9d1d9;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
    }
    
    .footer button:hover {
      background: #21262d;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>GitHub Notification Monitor</h1>
    <p id="status-text">Checking for notifications...</p>
  </div>
  
  <div class="token-section" id="token-section">
    <label for="github-token">GitHub Personal Access Token</label>
    <input type="password" id="github-token" placeholder="ghp_xxxxxxxxxxxx">
    <button id="save-token">Save Token</button>
  </div>
  
  <div class="notifications-list" id="notifications-list">
    <div class="empty-state">
      <p>No notifications to display</p>
    </div>
  </div>
  
  <div class="footer">
    <button id="refresh-btn">Refresh Now</button>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Now create popup.js to handle the popup logic:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  // Load saved token
  const { github_token } = await chrome.storage.local.get('github_token');
  if (github_token) {
    document.getElementById('github-token').value = github_token;
    document.getElementById('token-section').style.display = 'none';
    loadNotifications();
  }
  
  // Save token button
  document.getElementById('save-token').addEventListener('click', async () => {
    const token = document.getElementById('github-token').value.trim();
    if (token) {
      await chrome.storage.local.set({ github_token: token });
      document.getElementById('token-section').style.display = 'none';
      loadNotifications();
    }
  });
  
  // Refresh button
  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadNotifications();
  });
});

async function loadNotifications() {
  const { cached_notifications } = await chrome.storage.local.get('cached_notifications');
  const listEl = document.getElementById('notifications-list');
  const statusEl = document.getElementById('status-text');
  
  if (!cached_notifications || cached_notifications.length === 0) {
    statusEl.textContent = 'No unread notifications';
    listEl.innerHTML = '<div class="empty-state"><p>No notifications to display</p></div>';
    return;
  }
  
  statusEl.textContent = `${cached_notifications.length} unread notifications`;
  
  listEl.innerHTML = cached_notifications.map(notification => `
    <div class="notification-item" data-url="${notification.subject.url}">
      <div class="notification-type">${notification.subject.type}</div>
      <div class="notification-title">${notification.subject.title}</div>
      <div class="notification-repo">${notification.repository.full_name}</div>
    </div>
  `).join('');
  
  // Add click handlers
  document.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (url) {
        // Convert API URL to web URL
        const webUrl = url.replace('api.github.com/repos', 'github.com')
                          .replace('/pulls/', '/pull/')
                          .replace('/issues/', '/issues/');
        chrome.tabs.create({ url: webUrl });
      }
    });
  });
}
```

---

## Step 4: Creating Simple Icons {#icons}

For your extension to work properly, you need to create icon files. Create a simple "icons" folder and add placeholder icon files. For development purposes, you can create simple colored squares using any image editing tool or use online services to generate Chrome extension icons.

Ensure you have icon16.png (16x16 pixels), icon48.png (48x48 pixels), and icon128.png (128x128 pixels) in your icons folder. These will be displayed in the extension toolbar, notification popups, and the Chrome Web Store.

---

## Step 5: Generating a GitHub Personal Access Token {#token}

To fetch notifications from GitHub, your extension needs authentication. Personal Access Tokens (PAT) are the recommended approach for personal extensions. Here is how to create one:

1. Navigate to GitHub and click on your profile picture in the top right corner
2. Select "Settings" from the dropdown menu
3. In the left sidebar, scroll down and click "Developer settings"
4. Click "Personal access tokens" and then "Tokens (classic)"
5. Click "Generate new token"
6. Give your token a descriptive name, such as "Chrome Extension Notifications"
7. Select the following scopes: "repo" (for full control of private repositories), "notifications" (for reading notifications), and "read:user" (for user data)
8. Set an expiration date for security
9. Click "Generate token" and copy the token immediately

Important security note: Never commit your token to version control or share it publicly. In production extensions, you would implement OAuth flow for better security, but for this tutorial, a personal access token works well.

---

## Step 6: Testing Your Extension {#testing}

Now that you have all the components in place, it is time to test your extension in Chrome:

1. Open Chrome and navigate to chrome://extensions/
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your extension folder
4. The extension icon should appear in your Chrome toolbar
5. Click the extension icon and enter your GitHub personal access token
6. Click "Save Token" and then "Refresh Now"

Within a few minutes, you should start seeing notifications appear when there are updates to your GitHub notifications. The badge will show the count of unread notifications, and clicking on notification items will open the relevant GitHub page.

---

## Step 7: Enhancing and Polishing {#enhancing}

While the basic extension works well, several enhancements can make it more professional and useful. Consider adding these features to take your extension to the next level.

### Filtering and Custom Rules

Implement a filtering system that allows users to specify which repositories or notification types they care about. Some users may only want notifications for pull requests where they are the reviewer, while others may want alerts for all issue comments on specific repositories.

### Sound Alerts

Add optional sound notifications for high-priority events. You can use the Chrome audio API to play custom sounds when critical notifications arrive, ensuring users notice important updates even when they are not looking at their screen.

### Badge Customization

Allow users to customize the badge color and behavior. Some developers prefer always-visible badges, while others may want badges only during working hours or when specific conditions are met.

### Dark Mode

While the popup already uses dark theme colors, adding an option to toggle between light and dark modes would improve accessibility and user preference accommodation.

---

## Publishing Your Extension {#publishing}

Once you have tested your extension thoroughly and added any desired enhancements, you can publish it to the Chrome Web Store. First, create a zip file containing all your extension files. Then, navigate to the Chrome Web Store Developer Dashboard, create a new item, and upload your zip file. Fill in the store listing details with compelling descriptions and screenshots, then submit for review.

After approval, your extension will be available to millions of Chrome users worldwide. Keep your extension updated with bug fixes and new features to maintain positive ratings and user engagement.

---

## Conclusion {#conclusion}

Building a GitHub notification Chrome extension is an excellent project that combines practical utility with valuable technical learning. You have learned how to work with Manifest V3, implement background service workers, interact with the GitHub API, create intuitive user interfaces, and handle browser notifications.

The extension you built today solves a real problem for developers who need to stay on top of their GitHub activity without constantly checking the website. With the solid foundation established in this guide, you can continue adding features, refining the user experience, and eventually publishing your extension to help thousands of other developers streamline their workflows.

Remember that the best extensions solve problems you personally experience. As you use your GitHub notification extension daily, you will discover opportunities for improvement that will guide your development priorities. Happy building!
