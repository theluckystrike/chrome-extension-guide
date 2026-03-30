---
layout: default
title: "Chrome Extension IndexedDB Guide: Storing Large Data Sets Efficiently"
description: "Master IndexedDB for Chrome extensions. Learn efficient storage of large datasets, schema design, transactions, indexing, Dexie.js integration, offline-first patterns, and migration strategies."
canonical_url: "https://bestchromeextensions.com/docs/guides/chrome-extension-indexeddb-storage/"
last_modified_at: 2026-01-15
---

Chrome Extension IndexedDB Guide: Storing Large Data Sets Efficiently

When building Chrome extensions that need to handle large amounts of structured data, the Chrome Storage API often falls short. IndexedDB provides a powerful client-side NoSQL database solution that enables Chrome extensions to store significant volumes of data with full transactional support, complex queries through indexes, and efficient data retrieval. This comprehensive guide walks you through implementing IndexedDB in your Chrome extension, from basic concepts to advanced patterns used by production extensions.

Understanding IndexedDB vs chrome.storage

Before diving into implementation, it's crucial to understand when IndexedDB is the right choice over the simpler Chrome Storage API. Each storage mechanism has distinct characteristics that make it suitable for different scenarios.

The [Chrome Storage API](/docs/guides/storage-api/) provides straightforward key-value storage with automatic JSON serialization and built-in sync capabilities, but it comes with significant limitations. The `chrome.storage.local` area offers only 10MB by default, while `chrome.storage.sync` restricts you to 100KB total with 8KB per item. These limits work well for user preferences and small configuration files but become problematic when storing large datasets like cached API responses, user-generated content, or historical data.

IndexedDB, on the other hand, provides virtually unlimited storage (subject to user disk space) with support for complex data structures, transactions, and efficient querying through indexes. According to the [Storage Quota Management](/docs/guides/storage-quota-management/) documentation, IndexedDB operates under the same quota system as other origin-based storage, but the practical limits are far more generous than chrome.storage.

Here's a practical comparison that illustrates when to use each technology:

| Feature | chrome.storage | IndexedDB |
|---------|---------------|-----------|
| Maximum Storage | 10MB local, 100KB sync | Virtually unlimited |
| Query Capability | Key-value only | Complex queries via indexes |
| Transactions | None | Full ACID transactions |
| Data Types | JSON-serializable | Any structured cloneable type |
| Performance with Large Data | Degrades significantly | Optimized for scale |
| API Complexity | Simple | Steeper learning curve |
| Sync Support | Built-in sync | Manual implementation required |

For most extensions, a hybrid approach works best: use chrome.storage for user preferences and settings that benefit from automatic sync, and use IndexedDB for large datasets, cached content, and complex data that doesn't need cross-device synchronization.

Setting Up IndexedDB in Your Extension

IndexedDB doesn't require special permissions in Manifest V3, it operates within your extension's origin just like web pages. However, you'll need to structure your code carefully since the API is callback-based and can become unwieldy without abstraction.

Opening a Database

Every IndexedDB operation begins with opening a database connection. The `open` method takes a name and version number:

```javascript
const DB_NAME = 'MyExtensionDB';
const DB_VERSION = 1;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Database open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Schema creation happens here
      console.log('Database upgrade needed');
    };
  });
}
```

The `onupgradeneeded` event is critical, it's the only place where you can create object stores and indexes. This event fires when the database is being created for the first time or when the version number increases.

Schema Design for Chrome Extensions

Designing an efficient schema requires understanding your access patterns. Unlike traditional relational databases, IndexedDB is a key-value store with secondary indexes, so your schema should optimize for how you'll query the data.

Creating Object Stores

Object stores are similar to tables in relational databases. Each store holds records with a unique key:

```javascript
request.onupgradeneeded = (event) => {
  const db = event.target.result;

  // Create a store for cached articles
  if (!db.objectStoreNames.contains('articles')) {
    const articlesStore = db.createObjectStore('articles', { 
      keyPath: 'id',
      autoIncrement: false 
    });
    
    // Create indexes for common queries
    articlesStore.createIndex('category', 'category', { unique: false });
    articlesStore.createIndex('publishedDate', 'publishedDate', { unique: false });
    articlesStore.createIndex('author', 'author', { unique: false });
  }

  // Create a store for user sessions
  if (!db.objectStoreNames.contains('sessions')) {
    const sessionsStore = db.createObjectStore('sessions', {
      keyPath: 'sessionId',
      autoIncrement: true
    });
    
    sessionsStore.createIndex('userId', 'userId', { unique: false });
    sessionsStore.createIndex('timestamp', 'timestamp', { unique: false });
  }
};
```

The `keyPath` option specifies the property that uniquely identifies each record. Using `autoIncrement: true` generates numeric keys automatically, but for most extension use cases, you'll want to use meaningful keys like UUIDs or URLs.

Understanding Indexes

Indexes are crucial for query performance. Without an index on a property, IndexedDB must scan every record in the object store, a operation that becomes prohibitively slow as your dataset grows. Always create indexes for properties you plan to filter or sort by.

Consider creating compound indexes for complex queries:

```javascript
// Compound index for category + date queries
articlesStore.createIndex('categoryDate', ['category', 'publishedDate'], { 
  unique: false 
});
```

Working with Transactions

Transactions are fundamental to IndexedDB's reliability. They ensure data consistency by grouping operations that either all succeed or all fail together.

Basic Transaction Patterns

```javascript
async function addArticle(article) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['articles'], 'readwrite');
    const store = transaction.objectStore('articles');
    const request = store.add(article);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getArticleById(id) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['articles'], 'readonly');
    const store = transaction.objectStore('articles');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

The transaction constructor takes an array of object store names and a mode. Use `'readwrite'` for operations that modify data and `'readonly'` for purely retrieval operations.

Batch Operations

For importing large datasets, use batch operations to improve performance:

```javascript
async function bulkAddArticles(articles) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['articles'], 'readwrite');
    const store = transaction.objectStore('articles');

    articles.forEach(article => {
      store.add(article);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
```

Querying with Cursors

Cursors allow you to iterate through records efficiently, which is particularly useful for bulk operations and range queries:

```javascript
async function getArticlesByCategory(category) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['articles'], 'readonly');
    const store = transaction.objectStore('articles');
    const index = store.index('category');
    const request = index.openCursor(IDBKeyRange.only(category));

    const results = [];
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

async function getRecentArticles(limit = 10) {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['articles'], 'readonly');
    const store = transaction.objectStore('articles');
    const index = store.index('publishedDate');
    
    // Open cursor in reverse order to get most recent
    const request = index.openCursor(null, 'prev');

    const results = [];
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}
```

The `'prev'` direction is essential when you want results in descending order, such as showing the most recent items first.

Versioning and Database Upgrades

As your extension evolves, you'll need to modify your database schema. IndexedDB's version-based upgrade system makes this possible without data loss.

Implementing Schema Migrations

```javascript
const DB_NAME = 'MyExtensionDB';
const CURRENT_VERSION = 3;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, CURRENT_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      console.log(`Migrating database from version ${oldVersion} to ${CURRENT_VERSION}`);

      // Version 1: Initial schema
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('articles')) {
          const store = db.createObjectStore('articles', { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
        }
      }

      // Version 2: Add sessions store
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        }
      }

      // Version 3: Add tags to articles
      if (oldVersion < 2) {
        // Data migration: add default tags to existing articles
        const transaction = event.target.transaction;
        const store = transaction.objectStore('articles');
        
        store.openCursor().onsuccess = (cursorEvent) => {
          const cursor = cursorEvent.target.result;
          if (cursor) {
            const article = cursor.value;
            if (!article.tags) {
              article.tags = [];
              cursor.update(article);
            }
            cursor.continue();
          }
        };
      }
    };
  });
}
```

Always increment the version number when making schema changes. The `oldVersion` property tells you which migration scripts to run, allowing for incremental upgrades from any previous version.

Using Dexie.js for Simplified IndexedDB

The raw IndexedDB API is powerful but verbose. Dexie.js provides a lightweight wrapper that makes IndexedDB development significantly more enjoyable while maintaining full functionality.

Getting Started with Dexie.js

First, add Dexie to your project:

```bash
npm install dexie
```

Then create a type-safe database wrapper:

```javascript
import Dexie from 'dexie';

// Define your database schema
class MyExtensionDB extends Dexie {
  constructor() {
    super('MyExtensionDB');
    
    this.version(1).stores({
      articles: 'id, category, publishedDate, author, [category+publishedDate]',
      sessions: '++id, userId, timestamp',
      bookmarks: '++id, url, folderId, createdAt'
    });
    
    this.articles = this.table('articles');
    this.sessions = this.table('sessions');
    this.bookmarks = this.table('bookmarks');
  }
}

const db = new MyExtensionDB();
```

The schema string syntax is intuitive: primary keys are listed first, followed by indexed properties. Compound indexes use square brackets.

Querying with Dexie.js

Dexie's query syntax closely resembles MongoDB:

```javascript
// Get all articles
const allArticles = await db.articles.toArray();

// Get article by ID
const article = await db.articles.get('article-123');

// Query by index
const javascriptArticles = await db.articles
  .where('category')
  .equals('javascript')
  .toArray();

// Complex queries with compound indexes
const recentJavaScript = await db.articles
  .where('[category+publishedDate]')
  .between(['javascript', new Date(2024, 0, 1)], ['javascript', new Date()])
  .toArray();

// Chain multiple conditions
const result = await db.articles
  .where('author').equals('john@example.com')
  .and(article => article.published)
  .sortBy('publishedDate');
```

Collection Methods

Dexie provides powerful collection methods for common operations:

```javascript
// Bulk operations
await db.articles.bulkAdd([
  { id: '1', title: 'Article 1', category: 'tech' },
  { id: '2', title: 'Article 2', category: 'tech' },
  { id: '3', title: 'Article 3', category: 'life' }
]);

// Update with modification
await db.articles.where('category').equals('tech').modify({
  category: 'technology',
  updatedAt: new Date()
});

// Delete with conditions
await db.articles.where('publishedDate').below(oldDate).delete();

// Count
const techCount = await db.articles.where('category').equals('tech').count();
```

Using Dexie with React and Extension Contexts

For modern extension architectures, combining Dexie with React Query or similar data fetching libraries provides excellent developer experience:

```javascript
// db.js - Database setup
import Dexie from 'dexie';

export const db = new Dexie('ExtensionDB');
db.version(1).stores({
  cache: 'url, timestamp',
  userData: 'id, email, [+lastLogin]',  // + makes it sortable
  settings: 'key'
});

// hooks/useCachedData.js
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export function useCachedData() {
  return useLiveQuery(() => 
    db.cache
      .orderBy('timestamp')
      .reverse()
      .limit(100)
      .toArray()
  );
}
```

The `useLiveQuery` hook automatically keeps your UI in sync when the database changes, making it perfect for popup and options page interfaces.

Offline-First Patterns for Extensions

Offline-first architecture ensures your extension works smoothly regardless of network connectivity. IndexedDB is the foundation for solid offline functionality.

Caching API Responses

```javascript
class APICache {
  constructor(db) {
    this.db = db;
  }

  async get(url) {
    const cached = await this.db.cache.get(url);
    
    if (cached) {
      const isExpired = Date.now() - cached.timestamp > cached.ttl;
      
      if (!isExpired) {
        console.log('Cache hit:', url);
        return cached.data;
      }
      
      // Remove expired entry
      await this.db.cache.delete(url);
    }
    
    return null;
  }

  async set(url, data, ttlMs = 3600000) {
    await this.db.cache.put({
      url,
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  async fetchWithCache(url, options = {}) {
    // Try cache first
    const cached = await this.get(url);
    if (cached && options.cacheFirst) {
      return cached;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      // Cache the response
      await this.set(url, data, options.ttl);
      
      return data;
    } catch (error) {
      // Return stale cache on network failure
      if (cached) {
        console.warn('Network failed, returning stale cache');
        return cached;
      }
      throw error;
    }
  }
}

const cache = new APICache(db);
```

Syncing When Online

Implement a sync manager that queues changes when offline and processes them when connectivity returns:

```javascript
class SyncManager {
  constructor(db) {
    this.db = db;
    this.isOnline = navigator.onLine;
    
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  async queueChange(operation) {
    await this.db.syncQueue.add({
      ...operation,
      timestamp: Date.now(),
      status: 'pending'
    });
  }

  async handleOnline() {
    console.log('Connection restored, syncing...');
    this.isOnline = true;
    await this.processQueue();
  }

  handleOffline() {
    console.log('Offline mode enabled');
    this.isOnline = false;
  }

  async processQueue() {
    const pending = await this.db.syncQueue
      .where('status')
      .equals('pending')
      .toArray();

    for (const operation of pending) {
      try {
        await this.executeOperation(operation);
        await this.db.syncQueue.update(operation.id, { status: 'completed' });
      } catch (error) {
        console.error('Sync failed for operation:', operation, error);
        await this.db.syncQueue.update(operation.id, { 
          status: 'failed',
          error: error.message 
        });
      }
    }
  }

  async executeOperation(operation) {
    const { type, store, data } = operation;
    
    switch (type) {
      case 'create':
        await this.db[store].add(data);
        break;
      case 'update':
        await this.db[store].put(data);
        break;
      case 'delete':
        await this.db[store].delete(data.id);
        break;
    }
  }
}
```

Quota Management Strategies

While IndexedDB offers generous storage, you should implement monitoring and management to prevent hitting browser limits.

Checking Storage Usage

```javascript
async function getStorageEstimate() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentUsed: (estimate.usage / estimate.quota) * 100
    };
  }
  return null;
}

async function logStorageStatus() {
  const status = await getStorageEstimate();
  if (status) {
    console.log(`Storage: ${(status.usage / 1024 / 1024).toFixed(2)}MB / ${(status.quota / 1024 / 1024).toFixed(2)}MB (${status.percentUsed.toFixed(2)}%)`);
  }
}
```

Implementing Cleanup Policies

```javascript
class StorageManager {
  constructor(db) {
    this.db = db;
    this.MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  async cleanupOldData() {
    const cutoffDate = Date.now() - this.MAX_CACHE_AGE;
    
    // Clean old cache entries
    const oldCache = await this.db.cache
      .where('timestamp')
      .below(cutoffDate)
      .toArray();
    
    await this.db.cache.bulkDelete(oldCache.map(c => c.url));
    
    console.log(`Cleaned up ${oldCache.length} old cache entries`);
    return oldCache.length;
  }

  async enforceStorageLimit(maxMB = 500) {
    const maxBytes = maxMB * 1024 * 1024;
    let status = await getStorageEstimate();
    
    while (status && status.percentUsed > 80) {
      // Get oldest items
      const oldest = await this.db.cache
        .orderBy('timestamp')
        .limit(10)
        .toArray();
      
      if (oldest.length === 0) break;
      
      // Delete oldest items
      await this.db.cache.bulkDelete(oldest.map(c => c.url));
      
      status = await getStorageEstimate();
      console.log('Storage cleanup performed');
    }
  }
}
```

Migration Strategies for Production Extensions

When releasing updates that modify your IndexedDB schema, proper migration ensures user data is preserved and the extension continues functioning correctly.

Backup Before Migration

Always backup critical data before running migrations:

```javascript
async function backupDatabase(db) {
  const backup = {
    timestamp: Date.now(),
    version: db.version,
    data: {}
  };

  for (const storeName of db.objectStoreNames) {
    backup.data[storeName] = await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Store backup in a separate database or export
  const backupDB = await openBackupDatabase();
  await backupDB.backups.add(backup);
  
  return backup;
}
```

Safe Migration Pattern

```javascript
async function safeMigration() {
  const backupDB = await openBackupDatabase();
  
  try {
    const db = await openDatabase();
    
    // Verify critical data exists
    const articleCount = await db.articles.count();
    console.log(`Current articles: ${articleCount}`);
    
    // Perform migration (version upgrade triggers onupgradeneeded)
    // ... migration code ...
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    
    // Restore from backup if critical failure
    const backup = await backupDB.backups.orderBy('timestamp').last();
    if (backup) {
      console.log('Attempting restore from backup');
      // Restore logic
    }
  }
}
```

Conclusion

IndexedDB provides Chrome extension developers with enterprise-grade storage capabilities that scale far beyond the limitations of chrome.storage. By understanding the core concepts, object stores, transactions, indexes, and versioning, you can build solid data layers that handle large datasets efficiently.

The key decisions involve choosing between raw IndexedDB and wrapper libraries like Dexie.js based on your team's familiarity and project complexity. For most extensions, Dexie's simpler API significantly reduces development time while maintaining performance. Combined with offline-first patterns, proper quota management, and thoughtful migration strategies, IndexedDB enables extensions that deliver excellent user experiences regardless of network conditions.

For more insights into building production-ready Chrome extensions, explore the [Chrome Extension Guide](/). your complete reference for creating powerful browser extensions with the latest Chrome APIs.

Visit [zovo.one](https://zovo.one) for more browser optimization tools, extensions, and productivity resources.

---

*This guide was last updated in 2026. IndexedDB API features and browser limits may vary based on your Chrome version and extension manifest version.*
