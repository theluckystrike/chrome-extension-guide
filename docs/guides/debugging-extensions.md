---
layout: default
title: "Chrome Extension Extension Debugging. Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/debugging-extensions/"
---
Debugging Chrome Extensions

Introduction {#introduction}
- Debugging extensions is harder than web apps. multiple contexts, background workers, content scripts
- This guide covers tools and techniques for each extension component

1. Debugging the Service Worker (Background) {#1-debugging-the-service-worker-background}
- Open `chrome://extensions`, find your extension, click "Inspect views: service worker"
- Opens a DevTools window connected to the background context
- Console logs, breakpoints, network tab all work here
- Common issue: Service worker terminates after 30 seconds of inactivity
  - Symptom: listeners stop firing, state is lost
  - Fix: persist state with `@theluckystrike/webext-storage`. `storage.set('key', value)` survives restarts
  - Fix: re-register all listeners at the top level (not inside async functions)

2. Debugging Content Scripts {#2-debugging-content-scripts}
- Open DevTools on the page where the content script runs
- In the Sources panel, find your content script under "Content scripts" in the sidebar
- Console context: switch the context dropdown from "top" to your extension name
- Common issue: "Cannot access chrome.runtime". content script isolated world doesn't share the page's JS context
  - Fix: use `@theluckystrike/webext-messaging` to communicate with background:
    ```typescript
    // content.ts
    const messenger = createMessenger<Messages>();
    const response = await messenger.sendMessage('fetchData', { url: location.href });
    ```

3. Debugging Popup and Options Pages {#3-debugging-popup-and-options-pages}
- Right-click the extension icon -> "Inspect popup" (popup must be open)
- For options: navigate to chrome-extension://<id>/options.html and open DevTools
- Gotcha: Popup closes when you click away. use "Inspect popup" to keep it alive
- DevTools stays open even after popup closes, preserving console output

4. Debugging Messaging {#4-debugging-messaging}
- Use `console.log` in both sender and receiver to trace message flow
- Common errors and fixes:
  - `"Could not establish connection. Receiving end does not exist."`. Content script not injected or background SW terminated
  - `"The message port closed before a response was received."`. Async handler didn't return `true` to keep the channel open
  - `@theluckystrike/webext-messaging` `MessagingError` wraps these with `originalError` for better debugging:
    ```typescript
    try {
      await messenger.sendMessage('getData', {});
    } catch (e) {
      if (e instanceof MessagingError) {
        console.error('Messaging failed:', e.message, e.originalError);
      }
    }
    ```

5. Debugging Storage {#5-debugging-storage}
- In DevTools for any extension context: Application tab -> Storage -> Extension Storage
- Or use the console: `chrome.storage.local.get(null, console.log)` to dump all local storage
- Watch for changes in real-time with `@theluckystrike/webext-storage`:
  ```typescript
  storage.watch('settings', (newVal, oldVal) => {
    console.log('Settings changed:', oldVal, '->', newVal);
  });
  ```

6. Debugging Permissions {#6-debugging-permissions}
- `chrome.permissions.getAll()`. check what's currently granted
- Or use `@theluckystrike/webext-permissions`:
  ```typescript
  const granted = await getGrantedPermissions();
  console.log('Granted:', granted.permissions, granted.origins);
  ```
- Common issue: "Permissions not granted". check that permission is in `permissions` or `optional_permissions` in manifest

7. Chrome Extension Error Logs {#7-chrome-extension-error-logs}
- `chrome://extensions` -> toggle "Developer mode" -> click "Errors" on your extension
- Shows uncaught exceptions, CSP violations, manifest errors
- Clear errors regularly to spot new issues

8. Useful DevTools Tricks {#8-useful-devtools-tricks}
- `chrome.management.getSelf()`. get your extension's metadata
- `chrome.runtime.reload()`. reload the extension from console
- Network tab: filter by your extension's origin to see only its requests
- Preserve log across page navigations: Settings -> Preserve log

Debugging Workflow Summary {#debugging-workflow-summary}
1. Check `chrome://extensions` errors first
2. Inspect the relevant context (SW, content, popup)
3. Add targeted `console.log` at messaging boundaries
4. Use storage watch to track state changes
5. Test permission grants with `getGrantedPermissions()`

Related Articles {#related-articles}

Related Articles

- [Debugging Checklist](../guides/extension-debugging-checklist.md)
- [Debugging Tools](../guides/chrome-extension-debugging-tools.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
