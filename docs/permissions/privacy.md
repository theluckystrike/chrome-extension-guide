---
title: "privacy Permission"
description: "Access to `chrome.privacy` API for reading/controlling Chrome's privacy settings. { "permissions": ["privacy"] } "Change your privacy-related settings""
permalink: /permissions/privacy/
category: permissions
order: 31
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/privacy/"
---

# privacy Permission

## What It Grants
Access to `chrome.privacy` API for reading/controlling Chrome's privacy settings.

## Manifest
```json
{ "permissions": ["privacy"] }
```

## User Warning
"Change your privacy-related settings"

## API — Three Namespaces

### chrome.privacy.network
- `networkPredictionEnabled` — prefetch pages/DNS
- `webRTCIPHandlingPolicy` — WebRTC IP exposure

### chrome.privacy.services
- `alternateErrorPagesEnabled`, `autofillAddressEnabled`, `autofillCreditCardEnabled`
- `passwordSavingEnabled`, `safeBrowsingEnabled`, `searchSuggestEnabled`
- `spellingServiceEnabled`, `translationServiceEnabled`

### chrome.privacy.websites
- `thirdPartyCookiesAllowed`, `hyperlinkAuditingEnabled`, `referrersEnabled`
- `doNotTrackEnabled`, `protectedContentEnabled`
- `topicsEnabled`, `fledgeEnabled`, `adMeasurementEnabled`

## ChromeSetting Methods
```typescript
// Get
const { value, levelOfControl } = await chrome.privacy.network.networkPredictionEnabled.get({});

// Set
await chrome.privacy.websites.thirdPartyCookiesAllowed.set({ value: false });

// Clear (reset to default)
await chrome.privacy.websites.thirdPartyCookiesAllowed.clear({});

// Watch changes
chrome.privacy.websites.thirdPartyCookiesAllowed.onChange.addListener((details) => {
  console.log(`Changed to: ${details.value}`);
});
```

## Level of Control
- `not_controllable` — managed by policy
- `controlled_by_other_extensions` — another extension set it
- `controllable_by_this_extension` — can change it
- `controlled_by_this_extension` — currently set by this extension

## Privacy Shield Pattern
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { createMessenger } from '@theluckystrike/webext-messaging';

const schema = defineSchema({ privacyMode: 'string' });
const storage = createStorage(schema, 'sync');

type Msgs = {
  SET_PRIVACY: { request: { mode: string }; response: { ok: boolean } };
  GET_STATUS: { request: {}; response: { settings: Record<string, boolean> } };
};
const m = createMessenger<Msgs>();

m.onMessage('SET_PRIVACY', async ({ mode }) => {
  if (mode === 'strict') {
    await chrome.privacy.websites.thirdPartyCookiesAllowed.set({ value: false });
    await chrome.privacy.websites.hyperlinkAuditingEnabled.set({ value: false });
    await chrome.privacy.websites.referrersEnabled.set({ value: false });
    await chrome.privacy.network.networkPredictionEnabled.set({ value: false });
    await chrome.privacy.network.webRTCIPHandlingPolicy.set({ value: 'disable_non_proxied_udp' });
  }
  await storage.set('privacyMode', mode);
  return { ok: true };
});
```

## WebRTC Leak Prevention
```typescript
await chrome.privacy.network.webRTCIPHandlingPolicy.set({
  value: 'disable_non_proxied_udp'
});
// Options: 'default', 'default_public_and_private_interfaces',
//          'default_public_interface_only', 'disable_non_proxied_udp'
```

## When to Use
- Privacy extensions, VPN companions, anti-tracking, parental controls, enterprise security

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('privacy');
```

## Cross-References
- Related: `docs/permissions/contentSettings.md`, `docs/permissions/proxy.md`
