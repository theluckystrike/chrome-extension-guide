---
title: "contentSettings Permission"
description: "Access to the `chrome.contentSettings` API for controlling per-site content settings (cookies, JavaScript, images, popups, notifications, location, camera, microphone, etc.)."
permalink: /permissions/contentSettings/
category: permissions
order: 8
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/contentSettings/"
---

# contentSettings Permission

## What It Grants
Access to the `chrome.contentSettings` API for controlling per-site content settings (cookies, JavaScript, images, popups, notifications, location, camera, microphone, etc.).

## Manifest
```json
{
  "permissions": ["contentSettings"]
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## API Access
Each content type is a `ContentSetting` object with methods:
- `.get({ primaryUrl, secondaryUrl? })` — get current setting for a URL
- `.set({ primaryPattern, secondaryPattern?, setting, scope? })` — set for a URL pattern
- `.clear({})` — clear all custom settings (reset to defaults)
- `.getResourceIdentifiers()` — (for plugins only) list resource identifiers

## Content Types
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

## Basic Usage
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

## URL Pattern Format
```
scheme://host/path
```
- `*://example.com/*` — any scheme, specific host
- `https://*.example.com/*` — all subdomains
- `https://example.com/*` — specific origin
- `<all_urls>` — all URLs

## Privacy Control Pattern
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

## Scope
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

## When to Use
- Privacy/security extensions (block trackers, control permissions)
- Parental control extensions
- Site-specific preference management
- Cookie management tools
- JavaScript blocker extensions

## When NOT to Use
- If you need to block network requests — use `declarativeNetRequest`
- If you need to modify page content — use content scripts
- For temporary changes — these persist until cleared

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('contentSettings');
```

## Cross-References
- Related: `docs/permissions/cookies.md`, `docs/permissions/privacy.md`
