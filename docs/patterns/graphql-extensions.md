# GraphQL in Chrome Extensions

GraphQL offers structured data fetching that pairs well with the constrained environment of Chrome extensions. This guide covers eight patterns for integrating GraphQL clients, caching, subscriptions, and offline support into Manifest V3 extensions.

> **Related guides:** [WebSocket in Service Workers](websocket-service-workers.md) | [State Management](state-management.md)

---

## Table of Contents

1. [GraphQL Client Setup in Service Worker](#1-graphql-client-setup-in-service-worker)
2. [Query Caching with chrome.storage](#2-query-caching-with-chromestorage)
3. [Subscriptions via Offscreen Document WebSocket](#3-subscriptions-via-offscreen-document-websocket)
4. [Optimistic Updates in Extension UI](#4-optimistic-updates-in-extension-ui)
5. [Schema-First Typing with Codegen](#5-schema-first-typing-with-codegen)
6. [Batching Queries for Performance](#6-batching-queries-for-performance)
7. [Authentication Headers and Token Refresh](#7-authentication-headers-and-token-refresh)
8. [Offline-First with Persisted Queries](#8-offline-first-with-persisted-queries)

---

## 1. GraphQL Client Setup in Service Worker

Service workers cannot use libraries that depend on DOM globals. Choose a lightweight, fetch-based client like `graphql-request` or configure `urql` with a minimal exchange pipeline.

### Using graphql-request

```typescript
// background/graphql-client.ts
import { GraphQLClient } from "graphql-request";

const client = new GraphQLClient("https://api.example.com/graphql", {
  headers: {
    "Content-Type": "application/json",
  },
});

export async function query<T>(
  document: string,
  variables?: Record<string, unknown>
): Promise<T> {
  return client.request<T>(document, variables);
}
```

### Using urql with a Custom Fetch Exchange

```typescript
// background/urql-client.ts
import { Client, fetchExchange, cacheExchange } from "@urql/core";

const urqlClient = new Client({
  url: "https://api.example.com/graphql",
  exchanges: [cacheExchange, fetchExchange],
  // Service workers support fetch natively
  fetch: globalThis.fetch,
});

export { urqlClient };
```

**Key constraint:** Avoid exchanges or plugins that reference `window`, `document`, or `XMLHttpRequest`. The service worker global is `ServiceWorkerGlobalScope`, not `Window`.

---

## 2. Query Caching with chrome.storage

In-memory caches are lost when the service worker goes idle. Persist query results to `chrome.storage.local` for durability across wake cycles.

```typescript
// background/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  queryHash: string;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function cachedQuery<T>(
  queryString: string,
  variables: Record<string, unknown> = {},
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const queryHash = await hashQuery(queryString, variables);
  const cacheKey = `gql_cache_${queryHash}`;

  // Check cache first
  const stored = await chrome.storage.local.get(cacheKey);
  const entry = stored[cacheKey] as CacheEntry<T> | undefined;

  if (entry && Date.now() - entry.timestamp < ttlMs) {
    return entry.data;
  }

  // Cache miss — fetch from network
  const data = await query<T>(queryString, variables);

  const newEntry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    queryHash,
  };

  await chrome.storage.local.set({ [cacheKey]: newEntry });
  return data;
}

async function hashQuery(
  query: string,
  variables: Record<string, unknown>
): Promise<string> {
  const payload = JSON.stringify({ query, variables });
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

**Storage limits:** `chrome.storage.local` has a 10 MB default (unlimited with the `unlimitedStorage` permission). Implement eviction for large datasets.

---

## 3. Subscriptions via Offscreen Document WebSocket

Manifest V3 service workers cannot hold persistent WebSocket connections. Use an offscreen document to maintain the connection and relay subscription data back to the service worker.

```typescript
// background/service-worker.ts
async function setupSubscriptionRelay(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextType: "OFFSCREEN_DOCUMENT" as chrome.runtime.ContextType,
  });

  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.WEB_RTC_PEER_CONNECTION],
      justification: "Maintain GraphQL subscription WebSocket",
    });
  }

  chrome.runtime.sendMessage({
    type: "SUBSCRIBE",
    payload: {
      query: `subscription OnNewMessage { messageAdded { id content author } }`,
    },
  });
}
```

```typescript
// offscreen/subscription-handler.ts
import { createClient } from "graphql-ws";

const wsClient = createClient({
  url: "wss://api.example.com/graphql",
  connectionParams: async () => {
    const { token } = await chrome.storage.local.get("token");
    return { authorization: `Bearer ${token}` };
  },
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SUBSCRIBE") {
    wsClient.subscribe(
      { query: message.payload.query },
      {
        next: (data) => {
          chrome.runtime.sendMessage({
            type: "SUBSCRIPTION_DATA",
            payload: data,
          });
        },
        error: (err) => console.error("Subscription error:", err),
        complete: () => console.log("Subscription complete"),
      }
    );
  }
});
```

See [WebSocket in Service Workers](websocket-service-workers.md) for reconnection strategies and keep-alive patterns.

---

## 4. Optimistic Updates in Extension UI

Apply mutations immediately in the UI and reconcile when the server responds. This is critical for popup and side panel interfaces where perceived latency matters.

```typescript
// popup/hooks/useOptimisticMutation.ts
import { useState, useCallback } from "react";

interface OptimisticOptions<TData, TVars> {
  mutation: string;
  variables: TVars;
  optimisticResponse: TData;
  rollback: (previous: TData) => void;
  update: (data: TData) => void;
}

export function useOptimisticMutation<TData, TVars>() {
  const [pending, setPending] = useState(false);

  const execute = useCallback(
    async (options: OptimisticOptions<TData, TVars>) => {
      const { mutation, variables, optimisticResponse, rollback, update } =
        options;

      // Apply optimistic update immediately
      update(optimisticResponse);
      setPending(true);

      try {
        const response = await chrome.runtime.sendMessage({
          type: "GRAPHQL_MUTATION",
          payload: { query: mutation, variables },
        });

        // Reconcile with actual server response
        update(response.data);
      } catch (error) {
        // Rollback on failure
        rollback(optimisticResponse);
        console.error("Mutation failed, rolled back:", error);
      } finally {
        setPending(false);
      }
    },
    []
  );

  return { execute, pending };
}
```

```typescript
// Usage in a component
const { execute, pending } = useOptimisticMutation<Todo, { id: string }>();

async function toggleTodo(todo: Todo) {
  await execute({
    mutation: `mutation ToggleTodo($id: ID!) { toggleTodo(id: $id) { id completed } }`,
    variables: { id: todo.id },
    optimisticResponse: { ...todo, completed: !todo.completed },
    update: (data) => setTodos((prev) => prev.map((t) => (t.id === data.id ? data : t))),
    rollback: () => setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t))),
  });
}
```

---

## 5. Schema-First Typing with Codegen

Use `graphql-codegen` to generate TypeScript types from your schema. This catches query errors at build time rather than runtime.

### Configuration

```yaml
# codegen.yml
schema: "https://api.example.com/graphql"
documents: "src/**/*.graphql"
generates:
  src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-graphql-request
    config:
      enumsAsTypes: true
      skipTypename: true
```

### Typed Query Usage

```typescript
// src/queries/todos.graphql
query GetTodos($filter: TodoFilter) {
  todos(filter: $filter) {
    id
    title
    completed
    createdAt
  }
}

mutation CreateTodo($input: CreateTodoInput!) {
  createTodo(input: $input) {
    id
    title
  }
}
```

```typescript
// background/api.ts
import { getSdk } from "../generated/graphql";
import { GraphQLClient } from "graphql-request";

const client = new GraphQLClient("https://api.example.com/graphql");
const sdk = getSdk(client);

// Fully typed — arguments and return values are inferred
export async function fetchTodos() {
  const { todos } = await sdk.GetTodos({ filter: { completed: false } });
  return todos; // Type: Array<{ id: string; title: string; completed: boolean; createdAt: string }>
}
```

Run codegen as a build step: `npx graphql-codegen --config codegen.yml`

---

## 6. Batching Queries for Performance

Combine multiple queries into a single HTTP request to reduce overhead, especially important when the service worker wakes and needs to hydrate multiple UI components.

```typescript
// background/batch-client.ts
interface PendingQuery {
  document: string;
  variables: Record<string, unknown>;
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
}

class BatchingClient {
  private queue: PendingQuery[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly batchIntervalMs = 50;
  private readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  query<T>(document: string, variables: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ document, variables, resolve: resolve as (d: unknown) => void, reject });

      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchIntervalMs);
      }
    });
  }

  private async flush(): Promise<void> {
    const batch = this.queue.splice(0);
    this.timer = null;

    if (batch.length === 0) return;

    const payload = batch.map((q, i) => ({
      query: q.document,
      variables: q.variables,
    }));

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const results: Array<{ data?: unknown; errors?: unknown[] }> =
        await response.json();

      results.forEach((result, i) => {
        if (result.errors) {
          batch[i].reject(new Error(JSON.stringify(result.errors)));
        } else {
          batch[i].resolve(result.data);
        }
      });
    } catch (error) {
      batch.forEach((q) => q.reject(error as Error));
    }
  }
}

export const batchClient = new BatchingClient("https://api.example.com/graphql");
```

**Note:** Your GraphQL server must support batched queries (an array of operations in a single request). Apollo Server and Hasura support this natively.

---

## 7. Authentication Headers and Token Refresh

Extensions often use OAuth tokens that expire. Wrap the client to handle transparent token refresh without interrupting queries.

```typescript
// background/auth-client.ts
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class AuthenticatedGraphQLClient {
  private endpoint: string;
  private refreshPromise: Promise<string> | null = null;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async query<T>(document: string, variables?: Record<string, unknown>): Promise<T> {
    const token = await this.getValidToken();

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: document, variables }),
    });

    const json = await response.json();

    // Handle expired token response from server
    if (json.errors?.some((e: { extensions?: { code?: string } }) =>
      e.extensions?.code === "UNAUTHENTICATED"
    )) {
      await this.forceRefresh();
      return this.query<T>(document, variables);
    }

    if (json.errors) {
      throw new Error(JSON.stringify(json.errors));
    }

    return json.data as T;
  }

  private async getValidToken(): Promise<string> {
    const stored = await chrome.storage.local.get("tokenPair");
    const tokenPair = stored.tokenPair as TokenPair | undefined;

    if (!tokenPair) {
      throw new Error("Not authenticated");
    }

    // Refresh proactively if token expires within 60 seconds
    if (Date.now() > tokenPair.expiresAt - 60_000) {
      return this.refreshToken(tokenPair.refreshToken);
    }

    return tokenPair.accessToken;
  }

  private async refreshToken(refreshToken: string): Promise<string> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `mutation RefreshToken($token: String!) {
            refreshToken(token: $token) { accessToken refreshToken expiresIn }
          }`,
          variables: { token: refreshToken },
        }),
      });

      const { data } = await response.json();
      const newPair: TokenPair = {
        accessToken: data.refreshToken.accessToken,
        refreshToken: data.refreshToken.refreshToken,
        expiresAt: Date.now() + data.refreshToken.expiresIn * 1000,
      };

      await chrome.storage.local.set({ tokenPair: newPair });
      return newPair.accessToken;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async forceRefresh(): Promise<void> {
    const stored = await chrome.storage.local.get("tokenPair");
    const tokenPair = stored.tokenPair as TokenPair;
    await this.refreshToken(tokenPair.refreshToken);
  }
}

export const authClient = new AuthenticatedGraphQLClient(
  "https://api.example.com/graphql"
);
```

The deduplication of refresh calls (`this.refreshPromise`) is essential. Multiple queries firing simultaneously after a wake-up would otherwise trigger parallel refresh requests.

---

## 8. Offline-First with Persisted Queries

Persisted queries let you execute operations by hash rather than sending the full query text. Combined with local storage, this enables offline-first behavior.

```typescript
// build-step/extract-queries.ts
// Run at build time to generate a query manifest
import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";

const manifest: Record<string, string> = {};

const files = globSync("src/**/*.graphql");
for (const file of files) {
  const content = readFileSync(file, "utf-8");
  const hash = createHash(content);
  manifest[hash] = content;
}

writeFileSync("src/generated/query-manifest.json", JSON.stringify(manifest, null, 2));
```

```typescript
// background/offline-client.ts
import queryManifest from "../generated/query-manifest.json";

interface OfflineQueueEntry {
  hash: string;
  variables: Record<string, unknown>;
  timestamp: number;
}

class OfflineGraphQLClient {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async query<T>(
    hash: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    // Try network first
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
          variables,
        }),
      });

      const json = await response.json();

      // Server doesn't have the persisted query — send full text
      if (json.errors?.[0]?.message === "PersistedQueryNotFound") {
        return this.queryWithFullText<T>(hash, variables);
      }

      // Cache successful responses
      await this.cacheResponse(hash, variables, json.data);
      return json.data as T;
    } catch {
      // Offline — return cached data or queue for later
      return this.handleOffline<T>(hash, variables);
    }
  }

  private async queryWithFullText<T>(
    hash: string,
    variables: Record<string, unknown>
  ): Promise<T> {
    const fullQuery = queryManifest[hash];
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: fullQuery,
        extensions: { persistedQuery: { version: 1, sha256Hash: hash } },
        variables,
      }),
    });
    const json = await response.json();
    await this.cacheResponse(hash, variables, json.data);
    return json.data as T;
  }

  private async handleOffline<T>(
    hash: string,
    variables: Record<string, unknown>
  ): Promise<T> {
    const cacheKey = `gql_offline_${hash}_${JSON.stringify(variables)}`;
    const cached = await chrome.storage.local.get(cacheKey);

    if (cached[cacheKey]) {
      return cached[cacheKey] as T;
    }

    // Queue mutations for replay when back online
    await this.addToOfflineQueue(hash, variables);
    throw new Error("Offline and no cached data available");
  }

  private async cacheResponse(
    hash: string,
    variables: Record<string, unknown>,
    data: unknown
  ): Promise<void> {
    const cacheKey = `gql_offline_${hash}_${JSON.stringify(variables)}`;
    await chrome.storage.local.set({ [cacheKey]: data });
  }

  private async addToOfflineQueue(
    hash: string,
    variables: Record<string, unknown>
  ): Promise<void> {
    const { offlineQueue = [] } = await chrome.storage.local.get("offlineQueue");
    (offlineQueue as OfflineQueueEntry[]).push({
      hash,
      variables,
      timestamp: Date.now(),
    });
    await chrome.storage.local.set({ offlineQueue });
  }

  async replayOfflineQueue(): Promise<void> {
    const { offlineQueue = [] } = await chrome.storage.local.get("offlineQueue");
    const queue = offlineQueue as OfflineQueueEntry[];

    const successful: number[] = [];
    for (let i = 0; i < queue.length; i++) {
      try {
        await this.query(queue[i].hash, queue[i].variables);
        successful.push(i);
      } catch {
        break; // Stop on first failure to preserve order
      }
    }

    const remaining = queue.filter((_, i) => !successful.includes(i));
    await chrome.storage.local.set({ offlineQueue: remaining });
  }
}

// Replay queued mutations when connectivity returns
chrome.runtime.onStartup.addListener(async () => {
  const client = new OfflineGraphQLClient("https://api.example.com/graphql");
  await client.replayOfflineQueue();
});
```

---

## Summary

| Pattern | Key Benefit | Watch Out For |
|---------|------------|---------------|
| Client setup | Lightweight, no DOM deps | Avoid `window`/`document` references |
| Storage caching | Survives SW idle | 10 MB default limit, implement eviction |
| Offscreen subscriptions | Persistent connections | One offscreen doc per extension |
| Optimistic updates | Instant UI feedback | Must handle rollback on failure |
| Codegen typing | Compile-time safety | Requires build step integration |
| Query batching | Fewer HTTP round trips | Server must support batched operations |
| Token refresh | Transparent re-auth | Deduplicate concurrent refresh calls |
| Persisted queries | Offline support, smaller payloads | Need build step for hash manifest |

Each pattern addresses a specific constraint of the Manifest V3 environment. Combine them based on your extension's requirements -- a data-heavy dashboard extension might use all eight, while a simple API integration may only need patterns 1, 2, and 7.
