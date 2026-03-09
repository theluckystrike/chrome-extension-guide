---
layout: post
title: "Build a Speed Dial Chrome Extension: Quick Access to Your Favorite Sites"
description: "Learn how to build a speed dial Chrome extension for quick access to favorite sites. Complete guide covering Manifest V3, new tab override, local storage, and publishing."
date: 2025-04-21
categories: [Chrome Extensions, Tutorials]
tags: [speed-dial, new-tab, chrome-extension]
keywords: "chrome extension speed dial, speed dial new tab chrome, build speed dial extension, quick access chrome extension, favorite sites new tab"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/04/21/build-speed-dial-chrome-extension/"
---

# Build a Speed Dial Chrome Extension: Quick Access to Your Favorite Sites

Speed dial extensions are among the most popular and useful Chrome extensions available. They replace the default new tab page with a visually appealing grid of your favorite websites, allowing you to access frequently visited sites with a single click. In this comprehensive guide, we will walk you through the complete process of building your own speed dial Chrome extension from scratch.

Whether you want to create a personal productivity tool or publish an extension to the Chrome Web Store, this tutorial will give you all the knowledge and code you need to build a fully functional speed dial extension using modern Chrome extension development practices with Manifest V3.

---

## Why Build a Speed Dial Extension? {#why-build-speed-dial}

Speed dial extensions serve a fundamental purpose: they save time. Instead of typing URLs or searching through bookmarks, users can simply click a tile to visit their favorite websites. The concept originated with Opera browser's speed dial feature and has since become a staple of modern browser customization.

Building a speed dial extension is an excellent project for several reasons. First, it teaches you core Chrome extension concepts including new tab overrides, the chrome.storage API, and background service workers. Second, speed dial extensions have practical real-world utility, making them satisfying to build and use. Third, the basic concept can be extended with advanced features like sync across devices, custom backgrounds, drag-and-drop reordering, and even productivity analytics.

The Chrome Web Store has numerous speed dial extensions with millions of combined users, proving there is demand for well-designed implementations. By building your own, you gain complete control over the design and features while learning valuable extension development skills.

---

## Project Overview and Features {#project-overview}

Before writing any code, let us define what our speed dial extension will do. Our basic implementation will include the following features:

A visual grid of speed dial tiles that displays website favicons and titles. Each tile should be clickable and navigate to the corresponding URL. Users can add new sites by clicking an "add" button and entering a URL. The extension will automatically fetch the site title and favicon. Users can edit or remove existing speed dial entries. Settings will allow customization of the grid layout and background. The extension will persist data using chrome.storage.local API.

This feature set provides a solid foundation that you can later extend with additional capabilities like drag-and-drop reordering, multiple speed dial pages, custom backgrounds, and cloud sync.

---

## Setting Up the Project Structure {#project-structure}

Every Chrome extension needs a well-organized project structure. Create a new folder for your project and set up the following files:

The directory structure will include manifest.json as the configuration file, popup.html for any popup UI, popup.js for popup logic, newtab.html as the new tab page, newtab.js for new tab logic, newtab.css for styling, and icons folder for extension icons.

Let us start by creating the manifest.json file, which is the heart of every Chrome extension.

---

## Creating the Manifest File {#manifest-file}

The manifest.json file tells Chrome about your extension's capabilities and permissions. For our speed dial extension, we need to declare the new tab override and storage permissions.

```json
{
  "manifest_version": 3,
  "name": "Quick Access Speed Dial",
  "version": "1.0.0",
  "description": "Speed dial extension for quick access to your favorite websites",
  "permissions": [
    "storage"
  ],
  "chrome_url_overrides": {
    "newtab": "newtab.html"
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

This manifest file specifies several important things. The "chrome_url_overrides" key tells Chrome to use our newtab.html instead of the default new tab page. The "storage" permission allows us to save the user's speed dial entries persistently. The "action" key enables a popup that users can click to manage their speed dial.

---

## Building the New Tab Page {#new-tab-page}

The new tab page is the main interface of our speed dial extension. It displays the grid of speed dial tiles and handles user interactions.

Create newtab.html with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quick Access Speed Dial</title>
  <link rel="stylesheet" href="newtab.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Quick Access</h1>
      <div class="search-bar">
        <input type="text" id="search-input" placeholder="Search or enter URL...">
      </div>
    </header>
    
    <main>
      <div id="speed-dial-grid" class="speed-dial-grid">
        <!-- Speed dial tiles will be inserted here -->
      </div>
      
      <button id="add-site-btn" class="add-site-btn">
        <span class="plus-icon">+</span>
        <span>Add Site</span>
      </button>
    </main>
  </div>
  
  <!-- Modal for adding/editing sites -->
  <div id="modal" class="modal">
    <div class="modal-content">
      <h2 id="modal-title">Add New Site</h2>
      <form id="site-form">
        <div class="form-group">
          <label for="site-url">URL</label>
          <input type="url" id="site-url" placeholder="https://example.com" required>
        </div>
        <div class="form-group">
          <label for="site-title">Title</label>
          <input type="text" id="site-title" placeholder="Site Title" required>
        </div>
        <div class="form-actions">
          <button type="button" id="cancel-btn" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
  
  <script src="newtab.js"></script>
</body>
</html>
```

This HTML structure provides a clean interface with a header containing a search bar, a main grid area for speed dial tiles, and a modal dialog for adding or editing sites.

---

## Styling the Speed Dial Extension {#styling}

Create newtab.css to style your extension. The design should be visually appealing while remaining functional and fast.

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;
  color: #fff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

header {
  text-align: center;
  margin-bottom: 40px;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  font-weight: 600;
}

.search-bar input {
  width: 100%;
  max-width: 500px;
  padding: 15px 20px;
  border: none;
  border-radius: 30px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  outline: none;
  transition: background 0.3s ease;
}

.search-bar input:focus {
  background: rgba(255, 255, 255, 0.15);
}

.search-bar input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.speed-dial-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.speed-dial-tile {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
  position: relative;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.speed-dial-tile:hover {
  transform: translateY(-5px);
  background: rgba(255, 255, 255, 0.15);
}

.tile-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  margin-bottom: 12px;
  object-fit: cover;
  background: #fff;
}

.tile-title {
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}

.tile-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: none;
}

.speed-dial-tile:hover .tile-actions {
  display: flex;
}

.tile-btn {
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 4px;
  font-size: 12px;
}

.add-site-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  max-width: 200px;
  margin: 0 auto;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.add-site-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
}

.plus-icon {
  font-size: 24px;
  font-weight: 300;
}

/* Modal Styles */
.modal {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  align-items: center;
  justify-content: center;
}

.modal.active {
  display: flex;
}

.modal-content {
  background: #1a1a2e;
  padding: 30px;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
}

.modal-content h2 {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 16px;
}

.form-group input:focus {
  outline: none;
  border-color: #4a90e2;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: background 0.2s;
}

.btn-primary {
  background: #4a90e2;
  color: #fff;
}

.btn-primary:hover {
  background: #357abd;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

This CSS provides a modern dark theme with gradient backgrounds, smooth hover animations, and a clean modal for adding sites. The grid layout automatically adjusts based on the screen size.

---

## Implementing the JavaScript Logic {#javascript-logic}

Now create newtab.js to handle all the functionality:

```javascript
// Default speed dial sites
const DEFAULT_SITES = [
  { url: 'https://www.google.com', title: 'Google' },
  { url: 'https://www.youtube.com', title: 'YouTube' },
  { url: 'https://www.github.com', title: 'GitHub' },
  { url: 'https://www.reddit.com', title: 'Reddit' },
  { url: 'https://www.twitter.com', title: 'Twitter' },
  { url: 'https://www.linkedin.com', title: 'LinkedIn' },
  { url: 'https://www.gmail.com', title: 'Gmail' },
  { url: 'https://stackoverflow.com', title: 'Stack Overflow' }
];

// Initialize the extension
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadSites();
  setupEventListeners();
}

// Load sites from storage or use defaults
async function loadSites() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['speedDialSites'], (result) => {
      const sites = result.speedDialSites || DEFAULT_SITES;
      renderSites(sites);
      resolve();
    });
  });
}

// Render speed dial tiles
function renderSites(sites) {
  const grid = document.getElementById('speed-dial-grid');
  grid.innerHTML = '';
  
  sites.forEach((site, index) => {
    const tile = createTileElement(site, index);
    grid.appendChild(tile);
  });
}

// Create a single tile element
function createTileElement(site, index) {
  const tile = document.createElement('div');
  tile.className = 'speed-dial-tile';
  tile.dataset.index = index;
  
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=64`;
  
  tile.innerHTML = `
    <img src="${faviconUrl}" alt="${site.title}" class="tile-icon" 
         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'">
    <span class="tile-title">${site.title}</span>
    <div class="tile-actions">
      <button class="tile-btn edit-btn" data-index="${index}">✎</button>
      <button class="tile-btn delete-btn" data-index="${index}">✕</button>
    </div>
  `;
  
  tile.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tile-btn')) {
      window.location.href = site.url;
    }
  });
  
  return tile;
}

// Setup event listeners
function setupEventListeners() {
  // Add site button
  document.getElementById('add-site-btn').addEventListener('click', () => openModal());
  
  // Modal buttons
  document.getElementById('cancel-btn').addEventListener('click', closeModal);
  document.getElementById('site-form').addEventListener('submit', handleFormSubmit);
  
  // Delegated events for edit/delete buttons
  document.getElementById('speed-dial-grid').addEventListener('click', handleTileAction);
  
  // Close modal on outside click
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeModal();
    }
  });
}

// Handle tile edit/delete actions
function handleTileAction(e) {
  const editBtn = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');
  
  if (editBtn) {
    const index = parseInt(editBtn.dataset.index);
    editSite(index);
  } else if (deleteBtn) {
    const index = parseInt(deleteBtn.dataset.index);
    deleteSite(index);
  }
}

// Open modal for adding/editing
function openModal(site = null, index = null) {
  const modal = document.getElementById('modal');
  const title = document.getElementById('modal-title');
  const urlInput = document.getElementById('site-url');
  const titleInput = document.getElementById('site-title');
  
  if (site) {
    title.textContent = 'Edit Site';
    urlInput.value = site.url;
    titleInput.value = site.title;
    modal.dataset.editIndex = index;
  } else {
    title.textContent = 'Add New Site';
    urlInput.value = '';
    titleInput.value = '';
    delete modal.dataset.editIndex;
  }
  
  modal.classList.add('active');
  urlInput.focus();
}

// Close modal
function closeModal() {
  document.getElementById('modal').classList.remove('active');
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const urlInput = document.getElementById('site-url');
  const titleInput = document.getElementById('site-title');
  const modal = document.getElementById('modal');
  
  const newSite = {
    url: urlInput.value,
    title: titleInput.value
  };
  
  chrome.storage.local.get(['speedDialSites'], (result) => {
    const sites = result.speedDialSites || DEFAULT_SITES;
    const editIndex = modal.dataset.editIndex;
    
    if (editIndex !== undefined) {
      sites[editIndex] = newSite;
    } else {
      sites.push(newSite);
    }
    
    chrome.storage.local.set({ speedDialSites: sites }, () => {
      renderSites(sites);
      closeModal();
    });
  });
}

// Edit a site
function editSite(index) {
  chrome.storage.local.get(['speedDialSites'], (result) => {
    const sites = result.speedDialSites || DEFAULT_SITES;
    openModal(sites[index], index);
  });
}

// Delete a site
function deleteSite(index) {
  chrome.storage.local.get(['speedDialSites'], (result) => {
    const sites = result.speedDialSites || DEFAULT_SITES;
    sites.splice(index, 1);
    
    chrome.storage.local.set({ speedDialSites: sites }, () => {
      renderSites(sites);
    });
  });
}

// Search functionality
document.getElementById('search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value.trim();
    if (query) {
      // Check if it's a URL
      if (query.includes('.') && !query.includes(' ')) {
        window.location.href = query.startsWith('http') ? query : `https://${query}`;
      } else {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
    }
  }
});
```

This JavaScript implementation handles loading sites from storage, rendering the grid, adding/editing/deleting sites, and search functionality. It uses the chrome.storage API for persistent data storage.

---

## Creating the Popup Interface {#popup-interface}

While the new tab page is the main interface, adding a popup provides quick access from anywhere in the browser. Create popup.html:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quick Access</title>
  <style>
    body {
      width: 300px;
      padding: 15px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #1a1a2e;
      color: #fff;
    }
    h2 {
      font-size: 18px;
      margin-bottom: 15px;
    }
    .site-list {
      max-height: 300px;
      overflow-y: auto;
    }
    .site-item {
      display: flex;
      align-items: center;
      padding: 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .site-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .site-item img {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      margin-right: 10px;
    }
    .site-item span {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .add-btn {
      width: 100%;
      padding: 12px;
      background: #4a90e2;
      border: none;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      margin-top: 10px;
    }
    .add-btn:hover {
      background: #357abd;
    }
  </style>
</head>
<body>
  <h2>Quick Access</h2>
  <div id="site-list" class="site-list"></div>
  <button id="add-btn" class="add-btn">Add New Site</button>
  <script src="popup.js"></script>
</body>
</html>
```

And popup.js:

```javascript
document.addEventListener('DOMContentLoaded', loadPopupSites);

function loadPopupSites() {
  chrome.storage.local.get(['speedDialSites'], (result) => {
    const sites = result.speedDialSites || [];
    const list = document.getElementById('site-list');
    
    sites.forEach(site => {
      const item = document.createElement('div');
      item.className = 'site-item';
      
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=32`;
      
      item.innerHTML = `
        <img src="${faviconUrl}" alt="">
        <span>${site.title}</span>
      `;
      
      item.addEventListener('click', () => {
        window.location.href = site.url;
      });
      
      list.appendChild(item);
    });
  });
}

document.getElementById('add-btn').addEventListener('click', () => {
  chrome.action.openPopup();
  // Could navigate to new tab or open a management page
});
```

---

## Testing Your Extension {#testing}

Now that you have created all the necessary files, it is time to test your extension in Chrome.

Open Chrome and navigate to chrome://extensions/. Enable "Developer mode" using the toggle in the top right corner. Click "Load unpacked" and select your extension folder. Chrome will load your extension and you can test it by opening a new tab.

You should see your speed dial interface with the default sites. Try clicking a tile to navigate to a website. Click "Add Site" to add new entries. Test the edit and delete functionality. Open the extension popup to verify it works correctly.

If you encounter any issues, check the extension console for errors. You can access console logs by going to chrome://extensions/ and clicking the "service worker" or "background page" link for your extension.

---

## Publishing to the Chrome Web Store {#publishing}

Once you have thoroughly tested your extension and are satisfied with its functionality, you can publish it to the Chrome Web Store.

First, create icon files in your icons folder. You will need 16x16, 48x48, and 128x128 pixel icons. These should be PNG files with your extension logo.

Next, create a ZIP file of your extension folder. Make sure not to include any unnecessary files or folders.

Then, navigate to the Chrome Web Store Developer Dashboard at chrome.google.com/webstore/devconsole. If you have not already, you will need to pay a one-time developer registration fee of $5.

Create a new listing and upload your ZIP file. Fill in all the required information including the extension name, description, and screenshots. Review your listing carefully and submit it for review.

Google typically reviews new extensions within a few hours to a few days. Once approved, your extension will be available in the Chrome Web Store for millions of Chrome users to discover and install.

---

## Advanced Features to Consider {#advanced-features}

While the basic speed dial extension is fully functional, there are many ways you can enhance it to make it stand out from the competition.

Implement drag-and-drop reordering so users can arrange their tiles in preferred positions. Add custom background themes and allow users to upload their own background images. Implement chrome.storage.sync to automatically sync speed dial entries across devices signed in to the same Google account.

Add import/export functionality so users can backup and share their speed dial configurations. Create multiple speed dial pages or folders for organizing sites by category. Implement keyboard shortcuts for quick navigation. Add a "most visited" feature that automatically suggests sites based on browsing history.

---

## Conclusion {#conclusion}

Building a speed dial Chrome extension is an excellent project that teaches you fundamental extension development concepts while creating a genuinely useful tool. In this guide, you learned how to create a Manifest V3 extension with new tab override, implement persistent storage using the chrome.storage API, build a modern and responsive user interface, and prepare your extension for publishing to the Chrome Web Store.

The extension you built provides a solid foundation that you can continue to improve and customize. Whether you keep it for personal use or publish it to the store, you now have the knowledge and code to create professional-quality Chrome extensions.

Start by testing your extension locally, then iterate on the design and features. With Chrome's extensive API documentation and the community resources available, the possibilities for extending your speed dial are virtually unlimited. Good luck with your extension development journey!
