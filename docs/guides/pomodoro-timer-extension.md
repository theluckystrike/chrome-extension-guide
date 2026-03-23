# Building a Pomodoro Timer Chrome Extension

The Pomodoro Technique is a time management method that uses a timer to break work into focused intervals (typically 25 minutes), separated by short breaks (5 minutes). Building a Pomodoro timer as a Chrome extension is an excellent project that demonstrates key Chrome extension development concepts including background service workers, popup UI, alarms API, storage, and cross-context communication. This guide walks through building a production-ready Pomodoro timer extension from architecture to publishing.

## Table of Contents

- [Architecture and Manifest Setup](#architecture-and-manifest-setup)
- [Core Implementation with TypeScript](#core-implementation-with-typescript)
- [UI Design (Popup/Sidebar/Content Script Overlay)](#ui-design-popupsidebarcontent-script-overlay)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management and Storage Patterns](#state-management-and-storage-patterns)
- [Error Handling and Edge Cases](#error-handling-and-edge-cases)
- [Testing Approach](#testing-approach)
- [Code Examples with Full TypeScript Implementations](#code-examples-with-full-typescript-implementations)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

## Architecture and Manifest Setup

### Recommended Directory Structure

```
pomodoro-timer/
 manifest.json
 package.json
 tsconfig.json
 src/
    background/
       index.ts          # Service worker entry point
       timer.ts          # Timer logic
       storage.ts        # Background storage utilities
    popup/
       popup.html
       popup.ts          # Popup entry point
       Popup.tsx         # React/Vanilla component
       popup.css
    content/
       content.ts        # Content script
       overlay.ts        # Visual overlay component
    shared/
       types.ts          # Shared TypeScript interfaces
       constants.ts      # Timer durations, messages
       utils.ts          # Utility functions
    options/
        options.html
        options.ts
 icons/
    icon-16.png
    icon-48.png
    icon-128.png
 _locales/
     en/
         messages.json
```

### Manifest Configuration (Manifest V3)

```json
{
  "manifest_version": 3,
  "name": "Pomodoro Timer Pro",
  "version": "1.0.0",
  "description": "A feature-rich Pomodoro timer with customizable intervals and productivity tracking",
  "default_locale": "en",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    "default_title": "Pomodoro Timer"
  },
  "background": {
    "service_worker": "background/index.js",
    "type": "module"
  },
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "options_page": "options/options.html"
}
```

Key manifest decisions explained:

- `"type": "module"` in background allows ES6 modules in service worker
- `storage` permission for persisting timer state and user preferences
- `alarms` API for reliable timer execution even when popup is closed
- `notifications` for break/work session alerts
- `activeTab` for injecting overlay into current tab when needed

---

Core Implementation with TypeScript

Shared Types (src/shared/types.ts)

```typescript
// Timer states
export type TimerState = 'idle' | 'running' | 'paused' | 'break';

// Session types
export type SessionType = 'work' | 'shortBreak' | 'longBreak';

// Timer configuration
export interface TimerConfig {
  workDuration: number;      // in minutes (default: 25)
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number; // sessions before long break (default: 4)
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
}

// Current timer status
export interface TimerStatus {
  state: TimerState;
  sessionType: SessionType;
  timeRemaining: number;    // in seconds
  sessionsCompleted: number;
  startedAt: number | null; // timestamp
}

// Full application state
export interface AppState {
  config: TimerConfig;
  status: TimerStatus;
}

// Message types for cross-context communication
export type MessageType = 
  | { type: 'GET_STATUS'; payload: null }
  | { type: 'START_TIMER'; payload: { sessionType?: SessionType } }
  | { type: 'PAUSE_TIMER'; payload: null }
  | { type: 'RESUME_TIMER'; payload: null }
  | { type: 'RESET_TIMER'; payload: null }
  | { type: 'SKIP_SESSION'; payload: null }
  | { type: 'UPDATE_CONFIG'; payload: Partial<TimerConfig> }
  | { type: 'STATUS_UPDATE'; payload: TimerStatus };

// Alarm names
export const ALARM_NAME = 'pomodoro-timer-alarm';
export const TICK_ALARM_NAME = 'pomodoro-timer-tick';
```

Timer Logic (src/background/timer.ts)

```typescript
import { TimerStatus, TimerState, SessionType, TimerConfig, AppState, ALARM_NAME, TICK_ALARM_NAME } from '../shared/types';
import { getStorage, setStorage } from './storage';

const DEFAULT_CONFIG: TimerConfig = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  notificationsEnabled: true,
  soundEnabled: true,
};

export class PomodoroTimer {
  private status: TimerStatus = {
    state: 'idle',
    sessionType: 'work',
    timeRemaining: DEFAULT_CONFIG.workDuration * 60,
    sessionsCompleted: 0,
    startedAt: null,
  };

  private config: TimerConfig = DEFAULT_CONFIG;

  constructor() {
    this.loadState();
  }

  private async loadState(): Promise<void> {
    const storage = await getStorage();
    this.config = { ...DEFAULT_CONFIG, ...storage.config };
    if (storage.status) {
      this.status = storage.status;
      // Recalculate time if timer was running
      if (this.status.startedAt && this.status.state === 'running') {
        const elapsed = Math.floor((Date.now() - this.status.startedAt) / 1000);
        this.status.timeRemaining = Math.max(0, this.status.timeRemaining - elapsed);
        if (this.status.timeRemaining === 0) {
          this.handleTimerComplete();
        }
      }
    }
    this.setTimerAlarm();
  }

  private async saveState(): Promise<void> {
    await setStorage({ config: this.config, status: this.status });
  }

  private setTimerAlarm(): void {
    chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.clear(TICK_ALARM_NAME);

    if (this.status.state === 'running' && this.status.timeRemaining > 0) {
      // Main timer alarm
      chrome.alarms.create(ALARM_NAME, {
        delayInMinutes: this.status.timeRemaining / 60,
      });

      // Tick alarm for UI updates (every second)
      chrome.alarms.create(TICK_ALARM_NAME, {
        periodInMinutes: 1 / 60,
      });
    }
  }

  async start(sessionType?: SessionType): Promise<TimerStatus> {
    if (sessionType) {
      this.status.sessionType = sessionType;
      this.status.timeRemaining = this.getDurationForSession(sessionType) * 60;
    }

    this.status.state = 'running';
    this.status.startedAt = Date.now();
    this.setTimerAlarm();
    await this.saveState();
    this.broadcastStatus();
    return this.status;
  }

  async pause(): Promise<TimerStatus> {
    if (this.status.state !== 'running') return this.status;

    this.status.state = 'paused';
    // Calculate remaining time accounting for elapsed
    if (this.status.startedAt) {
      const elapsed = Math.floor((Date.now() - this.status.startedAt) / 1000);
      this.status.timeRemaining = Math.max(0, this.status.timeRemaining - elapsed);
      this.status.startedAt = null;
    }

    chrome.alarms.clear(TICK_ALARM_NAME);
    await this.saveState();
    this.broadcastStatus();
    return this.status;
  }

  async resume(): Promise<TimerStatus> {
    if (this.status.state !== 'paused') return this.status;

    this.status.state = 'running';
    this.status.startedAt = Date.now();
    this.setTimerAlarm();
    await this.saveState();
    this.broadcastStatus();
    return this.status;
  }

  async reset(): Promise<TimerStatus> {
    chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.clear(TICK_ALARM_NAME);

    this.status = {
      state: 'idle',
      sessionType: 'work',
      timeRemaining: this.config.workDuration * 60,
      sessionsCompleted: this.status.sessionsCompleted,
      startedAt: null,
    };

    await this.saveState();
    this.broadcastStatus();
    return this.status;
  }

  async skip(): Promise<TimerStatus> {
    this.handleTimerComplete();
    return this.status;
  }

  async tick(): Promise<TimerStatus> {
    if (this.status.state !== 'running') return this.status;

    if (this.status.startedAt) {
      const elapsed = Math.floor((Date.now() - this.status.startedAt) / 1000);
      this.status.timeRemaining = Math.max(0, this.getDurationForSession(this.status.sessionType) * 60 - elapsed);

      if (this.status.timeRemaining === 0) {
        await this.handleTimerComplete();
      } else {
        this.broadcastStatus();
      }
    }

    return this.status;
  }

  private async handleTimerComplete(): Promise<void> {
    chrome.alarms.clear(ALARM_NAME);
    chrome.alarms.clear(TICK_ALARM_NAME);

    // Show notification
    if (this.config.notificationsEnabled) {
      await this.showNotification();
    }

    // Determine next session
    let nextSessionType: SessionType;
    if (this.status.sessionType === 'work') {
      this.status.sessionsCompleted++;
      const isLongBreak = this.status.sessionsCompleted % this.config.longBreakInterval === 0;
      nextSessionType = isLongBreak ? 'longBreak' : 'shortBreak';
    } else {
      nextSessionType = 'work';
    }

    // Auto-start logic
    const shouldAutoStart = 
      (nextSessionType === 'work' && this.config.autoStartPomodoros) ||
      (nextSessionType !== 'work' && this.config.autoStartBreaks);

    this.status = {
      state: shouldAutoStart ? 'running' : 'idle',
      sessionType: nextSessionType,
      timeRemaining: this.getDurationForSession(nextSessionType) * 60,
      sessionsCompleted: this.status.sessionsCompleted,
      startedAt: shouldAutoStart ? Date.now() : null,
    };

    if (shouldAutoStart) {
      this.setTimerAlarm();
    }

    await this.saveState();
    this.broadcastStatus();
  }

  private getDurationForSession(sessionType: SessionType): number {
    switch (sessionType) {
      case 'work': return this.config.workDuration;
      case 'shortBreak': return this.config.shortBreakDuration;
      case 'longBreak': return this.config.longBreakDuration;
    }
  }

  private async showNotification(): Promise<void> {
    const title = this.status.sessionType === 'work' 
      ? 'Work Session Complete!' 
      : 'Break Time Over!';
    
    const message = this.status.sessionType === 'work'
      ? 'Great job! Time for a break.'
      : 'Ready to focus again?';

    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title,
      message,
      priority: 1,
    });
  }

  private broadcastStatus(): void {
    chrome.runtime.sendMessage({
      type: 'STATUS_UPDATE',
      payload: this.status,
    }).catch(() => {
      // Ignore errors - popup may not be open
    });
  }

  getStatus(): TimerStatus {
    return this.status;
  }

  getConfig(): TimerConfig {
    return this.config;
  }

  async updateConfig(newConfig: Partial<TimerConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Update time remaining if idle
    if (this.status.state === 'idle') {
      this.status.timeRemaining = this.getDurationForSession(this.status.sessionType) * 60;
    }
    
    await this.saveState();
    this.broadcastStatus();
  }
}
```

---

UI Design (Popup/Sidebar/Content Script Overlay)

Popup UI (src/popup/Popup.tsx)

```typescript
import { TimerStatus, TimerConfig, SessionType, MessageType } from '../shared/types';

export class PopupView {
  private container: HTMLElement;
  private status: TimerStatus | null = null;
  private config: TimerConfig | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);
    this.container = container;
    this.init();
  }

  private init(): void {
    this.render();
    this.setupEventListeners();
    this.requestStatus();
    
    // Listen for status updates
    chrome.runtime.onMessage.addListener((message: MessageType) => {
      if (message.type === 'STATUS_UPDATE') {
        this.status = message.payload;
        this.updateDisplay();
      }
    });
  }

  private async requestStatus(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS', payload: null });
      if (response?.payload) {
        this.status = response.payload;
        this.updateDisplay();
      }
    } catch (error) {
      console.error('Failed to get status:', error);
    }
  }

  private setupEventListeners(): void {
    document.getElementById('start-btn')?.addEventListener('click', () => this.sendMessage({ type: 'START_TIMER', payload: {} }));
    document.getElementById('pause-btn')?.addEventListener('click', () => this.sendMessage({ type: 'PAUSE_TIMER', payload: null }));
    document.getElementById('resume-btn')?.addEventListener('click', () => this.sendMessage({ type: 'RESUME_TIMER', payload: null }));
    document.getElementById('reset-btn')?.addEventListener('click', () => this.sendMessage({ type: 'RESET_TIMER', payload: null }));
    document.getElementById('skip-btn')?.addEventListener('click', () => this.sendMessage({ type: 'SKIP_SESSION', payload: null }));
  }

  private sendMessage(message: MessageType): void {
    chrome.runtime.sendMessage(message).catch(console.error);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="pomodoro-app">
        <div class="timer-display">
          <div class="session-type" id="session-type">Work</div>
          <div class="time" id="time-display">25:00</div>
          <div class="sessions-count" id="sessions-count">Sessions: 0</div>
        </div>
        
        <div class="controls">
          <button id="start-btn" class="btn btn-primary">Start</button>
          <button id="pause-btn" class="btn btn-secondary" hidden>Pause</button>
          <button id="resume-btn" class="btn btn-primary" hidden>Resume</button>
          <button id="reset-btn" class="btn btn-outline">Reset</button>
          <button id="skip-btn" class="btn btn-outline">Skip</button>
        </div>
      </div>
    `;
    
    this.addStyles();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .pomodoro-app {
        width: 280px;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .timer-display {
        text-align: center;
        margin-bottom: 20px;
      }
      .session-type {
        font-size: 14px;
        text-transform: uppercase;
        color: #666;
        margin-bottom: 8px;
      }
      .time {
        font-size: 48px;
        font-weight: 700;
        color: #333;
      }
      .sessions-count {
        font-size: 12px;
        color: #888;
        margin-top: 8px;
      }
      .controls {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-primary {
        background: #e53935;
        color: white;
      }
      .btn-primary:hover {
        background: #c62828;
      }
      .btn-secondary {
        background: #ff9800;
        color: white;
      }
      .btn-outline {
        background: transparent;
        border: 1px solid #ddd;
        color: #666;
      }
      .btn-outline:hover {
        background: #f5f5f5;
      }
    `;
    this.container.appendChild(style);
  }

  private updateDisplay(): void {
    if (!this.status) return;

    const timeEl = document.getElementById('time-display');
    const sessionEl = document.getElementById('session-type');
    const sessionsEl = document.getElementById('sessions-count');
    const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
    const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
    const resumeBtn = document.getElementById('resume-btn') as HTMLButtonElement;

    if (timeEl) timeEl.textContent = this.formatTime(this.status.timeRemaining);
    if (sessionEl) sessionEl.textContent = this.status.sessionType.replace(/([A-Z])/g, ' $1').trim();
    if (sessionsEl) sessionsEl.textContent = `Sessions: ${this.status.sessionsCompleted}`;

    // Toggle button visibility based on state
    if (startBtn) startBtn.hidden = this.status.state !== 'idle';
    if (pauseBtn) pauseBtn.hidden = this.status.state !== 'running';
    if (resumeBtn) resumeBtn.hidden = this.status.state !== 'paused';
  }
}
```

Content Script Overlay (src/content/overlay.ts)

```typescript
// Optional: Inject a floating timer overlay into web pages

export class TimerOverlay {
  private container: HTMLElement | null = null;
  private status: { timeRemaining: number; state: string } | null = null;

  constructor() {
    this.createOverlay();
    this.setupMessageListener();
  }

  private createOverlay(): void {
    this.container = document.createElement('div');
    this.container.id = 'pomodoro-overlay';
    this.container.innerHTML = `
      <style>
        #pomodoro-overlay {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: white;
          border-radius: 12px;
          padding: 16px 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          z-index: 999999;
          min-width: 120px;
          text-align: center;
          transition: all 0.3s ease;
        }
        #pomodoro-overlay.running {
          border-left: 4px solid #e53935;
        }
        #pomodoro-overlay.paused {
          border-left: 4px solid #ff9800;
          opacity: 0.8;
        }
        #pomodoro-overlay .time {
          font-size: 28px;
          font-weight: 600;
          color: #333;
        }
        #pomodoro-overlay .state {
          font-size: 11px;
          text-transform: uppercase;
          color: #888;
          margin-top: 4px;
        }
      </style>
      <div class="time">--:--</div>
      <div class="state">Idle</div>
    `;
    document.body.appendChild(this.container);
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: { type: string; payload?: unknown }) => {
      if (message.type === 'STATUS_UPDATE') {
        this.status = message.payload as { timeRemaining: number; state: string };
        this.updateDisplay();
      }
    });
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private updateDisplay(): void {
    if (!this.container || !this.status) return;

    const timeEl = this.container.querySelector('.time');
    const stateEl = this.container.querySelector('.state');

    if (timeEl) timeEl.textContent = this.formatTime(this.status.timeRemaining);
    if (stateEl) stateEl.textContent = this.status.state;

    this.container.className = this.status.state;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TimerOverlay());
} else {
  new TimerOverlay();
}
```

---

Chrome APIs and Permissions

Permissions Required

| Permission | Purpose |
|------------|---------|
| `storage` | Persist timer state and user settings |
| `alarms` | Reliable timer execution in background |
| `notifications` | Alert user when session completes |
| `activeTab` | Inject overlay into current tab |

Chrome API Usage Patterns

```typescript
// Storage - Use chrome.storage.local (not sync) for extension-specific data
import { getStorage, setStorage } from './storage';

async function example(): Promise<void> {
  // Read
  const data = await getStorage();
  console.log(data.config);

  // Write
  await setStorage({ 
    config: { workDuration: 30 },
    status: null 
  });
}

// Alarms - More reliable than setTimeout in service workers
chrome.alarms.create('timer', { delayInMinutes: 25 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'timer') {
    // Handle timer complete
  }
});

// Notifications
chrome.notifications.create({
  type: 'basic',
  iconUrl: 'icon.png',
  title: 'Timer Complete',
  message: 'Time for a break!',
});

// Cross-context messaging
// From popup to background
chrome.runtime.sendMessage({ type: 'START_TIMER', payload: {} });

// From background to popup
chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', payload: status });
```

---

State Management and Storage Patterns

Storage Layer (src/background/storage.ts)

```typescript
import { AppState, TimerConfig, TimerStatus } from '../shared/types';

const STORAGE_KEY = 'pomodoro-state';

export interface StoredData {
  config?: Partial<TimerConfig>;
  status?: TimerStatus;
}

export async function getStorage(): Promise<AppState> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      resolve(result[STORAGE_KEY] || { config: {}, status: null });
    });
  });
}

export async function setStorage(data: StoredData): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const current = result[STORAGE_KEY] || { config: {}, status: null };
      const updated = {
        config: { ...current.config, ...data.config },
        status: data.status ?? current.status,
      };
      chrome.storage.local.set({ [STORAGE_KEY]: updated }, resolve);
    });
  });
}
```

State Synchronization Pattern

```typescript
// Always sync state when popup opens
// In popup/popup.ts
chrome.runtime.sendMessage({ type: 'GET_STATUS', payload: null }, (response) => {
  if (response?.payload) {
    updateUI(response.payload);
  }
});

// In background/index.ts - handle message
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATUS') {
    const status = timer.getStatus();
    sendResponse({ payload: status });
    return true; // Keep channel open for async response
  }
});
```

---

Error Handling and Edge Cases

Service Worker Lifecycle Handling

```typescript
// background/index.ts - Handle service worker restart
import { PomodoroTimer } from './timer';

const timer = new PomodoroTimer();

// Re-initialize timer on service worker startup
chrome.runtime.onStartup.addListener(() => {
  console.log('Service worker started');
  timer.getStatus(); // This triggers state reload
});

// Handle alarm even after service worker was terminated
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await timer.tick();
  } else if (alarm.name === TICK_ALARM_NAME) {
    await timer.tick();
  }
});
```

Edge Cases to Handle

```typescript
// 1. Timer running when browser closes - state persists in storage
// 2. Multiple tabs with popup open - use runtime.sendMessage
// 3. Service worker terminated - alarms still fire, re-initialize on wake
// 4. System sleep/hibernate - recalculate time on wake
// 5. User changes system time - use Date.now() for elapsed calculation
// 6. Extension updated mid-session - state survives in storage

// Time drift correction
async function handleWake(): Promise<void> {
  const status = timer.getStatus();
  if (status.state === 'running' && status.startedAt) {
    // Recalculate time remaining
    const expectedEnd = status.startedAt + (status.timeRemaining * 1000);
    const now = Date.now();
    
    if (now >= expectedEnd) {
      // Timer should have completed
      await timer.tick();
    } else {
      // Update remaining time
      status.timeRemaining = Math.floor((expectedEnd - now) / 1000);
      timer.broadcastStatus();
    }
  }
}

chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'active') {
    handleWake();
  }
});
```

---

Testing Approach

Unit Testing Timer Logic

```typescript
// __tests__/timer.test.ts
import { PomodoroTimer } from '../src/background/timer';

// Mock Chrome APIs
const mockStorage = { get: jest.fn(), set: jest.fn() };
const mockAlarms = { create: jest.fn(), clear: jest.fn(), onAlarm: { addListener: jest.fn() } };
const mockNotifications = { create: jest.fn() };
const mockRuntime = { sendMessage: jest.fn() };

global.chrome = {
  storage: { local: mockStorage },
  alarms: mockAlarms,
  notifications: mockNotifications,
  runtime: mockRuntime,
} as unknown as typeof chrome;

describe('PomodoroTimer', () => {
  let timer: PomodoroTimer;

  beforeEach(() => {
    mockStorage.get.mockResolvedValue({ config: {}, status: null });
    timer = new PomodoroTimer();
  });

  test('initializes with default config', () => {
    const status = timer.getStatus();
    expect(status.sessionType).toBe('work');
    expect(status.state).toBe('idle');
    expect(status.timeRemaining).toBe(25 * 60);
  });

  test('starts timer and changes state', async () => {
    const status = await timer.start();
    expect(status.state).toBe('running');
    expect(mockAlarms.create).toHaveBeenCalled();
  });

  test('pauses running timer', async () => {
    await timer.start();
    const status = await timer.pause();
    expect(status.state).toBe('paused');
  });

  test('resets timer to initial state', async () => {
    await timer.start();
    await timer.reset();
    const status = timer.getStatus();
    expect(status.state).toBe('idle');
    expect(status.timeRemaining).toBe(25 * 60);
  });
});
```

Integration Testing

```typescript
// Use Puppeteer/Playwright for E2E testing
import { test, expect } from '@playwright/test';

test('popup timer flow', async ({ page }) => {
  // Load extension
  await page.goto('chrome-extension://EXTENSION_ID/popup/popup.html');
  
  // Check initial state
  await expect(page.locator('#time-display')).toHaveText('25:00');
  
  // Start timer
  await page.click('#start-btn');
  await expect(page.locator('#pause-btn')).toBeVisible();
  
  // Wait for timer to tick
  await page.waitForTimeout(2000);
  const time = await page.locator('#time-display').textContent();
  expect(time).not.toBe('25:00');
});
```

---

Performance Considerations

Service Worker Optimization

```typescript
// 1. Keep service worker alive with periodic alarms
chrome.alarms.create('keep-alive', { periodInMinutes: 5 });

// 2. Minimize storage operations - batch writes
let pendingWrites = false;
async function debouncedSave(): Promise<void> {
  if (pendingWrites) return;
  pendingWrites = true;
  setTimeout(async () => {
    await timer.saveState();
    pendingWrites = false;
  }, 1000);
}

// 3. Use requestIdleCallback for non-critical updates
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Analytics, sync, etc.
  });
}

// 4. Lazy load popup content
// In popup.html, defer script loading
<script defer src="popup.js"></script>
```

Memory Management

```typescript
// Clean up event listeners when popup closes
window.addEventListener('unload', () => {
  chrome.runtime.onMessage.removeListener(handleMessage);
});

// Release resources in content script
const overlay = new TimerOverlay();
// When tab changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause or cleanup
  }
});
```

---

Publishing Checklist

Pre-Publication Requirements

- [ ] Manifest V3 compliance (no remote code, declarativeNetRequest for blocking)
- [ ] All icons provided (16, 48, 128 px minimum)
- [ ] Privacy policy URL in developer dashboard
- [ ] Store listing assets (screenshots, promotional image)
- [ ] Version incremented in manifest.json

Testing Checklist

- [ ] Extension loads without errors in Chrome
- [ ] Timer persists across browser restarts
- [ ] Notifications display correctly
- [ ] Settings persist after extension update
- [ ] Works in Incognito mode (if applicable)
- [ ] No console errors in production build

Submission Process

1. Package extension: `npm run build` then zip output
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Create new item and upload zip
4. Fill store listing (description, screenshots, categories)
5. Submit for review (typically 1-3 days)

Post-Publication

```typescript
// Version update pattern
// 1.0.0 -> 1.0.1 (bug fixes)
// 1.0.0 -> 1.1.0 (new features)
// 1.0.0 -> 2.0.0 (breaking changes)

// In manifest.json
{
  "version": "1.1.0",
  "version_name": "1.1.0 - Custom themes added"
}
```

---

Conclusion

Building a Pomodoro timer extension demonstrates core Chrome extension development patterns including Manifest V3 configuration, service worker architecture, cross-context communication, Chrome APIs (storage, alarms, notifications), and production best practices. This guide provides a complete foundation that can be extended with features like:

- Statistics tracking and analytics
- Custom themes and customization
- Integration with task managers (Todoist, Trello)
- Desktop notifications with sounds
- Command-line quick controls
- Keyboard shortcuts

The modular architecture allows easy addition of new features while maintaining clean code organization and proper TypeScript typing throughout the application.
