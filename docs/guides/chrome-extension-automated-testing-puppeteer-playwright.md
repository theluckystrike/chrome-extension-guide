---
layout: default
title: "Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration"
description: "A comprehensive guide to automated testing for Chrome extensions using Puppeteer and Playwright. Learn E2E testing patterns, CI/CD integration, mocking Chrome APIs, and test coverage strategies."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-automated-testing-puppeteer-playwright/"
---

# Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration

Automated testing is essential for maintaining reliable Chrome extensions. Unlike traditional web applications, extensions involve multiple runtime contexts—popup pages, background service workers, and content scripts—that communicate through message passing. This guide covers comprehensive testing strategies using Puppeteer and Playwright, including fixture management, API mocking, and CI integration.

## Loading Unpacked Extensions in Puppeteer

Puppeteer provides direct support for loading Chrome extensions through the `args` configuration. The key is using the `--load-extension` flag to point to your unpacked extension directory.

### Basic Extension Loading

```typescript
import puppeteer, { type Browser, type Page } from 'puppeteer';

interface ExtensionContext {
  browser: Browser;
  extensionId: string;
  popupPage: Page;
}

async function loadExtension(extensionPath: string): Promise<ExtensionContext> {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--disable-gpu',
    ],
  });

  // Extract extension ID from service worker URL
  const target = await browser.waitForTarget(
    (t) => t.type() === 'service_worker' && t.url().startsWith('chrome-extension://')
  );

  const extensionId = new URL(target.url()).hostname;
  
  // Open the popup
  const popupPage = await browser.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

  return { browser, extensionId, popupPage };
}
```

### Handling Manifest V3 Service Workers

In Manifest V3, background scripts run as service workers instead of background pages. Testing service worker events requires understanding their lifecycle:

```typescript
async function waitForServiceWorkerReady(browser: Browser, extensionId: string): Promise<Page> {
  const targets = await browser.targets();
  const swTarget = targets.find(
    (t) => t.type() === 'service_worker' && t.url().includes(extensionId)
  );
  
  if (!swTarget) {
    throw new Error('Service worker not found');
  }

  const sw = await swTarget.worker();
  
  // Wait for service worker to be ready
  await new Promise<void>((resolve) => {
    if (sw.url()) {
      resolve();
    } else {
      sw.once('attached', () => resolve());
    }
  });

  return sw;
}
```

## Playwright Extension Fixtures

Playwright's extension testing capabilities have matured significantly, offering a more ergonomic API than Puppeteer. The key advantage is the built-in `chromium.launchPersistentContext` approach that handles extension loading automatically.

### Setting Up Extension Fixtures

```typescript
// fixtures/extension.ts
import { test as base, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';

export interface ExtensionFixtures {
  extensionId: string;
  extensionPage: Page;
}

const extension = base.extend<ExtensionFixtures>({
  extensionId: async ({ browser }, use) => {
    const extensionPath = path.resolve(__dirname, '../dist/chrome');
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    // Get the extension ID from the service worker
    const serviceWorker = context.serviceWorkers()[0];
    if (!serviceWorker) {
      throw new Error('Service worker not initialized');
    }
    
    const url = new URL(serviceWorker.url());
    const extensionId = url.hostname;
    
    await context.close();
    
    await use(extensionId);
  },

  extensionPage: async ({ browser, extensionId }, use) => {
    const extensionPath = path.resolve(__dirname, '../dist/chrome');
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    
    await use(page);
    
    await context.close();
  },
});

export { extension as test };
```

## Testing Popup Interactions

The popup is often the primary user interface for extensions. Testing it requires understanding the isolated context and how state persists.

### Popup State Testing

```typescript
// tests/popup.spec.ts
import { test, expect } from '@playwright/test';
import { loadExtension } from '../helpers/extension';

test.describe('Popup Interactions', () => {
  let extensionId: string;
  let popupPage: any;

  test.beforeEach(async () => {
    const extensionPath = path.resolve(__dirname, '../dist/chrome');
    const context = await chromium.launchPersistentContext('', {
      args: [`--load-extension=${extensionPath}`],
    });
    
    const serviceWorker = context.serviceWorkers()[0];
    extensionId = new URL(serviceWorker.url()).hostname;
    
    popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
  });

  test('popup displays current user settings', async () => {
    // Check that the settings UI renders correctly
    await expect(popupPage.locator('.settings-panel')).toBeVisible();
    await expect(popupPage.locator('#enable-toggle')).toBeVisible();
  });

  test('toggle persists state across popup closes', async () => {
    const toggle = popupPage.locator('#enable-toggle');
    
    // Enable the feature
    await toggle.click();
    await expect(toggle).toBeChecked();
    
    // Close and reopen popup
    await popupPage.close();
    const newPage = await popupPage.context().newPage();
    await newPage.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Verify persistence
    await expect(newPage.locator('#enable-toggle')).toBeChecked();
  });

  test('popup sends message to service worker', async () => {
    const saveButton = popupPage.locator('#save-settings');
    await saveButton.click();
    
    // The popup should communicate with the background
    // We can verify this through storage changes
    const storage = await popupPage.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get(['settings'], (result) => {
          resolve(result.settings);
        });
      });
    });
    
    expect(storage).toBeDefined();
  });
});
```

## Content Script Verification

Content scripts run in the context of web pages, making them slightly more complex to test. You need to ensure they inject correctly and respond to page events.

### Content Script Testing Patterns

```typescript
// tests/content-script.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Content Script Injection', () => {
  test('injects on matching pages', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Wait for content script to inject
    const overlay = page.locator('#my-extension-overlay');
    await expect(overlay).toBeVisible({ timeout: 5000 });
    
    // Verify overlay functionality
    await overlay.locator('.close-btn').click();
    await expect(overlay).not.toBeVisible();
  });

  test('communicates with background via messaging', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Send message from content script
    const response = await page.evaluate(() => {
      return new Promise((resolve) => {
        (chrome as any).runtime.sendMessage(
          { action: 'getTabData' },
          (response: any) => resolve(response)
        );
      });
    });
    
    expect(response).toHaveProperty('tabId');
  });

  test('does not inject on non-matching pages', async ({ page }) => {
    await page.goto('https://google.com');
    
    // Wait briefly to ensure no injection
    await page.waitForTimeout(1000);
    
    const overlay = page.locator('#my-extension-overlay');
    await expect(overlay).not.toBeVisible();
  });
});
```

## Service Worker Event Testing

Service workers handle background logic including alarms, notifications, and message passing. Testing these requires triggering events and verifying state changes.

### Background Event Testing

```typescript
// tests/service-worker.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Service Worker Events', () => {
  test('alarms fire on schedule', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '../dist/chrome');
    const context = await browser.newContext({
      args: [`--load-extension=${extensionPath}`],
    });

    // Get the service worker
    const sw = context.serviceWorkers()[0];
    if (!sw) throw new Error('No service worker');

    // Set up an alarm listener via console
    await sw.evaluate(() => {
      (globalThis as any).__alarmFired = false;
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'sync-data') {
          (globalThis as any).__alarmFired = true;
        }
      });
    });

    // Create the alarm
    await sw.evaluate(() => {
      chrome.alarms.create('sync-data', { delayInMinutes: 0.01 });
    });

    // Wait for alarm to fire (slightly longer than the delay)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify alarm fired
    const fired = await sw.evaluate(() => (globalThis as any).__alarmFired);
    expect(fired).toBe(true);

    await context.close();
  });

  test('message passing works between contexts', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '../dist/chrome');
    const context = await browser.newContext({
      args: [`--load-extension=${extensionPath}`],
    });

    const page = await context.newPage();
    const sw = context.serviceWorkers()[0];

    // Set up response handler in service worker
    await sw.evaluate(() => {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'ping') {
          sendResponse({ status: 'pong', timestamp: Date.now() });
        }
      });
    });

    // Send message from page
    const response = await page.evaluate(() => {
      return (chrome as any).runtime.sendMessage({ action: 'ping' });
    });

    expect(response.status).toBe('pong');
    expect(response.timestamp).toBeDefined();

    await context.close();
  });
});
```

## Screenshot Comparison for Visual Regression

Visual testing catches UI regressions that might slip through functional tests. Playwright's screenshot capabilities work well with extensions.

### Visual Regression Testing

```typescript
// tests/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('popup matches baseline screenshots', async ({ page }) => {
    const extensionPath = path.resolve(__dirname, '../dist/chrome');
    const context = await page.context();
    
    // Note: Would need to properly set up extension context here
    await page.goto('chrome-extension://EXTENSION_ID/popup.html');
    
    // Take screenshot
    await expect(page).toHaveScreenshot('popup-default.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('popup adapts to different sizes', async ({ page }) => {
    const extensionPath = path.resolve(__dirname, '../dist/chrome');
    
    // Test in compact mode
    await page.setViewportSize({ width: 400, height: 300 });
    await page.goto('chrome-extension://EXTENSION_ID/popup.html');
    
    await expect(page).toHaveScreenshot('popup-compact.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});
```

## End-to-End Test Patterns

E2E tests verify complete user workflows across multiple components. For extensions, this often means coordinating between popup, content scripts, and background logic.

### Complete E2E Workflow Testing

```typescript
// tests/e2e/workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Extension Workflow', () => {
  test('user can enable extension and see page modifications', async ({ page }) => {
    // 1. Open popup and enable extension
    const popup = await openPopup(page, extensionId);
    await popup.locator('#enable-toggle').check();
    await popup.locator('#save-button').click();
    
    // 2. Navigate to a target page
    await page.goto('https://example.com');
    
    // 3. Verify content script injected
    const indicator = page.locator('.extension-active-indicator');
    await expect(indicator).toBeVisible();
    
    // 4. Interact with page features
    await page.locator('.highlight-button').click();
    
    // 5. Verify data was saved
    const storage = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get(['highlights'], resolve);
      });
    });
    
    expect(storage.highlights).toHaveLength(1);
  });
});

async function openPopup(page: Page, extensionId: string) {
  const popup = await page.context().newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  return popup;
}
```

## Mocking Chrome APIs

Testing extensions often requires mocking Chrome APIs to control behavior or test edge cases without relying on actual browser APIs.

### API Mocking Strategies

```typescript
// helpers/mock-chrome.ts
export function createChromeMock(overrides: Partial<typeof chrome> = {}) {
  const mockStorage = new Map<string, any>();
  
  const defaultChrome = {
    runtime: {
      id: 'mock-extension-id',
      sendMessage: jest.fn(),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      getURL: (path: string) => `chrome-extension://mock/${path}`,
    },
    storage: {
      local: {
        get: jest.fn((keys: string | string[]) => {
          const result: Record<string, any> = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach((key) => {
            if (mockStorage.has(key)) {
              result[key] = mockStorage.get(key);
            }
          });
          return Promise.resolve(result);
        }),
        set: jest.fn((items: Record<string, any>) => {
          Object.entries(items).forEach(([key, value]) => {
            mockStorage.set(key, value);
          });
          return Promise.resolve();
        }),
      },
    },
    tabs: {
      query: jest.fn(() => Promise.resolve([])),
      create: jest.fn(),
      remove: jest.fn(),
    },
    alarms: {
      create: jest.fn(),
      onAlarm: {
        addListener: jest.fn(),
      },
    },
  };

  return { ...defaultChrome, ...overrides };
}

// In tests, inject the mock
test('popup works with mocked storage', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).chrome = require('./helpers/mock-chrome');
  });
  
  await page.goto('chrome-extension://EXTENSION_ID/popup.html');
  // Tests now use mock data
});
```

## GitHub Actions CI Setup

Running extension tests in CI requires specific configuration since extensions need a browser with a display.

### CI Workflow Configuration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v4
        with:
          version: 9
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Build extension
        run: pnpm build
        
      - name: Install Playwright browsers
        run: pnpm exec playwright install chromium
        
      - name: Run E2E tests
        run: xvfb-run pnpm exec playwright test
        env:
          CI: true
          
      - name: Upload test reports
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Coverage Reporting

Measuring test coverage helps identify untested code paths. For extensions, you need to consider multiple contexts.

### Coverage Setup

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 2,
  workers: 1, // Extensions don't parallelize well
  reporter: [
    ['html'],
    ['json', { outputFile: 'coverage/coverage.json' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

### Collecting Coverage Data

```typescript
// helpers/coverage.ts
export async function getCoverage(context: any): Promise<any> {
  const coverage = await context.evaluate(() => {
    return (window as any).__coverage__;
  });
  return coverage;
}

// Merge coverage from multiple contexts
export function mergeCoverage(reports: any[]) {
  // Use istanbul-lib-coverage to merge
  const { createCoverageMap } = require('istanbul-lib-coverage');
  const map = createCoverageMap({});
  
  reports.forEach((report) => {
    map.merge(report);
  });
  
  return map;
}
```

## Fixture Management Best Practices

Proper fixture management ensures tests are isolated, repeatable, and maintainable.

### Organized Fixtures

```typescript
// fixtures/index.ts
export { extension } from './extension';
export { mockChrome } from './chrome-mock';
export { createTestPage } from './test-page';

// fixtures/extension.ts - Main extension fixture with proper cleanup
import { test as base, type BrowserContext } from '@playwright/test';

const extensionBase = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({ browser }, use) => {
    const extensionPath = process.env.EXTENSION_PATH || './dist/chrome';
    
    const context = await browser.newContext({
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    
    await use(context);
    await context.close();
  },
  
  extensionId: async ({ context }, use) => {
    const sw = context.serviceWorkers()[0];
    if (!sw) throw new Error('Service worker not found');
    
    const id = new URL(sw.url()).hostname;
    await use(id);
  },
});

export const test = extensionBase;
export { expect } from '@playwright/test';
```

## Summary

Automated testing for Chrome extensions requires understanding the unique architecture of browser extensions. Key points from this guide include:

1. **Puppeteer and Playwright both support extension loading** — Playwright's API is more ergonomic, while Puppeteer offers deeper control.

2. **Fixture management is critical** — properly scoped fixtures ensure test isolation and cleanups.

3. **Multiple contexts need testing** — popup, content scripts, and service workers all require specific testing strategies.

4. **API mocking enables testing edge cases** — mock Chrome APIs to test error conditions and reduce test flakiness.

5. **CI requires display server** — use xvfb or headed mode in GitHub Actions.

6. **Coverage reporting helps identify gaps** — collect coverage from all extension contexts.

Cross-references:
- [CI/CD Pipeline Guide](./ci-cd-pipeline.md) — automated build and test workflows
- [Chrome Extension Development](./chrome-extension-development-typescript-2026.md) — setting up your development environment

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
