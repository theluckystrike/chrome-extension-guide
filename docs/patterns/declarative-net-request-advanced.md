# DeclarativeNetRequest Advanced Patterns

## Overview

The DeclarativeNetRequest API is Chrome's recommended way to block or modify network requests in Chrome Extensions (Manifest V3). Unlike the deprecated `webRequestBlocking` API, DeclarativeNetRequest operates declaratively — you define rules upfront, and the browser executes them efficiently without keeping your service worker awake.

This guide covers advanced patterns for building sophisticated network request modification features, including dynamic rules, header manipulation, regex patterns, and production-ready implementations. All examples use TypeScript and assume Manifest V3.

Key facts:
- **Static Rules**: Defined in manifest.json, max 5,000 rules per extension
- **Dynamic Rules**: Added at runtime, persist across sessions, max 30,000
- **Session Rules**: Temporary rules cleared on browser restart, max 5,000
- **Regex Rules**: Limited to 5,000 regex patterns total
- **Header Operations**: Add, remove, or modify request/response headers

---

## Pattern 1: Dynamic User-Configurable Rules

Dynamic rules allow users to configure blocking behavior at runtime. Unlike static rules (which require extension updates to modify), dynamic rules can be added, updated, and removed programmatically.

### Understanding Dynamic Rules

Dynamic rules persist across browser sessions and are stored by Chrome. Users can view and manage them on the extension details page under "Dynamic rules."

```ts
// background/dynamic-rules.ts

interface BlockingRule {
  id: number;
  pattern: string;
  enabled: boolean;
  createdAt: number;
}

const STORAGE_KEY = "blocking_rules";

/**
 * Add a dynamic rule to block requests matching a URL pattern
 */
async function addBlockingRule(pattern: string): Promise<number> {
  // Get existing rules to determine the next available ID
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const maxId = existingRules.reduce((max, rule) => Math.max(max, rule.id), 0);

  const newRule: chrome.declarativeNetRequest.Rule = {
    id: maxId + 1,
    priority: 1,
    condition: {
      urlFilter: pattern,
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.BLOCK,
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [newRule],
  });

  // Persist rule metadata for management UI
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const rules: BlockingRule[] = stored[STORAGE_KEY] || [];
  rules.push({ id: newRule.id, pattern, enabled: true, createdAt: Date.now() });
  await chrome.storage.local.set({ [STORAGE_KEY]: rules });

  return newRule.id;
}

/**
 * Remove a dynamic rule by ID
 */
async function removeBlockingRule(ruleId: number): Promise<void> {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId],
  });

  // Clean up stored metadata
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const rules: BlockingRule[] = stored[STORAGE_KEY] || [];
  const filtered = rules.filter((r) => r.id !== ruleId);
  await chrome.storage.local.set({ [STORAGE_KEY]: rules });
}

/**
 * Toggle a rule on/off without removing it
 */
async function toggleRule(ruleId: number, enabled: boolean): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const rules: BlockingRule[] = stored[STORAGE_KEY] || [];
  const rule = rules.find((r) => r.id === ruleId);

  if (!rule) return;

  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const currentRule = existingRules.find((r) => r.id === ruleId);

  if (!currentRule) return;

  // Update the rule with new priority to enable/disable
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId],
    addRules: [
      {
        ...currentRule,
        priority: enabled ? 1 : 0, // Lower priority effectively disables
      },
    ],
  });

  rule.enabled = enabled;
  await chrome.storage.local.set({ [STORAGE_KEY]: rules });
}
```

### User Interface for Rule Management

```tsx
// popup/RuleManager.tsx

interface BlockingRule {
  id: number;
  pattern: string;
  enabled: boolean;
}

export function RuleManager(): HTMLElement {
  const container = document.createElement("div");
  container.className = "rule-manager";

  async function loadRules() {
    const stored = await chrome.storage.local.get("blocking_rules");
    const rules: BlockingRule[] = stored.blocking_rules || [];
    renderRules(rules);
  }

  function renderRules(rules: BlockingRule[]) {
    container.innerHTML = `
      <h3>Blocked Patterns</h3>
      <ul class="rule-list">
        ${rules
          .map(
            (rule) => `
          <li class="rule-item ${rule.enabled ? "enabled" : "disabled"}">
            <span class="pattern">${escapeHtml(rule.pattern)}</span>
            <button class="toggle-btn" data-id="${rule.id}">
              ${rule.enabled ? "Disable" : "Enable"}
            </button>
            <button class="delete-btn" data-id="${rule.id}">×</button>
          </li>
        `
          )
          .join("")}
      </ul>
      <div class="add-rule">
        <input type="text" placeholder="Enter URL pattern (e.g., *://ads.example.com/*)" />
        <button class="add-btn">Add</button>
      </div>
    `;

    // Attach event listeners
    container.querySelectorAll(".toggle-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = parseInt((e.target as HTMLElement).dataset.id || "0");
        const rule = rules.find((r) => r.id === id);
        if (rule) {
          await chrome.runtime.sendMessage({
            type: "TOGGLE_RULE",
            ruleId: id,
            enabled: !rule.enabled,
          });
          loadRules();
        }
      });
    });

    container.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = parseInt((e.target as HTMLElement).dataset.id || "0");
        await chrome.runtime.sendMessage({ type: "REMOVE_RULE", ruleId: id });
        loadRules();
      });
    });
  }

  loadRules();
  return container;
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
```

---

## Pattern 2: Session Rules for Temporary Blocking

Session rules are perfect for temporary blocking scenarios like:
- Feature tours that block certain pages temporarily
- Development mode filtering
- Testing different rule sets without persistence

```ts
// background/session-rules.ts

/**
 * Add session rules that clear on browser restart
 */
async function addSessionRule(pattern: string): Promise<number> {
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  const maxId = rules.reduce((max, rule) => Math.max(max, rule.id), 0);

  const rule: chrome.declarativeNetRequest.Rule = {
    id: maxId + 1,
    priority: 1,
    condition: {
      urlFilter: pattern,
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
      ],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.BLOCK,
    },
  };

  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [rule],
  });

  return rule.id;
}

/**
 * Clear all session rules (useful for cleanup)
 */
async function clearAllSessionRules(): Promise<void> {
  const rules = await chrome.declarativeNetRequest.getSessionRules();
  const ruleIds = rules.map((r) => r.id);

  if (ruleIds.length > 0) {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: ruleIds,
    });
  }
}

/**
 * Temporarily block all requests to a domain for debugging
 */
async function enableDebugMode(hostname: string): Promise<void> {
  await clearAllSessionRules();

  // Block main frames on the domain
  await addSessionRule(`*://${hostname}/*`);

  // Also block subresources from the domain
  await addSessionRule(`^https?://[^/]*${escapeRegex(hostname)}`);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

---

## Pattern 3: Rule Priorities and allowAllRequests

Rule priority determines which rule wins when multiple rules match the same request. The `allowAllRequests` action is particularly powerful for whitelisting.

```ts
// background/priority-rules.ts

/**
 * Priority system for DeclarativeNetRequest rules
 *
 * Rules are evaluated in this order:
 * 1. Rules with higher priority numbers are evaluated first
 * 2. If priorities are equal, rules are evaluated in order of their IDs
 * 3. First matching rule wins
 *
 * Priority ranges:
 * - Static rules: 1-∞ (defined in manifest)
 * - Dynamic rules: 1-∞ (can overlap with static)
 * - Session rules: highest priority by default
 */

/**
 * Create a whitelist rule with high priority to override blocking rules
 */
async function addWhitelistRule(pattern: string): Promise<void> {
  const rule: chrome.declarativeNetRequest.Rule = {
    id: 1, // Always use ID 1 for whitelist to ensure consistency
    priority: 1000, // High priority to override blocking rules
    condition: {
      urlFilter: pattern,
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.ALLOW_ALL_REQUESTS,
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1], // Remove existing whitelist rule
    addRules: [rule],
  });
}

/**
 * Example: Blocking everything except specific domains
 */
async function setupSelectiveBlocking(): Promise<void> {
  // Allow requests to these domains
  const allowedDomains = ["trusted-site.com", "api.example.com"];

  // Block everything else
  const blockRule: chrome.declarativeNetRequest.Rule = {
    id: 999,
    priority: 1,
    condition: {
      urlFilter: ".*", // Match all URLs
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        chrome.declarativeNetRequest.ResourceType.IMAGE,
        chrome.declarativeNetRequest.ResourceType.SCRIPT,
        chrome.declarativeNetRequest.ResourceType.STYLESHEET,
      ],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.BLOCK,
    },
  };

  // Allow rules for trusted domains (higher priority)
  const allowRules = allowedDomains.map((domain, index) => ({
    id: index + 1,
    priority: 100,
    condition: {
      urlFilter: `*://${domain}/*`,
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.ALLOW,
    },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [blockRule, ...allowRules],
  });
}
```

---

## Pattern 4: Regular Expression Filters

Regex filters provide powerful pattern matching but come with performance considerations and Chrome's RE2 syntax limitations.

### RE2 Syntax Limitations

Chrome uses RE2 for regex matching, which doesn't support:
- Lookahead/Lookbehind assertions: `(?=...)`, `(?!...)`, `(?<=...)`, `(?<!...)`
- Backreferences: `\1`, `\2`, etc.
- Named capture groups: `(?<name>...)`

```ts
// background/regex-rules.ts

/**
 * Validate that a regex is compatible with RE2
 */
function isValidRe2Regex(pattern: string): boolean {
  try {
    // Test the regex by creating a rule
    // Chrome will throw if invalid
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Rules using regex filters for complex matching
 */
async function setupRegexRules(): Promise<void> {
  const rules: chrome.declarativeNetRequest.Rule[] = [
    // Block tracking parameters in URLs
    {
      id: 1,
      priority: 1,
      condition: {
        regexFilter: "[?&]utm_[^&]+=",
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
        ],
      },
      action: {
        type: chrome.declarativeNetRequest.ActionType.BLOCK,
      },
    },
    // Block specific API endpoints
    {
      id: 2,
      priority: 1,
      condition: {
        regexFilter: "^https?://api\\.example\\.com/v[0-9]+/internal/",
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
      },
      action: {
        type: chrome.declarativeNetRequest.ActionType.BLOCK,
      },
    },
    // Redirect matched requests
    {
      id: 3,
      priority: 1,
      condition: {
        regexFilter: "^https?://old-domain\\.com/image/([^/]+)$",
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.IMAGE],
      },
      action: {
        type: chrome.declarativeNetRequest.ActionType.REDIRECT,
        redirect: {
          regexSubstitution: "https://new-domain.com/images/\\1",
        },
      },
    },
  ];

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
  });
}

/**
 * Check how many regex rules are currently active
 */
async function getRegexRuleCount(): Promise<number> {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  return rules.filter((r) => r.condition.regexFilter !== undefined).length;
}
```

---

## Pattern 5: Header Modification

Header modification is a powerful feature for both request and response headers. This enables scenarios like:
- Adding authentication headers to requests
- Removing sensitive headers from responses
- Modifying CORS headers for API access

```ts
// background/header-rules.ts

interface HeaderRule {
  id: number;
  operation: "set" | "add" | "remove";
  header: string;
  value?: string;
  requestHeaders?: boolean;
}

/**
 * Set (replace) a header on requests
 */
async function setRequestHeader(
  header: string,
  value: string
): Promise<number> {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const maxId = rules.reduce((max, rule) => Math.max(max, rule.id), 0);

  const rule: chrome.declarativeNetRequest.Rule = {
    id: maxId + 1,
    priority: 1,
    condition: {
      urlFilter: ".*",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          operation: "set",
          header: header,
          value: value,
        },
      ],
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
  });

  return rule.id;
}

/**
 * Add an authentication header to API requests
 */
async function addAuthHeader(token: string): Promise<void> {
  const rule: chrome.declarativeNetRequest.Rule = {
    id: 1,
    priority: 1,
    condition: {
      urlFilter: "^https?://api\\..+",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          operation: "set",
          header: "Authorization",
          value: `Bearer ${token}`,
        },
      ],
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
  });
}

/**
 * Remove sensitive headers from responses
 */
async function stripPrivacyHeaders(): Promise<void> {
  const rule: chrome.declarativeNetRequest.Rule = {
    id: 1,
    priority: 1,
    condition: {
      urlFilter: ".*",
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          operation: "remove",
          header: "X-Powered-By",
        },
        {
          operation: "remove",
          header: "Server",
        },
        {
          operation: "remove",
          header: "X-AspNet-Version",
        },
      ],
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
  });
}

/**
 * CORS header injection for API access
 */
async function setupCorsHeaders(): Promise<void> {
  const rule: chrome.declarativeNetRequest.Rule = {
    id: 1,
    priority: 1,
    condition: {
      urlFilter: "^https?://my-extension-api\\.example\\.com/",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          operation: "set",
          header: "Access-Control-Allow-Origin",
          value: "*",
        },
        {
          operation: "set",
          header: "Access-Control-Allow-Methods",
          value: "GET, POST, PUT, DELETE, OPTIONS",
        },
      ],
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
  });
}
```

---

## Pattern 6: URL Redirects and Transforms

Redirect rules can transform URLs on the fly, useful for:
- URL shortening expansion
- Legacy URL migration
- Protocol upgrades (http → https)

```ts
// background/redirect-rules.ts

/**
 * Simple URL redirect rule
 */
async function setupRedirectRule(): Promise<void> {
  const rule: chrome.declarativeNetRequest.Rule = {
    id: 1,
    priority: 1,
    condition: {
      urlFilter: "^https?://old-domain\\.com/",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.REDIRECT,
      redirect: {
        urlTransform: {
          host: "new-domain.com",
          scheme: "https",
        },
      },
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
  });
}

/**
 * Regex-based redirect with substitution
 */
async function setupRegexRedirect(): Promise<void> {
  const rule: chrome.declarativeNetRequest.Rule = {
    id: 1,
    priority: 1,
    condition: {
      regexFilter: "^https?://example\\.com/products/([0-9]+)$",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.REDIRECT,
      redirect: {
        regexSubstitution: "https://shop.example.com/item/\\1",
      },
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
  });
}

/**
 * Complex redirect with query parameter preservation
 */
async function setupSmartRedirect(): Promise<void> {
  // This regex captures the path and preserves query strings
  const rule: chrome.declarativeNetRequest.Rule = {
    id: 1,
    priority: 1,
    condition: {
      regexFilter: "^https?://legacy\\.app\\.io/(.+)$",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.REDIRECT,
      redirect: {
        // Use \\0 to preserve the full URL, \\1 for first capture group
        regexSubstitution: "https://new.app.io/\\1",
      },
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
  });
}
```

---

## Pattern 7: Complex Rule Conditions

Conditions support multiple criteria for precise targeting.

```ts
// background/complex-conditions.ts

/**
 * Multi-condition rule targeting specific domains and request methods
 */
async function setupComplexConditionRule(): Promise<void> {
  const rule: chrome.declarativeNetRequest.Rule = {
    id: 1,
    priority: 1,
    condition: {
      // Match specific domains
      domains: ["tracker.example.com", "ads.example.com"],
      // Only for specific request methods
      requestMethods: ["get", "post"],
      // Only for specific resource types
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        chrome.declarativeNetRequest.ResourceType.SCRIPT,
        chrome.declarativeNetRequest.ResourceType.IMAGE,
      ],
      // Exclude specific tabs (e.g., extension's own options page)
      tabIds: [], // Empty means all tabs except excluded
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.BLOCK,
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
  });
}

/**
 * Target specific extension tabs
 */
async function blockInExtensionTab(tabId: number): Promise<void> {
  const rule: chrome.declarativeNetRequest.Rule = {
    id: 1,
    priority: 1,
    condition: {
      urlFilter: ".*",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
      // Only apply to specific tab
      tabIds: [tabId],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.BLOCK,
    },
  };

  await chrome.declarativeNetRequest.updateSessionRules({
    addRules: [rule],
  });
}

/**
 * Condition based on resource type
 */
async function blockAllImagesExceptTrusted(): Promise<void> {
  // Block all images by default
  const blockRule: chrome.declarativeNetRequest.Rule = {
    id: 1,
    priority: 1,
    condition: {
      urlFilter: ".*",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.IMAGE],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.BLOCK,
    },
  };

  // Allow images from trusted domain
  const allowRule: chrome.declarativeNetRequest.Rule = {
    id: 2,
    priority: 2, // Higher priority
    condition: {
      urlFilter: "*://trusted-cdn.com/*",
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.IMAGE],
    },
    action: {
      type: chrome.declarativeNetRequest.ActionType.ALLOW,
    },
  };

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [blockRule, allowRule],
  });
}
```

---

## Pattern 8: Testing and Debugging

### Using testMatchOutcome

```ts
// background/testing.ts

/**
 * Test if a URL would match any rules without actually applying them
 */
async function testUrlMatch(
  url: string,
  resourceType: chrome.declarativeNetRequest.ResourceType
): Promise<chrome.declarativeNetRequest.TestMatchOutcomeResult[]> {
  return await chrome.declarativeNetRequest.testMatchOutcome(
    url,
    { resourceType }
  );
}

/**
 * Debug: Log which rules match a request
 */
async function debugRequest(url: string): Promise<void> {
  const result = await testUrlMatch(
    url,
    chrome.declarativeNetRequest.ResourceType.MAIN_FRAME
  );

  console.log("Matching rules for:", url);
  result.forEach((match, index) => {
    console.log(`Rule ${index + 1}:`, {
      id: match.rule?.id,
      action: match.rule?.action.type,
      condition: match.rule?.condition.urlFilter,
    });
  });
}
```

### Debugging in chrome://extensions

1. Navigate to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Find your extension and click "Service worker" to open DevTools
4. Go to the **Declarative Net Request** tab in DevTools
5. View:
   - Number of rules active
   - Rules matched count
   - Any errors

---

## Pattern 9: Migration from webRequestBlocking

If migrating from Manifest V2's `webRequestBlocking`, here's the approach:

```ts
// background/migration.ts

/**
 * BEFORE (Manifest V2 with webRequestBlocking):
 *
 * chrome.webRequest.onBeforeRequest.addListener(
 *   (details) => {
 *     if (shouldBlock(details.url)) {
 *       return { cancel: true };
 *     }
 *   },
 *   { urls: ["<all_urls>"] },
 *   ["blocking"]
 * );
 *
 * AFTER (Manifest V3 with DeclarativeNetRequest):
 */

// Convert URL patterns to declarative rules
async function migrateFromWebRequest(
  blockingPatterns: string[]
): Promise<void> {
  const rules: chrome.declarativeNetRequest.Rule[] = blockingPatterns.map(
    (pattern, index) => ({
      id: index + 1,
      priority: 1,
      condition: {
        urlFilter: patternToRegex(pattern),
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
          chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
          chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        ],
      },
      action: {
        type: chrome.declarativeNetRequest.ActionType.BLOCK,
      },
    })
  );

  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
  });
}

/**
 * Convert URL pattern to regex filter
 */
function patternToRegex(pattern: string): string {
  // Convert * wildcard to .* regex
  // Convert . to \. in the domain
  let regex = pattern
    .replace(/\*/g, ".*")
    .replace(/\./g, "\\.")
    .replace(/\?/g, "\\?");

  // If it starts with *, it's a catch-all
  if (!regex.startsWith("^")) {
    regex = "^https?://" + regex;
  }

  return regex;
}
```

---

## Rule Limits Summary

| Rule Type | Limit | Persistence |
|-----------|-------|-------------|
| Static Rules | 5,000 | In manifest.json |
| Dynamic Rules | 30,000 | Until removed |
| Session Rules | 5,000 | Browser restart |
| Regex Rules | 5,000 | Combined total |

### Best Practices

1. **Use static rules** for fixed, unchanging rules (declarative in manifest)
2. **Use dynamic rules** for user-configurable features
3. **Use session rules** for temporary/debugging scenarios
4. **Prefer simple URL filters** over regex when possible for performance
5. **Test with testMatchOutcome** before deploying new rules
6. **Monitor chrome://extensions** for rule match counts and errors

---

## Cross-References

- [Declarative Net Request API Reference](/api_reference/declarative-net-request-api.md)
- [Declarative Net Request Overview](/mv3/declarative-net-request.md)
- [Network Interception Patterns](/patterns/network-interception.md)
