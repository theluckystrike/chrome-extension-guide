---
layout: default
title: "Chrome Extension MV2 to MV3 Migration. Developer Guide"
description: "Migrate your Chrome extension to Manifest V3 with this comprehensive guide covering API changes and required updates."
canonical_url: "https://bestchromeextensions.com/guides/extension-migration-mv2-to-mv3-checklist/"
---
Extension Migration MV2 to MV3 Checklist

A practical, step-by-step checklist for migrating Chrome extensions from Manifest V2 to Manifest V3. Use this as your migration workflow companion.

> This checklist complements the full migration guide at [guides/mv2-to-mv3-migration.md](../guides/mv2-to-mv3-migration.md) and the detailed reference in [mv3/manifest-v3-migration-guide.md](../mv3/manifest-v3-migration-guide.md).

---

Manifest Changes {#manifest-changes}

Version and Background {#version-and-background}
- [ ] Update `"manifest_version": 2` → `"manifest_version": 3`
- [ ] Replace `"background": { "scripts": [...] }` with `"background": { "service_worker": "background.js" }`
- [ ] Add `"type": "module"` to background if using ES modules

Action API {#action-api}
- [ ] Rename `"browser_action"` → `"action"` in manifest
- [ ] Rename `"page_action"` → `"action"` in manifest

Web Accessible Resources {#web-accessible-resources}
- [ ] Convert flat array to object array format:
  ```json
  // MV2
  "web_accessible_resources": ["resources/*"]
  
  // MV3
  "web_accessible_resources": [{ "resources": ["resources/*"], "matches": ["<all_urls>"] }]
  ```

Content Security Policy {#content-security-policy}
- [ ] Convert CSP string to object format:
  ```json
  // MV2
  "content_security_policy": "script-src 'self'; object-src 'self'"
  
  // MV3
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts allow-same-origin"
  }
  ```
- [ ] Remove any `unsafe-eval` policy
- [ ] Remove any remote script URLs (`https://...`)

Host Permissions {#host-permissions}
- [ ] Move URL patterns from `"permissions"` to `"host_permissions"`
- [ ] Move `<all_urls>` to `"host_permissions"`

---

Code Changes {#code-changes}

Background Page → Service Worker {#background-page-service-worker}
- [ ] Remove all DOM references (`document`, `window`)
- [ ] Replace `XMLHttpRequest` with `fetch()`
- [ ] Replace `setTimeout`/`setInterval` with `chrome.alarms`
- [ ] Set minimum alarm time to 30 seconds (minimum allowed since Chrome 120; was 1 minute before)
- [ ] Move all state to `chrome.storage` (no in-memory globals)
- [ ] Register event listeners at top-level (not inside async functions)
- [ ] Add lifecycle handling for service worker termination

Action API Calls {#action-api-calls}
- [ ] Replace `chrome.browserAction.*` with `chrome.action.*`
- [ ] Replace `chrome.pageAction.*` with `chrome.action.*`

Script Injection {#script-injection}
- [ ] Replace `chrome.tabs.executeScript()` with `chrome.scripting.executeScript()`
- [ ] Replace `chrome.tabs.insertCSS()` with `chrome.scripting.insertCSS()`
- [ ] Update `permissions` to include `"scripting"`

Network Request Blocking {#network-request-blocking}
- [ ] Replace `chrome.webRequest.onBeforeRequest` blocking with `chrome.declarativeNetRequest`
- [ ] Create rules JSON file for static rules
- [ ] Update `permissions` to include `"declarativeNetRequest"`
- [ ] Remove `"webRequestBlocking"` permission

Promise-Based APIs {#promise-based-apis}
- [ ] Convert callback-based APIs to `async/await`
- [ ] Update `chrome.runtime.sendMessage` → `await chrome.runtime.sendMessage()`
- [ ] Update `chrome.storage.local.get` → `await chrome.storage.local.get()`

---

Testing Checklist {#testing-checklist}

Load and Verify {#load-and-verify}
- [ ] Load extension as unpacked in `chrome://extensions`
- [ ] Enable developer mode
- [ ] Click "Load unpacked" and select extension directory
- [ ] Confirm no manifest errors

Feature Testing {#feature-testing}
- [ ] Test each extension feature manually
- [ ] Verify popup opens and functions correctly
- [ ] Test context menu items (if any)
- [ ] Test keyboard shortcuts (if any)
- [ ] Verify content scripts inject on target pages

Console Verification {#console-verification}
- [ ] Open background service worker console (Inspect link in extensions page)
- [ ] Check for runtime errors
- [ ] Check for console warnings
- [ ] Refresh extension and recheck console
- [ ] Open popup console and verify no errors

Permissions Check {#permissions-check}
- [ ] Verify all required permissions are granted
- [ ] Test any optional permissions flow
- [ ] Confirm host permissions cover target URLs

---

Common Gotchas {#common-gotchas}

No DOM in Service Worker {#no-dom-in-service-worker}
- Issue: Service workers cannot access DOM
- Fix: Use [offscreen documents](../mv3/offscreen-documents.md) for DOM operations (canvas, clipboard, parsing)

No Persistent State {#no-persistent-state}
- Issue: Service workers terminate after inactivity
- Fix: Store all state in `chrome.storage`, never in global variables

Alarm Minimum Interval {#alarm-minimum-interval}
- Issue: Alarms must be at least 30 seconds (since Chrome 120; was 1 minute before)
- Fix: Use `chrome.alarms.create(name, { periodInMinutes: 0.5 })`. minimum is 30 seconds

XMLHttpRequest Removed {#xmlhttprequest-removed}
- Issue: `XMLHttpRequest` not available in service worker
- Fix: Use `fetch()` API instead

Event Listener Registration {#event-listener-registration}
- Issue: Event listeners registered inside async functions may be missed
- Fix: Register all listeners at top-level of service worker file

Messaging Context {#messaging-context}
- Issue: `chrome.extension.getBackgroundPage()` removed
- Fix: Use message passing between service worker and other contexts

---

Cross-References {#cross-references}

- [MV3 Manifest Migration Guide](../mv3/manifest-v3-migration-guide.md). Detailed manifest changes
- [MV3 Migration Checklist](../mv3/migration-checklist.md). Comprehensive step-by-step
- [MV2 to MV3 Migration Guide](../guides/mv2-to-mv3-migration.md). Full tutorial with code examples

---

Summary {#summary}

| Area | MV2 | MV3 |
|------|-----|-----|
| Background | Persistent page | Service worker |
| Action | `browser_action` / `page_action` | `action` |
| Injection | `tabs.executeScript` | `scripting.executeScript` |
| Blocking | `webRequest` (blocking) | `declarativeNetRequest` |
| CSP | String | Object format |
| Resources | Array | Array of objects |
| Host permissions | In `permissions` | Separate `host_permissions` |

Complete this checklist, test thoroughly, and your extension will be ready for Manifest V3 submission to the Chrome Web Store.

Related Articles {#related-articles}

Related Articles

- [MV2 to MV3 Migration](../guides/mv2-to-mv3-migration.md)
- [MV3 Migration Cheatsheet](../guides/mv3-migration-cheatsheet.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
