Size Limits and Quotas Reference

This document provides a comprehensive reference for all size and quota limits in Chrome Extensions (Manifest V3).

Extension Package {#extension-package}

| Limit | Value | Notes |
|-------|-------|-------|
| CRX file size | 500 MB maximum | Maximum compressed extension package size |
| Recommended | Under 50 MB | Chrome Web Store recommends keeping extensions under 50MB for faster downloads |

Storage Quotas {#storage-quotas}

chrome.storage.local {#chromestoragelocal}

| Property | Value | Notes |
|----------|-------|-------|
| Default quota | 10 MB | Default storage capacity for local data |
| With unlimitedStorage | Unlimited | Requires `"permissions": ["unlimitedStorage"]` in manifest |

chrome.storage.sync {#chromestoragesync}

| Property | Value | Notes |
|----------|-------|-------|
| Total quota | 100 KB | Maximum combined storage across all items |
| Per-item quota | 8 KB | Maximum size for a single storage item |
| Maximum items | 512 | Maximum number of distinct keys |

chrome.storage.session {#chromestoragesession}

| Property | Value | Notes |
|----------|-------|-------|
| Default quota | 10 MB | Available since Chrome 112+ |
| Persistence | Session-only | Data is cleared when the browser session ends |

> Note: For applications requiring large storage, use `chrome.storage.local` with the `unlimitedStorage` permission.

Message Passing {#message-passing}

| Property | Value | Notes |
|----------|-------|-------|
| Message size | ~64 MB | Practical JSON message size limit |
| Response timeout | None | Messages wait indefinitely for response |

Native Messaging {#native-messaging}

| Direction | Limit | Notes |
|-----------|-------|-------|
| From extension to native host | 64 MiB | Maximum message size sent by the extension |
| From native host to extension | 1 MB | Maximum message size received from native host |

Content Scripts {#content-scripts}

| Property | Value | Notes |
|----------|-------|-------|
| Size limit | No strict limit | No explicit size limit, but large scripts impact performance |
| Best practice | Minimize script size | Keep content scripts lightweight for page load performance |

Web Store Assets {#web-store-assets}

| Asset Type | Limit | Notes |
|------------|-------|-------|
| Screenshots | 20 maximum | Required for store listing |
| Promo images | 5 maximum | Used for promotional features |

Alarm Limits {#alarm-limits}

| Property | Value | Notes |
|----------|-------|-------|
| Minimum interval | 1 minute | Alarms cannot be set to fire more frequently |
| Precision | ~1 minute | Alarms may be delayed by up to a minute |

```javascript
// Minimum alarm interval
chrome.alarms.create('myAlarm', {
  delayInMinutes: 1,  // 1 minute minimum
  periodInMinutes: 1
});
```

declarativeNetRequest Limits {#declarativenetrequest-limits}

| Rule Type | Limit | Notes |
|-----------|-------|-------|
| Static rules | 300,000 | Rules defined in ruleset JSON files |
| Dynamic rules | 30,000 | Rules added at runtime via API |
| Session rules | 5,000 | Rules scoped to browser session |

Context Menus {#context-menus}

| Property | Value | Notes |
|----------|-------|-------|
| Maximum items | Varies | Hard limit per extension; depends on menu complexity |

Manifest Field Limits {#manifest-field-limits}

| Field | Maximum Characters | Notes |
|-------|---------------------|-------|
| name | 45 | Extension name character limit |
| short_name | 12 | Short name for limited space UI |
| description | 132 | Extension description character limit |

Cross-References {#cross-references}

For more detailed information, see:

- [Storage API detailed look](../api-reference/storage-api-deep detailed look.md)
- [Storage Migration Patterns](../patterns/storage-migration.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
