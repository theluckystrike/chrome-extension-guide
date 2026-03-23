Analytics and Telemetry for Chrome Extensions

Introduction
Analytics and telemetry are essential for understanding how users interact with your Chrome extension. This guide covers privacy-respecting analytics design, integration patterns, custom backend solutions, and compliance requirements.

1. Privacy-Respecting Analytics Design
- Data minimization: Collect only what you need
- Anonymization by default: Never send identifiable data without consent
- Consent-first: Obtain explicit user consent before collecting telemetry
- Local-first: Process data locally when possible

2. Google Analytics 4 Integration
```bash
npm install @analytics/google-analytics
```
```typescript
// src/lib/analytics.ts
import Analytics from 'analytics';
import googleAnalytics from '@analytics/google-analytics';

const analytics = Analytics({
  app: 'my-extension',
  plugins: [googleAnalytics({ measurementIds: ['G-XXXXXXXXXX'], anonymizeIp: true })],
});

export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  analytics.track(eventName, { ...params, extension_version: chrome.runtime.getManifest().version });
};
```

3. Mixpanel Integration
```bash
npm install mixpanel
```
```typescript
import Mixpanel from 'mixpanel';
const mixpanel = Mixpanel.init('YOUR_TOKEN', { ip: false, geolocate: false });

export const trackMixpanelEvent = (event: string, props?: Record<string, unknown>) => {
  mixpanel.track(event, { ...props, $insert_id: crypto.randomUUID(), platform: 'chrome-extension' });
};
```

4. Custom Analytics Backend
```typescript
// src/lib/customAnalytics.ts
let eventQueue: Array<Record<string, unknown>> = [];

export const queueEvent = (eventName: string, props?: Record<string, unknown>) => {
  eventQueue.push({ event_name: eventName, properties: props, timestamp: Date.now() });
  if (eventQueue.length >= 10) flushEvents();
};

export const flushEvents = async () => {
  if (eventQueue.length === 0) return;
  const events = [...eventQueue];
  eventQueue = [];
  try {
    await fetch('https://your-api.com/api/telemetry', { method: 'POST', body: JSON.stringify({ events }) });
  } catch { eventQueue = [...events, ...eventQueue]; }
};

chrome.alarms.create('analytics-flush', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === 'analytics-flush') flushEvents(); });
```

5. Event Tracking Patterns
```typescript
export enum AnalyticsEvent { INSTALLED = 'installed', UPDATED = 'updated', FEATURE_USED = 'feature_used' }

chrome.runtime.onInstalled.addListener((d) => {
  trackEvent(d.reason === 'install' ? AnalyticsEvent.INSTALLED : AnalyticsEvent.UPDATED, { prev: d.previousVersion });
});
```

6. Install and Uninstall Tracking
```typescript
chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === 'install') trackEvent('installed', { source: 'cws', locale: chrome.i18n.getUILanguage() });
});
chrome.runtime.setUninstallURL('https://yoursite.com/uninstall');
```

7. User Engagement Metrics
```typescript
chrome.runtime.onStartup.addListener(() => {
  const today = new Date().toDateString();
  chrome.storage.local.get(['last_active'], (r) => {
    if (r.last_active !== today) chrome.storage.local.set({ last_active: today, dau: (r.dau || 0) + 1 });
  });
});
```

8. Error and Crash Reporting - Sentry
```bash
npm install @sentry/chrome
```
```typescript
import * as Sentry from '@sentry/chrome';
Sentry.init({ dsn: 'YOUR_DSN', sampleRate: 0.1, beforeSend(e) { 
  if (e.user) { delete e.user.email; e.user.id = crypto.randomUUID(); }
  return e;
}});
window.addEventListener('error', (ev) => Sentry.captureException(ev.error));
window.addEventListener('unhandledrejection', (ev) => Sentry.captureException(ev.reason));
```

9. Performance Metrics
```typescript
import { getFCP, getLCP, getFID, getCLS } from 'web-vitals';
const report = (n: string, v: number) => trackEvent('perf', { metric: n, value: Math.round(v) });
getFCP(report); getLCP(report); getFID(report); getCLS(report);
```

10. Version Adoption Tracking
```typescript
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ install_time: Date.now() });
  trackEvent('version_check', { version: chrome.runtime.getManifest().version });
});
```

11. A/B Test Measurement
```typescript
const assignVariant = (expId: string, variants: string[]): string => {
  const hash = hashString(getAnonId() + expId);
  return variants[hash % variants.length];
};
export const trackExperiment = (expId: string, variants: string[]) => 
  trackEvent('experiment', { exp_id: expId, variant: assignVariant(expId, variants) });
```

12. GDPR and Privacy Compliance
```typescript
interface Consent { analytics: boolean; errors: boolean; timestamp: number; }

export const getConsent = async (): Promise<Consent> => 
  (await chrome.storage.local.get('consent')).consent || { analytics: false, errors: false, timestamp: 0 };

export const setConsent = async (c: Consent) => 
  await chrome.storage.local.set({ consent: { ...c, timestamp: Date.now() } });

export const canTrack = async (type: 'analytics' | 'errors'): Promise<boolean> => 
  (await getConsent())[type] === true;
```

13. Anonymization Techniques
```typescript
// Hash user ID
const hashUserId = async (id: string): Promise<string> => {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id + 'SALT'));
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
};

// Anonymize IP
const anonIp = (ip: string): string => ip.split('.').length === 4 ? ip.split('.').slice(0,3).join('.') + '.0' : ip;
```

14. Batch Sending for Efficiency
```typescript
class Batcher {
  private q: unknown[] = [];
  add(e: unknown) { this.q.push(e); if (this.q.length >= 50) this.flush(); }
  async flush() {
    if (!this.q.length) return;
    await fetch('/api/batch', { method: 'POST', body: JSON.stringify({ e: [...this.q] }) });
    this.q = [];
  }
}
```

Summary Table

| Category | Implementation | Key Points |
|----------|---------------|------------|
| GA4 | @analytics/google-analytics | Anonymize IP, sample rate |
| Mixpanel | mixpanel SDK | Pseudonymous IDs |
| Custom | Batch + fetch | Queue + flush pattern |
| Errors | Sentry Chrome | Sample rate, PII removal |
| Performance | web-vitals | FCP, LCP, FID, CLS |
| Privacy | Consent manager | Opt-in, GDPR compliant |
| A/B Testing | Hash assignment | Deterministic, anonymous |
| Version | onInstalled | Track installs/updates |

Reference
- [Chrome Extensions Dev](https://developer.chrome.com/docs/extensions/develop)
- [GA4 Documentation](https://developers.google.com/analytics/devguides/collection/ga4)
- [Sentry Chrome SDK](https://docs.sentry.io/platforms/javascript/guides/chrome/)

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, [Stripe integration](https://bestchromeextensions.com/extension-monetization-playbook/monetization/stripe-integration), subscription architecture, and growth strategies for Chrome extension developers.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
