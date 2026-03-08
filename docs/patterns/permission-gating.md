---
layout: default
title: "Chrome Extension Permission Gating — Best Practices"
description: "Request permissions progressively with permission gating patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/permission-gating/"
---

# Permission Gating UI Patterns

Guide for implementing UI patterns that gate features behind optional permissions in Chrome extensions.

## Progressive Permission Requests

Show features as locked or disabled until the user grants the required permission. Request permission only when the user clicks to access the gated feature.

```javascript
// Permission-gated feature component
class GatedFeature {
  async checkPermission(permission) {
    const result = await chrome.permissions.contains({ permissions: [permission] });
    return result;
  }

  async requestPermission(permission) {
    const granted = await chrome.permissions.request({ permissions: [permission] });
    if (granted) {
      this.enableFeature();
    }
    return granted;
  }
}
```

## Permission State Checking

Use `chrome.permissions.contains()` to determine the current UI state. Check permissions on extension load and cache results.

```javascript
// Permission status manager
class PermissionManager {
  constructor() {
    this.cache = new Map();
  }

  async getStatus(permission) {
    if (this.cache.has(permission)) {
      return this.cache.get(permission);
    }
    const result = await chrome.permissions.contains({ permissions: [permission] });
    this.cache.set(permission, result);
    return result;
  }

  async request(permission) {
    const granted = await chrome.permissions.request({ permissions: [permission] });
    if (granted) {
      this.cache.set(permission, true);
    }
    return granted;
  }
}
```

## Storing Permission Grants

Cache permission state in `chrome.storage` for faster UI rendering on extension startup.

## Permission Revocation Handling

Listen to `chrome.permissions.onRemoved` to update UI when users revoke permissions via extension settings.

```javascript
chrome.permissions.onRemoved.addListener((permissions) => {
  updateUI({ permissions: permissions, granted: false });
});
```

## Inline Prompts vs Settings Page

- **Inline prompts**: Request permissions contextually when user interacts with a feature
- **Dedicated settings page**: Allow users to manage all permissions in one place

## Explaining Why Permissions Are Needed

Display contextual help text explaining the benefit before requesting permission. Build trust by being transparent.

## Graceful Degradation

Provide fallback behavior when permission is denied. Users can still use basic features without optional permissions.

## Re-prompting Strategies

Don't spam users with repeated requests. Show a non-intrusive banner instead after initial denial.

## UI Components

- **Permission cards**: Visual cards showing locked/unlocked feature state
- **Feature gates**: UI elements that block access until permission granted
- **Upgrade prompts**: Call-to-action prompts requesting additional permissions

## Testing Permission Flows

Note: `chrome.permissions.request()` can only be called from a user gesture (click handler).

## Cross-References

- [Permissions Model](../guides/permissions-model.md)
- [Advanced Permissions Tutorial](../tutorials/advanced-permissions.md)
- [Permissions API Reference](../api-reference/permissions-api.md)
