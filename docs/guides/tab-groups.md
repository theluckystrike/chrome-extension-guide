---
layout: default
title: "Chrome Extension Tab Groups API. How to Organize and Manage Tab Groups"
description: "A comprehensive guide to using the Chrome Tab Groups API in extensions. Learn to create, organize, and manage tab groups with colors, titles, moving tabs between groups, and collapsing functionality."
canonical_url: "https://bestchromeextensions.com/guides/tab-groups/"
---

# Chrome Extension Tab Groups API. How to Organize and Manage Tab Groups

The Chrome Tab Groups API (`chrome.tabGroups`) is a powerful extension API that enables Chrome extensions to programmatically organize, manage, and manipulate tab groups. Tab groups help users categorize and manage their browser workspace efficiently, making it easier to handle numerous open tabs. This guide covers everything you need to build solid tab group management features into your extension.

Prerequisites and Permissions

Before using the Tab Groups API, you need to declare the appropriate permissions in your `manifest.json`:

```json
{
  "permissions": ["tabGroups", "tabs"]
}
```

The `tabGroups` permission is required for creating, reading, updating, and deleting tab groups. The `tabs` permission is necessary for accessing tab URLs and titles, which are essential when implementing domain-based or project-based grouping logic. Both permissions are available in Manifest V3 and later versions.

The Tab Groups API is available in Chrome 88+ for basic methods, Chrome 89+ for events, and Chrome 114+ for the move functionality. Keep these version requirements in mind when building features that depend on specific API methods.

Understanding the TabGroup Object

When working with the Tab Groups API, you'll encounter `TabGroup` objects that contain several key properties:

- `id` (number): Unique group identifier assigned by Chrome
- `title` (string): Display name of the group (up to 50 characters)
- `color` (string): Group color from a predefined palette
- `collapsed` (boolean): Whether the group is currently collapsed
- `windowId` (number): ID of the parent window containing this group

The available colors are: grey, blue, red, yellow, green, pink, purple, cyan, and orange. Each color can be used to visually categorize groups by type, priority, or any custom criteria that fits your extension's use case.

Core API Methods

Creating Tab Groups

Tab groups are created implicitly when you add tabs to a group using the `chrome.tabs.group()` method. This is the primary way to create new groups:

```javascript
// Group multiple tabs together into a new group
const tabIds = [tab1.id, tab2.id, tab3.id];
const groupId = await chrome.tabs.group({ tabIds });

// Set group properties after creation
await chrome.tabGroups.update(groupId, {
  title: "Project Alpha",
  color: "blue"
});

// Add a single tab to an existing group
const newGroupId = await chrome.tabs.group({
  groupId: existingGroupId,
  tabIds: [newTab.id]
});

// Create a group from tabs matching a URL pattern
const tabs = await chrome.tabs.query({ url: "https://github.com/*" });
const githubGroupId = await chrome.tabs.group({
  tabIds: tabs.map(t => t.id)
});
```

The `chrome.tabs.group()` method returns the group ID, which you can then use with `chrome.tabGroups.update()` to set the title and color. This two-step process (create group, then customize) is the standard pattern for programmatic group creation.

Reading Tab Groups

Retrieve group information using `chrome.tabGroups.get()` and `chrome.tabGroups.query()`:

```javascript
// Get a single group by ID
async function getTabGroup(groupId) {
  try {
    const group = await chrome.tabGroups.get(groupId);
    console.log(`Group: ${group.title}, Color: ${group.color}`);
    return group;
  } catch (error) {
    console.error("Group not found:", error);
  }
}

// Query all groups in the current window
const groupsInWindow = await chrome.tabGroups.query({
  windowId: chrome.windows.WINDOW_ID_CURRENT
});

// Query all groups across all windows
const allGroups = await chrome.tabGroups.query({});

// Filter groups by color
const redGroups = await chrome.tabGroups.query({ color: "red" });

// Filter groups by title pattern
chrome.tabGroups.query({}, (groups) => {
  const projectGroups = groups.filter(g => 
    g.title?.toLowerCase().includes("project")
  );
});
```

The `query()` method is particularly useful for building extension UIs that display all groups or allow filtering by color or other properties.

Updating Tab Groups

Modify group properties using `chrome.tabGroups.update()`:

```javascript
async function updateGroup(groupId, updates) {
  const validColors = [
    "grey", "blue", "red", "yellow", 
    "green", "pink", "purple", "cyan", "orange"
  ];
  
  // Validate color
  if (updates.color && !validColors.includes(updates.color)) {
    throw new Error(`Invalid color: ${updates.color}`);
  }
  
  await chrome.tabGroups.update(groupId, {
    title: updates.title,        // New title (string)
    color: updates.color,        // Group color
    collapsed: updates.collapsed // true to collapse, false to expand
  });
}

// Usage examples
await updateGroup(groupId, { title: "Project Alpha" });
await updateGroup(groupId, { color: "blue", collapsed: true });
await updateGroup(groupId, { title: "Urgent", color: "red", collapsed: false });
```

The update method allows you to change the title, color, and collapsed state of any group. These changes are reflected immediately in the browser's tab strip.

Moving Tab Groups

The `chrome.tabGroups.move()` method allows you to reorganize groups by moving them between windows or reordering them within the same window:

```javascript
// Move group to another window
async function moveGroupToWindow(groupId, targetWindowId) {
  await chrome.tabGroups.move(groupId, {
    windowId: targetWindowId,
    index: -1 // -1 for end of group list
  });
}

// Reorder groups within the same window
async function reorderGroups(groupIds) {
  for (let i = 0; i < groupIds.length; i++) {
    await chrome.tabGroups.move(groupIds[i], {
      windowId: chrome.windows.WINDOW_ID_CURRENT,
      index: i
    });
  }
}

// Get target window first
const windows = await chrome.windows.getAll();
const targetWindow = windows.find(w => w.id !== currentWindowId);
await chrome.tabGroups.move(groupId, { windowId: targetWindow.id, index: 0 });
```

The move API was added in Chrome 114, so ensure your extension accounts for this when supporting older Chrome versions.

Collapsing and Expanding Groups

Collapsing groups is a key feature for managing screen real estate:

```javascript
// Collapse a group
await chrome.tabGroups.update(groupId, { collapsed: true });

// Expand a group
await chrome.tabGroups.update(groupId, { collapsed: false });

// Toggle group collapse state
async function toggleGroupCollapse(groupId) {
  const group = await chrome.tabGroups.get(groupId);
  await chrome.tabGroups.update(groupId, { collapsed: !group.collapsed });
}
```

When a group is collapsed, only the group title bar remains visible, hiding all the tabs within it. This is particularly useful for users who want to focus on specific groups while keeping others accessible but out of the way.

Removing Tabs from Groups

When you need to remove tabs from a group (but keep the tab open), use `chrome.tabs.ungroup()`:

```javascript
// Remove single tab from group (becomes ungrouped)
await chrome.tabs.ungroup(tabId);

// Remove multiple tabs from their groups
await chrome.tabs.ungroup([tabId1, tabId2, tabId3]);

// Ungroup all tabs in a group
const tabs = await chrome.tabs.query({ groupId: groupId });
await chrome.tabs.ungroup(tabs.map(t => t.id));
```

Note that calling `ungroup()` doesn't close the tabs, it simply removes them from the group, leaving them as individual ungrouped tabs.

Event Listeners

The Tab Groups API provides events for monitoring group changes:

```javascript
// Group creation events
chrome.tabGroups.onCreated.addListener((group) => {
  console.log(`Group created: ${group.title} (${group.color})`);
  
  // Send notification to popup
  chrome.runtime.sendMessage({
    type: "GROUP_CREATED",
    group: group
  });
});

// Group property changes
chrome.tabGroups.onUpdated.addListener((groupId, changeInfo, group) => {
  console.log(`Group ${groupId} updated:`, changeInfo);
  
  // changeInfo contains: { title?, color?, collapsed? }
  if (changeInfo.title) {
    console.log(`Title changed to: ${changeInfo.title}`);
  }
  if (changeInfo.color) {
    console.log(`Color changed to: ${changeInfo.color}`);
  }
  if (changeInfo.collapsed !== undefined) {
    console.log(`Collapsed: ${changeInfo.collapsed}`);
  }
});

// Group deletion events
chrome.tabGroups.onRemoved.addListener((groupId, removeInfo) => {
  console.log(`Group ${groupId} removed`);
  
  // removeInfo contains: { windowId, isUngrouping }
  // isUngrouping is true if tabs were manually ungrouped
});

// Group reorder events
chrome.tabGroups.onMoved.addListener((groupId, moveInfo) => {
  console.log(`Group ${groupId} moved:`, moveInfo);
  
  // moveInfo contains: { windowId, fromIndex, toIndex }
  console.log(`Moved from index ${moveInfo.fromIndex} to ${moveInfo.toIndex}`);
});
```

These events enable your extension to react to user actions in real-time, which is essential for maintaining synchronized state between your extension's UI and the browser's tab groups.

Color Options Reference

| Color  | Value    | Use Case                        |
|--------|----------|----------------------------------|
| grey   | "grey"   | General/uncategorized           |
| blue   | "blue"   | Work/business                   |
| red    | "red"    | Urgent/important                |
| yellow | "yellow" | In-progress/review              |
| green  | "green"  | Completed/done                  |
| pink   | "pink"   | Personal                        |
| purple | "purple" | Development/technical           |
| cyan   | "cyan"   | Research/learning               |
| orange | "orange" | Finance/shopping                |

Practical Example: Auto-Grouping by Domain

Here's a complete example of a tab organizer that automatically groups new tabs by domain:

```javascript
class TabOrganizer {
  constructor() {
    this.setupListeners();
  }
  
  setupListeners() {
    // Auto-group new tabs by domain
    chrome.tabs.onCreated.addListener(async (tab) => {
      if (tab.url && !tab.groupId || tab.groupId === -1) {
        await this.autoGroupTab(tab);
      }
    });
    
    // Listen for group events
    chrome.tabGroups.onCreated.addListener((g) => this.onGroupCreated(g));
    chrome.tabGroups.onUpdated.addListener((id, info, g) => this.onGroupUpdated(id, info, g));
  }
  
  async autoGroupTab(tab) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname.replace("www.", "");
      
      // Find existing group for this domain
      const groups = await chrome.tabGroups.query({});
      const existingGroup = groups.find(g => g.title === domain);
      
      if (existingGroup) {
        // Add to existing group
        await chrome.tabs.group({
          groupId: existingGroup.id,
          tabIds: [tab.id]
        });
      } else {
        // Create new group
        const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
        
        // Color based on category
        const color = this.getColorForDomain(domain);
        await chrome.tabGroups.update(groupId, {
          title: domain,
          color: color
        });
      }
    } catch (error) {
      // Handle about:blank, chrome://, etc.
    }
  }
  
  getColorForDomain(domain) {
    const colorMap = {
      "github.com": "purple",
      "stackoverflow.com": "orange",
      "youtube.com": "red",
      "reddit.com": "cyan"
    };
    return colorMap[domain] || "grey";
  }
  
  onGroupCreated(group) {
    console.log(`Auto-created group: ${group.title}`);
  }
  
  onGroupUpdated(id, info, group) {
    console.log(`Group ${id} updated:`, info);
  }
}
```

This implementation automatically organizes new tabs into groups based on their domain, making it easy for users to keep related sites together without manual intervention.

Session Persistence

Many extensions benefit from saving and restoring tab group sessions:

```javascript
// Save current groups to storage
async function saveSession() {
  const groups = await chrome.tabGroups.query({});
  const savedGroups = [];
  
  for (const group of groups) {
    const tabs = await chrome.tabs.query({ groupId: group.id });
    savedGroups.push({
      title: group.title,
      color: group.color,
      collapsed: group.collapsed,
      tabs: tabs.map(t => ({ url: t.url, title: t.title }))
    });
  }
  
  await chrome.storage.local.set({ savedGroups });
  console.log(`Saved ${savedGroups.length} groups`);
}

// Restore groups from storage
async function restoreSession() {
  const { savedGroups } = await chrome.storage.local.get("savedGroups");
  if (!savedGroups) return;
  
  for (const groupData of savedGroups) {
    const tabIds = [];
    
    for (const tabData of groupData.tabs) {
      try {
        const tab = await chrome.tabs.create({
          url: tabData.url,
          active: false
        });
        tabIds.push(tab.id);
      } catch (e) {
        // Skip invalid URLs
      }
    }
    
    if (tabIds.length > 0) {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, {
        title: groupData.title,
        color: groupData.color,
        collapsed: groupData.collapsed
      });
    }
  }
}

// Auto-save on interval
setInterval(saveSession, 60000); // Every minute
```

This pattern enables users to preserve their workspace across browser restarts or transfer their setup to another machine.

Browser Compatibility Notes

The Tab Groups API has evolved over several Chrome releases:

- Chrome 88: Basic API methods (get, query, update, create via tabs.group)
- Chrome 89: Event listeners (onCreated, onUpdated, onRemoved, onMoved)
- Chrome 114: Move API for relocating groups between windows

For extensions targeting a broader audience, consider using feature detection or providing fallback functionality for older Chrome versions.

Reference

- [Official Tab Groups API Documentation](https://developer.chrome.com/docs/extensions/reference/api/tabGroups)
- [Tab Groups API Chrome Status](https://chromestatus.com/feature/5740067858804736)
- Requires Manifest V3+
