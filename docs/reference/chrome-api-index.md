# Chrome Extension API Quick Reference

## Introduction {#introduction}
- Alphabetical index of all major Chrome extension APIs
- Each entry: API name, one-line description, required permission, link to guide (if available)

## APIs A-Z {#apis-a-z}

| API | Description | Permission | Guide |
|-----|-------------|------------|-------|
| `chrome.action` | Toolbar button (icon, badge, popup) | None | `docs/mv3/action-api.md` |
| `chrome.alarms` | Schedule periodic/delayed tasks | `alarms` | `docs/guides/alarms-scheduling.md` |
| `chrome.bookmarks` | Read/write bookmarks | `bookmarks` | `docs/permissions/bookmarks.md` |
| `chrome.browsingData` | Clear browsing data | `browsingData` | — |
| `chrome.commands` | Keyboard shortcuts | None | — |
| `chrome.contentSettings` | Per-site content settings | `contentSettings` | — |
| `chrome.contextMenus` | Right-click menu items | `contextMenus` | `docs/guides/context-menus.md` |
| `chrome.cookies` | Read/write cookies | `cookies` | `docs/permissions/cookies.md` |
| `chrome.debugger` | Chrome DevTools Protocol | `debugger` | `docs/permissions/debugger.md` |
| `chrome.declarativeContent` | Show action based on page content | `declarativeContent` | — |
| `chrome.declarativeNetRequest` | Block/redirect/modify requests | `declarativeNetRequest` | `docs/permissions/declarativeNetRequest.md` |
| `chrome.desktopCapture` | Capture screen/window/tab | `desktopCapture` | — |
| `chrome.devtools.*` | Extend Chrome DevTools | None (devtools_page) | `docs/guides/devtools-extensions.md` |
| `chrome.downloads` | Manage downloads | `downloads` | `docs/permissions/downloads.md` |
| `chrome.history` | Browse/search/delete history | `history` | `docs/permissions/history.md` |
| `chrome.i18n` | Internationalization | None | `docs/guides/internationalization.md` |
| `chrome.identity` | OAuth2 authentication | `identity` | `docs/permissions/identity.md` |
| `chrome.idle` | Detect user idle state | `idle` | — |
| `chrome.management` | Manage extensions | `management` | `docs/permissions/management.md` |
| `chrome.notifications` | System notifications | `notifications` | `docs/guides/notifications-guide.md` |
| `chrome.offscreen` | Offscreen documents for DOM | `offscreen` | `docs/mv3/offscreen-documents.md` |
| `chrome.omnibox` | Address bar suggestions | None (omnibox key) | — |
| `chrome.pageCapture` | Save page as MHTML | `pageCapture` | — |
| `chrome.permissions` | Runtime permission management | None | `docs/tutorials/advanced-permissions.md` |
| `chrome.power` | Prevent display sleep | `power` | — |
| `chrome.privacy` | Privacy-related settings | `privacy` | — |
| `chrome.proxy` | Configure proxy settings | `proxy` | `docs/permissions/proxy.md` |
| `chrome.runtime` | Extension lifecycle, messaging | None | `docs/guides/service-worker-lifecycle.md` |
| `chrome.scripting` | Inject scripts/CSS into pages | `scripting` | `docs/permissions/scripting.md` |
| `chrome.search` | Trigger search | `search` | — |
| `chrome.sessions` | Restore recently closed tabs | `sessions` | — |
| `chrome.sidePanel` | Side panel UI | `sidePanel` | `docs/mv3/side-panel.md` |
| `chrome.storage` | Extension storage (local/sync) | `storage` | `docs/permissions/storage.md` |
| `chrome.tabGroups` | Manage tab groups | `tabGroups` | `docs/guides/tab-management.md` |
| `chrome.tabs` | Tab management | `tabs` (or `activeTab`) | `docs/guides/tab-management.md` |
| `chrome.topSites` | Get most visited sites | `topSites` | — |
| `chrome.tts` | Text-to-speech | `tts` | `docs/permissions/tts.md` |
| `chrome.ttsEngine` | TTS engine provider | `ttsEngine` | `docs/permissions/tts.md` |
| `chrome.webNavigation` | Page navigation events | `webNavigation` | — |
| `chrome.webRequest` | Observe/modify network requests | `webRequest` | `docs/permissions/webRequest.md` |
| `chrome.windows` | Window management | None | `docs/guides/window-management.md` |

## Package Helpers {#package-helpers}
| Package | What It Does |
|---------|-------------|
| `@theluckystrike/webext-storage` | Type-safe `chrome.storage` wrapper with schema validation, batch ops, watch |
| `@theluckystrike/webext-messaging` | Type-safe messaging with `createMessenger<M>()`, error handling |
| `@theluckystrike/webext-permissions` | Runtime permission check/request with 50+ human-readable descriptions |

## Notes {#notes}
- APIs marked "None" for permission are available to all extensions
- Some APIs require manifest keys instead of permissions (e.g., `devtools_page`, `omnibox`)
- MV3 removed: `chrome.webRequestBlocking` (use `declarativeNetRequest`), `chrome.extension.getBackgroundPage()` (use messaging)
