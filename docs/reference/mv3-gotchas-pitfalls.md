# MV3 Gotchas and Pitfalls Reference

Real issues you will hit when building Chrome extensions with Manifest V3. This guide covers the traps that trip up even experienced developers.

================================================================
Service Worker Lifecycle
================================================================

The service worker in MV3 is not a persistent background page. Chrome terminates it after 30 seconds of inactivity, and it can be killed at any time due to memory pressure.

Your extension must handle this reality. Any state stored in variables is lost when the worker terminates. The worker wakes up on events like `chrome.runtime.onMessage`, `chrome.alarms`, or native extension events, but you have roughly 30 seconds before Chrome kills it again.

This catches many developers off guard with patterns that worked in MV2:

```javascript
// BAD - state lost on termination
let cachedData = null;
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'fetch') {
    if (cachedData) return cachedData;
    cachedData = await fetchData();
    return cachedData;
  }
});

// GOOD - always read from storage
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'fetch') {
    const { data } = await chrome.storage.local.get('data');
    return data || await fetchData();
  }
});
```

The 30-second timeout is not a guarantee. Under memory pressure, Chrome may terminate the worker in a few seconds. Always assume zero persistence between invocations.

================================================================
Event Listener Registration Timing
================================================================

In MV3, event listeners must be registered synchronously at the top level of the service worker script. You cannot register listeners inside asynchronous functions or conditionally after the worker has loaded.

This pattern will silently fail:

```javascript
// BAD - listener registered after async call
async function init() {
  const config = await loadConfig();
  if (config.enabled) {
    chrome.runtime.onMessage.addListener(handleMessage);
  }
}
init();
```

The listener is never registered because the worker may already be terminated before `init()` completes, or the registration happens outside the synchronous load phase. Always register at module scope:

```javascript
// GOOD - top-level registration
chrome.runtime.onMessage.addListener(handleMessage);

async function handleMessage(msg, sender, sendResponse) {
  const { enabled } = await chrome.storage.local.get('enabled');
  if (!enabled) return false;
  // handle message
  return true;
}
```

================================================================
Content Script World Isolation
================================================================

Content scripts run in one of two isolated worlds: the MAIN world or the ISOLATED world. The MAIN world shares the page's JavaScript context, while the ISOLATED world has its own context accessible only through the extension messaging APIs.

Understanding this distinction matters when manipulating the page. Code in the ISOLATED world (the default for content scripts) cannot see page-defined variables or functions:

```javascript
// Content script (ISOLATED world)
const pageVar = window.somePageVariable; // undefined
document.querySelectorAll('.item'); // works on DOM
```

Scripts running in the MAIN world (using `"world": "MAIN"` in manifest) can access page JavaScript but lose access to `chrome.*` APIs directly. You must communicate via messaging:

```javascript
// Content script in MAIN world
window.pageFunction(); // works
// chrome.runtime.sendMessage not available directly
```

Choose the world based on your needs. MAIN world for page interaction, ISOLATED for extension API access.

================================================================
declarativeNetRequest Limitations
================================================================

The declarativeNetRequest API replaces the blocking webRequest API for network request modification, but it has significant constraints.

You cannot dynamically create rules at runtime beyond what's declared in the manifest. The `rules` field in your manifest is static. For dynamic rules, you need the `DECLARATIVE_NET_REQUEST_DYNAMIC` permission and the `RuleResources` array, but even then there are limits.

Each extension can have at most 50,000 rules, with a maximum of 300 rules per Ruleset. Rules cannot inspect or modify request bodies. You cannot redirect to `file://` URLs or `data:` URLs. The matching is based on URL and headers only.

For many use cases this is sufficient, but if you need granular body inspection or dynamic rule generation, you will need to rethink your approach or use the more limited webRequest with `blocking: true` (which requires a host permission and is subject to additional review).

================================================================
Offscreen Document Gotchas
================================================================

Offscreen documents replace the background page for many tasks that require a DOM. However, there is a critical limitation: only one offscreen document can exist at a time per extension.

Creating a new offscreen document closes any existing one:

```javascript
// This closes the existing offscreen document
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['CLIPBOARD', 'DOM_PARSER'],
  justification: 'Processing clipboard data'
});
```

This limitation affects extensions that need multiple contexts. If your extension previously used multiple background pages or had separate logic paths, you need to consolidate into a single offscreen document or use service worker events with careful state management.

Also note that offscreen documents have a shorter lifetime than background pages. Chrome may close them when memory is low, and they do not survive browser restarts like a persistent background page would.

================================================================
chrome.storage.session Behavior
================================================================

The `chrome.storage.session` API provides in-memory storage that clears on browser restart. This is useful for temporary state, but there are subtle behaviors to understand.

Values in `session` storage are not accessible from the offscreen document. If you store authentication tokens in `session` and then create an offscreen document, the offscreen cannot read them. You need `chrome.storage.local` for cross-context access.

The storage is per-profile but not per-window. Data stored in one window is immediately available in another window of the same profile. This differs from sessionStorage in web pages which is per-tab.

There is also no storage event for `chrome.storage.session`. Changes do not trigger the `chrome.storage.onChanged` event. If you need to react to storage changes across contexts, use `chrome.storage.local` instead.

================================================================
Promise-based API Migration Traps
================================================================

MV3 introduced Promise-based versions of most callback APIs, but migrating is not always straightforward. Many developers encounter issues when mixing callbacks and promises.

The chrome.storage API returns promises when you call it without a callback, but only in service workers and modern contexts. In content scripts, the behavior depends on the browser version and context.

A common mistake is assuming promises work everywhere:

```javascript
// May fail in content scripts depending on context
const value = await chrome.storage.local.get('key');
```

Always handle both patterns or check the documentation for your target browsers. The Promise support was added gradually, and older Chrome versions may still require callbacks.

Another trap: forgetting that some APIs still require callbacks. For example, `chrome.runtime.sendMessage` still uses callbacks by default in MV3. The Promise support was added later and behaves differently across contexts.

================================================================
Web Accessible Resources Scoping
================================================================

Web accessible resources in MV3 are restricted to pages that match specific origin patterns. You must explicitly declare which sites can access your resources, and the matching is more restrictive than MV2.

In your manifest, the `web_accessible_resources` field now requires an array of objects with `resources` and `matches`:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["images/logo.png"],
      "matches": ["https://*.example.com/*"]
    }
  ]
}
```

The `matches` field uses match patterns. You cannot use `<all_urls>` in MV3 for web accessible resources without additional permissions, and even then it undergoes stricter review.

Content scripts can still inject resources into pages, but only if those resources are declared as web accessible. The restriction prevents pages from loading extension resources unless explicitly allowed.

================================================================
Side Panel Gotchas
================================================================

The side panel API in MV3 provides a dedicated UI surface, but it has several quirks.

The side panel persists across page navigations within the same tab. If your side panel makes requests based on the current page URL, you need to listen for navigation events and update accordingly. The side panel does not automatically reset when the user navigates.

You cannot open the side panel programmatically in response to user gestures in all contexts. The `chrome.sidePanel.open` method requires a user gesture in most cases, and some browsers restrict this further.

The side panel has its own CSP that follows extension page rules. It cannot load external scripts, and inline scripts are blocked. Any external resources must be packaged in the extension or declared in web accessible resources.

================================================================
CSP Restrictions in MV3
================================================================

MV3 enforces stricter Content Security Policy than MV2. The default CSP for extension pages is:

```
script-src 'self' 'wasm-unsafe-eval'; object-src 'self';
```

You cannot use `'unsafe-inline'` or `'unsafe-eval'` in the default context. If your extension or any library you use relies on eval(), you need to move that code to a sandboxed page or refactor.

Inline styles are also restricted. You cannot use `<style>` tags in your HTML files. Use CSS files loaded via `<link rel="stylesheet">` instead.

For extensions that need more permissive CSP, you can use sandbox pages which have relaxed restrictions. Sandboxed pages cannot access chrome.* APIs directly, so you must communicate via postMessage.

If you are injecting content scripts, remember they are subject to the page's CSP, not the extension's. A page with strict CSP will block your content script's attempts to use eval or inline scripts.

================================================================

These are the common pitfalls that trip up extension developers moving to MV3. Understanding these behaviors before you hit them will save debugging time.

For more patterns and guides, check out the chrome-extension-guide at zovo.one.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
