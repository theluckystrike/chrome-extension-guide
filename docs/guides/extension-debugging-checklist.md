---
layout: default
title: "Chrome Extension Debugging Checklist — Developer Guide"
description: "Master Chrome extension debugging and testing with this guide covering tools, techniques, and common issues."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/extension-debugging-checklist/"
---
# Extension Debugging Checklist

This checklist provides a systematic approach to diagnosing and fixing common Chrome extension issues. Each section covers a specific problem area with symptoms, likely causes, diagnostic steps, and fixes.

## Table of Contents {#table-of-contents}

- [Manifest Issues](#manifest-issues)
- [Service Worker Issues](#service-worker-issues)
- [Content Script Issues](#content-script-issues)
- [Messaging Issues](#messaging-issues)
- [Storage Issues](#storage-issues)
- [UI Issues](#ui-issues)

---

## Manifest Issues {#manifest-issues}

### Symptom: Extension fails to load or shows errors in chrome://extensions {#symptom-extension-fails-to-load-or-shows-errors-in-chromeextensions}

**Likely Causes:**
- Syntax errors in manifest.json
- Missing required fields
- Invalid permission names or host permissions
- Incorrect manifest version

**How to Diagnose:**
1. Open `chrome://extensions` and look for error messages under your extension
2. Validate manifest.json using [Chrome Extension Manifest Validator](https://chrome.google.com/webstore/detail/manifest-validator)
3. Check for trailing commas or malformed JSON

**How to Fix:**
```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "permissions": ["storage", "tabs"],
  "host_permissions": ["<all_urls>"]
}
```
- Ensure all required fields are present: name, version, manifest_version
- Use correct permission names from Chrome's API documentation
- Remove unused permissions to avoid unnecessary warnings

---

## Service Worker Issues {#service-worker-issues}

### Symptom: Service worker not registering or not responding to events {#symptom-service-worker-not-registering-or-not-responding-to-events}

**Likely Causes:**
- Service worker file missing or path incorrect
- Event listeners registered inside async functions
- Service worker terminated due to inactivity (30-second timeout)

**How to Diagnose:**
1. Open `chrome://extensions`, click "Inspect views: service worker"
2. Check `chrome://serviceworker-internals` for registration status
3. Look for console errors on SW startup

**How to Fix:**
- Register listeners at top level, not inside async functions:
```javascript
// Correct: synchronous top-level registration
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // handler
});

// Persist state to survive restarts
chrome.storage.local.set({ key: value });
```

### Symptom: Lost state after service worker restarts {#symptom-lost-state-after-service-worker-restarts}

**Likely Causes:**
- Storing state in global variables
- Service worker lifecycle terminates and resets memory

**How to Diagnose:**
1. Add console.log at SW startup to detect restarts
2. Check chrome.storage for persisted state

**How to Fix:**
- Use `chrome.storage.session` for temporary state
- Use `chrome.storage.local` for persistent state
- Re-initialize state on each SW startup

---

## Content Script Issues {#content-script-issues}

### Symptom: Content script not injecting or not running {#symptom-content-script-not-injecting-or-not-running}

**Likely Causes:**
- Incorrect match patterns in manifest
- Wrong `run_at` timing
- Page conditions not met (SPA navigation, dynamic content)

**How to Diagnose:**
1. Open DevTools on the target page, check "Content scripts" in Sources panel
2. Verify match patterns match the current URL
3. Check if script is declared under `content_scripts` in manifest

**How to Fix:**
```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```
- Use `document_idle` instead of `document_end` for SPAs
- Use `chrome.scripting.executeScript` for dynamic injection

### Symptom: CSS conflicts with page styles {#symptom-css-conflicts-with-page-styles}

**Likely Causes:**
- Global CSS selectors affecting page elements
- Specificity issues with existing page styles

**How to Diagnose:**
1. Inspect elements in DevTools to see applied styles
2. Check for extension styles bleeding into page

**How to Fix:**
- Use unique class prefixes for extension styles
- Use Shadow DOM for complete isolation
- Scope styles to specific container elements

---

## Messaging Issues {#messaging-issues}

### Symptom: Messages not delivered or no response {#symptom-messages-not-delivered-or-no-response}

**Likely Causes:**
- No listener registered in destination context
- Missing `return true` for async responses
- Wrong tabId or extension context

**How to Diagnose:**
1. Add console.log in both sender and receiver
2. Check "Could not establish connection" errors in console
3. Verify sender and receiver contexts are active

**How to Fix:**
```javascript
// Content script - sender
chrome.runtime.sendMessage({ type: 'GET_DATA' });

// Service worker - receiver with async response
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    asyncOperation().then(result => sendResponse(result));
    return true; // Keep channel open for async response
  }
});
```

### Symptom: "The message port closed before a response was received" {#symptom-the-message-port-closed-before-a-response-was-received}

**Likely Causes:**
- Async handler didn't return `true` to keep channel open
- Response sent after the port closed

**How to Fix:**
- Always return `true` from onMessage listener when using async sendResponse
- Use Promise-based messaging libraries for reliability
- Implement retry logic for message delivery

---

## Storage Issues {#storage-issues}

### Symptom: Storage quota exceeded errors {#symptom-storage-quota-exceeded-errors}

**Likely Causes:**
- Storage quota exceeded (typically 10MB for local, 100KB for sync)
- Storing large objects or media files

**How to Diagnose:**
1. Check chrome.storage.local.getBytesInUse()
2. Compare against quota constants like `chrome.storage.local.QUOTA_BYTES`

**How to Fix:**
- Implement storage cleanup and rotation policies
- Store only essential data; offload large data to IndexedDB
- Use compression for stored strings

### Symptom: sync vs local confusion {#symptom-sync-vs-local-confusion}

**Likely Causes:**
- Using chrome.storage.sync when data doesn't need to sync
- Data not persisting across installs when using sync

**How to Diagnose:**
1. Check if data appears in chrome://settings
2. Verify storage type matches use case

**How to Fix:**
- Use `chrome.storage.local` for device-specific data
- Use `chrome.storage.sync` for user preferences that should follow their account
- Use `chrome.storage.session` for temporary in-memory data

---

## UI Issues {#ui-issues}

### Symptom: Popup not showing or showing blank {#symptom-popup-not-showing-or-showing-blank}

**Likely Causes:**
- Popup HTML missing or path incorrect
- JavaScript errors in popup
- CSP (Content Security Policy) blocking scripts

**How to Diagnose:**
1. Right-click extension icon -> "Inspect popup"
2. Check Console for errors
3. Verify popup path in manifest

**How to Fix:**
```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  }
}
```
- Ensure popup.html exists and loads without errors
- Avoid inline scripts; use external JS files
- Check CSP headers on chrome-extension:// URLs

### Symptom: CSP blocking extension functionality {#symptom-csp-blocking-extension-functionality}

**Likely Causes:**
- Inline scripts or styles blocked by CSP
- External requests not allowed

**How to Fix:**
- Move inline scripts to external files
- Use chrome.runtime.getURL() for extension resources
- Declare content_security_policy in manifest if needed (Manifest V3 restricts this)

---

## Cross-references {#cross-references}

- [Debugging Extensions Guide](debugging-extensions.md) - General debugging fundamentals
- [Advanced Debugging](advanced-debugging.md) - Deep-dive debugging techniques
- [Service Worker Debugging](service-worker-debugging.md) - Detailed SW lifecycle debugging

## Related Articles {#related-articles}

## Related Articles

- [Debugging Extensions](../guides/debugging-extensions.md)
- [Advanced Debugging](../guides/advanced-debugging.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
