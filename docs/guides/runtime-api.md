# Chrome Runtime API

## Introduction

The `chrome.runtime` API is the cornerstone of Chrome extension development, providing essential functionality for extension lifecycle management, message passing, and resource access. This API enables communication between different extension components, handles installation and update events, and provides access to extension metadata. Understanding the Runtime API is fundamental to building robust and well-architected Chrome extensions.

The Runtime API serves multiple critical purposes: facilitating inter-component communication through message passing, managing extension state across browser sessions, and providing utilities for common extension tasks. Whether you're building a simple extension or a complex application with multiple components, the Runtime API will be an essential part of your toolkit.

## Message Passing Fundamentals

### chrome.runtime.sendMessage

The `chrome.runtime.sendMessage` method enables one-time message sending between extension components. This method is ideal for simple request-response patterns where you need to send a message and receive a single response. Messages can be sent from content scripts to the background service worker, between different extension pages, or even to other extensions.

```javascript
// Sending a message from content script to background
chrome.runtime.sendMessage(
  { type: 'GET_CONFIG', payload: { key: 'apiKey' } },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error('Message failed:', chrome.runtime.lastError.message);
      return;
    }
    console.log('Received response:', response);
  }
);

// Sending to a specific extension
chrome.runtime.sendMessage(
  'other-extension-id',
  { type: 'HELLO' },
  (response) => {
    // Handle response from other extension
  }
);
```

The sendMessage method accepts three parameters: the extensionId (optional), the message object, and an optional callback for the response. When no extensionId is provided, the message is sent within your own extension. The callback receives the response from the message handler, or undefined if no handler responded.

### chrome.runtime.onMessage

The `chrome.runtime.onMessage` listener receives messages sent via `sendMessage`. Your handler function receives three parameters: the message object, the sender information, and a sendResponse function. This is where you implement your message handling logic.

```javascript
// Basic message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message from:', sender.url || sender.id);
  
  if (message.type === 'GET_CONFIG') {
    const config = { apiKey: 'secret-key-123' };
    sendResponse(config);
  }
  
  // Return false for synchronous responses
  return false;
});

// Async response pattern - return true to keep channel open
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FETCH_DATA') {
    // Return true to indicate async response
    fetch(message.payload.url)
      .then(res => res.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    
    return true; // Keep message channel open for async response
  }
});

// Modern MV3 pattern - return a Promise
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'FETCH_USER') {
    return fetchUserById(message.payload.userId);
  }
  return false;
});
```

Important: Always return `true` from your listener if you intend to send an asynchronous response using the sendResponse callback. If you return false or don't return anything, the message channel will close before your async operation completes.

## Persistent Connections

### chrome.runtime.connect

For scenarios requiring frequent bidirectional communication, `chrome.runtime.connect` creates a long-lived connection through a Port object. This is more efficient than repeated sendMessage calls when you need ongoing communication between components, such as streaming data or maintaining state synchronization.

```javascript
// Creating a connection from a content script
const port = chrome.runtime.connect({ name: 'popup-content-channel' });

// Send messages through the port
port.postMessage({ type: 'INIT', tabId: 123 });

// Listen for responses
port.onMessage.addListener((message) => {
  console.log('Received from background:', message);
});

// Handle connection errors
port.onDisconnect.addListener(() => {
  console.log('Disconnected from background');
  if (chrome.runtime.lastError) {
    console.error('Disconnect error:', chrome.runtime.lastError.message);
  }
});
```

The connect method accepts an optional parameter to specify connection options. The `name` property identifies the connection and allows different parts of your extension to use separate channels. This is particularly useful when you have multiple content scripts or popup connections that need different handling.

### chrome.runtime.onConnect

The `chrome.runtime.onConnect` listener fires when a connection is established via `connect()`. This listener receives the Port object, which you use to exchange messages. The Port maintains the connection until either party disconnects.

```javascript
// Listening for incoming connections
chrome.runtime.onConnect.addListener((port) => {
  console.log('New connection:', port.name, 'from', port.sender?.url);
  
  if (port.name === 'popup-content-channel') {
    port.onMessage.addListener((message) => {
      handlePopupMessage(message, port);
    });
  }
  
  if (port.name === 'streaming-channel') {
    // Set up streaming handler
    port.onMessage.addListener((message) => {
      if (message.type === 'START') {
        startStreaming(port);
      }
    });
  }
});

function handlePopupMessage(message, port) {
  if (message.type === 'GET_TAB_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      port.postMessage({ 
        type: 'TAB_INFO', 
        data: tabs[0] 
      });
    });
  }
}
```

Connections automatically handle reconnection scenarios. When a content script reloads or a page navigates, the port disconnects, and you can set up new connections when needed. This makes ports more resilient than one-time messages for dynamic content.

## Extension Resources and Metadata

### chrome.runtime.getURL

The `chrome.runtime.getURL` method converts a relative path within your extension's directory to a fully-qualified URL. This is essential for accessing extension resources like images, HTML pages, or other assets from your content scripts or popup pages.

```javascript
// Get URL for extension resource
const iconUrl = chrome.runtime.getURL('images/icon.png');
const popupUrl = chrome.runtime.getURL('popup.html');
const scriptUrl = chrome.runtime.getURL('scripts/content.js');

// Using in content script
document.querySelector('#logo').src = chrome.runtime.getURL('images/logo.png');

// Dynamically injecting a script
chrome.runtime.getURL('scripts/injected.js').then((url) => {
  const script = document.createElement('script');
  script.src = url;
  document.head.appendChild(script);
});
```

This method returns URLs in the format `chrome-extension://<extension-id>/path/to/resource`. The extension ID is automatically included, making these URLs stable and accessible from any extension context. Remember that content scripts can only load resources from within your extension package.

### chrome.runtime.getManifest

The `chrome.runtime.getManifest` method returns the complete manifest.json as a JavaScript object. This allows your extension code to access its own metadata at runtime, which is useful for displaying version information, checking permissions, or implementing feature flags based on manifest configuration.

```javascript
// Accessing manifest data
const manifest = chrome.runtime.getManifest();

console.log('Extension version:', manifest.version);
console.log('Extension name:', manifest.name);
console.log('Permissions:', manifest.permissions);

// Conditional logic based on manifest
if (manifest.permissions.includes('storage')) {
  enableStorageFeatures();
}

if (manifest.permissions.includes('tabs')) {
  enableTabFeatures();
}

// Display version to user
const versionInfo = `Version ${manifest.version} (${manifest.version_name || 'no codename'})`;
document.getElementById('version').textContent = versionInfo;
```

This method is particularly valuable for debugging and logging, allowing you to include extension version information in error reports. It's also useful for extensions that need to adapt their behavior based on permissions or manifest configuration without hardcoding these values.

## Extension Lifecycle Management

### chrome.runtime.reload

The `chrome.runtime.reload` method reloads the extension, essentially reinstalling it without requiring manual intervention. This is useful during development for testing changes, or in production for implementing update mechanisms that require a full reload.

```javascript
// Reload the extension
function reloadExtension() {
  try {
    chrome.runtime.reload();
    console.log('Extension reloaded successfully');
  } catch (error) {
    console.error('Failed to reload:', error);
  }
}

// Add to developer options
document.getElementById('reload-btn').addEventListener('click', () => {
  chrome.runtime.reload();
});
```

Note that `chrome.runtime.reload` can only be called from the background script or extension pages, not from content scripts. Additionally, this method is restricted in certain contexts and may not work in all scenarios, particularly in some enterprise environments.

### chrome.runtime.setUninstallURL

The `chrome.runtime.setUninstallURL` sets the URL that opens when the user uninstalls your extension from the Chrome extensions page. This URL can point to a survey, thank-you page, or any other web page where you can collect feedback about why users are uninstalling your extension.

```javascript
// Set uninstall URL on extension startup
chrome.runtime.setUninstallURL('https://yourdomain.com/uninstall-survey?reason={REASON}')
  .then(() => {
    console.log('Uninstall URL set successfully');
  })
  .catch((error) => {
    console.error('Failed to set uninstall URL:', error);
  });

// With dynamic parameters
const surveyUrl = `https://yourdomain.com/uninstall?
  version=${chrome.runtime.getManifest().version}&
  id=${chrome.runtime.id}`;

chrome.runtime.setUninstallURL(surveyUrl);
```

The uninstall URL can include a `{REASON}` placeholder that Chrome replaces with a numeric code indicating how the extension was uninstalled. This allows you to track whether users manually uninstalled the extension or if it was removed due to being corrupted or during a browser reset.

## Event Listeners

### chrome.runtime.onInstalled

The `chrome.runtime.onInstalled` event fires when the extension is first installed, when the extension is updated to a new version, or when Chrome itself is updated to a new version. This is the ideal place to initialize extension state, set up default configurations, or migrate data from previous versions.

```javascript
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Installation event:', details.reason);
  
  if (details.reason === 'install') {
    // First-time installation
    initializeDefaultSettings();
    createInitialData();
    console.log('Extension installed for the first time');
  }
  
  if (details.reason === 'update') {
    // Extension was updated
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;
    
    console.log(`Updated from ${previousVersion} to ${currentVersion}`);
    migrateUserData(previousVersion, currentVersion);
  }
  
  if (details.reason === 'chrome_update') {
    // Chrome browser was updated
    console.log('Chrome was updated, extension may need adjustments');
  }
});

async function initializeDefaultSettings() {
  await chrome.storage.local.set({
    theme: 'light',
    notifications: true,
    syncEnabled: false,
    data: {}
  });
}
```

The `details` object contains the `reason` string indicating why the event fired and optionally the `previousVersion` for update events. This event only fires in the background service worker, making it the central place for one-time initialization logic.

### chrome.runtime.onStartup

The `chrome.runtime.onStartup` fires when a Chrome profile starts, including when Chrome itself starts and when a new profile is switched to. This event is useful for initializing background tasks or checking state that needs to be set up on each browser startup.

```javascript
chrome.runtime.onStartup.addListener(() => {
  console.log('Browser profile started');
  
  // Initialize any startup tasks
  initializeDailyQuota();
  checkSubscriptionStatus();
  syncWithServer();
});

async function initializeDailyQuota() {
  const { dailyLimit, usedToday } = await chrome.storage.local.get([
    'dailyLimit',
    'usedToday'
  ]);
  
  // Reset daily usage if it's a new day
  const today = new Date().toDateString();
  if (usedToday?.date !== today) {
    await chrome.storage.local.set({
      usedToday: { date: today, count: 0 }
    });
  }
}
```

This event is particularly valuable for extensions that need to perform periodic tasks or maintain synchronization with external services. Unlike onInstalled, onStartup fires on every browser launch, making it essential for extensions that need persistent background operations.

### chrome.runtime.onSuspend

The `chrome.runtime.onSuspend` fires just before the service worker is terminated due to inactivity. This is your last opportunity to save state or complete pending operations before the background script is unloaded. However, you should not rely on this event for critical operations, as Chrome may terminate the service worker without warning.

```javascript
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker is being suspended');
  
  // Save any pending state
  savePendingChanges();
  clearTemporaryData();
});

function savePendingChanges() {
  // Use chrome.storage API to persist data
  // Note: This may not complete if suspension is immediate
  chrome.storage.local.set({
    lastSuspend: Date.now(),
    pendingQueue: getPendingOperations()
  });
}

// Recommended: Use chrome.storage.onBeforeSuspend for guaranteed execution
chrome.storage.onBeforeSuspend.addListener(() => {
  console.log('About to suspend - save state now');
  syncStateToStorage();
});
```

The onSuspend event should be used sparingly and for lightweight operations only. Chrome may terminate service workers at any time, and you should design your extension to handle unexpected termination gracefully. For critical data persistence, use the storage API which handles writes reliably.

## Native Messaging

### chrome.runtime.sendNativeMessage

The `chrome.runtime.sendNativeMessage` method enables communication with native applications installed on the user's computer. This powerful feature allows extensions to leverage system-level capabilities, interact with command-line tools, or communicate with companion applications. Native messaging requires a registered native host application.

```javascript
// Sending a message to a native application
async function sendToNativeApp(message) {
  try {
    const response = await chrome.runtime.sendNativeMessage(
      'com.example.myapp',
      message
    );
    return response;
  } catch (error) {
    console.error('Native messaging error:', error);
    throw error;
  }
}

// Example: Get system information from native app
async function getSystemInfo() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(
      'com.example.systeminfo',
      { action: 'getSystemInfo' },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      }
    );
  });
}

// Using with callback
chrome.runtime.sendNativeMessage(
  'com.example.myapp',
  { command: 'processData', data: myData },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError.message);
      return;
    }
    console.log('Native app responded:', response);
  }
);
```

Native messaging requires the `"nativeMessaging"` permission in your manifest and a properly configured native host manifest file. The native host must be registered with Chrome and must conform to the native messaging protocol. Security considerations are important when implementing native messaging, as it opens a channel between your extension and the local system.

## Error Handling

### chrome.runtime.lastError

The `chrome.runtime.lastError` property is crucial for error handling in extension APIs. Many Chrome extension APIs use callbacks with this global property to indicate errors. You must check this property in your callback functions, as errors will not throw exceptions.

```javascript
// Always check lastError in callbacks
chrome.runtime.sendMessage({ type: 'test' }, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Runtime error:', chrome.runtime.lastError.message);
    // Common errors include:
    // - "Could not establish connection. Receiving end does not exist."
    // - "The extension's background page is not available"
    // - "Message port closed before a response was received"
    return;
  }
  // Handle successful response
  console.log('Response:', response);
});

// Promise-based error handling
async function safeSendMessage(message) {
  try {
    const response = await chrome.runtime.sendMessage(message);
    return response;
  } catch (error) {
    // This catches promise rejections
    console.error('Message send failed:', error.message);
    return null;
  }
}

// For port-based communication
const port = chrome.runtime.connect({ name: 'channel' });
port.onMessage.addListener((msg) => {
  // Handle messages
});
port.onDisconnect.addListener(() => {
  if (chrome.runtime.lastError) {
    console.error('Port disconnect due to error:', chrome.runtime.lastError.message);
  }
});
```

Important: `chrome.runtime.lastError` is only valid within the callback function. It is cleared after the callback completes. This is a common source of bugs where developers check the error outside the callback scope.

## Best Practices

### Message Passing Patterns

Effective message passing requires thoughtful design. Use consistent message schemas, handle errors gracefully, and choose the appropriate method for your use case.

```javascript
// Message schema pattern
const MessageTypes = {
  GET_STATE: 'GET_STATE',
  SET_STATE: 'SET_STATE',
  NOTIFY: 'NOTIFY',
  REQUEST_ACTION: 'REQUEST_ACTION',
  ACTION_RESULT: 'ACTION_RESULT'
};

// Centralized message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handlers = {
    [MessageTypes.GET_STATE]: handleGetState,
    [MessageTypes.SET_STATE]: handleSetState,
    [MessageTypes.NOTIFY]: handleNotify
  };
  
  const handler = handlers[message.type];
  if (!handler) {
    console.warn('Unknown message type:', message.type);
    return false;
  }
  
  // Return promise for async handling
  return handler(message.payload, sender);
});
```

### Port Management

For applications requiring persistent connections, implement proper port lifecycle management.

```javascript
class PortManager {
  constructor() {
    this.ports = new Map();
    this.setupListeners();
  }
  
  setupListeners() {
    chrome.runtime.onConnect.addListener((port) => {
      this.ports.set(port.name, port);
      
      port.onMessage.addListener((msg) => this.handleMessage(port, msg));
      port.onDisconnect.addListener(() => {
        this.ports.delete(port.name);
        console.log(`Port ${port.name} disconnected`);
      });
    });
  }
  
  broadcast(message) {
    this.ports.forEach((port) => {
      port.postMessage(message);
    });
  }
  
  sendToPort(portName, message) {
    const port = this.ports.get(portName);
    if (port) {
      port.postMessage(message);
    }
  }
}

const portManager = new PortManager();
```

## Summary

The chrome.runtime API provides essential infrastructure for Chrome extension development. Key takeaways include: use sendMessage for one-time requests and connect for persistent connections; always check chrome.runtime.lastError in callbacks; return true from onMessage listeners for async responses; use onInstalled for initialization and onStartup for session tasks; implement proper error handling and message schema consistency.

For complete API documentation, visit [chrome.runtime reference](https://developer.chrome.com/docs/extensions/reference/api/runtime).

## Cross-References

- [Message Passing Best Practices](/guides/message-passing-best-practices.md)
- [Background Service Workers](/guides/service-worker-lifecycle.md)
- [Extension Architecture](/guides/extension-architecture.md)
- [Debugging Extensions](/guides/debugging-extensions.md)
