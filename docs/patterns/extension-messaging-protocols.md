---
layout: default
title: "Chrome Extension Extension Messaging Protocols — Best Practices"
description: "Design message passing protocols between extension components."
---

# Extension Messaging Protocols

Designing structured messaging protocols for Chrome extensions ensures type-safe, maintainable communication between content scripts, background scripts, and popup pages.

## Typed Message Protocol with Discriminated Unions

Use discriminated unions for type-safe message routing:

```typescript
// Shared types (in a common package or content script)
type MessageType = 
  | { type: 'GET_STATE'; payload: undefined }
  | { type: 'UPDATE_STATE'; payload: { changes: StateUpdate } }
  | { type: 'STREAM_DATA'; payload: { correlationId: string } };

type Response<T extends MessageType> = 
  | { success: true; data: T['payload'] }
  | { success: false; error: ErrorCode };
```

## Request-Response Pattern

Standardize all responses with success/error shape:

```typescript
interface Response<T> {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
}
```

## Versioning for Forward Compatibility

Include protocol version in every message:

```typescript
interface ProtocolMessage<T> {
  version: number;
  type: string;
  payload: T;
  timestamp: number;
}
```

## Standardized Error Codes

Define a consistent error code enum:

```typescript
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

## Message Router

Create a type-safe router for handling messages:

```typescript
type MessageHandler<T extends MessageType> = (
  payload: T['payload']
) => Promise<ResponsePayload<T>>;

const router: Record<string, MessageHandler<any>> = {
  GET_STATE: async ({}) => ({ success: true, data: currentState }),
  UPDATE_STATE: async ({ changes }) => {
    applyChanges(changes);
    return { success: true, data: { applied: true } };
  },
};
```

## Timeout Handling with AbortController

Implement reliable request-response with timeouts:

```typescript
async function sendWithTimeout<T>(
  message: MessageType,
  timeoutMs = 5000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    return await browser.runtime.sendMessage(message);
  } finally {
    clearTimeout(timeout);
  }
}
```

## Message Logging Interceptor

Add debugging and audit capabilities:

```typescript
const loggingInterceptor = (handler: Function) => async (msg: Message) => {
  console.log(`[MSG] ${msg.type}:`, msg.payload);
  const start = performance.now();
  const result = await handler(msg);
  console.log(`[MSG] ${msg.type} completed in ${performance.now() - start}ms`);
  return result;
};
```

## Cross-Reference

- [Message Passing Patterns](../reference/message-passing-patterns.md)
- [Event-Driven Messaging](./event-driven-messaging.md)
- [Message Passing Best Practices](../guides/message-passing-best-practices.md)
