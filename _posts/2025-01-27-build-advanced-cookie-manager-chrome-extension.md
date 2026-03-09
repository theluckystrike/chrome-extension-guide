---
layout: post
title: "Build an Advanced Cookie Manager Chrome Extension"
description: "Learn how to build a powerful cookie manager extension that allows users to view, edit, delete, and export cookies. Master cookie jar chrome functionality and manage site cookies with ease using modern Chrome extension development techniques."
date: 2025-01-27
categories: [Chrome Extensions]
tags: [chrome-extension, developer-tools]
keywords: "cookie manager extension, cookie jar chrome, manage site cookies, chrome extension cookies, cookie editor chrome, browser cookie management"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/27/build-advanced-cookie-manager-chrome-extension/"
---

# Build an Advanced Cookie Manager Chrome Extension

Cookie management is one of the most requested features for Chrome extensions. Users constantly need to view, edit, delete, and organize their cookies for privacy, debugging, or development purposes. In this comprehensive guide, we'll walk you through building an advanced cookie manager extension that provides full control over browser cookies with a modern, intuitive interface.

By the end of this tutorial, you'll have a fully functional cookie manager extension that can view cookies by domain, edit cookie values, delete individual or bulk cookies, export and import cookie data, and provide a visual "cookie jar" interface for managing site cookies.

---

## Why Build a Cookie Manager Extension?

Before diving into the code, let's understand why cookie manager extensions are so valuable. The default Chrome cookie management interface is limited—it doesn't allow easy editing, bulk operations, or convenient filtering. This creates an opportunity for extension developers to provide enhanced functionality.

A cookie manager extension serves multiple use cases:

- **Privacy-conscious users** who want to see and control what data websites store
- **Web developers** debugging cookie-based authentication and session handling
- **QA testers** who need to manipulate cookies to test different scenarios
- **Power users** who want to manage multiple accounts on the same site

Building a cookie manager extension is also an excellent learning project because it covers many important Chrome extension APIs, including the Cookies API, Storage API, and Runtime API.

---

## Project Setup and Manifest Configuration

Every Chrome extension starts with a `manifest.json` file. For our cookie manager extension, we'll use Manifest V3, which is the current standard. Here's our manifest configuration:

```json
{
  "manifest_version": 3,
  "name": "Advanced Cookie Manager",
  "version": "1.0.0",
  "description": "A powerful cookie manager to view, edit, delete, and export cookies",
  "permissions": [
    "cookies",
    "storage",
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
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

The critical permission here is `cookies`, which grants access to the Chrome Cookies API. The `host_permissions` with `<all_urls>` allows your extension to read and modify cookies from any website.

---

## The Popup Interface

The popup is the main user interface for our cookie manager. We'll create an HTML structure that displays cookies in an organized, searchable format:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cookie Manager</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>🍪 Cookie Manager</h1>
      <div class="actions">
        <button id="exportBtn" class="btn">Export</button>
        <button id="importBtn" class="btn">Import</button>
        <button id="refreshBtn" class="btn">Refresh</button>
      </div>
    </header>
    
    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Search cookies...">
      <select id="domainFilter">
        <option value="">All Domains</option>
      </select>
    </div>
    
    <div class="stats">
      <span id="cookieCount">0 cookies</span>
      <button id="clearAllBtn" class="btn-danger">Clear All</button>
    </div>
    
    <div class="cookie-list" id="cookieList">
      <div class="loading">Loading cookies...</div>
    </div>
  </div>
  
  <div id="editModal" class="modal hidden">
    <div class="modal-content">
      <h2>Edit Cookie</h2>
      <form id="editForm">
        <input type="hidden" id="editName">
        <input type="hidden" id="editUrl">
        
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="editNameDisplay" readonly>
        </div>
        
        <div class="form-group">
          <label>Value</label>
          <textarea id="editValue"></textarea>
        </div>
        
        <div class="form-group">
          <label>Domain</label>
          <input type="text" id="editDomain">
        </div>
        
        <div class="form-group">
          <label>Path</label>
          <input type="text" id="editPath" value="/">
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="editSecure">
            Secure
          </label>
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="editHttpOnly">
            HttpOnly
          </label>
        </div>
        
        <div class="form-group">
          <label>Expiration (days)</label>
          <input type="number" id="editExpiration" min="0">
        </div>
        
        <div class="modal-actions">
          <button type="submit" class="btn">Save</button>
          <button type="button" class="btn-secondary" id="cancelEdit">Cancel</button>
        </div>
      </form>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

---

## Styling Your Cookie Manager

A cookie manager needs to be clean and functional. Here's the CSS to make your extension look professional:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 400px;
  min-height: 500px;
  background: #f5f5f5;
}

.container {
  padding: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

h1 {
  font-size: 18px;
  color: #333;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background: #4285f4;
  color: white;
  cursor: pointer;
  font-size: 12px;
}

.btn:hover {
  background: #3367d6;
}

.btn-danger {
  background: #ea4335;
}

.btn-danger:hover {
  background: #d33426;
}

.btn-secondary {
  background: #9aa0a6;
}

.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.search-bar input,
.search-bar select {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.search-bar input {
  flex: 1;
}

.stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  color: #666;
}

.cookie-list {
  max-height: 350px;
  overflow-y: auto;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.cookie-item {
  padding: 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.cookie-item:hover {
  background: #f8f9fa;
}

.cookie-item:last-child {
  border-bottom: none;
}

.cookie-name {
  font-weight: 600;
  color: #333;
  font-size: 13px;
  word-break: break-all;
}

.cookie-domain {
  font-size: 11px;
  color: #888;
  margin-top: 4px;
}

.cookie-value {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  word-break: break-all;
  max-height: 40px;
  overflow: hidden;
}

.cookie-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.cookie-actions button {
  padding: 4px 8px;
  font-size: 11px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.edit-btn {
  background: #34a853;
  color: white;
}

.delete-btn {
  background: #ea4335;
  color: white;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.hidden {
  display: none;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 350px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-bottom: 16px;
  font-size: 16px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.form-group textarea {
  min-height: 60px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.loading {
  padding: 20px;
  text-align: center;
  color: #666;
}
```

---

## Implementing Cookie Retrieval Logic

Now let's build the core functionality. The `popup.js` file handles all the cookie operations:

```javascript
// Initialize the extension
document.addEventListener('DOMContentLoaded', async () => {
  await loadCookies();
  setupEventListeners();
});

let allCookies = [];

async function loadCookies() {
  const cookieList = document.getElementById('cookieList');
  const cookieCount = document.getElementById('cookieCount');
  const domainFilter = document.getElementById('domainFilter');
  
  try {
    // Get all cookies from all URLs
    const cookies = await chrome.cookies.getAll({});
    allCookies = cookies;
    
    // Update count
    cookieCount.textContent = `${cookies.length} cookies`;
    
    // Populate domain filter
    const domains = [...new Set(cookies.map(c => c.domain))].sort();
    domainFilter.innerHTML = '<option value="">All Domains</option>';
    domains.forEach(domain => {
      const option = document.createElement('option');
      option.value = domain;
      option.textContent = domain;
      domainFilter.appendChild(option);
    });
    
    // Render cookies
    renderCookies(cookies);
  } catch (error) {
    cookieList.innerHTML = `<div class="loading">Error: ${error.message}</div>`;
  }
}

function renderCookies(cookies) {
  const cookieList = document.getElementById('cookieList');
  
  if (cookies.length === 0) {
    cookieList.innerHTML = '<div class="loading">No cookies found</div>';
    return;
  }
  
  cookieList.innerHTML = cookies.map(cookie => `
    <div class="cookie-item" data-name="${encodeURIComponent(cookie.name)}" 
         data-domain="${cookie.domain}" data-url="${cookie.url}">
      <div class="cookie-name">${escapeHtml(cookie.name)}</div>
      <div class="cookie-domain">${escapeHtml(cookie.domain)}</div>
      <div class="cookie-value">${escapeHtml(cookie.value)}</div>
      <div class="cookie-actions">
        <button class="edit-btn" data-cookie='${JSON.stringify(cookie)}'>Edit</button>
        <button class="delete-btn" data-name="${encodeURIComponent(cookie.name)}" 
                data-domain="${cookie.domain}" data-url="${cookie.url}">Delete</button>
      </div>
    </div>
  `).join('');
  
  // Attach event listeners
  attachCookieEventListeners();
}

function attachCookieEventListeners() {
  // Edit buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cookie = JSON.parse(e.target.dataset.cookie);
      openEditModal(cookie);
    });
  });
  
  // Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const name = decodeURIComponent(e.target.dataset.name);
      const domain = e.target.dataset.domain;
      const url = e.target.dataset.url;
      
      if (confirm(`Delete cookie "${name}"?`)) {
        await deleteCookie(name, domain, url);
        await loadCookies();
      }
    });
  });
}

async function deleteCookie(name, domain, url) {
  try {
    await chrome.cookies.remove({
      name: name,
      url: url,
      storeId: chrome.cookies.STATE_GET_ACTIVE
    });
  } catch (error) {
    console.error('Error deleting cookie:', error);
    alert('Failed to delete cookie: ' + error.message);
  }
}
```

---

## Implementing the Edit Functionality

The edit modal allows users to modify cookie properties. This is one of the most powerful features of a cookie manager extension:

```javascript
function openEditModal(cookie) {
  const modal = document.getElementById('editModal');
  const form = document.getElementById('editForm');
  
  // Populate form with cookie data
  document.getElementById('editName').value = cookie.name;
  document.getElementById('editNameDisplay').value = cookie.name;
  document.getElementById('editValue').value = cookie.value;
  document.getElementById('editDomain').value = cookie.domain;
  document.getElementById('editPath').value = cookie.path;
  document.getElementById('editSecure').checked = cookie.secure;
  document.getElementById('editHttpOnly').checked = cookie.httpOnly;
  document.getElementById('editUrl').value = cookie.url;
  
  // Calculate expiration days
  if (cookie.expirationDate) {
    const now = Math.floor(Date.now() / 1000);
    const days = Math.ceil((cookie.expirationDate - now) / 86400);
    document.getElementById('editExpiration').value = days > 0 ? days : 0;
  }
  
  modal.classList.remove('hidden');
}

document.getElementById('cancelEdit').addEventListener('click', () => {
  document.getElementById('editModal').classList.add('hidden');
});

document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('editName').value;
  const url = document.getElementById('editUrl').value;
  const newValue = document.getElementById('editValue').value;
  const domain = document.getElementById('editDomain').value;
  const path = document.getElementById('editPath').value;
  const secure = document.getElementById('editSecure').checked;
  const httpOnly = document.getElementById('editHttpOnly').checked;
  const expirationDays = parseInt(document.getElementById('editExpiration').value) || 0;
  
  try {
    // First, delete the old cookie
    await chrome.cookies.remove({
      name: name,
      url: url
    });
    
    // Then create the updated cookie
    const newCookie = {
      name: name,
      value: newValue,
      domain: domain,
      path: path,
      secure: secure,
      httpOnly: httpOnly,
      url: url,
      storeId: chrome.cookies.STATE_GET_ACTIVE
    };
    
    if (expirationDays > 0) {
      newCookie.expirationDate = Math.floor(Date.now() / 1000) + (expirationDays * 86400);
    }
    
    await chrome.cookies.set(newCookie);
    
    document.getElementById('editModal').classList.add('hidden');
    await loadCookies();
  } catch (error) {
    alert('Error updating cookie: ' + error.message);
  }
});
```

---

## Implementing Search and Filtering

A cookie manager extension needs robust search and filtering to manage site cookies effectively:

```javascript
function setupEventListeners() {
  // Search input
  document.getElementById('searchInput').addEventListener('input', (e) => {
    filterCookies();
  });
  
  // Domain filter
  document.getElementById('domainFilter').addEventListener('change', () => {
    filterCookies();
  });
  
  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await loadCookies();
  });
  
  // Clear all button
  document.getElementById('clearAllBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all cookies? This cannot be undone.')) {
      await clearAllCookies();
      await loadCookies();
    }
  });
  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportCookies);
  
  // Import button
  document.getElementById('importBtn').addEventListener('click', importCookies);
}

function filterCookies() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const domainFilter = document.getElementById('domainFilter').value;
  
  let filtered = allCookies;
  
  // Filter by domain
  if (domainFilter) {
    filtered = filtered.filter(c => c.domain === domainFilter);
  }
  
  // Filter by search term
  if (searchTerm) {
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(searchTerm) ||
      c.value.toLowerCase().includes(searchTerm) ||
      c.domain.toLowerCase().includes(searchTerm)
    );
  }
  
  renderCookies(filtered);
}

async function clearAllCookies() {
  for (const cookie of allCookies) {
    try {
      await chrome.cookies.remove({
        name: cookie.name,
        url: cookie.url
      });
    } catch (error) {
      console.error('Error clearing cookie:', error);
    }
  }
}
```

---

## Export and Import Functionality

The ability to export and import cookies is crucial for many use cases, including moving cookies between browsers or backing up session data:

```javascript
async function exportCookies() {
  const exportData = {
    version: 1,
    exportDate: new Date().toISOString(),
    cookies: allCookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      expirationDate: c.expirationDate,
      storeId: c.storeId
    }))
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `cookies-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

async function importCookies() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.cookies || !Array.isArray(data.cookies)) {
        throw new Error('Invalid cookie file format');
      }
      
      let imported = 0;
      let failed = 0;
      
      for (const cookie of data.cookies) {
        try {
          // Construct URL from domain if not provided
          let url = cookie.url;
          if (!url) {
            url = (cookie.secure ? 'https://' : 'http://') + 
                  cookie.domain.replace(/^\./, '') + 
                  cookie.path;
          }
          
          await chrome.cookies.set({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure || false,
            httpOnly: cookie.httpOnly || false,
            url: url,
            expirationDate: cookie.expirationDate,
            storeId: chrome.cookies.STATE_GET_ACTIVE
          });
          imported++;
        } catch (error) {
          console.error('Failed to import cookie:', error);
          failed++;
        }
      }
      
      alert(`Import complete: ${imported} cookies imported, ${failed} failed`);
      await loadCookies();
    } catch (error) {
      alert('Error importing cookies: ' + error.message);
    }
  });
  
  input.click();
}
```

---

## Security Considerations for Cookie Managers

When building a cookie manager extension, security is paramount. Here are essential considerations:

1. **Minimize permissions**: Only request the permissions your extension absolutely needs
2. **Secure data handling**: Never send cookie data to external servers without user consent
3. **Input validation**: Always validate and sanitize cookie values before using them
4. **HTTPS enforcement**: When setting cookies, prefer secure (HTTPS) connections when possible
5. **User privacy**: Provide clear information about what data your extension accesses

---

## Testing Your Extension

Before publishing, thoroughly test your cookie manager:

1. Load the extension in developer mode
2. Visit various websites and verify cookies appear correctly
3. Test editing cookie values and verify changes persist
4. Test deleting individual cookies and bulk operations
5. Verify export produces valid JSON files
6. Test import functionality with exported files
7. Check that search and filtering work correctly
8. Test across different Chrome profiles

---

## Conclusion

Building an advanced cookie manager extension is a rewarding project that teaches you essential Chrome extension development skills while creating a genuinely useful tool. The extension we built today provides:

- Complete cookie viewing with domain organization
- Full cookie editing capabilities
- Individual and bulk cookie deletion
- Search and filtering functionality
- Export and import features
- A clean, professional user interface

These features make it a powerful utility for anyone who needs to manage site cookies efficiently. The cookie jar chrome concept becomes a reality through intuitive visualization and powerful management features.

With the foundation you've learned in this guide, you can extend this cookie manager extension further with features like cookie categories, favorites, automatic cleanup rules, or even cookie synchronization across devices. The Chrome Cookies API provides extensive capabilities for building sophisticated cookie management tools.

Start building your cookie manager extension today and join the community of developers creating essential developer tools for Chrome.
