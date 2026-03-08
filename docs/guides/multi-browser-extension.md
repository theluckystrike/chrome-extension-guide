---
title: Chrome Extension Cross-Browser Development — Build for Chrome, Firefox, Edge, and Safari
description: Learn how to create cross-browser extensions using WebExtension APIs, browser polyfills, manifest differences, and conditional code for Chrome, Firefox, Edge, and Safari.
layout: default
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/docs/guides/multi-browser-extension/"

---

# Chrome Extension Cross-Browser Development

Building extensions that work across multiple browsers maximizes your reach and ensures users can choose their preferred browser without losing functionality. The WebExtension API provides a standardized foundation, but each browser implements it differently. This guide covers the strategies, tools, and best practices for creating truly cross-browser extensions.

## Understanding the WebExtension API

The WebExtension API is the cornerstone of cross-browser extension development. Originally designed by Mozilla and adopted by Chrome, Edge, and Safari, it provides a unified JavaScript API for browser extensions. However, compatibility is not automatic—understanding the nuances of each browser's implementation is essential.

Chrome was the first major browser to adopt WebExtensions, setting the baseline for API design. Firefox followed closely, maintaining high compatibility with Chrome's APIs while adding its own extensions. Microsoft Edge, rebuilt on Chromium, shares significant API overlap with Chrome but includes some unique features. Safari's WebExtension support, introduced in Safari 14, implements the WebExtension API with notable differences in behavior and available APIs.

The key principle is that most core APIs work similarly across browsers, but feature completeness varies. Before starting development, check the [MDN Browser Compatibility Data](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Browser_compatibility_for_manifest.json) to verify API support for your target browsers.

## Using Browser Polyfills

Browser polyfills are libraries that bridge API gaps between browsers, allowing your extension code to use a consistent interface regardless of the browser. The most popular solution is the `webextension-polyfill` package, which provides Promise-based wrappers for callback-style APIs.

Install the polyfill in your project:

```bash
npm install webextension-polyfill
```

Import and initialize it in your background scripts and content scripts:

```javascript
import browser from 'webextension-polyfill';

// Use browser.runtime instead of chrome.runtime
browser.runtime.sendMessage({ greeting: 'hello' })
  .then(response => console.log(response))
  .catch(error => console.error(error));
```

The polyfill handles API differences automatically, transforming Chrome's callback-based APIs into Promise-based ones that match Firefox's implementation. This reduces conditional code in your business logic and makes your extension more maintainable.

However, polyfills cannot solve all compatibility issues. They cannot add APIs that don't exist in a browser, and they cannot work around fundamental behavioral differences. For those cases, you'll need conditional code.

## Handling Manifest Differences

The `manifest.json` file defines your extension's configuration, and browser-specific manifest keys require careful handling. While Manifest V3 is the current standard across all major browsers, subtle differences exist in supported keys and their behavior.

### Browser-Specific Manifest Keys

Some manifest keys are unique to specific browsers:

- **Chrome and Edge**: Support `action` for declarative content scripts and `declarative_net_request` with specific match patterns
- **Firefox**: Supports `browser_specific_settings` for Firefox-specific configuration
- **Safari**: Requires additional Safari-specific keys in the `__MSExtension` dictionary within `info.plist` after conversion

Use manifest conditional keys to handle browser-specific configurations:

```json
{
  "manifest_version": 3,
  "name": "__MSG_extension_name__",
  "version": "1.0.0",
  "default_locale": "en",
  
  "chrome_settings_overrides": {
    "homepage": "https://example.com"
  },
  
  "browser_specific_settings": {
    "gecko": {
      "id": "extension@example.com",
      "strict_min_version": "109.0"
    }
  }
}
```

### Managing Multiple Manifest Files

For complex projects, maintain separate manifest files for each target browser:

```
src/
  manifests/
    manifest.chrome.json
    manifest.firefox.json
    manifest.edge.json
    manifest.safari.json
```

Use a build tool like Webpack or Rollup to merge the appropriate manifest with shared configuration during the build process. This approach provides full control over browser-specific settings while keeping your source code unified.

## Implementing Conditional Code

Despite using polyfills and careful manifest configuration, some features require browser-specific code. Use feature detection and browser identification to implement conditional logic safely.

### Feature Detection

Always prefer feature detection over browser detection:

```javascript
// Check if an API exists before using it
if (browser.storage.session) {
  // Use session storage API
  browser.storage.session.set({ key: 'value' });
} else {
  // Fallback to local storage
  browser.storage.local.set({ key: 'value' });
}
```

### Browser Detection

When feature detection isn't sufficient, use the `browser` runtime object to identify the browser:

```javascript
function getBrowserInfo() {
  const ua = navigator.userAgent;
  
  if (ua.includes('Edg/')) {
    return 'edge';
  } else if (ua.includes('Firefox/')) {
    return 'firefox';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    return 'safari';
  } else {
    return 'chrome';
  }
}

const currentBrowser = getBrowserInfo();
```

Use browser detection sparingly and isolate it in utility functions to keep your main code clean and testable.

### Conditional Imports

For larger browser-specific code blocks, use dynamic imports:

```javascript
async function getBrowserUtils() {
  const browserInfo = getBrowserInfo();
  
  switch (browserInfo) {
    case 'firefox':
      return import('./utils/firefox.js');
    case 'safari':
      return import('./utils/safari.js');
    default:
      return import('./utils/chromium.js');
  }
}
```

## Testing Across Browsers

Comprehensive testing is critical for cross-browser extensions. Each browser has unique developer tools, extension formats, and loading mechanisms.

### Local Testing Workflow

Test your extension in each target browser during development:

1. **Chrome and Edge**: Use Developer Mode in `chrome://extensions` and load unpacked extensions
2. **Firefox**: Use `about:debugging` or the WebExtension Developer Toolbar
3. **Safari**: Enable the Developer menu in Safari preferences, then use the Extensions tab

Create a testing checklist for each browser:

- Extension icon and name display correctly
- Popup opens and functions properly
- Background scripts initialize without errors
- Content scripts inject at the correct pages
- Storage operations work as expected
- Native messaging (if applicable) functions correctly

### Automated Testing

Use browser automation tools to verify cross-browser functionality:

- **Playwright**: Test extension behavior across Chromium-based browsers
- **Puppeteer**: Chrome-specific extension testing
- **Selenium**: Cross-browser automation with WebDriver

Write integration tests that verify core functionality across all target browsers:

```javascript
import { test, expect } from '@playwright/test';

test('extension popup loads', async ({ page, context }) => {
  const extensionId = await loadExtension(context, 'path/to/extension');
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  
  await page.goto(popupUrl);
  await expect(page.locator('body')).toBeVisible();
});
```

### CI/CD Considerations

Set up continuous integration to test across multiple browsers:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    strategy:
      matrix:
        browser: [chrome, firefox, edge]
    steps:
      - uses: actions/checkout@v3
      - name: Run tests on ${{ matrix.browser }}
        run: npm test -- --browser=${{ matrix.browser }}
```

## Publishing to Multiple Stores

Each browser has its own extension store with different submission processes:

- **Chrome Web Store**: Google's marketplace, largest user base
- **Mozilla Add-ons**: Firefox's official extension gallery
- **Microsoft Edge Add-ons**: Integrated with Windows Store
- **Apple App Store**: Safari extensions (requires Apple Developer membership)

Prepare store-specific screenshots, descriptions, and metadata. Review each store's policies to ensure compliance before submission.

## Conclusion

Cross-browser extension development requires careful planning and attention to browser-specific differences. Use the WebExtension API as your foundation, implement polyfills for API consistency, handle manifest differences strategically, and test thoroughly across all target browsers. With these practices, you can reach users regardless of their browser preference while maintaining a single codebase.

The initial investment in cross-browser compatibility pays dividends through increased user reach and reduced maintenance overhead. Start with the browsers most relevant to your audience, then expand to additional browsers as your extension matures.
