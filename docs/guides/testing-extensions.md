---
layout: default
title: "Chrome Extension Testing Extensions — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/testing-extensions/"
---
# Testing Chrome Extensions

## Overview {#overview}
Testing extensions is tricky because they run across multiple contexts (background, popup, content scripts) and depend on Chrome APIs. This guide covers strategies from unit tests to manual testing.

## Testing Pyramid for Extensions {#testing-pyramid-for-extensions}
1. **Unit tests** — test pure logic, schema definitions, message types
2. **Integration tests** — test with mocked Chrome APIs
3. **E2E tests** — test the loaded extension in a real browser (Puppeteer/Playwright)
4. **Manual testing** — load unpacked and verify

## Unit Testing Setup {#unit-testing-setup}

### Install dependencies {#install-dependencies}
```bash
npm install -D vitest @anthropic-ai/claude-code
```

Actually, for testing:
```bash
npm install -D vitest
```

### vitest.config.ts {#vitestconfigts}
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
});
```

## Testing @theluckystrike/webext-storage {#testing-theluckystrikewebext-storage}

### Test schema definitions {#test-schema-definitions}
```ts
import { defineSchema } from "@theluckystrike/webext-storage";

describe("schema", () => {
  it("should define schema with correct defaults", () => {
    const schema = defineSchema({
      theme: "dark" as "dark" | "light",
      count: 0,
      enabled: true,
    });

    expect(schema.theme).toBe("dark");
    expect(schema.count).toBe(0);
    expect(schema.enabled).toBe(true);
  });
});
```

### Mock chrome.storage for integration tests {#mock-chromestorage-for-integration-tests}
```ts
// __mocks__/chrome.ts
const store: Record<string, unknown> = {};

const mockStorage = {
  local: {
    get: vi.fn(async (keys) => {
      const result: Record<string, unknown> = {};
      if (typeof keys === "object") {
        for (const [key, defaultValue] of Object.entries(keys)) {
          result[key] = store[key] ?? defaultValue;
        }
      }
      return result;
    }),
    set: vi.fn(async (items) => {
      Object.assign(store, items);
    }),
    remove: vi.fn(async (keys) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      keyList.forEach(k => delete store[k]);
    }),
  },
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

(globalThis as any).chrome = { storage: mockStorage, runtime: { lastError: null } };
```

### Test storage operations {#test-storage-operations}
```ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

describe("TypedStorage", () => {
  const schema = defineSchema({ count: 0, name: "default" });
  const storage = createStorage({ schema, area: "local" });

  it("should get default values", async () => {
    const count = await storage.get("count");
    expect(count).toBe(0);
  });

  it("should set and get values", async () => {
    await storage.set("count", 42);
    const count = await storage.get("count");
    expect(count).toBe(42);
  });

  it("should get multiple values", async () => {
    await storage.setMany({ count: 10, name: "test" });
    const result = await storage.getMany(["count", "name"]);
    expect(result.count).toBe(10);
    expect(result.name).toBe("test");
  });
});
```

## Testing @theluckystrike/webext-messaging {#testing-theluckystrikewebext-messaging}

### Test message type definitions {#test-message-type-definitions}
```ts
// Compile-time type testing
type Messages = {
  getUser: { request: { id: number }; response: { name: string } };
  ping: { request: void; response: "pong" };
};

// This is mostly a compile-time check
// If it compiles, your types are correct
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();
```

### Mock chrome.runtime for messaging tests {#mock-chromeruntime-for-messaging-tests}
```ts
const listeners: Function[] = [];

(globalThis as any).chrome = {
  runtime: {
    sendMessage: vi.fn((message, callback) => {
      // Simulate handler response
      for (const listener of listeners) {
        const result = listener(message, {}, (response: unknown) => {
          callback(response);
        });
        if (result === true) return; // async handler
      }
    }),
    onMessage: {
      addListener: vi.fn((fn) => listeners.push(fn)),
      removeListener: vi.fn((fn) => {
        const idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      }),
    },
    lastError: null,
  },
};
```

## Testing @theluckystrike/webext-permissions {#testing-theluckystrikewebext-permissions}

### Mock chrome.permissions {#mock-chromepermissions}
```ts
const grantedPermissions = new Set(["storage"]);

(globalThis as any).chrome = {
  permissions: {
    contains: vi.fn((request, callback) => {
      const granted = request.permissions.every((p: string) => grantedPermissions.has(p));
      callback(granted);
    }),
    request: vi.fn((request, callback) => {
      request.permissions.forEach((p: string) => grantedPermissions.add(p));
      callback(true);
    }),
    remove: vi.fn((request, callback) => {
      request.permissions.forEach((p: string) => grantedPermissions.delete(p));
      callback(true);
    }),
    getAll: vi.fn((callback) => {
      callback({ permissions: Array.from(grantedPermissions) });
    }),
  },
  runtime: { lastError: null },
};
```

### Test permission checks {#test-permission-checks}
```ts
import { checkPermission, describePermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

describe("permissions", () => {
  it("should check granted permissions", async () => {
    const result = await checkPermission("storage");
    expect(result.granted).toBe(true);
    expect(result.description).toBe("Store and retrieve data locally");
  });

  it("should describe permissions", () => {
    expect(describePermission("tabs")).toBe("Read information about open tabs");
    expect(describePermission("unknown")).toBe('Use the "unknown" API');
  });

  it("should have all descriptions", () => {
    expect(Object.keys(PERMISSION_DESCRIPTIONS).length).toBeGreaterThan(40);
  });
});
```

## E2E Testing with Puppeteer {#e2e-testing-with-puppeteer}

```ts
import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

// Get the extension ID
const targets = await browser.targets();
const extensionTarget = targets.find(t => t.type() === "service_worker");
const extensionUrl = extensionTarget?.url();
const extensionId = extensionUrl?.split("/")[2];

// Open popup
const popupPage = await browser.newPage();
await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

// Interact with popup
await popupPage.click("#toggle-button");
const text = await popupPage.$eval("#status", el => el.textContent);
expect(text).toBe("Enabled");
```

## Manual Testing Checklist {#manual-testing-checklist}
- [ ] Load unpacked extension in chrome://extensions
- [ ] Test popup opens and displays correctly
- [ ] Test all popup actions
- [ ] Test options page loads and saves settings
- [ ] Test content script on target pages
- [ ] Test messaging between all contexts
- [ ] Test after browser restart
- [ ] Test after extension update
- [ ] Test with permissions revoked
- [ ] Test error states (network down, API errors)
- [ ] Check DevTools console for errors in each context
- [ ] Test on Chrome stable (not just dev)

## Debugging Tips {#debugging-tips}
- Background: `chrome://extensions` > service worker "Inspect"
- Popup: right-click popup > "Inspect"
- Content script: page DevTools > Console (select extension context in dropdown)
- Storage: DevTools > Application > Extension Storage
- Network: DevTools > Network tab (for fetch calls from background)

## CI Setup (GitHub Actions) {#ci-setup-github-actions}

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm test
```

## Related Guides {#related-guides}
- [Background Patterns](background-patterns.md)
- [Content Script Patterns](content-script-patterns.md)
- [Popup Patterns](popup-patterns.md)
```

## Related Articles {#related-articles}

## Related Articles

- [Testing Strategies](../guides/chrome-extension-testing-strategies.md)
- [E2E Testing Patterns](../patterns/e2e-testing-patterns.md)
