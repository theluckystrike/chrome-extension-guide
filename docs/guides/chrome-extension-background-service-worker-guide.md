---

title: "Chrome Extension Background Service Worker Guide — Complete MV3 Implementation"
description: "Master Chrome extension background service workers in Manifest V3. Learn TypeScript patterns, alarms API, keep-alive strategies, state management, and build production-ready extensions."
canonical_url: "https://bestchromeextensions.com/docs/guides/chrome-extension-background-service-worker-guide/"
last_modified_at: 2026-01-15

---

# Chrome Extension Background Service Worker Guide — Complete MV3 Implementation

The background service worker is the backbone of any sophisticated Chrome extension built with Manifest V3. Unlike the persistent background pages of Manifest V2, service workers in MV3 are ephemeral by design—they activate when needed and terminate after periods of inactivity. This architectural shift demands a fundamentally different approach to extension development.

Whether you're building a simple productivity tool or a complex enterprise extension like [Tab Suspender Pro](https://chromewebstore.google.com/detail/tab-suspender-pro/eahnkhaildghmcagjdckcobbkjhniapn), understanding the service worker lifecycle is essential for creating reliable, performant Chrome extensions that pass review and delight users.

## Understanding the Service Worker Lifecycle

The background service worker in Chrome extensions represents a paradigm shift from the always-on background pages of Manifest V2. In MV3, service workers follow an event-driven lifecycle that dramatically affects how you architect your extension's background logic.

### How Service Workers Work in MV3

When Chrome needs to handle an event for your extension— whether from a timer, a network request, or a message from a content script—it wakes up your service worker, executes the relevant event handler, and then terminates the worker after approximately 30 seconds of inactivity. This design improves security, reduces resource consumption, and prevents runaway scripts from consuming excessive memory.

```typescript
// src/background/service-worker.ts

/**
 * This runs EVERY time the service worker activates
 * Unlike MV2, we cannot rely on global state persisting
 * between service worker invocations
 */
console.log('[Service Worker] Starting up');

// ❌ UNRELIABLE: Global variables reset on each wake-up
let cachedUserData: UserData | null = null;
let applicationState: ApplicationState = {};

// ✅ RELIABLE: Use chrome.storage for persistence
class BackgroundServiceWorker {
  private storage: ChromeStorageManager;
  private stateManager: StateManager;
  private alarmScheduler: AlarmScheduler;
  
  constructor() {
    this.storage = new ChromeStorageManager();
    this.stateManager = new StateManager();
    this.alarmScheduler = new AlarmScheduler();
  }

  async initialize(): Promise<void> {
    // ALWAYS restore state on every wake-up
    await this.stateManager.restore();
    
    // Register event listeners
    this.registerAlarmListeners();
    this.registerMessageListeners();
    this.registerLifecycleListeners();
    
    console.log('[Service Worker] Initialized successfully');
  }

  private registerAlarmListeners(): void {
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      // Restore state before handling any alarm
      await this.stateManager.restore();
      
      switch (alarm.name) {
        case 'periodic-sync':
          await this.performDataSync();
          break;
        case 'tab-suspension-check':
          await this.checkIdleTabs();
          break;
        case 'keep-alive':
          // Minimal work to maintain worker life
          break;
      }
    });
  }

  private registerMessageListeners(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender).then(sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  private registerLifecycleListeners(): void {
    chrome.runtime.onInstalled.addListener(async (details) => {
      await this.handleInstallation(details);
    });

    chrome.runtime.onStartup.addListener(async () => {
      await this.stateManager.restore();
      this.alarmScheduler.startPeriodicTasks();
    });
  }

  private async handleMessage(
    message: ExtensionMessage, 
    sender: chrome.runtime.MessageSender
  ): Promise<ExtensionResponse> {
    switch (message.action) {
      case 'get-state':
        return { success: true, data: this.stateManager.getState() };
        
      case 'start-sync':
        await this.performDataSync();
        return { success: true };
        
      case 'suspend-tab':
        await this.suspendTab(message.tabId);
        return { success: true };
        
      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  private async performDataSync(): Promise<void> {
    console.log('[Service Worker] Performing data sync...');
    // Implementation for data synchronization
  }

  private async checkIdleTabs(): Promise<void> {
    // Implementation similar to Tab Suspender Pro
  }

  private async suspendTab(tabId: number): Promise<void> {
    // Implementation for tab suspension
  }

  private async handleInstallation(
    details: chrome.runtime.InstalledDetails
  ): Promise<void> {
    await this.stateManager.initializeDefaults();
    this.alarmScheduler.startPeriodicTasks();
  }
}

// Initialize the service worker
const background = new BackgroundServiceWorker();
background.initialize();
```

### The Implications of Ephemeral Execution

Understanding that your service worker starts fresh on each invocation has profound implications for how you design your extension. Any data you need across invocations must be persisted to `chrome.storage` or `chrome.storage.session`. This includes user preferences, cached data, authentication tokens, and application state.

## Working with the chrome.alarms API

The `chrome.alarms` API is your primary tool for scheduling recurring or delayed tasks in a service worker. Unlike JavaScript's `setTimeout` and `setInterval`, alarms persist across service worker restarts and are specifically designed for the extension environment.

### Creating and Managing Alarms

```typescript
// src/background/alarm-scheduler.ts

interface AlarmConfig {
  name: string;
  delayInMinutes?: number;
  periodInMinutes?: number;
  when?: number;
}

class AlarmScheduler {
  private activeAlarms: Map<string, chrome.alarms.Alarm> = new Map();

  /**
   * Create a repeating alarm
   */
  async createRepeatingAlarm(
    name: string, 
    intervalMinutes: number
  ): Promise<void> {
    // Clear existing alarm with same name if it exists
    await chrome.alarms.clear(name);
    
    chrome.alarms.create(name, {
      delayInMinutes: intervalMinutes,
      periodInMinutes: intervalMinutes
    });
    
    console.log(`[AlarmScheduler] Created repeating alarm: ${name} (every ${intervalMinutes} min)`);
  }

  /**
   * Create a one-time alarm for a specific time
   */
  async createOneTimeAlarm(
    name: string, 
    delayMinutes: number
  ): Promise<void> {
    await chrome.alarms.clear(name);
    
    chrome.alarms.create(name, {
      delayInMinutes: delayMinutes,
      when: Date.now() + delayMinutes * 60 * 1000
    });
    
    console.log(`[AlarmScheduler] Created one-time alarm: ${name} (in ${delayMinutes} min)`);
  }

  /**
   * Schedule multiple alarms for complex workflows
   */
  async scheduleTabSuspensionWorkflow(): Promise<void> {
    // Check idle tabs every minute
    await this.createRepeatingAlarm('idle-tab-check', 1);
    
    // Perform deep cleanup every 30 minutes
    await this.createRepeatingAlarm('deep-cleanup', 30);
    
    // Save state every 5 minutes
    await this.createRepeatingAlarm('state-save', 5);
  }

  /**
   * Get all active alarms
   */
  async getActiveAlarms(): Promise<chrome.alarms.Alarm[]> {
    return new Promise((resolve) => {
      chrome.alarms.getAll((alarms) => {
        this.activeAlarms.clear();
        alarms.forEach(alarm => this.activeAlarms.set(alarm.name, alarm));
        resolve(alarms);
      });
    });
  }

  /**
   * Cancel a specific alarm
   */
  async cancelAlarm(name: string): Promise<void> {
    await chrome.alarms.clear(name);
    this.activeAlarms.delete(name);
    console.log(`[AlarmScheduler] Cancelled alarm: ${name}`);
  }

  startPeriodicTasks(): void {
    this.scheduleTabSuspensionWorkflow().catch(err => {
      console.error('[AlarmScheduler] Failed to start periodic tasks:', err);
    });
  }
}
```

### Advanced Alarm Patterns with TypeScript

For extensions requiring sophisticated scheduling logic, implement dynamic alarm management:

```typescript
// src/background/dynamic-alarm-manager.ts

interface TaskSchedule {
  taskId: string;
  priority: 'high' | 'normal' | 'low';
  baseInterval: number;
  currentInterval: number;
}

class DynamicAlarmManager {
  private schedules: Map<string, TaskSchedule> = new Map();
  private readonly PRIORITY_INTERVALS = {
    high: 1,
    normal: 5,
    low: 30
  };

  /**
   * Schedule a task with dynamic interval adjustment
   */
  scheduleTask(taskId: string, priority: 'high' | 'normal' | 'low' = 'normal'): void {
    const baseInterval = this.PRIORITY_INTERVALS[priority];
    
    const schedule: TaskSchedule = {
      taskId,
      priority,
      baseInterval,
      currentInterval: baseInterval
    };
    
    this.schedules.set(taskId, schedule);
    
    chrome.alarms.create(`task-${taskId}`, {
      delayInMinutes: baseInterval,
      periodInMinutes: baseInterval
    });
    
    console.log(`[DynamicAlarmManager] Scheduled task: ${taskId} (${priority})`);
  }

  /**
   * Adjust task priority dynamically
   */
  adjustPriority(taskId: string, newPriority: 'high' | 'normal' | 'low'): void {
    const schedule = this.schedules.get(taskId);
    if (!schedule) return;
    
    const oldInterval = schedule.currentInterval;
    schedule.priority = newPriority;
    schedule.currentInterval = this.PRIORITY_INTERVALS[newPriority];
    
    // Reschedule with new interval
    chrome.alarms.clear(`task-${taskId}`);
    chrome.alarms.create(`task-${taskId}`, {
      delayInMinutes: schedule.currentInterval,
      periodInMinutes: schedule.currentInterval
    });
    
    console.log(`[DynamicAlarmManager] Adjusted ${taskId}: ${oldInterval} -> ${schedule.currentInterval} min`);
  }

  /**
   * Store alarm-related data in chrome.storage
   * since alarms cannot carry payload
   */
  async storeTaskData(taskId: string, data: unknown): Promise<void> {
    const storageKey = `task-data-${taskId}`;
    await chrome.storage.local.set({ [storageKey]: data });
  }

  async retrieveTaskData<T>(taskId: string): Promise<T | null> {
    const storageKey = `task-data-${taskId}`;
    const result = await chrome.storage.local.get(storageKey);
    return result[storageKey] as T | null;
  }
}
```

## Keep-Alive Strategies for Long-Running Operations

Keeping your service worker alive when you need it is a common challenge in MV3. The 30-second idle timeout means you must actively maintain the worker's lifecycle or use alternative approaches for long-running operations.

### The Alarm-Based Keep-Alive Pattern

The most common keep-alive strategy involves using chrome.alarms to periodically "ping" the service worker, resetting the idle timer:

```typescript
// src/background/keep-alive-manager.ts

class KeepAliveManager {
  private static readonly PING_INTERVAL_MINUTES = 0.5; // 30 seconds
  private static readonly KEEP_ALIVE_ALARM = 'keep-alive-ping';
  
  private isActive: boolean = false;
  private activeTaskCount: number = 0;

  /**
   * Start the keep-alive mechanism
   */
  start(): void {
    if (this.isActive) return;
    
    chrome.alarms.create(KeepAliveManager.KEEP_ALIVE_ALARM, {
      periodInMinutes: KeepAliveManager.PING_INTERVAL_MINUTES
    });
    
    this.isActive = true;
    console.log('[KeepAliveManager] Started keep-alive');
  }

  /**
   * Stop the keep-alive mechanism
   */
  stop(): void {
    if (!this.isActive) return;
    
    chrome.alarms.clear(KeepAliveManager.KEEP_ALIVE_ALARM);
    this.isActive = false;
    this.activeTaskCount = 0;
    console.log('[KeepAliveManager] Stopped keep-alive');
  }

  /**
   * Register interest in keeping the worker alive
   * Call startTask before long operation, endTask after
   */
  startTask(taskId: string): void {
    this.activeTaskCount++;
    if (!this.isActive) {
      this.start();
    }
    console.log(`[KeepAliveManager] Task started: ${taskId} (${this.activeTaskCount} active)`);
  }

  /**
   * Unregister interest - stop when all tasks complete
   */
  endTask(taskId: string): void {
    this.activeTaskCount = Math.max(0, this.activeTaskCount - 1);
    
    if (this.activeTaskCount === 0) {
      this.stop();
    }
    
    console.log(`[KeepAliveManager] Task ended: ${taskId} (${this.activeTaskCount} active)`);
  }

  /**
   * Handle the keep-alive ping
   */
  handlePing(): void {
    // Minimal work - mere existence of this handler keeps worker alive
    console.debug('[KeepAliveManager] Keep-alive ping received');
  }

  isAlive(): boolean {
    return this.isActive;
  }
}

// Singleton instance
const keepAliveManager = new KeepAliveManager();
```

### Using Offscreen Documents for Extended Operations

For operations that genuinely need a DOM or longer execution time, offscreen documents provide a better solution than forcing the service worker to stay awake:

```typescript
// src/background/offscreen-manager.ts

interface OffscreenDocument {
  url: string;
  reasons: chrome.offscreen.Reason[];
  justification: string;
}

class OffscreenDocumentManager {
  private static readonly OFFSCREEN_URL = 'offscreen.html';
  
  /**
   * Create an offscreen document for long-running operations
   */
  async createDocument(
    reason: string,
    primaryReason: chrome.offscreen.Reason = chrome.offscreen.Reason.DOM_SCRAPING
  ): Promise<void> {
    // Check if offscreen document already exists
    const existingClients = await this.getOffscreenClients();
    
    if (existingClients.length > 0) {
      console.log('[OffscreenManager] Using existing offscreen document');
      return;
    }

    await chrome.offscreen.createDocument({
      url: OffscreenDocumentManager.OFFSCREEN_URL,
      reasons: [primaryReason],
      justification: reason
    });
    
    console.log('[OffscreenManager] Created new offscreen document');
  }

  /**
   * Get all active offscreen clients
   */
  async getOffscreenClients(): Promise<WindowClient[]> {
    const allClients = await clients.matchAll({
      includeUncontrolled: true
    });
    
    return allClients.filter(client => client.type === 'offscreen');
  }

  /**
   * Send message to offscreen document
   */
  async sendMessage<TRequest, TResponse>(
    action: string, 
    data?: TRequest
  ): Promise<TResponse> {
    const clients = await this.getOffscreenClients();
    
    if (clients.length === 0) {
      throw new Error('No offscreen document available');
    }

    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          target: 'offscreen',
          action,
          data
        },
        (response: TResponse | undefined) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response as TResponse);
          }
        }
      );
    });
  }

  /**
   * Close the offscreen document
   */
  async closeDocument(): Promise<void> {
    const clients = await this.getOffscreenClients();
    
    for (const client of clients) {
      await client.close();
    }
    
    console.log('[OffscreenManager] Closed offscreen documents');
  }
}
```

## State Persistence Patterns

Since service workers don't maintain state between invocations, you must persist any critical data to storage. This section covers the patterns and best practices for maintaining state across service worker lifecycles.

### Comprehensive Storage Management

```typescript
// src/background/storage-manager.ts

interface StorageOptions {
  namespace: string;
  useSessionStorage?: boolean;
}

interface StorageItem<T> {
  value: T;
  timestamp: number;
  version: number;
}

class ChromeStorageManager {
  private namespace: string;
  private useSessionStorage: boolean;
  private memoryCache: Map<string, unknown> = new Map();
  private initialized: boolean = false;

  constructor(options: StorageOptions) {
    this.namespace = options.namespace;
    this.useSessionStorage = options.useSessionStorage ?? false;
  }

  private getStorage(): typeof chrome.storage.local | typeof chrome.storage.session {
    return this.useSessionStorage 
      ? chrome.storage.session 
      : chrome.storage.local;
  }

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Initialize by loading all namespace data into memory
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const storage = this.getStorage();
    const allData = await storage.get(null);
    
    this.memoryCache.clear();
    
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith(`${this.namespace}:`)) {
        this.memoryCache.set(key, value);
      }
    }
    
    this.initialized = true;
    console.log(`[StorageManager] Initialized with ${this.memoryCache.size} items`);
  }

  /**
   * Get a value from storage
   */
  async get<T>(key: string): Promise<T | undefined> {
    await this.initialize();
    
    const fullKey = this.getKey(key);
    
    // Try memory cache first
    if (this.memoryCache.has(fullKey)) {
      return this.memoryCache.get(fullKey) as T;
    }
    
    // Fall back to storage
    const storage = this.getStorage();
    const result = await storage.get(fullKey);
    
    if (result[fullKey] !== undefined) {
      const value = result[fullKey] as T;
      this.memoryCache.set(fullKey, value);
      return value;
    }
    
    return undefined;
  }

  /**
   * Set a value in storage
   */
  async set<T>(key: string, value: T): Promise<void> {
    await this.initialize();
    
    const fullKey = this.getKey(key);
    const storageItem: StorageItem<T> = {
      value,
      timestamp: Date.now(),
      version: 1
    };
    
    const storage = this.getStorage();
    await storage.set({ [fullKey]: storageItem });
    
    this.memoryCache.set(fullKey, storageItem);
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    await this.initialize();
    
    const fullKey = this.getKey(key);
    const storage = this.getStorage();
    
    await storage.remove(fullKey);
    this.memoryCache.delete(fullKey);
  }

  /**
   * Clear all values in namespace
   */
  async clear(): Promise<void> {
    await this.initialize();
    
    const keysToRemove: string[] = [];
    
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${this.namespace}:`)) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      const storage = this.getStorage();
      await storage.remove(keysToRemove);
    }
    
    keysToRemove.forEach(key => this.memoryCache.delete(key));
  }

  /**
   * Get storage quota information
   */
  async getQuotaInfo(): Promise<{ used: number; available: number; percentUsed: number }> {
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    const quota = 10 * 1024 * 1024; // 10MB for local storage
    
    return {
      used: bytesInUse,
      available: quota - bytesInUse,
      percentUsed: (bytesInUse / quota) * 100
    };
  }
}
```

### State Manager with Automatic Restoration

```typescript
// src/background/state-manager.ts

interface ExtensionState {
  user: UserProfile | null;
  session: SessionData | null;
  settings: ExtensionSettings;
  cache: Record<string, CacheEntry>;
  lastSync: number | null;
  activeFeatures: Set<string>;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
}

interface SessionData {
  token: string;
  expiresAt: number;
}

interface ExtensionSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  syncInterval: number;
  autoSuspend: boolean;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

class StateManager {
  private state: ExtensionState;
  private storage: ChromeStorageManager;
  private autoSaveEnabled: boolean = true;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(storage: ChromeStorageManager) {
    this.storage = storage;
    this.state = this.getDefaultState();
  }

  private getDefaultState(): ExtensionState {
    return {
      user: null,
      session: null,
      settings: {
        theme: 'system',
        notifications: true,
        syncInterval: 5,
        autoSuspend: true
      },
      cache: {},
      lastSync: null,
      activeFeatures: new Set()
    };
  }

  /**
   * Restore state from storage on every service worker wake-up
   */
  async restore(): Promise<void> {
    console.log('[StateManager] Restoring state...');
    
    try {
      // Restore user
      const userData = await this.storage.get<UserProfile>('user');
      if (userData) this.state.user = userData;
      
      // Restore session
      const sessionData = await this.storage.get<SessionData>('session');
      if (sessionData) this.state.session = sessionData;
      
      // Restore settings
      const settingsData = await this.storage.get<ExtensionSettings>('settings');
      if (settingsData) this.state.settings = settingsData;
      
      // Restore cache
      const cacheData = await this.storage.get<Record<string, CacheEntry>>('cache');
      if (cacheData) this.state.cache = cacheData;
      
      // Restore last sync
      const syncData = await this.storage.get<number>('lastSync');
      if (syncData) this.state.lastSync = syncData;
      
      console.log('[StateManager] State restored successfully');
    } catch (error) {
      console.error('[StateManager] Failed to restore state:', error);
      await this.initializeDefaults();
    }
  }

  /**
   * Save current state to storage
   */
  async save(): Promise<void> {
    try {
      await Promise.all([
        this.storage.set('user', this.state.user),
        this.storage.set('session', this.state.session),
        this.storage.set('settings', this.state.settings),
        this.storage.set('cache', this.state.cache),
        this.storage.set('lastSync', this.state.lastSync)
      ]);
      
      console.log('[StateManager] State saved');
    } catch (error) {
      console.error('[StateManager] Failed to save state:', error);
    }
  }

  /**
   * Debounced save to prevent excessive storage writes
   */
  debouncedSave(): void {
    if (!this.autoSaveEnabled) return;
    
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    
    this.saveDebounceTimer = setTimeout(() => {
      this.save();
    }, 1000);
  }

  /**
   * Initialize with default values
   */
  async initializeDefaults(): Promise<void> {
    this.state = this.getDefaultState();
    await this.save();
    console.log('[StateManager] Initialized with defaults');
  }

  /**
   * Update state with partial data
   */
  update(updates: Partial<ExtensionState>): void {
    this.state = { ...this.state, ...updates };
    this.debouncedSave();
  }

  /**
   * Update specific nested settings
   */
  updateSettings(settings: Partial<ExtensionSettings>): void {
    this.state.settings = { ...this.state.settings, ...settings };
    this.debouncedSave();
  }

  getState(): ExtensionState {
    return this.state;
  }

  getSettings(): ExtensionSettings {
    return this.state.settings;
  }
}
```

## Complete Integration Example

Here's how all these patterns work together in a real-world extension similar to Tab Suspender Pro:

```typescript
// src/background/index.ts

class ChromeExtensionBackground {
  private storage: ChromeStorageManager;
  private stateManager: StateManager;
  private alarmScheduler: AlarmScheduler;
  private keepAliveManager: KeepAliveManager;
  private offscreenManager: OffscreenDocumentManager;

  constructor() {
    this.storage = new ChromeStorageManager({ namespace: 'tab-suspender-pro' });
    this.stateManager = new StateManager(this.storage);
    this.alarmScheduler = new AlarmScheduler();
    this.keepAliveManager = new KeepAliveManager();
    this.offscreenManager = new OffscreenDocumentManager();
  }

  async initialize(): Promise<void> {
    // Always restore state first
    await this.stateManager.restore();
    
    // Set up all event listeners
    this.setupAlarmHandlers();
    this.setupMessageHandlers();
    this.setupLifecycleHandlers();
    
    // Start periodic tasks
    this.alarmScheduler.startPeriodicTasks();
    
    console.log('[Background] Extension initialized');
  }

  private setupAlarmHandlers(): void {
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      // CRITICAL: Restore state before handling any alarm
      await this.stateManager.restore();
      
      switch (alarm.name) {
        case 'idle-tab-check':
          await this.checkAndSuspendIdleTabs();
          break;
        case 'deep-cleanup':
          await this.performDeepCleanup();
          break;
        case 'state-save':
          await this.stateManager.save();
          break;
        case 'keep-alive-ping':
          this.keepAliveManager.handlePing();
          break;
      }
    });
  }

  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender).then(sendResponse);
      return true;
    });
  }

  private setupLifecycleHandlers(): void {
    chrome.runtime.onInstalled.addListener(async (details) => {
      await this.stateManager.initializeDefaults();
      this.alarmScheduler.startPeriodicTasks();
    });

    chrome.runtime.onStartup.addListener(async () => {
      await this.stateManager.restore();
      this.alarmScheduler.startPeriodicTasks();
    });
  }

  private async handleMessage(
    message: ExtensionMessage, 
    sender: chrome.runtime.MessageSender
  ): Promise<ExtensionResponse> {
    switch (message.action) {
      case 'get-settings':
        return { 
          success: true, 
          data: this.stateManager.getSettings() 
        };
        
      case 'update-settings':
        this.stateManager.updateSettings(message.settings);
        return { success: true };
        
      case 'get-stats':
        return { success: true, data: await this.getStatistics() };
        
      case 'force-suspend':
        await this.keepAliveManager.startTask('force-suspend');
        try {
          await this.suspendTab(message.tabId);
        } finally {
          this.keepAliveManager.endTask('force-suspend');
        }
        return { success: true };
        
      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  private async checkAndSuspendIdleTabs(): Promise<void> {
    const settings = this.stateManager.getSettings();
    
    if (!settings.autoSuspend) return;
    
    try {
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        if (tab.id && tab.active === false) {
          // Check tab idle time and suspend if appropriate
          const idleInfo = await chrome.idle.queryState(60);
          
          if (idleInfo === 'idle' && tab.id) {
            await this.suspendTab(tab.id);
          }
        }
      }
    } catch (error) {
      console.error('[Background] Error checking idle tabs:', error);
    }
  }

  private async suspendTab(tabId: number): Promise<void> {
    try {
      await chrome.tabs.discard(tabId);
      console.log(`[Background] Suspended tab: ${tabId}`);
    } catch (error) {
      console.error(`[Background] Failed to suspend tab ${tabId}:`, error);
    }
  }

  private async performDeepCleanup(): Promise<void> {
    // Perform comprehensive cleanup of cached data
    const quotaInfo = await this.storage.getQuotaInfo();
    
    if (quotaInfo.percentUsed > 80) {
      // Clean up old cache entries
      await this.cleanupOldCache();
    }
  }

  private async cleanupOldCache(): Promise<void> {
    const cache = await this.storage.get<Record<string, CacheEntry>>('cache');
    
    if (!cache) return;
    
    const now = Date.now();
    const entriesToRemove: string[] = [];
    
    for (const [key, entry] of Object.entries(cache)) {
      if (now - entry.timestamp > entry.ttl) {
        entriesToRemove.push(key);
      }
    }
    
    for (const key of entriesToRemove) {
      delete cache[key];
    }
    
    await this.storage.set('cache', cache);
    console.log(`[Background] Cleaned up ${entriesToRemove.length} cache entries`);
  }

  private async getStatistics(): Promise<ExtensionStats> {
    const tabs = await chrome.tabs.query({});
    const quotaInfo = await this.storage.getQuotaInfo();
    
    return {
      totalTabs: tabs.length,
      storageUsed: quotaInfo.used,
      lastSync: this.stateManager.getState().lastSync
    };
  }
}

// Initialize and start the extension
const background = new ChromeExtensionBackground();
background.initialize();
```

## Best Practices Summary

When implementing background service workers for Chrome extensions, follow these essential guidelines:

### Alarms and Scheduling
- Always use `chrome.alarms` instead of `setTimeout` or `setInterval` for scheduled tasks
- Store alarm-related data in `chrome.storage` since alarms cannot carry payload
- Use descriptive alarm names for easier debugging
- Implement error handling for all alarm callbacks

### Keep-Alive Management
- Prefer conditional keep-alive (start/stop based on actual need) over constant keep-alive
- Use offscreen documents for genuinely long-running DOM operations
- Consider the resource cost of keeping the service worker active
- Implement proper cleanup when tasks complete

### State Persistence
- Restore state on EVERY wake-up, not just on installation
- Use memory cache with storage backup for optimal performance
- Implement debounced saves to prevent excessive storage writes
- Monitor and handle storage quotas proactively

### Common Pitfalls to Avoid
1. **Don't rely on global variables** — Any data in global variables is lost when the service worker terminates
2. **Don't use setTimeout/setInterval** — These don't persist across service worker restarts
3. **Don't skip state restoration** — Always restore state in every event handler
4. **Don't forget error handling** — Storage operations can fail for various reasons
5. **Don't keep the worker alive unnecessarily** — It wastes resources and may cause issues with Chrome's extension review process

## Related Guides

- [Service Worker Lifecycle Deep Dive](service-worker-lifecycle.md)
- [Chrome Extension Message Passing Patterns](message-passing-best-practices.md)
- [Advanced Debugging Techniques](advanced-debugging.md)
- [Storage API Complete Reference](../api-reference/storage.md)
- [Tab Management Best Practices](../guides/tab-management-patterns.md)

---

*Part of the Chrome Extension Guide by theluckystrike. Built at [zovo.one](https://zovo.one).*
