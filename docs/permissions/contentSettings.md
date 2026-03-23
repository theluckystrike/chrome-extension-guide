---
layout: default
title: "contentSettings Permission"
description: "Access to the API for controlling per-site content settings (cookies, JavaScript, images, popups, notifications, location, camera, microphone, etc.)."
permalink: /permissions/contentSettings/
category: permissions
order: 8
canonical_url: "https://bestchromeextensions.com/permissions/contentSettings/"
---

# contentSettings Permission

## What It Grants {#what-it-grants}
Access to the `chrome.contentSettings` API for controlling per-site content settings (cookies, JavaScript, images, popups, notifications, location, camera, microphone, etc.).

## Manifest {#manifest}
```json
{
  "permissions": ["contentSettings"]
}
```

## User Warning {#user-warning}
None — this permission does not trigger a warning at install time.

## API Access {#api-access}
Each content type is a `ContentSetting` object with methods:
- `.get({ primaryUrl, secondaryUrl? })` — get current setting for a URL
- `.set({ primaryPattern, secondaryPattern?, setting, scope? })` — set for a URL pattern
- `.clear({})` — clear all custom settings (reset to defaults)
- `.getResourceIdentifiers()` — (for plugins only) list resource identifiers

## Content Types {#content-types}
| Property | Values | Description |
|---|---|---|
| `chrome.contentSettings.cookies` | allow, block, session_only | Cookie behavior |
| `chrome.contentSettings.images` | allow, block | Image loading |
| `chrome.contentSettings.javascript` | allow, block | JavaScript execution |
| `chrome.contentSettings.popups` | allow, block | Popup windows |
| `chrome.contentSettings.notifications` | allow, block, ask | Notification permission |
| `chrome.contentSettings.location` | allow, block, ask | Geolocation access |
| `chrome.contentSettings.fullscreen` | allow, ask | Fullscreen permission |
| `chrome.contentSettings.mouselock` | allow, block, ask | Pointer lock |
| `chrome.contentSettings.microphone` | allow, block, ask | Microphone access |
| `chrome.contentSettings.camera` | allow, block, ask | Camera access |
| `chrome.contentSettings.automaticDownloads` | allow, block, ask | Multiple file downloads |

## Basic Usage {#basic-usage}

## How to Use contentSettings API
```typescript
// Check JavaScript setting for a site
const { setting } = await chrome.contentSettings.javascript.get({
  primaryUrl: 'https://example.com/'
});
console.log(`JavaScript: ${setting}`); // "allow" or "block"

// Block JavaScript on a site
await chrome.contentSettings.javascript.set({
  primaryPattern: 'https://example.com/*',
  setting: 'block'
});

// Allow cookies only for session (deleted on browser close)
await chrome.contentSettings.cookies.set({
  primaryPattern: 'https://tracker.com/*',
  setting: 'session_only'
});

// Block all images on a domain
await chrome.contentSettings.images.set({
  primaryPattern: 'https://*.ads.example.com/*',
  setting: 'block'
});
```

## URL Pattern Format {#url-pattern-format}
```
scheme://host/path
```
- `*://example.com/*` — any scheme, specific host
- `https://*.example.com/*` — all subdomains
- `https://example.com/*` — specific origin
- `<all_urls>` — all URLs

## Privacy Control Pattern {#privacy-control-pattern}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { createMessenger } from '@theluckystrike/webext-messaging';

const schema = defineSchema({ blockedSites: 'string' }); // JSON array
const storage = createStorage(schema, 'sync');

type Messages = {
  BLOCK_SITE: { request: { url: string; types: string[] }; response: { ok: boolean } };
  UNBLOCK_SITE: { request: { url: string }; response: { ok: boolean } };
};
const m = createMessenger<Messages>();

m.onMessage('BLOCK_SITE', async ({ url, types }) => {
  const pattern = `${new URL(url).origin}/*`;
  for (const type of types) {
    const cs = (chrome.contentSettings as any)[type];
    if (cs) await cs.set({ primaryPattern: pattern, setting: 'block' });
  }
  return { ok: true };
});
```

## Scope {#scope}
```typescript
// Regular scope — applies to regular browsing
await chrome.contentSettings.cookies.set({
  primaryPattern: 'https://example.com/*',
  setting: 'block',
  scope: 'regular'
});

// Incognito-only scope
await chrome.contentSettings.cookies.set({
  primaryPattern: 'https://example.com/*',
  setting: 'block',
  scope: 'incognito_session_only'
});
```

## When to Use {#when-to-use}
- Privacy/security extensions (block trackers, control permissions)
- Parental control extensions
- Site-specific preference management
- Cookie management tools
- JavaScript blocker extensions

## When NOT to Use {#when-not-to-use}
- If you need to block network requests — use `declarativeNetRequest`
- If you need to modify page content — use content scripts
- For temporary changes — these persist until cleared

## Permission Check {#permission-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('contentSettings');
```

## Cross-References {#cross-references}
- Related: `docs/permissions/cookies.md`, `docs/permissions/privacy.md`

## Frequently Asked Questions

### What is contentSettings API used for?
The contentSettings API allows your extension to override settings for cookies, JavaScript, plugins, and other content behaviors on a per-site or global basis.

### Can extensions block JavaScript per-site?
Yes, use chrome.contentSettings.javascript.set() to enable or disable JavaScript for specific patterns.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
