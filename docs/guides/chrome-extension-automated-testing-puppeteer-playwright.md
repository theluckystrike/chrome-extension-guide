---

layout: default
title: "Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration"
description: "Master automated testing for Chrome extensions with Puppeteer and Playwright. Learn to test popups, content scripts, service workers, mock Chrome APIs, and set up GitHub Actions CI pipelines."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/chrome-extension-automated-testing-puppeteer-playwright/"

---

# Automated Testing for Chrome Extensions: Puppeteer, Playwright, and CI Integration

Testing Chrome extensions presents unique challenges that differ significantly from traditional web applications. Unlike standard websites, extensions consist of multiple components—popup pages, background service workers, content scripts, and options pages—that communicate through Chrome's messaging API. This guide covers comprehensive testing strategies using Puppeteer and Playwright, from loading unpacked extensions to setting up CI pipelines that validate your extension on every commit.

## Understanding Chrome Extension Testing Architecture

Before diving into code, it's essential to understand the architecture you're testing. A Chrome extension typically consists of:

- **Popup**: The HTML page that appears when clicking the extension icon
- **Background Service Worker**: Handles events, manages state, and coordinates between components
- **Content Scripts**: Injected into web pages to interact with DOM
- **Options Page**: Configuration interface for users
- **Chrome APIs**: The chrome.* namespace providing browser functionality

Each of these components requires different testing approaches. Puppeteer excels at low-level browser control, while Playwright provides higher-level abstractions and better extension support through its testing framework.

## Loading Unpacked Extensions in Puppeteer

Puppeteer can launch Chrome with an unpacked extension loaded, giving you direct access to extension pages and the background worker. Here's how to set this up:

```javascript
const puppeteer = require('puppeteer');

async function createExtensionBrowser() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  
  return browser;
}
```

The key is using the `--load-extension` flag to point to your unpacked extension directory. For testing against a built extension, use the `--disable-extensions-except` flag alongside it.

### Accessing Extension Pages

Once launched, you can access different extension pages through their URLs:

```javascript
async function testExtensionPopup() {
  const browser = await createExtensionBrowser();
  
  // Get all targets and find the popup
  const targets = await browser.targets();
  const popupTarget = targets.find(target => 
    target.url().includes('popup.html')
  );
  
  const popupPage = await popupTarget.page();
  
  // Now you can interact with the popup
  await popupPage.click('#action-button');
  const status = await popupPage.$eval('#status', el => el.textContent);
  
  console.log('Popup status:', status);
}
```

### Testing the Background Service Worker

Accessing the service worker is trickier since it doesn't have a visible page. Puppeteer provides a workaround using the background page:

```javascript
async function getBackgroundPage(browser) {
  const targets = await browser.targets();
  const backgroundTarget = targets.find(target => 
    target.type() === 'service_worker' || 
    target.url().includes('background.js')
  );
  
  // For Manifest V2, you can get the background page directly
  // For Manifest V3, use chrome.runtime API through a page
  return backgroundTarget;
}
```

Note that in Manifest V3, service workers are ephemeral and may terminate between tests. For reliable testing, you might need to trigger events that wake the service worker.

## Playwright Extension Fixtures

Playwright offers more sophisticated extension testing through its extension fixture system. This approach provides better isolation and built-in waiting mechanisms:

```typescript
import { test, expect, chromium } from '@playwright/test';

// Configure extension launch in playwright.config.ts
test.describe('Chrome Extension', () => {
  test('should load popup and interact', async ({ page }) => {
    // Load the extension popup
    await page.goto('chrome-extension://EXTENSION_ID/popup.html');
    
    // Interact with popup elements
    await page.click('#settings-button');
    await expect(page.locator('.settings-panel')).toBeVisible();
  });
});
```

### Setting Up Extension Context

Playwright's browser context can be configured to load extensions:

```typescript
async function createExtensionContext() {
  const browser = await chromium.launch({
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });
  
  const context = await browser.newContext();
  return { browser, context };
}
```

### Using Playwright Test Fixtures

For reusable test setup, create custom fixtures:

```typescript
import { test as base } from '@playwright/test';

export interface ExtensionTestOptions {
  extensionPath: string;
}

const extensionTest = base.extend<{ extensionPage: Page }>({
  extensionPath: process.env.EXTENSION_PATH,
  
  extensionPage: async ({ }, use) => {
    const browser = await chromium.launch({
      args: [`--load-extension=${process.env.EXTENSION_PATH}`]
    });
    const page = await browser.newPage();
    await use(page);
    await browser.close();
  }
});

export { extensionTest };
```

## Testing Popup Interactions

The popup is often the primary user interface for extensions. Testing it involves verifying UI state, user interactions, and communication with the background script:

```typescript
extensionTest('popup should display current state', async ({ extensionPage }) => {
  await extensionPage.goto('chrome-extension://EXTENSION_ID/popup.html');
  
  // Check initial state
  await expect(extensionPage.locator('.toggle-switch')).toHaveClass(/active/);
  
  // Toggle and verify state change
  await extensionPage.click('.toggle-switch');
  await expect(extensionPage.locator('.toggle-switch')).not.toHaveClass(/active/);
  
  // Verify storage was updated
  const storage = await extensionPage.evaluate(() => {
    return chrome.storage.local.get('enabled');
  });
  expect(storage.enabled).toBe(false);
});
```

### Testing Popup-Background Communication

Test that messages between popup and background are working:

```typescript
extensionTest('popup should communicate with background', async ({ extensionPage }) => {
  await extensionPage.goto('chrome-extension://EXTENSION_ID/popup.html');
  
  // Send message to background
  await extensionPage.evaluate(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      window.__lastResponse = response;
    });
  });
  
  // Wait for response
  await extensionPage.waitForFunction(() => window.__lastResponse !== undefined);
  
  const response = await extensionPage.evaluate(() => window.__lastResponse);
  expect(response.status).toBe('active');
});
```

## Content Script Verification

Content scripts run in the context of web pages, making them more challenging to test. You need a page that the content script targets:

```typescript
extensionTest('content script should inject into pages', async ({ page }) => {
  // Navigate to a page where content script should run
  await page.goto('https://example.com');
  
  // Wait for content script to inject
  await page.waitForSelector('[data-extension-injected="true"]');
  
  // Verify content script functionality
  const data = await page.evaluate(() => {
    return window.__extensionData;
  });
  
  expect(data).toHaveProperty('url');
  expect(data).toHaveProperty('timestamp');
});
```

### Testing Content Script Message Passing

Verify communication between content scripts and background:

```typescript
extensionTest('content script should send messages to background', async ({ page }) => {
  await page.goto('https://example.com');
  
  // Trigger content script action
  await page.click('.analyze-button');
  
  // Listen for message from content script
  const messagePromise = page.waitForEvent('console');
  await messagePromise;
  
  const messages = [];
  page.on('console', msg => messages.push(msg.text()));
  
  await page.click('.analyze-button');
  
  // Verify message was sent
  await page.waitForFunction(() => 
    window.__messages.some(m => m.includes('ANALYSIS_COMPLETE'))
  );
});
```

## Service Worker Event Testing

Service workers respond to Chrome events, which you can trigger programmatically:

```typescript
extensionTest('service worker should handle alarms', async ({ browser }) => {
  // Launch with extension
  const context = await browser.newContext({
    args: [`--load-extension=${EXTENSION_PATH}`]
  });
  
  // Trigger an alarm event
  await context.evaluate(() => {
    chrome.alarms.create('test-alarm', { delayInMinutes: 0.01 });
  });
  
  // Wait for alarm to fire (service worker should wake)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verify alarm was handled by checking storage
  const alarmFired = await context.evaluate(() => {
    return chrome.storage.local.get('lastAlarm');
  });
  
  expect(alarmFired.lastAlarm).toBeDefined();
});
```

### Testing Runtime Events

Test how your extension responds to Chrome runtime events:

```typescript
extensionTest('should handle install event', async ({ browser }) => {
  // Clear extension state first
  await chrome.storage.local.clear();
  
  // Simulate installation by triggering onInstalled
  await browser.evaluate(() => {
    chrome.runtime.onInstalled.addListener((details) => {
      chrome.storage.local.set({ installed: true, reason: details.reason });
    });
    
    // Trigger the event manually (in real tests, this happens on install)
    chrome.runtime.onInstalled.dispatch({ reason: 'install' });
  });
  
  const installData = await browser.evaluate(() => {
    return chrome.storage.local.get('installed');
  });
  
  expect(installData.installed).toBe(true);
});
```

## Screenshot Comparison for Visual Regression

Visual testing helps catch unintended UI changes:

```typescript
import { Percy } from '@percy/playwright';

extensionTest('popup visual regression', async ({ extensionPage }) => {
  await extensionPage.goto('chrome-extension://EXTENSION_ID/popup.html');
  
  // Take snapshot
  await percy.snapshot(extensionPage, 'Extension Popup - Default State');
  
  // Change state and take another
  await extensionPage.click('.dark-mode-toggle');
  await percy.snapshot(extensionPage, 'Extension Popup - Dark Mode');
});
```

For simpler comparison without Percy:

```typescript
extensionTest('should match expected screenshot', async ({ extensionPage }) => {
  await extensionPage.goto('chrome-extension://EXTENSION_ID/popup.html');
  
  const screenshot = await extensionPage.screenshot();
  const expected = fs.readFileSync('./tests/fixtures/popup-default.png');
  
  expect(screenshot).toMatchImageSnapshot(expected);
});
```

## End-to-End Test Patterns

E2E tests verify complete user workflows across extension components:

```typescript
extensionTest('complete user workflow', async ({ page }) => {
  // 1. User opens extension popup
  await page.goto('chrome-extension://EXTENSION_ID/popup.html');
  await page.click('#start-button');
  
  // 2. Navigate to a target page
  await page.goto('https://target-website.com');
  
  // 3. Content script should be active
  await page.waitForSelector('.extension-toolbar');
  
  // 4. Interact with content script
  await page.click('.extension-toolbar button.primary');
  
  // 5. Verify background recorded the action
  const actionCount = await page.evaluate(() => {
    return chrome.storage.local.get('actionCount');
  });
  expect(actionCount.actionCount).toBe(1);
});
```

### Test Isolation and Cleanup

Always clean up between tests to prevent state leakage:

```typescript
afterEach(async () => {
  // Clear storage
  await context.evaluate(() => {
    return chrome.storage.local.clear();
    return chrome.storage.session.clear();
  });
  
  // Clear cookies
  await context.clearCookies();
  
  // Close all pages except the test page
  const pages = await context.pages();
  await Promise.all(pages.map(p => p.close()));
});
```

## Mocking Chrome APIs

For unit testing without a real Chrome environment, mock the chrome API:

```typescript
// jest.setup.js
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({ success: true });
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    getURL: jest.fn((path) => `chrome-extension://test/${path}`)
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn((items, callback) => callback()),
      clear: jest.fn((callback) => callback())
    },
    session: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn((query, callback) => callback([])),
    sendMessage: jest.fn()
  }
};
```

### Using MSW for HTTP Request Mocking

For extensions that make API calls, use Mock Service Worker:

```typescript
import { setupWorker } from 'msw/browser';

const worker = setupWorker();

beforeAll(async () => {
  await worker.start({
    onUnhandledRequest: 'bypass'
  });
});

test('should handle API response', async () => {
  // Define mock response
  worker.use(
    http.get('https://api.example.com/data', () => {
      return HttpResponse.json({ status: 'ok', data: [1, 2, 3] });
    })
  );
  
  // Your test continues...
});
```

## GitHub Actions CI Setup

Automate testing on every push using GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Test Chrome Extension

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
        run: npm run test:unit
      
      - name: Run E2E tests with Playwright
        uses: microsoft/playwright-github-action@v1
        with:
          install-browsers: true
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
```

### Testing Multiple Chrome Versions

For comprehensive coverage, test against multiple Chrome versions:

```yaml
jobs:
  test-chrome-stable:
    runs-on: ubuntu-latest
    steps:
      - uses: browser-actions/setup-chrome@latest
        with:
          chrome-version: stable
      
      - name: Run tests
        run: npm run test:e2e -- --chrome-path=$(which chrome)
  
  test-chrome-beta:
    runs-on: ubuntu-latest
    steps:
      - uses: browser-actions/setup-chrome@latest
        with:
          chrome-version: beta
      
      - name: Run tests
        run: npm run test:e2e -- --chrome-path=$(which chrome)
```

## Test Coverage Reporting

Generate coverage reports to identify untested code:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    coverageProvider: 'v8',
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],
  
  reporter: [
    ['html'],
    ['json', { outputFile: 'coverage/coverage.json' }]
  ]
});
```

### Merging Coverage Reports

For multiple test files, merge coverage data:

```javascript
// coverage-merge.js
const fs = require('fs');
const path = require('path');

function mergeCoverage() {
  const coverageDir = './coverage';
  const files = fs.readdirSync(coverageDir).filter(f => f.endsWith('.json'));
  
  let merged = {
    path: 'merged',
    statementMap: {},
    fnMap: {},
    branchMap: {},
    s: {},
    f: {}
  };
  
  // Merge all coverage files
  files.forEach(file => {
    const coverage = JSON.parse(fs.readFileSync(path.join(coverageDir, file)));
    // Merge logic...
  });
  
  fs.writeFileSync('./coverage/merged.json', JSON.stringify(merged));
}
```

## Fixture Management

Organize test fixtures for reusability:

```typescript
// fixtures/extension.ts
export const extensionFixtures = {
  manifest: {
    manifest_version: 3,
    name: 'Test Extension',
    version: '1.0.0',
    permissions: ['storage', 'tabs'],
    action: {
      default_popup: 'popup.html'
    }
  },
  
  popupHtml: `
    <!DOCTYPE html>
    <html>
      <body>
        <button id="action">Action</button>
        <div id="status"></div>
      </body>
    </html>
  `,
  
  popupJs: `
    document.getElementById('action').addEventListener('click', () => {
      document.getElementById('status').textContent = 'Clicked';
      chrome.storage.local.set({ clicked: true });
    });
  `
};
```

### Creating Test Extensions

Build temporary test extensions on the fly:

```typescript
async function createTestExtension(fixtures) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ext-'));
  
  await fs.writeFile(
    path.join(tempDir, 'manifest.json'),
    JSON.stringify(fixtures.manifest)
  );
  
  await fs.writeFile(
    path.join(tempDir, 'popup.html'),
    fixtures.popupHtml
  );
  
  // Build if needed...
  
  return tempDir;
}
```

## Conclusion

Automated testing for Chrome extensions requires understanding the unique architecture of browser extensions and leveraging the right tools for each component. Puppeteer provides fine-grained control for low-level testing, while Playwright's extension fixtures offer a more ergonomic testing experience. Combined with proper CI/CD integration through GitHub Actions, you can ensure your extension works reliably across different Chrome versions and usage scenarios.

Key testing strategies covered in this guide include loading unpacked extensions, testing popup interactions, verifying content script injection, mocking Chrome APIs, and setting up comprehensive CI pipelines. By implementing these patterns, you'll catch bugs early and maintain confidence in your extension's functionality.

For more information on setting up your development environment and CI pipelines, see our [Chrome Extension CI/CD Pipeline](/chrome-extension-guide/docs/guides/ci-cd-pipeline/) guide and [Chrome Extension Development Tutorial](/chrome-extension-guide/docs/guides/chrome-extension-development-typescript-2026/). These resources will help you build a complete development and testing workflow for your extension.

---

*Part of the Chrome Extension Guide by theluckystrike. More at zovo.one.*
