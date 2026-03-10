---

title: Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration
description: Learn how to automate testing for Chrome extensions using Puppeteer and Playwright. Cover popup testing, content script verification, service worker event testing, mocking Chrome APIs, and GitHub Actions CI setup.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/chrome-extension-automated-testing-puppeteer-playwright/"

---

# Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration

Automated testing is critical for maintaining reliable Chrome extensions. Unlike traditional web applications, Chrome extensions have unique testing challenges: loading unpacked extensions, testing popup UIs, verifying content script injection, mocking Chrome APIs, and ensuring service worker lifecycle events work correctly. This comprehensive guide covers testing strategies using Puppeteer and Playwright, E2E test patterns, and CI integration with GitHub Actions.

## 1. Setting Up Puppeteer for Chrome Extension Testing

Puppeteer provides excellent support for loading and testing Chrome extensions. The key is using the `--disable-extensions-except` and `--load-extension` flags to launch Chrome with your unpacked extension.

### 1.1 Basic Puppeteer Extension Launcher

```javascript
// test/utils/puppeteer-extensions.js
import puppeteer from 'puppeteer';

export async function createExtensionBrowser(extensionPath) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
    defaultViewport: null,
  });

  return browser;
}

export async function getExtensionBackgroundPage(browser) {
  const targets = await browser.targets();
  const backgroundTarget = targets.find(
    (target) => target.type() === 'service_worker' || 
               target.url().includes('background')
  );
  
  if (backgroundTarget) {
    return backgroundTarget.page();
  }
  return null;
}
```

### 1.2 Loading Extensions in Headless Mode

For CI environments, you need headless support:

```javascript
// test/utils/headless-extension.js
export async function launchWithExtension(extensionPath, headless = true) {
  const browser = await puppeteer.launch({
    headless,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  // Wait for extension to load
  await new Promise(resolve => setTimeout(resolve, 1000));

  return browser;
}
```

## 2. Playwright Extension Fixtures

Playwright provides built-in support for Chrome extension testing through its extension fixtures, making it easier to manage extension loading and testing.

### 2.1 Basic Playwright Extension Test

```typescript
// tests/extension.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chrome Extension Testing', () => {
  test('popup loads and displays content', async ({ extension }) => {
    // Open the extension popup
    const popup = await extension.popup();
    
    // Wait for content to load
    await popup.waitForSelector('.popup-content');
    
    // Verify content
    await expect(popup.locator('h1')).toHaveText('My Extension');
    
    // Test interaction
    await popup.click('#action-button');
    await popup.waitForTimeout(500);
  });

  test('background service worker is running', async ({ extension }) => {
    const background = await extension.background();
    
    // Check background page is accessible
    expect(background.url()).toContain('background');
    
    // Evaluate code in background context
    const manifest = await background.evaluate(() => {
      return chrome.runtime.getManifest();
    });
    
    expect(manifest.name).toBe('My Extension');
  });
});
```

### 2.2 Playwright Configuration for Extensions

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-extensions-except=./dist',
            '--load-extension=./dist',
          ],
        },
      },
    },
  ],
});
```

## 3. Testing Popup Interactions

The extension popup is the primary user interface. Testing it requires careful handling of popup lifecycle events.

### 3.1 Popup Test Suite

```typescript
// tests/popup.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Extension Popup', () => {
  test.beforeEach(async ({ extension }) => {
    this.popup = await extension.popup();
  });

  test('initial state renders correctly', async ({ popup }) => {
    await popup.waitForLoadState('domcontentloaded');
    
    // Check title
    const title = await popup.locator('.extension-title').textContent();
    expect(title).toBe('My Chrome Extension');
    
    // Verify initial button state
    const button = popup.locator('#toggle-button');
    await expect(button).toBeVisible();
    await expect(button).toHaveClass(/inactive/);
  });

  test('clicking toggle button updates state', async ({ popup }) => {
    const button = popup.locator('#toggle-button');
    
    // Click to activate
    await button.click();
    
    // Verify state change
    await expect(button).toHaveClass(/active/);
    
    // Verify storage updated
    const isEnabled = await popup.evaluate(() => {
      return localStorage.getItem('extensionEnabled') === 'true';
    });
    expect(isEnabled).toBe(true);
  });

  test('form submission works correctly', async ({ popup }) => {
    await popup.fill('#name-input', 'Test User');
    await popup.click('#submit-button');
    
    // Wait for response
    await popup.waitForSelector('.success-message', { timeout: 5000 });
    
    // Verify success message
    await expect(popup.locator('.success-message')).toContainText('Saved!');
  });

  test('error handling displays correctly', async ({ popup }) => {
    // Trigger error condition
    await popup.click('#error-trigger-button');
    
    // Verify error message
    await popup.waitForSelector('.error-message', { state: 'visible' });
    await expect(popup.locator('.error-message')).toContainText('Failed to load');
  });
});
```

## 4. Content Script Verification

Content scripts run in the context of web pages. Testing them requires navigating to target pages and verifying script injection.

### 4.1 Content Script Test

```typescript
// tests/content-script.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Content Script Injection', () => {
  const testPage = 'https://example.com';

  test('content script injects on page load', async ({ page }) => {
    await page.goto(testPage);
    
    // Wait for content script to inject
    await page.waitForFunction(() => {
      return typeof window.contentScriptLoaded !== 'undefined';
    });
    
    // Verify content script is active
    const isActive = await page.evaluate(() => {
      return window.contentScriptLoaded === true;
    });
    expect(isActive).toBe(true);
  });

  test('content script interacts with page DOM', async ({ page }) => {
    await page.goto(testPage);
    
    // Verify content script modified DOM
    const hasInjectedElement = await page.evaluate(() => {
      return document.querySelector('.extension-injected') !== null;
    });
    expect(hasInjectedElement).toBe(true);
  });

  test('content script receives messages from background', async ({ page, extension }) => {
    await page.goto(testPage);
    
    // Get background page
    const background = await extension.background();
    
    // Send message to content script
    await background.evaluate((tabId) => {
      chrome.tabs.sendMessage(tabId, { action: 'getStatus' });
    }, (await page.target().createCDPSession())._targetId);
    
    // Wait for response
    await page.waitForFunction(() => {
      return window.lastMessage !== undefined;
    });
    
    const lastMessage = await page.evaluate(() => window.lastMessage);
    expect(lastMessage.status).toBe('active');
  });
});
```

## 5. Service Worker Event Testing

Service workers (background scripts in MV3) handle events like alarms, messages, and storage changes. Testing these requires triggering events and verifying side effects.

### 5.1 Service Worker Test Suite

```typescript
// tests/service-worker.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Service Worker (Background)', () => {
  let background;

  test.beforeEach(async ({ extension }) => {
    background = await extension.background();
  });

  test('alarms are created and fire', async ({ background: bg }) => {
    // Create an alarm
    await bg.evaluate(() => {
      chrome.alarms.create('test-alarm', { delayInMinutes: 0.01 });
    });
    
    // Wait for alarm to fire (might need adjustment)
    await bg.waitForFunction(() => {
      return window.alarmFired === true;
    }, { timeout: 10000 });
    
    // Verify alarm fired
    const alarmFired = await bg.evaluate(() => window.alarmFired);
    expect(alarmFired).toBe(true);
  });

  test('message handling works correctly', async ({ background: bg }) => {
    // Send message to background
    const response = await bg.evaluate(() => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'processData', data: 'test' },
          (response) => resolve(response)
        );
      });
    });
    
    expect(response.success).toBe(true);
    expect(response.result).toBe('processed: test');
  });

  test('storage changes are tracked', async ({ background: bg }) => {
    // Set storage
    await bg.evaluate(() => {
      chrome.storage.local.set({ testKey: 'testValue' });
    });
    
    // Wait for storage change event
    await bg.waitForFunction(() => {
      return window.storageChanges !== undefined;
    });
    
    const changes = await bg.evaluate(() => window.storageChanges);
    expect(changes.testKey.newValue).toBe('testValue');
  });
});
```

## 6. Screenshot Comparison for Visual Regression

Visual regression testing helps catch unintended UI changes in popups and injected elements.

### 6.1 Screenshot Test Configuration

```typescript
// tests/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('popup matches baseline screenshot', async ({ extension }) => {
    const popup = await extension.popup();
    await popup.waitForLoadState('domcontentloaded');
    
    await expect(popup).toHaveScreenshot('popup-default.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('popup with data matches baseline', async ({ extension }) => {
    const popup = await extension.popup();
    await popup.waitForLoadState('domcontentloaded');
    
    // Set up state
    await popup.evaluate(() => {
      localStorage.setItem('userName', 'Test User');
    });
    
    await expect(popup).toHaveScreenshot('popup-with-user.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});
```

## 7. E2E Test Patterns for Extensions

End-to-end tests verify the complete user flow across popup, content scripts, and background scripts.

### 7.1 Complete E2E Flow Test

```typescript
// tests/e2e-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('E2E: Toggle Extension Feature', () => {
  const testPage = 'https://example.com';

  test('user can toggle feature from popup to page', async ({ page, extension }) => {
    // Step 1: Open popup and enable feature
    const popup = await extension.popup();
    await popup.waitForLoadState('domcontentloaded');
    
    const toggleButton = popup.locator('#feature-toggle');
    await toggleButton.click();
    
    // Step 2: Navigate to target page
    await page.goto(testPage);
    
    // Step 3: Verify content script activated
    await page.waitForSelector('.extension-active-indicator', {
      state: 'visible',
      timeout: 5000,
    });
    
    // Step 4: Verify feature is working
    const isActive = await page.evaluate(() => {
      return document.querySelector('.extension-active-indicator')
        .classList.contains('active');
    });
    expect(isActive).toBe(true);
    
    // Step 5: Disable from popup
    const popup2 = await extension.popup();
    await popup2.click('#feature-toggle');
    
    // Step 6: Verify feature disabled on page
    await page.waitForSelector('.extension-active-indicator', {
      state: 'hidden',
      timeout: 5000,
    });
  });
});
```

## 8. Mocking Chrome APIs

Testing Chrome extensions often requires mocking Chrome APIs to control their behavior or simulate edge cases.

### 8.1 Chrome API Mock Utility

```typescript
// test/utils/chrome-mock.ts
export function createChromeMock(overrides = {}) {
  const defaultChrome = {
    runtime: {
      id: 'test-extension-id',
      getManifest: () => ({
        name: 'Test Extension',
        version: '1.0.0',
        manifest_version: 3,
      }),
      getURL: (path: string) => `chrome-extension://test-id/${path}`,
      sendMessage: jest.fn(),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
    },
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      },
      sync: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined),
      },
    },
    tabs: {
      query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
    },
    alarms: {
      create: jest.fn(),
      get: jest.fn(),
      clear: jest.fn(),
      onAlarm: {
        addListener: jest.fn(),
      },
    },
  };

  return { ...defaultChrome, ...overrides };
}

export function injectChromeMock(page) {
  return page.evaluateOnNewDocument(() => {
    // @ts-ignore
    window.chrome = {
      runtime: {
        id: 'mock-extension-id',
        getManifest: () => ({
          name: 'Mock Extension',
          version: '1.0.0',
          manifest_version: 3,
        }),
      },
      storage: {
        local: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve(),
        },
      },
    };
  });
}
```

## 9. GitHub Actions CI Setup

Running extension tests in CI requires special configuration to handle Chrome/Chromium with extension support.

### 9.1 GitHub Actions Workflow

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
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build extension
        run: npm run build
      
      - name: Install Playwright browsers
        run: npx playwright install chromium
      
      - name: Run tests
        run: npx playwright test --reporter=html
        
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
      
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  test-multi-browser:
    runs-on: ubuntu-latest
    needs: test
    
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build extension
        run: npm run build
      
      - name: Install Playwright browsers
        run: npx playwright install ${{ matrix.browser }}
      
      - name: Run browser tests
        run: npx playwright test --browser=${{ matrix.browser }}
```

### 9.2 Containerized Testing with Chrome

For more reliable CI testing, use a container with Chrome:

```yaml
# .github/workflows/test-containerized.yml
name: Containerized Extension Tests

jobs:
  test:
    runs-on: ubuntu-latest
    container: mcr.microsoft.com/playwright:v1.42.0-jammy
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build extension
        run: npm run build
      
      - name: Run tests
        run: npx playwright test
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
```

## 10. Test Coverage Reporting

Measuring test coverage helps identify untested code paths in your extension.

### 10.1 Coverage Setup

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    coverage: {
      provider: 'v8',
      reporter: [['html'], ['json', { outputFile: 'coverage/coverage.json' }]],
    },
  },
});
```

### 10.2 Coverage Report Generation

```typescript
// test/utils/coverage.ts
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);
    
    // Collect coverage data
    const coverage = await page.coverage();
    console.log('CSS Coverage:', coverage.css?.length || 0);
    console.log('JS Coverage:', coverage.javascript?.length || 0);
  },
});
```

## 11. Fixture Management for Extension Tests

Creating reusable fixtures improves test maintainability and reduces duplication.

### 11.1 Custom Test Fixtures

```typescript
// test/fixtures/extension-fixtures.ts
import { test as base, Page, BrowserContext } from '@playwright/test';

export interface ExtensionTestContext {
  extensionId: string;
  popup: Page | null;
  background: Page | null;
}

const extensionFixture = base.extend<{ extension: ExtensionTestContext }>({
  extension: async ({ browser, browserContext }, use) => {
    const context: ExtensionTestContext = {
      extensionId: '',
      popup: null,
      background: null,
    };

    // Wait for extension to load and get its ID
    await browserContext.waitForEvent('webextension-new-tab');

    // Get all targets and find extension-related ones
    const backgroundTarget = await browserContext.waitForTarget(
      (target) => target.type() === 'service_worker'
    );
    
    context.background = await backgroundTarget.page();
    context.extensionId = context.background?.url().split('/')[2] || '';

    await use(context);
  },
});

export { extensionFixture as test };
```

---

## Related Guides

For more information on extension development and deployment, see these related guides:

- [CI/CD Pipeline Guide](/chrome-extension-guide/docs/guides/ci-cd-pipeline/) — Set up continuous integration and deployment for your extensions
- [GitHub Actions for Extensions](/chrome-extension-guide/docs/guides/github-actions-extension-ci-cd/) — Advanced CI/CD workflows
- [Chrome Extension Development with TypeScript](/chrome-extension-guide/docs/guides/chrome-extension-development-typescript-2026/) — Type-safe extension development
- [Chrome Extension Deployment Strategies](/chrome-extension-guide/docs/guides/chrome-extension-deployment-strategies/) — Production deployment patterns

---

*Part of the Chrome Extension Guide by theluckystrike. More at [zovo.one](https://zovo.one)*
