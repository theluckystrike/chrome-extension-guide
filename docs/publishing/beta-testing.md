---
layout: default
title: "Chrome Extension Beta Testing. Publishing Guide"
description: "Learn how to beta test Chrome extensions using trusted testers, unlisted releases, and feature flags before full public launch."
canonical_url: "https://bestchromeextensions.com/publishing/beta-testing/"
---

Beta Testing Chrome Extensions

Introduction {#introduction}
- Test new features with a subset of users before full release
- Catch bugs, get feedback, validate UX changes
- Multiple approaches: CWS trusted testers, unlisted, self-hosted

CWS Trusted Testers {#cws-trusted-testers}
- Publish with `"publishTarget": "trustedTesters"` via CWS API
- Or select "Trusted testers" in Developer Dashboard
- Add testers by email in the Developer Dashboard
- Testers see the extension in CWS (others don't)
- Same review process as public. may take 1-3 days

Unlisted Extensions {#unlisted-extensions}
- Set visibility to "Unlisted" in Developer Dashboard
- Anyone with the direct CWS link can install
- Good for larger beta groups without email management
- Still goes through CWS review

Self-Hosted Beta (Enterprise/Development) {#self-hosted-beta-enterprisedevelopment}
- Host `.crx` file on your own server
- Set `"update_url"` in manifest.json for auto-updates
- Only works with enterprise policy or developer mode
- No CWS review. fastest iteration

Unpacked Extension Testing {#unpacked-extension-testing}
- `chrome://extensions` → "Load unpacked" → select extension directory
- Best for internal team testing
- No auto-updates. must manually reload
- No CWS infrastructure needed

Feature Flags Pattern {#feature-flags-pattern}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const storage = createStorage(defineSchema({
  betaFeatures: 'string'  // JSON object of feature flags
}), 'sync');

async function isFeatureEnabled(feature: string): Promise<boolean> {
  const flags = JSON.parse(await storage.get('betaFeatures') || '{}');
  return !!flags[feature];
}

// Usage
if (await isFeatureEnabled('newUI')) {
  renderNewUI();
} else {
  renderClassicUI();
}
```
- Toggle features remotely by updating storage
- Gradual rollout without new CWS submission

A/B Testing {#ab-testing}
- Randomly assign users to groups on first install
- Store group assignment with `@theluckystrike/webext-storage`
- Track which group performs better (engagement, errors)
- Privacy-conscious: no PII, anonymous group IDs only

Collecting Feedback {#collecting-feedback}
- In-extension feedback form (popup or options page)
- Send via `fetch()` to your backend or Google Forms
- Include: version, browser info, feature flags, user comments
- Store feedback-sent status to avoid repeated prompts
- `chrome.runtime.getManifest().version` for version info

Crash and Error Reporting {#crash-and-error-reporting}
```javascript
// background.js. global error handler
self.addEventListener('error', (event) => {
  reportError({ message: event.message, filename: event.filename, line: event.lineno });
});

self.addEventListener('unhandledrejection', (event) => {
  reportError({ message: event.reason?.message || 'Unhandled rejection' });
});
```
- Track errors per version to catch regressions
- Use `@theluckystrike/webext-messaging` `MessagingError` for messaging-specific errors

Promoting Beta to Stable {#promoting-beta-to-stable}
1. Verify beta metrics (error rate, feedback, engagement)
2. Update version number (bump minor/major)
3. Publish with `"publishTarget": "default"` (public)
4. Monitor post-release metrics
5. Keep beta branch ahead for next cycle

Beta Testing Checklist {#beta-testing-checklist}
- [ ] Feature flags configured for new features
- [ ] Error reporting enabled
- [ ] Feedback mechanism in place
- [ ] Beta testers added in CWS Dashboard
- [ ] Version clearly marked as beta (`version_name: "X.Y Beta"`)
- [ ] Rollback plan ready (previous stable version tagged)
- [ ] Analytics tracking beta vs stable groups

Common Mistakes {#common-mistakes}
- Not having a rollback plan. always keep previous stable version
- Beta testing on too few users. need enough for statistical significance
- Not monitoring error rates. beta bugs can ship to stable
- Skipping CWS review time. trusted tester builds still need review
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
