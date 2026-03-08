---
layout: default
title: "Chrome Extension Extension Analytics Privacy — Best Practices"
description: "Track extension analytics while maintaining user privacy with privacy-conscious telemetry patterns."
---

# Privacy-First Analytics Patterns for Chrome Extensions

This guide covers how to implement analytics in Chrome extensions while respecting user privacy and complying with platform policies.

## Core Principles

### Anonymized Usage Tracking

Never collect personally identifiable information (PII). Use hashed identifiers that cannot be reversed to trace back to specific users:

```javascript
// Hash user ID with a salt to create anonymous identifier
async function getAnonymousId(storageKey) {
  const stored = await chrome.storage.local.get(storageKey);
  if (stored[storageKey]) return stored[storageKey];
  
  const randomId = crypto.randomUUID();
  const hash = await sha256(randomId + 'your-salt');
  await chrome.storage.local.set({ [storageKey]: hash });
  return hash;
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

### Event-Based Analytics

Track feature usage rather than user behavior. Focus on aggregate metrics:

- Feature usage counts
- Extension version distribution
- Error rates and types
- Browser/platform breakdown

```javascript
// Track events without user identification
function trackEvent(category, action, label = null) {
  const event = {
    category,      // e.g., 'feature', 'popup', 'error'
    action,        // e.g., 'button_click', 'open', 'failure'
    label,         // e.g., 'settings', 'export'
    timestamp: Date.now(),
    version: chrome.runtime.getManifest().version
  };
  // Send to analytics endpoint
  sendToAnalytics(event);
}
```

### Local-First Analytics

Aggregate data locally before sending to reduce privacy exposure:

```javascript
class LocalAggregator {
  constructor() {
    this.events = [];
    this.flushInterval = 24 * 60 * 60 * 1000; // Daily
  }

  async addEvent(event) {
    this.events.push(event);
    if (this.events.length >= 100) {
      await this.flush();
    }
  }

  async flush() {
    if (this.events.length === 0) return;
    
    const summary = this.aggregate(this.events);
    await this.sendSummary(summary);
    this.events = [];
  }

  aggregate(events) {
    // Count by category/action
    const counts = {};
    events.forEach(e => {
      const key = `${e.category}:${e.action}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return { counts, version: chrome.runtime.getManifest().version };
  }
}
```

## Consent Management

### Opt-In Consent

Always ask before collecting any data. Make opt-out easy:

```javascript
class ConsentManager {
  constructor() {
    this.STORAGE_KEY = 'analytics_consent';
  }

  async hasConsent() {
    const result = await chrome.storage.local.get(this.STORAGE_KEY);
    return result[this.STORAGE_KEY] === true;
  }

  async requestConsent() {
    // Show user-friendly prompt in popup or options page
    const banner = document.getElementById('consent-banner');
    banner.style.display = 'block';
  }

  async grantConsent() {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: true });
  }

  async revokeConsent() {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: false });
    // Optionally delete locally stored data
  }
}
```

### Session Tracking Without Cookies

Use `chrome.storage.session` for ephemeral session tracking:

```javascript
async function getSessionId() {
  const { sessionId } = await chrome.storage.session.get('sessionId');
  if (sessionId) return sessionId;
  
  const newId = crypto.randomUUID();
  await chrome.storage.session.set({ sessionId: newId });
  return newId;
}
```

## Self-Hosted Analytics Alternatives

Consider privacy-focused analytics platforms:

| Platform | Self-Hosted | Privacy Focus | GA Compatible |
|----------|-------------|---------------|----------------|
| Plausible | Yes | No cookies, no PII | Yes |
| Umami | Yes | Simple, GDPR compliant | Yes |
| Ackee | Yes | Node.js, GDPR ready | Limited |
| Fathom | Yes | Cookie-free | Yes |

### Using Measurement Protocol

Send events server-side without client-side scripts:

```javascript
// Server-side endpoint (your analytics server)
async function sendMeasurementProtocol events(events, clientId) {
  const payload = {
    client_id: clientId,
    events: events.map(e => ({
      name: e.category + '_' + e.action,
      params: { label: e.label }
    }))
  };
  
  await fetch('https://your-analytics.com/batch', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
```

## GDPR/CCPA Compliance

### Consent Banner

```html
<div id="privacy-consent" class="consent-banner">
  <p>We collect anonymized usage data to improve our extension. 
     <a href="/privacy">Privacy Policy</a></p>
  <button id="accept-analytics">Accept</button>
  <button id="decline-analytics">Decline</button>
</div>
```

### Data Deletion Endpoint

Provide users ability to request data deletion:

```javascript
// In your background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DELETE_USER_DATA') {
    // Remove user's stored data
    chrome.storage.local.clear();
    sendResponse({ success: true });
  }
});
```

## Chrome Web Store Compliance

### Accurate Privacy Disclosure

In your CWS listing, accurately describe data collection:

- **Data Collection**: If any data leaves the extension
- **Encryption**: How data is protected in transit
- **Third Parties**: Any analytics providers used

### Avoiding Rejection

Common CWS review failures related to analytics:

1. **Undisclosed data collection** - Always declare in CWS form
2. **No opt-out mechanism** - Users must be able to disable tracking
3. **PII collection** - Never collect emails, names, or identifiable data
4. **Overly broad permissions** - Don't use analytics as justification for excessive permissions

## Extension-Specific Metrics

Track metrics meaningful to extensions:

| Metric | Description |
|--------|-------------|
| Popup opens | How often users open the popup |
| Feature usage | Which features are most used |
| Settings changes | What configurations users prefer |
| Error rates | Types and frequency of errors |
| Version adoption | How quickly users upgrade |
| Installation source | How users found your extension |

## Cross-References

- [Publishing Guide](../publishing/analytics.md)
- [Analytics & Telemetry Patterns](./analytics-telemetry.md)
- [Chrome Extension Data Privacy Guide](../guides/chrome-extension-data-privacy.md)
