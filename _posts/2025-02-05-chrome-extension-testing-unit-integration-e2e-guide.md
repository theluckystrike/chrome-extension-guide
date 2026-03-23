---
layout: post
title: "Chrome Extension Testing. Unit, Integration, and E2E Testing Complete Guide"
description: "Master Chrome extension testing. Unit tests with Vitest, integration tests with chrome API mocks, E2E tests with Puppeteer and Playwright. CI pipeline setup included."
date: 2025-02-05
categories: [guides, testing]
tags: [extension-testing, vitest, puppeteer, playwright, chrome-extension-testing]
author: theluckystrike
---

# Chrome Extension Testing. Unit, Integration, and E2E Testing Complete Guide

Testing Chrome extensions presents unique challenges that differ from traditional web applications. Extensions span multiple execution contexts, background service workers, popup pages, options pages, and content scripts, each with its own isolated environment and access to Chrome APIs. A comprehensive testing strategy must address these distinct contexts while ensuring smooth communication between them.

This complete guide walks you through building a solid testing infrastructure for Chrome extensions, covering unit tests, integration tests, and end-to-end tests. We'll explore the testing pyramid specific to extensions, dive deep into mocking Chrome APIs, and examine real-world testing strategies used in production extensions like Tab Suspender Pro.

---

The Testing Pyramid for Chrome Extensions {#testing-pyramid}

The testing pyramid provides a framework for allocating testing effort across different levels. For Chrome extensions, this pyramid adapts to account for the unique architecture of extension-based applications.

Foundation: Unit Tests (70%)

At the base of your testing strategy sit unit tests, which validate individual functions and modules in isolation. Unit tests should constitute approximately 70% of your test suite, providing fast feedback and comprehensive coverage of business logic. These tests run in Node.js environments and mock all external dependencies, including Chrome APIs.

For a Chrome extension, unit tests verify the core logic of your extension, the URL analysis algorithms in Tab Suspender Pro, the data transformation functions in a note-taking extension, or the filtering rules in a content blocker. Unit tests execute in milliseconds, enabling rapid iteration during development.

Middle Layer: Integration Tests (20%)

Integration tests verify that multiple components work correctly together. In Chrome extension context, this typically means testing communication between the popup and background service worker, verifying that storage operations persist correctly, or ensuring message passing works as expected. Integration tests constitute roughly 20% of your test suite.

These tests often use mocked Chrome APIs but exercise real code paths between different extension components. Integration tests catch issues that unit tests miss, such as serialization problems in message passing or timing issues in asynchronous storage operations.

Top Layer: E2E Tests (10%)

End-to-end tests validate the complete extension behavior in a real Chrome environment. These tests launch an actual Chrome browser with your extension loaded, simulating user interactions from clicking the extension icon to interacting with popup UI to verifying content script behavior on web pages. E2E tests constitute about 10% of your test suite but provide the highest confidence that your extension works correctly in production.

---

Unit Testing with Vitest {#unit-testing-vitest}

Vitest has become the preferred testing framework for Chrome extension development, offering significantly faster execution than Jest and excellent TypeScript support. Setting up Vitest for extension testing requires handling the unique aspects of extension architecture.

Initial Setup

Install Vitest and necessary dependencies:

```bash
npm install -D vitest @vitest/ui jsdom
```

Configure Vitest in your project's `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src//*.test.ts', 'src//*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src//*.ts'],
      exclude: ['src//*.test.ts', 'src//*.spec.ts']
    }
  }
});
```

The `setupFiles` option points to a file that runs before each test, where you configure global mocks for Chrome APIs.

---

Mocking Chrome APIs {#mocking-chrome-apis}

Chrome extensions rely heavily on `chrome.*` APIs for browser interaction. Testing these requires comprehensive mocking strategies. Two popular libraries simplify this process: `sinon-chrome` and `webextensions-polyfill-mock`.

Using sinon-chrome

Sinon-chrome provides stubs for most Chrome APIs, enabling you to simulate API behavior in your tests:

```typescript
import sinonChrome from 'sinon-chrome';

// In vitest.setup.ts
beforeAll(() => {
  global.chrome = sinonChrome;
});

afterEach(() => {
  sinonChrome.resetHistory();
});

// Example test
import { describe, it, expect, vi } from 'vitest';

describe('Tab Suspender Pro - Tab Management', () => {
  it('should suspend tab after inactivity threshold', async () => {
    // Arrange
    const tabId = 123;
    const mockTab = {
      id: tabId,
      url: 'https://example.com',
      active: false,
      pinned: false
    };
    
    chrome.tabs.get.resolves(mockTab);
    chrome.tabs.discard.resolves(true);
    
    // Act
    const result = await suspendTabIfInactive(tabId, 300000);
    
    // Assert
    expect(chrome.tabs.discard.calledOnce).toBe(true);
    expect(result).toBe(true);
  });
});
```

Using webextensions-polyfill-mock

The `webextensions-polyfill-mock` library provides a more realistic mock that mimics actual Chrome API behavior:

```typescript
import { MicroMock } from 'webextensions-polyfill-mock';

const mockTabs = new MicroMock({
  chrome: { tabs: { Tab: { id: 0, url: '' } } },
  namespace: 'tabs',
  methods: ['get', 'query', 'update', 'discard']
});

// Usage in tests
describe('Storage Service', () => {
  it('should persist suspension rules', async () => {
    await chrome.storage.local.set({ 
      suspendedTabs: { 'tab-123': { url: 'https://example.com', timestamp: Date.now() } } 
    });
    
    const result = await chrome.storage.local.get('suspendedTabs');
    expect(result.suspendedTabs).toHaveProperty('tab-123');
  });
});
```

Manual Chrome API Mocking

For complex scenarios, you may need to create custom mocks:

```typescript
// vitest.setup.ts
export const createChromeMock = () => ({
  runtime: {
    lastError: null,
    id: 'extension-id',
    getURL: vi.fn((path) => `chrome-extension://extension-id/${path}`),
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined)
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue({ id: 1, url: 'https://example.com' }),
    update: vi.fn().mockResolvedValue({}),
    discard: vi.fn().mockResolvedValue(true),
    create: vi.fn().mockResolvedValue({ id: 2 })
  },
  alarms: {
    create: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    clear: vi.fn().mockResolvedValue(true),
    onAlarm: {
      addListener: vi.fn()
    }
  }
});

// Set up global
global.chrome = createChromeMock();
```

---

Integration Testing: Popup and Background Communication {#integration-testing}

Integration tests verify that different extension components work together correctly. The most common scenario is testing communication between the popup and background service worker.

Setting Up Integration Tests

Create integration tests that load real extension code but mock Chrome APIs where needed:

```typescript
// tests/integration/popup-background-communication.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Popup to Background Communication', () => {
  let messageListener: ((message: any, sender: any) => void) | null = null;
  
  beforeEach(() => {
    // Capture the message listener added by the popup
    chrome.runtime.onMessage.addListener = vi.fn((listener) => {
      messageListener = listener;
    });
    
    chrome.runtime.sendMessage = vi.fn().mockResolvedValue({ success: true });
  });
  
  it('should send suspend command to background', async () => {
    // Simulate popup sending a message
    await import('../../src/popup/suspendAction');
    
    // Verify message was sent
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'suspendTab',
        tabId: expect.any(Number)
      })
    );
  });
  
  it('should handle background response correctly', async () => {
    // Set up mock response
    chrome.runtime.sendMessage.mockResolvedValueOnce({
      success: true,
      suspendedTab: { id: 123, url: 'https://example.com' }
    });
    
    // Test response handling
    const response = await chrome.runtime.sendMessage({
      action: 'suspendTab',
      tabId: 123
    });
    
    expect(response.success).toBe(true);
    expect(response.suspendedTab).toBeDefined();
  });
});
```

Testing Storage Integration

Verify that storage operations work correctly across different contexts:

```typescript
// tests/integration/storage-sync.test.ts
describe('Storage Synchronization', () => {
  it('should sync settings between popup and background', async () => {
    // Simulate saving settings from popup
    const settings = {
      autoSuspend: true,
      inactivityTimeout: 300000,
      excludedDomains: ['github.com', 'localhost']
    };
    
    await chrome.storage.local.set({ settings });
    
    // Verify storage was called
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ settings })
    );
    
    // Simulate background reading settings
    const stored = await chrome.storage.local.get('settings');
    expect(stored.settings).toEqual(settings);
  });
});
```

---

End-to-End Testing with Puppeteer {#e2e-puppeteer}

Puppeteer provides powerful browser automation capabilities for testing Chrome extensions in a real environment. E2E tests load your unpacked extension and simulate user interactions.

Setting Up Puppeteer for Extension Testing

Install Puppeteer and configure it for extension testing:

```bash
npm install -D puppeteer
```

Create a Puppeteer test setup:

```typescript
// tests/e2e/puppeteer.setup.ts
import puppeteer, { ChromeLauncher } from 'puppeteer';

export interface ExtensionTestContext {
  browser: puppeteer.Browser;
  extensionUrl: string;
}

export async function launchExtension(
  extensionPath: string
): Promise<ExtensionTestContext> {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });
  
  // Get the extension URL
  const targets = await browser.targets();
  const extensionTarget = targets.find(
    (target) => target.type() === 'service_worker'
  );
  const extensionUrl = extensionTarget?.url() || '';
  
  return { browser, extensionUrl };
}
```

Writing Puppeteer E2E Tests

```typescript
// tests/e2e/popup.test.ts
import { describe, it, expect, afterAll } from 'vitest';
import puppeteer from 'puppeteer';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');

describe('Tab Suspender Pro - Popup E2E', () => {
  let browser: puppeteer.Browser;
  
  it('should open popup and display current tabs', async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox'
      ]
    });
    
    // Get all extension targets
    const targets = await browser.targets();
    const extensionTarget = targets.find(
      (t) => t.type() === 'service_worker'
    );
    
    // Open popup by clicking extension icon (simulated)
    const page = await browser.newPage();
    await page.goto('chrome-extension://*/popup.html');
    
    // Wait for popup to load
    await page.waitForSelector('.tab-list');
    
    // Verify tabs are displayed
    const tabItems = await page.$$('.tab-item');
    expect(tabItems.length).toBeGreaterThan(0);
  });
  
  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });
});
```

Loading Unpacked Extensions

For more complex scenarios, load the extension with specific launch arguments:

```typescript
async function loadExtensionWithOptions(
  extensionPath: string,
  options: { background?: boolean; popup?: boolean } = {}
) {
  const args = [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ];
  
  if (!options.background) {
    args.push('--disable-background-extensions');
  }
  
  const browser = await puppeteer.launch({
    headless: false,
    args
  });
  
  return browser;
}
```

---

End-to-End Testing with Playwright {#e2e-playwright}

Playwright offers a more modern API and better cross-browser support than Puppeteer, making it excellent for comprehensive extension testing.

Setting Up Playwright for Extensions

Install Playwright:

```bash
npm install -D @playwright/test playwright
npx playwright install chromium
```

Configure Playwright for extension testing:

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    trace: 'on-first-retry',
    contextOptions: {
      permissions: ['clipboardRead', 'clipboardWrite']
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
```

Writing Playwright Extension Tests

```typescript
// tests/e2e/extension-popup.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');

test.describe('Tab Suspender Pro Popup', () => {
  test('should display active tabs in popup', async ({ page }) => {
    // Navigate to extension popup
    await page.goto(`chrome-extension://*/popup.html`);
    
    // Wait for content to load
    await page.waitForSelector('.extension-loaded', { timeout: 5000 });
    
    // Check for tab count
    const tabCount = await page.textContent('.tab-count');
    expect(tabCount).toBeDefined();
  });
  
  test('should suspend tab when button clicked', async ({ page }) => {
    await page.goto(`chrome-extension://*/popup.html`);
    
    // Click suspend button on first tab
    await page.click('.suspend-button:first-child');
    
    // Verify visual feedback
    const statusMessage = await page.textContent('.status-message');
    expect(statusMessage).toContain('Tab suspended');
  });
});
```

---

Testing Content Scripts in Real Pages {#content-script-testing}

Content scripts run in the context of web pages, requiring special testing strategies to verify they work correctly with actual page content.

Setting Up Content Script Tests

```typescript
// tests/e2e/content-script.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Content Script Testing', () => {
  test('should inject into matching pages', async ({ page }) => {
    // Load a test page
    await page.goto('https://example.com');
    
    // The content script should have injected
    // Check for injected elements
    const injectedElement = await page.$('[data-extension-injected="true"]');
    expect(injectedElement).toBeTruthy();
  });
  
  test('should communicate with background script', async ({ page }) => {
    await page.goto('https://example.com');
    
    // Send message from content script
    const result = await page.evaluate(async () => {
      return new Promise((resolve) => {
        (window as any).chrome.runtime.sendMessage(
          { action: 'getTabInfo' },
          (response: any) => resolve(response)
        );
      });
    });
    
    expect(result).toHaveProperty('tabId');
  });
});
```

Injecting Content Scripts for Testing

For isolated testing, inject the content script manually:

```typescript
async function injectContentScript(page: Page, scriptPath: string) {
  await page.addScriptTag({ path: scriptPath });
}
```

---

Snapshot Testing UI Components {#snapshot-testing}

Snapshot testing captures the rendered output of UI components and compares them against saved snapshots, catching unintended changes.

Setting Up Snapshot Testing

For React-based extension UIs, use Jest or Vitest's snapshot testing:

```typescript
// tests/snapshots/popup-components.test.tsx
import { render } from '@testing-library/react';
import { PopupApp } from '../../src/popup/PopupApp';
import { expect, it, describe } from 'vitest';

describe('Popup UI Snapshots', () => {
  const mockTabs = [
    { id: 1, title: 'Google', url: 'https://google.com', active: true },
    { id: 2, title: 'GitHub', url: 'https://github.com', active: false }
  ];
  
  it('should render tab list correctly', () => {
    const { container } = render(<PopupApp tabs={mockTabs} />);
    expect(container).toMatchSnapshot();
  });
  
  it('should render empty state', () => {
    const { container } = render(<PopupApp tabs={[]} />);
    expect(container).toMatchSnapshot();
  });
});
```

Updating Snapshots

When intentional changes occur, update snapshots:

```bash
npx vitest update --snapshot
```

---

Code Coverage for Extensions {#code-coverage}

Measuring code coverage helps identify untested code paths and ensure comprehensive test coverage.

Configuring Coverage Reports

Update your Vitest configuration to enable coverage:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src//*.ts'],
      exclude: [
        'src//*.test.ts',
        'src//*.spec.ts',
        'src/types//*',
        'src//*.d.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
```

Running Coverage Reports

```bash
npx vitest run --coverage
```

Generate HTML coverage reports:

```bash
npx vitest run --coverage && npx serve coverage
```

---

Tab Suspender Pro Testing Strategy {#tab-suspender-testing}

Production extensions like Tab Suspender Pro require comprehensive testing strategies that address real-world usage scenarios.

Test Categories for Tab Suspender Pro

1. Inactivity Detection: Test that tabs are correctly identified as inactive after the configured timeout period.

2. Suspension Logic: Verify that eligible tabs (not pinned, not active, no audio playing) are suspended correctly.

3. Memory Management: Ensure suspended tabs release memory while maintaining restore capability.

4. Exclusion Rules: Test that domains in the exclusion list are never suspended.

5. User Interaction: Verify that user actions (clicks, keyboard shortcuts) correctly suspend or restore tabs.

Example Tab Suspender Pro Test

```typescript
// tests/unit/tab-suspender.test.ts
describe('Tab Suspender Pro - Core Logic', () => {
  const createMockTab = (overrides = {}) => ({
    id: 1,
    url: 'https://example.com',
    active: false,
    pinned: false,
    audible: false,
    ...overrides
  });
  
  it('should not suspend active tabs', () => {
    const activeTab = createMockTab({ active: true });
    const shouldSuspend = shouldSuspendTab(activeTab, []);
    expect(shouldSuspend).toBe(false);
  });
  
  it('should not suspend pinned tabs', () => {
    const pinnedTab = createMockTab({ pinned: true });
    const shouldSuspend = shouldSuspendTab(pinnedTab, []);
    expect(shouldSuspend).toBe(false);
  });
  
  it('should not suspend tabs with audio', () => {
    const audibleTab = createMockTab({ audible: true });
    const shouldSuspend = shouldSuspendTab(audibleTab, []);
    expect(shouldSuspend).toBe(false);
  });
  
  it('should not suspend excluded domains', () => {
    const githubTab = createMockTab({ url: 'https://github.com' });
    const shouldSuspend = shouldSuspendTab(githubTab, ['github.com']);
    expect(shouldSuspend).toBe(false);
  });
  
  it('should suspend eligible inactive tabs', () => {
    const eligibleTab = createMockTab();
    const shouldSuspend = shouldSuspendTab(eligibleTab, []);
    expect(shouldSuspend).toBe(true);
  });
});
```

---

CI Pipeline for Extension Testing {#ci-pipeline}

Automated testing in CI ensures every change is validated before deployment. See our [CI/CD Guide](/2025/01/18/chrome-extension-ci-cd-github-actions/) for complete setup instructions.

GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

Conclusion {#conclusion}

Building a comprehensive testing strategy for Chrome extensions requires understanding the unique architecture of extension-based applications. By implementing the testing pyramid, 70% unit tests, 20% integration tests, and 10% E2E tests, you achieve fast feedback loops while maintaining confidence in your extension's behavior.

Unit tests with Vitest and proper Chrome API mocking provide the foundation for rapid development. Integration tests verify that popup, background, and content scripts communicate correctly. E2E tests with Puppeteer and Playwright ensure your extension works in real browser environments.

For production extensions like Tab Suspender Pro, combine these testing approaches with specialized strategies that address your extension's specific functionality. Regular test execution in CI pipelines catches regressions early and enables confident deployments.

Remember that testing is an investment in code quality and user satisfaction. Well-tested extensions are more reliable, maintainable, and trustworthy. Implement these testing strategies today and ship extensions with confidence.

---

Related Articles:
- [CI/CD for Chrome Extensions with GitHub Actions](/2025/01/18/chrome-extension-ci-cd-github-actions/)
- [Extension Monetization Guide](/guides/extension-monetization/)
- [Tab Suspender Pro - Ultimate Guide](/2025/01/24/tab-suspender-pro-ultimate-guide/)

---

Built by theluckystrike at zovo.one
