---
layout: default
title: "Chrome Extension Incognito Handling. Best Practices"
description: "Handle incognito mode in extensions."
canonical_url: "https://bestchromeextensions.com/patterns/incognito-handling/"
---

# Incognito Mode Handling

Chrome's incognito mode provides privacy-focused browsing where no history, cookies, or site data persist after the session ends. Extensions must handle incognito contexts thoughtfully to respect user privacy.

Manifest Configuration {#manifest-configuration}

The `incognito` field in manifest.json controls how your extension behaves in incognito windows:

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "incognito": "spanning" // or "split"
}
```

Spanning Mode (Default) {#spanning-mode-default}

In spanning mode, your extension runs in the same background process for both regular and incognito windows. This means:
- Single global state shared between modes
- `storage.local` and `storage.sync` share data across both contexts
- Cookies and site data from incognito are accessible but tracked together
- This is the default behavior for backward compatibility

Split Mode {#split-mode}

In split mode, your extension maintains separate instances for incognito windows:
- Separate JavaScript execution context
- Independent `storage.local` data (not shared with regular windows)
- Each incognito window gets its own isolated storage
- Better privacy isolation but requires more complex handling

Detecting Incognito Context {#detecting-incognito-context}

Checking Tab Incognito Status {#checking-tab-incognito-status}

```javascript
// Check if a specific tab is in incognito mode
chrome.tabs.get(tabId, (tab) => {
  if (tab.incognito) {
    console.log('This tab is incognito');
  }
});

// In content scripts, access directly
if (window.location.href.includes('incognito')) {
  // Note: No direct API, use chrome.tabs.query or message background
}
```

Checking Incognito Access Permission {#checking-incognito-access-permission}

```javascript
// Check if extension is allowed in incognito mode
chrome.extension.isAllowedIncognitoAccess((allowed) => {
  if (allowed) {
    console.log('Extension is allowed in incognito');
  } else {
    console.log('User must manually enable incognito access');
  }
});

// Promise-based alternative (Manifest V3)
async function checkIncognitoAccess() {
  const allowed = await chrome.extension.isAllowedIncognitoAccess();
  return allowed;
}
```

Detecting in Service Workers {#detecting-in-service-workers}

```javascript
// Service workers only run in the main context
// Pass incognito info via message passing from content scripts

// Content script
chrome.runtime.sendMessage({
  type: 'TAB_INFO',
  tabId: chrome.runtime.id,
  incognito: document IncognitoProperty
});

// Background service worker
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'TAB_INFO') {
    const isIncognito = sender.tab?.incognito;
    // Handle accordingly
  }
});
```

Cookie Handling in Incognito {#cookie-handling-in-incognito}

Incognito windows use separate cookie stores:

```javascript
// Discover cookie stores dynamically (storeId values are not guaranteed)
async function getIncognitoCookieStore() {
  const stores = await chrome.cookies.getAllCookieStores();
  // Find the incognito store by checking which tabs are incognito
  // Do NOT hardcode storeId values -- use getAllCookieStores() to discover them
  return stores;
}

async function getIncognitoCookies(url, incognitoStoreId) {
  const cookies = await chrome.cookies.getAll({
    url: url,
    storeId: incognitoStoreId
  });
  return cookies;
}

// List all cookie stores including incognito
async function listCookieStores() {
  const stores = await chrome.cookies.getAllCookieStores();
  stores.forEach(store => {
    console.log(`Store ID: ${store.id}, Tab IDs: ${store.tabIds}`);
  });
}
```

Privacy-Aware Implementation {#privacy-aware-implementation}

Respecting User Privacy {#respecting-user-privacy}

```javascript
// Don't track or save data from incognito sessions
async function shouldSaveData() {
  // Check if any window is incognito
  const windows = await chrome.windows.getAll();
  const hasIncognito = windows.some(w => w.incognito);

  if (hasIncognito) {
    // Respect privacy - don't persist incognito data
    return false;
  }
  return true;
}

// In your data handling logic
async function saveUserActivity(data) {
  const canSave = await shouldSaveData();
  if (!canSave) {
    console.log('Skipping data save in incognito context');
    return;
  }
  // Proceed with saving...
}
```

Conditional Storage in Split Mode {#conditional-storage-in-split-mode}

```javascript
// Handle split mode storage appropriately
function getStorageKey(baseKey, isIncognito) {
  if (isIncognito) {
    return `incognito_${baseKey}`; // Prefix for incognito data
  }
  return baseKey;
}

// Retrieve appropriate data based on context
async function getContextualData(key, tabId) {
  const tab = await chrome.tabs.get(tabId);
  const effectiveKey = getStorageKey(key, tab.incognito);

  return new Promise((resolve) => {
    chrome.storage.local.get(effectiveKey, (result) => {
      resolve(result[effectiveKey]);
    });
  });
}
```

User Configuration {#user-configuration}

Users must manually enable your extension in incognito mode:

1. Navigate to `chrome://extensions`
2. Find your extension
3. Click "Details"
4. Toggle "Allow in Incognito"

You can prompt users to enable this:

```javascript
// Check on startup and notify if not enabled
chrome.runtime.onStartup.addListener(async () => {
  const allowed = await chrome.extension.isAllowedIncognitoAccess();
  if (!allowed) {
    // Show notification or UI to guide user
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  }
});
```

Best Practices {#best-practices}

1. Default to Spanning: Only use "split" mode if you truly need isolation
2. Respect Privacy: Never persist or track data from incognito sessions
3. Clear UI Indicators: Show users when operating in incognito mode
4. Handle Permissions: Request incognito permission explicitly if needed
5. Cookie Awareness: Remember cookie stores are separate in incognito

Related Documentation {#related-documentation}

- [Cookie Permissions](../permissions/cookies.md)
- [Cookie Sessions Pattern](./cookies-sessions.md)
- [Security Best Practices](../guides/security-best-practices.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
