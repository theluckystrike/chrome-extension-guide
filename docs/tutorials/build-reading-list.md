---
layout: default
title: "Chrome Extension Reading List — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-reading-list/"
---
# Build a Reading List Extension — Full Tutorial

## What We're Building {#what-were-building}
- Save current page to reading list with one click
- Side panel UI showing saved articles (cross-ref `docs/mv3/side-panel.md`)
- Mark as read, delete, search, sync across devices
- Uses `sidePanel`, `activeTab`, `storage`, `alarms`, `contextMenus`, `@theluckystrike/webext-storage`, `@theluckystrike/webext-messaging`

## manifest.json {#manifestjson}
```json
{
  "manifest_version": 3,
  "name": "Reading List",
  "version": "1.0.0",
  "permissions": ["sidePanel", "activeTab", "storage", "alarms", "contextMenus"],
  "side_panel": { "default_path": "sidepanel.html" },
  "action": {},
  "background": { "service_worker": "background.js" }
}
```

## Step 1: Save Current Page {#step-1-save-current-page}
- `chrome.action.onClicked` — save active tab's URL + title + timestamp
- Also via context menu: "Add to Reading List"
- Store with `@theluckystrike/webext-storage`:
```typescript
const storage = createStorage(defineSchema({
  articles: 'string',    // JSON array of { url, title, date, read }
  unreadCount: 'number'
}), 'sync');  // sync = available across devices
```

## Step 2: Side Panel UI {#step-2-side-panel-ui}
- List view of saved articles with title, domain, date
- Read/unread indicator (bold = unread)
- Click to open article in new tab
- Swipe or button to mark read / delete
- Search bar to filter articles

## Step 3: Background Service Worker {#step-3-background-service-worker}
```typescript
const messenger = createMessenger<Messages>();

// Save article
chrome.action.onClicked.addListener(async (tab) => {
  const articles = JSON.parse(await storage.get('articles') || '[]');
  if (!articles.find(a => a.url === tab.url)) {
    articles.unshift({ url: tab.url, title: tab.title, date: Date.now(), read: false });
    await storage.set('articles', JSON.stringify(articles));
    await storage.set('unreadCount', articles.filter(a => !a.read).length);
  }
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "addToReadingList", title: "Add to Reading List", contexts: ["page", "link"] });
});
```

## Step 4: Badge showing unread count {#step-4-badge-showing-unread-count}
```javascript
storage.watch('unreadCount', (count) => {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#3498db" });
});
```

## Step 5: Daily Digest Notification {#step-5-daily-digest-notification}
```javascript
chrome.alarms.create("dailyDigest", { periodInMinutes: 1440 }); // 24 hours
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "dailyDigest") {
    const count = await storage.get('unreadCount') || 0;
    if (count > 0) {
      chrome.notifications.create({ type: "basic", title: "Reading List", message: `You have ${count} unread articles`, iconUrl: "icon128.png" });
    }
  }
});
```

## Step 6: Side Panel Reactive Updates {#step-6-side-panel-reactive-updates}
```javascript
// sidepanel.js — live updates when articles change
storage.watch('articles', (newValue) => {
  const articles = JSON.parse(newValue || '[]');
  renderArticleList(articles);
});
```

## Testing {#testing}
- Save multiple pages, verify they appear in side panel
- Test mark as read, delete, search
- Test sync: save on one device, check on another (sync storage)
- Test daily digest notification
- Test duplicate prevention (same URL)

## What You Learned {#what-you-learned}
- Side Panel API for persistent UI
- Context menus for "save" actions
- Sync storage for cross-device data
- Alarms for scheduled notifications
- Reactive UI with storage.watch()
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
