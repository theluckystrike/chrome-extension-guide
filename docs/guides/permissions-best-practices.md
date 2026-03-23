# Chrome Extension Permissions Best Practices

Permissions are the foundation of Chrome extension security. They control what your extension can access and do, directly impacting user trust, Chrome Web Store approval, and the overall security posture of your extension. This guide covers best practices for declaring, requesting, and managing permissions in Manifest V3 extensions, with practical examples and patterns you can apply immediately.

For the official documentation, see [Declare Permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions).

## Required vs Optional Permissions

Understanding the distinction between required and optional permissions is crucial for building trustworthy extensions. Required permissions are declared in the manifest at install time, while optional permissions can be requested at runtime when specific features are needed.

### Required Permissions

Required permissions appear in the installation dialog and cannot be changed after installation. Users must accept all required permissions to install your extension. This makes required permissions a critical factor in installation conversion rates.

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "permissions": [
    "storage",
    "tabs",
    "activeTab"
  ],
  "host_permissions": [
    "https://*.example.com/*"
  ]
}
```

Required permissions are appropriate for functionality that is core to your extension's purpose. If your extension fundamentally cannot function without a permission, declare it as required. However, always consider whether optional permissions could provide the same functionality with a better user experience.

### Optional Permissions

Optional permissions allow users to install your extension with minimal permissions, with additional capabilities granted as needed. This approach reduces installation friction and builds trust by demonstrating that your extension respects user privacy.

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0",
  "permissions": [
    "storage"
  ],
  "optional_permissions": [
    "bookmarks",
    "notifications",
    "geolocation",
    "https://*.analytics.com/*"
  ]
}
```

When a user attempts to use a feature requiring an optional permission, you can request it dynamically. If the user denies the permission, your extension should gracefully degrade rather than fail completely.

## host_permissions vs permissions

In Manifest V3, Chrome distinguishes between API permissions and host permissions. Understanding this separation is essential for proper permission management.

### API Permissions (permissions field)

The `permissions` field contains API permissions that grant access to Chrome extension APIs. These are capabilities like accessing storage, managing tabs, or sending notifications.

```json
{
  "permissions": [
    "storage",
    "tabs",
    "scripting",
    "activeTab",
    "contextMenus"
  ]
}
```

API permissions typically generate warnings in the installation dialog. For example, `tabs` permission shows "Read and change your browsing activity on all websites" because it can access URL and title of every tab.

### Host Permissions (host_permissions field)

The `host_permissions` field contains website access permissions using match patterns. These specify which URLs your extension can access.

```json
{
  "host_permissions": [
    "https://*.google.com/*",
    "https://api.myapp.com/*",
    "<all_urls>"
  ]
}
```

Host permissions are particularly sensitive because they allow your extension to read and modify content on websites. The `<all_urls>` permission (or `*://*/*`) grants access to every website and will generate significant warnings.

### Migration from Manifest V2

In Manifest V2, host permissions were mixed with API permissions in the `permissions` array. Manifest V3 separates them for clarity:

```json
// Manifest V2
{
  "permissions": [
    "storage",
    "tabs",
    "https://*/*"
  ]
}

// Manifest V3
{
  "permissions": [
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://*/*"
  ]
}
```

## Runtime Permission Requests

Chrome provides the Permissions API for checking and requesting permissions at runtime. This is essential for optional permissions but can also be used to explain why a permission is needed before requesting it.

### Checking Permissions with chrome.permissions.contains

Before requesting a permission, check if it's already granted using `chrome.permissions.contains()`. This method takes a permissions object and returns whether the extension currently has those permissions.

```typescript
async function hasPermission(permission: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.permissions.contains(
      { permissions: [permission] },
      (result) => resolve(result)
    );
  });
}

// Usage example
async function checkStoragePermission(): Promise<void> {
  const hasStorage = await hasPermission('storage');
  console.log(`Storage permission: ${hasStorage ? 'granted' : 'not granted'}`);
}
```

For host permissions, check using the `origins` property:

```typescript
async function hasHostPermission(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.permissions.contains(
      { origins: [url] },
      (result) => resolve(result)
    );
  });
}

// Check if we can access a specific domain
async function checkExampleAccess(): Promise<void> {
  const hasAccess = await hasHostPermission('https://example.com/*');
  console.log(`example.com access: ${hasAccess ? 'granted' : 'not granted'}`);
}
```

### Requesting Permissions with chrome.permissions.request

Use `chrome.permissions.request()` to request optional permissions at runtime. The user will see a prompt asking them to grant the specific permission. Always explain why the permission is needed before requesting it.

```typescript
interface PermissionRequestResult {
  granted: boolean;
}

async function requestPermission(permission: string): Promise<PermissionRequestResult> {
  // First, check if already granted
  const alreadyGranted = await hasPermission(permission);
  if (alreadyGranted) {
    return { granted: true };
  }

  // Request the permission
  return new Promise((resolve) => {
    chrome.permissions.request(
      { permissions: [permission] },
      (granted) => {
        if (chrome.runtime.lastError) {
          console.error('Permission request failed:', chrome.runtime.lastError);
          resolve({ granted: false });
        } else {
          resolve({ granted });
        }
      }
    );
  });
}

// Request optional notifications permission
async function enableNotifications(): Promise<void> {
  const result = await requestPermission('notifications');
  if (result.granted) {
    console.log('Notifications enabled!');
    // Now you can use chrome.notifications API
  } else {
    console.log('Notifications permission denied');
    // Provide alternative UX without notifications
  }
}
```

For host permissions, request with `origins`:

```typescript
async function requestHostPermission(urlPattern: string): Promise<boolean> {
  // Check current permissions first
  const alreadyGranted = await hasHostPermission(urlPattern);
  if (alreadyGranted) {
    return true;
  }

  return new Promise((resolve) => {
    chrome.permissions.request(
      { origins: [urlPattern] },
      (granted) => {
        if (chrome.runtime.lastError) {
          console.error('Host permission request failed:', chrome.runtime.lastError);
          resolve(false);
        } else {
          resolve(granted);
        }
      }
    );
  });
}

// Request access to a specific API
async function enableAnalytics(): Promise<void> {
  const granted = await requestHostPermission('https://analytics.example.com/*');
  if (granted) {
    console.log('Analytics access enabled!');
  } else {
    console.log('Analytics permission denied');
  }
}
```

### Permission Events: onAdded and onRemoved

Listen for permission changes to react when users grant or revoke permissions through Chrome's extension settings.

```typescript
// Handle when permissions are granted
chrome.permissions.onAdded.addListener((permissions) => {
  console.log('Permissions granted:', permissions);

  // Update extension state based on new permissions
  if (permissions.permissions?.includes('notifications')) {
    console.log('Notifications are now available!');
  }
  if (permissions.origins?.length > 0) {
    console.log('Host permissions granted for:', permissions.origins);
  }
});

// Handle when permissions are removed
chrome.permissions.onRemoved.addListener((permissions) => {
  console.log('Permissions removed:', permissions);

  // Handle permission revocation gracefully
  if (permissions.permissions?.includes('notifications')) {
    console.log('Notifications permission was revoked');
    // Disable notification-related features
  }
});
```

These events are particularly useful for maintaining sync between your extension's feature flags and actual permissions, and for cleaning up resources when permissions are revoked.

## The Principle of Least Privilege

The principle of least privilege states that your extension should request only the permissions it absolutely needs to function. This principle should guide every permission decision you make.

### Why Least Privilege Matters

Every permission you request increases your extension's attack surface. If your extension is compromised, an attacker gains access to everything your extension can access. Additionally, excessive permissions create friction in the installation process and reduce user trust.

### Practical Application

Start with minimal permissions and add more only when needed for specific features. Use optional permissions for features that enhance but aren't essential to core functionality.

```json
{
  "permissions": [
    "storage"
  ],
  "optional_permissions": [
    "tabs",
    "bookmarks",
    "history",
    "notifications"
  ]
}
```

In this example, the extension has persistent storage as a required permission (needed for basic state management), while features like bookmarks, history, and notifications are optional. Users can install with confidence knowing the extension's core functionality doesn't depend on sensitive permissions.

## Common Permission Strings

Understanding what each permission grants is essential for making informed decisions. Here's a comprehensive reference:

### API Permissions

| Permission | Capability | Warning Message |
|------------|------------|-----------------|
| `storage` | Read/write to chrome.storage | "Read and change your data on all websites" (if host permissions exist) |
| `tabs` | Access tab URL, title, favicon | "Read and change your browsing activity on all websites" |
| `activeTab` | Access current tab when user invokes extension | No warning |
| `scripting` | Inject CSS/JavaScript into pages | "Read and change your data on all websites" |
| `contextMenus` | Add context menu items | No warning |
| `notifications` | Create system notifications | No warning |
| `bookmarks` | Read/modify bookmarks | "Read and change your bookmarks" |
| `history` | Read/modify browsing history | "Read and change your browsing history" |
| `cookies` | Read/modify cookies for specified domains | "Read and change your cookies and data" |
| `webRequest` | Intercept/modify network requests | "Read and change your data on all websites" |
| `webRequestBlocking` | Block/modify requests (requires host permission) | "Read and change your data on all websites" |
| `identity` | Access OAuth2 identity | No warning |
| `geolocation` | Access user location | "Access your location" |
| `clipboardRead` | Read clipboard contents | "Read data from your clipboard" |
| `clipboardWrite` | Write to clipboard | "Modify data on your clipboard" |
| `downloads` | Manage downloads | "Manage your downloads" |
| `management` | Manage other extensions | "Manage your apps, extensions, and themes" |
| `topSites` | Access top sites list | "Read your browsing history" |
| `idle` | Detect user idle state | No warning |
| `alarms` | Schedule tasks | No warning |

### Host Permission Patterns

| Pattern | Access Granted |
|---------|----------------|
| `https://example.com/*` | All HTTPS pages on example.com |
| `https://*.google.com/*` | All Google subdomains |
| `https://*/` | All HTTPS websites |
| `http://localhost:3000/*` | Local development server |
| `<all_urls>` or `*://*/*` | All websites (most restrictive) |

## activeTab: The Privacy-Friendly Alternative

The `activeTab` permission is one of the most user-friendly permissions available. It grants temporary access to the active tab only when the user explicitly invokes your extension (e.g., clicking the toolbar icon, using a keyboard shortcut, or clicking a context menu item).

### How activeTab Works

When you have `activeTab` permission, your extension can only access the currently active tab when:

1. The user clicks your extension's toolbar icon
2. The user invokes a keyboard shortcut you've defined
3. The user clicks a context menu item your extension created
4. Your extension triggers the tab (via `chrome.tabs.executeScript` or similar)

```json
{
  "permissions": [
    "activeTab",
    "scripting"
  ]
}
```

With this configuration, your extension can inject scripts into the current page when the user activates it, but cannot access pages in the background or read data from other tabs.

### Comparing activeTab to Host Permissions

Here's a practical comparison:

```typescript
// Without activeTab - requires host permissions
// manifest.json
{
  "permissions": ["scripting"],
  "host_permissions": ["<all_urls>"]
}

// With activeTab - no host permissions needed
// manifest.json
{
  "permissions": ["activeTab", "scripting"]
}

// Service worker or popup code
async function injectContentScript(): Promise<void> {
  // This only works when user explicitly invokes the extension
  await chrome.scripting.executeScript({
    target: { tabId: await getActiveTabId() },
    func: () => console.log('Content script injected!')
  });
}

async function getActiveTabId(): Promise<number> {
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab[0].id!;
}
```

The `activeTab` permission generates no warning in the installation dialog, significantly improving conversion rates while still providing the functionality most extensions need.

## Impact on Chrome Web Store Review

Permissions directly affect your extension's review process and visibility in the Chrome Web Store.

### Review Considerations

Extensions with excessive or unnecessary permissions face:

1. **Extended Review Times**: Permissions outside core functionality trigger manual review
2. **Rejection Risk**: Extensions requesting more permissions than needed may be rejected
3. **Visibility Impact**: Permission warnings can reduce installation rates by 50% or more
4. **Trust Damage**: Users are increasingly cautious about permissions

### Best Practices for Store Approval

1. **Use optional permissions** for non-essential features
2. **Prefer activeTab** over broad host permissions when possible
3. **Document permission need** in your store listing's "How this extension uses data" section
4. **Minimize host permissions** to specific domains rather than wildcards
5. **Avoid `<all_urls>`** unless absolutely necessary

```json
{
  "name": "My Extension",
  "description": "A productivity tool that helps you manage bookmarks",
  "permissions": [
    "storage"
  ],
  "optional_permissions": [
    "bookmarks"
  ],
---
layout: default
title: "Chrome Extension Permissions Best Practices — Minimize Permissions for Maximum Trust"
description: "Learn how to implement the principle of least privilege in your Chrome extension, use optional permissions effectively, and understand the difference between activeTab and host permissions."
canonical_url: "https://bestchromeextensions.com/guides/permissions-best-practices/"
---

# Chrome Extension Permissions Best Practices — Minimize Permissions for Maximum Trust

When building Chrome extensions, the permissions you request directly impact user trust, installation rates, and Chrome Web Store approval. Understanding how to properly manage permissions isn't just about following technical requirements—it's about respecting your users' privacy and security. This guide covers the essential best practices for handling permissions in your Chrome extension.

## The Principle of Least Privilege

The principle of least privilege is a fundamental security concept that should guide every decision you make about permissions. Simply put, your extension should request only the minimum permissions necessary to function, and nothing more. This principle protects both your users and your extension from potential abuse.

When users install an extension, they're increasingly savvy about what permissions mean. An extension requesting access to "all websites" when it only needs to work on one specific domain raises red flags. Before adding any permission to your manifest, ask yourself: "Does my extension absolutely need this to work?" If the answer is no, don't include it. If it's borderline, consider whether you can achieve the same functionality through a more restricted permission or by using optional permissions.

The principle extends beyond initial development. As your extension evolves, regularly audit your permissions. Features you planned might have been cut, or alternative APIs might have become available. A quarterly permissions review can reveal opportunities to reduce your permission footprint.

## Optional Permissions: A User-First Approach

Optional permissions represent one of the most powerful tools in your toolkit for building trust. Unlike required permissions that block installation, optional permissions allow users to install your extension with minimal friction and then grant additional capabilities as needed.

Consider a note-taking extension that can work in two modes: a basic mode that saves notes locally, and an advanced mode that syncs across devices using cloud storage. Rather than requiring cloud sync permissions from the start, you can implement this as an optional permission. Users who want cloud sync can grant it through your extension's settings, while users who prefer local-only storage never need to grant that permission.

Implementing optional permissions requires handling two states in your code: the base functionality that works without the optional permission, and the enhanced functionality that activates when the user grants the optional permission. Always check for optional permissions before using related APIs, and provide clear UI feedback when features require additional permissions.

```javascript
// Check if optional permission is granted
async function enableCloudSync() {
  const hasPermission = await chrome.permissions.contains({
    permissions: ['storage']
  });
  
  if (!hasPermission) {
    // Request the optional permission
    const granted = await chrome.permissions.request({
      permissions: ['storage']
    });
    
    if (granted) {
      // Enable cloud sync
      await setupCloudSync();
    } else {
      showPermissionDeniedMessage();
    }
  } else {
    // Already granted, enable cloud sync
    await setupCloudSync();
  }
}
```

## Understanding Permission Warnings

Chrome displays permission warnings when users attempt to install your extension, and these warnings can significantly impact installation rates. Understanding what triggers these warnings and how to minimize them is crucial for user adoption.

The Chrome Web Store shows warnings for permissions like `<all_urls>`, `tabs`, `history`, `bookmarks`, and many others. Each warning communicates risk to users, and multiple warnings compound the concern. A clear warning like "Read and change all your data on all websites" is honest but daunting.

Some permissions trigger warnings that might not be necessary for your use case. The `tabs` permission, for example, provides access to sensitive URL and title information for all tabs. If you only need to know the current tab's URL, `activeTab` provides a more limited scope that avoids the broader warning.

When you cannot avoid a permission that triggers a warning, use the permissions justification field in your manifest to explain why your extension needs it. A well-written justification won't remove the warning, but it helps users understand your legitimate need.

## activeTab vs Host Permissions: Making the Right Choice

One of the most important permission decisions you'll make is between `activeTab` and host permissions. This choice significantly affects both security and user experience.

The `activeTab` permission grants your extension access to the current tab only when the user explicitly invokes it—typically by clicking your extension's action icon or using a keyboard shortcut. This is the most privacy-friendly option because users must consciously activate your extension for each use. With `activeTab`, your extension cannot silently read page content or modify websites.

Host permissions, specified as `<all_urls>` or specific patterns like `https://*.example.com/*`, grant ongoing access to matching websites. This access persists from installation and allows your extension to read and modify page content at any time. While sometimes necessary, broad host permissions trigger significant warnings and reduce user trust.

In most cases, prefer `activeTab` over host permissions. If your extension only needs to interact with pages when the user requests it, `activeTab` provides exactly that capability without the ongoing access that concerns privacy-conscious users. Reserve host permissions for extensions that genuinely need to run automatically on specific websites.

```json
{
  "permissions": ["activeTab"],
  "host_permissions": []
}
```

This minimal permission set clearly communicates to reviewers and users what the extension needs and why.

## User Trust and Permission Warnings

Permission warnings directly impact user decisions to install your extension. Understanding and mitigating these warnings is crucial for success.

### Understanding Warning Messages

Chrome displays warnings based on the permissions you request. Some generate significant warnings:

```json
{
  "permissions": ["tabs", "webRequest", "webRequestBlocking", "cookies", "history"],
  "host_permissions": ["<all_urls>"]
}
```

This combination shows multiple warnings including "Read and change your data on all websites" and "Read and change your browsing history."

### Strategies for Building Trust

1. **Explain permissions in your extension**: Use your popup or options page to explain why each permission is needed

```typescript
// In your popup or options page
function displayPermissionExplanation(): void {
  const explanations: Record<string, string> = {
    storage: 'Used to save your preferences locally',
    bookmarks: 'Required to organize your bookmarks',
    notifications: 'Sends you reminders when you\'re inactive'
  };

  for (const [permission, reason] of Object.entries(explanations)) {
    console.log(`${permission}: ${reason}`);
  }
}
```

2. **Request permissions contextually**: Ask for permissions when the user is about to use a feature that needs them

```typescript
async function handleUserActionRequiringPermission(
  action: string,
  permission: string
): Promise<void> {
  // Explain why we need this permission
  const shouldRequest = confirm(
    `To ${action}, we need permission. Do you want to grant access?`
  );

  if (shouldRequest) {
    const result = await requestPermission(permission);
    if (result.granted) {
      // Proceed with the action
    }
  }
}
```

3. **Provide graceful degradation**: When permissions are denied, offer an alternative experience

```typescript
async function safeUseFeature(): Promise<void> {
  const hasPermission = await hasPermission('notifications');

  if (hasPermission) {
    // Full feature with notifications
    await chrome.notifications.create({
      type: 'basic',
      message: 'Task completed!'
    });
  } else {
    // Graceful fallback - show in-app message
    showInAppNotification('Task completed!');
  }
}
```

## Typed Patterns with chrome-permissions-guard

For TypeScript projects, the `@theluckystrike/chrome-permissions-guard` package provides type-safe permission checking and request patterns. This helps prevent runtime errors and improves developer experience.

### Installation

```bash
npm install @theluckystrike/chrome-permissions-guard
```

### Basic Usage

```typescript
import {
  PermissionsGuard,
  Permission,
  HostPermission
} from '@theluckystrike/chrome-permissions-guard';

// Define allowed permissions for your extension
const guard = new PermissionsGuard({
  permissions: [
    Permission.storage,
    Permission.activeTab,
    Permission.scripting
  ],
  hostPermissions: [
    HostPermission.fromPattern('https://*.example.com/*')
  ]
});

// Type-safe permission checking
const canUseStorage = guard.has(Permission.storage);
const canAccessExample = guard.canAccess('https://api.example.com/data');

// Request permissions with full TypeScript support
async function requestFeaturePermissions(): Promise<boolean> {
  return guard.request(Permission.notifications);
}
```

The guard provides compile-time checking that you're only working with permissions your extension actually declares, preventing runtime errors from typos or invalid permission names.

### Advanced Patterns

```typescript
import {
  PermissionsGuard,
  Permission,
  HostPermission,
  PermissionState
} from '@theluckystrike/chrome-permissions-guard';

class ExtensionPermissions {
  private guard: PermissionsGuard;

  constructor() {
    this.guard = new PermissionsGuard({
      permissions: [
        Permission.storage,
        Permission.activeTab,
        Permission.scripting
      ],
      hostPermissions: [
        HostPermission.fromPattern('https://*.example.com/*')
      ],
      optionalPermissions: [
        Permission.bookmarks,
        Permission.notifications,
        HostPermission.fromPattern('https://analytics.example.com/*')
      ]
    });
  }

  // Check if core permissions are available
  async initialize(): Promise<boolean> {
    const required = [
      Permission.storage,
      Permission.activeTab
    ];

    for (const perm of required) {
      if (!this.guard.has(perm)) {
        console.error(`Missing required permission: ${perm}`);
        return false;
      }
    }
    return true;
  }

  // Request optional feature permission
  async enableBookmarks(): Promise<PermissionState> {
    const state = await this.guard.requestOptional(Permission.bookmarks);
    return state;
  }

  // Request optional host permission
  async enableAnalytics(): Promise<PermissionState> {
    const state = await this.guard.requestOptional(
      HostPermission.fromPattern('https://analytics.example.com/*')
    );
    return state;
  }

  // Listen for permission changes
  setupListeners(): void {
    this.guard.onAdded((permissions) => {
      console.log('New permissions granted:', permissions);
      // Update UI or feature availability
    });

    this.guard.onRemoved((permissions) => {
      console.log('Permissions revoked:', permissions);
      // Disable features that depend on revoked permissions
    });
  }
}

export const permissions = new ExtensionPermissions();
```

## Complete Example: Permission-Aware Extension

Here's a complete example demonstrating best practices in a real extension:

```typescript
// types/permissions.ts
export interface PermissionConfig {
  required: string[];
  optional: string[];
  hostRequired: string[];
  hostOptional: string[];
}

// manifest.json equivalent configuration
export const permissionConfig: PermissionConfig = {
  required: ['storage', 'activeTab', 'scripting'],
  optional: ['bookmarks', 'notifications', 'geolocation'],
  hostRequired: [],
  hostOptional: [
    'https://*.example.com/*',
    'https://analytics.example.com/*'
  ]
};

// services/PermissionManager.ts
export class PermissionManager {
  private config: PermissionConfig;

  constructor(config: PermissionConfig) {
    this.config = config;
  }

  async checkRequiredPermissions(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const perm of this.config.required) {
      const granted = await this.checkPermission(perm);
      results.set(perm, granted);
    }

    return results;
  }

  async requestOptionalPermission(permission: string): Promise<boolean> {
    // Validate this is actually an optional permission
    if (!this.config.optional.includes(permission)) {
      console.warn(`Attempted to request non-optional permission: ${permission}`);
      return false;
    }

    return new Promise((resolve) => {
      chrome.permissions.request(
        { permissions: [permission] },
        (granted) => {
          if (chrome.runtime.lastError) {
            console.error('Permission request failed:', chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(granted);
          }
        }
      );
    });
  }

  async requestOptionalHostPermission(url: string): Promise<boolean> {
    if (!this.config.hostOptional.includes(url)) {
      console.warn(`Attempted to request non-optional host permission: ${url}`);
      return false;
    }

    return new Promise((resolve) => {
      chrome.permissions.request(
        { origins: [url] },
        (granted) => {
          if (chrome.runtime.lastError) {
            console.error('Host permission request failed:', chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(granted);
          }
        }
      );
    });
  }

  setupChangeListeners(
    onGranted: (permissions: chrome.permissions.Permissions) => void,
    onRevoked: (permissions: chrome.permissions.Permissions) => void
  ): void {
    chrome.permissions.onAdded.addListener(onGranted);
    chrome.permissions.onRemoved.addListener(onRevoked);
  }

  private checkPermission(permission: string): Promise<boolean> {
    return new Promise((resolve) => {
      chrome.permissions.contains(
        { permissions: [permission] },
        (result) => resolve(result)
      );
    });
  }
}

// Usage in background service worker
import { permissionConfig } from '../types/permissions';

const permissions = new PermissionManager(permissionConfig);

// Initialize on startup
async function initialize(): Promise<void> {
  const required = await permissions.checkRequiredPermissions();

  for (const [perm, granted] of required) {
    if (!granted) {
      console.error(`Required permission missing: ${perm}`);
    }
  }

  // Listen for permission changes
  permissions.setupChangeListeners(
    (perms) => {
      console.log('Permissions granted:', perms);
      // Update feature availability
    },
    (perms) => {
      console.log('Permissions revoked:', perms);
      // Disable features that lost permissions
    }
  );
}

// Handle feature-specific permission requests
async function handleFeatureRequest(feature: string): Promise<boolean> {
  switch (feature) {
    case 'bookmarks':
      return permissions.requestOptionalPermission('bookmarks');
    case 'notifications':
      return permissions.requestOptionalPermission('notifications');
    case 'analytics':
      return permissions.requestOptionalHostPermission('https://analytics.example.com/*');
    default:
      return false;
  }
}
```

## Summary

Effective permission management is critical for building successful Chrome extensions. Key takeaways:

1. **Prefer optional permissions** over required ones when possible
2. **Use `activeTab`** instead of broad host permissions for user-initiated actions
3. **Separate API permissions from host permissions** in Manifest V3
4. **Request permissions contextually** when users need specific features
5. **Provide graceful degradation** when permissions are denied
6. **Use type-safe patterns** like `@theluckystrike/chrome-permissions-guard` for better developer experience
7. **Document your permissions** in the Chrome Web Store listing

By following these best practices, you'll create extensions that users trust, that pass review smoothly, and that maintain strong security postures. Remember: every permission you don't request is a permission that can't be exploited.
This configuration allows your extension to access the current tab when activated, but never automatically. Users maintain full control over when your extension can interact with their browsing.

## The Trust Impact of Permissions

User trust is the foundation of a successful Chrome extension. Every permission you request communicates something about your intentions, and excessive permissions signal potential problems to savvy users.

Studies of extension installation behavior show clear patterns: extensions with fewer permissions install at higher rates than those with extensive permissions. Users have learned to be cautious, and extensions that demonstrate restraint earn trust through their permission choices.

Beyond installation, permissions affect reviews and ratings. Users who feel an extension overreaches in its permissions are likely to leave negative reviews, even if the extension functions perfectly. Conversely, extensions that clearly respect user privacy by minimizing permissions often receive positive recognition for their thoughtful approach.

For extensions distributed through the Chrome Web Store, permission choices also affect review outcomes. Google's review process examines whether your requested permissions are appropriate for your extension's functionality. Extensions that request more permissions than necessary may face longer review times or rejection.

## Conclusion

Managing permissions effectively requires balancing functionality with respect for user privacy and security. By following the principle of least privilege, leveraging optional permissions wisely, understanding permission warnings, choosing `activeTab` over broad host permissions, and considering the trust impact of every permission request, you build extensions that users can trust.

Take time to audit your extension's permissions before each release. Review what you actually need versus what you've requested. Consider whether features using sensitive permissions could work differently. Your users will appreciate the thoughtfulness, and your extension will be stronger for it.
