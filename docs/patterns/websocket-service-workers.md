---
layout: default
title: "Chrome Extension Websocket Service Workers — Best Practices"
description: "Use WebSockets in service workers."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/websocket-service-workers/"
---

# WebSocket Connections from Service Workers

## Overview

WebSockets provide real-time, bidirectional communication — but MV3 service workers are a hostile environment for persistent connections. The service worker can terminate after 30 seconds of inactivity, destroying any open WebSocket. This guide covers eight patterns for maintaining reliable WebSocket connections in Chrome extensions, from offscreen document hosting to graceful fallback strategies.

---

## Pattern 1: WebSocket Basics in MV3 Service Workers

You _can_ open a WebSocket directly in a service worker, but the connection dies when Chrome terminates it:

```ts
// background.ts — Direct WebSocket (fragile)
let socket: WebSocket | null = null;

function connect(url: string): void {
  socket = new WebSocket(url);

  socket.onopen = () => console.log("WebSocket connected");

  socket.onmessage = (event) => {
    chrome.runtime.sendMessage({
      type: "ws-event",
      data: JSON.parse(event.data),
    }).catch(() => {}); // No listener if popup is closed
  };

  socket.onclose = (event) => {
    console.warn(`WebSocket closed: ${event.code}`);
    socket = null;
    // Service worker will terminate soon — no reliable reconnection
  };
}
```

The core problem: Chrome terminates idle service workers after ~30 seconds. Direct connections are only suitable for short-lived, request-response exchanges — not persistent subscriptions.

---

## Pattern 2: Offscreen Document as a Persistent WebSocket Host

Move the WebSocket into an offscreen document, which runs in a normal page context and is not subject to service worker lifecycle limits:

```ts
// offscreen/manager.ts
class OffscreenManager {
  private creating: Promise<void> | null = null;

  async ensure(): Promise<void> {
    if (await this.exists()) return;
    if (this.creating) { await this.creating; return; }

    this.creating = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.WEB_RTC],
      justification: "Maintain persistent WebSocket connection",
    });
    try { await this.creating; } finally { this.creating = null; }
  }

  async exists(): Promise<boolean> {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    return contexts.length > 0;
  }

  async close(): Promise<void> {
    if (await this.exists()) await chrome.offscreen.closeDocument();
  }
}

export const offscreen = new OffscreenManager();
```

```ts
// offscreen-ws.ts — Runs inside the offscreen document
let socket: WebSocket | null = null;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "ws-connect") {
    connectSocket(msg.url);
    sendResponse({ ok: true });
  } else if (msg.type === "ws-send") {
    const ok = socket?.readyState === WebSocket.OPEN;
    if (ok) socket!.send(JSON.stringify(msg.data));
    sendResponse({ ok });
  } else if (msg.type === "ws-status") {
    sendResponse({ connected: socket?.readyState === WebSocket.OPEN });
  }
  return true;
});

function connectSocket(url: string): void {
  socket?.close();
  socket = new WebSocket(url);
  socket.onopen = () =>
    chrome.runtime.sendMessage({ type: "ws-state", state: "open" });
  socket.onmessage = (event) =>
    chrome.runtime.sendMessage({ type: "ws-message", data: JSON.parse(event.data) });
  socket.onclose = (event) =>
    chrome.runtime.sendMessage({ type: "ws-state", state: "closed", code: event.code });
}
```

---

## Pattern 3: Reconnection with Exponential Backoff

Network failures and server restarts are inevitable. Use exponential backoff with jitter:

```ts
// reconnect.ts
class ReconnectingWebSocket {
  private socket: WebSocket | null = null;
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(
    private url: string,
    private onMessage: (data: unknown) => void,
    private onStateChange: (state: string) => void,
    private baseDelay = 1000,
    private maxDelay = 30_000,
    private maxAttempts = 20
  ) {}

  connect(): void {
    this.closed = false;
    this.attempt = 0;
    this.createSocket();
  }

  disconnect(): void {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.socket?.close(1000, "Client disconnect");
    this.socket = null;
  }

  send(data: unknown): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(data));
    return true;
  }

  private createSocket(): void {
    this.socket = new WebSocket(this.url);
    this.socket.onopen = () => { this.attempt = 0; this.onStateChange("open"); };
    this.socket.onmessage = (e) => this.onMessage(JSON.parse(e.data));
    this.socket.onclose = () => {
      this.onStateChange("closed");
      if (!this.closed) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.attempt >= this.maxAttempts) {
      this.onStateChange("failed");
      return;
    }
    const delay = Math.min(this.baseDelay * 2 ** this.attempt, this.maxDelay);
    const jitter = delay * 0.3 * Math.random();
    this.attempt++;
    this.timer = setTimeout(() => this.createSocket(), delay + jitter);
  }
}
```

---

## Pattern 4: Message Queuing During Disconnections

Buffer outbound messages while the socket is down and flush them on reconnect:

```ts
// queue.ts
interface QueuedMessage {
  data: unknown;
  timestamp: number;
  ttl: number;
}

class MessageQueue {
  private queue: QueuedMessage[] = [];

  constructor(private maxSize = 200, private defaultTTL = 60_000) {}

  enqueue(data: unknown, ttl?: number): void {
    if (this.queue.length >= this.maxSize) this.queue.shift();
    this.queue.push({ data, timestamp: Date.now(), ttl: ttl ?? this.defaultTTL });
  }

  flush(send: (data: unknown) => boolean): { sent: number; dropped: number } {
    const now = Date.now();
    let sent = 0, dropped = 0;

    while (this.queue.length > 0) {
      const msg = this.queue[0];
      if (now - msg.timestamp > msg.ttl) { this.queue.shift(); dropped++; continue; }
      if (!send(msg.data)) break;
      this.queue.shift();
      sent++;
    }
    return { sent, dropped };
  }

  get size(): number { return this.queue.length; }
}
```

Integrate with the reconnecting socket:

```ts
// offscreen-ws.ts
const queue = new MessageQueue(500, 120_000);
const ws = new ReconnectingWebSocket(
  "wss://api.example.com/ws",
  (data) => chrome.runtime.sendMessage({ type: "ws-message", data }),
  (state) => {
    chrome.runtime.sendMessage({ type: "ws-state", state });
    if (state === "open") queue.flush((d) => ws.send(d));
  }
);
```

---

## Pattern 5: Heartbeat / Ping-Pong Keep-Alive

Detect dead connections before the TCP timeout by exchanging periodic heartbeats:

```ts
// heartbeat.ts
class HeartbeatManager {
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private intervalMs: number,
    private timeoutMs: number,
    private sendFn: (data: unknown) => boolean,
    private onTimeout: () => void
  ) {}

  start(): void {
    this.stop();
    this.pingTimer = setInterval(() => this.ping(), this.intervalMs);
  }

  stop(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.pingTimer = this.pongTimer = null;
  }

  handlePong(): void {
    if (this.pongTimer) { clearTimeout(this.pongTimer); this.pongTimer = null; }
  }

  private ping(): void {
    if (!this.sendFn({ type: "ping", ts: Date.now() })) return;
    this.pongTimer = setTimeout(() => this.onTimeout(), this.timeoutMs);
  }
}

// Usage
const heartbeat = new HeartbeatManager(25_000, 10_000,
  (data) => ws.send(data),
  () => { ws.disconnect(); ws.connect(); }
);
// Start on "open", stop on "closed"
// Call heartbeat.handlePong() when a pong message arrives
```

---

## Pattern 6: Typed WebSocket Message Protocol

Define a compile-time-safe protocol for all WebSocket messages:

```ts
// protocol.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type ServerMessages = {
  "chat:message": { id: string; user: string; text: string; timestamp: number };
  "presence:update": { userId: string; status: "online" | "away" | "offline" };
};

type ClientMessages = {
  "chat:send": { text: string; replyTo?: string };
  "room:join": { roomId: string };
};

interface WireMessage<T = unknown> {
  event: string;
  payload: T;
  id: string;
}

function createTypedSender(rawSend: (data: unknown) => boolean) {
  return <K extends keyof ClientMessages>(event: K, payload: ClientMessages[K]) => {
    const wire: WireMessage = { event, payload, id: crypto.randomUUID() };
    return rawSend(wire);
  };
}

class MessageRouter {
  private handlers = new Map<string, (payload: unknown) => void>();

  on<K extends keyof ServerMessages>(
    event: K, handler: (payload: ServerMessages[K]) => void
  ): void {
    this.handlers.set(event, handler as (payload: unknown) => void);
  }

  route(wire: WireMessage): boolean {
    const handler = this.handlers.get(wire.event);
    if (!handler) return false;
    handler(wire.payload);
    return true;
  }
}

// Usage
const router = new MessageRouter();
const send = createTypedSender((data) => ws.send(data));

router.on("chat:message", (msg) => {
  // msg is typed as { id, user, text, timestamp }
  chrome.runtime.sendMessage({ type: "chat-message", data: msg });
});

send("chat:send", { text: "Hello!", replyTo: "msg-123" });
```

---

## Pattern 7: Broadcasting WebSocket Events to Popup and Content Scripts

WebSocket data arrives in the offscreen document but must reach the popup, side panel, and content scripts:

```ts
// background.ts — Central event broadcaster
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ws-message") broadcastToAll(msg.data);
  if (msg.type === "ws-state") broadcastStatus(msg.state === "open");
});

async function broadcastToAll(data: unknown): Promise<void> {
  // Extension pages (popup, side panel, options)
  chrome.runtime.sendMessage({ type: "ws:data", data }).catch(() => {});

  // All content scripts
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: "ws:data", data }).catch(() => {});
    }
  }
}

async function broadcastStatus(connected: boolean): Promise<void> {
  chrome.runtime.sendMessage({ type: "ws:status", connected }).catch(() => {});
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: "ws:status", connected }).catch(() => {});
    }
  }
}
```

```ts
// content-script.ts
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ws:data") renderUpdate(msg.data);
  if (msg.type === "ws:status") updateConnectionIndicator(msg.connected);
});
```

---

## Pattern 8: Fallback from WebSocket to Polling

When the offscreen document is unavailable (already in use, or older Chrome), fall back to HTTP polling from the service worker:

```ts
// background.ts
class PollingTransport {
  private timer: ReturnType<typeof setInterval> | null = null;
  private baseUrl = "";
  private lastEventId = "0";

  constructor(
    private intervalMs: number,
    private onMessage: (data: unknown) => void
  ) {}

  start(wsUrl: string): void {
    this.baseUrl = wsUrl.replace(/^wss?:/, "https:").replace(/\/ws$/, "/poll");
    this.timer = setInterval(() => this.poll(), this.intervalMs);
    this.poll();
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private async poll(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/events?since=${this.lastEventId}`);
      if (!res.ok) return;
      const events: Array<{ id: string; data: unknown }> = await res.json();
      for (const e of events) { this.lastEventId = e.id; this.onMessage(e.data); }
    } catch { /* retry on next interval */ }
  }
}

async function createTransport(onMessage: (data: unknown) => void) {
  if (chrome.offscreen) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    if (contexts.length === 0) {
      // Use offscreen WebSocket (Patterns 2-5)
      return createOffscreenTransport(onMessage);
    }
  }
  console.warn("Offscreen unavailable — falling back to HTTP polling");
  return new PollingTransport(5000, onMessage);
}
```

---

## Summary

| Pattern | Use Case |
|---------|----------|
| Direct WebSocket in SW | Short-lived request-response only; drops on termination |
| Offscreen document host | Persistent connection that survives SW lifecycle |
| Exponential backoff | Reliable reconnection without thundering-herd |
| Message queuing | Buffer outbound data during disconnections |
| Heartbeat / ping-pong | Detect dead connections before TCP timeout |
| Typed protocol | Compile-time safety for all WS message types |
| Event broadcasting | Distribute real-time data to popup, side panel, content scripts |
| Polling fallback | HTTP long-poll when offscreen document is unavailable |

WebSocket reliability in MV3 comes down to one rule: never trust the service worker to stay alive. Host the connection in an offscreen document, add reconnection and queuing, and always have a fallback plan.
