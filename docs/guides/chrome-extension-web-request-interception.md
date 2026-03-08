---
layout: default
title: Chrome Extension WebRequest Interception — Block Ads, Modify Requests, Build Privacy Tools
description: Master Chrome's webRequest API for intercepting, blocking, and modifying HTTP requests. Build ad blockers, privacy tools, and request modifiers with TypeScript examples.
---

# Chrome Extension WebRequest Interception — Complete Guide

The webRequest API stands as one of Chrome Extension's most powerful capabilities for network-level control. This API enables extensions to intercept, analyze, block, and modify HTTP requests at the browser level, opening doors to sophisticated ad blocking, content filtering, request modification, and privacy protection tools. Understanding how to leverage this API effectively is essential for any extension developer looking to build network-aware functionality.

Unlike content scripts that operate within web page contexts, the webRequest API runs in the extension's background service worker, giving you access to the entire network traffic flowing through the browser. This architectural separation provides both power and responsibility—great capabilities come with important considerations around permissions, performance, and user privacy.

## Understanding the webRequest API Architecture

The webRequest API operates through an event-based system where you register listeners for various stages of HTTP request lifecycle. Each event provides different capabilities and access to request data. The API is available in both Manifest V2 and Manifest V3, though there are significant differences in how blocking operations work between the versions.

In Manifest V2, developers could use the `blocking` extraInfoSpec to synchronously block or modify requests. Manifest V3 deprecated most blocking capabilities in favor of the Declarative Net Request API for performance and privacy reasons. However, the webRequest API still provides powerful observation capabilities and can be used with the `blocking` option for specific use cases that require it.

### Event Lifecycle Overview

The webRequest API fires events in a predictable sequence as HTTP requests progress through their lifecycle. Understanding this sequence helps you choose the right event for your use case:

```
onBeforeRequest → onBeforeSendHeaders → onSendHeaders → 
onHeadersReceived → onAuthRequired → onResponseStarted → 
onCompleted / onErrorOccurred
```

Each event fires at a specific point in the request lifecycle, providing access to different data and offering different modification capabilities. The earlier in the lifecycle you intercept a request, the more impactful your modifications can be, but you also have less information about the final response.

## Setting Up Your Manifest Configuration

Before using the webRequest API, you must properly configure your manifest file with appropriate permissions. The configuration required depends on which events you need to access and what operations you want to perform.

```json
{
  "manifest_version": 3,
  "name": "Request Interception Demo",
  "version": "1.0.0",
  "permissions": [
    "webRequest",
    "webRequestBlocking"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

The `webRequest` permission is required for basic event listening, while `webRequestBlocking` enables synchronous blocking capabilities. Host permissions determine which URLs your extension can intercept—using `<all_urls>` provides complete access but requires careful justification for Chrome Web Store review.

For production extensions, consider requesting more specific host permissions:

```json
{
  "host_permissions": [
    "https://*.example.com/*",
    "https://api.example.org/*"
  ]
}
```

## Intercepting Requests with onBeforeRequest

The `onBeforeRequest` event fires when a request is about to be made, providing the earliest opportunity to intercept and modify requests. This event is particularly useful for cancelling requests, implementing redirects, and accessing POST request bodies.

```typescript
// types/web-request-types.ts
interface RequestDetails {
  url: string;
  method: string;
  frameId: number;
  parentFrameId: number;
  requestId: string;
  tabId: number;
  type: chrome.webRequest.ResourceType;
  timeStamp: number;
  requestBody?: {
    error?: string;
    formData?: Record<string, string[]>;
    raw?: Array<{ bytes?: ArrayBuffer }>;
  };
}

interface BlockingResponse {
  cancel?: boolean;
  redirectUrl?: string;
  requestBody?: {
    formData?: Record<string, string[]>;
    raw?: Array<{ bytes?: ArrayBuffer }>;
  };
}

// background/request-interceptor.ts
import type { RequestDetails, BlockingResponse } from '../types/web-request-types';

// Ad domain blocking pattern
const AD_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'adnxs.com',
  'adsrvr.org',
  'advertising.com',
  'outbrain.com',
  'taboola.com',
  'criteo.com',
  'pubmatic.com'
];

function isAdRequest(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return AD_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

export function setupRequestInterceptor(): void {
  chrome.webRequest.onBeforeRequest.addListener(
    (details: RequestDetails): BlockingResponse | undefined => {
      // Block ad requests
      if (isAdRequest(details.url)) {
        console.log(`[RequestBlocker] Blocked ad request: ${details.url}`);
        return { cancel: true };
      }

      // Redirect example: old domain to new domain
      if (details.url.includes('https://legacy-api.example.com/')) {
        return {
          redirectUrl: details.url.replace(
            'legacy-api.example.com',
            'api.example.com'
          )
        };
      }

      // Log POST requests for debugging
      if (details.method === 'POST' && details.requestBody) {
        handlePostRequest(details);
      }

      return undefined;
    },
    {
      urls: ['<all_urls>'],
      types: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'image']
    },
    ['blocking', 'requestBody']
  );
}

function handlePostRequest(details: RequestDetails): void {
  if (details.requestBody?.formData) {
    console.log('[RequestInterceptor] POST form data:', details.requestBody.formData);
  }
  
  if (details.requestBody?.raw) {
    // Handle raw body data
    const rawData = details.requestBody.raw[0];
    if (rawData.bytes) {
      const decoder = new TextDecoder();
      const body = decoder.decode(rawData.bytes);
      console.log('[RequestInterceptor] POST raw body:', body);
    }
  }
}
```

The `blocking` extra info spec enables synchronous response handling, allowing your listener to return a blocking response that modifies the request before it's sent. This is essential for ad blocking and request redirection use cases.

## Modifying Request Headers with onBeforeSendHeaders

The `onBeforeSendHeaders` event fires after the request headers have been assembled but before they're sent to the server. This is the ideal point for adding, modifying, or removing HTTP headers.

```typescript
// types/header-types.ts
interface HeaderDetails {
  url: string;
  method: string;
  requestHeaders?: Array<{ name: string; value: string }>;
  requestId: string;
  tabId: number;
  type: chrome.webRequest.ResourceType;
}

interface HeaderBlockingResponse {
  requestHeaders?: Array<{ name: string; value: string }>;
  cancel?: boolean;
}

// background/header-modifier.ts
import type { HeaderDetails, HeaderBlockingResponse } from '../types/header-types';

interface HeaderModificationRule {
  pattern: RegExp;
  modifications: {
    add?: Array<{ name: string; value: string }>;
    remove?: string[];
    modify?: Record<string, string>;
  };
}

const headerRules: HeaderModificationRule[] = [
  {
    pattern: /^https:\/\/api\./,
    modifications: {
      add: [
        { name: 'X-API-Version', value: '2.0' },
        { name: 'X-Client-Version', value: '1.0.0' }
      ],
      modify: {
        'User-Agent': 'MyExtension/1.0 (Chrome Extension)'
      }
    }
  },
  {
    pattern: /.*/,
    modifications: {
      // Remove tracking headers
      remove: ['Referer', 'X-Forwarded-For'],
      add: [
        { name: 'X-Do-Not-Track', value: '1' }
      ]
    }
  }
];

export function setupHeaderModifier(): void {
  chrome.webRequest.onBeforeSendHeaders.addListener(
    (details: HeaderDetails): HeaderBlockingResponse | undefined => {
      const requestHeaders = details.requestHeaders || [];
      const modifiedHeaders = [...requestHeaders];

      // Find matching rule
      const matchingRule = headerRules.find(rule => 
        rule.pattern.test(details.url)
      );

      if (!matchingRule) {
        return undefined;
      }

      const { modifications } = matchingRule;

      // Remove specified headers
      if (modifications.remove) {
        modifications.remove.forEach(headerName => {
          const index = modifiedHeaders.findIndex(
            h => h.name.toLowerCase() === headerName.toLowerCase()
          );
          if (index !== -1) {
            modifiedHeaders.splice(index, 1);
          }
        });
      }

      // Modify existing headers
      if (modifications.modify) {
        Object.entries(modifications.modify).forEach(([name, value]) => {
          const index = modifiedHeaders.findIndex(
            h => h.name.toLowerCase() === name.toLowerCase()
          );
          if (index !== -1) {
            modifiedHeaders[index].value = value;
          }
        });
      }

      // Add new headers
      if (modifications.add) {
        modifications.add.forEach(newHeader => {
          // Check if header already exists
          const existingIndex = modifiedHeaders.findIndex(
            h => h.name.toLowerCase() === newHeader.name.toLowerCase()
          );
          if (existingIndex !== -1) {
            modifiedHeaders[existingIndex].value = newHeader.value;
          } else {
            modifiedHeaders.push(newHeader);
          }
        });
      }

      return { requestHeaders: modifiedHeaders };
    },
    { urls: ['<all_urls>'] },
    ['blocking', 'requestHeaders']
  );
}
```

This pattern is particularly useful for implementing privacy features like Do Not Track, adding authentication tokens to API requests, or modifying User-Agent strings for testing purposes.

## Observing Response Headers with onHeadersReceived

The `onHeadersReceived` event fires when response headers are received from the server. This event allows you to read and modify response headers before the browser processes them.

```typescript
// background/response-handler.ts
interface ResponseDetails {
  url: string;
  statusCode: number;
  statusLine: string;
  responseHeaders?: Array<{ name: string; value: string }>;
  requestId: string;
  tabId: number;
  type: chrome.webRequest.ResourceType;
}

interface ResponseBlockingResponse {
  responseHeaders?: Array<{ name: string; value: string }>;
  redirectUrl?: string;
}

export function setupResponseInterceptor(): void {
  chrome.webRequest.onHeadersReceived.addListener(
    (details: ResponseDetails): ResponseBlockingResponse | undefined => {
      const responseHeaders = details.responseHeaders || [];
      const modifiedHeaders = [...responseHeaders];

      // Add security headers
      if (details.url.startsWith('https://')) {
        addHeaderIfMissing(modifiedHeaders, 'Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        addHeaderIfMissing(modifiedHeaders, 'X-Content-Type-Options', 'nosniff');
        addHeaderIfMissing(modifiedHeaders, 'X-Frame-Options', 'DENY');
      }

      // Handle CORS for API requests
      if (details.url.includes('/api/')) {
        addHeaderIfMissing(modifiedHeaders, 'Access-Control-Allow-Origin', '*');
        addHeaderIfMissing(modifiedHeaders, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      }

      // Remove sensitive headers
      removeHeader(modifiedHeaders, 'Server');
      removeHeader(modifiedHeaders, 'X-Powered-By');
      removeHeader(modifiedHeaders, 'X-AspNet-Version');

      return { responseHeaders: modifiedHeaders };
    },
    { urls: ['<all_urls>'] },
    ['blocking', 'responseHeaders']
  );
}

function addHeaderIfMissing(
  headers: Array<{ name: string; value: string }>,
  name: string,
  value: string
): void {
  const exists = headers.some(h => h.name.toLowerCase() === name.toLowerCase());
  if (!exists) {
    headers.push({ name, value });
  }
}

function removeHeader(
  headers: Array<{ name: string; value: string }>,
  name: string
): void {
  const index = headers.findIndex(h => h.name.toLowerCase() === name.toLowerCase());
  if (index !== -1) {
    headers.splice(index, 1);
  }
}
```

## Building an Ad Blocking Extension

Ad blocking represents one of the most common use cases for the webRequest API. Here's a complete implementation of an ad blocker with category-based blocking:

```typescript
// types/ad-blocker-types.ts
interface AdBlockerConfig {
  categories: {
    ads: boolean;
    trackers: boolean;
    social: boolean;
    malware: boolean;
    annoyances: boolean;
  };
}

interface BlockListEntry {
  domain: string;
  category: keyof AdBlockerConfig['categories'];
}

// data/block-lists.ts
export const blockLists: BlockListEntry[] = [
  // Ads
  { domain: 'doubleclick.net', category: 'ads' },
  { domain: 'googlesyndication.com', category: 'ads' },
  { domain: 'googleadservices.com', category: 'ads' },
  { domain: 'adnxs.com', category: 'ads' },
  { domain: 'adsrvr.org', category: 'ads' },
  { domain: 'advertising.com', category: 'ads' },
  { domain: 'adform.net', category: 'ads' },
  
  // Trackers
  { domain: 'google-analytics.com', category: 'trackers' },
  { domain: 'googletagmanager.com', category: 'trackers' },
  { domain: 'hotjar.com', category: 'trackers' },
  { domain: 'mixpanel.com', category: 'trackers' },
  { domain: 'segment.io', category: 'trackers' },
  { domain: 'amplitude.com', category: 'trackers' },
  
  // Social widgets
  { domain: 'facebook.net', category: 'social' },
  { domain: 'connect.facebook.net', category: 'social' },
  { domain: 'platform.twitter.com', category: 'social' },
  { domain: 'platform.linkedin.com', category: 'social' },
  { domain: 'addthis.com', category: 'social' },
  { domain: 'sharethis.com', category: 'social' },
  
  // Malware domains
  { domain: 'malware-example.com', category: 'malware' },
  { domain: 'phishing-site.net', category: 'malware' },
  
  // Annoyances
  { domain: 'onetrust.com', category: 'annoyances' },
  { domain: 'cookiebot.com', category: 'annoyances' },
  { domain: 'trustarc.com', category: 'annoyances' }
];

// background/ad-blocker.ts
import { blockLists } from '../data/block-lists';
import type { AdBlockerConfig } from '../types/ad-blocker-types';

class AdBlocker {
  private config: AdBlockerConfig = {
    categories: {
      ads: true,
      trackers: true,
      social: false,
      malware: true,
      annoyances: false
    }
  };

  private enabledCategories: Set<string>;

  constructor() {
    this.enabledCategories = new Set(
      Object.entries(this.config.categories)
        .filter(([_, enabled]) => enabled)
        .map(([category]) => category)
    );
  }

  updateConfig(newConfig: Partial<AdBlockerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.enabledCategories = new Set(
      Object.entries(this.config.categories)
        .filter(([_, enabled]) => enabled)
        .map(([category]) => category)
    );
  }

  shouldBlock(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      for (const entry of blockLists) {
        if (!this.enabledCategories.has(entry.category)) {
          continue;
        }

        if (hostname.includes(entry.domain) || entry.domain.includes(hostname)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  initialize(): void {
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        if (this.shouldBlock(details.url)) {
          return { cancel: true };
        }
        return undefined;
      },
      {
        urls: ['<all_urls>'],
        types: ['main_frame', 'sub_frame', 'script', 'image', 'xmlhttprequest', 'stylesheet', 'object', 'ping', 'csp_report', 'media', 'websocket', 'other']
      },
      ['blocking']
    );

    // Listen for requests to update stats
    chrome.webRequest.onCompleted.addListener(
      (details) => {
        if (!this.shouldBlock(details.url)) {
          this.incrementAllowedCount(details.type);
        }
      },
      { urls: ['<all_urls>'] }
    );

    chrome.webRequest.onErrorOccurred.addListener(
      (details) => {
        if (this.shouldBlock(details.url)) {
          this.incrementBlockedCount();
        }
      },
      { urls: ['<all_urls>'] }
    );
  }

  private async incrementBlockedCount(): Promise<void> {
    const result = await chrome.storage.local.get(['blockedCount']);
    await chrome.storage.local.set({
      blockedCount: (result.blockedCount || 0) + 1
    });
  }

  private async incrementAllowedCount(type: string): Promise<void> {
    const result = await chrome.storage.local.get(['allowedCounts']);
    const counts = result.allowedCounts || {};
    counts[type] = (counts[type] || 0) + 1;
    await chrome.storage.local.set({ allowedCounts: counts });
  }
}

export const adBlocker = new AdBlocker();
```

## Privacy Tool Implementation

Beyond ad blocking, the webRequest API enables sophisticated privacy protection tools. Here's a comprehensive privacy extension:

```typescript
// background/privacy-shield.ts
interface PrivacySettings {
  blockTrackingPixels: boolean;
  removeUTMParams: boolean;
  blockThirdPartyCookies: boolean;
  spoofFingerprint: boolean;
}

class PrivacyShield {
  private settings: PrivacySettings = {
    blockTrackingPixels: true,
    removeUTMParams: true,
    blockThirdPartyCookies: false,
    spoofFingerprint: false
  };

  // Common tracking pixel domains
  private trackingPixels = [
    'facebook.com/tr',
    'analytics.twitter.com/i',
    'bat.bing.com/bat.js',
    'pixel.',
    'track.',
    'trk.',
    'beacon.'
  ];

  // UTM parameters to remove
  private utmParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
    'msclkid',
    'dclid',
    'zanpid',
    'mc_cid',
    'mc_eid'
  ];

  updateSettings(newSettings: Partial<PrivacySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  initialize(): void {
    this.setupRequestInterceptor();
    this.setupHeaderBlocker();
  }

  private setupRequestInterceptor(): void {
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => {
        // Block tracking pixels
        if (this.settings.blockTrackingPixels && this.isTrackingPixel(details.url)) {
          return { cancel: true };
        }

        // Remove UTM parameters from URLs
        if (this.settings.removeUTMParams && details.url.includes('?')) {
          const url = new URL(details.url);
          let hasChanges = false;

          this.utmParams.forEach(param => {
            if (url.searchParams.has(param)) {
              url.searchParams.delete(param);
              hasChanges = true;
            }
          });

          if (hasChanges) {
            return { redirectUrl: url.toString() };
          }
        }

        return undefined;
      },
      { urls: ['<all_urls>'] },
      ['blocking']
    );
  }

  private setupHeaderBlocker(): void {
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (details) => {
        if (!this.settings.blockThirdPartyCookies) {
          return undefined;
        }

        const requestHeaders = details.requestHeaders || [];
        const modifiedHeaders = requestHeaders.filter(
          header => header.name.toLowerCase() !== 'cookie'
        );

        if (modifiedHeaders.length !== requestHeaders.length) {
          return { requestHeaders: modifiedHeaders };
        }

        return undefined;
      },
      { urls: ['<all_urls>'] },
      ['blocking', 'requestHeaders']
    );
  }

  private isTrackingPixel(url: string): boolean {
    const urlLower = url.toLowerCase();
    return this.trackingPixels.some(tracker => 
      urlLower.includes(tracker.toLowerCase())
    );
  }
}

export const privacyShield = new PrivacyShield();
```

## Best Practices for webRequest Implementation

When implementing webRequest functionality in your extensions, following best practices ensures both performance and user trust.

### Permission Minimization

Always request the minimum host permissions necessary for your functionality. Instead of `<all_urls>`, specify the exact domains your extension needs to intercept:

```json
{
  "host_permissions": [
    "https://api.example.com/*",
    "https://*.trusted-site.org/*"
  ]
}
```

### Performance Considerations

The webRequest API can impact browser performance if not implemented carefully. Follow these guidelines:

Avoid blocking operations when possible—use the Declarative Net Request API for simple blocking rules. Filter your event listeners to specific URL patterns rather than using `<all_urls>` when you don't need global coverage. Cache blocking decisions rather than evaluating them on every request.

### Error Handling

Always implement proper error handling in your listeners:

```typescript
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    try {
      // Your logic here
    } catch (error) {
      console.error('[WebRequest] Error processing request:', error);
      // Don't block on error - allow request to proceed
      return undefined;
    }
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);
```

### User Communication

Be transparent with users about what your extension does. Display clear notifications about blocked requests and provide controls for users to customize behavior.

## Common Use Cases Summary

The webRequest API enables numerous practical applications beyond what we've covered. Enterprise extensions use it for API request logging and debugging. Content filtering tools use it to remove unwanted page elements before rendering. Developer tools leverage it for network request inspection and modification. Security extensions use it to block known malicious domains and detect suspicious network behavior.

The key to successful implementation is understanding the event lifecycle, choosing the right event for your use case, and implementing proper error handling and performance optimization.

---

Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one
