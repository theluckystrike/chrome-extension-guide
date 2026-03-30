---
layout: default
title: "Chrome Extension Testing Extensions. Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/testing-extensions/"
last_modified_at: 2026-01-15
---
Testing Chrome Extensions

Overview {#overview}
Testing extensions is tricky because they run across multiple contexts (background, popup, content scripts) and depend on Chrome APIs. This guide covers strategies from unit tests to manual testing.

Testing Pyramid for Extensions {#testing-pyramid-for-extensions}
1. Unit tests. test pure logic, schema definitions, message types
2. Integration tests. test with mocked Chrome APIs
3. E2E tests. test the loaded extension in a real browser (Puppeteer/Playwright)
4. Manual testing. load unpacked and verify

Unit Testing Setup {#unit-testing-setup}

Install dependencies {#install-dependencies}
```bash
npm install -D vitest @anthropic-ai/claude-code
Testing Chrome Extensions Comprehensively

A guide to testing Chrome Extensions (Manifest V3) covering unit tests, integration tests, E2E tests, and manual verification.

Overview

Extensions run across service workers, content scripts, popup pages, and options pages. A solid testing strategy covers all contexts:

```
Manual Testing → E2E (Playwright/Puppeteer) → Integration (Mocked APIs) → Unit Tests
```

1. Unit Testing with Vitest

```bash
npm install -D vitest @vitest/coverage-v8 jsdom
```

vitest.config.ts {#vitestconfigts}
```ts
import { defineConfig } from "vitest/config";

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.ts'] },
});

// src/utils.test.ts
import { describe, it, expect } from 'vitest';
describe('parseUrl', () => {
  it('extracts params', () => expect(parseUrlParams('?foo=bar')).toEqual({ foo: 'bar' }));
});
```

Testing @theluckystrike/webext-storage {#testing-theluckystrikewebext-storage}

Test schema definitions {#test-schema-definitions}
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

Mock chrome.storage for integration tests {#mock-chromestorage-for-integration-tests}
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

Test storage operations {#test-storage-operations}
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

Testing @theluckystrike/webext-messaging {#testing-theluckystrikewebext-messaging}

Test message type definitions {#test-message-type-definitions}
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

Mock chrome.runtime for messaging tests {#mock-chromeruntime-for-messaging-tests}
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
2. Mocking Chrome APIs

```typescript
// test/__mocks__/chrome.ts
import { vi } from 'vitest';
export const createChromeMock = () => ({
  storage: {
    local: {
      get: vi.fn(async (k) => (typeof k === 'string' ? { [k]: {} } : k)),
      set: vi.fn(async (i) => Object.assign({}, i)),
      remove: vi.fn(),
    },
    onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  runtime: { lastError: null, id: 'test-id', sendMessage: vi.fn(), onMessage: { addListener: vi.fn() } },
  tabs: { query: vi.fn(async () => [{ id: 1 }]) },
  declarativeNetRequest: { getRules: vi.fn(async () => ({ rules: [] })), updateDynamicRules: vi.fn() },
});
beforeAll(() => { globalThis.chrome = createChromeMock() as any; });
```

Testing @theluckystrike/webext-permissions {#testing-theluckystrikewebext-permissions}

Mock chrome.permissions {#mock-chromepermissions}
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

Test permission checks {#test-permission-checks}
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
3. Testing Content Scripts

```typescript
// src/content_scripts/scraper.test.ts
describe('scraper', () => {
  beforeEach(() => { document.body.innerHTML = '<title>Test</title><a href="/">Link</a>'; });
  it('extracts data', () => {
    const { title, links } = extractPageData();
    expect(title).toBe('Test');
    expect(links).toHaveLength(1);
  });
});
```

E2E Testing with Puppeteer {#e2e-testing-with-puppeteer}
4. Testing Service Worker Handlers

```typescript
// src/background/handlers.test.ts
describe('handlers', () => {
  it('sets installedAt on install', async () => {
    const mockSet = vi.fn();
    chrome.storage.local.set = mockSet;
    await chrome.storage.local.set({ installedAt: Date.now() });
    expect(mockSet).toHaveBeenCalled();
  });
});
```

Manual Testing Checklist {#manual-testing-checklist}
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

Debugging Tips {#debugging-tips}
- Background: `chrome://extensions` > service worker "Inspect"
- Popup: right-click popup > "Inspect"
- Content script: page DevTools > Console (select extension context in dropdown)
- Storage: DevTools > Application > Extension Storage
- Network: DevTools > Network tab (for fetch calls from background)

CI Setup (GitHub Actions) {#ci-setup-github-actions}
5. Testing Popup UI Components

```typescript
// src/popup/components/Toggle.test.ts
describe('Toggle', () => {
  it('toggles on click', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();
    new Toggle(onChange).render(container);
    container.querySelector('#toggle')!.click();
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

6. Integration Testing with Puppeteer

```typescript
// e2e/puppeteer.test.ts
import puppeteer from 'puppeteer';
test('loads extension', async () => {
  const browser = await puppeteer.launch({ args: [`--load-extension=./dist`] });
  const targets = await browser.targets();
  expect(targets.find(t => t.type() === 'service_worker')).toBeDefined();
});
```

7. Integration Testing with Playwright

```typescript
// e2e/playwright.test.ts
import { test, expect, chromium } from '@playwright/test';
test('popup works', async () => {
  const browser = await chromium.launch({ args: [`--load-extension=./dist`] });
  const extId = browser.targets().find(t => t.type() === 'service_worker')?.url().split('/')[2];
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${extId}/popup.html`);
  await popup.click('#toggle');
  expect(await popup.textContent('#status')).toBe('Enabled');
});
```

8. Loading Unpacked Extensions

```typescript
// test/utils/load-extension.ts
export function getChromeArgs(path: string): string[] {
  return ['--no-sandbox', `--load-extension=${path}`];
}
```

9. End-to-End Workflows

```typescript
// e2e/user-journey.test.ts
test('complete flow', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('https://example.com');
  const state = await page.evaluate(() => (window as any).__EXT_ENABLED__);
  expect(state).toBeDefined();
});
```

10. Testing Message Passing

```typescript
// test/messaging.test.ts
describe('messaging', () => {
  it('sends message', async () => {
    const send = vi.fn((m, cb) => cb({ ok: true }));
    chrome.runtime.sendMessage = send;
    await chrome.runtime.sendMessage({ action: 'ping' });
    expect(send).toHaveBeenCalledWith({ action: 'ping' });
  });
});
```

11. Testing Storage Operations

```typescript
// test/storage.test.ts
describe('storage', () => {
  it('stores and retrieves', async () => {
    chrome.storage.local.set = vi.fn(async (i) => Object.assign({}, i));
    chrome.storage.local.get = vi.fn(async () => ({ theme: 'dark' }));
    await chrome.storage.local.set({ theme: 'dark' });
    const r = await chrome.storage.local.get('theme');
    expect(r.theme).toBe('dark');
  });
});
```

12. Testing declarativeNetRequest

```typescript
// test/dnr.test.ts
describe('declarativeNetRequest', () => {
  it('updates rules', async () => {
    const update = vi.fn();
    chrome.declarativeNetRequest.updateDynamicRules = update;
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [{ id: 1, priority: 1, action: { type: 'block' }, condition: { urlFilter: '.*' } }] });
    expect(update).toHaveBeenCalled();
  });
});
```

13. Snapshot Testing for UI

```typescript
// src/popup/snapshot.test.ts
import { renderToStaticMarkup } from 'react-dom/server';
describe('snapshots', () => {
  it('matches', () => { expect(renderToStaticMarkup(Popup({ enabled: false }))).toMatchSnapshot(); });
});
```

14. Code Coverage

```bash
npm run test:coverage  # vitest --coverage
```

15. CI/CD Setup

```yaml
.github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4 with: node-version: 20
      - run: npm ci && npm run test:unit
      - run: npm run build && npx playwright install chromium
      - run: npm run test:e2e
```

Related Guides {#related-guides}
- [Background Patterns](background-patterns.md)
- [Content Script Patterns](content-script-patterns.md)
- [Popup Patterns](popup-patterns.md)
```

Related Articles {#related-articles}

Related Articles

- [Testing Strategies](../guides/chrome-extension-testing-strategies.md)
- [E2E Testing Patterns](../patterns/e2e-testing-patterns.md)
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
16. GitHub Actions for Extension Tests

```yaml
jobs:
  test-versions:
    strategy:
      matrix:
        chrome: [stable, beta, dev]
    steps:
{% raw %}
      - run: npx playwright test --browser-channel=${{ matrix.chrome }}
{% endraw %}
```

17. Testing Across Chrome Versions

```typescript
// test/cross-version.test.ts
test.describe('cross-version', () => {
  for (const v of ['stable', 'beta']) {
    test(`works on ${v}`, async ({ browser }) => {
      const b = await chromium.launch({ channel: v });
      expect(b).toBeDefined();
    });
  }
});
```

18. Manual Testing Checklist

- [ ] Load unpacked in chrome://extensions (Developer mode on)
- [ ] Verify toolbar icon appears
- [ ] Test popup opens and interactions work
- [ ] Test options page loads and saves
- [ ] Test content script on target pages
- [ ] Test messaging between contexts
- [ ] Test service worker restart
- [ ] Test after browser restart
- [ ] Test with permissions revoked
- [ ] Check DevTools console for errors
- [ ] Test in Incognito mode
- [ ] Test on Chrome stable

19. Debugging Test Failures

```typescript
// Debug helper
const debugChrome = (name: string, fn: Function) => async (...args: any[]) => {
  console.log(`[Chrome] ${name}`, args);
  const result = await fn(...args);
  console.log(`[Chrome] ${name} →`, result);
  return result;
};
// Fixes: chrome undefined → add mock; async issues → await setTimeout; load fails → check manifest
```

20. Reference

- Debug guide: https://developer.chrome.com/docs/extensions/get-started/tutorial/debug

Related Guides

- [Testing Strategies](chrome-extension-testing-strategies.md)
- [Puppeteer](extension-testing-with-puppeteer.md)
- [Playwright](extension-testing-with-playwright.md)
