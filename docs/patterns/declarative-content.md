---
layout: default
title: "Chrome Extension Declarative Content — Best Practices"
description: "Use declarative content for conditional script injection."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/declarative-content/"
---

# DeclarativeContent API Patterns

## Overview {#overview}

The DeclarativeContent API is a powerful Chrome Extension API that allows you to show or hide your extension's action button based on conditions matching the current page — without requiring the background service worker to stay awake. This declarative approach replaces the traditional imperative pattern of listening to `chrome.tabs.onUpdated` and manually checking URLs, offering significant performance benefits and cleaner code.

This guide covers practical patterns for using DeclarativeContent in modern Chrome Extensions (Manifest V3), with TypeScript examples and integration with `@theluckystrike/webext-storage` for persistent user preferences.

Key facts:
- **PageStateMatcher**: Defines conditions that trigger rule activation (URL patterns, CSS selectors, page schemes)
- **ShowAction**: Shows the extension action button when conditions match (note: there is no HideAction; the action is hidden by default and shown only when rules match)
- **Event**: `chrome.declarativeContent.onPageChanged` manages rule registration
- **Persistence**: Rules survive browser restarts and extension updates
- **Performance**: Browser evaluates rules natively — no background script wake-up for non-matching pages

---

## Pattern 1: DeclarativeContent API Basics {#pattern-1-declarativecontent-api-basics}

The DeclarativeContent API centers around three core concepts: rules, PageStateMatcher conditions, and actions that control the extension's presence. Understanding these building blocks is essential before implementing more complex patterns.

### Understanding the Core Components {#understanding-the-core-components}

A declarative content rule consists of a condition (PageStateMatcher) and one or more actions. When the condition is met, the actions execute automatically. The most common action is ShowAction, which makes your extension's toolbar icon visible.

```ts
// background.ts - Basic DeclarativeContent setup
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

/**
 * Schema for extension preferences
 */
const schema = defineSchema({
  enabled: { type: "boolean", default: true },
  matchPatterns: { type: "array", default: ["*://*/*"] },
});

const storage = createStorage(schema);

/**
 * Simple rule: Show action on all pages when enabled
 * This is the most basic DeclarativeContent pattern
 */
const baseRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { schemes: ["https", "http"] },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Register rules on extension startup
 */
async function registerRules(): Promise<void> {
  // First, ensure no existing rules conflict
  await chrome.declarativeContent.onPageChanged.removeRules();

  // Register our base rule
  await chrome.declarativeContent.onPageChanged.addRules([baseRule]);
  console.log("[DeclarativeContent] Rules registered successfully");
}

// Register on extension startup
chrome.runtime.onInstalled.addListener(async () => {
  await registerRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await registerRules();
});
```

### Required Permission {#required-permission}

Add `"declarativeContent"` to your `manifest.json` permissions:

```json
{
  "name": "My Extension",
  "version": "1.0.0",
  "permissions": [
    "declarativeContent",
    "storage"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_title": "My Extension"
  }
}
```

### How Rules Persist {#how-rules-persist}

DeclarativeContent rules have an important characteristic: they persist across browser sessions. This means:

1. **Browser Restart**: Rules remain active — no re-registration needed
2. **Extension Update**: Rules persist but should be verified on update
3. **Page Navigation**: Rules evaluate automatically without manual intervention

```ts
/**
 * Verify rules on extension update (good practice)
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "update") {
    // Rules persist, but verify they're still valid
    const existingRules = await chrome.declarativeContent.onPageChanged.getRules();
    console.log(`[DeclarativeContent] ${existingRules.length} rules active after update`);
  } else if (details.reason === "install") {
    // Fresh install — register initial rules
    await registerRules();
  }
});
```

---

## Pattern 2: Show Action on Specific Pages {#pattern-2-show-action-on-specific-pages}

Rather than showing your action everywhere, you can target specific pages using URL-based PageStateMatcher conditions. This is ideal for extensions that only work on particular websites.

### URL-Based Matching Options {#url-based-matching-options}

PageStateMatcher supports multiple URL matching strategies:

- **hostEquals**: Exact domain match
- **hostSuffix**: Match domain and subdomains
- **hostPrefix**: Match specific host prefix
- **pathPrefix**: Match URL path beginning
- **pathContains**: Match path containing substring
- **urlContains**: Match anywhere in URL
- **urlEquals**: Exact URL match
- **urlMatches**: Regex pattern matching

### Targeting Specific Domains {#targeting-specific-domains}

```ts
// background.ts - Show action only on specific domains

type UrlCondition = chrome.declarativeContent.PageStateMatcher["pageUrl"];

/**
 * Rule for GitHub repositories
 */
const githubRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {
        hostSuffix: "github.com",
        pathPrefix: "/",
      },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Rule for documentation sites
 */
const docsRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {
        hostSuffix: "example.com",
        pathPrefix: "/docs",
      },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Rule using urlContains for broader matching
 */
const searchRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {
        urlContains: "search",
      },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Register multiple rules for different targets
 */
async function registerSiteSpecificRules(): Promise<void> {
  await chrome.declarativeContent.onPageChanged.removeRules();
  await chrome.declarativeContent.onPageChanged.addRules([
    githubRule,
    docsRule,
    searchRule,
  ]);
}
```

### User-Configurable URL Patterns {#user-configurable-url-patterns}

Combine DeclarativeContent with user storage to allow customizable URL matching:

```ts
// background.ts - Dynamic URL patterns from user preferences

/**
 * Build PageStateMatcher from user patterns
 */
function buildUrlRule(patterns: string[]): chrome.declarativeContent.PageChangeRule {
  // Convert glob-like patterns to URL conditions
  const conditions = patterns.map((pattern) => {
    // Parse simple patterns like "github.com/*" or "*.google.com"
    let hostSuffix = "";
    let pathPrefix = "/";

    if (pattern.startsWith("*.")) {
      // Wildcard subdomain: *.google.com
      hostSuffix = pattern.slice(2);
    } else if (pattern.includes("/")) {
      // Has path: github.com/repos
      const [host, ...pathParts] = pattern.split("/");
      hostSuffix = host;
      pathPrefix = "/" + pathParts.join("/");
    } else {
      // Simple domain
      hostSuffix = pattern;
    }

    return new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {
        hostSuffix,
        pathPrefix: pathPrefix !== "/" ? pathPrefix : undefined,
      },
    });
  });

  return {
    conditions,
    actions: [new chrome.declarativeContent.ShowAction()],
  };
}

/**
 * Update rules when user changes their preferences
 */
async function updateRulesFromStorage(): Promise<void> {
  const patterns = await storage.get("matchPatterns");
  const rule = buildUrlRule(patterns);

  await chrome.declarativeContent.onPageChanged.removeRules();
  await chrome.declarativeContent.onPageChanged.addRules([rule]);
  console.log("[DeclarativeContent] Rules updated from storage");
}

// Listen for storage changes to update rules dynamically
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local" && changes.matchPatterns) {
    await updateRulesFromStorage();
  }
});
```

---

## Pattern 3: CSS-Based Page Matching {#pattern-3-css-based-page-matching}

One of DeclarativeContent's most powerful features is CSS selector matching. The action shows only when a page contains elements matching your specified CSS selectors — perfect for extensions that enhance specific UI components.

### Basic CSS Element Detection {#basic-css-element-detection}

```ts
// background.ts - Show action when password fields exist

/**
 * Show action on pages with password input fields
 * Useful for password manager extensions
 */
const passwordFieldRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      css: ["input[type='password']"],
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Show action when form with login class exists
 */
const loginFormRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      css: ["form.login", "form.signin", "form[id='login']"],
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Show action on pages with video elements
 */
const videoPageRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      css: ["video", "iframe[src*='youtube']", "iframe[src*='vimeo']"],
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};
```

### Combining URL and CSS Selectors {#combining-url-and-css-selectors}

For more precise targeting, combine URL conditions with CSS selectors:

```ts
// background.ts - Combine URL and CSS matching

/**
 * Show action only on GitHub when code blocks exist
 */
const githubCodeRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostSuffix: "github.com" },
      css: ["pre code", ".highlight", "div.highlight"],
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Show action on any page with a shopping cart checkout button
 */
const checkoutRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      css: [
        "button.checkout",
        "a.checkout",
        "button[name='checkout']",
        "[data-testid='checkout-button']",
      ],
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Show action on pages with embedded tweets
 */
const tweetEmbedRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      css: ["twitter-widget", ".tweet", "[data-twitter-widget]"],
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};
```

### Advanced CSS Matching with Multiple Selectors {#advanced-css-matching-with-multiple-selectors}

```ts
// background.ts - Multiple CSS conditions (AND logic)

/**
 * Complex rule: Show on pages with both a search input AND results container
 * This requires BOTH selectors to match
 */
const searchResultsRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      // Multiple CSS selectors = AND (all must match)
      css: ["input[type='search']", ".search-results", "[role='search']"],
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Page with user profile elements
 */
const profilePageRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      css: [
        "[data-profile]",
        ".user-profile",
        "img[alt*='avatar']",
        "img[alt*='profile']",
      ],
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};
```

---

## Pattern 4: Dynamic Rule Management {#pattern-4-dynamic-rule-management}

Real-world extensions often need to adjust their DeclarativeContent rules based on user preferences, feature flags, or runtime state. This pattern covers managing rules dynamically.

### Updating Rules Based on User Preferences {#updating-rules-based-on-user-preferences}

```ts
// background.ts - Dynamic rule management with storage

type ExtensionSettings = {
  enabled: boolean;
  matchUrls: string[];
  matchCss: string[];
  enableOnProtectedPages: boolean;
};

const settingsSchema = defineSchema({
  enabled: { type: "boolean", default: true },
  matchUrls: {
    type: "array",
    default: ["*://*/*"],
    items: { type: "string" },
  },
  matchCss: {
    type: "array",
    default: [],
    items: { type: "string" },
  },
  enableOnProtectedPages: { type: "boolean", default: false },
});

const settingsStorage = createStorage(settingsSchema);

/**
 * Build rule object from current settings
 */
async function buildRuleFromSettings(): Promise<chrome.declarativeContent.PageChangeRule> {
  const settings = await settingsStorage.getAll();

  // If disabled, remove all rules so the action stays hidden by default
  // (there is no HideAction in the API; the action is hidden when no ShowAction rules match)
  if (!settings.enabled) {
    await chrome.declarativeContent.onPageChanged.removeRules();
    return null;
  }

  // Build URL conditions from user patterns
  const urlConditions = settings.matchUrls.map((pattern) => {
    const condition: UrlCondition = {};

    if (pattern.includes("*")) {
      // Convert wildcard to hostSuffix (simplified)
      condition.hostSuffix = pattern.replace(/^\*\./, "");
    } else {
      condition.hostEquals = pattern;
    }

    return new chrome.declarativeContent.PageStateMatcher({
      pageUrl: condition,
    });
  });

  // Add CSS conditions if specified
  const allConditions: chrome.declarativeContent.PageStateMatcher[] = [];

  for (const urlCond of urlConditions) {
    if (settings.matchCss.length > 0) {
      // Combine URL and CSS
      allConditions.push(
        new chrome.declarativeContent.PageStateMatcher({
          pageUrl: (urlCond as any).pageUrl,
          css: settings.matchCss,
        })
      );
    } else {
      allConditions.push(urlCond);
    }
  }

  return {
    conditions: allConditions,
    actions: [new chrome.declarativeContent.ShowAction()],
  };
}

/**
 * Clear and rebuild all rules
 */
async function rebuildRules(): Promise<void> {
  try {
    const rule = await buildRuleFromSettings();
    await chrome.declarativeContent.onPageChanged.removeRules();
    await chrome.declarativeContent.onPageChanged.addRules([rule]);
    console.log("[DeclarativeContent] Rules rebuilt successfully");
  } catch (error) {
    console.error("[DeclarativeContent] Failed to rebuild rules:", error);
  }
}

/**
 * Listen for all setting changes
 */
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local") {
    // Debounce rapid changes
    clearTimeout((rebuildRules as any).debounceTimer);
    (rebuildRules as any).debounceTimer = setTimeout(() => {
      rebuildRules();
    }, 300);
  }
});
```

### Clearing Rules Completely {#clearing-rules-completely}

```ts
// background.ts - Complete rule management

/**
 * Clear all DeclarativeContent rules
 * Useful when disabling extension or during cleanup
 */
async function clearAllRules(): Promise<void> {
  await chrome.declarativeContent.onPageChanged.removeRules();
  console.log("[DeclarativeContent] All rules cleared");
}

/**
 * Get current active rules (for debugging)
 */
async function getActiveRules(): Promise<chrome.declarativeContent.Rule[]> {
  const rules = await chrome.declarativeContent.onPageChanged.getRules();
  return rules;
}

/**
 * Remove specific rules by ID
 */
async function removeRuleById(ruleId: string): Promise<void> {
  const allRules = await chrome.declarativeContent.onPageChanged.getRules();
  const rulesToRemove = allRules.filter((r) => r.id === ruleId);

  if (rulesToRemove.length > 0) {
    await chrome.declarativeContent.onPageChanged.removeRules([ruleId]);
  }
}
```

---

## Pattern 5: Action State with SetIcon and RequestContentScript {#pattern-5-action-state-with-seticon-and-requestcontentscript}

While ShowAction is the primary declarative action (there is no HideAction), DeclarativeContent can work alongside other extension APIs to create rich, stateful experiences. This pattern covers combining multiple actions and states.

### Dynamic Icon Based on Page State {#dynamic-icon-based-on-page-state}

```ts
// background.ts - Icon state management

type IconState = "default" | "active" | "warning" | "inactive";

const ICONS: Record<IconState, { path: string; size: number }> = {
  default: { path: "icons/icon-32.png", size: 32 },
  active: { path: "icons/icon-active-32.png", size: 32 },
  warning: { path: "icons/icon-warning-32.png", size: 32 },
  inactive: { path: "icons/icon-inactive-32.png", size: 32 },
};

/**
 * Set icon for a specific tab
 */
async function setIconForTab(
  tabId: number,
  state: IconState
): Promise<void> {
  const icon = ICONS[state];
  await chrome.action.setIcon({
    tabId,
    path: icon.path,
  });
}

/**
 * Badge-based state indication
 */
async function setBadgeState(
  tabId: number,
  state: IconState,
  message?: string
): Promise<void> {
  const colors: Record<IconState, string> = {
    default: "#9E9E9E",
    active: "#4CAF50",
    warning: "#FF9800",
    inactive: "#757575",
  };

  await chrome.action.setBadgeText({
    tabId,
    text: message || "",
  });

  await chrome.action.setBadgeBackgroundColor({
    tabId,
    color: colors[state],
  });
}

/**
 * Listen for tab updates to adjust icon
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!tab.url) return;

  // Determine state based on URL
  let state: IconState = "default";
  let message = "";

  if (tab.url.includes("github.com")) {
    state = "active";
    message = "GH";
  } else if (tab.url.includes("docs.")) {
    state = "warning";
    message = "?";
  }

  await setIconForTab(tabId, state);
  await setBadgeState(tabId, state, message);
});
```

### Using RequestContentScript (Advanced) {#using-requestcontentscript-advanced}

Note: In Manifest V3, `RequestContentScript` has limitations. The recommended approach is to use message passing combined with DeclarativeContent:

```ts
// background.ts - Content script injection coordination

/**
 * When action is clicked, inject content script
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  try {
    // Inject content script on demand
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    // Send message to content script
    await chrome.tabs.sendMessage(tab.id, {
      action: "initialize",
      tabUrl: tab.url,
    });
  } catch (error) {
    console.error("[Content Script] Injection failed:", error);
  }
});

/**
 * Declarative rule to show action only on pages we can enhance
 */
const enhancablePageRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostSuffix: "example.com" },
      css: [".enhanceable", "[data-enhance='true']"],
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};
```

---

## Pattern 6: Replacing tabs.onUpdated Patterns {#pattern-6-replacing-tabsonupdated-patterns}

The classic Chrome Extension pattern for action visibility was using `chrome.tabs.onUpdated` to check every page load. DeclarativeContent provides a modern, declarative alternative that is more efficient and easier to maintain.

### The Old Imperative Approach {#the-old-imperative-approach}

```ts
// background.ts - OLD PATTERN (not recommended)

/**
 * Imperative approach: Check every page update
 * Drawbacks: Wakes up background script on EVERY page
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  // Check URL manually (runs on every page)
  const shouldShow = tab.url.includes("github.com");

  if (shouldShow) {
    chrome.action.show(tabId);
  } else {
    chrome.action.hide(tabId);
  }
});

/**
 * Additional listener for tab activation
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab.url) return;

  const shouldShow = tab.url.includes("github.com");

  if (shouldShow) {
    chrome.action.show(activeInfo.tabId);
  } else {
    chrome.action.hide(activeInfo.tabId);
  }
});

/**
 * Problems with this approach:
 * 1. Background service worker wakes on EVERY page load
 * 2. Manual URL parsing required
 * 3. Must handle both onUpdated and onActivated
 * 4. Race conditions possible
 * 5. No native persistence
 */
```

### The New Declarative Approach {#the-new-declarative-approach}

```ts
// background.ts - NEW PATTERN (recommended)

/**
 * Declarative approach: Define rules, browser handles the rest
 * Benefits: No background wake-up for non-matching pages
 */
const declarativeGitHubRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostSuffix: "github.com" },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Also handle extension and chrome:// URLs (limited)
 */
const chromePagesRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { schemes: ["chrome-extension"] },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Register rules once at startup
 */
async function initializeRules(): Promise<void> {
  await chrome.declarativeContent.onPageChanged.removeRules();
  await chrome.declarativeContent.onPageChanged.addRules([
    declarativeGitHubRule,
    chromePagesRule,
  ]);
}

chrome.runtime.onInstalled.addListener(initializeRules);
chrome.runtime.onStartup.addListener(initializeRules);

/**
 * What happens now:
 * 1. Browser natively evaluates rules
 * 2. No background wake-up for non-matching pages
 * 3. Action shows/hides automatically
 * 4. Works across browser restarts
 * 5. Only one place to maintain
 */
```

### Side-by-Side Comparison {#side-by-side-comparison}

| Aspect | Imperative (onUpdated) | Declarative (DeclarativeContent) |
|--------|------------------------|---------------------------------|
| Background wakes | Every page load | Only matching pages |
| Code complexity | Manual URL checking | Rule definition |
| Maintenance | Multiple listeners | Single rule set |
| Persistence | Manual on each startup | Native |
| Performance | O(n) per page | Native browser evaluation |
| Edge cases | Race conditions | Handled by browser |

---

## Pattern 7: Complex Matching Patterns {#pattern-7-complex-matching-patterns}

For advanced use cases, you can combine multiple matchers and conditions to create sophisticated targeting logic.

### Multiple Matchers with OR Logic {#multiple-matchers-with-or-logic}

```ts
// background.ts - Complex matching with multiple conditions

/**
 * Rule that triggers on ANY of the specified domains (OR logic)
 * Each condition in the array is OR - any match triggers the rule
 */
const multiDomainRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostSuffix: "github.com" },
    }),
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostSuffix: "gitlab.com" },
    }),
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { hostSuffix: "bitbucket.org" },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Target multiple element types (OR within CSS)
 */
const anyInputRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      css: [
        "input[type='email']",
        "input[type='text']",
        "input[type='tel']",
        "textarea",
      ],
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};
```

### URL Regex Matching {#url-regex-matching}

```ts
// background.ts - Regex URL matching

/**
 * Match URLs using regex patterns
 * Useful for complex URL structures
 */
const regexRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      // Match GitHub repo URLs: username/repo
      pageUrl: {
        urlMatches: "^https?://[^/]+/[^/]+/[^/]+$",
      },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Match specific URL patterns with regex
 */
const issuePageRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {
        urlMatches: "/issues?/|/pull/\\d+",
      },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Combine regex with host
 */
const ghIssuesRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {
        hostSuffix: "github.com",
        urlMatches: "/issues?(/|$)|/pull/\\d+",
      },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};
```

### Scheme-Specific Matching {#scheme-specific-matching}

```ts
// background.ts - Match by URL scheme

/**
 * Show only on secure HTTPS pages
 */
const httpsOnlyRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { schemes: ["https"] },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Match both HTTP and HTTPS, but exclude file://
 */
const webOnlyRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { schemes: ["https", "http"] },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};

/**
 * Match specific schemes with path
 */
const localServerRule: chrome.declarativeContent.PageChangeRule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {
        schemes: ["http", "https"],
        hostPrefix: "localhost",
        pathPrefix: "/api",
      },
    }),
  ],
  actions: [new chrome.declarativeContent.ShowAction()],
};
```

---

## Pattern 8: Testing and Debugging Rules {#pattern-8-testing-and-debugging-rules}

Debugging DeclarativeContent rules can be challenging since they run in the browser's native layer. This pattern covers techniques for testing and troubleshooting.

### Listing Active Rules {#listing-active-rules}

```ts
// background.ts - Debug utilities

/**
 * Get and log all active rules
 */
async function debugListRules(): Promise<void> {
  const rules = await chrome.declarativeContent.onPageChanged.getRules();

  console.log(`[Debug] Active DeclarativeContent rules: ${rules.length}`);

  for (const rule of rules) {
    console.log(`  Rule ID: ${rule.id}`);
    console.log(`  Conditions: ${rule.conditions?.length || 0}`);

    for (const condition of rule.conditions || []) {
      const matcher = condition as chrome.declarativeContent.PageStateMatcher;
      console.log(`    - URL condition:`, (matcher as any).pageUrl);
      console.log(`    - CSS:`, (matcher as any).css);
      console.log(`    - Schemes:`, (matcher as any).schemes);
    }

    console.log(`  Actions: ${rule.actions?.length || 0}`);
    for (const action of rule.actions || []) {
      console.log(`    - ${action instanceof chrome.declarativeContent.ShowAction ? "ShowAction" : "Other action"}`);
    }
  }
}

/**
 * Add debug command for extension debugging
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "DEBUG_LIST_RULES") {
    debugListRules().then(() => sendResponse({ success: true }));
    return true;
  }
});
```

### Common Pitfalls and Solutions {#common-pitfalls-and-solutions}

```ts
// background.ts - Troubleshooting utilities

/**
 * Issue 1: Rules not firing
 * Common causes and fixes
 */
async function diagnoseRuleIssues(): Promise<void> {
  const rules = await chrome.declarativeContent.onPageChanged.getRules();

  if (rules.length === 0) {
    console.warn("[Diagnose] No rules registered! Call registerRules() on startup.");
  }

  // Check for common mistakes
  for (const rule of rules) {
    if (!rule.conditions || rule.conditions.length === 0) {
      console.warn("[Diagnose] Rule has no conditions:", rule.id);
    }

    if (!rule.actions || rule.actions.length === 0) {
      console.warn("[Diagnose] Rule has no actions:", rule.id);
    }
  }
}

/**
 * Issue 2: Stale rules after extension update
 * Solution: Clear and re-register on update
 */
async function handleExtensionUpdate(): Promise<void> {
  // Always clear first to remove deprecated rules
  await chrome.declarativeContent.onPageChanged.removeRules();

  // Re-register with current implementation
  await registerRules();

  console.log("[Update] Rules refreshed for new version");
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "update") {
    await handleExtensionUpdate();
  }
});

/**
 * Issue 3: Manifest permission missing
 * Check this is in manifest.json:
 * "permissions": ["declarativeContent"]
 */
function checkManifestPermissions(): void {
  const manifest = chrome.runtime.getManifest();

  if (!manifest.permissions?.includes("declarativeContent")) {
    console.error("[Manifest] Missing 'declarativeContent' permission!");
  }
}
```

### Reset Rules Utility {#reset-rules-utility}

```ts
// background.ts - Reset utilities for testing

/**
 * Complete reset of DeclarativeContent state
 * Useful for development and testing
 */
async function resetDeclarativeContent(): Promise<void> {
  try {
    // Remove all rules
    await chrome.declarativeContent.onPageChanged.removeRules();
    console.log("[Reset] All rules removed");

    // Re-register fresh
    await registerRules();
    console.log("[Reset] Fresh rules registered");

    // Verify
    const rules = await chrome.declarativeContent.onPageChanged.getRules();
    console.log(`[Reset] Verification: ${rules.length} rules active`);
  } catch (error) {
    console.error("[Reset] Failed:", error);
  }
}

/**
 * Listen for debug commands in development
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "RESET_DECLARATIVE_CONTENT") {
    resetDeclarativeContent().then(() => sendResponse({ success: true }));
    return true;
  }
});
```

---

## Summary Table {#summary-table}

| Pattern | Use Case | Key APIs |
|---------|----------|----------|
| **Basic Setup** | Show/hide action on all/specific pages | PageStateMatcher, ShowAction, onPageChanged |
| **URL Matching** | Target specific domains/paths | hostSuffix, pathPrefix, urlContains |
| **CSS Matching** | Show based on page elements | css array with selectors |
| **Dynamic Rules** | User-configurable matching | removeRules, addRules, storage |
| **Icon State** | Visual feedback per page | setIcon, setBadgeText |
| **Replace onUpdated** | Migrate from imperative to declarative | onPageChanged vs tabs.onUpdated |
| **Complex Matching** | OR logic, regex, schemes | Multiple matchers, urlMatches |
| **Debugging** | Test and troubleshoot rules | getRules, removeRules |

### Best Practices {#best-practices}

1. **Always register rules on startup** — use both `onInstalled` and `onStartup`
2. **Clear rules before adding** — call `removeRules()` first to avoid duplicates
3. **Use specific conditions** — more precise matching = better performance
4. **Combine URL + CSS** — for precise targeting of page features
5. **Handle updates** — refresh rules on extension update
6. **Test thoroughly** — use the debug utilities to verify rule registration

### Further Reading {#further-reading}

- [Chrome DeclarativeContent API Reference](https://developer.chrome.com/docs/extensions/reference/api/declarativeContent)
- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/)
- [@theluckystrike/webext-storage Documentation](./webext-storage.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
