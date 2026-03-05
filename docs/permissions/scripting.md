# scripting Permission Reference

## What It Does
- Grants access to the `chrome.scripting` API (MV3 replacement for `chrome.tabs.executeScript`)
- Inject JavaScript and CSS into web pages programmatically
- Key methods: `executeScript()`, `insertCSS()`, `removeCSS()`, `registerContentScripts()`, `unregisterContentScripts()`, `getRegisteredContentScripts()`

## MV3 Change
In MV2, script injection used `chrome.tabs.executeScript()`. In MV3, use `chrome.scripting.executeScript()` instead. The `scripting` permission is required.

| Action | MV2 | MV3 |
|--------|-----|-----|
| Inject JS | `chrome.tabs.executeScript()` | `chrome.scripting.executeScript()` |
| Inject CSS | `chrome.tabs.insertCSS()` | `chrome.scripting.insertCSS()` |
| Dynamic content scripts | N/A | `chrome.scripting.registerContentScripts()` |

## Host Permissions Required
`scripting` needs host permissions for target pages, UNLESS combined with `activeTab`:

```json
// Option A: specific hosts
{ "permissions": ["scripting"], "host_permissions": ["https://*.example.com/*"] }

// Option B: with activeTab (no host permissions needed)
{ "permissions": ["scripting", "activeTab"] }
```

## Manifest Configuration
```json
{
  "permissions": ["scripting", "activeTab"],
  "action": { "default_popup": "popup.html" }
}
```

## Using with @theluckystrike/webext-permissions

```ts
import { checkPermission, describePermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

const result = await checkPermission("scripting");
console.log(result.description); // "Inject scripts into web pages"
console.log(result.granted);

PERMISSION_DESCRIPTIONS.scripting; // "Inject scripts into web pages"
```

## Using with @theluckystrike/webext-messaging

Pattern: popup requests background to inject script, get results back:

```ts
type Messages = {
  extractPageInfo: {
    request: { tabId: number };
    response: { title: string; wordCount: number; links: string[] };
  };
  injectHighlighter: {
    request: { tabId: number; color: string };
    response: { success: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();

msg.onMessage({
  extractPageInfo: async ({ tabId }) => {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        title: document.title,
        wordCount: document.body.innerText.split(/\s+/).length,
        links: Array.from(document.querySelectorAll("a[href]")).map(a => (a as HTMLAnchorElement).href).slice(0, 50),
      }),
    });
    return result.result;
  },
  injectHighlighter: async ({ tabId, color }) => {
    await chrome.scripting.insertCSS({
      target: { tabId },
      css: `::selection { background: ${color}; }`,
    });
    return { success: true };
  },
});
```

## Using with @theluckystrike/webext-storage

Store injection preferences:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  autoInjectEnabled: false,
  customCSS: "",
  injectedTabs: [] as number[],
});
const storage = createStorage({ schema });

// Watch for config changes
storage.watch("autoInjectEnabled", (enabled) => {
  if (enabled) registerDynamicScripts();
  else unregisterDynamicScripts();
});
```

## Key Methods

| Method | Description |
|--------|-------------|
| `executeScript({ target, func })` | Inject and run a function |
| `executeScript({ target, files })` | Inject script files |
| `insertCSS({ target, css })` | Inject inline CSS |
| `insertCSS({ target, files })` | Inject CSS files |
| `removeCSS({ target, css })` | Remove previously injected CSS |
| `registerContentScripts(scripts)` | Dynamically register content scripts |
| `unregisterContentScripts({ ids })` | Remove dynamic content scripts |
| `getRegisteredContentScripts()` | List registered dynamic scripts |

## Common Patterns
1. Click-to-extract with activeTab + scripting
2. Dynamic content script registration
3. Theme/CSS injection from options page
4. Page analysis tools
5. Web scraping helpers

## Gotchas
- `executeScript` with `func` serializes the function — no closures, no outer scope access
- Use `args` parameter to pass data into injected functions
- Cannot inject into `chrome://`, `chrome-extension://`, or Chrome Web Store pages
- `activeTab` + `scripting` is the most privacy-friendly combo for click-triggered injection
- Dynamic content scripts persist across extension restarts (unlike MV2)

## Related Permissions
- [activeTab](activeTab.md) — temporary host access, pairs perfectly with scripting
- [tabs](tabs.md) — read tab URLs to decide what to inject
