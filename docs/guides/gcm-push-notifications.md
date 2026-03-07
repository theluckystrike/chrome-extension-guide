# GCM and Push Notifications in Chrome Extensions

## Introduction

Chrome extensions can receive push notifications from a backend server using either the legacy GCM (Google Cloud Messaging) API or the modern Web Push API. This guide covers both approaches, with emphasis on the recommended Web Push migration path.

The `chrome.gcm` API has been the traditional way to handle cloud messaging in Chrome extensions. However, Google has been encouraging developers to migrate to the Web Push standard, which is more widely supported across browsers.

This guide will walk you through setting up both approaches, handling message reception, and building a complete push notification system for your extension.

## Prerequisites

Before implementing push notifications, you need:

- A Chrome Extension with the `gcm` permission or pushManager support
- A server-side component to send notifications
- A Firebase project (for GCM) or a VAPID key pair (for Web Push)
- HTTPS endpoint for your extension's background service worker

## manifest.json Configuration

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

Note that Web Push does not require the `gcm` permission in manifest.json. The push permission is requested at runtime.

## Setting Up GCM (Legacy Approach)

### Creating a Firebase Project

1. Go to the Firebase Console (console.firebase.google.com)
2. Create a new project or select an existing one
3. Navigate to Project Settings
4. Under "Your apps", click the Web icon (</>)
5. Register your app and copy the `firebaseConfig` object
6. Go to "Cloud Messaging" settings
7. Enable "Cloud Messaging API (Legacy)" if not already enabled
8. Copy your Server Key

### Registering with GCM

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

### Subscribing to Push

```javascript
// Your VAPID public key (base64 encoded)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

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

// Example payload
const notificationPayload = {
  title: 'New Message',
  body: 'You have a new message from John',
  icon: '/images/icon.png',
  badge: '/images/badge.png',
  tag: 'message-123',
  data: {
    url: '/messages/123',
    type: 'new_message'
  }
};
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

## Best Practices

### Message Design

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
