---
layout: default
title: "Chrome Extension Cookie Manager. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-cookie-manager/"
---
# Build a Cookie Manager Chrome Extension

This tutorial walks you through building a fully-featured cookie manager extension that allows users to view, edit, delete, search, and export cookies.

Prerequisites {#prerequisites}

- Chrome browser or Chromium-based browser
- Basic JavaScript and HTML knowledge
- Chrome Extensions API familiarity

Step 1: Manifest Configuration {#step-1-manifest-configuration}

Create your `manifest.json` with the required permissions:

```json
{
  "name": "Cookie Manager",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": [
    "cookies",
    "activeTab",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  }
}
```

Key permissions:
- cookies: Required for all cookie operations
- activeTab: Access to current tab's URL
- storage: For saving user preferences and exported cookies
- tabs: For tab information

Step 2: Display Cookies for Current Site {#step-2-display-cookies-for-current-site}

Create `popup.js` to fetch and display cookies for the current tab:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);
  
  // Get all cookies for current domain
  const cookies = await chrome.cookies.getAll({ domain: url.hostname });
  
  displayCookies(cookies, url.hostname);
});

function displayCookies(cookies, domain) {
  const container = document.getElementById('cookie-list');
  container.innerHTML = cookies.map(cookie => `
    <div class="cookie-item" data-name="${cookie.name}">
      <span class="cookie-name">${cookie.name}</span>
      <span class="cookie-value">${cookie.value.substring(0, 30)}...</span>
    </div>
  `).join('');
}
```

Step 3: Cookie Details View {#step-3-cookie-details-view}

Create a detailed view showing all cookie properties:

```javascript
function showCookieDetails(cookie) {
  const details = `
    <div class="cookie-details">
      <h3>${cookie.name}</h3>
      <p><strong>Value:</strong> ${cookie.value}</p>
      <p><strong>Domain:</strong> ${cookie.domain}</p>
      <p><strong>Path:</strong> ${cookie.path}</p>
      <p><strong>Expires:</strong> ${new Date(cookie.expirationDate * 1000)}</p>
      <p><strong>Secure:</strong> ${cookie.secure}</p>
      <p><strong>HttpOnly:</strong> ${cookie.httpOnly}</p>
      <p><strong>SameSite:</strong> ${cookie.sameSite}</p>
      <p><strong>Store ID:</strong> ${cookie.storeId}</p>
    </div>
  `;
  document.getElementById('details-panel').innerHTML = details;
}
```

Step 4: Edit Cookie Values Inline {#step-4-edit-cookie-values-inline}

Implement inline editing with `chrome.cookies.set`:

```javascript
async function updateCookie(name, newValue, domain) {
  const cookie = await chrome.cookies.get({ url: domain, name });
  
  if (cookie) {
    await chrome.cookies.set({
      url: domain,
      name: name,
      value: newValue,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate
    });
  }
}
```

For HttpOnly cookies, you cannot read or modify the value from JavaScript - this requires a background script.

Step 5: Delete Individual Cookies {#step-5-delete-individual-cookies}

Use `chrome.cookies.remove` to delete a specific cookie:

```javascript
async function deleteCookie(name, domain) {
  const cookie = await chrome.cookies.get({ url: domain, name });
  
  if (cookie) {
    await chrome.cookies.remove({
      url: domain,
      name: name,
      storeId: cookie.storeId
    });
  }
}
```

Step 6: Bulk Operations {#step-6-bulk-operations}

Delete all cookies for a domain or clear expired ones:

```javascript
async function deleteAllForDomain(domain) {
  const cookies = await chrome.cookies.getAll({ domain });
  
  for (const cookie of cookies) {
    await chrome.cookies.remove({
      url: `http${cookie.secure ? 's' : ''}://${cookie.domain}`,
      name: cookie.name,
      storeId: cookie.storeId
    });
  }
}

async function clearExpired() {
  const allCookies = await chrome.cookies.getAll({});
  const now = Date.now() / 1000;
  
  for (const cookie of allCookies) {
    if (cookie.expirationDate && cookie.expirationDate < now) {
      await chrome.cookies.remove({
        url: `http${cookie.secure ? 's' : ''}://${cookie.domain}`,
        name: cookie.name,
        storeId: cookie.storeId
      });
    }
  }
}
```

Step 7: Search Across All Cookies {#step-7-search-across-all-cookies}

Search functionality across all domains:

```javascript
async function searchCookies(query) {
  const allCookies = await chrome.cookies.getAll({});
  const results = allCookies.filter(cookie => 
    cookie.name.toLowerCase().includes(query.toLowerCase()) ||
    cookie.value.toLowerCase().includes(query.toLowerCase())
  );
  displayCookies(results, 'All Domains');
}
```

Step 8: Export and Import Cookies {#step-8-export-and-import-cookies}

Export cookies as JSON and import them back:

```javascript
async function exportCookies() {
  const allCookies = await chrome.cookies.getAll({});
  const blob = new Blob([JSON.stringify(allCookies, null, 2)], 
    { type: 'application/json' });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cookies-export.json';
  a.click();
}

async function importCookies(file) {
  const text = await file.text();
  const cookies = JSON.parse(text);
  
  for (const cookie of cookies) {
    await chrome.cookies.set({
      url: `http${cookie.secure ? 's' : ''}://${cookie.domain}`,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate
    });
  }
}
```

Additional Features {#additional-features}

Cookie Change Monitoring {#cookie-change-monitoring}

Listen for cookie changes using the `onChanged` event:

```javascript
chrome.cookies.onChanged.addListener((changeInfo) => {
  console.log('Cookie changed:', changeInfo);
  // Update UI or show notification
});
```

Incognito Cookie Stores {#incognito-cookie-stores}

Access cookies from different stores, including incognito:

```javascript
async function getAllStores() {
  const cookieStores = await chrome.cookies.getAllCookieStores();
  return cookieStores;
}

// Get cookies from specific store
const cookies = await chrome.cookies.getAll({ 
  storeId: 'firefox-default' 
});
```

Cookie Count Badge {#cookie-count-badge}

Display cookie count as a badge on the extension icon:

```javascript
async function updateBadge(tabId) {
  const [tab] = await chrome.tabs.get(tabId);
  const url = new URL(tab.url);
  const cookies = await chrome.cookies.getAll({ domain: url.hostname });
  
  chrome.action.setBadgeText({ 
    tabId, 
    text: cookies.length.toString() 
  });
}
```

Best Practices {#best-practices}

1. Always handle Secure and HttpOnly cookies appropriately
2. Use proper URL construction with protocol
3. Handle different cookie stores for incognito mode
4. Validate cookie data before modification
5. Provide user feedback for all operations

Related Documentation {#related-documentation}

- [Cookies API Reference](../api-reference/cookies-api.md)
- [Cookie Permissions](../permissions/cookies.md)
- [Cookie Sessions Pattern](../patterns/cookies-sessions.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
