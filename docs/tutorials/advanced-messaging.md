---
layout: default
title: "Chrome Extension Advanced Messaging. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/advanced-messaging/"
last_modified_at: 2026-01-15
---
Advanced Messaging Patterns with @theluckystrike/webext-messaging

Prerequisites {#prerequisites}
- Read `docs/tutorials/messaging-quickstart.md` first
- `npm install @theluckystrike/webext-messaging`

1. Defining a Complete MessageMap {#1-defining-a-complete-messagemap}
- The `MessageMap` type is the foundation. define ALL your extension's messages in one place:
  ```typescript
  import { createMessenger } from '@theluckystrike/webext-messaging';

  type AppMessages = {
    // Simple request/response
    getUser: { request: { id: string }; response: { name: string; email: string } };
    // Request with no payload
    getSettings: { request: void; response: Settings };
    // Fire-and-forget (response is void)
    logEvent: { request: { event: string; data: unknown }; response: void };
    // Tab-specific messaging
    highlightText: { request: { selector: string; color: string }; response: { count: number } };
  };
  ```

2. Background Service Worker as Message Hub {#2-background-service-worker-as-message-hub}
- Create messenger in background.ts and register handlers:
  ```typescript
  const messenger = createMessenger<AppMessages>();

  messenger.onMessage('getUser', async (request) => {
    const user = await db.getUser(request.id);
    return user; // Type-checked: must return { name: string; email: string }
  });

  messenger.onMessage('getSettings', async () => {
    return await storage.getAll();
  });

  messenger.onMessage('logEvent', async (request) => {
    analytics.track(request.event, request.data);
    // void return. no response needed
  });
  ```

3. Sending Messages from Content Scripts {#3-sending-messages-from-content-scripts}
- Content scripts use `sendMessage` to reach background:
  ```typescript
  const messenger = createMessenger<AppMessages>();

  // Fully typed. request and response both checked
  const user = await messenger.sendMessage('getUser', { id: '123' });
  console.log(user.name); // TypeScript knows this is string
  ```

4. Sending Messages to Specific Tabs {#4-sending-messages-to-specific-tabs}
- Background can target specific tabs with `sendTabMessage`:
  ```typescript
  // Send to a specific tab's content script
  const result = await messenger.sendTabMessage(tabId, 'highlightText', {
    selector: '.important',
    color: '#ff0',
  });
  console.log(`Highlighted ${result.count} elements`);
  ```

5. Error Handling with MessagingError {#5-error-handling-with-messagingerror}
- All messaging failures throw `MessagingError`:
  ```typescript
  import { MessagingError } from '@theluckystrike/webext-messaging';

  try {
    const user = await messenger.sendMessage('getUser', { id: '123' });
  } catch (error) {
    if (error instanceof MessagingError) {
      console.error('Message failed:', error.message);
      console.error('Original error:', error.originalError);
      // Handle: tab closed, extension reloaded, handler threw, etc.
    }
  }
  ```

6. Using Standalone Functions {#6-using-standalone-functions}
- For one-off messages without creating a messenger instance:
  ```typescript
  import { sendMessage, sendTabMessage, onMessage } from '@theluckystrike/webext-messaging';

  // These work the same but without type-safety from MessageMap
  const response = await sendMessage('getUser', { id: '123' });
  onMessage('logEvent', async (request) => { /* ... */ });
  ```

7. Patterns: Request/Response vs Fire-and-Forget {#7-patterns-requestresponse-vs-fire-and-forget}
- Request/Response: handler returns a value, sender `await`s it
- Fire-and-forget: handler returns `void`, sender can `await` for confirmation or just call without `await`
- Broadcast: background sends to all tabs by iterating `chrome.tabs.query({})` + `sendTabMessage`

8. Real-World Example: Bookmark Manager {#8-real-world-example-bookmark-manager}
- Full working example using typed messages between popup, background, and content script
- MessageMap with 4+ message types
- Shows the complete flow: user clicks popup button -> sends message to background -> background fetches data -> sends to content script -> content script updates page

Common Mistakes {#common-mistakes}
- Forgetting to register the handler before sending a message
- Not handling the case where a tab's content script hasn't loaded yet
- Using `sendTabMessage` to a tab that doesn't have a content script. always catch `MessagingError`
- Defining mismatched types between sender and handler (TypeScript catches this at compile time with MessageMap)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
