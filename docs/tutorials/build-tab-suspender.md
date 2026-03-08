---
layout: default
title: "Chrome Extension Tab Suspender — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-tab-suspender/"
---
# Build a Tab Suspender Extension — Full Tutorial

## What We're Building {#what-were-building}
- Automatically suspend inactive tabs to free memory
- Uses `chrome.tabs.discard()`, `chrome.idle`, and `@theluckystrike/webext-storage`
- Configurable whitelist and timeout settings
- Badge showing suspended tab count

## Prerequisites {#prerequisites}
- Basic Chrome extension knowledge (cross-ref: `docs/guides/extension-architecture.md`)
- Node.js + npm installed
- `npm install @theluckystrike/webext-storage`

## Step 1: manifest.json {#step-1-manifestjson}
```json
{
  "manifest_version": 3,
  "name": "Tab Suspender",
  "version": "1.0.0",
  "permissions": ["tabs", "idle", "storage", "alarms"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "options_page": "options.html"
}
```

## Step 2: Storage Schema {#step-2-storage-schema}
Define the configuration schema for whitelist and timeout settings:
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const configSchema = defineSchema({
  timeoutMinutes: 5,        // Default 5 minutes (range: 5-60)
  whitelistDomains: [],     // Domains never to suspend
  tabCountThreshold: 20,    // Auto-suspend when tabs exceed this
  enabled: true
});

export const config = createStorage(configSchema, 'sync');
export const suspendedTabs = createStorage(defineSchema({
  tabId: 'number',
  url: 'string',
  title: 'string',
  suspendedAt: 'number'
}), 'local');
```

## Step 3: Idle Detection {#step-3-idle-detection}
Monitor user idle state and trigger tab suspension:
```typescript
import { config, suspendedTabs } from './storage.js';

// Start idle detection with configurable interval
chrome.idle.setDetectionInterval(60); // Check every minute

chrome.idle.onStateChanged.addListener(async (state) => {
  const settings = await config.get('enabled');
  if (!settings.enabled) return;

  if (state === 'idle') {
    await suspendInactiveTabs();
  }
});

async function suspendInactiveTabs() {
  const settings = await config.getAll();
  const tabs = await chrome.tabs.query({ pinned: false, active: false });
  
  const whitelist = settings.whitelistDomains || [];
  const eligibleTabs = tabs.filter(tab => {
    const url = new URL(tab.url);
    return !whitelist.some(domain => url.hostname.includes(domain));
  });

  for (const tab of eligibleTabs) {
    try {
      await chrome.tabs.discard(tab.id);
      await saveSuspendedTab(tab);
    } catch (e) {
      // Tab may already be discarded or not discardable
    }
  }
}
```

## Step 4: Tab Count Threshold {#step-4-tab-count-threshold}
Auto-suspend when too many tabs are open:
```typescript
chrome.tabs.onCreated.addListener(async () => {
  const settings = await config.get('tabCountThreshold');
  const allTabs = await chrome.tabs.query({});
  
  if (allTabs.length > settings.tabCountThreshold) {
    await suspendInactiveTabs();
  }
});
```

## Step 5: Restore on Activation {#step-5-restore-on-activation}
Restore suspended tabs when users switch back:
```typescript
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  
  // If tab is discarded (has no title/URL yet), reload to restore
  if (tab.id && !tab.title) {
    await chrome.tabs.reload(tab.id);
  }
});
```

## Step 6: Badge Display {#step-6-badge-display}
Show suspended tab count in the extension badge:
```typescript
async function updateBadge() {
  const suspended = await suspendedTabs.getAll();
  const count = suspended.length;
  
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
}
```

## Step 7: Options Page {#step-7-options-page}
Create `options.html` for user configuration:
```html
<input type="number" id="timeout" min="5" max="60" value="5">
<input type="text" id="whitelist" placeholder="domain.com, example.org">
<input type="number" id="threshold" min="5" value="20">
```
```javascript
document.getElementById('timeout').value = await config.get('timeoutMinutes');
document.getElementById('whitelist').value = (await config.get('whitelistDomains')).join(', ');
document.getElementById('threshold').value = await config.get('tabCountThreshold');

saveBtn.addEventListener('click', async () => {
  await config.set('timeoutMinutes', Number(timeoutInput.value));
  await config.set('whitelistDomains', whitelistInput.value.split(',').map(s => s.trim()));
  await config.set('tabCountThreshold', Number(thresholdInput.value));
});
```

## Step 8: Time-Based Suspension {#step-8-time-based-suspension}
Use alarms for periodic suspension checks:
```typescript
chrome.alarms.create('checkIdle', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkIdle') {
    const state = await chrome.idle.queryState(60);
    if (state === 'idle') {
      await suspendInactiveTabs();
    }
  }
});
```

## Testing {#testing}
- Load unpacked from `chrome://extensions`
- Open 30+ tabs, wait for idle timeout
- Verify badge shows suspended count
- Click suspended tab to restore it
- Test whitelist functionality

## What You Learned {#what-you-learned}
- `chrome.tabs.discard()` to unload tabs without closing
- `chrome.idle` for inactivity detection
- Persisting configuration with `@theluckystrike/webext-storage`
- Badge updates for extension state
- Tab restoration via `chrome.tabs.onActivated`

## See Also {#see-also}
- Cross-ref: `docs/permissions/tabs.md`
- Cross-ref: `docs/patterns/tab-management.md`
- Cross-ref: `docs/guides/memory-management.md`
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
