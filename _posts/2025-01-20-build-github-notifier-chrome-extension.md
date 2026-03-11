---
layout: post
title: "Build a GitHub Notification Chrome Extension"
description: "Learn how to build a GitHub notification Chrome extension that monitors pull requests, issues, and repository activity. This comprehensive guide covers GitHub API integration, Chrome extension architecture, and real-time notifications."
date: 2025-01-20
categories: [Chrome-Extensions, GitHub-Integration]
tags: [chrome-extension, github, tutorial, pull-request-notifications]
keywords: "github notifier extension, github chrome extension, pull request notifications, github notifications chrome, github api extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/20/build-github-notifier-chrome-extension/"
---

# Build a GitHub Notification Chrome Extension

In today's fast-paced development environment, staying on top of GitHub notifications is crucial for maintaining productivity and collaboration. Whether you're managing pull requests, tracking issues, or monitoring repository activity, having a dedicated GitHub notification Chrome extension can significantly streamline your workflow. This comprehensive guide will walk you through building a fully functional GitHub notifier extension from scratch.

By the end of this tutorial, you'll have a working Chrome extension that monitors your GitHub repositories, tracks pull requests, notifies you of new issues, and provides real-time alerts directly in your browser. We'll cover everything from setting up the project structure to implementing the GitHub API integration and creating a user-friendly notification system.

---

## Understanding GitHub Notifications and Chrome Extensions {#understanding-github-notifications}

Before diving into the code, it's essential to understand how GitHub notifications work and how Chrome extensions can interact with the GitHub API. This knowledge will help you design a robust and efficient notification system that meets the needs of modern developers.

### How GitHub Notifications Work

GitHub provides a comprehensive notifications API that allows developers to access their notification inbox programmatically. The API provides information about:

- Pull request reviews and comments
- Issue assignments and mentions
- Repository invitations
- Release announcements
- Security alerts
- CI/CD pipeline status updates

The GitHub Notifications API uses a polling mechanism where clients can fetch new notifications since their last check. This makes it ideal for building a Chrome extension that periodically checks for updates and alerts users when new activity occurs.

### Chrome Extension Capabilities for Notifications

Chrome extensions provide several powerful features that make them perfect for building notification systems:

- **Background Scripts**: Run continuously in the background to poll for updates
- **Chrome Notifications API**: Display native system notifications
- **Storage API**: Persist user preferences and notification history
- **Alarms API**: Schedule periodic checks at specific intervals
- **Badge API**: Show unread counts on the extension icon
- **Popup Interface**: Provide quick access to notification details

---

## Project Setup and Structure {#project-setup}

Let's start by setting up the project structure for our GitHub notification extension. We'll use Manifest V3, the latest version of the Chrome extension manifest format.

### Creating the Project Directory

First, create a new directory for your extension project:

```bash
mkdir github-notifier-extension
cd github-notifier-extension
```

### Manifest Configuration

Create the `manifest.json` file with all necessary permissions:

```json
{
  "manifest_version": 3,
  "name": "GitHub Notifier",
  "version": "1.0.0",
  "description": "Monitor GitHub notifications, pull requests, and repository activity",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "identity",
    "https://api.github.com/"
  ],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID",
    "scopes": ["notifications", "repo"]
  },
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

### Essential Permissions Explained

Understanding each permission is crucial for building a secure and functional extension:

- **storage**: Saves user settings, authentication tokens, and notification cache
- **alarms**: Schedules periodic GitHub API checks (every 5-15 minutes recommended)
- **notifications**: Displays desktop notifications for new activity
- **identity**: Enables OAuth authentication with GitHub
- **https://api.github.com/**: Allows communication with GitHub's API endpoints

---

## Authentication with GitHub {#authentication}

Implementing secure authentication is critical for accessing private repositories and user-specific notifications. We'll use OAuth 2.0 to authenticate users with their GitHub accounts.

### Setting Up OAuth Application

Before implementing authentication, you need to create an OAuth application in GitHub:

1. Go to GitHub Settings > Developer Settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in the application details:
   - Application Name: GitHub Notifier
   - Homepage URL: https://your-extension-site.com
   - Authorization callback URL: https://YOUR_EXTENSION_ID.chromiumapp.org/

### Implementing OAuth Flow

Create an `auth.js` module to handle the authentication flow:

```javascript
// auth.js - Authentication module

const CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';
const SCOPES = ['notifications', 'repo'];
const REDIRECT_URI = 'https://YOUR_EXTENSION_ID.chromiumapp.org/';

class GitHubAuth {
  constructor() {
    this.accessToken = null;
  }

  async authenticate() {
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({
        url: this.buildAuthUrl(),
        interactive: true
      }, (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        
        const token = this.extractToken(responseUrl);
        this.accessToken = token;
        this.storeToken(token);
        resolve(token);
      });
    });
  }

  buildAuthUrl() {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPES.join(' '),
      response_type: 'token'
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  extractToken(responseUrl) {
    const url = new URL(responseUrl);
    return url.hash.split('&')[0].split('=')[1];
  }

  async storeToken(token) {
    await chrome.storage.local.set({ githubToken: token });
    this.accessToken = token;
  }

  async getToken() {
    if (this.accessToken) return this.accessToken;
    
    const result = await chrome.storage.local.get('githubToken');
    this.accessToken = result.githubToken;
    return this.accessToken;
  }

  async isAuthenticated() {
    const token = await this.getToken();
    return token !== undefined;
  }

  async logout() {
    await chrome.storage.local.remove('githubToken');
    this.accessToken = null;
  }
}

export default new GitHubAuth();
```

### Token Management Best Practices

When handling authentication tokens in your extension, follow these security guidelines:

- **Never store tokens in plain text**: Use Chrome's secure storage when possible
- **Implement token refresh**: GitHub tokens can expire; implement refresh logic
- **Use minimal scopes**: Request only the permissions your extension needs
- **Handle errors gracefully**: Implement proper error handling for auth failures

---

## GitHub API Integration {#github-api-integration}

Now let's create the core module that interacts with GitHub's API to fetch notifications and repository data.

### Creating the GitHub API Module

```javascript
// github-api.js - GitHub API integration

import auth from './auth.js';

const API_BASE = 'https://api.github.com';

class GitHubAPI {
  constructor() {
    this.baseUrl = API_BASE;
  }

  async request(endpoint, options = {}) {
    const token = await auth.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  async getNotifications(all = false) {
    const params = new URLSearchParams({ all: all.toString() });
    return this.request(`/notifications?${params}`);
  }

  async getRepositoryNotifications(owner, repo) {
    return this.request(`/repos/${owner}/${repo}/notifications`);
  }

  async getPullRequests(owner, repo, state = 'open') {
    return this.request(`/repos/${owner}/${repo}/pulls?state=${state}`);
  }

  async getIssues(owner, repo, state = 'open') {
    return this.request(`/repos/${owner}/${repo}/issues?state=${state}`);
  }

  async getRepository(owner, repo) {
    return this.request(`/repos/${owner}/${repo}`);
  }

  async getUser() {
    return this.request('/user');
  }

  async markNotificationAsRead(threadId) {
    return this.request(`/notifications/threads/${threadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ read: true })
    });
  }

  async markAllAsRead() {
    return this.request('/notifications', {
      method: 'PUT',
      body: JSON.stringify({ read: true })
    });
  }
}

export default new GitHubAPI();
```

### Understanding Rate Limits

GitHub's API imposes rate limits that you must respect:

- **Authenticated requests**: 5,000 requests per hour
- **Unauthenticated requests**: 60 requests per hour
- **Default for extensions**: Starts at 5,000 when authenticated

Implement rate limiting in your extension:

```javascript
// rate-limiter.js - Rate limit management

class RateLimiter {
  constructor() {
    this.remaining = 5000;
    this.resetTime = null;
  }

  updateFromHeaders(headers) {
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');
    
    if (remaining !== null) {
      this.remaining = parseInt(remaining, 10);
    }
    
    if (reset !== null) {
      this.resetTime = new Date(parseInt(reset, 10) * 1000);
    }
  }

  canMakeRequest() {
    return this.remaining > 0;
  }

  async waitIfNeeded() {
    if (!this.canMakeRequest() && this.resetTime) {
      const waitTime = this.resetTime - new Date();
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
}

export default new RateLimiter();
```

---

## Background Service Worker Implementation {#background-worker}

The background service worker is the heart of your extension, responsible for polling GitHub and triggering notifications.

### Creating the Background Script

```javascript
// background.js - Background service worker

import github from './github-api.js';
import auth from './auth.js';
import { NotificationManager } from './notifications.js';
import { RateLimiter } from './rate-limiter.js';

const CHECK_INTERVAL_MINUTES = 5;
const notificationManager = new NotificationManager();
let lastCheckTime = null;

// Initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('GitHub Notifier installed');
  
  // Set up periodic alarm for checking notifications
  chrome.alarms.create('checkNotifications', {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
});

// Handle alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkNotifications') {
    await checkForNotifications();
  }
});

// Check for new notifications
async function checkForNotifications() {
  try {
    // Check authentication first
    if (!(await auth.isAuthenticated())) {
      console.log('User not authenticated');
      return;
    }

    // Fetch notifications
    const notifications = await github.getNotifications();
    
    // Filter for unread notifications since last check
    const newNotifications = filterNewNotifications(notifications);
    
    if (newNotifications.length > 0) {
      // Update badge with unread count
      await updateBadge(newNotifications.length);
      
      // Show notifications
      for (const notification of newNotifications) {
        await notificationManager.show(notification);
      }
      
      // Store last check time
      lastCheckTime = new Date().toISOString();
      await chrome.storage.local.set({ lastCheckTime });
    }
    
    // Update rate limiter
    RateLimiter.updateFromHeaders(/* from response headers */);
    
  } catch (error) {
    console.error('Error checking notifications:', error);
    
    // Handle authentication errors
    if (error.message.includes('Not authenticated')) {
      await notificationManager.showAuthRequired();
    }
  }
}

// Filter notifications to get only new ones
function filterNewNotifications(notifications) {
  if (!lastCheckTime) return notifications;
  
  return notifications.filter(n => {
    const updatedAt = new Date(n.updated_at);
    const lastCheck = new Date(lastCheckTime);
    return updatedAt > lastCheck;
  });
}

// Update extension badge with unread count
async function updateBadge(count) {
  await chrome.action.setBadgeText({ text: count.toString() });
  await chrome.action.setBadgeBackgroundColor({ color: '#ff4500' });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_NOTIFICATIONS':
      handleGetNotifications().then(sendResponse);
      return true;
      
    case 'MARK_AS_READ':
      handleMarkAsRead(message.threadId).then(sendResponse);
      return true;
      
    case 'MARK_ALL_READ':
      handleMarkAllAsRead().then(sendResponse);
      return true;
      
    case 'CHECK_AUTH':
      checkAuthStatus().then(sendResponse);
      return true;
  }
});

async function handleGetNotifications() {
  try {
    return await github.getNotifications();
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}

async function handleMarkAsRead(threadId) {
  try {
    await github.markNotificationAsRead(threadId);
    return { success: true };
  } catch (error) {
    console.error('Error marking as read:', error);
    return { success: false, error: error.message };
  }
}

async function handleMarkAllAsRead() {
  try {
    await github.markAllAsRead();
    await updateBadge(0);
    return { success: true };
  } catch (error) {
    console.error('Error marking all as read:', error);
    return { success: false, error: error.message };
  }
}

async function checkAuthStatus() {
  return await auth.isAuthenticated();
}
```

---

## Notification System Implementation {#notification-system}

Now let's create the notification system that displays native Chrome notifications to users.

### Creating the Notification Manager

```javascript
// notifications.js - Notification management

export class NotificationManager {
  constructor() {
    this.notificationId = 'github-notifier';
  }

  async show(notification) {
    const { subject, repository, updated_at } = notification;
    
    // Format the notification title and body
    const title = this.formatTitle(subject);
    const body = this.formatBody(subject, repository);
    const iconUrl = await this.getRepositoryIcon(repository);
    
    return new Promise((resolve) => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: iconUrl,
        title: title,
        message: body,
        priority: 1,
        buttons: [
          { title: 'View on GitHub' },
          { title: 'Mark as Read' }
        ]
      }, (notificationId) => {
        // Store notification for later reference
        chrome.storage.local.get(['notifications'], (result) => {
          const notifications = result.notifications || [];
          notifications.unshift({
            id: notificationId,
            threadId: subject.url,
            title,
            body,
            repository: repository.full_name,
            timestamp: updated_at
          });
          
          // Keep only last 50 notifications
          if (notifications.length > 50) {
            notifications.pop();
          }
          
          chrome.storage.local.set({ notifications });
        });
        
        resolve(notificationId);
      });
    });
  }

  formatTitle(subject) {
    // Handle different notification types
    switch (subject.type) {
      case 'PullRequest':
        return `🔀 Pull Request: ${subject.title}`;
      case 'Issue':
        return `🐛 Issue: ${subject.title}`;
      case 'Release':
        return `📦 Release: ${subject.title}`;
      case 'Discussion':
        return `💬 Discussion: ${subject.title}`;
      case 'CheckSuite':
        return `✅ CI Check: ${subject.title}`;
      default:
        return `📢 GitHub: ${subject.title}`;
    }
  }

  formatBody(subject, repository) {
    return `${repository.full_name}\n${this.getReasonText(subject.reason)}`;
  }

  getReasonText(reason) {
    const reasons = {
      assign: 'You were assigned',
      author: 'You are the author',
      ci_activity: 'CI activity completed',
      comment: 'New comment',
      invitation: 'Repository invitation',
      manual: 'Manual action required',
      mention: 'You were mentioned',
      review_requested: 'Review requested',
      security_alert: 'Security alert',
      state_change: 'State changed',
      subscribed: 'New activity',
      team_mention: 'Team mention'
    };
    return reasons[reason] || 'New activity';
  }

  async getRepositoryIcon(repository) {
    // Return a default icon or the repository's owner avatar
    return repository.owner.avatar_url;
  }

  async showAuthRequired() {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'GitHub Notifier',
      message: 'Please authenticate to receive notifications',
      priority: 2,
      buttons: [
        { title: 'Sign In' }
      ]
    });
  }

  async clearAll() {
    chrome.notifications.getAll((notifications) => {
      Object.keys(notifications).forEach(id => {
        chrome.notifications.clear(id);
      });
    });
  }
}
```

---

## Building the Popup Interface {#popup-interface}

The popup provides users with quick access to their notifications and settings.

### Creating the Popup HTML

```html
<!-- popup.html -->

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Notifier</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <img src="icons/icon48.png" alt="GitHub Notifier" class="logo">
      <h1>GitHub Notifier</h1>
      <button id="settings-btn" class="icon-btn">⚙️</button>
    </header>

    <div id="auth-section" class="hidden">
      <p>Connect your GitHub account to receive notifications</p>
      <button id="auth-btn" class="primary-btn">Sign in with GitHub</button>
    </div>

    <div id="notifications-section">
      <div class="section-header">
        <h2>Notifications</h2>
        <button id="mark-all-read" class="text-btn">Mark all read</button>
      </div>
      
      <div id="notifications-list" class="notifications-list">
        <!-- Notifications will be inserted here -->
      </div>
      
      <div id="empty-state" class="empty-state hidden">
        <p>No new notifications</p>
      </div>
    </div>

    <footer class="footer">
      <label class="toggle-label">
        <input type="checkbox" id="notifications-toggle" checked>
        <span>Enable notifications</span>
      </label>
    </footer>
  </div>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

### Creating the Popup Styles

```css
/* popup.css */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 360px;
  min-height: 400px;
  background: #0d1117;
  color: #c9d1d9;
}

.container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #30363d;
}

.logo {
  width: 32px;
  height: 32px;
}

.header h1 {
  font-size: 16px;
  flex: 1;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
}

#auth-section {
  padding: 24px;
  text-align: center;
}

.primary-btn {
  background: #238636;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 12px;
}

.primary-btn:hover {
  background: #2ea043;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #30363d;
}

.section-header h2 {
  font-size: 14px;
}

.text-btn {
  background: none;
  border: none;
  color: #58a6ff;
  cursor: pointer;
  font-size: 12px;
}

.text-btn:hover {
  text-decoration: underline;
}

.notifications-list {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
}

.notification-item {
  padding: 12px 16px;
  border-bottom: 1px solid #21262d;
  cursor: pointer;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #161b22;
}

.notification-item.unread {
  border-left: 3px solid #58a6ff;
}

.notification-title {
  font-size: 13px;
  margin-bottom: 4px;
}

.notification-repo {
  font-size: 11px;
  color: #8b949e;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #8b949e;
}

.footer {
  padding: 12px 16px;
  border-top: 1px solid #30363d;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;
}

.hidden {
  display: none !important;
}
```

### Creating the Popup JavaScript

```javascript
// popup.js - Popup interface logic

import auth from './auth.js';
import github from './github-api.js';

document.addEventListener('DOMContentLoaded', async () => {
  const authSection = document.getElementById('auth-section');
  const notificationsSection = document.getElementById('notifications-section');
  const notificationsList = document.getElementById('notifications-list');
  const emptyState = document.getElementById('empty-state');
  const authBtn = document.getElementById('auth-btn');
  const markAllReadBtn = document.getElementById('mark-all-read');
  const notificationsToggle = document.getElementById('notifications-toggle');

  // Check authentication status
  const isAuthenticated = await auth.isAuthenticated();
  
  if (isAuthenticated) {
    authSection.classList.add('hidden');
    notificationsSection.classList.remove('hidden');
    await loadNotifications();
  } else {
    authSection.classList.remove('hidden');
    notificationsSection.classList.add('hidden');
  }

  // Auth button click handler
  authBtn.addEventListener('click', async () => {
    try {
      await auth.authenticate();
      authSection.classList.add('hidden');
      notificationsSection.classList.remove('hidden');
      await loadNotifications();
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  });

  // Mark all as read button
  markAllReadBtn.addEventListener('click', async () => {
    await github.markAllAsRead();
    await loadNotifications();
    chrome.action.setBadgeText({ text: '' });
  });

  // Notifications toggle
  const settings = await chrome.storage.local.get('notificationsEnabled');
  notificationsToggle.checked = settings.notificationsEnabled !== false;
  
  notificationsToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ 
      notificationsEnabled: notificationsToggle.checked 
    });
  });

  // Load and display notifications
  async function loadNotifications() {
    try {
      const notifications = await github.getNotifications();
      
      if (notifications.length === 0) {
        notificationsList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');
      notificationsList.innerHTML = notifications.map(notification => 
        createNotificationHTML(notification)
      ).join('');

      // Add click handlers
      document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
          const url = item.dataset.url;
          if (url) {
            await chrome.tabs.create({ url });
          }
        });
      });

    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  function createNotificationHTML(notification) {
    const { subject, repository, updated_at } = notification;
    const timeAgo = getTimeAgo(new Date(updated_at));
    
    return `
      <div class="notification-item ${notification.unread ? 'unread' : ''}" 
           data-url="${subject.url}">
        <div class="notification-title">${subject.title}</div>
        <div class="notification-repo">${repository.full_name} • ${timeAgo}</div>
      </div>
    `;
  }

  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }
    return 'Just now';
  }
});
```

---

## Extension Testing and Debugging {#testing}

Testing Chrome extensions requires a different approach than regular web applications. Here's how to properly test your GitHub notifier.

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension directory
4. The extension icon should appear in your toolbar

### Testing Checklist

- [ ] OAuth authentication flow works correctly
- [ ] Notifications are fetched and displayed properly
- [ ] Badge updates with unread count
- [ ] Popup displays notification list
- [ ] Clicking notifications opens correct GitHub pages
- [ ] Mark as read functionality works
- [ ] Background polling works at set intervals

### Debugging Tips

Use Chrome DevTools to debug your extension:

```javascript
// In any extension script, use console.log for debugging
// View logs in chrome://extensions/ under your extension

// Check service worker logs
// Navigate to chrome://extensions/, find your extension,
// and click "service worker" > "console"
```

---

## Best Practices and Optimization {#best-practices}

Building a production-ready GitHub notification extension requires attention to several important considerations.

### Performance Optimization

- **Minimize API calls**: Cache notification data and only fetch updates
- **Use efficient polling**: Set appropriate intervals (5-15 minutes recommended)
- **Lazy load content**: Load notification details on-demand in the popup
- **Optimize badge updates**: Only update when new notifications arrive

### User Experience Improvements

- **Provide clear feedback**: Show loading states and error messages
- **Offer customization**: Allow users to filter notification types
- **Respect user preferences**: Honor quiet hours and notification settings
- **Fast startup**: Keep the popup loading time under 500ms

### Security Considerations

- **Secure token storage**: Use Chrome's recommended security practices
- **Validate all data**: Sanitize API responses before displaying
- **Implement HTTPS**: Only communicate over secure connections
- **Handle errors gracefully**: Provide meaningful error messages

### Error Handling

```javascript
// Comprehensive error handling example

async function safeApiCall(apiFunction, fallbackValue = null) {
  try {
    return await apiFunction();
  } catch (error) {
    console.error('API call failed:', error);
    
    // Handle specific error types
    if (error.message.includes('401')) {
      // Token expired or invalid
      await auth.logout();
      return { error: 'auth_required' };
    }
    
    if (error.message.includes('403')) {
      // Rate limited
      return { error: 'rate_limited' };
    }
    
    return { error: error.message, fallbackValue };
  }
}
```

---

## Conclusion {#conclusion}

Building a GitHub notification Chrome extension is a rewarding project that demonstrates the power of Chrome's extension APIs combined with the GitHub REST API. Throughout this guide, we've covered everything from project setup and authentication to building a complete notification system with a user-friendly interface.

Key takeaways from this tutorial include:

1. **Manifest V3**: Use the latest Chrome extension manifest version for better security and performance
2. **OAuth Authentication**: Implement secure GitHub authentication using OAuth 2.0
3. **Background Processing**: Leverage service workers for efficient background polling
4. **Native Notifications**: Use Chrome's notification API for system-wide alerts
5. **User Experience**: Build an intuitive popup interface for quick access

The extension you've built can be further enhanced with features like:

- Multiple GitHub account support
- Custom notification filters
- Repository-specific settings
- Desktop widget integration
- Keyboard shortcuts
- Dark mode support

By following the best practices outlined in this guide, you'll create a reliable and efficient extension that helps developers stay on top of their GitHub activity. Remember to test thoroughly, handle errors gracefully, and always prioritize user privacy and security.

Start building your GitHub notifier today and transform the way you manage your development workflow!

---

## Additional Resources {#resources}

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Chrome Extension Development Docs](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/mv3/identity/)
- [Chrome Notifications API](https://developer.chrome.com/docs/extensions/mv3/notifications/)
- [GitHub OAuth App Settings](https://github.com/settings/developers)

