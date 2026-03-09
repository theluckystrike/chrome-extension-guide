---
layout: default
title: "Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration"
description: "Master automated testing for Chrome extensions with Puppeteer and Playwright. Learn to test popups, content scripts, service workers, mock Chrome APIs, and set up CI with GitHub Actions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-automated-testing-puppeteer-playwright/
---

# Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration

Automated testing is essential for building reliable Chrome extensions that work consistently across different contexts and browser states. Unlike standard web applications, Chrome extensions operate across multiple isolated environments—popup windows, content scripts, service workers, options pages, and side panels—each requiring specific testing approaches. This comprehensive guide covers testing strategies using Puppeteer and Playwright, including extension fixture management, Chrome API mocking, and CI/CD integration.

## Table of Contents {#table-of-contents}

- [Setting Up Your Testing Environment](#setting-up-your-testing-environment)
- [Loading Unpacked Extensions in Puppeteer](#loading-unpacked-extensions-in-puppeteer)
- [Playwright Extension Fixtures](#playwright-extension-fixtures)
- [Testing Popup Interactions](#testing-popup-interactions)
- [Content Script Verification](#content-script-verification)
- [Service Worker Event Testing](#service-worker-event-testing)
- [Screenshot Comparison for Visual Regression](#screenshot-comparison-for-visual-regression)
- [End-to-End Test Patterns](#end-to-end-test-patterns)
- [Mocking Chrome APIs](#mocking-chrome-apis)
- [GitHub Actions CI Setup](#github-actions-ci-setup)
- [Test Coverage Reporting](#test-coverage-reporting)
- [Fixture Management Best Practices](#fixture-management-best-practices)

---

## Setting Up Your Testing Environment {#setting-up-your-testing-environment}

Before diving into specific testing techniques, you need a solid testing environment. Both Puppeteer and Playwright can launch Chrome with extensions loaded, but the setup differs significantly between the two.

### Installing Dependencies

Create a dedicated test directory and install the necessary packages:

```bash
mkdir extension-test && cd extension-test
npm init -y
npm install --save-dev puppeteer playwright jest @playwright/test
```

For TypeScript projects, add TypeScript and type definitions:

```bash
npm install --save-dev typescript @types/node @types/jest
npx playwright install chromium
```

Organize your test files in a dedicated `__tests__` or `tests` directory at your extension's root level. This separation keeps your source code clean and makes it easier to configure test runners.

---

## Loading Unpacked Extensions in Puppeteer {#loading-unpacked-extensions-in-puppeteer}

Puppeteer provides direct control over launching Chrome with unpacked extensions. The key is using the `--disable-extensions-except` and `--load-extension` flags to specify your extension directory.

### Basic Puppeteer Setup

```javascript
// tests/puppeteer/setup.js
const puppeteer = require('puppeteer');
const path = require('path');

async function launchBrowserWithExtension(extensionPath) {
  const browser = await puppeteer.launch({
    headless: false, // Extensions require non-headless mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    defaultViewport: null
  });

  return browser;
}

async function runTests() {
  const extensionPath = path.resolve(__dirname, '../../dist');
  const browser = await launchBrowserWithExtension(extensionPath);
  
  // Get all pages including the extension popup
  const targets = await browser.targets();
  const extensionTarget = targets.find(
    target => target.type() === 'service_worker' || 
              target.url().startsWith('chrome-extension://')
  );
  
  const extensionUrl = extensionTarget.url();
  console.log('Extension loaded at:', extensionUrl);
  
  // Your test code here
  
  await browser.close();
}

runTests().catch(console.error);
```

### Handling Multiple Extensions

If your tests require multiple extensions (such as testing extension-to-extension communication), load them as a comma-separated list:

```javascript
const extensionPaths = [
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../helper-extension/dist')
].join(',');

const browser = await puppeteer.launch({
  args: [
    `--disable-extensions-except=${extensionPaths}`,
    `--load-extension=${extensionPaths}`
  ]
});
```

---

## Playwright Extension Fixtures {#playwright-extension-fixtures}

Playwright offers a more ergonomic approach through its extension testing utilities. The `chrome-launcher` and extension-related APIs provide cleaner abstractions for loading and testing extensions.

### Basic Playwright Extension Fixture

```typescript
// tests/fixtures/extension.ts
import { test as base, chromium, Browser, Page } from '@playwright/test';
import * as path from 'path';

export interface ExtensionFixture {
  browser: Browser;
  extensionId: string;
}

const extensionTest = base.extend<{ extension: ExtensionFixture }>({
  extension: async ({}, use) => {
    const extensionPath = path.resolve(__dirname, '../../dist');
    
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    // Extract extension ID from the background service worker
    const background = context.serviceWorkers()[0];
    const extensionId = background.url().match(/chrome-extension:\/\/([^/]+)/)?.[1];
    
    await use({
      browser: context.browser(),
      extensionId: extensionId || ''
    });

    await context.close();
  }
});

export { extensionTest };
```

### Using Fixtures in Tests

```typescript
// tests/popup.spec.ts
import { test, expect } from '@playwright/test';
import { extensionTest } from './fixtures/extension';

extensionTest('popup loads correctly', async ({ extension }) => {
  const popupUrl = `chrome-extension://${extension.extensionId}/popup.html`;
  
  // Open popup in a new page
  const popup = await extension.browser.newPage();
  await popup.goto(popupUrl);
  
  // Test popup content
  await expect(popup.locator('#status')).toHaveText('Ready');
  
  await popup.close();
});
```

---

## Testing Popup Interactions {#testing-popup-interactions}

Popup testing presents unique challenges because popup windows close automatically when they lose focus. You must complete all interactions before the popup closes.

### Popup Test Patterns

```typescript
// tests/popup/popup-interactions.spec.ts
import { extensionTest } from '../fixtures/extension';

extensionTest.describe('Popup Interactions', () => {
  extensionTest('should display user data after login', async ({ extension }) => {
    const popupUrl = `chrome-extension://${extension.extensionId}/popup.html`;
    const popup = await extension.browser.newPage();
    
    await popup.goto(popupUrl);
    
    // Click login button
    await popup.click('#login-button');
    
    // Fill credentials
    await popup.fill('#username', 'testuser');
    await popup.fill('#password', 'testpass');
    await popup.click('#submit-login');
    
    // Verify successful login
    await popup.waitForSelector('#user-profile', { state: 'visible' });
    await expect(popup.locator('#user-name')).toContainText('testuser');
    
    await popup.close();
  });

  extensionTest('should persist settings across sessions', async ({ extension }) => {
    const popupUrl = `chrome-extension://${extension.extensionId}/popup.html`;
    const context = await extension.browser.newContext();
    const popup = await context.newPage();
    
    await popup.goto(popupUrl);
    
    // Enable dark mode
    await popup.check('#dark-mode-toggle');
    await popup.waitForTimeout(500); // Wait for storage to sync
    
    // Close popup and reopen
    await popup.close();
    
    const popup2 = await context.newPage();
    await popup2.goto(popupUrl);
    
    // Verify setting persisted
    await expect(popup2.locator('#dark-mode-toggle')).toBeChecked();
    
    await popup2.close();
    await context.close();
  });
});
```

---

## Content Script Verification {#content-script-verification}

Content scripts run in the context of web pages, making them harder to test directly. You need to inject test pages that your content script can interact with.

### Content Script Testing Strategy

```typescript
// tests/content-scripts/content-script.spec.ts
import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Content Script Verification', () => {
  test('should inject and execute on target pages', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '../../dist');
    
    const context = await browser.launchPersistentContext('', {
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    // Navigate to a test page
    const page = await context.newPage();
    
    // Create a local test HTML file or navigate to your test server
    await page.goto('file://' + path.resolve(__dirname, '../fixtures/test-page.html'));
    
    // Wait for content script to inject
    await page.waitForSelector('[data-extension-injected="true"]', {
      timeout: 5000
    });
    
    // Verify content script modified the page
    const data = await page.evaluate(() => {
      return document.querySelector('#extension-data')?.textContent;
    });
    
    expect(data).toContain('extension-active');
    
    await context.close();
  });

  test('should communicate with background script', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '../../dist');
    
    const context = await browser.launchPersistentContext('', {
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    // Get the background service worker
    const bg = context.serviceWorkers()[0];
    
    // Create a test page
    const page = await context.newPage();
    await page.goto('file://' + path.resolve(__dirname, '../fixtures/test-page.html'));
    
    // Send message from content script (simulated via console)
    await page.evaluate(() => {
      (window as any).chrome.runtime.sendMessage({ 
        action: 'getStatus' 
      });
    });
    
    // Listen for response
    const response = await bg.evaluate(() => {
      return new Promise((resolve) => {
        (self as any).chrome.runtime.onMessage.addListener((msg: any) => {
          resolve(msg);
        });
      });
    });
    
    expect(response).toHaveProperty('status');
    
    await context.close();
  });
});
```

---

## Service Worker Event Testing {#service-worker-event-testing}

Service workers in Manifest V3 extensions are event-driven and can be terminated when idle. Testing them requires understanding their lifecycle and triggering events programmatically.

### Service Worker Testing Patterns

```typescript
// tests/service-worker/service-worker.spec.ts
import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Service Worker Event Testing', () => {
  test('should handle chrome.runtime.onInstalled', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '../../dist');
    
    const context = await browser.launchPersistentContext('', {
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    // Get the service worker
    const sw = context.serviceWorkers()[0];
    expect(sw).toBeTruthy();
    
    // Verify service worker is running
    const isRunning = await sw.evaluate(() => {
      return navigator.serviceWorker.controller !== null;
    });
    
    expect(isRunning).toBe(true);
    
    await context.close();
  });

  test('should respond to message passing', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '../../dist');
    
    const context = await browser.launchPersistentContext('', {
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    const sw = context.serviceWorkers()[0];
    
    // Send message to service worker
    const response = await sw.evaluate(async () => {
      return await (self as any).chrome.runtime.sendMessage({
        action: 'ping'
      });
    });
    
    expect(response).toEqual({ action: 'pong', timestamp: expect.any(Number) });
    
    await context.close();
  });

  test('should handle alarm events', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '../../dist');
    
    const context = await browser.launchPersistentContext('', {
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    // Create an alarm programmatically
    const page = await context.newPage();
    await page.goto('about:blank');
    
    // Use CDP to set alarm (requires Chrome DevTools Protocol access)
    const client = await page.target().createCDPSession();
    await client.send('Storage.setDOMStorageItems', {
      origin: 'chrome-extension://' + (await context.serviceWorkers()[0]).url().split('/')[2],
      items: []
    });
    
    await context.close();
  });
});
```

---

## Screenshot Comparison for Visual Regression {#screenshot-comparison-for-visual-regression}

Visual regression testing helps catch unintended UI changes. Use Playwright's screenshot capabilities with image comparison libraries.

### Visual Regression Testing Setup

```typescript
// tests/visual/visual-regression.spec.ts
import { test, expect } from '@playwright/test';
import { extensionTest } from '../fixtures/extension';
import { png } from 'pixelmatch';
import * as fs from 'fs';
import * as path from 'path';

extensionTest.describe('Visual Regression Tests', () => {
  extensionTest('popup UI matches baseline', async ({ extension }, testInfo) => {
    const popupUrl = `chrome-extension://${extension.extensionId}/popup.html`;
    const popup = await extension.browser.newPage();
    
    await popup.goto(popupUrl);
    await popup.waitForLoadState('networkidle');
    
    const screenshot = await popup.screenshot();
    
    const baselinePath = path.join(
      __dirname, 
      '../fixtures/baselines',
      `popup-${testInfo.title}.png`
    );
    
    // Generate baseline if it doesn't exist
    if (!fs.existsSync(baselinePath)) {
      fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
      fs.writeFileSync(baselinePath, screenshot);
      console.log('Baseline created:', baselinePath);
      return;
    }
    
    const baseline = fs.readFileSync(baselinePath);
    const diff = Buffer.alloc(screenshot.length);
    
    const numDiffPixels = png(
      baseline,
      screenshot,
      diff,
      { threshold: 0.1 }
    );
    
    const totalPixels = screenshot.length / 4; // RGBA
    const diffPercentage = (numDiffPixels / totalPixels) * 100;
    
    expect(diffPercentage).toBeLessThan(0.1); // Allow < 0.1% difference
    
    await popup.close();
  });
});
```

---

## End-to-End Test Patterns {#end-to-end-test-patterns}

E2E tests verify complete user workflows across multiple extension components. These tests are slower but provide the highest confidence.

### Complete E2E Workflow Test

```typescript
// tests/e2e/complete-workflow.spec.ts
import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('Complete E2E Workflows', () => {
  test('full data sync workflow', async ({ browser }) => {
    const extensionPath = path.resolve(__dirname, '../../dist');
    
    const context = await browser.launchPersistentContext('', {
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    // Step 1: Configure extension in options page
    const optionsUrl = `chrome-extension://${(await context.serviceWorkers()[0]).url().split('/')[2]}/options.html`;
    const optionsPage = await context.newPage();
    await optionsPage.goto(optionsUrl);
    
    await optionsPage.fill('#api-key', 'test-api-key');
    await optionsPage.fill('#sync-url', 'https://api.example.com/sync');
    await optionsPage.click('#save-settings');
    await optionsPage.waitForSelector('#save-success');
    
    // Step 2: Open popup and trigger sync
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${(await context.serviceWorkers()[0]).url().split('/')[2]}/popup.html`);
    
    await popup.click('#sync-button');
    await popup.waitForSelector('#sync-complete', { timeout: 10000 });
    
    // Step 3: Navigate to target website and verify content script
    const targetPage = await context.newPage();
    await targetPage.goto('https://example.com');
    
    await targetPage.waitForSelector('[data-extension-active]');
    const status = await targetPage.locator('#sync-status').textContent();
    expect(status).toContain('Synced');
    
    await context.close();
  });
});
```

---

## Mocking Chrome APIs {#mocking-chrome-apis}

Mocking Chrome APIs allows you to test edge cases and error conditions without relying on actual browser APIs or external services.

### Chrome API Mocking Strategies

```typescript
// tests/mocks/chrome-api-mock.ts
import { test, expect } from '@playwright/test';

export function createChromeMock(page: any, mocks: Record<string, any>) {
  return page.evaluateOnNewDocument((mockConfig) => {
    // Mock chrome.storage.local
    const storage: Record<string, any> = {};
    
    (window as any).chrome = {
      storage: {
        local: {
          get: (keys: string | string[] | object) => {
            return Promise.resolve(
              typeof keys === 'string' 
                ? { [keys]: storage[keys] }
                : keys
            );
          },
          set: (items: object) => {
            Object.assign(storage, items);
            return Promise.resolve();
          },
          remove: (keys: string | string[]) => {
            if (Array.isArray(keys)) {
              keys.forEach(k => delete storage[k]);
            } else {
              delete storage[keys];
            }
            return Promise.resolve();
          }
        }
      },
      runtime: {
        sendMessage: (message: any) => {
          return Promise.resolve({ 
            success: true, 
            originalMessage: message 
          });
        },
        onMessage: {
          addListener: (callback: Function) => {
            // Store callback for later triggering
            (window as any).__messageCallback = callback;
          }
        }
      },
      // Add other API mocks as needed
    };
  }, mocks);
}

// Usage in tests
test('should handle storage errors gracefully', async ({ page }) => {
  // Inject mock that throws errors
  await page.evaluateOnNewDocument(() => {
    (window as any).chrome = {
      storage: {
        local: {
          get: () => Promise.reject(new Error('Storage quota exceeded')),
          set: () => Promise.reject(new Error('Storage quota exceeded'))
        }
      }
    };
  });
  
  // Now test your extension with the mock
  // ...
});
```

---

## GitHub Actions CI Setup {#github-actions-ci-setup}

Automating your tests in CI ensures every change is validated before merging. Here's a complete GitHub Actions workflow.

### CI Workflow Configuration

```yaml
# .github/workflows/test.yml
name: Extension Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build extension
        run: npm run build
      
      - name: Run Puppeteer tests
        run: npm run test:puppeteer
        env:
          CHROME_BIN: /usr/bin/google-chrome
      
      - name: Run Playwright tests
        run: npx playwright test
        env:
          PLAYWRIGHT_BROWSERS_PATH: /ms-playwright
      
      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            test-results/
            screenshots/
      
      - name: Upload coverage
        if: always()
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
```

### Playwright Configuration for CI

```javascript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/test-results.json' }]
  ],
  
  use: {
    baseURL: 'https://example.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  
  webServer: {
    command: 'npm run start:test-server',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Test Coverage Reporting {#test-coverage-reporting}

Measuring test coverage helps identify untested code paths. Use V8's coverage capabilities with Puppeteer or Playwright.

### Coverage Setup

```typescript
// tests/coverage/coverage.spec.ts
import { test, expect } from '@playwright/test';

test('collect coverage data', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Start coverage collection
  await page.coverage.startJSCoverage();
  
  // Navigate to your extension popup
  await page.goto('chrome-extension://YOUR_EXTENSION_ID/popup.html');
  
  // Perform actions
  await page.click('#some-button');
  
  // Stop coverage and get results
  const coverage = await page.coverage.stopJSCoverage();
  
  // Process coverage data
  const coveredUrls = coverage.filter(entry => entry.url.includes('extension-id'));
  
  console.log('Scripts covered:', coveredUrls.length);
  console.log('Total functions:', coveredUrls.reduce((sum, e) => 
    sum + e.functions.length, 0));
  
  await context.close();
});
```

---

## Fixture Management Best Practices {#fixture-management-best-practices}

Well-organized test fixtures improve maintainability and reduce duplication across your test suite.

### Recommended Fixture Structure

```
tests/
├── fixtures/
│   ├── extension.ts         # Main extension fixture
│   ├── mocks/
│   │   ├── chrome-storage.ts
│   │   ├── chrome-runtime.ts
│   │   └── chrome-alarms.ts
│   └── baselines/          # Visual regression baselines
│       └── popup-baseline.png
├── e2e/
│   └── workflow.spec.ts
├── unit/
│   └── utils.spec.ts
├── popup/
│   └── popup.spec.ts
├── content-scripts/
│   └── content-script.spec.ts
├── service-worker/
│   └── service-worker.spec.ts
├── visual/
│   └── visual-regression.spec.ts
├── playwright.config.ts
├── jest.config.js (if using Jest)
└── setup.ts
```

### Shared Fixture Utilities

```typescript
// tests/fixtures/utils.ts
import { Browser, chromium, BrowserContext } from '@playwright/test';
import * as path from 'path';

export interface TestExtension {
  browser: Browser;
  context: BrowserContext;
  extensionId: string;
}

export async function loadExtension(extensionPath: string): Promise<TestExtension> {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const sw = context.serviceWorkers()[0];
  const extensionId = sw.url().match(/chrome-extension:\/\/([^/]+)/)?.[1] || '';

  return {
    browser: context.browser(),
    context,
    extensionId
  };
}

export async function closeExtension(extension: TestExtension) {
  await extension.context.close();
}
```

---

## Conclusion {#conclusion}

Automated testing for Chrome extensions requires understanding the unique challenges of multi-context applications. Puppeteer provides fine-grained control for lower-level testing, while Playwright's extension fixtures offer a more ergonomic developer experience. Combined with proper CI/CD integration, visual regression testing, and comprehensive mocking strategies, you can build a robust testing infrastructure that catches issues before they reach users.

For more on CI/CD pipelines and development workflows, see our [CI/CD Pipeline Guide](/chrome-extension-guide/guides/chrome-extension-ci-cd-pipeline/) and [Development Tools Guide](/chrome-extension-guide/guides/chrome-extension-dev-tools/).

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
