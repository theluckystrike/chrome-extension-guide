---
layout: default
title: "Chrome Extension Power Management — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
---
# Power Management in Chrome Extensions

> **Guide Level:** Intermediate | **Last Updated:** 2025

The `chrome.power` API enables extensions to control system power management, preventing devices from sleeping or the display from turning off during critical operations. This is essential for extensions that need to complete long-running tasks without interruption.

## chrome.power API Overview

The Power API provides two core functions for managing power states, plus an additional Chrome OS-only method:

```javascript
// Request keeping the system awake
chrome.power.requestKeepAwake(level);

// Release the keep-awake request
chrome.power.releaseKeepAwake();

// Chrome OS only (Chrome 113+): Report user activity to reset idle timers
chrome.power.reportActivity();
```

### Permission Requirements

Add the `power` permission to your `manifest.json`:

```json
{
  "permissions": [
    "power"
  ]
}
```

No additional host permissions are required—it's a universal permission available to all extensions.

## Power Levels

The `requestKeepAwake()` method accepts a `level` parameter that determines what to keep awake:

| Level | Behavior |
|-------|----------|
| `system` | Prevents the system from sleeping in response to user inactivity |
| `display` | Prevents the display from turning off or dimming, AND prevents the system from sleeping (higher precedence than `system`) |

### Display Level (Recommended)

```javascript
// Keep display on and prevent system sleep
chrome.power.requestKeepAwake('display');
```

Use `display` level for:
- Presentations and slideshows
- Media playback
- Reading documents
- Any scenario where user interaction is expected

### System Level (Aggressive)

```javascript
// Keep entire system awake
chrome.power.requestKeepAwake('system');
```

Use `system` level for:
- Large file downloads
- Background data synchronization
- File conversions or processing
- Any task where system sleep would interrupt progress

## Preventing Display Sleep

The most common use case is keeping the display awake during user-facing tasks like presentations or media playback. Note that the `display` level also prevents system sleep.

### Basic Implementation

```javascript
// In your background service worker or popup script

function enableKeepAwake() {
  chrome.power.requestKeepAwake('display');
  console.log('Display will stay awake');
}

function disableKeepAwake() {
  chrome.power.releaseKeepAwake();
  console.log('Power management released');
}
```

### With Automatic Release

Always release when done to conserve battery:

```javascript
class PowerManager {
  constructor() {
    this.isActive = false;
    this.releaseTimer = null;
  }

  request(durationMinutes = 30) {
    // Clear any existing timer
    this.cancel();
    
    chrome.power.requestKeepAwake('display');
    this.isActive = true;
    
    // Auto-release after duration (optional safety)
    this.releaseTimer = setTimeout(() => {
      this.release();
    }, durationMinutes * 60 * 1000);
    
    console.log(`Keep-awake active for ${durationMinutes} minutes`);
  }

  release() {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    
    if (this.isActive) {
      chrome.power.releaseKeepAwake();
      this.isActive = false;
      console.log('Power management released');
    }
  }

  cancel() {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
  }
}

const powerManager = new PowerManager();
```

## Use Cases

### Presentations and Slideshows

Extensions that control presentations need the display to stay awake:

```javascript
// presentation-controller.js
class PresentationManager {
  constructor() {
    this.activePresentation = null;
    this.listeners = new Map();
  }

  startPresentation(slideCount) {
    // Keep display awake during presentation
    chrome.power.requestKeepAwake('display');
    this.activePresentation = {
      startTime: Date.now(),
      slideCount,
      currentSlide: 0
    };
    console.log('Presentation mode: display kept awake');
  }

  nextSlide() {
    if (this.activePresentation) {
      this.activePresentation.currentSlide++;
    }
  }

  endPresentation() {
    chrome.power.releaseKeepAwake();
    this.activePresentation = null;
    console.log('Presentation ended: power released');
  }
}
```

### Media Playback

Video and audio extensions should manage power states:

```javascript
// media-playback.js
class MediaPowerManager {
  constructor() {
    this.isPlaying = false;
    this.setupListeners();
  }

  setupListeners() {
    // Listen for tab audio playing
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.audible === true) {
        this.onMediaStart();
      } else if (changeInfo.audible === false) {
        this.onMediaStop();
      }
    });
  }

  onMediaStart() {
    // Only prevent display sleep, not system
    chrome.power.requestKeepAwake('display');
    this.isPlaying = true;
  }

  onMediaStop() {
    chrome.power.releaseKeepAwake();
    this.isPlaying = false;
  }

  togglePlayback() {
    if (this.isPlaying) {
      this.onMediaStop();
    } else {
      this.onMediaStart();
    }
  }
}
```

### Long Downloads

Download managers need to prevent system sleep during large transfers:

```javascript
// download-manager.js
class DownloadPowerManager {
  constructor() {
    this.activeDownloads = new Map();
    this.setupListeners();
  }

  setupListeners() {
    chrome.downloads.onCreated.addListener((downloadItem) => {
      // For large downloads, use system level
      if (downloadItem.fileSize > 50 * 1024 * 1024) { // 50MB+
        this.enableSystemAwake(downloadItem.id);
      } else {
        this.enableDisplayAwake(downloadItem.id);
      }
    });

    // Track state changes via onChanged (no separate onComplete/onError events)
    chrome.downloads.onChanged.addListener((delta) => {
      if (delta.state && (delta.state.current === 'complete' || delta.state.current === 'interrupted')) {
        this.disablePowerManagement(delta.id);
      }
    });
  }

  enableSystemAwake(downloadId) {
    chrome.power.requestKeepAwake('system');
    this.activeDownloads.set(downloadId, 'system');
    console.log(`Download ${downloadId}: system kept awake`);
  }

  enableDisplayAwake(downloadId) {
    chrome.power.requestKeepAwake('display');
    this.activeDownloads.set(downloadId, 'display');
    console.log(`Download ${downloadId}: display kept awake`);
  }

  disablePowerManagement(downloadId) {
    this.activeDownloads.delete(downloadId);
    
    // Only release if no more active downloads
    if (this.activeDownloads.size === 0) {
      chrome.power.releaseKeepAwake();
      console.log('All downloads complete: power released');
    }
  }
}
```

## Battery-Conscious Design Patterns

### Always Release When Done

The most important pattern: always pair `requestKeepAwake` with `releaseKeepAwake`:

```javascript
// BAD: Never releases
function startTask() {
  chrome.power.requestKeepAwake('system');
  // Task completes but power stays on!
}

// GOOD: Always releases
async function processLargeFile(file) {
  chrome.power.requestKeepAwake('system');
  try {
    await processFile(file);
  } finally {
    chrome.power.releaseKeepAwake(); // Always runs
  }
}
```

### Choose the Right Level

Use `system` when you only need to prevent system sleep (allows display to dim/off). Use `display` when the screen must stay on (also prevents system sleep):

```javascript
// Prefer this (display level)
chrome.power.requestKeepAwake('display');

// Over this (system level), unless necessary
chrome.power.requestKeepAwake('system');
```

### Track Request Count

Multiple components can request keep-awake; track them properly:

```javascript
class PowerRequestTracker {
  constructor() {
    this.requests = new Set();
  }

  request(level = 'display') {
    this.requests.add(level);
    if (this.requests.size === 1) {
      chrome.power.requestKeepAwake(level);
    }
  }

  release() {
    if (this.requests.size > 0) {
      const levels = Array.from(this.requests);
      this.requests.clear();
      chrome.power.releaseKeepAwake();
      
      // Re-request for remaining if needed
      levels.slice(1).forEach(level => this.request(level));
    }
  }

  get active() {
    return this.requests.size > 0;
  }
}
```

### Respect User Preference

Consider checking if the user has battery saver enabled:

```javascript
async function shouldRequestPower() {
  // Check if on battery power
  if (navigator.getBattery) {
    try {
      const battery = await navigator.getBattery();
      if (battery.level < 0.2 && !battery.charging) {
        console.warn('Low battery: avoiding power request');
        return false;
      }
    } catch (e) {
      // Battery API not supported, proceed normally
    }
  }
  return true;
}

async function smartRequestKeepAwake(level) {
  if (await shouldRequestPower()) {
    chrome.power.requestKeepAwake(level);
  }
}
```

### Context-Aware Power Management

Adjust power behavior based on extension context:

```javascript
class ContextAwarePowerManager {
  constructor() {
    this.popupOpen = false;
    this.setupContextListeners();
  }

  setupContextListeners() {
    // Detect when popup is open
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === 'popup') {
        this.popupOpen = true;
        port.onDisconnect.addListener(() => {
          this.popupOpen = false;
          this.evaluatePowerState();
        });
      }
    });
  }

  evaluatePowerState() {
    // Only request power if popup is actively open
    if (this.popupOpen) {
      chrome.power.requestKeepAwake('display');
    } else {
      chrome.power.releaseKeepAwake();
    }
  }
}
```

### Event-Based Cleanup

Use event listeners to automatically manage power:

```javascript
// Auto-cleanup on extension unload
chrome.runtime.onSuspend.addListener(() => {
  chrome.power.releaseKeepAwake();
  console.log('Extension suspended: power released');
});

// Clean up on tab close
chrome.tabs.onRemoved.addListener((tabId) => {
  // Check if this was the only active tab needing power
  chrome.power.releaseKeepAwake();
});
```

## Best Practices Summary

1. **Always release when done** — Use try/finally or event-driven cleanup
2. **Prefer display level** — Only use system level when necessary
3. **Track multiple requests** — Don't let one component override another
4. **Consider battery state** — Respect low-power conditions
5. **Auto-timeout as safety** — Set maximum durations for power requests
6. **Clean up on unload** — Handle extension suspension and tab closure
7. **Log state changes** — Helps debug power-related issues

## Common Mistakes

- Forgetting to call `releaseKeepAwake()` after task completion
- Using system level when display would suffice
- Not handling multiple concurrent power requests
- Ignoring battery state on portable devices
- Not cleaning up on extension suspension

## Related APIs

- [chrome.idle](https://developer.chrome.com/docs/extensions/reference/idle/) — Detect user idle state
- [chrome.power](https://developer.chrome.com/docs/extensions/reference/power/) — Full API documentation
- [chrome.alarms](https://developer.chrome.com/docs/extensions/reference/alarms/) — Schedule tasks that may need power

The Power API is straightforward but critical for creating polished extensions that don't interrupt users with unexpected sleep states during important tasks.

## Related Articles

- [Power API Patterns](../patterns/power-api.md)
- [Idle Detection](../guides/idle-detection.md)
