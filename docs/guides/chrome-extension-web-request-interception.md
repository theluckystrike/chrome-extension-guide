---
layout: default
title: "Chrome Extension Web Request Interception. Complete Developer Guide"
description: "Master webRequest API for Chrome extensions. Learn request modification, ad blocking patterns, and privacy tools with TypeScript examples."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-web-request-interception/"
last_modified_at: 2026-01-15
---

Chrome Extension Web Request Interception. Complete Developer Guide

The Chrome Extension webRequest interception API represents one of the most powerful capabilities available to extension developers. This comprehensive guide dives deep into the webRequest API, exploring advanced request modification techniques, building effective ad blocking systems, and creating privacy-focused tools that respect user security while delivering powerful functionality. Whether you're building a developer utility, a content filter, or a privacy extension, understanding request interception is fundamental to creating sophisticated Chrome extensions.

Understanding the webRequest API Architecture

The chrome.webRequest API provides a comprehensive interface for observing and analyzing network traffic flowing through the Chrome browser. Unlike content scripts that operate within the context of web pages, the webRequest API operates at the network layer, giving extensions visibility into and control over HTTP and HTTPS requests before they reach their destination servers.

The architecture centers around a powerful event-driven system where Chrome fires events at various stages of the request lifecycle. Extensions can register listeners for these events to analyze, modify, or block requests based on sophisticated criteria. This event-based model allows for clean separation of concerns and enables extensions to handle complex interception scenarios without cluttering their core logic.

Understanding the permission model is crucial before implementing any webRequest functionality. The basic `"webRequest"` permission grants observation capabilities, your extension can see requests happening without necessarily being able to modify them. For modification capabilities, additional permissions become necessary, and the requirements differ significantly between Manifest V2 and Manifest V3.

Request Lifecycle Events in Detail

The webRequest API fires events in a predictable sequence for each network request, giving developers multiple opportunities to intercept and manipulate traffic. The lifecycle begins with `onBeforeRequest`, which fires when a request is about to be initiated, this is the earliest intervention point where you can cancel requests entirely or redirect them to different URLs.

Following the initial request, `onBeforeSendHeaders` fires just before request headers are transmitted to the server. This event provides the critical ability to add, remove, or modify headers such as User-Agent, Accept-Language, Cookie values, or custom headers your application requires. The next event in the sequence, `onSendHeaders`, fires after headers have been sent, serving primarily for logging and monitoring purposes rather than modification.

When the server responds, `onHeadersReceived` fires with the complete response headers, enabling you to read or modify headers like Content-Type, Cache-Control, Set-Cookie, or custom response headers. For requests requiring HTTP authentication, the `onAuthRequired` event provides an opportunity to programmatically supply credentials without user intervention. Finally, `onResponseStarted` indicates the first byte of the response body has arrived, while `onCompleted` signals successful completion, and `onErrorOccurred` handles any failures during the request lifecycle.

Setting Up Your Extension for Request Interception

Proper manifest configuration forms the foundation of any webRequest implementation. The permissions you declare determine what capabilities your extension will have, and understanding these requirements prevents common development frustrations.

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

The distinction between `"permissions"` and `"host_permissions"` is critical in Manifest V3. The `"webRequest"` permission goes in the permissions array, while the domains you want to intercept go in host_permissions. Using `"<all_urls>"` grants access to all websites but triggers additional scrutiny during Chrome Web Store review.

For Manifest V3, it's important to note that the `webRequestBlocking` permission has significant restrictions. While it still works in Manifest V2, public extensions in Manifest V3 cannot use blocking webRequest listeners for modification. Instead, Google recommends the `declarativeNetRequest` API for blocking and modification capabilities. However, for enterprise extensions or development builds, the blocking API remains available.

TypeScript Implementation Patterns

TypeScript adds significant value to webRequest implementations through type safety and IntelliSense support.  comprehensive TypeScript examples that demonstrate real-world patterns.

Basic Request Monitoring

The simplest use case involves monitoring requests without modification. This pattern is essential for analytics extensions, developer tools, and debugging utilities.

```typescript
// types/webrequest.ts
interface RequestDetails {
  url: string;
  method: string;
  tabId: number;
  frameId: number;
  parentFrameId: number;
  timestamp: number;
  type: chrome.webRequest.ResourceType;
  initiator: string | undefined;
  requestId: string;
}

interface RequestFilter {
  urls: string[];
  types?: chrome.webRequest.ResourceType[];
  tabId?: number;
  windowId?: number;
}

// background/request-monitor.ts
type RequestCallback = (details: RequestDetails) => void;

class RequestMonitor {
  private listeners: Map<string, RequestCallback[]> = new Map();

  constructor() {
    this.initializeListeners();
  }

  private initializeListeners(): void {
    // Monitor request completion for all requests
    chrome.webRequest.onCompleted.addListener(
      (details) => this.handleRequestComplete(details),
      { urls: ["<all_urls>"] },
      ["responseHeaders"]
    );

    // Monitor failed requests
    chrome.webRequest.onErrorOccurred.addListener(
      (details) => this.handleError(details),
      { urls: ["<all_urls>"] }
    );

    // Track request initiation
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => this.handleBeforeRequest(details),
      { urls: ["<all_urls>"] }
    );
  }

  private handleRequestComplete(details: chrome.webRequest.OnCompletedDetails): void {
    console.log(`Request completed: ${details.method} ${details.url}`);
    console.log(`Status: ${details.statusCode}`);
    console.log(`Type: ${details.type}`);
    console.log(`Tab ID: ${details.tabId}`);
    
    // Analyze response headers
    if (details.responseHeaders) {
      const contentType = details.responseHeaders.find(
        header => header.name.toLowerCase() === 'content-type'
      );
      const cacheControl = details.responseHeaders.find(
        header => header.name.toLowerCase() === 'cache-control'
      );
      
      console.log('Content-Type:', contentType?.value);
      console.log('Cache-Control:', cacheControl?.value);
    }
  }

  private handleError(details: chrome.webRequest.OnErrorOccurredDetails): void {
    console.error(`Request failed: ${details.url}`);
    console.error(`Error: ${details.error}`);
    console.error(`Type: ${details.type}`);
  }

  private handleBeforeRequest(details: chrome.webRequest.OnBeforeRequestDetails): void {
    console.log(`Request initiated: ${details.method} ${details.url}`);
    
    // Analyze POST data if present
    if (details.requestBody) {
      if (details.requestBody.formData) {
        console.log('Form data:', details.requestBody.formData);
      }
      if (details.requestBody.raw) {
        console.log('Raw body present, length:', details.requestBody.raw.length);
      }
    }
  }

  // Register custom listeners
  public onRequestComplete(callback: RequestCallback): void {
    const listeners = this.listeners.get('complete') || [];
    listeners.push(callback);
    this.listeners.set('complete', listeners);
  }
}

export const requestMonitor = new RequestMonitor();
```

Request Modification and Blocking

Implementing request modification requires careful attention to the blocking API and proper return values. This pattern demonstrates how to modify headers and block specific requests.

```typescript
// types/request-modification.ts
interface BlockingResponse {
  cancel?: boolean;
  redirectUrl?: string;
  requestHeaders?: chrome.webRequest.HttpHeader[];
  responseHeaders?: chrome.webRequest.HttpHeader[];
}

interface HeaderModificationRule {
  header: string;
  operation: 'set' | 'remove' | 'append';
  value?: string;
}

class RequestModifier {
  // Block requests to specific domains
  public blockDomains(patterns: string[]): void {
    chrome.webRequest.onBeforeRequest.addListener(
      (details): BlockingResponse | undefined => {
        const url = new URL(details.url);
        const shouldBlock = patterns.some(pattern => 
          url.hostname.includes(pattern)
        );
        
        if (shouldBlock) {
          console.log(`Blocking request to: ${details.url}`);
          return { cancel: true };
        }
        
        return undefined;
      },
      { urls: ["<all_urls>"] },
      ["blocking"]
    );
  }

  // Redirect requests to different URLs
  public setupRedirects(redirects: Map<string, string>): void {
    chrome.webRequest.onBeforeRequest.addListener(
      (details): BlockingResponse | undefined => {
        for (const [pattern, redirectUrl] of redirects) {
          if (details.url.includes(pattern)) {
            console.log(`Redirecting ${details.url} to ${redirectUrl}`);
            return { redirectUrl };
          }
        }
        return undefined;
      },
      { urls: ["<all_urls>"] },
      ["blocking"]
    );
  }

  // Modify request headers
  public modifyRequestHeaders(modifications: HeaderModificationRule[]): void {
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (details): BlockingResponse | undefined => {
        const headers = details.requestHeaders || [];
        
        for (const mod of modifications) {
          const existingIndex = headers.findIndex(
            h => h.name.toLowerCase() === mod.header.toLowerCase()
          );
          
          switch (mod.operation) {
            case 'set':
              if (existingIndex >= 0) {
                headers[existingIndex].value = mod.value;
              } else {
                headers.push({ name: mod.header, value: mod.value });
              }
              break;
            case 'remove':
              if (existingIndex >= 0) {
                headers.splice(existingIndex, 1);
              }
              break;
            case 'append':
              headers.push({ name: mod.header, value: mod.value });
              break;
          }
        }
        
        return { requestHeaders: headers };
      },
      { urls: ["<all_urls>"] },
      ["blocking", "requestHeaders"]
    );
  }

  // Modify response headers
  public modifyResponseHeaders(modifications: HeaderModificationRule[]): void {
    chrome.webRequest.onHeadersReceived.addListener(
      (details): BlockingResponse | undefined => {
        const headers = details.responseHeaders || [];
        
        for (const mod of modifications) {
          const existingIndex = headers.findIndex(
            h => h.name.toLowerCase() === mod.header.toLowerCase()
          );
          
          switch (mod.operation) {
            case 'set':
              if (existingIndex >= 0) {
                headers[existingIndex].value = mod.value;
              } else {
                headers.push({ name: mod.header, value: mod.value });
              }
              break;
            case 'remove':
              if (existingIndex >= 0) {
                headers.splice(existingIndex, 1);
              }
              break;
            case 'append':
              headers.push({ name: mod.header, value: mod.value });
              break;
          }
        }
        
        return { responseHeaders: headers };
      },
      { urls: ["<all_urls>"] },
      ["blocking", "responseHeaders"]
    );
  }
}

export const requestModifier = new RequestModifier();
```

Building an Ad Blocker with Practical Patterns

Ad blocking represents one of the most common use cases for webRequest interception. A well-designed ad blocker combines multiple filtering strategies while maintaining performance and respecting user privacy.

```typescript
// types/ad-blocker.ts
interface FilterRule {
  id: number;
  pattern: string;
  type: 'domain' | 'regex' | 'url';
  action: 'block' | 'allow' | 'redirect';
  redirectUrl?: string;
}

interface AdBlockerConfig {
  enabled: boolean;
  blockedDomains: string[];
  customFilters: FilterRule[];
  statistics: {
    blockedCount: number;
    allowedCount: number;
  };
}

class AdBlocker {
  private config: AdBlockerConfig = {
    enabled: true,
    blockedDomains: [
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      'facebook.com/tr',
      'analytics.google.com',
      'googletagmanager.com',
    ],
    customFilters: [],
    statistics: {
      blockedCount: 0,
      allowedCount: 0,
    },
  };

  constructor() {
    this.initializeBlocking();
    this.loadConfiguration();
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(['adBlockerConfig']);
      if (stored.adBlockerConfig) {
        this.config = { ...this.config, ...stored.adBlockerConfig };
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  private initializeBlocking(): void {
    // Block requests before they're sent
    chrome.webRequest.onBeforeRequest.addListener(
      (details): BlockingResponse | undefined => {
        if (!this.config.enabled) {
          return undefined;
        }

        // Check against blocked domains
        try {
          const url = new URL(details.url);
          
          for (const domain of this.config.blockedDomains) {
            if (url.hostname.includes(domain)) {
              this.config.statistics.blockedCount++;
              this.updateStatistics();
              
              console.log(`[AdBlocker] Blocked: ${details.url}`);
              return { cancel: true };
            }
          }

          // Check custom filters
          for (const filter of this.config.customFilters) {
            if (this.matchesFilter(details.url, filter)) {
              if (filter.action === 'block') {
                this.config.statistics.blockedCount++;
                this.updateStatistics();
                return { cancel: true };
              } else if (filter.action === 'redirect' && filter.redirectUrl) {
                return { redirectUrl: filter.redirectUrl };
              }
            }
          }

          this.config.statistics.allowedCount++;
        } catch (error) {
          console.error('Error parsing URL:', error);
        }

        return undefined;
      },
      { urls: ["<all_urls>"] },
      ["blocking"]
    );

    // Remove tracking parameters from URLs
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (details): BlockingResponse | undefined => {
        if (!this.config.enabled) {
          return undefined;
        }

        const url = new URL(details.url);
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
        let modified = false;

        trackingParams.forEach(param => {
          if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            modified = true;
          }
        });

        if (modified && details.requestHeaders) {
          const newUrl = url.toString();
          // Reconstruct the request URL would require redirect
          // For header-only modifications, we could add a custom header
          console.log(`[AdBlocker] Cleaned tracking params: ${details.url}`);
        }

        return undefined;
      },
      { urls: ["<all_urls>"] },
      ["blocking", "requestHeaders"]
    );
  }

  private matchesFilter(url: string, filter: FilterRule): boolean {
    try {
      switch (filter.type) {
        case 'domain':
          const parsedUrl = new URL(url);
          return parsedUrl.hostname.includes(filter.pattern);
        case 'url':
          return url.includes(filter.pattern);
        case 'regex':
          return new RegExp(filter.pattern).test(url);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private async updateStatistics(): Promise<void> {
    try {
      await chrome.storage.local.set({
        adBlockerStats: this.config.statistics,
      });
    } catch (error) {
      console.error('Failed to update statistics:', error);
    }
  }

  public toggle(enabled: boolean): void {
    this.config.enabled = enabled;
    this.saveConfiguration();
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await chrome.storage.local.set({
        adBlockerConfig: this.config,
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }
}

export const adBlocker = new AdBlocker();
```

Creating Privacy Protection Tools

Privacy extensions benefit greatly from webRequest interception capabilities. These tools can block tracking scripts, remove identifying headers, and provide users with control over their digital footprint.

```typescript
// types/privacy-protector.ts
interface PrivacySettings {
  blockTrackers: boolean;
  blockSocialWidgets: boolean;
  removeFingerprinting: boolean;
  blockThirdPartyCookies: boolean;
  clearOnExit: boolean;
}

interface TrackerCategory {
  name: string;
  domains: string[];
}

class PrivacyProtector {
  private settings: PrivacySettings = {
    blockTrackers: true,
    blockSocialWidgets: true,
    removeFingerprinting: true,
    blockThirdPartyCookies: true,
    clearOnExit: false,
  };

  private trackerCategories: TrackerCategory[] = [
    {
      name: 'Analytics',
      domains: [
        'google-analytics.com',
        'analytics.google.com',
        'hotjar.com',
        'mixpanel.com',
        'segment.io',
        'amplitude.com',
        'heap.io',
      ],
    },
    {
      name: 'Advertising',
      domains: [
        'doubleclick.net',
        'googlesyndication.com',
        'adnxs.com',
        'criteo.com',
        'taboola.com',
        'outbrain.com',
      ],
    },
    {
      name: 'Social',
      domains: [
        'facebook.com/plugins',
        'facebook.com/tr',
        'platform.twitter.com',
        'platform.linkedin.com',
        'disqus.com',
      ],
    },
  ];

  constructor() {
    this.initializeProtection();
    this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await chrome.storage.sync.get(['privacySettings']);
      if (stored.privacySettings) {
        this.settings = { ...this.settings, ...stored.privacySettings };
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  }

  private initializeProtection(): void {
    // Block tracker requests
    if (this.settings.blockTrackers) {
      this.setupTrackerBlocking();
    }

    // Remove fingerprinting headers
    if (this.settings.removeFingerprinting) {
      this.setupFingerprintingProtection();
    }

    // Handle third-party cookie blocking via headers
    if (this.settings.blockThirdPartyCookies) {
      this.setupCookieProtection();
    }
  }

  private setupTrackerBlocking(): void {
    chrome.webRequest.onBeforeRequest.addListener(
      (details): BlockingResponse | undefined => {
        const url = new URL(details.url);
        
        for (const category of this.trackerCategories) {
          for (const domain of category.domains) {
            if (url.hostname.includes(domain)) {
              console.log(`[Privacy] Blocked ${category.name} tracker: ${details.url}`);
              return { cancel: true };
            }
          }
        }
        
        return undefined;
      },
      { urls: ["<all_urls>"] },
      ["blocking"]
    );
  }

  private setupFingerprintingProtection(): void {
    chrome.webRequest.onBeforeSendHeaders.addListener(
      (details): BlockingResponse | undefined => {
        const headers = details.requestHeaders || [];
        const modified: chrome.webRequest.HttpHeader[] = [];
        
        for (const header of headers) {
          // Remove or anonymize fingerprinting vectors
          const nameLower = header.name.toLowerCase();
          
          if (nameLower === 'user-agent') {
            // Replace with generic user agent
            modified.push({
              name: 'User-Agent',
              value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            });
          } else if (nameLower === 'accept-language') {
            // Limit language information
            modified.push({
              name: 'Accept-Language',
              value: 'en-US,en;q=0.9',
            });
          } else if (nameLower === 'referer') {
            // Limit referrer information for privacy
            try {
              const refererUrl = new URL(header.value || '');
              const currentUrl = new URL(details.url);
              
              // Only send referrer to same-domain requests
              if (refererUrl.hostname !== currentUrl.hostname) {
                // Don't include referrer for cross-origin requests
                continue;
              }
            } catch {
              // Invalid referrer, skip it
              continue;
            }
          } else {
            modified.push(header);
          }
        }
        
        return { requestHeaders: modified };
      },
      { urls: ["<all_urls>"] },
      ["blocking", "requestHeaders"]
    );
  }

  private setupCookieProtection(): void {
    chrome.webRequest.onHeadersReceived.addListener(
      (details): BlockingResponse | undefined => {
        const headers = details.responseHeaders || [];
        const modified: chrome.webRequest.HttpHeader[] = [];
        
        for (const header of headers) {
          const nameLower = header.name.toLowerCase();
          
          // Remove or modify cookies for third-party requests
          if (nameLower === 'set-cookie') {
            const cookieValue = header.value || '';
            
            // Add SameSite=Strict for enhanced privacy
            if (!cookieValue.includes('SameSite=')) {
              const modifiedCookie = cookieValue + '; SameSite=Strict; Secure';
              modified.push({
                name: 'Set-Cookie',
                value: modifiedCookie,
              });
            } else {
              modified.push(header);
            }
          } else {
            modified.push(header);
          }
        }
        
        return { responseHeaders: modified };
      },
      { urls: ["<all_urls>"] },
      ["blocking", "responseHeaders"]
    );
  }

  public updateSettings(newSettings: Partial<PrivacySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.initializeProtection(); // Re-initialize with new settings
    this.saveSettings();
  }

  private async saveSettings(): Promise<void> {
    try {
      await chrome.storage.sync.set({
        privacySettings: this.settings,
      });
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }
}

export const privacyProtector = new PrivacyProtector();
```

Best Practices for Production Extensions

When deploying webRequest-based extensions to production, several critical considerations ensure reliability, performance, and user trust. Following these best practices helps avoid common pitfalls and ensures your extension passes Chrome Web Store review.

Performance optimization begins with minimizing the scope of your request interception. Rather than intercepting all URLs with `"<all_urls>"`, filter to specific domains or URL patterns that actually require processing. Each event listener that matches all URLs fires potentially thousands of times per minute during normal browsing, creating significant overhead. If your extension only needs to monitor requests to a specific API, restrict your filters accordingly.

Memory management requires attention in service worker-based extensions. The service worker can terminate when idle, so avoid relying on in-memory state for critical functionality. Persist configuration and state to chrome.storage, and design your extension to handle service worker restarts gracefully. When registering webRequest listeners in the background service worker, ensure they're properly registered each time the worker activates.

Permission requests deserve careful consideration. Request only the minimum permissions necessary for your extension's functionality. If you only need to observe requests without modification, avoid requesting blocking permissions. For host permissions, be as specific as possible, rather than `"<all_urls>"`, use patterns like `"https://api.example.com/*"` where applicable. Overly broad permissions trigger additional review and may concern privacy-conscious users.

Error handling within webRequest listeners must be robust. Since these listeners run in the background service worker context, unhandled exceptions can crash your extension's ability to intercept requests. Always wrap listener logic in try-catch blocks and log errors appropriately. Consider implementing a circuit breaker pattern that temporarily disables listeners if errors become frequent.

Testing your extension thoroughly across different scenarios is essential. Test with various network conditions, including slow connections and offline states. Verify that your extension handles redirects, authentication requirements, and error responses correctly. Use Chrome's developer tools to inspect network traffic and ensure your interception is working as expected.

Security Considerations

Security forms a critical foundation for any webRequest-based extension. The ability to intercept and modify network requests carries significant responsibility, and poor security practices can harm users or lead to your extension being removed from the Chrome Web Store.

Never exfiltrate request data without explicit user consent and transparent disclosure. If your extension logs URLs or request content for analytics, inform users in your extension's description and privacy policy. Consider providing user-facing controls to disable logging or data collection.

When modifying headers, avoid removing security-critical headers such as Content-Security-Policy, X-Content-Type-Options, or Strict-Transport-Security. These headers protect users from various attacks, and removing them weakens browser security. Similarly, be cautious about modifying authentication headers, incorrect handling can expose credentials or break secure authentication flows.

Validate all URL patterns and redirect destinations to prevent open redirect vulnerabilities. Ensure that your extension cannot be tricked into redirecting users to malicious sites through crafted URLs. When implementing redirect functionality, validate that target URLs are properly formatted and belong to expected domains.

Conclusion

The webRequest API provides Chrome extension developers with powerful capabilities for observing and manipulating network traffic. From building sophisticated ad blockers to creating privacy protection tools, understanding these APIs enables you to create extensions that meaningfully impact user browsing experiences.

Key takeaways from this guide include understanding the event lifecycle and appropriate interception points, implementing TypeScript patterns that provide type safety and maintainability, building practical ad blocking and privacy tools with real-world code examples, following best practices for performance, security, and user trust, and properly configuring manifest permissions to support your use case while minimizing scope.

As you build your extension, remember that with great power comes great responsibility. Use these capabilities to enhance user privacy and security, be transparent about your extension's behavior, and always prioritize user interests in your design decisions.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
