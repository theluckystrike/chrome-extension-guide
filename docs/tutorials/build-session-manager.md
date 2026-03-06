# Build a Session Manager Extension

## What You'll Build
A browser session manager that saves/restores window tab states, names sessions, and auto-saves.

## Prerequisites
- Tabs API (cross-ref `docs/api-reference/tabs-api.md`)
- Storage API (cross-ref `docs/api-reference/storage-api-deep-dive.md`)

## Project Structure
```
session-manager/
  manifest.json
  background.js
  popup/popup.html
  popup/popup.js
```

## Step 1: Manifest
```json
{
  "manifest_version": 3,
  "name": "Session Manager",
  "version": "1.0.0",
  "permissions": ["tabs", "storage", "alarms"],
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background.js" }
}
```

## Step 2: Save Session
```javascript
// background.js - capture all tabs in current window
async function saveSession(name) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const session = {
    id: Date.now(),
    name,
    timestamp: Date.now(),
    tabs: tabs.map(t => ({ url: t.url, title: t.title, pinned: t.pinned }))
  };
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  sessions.unshift(session);
  await chrome.storage.local.set({ sessions });
}
```

## Step 3: Storage Schema
```javascript
// { sessions: [{ id, name, timestamp, tabs: [{ url, title, pinned }] }] }
```

## Step 4: Popup UI
```html
<input type="text" id="sessionName" placeholder="Session name">
<button id="saveBtn">Save</button>
<div id="sessionList"></div>
```

## Step 5: Restore Session
```javascript
async function restoreSession(sessionId) {
  const { sessions } = await chrome.storage.local.get('sessions');
  const session = sessions.find(s => s.id === sessionId);
  for (const tab of session.tabs) {
    // Skip restricted pages (chrome://, about:)
    if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
      await chrome.tabs.create({ url: tab.url, pinned: tab.pinned });
    }
  }
}
```

## Step 6: Session Naming & Editing
```javascript
async function renameSession(id, newName) {
  const { sessions } = await chrome.storage.local.get('sessions');
  const idx = sessions.findIndex(s => s.id === id);
  if (idx !== -1) { sessions[idx].name = newName; await chrome.storage.local.set({ sessions }); }
}
async function deleteSession(id) {
  const { sessions } = await chrome.storage.local.get('sessions');
  await chrome.storage.local.set({ sessions: sessions.filter(s => s.id !== id) });
}
```

## Step 7: Auto-Save
```javascript
// background.js
chrome.alarms.create('autoSave', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoSave') {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const session = { id: Date.now(), name: `Auto ${new Date().toLocaleTimeString()}`, 
      timestamp: Date.now(), tabs: tabs.map(t => ({ url: t.url, title: t.title })) };
    const { sessions = [] } = await chrome.storage.local.get('sessions');
    await chrome.storage.local.set({ sessions: [session, ...sessions].slice(0, 50) });
  }
});
```

## Step 8: Merge & Export/Import
```javascript
// Merge: add to current window instead of replacing
async function restoreMerge(sessionId) {
  const { sessions } = await chrome.storage.local.get('sessions');
  for (const tab of sessions.find(s => s.id === sessionId).tabs) {
    if (!tab.url.startsWith('chrome://')) await chrome.tabs.create({ url: tab.url });
  }
}
// Export/Import
function exportSessions(sessions) {
  const blob = new Blob([JSON.stringify(sessions)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'sessions.json'; a.click();
}
```
