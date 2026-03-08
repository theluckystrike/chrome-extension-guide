---
layout: default
title: "declarativeNetRequestWithHostAccess"
description: "The permission allows extensions to use declarative Net Request (DNR) rules that interact with specific host URLs, combining DNR capabilities with host permi..."
permalink: /permissions/declarativeNetRequestWithHostAccess/
category: permissions
order: 15
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/declarativeNetRequestWithHostAccess/"
---

# declarativeNetRequestWithHostAccess

The `declarativeNetRequestWithHostAccess` permission allows extensions to use declarative Net Request (DNR) rules that interact with specific host URLs, combining DNR capabilities with host permissions.

## What It Grants {#what-it-grants}

This permission enables DNR rules that require access to specific hosts, including:
- **Redirect rules** that point to URLs on specific domains
- **Modify headers rules** that target requests to particular hosts
- Rules that use URL patterns requiring host permission validation

## Difference from declarativeNetRequest {#difference-from-declarativenetrequest}

| Feature | declarativeNetRequest | declarativeNetRequestWithHostAccess |
|---------|----------------------|--------------------------------------|
| Basic blocking | ✅ | ✅ |
| Redirect to extension path | ✅ | ✅ |
| Redirect to specific URL | ❌ | ✅ |
| Modify request/response headers | Limited | Full |
| Host permission warnings | No | Yes |

The standard `declarativeNetRequest` permission allows blocking requests and redirects to `extensionPath` URLs without host permissions. However, redirecting to specific URLs or modifying headers for particular hosts requires this permission.

## Manifest Configuration {#manifest-configuration}

```json
{
  "permissions": [
    "declarativeNetRequestWithHostAccess"
  ],
  "host_permissions": [
    "https://*.example.com/*"
  ]
}
```

The host permissions must explicitly list the domains your rules will interact with.

## User Warning {#user-warning}

When users install an extension with this permission, they will see a warning indicating that the extension can:
- Read and change your data on specified websites
- Manage network requests

This is because the permission effectively grants host-level access combined with request modification capabilities.

## When It's Needed {#when-its-needed}

Use `declarativeNetRequestWithHostAccess` when:
1. Creating redirect rules that point to specific external URLs
2. Modifying request or response headers for particular hosts
3. Using `urlTransform` rules with custom URLs
4. Applying rules to `*://*/*` patterns combined with host-specific conditions

## When It's NOT Needed {#when-its-not-needed}

You can use basic `declarativeNetRequest` without this permission for:
- Blocking requests based on URL patterns
- Redirecting to extension-owned paths (`chrome-extension://...`)
- Removing headers regardless of host
- Basic URL pattern matching without host-specific redirects

## @theluckystrike/webext-permissions {#theluckystrikewebext-permissions}

This permission can be validated using `@theluckystrike/webext-permissions`:

```javascript
import { hasPermission } from '@theluckystrike/webext-permissions';

const hasDnrWithHostAccess = await hasPermission('declarativeNetRequestWithHostAccess');
```

## Related Permissions {#related-permissions}

- [declarativeNetRequest](./declarativeNetRequest.md) - Basic DNR without host access
- [declarativeNetRequestFeedback](./declarativeNetRequestFeedback.md) - Feedback on DNR rule matches

## Example Use Case {#example-use-case}

An extension that redirects all requests from `site-a.com` to `site-b.com` would require:

```json
{
  "permissions": ["declarativeNetRequestWithHostAccess"],
  "host_permissions": [
    "https://site-a.com/*",
    "https://site-b.com/*"
  ]
}
```

With a rule like:
```json
{
  "id": 1,
  "priority": 1,
  "action": {
    "type": "redirect",
    "redirect": { "url": "https://site-b.com" }
  },
  "condition": {
    "urlFilter": "site-a.com",
    "resourceTypes": ["main_frame"]
  }
}
```

## Frequently Asked Questions

### When do I need host permissions with declarativeNetRequest?
Host permissions are needed if you want to modify requests to specific websites or need access to request headers for the rules.

### Can I block requests without host permissions?
Yes, using static rulesets that don't require host access can block requests to any domain.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
