---
layout: default
title: "Chrome Extension Badge Management. Best Practices"
description: "Manage extension badges for user notifications."
canonical_url: "https://bestchromeextensions.com/patterns/badge-management/"
---

Badge Management Patterns

Overview {#overview}

The browser action badge is a powerful tool for communicating extension state directly in the toolbar. Effective badge management involves controlling badge text, colors, and icon states to provide meaningful feedback to users without requiring them to open the extension popup.

This guide covers practical patterns for badge text, colors, per-tab vs global badges, animated badges, and state machine approaches for managing action appearance.

---

Badge Text Patterns {#badge-text-patterns}

Unread Count Display {#unread-count-display}

Show the number of unread items with overflow handling:

```js
function updateUnreadBadge(count) {
  let text = '';
  if (count > 0) {
    text = count > 999 ? '999+' : String(count);
  }
  chrome.action.setBadgeText({ text });
}
```

Status Indicators {#status-indicators}

Use short text for status:

```js
const STATUS_TEXTS = {
  active: 'ON',
  inactive: 'OFF',
  error: '!',
  loading: ''
};
```

Error States {#error-states}

Show error indicators prominently:

```js
function showError(message) {
  chrome.action.setBadgeText({ text: 'ERR' });
  chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
}
```

Clearing the Badge {#clearing-the-badge}

An empty string removes the badge:

```js
chrome.action.setBadgeText({ text: '' });
```

---

Badge Colors {#badge-colors}

Define color constants for consistent theming:

```js
const BADGE_COLORS = {
  success: '#4CAF50',  // Green: active/success
  error: '#F44336',    // Red: error/alert
  info: '#2196F3',     // Blue: information/default
  warning: '#FF9800',  // Orange: warning
  inactive: '#9E9E9E'  // Grey: disabled/inactive
};
```

Apply colors with the action API:

```js
chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.success });
```

---

Per-Tab Badge Management {#per-tab-badge-management}

Setting Per-Tab Badges {#setting-per-tab-badges}

Different tabs can display different badge states:

```js
function updateTabBadge(tabId, count) {
  chrome.action.setBadgeText({ text: String(count), tabId });
  chrome.action.setBadgeBackgroundColor({
    color: count > 0 ? BADGE_COLORS.info : BADGE_COLORS.inactive,
    tabId
  });
}
```

Per-Tab vs Global Behavior {#per-tab-vs-global-behavior}

- Per-tab badge: Overrides global badge for specific tabs only
- Per-tab resets: Badge clears automatically when tab navigates away
- Global badge: Shown when no per-tab override exists

```js
// Set per-tab badge
chrome.action.setBadgeText({ text: '5', tabId: 123 });

// Clear per-tab (shows global badge)
chrome.action.setBadgeText({ text: '', tabId: 123 });

// Set global badge (shown when no per-tab override)
chrome.action.setBadgeText({ text: '3' });
```

---

Animated Badge Patterns {#animated-badge-patterns}

Basic Blinking Badge {#basic-blinking-badge}

Toggle between two states to attract attention:

```js
let blinkInterval = null;

function startBlinking(tabId) {
  let show = true;
  blinkInterval = setInterval(() => {
    chrome.action.setBadgeText({
      text: show ? '!' : '',
      tabId
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#F44336',
      tabId
    });
    show = !show;
  }, 500);
}

function stopBlinking() {
  if (blinkInterval) {
    clearInterval(blinkInterval);
    blinkInterval = null;
  }
}
```

Using chrome.alarms (Service Worker Safe) {#using-chromealarms-service-worker-safe}

For service worker extensions, use chrome.alarms instead of setInterval:

```js
chrome.alarms.create('blink', { periodInMinutes: 0.5 }); // 30 seconds (minimum allowed)

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'blink') {
    // Toggle badge state
  }
});
```

Auto-Stop on Interaction {#auto-stop-on-interaction}

Stop animation when user interacts:

```js
chrome.action.onClicked.addListener(() => {
  stopBlinking();
  // Handle click...
});

chrome.tabs.onActivated.addListener(() => {
  stopBlinking();
});
```

> Accessibility Note: Don't rely solely on animation to convey important information. Always provide redundant text or color cues.

---

Badge with Icon State {#badge-with-icon-state}

Combine badge changes with icon updates for richer feedback:

```js
const ICON_STATES = {
  active: { path: 'icons/icon-active.png' },
  disabled: { path: 'icons/icon-disabled.png' },
  error: { path: 'icons/icon-error.png' }
};

function setExtensionState(state, tabId) {
  const options = {
    tabId,
    icon: { path: ICON_STATES[state].path },
    badgeText: state === 'error' ? '!' : '',
    badgeBackgroundColor: BADGE_COLORS[state]
  };
  chrome.action.setIcon(options.icon);
  chrome.action.setBadgeText(options);
  chrome.action.setBadgeBackgroundColor(options);
}
```

Canvas-Based Dynamic Icons {#canvas-based-dynamic-icons}

Generate icons programmatically:

```js
function createColoredIcon(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 32, 32);
  
  return { imageData: canvas.toDataURL() };
}

chrome.action.setIcon({ imageData: createColoredIcon('#4CAF50') });
```

---

State Machine Pattern {#state-machine-pattern}

Centralize badge and action state management:

```js
const ACTION_STATES = {
  idle: {
    badgeText: '',
    badgeColor: '#9E9E9E',
    icon: 'icons/icon-idle.png',
    tooltip: 'Extension ready'
  },
  active: {
    badgeText: 'ON',
    badgeColor: '#4CAF50',
    icon: 'icons/icon-active.png',
    tooltip: 'Monitoring active'
  },
  error: {
    badgeText: '!',
    badgeColor: '#F44336',
    icon: 'icons/icon-error.png',
    tooltip: 'Error occurred'
  },
  loading: {
    badgeText: '...',
    badgeColor: '#2196F3',
    icon: 'icons/icon-loading.png',
    tooltip: 'Loading...'
  }
};

function setActionState(stateName, tabId) {
  const state = ACTION_STATES[stateName];
  if (!state) return;
  
  chrome.action.setBadgeText({ text: state.badgeText, tabId });
  chrome.action.setBadgeBackgroundColor({ color: state.badgeColor, tabId });
  chrome.action.setIcon({ path: state.icon, tabId });
  chrome.action.setTitle({ title: state.tooltip, tabId });
}

// Usage
setActionState('active', tabId);
```

---

Complete Example: Unread Counter with Auto-Clear {#complete-example-unread-counter-with-auto-clear}

```js
class BadgeManager {
  constructor() {
    this.unreadCounts = new Map();
  }
  
  setUnread(tabId, count) {
    this.unreadCounts.set(tabId, count);
    this.updateBadge(tabId);
  }
  
  clearUnread(tabId) {
    this.unreadCounts.delete(tabId);
    this.updateBadge(tabId);
  }
  
  updateBadge(tabId) {
    const count = this.unreadCounts.get(tabId) || 0;
    const text = count > 0 ? (count > 999 ? '999+' : String(count)) : '';
    
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({
      color: count > 0 ? '#2196F3' : '#9E9E9E',
      tabId
    });
  }
  
  clearAll() {
    this.unreadCounts.clear();
    chrome.action.setBadgeText({ text: '' });
  }
}

const badgeManager = new BadgeManager();
```

---

Cross-References {#cross-references}

- [Action API Reference](../api-reference/action-api.md) - Full chrome.action API documentation
- [Badge and Action UI Patterns](badge-action-ui.md) - Related UI patterns
- [State Management](state-management.md) - Managing extension state across components
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
