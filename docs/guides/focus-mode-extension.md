# Building a Focus Mode Chrome Extension

A comprehensive guide to building a productivity-focused Chrome extension that helps users concentrate by managing distractions.

## Overview

A Focus Mode extension provides users with tools to block distracting websites, set work sessions, and maintain concentration. This guide covers the complete implementation using Chrome's MV3 manifest.

## Architecture

### Extension Components

```
src/
 manifest.json           # Extension configuration
 background/
    service-worker.ts   # Background service worker
 popup/
    popup.html          # Popup UI
    popup.ts            # Popup logic
    styles.css          # Popup styles
 content/
    overlay.ts          # Full-page overlay (injected)
 core/
    focus-session.ts    # Core focus session logic
    storage.ts          # Storage management
    blocklist.ts        # Site blocklist management
 types/
    index.ts            # TypeScript interfaces
 utils/
     logger.ts           # Logging utility
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "Focus Mode",
  "version": "1.0.0",
  "description": "Block distractions and stay focused",
  "permissions": [
    "storage",
    "alarms",
    "tabs",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## Core Implementation

### TypeScript Types (src/types/index.ts)

```typescript
export interface FocusSession {
  id: string;
  startTime: number;
  duration: number; // in minutes
  isActive: boolean;
  blockedSites: string[];
}

export interface BlockedSite {
  pattern: string;
  redirectUrl?: string;
}

export interface FocusSettings {
  defaultDuration: number;
  blockedSites: string[];
  enableNotifications: boolean;
  enableSound: boolean;
  strictMode: boolean;
}

export interface ExtensionState {
  currentSession: FocusSession | null;
  settings: FocusSettings;
  isEnabled: boolean;
}

export type MessageType = 
  | 'START_SESSION'
  | 'END_SESSION'
  | 'GET_STATE'
  | 'UPDATE_SETTINGS'
  | 'BLOCK_SITE';

export interface Message {
  type: MessageType;
  payload?: unknown;
}
```

### Storage Management (src/core/storage.ts)

```typescript
import { FocusSettings, FocusSession, ExtensionState } from '../types';

const STORAGE_KEYS = {
  SETTINGS: 'focus_settings',
  SESSION: 'current_session',
  STATS: 'focus_stats'
} as const;

class StorageManager {
  async getSettings(): Promise<FocusSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] ?? this.getDefaultSettings();
  }

  async saveSettings(settings: FocusSettings): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  }

  async getSession(): Promise<FocusSession | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SESSION);
    return result[STORAGE_KEYS.SESSION] ?? null;
  }

  async saveSession(session: FocusSession | null): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SESSION]: session });
  }

  async getState(): Promise<ExtensionState> {
    const [settings, session] = await Promise.all([
      this.getSettings(),
      this.getSession()
    ]);
    return {
      settings,
      currentSession: session,
      isEnabled: session?.isActive ?? false
    };
  }

  private getDefaultSettings(): FocusSettings {
    return {
      defaultDuration: 25,
      blockedSites: ['twitter.com', 'facebook.com', 'reddit.com', 'youtube.com'],
      enableNotifications: true,
      enableSound: true,
      strictMode: false
    };
  }
}

export const storageManager = new StorageManager();
```

### Focus Session Logic (src/core/focus-session.ts)

```typescript
import { FocusSession, FocusSettings } from '../types';
import { storageManager } from './storage';
import { BlocklistManager } from './blocklist';

export class FocusSessionManager {
  private blocklist: BlocklistManager;
  private sessionCheckInterval: number | null = null;

  constructor() {
    this.blocklist = new BlocklistManager();
    this.initializeListeners();
  }

  private initializeListeners(): void {
    // Handle extension icon click
    chrome.action.onClicked.addListener(async (tab) => {
      const session = await storageManager.getSession();
      if (session?.isActive) {
        await this.endSession();
      } else {
        await this.startSession();
      }
    });

    // Check session expiry periodically
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === 'session_check') {
        await this.checkActiveSession();
      }
    });
  }

  async startSession(duration?: number): Promise<FocusSession> {
    const settings = await storageManager.getSettings();
    const sessionDuration = duration ?? settings.defaultDuration;
    
    const session: FocusSession = {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      duration: sessionDuration,
      isActive: true,
      blockedSites: settings.blockedSites
    };

    // Activate blocking
    await this.blocklist.activate(settings.blockedSites);
    
    // Schedule alarm for session end
    chrome.alarms.create('session_end', {
      delayInMinutes: sessionDuration
    });

    // Schedule periodic check
    chrome.alarms.create('session_check', {
      delayInMinutes: 1,
      periodInMinutes: 1
    });

    await storageManager.saveSession(session);
    this.notifyContentScripts('session_started', session);
    
    return session;
  }

  async endSession(): Promise<void> {
    const session = await storageManager.getSession();
    if (!session) return;

    session.isActive = false;
    
    // Deactivate blocking
    await this.blocklist.deactivate();
    
    // Clear alarms
    chrome.alarms.clear('session_end');
    chrome.alarms.clear('session_check');
    
    await storageManager.saveSession(session);
    this.notifyContentScripts('session_ended', session);
  }

  private async checkActiveSession(): Promise<void> {
    const session = await storageManager.getSession();
    if (!session?.isActive) {
      chrome.alarms.clear('session_check');
      return;
    }

    const elapsed = Date.now() - session.startTime;
    const durationMs = session.duration * 60 * 1000;

    if (elapsed >= durationMs) {
      await this.endSession();
      this.showCompletionNotification();
    }
  }

  private notifyContentScripts(action: string, data: unknown): void {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { action, data }).catch(() => {});
        }
      });
    });
  }

  private showCompletionNotification(): void {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Focus Session Complete!',
      message: 'Great job! Take a break.'
    });
  }
}

export const sessionManager = new FocusSessionManager();
```

### Blocklist Management (src/core/blocklist.ts)

```typescript
export class BlocklistManager {
  private isActive = false;
  private originalDeclarativeNetRequest: chrome.declarativeNetRequest.Rule[] = [];

  async activate(blockedSites: string[]): Promise<void> {
    if (this.isActive) return;

    const rules = this.generateBlockingRules(blockedSites);
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: rules,
      removeRuleIds: rules.map(r => r.id)
    });

    this.isActive = true;
  }

  async deactivate(): Promise<void> {
    if (!this.isActive) return;

    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const ruleIds = rules.map(r => r.id);
    
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIds
    });

    this.isActive = false;
  }

  private generateBlockingRules(sites: string[]): chrome.declarativeNetRequest.Rule[] {
    return sites.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: { url: 'data:text/html,<h1>Focus Mode Active</h1>' }
      },
      condition: {
        urlFilter: `*://*.${site}/*`,
        resourceTypes: ['main_frame']
      }
    }));
  }
}
```

## UI Implementation

### Popup (src/popup/popup.ts)

```typescript
import { ExtensionState, FocusSettings } from '../types';
import { storageManager } from '../core/storage';

class PopupController {
  private elements: Record<string, HTMLElement | null> = {};

  async initialize(): Promise<void> {
    this.cacheElements();
    await this.renderState();
    this.attachEventListeners();
  }

  private cacheElements(): void {
    this.elements = {
      status: document.getElementById('status'),
      timer: document.getElementById('timer'),
      startBtn: document.getElementById('start-btn'),
      stopBtn: document.getElementById('stop-btn'),
      settings: document.getElementById('settings-panel')
    };
  }

  private async renderState(): Promise<void> {
    const state = await storageManager.getState();
    
    if (state.currentSession?.isActive) {
      this.showActiveSession(state.currentSession);
    } else {
      this.showIdleState();
    }
  }

  private showActiveSession(session: { duration: number; startTime: number }): void {
    this.updateTimerDisplay(session);
    
    const statusEl = this.elements.status;
    if (statusEl) statusEl.textContent = 'Focus Mode Active';
    
    const startBtn = this.elements.startBtn as HTMLButtonElement;
    const stopBtn = this.elements.stopBtn as HTMLButtonElement;
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = 'block';
  }

  private showIdleState(): void {
    const statusEl = this.elements.status;
    if (statusEl) statusEl.textContent = 'Ready to Focus';
    
    const startBtn = this.elements.startBtn as HTMLButtonElement;
    const stopBtn = this.elements.stopBtn as HTMLButtonElement;
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn) stopBtn.style.display = 'none';
  }

  private updateTimerDisplay(session: { duration: number; startTime: number }): void {
    const timerEl = this.elements.timer;
    if (!timerEl) return;

    const update = () => {
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      const remaining = session.duration * 60 - elapsed;
      
      if (remaining <= 0) {
        timerEl.textContent = '00:00';
        return;
      }

      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    update();
    setInterval(update, 1000);
  }

  private attachEventListeners(): void {
    this.elements.startBtn?.addEventListener('click', async () => {
      const response = await chrome.runtime.sendMessage({ type: 'START_SESSION' });
      if (response.success) {
        this.renderState();
      }
    });

    this.elements.stopBtn?.addEventListener('click', async () => {
      const response = await chrome.runtime.sendMessage({ type: 'END_SESSION' });
      if (response.success) {
        this.renderState();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupController().initialize();
});
```

## Content Script Overlay

### Full-Page Overlay (src/content/overlay.ts)

```typescript
interface OverlayMessage {
  action: string;
  data?: unknown;
}

class FocusOverlay {
  private overlay: HTMLDivElement | null = null;

  initialize(): void {
    chrome.runtime.onMessage.addListener((message: OverlayMessage) => {
      switch (message.action) {
        case 'session_started':
          this.showOverlay();
          break;
        case 'session_ended':
          this.hideOverlay();
          break;
      }
    });
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.id = 'focus-mode-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: 'system-ui, sans-serif'
    });

    overlay.innerHTML = `
      <h1>Focus Mode Active</h1>
      <p>Stay focused! This site is blocked during your session.</p>
      <p>Time remaining: <span id="focus-timer">--:--</span></p>
    `;

    return overlay;
  }

  showOverlay(): void {
    if (this.overlay) return;
    
    this.overlay = this.createOverlay();
    document.body.appendChild(this.overlay);
  }

  hideOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
  }
}

new FocusOverlay().initialize();
```

## State Management

### Message Passing Pattern

```typescript
// Background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE':
      storageManager.getState().then(sendResponse);
      return true;
      
    case 'START_SESSION':
      sessionManager.startSession(message.payload as number)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
      
    case 'END_SESSION':
      sessionManager.endSession()
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;
  }
});
```

## Error Handling

### Service Worker Error Recovery

```typescript
// background/service-worker.ts
chrome.runtime.onInstalled.addListener(() => {
  console.log('Focus Mode installed');
});

chrome.runtime.onStartup.addListener(async () => {
  // Restore session state after browser restart
  const session = await storageManager.getSession();
  if (session?.isActive) {
    const elapsed = Date.now() - session.startTime;
    const durationMs = session.duration * 60 * 1000;
    
    if (elapsed >= durationMs) {
      await sessionManager.endSession();
    }
  }
});

// Handle service worker termination
let sessionCheckInterval: number;

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'session_check') {
    // Re-initialize if needed
    sessionCheckInterval = window.setInterval(() => {
      sessionManager.checkActiveSession();
    }, 60000);
  }
});
```

## Testing

### Unit Tests with Vitest

```typescript
// tests/storage.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageManager } from '../src/core/storage';

describe('StorageManager', () => {
  beforeEach(() => {
    chrome.storage.local.get.mockResolvedValue({});
    chrome.storage.local.set.mockResolvedValue();
  });

  it('should return default settings', async () => {
    const settings = await storageManager.getSettings();
    expect(settings.defaultDuration).toBe(25);
    expect(settings.blockedSites).toContain('twitter.com');
  });

  it('should save and retrieve session', async () => {
    const session = {
      id: 'test-id',
      startTime: Date.now(),
      duration: 25,
      isActive: true,
      blockedSites: ['twitter.com']
    };

    await storageManager.saveSession(session);
    const retrieved = await storageManager.getSession();
    expect(retrieved?.id).toBe(session.id);
  });
});
```

### Integration Testing

```typescript
// tests/e2e/session.test.ts
import { test, expect } from '@playwright/test';

test('Focus session lifecycle', async ({ page, extension }) => {
  // Load extension popup
  const popup = await extension.waitForPopup('popup/popup.html');
  
  // Start session
  await popup.click('#start-btn');
  
  // Verify active state
  await expect(popup.locator('#status')).toContainText('Focus Mode Active');
  
  // Navigate to blocked site
  await page.goto('https://twitter.com');
  
  // Verify redirect/block
  await page.waitForURL('data:text/html*');
});
```

## Performance Considerations

### Optimization Tips

1. Lazy Load Content Scripts: Use dynamic import for heavy modules
2. Minimize Storage Operations: Batch reads/writes with `chrome.storage.session`
3. Debounce Message Passing: Aggregate rapid state updates
4. Use Declarative Net Request: Block sites at network level (more efficient than content scripts)
5. Cache DOM Elements: Avoid repeated `querySelector` calls

```typescript
// Use chrome.storage.session for temporary data
const tempStorage = chrome.storage.session;

// Debounce message sending
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number) {
  let timeoutId: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
```

## Publishing Checklist

### Pre-Publication Requirements

- [ ] Complete `manifest.json` with all required fields
- [ ] Add privacy policy URL in developer dashboard
- [ ] Include screenshots (1280x800, 640x400)
- [ ] Set up OAuth2 if needed (for identity permissions)
- [ ] Test in Chrome, Edge, and Firefox (if cross-browser)
- [ ] Verify no console errors in production build

### Manifest Verification

```json
{
  "manifest_version": 3,
  "name": "Focus Mode",
  "version": "1.0.0",
  "description": "Block distractions and stay focused",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup/popup.html"
  },
  "permissions": [
    "storage",
    "alarms",
    "tabs"
  ]
}
```

### Store Listing Best Practices

- Use clear, concise description (150 chars max visible)
- Include relevant keywords in description
- Add video demonstrating key features
- Respond to user reviews promptly

## Summary

This guide covered the essential components for building a Focus Mode Chrome extension:

1. Manifest V3 configuration with proper permissions
2. TypeScript types for type safety across components
3. Storage management using chrome.storage API
4. Session management with chrome.alarms for scheduling
5. Site blocking using declarativeNetRequest API
6. Popup UI with real-time timer updates
7. Content script overlay for visual blocking feedback
8. Message passing between extension components
9. Error handling for edge cases and recovery
10. Testing strategies for unit and integration tests

For production, consider adding:
- Statistics tracking and analytics
- Custom blocklist per-session
- Break reminders
- Cloud sync across devices
- Keyboard shortcuts (commands API)
