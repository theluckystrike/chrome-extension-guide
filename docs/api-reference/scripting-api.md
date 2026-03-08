---
layout: default
title: "Chrome Scripting API Complete Reference"
description: "The Chrome Scripting API injects JavaScript and CSS into web pages, replacing executeScript and insertCSS with a powerful, structured interface for content manipulation."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/scripting-api/"
---

# Chrome Scripting API Reference

The `chrome.scripting` API lets you inject JavaScript and CSS into web pages. It replaces the deprecated `chrome.tabs.executeScript` and `chrome.tabs.insertCSS` from Manifest V2 with a more powerful, structured interface.

## Permissions

The `scripting` permission is required. You also need [host permissions](../permissions/host-permissions.md) for any pages you want to inject into.

```json
{
  "permissions": ["scripting"],
  "host_permissions": ["https://*.example.com/*"]
}
```

If you use `activeTab` instead of broad host permissions, injection is allowed only after the user triggers the extension (clicks the action button, uses a context menu, etc.).

## Key Types

### InjectionTarget

Specifies which tab and frames to inject into.

```ts
interface InjectionTarget {
  tabId: number;            // Required. The tab to inject into.
  frameIds?: number[];      // Specific frame IDs. Use 0 for the top-level frame.
  allFrames?: boolean;      // If true, inject into all frames in the tab.
  documentIds?: string[];   // Specific document IDs (stable across navigations).
}
```

Rules:
- `tabId` is always required.
- `frameIds`, `allFrames`, and `documentIds` are mutually exclusive.
- If none of the optional fields are set, injection targets only the top-level frame.

### ExecutionWorld

Controls the JavaScript environment where code runs.

| World | Description |
|-------|-------------|
| `"ISOLATED"` | Default. Runs in the content script isolated world. Has DOM access but not the page's JS variables. |
| `"MAIN"` | Runs in the page's own execution context. Can access page JS variables but loses extension API access. The page can observe your code. |

### ScriptInjection

```ts
interface ScriptInjection {
  target: InjectionTarget;
  world?: ExecutionWorld;            // Default: "ISOLATED"
  injectImmediately?: boolean;       // Default: false (waits for document_idle)
  func?: () => void;                 // A function to inject
  files?: string[];                  // Extension-relative script file paths
  args?: any[];                      // Arguments passed to func (JSON-serialized)
}
```

Provide exactly one of `func` or `files`.

### InjectionResult

```ts
interface InjectionResult {
  documentId: string;   // The document where the script ran
  frameId: number;      // The frame ID (0 = top-level)
  result: any;          // The return value of the injected function/script
}
```

## Methods

### chrome.scripting.executeScript(injection)

Injects JavaScript into a page. Returns a promise resolving to an array of `InjectionResult` objects, one per frame injected into.

```ts
function executeScript(injection: ScriptInjection): Promise<InjectionResult[]>;
```

#### Inject an inline function

```ts
const results = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => document.title,
});
console.log(results[0].result); // "Example Page"
```

#### Inject a function with arguments

Arguments are JSON-serialized, so they must be plain values (no DOM elements, functions, or circular references).

```ts
await chrome.scripting.executeScript({
  target: { tabId },
  func: (bgColor) => {
    document.body.style.backgroundColor = bgColor;
  },
  args: ["#ff0000"],
});
```

#### Inject a file

```ts
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ["scripts/content.js"],
});
```

#### Inject into all frames

```ts
const results = await chrome.scripting.executeScript({
  target: { tabId: tab.id, allFrames: true },
  func: () => document.querySelectorAll("a").length,
});
const totalLinks = results.reduce((sum, r) => sum + (r.result || 0), 0);
```

#### Inject into the MAIN world

```ts
const results = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: "MAIN",
  func: () => {
    return (window as any).__APP_STATE__;
  },
});
```

#### Inject immediately (before page load)

```ts
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    document.documentElement.setAttribute("data-ext-loaded", "true");
  },
  injectImmediately: true,
});
```

#### Error handling

```ts
try {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.title,
  });
} catch (error) {
  if (error.message.includes("Cannot access")) {
    console.error("No host permission for this tab");
  } else if (error.message.includes("No tab with id")) {
    console.error("Tab no longer exists");
  } else if (error.message.includes("chrome://")) {
    console.error("Cannot inject into chrome:// pages");
  }
}
```

---

### chrome.scripting.insertCSS(injection)

Injects CSS into a page.

```ts
function insertCSS(injection: CSSInjection): Promise<void>;

interface CSSInjection {
  target: InjectionTarget;
  css?: string;                    // Inline CSS string
  files?: string[];                // Extension-relative CSS file paths
  origin?: "USER" | "AUTHOR";     // Default: "AUTHOR"
}
```

Provide exactly one of `css` or `files`.

#### Inject inline CSS

```ts
await chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: "body { background-color: #1a1a2e; color: #e0e0e0; }",
});
```

#### Inject a CSS file

```ts
await chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  files: ["styles/dark-mode.css"],
});
```

#### Inject as user-origin CSS

User-origin styles have lower specificity than author styles but can use `!important` to override them effectively.

```ts
await chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: "* { font-size: 18px !important; }",
  origin: "USER",
});
```

---

### chrome.scripting.removeCSS(injection)

Removes CSS that was previously inserted with `insertCSS`. The parameters must exactly match a prior `insertCSS` call.

```ts
function removeCSS(injection: CSSInjection): Promise<void>;
```

```ts
const darkCSS = "body { background: #000; color: #fff; }";

await chrome.scripting.insertCSS({ target: { tabId: tab.id }, css: darkCSS });
// Later:
await chrome.scripting.removeCSS({ target: { tabId: tab.id }, css: darkCSS });
```

---

### chrome.scripting.registerContentScripts(scripts)

Registers content scripts dynamically at runtime. These persist across browser restarts by default and can be added, updated, or removed without reloading the extension.

```ts
function registerContentScripts(scripts: RegisteredContentScript[]): Promise<void>;

interface RegisteredContentScript {
  id: string;                          // Unique ID for this registration
  matches?: string[];                  // URL match patterns
  excludeMatches?: string[];           // URL patterns to exclude
  css?: string[];                      // CSS files to inject
  js?: string[];                       // JS files to inject
  allFrames?: boolean;                 // Default: false
  matchOriginAsFallback?: boolean;     // Match about:, data:, blob: frames
  runAt?: "document_start" | "document_end" | "document_idle";
  world?: ExecutionWorld;              // Default: "ISOLATED"
  persistAcrossSessions?: boolean;     // Default: true
}
```

#### Register a content script

```ts
await chrome.scripting.registerContentScripts([
  {
    id: "dark-mode-script",
    matches: ["https://*.example.com/*"],
    css: ["styles/dark-mode.css"],
    js: ["scripts/dark-mode.js"],
    runAt: "document_start",
  },
]);
```

#### Register multiple scripts at once

```ts
await chrome.scripting.registerContentScripts([
  {
    id: "analytics-blocker",
    matches: ["<all_urls>"],
    js: ["scripts/block-analytics.js"],
    world: "MAIN",
    runAt: "document_start",
  },
  {
    id: "ui-enhancer",
    matches: ["https://github.com/*", "https://gitlab.com/*"],
    js: ["scripts/enhance-ui.js"],
    css: ["styles/enhanced.css"],
  },
]);
```

#### Session-only scripts

```ts
await chrome.scripting.registerContentScripts([
  {
    id: "temp-debug-script",
    matches: ["https://myapp.com/*"],
    js: ["scripts/debug.js"],
    persistAcrossSessions: false,
  },
]);
```

#### Error handling

```ts
try {
  await chrome.scripting.registerContentScripts([
    { id: "my-script", matches: ["https://example.com/*"], js: ["scripts/main.js"] },
  ]);
} catch (error) {
  if (error.message.includes("Duplicate script ID")) {
    console.error("A script with this ID is already registered");
  } else if (error.message.includes("Could not load")) {
    console.error("Script file not found in extension package");
  }
}
```

---

### chrome.scripting.updateContentScripts(scripts)

Updates properties of previously registered content scripts. Only the properties you provide are changed; omitted properties keep their current values. The `id` field is required.

```ts
function updateContentScripts(scripts: RegisteredContentScript[]): Promise<void>;
```

```ts
await chrome.scripting.updateContentScripts([
  {
    id: "dark-mode-script",
    matches: ["https://*.example.com/*", "https://*.example.org/*"],
  },
]);
```

---

### chrome.scripting.unregisterContentScripts(filter?)

Removes registered content scripts. With no arguments, removes all dynamically registered scripts.

```ts
function unregisterContentScripts(filter?: { ids?: string[] }): Promise<void>;
```

```ts
// Remove specific scripts
await chrome.scripting.unregisterContentScripts({ ids: ["dark-mode-script"] });

// Remove ALL dynamically registered scripts
await chrome.scripting.unregisterContentScripts();
```

---

### chrome.scripting.getRegisteredContentScripts(filter?)

Returns all dynamically registered content scripts, optionally filtered by ID.

```ts
function getRegisteredContentScripts(
  filter?: { ids?: string[] }
): Promise<RegisteredContentScript[]>;
```

```ts
const allScripts = await chrome.scripting.getRegisteredContentScripts();
console.log(`${allScripts.length} scripts registered`);

const specific = await chrome.scripting.getRegisteredContentScripts({
  ids: ["dark-mode-script"],
});
```

---

## Common Patterns

### Toggle injection on/off

```ts
let isEnabled = false;

chrome.action.onClicked.addListener(async (tab) => {
  isEnabled = !isEnabled;

  if (isEnabled) {
    await chrome.scripting.registerContentScripts([
      {
        id: "feature-script",
        matches: ["<all_urls>"],
        js: ["scripts/feature.js"],
        css: ["styles/feature.css"],
      },
    ]);
    // Inject into the current tab immediately
    await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      files: ["scripts/feature.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id! },
      files: ["styles/feature.css"],
    });
  } else {
    await chrome.scripting.unregisterContentScripts({ ids: ["feature-script"] });
    await chrome.scripting.removeCSS({
      target: { tabId: tab.id! },
      files: ["styles/feature.css"],
    });
  }
});
```

### Inject with complex arguments and return values

```ts
interface SearchConfig {
  selector: string;
  attribute: string;
  limit: number;
}

async function extractFromPage(tabId: number, config: SearchConfig) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (cfg: SearchConfig) => {
      return Array.from(document.querySelectorAll(cfg.selector))
        .slice(0, cfg.limit)
        .map((el) => el.getAttribute(cfg.attribute))
        .filter(Boolean);
    },
    args: [config],
  });
  return results[0].result as string[];
}

const links = await extractFromPage(tab.id, {
  selector: "a[href]",
  attribute: "href",
  limit: 50,
});
```

### Bridge between MAIN and ISOLATED worlds

```ts
// Step 1: Read page variables from the MAIN world
await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: "MAIN",
  func: () => {
    const data = (window as any).__APP_CONFIG__;
    document.documentElement.setAttribute("data-ext-bridge", JSON.stringify(data));
  },
});

// Step 2: Read the value from the ISOLATED world (has extension API access)
const results = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    const raw = document.documentElement.getAttribute("data-ext-bridge");
    document.documentElement.removeAttribute("data-ext-bridge");
    return raw ? JSON.parse(raw) : null;
  },
});
```

---

## Migration from MV2

| MV2 | MV3 |
|-----|-----|
| `chrome.tabs.executeScript(tabId, { code: "..." })` | `chrome.scripting.executeScript({ target: { tabId }, func: () => ... })` |
| `chrome.tabs.executeScript(tabId, { file: "x.js" })` | `chrome.scripting.executeScript({ target: { tabId }, files: ["x.js"] })` |
| `chrome.tabs.executeScript(tabId, { allFrames: true, file: "x.js" })` | `chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["x.js"] })` |
| `chrome.tabs.insertCSS(tabId, { file: "x.css" })` | `chrome.scripting.insertCSS({ target: { tabId }, files: ["x.css"] })` |
| `chrome.tabs.removeCSS(tabId, { file: "x.css" })` | `chrome.scripting.removeCSS({ target: { tabId }, files: ["x.css"] })` |

Key differences:
1. **No arbitrary code strings.** MV2 allowed `code: "alert('hi')"`. MV3 requires a function reference or a file.
2. **Structured target.** The tab ID and frame selection are wrapped in a `target` object.
3. **Promise-based.** All MV3 methods return promises natively.
4. **Explicit permission.** MV3 requires the `"scripting"` permission in the manifest.

---

## Gotchas and Limitations

1. **Cannot inject into `chrome://` or `chrome-extension://` pages.** These are always off-limits.
2. **Cannot inject into the Chrome Web Store** (`https://chromewebstore.google.com`).
3. **`func` must be self-contained.** The injected function cannot reference variables from the outer scope. Only values passed via `args` are available.
4. **`args` are JSON-serialized.** Functions, DOM nodes, and circular structures cannot be passed.
5. **`files` paths are relative to the extension root**, not to the calling script.
6. **`removeCSS` requires an exact match** to the corresponding `insertCSS` parameters.
7. **Content script IDs must be unique** across all `registerContentScripts` calls.
8. **Dynamic scripts with `persistAcrossSessions: true`** survive extension updates, browser restarts, and enable/disable cycles.
9. **Injection into `about:blank` frames** requires `matchOriginAsFallback: true` on registered content scripts.

## See Also

- [Content Scripts Guide](../guides/content-scripts.md) -- patterns for building content scripts
- [Tabs API Reference](tabs-api.md) -- querying and managing tabs
- [Permissions Reference](../permissions/host-permissions.md) -- host permission patterns
