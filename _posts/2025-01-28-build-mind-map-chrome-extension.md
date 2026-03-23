---
layout: post
title: "Build a Mind Map Chrome Extension: Complete Guide to Brainstorming in Your Browser"
description: "Learn how to build a powerful mind map Chrome extension for brainstorming and thought organization. This comprehensive guide covers Manifest V3, canvas rendering, local storage, and user interaction design."
date: 2025-01-28
categories: [Chrome-Extensions, Productivity]
tags: [chrome-extension, productivity, project]
keywords: "mind map extension, brainstorm chrome, thought organizer extension, chrome mind mapping tool, visual brainstorming extension"
canonical_url: "https://bestchromeextensions.com/2025/01/28/build-mind-map-chrome-extension/"
---

# Build a Mind Map Chrome Extension: Complete Guide to Brainstorming in Your Browser

Mind mapping is one of the most powerful techniques for organizing thoughts, brainstorming ideas, and structuring complex information. When you combine the accessibility of mind mapping with the convenience of a Chrome extension, you create a tool that can transform how users think and work directly within their browser. we will walk through the complete process of building a mind map Chrome extension from scratch, covering everything from project setup to advanced features like export capabilities and cloud synchronization.

Whether you are a beginner looking to learn Chrome extension development or an experienced developer wanting to create a productivity tool, this guide will provide you with the knowledge and practical code examples needed to build a production-ready mind mapping extension.

---

Why Build a Mind Map Chrome Extension? {#why-mind-map-extension}

The demand for visual thinking tools has never been higher. Professionals across industries use mind mapping for project planning, note-taking, problem-solving, and creative brainstorming. A Chrome extension that brings this functionality directly into the browser offers several compelling advantages over standalone applications.

The Browser as Your Workspace

Chrome is where many people spend most of their digital time. Having a mind mapping tool embedded in the browser means users can capture ideas the moment they arise without switching between applications. Whether researching a topic, reading emails, or browsing social media, thoughts can be immediately organized into visual mind maps without context switching.

Smooth Integration with Web Content

A Chrome extension mind map tool can interact with web content in ways standalone apps cannot. Users can select text from any webpage and instantly add it as a node in their mind map. This creates a powerful research workflow where information gathering and idea organization happen simultaneously.

Offline-First Architecture

Chrome extensions work offline using service workers and local storage. Your mind map extension can function without an internet connection, syncing data when connectivity returns. This makes it reliable for users who work in various environments or travel frequently.

Monetization Potential

Productivity tools like mind mapping extensions have proven monetization models. You can offer a free version with basic features and a premium tier with advanced capabilities like cloud sync, unlimited mind maps, export formats, and collaboration features.

---

Project Planning and Architecture {#project-planning}

Before writing any code, let us establish a clear architecture for our mind map Chrome extension. This will ensure the development process stays organized and the final product meets user expectations.

Core Features

Our mind map extension will include the following essential features:

1. Node Creation and Editing: Users can add, edit, and delete nodes in their mind map
2. Drag and Drop Positioning: Intuitive node repositioning through mouse interaction
3. Connection Lines: Visual connections between related nodes
4. Color Coding: Ability to color-code nodes for categorization
5. Text Formatting: Basic formatting options for node content
6. Save and Load: Persistent storage using Chrome's storage API
7. Export Functionality: Export mind maps as images or JSON

Extension Architecture

We will use the modern Manifest V3 architecture, which provides better security and performance. The extension will consist of:

- Popup Interface: A quick-access popup for creating new mind maps
- Full-Page Interface: A dedicated page for working with mind maps in detail
- Content Script: For capturing selected text from webpages
- Background Service Worker: For handling storage operations and messaging

---

Setting Up the Project Structure {#project-structure}

Let us create the foundation for our extension. First, create a new directory for your project and set up the essential files.

Manifest Configuration

The manifest.json file defines our extension and its capabilities:

```json
{
  "manifest_version": 3,
  "name": "MindFlow - Visual Thought Organizer",
  "version": "1.0.0",
  "description": "Capture and organize your thoughts with visual mind maps directly in Chrome",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Directory Structure

Create the following folder structure:

```
mind-map-extension/
 icons/
    icon16.png
    icon48.png
    icon128.png
 popup.html
 popup.js
 popup.css
 background.js
 content.js
 mindmap.html
 mindmap.js
 mindmap.css
 manifest.json
```

---

Building the Popup Interface {#popup-interface}

The popup provides quick access to create new mind maps or access existing ones. Let us build a clean, functional popup interface.

popup.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MindFlow</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <h1>MindFlow</h1>
      <p class="tagline">Visual Thought Organizer</p>
    </header>
    
    <div class="action-buttons">
      <button id="newMindMap" class="primary-btn">
        <span class="icon">+</span> New Mind Map
      </button>
      <button id="openMindMap" class="secondary-btn">
        <span class="icon"></span> Open Recent
      </button>
    </div>
    
    <div id="recentList" class="recent-list">
      <h3>Recent Mind Maps</h3>
      <ul id="recentMaps"></ul>
    </div>
    
    <div class="capture-section">
      <button id="captureSelection" class="capture-btn">
        <span class="icon"></span> Add Selection to Mind Map
      </button>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

popup.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 320px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
}

.popup-container {
  padding: 16px;
}

.popup-header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.popup-header h1 {
  font-size: 20px;
  color: #1a73e8;
  margin-bottom: 4px;
}

.tagline {
  font-size: 12px;
  color: #5f6368;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.primary-btn, .secondary-btn {
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.primary-btn {
  background: #1a73e8;
  color: white;
}

.primary-btn:hover {
  background: #1557b0;
}

.secondary-btn {
  background: #f1f3f4;
  color: #202124;
}

.secondary-btn:hover {
  background: #e8eaed;
}

.recent-list {
  margin-bottom: 16px;
}

.recent-list h3 {
  font-size: 12px;
  color: #5f6368;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.recent-list ul {
  list-style: none;
}

.recent-list li {
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.recent-list li:hover {
  background: #e8eaed;
}

.capture-section {
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.capture-btn {
  width: 100%;
  padding: 10px;
  background: transparent;
  border: 1px dashed #1a73e8;
  border-radius: 6px;
  color: #1a73e8;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.capture-btn:hover {
  background: #e8f0fe;
}
```

popup.js

```javascript
document.addEventListener('DOMContentLoaded', () => {
  loadRecentMaps();
  
  document.getElementById('newMindMap').addEventListener('click', createNewMindMap);
  document.getElementById('openMindMap').addEventListener('click', openRecentMindMap);
  document.getElementById('captureSelection').addEventListener('click', captureSelection);
});

function loadRecentMaps() {
  chrome.storage.local.get(['recentMaps'], (result) => {
    const maps = result.recentMaps || [];
    const listElement = document.getElementById('recentMaps');
    
    if (maps.length === 0) {
      listElement.innerHTML = '<li class="empty">No recent mind maps</li>';
      return;
    }
    
    maps.slice(0, 5).forEach((map, index) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${map.title}</strong><br><small>${map.date}</small>`;
      li.addEventListener('click', () => openMindMap(map.id));
      listElement.appendChild(li);
    });
  });
}

function createNewMindMap() {
  const mapId = Date.now().toString();
  const newMap = {
    id: mapId,
    title: 'Untitled Mind Map',
    date: new Date().toLocaleDateString(),
    nodes: [{
      id: 'root',
      text: 'Central Idea',
      x: 400,
      y: 300,
      color: '#1a73e8'
    }],
    connections: []
  };
  
  chrome.storage.local.get(['mindMaps'], (result) => {
    const maps = result.mindMaps || [];
    maps.push(newMap);
    chrome.storage.local.set({ mindMaps: maps });
    updateRecentMaps(newMap);
  });
  
  chrome.tabs.create({ url: 'mindmap.html?id=' + mapId });
}

function openMindMap(mapId) {
  chrome.tabs.create({ url: 'mindmap.html?id=' + mapId });
}

function openRecentMindMap() {
  chrome.storage.local.get(['recentMaps'], (result) => {
    const maps = result.recentMaps || [];
    if (maps.length > 0) {
      openMindMap(maps[0].id);
    }
  });
}

function captureSelection() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'captureText' });
  });
}

function updateRecentMaps(newMap) {
  chrome.storage.local.get(['recentMaps'], (result) => {
    let recent = result.recentMaps || [];
    recent = [newMap, ...recent].slice(0, 10);
    chrome.storage.local.set({ recentMaps: recent });
  });
}
```

---

Building the Mind Map Canvas {#mind-map-canvas}

The core of our extension is the mind map canvas where users create and organize their ideas. We will use HTML5 Canvas for rendering.

mindmap.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MindFlow - Mind Map Editor</title>
  <link rel="stylesheet" href="mindmap.css">
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-left">
      <button id="addNode" class="tool-btn" title="Add Node">
        <span></span> Add Node
      </button>
      <button id="addChild" class="tool-btn" title="Add Child Node">
        <span>↳</span> Add Child
      </button>
      <button id="deleteNode" class="tool-btn danger" title="Delete Node">
        <span></span> Delete
      </button>
    </div>
    
    <div class="toolbar-center">
      <input type="text" id="mapTitle" class="title-input" value="Untitled Mind Map">
    </div>
    
    <div class="toolbar-right">
      <button id="changeColor" class="tool-btn" title="Change Color">
        <span></span> Color
      </button>
      <button id="exportImage" class="tool-btn" title="Export as Image">
        <span></span> Export
      </button>
      <button id="saveMap" class="tool-btn primary">
        <span></span> Save
      </button>
    </div>
  </div>
  
  <div class="color-picker" id="colorPicker" style="display: none;">
    <div class="color-option" data-color="#1a73e8" style="background: #1a73e8;"></div>
    <div class="color-option" data-color="#34a853" style="background: #34a853;"></div>
    <div class="color-option" data-color="#fbbc04" style="background: #fbbc04;"></div>
    <div class="color-option" data-color="#ea4335" style="background: #ea4335;"></div>
    <div class="color-option" data-color="#9334e6" style="background: #9334e6;"></div>
    <div class="color-option" data-color="#00acc1" style="background: #00acc1;"></div>
  </div>
  
  <div class="canvas-container">
    <canvas id="mindMapCanvas"></canvas>
  </div>
  
  <div class="node-editor" id="nodeEditor" style="display: none;">
    <textarea id="nodeText" placeholder="Enter node text..."></textarea>
    <div class="editor-buttons">
      <button id="saveNode" class="btn-primary">Save</button>
      <button id="cancelEdit" class="btn-secondary">Cancel</button>
    </div>
  </div>
  
  <script src="mindmap.js"></script>
</body>
</html>
```

mindmap.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.toolbar-left, .toolbar-right {
  display: flex;
  gap: 8px;
}

.tool-btn {
  padding: 8px 14px;
  border: 1px solid #dadce0;
  border-radius: 6px;
  background: #ffffff;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #f1f3f4;
}

.tool-btn.primary {
  background: #1a73e8;
  color: white;
  border-color: #1a73e8;
}

.tool-btn.primary:hover {
  background: #1557b0;
}

.tool-btn.danger:hover {
  background: #fce8e6;
  color: #d93025;
  border-color: #d93025;
}

.title-input {
  font-size: 16px;
  font-weight: 500;
  border: none;
  outline: none;
  padding: 6px 12px;
  border-radius: 4px;
  width: 300px;
  text-align: center;
}

.title-input:focus {
  background: #f1f3f4;
}

.canvas-container {
  flex: 1;
  position: relative;
  background: #fafafa;
  background-image: radial-gradient(circle, #dadce0 1px, transparent 1px);
  background-size: 20px 20px;
}

#mindMapCanvas {
  position: absolute;
  top: 0;
  left: 0;
  cursor: grab;
}

#mindMapCanvas:active {
  cursor: grabbing;
}

.color-picker {
  position: absolute;
  top: 70px;
  left: 20px;
  background: white;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 200;
}

.color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.color-option:hover {
  transform: scale(1.15);
}

.node-editor {
  position: absolute;
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 300;
  min-width: 200px;
}

.node-editor textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid #dadce0;
  border-radius: 6px;
  padding: 10px;
  font-size: 14px;
  resize: vertical;
  outline: none;
  font-family: inherit;
}

.node-editor textarea:focus {
  border-color: #1a73e8;
}

.editor-buttons {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 8px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-secondary {
  background: #f1f3f4;
  color: #202124;
}
```

mindmap.js

The JavaScript file handles all the canvas rendering, node manipulation, and interaction logic:

```javascript
class MindMap {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.connections = [];
    this.selectedNode = null;
    this.draggingNode = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.mapId = null;
    
    this.nodeRadius = 70;
    this.colors = {
      default: '#1a73e8',
      selected: '#1557b0',
      text: '#ffffff'
    };
    
    this.init();
  }
  
  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    
    this.loadMap();
    this.render();
  }
  
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight - 56;
    this.render();
  }
  
  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - this.panX;
    const y = e.clientY - rect.top - this.panY;
    
    // Check if clicking on a node
    for (const node of this.nodes) {
      const distance = Math.sqrt((x - node.x)  2 + (y - node.y)  2);
      if (distance <= this.nodeRadius) {
        this.selectedNode = node;
        this.draggingNode = node;
        this.offsetX = x - node.x;
        this.offsetY = y - node.y;
        this.render();
        return;
      }
    }
    
    // Start panning
    this.isPanning = true;
    this.panStartX = e.clientX;
    this.panStartY = e.clientY;
    this.selectedNode = null;
    this.render();
  }
  
  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - this.panX;
    const y = e.clientY - rect.top - this.panY;
    
    if (this.draggingNode) {
      this.draggingNode.x = x - this.offsetX;
      this.draggingNode.y = y - this.offsetY;
      this.render();
    } else if (this.isPanning) {
      this.panX += e.clientX - this.panStartX;
      this.panY += e.clientY - this.panStartY;
      this.panStartX = e.clientX;
      this.panStartY = e.clientY;
      this.render();
    }
  }
  
  handleMouseUp(e) {
    this.draggingNode = null;
    this.isPanning = false;
  }
  
  handleDoubleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - this.panX;
    const y = e.clientY - rect.top - this.panY;
    
    // Check if double-clicking on a node
    for (const node of this.nodes) {
      const distance = Math.sqrt((x - node.x)  2 + (y - node.y)  2);
      if (distance <= this.nodeRadius) {
        this.editNode(node);
        return;
      }
    }
    
    // Create new node at click position
    this.addNode(x, y);
  }
  
  addNode(x, y, text = 'New Node', parentId = null) {
    const node = {
      id: 'node_' + Date.now(),
      text: text,
      x: x,
      y: y,
      color: this.colors.default,
      parentId: parentId
    };
    
    this.nodes.push(node);
    
    if (parentId) {
      this.connections.push({
        from: parentId,
        to: node.id
      });
    }
    
    this.selectedNode = node;
    this.render();
    this.saveMap();
    
    return node;
  }
  
  editNode(node) {
    const editor = document.getElementById('nodeEditor');
    const textarea = document.getElementById('nodeText');
    
    editor.style.display = 'block';
    editor.style.left = (node.x + this.panX + this.nodeRadius) + 'px';
    editor.style.top = (node.y + this.panY) + 'px';
    
    textarea.value = node.text;
    textarea.focus();
    
    const saveHandler = () => {
      node.text = textarea.value || 'Untitled';
      editor.style.display = 'none';
      this.render();
      this.saveMap();
      textarea.removeEventListener('click', saveHandler);
    };
    
    document.getElementById('saveNode').onclick = saveHandler;
    document.getElementById('cancelEdit').onclick = () => {
      editor.style.display = 'none';
    };
  }
  
  deleteSelectedNode() {
    if (!this.selectedNode || this.selectedNode.id === 'root') {
      return;
    }
    
    // Remove node and its connections
    this.nodes = this.nodes.filter(n => n.id !== this.selectedNode.id);
    this.connections = this.connections.filter(
      c => c.from !== this.selectedNode.id && c.to !== this.selectedNode.id
    );
    
    this.selectedNode = null;
    this.render();
    this.saveMap();
  }
  
  changeNodeColor(color) {
    if (this.selectedNode) {
      this.selectedNode.color = color;
      this.render();
      this.saveMap();
    }
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    
    // Draw connections
    this.connections.forEach(conn => {
      const fromNode = this.nodes.find(n => n.id === conn.from);
      const toNode = this.nodes.find(n => n.id === conn.to);
      
      if (fromNode && toNode) {
        this.drawConnection(fromNode, toNode);
      }
    });
    
    // Draw nodes
    this.nodes.forEach(node => {
      this.drawNode(node);
    });
    
    this.ctx.restore();
  }
  
  drawConnection(from, to) {
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.strokeStyle = '#bdc1c6';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }
  
  drawNode(node) {
    // Draw node circle
    this.ctx.beginPath();
    this.ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = node.color;
    this.ctx.fill();
    
    // Draw selection ring
    if (this.selectedNode && this.selectedNode.id === node.id) {
      this.ctx.strokeStyle = '#202124';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }
    
    // Draw text
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const maxWidth = this.nodeRadius * 1.6;
    const words = node.text.split(' ');
    let lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      if (this.ctx.measureText(testLine).width < maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
    
    const lineHeight = 18;
    const startY = node.y - (lines.length - 1) * lineHeight / 2;
    
    lines.forEach((line, index) => {
      this.ctx.fillText(line, node.x, startY + index * lineHeight);
    });
  }
  
  async loadMap() {
    const urlParams = new URLSearchParams(window.location.search);
    this.mapId = urlParams.get('id');
    
    if (!this.mapId) {
      // Create default root node
      this.nodes = [{
        id: 'root',
        text: 'Central Idea',
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        color: this.colors.default
      }];
      return;
    }
    
    chrome.storage.local.get(['mindMaps'], (result) => {
      const maps = result.mindMaps || [];
      const map = maps.find(m => m.id === this.mapId);
      
      if (map) {
        this.nodes = map.nodes || [];
        this.connections = map.connections || [];
        document.getElementById('mapTitle').value = map.title || 'Untitled';
        this.render();
      }
    });
  }
  
  saveMap() {
    if (!this.mapId) return;
    
    const title = document.getElementById('mapTitle').value;
    
    chrome.storage.local.get(['mindMaps'], (result) => {
      const maps = result.mindMaps || [];
      const mapIndex = maps.findIndex(m => m.id === this.mapId);
      
      const mapData = {
        id: this.mapId,
        title: title,
        nodes: this.nodes,
        connections: this.connections,
        lastModified: new Date().toISOString()
      };
      
      if (mapIndex >= 0) {
        maps[mapIndex] = mapData;
      } else {
        maps.push(mapData);
      }
      
      chrome.storage.local.set({ mindMaps: maps });
    });
  }
  
  exportAsImage() {
    const link = document.createElement('a');
    link.download = 'mindmap.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }
}

// Initialize the mind map
let mindMap;

document.addEventListener('DOMContentLoaded', () => {
  mindMap = new MindMap('mindMapCanvas');
  
  // Toolbar event listeners
  document.getElementById('addNode').addEventListener('click', () => {
    const centerX = (window.innerWidth / 2) - mindMap.panX;
    const centerY = (window.innerHeight / 2) - mindMap.panY;
    mindMap.addNode(centerX + Math.random() * 100 - 50, centerY + Math.random() * 100 - 50);
  });
  
  document.getElementById('addChild').addEventListener('click', () => {
    if (!mindMap.selectedNode) {
      alert('Please select a node first');
      return;
    }
    const parent = mindMap.selectedNode;
    const childX = parent.x + (Math.random() > 0.5 ? 150 : -150);
    const childY = parent.y + (Math.random() * 200 - 100);
    mindMap.addNode(childX, childY, 'New Child', parent.id);
  });
  
  document.getElementById('deleteNode').addEventListener('click', () => {
    mindMap.deleteSelectedNode();
  });
  
  document.getElementById('changeColor').addEventListener('click', () => {
    const picker = document.getElementById('colorPicker');
    picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
  });
  
  document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      mindMap.changeNodeColor(option.dataset.color);
      document.getElementById('colorPicker').style.display = 'none';
    });
  });
  
  document.getElementById('exportImage').addEventListener('click', () => {
    mindMap.exportAsImage();
  });
  
  document.getElementById('saveMap').addEventListener('click', () => {
    mindMap.saveMap();
    alert('Mind map saved!');
  });
  
  // Auto-save on title change
  document.getElementById('mapTitle').addEventListener('change', () => {
    mindMap.saveMap();
  });
});
```

---

Content Script for Text Capture {#content-script}

The content script enables users to capture text from any webpage and add it directly to their mind map.

content.js

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureText') {
    const selection = window.getSelection().toString();
    
    if (selection.trim()) {
      // Store selected text temporarily
      chrome.storage.local.set({ capturedText: selection });
      
      // Open mind map with captured text
      chrome.storage.local.get(['recentMaps'], (result) => {
        let maps = result.recentMaps || [];
        
        if (maps.length > 0) {
          // Add to most recent map
          const recentMapId = maps[0].id;
          chrome.tabs.create({ 
            url: `mindmap.html?id=${recentMapId}&capture=${encodeURIComponent(selection)}` 
          });
        } else {
          // Create new map with captured text
          chrome.tabs.create({ 
            url: 'mindmap.html?new=true&capture=' + encodeURIComponent(selection) 
          });
        }
      });
    } else {
      alert('Please select some text on the page first.');
    }
  }
});
```

---

Background Service Worker {#background-worker}

The background script handles extension lifecycle events and manages state.

background.js

```javascript
// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize storage with default values
    chrome.storage.local.set({
      mindMaps: [],
      recentMaps: [],
      settings: {
        defaultColor: '#1a73e8',
        autoSave: true
      }
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getSettings') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse(result.settings);
    });
    return true;
  }
});
```

---

Testing Your Extension {#testing}

To test your mind map extension:

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select your extension directory
4. Pin the extension to your Chrome toolbar
5. Click the extension icon to create a new mind map

Test the following features:
- Create new nodes by double-clicking
- Drag nodes to reposition them
- Pan the canvas by clicking and dragging empty space
- Add child nodes from selected parent nodes
- Change node colors
- Export the mind map as an image
- Save and reload mind maps
- Use the content script to capture text from webpages

---

Advanced Features to Consider {#advanced-features}

Once you have the basic mind map extension working, consider adding these advanced features:

Cloud Synchronization

Implement cloud sync using Firebase or a similar backend service to allow users to access their mind maps across multiple devices.

Collaboration Features

Add real-time collaboration using WebSockets, allowing multiple users to work on the same mind map simultaneously.

Templates

Create pre-built mind map templates for common use cases like project planning, meeting notes, and study outlines.

Keyboard Shortcuts

Implement keyboard shortcuts for common actions like adding nodes, deleting nodes, and saving.

Import and Export Formats

Support additional export formats like JSON, Markdown, and PDF, as well as import functionality from other mind mapping tools.

---

Conclusion {#conclusion}

Building a mind map Chrome extension is an excellent project that combines creative UI design with practical browser extension development skills. The extension we have built in this guide provides a solid foundation that you can extend and customize based on your users' needs.

The key concepts we covered include Manifest V3 configuration, HTML5 Canvas rendering for the mind map visualization, Chrome's storage API for persistence, content scripts for web integration, and the overall architecture of a Chrome extension.

As you continue to develop your extension, remember to focus on user experience, make node creation intuitive, ensure smooth canvas interactions, and provide helpful features like auto-save and export options. With these fundamentals in place, you have everything you need to create a powerful productivity tool that helps users organize their thoughts directly in their browser.

Start building your mind map extension today, and transform the way people brainstorm and organize ideas on the web.
