---
layout: default
title: "Chrome Extension Offscreen Documents — Best Practices"
description: "Use offscreen documents for DOM operations and long-running tasks in Manifest V3."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/offscreen-documents/"
---

# Offscreen Document Patterns

## Overview

The [offscreen documents reference](../mv3/offscreen-documents.md) covers the basics. This guide provides production-ready patterns for managing offscreen document lifecycle, typed communication, and real-world use cases like canvas processing, audio playback, clipboard access, and Web Worker delegation.

---

## Pattern 1: Singleton Manager

Only one offscreen document can exist at a time. Use a manager to handle creation, reuse, and cleanup:

```ts
// offscreen/manager.ts
type OffscreenReason = chrome.offscreen.Reason;

class OffscreenManager {
  private creating: Promise<void> | null = null;

  async ensure(reason: OffscreenReason, justification: string): Promise<void> {
    if (await this.exists()) return;

    // Prevent race conditions — multiple callers might try to create simultaneously
    if (this.creating) {
      await this.creating;
      return;
    }

    this.creating = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [reason],
      justification,
    });

    try {
      await this.creating;
    } finally {
      this.creating = null;
    }
  }

  async exists(): Promise<boolean> {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    });
    return contexts.length > 0;
  }

  async close(): Promise<void> {
    if (await this.exists()) {
      await chrome.offscreen.closeDocument();
    }
  }

  async withDocument<T>(
    reason: OffscreenReason,
    justification: string,
    fn: () => Promise<T>
  ): Promise<T> {
    await this.ensure(reason, justification);
    try {
      return await fn();
    } finally {
      // Close after use to free memory
      await this.close();
    }
  }
}

export const offscreen = new OffscreenManager();
```

Usage:

```ts
// background.ts
import { offscreen } from "./offscreen/manager";

const result = await offscreen.withDocument(
  chrome.offscreen.Reason.DOM_PARSER,
  "Parse fetched HTML to extract metadata",
  async () => {
    return chrome.runtime.sendMessage({ type: "parse-html", html: rawHtml });
  }
);
```

---

## Pattern 2: Typed Message Protocol

Define a typed protocol between the service worker and offscreen document:

```ts
// offscreen/protocol.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

export type OffscreenMessages = {
  "parse-html": {
    request: { html: string };
    response: { title: string; description: string; links: string[] };
  };
  "resize-image": {
    request: { dataUrl: string; maxWidth: number; maxHeight: number };
    response: { dataUrl: string; width: number; height: number };
  };
  "play-sound": {
    request: { url: string; volume: number };
    response: { played: boolean };
  };
  "read-clipboard": {
    request: void;
    response: { text: string };
  };
};

export const messenger = createMessenger<OffscreenMessages>();
```

```ts
// background.ts
import { offscreen } from "./offscreen/manager";
import { messenger } from "./offscreen/protocol";

async function parseHTML(html: string) {
  return offscreen.withDocument(
    chrome.offscreen.Reason.DOM_PARSER,
    "Parse HTML content",
    () => messenger.send("parse-html", { html })
  );
}
```

```ts
// offscreen.ts
import { messenger } from "./offscreen/protocol";

messenger.onMessage("parse-html", async ({ html }) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return {
    title: doc.querySelector("title")?.textContent ?? "",
    description:
      doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    links: [...doc.querySelectorAll("a[href]")].map((a) =>
      (a as HTMLAnchorElement).href
    ),
  };
});
```

---

## Pattern 3: Canvas Image Processing

Service workers can't use Canvas. Offscreen documents handle image manipulation:

```ts
// offscreen.ts — Image processing handlers
messenger.onMessage("resize-image", async ({ dataUrl, maxWidth, maxHeight }) => {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  // Calculate new dimensions maintaining aspect ratio
  let { width, height } = img;
  if (width > maxWidth) {
    height = Math.round(height * (maxWidth / width));
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = Math.round(width * (maxHeight / height));
    height = maxHeight;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    width,
    height,
  };
});

// Screenshot annotation
type AnnotateRequest = {
  screenshot: string; // data URL
  annotations: Array<{
    type: "rect" | "circle" | "arrow";
    x: number;
    y: number;
    width?: number;
    height?: number;
    color: string;
  }>;
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "annotate-screenshot") {
    annotateScreenshot(msg.data as AnnotateRequest)
      .then(sendResponse);
    return true;
  }
});

async function annotateScreenshot(req: AnnotateRequest): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = req.screenshot;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  for (const ann of req.annotations) {
    ctx.strokeStyle = ann.color;
    ctx.lineWidth = 3;

    if (ann.type === "rect" && ann.width && ann.height) {
      ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
    } else if (ann.type === "circle" && ann.width) {
      ctx.beginPath();
      ctx.arc(ann.x, ann.y, ann.width / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  return canvas.toDataURL("image/png");
}
```

---

## Pattern 4: Audio Playback

Service workers can't use the Audio API. Offscreen documents handle sound:

```html
<!-- offscreen.html -->
<!DOCTYPE html>
<html>
<body>
  <audio id="player" preload="none"></audio>
  <script src="offscreen.js"></script>
</body>
</html>
```

```ts
// offscreen.ts — Audio handler
const player = document.getElementById("player") as HTMLAudioElement;

messenger.onMessage("play-sound", async ({ url, volume }) => {
  player.src = url;
  player.volume = Math.max(0, Math.min(1, volume));

  try {
    await player.play();
    return { played: true };
  } catch {
    return { played: false };
  }
});
```

```ts
// background.ts — Play notification sound
async function playNotificationSound() {
  await offscreen.ensure(
    chrome.offscreen.Reason.AUDIO_PLAYBACK,
    "Play notification alert sound"
  );

  await messenger.send("play-sound", {
    url: chrome.runtime.getURL("sounds/notification.mp3"),
    volume: 0.7,
  });

  // Don't close immediately — let audio finish
  setTimeout(() => offscreen.close(), 5000);
}
```

---

## Pattern 5: Clipboard Access

```ts
// offscreen.ts — Clipboard operations
messenger.onMessage("read-clipboard", async () => {
  const text = await navigator.clipboard.readText();
  return { text };
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "write-clipboard") {
    navigator.clipboard.writeText(msg.text)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
```

```ts
// background.ts
async function readClipboard(): Promise<string> {
  return offscreen.withDocument(
    chrome.offscreen.Reason.CLIPBOARD,
    "Read clipboard text",
    async () => {
      const result = await messenger.send("read-clipboard", undefined);
      return result.text;
    }
  );
}
```

---

## Pattern 6: Web Worker Delegation

Offscreen documents can spawn Web Workers for CPU-intensive tasks:

```ts
// offscreen.ts — Delegate to Web Worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "heavy-compute") {
    const worker = new Worker("compute-worker.js");

    worker.postMessage(msg.data);

    worker.onmessage = (e) => {
      sendResponse(e.data);
      worker.terminate();
    };

    worker.onerror = (err) => {
      sendResponse({ error: err.message });
      worker.terminate();
    };

    return true;
  }
});
```

```ts
// compute-worker.js
self.onmessage = (e) => {
  const { text } = e.data;

  // CPU-intensive text analysis
  const words = text.split(/\s+/);
  const frequency = new Map<string, number>();
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^\w]/g, "");
    if (lower) frequency.set(lower, (frequency.get(lower) ?? 0) + 1);
  }

  const sorted = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100);

  self.postMessage({ wordCount: words.length, topWords: sorted });
};
```

---

## Pattern 7: Auto-Close Idle Documents

Chrome may close offscreen documents after ~30 seconds of inactivity. Handle this gracefully:

```ts
// background.ts
async function sendToOffscreen<T>(
  reason: chrome.offscreen.Reason,
  justification: string,
  message: { type: string; [key: string]: unknown }
): Promise<T> {
  // Ensure document exists (may have been auto-closed)
  await offscreen.ensure(reason, justification);

  try {
    return await chrome.runtime.sendMessage(message);
  } catch (error) {
    // Document was closed between our check and message — recreate
    if (String(error).includes("Could not establish connection")) {
      await offscreen.close(); // clean up stale state
      await offscreen.ensure(reason, justification);
      return await chrome.runtime.sendMessage(message);
    }
    throw error;
  }
}
```

---

## Pattern 8: Multiple Reason Handling

Only one offscreen document exists at a time, but it can handle multiple types of work:

```ts
// offscreen.ts — Multi-purpose offscreen document
// Register ALL handlers — the document serves whatever request arrives

// DOM parsing
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "parse-html":
      handleParseHTML(msg.data).then(sendResponse);
      return true;

    case "resize-image":
      handleResizeImage(msg.data).then(sendResponse);
      return true;

    case "play-sound":
      handlePlaySound(msg.data).then(sendResponse);
      return true;

    case "read-clipboard":
      handleReadClipboard().then(sendResponse);
      return true;
  }
});
```

```ts
// background.ts — Create with the primary reason, reuse for others
await offscreen.ensure(
  chrome.offscreen.Reason.DOM_PARSER,
  "Parse HTML and process images"
);

// Same document handles both operations
const htmlResult = await chrome.runtime.sendMessage({
  type: "parse-html",
  data: { html: rawHtml },
});

const imageResult = await chrome.runtime.sendMessage({
  type: "resize-image",
  data: { dataUrl: screenshot, maxWidth: 800, maxHeight: 600 },
});
```

---

## Summary

| Pattern | Use Case |
|---------|----------|
| Singleton manager | Safe creation/cleanup, prevent race conditions |
| Typed protocol | Type-safe communication between SW and offscreen |
| Canvas processing | Image resize, annotation, format conversion |
| Audio playback | Notification sounds, media playback |
| Clipboard access | Read/write clipboard from background |
| Web Worker delegation | CPU-intensive computation off the main thread |
| Auto-close recovery | Handle Chrome's idle document cleanup |
| Multi-purpose document | Single document serving multiple APIs |

Offscreen documents bridge the gap between service workers (no DOM) and the functionality your extension needs. Keep them lightweight, close them when idle, and always handle the case where Chrome has already closed them.
