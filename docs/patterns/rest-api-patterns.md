---
layout: default
title: "Chrome Extension Rest Api Patterns — Best Practices"
description: "Consume REST APIs securely in Chrome extensions."
canonical_url: "https://bestchromeextensions.com/patterns/rest-api-patterns/"
---

# REST API Patterns in Chrome Extensions

REST APIs remain the most common integration point for Chrome extensions. The Manifest V3 service worker lifecycle, network constraints, and storage limitations create unique challenges that require purpose-built patterns. This guide covers eight essential patterns with TypeScript implementations.

> **Related guides:** [Error Handling](error-handling.md) | [OAuth and Identity](oauth-identity.md)

---

## Table of Contents {#table-of-contents}

1. [Fetch Wrapper with Retry and Timeout](#1-fetch-wrapper-with-retry-and-timeout)
2. [Request Intercepting with declarativeNetRequest](#2-request-intercepting-with-declarativenetrequest)
3. [API Response Caching Strategies](#3-api-response-caching-strategies)
4. [Rate Limiting and Request Queuing](#4-rate-limiting-and-request-queuing)
5. [Authentication: Bearer Tokens, API Keys, OAuth Refresh](#5-authentication-bearer-tokens-api-keys-oauth-refresh)
6. [Pagination Handling in Background](#6-pagination-handling-in-background)
7. [Background Sync with chrome.alarms](#7-background-sync-with-chromealarms)
8. [Error Handling and Offline Detection](#8-error-handling-and-offline-detection)

---

## 1. Fetch Wrapper with Retry and Timeout {#1-fetch-wrapper-with-retry-and-timeout}

The built-in `fetch` API lacks timeout support and automatic retries. Wrap it to handle transient failures gracefully, especially when the service worker wakes to handle an event and the network may not be immediately available.

```typescript
// background/fetch-client.ts
interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  retryOn?: number[];
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    retryOn = RETRYABLE_STATUS_CODES,
    ...fetchInit
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...fetchInit,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok && retryOn.includes(response.status) && attempt < retries) {
        const delay = retryDelayMs * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      if ((error as Error).name === "AbortError") {
        lastError = new Error(`Request timed out after ${timeoutMs}ms`);
      }

      if (attempt < retries) {
        const delay = retryDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("Request failed after all retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**Important:** Exponential backoff (`Math.pow(2, attempt)`) prevents hammering a struggling server. For 429 responses, respect the `Retry-After` header when present.

---

## 2. Request Intercepting with declarativeNetRequest {#2-request-intercepting-with-declarativenetrequest}

Use `declarativeNetRequest` to modify outgoing requests declaratively -- adding headers, rewriting URLs, or blocking requests without running background JavaScript.

### Static Rules (manifest.json) {#static-rules-manifestjson}

```json
{
  "permissions": ["declarativeNetRequest"],
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "api_rules",
        "enabled": true,
        "path": "rules/api-rules.json"
      }
    ]
  }
}
```

```json
// rules/api-rules.json
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        {
          "header": "X-Extension-Version",
          "operation": "set",
          "value": "1.0.0"
        }
      ]
    },
    "condition": {
      "urlFilter": "api.example.com/*",
      "resourceTypes": ["xmlhttprequest"]
    }
  }
]
```

### Dynamic Rules for Runtime Configuration {#dynamic-rules-for-runtime-configuration}

```typescript
// background/dynamic-rules.ts
async function setAuthHeaderRule(token: string): Promise<void> {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1000],
    addRules: [
      {
        id: 1000,
        priority: 2,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: "Authorization",
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: `Bearer ${token}`,
            },
          ],
        },
        condition: {
          urlFilter: "api.example.com/*",
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          ],
        },
      },
    ],
  });
}

async function clearAuthHeaderRule(): Promise<void> {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1000],
  });
}
```

**Advantage over fetch interceptors:** Rules execute even when the service worker is inactive, reducing wake-ups and improving performance.

---

## 3. API Response Caching Strategies {#3-api-response-caching-strategies}

Choose the right caching strategy based on data freshness requirements. Extensions cannot use the Cache API in service workers, so `chrome.storage` is the primary cache.

```typescript
// background/api-cache.ts
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  etag?: string;
  lastModified?: string;
}

type CacheStrategy = "cache-first" | "network-first" | "stale-while-revalidate";

class ApiCache {
  async fetch<T>(
    url: string,
    strategy: CacheStrategy = "network-first",
    ttlMs: number = 300_000
  ): Promise<T> {
    switch (strategy) {
      case "cache-first":
        return this.cacheFirst<T>(url, ttlMs);
      case "network-first":
        return this.networkFirst<T>(url, ttlMs);
      case "stale-while-revalidate":
        return this.staleWhileRevalidate<T>(url);
    }
  }

  private async cacheFirst<T>(url: string, ttlMs: number): Promise<T> {
    const cached = await this.getCache<T>(url);
    if (cached && Date.now() - cached.cachedAt < ttlMs) {
      return cached.data;
    }
    return this.fetchAndCache<T>(url);
  }

  private async networkFirst<T>(url: string, ttlMs: number): Promise<T> {
    try {
      return await this.fetchAndCache<T>(url);
    } catch {
      const cached = await this.getCache<T>(url);
      if (cached) return cached.data;
      throw new Error(`Network failed and no cache for ${url}`);
    }
  }

  private async staleWhileRevalidate<T>(url: string): Promise<T> {
    const cached = await this.getCache<T>(url);

    // Fire off revalidation without awaiting
    this.fetchAndCache<T>(url).catch(() => {});

    if (cached) return cached.data;

    // No cache -- must wait for network
    return this.fetchAndCache<T>(url);
  }

  private async fetchAndCache<T>(url: string): Promise<T> {
    const headers: Record<string, string> = {};
    const cached = await this.getCache<T>(url);

    // Use conditional requests to save bandwidth
    if (cached?.etag) headers["If-None-Match"] = cached.etag;
    if (cached?.lastModified) headers["If-Modified-Since"] = cached.lastModified;

    const response = await fetchWithRetry(url, { headers });

    if (response.status === 304 && cached) {
      return cached.data;
    }

    const data = (await response.json()) as T;
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      etag: response.headers.get("etag") ?? undefined,
      lastModified: response.headers.get("last-modified") ?? undefined,
    };

    const cacheKey = `api_cache_${btoa(url)}`;
    await chrome.storage.local.set({ [cacheKey]: entry });
    return data;
  }

  private async getCache<T>(url: string): Promise<CacheEntry<T> | null> {
    const cacheKey = `api_cache_${btoa(url)}`;
    const result = await chrome.storage.local.get(cacheKey);
    return (result[cacheKey] as CacheEntry<T>) ?? null;
  }
}

export const apiCache = new ApiCache();
```

**Strategy selection guide:**
- `cache-first` -- reference data that rarely changes (config, feature flags)
- `network-first` -- user-facing data that should be fresh but works offline
- `stale-while-revalidate` -- frequently accessed data where slight staleness is acceptable

---

## 4. Rate Limiting and Request Queuing {#4-rate-limiting-and-request-queuing}

Prevent hitting API rate limits by queuing requests and enforcing a maximum concurrency.

```typescript
// background/request-queue.ts
interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  priority: number;
}

class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private activeCount = 0;
  private readonly maxConcurrent: number;
  private readonly minIntervalMs: number;
  private lastRequestTime = 0;

  constructor(maxConcurrent: number = 3, requestsPerSecond: number = 10) {
    this.maxConcurrent = maxConcurrent;
    this.minIntervalMs = 1000 / requestsPerSecond;
  }

  enqueue<T>(
    execute: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
      });

      // Sort by priority (higher number = higher priority)
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minIntervalMs) {
      setTimeout(() => this.processNext(), this.minIntervalMs - timeSinceLastRequest);
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.activeCount++;
    this.lastRequestTime = Date.now();

    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }
}

export const apiQueue = new RequestQueue(3, 10);

// Usage
const userData = await apiQueue.enqueue(
  () => fetchWithRetry("https://api.example.com/user/123").then((r) => r.json()),
  1 // priority
);
```

---

## 5. Authentication: Bearer Tokens, API Keys, OAuth Refresh {#5-authentication-bearer-tokens-api-keys-oauth-refresh}

Extensions use multiple auth strategies depending on the API. Here is a unified auth layer that supports all three common patterns.

```typescript
// background/auth.ts
type AuthStrategy =
  | { type: "bearer"; token: string }
  | { type: "apiKey"; headerName: string; key: string }
  | { type: "oauth"; clientId: string };

class AuthManager {
  private strategy: AuthStrategy | null = null;

  async initialize(): Promise<void> {
    const { authConfig } = await chrome.storage.local.get("authConfig");
    this.strategy = authConfig as AuthStrategy;
  }

  async getHeaders(): Promise<Record<string, string>> {
    if (!this.strategy) throw new Error("Auth not initialized");

    switch (this.strategy.type) {
      case "bearer":
        return { Authorization: `Bearer ${this.strategy.token}` };

      case "apiKey":
        return { [this.strategy.headerName]: this.strategy.key };

      case "oauth":
        return { Authorization: `Bearer ${await this.getOAuthToken()}` };
    }
  }

  private async getOAuthToken(): Promise<string> {
    const { tokenData } = await chrome.storage.local.get("tokenData");
    const data = tokenData as {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };

    if (!data) {
      return this.launchOAuthFlow();
    }

    // Refresh if expiring within 2 minutes
    if (Date.now() > data.expiresAt - 120_000) {
      return this.refreshOAuthToken(data.refreshToken);
    }

    return data.accessToken;
  }

  private async launchOAuthFlow(): Promise<string> {
    const redirectUrl = chrome.identity.getRedirectURL();
    const authUrl = new URL("https://auth.example.com/authorize");
    authUrl.searchParams.set("client_id", (this.strategy as { clientId: string }).clientId);
    authUrl.searchParams.set("redirect_uri", redirectUrl);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "read write");

    const responseUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    });

    const code = new URL(responseUrl).searchParams.get("code");
    if (!code) throw new Error("No authorization code received");

    return this.exchangeCodeForToken(code);
  }

  private async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch("https://auth.example.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: (this.strategy as { clientId: string }).clientId,
        redirect_uri: chrome.identity.getRedirectURL(),
      }),
    });

    const data = await response.json();
    await this.storeTokenData(data);
    return data.access_token;
  }

  private async refreshOAuthToken(refreshToken: string): Promise<string> {
    const response = await fetch("https://auth.example.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: (this.strategy as { clientId: string }).clientId,
      }),
    });

    if (!response.ok) {
      // Refresh token expired -- force re-auth
      await chrome.storage.local.remove("tokenData");
      return this.launchOAuthFlow();
    }

    const data = await response.json();
    await this.storeTokenData(data);
    return data.access_token;
  }

  private async storeTokenData(data: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }): Promise<void> {
    await chrome.storage.local.set({
      tokenData: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      },
    });
  }
}

export const authManager = new AuthManager();
```

See [OAuth and Identity](oauth-identity.md) for detailed flows including PKCE and `chrome.identity` patterns.

---

## 6. Pagination Handling in Background {#6-pagination-handling-in-background}

Fetch all pages of a paginated API in the background and stream results to the UI as they arrive.

```typescript
// background/pagination.ts
interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  totalCount?: number;
}

type PaginationStyle =
  | { type: "cursor"; cursorParam: string }
  | { type: "offset"; limitParam: string; offsetParam: string; pageSize: number }
  | { type: "link-header" };

async function* fetchAllPages<T>(
  baseUrl: string,
  pagination: PaginationStyle,
  headers: Record<string, string> = {}
): AsyncGenerator<T[], void, void> {
  let url = baseUrl;
  let offset = 0;

  while (url) {
    const response = await fetchWithRetry(url, { headers });
    const json = await response.json();

    const items: T[] = Array.isArray(json) ? json : json.data ?? json.results ?? json.items;
    yield items;

    // Determine next page URL
    switch (pagination.type) {
      case "cursor": {
        const cursor = json.nextCursor ?? json.next_cursor ?? json.cursor;
        if (!cursor) return;
        const nextUrl = new URL(baseUrl);
        nextUrl.searchParams.set(pagination.cursorParam, cursor);
        url = nextUrl.toString();
        break;
      }

      case "offset": {
        offset += pagination.pageSize;
        const total = json.totalCount ?? json.total_count ?? json.total;
        if (offset >= total) return;
        const nextUrl = new URL(baseUrl);
        nextUrl.searchParams.set(pagination.offsetParam, String(offset));
        nextUrl.searchParams.set(pagination.limitParam, String(pagination.pageSize));
        url = nextUrl.toString();
        break;
      }

      case "link-header": {
        const linkHeader = response.headers.get("link");
        const nextLink = parseLinkHeader(linkHeader)?.next;
        if (!nextLink) return;
        url = nextLink;
        break;
      }
    }
  }
}

function parseLinkHeader(
  header: string | null
): Record<string, string> | null {
  if (!header) return null;
  const links: Record<string, string> = {};
  const parts = header.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) links[match[2]] = match[1];
  }
  return links;
}

// Usage: stream pages to popup via messaging
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FETCH_ALL_ITEMS") {
    (async () => {
      const pages = fetchAllPages<Item>(
        "https://api.example.com/items",
        { type: "cursor", cursorParam: "after" },
        await authManager.getHeaders()
      );

      const allItems: Item[] = [];
      for await (const page of pages) {
        allItems.push(...page);
        // Send incremental updates to UI
        chrome.runtime.sendMessage({
          type: "ITEMS_PAGE",
          payload: { items: allItems, complete: false },
        });
      }

      chrome.runtime.sendMessage({
        type: "ITEMS_PAGE",
        payload: { items: allItems, complete: true },
      });
    })();

    return true; // Keep message channel open
  }
});
```

---

## 7. Background Sync with chrome.alarms {#7-background-sync-with-chromealarms}

Use `chrome.alarms` to periodically sync data when the extension is not in active use. This is the Manifest V3 replacement for persistent background pages with `setInterval`.

```typescript
// background/sync.ts
interface SyncConfig {
  endpoint: string;
  intervalMinutes: number;
  storageKey: string;
  transform?: (data: unknown) => unknown;
}

const SYNC_CONFIGS: Record<string, SyncConfig> = {
  userProfile: {
    endpoint: "https://api.example.com/me",
    intervalMinutes: 30,
    storageKey: "sync_userProfile",
  },
  notifications: {
    endpoint: "https://api.example.com/notifications?unread=true",
    intervalMinutes: 5,
    storageKey: "sync_notifications",
    transform: (data: unknown) => {
      const items = data as Array<{ id: string; read: boolean }>;
      return items.filter((n) => !n.read);
    },
  },
};

// Register alarms on install
chrome.runtime.onInstalled.addListener(() => {
  for (const [name, config] of Object.entries(SYNC_CONFIGS)) {
    chrome.alarms.create(`sync_${name}`, {
      periodInMinutes: config.intervalMinutes,
      delayInMinutes: 1, // First run after 1 minute
    });
  }
});

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("sync_")) return;

  const configName = alarm.name.replace("sync_", "");
  const config = SYNC_CONFIGS[configName];
  if (!config) return;

  try {
    const headers = await authManager.getHeaders();
    const response = await fetchWithRetry(config.endpoint, { headers });

    if (!response.ok) {
      console.warn(`Sync failed for ${configName}: ${response.status}`);
      return;
    }

    let data = await response.json();

    if (config.transform) {
      data = config.transform(data);
    }

    await chrome.storage.local.set({
      [config.storageKey]: {
        data,
        syncedAt: Date.now(),
      },
    });

    // Update badge for notifications
    if (configName === "notifications") {
      const count = (data as unknown[]).length;
      await chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
      await chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
    }
  } catch (error) {
    console.error(`Sync error for ${configName}:`, error);
  }
});

// Force sync on demand
export async function forceSyncAll(): Promise<void> {
  for (const name of Object.keys(SYNC_CONFIGS)) {
    const alarm = await chrome.alarms.get(`sync_${name}`);
    if (alarm) {
      chrome.alarms.create(`sync_${name}`, {
        periodInMinutes: SYNC_CONFIGS[name].intervalMinutes,
        delayInMinutes: 0, // Run immediately
      });
    }
  }
}
```

**Minimum interval:** `chrome.alarms` enforces a minimum of 30 seconds in production. In development (unpacked extension), there is no minimum.

---

## 8. Error Handling and Offline Detection {#8-error-handling-and-offline-detection}

Build a comprehensive error handling layer that distinguishes between network errors, API errors, and auth failures, and adapts behavior when offline.

```typescript
// background/error-handler.ts
enum ApiErrorType {
  Network = "NETWORK",
  Timeout = "TIMEOUT",
  Auth = "AUTH",
  RateLimit = "RATE_LIMIT",
  Server = "SERVER",
  Client = "CLIENT",
  Offline = "OFFLINE",
  Unknown = "UNKNOWN",
}

interface ApiError {
  type: ApiErrorType;
  status?: number;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
}

function classifyError(error: unknown, response?: Response): ApiError {
  // Network or fetch failures
  if (error instanceof TypeError && (error.message.includes("fetch") || error.message.includes("network"))) {
    const isOffline = !navigator.onLine;
    return {
      type: isOffline ? ApiErrorType.Offline : ApiErrorType.Network,
      message: isOffline ? "Device is offline" : "Network request failed",
      retryable: !isOffline,
    };
  }

  // Timeout
  if (error instanceof Error && error.message.includes("timed out")) {
    return {
      type: ApiErrorType.Timeout,
      message: error.message,
      retryable: true,
    };
  }

  // HTTP error responses
  if (response) {
    if (response.status === 401 || response.status === 403) {
      return {
        type: ApiErrorType.Auth,
        status: response.status,
        message: "Authentication failed",
        retryable: response.status === 401, // 401 can retry after refresh
      };
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      return {
        type: ApiErrorType.RateLimit,
        status: 429,
        message: "Rate limited",
        retryable: true,
        retryAfterMs: retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000,
      };
    }

    if (response.status >= 500) {
      return {
        type: ApiErrorType.Server,
        status: response.status,
        message: `Server error: ${response.status}`,
        retryable: true,
      };
    }

    return {
      type: ApiErrorType.Client,
      status: response.status,
      message: `Client error: ${response.status}`,
      retryable: false,
    };
  }

  return {
    type: ApiErrorType.Unknown,
    message: error instanceof Error ? error.message : String(error),
    retryable: false,
  };
}
```

### Offline Detection and Recovery {#offline-detection-and-recovery}

```typescript
// background/connectivity.ts
class ConnectivityMonitor {
  private listeners: Array<(online: boolean) => void> = [];
  private pendingRequests: Array<() => Promise<void>> = [];

  constructor() {
    // Service workers do not have window.addEventListener for online/offline.
    // Poll connectivity instead.
    chrome.alarms.create("connectivity_check", { periodInMinutes: 1 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "connectivity_check") {
        this.checkConnectivity();
      }
    });
  }

  private async checkConnectivity(): Promise<void> {
    const wasOffline = !navigator.onLine;

    try {
      // Lightweight connectivity probe
      await fetch("https://api.example.com/health", {
        method: "HEAD",
        cache: "no-store",
      });

      if (wasOffline) {
        this.notifyListeners(true);
        await this.replayPendingRequests();
      }
    } catch {
      if (!wasOffline) {
        this.notifyListeners(false);
      }
    }
  }

  onConnectivityChange(listener: (online: boolean) => void): void {
    this.listeners.push(listener);
  }

  private notifyListeners(online: boolean): void {
    for (const listener of this.listeners) {
      listener(online);
    }
  }

  queueForReplay(request: () => Promise<void>): void {
    this.pendingRequests.push(request);
  }

  private async replayPendingRequests(): Promise<void> {
    const requests = this.pendingRequests.splice(0);
    for (const request of requests) {
      try {
        await request();
      } catch {
        // Re-queue failed requests
        this.pendingRequests.push(request);
      }
    }
  }
}

export const connectivity = new ConnectivityMonitor();
```

### Putting It Together: Resilient API Call {#putting-it-together-resilient-api-call}

```typescript
// background/resilient-fetch.ts
export async function resilientFetch<T>(
  url: string,
  options: FetchOptions & { cacheStrategy?: CacheStrategy } = {}
): Promise<T> {
  const { cacheStrategy = "network-first", ...fetchOpts } = options;

  try {
    const headers = await authManager.getHeaders();
    const response = await fetchWithRetry(url, { ...fetchOpts, headers });

    if (!response.ok) {
      const apiError = classifyError(null, response);

      if (apiError.type === ApiErrorType.Auth) {
        // Trigger token refresh and retry once
        await authManager.initialize();
        const newHeaders = await authManager.getHeaders();
        const retryResponse = await fetchWithRetry(url, { ...fetchOpts, headers: newHeaders });
        return retryResponse.json() as Promise<T>;
      }

      throw apiError;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    const apiError = error instanceof Object && "type" in error
      ? (error as ApiError)
      : classifyError(error);

    if (apiError.type === ApiErrorType.Offline || apiError.type === ApiErrorType.Network) {
      // Attempt to serve from cache
      return apiCache.fetch<T>(url, "cache-first", Infinity);
    }

    throw apiError;
  }
}
```

See [Error Handling](error-handling.md) for UI-level error display patterns and user notification strategies.

---

## Summary {#summary}

| Pattern | When to Use | Key Consideration |
|---------|-------------|-------------------|
| Fetch wrapper | Every API call | Exponential backoff, respect Retry-After |
| declarativeNetRequest | Static headers, URL rewrites | Works without waking service worker |
| Response caching | Repeated reads of same data | Choose strategy by freshness needs |
| Request queuing | Rate-limited APIs | Priority queue for critical requests |
| Auth management | Any authenticated API | Deduplicate token refresh calls |
| Pagination | Large datasets | Stream to UI incrementally |
| Background sync | Periodic data freshness | Minimum 30s alarm interval in prod |
| Error handling | All network code | Classify errors for appropriate recovery |

These patterns compose well together. A typical extension combines the fetch wrapper (pattern 1) with auth management (pattern 5), error handling (pattern 8), and one or more caching strategies (pattern 3) to build a robust API layer.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
