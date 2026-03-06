# Chrome Extension API Availability Reference

This reference documents which Chrome Extension APIs are available in each execution context. Use this to understand where you can use specific APIs and plan your extension architecture accordingly.

## Execution Contexts Overview

| Context | Description | DOM Access |
|---|---|---|
| **Service Worker** | Background script in MV3, event-driven | ❌ No |
| **Content Script** | Injected into web pages | ✅ Yes (shared) |
| **Popup** | Browser action popup (HTML page) | ✅ Yes |
| **Options Page** | Extension settings page | ✅ Yes |
| **Offscreen Document** | Hidden page for DOM operations | ✅ Yes |

## Chrome API Availability Matrix

| API | Service Worker | Content Script | Popup/Options | Offscreen |
|---|---|---|---|---|
| **chrome.runtime** | | | | |
| `chrome.runtime.sendMessage()` | ✅ | ✅ | ✅ | ✅ |
| `chrome.runtime.connect()` | ✅ | ✅ | ✅ | ✅ |
| `chrome.runtime.onMessage` | ✅ | ✅ | ✅ | ✅ |
| `chrome.runtime.onConnect` | ✅ | ✅ | ✅ | ✅ |
| `chrome.runtime.getURL()` | ✅ | ✅ | ✅ | ✅ |
| `chrome.runtime.id` | ✅ | ✅ | ✅ | ✅ |
| `chrome.runtime.getManifest()` | ✅ | ✅ | ✅ | ✅ |
| `chrome.runtime.getBackgroundPage()` | ✅ | ❌ | ❌ | ❌ |
| **chrome.storage** | | | | |
| `chrome.storage.local` | ✅ | ✅ | ✅ | ✅ |
| `chrome.storage.sync` | ✅ | ✅ | ✅ | ✅ |
| `chrome.storage.session` | ✅ | ✅ | ✅ | ✅ |
| `chrome.storage.onChanged` | ✅ | ✅ | ✅ | ✅ |
| **chrome.tabs** | | | | |
| `chrome.tabs.*` | ✅ | ❌* | ✅ | ❌ |
| **chrome.alarms** | | | | |
| `chrome.alarms.*` | ✅ | ❌ | ✅ | ❌ |
| **chrome.action** | | | | |
| `chrome.action.*` | ✅ | ❌ | ✅ | ❌ |
| **chrome.bookmarks** | | | | |
| `chrome.bookmarks.*` | ✅ | ❌ | ✅ | ❌ |
| **chrome.history** | | | | |
| `chrome.history.*` | ✅ | ❌ | ✅ | ❌ |
| **chrome.downloads** | | | | |
| `chrome.downloads.*` | ✅ | ❌ | ✅ | ❌ |
| **chrome.scripting** | | | | |
| `chrome.scripting.*` | ✅ | ❌ | ✅ | ❌ |
| **chrome.notifications** | | | | |
| `chrome.notifications.*` | ✅ | ❌ | ✅ | ❌ |
| **chrome.i18n** | | | | |
| `chrome.i18n.*` | ✅ | ✅ | ✅ | ✅ |
| **chrome.offscreen** | | | | |
| `chrome.offscreen.*` | ✅ | ❌ | ✅ | ❌ |
| **chrome.commands** | | | | |
| `chrome.commands.*` | ✅ | ❌ | ✅ | ❌ |
| **chrome.contextMenus** | | | | |
| `chrome.contextMenus.*` | ✅ | ❌ | ✅ | ❌ |
| **chrome.webNavigation** | | | | |
| `chrome.webNavigation.*` | ✅ | ❌ | ✅ | ❌ |

*Content scripts can access `chrome.tabs` via `sender.tab` in message listeners.

## Web API Availability

| Web API | Service Worker | Content Script | Popup/Options | Offscreen |
|---|---|---|---|---|
| `fetch()` | ✅ | ✅ | ✅ | ✅ |
| `XMLHttpRequest` | ❌ | ✅ | ✅ | ✅ |
| `localStorage` | ❌ | ✅* | ✅ | ✅ |
| `sessionStorage` | ❌ | ✅ | ✅ | ✅ |
| `navigator.clipboard` | ❌ | ❌ | ✅ | ✅ |
| `window` / `document` | ❌ | ✅ | ✅ | ✅ |
| `DOMParser` | ❌ | ✅ | ✅ | ✅ |
| `Canvas` / `WebGL` | ❌ | ✅ | ✅ | ✅ |
| `MutationObserver` | ❌ | ✅ | ✅ | ✅ |
| `IntersectionObserver` | ❌ | ✅ | ✅ | ✅ |
| `ResizeObserver` | ❌ | ✅ | ✅ | ✅ |
| `Web Workers` | ❌ | ✅ | ✅ | ✅ |

*In isolated world content scripts, `localStorage` is separate from the page's localStorage.

## Key Limitations by Context

### Service Worker Limitations
- No DOM access (`document`, `window` unavailable)
- No `localStorage` or `sessionStorage`
- No `XMLHttpRequest` (use `fetch`)
- No direct clipboard access
- No access to current tab's URL directly
- Variables reset on service worker termination

### Content Script Limitations
- Cannot use most `chrome.*` APIs directly
- Must message service worker for: `tabs`, `bookmarks`, `history`, `downloads`, `scripting`, etc.
- Runs in isolated world — shares DOM, not JS context with page

### Workaround: Offscreen Documents

Use offscreen documents when you need DOM access from the service worker:

```javascript
// In service worker
async function parseHTML(html) {
  if (!await chrome.offscreen.hasDocument()) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Parse HTML content'
    });
  }
  // Send message to offscreen document to do the work
}
```

Available offscreen reasons:
- `DOM_SCRAPING` — parse/manipulate DOM
- `DOM_PARSER` — use DOMParser
- `CLIPBOARD` — clipboard operations
- `LOCAL_STORAGE` — localStorage access
- `AUDIO_PLAYBACK` — play audio
- `IFRAME_SCRIPTING` — interact with iframes

## Quick Reference: What to Use Where

| Need | Use In | Not Available In |
|---|---|---|
| Store settings | Any context (`chrome.storage`) | — |
| Handle extension install/update | Service Worker | — |
| Schedule tasks | Service Worker (`chrome.alarms`) | Content Script |
| Inject content scripts | Service Worker (`chrome.scripting`) | — |
| Access tabs/URLs | Service Worker, Popup | Content Script |
| DOM manipulation | Content Script, Offscreen | Service Worker |
| Clipboard (read/write) | Popup, Offscreen | Service Worker, CS |
| i18n messages | Any context | — |
| Show notifications | Service Worker, Popup | Content Script |

## Cross-References

- Content Script API: `docs/reference/content-script-api.md`
- Service Worker Tips: `docs/mv3/service-worker-tips.md`
- Offscreen Documents: `docs/mv3/offscreen-documents.md`
- Manifest Permissions: `docs/reference/manifest-permissions-map.md`
