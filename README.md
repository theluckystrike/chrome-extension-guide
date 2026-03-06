# Chrome Extension Guide

[![webext-storage](https://img.shields.io/npm/v/@theluckystrike/webext-storage?label=webext-storage)](https://www.npmjs.com/package/@theluckystrike/webext-storage)
[![webext-messaging](https://img.shields.io/npm/v/@theluckystrike/webext-messaging?label=webext-messaging)](https://www.npmjs.com/package/@theluckystrike/webext-messaging)
[![webext-permissions](https://img.shields.io/npm/v/@theluckystrike/webext-permissions?label=webext-permissions)](https://www.npmjs.com/package/@theluckystrike/webext-permissions)

> Build type-safe Chrome extensions with the @theluckystrike/webext-* toolkit.

## Packages

### @theluckystrike/webext-storage

Typed Chrome storage wrapper with schema validation.

**Key exports:**

- `defineSchema(schema)` — identity function that provides type inference for storage schemas
- `createStorage({ schema, area })` — factory that returns a `TypedStorage` instance
- `TypedStorage` class — methods: `get(key)`, `getMany(keys)`, `getAll()`, `set(key, value)`, `setMany(items)`, `remove(key)`, `removeMany(keys)`, `clear()`, `watch(key, callback)`
- Types: `SchemaDefinition`, `SchemaType<S>`, `AreaName` ("local" | "sync"), `WatchCallback<T>`, `Unwatch`, `StorageOptions<S>`

**Quick example:**

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  theme: "dark" as "dark" | "light",
  count: 0,
  enabled: true,
});

const storage = createStorage({ schema, area: "local" });
await storage.set("theme", "light");
const theme = await storage.get("theme"); // typed as "dark" | "light"
```

### @theluckystrike/webext-messaging

Promise-based typed message passing for Chrome extensions.

**Key exports:**

- `createMessenger<M>()` — factory returning a `Messenger<M>` with `.send()`, `.sendTab()`, `.onMessage()`
- `sendMessage<M, K>(type, payload)` — send via `chrome.runtime.sendMessage`
- `sendTabMessage<M, K>(options, type, payload)` — send via `chrome.tabs.sendMessage` (background -> content script)
- `onMessage<M>(handlers)` — register typed handlers, returns unsubscribe function
- `MessagingError` — error class wrapping Chrome messaging failures
- Types: `MessageMap`, `RequestOf<M, K>`, `ResponseOf<M, K>`, `Envelope<M, K>`, `Handler<M, K>`, `HandlerMap<M>`, `TabMessageOptions`

**Quick example:**

```ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type Messages = {
  getUser: { request: { id: number }; response: { name: string } };
  ping: { request: void; response: "pong" };
};

const msg = createMessenger<Messages>();
const user = await msg.send("getUser", { id: 1 });
```

### @theluckystrike/webext-permissions

Runtime permission helpers with human-readable descriptions.

**Key exports:**

- `checkPermission(permission)` — returns `Promise<PermissionResult>` with `{ permission, granted, description }`
- `checkPermissions(permissions)` — batch check, returns `PermissionResult[]`
- `requestPermission(permission)` — request single permission, returns `Promise<RequestResult>` with `{ granted, error? }`
- `requestPermissions(permissions)` — request multiple in one prompt
- `removePermission(permission)` — remove a granted permission
- `getGrantedPermissions()` — list all currently granted permissions with descriptions
- `describePermission(permission)` — get human-readable description string
- `listPermissions()` — list all known permissions with descriptions
- `PERMISSION_DESCRIPTIONS` — Record<string, string> of 50+ Chrome permissions

**Quick example:**

```ts
import { checkPermission, requestPermission } from "@theluckystrike/webext-permissions";

const result = await checkPermission("tabs");
console.log(result.description); // "Read information about open tabs"

if (!result.granted) {
  const req = await requestPermission("tabs");
  if (req.granted) console.log("Permission granted!");
}
```

## Installation

```bash
npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging @theluckystrike/webext-permissions
```

## API Reference

- [Tabs API](docs/api-reference/tabs-api.md)
- [Windows API](docs/api-reference/windows-api.md)
- [Bookmarks API](docs/api-reference/bookmarks-api.md)
- [History API](docs/api-reference/history-api.md)
- [Downloads API](docs/api-reference/downloads-api.md)
- [Alarms API](docs/api-reference/alarms-api.md)
- [Notifications API](docs/api-reference/notifications-api.md)
- [Context Menus API](docs/api-reference/context-menus-api.md)
- [Storage API Deep Dive](docs/api-reference/storage-api-deep-dive.md)
- [Runtime API](docs/api-reference/runtime-api.md)

## Guides

- [Extension Architecture](docs/guides/extension-architecture.md)
- [Service Worker Lifecycle](docs/guides/service-worker-lifecycle.md)
- [Background Service Worker Patterns](docs/guides/background-patterns.md)
- [Content Script Patterns](docs/guides/content-script-patterns.md)
- [Content Script Isolation](docs/guides/content-script-isolation.md)
- [Tab Management Patterns](docs/guides/tab-management.md)
- [Window Management](docs/guides/window-management.md)
- [Bookmark API Guide](docs/guides/bookmark-api.md)
- [Context Menus](docs/guides/context-menus.md)
- [Download Management](docs/guides/download-management.md)
- [Background Scheduling with Alarms](docs/guides/alarms-scheduling.md)
- [Rich Notifications](docs/guides/notifications-guide.md)
- [Popup Patterns](docs/guides/popup-patterns.md)
- [Building an Options Page](docs/guides/options-page.md)
- [Building DevTools Extensions](docs/guides/devtools-extensions.md)
- [manifest.json Reference](docs/guides/manifest-json-reference.md)
- [Security Best Practices](docs/guides/security-best-practices.md)
- [Performance Optimization](docs/guides/performance.md)
- [Memory Management](docs/guides/memory-management.md)
- [Debugging Extensions](docs/guides/debugging-extensions.md)
- [Testing Extensions](docs/guides/testing-extensions.md)
- [Accessibility](docs/guides/accessibility.md)
- [Internationalization (i18n)](docs/guides/internationalization.md)
- [Cross-Browser Development](docs/guides/cross-browser.md)
- [Handling Extension Updates](docs/guides/extension-updates.md)
- [Chrome Web Store Publish API](docs/guides/chrome-web-store-api.md)

## Permissions

- [activeTab](docs/permissions/activeTab.md)
- [alarms](docs/permissions/alarms.md)
- [bookmarks](docs/permissions/bookmarks.md)
- [contextMenus](docs/permissions/contextMenus.md)
- [cookies](docs/permissions/cookies.md)
- [debugger](docs/permissions/debugger.md)
- [declarativeNetRequest](docs/permissions/declarativeNetRequest.md)
- [downloads](docs/permissions/downloads.md)
- [history](docs/permissions/history.md)
- [identity](docs/permissions/identity.md)
- [notifications](docs/permissions/notifications.md)
- [proxy](docs/permissions/proxy.md)
- [scripting](docs/permissions/scripting.md)
- [storage](docs/permissions/storage.md)
- [tabs](docs/permissions/tabs.md)
- [tts](docs/permissions/tts.md)
- [webRequest](docs/permissions/webRequest.md)

## Tutorials

- [Storage Quickstart](docs/tutorials/storage-quickstart.md)
- [Messaging Quickstart](docs/tutorials/messaging-quickstart.md)
- [Permissions Quickstart](docs/tutorials/permissions-quickstart.md)

## Requirements

- Chrome 116+ (Manifest V3)
- TypeScript 5.0+

## License

MIT
