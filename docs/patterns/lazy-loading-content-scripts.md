---
layout: default
title: "Chrome Extension Lazy Loading Content Scripts — Best Practices"
description: "Optimize extension performance with lazy loading patterns for content scripts that only run when needed."
---

# Lazy Loading Content Scripts
On-demand and conditional content script injection for Chrome Extensions (MV3).
## Static vs Dynamic
**Static (manifest.json)** - Always injected:
```json
{ "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"] }] }
```
**Dynamic (chrome.scripting.executeScript)** - On-demand:
```javascript
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });
});
```
## When to Lazy Load
- Heavy scripts with complex DOM manipulation
- User-triggered features (clicks, context menus)
- Conditional features based on page state
## Trigger Patterns
```javascript
// Icon click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => console.log('Injected')
  });
});

// Context menu
chrome.contextMenus.create({ id: 'analyze', title: 'Analyze', contexts: ['page'] });
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'analyze') {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['analyzer.js']
    });
  }
});
```
## World: ISOLATED vs MAIN
```javascript
// ISOLATED (default) - sandboxed
await chrome.scripting.executeScript({
  target: { tabId: tab.id }, world: 'ISOLATED',
  func: () => { /* cannot access page vars */ }
});
// MAIN - page context
await chrome.scripting.executeScript({
  target: { tabId: tab.id }, world: 'MAIN',
  func: () => window.pageVar
});
```
## Injection Targets
```javascript
// All frames
await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
// Specific frame
await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [frameId] }, files: ['content.js'] });
```
## Check If Injected
```javascript
async function injectIfNeeded(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.__EXTENSION_INJECTED__
  });
  if (!results[0]?.result) {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  }
}
```
## Bootstrap + Lazy Load
```javascript
// bootstrap.js (static)
document.addEventListener('click', async (e) => {
  if (e.target.matches('[data-lazy]')) {
    await chrome.runtime.sendMessage({ type: 'LOAD_FEATURE' });
  }
});
// background.js
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'LOAD_FEATURE' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['full-feature.js']
    });
  }
});
```
## CSS Injection
```javascript
await chrome.scripting.insertCSS({ target: { tabId }, files: ['style.css'] });
await chrome.scripting.removeCSS({ target: { tabId }, files: ['style.css'] });
```
## Error Handling
```javascript
try {
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
} catch (error) {
  if (error.message.includes('Cannot access contents')) console.log('Restricted page');
  else if (error.message.includes('No tab with id')) console.log('Tab closed');
}
```
## Related
- [Lazy Loading Patterns Guide](../../guides/lazy-loading-patterns.md)
- [Scripting API Reference](../../api-reference/scripting-api.md)
- [Dynamic Content Scripts (MV3)](../../mv3/dynamic-content-scripts.md)
