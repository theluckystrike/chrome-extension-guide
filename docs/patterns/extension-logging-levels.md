---
layout: default
title: "Chrome Extension Extension Logging Levels. Best Practices"
description: "Implement structured logging with different levels for development and production."
canonical_url: "https://bestchromeextensions.com/patterns/extension-logging-levels/"
---

Extension Logging Levels

A comprehensive pattern for implementing structured, context-aware logging in Chrome extensions with runtime-controllable log levels.

Log Levels {#log-levels}

Define a strict hierarchy of log levels:

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}
```

Logger Class {#logger-class}

```typescript
class Logger {
  private context: string;
  private static minLevel: LogLevel = LogLevel.INFO;

  constructor(context: string) {
    this.context = context;
  }

  static async init(): Promise<void> {
    const { logLevel } = await chrome.storage.local.get('logLevel');
    Logger.minLevel = logLevel ?? LogLevel.INFO;
  }

  static setLevel(level: LogLevel): void {
    Logger.minLevel = level;
    chrome.storage.local.set({ logLevel: level });
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= Logger.minLevel;
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${this.context} ${message}`;
  }

  private log(level: LogLevel, levelName: string, message: string, data?: unknown, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const colors: Record<string, string> = {
      DEBUG: 'color: #888',
      INFO: 'color: #4CAF50',
      WARN: 'color: #FF9800',
      ERROR: 'color: #F44336',
      FATAL: 'color: #9C27B0; font-weight: bold'
    };

    const prefix = `[${levelName}]`;
    console.log(`%c${prefix}%c ${this.formatMessage(levelName, message)}`, 
      `color: ${colors[levelName]}`, 'color: inherit', data);

    if (error?.stack) {
      console.error(error.stack);
    }
  }

  debug(message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  error(message: string, data?: unknown, error?: Error): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data, error);
  }

  fatal(message: string, data?: unknown, error?: Error): void {
    this.log(LogLevel.FATAL, 'FATAL', message, data, error);
  }
}
```

Context-Aware Logger {#context-aware-logger}

Create loggers for different extension contexts:

```typescript
const bgLogger = new Logger('[BACKGROUND]');
const popupLogger = new Logger('[POPUP]');

function createContentLogger(tabId: number, url: string): Logger {
  const domain = new URL(url).hostname;
  return new Logger(`[CS:${domain}]`);
}
```

Conditional Logging {#conditional-logging}

Avoid expensive operations when logging is disabled:

```typescript
const logger = new Logger('[BACKGROUND]');

// Bad: toString runs even if DEBUG is disabled
logger.debug('Request payload', JSON.stringifyExpensive(payload));

// Good: lazy evaluation
logger.debug('Request payload', () => JSON.stringifyExpensive(payload));

// Or check first
if (logger.shouldLog(LogLevel.DEBUG)) {
  logger.debug('Request payload', expensiveToString(payload));
}
```

Log Rotation (Circular Buffer) {#log-rotation-circular-buffer}

```typescript
const MAX_LOG_ENTRIES = 500;

async function addLogEntry(entry: LogEntry): Promise<void> {
  const { logs } = await chrome.storage.session.get('logs');
  const updatedLogs = [...(logs || []), entry].slice(-MAX_LOG_ENTRIES);
  await chrome.storage.session.set({ logs: updatedLogs });
}

interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  data?: unknown;
  stack?: string;
}
```

Remote Logging (ERROR+ Only) {#remote-logging-error-only}

```typescript
async function sendToRemote(entry: LogEntry): Promise<void> {
  if (entry.level === 'DEBUG' || entry.level === 'INFO') return;

  await fetch('https://analytics.example.com/logs', {
    method: 'POST',
    body: JSON.stringify(entry),
    headers: { 'Content-Type': 'application/json' }
  });
}
```

Production Stripping {#production-stripping}

Use build-time defines to remove DEBUG logs:

```typescript
// webpack.config.js
const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.DefinePlugin({
      'process.env.LOG_LEVEL': JSON.stringify(process.env.LOG_LEVEL || 'INFO')
    })
  ]
};

// logger.ts
const shouldLog = process.env.LOG_LEVEL === 'DEBUG';
```

Log Viewer Component {#log-viewer-component}

In your options page, display recent logs with filtering:

```typescript
function renderLogViewer(): HTMLElement {
  const container = document.createElement('div');
  container.id = 'log-viewer';

  const filter = document.createElement('select');
  filter.innerHTML = `
    <option value="ALL">All</option>
    <option value="ERROR">Errors Only</option>
    <option value="WARN">Warnings+</option>
  `;

  const logsContainer = document.createElement('div');
  logsContainer.style.cssText = 'max-height: 400px; overflow-y: auto; font-family: monospace;';

  filter.addEventListener('change', () => renderLogs(filter.value));

  async function renderLogs(filterLevel: string): Promise<void> {
    const { logs } = await chrome.storage.session.get('logs');
    logsContainer.innerHTML = (logs || [])
      .filter(l => filterLevel === 'ALL' || levels[l.level] >= levels[filterLevel])
      .map(l => `<div style="color: ${getLevelColor(l.level)}">${l.timestamp} [${l.level}] ${l.context} ${l.message}</div>`)
      .join('');
  }

  container.append(filter, logsContainer);
  renderLogs('ALL');
  return container;
}

function getLevelColor(level: string): string {
  const colors: Record<string, string> = { DEBUG: '#888', INFO: '#4CAF50', WARN: '#FF9800', ERROR: '#F44336', FATAL: '#9C27B0' };
  return colors[level] || '#000';
}
```

Export Logs {#export-logs}

```typescript
async function exportLogs(): Promise<void> {
  const { logs } = await chrome.storage.session.get('logs');
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename: 'extension-logs.json' });
}
```

Sentry Integration {#sentry-integration}

```typescript
import * as Sentry from '@sentry/browser';

function captureError(error: Error, context: string): void {
  Sentry.captureException(error, {
    tags: { context },
    extra: { extension: 'my-extension' }
  });
}
```

Related Patterns {#related-patterns}

- [Extension Logging Guide](../../guides/extension-logging.md)
- [Debugging Extensions](../../guides/debugging-extensions.md)
- [Error Handling Pattern](./error-handling.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
