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

## Tutorials

- [Storage Quickstart](docs/tutorials/storage-quickstart.md)
- [Messaging Quickstart](docs/tutorials/messaging-quickstart.md)
- [Permissions Quickstart](docs/tutorials/permissions-quickstart.md)

## Requirements

- Chrome 116+ (Manifest V3)
- TypeScript 5.0+

## License

MIT
