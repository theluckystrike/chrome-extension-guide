# Chrome Tab Groups API Guide

## Introduction

The Chrome Tab Groups API (`chrome.tabGroups`) enables extension developers to organize, manage, and manipulate tab groups programmatically. Tab groups help users categorize and manage their browser workspace efficiently.

## Required Permissions

Add the `tabGroups` permission to your manifest:

```json
{
  "permissions": ["tabGroups", "tabs"]
}
```

The `tabs` permission is required for accessing tab URLs and titles, which are essential for domain-based grouping.

---

## Core API Methods

### chrome.tabGroups.get — Getting a Group by ID

Retrieve a single tab group by its ID:

```javascript
async function getTabGroup(groupId) {
  try {
    const group = await chrome.tabGroups.get(groupId);
    console.log(`Group: ${group.title}, Color: ${group.color}`);
    return group;
  } catch (error) {
    console.error("Group not found:", error);
  }
}
```

Returns a `TabGroup` object containing:
- `id`: Unique group identifier
- `title`: Display name
- `color`: Group color (grey, blue, red, yellow, green, pink, purple, cyan, orange)
- `collapsed`: Whether the group is collapsed
- `windowId`: Parent window ID

---

### chrome.tabGroups.query — Finding Groups with Filters

Query all groups in a window or across all windows:

```javascript
// All groups in current window
const groupsInWindow = await chrome.tabGroups.query({
  windowId: chrome.windows.WINDOW_ID_CURRENT
});

// All groups across all windows
const allGroups = await chrome.tabGroups.query({});

// Filter by color
const redGroups = await chrome.tabGroups.query({ color: "red" });

// Filter by title pattern (using callback)
chrome.tabGroups.query({}, (groups) => {
  const projectGroups = groups.filter(g => 
    g.title?.toLowerCase().includes("project")
  );
});
```

---

### chrome.tabGroups.update — Modifying Group Properties

Update a group's title, color, and collapsed state:

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
    collapsed: updates.collapsed // true/false
  });
}

// Usage examples
await updateGroup(groupId, { title: "Project Alpha" });
await updateGroup(groupId, { color: "blue", collapsed: true });
```

---

### chrome.tabGroups.move — Moving Groups Between Windows

Move a group to a different window or reorder within the same window:

```javascript
// Move group to another window
async function moveGroupToWindow(groupId, targetWindowId) {
  await chrome.tabGroups.move(groupId, {
    windowId: targetWindowId,
    index: -1 // -1 for end of group list
  });
}

// Reorder groups in same window
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

---

## Event Listeners

### chrome.tabGroups.onCreated — Group Creation Events

```javascript
chrome.tabGroups.onCreated.addListener((group) => {
  console.log(`Group created: ${group.title} (${group.color})`);
  
  // Send notification to popup
  chrome.runtime.sendMessage({
    type: "GROUP_CREATED",
    group: group
  });
});
```

---

### chrome.tabGroups.onUpdated — Group Property Changes

```javascript
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
```

---

### chrome.tabGroups.onRemoved — Group Deletion Events

```javascript
chrome.tabGroups.onRemoved.addListener((groupId, removeInfo) => {
  console.log(`Group ${groupId} removed`);
  console.log("Remove info:", removeInfo);
  
  // removeInfo contains: { windowId, isUngrouping }
  // isUngrouping is true if tabs were manually ungrouped
});
```

---

### chrome.tabGroups.onMoved — Group Reorder Events

```javascript
chrome.tabGroups.onMoved.addListener((groupId, moveInfo) => {
  console.log(`Group ${groupId} moved:`, moveInfo);
  
  // moveInfo contains: { windowId, fromIndex, toIndex }
  console.log(`Moved from index ${moveInfo.fromIndex} to ${moveInfo.toIndex}`);
});
```

---

## Tab-Group Association

### chrome.tabs.group — Adding Tabs to Groups

```javascript
// Group multiple tabs together
const tabIds = [tab1.id, tab2.id, tab3.id];
const groupId = await chrome.tabs.group({ tabIds });

// Add a single tab to an existing group
const newGroupId = await chrome.tabs.group({
  groupId: existingGroupId,
  tabIds: [newTab.id]
});

// Add tabs matching a pattern
const tabs = await chrome.tabs.query({ url: "https://github.com/*" });
const githubGroupId = await chrome.tabs.group({
  tabIds: tabs.map(t => t.id)
});
```

---

### chrome.tabs.ungroup — Removing Tabs from Groups

```javascript
// Remove single tab from group (becomes ungrouped)
await chrome.tabs.ungroup(tabId);

// Remove multiple tabs from their groups
await chrome.tabs.ungroup([tabId1, tabId2, tabId3]);

// Ungroup all tabs in a group
const tabs = await chrome.tabs.query({ groupId: groupId });
await chrome.tabs.ungroup(tabs.map(t => t.id));
```

---

## Color Options Reference

| Color    | Value      | Use Case                        |
|----------|------------|----------------------------------|
| grey     | "grey"     | General/uncategorized           |
| blue     | "blue"     | Work/business                   |
| red      | "red"      | Urgent/important                |
| yellow   | "yellow"   | In-progress/review              |
| green    | "green"    | Completed/done                  |
| pink     | "pink"     | Personal                        |
| purple   | "purple"   | Development/technical           |
| cyan     | "cyan"     | Research/learning               |
| orange   | "orange"   | Finance/shopping                |

---

## Practical Examples

### Building a Tab Organizer with Auto-Grouping

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
}
```

---

### Grouping by Project

```javascript
// Organize tabs by project name in the URL or title
async function groupByProject() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  
  const projectMap = new Map();
  
  for (const tab of tabs) {
    // Extract project from URL or title
    const project = extractProjectName(tab.url, tab.title);
    if (!project) continue;
    
    if (!projectMap.has(project)) {
      projectMap.set(project, []);
    }
    projectMap.get(project).push(tab.id);
  }
  
  // Create groups
  const colors = ["blue", "green", "purple", "orange", "cyan"];
  let colorIndex = 0;
  
  for (const [project, tabIds] of projectMap) {
    if (tabIds.length < 2) continue; // Skip single tabs
    
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, {
      title: project,
      color: colors[colorIndex % colors.length]
    });
    colorIndex++;
  }
}

function extractProjectName(url, title) {
  // Custom logic: extract project from JIRA, GitHub, etc.
  const jiraMatch = url.match(/jira\.com\/b\/([A-Z]+-\d+)/);
  if (jiraMatch) return jiraMatch[1];
  
  const githubMatch = url.match(/github\.com\/[^/]+\/([^/]+)/);
  if (githubMatch) return githubMatch[1];
  
  return null;
}
```

---

### Saving and Restoring Tab Group Sessions

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

---

## Reference

Official documentation: [developer.chrome.com/docs/extensions/reference/api/tabGroups](https://developer.chrome.com/docs/extensions/reference/api/tabGroups)

Additional resources:
- [Tab Groups API Chrome Status](https://chromestatus.com/feature/5740067858804736)
- Requires Manifest V3+
- Available in Chrome 88+ (methods), Chrome 89+ (events), Chrome 114+ (move API)
