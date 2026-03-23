---
layout: default
title: "Chrome Extension Navigation Url Handling — Best Practices"
description: "Handle navigation events and URL changes with the webNavigation API."
canonical_url: "https://bestchromeextensions.com/patterns/navigation-url-handling/"
---

# Navigation and URL Handling Patterns

## Overview {#overview}

Extensions frequently need to observe, intercept, and manipulate navigation. Chrome provides `chrome.webNavigation`, `chrome.declarativeNetRequest`, and content-script-level techniques for this. This guide covers 8 production patterns: advanced URL matching, navigation events, SPA detection, URL canonicalization, deep linking, redirect handling, parameter manipulation, and history tracking.

> **Permissions**: `"webNavigation"` for navigation events. `"declarativeNetRequest"` for redirect rules. Content scripts need `"activeTab"` or host permissions.

---

## Pattern 1: URL Pattern Matching Beyond Manifest Matches {#pattern-1-url-pattern-matching-beyond-manifest-matches}

Manifest `matches` patterns are limited to scheme/host/path globs. For finer control, use `URLPattern` or regex in your service worker:

```ts
// background.ts
// URLPattern is available in service workers (Chrome 95+)
const patterns = [
  new URLPattern({ hostname: "*.github.com", pathname: "/:owner/:repo/pull/:id" }),
  new URLPattern({ hostname: "*.github.com", pathname: "/:owner/:repo/issues/:id" }),
  new URLPattern({ hostname: "docs.google.com", pathname: "/document/d/:docId/*" }),
];

function matchUrl(url: string): { pattern: URLPattern; groups: Record<string, string> } | null {
  for (const pattern of patterns) {
    const result = pattern.exec(url);
    if (result) {
      return {
        pattern,
        groups: {
          ...result.hostname.groups,
          ...result.pathname.groups,
        },
      };
    }
  }
  return null;
}

// Use in tab update listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;
  const match = matchUrl(changeInfo.url);
  if (match) {
    console.log("Matched:", match.groups);
    // e.g. { owner: "facebook", repo: "react", id: "1234" }
  }
});
```

For content scripts where `URLPattern` may not be available, use a lightweight matcher:

```ts
// content.ts
function matchPath(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split("/");
  const pathParts = path.split("/");

  if (patternParts.length !== pathParts.length) return null;

  const groups: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      groups[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== "*" && patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return groups;
}

// Usage
const params = matchPath("/:owner/:repo/pull/:id", location.pathname);
if (params) {
  console.log(`PR #${params.id} in ${params.owner}/${params.repo}`);
}
```

---

## Pattern 2: webNavigation Events {#pattern-2-webnavigation-events}

The `chrome.webNavigation` API provides granular navigation lifecycle events that `tabs.onUpdated` cannot:

```ts
// background.ts

// Fires before any navigation starts — good for pre-checks
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  // details.tabId, details.url, details.frameId, details.parentFrameId
  if (details.frameId === 0) {
    // Top-level frame navigation
    console.log(`Tab ${details.tabId} navigating to ${details.url}`);
  }
});

// Fires when the document is fully loaded (DOMContentLoaded equivalent)
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) {
    console.log(`Tab ${details.tabId} finished loading ${details.url}`);
  }
});

// Fires on pushState/replaceState — critical for SPAs
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  console.log(`SPA navigation in tab ${details.tabId}: ${details.url}`);
});

// Fires when a fragment (hash) changes
chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
  console.log(`Hash changed in tab ${details.tabId}: ${details.url}`);
});
```

Filter events by URL patterns to reduce noise:

```ts
const githubFilter: chrome.webNavigation.WebNavigationEventFilter = {
  url: [
    { hostSuffix: "github.com", pathPrefix: "/" },
  ],
};

chrome.webNavigation.onCompleted.addListener((details) => {
  // Only fires for github.com pages
  injectGitHubEnhancements(details.tabId);
}, githubFilter);

// Combine multiple filters
const docsFilter: chrome.webNavigation.WebNavigationEventFilter = {
  url: [
    { hostEquals: "docs.google.com" },
    { hostEquals: "notion.so" },
    { hostSuffix: "confluence.atlassian.net" },
  ],
};

chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId !== 0) return;
  trackDocumentVisit(details.tabId, details.url);
}, docsFilter);
```

Build a navigation timeline for debugging:

```ts
interface NavEvent {
  type: string;
  url: string;
  frameId: number;
  timestamp: number;
}

const navTimelines = new Map<number, NavEvent[]>();

function recordNavEvent(type: string, details: { tabId: number; url: string; frameId: number }): void {
  const timeline = navTimelines.get(details.tabId) ?? [];
  timeline.push({
    type,
    url: details.url,
    frameId: details.frameId,
    timestamp: Date.now(),
  });
  // Keep last 50 events per tab
  if (timeline.length > 50) timeline.shift();
  navTimelines.set(details.tabId, timeline);
}

chrome.webNavigation.onBeforeNavigate.addListener((d) => recordNavEvent("beforeNavigate", d));
chrome.webNavigation.onCommitted.addListener((d) => recordNavEvent("committed", d));
chrome.webNavigation.onDOMContentLoaded.addListener((d) => recordNavEvent("domContentLoaded", d));
chrome.webNavigation.onCompleted.addListener((d) => recordNavEvent("completed", d));
chrome.webNavigation.onHistoryStateUpdated.addListener((d) => recordNavEvent("historyState", d));
```

---

## Pattern 3: SPA Navigation Detection in Content Scripts {#pattern-3-spa-navigation-detection-in-content-scripts}

SPAs change URLs without full page loads. Detect this reliably in content scripts:

```ts
// content.ts
class SPANavigationObserver {
  private currentUrl: string;
  private callbacks: Array<(oldUrl: string, newUrl: string) => void> = [];

  constructor() {
    this.currentUrl = location.href;
    this.setupObservers();
  }

  onChange(callback: (oldUrl: string, newUrl: string) => void): void {
    this.callbacks.push(callback);
  }

  private notify(newUrl: string): void {
    if (newUrl === this.currentUrl) return;
    const oldUrl = this.currentUrl;
    this.currentUrl = newUrl;
    for (const cb of this.callbacks) {
      cb(oldUrl, newUrl);
    }
  }

  private setupObservers(): void {
    // 1. Intercept pushState and replaceState
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      originalPushState(...args);
      this.notify(location.href);
    };

    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      originalReplaceState(...args);
      this.notify(location.href);
    };

    // 2. Listen for popstate (back/forward)
    window.addEventListener("popstate", () => {
      this.notify(location.href);
    });

    // 3. Listen for hashchange
    window.addEventListener("hashchange", () => {
      this.notify(location.href);
    });

    // 4. Fallback: MutationObserver on <title> for frameworks that
    //    update the title on navigation but use unconventional routing
    const titleEl = document.querySelector("title");
    if (titleEl) {
      const observer = new MutationObserver(() => {
        if (location.href !== this.currentUrl) {
          this.notify(location.href);
        }
      });
      observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }
  }
}

// Usage
const spaNav = new SPANavigationObserver();
spaNav.onChange((oldUrl, newUrl) => {
  console.log(`SPA navigated: ${oldUrl} -> ${newUrl}`);
  // Re-run your content script logic for the new page
  chrome.runtime.sendMessage({ type: "spa-navigation", oldUrl, newUrl });
});
```

> **Note**: If your content script runs in the `ISOLATED` world (default), override `history.pushState` via a [main-world script](content-script-isolation.md) injected with `"world": "MAIN"` in the manifest, then communicate back via `CustomEvent` or `window.postMessage`.

---

## Pattern 4: URL Canonicalization and Comparison {#pattern-4-url-canonicalization-and-comparison}

Normalize URLs before comparing them to avoid false negatives:

```ts
// shared/url-utils.ts
interface CanonicalizeOptions {
  stripHash?: boolean;
  stripTrailingSlash?: boolean;
  stripWww?: boolean;
  stripTracking?: boolean;
  sortParams?: boolean;
  lowercaseHostname?: boolean;
}

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "dclid", "msclkid", "twclid",
  "ref", "ref_src", "ref_url",
]);

function canonicalizeUrl(raw: string, options: CanonicalizeOptions = {}): string {
  const {
    stripHash = true,
    stripTrailingSlash = true,
    stripWww = true,
    stripTracking = true,
    sortParams = true,
    lowercaseHostname = true,
  } = options;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw; // Return as-is if unparseable
  }

  // Lowercase hostname
  if (lowercaseHostname) {
    url.hostname = url.hostname.toLowerCase();
  }

  // Strip www
  if (stripWww) {
    url.hostname = url.hostname.replace(/^www\./, "");
  }

  // Strip tracking params
  if (stripTracking) {
    for (const param of TRACKING_PARAMS) {
      url.searchParams.delete(param);
    }
  }

  // Sort remaining params
  if (sortParams) {
    url.searchParams.sort();
  }

  // Strip hash
  if (stripHash) {
    url.hash = "";
  }

  let result = url.toString();

  // Strip trailing slash (but not for root path)
  if (stripTrailingSlash && url.pathname !== "/") {
    result = result.replace(/\/$/, "");
  }

  return result;
}

function urlsEqual(a: string, b: string, options?: CanonicalizeOptions): boolean {
  return canonicalizeUrl(a, options) === canonicalizeUrl(b, options);
}

// Examples:
// urlsEqual("https://WWW.Example.Com/page/", "https://example.com/page") => true
// urlsEqual("https://x.com/a?utm_source=tw&q=1", "https://x.com/a?q=1") => true
```

---

## Pattern 5: Deep Linking into Extension Pages {#pattern-5-deep-linking-into-extension-pages}

Create linkable routes within your extension's HTML pages:

```ts
// Extension page router — works in popup, side panel, options, or full-tab pages
// options.html or sidepanel.html

interface Route {
  path: string;
  title: string;
  render: (params: URLSearchParams) => void;
}

const routes: Route[] = [
  { path: "/settings", title: "Settings", render: renderSettings },
  { path: "/settings/advanced", title: "Advanced Settings", render: renderAdvanced },
  { path: "/history", title: "History", render: renderHistory },
  { path: "/detail", title: "Detail View", render: renderDetail },
];

function navigateTo(path: string, params?: Record<string, string>): void {
  const searchParams = new URLSearchParams(params);
  const hash = searchParams.toString() ? `${path}?${searchParams}` : path;
  location.hash = hash;
}

function handleRoute(): void {
  const hash = location.hash.slice(1) || "/settings"; // Default route
  const [path, queryString] = hash.split("?");
  const params = new URLSearchParams(queryString ?? "");

  const route = routes.find((r) => r.path === path);
  if (route) {
    document.title = route.title;
    route.render(params);
  } else {
    renderNotFound();
  }
}

window.addEventListener("hashchange", handleRoute);
handleRoute(); // Handle initial route
```

Open an extension page at a specific route from the service worker:

```ts
// background.ts
async function openExtensionPage(path: string, params?: Record<string, string>): Promise<void> {
  const searchParams = new URLSearchParams(params);
  const hash = searchParams.toString() ? `${path}?${searchParams}` : path;
  const url = chrome.runtime.getURL(`options.html#${hash}`);

  // Singleton pattern from tab-management.md
  const [existing] = await chrome.tabs.query({ url: chrome.runtime.getURL("options.html") + "*" });
  if (existing?.id) {
    // Update the hash to navigate within the existing page
    await chrome.tabs.update(existing.id, { url, active: true });
    return;
  }

  await chrome.tabs.create({ url });
}

// Usage: open directly to a detail view
openExtensionPage("/detail", { id: "abc123" });
```

---

## Pattern 6: Redirect Handling with declarativeNetRequest {#pattern-6-redirect-handling-with-declarativenetrequest}

Use declarative rules for fast, efficient URL redirects without a blocking listener:

```ts
// background.ts

// Dynamic redirect rules — add/remove at runtime
async function addRedirectRule(
  id: number,
  fromPattern: string,
  toUrl: string,
): Promise<void> {
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: { url: toUrl },
        },
        condition: {
          urlFilter: fromPattern,
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          ],
        },
      },
    ],
    removeRuleIds: [id], // Remove existing rule with same ID first
  });
}

// Regex-based redirect — e.g., force old.example.com to new.example.com
async function addRegexRedirect(): Promise<void> {
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 100,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: {
            regexSubstitution: "https://new.example.com\\1",
          },
        },
        condition: {
          regexFilter: "^https://old\\.example\\.com(/.*)$",
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          ],
        },
      },
    ],
    removeRuleIds: [100],
  });
}

// Strip query parameters via redirect
async function stripTrackingParams(): Promise<void> {
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 200,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: {
            transform: {
              queryTransform: {
                removeParams: ["utm_source", "utm_medium", "utm_campaign", "fbclid"],
              },
            },
          },
        },
        condition: {
          urlFilter: "*",
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          ],
        },
      },
    ],
    removeRuleIds: [200],
  });
}

// List active dynamic rules
async function listActiveRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
  return chrome.declarativeNetRequest.getDynamicRules();
}
```

For static rules shipped with the extension, define them in a JSON file:

```json
// rules.json (referenced from manifest.json declarative_net_request.rule_resources)
[
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": {
        "transform": { "scheme": "https" }
      }
    },
    "condition": {
      "urlFilter": "http://*",
      "resourceTypes": ["main_frame"],
      "excludedInitiatorDomains": ["localhost"]
    }
  }
]
```

---

## Pattern 7: URL Parameter Extraction and Manipulation {#pattern-7-url-parameter-extraction-and-manipulation}

Build a utility layer for reading and rewriting URL parameters safely:

```ts
// shared/url-params.ts

/** Type-safe URL parameter extraction */
interface ParamSchema {
  [key: string]: "string" | "number" | "boolean" | "string[]";
}

type ExtractedParams<S extends ParamSchema> = {
  [K in keyof S]: S[K] extends "string"
    ? string | null
    : S[K] extends "number"
    ? number | null
    : S[K] extends "boolean"
    ? boolean
    : S[K] extends "string[]"
    ? string[]
    : never;
};

function extractParams<S extends ParamSchema>(
  url: string,
  schema: S,
): ExtractedParams<S> {
  const searchParams = new URL(url).searchParams;
  const result: Record<string, unknown> = {};

  for (const [key, type] of Object.entries(schema)) {
    switch (type) {
      case "string":
        result[key] = searchParams.get(key);
        break;
      case "number": {
        const val = searchParams.get(key);
        result[key] = val !== null ? Number(val) : null;
        break;
      }
      case "boolean":
        result[key] = searchParams.has(key) && searchParams.get(key) !== "false";
        break;
      case "string[]":
        result[key] = searchParams.getAll(key);
        break;
    }
  }

  return result as ExtractedParams<S>;
}

// Usage
const params = extractParams("https://example.com/search?q=test&page=2&debug", {
  q: "string",
  page: "number",
  debug: "boolean",
  tags: "string[]",
});
// params.q    => "test"
// params.page => 2
// params.debug => true
// params.tags => []
```

Rewrite URLs by modifying parameters without losing existing ones:

```ts
function rewriteParams(
  url: string,
  modifications: Record<string, string | number | boolean | null>,
): string {
  const parsed = new URL(url);

  for (const [key, value] of Object.entries(modifications)) {
    if (value === null) {
      parsed.searchParams.delete(key);
    } else {
      parsed.searchParams.set(key, String(value));
    }
  }

  return parsed.toString();
}

// Usage
rewriteParams("https://example.com/search?q=test&page=1", {
  page: 2,
  sort: "date",
  q: null, // Remove q
});
// => "https://example.com/search?page=2&sort=date"
```

Extract structured data from known URL formats:

```ts
interface GitHubPRUrl {
  owner: string;
  repo: string;
  prNumber: number;
}

function parseGitHubPR(url: string): GitHubPRUrl | null {
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
  );
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10),
  };
}
```

---

## Pattern 8: Back/Forward Navigation Tracking {#pattern-8-backforward-navigation-tracking}

Track navigation history within a tab to understand user journeys:

```ts
// background.ts
interface TabNavHistory {
  entries: Array<{ url: string; timestamp: number; transitionType: string }>;
  currentIndex: number;
}

const navHistories = new Map<number, TabNavHistory>();

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return; // Top-level only

  let history = navHistories.get(details.tabId);
  if (!history) {
    history = { entries: [], currentIndex: -1 };
    navHistories.set(details.tabId, history);
  }

  const isBackForward = details.transitionType === "auto_subframe" ||
    details.transitionQualifiers?.includes("forward_back");

  if (isBackForward) {
    // Find the matching entry and update the index
    const matchIndex = history.entries.findIndex((e) => e.url === details.url);
    if (matchIndex !== -1) {
      history.currentIndex = matchIndex;
    }
  } else {
    // New navigation — truncate forward history
    history.entries = history.entries.slice(0, history.currentIndex + 1);
    history.entries.push({
      url: details.url,
      timestamp: Date.now(),
      transitionType: details.transitionType,
    });
    history.currentIndex = history.entries.length - 1;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  navHistories.delete(tabId);
});

// Query navigation history for a tab
function getTabNavHistory(tabId: number): TabNavHistory | undefined {
  return navHistories.get(tabId);
}

// Check if user can go back/forward
function canGoBack(tabId: number): boolean {
  const history = navHistories.get(tabId);
  return history ? history.currentIndex > 0 : false;
}

function canGoForward(tabId: number): boolean {
  const history = navHistories.get(tabId);
  return history ? history.currentIndex < history.entries.length - 1 : false;
}
```

Combine with `webNavigation.onHistoryStateUpdated` to also capture SPA navigations in the background:

```ts
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;

  const history = navHistories.get(details.tabId);
  if (!history) return;

  // SPA navigation — always a new forward entry
  history.entries = history.entries.slice(0, history.currentIndex + 1);
  history.entries.push({
    url: details.url,
    timestamp: Date.now(),
    transitionType: "spa_push_state",
  });
  history.currentIndex = history.entries.length - 1;
});
```

Use this data to build a breadcrumb trail or detect navigation loops:

```ts
function detectNavigationLoop(tabId: number, threshold = 3): boolean {
  const history = navHistories.get(tabId);
  if (!history || history.entries.length < threshold * 2) return false;

  const recent = history.entries.slice(-threshold * 2);
  const urls = recent.map((e) => e.url);
  const uniqueUrls = new Set(urls);

  // If we see fewer unique URLs than half the entries, it's a loop
  return uniqueUrls.size <= threshold / 2;
}
```

---

## Summary {#summary}

| Pattern | Use Case |
|---------|----------|
| URL pattern matching | Match complex URL structures beyond manifest globs |
| webNavigation events | Track full navigation lifecycle including iframes |
| SPA detection | Observe pushState/replaceState in content scripts |
| URL canonicalization | Normalize URLs for accurate deduplication |
| Deep linking | Route directly to views within extension pages |
| Redirect handling | Rewrite URLs efficiently with declarativeNetRequest |
| Parameter extraction | Type-safe reading and manipulation of query strings |
| Back/forward tracking | Build navigation history and detect loops |

Navigation handling pairs well with the [tab management patterns](tab-management.md) for a complete tab-aware extension. Use `@theluckystrike/webext-patterns` for production-ready URL utilities and navigation observers.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
