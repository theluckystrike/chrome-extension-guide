---
layout: default
title: "Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration"
description: "Master automated testing for Chrome extensions using Puppeteer and Playwright. Learn E2E testing patterns, extension fixtures, mocking Chrome APIs, and CI integration with GitHub Actions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-automated-testing-puppeteer-playwright/"
---

# Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration

Automated testing for Chrome extensions presents unique challenges that differ significantly from traditional web application testing. Your extension code runs across multiple isolated contexts—service workers, content scripts, popups, options pages, and side panels—each with its own execution environment and lifecycle. This comprehensive guide covers the tools, patterns, and best practices for building robust automated test suites using Puppeteer and Playwright, with complete CI integration using GitHub Actions.

## Table of Contents {#table-of-contents}

- [Understanding Extension Testing Contexts](#understanding-extension-testing-contexts)
- [Loading Unpacked Extensions in Puppeteer](#loading-unpacked-extensions-in-puppeteer)
- [Playwright Extension Fixtures](#playwright-extension-fixtures)
- [Testing Popup Interactions](#testing-popup-interactions)
- [Content Script Verification](#content-script-verification)
- [Service Worker Event Testing](#service-worker-event-testing)
- [Screenshot Comparison for Visual Regression](#screenshot-comparison-for-visual-regression)
- [E2E Test Patterns for Extensions](#e2e-test-patterns-for-extensions)
- [Mocking Chrome APIs](#mocking-chrome-apis)
- [GitHub Actions CI Setup](#github-actions-ci-setup)
- [Test Coverage Reporting](#test-coverage-reporting)
- [Fixture Management Best Practices](#fixture-management-best-practices)
- [Related Articles](#related-articles)

---

## Understanding Extension Testing Contexts {#understanding-extension-testing-contexts}

Before diving into implementation, it's essential to understand the distinct contexts that comprise a Chrome extension:

- **Service Worker** — The background script (Manifest V3) that handles events, message passing, and state management
- **Popup** — The HTML page that appears when clicking the extension icon
- **Options Page** — The settings/configuration page accessible from `chrome://extensions`
- **Content Scripts** — JavaScript injected into web pages that interact with the DOM
- **Side Panel** — The panel that appears alongside the current page (Manifest V3)

Each context requires different testing strategies. Puppeteer and Playwright both support loading unpacked extensions directly into a controlled browser instance, enabling you to interact with all these contexts programmatically.

---

## Loading Unpacked Extensions in Puppeteer {#loading-unpacked-extensions-in-puppeteer}

Puppeteer provides built-in support for loading Chrome extensions through the `args` parameter when launching a browser. The key is pointing Puppeteer to your unpacked extension directory:

```javascript
// tests/puppeteer/base-test.js
const puppeteer = require('puppeteer');
const path = require('path');

async function launchExtensionBrowser(extensionPath) {
  const browser = await puppeteer.launch({
    headless: false, // Extensions require non-headless mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  return browser;
}

async function getExtensionBackgroundPage(browser) {
  const targets = await browser.targets();
  const backgroundTarget = targets.find(
    target => target.type() === 'service_worker' && 
              target.url().includes('manifest.json')
  );
  return backgroundTarget;
}

module.exports = { launchExtensionBrowser, getExtensionBackgroundPage };
```

The critical insight is that you must launch Puppeteer in non-headless mode because Chrome's extension system requires a visible browser window. For CI environments, use xvfb (X Virtual Framebuffer) to provide a virtual display.

---

## Playwright Extension Fixtures {#playwright-extension-fixtures}

Playwright offers a more modern approach to extension testing through its extension testing utilities. Playwright's approach uses a fixture-based system that simplifies loading and interacting with extensions:

```javascript
// tests/playwright/fixtures/extension-fixture.js
const { test as base, chromium } = require('@playwright/test');
const path = require('path');

const extensionPath = path.join(__dirname, '../../dist');

export const test = base.extend({
  context: async ({ browser }, use) => {
    const context = await browser.newContext({
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });
    await use(context);
    await context.close();
  },
  extensionPage: async ({ context }, use) => {
    // Get the background service worker
    const bgPage = await context.waitForEvent('backgroundpage');
    await use(bgPage);
  },
  popupPage: async ({ context }, use) => {
    // Wait for the popup to be available
    const pages = context.pages();
    const popup = pages.find(p => p.url().startsWith('chrome-extension://'));
    await use(popup || null);
  }
});
```

Playwright's fixture system allows you to create reusable test components that automatically handle the complexities of extension lifecycle management. You can also create custom fixtures for content scripts by injecting into specific pages:

```javascript
// tests/playwright/fixtures/content-script-fixture.js
export const testWithExtension = test.extend({
  pageWithExtension: async ({ context, baseURL }, use) => {
    const page = await context.newPage();
    
    // Navigate to test page and wait for content script injection
    await page.goto(baseURL);
    await page.waitForFunction(() => {
      return window.__EXTENSION_INJECTED__ === true;
    }, { timeout: 5000 });
    
    await use(page);
    await page.close();
  }
});
```

---

## Testing Popup Interactions {#testing-popup-interactions}

Testing the extension popup requires understanding its lifecycle—the popup opens when clicked and closes when clicking outside or pressing Escape. Here's a comprehensive approach:

```javascript
// tests/playwright/popup.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Extension Popup Tests', () => {
  test.beforeEach(async ({ context, extensionPath }) => {
    // Create a fresh page for testing
    this.popupPage = await context.newPage();
  });

  test('popup displays user authentication state', async ({ popupPage }) => {
    // Popup must be opened programmatically in tests
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    
    const userDisplay = await popupPage.locator('#user-display');
    await expect(userDisplay).toBeVisible();
    await expect(userDisplay).toContainText('Signed in as');
  });

  test('popup button triggers background message', async ({ popupPage }) => {
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Click the action button
    await popupPage.click('#action-button');
    
    // Verify the button state changes
    const button = popupPage.locator('#action-button');
    await expect(button).toHaveAttribute('data-state', 'loading');
    
    // Wait for the action to complete
    await expect(button).toHaveAttribute('data-state', 'complete');
  });

  test('popup form submission saves settings', async ({ popupPage }) => {
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Fill and submit form
    await popupPage.fill('#setting-input', 'test-value');
    await popupPage.click('#save-button');
    
    // Verify success message appears
    const message = popupPage.locator('.success-message');
    await expect(message).toBeVisible();
    await expect(message).toContainText('Settings saved');
  });
});
```

The key challenge with popup testing is that the popup closes immediately after the test completes. Always use explicit waits and verify element states before the popup closes.

---

## Content Script Verification {#content-script-verification}

Content scripts run in the context of web pages, making them particularly important to test thoroughly. You need to verify both injection and functionality:

```javascript
// tests/playwright/content-script.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Content Script Verification', () => {
  test('injects into matching pages', async ({ context, baseURL }) => {
    const page = await context.newPage();
    
    // Navigate to a page that should trigger injection
    await page.goto(`${baseURL}/test-page.html`);
    
    // Wait for content script to inject
    await page.waitForFunction(() => {
      return typeof window.extensionApi !== 'undefined';
    }, { timeout: 10000 });
    
    // Verify the extension API is available
    const isAvailable = await page.evaluate(() => {
      return window.extensionApi && typeof window.extensionApi.sendMessage === 'function';
    });
    expect(isAvailable).toBe(true);
  });

  test('content script communicates with background', async ({ context, baseURL }) => {
    const page = await context.newPage();
    await page.goto(`${baseURL}/test-page.html`);
    
    // Set up message listener in content script
    await page.evaluate(() => {
      window.messageReceived = false;
      window.extensionApi.onMessage((message) => {
        if (message.type === 'RESPONSE') {
          window.messageReceived = true;
        }
      });
    });
    
    // Trigger message from content script
    await page.click('#trigger-extension-action');
    
    // Verify message was received
    await page.waitForFunction(() => window.messageReceived, { timeout: 5000 });
  });

  test('content script manipulates DOM correctly', async ({ context, baseURL }) => {
    const page = await context.newPage();
    await page.goto(`${baseURL}/test-page.html`);
    
    // Verify content script added elements
    const injectedElement = page.locator('#extension-injected-element');
    await expect(injectedElement).toBeVisible();
    await expect(injectedElement).toHaveClass('visible');
  });
});
```

---

## Service Worker Event Testing {#service-worker-event-testing}

Service workers in Manifest V3 extensions handle background events. Testing them requires connecting to the background service worker:

```javascript
// tests/playwright/service-worker.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Service Worker Event Testing', () => {
  let bgPage;
  
  test.beforeEach(async ({ context, extensionId }) => {
    // Connect to the background service worker
    const cdp = await context.newCDPSession();
    const targets = await context.targets();
    const swTarget = targets.find(
      t => t.type() === 'service_worker' && 
           t.url().includes(extensionId)
    );
    bgPage = await swTarget.page();
  });

  test('service worker handles chrome.runtime.onInstalled', async ({ context, extensionId }) => {
    // Reload extension to trigger onInstalled
    await context.addInitScript(() => {
      chrome.runtime.onInstalled.addListener((details) => {
        window.__installDetails = details;
      });
    });
    
    // Reload the extension
    await bgPage.reload();
    await bgPage.waitForFunction(() => window.__installDetails !== undefined);
    
    const details = await bgPage.evaluate(() => window.__installDetails);
    expect(details.reason).toBe('install');
  });

  test('service worker maintains state across events', async ({ context }) => {
    // Set state in background
    await bgPage.evaluate(() => {
      window.__extensionState = { counter: 0 };
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'increment') {
          window.__extensionState.counter++;
          sendResponse({ count: window.__extensionState.counter });
        }
      });
    });
    
    // Create a test page to trigger messages
    const page = await context.newPage();
    await page.goto('data:text/html,<html></html>');
    
    // Send message to service worker
    const response = await page.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'increment' }, resolve);
      });
    });
    
    expect(response.count).toBe(1);
  });

  test('service worker handles alarm events', async ({ bgPage }) => {
    // Create an alarm
    await bgPage.evaluate(() => {
      chrome.alarms.create('test-alarm', { delayInMinutes: 0.01 });
      chrome.alarms.onAlarm.addListener((alarm) => {
        window.__alarmFired = alarm.name;
      });
    });
    
    // Wait for alarm to fire
    await bgPage.waitForFunction(() => window.__alarmFired === 'test-alarm', {
      timeout: 10000
    });
  });
});
```

---

## Screenshot Comparison for Visual Regression {#screenshot-comparison-for-visual-regression}

Visual regression testing helps catch unintended UI changes. Both Puppeteer and Playwright support screenshot capture:

```javascript
// tests/playwright/visual-regression.spec.js
const { test, expect } = require('@playwright/test');
const { matchSnapshot } = require('@playwright/test');

test.describe('Visual Regression Tests', () => {
  test('popup renders correctly', async ({ popupPage, extensionId }) => {
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Wait for all dynamic content to load
    await popupPage.waitForSelector('.content-loaded');
    
    const screenshot = await popupPage.screenshot();
    expect(screenshot).toMatchSnapshot('popup-default.png');
  });

  test('options page across viewports', async ({ context, extensionId }) => {
    const viewports = [
      { width: 800, height: 600 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      const page = await context.newPage();
      await page.setViewportSize(viewport);
      await page.goto(`chrome-extension://${extensionId}/options.html`);
      
      const screenshot = await page.screenshot();
      expect(screenshot).toMatchSnapshot(
        `options-${viewport.width}x${viewport.height}.png`
      );
      await page.close();
    }
  });
});
```

For effective visual regression testing, configure your test runner to store baseline screenshots and compare new screenshots against them using pixel-diff algorithms.

---

## E2E Test Patterns for Extensions {#e2e-test-patterns-for-extensions}

End-to-end testing for extensions involves testing complete user workflows across multiple contexts:

```javascript
// tests/playwright/e2e/user-flow.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Complete User Flows', () => {
  test('complete bookmark workflow', async ({ context, baseURL, extensionId }) => {
    // Step 1: Navigate to test website
    const page = await context.newPage();
    await page.goto(`${baseURL}/article.html`);
    
    // Step 2: Interact with content script (click bookmark button)
    await page.click('#bookmark-button');
    
    // Step 3: Verify bookmark saved notification
    const notification = page.locator('.bookmark-notification');
    await expect(notification).toBeVisible();
    
    // Step 4: Open popup and verify bookmark appears
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await popup.waitForSelector('#bookmark-list');
    
    const bookmarkItems = popup.locator('.bookmark-item');
    await expect(bookmarkItems).toHaveCount(1);
    
    // Step 5: Verify bookmark persists in storage
    const storedBookmarks = await popup.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.local.get(['bookmarks'], (result) => {
          resolve(result.bookmarks);
        });
      });
    });
    
    expect(storedBookmarks).toHaveLength(1);
    expect(storedBookmarks[0].url).toContain('article.html');
  });

  test('settings sync across contexts', async ({ context, extensionId }) => {
    // Update settings in options page
    const optionsPage = await context.newPage();
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    
    await optionsPage.selectOption('#theme-select', 'dark');
    await optionsPage.click('#save-settings');
    
    // Verify popup reflects new settings
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    
    const theme = await popup.evaluate(() => document.body.dataset.theme);
    expect(theme).toBe('dark');
  });
});
```

---

## Mocking Chrome APIs {#mocking-chrome-apis}

Mocking Chrome APIs allows you to test extension behavior without relying on actual browser APIs or network requests:

```javascript
// tests/__mocks__/chrome-api-mock.js
class ChromeStorageMock {
  constructor() {
    this.store = {};
  }
  
  get(keys, callback) {
    const result = {};
    const keyArray = Array.isArray(keys) ? keys : [keys];
    keyArray.forEach(key => {
      if (this.store[key] !== undefined) {
        result[key] = this.store[key];
      }
    });
    callback(result);
  }
  
  set(items, callback) {
    Object.assign(this.store, items);
    callback();
  }
  
  clear(callback) {
    this.store = {};
    callback();
  }
}

class ChromeRuntimeMock {
  constructor() {
    this.runtime = {
      lastError: null,
      id: 'test-extension-id'
    };
  }
  
  sendMessage(message, responseCallback) {
    setTimeout(() => {
      if (responseCallback) {
        responseCallback({ success: true });
      }
    }, 10);
  }
  
  onMessage = {
    listeners: [],
    addListener(callback) {
      this.listeners.push(callback);
    },
    removeListener(callback) {
      this.listeners = this.listeners.filter(l => l !== callback);
    }
  };
}

// Inject mocks into page context
async function injectChromeMocks(page) {
  await page.addInitScript(() => {
    window.chrome = {
      storage: new ChromeStorageMock(),
      runtime: new ChromeRuntimeMock(),
      extension: { getURL: (path) => `chrome-extension://test-id/${path}` }
    };
  });
}

module.exports = { injectChromeMocks, ChromeStorageMock, ChromeRuntimeMock };
```

Use these mocks in your tests:

```javascript
// tests/playwright/with-mocks.spec.js
const { test, expect } = require('@playwright/test');
const { injectChromeMocks } = require('../__mocks__/chrome-api-mock');

test('extension works with mocked APIs', async ({ page }) => {
  await injectChromeMocks(page);
  await page.goto('chrome-extension://test-id/popup.html');
  
  // Test interactions using mocked storage
  await page.click('#save-button');
  
  const savedValue = await page.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['setting'], (result) => {
        resolve(result.setting);
      });
    });
  });
  
  expect(savedValue).toBe('expected-value');
});
```

---

## GitHub Actions CI Setup {#github-actions-ci-setup}

Automate your extension tests with GitHub Actions to run tests on every pull request and push:

```yaml
# .github/workflows/test.yml
{% raw %}
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
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build extension
        run: npm run build
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run Puppeteer tests
        run: npm run test:puppeteer
        
      - name: Run Playwright tests
        run: npm run test:playwright
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
      
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  lint:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run typecheck
{% endraw %}
```

For extensions requiring xvfb in headless mode:

```yaml
{% raw %}
      - name: Run tests with Xvfb
        run: xvfb-run --auto-servernum npm run test:playwright
{% endraw %}
```

---

## Test Coverage Reporting {#test-coverage-reporting}

Generate coverage reports to identify untested code paths in your extension:

```javascript
// jest.config.js for coverage
module.exports = {
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__mocks__/**'
  ],
  coverageReporters: ['html', 'lcov', 'text-summary'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

For runtime coverage in the browser, use Chrome's coverage tools:

```javascript
// tests/playwright/coverage.spec.js
const { test, expect } = require('@playwright/test');

test('collects runtime coverage', async ({ context }) => {
  const cdp = await context.newCDPSession();
  
  // Start coverage collection
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.startPreciseCoverage', {
    callCount: true,
    detailed: true
  });
  
  // Run your tests...
  const page = await context.newPage();
  await page.goto('chrome-extension://test-id/popup.html');
  await page.click('#test-button');
  
  // Stop coverage and get results
  const coverage = await cdp.send('Profiler.takePreciseCoverage');
  
  // Analyze coverage data
  const coveredFunctions = coverage.result
    .filter(f => f.functions.some(fn => fn.isBlockCoverage))
    .length;
  
  console.log(`Covered functions: ${coveredFunctions}`);
});
```

---

## Fixture Management Best Practices {#fixture-management-best-practices}

Organize your test fixtures to maintain clean, maintainable test code:

```
tests/
├── fixtures/
│   ├── extension-fixture.js      # Core extension loading
│   ├── storage-fixture.js        # Chrome storage mocks
│   ├── message-fixture.js        # Message passing helpers
│   └── api-fixture.js            # Chrome API mocks
├── pages/
│   ├── popup-page.js             # Popup page object
│   ├── options-page.js           # Options page object
│   └── content-script-page.js    # Content script interactions
├── helpers/
│   ├── extension-loader.js       # Extension loading utilities
│   └── screenshot-helper.js      # Screenshot comparison utilities
├── playwright.config.js
└── *.spec.js                     # Test files
```

Create reusable page objects:

```javascript
// tests/pages/popup-page.js
class PopupPage {
  constructor(page) {
    this.page = page;
  }
  
  async goto() {
    await this.page.goto('chrome-extension://*/popup.html');
  }
  
  async getTitle() {
    return this.page.textContent('.title');
  }
  
  async clickActionButton() {
    await this.page.click('#action-button');
    await this.page.waitForSelector('.loading', { state: 'hidden' });
  }
  
  async getSettings() {
    return this.page.evaluate(() => {
      const inputs = document.querySelectorAll('.setting-input');
      return Array.from(inputs).map(input => ({
        id: input.id,
        value: input.value
      }));
    });
  }
}

module.exports = { PopupPage };
```

---

## Related Articles {#related-articles}

- [CI/CD Pipeline](../guides/ci-cd-pipeline.md) — Automate extension builds and releases
- [GitHub Actions CI/CD](../guides/github-actions-extension-ci-cd.md) — Complete GitHub Actions workflow setup
- [Extension Testing Strategies](../guides/testing-extensions.md) — Unit and integration testing overview
- [Extension Testing with Puppeteer](../guides/extension-testing-with-puppeteer.md) — Puppeteer-specific testing patterns
- [Extension Testing with Playwright](../guides/extension-testing-with-playwright.md) — Playwright-specific testing patterns

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
