---
layout: post
title: "Build a Distraction-Free Site Blocker Extension: Complete 2025 Guide"
description: "Learn how to build a powerful site blocker extension for Chrome in 2025. This comprehensive tutorial covers blocking distracting websites, implementing focus mode, and creating a productivity tool that actually works."
date: 2025-01-25
categories: [Chrome Extensions, Tutorial]
tags: [chrome-extension, project, tutorial]
keywords: "site blocker extension, block distracting sites, focus mode chrome, chrome extension tutorial, productivity extension"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/25/build-distraction-free-site-blocker-extension/"
---

# Build a Distraction-Free Site Blocker Extension: Complete 2025 Guide

In an era where digital distractions dominate our workday, building a site blocker extension might be one of the most valuable projects you undertake this year. Whether you are a developer looking to sharpen your skills or someone who struggles with staying focused, creating a custom site blocker extension gives you complete control over your browsing habits. This comprehensive guide walks you through building a fully functional site blocker extension using Chrome's modern Manifest V3 architecture.

The demand for productivity tools that help people focus has never been higher. Studies consistently show that workplace distractions cost businesses billions of dollars annually in lost productivity. Social media, news sites, video platforms, and endless scrolling consume hours of our day. By learning how to build a site blocker extension, you not only gain valuable development skills but also create a tool that can genuinely improve your quality of life.

This tutorial assumes you have basic knowledge of HTML, CSS, and JavaScript. We will build everything from scratch using modern Chrome Extension APIs, following best practices for security, performance, and user experience. By the end of this guide, you will have a fully working extension that can block specific websites, implement focus modes, and help you maintain productivity throughout your day.

---

## Understanding the Problem Space {#understanding-problem}

Before we dive into code, let us take a moment to understand what makes an effective site blocker. The best site blocker extensions share several key characteristics that distinguish them from simple URL blockers.

### Why Generic Blockers Fall Short

Many site blockers fail because they are too rigid or too permissive. A good site blocker needs to handle multiple scenarios: blocking specific sites completely, allowing temporary access for emergencies, implementing scheduled blocking sessions, and providing clear feedback when a site is blocked. Users also need the ability to customize their block lists easily without diving into configuration files.

The most effective approach combines multiple blocking mechanisms. URL pattern matching catches direct navigation, content script injection handles sites that load dynamically, and the declarative net request API provides network-level blocking. Each layer adds robustness to your solution.

### The Psychology of Focus Mode

Implementing a true focus mode requires understanding why people get distracted in the first place. The key insight is that willpower is a finite resource. When you constantly resist the urge to check social media or news sites, you deplete your mental energy for actual work. A site blocker removes these decisions from your day entirely.

Effective focus mode implementations go beyond simple blocking. They provide positive reinforcement, clear session boundaries, and easy ways to track productivity over time. Consider adding features like focus session timers, daily statistics, and achievement tracking to help users stay motivated.

---

## Project Setup and Structure {#project-setup}

Let us start by setting up our project structure. Create a new folder for your extension and add the following files and directories.

### Directory Structure

Create a folder named `site-blocker-extension` and set up this structure inside:

```
site-blocker-extension/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/
│   └── background.js
├── content/
│   └── content.js
├── options/
│   ├── options.html
│   ├── options.css
│   └── options.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

This structure separates concerns cleanly: the popup handles quick interactions, the background service worker manages core logic and storage, content scripts handle page-level blocking, and the options page provides configuration.

### Manifest V3 Configuration

The manifest file defines your extension capabilities and permissions. Here is our complete manifest:

```json
{
  "manifest_version": 3,
  "name": "Focus Guard - Site Blocker",
  "version": "1.0.0",
  "description": "Block distracting sites and stay focused with customizable block lists and focus modes",
  "permissions": [
    "storage",
    "declarativeNetRequest",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"]
    }
  ],
  "options_page": "options/options.html"
}
```

Note the critical permissions we are using. The `storage` permission lets us save user preferences persistently. The `declarativeNetRequest` permission enables network-level blocking without requiring broad host permissions. The `tabs` permission allows us to check and manage open tabs when blocking occurs.

---

## Implementing the Background Service Worker {#background-worker}

The background service worker is the brain of your extension. It manages the block list, handles focus mode logic, and coordinates between different parts of your extension.

### Core Blocking Logic

Create `background/background.js` with the following implementation:

```javascript
// Default blocked sites
const DEFAULT_BLOCKED_SITES = [
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'reddit.com',
  'youtube.com',
  'tiktok.com',
  'netflix.com'
];

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Set up default configuration
  chrome.storage.sync.set({
    blockedSites: DEFAULT_BLOCKED_SITES,
    focusModeActive: false,
    focusDuration: 25, // minutes
    customMessages: {}
  });
  
  // Apply default blocking rules
  updateBlockingRules(DEFAULT_BLOCKED_SITES);
});

// Update blocking rules based on current block list
async function updateBlockingRules(blockedSites) {
  const rules = blockedSites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: {
      type: 'redirect',
      redirect: {
        extensionUrl: '/blocked.html'
      }
    },
    condition: {
      urlFilter: `*://*.${site}/*`,
      resourceTypes: ['main_frame']
    }
  }));

  // Clear existing rules and add new ones
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: blockedSites.map((_, i) => i + 1),
    addRules: rules
  });
}

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.blockedSites) {
    updateBlockingRules(changes.blockedSites.newValue);
  }
});

// Handle focus mode toggle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleFocusMode') {
    chrome.storage.sync.get(['focusModeActive', 'focusDuration'], (result) => {
      const newState = !result.focusModeActive;
      chrome.storage.sync.set({ focusModeActive: newState });
      
      if (newState) {
        // Start focus session
        setTimeout(() => {
          chrome.storage.sync.set({ focusModeActive: false });
        }, result.focusDuration * 60 * 1000);
      }
      
      sendResponse({ focusModeActive: newState });
    });
    return true;
  }
});
```

This implementation uses the declarativeNetRequest API, which is the modern, privacy-friendly way to block network requests in Manifest V3. Unlike the old webRequest API, declarativeNetRequest does not require broad permissions and works efficiently without inspecting every single network request.

The background worker handles focus mode toggling with automatic timeout. When a user activates focus mode, the extension automatically turns it off after the specified duration. This prevents users from accidentally leaving focus mode on indefinitely.

---

## Building the Popup Interface {#popup-interface}

The popup provides quick access to essential features without requiring users to open a separate options page.

### HTML Structure

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Focus Guard</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>Focus Guard</h1>
      <p class="subtitle">Stay focused, stay productive</p>
    </header>

    <section class="focus-section">
      <div class="focus-status" id="focusStatus">
        <span class="status-label">Focus Mode:</span>
        <span class="status-value" id="focusStatusText">Inactive</span>
      </div>
      <button class="focus-button" id="toggleFocus">
        Start Focus Session
      </button>
    </section>

    <section class="stats-section">
      <div class="stat-item">
        <span class="stat-value" id="sitesBlocked">0</span>
        <span class="stat-label">Sites Blocked</span>
      </div>
      <div class="stat-item">
        <span class="stat-value" id="focusTime">0h</span>
        <span class="stat-label">Focus Time</span>
      </div>
    </section>

    <section class="quick-actions">
      <button class="action-btn" id="openOptions">
        ⚙️ Settings
      </button>
    </section>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

### Styling the Popup

Create `popup/popup.css`:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 320px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.popup-container {
  padding: 20px;
}

.popup-header {
  text-align: center;
  margin-bottom: 20px;
}

.popup-header h1 {
  font-size: 24px;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 12px;
  opacity: 0.9;
}

.focus-section {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.focus-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
}

.status-value {
  font-weight: 600;
}

.status-value.active {
  color: #4ade80;
}

.focus-button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: white;
  color: #667eea;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.focus-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.focus-button.active {
  background: #4ade80;
  color: white;
}

.stats-section {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  flex: 1;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 10px;
  opacity: 0.8;
  text-transform: uppercase;
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  font-size: 13px;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}
```

### Popup JavaScript

Create `popup/popup.js`:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleFocus');
  const focusStatusText = document.getElementById('focusStatusText');
  const sitesBlockedEl = document.getElementById('sitesBlocked');
  const openOptionsBtn = document.getElementById('openOptions');

  // Load current state
  chrome.storage.sync.get(
    ['focusModeActive', 'blockedSites', 'focusTime'],
    (result) => {
      updateFocusUI(result.focusModeActive);
      sitesBlockedEl.textContent = result.blockedSites?.length || 0;
      
      // Format focus time
      const hours = Math.floor((result.focusTime || 0) / 60);
      document.getElementById('focusTime').textContent = 
        hours > 0 ? `${hours}h` : `${result.focusTime || 0}m`;
    }
  );

  // Toggle focus mode
  toggleButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'toggleFocus' }, (response) => {
      updateFocusUI(response.focusModeActive);
    });
  });

  // Open options page
  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  function updateFocusUI(isActive) {
    if (isActive) {
      toggleButton.textContent = 'End Focus Session';
      toggleButton.classList.add('active');
      focusStatusText.textContent = 'Active';
      focusStatusText.classList.add('active');
    } else {
      toggleButton.textContent = 'Start Focus Session';
      toggleButton.classList.remove('active');
      focusStatusText.textContent = 'Inactive';
      focusStatusText.classList.remove('active');
    }
  }
});
```

---

## Creating the Options Page {#options-page}

The options page gives users full control over their blocking preferences.

### Options HTML

Create `options/options.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Focus Guard - Settings</title>
  <link rel="stylesheet" href="options.css">
</head>
<body>
  <div class="options-container">
    <header>
      <h1>⚙️ Settings</h1>
    </header>

    <section class="settings-section">
      <h2>Blocked Sites</h2>
      <p class="section-description">
        Enter the domains you want to block, one per line
      </p>
      <textarea 
        id="blockedSitesInput" 
        placeholder="facebook.com&#10;twitter.com&#10;instagram.com"
        rows="10"
      ></textarea>
      <button id="saveBlockedSites" class="save-button">Save Blocked Sites</button>
      <p class="success-message" id="saveSuccess">Settings saved!</p>
    </section>

    <section class="settings-section">
      <h2>Focus Mode Settings</h2>
      
      <div class="setting-row">
        <label for="focusDuration">Focus Session Duration (minutes)</label>
        <input type="number" id="focusDuration" min="1" max="180" value="25">
      </div>

      <div class="setting-row">
        <label>
          <input type="checkbox" id="autoStartFocus">
          Auto-start focus mode on browser launch
        </label>
      </div>

      <button id="saveFocusSettings" class="save-button">Save Focus Settings</button>
    </section>

    <section class="settings-section">
      <h2>Custom Blocked Page</h2>
      <p class="section-description">
        Customize the message shown when a site is blocked
      </p>
      <textarea 
        id="customMessage" 
        placeholder="This site is blocked to help you focus!"
        rows="4"
      ></textarea>
      <button id="saveCustomMessage" class="save-button">Save Custom Message</button>
    </section>

    <section class="settings-section danger-zone">
      <h2>Reset</h2>
      <button id="resetAll" class="danger-button">Reset to Defaults</button>
    </section>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

### Options JavaScript

Create `options/options.js`:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const blockedSitesInput = document.getElementById('blockedSitesInput');
  const focusDurationInput = document.getElementById('focusDuration');
  const autoStartFocusInput = document.getElementById('autoStartFocus');
  const customMessageInput = document.getElementById('customMessage');

  // Load saved settings
  chrome.storage.sync.get(
    ['blockedSites', 'focusDuration', 'autoStartFocus', 'customMessage'],
    (result) => {
      if (result.blockedSites) {
        blockedSitesInput.value = result.blockedSites.join('\n');
      }
      if (result.focusDuration) {
        focusDurationInput.value = result.focusDuration;
      }
      if (result.autoStartFocus) {
        autoStartFocusInput.checked = result.autoStartFocus;
      }
      if (result.customMessage) {
        customMessageInput.value = result.customMessage;
      }
    }
  );

  // Save blocked sites
  document.getElementById('saveBlockedSites').addEventListener('click', () => {
    const sites = blockedSitesInput.value
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    chrome.storage.sync.set({ blockedSites: sites }, () => {
      showSuccess('saveSuccess');
    });
  });

  // Save focus settings
  document.getElementById('saveFocusSettings').addEventListener('click', () => {
    chrome.storage.sync.set({
      focusDuration: parseInt(focusDurationInput.value),
      autoStartFocus: autoStartFocusInput.checked
    }, () => {
      showSuccess('saveSuccess');
    });
  });

  // Save custom message
  document.getElementById('saveCustomMessage').addEventListener('click', () => {
    chrome.storage.sync.set({
      customMessage: customMessageInput.value
    }, () => {
      showSuccess('saveSuccess');
    });
  });

  // Reset to defaults
  document.getElementById('resetAll').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all settings?')) {
      const defaultSites = [
        'facebook.com',
        'twitter.com',
        'instagram.com',
        'reddit.com',
        'youtube.com',
        'tiktok.com',
        'netflix.com'
      ];

      chrome.storage.sync.set({
        blockedSites: defaultSites,
        focusDuration: 25,
        autoStartFocus: false,
        customMessage: 'This site is blocked to help you focus!'
      }, () => {
        blockedSitesInput.value = defaultSites.join('\n');
        focusDurationInput.value = 25;
        autoStartFocusInput.checked = false;
        customMessageInput.value = 'This site is blocked to help you focus!';
        showSuccess('saveSuccess');
      });
    }
  });

  function showSuccess(elementId) {
    const el = document.getElementById(elementId);
    el.style.display = 'block';
    setTimeout(() => {
      el.style.display = 'none';
    }, 2000);
  }
});
```

---

## Content Script for Enhanced Blocking {#content-script}

While the declarativeNetRequest API handles most blocking at the network level, adding a content script provides an additional layer of protection and allows for custom blocked page experiences.

Create `content/content.js`:

```javascript
// Check if current site is blocked
chrome.storage.sync.get(['blockedSites', 'focusModeActive', 'customMessage'], 
  (result) => {
    const currentHostname = window.location.hostname.replace('www.', '');
    const isBlocked = result.blockedSites.some(site => 
      currentHostname.includes(site.replace('www.', ''))
    );

    // Only apply enhanced blocking when focus mode is active
    if (isBlocked && result.focusModeActive) {
      // Replace page content with block message
      document.body.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          text-align: center;
          padding: 20px;
        ">
          <h1 style="font-size: 48px; margin-bottom: 16px;">🛡️</h1>
          <h2 style="font-size: 32px; margin-bottom: 16px;">Site Blocked</h2>
          <p style="font-size: 18px; max-width: 400px; line-height: 1.6;">
            ${result.customMessage || 'This site is blocked to help you focus!'}
          </p>
          <p style="margin-top: 24px; opacity: 0.8;">
            Focus mode is active. Stay strong! 💪
          </p>
        </div>
      `;
      
      // Remove all scripts to prevent further execution
      document.querySelectorAll('script').forEach(s => s.remove());
    }
  }
);
```

This content script provides a polished fallback when focus mode is active. It completely replaces the page content with a motivating message, ensuring users cannot interact with blocked sites during focus sessions.

---

## Adding Basic Icons {#icons}

For a production extension, you would create proper icon files. For now, you can use placeholder icons or generate simple ones using online tools. The icons directory should contain three sizes: 16x16, 48x48, and 128x128 pixels.

---

## Testing Your Extension {#testing}

Now that we have built all the components, let us test the extension in Chrome.

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked" and select your extension folder
4. The extension icon should appear in your toolbar

### Verifying Functionality

Test these scenarios:

1. Click the extension icon to see the popup
2. Try starting a focus session
3. Try visiting one of the blocked sites while focus mode is active
4. Open the options page and modify the blocked sites list
5. Verify that changes to the block list take effect immediately

---

## Advanced Features to Consider {#advanced-features}

This basic implementation provides a solid foundation, but there are many ways to enhance it.

### Pomodoro Timer Integration

Consider adding a built-in Pomodoro timer that automatically starts focus sessions. The classic Pomodoro technique uses 25-minute work sessions followed by 5-minute breaks, which aligns perfectly with focus mode.

### Statistics and Analytics

Track user productivity over time. Store data about how many times focus mode was activated, average session length, and which sites were most frequently blocked. Display this information in the popup or a dedicated statistics page.

### Password Protection

Add an optional password requirement to disable focus mode or modify settings. This prevents users from giving in to temptations too easily.

### Cloud Sync

Implement Chrome Storage sync to share settings across devices. This requires minimal additional code since Chrome provides built-in sync capabilities.

### Whitelist for Exceptions

Allow users to create a whitelist of sites that should never be blocked, even during focus mode. This is important for sites needed for work.

---

## Publishing to the Chrome Web Store {#publishing}

Once you have tested your extension thoroughly, you can publish it to reach millions of users.

### Preparing for Publication

Before publishing, ensure you have created proper icons (at least 128x128 pixels), written a compelling description, and tested the extension extensively. Create a compressed zip file of your extension folder.

### Developer Dashboard

Sign up for a developer account at the Chrome Web Store developer dashboard. There is a one-time registration fee. Upload your zip file, fill in the store listing details, and submit for review. Google typically reviews extensions within a few days.

---

## Conclusion {#conclusion}

You have now built a complete, functional site blocker extension using Chrome's modern Manifest V3 architecture. This extension demonstrates core concepts that apply to almost any Chrome extension project: popup interfaces, background service workers, content scripts, persistent storage, and the declarativeNetRequest API.

The skills you have learned here transfer directly to other extension projects. You can adapt the blocking mechanisms to create URL shorteners, advertisement blockers, productivity enhancers, or any number of other useful tools.

Building a site blocker is also an exercise in self-improvement. By creating a tool that helps you focus, you are investing in your own productivity and mental well-being. The best extensions solve problems their creators personally experience, and this project is no exception.

Remember to continue iterating on your extension based on user feedback. Add features that address real pain points, polish the user interface, and always prioritize user privacy. With dedication and continuous improvement, your site blocker could become an essential tool for thousands of productivity-focused users.

Start small, test frequently, and keep building. The Chrome extension ecosystem offers incredible opportunities for developers who want to create tools that make a real difference in people's lives.
