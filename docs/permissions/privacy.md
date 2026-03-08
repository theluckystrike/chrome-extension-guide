---
title: "privacy Permission"
description: "Access to `chrome.privacy` API for reading/controlling Chrome's privacy settings. { "permissions": ["privacy"] } "Change your privacy-related settings""
permalink: /permissions/privacy/
category: permissions
order: 31
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/privacy/"
---

# privacy Permission

## What It Grants {#what-it-grants}
Access to `chrome.privacy` API for reading/controlling Chrome's privacy settings.

## Manifest {#manifest}
```json
{ "permissions": ["privacy"] }
```

## User Warning {#user-warning}
"Change your privacy-related settings"

## API — Three Namespaces {#api-three-namespaces}

### chrome.privacy.network {#chromeprivacynetwork}
- `networkPredictionEnabled` — prefetch pages/DNS
- `webRTCIPHandlingPolicy` — WebRTC IP exposure

### chrome.privacy.services {#chromeprivacyservices}
- `alternateErrorPagesEnabled`, `autofillAddressEnabled`, `autofillCreditCardEnabled`
- `passwordSavingEnabled`, `safeBrowsingEnabled`, `searchSuggestEnabled`
- `spellingServiceEnabled`, `translationServiceEnabled`

### chrome.privacy.websites {#chromeprivacywebsites}
- `thirdPartyCookiesAllowed`, `hyperlinkAuditingEnabled`, `referrersEnabled`
- `doNotTrackEnabled`, `protectedContentEnabled`
- `topicsEnabled`, `fledgeEnabled`, `adMeasurementEnabled`

## ChromeSetting Methods {#chromesetting-methods}
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

## Level of Control {#level-of-control}
- `not_controllable` — managed by policy
- `controlled_by_other_extensions` — another extension set it
- `controllable_by_this_extension` — can change it
- `controlled_by_this_extension` — currently set by this extension

## Privacy Shield Pattern {#privacy-shield-pattern}
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

## WebRTC Leak Prevention {#webrtc-leak-prevention}
```typescript
await chrome.privacy.network.webRTCIPHandlingPolicy.set({
  value: 'disable_non_proxied_udp'
});
// Options: 'default', 'default_public_and_private_interfaces',
//          'default_public_interface_only', 'disable_non_proxied_udp'
```

## When to Use {#when-to-use}
- Privacy extensions, VPN companions, anti-tracking, parental controls, enterprise security

## Permission Check {#permission-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('privacy');
```

## Cross-References {#cross-references}
- Related: `docs/permissions/contentSettings.md`, `docs/permissions/proxy.md`
