# geolocation Permission

## Overview

- **Permission string**: `"geolocation"` (optional permission in MV3)
- Enables `navigator.geolocation` in extension pages
- MV3 challenge: service workers cannot use Geolocation API directly

## Web API (not chrome.* API)

```javascript
navigator.geolocation.getCurrentPosition(success, error?, options?)
navigator.geolocation.watchPosition(success, error?, options?)
navigator.geolocation.clearWatch(watchId)
```

## Position Options

| Option | Type | Description |
|--------|------|-------------|
| `enableHighAccuracy` | boolean | Use GPS if available (slower, more battery) |
| `timeout` | number | Milliseconds to wait for position |
| `maximumAge` | number | Accept cached position if younger than this (ms) |

## Position Object

- `coords.latitude`, `coords.longitude`, `coords.accuracy`
- `coords.altitude`, `coords.altitudeAccuracy` (may be null)
- `coords.heading`, `coords.speed` (may be null)
- `timestamp`

## MV3: Service Worker Workaround

Service workers do not have access to `navigator.geolocation`. Use an offscreen document with `GEOLOCATION` reason:

1. SW creates offscreen doc with reason `GEOLOCATION`
2. Send message to offscreen doc requesting position
3. Offscreen doc calls `navigator.geolocation`
4. Offscreen doc sends result back to SW
5. SW closes offscreen doc (optional)

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
      (pos) => sendResponse({ position: pos }),
      (err) => sendResponse({ error: err.message }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return true;
  }
});
```

## Manifest Declaration

```json
{
  "permissions": ["offscreen"],
  "optional_permissions": ["geolocation"]
}
```

Or declare geolocation as required:

```json
{
  "permissions": ["geolocation", "offscreen"]
}
```

## Use Cases

- Local weather widget
- Nearby store/restaurant finder
- Location-based notifications
- Travel distance calculator
- Geo-fencing alerts

## Code Examples

### Get position from popup (direct)

```typescript
navigator.geolocation.getCurrentPosition(
  (pos) => console.log(pos.coords.latitude, pos.coords.longitude),
  (err) => console.error(err.message),
  { enableHighAccuracy: true, timeout: 10000 }
);
```

### Watch position with error handling

```typescript
const watchId = navigator.geolocation.watchPosition(
  (pos) => console.log('Updated:', pos.coords.latitude, pos.coords.longitude),
  (err) => {
    if (err.code === err.PERMISSION_DENIED) console.error('Denied');
    else if (err.code === err.POSITION_UNAVAILABLE) console.error('Unavailable');
    else if (err.code === err.TIMEOUT) console.error('Timeout');
  },
  { enableHighAccuracy: true, maximumAge: 60000 }
);
navigator.geolocation.clearWatch(watchId);
```

### Get position from service worker via offscreen

```typescript
// background.ts
async function getLocation() {
  if (!(await chrome.offscreen.hasDocument())) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [chrome.offscreen.Reason.GEOLOCATION],
      justification: 'Geolocation needs document context'
    });
  }
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'GET_LOCATION' }, (resp) => {
      resp.error ? reject(new Error(resp.error)) : resolve(resp.position);
    });
  });
}
```

## Cross-References

- [permissions/offscreen.md](./offscreen.md)
- [mv3/offscreen-documents.md](../mv3/offscreen-documents.md)
- [patterns/offscreen-documents.md](../patterns/offscreen-documents.md)
