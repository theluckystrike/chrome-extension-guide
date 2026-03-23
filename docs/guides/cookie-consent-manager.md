# Building a Cookie Consent Manager Chrome Extension

This guide covers building a comprehensive cookie consent manager extension using Chrome's Manifest V3, TypeScript, and modern web technologies.

## Overview

A cookie consent manager helps users control which cookies and tracking technologies websites can set on their browser. This extension will:
- Detect cookie consent dialogs on websites
- Automatically accept/reject cookies based on user preferences
- Store consent history for compliance
- Provide a UI for managing consent settings

## Architecture

### Project Structure
```
cookie-consent-manager/
 src/
    background/
       index.ts          # Service worker entry
       consent-engine.ts # Core consent logic
       storage.ts        # Storage management
    content/
       index.ts          # Content script entry
       detector.ts       # Cookie dialog detection
       injector.ts       # DOM manipulation
    popup/
       index.html
       index.tsx
       components/
    shared/
       types.ts          # Shared type definitions
       constants.ts
    styles/
        main.css
 public/
    icons/
 manifest.json
 package.json
 tsconfig.json
```

## Manifest Setup

### manifest.json
```json
{
  "manifest_version": 3,
  "name": "Cookie Consent Manager",
  "version": "1.0.0",
  "description": "Manage cookie consents across websites",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Required Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Persist user preferences and consent history |
| `activeTab` | Access current tab for consent actions |
| `scripting` | Inject scripts to handle cookie dialogs |
| `tabs` | Get tab information for domain-specific settings |
| `host_permissions` | Required for content scripts on all sites |

## Core Implementation

### Type Definitions (src/shared/types.ts)
```typescript
export type ConsentLevel = 'essential' | 'analytics' | 'marketing' | 'functional';

export interface CookieConsent {
  domain: string;
  timestamp: number;
  levels: Record<ConsentLevel, boolean>;
  source: 'auto' | 'manual';
}

export interface UserPreferences {
  defaultConsent: Record<ConsentLevel, boolean>;
  autoAccept: boolean;
  showNotifications: boolean;
  blockThirdParty: boolean;
  consentExpirationDays: number;
}

export interface ConsentHistoryEntry {
  domain: string;
  timestamp: number;
  action: 'accepted' | 'rejected' | 'customized';
  levels: Record<ConsentLevel, boolean>;
}

export type MessageType = 
  | { type: 'GET_CONSENT'; domain: string }
  | { type: 'SET_CONSENT'; consent: CookieConsent }
  | { type: 'GET_PREFERENCES' }
  | { type: 'SET_PREFERENCES'; prefs: Partial<UserPreferences> }
  | { type: 'GET_HISTORY' }
  | { type: 'DETECT_DIALOG' };

export interface MessageResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Storage Management (src/background/storage.ts)
```typescript
import { UserPreferences, CookieConsent, ConsentHistoryEntry } from '../shared/types';

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultConsent: {
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
  },
  autoAccept: true,
  showNotifications: true,
  blockThirdParty: true,
  consentExpirationDays: 365,
};

export class ConsentStorage {
  private static INSTANCE: ConsentStorage;

  static getInstance(): ConsentStorage {
    if (!ConsentStorage.INSTANCE) {
      ConsentStorage.INSTANCE = new ConsentStorage();
    }
    return ConsentStorage.INSTANCE;
  }

  async getPreferences(): Promise<UserPreferences> {
    const result = await chrome.storage.local.get('preferences');
    return result.preferences || DEFAULT_PREFERENCES;
  }

  async setPreferences(prefs: Partial<UserPreferences>): Promise<void> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    await chrome.storage.local.set({ preferences: updated });
  }

  async getConsent(domain: string): Promise<CookieConsent | null> {
    const key = `consent_${this.normalizeDomain(domain)}`;
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  }

  async setConsent(consent: CookieConsent): Promise<void> {
    const key = `consent_${this.normalizeDomain(consent.domain)}`;
    await chrome.storage.local.set({ [key]: consent });
    await this.addToHistory(consent);
  }

  async getHistory(): Promise<ConsentHistoryEntry[]> {
    const result = await chrome.storage.local.get('consentHistory');
    return result.consentHistory || [];
  }

  private async addToHistory(consent: CookieConsent): Promise<void> {
    const history = await this.getHistory();
    const entry: ConsentHistoryEntry = {
      domain: consent.domain,
      timestamp: consent.timestamp,
      action: this.determineAction(consent.levels),
      levels: consent.levels,
    };
    history.unshift(entry);
    // Keep only last 1000 entries
    const trimmed = history.slice(0, 1000);
    await chrome.storage.local.set({ consentHistory: trimmed });
  }

  private normalizeDomain(domain: string): string {
    return domain.replace(/^www\./, '').toLowerCase();
  }

  private determineAction(levels: Record<string, boolean>): 'accepted' | 'rejected' | 'customized' {
    const allTrue = Object.values(levels).every(v => v);
    const allFalse = Object.values(levels).every(v => !v);
    if (allTrue) return 'accepted';
    if (allFalse) return 'rejected';
    return 'customized';
  }
}

export const storage = ConsentStorage.getInstance();
```

### Consent Engine (src/background/consent-engine.ts)
```typescript
import { storage } from './storage';
import { CookieConsent, ConsentLevel } from '../shared/types';

export class ConsentEngine {
  async evaluateConsent(domain: string): Promise<CookieConsent | null> {
    const existing = await storage.getConsent(domain);
    
    if (existing) {
      const prefs = await storage.getPreferences();
      const expiresAt = existing.timestamp + (prefs.consentExpirationDays * 24 * 60 * 60 * 1000);
      
      if (Date.now() < expiresAt) {
        return existing;
      }
    }
    
    return null;
  }

  async applyConsent(domain: string, levels: Partial<Record<ConsentLevel, boolean>>): Promise<CookieConsent> {
    const prefs = await storage.getPreferences();
    const fullLevels = { ...prefs.defaultConsent, ...levels };
    
    const consent: CookieConsent = {
      domain,
      timestamp: Date.now(),
      levels: fullLevels as Record<ConsentLevel, boolean>,
      source: 'manual',
    };
    
    await storage.setConsent(consent);
    
    if (prefs.showNotifications) {
      this.showNotification(domain, consent);
    }
    
    return consent;
  }

  async applyAutoConsent(domain: string): Promise<CookieConsent | null> {
    const prefs = await storage.getPreferences();
    
    if (!prefs.autoAccept) {
      return null;
    }
    
    const consent: CookieConsent = {
      domain,
      timestamp: Date.now(),
      levels: prefs.defaultConsent,
      source: 'auto',
    };
    
    await storage.setConsent(consent);
    return consent;
  }

  private showNotification(domain: string, consent: CookieConsent): void {
    const acceptedCount = Object.values(consent.levels).filter(Boolean).length;
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Cookie Consent Applied',
      message: `${acceptedCount} cookie categories enabled for ${domain}`,
      priority: 1,
    });
  }

  async clearConsent(domain: string): Promise<void> {
    const key = `consent_${domain.replace(/^www\./, '').toLowerCase()}`;
    await chrome.storage.local.remove(key);
  }
}

export const consentEngine = new ConsentEngine();
```

## Content Script Implementation

### Cookie Dialog Detector (src/content/detector.ts)
```typescript
interface DialogElement {
  element: Element;
  type: 'accept' | 'reject' | 'customize' | 'settings';
  selectors: string[];
}

export class CookieDialogDetector {
  private dialogPatterns: DialogElement[] = [
    {
      type: 'accept',
      element: document.body,
      selectors: [
        '[class*="accept"]',
        '[class*="consent"]',
        '[id*="accept"]',
        'button[title*="Accept"]',
        'button[data-testid*="accept"]',
        '.cookie-accept',
        '#cookie-accept',
      ],
    },
    {
      type: 'reject',
      element: document.body,
      selectors: [
        '[class*="reject"]',
        '[class*="decline"]',
        '[id*="reject"]',
        'button[title*="Reject"]',
        'button[data-testid*="reject"]',
        '.cookie-reject',
      ],
    },
    {
      type: 'customize',
      element: document.body,
      selectors: [
        '[class*="customize"]',
        '[class*="settings"]',
        '[class*="manage"]',
        'button:contains("Customize")',
        'button:contains("Manage")',
      ],
    },
  ];

  detectDialog(): DialogElement | null {
    for (const pattern of this.dialogPatterns) {
      for (const selector of pattern.selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            if (this.isVisible(el)) {
              return { ...pattern, element: el, selectors: pattern.selecters };
            }
          }
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  private isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.clientWidth > 0 &&
           element.clientHeight > 0;
  }

  findDialogContainer(): Element | null {
    const containerSelectors = [
      '[class*="cookie-banner"]',
      '[class*="cookie-consent"]',
      '[class*="cookie-notice"]',
      '[id*="cookie"]',
      '[class*="gdpr"]',
      '[class*="consent-banner"]',
      'div[role="dialog"]',
    ];

    for (const selector of containerSelectors) {
      const container = document.querySelector(selector);
      if (container && this.isVisible(container)) {
        return container;
      }
    }
    return null;
  }
}
```

### Content Script Entry (src/content/index.ts)
```typescript
import { CookieDialogDetector } from './detector';

const detector = new CookieDialogDetector();

interface ContentMessage {
  type: 'DIALOG_DETECTED' | 'DIALOG_ACTION';
  payload?: unknown;
}

chrome.runtime.onMessage.addListener((message: ContentMessage, sender, sendResponse) => {
  if (message.type === 'DIALOG_DETECTED') {
    const dialog = detector.detectDialog();
    const container = detector.findDialogContainer();
    sendResponse({ 
      detected: !!dialog, 
      container: container ? 'found' : 'not-found' 
    });
  }
  
  if (message.type === 'DIALOG_ACTION') {
    const { action } = message.payload as { action: string };
    const dialog = detector.detectDialog();
    
    if (dialog && dialog.element) {
      (dialog.element as HTMLElement).click();
      sendResponse({ success: true });
      return true;
    }
    
    sendResponse({ success: false, error: 'No dialog found' });
  }
});

console.log('[Cookie Consent] Content script loaded');
```

## Popup Implementation

### Popup Component (src/popup/index.tsx)
```typescript
import React, { useState, useEffect } from 'react';
import { UserPreferences, CookieConsent, ConsentLevel } from '../shared/types';

const Popup: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = new URL(tab.url || '');
      setCurrentDomain(url.hostname);

      // Load preferences
      const prefsResult = await chrome.runtime.sendMessage({ type: 'GET_PREFERENCES' });
      if (prefsResult.success) {
        setPreferences(prefsResult.data);
      }

      // Load consent for current domain
      const consentResult = await chrome.runtime.sendMessage({ 
        type: 'GET_CONSENT', 
        domain: url.hostname 
      });
      if (consentResult.success) {
        setConsent(consentResult.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (key: keyof UserPreferences, value: boolean) => {
    if (!preferences) return;
    
    const updated = { ...preferences, [key]: value };
    await chrome.runtime.sendMessage({ 
      type: 'SET_PREFERENCES', 
      prefs: updated 
    });
    setPreferences(updated);
  };

  const handleConsentAction = async (levels: Record<ConsentLevel, boolean>) => {
    await chrome.runtime.sendMessage({
      type: 'SET_CONSENT',
      consent: {
        domain: currentDomain,
        timestamp: Date.now(),
        levels,
        source: 'manual',
      },
    });
    loadData();
  };

  if (loading) {
    return <div className="popup-loading">Loading...</div>;
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>Cookie Consent Manager</h1>
        <p className="domain">{currentDomain}</p>
      </header>

      {consent && (
        <section className="current-consent">
          <h2>Current Consent</h2>
          <div className="consent-status">
            {Object.entries(consent.levels).map(([level, enabled]) => (
              <span key={level} className={`badge ${enabled ? 'enabled' : 'disabled'}`}>
                {level}: {enabled ? '' : ''}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="preferences">
        <h2>Default Preferences</h2>
        {preferences && (
          <div className="preference-list">
            <label>
              <input
                type="checkbox"
                checked={preferences.autoAccept}
                onChange={(e) => handlePreferenceChange('autoAccept', e.target.checked)}
              />
              Auto-accept cookies
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.showNotifications}
                onChange={(e) => handlePreferenceChange('showNotifications', e.target.checked)}
              />
              Show notifications
            </label>
            <label>
              <input
                type="checkbox"
                checked={preferences.blockThirdParty}
                onChange={(e) => handlePreferenceChange('blockThirdParty', e.target.checked)}
              />
              Block third-party cookies
            </label>
          </div>
        )}
      </section>

      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button 
            className="btn-accept"
            onClick={() => handleConsentAction({
              essential: true,
              analytics: true,
              marketing: true,
              functional: true,
            })}
          >
            Accept All
          </button>
          <button 
            className="btn-reject"
            onClick={() => handleConsentAction({
              essential: true,
              analytics: false,
              marketing: false,
              functional: false,
            })}
          >
            Reject All
          </button>
        </div>
      </section>
    </div>
  );
};

export default Popup;
```

## Background Service Worker

### Background Entry (src/background/index.ts)
```typescript
import { storage } from './storage';
import { consentEngine } from './consent-engine';

interface Message {
  type: string;
  [key: string]: unknown;
}

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message: Message): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (message.type) {
      case 'GET_PREFERENCES': {
        const prefs = await storage.getPreferences();
        return { success: true, data: prefs };
      }

      case 'SET_PREFERENCES': {
        const prefs = message.prefs as Record<string, unknown>;
        await storage.setPreferences(prefs);
        return { success: true };
      }

      case 'GET_CONSENT': {
        const domain = message.domain as string;
        const consent = await consentEngine.evaluateConsent(domain);
        return { success: true, data: consent };
      }

      case 'SET_CONSENT': {
        const consent = message.consent as Parameters<typeof consentEngine.applyConsent>[1];
        await consentEngine.applyConsent(message.domain as string, consent.levels);
        return { success: true };
      }

      case 'GET_HISTORY': {
        const history = await storage.getHistory();
        return { success: true, data: history };
      }

      case 'APPLY_AUTO_CONSENT': {
        const domain = message.domain as string;
        const consent = await consentEngine.applyAutoConsent(domain);
        return { success: true, data: consent };
      }

      default:
        return { success: false, error: `Unknown message type: ${message.type}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Background] Message handler error:', error);
    return { success: false, error: errorMessage };
  }
}

// Clear expired consents periodically
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup') {
    console.log('[Background] Running consent cleanup');
    // Implement cleanup logic for expired consents
  }
});
```

## State Management Patterns

### Using Chrome Storage with Type Safety
```typescript
// Type-safe storage wrapper
class TypedStorage<T extends Record<string, unknown>> {
  constructor(private prefix: string) {}

  private getKey(key: string): string {
    return `${this.prefix}_${key}`;
  }

  async get<K extends keyof T>(key: K): Promise<T[K] | null> {
    const result = await chrome.storage.local.get(this.getKey(key as string));
    return result[this.getKey(key as string)] ?? null;
  }

  async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    await chrome.storage.local.set({ [this.getKey(key as string)]: value });
  }

  async remove(key: keyof T): Promise<void> {
    await chrome.storage.local.remove(this.getKey(key as string));
  }
}
```

## Error Handling

### Content Script Error Boundaries
```typescript
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[Cookie Consent] Global error:', { message, lineno, colno });
  
  chrome.runtime.sendMessage({
    type: 'ERROR_REPORT',
    payload: {
      context: 'content',
      message: String(message),
      stack: error?.stack,
      url: window.location.href,
      timestamp: Date.now(),
    },
  });
  
  return false;
};
```

### Background Error Handling
```typescript
self.onunhandledrejection = (event) => {
  console.error('[Background] Unhandled promise rejection:', event.reason);
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Extension Error',
    message: 'An error occurred. Check console for details.',
  });
};
```

## Testing Approach

### Unit Testing Storage
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ConsentStorage', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined),
        },
      },
    });
  });

  it('should return default preferences', async () => {
    const { storage } = await import('./storage');
    const prefs = await storage.getPreferences();
    expect(prefs.autoAccept).toBe(true);
    expect(prefs.defaultConsent.essential).toBe(true);
  });
});
```

### Integration Testing with Playwright
```typescript
import { test, expect } from '@playwright/test';

test('popup displays current domain consent', async ({ page }) => {
  await page.goto('chrome-extension://<ext-id>/popup.html');
  
  await expect(page.locator('.domain')).toBeVisible();
  await expect(page.locator('.current-consent')).toBeVisible();
});
```

## Performance Considerations

### Optimize Storage Access
- Batch reads: Use `chrome.storage.local.get(['key1', 'key2'])` instead of multiple calls
- Lazy loading: Load consent history only when needed
- Debounce updates: Don't save on every preference change

### Content Script Performance
- Run at document_end: Avoid blocking page load
- Use MutationObserver: Instead of polling for dialogs
- Minimal DOM manipulation: Cache element references
- Remove listeners: Clean up when content script unloads

### Memory Management
```typescript
// Clean up on page unload
window.addEventListener('unload', () => {
  chrome.runtime.sendMessage({ type: 'CLEANUP' });
});

// Use weak references for caches
const weakCache = new WeakMap<object, any>();
```

## Publishing Checklist

### Pre-submission
- [ ] Test on Chrome, Edge, and Firefox (if supporting)
- [ ] Verify all permissions are necessary
- [ ] Add privacy policy URL in manifest
- [ ] Create screenshots for store listing
- [ ] Test with multiple websites
- [ ] Check for console errors
- [ ] Verify auto-update works

### Store Assets
- [ ] 128x128 icon
- [ ] 440x280 small promo tile
- [ ] 1400x560 large promo tile
- [ ] Screenshots (1280x720 or 640x400)
- [ ] Privacy policy
- [ ] Support URL

### Manifest Requirements
```json
{
  "name": "Cookie Consent Manager",
  "version": "1.0.0",
  "description": "Manage cookie consents across websites",
  "icons": { "128": "icons/icon128.png" },
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>"]
}
```

### Submission
1. Go to Chrome Web Store Developer Dashboard
2. Upload zip file
3. Fill store listing details
4. Submit for review

## Conclusion

This guide covered the essential components for building a cookie consent manager Chrome extension. Key takeaways:

- Use Manifest V3 with proper permission scoping
- Implement type-safe storage with TypeScript
- Handle errors gracefully across all contexts
- Test thoroughly before publishing
- Follow Chrome Web Store guidelines

For more advanced features, consider adding:
- Machine learning for dialog detection
- Consent receipt generation (e.g., CMP compatibility)
- Browser sync for preferences
- Analytics for consent patterns
