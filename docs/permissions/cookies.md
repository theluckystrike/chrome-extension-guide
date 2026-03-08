---
title: "cookies Permission Reference"
description: "- Grants access to `chrome.cookies` API - Read, write, delete cookies for sites matching your host permissions - Listen for cookie changes via `chrome.cookies.onChanged`"
permalink: /permissions/cookies/
category: permissions
order: 10
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/cookies/"
---

# cookies Permission Reference

## What It Does
- Grants access to `chrome.cookies` API
- Read, write, delete cookies for sites matching your host permissions
- Listen for cookie changes via `chrome.cookies.onChanged`

## Required: Host Permissions
`cookies` permission alone is NOT enough. You also need host permissions:
```json
{ "permissions": ["cookies"], "host_permissions": ["https://*.example.com/*"] }
```

## Manifest Configuration
Required: `{ "permissions": ["cookies"], "host_permissions": ["https://*.example.com/*"] }`
Optional: `{ "optional_permissions": ["cookies"], "optional_host_permissions": ["https://*.example.com/*"] }`

## Using with @theluckystrike/webext-permissions

```ts
import { checkPermission, requestPermission } from "@theluckystrike/webext-permissions";

const result = await checkPermission("cookies");
// { description: "Read and modify cookies", granted: bool }

if (!result.granted) {
  const req = await requestPermission("cookies");
  if (req.granted) {
    const cookies = await chrome.cookies.getAll({ domain: "example.com" });
  }
}
```

```ts
import { PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";
PERMISSION_DESCRIPTIONS.cookies; // "Read and modify cookies"
```

## Using with @theluckystrike/webext-messaging

Background manages cookies, popup requests:

```ts
type Messages = {
  getCookies: { request: { domain: string }; response: Array<{ name: string; value: string; domain: string; secure: boolean }> };
  deleteCookie: { request: { url: string; name: string }; response: { success: boolean } };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();

msg.onMessage({
  getCookies: async ({ domain }) => {
    const cookies = await chrome.cookies.getAll({ domain });
    return cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain, secure: c.secure }));
  },
  deleteCookie: async ({ url, name }) => {
    await chrome.cookies.remove({ url, name });
    return { success: true };
  },
});
```

## Using with @theluckystrike/webext-storage

Log cookie changes:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  cookieChangeLog: [] as Array<{ domain: string; name: string; action: string; timestamp: number }>,
  autoDeleteEnabled: false,
});
const storage = createStorage({ schema });

chrome.cookies.onChanged.addListener(async (changeInfo) => {
  const log = await storage.get("cookieChangeLog");
  log.push({
    domain: changeInfo.cookie.domain, name: changeInfo.cookie.name,
    action: changeInfo.removed ? "removed" : "set", timestamp: Date.now(),
  });
  await storage.set("cookieChangeLog", log.slice(-100));
});
```

## chrome.cookies API Methods
| Method | Description |
|--------|-------------|
| `cookies.get(details)` | Get single cookie by name + URL |
| `cookies.getAll(details)` | Get all matching cookies |
| `cookies.set(details)` | Set a cookie |
| `cookies.remove(details)` | Delete a cookie |
| `cookies.getAllCookieStores()` | List all cookie stores |
| `cookies.onChanged` | Event for cookie changes |

## Common Patterns
1. Cookie manager/viewer UI
2. Privacy tool (auto-delete tracking cookies)
3. Session manager (export/import)
4. Auth helper (check login state)

## Gotchas
- `cookies` without matching `host_permissions` = no access
- Incognito needs `"incognito": "spanning"` or `"split"` in manifest
- `cookies.set()` requires exact URL, not just domain
- `cookies.onChanged` fires for ALL changes, not just your extension
- HttpOnly cookies ARE accessible via chrome.cookies (unlike document.cookie)

## Related Permissions
- [tabs](tabs.md), [webRequest](webRequest.md), [storage](storage.md)

## API Reference
- [Chrome cookies API docs](https://developer.chrome.com/docs/extensions/reference/api/cookies)
