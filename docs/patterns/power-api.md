---
layout: default
title: "Chrome Extension Power Api — Best Practices"
description: "Manage power settings to prevent battery drain from extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/power-api/"
---

# Chrome Extension Power API Patterns

## Overview {#overview}

The Chrome Power API (`chrome.power`) enables extensions to prevent the system from entering sleep mode, ensuring critical operations complete without interruption. This API is essential for extensions that handle long-running tasks, downloads, presentations, or any operation where system sleep would cause disruption.

The Power API provides three core methods: `requestKeepAwake()`, `releaseKeepAwake()`, and the ability to specify two levels of keep-awake: "display" (prevents only the display from sleeping) and "system" (prevents the entire system from sleeping).

Key facts:
- **Two keep-awake levels**: "display" prevents the display from being turned off or dimmed, and prevents system sleep; "system" prevents system sleep but allows the screen to dim or turn off
- **Permission required**: The Power API requires the `"power"` permission in Manifest V3
- **Automatic release**: Power requests are automatically released when the extension is unloaded or the browser closes
- **Replacement behavior**: A new `requestKeepAwake` call from the same extension replaces the previous request (it does not stack)

---

## Pattern 1: Preventing Display Sleep {#pattern-1-preventing-display-sleep}

The most common use case is preventing the display from sleeping while the user is watching content, reading, or performing tasks that require the screen to stay on.

### Required Permission {#required-permission}

Add `"power"` to your `manifest.json` permissions:

```json
{
  "permissions": ["power"]
}
```

### Basic Display Keep-Awake {#basic-display-keep-awake}

```ts
// lib/power-service.ts
export type KeepAwakeLevel = "display" | "system";

export class PowerManager {
  private currentLevel: KeepAwakeLevel | null = null;
  private requestCount = 0;

  /**
   * Request keep-awake at the display level
   * Prevents the display from being turned off or dimmed, and prevents system sleep
   */
  async requestDisplayKeepAwake(): Promise<void> {
    if (this.requestCount === 0 || this.currentLevel === "system") {
      // Either first request or upgrading from no request
      await chrome.power.requestKeepAwake("display");
      this.currentLevel = "display";
    }
    this.requestCount++;
    console.log(`Display keep-awake requested (count: ${this.requestCount})`);
  }

  /**
   * Check if display keep-awake is currently active
   */
  isDisplayAwake(): boolean {
    return this.currentLevel === "display" && this.requestCount > 0;
  }

  /**
   * Get current power management status
   */
  getStatus(): { level: KeepAwakeLevel | null; requestCount: number } {
    return {
      level: this.currentLevel,
      requestCount: this.requestCount,
    };
  }
}

export const powerManager = new PowerManager();
```

### Usage in Background Service Worker {#usage-in-background-service-worker}

```ts
// background/service-worker.ts
import { powerManager } from "../lib/power-service";

// Prevent display sleep during extension activation
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ENABLE_KEEP_AWAKE") {
    powerManager.requestDisplayKeepAwake();
    sendResponse({ success: true });
  } else if (message.type === "DISABLE_KEEP_AWAKE") {
    powerManager.releaseKeepAwake();
    sendResponse({ success: true });
  }
});
```

---

## Pattern 2: Preventing System Sleep {#pattern-2-preventing-system-sleep}

System-level keep-awake prevents the entire computer from sleeping, which is necessary for background operations that must complete even if the user isn't actively using the device.

### System Keep-Awake Implementation {#system-keep-awake-implementation}

```ts
// lib/power-service.ts (continued)

export class PowerManager {
  // ... previous code ...

  /**
   * Request system-level keep-awake
   * Prevents the system from sleeping, but allows the screen to dim or turn off
   * Use for critical background operations that don't need the screen
   */
  async requestSystemKeepAwake(): Promise<void> {
    // System-level overrides display-level
    if (this.currentLevel !== "system") {
      await chrome.power.requestKeepAwake("system");
      this.currentLevel = "system";
    }
    this.requestCount++;
    console.log(`System keep-awake requested (count: ${this.requestCount})`);
  }

  /**
   * Check if system keep-awake is active
   */
  isSystemAwake(): boolean {
    return this.currentLevel === "system" && this.requestCount > 0;
  }

  /**
   * Determine appropriate level based on operation type
   */
  async requestKeepAwakeForOperation(
    operation: "video" | "download" | "presentation" | "background-sync"
  ): Promise<void> {
    switch (operation) {
      case "video":
      case "presentation":
        // Display level sufficient for watching content
        await this.requestDisplayKeepAwake();
        break;
      case "download":
      case "background-sync":
        // System level needed for background operations
        await this.requestSystemKeepAwake();
        break;
    }
  }
}
```

### When to Use System vs Display {#when-to-use-system-vs-display}

| Operation Type | Recommended Level | Rationale |
|---------------|-------------------|-----------|
| Video playback | Display | User is present, screen must stay on |
| Presentation | Display | Presenter needs screen to stay on |
| File download | System | Must complete even if screen turns off |
| Background sync | System | May need to complete while screen is off |
| Long computation | System | User may not be watching; screen can turn off |

---

## Pattern 3: Releasing Keep-Awake {#pattern-3-releasing-keep-awake}

Properly releasing keep-awake requests is critical to avoid unnecessary power consumption. The Power API uses a replacement model: a new `requestKeepAwake` call from the same extension replaces the previous request, and a single `releaseKeepAwake` call releases it.

### Release Implementation {#release-implementation}

```ts
// lib/power-service.ts (continued)

export class PowerManager {
  // ... previous code ...

  /**
   * Release one keep-awake request
   * Only actually releases when all requests are done
   */
  async releaseKeepAwake(): Promise<void> {
    if (this.requestCount > 0) {
      this.requestCount--;
      console.log(`Keep-awake released (remaining: ${this.requestCount})`);
      
      if (this.requestCount === 0) {
        await chrome.power.releaseKeepAwake();
        this.currentLevel = null;
        console.log("All keep-awake requests released");
      }
    }
  }

  /**
   * Force release all requests immediately
   * Use for emergency cleanup or state reset
   */
  async forceRelease(): Promise<void> {
    this.requestCount = 0;
    this.currentLevel = null;
    await chrome.power.releaseKeepAwake();
    console.log("Force release - all keep-awake disabled");
  }

  /**
   * Release and optionally re-request at different level
   */
  async switchLevel(newLevel: KeepAwakeLevel): Promise<void> {
    await this.forceRelease();
    if (newLevel === "display") {
      await this.requestDisplayKeepAwake();
    } else {
      await this.requestSystemKeepAwake();
    }
  }
}
```

### Cleanup on Extension Unload {#cleanup-on-extension-unload}

```ts
// background/service-worker.ts
import { powerManager } from "../lib/power-service";

// Clean up when service worker is unloaded
chrome.runtime.onSuspend.addListener(() => {
  console.log("Service worker suspending, releasing power requests");
  powerManager.forceRelease();
});

// Also handle explicit disable from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_POWER") {
    if (powerManager.isActive()) {
      powerManager.forceRelease();
    } else {
      powerManager.requestDisplayKeepAwake();
    }
    sendResponse({ isActive: powerManager.isActive() });
  }
});
```

---

## Pattern 4: Building a Caffeine Toggle Extension {#pattern-4-building-a-caffeine-toggle-extension}

A "Caffeine" toggle extension prevents sleep on demand with a simple click. This is one of the most popular extension types using the Power API.

### Storage Schema Definition {#storage-schema-definition}

```ts
// lib/storage.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

export const powerSchema = defineSchema({
  isEnabled: { type: "boolean", default: false },
  keepAwakeLevel: { type: "string", default: "display" } as const,
  lastToggled: { type: "number", default: 0 },
  totalActiveTime: { type: "number", default: 0 },
});

export const powerStorage = createStorage(powerSchema);

export type PowerLevel = "display" | "system";
export type PowerState = {
  isEnabled: boolean;
  keepAwakeLevel: PowerLevel;
  lastToggled: number;
  totalActiveTime: number;
};
```

### Complete Caffeine Extension Background Script {#complete-caffeine-extension-background-script}

```ts
// background/service-worker.ts
import { powerManager } from "../lib/power-service";
import { powerStorage, PowerLevel } from "../lib/storage";

/**
 * Caffeine Toggle Extension - Main Controller
 * Prevents system/display sleep with a simple toggle
 */

// Initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  const state = await powerStorage.get("isEnabled");
  if (state) {
    const level = await powerStorage.get("keepAwakeLevel");
    if (level === "system") {
      await powerManager.requestSystemKeepAwake();
    } else {
      await powerManager.requestDisplayKeepAwake();
    }
    updateBadge(true);
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handlePowerMessage(message).then(sendResponse);
  return true; // Indicates async response
});

async function handlePowerMessage(
  message: { type: string; level?: PowerLevel }
): Promise<{ success: boolean; isEnabled?: boolean }> {
  switch (message.type) {
    case "TOGGLE": {
      const isEnabled = await powerStorage.get("isEnabled");
      if (isEnabled) {
        await powerManager.forceRelease();
        await powerStorage.set("isEnabled", false);
        updateBadge(false);
        return { success: true, isEnabled: false };
      } else {
        const level = (await powerStorage.get("keepAwakeLevel")) as PowerLevel;
        if (level === "system") {
          await powerManager.requestSystemKeepAwake();
        } else {
          await powerManager.requestDisplayKeepAwake();
        }
        await powerStorage.set("isEnabled", true);
        await powerStorage.set("lastToggled", Date.now());
        updateBadge(true);
        return { success: true, isEnabled: true };
      }
    }

    case "SET_LEVEL": {
      const level = message.level || "display";
      const isEnabled = await powerStorage.get("isEnabled");
      
      await powerStorage.set("keepAwakeLevel", level);
      
      if (isEnabled) {
        // Switch to new level if currently active
        await powerManager.forceRelease();
        if (level === "system") {
          await powerManager.requestSystemKeepAwake();
        } else {
          await powerManager.requestDisplayKeepAwake();
        }
      }
      return { success: true, isEnabled };
    }

    case "GET_STATUS": {
      const isEnabled = await powerStorage.get("isEnabled");
      const level = await powerStorage.get("keepAwakeLevel");
      return { success: true, isEnabled: isEnabled || false };
    }

    default:
      return { success: false };
  }
}

function updateBadge(isActive: boolean): void {
  chrome.action.setBadgeText({
    text: isActive ? "ON" : "",
  });
  chrome.action.setBadgeBackgroundColor({
    color: isActive ? "#4CAF50" : "#9E9E9E",
  });
}
```

### Popup UI Implementation {#popup-ui-implementation}

```ts
// popup/popup.ts
import { sendMessage } from "@theluckystrike/webext-messaging";

document.addEventListener("DOMContentLoaded", async () => {
  const toggleBtn = document.getElementById("toggle-btn")!;
  const levelSelect = document.getElementById("level-select") as HTMLSelectElement;
  const statusText = document.getElementById("status")!;

  // Get current status
  const response = await sendMessage<{ isEnabled: boolean }>({
    type: "GET_STATUS",
  });

  updateUI(response.isEnabled);

  // Toggle button handler
  toggleBtn.addEventListener("click", async () => {
    const newState = await sendMessage<{ isEnabled: boolean }>({
      type: "TOGGLE",
    });
    updateUI(newState.isEnabled);
  });

  // Level select handler
  levelSelect.addEventListener("change", async () => {
    await sendMessage({
      type: "SET_LEVEL",
      level: levelSelect.value as "display" | "system",
    });
  });

  function updateUI(isEnabled: boolean): void {
    toggleBtn.textContent = isEnabled ? "Disable Caffeine" : "Enable Caffeine";
    toggleBtn.classList.toggle("active", isEnabled);
    statusText.textContent = isEnabled
      ? "☕ Preventing sleep"
      : "Sleep allowed";
  }
});
```

---

## Pattern 5: Auto Keep-Awake During Downloads {#pattern-5-auto-keep-awake-during-downloads}

Automatically prevent sleep during active downloads or long operations, then release when complete.

### Download Detection Service {#download-detection-service}

```ts
// lib/download-power-manager.ts
import { powerManager } from "./power-service";

interface ActiveDownload {
  id: number;
  url: string;
  startTime: number;
}

export class DownloadPowerManager {
  private activeDownloads = new Map<number, ActiveDownload>();
  private isMonitoring = false;

  constructor() {
    this.setupDownloadListeners();
  }

  private setupDownloadListeners(): void {
    // Listen for download events
    chrome.downloads.onCreated.addListener((download) => {
      this.handleDownloadStarted(download);
    });

    chrome.downloads.onChanged.addListener((downloadDelta) => {
      if (downloadDelta.state?.current === "complete") {
        this.handleDownloadCompleted(downloadDelta.id);
      } else if (downloadDelta.error) {
        this.handleDownloadError(downloadDelta.id);
      }
    });

    chrome.downloads.onErased.addListener((downloadId) => {
      this.handleDownloadErased(downloadId);
    });
  }

  private async handleDownloadStarted(download: chrome.downloads.Download): Promise<void> {
    // Skip small files that will download quickly
    if (download.fileSize && download.fileSize < 1024 * 1024) {
      // Less than 1MB - don't prevent sleep
      return;
    }

    this.activeDownloads.set(download.id, {
      id: download.id,
      url: download.url,
      startTime: Date.now(),
    });

    // Request system-level keep-awake for downloads
    await powerManager.requestSystemKeepAwake();
    this.updateBadgeCount();
    console.log(`Download started: ${download.filename}, requesting system keep-awake`);
  }

  private async handleDownloadCompleted(downloadId: number): Promise<void> {
    if (this.activeDownloads.has(downloadId)) {
      this.activeDownloads.delete(downloadId);
      await this.checkAndRelease();
      this.updateBadgeCount();
      console.log(`Download completed: ${downloadId}`);
    }
  }

  private async handleDownloadError(downloadId: number): Promise<void> {
    if (this.activeDownloads.has(downloadId)) {
      this.activeDownloads.delete(downloadId);
      await this.checkAndRelease();
      this.updateBadgeCount();
      console.log(`Download error: ${downloadId}`);
    }
  }

  private async handleDownloadErased(downloadId: number): Promise<void> {
    if (this.activeDownloads.has(downloadId)) {
      this.activeDownloads.delete(downloadId);
      await this.checkAndRelease();
      this.updateBadgeCount();
    }
  }

  private async checkAndRelease(): Promise<void> {
    // Only release if no more active downloads
    if (this.activeDownloads.size === 0) {
      await powerManager.releaseKeepAwake();
      console.log("All downloads complete, releasing keep-awake");
    }
  }

  private updateBadgeCount(): void {
    const count = this.activeDownloads.size;
    chrome.action.setBadgeText({
      text: count > 0 ? String(count) : "",
    });
    chrome.action.setBadgeBackgroundColor({
      color: count > 0 ? "#2196F3" : "#9E9E9E",
    });
  }

  getActiveCount(): number {
    return this.activeDownloads.size;
  }
}

export const downloadPowerManager = new DownloadPowerManager();
```

### Manifest Configuration {#manifest-configuration}

```json
{
  "permissions": ["power", "downloads"],
  "background": {
    "service_worker": "background.js"
  }
}
```

---

## Pattern 6: Timed Keep-Awake with Auto Release {#pattern-6-timed-keep-awake-with-auto-release}

Implement automatic release after a specified duration - useful for presentations,限时 tasks, or preventing sleep during a specific time window.

### Timed Power Manager {#timed-power-manager}

```ts
// lib/timed-power.ts
import { powerManager } from "./power-service";
import { powerStorage } from "./storage";

interface TimerState {
  endTime: number | null;
  intervalId: number | null;
  level: "display" | "system";
}

export class TimedPowerManager {
  private timerState: TimerState = {
    endTime: null,
    intervalId: null,
    level: "display",
  };

  /**
   * Enable keep-awake for a specified duration
   * @param durationMinutes Duration in minutes
   * @param level Keep-awake level (display or system)
   */
  async enableForDuration(
    durationMinutes: number,
    level: "display" | "system" = "display"
  ): Promise<{ endTime: number }> {
    // Clear any existing timer
    this.cancelTimer();

    const durationMs = durationMinutes * 60 * 1000;
    const endTime = Date.now() + durationMs;

    // Request keep-awake
    if (level === "system") {
      await powerManager.requestSystemKeepAwake();
    } else {
      await powerManager.requestDisplayKeepAwake();
    }

    // Set up auto-release timer
    this.timerState = {
      endTime,
      level,
      intervalId: window.setTimeout(async () => {
        await this.handleTimerComplete();
      }, durationMs),
    };

    // Store timer state for persistence across restarts
    await powerStorage.set("timerEndTime", endTime);
    await powerStorage.set("timerLevel", level);

    console.log(`Timed keep-awake enabled for ${durationMinutes} minutes`);
    return { endTime };
  }

  /**
   * Cancel the current timer and release keep-awake
   */
  async cancelTimer(): Promise<void> {
    if (this.timerState.intervalId !== null) {
      clearTimeout(this.timerState.intervalId);
      this.timerState.intervalId = null;
    }

    await powerManager.releaseKeepAwake();
    await powerStorage.set("timerEndTime", null);

    this.timerState.endTime = null;
    console.log("Timer cancelled, keep-awake released");
  }

  /**
   * Get remaining time in milliseconds
   */
  getRemainingTime(): number | null {
    if (!this.timerState.endTime) return null;
    const remaining = this.timerState.endTime - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Check and restore timer on extension startup
   */
  async restoreTimer(): Promise<boolean> {
    const savedEndTime = await powerStorage.get<number | null>("timerEndTime");
    const savedLevel = await powerStorage.get<"display" | "system">("timerLevel");

    if (savedEndTime && savedEndTime > Date.now()) {
      // Timer still valid, restore it
      const remaining = savedEndTime - Date.now();
      
      if (savedLevel === "system") {
        await powerManager.requestSystemKeepAwake();
      } else {
        await powerManager.requestDisplayKeepAwake();
      }

      this.timerState = {
        endTime: savedEndTime,
        level: savedLevel || "display",
        intervalId: window.setTimeout(async () => {
          await this.handleTimerComplete();
        }, remaining),
      };

      console.log(`Timer restored: ${Math.ceil(remaining / 60000)} minutes remaining`);
      return true;
    } else if (savedEndTime) {
      // Timer expired while extension was closed
      await powerStorage.set("timerEndTime", null);
    }

    return false;
  }

  private async handleTimerComplete(): Promise<void> {
    await powerManager.releaseKeepAwake();
    await powerStorage.set("timerEndTime", null);

    this.timerState = {
      endTime: null,
      intervalId: null,
      level: "display",
    };

    // Notify user
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Caffeine Timer Complete",
      message: "Your keep-awake session has ended.",
    });

    console.log("Timed keep-awake session completed");
  }
}

export const timedPowerManager = new TimedPowerManager();
```

---

## Pattern 7: Context-Aware Power Management {#pattern-7-context-aware-power-management}

Keep the system awake only on specific websites or when certain conditions are met - for example, during video calls, on specific domains, or when working in web apps.

### Site-Specific Power Manager {#site-specific-power-manager}

```ts
// lib/context-aware-power.ts
import { powerManager } from "./power-service";
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const contextSchema = defineSchema({
  enabledSites: { type: "array", default: [] } as { type: "array"; items: { type: "string" }; default: [] },
  enabledPatterns: { type: "array", default: [] } as { type: "array"; items: { type: "string" }; default: [] },
  defaultLevel: { type: "string", default: "display" } as const,
  siteLevels: { type: "object", default: {} } as { type: "object"; default: Record<string, string> },
});

const contextStorage = createStorage(contextSchema);

export class ContextAwarePowerManager {
  private currentTabId: number | null = null;
  private currentUrl: string | null = null;

  constructor() {
    this.setupTabListeners();
  }

  private setupTabListeners(): void {
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      await this.handleTabChange(activeInfo.tabId);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url || changeInfo.status === "complete") {
        this.handleTabChange(tabId);
      }
    });
  }

  private async handleTabChange(tabId: number): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url || !tab.url.startsWith("http")) {
        // Ignore chrome://, file://, etc.
        return;
      }

      const previousUrl = this.currentUrl;
      this.currentTabId = tabId;
      this.currentUrl = tab.url;

      // Check if we should enable/disable based on URL
      await this.evaluatePowerForUrl(tab.url, previousUrl);
    } catch (error) {
      console.error("Error handling tab change:", error);
    }
  }

  private async evaluatePowerForUrl(
    currentUrl: string,
    previousUrl: string | null
  ): Promise<void> {
    const enabledSites = await contextStorage.get("enabledSites");
    const enabledPatterns = await contextStorage.get("enabledPatterns");
    const defaultLevel = await contextStorage.get("defaultLevel");
    const siteLevels = await contextStorage.get("siteLevels");

    const url = new URL(currentUrl);
    const hostname = url.hostname;

    // Check if current site is enabled
    const isSiteEnabled = (enabledSites || []).some((site: string) =>
      hostname.includes(site) || hostname === site
    );

    // Check URL patterns
    const isPatternEnabled = (enabledPatterns || []).some((pattern: string) => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(currentUrl);
      } catch {
        return false;
      }
    });

    const shouldBeActive = isSiteEnabled || isPatternEnabled;

    // Get site-specific level or default
    const siteLevel = (siteLevels || {})[hostname] || defaultLevel || "display";

    if (shouldBeActive) {
      if (siteLevel === "system") {
        await powerManager.requestSystemKeepAwake();
      } else {
        await powerManager.requestDisplayKeepAwake();
      }
      console.log(`Power management enabled for ${hostname}`);
    } else {
      await powerManager.releaseKeepAwake();
    }
  }

  async addEnabledSite(hostname: string): Promise<void> {
    const sites = await contextStorage.get("enabledSites") || [];
    if (!sites.includes(hostname)) {
      sites.push(hostname);
      await contextStorage.set("enabledSites", sites);
      // Re-evaluate current tab
      if (this.currentUrl) {
        await this.evaluatePowerForUrl(this.currentUrl, null);
      }
    }
  }

  async removeEnabledSite(hostname: string): Promise<void> {
    const sites = await contextStorage.get("enabledSites") || [];
    const filtered = sites.filter((s: string) => s !== hostname);
    await contextStorage.set("enabledSites", filtered);
  }

  async setSiteLevel(hostname: string, level: "display" | "system"): Promise<void> {
    const levels = await contextStorage.get("siteLevels") || {};
    levels[hostname] = level;
    await contextStorage.set("siteLevels", levels);
  }
}

export const contextPowerManager = new ContextAwarePowerManager();
```

### Content Script for Page-Level Control {#content-script-for-page-level-control}

```ts
// content-scripts/power-control.ts
import { sendMessage } from "@theluckystrike/webext-messaging";

/**
 * Content script that can request/decrease power based on page context
 * For example, request power when user starts a video call
 */

// Detect video call indicators
const videoCallSelectors = [
  '[data-testid="call-button"]', // Common meeting apps
  '.video-call-button',
  '[class*="call"]',
  '[class*="meeting"]',
];

let isInCall = false;

function detectVideoCall(): boolean {
  return videoCallSelectors.some((selector) => {
    const element = document.querySelector(selector);
    return element && window.getComputedStyle(element).display !== "none";
  });
}

// Monitor for video call state changes
function setupCallDetection(): void {
  const observer = new MutationObserver(() => {
    const inCall = detectVideoCall();
    if (inCall !== isInCall) {
      isInCall = inCall;
      sendMessage({
        type: inCall ? "VIDEO_CALL_STARTED" : "VIDEO_CALL_ENDED",
        url: window.location.href,
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Send initial state
if (detectVideoCall()) {
  sendMessage({
    type: "VIDEO_CALL_STARTED",
    url: window.location.href,
  });
}

setupCallDetection();
```

---

## Pattern 8: Power State Indicator in Badge {#pattern-8-power-state-indicator-in-badge}

Show the current power state in the extension badge with user-friendly controls. This provides immediate visual feedback without requiring users to open the popup.

### Badge Power Indicator {#badge-power-indicator}

```ts
// lib/badge-power-indicator.ts
import { powerManager } from "./power-service";

type PowerIndicatorState = "inactive" | "display" | "system" | "timed";

interface BadgeConfig {
  state: PowerIndicatorState;
  level?: "display" | "system";
  remainingTime?: number;
}

const BADGE_STATES: Record<
  PowerIndicatorState,
  { text: string; color: string }
> = {
  inactive: { text: "", color: "#9E9E9E" },
  display: { text: "☕", color: "#4CAF50" },
  system: { text: "⚡", color: "#FF9800" },
  timed: { text: "⏱", color: "#2196F3" },
};

export class BadgePowerIndicator {
  private currentState: PowerIndicatorState = "inactive";
  private updateInterval: number | null = null;

  /**
   * Update badge to reflect current power state
   */
  async update(state: BadgeConfig): Promise<void> {
    const config = BADGE_STATES[state.state];
    
    let displayText = config.text;
    
    // Add remaining time for timed state
    if (state.state === "timed" && state.remainingTime !== undefined) {
      const minutes = Math.ceil(state.remainingTime / 60000);
      displayText = `${minutes}m`;
    }

    await Promise.all([
      chrome.action.setBadgeText({ text: displayText }),
      chrome.action.setBadgeBackgroundColor({ color: config.color }),
    ]);

    this.currentState = state.state;
    console.log(`Badge updated: ${state.state}`);
  }

  /**
   * Set up timed update for countdown badge
   */
  startTimedUpdates(getRemainingTime: () => number | null): void {
    this.stopTimedUpdates();

    // Update immediately
    const remaining = getRemainingTime();
    if (remaining !== null) {
      this.update({ state: "timed", remainingTime: remaining });
    }

    // Update every minute
    this.updateInterval = window.setInterval(() => {
      const remaining = getRemainingTime();
      if (remaining === null) {
        this.update({ state: "inactive" });
        this.stopTimedUpdates();
      } else {
        this.update({ state: "timed", remainingTime: remaining });
      }
    }, 60000);
  }

  /**
   * Stop timed update interval
   */
  stopTimedUpdates(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Show inactive state
   */
  async showInactive(): Promise<void> {
    this.stopTimedUpdates();
    await this.update({ state: "inactive" });
  }

  /**
   * Show active state (display or system)
   */
  async showActive(level: "display" | "system"): Promise<void> {
    this.stopTimedUpdates();
    await this.update({ state: level, level });
  }

  getCurrentState(): PowerIndicatorState {
    return this.currentState;
  }
}

export const badgeIndicator = new BadgePowerIndicator();
```

### Integration with Power Manager {#integration-with-power-manager}

```ts
// background/service-worker.ts (enhanced)
import { powerManager } from "../lib/power-service";
import { badgeIndicator } from "../lib/badge-power-indicator";
import { timedPowerManager } from "./lib/timed-power";

/**
 * Initialize badge with current state
 */
async function initializeBadge(): Promise<void> {
  const isActive = powerManager.isActive();
  const remainingTime = timedPowerManager.getRemainingTime();

  if (remainingTime !== null && remainingTime > 0) {
    badgeIndicator.startTimedUpdates(() => timedPowerManager.getRemainingTime());
  } else if (isActive) {
    const level = powerManager.isSystemAwake() ? "system" : "display";
    badgeIndicator.showActive(level);
  } else {
    badgeIndicator.showInactive();
  }
}

// Listen for power state changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "POWER_STATE_CHANGED") {
    const { state, level, remainingTime } = message;
    
    if (state === "active") {
      badgeIndicator.showActive(level || "display");
    } else if (state === "timed" && remainingTime !== undefined) {
      badgeIndicator.startTimedUpdates(() => timedPowerManager.getRemainingTime());
    } else {
      badgeIndicator.showInactive();
    }
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(initializeBadge);
chrome.runtime.onInstalled.addListener(initializeBadge);
```

---

## Summary Table {#summary-table}

| Pattern | Use Case | Key API Methods | Dependencies |
|---------|----------|-----------------|---------------|
| **1: Display Sleep Prevention** | Video watching, reading | `chrome.power.requestKeepAwake("display")` | None |
| **2: System Sleep Prevention** | Background downloads, sync | `chrome.power.requestKeepAwake("system")` | None |
| **3: Release Keep-Awake** | Cleanup, state reset | `chrome.power.releaseKeepAwake()` | None |
| **4: Caffeine Toggle** | On-demand sleep prevention | Toggle logic + badge updates | `@theluckystrike/webext-storage`, `@theluckystrike/webext-messaging` |
| **5: Auto-Download** | File downloads, large transfers | Download listeners + auto-release | `downloads` permission |
| **6: Timed Keep-Awake** | Presentations, time-limited tasks | `setTimeout` + state persistence | `@theluckystrike/webext-storage` |
| **7: Context-Aware** | Site-specific, video calls | Tab listeners + URL matching | `@theluckystrike/webext-storage`, `@theluckystrike/webext-messaging` |
| **8: Badge Indicator** | Visual status feedback | `chrome.action.setBadgeText()` | None |

### Common Considerations {#common-considerations}

- **Permission requirements**: The Power API requires the `"power"` permission; patterns may also need `downloads`, `tabs`, or storage permissions
- **Replacement behavior**: A new `requestKeepAwake()` call from the same extension replaces the previous request; a single `releaseKeepAwake()` call releases it
- **Automatic cleanup**: Power requests are automatically released when the extension is unloaded or Chrome closes
- **Battery impact**: System-level keep-awake has significantly higher battery impact than display-level; use sparingly
- **User awareness**: Consider notifying users when keep-awake is active to avoid confusion about battery drain
- **Service worker limitations**: In Manifest V3, the service worker may be terminated after inactivity; ensure state is persisted in storage for restoration
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
