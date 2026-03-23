---
layout: default
title: "Chrome Extension Error Reporting. Developer Guide"
description: "Learn Chrome extension error reporting with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/extension-error-reporting/"
---
Error Reporting and Monitoring for Chrome Extensions

Introduction {#introduction}
- Chrome extensions run across multiple isolated contexts: background service worker, popup, options page, content scripts
- Unlike web apps, there's no built-in server-side logging. errors in each context need explicit handling
- This guide covers setting up comprehensive error reporting across all extension contexts

Challenges in Extension Error Monitoring {#challenges-in-extension-error-monitoring}
- Multiple contexts: Each context (background, popup, content scripts) is isolated. errors don't automatically bubble up
- Service worker lifecycle: Background workers terminate after inactivity. error handlers must be set up at top level
- No server access: Extensions can't write to traditional server logs without explicit network calls

Global Error Handlers {#global-error-handlers}

Window.onerror for Popup and Options Pages {#windowonerror-for-popup-and-options-pages}
```javascript
// popup.js or options.js
window.onerror = (message, source, lineno, colno, error) => {
  const errorReport = {
    message,
    stack: error?.stack,
    context: 'popup',
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };
  // Send to error service
  reportError(errorReport);
  return false; // Let default handler run too
};
```

Service Worker Error Listeners {#service-worker-error-listeners}
```javascript
// background.js (service worker)
self.addEventListener('error', (event) => {
  const errorReport = {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
    context: 'service-worker',
    timestamp: new Date().toISOString(),
  };
  reportError(errorReport);
});

self.addEventListener('unhandledrejection', (event) => {
  const errorReport = {
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
    context: 'service-worker',
    type: 'unhandled-rejection',
    timestamp: new Date().toISOString(),
  };
  reportError(errorReport);
});
```

Structured Error Logging {#structured-error-logging}

Essential Error Data to Capture {#essential-error-data-to-capture}
```javascript
function captureErrorContext(error, context) {
  return {
    message: error.message,
    stack: error.stack,
    context, // 'background', 'popup', 'content-script'
    extensionVersion: chrome.runtime.getManifest().version,
    browserVersion: navigator.userAgent,
    timestamp: new Date().toISOString(),
    url: window.location?.href || null, // null in service worker
  };
}
```

Chrome.runtime.lastError Pattern {#chromeruntimelasterror-pattern}
Always check for `chrome.runtime.lastError` in callbacks:
```javascript
chrome.runtime.sendMessage({ action: 'fetchData' }, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Message failed:', chrome.runtime.lastError.message);
    reportError({
      message: chrome.runtime.lastError.message,
      context: 'message-passing',
    });
    return;
  }
  // Handle response...
});
```

Content Script Error Isolation {#content-script-error-isolation}
Content scripts share the page's window. errors must be carefully isolated:
```javascript
// content-script.js
(function() {
  const originalOnerror = window.onerror;
  window.onerror = (msg, url, line, col, error) => {
    // Only capture extension errors, not page errors
    if (url && url.startsWith('chrome-extension://')) {
      reportError({
        message: msg,
        stack: error?.stack,
        context: 'content-script',
        line,
        column: col,
      });
    }
    // Call original handler
    if (originalOnerror) originalOnerror(msg, url, line, col, error);
    return false;
  };
})();
```

External Error Services {#external-error-services}

Sentry Integration {#sentry-integration}
```javascript
import * as Sentry from '@sentry/browser';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  release: chrome.runtime.getManifest().version,
  integrations: [
    new Sentry.Integrations.GlobalHandlers({
      onerror: true,
      onunhandledrejection: true,
    }),
  ],
});

// In content scripts, wrap with isolation
Sentry.setContext('extension', {
  context: 'content-script',
  tabId: chrome.runtime.id,
});
```

Custom Error Endpoint {#custom-error-endpoint}
```javascript
class ErrorReporter {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.queue = [];
    this.flushInterval = setInterval(() => this.flush(), 30000);
  }

  async report(errorData) {
    this.queue.push(errorData);
    if (this.queue.length >= 10) this.flush();
  }

  async flush() {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: batch }),
      });
    } catch (e) {
      console.error('Failed to report errors:', e);
    }
  }
}
```

Privacy Considerations {#privacy-considerations}
- Never capture page content, user input, or sensitive data in error reports
- Strip URLs that may contain user data (query params, paths)
- Anonymize user identifiers before sending
- Comply with GDPR. provide way for users to opt out

Source Maps for Minified Code {#source-maps-for-minified-code}
1. Upload source maps to error service (Sentry, Bugsnag) during build
2. Ensure `sourceMap: true` in your bundler config
3. Reference maps in production: `//# sourceMappingURL=bundle.js.map`

Chrome Web Store Crash Reports {#chrome-web-store-crash-reports}
- Enable in Chrome Web Store dashboard under "Advanced"
- Shows crash data aggregated in the developer dashboard
- Limited detail. use for high-level monitoring, not debugging

Cross-References {#cross-references}
- [Error Handling Reference](../reference/error-handling.md)
- [Debugging Extensions](./debugging-extensions.md)
- [Extension Analytics](./extension-analytics.md)

Related Articles {#related-articles}

Related Articles

- [Error Handling Patterns](../patterns/error-handling.md)
- [Extension Logging](../guides/extension-logging.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
