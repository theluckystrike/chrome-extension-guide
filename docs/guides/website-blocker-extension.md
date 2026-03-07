# Building a Website Blocker Chrome Extension

A comprehensive guide to creating a production-ready website blocker extension using Chrome's declarativeNetRequest API.

## Overview

Website blocker extensions are among the most popular types of productivity tools. This guide covers building a robust blocker using Manifest V3, TypeScript, and modern Chrome APIs.

## Architecture and manifest.json Setup

The extension uses Manifest V3 with the declarativeNetRequest API for efficient, privacy-friendly blocking.

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Website Blocker Pro",
  "version": "1.0.0",
  "description": "Block distracting websites and boost productivity",
  "permissions": [
    "storage",
    "declarativeNetRequest",
    "declarativeNetRequestWithHostAccess",
    "tabs"
  ],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "dist/background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Project Structure

```
website-blocker/
├── src/
│   ├── background/
│   │   ├── index.ts          # Service worker entry
│   │   ├── blocker.ts        # Blocking logic
│   │   └── storage.ts        # Storage management
│   ├── popup/
│   │   ├── index.tsx         # Popup React component
│   │   ├── App.tsx           # Main popup UI
│   │   └── styles.css        # Popup styles
│   ├── shared/
│   │   ├── types.ts          # TypeScript interfaces
│   │   └── constants.ts      # Shared constants
│   └── content/
│       └── overlay.ts        # Block page overlay
├── public/
│   ├── popup.html
│   ├── blocked.html          # Custom block page
│   └── icons/
├── dist/                     # Compiled output
├── manifest.json
├── tsconfig.json
└── package.json
```

## Core Implementation with TypeScript

### Types (src/shared/types.ts)

```typescript
export interface BlockedSite {
  id: string;
  url: string;
  pattern: string;      // Regex pattern for matching
  createdAt: number;
  category?: string;
}

export interface ExtensionSettings {
  enabled: boolean;
  blockCount: number;
  blockedSites: BlockedSite[];
  blockedPageUrl?: string;
  allowOnTimer: boolean;
  schedule?: {
    startTime: string;  // HH:MM format
    endTime: string;
    days: number[];     // 0-6, Sunday = 0
  };
}

export interface BlockedRequest {
  url: string;
  tabId: number;
  timestamp: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  blockCount: 0,
  blockedSites: [],
  blockedPageUrl: 'blocked.html',
  allowOnTimer: false,
};
```

### Storage Manager (src/background/storage.ts)

```typescript
import { ExtensionSettings, BlockedSite, DEFAULT_SETTINGS } from '../shared/types';

const STORAGE_KEY = 'extension_settings';

export class StorageManager {
  static async getSettings(): Promise<ExtensionSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || DEFAULT_SETTINGS;
  }

  static async saveSettings(settings: ExtensionSettings): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  }

  static async addBlockedSite(site: BlockedSite): Promise<void> {
    const settings = await this.getSettings();
    settings.blockedSites.push(site);
    await this.saveSettings(settings);
  }

  static async removeBlockedSite(id: string): Promise<void> {
    const settings = await this.getSettings();
    settings.blockedSites = settings.blockedSites.filter(s => s.id !== id);
    await this.saveSettings(settings);
  }

  static async updateBlockedCount(): Promise<void> {
    const settings = await this.getSettings();
    settings.blockCount++;
    await this.saveSettings(settings);
  }
}
```

### Blocker Logic (src/background/blocker.ts)

```typescript
import { StorageManager } from './storage';
import { BlockedSite } from '../shared/types';

export class BlockerEngine {
  private static async getBlockingRules(): Promise<chrome.declarativeNetRequest.Rule[]> {
    const settings = await StorageManager.getSettings();
    
    if (!settings.enabled) {
      return [];
    }

    const rules: chrome.declarativeNetRequest.Rule[] = settings.blockedSites.map(
      (site: BlockedSite, index: number) => ({
        id: index + 1,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            url: settings.blockedPageUrl || 'blocked.html'
          }
        },
        condition: {
          urlFilter: site.pattern,
          resourceTypes: ['main_frame', 'sub_frame']
        }
      })
    );

    return rules;
  }

  static async updateBlockingRules(): Promise<void> {
    try {
      const rules = await this.getBlockingRules();
      
      // First, remove all existing rules
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const ruleIds = existingRules.map(r => r.id);
      
      if (ruleIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds
        });
      }

      // Add new rules if any
      if (rules.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          addRules: rules
        });
      }
    } catch (error) {
      console.error('Failed to update blocking rules:', error);
    }
  }

  static async isUrlBlocked(url: string): Promise<boolean> {
    const settings = await StorageManager.getSettings();
    if (!settings.enabled) return false;

    return settings.blockedSites.some((site: BlockedSite) => {
      const regex = new RegExp(site.pattern);
      return regex.test(url);
    });
  }
}
```

### Background Service Worker (src/background/index.ts)

```typescript
import { StorageManager } from './storage';
import { BlockerEngine } from './blocker';

// Initialize extension
async function initialize(): Promise<void> {
  await BlockerEngine.updateBlockingRules();
}

// Listen for storage changes
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes.extension_settings) {
    await BlockerEngine.updateBlockingRules();
  }
});

// Listen for extension installation
chrome.runtime.onInstalled.addListener(async () => {
  await initialize();
});

// Listen for extension startup
chrome.runtime.onStartup.addListener(async () => {
  await initialize();
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    StorageManager.getSettings().then(sendResponse);
    return true;
  }

  if (message.type === 'ADD_SITE') {
    StorageManager.addBlockedSite(message.site).then(async () => {
      await BlockerEngine.updateBlockingRules();
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'REMOVE_SITE') {
    StorageManager.removeBlockedSite(message.id).then(async () => {
      await BlockerEngine.updateBlockingRules();
      sendResponse({ success: true });
    });
    return true;
  }
});

initialize();
```

## UI Design

### Popup Component (src/popup/App.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import { ExtensionSettings, BlockedSite } from '../shared/types';

export function App() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      setSettings(response);
      setLoading(false);
    });
  }, []);

  const handleAddSite = async () => {
    if (!newUrl || !settings) return;

    const site: BlockedSite = {
      id: crypto.randomUUID(),
      url: newUrl,
      pattern: newUrl.replace(/https?:\/\//, '').replace(/\/.*/, ''),
      createdAt: Date.now()
    };

    await chrome.runtime.sendMessage({ type: 'ADD_SITE', site });
    setNewUrl('');
    const updated = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    setSettings(updated);
  };

  const handleRemoveSite = async (id: string) => {
    await chrome.runtime.sendMessage({ type: 'REMOVE_SITE', id });
    const updated = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    setSettings(updated);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="popup-container">
      <header>
        <h1>Website Blocker</h1>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings?.enabled}
            onChange={async (e) => {
              const updated = { ...settings!, enabled: e.target.checked };
              await chrome.storage.local.set({ extension_settings: updated });
              setSettings(updated);
            }}
          />
          <span className="slider"></span>
        </label>
      </header>

      <div className="add-site-form">
        <input
          type="text"
          placeholder="Enter website URL (e.g., twitter.com)"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddSite()}
        />
        <button onClick={handleAddSite}>Block</button>
      </div>

      <div className="blocked-sites">
        <h2>Blocked Sites ({settings?.blockedSites.length})</h2>
        <ul>
          {settings?.blockedSites.map((site: BlockedSite) => (
            <li key={site.id}>
              <span>{site.url}</span>
              <button onClick={() => handleRemoveSite(site.id)}>×</button>
            </li>
          ))}
        </ul>
      </div>

      <footer>
        <p>Blocked: {settings?.blockCount} sites</p>
      </footer>
    </div>
  );
}
```

### Custom Blocked Page (public/blocked.html)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Site Blocked</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #1a1a2e;
      color: #fff;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 { font-size: 3rem; margin-bottom: 1rem; }
    p { color: #888; font-size: 1.2rem; }
    .timer { margin-top: 2rem; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚫 Site Blocked</h1>
    <p>This website has been blocked by your Website Blocker extension.</p>
    <div class="timer">
      <p>Stay focused! You've got this.</p>
    </div>
  </div>
</body>
</html>
```

## Chrome APIs and Permissions

### Required Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Persist blocked sites and settings |
| `declarativeNetRequest` | Block network requests |
| `declarativeNetRequestWithHostAccess` | Access host patterns for blocking |
| `tabs` | Read tab URLs for blocking decisions |

### Declarative Net Request API

The declarativeNetRequest API is the recommended way to block requests in MV3:

- **Privacy-friendly**: No access to request content
- **Efficient**: Rules evaluated by browser, not extension
- **No host permission for blocking**: Only needed for reading URLs

## State Management and Storage Patterns

### Using chrome.storage.local

```typescript
// Pattern for atomic updates
async function updateSetting<K extends keyof ExtensionSettings>(
  key: K,
  value: ExtensionSettings[K]
): Promise<void> {
  const settings = await StorageManager.getSettings();
  settings[key] = value;
  await StorageManager.saveSettings(settings);
}
```

### Sync Across Components

```typescript
// Popup to Background communication
chrome.runtime.sendMessage({ type: 'UPDATE_ENABLED', enabled: true });

// Background listens and broadcasts to all tabs
chrome.tabs.query({}, (tabs) => {
  tabs.forEach(tab => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED', enabled: true });
    }
  });
});
```

## Error Handling and Edge Cases

### Common Issues and Solutions

1. **Rules not updating**: Ensure `updateDynamicRules` is called after storage changes
2. **Pattern matching failures**: Validate regex patterns before saving
3. **Storage quota exceeded**: Implement cleanup of old blocked sites

```typescript
// Validate URL pattern before adding
function validatePattern(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

// Handle storage quota
async function addSiteWithQuotaCheck(site: BlockedSite): Promise<boolean> {
  const bytesInUse = await chrome.storage.local.getBytesInUse();
  if (bytesInUse > QUOTA_WARNING) {
    // Warn user, clean old entries
    await cleanupOldEntries();
  }
  await StorageManager.addBlockedSite(site);
  return true;
}
```

## Testing Approach

### Unit Testing Storage

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('StorageManager', () => {
  beforeEach(async () => {
    await chrome.storage.local.clear();
  });

  it('should return default settings', async () => {
    const settings = await StorageManager.getSettings();
    expect(settings.enabled).toBe(true);
    expect(settings.blockedSites).toEqual([]);
  });

  it('should add blocked site', async () => {
    const site = { id: '1', url: 'test.com', pattern: 'test.com', createdAt: Date.now() };
    await StorageManager.addBlockedSite(site);
    const settings = await StorageManager.getSettings();
    expect(settings.blockedSites).toHaveLength(1);
  });
});
```

### Integration Testing

```typescript
// Test blocking behavior
async function testBlocking(): Promise<void> {
  // Add a test site
  await StorageManager.addBlockedSite({
    id: 'test-1',
    url: 'example.com',
    pattern: 'example.com',
    createdAt: Date.now()
  });

  // Update rules
  await BlockerEngine.updateBlockingRules();

  // Verify rules
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  expect(rules).toHaveLength(1);
  expect(rules[0].condition.urlFilter).toBe('example.com');
}
```

## Performance Considerations

### Rule Optimization

```typescript
// Combine multiple patterns into single rule
function optimizeRules(sites: BlockedSite[]): chrome.declarativeNetRequest.Rule[] {
  // Group by domain patterns to reduce rule count
  const patternGroups = sites.reduce((acc, site) => {
    const domain = site.url.split('/')[0];
    acc[domain] = acc[domain] || [];
    acc[domain].push(site);
    return acc;
  }, {} as Record<string, BlockedSite[]>);

  // Create optimized rules
  return Object.entries(patternGroups).map(([domain, sites], index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `(${sites.map(s => s.pattern).join('|')})`,
      resourceTypes: ['main_frame', 'sub_frame']
    }
  }));
}
```

### Lazy Loading

```typescript
// Only load blocking rules when needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ACTIVATE_BLOCKING') {
    BlockerEngine.updateBlockingRules().then(() => {
      sendResponse({ activated: true });
    });
    return true;
  }
});
```

## Publishing Checklist

### Pre-submission

- [ ] Test in Chrome, Edge, and Firefox (if cross-browser)
- [ ] Verify all permissions are necessary
- [ ] Check for broken images or missing files
- [ ] Test with Dev channel for edge cases
- [ ] Verify privacy policy URL (if needed)
- [ ] Add screenshots (1280x800, PNG/JPG)

### Submission

1. Package extension: `zip -r extension.zip .`
2. Go to Chrome Web Store Developer Dashboard
3. Upload package
4. Fill store listing details
5. Submit for review

### Post-approval

- Monitor review feedback
- Set up crash reporting
- Configure auto-update
- Prepare for user feedback

## Conclusion

This guide provides a complete foundation for building a production-ready website blocker. The declarativeNetRequest API ensures privacy and performance, while TypeScript provides type safety throughout the codebase. Remember to handle edge cases, test thoroughly, and follow Chrome's guidelines for a smooth publishing experience.
