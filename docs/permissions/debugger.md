# debugger Permission — Chrome Extension Reference

## Overview
- **Permission string**: `"debugger"`
- **What it grants**: Access to `chrome.debugger` API — attach to tabs and use Chrome DevTools Protocol (CDP)
- **Risk level**: Very High — full CDP access can read/modify page content, intercept network, access cookies
- **User prompt**: "Access the page debugger backend"
- `@theluckystrike/webext-permissions`: `describePermission('debugger')`

## manifest.json
```json
{ "permissions": ["debugger"] }
```

## Key APIs

### chrome.debugger.attach(target, version, callback)
```javascript
chrome.debugger.attach({ tabId: tab.id }, "1.3", () => {
  // Attached to tab, can now send CDP commands
  // Chrome shows "Extension is debugging this browser" infobar
});
```

### chrome.debugger.sendCommand(target, method, params?, callback?)
```javascript
// Get page DOM
chrome.debugger.sendCommand({ tabId }, "DOM.getDocument", {}, (result) => {
  console.log(result.root);
});
// Take screenshot
chrome.debugger.sendCommand({ tabId }, "Page.captureScreenshot", { format: "png" }, (result) => {
  const dataUrl = "data:image/png;base64," + result.data;
});
// Intercept network
chrome.debugger.sendCommand({ tabId }, "Network.enable", {});
```

### chrome.debugger.detach(target, callback)
### chrome.debugger.getTargets(callback)
- List all debuggable targets (tabs, service workers, etc.)

### chrome.debugger.onEvent
```javascript
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === "Network.responseReceived") {
    console.log("Response:", params.response.url, params.response.status);
  }
});
```

### chrome.debugger.onDetach
- Fires when debugger is detached (user closed infobar, tab closed, etc.)

## Chrome DevTools Protocol (CDP) Domains
- **DOM**: Read/modify page DOM tree
- **Network**: Monitor/intercept all network requests
- **Page**: Navigate, screenshot, PDF generation
- **Runtime**: Execute JavaScript in page context
- **CSS**: Read/modify stylesheets
- **Console**: Capture console messages
- **Emulation**: Device emulation, geolocation override
- Full CDP docs: chromedevtools.github.io/devtools-protocol/

## Common Patterns

### Screenshot Capture
- Attach, `Page.captureScreenshot`, detach
- Full page: set viewport first with `Emulation.setDeviceMetricsOverride`

### Network Monitor
- `Network.enable` then listen for `Network.requestWillBeSent`, `Network.responseReceived`
- Get response bodies with `Network.getResponseBody`

### Performance Profiling
- `Performance.enable`, `Performance.getMetrics`
- `Tracing.start`/`Tracing.end` for detailed traces

### Automated Testing
- Navigate pages, click elements, fill forms via CDP
- Assert DOM state, check network requests

## Security & UX Considerations
- Chrome shows prominent "debugging" infobar — user will see it
- Extremely powerful — CWS review will be thorough
- Only use when no other API can accomplish the task
- Consider `optional_permissions` — request only when needed
- Store debug preferences with `@theluckystrike/webext-storage`

## Common Errors
- `"Cannot attach to this target"` — already attached or target not debuggable
- User dismissed infobar — `onDetach` fires with `"canceled_by_user"`
- CDP version mismatch — use `"1.3"` for broadest compatibility
- Multiple extensions can't debug same tab simultaneously
