# Ad Blocking Architecture in Chrome Extensions

## Introduction

Ad blocking is one of the most popular use cases for Chrome extensions. Building an effective ad blocker requires understanding the declarative net request API, content blocking rules, and efficient pattern matching algorithms. This guide covers the architecture patterns and implementation details for building a production-ready ad blocker.

## Core Architecture Overview

Modern ad blockers in Chrome extensions rely on the `declarativeNetRequest` API, which allows you to block or modify network requests without requiring a content script running on every page. This is more performant than older approaches that used `webRequest` API.

```
┌─────────────────────────────────────────────────────────────┐
│                    Ad Blocker Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Manifest   │───▶│  Rule Sets   │───▶│   Matching   │  │
│  │   Config     │    │   Manager    │    │   Engine     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │            │
│         ▼                   ▼                   ▼            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            declarativeNetRequest API                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Network Request Interception            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Manifest Configuration

Your `manifest.json` must declare the necessary permissions and specify rule files:

```json
{
  "name": "Ad Blocker Pro",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": [
    "declarativeNetRequest",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

## TypeScript Implementation

### Rule Type Definitions

```typescript
// types/adBlocker.ts

export interface BlockingRule {
  id: number;
  priority: number;
  action: {
    type: 'block' | 'allow' | 'redirect' | 'modifyHeaders';
    redirect?: {
      url: string;
    };
    requestHeaders?: Array<{
      header: string;
      value: string;
      operation: 'set' | 'append' | 'remove';
    }>;
  };
  condition: {
    urlFilter: string;
    resourceTypes?: Array<'main_frame' | 'sub_frame' | 'stylesheet' | 'script' | 'image' | 'object' | 'xmlhttprequest' | 'ping' | 'csp_report' | 'media' | 'websocket' | 'other'>;
    domainType?: 'firstParty' | 'thirdParty';
    domains?: string[];
    excludedDomains?: string[];
  };
}

export interface RuleSet {
  id: string;
  name: string;
  enabled: boolean;
  rules: BlockingRule[];
}
```

### Rule Manager Service

```typescript
// services/ruleManager.ts

import { BlockingRule, RuleSet } from '../types/adBlocker';
import { chrome } from 'webextension-polyfill';

export class RuleManager {
  private static instance: RuleManager;
  private currentRules: BlockingRule[] = [];
  private readonly MAX_RULES = 300000;

  private constructor() {}

  static getInstance(): RuleManager {
    if (!RuleManager.instance) {
      RuleManager.instance = new RuleManager();
    }
    return RuleManager.instance;
  }

  async loadRuleSet(ruleSet: RuleSet): Promise<void> {
    if (!ruleSet.enabled) return;

    const enabledRules = ruleSet.rules.filter(rule => 
      this.currentRules.length + rule.id < this.MAX_RULES
    );

    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: enabledRules,
        removeRuleIds: enabledRules.map(r => r.id)
      });
      
      this.currentRules = [...this.currentRules, ...enabledRules];
    } catch (error) {
      console.error('Failed to load rules:', error);
      throw error;
    }
  }

  async clearAllRules(): Promise<void> {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: this.currentRules.map(r => r.id)
    });
    this.currentRules = [];
  }

  getRuleCount(): number {
    return this.currentRules.length;
  }
}
```

### Ad Detection and Rule Generation

```typescript
// services/adDetector.ts

import { BlockingRule } from '../types/adBlocker';

export interface AdPattern {
  name: string;
  pattern: RegExp;
  type: 'url' | 'domain' | 'element';
}

// Common ad network patterns
const AD_PATTERNS: AdPattern[] = [
  { name: 'Google Ads', pattern: /\/pagead\//, type: 'url' },
  { name: 'DoubleClick', pattern: /doubleclick\.net/, type: 'domain' },
  { name: 'AdSense', pattern: /googlesyndication\.com/, type: 'domain' },
  { name: 'Facebook Ads', pattern: /facebook\.com\/tr/, type: 'url' },
  { name: 'Amazon Ads', pattern: /amazon-adsystem\.com/, type: 'domain' },
  { name: 'Common Ad Scripts', pattern: /ad(s|v|server|manager)/i, type: 'url' },
];

export class AdDetector {
  private ruleIdCounter = 1;

  generateBlockingRules(patterns: AdPattern[] = AD_PATTERNS): BlockingRule[] {
    return patterns.map(pattern => ({
      id: this.ruleIdCounter++,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: pattern.type === 'domain' 
          ? `||${pattern.pattern.source}^`
          : pattern.pattern.source,
        resourceTypes: ['script', 'image', 'xmlhttprequest', 'sub_frame']
      }
    }));
  }

  generateElementHideRules(selectors: string[]): BlockingRule[] {
    return selectors.map((selector, index) => ({
      id: this.ruleIdCounter++,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'Content-Security-Policy',
            value: `script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';`,
            operation: 'set'
          }
        ]
      },
      condition: {
        urlFilter: '.*',
        resourceTypes: ['main_frame', 'sub_frame']
      }
    }));
  }
}
```

## Filter List Management

Real ad blockers use filter lists similar to EasyList and AdGuard. Here's how to manage them:

```typescript
// services/filterListManager.ts

import { BlockingRule } from '../types/adBlocker';

export interface FilterList {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastUpdated: number;
}

export class FilterListManager {
  private filterLists: Map<string, FilterList> = new Map();
  private parsedRules: Map<string, BlockingRule[]> = new Map();

  async fetchFilterList(list: FilterList): Promise<BlockingRule[]> {
    if (this.parsedRules.has(list.id)) {
      return this.parsedRules.get(list.id)!;
    }

    try {
      const response = await fetch(list.url);
      const filterText = await response.text();
      const rules = this.parseFilterList(filterText);
      
      this.parsedRules.set(list.id, rules);
      return rules;
    } catch (error) {
      console.error(`Failed to fetch filter list ${list.id}:`, error);
      return [];
    }
  }

  private parseFilterList(filterText: string): BlockingRule[] {
    const rules: BlockingRule[] = [];
    let ruleId = 1;

    const lines = filterText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) {
        continue;
      }

      // Parse filter rule
      const rule = this.parseFilterRule(trimmed, ruleId++);
      if (rule) {
        rules.push(rule);
      }
    }

    return rules;
  }

  private parseFilterRule(filter: string, id: number): BlockingRule | null {
    // Handle exception rules (@@)
    const isException = filter.startsWith('@@');
    const effectiveFilter = isException ? filter.slice(2) : filter;

    // Parse domain options
    const optionsMatch = effectiveFilter.match(/\$(.+)$/);
    let options: Record<string, string[]> = {};
    
    if (optionsMatch) {
      const optionStr = optionsMatch[1];
      options = this.parseOptions(optionStr);
    }

    // Build URL filter
    const urlFilter = effectiveFilter.replace(/\$.*$/, '');

    return {
      id,
      priority: isException ? 1 : 1,
      action: {
        type: isException ? 'allow' : 'block'
      },
      condition: {
        urlFilter: this.normalizeUrlFilter(urlFilter),
        resourceTypes: options.type || undefined,
        domainType: options.domainType?.[0] as 'firstParty' | 'thirdParty' | undefined
      }
    };
  }

  private parseOptions(optionStr: string): Record<string, string[]> {
    const options: Record<string, string[]> = {};
    const parts = optionStr.split(',');

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (!key) continue;

      const normalizedKey = key.trim().toLowerCase();
      
      if (value) {
        if (!options[normalizedKey]) options[normalizedKey] = [];
        options[normalizedKey].push(value.trim().toLowerCase());
      }
    }

    return options;
  }

  private normalizeUrlFilter(filter: string): string {
    // Convert filter syntax to regex
    let result = filter
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\^\$/g, '^')
      .replace(/^\|\|/g, '^')
      .replace(/^\|/g, '^')
      .replace(/\|$/g, '$');

    return result;
  }
}
```

## Background Service Worker Setup

```typescript
// background.ts

import { RuleManager } from './services/ruleManager';
import { AdDetector } from './services/adDetector';
import { FilterListManager } from './services/filterListManager';
import { chrome } from 'webextension-polyfill';

const ruleManager = RuleManager.getInstance();
const adDetector = new AdDetector();
const filterListManager = new FilterListManager();

// Default filter lists (similar to EasyList)
const DEFAULT_FILTER_LISTS = [
  { id: 'easylist', name: 'EasyList', url: 'https://easylist.to/easylist/easylist.txt', enabled: true },
  { id: 'easyprivacy', name: 'EasyPrivacy', url: 'https://easylist.to/easylist/easyprivacy.txt', enabled: true },
];

async function initializeRules(): Promise<void> {
  // Generate rules from known ad patterns
  const patternRules = adDetector.generateBlockingRules();
  
  // Load filter list rules
  for (const list of DEFAULT_FILTER_LISTS) {
    if (list.enabled) {
      const filterRules = await filterListManager.fetchFilterList(list);
      patternRules.push(...filterRules);
    }
  }

  // Update rules in batches (Chrome has a limit)
  const BATCH_SIZE = 10000;
  for (let i = 0; i < patternRules.length; i += BATCH_SIZE) {
    const batch = patternRules.slice(i, i + BATCH_SIZE);
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: batch
    });
  }

  console.log(`Loaded ${patternRules.length} blocking rules`);
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  await initializeRules();
  console.log('Ad blocker initialized');
});
```

## Element Hiding (Cosmetic Filtering)

For hiding ad elements on pages, use the `declarativeNetRequest` with `modifyHeaders`:

```typescript
// services/cosmeticFilter.ts

export interface CosmeticRule {
  selector: string;
  domains: string[];
  action: 'hide' | 'css';
}

export function generateCosmeticRules(filters: CosmeticRule[]): any[] {
  return filters.map((filter, index) => ({
    id: index + 100000, // Use high IDs for cosmetic rules
    priority: 1,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        {
          header: 'Content-Security-Policy',
          value: `style-src 'self' 'unsafe-inline';`,
          operation: 'set'
        }
      ]
    },
    condition: {
      urlFilter: '.*',
      resourceTypes: ['main_frame', 'sub_frame'],
      domains: filter.domains
    }
  }));
}
```

## Performance Considerations

### Rule Prioritization

```typescript
// Optimize rule loading order
const PRIORITY_ORDER = [
  'user-rules',      // User's custom rules (highest priority)
  'allow-lists',     // Whitelist rules
  'element-hide',   // Cosmetic filters
  'blocking',       // Standard blocking rules
  'filters'         // External filter lists (lowest priority)
];
```

### Monitoring and Statistics

```typescript
// services/stats.ts

import { chrome } from 'webextension-polyfill';

export interface BlockingStats {
  totalBlocked: number;
  blockedByDomain: Record<string, number>;
  lastReset: number;
}

export class BlockingStatsCollector {
  private stats: BlockingStats = {
    totalBlocked: 0,
    blockedByDomain: {},
    lastReset: Date.now()
  };

  async recordBlock(domain: string): Promise<void> {
    this.stats.totalBlocked++;
    this.stats.blockedByDomain[domain] = 
      (this.stats.blockedByDomain[domain] || 0) + 1;
    
    await chrome.storage.local.set({ blockingStats: this.stats });
  }

  async getStats(): Promise<BlockingStats> {
    const stored = await chrome.storage.local.get('blockingStats');
    return stored.blockingStats || this.stats;
  }

  async resetStats(): Promise<void> {
    this.stats = {
      totalBlocked: 0,
      blockedByDomain: {},
      lastReset: Date.now()
    };
    await chrome.storage.local.set({ blockingStats: this.stats });
  }
}
```

## Testing Your Ad Blocker

```typescript
// __tests__/adBlocker.test.ts

import { AdDetector } from '../services/adDetector';

describe('AdDetector', () => {
  let detector: AdDetector;

  beforeEach(() => {
    detector = new AdDetector();
  });

  test('should generate blocking rules for ad patterns', () => {
    const rules = detector.generateBlockingRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0].action.type).toBe('block');
  });

  test('should correctly parse domain patterns', () => {
    const rules = detector.generateBlockingRules([
      { name: 'Test Ad', pattern: /test-ad\.com/, type: 'domain' }
    ]);
    
    expect(rules[0].condition.urlFilter).toContain('test-ad\\.com');
  });
});
```

## Best Practices

1. **Use declarativeNetRequest** - Never use `webRequest` for blocking as it's deprecated for this use case
2. **Batch rule updates** - Chrome has limits on how many rules you can update at once
3. **Prioritize user rules** - Allow users to add custom rules that take precedence
4. **Regular filter updates** - Filter lists are updated frequently; implement auto-update
5. **Respect resource limits** - Chrome allows up to 300,000 dynamic rules
6. **Test thoroughly** - Use Chrome's `chrome://extensions` to debug rule matching
7. **Handle edge cases** - Some sites use anti-adblock detection; implement workarounds

## Conclusion

Building an effective ad blocker requires understanding network request interception, filter list parsing, and efficient rule management. The declarativeNetRequest API provides the foundation, while proper architecture ensures performance and maintainability. Start with basic blocking rules and progressively add cosmetic filtering, user preferences, and statistics tracking as your extension matures.
