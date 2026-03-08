---
layout: default
title: "Chrome Extension E2e Testing Patterns — Best Practices"
description: "End-to-end testing patterns for Chrome extensions."
---

# End-to-End Testing Patterns for Chrome Extensions

End-to-end testing for Chrome extensions presents unique challenges compared to standard web application testing. Extensions operate across multiple contexts -- popups, content scripts, service workers, and options pages -- each requiring distinct testing strategies. This guide covers eight essential patterns for building a reliable E2E test suite using Playwright, the tool best suited for extension testing due to its first-class Chromium support.

> **Related guides:** For unit and integration testing fundamentals, see [Testing Patterns](testing-patterns.md). For automating your test pipeline, see [CI/CD Pipeline](../guides/ci-cd-pipeline.md).

---

## Pattern 1: Playwright Setup for Extension Testing

Playwright supports loading Chrome extensions via its Chromium channel with persistent contexts. The key requirement is launching a browser instance with the extension pre-loaded.

### Installation and Configuration

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Base Test Configuration

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    browserName: "chromium",
  },
  projects: [
    {
      name: "extension",
      use: {
        // Extensions require a persistent context — see fixtures below
      },
    },
  ],
});
```

### Custom Fixture for Extension Context

```typescript
// e2e/fixtures.ts
import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const extensionPath = path.resolve(__dirname, "../dist");
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    const extensionId = background.url().split("/")[2];
    await use(extensionId);
  },
});

export const expect = test.expect;
```

The persistent context is mandatory because Chromium does not support extensions in standard browser contexts. The `extensionId` fixture extracts the runtime ID from the service worker URL, which you will need for navigating to extension pages.

---

## Pattern 2: Loading Unpacked Extension in Test Browser

Reliable extension loading requires a built distribution directory and careful argument handling. The extension must be fully built before tests run.

### Build-Then-Test Script

```json
{
  "scripts": {
    "test:e2e": "npm run build && playwright test",
    "test:e2e:ui": "npm run build && playwright test --ui"
  }
}
```

### Verifying the Extension Loaded

```typescript
// e2e/extension-loaded.spec.ts
import { test, expect } from "./fixtures";

test("extension loads successfully", async ({ context, extensionId }) => {
  // Verify the service worker is running
  const workers = context.serviceWorkers();
  expect(workers.length).toBeGreaterThan(0);

  // Verify extension pages are accessible
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page).not.toHaveTitle("");
});

test("manifest permissions are granted", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const permissions = await page.evaluate(() => {
    return chrome.permissions.getAll();
  });

  expect(permissions.permissions).toContain("storage");
});
```

### Handling Multiple Extension Builds

```typescript
// e2e/fixtures.ts — variant for dev vs prod builds
const extensionPath = path.resolve(
  __dirname,
  process.env.EXT_BUILD === "dev" ? "../dist-dev" : "../dist"
);
```

---

## Pattern 3: Testing Popup Interactions

Extension popups are standard HTML pages accessible at `chrome-extension://<id>/popup.html`. Unlike real popup behavior (which auto-closes on blur), navigating directly to the URL keeps the page stable for testing.

### Basic Popup Test

```typescript
// e2e/popup.spec.ts
import { test, expect } from "./fixtures";

test("popup renders with correct initial state", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(page.getByRole("heading")).toHaveText("My Extension");
  await expect(page.getByRole("button", { name: "Enable" })).toBeVisible();
});

test("popup toggle updates state", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const toggle = page.getByRole("switch", { name: "Active" });
  await expect(toggle).not.toBeChecked();

  await toggle.click();
  await expect(toggle).toBeChecked();

  // Verify state persisted to storage
  const stored = await page.evaluate(() =>
    chrome.storage.local.get("isActive")
  );
  expect(stored.isActive).toBe(true);
});
```

### Testing Popup-to-Background Communication

```typescript
test("popup sends message to service worker", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Click a button that triggers a message to the service worker
  await page.getByRole("button", { name: "Fetch Data" }).click();

  // Wait for the response to render
  await expect(page.getByTestId("data-container")).toHaveText(/loaded/i, {
    timeout: 5000,
  });
});
```

---

## Pattern 4: Testing Content Script Injection

Content scripts run in the context of web pages. Testing them requires navigating to a target page and verifying that the extension modifies the DOM as expected.

### Basic Content Script Test

```typescript
// e2e/content-script.spec.ts
import { test, expect } from "./fixtures";

test("content script injects UI into target page", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("https://example.com");

  // Wait for the content script to inject its elements
  const injectedElement = page.locator("#my-extension-root");
  await expect(injectedElement).toBeVisible({ timeout: 5000 });
});

test("content script does not inject on non-matching URLs", async ({
  context,
}) => {
  const page = await context.newPage();
  await page.goto("https://not-a-target-site.com");

  const injectedElement = page.locator("#my-extension-root");
  await expect(injectedElement).not.toBeVisible();
});
```

### Using a Local Test Server

```typescript
// e2e/fixtures.ts — add a local server for controlled testing
import { createServer } from "http";

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  testServer: { url: string; close: () => void };
}>({
  // ...context and extensionId fixtures as before
  testServer: async ({}, use) => {
    const server = createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body><h1>Test Page</h1></body></html>");
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    await use({ url: `http://localhost:${port}`, close: () => server.close() });
    server.close();
  },
});
```

### Testing Content Script Isolation

```typescript
test("content script does not leak into page scope", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("https://example.com");

  // Evaluate in the page's main world — extension globals should not exist
  const hasLeak = await page.evaluate(() => {
    return typeof (window as any).__myExtensionInternal !== "undefined";
  });
  expect(hasLeak).toBe(false);
});
```

---

## Pattern 5: Testing Service Worker Messaging

Service worker tests verify that the background script responds correctly to runtime messages from popups, content scripts, and other extension pages.

### Direct Message Testing

```typescript
// e2e/service-worker.spec.ts
import { test, expect } from "./fixtures";

test("service worker responds to getData message", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const response = await page.evaluate(() => {
    return chrome.runtime.sendMessage({ type: "GET_DATA", key: "settings" });
  });

  expect(response).toHaveProperty("success", true);
  expect(response.data).toBeDefined();
});

test("service worker handles unknown message types gracefully", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const response = await page.evaluate(() => {
    return chrome.runtime.sendMessage({ type: "NONEXISTENT_ACTION" });
  });

  expect(response).toHaveProperty("error");
});
```

### Testing Event-Driven Behavior

```typescript
test("service worker handles tab update events", async ({ context }) => {
  // Open a page — this triggers onUpdated in the service worker
  const page = await context.newPage();
  await page.goto("https://example.com");

  // Verify the service worker processed the event
  // by checking a side effect (e.g., badge text update)
  const badgeText = await page.evaluate(async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    return chrome.action.getBadgeText({ tabId: tab.id });
  });

  expect(badgeText).toBe("ON");
});
```

---

## Pattern 6: Testing chrome.storage Operations

Storage is the backbone of most extension state management. These tests verify reads, writes, and change listeners behave correctly across contexts.

### Storage CRUD Operations

```typescript
// e2e/storage.spec.ts
import { test, expect } from "./fixtures";

test("stores and retrieves data from chrome.storage.local", async ({
  context,
  extensionId,
}) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Write
  await page.evaluate(() => {
    return chrome.storage.local.set({ testKey: "testValue" });
  });

  // Read
  const result = await page.evaluate(() => {
    return chrome.storage.local.get("testKey");
  });

  expect(result.testKey).toBe("testValue");
});

test("storage.onChanged fires across contexts", async ({
  context,
  extensionId,
}) => {
  // Open popup and options page
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);

  // Set up a change listener on the options page
  await options.evaluate(() => {
    (window as any).__storageChanges = [];
    chrome.storage.onChanged.addListener((changes) => {
      (window as any).__storageChanges.push(changes);
    });
  });

  // Write from popup
  await popup.evaluate(() => {
    return chrome.storage.local.set({ crossContextKey: "fromPopup" });
  });

  // Verify options page received the change
  await options.waitForFunction(() => {
    return (window as any).__storageChanges.length > 0;
  });

  const changes = await options.evaluate(
    () => (window as any).__storageChanges
  );
  expect(changes[0].crossContextKey.newValue).toBe("fromPopup");
});
```

### Testing Storage Quotas

```typescript
test("handles storage quota errors", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const error = await page.evaluate(async () => {
    const largeData = "x".repeat(10 * 1024 * 1024); // 10MB
    try {
      await chrome.storage.local.set({ huge: largeData });
      return null;
    } catch (e: any) {
      return e.message;
    }
  });

  expect(error).toContain("QUOTA_BYTES");
});
```

---

## Pattern 7: CI/CD Integration with Headless Chrome

Running extension E2E tests in CI requires special configuration since extensions cannot run in fully headless mode (as of Chromium 129+, `--headless=new` does support extensions in some configurations, but the classic approach uses `xvfb`).

### GitHub Actions Configuration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install chromium --with-deps

      - name: Build extension
        run: npm run build

      - name: Run E2E tests
        run: xvfb-run --auto-servernum npm run test:e2e

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

### Playwright CI Configuration

```typescript
// playwright.config.ts — CI-aware settings
import { defineConfig } from "@playwright/test";

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html"], ["github"]] : [["html"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
```

### Xvfb Wrapper for Local Linux Testing

```json
{
  "scripts": {
    "test:e2e:ci": "xvfb-run --auto-servernum playwright test",
    "test:e2e:local": "playwright test --headed"
  }
}
```

On macOS and Windows, `xvfb` is unnecessary. Playwright handles the display server natively. Guard your scripts accordingly:

```bash
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xvfb-run --auto-servernum npx playwright test
else
  npx playwright test
fi
```

---

## Pattern 8: Visual Regression Testing for Extension UI

Visual regression testing catches unintended UI changes in popups, options pages, and injected content script elements. Playwright's built-in screenshot comparison makes this straightforward.

### Snapshot Testing for Popup UI

```typescript
// e2e/visual.spec.ts
import { test, expect } from "./fixtures";

test("popup matches visual snapshot", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  // Wait for all async rendering to complete
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot("popup-default.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("popup dark mode matches snapshot", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot("popup-dark-mode.png", {
    maxDiffPixelRatio: 0.01,
  });
});
```

### Component-Level Visual Tests

```typescript
test("settings panel matches snapshot", async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);

  const settingsPanel = page.getByTestId("settings-panel");
  await expect(settingsPanel).toHaveScreenshot("settings-panel.png");
});
```

### Updating Baselines

When intentional UI changes are made, update the reference screenshots:

```bash
npx playwright test --update-snapshots
```

### Multi-Resolution Testing

```typescript
const viewports = [
  { width: 400, height: 600, name: "popup" },
  { width: 800, height: 600, name: "sidepanel" },
  { width: 1024, height: 768, name: "options" },
];

for (const vp of viewports) {
  test(`UI renders correctly at ${vp.name} size`, async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(page).toHaveScreenshot(`ui-${vp.name}.png`, {
      maxDiffPixelRatio: 0.02,
    });
  });
}
```

---

## Summary

| Pattern | Key Technique | Primary Use Case |
|---|---|---|
| Playwright setup | Persistent context + `--load-extension` | Foundation for all extension E2E tests |
| Loading unpacked | Build-then-test pipeline | Ensuring test targets match production |
| Popup interactions | Navigate to `chrome-extension://` URL | Testing popup UI and user flows |
| Content script injection | Navigate to target page, assert DOM changes | Verifying page modifications |
| Service worker messaging | `chrome.runtime.sendMessage` in `evaluate` | Testing background logic |
| Storage operations | `chrome.storage` API in `evaluate` | Verifying state persistence |
| CI/CD integration | `xvfb-run` + Playwright CI config | Automated testing in pipelines |
| Visual regression | `toHaveScreenshot` assertions | Catching unintended UI changes |

These patterns compose naturally. A typical test suite combines popup interaction tests with storage verification and visual snapshots, all running through the same Playwright persistent context fixture. Start with the fixture setup in Pattern 1, verify loading in Pattern 2, then layer on the patterns that match your extension's architecture.
