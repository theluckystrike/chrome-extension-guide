# Chrome Action API Guide

## Overview
The Chrome Action API (`chrome.action`) controls the extension's toolbar icon in the browser's toolbar. Introduced in Manifest V3, it replaces the deprecated `chrome.browserAction` API from Manifest V2.

## Required Permissions
```json
{ "permissions": ["action"] }
```

## Setting Dynamic Icons
The `setIcon` method dynamically changes the toolbar icon based on extension state or tab context.

```javascript
// Set icon for specific tab
chrome.action.setIcon({
  tabId: tab.id,
  path: { '16': 'icon16.png', '32': 'icon32.png', '128': 'icon128.png' }
});

// Set icon using ImageData (generated dynamically)
chrome.action.setIcon({
  tabId: tab.id,
  imageData: canvasContext.getImageData(0, 0, 128, 128)
});

// Set icon for all tabs (omit tabId)
chrome.action.setIcon({ path: { '32': 'icon-active.png' } });
```

## Badge Text and Background Color
Badges display overlay text on the toolbar icon for notifications or counters.

```javascript
// Set badge text for a specific tab
chrome.action.setBadgeText({ tabId: tab.id, text: '5' });

// Set badge text globally
chrome.action.setBadgeText({ text: '!' });

// Set badge background color
chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#FF0000' });

// Use RGBA array for all tabs
chrome.action.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
```

## Dynamic Popup Management
Control the popup associated with the toolbar icon dynamically.

```javascript
// Set popup for specific tab
chrome.action.setPopup({ tabId: tab.id, popup: 'popup.html' });

// Disable popup (click triggers onClicked)
chrome.action.setPopup({ tabId: tab.id, popup: '' });

// Enable popup globally
chrome.action.setPopup({ popup: 'popup.html' });
```

## Programmatic Popup Opening
The `openPopup` method programmatically opens the extension's action popup.

```javascript
// Open popup
chrome.action.openPopup()
  .then(() => console.log('Popup opened'))
  .catch(err => console.error('Failed:', err));

// Open in specific window
chrome.action.openPopup(windowId);
```

## Enabling and Disabling Actions
Toggle the action button's enabled state per tab or globally.

```javascript
chrome.action.disable(tab.id);   // Disable for specific tab
chrome.action.enable(tab.id);   // Enable for specific tab
chrome.action.disable();         // Disable globally
chrome.action.enable();          // Enable globally
```

## Click Handler
The `onClicked` event fires when the user clicks the action icon. Only fires when no popup is set.

```javascript
chrome.action.onClicked.addListener((tab) => {
  console.log('Action clicked for tab:', tab.id);
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => console.log('Injected!')
  });
});
```

## Per-Tab vs Global State
All action methods support both per-tab and global scope. Omit `tabId` for global state.

```javascript
// Different icon per tab based on URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const icon = tab.url.includes('github.com') ? 'github.png' : 'default.png';
    chrome.action.setIcon({ tabId, path: { '32': icon } });
  }
});
```

## Migrating from chrome.browserAction (MV2)
Key migration differences:

| MV2 (browserAction) | MV3 (action) |
|---------------------|--------------|
| `chrome.browserAction` | `chrome.action` |
| `browser_action` in manifest | `action` in manifest |
| `onClicked` always fires | Only fires without popup |
| `color: '#FF0000'` | `color: [255, 0, 0, 255]` |

```javascript
// MV2: "browser_action": { "default_icon": "icon.png" }
// MV3: "action": { "default_icon": { "32": "icon.png" } }
```

## Building Dynamic Toolbar Extensions
Example: Toggle extension state with visual feedback.

```javascript
chrome.action.onClicked.addListener((tab) => {
  chrome.action.getBadgeText({ tabId: tab.id }, (text) => {
    const isEnabled = text === 'ON';
    if (isEnabled) {
      chrome.action.setBadgeText({ tabId: tab.id, text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#FF0000' });
    } else {
      chrome.action.setBadgeText({ tabId: tab.id, text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#00FF00' });
      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: initTracker });
    }
  });
});

function initTracker() { /* tracking logic */ }
```

## Best Practices
- Provide icons for multiple sizes (16, 32, 48, 128px)
- Use per-tab state for context-specific information
- Clear badges when no longer relevant
- Test with and without popup (click behavior differs)
- Use `chrome.action` in MV3; `browserAction` is deprecated

## Reference
- https://developer.chrome.com/docs/extensions/reference/api/action
- https://developer.chrome.com/docs/extensions/mv3/intro
