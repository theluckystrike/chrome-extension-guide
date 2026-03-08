---
layout: default
title: "Chrome Extension Event Driven Messaging — Best Practices"
description: "Design event-driven architectures for extension components."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/event-driven-messaging/"
---

# Event-Driven Messaging Patterns

## Overview {#overview}

While Chrome extensions primarily use request-response messaging via `chrome.runtime.sendMessage`, many extension architectures benefit from event-driven patterns. These patterns decouple producers from consumers, enable one-to-many broadcasts, and support complex message flows. This guide covers pub/sub, event bus, and command patterns that scale beyond simple request-response.

## Typed Message Bus with Discriminated Unions {#typed-message-bus-with-discriminated-unions}

Define message types as discriminated unions for type-safe routing:

```typescript
// types/messages.ts
type Message =
  | { type: 'FETCH_REQUEST'; payload: { url: string } }
  | { type: 'DATA_RECEIVED'; payload: { data: unknown } }
  | { type: 'ERROR'; payload: { error: string; context: string } }
  | { type: 'STATE_CHANGE'; payload: { key: string; value: unknown } };

// Typed message router
class MessageRouter {
  private handlers = new Map<string, (msg: Message, sender: chrome.runtime.MessageSender) => void | Promise<void>>();

  register<T extends Message['type']>(
    type: T,
    handler: (msg: Extract<Message, { type: T }>, sender: chrome.runtime.MessageSender) => void | Promise<void>
  ) {
    this.handlers.set(type, handler as any);
  }

  async handle(message: Message, sender: chrome.runtime.MessageSender): Promise<boolean> {
    const handler = this.handlers.get(message.type);
    if (!handler) {
      console.warn(`No handler for message type: ${message.type}`);
      return false;
    }
    await handler(message, sender);
    return true;
  }
}

const router = new MessageRouter();

router.register('DATA_RECEIVED', async (msg) => {
  console.log('Received data:', msg.payload.data);
});

router.register('ERROR', async (msg) => {
  console.error(`Error in ${msg.payload.context}:`, msg.payload.error);
});
```

## Pub/Sub Pattern for Broadcasts {#pubsub-pattern-for-broadcasts}

Publish-subscribe enables one event to reach multiple listeners across contexts:

```typescript
// lib/event-bus.ts
type Subscriber = (data: unknown) => void | Promise<void>;

class EventBus {
  private topics = new Map<string, Set<Subscriber>>();

  subscribe(topic: string, callback: Subscriber): () => void {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic)!.add(callback);
    return () => this.topics.get(topic)?.delete(callback);
  }

  async publish(topic: string, data: unknown): Promise<void> {
    const subscribers = this.topics.get(topic);
    if (!subscribers) return;
    
    await Promise.all(
      Array.from(subscribers).map(fn => Promise.resolve(fn(data)))
    );
  }
}

const globalEvents = new EventBus();

// In service worker - broadcast to all contexts
async function broadcastConfigUpdate(config: Config) {
  await globalEvents.publish('CONFIG_UPDATED', config);
  // Also send via Chrome messaging to ensure delivery
  chrome.runtime.sendMessage({
    type: 'BROADCAST',
    topic: 'CONFIG_UPDATED',
    payload: config
  });
}
```

## Message Routing: Type-Based Dispatch {#message-routing-type-based-dispatch}

Replace verbose if/else chains with a routing registry:

```typescript
// lib/message-dispatcher.ts
type MessageHandler<T = unknown> = (
  payload: T,
  sender: chrome.runtime.MessageSender
) => unknown;

interface RouteDefinition {
  type: string;
  handler: MessageHandler;
  validator?: (payload: unknown) => boolean;
}

class MessageDispatcher {
  private routes = new Map<string, MessageHandler>();

  register(def: RouteDefinition): void {
    this.routes.set(def.type, def.handler);
  }

  dispatch(msg: { type: string; payload?: unknown }, sender: chrome.runtime.MessageSender) {
    const handler = this.routes.get(msg.type);
    if (!handler) {
      throw new Error(`Unknown message type: ${msg.type}`);
    }
    return handler(msg.payload, sender);
  }
}

// Registration
const dispatcher = new MessageDispatcher();

dispatcher.register({
  type: 'GET_TABS',
  handler: async (_, sender) => {
    const tabs = await chrome.tabs.query({});
    return { tabs };
  }
});

dispatcher.register({
  type: 'SAVE_BOOKMARK',
  handler: async (payload: { url: string; title: string }) => {
    return await bookmarkService.save(payload);
  }
});

// Usage
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    const result = dispatcher.dispatch(msg, sender);
    sendResponse({ success: true, data: result });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
  return true; // Async response
});
```

## Middleware Pattern for Cross-Cutting Concerns {#middleware-pattern-for-cross-cutting-concerns}

Apply middleware for logging, auth, rate limiting:

```typescript
// lib/middleware.ts
type Next = () => Promise<void> | void;

interface MessageContext {
  message: { type: string; payload?: unknown };
  sender: chrome.runtime.MessageSender;
  handled: boolean;
}

type Middleware = (ctx: MessageContext, next: Next) => Promise<void> | void;

// Logging middleware
const loggingMiddleware: Middleware = async (ctx, next) => {
  console.log(`[${ctx.message.type}] from:`, ctx.sender.tab?.id);
  const start = performance.now();
  await next();
  console.log(`[${ctx.message.type}] completed in ${performance.now() - start}ms`);
};

// Auth middleware
const authMiddleware: Middleware = async (ctx, next) => {
  const allowedTypes = ['GET_CONFIG', 'GET_STATE'];
  if (!allowedTypes.includes(ctx.message.type)) {
    if (!ctx.sender.url?.includes('extension://')) {
      throw new Error('Unauthorized');
    }
  }
  await next();
};

// Rate limiting middleware
const rateLimiter = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 10;
const WINDOW_MS = 60000;

const rateLimitMiddleware: Middleware = async (ctx, next) => {
  const key = `${ctx.sender.tab?.id}:${ctx.message.type}`;
  const now = Date.now();
  const record = rateLimiter.get(key);
  
  if (!record || now > record.reset) {
    rateLimiter.set(key, { count: 1, reset: now + WINDOW_MS });
  } else if (record.count >= RATE_LIMIT) {
    throw new Error('Rate limit exceeded');
  } else {
    record.count++;
  }
  await next();
};

// Apply middleware chain
async function processWithMiddleware(ctx: MessageContext) {
  const middleware = [loggingMiddleware, authMiddleware, rateLimitMiddleware];
  let idx = 0;
  
  const next = async () => {
    idx++;
    if (idx < middleware.length) {
      await middleware[idx](ctx, next);
    }
  };
  
  await middleware[0](ctx, next);
}
```

## Port-Based Streaming Channels {#port-based-streaming-channels}

For continuous data streams, use ports instead of one-time messages:

```typescript
// lib/stream-channel.ts
class StreamChannel {
  private ports = new Map<string, chrome.runtime.Port>();

  connect(name: string): chrome.runtime.Port {
    const port = chrome.runtime.connect({ name });
    this.ports.set(name, port);
    return port;
  }

  broadcast(name: string, data: unknown): void {
    const port = this.ports.get(name);
    if (port) {
      port.postMessage(data);
    }
  }

  onMessage(name: string, callback: (data: unknown) => void): void {
    const port = this.ports.get(name);
    if (port) {
      port.onMessage.addListener(callback);
    }
  }
}

const streams = new StreamChannel();

// Content script - subscribe to live updates
const port = streams.connect('live-data');
streams.onMessage('live-data', (data) => {
  updateUI(data);
});

// Background - push updates
setInterval(() => {
  streams.broadcast('live-data', { timestamp: Date.now() });
}, 1000);
```

## Error Propagation Across Contexts {#error-propagation-across-contexts}

Ensure errors are properly propagated and handled:

```typescript
// lib/error-handling.ts
type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

async function safeMessageHandler(
  handler: () => Promise<unknown>
): Promise<Result<unknown>> {
  try {
    const value = await handler();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  const result = await safeMessageHandler(() => dispatcher.dispatch(msg, sender));
  
  if (result.ok) {
    sendResponse({ success: true, data: result.value });
  } else {
    // Propagate error to sender context
    sendResponse({ 
      success: false, 
      error: result.error.message,
      code: result.error.code 
    });
  }
  return true;
});
```

## Cross-Context State Synchronization {#cross-context-state-synchronization}

Maintain consistent state across all extension contexts:

```typescript
// lib/state-sync.ts
class StateSync {
  private storage = new Map<string, unknown>();

  async init(): Promise<void> {
    const stored = await chrome.storage.local.get(null);
    Object.entries(stored).forEach(([k, v]) => this.storage.set(k, v));
  }

  async set(key: string, value: unknown): Promise<void> {
    this.storage.set(key, value);
    await chrome.storage.local.set({ [key]: value });
    // Broadcast to all contexts
    await this.broadcast('STATE_CHANGE', { key, value });
  }

  get<T>(key: string): T | undefined {
    return this.storage.get(key) as T;
  }

  private async broadcast(type: string, payload: unknown): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ type, payload });
    } catch {
      // Ignore errors from contexts that aren't listening
    }
  }
}
```

## Related Resources {#related-resources}

- [Message Passing Patterns Reference](../reference/message-passing-patterns.md)
- [Advanced Messaging Tutorial](../tutorials/advanced-messaging.md)
- [Message Passing Best Practices](../guides/message-passing-best-practices.md)
- [Cross-Context State](./cross-context-state.md)
- [Tab Communication Patterns](./tab-communication.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
