# Runtime Error Patterns

## Introduction

Handling errors in Chrome extensions requires a systematic approach due to the asynchronous nature of the Chrome APIs and the complex communication channels between different extension contexts. This guide covers patterns for properly handling chrome.runtime errors, understanding common error types, and building robust error-handling infrastructure.

## Understanding chrome.runtime.lastError

The `chrome.runtime.lastError` property is a critical part of error handling in Chrome extension APIs. **You must check this value in every callback function** from Chrome APIs, or the error will go uncaught and may cause unexpected behavior.

```javascript
// ❌ WRONG - ignoring lastError
chrome.tabs.get(tabId, (tab) => {
  console.log(tab.title); // May crash if tab doesn't exist
});

// ✅ CORRECT - always check lastError
chrome.tabs.get(tabId, (tab) => {
  if (chrome.runtime.lastError) {
    console.error('Failed to get tab:', chrome.runtime.lastError.message);
    return;
  }
  console.log(tab.title);
});
```

## Common Chrome Runtime Errors

### "Could not establish connection"

This error occurs when trying to communicate with a context that doesn't have a listener set up. Common causes:

- Sending a message to a content script that hasn't been injected yet
- Trying to connect to an extension page that hasn't loaded
- The receiving end was closed before the message arrived

```javascript
// Solution: Check if the port is valid before sending
const port = chrome.tabs.connect(tabId, { frameId: 0 });
if (!port) {
  throw new Error('Could not establish connection to tab');
}
port.postMessage({ action: 'ping' });
```

### "Extension context invalidated"

This happens when the extension context is no longer valid, typically after:

- The extension was updated or reloaded
- The user disabled and re-enabled the extension
- The extension context was garbage collected

```javascript
// Handle context invalidation in your message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    // Process message
    sendResponse({ success: true });
  } catch (error) {
    // Check if it's a context invalidation error
    if (error.message.includes('Extension context invalidated')) {
      console.warn('Extension context invalidated, ask user to reload');
      sendResponse({ error: 'Please reload the extension' });
    }
  }
  return true; // Keep channel open for async response
});
```

### "The message port closed before a response was received"

This error occurs when:

- The sendResponse callback is not called within the listener's scope
- The content script page unloads before responding
- Not returning `true` from the listener for async responses

```javascript
// ✅ CORRECT - return true for async responses
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'asyncOperation') {
    doAsyncWork().then(result => {
      sendResponse({ result });
    });
    return true; // Important: keeps message channel open
  }
});
```

## Promise-Based APIs in Manifest V3

In Manifest V3, many Chrome APIs return Promises instead of using callbacks. Error handling changes from checking `lastError` to using try/catch with rejected promises:

```javascript
// MV3 Promise-based API
async function getStorageData(keys) {
  try {
    const data = await chrome.storage.local.get(keys);
    return data;
  } catch (error) {
    // Handle the error appropriately
    console.error('Storage get failed:', error.message);
    throw error;
  }
}
```

## Building a Safe Chrome API Wrapper

Create a helper function that wraps Chrome APIs and handles errors consistently:

```javascript
function safeChromeApi(apiCall) {
  return new Promise((resolve, reject) => {
    try {
      const result = apiCall();
      // For callback-based APIs
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

// Usage
async function getTab(tabId) {
  return safeChromeApi(() => {
    chrome.tabs.get(tabId, (tab) => {
      // lastError is handled by wrapper
    });
  });
}
```

## Error Categorization

### Transient Errors (Retry-Able)

These errors may succeed if retried:

- Network-related failures
- Temporary resource unavailability
- Rate limiting (back off and retry)

```javascript
const TRANSIENT_ERRORS = [
  'Could not establish connection',
  'No tab with id',
];

function isTransient(error) {
  return TRANSIENT_ERRORS.some(e => error.message?.includes(e));
}

async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (!isTransient(error) || i === maxRetries - 1) {
        throw error;
      }
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

### Permanent Errors (Fix Required)

These require code changes:

- Missing permissions
- Invalid parameters
- Context invalidated

## Logging with Context

Always log errors with sufficient context for debugging:

```javascript
function logError(context, error) {
  console.error(`[${context}] Error:`, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    extensionState: chrome.runtime.lastError,
  });
}

// Usage
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (chrome.runtime.lastError) {
    logError('tabs.query', chrome.runtime.lastError);
    return;
  }
  // Process tabs
});
```

## Cross-Reference

- [Error Handling Guide](../reference/error-handling.md)
- [Extension Error Recovery Patterns](./extension-error-recovery.md)
- [Background Script Best Practices](../guides/background-patterns.md)
