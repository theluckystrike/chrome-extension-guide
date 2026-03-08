---
layout: default
title: "Chrome Extension Weather Widget — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-weather-widget/"
---
# Build a Weather Widget Extension

## What You'll Build {#what-youll-build}
- Current weather display in popup
- Temperature badge on extension icon
- Location-based or manual city selection
- Periodic background updates (every 30 minutes)
- Offline mode with cached data
- Options page for customization

## Prerequisites {#prerequisites}
- OpenWeatherMap API key (free tier at openweathermap.org)
- Chrome 88+ or Edge 88+

---

## Step 1: Manifest Configuration {#step-1-manifest-configuration}

Create `manifest.json` with required permissions:

```json
{
  "manifest_version": 3,
  "name": "Weather Widget",
  "version": "1.0",
  "permissions": ["alarms", "storage"],
  "host_permissions": ["https://api.openweathermap.org/*"],
  "action": { "default_popup": "popup.html" },
  "options_page": "options.html",
  "background": { "service_worker": "background.js" }
}
```

Required permissions: `alarms` for periodic updates, `storage` for caching. Geolocation is available to extension popups via the standard `navigator.geolocation` API without a special permission.

---

## Step 2: Popup UI {#step-2-popup-ui}

Create `popup.html` and `popup.js`:

```html
<div id="weather">
  <img id="icon" src="" alt="weather icon">
  <div id="temp">--°</div>
  <div id="conditions">Loading...</div>
  <div id="location"></div>
</div>
<button id="refresh">Refresh</button>
```

```javascript
document.addEventListener('DOMContentLoaded', loadWeather);
document.getElementById('refresh').addEventListener('click', loadWeather);

async function loadWeather() {
  const { city, apiKey, units } = await chrome.storage.sync.get(['city', 'apiKey', 'units']);
  if (!apiKey) { showError('API key missing'); return; }
  
  const cached = await chrome.storage.local.get('weatherCache');
  if (cached.weatherCache?.data) displayWeather(cached.weatherCache.data);
  
  try {
    const url = city 
      ? `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${units||'metric'}`
      : await getGeolocationWeather(apiKey, units);
    const response = await fetch(url);
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    await chrome.storage.local.set({ 
      weatherCache: { data, timestamp: Date.now() } 
    });
    displayWeather(data);
    updateBadge(data);
  } catch (e) {
    if (!navigator.onLine) showError('Offline');
    else showError(e.message);
  }
}
```

---

## Step 3: Weather API Integration {#step-3-weather-api-integration}

Use OpenWeatherMap free tier. Endpoint: `https://api.openweathermap.org/data/2.5/weather`

Response includes: `main.temp`, `main.feels_like`, `weather[0].description`, `weather[0].icon`, `name`.

---

## Step 4: Background Polling {#step-4-background-polling}

In `background.js`, set up periodic updates:

```javascript
chrome.alarms.create('weatherUpdate', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'weatherUpdate') {
    await fetchAndCacheWeather();
  }
});

async function fetchAndCacheWeather() {
  const { city, apiKey, units } = await chrome.storage.sync.get(['city', 'apiKey', 'units']);
  if (!apiKey || !city) return;
  
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${units||'metric'}`;
  const response = await fetch(url);
  const data = await response.json();
  await chrome.storage.local.set({ weatherCache: { data, timestamp: Date.now() } });
  chrome.runtime.sendMessage({ type: 'weatherUpdated', data });
}
```

See [Alarms API](../api-reference/alarms-api.md) for more details.

---

## Step 5: Geolocation {#step-5-geolocation}

Get user's location in popup:

```javascript
function getGeolocationWeather(apiKey, units) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        resolve(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=${units||'metric'}`);
      },
      (err) => reject(new Error('Location denied'))
    );
  });
}
```

Handle permission denied error gracefully.

---

## Step 6: Options Page {#step-6-options-page}

Create `options.html` for user settings:

```html
<input type="text" id="city" placeholder="Enter city name">
<select id="units">
  <option value="metric">Celsius</option>
  <option value="imperial">Fahrenheit</option>
</select>
<input type="text" id="apiKey" placeholder="OpenWeatherMap API Key">
<button id="save">Save</button>
```

```javascript
document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.sync.set({
    city: document.getElementById('city').value,
    units: document.getElementById('units').value,
    apiKey: document.getElementById('apiKey').value
  });
});
```

See [Options Page](../guides/options-page.md) for full guide.

---

## Step 7: Badge Temperature {#step-7-badge-temperature}

Display temperature on extension icon:

```javascript
function updateBadge(data) {
  const temp = Math.round(data.main.temp);
  chrome.action.setBadgeText({ text: `${temp}°` });
  chrome.action.setBadgeBackgroundColor({ color: '#4A90D9' });
}
```

See [Badge Action UI](../patterns/badge-action-ui.md) for styling options.

---

## Step 8: Caching & Offline Mode {#step-8-caching-offline-mode}

Cache API responses to reduce calls and enable offline use:

```javascript
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getCachedOrFetch(url) {
  const cached = await chrome.storage.local.get('weatherCache');
  if (cached.weatherCache && 
      Date.now() - cached.weatherCache.timestamp < CACHE_DURATION) {
    return cached.weatherCache.data;
  }
  const response = await fetch(url);
  const data = await response.json();
  await chrome.storage.local.set({ weatherCache: { data, timestamp: Date.now() } });
  return data;
}
```

---

## Error Handling Summary {#error-handling-summary}

| Error | Message | Solution |
|-------|---------|----------|
| API key missing | "API key missing" | Add key in options |
| Network offline | "Offline" | Show cached data |
| Location denied | "Location denied" | Use manual city |
| API error | "API error" | Check city name |

---

## Next Steps {#next-steps}
- Add 5-day forecast
- Support multiple locations
- Add weather notifications
- Implement severe weather alerts
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
