---
layout: default
title: "Chrome Extension Tab Group Patterns — Best Practices"
description: "Organize tabs with the Tab Groups API."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/tab-group-patterns/"
---

# Tab Group Patterns

Chrome's Tab Groups API allows organizing tabs into visual groups, creating a workspace-like experience within the browser.

## Creating Groups {#creating-groups}

Use `chrome.tabs.group()` to create a group from tabs:

```javascript
// Create a group from specific tab IDs
const groupId = await chrome.tabs.group({ tabIds: [tab1Id, tab2Id, tab3Id] });

// Group properties
await chrome.tabGroups.update(groupId, {
  title: 'Project Alpha',
  color: 'blue',  // grey, blue, red, yellow, green, pink, purple, cyan
  collapsed: false
});
```

## Group Properties {#group-properties}

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Group title (displayed in header) |
| `color` | string | One of: grey, blue, red, yellow, green, pink, purple, cyan |
| `collapsed` | boolean | Whether group is collapsed to save space |

## Updating Groups {#updating-groups}

```javascript
// Change group title and color
chrome.tabGroups.update(groupId, { title: 'Research', color: 'purple' });

// Collapse/expand group
chrome.tabGroups.update(groupId, { collapsed: true });
```

## Moving Tabs Between Groups {#moving-tabs-between-groups}

```javascript
// Add tab to existing group
chrome.tabs.group({ groupId: targetGroupId, tabIds: [tabId] });

// Remove tab from group (moves to ungrouped)
chrome.tabs.ungroup([tabId]);
```

## Querying Groups {#querying-groups}

```javascript
// Get all groups in current window
const groups = await chrome.tabGroups.query({ windowId: windowId });

// Find specific group by title
const matching = await chrome.tabGroups.query({ title: 'Project X' });
```

## Events {#events}

```javascript
chrome.tabGroups.onCreated.addListener((group) => {
  console.log('Group created:', group.title);
});

chrome.tabGroups.onUpdated.addListener((group, changeInfo) => {
  console.log('Group updated:', group.title, changeInfo);
});

chrome.tabGroups.onRemoved.addListener((group) => {
  console.log('Group removed:', group.title);
});

chrome.tabGroups.onMoved.addListener((group, moveInfo) => {
  console.log('Group moved to index:', moveInfo.index);
});
```

## Auto-Grouping Patterns {#auto-grouping-patterns}

### Group by Domain {#group-by-domain}

```javascript
async function groupByDomain(windowId) {
  const tabs = await chrome.tabs.query({ windowId });
  const domains = {};
  
  for (const tab of tabs) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      if (!domains[domain]) domains[domain] = [];
      domains[domain].push(tab.id);
    } catch {}
  }
  
  for (const domain of Object.keys(domains)) {
    const group = await chrome.tabs.group({ tabIds: domains[domain] });
    await chrome.tabGroups.update(group, { title: domain, color: 'blue' });
  }
}
```

### Save/Restore Workspace {#saverestore-workspace}

```javascript
async function saveWorkspace(windowId) {
  const groups = await chrome.tabGroups.query({ windowId });
  const tabs = await chrome.tabs.query({ windowId });
  
  return { groups, tabs };
}

async function restoreWorkspace(windowId, workspace) {
  const tabIdMap = {};
  
  for (const tab of workspace.tabs) {
    const newTab = await chrome.tabs.create({
      url: tab.url,
      windowId,
      active: false
    });
    tabIdMap[tab.id] = newTab.id;
  }
  
  for (const group of workspace.groups) {
    const tabIds = group.tabIds.map(id => tabIdMap[id]).filter(Boolean);
    const newGroup = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(newGroup, {
      title: group.title,
      color: group.color,
      collapsed: group.collapsed
    });
  }
}
```

## Permissions {#permissions}

Add `"tabGroups"` to `manifest.json`:

```json
{
  "permissions": ["tabGroups"]
}
```

## Limitations {#limitations}

- Groups cannot span multiple windows
- Group colors are limited to 8 preset options
- Maximum number of groups varies by browser

## Cross-References {#cross-references}

- [Tabs API Reference](../api-reference/tabs-api.md)
- [Tab Management Patterns](tab-management.md)
- [TabGroups Permission](../permissions/tabGroups.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
