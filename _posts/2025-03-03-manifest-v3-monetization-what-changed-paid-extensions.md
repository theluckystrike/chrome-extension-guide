---
layout: default
title: "Manifest V3 Monetization — What Changed for Paid Chrome Extensions"
description: "How Manifest V3 affects extension monetization. Service worker limitations, new payment patterns, license validation changes, and updated monetization architectures."
date: 2025-03-03
categories: [guides, monetization]
tags: [manifest-v3, extension-monetization, mv3-migration, service-worker-payments, chrome-extension-business]
author: theluckystrike
---

# Manifest V3 Monetization — What Changed for Paid Chrome Extensions

The transition from Manifest V2 to Manifest V3 wasn't just a technical migration—it fundamentally changed how Chrome extension developers can monetize their products. If you're building a paid extension in 2025, understanding these changes isn't optional; it's essential for building a sustainable business.

This guide covers everything that changed for paid extensions in MV3, from the deprecation of Chrome Web Store payments to new patterns for handling license validation, payment flows, and service worker termination scenarios.

---

## MV3 Changes That Impact Monetization {#mv3-changes-impacting-monetization}

Several architectural changes in Manifest V3 directly affect how you can monetize your extension. Understanding these changes is the first step to building a robust monetization system.

### Service Workers Replace Background Pages

The most significant change is the replacement of persistent background pages with ephemeral service workers. In Manifest V2, your background script ran continuously, maintaining state in global variables and keeping connections open. In Manifest V3, service workers activate only when needed and terminate after a period of inactivity—typically around 30 seconds.

This change impacts monetization in several ways:

- **License state cannot be stored in memory**: Any licensing information must be persisted to `chrome.storage` because your service worker will be terminated between user interactions.
- **No persistent connections**: WebSocket connections for real-time license verification will be closed when the service worker terminates.
- **Timer limitations**: While `chrome.alarms` works reliably, `setTimeout` and `setInterval` don't persist across service worker restarts.

### Remote Code Execution Banned

Manifest V3 prohibits loading and executing remote code. This means all your extension's JavaScript must be bundled within the extension package. For monetization, this affects:

- **License validation servers**: You cannot dynamically load license validation logic from external servers. All validation code must be bundled.
- **Payment provider SDKs**: If a payment provider requires loading external scripts, you need to find alternatives or use their server-side APIs.
- **A/B testing and feature flags**: Remote configuration is still possible via API calls, but the logic handling those configurations must be bundled.

### Host Permissions Become Runtime

In Manifest V2, host permissions were granted at installation. In Manifest V3, many host permissions are requested at runtime using the `permissions` API. For paid extensions, this means:

- **Feature gating is more complex**: You may need to request additional permissions after purchase to enable premium features.
- **User trust is paramount**: Users can revoke permissions at any time, so your extension must handle permission loss gracefully.

### Storage API Changes

The storage API has new capabilities in MV3:

- **`chrome.storage.session`**: Session-scoped storage that doesn't persist across browser restarts. Useful for temporary authentication tokens.
- **`chrome.storage.managed`**: Enterprise policy-controlled storage for license enforcement in organizational settings.

---

## Chrome Web Store Payments Deprecation {#cws-payments-deprecation}

One of the most significant changes for paid extension developers is the deprecation of Chrome Web Store (CWS) payments. Google has been phasing out the built-in payment system, and developers must now implement their own payment processing.

### What Replaces CWS Payments

Developers now have several alternatives for accepting payments:

1. **Stripe**: The most popular choice for extension developers. Stripe offers robust APIs, subscription management, and excellent developer tooling.
2. **Paddle**: Often used for software products with global tax compliance handling.
3. **LemonSqueezy**: A merchant of record that handles taxes and VAT automatically.
4. **Direct payments through your website**: Redirecting users to your website for payment processing.

### Setting Up External Payment Flow

The recommended approach for MV3 extensions is to use an external payment flow:

1. **User clicks "Upgrade" in your extension**
2. **Extension opens your payment page** (using `chrome.tabs.create` or `chrome.action.openPopup` followed by redirect)
3. **User completes payment on your website**
4. **Your server sends a license key or activates the license** via:
   - Email with license key
   - Direct API activation (extension calls your server with payment proof)
   - Webhook that updates your license database

### License Key vs. API-Based Activation

For MV3, API-based activation is generally superior to license keys:

- **License keys**: User manually enters a key. Simple to implement but poor user experience.
- **API activation**: Extension automatically verifies purchase via your server. Better UX and enables subscription management.

---

## Service Worker and License Validation Timing {#service-worker-license-validation}

One of the biggest challenges in MV3 monetization is handling license validation with ephemeral service workers. Here's how to approach it.

### When to Validate License

License validation should happen at these key points:

1. **On extension startup**: When the service worker first loads (in response to a user action or alarm)
2. **On significant events**: When the user attempts to use premium features
3. **Periodically**: Using `chrome.alarms` for subscription expiration checks
4. **On payment completion**: When returning from a payment flow

### Handling Service Worker Termination During Validation

The worst-case scenario: a user is mid-purchase when Chrome terminates your service worker. Here's how to handle it:

```javascript
// In your service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VERIFY_LICENSE') {
    // Return a promise to indicate async response
    verifyLicense(message.licenseKey).then(result => {
      sendResponse({ valid: result.valid, expiresAt: result.expiresAt });
    });
    return true; // Keep message channel open for async response
  }
});

// Use chrome.alarms to schedule periodic validation
chrome.alarms.create('license-check', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'license-check') {
    checkLicenseOnServer();
  }
});

// Store validation state in chrome.storage
async function checkLicenseOnServer() {
  const { licenseKey } = await chrome.storage.local.get('licenseKey');
  if (!licenseKey) return;
  
  try {
    const response = await fetch('https://your-api.com/verify-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey })
    });
    const result = await response.json();
    
    await chrome.storage.local.set({
      licenseStatus: result.valid ? 'active' : 'expired',
      licenseExpiresAt: result.expiresAt
    });
  } catch (error) {
    console.error('License check failed:', error);
  }
}
```

### Service Worker Keep-Alive Patterns

For payment flows where you need to maintain state, consider these patterns:

- **Use offscreen documents** for longer-running operations
- **Pass state through the payment callback URL** (your payment provider redirects back with state encoded in the URL)
- **Use chrome.storage** to track payment in progress and verify on service worker wake-up

---

## Offscreen Documents for Payment Flows {#offscreen-documents}

Offscreen documents are a crucial tool for MV3 monetization. They allow you to run JavaScript in a background context that can persist longer than a service worker.

### When to Use Offscreen Documents

Offscreen documents are ideal for:

- **OAuth flows**: Completing authentication with external providers
- **Payment processing**: Running payment SDK code
- **Long computations**: License key generation or validation
- **WebSocket connections**: Maintaining real-time communication

### Creating an Offscreen Document

```javascript
// Create offscreen document for payment flow
async function createPaymentOffscreen() {
  // Check if offscreen already exists
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (contexts.length > 0) {
    return contexts[0];
  }
  
  // Create new offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen-payment.html',
    reasons: ['PAYMENT_REQUESTS', 'CLIPBOARD'],
    justification: 'Processing payment through Stripe SDK'
  });
}

// Close when done
async function closePaymentOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen-payment.html')]
  });
  
  for (const context of contexts) {
    await chrome.runtime.closeContext(context.contextId);
  }
}
```

### Communication Between Service Worker and Offscreen

```javascript
// Service worker sends message to offscreen
async function sendToOffscreen(message) {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (contexts.length > 0) {
    await chrome.runtime.sendMessage(contexts[0].contextId, message);
  }
}

// Offscreen document handles message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROCESS_PAYMENT') {
    // Initialize Stripe or other payment SDK
    processPayment(message.amount).then(result => {
      sendResponse({ success: true, transactionId: result.id });
    });
    return true; // Async response
  }
});
```

---

## declarativeNetRequest and Ad-Blocker Monetization {#declarativeNetRequest-ad-blocker-monetization}

For ad-blocker extensions, MV3 introduced significant changes to how network requests can be modified.

### The declarativeNetRequest API

In Manifest V3, `declarativeNetRequest` replaces the blocking `webRequest` API:

- **Declarative rules**: You define rules in JSON, Chrome enforces them
- **No reading of request content**: Privacy improvement but limits some use cases
- **Static and dynamic rules**: Combined limit of 450,000 rules

### Monetizing Ad Blockers Under MV3

Monetizing ad blockers in MV3 requires different approaches:

1. **Freemium model**: Free version with limited blocking, premium with full features
2. **Acceptable Ads program**: Participate to earn revenue from non-intrusive ads (note: must meet Google's requirements)
3. **Affiliate partnerships**: Recommend privacy products through your extension
4. **Donations**: Offer a way for users to support development

### Implementing Premium Features with declarativeNetRequest

```json
{
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"],
  "declarative_net_request": {
    "rule_resources": [{
      "id": "default_ruleset",
      "enabled": true,
      "path": "rules/default.json"
    }]
  }
}
```

```javascript
// Dynamic rule management for premium users
async function enablePremiumBlocking() {
  const rules = [
    {
      id: 1,
      priority: 1,
      action: { type: 'block' },
      condition: { urlFilter: '.*ads\\..*', resourceTypes: ['script', 'image'] }
    }
  ];
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
    removeRuleIds: [1]
  });
}

// Check premium status before enabling
async function handlePremiumFeature(feature) {
  const { licenseStatus } = await chrome.storage.local.get('licenseStatus');
  
  if (licenseStatus === 'active' || feature === 'basic') {
    return true;
  }
  
  // Prompt upgrade
  showUpgradePrompt();
  return false;
}
```

---

## storage.session for Auth Tokens {#storage-session-auth-tokens}

The `chrome.storage.session` API provides session-scoped storage that doesn't persist across browser restarts. This is ideal for sensitive temporary data like authentication tokens.

### Using session Storage for Authentication

```javascript
// Store auth token in session storage (not persisted)
async function storeAuthToken(token) {
  await chrome.storage.session.set({ authToken: token });
}

// Retrieve auth token
async function getAuthToken() {
  const { authToken } = await chrome.storage.session.get('authToken');
  return authToken;
}

// Clear on logout
async function clearAuthSession() {
  await chrome.storage.session.clear();
}
```

### Combining session and local Storage

For robust auth in MV3, use both storage types:

```javascript
class AuthManager {
  async login(email, password) {
    const response = await fetch('https://your-api.com/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const { token, refreshToken, expiresIn } = await response.json();
    
    // Store refresh token in persistent storage
    await chrome.storage.local.set({ 
      refreshToken, 
      tokenExpiresAt: Date.now() + expiresIn * 1000 
    });
    
    // Store access token in session storage
    await chrome.storage.session.set({ authToken: token });
    
    return true;
  }
  
  async getValidToken() {
    const { authToken, tokenExpiresAt } = await chrome.storage.session.get(['authToken', 'tokenExpiresAt']);
    
    // Check if token is still valid
    if (authToken && tokenExpiresAt && Date.now() < tokenExpiresAt) {
      return authToken;
    }
    
    // Token expired, try refresh
    return this.refreshToken();
  }
  
  async refreshToken() {
    const { refreshToken } = await chrome.storage.local.get('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await fetch('https://your-api.com/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    const { token, refreshToken: newRefreshToken, expiresIn } = await response.json();
    
    await chrome.storage.local.set({ 
      refreshToken: newRefreshToken,
      tokenExpiresAt: Date.now() + expiresIn * 1000 
    });
    
    await chrome.storage.session.set({ authToken: token });
    
    return token;
  }
}
```

---

## Alarm-Based License Re-Validation {#alarm-based-license-re-validation}

For subscription-based extensions, you need to periodically check license status to ensure users haven't cancelled or had their subscription revoked.

### Setting Up License Re-Validation Alarms

```javascript
// Schedule periodic license check
function scheduleLicenseValidation() {
  // Check every hour
  chrome.alarms.create('license-validation', {
    periodInMinutes: 60
  });
  
  // Also check at a specific time daily (e.g., midnight)
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  
  chrome.alarms.create('daily-license-check', {
    when: midnight.getTime(),
    periodInMinutes: 1440 // 24 hours
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'license-validation' || alarm.name === 'daily-license-check') {
    await validateLicense();
  }
});

async function validateLicense() {
  const { licenseKey, lastValidation } = await chrome.storage.local.get(['licenseKey', 'lastValidation']);
  
  if (!licenseKey) {
    return;
  }
  
  // Rate limit validation (don't hit API too often)
  const now = Date.now();
  if (lastValidation && now - lastValidation < 3600000) { // 1 hour
    return;
  }
  
  try {
    const response = await fetch('https://your-api.com/license/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey })
    });
    
    const result = await response.json();
    
    await chrome.storage.local.set({
      licenseStatus: result.valid ? 'active' : 'expired',
      licenseExpiresAt: result.expiresAt,
      lastValidation: now
    });
    
    // Notify user if license expired
    if (result.valid === false) {
      notifyLicenseExpired();
    }
  } catch (error) {
    console.error('License validation failed:', error);
    // Don't immediately revoke on network failure
  }
}
```

### Smart Validation Scheduling

For better user experience, combine multiple validation strategies:

```javascript
async function smartValidate() {
  // 1. Quick local check first
  const { licenseStatus, licenseExpiresAt } = await chrome.storage.local.get(['licenseStatus', 'licenseExpiresAt']);
  
  // 2. If local says expired, trust it (don't block user further)
  if (licenseStatus === 'expired') {
    return false;
  }
  
  // 3. If license expires within 7 days, validate now
  if (licenseExpiresAt && (licenseExpiresAt - Date.now()) < 7 * 24 * 60 * 60 * 1000) {
    return validateLicense();
  }
  
  // 4. Otherwise, trust local validation if recent
  const { lastValidation } = await chrome.storage.local.get('lastValidation');
  if (lastValidation && (Date.now() - lastValidation) < 24 * 60 * 60 * 1000) {
    return licenseStatus === 'active';
  }
  
  // 5. Must validate
  return validateLicense();
}
```

---

## Tab Suspender Pro MV3 Monetization Migration {#tab-suspender-pro-mv3-monetization}

To illustrate real-world MV3 monetization, let's examine how Tab Suspender Pro migrated its payment system.

### MV2 Architecture (Legacy)

In Manifest V2, Tab Suspender Pro used:

- Chrome Web Store payments (built-in)
- Background page with persistent state
- Global variables for license status

### MV3 Migration Challenges

The migration required solving several challenges:

1. **No more CWS payments**: Had to implement external payment flow
2. **Service worker termination**: License state must persist
3. **Payment completion handling**: Need to handle users closing browser mid-purchase

### MV3 Solution Implemented

```javascript
// Tab Suspender Pro MV3 License Manager
class LicenseManager {
  constructor() {
    this.initialize();
  }
  
  async initialize() {
    // Schedule validation on startup
    this.scheduleValidation();
    
    // Check license status
    await this.checkLicense();
  }
  
  async checkLicense() {
    const { licenseKey } = await chrome.storage.local.get('licenseKey');
    
    if (!licenseKey) {
      this.setFreeTier();
      return;
    }
    
    // Validate with server
    const isValid = await this.validateWithServer(licenseKey);
    
    if (isValid) {
      this.setPremiumTier();
    } else {
      this.setFreeTier();
    }
  }
  
  async purchase() {
    // Create checkout session
    const response = await fetch('https://api.tabsuspenderpro.com/create-checkout', {
      method: 'POST'
    });
    const { url, sessionId } = await response.json();
    
    // Store pending payment
    await chrome.storage.local.set({ 
      pendingPayment: sessionId,
      paymentStarted: Date.now()
    });
    
    // Open checkout in new tab
    await chrome.tabs.create({ url });
    
    // Set up alarm to check payment status
    chrome.alarms.create('payment-check', { delayInMinutes: 1 });
  }
  
  async handlePaymentComplete(sessionId) {
    // Verify payment with server
    const response = await fetch('https://api.tabsuspenderpro.com/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });
    
    const { licenseKey, subscription } = await response.json();
    
    // Store license
    await chrome.storage.local.set({
      licenseKey,
      licenseStatus: 'active',
      subscription,
      pendingPayment: null
    });
    
    // Enable premium features
    this.setPremiumTier();
  }
  
  scheduleValidation() {
    chrome.alarms.create('license-validate', { periodInMinutes: 30 });
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'payment-check') {
    const { pendingPayment } = await chrome.storage.local.get('pendingPayment');
    if (pendingPayment) {
      // Check with server if payment completed
      const response = await fetch(`https://api.tabsuspenderpro.com/check-payment/${pendingPayment}`);
      if (response.ok) {
        licenseManager.handlePaymentComplete(pendingPayment);
      }
    }
  }
  
  if (alarm.name === 'license-validate') {
    await licenseManager.checkLicense();
  }
});
```

---

## Stripe Checkout in MV3 World {#stripe-checkout-mv3}

Stripe is the most popular payment processor for Chrome extensions. Here's how to integrate Stripe Checkout in the MV3 world.

### Creating a Stripe Checkout Flow

```javascript
// popup.js or service worker
async function initiatePurchase() {
  // 1. Create Stripe Checkout Session on your server
  const response = await fetch('https://your-api.com/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      priceId: 'price_premium_monthly',
      successUrl: chrome.runtime.getURL('payment-success.html'),
      cancelUrl: chrome.runtime.getURL('payment-canceled.html'),
      clientReferenceId: await getUserId()
    })
  });
  
  const { url, sessionId } = await response.json();
  
  // 2. Store session ID for verification
  await chrome.storage.local.set({
    pendingStripeSession: sessionId,
    paymentInitiated: Date.now()
  });
  
  // 3. Open Stripe Checkout in a new tab
  await chrome.tabs.create({ url });
}

// payment-success.html (loaded after payment)
async function handlePaymentSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  
  if (!sessionId) {
    showError('No session ID found');
    return;
  }
  
  // Verify the payment with your server
  const response = await fetch('https://your-api.com/verify-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  
  if (!response.ok) {
    showError('Payment verification failed');
    return;
  }
  
  const { licenseKey, subscription } = await response.json();
  
  // Store license in extension
  await chrome.storage.local.set({
    licenseKey,
    licenseStatus: 'active',
    subscription,
    stripeCustomerId: (await response.json()).customerId
  });
  
  // Notify service worker
  chrome.runtime.sendMessage({ type: 'LICENSE_ACTIVATED' });
  
  // Close tab after short delay
  setTimeout(() => window.close(), 2000);
}
```

### Server-Side Stripe Implementation

```javascript
// server.js (Node.js/Express)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/create-checkout-session', async (req, res) => {
  const { priceId, successUrl, cancelUrl, clientReferenceId } = req.body;
  
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: cancelUrl,
    client_reference_id: clientReferenceId,
    metadata: {
      extensionId: 'tab-suspender-pro'
    }
  });
  
  res.json({ url: session.url, sessionId: session.id });
});

app.post('/verify-session', async (req, res) => {
  const { sessionId } = req.body;
  
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  
  if (session.payment_status !== 'paid') {
    return res.status(400).json({ error: 'Payment not completed' });
  }
  
  // Generate license key
  const licenseKey = generateLicenseKey();
  
  // Store license in database
  await saveLicense({
    key: licenseKey,
    customerId: session.customer,
    subscriptionId: session.subscription,
    status: 'active'
  });
  
  res.json({ 
    licenseKey,
    subscription: {
      id: session.subscription,
      status: 'active',
      currentPeriodEnd: session.expires_at
    }
  });
});

// Webhook to handle subscription changes
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    await deactivateLicense(subscription.customer);
  }
  
  res.json({ received: true });
});
```

---

## External Website Payment Flow {#external-website-payment-flow}

The external website payment flow is the recommended pattern for MV3 extensions. Here's a comprehensive implementation.

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Chrome         │     │  Your           │     │  Payment        │
│  Extension      │────▶│  Website        │────▶│  Provider       │
│                 │     │  (checkout)     │     │  (Stripe)       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐              │
        │               │  API Server     │              │
        │               │  (license       │              │
        └──────────────▶│  validation)    │              │
                        └─────────────────┘
```

### Complete Implementation

```javascript
// service-worker.js

// 1. User initiates purchase
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INITIATE_PURCHASE') {
    handlePurchase(message.plan);
    return true;
  }
});

async function handlePurchase(plan) {
  // Create payment session on your server
  const response = await fetch('https://your-api.com/payments/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      plan,
      extensionId: 'my-extension',
      returnUrl: chrome.runtime.getURL('payment-callback.html')
    })
  });
  
  const { sessionId, paymentUrl } = await response.json();
  
  // Store payment context
  await chrome.storage.local.set({
    paymentSession: sessionId,
    paymentPlan: plan,
    paymentStarted: Date.now()
  });
  
  // Open payment page
  await chrome.tabs.create({ url: paymentUrl });
}

// 2. Handle return from payment
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PAYMENT_COMPLETE') {
    handlePaymentComplete(message.sessionId);
    return true;
  }
});

async function handlePaymentComplete(sessionId) {
  // Verify payment with server
  const response = await fetch('https://your-api.com/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });
  
  if (!response.ok) {
    throw new Error('Payment verification failed');
  }
  
  const { licenseKey, subscription, features } = await response.json();
  
  // Store license
  await chrome.storage.local.set({
    licenseKey,
    licenseStatus: 'active',
    subscription,
    premiumFeatures: features,
    paymentSession: null // Clear pending payment
  });
  
  // Update UI
  notifyUser('Premium activated!');
}

// 3. Handle service worker termination during payment
chrome.runtime.onStartup.addListener(async () => {
  const { paymentSession, paymentStarted } = await chrome.storage.local.get(['paymentSession', 'paymentStarted']);
  
  if (paymentSession) {
    // Check if payment was completed while we were terminated
    const response = await fetch(`https://your-api.com/payments/status/${paymentSession}`);
    if (response.ok) {
      const result = await response.json();
      if (result.status === 'completed') {
        await handlePaymentComplete(paymentSession);
      } else if (result.status === 'failed' || result.status === 'canceled') {
        await chrome.storage.local.set({ paymentSession: null });
      }
      // Still pending - user may be in checkout
    }
  }
});

// 4. Periodic check for abandoned payments
chrome.alarms.create('check-abandoned-payments', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'check-abandoned-payments') {
    const { paymentSession, paymentStarted } = await chrome.storage.local.get(['paymentSession', 'paymentStarted']);
    
    if (paymentSession && paymentStarted) {
      // Check if payment has been pending too long (30 minutes)
      if (Date.now() - paymentStarted > 30 * 60 * 1000) {
        // May have been abandoned - try to verify
        const response = await fetch(`https://your-api.com/payments/status/${paymentSession}`);
        if (response.ok) {
          const result = await response.json();
          if (result.status === 'completed') {
            await handlePaymentComplete(paymentSession);
          } else {
            // Clear stuck payment
            await chrome.storage.local.set({ paymentSession: null });
          }
        }
      }
    }
  }
});
```

---

## Handling Service Worker Termination During Purchase {#handling-sw-termination}

The most challenging aspect of MV3 monetization is handling the case where the service worker terminates mid-purchase. Here's how to build a robust system.

### The Problem

User flow:
1. User clicks "Buy Now" in extension popup
2. Service worker creates payment session
3. Payment tab opens
4. User completes payment
5. User switches back to Chrome
6. Service worker has been terminated!

### Solution: Resume Payment Flow on Wake-Up

```javascript
// service-worker.js - handles service worker startup
chrome.runtime.onStartup.addListener(async () => {
  await restorePaymentState();
});

chrome.runtime.onInstalled.addListener(async () => {
  await restorePaymentState();
});

async function restorePaymentState() {
  const { paymentSession, paymentStarted, licenseStatus } = await chrome.storage.local.get([
    'paymentSession',
    'paymentStarted',
    'licenseStatus'
  ]);
  
  if (paymentSession && licenseStatus !== 'active') {
    // There's a pending payment - check its status
    try {
      const response = await fetch(`https://your-api.com/payments/status/${paymentSession}`);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.status === 'completed') {
          // Payment completed while we were asleep!
          await activateLicense(result.licenseKey, result.subscription);
        } else if (result.status === 'failed' || result.status === 'canceled') {
          // Payment didn't complete
          await chrome.storage.local.set({ paymentSession: null });
        }
        // Still pending - user is probably in checkout
      }
    } catch (error) {
      console.error('Failed to restore payment state:', error);
    }
  }
  
  // Also check if license needs validation after browser restart
  if (licenseStatus === 'active') {
    await validateLicense();
  }
}

async function activateLicense(licenseKey, subscription) {
  await chrome.storage.local.set({
    licenseKey,
    licenseStatus: 'active',
    subscription,
    paymentSession: null,
    paymentStarted: null
  });
  
  // Notify any open popup
  chrome.runtime.sendMessage({ 
    type: 'LICENSE_ACTIVATED',
    subscription
  }).catch(() => {
    // Popup might not be open - that's fine
  });
}
```

### Handling Payment Callback URLs

Your payment page should also handle returning users:

```html
<!-- payment-success.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Processing...</title>
  <script>
    async function processReturn() {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      const status = urlParams.get('status');
      
      if (status === 'success' && sessionId) {
        // Verify with server
        const response = await fetch('https://your-api.com/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId })
        });
        
        if (response.ok) {
          const { licenseKey, subscription } = await response.json();
          
          // Try to notify extension
          try {
            await chrome.runtime.sendMessage({
              type: 'PAYMENT_COMPLETE',
              sessionId,
              licenseKey,
              subscription
            });
          } catch (e) {
            // Extension may be closed - store for next startup
            await chrome.storage.local.set({
              paymentSession: null,
              licenseKey,
              licenseStatus: 'active',
              subscription
            });
          }
          
          document.body.innerHTML = '<h1>Payment Successful!</h1><p>Your extension is now premium.</p>';
          setTimeout(() => window.close(), 3000);
        }
      } else {
        document.body.innerHTML = '<h1>Payment Failed</h1><p>Please try again.</p>';
      }
    }
    
    processReturn();
  </script>
</head>
<body>
  <p>Processing your payment...</p>
</body>
</html>
```

---

## Conclusion {#conclusion}

Manifest V3 fundamentally changed Chrome extension monetization, but these changes aren't insurmountable. The key lessons are:

1. **Move away from CWS payments**: Implement external payment processing through Stripe or similar providers.

2. **Design for service worker termination**: Your extension must handle the service worker being killed at any time. Use `chrome.storage` for all persistent state.

3. **Use alarms for periodic validation**: Schedule license checks using `chrome.alarms` rather than relying on persistent background pages.

4. **Leverage offscreen documents**: For longer-running operations like payment processing, offscreen documents provide the persistence you need.

5. **Handle the edge cases**: Users will close their browser mid-purchase. Design your system to resume gracefully when the browser restarts.

For more details on implementing these patterns, see our guides on [MV3 migration](/chrome-extension-guide/2025/01/16/manifest-v3-migration-complete-guide-2025/), [service worker patterns](/chrome-extension-guide/2025/01/30/manifest-v3-service-worker-patterns-anti-patterns/), [Stripe integration](/chrome-extension-guide/2025/01/18/chrome-extension-stripe-payment-integration/), and [monetization strategies](/chrome-extension-guide/2025/02/16/chrome-extension-monetization-strategies-that-work-2025/).

---

Built by theluckystrike at [zovo.one](https://zovo.one)
