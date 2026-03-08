---
layout: default
title: "Chrome Extension Monetization — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/extension-monetization/"
---
# Extension Monetization Guide

## Overview
- Strategies for generating revenue from Chrome extensions
- Choose based on extension type, user base, and market
- Most extensions require external payment processing since Chrome Web Store payments were deprecated in 2020

## Freemium Model
- Free tier with core features, paid tier with premium features
- Use `@theluckystrike/webext-storage` to store license state locally:
  ```typescript
  import { createStorage } from '@theluckystrike/webext-storage';
  
  const licenseSchema = defineSchema({
    tier: 'free' | 'premium',
    expiresAt: 'number | null',
    licenseKey: 'string | null'
  });
  
  const licenseStorage = createStorage(licenseSchema, 'local');
  ```
- License validation via external API or Chrome Identity
- Clear distinction between free and premium features in UI
- Upsell prompts at strategic points (e.g., after successful free actions)

## One-Time Purchase
- Chrome Web Store payments deprecated since 2020
- External payment processors: Stripe, Paddle, Gumroad, LemonSqueezy
- License key validation pattern:
  ```typescript
  async function validateLicenseKey(licenseKey: string): Promise<LicenseState> {
    const response = await fetch('https://your-api.com/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey })
    });
    
    if (!response.ok) {
      throw new Error('Invalid license key');
    }
    
    return response.json(); // { valid: true, tier: 'premium', ... }
  }
  ```
- Use `chrome.identity` for user verification when available
- Store purchase confirmation locally after successful validation

## Subscription Model
- Monthly/yearly recurring payments
- External billing via Stripe Subscriptions, Paddle, or Recurly
- Server-side license checks required:
  ```typescript
  async function checkSubscriptionStatus(): Promise<SubscriptionState> {
    const cached = await licenseStorage.get('subscription');
    
    // Check if cached result is still valid (e.g., within 1 hour)
    if (cached && Date.now() - cached.checkedAt < 3600000) {
      return cached.state;
    }
    
    // Verify with server
    const response = await fetch('https://your-api.com/subscription/status');
    const state = await response.json();
    
    await licenseStorage.set('subscription', { 
      state, 
      checkedAt: Date.now() 
    });
    
    return state;
  }
  ```
- Graceful degradation when subscription lapses (show limited functionality, not complete lockout)
- Trial periods: store trial start date and check expiration:
  ```typescript
  const TRIAL_DAYS = 7;
  
  async function isTrialExpired(): Promise<boolean> {
    const trialStart = await licenseStorage.get('trialStart');
    if (!trialStart) return false;
    
    const elapsed = Date.now() - trialStart;
    return elapsed > TRIAL_DAYS * 24 * 60 * 60 * 1000;
  }
  ```
- Send reminder emails before trial ends

## Donation-Based
- Platforms: Ko-fi, Buy Me a Coffee, GitHub Sponsors, Patreon
- Add donate button in popup or options page:
  ```html
  <a href="https://ko-fi.com/yourusername" target="_blank" class="donate-btn">
    <img src="icons/kofi.svg" alt="Support on Ko-fi" />
  </a>
  ```
- Non-intrusive prompts after extended use (e.g., after 30 days)
- Show appreciation for donors with subtle badge or thank-you message
- Don't gate core functionality behind donation requests

## Sponsorship and Partnerships
- Affiliate links in new tab pages or toolbar popups
- Sponsored default settings (with clear disclosure)
- Partnership with SaaS tools (offer as integration option)
- Native integrations with products users already use
- Ensure partnerships align with user trust and extension purpose

## Implementation Patterns

### License Key Validation
- User enters key in options page:
  ```typescript
  document.getElementById('activate-btn')?.addEventListener('click', async () => {
    const licenseKey = (document.getElementById('license-key') as HTMLInputElement).value;
    
    try {
      const result = await validateLicenseKey(licenseKey);
      await licenseStorage.set({
        tier: result.tier,
        licenseKey: licenseKey,
        expiresAt: result.expiresAt
      });
      showMessage('License activated!', 'success');
    } catch (error) {
      showMessage('Invalid license key', 'error');
    }
  });
  ```
- Cache validation result locally (with expiration)
- Re-validate periodically (e.g., daily or on extension startup)
- Handle offline gracefully: use cached data, warn user

### Feature Gating
- Check license state before premium features:
  ```typescript
  function canAccessPremium(): boolean {
    const license = licenseStorage.getSnapshot();
    return license.tier === 'premium' && 
           (!license.expiresAt || license.expiresAt > Date.now());
  }
  ```
- Show upgrade prompts for locked features:
  ```typescript
  function handlePremiumFeature() {
    if (!canAccessPremium()) {
      showUpgradePrompt('This feature requires Premium');
      return;
    }
    // Proceed with feature
  }
  ```
- Free trial countdown using `chrome.alarms`:
  ```typescript
  chrome.alarms.create('trialCheck', { periodInMinutes: 60 });
  
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'trialCheck') {
      const remaining = await getTrialDaysRemaining();
      if (remaining <= 3 && remaining > 0) {
        showNotification(`Trial ends in ${remaining} days!`);
      }
    }
  });
  ```

### User Identification
- `chrome.identity.getProfileUserInfo` for Google account (requires OAuth):
  ```typescript
  chrome.identity.getProfileUserInfo((userInfo) => {
    if (userInfo.id) {
      // Use userInfo.id to link purchases
      console.log('User ID:', userInfo.id);
    }
  });
  ```
- Anonymous device ID via `chrome.storage` (generated once):
  ```typescript
  async function getDeviceId(): Promise<string> {
    let deviceId = await storage.get('deviceId');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      await storage.set('deviceId', deviceId);
    }
    return deviceId;
  }
  ```
- Link purchases to identity for cross-device access

## What NOT To Do
- Never inject ads into web pages (CWS policy violation)
- Never sell user data or browsing history
- Never use crypto miners in extensions
- Never change default search engines for money
- Don't use deceptive UX (fake "close" buttons, hidden dismisses)
- Avoid aggressive upselling that disrupts user experience
- Respect CWS developer program policies — violations result in removal

## Code Examples

### Upgrade Prompt UI
```html
<div id="upgrade-banner" class="hidden">
  <p>Upgrade to Premium for unlimited access</p>
  <button id="upgrade-btn">Upgrade Now</button>
  <button id="dismiss-btn">Not Now</button>
</div>

<style>
  #upgrade-banner {
    background: #fef3cd;
    padding: 12px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .hidden { display: none; }
</style>
```

### License Check Middleware
```typescript
function withLicenseCheck(handler: Function) {
  return async (...args: any[]) => {
    if (!await canAccessPremium()) {
      return { error: 'premium_required', upgradeUrl: '/upgrade' };
    }
    return handler(...args);
  };
}

// Usage
const premiumAction = withLicenseCheck(async (data) => {
  // Actual premium feature logic
});
```

## Cross-references
- `docs/publishing/publishing-guide.md` — Publishing to Chrome Web Store
- `docs/guides/security-best-practices.md` — Secure storage and authentication
- `docs/patterns/state-management.md` — State management patterns
- `docs/guides/identity-oauth.md` — Chrome Identity API for user authentication

## Related Articles

- [Listing Optimization](../publishing/listing-optimization.md)
- [Release Notes](../guides/extension-release-notes.md)
