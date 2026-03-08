---
layout: default
title: "Chrome Extension Analytics — Publishing Guide"
description: "Set up analytics for your Chrome extension to track users, engagement, and performance metrics."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/publishing/analytics/"
---

# Chrome Extension Analytics

## CWS Dashboard Metrics {#cws-dashboard-metrics}
- Daily/weekly installs and uninstalls
- Active users (daily, weekly)
- Ratings and reviews
- Impressions (how many saw your listing)
- Install conversion rate

## Custom Analytics Options {#custom-analytics-options}
- Google Analytics 4 (GA4) — most common, works in extension pages
- Plausible Analytics — privacy-focused, no cookies
- Custom backend — full control, POST events to your API
- All require user consent (GDPR, CCPA)

## Implementing Analytics {#implementing-analytics}

### In Popup/Options Pages {#in-popupoptions-pages}
```html
<!-- GA4 in popup.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
```
- NOTE: MV3 CSP may block external scripts — use Measurement Protocol instead

### Measurement Protocol (Server-Side) {#measurement-protocol-server-side}
```javascript
// background.js — send events without external scripts
async function trackEvent(name, params = {}) {
  const consent = await storage.get('analyticsConsent');
  if (!consent) return;

  await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=G-XXX&api_secret=YYY`, {
    method: 'POST',
    body: JSON.stringify({
      client_id: await getAnonymousId(),
      events: [{ name, params }]
    })
  });
}
```

### Consent Pattern {#consent-pattern}
```typescript
const storage = createStorage(defineSchema({
  analyticsConsent: 'boolean',
  anonymousId: 'string'
}), 'sync');

// Show consent dialog on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: 'welcome.html' }); // Includes consent checkbox
  }
});
```

## What to Track {#what-to-track}
- Feature usage (which features are used most)
- Errors and crashes (cross-ref: `docs/publishing/beta-testing.md`)
- Extension lifecycle (install, update, uninstall)
- User flow (onboarding completion rate)
- Performance metrics (popup load time, message latency)

## Privacy Best Practices {#privacy-best-practices}
- Always get explicit consent before tracking
- Store consent preference with `@theluckystrike/webext-storage`
- No PII (email, IP, browsing history)
- Use anonymous client IDs
- Provide opt-out in options page
- Disclose tracking in privacy policy (cross-ref: `docs/publishing/privacy-policy-template.md`)
- GDPR: consent must be opt-in, not opt-out
- Include analytics disclosure in CWS privacy practices

## Uninstall Tracking {#uninstall-tracking}
```javascript
chrome.runtime.setUninstallURL('https://yoursite.com/uninstall-survey?id=XXX');
```
- Opens a page when user uninstalls — opportunity for feedback
- Keep survey short (1-2 questions)
- Don't track without consent even here

## Common Mistakes {#common-mistakes}
- Loading external analytics scripts blocked by MV3 CSP — use Measurement Protocol
- Tracking without consent — violates CWS policy and GDPR
- Collecting PII — even accidentally (URLs can contain PII)
- Not providing opt-out — required by most privacy regulations
- Over-tracking — focus on actionable metrics only
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
