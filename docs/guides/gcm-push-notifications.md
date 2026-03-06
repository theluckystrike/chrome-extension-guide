# GCM & Push Notifications in Chrome Extensions

This guide covers implementing Google Cloud Messaging (GCM) and Web Push notifications in Chrome Extensions. You'll learn how to register with GCM, receive and send messages, and combine push notifications with the Chrome notifications API for a complete messaging solution.

## Overview

Chrome Extensions support two push notification mechanisms:

1. **GCM (Google Cloud Messaging)** - Legacy API using `chrome.gcm`
2. **Web Push** - Modern standard using the Push API and `navigator.serviceWorker.pushManager`

Both enable real-time communication between your server and extension, but Web Push is the recommended approach for new implementations due to broader browser support and standardization.

## Prerequisites

Before implementing push notifications, ensure your extension has:

- Manifest V3 (recommended for new extensions)
- A valid `sender_id` from Firebase Cloud Messaging (FCM)
- HTTPS server capability for push endpoint (required for Web Push)
- Appropriate permissions in manifest.json

### Required Permissions

```json
{
  "permissions": [
    "gcm",
    "notifications",
    "storage"
  ],
  "host_permissions": [
    "https://fcm.googleapis.com/*"
  ]
}
```

For Web Push with service workers:

```json
{
  "permissions": [
    "notifications",
    "storage"
  ],
  "background": {
    "service_worker": "sw.js"
  }
}
```

---

## Part 1: Chrome GCM API

The `chrome.gcm` API provides the foundational messaging capabilities for Chrome Extensions. This section covers the complete implementation.

### Registration with chrome.gcm.register()

Your extension must register with GCM to receive messages. This registration is typically performed in the service worker or background script.

```javascript
// background.js - GCM Registration
const SENDER_ID = 'YOUR_FIREBASE_SENDER_ID'; // From Firebase Console

// Register with GCM on extension startup
chrome.runtime.onStartup.addListener(async () => {
  try {
    const registrationId = await chrome.gcm.register([SENDER_ID]);
    console.log('Registered with GCM, registration ID:', registrationId);
    
    // Send registration ID to your server
    await sendRegistrationIdToServer(registrationId);
  } catch (error) {
    console.error('GCM registration failed:', error);
  }
});

// Alternative: Register on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    try {
      const registrationId = await chrome.gcm.register([SENDER_ID]);
      console.log('Extension installed and registered with GCM');
      await sendRegistrationIdToServer(registrationId);
    } catch (error) {
      console.error('Registration error:', error);
    }
  }
});

async function sendRegistrationIdToServer(registrationId) {
  // Send to your backend server
  // Your server stores this ID for sending messages later
  const response = await fetch('https://your-server.com/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      extensionId: chrome.runtime.id,
      registrationId: registrationId
    })
  });
  
  if (!response.ok) {
    throw new Error('Failed to register with server');
  }
}
```

The `register()` method accepts an array of sender IDs. The returned registration ID is a unique identifier your server uses to send messages to this specific extension instance.

### Receiving Messages with onMessage

Once registered, handle incoming messages using the `onMessage` listener. This listener can be placed in your background script or service worker.

```javascript
// background.js - Receiving GCM Messages

// Listen for incoming messages from GCM
chrome.gcm.onMessage.addListener((message) => {
  console.log('Received message from GCM:', message);
  
  // Message object structure:
  // {
  //   senderId: string,
  //   messageId: string,
  //   data: { key: value } // Custom key-value pairs
  // }
  
  // Handle different message types
  if (message.data.type === 'notification') {
    displayNotification(message.data);
  } else if (message.data.type === 'sync') {
    syncData(message.data);
  }
  
  // Acknowledge message receipt if required
  // Some message flows require explicit acknowledgment
  if (message.messageId) {
    // Implementation-specific acknowledgment
  }
});

async function displayNotification(data) {
  // Create and display a notification
  const notificationOptions = {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: data.title || 'New Message',
    message: data.body || JSON.stringify(data),
    priority: data.priority || 1,
    eventTime: Date.now()
  };
  
  await chrome.notifications.create(
    `gcm-${Date.now()}`, // Unique ID
    notificationOptions
  );
}

async function syncData(data) {
  // Handle data synchronization
  const { tabId } = await getActiveTab();
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      action: 'sync',
      data: data.payload
    });
  }
}
```

### Sending Upstream Messages with send()

The GCM API also supports sending messages from your extension back to your server (upstream messaging).

```javascript
// background.js - Sending Upstream Messages

// Send message to your server via GCM
async function sendUpstreamMessage(messageData) {
  const message = {
    destinationId: 'YOUR_SERVER_SENDER_ID', // Your server's sender ID
    messageId: `msg-${Date.now()}`, // Unique message ID
    data: {
      ...messageData,
      timestamp: Date.now().toString()
    }
  };
  
  try {
    await chrome.gcm.send(message);
    console.log('Upstream message sent successfully');
  } catch (error) {
    console.error('Failed to send upstream message:', error);
    // Handle errors - may need to retry or queue messages
  }
}

// Listen for messages from content scripts to forward to server
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendToServer') {
    sendUpstreamMessage(message.data)
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

// Unregister when no longer needed
async function unregisterFromGCM() {
  try {
    await chrome.gcm.unregister();
    console.log('Unregistered from GCM');
  } catch (error) {
    console.error('Unregister failed:', error);
  }
}
```

---

## Part 2: Migration to Web Push API

Web Push is the modern standard for push notifications. It uses the standard Push API and Service Workers, providing better cross-browser compatibility and cleaner integration with modern web standards.

### Setting Up the Service Worker

Web Push requires a service worker for handling push events:

```javascript
// sw.js - Service Worker for Web Push

// Install event - cache resources if needed
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Push event - received when server sends a push notification
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let data = { title: 'Default Title', body: 'Default body' };
  
  // Parse payload if present
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      // Handle plaintext payloads
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icons/icon48.png',
    badge: data.badge || '/icons/badge-32.png',
    vibrate: data.vibrate || [100, 50, 100],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    tag: data.tag || 'default',
    renotify: data.renotify || true,
    requireInteraction: data.requireInteraction || false
  };
  
  // Show notification
  event.waitUntil(
    self.registration.showNotification(data.title || 'Extension Update', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  if (event.action === 'dismiss') {
    return;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline support
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  // Retrieve and sync any pending messages
  // This runs when connectivity is restored
}
```

### Using PushManager for Subscription

```javascript
// background.js - Web Push Subscription

async function subscribeToPush() {
  // Check if Push Manager is supported
  if (!('PushManager' in window)) {
    console.error('Push messaging not supported');
    return;
  }
  
  // Check notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.error('Notification permission not granted');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    
    console.log('Push subscription successful:', subscription);
    
    // Send subscription to your server
    await sendSubscriptionToServer(subscription);
    
  } catch (error) {
    console.error('Push subscription failed:', error);
  }
}

// Convert VAPID key from base64 to Uint8Array
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

async function sendSubscriptionToServer(subscription) {
  const response = await fetch('https://your-server.com/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      extensionId: chrome.runtime.id
    })
  });
  
  return response.ok;
}

// Check current subscription status
async function getCurrentSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}

// Unsubscribe from push
async function unsubscribeFromPush() {
  const subscription = await getCurrentSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    // Notify server to remove subscription
    await fetch('https://your-server.com/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId: subscription.endpoint })
    });
  }
}
```

---

## Part 3: Combining with chrome.notifications

For the best user experience, combine push notifications with the Chrome Notifications API to display rich, interactive notifications.

### Complete Notification Implementation

```javascript
// utils/notifications.js - Notification Utilities

class NotificationManager {
  constructor() {
    this.permissionLevel = null;
    this.initialize();
  }
  
  async initialize() {
    this.permissionLevel = await chrome.notifications.getPermissionLevel();
    console.log('Notification permission level:', this.permissionLevel);
  }
  
  // Create a basic notification
  async createBasicNotification(id, options) {
    const defaults = {
      type: 'basic',
      iconUrl: this.getIconPath('icon48.png'),
      title: 'Chrome Extension',
      message: '',
      priority: 1,
      eventTime: Date.now()
    };
    
    try {
      await chrome.notifications.create(id, { ...defaults, ...options });
      return true;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return false;
    }
  }
  
  // Create an image notification (rich notification)
  async createImageNotification(id, options) {
    const fullOptions = {
      type: 'image',
      iconUrl: this.getIconPath('icon48.png'),
      imageUrl: options.imageUrl,
      title: options.title || 'Notification',
      message: options.message || '',
      contextMessage: options.contextMessage || '',
      buttons: options.buttons || [
        { title: 'Open', iconUrl: this.getIconPath('action-icon.png') }
      ],
      priority: options.priority || 1,
      eventTime: options.eventTime || Date.now(),
      requireInteraction: options.requireInteraction || false
    };
    
    try {
      await chrome.notifications.create(id, fullOptions);
      return true;
    } catch (error) {
      console.error('Image notification failed:', error);
      return false;
    }
  }
  
  // Create a list notification
  async createListNotification(id, options) {
    const listOptions = {
      type: 'list',
      iconUrl: this.getIconPath('icon48.png'),
      title: options.title || 'Items',
      message: options.message || '',
      items: options.items || [], // Array of { title, message }
      priority: options.priority || 1
    };
    
    try {
      await chrome.notifications.create(id, listOptions);
      return true;
    } catch (error) {
      console.error('List notification failed:', error);
      return false;
    }
  }
  
  // Handle notification button clicks
  setupButtonHandler(callback) {
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
      callback(notificationId, buttonIndex);
    });
  }
  
  // Handle notification click (entire notification)
  setupClickHandler(callback) {
    chrome.notifications.onClicked.addListener((notificationId) => {
      callback(notificationId);
    });
  }
  
  // Handle notification closed by user
  setupClosedHandler(callback) {
    chrome.notifications.onClosed.addListener((notificationId, byUser) => {
      callback(notificationId, byUser);
    });
  }
  
  // Update existing notification
  async updateNotification(id, options) {
    try {
      await chrome.notifications.update(id, options);
      return true;
    } catch (error) {
      console.error('Update notification failed:', error);
      return false;
    }
  }
  
  // Clear notification
  async clearNotification(id) {
    try {
      await chrome.notifications.clear(id);
      return true;
    } catch (error) {
      console.error('Clear notification failed:', error);
      return false;
    }
  }
  
  // Get appropriate icon path
  getIconPath(iconName) {
    return `icons/${iconName}`;
  }
  
  // Show notification from push data
  async showPushNotification(pushData) {
    const notificationId = `push-${Date.now()}`;
    
    // Determine notification type based on data
    if (pushData.imageUrl) {
      return this.createImageNotification(notificationId, {
        title: pushData.title,
        message: pushData.body,
        imageUrl: pushData.imageUrl,
        priority: pushData.priority || 1,
        contextMessage: pushData.contextMessage
      });
    }
    
    if (pushData.items) {
      return this.createListNotification(notificationId, {
        title: pushData.title,
        message: pushData.summary || '',
        items: pushData.items
      });
    }
    
    return this.createBasicNotification(notificationId, {
      title: pushData.title,
      message: pushData.body
    });
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}
```

### Integration Example

```javascript
// background.js - Complete Integration

const notificationManager = new NotificationManager();

// Handle incoming GCM messages
chrome.gcm.onMessage.addListener(async (message) => {
  console.log('GCM message received:', message);
  
  // Show notification
  await notificationManager.showPushNotification(message.data);
  
  // Update badge
  updateBadgeCount();
  
  // Optionally open relevant view
  if (message.data.autoOpen) {
    openExtensionPage(message.data.page);
  }
});

// Handle notification interactions
notificationManager.setupButtonHandler((notificationId, buttonIndex) => {
  console.log(`Button ${buttonIndex} clicked on ${notificationId}`);
  
  if (buttonIndex === 0) { // Open button
    // Open the extension or relevant page
    chrome.runtime.openOptionsPage();
  }
});

notificationManager.setupClickHandler((notificationId) => {
  console.log(`Notification ${notificationId} clicked`);
  
  // Open the main view
  chrome.action.openPopup();
});

notificationManager.setupClosedHandler((notificationId, byUser) => {
  if (byUser) {
    console.log(`Notification ${notificationId} closed by user`);
    // Track notification dismissal for analytics
  }
});

function updateBadgeCount() {
  chrome.action.getBadgeText({}, (badgeText) => {
    const currentCount = parseInt(badgeText) || 0;
    const newCount = currentCount + 1;
    chrome.action.setBadgeText({ text: newCount.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  });
}
```

---

## Part 4: Server-Side Setup

A complete push notification system requires server-side components to send messages and manage subscriptions.

### VAPID Key Generation

Web Push uses VAPID (Voluntary Application Server Identification) for authentication:

```javascript
// Generate VAPID keys (run once on server setup)
const webpush = require('web-push');

// Generate keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);

// Save these keys securely
// Public key goes to your extension/client
// Private key stays on your server
```

### Sending Notifications with GCM/FCM

```javascript
// server/gcm-sender.js - GCM/FCM Message Sending

const fetch = require('node-fetch');

// FCM Server Key from Firebase Console
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

async function sendGCMMessage(registrationIds, data) {
  const message = {
    registration_ids: registrationIds,
    data: data,
    notification: {
      title: data.title || 'Extension Update',
      body: data.body || 'You have a new notification',
      icon: data.icon || 'notification_icon',
      click_action: data.url || 'https://your-extension.com'
    },
    android: {
      priority: 'high',
      notification: {
        channel_id: 'default_channel',
        default_sound: true,
        default_vibrate_timings: true
      }
    },
    webpush: {
      headers: {
        TTL: data.ttl || 3600,
        URGENCY: data.urgency || 'normal'
      }
    }
  };
  
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });
  
  const result = await response.json();
  
  // Handle results
  if (result.failure > 0) {
    // Check for invalid registration IDs
    result.results.forEach((result, index) => {
      if (result.error) {
        console.error(`Message ${index} failed:`, result.error);
        
        // Handle specific errors
        if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
          // Remove invalid token from database
          removeRegistrationId(registrationIds[index]);
        }
      }
    });
  }
  
  return result;
}

// Send to single recipient
async function sendToOne(registrationId, payload) {
  return sendGCMMessage([registrationId], payload);
}

// Broadcast to multiple recipients
async function sendToMany(registrationIds, payload) {
  // FCM limit is 500 tokens per request
  const chunks = [];
  for (let i = 0; i < registrationIds.length; i += 500) {
    chunks.push(registrationIds.slice(i, i + 500));
  }
  
  const results = await Promise.all(
    chunks.map(chunk => sendGCMMessage(chunk, payload))
  );
  
  return results;
}
```

### Sending Notifications with Web Push

```javascript
// server/webpush-sender.js - Web Push Message Sending

const webpush = require('web-push');

// VAPID keys (generated once)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = 'mailto:your-email@your-domain.com';

// Configure VAPID
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

async function sendWebPush(subscription, payload) {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      {
        TTL: 3600, // Time to live in seconds
        urgency: 'normal',
        topic: 'update'
      }
    );
    console.log('Push notification sent successfully');
    return { success: true };
  } catch (error) {
    console.error('Push notification error:', error.statusCode, error.body);
    
    // Handle subscription expiration
    if (error.statusCode === 410) {
      // Subscription no longer valid - remove from database
      await removeSubscription(subscription.endpoint);
      return { success: false, error: 'Subscription expired' };
    }
    
    // Handle rate limiting
    if (error.statusCode === 429) {
      return { success: false, error: 'Rate limited' };
    }
    
    return { success: false, error: error.message };
  }
}

// Send to multiple subscriptions
async function sendToManyWebPush(subscriptions, payload) {
  const results = await Promise.allSettled(
    subscriptions.map(sub => sendWebPush(sub, payload))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  return { successful, failed };
}
```

### Payload Encryption for Web Push

Web Push payloads are encrypted using the subscription's keys:

```javascript
// server/payload-encryption.js - Encrypting Push Payloads

const webpush = require('web-push');

// When storing subscriptions, include the keys
// Subscription object from client:
// {
//   endpoint: "https://...",
//   keys: {
//     p256dh: "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
//     auth: "tBHItJI5svbpez7KI4CCXg"
//   }
// }

function sendPushWithPayload(subscription, payload) {
  // Convert payload to buffer
  const payloadBuffer = Buffer.from(JSON.stringify(payload));
  
  // Send notification with payload
  // webpush handles encryption automatically
  return webpush.sendNotification(
    subscription,
    payloadBuffer,
    {
      TTL: 3600,
      urgency: 'high',
      topic: 'new-message'
    }
  );
}

// Or manually encrypt if using raw crypto
const crypto = require('crypto');

function encryptPayload(subscription, payload) {
  const payloadString = JSON.stringify(payload);
  const payloadBuffer = Buffer.from(payloadString);
  
  // Generate random salt
  const salt = crypto.randomBytes(16);
  
  // Get recipient's public key
  const recipientKey = Buffer.from(subscription.keys.p256dh, 'base64');
  
  // Perform key derivation and encryption
  // (This is handled automatically by webpush library)
  
  return encrypt(salt, recipientKey, payloadBuffer);
}
```

---

## Part 5: Complete Implementation Example

Here's a full example bringing together all the components:

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Push Notification Demo",
  "version": "1.0.0",
  "description": "Demonstrates GCM and Web Push notifications",
  "permissions": [
    "gcm",
    "notifications",
    "storage"
  ],
  "background": {
    "service_worker": "sw.js",
    "type": "module"
  },
  "action": {
    "default_icon": "icons/icon48.png",
    "default_title": "Push Demo"
  },
  "icons": {
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Complete Background Script

```javascript
// background.js - Complete Implementation

// Configuration
const CONFIG = {
  SENDER_ID: 'YOUR_FIREBASE_SENDER_ID',
  VAPID_PUBLIC_KEY: 'YOUR_VAPID_PUBLIC_KEY',
  SERVER_URL: 'https://your-server.com'
};

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension starting up');
  await initializePushNotifications();
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details.reason);
  if (details.reason === 'install') {
    await initializePushNotifications();
  }
});

async function initializePushNotifications() {
  // Prefer Web Push if service worker is ready
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    await initializeWebPush();
  } else if ('gcm' in chrome) {
    await initializeGCM();
  }
}

async function initializeWebPush() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Web Push permission not granted');
      return;
    }
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY)
    });
    
    await sendSubscriptionToServer(subscription);
    console.log('Web Push initialized');
  } catch (error) {
    console.error('Web Push init failed:', error);
  }
}

async function initializeGCM() {
  try {
    const registrationId = await chrome.gcm.register([CONFIG.SENDER_ID]);
    console.log('GCM registered:', registrationId);
    await sendRegistrationIdToServer(registrationId);
  } catch (error) {
    console.error('GCM init failed:', error);
  }
}

// GCM message handler
chrome.gcm.onMessage.addListener((message) => {
  console.log('GCM message received:', message);
  displayNotification(message.data);
});

// Notification management
async function displayNotification(data) {
  const notificationId = `notify-${Date.now()}`;
  
  const options = {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: data.title || 'Notification',
    message: data.body || JSON.stringify(data),
    priority: 1,
    eventTime: Date.now()
  };
  
  await chrome.notifications.create(notificationId, options);
}

// Server communication
async function sendSubscriptionToServer(subscription) {
  await fetch(`${CONFIG.SERVER_URL}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      extensionId: chrome.runtime.id
    })
  });
}

async function sendRegistrationIdToServer(registrationId) {
  await fetch(`${CONFIG.SERVER_URL}/gcm/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      registrationId,
      extensionId: chrome.runtime.id
    })
  });
}

// Utility function
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

---

## Best Practices

### Security Considerations

1. **Always use HTTPS** for all server communications
2. **Validate all incoming data** from push messages
3. **Encrypt sensitive payload data** using the subscription keys
4. **Rotate VAPID keys periodically** (at least annually)
5. **Store credentials securely** - never commit to version control
6. **Implement proper authentication** for your push server endpoints

### Performance Optimization

1. **Batch notifications** when sending to multiple recipients
2. **Set appropriate TTL values** based on message urgency
3. **Use message collapsing keys** to reduce duplicate notifications
4. **Implement local caching** for frequently accessed data
5. **Use background sync** for non-critical data updates

### User Experience

1. **Request permissions at appropriate times** - not on install
2. **Provide clear notification content** - title, body, and icon
3. **Include actionable buttons** for common actions
4. **Respect user's notification settings** - allow customization
5. **Handle notification dismissal** gracefully

### Error Handling

```javascript
// Robust error handling example
async function safeSendNotification(subscription, payload) {
  try {
    const response = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    return { success: true };
  } catch (error) {
    switch (error.statusCode) {
      case 410: // Gone - subscription expired
        await removeExpiredSubscription(subscription.endpoint);
        return { success: false, reason: 'expired' };
      case 429: // Too Many Requests
        return { success: false, reason: 'rate_limited' };
      case 404: // Not Found
        return { success: false, reason: 'not_found' };
      default:
        console.error('Unexpected push error:', error);
        return { success: false, reason: 'unknown' };
    }
  }
}
```

---

## Conclusion

This guide covered the complete implementation of push notifications in Chrome Extensions:

- **chrome.gcm API** for legacy GCM messaging with registration and message handling
- **Web Push API** for modern, standards-based push notifications
- **chrome.notifications API** for displaying rich notifications to users
- **Server-side implementation** for sending messages with proper encryption
- **Best practices** for security, performance, and user experience

For new extensions, prefer Web Push due to its standardization and broader browser support. For existing GCM implementations, plan a migration to Web Push as Chrome may deprecate GCM in future versions.

Remember to test thoroughly across different scenarios including:
- Permission grant/denial flows
- Notification interaction handling
- Offline message queuing
- Subscription refresh/expiration
- Rate limiting scenarios

---

## Testing Push Notifications

### Local Testing Setup

For testing push notifications during development, you can use various approaches:

```javascript
// Testing utilities for local development
class PushNotificationTester {
  constructor() {
    this.testResults = [];
  }

  // Simulate incoming GCM message
  async simulateGCMMessage(messageData) {
    const message = {
      senderId: 'TEST_SENDER_ID',
      messageId: `test-${Date.now()}`,
      data: messageData
    };

    // Trigger the onMessage listener manually
    chrome.gcm.onMessage.emit(message);
    
    this.testResults.push({
      type: 'gcm',
      timestamp: Date.now(),
      success: true
    });
  }

  // Simulate Web Push event
  async simulatePushEvent(payload) {
    const event = new PushEvent('push', {
      data: payload ? JSON.stringify(payload) : null
    });
    
    // Dispatch to service worker
    const registration = await navigator.serviceWorker.ready;
    registration.active.postMessage({
      type: 'PUSH_EVENT',
      payload: payload
    });
  }

  // Test notification display
  async testNotificationDisplay(options) {
    try {
      const notificationId = `test-${Date.now()}`;
      await chrome.notifications.create(notificationId, options);
      return { success: true, notificationId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get test results
  getResults() {
    return this.testResults;
  }

  // Clear results
  clearResults() {
    this.testResults = [];
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PushNotificationTester;
}
```

### Testing Checklist

```markdown
## Push Notification Testing Checklist

### Permission Testing
- [ ] Test permission granted on first request
- [ ] Test permission denied flow
- [ ] Test permission previously denied (blocked)
- [ ] Test permission reset via browser settings

### Message Delivery
- [ ] Test message delivery when extension is running
- [ ] Test message delivery when extension is backgrounded
- [ ] Test message delivery after browser restart
- [ ] Test message delivery with multiple instances

### Notification Display
- [ ] Test basic notification rendering
- [ ] Test rich notification with image
- [ ] Test notification with action buttons
- [ ] Test notification click handling
- [ ] Test notification dismissal

### Error Handling
- [ ] Test handling of invalid sender ID
- [ ] Test handling of network failures
- [ ] Test handling of expired subscription
- [ ] Test retry logic for failed messages

### Performance
- [ ] Test with large payload (max size)
- [ ] Test notification delivery latency
- [ ] Test background message handling
- [ ] Test with many concurrent notifications
```

### Debugging Tips

```javascript
// Debug utilities for push notifications
const PushDebug = {
  // Enable verbose logging
  enableDebugMode() {
    localStorage.setItem('push_debug', 'true');
    console.log('Push notification debug mode enabled');
  },

  // Log all incoming messages
  setupMessageLogging() {
    // GCM messages
    chrome.gcm.onMessage.addListener((message) => {
      console.group('📨 GCM Message Received');
      console.log('Sender:', message.senderId);
      console.log('Message ID:', message.messageId);
      console.log('Data:', message.data);
      console.groupEnd();
    });

    // Web Push messages (in service worker)
    self.addEventListener('push', (event) => {
      console.group('📨 Web Push Event');
      console.log('Data:', event.data?.text());
      console.groupEnd();
    });
  },

  // Monitor notification events
  setupNotificationLogging() {
    chrome.notifications.onClicked.addListener((id) => {
      console.log('Notification clicked:', id);
    });

    chrome.notifications.onClosed.addListener((id, byUser) => {
      console.log(`Notification ${id} closed by ${byUser ? 'user' : 'system'}`);
    });

    chrome.notifications.onButtonClicked.addListener((id, index) => {
      console.log(`Button ${index} clicked on notification ${id}`);
    });
  },

  // Check subscription status
  async checkSubscriptionStatus() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    console.log('Push subscription:', subscription ? 'active' : 'none');
    if (subscription) {
      console.log('Endpoint:', subscription.endpoint);
      console.log('Expiration:', subscription.expirationTime);
    }
    
    return subscription;
  },

  // Verify GCM registration
  async checkGCMRegistration() {
    // GCM registration status is not directly exposed
    // Test by attempting to send a message
    console.log('GCM status: Use send() to verify registration');
  }
};
```
