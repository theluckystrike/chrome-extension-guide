---
layout: default
title: "Chrome Extension API Mocking — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Mocking Chrome Extension APIs

## Overview

Chrome extensions rely heavily on `chrome.*` APIs that aren't available in Node.js test environments. This guide covers strategies for mocking these APIs effectively in Jest and Vitest.

## jest-chrome Library

For comprehensive Chrome API mocking, use [jest-chrome](https://github.com/clarkbw/jest-chrome):

```bash
npm install -D jest-chrome
```

```typescript
// jest.setup.ts
import 'jest-chrome';

// Automatically mocks chrome.storage, chrome.tabs, chrome.runtime, etc.
```

## Manual Chrome API Mocks

Create typed mocks for Chrome APIs using `jest.fn()`:

```typescript
// __mocks__/chrome.ts
const chrome = globalThis.chrome = {
  runtime: {
    id: 'test-extension-id',
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  alarms: {
    create: jest.fn(),
    get: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
};

export default chrome;
```

## Storage Mock Implementation

```typescript
// __mocks__/chrome-storage.ts
class StorageMock {
  private store = new Map<string, unknown>();

  async get(keys?: string | string[] | object): Promise<Record<string, unknown>> {
    if (!keys) return { ...Object.fromEntries(this.store) };
    
    const defaults = typeof keys === 'object' && !Array.isArray(keys) ? keys : {};
    const result: Record<string, unknown> = { ...defaults };
    
    const keyList = typeof keys === 'string' ? [keys] 
                   : Array.isArray(keys) ? keys 
                   : Object.keys(defaults);
    
    for (const key of keyList) {
      if (this.store.has(key)) {
        result[key] = this.store.get(key);
      } else if (defaults[key] !== undefined) {
        result[key] = defaults[key];
      }
    }
    return result;
  }

  async set(items: Record<string, unknown>): Promise<void> {
    Object.entries(items).forEach(([key, value]) => {
      this.store.set(key, value);
    });
  }

  async remove(keys: string | string[]): Promise<void> {
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach(k => this.store.delete(k));
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

export const storageMock = {
  local: new StorageMock(),
  sync: new StorageMock(),
};
```

## Tabs Mock

```typescript
// __mocks__/chrome-tabs.ts
export const createTabsMock = () => {
  const tabs: chrome.tabs.Tab[] = [];
  
  return {
    query: jest.fn(async (queryInfo) => {
      return tabs.filter(tab => {
        if (queryInfo.active !== undefined && tab.active !== queryInfo.active) return false;
        if (queryInfo.url !== undefined && tab.url !== queryInfo.url) return false;
        return true;
      });
    }),
    create: jest.fn(async (props) => {
      const newTab: chrome.tabs.Tab = {
        id: tabs.length + 1,
        active: props.active ?? true,
        url: props.url,
        title: 'Test Tab',
        pinned: props.pinned ?? false,
      };
      tabs.push(newTab);
      return newTab;
    }),
    update: jest.fn(async (tabId, updateProps) => {
      const tab = tabs.find(t => t.id === tabId);
      if (tab) Object.assign(tab, updateProps);
      return tab;
    }),
  };
};
```

## Event Mock Helper

Chrome events use `addListener`, `removeListener`, and `hasListener`:

```typescript
// __mocks__/chrome-events.ts
export function createEventMock<T extends (...args: any[]) => void>() {
  const listeners = new Set<T>();
  
  return {
    addListener: jest.fn((listener: T) => {
      listeners.add(listener);
    }),
    removeListener: jest.fn((listener: T) => {
      listeners.delete(listener);
    }),
    hasListener: jest.fn((listener: T) => {
      return listeners.has(listener);
    }),
    // Test utility to trigger listeners
    trigger: (...args: Parameters<T>) => {
      listeners.forEach(listener => listener(...args));
    },
  };
}
```

## Message Passing Mock

```typescript
// __mocks__/chrome-messages.ts
export function createMessageMock() {
  const messageListeners: ((message: any, sender: any) => void)[] = [];
  
  return {
    sendMessage: jest.fn(async (message) => {
      // Simulate async response
      return { success: true, echo: message };
    }),
    onMessage: {
      addListener: jest.fn((listener) => {
        messageListeners.push(listener);
      }),
      removeListener: jest.fn((listener) => {
        const idx = messageListeners.indexOf(listener);
        if (idx > -1) messageListeners.splice(idx, 1);
      }),
      hasListener: jest.fn((listener) => {
        return messageListeners.includes(listener);
      }),
    },
    // Test utility
    simulateMessage: (message: any, sender: any = {}) => {
      messageListeners.forEach(listener => listener(message, sender));
    },
  };
}
```

## Alarms Mock

```typescript
// __mocks__/chrome-alarms.ts
export function createAlarmsMock() {
  const alarms = new Map<string, chrome.alarms.Alarm>();
  
  return {
    create: jest.fn(async (name, alarmInfo) => {
      const alarm: chrome.alarms.Alarm = {
        name: name || 'default',
        scheduledTime: Date.now() + (alarmInfo.delayInMinutes || 0) * 60000,
        periodInMinutes: alarmInfo.periodInMinutes,
      };
      alarms.set(alarm.name, alarm);
    }),
    get: jest.fn(async (name) => alarms.get(name)),
    clear: jest.fn(async (name) => {
      if (name) alarms.delete(name);
      else alarms.clear();
    }),
    onAlarm: createEventMock<(alarm: chrome.alarms.Alarm) => void>(),
  };
}
```

## Resetting Mocks Between Tests

Use `beforeEach` to reset all mocks:

```typescript
// test/setup.ts
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset storage mock data
  storageMock.local.clear();
  storageMock.sync.clear();
});
```

## Storybook Integration

Preview popup/options pages with mocked Chrome APIs:

```typescript
// .storybook/preview.ts
import { chromeStorageMock } from '../__mocks__/chrome-storage';

export const decorators = [
  (Story) => {
    // Inject mocks globally in Storybook
    return <Story />;
  },
];
```

## TypeScript Types

Install `@anthropic-ai/claude-code` for Chrome API types:

```bash
npm install -D @anthropic-ai/claude-code
```

## Snapshot Testing

Use deterministic mock data for consistent snapshots:

```typescript
it('should render popup with mock data', () => {
  const mockTabs = [{
    id: 1,
    title: 'Test Page',
    url: 'https://example.com',
    active: true,
  }];
  
  chrome.tabs.query.mockResolvedValue(mockTabs);
  
  render(<Popup />);
  expect(screen.getByText('Test Page')).toBeInTheDocument();
});
```

## See Also

- [Testing Extensions](./testing-extensions.md)
- [Chrome Extension Unit Testing](./chrome-extension-unit-testing.md)
- [Chrome Extension Testing Strategies](./chrome-extension-testing-strategies.md)
