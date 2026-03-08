# Common Errors and Troubleshooting

A practical reference for Chrome extension developers encountering runtime errors during development and distribution.

## Unchecked runtime.lastError {#unchecked-runtimelasterror}

The `runtime.lastError` property appears when a Chrome API call fails but the callback does not explicitly handle the error. This is one of the most common warnings seen in the extension console.

Common causes

- Calling a Chrome API with an invalid argument, such as a malformed tab ID or an incorrect permission scope
- Attempting to communicate with a content script that has already been unloaded
- Using a callback-based API in an async function without proper error handling

Fixes

Always check `runtime.lastError` inside every callback from Chrome APIs:

```javascript
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (chrome.runtime.lastError) {
    console.error('Tab query failed:', chrome.runtime.lastError.message);
    return;
  }
  // proceed with tabs[0]
});
```

For async/await code, wrap Chrome API calls in a function that rejects on `lastError`:

```javascript
function queryTabs(queryInfo) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}
```

Prefer the Promise-based versions of Chrome APIs when available in Manifest V3.

## Could not establish connection {#could-not-establish-connection}

This error occurs when the extension attempts to send a message but cannot reach the recipient. It typically manifests as "Could not establish connection. Receiving end does not exist."

Common causes

- The content script is not injected into the target page
- The service worker has terminated and has not been woken yet
- The background script is still loading when the message is sent

Troubleshooting steps

1. Verify the content script is declared in `manifest.json` and matches the target URL patterns
2. Check that the target tab is fully loaded before sending messages
3. Use `chrome.runtime.sendMessage` with a timeout to handle unresponsive contexts:

```javascript
function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
```

For service workers, acknowledge that they may be dormant. Implement retry logic or wake the service worker with a ping before sending actual messages.

## Extension context invalidated {#extension-context-invalidated}

This error appears when trying to use a context that has been destroyed, typically after an extension update or when a page refresh invalidates the extension's view.

Detection

The error message reads: "Extension context invalidated" and typically occurs in message handlers or when accessing extension APIs from a stale context.

Recovery strategies

- Implement try/catch blocks around API calls that may access invalidated contexts
- Use a health-check function before performing critical operations:

```javascript
async function isContextValid() {
  try {
    await chrome.runtime.getManifest();
    return true;
  } catch (e) {
    return false;
  }
}
```

- Listen for the `runtime.onSuspend` event in background scripts to clean up state
- Avoid caching extension API objects; call them fresh each time

## Service worker registration failures {#service-worker-registration-failures}

Manifest V3 uses service workers instead of background pages, and registration can fail for several reasons.

Common causes

- The service worker file path is incorrect in `manifest.json`
- Syntax errors in the service worker file prevent execution
- The service worker exceeds the 128KB compressed limit for initial load (Chrome will still load it but may terminate it aggressively)
- Memory pressure causes Chrome to terminate the worker

Resolutions

- Double-check the `background.service_worker` path in the manifest matches the actual file location
- Use the "Errors" and "Warnings" tabs in `chrome://extensions` to see specific failure reasons
- Keep the service worker lean by offloading heavy computation to offscreen documents
- Register for lifecycle events to log when the worker starts and stops:

```javascript
self.addEventListener('install', (event) => {
  console.log('Service worker installed');
});

self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});
```

## Refused to execute inline script {#refused-to-execute-inline-script}

This CSP violation occurs when the extension attempts to run inline JavaScript, which is prohibited by Chrome's content security policy for extensions.

Fixes

1. Move all inline scripts to separate files and load them via `<script src="...">`
2. For content scripts, use programmatic injection with `chrome.scripting.executeScript` instead of declaring scripts in the manifest
3. If you must evaluate dynamic code, use `chrome.scripting.executeScript` with a function:

```javascript
chrome.scripting.executeScript({
  target: { tabId: tabId },
  func: () => {
    // This runs in the page context
    document.body.style.backgroundColor = 'lightgray';
  }
});
```

4. Do not use `eval()`, `new Function()`, or inline event handlers like `onclick="..."` in extension pages

## CORS blocked XMLHttpRequest {#cors-blocked-xmlhttprequest}

Extensions can make cross-origin requests that bypass CORS when using the appropriate permissions, but misconfiguration leads to blocks.

Solutions

- Add the target host to the `permissions` array in `manifest.json`:

```json
{
  "permissions": [
    "https://api.example.com/*"
  ]
}
```

- Use `fetch` with the `cors` mode from the extension background or content script with proper permissions
- For requests from content scripts, consider passing data to the background script and making the request there:

```javascript
// From content script
chrome.runtime.sendMessage({ url: 'https://api.example.com/data' }, (response) => {
  // handle response
});
```

- Avoid `XMLHttpRequest` in favor of the Fetch API, which integrates better with Chrome's permission system

## Message port closed before response {#message-port-closed-before-response}

This error occurs when the sender closes the message channel before the receiver responds, or when the receiver's message port becomes invalid.

Async fixes

- Use `chrome.runtime.sendNativeMessage` with proper Promise handling
- Implement a timeout pattern to avoid waiting indefinitely:

```javascript
function sendMessageWithTimeout(message, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Message port closed before response'));
    }, timeout);
    
    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
```

- Ensure that both sender and receiver stay alive during the message exchange
- For long-running operations, establish a persistent port with `chrome.runtime.connect` instead of one-time messages

## Storage quota exceeded {#storage-quota-exceeded}

When using `chrome.storage.local` or `chrome.storage.sync`, you are limited to approximately 5MB for sync and 10MB for local storage (exact limits vary).

Cleanup approaches

- Implement a periodic cleanup routine that removes old data:

```javascript
async function cleanupOldData() {
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  const now = Date.now();
  
  const result = await chrome.storage.local.get('cachedItems');
  const validItems = (result.cachedItems || []).filter(
    item => now - item.timestamp < MAX_AGE_MS
  );
  
  await chrome.storage.local.set({ cachedItems: validItems });
}
```

- Use `chrome.storage.quota.get` to check available space before writing large amounts of data
- Consider using IndexedDB for large datasets instead of storage API
- Implement a least-recently-used (LRU) cache that automatically evicts old entries when approaching the limit

## Extension may have been corrupted {#extension-may-have-been-corrupted}

This warning appears when Chrome detects that an extension's files have been modified outside of the expected update mechanism.

Causes

- Manual editing of extension files in the profile directory
- Antivirus or disk utilities modifying extension files
- Crashed update process leaving partial files
- Loading an unpacked extension from a directory that was moved or edited

Resolution

- Uninstall and reinstall the extension from the Chrome Web Store
- For development, use `chrome://extensions` in developer mode and click "Reload" rather than modifying files directly
- If using a crx file, ensure it is not being extracted and modified during installation

## Permission not granted handling {#permission-not-granted-handling}

Extensions can declare permissions that users must approve, but some permissions are not granted automatically and require explicit user action.

Handling patterns

- Use optional permissions for features that are not essential:

```javascript
// Request optional permission at runtime
chrome.permissions.request(
  { permissions: ['bookmarks'] },
  (granted) => {
    if (granted) {
      console.log('Bookmarks permission granted');
    } else {
      console.log('Bookmarks permission denied');
    }
  }
);
```

- Always check whether a permission is active before using the corresponding API:

```javascript
chrome.permissions.contains({ permissions: ['bookmarks'] }, (result) => {
  if (result) {
    // use chrome.bookmarks
  } else {
    // prompt user or disable feature
  }
});
```

- Provide graceful degradation when permissions are denied rather than crashing
- Include clear messaging in your extension's UI about why specific permissions are needed

## Additional resources {#additional-resources}

For persistent issues not covered here, consult the official Chrome Extensions documentation and the Chrome Extension bug tracker. The developer community at zovo.one frequently discusses troubleshooting patterns for Manifest V3 implementations and can provide context-specific guidance for complex error scenarios.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
