---
layout: default
title: "Chrome Extension Extension Dependency Injection — Best Practices"
description: "Implement dependency injection for cleaner extension architecture."
---

# Extension Dependency Injection Patterns

Patterns for writing testable Chrome extensions using dependency injection to decouple from global chrome.* APIs.

## Problem

Chrome extension APIs (`chrome.storage`, `chrome.runtime`, `chrome.alarms`) are global singletons. This makes unit testing difficult because you cannot easily mock or replace these globals in your test environment.

## Solution: Inject Chrome API Dependencies

Wrap chrome.* APIs in interfaces/classes and inject them as dependencies rather than importing globals directly.

## Service Layer Pattern

Create services that accept chrome API objects as constructor parameters:

```javascript
// storage-service.js
export class StorageService {
  constructor(storageArea = chrome.storage.local) {
    this.storage = storageArea;
  }

  async get(key) {
    return new Promise((resolve) => {
      this.storage.get(key, (result) => resolve(result[key]));
    });
  }

  async set(key, value) {
    return new Promise((resolve) => {
      this.storage.set({ [key]: value }, resolve);
    });
  }
}
```

## Factory Pattern for Production vs Test

Create factories that provide real or mock implementations:

```javascript
// factories/storage-factory.js
export function createStorageService() {
  return new StorageService(chrome.storage.local);
}

export function createMockStorageService(initialData = {}) {
  const data = { ...initialData };
  return new StorageService({
    get: (keys, cb) => cb(keys.reduce((r, k) => (r[k] = data[k], r), {})),
    set: (obj, cb) => { Object.assign(data, obj); cb(); }
  });
}
```

## Module-Level Injection

Export factory functions that accept dependencies:

```javascript
// message-service.js
export function createMessageService(runtime = chrome.runtime) {
  return {
    sendMessage(message) {
      return runtime.sendMessage(message);
    },
    onMessage(callback) {
      runtime.onMessage.addListener(callback);
    }
  };
}
```

## Context-Aware Injection

Provide different implementations for background scripts vs content scripts:

```javascript
// service-registry.js
export function createServiceRegistry(context) {
  const isBackground = context === 'background';
  
  return {
    storage: isBackground 
      ? new StorageService(chrome.storage.local)
      : createContentStorageBridge(),
    messaging: isBackground
      ? new BackgroundMessageService()
      : new ContentScriptMessageService()
  };
}
```

## Injectable Alarm Service

```javascript
// alarm-service.js
export class AlarmService {
  constructor(alarmsAPI = chrome.alarms) {
    this.alarms = alarmsAPI;
  }

  async schedule(name, delayInMinutes) {
    this.alarms.create(name, { delayInMinutes });
  }

  onAlarm(callback) {
    this.alarms.onAlarm.addListener(callback);
  }
}
```

## TypeScript Interfaces

Define contracts for injectable services:

```typescript
interface IStorageService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

interface IMessageService {
  sendMessage(message: object): Promise<void>;
  onMessage(callback: (message: object) => void): void;
}
```

## Benefits

- **Unit testable**: Replace real chrome APIs with mocks
- **Swappable implementations**: Easy to switch between local/sync/session storage
- **Clear dependencies**: All dependencies are explicit in constructor
- **No framework needed**: Lightweight approach using constructor parameters

## See Also

- [Unit Testing Guide](../guides/chrome-extension-unit-testing.md)
- [API Mocking Guide](../guides/chrome-extension-api-mocking.md)
- [Architecture Patterns](./architecture-patterns.md)
