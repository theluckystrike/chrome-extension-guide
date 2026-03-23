---
layout: default
title: "Chrome Extension Logging Patterns. Best Practices"
description: "Master logging patterns for debugging Chrome extensions across service workers, content scripts, and popups with structured logging, persistence, and remote error reporting."
canonical_url: "https://bestchromeextensions.com/patterns/logging-patterns/"
---

# Logging Patterns for Chrome Extensions

Effective logging is essential for debugging Chrome extensions, where code runs across
multiple contexts -- service workers, content scripts, popups, and DevTools panels.
This guide covers eight proven logging patterns that help you build observable,
debuggable extensions.

Related guides:
- [Error Handling Patterns](error-handling.md)
- [Advanced Debugging](../guides/advanced-debugging.md)

---

1. Structured Logging with Log Levels {#1-structured-logging-with-log-levels}

A structured logger gives you consistent output and the ability to filter by severity.
Define standard log levels and route them through a single interface.

```javascript
// logger.js
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor(options = {}) {
    this.level = options.level ?? LOG_LEVELS.DEBUG;
    this.prefix = options.prefix ?? 'Extension';
  }

  #shouldLog(level) {
    return level >= this.level;
  }

  #format(level, message, data) {
    return {
      timestamp: new Date().toISOString(),
      level,
      prefix: this.prefix,
      message,
      data: data ?? null,
    };
  }

  debug(message, data) {
    if (!this.#shouldLog(LOG_LEVELS.DEBUG)) return;
    const entry = this.#format('DEBUG', message, data);
    console.debug(`[${entry.prefix}]`, message, data ?? '');
    return entry;
  }

  info(message, data) {
    if (!this.#shouldLog(LOG_LEVELS.INFO)) return;
    const entry = this.#format('INFO', message, data);
    console.info(`[${entry.prefix}]`, message, data ?? '');
    return entry;
  }

  warn(message, data) {
    if (!this.#shouldLog(LOG_LEVELS.WARN)) return;
    const entry = this.#format('WARN', message, data);
    console.warn(`[${entry.prefix}]`, message, data ?? '');
    return entry;
  }

  error(message, data) {
    if (!this.#shouldLog(LOG_LEVELS.ERROR)) return;
    const entry = this.#format('ERROR', message, data);
    console.error(`[${entry.prefix}]`, message, data ?? '');
    return entry;
  }
}

export { Logger, LOG_LEVELS };
```

Use the logger throughout your extension instead of raw `console.log` calls. This
gives you a single place to adjust formatting, filtering, and output destinations.

---

2. Context-Aware Logging {#2-context-aware-logging}

Chrome extensions run in multiple execution contexts. Each context has its own
console, making it hard to correlate logs. Tag every log entry with its source context
so you can trace issues across boundaries.

```javascript
// context-logger.js
function detectContext() {
  if (typeof ServiceWorkerGlobalScope !== 'undefined') {
    return 'service-worker';
  }
  if (typeof window !== 'undefined' && chrome.extension?.getBackgroundPage) {
    return 'popup';
  }
  if (typeof window !== 'undefined' && document.contentType) {
    return 'content-script';
  }
  return 'unknown';
}

function createContextLogger(overrideName) {
  const context = overrideName ?? detectContext();

  return new Logger({
    prefix: context,
    level: LOG_LEVELS.DEBUG,
  });
}

// Usage in a content script
const log = createContextLogger('content-script:reddit');
log.info('Injected into page', { url: location.href });

// Usage in the service worker
const log = createContextLogger('service-worker');
log.info('Extension installed', { version: chrome.runtime.getManifest().version });
```

When content scripts forward messages to the service worker, include the context tag
in the message payload so the service worker can log them with proper attribution:

```javascript
// content-script.js
chrome.runtime.sendMessage({
  type: 'LOG',
  context: 'content-script:github',
  level: 'ERROR',
  message: 'Failed to parse DOM element',
  data: { selector: '.repo-list', error: err.message },
});
```

---

3. Persisting Logs to chrome.storage {#3-persisting-logs-to-chromestorage}

Console logs vanish when a service worker goes idle or a popup closes. Persist
important logs to `chrome.storage.local` so you can review them later.

```javascript
// persistent-logger.js
const MAX_STORED_LOGS = 500;

async function persistLog(entry) {
  const { logs = [] } = await chrome.storage.local.get('logs');
  logs.push(entry);

  // Evict oldest entries when the buffer is full
  if (logs.length > MAX_STORED_LOGS) {
    logs.splice(0, logs.length - MAX_STORED_LOGS);
  }

  await chrome.storage.local.set({ logs });
}

async function getLogs(filter = {}) {
  const { logs = [] } = await chrome.storage.local.get('logs');

  return logs.filter((entry) => {
    if (filter.level && entry.level !== filter.level) return false;
    if (filter.context && entry.prefix !== filter.context) return false;
    if (filter.since && new Date(entry.timestamp) < new Date(filter.since)) return false;
    return true;
  });
}

async function clearLogs() {
  await chrome.storage.local.remove('logs');
}
```

Integrate this with the structured logger by calling `persistLog` inside each log
method for entries at or above a threshold (e.g., WARN and ERROR). Avoid persisting
DEBUG-level logs in production -- they will quickly fill your storage quota.

Storage quota note: `chrome.storage.local` has a 10 MB limit by default. Request
the `unlimitedStorage` permission if your extension generates heavy log volume during
development.

---

4. Remote Error Reporting (Sentry Integration) {#4-remote-error-reporting-sentry-integration}

For production extensions, ship errors to a remote reporting service so you can
monitor real-world failures. Sentry works well with Chrome extensions.

```javascript
// sentry-reporter.js
import * as Sentry from '@sentry/browser';

function initErrorReporting() {
  Sentry.init({
    dsn: 'https://your-dsn@sentry.io/project-id',
    environment: getEnvironment(),
    release: chrome.runtime.getManifest().version,
    beforeSend(event) {
      // Strip sensitive data before sending
      if (event.request?.url) {
        event.request.url = '[REDACTED]';
      }
      return event;
    },
  });
}

function reportError(error, context = {}) {
  Sentry.withScope((scope) => {
    scope.setTag('extension_context', context.source ?? 'unknown');
    scope.setExtra('tabId', context.tabId);
    scope.setExtra('url', context.url);
    Sentry.captureException(error);
  });
}

// In the service worker
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'ERROR_REPORT') {
    reportError(new Error(message.error), {
      source: message.context,
      tabId: sender.tab?.id,
      url: sender.tab?.url,
    });
  }
});
```

Key considerations for remote reporting in extensions:
- Privacy: Never send page URLs or user data without explicit consent. Strip PII
  in the `beforeSend` hook.
- Rate limiting: Sentry has built-in rate limiting, but also debounce on the
  client side to avoid flooding during cascading failures.
- CSP compliance: Add the Sentry domain to your `manifest.json` content security
  policy if you use Manifest V3's strict CSP.

---

5. Log Filtering and Search in DevTools Panel {#5-log-filtering-and-search-in-devtools-panel}

Build a custom DevTools panel that displays your persisted logs with filtering
controls. This is far more usable than scanning multiple console windows.

```javascript
// devtools-panel.js
class LogViewer {
  constructor(containerEl) {
    this.container = containerEl;
    this.filters = { level: null, context: null, search: '' };
  }

  async refresh() {
    const logs = await getLogs();
    const filtered = this.#applyFilters(logs);
    this.#render(filtered);
  }

  #applyFilters(logs) {
    return logs.filter((entry) => {
      if (this.filters.level && entry.level !== this.filters.level) return false;
      if (this.filters.context && entry.prefix !== this.filters.context) return false;
      if (this.filters.search) {
        const query = this.filters.search.toLowerCase();
        const text = `${entry.message} ${JSON.stringify(entry.data)}`.toLowerCase();
        if (!text.includes(query)) return false;
      }
      return true;
    });
  }

  #render(logs) {
    this.container.innerHTML = '';
    for (const entry of logs) {
      const row = document.createElement('div');
      row.className = `log-entry log-${entry.level.toLowerCase()}`;
      row.textContent = `[${entry.timestamp}] [${entry.prefix}] ${entry.level}: ${entry.message}`;
      if (entry.data) {
        const detail = document.createElement('pre');
        detail.textContent = JSON.stringify(entry.data, null, 2);
        row.appendChild(detail);
      }
      this.container.appendChild(row);
    }
  }

  setFilter(key, value) {
    this.filters[key] = value;
    this.refresh();
  }
}
```

Register the DevTools panel in your extension's `devtools.js` entry point:

```javascript
chrome.devtools.panels.create('My Extension Logs', '', 'devtools-panel.html');
```

---

6. Performance Timing Logs {#6-performance-timing-logs}

Track how long operations take. This is critical for identifying bottlenecks in
content scripts that manipulate the DOM or service workers that process large datasets.

```javascript
// perf-logger.js
class PerfLogger {
  #timers = new Map();

  start(label) {
    this.#timers.set(label, performance.now());
  }

  end(label, metadata = {}) {
    const startTime = this.#timers.get(label);
    if (startTime === undefined) {
      console.warn(`PerfLogger: no timer found for "${label}"`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.#timers.delete(label);

    const entry = {
      type: 'perf',
      label,
      durationMs: Math.round(duration * 100) / 100,
      ...metadata,
    };

    console.info(`[perf] ${label}: ${entry.durationMs}ms`, metadata);
    return entry;
  }

  async measure(label, fn, metadata = {}) {
    this.start(label);
    try {
      const result = await fn();
      this.end(label, { ...metadata, status: 'success' });
      return result;
    } catch (err) {
      this.end(label, { ...metadata, status: 'error', error: err.message });
      throw err;
    }
  }
}

// Usage
const perf = new PerfLogger();

// Manual start/end
perf.start('dom-scan');
const elements = document.querySelectorAll('.target');
perf.end('dom-scan', { count: elements.length });

// Wrapping an async operation
const data = await perf.measure('api-fetch', () =>
  fetch('https://api.example.com/data').then((r) => r.json())
);
```

Set up threshold alerts so you notice when operations degrade:

```javascript
function logWithThreshold(entry, thresholdMs = 1000) {
  if (entry.durationMs > thresholdMs) {
    console.warn(`[perf] SLOW: ${entry.label} took ${entry.durationMs}ms (threshold: ${thresholdMs}ms)`);
    persistLog({ ...entry, level: 'WARN' });
  }
}
```

---

7. User Action Audit Trail {#7-user-action-audit-trail}

Record user interactions for debugging user-reported issues. An audit trail lets you
reconstruct what the user did before a bug occurred.

```javascript
// audit-trail.js
const MAX_AUDIT_ENTRIES = 200;

class AuditTrail {
  #entries = [];

  record(action, details = {}) {
    const entry = {
      timestamp: Date.now(),
      action,
      details,
    };

    this.#entries.push(entry);
    if (this.#entries.length > MAX_AUDIT_ENTRIES) {
      this.#entries.shift();
    }
  }

  getRecent(count = 50) {
    return this.#entries.slice(-count);
  }

  async persist() {
    await chrome.storage.local.set({
      auditTrail: this.#entries,
    });
  }

  async load() {
    const { auditTrail = [] } = await chrome.storage.local.get('auditTrail');
    this.#entries = auditTrail;
  }

  export() {
    return JSON.stringify(this.#entries, null, 2);
  }
}

// Usage in popup or options page
const audit = new AuditTrail();

document.getElementById('settings-form').addEventListener('submit', (e) => {
  const formData = new FormData(e.target);
  audit.record('settings-updated', Object.fromEntries(formData));
});

document.getElementById('toggle-feature').addEventListener('click', () => {
  audit.record('feature-toggled', { feature: 'dark-mode', enabled: true });
});

// Attach to error reports for context
function buildErrorReport(error) {
  return {
    error: error.message,
    stack: error.stack,
    recentActions: audit.getRecent(20),
    timestamp: Date.now(),
  };
}
```

When a user submits a bug report through your extension, include the audit trail
automatically. This drastically reduces the back-and-forth needed to reproduce issues.

---

8. Production vs Development Logging Configuration {#8-production-vs-development-logging-configuration}

Use different logging configurations for development and production builds. In
development, log everything. In production, log only warnings and errors, and route
them to remote reporting.

```javascript
// config.js
function getEnvironment() {
  // Option 1: Build-time flag (set by your bundler)
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__ ? 'development' : 'production';
  }

  // Option 2: Check if extension is loaded unpacked
  if (chrome.runtime.getManifest().update_url === undefined) {
    return 'development';
  }

  return 'production';
}

function createLoggerForEnvironment() {
  const env = getEnvironment();

  if (env === 'development') {
    return new Logger({
      level: LOG_LEVELS.DEBUG,
      prefix: 'DEV',
    });
  }

  return new Logger({
    level: LOG_LEVELS.WARN,
    prefix: 'PROD',
  });
}

// Enhanced logger that routes based on environment
class ProductionLogger extends Logger {
  constructor(options) {
    super(options);
    this.env = getEnvironment();
  }

  error(message, data) {
    const entry = super.error(message, data);
    if (!entry) return;

    if (this.env === 'production') {
      reportError(new Error(message), data);
    } else {
      persistLog(entry);
    }

    return entry;
  }
}
```

The unpacked-extension detection trick (`update_url === undefined`) is reliable:
extensions loaded via "Load unpacked" in `chrome://extensions` do not have an
`update_url` in their manifest, while extensions installed from the Chrome Web Store
always do.

For build-time configuration, define the `__DEV__` flag in your bundler:

```javascript
// webpack.config.js
const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    }),
  ],
};
```

```javascript
// vite.config.js
export default defineConfig({
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
```

---

Putting It All Together {#putting-it-all-together}

Combine these patterns into a unified logging module for your extension:

1. Create a structured logger (Pattern 1) with context awareness (Pattern 2).
2. Persist important logs (Pattern 3) and report errors remotely (Pattern 4).
3. Build a DevTools panel (Pattern 5) for exploring persisted logs during development.
4. Add performance tracking (Pattern 6) to catch regressions early.
5. Record an audit trail (Pattern 7) to make bug reports actionable.
6. Switch configurations (Pattern 8) so production builds stay lean and quiet.

Each pattern works independently, so adopt them incrementally. Start with structured
logging and context tags, then layer on persistence and remote reporting as your
extension matures.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
