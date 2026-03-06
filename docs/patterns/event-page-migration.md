# Event Page to Service Worker Migration Patterns

This document outlines patterns for migrating Chrome extensions from Manifest V2 event pages to Manifest V3 service workers.

## Key Differences Between MV2 Event Pages and MV3 Service Workers

Manifest V3 service workers have significant differences from MV2 event pages:

- **No DOM access**: Service workers cannot access the DOM directly
- **No window object**: There is no global `window` object
- **No XMLHttpRequest**: Use `fetch` API instead
- **No persistent state**: Variables are not preserved between invocations
- **Ephemeral lifecycle**: Service workers terminate after idle and restart on events

## Global State Migration

MV2 event pages could store state in global variables. MV3 service workers lose all state when terminated.

### Before (MV2 Event Page)

```javascript
// event-page.js - MV2
let cachedData = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getData') {
    if (cachedData) {
      sendResponse({ data: cachedData });
    } else {
      fetchData().then(data => {
        cachedData = data;
        sendResponse({ data });
      });
      return true; // Keep message channel open
    }
  }
});
```

### After (MV3 Service Worker)

```javascript
// service-worker.js - MV3
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getData') {
    // Always read from chrome.storage
    chrome.storage.session.get(['cachedData']).then(result => {
      if (result.cachedData) {
        sendResponse({ data: result.cachedData });
      } else {
        fetchData().then(data => {
          chrome.storage.session.set({ cachedData: data });
          sendResponse({ data });
        });
      }
    });
    return true;
  }
});
```

Use `chrome.storage.session` for ephemeral data or `chrome.storage.local` for persistent data.

## DOM Operations: Offscreen Documents

For operations requiring DOM access (audio, canvas, clipboard), use offscreen documents.

### Audio Playback

```javascript
// service-worker.js
async function playAudio(audioUrl) {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['AUDIO_PLAYBACK'],
    justification: 'Playing audio notification'
  });
  
  // Send message to offscreen document to play audio
  const clients = await clients.matchAll();
  clients[0].postMessage({ action: 'playAudio', url: audioUrl });
}
```

### Canvas/Image Processing

```javascript
// service-worker.js
async function processImage(imageData) {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['CANVAS'],
    justification: 'Processing image data'
  });
  
  const clients = await clients.matchAll();
  clients[0].postMessage({ action: 'processImage', data: imageData });
}
```

## Replacing setTimeout/setInterval

Service workers cannot rely on `setTimeout` for delays over 30 seconds. Use `chrome.alarms` instead.

### Before (MV2)

```javascript
// event-page.js
setTimeout(() => {
  doSomething();
}, 60 * 60 * 1000); // 1 hour
```

### After (MV3)

```javascript
// service-worker.js
chrome.alarms.create('myAlarm', { delayInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'myAlarm') {
    doSomething();
  }
});
```

## XMLHttpRequest to Fetch Migration

Replace deprecated `XMLHttpRequest` with the `fetch` API.

### Before (MV2)

```javascript
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/data');
xhr.onload = () => console.log(xhr.responseText);
xhr.send();
```

### After (MV3)

```javascript
fetch('https://api.example.com/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));
```

## localStorage to chrome.storage

Replace `localStorage` with `chrome.storage`.

### Before (MV2)

```javascript
localStorage.setItem('key', 'value');
const value = localStorage.getItem('key');
```

### After (MV3)

```javascript
chrome.storage.local.set({ key: 'value' });
chrome.storage.local.get(['key']).then(result => {
  const value = result.key;
});
```

## WebSocket in Service Workers

WebSocket connections cannot persist in service workers. Use an offscreen document for persistent connections.

```javascript
// service-worker.js - delegate to offscreen
async function connectWebSocket(url) {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WEB_RTC'],
    justification: 'Maintaining WebSocket connection'
  });
  
  const clients = await clients.matchAll();
  clients[0].postMessage({ action: 'connectWebSocket', url });
}
```

## Common Migration Mistakes

1. **Assuming persistent state**: Never store data in global variables
2. **Using setTimeout for long delays**: Use chrome.alarms API
3. **Attempting DOM access**: Use offscreen documents or content scripts
4. **Using localStorage**: Always use chrome.storage APIs
5. **Not handling service worker lifecycle**: Plan for termination and restart

## Testing Migration

- Run both versions side-by-side to compare behavior
- Test edge cases: idle timeout, memory limits, event ordering
- Verify all chrome.storage operations work correctly
- Test offscreen document lifecycle management

## Related Documentation

- [Service Workers](mv3/service-workers.md)
- [Manifest V3 Migration Guide](mv3/manifest-v3-migration-guide.md)
- [Offscreen Documents](mv3/offscreen-documents.md)
