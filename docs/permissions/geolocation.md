# geolocation Permission

## What It Grants
Allows the extension to use the Geolocation API (`navigator.geolocation`) without prompting the user each time.

## Manifest
```json
{
  "permissions": ["geolocation"]
}
```

## User Warning
"Detect your physical location" — this permission triggers a warning.

## How It Works
- In MV2: background page could use `navigator.geolocation` directly
- In MV3: service workers do NOT have `navigator.geolocation` — must use offscreen document or content script

## MV3 Pattern (Offscreen Document)
```typescript
// background.ts (service worker)
async function getLocation(): Promise<GeolocationPosition> {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: [chrome.offscreen.Reason.GEOLOCATION],
      justification: 'Access geolocation API'
    });
  }
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'GET_LOCATION' }, (response) => {
      if (response.error) reject(new Error(response.error));
      else resolve(response.position);
    });
  });
}
```

```typescript
// offscreen.ts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_LOCATION') {
    navigator.geolocation.getCurrentPosition(
      (pos) => sendResponse({
        position: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
      }),
      (err) => sendResponse({ error: err.message }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return true; // async response
  }
});
```

## Content Script Pattern
```typescript
// Content scripts can use navigator.geolocation directly
// (inherits the extension's geolocation permission)
navigator.geolocation.getCurrentPosition(
  (pos) => {
    chrome.runtime.sendMessage({
      type: 'LOCATION_UPDATE',
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    });
  },
  (err) => console.error('Geolocation error:', err)
);
```

## Position Options
```typescript
const options: PositionOptions = {
  enableHighAccuracy: true,  // GPS if available (slower, more battery)
  timeout: 10000,            // Max wait time in ms
  maximumAge: 300000         // Accept cached position up to 5 min old
};
```

## Watch Position
```typescript
// In popup or side panel (not service worker!)
const watchId = navigator.geolocation.watchPosition(
  (pos) => updateMap(pos.coords.latitude, pos.coords.longitude),
  (err) => showError(err.message),
  { enableHighAccuracy: true }
);

// Stop watching
navigator.geolocation.clearWatch(watchId);
```

## Storage Integration
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  lastLat: 'number',
  lastLng: 'number',
  lastLocationTime: 'number'
});
const storage = createStorage(schema, 'local');

async function saveLocation(lat: number, lng: number) {
  await storage.set('lastLat', lat);
  await storage.set('lastLng', lng);
  await storage.set('lastLocationTime', Date.now());
}
```

## Use Cases
- Weather extensions
- Local business/restaurant finders
- Location-based reminders
- Travel/map extensions
- Geo-tagging tools

## When NOT to Use
- If approximate location is fine — use IP-based geolocation (no permission needed)
- If you only need it once — consider prompting via content script
- High battery impact with `enableHighAccuracy` + `watchPosition`

## Privacy Considerations
- Location data is sensitive — store minimally, never transmit without consent
- Provide clear UI showing when location is being accessed
- Allow users to disable location features

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('geolocation');
```

## Cross-References
- Related: `docs/permissions/offscreen.md`
- Guide: `docs/mv3/offscreen-documents.md`
