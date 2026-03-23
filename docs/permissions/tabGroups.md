---
layout: default
title: "tabGroups Permission"
description: "The permission grants extensions access to the API, which enables programmatic management of tab groups in Google Chrome. Tab groups allow users to organize ..."
permalink: /permissions/tabGroups/
category: permissions
order: 42
canonical_url: "https://bestchromeextensions.com/permissions/tabGroups/"
---

# tabGroups Permission

## Overview {#overview}

The `tabGroups` permission grants extensions access to the `chrome.tabGroups` API, which enables programmatic management of tab groups in Google Chrome. Tab groups allow users to organize their tabs into named, color-coded collections that can be collapsed, expanded, and rearranged.

### Permission String {#permission-string}

```json
"permissions": ["tabGroups"]
```

### What It Grants {#what-it-grants}

- Full access to `chrome.tabGroups` API
- Ability to query, create, update, and move tab groups
- Access to tab group events for real-time updates
- Does NOT automatically grant access to individual tab properties

### Manifest Requirements {#manifest-requirements}

```json
{
  "manifest_version": 3,
  "permissions": ["tabGroups"]
}
```

The `tabGroups` permission is often used together with the `"tabs"` permission, which is required for operations like creating groups from tabs (`chrome.tabs.group()`).

---

## API Methods {#api-methods}

The `chrome.tabGroups` API provides the following methods for interacting with tab groups:

### `chrome.tabGroups.get(groupId)` {#chrometabgroupsgetgroupid}

Retrieves details about a specific tab group.

```javascript
chrome.tabGroups.get(groupId, (group) => {
  console.log(`Group: ${group.title}, Color: ${group.color}`);
});
```

**Parameters:**
- `groupId` (integer): The ID of the tab group to retrieve.

**Returns:** A `TabGroup` object containing the group's properties.

---

### `chrome.tabGroups.query(queryInfo)` {#chrometabgroupsqueryqueryinfo}

Queries tab groups based on specified properties.

```javascript
// Get all groups in the current window
chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT }, 
  (groups) => {
    groups.forEach(group => console.log(group.title));
  });
```

**queryInfo properties:**
- `collapsed` (boolean): Whether the group is collapsed.
- `color` (string): The color of the group.
- `title` (string): The title of the group (partial match).
- `windowId` (integer): The ID of the window to query.

---

### `chrome.tabGroups.update(groupId, updateProperties)` {#chrometabgroupsupdategroupid-updateproperties}

Updates the properties of a tab group.

```javascript
chrome.tabGroups.update(groupId, {
  title: "Project Alpha",
  color: "blue",
  collapsed: false
});
```

**updateProperties:**
- `collapsed` (boolean): Whether the group should be collapsed.
- `color` (string): The new color for the group.
- `title` (string): The new title for the group.

---

### `chrome.tabGroups.move(groupId, moveProperties)` {#chrometabgroupsmovegroupid-moveproperties}

Moves a tab group to a new position or window.

```javascript
chrome.tabGroups.move(groupId, {
  index: 0,  // Position in the tab strip (0 = first)
  windowId: targetWindowId
});
```

**moveProperties:**
- `index` (integer): The new index position in the tab strip.
- `windowId` (integer): The ID of the target window (optional).

---

## Tab Group Colors {#tab-group-colors}

Tab groups support eight distinct colors for visual organization:

| Color Value | Visual Description |
|-------------|-------------------|
| `grey`      | Gray neutral      |
| `blue`      | Blue professional |
| `red`       | Red alert         |
| `yellow`    | Yellow warning    |
| `green`     | Green success     |
| `pink`      | Pink accent       |
| `purple`    | Purple creative   |
| `cyan`      | Cyan highlight    |

### Color Type Definition {#color-type-definition}

```typescript
type Color = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan';
```

### Setting Color When Creating a Group {#setting-color-when-creating-a-group}

```javascript
chrome.tabs.group({ tabIds: [tab1.id, tab2.id] }, (groupId) => {
  chrome.tabGroups.update(groupId, { color: 'blue' });
});
```

---

## Events {#events}

The `chrome.tabGroups` API provides four events for monitoring group changes:

### `chrome.tabGroups.onCreated` {#chrometabgroupsoncreated}

Fires when a new tab group is created.

```javascript
chrome.tabGroups.onCreated.addListener((group) => {
  console.log(`Group created: ${group.title}`);
});
```

---

### `chrome.tabGroups.onUpdated` {#chrometabgroupsonupdated}

Fires when group properties (title, color, collapsed state) change.

```javascript
chrome.tabGroups.onUpdated.addListener((group) => {
  console.log(`Group updated: ${group.title}, color: ${group.color}`);
});
```

---

### `chrome.tabGroups.onRemoved` {#chrometabgroupsonremoved}

Fires when a tab group is closed (ungrouped).

```javascript
chrome.tabGroups.onRemoved.addListener((group) => {
  console.log(`Group removed: ${group.title}`);
});
```

---

### `chrome.tabGroups.onMoved` {#chrometabgroupsonmoved}

Fires when a group is moved between windows or positions.

```javascript
chrome.tabGroups.onMoved.addListener((group) => {
  console.log(`Group moved to index: ${group.index}`);
});
```

---

## Creating Tab Groups {#creating-tab-groups}

Creating tab groups requires the `"tabs"` permission in addition to `"tabGroups"`. The process involves:

1. **Grouping tabs** using `chrome.tabs.group()`
2. **Updating the group** with title and color using `chrome.tabGroups.update()`

### Basic Creation {#basic-creation}

```javascript
async function createTabGroup(tabIds, title, color) {
  // Group the tabs
  const groupId = await chrome.tabs.group({ tabIds });
  
  // Update with title and color
  await chrome.tabGroups.update(groupId, { title, color });
  
  return groupId;
}

// Usage
createTabGroup([tab1.id, tab2.id], "Research", "purple");
```

### Removing from Groups {#removing-from-groups}

To remove tabs from a group (ungroup):

```javascript
chrome.tabs.ungroup(tabIds, () => {
  console.log("Tabs removed from group");
});
```

---

## Use Cases {#use-cases}

### Workspace Organization {#workspace-organization}

Group tabs by project or task for a clutter-free browsing experience:

```javascript
// Group all tabs with "project" in the title
chrome.tabs.query({ title: "*project*" }, (tabs) => {
  const tabIds = tabs.map(t => t.id);
  chrome.tabs.group({ tabIds }, (groupId) => {
    chrome.tabGroups.update(groupId, { 
      title: "Project Tabs",
      color: "blue"
    });
  });
});
```

### Auto-Categorization {#auto-categorization}

Automatically group tabs by domain:

```javascript
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!tab.url.startsWith('http')) return;
  
  const url = new URL(tab.url);
  const domain = url.hostname;
  
  const groups = await chrome.tabGroups.query({ title: domain });
  
  if (groups.length > 0) {
    await chrome.tabs.group({ tabIds: [tab.id], groupId: groups[0].id });
  } else {
    const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
    await chrome.tabGroups.update(groupId, { 
      title: domain,
      color: getColorForDomain(domain)
    });
  }
});
```

### Session Management {#session-management}

Save and restore tab group state:

```javascript
// Save group state
async function saveGroupState() {
  const groups = await chrome.tabGroups.query({});
  const state = groups.map(g => ({
    title: g.title,
    color: g.color,
    tabs: await chrome.tabs.query({ groupId: g.id })
  }));
  return state;
}

// Restore group state (using @theluckystrike/webext-storage)
async function restoreGroupState(state) {
  for (const group of state) {
    const tabIds = group.tabs.map(t => t.id);
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, {
      title: group.title,
      color: group.color
    });
  }
}
```

### Tab Decluttering {#tab-decluttering}

Collapse inactive groups to reduce visual clutter:

```javascript
// Collapse all groups except the active one
chrome.tabGroups.onUpdated.addListener(async (group) => {
  if (group.collapsed) return;
  
  const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeGroup = await chrome.tabGroups.query({
    windowId: chrome.windows.WINDOW_ID_CURRENT
  });
  
  activeGroup.forEach(g => {
    if (g.id !== activeTab[0].groupId) {
      chrome.tabGroups.update(g.id, { collapsed: true });
    }
  });
});
```

---

## Manifest Declaration {#manifest-declaration}

```json
{
  "name": "Tab Group Manager",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": [
    "tabs",
    "tabGroups"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### Manifest V2 Compatibility {#manifest-v2-compatibility}

For Manifest V2 extensions:

```json
{
  "name": "Tab Group Manager",
  "version": "1.0.0",
  "manifest_version": 2,
  "permissions": [
    "tabs",
    "tabGroups"
  ]
}
```

---

## Cross-References {#cross-references}

- [tabs Permission](./tabs.md) - Required for creating groups
- [guides/tab-management.md](../guides/tab-management.md) - General tab management
- [patterns/tab-management.md](../patterns/tab-management.md) - Tab management patterns
- [chrome.tabGroups API](https://developer.chrome.com/docs/extensions/reference/tabGroups/) - Official Chrome documentation

---

## Related Extensions {#related-extensions}

For persistent storage of tab group configurations, consider using:
- **@theluckystrike/webext-storage**: Save and restore tab group states across sessions

## Frequently Asked Questions

### How do I organize tabs into groups?
Use chrome.tabGroups API to create, update, and delete tab groups. Users can also manually organize tabs into color-coded groups.

### Are tab groups available on all platforms?
Tab groups are available on Chrome desktop (Windows, Mac, Linux) and ChromeOS.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
