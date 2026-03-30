---
layout: default
title: "Working with Tab Groups in Chrome Extensions. Developer Guide"
description: "Learn how to use the Chrome Tab Groups API to create, organize, and manage tab groups programmatically. Covers group colors, titles, moving tabs, events, and productivity patterns."
canonical_url: "https://bestchromeextensions.com/tutorials/tab-groups-api-guide/"
last_modified_at: 2026-01-15
---

Working with Tab Groups in Chrome Extensions

Overview {#overview}

The Chrome Tab Groups API (`chrome.tabGroups`) is an essential tool for building productivity-focused browser extensions. Introduced in Chrome 88, this API enables extensions to programmatically create, organize, and manage tab groups, allowing users to visually organize their browser workspace into color-coded categories. Whether you're building a tab manager, a project-based organization tool, or a workflow automation extension, the Tab Groups API provides the foundation for helping users tame tab overload.

This guide covers the complete Tab Groups API: creating and managing groups, customizing group colors and titles, moving tabs between groups, collapsing and expanding groups, listening for group events, and implementing common productivity extension patterns.

Prerequisites {#prerequisites}

Before using the Tab Groups API, add the required permissions to your `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "My Tab Group Extension",
  "version": "1.0",
  "permissions": ["tabGroups", "tabs"]
}
```

The `tabGroups` permission is required for all group operations (create, read, update, delete). The `tabs` permission is needed for accessing tab URLs, titles, and for implementing grouping logic based on domain, project, or other criteria.

Browser Support:
- Chrome 88+: Core group methods (`chrome.tabGroups.*`)
- Chrome 89+: Group events (`onCreated`, `onUpdated`, `onRemoved`, `onMoved`)
- Chrome 114+: Move groups between windows (`chrome.tabGroups.move()`)

Understanding the TabGroup Object {#understanding-tabgroup-object}

The `TabGroup` object represents a group of tabs and contains these properties:

| Property | Type | Description |
|----------|------|-------------|
| `id` | number | Unique group identifier assigned by Chrome |
| `title` | string | Display name of the group (up to 50 characters) |
| `color` | string | Group color from a predefined palette |
| `collapsed` | boolean | Whether the group is currently collapsed |
| `windowId` | number | ID of the parent window containing this group |

Available Colors

Tab groups support nine predefined colors:

```ts
type TabGroupColor = 
  | 'grey'    // Gray
  | 'blue'    // Blue
  | 'red'     // Red
  | 'yellow'  // Yellow
  | 'green'   // Green
  | 'pink'    // Pink
  | 'purple'  // Purple
  | 'cyan'    // Cyan
  | 'orange'; // Orange
```

Creating Tab Groups {#creating-tab-groups}

Tab groups are created implicitly by grouping existing tabs using the `chrome.tabs.group()` method. This is the primary and only way to create new groups.

Basic Group Creation

```ts
// Group multiple tabs into a new group
const tabIds = [tab1.id, tab2.id, tab3.id];
const groupId = await chrome.tabs.group({ tabIds });

// The group is automatically created with default title and color
console.log(`Created group with ID: ${groupId}`);
```

Creating a Group with Custom Properties

```ts
// Group tabs and immediately set title and color
async function createProjectGroup(tabIds: number[], projectName: string, color: string) {
  const groupId = await chrome.tabs.group({ tabIds });
  
  await chrome.tabGroups.update(groupId, {
    title: projectName,
    color: color
  });
  
  return groupId;
}

// Usage
const developmentTabs = await chrome.tabs.query({ url: "*://localhost/*" });
await createProjectGroup(
  developmentTabs.map(t => t.id), 
  "Dev Environment", 
  "green"
);
```

Creating a Group from Active Tab Context

```ts
// Create a group from the currently active tab and related tabs
async function createGroupFromActive(relatedTabIds: number[]) {
  const [activeTab] = await chrome.tabs.query({ 
    active: true, 
    currentWindow: true 
  });
  
  if (!activeTab) return null;
  
  const allTabIds = [activeTab.id, ...relatedTabIds];
  const groupId = await chrome.tabs.group({ tabIds: allTabIds });
  
  await chrome.tabGroups.update(groupId, {
    title: "New Group",
    color: "blue"
  });
  
  return groupId;
}
```

Managing Groups {#managing-groups}

Updating Group Properties

```ts
// Update group title
await chrome.tabGroups.update(groupId, {
  title: "Updated Project Name"
});

// Update group color
await chrome.tabGroups.update(groupId, {
  color: "purple"
});

// Update both title and color
await chrome.tabGroups.update(groupId, {
  title: "Research",
  color: "cyan"
});
```

Getting Group Information

```ts
// Get a specific group by ID
const group = await chrome.tabGroups.get(groupId);
console.log(group.title, group.color, group.collapsed);

// Get all groups in the current window
async function getAllGroupsInWindow(windowId: number) {
  const tabs = await chrome.tabs.query({ windowId });
  
  // Extract unique group IDs from tabs
  const groupIds = [...new Set(
    tabs
      .filter(t => t.groupId !== -1)
      .map(t => t.groupId)
  )];
  
  const groups = await Promise.all(
    groupIds.map(id => chrome.tabGroups.get(id))
  );
  
  return groups;
}

// Usage
const windowId = (await chrome.windows.getCurrent()).id;
const groups = await getAllGroupsInWindow(windowId);
console.log(`Found ${groups.length} groups`);
```

Deleting Groups

```ts
// Delete a group (tabs remain in the window, just ungrouped)
await chrome.tabGroups.remove(groupId);

// Delete all groups in the current window
async function clearAllGroups() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const groupIds = [...new Set(tabs.map(t => t.groupId).filter(id => id !== -1))];
  
  for (const groupId of groupIds) {
    await chrome.tabGroups.remove(groupId);
  }
}
```

Moving Tabs Between Groups {#moving-tabs-between-groups}

Adding Tabs to a Group

```ts
// Add a single tab to an existing group
await chrome.tabs.group({ tabIds: [tabId], groupId: existingGroupId });

// Add multiple tabs to a group
const newTabIds = [tabId1, tabId2, tabId3];
await chrome.tabs.group({ tabIds: newTabIds, groupId: existingGroupId });
```

Removing Tabs from Groups

```ts
// Remove a tab from its group (becomes ungrouped)
await chrome.tabs.ungroup([tabId]);

// Remove multiple tabs from their groups
await chrome.tabs.ungroup([tabId1, tabId2, tabId3]);

// Move all tabs from one group to another
async function mergeGroups(sourceGroupId: number, targetGroupId: number) {
  const tabs = await chrome.tabs.query({});
  const sourceTabs = tabs.filter(t => t.groupId === sourceGroupId);
  
  // Add all tabs from source to target
  await chrome.tabs.group({
    tabIds: sourceTabs.map(t => t.id),
    groupId: targetGroupId
  });
  
  // Remove the empty source group
  await chrome.tabGroups.remove(sourceGroupId);
}
```

Moving Tabs Between Groups

```ts
// Move a tab from one group to another
async function moveTabToGroup(tabId: number, targetGroupId: number) {
  // First, ungroup the tab
  await chrome.tabs.ungroup([tabId]);
  
  // Then add it to the target group
  await chrome.tabs.group({ tabIds: [tabId], groupId: targetGroupId });
}

// Move a tab to a new group (creates new group automatically)
async function moveTabToNewGroup(tabId: number, groupTitle: string, color: string) {
  // Remove from current group first
  await chrome.tabs.ungroup([tabId]);
  
  // Create new group with the tab
  const groupId = await chrome.tabs.group({ tabIds: [tabId] });
  
  // Set properties
  await chrome.tabGroups.update(groupId, { title: groupTitle, color });
  
  return groupId;
}
```

Collapsing and Expanding Groups {#collapsing-expanding-groups}

Tab groups can be collapsed to hide all their tabs, providing a cleaner tab strip interface.

Collapsing Groups

```ts
// Collapse a group
await chrome.tabGroups.update(groupId, { collapsed: true });

// Collapse all groups in the window
async function collapseAllGroups() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const groupIds = [...new Set(tabs.map(t => t.groupId).filter(id => id !== -1))];
  
  for (const groupId of groupIds) {
    await chrome.tabGroups.update(groupId, { collapsed: true });
  }
}
```

Expanding Groups

```ts
// Expand a group
await chrome.tabGroups.update(groupId, { collapsed: false });

// Expand a specific group and collapse all others
async function expandOnlyGroup(targetGroupId: number) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const groupIds = [...new Set(tabs.map(t => t.groupId).filter(id => id !== -1))];
  
  for (const groupId of groupIds) {
    await chrome.tabGroups.update(groupId, { 
      collapsed: groupId !== targetGroupId 
    });
  }
}
```

Toggle Group Collapse State

```ts
// Toggle collapse state
async function toggleGroupCollapse(groupId: number) {
  const group = await chrome.tabGroups.get(groupId);
  await chrome.tabGroups.update(groupId, { 
    collapsed: !group.collapsed 
  });
}
```

Working with Group Events {#working-with-group-events}

The Tab Groups API provides events for monitoring group lifecycle changes.

Listening for Group Creation

```ts
// Listen for new group creation
chrome.tabGroups.onCreated.addListener((group) => {
  console.log(`Group created: ${group.title} (${group.color})`);
  
  // Could trigger UI updates, logging, etc.
});
```

Listening for Group Updates

```ts
// Listen for group property changes (title, color, collapse state)
chrome.tabGroups.onUpdated.addListener((group) => {
  console.log(`Group updated: ${group.title}`);
  console.log(`  Color: ${group.color}`);
  console.log(`  Collapsed: ${group.collapsed}`);
});
```

Listening for Group Removal

```ts
// Listen for group deletion
chrome.tabGroups.onRemoved.addListener((groupId) => {
  console.log(`Group removed: ${groupId}`);
  
  // Clean up any stored references
  groupMetadata.delete(groupId);
});
```

Listening for Tab-Group Associations

```ts
// When tabs are grouped or ungrouped
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.groupId !== undefined) {
    if (changeInfo.groupId === -1) {
      console.log(`Tab ${tabId} was ungrouped`);
    } else {
      console.log(`Tab ${tabId} was added to group ${changeInfo.groupId}`);
    }
  }
});
```

Organizing Tabs Programmatically {#organizing-tabs-programmatically}

Auto-Group by Domain

```ts
// Automatically group tabs by domain
async function groupTabsByDomain() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  // Group tabs by domain
  const domainGroups = new Map<string, number[]>();
  
  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://')) continue;
    
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain)!.push(tab.id);
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  // Create groups for each domain
  const colors: TabGroupColor[] = ['blue', 'green', 'red', 'yellow', 'purple', 'cyan', 'orange', 'pink', 'grey'];
  let colorIndex = 0;
  
  for (const [domain, tabIds] of domainGroups) {
    if (tabIds.length < 2) continue; // Skip single tabs
    
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, {
      title: domain,
      color: colors[colorIndex % colors.length]
    });
    
    colorIndex++;
  }
}
```

Group by Time-Based Organization

```ts
// Group tabs opened in the same session/time period
async function groupTabsByAge() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const oneDay = 24 * oneHour;
  
  const groups: { [key: string]: number[] } = {
    'Recent (last hour)': [],
    'Today': [],
    'Older': []
  };
  
  for (const tab of tabs) {
    if (!tab.id || tab.groupId !== -1) continue; // Skip already grouped
    
    // Note: There's no direct "opened time" in tab object
    // This is a simplified example - you'd need to track tab creation time
    // through storage or other means
    groups['Older'].push(tab.id);
  }
  
  // Create time-based groups
  for (const [label, tabIds] of Object.entries(groups)) {
    if (tabIds.length === 0) continue;
    
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, {
      title: label,
      color: label === 'Recent (last hour)' ? 'green' : 
             label === 'Today' ? 'blue' : 'grey'
    });
  }
}
```

Intelligent Tab Grouping

```ts
// Smart grouping based on URL patterns and content
interface GroupRule {
  name: string;
  color: TabGroupColor;
  patterns: string[];
}

const groupRules: GroupRule[] = [
  {
    name: "Social Media",
    color: "blue",
    patterns: ["*://*.twitter.com/*", "*://*.facebook.com/*", "*://*.reddit.com/*"]
  },
  {
    name: "Development",
    color: "green",
    patterns: ["*://*.github.com/*", "*://*.stackoverflow.com/*", "*://localhost/*"]
  },
  {
    name: "Documentation",
    color: "yellow",
    patterns: ["*://*.mdn.io/*", "*://*.docs.google.com/*"]
  }
];

async function applyIntelligentGrouping() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  for (const rule of groupRules) {
    const matchingTabs = [];
    
    for (const tab of tabs) {
      if (!tab.url || tab.groupId !== -1) continue;
      
      for (const pattern of rule.patterns) {
        if (await matchesUrl(tab.url, pattern)) {
          matchingTabs.push(tab.id);
          break;
        }
      }
    }
    
    if (matchingTabs.length > 0) {
      const groupId = await chrome.tabs.group({ tabIds: matchingTabs });
      await chrome.tabGroups.update(groupId, {
        title: rule.name,
        color: rule.color
      });
    }
  }
}

async function matchesUrl(url: string, pattern: string): Promise<boolean> {
  // Simple pattern matching - in production use chrome.matchPatterns
  if (pattern.includes('*://')) {
    const regex = new RegExp(pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '\\?')
    );
    return regex.test(url);
  }
  return false;
}
```

Productivity Extension Patterns {#productivity-extension-patterns}

Tab Group Manager UI

```ts
// Example: Managing tab groups from a popup UI

interface GroupData {
  id: number;
  title: string;
  color: string;
  collapsed: boolean;
  tabCount: number;
}

// Get all groups with tab counts
async function getAllGroups(): Promise<GroupData[]> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  const groupMap = new Map<number, GroupData>();
  
  for (const tab of tabs) {
    if (tab.groupId === -1) continue;
    
    if (!groupMap.has(tab.groupId)) {
      const group = await chrome.tabGroups.get(tab.groupId);
      groupMap.set(tab.groupId, {
        id: group.id,
        title: group.title,
        color: group.color,
        collapsed: group.collapsed,
        tabCount: 0
      });
    }
    groupMap.get(tab.groupId)!.tabCount++;
  }
  
  return Array.from(groupMap.values());
}

// Create new group from popup
async function createGroupFromPopup(title: string, color: string) {
  const [activeTab] = await chrome.tabs.query({ 
    active: true, 
    currentWindow: true 
  });
  
  if (!activeTab) return null;
  
  const groupId = await chrome.tabs.group({ tabIds: [activeTab.id] });
  await chrome.tabGroups.update(groupId, { title, color });
  
  return groupId;
}
```

Keyboard Shortcut Integration

```ts
// Example: Using commands API with tab groups

// manifest.json
/*
{
  "commands": {
    "group-selected-tabs": {
      "suggested_key": {
        "default": "Ctrl+Shift+G",
        "mac": "Command+Shift+G"
      },
      "description": "Group selected tabs"
    }
  }
}
*/

// background.ts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'group-selected-tabs') {
    const tabs = await chrome.tabs.query({ 
      currentWindow: true, 
      highlighted: true 
    });
    
    if (tabs.length > 1) {
      const groupId = await chrome.tabs.group({ 
        tabIds: tabs.map(t => t.id) 
      });
      await chrome.tabGroups.update(groupId, {
        title: 'Quick Group',
        color: 'blue'
      });
    }
  }
});
```

Saving and Restoring Group Layouts

```ts
// Save group layout to storage
async function saveGroupLayout(): Promise<string> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  const layout = {
    timestamp: Date.now(),
    groups: [] as any[]
  };
  
  // Group tabs by groupId
  const tabGroups = new Map<number, any[]>();
  for (const tab of tabs) {
    if (tab.groupId === -1) continue;
    if (!tabGroups.has(tab.groupId)) {
      tabGroups.set(tab.groupId, []);
    }
    tabGroups.get(tab.groupId)!.push({
      url: tab.url,
      title: tab.title,
      pinned: tab.pinned
    });
  }
  
  // Get group info
  for (const [groupId, groupTabs] of tabGroups) {
    const group = await chrome.tabGroups.get(groupId);
    layout.groups.push({
      title: group.title,
      color: group.color,
      collapsed: group.collapsed,
      tabs: groupTabs
    });
  }
  
  return JSON.stringify(layout);
}

// Restore group layout from storage
async function restoreGroupLayout(layoutJson: string) {
  const layout = JSON.parse(layoutJson);
  
  for (const groupData of layout.groups) {
    const tabIds: number[] = [];
    
    for (const tabData of groupData.tabs) {
      const newTab = await chrome.tabs.create({
        url: tabData.url,
        pinned: tabData.pinned,
        active: false
      });
      tabIds.push(newTab.id);
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
```

Context Menu Integration

```ts
// Add context menu for tab grouping

// Create context menu items
chrome.contextMenus.create({
  id: 'group-tabs',
  title: 'Group tabs from this domain',
  contexts: ['page', 'tab']
});

chrome.contextMenus.create({
  id: 'add-to-group',
  title: 'Add to group',
  contexts: ['page', 'tab'],
  // Dynamic menu items would be added based on existing groups
});

chrome.contextMenus.create({
  id: 'ungroup-tabs',
  title: 'Remove from group',
  contexts: ['page', 'tab']
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab) return;
  
  switch (info.menuItemId) {
    case 'group-tabs':
      // Group all tabs from the same domain
      const tabs = await chrome.tabs.query({ 
        currentWindow: true 
      });
      const domain = new URL(tab.url!).hostname;
      const domainTabs = tabs.filter(t => 
        t.url && new URL(t.url).hostname === domain
      );
      
      if (domainTabs.length > 1) {
        const groupId = await chrome.tabs.group({ 
          tabIds: domainTabs.map(t => t.id) 
        });
        await chrome.tabGroups.update(groupId, {
          title: domain,
          color: 'blue'
        });
      }
      break;
      
    case 'ungroup-tabs':
      await chrome.tabs.ungroup([tab.id]);
      break;
  }
});
```

Best Practices {#best-practices}

1. Always Check Group Existence

```ts
//  Bad: May fail if group doesn't exist
await chrome.tabGroups.update(groupId, { title: "New Title" });

//  Good: Verify group exists first
async function safeUpdateGroup(groupId: number, updates: any) {
  try {
    const group = await chrome.tabGroups.get(groupId);
    await chrome.tabGroups.update(groupId, updates);
  } catch (e) {
    console.error('Group not found:', groupId);
  }
}
```

2. Handle Tab IDs Carefully

```ts
//  Bad: Tab IDs can become invalid after closure
const tabId = tabs[0].id;
await chrome.tabs.group({ tabIds: [tabId] }); // May fail

//  Good: Validate tab IDs before use
const validTabIds = (await chrome.tabs.query({})).map(t => t.id);
const existingIds = tabIds.filter(id => validTabIds.includes(id));

if (existingIds.length > 0) {
  await chrome.tabs.group({ tabIds: existingIds });
}
```

3. Debounce Group Operations

```ts
// When auto-grouping, debounce to avoid excessive operations
let groupDebounceTimer: number;

async function debouncedAutoGroup() {
  clearTimeout(groupDebounceTimer);
  groupDebounceTimer = setTimeout(async () => {
    await groupTabsByDomain();
  }, 1000) as any;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    debouncedAutoGroup();
  }
});
```

4. Clean Up Event Listeners

```ts
// In service workers, be mindful of event listener lifecycle
let groupCreatedListener: ((group: any) => void) | null = null;

function setupGroupListeners() {
  if (groupCreatedListener) return;
  
  groupCreatedListener = (group) => {
    console.log('Group created:', group.title);
  };
  
  chrome.tabGroups.onCreated.addListener(groupCreatedListener);
}

function cleanupGroupListeners() {
  if (groupCreatedListener) {
    chrome.tabGroups.onCreated.removeListener(groupCreatedListener);
    groupCreatedListener = null;
  }
}
```

5. Consider User Experience

```ts
//  Bad: Automatically reorganizing user's tabs without indication
async function autoGroupAll() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  // ... group everything immediately
}

//  Good: Provide user feedback and controls
async function smartGroupWithFeedback() {
  // Show notification that grouping is happening
  chrome.runtime.sendMessage({
    type: 'GROUPING_STARTED',
    message: 'Organizing your tabs...'
  });
  
  // Perform grouping
  await groupTabsByDomain();
  
  // Notify completion
  chrome.runtime.sendMessage({
    type: 'GROUPING_COMPLETE',
    message: 'Tabs organized by domain'
  });
}
```

API Reference Summary {#api-reference-summary}

Methods

| Method | Description |
|--------|-------------|
| `chrome.tabGroups.get(groupId)` | Get group details by ID |
| `chrome.tabGroups.update(groupId, properties)` | Update group title, color, or collapse state |
| `chrome.tabGroups.remove(groupId)` | Delete a group (tabs remain) |
| `chrome.tabs.group(options)` | Create a group from tabs |
| `chrome.tabs.ungroup(tabIds)` | Remove tabs from their groups |

Properties

| Property | Type | Description |
|----------|------|-------------|
| `group.id` | number | Unique group identifier |
| `group.title` | string | Display name (max 50 chars) |
| `group.color` | string | Group color |
| `group.collapsed` | boolean | Collapse state |
| `group.windowId` | number | Parent window ID |

Events

| Event | Description |
|-------|-------------|
| `chrome.tabGroups.onCreated` | New group created |
| `chrome.tabGroups.onUpdated` | Group properties changed |
| `chrome.tabGroups.onRemoved` | Group deleted |
| `chrome.tabs.onUpdated` | Fires with `groupId` property when tab's group changes |

Related Articles {#related-articles}

- [Tabs API Guide](tabs-api-guide.md). Complete reference for the Chrome Tabs API, including tab querying, creation, and manipulation
- [Tab Management Guide](tab-management.md). Best practices for building tab management extensions and handling tab lifecycle
- [Bookmarks API Guide](bookmarks-api-guide.md). Learn how to combine tab groups with bookmarks for comprehensive workspace organization

---

*Part of the [Chrome Extension Guide](https://github.com/theluckystrike/chrome-extension-guide) by [theluckystrike](https://github.com/theluckystrike). Built at [zovo.one](https://zovo.one).*
