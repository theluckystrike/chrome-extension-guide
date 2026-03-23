# GCM & Push Notifications in Chrome Extensions

## Overview

Chrome extensions can receive push notifications from a backend server using either the legacy GCM (Google Cloud Messaging) API or the modern Web Push API. This guide covers both approaches with practical code examples.

## Prerequisites

- A Chrome Extension with appropriate permissions
- A server-side component to send notifications
- A Firebase project (for GCM) or VAPID key pair (for Web Push)
- HTTPS endpoint for your extension's background service worker

## manifest.json Configuration

### For GCM (Legacy)

```json
{
  "name": "My Push Extension",
  "version": "1.0",
  "permissions": ["gcm", "notifications"],
  "background": { "service_worker": "background.js" }
}
```

### For Web Push (Modern)

```json
{
  "name": "My Push Extension",
  "version": "1.0",
  "permissions": ["notifications", "push"],
  "background": { "service_worker": "background.js" },
  "manifest_version": 3
}
```

## Chrome.gcm API Overview

The `chrome.gcm` API provides methods for sending and receiving messages through Firebase Cloud Messaging (FCM).

### Key Methods

- `chrome.gcm.register(senderIds, callback)` - Register to receive messages
- `chrome.gcm.unregister(callback)` - Unregister from receiving messages
- `chrome.gcm.send(message, callback)` - Send upstream messages to the server
- `chrome.gcm.onMessage.addListener(callback)` - Listen for incoming messages

## Registering with register() and Sender IDs

### Getting Your Sender ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project and find your Project Number (Sender ID)
3. Enable "Firebase Cloud Messaging" API
4. Get your Server Key from Firebase Console

### Registration Implementation

```javascript
// background.js
const SENDER_ID = 'your-firebase-sender-id';

chrome.gcm.register([SENDER_ID], (registrationId) => {
  if (chrome.runtime.lastError) {
    console.error('Registration failed:', chrome.runtime.lastError.message);
    return;
  }
  
  console.log('Registration ID:', registrationId);
  sendRegistrationIdToServer(registrationId);
});

function sendRegistrationIdToServer(registrationId) {
  fetch('https://your-server.com/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      registrationId: registrationId,
      extensionId: chrome.runtime.id
    })
  });
}
```

### Handling Registration Errors

```javascript
chrome.gcm.register([SENDER_ID], (registrationId) => {
  if (chrome.runtime.lastError) {
    const error = chrome.runtime.lastError.message;
    if (error.includes('Service unavailable')) {
      console.error('GCM service unavailable. Check network.');
    } else if (error.includes('Authentication failed')) {
      console.error('API key invalid. Check Firebase config.');
    }
    return;
  }
  handleRegistrationSuccess(registrationId);
});
```

## Receiving Messages with onMessage

```javascript
// background.js
chrome.gcm.onMessage.addListener((message) => {
  console.log('Received message:', message);
  
  // Message format from server:
  // { "data": { "title": "New Notification", "body": "Message" } }
  
  if (message.data) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: message.data.icon || '/images/icon.png',
      title: message.data.title || 'Notification',
      message: message.data.body || '',
      priority: message.data.priority || 0
    });
  }
  return true;
});
```

### Handling Different Message Types

```javascript
chrome.gcm.onMessage.addListener((message) => {
  const data = message.data;
  
  switch (data.type) {
    case 'new_message':
      handleNewMessage(data);
      break;
    case 'alert':
      handleAlert(data);
      break;
    default:
      handleGenericNotification(data);
  }
  return true;
});

function handleNewMessage(data) {
  chrome.notifications.create({
    title: data.title || 'New Message',
    message: `${data.sender}: ${data.preview}`
  });
}
```

## Sending Upstream Messages with send()

```javascript
// background.js
function sendUpstreamMessage(data) {
  const message = {
    destinationId: SENDER_ID,
    timeToLive: 86400,
    data: {
      type: 'heartbeat',
      status: 'online',
      extensionId: chrome.runtime.id,
      timestamp: Date.now().toString()
    }
  };
  
  chrome.gcm.send(message, (messageId) => {
    if (chrome.runtime.lastError) {
      console.error('Send error:', chrome.runtime.lastError.message);
      queueMessageForRetry(data); // Queue for later
      return;
    }
    console.log('Message sent:', messageId);
  });
}

function queueMessageForRetry(data) {
  chrome.storage.local.get(['pendingMessages'], (result) => {
    const pending = result.pendingMessages || [];
    pending.push({ ...data, queuedAt: Date.now() });
    chrome.storage.local.set({ pendingMessages: pending });
  });
}
```

### Unregistering from GCM

```javascript
chrome.gcm.unregister(() => {
  if (chrome.runtime.lastError) {
    console.error('Unregister failed:', chrome.runtime.lastError.message);
    return;
  }
  chrome.storage.local.remove(['gcmRegistrationId']);
});
```

## Migration to Web Push API with pushManager

### Generating VAPID Keys

```bash
npm install -g web-push
web-push generate-vapid-keys
```

### Converting VAPID Keys

```javascript
// utils/vapid.js
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
```

### Subscribing to Push

```javascript
// background.js
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

async function subscribeToPush() {
  const existing = await self.registration.pushManager.getSubscription();
  if (existing) return existing;
  
  const subscription = await self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  await fetch('https://your-server.com/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
  
  return subscription;
}
```

### Handling Push Events in Service Worker

```javascript
// sw.js
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    data = event.data.json();
  }
  
  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/images/icon.png',
    badge: data.badge || '/images/badge.png',
    tag: data.tag || '',
    data: data.data || {}
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});
```

## Combining with chrome.notifications for Display

```javascript
// background.js
async function showRichNotification(pushData) {
  const options = {
    type: 'list',
    iconUrl: 'icons/icon-128.png',
    title: pushData.title || 'New Update',
    message: pushData.body || 'You have a new message',
    priority: 1,
    buttons: [
      { title: 'View', iconUrl: 'icons/view.png' },
      { title: 'Dismiss', iconUrl: 'icons/close.png' }
    ],
    items: [
      { title: 'From:', message: pushData.sender || 'Unknown' },
      { title: 'Time:', message: new Date().toLocaleTimeString() }
    ]
  };
  
  return new Promise((resolve) => {
    chrome.notifications.create(`push-${Date.now()}`, options, resolve);
  });
}

chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
  if (buttonIndex === 0) {
    chrome.action.openPopup();
  } else {
    chrome.notifications.clear(id);
  }
});
```

## Server-Side Setup and Payload Encryption

### Node.js Server with web-push

```javascript
// server.js
const webpush = require('web-push');

const vapidKeys = {
  publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  privateKey: 'UUxI4O8-FbRouAf7-7OTt9GH4o-4VJ5a6Qw2NpQRsT0'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

async function sendPushNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('Push sent successfully');
  } catch (error) {
    if (error.statusCode === 410) {
      console.log('Subscription expired, removing...');
      await removeSubscription(subscription.endpoint);
    }
  }
}

// Example payload
const notificationPayload = {
  title: 'New Message',
  body: 'You have a new message',
  icon: '/images/icon.png',
  badge: '/images/badge.png',
  tag: 'message-123',
  data: { type: 'message', messageId: '12345', url: '/messages/12345' }
};
```

### GCM Server Integration (Legacy)

```javascript
// server.js - GCM
const https = require('https');
const GCM_API_KEY = 'YOUR_GCM_SERVER_API_KEY';

function sendGCMMessage(registrationIds, data) {
  const message = {
    registration_ids: registrationIds,
    data: data,
    notification: { title: data.title, body: data.body },
    priority: 'high',
    time_to_live: 3600
  };
  
  const options = {
    hostname: 'fcm.googleapis.com',
    path: '/fcm/send',
    method: 'POST',
    headers: {
      'Authorization': `key=${GCM_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(JSON.stringify(message));
    req.end();
  });
}
```

## Migration Checklist

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Update manifest.json - remove `gcm`, add `push` permission
3. Replace `chrome.gcm.register()` with `pushManager.subscribe()`
4. Replace `chrome.gcm.onMessage` with `push` event listener
5. Update server to use web-push library

```javascript
// OLD (GCM)
chrome.gcm.register([SENDER_ID], (id) => { /* ... */ });

// NEW (Web Push)
await self.registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: vapidPublicKey
});
```

## Best Practices

### Rate Limiting

```javascript
const RATE_LIMIT_MS = 60000;
let lastNotificationTime = 0;

function canShowNotification() {
  const now = Date.now();
  if (now - lastNotificationTime < RATE_LIMIT_MS) return false;
  lastNotificationTime = now;
  return true;
}
```

### Subscription Management

```javascript
async function refreshSubscription() {
  const subscription = await self.registration.pushManager.getSubscription();
  if (subscription && subscription.expirationTime) {
    const expiresSoon = Date.now() > subscription.expirationTime - 7 * 24 * 60 * 60 * 1000;
    if (expiresSoon) {
      await subscription.unsubscribe();
      return await subscribeToPush();
    }
  }
  return subscription;
}
```

## Common Issues

1. Messages not received - Check service worker, permissions, network
2. Permission denied - User blocked notifications; guide to enable
3. GCM registration fails - Verify Sender ID and Firebase config
4. Web Push subscription fails - Verify VAPID key format

## Related Documentation

- [Chrome Push Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/push-messaging)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications/web-push-protocol)
- [web-push Library](https://github.com/web-push-libs/web-push)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
