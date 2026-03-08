---
layout: default
title: "Chrome Extension Extension To Extension — Best Practices"
description: "Implement communication between different Chrome extensions."
---

# Extension-to-Extension Communication Patterns

## Overview

Chrome extensions can communicate with each other — send messages, share data, and expose APIs. This is useful for extension suites (a family of extensions that work together), plugin architectures (one core extension that others extend), and integration points (your extension coordinating with a well-known third-party extension). This guide covers practical patterns for building reliable, secure inter-extension communication.

---

## The Communication Model

```
┌─────────────────────┐         ┌─────────────────────┐
│   Extension A       │         │   Extension B       │
│   (ID: aaaa...)     │         │   (ID: bbbb...)     │
│                     │         │                     │
│  ┌───────────────┐  │  msg    │  ┌───────────────┐  │
│  │  Background   │──┼─────────┼─▶│  Background   │  │
│  │  Service      │  │         │  │  Service      │  │
│  │  Worker       │◀─┼─────────┼──│  Worker       │  │
│  └───────────────┘  │  reply  │  └───────────────┘  │
│                     │         │                     │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │ Content Script│  │  DOM    │  │ Content Script│  │
│  │ (shared page) │◀─┼─events──┼─▶│ (shared page) │  │
│  └───────────────┘  │         │  └───────────────┘  │
└─────────────────────┘         └─────────────────────┘
```

Extensions communicate through two primary channels:
- **`chrome.runtime.sendMessage`** with an explicit extension ID — direct background-to-background messaging
- **DOM events and shared resources** — content scripts on the same page can use `CustomEvent` or shared web accessible resources

---

## Pattern 1: Sending Messages to Another Extension

Use `chrome.runtime.sendMessage` with the target extension's ID as the first argument:

```ts
// Extension A — sending a message to Extension B
const EXTENSION_B_ID = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

interface TranslateRequest {
  action: "translate";
  text: string;
  targetLang: string;
}

interface TranslateResponse {
  translated: string;
  detectedLang: string;
}

async function requestTranslation(
  text: string,
  targetLang: string
): Promise<TranslateResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      EXTENSION_B_ID,
      { action: "translate", text, targetLang } satisfies TranslateRequest,
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response as TranslateResponse);
      }
    );
  });
}

// Usage
const result = await requestTranslation("Hello world", "es");
console.log(result.translated); // "Hola mundo"
```

**Important:** The receiving extension must declare itself as externally connectable (see Pattern 2), or the message will silently fail.

---

## Pattern 2: Externally Connectable Manifest Configuration

The receiving extension must whitelist sender extension IDs in its manifest:

```json
{
  "name": "Extension B — Translation Service",
  "externally_connectable": {
    "ids": [
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "cccccccccccccccccccccccccccccccc"
    ]
  }
}
```

Then handle external messages in the background service worker:

```ts
// Extension B — background.ts
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    // sender.id is the calling extension's ID
    console.log(`Message from extension: ${sender.id}`);

    if (message.action === "translate") {
      handleTranslation(message.text, message.targetLang)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ error: err.message }));

      return true; // keep the message channel open for async response
    }

    sendResponse({ error: "Unknown action" });
  }
);

async function handleTranslation(
  text: string,
  targetLang: string
): Promise<{ translated: string; detectedLang: string }> {
  // Translation logic here
  return { translated: `[${targetLang}] ${text}`, detectedLang: "en" };
}
```

For long-lived connections, use `chrome.runtime.connect`:

```ts
// Extension A — long-lived connection to Extension B
const port = chrome.runtime.connect(EXTENSION_B_ID, {
  name: "translation-stream",
});

port.onMessage.addListener((response) => {
  console.log("Received:", response);
});

port.postMessage({ action: "translate", text: "Hello", targetLang: "fr" });
port.postMessage({ action: "translate", text: "Goodbye", targetLang: "fr" });
```

```ts
// Extension B — handle long-lived connections
chrome.runtime.onConnectExternal.addListener((port) => {
  console.log(`Connection from ${port.sender?.id}, name: ${port.name}`);

  port.onMessage.addListener(async (message) => {
    if (message.action === "translate") {
      const result = await handleTranslation(message.text, message.targetLang);
      port.postMessage(result);
    }
  });

  port.onDisconnect.addListener(() => {
    console.log("External extension disconnected");
  });
});
```

You can also allow web pages to connect by adding `matches` to `externally_connectable`:

```json
{
  "externally_connectable": {
    "ids": ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    "matches": ["https://*.yoursite.com/*"]
  }
}
```

---

## Pattern 3: Shared Web Accessible Resources

When two extensions have content scripts on the same page, they can share data through web accessible resources:

```json
// Extension B — manifest.json
{
  "web_accessible_resources": [
    {
      "resources": ["api-schema.json"],
      "matches": ["<all_urls>"],
      "extension_ids": ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]
    }
  ]
}
```

The `extension_ids` field (MV3) allows other extensions to load the resource directly:

```ts
// Extension A — content script or background
// Fetch Extension B's schema to understand its API
const EXTENSION_B_ID = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

async function loadPartnerSchema(): Promise<unknown> {
  const url = `chrome-extension://${EXTENSION_B_ID}/api-schema.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn("Partner extension not installed or resource not accessible");
    return null;
  }
}
```

This is useful for exposing static configuration, API schemas, or shared assets like icons without requiring message passing.

---

## Pattern 4: Typed Message Protocol

Define a shared protocol so both extensions have type safety at their boundary:

```ts
// shared/protocol.ts — publish as an npm package or copy to both extensions

export const PROTOCOL_VERSION = "1.0.0";

// Request types
export type ExtRequest =
  | { action: "ping" }
  | { action: "getData"; key: string }
  | { action: "setData"; key: string; value: unknown }
  | { action: "subscribe"; event: string }
  | { action: "unsubscribe"; event: string };

// Response types
export type ExtResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: string; code: string };

// Event notifications (pushed via port)
export type ExtEvent =
  | { event: "dataChanged"; key: string; value: unknown }
  | { event: "statusUpdate"; status: "online" | "offline" };

// Full message envelope with version
export interface ExtEnvelope {
  protocol: string;  // "my-ext-protocol"
  version: string;   // semver
  payload: ExtRequest | ExtResponse | ExtEvent;
}

export function createEnvelope(
  payload: ExtRequest | ExtResponse | ExtEvent
): ExtEnvelope {
  return {
    protocol: "my-ext-protocol",
    version: PROTOCOL_VERSION,
    payload,
  };
}

export function isValidEnvelope(msg: unknown): msg is ExtEnvelope {
  if (typeof msg !== "object" || msg === null) return false;
  const envelope = msg as Record<string, unknown>;
  return (
    envelope.protocol === "my-ext-protocol" &&
    typeof envelope.version === "string" &&
    typeof envelope.payload === "object" &&
    envelope.payload !== null
  );
}
```

Use the protocol on both sides:

```ts
// Extension A — sending typed messages
import { createEnvelope, type ExtResponse, isValidEnvelope } from "./shared/protocol";

async function getDataFromPartner(key: string): Promise<unknown> {
  const envelope = createEnvelope({ action: "getData", key });

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      EXTENSION_B_ID,
      envelope,
      (raw: unknown) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!isValidEnvelope(raw)) {
          reject(new Error("Invalid response envelope"));
          return;
        }
        const response = raw.payload as ExtResponse;
        if (response.ok) {
          resolve(response.data);
        } else {
          reject(new Error(`${response.code}: ${response.error}`));
        }
      }
    );
  });
}
```

```ts
// Extension B — handling typed messages
import { createEnvelope, isValidEnvelope, type ExtRequest } from "./shared/protocol";

chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (!isValidEnvelope(message)) {
      sendResponse(createEnvelope({
        ok: false,
        error: "Invalid envelope",
        code: "INVALID_ENVELOPE",
      }));
      return;
    }

    const request = message.payload as ExtRequest;

    switch (request.action) {
      case "ping":
        sendResponse(createEnvelope({ ok: true }));
        break;

      case "getData":
        chrome.storage.local.get(request.key, (result) => {
          sendResponse(createEnvelope({
            ok: true,
            data: result[request.key],
          }));
        });
        return true; // async

      case "setData":
        chrome.storage.local.set(
          { [request.key]: request.value },
          () => {
            sendResponse(createEnvelope({ ok: true }));
          }
        );
        return true; // async

      default:
        sendResponse(createEnvelope({
          ok: false,
          error: "Unknown action",
          code: "UNKNOWN_ACTION",
        }));
    }
  }
);
```

---

## Pattern 5: Version Negotiation

When two extensions evolve independently, they need to agree on a protocol version:

```ts
// lib/version.ts

// Lightweight semver major version check (no dependency needed)
export function isMajorCompatible(
  local: string,
  remote: string
): boolean {
  const localMajor = parseInt(local.split(".")[0], 10);
  const remoteMajor = parseInt(remote.split(".")[0], 10);
  return localMajor === remoteMajor;
}

export function isMinorCompatible(
  local: string,
  remote: string
): boolean {
  const [localMajor, localMinor] = local.split(".").map(Number);
  const [remoteMajor, remoteMinor] = remote.split(".").map(Number);
  return localMajor === remoteMajor && localMinor <= remoteMinor;
}
```

```ts
// Extension A — negotiate before using the API
const PROTOCOL_VERSION = "1.2.0";

async function negotiateVersion(
  partnerId: string
): Promise<{ compatible: boolean; remoteVersion: string }> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      partnerId,
      {
        protocol: "my-ext-protocol",
        version: PROTOCOL_VERSION,
        payload: { action: "ping" },
      },
      (response) => {
        if (chrome.runtime.lastError || !response) {
          resolve({ compatible: false, remoteVersion: "unknown" });
          return;
        }

        const remoteVersion = response.version ?? "0.0.0";
        const compatible = isMajorCompatible(PROTOCOL_VERSION, remoteVersion);

        if (!compatible) {
          console.warn(
            `Protocol mismatch: local=${PROTOCOL_VERSION}, remote=${remoteVersion}`
          );
        }

        resolve({ compatible, remoteVersion });
      }
    );
  });
}

// Use it before making calls
async function safeGetData(key: string): Promise<unknown> {
  const { compatible, remoteVersion } = await negotiateVersion(EXTENSION_B_ID);

  if (!compatible) {
    throw new Error(
      `Incompatible protocol: need ${PROTOCOL_VERSION}, got ${remoteVersion}`
    );
  }

  return getDataFromPartner(key);
}
```

For breaking changes, maintain backward-compatible handlers:

```ts
// Extension B — background.ts
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (!isValidEnvelope(message)) {
      // Legacy v0 messages — handle for backward compatibility
      if (message.type === "getData") {
        handleLegacyGetData(message, sendResponse);
        return true;
      }
      sendResponse({ error: "Unknown message format" });
      return;
    }

    // v1+ envelope-based messages
    handleEnvelopeMessage(message, sender, sendResponse);
    return true;
  }
);
```

---

## Pattern 6: Detecting If Another Extension Is Installed

There is no `chrome.management.get` for other extensions. Use these techniques to detect a partner extension:

```ts
// Method 1: Try to send a message and handle failure
async function isExtensionInstalled(extensionId: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      extensionId,
      { action: "ping" },
      (response) => {
        if (chrome.runtime.lastError) {
          // "Could not establish connection" = not installed or not connectable
          resolve(false);
          return;
        }
        resolve(true);
      }
    );
  });
}
```

```ts
// Method 2: Try to fetch a web accessible resource
async function isExtensionAvailable(extensionId: string): Promise<boolean> {
  try {
    const url = `chrome-extension://${extensionId}/manifest.json`;
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}
// Note: manifest.json must be listed in web_accessible_resources
```

```ts
// Method 3: Content script detection via DOM markers
// Extension B's content script adds a marker to the page
// content.ts (Extension B)
document.documentElement.setAttribute("data-ext-b-installed", "1.2.0");

// content.ts (Extension A) — check for the marker
function isPartnerExtensionActive(): boolean {
  return document.documentElement.hasAttribute("data-ext-b-installed");
}

function getPartnerVersion(): string | null {
  return document.documentElement.getAttribute("data-ext-b-installed");
}
```

Build a discovery service that caches results:

```ts
// lib/extension-discovery.ts

interface PartnerInfo {
  id: string;
  installed: boolean;
  lastChecked: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const partnerCache = new Map<string, PartnerInfo>();

export async function discoverPartner(
  extensionId: string,
  forceRefresh = false
): Promise<PartnerInfo> {
  const cached = partnerCache.get(extensionId);
  if (cached && !forceRefresh && Date.now() - cached.lastChecked < CACHE_TTL_MS) {
    return cached;
  }

  const installed = await isExtensionInstalled(extensionId);
  const info: PartnerInfo = {
    id: extensionId,
    installed,
    lastChecked: Date.now(),
  };

  partnerCache.set(extensionId, info);
  return info;
}

// Re-check when the extension starts up (service worker wake)
export async function discoverAllPartners(
  partnerIds: string[]
): Promise<Map<string, PartnerInfo>> {
  const results = await Promise.all(
    partnerIds.map((id) => discoverPartner(id, true))
  );
  return new Map(results.map((info) => [info.id, info]));
}
```

---

## Pattern 7: Shared Storage via Web Accessible JSON

For one-way data sharing (one extension publishes, others consume), use a web accessible page that bridges to extension storage:

```ts
// Extension B — the "publisher" extension
// Write status that other extensions can read

async function publishStatus(): Promise<void> {
  const status = {
    version: chrome.runtime.getManifest().version,
    capabilities: ["translate", "summarize", "tts"],
    rateLimit: { requestsPerMinute: 60 },
    updatedAt: new Date().toISOString(),
  };

  await chrome.storage.local.set({ publicStatus: status });
}
```

Since you cannot dynamically write files to the extension package, use a web accessible HTML page that reads from storage and serves data via `postMessage`:

```html
<!-- Extension B — public/status.html (web accessible) -->
<!DOCTYPE html>
<html>
<head><script src="status-bridge.js"></script></head>
<body></body>
</html>
```

```ts
// Extension B — public/status-bridge.ts
// This page runs in the extension's origin, so it can access chrome.storage

chrome.storage.local.get("publicStatus", (result) => {
  window.parent.postMessage(
    {
      type: "ext-status-response",
      extensionId: chrome.runtime.id,
      status: result.publicStatus ?? null,
    },
    "*"
  );
});

// Also respond to on-demand requests
window.addEventListener("message", (event) => {
  if (event.data?.type === "ext-status-request") {
    chrome.storage.local.get("publicStatus", (result) => {
      event.source?.postMessage(
        {
          type: "ext-status-response",
          extensionId: chrome.runtime.id,
          status: result.publicStatus ?? null,
        },
        { targetOrigin: event.origin }
      );
    });
  }
});
```

```ts
// Extension A — reading partner status via iframe bridge
async function getPartnerStatus(
  extensionId: string
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.src = `chrome-extension://${extensionId}/public/status.html`;
    iframe.style.display = "none";

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout waiting for partner status"));
    }, 5000);

    function onMessage(event: MessageEvent) {
      if (
        event.data?.type === "ext-status-response" &&
        event.data?.extensionId === extensionId
      ) {
        cleanup();
        resolve(event.data.status);
      }
    }

    function cleanup() {
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      iframe.remove();
    }

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}
```

---

## Pattern 8: Validating Sender Extension Identity

Always verify `sender.id` before processing external messages — any extension (or web page, if configured) can send you messages:

```ts
// Extension B — background.ts

// Allowlist of trusted extension IDs
const TRUSTED_EXTENSIONS = new Set([
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",  // Extension A — companion
  "cccccccccccccccccccccccccccccccc",  // Extension C — premium add-on
]);

// Permission levels for different callers
const EXTENSION_PERMISSIONS: Record<string, Set<string>> = {
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa": new Set(["getData", "setData", "ping"]),
  "cccccccccccccccccccccccccccccccc": new Set(["getData", "ping"]),
};

chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    // 1. Verify the sender is a trusted extension
    if (!sender.id || !TRUSTED_EXTENSIONS.has(sender.id)) {
      console.warn(`Rejected message from untrusted extension: ${sender.id}`);
      sendResponse({
        ok: false,
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      });
      return;
    }

    // 2. Check action-level permissions
    const allowed = EXTENSION_PERMISSIONS[sender.id];
    const action = message?.payload?.action ?? message?.action;
    if (allowed && !allowed.has(action)) {
      console.warn(
        `Extension ${sender.id} not allowed to call action: ${action}`
      );
      sendResponse({
        ok: false,
        error: "Forbidden",
        code: "FORBIDDEN",
      });
      return;
    }

    // 3. Validate the message format
    if (!isValidEnvelope(message)) {
      sendResponse({
        ok: false,
        error: "Invalid message format",
        code: "INVALID_FORMAT",
      });
      return;
    }

    // 4. Process the validated message
    handleValidatedMessage(message, sender.id, sendResponse);
    return true;
  }
);

// Also validate external port connections
chrome.runtime.onConnectExternal.addListener((port) => {
  if (!port.sender?.id || !TRUSTED_EXTENSIONS.has(port.sender.id)) {
    console.warn(`Rejected connection from: ${port.sender?.id}`);
    port.disconnect();
    return;
  }

  // Rate limit per extension
  const rateLimiter = getRateLimiter(port.sender.id);

  port.onMessage.addListener((message) => {
    if (!rateLimiter.tryConsume()) {
      port.postMessage({
        ok: false,
        error: "Rate limited",
        code: "RATE_LIMITED",
      });
      return;
    }

    handleValidatedMessage(
      message,
      port.sender!.id!,
      (response) => port.postMessage(response)
    );
  });
});
```

Rate limiter for external callers:

```ts
// lib/rate-limiter.ts

export class TokenBucketLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private maxTokens: number = 60,
    private refillRatePerSecond: number = 1
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  tryConsume(count: number = 1): boolean {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRatePerSecond
    );
    this.lastRefill = now;
  }
}

const limiters = new Map<string, TokenBucketLimiter>();

export function getRateLimiter(extensionId: string): TokenBucketLimiter {
  let limiter = limiters.get(extensionId);
  if (!limiter) {
    limiter = new TokenBucketLimiter(60, 1); // 60 requests/minute
    limiters.set(extensionId, limiter);
  }
  return limiter;
}
```

---

## Summary

| Pattern | Problem It Solves |
|---------|------------------|
| `sendMessage` with extension ID | Direct cross-extension messaging |
| Externally connectable manifest | Whitelisting which extensions can contact you |
| Shared web accessible resources | Static data sharing without message passing |
| Typed message protocol | Type-safe inter-extension API contracts |
| Version negotiation | Independent extension update cycles |
| Extension discovery | Detecting if a partner extension is installed |
| Shared storage via JSON bridge | One-way data publishing to other extensions |
| Sender identity validation | Preventing unauthorized access from unknown extensions |

Inter-extension communication opens powerful integration possibilities, but it also opens an attack surface. Always validate `sender.id`, enforce per-extension permissions, rate-limit external callers, and negotiate protocol versions before exchanging data. The `externally_connectable` manifest key is your first line of defense — only list extension IDs you explicitly trust.
