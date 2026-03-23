---
layout: post
title: "Build a Todo List Chrome Extension Tutorial. Complete 2025 Guide"
description: "Learn how to build a powerful todo chrome extension with our comprehensive task manager extension tutorial. Covers Manifest V3, storage, notifications, and publishing."
date: 2025-01-19
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, tutorial, project]
author: theluckystrike
canonical_url: "https://bestchromeextensions.com/2025/01/19/build-todo-list-chrome-extension-tutorial/"
---

# Build a Todo List Chrome Extension Tutorial. Complete 2025 Guide

Chrome extensions have revolutionized the way we work and manage our digital lives. Among the most popular and useful extensions are task manager extensions that help users stay organized and productive. In this comprehensive tutorial, we'll walk you through building a fully functional todo chrome extension from scratch using Manifest V3, the latest version of Chrome's extension framework.

Whether you're a beginner looking to learn Chrome extension development or an experienced developer wanting to create a productivity extension tutorial, this guide has everything you need to build a professional-grade task manager extension that can compete with popular options in the Chrome Web Store.

Why Build a Todo Chrome Extension?

Before we dive into the technical details, let's discuss why creating a task manager extension is an excellent project choice. The todo chrome extension category remains one of the most searched and downloaded types of extensions on the Chrome Web Store. Users constantly seek better ways to organize their tasks, manage deadlines, and improve their productivity.

Building a productivity extension tutorial provides you with hands-on experience with essential Chrome APIs including storage, alarms, notifications, and badge updates. These skills are transferable to virtually any other Chrome extension project you might tackle in the future.

Prerequisites and Setup

Before we begin building our todo list chrome extension, ensure you have the following:

- Google Chrome browser installed on your computer
- A code editor (VS Code is recommended)
- Basic knowledge of HTML, CSS, and JavaScript
- Familiarity with JSON format

Let's start by creating the project structure. Create a new folder named `todo-extension` in your workspace. This will be the home for all our extension files.

Project Structure

A well-organized Chrome extension follows a specific file structure. For our todo chrome extension, we'll create the following files:

```
todo-extension/
 manifest.json
 popup.html
 popup.css
 popup.js
 background.js
 icons/
    icon16.png
    icon48.png
    icon128.png
 styles/
     options.css
```

This structure keeps our files organized and makes maintenance easier as the extension grows in complexity.

Manifest V3 Configuration

Every Chrome extension begins with the manifest.json file. This critical configuration file tells Chrome about your extension's capabilities, permissions, and file structure. For our task manager extension, we need specific permissions to access storage, create notifications, and manage alarms for reminders.

Create the manifest.json file in your project directory:

```json
{
  "manifest_version": 3,
  "name": "Task Master - Todo Manager",
  "version": "1.0.0",
  "description": "A powerful task manager extension to organize your life and boost productivity",
  "permissions": [
    "storage",
    "alarms",
    "notifications"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "commands": {
    "quick-add-task": {
      "suggested_key": {
        "default": "Ctrl+Shift+T",
        "mac": "Command+Shift+T"
      },
      "description": "Quick add a new task"
    }
  }
}
```

This manifest configuration uses Manifest V3, which is required for all new extensions published to the Chrome Web Store as of January 2023. The permissions we requested are essential for our todo chrome extension functionality.

Creating the Popup Interface

The popup is what users see when they click on our extension icon in the browser toolbar. This is where users will interact with their tasks, so we need to create an intuitive and visually appealing interface.

Create the popup.html file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Master</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Task Master</h1>
      <div class="stats">
        <span id="pendingCount">0</span> pending
      </div>
    </header>

    <div class="add-task-section">
      <input type="text" id="taskInput" placeholder="What needs to be done?" autocomplete="off">
      <div class="task-options">
        <select id="categorySelect">
          <option value="personal">Personal</option>
          <option value="work">Work</option>
          <option value="shopping">Shopping</option>
          <option value="health">Health</option>
        </select>
        <input type="date" id="dueDate">
        <button id="addTaskBtn">Add</button>
      </div>
    </div>

    <div class="filters">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="active">Active</button>
      <button class="filter-btn" data-filter="completed">Completed</button>
    </div>

    <ul id="taskList" class="task-list">
      <!-- Tasks will be dynamically inserted here -->
    </ul>

    <div class="footer">
      <button id="clearCompletedBtn">Clear Completed</button>
      <button id="exportBtn">Export</button>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

The popup interface includes several key elements: a text input for adding new tasks, a category selector for organizing tasks, a date picker for setting due dates, filter buttons for viewing different task states, and action buttons for managing completed tasks.

Styling the Popup

Now let's add CSS to make our task manager extension visually appealing. Create popup.css:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 360px;
  min-height: 400px;
  background-color: #ffffff;
  color: #333;
}

.container {
  padding: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e0e0e0;
}

h1 {
  font-size: 20px;
  font-weight: 600;
  color: #1a73e8;
}

.stats {
  font-size: 14px;
  color: #666;
}

#pendingCount {
  font-weight: 600;
  color: #1a73e8;
}

.add-task-section {
  margin-bottom: 16px;
}

#taskInput {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 8px;
  transition: border-color 0.2s;
}

#taskInput:focus {
  outline: none;
  border-color: #1a73e8;
}

.task-options {
  display: flex;
  gap: 8px;
}

#categorySelect, #dueDate {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  flex: 1;
}

#addTaskBtn {
  padding: 8px 16px;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

#addTaskBtn:hover {
  background-color: #1557b0;
}

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.filter-btn {
  padding: 6px 12px;
  border: none;
  background-color: #f1f3f4;
  border-radius: 16px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.filter-btn.active {
  background-color: #1a73e8;
  color: white;
}

.filter-btn:hover:not(.active) {
  background-color: #e8eaed;
}

.task-list {
  list-style: none;
  max-height: 300px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f1f3f4;
  gap: 10px;
  transition: background-color 0.2s;
}

.task-item:hover {
  background-color: #f8f9fa;
}

.task-item.completed .task-text {
  text-decoration: line-through;
  color: #999;
}

.task-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #1a73e8;
}

.task-text {
  flex: 1;
  font-size: 14px;
}

.task-category {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: #e8f0fe;
  color: #1a73e8;
}

.task-category.work {
  background-color: #fce8e6;
  color: #c5221f;
}

.task-category.shopping {
  background-color: #e6f4ea;
  color: #1e8e3e;
}

.task-category.health {
  background-color: #f3e8fd;
  color: #9334e9;
}

.task-due {
  font-size: 11px;
  color: #666;
}

.task-delete {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.task-item:hover .task-delete {
  opacity: 1;
}

.task-delete:hover {
  color: #c5221f;
}

.footer {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}

#clearCompletedBtn, #exportBtn {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

#clearCompletedBtn:hover, #exportBtn:hover {
  background-color: #f1f3f4;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}
```

This CSS provides a clean, modern interface that follows Google's Material Design guidelines. The styling includes visual feedback for interactions, category color coding, and a responsive layout.

Implementing Core Functionality

Now comes the heart of our todo chrome extension - the JavaScript that handles all the task management logic. Create popup.js:

```javascript
// Task storage schema
const Task = {
  create: function(text, category, dueDate) {
    return {
      id: this.generateId(),
      text: text,
      completed: false,
      category: category,
      dueDate: dueDate || null,
      createdAt: Date.now(),
      order: 0
    };
  },

  generateId: function() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
};

// State management
let tasks = [];
let currentFilter = 'all';

// DOM Elements
const taskInput = document.getElementById('taskInput');
const categorySelect = document.getElementById('categorySelect');
const dueDateInput = document.getElementById('dueDate');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const filterButtons = document.querySelectorAll('.filter-btn');
const pendingCount = document.getElementById('pendingCount');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const exportBtn = document.getElementById('exportBtn');

// Initialize extension
document.addEventListener('DOMContentLoaded', async () => {
  await loadTasks();
  renderTasks();
  setupEventListeners();
});

// Load tasks from Chrome storage
async function loadTasks() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['tasks'], (result) => {
      tasks = result.tasks || [];
      resolve(tasks);
    });
  });
}

// Save tasks to Chrome storage
async function saveTasks() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ tasks: tasks }, () => {
      resolve();
    });
  });
}

// Add a new task
async function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  const category = categorySelect.value;
  const dueDate = dueDateInput.value || null;

  const newTask = Task.create(text, category, dueDate);
  tasks.unshift(newTask);

  await saveTasks();
  renderTasks();
  updateBadge();

  // Set alarm for due date reminder
  if (dueDate) {
    setReminder(newTask);
  }

  // Clear input fields
  taskInput.value = '';
  dueDateInput.value = '';
  taskInput.focus();
}

// Delete a task
async function deleteTask(taskId) {
  tasks = tasks.filter(task => task.id !== taskId);
  await saveTasks();
  renderTasks();
  updateBadge();
}

// Toggle task completion
async function toggleTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    await saveTasks();
    renderTasks();
    updateBadge();
  }
}

// Render tasks to the popup
function renderTasks() {
  const filteredTasks = getFilteredTasks();

  if (filteredTasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <p>No tasks found</p>
        <p>Add a new task to get started!</p>
      </div>
    `;
    return;
  }

  taskList.innerHTML = filteredTasks.map(task => `
    <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
      <span class="task-text">${escapeHtml(task.text)}</span>
      <span class="task-category ${task.category}">${task.category}</span>
      ${task.dueDate ? `<span class="task-due">${formatDate(task.dueDate)}</span>` : ''}
      <button class="task-delete" title="Delete task">&times;</button>
    </li>
  `).join('');

  // Update pending count
  const pending = tasks.filter(t => !t.completed).length;
  pendingCount.textContent = pending;
}

// Get filtered tasks based on current filter
function getFilteredTasks() {
  switch (currentFilter) {
    case 'active':
      return tasks.filter(task => !task.completed);
    case 'completed':
      return tasks.filter(task => task.completed);
    default:
      return tasks;
  }
}

// Update extension badge with pending task count
function updateBadge() {
  const pending = tasks.filter(t => !t.completed).length;
  chrome.action.setBadgeText({
    text: pending > 0 ? String(pending) : ''
  });
  chrome.action.setBadgeBackgroundColor({
    color: '#1a73e8'
  });
}

// Set reminder alarm for task due date
function setReminder(task) {
  const dueTime = new Date(task.dueDate).getTime();
  const now = Date.now();

  if (dueTime > now) {
    chrome.alarms.create(task.id, {
      when: dueTime
    });
  }
}

// Clear completed tasks
async function clearCompleted() {
  tasks = tasks.filter(task => !task.completed);
  await saveTasks();
  renderTasks();
  updateBadge();
}

// Export tasks
function exportTasks() {
  const data = JSON.stringify(tasks, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks-export-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

// Helper functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// Setup event listeners
function setupEventListeners() {
  // Add task
  addTaskBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });

  // Filter buttons
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Task list interactions
  taskList.addEventListener('click', (e) => {
    const taskItem = e.target.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.dataset.id;

    if (e.target.classList.contains('task-checkbox')) {
      toggleTask(taskId);
    } else if (e.target.classList.contains('task-delete')) {
      deleteTask(taskId);
    }
  });

  // Clear completed
  clearCompletedBtn.addEventListener('click', clearCompleted);

  // Export
  exportBtn.addEventListener('click', exportTasks);
}
```

This JavaScript implementation includes comprehensive task management functionality. It handles adding, deleting, and toggling tasks, filtering by status, persisting data using Chrome's storage API, updating the extension badge with pending task counts, setting reminder alarms for due dates, and exporting tasks to JSON.

Background Service Worker

The background service worker handles events that occur in the background, such as alarm triggers for task reminders. Create background.js:

```javascript
// Handle alarm events for task reminders
chrome.alarms.onAlarm.addListener((alarm) => {
  // Get the task that triggered the alarm
  chrome.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    const task = tasks.find(t => t.id === alarm.name);

    if (task && !task.completed) {
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Task Reminder',
        message: task.text,
        priority: 1
      });
    }
  });
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'quick-add-task') {
    // Open popup or focus it
    chrome.action.openPopup();
  }
});

// Initialize badge on startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    const pending = tasks.filter(t => !t.completed).length;

    chrome.action.setBadgeText({
      text: pending > 0 ? String(pending) : ''
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#1a73e8'
    });
  });
});
```

Loading and Testing the Extension

Now that we've created all the necessary files, let's test our todo chrome extension:

1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top-right corner
3. Click "Load unpacked" and select your `todo-extension` folder
4. The extension should now appear in your Chrome toolbar

Click on the extension icon to see your task manager interface. Try adding some tasks, marking them as complete, and exploring the various features.

Publishing Your Extension

Once you've tested your extension and are satisfied with its functionality, you can publish it to the Chrome Web Store:

1. Create a developer account at the Chrome Web Store
2. Zip your extension folder (excluding unnecessary files)
3. Upload the zip file to the Chrome Web Store Developer Dashboard
4. Fill in the store listing details, including a compelling description and screenshots
5. Submit for review

When published, users can find your task manager extension by searching for terms like "todo chrome extension" or "task manager extension" in the Chrome Web Store.

Advanced Features to Consider

This tutorial covers the core functionality of a basic todo chrome extension. However, there's much more you can add to make your task manager extension stand out:

- Sync across devices: Use chrome.storage.sync to allow users to access their tasks on different devices
- Drag and drop: Implement drag-and-drop reordering for priority management
- Recurring tasks: Add support for daily, weekly, or custom recurrence patterns
- Priority levels: Allow users to set high, medium, or low priority for tasks
- Search functionality: Implement a search feature to quickly find specific tasks
- Dark mode: Add theme support for users who prefer dark interfaces

Conclusion

Congratulations! You've successfully built a complete todo chrome extension from scratch. This productivity extension tutorial has covered essential concepts including Manifest V3 configuration, Chrome storage API, alarms and notifications, badge updates, and modern UI design.

The skills you've learned here are directly applicable to building other types of Chrome extensions. Whether you want to create a bookmarks manager, a note-taking app, or any other browser extension, the fundamentals remain the same.

Remember that the Chrome extension development community is vast and supportive. Don't hesitate to explore additional resources, study existing open-source extensions, and continue learning. Your task manager extension is now ready to help users organize their lives and boost their productivity!

Start using your new task manager extension today, and consider publishing it to the Chrome Web Store so others can benefit from your work. Happy building!
