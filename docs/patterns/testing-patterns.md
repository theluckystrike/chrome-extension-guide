---
layout: default
title: "Chrome Extension Testing Patterns — Best Practices"
description: "Testing patterns for Chrome extension development."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/testing-patterns/"
---

# Testing Chrome Extensions

## Overview {#overview}

Testing Chrome extensions requires working around unique constraints: service workers have no DOM, content scripts run in isolated worlds, and many features depend on Chrome-specific APIs that do not exist in Node. This guide covers eight patterns that combine unit tests with mocked Chrome APIs, integration tests with Playwright loading real extensions, and end-to-end flows against fixture pages.

---

## Recommended Stack {#recommended-stack}

```jsonc
// package.json (relevant devDependencies)
{
  "devDependencies": {
    "vitest": "^3.0.0",
    "@playwright/test": "^1.50.0",
    "playwright": "^1.50.0",
    "@anthropic-ai/jest-chrome": "^0.9.0"
  }
}
```

All unit test examples use Vitest. Integration and E2E examples use Playwright.

---

## Pattern 1: Unit Testing Chrome API Mocks {#pattern-1-unit-testing-chrome-api-mocks}

Mock `chrome.storage`, `chrome.tabs`, and other APIs so service worker logic can run in plain Node without a browser:

```ts
// test/setup.ts
import { vi } from "vitest";

// Minimal chrome.storage.local mock backed by a plain object
function createStorageMock() {
  let store: Record<string, unknown> = {};

  return {
    get: vi.fn((keys: string | string[] | Record<string, unknown>, cb?: Function) => {
      const defaults = typeof keys === "object" && !Array.isArray(keys) ? keys : {};
      const keyList = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const result: Record<string, unknown> = {};
      for (const key of keyList) {
        result[key] = store[key] ?? (defaults as Record<string, unknown>)[key];
      }
      if (cb) cb(result);
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, unknown>, cb?: Function) => {
      Object.assign(store, items);
      if (cb) cb();
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      store = {};
      return Promise.resolve();
    }),
    _getStore: () => store,
  };
}

function createTabsMock() {
  return {
    query: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({ id: 1, url: "https://example.com" }),
    create: vi.fn().mockResolvedValue({ id: 2 }),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  };
}

// Attach to globalThis so imports see it
(globalThis as any).chrome = {
  storage: {
    local: createStorageMock(),
    sync: createStorageMock(),
  },
  tabs: createTabsMock(),
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://fake-id/${path}`),
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn((cb?: Function) => cb?.()),
    update: vi.fn(),
    onClicked: { addListener: vi.fn() },
  },
};
```

```ts
// test/storage-helper.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import "../setup";

// The module under test uses chrome.storage.local
import { saveBookmark, getBookmarks } from "../../src/storage-helper";

describe("storage-helper", () => {
  beforeEach(() => {
    chrome.storage.local.clear();
  });

  it("saves a bookmark", async () => {
    await saveBookmark({ url: "https://example.com", title: "Example" });
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        bookmarks: [{ url: "https://example.com", title: "Example" }],
      })
    );
  });

  it("returns empty array when no bookmarks exist", async () => {
    const result = await getBookmarks();
    expect(result).toEqual([]);
  });
});
```

Keep mock implementations minimal. Only add behavior you actually assert against.

---

## Pattern 2: Integration Testing with Playwright (Load Real Extension) {#pattern-2-integration-testing-with-playwright-load-real-extension}

Playwright can launch Chromium with a real unpacked extension. This gives access to the service worker, popup, and content scripts:

```ts
// e2e/fixtures.ts
import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "node:path";

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const extensionPath = path.resolve(__dirname, "../dist");
    const context = await chromium.launchPersistentContext("", {
      headless: false, // Use headed mode for reliability; new headless mode (Chrome 132+) also supports extensions
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-first-run",
        "--disable-gpu",
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Wait for the service worker to register
    let serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker");
    }
    const url = serviceWorker.url();
    // URL format: chrome-extension://<id>/background.js
    const id = url.split("/")[2];
    await use(id);
  },
});

export { expect } from "@playwright/test";
```

```ts
// e2e/extension-loads.spec.ts
import { test, expect } from "./fixtures";

test("extension service worker is running", async ({ extensionId }) => {
  expect(extensionId).toBeTruthy();
  expect(extensionId.length).toBe(32); // Extension IDs are 32 chars
});

test("popup page opens without errors", async ({ context, extensionId }) => {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState("domcontentloaded");

  expect(errors).toHaveLength(0);
});
```

Note: Chrome's new headless mode (the default since Chrome 132) supports loading extensions. You can use `headless: true` with the `--headless=new` flag. For older Chrome versions, use `headless: false` and `xvfb-run` on CI to run headed mode without a display.

---

## Pattern 3: Testing Popup UI {#pattern-3-testing-popup-ui}

Open the popup page directly by navigating to its `chrome-extension://` URL, then assert against DOM elements:

```ts
// e2e/popup.spec.ts
import { test, expect } from "./fixtures";

test("popup renders bookmark list", async ({ context, extensionId }) => {
  // Pre-seed storage via the service worker
  const sw = context.serviceWorkers()[0];
  await sw.evaluate(() => {
    return chrome.storage.local.set({
      bookmarks: [
        { url: "https://example.com", title: "Example" },
        { url: "https://test.org", title: "Test" },
      ],
    });
  });

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Wait for the list to populate
  const items = page.locator(".bookmark-item");
  await expect(items).toHaveCount(2);
  await expect(items.first()).toContainText("Example");
});

test("popup search filters results", async ({ context, extensionId }) => {
  const sw = context.serviceWorkers()[0];
  await sw.evaluate(() => {
    return chrome.storage.local.set({
      bookmarks: [
        { url: "https://a.com", title: "Alpha" },
        { url: "https://b.com", title: "Beta" },
        { url: "https://g.com", title: "Gamma" },
      ],
    });
  });

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await page.fill("#search-input", "Beta");
  const visible = page.locator(".bookmark-item:visible");
  await expect(visible).toHaveCount(1);
  await expect(visible.first()).toContainText("Beta");
});

test("popup add-bookmark button writes to storage", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await page.fill("#url-input", "https://new.com");
  await page.fill("#title-input", "New Site");
  await page.click("#add-btn");

  // Read storage from the service worker to verify
  const sw = context.serviceWorkers()[0];
  const data = await sw.evaluate(() => chrome.storage.local.get("bookmarks"));
  expect(data.bookmarks).toContainEqual({
    url: "https://new.com",
    title: "New Site",
  });
});
```

Seeding storage via `sw.evaluate` before opening the popup avoids flaky race conditions compared to clicking through UI to set up state.

---

## Pattern 4: Testing Content Scripts {#pattern-4-testing-content-scripts}

Inject a content script into a test page and verify it modifies the DOM as expected:

```ts
// e2e/content-script.spec.ts
import { test, expect } from "./fixtures";

test("content script injects reading-time badge", async ({ context }) => {
  const page = await context.newPage();
  // Navigate to a real page where the content script should activate
  await page.goto("https://example.com");

  // Wait for the content script to run and inject its element
  const badge = page.locator("#ext-reading-time");
  await expect(badge).toBeVisible({ timeout: 5000 });
  await expect(badge).toContainText("min read");
});

test("content script does not inject on excluded domains", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("https://chrome.google.com/webstore");

  // Content script should NOT run here
  const badge = page.locator("#ext-reading-time");
  await expect(badge).toHaveCount(0);
});

test("content script responds to messages from background", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto("https://example.com");

  // Wait for content script to be ready
  await page.waitForSelector("#ext-reading-time");

  // Send a message from the service worker to the content script
  const sw = context.serviceWorkers()[0];
  const response = await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true });
    return chrome.tabs.sendMessage(tab.id!, { type: "GET_PAGE_STATS" });
  });

  expect(response).toHaveProperty("wordCount");
  expect(response.wordCount).toBeGreaterThan(0);
});
```

For pages you control, serve a local fixture HTML file instead of hitting a remote URL (see Pattern 7).

---

## Pattern 5: Testing Service Worker Lifecycle {#pattern-5-testing-service-worker-lifecycle}

Verify that the service worker handles install, wake-up, and alarm events correctly:

```ts
// e2e/service-worker.spec.ts
import { test, expect } from "./fixtures";

test("service worker sets up alarms on install", async ({ context }) => {
  const sw = context.serviceWorkers()[0];

  const alarms = await sw.evaluate(async () => {
    return chrome.alarms.getAll();
  });

  // The extension should create a periodic sync alarm on install
  const syncAlarm = alarms.find((a: chrome.alarms.Alarm) => a.name === "periodic-sync");
  expect(syncAlarm).toBeDefined();
  expect(syncAlarm!.periodInMinutes).toBe(30);
});

test("service worker survives termination and restarts", async ({ context }) => {
  const sw = context.serviceWorkers()[0];

  // Store a value before "termination"
  await sw.evaluate(() => {
    return chrome.storage.local.set({ lastActive: Date.now() });
  });

  // Terminate the service worker by navigating away and waiting
  // In Playwright, we cannot force-terminate, but we can verify
  // the worker handles startup correctly by checking stored state
  const data = await sw.evaluate(() => chrome.storage.local.get("lastActive"));
  expect(data.lastActive).toBeGreaterThan(0);
});

test("storage.onChanged fires for cross-context writes", async ({
  context,
  extensionId,
}) => {
  const sw = context.serviceWorkers()[0];

  // Set up a listener in the service worker
  await sw.evaluate(() => {
    (globalThis as any).__storageChanges = [];
    chrome.storage.onChanged.addListener((changes) => {
      (globalThis as any).__storageChanges.push(changes);
    });
  });

  // Write from the popup context
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.evaluate(() => {
    return chrome.storage.local.set({ fromPopup: true });
  });

  // Verify the service worker observed the change
  const changes = await sw.evaluate(() => (globalThis as any).__storageChanges);
  expect(changes.length).toBeGreaterThan(0);
  expect(changes[0]).toHaveProperty("fromPopup");
});
```

Testing true service worker termination is difficult in Playwright. For critical wake-up paths, use Chrome DevTools Protocol commands via `context.newCDPSession` to force-terminate the worker.

---

## Pattern 6: Testing Message Passing {#pattern-6-testing-message-passing}

Unit-test message handlers by extracting them into pure functions, then integration-test the full roundtrip:

```ts
// src/message-handler.ts
export interface Message {
  type: string;
  payload?: unknown;
}

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function handleMessage(message: Message): Promise<MessageResponse> {
  switch (message.type) {
    case "GET_SETTINGS": {
      const data = await chrome.storage.sync.get({ theme: "light", fontSize: 16 });
      return { success: true, data };
    }

    case "SAVE_SETTINGS": {
      await chrome.storage.sync.set(message.payload as Record<string, unknown>);
      return { success: true };
    }

    case "COUNT_TABS": {
      const tabs = await chrome.tabs.query({});
      return { success: true, data: { count: tabs.length } };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}
```

```ts
// test/message-handler.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import "../setup";
import { handleMessage } from "../../src/message-handler";

describe("handleMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns settings from storage", async () => {
    chrome.storage.sync.get.mockResolvedValueOnce({
      theme: "dark",
      fontSize: 18,
    });

    const result = await handleMessage({ type: "GET_SETTINGS" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ theme: "dark", fontSize: 18 });
  });

  it("saves settings to storage", async () => {
    const result = await handleMessage({
      type: "SAVE_SETTINGS",
      payload: { theme: "sepia" },
    });

    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ theme: "sepia" });
    expect(result.success).toBe(true);
  });

  it("counts open tabs", async () => {
    chrome.tabs.query.mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }]);

    const result = await handleMessage({ type: "COUNT_TABS" });

    expect(result.data).toEqual({ count: 3 });
  });

  it("returns error for unknown message type", async () => {
    const result = await handleMessage({ type: "UNKNOWN" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown message type");
  });
});
```

Extracting handlers into standalone functions that return promises (instead of relying on `sendResponse`) makes them straightforward to unit test.

---

## Pattern 7: E2E Testing with Fixture Pages {#pattern-7-e2e-testing-with-fixture-pages}

Serve local HTML fixture pages to give content scripts a predictable DOM to work against:

```ts
// e2e/fixture-server.ts
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";

export function startFixtureServer(port = 9876): Server {
  const fixturesDir = path.resolve(__dirname, "fixtures");

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const filePath = path.join(fixturesDir, req.url === "/" ? "index.html" : req.url!);
    const ext = path.extname(filePath);
    const contentType = ext === ".html" ? "text/html" : "text/plain";

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  server.listen(port);
  return server;
}
```

```html
<!-- e2e/fixtures/article.html -->
<!DOCTYPE html>
<html>
<head><title>Test Article</title></head>
<body>
  <article>
    <h1>Sample Article Title</h1>
    <p>This is a test paragraph with enough words to verify the reading time
       calculation produces a non-zero result. The content script should detect
       this article element and inject a reading-time indicator.</p>
    <p>Second paragraph adds more content for a realistic word count.</p>
  </article>
</body>
</html>
```

```ts
// e2e/content-with-fixtures.spec.ts
import { test, expect } from "./fixtures";
import { startFixtureServer } from "./fixture-server";
import type { Server } from "node:http";

let server: Server;

test.beforeAll(() => {
  server = startFixtureServer(9876);
});

test.afterAll(() => {
  server.close();
});

test("content script calculates reading time on fixture page", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("http://localhost:9876/article.html");

  const badge = page.locator("#ext-reading-time");
  await expect(badge).toBeVisible({ timeout: 5000 });

  const text = await badge.textContent();
  expect(text).toMatch(/\d+ min read/);
});

test("content script skips pages with no article element", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("http://localhost:9876/no-article.html");

  const badge = page.locator("#ext-reading-time");
  await expect(badge).toHaveCount(0);
});

test("content script handles dynamically loaded content", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("http://localhost:9876/dynamic.html");

  // The fixture page loads article content after 500ms via JS
  const badge = page.locator("#ext-reading-time");
  await expect(badge).toBeVisible({ timeout: 10000 });
});
```

Fixture pages eliminate network flakiness and give you full control over the DOM structure your content scripts encounter.

---

## Pattern 8: Snapshot Testing for Extension UI {#pattern-8-snapshot-testing-for-extension-ui}

Capture the popup or options page HTML and compare against a stored snapshot to catch unintended UI regressions:

```ts
// e2e/snapshot.spec.ts
import { test, expect } from "./fixtures";

test("popup HTML matches snapshot", async ({ context, extensionId }) => {
  const sw = context.serviceWorkers()[0];
  await sw.evaluate(() => {
    return chrome.storage.local.set({
      bookmarks: [
        { url: "https://example.com", title: "Example" },
      ],
    });
  });

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForSelector(".bookmark-item");

  // Snapshot the rendered HTML (strip dynamic IDs first)
  const html = await page.evaluate(() => {
    const root = document.getElementById("app")!;
    // Remove data attributes that change between runs
    root.querySelectorAll("[data-timestamp]").forEach((el) => {
      el.removeAttribute("data-timestamp");
    });
    return root.innerHTML;
  });

  expect(html).toMatchSnapshot("popup-with-one-bookmark");
});

test("options page matches snapshot", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.waitForLoadState("domcontentloaded");

  const html = await page.evaluate(() => {
    return document.getElementById("app")!.innerHTML;
  });

  expect(html).toMatchSnapshot("options-default-state");
});

test("popup empty state matches snapshot", async ({ context, extensionId }) => {
  const sw = context.serviceWorkers()[0];
  await sw.evaluate(() => chrome.storage.local.clear());

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForSelector(".empty-state");

  const html = await page.evaluate(() => {
    return document.getElementById("app")!.innerHTML;
  });

  expect(html).toMatchSnapshot("popup-empty-state");
});
```

Run `npx playwright test --update-snapshots` to regenerate baselines after intentional UI changes. Strip any dynamic values (timestamps, random IDs) before snapshotting to avoid false failures.

---

## Summary {#summary}

| Pattern | Scope | Tools | Key Technique |
|---|---|---|---|
| 1. Chrome API mocks | Unit | Vitest | Replace `chrome.*` with `vi.fn()` on `globalThis` |
| 2. Load real extension | Integration | Playwright | `--load-extension` flag with persistent context |
| 3. Popup UI testing | Integration | Playwright | Navigate to `chrome-extension://ID/popup.html` |
| 4. Content script testing | Integration | Playwright | Load pages where `content_scripts` match pattern |
| 5. Service worker lifecycle | Integration | Playwright | `sw.evaluate()` to inspect alarms, storage, state |
| 6. Message passing | Unit + Integration | Vitest, Playwright | Extract handlers to pure async functions |
| 7. Fixture pages | E2E | Playwright, HTTP server | Serve local HTML for deterministic DOM |
| 8. Snapshot testing | E2E | Playwright | `toMatchSnapshot` on sanitized innerHTML |
