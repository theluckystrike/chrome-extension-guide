# Build a Custom New Tab Page Extension

## What You'll Build
Custom new tab with clock, greeting, quick links, search bar, and todo list.

## Step 1: Manifest
```json
{
  "manifest_version": 3,
  "name": "Custom New Tab",
  "version": "1.0.0",
  "permissions": ["storage", "topSites"],
  "chrome_url_overrides": { "newtab": "newtab/newtab.html" }
}
```

## Step 2: HTML
```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><link rel="stylesheet" href="newtab.css"></head>
<body>
  <div class="container">
    <div id="greeting" class="greeting"></div>
    <div id="clock" class="clock"></div>
    <div id="date" class="date"></div>
    <div class="search-container">
      <input type="text" id="search" placeholder="Search the web..." autofocus>
    </div>
    <div class="links-section">
      <h3>Quick Links</h3>
      <div id="quick-links" class="quick-links"></div>
      <button id="add-link" class="add-btn">+ Add Link</button>
    </div>
    <div class="todo-section">
      <h3>Tasks</h3>
      <div id="todo-list"></div>
      <div class="todo-input">
        <input type="text" id="todo-input" placeholder="Add a task...">
        <button id="add-todo">Add</button>
      </div>
    </div>
  </div>
  <script src="newtab.js"></script>
</body>
</html>
```

## Step 3: CSS
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: system-ui; background: linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 50%, #0d0d1a 100%);
  color: #e0e0e0; min-height: 100vh; display: flex; justify-content: center;
}
.container { max-width: 700px; width: 100%; padding: 60px 20px; }
.greeting { font-size: 32px; color: #00ff41; margin-bottom: 8px; }
.clock { font-size: 64px; font-weight: 200; color: #fff; letter-spacing: 4px; }
.date { font-size: 16px; color: #888; margin-bottom: 40px; }
.search-container { margin-bottom: 40px; }
#search {
  width: 100%; padding: 14px 20px; font-size: 16px;
  background: rgba(255,255,255,0.08); border: 1px solid #333;
  border-radius: 30px; color: #e0e0e0; outline: none;
}
#search:focus { border-color: #00ff41; box-shadow: 0 0 12px rgba(0,255,65,0.2); }
h3 { font-size: 14px; color: #00ff41; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 2px; }
.quick-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-bottom: 10px; }
.link-card {
  background: rgba(255,255,255,0.05); border: 1px solid #333;
  border-radius: 8px; padding: 12px; text-align: center; cursor: pointer;
}
.link-card:hover { border-color: #00ff41; background: rgba(0,255,65,0.05); }
.link-card .title { font-size: 13px; }
.link-card .domain { font-size: 10px; color: #666; margin-top: 4px; }
.link-card .remove { float: right; color: #ff4444; cursor: pointer; font-size: 12px; }
.add-btn { padding: 6px 12px; border: 1px dashed #555; background: transparent; color: #888; border-radius: 6px; cursor: pointer; }
.todo-section { margin-top: 30px; }
.todo-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.todo-item input[type="checkbox"] { accent-color: #00ff41; }
.todo-item.done .todo-text { text-decoration: line-through; color: #555; }
.todo-text { flex: 1; font-size: 14px; }
.todo-delete { color: #ff4444; cursor: pointer; border: none; background: none; }
.todo-input { display: flex; gap: 8px; }
#todo-input { flex: 1; padding: 8px; background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 6px; color: #e0e0e0; }
#add-todo { padding: 8px 16px; border: 1px solid #00ff41; background: transparent; color: #00ff41; border-radius: 6px; cursor: pointer; }
```

## Step 4: JavaScript
```javascript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  userName: 'string',
  quickLinks: 'string',
  todos: 'string'
}), 'local');

// Clock & Greeting
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  let greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  storage.get('userName').then(name => {
    document.getElementById('greeting').textContent = name ? `${greeting}, ${name}` : greeting;
  });
}
updateClock();
setInterval(updateClock, 1000);

// Search
document.getElementById('search').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const q = e.target.value.trim();
    if (q) window.location.href = q.match(/^https?:\/\//) ? q : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  }
});

// Quick Links
async function loadLinks() {
  const raw = await storage.get('quickLinks');
  let links = raw ? JSON.parse(raw) : null;
  if (!links) {
    const topSites = await chrome.topSites.get();
    links = topSites.slice(0, 8).map(s => ({ title: s.title, url: s.url }));
    await storage.set('quickLinks', JSON.stringify(links));
  }
  const container = document.getElementById('quick-links');
  container.innerHTML = '';
  links.forEach((link, i) => {
    const domain = new URL(link.url).hostname.replace('www.', '');
    const card = document.createElement('div');
    card.className = 'link-card';
    card.innerHTML = `<span class="remove" data-idx="${i}">x</span><div class="title">${link.title || domain}</div><div class="domain">${domain}</div>`;
    card.onclick = (e) => e.target.classList.contains('remove') ? removeLink(i) : (window.location.href = link.url);
    container.appendChild(card);
  });
}

async function removeLink(idx) {
  const raw = await storage.get('quickLinks');
  const links = raw ? JSON.parse(raw) : [];
  links.splice(idx, 1);
  await storage.set('quickLinks', JSON.stringify(links));
  loadLinks();
}

document.getElementById('add-link').onclick = async () => {
  const url = prompt('URL:');
  if (!url) return;
  const title = prompt('Title (optional):');
  const raw = await storage.get('quickLinks');
  const links = raw ? JSON.parse(raw) : [];
  links.push({ title: title || '', url: url.startsWith('http') ? url : 'https://' + url });
  await storage.set('quickLinks', JSON.stringify(links));
  loadLinks();
};

// Todos
async function loadTodos() {
  const raw = await storage.get('todos');
  const todos = raw ? JSON.parse(raw) : [];
  const list = document.getElementById('todo-list');
  list.innerHTML = '';
  todos.forEach(todo => {
    const div = document.createElement('div');
    div.className = `todo-item ${todo.done ? 'done' : ''}`;
    div.innerHTML = `<input type="checkbox" ${todo.done ? 'checked' : ''}><span class="todo-text">${todo.text}</span><button class="todo-delete">x</button>`;
    div.querySelector('input').onchange = () => toggleTodo(todo.id);
    div.querySelector('.todo-delete').onclick = () => deleteTodo(todo.id);
    list.appendChild(div);
  });
}

async function addTodo(text) {
  const raw = await storage.get('todos');
  const todos = raw ? JSON.parse(raw) : [];
  todos.push({ id: Date.now(), text, done: false });
  await storage.set('todos', JSON.stringify(todos));
  loadTodos();
}

async function toggleTodo(id) {
  const raw = await storage.get('todos');
  const todos = raw ? JSON.parse(raw) : [];
  const t = todos.find(t => t.id === id);
  if (t) t.done = !t.done;
  await storage.set('todos', JSON.stringify(todos));
  loadTodos();
}

async function deleteTodo(id) {
  const raw = await storage.get('todos');
  await storage.set('todos', JSON.stringify((raw ? JSON.parse(raw) : []).filter(t => t.id !== id)));
  loadTodos();
}

document.getElementById('add-todo').onclick = () => {
  const input = document.getElementById('todo-input');
  if (input.value.trim()) { addTodo(input.value.trim()); input.value = ''; }
};
document.getElementById('todo-input').onkeydown = (e) => {
  if (e.key === 'Enter' && e.target.value.trim()) { addTodo(e.target.value.trim()); e.target.value = ''; }
};

// First run
storage.get('userName').then(n => { if (!n) { const name = prompt('What should I call you?'); if (name) storage.set('userName', name); } });
loadLinks();
loadTodos();
```

## Next Steps
- Background image from API or custom upload
- Weather widget
- Theme customization
- Bookmark integration
