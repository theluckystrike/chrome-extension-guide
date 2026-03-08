---
layout: default
title: Chrome Extension Web Request Interception — Mastering webRequest API for Network Control
description: Master the Chrome webRequest API to intercept, modify, and block HTTP requests. Build ad blockers, privacy tools, and request modifiers with TypeScript.
---

# Chrome Extension Web Request Interception — Mastering webRequest API for Network Control

The Chrome webRequest API stands as one of the most powerful interfaces for Chrome extension developers who need to intercept, analyze, modify, or block network requests. This API provides granular control over HTTP traffic flowing through the browser, enabling sophisticated extensions for ad blocking, content filtering, API debugging, and privacy protection. Understanding how to leverage this API effectively opens doors to building tools that can dramatically reshape how users interact with web content.

In this comprehensive guide, we'll explore the webRequest API's architecture, examine practical TypeScript implementations for common use cases, discuss ad blocking patterns that work within Chrome's Manifest V3 restrictions, and cover best practices that ensure your extension passes Chrome Web Store review while providing robust functionality.

## Understanding the webRequest API Architecture

The webRequest API operates as a middleware layer between web pages and network requests, allowing extensions to observe and manipulate HTTP traffic at various stages of the request lifecycle. Unlike the newer Declarative Net Request API introduced in Manifest V3, the traditional webRequest API offers more flexibility but with greater responsibility placed on extension developers.

### The Request Lifecycle Events

Network requests in Chrome follow a well-defined lifecycle, with the webRequest API providing hooks at each stage. Understanding these stages helps you choose the right interception point for your use case.

The lifecycle progresses through these events in order: `onBeforeRequest` fires when a request is about to occur, making it ideal for canceling or redirecting requests. Next, `onBeforeSendHeaders` executes before request headers are sent, allowing you to add, modify, or remove headers. The `onSendHeaders` event fires after headers have been sent, useful for logging. When response headers arrive, `onHeadersReceived` triggers, enabling you to modify response headers or status codes. For authentication challenges, `onAuthRequired` intercepts the authentication flow. Finally, `onResponseStarted` fires when the first byte of the response arrives, and `onCompleted` or `onErrorOccurred` signals completion or failure.

### Manifest V3 Changes and Limitations

Manifest V3 introduced significant changes to how the webRequest API operates. Most notably, blocking listeners—which previously allowed extensions to synchronously block or modify requests—now have restricted capabilities. The `blocking` option is deprecated for most use cases, though it remains available for certain scenarios with appropriate permissions.

In Manifest V3, you should prefer the Declarative Net Request API for simple blocking and modification tasks, as it provides better privacy guarantees and doesn't require host permissions for the URLs being modified. However, the webRequest API remains essential for cases requiring dynamic analysis, complex header manipulation, or request body access.

## Setting Up Your Extension for webRequest

Proper manifest configuration determines what your extension can and cannot do with network requests. Let's examine the required permissions and configuration patterns.

### Required Permissions

```json
{
  "manifest_version": 3,
  "permissions": [
    "webRequest",
    "webRequestBlocking"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

The `webRequest` permission grants access to the API itself, while `webRequestBlocking` enables blocking capabilities—though as noted above, this has limitations in Manifest V3. Host permissions determine which URLs your extension can intercept; using `<all_urls>` provides complete coverage but triggers significant permission warnings during installation.

For more targeted interception, specify particular host patterns:

```json
{
  "host_permissions": [
    "https://*.example.com/*",
    "https://api.example.org/*"
  ]
}
```

This approach reduces permission scope and improves user trust, though it limits your extension's visibility to matching URLs.

## TypeScript Implementation Patterns

Let's explore practical implementations covering common use cases, all written in TypeScript for type safety and better developer experience.

### Blocking Requests with TypeScript

```typescript
// types/web-request-types.ts
interface RequestDetails {
  url: string;
  method: string;
  tabId: number;
  frameId: number;
  parentFrameId: number;
  requestId: string;
  type: chrome.webRequest.ResourceType;
  timeStamp: number;
  initiator?: string;
}

interface BlockingResponse {
  cancel?: boolean;
  redirectUrl?: string;
}

// Blocklist stored in extension storage
interface BlocklistRule {
  pattern: string;
  regex?: boolean;
  resourceTypes?: chrome.webRequest.ResourceType[];
}

class RequestBlocker {
  private blocklist: BlocklistRule[] = [];

  constructor() {
    this.loadBlocklist();
  }

  private async loadBlocklist(): Promise<void> {
    const result = await chrome.storage.local.get('blocklist');
    this.blocklist = result.blocklist || [];
  }

  matchesBlocklist(url: string, type: chrome.webRequest.ResourceType): boolean {
    return this.blocklist.some(rule => {
      if (rule.resourceTypes && !rule.resourceTypes.includes(type)) {
        return false;
      }
      
      if (rule.regex) {
        const regex = new RegExp(rule.pattern);
        return regex.test(url);
      }
      
      return url.includes(rule.pattern);
    });
  }

  handleBeforeRequest = (
    details: RequestDetails
  ): BlockingResponse | void => {
    if (this.matchesBlocklist(details.url, details.type)) {
      console.log(`Blocking request to: ${details.url}`);
      return { cancel: true };
    }
  };
}

// Initialize the blocker
const blocker = new RequestBlocker();

// Register the listener with proper typing
chrome.webRequest.onBeforeRequest.addListener(
  blocker.handleBeforeRequest,
  {
    urls: ['<all_urls>'],
    types: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image']
  },
  ['blocking']
);
```

### Modifying Request Headers

```typescript
// services/header-modifier.ts
interface RequestHeaders {
  name: string;
  value: string;
}

interface HeaderModificationRule {
  headerName: string;
  headerValue?: string;
  action: 'add' | 'remove' | 'modify';
}

class HeaderModifier {
  private modifications: Map<string, HeaderModificationRule[]> = new Map();

  constructor() {
    this.initializeModifications();
  }

  private async initializeModifications(): Promise<void> {
    // Load rules from storage
    const result = await chrome.storage.sync.get('headerRules');
    const rules: Record<string, HeaderModificationRule[]> = result.headerRules || {};
    
    this.modifications = new Map(Object.entries(rules));
  }

  getModificationsForUrl(url: string): HeaderModificationRule[] {
    for (const [pattern, rules] of this.modifications.entries()) {
      if (url.match(new RegExp(pattern))) {
        return rules;
      }
    }
    return [];
  }

  applyModifications(
    details: chrome.webRequest.OnBeforeSendHeadersDetails
  ): chrome.webRequest.BlockingResponse | void {
    const url = details.url;
    const modifications = this.getModificationsForUrl(url);
    
    if (modifications.length === 0) return;

    let headers: RequestHeaders[] = [...(details.requestHeaders || [])];

    for (const mod of modifications) {
      switch (mod.action) {
        case 'add':
          headers.push({ name: mod.headerName, value: mod.headerValue || '' });
          break;
          
        case 'remove':
          headers = headers.filter(h => 
            h.name.toLowerCase() !== mod.headerName.toLowerCase()
          );
          break;
          
        case 'modify':
          const index = headers.findIndex(h => 
            h.name.toLowerCase() === mod.headerName.toLowerCase()
          );
          if (index >= 0) {
            headers[index].value = mod.headerValue || '';
          } else {
            headers.push({ name: mod.headerName, value: mod.headerValue || '' });
          }
          break;
      }
    }

    return { requestHeaders: headers };
  }
}

const headerModifier = new HeaderModifier();

chrome.webRequest.onBeforeSendHeaders.addListener(
  headerModifier.applyModifications.bind(headerModifier),
  {
    urls: ['<all_urls>']
  },
  ['blocking', 'requestHeaders']
);
```

### Intercepting and Modifying Response Headers

```typescript
// services/response-interceptor.ts
interface CORSRule {
  allowedOrigins: string[];
  allowedMethods?: string[];
}

class ResponseInterceptor {
  private corsRules: CORSRule[] = [];

  constructor() {
    this.loadRules();
  }

  private async loadRules(): Promise<void> {
    const result = await chrome.storage.local.get('corsRules');
    this.corsRules = result.corsRules || [];
  }

  private findMatchingRule(origin: string): CORSRule | undefined {
    return this.corsRules.find(rule => 
      rule.allowedOrigins.includes(origin)
    );
  }

  handleHeadersReceived = (
    details: chrome.webRequest.OnHeadersReceivedDetails
  ): chrome.webRequest.BlockingResponse | void => {
    const initiator = details.initiator;
    if (!initiator) return;

    const matchingRule = this.findMatchingRule(initiator);
    if (!matchingRule) return;

    const headers = details.responseHeaders || [];
    
    // Add CORS headers
    const existingAccessControl = headers.find(h => 
      h.name.toLowerCase() === 'access-control-allow-origin'
    );
    
    if (existingAccessControl) {
      existingAccessControl.value = initiator;
    } else {
      headers.push({
        name: 'Access-Control-Allow-Origin',
        value: initiator
      });
    }

    if (matchingRule.allowedMethods) {
      headers.push({
        name: 'Access-Control-Allow-Methods',
        value: matchingRule.allowedMethods.join(', ')
      });
    }

    return { responseHeaders: headers };
  };
}

const interceptor = new ResponseInterceptor();

chrome.webRequest.onHeadersReceived.addListener(
  interceptor.handleHeadersReceived,
  {
    urls: ['<all_urls>'],
    types: ['xmlhttprequest', 'fetch']
  },
  ['blocking', 'responseHeaders']
);
```

## Building an Ad Blocker with webRequest

Creating an effective ad blocker requires combining request interception with efficient filtering logic. While Manifest V3 encourages using the Declarative Net Request API for this purpose, the webRequest API still offers unique capabilities for dynamic filtering.

### Filter Engine Implementation

```typescript
// services/ad-blocker.ts
interface Filter {
  pattern: string;
  type: 'url' | 'domain' | 'regex';
  action: 'block' | 'allow' | 'redirect';
  redirectUrl?: string;
}

interface FilterMatch {
  filter: Filter;
  matchType: 'exact' | 'wildcard' | 'pattern';
}

class AdBlockerEngine {
  private filters: Filter[] = [];
  private whitelist: Set<string> = new Set();

  constructor() {
    this.initializeFilters();
  }

  private async initializeFilters(): Promise<void> {
    const result = await chrome.storage.local.get(['filters', 'whitelist']);
    this.filters = result.filters || this.getDefaultFilters();
    this.whitelist = new Set(result.whitelist || []);
  }

  private getDefaultFilters(): Filter[] {
    return [
      { pattern: '.*\\.doubleclick\\.net', type: 'domain', action: 'block' },
      { pattern: '.*\\.googlesyndication\\.com', type: 'domain', action: 'block' },
      { pattern: '.*\\.googleadservices\\.com', type: 'domain', action: 'block' },
      { pattern: '.*\\.facebook\\.com/tr/', type: 'url', action: 'block' },
      { pattern: '.*\\.amazon-adsystem\\.com', type: 'domain', action: 'block' },
      { pattern: '.*\\.adnxs\\.com', type: 'domain', action: 'block' },
      { pattern: '.*\\.criteo\\.com', type: 'domain', action: 'block' },
      { type: 'regex', pattern: '.*\\/ads\\/.*', action: 'block' },
      { type: 'regex', pattern: '.*\\/ad\\/.*', action: 'block' },
    ];
  }

  isWhitelisted(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.whitelist.has(urlObj.hostname);
    } catch {
      return false;
    }
  }

  matchFilter(url: string): FilterMatch | null {
    for (const filter of this.filters) {
      let matches = false;

      switch (filter.type) {
        case 'domain':
          try {
            const urlObj = new URL(url);
            matches = urlObj.hostname.includes(filter.pattern.replace(/^\*\./, ''));
          } catch {
            continue;
          }
          break;
          
        case 'url':
          matches = url.includes(filter.pattern);
          break;
          
        case 'regex':
          try {
            const regex = new RegExp(filter.pattern, 'i');
            matches = regex.test(url);
          } catch {
            continue;
          }
          break;
      }

      if (matches) {
        return { filter, matchType: 'wildcard' };
      }
    }
    return null;
  }

  processRequest(
    details: chrome.webRequest.OnBeforeRequestDetails
  ): chrome.webRequest.BlockingResponse | void {
    // Skip whitelisted URLs
    if (this.isWhitelisted(details.url)) {
      return;
    }

    const match = this.matchFilter(details.url);
    
    if (!match) return;

    switch (match.filter.action) {
      case 'block':
        this.incrementBlockedCount();
        return { cancel: true };
        
      case 'redirect':
        if (match.filter.redirectUrl) {
          return { redirectUrl: match.filter.redirectUrl };
        }
        return { cancel: true };
        
      case 'allow':
        // Explicit allow - do nothing
        return;
    }
  }

  private async incrementBlockedCount(): Promise<void> {
    const result = await chrome.storage.local.get('blockedCount');
    const count = (result.blockedCount || 0) + 1;
    await chrome.storage.local.set({ blockedCount: count });
  }

  // Update filters dynamically
  async updateFilters(newFilters: Filter[]): Promise<void> {
    this.filters = newFilters;
    await chrome.storage.local.set({ filters: newFilters });
  }

  // Manage whitelist
  async addToWhitelist(domain: string): Promise<void> {
    this.whitelist.add(domain);
    await chrome.storage.local.set({ 
      whitelist: Array.from(this.whitelist) 
    });
  }
}

const adBlocker = new AdBlockerEngine();

chrome.webRequest.onBeforeRequest.addListener(
  (details) => adBlocker.processRequest(details),
  {
    urls: ['<all_urls>'],
    types: [
      'main_frame', 'sub_frame', 'stylesheet', 
      'script', 'image', 'font', 'object', 
      'xmlhttprequest', 'ping', 'csp_report', 
      'media', 'websocket', 'other'
    ]
  },
  ['blocking']
);
```

## Privacy Tools Implementation

Beyond ad blocking, the webRequest API enables powerful privacy-focused extensions that can block trackers, modify headers to enhance privacy, and provide users with visibility into how their data flows.

### Tracker Blocking and Analytics Prevention

```typescript
// services/privacy-shield.ts
interface TrackerCategory {
  name: string;
  domains: string[];
  enabled: boolean;
}

interface PrivacyStats {
  trackersBlocked: number;
  cookiesBlocked: number;
  requestsModified: number;
}

class PrivacyShield {
  private trackerCategories: TrackerCategory[] = [];
  private stats: PrivacyStats = {
    trackersBlocked: 0,
    cookiesBlocked: 0,
    requestsModified: 0
  };

  constructor() {
    this.initializeTrackers();
    this.loadStats();
  }

  private initializeTrackers(): void {
    this.trackerCategories = [
      {
        name: 'Analytics',
        enabled: true,
        domains: [
          'google-analytics.com',
          'googletagmanager.com',
          'segment.io',
          'mixpanel.com',
          'amplitude.com',
          'hotjar.com',
          'fullstory.com'
        ]
      },
      {
        name: 'Advertising',
        enabled: true,
        domains: [
          'doubleclick.net',
          'googlesyndication.com',
          'facebook.net',
          'criteo.com',
          'taboola.com',
          'outbrain.com'
        ]
      },
      {
        name: 'Social Tracking',
        enabled: true,
        domains: [
          'connect.facebook.net',
          'platform.twitter.com',
          'linkedin.com/px',
          'pinterest.com/js'
        ]
      },
      {
        name: 'Fingerprinting',
        enabled: true,
        domains: [
          'fingerprintjs.com',
          'iovation.com',
          'threatmetrix.com'
        ]
      }
    ];
  }

  private async loadStats(): Promise<void> {
    const result = await chrome.storage.local.get('privacyStats');
    if (result.privacyStats) {
      this.stats = result.privacyStats;
    }
  }

  private async saveStats(): Promise<void> {
    await chrome.storage.local.set({ privacyStats: this.stats });
  }

  private isTracker(url: string, type: chrome.webRequest.ResourceType): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      return this.trackerCategories
        .filter(cat => cat.enabled)
        .some(cat => 
          cat.domains.some(domain => hostname.includes(domain))
        );
    } catch {
      return false;
    }
  }

  handleBeforeRequest = (
    details: chrome.webRequest.OnBeforeRequestDetails
  ): chrome.webRequest.BlockingResponse | void => {
    if (this.isTracker(details.url, details.type)) {
      this.stats.trackersBlocked++;
      this.saveStats();
      return { cancel: true };
    }
  };

  handleBeforeSendHeaders = (
    details: chrome.webRequest.OnBeforeSendHeadersDetails
  ): chrome.webRequest.BlockingResponse | void => {
    const headers = details.requestHeaders || [];
    let modified = false;
    
    // Remove tracking headers
    const headersToRemove = [
      'Referer',
      'Cookie',
      'User-Agent'
    ];

    const filteredHeaders = headers.filter(header => {
      if (headersToRemove.includes(header.name)) {
        modified = true;
        return false;
      }
      return true;
    });

    if (modified) {
      this.stats.cookiesBlocked++;
      this.stats.requestsModified++;
      this.saveStats();
      
      return {
        requestHeaders: filteredHeaders
      };
    }
  };

  // Allow users to toggle categories
  setCategoryEnabled(categoryName: string, enabled: boolean): void {
    const category = this.trackerCategories.find(c => c.name === categoryName);
    if (category) {
      category.enabled = enabled;
      chrome.storage.local.set({ 
        trackerCategories: this.trackerCategories 
      });
    }
  }

  getStats(): PrivacyStats {
    return { ...this.stats };
  }
}

const privacyShield = new PrivacyShield();

// Listen for all request types
chrome.webRequest.onBeforeRequest.addListener(
  privacyShield.handleBeforeRequest,
  {
    urls: ['<all_urls>'],
    types: ['script', 'image', 'xhr', 'fetch']
  },
  ['blocking']
);

// Modify headers for all requests
chrome.webRequest.onBeforeSendHeaders.addListener(
  privacyShield.handleBeforeSendHeaders,
  {
    urls: ['<all_urls>']
  },
  ['blocking', 'requestHeaders']
);
```

## Best Practices

When implementing webRequest-based extensions, following best practices ensures your extension performs well, passes Chrome Web Store review, and provides a good user experience.

### Permission Minimization

Always request the minimum host permissions necessary for your extension's functionality. Rather than using `<all_urls>`, specify the exact domains or URL patterns your extension needs to intercept. This reduces permission warnings during installation and improves user trust.

```typescript
// Instead of:
{ "host_permissions": ["<all_urls>"] }

// Use specific patterns:
{ "host_permissions": ["https://*.example.com/*"] }
```

### Efficient Filtering

Avoid processing every network request. Use the `types` option in your listener configuration to filter only relevant resource types:

```typescript
chrome.webRequest.onBeforeRequest.addListener(
  handler,
  {
    urls: ['<all_urls>'],
    // Only intercept these types
    types: ['script', 'image', 'xhr', 'sub_frame']
  },
  ['blocking']
);
```

### Asynchronous Processing

In Manifest V3, prefer asynchronous processing over blocking listeners when possible. Use the `async` callback pattern to prevent blocking the browser:

```typescript
// Blocking pattern (limited in MV3)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Synchronous processing
    return { cancel: shouldCancel(details.url) };
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

// Preferred async pattern for MV3
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    const shouldCancel = await checkBlocklistAsync(details.url);
    return shouldCancel ? { cancel: true } : undefined;
  },
  { urls: ['<all_urls>'] }
);
```

### Error Handling and Resilience

Network request handling must be resilient to errors. Always wrap your processing logic in try-catch blocks and provide graceful degradation:

```typescript
const safeHandler = (details: chrome.webRequest.OnBeforeRequestDetails) => {
  try {
    return processRequest(details);
  } catch (error) {
    console.error('Request processing error:', error);
    // Allow request through on error - fail safely
    return undefined;
  }
};
```

### Performance Considerations

Request listeners run frequently, so performance is critical. Optimize your implementations by caching filter rules in memory, using efficient data structures like Sets for blocklists, and avoiding regex compilation in hot paths:

```typescript
class OptimizedBlocker {
  private blocklist: Set<string> = new Set();
  private compiledRegex: RegExp[] = [];

  updateBlocklist(patterns: string[]): void {
    // Rebuild efficient data structures
    this.blocklist = new Set(patterns.filter(p => !p.includes('*')));
    this.compiledRegex = patterns
      .filter(p => p.includes('*'))
      .map(p => new RegExp(p.replace(/\*/g, '.*')));
  }

  isBlocked(url: string): boolean {
    // Fast path: exact match
    if (this.blocklist.has(url)) return true;
    
    // Regex path: slower but handles wildcards
    return this.compiledRegex.some(regex => regex.test(url));
  }
}
```

### User Privacy and Transparency

Be transparent with users about what your extension does with their network data. Avoid sending intercepted request data to external servers unless explicitly necessary and disclosed. Store sensitive data locally when possible, and provide users with controls over what gets blocked or modified.

### Testing and Debugging

Use Chrome's extension debugging tools to verify your listeners are working correctly. The Network tab in DevTools shows which requests were blocked or modified by your extension. Add logging to track unusual patterns, but avoid logging full URLs in production to protect user privacy.

## Conclusion

The webRequest API provides powerful capabilities for Chrome extension developers seeking to intercept, analyze, and modify network traffic. While Manifest V3 has shifted some use cases toward the Declarative Net Request API, webRequest remains essential for dynamic filtering, header modification, and complex privacy features.

By following the implementation patterns and best practices outlined in this guide, you can build robust extensions that enhance user privacy, block unwanted content, and provide valuable network-level functionality. Remember to always minimize permissions, handle errors gracefully, and maintain transparency with users about your extension's network behavior.

Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one
