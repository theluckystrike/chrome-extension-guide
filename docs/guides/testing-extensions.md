# Testing Chrome Extensions Comprehensively

A guide to testing Chrome Extensions (Manifest V3) covering unit tests, integration tests, E2E tests, and manual verification.

## Overview

Extensions run across service workers, content scripts, popup pages, and options pages. A robust testing strategy covers all contexts:

```
Manual Testing → E2E (Playwright/Puppeteer) → Integration (Mocked APIs) → Unit Tests
```

## 1. Unit Testing with Vitest

```bash
npm install -D vitest @vitest/coverage-v8 jsdom
```

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

## 2. Mocking Chrome APIs

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

## 3. Testing Content Scripts

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

## 4. Testing Service Worker Handlers

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

## 5. Testing Popup UI Components

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

## 6. Integration Testing with Puppeteer

```typescript
// e2e/puppeteer.test.ts
import puppeteer from 'puppeteer';
test('loads extension', async () => {
  const browser = await puppeteer.launch({ args: [`--load-extension=./dist`] });
  const targets = await browser.targets();
  expect(targets.find(t => t.type() === 'service_worker')).toBeDefined();
});
```

## 7. Integration Testing with Playwright

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

## 8. Loading Unpacked Extensions

```typescript
// test/utils/load-extension.ts
export function getChromeArgs(path: string): string[] {
  return ['--no-sandbox', `--load-extension=${path}`];
}
```

## 9. End-to-End Workflows

```typescript
// e2e/user-journey.test.ts
test('complete flow', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('https://example.com');
  const state = await page.evaluate(() => (window as any).__EXT_ENABLED__);
  expect(state).toBeDefined();
});
```

## 10. Testing Message Passing

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

## 11. Testing Storage Operations

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

## 12. Testing declarativeNetRequest

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

## 13. Snapshot Testing for UI

```typescript
// src/popup/snapshot.test.ts
import { renderToStaticMarkup } from 'react-dom/server';
describe('snapshots', () => {
  it('matches', () => { expect(renderToStaticMarkup(Popup({ enabled: false }))).toMatchSnapshot(); });
});
```

## 14. Code Coverage

```bash
npm run test:coverage  # vitest --coverage
```

## 15. CI/CD Setup

```yaml
# .github/workflows/test.yml
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

## 16. GitHub Actions for Extension Tests

```yaml
jobs:
  test-versions:
    strategy:
      matrix:
        chrome: [stable, beta, dev]
    steps:
      - run: npx playwright test --browser-channel=${{ matrix.chrome }}
```

## 17. Testing Across Chrome Versions

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

## 18. Manual Testing Checklist

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

## 19. Debugging Test Failures

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

## 20. Reference

- Debug guide: https://developer.chrome.com/docs/extensions/get-started/tutorial/debug

## Related Guides

- [Testing Strategies](chrome-extension-testing-strategies.md)
- [Puppeteer](extension-testing-with-puppeteer.md)
- [Playwright](extension-testing-with-playwright.md)
