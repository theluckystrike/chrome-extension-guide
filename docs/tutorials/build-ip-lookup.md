---
layout: default
title: "Chrome Extension IP Lookup — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-ip-lookup/"
---
# Build an IP Lookup Extension

## What You'll Build {#what-youll-build}
- Display your public IP address in popup
- Lookup any IP or domain for geolocation info
- Country, city, region, ISP, timezone details
- Simple map showing IP location
- Copy IP to clipboard button
- Background IP change detection with notifications
- History log with timestamps
- Caching to minimize API calls
- Badge showing country code

## Prerequisites {#prerequisites}
- ip-api.com account (free, 45 requests/minute)
- Chrome 88+ or Edge 88+

---

## Step 1: Manifest Configuration {#step-1-manifest-configuration}

Create `manifest.json` with storage permission and host permissions:

```json
{
  "manifest_version": 3,
  "name": "IP Lookup",
  "version": "1.0",
  "permissions": ["alarms", "storage", "notifications"],
  "host_permissions": ["http://ip-api.com/*", "https://ip-api.com/*"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" }
}
```

Required permissions: `storage` for caching, `alarms` for periodic IP checks, `notifications` for change alerts.

---

## Step 2: Show Your Public IP {#step-2-show-your-public-ip}

Create `popup.html` and `popup.js`. Fetch your public IP on load:

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const cached = await chrome.storage.local.get('ipCache');
  if (cached.ipCache) displayIP(cached.ipCache);
  
  await fetchPublicIP();
});

async function fetchPublicIP() {
  try {
    const response = await fetch('http://ip-api.com/json/?fields=status,country,countryCode,region,regionName,city,isp,org,as,lat,lon,timezone,query');
    const data = await response.json();
    
    await chrome.storage.local.set({ 
      ipCache: { data, timestamp: Date.now() } 
    });
    
    displayIP(data);
    await updateBadge(data.countryCode);
  } catch (e) { showError(e.message); }
}
```

---

## Step 3: Display IP Details {#step-3-display-ip-details}

Show geolocation information in the popup:

```javascript
function displayIP(data) {
  document.getElementById('ip').textContent = data.query;
  document.getElementById('country').textContent = data.country;
  document.getElementById('city').textContent = data.city;
  document.getElementById('region').textContent = data.regionName;
  document.getElementById('isp').textContent = data.isp;
  document.getElementById('timezone').textContent = data.timezone;
}
```

See also: [patterns/cross-origin-requests.md](../patterns/cross-origin-requests.md)

---

## Step 4: Lookup Any IP or Domain {#step-4-lookup-any-ip-or-domain}

Add an input field for custom lookups:

```javascript
document.getElementById('lookupBtn').addEventListener('click', async () => {
  const input = document.getElementById('lookupInput').value;
  if (!input) return;
  
  const response = await fetch(`http://ip-api.com/json/${input}?fields=status,country,countryCode,region,regionName,city,isp,org,as,lat,lon,timezone,query`);
  const data = await response.json();
  
  if (data.status === 'fail') { showError('Invalid IP or domain'); return; }
  displayIP(data);
});
```

---

## Step 5: Map Integration {#step-5-map-integration}

Add a static map image showing location:

```javascript
function updateMap(lat, lon) {
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lon}&zoom=10&size=300x150&markers=${lat},${lon}`;
  document.getElementById('map').src = mapUrl;
}
```

---

## Step 6: Copy to Clipboard {#step-6-copy-to-clipboard}

Add copy functionality. See [patterns/clipboard-patterns.md](../patterns/clipboard-patterns.md):

```javascript
document.getElementById('copyBtn').addEventListener('click', async () => {
  const ip = document.getElementById('ip').textContent;
  await navigator.clipboard.writeText(ip);
  showToast('Copied!');
});
```

---

## Step 7: Background IP Change Detection {#step-7-background-ip-change-detection}

Use alarms to check periodically. See [api-reference/alarms-api.md](../api-reference/alarms-api.md):

```javascript
chrome.alarms.create('ipCheck', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'ipCheck') {
    const response = await fetch('http://ip-api.com/json/?fields=query');
    const data = await response.json();
    const cached = (await chrome.storage.local.get('ipCache')).ipCache;
    
    if (cached && cached.data.query !== data.query) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'IP Changed',
        message: `New IP: ${data.query}`
      });
      await chrome.storage.local.set({ ipCache: { data: { query: data.query }, timestamp: Date.now() } });
    }
  }
});
```

---

## Step 8: History Log {#step-8-history-log}

Store IP history with timestamps:

```javascript
async function addToHistory(ip) {
  const history = (await chrome.storage.local.get('ipHistory')).ipHistory || [];
  history.unshift({ ip, timestamp: Date.now() });
  await chrome.storage.local.set({ ipHistory: history.slice(0, 50) });
}
```

---

## Error Handling {#error-handling}

Handle rate limits and offline scenarios:

```javascript
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url);
    if (response.status === 429) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    else return response;
  }
  throw new Error('Rate limited');
}
```

---

## Privacy Note {#privacy-note}

This extension only looks up your own IP by default. Custom lookups require user action. No data is sent to third parties beyond the ip-api.com service.

---

## Summary {#summary}

You've built a complete IP lookup extension with:
- Public IP display and caching
- Custom IP/domain lookup
- Geolocation details and map
- Clipboard integration
- Background change detection
- History tracking

For more patterns, see [patterns/cross-origin-requests.md](../patterns/cross-origin-requests.md), [api-reference/alarms-api.md](../api-reference/alarms-api.md), and [patterns/clipboard-patterns.md](../patterns/clipboard-patterns.md).
