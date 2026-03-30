---
layout: default
title: "Chrome Extension Testing Mv3 Extensions. Manifest V3 Guide"
description: "Testing strategies for Manifest V3 Chrome extensions."
canonical_url: "https://bestchromeextensions.com/mv3/testing-mv3-extensions/"
last_modified_at: 2026-01-15
---

Testing MV3 Extensions

Unit Testing Service Workers {#unit-testing-service-workers}
Service workers have no DOM. test business logic separately.

```typescript
// logic.ts. pure functions, no chrome.* dependencies
export function parseUrl(url: string): { domain: string; path: string } {
  const u = new URL(url);
  return { domain: u.hostname, path: u.pathname };
}

export function shouldBlock(domain: string, blocklist: string[]): boolean {
  return blocklist.some(b => domain.endsWith(b));
}
```

```typescript
// logic.test.ts. standard test runner (vitest, jest)
import { parseUrl, shouldBlock } from './logic';

test('parseUrl extracts domain', () => {
  expect(parseUrl('https://example.com/path')).toEqual({
    domain: 'example.com', path: '/path'
  });
});

test('shouldBlock matches suffix', () => {
  expect(shouldBlock('ads.example.com', ['example.com'])).toBe(true);
  expect(shouldBlock('safe.org', ['example.com'])).toBe(false);
});
```

Mocking Chrome APIs {#mocking-chrome-apis}
```typescript
// __mocks__/chrome.ts
export const chrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      getBytesInUse: vi.fn().mockResolvedValue(0)
    },
    sync: { get: vi.fn(), set: vi.fn() },
    onChanged: { addListener: vi.fn() }
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    onInstalled: { addListener: vi.fn() },
    getURL: vi.fn((path) => `chrome-extension://abc/${path}`),
    lastError: null
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    get: vi.fn()
  },
  alarms: {
    create: vi.fn(),
    get: vi.fn(),
    onAlarm: { addListener: vi.fn() }
  },
  action: {
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn()
  }
};
globalThis.chrome = chrome as any;
```

Testing with @theluckystrike/webext-storage {#testing-with-theluckystrikewebext-storage}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

// In tests, mock chrome.storage before creating storage instance
vi.stubGlobal('chrome', { storage: { local: mockStorage } });

const schema = defineSchema({ count: 'number', name: 'string' });
const storage = createStorage(schema, 'local');

test('storage set and get', async () => {
  await storage.set('count', 42);
  expect(mockStorage.set).toHaveBeenCalledWith({ count: 42 });
});
```

Integration Testing with Puppeteer {#integration-testing-with-puppeteer}
```typescript
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ]
});

// Get extension ID
const targets = await browser.targets();
const extTarget = targets.find(t => t.type() === 'service_worker');
const extId = extTarget?.url().match(/chrome-extension:\/\/([^/]+)/)?.[1];

// Test popup
const page = await browser.newPage();
await page.goto(`chrome-extension://${extId}/popup.html`);
const button = await page.$('#toggle-btn');
await button?.click();
const text = await page.$eval('#status', el => el.textContent);
expect(text).toBe('Enabled');
```

Testing with Playwright {#testing-with-playwright}
```typescript
import { chromium } from 'playwright';

const context = await chromium.launchPersistentContext('', {
  headless: false,
  args: [`--load-extension=${extensionPath}`]
});

// Wait for service worker
let [sw] = context.serviceWorkers();
if (!sw) sw = await context.waitForEvent('serviceworker');
const extId = sw.url().split('/')[2];

const page = await context.newPage();
await page.goto(`chrome-extension://${extId}/popup.html`);
```

Testing Service Worker Lifecycle {#testing-service-worker-lifecycle}
```typescript
// Test that extension survives SW termination
test('survives service worker restart', async () => {
  // Set some state
  await page.goto(`chrome-extension://${extId}/popup.html`);
  await page.click('#save-data');

  // Terminate SW (via DevTools protocol)
  const client = await page.target().createCDPSession();
  await client.send('ServiceWorker.stopAllWorkers');

  // Wait for restart
  await page.waitForTimeout(1000);

  // Verify state persisted
  await page.reload();
  const value = await page.$eval('#data', el => el.textContent);
  expect(value).toBe('saved data');
});
```

Testing Content Scripts {#testing-content-scripts}
```typescript
test('content script injects UI', async () => {
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.waitForSelector('#my-extension-overlay');
  const visible = await page.$eval('#my-extension-overlay',
    el => window.getComputedStyle(el).display !== 'none'
  );
  expect(visible).toBe(true);
});
```

E2E Test Structure {#e2e-test-structure}
```
tests/
  unit/           # Pure logic, no chrome APIs
  integration/    # With mocked chrome APIs
  e2e/            # Full browser tests (Puppeteer/Playwright)
  fixtures/       # Test data, mock responses
  __mocks__/      # Chrome API mocks
```

CI/CD Testing {#cicd-testing}
```yaml
.github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci && npm run build
      - run: npx playwright install chromium
      - run: npm run test:e2e
```

Common Testing Pitfalls {#common-testing-pitfalls}
- Testing chrome API calls without mocks. throws errors
- Not testing SW termination recovery. state loss bugs
- Hardcoding extension IDs. use dynamic discovery
- Not testing permission prompts. user flow gaps
- Ignoring CSP in test environments. inline scripts break

Cross-References {#cross-references}
- Guide: `docs/guides/testing-extensions.md`
- MV3: `docs/mv3/service-workers.md`
- Guide: `docs/guides/ci-cd-pipeline.md`
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
