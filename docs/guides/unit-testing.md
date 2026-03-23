---
layout: default
title: "Chrome Extension Unit Testing — How to Test With Jest and Puppeteer"
description: "A comprehensive guide to unit testing Chrome extensions using Jest, Vitest, and Puppeteer. Learn testing patterns, mocking Chrome APIs, and best practices."
canonical_url: "https://bestchromeextensions.com/guides/unit-testing/"
---

# Chrome Extension Unit Testing — How to Test With Jest and Puppeteer

Unit testing is the foundation of reliable Chrome extension development. Unlike traditional web applications, extensions run across multiple execution contexts—background service workers, popup pages, content scripts, and options pages—each with unique API access patterns and lifecycle behaviors. This guide covers how to test your extension code effectively using Jest, Vitest, and Puppeteer.

## Why Unit Testing Matters for Extensions {#why-unit-testing-matters}

Chrome extensions present unique testing challenges that you won't encounter in regular web development. Your code interacts with the Chrome Extension APIs, manages state across different contexts, and must handle edge cases like API rate limiting, permission changes, and runtime errors. Without proper unit tests, regressions can slip into production and break functionality for millions of users.

Unit tests catch bugs early, document expected behavior, and give you confidence when refactoring code. For extensions that interact with sensitive user data or modify browser behavior, comprehensive test coverage isn't optional—it's essential for maintaining user trust.

## Setting Up Your Testing Environment {#setting-up-your-testing-environment}

### Choosing Your Test Runner {#choosing-your-test-runner}

Two main test runners dominate the Chrome extension testing landscape: **Jest** and **Vitest**. Both are excellent choices, but they have distinct characteristics:

| Feature | Jest | Vitest |
|---------|------|--------|
| Speed | Fast | Extremely fast (Vite-powered) |
| TypeScript Support | Requires extra config | Native |
| ESM Support | Complex setup | Native |
| Chrome API Mocking | Manual or jest-chrome | Vitest-chrome |
| Learning Curve | Lower | Slightly higher |

For new projects, Vitest offers superior performance and modern ESM support. However, Jest remains popular with teams familiar with its API and extensive ecosystem.

### Installing Dependencies {#installing-dependencies}

```bash
# For Vitest (recommended for new projects)
npm install -D vitest jsdom @vitest/coverage-v8

# For Jest
npm install -D jest jest-environment-jsdom ts-jest @types/jest
```

### Configuring Vitest for Extensions {#configuring-vitest-for-extensions}

Create a `vitest.config.ts` file in your project root:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

## Mocking Chrome Extension APIs {#mocking-chrome-extension-apis}

The most challenging aspect of testing extensions is mocking Chrome's runtime and storage APIs. These APIs don't exist in Node.js environments, so you must provide mocks that simulate their behavior.

### Creating Chrome API Mocks {#creating-chrome-api-mocks}

Create a test setup file that provides mock implementations:

```typescript
// test/setup.ts
import { vi, beforeEach, afterEach } from "vitest";

// Mock chrome.runtime API
const mockRuntime = {
  id: "test-extension-id",
  getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  getManifest: vi.fn(() => ({
    manifest_version: 3,
    name: "Test Extension",
    version: "1.0.0",
  })),
};

// Mock chrome.storage API
const mockStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
  sync: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
};

// Mock chrome.tabs API
const mockTabs = {
  query: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

// Assign to global chrome object
Object.defineProperty(global, "chrome", {
  value: {
    runtime: mockRuntime,
    storage: mockStorage,
    tabs: mockTabs,
  },
  writable: true,
});
```

### Mocking with Chrome API Mock Library {#mocking-with-chrome-api-mock-library}

For more comprehensive mocking, use the `chrome-api-mock` package:

```bash
npm install -D @theluckystrike/chrome-api-mock
```

Then update your setup:

```typescript
// test/setup.ts
import { setupChromeMocks } from "@theluckystrike/chrome-api-mock";
import { vi } from "vitest";

setupChromeMocks();

// Customize specific mocks as needed
vi.mock("chrome.storage.local.get", () => ({
  then: (fn: Function) => fn({ setting: "value" }),
}));
```

## Writing Your First Unit Test {#writing-your-first-unit-test}

Now let's write actual tests for extension code. Consider this utility function:

```typescript
// src/utils/message-parser.ts
interface ParsedMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

export function parseMessage(data: string): ParsedMessage {
  try {
    const parsed = JSON.parse(data);
    if (!parsed.type || !parsed.payload) {
      throw new Error("Invalid message format");
    }
    return {
      type: parsed.type,
      payload: parsed.payload,
      timestamp: Date.now(),
    };
  } catch (error) {
    throw new Error(`Failed to parse message: ${error.message}`);
  }
}
```

Here's how to test it:

```typescript
// src/utils/message-parser.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseMessage } from "./message-parser";

describe("parseMessage", () => {
  it("should parse valid JSON message", () => {
    const input = JSON.stringify({
      type: "GREETING",
      payload: { message: "Hello!" },
    });

    const result = parseMessage(input);

    expect(result.type).toBe("GREETING");
    expect(result.payload).toEqual({ message: "Hello!" });
    expect(result.timestamp).toBeDefined();
  });

  it("should throw on invalid JSON", () => {
    expect(() => parseMessage("not valid json")).toThrow();
  });

  it("should throw on missing type field", () => {
    const input = JSON.stringify({ payload: { data: 123 } });
    expect(() => parseMessage(input)).toThrow("Invalid message format");
  });
});
```

## Testing Background Service Workers {#testing-background-service-workers}

Background service workers present unique testing challenges because they handle events from Chrome and communicate with other extension contexts.

### Testing Event Handlers {#testing-event-handlers}

```typescript
// src/background/commands.ts
import { sendToContentScript } from "./messaging";

chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case "toggle-feature":
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await sendToContentScript(tab.id, { action: "toggle" });
      }
      break;
  }
});
```

Test the command handler:

```typescript
// src/background/commands.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupChromeMocks } from "@theluckystrike/chrome-api-mock";

describe("Background Commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle toggle-feature command", async () => {
    // Import after mocks are set up
    const { handleCommand } = await import("./commands");
    
    // Mock chrome.tabs.query
    const mockTab = { id: 123, active: true };
    chrome.tabs.query.mockResolvedValue([mockTab]);
    
    // Execute the handler
    await handleCommand("toggle-feature");
    
    // Verify the message was sent
    expect(chrome.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
  });
});
```

## Integration Testing with Puppeteer {#integration-testing-with-puppeteer}

While unit tests verify isolated logic, integration tests verify that your extension works correctly when loaded in a real browser. Puppeteer provides the most reliable way to test extension behavior in Chrome.

### Setting Up Puppeteer for Extension Testing {#setting-up-puppeteer-for-extension-testing}

```bash
npm install -D puppeteer
```

### Loading and Testing Your Extension {#loading-and-testing-your-extension}

```typescript
// test/e2e/extension-load.test.ts
import { describe, it, expect } from "@vitest/node";
import puppeteer, { Browser } from "puppeteer";
import path from "path";

describe("Extension Integration Tests", () => {
  let browser: Browser;

  beforeEach(async () => {
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${path.resolve(__dirname, "../../dist")}`,
        `--load-extension=${path.resolve(__dirname, "../../dist")}`,
      ],
    });
  });

  afterEach(async () => {
    await browser.close();
  });

  it("should load popup and display content", async () => {
    const page = await browser.newPage();
    
    // Open the extension popup
    await page.goto("chrome-extension://<YOUR-EXTENSION-ID>/popup.html");
    
    // Wait for content to load
    await page.waitForSelector("#app");
    
    // Verify content
    const title = await page.$eval("h1", (el) => el.textContent);
    expect(title).toBe("My Extension");
  });
});
```

## Best Practices for Extension Testing {#best-practices-for-extension-testing}

Follow these guidelines to maintain testable, reliable extension code:

1. **Separate business logic from Chrome API calls** — Extract pure functions that don't depend on chrome.* APIs. These are easiest to test.

2. **Use dependency injection** — Pass Chrome APIs as parameters or use a service layer, making it easy to swap real APIs with mocks.

3. **Test across contexts** — Verify that your content scripts, background scripts, and popup all work correctly independently and together.

4. **Mock network requests carefully** — Use tools like MSW (Mock Service Worker) to intercept fetch/XHR calls in your tests.

5. **Include edge cases** — Test what happens when APIs fail, when storage is full, or when permissions are denied.

## Tool Comparison Summary {#tool-comparison-summary}

| Use Case | Recommended Tool |
|----------|-------------------|
| Unit testing pure logic | Vitest or Jest |
| Testing Chrome API interactions | @theluckystrike/chrome-api-mock |
| Integration testing extension UI | Puppeteer |
| E2E testing full user flows | Playwright |
| Snapshot testing | Jest or Vitest |
| Performance testing | Chrome DevTools Protocol |

## Conclusion {#conclusion}

Unit testing Chrome extensions requires additional setup compared to web applications, but the investment pays off in code quality and reliability. By properly mocking Chrome APIs, separating concerns in your code, and using the right testing tools, you can achieve comprehensive test coverage that catches bugs before they reach your users.

Start with Vitest for fast, modern unit tests, add Puppeteer for integration testing, and build a test suite that gives you confidence in your extension's quality.
