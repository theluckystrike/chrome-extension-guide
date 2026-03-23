# IndexedDB Browser Chrome Extension

IndexedDB is a powerful client-side NoSQL database built into modern browsers that enables Chrome extensions to store significant amounts of structured data locally. Unlike chrome.storage which limits you to JSON-serializable data with quotas, IndexedDB provides solid database capabilities with transactions, indexes, and support for large datasets.

## Architecture and Manifest Setup

### Manifest Configuration

IndexedDB doesn't require special permissions in Manifest V3, it operates within your extension's origin. Your extension needs permissions based on other features, not IndexedDB itself.

```json
{
  "manifest_version": 3,
  "name": "IndexedDB Extension",
  "version": "1.0.0",
  "description": "Extension using IndexedDB for local storage",
  "permissions": ["storage", "tabs"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup/popup.html"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/content.js"]
  }]
}
```

### Extension Contexts and IndexedDB Access

IndexedDB can be accessed from service worker, popup, options page, and content scripts. Each context shares the same underlying origin storage. Content scripts matched to pages operate within the page's origin, they access the page's IndexedDB, not your extension's. Use chrome.runtime.getURL to ensure proper context.

---

## Core Implementation with TypeScript

### Database Initialization

```typescript
// src/db/indexed-db.ts
export interface DBSchema {
  users: {
    key: string;
    value: { id: string; name: string; email: string; createdAt: number };
    indexes: { 'by-email': string };
  };
  settings: { key: string; value: { key: string; value: unknown } };
}

const DB_NAME = 'extension-db';
const DB_VERSION = 1;

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('users')) {
          const store = db.createObjectStore('users', { keyPath: 'id' });
          store.createIndex('by-email', 'email', { unique: true });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  async get<K extends keyof DBSchema>(
    storeName: K,
    key: string
  ): Promise<DBSchema[K]['value'] | undefined> {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<K extends keyof DBSchema>(
    storeName: K,
    value: DBSchema[K]['value']
  ): Promise<void> {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<K extends keyof DBSchema>(
    storeName: K
  ): Promise<DBSchema[K]['value'][]> {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete<K extends keyof DBSchema>(
    storeName: K,
    key: string
  ): Promise<void> {
    const db = await this.initialize();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const request = tx.objectStore(storeName).delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new IndexedDBManager();
```

---

UI Design Patterns

Popup Implementation

```typescript
// popup/popup.ts
import { db } from '../db/indexed-db';

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

document.addEventListener('DOMContentLoaded', async () => {
  const users = await db.getAll('users');
  renderUsers(users);
  setupForm();
});

function renderUsers(users: User[]): void {
  const container = document.getElementById('user-list');
  if (!container) return;
  container.innerHTML = users.length === 0 
    ? '<p>No users yet</p>'
    : users.map(u => `<div class="user">${u.name} - ${u.email}</div>`).join('');
}

function setupForm(): void {
  const form = document.getElementById('user-form') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (document.getElementById('name') as HTMLInputElement).value;
    const email = (document.getElementById('email') as HTMLInputElement).value;
    
    await db.put('users', { id: crypto.randomUUID(), name, email, createdAt: Date.now() });
    const users = await db.getAll('users');
    renderUsers(users);
    form.reset();
  });
}
```

Side Panel for Data Management

```typescript
// background.ts
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_DATA') {
    db.put('users', message.data).then(() => sendResponse({ success: true }));
    return true;
  }
});
```

---

Chrome APIs and Permissions

Required Permissions

```json
{
  "permissions": ["storage"],
  "host_permissions": []
}
```

IndexedDB operates within your extension origin, no special permission needed. Use chrome.storage for small metadata like sync state.

Storage Comparison

| Feature | chrome.storage.local | IndexedDB |
|---------|---------------------|-----------|
| Data Types | JSON only | Any structured clone |
| Size Limit | 10MB | ~50MB+ |
| Query Support | Key-value only | Indexes, cursors |
| Transactions | No | Yes |
| Use Case | Preferences | Complex data |

---

State Management Patterns

Repository Pattern

```typescript
// src/repositories/user-repository.ts
import { db } from '../db/indexed-db';

export class UserRepository {
  async findById(id: string): Promise<User | undefined> {
    return db.get('users', id);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const database = await import('../db/indexed-db').then(m => m.db.initialize());
    const tx = database.transaction('users', 'readonly');
    const index = tx.objectStore('users').index('by-email');
    return new Promise((resolve, reject) => {
      const request = index.get(email);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async create(user: Omit<User, 'id' | 'createdAt'>): Promise<void> {
    await db.put('users', { ...user, id: crypto.randomUUID(), createdAt: Date.now() });
  }

  async delete(id: string): Promise<void> {
    await db.delete('users', id);
  }
}

export const userRepository = new UserRepository();
```

---

Error Handling and Edge Cases

Handling Quota Exceeded

```typescript
async function safePut(storeName: string, value: unknown): Promise<void> {
  try {
    await db.put(storeName, value);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded - clearing cache');
      // Implement cleanup strategy
      await clearExpiredData();
      await db.put(storeName, value); // Retry
    } else {
      throw error;
    }
  }
}
```

Schema Migrations

```typescript
// Handle version upgrades
private handleUpgrade(event: IDBVersionChangeEvent): void {
  const db = (event.target as IDBOpenDBRequest).result;
  const oldVersion = event.oldVersion;

  if (oldVersion < 2) {
    if (!db.objectStoreNames.contains('logs')) {
      db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
    }
  }
}
```

---

Testing Approach

Unit Testing with Fake IndexedDB

```typescript
// src/__tests__/db.test.ts
import fakeIndexedDB from 'fake-indexeddb';

globalThis.indexedDB = fakeIndexedDB;

describe('IndexedDBManager', () => {
  let db: IndexedDBManager;

  beforeEach(async () => {
    db = new IndexedDBManager();
    await db.initialize();
  });

  afterEach(async () => {
    await db.clear('users');
  });

  test('should store and retrieve user', async () => {
    const user = { id: '1', name: 'Test', email: 'test@example.com', createdAt: Date.now() };
    await db.put('users', user);
    const result = await db.get('users', '1');
    expect(result).toEqual(user);
  });
});
```

---

Performance Considerations

Batch Operations

```typescript
async function bulkInsertUsers(users: User[]): Promise<void> {
  const database = await import('../db/indexed-db').then(m => m.db.initialize());
  const tx = database.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  users.forEach(user => store.put(user));
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
```

Cursor-Based Iteration

```typescript
async function* iterateLargeDataset(): AsyncGenerator<User> {
  const database = await import('../db/indexed-db').then(m => m.db.initialize());
  const tx = database.transaction('users', 'readonly');
  const request = tx.objectStore('users').openCursor();
  
  for await (const cursor of request) {
    yield cursor.value;
  }
}
```

---

Publishing Checklist

Before publishing your IndexedDB-based extension:

- [ ] Test in Chrome and Edge browsers
- [ ] Verify IndexedDB works in incognito mode
- [ ] Clear all test data before publishing
- [ ] Document data storage in privacy policy
- [ ] Handle quota exceeded gracefully
- [ ] Implement data export feature for users
- [ ] Add schema migration for future updates
- [ ] Test with large datasets for performance

---

Summary

IndexedDB provides powerful client-side storage enabling complex data management without backend dependencies. Key practices: define clear TypeScript schemas, implement repository pattern for clean data access, handle quota errors gracefully, and test with fake-indexedDB in CI. With proper architecture, IndexedDB enables extensions to handle substantial data workloads efficiently.
