# Building a Meeting Scheduler Chrome Extension

A comprehensive guide to building a production-ready Meeting Scheduler Chrome extension with TypeScript.

## Overview

This guide walks you through building a Chrome extension that allows users to schedule, manage, and track meetings directly from their browser. The extension integrates with calendar services, provides reminders, and offers a smooth UI experience.

## Architecture and manifest.json Setup

### Project Structure

```
meeting-scheduler/
 manifest.json
 package.json
 tsconfig.json
 src/
    background/
       service-worker.ts
    popup/
       popup.ts
       popup.html
       popup.css
    content/
       content-script.ts
    overlay/
       overlay.ts
       overlay.html
       overlay.css
    shared/
       types.ts
       storage.ts
       constants.ts
    utils/
        date-utils.ts
        notification-utils.ts
 public/
     icons/
```

### manifest.json Configuration

```json
{
  "manifest_version": 3,
  "name": "Meeting Scheduler",
  "version": "1.0.0",
  "description": "Schedule and manage meetings directly from your browser",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "tabs",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://calendar.google.com/*",
    "https://meet.google.com/*"
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
  "content_scripts": [
    {
      "matches": ["https://calendar.google.com/*"],
      "js": ["content/content-script.js"],
      "css": ["content/content-script.css"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["overlay/*", "icons/*"],
      "matches": ["<all_urls>"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

## Core Implementation with TypeScript

### Type Definitions (src/shared/types.ts)

```typescript
export interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601 format
  endTime: string;
  timezone: string;
  attendees: Attendee[];
  location?: string;
  meetingLink?: string;
  reminders: Reminder[];
  recurring?: RecurringConfig;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Attendee {
  email: string;
  name?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

export interface Reminder {
  type: 'popup' | 'notification' | 'email';
  minutesBefore: number;
  triggered?: boolean;
}

export interface RecurringConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  endDate?: string;
  interval: number;
}

export type MeetingStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface AppState {
  meetings: Meeting[];
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
}

export interface UserSettings {
  defaultReminderMinutes: number;
  defaultDuration: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  enableNotifications: boolean;
  theme: 'light' | 'dark' | 'system';
}
```

### Storage Manager (src/shared/storage.ts)

```typescript
import { Meeting, UserSettings, AppState } from './types';

const STORAGE_KEYS = {
  MEETINGS: 'meetings',
  SETTINGS: 'settings',
  STATE: 'appState',
} as const;

export class StorageManager {
  static async getMeetings(): Promise<Meeting[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.MEETINGS);
    return result[STORAGE_KEYS.MEETINGS] || [];
  }

  static async saveMeeting(meeting: Meeting): Promise<void> {
    const meetings = await this.getMeetings();
    const existingIndex = meetings.findIndex(m => m.id === meeting.id);
    
    if (existingIndex >= 0) {
      meetings[existingIndex] = { ...meeting, updatedAt: new Date().toISOString() };
    } else {
      meetings.push({ ...meeting, createdAt: new Date().toISOString() });
    }
    
    await chrome.storage.local.set({ [STORAGE_KEYS.MEETINGS]: meetings });
  }

  static async deleteMeeting(meetingId: string): Promise<void> {
    const meetings = await this.getMeetings();
    const filtered = meetings.filter(m => m.id !== meetingId);
    await chrome.storage.local.set({ [STORAGE_KEYS.MEETINGS]: filtered });
  }

  static async getSettings(): Promise<UserSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return result[STORAGE_KEYS.SETTINGS] || this.getDefaultSettings();
  }

  static async saveSettings(settings: UserSettings): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  }

  static getDefaultSettings(): UserSettings {
    return {
      defaultReminderMinutes: 15,
      defaultDuration: 60,
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      enableNotifications: true,
      theme: 'system',
    };
  }
}
```

### Service Worker (src/background/service-worker.ts)

```typescript
import { StorageManager } from '../shared/storage';
import { Meeting, Reminder } from '../shared/types';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Meeting Scheduler extension installed');
  initializeAlarms();
});

chrome.alarms.create('checkReminders', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkReminders') {
    await checkAndTriggerReminders();
  }
});

async function checkAndTriggerReminders(): Promise<void> {
  const meetings = await StorageManager.getMeetings();
  const now = new Date();

  for (const meeting of meetings) {
    if (meeting.status === 'cancelled') continue;

    const startTime = new Date(meeting.startTime);
    const timeDiff = startTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / 60000);

    for (const reminder of meeting.reminders) {
      if (reminder.triggered) continue;
      if (minutesDiff <= reminder.minutesBefore && minutesDiff > 0) {
        await triggerReminder(meeting, reminder);
        reminder.triggered = true;
        await StorageManager.saveMeeting(meeting);
      }
    }
  }
}

async function triggerReminder(meeting: Meeting, reminder: Reminder): Promise<void> {
  if (reminder.type === 'notification') {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: `Meeting: ${meeting.title}`,
      message: `Starting in ${reminder.minutesBefore} minutes`,
      priority: 1,
    });
  }
}

function initializeAlarms(): void {
  chrome.alarms.getAll((alarms) => {
    const hasReminderAlarm = alarms.some(a => a.name === 'checkReminders');
    if (!hasReminderAlarm) {
      chrome.alarms.create('checkReminders', { periodInMinutes: 1 });
    }
  });
}
```

## UI Design

### Popup UI (src/popup/popup.ts)

```typescript
import { StorageManager } from '../shared/storage';
import { Meeting, UserSettings } from '../shared/types';

class PopupApp {
  private meetings: Meeting[] = [];
  private settings: UserSettings | null = null;

  async init(): Promise<void> {
    await this.loadData();
    this.render();
    this.attachEventListeners();
  }

  private async loadData(): Promise<void> {
    this.meetings = await StorageManager.getMeetings();
    this.settings = await StorageManager.getSettings();
  }

  private render(): void {
    const container = document.getElementById('meetings-list');
    if (!container) return;

    const upcomingMeetings = this.getUpcomingMeetings();
    
    if (upcomingMeetings.length === 0) {
      container.innerHTML = '<p class="no-meetings">No upcoming meetings</p>';
      return;
    }

    container.innerHTML = upcomingMeetings
      .map(meeting => this.createMeetingCard(meeting))
      .join('');

    this.attachMeetingActions();
  }

  private getUpcomingMeetings(): Meeting[] {
    const now = new Date();
    return this.meetings
      .filter(m => new Date(m.startTime) > now && m.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 10);
  }

  private createMeetingCard(meeting: Meeting): string {
    const startTime = new Date(meeting.startTime);
    const timeString = startTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const dateString = startTime.toLocaleDateString();

    return `
      <div class="meeting-card" data-id="${meeting.id}">
        <div class="meeting-time">
          <span class="time">${timeString}</span>
          <span class="date">${dateString}</span>
        </div>
        <div class="meeting-details">
          <h3 class="title">${this.escapeHtml(meeting.title)}</h3>
          <p class="attendees">${meeting.attendees.length} attendee(s)</p>
        </div>
        <div class="meeting-actions">
          <button class="btn-edit" data-action="edit" data-id="${meeting.id}">Edit</button>
          <button class="btn-delete" data-action="delete" data-id="${meeting.id}">Delete</button>
        </div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private attachEventListeners(): void {
    document.getElementById('new-meeting-btn')?.addEventListener('click', () => {
      this.openMeetingForm();
    });
  }

  private attachMeetingActions(): void {
    document.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = (e.target as HTMLElement).dataset.id;
        if (id && confirm('Delete this meeting?')) {
          await StorageManager.deleteMeeting(id);
          await this.loadData();
          this.render();
        }
      });
    });
  }

  private openMeetingForm(): void {
    // Open the overlay for meeting creation
    chrome.runtime.sendMessage({ action: 'openMeetingForm' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupApp().init();
});
```

### Content Script Overlay

```typescript
// src/content/content-script.ts
import { Meeting } from '../shared/types';

class MeetingOverlay {
  private overlayElement: HTMLElement | null = null;

  init(): void {
    this.createOverlayElement();
    this.injectStyles();
    this.attachMessageListener();
  }

  private createOverlayElement(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'meeting-scheduler-overlay';
    this.overlayElement.className = 'meeting-overlay hidden';
    this.overlayElement.innerHTML = this.getOverlayTemplate();
    document.body.appendChild(this.overlayElement);
  }

  private getOverlayTemplate(): string {
    return `
      <div class="overlay-backdrop"></div>
      <div class="overlay-content">
        <div class="overlay-header">
          <h2>Schedule Meeting</h2>
          <button class="close-btn">&times;</button>
        </div>
        <form id="meeting-form">
          <div class="form-group">
            <label for="title">Title</label>
            <input type="text" id="title" name="title" required />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="start-time">Start Time</label>
              <input type="datetime-local" id="start-time" name="startTime" required />
            </div>
            <div class="form-group">
              <label for="end-time">End Time</label>
              <input type="datetime-local" id="end-time" name="endTime" required />
            </div>
          </div>
          <div class="form-group">
            <label for="attendees">Attendees (emails)</label>
            <input type="text" id="attendees" name="attendees" placeholder="email@example.com" />
          </div>
          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" name="addReminder" checked />
              Add 15-minute reminder
            </label>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-cancel">Cancel</button>
            <button type="submit" class="btn-submit">Schedule</button>
          </div>
        </form>
      </div>
    `;
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .meeting-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
      }
      .meeting-overlay.hidden { display: none; }
      .overlay-backdrop {
        position: absolute;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
      }
      .overlay-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 8px;
        padding: 24px;
        width: 400px;
        max-width: 90%;
      }
    `;
    document.head.appendChild(style);
  }

  private attachMessageListener(): void {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === 'showOverlay') {
        this.show();
      }
    });
  }

  show(): void {
    this.overlayElement?.classList.remove('hidden');
  }

  hide(): void {
    this.overlayElement?.classList.add('hidden');
  }
}

new MeetingOverlay().init();
```

## State Management and Storage Patterns

### Centralized State with Redux-like Pattern

```typescript
// src/shared/state-manager.ts
type Listener = (state: AppState) => void;

class StateManager {
  private state: AppState;
  private listeners: Set<Listener> = new Set();

  constructor(initialState: AppState) {
    this.state = initialState;
  }

  getState(): AppState {
    return this.state;
  }

  setState(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

export const stateManager = new StateManager({
  meetings: [],
  settings: StorageManager.getDefaultSettings(),
  isLoading: false,
  error: null,
});
```

## Error Handling and Edge Cases

### Comprehensive Error Handler

```typescript
// src/utils/error-handler.ts
export class ErrorHandler {
  static handle(error: unknown, context: string): void {
    console.error(`[Error in ${context}]:`, error);
    
    if (error instanceof chrome.runtime.LastError) {
      this.showUserNotification('An error occurred. Please try again.');
    } else if (error instanceof TypeError) {
      this.showUserNotification('Invalid data. Please check your input.');
    } else if (error instanceof Error) {
      this.showUserNotification(error.message);
    }
  }

  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    context: string
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      return null;
    }
  }

  private static showUserNotification(message: string): void {
    chrome.notifications?.create({
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: 'Meeting Scheduler',
      message: message,
    });
  }
}
```

### Edge Cases to Handle

1. Timezone handling: Always store times in UTC, convert for display
2. Offline mode: Queue changes when offline, sync when online
3. Calendar sync conflicts: Detect and prompt user for resolution
4. Double-booking: Warn when scheduling overlapping meetings
5. Expired meetings: Auto-archive or delete past meetings

## Testing Approach

### Unit Testing with Vitest

```typescript
// tests/storage.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from '../src/shared/storage';

describe('StorageManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chrome.storage.local.get.mockResolvedValue({});
    chrome.storage.local.set.mockResolvedValue();
  });

  it('should return empty array when no meetings exist', async () => {
    const meetings = await StorageManager.getMeetings();
    expect(meetings).toEqual([]);
  });

  it('should save a meeting', async () => {
    const meeting = {
      id: '1',
      title: 'Test Meeting',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      timezone: 'UTC',
      attendees: [],
      reminders: [],
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await StorageManager.saveMeeting(meeting);
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });
});
```

### Integration Testing

```typescript
// tests/integration/meeting-flow.test.ts
import { test, expect } from '@playwright/test';

test('complete meeting scheduling flow', async ({ page }) => {
  await page.goto('popup/popup.html');
  
  // Click new meeting button
  await page.click('#new-meeting-btn');
  
  // Fill form
  await page.fill('#title', 'Team Standup');
  await page.fill('#start-time', '2024-01-15T09:00');
  await page.fill('#end-time', '2024-01-15T09:30');
  
  // Submit
  await page.click('.btn-submit');
  
  // Verify meeting appears in list
  await expect(page.locator('.meeting-card')).toContainText('Team Standup');
});
```

## Performance Considerations

1. Lazy load content scripts: Only load on matching URLs
2. Debounce storage writes: Batch updates to reduce I/O
3. Use Web Workers: Offload heavy computations
4. Minimize DOM updates: Use virtual scrolling for long lists
5. Cache API responses: Implement TTL-based caching

```typescript
// Example: Debounced storage
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

const debouncedSave = debounce(async (meeting: Meeting) => {
  await StorageManager.saveMeeting(meeting);
}, 500);
```

## Publishing Checklist

Before publishing to Chrome Web Store:

- [ ] Complete all required metadata (description, screenshots, privacy policy)
- [ ] Test in Chrome, Edge, and other Chromium browsers
- [ ] Verify all permissions are necessary and minimal
- [ ] Run lighthouse audit for performance
- [ ] Ensure no console errors in production
- [ ] Package as .zip (not .crx for new submissions)
- [ ] Create developer account at Chrome Web Store
- [ ] Upload and complete review process

```bash
# Build and package
npm run build
cd dist && zip -r ../meeting-scheduler.zip .
```

## Conclusion

This guide provides a solid foundation for building a production-ready Meeting Scheduler Chrome extension. Key takeaways:

1. Use Manifest V3 with proper permission scoping
2. Implement TypeScript for type safety and maintainability
3. Separate concerns with popup, background service worker, and content scripts
4. Handle errors gracefully and provide user feedback
5. Test thoroughly before publishing
