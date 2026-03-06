# Manifest Permissions Map

Quick reference mapping every Chrome extension permission to the API it unlocks and the warning shown to users.

## Permission Table

| Permission | API Unlocked | User Warning | Guide |
|------------|-------------|--------------|-------|
| `activeTab` | Temporary host access on click | None (no warning) | `docs/permissions/activeTab.md` |
| `alarms` | `chrome.alarms` | None | `docs/permissions/alarms.md` |
| `background` | Persistent background (MV2) | None | - |
| `bookmarks` | `chrome.bookmarks` | "Read and change your bookmarks" | `docs/permissions/bookmarks.md` |
| `browsingData` | `chrome.browsingData` | None | - |
| `clipboardRead` | `document.execCommand('paste')` | "Read data you copy and paste" | - |
| `clipboardWrite` | `document.execCommand('copy')` | "Modify data you copy and paste" | - |
| `contentSettings` | `chrome.contentSettings` | "Change settings that control websites' access to features such as cookies, JavaScript..." | - |
| `contextMenus` | `chrome.contextMenus` | None | `docs/permissions/contextMenus.md` |
| `cookies` | `chrome.cookies` | None (but needs host_permissions) | `docs/permissions/cookies.md` |
| `debugger` | `chrome.debugger` | "Access the page debugger backend" | `docs/permissions/debugger.md` |
| `declarativeContent` | `chrome.declarativeContent` | None | - |
| `declarativeNetRequest` | `chrome.declarativeNetRequest` | "Block page content" | `docs/permissions/declarativeNetRequest.md` |
| `declarativeNetRequestFeedback` | Matched rules feedback | "Read your browsing history" | - |
| `declarativeNetRequestWithHostAccess` | DNR with host access | None (uses host_permissions) | - |
| `dns` | `chrome.dns` | None | - |
| `downloads` | `chrome.downloads` | None | `docs/permissions/downloads.md` |
| `downloads.open` | `chrome.downloads.open()` | None | - |
| `downloads.ui` | `chrome.downloads.setUiOptions()` | None | - |
| `enterprise.deviceAttributes` | Enterprise device info | None | - |
| `enterprise.hardwarePlatform` | Hardware info | None | - |
| `enterprise.networkingAttributes` | Network info | None | - |
| `enterprise.platformKeys` | Platform keys | None | - |
| `fileBrowserHandler` | ChromeOS file handler | None | - |
| `fileSystemProvider` | ChromeOS file system | None | - |
| `fontSettings` | `chrome.fontSettings` | None | - |
| `gcm` | `chrome.gcm` (push messaging) | None | - |
| `geolocation` | `navigator.geolocation` | "Detect your physical location" | - |
| `history` | `chrome.history` | "Read and change your browsing history" | `docs/permissions/history.md` |
| `identity` | `chrome.identity` | None | `docs/permissions/identity.md` |
| `idle` | `chrome.idle` | None | - |
| `management` | `chrome.management` | "Manage your apps, extensions, and themes" | - |
| `nativeMessaging` | `chrome.runtime.connectNative()` | "Communicate with cooperating native applications" | - |
| `notifications` | `chrome.notifications` | None | `docs/permissions/notifications.md` |
| `offscreen` | `chrome.offscreen` | None | - |
| `pageCapture` | `chrome.pageCapture` | None | - |
| `power` | `chrome.power` | None | - |
| `printerProvider` | `chrome.printerProvider` | None | - |
| `privacy` | `chrome.privacy` | "Change your privacy-related settings" | - |
| `proxy` | `chrome.proxy` | None | `docs/permissions/proxy.md` |
| `readingList` | `chrome.readingList` | None | - |
| `runtime` | Runtime messaging | None | - |
| `scripting` | `chrome.scripting` | None (needs host_permissions) | `docs/permissions/scripting.md` |
| `search` | `chrome.search` | None | - |
| `sessions` | `chrome.sessions` | None | - |
| `sidePanel` | `chrome.sidePanel` | None | - |
| `storage` | `chrome.storage` | None | `docs/permissions/storage.md` |
| `system.cpu` | `chrome.system.cpu` | None | - |
| `system.display` | `chrome.system.display` | None | - |
| `system.memory` | `chrome.system.memory` | None | - |
| `system.storage` | `chrome.system.storage` | None | - |
| `tabCapture` | `chrome.tabCapture` | None | - |
| `tabGroups` | `chrome.tabGroups` | None | - |
| `tabs` | `chrome.tabs` (full URL access) | None (but exposes URL data) | `docs/permissions/tabs.md` |
| `topSites` | `chrome.topSites` | None | - |
| `tts` | `chrome.tts` | None | `docs/permissions/tts.md` |
| `ttsEngine` | `chrome.ttsEngine` | None | - |
| `unlimitedStorage` | Unlimited `chrome.storage.local` | None | - |
| `vpnProvider` | `chrome.vpnProvider` (ChromeOS) | None | - |
| `wallpaper` | `chrome.wallpaper` (ChromeOS) | None | - |
| `webNavigation` | `chrome.webNavigation` | None | - |
| `webRequest` | `chrome.webRequest` | None (observe-only in MV3) | `docs/permissions/webRequest.md` |
| `webRequestBlocking` | Blocking web requests (MV2) | N/A (MV3: use declarativeNetRequest) | - |

## Host Permissions

Host permissions grant access to specific websites:
```json
{
  "host_permissions": [
    "https://*.example.com/*",
    "https://api.github.com/*",
    "<all_urls>"
  ]
}
```

### Warning levels
- **Specific hosts**: "Read and change your data on [site]"
- **All URLs**: "Read and change all your data on all websites"
- **No host permissions**: No site-specific warning

## Optional vs Required

```json
{
  "permissions": ["storage", "alarms"],
  "optional_permissions": ["bookmarks", "history"],
  "host_permissions": ["https://api.example.com/*"],
  "optional_host_permissions": ["https://*/*"]
}
```

- **Required**: granted at install, shown in install prompt
- **Optional**: requested at runtime via `chrome.permissions.request()`, no install warning
- Use `@theluckystrike/webext-permissions` for runtime permission management

## Permission Categories

### No Warning (Safe to require)
`activeTab`, `alarms`, `contextMenus`, `cookies`, `declarativeContent`, `dns`, `downloads`, `fontSettings`, `gcm`, `identity`, `idle`, `notifications`, `offscreen`, `power`, `runtime`, `scripting`, `search`, `sessions`, `sidePanel`, `storage`, `tabGroups`, `tabs`, `topSites`, `tts`, `unlimitedStorage`, `webNavigation`, `webRequest`

### Warning (Consider making optional)
`bookmarks`, `browsingData`, `contentSettings`, `debugger`, `declarativeNetRequest`, `geolocation`, `history`, `management`, `nativeMessaging`, `privacy`, `proxy`

### High Warning (Definitely optional)
`<all_urls>` host permission, `clipboardRead`, `declarativeNetRequestFeedback`
