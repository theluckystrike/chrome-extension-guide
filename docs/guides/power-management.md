# Chrome Extension Power Management

The Chrome Power API (`chrome.power`) enables extensions to manage system power states, preventing the system or display from sleeping during critical operations. This is essential for extensions that need to maintain active sessions without user interaction.

## Overview

The Power API is part of the Chrome Extension APIs designed to control power management features. It allows extensions to request keep-awake behavior at different levels, ensuring that important tasks complete without interruption from system power-saving features.

## Required Permission

To use the Power API, add the `power` permission to your extension's manifest:

```json
{
  "name": "My Power Management Extension",
  "version": "1.0",
  "permissions": ["power"],
  "background": {
    "service_worker": "background.js"
  }
}
```

No additional permissions are required for basic power management functionality.

## Power Levels

The Power API supports two distinct power levels that control different aspects of system behavior:

### chrome.power.Level.SYSTEM

The system level prevents the entire system from entering sleep mode. This is appropriate for operations that require the full system to remain active, such as file downloads, system-wide synchronization, or background processing that cannot be interrupted.

```javascript
// Request system-level keep-awake
chrome.power.requestKeepAwake('system');
```

When using system level, the computer will remain fully awake and consuming power. Use this sparingly and only when necessary, as it significantly impacts battery life on portable devices.

### chrome.power.Level.DISPLAY

The display level prevents only the display (monitor/screen) from turning off or dimming, while allowing the system to enter sleep mode when idle. This is ideal for scenarios where you need visual feedback but don't require full system processing.

```javascript
// Request display-level keep-awake
chrome.power.requestKeepAwake('display');
```

Display-level keep-awake is more battery-efficient than system-level, making it the preferred choice for most use cases involving user-visible content.

## Preventing Display Sleep with requestKeepAwake

The `requestKeepAwake` method requests that power management be suppressed. The extension must call this method before performing any operation that should not be interrupted.

### Basic Syntax

```javascript
chrome.power.requestKeepAwake(level);
```

- `level`: A string specifying either `'system'` or `'display'`

### Example: Preventing Display Sleep During Task

```javascript
// In your background script or content script
function startPresentation() {
  // Prevent display from sleeping during presentation
  chrome.power.requestKeepAwake('display');
  console.log('Display keep-awake enabled');
}

function stopPresentation() {
  // Release when done
  chrome.power.releaseKeepAwake();
  console.log('Display keep-awake released');
}
```

### Multiple Request Handling

Chrome handles multiple keep-awake requests internally using a reference count. The power will remain suppressed as long as at least one request is active.

```javascript
// First request
chrome.power.requestKeepAwake('display');

// Later, another part of your extension also needs keep-awake
chrome.power.requestKeepAwake('display');

// When done, each request must be released
chrome.power.releaseKeepAwake();
chrome.power.releaseKeepAwake();
// Now power management resumes
```

## Releasing with releaseKeepAwake

The `releaseKeepAwake` method releases a previously requested keep-awake. It's crucial to pair every `requestKeepAwake` with a corresponding `releaseKeepAwake` to avoid unnecessarily draining battery.

### Basic Syntax

```javascript
chrome.power.releaseKeepAwake();
```

### Release Patterns

Always ensure proper release in error scenarios and when tasks complete:

```javascript
async function performLongDownload(downloadId) {
  // Request power before starting
  chrome.power.requestKeepAwake('system');
  
  try {
    const result = await downloadFile(downloadId);
    console.log('Download complete');
    return result;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  } finally {
    // Always release, whether success or failure
    chrome.power.releaseKeepAwake();
  }
}
```

### Using try-finally for Guaranteed Release

```javascript
function processLargeFile(fileData) {
  chrome.power.requestKeepAwake('system');
  
  try {
    // Process the file
    return processInChunks(fileData);
  } finally {
    // Guaranteed to execute
    chrome.power.releaseKeepAwake();
  }
}
```

## Power State Management Patterns

Effective power management requires thoughtful implementation patterns that balance functionality with battery conservation.

### Level Change Handling

While the Power API doesn't directly provide power state change events, you can integrate with other APIs:

```javascript
// Monitor for lid close or power events via runtime events
chrome.runtime.onSuspend.addListener(() => {
  // Save state before potential suspension
  chrome.power.releaseKeepAwake();
  saveApplicationState();
});
```

### Context-Aware Power Management

Adapt power management based on the current use case:

```javascript
class PowerManager {
  constructor() {
    this.keepAwakeCount = 0;
    this.currentLevel = 'display';
  }
  
  request(level = 'display') {
    if (this.keepAwakeCount === 0) {
      this.currentLevel = level;
      chrome.power.requestKeepAwake(level);
    } else if (level === 'system' && this.currentLevel === 'display') {
      // Upgrade to system level if needed
      chrome.power.releaseKeepAwake();
      chrome.power.requestKeepAwake('system');
      this.currentLevel = 'system';
    }
    this.keepAwakeCount++;
  }
  
  release() {
    if (this.keepAwakeCount > 0) {
      this.keepAwakeCount--;
      if (this.keepAwakeCount === 0) {
        chrome.power.releaseKeepAwake();
        this.currentLevel = 'display';
      }
    }
  }
  
  get isActive() {
    return this.keepAwakeCount > 0;
  }
}

// Usage
const powerManager = new PowerManager();
```

## Use Cases

### Presentations and Slide Shows

Extensions that control presentations should manage display power to prevent the screen from turning off during important moments:

```javascript
// presentation-controller.js
class PresentationController {
  constructor() {
    this.isPresenting = false;
    this.slideChangeListener = null;
  }
  
  startPresentation() {
    if (this.isPresenting) return;
    
    this.isPresenting = true;
    chrome.power.requestKeepAwake('display');
    
    // Listen for presentation events
    this.slideChangeListener = (event) => this.handleSlideChange(event);
    document.addEventListener('slidechange', this.slideChangeListener);
    
    console.log('Presentation mode: display will stay on');
  }
  
  stopPresentation() {
    if (!this.isPresenting) return;
    
    this.isPresenting = false;
    chrome.power.releaseKeepAwake();
    
    if (this.slideChangeListener) {
      document.removeEventListener('slidechange', this.slideChangeListener);
    }
    
    console.log('Presentation mode ended');
  }
  
  handleSlideChange(event) {
    // Reset any idle timers if your extension has them
    this.resetIdleDetection();
  }
}
```

### Media Playback

Video and audio extensions should maintain display power during playback:

```javascript
// media-playback.js
class MediaPowerManager {
  constructor() {
    this.mediaElement = null;
    this.keepAwakeLevel = 'display';
  }
  
  initialize(mediaSelector) {
    this.mediaElement = document.querySelector(mediaSelector);
    
    this.mediaElement.addEventListener('play', () => this.onPlay());
    this.mediaElement.addEventListener('pause', () => this.onPause());
    this.mediaElement.addEventListener('ended', () => this.onPause());
  }
  
  onPlay() {
    // Use display level for video playback
    chrome.power.requestKeepAwake(this.keepAwakeLevel);
    console.log('Media playing: display keep-awake active');
  }
  
  onPause() {
    chrome.power.releaseKeepAwake();
    console.log('Media paused: released');
  }
  
  setLevel(level) {
    if (chrome.runtime.lastError) {
      console.error('Power API error:', chrome.runtime.lastError);
      return;
    }
    this.keepAwakeLevel = level;
  }
}

// Initialize
const mediaManager = new MediaPowerManager();
mediaManager.initialize('video');
```

### Long Downloads and File Transfers

Background downloads need system-level keep-awake to ensure completion:

```javascript
// download-manager.js
class DownloadPowerManager {
  constructor() {
    this.activeDownloads = new Map();
  }
  
  startDownload(downloadId, fileSize) {
    // Use system level for large downloads
    const level = fileSize > 100 * 1024 * 1024 ? 'system' : 'display';
    
    chrome.power.requestKeepAwake(level);
    this.activeDownloads.set(downloadId, level);
    
    console.log(`Download ${downloadId} started with ${level} level`);
  }
  
  onDownloadComplete(downloadId) {
    const level = this.activeDownloads.get(downloadId);
    if (level) {
      chrome.power.releaseKeepAwake();
      this.activeDownloads.delete(downloadId);
      console.log(`Download ${downloadId} complete, power released`);
    }
  }
  
  onDownloadError(downloadId, error) {
    // Release on error too
    this.onDownloadComplete(downloadId);
    console.error(`Download ${downloadId} error:`, error);
  }
}
```

### Real-Time Communication

Video calls and live dashboards require sustained display power:

```javascript
// video-call-handler.js
class VideoCallManager {
  constructor() {
    this.callState = 'idle';
  }
  
  async startCall(roomId) {
    this.callState = 'connecting';
    
    try {
      await this.initializeConnection(roomId);
      this.callState = 'connected';
      
      // System level for video calls
      chrome.power.requestKeepAwake('system');
      console.log('Video call active: system power maintained');
      
    } catch (error) {
      this.callState = 'failed';
      throw error;
    }
  }
  
  endCall() {
    this.callState = 'idle';
    chrome.power.releaseKeepAwake();
    console.log('Video call ended: power released');
  }
  
  onConnectionLost() {
    // Keep power while reconnecting
    console.log('Connection lost, attempting reconnect...');
  }
}
```

## Battery-Conscious Extension Design

Responsible extension development means minimizing power impact when full functionality isn't required.

### Auto-Release Strategies

Implement automatic release after timeouts:

```javascript
class AutoReleasePowerManager {
  constructor(options = {}) {
    this.timeout = options.timeout || 5 * 60 * 1000; // 5 minutes default
    this.timer = null;
    this.level = options.level || 'display';
  }
  
  request() {
    // Clear existing timer
    this.clearTimer();
    
    // Request power
    chrome.power.requestKeepAwake(this.level);
    
    // Set auto-release timer
    this.timer = setTimeout(() => {
      console.log('Auto-release: timeout reached');
      this.release();
    }, this.timeout);
  }
  
  release() {
    this.clearTimer();
    chrome.power.releaseKeepAwake();
  }
  
  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
```

### User Preference Integration

Allow users to control power behavior:

```javascript
// options.js
class UserPreferencePowerManager {
  constructor() {
    this.loadPreferences();
  }
  
  async loadPreferences() {
    const prefs = await chrome.storage.sync.get([
      'preventSleep',
      'sleepPreventionLevel',
      'autoReleaseMinutes'
    ]);
    
    this.enabled = prefs.preventSleep || false;
    this.level = prefs.sleepPreventionLevel || 'display';
    this.autoReleaseTime = (prefs.autoReleaseMinutes || 10) * 60 * 1000;
  }
  
  async requestIfEnabled(taskDescription) {
    await this.loadPreferences();
    
    if (!this.enabled) return false;
    
    chrome.power.requestKeepAwake(this.level);
    
    if (this.autoReleaseTime) {
      setTimeout(() => {
        chrome.power.releaseKeepAwake();
        console.log(`Auto-released after ${this.autoReleaseTime}ms for: ${taskDescription}`);
      }, this.autoReleaseTime);
    }
    
    return true;
  }
}
```

### Battery Status Integration (Experimental)

When available, use battery information to make intelligent decisions:

```javascript
// experimental: may require additional permissions
async function requestPowerBasedOnBattery() {
  if (!navigator.getBattery) {
    // Fallback: request anyway
    chrome.power.requestKeepAwake('display');
    return;
  }
  
  try {
    const battery = await navigator.getBattery();
    
    if (!battery.charging && battery.level < 0.2) {
      // Low battery: be conservative
      console.log('Low battery: using conservative power mode');
      chrome.power.requestKeepAwake('display');
    } else {
      // Normal operation
      chrome.power.requestKeepAwake('display');
    }
    
    // Listen for battery changes
    battery.addEventListener('levelchange', () => handleBatteryChange(battery));
    battery.addEventListener('chargingchange', () => handleBatteryChange(battery));
    
  } catch (error) {
    console.error('Battery API error:', error);
    chrome.power.requestKeepAwake('display');
  }
}

function handleBatteryChange(battery) {
  if (!battery.charging && battery.level < 0.1) {
    // Critical: suggest stopping
    notifyUser('Critical battery level. Consider pausing power-intensive tasks.');
  }
}
```

### Progressive Enhancement Pattern

Start with minimal power requirements and escalate only when necessary:

```javascript
class ProgressivePowerManager {
  constructor() {
    this.currentLevel = null;
  }
  
  async requestForTask(taskType, priority = 'normal') {
    // Start with display level
    let requestedLevel = 'display';
    
    // Escalate based on task requirements
    switch (taskType) {
      case 'video-capture':
      case 'large-download':
        requestedLevel = priority === 'high' ? 'system' : 'display';
        break;
      case 'presentation':
      case 'media-playback':
        requestedLevel = 'display';
        break;
      case 'background-sync':
        requestedLevel = 'display';
        break;
      default:
        requestedLevel = 'display';
    }
    
    // Only upgrade, never downgrade while active
    if (this.currentLevel === 'system') {
      return; // Already at highest level
    }
    
    if (this.currentLevel === 'display' && requestedLevel === 'system') {
      chrome.power.releaseKeepAwake();
      chrome.power.requestKeepAwake('system');
      this.currentLevel = 'system';
    } else if (!this.currentLevel) {
      chrome.power.requestKeepAwake(requestedLevel);
      this.currentLevel = requestedLevel;
    }
  }
  
  release() {
    chrome.power.releaseKeepAwake();
    this.currentLevel = null;
  }
}
```

## Best Practices

### Always Pair Request with Release

Every `requestKeepAwake` should have a corresponding `releaseKeepAwake`. Use try-finally blocks to ensure release happens even when errors occur.

### Prefer Display Over System Level

Use display level whenever possible. System level significantly impacts battery life and should be reserved for operations that truly require it.

### Set Appropriate Timeouts

Implement auto-release timeouts to prevent unintended power consumption:

```javascript
function withTimeout(requestFn, timeoutMs = 300000) {
  requestFn();
  
  setTimeout(() => {
    chrome.power.releaseKeepAwake();
    console.log('Power released due to timeout');
  }, timeoutMs);
}
```

### Listen for Extension Lifecycle Events

Clean up power requests when the extension is suspended or unloaded:

```javascript
chrome.runtime.onSuspend.addListener(() => {
  chrome.power.releaseKeepAwake();
  console.log('Extension suspended: power released');
});
```

### Provide User Control

Include options for users to configure power behavior:

```json
{
  "permissions": ["storage"],
  "options_page": "options.html"
}
```

```javascript
// options.html handler
document.getElementById('preventSleep').addEventListener('change', (e) => {
  chrome.storage.sync.set({ preventSleep: e.target.checked });
});
```

## Summary

The Chrome Power API is essential for building extensions that need to maintain active sessions without user interaction. Key takeaways:

1. Use `chrome.power.requestKeepAwake(level)` to prevent sleep, with `'display'` being the battery-friendly default
2. Always pair requests with `chrome.power.releaseKeepAwake()` to avoid battery drain
3. Implement timeouts and user preferences for responsible power management
4. Choose the appropriate level based on your use case, display for visual content, system for background processing
5. Follow battery-conscious design patterns to create extensions that respect user resources

By implementing these patterns, your extensions will provide reliable functionality while maintaining responsible power consumption.
