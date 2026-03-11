---
layout: post
title: "Build a ChatGPT Sidebar Chrome Extension: Complete Developer Guide"
description: "Learn how to build a powerful ChatGPT sidebar Chrome extension with this comprehensive developer guide. Integrate OpenAI's GPT models directly into your browser for seamless AI assistance on any webpage."
date: 2025-01-28
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "chatgpt sidebar extension, ai sidebar chrome, openai assistant"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/28/build-chatgpt-sidebar-chrome-extension/"
---

# Build a ChatGPT Sidebar Chrome Extension: Complete Developer Guide

In the evolving landscape of AI-powered productivity tools, having direct access to ChatGPT while browsing can dramatically enhance your workflow. Imagine selecting text on any webpage and instantly getting AI-powered explanations, or having an AI assistant available in a collapsible sidebar as you research topics online. This comprehensive guide will walk you through building a fully functional ChatGPT sidebar Chrome extension from scratch.

By the end of this tutorial, you will have created an extension that provides a sleek, dockable sidebar where users can interact with OpenAI's GPT models without leaving their current tab. This project demonstrates several key Chrome extension development concepts including side panel implementation, content script injection, background service workers, and secure API communication.

---

## Prerequisites and Setup {#prerequisites}

Before diving into the code, ensure you have the following tools and accounts ready:

### Required Tools

You will need a modern code editor like Visual Studio Code, Node.js installed on your system, and the latest version of Google Chrome or a Chromium-based browser for testing. Basic knowledge of HTML, CSS, and JavaScript will help you understand the implementation details, though we will explain each component thoroughly.

### OpenAI API Key

To make your extension functional, you will need an OpenAI API key. Visit [platform.openai.com](https://platform.openai.com) to create an account and generate an API key. Keep in mind that API calls will incur charges based on usage, so monitor your usage through the OpenAI dashboard.

---

## Project Structure {#project-structure}

Create a new folder for your project and set up the following directory structure:

```
chatgpt-sidebar-extension/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── popup.css
├── sidebar.html
├── sidebar.js
├── sidebar.css
├── content.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

This structure separates the various components of the extension logically. The manifest defines the extension configuration, background scripts handle API communication, popup files create the browser action interface, and the sidebar files implement the main AI interaction interface.

---

## The Manifest File: Configuring Your Extension {#manifest-file}

The manifest.json file is the heart of any Chrome extension. It tells Chrome about your extension's capabilities, permissions, and entry points. For our ChatGPT sidebar extension, we will use Manifest V3, which is the current standard:

```json
{
  "manifest_version": 3,
  "name": "ChatGPT Sidebar - AI Assistant",
  "version": "1.0.0",
  "description": "Access ChatGPT AI assistant in a convenient sidebar on any webpage",
  "permissions": [
    "sidePanel",
    "storage",
    "activeTab",
    "scripting"
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
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

This manifest configuration enables several key features. The sidePanel permission allows us to open a persistent sidebar in Chrome, while storage lets us save user preferences like API keys. The activeTab and scripting permissions enable content script injection for features like text selection. The host permissions with `<all_urls>` allow the extension to work on any website.

---

## Background Service Worker: Handling API Communication {#background-worker}

The background service worker acts as the bridge between your extension and OpenAI's API. It handles authentication, manages API requests, and keeps sensitive operations away from the user-facing interfaces. Create a background.js file with the following implementation:

```javascript
// background.js - Service Worker for ChatGPT Sidebar Extension

// Handle messages from popup and sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_SIDEBAR') {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  }
  
  if (message.type === 'SEND_TO_OPENAI') {
    handleOpenAIRequest(message.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'GET_API_KEY') {
    chrome.storage.local.get(['apiKey'], (result) => {
      sendResponse({ apiKey: result.apiKey });
    });
    return true;
  }
  
  if (message.type === 'SAVE_API_KEY') {
    chrome.storage.local.set({ apiKey: message.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

async function handleOpenAIRequest(data) {
  const { prompt, model = 'gpt-3.5-turbo', temperature = 0.7 } = data;
  
  // Get API key from storage
  const result = await chrome.storage.local.get(['apiKey']);
  const apiKey = result.apiKey;
  
  if (!apiKey) {
    throw new Error('API key not configured. Please add your OpenAI API key in the extension popup.');
  }
  
  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant in a browser sidebar. Provide clear, concise, and useful responses.' },
        { role: 'user', content: prompt }
      ],
      temperature: temperature,
      max_tokens: 2000
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'API request failed');
  }
  
  const responseData = await response.json();
  return responseData.choices[0].message.content;
}

// Optional: Set default side panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);
```

This service worker implements several critical functions. It listens for messages from other extension components, retrieves and stores the OpenAI API key securely using Chrome's storage API, and makes authenticated requests to OpenAI's chat completion endpoint. The async response pattern ensures that API calls complete properly before sending responses back to the caller.

---

## The Popup Interface: Configuration and Quick Access {#popup-interface}

The popup provides a lightweight interface for quick configuration and access. While the sidebar is where the main interaction happens, the popup serves as a convenient entry point and settings management interface.

### popup.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChatGPT Sidebar</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <div class="header">
      <h1>🤖 ChatGPT Sidebar</h1>
    </div>
    
    <div class="content">
      <div class="api-key-section">
        <label for="apiKey">OpenAI API Key:</label>
        <input type="password" id="apiKey" placeholder="sk-..." />
        <button id="saveApiKey">Save Key</button>
        <p class="hint">Get your key from <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a></p>
      </div>
      
      <div class="status" id="status"></div>
      
      <button id="openSidebar" class="primary-button">
        Open ChatGPT Sidebar
      </button>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### popup.css

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  background: #ffffff;
  color: #333;
}

.popup-container {
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.header h1 {
  font-size: 18px;
  color: #10a37f;
}

.api-key-section {
  margin-bottom: 20px;
}

.api-key-section label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.api-key-section input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 10px;
}

.api-key-section button {
  width: 100%;
  padding: 8px;
  background: #10a37f;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.api-key-section button:hover {
  background: #0d8c6d;
}

.hint {
  font-size: 11px;
  color: #666;
  margin-top: 8px;
}

.hint a {
  color: #10a37f;
  text-decoration: none;
}

.status {
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 15px;
  display: none;
}

.status.success {
  display: block;
  background: #d4edda;
  color: #155724;
}

.status.error {
  display: block;
  background: #f8d7da;
  color: #721c24;
}

.primary-button {
  width: 100%;
  padding: 12px;
  background: #10a37f;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-button:hover {
  background: #0d8c6d;
}
```

### popup.js

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveButton = document.getElementById('saveApiKey');
  const openSidebarButton = document.getElementById('openSidebar');
  const statusDiv = document.getElementById('status');
  
  // Check if API key exists
  chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response) => {
    if (response.apiKey) {
      apiKeyInput.value = response.apiKey;
      showStatus('API key loaded', 'success');
    }
  });
  
  // Save API key
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    
    if (!apiKey.startsWith('sk-')) {
      showStatus('Invalid API key format', 'error');
      return;
    }
    
    chrome.runtime.sendMessage({ type: 'SAVE_API_KEY', apiKey }, (response) => {
      if (response.success) {
        showStatus('API key saved successfully!', 'success');
      }
    });
  });
  
  // Open sidebar
  openSidebarButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR' });
    window.close();
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }
});
```

---

## The Sidebar: Main AI Interaction Interface {#sidebar-implementation}

The sidebar is where users will spend most of their time interacting with the AI. It needs to be visually appealing, responsive, and provide a smooth chat experience.

### sidebar.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChatGPT Sidebar</title>
  <link rel="stylesheet" href="sidebar.css">
</head>
<body>
  <div class="sidebar-container">
    <div class="sidebar-header">
      <h2>🤖 AI Assistant</h2>
      <div class="header-controls">
        <select id="modelSelect" class="model-selector">
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="gpt-4">GPT-4</option>
        </select>
        <button id="clearChat" class="icon-button" title="Clear Chat">🗑️</button>
      </div>
    </div>
    
    <div id="chatContainer" class="chat-container">
      <div class="message bot-message">
        <div class="message-avatar">🤖</div>
        <div class="message-content">
          <p>Hello! I'm your AI assistant in the sidebar. Ask me anything, or select text on the page and click the extension icon to get explanations.</p>
        </div>
      </div>
    </div>
    
    <div class="input-container">
      <textarea 
        id="userInput" 
        placeholder="Type your message..." 
        rows="3"
      ></textarea>
      <button id="sendButton" class="send-button">
        <span>➤</span>
      </button>
    </div>
    
    <div class="selection-info" id="selectionInfo" style="display: none;">
      <span>Selected text will be included in your query</span>
    </div>
  </div>
  
  <script src="sidebar.js"></script>
</body>
</html>
```

### sidebar.css

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  height: 100vh;
  background: #f8f9fa;
  color: #333;
}

.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  background: #10a37f;
  color: white;
}

.sidebar-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.header-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.model-selector {
  padding: 5px 8px;
  border-radius: 4px;
  border: none;
  font-size: 12px;
  cursor: pointer;
}

.icon-button {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
}

.icon-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  display: flex;
  gap: 10px;
  max-width: 90%;
}

.message.bot-message {
  align-self: flex-start;
}

.message.user-message {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.bot-message .message-avatar {
  background: #10a37f;
}

.user-message .message-avatar {
  background: #343a40;
  color: white;
}

.message-content {
  background: #f1f3f4;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
}

.user-message .message-content {
  background: #10a37f;
  color: white;
}

.message-content p {
  margin: 0;
  white-space: pre-wrap;
}

.input-container {
  padding: 15px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 10px;
  align-items: flex-end;
  background: white;
}

#userInput {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  font-family: inherit;
}

#userInput:focus {
  outline: none;
  border-color: #10a37f;
}

.send-button {
  width: 40px;
  height: 40px;
  background: #10a37f;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-button:hover {
  background: #0d8c6d;
}

.send-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.selection-info {
  padding: 8px 15px;
  background: #fff3cd;
  font-size: 12px;
  color: #856404;
  text-align: center;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #10a37f;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-10px);
  }
}
```

### sidebar.js

```javascript
// sidebar.js - Main Chat Interface Logic

let chatHistory = [];
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const modelSelect = document.getElementById('modelSelect');
const clearChatButton = document.getElementById('clearChat');

// Send message on button click
sendButton.addEventListener('click', sendMessage);

// Send message on Enter (Shift+Enter for new line)
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Clear chat
clearChatButton.addEventListener('click', () => {
  chatHistory = [];
  chatContainer.innerHTML = `
    <div class="message bot-message">
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <p>Chat cleared! How can I help you?</p>
      </div>
    </div>
  `;
});

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;
  
  // Add user message to chat
  addMessage(message, 'user');
  userInput.value = '';
  
  // Show typing indicator
  showTypingIndicator();
  
  try {
    // Get selected text if any
    const selectedText = await getSelectedText();
    const fullPrompt = selectedText 
      ? `Context from webpage: "${selectedText}"\n\nUser question: ${message}`
      : message;
    
    // Send to background script for API call
    const response = await chrome.runtime.sendMessage({
      type: 'SEND_TO_OPENAI',
      data: {
        prompt: fullPrompt,
        model: modelSelect.value
      }
    });
    
    // Remove typing indicator
    removeTypingIndicator();
    
    if (response.success) {
      addMessage(response.data, 'bot');
    } else {
      addMessage(`Error: ${response.error}`, 'bot');
    }
  } catch (error) {
    removeTypingIndicator();
    addMessage(`Error: ${error.message}`, 'bot');
  }
}

function addMessage(content, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message`;
  
  const avatar = sender === 'bot' ? '🤖' : '👤';
  
  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <p>${escapeHtml(content)}</p>
    </div>
  `;
  
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  // Add to history
  chatHistory.push({ role: sender === 'user' ? 'user' : 'assistant', content });
}

function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'message bot-message';
  indicator.id = 'typingIndicator';
  indicator.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  chatContainer.appendChild(indicator);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) {
    indicator.remove();
  }
}

async function getSelectedText() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SELECTED_TEXT' }, (response) => {
      resolve(response?.text || '');
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

---

## Content Script: Handling Text Selection {#content-script}

The content script enables the powerful feature of selecting text on any webpage and getting AI explanations. Create content.js:

```javascript
// content.js - Handle text selection and page interactions

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SELECTED_TEXT') {
    const selection = window.getSelection();
    sendResponse({ text: selection.toString().trim() });
  }
});

// Optional: Add a floating button when text is selected
document.addEventListener('mouseup', (e) => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText.length > 10 && selectedText.length < 1000) {
    // Could implement a floating button here
    // For now, we rely on the sidebar button in the toolbar
  }
});
```

---

## Testing Your Extension {#testing}

Now that you have created all the necessary files, it is time to test your extension in Chrome:

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top right corner
3. Click "Load unpacked" and select your project folder
4. The extension icon should appear in your Chrome toolbar

### Using the Extension

1. Click the extension icon to open the popup
2. Enter your OpenAI API key and click "Save Key"
3. Click "Open ChatGPT Sidebar" to launch the sidebar
4. Type messages and interact with the AI
5. Select text on any webpage and use the sidebar to get contextual explanations

### Troubleshooting

If you encounter issues, check the following:

- **API Key Error**: Ensure your API key is saved correctly. The key must start with `sk-`
- **API Quota**: Check your OpenAI account for available credits
- **Network Issues**: Ensure you can access api.openai.com from your browser
- **Console Errors**: Right-click the extension icon, choose "Inspect popup" or "Inspect sidebar" to view console logs

---

## Advanced Features to Consider {#advanced-features}

This basic implementation provides a solid foundation, but there are many ways to enhance your ChatGPT sidebar extension:

### Conversation History

Implement local storage to save conversation history, allowing users to revisit previous discussions. Use Chrome's storage API with appropriate data encryption for sensitive conversations.

### Multiple AI Models

Expand the model selector to include GPT-4 Turbo, Claude, or other AI providers. Each provider has different API endpoints and authentication methods.

### Voice Input

Integrate the Web Speech API to enable voice-to-text input, making the extension more accessible and convenient for hands-free use.

### Text-to-Speech

Add speech synthesis to have the AI responses read aloud. This is particularly useful for language learners or users who prefer audio feedback.

### Prompt Templates

Create pre-built prompt templates for common tasks like summarizing articles, translating text, or explaining complex concepts. Users can select templates from a dropdown menu.

### Keyboard Shortcuts

Implement keyboard shortcuts to quickly open the sidebar, send messages, or toggle the extension. Use the Chrome commands API for global shortcuts that work even when the extension is not focused.

---

## Publishing Your Extension {#publishing}

Once you have tested your extension thoroughly and added any desired enhancements, you can publish it to the Chrome Web Store:

1. Create a developer account at the [Chrome Web Store](https://chromewebstore.google.com/)
2. Package your extension using the "Pack extension" button in developer mode
3. Upload your packaged extension through the developer dashboard
4. Fill in the store listing details including name, description, and screenshots
5. Submit for review (typically takes a few hours to a few days)

Ensure you comply with Chrome's policies, particularly regarding user data handling and API key security. Consider implementing OAuth2 authentication instead of storing API keys directly for a more secure production release.

---

## Conclusion {#conclusion}

Building a ChatGPT sidebar Chrome extension is an excellent project that combines modern web development techniques with the power of AI. This guide covered the essential components: manifest configuration, background service workers, popup interfaces, sidebar implementation, and content scripts.

The extension you built provides a seamless AI assistant experience directly in the browser, enabling users to get help with any content they encounter online. From researching topics to explaining complex concepts, having an AI assistant always available in the sidebar transforms web browsing into a more productive experience.

As you continue developing, remember to prioritize user experience, security best practices, and performance optimization. The foundation created in this guide can be extended with countless features to create a truly unique and valuable tool for Chrome users worldwide.

---

## Frequently Asked Questions {#faq}

**Is this extension free to use?**

The extension itself is free, but users need their own OpenAI API key, which incurs usage-based charges. OpenAI provides free credits for new accounts.

**Can I use this with other AI models?**

Yes, the implementation supports different GPT models. You can expand it to support other AI providers by modifying the API calls in the background script.

**Is my API key secure?**

API keys are stored in Chrome's local storage. For production extensions, consider implementing OAuth2 authentication to avoid storing keys directly.

**Does this work on all websites?**

Yes, the extension works on all URLs due to the host permissions in the manifest. However, some websites with strict Content Security Policies may have limitations.

**Can I customize the sidebar appearance?**

Yes, the sidebar uses standard CSS and can be fully customized. You can modify the colors, fonts, layout, and add additional UI elements.

**How do I handle rate limiting from OpenAI?**

Implement request queuing and exponential backoff in your background script. Show appropriate error messages to users when rate limits are exceeded.
