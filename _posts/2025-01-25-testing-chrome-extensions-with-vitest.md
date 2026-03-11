---
layout: post
title: "Testing Chrome Extensions with Vitest: Fast & Modern Testing Guide"
description: "Learn how to test Chrome extensions using Vitest, the blazing fast testing framework. This comprehensive guide covers setup, mocking Chrome APIs, content script testing, service worker testing, and best practices for lightning-fast extension testing."
date: 2025-01-25
categories: [Chrome-Extensions, Testing]
tags: [chrome-extension, testing, tooling]
keywords: "vitest chrome extension, vitest extension test, fast extension testing, vitest chrome api mock, chrome extension unit testing vitest"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/25/testing-chrome-extensions-with-vitest/"
---

# Testing Chrome Extensions with Vitest: Fast & Modern Testing Guide

When it comes to testing Chrome extensions, developers have traditionally relied on Jest as the default testing framework. However, Vitest has emerged as a powerful alternative that offers significantly faster execution times, better TypeScript support out of the box, and a more modern developer experience. If you are building Chrome extensions in 2025 and have not yet explored Vitest, you are missing out on a testing experience that can dramatically improve your development workflow and reduce the time waiting for tests to complete.

This comprehensive guide will walk you through everything you need to know about testing Chrome extensions with Vitest. We will cover the fundamental reasons why Vitest is an excellent choice for extension testing, walk through the complete setup process, explore various testing scenarios including content scripts, service workers, and background scripts, and discuss advanced techniques for mocking Chrome APIs. By the end of this guide, you will have a complete understanding of how to implement a robust testing strategy for your Chrome extensions using Vitest.

---

## Why Choose Vitest for Chrome Extension Testing {#why-vitest}

The Chrome extension development ecosystem has evolved significantly, and with it, the expectations for testing frameworks have changed. Vitest, created by the same team behind Vite, brings several compelling advantages that make it particularly well-suited for testing Chrome extensions.

### Blazing Fast Test Execution

The most immediately noticeable benefit of Vitest is its exceptional speed. Unlike Jest, which runs in a Node.js environment and requires transformation of modern JavaScript syntax, Vitest leverages Vite's native ESM support and on-demand compilation. This means your tests start almost instantly and run significantly faster. For Chrome extension developers who frequently run tests during development, this speed difference can save hours of cumulative wait time over the course of a project. In our testing, Vitest consistently runs tests two to five times faster than Jest, depending on the complexity of the test suite.

### Native TypeScript Support

Chrome extension development increasingly relies on TypeScript for better type safety and maintainability. Vitest provides first-class TypeScript support without requiring additional configuration or plugins. You can write your tests in TypeScript directly, and Vitest will handle the type checking and compilation seamlessly. This integration extends to type inference for mocks and fixtures, making your test code as type-safe as your production code.

### Hot Module Replacement

During test development, the ability to see results quickly is crucial. Vitest supports HMR (Hot Module Replacement) for test files, meaning you can modify a test and see the results immediately without waiting for a full test rerun. This feature is particularly valuable when debugging failing tests or experimenting with different test scenarios.

### Jest-Compatible API

If you are currently using Jest, the transition to Vitest is remarkably smooth. Vitest provides a Jest-compatible API, meaning most of your existing test code will work with minimal or no modifications. The familiar `describe`, `it`, `expect`, `beforeEach`, and `afterEach` functions work exactly as you would expect. This compatibility extends to most Jest-specific matchers and utilities, making the learning curve minimal for teams already familiar with Jest.

---

## Setting Up Vitest for Chrome Extensions {#setup}

Setting up Vitest for Chrome extension testing requires careful configuration to handle the unique aspects of extension architecture. Let us walk through the complete setup process step by step.

### Installing Dependencies

First, create a new directory for your extension or navigate to an existing project. If you are starting from scratch, initialize a new npm project and install the necessary dependencies:

```bash
npm init -y
npm install --save-dev vitest @vitest/ui jsdom
npm install --save-dev webextensions-polyfill
```

The `webextensions-polyfill` package provides compatibility between the Firefox and Chrome extension APIs, making your code more portable. The `jsdom` environment is essential for simulating browser globals that your extension code expects.

### Configuring Vitest

Create a `vitest.config.ts` file in your project root with the following configuration:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts}'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

The `environment: 'jsdom'` setting is crucial as it provides the DOM APIs that Chrome extensions expect. The `setupFiles` option allows you to define global mocks and configurations that apply to all tests.

### Creating the Setup File

Create a `vitest.setup.ts` file to configure global mocks and prepare the test environment:

```typescript
import { beforeAll, vi } from 'vitest';

// Mock Chrome API
const chrome = {
  runtime: {
    id: 'test-extension-id',
    getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getManifest: () => ({
      manifest_version: 3,
      name: 'Test Extension',
      version: '1.0.0',
    }),
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    get: vi.fn(),
  },
};

globalThis.chrome = chrome as any;

// Mock fetch for extension API calls
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({}),
} as Response);
```

This setup file provides a basic mock of the Chrome API that you can expand based on your extension's specific needs. The mocks are implemented using Vitest's `vi.fn()` which allows you to assert on mock calls and configure return values.

---

## Testing Content Scripts with Vitest {#content-scripts}

Content scripts run in the context of web pages and have unique testing requirements. They interact with the DOM, communicate with the extension's background scripts, and must handle various page states gracefully. Let us explore how to test content scripts effectively using Vitest.

### Setting Up Content Script Tests

Create a test file for your content script:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Content Script: Page Analyzer', () => {
  beforeEach(() => {
    // Reset DOM between tests
    document.body.innerHTML = '';
  });

  it('should detect headings on the page', () => {
    document.body.innerHTML = `
      <h1>Main Title</h1>
      <h2>Subtitle</h2>
      <p>Some paragraph text</p>
    `;

    // Import your content script function
    const { analyzePage } = require('./content-script');

    const result = analyzePage();

    expect(result.headingCount).toBe(2);
    expect(result.headings).toContain('Main Title');
    expect(result.headings).toContain('Subtitle');
  });

  it('should handle empty pages gracefully', () => {
    const { analyzePage } = require('./content-script');

    const result = analyzePage();

    expect(result.headingCount).toBe(0);
    expect(result.headings).toEqual([]);
  });

  it('should send message to background script', () => {
    document.body.innerHTML = '<h1>Test</h1>';

    const { analyzeAndReport } = require('./content-script');
    analyzeAndReport();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'PAGE_ANALYSIS',
      data: expect.objectContaining({
        headingCount: 1,
      }),
    });
  });
});
```

### Testing DOM Manipulation

Content scripts frequently manipulate the DOM to add UI elements or modify page content. Here is how to test these interactions:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Content Script: DOM Manipulation', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('should inject a toolbar into the page', () => {
    const { injectToolbar } = require('./content-script');

    injectToolbar();

    const toolbar = document.querySelector('.extension-toolbar');
    expect(toolbar).not.toBeNull();
    expect(toolbar?.textContent).toContain('Extension Tools');
  });

  it('should apply correct styles to injected elements', () => {
    const { injectToolbar } = require('./content-script');

    injectToolbar();

    const toolbar = document.querySelector('.extension-toolbar');
    const styles = window.getComputedStyle(toolbar as Element);

    expect(styles.position).toBe('fixed');
    expect(styles.zIndex).toBe('999999');
  });

  it('should handle multiple injections without duplication', () => {
    const { injectToolbar } = require('./content-script');

    injectToolbar();
    injectToolbar();

    const toolbars = document.querySelectorAll('.extension-toolbar');
    expect(toolbars).toHaveLength(1);
  });
});
```

---

## Testing Service Workers and Background Scripts {#service-workers}

Service workers in Manifest V3 extensions run in a special background context and handle events like alarms, messages, and browser notifications. Testing these requires careful handling of Chrome's event-based API.

### Mocking Service Worker Events

Service workers use event-driven architecture, which presents unique testing challenges:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Service Worker: Message Handler', () => {
  let messageHandler: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Import the message handler module
    messageHandler = require('./background/message-handler');
  });

  it('should handle incoming messages correctly', async () => {
    const mockSendResponse = vi.fn();

    const message = {
      type: 'FETCH_DATA',
      payload: { url: 'https://api.example.com/data' },
    };

    await messageHandler.handleMessage(message, {} as any, mockSendResponse);

    expect(fetch).toHaveBeenCalledWith('https://api.example.com/data');
    expect(mockSendResponse).toHaveBeenCalled();
  });

  it('should respond with error for unknown message types', async () => {
    const mockSendResponse = vi.fn();

    const message = {
      type: 'UNKNOWN_ACTION',
      payload: {},
    };

    await messageHandler.handleMessage(message, {} as any, mockSendResponse);

    expect(mockSendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unknown message type' })
    );
  });
});
```

### Testing Alarm Handlers

Chrome alarms are commonly used in extensions for scheduled tasks:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Service Worker: Alarm Handler', () => {
  let alarmHandler: any;

  beforeEach(() => {
    vi.clearAllMocks();
    alarmHandler = require('./background/alarm-handler');
  });

  it('should refresh data when alarm fires', async () => {
    const mockAlarm = {
      name: 'data-refresh',
      scheduledTime: Date.now(),
    };

    await alarmHandler.handleAlarm(mockAlarm);

    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  it('should handle different alarm types', async () => {
    const notificationAlarm = {
      name: 'send-notification',
      scheduledTime: Date.now(),
    };

    await alarmHandler.handleAlarm(notificationAlarm);

    // Verify notification was created
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SHOW_NOTIFICATION',
      })
    );
  });
});
```

---

## Advanced Mocking Strategies {#advanced-mocking}

As your extension grows more complex, you will need sophisticated mocking strategies to handle the full range of Chrome APIs and external dependencies.

### Creating a Comprehensive Chrome Mock

For larger projects, consider creating a dedicated mock factory:

```typescript
// tests/__mocks__/chrome.ts
import { vi } from 'vitest';

export function createChromeMock(overrides = {}) {
  const defaultMocks = {
    runtime: {
      id: 'test-extension-id',
      getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
      onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
        hasListener: vi.fn().mockReturnValue(false),
      },
      getManifest: () => ({
        manifest_version: 3,
        name: 'Test Extension',
        version: '1.0.0',
        permissions: [],
      }),
      lastError: null,
    },
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      },
      sync: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
      remove: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue({}),
    },
    scripting: {
      executeScript: vi.fn().mockResolvedValue([{ frameId: 0 }]),
      insertCSS: vi.fn().mockResolvedValue([{ frameId: 0 }]),
    },
    alarms: {
      create: vi.fn(),
      clear: vi.fn().mockResolvedValue({ wasCleared: true }),
      get: vi.fn().mockResolvedValue(null),
      onAlarm: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    notifications: {
      create: vi.fn().mockResolvedValue('notification-id'),
      clear: vi.fn().mockResolvedValue(true),
    },
  };

  return { ...defaultMocks, ...overrides };
}
```

Use this factory in your setup file or individual test files to create customized Chrome API mocks:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChromeMock } from '../__mocks__/chrome';

describe('Advanced Mocking Example', () => {
  beforeEach(() => {
    const customChrome = createChromeMock({
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ setting: true }),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    });

    globalThis.chrome = customChrome as any;
  });

  it('should use custom mocked storage', async () => {
    const { getSetting } = require('./storage-helper');

    const result = await getSetting('setting');
    expect(result).toBe(true);
  });
});
```

---

## Testing Extension Utility Functions {#utilities}

Many extensions contain pure utility functions that are easy to test and form the backbone of your extension's logic. These are ideal candidates for Vitest testing.

```typescript
import { describe, it, expect } from 'vitest';

describe('Utility: URL Parser', () => {
  const { parseUrl, extractDomain, isValidUrl } = require('../utils/url-parser');

  it('should correctly parse URLs', () => {
    const result = parseUrl('https://example.com/path?query=value#hash');

    expect(result.protocol).toBe('https:');
    expect(result.hostname).toBe('example.com');
    expect(result.pathname).toBe('/path');
    expect(result.search).toBe('?query=value');
  });

  it('should extract domain correctly', () => {
    expect(extractDomain('https://www.example.com/page'))
      .toBe('example.com');
    expect(extractDomain('https://sub.domain.example.com/page'))
      .toBe('example.com');
  });

  it('should validate URLs correctly', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });
});

describe('Utility: Data Formatter', () => {
  const { formatBytes, formatDate, truncateText } = require('../utils/formatters');

  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('should truncate text with ellipsis', () => {
    expect(truncateText('Hello World', 5)).toBe('Hello...');
    expect(truncateText('Hi', 10)).toBe('Hi');
    expect(truncateText('', 5)).toBe('');
  });
});
```

---

## Integration Testing with Vitest {#integration}

Integration tests verify that different parts of your extension work together correctly. For Chrome extensions, this often involves testing communication between content scripts and background scripts.

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Integration: Content Script to Background Communication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send message from content script to background', async () => {
    const { sendToBackground } = require('./content-script');

    await sendToBackground({ type: 'GET_CONFIG' });

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'GET_CONFIG',
      })
    );
  });

  it('should handle background response', async () => {
    const mockResponse = { theme: 'dark', language: 'en' };
    (chrome.runtime.sendMessage as any).mockResolvedValueOnce(mockResponse);

    const { fetchConfig } = require('./content-script');

    const result = await fetchConfig();

    expect(result).toEqual(mockResponse);
  });
});
```

---

## Running Tests Effectively {#running-tests}

Now that you have your tests set up, let us explore how to run them effectively and integrate them into your development workflow.

### Configuring npm Scripts

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:watch": "vitest --watch"
  }
}
```

Run tests in watch mode during development for instant feedback:

```bash
npm test -- --watch
```

Run tests with coverage reporting:

```bash
npm run test:coverage
```

Use the Vitest UI for visual test exploration:

```bash
npm run test:ui
```

---

## Best Practices for Extension Testing {#best-practices}

Following established best practices ensures your test suite remains maintainable and valuable throughout your extension's lifecycle.

### Organize Tests Close to Source

Keep test files alongside the code they test. This makes it easier to find and update tests when code changes:

```
src/
  content-script.ts
  content-script.test.ts
  background/
    handler.ts
    handler.test.ts
  utils/
    parser.ts
    parser.test.ts
```

### Use Descriptive Test Names

Write test names that clearly describe what is being tested and what the expected outcome is:

```typescript
// Good
it('should save user preferences to local storage', async () => {
  // ...
});

// Bad
it('should work', async () => {
  // ...
});
```

### Test Edge Cases

Do not just test the happy path. Include tests for error conditions, empty inputs, and unusual scenarios:

```typescript
it('should handle network errors gracefully', async () => {
  (fetch as any).mockRejectedValueOnce(new Error('Network error'));

  const result = await fetchData();

  expect(result).toEqual({ error: 'Network error' });
  expect(chrome.storage.local.set).toHaveBeenCalledWith(
    expect.objectContaining({ lastError: 'Network error' })
  );
});
```

### Keep Tests Independent

Each test should be able to run in isolation. Avoid relying on execution order or shared state between tests:

```typescript
describe('User Preferences', () => {
  beforeEach(() => {
    // Reset state before each test
    chrome.storage.local.get.mockResolvedValue({});
    chrome.storage.local.set.mockResolvedValue(undefined);
  });

  it('should save theme preference', async () => {
    await savePreference('theme', 'dark');
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark' })
    );
  });

  it('should save language preference', async () => {
    await savePreference('language', 'en');
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'en' })
    );
  });
});
```

---

## Conclusion {#conclusion}

Testing Chrome extensions with Vitest offers a modern, fast, and developer-friendly experience that significantly improves upon traditional testing approaches. The framework's speed advantages alone make it worth the switch, but its native TypeScript support, HMR capabilities, and Jest-compatible API make it an exceptional choice for extension developers.

In this guide, we covered the essential aspects of setting up Vitest for Chrome extension testing, from basic configuration to advanced mocking strategies. We explored how to test content scripts, service workers, utility functions, and integration scenarios. We also discussed best practices that will help you maintain a robust and reliable test suite as your extension grows.

The key takeaways are straightforward: Vitest provides the speed and modern features that Chrome extension development needs, proper mocking of Chrome APIs is essential for meaningful tests, organizing tests alongside source code improves maintainability, and comprehensive testing of edge cases ensures your extension works reliably in production.

Start implementing Vitest in your Chrome extension projects today and experience the difference that fast, modern testing can make in your development workflow.
