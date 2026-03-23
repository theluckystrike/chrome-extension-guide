---
title: Building a GitHub Notifications Extension
description: Learn how to build a Chrome extension that polls the GitHub API for unread notifications.
canonical_url: "https://bestchromeextensions.com/tutorials/build-github-notifier/"
---

# Chrome Extension Building a GitHub Notifications Extension — Complete Developer's Guide

Create desktop notifications with the Chrome Notifications API. Learn how to build engaging notification experiences.
This tutorial walks you through creating a Chrome extension that monitors GitHub notifications.

## Prerequisites {#prerequisites}
- Chrome browser (version 88+)
- GitHub account
- [Personal Access Token](https://github.com/settings/tokens) with `notifications` scope

## Project Structure {#project-structure}
```
github-notifier/
├── manifest.json
├── popup/popup.html, popup.js
├── background/background.js
├── options/options.html, options.js
```

## Step 1: Manifest and Popup UI {#step-1-manifest-and-popup-ui}

```json
{
  "manifest_version": 3,
  "name": "GitHub Notifier",
  "permissions": ["alarms", "notifications", "storage"],
  "host_permissions": ["https://api.github.com/"],
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background/background.js" },
  "options_page": "options/options.html"
}
```

```html
<!-- popup/popup.html -->
<!DOCTYPE html><html><body>
<h3>GitHub Notifications</h3><p id="count">Loading...</p>
<button id="openSettings">Settings</button>
<script src="popup.js"></script></body></html>
```

## Step 2: Background Worker with Alarm Polling {#step-2-background-worker-with-alarm-polling}

Set up periodic polling using the [Alarms API](/docs/api-reference/alarms-api.md):

```javascript
// background/background.js
chrome.alarms.create('pollNotifications', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'pollNotifications') check(); });

async function check() {
  const { token } = await chrome.storage.local.get('token');
  if (!token) return;
  const r = await fetch('https://api.github.com/notifications', {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
  });
  if (r.status === 401) { await chrome.storage.local.remove('token'); return; }
  if (r.status === 403) return;
  const n = await r.json();
  const u = n.filter(x => x.unread);
  await badge(u.length);
  const lc = await chrome.storage.local.get('lastCheck');
  if (lc.lastCheck && n.some(x => new Date(x.updated_at) > new Date(lc.lastCheck))) notify(u);
  await chrome.storage.local.set({ lastCheck: new Date().toISOString() });
}
```

## Step 3: GitHub API Integration {#step-3-github-api-integration}

Store token in local storage. For production, implement [OAuth](/docs/guides/identity-oauth.md).

## Step 4: Badge Count Updates {#step-4-badge-count-updates}

```javascript
async function badge(count) {
  await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#ff4500' });
}
```

## Step 5: Desktop Notifications {#step-5-desktop-notifications}

Implement using the [Notifications API](/docs/api-reference/notifications-api.md):

```javascript
async function notify(list) {
  const l = list[0];
  await chrome.notifications.create({
    type: 'basic', iconUrl: 'icons/icon48.png',
    title: l.repository.full_name, message: l.subject.title, priority: 1
  });
}
chrome.notifications.onClicked.addListener((id) => {
  chrome.tabs.create({ url: 'https://github.com/notifications' });
  chrome.notifications.clear(id);
});
```

## Step 6: Options Page {#step-6-options-page}

```html
<!-- options/options.html -->
<!DOCTYPE html><html><body>
<h2>Settings</h2>
<input type="password" id="token" placeholder="Personal Access Token">
<button id="save">Save</button>
<script src="options.js"></script></body></html>
```

```javascript
// options/options.js
document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.local.set({ token: document.getElementById('token').value });
});
```

## Step 7: Click to Mark as Read {#step-7-click-to-mark-as-read}

```javascript
chrome.action.onClicked.addListener(async () => {
  const { token } = await chrome.storage.local.get('token');
  await fetch('https://api.github.com/notifications', {
    method: 'PUT', headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ read: true })
  });
  await badge(0);
});
```

## Error Handling {#error-handling}
| Error | Handling |
|-------|----------|
| 401 Unauthorized | Clear token, prompt re-auth |
| 403 Rate Limited | Increase poll interval |
| Network Error | Retry with backoff |

## Summary {#summary}

You've built a GitHub notifications extension with alarm-based polling, badge updates, desktop notifications, and token configuration. For production, upgrade to OAuth as documented in [Identity and OAuth](/docs/guides/identity-oauth.md).
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
