---
layout: default
title: "Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration"
description: "Master automated testing for Chrome extensions with Puppeteer and Playwright. Learn to test popups, content scripts, service workers, mock Chrome APIs, and set up CI/CD pipelines."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/chrome-extension-automated-testing-puppeteer-playwright/"
---

# Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration

Automated testing is essential for building reliable Chrome extensions. Unlike traditional web applications, extensions span multiple contexts—popup pages, background service workers, content scripts, and the browser UI itself. This guide covers comprehensive testing strategies using Puppeteer and Playwright, with practical patterns for testing all extension components and integrating tests into your CI/CD pipeline.

## Loading Unpacked Extensions in Puppeteer

Puppeteer provides direct support for loading Chrome extensions through the `args` launch option. The key is using `--disable-extensions-except` combined with `--load-extension` to specify your unpacked extension directory.

### Basic Puppeteer Setup

```javascript
const puppeteer = require('puppeteer');
const path = require('path');

async function createExtensionBrowser() {
  const extensionPath = path.resolve(__dirname, '../dist');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  
  return browser;
}
```

When launching with an extension, Puppeteer creates a browser context where your extension is pre-loaded. This differs from loading extensions in a regular Chrome session—the extension runs automatically when you create new pages.

### Getting the Extension ID

Chrome assigns each extension a unique ID based on its key. To programmatically access extension pages, you need this ID:

```javascript
async function getExtensionId(browser) {
  const targets = browser.targets();
  const extensionTarget = targets.find(
    target => target.type() === 'service_worker' && 
    target.url().startsWith('chrome-extension://')
  );
  
  const url = extensionTarget.url();
  // URL format: chrome-extension://[ID]/background_service_worker.js
  return url.split('/')[2];
}
```

### Loading the Popup for Testing

Once you have the extension ID, you can open the popup directly:

```javascript
async function openPopup(browser, extensionId) {
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const page = await browser.newPage();
  await page.goto(popupUrl);
  return page;
}
```

## Playwright Extension Fixtures

Playwright offers a more modern approach to extension testing with built-in support for browser contexts that include extensions. While native extension fixtures aren't yet fully mature, several patterns make testing straightforward.

### Setting Up Extension Contexts

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Chrome Extension Testing', () => {
  let browser;
  let extensionId;

  test.beforeAll(async () => {
    const extensionPath = path.resolve(__dirname, '../dist');
    
    browser = await chromium.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    // Get extension ID from service worker
    const targets = browser.targets();
    const swTarget = targets.find(t => t.type() === 'service_worker');
    const swUrl = swTarget.url();
    extensionId = swUrl.split('/')[2];
  });

  test.afterAll(async () => {
    await browser.close();
  });
});
```

### Creating Reusable Test Fixtures

For maintainable tests, create custom fixtures that encapsulate extension launching logic:

```typescript
// fixtures/extension.ts
import { test as base, Browser, BrowserContext } from '@playwright/test';
import path from 'path';

export interface ExtensionFixtures {
  extensionId: string;
  popupPage: any;
}

export const test = base.extend<ExtensionFixtures>({
  extensionId: async ({ browser }, use) => {
    const extensionPath = path.resolve(__dirname, '../../dist');
    const context = await browser.newContext();
    
    const targets = browser.targets();
    const swTarget = targets.find(t => t.type() === 'service_worker');
    const id = swTarget.url().split('/')[2];
    
    await use(id);
    await context.close();
  },

  popupPage: async ({ browser, extensionId }, use) => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await use(page);
    await page.close();
  },
});
```

This fixture-based approach keeps your test files clean and ensures consistent setup across all tests.

## Testing Popup Interactions

The popup is often the primary user interface for extensions. Testing it requires navigating to the popup URL and interacting with its DOM elements.

### Basic Popup Tests

```typescript
import { test, expect } from './fixtures/extension';

test('popup displays user authentication state', async ({ popupPage }) => {
  // Wait for the popup to fully load
  await popupPage.waitForLoadState('domcontentloaded');
  
  // Check for login/logout button based on auth state
  const authButton = popupPage.locator('#auth-button');
  await expect(authButton).toBeVisible();
});

test('popup saves settings when clicking save', async ({ popupPage }) => {
  await popupPage.fill('#setting-input', 'test-value');
  await popupPage.click('#save-button');
  
  // Verify the save confirmation appears
  const successMessage = popupPage.locator('.success-message');
  await expect(successMessage).toBeVisible();
});
```

### Handling Popup Lifecycle

Popups close when users click outside or press Escape. Your tests need to account for this:

```typescript
test('popup closes on outside click', async ({ popupPage, browser }) => {
  await popupPage.waitForLoadState('domcontentloaded');
  
  // Click on the main browser page (not the popup)
  const pages = await browser.pages();
  const mainPage = pages.find(p => !p.url().startsWith('chrome-extension://'));
  
  if (mainPage) {
    await mainPage.click('body');
    await popupPage.waitForTimeout(100);
    
    // Verify popup context is no longer available
    // Note: Popup pages become inaccessible when closed
  }
});
```

## Content Script Verification

Content scripts run in the context of web pages. Testing them requires injecting scripts or communicating through the Chrome messaging API.

### Testing Content Script Injection

```typescript
test('content script injects on matching pages', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('https://example.com');
  
  // Evaluate script in page context to check if content script ran
  const hasExtensionElement = await page.evaluate(() => {
    return document.querySelector('#my-extension-root') !== null;
  });
  
  expect(hasExtensionElement).toBe(true);
});
```

### Verifying Content Script Communication

```typescript
test('content script responds to messages', async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto('https://example.com');
  
  // Send message from page context
  const response = await page.evaluate(() => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'getPageData' },
        (response) => resolve(response)
      );
    });
  });
  
  expect(response).toHaveProperty('data');
});
```

## Service Worker Event Testing

Service workers run in the background and handle events like alarms, messages, and storage changes. Testing them requires connecting to the service worker target.

### Connecting to Service Worker

```typescript
test('service worker handles alarm events', async ({ browser }) => {
  const targets = browser.targets();
  const swTarget = targets.find(t => t.type() === 'service_worker');
  
  // Create a CDPPession for service worker
  const session = await swTarget.createCDPSession();
  
  // Enable necessary domains
  await session.send('ServiceWorker.enable');
  
  // Listen for console messages from service worker
  const messages: string[] = [];
  session.on('ServiceWorker.controlled', () => {});
  session.on('ServiceWorker.workerEventReceived', (event) => {
    if (event.type === 'consoleAPICalled') {
      messages.push(event.args[0].value);
    }
  });
  
  // Trigger an alarm (you'd need to do this through the extension popup or API)
  await browser.waitForTimeout(2000);
  
  // Verify the alarm was processed
  expect(messages.some(m => m.includes('alarm'))).toBe(true);
});
```

### Testing Storage Changes

```typescript
test('service worker responds to storage changes', async ({ browser }) => {
  const extensionId = await getExtensionId(browser);
  
  // Use popup or background page to change storage
  const bgPage = await browser.newPage();
  await bgPage.goto(`chrome-extension://${extensionId}/background.html`);
  
  // Set storage from background context
  await bgPage.evaluate(() => {
    chrome.storage.local.set({ testKey: 'testValue' });
  });
  
  // Give time for storage change event to fire
  await bgPage.waitForTimeout(500);
  
  // Verify the change was processed
  const storage = await bgPage.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get('testKey', (result) => resolve(result));
    });
  });
  
  expect(storage.testKey).toBe('testValue');
});
```

## Screenshot Comparison for Visual Regression

Visual regression testing catches unintended UI changes. Both Puppeteer and Playwright support screenshot capture.

### Capturing Screenshots

```typescript
import { test, expect } from '@playwright/test';

test('popup visual regression', async ({ popupPage }) => {
  await popupPage.waitForLoadState('domcontentloaded');
  
  // Wait for any animations to complete
  await popupPage.waitForTimeout(500);
  
  await expect(popupPage).toHaveScreenshot('popup-default.png');
});
```

### Handling Dynamic Content

Dynamic elements like timestamps cause flaky tests. Exclude them:

```typescript
test('popup visual without dynamic content', async ({ popupPage }) => {
  await popupPage.waitForLoadState('domcontentloaded');
  
  // Hide or normalize dynamic elements
  await popupPage.evaluate(() => {
    const timestamp = document.querySelector('.timestamp');
    if (timestamp) timestamp.textContent = '2024-01-01';
  });
  
  await expect(popupPage).toHaveScreenshot('popup-stable.png');
});
```

## E2E Test Patterns

End-to-end tests verify complete user workflows across extension components.

### Complete User Flow Test

```typescript
test('user flow: login and configure settings', async ({ browser }) => {
  const extensionId = await getExtensionId(browser);
  
  // Step 1: Open popup and authenticate
  const popup = await browser.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.fill('#username', 'testuser');
  await popup.fill('#password', 'password123');
  await popup.click('#login-button');
  
  // Step 2: Verify logged in state
  await expect(popup.locator('#user-display')).toContainText('testuser');
  
  // Step 3: Configure settings
  await popup.click('#settings-tab');
  await popup.check('#enable-feature');
  await popup.click('#save-settings');
  
  // Step 4: Verify settings persist in storage
  const settings = await popup.evaluate(() => {
    return new Promise((resolve) => {
      chrome.storage.local.get('settings', resolve);
    });
  });
  
  expect(settings.settings.enableFeature).toBe(true);
  
  // Step 5: Verify content script behavior on web page
  const testPage = await browser.newPage();
  await testPage.goto('https://example.com');
  
  // Check that feature is active on the page
  const featureActive = await testPage.evaluate(() => {
    return document.querySelector('.extension-feature') !== null;
  });
  
  expect(featureActive).toBe(true);
});
```

## Mocking Chrome APIs

Testing without actual Chrome APIs ensures tests run reliably and quickly.

### Using jest-chrome for Mocking

```typescript
import 'jest-chrome';

// In your test setup
beforeEach(() => {
  // Reset all mock storage
  chrome.storage.local.get.mockImplementation((keys, callback) => {
    callback({});
  });
  
  chrome.storage.local.set.mockImplementation((items, callback) => {
    callback();
  });
  
  // Mock runtime messages
  chrome.runtime.sendMessage.mockImplementation((message, response) => {
    if (message.action === 'getData') {
      response({ data: 'mocked-data' });
    }
    return true;
  });
});

test('popup loads with mocked API', async () => {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  
  // Verify UI reflects mocked data
  await expect(page.locator('#data-display')).toContainText('mocked-data');
});
```

### Creating Custom API Mocks

```typescript
// mocks/chrome-api.ts
export function createChromeMock() {
  return {
    runtime: {
      id: 'mock-extension-id',
      sendMessage: jest.fn().mockImplementation((message, response) => {
        if (response) response({ success: true });
        return true;
      }),
      onMessage: {
        addListener: jest.fn(),
      },
    },
    storage: {
      local: {
        get: jest.fn().mockImplementation((keys, callback) => {
          callback({});
        }),
        set: jest.fn().mockImplementation((items, callback) => {
          callback();
        }),
      },
    },
    tabs: {
      query: jest.fn().mockImplementation((query, callback) => {
        callback([{ id: 1, url: 'https://example.com' }]);
      }),
    },
  };
}
```

## GitHub Actions CI Setup

Automate your tests on every push using GitHub Actions.

### Basic Test Workflow

```yaml
name: Test

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
      
      - uses: pnpm/action-setup@v4
        with:
          version: 9
          
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Lint
        run: pnpm lint
        
      - name: Type check
        run: pnpm typecheck
        
      - name: Run unit tests
        run: pnpm test
        
      - name: Run E2E tests
        run: pnpm test:e2e
```

### Running Tests in Headless Mode

Extensions require Chrome, which works in headless mode but needs proper configuration:

```yaml
- name: Run E2E tests
  run: pnpm test:e2e
  env:
    CHROME_PATH: /usr/bin/google-chrome
```

Update your Playwright or Puppeteer configuration for CI:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    channel: 'chrome',
    headless: true,
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    },
  },
});
```

## Test Coverage Reporting

Measuring test coverage helps identify untested code paths.

### Setting Up Coverage

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: 'on-first-retry',
    coverage: {
      enabled: true,
    },
  },
});
```

### Collecting Coverage Reports

```typescript
// After tests, generate coverage report
test.afterAll(async () => {
  const coverage = await page.coverage();
  // Process and save coverage data
});
```

For comprehensive coverage, consider using tools like `vite-plugin-coverage-instrument` which instruments your code during build, enabling detailed coverage analysis.

## Fixture Management

Organizing test fixtures improves maintainability and reduces duplication.

### Project Structure

```
tests/
├── fixtures/
│   ├── extension.ts      # Extension launching fixtures
│   ├── storage.ts        # Storage mocking fixtures
│   └── api.ts           # API mocking fixtures
├── e2e/
│   ├── popup.spec.ts
│   ├── content-script.spec.ts
│   └── background.spec.ts
└── unit/
    ├── storage.test.ts
    └── messaging.test.ts
```

### Shared Fixtures Example

```typescript
// fixtures/extension.ts
import { test as base, Browser } from '@playwright/test';
import path from 'path';

export interface ExtensionOptions {
  extensionPath: string;
}

export const test = base.extend<{ extensionPage: any }>({
  extensionPage: async ({ browser }, use) => {
    const extensionPath = path.resolve(__dirname, '../../dist');
    
    // Launch with extension
    const extBrowser = await browser.launch({
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    
    // Get extension ID
    const targets = extBrowser.targets();
    const swTarget = targets.find(t => t.type() === 'service_worker');
    const extensionId = swTarget.url().split('/')[2];
    
    await use({ browser: extBrowser, extensionId });
    
    await extBrowser.close();
  },
});
```

## Best Practices for Extension Testing

Following best practices ensures your tests remain reliable and maintainable over time.

### Test Isolation

Each test should be independent and not rely on the state from previous tests. Use `beforeEach` hooks to set up clean state:

```typescript
test.beforeEach(async ({ browser }) => {
  // Clear extension storage before each test
  const extensionId = await getExtensionId(browser);
  const bgPage = await browser.newPage();
  await bgPage.goto(`chrome-extension://${extensionId}/background.html`);
  await bgPage.evaluate(() => {
    chrome.storage.local.clear();
  });
});
```

### Waiting for Extension Load

Extensions load asynchronously. Always wait for the service worker to be ready before running assertions:

```typescript
async function waitForServiceWorker(browser) {
  const targets = browser.targets();
  const swTarget = targets.find(t => t.type() === 'service_worker');
  
  // Wait until service worker is registered and running
  await browser.waitForTarget(target => 
    target.type() === 'service_worker' && 
    target.url().includes('background_service_worker')
  );
  
  return swTarget;
}
```

### Handling Flaky Tests

Extension tests can be flaky due to timing issues. Use explicit waits and retry mechanisms:

```typescript
test('popup loads correctly', async ({ popupPage }), { retry: 2 }) => {
  await popupPage.waitForLoadState('networkidle');
  await expect(popupPage.locator('body')).toBeVisible();
});
```

## Debugging Extension Tests

When tests fail, debugging requires understanding the different execution contexts.

### Viewing Service Worker Logs

Service workers run in a separate context. Access their logs through Chrome DevTools Protocol:

```typescript
async function getServiceWorkerLogs(browser) {
  const targets = browser.targets();
  const swTarget = targets.find(t => t.type() === 'service_worker');
  const session = await swTarget.createCDPSession();
  
  const logs = [];
  session.on('Runtime.consoleAPICalled', (event) => {
    logs.push(event.args.map(a => a.value).join(' '));
  });
  
  return logs;
}
```

### Taking Debug Screenshots on Failure

Configure your test runner to capture screenshots when tests fail:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

## Related Guides

For more information on extension development and CI/CD, see these related guides:

- [CI/CD Pipeline Guide](/chrome-extension-guide/guides/ci-cd-pipeline/) — Automate your extension builds and deployments
- [Chrome Extension Development](/chrome-extension-guide/guides/chrome-extension-development-typescript-2026/) — Get started with TypeScript development
- [Extension Testing Strategies](/chrome-extension-guide/guides/testing-extensions/) — Overview of testing approaches

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
