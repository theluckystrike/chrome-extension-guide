# Extension Lifecycle Events Reference

## chrome.runtime Events {#chromeruntime-events}

### onInstalled {#oninstalled}
```javascript
chrome.runtime.onInstalled.addListener((details) => {
  // details.reason: "install" | "update" | "chrome_update" | "shared_module_update"
  // details.previousVersion: string (only on "update")
});
```
- Fires: first install, extension update, Chrome browser update
- Use for: setting defaults, creating alarms/context menus, running migrations, showing welcome page
- Cross-ref: `docs/guides/extension-updates.md`

### onStartup {#onstartup}
```javascript
chrome.runtime.onStartup.addListener(() => {});
```
- Fires: every time Chrome browser launches
- Does NOT fire on extension install or update
- Use for: session initialization, connectivity checks

### onSuspend {#onsuspend}
```javascript
chrome.runtime.onSuspend.addListener(() => {
  // Service worker is about to terminate
  // Last chance to save state
});
```
- Fires: before SW termination (~30s idle)
- Limited time — save critical state immediately
- Use `@theluckystrike/webext-storage` for persistence

### onUpdateAvailable {#onupdateavailable}
```javascript
chrome.runtime.onUpdateAvailable.addListener((details) => {
  console.log("Update available:", details.version);
  chrome.runtime.reload(); // Apply immediately
});
```
- Fires: when CWS has a newer version ready
- Chrome applies update when all extension views close
- Call `chrome.runtime.reload()` to force immediate update

### onMessage / onMessageExternal {#onmessage-onmessageexternal}
```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // From own extension (content scripts, popup, etc.)
  return true; // Keep channel open for async response
});
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // From other extensions or web pages (requires externally_connectable)
});
```
- Use `@theluckystrike/webext-messaging` for type-safe handling

### onConnect / onConnectExternal {#onconnect-onconnectexternal}
```javascript
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => { /* long-lived connection */ });
  port.onDisconnect.addListener(() => { /* port closed */ });
});
```
- For long-lived connections (streaming data, persistent channels)

## chrome.management Events {#chromemanagement-events}

### onInstalled / onUninstalled {#oninstalled-onuninstalled}
```javascript
chrome.management.onInstalled.addListener((info) => { /* another extension installed */ });
chrome.management.onUninstalled.addListener((id) => { /* extension removed */ });
```
- Requires `"management"` permission
- Cross-ref: `docs/permissions/management.md`

### onEnabled / onDisabled {#onenabled-ondisabled}
```javascript
chrome.management.onEnabled.addListener((info) => { /* extension enabled */ });
chrome.management.onDisabled.addListener((info) => { /* extension disabled */ });
```

## Tab & Window Events {#tab-window-events}

### chrome.tabs events {#chrometabs-events}
- `onCreated`, `onUpdated`, `onRemoved`, `onActivated`, `onMoved`, `onDetached`, `onAttached`, `onReplaced`, `onHighlighted`
- Cross-ref: `docs/guides/tab-management.md`

### chrome.windows events {#chromewindows-events}
- `onCreated`, `onRemoved`, `onFocusChanged`, `onBoundsChanged`
- Cross-ref: `docs/guides/window-management.md`

## Storage Events {#storage-events}

### chrome.storage.onChanged {#chromestorageonchanged}
```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`${areaName}.${key}: ${oldValue} -> ${newValue}`);
  }
});
```
- Fires across ALL extension contexts (background, popup, content, options)
- `@theluckystrike/webext-storage` `watch()` wraps this per-key

## Event Ordering {#event-ordering}

### On Extension Install {#on-extension-install}
1. SW script executes (top-level code)
2. `chrome.runtime.onInstalled` fires (reason: "install")
3. Event listeners begin receiving events

### On Browser Launch {#on-browser-launch}
1. SW script executes
2. `chrome.runtime.onStartup` fires
3. Event listeners active

### On Extension Update {#on-extension-update}
1. Old SW terminates
2. New SW script executes
3. `chrome.runtime.onInstalled` fires (reason: "update", previousVersion set)

### On SW Wake-up (Event) {#on-sw-wake-up-event}
1. SW script executes (cold start)
2. Pending event dispatched to registered listener

## Initialization Patterns {#initialization-patterns}
```javascript
// Recommended: register ALL listeners at top level
chrome.runtime.onInstalled.addListener(onInstall);
chrome.runtime.onStartup.addListener(onStartup);
chrome.alarms.onAlarm.addListener(onAlarm);
chrome.runtime.onMessage.addListener(onMessage);

// Then define handlers
async function onInstall(details) { /* ... */ }
async function onStartup() { /* ... */ }
```

## State Restoration {#state-restoration}
```typescript
// On every SW wake-up, restore state from storage
const storage = createStorage(defineSchema({
  isEnabled: 'boolean',
  counter: 'number',
  config: 'string'
}), 'local');

// Lazy restoration pattern
let state = null;
async function getState() {
  if (!state) state = await storage.getAll();
  return state;
}
```

## Common Mistakes {#common-mistakes}
- Registering listeners inside `onInstalled` — they won't exist on subsequent wake-ups
- Confusing `onInstalled` with `onStartup` — different triggers
- Not handling `onSuspend` — lose unsaved state
- Expecting event order guarantees between different APIs — race conditions possible
- Using `onMessage` without returning `true` for async responses
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
