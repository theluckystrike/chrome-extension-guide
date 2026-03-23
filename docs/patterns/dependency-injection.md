---
layout: default
title: "Chrome Extension Dependency Injection — Testable and Modular Extension Code"
description: "Learn how to apply dependency injection patterns in Chrome extensions for testable, maintainable, and modular code."
canonical_url: "https://bestchromeextensions.com/patterns/dependency-injection/"
---

# Chrome Extension Dependency Injection

Dependency injection (DI) is a design pattern that helps you write loosely coupled, testable code by inverting the control of dependencies. In Chrome extensions, where you deal with browser APIs, background scripts, and content scripts, applying DI can dramatically improve your code's maintainability and testability.

## Why Dependency Injection Matters in Extensions {#why-di-matters}

Chrome extensions present unique challenges that make dependency injection particularly valuable:

- **Chrome API dependencies**: Your code directly calls `chrome.storage`, `chrome.tabs`, `chrome.runtime`, and other browser APIs
- **Platform-specific behavior**: Extensions run in different contexts (background worker, content script, popup)
- **Testing limitations**: You cannot unit test Chrome APIs in Node.js environments without mocking

Without DI, your business logic becomes tightly coupled to Chrome's APIs, making it impossible to run automated tests without launching a full browser instance.

## The Problem: Tightly Coupled Code {#the-problem}

Consider this typical extension service without dependency injection:

```typescript
// ❌ Bad: Tightly coupled to Chrome APIs
class BookmarkService {
  async addBookmark(url: string, title: string) {
    const bookmarks = await chrome.bookmarks.create({ url, title });
    await chrome.storage.local.set({ lastBookmark: bookmarks });
    return bookmarks;
  }

  async getBookmarks() {
    return chrome.bookmarks.getTree();
  }
}
```

This code cannot be tested without mocking Chrome's global objects, which is fragile and error-prone.

## Solution: Inject Dependencies {#solution-inject-dependencies}

The solution is to define interfaces for your dependencies and inject them:

```typescript
// ✅ Good: Dependencies are injected
interface BookmarkStorage {
  create(config: { url: string; title: string }): Promise<BookmarkTreeNode>;
  getTree(): Promise<BookmarkTreeNode[]>;
}

interface CacheStorage {
  set(key: string, value: unknown): Promise<void>;
  get(key: string): Promise<unknown>;
}

class BookmarkService {
  constructor(
    private bookmarkStorage: BookmarkStorage,
    private cacheStorage: CacheStorage
  ) {}

  async addBookmark(url: string, title: string) {
    const bookmark = await this.bookmarkStorage.create({ url, title });
    await this.cacheStorage.set('lastBookmark', bookmark);
    return bookmark;
  }
}
```

Now you can easily test `BookmarkService` by passing mock implementations.

## Factory Patterns for Extension Contexts {#factory-patterns}

Chrome extensions run in multiple contexts, each with different API availability. Use factory functions to create context-appropriate implementations:

```typescript
// Factory that creates Chrome API implementations
function createBookmarkStorage(context: 'background' | 'popup'): BookmarkStorage {
  if (context === 'background') {
    return new ChromeBookmarkStorage();
  }
  return new MockBookmarkStorage(); // For popup testing
}

// Real Chrome API implementation
class ChromeBookmarkStorage implements BookmarkStorage {
  async create(config: { url: string; title: string }) {
    return chrome.bookmarks.create(config);
  }

  async getTree() {
    return chrome.bookmarks.getTree();
  }
}
```

This approach lets you use real Chrome APIs in the background context while providing test doubles for popups or options pages.

## Service Layers with DI {#service-layers}

Organize your extension into clear service layers:

```typescript
// Layer 1: Platform-specific implementations
class ChromeStorageAdapter implements CacheStorage {
  async set(key: string, value: unknown) {
    return chrome.storage.local.set({ [key]: value });
  }

  async get(key: string) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  }
}

// Layer 2: Business logic services
class SettingsService {
  constructor(
    private storage: CacheStorage,
    private logger: Logger
  ) {}

  async updateSettings(settings: ExtensionSettings) {
    this.logger.info('Updating settings', settings);
    await this.storage.set('settings', settings);
  }
}

// Layer 3: Application composition root
function createBackgroundServices() {
  const logger = new ConsoleLogger();
  const storage = new ChromeStorageAdapter();
  
  return {
    settingsService: new SettingsService(storage, logger),
    bookmarkService: new BookmarkService(
      new ChromeBookmarkStorage(),
      storage
    ),
  };
}
```

This layered architecture makes it trivial to swap implementations or add new features.

## Mocking Chrome APIs for Testing {#mocking-chrome-apis}

Create a test utilities module that provides mock implementations:

```typescript
// test/mocks/chrome-mocks.ts
export function createMockChrome() {
  return {
    bookmarks: {
      create: jest.fn().mockResolvedValue({ id: '123', url: 'https://example.com' }),
      getTree: jest.fn().mockResolvedValue([]),
    },
    storage: {
      local: {
        get: jest.fn().mockResolvedValue({}),
        set: jest.fn().mockResolvedValue(undefined),
      },
    },
    runtime: {
      sendMessage: jest.fn(),
      lastError: null,
    },
  };
}

// In your tests:
global.chrome = createMockChrome();
```

Combine this with dependency injection to test entire service chains:

```typescript
describe('BookmarkService', () => {
  let service: BookmarkService;
  let mockStorage: jest.Mocked<BookmarkStorage>;
  let mockCache: jest.Mocked<CacheStorage>;

  beforeEach(() => {
    mockStorage = {
      create: jest.fn(),
      getTree: jest.fn(),
    };
    mockCache = {
      set: jest.fn(),
      get: jest.fn(),
    };
    service = new BookmarkService(mockStorage, mockCache);
  });

  it('should cache bookmark after creation', async () => {
    const bookmark = { id: '123', url: 'https://test.com' };
    mockStorage.create.mockResolvedValue(bookmark);

    await service.addBookmark('https://test.com', 'Test');

    expect(mockCache.set).toHaveBeenCalledWith('lastBookmark', bookmark);
  });
});
```

## Module Boundaries {#module-boundaries}

Define clear boundaries between your extension's modules:

| Layer | Responsibility | Dependencies |
|-------|---------------|--------------|
| **Adapters** | Wrap Chrome APIs | None (pure Chrome calls) |
| **Services** | Business logic | Adapters via interfaces |
| **Controllers** | Handle user input | Services |
| **Composers** | Wire everything together | All above |

Keep these boundaries explicit in your file structure:

```
src/
├── adapters/
│   ├── chrome-storage.ts
│   └── chrome-bookmarks.ts
├── services/
│   ├── bookmark-service.ts
│   └── settings-service.ts
├── controllers/
│   └── popup-controller.ts
└── composition/
    └── background-compose.ts
```

## Best Practices {#best-practices}

1. **Always use interfaces** for your dependencies, never concrete types
2. **Inject at construction** — pass dependencies through constructors
3. **Use composition roots** — create all dependencies in one place (usually your entry point)
4. **Keep adapters thin** — adapters should only translate API calls, not contain business logic
5. **Name dependencies clearly** — use descriptive names like `bookmarkStorage` rather than `storage`

## Conclusion {#conclusion}

Dependency injection transforms Chrome extension development from writing untestable scripts to building maintainable applications. By abstracting Chrome APIs behind interfaces, you gain the ability to thoroughly test your business logic without browser dependencies. The initial setup cost pays dividends in code quality, refactoring confidence, and team productivity.
