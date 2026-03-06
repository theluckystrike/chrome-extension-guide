# Extension Lifecycle Events Reference

## chrome.runtime Events

### onInstalled
```javascript
chrome.runtime.onInstalled.addListener((details) => {
  // details.reason: "install" | "update" | "chrome_update" | "shared_module_update"
  // details.previousVersion: string (only on "update")
});
```
- Fires: first install, extension update, Chrome browser update
- Use for: setting defaults, creating alarms/context menus, running migrations, showing welcome page
- Cross-ref: `docs/guides/extension-updates.md`

### onStartup
```javascript
chrome.runtime.onStartup.addListener(() => {});
```
- Fires: every time Chrome browser launches
- Does NOT fire on extension install or update
- Use for: session initialization, connectivity checks

### onSuspend
```javascript
chrome.runtime.onSuspend.addListener(() => {
  // Service worker is about to terminate
  // Last chance to save state
});
```
- Fires: before SW termination (~30s idle)
- Limited time — save critical state immediately
- Use `@theluckystrike/webext-storage` for persistence

### onUpdateAvailable
```javascript
chrome.runtime.onUpdateAvailable.addListener((details) => {
  console.log("Update available:", details.version);
  chrome.runtime.reload(); // Apply immediately
});
```
- Fires: when CWS has a newer version ready
- Chrome applies update when all extension views close
- Call `chrome.runtime.reload()` to force immediate update

### onMessage / onMessageExternal
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

### onConnect / onConnectExternal
```javascript
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => { /* long-lived connection */ });
  port.onDisconnect.addListener(() => { /* port closed */ });
});
```
- For long-lived connections (streaming data, persistent channels)

## chrome.management Events

### onInstalled / onUninstalled
```javascript
chrome.management.onInstalled.addListener((info) => { /* another extension installed */ });
chrome.management.onUninstalled.addListener((id) => { /* extension removed */ });
```
- Requires `"management"` permission
- Cross-ref: `docs/permissions/management.md`

### onEnabled / onDisabled
```javascript
chrome.management.onEnabled.addListener((info) => { /* extension enabled */ });
chrome.management.onDisabled.addListener((info) => { /* extension disabled */ });
```

## Tab & Window Events

### chrome.tabs events
- `onCreated`, `onUpdated`, `onRemoved`, `onActivated`, `onMoved`, `onDetached`, `onAttached`, `onReplaced`, `onHighlighted`
- Cross-ref: `docs/guides/tab-management.md`

### chrome.windows events
- `onCreated`, `onRemoved`, `onFocusChanged`, `onBoundsChanged`
- Cross-ref: `docs/guides/window-management.md`

## Storage Events

### chrome.storage.onChanged
```javascript
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`${areaName}.${key}: ${oldValue} -> ${newValue}`);
  }
});
```
- Fires across ALL extension contexts (background, popup, content, options)
- `@theluckystrike/webext-storage` `watch()` wraps this per-key

## Event Ordering

### On Extension Install
1. SW script executes (top-level code)
2. `chrome.runtime.onInstalled` fires (reason: "install")
3. Event listeners begin receiving events

### On Browser Launch
1. SW script executes
2. `chrome.runtime.onStartup` fires
3. Event listeners active

### On Extension Update
1. Old SW terminates
2. New SW script executes
3. `chrome.runtime.onInstalled` fires (reason: "update", previousVersion set)

### On SW Wake-up (Event)
1. SW script executes (cold start)
2. Pending event dispatched to registered listener

## Initialization Patterns
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

## State Restoration
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

## Common Mistakes
- Registering listeners inside `onInstalled` — they won't exist on subsequent wake-ups
- Confusing `onInstalled` with `onStartup` — different triggers
- Not handling `onSuspend` — lose unsaved state
- Expecting event order guarantees between different APIs — race conditions possible
- Using `onMessage` without returning `true` for async responses
