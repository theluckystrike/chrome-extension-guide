# Extension Logging Guide

## Introduction
Logging in Chrome extensions is challenging because logs are spread across multiple DevTools windows — background service worker, popup, options page, and content scripts each have their own console. This guide covers structured logging patterns that work reliably across all extension contexts.

## 1. Structured Log Format
Use a consistent format across all contexts so logs are searchable and parseable:

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;    // ISO 8601 format
  context: string;      // 'background', 'popup', 'content', 'options'
  level: LogLevel;
  message: string;
  data?: unknown;      // Optional structured data
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};
```

## 2. Conditional Log Levels
Only output logs at or above the configured level to reduce noise:

```typescript
let currentLevel: LogLevel = 'info';

function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

function log(level: LogLevel, message: string, data?: unknown) {
  if (LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      context: 'background', // Set appropriately per context
      level,
      message,
      data,
    };
    console.log(JSON.stringify(entry));
  }
}
```

## 3. Console Styling with Context Labels
Use `%c` formatting to add colored context labels that make logs scannable:

```typescript
const CONTEXT_STYLES: Record<string, string> = {
  background: 'background: #222; color: #bada55',
  popup: 'background: #222; color: #61dafb',
  content: 'background: #222; color: #ff6b6b',
  options: 'background: #222; color: #ffd93d',
};

function styledLog(context: string, message: string, ...args: unknown[]) {
  console.log(`%c${context}%c ${message}`, CONTEXT_STYLES[context] || '', ...args);
}
```

## 4. Centralizing Logs to Background
Content scripts and popup logs are in separate DevTools windows. Send logs to the background service worker for unified viewing:

```typescript
// In content script or popup
function centralizeLog(entry: LogEntry) {
  chrome.runtime.sendMessage({ type: 'LOG_ENTRY', payload: entry });
}

// In background service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'LOG_ENTRY') {
    console.log(JSON.stringify(message.payload));
  }
});
```

## 5. Persistent Log Storage with Circular Buffer
Store recent logs in `chrome.storage.session` so they're available even after service worker restarts:

```typescript
const MAX_LOG_ENTRIES = 500;

async function persistLog(entry: LogEntry) {
  const { logs = [] } = await chrome.storage.session.get('logs');
  logs.push(entry);
  if (logs.length > MAX_LOG_ENTRIES) {
    logs.shift(); // Remove oldest
  }
  await chrome.storage.session.set({ logs });
}
```

## 6. Debug Mode Toggle
Enable verbose logging only when needed to diagnose issues:

```typescript
let isDebugMode = false;

async function initLogging() {
  const { debugMode } = await chrome.storage.local.get('debugMode');
  isDebugMode = debugMode ?? false;
  setLogLevel(isDebugMode ? 'debug' : 'info');
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.debugMode) {
    isDebugMode = changes.debugMode.newValue;
    setLogLevel(isDebugMode ? 'debug' : 'info');
  }
});
```

## 7. Log Export for Bug Reports
Allow users to export logs as a JSON file for debugging issues:

```typescript
async function exportLogs() {
  const { logs } = await chrome.storage.session.get('logs');
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `extension-logs-${Date.now()}.json`;
  a.click();
}
```

## 8. Production Logging: Strip Debug Logs
Use build tools to remove debug logs in production. With esbuild:

```javascript
// esbuild.config.js
require('esbuild').build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  minify: true,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // After minification, console.debug calls disappear
}).catch(() => process.exit(1));
```

Or use a custom plugin to strip all logging calls in production builds.

## 9. Viewing Logs Across Contexts
- **Service worker logs**: `chrome://serviceworker-internals` → find your extension → "Inspect"
- **Content script logs**: Appear in the page's DevTools console under the extension's context
- **Popup/options logs**: Right-click extension icon → "Inspect popup" or navigate to options page

## 10. Performance Considerations
- Avoid logging in hot paths (e.g., scroll handlers) — use throttling
- Use lazy serialization for complex objects: `() => expensiveComputation()` instead of serializing upfront
- Disable structured logging in performance-critical code paths

## Related Guides
- [Debugging Extensions](./debugging-extensions.md) — General debugging techniques
- [Service Worker Debugging](./service-worker-debugging.md) — Background worker specifics
- [Extension Error Reporting](./extension-error-reporting.md) — Collecting and reporting errors
