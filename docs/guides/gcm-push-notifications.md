---
layout: default
title: "Chrome Extension Push Notifications — Developer Guide"
description: "Learn Chrome extension push notifications with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/gcm-push-notifications/"
---
# GCM & Push Notifications in Chrome Extensions
# GCM and Push Notifications in Chrome Extensions

## Introduction {#introduction}

Chrome extensions can receive push notifications from a backend server using either the legacy GCM (Google Cloud Messaging) API or the modern Web Push API. This guide covers both approaches, with emphasis on the recommended Web Push migration path.

The `chrome.gcm` API has been the traditional way to handle cloud messaging in Chrome extensions. However, Google has been encouraging developers to migrate to the Web Push standard, which is more widely supported across browsers.

This guide will walk you through setting up both approaches, handling message reception, and building a complete push notification system for your extension.

## Understanding the Architecture {#understanding-the-architecture}
## Prerequisites

Before implementing push notifications, you need:

- A Chrome Extension with the `gcm` permission or pushManager support
- A server-side component to send notifications
- A Firebase project (for GCM) or a VAPID key pair (for Web Push)
- HTTPS endpoint for your extension's background service worker

## manifest.json Configuration

## manifest.json Setup {#manifestjson-setup}

Both GCM and Web Push require specific permissions and configuration:
### For GCM (Legacy)

```json
{
  "name": "My Push Extension",
  "version": "1.0",
  "permissions": [
    "gcm",
    "notifications"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

### For Web Push (Modern)

```json
{
  "name": "My Push Extension",
  "version": "1.0",
  "permissions": [
    "notifications",
    "push"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "manifest_version": 3
}
```

## Using chrome.gcm (Legacy GCM API) {#using-chromegcm-legacy-gcm-api}

### Overview {#overview}
Note that Web Push does not require the `gcm` permission in manifest.json. The push permission is requested at runtime.

## Setting Up GCM (Legacy Approach)

### Creating a Firebase Project

### Getting a Sender ID {#getting-a-sender-id}

Before using GCM, you need a project in the Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Firebase Cloud Messaging" API
4. Get your **Sender ID** (project number) and **Server API Key**
1. Go to the Firebase Console (console.firebase.google.com)
2. Create a new project or select an existing one
3. Navigate to Project Settings
4. Under "Your apps", click the Web icon (</>)
5. Register your app and copy the `firebaseConfig` object
6. Go to "Cloud Messaging" settings
7. Enable "Cloud Messaging API (Legacy)" if not already enabled
8. Copy your Server Key

### Registering with GCM {#registering-with-gcm}

```javascript
// background.js
const SENDER_ID = 'your-firebase-sender-id';
const FIREBASE_CONFIG = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};

// Register with GCM to get a push token
chrome.gcm.register([SENDER_ID], (registrationId) => {
  if (chrome.runtime.lastError) {
    console.error('Registration failed:', chrome.runtime.lastError);
    return;
  }
  
  console.log('Registration ID:', registrationId);
  
  // Send this ID to your server
  sendRegistrationIdToServer(registrationId);
});

function sendRegistrationIdToServer(id) {
  fetch('https://your-server.com/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      registrationId: id,
      extensionId: chrome.runtime.id
    })
  });
}
```

### Receiving Messages {#receiving-messages}
### Handling Incoming GCM Messages

```javascript
chrome.gcm.onMessage.addListener((message) => {
  console.log('Received message:', message);
  
  // Message format from server:
  // {
  //   "data": {
  //     "title": "New Notification",
  //     "body": "You have a new message",
  //     "icon": "/images/icon.png"
  //   },
  //   "collapseKey": "optional-collapse-key"
  // }
  
  if (message.data) {
    showNotification(message.data);
  }
});

function showNotification(data) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: data.icon || '/images/icon.png',
    title: data.title || 'Notification',
    message: data.body || '',
    priority: data.priority || 0
  }, (notificationId) => {
    console.log('Notification created:', notificationId);
  });
}
```

### Sending Upstream Messages {#sending-upstream-messages}
### Unregistering from GCM

```javascript
chrome.gcm.unregister(() => {
  if (chrome.runtime.lastError) {
    console.error('Unregistration failed:', chrome.runtime.lastError);
    return;
  }
  console.log('Unregistered from GCM');
});
```

## Setting Up Web Push (Modern Approach)

### Generating VAPID Keys

VAPID (Voluntary Application Server Identification) keys are used to identify your application server. Generate a key pair using the web-push library:

```bash
# Install web-push globally
npm install -g web-push

# Generate VAPID keys
web-push generate-vapid-keys
```

This will output:
- Public Key (put this in your extension)
- Private Key (keep secret on your server)

### Requesting Push Permission

```javascript
// background.js
async function requestPushPermission() {
  const permission = await Notification.permission;
  
  if (permission === 'granted') {
    return true;
  }
  
  if (permission === 'denied') {
    console.error('Push notifications are blocked');
    return false;
  }
  
  // Request permission
  const result = await chrome.permissions.request({
    permissions: ['push']
  });
  
  return result;
}

// Check current permission status
function checkPushPermission() {
  if (!('PushManager' in window)) {
    console.error('Push not supported');
    return;
  }
  
  Notification.requestPermission().then(permission => {
    console.log('Permission:', permission);
  });
}
```

## Using Web Push (Recommended) {#using-web-push-recommended}

### Overview {#overview}

Web Push is the modern standard for push notifications, using the same infrastructure that powers web notifications. It's more secure and is the recommended path for new extensions.

Key differences from GCM:
- Uses VAPID for authentication (no API key needed)
- Standard web push protocol
- Works with any push service (not just Google's)
- Better security with public/private key pairs

### Setting Up VAPID Keys {#setting-up-vapid-keys}

Generate VAPID keys for authentication:
### Subscribing to Push

```javascript
// Your VAPID public key (base64 encoded)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

// Generate keys (run this once in Node.js)
const vapidKeys = webpush.generateVapidKeys();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

Or use the web-push CLI:
```bash
npx web-push generate-vapid-keys
```

Store these keys:
- **Public Key** - Embed in your extension
- **Private Key** - Keep on your server

### Converting VAPID Keys {#converting-vapid-keys}

VAPID keys are typically base64-encoded. For use in Chrome extensions, convert to Uint8Array:

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

const VAPID_PUBLIC_KEY = 'YOUR_BASE64_ENCODED_PUBLIC_KEY';
const subscriptionOptions = {
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
};
```

### Subscribing to Push {#subscribing-to-push}

```javascript
// background.js
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  console.log('Push subscription:', subscription);
  
  // Send subscription to your server
  await fetch('https://your-server.com/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(subscription)
  });
  
  return subscription;
}
```

### Handling Push Events {#handling-push-events}
### Handling Push Events in Service Worker

```javascript
// sw.js (service worker)
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { text: event.data.text() };
    }
  }
  
  const title = data.title || 'Notification';
  const options = {
    body: data.body || '',
    icon: data.icon || '/images/icon.png',
    badge: data.badge || '/images/badge.png',
    tag: data.tag || '',
    data: data.data || {},
    actions: data.actions || [],
    vibrate: data.vibrate || [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  // Handle notification click
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none exist
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
```

### Checking Subscription Status {#checking-subscription-status}

```javascript
// background.js
async function checkPushSubscription() {
  const subscription = await self.registration.pushManager.getSubscription();
  
  if (subscription) {
    console.log('Existing subscription:', subscription);
    console.log('Endpoint:', subscription.endpoint);
    console.log('Expiration:', subscription.expirationTime);
    
    // Check if subscription needs renewal
    if (subscription.expirationTime && Date.now() > subscription.expirationTime - 86400000) {
      // Expiring soon, resubscribe
      await subscription.unsubscribe();
      return await subscribeToPush();
    }
    
    return subscription;
  }
  
  console.log('No push subscription found');
  return null;
}
```

## Combining with chrome.notifications {#combining-with-chromenotifications}

While Web Push can show notifications directly via the service worker, `chrome.notifications` offers more control:

```javascript
// background.js
async function showRichNotification(pushData) {
  // Create notification with chrome.notifications API
  const notificationId = `push-${Date.now()}`;
  
  const options = {
    type: 'list',
    iconUrl: 'icons/icon-128.png',
    title: pushData.title || 'New Update',
    message: pushData.body || 'You have a new message',
    priority: 1,
    silent: false,
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
    chrome.notifications.create(notificationId, options, (id) => {
      console.log('Created notification:', id);
      resolve(id);
    });
  });
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  console.log('Button clicked:', notificationId, buttonIndex);
  
  if (buttonIndex === 0) {
    // View - open extension
    chrome.action.openPopup();
  } else if (buttonIndex === 1) {
    // Dismiss - just close
    chrome.notifications.clear(notificationId);
  }
});
```

## Server-Side Implementation {#server-side-implementation}

### Node.js with web-push Library {#nodejs-with-web-push-library}

```javascript
// server.js
### Sending Push from Server

Using the web-push library on your server:

```javascript
const webpush = require('web-push');

// Your VAPID keys
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
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    console.log('Push sent successfully');
  } catch (error) {
    if (error.statusCode === 410) {
      // Subscription expired, remove from database
      console.log('Subscription expired');
    } else {
      console.error('Push error:', error);
    }
  }
}

### Payload Encryption {#payload-encryption}

Web Push requires payload encryption. The `web-push` library handles this automatically:

```javascript
// server.js - Automatic encryption (recommended)
const payload = {
// Example payload
const notificationPayload = {
  title: 'New Message',
  body: 'You have a new message from John',
  icon: '/images/icon.png',
  badge: '/images/badge.png',
  tag: 'message-123',
  data: {
    type: 'message',
    messageId: '12345',
    url: '/messages/12345'
  },
  actions: [
    { action: 'open', title: 'Open' },
    { action: 'reply', title: 'Reply' }
  ]
};

// web-push automatically encrypts the payload
await webpush.sendNotification(subscription, JSON.stringify(payload));
```

### GCM Server Integration (Legacy) {#gcm-server-integration-legacy}

For the legacy GCM API, send messages via HTTP:

```javascript
// server.js - GCM (legacy)
const https = require('https');
const GCM_API_KEY = 'YOUR_GCM_SERVER_API_KEY';

function sendGCMMessage(registrationIds, data) {
  const message = {
    registration_ids: registrationIds,
    data: data,
    notification: {
      title: data.title,
      body: data.body,
      icon: 'ic_notification'
    },
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
      res.on('end', () => {
        const response = JSON.parse(body);
        resolve(response);
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify(message));
    req.end();
  });
}
```

## Handling Edge Cases {#handling-edge-cases}

### Service Worker Lifecycle {#service-worker-lifecycle}

Push events wake up the service worker, but it may be terminated after handling:

```javascript
// background.js
self.addEventListener('push', async (event) => {
  // Do async work in the handler
  const data = await fetchData();
  
  event.waitUntil(
    self.registration.showNotification('Title', {
      body: data.message
    })
  );
});

// Use skipWaiting to immediately activate new SW
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
```

### Offline Handling {#offline-handling}

```javascript
// background.js
self.addEventListener('push', (event) => {
  event.waitUntil(
    // Try to sync immediately
    handlePushMessage()
      .catch(() => {
        // Queue for later if offline
        return queueMessageForLater();
      })
  );
});

async function queueMessageForLater() {
  // Store in IndexedDB or chrome.storage
  const queue = await getQueue();
  queue.push(currentMessage);
  await saveQueue(queue);
}
```

### Renewal and Expiration {#renewal-and-expiration}

Push subscriptions can expire. Handle this gracefully:

```javascript
// background.js
self.addEventListener('push', (event) => {
  const subscription = self.registration.pushManager.getSubscription();
  
  // Check if about to expire
  if (subscription.expirationTime) {
    const timeUntilExpiration = subscription.expirationTime - Date.now();
    
    // Less than 5 days until expiration
    if (timeUntilExpiration < 5 * 24 * 60 * 60 * 1000) {
      // Notify server to potentially resubscribe user
      notifyServerAboutExpiration(subscription);
    }
    url: '/messages/123',
    type: 'new_message'
  }
};
```

## Migration from GCM to Web Push {#migration-from-gcm-to-web-push}

If you're migrating from GCM to Web Push:

### Step 1: Generate VAPID Keys {#step-1-generate-vapid-keys}

```bash
npx web-push generate-vapid-keys
```

### Step 2: Update manifest.json {#step-2-update-manifestjson}

```json
{
  "permissions": [
    "notifications"
  ]
}
```

### Step 3: Replace Registration Code {#step-3-replace-registration-code}

```javascript
// OLD (GCM)
chrome.gcm.register([SENDER_ID], (id) => { /* ... */ });

// NEW (Web Push)
await self.registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: vapidPublicKey
});
```

### Step 4: Replace Message Handler {#step-4-replace-message-handler}

```javascript
// OLD (GCM)
chrome.gcm.onMessage.addListener((message) => { /* ... */ });

// NEW (Web Push)
self.addEventListener('push', (event) => { /* ... */ });
```
## Comparing GCM and Web Push

| Feature | GCM (Legacy) | Web Push (Modern) |
|---------|--------------|-------------------|
| Browser Support | Chrome only | All modern browsers |
| Permission | gcm in manifest | Runtime permission |
| Requires Firebase | Yes | No |
| VAPID Keys | Not required | Required |
| Message Size | Up to 4KB | Up to 4KB |
| Reliability | High | High |
| Future Support | Deprecated | Recommended |

## Best Practices {#best-practices}

### Message Design

## Common Mistakes {#common-mistakes}
Keep notifications concise and actionable:

```javascript
const notification = {
  title: 'Action Required',
  body: 'Click to complete your profile',
  icon: '/images/action-icon.png',
  badge: '/images/badge.png',
  tag: 'profile-action',
  data: {
    action: 'complete_profile',
    url: '/options.html#profile'
  },
  requireInteraction: true,
  vibrate: [200, 100, 200]
};
```

## Related Documentation {#related-documentation}

- [Chrome Push Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/push-messaging)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications/web-push-protocol)
- [web-push Library](https://github.com/web-push-libs/web-push)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)

## Related Articles {#related-articles}

## Related Articles

- [Notification Patterns](../patterns/notification-patterns.md)
- [Notifications Guide](../guides/notifications-guide.md)
---

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://theluckystrike.github.io/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
### Rate Limiting

Implement client-side rate limiting to avoid overwhelming users:

```javascript
// Track last notification time
const RATE_LIMIT_MS = 60000; // 1 minute
let lastNotificationTime = 0;

function canShowNotification() {
  const now = Date.now();
  if (now - lastNotificationTime < RATE_LIMIT_MS) {
    return false;
  }
  lastNotificationTime = now;
  return true;
}

chrome.gcm.onMessage.addListener((message) => {
  if (canShowNotification()) {
    showNotification(message.data);
  }
});
```

### Managing Subscriptions

Keep subscriptions fresh and handle expiration:

```javascript
async function refreshSubscription() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    // Check if subscription needs renewal
    const expirationTime = subscription.expirationTime;
    if (expirationTime) {
      const expiresSoon = Date.now() > expirationTime - 7 * 24 * 60 * 60 * 1000;
      if (expiresSoon) {
        // Resubscribe
        await subscription.unsubscribe();
        return await subscribeToPush();
      }
    }
  }
  
  return subscription;
}
```

### Handling Multiple Notifications

Use tags to manage notification stacking:

```javascript
// Different tags for different notification types
const tags = {
  MESSAGE: 'message-notification',
  ALERT: 'alert-notification',
  UPDATE: 'update-notification'
};

// Messages with same tag replace previous
chrome.notifications.create('msg-123', {
  type: 'basic',
  iconUrl: '/images/message.png',
  title: 'New Message',
  message: 'You have a new message',
  tag: tags.MESSAGE
});
```

## Debugging Push Notifications

### Common Issues and Solutions

1. **Messages not received**
   - Check service worker is activated
   - Verify permission granted
   - Check network connectivity

2. **Permission denied**
   - User has blocked notifications
   - Guide user to enable in browser settings

3. **GCM registration fails**
   - Verify Sender ID is correct
   - Check Firebase project configuration

4. **Web Push subscription fails**
   - Verify VAPID key format
   - Check service worker is registered

### Debugging Tips

```javascript
// Add logging to track message flow
chrome.gcm.onMessage.addListener((message) => {
  console.log('GCM Message received:', message);
  console.log('Timestamp:', new Date().toISOString());
});

// Log subscription details
registration.pushManager.getSubscription()
  .then(sub => console.log('Current subscription:', sub));
```

## Security Considerations

### Validate All Messages

```javascript
chrome.gcm.onMessage.addListener((message) => {
  // Validate message structure
  if (!message.data || !message.data.signature) {
    console.warn('Invalid message format');
    return;
  }
  
  // Verify message signature (implement on server too)
  const isValid = verifyMessageSignature(message.data);
  if (!isValid) {
    console.warn('Invalid message signature');
    return;
  }
  
  processMessage(message.data);
});
```

### Use HTTPS

Always use HTTPS for your push endpoint. Service workers only work on secure origins.

## Conclusion

Push notifications are a powerful way to re-engage users. While GCM is still functional, the Web Push API is the recommended approach for new extensions due to its cross-browser support and modern architecture.

Key takeaways:

- Use Web Push for new projects
- Handle permission requests gracefully
- Implement rate limiting to avoid user annoyance
- Test thoroughly across different scenarios
- Keep subscriptions fresh and handle expiration
