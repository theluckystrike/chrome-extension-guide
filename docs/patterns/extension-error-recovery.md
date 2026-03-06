# Error Recovery Patterns

Resilience patterns for building self-healing Chrome extensions.

## Service Worker Crash Recovery

Service workers can terminate after inactivity. Re-register listeners and restore state on wake:

```javascript
// Re-register listeners on service worker wake
chrome.runtime.onStartup.addListener(() => {
  registerAlarmListeners();
  registerMessageListeners();
  restoreStateFromStorage();
});

// Restore state from storage on wake
async function restoreStateFromStorage() {
  const saved = await chrome.storage.local.get('appState');
  if (saved.appState && validateState(saved.appState)) {
    Object.assign(appState, saved.appState);
  } else {
    appState = getDefaultState();
  }
}
```

## Content Script Disconnection

Catch "Extension context invalidated" errors and reload:

```javascript
// Wrap message sending with error handling
function sendMessageSafely(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError?.message.includes('Extension context invalidated')) {
        // Reload content script and retry
        chrome.tabs.reload(tabId);
        reject(new Error('Content script reloaded'));
      } else {
        resolve(response);
      }
    });
  });
}
```

## Storage Corruption Recovery

Validate data on load, fallback to defaults if invalid:

```javascript
async function loadStorageWithFallback(key, schema, defaults) {
  try {
    const data = await chrome.storage.local.get(key);
    const parsed = JSON.parse(data[key]);
    if (schema.isValid(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.error('Storage corrupted, restoring defaults:', e);
  }
  return defaults;
}
```

## Network Failures

Implement exponential backoff with jitter:

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
      if (attempt < maxRetries - 1) await sleep(delay);
    }
  }
  // Queue for offline retry
  await queueForLater(url, options);
}
```

## Alarm Recovery

Check and recreate missing alarms on startup:

```javascript
chrome.runtime.onStartup.addListener(async () => {
  const alarms = await chrome.alarms.getAll();
  const requiredAlarms = ['sync-data', 'cleanup', 'check-updates'];
  
  for (const name of requiredAlarms) {
    if (!alarms.find(a => a.name === name)) {
      chrome.alarms.create(name, { periodInMinutes: getInterval(name) });
    }
  }
});
```

## Runtime.lastError Check

Always check after async chrome API calls:

```javascript
chrome.storage.local.set({ key: 'value' }, () => {
  if (chrome.runtime.lastError) {
    console.error('Storage error:', chrome.runtime.lastError.message);
    return;
  }
  // Success
});
```

## Unhandled Rejection Handling

Catch unhandled promise rejections in service worker:

```javascript
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  // Report to error tracking
  reportError({ type: 'unhandledrejection', error: event.reason });
});
```

## Port Auto-Reconnect

Maintain long-lived connections with auto-reconnect:

```javascript
function createReconnectingPort(name) {
  let port = chrome.runtime.connect({ name });
  
  port.onDisconnect.addListener(() => {
    console.log('Port disconnected, reconnecting...');
    setTimeout(() => {
      port = createReconnectingPort(name);
    }, 1000);
  });
  
  return port;
}
```

## State Validation & Auto-Repair

Periodic validation with automatic repair:

```javascript
setInterval(async () => {
  if (!validateState(appState)) {
    console.warn('State corrupted, auto-repairing...');
    appState = repairState(appState);
    await chrome.storage.local.set({ appState });
    notifyUser('State restored to consistent state');
  }
}, 60000);
```

## User Notification

Inform users of recovery actions non-intrusively:

```javascript
function notifyUser(message) {
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#FFA500' });
  // Show toast via content script or chrome.notifications
}
```

## Diagnostic Mode

Enable verbose logging when debugging persistent issues:

```javascript
const DIAGNOSTIC_MODE = false; // Toggle for debugging

function debugLog(context, data) {
  if (DIAGNOSTIC_MODE) {
    console.log(`[${context}]`, data);
    // Optionally send to remote logging
  }
}
```

## Self-Healing Pattern Summary

1. **Detect**: Validate state, catch errors, monitor connectivity
2. **Log**: Record issues with context for debugging
3. **Recover**: Apply fallback, retry, reload, or restore
4. **Report**: Notify users, send to telemetry if persistent

## Cross-Reference

- [Error Handling Reference](../reference/error-handling.md)
- [Retry Patterns](./retry-patterns.md)
- [Extension Error Reporting](../guides/extension-error-reporting.md)
