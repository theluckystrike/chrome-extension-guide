# Chrome Extension Event Reference

Complete reference for chrome.* events in Chrome Extensions (Manifest V3).

## Overview {#overview}

Events wake the service worker in MV3. When the worker restarts, top-level listeners are automatically restored.

### Key Principles {#key-principles}
- Register at top level (synchronously)
- Never register inside async callbacks
- Listeners persist across restarts

## Event Pattern {#event-pattern}

```javascript
chrome.someApi.onSomeEvent.addListener(callback);
chrome.someApi.onSomeEvent.removeListener(callback);
chrome.someApi.onSomeEvent.hasListener(callback);
```

## Lifecycle Events {#lifecycle-events}

| Event | Description |
|-------|-------------|
| `chrome.runtime.onInstalled` | Install/update/Chrome update |
| `chrome.runtime.onStartup` | Profile starts |
| `chrome.runtime.onSuspend` | SW about to unload |
| `chrome.runtime.onUpdateAvailable` | New version available |

```javascript
chrome.runtime.onInstalled.addListener((d) => console.log(d.reason));
chrome.runtime.onStartup.addListener(() => {});
chrome.runtime.onSuspend.addListener(() => {});
chrome.runtime.onUpdateAvailable.addListener((d) => {});
```

## Messaging Events {#messaging-events}

| Event | Description |
|-------|-------------|
| `chrome.runtime.onMessage` | Message via sendMessage |
| `chrome.runtime.onConnect` | Long-lived port |
| `chrome.runtime.onMessageExternal` | From another extension |
| `chrome.runtime.onConnectExternal` | Port from another extension |

```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {});
chrome.runtime.onConnect.addListener((port) => {});
chrome.runtime.onMessageExternal.addListener((msg, sender, sendResponse) => {});
chrome.runtime.onConnectExternal.addListener((port) => {});
```

## Tab Events {#tab-events}

| Event | Description |
|-------|-------------|
| `chrome.tabs.onCreated` | Tab created |
| `chrome.tabs.onUpdated` | Tab updated |
| `chrome.tabs.onRemoved` | Tab closed |
| `chrome.tabs.onMoved` | Tab moved |
| `chrome.tabs.onActivated` | Active tab changed |
| `chrome.tabs.onHighlighted` | Highlighted changed |
| `chrome.tabs.onAttached` | Tab attached |
| `chrome.tabs.onDetached` | Tab detached |
| `chrome.tabs.onReplaced` | Tab replaced |

```javascript
chrome.tabs.onCreated.addListener((tab) => {});
chrome.tabs.onUpdated.addListener((id, info, tab) => {});
chrome.tabs.onRemoved.addListener((id, info) => {});
chrome.tabs.onMoved.addListener((id, info) => {});
chrome.tabs.onActivated.addListener((info) => {});
chrome.tabs.onHighlighted.addListener((info) => {});
chrome.tabs.onAttached.addListener((id, info) => {});
chrome.tabs.onDetached.addListener((id, info) => {});
chrome.tabs.onReplaced.addListener((added, removed) => {});
```

## Tab Group Events {#tab-group-events}

```javascript
chrome.tabGroups.onCreated.addListener((g) => {});
chrome.tabGroups.onUpdated.addListener((g) => {});
chrome.tabGroups.onRemoved.addListener((g) => {});
chrome.tabGroups.onMoved.addListener((g) => {});
```

## Navigation Events {#navigation-events}

| Event | Description |
|-------|-------------|
| `chrome.webNavigation.onBeforeNavigate` | About to navigate |
| `chrome.webNavigation.onCommitted` | Navigation committed |
| `chrome.webNavigation.onDOMContentLoaded` | DOM ready |
| `chrome.webNavigation.onCompleted` | Navigation complete |
| `chrome.webNavigation.onErrorOccurred` | Navigation error |
| `chrome.webNavigation.onHistoryStateUpdated` | History changed |

```javascript
chrome.webNavigation.onBeforeNavigate.addListener((d) => {});
chrome.webNavigation.onCommitted.addListener((d) => {});
chrome.webNavigation.onDOMContentLoaded.addListener((d) => {});
chrome.webNavigation.onCompleted.addListener((d) => {});
chrome.webNavigation.onErrorOccurred.addListener((d) => {});
chrome.webNavigation.onHistoryStateUpdated.addListener((d) => {});
```

## Web Request Events {#web-request-events}

Requires `webRequest` permission.

```javascript
// Note: In MV3, 'blocking' is NOT available (except for policy-installed extensions).
// Use chrome.declarativeNetRequest for request blocking/modification instead.
// The webRequest API in MV3 is observational only:
chrome.webRequest.onBeforeRequest.addListener((d) => { console.log('Request:', d.url); }, { urls: ['<all_urls>'] });
chrome.webRequest.onBeforeSendHeaders.addListener((d) => { /* observe headers */ }, { urls: ['<all_urls>'] }, ['requestHeaders']);
chrome.webRequest.onSendHeaders.addListener((d) => {}, { urls: ['<all_urls>'] }, ['requestHeaders']);
chrome.webRequest.onHeadersReceived.addListener((d) => { /* observe headers */ }, { urls: ['<all_urls>'] }, ['responseHeaders']);
chrome.webRequest.onResponseStarted.addListener((d) => {}, { urls: ['<all_urls>'] });
chrome.webRequest.onCompleted.addListener((d) => {}, { urls: ['<all_urls>'] });
chrome.webRequest.onErrorOccurred.addListener((d) => {}, { urls: ['<all_urls>'] });
```

## Storage, Alarm, Action Events {#storage-alarm-action-events}

```javascript
chrome.storage.onChanged.addListener((changes, area) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`${key}: ${oldValue} -> ${newValue}`);
  }
});
chrome.alarms.onAlarm.addListener((alarm) => console.log(alarm.name));
chrome.action.onClicked.addListener((tab) => {});
```

## Other Notable Events {#other-notable-events}

| API | Events |
|-----|--------|
| `chrome.bookmarks` | onCreated, onRemoved, onChanged, onMoved |
| `chrome.downloads` | onCreated, onChanged, onDeterminingFilename |
| `chrome.cookies` | onChanged |
| `chrome.idle` | onStateChanged |
| `chrome.management` | onInstalled, onUninstalled, onEnabled, onDisabled |
| `chrome.notifications` | onClicked, onClosed, onButtonClicked |
| `chrome.commands` | onCommand |
| `chrome.contextMenus` | onClicked |
| `chrome.sessions` | onChanged |
| `chrome.permissions` | onAdded, onRemoved |

```javascript
chrome.bookmarks.onCreated.addListener((id, b) => {});
chrome.downloads.onCreated.addListener((item) => {});
chrome.cookies.onChanged.addListener((info) => {});
chrome.idle.onStateChanged.addListener((s) => {});
chrome.management.onInstalled.addListener((i) => {});
chrome.notifications.onClicked.addListener((id) => {});
chrome.commands.onCommand.addListener((cmd) => {});
chrome.contextMenus.onClicked.addListener((info, tab) => {});
chrome.sessions.onChanged.addListener(() => {});
chrome.permissions.onAdded.addListener((p) => {});
```

## MV3 Event Rules {#mv3-event-rules}

### Register at Top Level {#register-at-top-level}

```javascript
// ✅ CORRECT
chrome.tabs.onUpdated.addListener((id, info, tab) => {});

// ❌ WRONG
async function init() { chrome.tabs.onUpdated.addListener((id, info, tab) => {}); }
init();
```

### Use Filters {#use-filters}

```javascript
chrome.tabs.onUpdated.addListener((id, info, tab) => {}, { urls: ['*://youtube.com/*'] });
```

## Cross-References {#cross-references}
- [Lifecycle Events](./lifecycle-events.md)
- [Event-Driven Architecture](../mv3/event-driven-architecture.md)
- [Service Workers](../mv3/service-workers.md)
