---
layout: default
title: "Chrome Extension Playwright Testing. Developer Guide"
description: "Master Chrome extension debugging and testing with this guide covering tools, techniques, and common issues."
canonical_url: "https://bestchromeextensions.com/guides/extension-testing-with-playwright/"
last_modified_at: 2026-01-15
---
End-to-End Testing Chrome Extensions with Playwright

Overview {#overview}
Playwright provides powerful E2E testing capabilities for Chrome extensions. Unlike Puppeteer, Playwright offers better cross-browser support and improved API for handling extension contexts.

Setup: Launching Chromium with Extension {#setup-launching-chromium-with-extension}

Playwright can launch Chromium with your extension loaded using browser context arguments:

```ts
import { test, expect } from "@playwright/test";

async function launchWithExtension(extensionPath: string) {
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  return browser;
}
```

Getting Extension ID Programmatically {#getting-extension-id-programmatically}

To access extension pages, you need the extension ID. Get it from the service worker URL:

```ts
async function getExtensionId(browser: Browser): Promise<string> {
  const targets = browser.targets();
  const extensionTarget = targets.find(t => t.type() === "service_worker");
  const extensionUrl = extensionTarget?.url() || "";
  // URL format: chrome-extension://[id]/background_service_worker.js
  return extensionUrl.split("/")[2];
}
```

Testing Popup Pages {#testing-popup-pages}

Open the popup directly using the extension URL format:

```ts
test("popup displays current state", async ({ browser }) => {
  const extId = await getExtensionId(browser);
  const popupPage = await browser.newPage();
  
  await popupPage.goto(`chrome-extension://${extId}/popup.html`);
  
  // Interact with popup DOM
  await popupPage.click("#toggle-button");
  const status = await popupPage.textContent("#status");
  expect(status).toBe("Enabled");
  
  // Screenshot testing
  await expect(popupPage.locator("#root")).toHaveScreenshot("popup-enabled.png");
});
```

Testing Content Scripts {#testing-content-scripts}

Navigate to a target page and verify injected elements:

```ts
test("content script injects elements", async ({ page }) => {
  // Extension must be loaded via browser context first
  await page.goto("https://example.com");
  
  // Wait for content script to inject
  await page.waitForSelector(".extension-injected-button");
  
  // Verify injection
  const button = page.locator(".extension-injected-button");
  await button.click();
  
  // Verify state change
  await expect(page.locator(".extension-panel")).toBeVisible();
});
```

Testing Background/Service Worker {#testing-backgroundservice-worker}

Evaluate code directly in the service worker context:

```ts
test("background script handles messages", async ({ browser }) => {
  const extId = await getExtensionId(browser);
  
  // Create a page to communicate with background
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extId}/background.html`);
  
  // Evaluate in service worker context
  const bgPage = await browser.waitForTarget(
    t => t.type() === "service_worker" && t.url().includes(extId)
  );
  const bg = await bgPage.worker();
  
  // Test background function directly
  const result = await bg.evaluate(() => {
    // Access background scope
    return "Background evaluated";
  });
});
```

Testing Options Page {#testing-options-page}

Navigate to and interact with the options page:

```ts
test("options page saves settings", async ({ browser }) => {
  const extId = await getExtensionId(browser);
  const page = await browser.newPage();
  
  await page.goto(`chrome-extension://${extId}/options.html`);
  
  // Fill and save settings
  await page.fill("#api-key", "test-key-123");
  await page.click("#save-button");
  
  // Verify saved
  await expect(page.locator(".success-message")).toBeVisible();
});
```

Extension Test Fixture {#extension-test-fixture}

Create a reusable fixture for cleaner tests:

```ts
import { test as base } from "@playwright/test";

export const test = base.extend({
  extensionId: async ({ browser }, use) => {
    const extPath = path.resolve(__dirname, "./dist");
    await launchWithExtension(extPath);
    const id = await getExtensionId(browser);
    await use(id);
  },
});
```

CI Setup {#ci-setup}

Extensions require headful mode. Use xvfb on Linux:

```yaml
.github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx xvfb-maybe -- playwright test
        env:
          CI: "true"
```

Common Pitfalls {#common-pitfalls}

- Extension not loaded: Ensure `--disable-extensions-except` and `--load-extension` are both set
- Wrong extension ID: ID changes between builds; always fetch dynamically
- Timing issues: Wait for extension to initialize before testing
- Service worker termination: Use `--disable-backgrounding-occluded-windows` to prevent sleep

Related Guides {#related-guides}
- [Testing Extensions](testing-extensions.md)
- [CI/CD Pipeline](ci-cd-pipeline.md)
- [Chrome Extension Testing Strategies](chrome-extension-testing-strategies.md)

Related Articles {#related-articles}

Related Articles

- [Testing Strategies](../guides/chrome-extension-testing-strategies.md)
- [Puppeteer Testing](../guides/extension-testing-with-puppeteer.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
