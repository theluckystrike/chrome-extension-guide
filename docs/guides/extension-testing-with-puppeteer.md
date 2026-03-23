---
layout: default
title: "Chrome Extension Puppeteer Testing. Developer Guide"
description: "Master Chrome extension debugging and testing with this guide covering tools, techniques, and common issues."
canonical_url: "https://bestchromeextensions.com/guides/extension-testing-with-puppeteer/"
---
End-to-End Testing Chrome Extensions with Puppeteer

Overview {#overview}

Puppeteer provides direct control over Chromium, making it a solid choice for testing Chrome extensions. While Playwright offers better cross-browser support, Puppeteer's tight Chromium integration provides reliable extension testing capabilities.

Setup: Launching Chromium with Extension {#setup-launching-chromium-with-extension}

Launch Chromium with your extension loaded using the `--disable-extensions-except` and `--load-extension` arguments:

```javascript
const puppeteer = require("puppeteer");

async function launchWithExtension(extensionPath) {
  const browser = await puppeteer.launch({
    headless: false, // Extensions don't load in headless mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  return browser;
}
```

Getting Extension ID Programmatically {#getting-extension-id-programmatically}

To access extension pages, you need the extension ID. Retrieve it from the background service worker target:

```javascript
async function getExtensionId(browser) {
  const targets = browser.targets();
  const extensionTarget = targets.find(
    (t) => t.type() === "service_worker" && t.url().includes("chrome-extension://")
  );
  const extensionUrl = extensionTarget?.url() || "";
  // URL format: chrome-extension://[id]/background_service_worker.js
  return extensionUrl.split("/")[2];
}
```

Testing Popup Pages {#testing-popup-pages}

Open the popup directly using the extension URL scheme:

```javascript
test("popup displays current state", async () => {
  const browser = await launchWithExtension("./dist");
  const extId = await getExtensionId(browser);
  const popupPage = await browser.newPage();

  await popupPage.goto(`chrome-extension://${extId}/popup.html`);

  // Interact with popup DOM
  await popupPage.click("#toggle-button");
  const status = await popupPage.$eval("#status", (el) => el.textContent);
  expect(status).toBe("Enabled");

  await popupPage.screenshot({ path: "popup-enabled.png" });
});
```

Testing Content Scripts {#testing-content-scripts}

Navigate to a target page and verify injected elements:

```javascript
test("content script injects elements", async () => {
  const browser = await launchWithExtension("./dist");
  const page = await browser.newPage();

  await page.goto("https://example.com");

  // Wait for content script to inject
  await page.waitForSelector(".extension-injected-button");

  // Verify injection
  await page.click(".extension-injected-button");
  await page.waitForSelector(".extension-panel", { visible: true });
});
```

Testing Background Service Worker {#testing-background-service-worker}

Access the service worker target directly:

```javascript
async function getBackgroundPage(browser) {
  const targets = browser.targets();
  const swTarget = targets.find(
    (t) => t.type() === "service_worker" && t.url().includes("background")
  );
  return swTarget?.worker();
}
```

Waiting Strategies {#waiting-strategies}

Use appropriate wait strategies for extension contexts:

```javascript
// Wait for selector
await page.waitForSelector("#element");

// Wait for function with custom predicate
await page.waitForFunction(() => window.extensionReady === true);

// Wait for navigation in extension pages
await page.waitForNavigation({ waitUntil: "networkidle0" });
```

Mocking Chrome APIs {#mocking-chrome-apis}

Mock Chrome APIs in your test environment:

```javascript
await page.evaluateOnNewDocument(() => {
  chrome.runtime.sendMessage = (msg, cb) => {
    console.log("Mocked message:", msg);
    if (cb) cb({ response: "mocked" });
  };
});
```

CI Setup {#ci-setup}

Extensions require headful mode. Configure CI accordingly:

```bash
Linux (xvfb-run)
xvfb-run npm test

macOS/Windows - native headful supported
npm test
```

Puppeteer vs Playwright for Extensions {#puppeteer-vs-playwright-for-extensions}

| Feature | Puppeteer | Playwright |
|---------|-----------|------------|
| Chromium integration | Excellent | Good |
| Cross-browser | Chrome/Chromium only | All major browsers |
| Extension API | Direct target access | Browser context args |
| Community support | Strong | Growing |

Test Helpers {#test-helpers}

Create reusable utilities for extension testing:

```javascript
module.exports = {
  launchWithExtension,
  getExtensionId,
  getBackgroundPage,
  waitForExtensionReady,
};
```

Cross-Reference {#cross-reference}

- [Testing Extensions Overview](./testing-extensions.md)
- [Extension Testing with Playwright](./extension-testing-with-playwright.md)
- [CI/CD Pipeline](./ci-cd-pipeline.md)

Related Articles {#related-articles}

Related Articles

- [Testing Strategies](../guides/chrome-extension-testing-strategies.md)
- [Playwright Testing](../guides/extension-testing-with-playwright.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
