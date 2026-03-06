# Chrome Windows API Reference

The `chrome.windows` API lets you create, modify, query, and monitor browser windows. It works closely with the [Tabs API](tabs-api.md) — every tab lives inside a window.

## Permissions

No special permission is required to use `chrome.windows` methods. However, the `tabs` permission is needed to access `url`, `title`, and `favIconUrl` on the `Tab` objects returned in `window.tabs`.

## Window Object

| Property | Type | Description |
|----------|------|-------------|
| `id` | `number` | Unique window identifier |
| `focused` | `boolean` | Whether the window is currently focused |
| `top` | `number` | Vertical position in pixels |
| `left` | `number` | Horizontal position in pixels |
| `width` | `number` | Width in pixels |
| `height` | `number` | Height in pixels |
| `tabs` | `Tab[]` | Array of tabs in the window (only if `populate: true`) |
| `incognito` | `boolean` | Whether this is an incognito window |
| `type` | `WindowType` | One of `"normal"`, `"popup"`, `"panel"`, `"app"`, `"devtools"` |
| `state` | `WindowState` | One of `"normal"`, `"minimized"`, `"maximized"`, `"fullscreen"`, `"locked-fullscreen"` |
| `alwaysOnTop` | `boolean` | Whether the window is always on top |
| `sessionId` | `string \| undefined` | Session ID for restored windows |

## Core Methods

### chrome.windows.get(windowId, queryOptions?)

Get a specific window by ID.

```ts
const win = await chrome.windows.get(windowId);
console.log(win.state, win.focused);

// Include tab data
const win = await chrome.windows.get(windowId, { populate: true });
console.log(`${win.tabs!.length} tabs in this window`);

// Filter by window type
const win = await chrome.windows.get(windowId, {
  windowTypes: ["normal", "popup"],
});
```

### chrome.windows.getCurrent(queryOptions?)

Get the window that contains the calling script (popup, options page, etc.).

```ts
// From popup.ts or options.ts
const current = await chrome.windows.getCurrent({ populate: true });
console.log(`Current window has ${current.tabs!.length} tabs`);
```

### chrome.windows.getLastFocused(queryOptions?)

Get the most recently focused window.

```ts
const focused = await chrome.windows.getLastFocused();
console.log("Last focused window:", focused.id);
```

### chrome.windows.getAll(queryOptions?)

Get all open browser windows.

```ts
// All windows with their tabs
const allWindows = await chrome.windows.getAll({ populate: true });
const totalTabs = allWindows.reduce((sum, w) => sum + (w.tabs?.length || 0), 0);
console.log(`${allWindows.length} windows, ${totalTabs} total tabs`);

// Only normal windows (exclude popups, devtools, etc.)
const normalWindows = await chrome.windows.getAll({
  windowTypes: ["normal"],
});
```

### chrome.windows.create(createData?)

Open a new browser window.

```ts
// Empty new window
const win = await chrome.windows.create();

// Window with a specific URL
const win = await chrome.windows.create({
  url: "https://example.com",
});

// Window with multiple tabs
const win = await chrome.windows.create({
  url: [
    "https://example.com",
    "https://developer.chrome.com",
  ],
});

// Popup-style window (no tab strip, no address bar)
const popup = await chrome.windows.create({
  url: chrome.runtime.getURL("popup.html"),
  type: "popup",
  width: 400,
  height: 600,
  left: 100,
  top: 100,
});

// Incognito window
const incog = await chrome.windows.create({
  url: "https://example.com",
  incognito: true,
});

// Focused, maximized window
const win = await chrome.windows.create({
  url: "https://example.com",
  focused: true,
  state: "maximized",
});
```

**CreateData properties:** `url` (string or string[]), `tabId`, `left`, `top`, `width`, `height`, `focused`, `incognito`, `type`, `state`, `setSelfAsOpener`.

### chrome.windows.update(windowId, updateInfo)

Modify an existing window.

```ts
// Focus a window
await chrome.windows.update(windowId, { focused: true });

// Minimize
await chrome.windows.update(windowId, { state: "minimized" });

// Maximize
await chrome.windows.update(windowId, { state: "maximized" });

// Resize and reposition
await chrome.windows.update(windowId, {
  left: 0,
  top: 0,
  width: 800,
  height: 600,
});

// Enter fullscreen
await chrome.windows.update(windowId, { state: "fullscreen" });
```

**UpdateInfo properties:** `left`, `top`, `width`, `height`, `focused`, `drawAttention`, `state`.

### chrome.windows.remove(windowId)

Close a window and all its tabs.

```ts
await chrome.windows.remove(windowId);
```

## Special Constants

### chrome.windows.WINDOW_ID_NONE

Value: `-1`. Indicates that no window is focused (e.g. all Chrome windows are minimized or another app is in focus).

### chrome.windows.WINDOW_ID_CURRENT

Value: `-2`. Refers to the window executing the current code. Useful in `chrome.windows.get()`.

```ts
const current = await chrome.windows.get(chrome.windows.WINDOW_ID_CURRENT);
```

## Events

### chrome.windows.onCreated

```ts
chrome.windows.onCreated.addListener((window) => {
  console.log("New window:", window.id, window.type);
});

// With filters
chrome.windows.onCreated.addListener(
  (window) => { /* ... */ },
  { windowTypes: ["normal"] },
);
```

### chrome.windows.onRemoved

```ts
chrome.windows.onRemoved.addListener((windowId) => {
  console.log("Window closed:", windowId);
});
```

### chrome.windows.onFocusChanged

Fires when the focused window changes. Fires frequently — use it carefully.

```ts
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    console.log("No Chrome window is focused");
  } else {
    console.log("Focused window:", windowId);
  }
});
```

### chrome.windows.onBoundsChanged

Fires when a window is resized or moved.

```ts
chrome.windows.onBoundsChanged.addListener((window) => {
  console.log(`Window ${window.id}: ${window.width}x${window.height} at (${window.left}, ${window.top})`);
});
```

## Using with @theluckystrike/webext-messaging

Multi-window management from a popup or dashboard:

```ts
// shared/messages.ts
type Messages = {
  getAllWindows: {
    request: void;
    response: Array<{ id: number; tabCount: number; focused: boolean; type: string }>;
  };
  createWindow: {
    request: { urls: string[]; type?: "normal" | "popup" };
    response: { windowId: number };
  };
  focusWindow: {
    request: { windowId: number };
    response: { success: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();

msg.onMessage({
  getAllWindows: async () => {
    const windows = await chrome.windows.getAll({ populate: true });
    return windows.map((w) => ({
      id: w.id!,
      tabCount: w.tabs?.length || 0,
      focused: w.focused,
      type: w.type || "normal",
    }));
  },
  createWindow: async ({ urls, type }) => {
    const win = await chrome.windows.create({ url: urls, type: type || "normal" });
    return { windowId: win.id! };
  },
  focusWindow: async ({ windowId }) => {
    await chrome.windows.update(windowId, { focused: true });
    return { success: true };
  },
});
```

## Using with @theluckystrike/webext-storage

Persist window layouts and restore them:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

interface SavedLayout {
  windows: Array<{
    left: number;
    top: number;
    width: number;
    height: number;
    urls: string[];
  }>;
}

const schema = defineSchema({
  savedLayouts: {} as Record<string, SavedLayout>,
  lastLayout: "" as string,
});

const storage = createStorage({ schema, area: "local" });

// Save current layout
async function saveLayout(name: string) {
  const windows = await chrome.windows.getAll({ populate: true });
  const layout: SavedLayout = {
    windows: windows
      .filter((w) => w.type === "normal")
      .map((w) => ({
        left: w.left!,
        top: w.top!,
        width: w.width!,
        height: w.height!,
        urls: w.tabs?.map((t) => t.url || "about:blank") || [],
      })),
  };
  const layouts = await storage.get("savedLayouts");
  layouts[name] = layout;
  await storage.set("savedLayouts", layouts);
  await storage.set("lastLayout", name);
}

// Restore a saved layout
async function restoreLayout(name: string) {
  const layouts = await storage.get("savedLayouts");
  const layout = layouts[name];
  if (!layout) return;

  for (const win of layout.windows) {
    await chrome.windows.create({
      url: win.urls,
      left: win.left,
      top: win.top,
      width: win.width,
      height: win.height,
    });
  }
}
```

## Common Patterns

### Split screen — open two windows side by side

```ts
async function splitScreen(leftUrl: string, rightUrl: string) {
  const screen = await chrome.system.display.getInfo();
  const { width, height } = screen[0].workArea;

  await chrome.windows.create({
    url: leftUrl,
    left: 0, top: 0,
    width: Math.floor(width / 2), height,
  });
  await chrome.windows.create({
    url: rightUrl,
    left: Math.floor(width / 2), top: 0,
    width: Math.floor(width / 2), height,
  });
}
```

### Move a tab to a new window

```ts
const win = await chrome.windows.create({ tabId: existingTabId });
```

### Check if any window is focused

```ts
chrome.windows.onFocusChanged.addListener((windowId) => {
  const chromeIsFocused = windowId !== chrome.windows.WINDOW_ID_NONE;
});
```

## Gotchas

1. **`window.tabs` is only populated** when you pass `{ populate: true }` in the query options. Otherwise `tabs` will be `undefined`.

2. **`state` and dimensions are mutually exclusive** in `create()` and `update()`. You cannot set `state: "maximized"` and also set `width`/`height` — the state takes precedence.

3. **Popup windows have no tab strip or address bar.** They look like standalone app windows. Use `type: "popup"` for dashboard-style UIs.

4. **`onFocusChanged` fires with `WINDOW_ID_NONE`** when the user switches to another application entirely. Handle this case.

5. **Incognito window creation** requires `"incognito": "spanning"` (default) or `"incognito": "split"` in the manifest. If your extension is not allowed in incognito, the call will fail.

6. **Window IDs are not stable** across browser sessions. Do not persist them.

## Related

- [Tabs API](tabs-api.md)
- [tabs permission](../permissions/tabs.md)
- [Chrome windows API docs](https://developer.chrome.com/docs/extensions/reference/api/windows)
