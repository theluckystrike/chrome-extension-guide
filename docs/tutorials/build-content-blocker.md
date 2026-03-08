---
layout: default
title: "Chrome Extension Content Blocker — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-content-blocker/"
---
# Build a Content Blocker Extension — Full Tutorial

## What We're Building {#what-were-building}
- Productivity-focused site blocker
- Block distracting sites during work hours
- Uses `declarativeNetRequest` for efficient blocking, `@theluckystrike/webext-storage` for block list, `chrome.alarms` for scheduling

## manifest.json {#manifestjson}
```json
{
  "manifest_version": 3,
  "name": "Focus Blocker",
  "version": "1.0.0",
  "permissions": ["declarativeNetRequest", "storage", "alarms", "activeTab"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "declarative_net_request": {
    "rule_resources": [{ "id": "default_rules", "enabled": true, "path": "rules.json" }]
  },
  "web_accessible_resources": [{
    "resources": ["blocked.html"],
    "matches": ["<all_urls>"]
  }]
}
```

## Step 1: Static Rules (rules.json) {#step-1-static-rules-rulesjson}
- Default blocked sites (social media, news, etc.)
- Rule structure: id, priority, action (redirect to blocked page), condition (urlFilter)
- Redirect to extension's `blocked.html` page

## Step 2: Dynamic Rules for User-Added Sites {#step-2-dynamic-rules-for-user-added-sites}
```javascript
async function addBlockedSite(domain) {
  const ruleId = await getNextRuleId();
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [{
      id: ruleId,
      priority: 1,
      action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
      condition: { urlFilter: `||${domain}`, resourceTypes: ["main_frame"] }
    }]
  });
  // Save to storage
  const storage = createStorage(defineSchema({ blockedSites: 'string' }), 'sync');
  const sites = JSON.parse(await storage.get('blockedSites') || '[]');
  sites.push({ domain, ruleId });
  await storage.set('blockedSites', JSON.stringify(sites));
}
```

## Step 3: Blocked Page (blocked.html) {#step-3-blocked-page-blockedhtml}
- Friendly message: "This site is blocked during focus time"
- Show which domain was blocked
- "Take a break" timer option (5-minute bypass)
- "Back to work" button

## Step 4: Popup UI {#step-4-popup-ui}
- List of blocked sites with add/remove
- Schedule: set work hours (e.g., 9 AM - 5 PM)
- Quick toggle: enable/disable all blocking
- Badge showing "ON"/"OFF" status

## Step 5: Scheduling with chrome.alarms {#step-5-scheduling-with-chromealarms}
```javascript
// background.js
chrome.alarms.create("startBlocking", { when: getNextWorkStart() });
chrome.alarms.create("stopBlocking", { when: getNextWorkEnd() });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "startBlocking") enableBlocking();
  if (alarm.name === "stopBlocking") disableBlocking();
});
```

## Step 6: Enable/Disable Blocking {#step-6-enabledisable-blocking}
```javascript
async function enableBlocking() {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: ["default_rules"]
  });
  chrome.action.setBadgeText({ text: "ON" });
  chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
}

async function disableBlocking() {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    disableRulesetIds: ["default_rules"]
  });
  chrome.action.setBadgeText({ text: "" });
}
```

## Step 7: Storage with @theluckystrike/webext-storage {#step-7-storage-with-theluckystrikewebext-storage}
```typescript
const storage = createStorage(defineSchema({
  blockedSites: 'string',   // JSON array
  workStart: 'number',      // Hour (0-23)
  workEnd: 'number',        // Hour (0-23)
  isEnabled: 'boolean',
  totalBlockedToday: 'number'
}), 'sync');
```

## Testing {#testing}
- Add sites to block list, verify they redirect to blocked.html
- Test scheduling — set short intervals for testing
- Test toggle on/off
- Cross-ref: `docs/permissions/declarativeNetRequest.md`, `docs/mv3/declarative-net-request.md`
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
