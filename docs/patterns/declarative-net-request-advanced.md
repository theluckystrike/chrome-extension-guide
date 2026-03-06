# Advanced Declarative Net Request Patterns

Advanced patterns for `chrome.declarativeNetRequest` enabling user-configurable blocking, header manipulation, URL rewriting, and dynamic rule management.

---

## Dynamic Rules: User-Configurable Blocking

Dynamic rules persist across sessions—ideal for user preferences:

```ts
const updateBlocklist = async (domain: string, enabled: boolean) => {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const newRules = enabled ? [{
    id: Math.max(0, ...rules.map(r => r.id)) + 1,
    priority: 1, action: { type: 'block' },
    condition: { urlFilter: domain, resourceTypes: ['main_frame'] }
  }] : [];
  await chrome.declarativeNetRequest.updateDynamicRules({ addRules: newRules });
};
```
**Limits**: 30,000 dynamic rules per extension.

## Session Rules: Temporary Rules

Session rules clear on restart—useful for trial features:

```ts
await chrome.declarativeNetRequest.updateSessionRules({
  addRules: [{ id: 1, priority: 1, action: { type: 'block' },
    condition: { urlFilter: '.*\\.tracker\\.com/.*', resourceTypes: ['script'] } }]
});
```
**Limits**: 5,000 session rules; 5,000 static rules.

## Rule Priorities and allowAllRequests

Higher priority wins. `allowAllRequests` bypasses CORS:

```ts
{ id: 1, priority: 100, action: { type: 'allowAllRequests' },
  condition: { urlFilter: 'https://api.example.com/.*', resourceTypes: ['xmlhttprequest'] } }
```
**Priority chain**: allow > allowAllRequests > block > upgradeScheme > redirect > modifyHeaders

## Regular Expressions: regexFilter

RE2 syntax for complex matching (no backtracking):

```ts
{ id: 1, priority: 1, action: { type: 'block' }, condition: {
  regexFilter: 'https://[a-z0-9-]+\\.tracker\\.[a-z]{2,}/[^?]*\\?utm_',
  resourceTypes: ['script', 'image'] } }
```
**Limits**: 1,500 regex rules; must complete in <10ms.

## Header Modification

Add, remove, or set request/response headers:

```ts
{ id: 1, priority: 1, action: { type: 'modifyHeaders', requestHeaders: [
  { header: 'Referrer-Policy', operation: 'set', value: 'no-referrer' },
  { header: 'X-Frame-Options', operation: 'remove' }
] }, condition: { urlFilter: '.*', resourceTypes: ['main_frame'] } }
```

## Rule Conditions: Fine-Grained Matching

Target specific domains, methods, resource types, or tabs:

```ts
{ id: 1, priority: 1, action: { type: 'block' }, condition: {
  urlFilter: '.*', domains: ['tracker.example.com'],
  excludedDomains: ['trusted.example.com'],
  resourceTypes: ['script', 'image'], requestMethods: ['get'], tabIds: [tabId] } }
```

## Testing: testMatchOutcome

Verify rules match without applying:

```ts
const result = await chrome.declarativeNetRequest.testMatchOutcome(
  { url: 'https://tracker.example.com/ad.js', type: 'script' }, { tabId: 123 });
console.log(result.matchedRules);
```

## Debugging

Open `chrome://extensions`, enable "Declarative Net Request" logging, trigger requests, view "Matched Requests" tab.

## Migrating from webRequestBlocking

| webRequest | DNR |
|------------|-----|
| blocking | `block` action |
| redirect | `redirect` action |
| modifyHeaders | `modifyHeaders` action |

DNR runs in Chrome's network stack, improving performance and privacy.

---

## Cross-References
- [Declarative Net Request API Reference](../api_reference/declarative-net-request-api.md)
- [Declarative Net Request (MV3)](../mv3/declarative-net-request.md)
- [Network Interception Patterns](./network-interception.md)
