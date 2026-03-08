---
layout: default
title: "debugger Permission — Chrome Extension Reference"
description: ": : Access to API — attach to tabs and use Chrome DevTools Protocol (CDP) : Very High — full CDP access can..."
permalink: /permissions/debugger/
category: permissions
order: 11
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/debugger/"
---

# debugger Permission — Chrome Extension Reference

## Overview {#overview}
- **Permission string**: `"debugger"`
- **What it grants**: Access to `chrome.debugger` API — attach to tabs and use Chrome DevTools Protocol (CDP)
- **Risk level**: Very High — full CDP access can read/modify page content, intercept network, access cookies
- **User prompt**: "Access the page debugger backend" and "Read and change all your data on all websites"
- `@theluckystrike/webext-permissions`: `describePermission('debugger')`

## manifest.json {#manifestjson}
```json
{ "permissions": ["debugger"] }
```

## Key APIs {#key-apis}

### chrome.debugger.attach(target, version, callback) {#chromedebuggerattachtarget-version-callback}
```javascript
chrome.debugger.attach({ tabId: tab.id }, "1.3", () => {
  // Attached to tab, can now send CDP commands
  // Chrome shows "Extension is debugging this browser" infobar
});
```

### chrome.debugger.sendCommand(target, method, params?, callback?) {#chromedebuggersendcommandtarget-method-params-callback}
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

### chrome.debugger.detach(target, callback) {#chromedebuggerdetachtarget-callback}
### chrome.debugger.getTargets(callback) {#chromedebuggergettargetscallback}
- List all debuggable targets (tabs, service workers, etc.)

### chrome.debugger.onEvent {#chromedebuggeronevent}
```javascript
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === "Network.responseReceived") {
    console.log("Response:", params.response.url, params.response.status);
  }
});
```

### chrome.debugger.onDetach {#chromedebuggerondetach}
- Fires when debugger is detached (user closed infobar, tab closed, etc.)

## Chrome DevTools Protocol (CDP) Domains {#chrome-devtools-protocol-cdp-domains}
- **DOM**: Read/modify page DOM tree
- **Network**: Monitor/intercept all network requests
- **Page**: Navigate, screenshot, PDF generation
- **Runtime**: Execute JavaScript in page context
- **CSS**: Read/modify stylesheets
- **Console**: Capture console messages
- **Emulation**: Device emulation, geolocation override
- Full CDP docs: chromedevtools.github.io/devtools-protocol/

## Common Patterns {#common-patterns}

### Screenshot Capture {#screenshot-capture}
- Attach, `Page.captureScreenshot`, detach
- Full page: set viewport first with `Emulation.setDeviceMetricsOverride`

### Network Monitor {#network-monitor}
- `Network.enable` then listen for `Network.requestWillBeSent`, `Network.responseReceived`
- Get response bodies with `Network.getResponseBody`

### Performance Profiling {#performance-profiling}
- `Performance.enable`, `Performance.getMetrics`
- `Tracing.start`/`Tracing.end` for detailed traces

### Automated Testing {#automated-testing}
- Navigate pages, click elements, fill forms via CDP
- Assert DOM state, check network requests

## Security & UX Considerations {#security-ux-considerations}
- Chrome shows prominent "debugging" infobar — user will see it
- Extremely powerful — CWS review will be thorough
- Only use when no other API can accomplish the task
- Consider `optional_permissions` — request only when needed
- Store debug preferences with `@theluckystrike/webext-storage`

## Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

```ts
import { checkPermission, requestPermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

const result = await checkPermission("debugger");
console.log(result.description); // "Access the page debugger backend"
console.log(result.granted);

PERMISSION_DESCRIPTIONS.debugger; // "Access the page debugger backend"

// This is a very high-risk permission — consider optional_permissions
if (!result.granted) {
  const req = await requestPermission("debugger");
  if (!req.granted) return;
}
```

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Pattern: popup triggers debug actions, background manages CDP sessions:

```ts
type Messages = {
  captureScreenshot: {
    request: { tabId: number; format?: "png" | "jpeg" };
    response: { dataUrl: string };
  };
  getPageMetrics: {
    request: { tabId: number };
    response: { domNodes: number; jsHeapSize: number; layoutCount: number };
  };
  detachDebugger: {
    request: { tabId: number };
    response: { detached: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();

msg.onMessage({
  captureScreenshot: async ({ tabId, format }) => {
    await chrome.debugger.attach({ tabId }, "1.3");
    try {
      const result = await chrome.debugger.sendCommand(
        { tabId },
        "Page.captureScreenshot",
        { format: format || "png" }
      );
      return { dataUrl: `data:image/${format || "png"};base64,${(result as any).data}` };
    } finally {
      await chrome.debugger.detach({ tabId });
    }
  },
  getPageMetrics: async ({ tabId }) => {
    await chrome.debugger.attach({ tabId }, "1.3");
    try {
      await chrome.debugger.sendCommand({ tabId }, "Performance.enable", {});
      const metrics = await chrome.debugger.sendCommand({ tabId }, "Performance.getMetrics", {});
      const m = (metrics as any).metrics;
      return {
        domNodes: m.find((x: any) => x.name === "Nodes")?.value || 0,
        jsHeapSize: m.find((x: any) => x.name === "JSHeapUsedSize")?.value || 0,
        layoutCount: m.find((x: any) => x.name === "LayoutCount")?.value || 0,
      };
    } finally {
      await chrome.debugger.sendCommand({ tabId }, "Performance.disable", {});
      await chrome.debugger.detach({ tabId });
    }
  },
  detachDebugger: async ({ tabId }) => {
    await chrome.debugger.detach({ tabId });
    return { detached: true };
  },
});
```

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Store debug session preferences and captured data:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  screenshotFormat: "png" as "png" | "jpeg",
  screenshotQuality: 80,
  capturedScreenshots: [] as Array<{ url: string; dataUrl: string; timestamp: number }>,
  networkLogEnabled: false,
});
const storage = createStorage({ schema });

// Watch for network logging toggle
storage.watch("networkLogEnabled", (enabled) => {
  if (enabled) console.log("Network logging activated");
  else console.log("Network logging deactivated");
});
```

## Practical Example: Full-Page Screenshot {#practical-example-full-page-screenshot}

```ts
async function captureFullPage(tabId: number): Promise<string> {
  await chrome.debugger.attach({ tabId }, "1.3");

  try {
    // Get full page dimensions
    const layout = await chrome.debugger.sendCommand(
      { tabId },
      "Page.getLayoutMetrics",
      {}
    ) as any;

    const { width, height } = layout.contentSize;

    // Override viewport to full page size
    await chrome.debugger.sendCommand({ tabId }, "Emulation.setDeviceMetricsOverride", {
      width: Math.ceil(width),
      height: Math.ceil(height),
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Capture
    const screenshot = await chrome.debugger.sendCommand(
      { tabId },
      "Page.captureScreenshot",
      { format: "png", fromSurface: true }
    ) as any;

    // Reset viewport
    await chrome.debugger.sendCommand({ tabId }, "Emulation.clearDeviceMetricsOverride", {});

    return `data:image/png;base64,${screenshot.data}`;
  } finally {
    await chrome.debugger.detach({ tabId });
  }
}
```

## Gotchas {#gotchas}
- **Chrome shows a persistent "debugging" infobar** — users will see "Extension is debugging this browser" at the top of the tab. There is no way to suppress this. Attach and detach quickly to minimize user disruption.
- **Only one debugger per tab** — if another extension (or DevTools) is already attached to a tab, `attach()` will fail. Always handle the `"Cannot attach to this target"` error gracefully.
- **`onDetach` fires when the user dismisses the infobar** — the user can cancel debugging at any time by clicking the infobar's close button. Always listen for `onDetach` with reason `"canceled_by_user"` and clean up state accordingly.
- **CDP commands are async but not always Promise-based** — in older Chrome versions, `sendCommand` uses callbacks. In MV3, most are Promise-based, but always check for errors.
- **Chrome Web Store scrutiny is intense** — extensions using `debugger` get extra review. Document clearly why you need CDP access, and consider whether `scripting` or `activeTab` could achieve the same goal.

## Common Errors {#common-errors}
- `"Cannot attach to this target"` — already attached or target not debuggable
- User dismissed infobar — `onDetach` fires with `"canceled_by_user"`
- CDP version mismatch — use `"1.3"` for broadest compatibility
- Multiple extensions can't debug same tab simultaneously

## Related {#related}
- [Chrome debugger API docs](https://developer.chrome.com/docs/extensions/reference/api/debugger)
- [Chrome DevTools Protocol reference](https://chromedevtools.github.io/devtools-protocol/)
- [scripting](scripting.md) — lighter-weight alternative for script injection
- [activeTab](activeTab.md) — temporary tab access without full debugging

## Frequently Asked Questions

### What is the chrome.debugger API used for?
The chrome.debugger API allows extensions to instrument network traffic, debug JavaScript, and interact with pages using the Chrome DevTools Protocol.

### Why does debugger require a permission warning?
The debugger API provides powerful capabilities that can intercept and modify page content, which is why it triggers a permission warning.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
