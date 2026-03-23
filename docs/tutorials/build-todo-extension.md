---
layout: default
title: "Chrome Extension Todo Extension. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-todo-extension/"
---
# Build a Todo List Chrome Extension

A step-by-step guide to building a feature-rich todo list extension with categories, due dates, reminders, and cloud sync.

Step 1: Manifest Configuration {#step-1-manifest-configuration}

Create `manifest.json` with storage permissions:

```json
{
  "manifest_version": 3,
  "name": "Todo Master",
  "version": "1.0",
  "permissions": ["storage", "alarms", "notifications"],
  "action": { "default_popup": "popup.html" }
}
```

Step 2: Popup UI {#step-2-popup-ui}

Create `popup.html` with task input, filters, and task list:

```html
<input type="text" id="taskInput" placeholder="Add a task...">
<input type="date" id="dueDate">
<select id="category"><option>Personal</option><option>Work</option></select>
<button id="addBtn">Add</button>
<div id="filters">
  <button data-filter="all">All</button>
  <button data-filter="active">Active</button>
  <button data-filter="completed">Completed</button>
</div>
<ul id="taskList"></ul>
<button id="exportBtn">Export</button>
```

Step 3: Storage Schema {#step-3-storage-schema}

Define the task structure in `types.ts`:

```typescript
interface Task {
  id: string;
  text: string;
  completed: boolean;
  category: string;
  dueDate?: string;
  createdAt: number;
  order: number;
}
```

Step 4: CRUD Operations {#step-4-crud-operations}

Implement core operations using `chrome.storage.local`:

```typescript
async function addTask(text: string, category: string, dueDate?: string) {
  const tasks = await getTasks();
  const newTask: Task = {
    id: crypto.randomUUID(),
    text, completed: false, category, dueDate,
    createdAt: Date.now(), order: tasks.length
  };
  tasks.push(newTask);
  await chrome.storage.local.set({ tasks });
  updateBadge();
}
```

Step 5: Categories & Tags {#step-5-categories-tags}

Filter tasks by category using the select dropdown. Store category-specific tasks and render accordingly. Add color-coded badges for each category.

Step 6: Due Date Reminders {#step-6-due-date-reminders}

Use the Alarms API for notifications:

```typescript
chrome.alarms.create(task.id, { when: new Date(dueDate).getTime() });
chrome.alarms.onAlarm.addListener((alarm) => {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon-128.png',
    title: 'Task Reminder',
    message: 'Task due!'
  });
});
```

See [api-reference/alarms-api.md](../api-reference/alarms-api.md) for details.

Step 7: Badge Count {#step-7-badge-count}

Display pending task count on extension icon:

```typescript
function updateBadge() {
  const count = tasks.filter(t => !t.completed).length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
}
```

Step 8: Drag-and-Drop Reordering {#step-8-drag-and-drop-reordering}

Use HTML5 drag-and-drop API to reorder tasks. Update `order` field in storage on drop.

Step 9: Sync Across Devices {#step-9-sync-across-devices}

Use `chrome.storage.sync` for cloud sync. Handle quota limits:

```typescript
try {
  await chrome.storage.sync.set({ tasks: tasks.slice(0, 100) });
} catch (e) {
  // Fallback to local storage for large datasets
  await chrome.storage.local.set({ tasks });
}
```

See [api-reference/storage-api-deep detailed look.md](../api-reference/storage-api-deep detailed look.md).

Step 10: Keyboard Shortcuts {#step-10-keyboard-shortcuts}

Add `commands` to manifest for quick-add:

```json
"commands": {
  "quick-add": { "suggested_key": "Ctrl+Shift+T", "description": "Quick add task" }
}
```

Step 11: Export Functionality {#step-11-export-functionality}

Export tasks as JSON or plain text:

```typescript
function exportTasks(format: 'json' | 'text') {
  const data = format === 'json' 
    ? JSON.stringify(tasks, null, 2)
    : tasks.map(t => `- ${t.text} [${t.category}]`).join('\n');
  // Download file implementation
}
```

Next Steps {#next-steps}

- Review [guides/popup-patterns.md](../guides/popup-patterns.md) for UI best practices
- Explore additional features like recurring tasks and priority levels
- Add unit tests for CRUD operations

Happy building! 
-e 

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
