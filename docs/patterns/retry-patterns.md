---
layout: default
title: "Chrome Extension Retry Patterns. Best Practices"
description: "Implement retry and backoff strategies for network requests."
canonical_url: "https://bestchromeextensions.com/patterns/retry-patterns/"
---

# Retry Patterns

Overview {#overview}

Retry patterns are essential for handling transient failures in network requests and API calls. Chrome extensions often depend on external services, making reliable retry logic critical for a good user experience. The goal is to balance reliability with responsiveness, retrying failed operations enough to succeed, but not so much that users wait unnecessarily or overwhelm struggling services.

Simple Retry {#simple-retry}

The most basic approach is to retry a failed operation N times with a fixed delay between attempts:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3, delay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

Simple retries work best for idempotent operations, requests that produce the same result regardless of how many times they're executed. Limit retries to 3-5 maximum to avoid frustrating users with long waits.

Exponential Backoff {#exponential-backoff}

Exponential backoff dramatically improves reliability by doubling the delay after each failed attempt:

```javascript
function calculateBackoff(attempt, baseDelay = 1000, maxDelay = 60000) {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay; // Prevent thundering herd
  return Math.min(exponentialDelay + jitter, maxDelay);
}

async function fetchWithBackoff(url, options, maxRetries = 5) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, calculateBackoff(attempt)));
    }
  }
}
```

This pattern produces delays like 1s, 2s, 4s, 8s, 16s, giving services time to recover. The jitter (random component) prevents all your users from retrying at exactly the same moment if there's a widespread outage.

Retry with Circuit Breaker {#retry-with-circuit-breaker}

Circuit breakers prevent your extension from hammering a broken service:

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'closed'; // closed, open, half-open
    this.nextAttempt = 0;
  }

  async execute(fn) {
    if (this.state === 'open' && Date.now() < this.nextAttempt) {
      throw new Error('Circuit breaker open');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

States:
- Closed: Normal operation, requests go through
- Open: Too many failures, reject requests immediately
- Half-Open: After timeout, allow one test request

SW-Aware Retry {#sw-aware-retry}

Service workers in extensions can be terminated between retries. Persist retry state:

```javascript
// Store retry state in chrome.storage.session
async function saveRetryState(key, state) {
  await chrome.storage.session.set({ [`retry_${key}`]: state });
}

async function getRetryState(key) {
  const result = await chrome.storage.session.get(`retry_${key}`);
  return result[`retry_${key}`];
}

// Use chrome.alarms for delayed retries that survive SW termination
async function scheduleRetry(attempt, delayMs) {
  await chrome.alarms.create(`retry_${attempt}`, { delayInMinutes: delayMs / 60000 });
}

// Handle alarm in service worker
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('retry_')) {
    const attempt = parseInt(alarm.name.split('_')[1]);
    // Resume retry logic
  }
});
```

This ensures retries continue even if the service worker is unloaded between attempts.

What to Retry {#what-to-retry}

Retry these conditions:
- Network errors: connection failed, DNS errors, timeouts
- HTTP 429 (Too Many Requests): respect `Retry-After` header
- HTTP 500, 502, 503, 504: server-side errors that may be transient
- Connection resets or SSL certificate errors

```javascript
function shouldRetry(error, response) {
  if (error) return true; // Network error
  if (!response) return false;
  
  const status = response.status;
  return status === 429 || status >= 500;
}

function getRetryAfter(response) {
  const retryAfter = response.headers.get('Retry-After');
  return retryAfter ? parseInt(retryAfter) * 1000 : null;
}
```

What NOT to Retry {#what-not-to-retry}

Never retry these operations:
- HTTP 400 (Bad Request): Your request is malformed
- HTTP 401 (Unauthorized): User needs to authenticate
- HTTP 403 (Forbidden): Access denied, won't change
- HTTP 404 (Not Found): Resource doesn't exist
- Non-idempotent operations (e.g., POST that creates data)
- User-initiated actions that need immediate feedback

Related Patterns {#related-patterns}

See also:
- [Rate Limiting](./rate-limiting.md) - Preventing throttling
- [Error Handling](./error-handling.md) - Graceful failure UX
- [Performance Guide](../guides/performance.md) - Optimizing network requests
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
