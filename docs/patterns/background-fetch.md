---
layout: default
title: "Chrome Extension Background Fetch — Best Practices"
description: "Use Background Fetch API for large file downloads in extensions."
canonical_url: "https://bestchromeextensions.com/patterns/background-fetch/"
---

# Background Fetch Patterns

## Overview {#overview}

Background data fetching enables extensions to retrieve and update data periodically without requiring user interaction. This is essential for extensions that display live data such as weather updates, stock prices, notifications, or any content that changes over time. However, Chrome's Manifest V3 service worker lifecycle introduces significant complexity—the service worker can terminate after just 30 seconds of inactivity, making traditional polling approaches unreliable.

This guide covers patterns for implementing robust background fetching in MV3 extensions, working within the constraints of the service worker lifecycle while maintaining data freshness and minimizing resource usage.

## Alarm-Based Polling {#alarm-based-polling}

The most reliable approach for periodic background fetching in MV3 is using `chrome.alarms`. Unlike `setInterval`, alarms are designed to survive service worker termination and will wake the worker when triggered. The minimum allowed interval is 30 seconds, which is sufficient for most use cases.

```javascript
// Register in onInstalled listener
chrome.alarms.create('fetch-data', { periodInMinutes: 5 });

// Handle in top-level listener (not inside another async function)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'fetch-data') {
    try {
      const data = await fetchLatestData();
      await chrome.storage.local.set({ cachedData: data, lastFetch: Date.now() });
      updateBadge(data);
    } catch (error) {
      console.error('Background fetch failed:', error);
    }
  }
});

async function fetchLatestData() {
  const response = await fetch('https://api.example.com/latest');
  return response.json();
}

function updateBadge(data) {
  const count = data.notifications?.length || 0;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
}
```

Register alarms in the `onInstalled` event to ensure they're recreated when the extension updates or Chrome restarts. Always check the alarm name in the listener to support multiple data sources.

## Fetch with Timeout {#fetch-with-timeout}

Service workers have limited execution time and will be terminated when idle. Always wrap fetch calls with a timeout to ensure the worker doesn't get killed mid-operation:

```javascript
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Use in your alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'fetch-data') {
    const data = await fetchWithTimeout('https://api.example.com/data')
      .then(r => r.json())
      .catch(err => {
        if (err.name === 'AbortError') {
          console.warn('Fetch timed out');
        }
        return null;
      });
    
    if (data) {
      await chrome.storage.local.set({ cachedData: data });
    }
  }
});
```

Keep timeouts short—target under 5 seconds for each request. If multiple requests are needed, execute them sequentially and consider whether all are required before the worker suspends.

## Conditional Fetching {#conditional-fetching}

Avoid re-fetching unchanged data using HTTP caching headers. Check for ETag or Last-Modified headers in previous responses and use them in subsequent requests:

```javascript
async function fetchWithETag(url, storageKey) {
  const { etag, lastModified } = await chrome.storage.local.get([`${storageKey}:etag`, `${storageKey}:lastModified`]);
  
  const headers = new Headers();
  if (etag) headers.append('If-None-Match', etag);
  if (lastModified) headers.append('If-Modified-Since', lastModified);
  
  const response = await fetch(url, { headers });
  
  if (response.status === 304) {
    // Data unchanged, return cached
    const cached = await chrome.storage.local.get(storageKey);
    return cached[storageKey];
  }
  
  // Store new caching headers and data
  const newEtag = response.headers.get('ETag');
  const newLastModified = response.headers.get('Last-Modified');
  const data = await response.json();
  
  await chrome.storage.local.set({
    [storageKey]: data,
    [`${storageKey}:etag`]: newEtag,
    [`${storageKey}:lastModified`]: newLastModified,
  });
  
  return data;
}
```

Additionally, implement a TTL check before fetching to skip unnecessary network calls entirely when data is still fresh:

```javascript
async function shouldFetch(storageKey, minIntervalMs = 60000) {
  const { lastFetch } = await chrome.storage.local.get('lastFetch');
  return !lastFetch || (Date.now() - lastFetch) > minIntervalMs;
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'fetch-data' && await shouldFetch('cachedData')) {
    const data = await fetchLatestData();
    await chrome.storage.local.set({ cachedData: data, lastFetch: Date.now() });
  }
});
```

## Error Handling with Adaptive Polling {#error-handling-with-adaptive-polling}

Track consecutive failures and adjust polling frequency accordingly. After repeated failures, reduce fetch frequency to avoid wasting resources:

```javascript
const FAILURE_THRESHOLD = 3;
const RECOVERY_INTERVAL = 15; // minutes
const DEGRADED_INTERVAL = 30; // minutes

async function handleFetchError(error) {
  const state = await chrome.storage.local.get(['consecutiveFailures', 'currentInterval']);
  const failures = (state.consecutiveFailures || 0) + 1;
  
  const newInterval = failures >= FAILURE_THRESHOLD ? DEGRADED_INTERVAL : RECOVERY_INTERVAL;
  
  await chrome.storage.local.set({
    consecutiveFailures: failures,
    currentInterval: newInterval,
  });
  
  // Reschedule with new interval
  chrome.alarms.create('fetch-data', { periodInMinutes: newInterval });
}

async function handleFetchSuccess() {
  await chrome.storage.local.set({
    consecutiveFailures: 0,
    currentInterval: RECOVERY_INTERVAL,
  });
  
  chrome.alarms.create('fetch-data', { periodInMinutes: RECOVERY_INTERVAL });
}
```

When a fetch succeeds, reset the failure counter and restore the normal polling interval. This adaptive approach balances data freshness with server and network reliability.

## Push-Based Alternative {#push-based-alternative}

For real-time updates, consider server-pushed notifications instead of polling. Chrome supports Firebase Cloud Messaging (FCM) for push notifications to extensions:

```javascript
// In manifest.json, add:
{
  "permissions": ["gcm"]
}

// Listen for push messages
chrome.gcm.onMessage.addListener((message) => {
  if (message.data.type === 'update') {
    // Update cached data from message payload
    chrome.storage.local.set({ cachedData: message.data.payload });
    updateBadge(message.data.payload);
  }
});
```

Push notifications eliminate unnecessary polling and provide near-instant updates. However, they require server-side infrastructure to send messages and add complexity compared to simple polling.

## Multiple Data Sources {#multiple-data-sources}

When fetching from multiple APIs, use separate alarms with different intervals based on data importance:

```javascript
chrome.alarms.create('fetch-news', { periodInMinutes: 30 });
chrome.alarms.create('fetch-prices', { periodInMinutes: 5 });
chrome.alarms.create('fetch-weather', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case 'fetch-news':
      await fetchAndCacheNews();
      break;
    case 'fetch-prices':
      await fetchAndCachePrices();
      break;
    case 'fetch-weather':
      await fetchAndCacheWeather();
      break;
  }
});

async function fetchAndCachePrices() {
  const prices = await fetchWithTimeout('https://api.stocks.com/prices')
    .then(r => r.json())
    .catch(() => null);
  
  if (prices) {
    await chrome.storage.local.set({ cachedPrices: prices });
  }
}
```

Separate alarms allow independent control of polling frequency. Critical data like prices can update every few minutes while less time-sensitive content like news updates every 30 minutes or longer.

## Best Practices Summary {#best-practices-summary}

- Always use `chrome.alarms` for periodic fetching in MV3—never use `setInterval` directly
- Implement timeouts on all fetch operations to prevent worker termination mid-request
- Use ETag/Last-Modified headers to avoid re-downloading unchanged data
- Track failures and adapt polling frequency accordingly
- Separate alarms for different data sources with appropriate intervals
- Cache fetched data in `chrome.storage.local` so popup and content scripts can access it without triggering their own fetches
- Consider push notifications for time-critical updates instead of aggressive polling

## See Also {#see-also}

- [Alarms API](/permissions/alarms.md)
- [Service Worker Lifecycle](/guides/service-worker-lifecycle.md)
- [Rate Limiting](/patterns/rate-limiting.md)
- [Retry Patterns](/patterns/retry-patterns.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
