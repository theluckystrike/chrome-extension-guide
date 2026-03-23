# Building a Session Manager Chrome Extension

## Introduction

A Session Manager extension allows users to save, organize, and restore browser sessions, collections of tabs and windows that can be named, tagged, and quickly restored. This guide covers building a complete MV3 session manager with TypeScript, covering architecture, implementation, UI design, storage, testing, and publishing.

## Architecture Overview

### Extension Components

```
session-manager-extension/
 manifest.json           # Extension manifest (MV3)
 src/
    background/
       index.ts        # Service worker entry point
       sessions.ts     # Session CRUD operations
       commands.ts    # Keyboard shortcut handlers
    popup/
       popup.ts        # Popup entry point
       PopupApp.tsx    # Main popup component
       components/     # UI components
    sidebar/
       sidebar.ts      # Side panel entry
       SidebarApp.tsx  # Side panel UI
    content/
       overlay.ts      # In-page session overlay
    shared/
       types.ts        # TypeScript interfaces
       storage.ts      # Storage abstraction
       messaging.ts    # Message handling
    utils/
        logger.ts       # Logging utility
        errors.ts       # Error handling
 styles/
    popup.css
 icons/
    icon-*.png
 _locales/
     en/
         messages.json
```

## Manifest Configuration (MV3)

```json
{
  "manifest_version": 3,
  "name": "Session Manager Pro",
  "version": "1.0.0",
  "description": "Save, organize, and restore browser sessions",
  "permissions": [
    "storage",
    "tabs",
    "windows",
    "sessions",
    "sidePanel",
    "commands",
    "unlimitedStorage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "side_panel": {
    "default_path": "sidebar/sidebar.html"
  },
  "background": {
    "service_worker": "background/background.js",
    "type": "module"
  },
  "commands": {
    "save-session": {
      "suggested_key": {
        "default": "Ctrl+Shift+S",
        "mac": "Command+Shift+S"
      },
      "description": "Save current session"
    },
    "open-session-manager": {
      "suggested_key": {
        "default": "Ctrl+Shift+Y",
        "mac": "Command+Shift+Y"
      },
      "description": "Open session manager"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

## Core TypeScript Types

```typescript
// src/shared/types.ts

export interface SavedSession {
  id: string;
  name: string;
  description?: string;
  tabs: SessionTab[];
  windowId?: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  isPinned: boolean;
  lastRestoredAt?: number;
}

export interface SessionTab {
  id?: number;
  title: string;
  url: string;
  favicon?: string;
  pinned: boolean;
  active: boolean;
  windowId?: number;
}

export interface SessionFilter {
  tags?: string[];
  query?: string;
  dateRange?: {
    start: number;
    end: number;
  };
}

export interface SessionGroup {
  id: string;
  name: string;
  sessionIds: string[];
  color: string;
}

export interface ExtensionSettings {
  theme: 'light' | 'dark' | 'system';
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // minutes
  maxSessions: number;
  showNotifications: boolean;
  defaultSessionName: string;
}
```

## Storage Implementation

```typescript
// src/shared/storage.ts

import { defineSchema, createStorage } from '@theluckystrike/webext-storage';

const sessionSchema = defineSchema({
  sessions: [] as SavedSession[],
  settings: {
    theme: 'system' as 'light' | 'dark' | 'system',
    autoSaveEnabled: false,
    autoSaveInterval: 30,
    maxSessions: 50,
    showNotifications: true,
    defaultSessionName: 'Session'
  } as ExtensionSettings,
  groups: [] as SessionGroup[],
  lastActiveSessionId: null as string | null,
  sessionCounter: 0
});

export const storage = createStorage({
  schema: sessionSchema,
  area: 'local'
});

export type Storage = typeof storage;
```

## Session Service (Background)

```typescript
// src/background/sessions.ts

import { storage } from '../shared/storage';
import type { SavedSession, SessionTab, SessionFilter } from '../shared/types';

export class SessionService {
  
  static async captureCurrentSession(name: string): Promise<SavedSession> {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    const sessionTabs: SessionTab[] = tabs.map(tab => ({
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favicon: tab.favIconUrl,
      pinned: tab.pinned,
      active: tab.active,
      windowId: tab.windowId
    }));

    const session: SavedSession = {
      id: crypto.randomUUID(),
      name,
      tabs: sessionTabs,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      isPinned: false
    };

    const sessions = await storage.get('sessions');
    const settings = await storage.get('settings');
    
    // Enforce max sessions limit
    const updatedSessions = [session, ...sessions].slice(0, settings.maxSessions);
    await storage.set('sessions', updatedSessions);
    
    return session;
  }

  static async captureAllWindows(name: string): Promise<SavedSession> {
    const allTabs = await chrome.tabs.query({});
    const windows = await chrome.windows.getAll({});
    
    const sessionTabs: SessionTab[] = allTabs.map(tab => ({
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favicon: tab.favIconUrl,
      pinned: tab.pinned,
      active: tab.active,
      windowId: tab.windowId
    }));

    const session: SavedSession = {
      id: crypto.randomUUID(),
      name,
      tabs: sessionTabs,
      windowId: windows[0]?.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      isPinned: false
    };

    return session;
  }

  static async restoreSession(sessionId: string, targetWindowId?: number): Promise<void> {
    const sessions = await storage.get('sessions');
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Create new tabs for each session tab
    const windowId = targetWindowId || (await chrome.windows.create())?.id;
    
    if (!windowId) {
      throw new Error('Failed to create window');
    }

    const tabUrls = session.tabs.map(t => t.url).filter(url => url && !url.startsWith('chrome://'));
    
    // Create tabs in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < tabUrls.length; i += batchSize) {
      const batch = tabUrls.slice(i, i + batchSize);
      await chrome.tabs.create({
        windowId,
        url: batch,
        active: i === 0
      });
      // Small delay between batches
      if (i + batchSize < tabUrls.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // Update last restored timestamp
    const updatedSessions = sessions.map(s => 
      s.id === sessionId 
        ? { ...s, lastRestoredAt: Date.now() }
        : s
    );
    await storage.set('sessions', updatedSessions);
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const sessions = await storage.get('sessions');
    const filtered = sessions.filter(s => s.id !== sessionId);
    await storage.set('sessions', filtered);
  }

  static async updateSession(sessionId: string, updates: Partial<SavedSession>): Promise<SavedSession> {
    const sessions = await storage.get('sessions');
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index === -1) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updated = {
      ...sessions[index],
      ...updates,
      updatedAt: Date.now()
    };
    
    sessions[index] = updated;
    await storage.set('sessions', sessions);
    
    return updated;
  }

  static async filterSessions(filter: SessionFilter): Promise<SavedSession[]> {
    const sessions = await storage.get('sessions');
    
    return sessions.filter(session => {
      if (filter.tags?.length) {
        const hasTag = filter.tags.some(tag => session.tags.includes(tag));
        if (!hasTag) return false;
      }
      
      if (filter.query) {
        const query = filter.query.toLowerCase();
        const matchesName = session.name.toLowerCase().includes(query);
        const matchesUrl = session.tabs.some(t => 
          t.url.toLowerCase().includes(query) || 
          t.title.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesUrl) return false;
      }
      
      if (filter.dateRange) {
        if (session.createdAt < filter.dateRange.start || 
            session.createdAt > filter.dateRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }
}
```

## Background Service Worker

```typescript
// src/background/index.ts

import { SessionService } from './sessions';
import { storage } from '../shared/storage';

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log(`Command triggered: ${command}`);
  
  switch (command) {
    case 'save-session':
      const settings = await storage.get('settings');
      const defaultName = `${settings.defaultSessionName} ${new Date().toLocaleString()}`;
      await SessionService.captureCurrentSession(defaultName);
      if (settings.showNotifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Session Saved',
          message: `Saved as "${defaultName}"`
        });
      }
      break;
      
    case 'open-session-manager':
      await chrome.sidePanel.open({ windowId: tab?.windowId });
      break;
  }
});

// Listen for tab updates to potentially auto-save
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Handle tab update events
  }
});

// Auto-save functionality
async function setupAutoSave(): Promise<void> {
  const settings = await storage.get('settings');
  
  if (settings.autoSaveEnabled && settings.autoSaveInterval > 0) {
    chrome.alarms.create('autoSave', {
      delayInMinutes: settings.autoSaveInterval,
      periodInMinutes: settings.autoSaveInterval
    });
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'autoSave') {
    const settings = await storage.get('settings');
    const timestamp = new Date().toISOString();
    await SessionService.captureCurrentSession(`Auto-save ${timestamp}`);
  }
});

// Initialize
setupAutoSave();
```

## Message Handling

```typescript
// src/shared/messaging.ts

import type { SavedSession, SessionFilter, ExtensionSettings } from './types';

export type SessionMessages = {
  'session:save': {
    request: { name: string; captureAllWindows?: boolean };
    response: SavedSession;
  };
  'session:restore': {
    request: { sessionId: string; targetWindowId?: number };
    response: void;
  };
  'session:delete': {
    request: { sessionId: string };
    response: void;
  };
  'session:list': {
    request: { filter?: SessionFilter };
    response: SavedSession[];
  };
  'session:update': {
    request: { sessionId: string; updates: Partial<SavedSession> };
    response: SavedSession;
  };
  'settings:get': {
    request: void;
    response: ExtensionSettings;
  };
  'settings:set': {
    request: Partial<ExtensionSettings>;
    response: void;
  };
};

// Create typed message handler
export function createMessageHandler() {
  return {
    async handleMessage<T extends keyof SessionMessages>(
      type: T,
      request: SessionMessages[T]['request']
    ): Promise<SessionMessages[T]['response']> {
      const response = await chrome.runtime.sendMessage({ type, request });
      return response;
    }
  };
}
```

## Popup UI Component

```typescript
// src/popup/PopupApp.tsx

import React, { useState, useEffect } from 'react';
import type { SavedSession, ExtensionSettings } from '../shared/types';

interface PopupProps {
  onSave: (name: string) => void;
  onRestore: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function PopupApp({ onSave, onRestore, onDelete }: PopupProps) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [sessionsData, settingsData] = await Promise.all([
        chrome.runtime.sendMessage({ type: 'session:list', request: {} }),
        chrome.runtime.sendMessage({ type: 'settings:get', request: undefined })
      ]);
      setSessions(sessionsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredSessions = sessions.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  async function handleSave() {
    if (!sessionName.trim()) return;
    await onSave(sessionName);
    setSessionName('');
    await loadData();
  }

  if (isLoading) {
    return <div className="loading">Loading sessions...</div>;
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>Session Manager</h1>
      </header>
      
      <div className="save-section">
        <input
          type="text"
          placeholder={settings?.defaultSessionName || 'Session name'}
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button onClick={handleSave}>Save</button>
      </div>
      
      <div className="search-section">
        <input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="sessions-list">
        {filteredSessions.map(session => (
          <div key={session.id} className="session-item">
            <div className="session-info">
              <span className="session-name">{session.name}</span>
              <span className="session-meta">
                {session.tabs.length} tabs • {formatDate(session.createdAt)}
              </span>
            </div>
            <div className="session-actions">
              <button onClick={() => onRestore(session.id)}>Restore</button>
              <button onClick={() => onDelete(session.id)} className="delete-btn">×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}
```

## Side Panel UI

```typescript
// src/sidebar/SidebarApp.tsx

import React, { useState, useEffect } from 'react';
import type { SavedSession, SessionGroup } from '../shared/types';

export function SidebarApp() {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [groups, setGroups] = useState<SessionGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'recent' | 'pinned'>('all');

  useEffect(() => {
    loadSessions();
  }, [activeGroup, view]);

  async function loadSessions() {
    const data = await chrome.runtime.sendMessage({ 
      type: 'session:list', 
      request: { filter: getFilter() } 
    });
    setSessions(data);
  }

  function getFilter() {
    if (view === 'pinned') {
      return { query: '' }; // Filter by isPinned in component
    }
    return undefined;
  }

  const displayedSessions = sessions.filter(s => {
    if (view === 'pinned') return s.isPinned;
    if (view === 'recent') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return s.createdAt > weekAgo;
    }
    return true;
  });

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Sessions</h2>
        <button onClick={() => chrome.sidePanel.close()}>×</button>
      </div>
      
      <nav className="sidebar-nav">
        <button 
          className={view === 'all' ? 'active' : ''} 
          onClick={() => setView('all')}
        >
          All Sessions
        </button>
        <button 
          className={view === 'recent' ? 'active' : ''} 
          onClick={() => setView('recent')}
        >
          Recent
        </button>
        <button 
          className={view === 'pinned' ? 'active' : ''} 
          onClick={() => setView('pinned')}
        >
          Pinned
        </button>
      </nav>
      
      <div className="sidebar-content">
        {displayedSessions.map(session => (
          <SessionCard 
            key={session.id} 
            session={session}
            onRestore={() => restoreSession(session.id)}
            onTogglePin={() => togglePin(session.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

## Error Handling

```typescript
// src/utils/errors.ts

export class SessionManagerError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'SessionManagerError';
  }
}

export const ErrorCodes = {
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  STORAGE_FULL: 'STORAGE_FULL',
  INVALID_SESSION_DATA: 'INVALID_SESSION_DATA',
  RESTORE_FAILED: 'RESTORE_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof SessionManagerError) {
      throw error;
    }
    
    console.error(`Error in ${context}:`, error);
    
    // Determine if recoverable
    const message = error instanceof Error ? error.message : 'Unknown error';
    const recoverable = !message.includes('permission');
    
    throw new SessionManagerError(
      message,
      ErrorCodes.INVALID_SESSION_DATA,
      recoverable
    );
  }
}

export function handleStorageError(error: unknown): void {
  if (error instanceof Error) {
    if (error.message.includes('QUOTA_BYTES')) {
      console.error('Storage quota exceeded');
      // Notify user to delete old sessions
      chrome.notifications.create({
        type: 'basic',
        title: 'Storage Full',
        message: 'Please delete some sessions to save new ones.'
      });
    }
  }
}
```

## Testing Approach

### Unit Tests (Vitest)

```typescript
// tests/unit/sessions.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '../../src/background/sessions';

describe('SessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture current session with tabs', async () => {
    // Mock chrome.tabs.query
    global.chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 1, title: 'Google', url: 'https://google.com', favIconUrl: 'icon.png', pinned: false, active: true, windowId: 1 },
          { id: 2, title: 'GitHub', url: 'https://github.com', favIconUrl: 'icon2.png', pinned: true, active: false, windowId: 1 }
        ])
      }
    } as any;

    const session = await SessionService.captureCurrentSession('Test Session');
    
    expect(session.name).toBe('Test Session');
    expect(session.tabs).toHaveLength(2);
    expect(session.tabs[0].url).toBe('https://google.com');
  });

  it('should filter sessions by query', async () => {
    // Test filtering logic
  });
});
```

### Integration Tests (Playwright)

```typescript
// tests/integration/popup.test.ts

import { test, expect } from '@playwright/test';

test('popup saves session', async ({ page }) => {
  // Load extension popup
  await page.goto('chrome-extension://EXTENSION_ID/popup/popup.html');
  
  // Enter session name
  await page.fill('input[type="text"]', 'Test Session');
  
  // Click save button
  await page.click('button:has-text("Save")');
  
  // Verify notification or session list update
  await expect(page.locator('.sessions-list')).toContainText('Test Session');
});
```

## Performance Considerations

### 1. Lazy Loading

```typescript
// Only load heavy data when needed
async function loadSessionDetails(sessionId: string): Promise<SavedSession> {
  const sessions = await storage.get('sessions');
  return sessions.find(s => s.id === sessionId)!;
}
```

### 2. Tab Batch Processing

```typescript
// Restore tabs in batches to avoid UI freeze
async function restoreTabsBatched(urls: string[], windowId: number): Promise<void> {
  const batchSize = 5;
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.all(
      batch.map(url => chrome.tabs.create({ windowId, url, active: false }))
    );
    
    // Yield to main thread
    await new Promise(r => setTimeout(r, 0));
  }
}
```

### 3. Debounced Storage

```typescript
// Debounce rapid saves
import { debounce } from 'lodash-es';

const debouncedSave = debounce(async (sessions: SavedSession[]) => {
  await storage.set('sessions', sessions);
}, 500);
```

### 4. Memory Management

- Clear large session data when not in use
- Use `chrome.tabs.query()` with specific filters instead of querying all tabs
- Implement pagination for large session lists

## Publishing Checklist

### Pre-submission

- [ ] Test extension in fresh Chrome profile
- [ ] Verify all keyboard shortcuts work
- [ ] Check storage quota usage
- [ ] Review privacy policy URL (required if collecting data)
- [ ] Verify icon sizes: 16, 32, 48, 128, 256, 512
- [ ] Test in Incognito mode
- [ ] Check for console errors

### Manifest Review

- [ ] Manifest V3 required for new extensions
- [ ] Permissions are minimal and justified
- [ ] Host permissions use specific patterns, not `<all_urls>`
- [ ] Service worker has proper error handling

### Store Listing

- [ ] Compelling icon and screenshots (at least one)
- [ ] Clear, concise description
- [ ] Category: Productivity > Productivity (or appropriate)
- [ ] Privacy policy if accessing web history or storing user data
- [ ] Support URL (can be GitHub Issues link)

### Post-submission

- [ ] Monitor review status
- [ ] Address reviewer feedback promptly
- [ ] Test published version after approval
- [ ] Set up update notifications

## Related Resources

- [Chrome Sessions API](https://developer.chrome.com/docs/extensions/reference/api/sessions)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [Tab Groups API](https://developer.chore.com/docs/extensions/reference/api/tabGroups)
