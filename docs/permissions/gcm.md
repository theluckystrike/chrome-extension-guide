---
layout: default
title: "gcm Permission"
description: "Access to (Google Cloud Messaging) API for sending and receiving push messages via Firebase Cloud Messaging (FCM). { 'permissions': ['gcm']"
permalink: /permissions/gcm/
category: permissions
order: 19
canonical_url: "https://bestchromeextensions.com/permissions/gcm/"
last_modified_at: 2026-01-15
---

gcm Permission

What It Grants {#what-it-grants}
Access to `chrome.gcm` (Google Cloud Messaging) API for sending and receiving push messages via Firebase Cloud Messaging (FCM).

Manifest {#manifest}
```json
{
  "permissions": ["gcm"]
}
```

User Warning {#user-warning}
None. this permission does not trigger a warning at install time.

API Access {#api-access}
- `chrome.gcm.register(senderIds)`. register for push messages
- `chrome.gcm.unregister()`. unregister
- `chrome.gcm.send(message)`. send upstream message
- `chrome.gcm.onMessage`. receive push message
- `chrome.gcm.onMessagesDeleted`. messages were deleted on server
- `chrome.gcm.onSendError`. upstream send failed

Registration {#registration}
```typescript
// Register with your FCM sender ID
const registrationId = await chrome.gcm.register(['YOUR_SENDER_ID']);
console.log('Registration ID:', registrationId);
// Send this ID to your server to target this client
```

Receiving Messages {#receiving-messages}
```typescript
chrome.gcm.onMessage.addListener((message) => {
  console.log('Push message:', message.data);
  // message.data is Record<string, string>

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon-128.png',
    title: message.data.title || 'Notification',
    message: message.data.body || ''
  });
});

chrome.gcm.onMessagesDeleted.addListener(() => {
  console.log('Some messages were deleted. sync state from server');
});
```

Sending Upstream Messages {#sending-upstream-messages}
```typescript
await chrome.gcm.send({
  destinationId: 'YOUR_SENDER_ID@gcm.googleapis.com',
  messageId: String(Date.now()),
  data: {
    action: 'acknowledge',
    notificationId: '12345'
  }
});

chrome.gcm.onSendError.addListener((error) => {
  console.error(`Send failed: ${error.errorMessage} (msg: ${error.messageId})`);
});
```

Storage Integration {#storage-integration}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  gcmRegistrationId: 'string',
  pushEnabled: 'boolean',
  lastMessageTime: 'number'
});
const storage = createStorage(schema, 'local');

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    const regId = await chrome.gcm.register(['YOUR_SENDER_ID']);
    await storage.set('gcmRegistrationId', regId);
    await storage.set('pushEnabled', true);
    // Send regId to your backend
  }
});
```

Messaging Integration {#messaging-integration}
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  GET_PUSH_STATUS: { request: {}; response: { enabled: boolean; regId: string } };
  TOGGLE_PUSH: { request: { enabled: boolean }; response: { ok: boolean } };
};
const m = createMessenger<Messages>();

m.onMessage('TOGGLE_PUSH', async ({ enabled }) => {
  if (enabled) {
    const regId = await chrome.gcm.register(['YOUR_SENDER_ID']);
    await storage.set('gcmRegistrationId', regId);
  } else {
    await chrome.gcm.unregister();
    await storage.set('gcmRegistrationId', '');
  }
  await storage.set('pushEnabled', enabled);
  return { ok: true };
});
```

FCM Setup Requirements {#fcm-setup-requirements}
1. Create project in Firebase Console
2. Get Sender ID from project settings
3. Use Sender ID in `chrome.gcm.register()`
4. Send registration ID to your server
5. Server sends messages via FCM HTTP API

Key Characteristics {#key-characteristics}
- Messages have max 4 KB payload
- `data` field is `Record<string, string>` (string values only)
- Registration ID may change. handle re-registration
- Messages delivered even when extension not running (wakes service worker)

When to Use {#when-to-use}
- Real-time notifications from your server
- Chat/messaging extensions
- Live data updates (stock prices, scores)
- Server-triggered actions

When NOT to Use {#when-not-to-use}
- For polling. use `chrome.alarms` instead
- For extension-to-extension messaging. use `chrome.runtime.sendMessage`
- If no server component. GCM requires backend

Permission Check {#permission-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('gcm');
```

Cross-References {#cross-references}
- Guide: `docs/guides/gcm-push-notifications.md`
- Related: `docs/permissions/notifications.md`

Frequently Asked Questions

How do I use push notifications in Chrome extensions?
Use Google Cloud Messaging (GCM) with chrome.gcm to send push notifications from your server to users. You'll need to set up a GCM project and handle incoming messages.

Is GCM still supported in Chrome extensions?
Yes, GCM is supported, but note that it's being deprecated in favor of Web Push. Consider using Web Push for new projects.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
