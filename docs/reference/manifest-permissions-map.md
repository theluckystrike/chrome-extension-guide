# Manifest Permissions Map

Comprehensive reference mapping every Chrome extension permission to its API, user warning, and category.

## Required Permissions (No Warning) {#required-permissions-no-warning}
| Permission | API | Notes |
|------------|-----|-------|
| `activeTab` | Temporary host access on user gesture | Best for click-triggered actions |
| `alarms` | `chrome.alarms` | Schedule periodic tasks |
| `contextMenus` | `chrome.contextMenus` | Right-click menu items |
| `cookies` | `chrome.cookies` | Needs host_permissions too |
| `declarativeContent` | `chrome.declarativeContent` | Show/hide action icon |
| `dns` | `chrome.dns` | Resolve DNS |
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
| `tts` | `chrome.tts` | Text-to-speech |
| `unlimitedStorage` | No 10MB limit on local storage | Large data |
| `webRequest` | `chrome.webRequest` | Observe-only in MV3 |

## Permissions With Warnings {#permissions-with-warnings}
| Permission | API | Warning Shown |
|------------|-----|---------------|
| `bookmarks` | `chrome.bookmarks` | "Read and change your bookmarks" |
| `clipboardRead` | Clipboard paste | "Read data you copy and paste" |
| `clipboardWrite` | Clipboard copy | "Modify data you copy and paste" |
| `contentSettings` | `chrome.contentSettings` | "Change settings that control websites' access..." |
| `debugger` | `chrome.debugger` | "Access the page debugger backend" |
| `declarativeNetRequest` | `chrome.declarativeNetRequest` | "Block content on any page" |
| `downloads` | `chrome.downloads` | "Manage your downloads" |
| `geolocation` | `navigator.geolocation` | "Detect your physical location" |
| `history` | `chrome.history` | "Read and change your browsing history" |
| `management` | `chrome.management` | "Manage your apps, extensions, and themes" |
| `nativeMessaging` | Native app communication | "Communicate with cooperating native applications" |
| `privacy` | `chrome.privacy` | "Change your privacy-related settings" |
| `tabs` | `chrome.tabs` | "Read your browsing history" |
| `topSites` | `chrome.topSites` | "Read a list of your most frequently visited websites" |
| `webNavigation` | `chrome.webNavigation` | "Read your browsing history" |

## Host Permissions {#host-permissions}
```json
{
  "host_permissions": ["https://*.example.com/*"]
}
```
- Specific hosts: "Read and change your data on [site]"
- `<all_urls>`: "Read and change all your data on all websites"
- Use optional_host_permissions to request at runtime

## Optional Permissions {#optional-permissions}
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

## Best Practices {#best-practices}
- Start with `activeTab` instead of broad host permissions
- Make high-warning permissions optional
- Only request permissions when user needs the feature
- Use `@theluckystrike/webext-permissions` `listPermissions()` to show users what's granted
