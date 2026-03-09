---
layout: default
title: "Secure Message Passing in Chrome Extensions: Validate, Sanitize, and Authenticate"
description: "Master secure message passing in Chrome extensions with this comprehensive guide covering sender validation, schema validation with Zod and Joi, port-based connections, native messaging security, cross-origin restrictions, replay prevention, and TypeScript type safety patterns."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-secure-message-passing/"
---

# Secure Message Passing in Chrome Extensions: Validate, Sanitize, and Authenticate

Message passing is the backbone of Chrome extension architecture, enabling communication between content scripts, background service workers, popups, side panels, and offscreen documents. However, with great communication comes significant security responsibility. Improperly secured message passing can expose your extension to cross-site scripting attacks, privilege escalation, data exfiltration, and remote code execution. This guide provides comprehensive security patterns for building message passing systems that validate, sanitize, and authenticate every piece of data flowing through your extension.

Chrome extensions operate at a unique intersection of trust boundaries. Your extension communicates with potentially malicious web pages through content scripts, handles messages from external websites via externally_connectable, and may exchange data with native applications through native messaging. Each of these communication channels requires different security considerations, and failing to properly secure any single channel can compromise your entire extension. Understanding these attack surfaces and implementing defense-in-depth strategies is essential for building extensions that protect user data and maintain user trust.

## Understanding Message Passing Security Risks

Before diving into implementation patterns, it's crucial to understand the various attack vectors that target extension message passing. Chrome extensions face security threats that differ significantly from traditional web applications, and the consequences of vulnerabilities can be far more severe due to the privileged nature of extension APIs.

### The Trust Boundary Problem

Chrome extensions occupy a unique position in the browser security model. Your background service worker has access to powerful APIs that can read all browser tabs, modify network requests, access cookies, and manage downloads. Content scripts run in the context of web pages but share the DOM with potentially malicious page scripts. When your extension receives messages from content scripts, you're essentially receiving data from untrusted sources—the web pages your users visit.

This creates a fundamental trust boundary challenge. Every message entering your extension from a content script or external source must be treated as potentially malicious. Attackers may attempt to exploit message handlers by sending specially crafted payloads designed to trigger buffer overflows, inject malicious code, or manipulate extension state in unexpected ways. The extension's privileged APIs make these attacks particularly dangerous—an attacker who compromises your message handling logic may gain access to sensitive user data or the ability to perform actions on behalf of the user across any website.

### Common Vulnerability Types

Several vulnerability types commonly affect extension message passing systems. **Injection vulnerabilities** occur when message data is used without proper sanitization, allowing attackers to inject malicious scripts or HTML into extension UI. **Authentication bypass** happens when message senders aren't properly validated, enabling attackers to send messages that appear to originate from trusted extension components. **Message replay attacks** exploit the lack of unique identifiers or timestamps in messages, allowing attackers to resend previously captured valid messages. **Schema confusion** occurs when extensions accept messages without validating their structure, causing unexpected behavior when attackers send messages with unusual formats.

Each of these vulnerabilities can lead to serious security breaches. Injection attacks can compromise your extension's popup or options page, stealing session cookies or performing actions on behalf of the user. Authentication bypass can allow external websites to trigger privileged extension actions. Understanding these risks underscores the importance of implementing comprehensive security measures at every layer of your message handling system.

## Sender Validation: Knowing Who Sent Your Messages

The foundational security measure for extension message passing is sender validation. Before processing any message, your extension must verify that the message originated from a trusted source. Chrome provides several mechanisms for validating message sender identity, and understanding how to use these correctly is essential for security.

### Validating Content Script Senders

Content scripts operate in the context of web pages, which means any message from a content script could potentially originate from a compromised or malicious page. Chrome addresses this through the sender property available in message listeners. The sender object contains information about the context that sent the message, including the tab ID, URL, and frame ID.

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender exists
  if (!sender || !sender.tab) {
    console.error('Message without sender tab rejected');
    return false;
  }

  // Verify the message originated from your extension's context
  // Content scripts from your extension have the extension ID in the sender
  if (sender.id && sender.id !== chrome.runtime.id) {
    console.error('Message from unknown extension rejected');
    return false;
  }

  // For additional security, verify the URL matches expected patterns
  const allowedPatterns = [
    /^https:\/\/yourdomain\.com\//,
    /^https:\/\/app\.yourdomain\.io\//
  ];

  const senderUrl = sender.tab.url;
  const isAllowed = allowedPatterns.some(pattern => pattern.test(senderUrl));

  if (!isAllowed) {
    console.error('Message from unauthorized URL rejected:', senderUrl);
    return false;
  }

  // Process validated message
  handleMessage(message, sender);
  return true;
});
```

This pattern validates that messages come from your extension's content scripts running in authorized contexts. The sender.tab.url check is particularly important because it verifies the page where the content script is running, preventing attackers from loading your content script on malicious pages and sending messages through it.

### Validating External Web Page Senders

When using externally_connectable in your manifest, your extension accepts messages from specific websites. These messages require even stricter validation because they originate entirely outside your extension's control.

```typescript
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  // External messages always require explicit sender validation
  if (!sender || !sender.url) {
    sendResponse({ error: 'Unauthorized sender' });
    return false;
  }

  const url = new URL(sender.url);

  // Whitelist-based validation - only accept from known domains
  const authorizedDomains = ['trusted-partner.com', 'app.yourservice.com'];
  if (!authorizedDomains.includes(url.hostname)) {
    console.warn('Rejected message from:', url.hostname);
    sendResponse({ error: 'Domain not authorized' });
    return false;
  }

  // Implement origin-based authentication for additional security
  // External websites should register their origins with your extension
  const registeredOrigins = getRegisteredOrigins(); // Your validation logic
  if (!registeredOrigins.has(url.origin)) {
    sendResponse({ error: 'Origin not registered' });
    return false;
  }

  handleExternalMessage(message, sender);
  return true;
});
```

This approach implements defense in depth by validating both the domain and the specific origin. Whitelisting domains provides a first layer of protection, while origin registration adds an additional verification step that can be managed dynamically.

## Message Schema Validation with Zod and Joi

Beyond sender validation, every message should be validated for structure and content before processing. Schema validation libraries like Zod and Joi provide powerful tools for ensuring messages conform to expected formats, preventing type confusion attacks and unexpected behavior.

### Implementing Zod Schema Validation

Zod offers excellent TypeScript integration, making it ideal for extension projects that use TypeScript. Define schemas that precisely describe the expected message structure, including type constraints and validation rules.

```typescript
import { z } from 'zod';

// Define message schemas for different message types
const UserActionSchema = z.object({
  type: z.literal('user-action'),
  action: z.enum(['click', 'scroll', 'submit', 'navigate']),
  target: z.string().min(1).max(200),
  timestamp: z.number().int().positive(),
  metadata: z.record(z.string()).optional()
});

const DataRequestSchema = z.object({
  type: z.literal('data-request'),
  endpoint: z.string().startsWith('/api/'),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  requestId: z.string().uuid()
});

const ExtensionCommandSchema = z.object({
  type: z.literal('command'),
  command: z.string().min(1).max(50),
  args: z.array(z.unknown()).max(10),
  source: z.enum(['popup', 'options', 'background', 'content'])
});

// Union type for all possible message types
const MessageSchema = z.discriminatedUnion('type', [
  UserActionSchema,
  DataRequestSchema,
  ExtensionCommandSchema
]);

// Type inference for TypeScript
type ValidMessage = z.infer<typeof MessageSchema>;

// Validation wrapper with error handling
function validateMessage(data: unknown): ValidMessage {
  const result = MessageSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    throw new ValidationError(`Invalid message: ${errors.join(', ')}`, errors);
  }

  return result.data;
}

// Message handler with validation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    const validatedMessage = validateMessage(message);
    processMessage(validatedMessage, sender);
    sendResponse({ success: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      sendResponse({ error: error.message, details: error.errors });
    } else {
      sendResponse({ error: 'Internal validation error' });
    }
  }

  return true; // Keep channel open for async response
});
```

This schema validation approach provides multiple security benefits. The discriminated union ensures messages have a valid type field, preventing attackers from sending messages with unexpected structures. The literal types for type fields prevent type confusion attacks where attackers might try to send messages that match multiple schemas. Length limits on string fields prevent buffer-related vulnerabilities, and the maximum array length prevents denial-of-service attacks through oversized messages.

### Implementing Joi Schema Validation

For projects using JavaScript or preferring Joi's API, similar validation patterns apply:

```javascript
const Joi = require('joi');

// Schema definitions
const messageSchema = Joi.object({
  type: Joi.string().valid('action', 'request', 'command').required(),
  payload: Joi.object().required(),
  timestamp: Joi.number().integer().positive().required(),
  nonce: Joi.string().uuid().required() // Prevent replay attacks
}).required();

const actionPayloadSchema = Joi.object({
  action: Joi.string().valid('fetch', 'store', 'delete').required(),
  data: Joi.any(),
  target: Joi.string().pattern(/^[a-z][a-z0-9-]{0,50}$/)
});

const requestPayloadSchema = Joi.object({
  endpoint: Joi.string().pattern(/^\/api\/[a-z\/]+$/).required(),
  method: Joi.string().valid('GET', 'POST').required(),
  params: Joi.object()
});

// Validation function
function validateMessage(message) {
  const { error, value } = messageSchema.validate(message);

  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  // Additional payload-specific validation
  let payloadValidation;
  switch (value.type) {
    case 'action':
      payloadValidation = actionPayloadSchema.validate(value.payload);
      break;
    case 'request':
      payloadValidation = requestPayloadSchema.validate(value.payload);
      break;
    default:
      throw new ValidationError('Unknown message type');
  }

  if (payloadValidation.error) {
    throw new ValidationError(payloadValidation.error.details[0].message);
  }

  return payloadValidation.value;
}
```

Joi's flexible validation rules make it easy to implement complex validation logic. The pattern validations for endpoints and targets ensure that requests target only expected paths, preventing path traversal and injection attacks.

## Port-Based Long-Lived Connections Security

Port-based connections provide persistent communication channels between extension components. While they offer advantages for real-time communication, they require additional security considerations beyond one-time message passing.

### Secure Port Implementation

```typescript
class SecurePortManager {
  private ports: Map<number, chrome.runtime.Port> = new Map();
  private messageIds: Set<string> = new Set();
  private readonly ID_TIMEOUT = 60000; // 1 minute

  constructor() {
    this.setupPortListeners();
  }

  private setupPortListeners(): void {
    chrome.runtime.onConnect.addListener((port) => {
      if (!this.validatePortConnection(port)) {
        port.disconnect();
        return;
      }

      const tabId = port.sender?.tab?.id;
      if (tabId) {
        this.ports.set(tabId, port);
      }

      port.onMessage.addListener((message) => {
        this.handlePortMessage(message, port);
      });

      port.onDisconnect.addListener(() => {
        if (tabId) {
          this.ports.delete(tabId);
        }
      });
    });
  }

  private validatePortConnection(port: chrome.runtime.Port): boolean {
    // Validate sender
    if (!port.sender || !port.sender.tab) {
      return false;
    }

    // Validate extension context
    if (port.sender.id !== chrome.runtime.id) {
      return false;
    }

    // Validate connection name for port-specific security
    const allowedPortNames = ['content-script', 'popup-panel', 'offscreen-worker'];
    if (!allowedPortNames.includes(port.name)) {
      console.warn('Unknown port connection:', port.name);
      return false;
    }

    return true;
  }

  private handlePortMessage(message: unknown, port: chrome.runtime.Port): void {
    // Validate message structure
    if (!this.isValidMessageFormat(message)) {
      port.postMessage({ error: 'Invalid message format' });
      return;
    }

    const msg = message as { id?: string; type: string; payload: unknown };

    // Message replay prevention
    if (msg.id) {
      if (this.messageIds.has(msg.id)) {
        port.postMessage({ error: 'Duplicate message ID', id: msg.id });
        return;
      }
      this.messageIds.add(msg.id);

      // Cleanup old IDs
      setTimeout(() => this.messageIds.delete(msg.id), this.ID_TIMEOUT);
    }

    // Process validated message
    this.processPortMessage(msg, port);
  }

  private isValidMessageFormat(message: unknown): boolean {
    if (typeof message !== 'object' || message === null) {
      return false;
    }

    const msg = message as Record<string, unknown>;
    return (
      typeof msg.type === 'string' &&
      msg.type.length > 0 &&
      msg.type.length < 50
    );
  }

  private processPortMessage(message: { type: string; payload: unknown }, port: chrome.runtime.Port): void {
    // Handle specific message types
    switch (message.type) {
      case 'ping':
        port.postMessage({ type: 'pong', timestamp: Date.now() });
        break;
      case 'data-request':
        this.handleDataRequest(message.payload, port);
        break;
      default:
        port.postMessage({ error: 'Unknown message type' });
    }
  }

  private handleDataRequest(payload: unknown, port: chrome.runtime.Port): void {
    // Validate and process data requests
    const request = payload as { endpoint?: string };
    if (!request.endpoint || !request.endpoint.startsWith('/api/')) {
      port.postMessage({ error: 'Invalid endpoint' });
      return;
    }

    // Process request...
  }
}
```

This implementation includes several critical security features. The validatePortConnection method ensures only legitimate extension components can establish ports. The message ID tracking prevents replay attacks by rejecting duplicate message identifiers within a time window. The format validation ensures messages meet basic structural requirements before processing.

## Native Messaging Security

Native messaging allows extensions to communicate with applications installed on the user's computer. This powerful capability requires strict security measures because it bridges the browser sandbox with the local system.

### Secure Native Messaging Implementation

```typescript
interface NativeMessage {
  type: string;
  action: string;
  params: Record<string, unknown>;
  requestId: string;
  timestamp: number;
}

class SecureNativeMessaging {
  private readonly NATIVE_APP_NAME = 'com.yourextension.secureapp';
  private allowedActions = new Set([
    'get-user-data',
    'save-document',
    'validate-license'
  ]);

  async sendToNative(message: NativeMessage): Promise<unknown> {
    // Validate message before sending
    this.validateNativeMessage(message);

    try {
      const response = await chrome.runtime.sendNativeMessage(
        this.NATIVE_APP_NAME,
        message
      );

      return this.validateNativeResponse(response);
    } catch (error) {
      console.error('Native messaging error:', error);
      throw new Error('Native communication failed');
    }
  }

  private validateNativeMessage(message: NativeMessage): void {
    // Validate action is whitelisted
    if (!this.allowedActions.has(message.action)) {
      throw new Error(`Action not allowed: ${message.action}`);
    }

    // Validate timestamp to prevent replay
    const now = Date.now();
    const messageAge = now - message.timestamp;
    if (messageAge > 30000) { // 30 second timeout
      throw new Error('Message expired');
    }

    // Validate request ID format
    if (!/^[a-zA-Z0-9-]{8,}$/.test(message.requestId)) {
      throw new Error('Invalid request ID');
    }
  }

  private validateNativeResponse(response: unknown): unknown {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format');
    }

    const resp = response as Record<string, unknown>;

    // Validate response structure
    if (!resp.requestId || !resp.success) {
      throw new Error('Invalid response structure');
    }

    // Validate response data if present
    if (resp.data !== undefined) {
      if (typeof resp.data !== 'object') {
        throw new Error('Invalid response data type');
      }
    }

    return response;
  }
}
```

Native messaging security requires validating both outgoing messages and incoming responses. The action whitelist prevents attackers from exploiting native messaging to perform arbitrary operations. The timestamp validation prevents replay attacks where captured messages might be resent. Response validation ensures the native application returns expected data structures.

## Cross-Origin and Externally Connectable Restrictions

Chrome's externally_connectable manifest key controls which external websites can communicate with your extension. Properly configuring this feature is essential for extension security.

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Secure Extension",
  "version": "1.0",
  "externally_connectable": {
    "matches": [
      "https://trusted-domain.com/*",
      "https://app.trusted-service.io/*"
    ],
    "ids": ["*"]
  }
}
```

The matches array specifies which websites can send messages to your extension. Use specific domain patterns rather than wildcards to minimize the attack surface. Avoid using `<all_urls>` unless absolutely necessary, and even then, implement robust validation in your message handlers.

### Implementing Cross-Origin Restrictions in Code

```typescript
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const allowedOrigins = new Set([
    'https://trusted-domain.com',
    'https://app.trusted-service.io'
  ]);

  if (!sender.url) {
    sendResponse({ error: 'No sender URL' });
    return false;
  }

  const origin = new URL(sender.url).origin;

  if (!allowedOrigins.has(origin)) {
    console.warn('Blocked message from:', origin);
    sendResponse({ error: 'Origin not authorized' });
    return false;
  }

  // Additional origin-specific validation
  const originPermissions = this.getPermissionsForOrigin(origin);
  if (!originPermissions.includes(message.type)) {
    sendResponse({ error: 'Permission denied for this operation' });
    return false;
  }

  return true;
});

private getPermissionsForOrigin(origin: string): string[] {
  // Define granular permissions per origin
  const permissionsMap: Record<string, string[]> = {
    'https://trusted-domain.com': ['read', 'write', 'delete'],
    'https://app.trusted-service.io': ['read']
  };

  return permissionsMap[origin] || [];
}
```

This implementation provides fine-grained control over what operations each authorized origin can perform. Even if an attacker manages to send messages from an authorized origin, they can only perform actions that origin is explicitly permitted to perform.

## Message Replay Prevention

Message replay attacks occur when attackers capture valid messages and resend them to perform unauthorized actions. Preventing replay attacks requires implementing unique identifiers and timestamps in your message protocol.

### Implementing Replay Protection

```typescript
class ReplayProtection {
  private seenMessageIds = new Map<string, number>();
  private readonly MAX_CACHE_SIZE = 10000;
  private readonly MESSAGE_LIFETIME = 60000; // 1 minute

  constructor() {
    // Periodic cleanup of old entries
    setInterval(() => this.cleanup(), 10000);
  }

  isReplay(messageId: string, timestamp: number): boolean {
    // Validate timestamp is reasonable
    const now = Date.now();
    if (timestamp > now + 5000 || timestamp < now - this.MESSAGE_LIFETIME) {
      return true; // Message from future or too old
    }

    // Check if we've seen this ID
    if (this.seenMessageIds.has(messageId)) {
      return true;
    }

    // Add to seen messages
    this.seenMessageIds.set(messageId, timestamp);

    // Trim cache if needed
    if (this.seenMessageIds.size > this.MAX_CACHE_SIZE) {
      this.cleanup();
    }

    return false;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, timestamp] of this.seenMessageIds.entries()) {
      if (now - timestamp > this.MESSAGE_LIFETIME) {
        this.seenMessageIds.delete(id);
      }
    }
  }
}

// Usage in message handler
const replayProtection = new ReplayProtection();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { id, timestamp } = message as { id?: string; timestamp?: number };

  if (!id || !timestamp) {
    sendResponse({ error: 'Missing security identifiers' });
    return false;
  }

  if (replayProtection.isReplay(id, timestamp)) {
    sendResponse({ error: 'Replay attack detected' });
    return false;
  }

  // Process message...
  return true;
});
```

This replay protection system uses a combination of unique message IDs and timestamps. Messages without valid identifiers are rejected. Messages with timestamps outside acceptable windows are rejected. Duplicate message IDs within the lifetime window are treated as replay attempts.

## Type-Safe Messaging with TypeScript

TypeScript provides compile-time type safety for extension message passing, catching many potential security issues before runtime. However, runtime validation remains essential because messages can originate from sources outside your TypeScript codebase.

### Type-Safe Message System

```typescript
// Define message types with discriminated unions
type ExtensionMessage =
  | { type: 'FETCH_DATA'; payload: FetchDataPayload }
  | { type: 'SAVE_DATA'; payload: SaveDataPayload }
  | { type: 'USER_ACTION'; payload: UserActionPayload }
  | { type: 'ERROR'; payload: ErrorPayload };

interface FetchDataPayload {
  endpoint: string;
  params?: Record<string, string>;
}

interface SaveDataPayload {
  key: string;
  value: unknown;
}

interface UserActionPayload {
  action: string;
  target: string;
  metadata?: Record<string, unknown>;
}

interface ErrorPayload {
  code: string;
  message: string;
}

// Type-safe message sender
function sendMessage<T extends ExtensionMessage>(
  message: T
): Promise<{ type: string; payload: unknown }> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        ...message,
        id: crypto.randomUUID(),
        timestamp: Date.now()
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      }
    );
  });
}

// Type-safe message handler
function createMessageHandler<T extends ExtensionMessage>(
  handlers: {
    [K in T['type']]: (payload: Extract<T, { type: K }>['payload']) => Promise<unknown>
  }
) {
  return async function(
    message: unknown,
    sender: chrome.runtime.MessageSender
  ): Promise<{ type: string; payload: unknown }> {
    // Runtime validation
    if (!isValidMessageType(message)) {
      return { type: 'ERROR', payload: { code: 'INVALID_TYPE', message: 'Unknown message type' } };
    }

    const typedMessage = message as T;
    const handler = handlers[typedMessage.type];

    if (!handler) {
      return { type: 'ERROR', payload: { code: 'NO_HANDLER', message: 'No handler for type' } };
    }

    try {
      const result = await handler(typedMessage.payload);
      return { type: 'SUCCESS', payload: result };
    } catch (error) {
      return {
        type: 'ERROR',
        payload: {
          code: 'HANDLER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  };
}

// Type guard for runtime validation
function isValidMessageType(message: unknown): message is ExtensionMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const msg = message as Record<string, unknown>;
  const validTypes = ['FETCH_DATA', 'SAVE_DATA', 'USER_ACTION', 'ERROR'];

  return (
    typeof msg.type === 'string' &&
    validTypes.includes(msg.type) &&
    'payload' in msg
  );
}

// Usage example
const handler = createMessageHandler({
  FETCH_DATA: async (payload) => {
    // TypeScript knows the exact payload type
    const response = await fetch(payload.endpoint);
    return response.json();
  },
  SAVE_DATA: async (payload) => {
    await chrome.storage.local.set({ [payload.key]: payload.value });
    return { success: true };
  },
  USER_ACTION: async (payload) => {
    // Handle user action with full type safety
    console.log('User action:', payload.action, payload.target);
    return { tracked: true };
  }
});
```

This type-safe system combines compile-time type safety with runtime validation. TypeScript ensures that message handlers are defined for all message types at compile time. The isValidMessageType guard provides runtime validation that catches messages from external sources that don't match expected formats. The discriminated union ensures exhaustive handling at compile time—if you add a new message type, TypeScript will warn you about handlers that don't cover it.

## Security Best Practices Summary

Implementing secure message passing requires attention to multiple security layers. Validate every sender before processing messages, using Chrome's sender properties to verify origin and context. Implement schema validation for all messages, using libraries like Zod or Joi to enforce structure and type constraints. Use unique identifiers and timestamps to prevent replay attacks. Configure externally_connectable carefully, limiting which websites can communicate with your extension. Implement port security for long-lived connections. Validate native messaging inputs and outputs when communicating with local applications.

For comprehensive security guidance, refer to our [Security Best Practices](/guides/security-best-practices.md) guide and [Chrome Extension XSS Prevention](/guides/chrome-extension-xss-prevention-input-sanitization.md) for detailed information on preventing injection attacks through message passing channels.

---

## Cross-References

- [Message Passing Best Practices](/guides/message-passing-best-practices.md)
- [Message Passing Fundamentals](/guides/message-passing.md)
- [Advanced Messaging Patterns](/guides/advanced-messaging-patterns.md)
- [Background Service Worker Patterns](/guides/background-patterns.md)
- [Content Scripts Deep Dive](/guides/content-scripts-deep-dive.md)

## Related Articles

- [Security Best Practices](/guides/security-best-practices.md)
- [Security Hardening](/guides/security-hardening.md)
- [Chrome Extension Security Checklist](/guides/chrome-extension-security-checklist.md)
- [Chrome Extension XSS Prevention](/guides/chrome-extension-xss-prevention-input-sanitization.md)
- [Extension Security Audit](/guides/extension-security-audit.md)

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
