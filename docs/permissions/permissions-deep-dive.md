---
title: "Chrome Extension Permissions Deep Dive"
description: "The definitive reference for every Chrome extension permission: what each grants, what users see, and how to request only what you need.
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/permissions-deep-dive/"
--- 1. [How Permissions Work](#how-permissions-work)"
permalink: /permissions/permissions-deep-dive/
category: permissions
order: 29
---

# Chrome Extension Permissions Deep Dive

The definitive reference for every Chrome extension permission: what each grants,
what users see, and how to request only what you need.

---

## Table of Contents {#table-of-contents}

1. [How Permissions Work](#how-permissions-work)
2. [Permission Categories](#permission-categories)
3. [Complete Permission Reference](#complete-permission-reference)
4. [Host Permissions](#host-permissions)
5. [activeTab: The Most Important Permission](#activetab-the-most-important-permission)
6. [Permission Warnings](#permission-warnings)
7. [Optional Permissions](#optional-permissions)
8. [Minimum Viable Permissions Strategy](#minimum-viable-permissions-strategy)
9. [Permission Escalation in Updates](#permission-escalation-in-updates)
10. [Withdrawn Permissions](#withdrawn-permissions)
11. [TypeScript Helpers for Permission Checking](#typescript-helpers-for-permission-checking)
12. [Using @theluckystrike/webext-permissions](#using-theluckystrikewebext-permissions)
13. [Permission Audit Checklist](#permission-audit-checklist)

---

## How Permissions Work {#how-permissions-work}

Every Chrome extension declares what it needs in `manifest.json`. The browser
enforces these declarations at runtime -- an extension cannot access an API or
a host unless the manifest (or a runtime grant) authorises it.

There are three places permissions appear in the manifest:

```jsonc
{
  "permissions": [
    // Required API permissions -- granted at install
    "storage",
    "alarms"
  ],
  "host_permissions": [
    // Required host access -- granted at install (MV3)
    "https://api.example.com/*"
  ],
  "optional_permissions": [
    // API permissions the user can grant later
    "bookmarks"
  ],
  "optional_host_permissions": [
    // Host access the user can grant later
    "https://*.github.com/*"
  ]
}
```

In Manifest V2, host patterns lived inside `permissions`. Manifest V3 moved
them to the dedicated `host_permissions` and `optional_host_permissions` keys.

### Install-Time vs Runtime Grants {#install-time-vs-runtime-grants}

| Declared in | When granted | User experience |
|---|---|---|
| `permissions` | Install | Warning dialog before install |
| `host_permissions` | Install | Warning dialog before install |
| `optional_permissions` | Runtime | Prompt when `chrome.permissions.request()` is called |
| `optional_host_permissions` | Runtime | Prompt when `chrome.permissions.request()` is called |

Install-time permissions cannot be denied individually. The user either accepts
everything or cancels the installation. This is why minimising required
permissions matters.

---

## Permission Categories {#permission-categories}

Permissions fall into three broad categories.

### 1. API Permissions {#1-api-permissions}

These unlock specific Chrome APIs. Without the permission, calling the API
throws an error.

### 2. Host Permissions {#2-host-permissions}

These allow the extension to interact with web pages on matching origins:
inject content scripts, read page content, intercept network requests, and
modify headers.

### 3. Implicit Permissions {#3-implicit-permissions}

Some APIs require no explicit permission declaration:

- `chrome.runtime` (messaging, lifecycle)
- `chrome.storage.session` (session-only storage in MV3)
- `chrome.action` / `chrome.browserAction` (toolbar icon)
- `chrome.i18n` (internationalisation)
- `chrome.management.getSelf()` (only self-inspection)

---

## Complete Permission Reference {#complete-permission-reference}

Every permission you can declare in `manifest.json`, grouped by function.

### Storage and Data {#storage-and-data}

| Permission | API Access | Warning? |
|---|---|---|
| `storage` | `chrome.storage.local`, `chrome.storage.sync`, `chrome.storage.managed` | No |
| `unlimitedStorage` | Lifts the 10 MB quota on `storage.local` and IndexedDB | No |
| `cookies` | `chrome.cookies` -- read/write cookies for permitted hosts | Yes |

### Tabs and Windows {#tabs-and-windows}

| Permission | API Access | Warning? |
|---|---|---|
| `tabs` | `chrome.tabs` -- access `url`, `title`, `favIconUrl` on Tab objects | Yes |
| `activeTab` | Temporary host access to the active tab on user gesture | No |
| `tabGroups` | `chrome.tabGroups` -- query and modify tab groups | No |

### Navigation and History {#navigation-and-history}

| Permission | API Access | Warning? |
|---|---|---|
| `history` | `chrome.history` -- read/write browser history | Yes |
| `bookmarks` | `chrome.bookmarks` -- CRUD on the bookmark tree | Yes |
| `topSites` | `chrome.topSites` -- read the new tab page's top sites list | Yes |
| `sessions` | `chrome.sessions` -- query and restore recently closed tabs/windows | Yes |
| `readingList` | `chrome.readingList` -- CRUD on the reading list | Yes |

### Content and Scripting {#content-and-scripting}

| Permission | API Access | Warning? |
|---|---|---|
| `scripting` | `chrome.scripting` -- inject scripts, CSS, and register content scripts | No (host permissions control actual injection) |
| `activeTab` | Temporary scripting access on user gesture | No |
| `declarativeContent` | `chrome.declarativeContent` -- show action icon based on page content | No |
| `contentSettings` | `chrome.contentSettings` -- modify per-site settings (JS, cookies, images) | Yes |

### Network {#network}

| Permission | API Access | Warning? |
|---|---|---|
| `webRequest` | `chrome.webRequest` -- observe network requests | No (host permissions determine scope) |
| `declarativeNetRequest` | `chrome.declarativeNetRequest` -- block/redirect/modify requests via rules | No |
| `declarativeNetRequestWithHostAccess` | Like above but can also redirect to extension resources | No |
| `declarativeNetRequestFeedback` | Access matched rules info for debugging | No |
| `proxy` | `chrome.proxy` -- manage proxy settings | Yes |
| `dns` | `chrome.dns` -- resolve hostnames | No |

### UI and Browser Integration {#ui-and-browser-integration}

| Permission | API Access | Warning? |
|---|---|---|
| `alarms` | `chrome.alarms` -- schedule periodic or one-shot tasks | No |
| `notifications` | `chrome.notifications` -- rich desktop notifications | Yes |
| `contextMenus` | `chrome.contextMenus` -- add items to right-click menus | No |
| `sidePanel` | `chrome.sidePanel` -- register and control the side panel | No |
| `offscreen` | `chrome.offscreen` -- create offscreen documents for DOM/audio/etc. | No |
| `search` | `chrome.search` -- trigger searches via the default search engine | No |
| `omnibox` | `chrome.omnibox` -- add keyword suggestions to the address bar | No |
| `fontSettings` | `chrome.fontSettings` -- read/write font preferences | No |

### Identity and Accounts {#identity-and-accounts}

| Permission | API Access | Warning? |
|---|---|---|
| `identity` | `chrome.identity` -- OAuth2 flows, `getAuthToken`, `launchWebAuthFlow` | No |
| `identity.email` | Access user's email address via `chrome.identity.getProfileUserInfo` | Yes |

### Downloads {#downloads}

| Permission | API Access | Warning? |
|---|---|---|
| `downloads` | `chrome.downloads` -- create, pause, search, monitor downloads | Yes |
| `downloads.open` | Open downloaded files (requires `downloads` too) | Yes |
| `downloads.ui` | Modify the downloads UI (shelf visibility) | No |

### Developer and Debugging {#developer-and-debugging}

| Permission | API Access | Warning? |
|---|---|---|
| `debugger` | `chrome.debugger` -- attach Chrome DevTools Protocol to tabs | Yes |
| `management` | `chrome.management` -- list, enable, disable other extensions | Yes |
| `power` | `chrome.power` -- prevent display/system sleep | No |
| `system.cpu` | `chrome.system.cpu` -- query CPU info | No |
| `system.memory` | `chrome.system.memory` -- query memory info | No |
| `system.storage` | `chrome.system.storage` -- query attached storage devices | No |
| `system.display` | `chrome.system.display` -- query display info | No |

### Privacy and Security {#privacy-and-security}

| Permission | API Access | Warning? |
|---|---|---|
| `privacy` | `chrome.privacy` -- control privacy-related browser settings | Yes |
| `browsingData` | `chrome.browsingData` -- clear browsing data (cache, cookies, history) | No |

### Communication {#communication}

| Permission | API Access | Warning? |
|---|---|---|
| `tts` | `chrome.tts` -- text-to-speech synthesis | No |
| `ttsEngine` | `chrome.ttsEngine` -- register as a TTS engine | No |
| `gcm` | `chrome.gcm` -- Google Cloud Messaging for push notifications | No |
| `nativeMessaging` | `chrome.runtime.connectNative`, `sendNativeMessage` -- communicate with native apps | Yes |

### Clipboard {#clipboard}

| Permission | API Access | Warning? |
|---|---|---|
| `clipboardRead` | Read from clipboard via `document.execCommand('paste')` | Yes |
| `clipboardWrite` | Write to clipboard via `document.execCommand('copy')` | No |

### Platform and Enterprise {#platform-and-enterprise}

| Permission | API Access | Warning? |
|---|---|---|
| `geolocation` | Use the Geolocation API from the service worker | Yes |
| `favicon` | Access `chrome://favicon/` URLs for site favicons | No |
| `idle` | `chrome.idle` -- detect when the user is idle | No |
| `webNavigation` | `chrome.webNavigation` -- observe navigation events in tabs | Yes |
| `tabCapture` | `chrome.tabCapture` -- capture tab audio/video | Yes |
| `desktopCapture` | `chrome.desktopCapture` -- capture screen, window, or tab | Yes |
| `accessibilityFeatures.modify` | Modify accessibility settings | Yes |
| `accessibilityFeatures.read` | Read accessibility settings | Yes |

---

## Host Permissions {#host-permissions}

Host permissions control which websites the extension can interact with. They
use match patterns:

```
<scheme>://<host>/<path>
```

### Common Patterns {#common-patterns}

```jsonc
{
  "host_permissions": [
    "https://www.example.com/*",          // Single specific site
    "https://*.example.com/*",            // All subdomains of a domain
    "https://*/*",                        // Any HTTPS site
    "<all_urls>",                         // Everything including file:// and ftp://
    "https://api.example.com/v2/*"        // Specific path prefix
  ]
}
```

### Specific Hosts vs `<all_urls>` {#specific-hosts-vs-all-urls}

| Approach | Pros | Cons |
|---|---|---|
| Specific hosts | Minimal warning, higher trust | Must know all hosts upfront |
| `*://*.example.com/*` | Covers subdomains | Still limited to one domain |
| `https://*/*` | Works on any HTTPS site | Triggers "Read and change all your data on all websites" |
| `<all_urls>` | Maximum flexibility | Scariest possible warning; invites scrutiny in review |

**Rule of thumb**: use the narrowest pattern that covers your use case. If your
extension only talks to your own API, declare only that origin. If it needs to
work on arbitrary sites (like an ad blocker), you have no choice but to request
broad access -- but consider using `optional_host_permissions` and requesting
at runtime instead.

### Host Permissions and Content Scripts {#host-permissions-and-content-scripts}

Content scripts declared in the manifest are only injected on pages that match
both the content script's `matches` pattern and a granted host permission:

```jsonc
{
  "content_scripts": [
    {
      "matches": ["https://mail.google.com/*"],
      "js": ["content.js"]
    }
  ],
  "host_permissions": [
    "https://mail.google.com/*"
  ]
}
```

If you use `chrome.scripting.executeScript()` programmatically, you need host
permission for the target tab's URL (or `activeTab`).

---

## activeTab: The Most Important Permission {#activetab-the-most-important-permission}

`activeTab` is the single most important permission in the Chrome extension
ecosystem. It grants temporary access to the currently active tab, but only
when the user explicitly invokes the extension.

### What Triggers activeTab {#what-triggers-activetab}

- Clicking the extension's toolbar icon
- Selecting the extension's context menu item
- Pressing a keyboard shortcut registered via `commands`
- Accepting a suggestion from the omnibox

### What activeTab Grants {#what-activetab-grants}

When triggered, the extension receives temporary permission to:

1. Call `chrome.scripting.executeScript()` on the active tab
2. Call `chrome.scripting.insertCSS()` / `removeCSS()` on the active tab
3. Access the tab's URL, title, and favicon
4. Interact with the page as if it had host permission for that origin

The grant lasts until the tab is navigated or closed.

### Why activeTab Matters {#why-activetab-matters}

Without `activeTab`, an extension that needs to run on arbitrary pages must
request `<all_urls>` or `https://*/*` -- triggering the most alarming
permission warning. With `activeTab`, it requests nothing scary at install time
and gets access only when the user takes explicit action.

```jsonc
// BAD: Requests access to every website at install
{
  "permissions": ["scripting"],
  "host_permissions": ["<all_urls>"]
}

// GOOD: No warning, user-initiated access only
{
  "permissions": ["activeTab", "scripting"]
}
```

### activeTab Limitations {#activetab-limitations}

- Only works on user gesture -- you cannot use it from a background timer
- Only grants access to one tab at a time
- The grant expires when the tab navigates away
- Cannot be used to persistently monitor tabs
- Does not work with `chrome.webRequest` (you need real host permissions)

### When activeTab Is Not Enough {#when-activetab-is-not-enough}

You need real host permissions when:

- You must inject content scripts on page load (before user clicks)
- You need `chrome.webRequest` to observe or modify requests
- You need to work on multiple tabs simultaneously
- You need persistent access that survives navigation

---

## Permission Warnings {#permission-warnings}

Permission warnings are what users see in the install dialog. They are the
number one reason users abandon installations.

### Warning Messages by Permission {#warning-messages-by-permission}

| Permission / Pattern | Warning Message |
|---|---|
| `bookmarks` | "Read and change your bookmarks" |
| `clipboardRead` | "Read data you copy and paste" |
| `contentSettings` | "Change your settings that control websites' access to features such as cookies, JavaScript, plugins, geolocation, microphone, camera, etc." |
| `debugger` | "Access the page debugger backend" |
| `desktopCapture` | "Capture content of your screen" |
| `downloads` | "Manage your downloads" |
| `geolocation` | "Detect your physical location" |
| `history` | "Read and change your browsing history on all signed-in devices" |
| `management` | "Manage your apps, extensions, and themes" |
| `nativeMessaging` | "Communicate with cooperating native applications" |
| `notifications` | "Display notifications" |
| `privacy` | "Change your privacy-related settings" |
| `proxy` | "Read and change all your data on all websites" |
| `sessions` | "Use data you save in bookmarks and browsing history" |
| `tabs` | "Read your browsing activity" |
| `tabCapture` | "Capture content of your screen" |
| `topSites` | "Read a list of your most frequently visited websites" |
| `webNavigation` | "Read your browsing activity" |
| `<all_urls>` | "Read and change all your data on all websites" |
| `https://*.example.com/*` | "Read and change your data on all example.com sites" |
| Single host | "Read and change your data on www.example.com" |

### How Warnings Affect Install Rates {#how-warnings-affect-install-rates}

Research consistently shows:

- Each additional warning reduces install conversion by 5-15%
- "Read and change all your data on all websites" can reduce installs by 30-50%
- "Read your browsing history" causes about 20% drop
- Extensions with zero warnings have the highest install rates

### Combining Warnings {#combining-warnings}

Chrome de-duplicates warnings. If two permissions produce the same string,
users see it only once. For example, both `tabs` and `webNavigation` produce
"Read your browsing activity" -- requesting both only shows the warning once.

---

## Optional Permissions {#optional-permissions}

Optional permissions let you defer scary warnings until the user actually needs
the feature.

### Declaring Optional Permissions {#declaring-optional-permissions}

```jsonc
{
  "permissions": ["storage"],
  "optional_permissions": ["bookmarks", "history"],
  "optional_host_permissions": ["https://*.github.com/*"]
}
```

### Requesting at Runtime {#requesting-at-runtime}

```typescript
async function requestBookmarkAccess(): Promise<boolean> {
  return chrome.permissions.request({
    permissions: ['bookmarks'],
  });
}

async function requestGitHubAccess(): Promise<boolean> {
  return chrome.permissions.request({
    origins: ['https://*.github.com/*'],
  });
}
```

**Critical rule**: `chrome.permissions.request()` must be called from a user
gesture handler (click, keypress). Calling it from a timer or on page load
will fail silently or throw.

### Checking Granted Permissions {#checking-granted-permissions}

```typescript
async function hasBookmarkPermission(): Promise<boolean> {
  return chrome.permissions.contains({
    permissions: ['bookmarks'],
  });
}
```

### Removing Permissions {#removing-permissions}

Users can revoke optional permissions from `chrome://extensions`. You can also
remove them programmatically:

```typescript
async function releaseBookmarkPermission(): Promise<boolean> {
  return chrome.permissions.remove({
    permissions: ['bookmarks'],
  });
}
```

### Listening for Permission Changes {#listening-for-permission-changes}

```typescript
chrome.permissions.onAdded.addListener((permissions) => {
  console.log('Granted:', permissions);
});

chrome.permissions.onRemoved.addListener((permissions) => {
  console.log('Revoked:', permissions);
  // Disable features that depend on these permissions
});
```

### Best Practices for Optional Permissions {#best-practices-for-optional-permissions}

1. **Explain before requesting**: Show UI explaining why the permission is
   needed before calling `request()`. Users who understand the reason grant
   at much higher rates.
2. **Degrade gracefully**: If the user denies, disable the feature but do not
   break the extension.
3. **Re-check on startup**: Permissions can be revoked while the extension is
   not running. Always verify with `contains()` before using a gated API.
4. **Provide a way to revoke**: Let users disable features and revoke
   permissions from your settings page.

---

## Minimum Viable Permissions Strategy {#minimum-viable-permissions-strategy}

Follow this decision tree for every permission your extension needs:

```
Do I need this API?
  +-- No  --> Do not request it
  +-- Yes
       +-- Can I use activeTab instead of host permissions?
       |    +-- Yes --> Use activeTab
       |    +-- No  --> Use narrowest host pattern possible
       |
       +-- Is this needed for the core feature?
       |    +-- Yes --> Required permission (permissions array)
       |    +-- No  --> Optional permission (optional_permissions array)
       |
       +-- Does it trigger a warning?
            +-- Yes --> Document why in your listing
            +-- No  --> Declare it without worry
```

### Practical Example {#practical-example}

An extension that highlights text on any page and optionally saves highlights
to bookmarks:

```jsonc
{
  "manifest_version": 3,
  "name": "Highlighter",
  "permissions": [
    "activeTab",     // No warning -- inject on click
    "scripting",     // No warning -- needed for executeScript
    "storage"        // No warning -- save highlights locally
  ],
  "optional_permissions": [
    "bookmarks"      // Warning deferred until user enables bookmark sync
  ]
}
```

Zero install-time warnings. The bookmark warning only appears when the user
opts into the bookmark sync feature.

---

## Permission Escalation in Updates {#permission-escalation-in-updates}

When you publish an update that adds new required permissions, Chrome disables
the extension for existing users and shows a re-consent dialog. The user must
accept the new permissions before the extension re-enables.

### What Triggers Re-Consent {#what-triggers-re-consent}

- Adding a new entry to `permissions` that produces a new warning
- Adding a new entry to `host_permissions` that broadens scope
- Moving from specific hosts to `<all_urls>`

### What Does NOT Trigger Re-Consent {#what-does-not-trigger-re-consent}

- Adding permissions that produce no warnings (e.g., `storage`, `alarms`)
- Adding `optional_permissions` (they are never auto-granted)
- Narrowing host permissions
- Adding permissions whose warning string is already covered by an existing
  permission

### How to Handle Escalation {#how-to-handle-escalation}

1. **Avoid it if possible.** Use optional permissions for new features.
2. **Communicate proactively.** Warn users in the previous version's changelog
   that the next update will request additional access.
3. **Time it with a major feature.** Users are more willing to re-consent when
   they see clear new value.

```jsonc
// Version 1.0 -- no warnings
{
  "permissions": ["activeTab", "storage"]
}

// Version 2.0 -- BAD: forces re-consent for all users
{
  "permissions": ["activeTab", "storage", "bookmarks"]
}

// Version 2.0 -- GOOD: no re-consent, request at runtime
{
  "permissions": ["activeTab", "storage"],
  "optional_permissions": ["bookmarks"]
}
```

---

## Withdrawn Permissions {#withdrawn-permissions}

You can remove permissions in an update. Chrome handles this gracefully:

- The permission is revoked from the extension
- The user sees no prompt (removing access is always safe)
- Any code that calls the removed API will fail at runtime

### Why Remove Permissions {#why-remove-permissions}

- You refactored a feature to use a less privileged API
- You removed a feature entirely
- You moved a required permission to `optional_permissions`

### Moving Required to Optional {#moving-required-to-optional}

This is a two-step process:

1. **Version N**: Add the permission to `optional_permissions` while keeping
   it in `permissions`. (No user impact -- redundant declaration.)
2. **Version N+1**: Remove it from `permissions`. Chrome revokes the grant,
   but since it is in `optional_permissions`, the extension can re-request
   it at runtime.

If you skip step 1 and just remove the permission, users lose access and you
have no way to get it back without adding it to `optional_permissions` in a
future update.

---

## TypeScript Helpers for Permission Checking {#typescript-helpers-for-permission-checking}

Type-safe utilities for managing permissions in your extension.

### Permission Gate Decorator {#permission-gate-decorator}

```typescript
type ChromePermission = chrome.runtime.ManifestPermissions;

interface PermissionGateOptions {
  permissions?: ChromePermission[];
  origins?: string[];
  onDenied?: () => void;
}

function requiresPermission(options: PermissionGateOptions) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const granted = await chrome.permissions.contains({
        permissions: options.permissions,
        origins: options.origins,
      });

      if (!granted) {
        const accepted = await chrome.permissions.request({
          permissions: options.permissions,
          origins: options.origins,
        });

        if (!accepted) {
          options.onDenied?.();
          return undefined;
        }
      }

      return original.apply(this, args);
    };

    return descriptor;
  };
}
```

### Permission Status Checker {#permission-status-checker}

```typescript
interface PermissionStatus {
  granted: boolean;
  permission: string;
  warning: string | null;
}

const WARNING_MAP: Record<string, string> = {
  bookmarks: 'Read and change your bookmarks',
  history: 'Read and change your browsing history',
  tabs: 'Read your browsing activity',
  downloads: 'Manage your downloads',
  notifications: 'Display notifications',
  geolocation: 'Detect your physical location',
  clipboardRead: 'Read data you copy and paste',
  topSites: 'Read a list of your most frequently visited websites',
  management: 'Manage your apps, extensions, and themes',
};

async function checkPermissions(
  permissions: string[]
): Promise<PermissionStatus[]> {
  const results: PermissionStatus[] = [];

  for (const perm of permissions) {
    const granted = await chrome.permissions.contains({
      permissions: [perm as chrome.runtime.ManifestPermissions],
    });

    results.push({
      granted,
      permission: perm,
      warning: WARNING_MAP[perm] ?? null,
    });
  }

  return results;
}
```

### Safe API Caller {#safe-api-caller}

```typescript
async function safeCallWithPermission<T>(
  permission: ChromePermission,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  const hasPermission = await chrome.permissions.contains({
    permissions: [permission],
  });

  if (!hasPermission) {
    console.warn(`Missing permission: ${permission}. Using fallback.`);
    return fallback;
  }

  try {
    return await fn();
  } catch (error) {
    console.error(`API call failed for ${permission}:`, error);
    return fallback;
  }
}

// Usage:
const history = await safeCallWithPermission(
  'history',
  () => chrome.history.search({ text: '', maxResults: 10 }),
  []
);
```

---

## Using @theluckystrike/webext-permissions {#using-theluckystrikewebext-permissions}

The [`@theluckystrike/webext-permissions`](https://www.npmjs.com/package/@theluckystrike/webext-permissions)
library provides human-readable descriptions and utilities for working with
browser extension permissions.

### Installation {#installation}

```bash
npm install @theluckystrike/webext-permissions
```

### Getting Human-Readable Descriptions {#getting-human-readable-descriptions}

```typescript
import {
  getPermissionDescription,
  describeHostPattern,
  summariseManifestPermissions,
} from '@theluckystrike/webext-permissions';

// Single permission
const desc = getPermissionDescription('tabs');
// => "Allows the extension to read your browsing activity including
//     the URL, title, and favicon of every open tab."

// Host pattern
const hostDesc = describeHostPattern('https://*.github.com/*');
// => "Read and change your data on all github.com sites"

// Full manifest summary
const summary = summariseManifestPermissions({
  permissions: ['storage', 'tabs', 'activeTab'],
  host_permissions: ['https://api.example.com/*'],
  optional_permissions: ['bookmarks'],
});
```

### Building a Permissions Page {#building-a-permissions-page}

```typescript
import {
  getPermissionDescription,
  getPermissionWarning,
} from '@theluckystrike/webext-permissions';

async function renderPermissionsUI(container: HTMLElement) {
  const manifest = chrome.runtime.getManifest();
  const optional = manifest.optional_permissions ?? [];

  for (const perm of optional) {
    const granted = await chrome.permissions.contains({
      permissions: [perm],
    });

    const row = document.createElement('div');
    row.className = 'permission-row';
    row.innerHTML = `
      <label>
        <input type="checkbox" data-perm="${perm}" ${granted ? 'checked' : ''}>
        <strong>${perm}</strong>
      </label>
      <p class="description">${getPermissionDescription(perm)}</p>
      <p class="warning">
        ${getPermissionWarning(perm) ?? 'No warning shown to users'}
      </p>
    `;

    const checkbox = row.querySelector('input')!;
    checkbox.addEventListener('change', async () => {
      if (checkbox.checked) {
        const ok = await chrome.permissions.request({
          permissions: [perm],
        });
        if (!ok) checkbox.checked = false;
      } else {
        await chrome.permissions.remove({ permissions: [perm] });
      }
    });

    container.appendChild(row);
  }
}
```

### Validating Manifest Permissions {#validating-manifest-permissions}

Use the library in your build pipeline to catch mistakes:

```typescript
import { validateManifest } from '@theluckystrike/webext-permissions';

const result = validateManifest(manifest);

if (result.warnings.length > 0) {
  console.warn('Permission issues found:');
  for (const w of result.warnings) {
    console.warn(` - ${w}`);
  }
}
// Example output:
// - "tabs" permission is redundant when "activeTab" is declared
//   and no background tab enumeration is needed
// - "<all_urls>" in host_permissions: consider using
//   optional_host_permissions to reduce install friction
```

---

## Permission Audit Checklist {#permission-audit-checklist}

Run through this checklist before every Chrome Web Store submission.

### Required Permissions {#required-permissions}

- [ ] Every entry in `permissions` is actually used in the codebase
- [ ] `grep -r "chrome\.<api>" src/` confirms each API permission is called
- [ ] No permission can be moved to `optional_permissions`
- [ ] `activeTab` is used instead of broad host permissions where possible
- [ ] The `tabs` permission is only declared if you need `url`/`title` in
      background scripts (content scripts get this from `location.href`)

### Host Permissions {#host-permissions}

- [ ] Host patterns are as narrow as possible
- [ ] No wildcard hosts unless absolutely required
- [ ] Patterns use `https://` not `*://` unless HTTP access is needed
- [ ] Content script `matches` patterns align with `host_permissions`
- [ ] Consider `optional_host_permissions` for secondary domains

### Optional Permissions {#optional-permissions}

- [ ] Features outside the core flow use optional permissions
- [ ] Runtime request calls are inside user gesture handlers
- [ ] UI explains the permission before requesting it
- [ ] The extension degrades gracefully when optional permissions are denied
- [ ] `permissions.onRemoved` listener disables features when revoked

### Warnings and User Experience {#warnings-and-user-experience}

- [ ] You have counted the total number of install-time warnings
- [ ] Each warning is justified in your store listing description
- [ ] You have tested the install flow and read every warning
- [ ] The data use disclosure in the Web Store matches your actual permissions

### Updates and Maintenance {#updates-and-maintenance}

- [ ] New permissions in an update do not trigger unnecessary re-consent
- [ ] Removed features have had their permissions withdrawn
- [ ] Migration from required to optional follows the two-step process
- [ ] Changelog documents any permission changes for users

### Security {#security}

- [ ] No unused permissions that increase attack surface
- [ ] Content Security Policy in the manifest is restrictive
- [ ] Host permissions do not include origins you do not control
- [ ] `nativeMessaging` is only declared if a native host is shipped
- [ ] `debugger` permission is only for DevTools extensions, not production

---

## Summary {#summary}

Permissions are the trust contract between your extension and its users. Every
permission you request is a promise: "I need this, and I will use it
responsibly." Minimise what you ask for, explain what you need, and use
optional permissions to defer warnings until users understand the value.

The extensions with the highest install rates are the ones that request the
least. Build trust by asking for less, and earn more access through runtime
prompts that users understand and accept.

## Frequently Asked Questions

### What are optional permissions in Chrome extensions?
Optional permissions are declared in "optional_permissions" and requested at runtime when needed, giving users more control over what your extension can access.

### How do I request permissions at runtime?
Use chrome.permissions.request() with the permissions you need. The user will be prompted to grant access.
