# Chrome Extension GCM and Push Messaging Patterns

## Overview

Google Cloud Messaging (GCM) and its successor Firebase Cloud Messaging (FCM) enable Chrome Extensions to receive push notifications from a server even when the extension's service worker is not actively running. This is essential for building real-time features, sync-driven applications, and user engagement notifications that work reliably across browser restarts and system sleeps.

This guide covers eight practical patterns for implementing push messaging in Chrome Extensions, from basic registration to advanced two-way communication and alternative Web Push API approaches. All examples use TypeScript and leverage `@theluckystrike/webext-storage` for persistent state and `@theluckystrike/webext-messaging` for robust message handling.

---

## Required Permissions

Before implementing any push messaging features, you must declare the appropriate permissions in your manifest:

```json
// manifest.json (MV3)
{
  "permissions": [
    "gcm",
    "storage",
    "notifications"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

The `"gcm"` permission is required to use the `chrome.gcm` API. The `"storage"` permission is essential for persisting registration tokens, and `"notifications"` is needed to display push-triggered notifications to users.

---

## Pattern 1: GCM API Basics

The `chrome.gcm` API provides the foundational methods for registering with GCM/FCM and receiving push messages. Understanding these core functions is essential before implementing more complex patterns.

### Registering for Push Messages

The `chrome.gcm.register()` method registers your extension with GCM to receive push messages. You must provide a list of sender IDs, which are project IDs from your Firebase Console:

```ts
// lib/gcm-service.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const gcmStorage = createStorage(defineSchema({
  registrationId: 'string',
  registrationTimestamp: 'number',
  senderIds: 'string', // JSON array of sender IDs
}), 'sync');

export interface GcmRegistration {
  registrationId: string;
  senderId: string;
  timestamp: number;
}

export class GcmService {
  private senderIds: string[];

  constructor(senderIds: string[]) {
    this.senderIds = senderIds;
  }

  async register(): Promise<string> {
    try {
      const registrationIds = await chrome.gcm.register(this.senderIds);
      
      if (!registrationIds || registrationIds.length === 0) {
        throw new Error('No registration ID returned');
      }

      const registrationId = registrationIds[0];
      
      // Store registration for later use
      await gcmStorage.set('registrationId', registrationId);
      await gcmStorage.set('registrationTimestamp', Date.now());
      await gcmStorage.set('senderIds', JSON.stringify(this.senderIds));

      console.log('GCM registration successful:', registrationId);
      return registrationId;
    } catch (error) {
      console.error('GCM registration failed:', error);
      throw error;
    }
  }

  async unregister(): Promise<void> {
    try {
      await chrome.gcm.unregister();
      await gcmStorage.remove('registrationId');
      await gcmStorage.remove('registrationTimestamp');
      console.log('GCM unregistered successfully');
    } catch (error) {
      console.error('GCM unregister failed:', error);
      throw error;
    }
  }

  async getRegistrationId(): Promise<string | null> {
    return gcmStorage.get('registrationId');
  }
}
```

### Listening for Incoming Messages

The `chrome.gcm.onMessage` event fires whenever a push message is received. This listener must be registered in your service worker:

```ts
// background/service-worker.ts
import { GcmService } from '../lib/gcm-service';
import { Messenger, MessageType } from '@theluckystrike/webext-messaging';

const gcmService = new GcmService(['123456789012']); // Your sender ID
const messenger = new Messenger('push-handler');

// Set up the message listener
chrome.gcm.onMessage.addListener(async (message) => {
  console.log('Push message received:', message);

  const { data, messageId, from } = message;

  if (!data) {
    console.warn('Received empty push message');
    return;
  }

  try {
    // Route based on message type
    await handlePushMessage(data, messageId);
  } catch (error) {
    console.error('Error handling push message:', error);
  }
});

async function handlePushMessage(
  data: Record<string, string>,
  messageId: string
): Promise<void> {
  const messageType = data.type || 'notification';

  switch (messageType) {
    case 'notification':
      await handleNotificationMessage(data);
      break;
    case 'sync':
      await handleSyncMessage(data);
      break;
    case 'command':
      await handleCommandMessage(data);
      break;
    default:
      console.warn('Unknown message type:', messageType);
  }

  // Acknowledge receipt if needed
  if (data.ack !== 'false') {
    console.log(`Message ${messageId} processed`);
  }
}

async function handleNotificationMessage(
  data: Record<string, string>
): Promise<void> {
  await chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: data.title || 'New Update',
    message: data.body || 'You have a new notification',
    priority: parseInt(data.priority || '1'),
  });
}

async function handleSyncMessage(
  data: Record<string, string>
): Promise<void> {
  // Trigger data sync
  console.log('Sync requested:', data.syncType);
}

async function handleCommandMessage(
  data: Record<string, string>
): Promise<void> {
  console.log('Command received:', data.command);
}
```

### Sending Messages from Extension

While less common, you can also send messages through GCM to other endpoints:

```ts
// lib/gcm-sender.ts
export class GcmSender {
  private applicationId: string;

  constructor(applicationId: string) {
    this.applicationId = applicationId;
  }

  async send(
    destinationId: string,
    data: Record<string, string>
  ): Promise<string> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      chrome.gcm.send(
        {
          destinationId,
          messageId,
          data,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.failed) {
            reject(new Error(`Message failed: ${JSON.stringify(response.failed)}`));
          } else {
            resolve(messageId);
          }
        }
      );
    });
  }
}
```

---

## Pattern 2: Push Notification Pipeline

The push notification pipeline describes the complete flow from server-side push to user-facing notification. Understanding this pipeline is crucial for building reliable notification systems.

### Complete Pipeline Overview

The pipeline consists of several stages:

1. **Server sends push** - Your backend sends a message via FCM/GCM API
2. **Chrome receives push** - Chrome delivers it to your service worker
3. **Service worker processes** - The `chrome.gcm.onMessage` listener handles it
4. **Notification displayed** - `chrome.notifications.create()` shows to user
5. **User interacts** - Click handling opens relevant content

```ts
// lib/push-notification-pipeline.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { Messenger, MessageType } from '@theluckystrike/webext-messaging';

const notificationStorage = createStorage(defineSchema({
  notificationHistory: 'string', // JSON array
  lastNotificationTime: 'number',
}), 'local');

export interface PushNotificationPayload {
  type: 'notification';
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, string>;
}

export class PushNotificationPipeline {
  private messenger: Messenger;

  constructor() {
    this.messenger = new Messenger('notification-pipeline');
  }

  async processIncomingMessage(message: chrome.gcm.Message): Promise<void> {
    const { data, messageId } = message;

    if (!this.isValidNotificationPayload(data)) {
      console.warn('Invalid notification payload:', data);
      return;
    }

    try {
      // Create and display the notification
      const notificationId = await this.createNotification(data);
      
      // Store in history
      await this.addToHistory({
        id: notificationId,
        title: data.title,
        body: data.body,
        timestamp: Date.now(),
        messageId,
      });

      // Track notification metrics
      await this.trackNotificationDisplayed(data);

      console.log('Notification displayed:', notificationId);
    } catch (error) {
      console.error('Failed to process notification:', error);
    }
  }

  private isValidNotificationPayload(
    data: Record<string, string>
  ): boolean {
    return !!(data && (data.title || data.body));
  }

  private async createNotification(
    data: Record<string, string>
  ): Promise<string> {
    const options: chrome.notifications.NotificationOptions = {
      type: 'basic',
      iconUrl: data.iconUrl || chrome.runtime.getURL('icons/icon-128.png'),
      title: data.title || 'Chrome Extension',
      message: data.body || '',
      priority: parseInt(data.priority || '1'),
      eventTime: Date.now(),
    };

    // Add optional properties
    if (data.tag) {
      options.tag = data.tag;
    }

    if (data.requireInteraction === 'true') {
      options.requireInteraction = true;
    }

    if (data.actions) {
      options.buttons = JSON.parse(data.actions);
    }

    return chrome.notifications.create(options);
  }

  private async addToHistory(
    notification: NotificationHistoryItem
  ): Promise<void> {
    const history = JSON.parse(
      await notificationStorage.get('notificationHistory') || '[]'
    );
    
    history.unshift(notification);
    
    // Keep only last 100 notifications
    const trimmed = history.slice(0, 100);
    await notificationStorage.set(
      'notificationHistory',
      JSON.stringify(trimmed)
    );
    await notificationStorage.set('lastNotificationTime', Date.now());
  }

  private async trackNotificationDisplayed(
    data: Record<string, string>
  ): Promise<void> {
    // Track for analytics
    console.log('Notification tracked:', {
      type: 'displayed',
      notificationType: data.notificationType,
      timestamp: Date.now(),
    });
  }
}

interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  messageId: string;
}
```

### Handling Notification Clicks

When users interact with notifications, you need to handle the click events to direct them to relevant content:

```ts
// lib/notification-click-handler.ts
export class NotificationClickHandler {
  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    chrome.notifications.onClicked.addListener(
      this.handleNotificationClicked.bind(this)
    );

    chrome.notifications.onButtonClicked.addListener(
      this.handleNotificationButtonClicked.bind(this)
    );

    chrome.notifications.onClosed.addListener(
      this.handleNotificationClosed.bind(this)
    );
  }

  private async handleNotificationClicked(notificationId: string): Promise<void> {
    console.log('Notification clicked:', notificationId);

    // Parse notification ID to get metadata
    const metadata = this.parseNotificationId(notificationId);

    switch (metadata?.type) {
      case 'message':
        await this.openConversation(metadata.conversationId);
        break;
      case 'alert':
        await this.openAlertDetails(metadata.alertId);
        break;
      case 'sync':
        await this.triggerSyncAndOpen();
        break;
      default:
        await this.openDashboard();
    }
  }

  private async handleNotificationButtonClicked(
    notificationId: string,
    buttonIndex: number
  ): Promise<void> {
    console.log('Button clicked:', notificationId, buttonIndex);

    const metadata = this.parseNotificationId(notificationId);

    if (buttonIndex === 0) {
      // Primary action (e.g., "Reply" for messages)
      if (metadata?.type === 'message') {
        await this.openReplyWindow(metadata.conversationId);
      }
    } else if (buttonIndex === 1) {
      // Secondary action (e.g., "Dismiss")
      console.log('Secondary action triggered');
    }
  }

  private async handleNotificationClosed(
    notificationId: string,
    byUser: boolean
  ): Promise<void> {
    if (byUser) {
      console.log('Notification dismissed by user:', notificationId);
    }
  }

  private parseNotificationId(
    id: string
  ): { type: string; conversationId?: string; alertId?: string } | null {
    try {
      // Notification IDs can encode metadata
      // e.g., "msg_123_conversation_456"
      const parts = id.split('_');
      
      if (parts[0] === 'msg') {
        return {
          type: 'message',
          conversationId: parts[2],
        };
      } else if (parts[0] === 'alert') {
        return {
          type: 'alert',
          alertId: parts[1],
        };
      }

      return { type: 'default' };
    } catch {
      return { type: 'default' };
    }
  }

  private async openConversation(conversationId: string): Promise<void> {
    // Open the extension's main page with conversation context
    const url = chrome.runtime.getURL(
      `index.html#/messages/${conversationId}`
    );
    await chrome.tabs.create({ url, active: true });
  }

  private async openAlertDetails(alertId: string): Promise<void> {
    const url = chrome.runtime.getURL(`index.html#/alerts/${alertId}`);
    await chrome.tabs.create({ url, active: true });
  }

  private async triggerSyncAndOpen(): Promise<void> {
    // Trigger a sync operation
    console.log('Triggering sync...');
    
    const url = chrome.runtime.getURL('index.html#/sync-status');
    await chrome.tabs.create({ url, active: true });
  }

  private async openDashboard(): Promise<void> {
    const url = chrome.runtime.getURL('index.html');
    await chrome.tabs.create({ url, active: true });
  }

  private async openReplyWindow(conversationId: string): Promise<void> {
    const url = chrome.runtime.getURL(
      `index.html#/messages/${conversationId}/reply`
    );
    await chrome.tabs.create({ url, active: true });
  }
}
```

---

## Pattern 3: Registration and Token Management

Proper registration and token management is critical for maintaining reliable push messaging. Registration IDs can expire or become invalid, requiring refresh handling.

### Initial Registration on Install

Register with GCM when the extension is first installed:

```ts
// background/service-worker.ts
import { GcmService } from '../lib/gcm-service';
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const gcmStorage = createStorage(defineSchema({
  lastRegistrationAttempt: 'number',
  registrationRetryCount: 'number',
}), 'sync');

const gcmService = new GcmService(['YOUR_SENDER_ID']); // From Firebase Console

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Extension installed, registering for push...');
    await registerForPush();
  }
});

// Handle extension startup (browser restart)
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension starting up...');
  
  const existingRegistration = await gcmService.getRegistrationId();
  
  if (!existingRegistration) {
    console.log('No existing registration, registering for push...');
    await registerForPush();
  } else {
    console.log('Using existing registration:', existingRegistration);
  }
});

async function registerForPush(): Promise<void> {
  try {
    const registrationId = await gcmService.register();
    
    // Send registration ID to your backend
    await sendRegistrationToServer(registrationId);
    
    console.log('Push registration complete');
  } catch (error) {
    console.error('Failed to register for push:', error);
    
    // Implement retry logic
    await handleRegistrationFailure(error);
  }
}

async function sendRegistrationToServer(registrationId: string): Promise<void> {
  const extensionId = chrome.runtime.id;
  const version = chrome.runtime.getManifest().version;

  // Your backend endpoint to store registration IDs
  const response = await fetch('https://your-api.example.com/push/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registrationId,
      extensionId,
      version,
      platform: 'chrome',
      timestamp: Date.now(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Server registration failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('Server acknowledged registration:', data);
}

async function handleRegistrationFailure(error: Error): Promise<void> {
  const retryCount = await gcmStorage.get('registrationRetryCount') || 0;
  
  if (retryCount < 3) {
    // Retry with exponential backoff
    const delay = Math.pow(2, retryCount) * 1000;
    console.log(`Retrying registration in ${delay}ms...`);
    
    await gcmStorage.set('lastRegistrationAttempt', Date.now());
    await gcmStorage.set('registrationRetryCount', retryCount + 1);
    
    setTimeout(async () => {
      await registerForPush();
    }, delay);
  } else {
    console.error('Max registration retries exceeded');
    await gcmStorage.set('registrationRetryCount', 0);
  }
}
```

### Handling Token Refresh

Registration IDs can change. Implement refresh handling:

```ts
// lib/token-refresh-handler.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const tokenStorage = createStorage(defineSchema({
  registrationId: 'string',
  serverAcknowledged: 'boolean',
  lastRefreshTime: 'number',
}), 'sync');

export class TokenRefreshHandler {
  private gcmService: GcmService;

  constructor(gcmService: GcmService) {
    this.gcmService = gcmService;
    this.setupRefreshListener();
  }

  private setupRefreshListener(): void {
    // GCM can signal when the registration ID needs to be refreshed
    // This typically happens when the server returns a new registration ID
    chrome.gcm.onMessage.addListener(async (message) => {
      if (message.data?.refreshToken === 'true') {
        console.log('Token refresh requested by server');
        await this.refreshRegistration();
      }
    });

    // Also check periodically for token validity
    setInterval(() => this.checkTokenValidity(), 24 * 60 * 60 * 1000); // Daily
  }

  async refreshRegistration(): Promise<void> {
    console.log('Refreshing GCM registration...');
    
    try {
      // Unregister old token
      await this.gcmService.unregister();
      
      // Register for a new token
      const newRegistrationId = await this.gcmService.register();
      
      // Notify server of new token
      await this.notifyServerOfNewToken(newRegistrationId);
      
      console.log('Registration refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh registration:', error);
    }
  }

  private async notifyServerOfNewToken(registrationId: string): Promise<void> {
    const oldRegistrationId = await tokenStorage.get('registrationId');

    await fetch('https://your-api.example.com/push/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldRegistrationId,
        newRegistrationId: registrationId,
        timestamp: Date.now(),
      }),
    });

    await tokenStorage.set('registrationId', registrationId);
    await tokenStorage.set('lastRefreshTime', Date.now());
    await tokenStorage.set('serverAcknowledged', false);
  }

  private async checkTokenValidity(): Promise<void> {
    const registrationId = await tokenStorage.get('registrationId');
    
    if (!registrationId) {
      console.log('No registration ID found');
      return;
    }

    try {
      // Ping your server to verify the token is still valid
      const response = await fetch(
        `https://your-api.example.com/push/validate?registrationId=${registrationId}`
      );

      if (!response.ok) {
        console.log('Token validation failed, refreshing...');
        await this.refreshRegistration();
      } else {
        console.log('Token is valid');
      }
    } catch (error) {
      console.error('Token validation error:', error);
    }
  }
}
```

### Unregister on Extension Uninstall

While you cannot directly detect uninstallation in the service worker, you can use the `chrome.runtime.onInstalled` event with reason 'uninstall' to perform cleanup, though this only fires during update operations:

```ts
// lib/uninstall-handler.ts
export class UninstallHandler {
  private serverEndpoint: string;

  constructor(serverEndpoint: string) {
    this.serverEndpoint = serverEndpoint;
  }

  async handleUninstall(): Promise<void> {
    // This is a best-effort cleanup
    // The service worker may not run long enough to complete this
    
    try {
      // Get stored registration ID
      const registrationId = await this.getStoredRegistrationId();

      if (registrationId) {
        // Notify server to remove this registration
        await fetch(`${this.serverEndpoint}/push/unregister`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            registrationId,
            reason: 'uninstall',
            timestamp: Date.now(),
          }),
        });
      }

      // Clear local storage
      await this.clearLocalStorage();

      console.log('Uninstall cleanup complete');
    } catch (error) {
      console.error('Uninstall cleanup failed:', error);
    }
  }

  private async getStoredRegistrationId(): Promise<string | null> {
    const result = await chrome.storage.sync.get('registrationId');
    return result.registrationId || null;
  }

  private async clearLocalStorage(): Promise<void> {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
  }
}
```

---

## Pattern 4: Message Types and Routing

Different push messages serve different purposes. Implementing proper message routing ensures each message type is handled appropriately.

### Message Type Categories

Push messages generally fall into these categories:

- **Notification messages**: Display content to the user
- **Data messages**: Carry payload for processing without display
- **Mixed messages**: Both notification and data components

```ts
// lib/message-router.ts
import { Messenger, MessageType } from '@theluckystrike/webext-messaging';

export type PushMessageType = 
  | 'notification' 
  | 'data' 
  | 'sync' 
  | 'command' 
  | 'ack';

export interface PushMessage {
  type: PushMessageType;
  priority?: 'high' | 'normal';
  ttl?: number;
  data: Record<string, string>;
}

export class MessageRouter {
  private messenger: Messenger;

  constructor() {
    this.messenger = new Messenger('message-router');
  }

  async routeMessage(message: chrome.gcm.Message): Promise<void> {
    const { data, messageId, from } = message;

    if (!data) {
      console.warn('Received message with no data');
      return;
    }

    // Determine message type
    const messageType = this.determineMessageType(data);

    console.log(`Routing ${messageType} message:`, messageId);

    switch (messageType) {
      case 'notification':
        await this.handleNotificationMessage(data, messageId);
        break;
      case 'data':
        await this.handleDataMessage(data, messageId);
        break;
      case 'sync':
        await this.handleSyncMessage(data, messageId);
        break;
      case 'command':
        await this.handleCommandMessage(data, messageId);
        break;
      case 'ack':
        await this.handleAckMessage(data, messageId);
        break;
      default:
        console.warn('Unknown message type:', messageType);
    }
  }

  private determineMessageType(data: Record<string, string>): PushMessageType {
    if (data.type) {
      return data.type as PushMessageType;
    }

    // Infer type from payload content
    if (data.title || data.body) {
      return 'notification';
    }

    if (data.syncNeeded) {
      return 'sync';
    }

    if (data.command) {
      return 'command';
    }

    return 'data';
  }

  private async handleNotificationMessage(
    data: Record<string, string>,
    messageId: string
  ): Promise<void> {
    await this.displayNotification(data);
  }

  private async handleDataMessage(
    data: Record<string, string>,
    messageId: string
  ): Promise<void> {
    // Process data silently
    console.log('Processing data message:', data);
  }

  private async handleSyncMessage(
    data: Record<string, string>,
    messageId: string
  ): Promise<void> {
    const syncType = data.syncType || 'full';
    console.log(`Sync requested: ${syncType}`);
    
    // Trigger appropriate sync
    await this.performSync(syncType);
  }

  private async handleCommandMessage(
    data: Record<string, string>,
    messageId: string
  ): Promise<void> {
    const command = data.command;
    
    switch (command) {
      case 'refreshConfig':
        await this.refreshConfiguration();
        break;
      case 'clearCache':
        await this.clearCache();
        break;
      case 'updateBadge':
        await this.updateBadge(data.count);
        break;
      default:
        console.warn('Unknown command:', command);
    }
  }

  private async handleAckMessage(
    data: Record<string, string>,
    messageId: string
  ): Promise<void> {
    // Handle acknowledgment from server
    const originalMessageId = data.originalMessageId;
    console.log(`Received ack for message: ${originalMessageId}`);
  }

  private async displayNotification(data: Record<string, string>): Promise<string> {
    return chrome.notifications.create({
      type: 'basic',
      iconUrl: data.iconUrl || chrome.runtime.getURL('icons/icon-128.png'),
      title: data.title || 'Notification',
      message: data.body || '',
      priority: parseInt(data.priority || '1'),
      tag: data.tag,
    });
  }

  private async performSync(syncType: string): Promise<void> {
    console.log(`Performing ${syncType} sync...`);
    // Implementation depends on your sync logic
  }

  private async refreshConfiguration(): Promise<void> {
    console.log('Refreshing configuration...');
  }

  private async clearCache(): Promise<void> {
    console.log('Clearing cache...');
    await chrome.storage.local.clear();
  }

  private async updateBadge(count: string): Promise<void> {
    const numericCount = parseInt(count, 10);
    if (!isNaN(numericCount)) {
      await chrome.action.setBadgeText({ text: String(numericCount) });
    }
  }
}
```

### Priority and TTL Configuration

Message priority and Time-To-Live (TTL) affect delivery behavior:

```ts
// lib/priority-ttl-handler.ts
export interface MessagePriorityConfig {
  priority: 'high' | 'normal';
  ttl: number; // seconds
}

export class PriorityHandler {
  // High priority: immediate delivery, no throttling
  static readonly HIGH_PRIORITY: MessagePriorityConfig = {
    priority: 'high',
    ttl: 0, // Store for 0 seconds if device is offline
  };

  // Normal priority: can be delayed, stored for longer
  static readonly NORMAL_PRIORITY: MessagePriorityConfig = {
    priority: 'normal',
    ttl: 86400, // 24 hours
  };

  // Urgent: for time-sensitive notifications
  static readonly URGENT: MessagePriorityConfig = {
    priority: 'high',
    ttl: 3600, // 1 hour
  };

  // Background sync: low priority, longer storage
  static readonly BACKGROUND_SYNC: MessagePriorityConfig = {
    priority: 'normal',
    ttl: 604800, // 7 days
  };

  static getConfigForMessageType(type: string): MessagePriorityConfig {
    switch (type) {
      case 'notification':
        return PriorityHandler.NORMAL_PRIORITY;
      case 'command':
        return PriorityHandler.HIGH_PRIORITY;
      case 'sync':
        return PriorityHandler.BACKGROUND_SYNC;
      default:
        return PriorityHandler.NORMAL_PRIORITY;
    }
  }

  static shouldDeliverNow(priority: string): boolean {
    return priority === 'high';
  }
}
```

---

## Pattern 5: Offline Message Queue

Messages may arrive when the service worker is not running. Chrome handles some queuing, but implementing your own queue provides better control over processing.

### Understanding Offline Delivery

When the extension is not running, Chrome still receives push messages and will start the service worker to deliver them. However, if the service worker terminates quickly, messages may be lost:

```ts
// lib/offline-queue.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const queueStorage = createStorage(defineSchema({
  pendingMessages: 'string', // JSON array
  processedMessageIds: 'string', // JSON set
  queueRetryCount: 'number',
}), 'local');

export interface QueuedMessage {
  id: string;
  data: Record<string, string>;
  receivedAt: number;
  retries: number;
}

export class OfflineQueue {
  private isProcessing = false;
  private readonly MAX_RETRIES = 3;
  private readonly PROCESS_DELAY = 1000; // ms

  async enqueue(message: chrome.gcm.Message): Promise<void> {
    const { messageId, data } = message;

    // Check for duplicates
    const processedIds = await this.getProcessedIds();
    if (processedIds.has(messageId)) {
      console.log('Duplicate message ignored:', messageId);
      return;
    }

    const queue = await this.getQueue();
    
    // Check if already in queue
    const exists = queue.some((m) => m.id === messageId);
    if (exists) {
      console.log('Message already in queue:', messageId);
      return;
    }

    queue.push({
      id: messageId,
      data,
      receivedAt: Date.now(),
      retries: 0,
    });

    await queueStorage.set('pendingMessages', JSON.stringify(queue));
    console.log(`Message enqueued: ${messageId}, queue size: ${queue.length}`);

    // Try to process immediately
    await this.processQueue();
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const queue = await this.getQueue();

      while (queue.length > 0) {
        const message = queue[0];
        
        try {
          await this.processMessage(message);
          
          // Remove from queue after successful processing
          queue.shift();
          await queueStorage.set('pendingMessages', JSON.stringify(queue));
          
          // Track processed ID for deduplication
          await this.addProcessedId(message.id);
          
          console.log(`Processed queued message: ${message.id}`);
        } catch (error) {
          console.error(`Failed to process message: ${message.id}`, error);
          
          message.retries++;
          
          if (message.retries >= this.MAX_RETRIES) {
            // Remove after max retries
            queue.shift();
            console.error(`Message failed after ${this.MAX_RETRIES} retries: ${message.id}`);
          } else {
            // Move to back of queue for retry
            queue.shift();
            queue.push(message);
          }
          
          await queueStorage.set('pendingMessages', JSON.stringify(queue));
        }

        // Small delay between messages
        await new Promise((resolve) => setTimeout(resolve, this.PROCESS_DELAY));
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processMessage(message: QueuedMessage): Promise<void> {
    // Route to appropriate handler based on message type
    const { data } = message;
    const messageType = data.type || 'notification';

    switch (messageType) {
      case 'notification':
        await this.displayNotification(data);
        break;
      case 'sync':
        await this.performSync(data);
        break;
      case 'command':
        await this.executeCommand(data);
        break;
      default:
        console.log('Processing data message:', data);
    }
  }

  private async displayNotification(data: Record<string, string>): Promise<void> {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: data.title || 'Notification',
      message: data.body || '',
    });
  }

  private async performSync(data: Record<string, string>): Promise<void> {
    console.log('Performing sync for queued message...');
  }

  private async executeCommand(data: Record<string, string>): Promise<void> {
    console.log('Executing command from queue:', data.command);
  }

  private async getQueue(): Promise<QueuedMessage[]> {
    const queueJson = await queueStorage.get('pendingMessages');
    return queueJson ? JSON.parse(queueJson) : [];
  }

  private async getProcessedIds(): Promise<Set<string>> {
    const idsJson = await queueStorage.get('processedMessageIds');
    return idsJson ? new Set(JSON.parse(idsJson)) : new Set();
  }

  private async addProcessedId(id: string): Promise<void> {
    const processed = await this.getProcessedIds();
    processed.add(id);

    // Keep only recent 1000 IDs to prevent unbounded growth
    const idsArray = Array.from(processed).slice(-1000);
    await queueStorage.set('processedMessageIds', JSON.stringify(idsArray));
  }

  async getQueueStatus(): Promise<{
    pending: number;
    processed: number;
  }> {
    const queue = await this.getQueue();
    const processed = await this.getProcessedIds();
    
    return {
      pending: queue.length,
      processed: processed.size,
    };
  }
}
```

### Setting Up Queue Processing on Service Worker Start

Initialize the queue processor when your service worker starts:

```ts
// background/service-worker.ts
import { OfflineQueue } from '../lib/offline-queue';
import { MessageRouter } from '../lib/message-router';

const offlineQueue = new OfflineQueue();
const messageRouter = new MessageRouter();

// Process any pending messages on startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Service worker starting, processing queue...');
  await offlineQueue.processQueue();
});

// Also process on installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/upgraded, processing queue...');
  await offlineQueue.processQueue();
});

// Set up message listener with queue integration
chrome.gcm.onMessage.addListener(async (message) => {
  console.log('Push message received:', message.messageId);
  
  try {
    // Try to process immediately
    await messageRouter.routeMessage(message);
  } catch (error) {
    console.error('Immediate processing failed, queuing:', error);
    
    // Fall back to queue if processing fails
    await offlineQueue.enqueue(message);
  }
});
```

---

## Pattern 6: Two-Way Communication

Push messaging can be bidirectional. While the primary use case is server-to-extension, you can implement request-response patterns and acknowledgments.

### Sending Messages to Server

While GCM is primarily for receiving push, you can implement two-way communication:

```ts
// lib/two-way-communication.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const commStorage = createStorage(defineSchema({
  pendingRequests: 'string', // JSON map
  messageHistory: 'string', // JSON array
}), 'local');

export interface PendingRequest {
  id: string;
  type: string;
  payload: Record<string, string>;
  timestamp: number;
  timeout: number;
}

export class TwoWayCommunicator {
  private readonly SERVER_DESTINATION_ID = 'YOUR_SERVER_SENDER_ID';
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  async sendMessage(
    type: string,
    payload: Record<string, string>
  ): Promise<string> {
    const messageId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: PendingRequest = {
      id: messageId,
      type,
      payload,
      timestamp: Date.now(),
      timeout: this.REQUEST_TIMEOUT,
    };

    // Store pending request
    await this.addPendingRequest(request);

    try {
      await this.sendViaGcm(messageId, type, payload);
      
      // Wait for response
      const response = await this.waitForResponse(messageId);
      
      return response;
    } catch (error) {
      console.error('Two-way communication failed:', error);
      throw error;
    } finally {
      await this.removePendingRequest(messageId);
    }
  }

  private async sendViaGcm(
    messageId: string,
    type: string,
    payload: Record<string, string>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.gcm.send(
        {
          destinationId: this.SERVER_DESTINATION_ID,
          messageId,
          data: {
            ...payload,
            requestId: messageId,
            requestType: type,
            timestamp: String(Date.now()),
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.failed) {
            reject(new Error(`Send failed: ${JSON.stringify(response.failed)}`));
          } else {
            resolve();
          }
        }
      );
    });
  }

  private async waitForResponse(messageId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(async () => {
        // Check if we have a response stored
        const response = await this.getResponse(messageId);
        
        if (response) {
          clearInterval(checkInterval);
          resolve(response);
        } else if (Date.now() - startTime > this.REQUEST_TIMEOUT) {
          clearInterval(checkInterval);
          reject(new Error(`Request timeout: ${messageId}`));
        }
      }, 500);
    });
  }

  handleIncomingResponse(responseMessage: chrome.gcm.Message): void {
    const { data, messageId } = responseMessage;
    const requestId = data.requestId;

    if (requestId) {
      // Store response for waiting request
      this.storeResponse(requestId, data.response);
    }
  }

  private async addPendingRequest(request: PendingRequest): Promise<void> {
    const requests = await this.getPendingRequests();
    requests[request.id] = request;
    await commStorage.set('pendingRequests', JSON.stringify(requests));
  }

  private async removePendingRequest(id: string): Promise<void> {
    const requests = await this.getPendingRequests();
    delete requests[id];
    await commStorage.set('pendingRequests', JSON.stringify(requests));
  }

  private async getPendingRequests(): Promise<Record<string, PendingRequest>> {
    const json = await commStorage.get('pendingRequests');
    return json ? JSON.parse(json) : {};
  }

  private async storeResponse(requestId: string, response: string): Promise<void> {
    const responses = await this.getResponses();
    responses[requestId] = response;
    await commStorage.set('responses', JSON.stringify(responses));
  }

  private async getResponse(requestId: string): Promise<string | null> {
    const responses = await this.getResponses();
    const response = responses[requestId] || null;
    
    // Clear response after reading
    if (response) {
      delete responses[requestId];
      await commStorage.set('responses', JSON.stringify(responses));
    }
    
    return response;
  }

  private async getResponses(): Promise<Record<string, string>> {
    const json = await commStorage.get('responses');
    return json ? JSON.parse(json) : {};
  }
}
```

### Acknowledgment Pattern

Implement acknowledgment to ensure message processing:

```ts
// lib/acknowledgment-handler.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const ackStorage = createStorage(defineSchema({
  unacknowledgedMessages: 'string', // JSON map
}), 'local');

export class AcknowledgmentHandler {
  private readonly ACK_DESTINATION = 'YOUR_SERVER_SENDER_ID';
  private readonly ACK_TIMEOUT = 5000; // 5 seconds

  async sendAcknowledgment(originalMessageId: string): Promise<void> {
    const ackMessageId = `ack_${Date.now()}`;

    return new Promise((resolve, reject) => {
      chrome.gcm.send(
        {
          destinationId: this.ACK_DESTINATION,
          messageId: ackMessageId,
          data: {
            type: 'ack',
            originalMessageId,
            ackTimestamp: String(Date.now()),
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            console.log(`Ack sent for: ${originalMessageId}`);
            resolve();
          }
        }
      );
    });
  }

  async trackMessage(messageId: string): Promise<void> {
    const unacked = await this.getUnacknowledged();
    unacked[messageId] = {
      sentAt: Date.now(),
      retries: 0,
    };
    await ackStorage.set('unacknowledgedMessages', JSON.stringify(unacked));
  }

  async acknowledgeMessage(messageId: string): Promise<void> {
    const unacked = await this.getUnacknowledged();
    delete unacked[messageId];
    await ackStorage.set('unacknowledgedMessages', JSON.stringify(unacked));
  }

  async retryUnacknowledged(): Promise<void> {
    const unacked = await this.getUnacknowledged();
    const now = Date.now();

    for (const [messageId, info] of Object.entries(unacked)) {
      if (now - info.sentAt > this.ACK_TIMEOUT) {
        info.retries++;
        
        if (info.retries < 3) {
          await this.sendAcknowledgment(messageId);
          console.log(`Retrying ack for: ${messageId}`);
        } else {
          console.error(`Ack failed after retries: ${messageId}`);
          delete unacked[messageId];
        }
      }
    }

    await ackStorage.set('unacknowledgedMessages', JSON.stringify(unacked));
  }

  private async getUnacknowledged(): Promise<Record<string, { sentAt: number; retries: number }>> {
    const json = await ackStorage.get('unacknowledgedMessages');
    return json ? JSON.parse(json) : {};
  }
}
```

---

## Pattern 7: Push-Based Data Sync

Push notifications can trigger data synchronization. This pattern minimizes payload size while ensuring data freshness.

### Minimal Push with Full Sync

Instead of sending full data through push, send a signal to trigger a sync:

```ts
// lib/push-sync-service.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const syncStorage = createStorage(defineSchema({
  lastSyncTime: 'number',
  syncVersion: 'string',
  pendingSyncs: 'string', // JSON array
  cacheVersion: 'string',
}), 'sync');

export interface SyncRequest {
  type: 'full' | 'partial' | 'incremental';
  entity?: string;
  timestamp: number;
}

export class PushSyncService {
  async handleSyncPush(data: Record<string, string>): Promise<void> {
    const syncType = (data.syncType || 'full') as SyncRequest['type'];
    const entity = data.entity;
    const serverVersion = data.version;

    console.log(`Sync push received: ${syncType}`, { entity, serverVersion });

    // Check if we need to sync
    if (await this.shouldSync(serverVersion)) {
      await this.queueSync({ type: syncType, entity, timestamp: Date.now() });
      await this.performSync();
    } else {
      console.log('Already at latest version, skipping sync');
    }
  }

  private async shouldSync(serverVersion?: string): Promise<boolean> {
    if (!serverVersion) {
      return true; // Always sync if no version provided
    }

    const cachedVersion = await syncStorage.get('syncVersion');
    return cachedVersion !== serverVersion;
  }

  private async queueSync(request: SyncRequest): Promise<void> {
    const pending = JSON.parse(
      await syncStorage.get('pendingSyncs') || '[]'
    );

    // Avoid duplicate sync requests
    const exists = pending.some(
      (p: SyncRequest) => p.type === request.type && p.entity === request.entity
    );

    if (!exists) {
      pending.push(request);
      await syncStorage.set('pendingSyncs', JSON.stringify(pending));
    }
  }

  async performSync(): Promise<void> {
    const pending = JSON.parse(
      await syncStorage.get('pendingSyncs') || '[]'
    );

    if (pending.length === 0) {
      return;
    }

    console.log(`Processing ${pending.length} sync requests`);

    for (const request of pending) {
      try {
        await this.executeSync(request);
      } catch (error) {
        console.error(`Sync failed for ${request.type}:`, error);
      }
    }

    // Clear pending after processing
    await syncStorage.set('pendingSyncs', JSON.stringify([]));
    await syncStorage.set('lastSyncTime', Date.now());
  }

  private async executeSync(request: SyncRequest): Promise<void> {
    console.log(`Executing ${request.type} sync for:`, request.entity);

    switch (request.type) {
      case 'full':
        await this.fullSync();
        break;
      case 'partial':
        await this.partialSync(request.entity);
        break;
      case 'incremental':
        await this.incrementalSync(request.entity);
        break;
    }
  }

  private async fullSync(): Promise<void> {
    // Fetch all data from server
    const response = await fetch('https://your-api.example.com/sync/full');
    const data = await response.json();

    // Update local storage/cache
    await this.updateLocalCache(data);
    
    console.log('Full sync complete');
  }

  private async partialSync(entity?: string): Promise<void> {
    if (!entity) {
      return;
    }

    const response = await fetch(
      `https://your-api.example.com/sync/partial/${entity}`
    );
    const data = await response.json();

    await this.updatePartialCache(entity, data);
    
    console.log(`Partial sync complete for: ${entity}`);
  }

  private async incrementalSync(entity?: string): Promise<void> {
    const lastSync = await syncStorage.get('lastSyncTime') || 0;

    const response = await fetch(
      `https://your-api.example.com/sync/incremental?since=${lastSync}${
        entity ? `&entity=${entity}` : ''
      }`
    );
    const data = await response.json();

    await this.applyIncrementalChanges(data);
    
    console.log(`Incremental sync complete${entity ? ` for: ${entity}` : ''}`);
  }

  private async updateLocalCache(data: unknown): Promise<void> {
    await chrome.storage.local.set({ extensionData: data });
    await syncStorage.set('cacheVersion', String(Date.now()));
  }

  private async updatePartialCache(entity: string, data: unknown): Promise<void> {
    const key = `extensionData_${entity}`;
    await chrome.storage.local.set({ [key]: data });
  }

  private async applyIncrementalChanges(changes: unknown[]): Promise<void> {
    for (const change of changes) {
      const { operation, key, value } = change as {
        operation: 'set' | 'remove';
        key: string;
        value: unknown;
      };

      if (operation === 'set') {
        await chrome.storage.local.set({ [key]: value });
      } else if (operation === 'remove') {
        await chrome.storage.local.remove(key);
      }
    }
  }

  async getSyncStatus(): Promise<{
    lastSync: number | null;
    pending: number;
  }> {
    const lastSync = await syncStorage.get('lastSyncTime');
    const pending = JSON.parse(
      await syncStorage.get('pendingSyncs') || '[]'
    );

    return {
      lastSync: lastSync || null,
      pending: pending.length,
    };
  }
}
```

### Cache Invalidation

Invalidate caches when server pushes updates:

```ts
// lib/cache-invalidator.ts
export class CacheInvalidator {
  private readonly CACHE_KEYS = [
    'userData',
    'settings',
    'notifications',
    'messages',
  ];

  async handleInvalidationPush(data: Record<string, string>): Promise<void> {
    const invalidateAll = data.invalidateAll === 'true';
    const keys = data.invalidateKeys?.split(',') || [];

    if (invalidateAll) {
      await this.invalidateAllCaches();
    } else if (keys.length > 0) {
      await this.invalidateSpecificCaches(keys);
    }
  }

  private async invalidateAllCaches(): Promise<void> {
    console.log('Invalidating all caches');
    
    for (const key of this.CACHE_KEYS) {
      await chrome.storage.local.remove(key);
    }

    // Also clear indexedDB if used
    await this.clearIndexedDBCaches();
  }

  private async invalidateSpecificCaches(keys: string[]): Promise<void> {
    console.log('Invalidating specific caches:', keys);
    
    for (const key of keys) {
      // Check if it's a known cache key
      if (this.CACHE_KEYS.includes(key)) {
        await chrome.storage.local.remove(key);
      } else {
        // Assume it's a pattern
        await this.invalidateMatchingKeys(key);
      }
    }
  }

  private async invalidateMatchingKeys(pattern: string): Promise<void> {
    const all = await chrome.storage.local.get(null);
    
    for (const key of Object.keys(all)) {
      if (key.includes(pattern)) {
        await chrome.storage.local.remove(key);
      }
    }
  }

  private async clearIndexedDBCaches(): Promise<void> {
    // If using IndexedDB, clear relevant databases
    const databases = ['cacheDB', 'syncDB', 'dataDB'];

    for (const dbName of databases) {
      try {
        await this.clearIndexedDB(dbName);
      } catch (error) {
        console.warn(`Failed to clear IndexedDB ${dbName}:`, error);
      }
    }
  }

  private clearIndexedDB(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
```

---

## Pattern 8: Alternative: Web Push API

The standard Web Push API (Push API) offers an alternative to chrome.gcm, with broader browser support and more modern semantics.

### Comparing GCM and Web Push

| Feature | chrome.gcm | Web Push (Push API) |
|---------|-----------|---------------------|
| Browser Support | Chrome only | Chrome, Firefox, Edge, Opera |
| Authentication | Sender ID only | VAPID keys |
| Payload Size | Limited (~4KB) | Up to ~4KB |
| Encryption | Google-managed | Developer-managed |
| Message Queuing | Automatic | Must implement |
| Require Service Worker | Yes | Yes |

### Using Web Push API

```ts
// lib/web-push-service.ts
export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export class WebPushService {
  private vapidPublicKey: string;

  constructor(vapidPublicKey: string) {
    this.vapidPublicKey = vapidPublicKey;
  }

  async subscribe(): Promise<PushSubscription | null> {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey),
      });

      const pushSubscription = subscription as PushSubscription;
      
      console.log('Web Push subscription successful');
      return pushSubscription;
    } catch (error) {
      console.error('Web Push subscription failed:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Web Push unsubscribed');
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription as PushSubscription | null;
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
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
}

// Service worker: handling push events
```

### Service Worker Push Event Handling

```ts
// background/sw.ts (service worker)
self.addEventListener('push', (event: PushEvent) => {
  console.log('Push event received');

  if (!event.data) {
    console.warn('Push event has no data');
    return;
  }

  const data = event.data.json();

  // Handle different message types
  if (data.type === 'notification') {
    const notificationPromise = self.registration.showNotification(
      data.title || 'Notification',
      {
        body: data.body,
        icon: data.iconUrl || '/icons/icon-128.png',
        badge: '/icons/badge-72.png',
        tag: data.tag,
        data: data.data,
        actions: data.actions?.map((action: string) => ({
          action,
          title: action,
        })),
      }
    );

    event.waitUntil(notificationPromise);
  } else if (data.type === 'sync') {
    // Handle sync without showing notification
    event.waitUntil(handleSync(data));
  }
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('Notification clicked:', event.notification.tag);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );

  event.waitUntil(handleNotificationClick(event));
});

async function handleSync(data: unknown): Promise<void> {
  console.log('Handling sync:', data);
  // Implement your sync logic
}

async function handleNotificationClick(event: NotificationEvent): Promise<void> {
  console.log('Notification click handled:', event.action);
  // Handle notification button clicks
}
```

### VAPID Key Generation and Server-Side Sending

```ts
// lib/vapid-keys.ts
import { webpush } from 'web-push';

// Generate VAPID keys (run once, server-side)
export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const vapidKeys = webpush.generateVAPIDKeys();
  return {
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey,
  };
}

// Server-side push sending
export class WebPushSender {
  private vapidDetails: {
    subject: string;
    publicKey: string;
    privateKey: string;
  };

  constructor(
    subject: string,
    publicKey: string,
    privateKey: string
  ) {
    this.vapidDetails = { subject, publicKey, privateKey };
  }

  async sendPush(
    subscription: PushSubscription,
    payload: Record<string, string>
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
        {
          vapidDetails: this.vapidDetails,
          TTL: 86400, // 24 hours
        }
      );
    } catch (error) {
      if (error.statusCode === 410) {
        // Subscription expired, remove from database
        console.log('Subscription expired');
        throw new Error('Subscription expired');
      }
      throw error;
    }
  }
}
```

---

## Summary Table

| Pattern | Use Case | Key APIs | Complexity |
|---------|----------|----------|------------|
| **Pattern 1: GCM API Basics** | Basic push message sending/receiving | `chrome.gcm.register()`, `chrome.gcm.onMessage`, `chrome.gcm.send()` | Beginner |
| **Pattern 2: Push Notification Pipeline** | Full notification workflow | `chrome.notifications.create()`, notification click handlers | Intermediate |
| **Pattern 3: Registration & Token Management** | Persistent push registration | Storage for tokens, refresh handlers | Intermediate |
| **Pattern 4: Message Types & Routing** | Different message handling | Type-based routing, priority/TTL | Intermediate |
| **Pattern 5: Offline Message Queue** | Reliable message delivery | Local storage queue, deduplication | Advanced |
| **Pattern 6: Two-Way Communication** | Request-response patterns | Ack handlers, response tracking | Advanced |
| **Pattern 7: Push-Based Data Sync** | Efficient data updates | Minimal push + full sync, cache invalidation | Advanced |
| **Pattern 8: Web Push API** | Cross-browser support | Push API, VAPID authentication | Advanced |

### Key Takeaways

1. **Start with Pattern 1** to understand the fundamentals before implementing complex patterns
2. **Use Pattern 3** for production-ready registration handling
3. **Implement Pattern 5** if reliable message delivery is critical
4. **Consider Pattern 8** for cross-browser extension support
5. **Combine patterns** as needed — most production extensions use multiple patterns together

### Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Chrome GCM API Reference](https://developer.chrome.com/docs/extensions/reference/gcm/)
- [Web Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Push API W3C Spec](https://www.w3.org/TR/push-api/)

---

## Related Patterns

- [Notification Patterns](notification-patterns.md) — Detailed notification display and interaction
- [Data Sync](data-sync.md) — Comprehensive data synchronization strategies
- [Service Worker Lifecycle](service-worker-lifecycle.md) — Understanding service worker behavior
- [Storage Patterns](storage-api-deep-dive.md) — Using storage effectively
