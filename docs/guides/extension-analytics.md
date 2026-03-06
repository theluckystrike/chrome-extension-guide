# Extension Analytics Guide

Analytics helps you understand how users interact with your extension while maintaining privacy and CWS compliance.

## Overview

Track usage patterns to improve your extension with a privacy-first approach:
- Aggregate data only, never PII
- Anonymous installation IDs
- Clear privacy policy disclosure
- Opt-in consent required

## What to Track

**Recommended:**
- Feature usage counts (popular features)
- Error rates and types
- Extension version distribution
- Active user counts (DAU/WAU/MAU)
- Performance metrics (load time, latency)

**Never track:** PII, browsing history, form inputs, email addresses, cross-site data.

## Privacy-First Analytics

### Anonymous ID Generation

```javascript
function getAnonymousId() {
  const KEY = 'analytics_id';
  return chrome.storage.local.get(KEY).then(r => {
    if (r[KEY]) return r[KEY];
    return chrome.storage.local.set({ [KEY]: crypto.randomUUID() })
      .then(() => getAnonymousId());
  });
}
```

### Opt-In Consent

```javascript
async function track(event, props = {}) {
  const { consent } = await chrome.storage.local.get('consent');
  if (consent !== true) return;
  if (navigator.doNotTrack === '1') return;
  
  const id = await getAnonymousId();
  await fetch('https://your-api.com/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, props, id, 
      version: chrome.runtime.getManifest().version,
      timestamp: Date.now() })
  });
}
```

## Implementation Approaches

### Self-Hosted (Recommended)
Simple fetch() to your endpoint. Full control, no third-party dependencies, CSP-compatible.

### Google Analytics 4 (Measurement Protocol)
Server-side GA4 without script injection. Send events via fetch():
```
POST https://www.google-analytics.com/mp/collect?measurement_id=G-XXXXX&api_secret=SECRET
```

### Privacy Alternatives
- Plausible, Umami, Simple Analytics - privacy-focused
- PostHog - open-source, self-hosted

## CWS Policy Compliance

**Required disclosures:** What data collected, how used, whether shared, user control, retention period.

**Rules:**
- Limited Use Policy: use data only for stated purpose
- No selling or sharing analytics data
- No content script tracking without consent
- Respect Do Not Track

**Checklist:**
- [ ] Privacy policy describes analytics
- [ ] Users can opt-out
- [ ] No PII collected
- [ ] Consent obtained before tracking

## Code Examples

### Analytics Class

```javascript
class Analytics {
  constructor(endpoint) { this.endpoint = endpoint; }
  
  async track(event, props = {}) {
    const { consent } = await chrome.storage.local.get('consent');
    if (consent !== true) return;
    const { analytics_id: id } = await chrome.storage.local.get('analytics_id');
    if (!id) return;
    
    await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, props, id, 
        version: chrome.runtime.getManifest().version,
        timestamp: Date.now() })
    }).catch(() => {});
  }
}
export const analytics = new Analytics('https://api.example.com/track');
```

### Error Reporting

```javascript
window.addEventListener('error', e => 
  analytics.track('error', { message: e.error.message, stack: e.error.stack }));

window.addEventListener('unhandledrejection', e => 
  analytics.track('error', { message: String(e.reason) }));
```

## Cross-References

- [Publishing Analytics](./publishing/analytics.md) - CWS insights
- [Privacy Policy Template](./publishing/privacy-policy-template.md)
- [Analytics Patterns](./patterns/analytics-telemetry.md)

## Resources

- [CWS User Data Policy](https://developer.chrome.com/docs/webstore/user-data)
- [GA4 Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
