# Chrome Extension API Availability Reference

This reference documents which Chrome Extension APIs are available in each execution context. Use this to understand where you can use specific APIs and plan your extension architecture accordingly.

## Execution Contexts Overview {#execution-contexts-overview}

| Context | Description | DOM Access |
|---|---|---|
| **Service Worker** | Background script in MV3, event-driven | ❌ No |
| **Content Script** | Injected into web pages | ✅ Yes (shared) |
| **Popup** | Browser action popup (HTML page) | ✅ Yes |
| **Options Page** | Extension settings page | ✅ Yes |
| **Offscreen Document** | Hidden page for DOM operations | ✅ Yes |

## Chrome API Availability Matrix {#chrome-api-availability-matrix}

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
| `chrome.runtime.getBackgroundPage()` | ❌ (MV3) | ❌ | ❌ | ❌ |
| **chrome.storage** | | | | |
| `chrome.storage.local` | ✅ | ✅ | ✅ | ✅ |
| `chrome.storage.sync` | ✅ | ✅ | ✅ | ✅ |
| `chrome.storage.session` | ✅ | ⚠️** | ✅ | ✅ |
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

**`chrome.storage.session` is NOT available to content scripts by default. You must call `chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })` from the service worker to enable content script access.

## Web API Availability {#web-api-availability}

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

## Key Limitations by Context {#key-limitations-by-context}

### Service Worker Limitations {#service-worker-limitations}
- No DOM access (`document`, `window` unavailable)
- No `localStorage` or `sessionStorage`
- No `XMLHttpRequest` (use `fetch`)
- No direct clipboard access
- No access to current tab's URL directly
- Variables reset on service worker termination

### Content Script Limitations {#content-script-limitations}
- Cannot use most `chrome.*` APIs directly
- Must message service worker for: `tabs`, `bookmarks`, `history`, `downloads`, `scripting`, etc.
- Runs in isolated world — shares DOM, not JS context with page

### Workaround: Offscreen Documents {#workaround-offscreen-documents}

Use offscreen documents when you need DOM access from the service worker:

```javascript
// In service worker
async function parseHTML(html) {
  // Check if an offscreen document already exists (Chrome 116+ via runtime.getContexts)
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Parse HTML content'
    });
  }
  // Send message to offscreen document to do the work
}
```

Available offscreen reasons (partial list):
- `DOM_SCRAPING` — embed and scrape an iframe's DOM
- `DOM_PARSER` — use DOMParser API
- `CLIPBOARD` — interact with the Clipboard API
- `LOCAL_STORAGE` — access localStorage
- `AUDIO_PLAYBACK` — play audio
- `IFRAME_SCRIPTING` — embed and script an iframe
- `BLOBS` — interact with Blob objects
- `USER_MEDIA` — access getUserMedia streams
- `DISPLAY_MEDIA` — capture display media
- `WEB_RTC` — use WebRTC
- `WORKERS` — spawn a web worker
- `BATTERY_STATUS` — access Battery Status API
- `MATCH_MEDIA` — use matchMedia
- `GEOLOCATION` — use Geolocation API
- `TESTING` — for testing purposes

## Quick Reference: What to Use Where {#quick-reference-what-to-use-where}

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

## Cross-References {#cross-references}

- Content Script API: `docs/reference/content-script-api.md`
- Service Worker Tips: `docs/mv3/service-worker-tips.md`
- Offscreen Documents: `docs/mv3/offscreen-documents.md`
- Manifest Permissions: `docs/reference/manifest-permissions-map.md`
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
