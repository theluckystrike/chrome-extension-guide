# Manifest Permissions Map

Comprehensive reference mapping every Chrome extension permission to its API, user warning, and category.

## Required Permissions (No Warning)
| Permission | API | Notes |
|------------|-----|-------|
| `activeTab` | Temporary host access on user gesture | Best for click-triggered actions |
| `alarms` | `chrome.alarms` | Schedule periodic tasks |
| `contextMenus` | `chrome.contextMenus` | Right-click menu items |
| `cookies` | `chrome.cookies` | Needs host_permissions too |
| `declarativeContent` | `chrome.declarativeContent` | Show/hide action icon |
| `dns` | `chrome.dns` | Resolve DNS |
| `downloads` | `chrome.downloads` | Manage downloads |
| `fontSettings` | `chrome.fontSettings` | Browser font config |
| `gcm` | `chrome.gcm` | Push messaging |
| `identity` | `chrome.identity` | OAuth flows |
| `idle` | `chrome.idle` | Detect user activity |
| `notifications` | `chrome.notifications` | System notifications |
| `offscreen` | `chrome.offscreen` | Offscreen documents |
| `power` | `chrome.power` | Prevent sleep/screen off |
| `runtime` | Enhanced `chrome.runtime` | Messaging |
| `scripting` | `chrome.scripting` | Needs host_permissions |
| `search` | `chrome.search` | Programmatic search |
| `sessions` | `chrome.sessions` | Recently closed tabs |
| `sidePanel` | `chrome.sidePanel` | Side panel UI |
| `storage` | `chrome.storage` | Extension storage |
| `tabGroups` | `chrome.tabGroups` | Tab group management |
| `tabs` | `chrome.tabs` (URL access) | See all tab URLs |
| `topSites` | `chrome.topSites` | Most visited sites |
| `tts` | `chrome.tts` | Text-to-speech |
| `unlimitedStorage` | No 10MB limit on local storage | Large data |
| `webNavigation` | `chrome.webNavigation` | Navigation events |
| `webRequest` | `chrome.webRequest` | Observe-only in MV3 |

## Permissions With Warnings
| Permission | API | Warning Shown |
|------------|-----|---------------|
| `bookmarks` | `chrome.bookmarks` | "Read and change your bookmarks" |
| `clipboardRead` | Clipboard paste | "Read data you copy and paste" |
| `clipboardWrite` | Clipboard copy | "Modify data you copy and paste" |
| `contentSettings` | `chrome.contentSettings` | "Change settings that control websites' access..." |
| `debugger` | `chrome.debugger` | "Access the page debugger backend" |
| `declarativeNetRequest` | `chrome.declarativeNetRequest` | "Block page content" |
| `geolocation` | `navigator.geolocation` | "Detect your physical location" |
| `history` | `chrome.history` | "Read and change your browsing history" |
| `management` | `chrome.management` | "Manage your apps, extensions, and themes" |
| `nativeMessaging` | Native app communication | "Communicate with cooperating native applications" |
| `privacy` | `chrome.privacy` | "Change your privacy-related settings" |

## Host Permissions
```json
{
  "host_permissions": ["https://*.example.com/*"]
}
```
- Specific hosts: "Read and change your data on [site]"
- `<all_urls>`: "Read and change all your data on all websites"
- Use optional_host_permissions to request at runtime

## Optional Permissions
```json
{
  "permissions": ["storage", "alarms"],
  "optional_permissions": ["bookmarks", "history"],
  "optional_host_permissions": ["https://*/*"]
}
```
- No install warning for optional permissions
- Request at runtime: `chrome.permissions.request({ permissions: ['bookmarks'] })`
- Use `@theluckystrike/webext-permissions` for type-safe permission management:
  - `checkPermission('bookmarks')`, `requestPermission('bookmarks')`
  - `describePermission('bookmarks')` returns human-readable description

## Best Practices
- Start with `activeTab` instead of broad host permissions
- Make high-warning permissions optional
- Only request permissions when user needs the feature
- Use `@theluckystrike/webext-permissions` `listPermissions()` to show users what's granted
