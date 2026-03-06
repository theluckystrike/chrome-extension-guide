# webRequest Permission Reference

## What It Does
- Grants access to `chrome.webRequest` API
- Observe HTTP/HTTPS requests at various lifecycle stages
- MV3: webRequest is READ-ONLY — use `declarativeNetRequest` for blocking/modifying

## MV3 Critical Change
| Capability | MV2 | MV3 |
|-----------|-----|-----|
| Observe | webRequest | webRequest |
| Block | webRequestBlocking | declarativeNetRequest |
| Modify headers | webRequestBlocking | declarativeNetRequest |
| Redirect | webRequestBlocking | declarativeNetRequest |

## Required: Host Permissions
```json
{ "permissions": ["webRequest"], "host_permissions": ["<all_urls>"] }
```

## Using with @theluckystrike/webext-permissions

```ts
import { checkPermission, requestPermission } from "@theluckystrike/webext-permissions";

const result = await checkPermission("webRequest");
// { description: "Observe and modify network requests", granted: bool }
```

```ts
import { PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";
PERMISSION_DESCRIPTIONS.webRequest;                   // "Observe and modify network requests"
PERMISSION_DESCRIPTIONS.declarativeNetRequest;         // "Block or modify network requests"
PERMISSION_DESCRIPTIONS.declarativeNetRequestFeedback; // "Get feedback on declarative net requests"
```

## Using with @theluckystrike/webext-messaging

Request logger: background monitors, popup displays:

```ts
type Messages = {
  getRequestLog: { request: { limit: number }; response: Array<{ url: string; method: string; statusCode: number; timestamp: number }> };
  getBlockedCount: { request: void; response: { count: number } };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();
const requestLog: Array<{ url: string; method: string; statusCode: number; timestamp: number }> = [];

chrome.webRequest.onCompleted.addListener(
  (details) => {
    requestLog.push({ url: details.url, method: details.method, statusCode: details.statusCode, timestamp: details.timeStamp });
    if (requestLog.length > 500) requestLog.splice(0, requestLog.length - 500);
  },
  { urls: ["<all_urls>"] }
);

msg.onMessage({
  getRequestLog: ({ limit }) => requestLog.slice(-limit),
  getBlockedCount: () => ({ count: requestLog.filter(r => r.statusCode >= 400).length }),
});
```

## Using with @theluckystrike/webext-storage

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  monitoringEnabled: true,
  monitoredDomains: [] as string[],
  logRetentionDays: 7,
});
const storage = createStorage({ schema });

storage.watch("monitoringEnabled", (enabled) => {
  if (enabled) startMonitoring();
  else stopMonitoring();
});
```

## Event Lifecycle
```
onBeforeRequest -> onBeforeSendHeaders -> onSendHeaders ->
  onHeadersReceived -> onResponseStarted -> onCompleted
                                         -> onErrorOccurred
```

## Key Events
| Event | When | Use Case |
|-------|------|----------|
| `onBeforeRequest` | Before request sent | Log URLs, observe bodies |
| `onBeforeSendHeaders` | Before headers sent | Observe outgoing headers |
| `onHeadersReceived` | Response headers in | Observe content-type |
| `onCompleted` | Request finished | Log status, timing |
| `onErrorOccurred` | Request failed | Track network errors |

## Common Patterns
1. Network request logger/debugger
2. Privacy monitor (third-party tracker counting)
3. Performance monitor (request timing)
4. API traffic inspector

## Gotchas
- MV3: READ-ONLY — cannot block, redirect, or modify
- `host_permissions` required — no events without them
- Service worker lifecycle: register listeners synchronously at top level
- High-traffic sites = thousands of events — always filter with URL patterns
- `requestBody` needs `"extraInfoSpec": ["requestBody"]`

## declarativeNetRequest for Blocking (MV3)
```json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [{ "id": "ruleset_1", "enabled": true, "path": "rules.json" }]
  }
}
```

## Related Permissions
- [cookies](cookies.md), [tabs](tabs.md), [activeTab](activeTab.md)
- [declarativeNetRequest](declarativeNetRequest.md) — MV3 replacement for request blocking/modification

## API Reference
- [Chrome webRequest API docs](https://developer.chrome.com/docs/extensions/reference/api/webRequest)
