---
layout: post
title: "Build a Chrome Extension with React in 2025: Step-by-Step Guide"
description: "Learn how to build a Chrome extension with React in 2025. Complete tutorial covering project setup, components, state management, Chrome APIs, and deployment."
date: 2025-02-19
categories: [Chrome Extensions, Frameworks]
tags: [react, chrome-extension, tutorial]
author: theluckystrike
---

# Build a Chrome Extension with React in 2025: Step-by-Step Guide

Building Chrome extensions has evolved significantly over the years, and 2025 marks an exciting time to combine the power of React with Chrome's extension platform. Whether you're a seasoned React developer looking to expand into browser extensions or someone starting fresh, this comprehensive guide will walk you through creating a production-ready Chrome extension using React from scratch.

Chrome extensions have become essential tools for millions of users worldwide, and the demand for well-designed, performant extensions continues to grow. React's component-based architecture makes it an ideal choice for building extension UIs that are maintainable, scalable, and visually appealing. In this guide, we'll explore everything you need to know to build a Chrome extension with React in 2025.

---

## Prerequisites and Environment Setup

Before diving into the implementation, let's ensure you have the necessary tools installed on your development machine. You'll need Node.js (version 18 or higher), npm or yarn package manager, and a modern code editor like Visual Studio Code. Chrome browser itself will be essential for testing your extension during development.

First, verify your Node.js installation by running `node --version` in your terminal. If you don't have Node.js installed, download it from the official website or use a version manager like nvm for better control over your Node environment. Having a proper development environment sets the foundation for a smooth building experience.

You'll also want to install the Chrome Web Store developer dashboard extension or have access to the Chrome Developer Dashboard. This will be crucial when it's time to publish your extension. Additionally, familiarize yourself with Chrome's developer tools, particularly the Extensions management page (chrome://extensions), where you'll load your unpacked extension for testing.

---

## Project Initialization and Structure

Creating a React-based Chrome extension requires careful project setup. While you could manually configure webpack or Vite, using a dedicated scaffolding tool designed for Chrome extensions will save you significant time and potential headaches. The recommended approach in 2025 is to use WXT or create-react-app with modifications, but we'll focus on a clean Vite-based setup for maximum control and modern best practices.

Initialize your project by creating a new directory and setting up the basic structure:

```bash
mkdir react-chrome-extension && cd react-chrome-extension
npm init -y
```

Now install the necessary dependencies for React development and building:

```bash
npm install react react-dom
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom
```

Create a proper project structure that separates your React app from Chrome extension configuration. The structure should include directories for your source code, public assets, and extension-specific files. This organization becomes crucial as your extension grows in complexity.

Your directory structure might look like this:

```
src/
  popup/          # Popup window components
  options/        # Options page components
  content/        # Content script components
  background/     # Service worker code
  shared/         # Shared utilities and types
public/
  manifest.json   # Chrome extension manifest
  icons/          # Extension icons
```

---

## Understanding Chrome Extension Manifest V3

The manifest.json file serves as the backbone of your Chrome extension, defining permissions, entry points, and capabilities. In 2025, Manifest V3 is mandatory for all new extensions, bringing important changes around service workers, declarative rules, and host permissions. Understanding these differences is crucial for building modern extensions.

Create your manifest.json with the essential configuration:

```json
{
  "manifest_version": 3,
  "name": "Your Extension Name",
  "version": "1.0.0",
  "description": "A powerful Chrome extension built with React",
  "permissions": [
    "storage",
    "tabs",
    "activeTab"
  ],
  "action": {
    "default_popup": "index.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

Pay special attention to the permissions you request. Chrome has become stricter about permissions, and requesting unnecessary permissions can lead to review rejections or deter users from installing your extension. Always follow the principle of least privilege, requesting only what your extension absolutely needs to function.

---

## Configuring Vite for Chrome Extension Development

Vite provides an excellent development experience for building React applications, and with proper configuration, it can generate Chrome extension-compatible output. The key is to configure Vite to output your build files in the correct location and format for Chrome to recognize.

Create a vite.config.js file tailored for Chrome extension development:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html')
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
```

This configuration ensures that your React app builds into the dist directory, which Chrome can load as an unpacked extension. The multiple entry points allow you to have separate HTML pages for your popup and options page, each with its own React root.

---

## Building the Popup Component

The popup is what users see when they click your extension icon in the Chrome toolbar. This should be a focused, lightweight React component that provides quick access to your extension's main features. In 2025, keeping your popup lightweight is more important than ever due to Chrome's resource constraints.

Create your main Popup component with React:

```jsx
import React, { useState, useEffect } from 'react';
import './Popup.css';

function Popup() {
  const [settings, setSettings] = useState({
    enabled: true,
    theme: 'light'
  });
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    // Load settings from Chrome storage
    chrome.storage.sync.get(['settings'], (result) => {
      if (result.settings) {
        setSettings(result.settings);
      }
      setStatus('ready');
    });
  }, []);

  const handleToggle = () => {
    const newSettings = { ...settings, enabled: !settings.enabled };
    setSettings(newSettings);
    chrome.storage.sync.set({ settings: newSettings });
  };

  if (status === 'loading') {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className={`popup-container ${settings.theme}`}>
      <header className="popup-header">
        <h1>My Extension</h1>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={handleToggle}
          />
          <span className="slider"></span>
        </label>
      </header>
      
      <main className="popup-content">
        <div className="feature-card">
          <h3>Feature One</h3>
          <p>Description of what this feature does</p>
        </div>
        <div className="feature-card">
          <h3>Feature Two</h3>
          <p>Another amazing feature</p>
        </div>
      </main>
      
      <footer className="popup-footer">
        <button onClick={() => chrome.runtime.openOptionsPage()}>
          Open Settings
        </button>
      </footer>
    </div>
  );
}

export default Popup;
```

This component demonstrates several key patterns: loading settings from Chrome's storage API, handling user interactions, and maintaining proper React state management. The component is styled to be responsive and visually appealing, which is crucial for user retention.

---

## Implementing Content Scripts with React

Content scripts run in the context of web pages and allow your extension to interact with page content. While you can use React for content script UIs, there are important considerations around performance and page isolation. In 2025, the recommended approach is to inject a shadow DOM root for your React components to avoid CSS conflicts with the host page.

Create a content script that injects a React component:

```javascript
// content.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import ContentWidget from './ContentWidget';

function injectReactWidget() {
  // Check if already injected
  if (document.getElementById('my-extension-root')) {
    return;
  }

  // Create container with shadow DOM for isolation
  const container = document.createElement('div');
  container.id = 'my-extension-root';
  
  const shadowRoot = container.attachShadow({ mode: 'open' });
  const reactRoot = document.createElement('div');
  shadowRoot.appendChild(reactRoot);
  
  document.body.appendChild(container);
  
  // Mount React app
  const root = createRoot(reactRoot);
  root.render(<ContentWidget />);
}

// Inject when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectReactWidget);
} else {
  injectReactWidget();
}
```

The shadow DOM approach prevents the page's CSS from affecting your React components and vice versa, which is essential for maintaining consistent styling across different websites.

---

## State Management and Chrome Storage

Managing state in a Chrome extension differs from regular web applications due to the extension's architecture. Your extension has multiple contexts—the popup, background service worker, content scripts, and options page—that may need to share data. Chrome's storage API provides synchronization across these contexts.

For React applications, you can create a custom hook to manage Chrome storage:

```javascript
// hooks/useChromeStorage.js
import { useState, useEffect, useCallback } from 'react';

export function useChromeStorage(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    chrome.storage.sync.get([key], (result) => {
      setValue(result[key] ?? defaultValue);
      setIsLoading(false);
    });
  }, [key, defaultValue]);

  const updateValue = useCallback((newValue) => {
    const valueToStore = typeof newValue === 'function' 
      ? newValue(value) 
      : newValue;
    
    setValue(valueToStore);
    chrome.storage.sync.set({ [key]: valueToStore });
  }, [key, value]);

  return [value, updateValue, isLoading];
}
```

This hook provides a clean interface for React components to interact with Chrome storage, handling loading states and update logic automatically. For more complex state management needs, consider using Zustand or Jotai, which work well in the extension context.

---

## Background Service Worker Implementation

The background service worker in Manifest V3 handles events and tasks that don't require a UI. This includes alarms, browser actions, message passing, and more. Since service workers can be terminated by Chrome when inactive, your code must be stateless and handle reinitialization gracefully.

Here's a basic service worker setup:

```javascript
// background.js
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  // Initialize default settings
  chrome.storage.sync.set({
    settings: {
      enabled: true,
      notifications: true
    }
  });
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    // Fetch and return data
    chrome.storage.sync.get(['settings'], (result) => {
      sendResponse({ data: result.settings });
    });
    return true; // Keep channel open for async response
  }
});

// Schedule periodic tasks
chrome.alarms.create('periodicTask', {
  periodInMinutes: 15
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicTask') {
    // Perform periodic task
    console.log('Periodic task executed');
  }
});
```

Remember that service workers have a 30-second execution timeout, so any long-running operations should be broken into smaller chunks or handled differently.

---

## Loading and Testing Your Extension

With your React code and extension configuration complete, it's time to build and test. Run your Vite build command to generate the production files:

```bash
npm run build
```

This creates the dist directory with your compiled extension files. Now, open Chrome and navigate to chrome://extensions/. Enable Developer mode using the toggle in the top right corner. Click "Load unpacked" and select your dist directory.

Your extension should now appear in the extensions list. Test the popup by clicking the extension icon in your toolbar. Check the background service worker for any errors in the service worker console. Use Chrome's developer tools to inspect and debug your extension just like a regular web page.

For development, consider using a hot-reloading setup to speed up iteration. Tools like chrome-extension-hot-reload or custom Vite plugins can automatically reload your extension when files change, significantly improving development velocity.

---

## Best Practices for Production

When preparing your extension for production deployment, several best practices ensure reliability and user satisfaction. First, implement proper error handling throughout your extension—uncaught errors in the popup or service worker can cause unexpected behavior and poor reviews.

Performance optimization is crucial for extensions. Lazy-load components where possible, minimize the use of content scripts, and avoid expensive operations in the background service worker. Users notice when an extension slows down their browser, and performance issues lead to uninstalls.

Security should be at the forefront of your development. Validate all data received from content scripts, avoid using eval() or similar dynamic code execution, and follow Chrome's security best practices. If your extension handles sensitive data, ensure proper encryption and storage practices.

Finally, thoroughly test your extension across different scenarios: fresh installation, update from a previous version, different Chrome settings, and various websites for content script compatibility. Consider implementing analytics to understand how users interact with your extension and identify areas for improvement.

---

## Publishing to the Chrome Web Store

Once your extension is thoroughly tested and ready, it's time to publish to the Chrome Web Store. Prepare your store listing with compelling descriptions, screenshots, and a clear icon. The review process typically takes a few days, though complex extensions may take longer.

Ensure your store listing follows Google's guidelines to avoid rejection. Pay attention to the permission justification—Chrome now requires developers to explain why each permission is necessary. A clear, honest explanation improves your chances of approval.

After publication, monitor user feedback and reviews. Respond professionally to negative reviews, fix reported issues promptly, and continue improving your extension based on user feedback. Successful extensions in 2025 are those that evolve with their users' needs.

---

## Conclusion

Building a Chrome extension with React in 2025 combines the best of modern web development with the unique capabilities of the Chrome extension platform. Through this guide, you've learned how to set up a proper development environment, structure your project, implement key extension components, and prepare for production deployment.

The React ecosystem provides excellent tools for creating polished, maintainable extension UIs. By following the patterns and best practices outlined here, you're well-equipped to build extensions that users love. Remember to stay updated with Chrome's evolving APIs and guidelines, as the platform continues to improve.

Now it's your turn to build something amazing. Start with a simple idea, iterate quickly, and don't be afraid to experiment. The Chrome Web Store is waiting for your innovative extension.
