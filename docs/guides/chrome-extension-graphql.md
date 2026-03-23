---
layout: default
title: "Chrome Extension GraphQL Integration — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-graphql/"
---
# Integrating GraphQL APIs into Chrome Extensions

This guide covers best practices for integrating GraphQL APIs into Chrome extensions, focusing on bundle size, caching, and extension-specific constraints.

## Client Setup {#client-setup}

### Lightweight Clients vs Apollo {#lightweight-clients-vs-apollo}

For Chrome extensions, prefer lightweight GraphQL clients over full-featured ones like Apollo:

| Client | Bundle Size | Features |
|--------|-------------|----------|
| graphql-request | ~10KB | Basic queries/mutations |
| urql | ~15KB | Caching, exchanges |
| Apollo Client | ~40KB+ | Full cache, subscriptions |

**Why lightweight matters**: Extensions have strict bundle size limits. Every KB impacts load time and memory usage.

### graphql-request Setup {#graphql-request-setup}

```typescript
// src/utils/graphql.ts
import { GraphQLClient } from 'graphql-request';

const endpoint = 'https://api.example.com/graphql';

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: {
    authorization: `Bearer ${getAuthToken()}`,
  },
});

export async function query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  return graphqlClient.request(query, variables);
}
```

## Fetch-Based Queries from Service Worker {#fetch-based-queries-from-service-worker}

Service workers support `fetch` natively. Use fetch-based clients directly:

```typescript
// background/graphql.ts
async function fetchUser(id: string): Promise<User> {
  const response = await fetch('https://api.example.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getToken()}`,
    },
    body: JSON.stringify({
      query: `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            name
            email
          }
        }
      `,
      variables: { id },
    }),
  });

  const { data, errors } = await response.json();
  if (errors) {
    throw new GraphQLError(errors);
  }
  return data.user;
}
```

## Caching Strategies {#caching-strategies}

### Client-Side Cache in chrome.storage {#client-side-cache-in-chromestorage}

Store query results in chrome.storage for persistence across extension restarts:

```typescript
// utils/cache.ts
const CACHE_PREFIX = 'gql_cache:';

export async function getCached<T>(key: string): Promise<T | null> {
  const result = await chrome.storage.local.get(`${CACHE_PREFIX}${key}`);
  const cached = result[`${CACHE_PREFIX}${key}`];
  
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }
  return null;
}

export async function setCached<T>(key: string, data: T, ttlSeconds = 300): Promise<void> {
  await chrome.storage.local.set({
    [`${CACHE_PREFIX}${key}`]: {
      data,
      expires: Date.now() + ttlSeconds * 1000,
    },
  });
}
```

### Normalized Caching with urql {#normalized-caching-with-urql}

urql provides normalized caching that tracks entities across queries:

```typescript
import { createClient, cacheExchange } from 'urql';

export const urqlClient = createClient({
  url: 'https://api.example.com/graphql',
  exchanges: [cacheExchange],
});
```

## Subscriptions {#subscriptions}

Service workers cannot maintain WebSocket connections. Use an **offscreen document** for subscriptions:

```typescript
// offscreen.ts (offscreen document)
const ws = new WebSocket('wss://api.example.com/graphql');

ws.onmessage = (event) => {
  chrome.runtime.sendMessage({
    type: 'GRAPHQL_SUBSCRIPTION',
    data: JSON.parse(event.data),
  });
};
```

```typescript
// background/service-worker.ts
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'GRAPHQL_SUBSCRIPTION') {
    // Handle subscription data
  }
});
```

## Authentication {#authentication}

### Bearer Token in Headers {#bearer-token-in-headers}

```typescript
export function createAuthenticatedClient(token: string): GraphQLClient {
  return new GraphQLClient(endpoint, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
}
```

### Token Refresh Flow {#token-refresh-flow}

```typescript
async function getValidToken(): Promise<string> {
  const token = await getStoredToken();
  const expires = await getTokenExpiry();
  
  if (expires > Date.now() + 60000) {
    return token;
  }
  
  // Refresh token
  const newToken = await refreshAuthToken();
  await storeToken(newToken);
  return newToken;
}
```

## Error Handling {#error-handling}

### GraphQL Errors vs Network Errors {#graphql-errors-vs-network-errors}

```typescript
interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

async function handleGraphQLResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new NetworkError(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const result: GraphQLResponse<T> = await response.json();
  
  if (result.errors) {
    throw new GraphQLError(result.errors.map(e => e.message).join(', '));
  }
  
  return result.data!;
}
```

See [Extension Error Reporting](../guides/extension-error-reporting.md) for logging strategies.

## Batching Queries {#batching-queries}

Combine multiple queries to reduce network calls:

```typescript
import { batchRequests } from 'graphql-request';

const results = await batchRequests(endpoint, [
  { document: userQuery, variables: { id: '1' } },
  { document: postsQuery, variables: { userId: '1' } },
]);
```

## Code Generation {#code-generation}

Use graphql-codegen for type-safe operations:

```yaml
# codegen.yml
schema: https://api.example.com/graphql
documents: "src/**/*.graphql"
generates:
  src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
```

```typescript
import { GetUserDocument, GetUserQuery } from '../generated/graphql';

const result = await client.query<GetUserQuery>(GetUserDocument, { id: '1' });
```

## Offline Support {#offline-support}

Queue mutations when offline, replay when online:

```typescript
// utils/offline-queue.ts
const MUTATION_QUEUE = 'offline_mutations';

export async function queueMutation(mutation: MutationRequest): Promise<void> {
  const queue = await chrome.storage.local.get(MUTATION_QUEUE);
  queue[MUTATION_QUEUE].push(mutation);
  await chrome.storage.local.set(queue);
}

export async function replayMutations(): Promise<void> {
  const queue = await chrome.storage.local.get(MUTATION_QUEUE);
  
  for (const mutation of queue[MUTATION_QUEUE]) {
    await executeMutation(mutation);
  }
  
  await chrome.storage.local.set({ [MUTATION_QUEUE]: [] });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'online') {
    replayMutations();
  }
});
```

## Testing {#testing}

Mock the GraphQL server for unit tests:

```typescript
import { graphql, HttpResponse } from 'msw';

const handlers = [
  graphql.query('GetUser', () => {
    return HttpResponse.json({
      data: { user: { id: '1', name: 'Test User' } },
    });
  }),
];

export const graphQLHandlers = handlers;
```

## Performance Tips {#performance-tips}

- **Request only needed fields**: GraphQL's main advantage is fetching precisely what you need
- **Use fragments**: Share field selections across queries
- **EnablePersistedQueries**: Reduce request size by sending query IDs instead of full queries

## Bundle Optimization {#bundle-optimization}

Tree-shake unused GraphQL features:

```typescript
// Only import what you need
import { request } from 'graphql-request';
// vs
import { ApolloClient, InMemoryCache } from '@apollo/client'; // heavier
```

## Related Patterns {#related-patterns}

- [Cross-Origin Requests](../patterns/cross-origin-requests.md)
- [WebSocket in Service Workers](../patterns/websocket-service-workers.md)
- [Extension Error Reporting](../guides/extension-error-reporting.md)

## Related Articles {#related-articles}

## Related Articles

- [GraphQL Patterns](../patterns/graphql-extensions.md)
- [REST API Patterns](../guides/rest-api-patterns.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
