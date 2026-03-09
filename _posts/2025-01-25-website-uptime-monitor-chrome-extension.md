---
layout: post
title: "Build a Website Uptime Monitor Chrome Extension"
description: "Learn how to build a website uptime monitor Chrome extension from scratch. This comprehensive guide covers creating a website monitor extension, uptime checker Chrome tools, and site down checker extensions with practical code examples and best practices."
date: 2025-01-25
categories: [guides, chrome-extensions, development, tools]
tags: [website monitor extension, uptime checker chrome, site down checker extension, chrome extension development, website monitoring, uptime monitoring]
keywords: "website monitor extension, uptime checker chrome, site down checker extension, chrome extension development, build chrome extension, website monitoring tool"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/25/website-uptime-monitor-chrome-extension/"
---

# Build a Website Uptime Monitor Chrome Extension

In today's digital-first world, website uptime is critical for businesses, developers, and anyone who relies on web services. Whether you manage an e-commerce platform, run a blog, or depend on web applications for daily work, knowing immediately when a site goes down can save you from lost revenue, frustrated users, and hours of debugging. Building a website monitor extension for Chrome empowers you to track multiple websites simultaneously and receive instant notifications when something goes wrong.

This comprehensive guide walks you through creating a fully functional website uptime monitor Chrome extension from scratch. You'll learn how to implement background monitoring, configure notification systems, and build an intuitive user interface that displays real-time status information. By the end of this tutorial, you'll have a production-ready site down checker extension that you can use daily or publish to the Chrome Web Store.

---

## Why Build a Website Monitor Extension? {#why-build-extension}

The need for reliable website monitoring has never been greater. With businesses increasingly dependent on web services, even minutes of downtime can result in significant financial losses and damaged reputations. Building your own website monitor extension gives you complete control over what you monitor and how you receive alerts.

### The Problem with Existing Solutions

Many website monitoring tools exist, but they often come with significant limitations. Commercial uptime monitoring services typically charge per website or per check, making them expensive for monitoring multiple sites. Browser-based tools often require constant tab management or lack the ability to run checks when the browser is minimized. Additionally, many existing solutions are overly complicated, bundling monitoring with analytics, reporting, and other features you may not need.

A custom website monitor extension solves these problems by providing exactly what you need—simple, efficient monitoring without unnecessary complexity. You can monitor unlimited websites, customize check intervals to your exact specifications, and receive notifications through Chrome's built-in notification system.

### Benefits of Chrome Extension Monitoring

Chrome extensions offer unique advantages for website monitoring. They integrate seamlessly with your browser, eliminating the need for separate applications. Since you likely keep Chrome open throughout your workday, your monitoring runs continuously without requiring additional resources or background processes. The extension can also leverage Chrome's storage APIs for persistent data, meaning your monitored sites and preferences are saved across browser sessions.

---

## Project Architecture and Features {#project-architecture}

Before diving into code, let's establish the architecture of our website uptime monitor Chrome extension. This ensures we build a scalable, maintainable solution that meets real-world needs.

### Core Features

Our site down checker extension will include the following essential features:

First, multi-site monitoring allows you to add and track unlimited websites from a single interface. Each website gets its own status indicator, making it easy to see at a glance which sites are up and which are down.

Second, configurable check intervals let you determine how often each website is checked. You might check critical sites every minute while monitoring less important sites every 15 minutes, optimizing both accuracy and resource usage.

Third, status history provides a log of previous checks, helping you identify patterns or intermittent issues that might otherwise go unnoticed.

Fourth, visual and audio notifications alert you immediately when a website goes down or comes back up, ensuring you never miss important status changes.

Fifth, persistent storage saves your monitored sites and settings, so you don't need to reconfigure everything each time you restart Chrome.

### Technical Architecture

The extension uses Manifest V3, the latest Chrome extension platform, ensuring compatibility with modern Chrome features and security requirements. We'll implement a background service worker to handle periodic checks, a popup interface for managing monitored sites, and Chrome's storage API for data persistence.

---

## Setting Up the Project Structure {#project-structure}

Create a new folder for your project and set up the essential files. Your website monitor extension will need a manifest file, background script, popup interface, and content scripts.

### Manifest Configuration

The manifest.json file defines your extension's configuration and permissions. For an uptime checker Chrome extension, we need permissions for storage (to save monitored sites), notifications (to alert users), and background (to run the monitoring service).

```json
{
  "manifest_version": 3,
  "name": "Website Uptime Monitor",
  "version": "1.0.0",
  "description": "Monitor websites for uptime and receive instant notifications when sites go down",
  "permissions": [
    "storage",
    "notifications",
    "background"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

This configuration establishes the foundation for your website monitor extension, declaring the necessary permissions and entry points.

---

## Building the Background Monitoring Service {#background-service}

The background service worker is the heart of your website monitor extension. It runs independently of the popup interface and handles periodic checks on all monitored websites.

### Implementing the Monitoring Logic

Create the background.js file with the following implementation:

```javascript
// Default check interval in milliseconds (5 minutes)
const DEFAULT_INTERVAL = 300000;

// Store for monitored sites
let monitoredSites = [];

// Load monitored sites from storage
async function loadMonitoredSites() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['monitoredSites'], (result) => {
      monitoredSites = result.monitoredSites || [];
      resolve();
    });
  });
}

// Check a single website
async function checkWebsite(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors'
    });
    
    clearTimeout(timeoutId);
    return { status: 'up', url, timestamp: Date.now() };
  } catch (error) {
    return { status: 'down', url, timestamp: Date.now(), error: error.message };
  }
}

// Check all monitored websites
async function checkAllSites() {
  const results = await Promise.all(
    monitoredSites.map(site => checkWebsite(site.url))
  );
  
  // Check for status changes and send notifications
  for (const result of results) {
    const site = monitoredSites.find(s => s.url === result.url);
    if (site && site.lastStatus && site.lastStatus !== result.status) {
      sendNotification(site.name, result.status, result.url);
    }
    
    // Update last status
    site.lastStatus = result.status;
    site.lastCheck = result.timestamp;
  }
  
  // Save updated status
  await saveMonitoredSites();
  
  // Schedule next check
  scheduleNextCheck();
}

// Send notification for status change
function sendNotification(siteName, status, url) {
  const title = status === 'down' 
    ? '⚠️ Website Down!' 
    : '✅ Website Back Up!';
  
  const message = status === 'down'
    ? `${siteName} (${url}) is not responding`
    : `${siteName} (${url}) is back online`;
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: title,
    message: message,
    priority: 2
  });
}

// Schedule the next check
function scheduleNextCheck() {
  const interval = DEFAULT_INTERVAL;
  setTimeout(checkAllSites, interval);
}

// Save monitored sites to storage
function saveMonitoredSites() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ monitoredSites }, resolve);
  });
}

// Initialize the background service
async function init() {
  await loadMonitoredSites();
  if (monitoredSites.length > 0) {
    checkAllSites();
  }
  
  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSites') {
      sendResponse(monitoredSites);
    } else if (message.action === 'addSite') {
      monitoredSites.push(message.site);
      saveMonitoredSites().then(() => sendResponse({ success: true }));
      return true;
    } else if (message.action === 'removeSite') {
      monitoredSites = monitoredSites.filter(s => s.url !== message.url);
      saveMonitoredSites().then(() => sendResponse({ success: true }));
      return true;
    }
  });
}

init();
```

This background service handles continuous monitoring, checks websites at regular intervals, and sends notifications when status changes occur.

---

## Creating the Popup Interface {#popup-interface}

The popup interface provides users with an easy way to manage their monitored websites. Let's build an intuitive HTML and CSS interface.

### HTML Structure

Create popup.html with the following structure:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Website Uptime Monitor</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Website Monitor</h1>
      <span class="subtitle">Uptime Checker Chrome Extension</span>
    </header>
    
    <div class="add-site-form">
      <input type="text" id="siteName" placeholder="Site name (e.g., My Blog)">
      <input type="url" id="siteUrl" placeholder="https://example.com">
      <button id="addSite">Add Site</button>
    </div>
    
    <div class="sites-list" id="sitesList">
      <!-- Monitored sites will be rendered here -->
    </div>
    
    <footer>
      <p>Monitoring <span id="siteCount">0</span> websites</p>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Styling the Interface

Create popup.css to style your popup:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 350px;
  background: #f5f5f5;
}

.container {
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 20px;
  color: #333;
}

.subtitle {
  font-size: 12px;
  color: #666;
}

.add-site-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.add-site-form input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.add-site-form button {
  padding: 10px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.add-site-form button:hover {
  background: #3367d6;
}

.sites-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.site-card {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.site-info h3 {
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
}

.site-info p {
  font-size: 12px;
  color: #666;
  word-break: break-all;
}

.site-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-indicator.up {
  background: #34a853;
}

.status-indicator.down {
  background: #ea4335;
}

.status-indicator.unknown {
  background: #fbbc04;
}

.remove-btn {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  font-size: 18px;
}

.remove-btn:hover {
  color: #ea4335;
}

footer {
  margin-top: 20px;
  text-align: center;
  font-size: 12px;
  color: #666;
}
```

### Popup JavaScript

Create popup.js to handle user interactions:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  
  document.getElementById('addSite').addEventListener('click', addSite);
});

async function loadSites() {
  const sites = await chrome.runtime.sendMessage({ action: 'getSites' });
  renderSites(sites || []);
}

async function addSite() {
  const nameInput = document.getElementById('siteName');
  const urlInput = document.getElementById('siteUrl');
  
  const name = nameInput.value.trim();
  let url = urlInput.value.trim();
  
  if (!name || !url) {
    alert('Please enter both site name and URL');
    return;
  }
  
  // Ensure URL has protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  await chrome.runtime.sendMessage({
    action: 'addSite',
    site: { name, url, lastStatus: 'unknown' }
  });
  
  nameInput.value = '';
  urlInput.value = '';
  
  loadSites();
}

async function removeSite(url) {
  await chrome.runtime.sendMessage({
    action: 'removeSite',
    url: url
  });
  
  loadSites();
}

function renderSites(sites) {
  const list = document.getElementById('sitesList');
  document.getElementById('siteCount').textContent = sites.length;
  
  if (sites.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #666;">No websites monitored yet. Add your first site above!</p>';
    return;
  }
  
  list.innerHTML = sites.map(site => `
    <div class="site-card">
      <div class="site-info">
        <h3>${escapeHtml(site.name)}</h3>
        <p>${escapeHtml(site.url)}</p>
      </div>
      <div class="site-status">
        <span class="status-indicator ${site.lastStatus || 'unknown'}"></span>
        <button class="remove-btn" data-url="${escapeHtml(site.url)}">&times;</button>
      </div>
    </div>
  `).join('');
  
  // Add remove handlers
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      removeSite(e.target.dataset.url);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

---

## Testing Your Website Monitor Extension {#testing}

Now that you've built all the components, it's time to test your website uptime monitor Chrome extension.

### Loading the Extension in Chrome

Open Chrome and navigate to chrome://extensions/. Enable Developer mode using the toggle in the top right corner. Click the "Load unpacked" button and select your extension folder. Your website monitor extension should now appear in the extension list.

Click the extension icon in your browser toolbar to open the popup. Try adding a website to monitor—for example, "Google" with URL "https://google.com". The site should appear in your list.

### Verifying the Monitoring Functionality

After adding a site, wait for the background service to run a check (up to 5 minutes with default settings), or restart the extension to trigger an immediate check. You should see the status indicator change to green (up) for accessible websites.

To test the down detection, add a URL for a site you know is down, or use a non-existent domain. The extension should detect the failure and display a red indicator.

### Testing Notifications

When a website status changes from up to down or vice versa, Chrome should display a notification. Make sure Chrome notifications are enabled in your system settings to receive these alerts.

---

## Best Practices and Enhancements {#best-practices}

Now that you have a working site down checker extension, consider these improvements to make it even more powerful.

### Adding Custom Check Intervals

Currently, all websites are checked every 5 minutes. You can enhance the extension to allow per-site check intervals. Add an interval field to each site object in your storage, and modify the background service to check each site according to its individual interval.

### Implementing Status History

Track historical uptime data by storing check results over time. This allows you to calculate uptime percentages and identify patterns in website availability. Display this information in the popup to provide valuable insights.

### Adding HTTP Status Code Checking

The current implementation only checks if a site responds. Enhance it to verify specific HTTP status codes, ensuring you distinguish between different types of failures (server errors vs. DNS failures vs. timeouts).

### Supporting Multiple Check Locations

Consider adding support for checking websites from different geographic locations using serverless functions or a simple backend. This helps identify regional outages that might not be apparent from your location.

---

## Publishing Your Extension {#publishing}

Once you've tested your website monitor extension thoroughly, you can publish it to the Chrome Web Store to share with others.

### Preparing for Publication

Update your manifest.json with complete metadata including a detailed description, screenshots, and a small promotional image. Create appropriately sized icons (128x128 for the store listing, plus 16, 48, and 96 pixel versions for the extension itself).

### Submitting to the Chrome Web Store

Create a developer account at the Chrome Web Store Developer Dashboard. Package your extension into a ZIP file and upload it through the dashboard. Fill in the store listing details, including the description that highlights your extension's key features: website monitor extension, uptime checker Chrome functionality, and site down checker capabilities.

After submission, Google reviews your extension (typically within a few hours to a day). Once approved, your extension becomes available to all Chrome users searching for website monitoring tools.

---

## Conclusion {#conclusion}

Congratulations! You've built a complete website uptime monitor Chrome extension from scratch. This site down checker extension provides essential functionality for anyone who needs to track website availability, from developers managing production services to businesses monitoring their online presence.

The extension demonstrates several important Chrome extension development concepts: background service workers for persistent tasks, storage APIs for data persistence, notification APIs for user alerts, and message passing between different extension components. These skills transfer directly to other extension projects you might tackle.

As you use and refine your website monitor extension, you'll discover additional features that would make it even more useful. Perhaps you'd like to add email alerts, integrate with Slack, or create a dashboard for visualizing uptime statistics. The foundation you've built provides the perfect starting point for any of these enhancements.

Remember to test thoroughly before publishing, gather user feedback, and continue iterating on your extension. With dedication and user-centered design, your website monitor extension could become an essential tool for thousands of Chrome users seeking reliable uptime monitoring.

Start using your new uptime checker Chrome extension today, and never miss a moment when one of your critical websites goes down!
