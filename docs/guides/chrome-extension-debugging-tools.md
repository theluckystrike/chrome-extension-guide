---
layout: default
title: "Chrome Extension Debugging Tools — Developer Guide"
description: "Master Chrome extension debugging and testing with this guide covering tools, techniques, and common issues."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-debugging-tools/"
---
# Chrome Extension Debugging Tools

A comprehensive deep dive into debugging tools and techniques for Chrome extension development.

## Chrome Internal Pages

### chrome://extensions
The central hub for managing extensions. Enable "Developer mode" to access debugging features. View errors and warnings directly on this page - a red badge on your extension indicates runtime errors that need attention.

### chrome://inspect/#service-workers
Inspect active service workers for your extensions. View running workers, their lifecycle state, and click "inspect" to open a dedicated DevTools window for the service worker context.

### chrome://serviceworker-internals
Provides detailed lifecycle information about service workers. Use this to debug worker registration issues, update cycles, and termination behavior.

## Extension DevTools

### Sources Panel
The Sources panel shows your extension's files in the "Content scripts" folder for injected scripts. Add breakpoints by clicking line numbers - these persist across page reloads.

### Application Panel
Access the Storage section to inspect chrome.storage.local, chrome.storage.sync, and chrome.storage.managed. View IndexedDB databases and Cache API data directly.

## Console Tricks

```javascript
// Copy any value to clipboard
copy(myVariable);

// Reference the currently selected element in Elements panel
$0;

// Inspect all instances of a constructor
queryObjects(ConstructorName);

// Monitor function calls
monitor(functionName);
```

## Breakpoint Types

- **Line breakpoints**: Pause execution at specific lines
- **Conditional breakpoints**: Pause only when conditions are met
- **XHR/Fetch breakpoints**: Break on network requests matching patterns
- **DOM breakpoints**: Pause on subtree modifications, attribute changes, or node removal
- **Event listener breakpoints**: Break on specific event types

## Source Maps

Enable source maps in your bundler configuration (Webpack, Rollup, Vite) to map minified code back to source files. This provides readable stack traces and allows debugging original source directly.

```javascript
// webpack.config.js example
devtool: 'source-map',
```

## Network Debugging

Extension network requests appear in the page DevTools Network tab. Filter by "Other" to isolate extension-originated requests. Note that requests from service workers show the extension ID as the initiator.

## Performance Profiling

Record performance profiles to analyze extension popup rendering. Open the popup, start recording, interact with UI, then stop to identify bottlenecks in your rendering pipeline.

## Memory Leak Detection

1. Take a heap snapshot before an operation
2. Perform the operation
3. Take another snapshot
4. Compare snapshots to identify retained objects

Look for detached DOM trees and growing object counts that don't release after garbage collection.

## Remote Debugging

Use chrome://inspect to debug extensions on mobile devices or remote Chrome instances. Configure port forwarding for Android device testing.

## Debug Logging

Include version information in logs using chrome.management.getSelf() to track which extension version generated specific log entries:

```javascript
chrome.management.getSelf((info) => {
  console.log(`Extension v${info.version}:`, myData);
});
```

## Related Guides

- [Debugging Extensions](./debugging-extensions.md) - Basic debugging techniques
- [Advanced Debugging](./advanced-debugging.md) - Complex debugging scenarios
- [Service Worker Debugging](./service-worker-debugging.md) - Service worker specific tips

## Related Articles

- [Debugging Extensions](../guides/debugging-extensions.md)
- [Advanced Debugging](../guides/advanced-debugging.md)
