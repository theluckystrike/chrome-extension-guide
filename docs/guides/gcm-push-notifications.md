---
layout: default
title: "Chrome Extension Push Notifications — Developer Guide"
description: "Learn Chrome extension push notifications with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/gcm-push-notifications/"
---
# GCM & Push Notifications in Chrome Extensions

## Introduction {#introduction}

Push notifications enable Chrome extensions to receive messages from a server even when the extension isn't actively running. This is critical for real-time updates, messaging apps, collaborative tools, and any extension that needs to alert users about events happening on a backend.

There are two notification systems available:
1. **GCM (Google Cloud Messaging)** - The legacy Chrome-specific API (`chrome.gcm`)
2. **Web Push** - The modern standard using `PushManager` and service workers

This guide covers both approaches, with emphasis on the Web Push migration path since GCM is deprecated.

## Understanding the Architecture {#understanding-the-architecture}

The push notification flow involves several components:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Server    │─────▶│  Chrome     │─────▶│   User's    │
│  (Your API) │      │  Push       │      │   Device    │
└─────────────┘      │  Service    │      └─────────────┘
                     └─────────────┘
```

1. Your server sends a push message to the push service (FCM/Chrome Push Service)
2. The push service delivers it to Chrome on the user's device
3. Chrome wakes up your extension's service worker
4. Your extension processes the message and optionally shows a notification

## manifest.json Setup {#manifestjson-setup}

Both GCM and Web Push require specific permissions and configuration:

```json
{
  "name": "Push Notification Extension",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": [
    "gcm",
    "notifications",
    "pushMessaging"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

For Web Push (recommended), you'll also need:

```json
{
  "permissions": [
    "notifications"
  ],
  "user_permissions": [
    "notifications"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

## Using chrome.gcm (Legacy GCM API) {#using-chromegcm-legacy-gcm-api}

### Overview {#overview}

The `chrome.gcm` API was Chrome's original push messaging solution. While deprecated, it still works and many existing extensions use it. Key methods:
- `chrome.gcm.register()` - Register to receive messages
- `chrome.gcm.onMessage` - Listen for incoming messages
- `chrome.gcm.send()` - Send messages upstream to your server

### Getting a Sender ID {#getting-a-sender-id}

Before using GCM, you need a project in the Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable "Firebase Cloud Messaging" API
4. Get your **Sender ID** (project number) and **Server API Key**

### Registering with GCM {#registering-with-gcm}

```javascript
// background.js
const SENDER_ID = 'YOUR_SENDER_ID'; // Your Google Cloud project number

async function registerWithGCM() {
  try {
    const registrationId = await new Promise((resolve, reject) => {
      chrome.gcm.register([SENDER_ID], (registrationId) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(registrationId);
        }
      });
    });
    
    console.log('Registered with GCM, ID:', registrationId);
    
    // Send registrationId to your server
    await sendRegistrationIdToServer(registrationId);
    
    return registrationId;
  } catch (error) {
    console.error('GCM registration failed:', error);
  }
}

// Register on extension install
chrome.runtime.onInstalled.addListener(() => {
  registerWithGCM();
});

// Also register on startup (for service worker restarts)
chrome.runtime.onStartup.addListener(() => {
  registerWithGCM();
});
```

### Receiving Messages {#receiving-messages}

```javascript
// background.js
chrome.gcm.onMessage.addListener((message) => {
  console.log('Received GCM message:', message);
  
  // Message object structure:
  // {
  //   "collapseKey": "string",
  //   "delayWhileIdle": boolean,
  //   "destination": "string",
  //   "from": "string",
  //   "notification": { "body": "...", "icon": "...", "title": "..." },
  //   "payload": { "key": "value" },
  //   "rawData": "base64-encoded-string"
  // }
  
  // Show notification if payload has data
  if (message.data) {
    showNotification(message.data);
  }
});

function showNotification(data) {
  const options = {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: data.title || 'New Notification',
    message: data.body || JSON.stringify(data),
    priority: 1,
    silent: false
  };
  
  chrome.notifications.create('gcm-notification', options, (notificationId) => {
    console.log('Notification created:', notificationId);
  });
}
```

### Sending Upstream Messages {#sending-upstream-messages}

You can send messages from the extension back to your server:

```javascript
// background.js
function sendUpstreamMessage(message) {
  const upstreamMessage = {
    destination: SENDER_ID,
    messageId: Date.now().toString(),
    payload: {
      action: 'update',
      data: message
    },
    timeToLive: 3600, // seconds
    delayWhileIdle: false
  };
  
  chrome.gcm.send(upstreamMessage, (messageId) => {
    if (chrome.runtime.lastError) {
      console.error('Send failed:', chrome.runtime.lastError.message);
    } else {
      console.log('Message sent with ID:', messageId);
    }
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

```javascript
// You can generate these once and reuse them
const webpush = require('web-push');

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
  try {
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: new Uint8Array([
        // Convert base64 to Uint8Array - use a utility function
        0x04, 0x9e, 0xad, 0x8a, ... // your key bytes
      ])
    });
    
    console.log('Push subscription:', subscription);
    
    // Send subscription to your server
    await sendSubscriptionToServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
  }
}

// Subscribe on install
chrome.runtime.onInstalled.addListener(() => {
  subscribeToPush();
});

// Check existing subscription on startup
chrome.runtime.onStartup.addListener(async () => {
  const subscription = await self.registration.pushManager.getSubscription();
  if (!subscription) {
    await subscribeToPush();
  }
});
```

### Handling Push Events {#handling-push-events}

```javascript
// background.js
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
  
  // Show notification
  const options = {
    body: data.body || 'New message received',
    icon: data.icon || 'icons/icon-128.png',
    badge: 'icons/badge-32.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false
  };
  
  const promise = self.registration.showNotification(
    data.title || 'Push Notification',
    options
  );
  
  event.waitUntil(promise);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    // Open the extension or a specific page
    event.waitUntil(
      clients.openWindow('index.html')
    );
  } else if (event.action === 'dismiss') {
    // Just close - do nothing
  }
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
const webpush = require('web-push');

// VAPID keys - keep private key secret!
const vapidKeys = {
  publicKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  privateKey: 'UUxI4O8-FbRouAf7-7OT9xX7R4lNkI9W2p6h8jN3YcM'
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Store subscriptions in database
const subscriptions = new Map(); // In production, use a database

// Endpoint to save subscription
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  const endpoint = subscription.endpoint;
  
  subscriptions.set(endpoint, subscription);
  
  console.log('New subscription saved:', endpoint);
  res.status(200).json({ success: true });
});

// Send push notification to all subscribers
async function sendPushNotification(payload) {
  const notifications = [];
  
  for (const [endpoint, subscription] of subscriptions) {
    const promise = webpush.sendNotification(subscription, JSON.stringify(payload))
      .catch((err) => {
        if (err.statusCode === 410) {
          // Subscription expired, remove it
          subscriptions.delete(endpoint);
          console.log('Subscription removed:', endpoint);
        } else {
          console.error('Push error:', err);
        }
      });
    
    notifications.push(promise);
  }
  
  await Promise.all(notifications);
}

// Send to specific subscriber
async function sendToSubscriber(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error) {
    if (error.statusCode === 410) {
      // Subscription expired
      return false;
    }
    throw error;
  }
}
```

### Payload Encryption {#payload-encryption}

Web Push requires payload encryption. The `web-push` library handles this automatically:

```javascript
// server.js - Automatic encryption (recommended)
const payload = {
  title: 'New Message',
  body: 'You have a new message from John',
  icon: 'https://example.com/icon.png',
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
  }
});
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

## Best Practices {#best-practices}

1. **Use Web Push for new projects** - GCM is deprecated
2. **Request notification permission at the right time** - Don't ask immediately on install
3. **Handle service worker lifecycle** - Don't assume the SW stays alive
4. **Implement message queuing** - Handle offline scenarios
5. **Monitor subscription expiration** - Renew before they expire
6. **Use meaningful notification content** - Give users value
7. **Respect user preferences** - Allow disabling notifications
8. **Test on real devices** - Emulator testing is limited
9. **Secure your VAPID keys** - Never expose private key in extension
10. **Encrypt sensitive data** - Don't send PII in plain push payloads

## Common Mistakes {#common-mistakes}

- Using GCM for new extensions (use Web Push instead)
- Not handling notification permission denial
- Sending too many notifications (spamming users)
- Not handling service worker termination
- Missing expiration time checks
- Not implementing notification click handling
- Storing private keys in extension code
- Not testing offline scenarios
- Not providing value in notifications

## Related Documentation {#related-documentation}

- [Chrome Push Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/push-messaging)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications/web-push-protocol)
- [web-push Library](https://github.com/web-push-libs/web-push)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)

## Related Articles {#related-articles}

## Related Articles

- [Notification Patterns](../patterns/notification-patterns.md)
- [Notifications Guide](../guides/notifications-guide.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
