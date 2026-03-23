---
layout: default
title: "Chrome Extension Migration Checklist. Manifest V3 Guide"
description: "Checklist for migrating Chrome extensions from Manifest V2 to V3."
canonical_url: "https://bestchromeextensions.com/mv3/migration-checklist/"
---

MV2 to MV3 Migration Checklist

Overview {#overview}
- Chrome began disabling MV2 extensions on stable channel in October 2024 (warning banners appeared June 2024)
- MV3 is required for new submissions and updates
- This checklist covers every migration step

1. manifest.json Changes {#1-manifestjson-changes}
- [ ] `"manifest_version": 2` → `"manifest_version": 3`
- [ ] `"browser_action"` → `"action"` (cross-ref: `docs/mv3/action-api.md`)
- [ ] `"page_action"` → `"action"`
- [ ] `"background": { "scripts": [...] }` → `"background": { "service_worker": "background.js" }`
- [ ] Add `"type": "module"` to background if using ES imports
- [ ] Move host permissions from `"permissions"` to `"host_permissions"`
- [ ] `"content_security_policy": "..."` → `"content_security_policy": { "extension_pages": "..." }`
- [ ] `"web_accessible_resources": [...]` → array of objects with `resources` + `matches`

2. Background Script → Service Worker {#2-background-script-service-worker}
- [ ] Replace persistent background page with service worker
- [ ] Remove all DOM usage (`document`, `window`, `XMLHttpRequest` → `fetch`)
- [ ] Register ALL event listeners at top level (not inside async/callbacks)
- [ ] Replace `setTimeout`/`setInterval` with `chrome.alarms`
- [ ] Persist state with `@theluckystrike/webext-storage` (no in-memory globals)
- [ ] Handle SW termination gracefully
- Cross-ref: `docs/guides/service-worker-lifecycle.md`, `docs/mv3/service-workers.md`

3. Permissions {#3-permissions}
- [ ] Move `<all_urls>` and URL patterns to `"host_permissions"`
- [ ] Review all permissions. remove unused ones
- [ ] Consider `"optional_permissions"` for non-critical features
- [ ] Use `@theluckystrike/webext-permissions` for runtime permission requests

4. Content Security Policy {#4-content-security-policy}
- [ ] Remove `unsafe-eval` (no `eval()`, `new Function()`, `setTimeout(string)`)
- [ ] Remove remote script loading (`<script src="https://...">`)
- [ ] Bundle all code locally
- [ ] Use object format for CSP in manifest
- Cross-ref: `docs/mv3/content-security-policy.md`

5. Web Request → Declarative Net Request {#5-web-request-declarative-net-request}
- [ ] Replace `chrome.webRequest.onBeforeRequest` blocking with `declarativeNetRequest` rules
- [ ] Create `rules.json` for static rules
- [ ] Use `updateDynamicRules` for runtime rules
- [ ] Migrate header modification to `modifyHeaders` action
- Cross-ref: `docs/mv3/declarative-net-request.md`, `docs/permissions/declarativeNetRequest.md`

6. Action API Migration {#6-action-api-migration}
- [ ] `chrome.browserAction.*` → `chrome.action.*`
- [ ] `chrome.pageAction.*` → `chrome.action.*`
- [ ] Update all references in code
- Cross-ref: `docs/mv3/action-api.md`

7. Promise-Based APIs {#7-promise-based-apis}
- [ ] Replace callbacks with `async/await` where possible
- [ ] Most Chrome APIs return Promises in MV3 (some still require callbacks)
- [ ] `chrome.runtime.onMessage` handlers returning `true` for async still required
- Cross-ref: `docs/mv3/promise-based-apis.md`

8. Offscreen Documents (if needed) {#8-offscreen-documents-if-needed}
- [ ] Identify code that needs DOM access (canvas, audio, clipboard, DOMParser)
- [ ] Move to offscreen document
- [ ] Add messaging between SW and offscreen doc
- Cross-ref: `docs/mv3/offscreen-documents.md`

9. Web Accessible Resources {#9-web-accessible-resources}
- [ ] Convert flat array to object array with `matches`/`extension_ids`
- [ ] Add specific origin patterns instead of exposing to all
- Cross-ref: `docs/mv3/web-accessible-resources.md`

10. Testing {#10-testing}
- [ ] Test all features after migration
- [ ] Verify SW terminates and restarts correctly
- [ ] Test with SW DevTools open (inspect service worker)
- [ ] Verify no `eval()` or remote code (check errors in chrome://extensions)
- [ ] Test permissions still work
- [ ] Cross-browser test if applicable (cross-ref: `docs/guides/cross-browser.md`)

Common Migration Issues {#common-migration-issues}
- `chrome.extension.getBackgroundPage()` removed. use messaging (`@theluckystrike/webext-messaging`)
- `chrome.extension.getURL()` → `chrome.runtime.getURL()`
- `chrome.storage` is always async -- ensure all usage uses callbacks or Promises
- `webRequestBlocking` removed. must use `declarativeNetRequest`
- Background page timers don't work. use `chrome.alarms`

Migration Tools {#migration-tools}
- Chrome Extension Manifest V3 migration tool (Chrome team)
- `web-ext lint` for Firefox compatibility
- TypeScript for catching API changes at compile time
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
