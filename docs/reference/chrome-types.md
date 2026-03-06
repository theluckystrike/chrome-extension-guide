# Chrome Extension TypeScript Types Reference

Complete guide to TypeScript types for Chrome extension development.

## Installing Type Definitions

### @types/chrome

```bash
npm install -D @types/chrome
```

### tsconfig Settings

```json
{
  "compilerOptions": {
    "lib": ["ES2022", "DOM"],
    "types": ["chrome"]
  }
}
```

## Key Chrome Types

### Tab Type

```typescript
function getTabInfo(tab: chrome.tabs.Tab): void {
  console.log(tab.id);       // number | undefined
  console.log(tab.url);      // string | undefined (requires 'tabs' permission)
  console.log(tab.title);    // string | undefined (requires 'tabs' permission)
  console.log(tab.active);   // boolean
  console.log(tab.status);   // 'loading' | 'complete'
}
```
**Note:** `tab.id`, `tab.url`, `tab.title` can all be `undefined`.

### MessageSender Type

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(sender.id);      // Extension ID
  console.log(sender.url);     // URL of page that sent message
  console.log(sender.tab);     // chrome.tabs.Tab | undefined
  console.log(sender.frameId); // Frame that sent message
});
```

### StorageArea Type

```typescript
const local: chrome.storage.StorageArea = chrome.storage.local;
const sync: chrome.storage.StorageArea = chrome.storage.sync;
type StorageAreaName = 'local' | 'sync' | 'session' | 'managed';
```

### Alarm Type

```typescript
chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm) => {
  console.log(alarm.name);            // Alarm identifier
  console.log(alarm.scheduledTime);   // Unix timestamp (ms)
  console.log(alarm.periodInMinutes); // number | undefined for repeating
});
```

### NotificationOptions Type

```typescript
const opts: chrome.notifications.NotificationOptions = {
  type: 'basic',
  iconUrl: '/icon.png',
  title: 'Alert',
  message: 'Something happened!',
  priority: 1,
  buttons: [{ title: 'OK' }],
};
```

### Command Type

```json
{
  "commands": {
    "execute-action": {
      "suggested_key": { "default": "Ctrl+Shift+1" },
      "description": "Execute the main action"
    }
  }
}
```

## Type-Safe Storage with @theluckystrike/webext-storage

### Schema Definition

```typescript
import { defineSchema, createStorage } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  theme: 'dark' as 'dark' | 'light',
  fontSize: 14,
  enabled: true,
});

const storage = createStorage({ schema, area: 'local' });
```

### CRUD Operations

```typescript
const theme = await storage.get('theme');    // 'dark' | 'light' | null
await storage.set('theme', 'light');
await storage.setMany({ theme: 'dark', fontSize: 16 });
await storage.remove('theme');
await storage.clear();

// Watch for changes
const unwatch = storage.watch('theme', (newValue, oldValue) => {
  console.log(`Theme: ${oldValue} -> ${newValue}`);
});
unwatch();
```

## Type-Safe Messaging with @theluckystrike/webext-messaging

### Message Types

```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  GET_USER: { request: { id: number }; response: { name: string } };
  PING: { request: void; response: 'pong' };
};

const messenger = createMessenger<Messages>();
```

### Usage

```typescript
// Send messages
const user = await messenger.send('GET_USER', { id: 1 });
await messenger.sendTab(tabId, 'PING');

// Register handlers
messenger.onMessage('GET_USER', async ({ id }) => ({ name: 'User' + id }));
messenger.onMessage('PING', () => 'pong');
```

## Permission Checking with @theluckystrike/webext-permissions

### Types

```typescript
import type { Permission, PermissionResult, RequestResult } 
  from '@theluckystrike/webext-permissions';
```

### Operations

```typescript
import { checkPermission, requestPermission, getGrantedPermissions, describePermission } 
  from '@theluckystrike/webext-permissions';

// Check single permission
const result = await checkPermission('tabs');
// { permission: 'tabs', granted: boolean, description: string }

// Request at runtime
const req = await requestPermission('tabs');
if (req.granted) console.log('Access granted!');

// Get all granted
const granted = await getGrantedPermissions();
console.log(granted.permissions);

// Human-readable descriptions
console.log(describePermission('history')); // "Read and change your browsing history"
```

## Event Listener Patterns

```typescript
// Tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    console.log(`Loaded: ${tab.url}`);
  }
});

// Storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`${key}: ${oldValue} -> ${newValue}`);
  }
});

// Messages (return true for async)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  sendResponse({ ok: true });
  return true;
});
```

## Tips

### Tab ID is Optional

```typescript
// ❌ Wrong
chrome.tabs.sendMessage(tab.id, { data: 'x' });

// ✅ Correct
if (tab.id) {
  chrome.tabs.sendMessage(tab.id, { data: 'x' });
}
```

### URL/Title Require 'tabs' Permission

Without `"tabs"` permission, `tab.url` and `tab.title` are always `undefined`:

```json
{ "permissions": ["tabs"] }
```
