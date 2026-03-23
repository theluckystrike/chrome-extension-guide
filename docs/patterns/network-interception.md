---
layout: default
title: "Chrome Extension Network Interception — Best Practices"
description: "Intercept and modify network requests with the Declarative Net Request API."
canonical_url: "https://bestchromeextensions.com/patterns/network-interception/"
---

# Network Request Interception Patterns

## Overview {#overview}

Chrome's `declarativeNetRequest` (DNR) API replaced the blocking `webRequest` API in MV3. Instead of intercepting requests in JavaScript, you declare JSON rules that Chrome's network stack evaluates natively — delivering better performance and privacy. This guide covers practical patterns for building, managing, and debugging DNR rules.

---

## How DNR Works {#how-dnr-works}

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Browser Tab │────>│  Network Stack   │────>│   Server     │
│  (request)   │     │                  │     │              │
└──────────────┘     │  ┌────────────┐  │     └──────────────┘
                     │  │ DNR Engine │  │
                     │  │            │  │
                     │  │ - block    │  │
                     │  │ - redirect │  │
                     │  │ - modify   │  │
                     │  │   headers  │  │
                     │  └────────────┘  │
                     └──────────────────┘
```

Key concepts:
- **Static rules**: Declared in JSON files, bundled with the extension, limited by `GUARANTEED_MINIMUM_STATIC_RULES`
- **Dynamic rules**: Added/removed at runtime via API, persist across sessions (up to 30,000)
- **Session rules**: Added/removed at runtime, cleared when the browser restarts (up to 5,000)
- **Rule priority**: Higher number = higher priority; ties broken by action type

---

## Pattern 1: Rule Structure and Priorities {#pattern-1-rule-structure-and-priorities}

Every DNR rule has the same shape — an `id`, a `priority`, an `action`, and a `condition`. Understanding this structure is essential:

```ts
// rules.ts — Type-safe rule builder

interface DNRRule {
  id: number;
  priority: number;
  action: chrome.declarativeNetRequest.RuleAction;
  condition: chrome.declarativeNetRequest.RuleCondition;
}

// Priority determines which rule wins when multiple rules match
// Action type breaks ties: allow > allowAllRequests > block > upgradeScheme > redirect > modifyHeaders
const PRIORITY = {
  ALLOWLIST: 100, // highest — let trusted domains through
  BLOCK: 50,      // mid — block known bad patterns
  MODIFY: 10,     // low — header tweaks, cosmetic changes
} as const;

const blockTracker: DNRRule = {
  id: 1,
  priority: PRIORITY.BLOCK,
  action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
  condition: {
    urlFilter: "||tracker.example.com",
    resourceTypes: [
      chrome.declarativeNetRequest.ResourceType.SCRIPT,
      chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
    ],
  },
};

const allowTrusted: DNRRule = {
  id: 2,
  priority: PRIORITY.ALLOWLIST,
  action: { type: chrome.declarativeNetRequest.RuleActionType.ALLOW },
  condition: {
    urlFilter: "||trusted-cdn.example.com",
    resourceTypes: [chrome.declarativeNetRequest.ResourceType.SCRIPT],
  },
};
```

Static rules live in a JSON file referenced by `manifest.json`:

```json
{
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "baseline_rules",
        "enabled": true,
        "path": "rules/baseline.json"
      }
    ]
  }
}
```

---

## Pattern 2: Dynamic Rules — Add/Remove at Runtime {#pattern-2-dynamic-rules-addremove-at-runtime}

Dynamic rules let users customize blocking behavior without shipping a new extension version:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  blockedDomains: { type: "list", default: [] as string[] },
  nextRuleId: { type: "number", default: 10_000 },
});

const storage = createStorage(schema);

// Add a blocking rule for a user-specified domain
async function blockDomain(domain: string): Promise<number> {
  const ruleId = await storage.get("nextRuleId");

  const rule: chrome.declarativeNetRequest.Rule = {
    id: ruleId,
    priority: 50,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      requestDomains: [domain],
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.SCRIPT,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
      ],
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
    removeRuleIds: [], // nothing to remove
  });

  // Persist the mapping
  const blocked = await storage.get("blockedDomains");
  await storage.set("blockedDomains", [...blocked, domain]);
  await storage.set("nextRuleId", ruleId + 1);

  return ruleId;
}

// Remove a rule by domain
async function unblockDomain(domain: string): Promise<void> {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleIds = rules
    .filter((r) => r.condition.requestDomains?.includes(domain))
    .map((r) => r.id);

  if (ruleIds.length === 0) return;

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ruleIds,
    addRules: [],
  });

  const blocked = await storage.get("blockedDomains");
  await storage.set(
    "blockedDomains",
    blocked.filter((d) => d !== domain)
  );
}

// Bulk replace all dynamic rules (useful for settings import)
async function replaceAllRules(
  rules: chrome.declarativeNetRequest.Rule[]
): Promise<void> {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((r) => r.id),
    addRules: rules,
  });
}
```

---

## Pattern 3: Request Blocking by URL Pattern {#pattern-3-request-blocking-by-url-pattern}

DNR supports two URL matching syntaxes — `urlFilter` (lightweight pattern) and `regexFilter` (full regex). Prefer `urlFilter` when possible since it's faster:

```ts
// rules/blocking.ts

// urlFilter syntax:
//   ||  = match any scheme + subdomain (anchor to domain)
//   |   = anchor to start or end
//   *   = wildcard (zero or more characters)
//   ^   = separator (anything except alphanumeric, -, ., %)

const blockingRules: chrome.declarativeNetRequest.Rule[] = [
  // Block all requests to a domain (any path)
  {
    id: 100,
    priority: 50,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: "||ads.example.com^",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.SCRIPT,
        chrome.declarativeNetRequest.ResourceType.IMAGE,
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
      ],
    },
  },

  // Block a specific path pattern
  {
    id: 101,
    priority: 50,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: "*/api/v1/track*",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
  },

  // Block with regex — use sparingly (limited to 1,000 regex rules)
  {
    id: 102,
    priority: 50,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      regexFilter: "^https?://[a-z]+\\.tracker\\.net/pixel\\?id=\\d+",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.IMAGE,
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
      ],
    },
  },

  // Upgrade HTTP to HTTPS (not a block, but prevents insecure loads)
  {
    id: 103,
    priority: 30,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.UPGRADE_SCHEME,
    },
    condition: {
      urlFilter: "http://*",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
      ],
    },
  },
];
```

---

## Pattern 4: Request Header Modification {#pattern-4-request-header-modification}

Add, remove, or overwrite request headers. Common uses include injecting auth tokens, stripping tracking headers, or setting custom headers:

```ts
// background.ts

// Add a custom header to all API requests
const addAuthHeader: chrome.declarativeNetRequest.Rule = {
  id: 200,
  priority: 10,
  action: {
    type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
    requestHeaders: [
      {
        header: "X-Extension-Id",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: chrome.runtime.id,
      },
    ],
  },
  condition: {
    urlFilter: "||api.myservice.com/*",
    resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
  },
};

// Remove tracking headers
const stripTrackingHeaders: chrome.declarativeNetRequest.Rule = {
  id: 201,
  priority: 10,
  action: {
    type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
    requestHeaders: [
      {
        header: "X-Requested-With",
        operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
      },
      {
        header: "X-Client-Data",
        operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
      },
    ],
  },
  condition: {
    urlFilter: "*",
    resourceTypes: [
      chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
      chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
    ],
  },
};

// Dynamically set an auth token that changes at runtime
async function setApiToken(token: string): Promise<void> {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [300],
    addRules: [
      {
        id: 300,
        priority: 20,
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
          urlFilter: "||api.myservice.com/*",
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          ],
        },
      },
    ],
  });
}
```

Note: Use **session rules** for sensitive values like auth tokens — they are cleared when the browser closes, unlike dynamic rules which persist.

---

## Pattern 5: Response Header Modification (CSP, CORS) {#pattern-5-response-header-modification-csp-cors}

Modify response headers to relax Content Security Policy for your extension's content scripts or enable cross-origin requests:

```ts
// background.ts

// Relax CSP on specific pages to allow extension content scripts to inject UI
const relaxCSP: chrome.declarativeNetRequest.Rule = {
  id: 400,
  priority: 10,
  action: {
    type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
    responseHeaders: [
      {
        header: "Content-Security-Policy",
        operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
      },
    ],
  },
  condition: {
    urlFilter: "||app.example.com/*",
    resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
  },
};

// Add permissive CORS headers to a third-party API
// (so your extension popup/content script can fetch from it)
const addCORSHeaders: chrome.declarativeNetRequest.Rule = {
  id: 401,
  priority: 10,
  action: {
    type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
    responseHeaders: [
      {
        header: "Access-Control-Allow-Origin",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "*",
      },
      {
        header: "Access-Control-Allow-Methods",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "GET, POST, OPTIONS",
      },
      {
        header: "Access-Control-Allow-Headers",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "Content-Type, Authorization",
      },
    ],
  },
  condition: {
    urlFilter: "||external-api.example.com/*",
    resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
  },
};

// Add security headers to your own app pages
const addSecurityHeaders: chrome.declarativeNetRequest.Rule = {
  id: 402,
  priority: 10,
  action: {
    type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
    responseHeaders: [
      {
        header: "X-Frame-Options",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "DENY",
      },
      {
        header: "X-Content-Type-Options",
        operation: chrome.declarativeNetRequest.HeaderOperation.SET,
        value: "nosniff",
      },
    ],
  },
  condition: {
    urlFilter: "||myapp.example.com/*",
    resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
  },
};
```

> **Permission required**: Add `"declarativeNetRequestWithHostAccess"` to your manifest's `permissions` array to modify headers. Pair it with appropriate `host_permissions`.

---

## Pattern 6: Redirect Rules (URL Rewriting) {#pattern-6-redirect-rules-url-rewriting}

Redirect requests to different URLs — useful for replacing CDN resources, routing through proxies, or migrating API endpoints:

```ts
// rules/redirects.ts

const redirectRules: chrome.declarativeNetRequest.Rule[] = [
  // Redirect one URL to another
  {
    id: 500,
    priority: 30,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        url: "https://new-cdn.example.com/lib/v2/main.js",
      },
    },
    condition: {
      urlFilter: "||old-cdn.example.com/lib/v1/main.js",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SCRIPT],
    },
  },

  // Regex-based redirect with capture groups
  {
    id: 501,
    priority: 30,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        regexSubstitution: "https://api-v2.example.com/\\1",
      },
    },
    condition: {
      regexFilter: "^https://api-v1\\.example\\.com/(.*)",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
      ],
    },
  },

  // Redirect to an extension-bundled resource
  {
    id: 502,
    priority: 30,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        extensionPath: "/assets/replacement-script.js",
      },
    },
    condition: {
      urlFilter: "||analytics.example.com/tracker.js",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SCRIPT],
    },
  },

  // Transform URL components (scheme, host, path, query)
  {
    id: 503,
    priority: 30,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        transform: {
          scheme: "https",
          host: "proxy.myservice.com",
          queryTransform: {
            addOrReplaceParams: [
              { key: "via", value: "extension" },
            ],
            removeParams: ["utm_source", "utm_medium", "utm_campaign"],
          },
        },
      },
    },
    condition: {
      urlFilter: "||target.example.com/*",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
  },
];
```

When redirecting to an extension resource, make sure the file is listed in `web_accessible_resources`:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["assets/replacement-script.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## Pattern 7: Rule Conditions — Resource Types, Domains, Methods {#pattern-7-rule-conditions-resource-types-domains-methods}

Fine-grained conditions prevent rules from matching too broadly. This is critical for performance and to avoid breaking pages:

```ts
// rules/conditions.ts

const preciseRules: chrome.declarativeNetRequest.Rule[] = [
  // Match only on specific initiator domains (pages that make the request)
  {
    id: 600,
    priority: 50,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: "||evil-tracker.com^",
      initiatorDomains: ["mysite.com", "myothersite.com"],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SCRIPT],
    },
  },

  // Exclude specific domains from a broad rule
  {
    id: 601,
    priority: 50,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: "*/analytics/*",
      excludedInitiatorDomains: ["analytics.google.com"],
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.SCRIPT,
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
      ],
    },
  },

  // Match only specific request domains (the target server)
  {
    id: 602,
    priority: 50,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      requestDomains: ["ads.doubleclick.net", "pagead2.googlesyndication.com"],
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.SCRIPT,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
        chrome.declarativeNetRequest.ResourceType.IMAGE,
      ],
    },
  },

  // Match specific HTTP methods (Chrome 128+)
  {
    id: 603,
    priority: 50,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          header: "X-CSRF-Token",
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: "extension-injected",
        },
      ],
    },
    condition: {
      urlFilter: "||api.myservice.com/*",
      requestMethods: [
        chrome.declarativeNetRequest.RequestMethod.POST,
        chrome.declarativeNetRequest.RequestMethod.PUT,
        chrome.declarativeNetRequest.RequestMethod.DELETE,
      ],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
  },

  // Tab-specific rules using tabIds (session rules only)
  {
    id: 604,
    priority: 80,
    action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
    condition: {
      urlFilter: "||ads.example.com^",
      tabIds: [123, 456],
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.SCRIPT],
    },
  },
];

// Apply blocking only on the active tab
async function blockOnTab(tabId: number, domain: string): Promise<void> {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [700],
    addRules: [
      {
        id: 700,
        priority: 80,
        action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
        condition: {
          requestDomains: [domain],
          tabIds: [tabId],
          resourceTypes: [
            chrome.declarativeNetRequest.ResourceType.SCRIPT,
            chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
          ],
        },
      },
    ],
  });
}
```

### Resource Type Reference {#resource-type-reference}

| Resource Type | Matches |
|--------------|---------|
| `MAIN_FRAME` | Top-level page navigation |
| `SUB_FRAME` | iframe navigation |
| `SCRIPT` | `<script>` tags and dynamic imports |
| `STYLESHEET` | CSS files |
| `IMAGE` | Images, favicons |
| `XMLHTTPREQUEST` | `fetch()` and `XMLHttpRequest` |
| `FONT` | Web fonts |
| `MEDIA` | `<audio>` and `<video>` |
| `WEBSOCKET` | WebSocket connections |
| `OTHER` | Everything else |

---

## Pattern 8: Debugging Rules with getMatchedRules {#pattern-8-debugging-rules-with-getmatchedrules}

`getMatchedRules` shows which rules fired and on what requests. Essential for development and user-facing diagnostics:

```ts
// background.ts

// Get all matched rules (requires declarativeNetRequestFeedback permission)
async function getRecentMatches(): Promise<
  chrome.declarativeNetRequest.MatchedRuleInfo[]
> {
  const result = await chrome.declarativeNetRequest.getMatchedRules({});
  return result.rulesMatchedInfo;
}

// Get matched rules for a specific tab
async function getTabMatches(
  tabId: number
): Promise<chrome.declarativeNetRequest.MatchedRuleInfo[]> {
  const result = await chrome.declarativeNetRequest.getMatchedRules({
    tabId,
  });
  return result.rulesMatchedInfo;
}

// Get matches since a specific timestamp
async function getMatchesSince(
  timestamp: number
): Promise<chrome.declarativeNetRequest.MatchedRuleInfo[]> {
  const result = await chrome.declarativeNetRequest.getMatchedRules({
    minTimeStamp: timestamp,
  });
  return result.rulesMatchedInfo;
}

// Build a debugging dashboard
async function buildRuleReport(tabId: number) {
  const [dynamicRules, sessionRules, matches] = await Promise.all([
    chrome.declarativeNetRequest.getDynamicRules(),
    chrome.declarativeNetRequest.getSessionRules(),
    chrome.declarativeNetRequest.getMatchedRules({ tabId }),
  ]);

  const report = {
    dynamicRuleCount: dynamicRules.length,
    sessionRuleCount: sessionRules.length,
    matchedRequests: matches.rulesMatchedInfo.map((info) => ({
      ruleId: info.rule.ruleId,
      rulesetId: info.rule.rulesetId,
      timeStamp: info.timeStamp,
      tabId: info.tabId,
    })),
  };

  console.table(report.matchedRequests);
  return report;
}

// Listen for rule matches in real time (Chrome 119+)
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  console.log(
    `[DNR] Rule ${info.rule.ruleId} matched on tab ${info.request.tabId}`,
    {
      url: info.request.url,
      type: info.request.type,
      method: info.request.method,
      rulesetId: info.rule.rulesetId,
    }
  );
});

// Validate rules before adding them
async function validateAndAddRules(
  rules: chrome.declarativeNetRequest.Rule[]
): Promise<{ added: number; errors: string[] }> {
  const errors: string[] = [];
  const validRules: chrome.declarativeNetRequest.Rule[] = [];

  for (const rule of rules) {
    if (!rule.condition.resourceTypes?.length) {
      errors.push(`Rule ${rule.id}: missing resourceTypes`);
      continue;
    }
    if (rule.condition.urlFilter && rule.condition.regexFilter) {
      errors.push(`Rule ${rule.id}: cannot have both urlFilter and regexFilter`);
      continue;
    }
    validRules.push(rule);
  }

  if (validRules.length > 0) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: validRules,
        removeRuleIds: validRules.map((r) => r.id),
      });
    } catch (err) {
      errors.push(`Chrome rejected rules: ${(err as Error).message}`);
    }
  }

  return { added: validRules.length, errors };
}
```

Add the debug permission to your manifest for development:

```json
{
  "permissions": [
    "declarativeNetRequest",
    "declarativeNetRequestFeedback"
  ]
}
```

> **Tip**: `declarativeNetRequestFeedback` is only needed for `getMatchedRules` and `onRuleMatchedDebug`. Remove it from production builds if you don't expose rule diagnostics to users.

---

## Common Pitfalls {#common-pitfalls}

### 1. Forgetting resourceTypes {#1-forgetting-resourcetypes}

```ts
// WRONG: resourceTypes is required — omitting it means the rule matches nothing
{
  id: 1,
  priority: 1,
  action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
  condition: { urlFilter: "||ads.example.com" },
}

// CORRECT: Always specify which resource types to match
{
  id: 1,
  priority: 1,
  action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
  condition: {
    urlFilter: "||ads.example.com",
    resourceTypes: [
      chrome.declarativeNetRequest.ResourceType.SCRIPT,
      chrome.declarativeNetRequest.ResourceType.IMAGE,
    ],
  },
}
```

### 2. Rule ID Collisions {#2-rule-id-collisions}

```ts
// Dynamic and session rules share the same ID namespace.
// Using the same ID in both will cause one to silently overwrite the other.
// Use distinct ID ranges:
const DYNAMIC_ID_BASE = 10_000;
const SESSION_ID_BASE = 50_000;
```

### 3. Regex Rule Limits {#3-regex-rule-limits}

```ts
// Chrome limits regex rules to 1,000 across static + dynamic + session.
// Check your usage before adding more:
const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
const regexCount = dynamicRules.filter((r) => r.condition.regexFilter).length;
console.log(`Using ${regexCount} of 1,000 regex rule slots`);
```

---

## Summary {#summary}

| Pattern | When to Use |
|---------|------------|
| Rule structure & priorities | Every DNR implementation — understand the evaluation model |
| Dynamic rules | User-configurable blocking, runtime-generated rules |
| URL pattern blocking | Ad/tracker blocking, content filtering |
| Request header modification | Auth injection, fingerprint stripping |
| Response header modification | CSP relaxation, CORS enablement for extension fetches |
| Redirect rules | CDN replacement, API migration, URL cleanup |
| Rule conditions | Scoping rules to specific tabs, domains, or methods |
| getMatchedRules debugging | Development, diagnostics, rule verification |

The `declarativeNetRequest` API trades flexibility for performance — you define what to match and Chrome handles the rest at the network layer. For most use cases this is a clear win: faster execution, lower memory usage, and no need to keep a service worker alive just to inspect traffic.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
