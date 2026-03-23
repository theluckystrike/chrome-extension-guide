---
layout: default
title: "Chrome Extension Clipboard API. How to Copy and Paste Programmatically"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/clipboard-api/"
---
# Clipboard API Guide

Overview {#overview}
- Modern approach: `navigator.clipboard` API
- Legacy fallback: `document.execCommand()` for older browsers
- Requires permissions in Manifest V3 for certain operations
- Offscreen documents needed for background script clipboard access in MV3

Using the Clipboard API (Modern) {#using-clipboard-api}

The `navigator.clipboard` API provides a modern, promise-based interface for clipboard operations. This is the recommended approach for content scripts and pages where the API is available.

```javascript
// Copy text to clipboard
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('Text copied successfully');
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

// Read text from clipboard
async function pasteText() {
  try {
    const text = await navigator.clipboard.readText();
    console.log('Pasted text:', text);
    return text;
  } catch (err) {
    console.error('Failed to read clipboard:', err);
  }
}

// Copy HTML to clipboard
async function copyHtml(html, plainText) {
  const item = new ClipboardItem({
    'text/html': new Blob([html], { type: 'text/html' }),
    'text/plain': new Blob([plainText], { type: 'text/plain' })
  });
  await navigator.clipboard.write([item]);
}
```

Permissions {#permissions}

For clipboard operations, permissions requirements vary based on your extension's architecture and target use cases.

Manifest V3 Permissions

```json
{
  "permissions": [
    "clipboardRead",
    "clipboardWrite"
  ]
}
```

The `clipboardWrite` permission allows your extension to write to the clipboard without user interaction. The `clipboardRead` permission requires explicit user gesture (such as a click) to read clipboard contents, unless your extension is the currently active tab.

Host Permissions

If you need clipboard access for specific websites, you can request host permissions:

```json
{
  "host_permissions": [
    "https://*.example.com/*"
  ]
}
```

execCommand Fallback {#execCommand-fallback}

For older browsers or environments where `navigator.clipboard` isn't available, use the legacy `document.execCommand()` approach. This method requires a visible textarea or input element.

```javascript
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  
  textarea.select();
  textarea.focus();
  
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }
  
  document.body.removeChild(textarea);
  return success;
}

function fallbackPaste() {
  return new Promise((resolve, reject) => {
    const textarea = document.createElement('textarea');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    
    textarea.select();
    textarea.focus();
    
    try {
      const text = textarea.value;
      document.body.removeChild(textarea);
      resolve(text);
    } catch (err) {
      document.body.removeChild(textarea);
      reject(err);
    }
  });
}
```

Offscreen Documents in Manifest V3 {#offscreen-documents}

In Manifest V3, service workers cannot access the DOM directly, which means `navigator.clipboard` isn't available in the background script. Use offscreen documents to perform clipboard operations that require DOM access.

Creating an Offscreen Document

```javascript
// In your background service worker
async function copyWithOffscreen(text) {
  // Check if an offscreen document is already open
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (existingContexts.length === 0) {
    // Create a new offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD'],
      justification: 'Copy text to clipboard from background script'
    });
  }
  
  // Send message to the offscreen document
  const response = await chrome.runtime.sendMessage({
    target: 'offscreen',
    action: 'copy',
    text: text
  });
  
  return response.success;
}
```

Offscreen Document Handler

```javascript
// In offscreen.html
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'copy') {
    navigator.clipboard.writeText(message.text)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'paste') {
    navigator.clipboard.readText()
      .then((text) => sendResponse({ success: true, text: text }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
```

Security Considerations {#security}

When working with clipboard operations in Chrome extensions, several security concerns must be addressed to protect user data and maintain trust.

User Gesture Requirements

The Clipboard API requires a user gesture (such as a click or keypress) for read operations in most contexts. This prevents malicious extensions from silently reading sensitive data from the clipboard. Always trigger clipboard read operations in response to explicit user actions.

Data Validation

Always validate and sanitize clipboard data before using it:

```javascript
async function safePaste() {
  const text = await navigator.clipboard.readText();
  
  // Validate the data
  if (!text || typeof text !== 'string') {
    return null;
  }
  
  // Sanitize if needed (e.g., remove potentially dangerous content)
  const sanitized = text.slice(0, 10000); // Limit length
  
  return sanitized;
}
```

Sensitive Data Handling

Be cautious when writing sensitive data to the clipboard. Consider implementing a feature that clears clipboard data after a timeout:

```javascript
async function copySensitiveData(data, clearAfterMs = 30000) {
  await navigator.clipboard.writeText(data);
  
  // Clear clipboard after timeout
  setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === data) {
        await navigator.clipboard.writeText('');
      }
    } catch (err) {
      // Ignore errors during cleanup
    }
  }, clearAfterMs);
}
```

Cross-Origin Restrictions

Clipboard operations are subject to cross-origin restrictions. Ensure your extension has appropriate permissions and that the page has focus when attempting to read clipboard contents.

Best Practices {#best-practices}

Follow these recommendations for reliable clipboard functionality across different extension contexts:

- Use `navigator.clipboard` as the primary method when available
- Implement `execCommand` fallback for broader compatibility
- Use offscreen documents for background script clipboard access in MV3
- Always request minimal permissions needed for your use case
- Handle errors gracefully and provide user feedback
- Test clipboard functionality across different Chrome versions and contexts
