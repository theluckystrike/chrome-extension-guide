---
layout: default
title: "Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration"
description: "Learn how to automate testing for Chrome extensions using Puppeteer and Playwright. Cover E2E tests, extension fixtures, CI/CD integration, mocking Chrome APIs, and coverage reporting."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-automated-testing-puppeteer-playwright/"
---

# Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration

Automated testing is essential for building reliable Chrome extensions. Unlike traditional web applications, extensions run across multiple isolated contexts—service workers, content scripts, popups, options pages, and side panels—each requiring specialized testing approaches. This guide covers practical techniques for testing Chrome extensions using Puppeteer and Playwright, with complete CI/CD integration patterns.

## Table of Contents

- [Setting Up Your Test Environment](#setting-up-your-test-environment)
- [Loading Unpacked Extensions in Puppeteer](#loading-unpacked-extensions-in-puppeteer)
- [Playwright Extension Fixtures](#playwright-extension-fixtures)
- [Testing Popup Interactions](#testing-popup-interactions)
- [Content Script Verification](#content-script-verification)
- [Service Worker Event Testing](#service-worker-event-testing)
- [Screenshot Comparison Testing](#screenshot-comparison-testing)
- [End-to-End Test Patterns](#end-to-end-test-patterns)
- [Mocking Chrome APIs](#mocking-chrome-apis)
- [GitHub Actions CI Setup](#github-actions-ci-setup)
- [Test Coverage Reporting](#test-coverage-reporting)
- [Fixture Management Best Practices](#fixture-management-best-practices)

---

## Setting Up Your Test Environment

Before writing tests, you need a proper test environment. Both Puppeteer and Playwright can launch Chrome with your extension loaded, but the setup differs slightly between the two tools.

Install the necessary dependencies:

```bash
# For Puppeteer
npm install --save-dev puppeteer @types/puppeteer

# For Playwright
npm install --save-dev @playwright/test playwright
npx playwright install chromium
```

Create a dedicated test directory in your extension project:

```bash
mkdir -p tests/e2e tests/unit tests/integration
```

Configure your extension's `package.json` with test scripts:

```json
{
  "scripts": {
    "test": "jest",
    "test:e2e": "playwright test",
    "test:e2e:puppeteer": "node tests/e2e/puppeteer.runner.js",
    "test:coverage": "jest --coverage",
    "test:ci": "npm run test && npm run test:e2e"
  }
}
```

---

## Loading Unpacked Extensions in Puppeteer

Puppeteer provides straightforward support for loading unpacked Chrome extensions. The key is using the `--disable-extensions-except` and `--load-extension` launch arguments to specify your extension's path.

Create a Puppeteer test setup file:

```javascript
// tests/e2e/puppeteer.setup.js
const puppeteer = require('puppeteer');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../../');

async function launchBrowserWithExtension() {
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    defaultViewport: { width: 1280, height: 720 }
  });
  
  return browser;
}

async function getExtensionBackgroundPage(browser) {
  const targets = await browser.targets();
  const backgroundTarget = targets.find(
    target => target.type() === 'service_worker' && 
              target.url().includes('background')
  );
  return backgroundTarget ? backgroundTarget.page() : null;
}

module.exports = { launchBrowserWithExtension, getExtensionBackgroundPage };
```

This setup loads your unpacked extension every time you launch a browser in your tests. The background service worker becomes accessible through the targets API, allowing you to interact with it directly.

---

## Playwright Extension Fixtures

Playwright offers a more structured approach through its experimental extension testing features. While not as straightforward as Puppeteer, Playwright provides powerful fixtures for managing extension lifecycles.

Install the Playwright extension testing package:

```bash
npm install --save-dev @playwright/test
```

Configure Playwright with extension support:

```javascript
// playwright.config.js
const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'extension-chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: [
            '--disable-extensions-except=' + path.resolve(__dirname, './dist'),
            '--load-extension=' + path.resolve(__dirname, './dist')
          ]
        }
      }
    }
  ]
});
```

Create reusable fixtures for extension testing:

```javascript
// tests/e2e/fixtures/extension.fixture.js
const { test as base } = require('@playwright/test');
const path = require('path');

const extensionPath = path.resolve(__dirname, '../../dist');

const extensionTest = base.extend({
  extensionContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      // Set up global test state
      window.__EXTENSION_TEST__ = true;
    });
    await use(context);
    await context.close();
  }
});

module.exports = { extensionTest };
```

---

## Testing Popup Interactions

Testing popup interactions requires understanding the popup's lifecycle. When you click the extension icon, Chrome opens the popup, loads its HTML, executes scripts, and then closes the popup when it loses focus. For testing, you need to keep the popup open.

Create popup interaction tests:

```javascript
// tests/e2e/popup.spec.js
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Popup Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the extension popup directly
    await page.goto(`chrome-extension://${process.env.EXTENSION_ID}/popup.html`);
  });

  test('popup renders correctly', async ({ page }) => {
    await expect(page.locator('#root')).toBeVisible();
    await expect(page.locator('.popup-header')).toContainText('My Extension');
  });

  test('popup button triggers action', async ({ page }) => {
    const button = page.locator('#action-button');
    await button.click();
    
    // Verify state change
    await expect(page.locator('.status')).toContainText('Action completed');
  });

  test('popup communicates with background', async ({ page }) => {
    // Send message to background script
    const response = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'ping' },
          (response) => resolve(response)
        );
      });
    });
    
    expect(response).toEqual({ status: 'pong' });
  });
});
```

For more reliable popup testing, use Puppeteer's `popup` event to capture the opened popup:

```javascript
// tests/e2e/puppeteer/popup.spec.js
const puppeteer = require('puppeteer');
const path = require('path');

describe('Popup Tests', () => {
  let browser, popup;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [`--load-extension=${path.resolve(__dirname, '../../dist')}`]
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  test('popup opens and interacts', async () => {
    const page = await browser.newPage();
    
    // Listen for popup before clicking
    const targetPromise = browser.waitForTarget(
      target => target.type() === 'page' && target.url().includes('popup.html')
    );
    
    // Click extension icon
    await page.goto('https://example.com');
    const extensionIcon = await page.$('[data-extension-id]') || 
                           await page.evaluate(() => {
                             // Alternative: trigger via chrome-action
                             return null;
                           });
    
    popup = await targetPromise;
    const popupPage = await popup.page();
    
    // Interact with popup
    await popupPage.waitForSelector('#action-button');
    await popupPage.click('#action-button');
    
    // Verify result
    const status = await popupPage.$eval('.status', el => el.textContent);
    expect(status).toContain('Action completed');
  });
});
```

---

## Content Script Verification

Content scripts run in the context of web pages, making them trickier to test. You need to inject test pages and verify that your content script modifies them correctly.

Test content script injection and execution:

```javascript
// tests/e2e/content-script.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Content Script Verification', () => {
  test('content script injects on matching pages', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Verify content script has modified the page
    const injectedElement = await page.locator('.extension-injected').first();
    await expect(injectedElement).toBeVisible();
  });

  test('content script responds to messages', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Send message from page to content script
    const response = await page.evaluate(() => {
      return new Promise((resolve) => {
        window.postMessage({ type: 'FROM_PAGE', payload: 'test' }, '*');
        
        // Listen for response
        const listener = (event) => {
          if (event.data.type === 'FROM_CONTENT') {
            window.removeEventListener('message', listener);
            resolve(event.data);
          }
        };
        window.addEventListener('message', listener);
        
        setTimeout(() => resolve(null), 1000);
      });
    });
    
    expect(response).toBeTruthy();
  });

  test('content script uses storage correctly', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Check that content script read from storage
    const storageValue = await page.evaluate(() => {
      return window.localStorage.getItem('extension_setting');
    });
    
    expect(storageValue).toBe('expected_value');
  });
});
```

---

## Service Worker Event Testing

Service workers in Manifest V3 extensions are event-driven. Testing them requires triggering events and verifying the side effects. The key challenge is that service workers can be terminated between events.

Test service worker events:

```javascript
// tests/e2e/service-worker.spec.js
const { test, expect } = require('@playwright/test');
const puppeteer = require('puppeteer');

test.describe('Service Worker Event Testing', () => {
  test('install event fires correctly', async ({ browser }) => {
    const page = await browser.newPage();
    
    // Listen for console messages from service worker
    page.on('console', msg => {
      if (msg.text().includes('[SW] Install')) {
        console.log('Service worker install detected');
      }
    });
    
    // Load extension (triggers install)
    await page.goto(`chrome-extension://${process.env.EXTENSION_ID}`);
    
    // Verify installation
    const backgroundPage = await getBackgroundPage(browser);
    const installEvent = await backgroundPage.evaluate(() => {
      return window.__SW_EVENTS__?.includes('install');
    });
    
    expect(installEvent).toBe(true);
  });

  test('message passing works', async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('https://example.com');
    
    // Send message from content script to background
    const response = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'processData', data: { test: true } },
          (response) => resolve(response)
        );
      });
    });
    
    expect(response.success).toBe(true);
  });
});

async function getBackgroundPage(browser) {
  const target = await browser.waitForTarget(
    target => target.type() === 'service_worker' && 
              target.url().includes('background')
  );
  return target.page();
}
```

---

## Screenshot Comparison Testing

Visual regression testing catches unintended UI changes. For extensions, test popups, options pages, and any injected UI elements.

Set up screenshot testing with Playwright:

```javascript
// tests/e2e/visual.spec.js
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Screenshot Comparison', () => {
  test('popup matches baseline', async ({ page }) => {
    await page.goto(`chrome-extension://${process.env.EXTENSION_ID}/popup.html`);
    
    // Wait for full render
    await page.waitForLoadState('networkidle');
    
    // Capture and compare
    await expect(page).toHaveScreenshot('popup-default.png', {
      maxDiffPixelRatio: 0.1
    });
  });

  test('options page matches baseline', async ({ page }) => {
    await page.goto(`chrome-extension://${process.env.EXTENSION_ID}/options.html`);
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('options-page.png', {
      maxDiffPixelRatio: 0.1
    });
  });

  test('injected UI matches baseline', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Wait for content script injection
    await page.waitForSelector('.extension-ui');
    
    await expect(page).toHaveScreenshot('injected-ui.png', {
      maxDiffPixelRatio: 0.15
    });
  });
});
```

Configure screenshot directories in Playwright:

```javascript
// playwright.config.js
module.exports = {
  screenshots: {
    mode: 'only-on-failure',
    fullPage: true
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      scale: 'css'
    }
  }
};
```

---

## End-to-End Test Patterns

Effective E2E tests simulate real user behavior. Structure tests to reflect actual usage scenarios:

```javascript
// tests/e2e/user-flows.spec.js
const { test, expect } = require('@playwright/test');

test.describe('User Flows', () => {
  test('complete onboarding flow', async ({ page }) => {
    // 1. Install extension (fresh context)
    await page.goto(`chrome-extension://${process.env.EXTENSION_ID}/popup.html`);
    
    // 2. Click setup button
    await page.click('#setup-button');
    
    // 3. Complete wizard steps
    await page.fill('#name-input', 'Test User');
    await page.click('#next-button');
    
    await page.check('#terms-checkbox');
    await page.click('#finish-button');
    
    // 4. Verify completion
    await expect(page.locator('.success-message')).toBeVisible();
    
    // 5. Verify settings persisted
    const settings = await page.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.get(['user'], (result) => resolve(result));
      });
    });
    
    expect(settings.user.name).toBe('Test User');
  });

  test('extension works across page navigations', async ({ page }) => {
    // Visit multiple pages and verify extension state
    const testPages = [
      'https://example.com',
      'https://example.org',
      'https://example.net'
    ];
    
    for (const url of testPages) {
      await page.goto(url);
      
      // Verify content script active
      const isActive = await page.evaluate(() => {
        return window.__EXTENSION_ACTIVE__ === true;
      });
      
      expect(isActive).toBe(true);
    }
  });
});
```

---

## Mocking Chrome APIs

Mocking Chrome APIs lets you test edge cases and error conditions without real Chrome functionality. Use service worker interceptors or inline scripts to replace chrome APIs.

Create a mock setup:

```javascript
// tests/e2e/mocks/chrome-mock.js
const mockChrome = {
  runtime: {
    sendMessage: (message, callback) => {
      // Mock response
      if (callback) {
        setTimeout(() => callback({ success: true }), 10);
      }
      return true;
    },
    onMessage: {
      addListener: (callback) => {
        window.__messageListeners = window.__messageListeners || [];
        window.__messageListeners.push(callback);
      }
    },
    getURL: (path) => `chrome-extension://mock-id/${path}`
  },
  storage: {
    local: {
      get: (keys, callback) => {
        const data = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => data[key] = null);
        }
        if (callback) callback(data);
        return Promise.resolve(data);
      },
      set: (items, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }
    }
  },
  tabs: {
    query: (queryInfo, callback) => {
      if (callback) callback([{ id: 1, url: 'https://example.com' }]);
      return Promise.resolve([{ id: 1, url: 'https://example.com' }]);
    }
  }
};

// Inject mock into page
if (typeof window !== 'undefined') {
  window.chrome = mockChrome;
}
```

Use the mock in tests:

```javascript
// tests/e2e/with-mock.spec.js
const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Inject mock Chrome API
    window.chrome = {
      runtime: {
        sendMessage: (msg, cb) => {
          // Return mock response
          if (cb) cb({ mocked: true });
        },
        onMessage: {
          addListener: (fn) => {
            window.__msgListener = fn;
          }
        }
      },
      storage: {
        local: {
          get: (k, cb) => cb ? cb({}) : Promise.resolve({}),
          set: (i, cb) => cb ? cb() : Promise.resolve()
        }
      }
    };
  });
});

test('uses mocked chrome API', async ({ page }) => {
  const result = await page.evaluate(() => {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ test: true }, resolve);
    });
  });
  
  expect(result.mocked).toBe(true);
});
```

---

## GitHub Actions CI Setup

Automate your tests on every push using GitHub Actions. For extension testing, you'll need to run headless Chrome with appropriate flags.

Create the CI workflow:

```yaml
# .github/workflows/test-extension.yml
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
      
      - name: Run unit tests
        run: npm test --if-present
      
      - name: Run E2E tests with Playwright
        uses: nick-fields/retry@v3
        with:
          timeout_minutes: 10
          retry_on: failure
          command: npx playwright test --reporter=list
        env:
          EXTENSION_ID: ${{ secrets.EXTENSION_ID }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
      
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: failed-screenshots
          path: test-results/

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
```

For Puppeteer tests in CI, add a headless-specific configuration:

```javascript
// tests/e2e/puppeteer/ci-setup.js
const puppeteer = require('puppeteer');

const launchOptions = process.env.CI ? {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
} : {
  headless: false,
  devtools: true
};

async function runTests() {
  const browser = await puppeteer.launch(launchOptions);
  // ... test logic
}
```

---

## Test Coverage Reporting

Coverage reports help identify untested code paths. For Chrome extensions, you need to instrument your code before running tests.

Set up Istanbul for coverage:

```bash
npm install --save-dev istanbul @istanbuljs/nyc
```

Configure nyc in your package.json:

```json
{
  "nyc": {
    "extension": [".js", ".jsx"],
    "exclude": ["tests/", "dist/", "node_modules/"],
    "reporter": ["html", "lcov", "text-summary"]
  },
  "scripts": {
    "coverage": "nyc npm test",
    "coverage:report": "nyc report --reporter=text-lcov > coverage.lcov"
  }
}
```

For E2E coverage with Puppeteer:

```javascript
// tests/e2e/puppeteer/coverage.js
const puppeteer = require('puppeteer');
const fs = require('fs');

async function collectCoverage() {
  const browser = await puppeteer.launch({
    args: ['--enable-extensions']
  });
  
  const page = await browser.newPage();
  
  // Enable coverage collection
  await page.coverage.startJSCoverage();
  
  // Run your tests
  await page.goto(`chrome-extension://${process.env.EXTENSION_ID}/popup.html`);
  
  // Stop and get coverage
  const coverage = await page.coverage.stopJSCoverage();
  
  // Process and save coverage data
  const coverageData = coverage.map(entry => ({
    url: entry.url,
    ranges: entry.ranges,
    text: entry.text
  }));
  
  fs.writeFileSync(
    './coverage/extension-coverage.json',
    JSON.stringify(coverageData, null, 2)
  );
  
  await browser.close();
}
```

Generate coverage reports:

```bash
npm run coverage
npx nyc report --reporter=html --dir=coverage/html
```

---

## Fixture Management Best Practices

Organize your test fixtures for maintainability and reusability. Good fixture management makes tests easier to write and understand.

Create a fixture library:

```javascript
// tests/e2e/fixtures/index.js
const { test as base } = require('@playwright/test');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

const extensionFixtures = base.extend({
  // Browser context with extension loaded
  extensionContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },
  
  // Pre-configured page
  extensionPage: async ({ extensionContext }, use) => {
    const page = await extensionContext.newPage();
    await use(page);
  },
  
  // Background page reference
  backgroundPage: async ({ browser }, use) => {
    const target = await browser.waitForTarget(
      t => t.type() === 'service_worker' && t.url().includes('background')
    );
    const page = await target.page();
    await use(page);
  },
  
  // Mock storage
  mockStorage: async ({ page }, use) => {
    const storage = {};
    await page.addInitScript((storage) => {
      window.chrome = window.chrome || {};
      window.chrome.storage = {
        local: {
          get: (keys, cb) => {
            const result = {};
            const keyArray = Array.isArray(keys) ? keys : [keys];
            keyArray.forEach(k => result[k] = storage[k]);
            if (cb) cb(result);
            return Promise.resolve(result);
          },
          set: (items, cb) => {
            Object.assign(storage, items);
            if (cb) cb();
            return Promise.resolve();
          }
        }
      };
    }, storage);
    await use(storage);
  }
});

module.exports = { extensionFixtures };
```

Use fixtures in tests:

```javascript
// tests/e2e/using-fixtures.spec.js
const { test, expect } = require('@playwright/test');
const { extensionFixtures } = require('./fixtures');

// Create test with fixtures
const testWithExtension = test.extend({
  // Custom fixture for this test file
  testData: async ({}, use) => {
    await use({ userId: 'test-123', name: 'Test User' });
  }
});

testWithExtension('uses fixtures', async ({ extensionPage, backgroundPage, mockStorage }) => {
  // Use pre-configured page
  await extensionPage.goto(`chrome-extension://${process.env.EXTENSION_ID}/popup.html`);
  
  // Use background page
  await backgroundPage.evaluate(() => {
    console.log('Background page accessible');
  });
  
  // Use mock storage
  mockStorage.testValue = 'test';
});
```

---

## Summary

Testing Chrome extensions requires understanding their unique architecture. Key points to remember:

- **Puppeteer** provides direct control over Chrome's extension loading via launch arguments, making it ideal for quick prototyping of test setups.
- **Playwright** offers more structured fixtures and better CI integration, with the trade-off of slightly more complex extension loading.
- **Popup testing** requires keeping the popup open—use target tracking or right-click inspect.
- **Content scripts** are tested by loading matching pages and verifying DOM modifications.
- **Service workers** need event-driven test approaches since they can terminate between invocations.
- **Visual regression testing** catches unintended UI changes in popups, options pages, and injected elements.
- **Mocking Chrome APIs** enables testing edge cases without real browser functionality.
- **CI integration** requires headless Chrome with appropriate flags for sandbox and GPU disabled.
- **Coverage reporting** helps ensure your test suite is comprehensive.

For continuous integration, see the [CI/CD Pipeline Guide](./ci-cd-pipeline.md) for advanced deployment patterns. For setting up your development environment, refer to the [Development Tutorial](./chrome-extension-development-tutorial-typescript-2026.md).

---

## Related Articles

- [CI/CD Pipeline](../guides/ci-cd-pipeline.md)
- [Chrome Extension Development Tutorial](../guides/chrome-extension-development-tutorial-typescript-2026.md)
- [Advanced Debugging Techniques](../guides/advanced-debugging.md)

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
