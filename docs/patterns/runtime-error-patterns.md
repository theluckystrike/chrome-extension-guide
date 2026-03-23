---
layout: default
title: "Chrome Extension Runtime Error Patterns. Best Practices"
description: "Handle and recover from runtime errors gracefully."
canonical_url: "https://bestchromeextensions.com/patterns/runtime-error-patterns/"
---

Chrome Runtime Error Patterns

This guide covers systematic handling of `chrome.runtime` errors in Chrome extensions.

The Fundamental Rule: Check chrome.runtime.lastError {#the-fundamental-rule-check-chromeruntimelasterror}

Every callback from a Chrome API must check `chrome.runtime.lastError`. If you don't check it, errors will be silently swallowed and may cause hard-to-debug issues.

```javascript
//  WRONG - errors are silently ignored
chrome.tabs.query({ active: true }, (tabs) => {
  console.log(tabs[0].id); // May be undefined if error occurred
});

//  CORRECT - always check lastError
chrome.tabs.query({ active: true }, (tabs) => {
  if (chrome.runtime.lastError) {
    console.error('Tab query failed:', chrome.runtime.lastError.message);
    return;
  }
  console.log(tabs[0].id);
});
```

Common Chrome Runtime Errors {#common-chrome-runtime-errors}

"Could not establish connection. Receiving end does not exist" {#could-not-establish-connection-receiving-end-does-not-exist}

Cause: No listener is registered for the message, or the content script wasn't injected.

```javascript
// Sender side - handle the error
chrome.tabs.sendMessage(tabId, { action: 'getData' }, (response) => {
  if (chrome.runtime.lastError) {
    // Content script not loaded or tab closed
    console.log('Content script not available');
  }
});
```

Fix: Ensure content script is registered in manifest and injected into the target tab.

"Extension context invalidated" {#extension-context-invalidated}

Cause: Extension was updated or reloaded while an async operation was pending.

```javascript
// After extension update, pending callbacks fail with this error
chrome.storage.local.get('key', (result) => {
  if (chrome.runtime.lastError?.message.includes('invalidated')) {
    // Extension was updated - user must refresh the page
    notifyUser('Please refresh the page to continue');
  }
});
```

"The message port closed before a response was received" {#the-message-port-closed-before-a-response-was-received}

Cause: `sendResponse` was not called in time, or the context was destroyed.

```javascript
// In message listener - always respond or return true to keep channel open
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'asyncOperation') {
    doAsyncWork().then(result => {
      sendResponse({ success: true, data: result });
    });
    return true; // Keep message channel open for async response
  }
});
```

Promise-Based APIs (Manifest V3) {#promise-based-apis-manifest-v3}

In MV3, many Chrome APIs return Promises. Errors become Promise rejections:

```javascript
// MV3 style - use try/catch
try {
  const [tab] = await chrome.tabs.query({ active: true });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => console.log('Injected!')
  });
} catch (error) {
  // Error may wrap chrome.runtime.lastError
  if (error.message.includes('No tab with id')) {
    // Tab was closed between query and script execution
  }
}
```

Safe Chrome API Wrapper {#safe-chrome-api-wrapper}

```javascript
/
 * Wraps Chrome API calls to handle lastError properly
 * @param {Function} apiCall - Function that takes a callback
 * @returns {Promise} Resolves with result or rejects with Error
 */
function wrapChromeAPI(apiCall) {
  return new Promise((resolve, reject) => {
    apiCall((result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

// Usage
try {
  const tabs = await wrapChromeAPI(cb => chrome.tabs.query({ active: true }, cb));
} catch (error) {
  console.error('Failed to query tabs:', error.message);
}
```

Error Categorization {#error-categorization}

Transient Errors (Retry-OK) {#transient-errors-retry-ok}

- Network timeout - Retry with exponential backoff
- Tab closed during operation - Re-query tabs before retry
- Storage temporarily unavailable - Retry after delay

Permanent Errors (Fix Required) {#permanent-errors-fix-required}

- No permission - Add required permission to manifest
- Extension context invalidated - User action required
- Invalid parameters - Fix the code logic

```javascript
function isTransientError(error) {
  const transientPatterns = [
    'Could not establish connection',
    'Tab closed',
    'No tab with id'
  ];
  return transientPatterns.some(p => error.message?.includes(p));
}
```

Cross-References {#cross-references}

- [Reference: Error Handling](../reference/error-handling.md)
- [Patterns: Error Handling](./error-handling.md)
- [Patterns: Extension Error Recovery](./extension-error-recovery.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
