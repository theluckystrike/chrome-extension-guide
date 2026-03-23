# Tab Grouping Automation in Chrome Extensions

## Introduction

Tab Grouping Automation is a powerful feature in Chrome extensions that allows you to automatically organize browser tabs into groups based on rules, patterns, or user behavior. The `chrome.tabGroups` API, introduced in Chrome 88, provides the foundation for creating, modifying, and managing tab groups programmatically. This guide covers advanced patterns for automating tab grouping to improve productivity and reduce tab clutter.

## Key APIs

### chrome.tabGroups API

The `chrome.tabGroups` API provides methods to create, update, and query tab groups:

```typescript
// Create a new tab group from existing tabs
async function createGroup(tabIds: number[], title: string, color: string): Promise<number> {
  const groupId = await chrome.tabs.group({ tabIds });
  
  await chrome.tabGroups.update(groupId, {
    title,
    color, // 'blue' | 'cyan' | 'grey' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'yellow'
    collapsed: false
  });
  
  return groupId;
}

// Get all tab groups in the current window
async function getGroupsInWindow(windowId: number): Promise<chrome.tabGroups.TabGroup[]> {
  const tabs = await chrome.tabs.query({ windowId });
  const groupIds = [...new Set(tabs.map(t => t.groupId).filter(id => id !== -1))];
  
  const groups: chrome.tabGroups.TabGroup[] = [];
  for (const groupId of groupIds) {
    const group = await chrome.tabGroups.get(groupId);
    groups.push(group);
  }
  return groups;
}
```

### chrome.tabs.group() and chrome.tabs.ungroup()

```typescript
// Group tabs by domain
async function groupByDomain(tabs: chrome.tab.Tab[]): Promise<void> {
  const domainGroups = new Map<string, number[]>();
  
  for (const tab of tabs) {
    if (!tab.url || !tab.id) continue;
    
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain)!.push(tab.id);
    } catch {
      // Skip invalid URLs
    }
  }
  
  // Create groups for each domain with multiple tabs
  for (const [domain, tabIds] of domainGroups) {
    if (tabIds.length >= 1) {
      await chrome.tabs.group({ tabIds });
      // Note: You can only set group properties after creation
    }
  }
}

// Ungroup specific tabs
async function ungroupTabs(tabIds: number[]): Promise<void> {
  await chrome.tabs.ungroup(tabIds);
}
```

## Auto-Grouping Patterns

### Domain-Based Auto-Grouping

Automatically group tabs when they're created based on their domain:

```typescript
// Listen for new tabs and auto-group by domain
chrome.tabs.onCreated.addListener(async (tab) => {
  if (!tab.url || !tab.id || tab.id === -1) return;
  
  try {
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    // Find existing group for this domain
    const existingGroup = await findGroupByTitle(domain);
    
    if (existingGroup) {
      // Add to existing group
      await chrome.tabs.group({ tabIds: [tab.id], groupId: existingGroup.id });
    } else {
      // Create new group with color based on domain
      const color = getColorForDomain(domain);
      const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
      await chrome.tabGroups.update(groupId, {
        title: domain,
        color
      });
    }
  } catch {
    // Skip non-http(s) URLs
  }
});

async function findGroupByTitle(title: string): Promise<chrome.tabGroups.TabGroup | null> {
  const tabs = await chrome.tabs.query({});
  const groupIds = [...new Set(tabs.map(t => t.groupId).filter(id => id !== -1))];
  
  for (const groupId of groupIds) {
    const group = await chrome.tabGroups.get(groupId);
    if (group.title === title) {
      return group;
    }
  }
  return null;
}

// Deterministic color based on domain string
function getColorForDomain(domain: string): string {
  const colors = ['blue', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'yellow'];
  const hash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
```

### URL Pattern-Based Grouping

Group tabs based on URL patterns or categories:

```typescript
interface GroupRule {
  pattern: RegExp;
  groupName: string;
  color: string;
}

const groupRules: GroupRule[] = [
  { pattern: /^https:\/\/(www\.)?github\.com/, groupName: 'GitHub', color: 'grey' },
  { pattern: /^https:\/\/(www\.)?stackoverflow\.com/, groupName: 'Stack Overflow', color: 'orange' },
  { pattern: /^https:\/\/(www\.)?reddit\.com/, groupName: 'Reddit', color: 'pink' },
  { pattern: /^https:\/\/(www\.)?youtube\.com/, groupName: 'YouTube', color: 'red' },
];

async function applyGroupingRules(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  
  for (const tab of tabs) {
    if (!tab.url || !tab.id || tab.groupId !== -1) continue;
    
    for (const rule of groupRules) {
      if (rule.pattern.test(tab.url)) {
        const groupId = await chrome.tabs.group({ tabIds: [tab.id] });
        await chrome.tabGroups.update(groupId, {
          title: rule.groupName,
          color: rule.color as chrome.tabGroups.ColorEnum
        });
        break;
      }
    }
  }
}
```

## Tab Group Events

Monitor and respond to group changes:

```typescript
chrome.tabGroups.onCreated.addListener((group) => {
  console.log(`Group created: ${group.title} with color ${group.color}`);
});

chrome.tabGroups.onUpdated.addListener((group) => {
  console.log(`Group updated: ${group.title} is now ${group.collapsed ? 'collapsed' : 'expanded'}`);
});

chrome.tabGroups.onRemoved.addListener((groupId) => {
  console.log(`Group removed: ${groupId}`);
});

// Also listen to tab group membership changes
chrome.tabs.onMoved.addListener((tabId, moveInfo) => {
  // Check if tab moved between groups
});
```

## Saving and Restoring Tab Groups

Persist group configurations for session management:

```typescript
interface SavedGroup {
  name: string;
  color: string;
  urls: string[];
}

async function saveSession(): Promise<SavedGroup[]> {
  const tabs = await chrome.tabs.query({});
  const groupMap = new Map<number, SavedGroup>();
  
  for (const tab of tabs) {
    if (!tab.url || tab.groupId === -1) continue;
    
    if (!groupMap.has(tab.groupId)) {
      const group = await chrome.tabGroups.get(tab.groupId);
      groupMap.set(tab.groupId, {
        name: group.title || 'Unnamed',
        color: group.color,
        urls: []
      });
    }
    
    groupMap.get(tab.groupId)!.urls.push(tab.url);
  }
  
  return Array.from(groupMap.values());
}

async function restoreSession(savedGroups: SavedGroup[]): Promise<void> {
  for (const group of savedGroups) {
    const tabIds: number[] = [];
    
    for (const url of group.urls) {
      const tab = await chrome.tabs.create({ url, active: false });
      tabIds.push(tab.id!);
    }
    
    const groupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(groupId, {
      title: group.name,
      color: group.color as chrome.tabGroups.ColorEnum
    });
  }
}
```

## Intelligent Grouping Patterns

### Content-Based Grouping

Group tabs by page content or metadata:

```typescript
async function groupByContent(tabIds: number[]): Promise<void> {
  // Use content scripts or tab metadata to categorize
  // This requires communicating with content scripts
  
  const categories = new Map<string, number[]>();
  
  for (const tabId of tabIds) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { action: 'getCategory' });
      const category = response?.category || 'uncategorized';
      
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(tabId);
    } catch {
      // Tab may not have content script
    }
  }
  
  for (const [category, ids] of categories) {
    if (ids.length > 1) {
      const groupId = await chrome.tabs.group({ tabIds: ids });
      await chrome.tabGroups.update(groupId, { title: category });
    }
  }
}
```

## Common Mistakes

- Not checking for existing groups before creating duplicates
- Ignoring the `groupId: -1` which indicates an ungrouped tab
- Assuming group IDs persist across browser restarts - they don't
- Creating too many groups which defeats the purpose of organization
- Not handling async operations when grouping multiple tabs
- Forgetting to request `"tabs"` permission for full tab URL access

## Best Practices

1. Use meaningful group titles that describe the category
2. Apply consistent color coding (e.g., work = blue, personal = green)
3. Implement undo functionality for ungrouping operations
4. Provide manual override so users can customize groups
5. Save group configurations for session restoration
6. Debounce auto-grouping to avoid excessive operations
