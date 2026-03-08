---
layout: post
title: "Build a Session Manager Chrome Extension: Complete 2025 Tutorial"
description: "Learn how to build a session manager extension that lets you save tabs session, restore tabs chrome, and organize your browsing workflow. Step-by-step tutorial with code examples."
date: 2025-01-20
categories: [Chrome Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "session manager extension, save tabs session, restore tabs chrome, chrome tab manager, chrome session manager tutorial"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/20/build-session-manager-chrome-extension/"
---

# Build a Session Manager Chrome Extension: Complete 2025 Tutorial

If you have ever lost a dozen tabs because Chrome crashed or you accidentally closed a window, you know how frustrating it can be to recover your workflow. A session manager extension solves this problem by letting you save tabs session and restore tabs chrome whenever you need them. In this comprehensive tutorial, you will learn how to build a complete session manager Chrome extension from scratch using Manifest V3.

This project is perfect for developers who want to learn Chrome extension development while building a genuinely useful tool. By the end of this guide, you will have a fully functional extension that can save browser sessions, list saved sessions, restore any session with a single click, and even delete sessions you no longer need.

---

## Why Build a Session Manager Extension? {#why-build-session-manager}

Before we dive into the code, let us consider why a session manager extension is an excellent project choice. First, it solves a real problem that millions of Chrome users face daily. Whether you are a researcher juggling multiple research projects, a developer working on different feature branches, or just someone who likes to keep their personal and work browsing separate, being able to save and restore tabs sessions is incredibly valuable.

Second, a session manager extension teaches you fundamental Chrome extension concepts that you will use in almost every extension you build. You will work with the Chrome Sessions API, learn how to manage browser storage, create popup interfaces, and implement background logic. These skills transfer directly to other extension projects you might tackle in the future.

Finally, the Chrome Web Store has a consistent demand for tab management tools. Building a quality session manager gives you a portfolio piece that demonstrates your ability to build practical, user-facing applications.

---

## Project Overview and Features {#project-overview}

Our session manager extension will include the following core features. First, we need the ability to save the current window session, capturing all open tabs including their URLs and titles. Second, we need a saved sessions list that displays all previously saved sessions with options to restore or delete them. Third, we need session restoration that opens all tabs from a saved session in the current window or a new window. Fourth, we need persistent storage using Chrome storage API to save sessions across browser restarts. Finally, we need a clean, intuitive popup interface that makes managing sessions easy.

Let us start building this extension step by step.

---

## Setting Up the Project Structure {#project-structure}

Create a new folder for your extension project and set up the following file structure:

```
session-manager/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── background.js
└── icon.png
```

The manifest.json file defines your extension configuration, popup.html provides the user interface, popup.js handles the popup logic, popup.css styles the interface, background.js runs in the background, and icon.png is your extension icon.

Let us start with the manifest file, which is the heart of any Chrome extension.

---

## Creating the Manifest File {#manifest-file}

The manifest.json file tells Chrome everything about your extension. For Manifest V3, we need to declare permissions, define the popup, and specify background service workers.

```json
{
  "manifest_version": 3,
  "name": "Session Manager",
  "version": "1.0",
  "description": "Save and restore your browser tabs with ease. Never lose your tabs again.",
  "permissions": [
    "sessions",
    "storage",
    "tabs"
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

The permissions array is critical here. We include sessions to access the Sessions API for getting window and tab information, storage to persist saved sessions across browser restarts, and tabs to access tab information and create new tabs during restoration.

---

## Building the Popup Interface {#popup-interface}

The popup is what users see when they click your extension icon. Let us create a clean, functional interface in popup.html.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session Manager</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Session Manager</h1>
      <button id="saveSession" class="primary-btn">Save Current Session</button>
    </header>
    
    <section class="sessions-section">
      <h2>Saved Sessions</h2>
      <div id="sessionsList" class="sessions-list">
        <p class="empty-message">No saved sessions yet.</p>
      </div>
    </section>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

This HTML provides a simple structure with a header containing the extension title and save button, followed by a sessions list area. The interface is minimal but functional, exactly what users expect from a productivity tool.

---

## Styling the Popup {#popup-styling}

Now let us add some CSS to make the popup look professional and user-friendly.

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 350px;
  min-height: 400px;
  background-color: #f5f5f5;
}

.container {
  padding: 16px;
}

header {
  text-align: center;
  margin-bottom: 20px;
}

h1 {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
}

h2 {
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.primary-btn {
  background-color: #4285f4;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  transition: background-color 0.2s;
}

.primary-btn:hover {
  background-color: #3367d6;
}

.sessions-section {
  margin-top: 20px;
}

.sessions-list {
  max-height: 300px;
  overflow-y: auto;
}

.empty-message {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 20px;
}

.session-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.session-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.session-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.session-tabs {
  font-size: 12px;
  color: #888;
}

.session-actions {
  display: flex;
  gap: 8px;
}

.restore-btn {
  background-color: #34a853;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  flex: 1;
  transition: background-color 0.2s;
}

.restore-btn:hover {
  background-color: #2d8e47;
}

.delete-btn {
  background-color: #ea4335;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.delete-btn:hover {
  background-color: #d33426;
}
```

The styling uses a clean, modern design with a white and blue color scheme that matches Chrome extension conventions. The sessions list has a maximum height with scroll to handle many saved sessions, and each session item has clear restore and delete buttons.

---

## Implementing the Popup Logic {#popup-logic}

Now comes the core functionality. The popup.js file handles saving sessions, displaying the saved sessions list, and restoring or deleting sessions.

```javascript
document.addEventListener('DOMContentLoaded', () => {
  loadSavedSessions();
  
  document.getElementById('saveSession').addEventListener('click', async () => {
    await saveCurrentSession();
    await loadSavedSessions();
  });
});

// Save the current browser session
async function saveCurrentSession() {
  try {
    // Get all windows
    const windows = await chrome.windows.getAll();
    
    let allTabs = [];
    
    // Collect tabs from all windows
    for (const window of windows) {
      if (window.type === 'normal') {
        const tabs = await chrome.tabs.query({ windowId: window.id });
        allTabs = allTabs.concat(tabs);
      }
    }
    
    // Filter out chrome:// URLs and other restricted pages
    const validTabs = allTabs.filter(tab => {
      return tab.url && !tab.url.startsWith('chrome://') && 
             !tab.url.startsWith('chrome-extension://') &&
             !tab.url.startsWith('devtools://');
    });
    
    if (validTabs.length === 0) {
      alert('No valid tabs to save!');
      return;
    }
    
    // Create session object
    const session = {
      id: Date.now().toString(),
      name: `Session ${new Date().toLocaleString()}`,
      timestamp: new Date().toISOString(),
      tabs: validTabs.map(tab => ({
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      })),
      tabCount: validTabs.length
    };
    
    // Get existing sessions from storage
    const result = await chrome.storage.local.get(['sessions']);
    const sessions = result.sessions || [];
    
    // Add new session
    sessions.unshift(session);
    
    // Save back to storage
    await chrome.storage.local.set({ sessions });
    
    console.log('Session saved successfully!');
  } catch (error) {
    console.error('Error saving session:', error);
    alert('Failed to save session. Please try again.');
  }
}

// Load and display saved sessions
async function loadSavedSessions() {
  const sessionsList = document.getElementById('sessionsList');
  
  try {
    const result = await chrome.storage.local.get(['sessions']);
    const sessions = result.sessions || [];
    
    if (sessions.length === 0) {
      sessionsList.innerHTML = '<p class="empty-message">No saved sessions yet.</p>';
      return;
    }
    
    sessionsList.innerHTML = sessions.map(session => `
      <div class="session-item" data-session-id="${session.id}">
        <div class="session-info">
          <span class="session-name">${escapeHtml(session.name)}</span>
          <span class="session-tabs">${session.tabCount} tabs</span>
        </div>
        <div class="session-actions">
          <button class="restore-btn" onclick="restoreSession('${session.id}')">Restore</button>
          <button class="delete-btn" onclick="deleteSession('${session.id}')">Delete</button>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
}

// Restore a saved session
async function restoreSession(sessionId) {
  try {
    const result = await chrome.storage.local.get(['sessions']);
    const sessions = result.sessions || [];
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      alert('Session not found!');
      return;
    }
    
    // Create a new window with all the saved tabs
    const tabUrls = session.tabs.map(tab => tab.url);
    
    // Open the first tab in the current window
    await chrome.tabs.create({ url: tabUrls[0], active: true });
    
    // Open remaining tabs
    for (let i = 1; i < tabUrls.length; i++) {
      await chrome.tabs.create({ url: tabUrls[i], active: false });
    }
    
    console.log('Session restored successfully!');
  } catch (error) {
    console.error('Error restoring session:', error);
    alert('Failed to restore session. Please try again.');
  }
}

// Delete a saved session
async function deleteSession(sessionId) {
  try {
    const result = await chrome.storage.local.get(['sessions']);
    let sessions = result.sessions || [];
    
    // Filter out the session to delete
    sessions = sessions.filter(s => s.id !== sessionId);
    
    // Save back to storage
    await chrome.storage.local.set({ sessions });
    
    // Reload the sessions list
    await loadSavedSessions();
    
    console.log('Session deleted successfully!');
  } catch (error) {
    console.error('Error deleting session:', error);
    alert('Failed to delete session. Please try again.');
  }
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

This JavaScript handles all the core functionality. The saveCurrentSession function gets all windows and tabs, filters out restricted URLs, and saves the session to Chrome local storage. The loadSavedSessions function retrieves saved sessions and displays them in the popup. The restoreSession function opens all saved tabs in a new window, and deleteSession removes a session from storage.

Note that we attach the restoreSession and deleteSession functions to the window object so they can be called from inline onclick handlers in the HTML.

---

## Adding Background Service Worker {#background-service}

While our extension primarily works through the popup, having a background service worker is useful for handling extension lifecycle events and can be extended later for features like auto-saving sessions.

```javascript
// Background service worker for Session Manager extension

console.log('Session Manager background service worker loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Session Manager extension installed');
  
  // Initialize storage if needed
  chrome.storage.local.get(['sessions'], (result) => {
    if (!result.sessions) {
      chrome.storage.local.set({ sessions: [] });
    }
  });
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Session Manager extension started');
});
```

This background script initializes storage on first install and logs when the extension starts up. You can extend this later to add features like automatic session saving when Chrome starts or periodic session backups.

---

## Creating the Extension Icon {#extension-icon}

You need a simple icon for your extension. Create a 128x128 PNG image and save it as icon.png in your project folder. You can use any image editor or create a simple icon programmatically. For development purposes, you can use a placeholder or generate one online.

---

## Testing Your Extension {#testing-extension}

Now that we have all the files created, let us test the extension in Chrome:

1. Open Chrome and navigate to chrome://extensions/
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your session-manager folder
4. The extension should now appear in your Chrome toolbar

Click the extension icon to open the popup. You should see the Session Manager interface with the "Save Current Session" button. Click it to save your current tabs, then refresh the popup to see your saved session appear in the list.

Try restoring a session to see all your tabs open in a new window. Try deleting a session to remove it from your saved list. Everything should work smoothly!

---

## Understanding Key Chrome APIs {#chrome-apis}

Throughout this tutorial, we used several important Chrome extension APIs. Understanding these APIs will help you build more advanced extensions in the future.

The chrome.tabs API provides methods for creating, retrieving, updating, and deleting tabs. We used chrome.tabs.query to get all tabs in a window and chrome.tabs.create to open new tabs during session restoration.

The chrome.windows API allows you to work with browser windows. We used chrome.windows.getAll to retrieve all open windows so we could save tabs from all of them.

The chrome.storage API provides persistent storage for extension data. We used chrome.storage.local to save and retrieve sessions, which persists the data even after Chrome closes and restarts.

The chrome.runtime API provides information about the extension and handles lifecycle events. We used it in our background script to handle installation and startup events.

---

## Extending Your Session Manager {#future-enhancements}

Now that you have a working session manager extension, here are some ideas for extending its functionality. You could add session naming to let users give custom names to their saved sessions instead of using timestamps. You could implement session exporting to allow users to export sessions as JSON files for backup or sharing. You could add tab previews to show a preview of each tab when hovering over a saved session. You could implement auto-save to automatically save sessions at regular intervals or when Chrome closes. Finally, you could add session syncing to sync sessions across devices using chrome.storage.sync.

---

## Conclusion {#conclusion}

Congratulations! You have successfully built a complete session manager Chrome extension. This extension demonstrates fundamental Chrome extension development concepts including Manifest V3 configuration, popup interface design, Chrome storage API usage, and the tabs and windows APIs.

The extension you built can save tabs session data, restore tabs chrome functionality, and manage multiple saved sessions. It provides a solid foundation that you can continue to expand and improve based on your needs or user feedback.

Building a real, functional extension like this is the best way to learn Chrome extension development. You have created something practical that solves a genuine problem, and you have gained the skills to build even more sophisticated extensions in the future.

Remember to test thoroughly before publishing to the Chrome Web Store, and consider adding a README and screenshots to your listing to help users understand your extension's functionality.

---

## Additional Resources {#resources}

To continue learning about Chrome extension development, explore the official Chrome Extension Documentation at Google's developer site. The Chrome Sessions API documentation provides detailed information about the APIs we used. The Chrome Web Store publishing guide explains how to distribute your extension to millions of users.

Happy coding, and enjoy using your new session manager extension!
