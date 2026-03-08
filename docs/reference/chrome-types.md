# Chrome Extension TypeScript Types Reference

## Installing Types {#installing-types}
```bash
npm install -D @types/chrome
# or
pnpm add -D @types/chrome
```

## tsconfig.json Setup {#tsconfigjson-setup}
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["chrome"]
  }
}
```

## Key Types {#key-types}

### chrome.tabs.Tab {#chrometabstab}
```typescript
interface Tab {
  id?: number;           // Tab ID (undefined in some events)
  index: number;         // Position in window
  windowId: number;      // Parent window
  url?: string;          // Requires "tabs" permission
  title?: string;        // Requires "tabs" permission
  favIconUrl?: string;   // Requires "tabs" permission
  status?: string;       // "loading" | "complete"
  active: boolean;
  pinned: boolean;
  highlighted: boolean;
  incognito: boolean;
  groupId: number;       // -1 if not grouped
  audible?: boolean;
  mutedInfo?: MutedInfo;
}
```

### chrome.runtime.MessageSender {#chromeruntimemessagesender}
```typescript
interface MessageSender {
  tab?: Tab;              // Tab that sent the message (if from content script)
  frameId?: number;       // Frame ID
  id?: string;            // Extension ID (if from another extension)
  url?: string;           // URL of sender
  origin?: string;        // Origin of sender
}
```

### chrome.storage Types {#chromestorage-types}
```typescript
// StorageArea methods return Promises in MV3
interface StorageArea {
  get(keys?: string | string[] | null): Promise<Record<string, any>>;
  set(items: Record<string, any>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
  getBytesInUse(keys?: string | string[] | null): Promise<number>;
}
```

### Type-Safe Storage with @theluckystrike/webext-storage {#type-safe-storage-with-theluckystrikewebext-storage}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

// Schema provides full type safety
const schema = defineSchema({
  username: 'string',
  count: 'number',
  enabled: 'boolean'
});

const storage = createStorage(schema, 'sync');
const name = await storage.get('username');  // type: string | undefined
await storage.set('count', 42);               // type-checked
await storage.set('count', 'wrong');          // TypeScript error!
```

### Type-Safe Messaging with @theluckystrike/webext-messaging {#type-safe-messaging-with-theluckystrikewebext-messaging}
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

// Define all message types
type Messages = {
  GET_USER: {
    request: { userId: string };
    response: { name: string; email: string };
  };
  TOGGLE_FEATURE: {
    request: { feature: string; enabled: boolean };
    response: { ok: boolean };
  };
};

const m = createMessenger<Messages>();

// Fully typed — TypeScript knows request/response shapes
const user = await m.sendMessage('GET_USER', { userId: '123' });
// user: { name: string; email: string }

m.onMessage('TOGGLE_FEATURE', async ({ feature, enabled }) => {
  // feature: string, enabled: boolean — typed!
  return { ok: true };
});
```

### chrome.action Types {#chromeaction-types}
```typescript
interface TabIconDetails {
  tabId?: number;
  path?: string | Record<number, string>;
  imageData?: ImageData | Record<number, ImageData>;
}

interface BadgeTextDetails {
  text: string;
  tabId?: number;
}

interface BadgeColorDetails {
  color: string | [number, number, number, number];
  tabId?: number;
}
```

### chrome.alarms.Alarm {#chromealarmsalarm}
```typescript
interface Alarm {
  name: string;
  scheduledTime: number;
  periodInMinutes?: number;
}

interface AlarmCreateInfo {
  when?: number;
  delayInMinutes?: number;
  periodInMinutes?: number;
}
```

### chrome.notifications Types {#chromenotifications-types}
```typescript
interface NotificationOptions {
  type: 'basic' | 'image' | 'list' | 'progress';
  iconUrl: string;
  title: string;
  message: string;
  contextMessage?: string;
  priority?: 0 | 1 | 2;
  buttons?: Array<{ title: string; iconUrl?: string }>;
  items?: Array<{ title: string; message: string }>;   // for 'list' type
  progress?: number;                                      // for 'progress' type
  imageUrl?: string;                                      // for 'image' type
}
```

### chrome.commands Types {#chromecommands-types}
```typescript
interface Command {
  name?: string;
  description?: string;
  shortcut?: string;
}
```

### Event Listener Types {#event-listener-types}
```typescript
// Generic pattern for all chrome events
chrome.tabs.onCreated.addListener((tab: chrome.tabs.Tab) => {});
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {});
chrome.tabs.onRemoved.addListener((tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {});

chrome.runtime.onMessage.addListener(
  (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
    return true; // for async
  }
);
```

## Permission Check Types {#permission-check-types}
```typescript
import { checkPermission, requestPermission, describePermission, listPermissions } from '@theluckystrike/webext-permissions';
// All return typed results
const granted: boolean = await checkPermission('tabs');
const description: string = describePermission('storage');
const all: string[] = listPermissions();
```

## Tips {#tips}
- Always use `tab.id!` with non-null assertion only when you're sure ID exists
- `url`, `title`, `favIconUrl` on Tab require `tabs` permission — otherwise undefined
- Use `chrome.tabs.Tab` not `Tab` to avoid conflicts with DOM `Tab`
- `@types/chrome` is community-maintained — may lag behind Chrome releases

## Cross-References {#cross-references}
- Reference: `docs/reference/storage-patterns.md`
- Reference: `docs/reference/message-passing-patterns.md`
- Reference: `docs/reference/manifest-permissions-map.md`
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
