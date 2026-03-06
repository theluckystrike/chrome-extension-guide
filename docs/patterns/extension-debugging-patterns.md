# Extension Debugging Patterns

This document covers common debugging patterns for Chrome extension development across different contexts.

## Service Worker Debugging

Service workers run in the background and require special debugging approaches:

- **Access**: Navigate to `chrome://serviceworker-internals` to see all registered service workers
- **Inspect**: Go to `chrome://extensions`, enable "Developer mode", and click "Inspect view" for your service worker
- **Console**: Each service worker has a separate DevTools window - logs appear here, not in the page's console

## Popup Debugging

The popup context is短暂 and closes on blur:

- **Inspect**: Right-click the extension icon and select "Inspect popup" (or use the context menu in chrome://extensions)
- **Alternative**: Use `chrome.action.openPopup()` from the background console to open the popup
- **Workaround**: Pin the popup to the toolbar to prevent it from closing when clicking elsewhere

## Content Script Debugging

Content scripts run in the context of web pages:

- **Sources Panel**: Open DevTools on any page with your content script injected, then go to the "Sources" tab and look for the "Content scripts" section
- **File Recognition**: Content scripts appear with a special icon or under the "Content scripts" folder
- **Breakpoints**: Set breakpoints directly in the content script from this panel

## Background Console (Service Worker)

The background/service worker console is separate from page consoles:

- Access via `chrome://extensions` > "Inspect view" on your service worker
- All `console.log`, `console.error`, etc. from the service worker appear here
- Note: The console clears on service worker restart - use persistent logging if needed

## Message Passing Debugging

Debugging communication between extension contexts:

- **Log at Both Ends**: Add console logs at both sender and receiver to verify messages
- **Check runtime.lastError**: Always check `chrome.runtime.lastError` in callbacks:
  ```javascript
  chrome.runtime.sendMessage({msg: 'hello'}, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
    }
  });
  ```
- **Verify Context**: Ensure the receiving end exists before sending

## Storage Debugging

Inspect extension storage:

- **Dump All Data**: Use `chrome.storage.local.get(null, console.log)` to retrieve all stored data
- **Sync Storage**: Use `chrome.storage.sync.get(null, console.log)` for sync storage
- **Monitor Changes**: Use the `chrome.storage.onChanged` listener to track changes

## Permission Debugging

Verify active permissions at runtime:

```javascript
chrome.permissions.getAll((permissions) => {
  console.log('Active permissions:', permissions);
});
```

This helps diagnose permission-related issues, especially with optional permissions.

## Network Debugging

Extension network requests appear in different places:

- **Page Network Tab**: Extension requests often appear in the Network tab of the page's DevTools
- **Service Worker**: Network requests made from the service worker appear in the service worker's DevTools
- **Filter**: Use "XHR" or "Fetch" filters to find extension API calls

## Breakpoints Across Contexts

Each extension context has its own DevTools:

- Set breakpoints in the appropriate DevTools window for each context
- Content script breakpoints in page DevTools
- Service worker breakpoints in service worker DevTools
- Popup breakpoints in popup DevTools

## Common Errors

### "Receiving end does not exist"

This typically means:
- The content script is not injected into the current page
- The target tab doesn't exist or has been closed
- The receiving extension context has been invalidated

### "Extension context invalidated"

This occurs after:
- Extension update (service worker restarts)
- The extension context is destroyed

Re-establish connections after these events.

## Useful Console Methods

- `console.table()` - Display structured data in table format (great for arrays/objects)
- `console.trace()` - Print stack traces for understanding call paths

## Source Maps in Extensions

For bundled extensions:
- Ensure your build process generates source maps
- Source maps allow you to debug original TypeScript/JavaScript files
- Load unpacked extension for development to enable proper source map support

## Cross-References

- [Debugging Extensions Guide](../guides/debugging-extensions.md)
- [Advanced Debugging](../guides/advanced-debugging.md)
- [Service Worker Debugging](../guides/service-worker-debugging.md)
