---
layout: default
title: "Chrome Extension Idle Detection — Best Practices"
description: "Detect user idle state with the Idle API to pause or resume extension activities."
canonical_url: "https://bestchromeextensions.com/patterns/idle-detection/"
---

# Chrome Extension Idle Detection API Patterns

## Overview {#overview}

The Chrome Idle Detection API enables extensions to monitor user activity and respond to periods of inactivity. This is essential for building power-efficient extensions, auto-save functionality, session security, and background task scheduling. This guide covers eight practical patterns for leveraging the `chrome.idle` API effectively in production extensions.

The idle detection API operates in the background service worker and does not require any visible UI. It can detect three states: "active" when the user is interacting with the browser, "idle" when the system is unused for a configured interval, and "locked" when the screen is locked or the system is sleeping.

---

## Pattern 1: Idle API Basics {#pattern-1-idle-api-basics}

The Chrome Idle API provides four core methods for detecting and responding to user inactivity. Understanding these fundamentals is essential before implementing more complex patterns.

### Required Permission {#required-permission}

Add `"idle"` to your `manifest.json` permissions:

```json
{
  "permissions": ["idle"]
}
```

### Querying Current State {#querying-current-state}

The `chrome.idle.queryState()` method returns the current idle state synchronously:

```ts
// lib/idle-service.ts
export type IdleState = "active" | "idle" | "locked";

export class IdleService {
  private detectionInterval = 30; // seconds

  setDetectionInterval(seconds: number): void {
    // Chrome enforces minimum 15 seconds
    this.detectionInterval = Math.max(15, seconds);
    chrome.idle.setDetectionInterval(this.detectionInterval);
  }

  async getState(): Promise<IdleState> {
    return chrome.idle.queryState(this.detectionInterval);
  }

  async isIdle(): Promise<boolean> {
    const state = await this.getState();
    return state === "idle" || state === "locked";
  }
}

export const idleService = new IdleService();
```

### Listening for State Changes {#listening-for-state-changes}

The `chrome.idle.onStateChanged` event fires when the user enters or leaves an idle state:

```ts
// lib/idle-service.ts (continued)
export class IdleService {
  private listeners = new Set<(state: IdleState) => void>();

  constructor() {
    chrome.idle.onStateChanged.addListener(this.handleStateChange.bind(this));
    this.setDetectionInterval(this.detectionInterval);
  }

  private handleStateChanged(newState: IdleState): void {
    console.log(`Idle state changed: ${newState}`);
    this.listeners.forEach((listener) => listener(newState));
  }

  onStateChanged(callback: (state: IdleState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
```

### Detection Interval Constraints {#detection-interval-constraints}

Chrome enforces a minimum detection interval of 15 seconds. Setting a lower value will be ignored:

```ts
// Ensure minimum interval
const MIN_INTERVAL = 15;

export function setSafeDetectionInterval(seconds: number): void {
  const safeInterval = Math.max(MIN_INTERVAL, seconds);
  chrome.idle.setDetectionInterval(safeInterval);
  console.log(`Detection interval set to ${safeInterval} seconds`);
}
```

### Basic Usage Example {#basic-usage-example}

```ts
// background/service-worker.ts
import { idleService } from "../lib/idle-service";

idleService.setDetectionInterval(60); // Check every minute

idleService.onStateChanged((state) => {
  if (state === "idle") {
    console.log("User went idle - pause active operations");
  } else if (state === "active") {
    console.log("User returned - resume operations");
  }
});
```

The basic pattern establishes the foundation for all subsequent patterns. The key insight is that the API only polls at your specified interval, so there's a delay between actual user inactivity and the "idle" state being reported.

---

## Pattern 2: Auto-Save on Idle {#pattern-2-auto-save-on-idle}

Auto-saving data when the user becomes idle prevents data loss without interrupting workflow. This pattern is particularly useful for extensions that collect user input across multiple pages.

### Implementing Auto-Save {#implementing-auto-save}

```ts
// lib/auto-save.ts
import { idleService, IdleState } from "./idle-service";
import { Storage } from "@theluckystrike/webext-storage";

interface SaveableData {
  draftContent: string;
  lastModified: number;
  pendingChanges: boolean;
}

export class AutoSaveManager {
  private storage: Storage;
  private saveKey = "autosaveDraft";
  private debounceTimer: number | null = null;
  private debounceDelay = 2000; // 2 seconds
  private isIdle = false;

  constructor() {
    this.storage = new Storage("local");
    this.setupIdleListener();
  }

  private setupIdleListener(): void {
    idleService.onStateChanged((state) => {
      if (state === "idle" && !this.isIdle) {
        this.isIdle = true;
        this.saveImmediately(); // Save when going idle
      } else if (state === "active") {
        this.isIdle = false;
        // Resume debounced saves when active
        this.triggerDebouncedSave();
      }
    });
  }

  async saveData(data: SaveableData): Promise<void> {
    await this.storage.set(this.saveKey, {
      ...data,
      lastModified: Date.now(),
    });
  }

  private async saveImmediately(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    // Trigger actual save - implementation depends on your data source
    await this.performSave();
    console.log("Auto-saved on idle");
  }

  triggerDebouncedSave(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(async () => {
      await this.performSave();
      this.debounceTimer = null;
    }, this.debounceDelay);
  }

  private async performSave(): Promise<void> {
    // Implementation: get data from your application and save
    console.log("Performing save operation");
  }

  async loadSavedData(): Promise<SaveableData | null> {
    return this.storage.get<SaveableData>(this.saveKey);
  }
}
```

### Debouncing Considerations {#debouncing-considerations}

Debouncing saves while the user is active prevents excessive writes during rapid typing or interaction. However, when the user goes idle, you should save immediately rather than waiting for the debounce timer:

```ts
// Debounce logic for auto-save
export class SmartAutoSave {
  private pendingSave = false;
  private saveQueue: Array<() => Promise<void>> = [];

  async queueSave(saveFn: () => Promise<void>): Promise<void> {
    this.pendingSave = true;
    this.saveQueue.push(saveFn);

    // Process queue with debounce
    setTimeout(async () => {
      if (this.pendingSave) {
        await this.processSaveQueue();
        this.pendingSave = false;
      }
    }, 1000);
  }

  private async processSaveQueue(): Promise<void> {
    const lastSave = this.saveQueue[this.saveQueue.length - 1];
    if (lastSave) {
      await lastSave();
      this.saveQueue = [];
    }
  }

  async saveNow(): Promise<void> {
    if (this.saveQueue.length > 0) {
      await this.processSaveQueue();
    }
  }
}
```

### Recovery on Return {#recovery-on-return}

When the user returns to active state, check for any unsaved changes and offer recovery options:

```ts
// lib/auto-save-recovery.ts
export class AutoSaveRecovery {
  private storage: Storage;

  constructor() {
    this.storage = new Storage("local");
  }

  async checkForRecovery(): Promise<{ hasRecovery: boolean; data: unknown }> {
    const lastSave = await this.storage.get<{ lastModified: number }>("autosaveDraft");
    if (lastSave && Date.now() - lastSave.lastModified < 24 * 60 * 60 * 1000) {
      return { hasRecovery: true, data: lastSave };
    }
    return { hasRecovery: false, data: null };
  }

  async clearRecovery(): Promise<void> {
    await this.storage.remove("autosaveDraft");
  }
}
```

---

## Pattern 3: Session Timeout {#pattern-3-session-timeout}

Security-sensitive extensions should lock after periods of inactivity, requiring re-authentication when the user returns. This pattern is essential for extensions handling sensitive data or performing privileged operations.

### Session Timeout Implementation {#session-timeout-implementation}

```ts
// lib/session-manager.ts
import { idleService, IdleState } from "./idle-service";
import { Storage } from "@theluckystrike/webext-storage";

export interface SessionConfig {
  timeoutMinutes: number;
  requireReauth: boolean;
  extendOnActivity: boolean;
}

export class SessionManager {
  private storage: Storage;
  private config: SessionConfig;
  private lastActivity: number;
  private isLocked = false;
  private listeners = new Set<() => void>();

  constructor(config: Partial<SessionConfig> = {}) {
    this.storage = new Storage("local");
    this.config = {
      timeoutMinutes: config.timeoutMinutes ?? 15,
      requireReauth: config.requireReauth ?? true,
      extendOnActivity: config.extendOnActivity ?? true,
    };
    this.lastActivity = Date.now();
    this.setupIdleDetection();
    this.loadSession();
  }

  private async loadSession(): Promise<void> {
    const session = await this.storage.get<{ lastActivity: number; locked: boolean }>("session");
    if (session) {
      this.lastActivity = session.lastActivity;
      this.isLocked = session.locked;
      this.checkTimeout();
    }
  }

  private setupIdleDetection(): void {
    idleService.onStateChanged((state) => {
      if (state === "idle" || state === "locked") {
        this.handleIdleStart();
      } else if (state === "active") {
        this.handleReturnFromIdle();
      }
    });
  }

  private handleIdleStart(): void {
    this.lastActivity = Date.now();
    this.saveSession();
  }

  private handleReturnFromIdle(): void {
    if (this.isLocked) {
      // User was locked - check if we need re-auth
      this.checkTimeout();
      this.notifyListeners();
    }
    this.lastActivity = Date.now();
    this.saveSession();
  }

  private checkTimeout(): void {
    const elapsed = Date.now() - this.lastActivity;
    const timeoutMs = this.config.timeoutMinutes * 60 * 1000;

    if (elapsed > timeoutMs && !this.isLocked) {
      this.lock();
    }
  }

  lock(): void {
    this.isLocked = true;
    this.saveSession();
    this.notifyListeners();
    console.log("Session locked due to inactivity");
  }

  async unlock(password: string): Promise<boolean> {
    // Implement actual authentication logic
    const isValid = await this.verifyPassword(password);
    if (isValid) {
      this.isLocked = false;
      this.lastActivity = Date.now();
      await this.saveSession();
      this.notifyListeners();
    }
    return isValid;
  }

  private async verifyPassword(password: string): Promise<boolean> {
    // Replace with actual verification
    return password === "correct-password";
  }

  private async saveSession(): Promise<void> {
    await this.storage.set("session", {
      lastActivity: this.lastActivity,
      locked: this.isLocked,
    });
  }

  isSessionLocked(): boolean {
    return this.isLocked;
  }

  onLockStateChanged(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb());
  }

  updateConfig(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
```

### Re-Authentication UI {#re-authentication-ui}

```ts
// components/lock-screen.ts
export class LockScreen {
  private sessionManager: SessionManager;
  private container: HTMLElement | null = null;

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.sessionManager.onLockStateChanged(() => this.render());
  }

  show(): void {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "lock-screen-overlay";
      document.body.appendChild(this.container);
    }
    this.render();
  }

  private render(): void {
    if (!this.container) return;

    if (this.sessionManager.isSessionLocked()) {
      this.container.innerHTML = `
        <div class="lock-screen">
          <h2>Session Expired</h2>
          <p>Please re-enter your password to continue</p>
          <input type="password" id="unlock-password" placeholder="Password" />
          <button id="unlock-btn">Unlock</button>
          <p id="error-msg" class="error"></p>
        </div>
      `;
      this.attachHandlers();
      this.container.style.display = "flex";
    } else {
      this.container.style.display = "none";
    }
  }

  private attachHandlers(): void {
    const btn = document.getElementById("unlock-btn");
    const input = document.getElementById("unlock-password") as HTMLInputElement;
    const errorMsg = document.getElementById("error-msg");

    btn?.addEventListener("click", async () => {
      const success = await this.sessionManager.unlock(input.value);
      if (!success && errorMsg) {
        errorMsg.textContent = "Invalid password";
      }
    });
  }
}
```

---

## Pattern 4: Idle-Based Background Tasks {#pattern-4-idle-based-background-tasks}

Running resource-intensive operations during idle periods improves performance and reduces impact on user experience. This pattern combines idle detection with `chrome.alarms` for reliable scheduling.

### Background Task Scheduler {#background-task-scheduler}

```ts
// lib/idle-task-scheduler.ts
import { idleService, IdleState } from "./idle-service";

export interface BackgroundTask {
  id: string;
  priority: number;
  estimatedDuration: number; // minutes
  run: () => Promise<void>;
}

export class IdleTaskScheduler {
  private tasks: BackgroundTask[] = [];
  private isRunning = false;
  private currentTask: BackgroundTask | null = null;

  constructor() {
    idleService.onStateChanged((state) => {
      if (state === "idle") {
        this.startTaskExecution();
      } else if (state === "active") {
        this.pauseTaskExecution();
      }
    });
  }

  registerTask(task: BackgroundTask): void {
    this.tasks.push(task);
    this.tasks.sort((a, b) => a.priority - b.priority);
  }

  private async startTaskExecution(): Promise<void> {
    if (this.isRunning || this.tasks.length === 0) return;

    this.isRunning = true;
    console.log("Starting background task execution");

    while (this.isRunning && this.tasks.length > 0) {
      const currentState = await idleService.getState();
      if (currentState !== "idle" && currentState !== "locked") {
        this.pauseTaskExecution();
        return;
      }

      this.currentTask = this.tasks[0];
      console.log(`Running task: ${this.currentTask.id}`);

      try {
        await this.currentTask.run();
        this.tasks.shift(); // Remove completed task
      } catch (error) {
        console.error(`Task ${this.currentTask.id} failed:`, error);
        // Move to end of queue for retry
        const failedTask = this.tasks.shift();
        if (failedTask) {
          this.tasks.push(failedTask);
        }
      }

      this.currentTask = null;
    }

    this.isRunning = false;
  }

  private pauseTaskExecution(): void {
    if (this.currentTask) {
      console.log(`Pausing task: ${this.currentTask.id}`);
    }
    this.isRunning = false;
  }

  getStatus(): { isRunning: boolean; currentTask: string | null; pending: number } {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask?.id ?? null,
      pending: this.tasks.length,
    };
  }
}
```

### Combining with Chrome Alarms {#combining-with-chrome-alarms}

Use chrome.alarms for periodic checks that survive service worker restarts:

```ts
// lib/alarm-scheduler.ts
export class AlarmScheduler {
  private scheduler: IdleTaskScheduler;

  constructor(scheduler: IdleTaskScheduler) {
    this.scheduler = scheduler;
    this.setupAlarm();
  }

  private setupAlarm(): void {
    chrome.alarms.create("idleTaskCheck", {
      periodInMinutes: 5,
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "idleTaskCheck") {
        this.checkAndRunTasks();
      }
    });
  }

  private async checkAndRunTasks(): Promise<void> {
    const state = await chrome.idle.queryState(30);
    if (state === "idle" || state === "locked") {
      // Alarms can wake the service worker, then idle detection triggers tasks
      console.log("Alarm triggered - checking if we can run tasks");
    }
  }
}
```

### Example: Data Sync Task {#example-data-sync-task}

```ts
// lib/tasks/sync-task.ts
import { BackgroundTask } from "./idle-task-scheduler";
import { Storage } from "@theluckystrike/webext-storage";

export class SyncTask implements BackgroundTask {
  id = "data-sync";
  priority = 1;
  estimatedDuration = 5;

  private storage = new Storage("sync");

  async run(): Promise<void> {
    console.log("Starting data sync...");

    const pendingChanges = await this.storage.get<unknown[]>("pendingChanges");
    if (!pendingChanges || pendingChanges.length === 0) {
      console.log("No pending changes to sync");
      return;
    }

    // Simulate API sync
    for (const change of pendingChanges) {
      await this.syncChange(change);
    }

    await this.storage.remove("pendingChanges");
    console.log(`Synced ${pendingChanges.length} changes`);
  }

  private async syncChange(change: unknown): Promise<void> {
    // Replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
```

---

## Pattern 5: Activity Tracking Dashboard {#pattern-5-activity-tracking-dashboard}

Tracking user activity helps understand engagement and identify patterns. This pattern implements a comprehensive activity tracking system with session data and visualization.

### Activity Tracking Service {#activity-tracking-service}

```ts
// lib/activity-tracker.ts
import { idleService, IdleState } from "./idle-service";
import { Storage } from "@theluckystrike/webext-storage";

export interface ActivitySession {
  id: string;
  startTime: number;
  endTime: number | null;
  activeTime: number;
  idleTime: number;
  lockedTime: number;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  totalActiveTime: number;
  totalIdleTime: number;
  totalLockedTime: number;
  sessions: ActivitySession[];
}

export class ActivityTracker {
  private storage: Storage;
  private currentSession: ActivitySession | null = null;
  private lastState: IdleState = "active";
  private stateTimers = {
    active: 0,
    idle: 0,
    locked: 0,
  };
  private pollInterval: number | null = null;

  constructor() {
    this.storage = new Storage("local");
    this.startTracking();
  }

  private startTracking(): void {
    this.startSession();
    this.startPolling();

    idleService.onStateChanged((state) => {
      this.handleStateChange(state);
    });
  }

  private startSession(): void {
    this.currentSession = {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      endTime: null,
      activeTime: 0,
      idleTime: 0,
      lockedTime: 0,
    };
    this.lastState = "active";
    this.stateTimers = { active: 0, idle: 0, locked: 0 };
  }

  private startPolling(): void {
    this.pollInterval = window.setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick(): void {
    if (this.lastState) {
      this.stateTimers[this.lastState]++;
    }
  }

  private handleStateChange(newState: IdleState): void {
    // Accumulate time for previous state
    if (this.currentSession) {
      this.currentSession[this.lastState + "Time"] += this.stateTimers[this.lastState];
      this.stateTimers[this.lastState] = 0;
    }

    this.lastState = newState;

    if (newState === "active") {
      // Session continues
    }
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) return;

    if (this.lastState && this.stateTimers[this.lastState] > 0) {
      this.currentSession[this.lastState + "Time"] += this.stateTimers[this.lastState];
    }

    this.currentSession.endTime = Date.now();

    // Save to daily activity
    await this.saveSession(this.currentSession);

    this.currentSession = null;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async saveSession(session: ActivitySession): Promise<void> {
    const date = new Date().toISOString().split("T")[0];
    const key = `activity_${date}`;

    const daily = await this.storage.get<DailyActivity>(key) || {
      date,
      totalActiveTime: 0,
      totalIdleTime: 0,
      totalLockedTime: 0,
      sessions: [],
    };

    daily.totalActiveTime += session.activeTime;
    daily.totalIdleTime += session.idleTime;
    daily.totalLockedTime += session.lockedTime;
    daily.sessions.push(session);

    await this.storage.set(key, daily);
  }

  async getDailyActivity(date: string): Promise<DailyActivity | null> {
    return this.storage.get<DailyActivity>(`activity_${date}`);
  }

  async getWeeklyActivity(): Promise<DailyActivity[]> {
    const result: DailyActivity[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayActivity = await this.getDailyActivity(dateStr);
      if (dayActivity) {
        result.push(dayActivity);
      }
    }

    return result;
  }
}
```

### Dashboard Component {#dashboard-component}

```ts
// components/activity-dashboard.ts
import { ActivityTracker, DailyActivity } from "../lib/activity-tracker";

export class ActivityDashboard {
  private tracker: ActivityTracker;
  private container: HTMLElement;

  constructor(containerId: string) {
    this.tracker = new ActivityTracker();
    this.container = document.getElementById(containerId)!;
    this.render();
  }

  async render(): Promise<void> {
    const weeklyData = await this.tracker.getWeeklyActivity();
    const today = weeklyData[0];

    this.container.innerHTML = `
      <div class="activity-dashboard">
        <h2>Today's Activity</h2>
        <div class="stats">
          <div class="stat">
            <span class="label">Active</span>
            <span class="value">${this.formatTime(today?.totalActiveTime ?? 0)}</span>
          </div>
          <div class="stat">
            <span class="label">Idle</span>
            <span class="value">${this.formatTime(today?.totalIdleTime ?? 0)}</span>
          </div>
          <div class="stat">
            <span class="label">Locked</span>
            <span class="value">${this.formatTime(today?.totalLockedTime ?? 0)}</span>
          </div>
        </div>
        <div class="chart">
          ${this.renderChart(weeklyData)}
        </div>
      </div>
    `;
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  private renderChart(data: DailyActivity[]): string {
    // Simple bar chart representation
    const maxTime = Math.max(
      ...data.map((d) => d.totalActiveTime + d.totalIdleTime),
      1
    );

    return data
      .reverse()
      .map((day) => {
        const activePercent = (day.totalActiveTime / maxTime) * 100;
        const idlePercent = (day.totalIdleTime / maxTime) * 100;
        return `
          <div class="chart-bar">
            <div class="bar-label">${day.date.slice(5)}</div>
            <div class="bar-container">
              <div class="bar active" style="width: ${activePercent}%"></div>
              <div class="bar idle" style="width: ${idlePercent}%"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }
}
```

---

## Pattern 6: Smart Notifications {#pattern-6-smart-notifications}

Intelligent notification handling based on idle state improves user experience by avoiding interruptions and ensuring important messages aren't missed.

### Notification Queue Manager {#notification-queue-manager}

```ts
// lib/smart-notifications.ts
import { idleService, IdleState } from "./idle-service";
import { Storage } from "@theluckystrike/webext-storage";
import { Messenger, MessageType } from "@theluckystrike/webext-messaging";

export interface Notification {
  id: string;
  title: string;
  message: string;
  priority: "low" | "normal" | "high";
  createdAt: number;
  deliveredAt?: number;
}

export class SmartNotificationManager {
  private storage: Storage;
  private pendingNotifications: Notification[] = [];
  private isInitialized = false;

  constructor() {
    this.storage = new Storage("local");
    this.init();
  }

  private async init(): Promise<void> {
    const queued = await this.storage.get<Notification[]>("pendingNotifications");
    this.pendingNotifications = queued || [];
    this.isInitialized = true;

    idleService.onStateChanged((state) => {
      if (state === "active") {
        this.flushPendingNotifications();
      }
    });
  }

  async queueNotification(
    title: string,
    message: string,
    priority: Notification["priority"] = "normal"
  ): Promise<void> {
    const notification: Notification = {
      id: crypto.randomUUID(),
      title,
      message,
      priority,
      createdAt: Date.now(),
    };

    const currentState = await idleService.getState();

    if (currentState === "active") {
      await this.showNotification(notification);
    } else {
      this.pendingNotifications.push(notification);
      await this.savePendingNotifications();
    }
  }

  private async showNotification(notification: Notification): Promise<void> {
    return new Promise((resolve) => {
      chrome.notifications.create(
        notification.id,
        {
          type: "basic",
          iconUrl: "icons/icon-48.png",
          title: notification.title,
          message: notification.message,
          priority: notification.priority === "high" ? 2 : 1,
        },
        () => {
          notification.deliveredAt = Date.now();
          resolve();
        }
      );
    });
  }

  private async flushPendingNotifications(): Promise<void> {
    if (this.pendingNotifications.length === 0) return;

    // Sort by priority and created time
    this.pendingNotifications.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.createdAt - b.createdAt;
    });

    // Show each notification with delay to avoid overwhelming
    for (const notification of this.pendingNotifications) {
      await this.showNotification(notification);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.pendingNotifications = [];
    await this.savePendingNotifications();
  }

  private async savePendingNotifications(): Promise<void> {
    await this.storage.set("pendingNotifications", this.pendingNotifications);
  }

  getPendingCount(): number {
    return this.pendingNotifications.length;
  }

  async clearPending(): Promise<void> {
    this.pendingNotifications = [];
    await this.savePendingNotifications();
  }
}
```

### Different Behavior for Locked vs Idle {#different-behavior-for-locked-vs-idle}

```ts
// lib/notification-strategies.ts
export type IdleSubState = "idle" | "locked";

export interface NotificationStrategy {
  shouldNotify(state: IdleSubState, notification: Notification): boolean;
  getDelay(state: IdleSubState): number;
}

export class AggressiveNotificationStrategy implements NotificationStrategy {
  shouldNotify(state: IdleSubState, notification: Notification): boolean {
    // Only suppress low priority when locked
    if (state === "locked" && notification.priority === "low") {
      return false;
    }
    return notification.priority !== "low";
  }

  getDelay(state: IdleSubState): number {
    // Immediate delivery when returning to active
    return 0;
  }
}

export class ConservativeNotificationStrategy implements NotificationStrategy {
  shouldNotify(state: IdleSubState, notification: Notification): boolean {
    // Suppress all except high priority when idle or locked
    return notification.priority === "high";
  }

  getDelay(state: IdleSubState): number {
    // Wait 5 seconds after returning to active
    return state === "locked" ? 5000 : 2000;
  }
}
```

---

## Pattern 7: Power-Aware Extensions {#pattern-7-power-aware-extensions}

Extensions should be mindful of system resources, reducing activity during idle periods to conserve battery and system performance.

### Power State Manager {#power-state-manager}

```ts
// lib/power-manager.ts
import { idleService, IdleState } from "./idle-service";

export interface PowerConfig {
  pollingIntervalActive: number;
  pollingIntervalIdle: number;
  pauseWebSocketIdle: boolean;
  reduceAnimationIdle: boolean;
}

export class PowerManager {
  private config: PowerConfig;
  private currentMode: "active" | "idle" = "active";
  private listeners = new Set<(mode: "active" | "idle") => void>();

  constructor(config: Partial<PowerConfig> = {}) {
    this.config = {
      pollingIntervalActive: config.pollingIntervalActive ?? 5000,
      pollingIntervalIdle: config.pollingIntervalIdle ?? 60000,
      pauseWebSocketIdle: config.pauseWebSocketIdle ?? true,
      reduceAnimationIdle: config.reduceAnimationIdle ?? true,
    };

    idleService.onStateChanged((state) => this.handleStateChange(state));
  }

  private handleStateChange(state: IdleState): void {
    const newMode = state === "active" ? "active" : "idle";

    if (newMode !== this.currentMode) {
      this.currentMode = newMode;
      this.applyPowerSettings();
      this.notifyListeners();
    }
  }

  private applyPowerSettings(): void {
    if (this.currentMode === "idle") {
      console.log("Entering low power mode");
      this.enablePowerSaving();
    } else {
      console.log("Resuming normal power mode");
      this.disablePowerSaving();
    }
  }

  private enablePowerSaving(): void {
    // Stop high-frequency polling
    // Pause WebSocket connections
    // Reduce animation frame rates
  }

  private disablePowerSaving(): void {
    // Resume normal polling
    // Reconnect WebSocket
    // Restore animation frame rates
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb(this.currentMode));
  }

  onPowerModeChanged(callback: (mode: "active" | "idle") => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getPollingInterval(): number {
    return this.currentMode === "active"
      ? this.config.pollingIntervalActive
      : this.config.pollingIntervalIdle;
  }

  getCurrentMode(): "active" | "idle" {
    return this.currentMode;
  }
}
```

### WebSocket Integration {#websocket-integration}

```ts
// lib/power-websocket.ts
import { PowerManager } from "./power-manager";

export class PowerAwareWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private powerManager: PowerManager;
  private reconnectTimer: number | null = null;
  private messageQueue: string[] = [];

  constructor(url: string, powerManager: PowerManager) {
    this.url = url;
    this.powerManager = powerManager;
    this.setupPowerListener();
  }

  private setupPowerListener(): void {
    this.powerManager.onPowerModeChanged((mode) => {
      if (mode === "idle") {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  connect(): void {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (event) => this.handleMessage(event);
    this.ws.onclose = () => this.handleClose();
  }

  private pause(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.ws = null;
      console.log("WebSocket paused due to idle");
    }
  }

  private async resume(): Promise<void> {
    // Flush queued messages
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      if (msg) this.send(msg);
    }

    this.connect();
    console.log("WebSocket resumed");
  }

  send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.messageQueue.push(data);
    }
  }

  private handleMessage(event: MessageEvent): void {
    // Process message
  }

  private handleClose(): void {
    if (this.powerManager.getCurrentMode() === "active") {
      // Schedule reconnect
      this.reconnectTimer = window.setTimeout(() => this.connect(), 5000);
    }
  }
}
```

---

## Pattern 8: Multi-Device Idle Awareness {#pattern-8-multi-device-idle-awareness}

For users with multiple devices, sharing idle state enables coordinated behavior across all their installations.

### Multi-Device State Sync {#multi-device-state-sync}

```ts
// lib/multi-device-idle.ts
import { idleService, IdleState } from "./idle-service";
import { Storage } from "@theluckystrike/webext-storage";
import { Messenger, MessageType } from "@theluckystrike/webext-messaging";

export interface DeviceState {
  deviceId: string;
  deviceName: string;
  lastActive: number;
  idleState: IdleState;
}

export class MultiDeviceIdleManager {
  private storage: Storage;
  private messenger: Messenger;
  private deviceId: string;
  private deviceName: string;
  private syncInterval: number | null = null;

  constructor(deviceId: string, deviceName: string) {
    this.storage = new Storage("sync");
    this.messenger = new Messenger();
    this.deviceId = deviceId;
    this.deviceName = deviceName;

    this.init();
  }

  private async init(): Promise<void> {
    // Report initial state
    await this.reportState("active");

    // Listen for state changes
    idleService.onStateChanged(async (state) => {
      await this.reportState(state);
    });

    // Periodic sync
    this.syncInterval = window.setInterval(() => {
      this.syncDeviceStates();
    }, 60000);
  }

  private async reportState(state: IdleState): Promise<void> {
    const deviceState: DeviceState = {
      deviceId: this.deviceId,
      deviceName: this.deviceName,
      lastActive: Date.now(),
      idleState: state,
    };

    // Store locally
    await this.storage.set(`device_${this.deviceId}`, deviceState);

    // Broadcast to other devices via sync storage
    await this.broadcastState(deviceState);
  }

  private async broadcastState(state: DeviceState): Promise<void> {
    // Use chrome.storage.sync for cross-device sync
    const devices = await this.storage.get<Record<string, DeviceState>>("allDevices") || {};
    devices[this.deviceId] = state;
    await this.storage.set("allDevices", devices);
  }

  private async syncDeviceStates(): Promise<void> {
    const devices = await this.storage.get<Record<string, DeviceState>>("allDevices");
    // Clean up stale entries (>5 minutes old)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const activeDevices: Record<string, DeviceState> = {};

    for (const [id, state] of Object.entries(devices || {})) {
      if (state.lastActive > fiveMinutesAgo) {
        activeDevices[id] = state;
      }
    }

    await this.storage.set("allDevices", activeDevices);
  }

  async getOtherDevices(): Promise<DeviceState[]> {
    const devices = await this.storage.get<Record<string, DeviceState>>("allDevices");
    return Object.values(devices || {}).filter(
      (d) => d.deviceId !== this.deviceId
    );
  }

  async getMostActiveDevice(): Promise<DeviceState | null> {
    const devices = await this.getOtherDevices();
    if (devices.length === 0) return null;

    return devices.reduce((most, current) =>
      current.lastActive > most.lastActive ? current : most
    );
  }

  async coordinateTask(taskId: string): Promise<boolean> {
    // Check if any other device is active before starting a task
    const devices = await this.getOtherDevices();
    const hasActiveDevice = devices.some((d) => d.idleState === "active");

    if (hasActiveDevice) {
      console.log("Another device is active, deferring task");
      return false;
    }

    console.log("No active devices, proceeding with task");
    return true;
  }
}
```

### Device Status Display {#device-status-display}

```ts
// components/device-status.ts
import { MultiDeviceIdleManager, DeviceState } from "../lib/multi-device-idle";

export class DeviceStatusPanel {
  private manager: MultiDeviceIdleManager;
  private container: HTMLElement;
  private updateInterval: number | null = null;

  constructor(containerId: string, manager: MultiDeviceIdleManager) {
    this.manager = manager;
    this.container = document.getElementById(containerId)!;
    this.startUpdates();
  }

  private startUpdates(): void {
    this.render();
    this.updateInterval = window.setInterval(() => this.render(), 30000);
  }

  private async render(): Promise<void> {
    const devices = await this.manager.getOtherDevices();

    this.container.innerHTML = `
      <div class="device-status">
        <h3>Other Devices</h3>
        ${devices.length === 0 ? "<p>No other devices connected</p>" : ""}
        ${devices
          .map(
            (device) => `
          <div class="device-item">
            <span class="device-name">${device.deviceName}</span>
            <span class="device-status ${device.idleState}">
              ${device.idleState}
            </span>
            <span class="last-active">
              Last active: ${this.formatLastActive(device.lastActive)}
            </span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  private formatLastActive(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
```

---

## Summary Table {#summary-table}

| Pattern | Use Case | Key API Methods | Dependencies |
|---------|----------|-----------------|---------------|
| **1: Idle API Basics** | Foundation for all idle detection | `chrome.idle.queryState()`, `chrome.idle.onStateChanged`, `chrome.idle.setDetectionInterval` | `idle` permission |
| **2: Auto-Save on Idle** | Prevent data loss, debounce saves | Idle state listener + storage | `@theluckystrike/webext-storage` |
| **3: Session Timeout** | Security, re-authentication | Idle detection + timeout logic | `@theluckystrike/webext-storage` |
| **4: Background Tasks** | Sync, cleanup, indexing | `chrome.alarms` + idle listener | None |
| **5: Activity Dashboard** | Analytics, engagement tracking | Time tracking + storage | `@theluckystrike/webext-storage` |
| **6: Smart Notifications** | Intelligent notification handling | State detection + chrome.notifications | `@theluckystrike/webext-storage`, `@theluckystrike/webext-messaging` |
| **7: Power-Aware** | Battery optimization | Dynamic polling intervals, WebSocket pause | None |
| **8: Multi-Device** | Cross-device coordination | `chrome.storage.sync` | `@theluckystrike/webext-storage`, `@theluckystrike/webext-messaging` |

### Common Considerations {#common-considerations}

- **Minimum detection interval**: Chrome enforces 15 seconds minimum for `setDetectionInterval()`
- **Permission requirement**: All patterns require `"idle"` in manifest permissions
- **Service worker limitations**: Idle detection works in background contexts; ensure your logic handles service worker termination
- **Battery impact**: More frequent polling consumes more battery; balance responsiveness with power efficiency
- **Cross-device sync**: Patterns 3, 5, and 8 benefit from `@theluckystrike/webext-storage` for persistent state
- **Message passing**: Use `@theluckystrike/webext-messaging` to coordinate idle state across extension contexts

These patterns provide a comprehensive toolkit for building responsive, power-efficient Chrome extensions that adapt to user behavior.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
