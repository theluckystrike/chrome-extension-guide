# Chrome Extension Permissions API

The chrome.permissions API enables dynamic permission management at runtime, allowing extensions to request, check, and revoke permissions beyond manifest declarations. This API is essential for implementing progressive disclosure patterns that improve user trust and install conversion rates.

## Manifest Permissions vs Optional Permissions

Chrome extensions distinguish between required and optional permissions. Required permissions declared in `permissions` are requested at install time. Optional permissions declared in `optional_permissions` can be requested at runtime.

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab"],
  "optional_permissions": ["bookmarks", "history", "notifications", "tabs"],
  "host_permissions": ["https://*.trusted-site.com/*"],
  "optional_host_permissions": ["https://*.user-enabled.com/*"]
}
```

Required permissions appear in the installation dialog and cannot be revoked without uninstalling. Optional permissions reduce the initial trust barrier since users only see them when features requiring them are activated.

## chrome.permissions.request

The `chrome.permissions.request()` method requests additional permissions at runtime, displaying a browser prompt for user approval. Returns a Promise resolving to a boolean indicating grant status.

```javascript
async function requestPermission(permission) {
  const granted = await chrome.permissions.request({
    permissions: [permission]
  });
  return granted;
}

// Request host permissions
await chrome.permissions.request({
  permissions: ['scripting'],
  origins: ['https://example.com/*']
});
```

Permissions must be pre-declared in manifest's optional_permissions or optional_host_permissions fields before they can be requested.

## chrome.permissions.remove

The `chrome.permissions.remove()` method revokes previously granted optional permissions. This is useful for implementing privacy controls or feature toggles.

```javascript
async function removePermission(permission) {
  const removed = await chrome.permissions.remove({
    permissions: [permission]
  });
  console.log(removed ? 'Removed successfully' : 'Failed to remove');
}
```

Note that users can also revoke permissions manually through the extension management page.

## chrome.permissions.contains

The `chrome.permissions.contains()` method checks whether specific permissions are currently granted. Always verify permissions before performing privileged operations.

```javascript
async function checkPermission(permission) {
  return await chrome.permissions.contains({
    permissions: [permission]
  });
}

// Check multiple permissions
async function checkPermissions(permissions) {
  return await chrome.permissions.contains({
    permissions: permissions
  });
}
```

## chrome.permissions.getAll

The `chrome.permissions.getAll()` method retrieves all currently granted permissions, including manifest-declared and runtime-granted optional permissions.

```javascript
async function getAllPermissions() {
  const permissions = await chrome.permissions.getAll();
  console.log('API permissions:', permissions.permissions);
  console.log('Host permissions:', permissions.origins);
  return permissions;
}
```

Useful for building options pages that display current permissions and allow revocation.

## chrome.permissions.onAdded

The `chrome.permissions.onAdded` event fires when permissions are granted through user action or the extension management page.

```javascript
chrome.permissions.onAdded.addListener((permissions) => {
  console.log('New permissions granted:', permissions);
  if (permissions.permissions.includes('bookmarks')) {
    enableBookmarkFeatures();
  }
});
```

Use this event to dynamically enable features and update UI when permissions are granted.

## chrome.permissions.onRemoved

The `chrome.permissions.onRemoved` event fires when permissions are revoked. Handle this to gracefully degrade functionality.

```javascript
chrome.permissions.onRemoved.addListener((permissions) => {
  console.log('Permissions revoked:', permissions);
  if (permissions.permissions.includes('bookmarks')) {
    disableBookmarkFeatures();
  }
});
```

Always implement proper revocation handling to maintain user experience.

## Host Permissions and Match Patterns

Host permissions use match patterns to specify URL access with wildcards for schemes, hosts, and paths.

| Pattern | Matches |
|---------|---------|
| `*://*/*` | All HTTP/HTTPS |
| `https://*/*` | All HTTPS sites |
| `https://*.example.com/*` | example.com and subdomains |
| `https://example.com/api/*` | API endpoints only |

Use specific patterns instead of wildcards to minimize permission warnings.

## Permission Warnings and Install Rates

Permission warnings directly impact Chrome Web Store conversion. Broad permissions display concerning warnings that deter installations. Extensions with fewer permissions see significantly higher install rates.

High-warning permissions include `<all_urls>`, `*://*/*` (critical), and `tabs`, `webNavigation` (high). Silent permissions include `storage`, `alarms`, `idle`, `activeTab`.

## Progressive Permission Disclosure UX

Request permissions contextually when users attempt features that need them. Explain why each permission is needed at the moment of relevance.

```javascript
async function enableFeatureWithPermission(feature) {
  const requiredPermissions = getRequiredPermissions(feature);
  
  const hasPermissions = await chrome.permissions.contains({
    permissions: requiredPermissions
  });
  
  if (hasPermissions) {
    executeFeature(feature);
    return;
  }
  
  // Show explanation before requesting
  if (!await showPermissionExplanation(feature)) return;
  
  const granted = await chrome.permissions.request({
    permissions: requiredPermissions
  });
  
  if (granted) executeFeature(feature);
}
```

Users are far more likely to grant permissions when they understand the benefit.

## activeTab as Alternative to Broad Host Permissions

The `activeTab` permission grants temporary, user-initiated access to the current tab when the user explicitly invokes the extension. This displays no warnings and provides a high-trust alternative to broad host permissions.

```json
{
  "permissions": ["activeTab"]
}
```

When invoked, `activeTab` grants access to the tab's URL, title, favicon, and the ability to inject scripts via the Scripting API. Use this for features that analyze or modify the current page without requiring broad host access.

## Permission Groups and Warning Triggers

Chrome groups permissions into categories that trigger specific warnings. Silent (no warning): `storage`, `alarms`, `idle`, `contextMenus`, `activeTab`. Moderate: `bookmarks`, `history`, `notifications`, `geolocation`. High: `tabs`, `webNavigation`, `webRequest`, `proxy`. Critical: `<all_urls>`, `*://*/*`.

Design permission strategies to rely on silent permissions for core functionality.

## Optional Permissions Strategy

Request minimal required permissions at install time, then request additional capabilities as users enable features.

```json
{
  "permissions": ["storage", "activeTab"],
  "optional_permissions": ["bookmarks", "history", "notifications"]
}
```

This pattern dramatically improves install conversion by reducing initial permission warnings.

## Content Script Injection with Dynamic Permissions

Ensure proper host access before injecting scripts to arbitrary URLs.

```javascript
async function injectToTab(tabId, hostPattern) {
  const hasAccess = await chrome.permissions.contains({
    origins: [hostPattern]
  });
  
  if (!hasAccess) {
    const granted = await chrome.permissions.request({
      origins: [hostPattern]
    });
    if (!granted) return;
  }
  
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content-script.js']
  });
}
```

Always check and request host permissions before dynamic script injection.

## Reference

Official documentation: [chrome.permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)

Additional resources:
- [Manifest Permission Fields](https://developer.chrome.com/docs/extensions/mv3/manifest/)
- [Permission Warnings](https://developer.chrome.com/docs/extensions/mv3/permission_warnings/)
- [activeTab Permission](https://developer.chrome.com/docs/extensions/mv3/manifest/activeTab)
