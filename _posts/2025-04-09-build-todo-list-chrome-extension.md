---
layout: post
title: "Build a Todo List Chrome Extension: Productivity Right in Your Browser"
description: "Learn how to build a todo list Chrome extension from scratch. This step-by-step tutorial covers Manifest V3, local storage, popup UI, and publishing your task manager extension."
date: 2025-04-09
categories: [Chrome-Extensions, Tutorials]
tags: [todo, productivity, chrome-extension]
keywords: "chrome extension todo list, build todo extension, task manager chrome extension, chrome extension task list, simple todo chrome extension"
canonical_url: "https://bestchromeextensions.com/2025/04/09/build-todo-list-chrome-extension/"
---

Build a Todo List Chrome Extension: Productivity Right in Your Browser

Every productive day begins with a clear list of tasks. What if you could manage your todo list without leaving your browser? we will walk through building a fully functional Todo List Chrome Extension from scratch. By the end of this tutorial, you will have a working task manager that lives in your browser toolbar, ready to help you stay organized and focused.

Chrome extensions are powerful tools that can enhance your browsing experience in countless ways. A todo list extension is one of the most practical projects you can build because it solves a real problem, keeping track of tasks, while teaching you fundamental concepts of Chrome extension development. Whether you are a beginner looking to learn extension development or an experienced developer wanting to add a useful tool to your portfolio, this guide has you covered.

we will cover everything from setting up your development environment to publishing your extension on the Chrome Web Store. We will use Manifest V3, the latest and most secure version of the Chrome extension platform, and modern JavaScript practices to build a clean, performant, and user-friendly todo list extension.

---

Why Build a Todo List Chrome Extension? {#why-build-todo-extension}

Before we dive into the code, let us discuss why building a todo list Chrome extension is an excellent project choice. First, it is practical. You will actually use the extension you build, which makes the development process more rewarding. Unlike abstract coding exercises, a todo list extension solves a problem you encounter every day.

Second, a todo list extension teaches you essential Chrome extension concepts. You will learn how to create popup interfaces, store data locally using the chrome.storage API, manage user interactions with JavaScript, and structure your extension following Manifest V3 best practices. These skills transfer directly to any other extension you want to build.

Third, the todo list category is popular on the Chrome Web Store. Users are actively searching for simple, fast, and reliable task management tools. If you decide to publish your extension, there is a ready audience waiting. You can even add premium features later to create a monetization opportunity.

Finally, building a todo list extension is achievable in a single sitting. The core functionality is straightforward, add tasks, mark them complete, delete them, but you can always extend it later with features like due dates, categories, reminders, and cloud sync. This makes it a perfect starter project that you can continuously improve.

---

Prerequisites and Development Environment {#prerequisites}

Before we start coding, let us make sure you have everything you need. The good news is that building Chrome extensions requires minimal setup. If you can write HTML, CSS, and JavaScript, you are ready to go.

You will need a text editor or IDE. Visual Studio Code is highly recommended because it has excellent extensions for Chrome development, including debugging tools and syntax highlighting. You can download it for free from code.visualstudio.com. Alternatively, you can use Sublime Text, Atom, or any editor you are comfortable with.

You also need Google Chrome installed, which you probably already have since you are reading a guide about Chrome extensions. Make sure you are using the latest version for the best development experience.

No special installation is required for Chrome extension development. You do not need Node.js, Python, or any backend technology for a basic todo list extension. Everything runs in the browser using standard web technologies.

---

Project Structure and Files {#project-structure}

Every Chrome extension needs a specific structure to work correctly. Let us set up our project folder and create the essential files.

Create a new folder named `todo-list-extension` in your workspace. Inside this folder, we will create the following files and directories:

```
todo-list-extension/
 manifest.json
 popup.html
 popup.css
 popup.js
 icons/
     icon16.png
     icon48.png
     icon128.png
```

The manifest.json file is the configuration file that tells Chrome about your extension. The popup.html and popup.css files define the user interface that appears when users click your extension icon. The popup.js file contains all the logic for managing tasks. The icons folder contains the images that represent your extension in the browser toolbar and Chrome Web Store.

Let us start by creating the manifest.json file, which is the heart of every Chrome extension.

---

Creating the Manifest File {#manifest-file}

The manifest.json file is the first and most important file you need to create. It defines your extension's name, version, permissions, and the files that Chrome should load.

Create a file named `manifest.json` in your project folder and add the following content:

```json
{
  "manifest_version": 3,
  "name": "Simple Todo List",
  "version": "1.0.0",
  "description": "A lightweight todo list extension for managing your daily tasks right in your browser.",
  "permissions": [
    "storage"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Let us break down what each field means. The `manifest_version` field tells Chrome which version of the extension platform to use. We are using Manifest V3, which is the current standard and offers better security and performance than the older Manifest V2.

The `name` and `version` fields identify your extension. The `description` appears in the Chrome Web Store and when users view extension details. The `permissions` array specifies what capabilities your extension needs. We need the "storage" permission to save tasks locally so they persist between browser sessions.

The `action` field defines what happens when users click your extension icon in the toolbar. We are using a popup, which is a small window that appears when the icon is clicked. The `default_popup` points to our HTML file, and the `default_icon` specifies the images to show in the toolbar.

Finally, the `icons` field defines the images used in the Chrome Web Store and extension management pages. For now, you can create simple placeholder images or download some free icons from a site like Flaticon.

---

Building the Popup Interface {#popup-interface}

Now let us create the user interface for our todo list extension. Open a new file named `popup.html` and add the following code:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple Todo List</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>My Tasks</h1>
      <span id="task-count">0 tasks</span>
    </header>
    
    <div class="input-container">
      <input type="text" id="task-input" placeholder="Add a new task..." autocomplete="off">
      <button id="add-btn">Add</button>
    </div>
    
    <ul id="task-list"></ul>
    
    <div class="footer">
      <button id="clear-completed">Clear Completed</button>
      <button id="clear-all">Clear All</button>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

This HTML structure is clean and simple. We have a header showing the extension title and task count, an input field for adding new tasks, a list to display tasks, and buttons to manage completed tasks.

Now let us style this interface to make it look professional. Create a file named `popup.css` and add the following styles:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
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
}

h1 {
  font-size: 18px;
  font-weight: 600;
}

#task-count {
  font-size: 12px;
  color: #666;
}

.input-container {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

#task-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

#task-input:focus {
  border-color: #4285f4;
}

#add-btn {
  padding: 10px 16px;
  background-color: #4285f4;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

#add-btn:hover {
  background-color: #3367d6;
}

#task-list {
  list-style: none;
  max-height: 300px;
  overflow-y: auto;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
  gap: 10px;
}

.task-item:last-child {
  border-bottom: none;
}

.task-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #4285f4;
}

.task-text {
  flex: 1;
  font-size: 14px;
  word-break: break-word;
}

.task-text.completed {
  text-decoration: line-through;
  color: #999;
}

.delete-btn {
  padding: 4px 8px;
  background-color: transparent;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn:hover {
  background-color: #ff4444;
  color: white;
  border-color: #ff4444;
}

.footer {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

#clear-completed,
#clear-all {
  flex: 1;
  padding: 8px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

#clear-completed:hover,
#clear-all:hover {
  background-color: #e0e0e0;
}
```

These styles create a clean, modern interface that feels native to Chrome. We use a neutral color palette with a blue accent color that matches Chrome's branding. The layout is responsive and the buttons have clear hover states.

---

Implementing the Logic with JavaScript {#javascript-logic}

Now comes the most important part, making our extension functional. Create a file named `popup.js` and add the following JavaScript code:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const taskInput = document.getElementById('task-input');
  const addBtn = document.getElementById('add-btn');
  const taskList = document.getElementById('task-list');
  const taskCount = document.getElementById('task-count');
  const clearCompletedBtn = document.getElementById('clear-completed');
  const clearAllBtn = document.getElementById('clear-all');

  let tasks = [];

  // Load tasks from storage when popup opens
  loadTasks();

  // Add task when button is clicked
  addBtn.addEventListener('click', addTask);

  // Add task when Enter key is pressed
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTask();
    }
  });

  // Clear completed tasks
  clearCompletedBtn.addEventListener('click', clearCompleted);

  // Clear all tasks
  clearAllBtn.addEventListener('click', clearAll);

  function loadTasks() {
    chrome.storage.local.get(['tasks'], (result) => {
      tasks = result.tasks || [];
      renderTasks();
    });
  }

  function saveTasks() {
    chrome.storage.local.set({ tasks }, () => {
      renderTasks();
    });
  }

  function addTask() {
    const text = taskInput.value.trim();
    
    if (!text) {
      return;
    }

    const newTask = {
      id: Date.now(),
      text: text,
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    taskInput.value = '';
    saveTasks();
  }

  function renderTasks() {
    taskList.innerHTML = '';
    
    const activeTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);
    
    // Show active tasks first, then completed
    [...activeTasks, ...completedTasks].forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => toggleTask(task.id));
      
      const span = document.createElement('span');
      span.className = `task-text ${task.completed ? 'completed' : ''}`;
      span.textContent = task.text;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => deleteTask(task.id));
      
      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);
      taskList.appendChild(li);
    });

    updateTaskCount();
  }

  function toggleTask(id) {
    tasks = tasks.map(task => {
      if (task.id === id) {
        return { ...task, completed: !task.completed };
      }
      return task;
    });
    saveTasks();
  }

  function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
  }

  function clearCompleted() {
    tasks = tasks.filter(task => !task.completed);
    saveTasks();
  }

  function clearAll() {
    if (confirm('Are you sure you want to delete all tasks?')) {
      tasks = [];
      saveTasks();
    }
  }

  function updateTaskCount() {
    const activeCount = tasks.filter(task => !task.completed).length;
    const totalCount = tasks.length;
    
    if (totalCount === 0) {
      taskCount.textContent = 'No tasks';
    } else if (activeCount === 0) {
      taskCount.textContent = `${totalCount} task${totalCount !== 1 ? 's' : ''} (all done!)`;
    } else {
      taskCount.textContent = `${activeCount} of ${totalCount} task${totalCount !== 1 ? 's' : ''}`;
    }
  }
});
```

This JavaScript code handles all the functionality for our todo list extension. Let us walk through the key parts to understand how it works.

First, we set up event listeners for user interactions. When the popup loads, we retrieve any saved tasks from Chrome's local storage using the chrome.storage API. This ensures that tasks persist even after the user closes and reopens the browser.

The `addTask` function creates a new task object with a unique ID, the task text, a completed status (initially false), and a timestamp. We use `Date.now()` to generate unique IDs, which is simple and effective for local storage.

The `renderTasks` function rebuilds the task list whenever tasks are added, modified, or deleted. It separates active and completed tasks, displaying active tasks at the top. Each task gets a checkbox for marking completion and a delete button for removal.

The `chrome.storage.local` API is essential here. Unlike localStorage in regular web pages, chrome.storage is specifically designed for extensions and offers better performance and security. The data stored here is automatically synced if the user is signed into Chrome and has sync enabled.

---

Testing Your Extension {#testing-extension}

Now that we have created all the necessary files, let us test our extension in Chrome. This is an exciting step because you will see your extension come to life.

Open Google Chrome and navigate to `chrome://extensions` in the address bar. This is the Extensions Management page where you can manage all your installed extensions.

In the top right corner, toggle on the "Developer mode" switch. This enables additional features that allow you to load unpacked extensions for testing.

After enabling Developer mode, you will see new buttons appear in the top left area: "Load unpacked", "Pack extension", and "Update". Click the "Load unpacked" button.

Navigate to your project folder (`todo-list-extension`) and select it. Chrome will load your extension and display it in the extensions list.

Now look at your browser toolbar. You should see a new puzzle piece icon (the standard icon for extensions) with your extension name "Simple Todo List" when you hover over it. Click on this icon to open your todo list popup.

Try adding a task by typing in the input field and pressing Enter or clicking the Add button. The task should appear in the list. Try checking the checkbox to mark it complete, the text should have a strikethrough effect. Try deleting tasks and using the clear buttons.

Congratulations! Your extension is working. If you encounter any issues, check the console for error messages. You can access the console by going back to the Extensions page and clicking the "service worker" or "background" link for your extension, or by using the popup's developer tools.

---

Creating Extension Icons {#creating-icons}

While testing works with default or missing icons, you will need proper icons for a polished look and for publishing. Chrome requires icons in three sizes: 16x16, 48x48, and 128x128 pixels.

You have several options for creating these icons. You can use a graphic design tool like Figma, Adobe Illustrator, or even free tools like Canva. Create a simple design, perhaps a checklist or checkbox symbol, and export it in the required sizes.

For development and testing, you can create simple placeholder images. Here is a quick method using Python with the Pillow library, or you can find free icons online. Remember to place these files in an `icons` folder in your project directory.

---

Publishing Your Extension {#publishing-extension}

Once you are satisfied with your extension and have tested it thoroughly, you may want to publish it to the Chrome Web Store so others can discover and install it. Publishing is optional but can be rewarding if you want to share your work or build an audience.

To publish your extension, you need a Google Developer account. Visit the Chrome Web Store Developer Dashboard and sign up. There is a one-time registration fee of $5 USD.

Prepare your extension for publication by creating screenshots and a promotional description. Update your manifest.json to include a `short_name` (a shorter version of your extension name for space-constrained areas) and verify all paths are correct.

Upload your extension through the developer dashboard, fill in the store listing details, and submit it for review. Google reviews extensions to ensure they meet security and policy requirements. The review process typically takes a few days.

Once approved, your extension will be live in the Chrome Web Store and available for millions of Chrome users to discover and install.

---

Extending Your Todo List Extension {#future-improvements}

While our basic todo list extension is fully functional, there are many ways you can extend it to add more value. Here are some ideas to inspire your next steps.

Add due dates and priority levels to tasks. You could implement a date picker for setting due dates and color-code tasks based on priority (high, medium, low). This makes the extension more useful for managing complex workflows.

Implement categories or tags. Allow users to organize tasks into different categories like Work, Personal, Shopping, or any custom categories they prefer. This helps with task organization, especially for users with many tasks.

Add keyboard shortcuts. Chrome extensions can define keyboard shortcuts that work even when the popup is not open. You could allow users to quickly add a task from anywhere in Chrome using a keyboard shortcut.

Integrate with cloud services. Instead of using chrome.storage, you could sync tasks with services like Google Tasks, Todoist, or a custom backend. This would allow users to access their tasks across multiple devices.

Add notifications and reminders. Use the chrome.notifications API to remind users about upcoming deadlines or overdue tasks.

---

Conclusion {#conclusion}

You have successfully built a complete Todo List Chrome Extension from scratch. Throughout this guide, we covered the essential concepts of Chrome extension development, including Manifest V3 configuration, popup interface design, JavaScript logic for task management, and the chrome.storage API for persistent data storage.

The extension you built is functional, clean, and ready for everyday use. It demonstrates fundamental patterns that apply to virtually any Chrome extension you will build in the future. The skills you learned here, working with the Chrome APIs, structuring extension projects, and handling user interactions, form a solid foundation for more advanced projects.

Remember that the best extensions solve real problems. Our todo list extension addresses a universal need, staying organized, and does so in a simple, fast, and reliable way. As you continue your Chrome extension development journey, keep this principle in mind: focus on solving problems for your users, and the rest will follow.

Now that you have the knowledge and a working extension, the next step is yours. Publish it to the Chrome Web Store, continue adding features, or use this as a stepping stone to build something even more ambitious. The Chrome extension ecosystem is waiting for your contributions.
