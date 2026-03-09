---
layout: post
title: "Chrome Extension Hello World"
description: "Build your first Chrome extension from scratch with this beginner hello world tutorial. Learn manifest.json basics, create a popup, and test your extension in Chrome with step-by-step guidance."
date: 2025-06-01
categories: [tutorial]
tags: [beginner, hello-world, manifest-v3]
---

Building your first Chrome extension is easier than you think. In this comprehensive guide, we'll walk through creating a basic extension from scratch, understanding each component, and getting it running in your browser. By the end of this tutorial, you'll have a fully functional Chrome extension that you can customize and expand.

## Prerequisites

Before we begin, make sure you have Google Chrome installed and a basic text editor like VS Code. No prior extension development experience is required - this guide is designed for complete beginners. We'll start from absolute zero and build up your understanding of how Chrome extensions work.

### What You'll Need

- Google Chrome browser (any recent version)
- A code editor (VS Code is recommended, but Notepad will work in a pinch)
- Basic familiarity with HTML, CSS, and JavaScript
- About 15-20 minutes of your time

## Creating Your Project Structure

Every Chrome extension needs a specific file structure. Create a new folder on your computer - let's call it "my-first-extension" - and add the following files:

1. **manifest.json** - The configuration file that tells Chrome about your extension
2. **popup.html** - The interface users see when clicking your extension icon
3. **popup.js** - JavaScript for handling user interactions
4. **popup.css** - Styling for your popup interface
5. **icon.png** - A 128x128 pixel icon for your extension

### Setting Up Your Development Environment

Create a dedicated folder for your extension projects. Within that folder, create another folder called "my-first-extension". This keeps your work organized and makes it easier to manage multiple extension projects.

## Understanding the Manifest File

The manifest.json is the heart of your extension. It tells Chrome everything it needs to know about your extension, including its name, version, permissions, and what files to load. Here's the minimum required structure:

```json
{
  "manifest_version": 3,
  "name": "My First Extension",
  "version": "1.0",
  "description": "A simple Chrome extension tutorial",
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  }
}
```

The manifest_version: 3 refers to Manifest V3, the latest version of Chrome's extension platform. This version includes improved security features and more efficient background processing. All new extensions should use Manifest V3.

### Understanding Manifest Fields

Let's break down each field in the manifest:

- **manifest_version**: Must be 3 for new extensions (Manifest V3)
- **name**: Display name shown in Chrome (max 45 characters)
- **version**: Your extension version (follows semver: major.minor.patch)
- **description**: Brief description (max 132 characters)
- **action**: Defines the popup that appears when users click your icon

## Creating Your First Popup

Let's create a simple popup that displays a greeting. This is the interface users will see when they click your extension icon in the toolbar:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Welcome to my first Chrome extension.</p>
  <button id="clickMe">Click Me</button>
  <script src="popup.js"></script>
</body>
</html>
```

### Adding Basic Styling

Create a popup.css file to make your extension look professional:

```css
body {
  width: 300px;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

h1 {
  color: #4285f4;
  font-size: 24px;
}

button {
  background-color: #4285f4;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

button:hover {
  background-color: #3367d6;
}
```

## Adding Interactivity

Create a popup.js file to handle button clicks and add dynamic behavior:

```javascript
document.getElementById('clickMe').addEventListener('click', () => {
  alert('You clicked the button!');
});
```

### Expanding Functionality

Let's make our extension more useful by adding tab information:

```javascript
document.getElementById('clickMe').addEventListener('click', async () => {
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Display information about the current page
  alert(`You're on: ${tab.title}\nURL: ${tab.url}`);
});
```

## Loading Your Extension

To test your extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right
3. Click "Load unpacked" and select your extension folder
4. Your extension icon should appear in the Chrome toolbar
5. Click the icon to see your popup in action!

### Troubleshooting Common Issues

**Popup not showing?** Make sure your manifest.json correctly references the popup file and that the file exists in the correct location. Check the console for errors.

**Changes not appearing?** Click the reload button on your extension in chrome://extensions/ to apply changes. Chrome doesn't automatically reload extension files.

**Console errors?** Right-click your popup and select "Inspect" to open developer tools and debug any issues. This is the same DevTools you use for regular web pages.

### Understanding the Extension Lifecycle

When you load an extension in developer mode, Chrome monitors your files. Any changes you make to your HTML, CSS, or JavaScript files are reflected immediately when you reload the extension. To reload, simply click the refresh icon on your extension card in chrome://extensions/.

The extension lifecycle includes:
- **Loading**: Chrome reads your manifest and registers your files
- **Activation**: Your popup is ready to display when clicked
- **Execution**: Your JavaScript runs when users interact with the popup
- **Deactivation**: Closing the popup terminates JavaScript execution

## What's Next?

Congratulations! You've built your first Chrome extension. From here, you can explore:

- **Content scripts** - Modify web pages automatically
- **Background scripts** - Handle events even when the popup is closed
- **Chrome APIs** - Access browser features like tabs, bookmarks, and more
- **Storage API** - Persist user preferences

### Your Second Extension

Try modifying your extension to:
1. Change the button to save the current page URL
2. Display a list of saved URLs
3. Add a button to clear all saved URLs

This exercise introduces you to the Chrome Storage API and data persistence.

### Learning Resources

To continue your extension development journey:
- Read the official Chrome Extension documentation
- Explore the Chrome Extension samples on GitHub
- Join extension developer communities
- Experiment with different Chrome APIs

### Deploying Your Extension

Once you've tested your extension thoroughly, you can publish it to the Chrome Web Store. This requires creating a developer account, preparing promotional assets, and undergoing review. The process ensures quality and security for Chrome users.

Publishing steps include:
1. Create a developer account ($5 one-time fee)
2. Prepare screenshots and a store listing
3. Upload your extension package
4. Submit for review (typically 1-3 days)
5. Publish once approved

This simple foundation opens the door to powerful browser customization. The Chrome extension ecosystem offers endless possibilities for enhancing productivity, automating tasks, and creating unique browsing experiences.
