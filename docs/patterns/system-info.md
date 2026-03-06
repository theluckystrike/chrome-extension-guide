# Chrome Extension System Info APIs

## Overview

Chrome provides a suite of `chrome.system.*` APIs that let extensions query hardware and system state — CPU information, memory usage, storage devices, and display configurations. These APIs are essential for building adaptive extensions that respond to the user's hardware capabilities, warn about low resources, or position windows correctly across multi-monitor setups.

Key facts:
- All `chrome.system.*` APIs require the `"system"` permission in `manifest.json`
- These APIs are **Chrome-only** (not available in Firefox or Safari)
- Most APIs return promises or use callbacks — we'll use promise-based patterns with TypeScript
- System info is static for CPU/display but dynamic for memory/storage

---

## Required Permissions

```jsonc
// manifest.json
{
  "permissions": [
    "system.cpu",
    "system.memory",
    "system.storage",
    "system.display"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

Note: The `system` permission is required to access any of the system info APIs. Each sub-API is accessed via its namespace (e.g., `chrome.system.cpu`).

---

## Pattern 1: Querying CPU Info and Core Count

The `chrome.system.cpu` API provides information about the computer's processors. This is useful for optimizations based on core count or for displaying system specifications to users.

### Basic CPU Information

```ts
// background.ts
interface CpuInfo {
  numOfProcessors: number;
  processorName: string;
  archName: string;
  modelName: string;
}

async function getCpuInfo(): Promise<CpuInfo> {
  const cpuInfo = await chrome.system.cpu.getInfo();
  
  return {
    numOfProcessors: cpuInfo.numOfProcessors,
    processorName: cpuInfo.processors?.[0]?.modelName ?? "Unknown",
    archName: cpuInfo.archName,
    modelName: cpuInfo.processors?.[0]?.usage?.full?.toString() ?? "N/A",
  };
}

// Example usage
getCpuInfo().then(info => {
  console.log(`CPU: ${info.processorName} (${info.numOfProcessors} cores)`);
  console.log(`Architecture: ${info.archName}`);
});
```

### CPU Usage Monitoring

The CPU API also provides per-core usage statistics that update periodically:

```ts
// background.ts
interface CpuUsage {
  coreIndex: number;
  idle: number;
  kernel: number;
  total: number;
  user: number;
}

async function getCpuUsagePerCore(): Promise<CpuUsage[]> {
  const cpuInfo = await chrome.system.cpu.getInfo();
  
  if (!cpuInfo.processors) {
    return [];
  }
  
  return cpuInfo.processors.map((processor, index) => {
    const usage = processor.usage;
    return {
      coreIndex: index,
      idle: usage.idle,
      kernel: usage.kernel,
      total: usage.total,
      user: usage.user,
    };
  });
}

// Calculate overall CPU usage percentage
function calculateOverallUsage(usage: CpuUsage[]): number {
  if (usage.length === 0) return 0;
  
  const totalIdle = usage.reduce((sum, core) => sum + core.idle, 0);
  const totalTotal = usage.reduce((sum, core) => sum + core.total, 0);
  
  return Math.round(((totalTotal - totalIdle) / totalTotal) * 100);
}

// Poll CPU usage every 2 seconds
setInterval(async () => {
  const usage = await getCpuUsagePerCore();
  const overallUsage = calculateOverallUsage(usage);
  console.log(`Current CPU usage: ${overallUsage}%`);
}, 2000);
```

### Storing CPU Info in Persistent Storage

Using `@theluckystrike/webext-storage` to cache CPU info:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const systemSchema = defineSchema({
  cpuCores: { type: "number", default: 0 },
  cpuModel: { type: "string", default: "" },
  cpuArch: { type: "string", default: "" },
  lastSystemScan: { type: "number", default: 0 },
});

const storage = createStorage(systemSchema);

async function scanAndStoreCpuInfo(): Promise<void> {
  const cpuInfo = await chrome.system.cpu.getInfo();
  
  await storage.set({
    cpuCores: cpuInfo.numOfProcessors,
    cpuModel: cpuInfo.processors?.[0]?.modelName ?? "Unknown",
    cpuArch: cpuInfo.archName,
    lastSystemScan: Date.now(),
  });
  
  console.log(`CPU info updated: ${cpuInfo.numOfProcessors} cores, ${cpuInfo.archName}`);
}

// Scan on startup
chrome.runtime.onStartup.addListener(scanAndStoreCpuInfo);
chrome.runtime.onInstalled.addListener(scanAndStoreCpuInfo);
```

---

## Pattern 2: Monitoring Available Memory

The `chrome.system.memory` API provides real-time memory information. This is critical for extensions that need to adapt their behavior based on available system resources.

### Basic Memory Information

```ts
// background.ts
interface MemoryInfo {
  totalMemory: number;      // in bytes
  availableMemory: number;  // in bytes
  usedMemory: number;       // calculated
  usagePercent: number;     // calculated
}

async function getMemoryInfo(): Promise<MemoryInfo> {
  const memInfo = await chrome.system.memory.getInfo();
  
  const totalMemory = memInfo.capacity;
  const availableMemory = memInfo.availableCapacity;
  const usedMemory = totalMemory - availableMemory;
  const usagePercent = Math.round((usedMemory / totalMemory) * 100);
  
  return {
    totalMemory,
    availableMemory,
    usedMemory,
    usagePercent,
  };
}

// Helper to format bytes to human-readable
function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

// Example usage
getMemoryInfo().then(info => {
  console.log(`Memory: ${formatBytes(info.usedMemory)} / ${formatBytes(info.totalMemory)} (${info.usagePercent}%)`);
});
```

### Continuous Memory Monitoring with Thresholds

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const settingsSchema = defineSchema({
  memoryWarningThreshold: { type: "number", default: 85 },  // percentage
  memoryCriticalThreshold: { type: "number", default: 95 },  // percentage
  lastMemoryWarning: { type: "number", default: 0 },
});

const storage = createStorage(settingsSchema);

type MemoryStatus = "normal" | "warning" | "critical";

let monitoringInterval: number | null = null;

async function checkMemoryAndAlert(): Promise<MemoryStatus> {
  const memInfo = await chrome.system.memory.getInfo();
  const total = memInfo.capacity;
  const used = total - memInfo.availableCapacity;
  const percent = Math.round((used / total) * 100);
  
  const settings = await storage.get(["memoryWarningThreshold", "memoryCriticalThreshold"]);
  
  let status: MemoryStatus = "normal";
  
  if (percent >= settings.memoryCriticalThreshold) {
    status = "critical";
    await handleCriticalMemory(percent);
  } else if (percent >= settings.memoryWarningThreshold) {
    status = "warning";
    await handleLowMemory(percent);
  }
  
  return status;
}

async function handleLowMemory(percent: number): Promise<void> {
  // Update badge to indicate warning state
  await chrome.action.setBadgeText({ text: `${percent}` });
  await chrome.action.setBadgeBackgroundColor({ color: "#FF9800" });
  console.warn(`Memory usage high: ${percent}%`);
}

async function handleCriticalMemory(percent: number): Promise<void> {
  // More aggressive warning - red badge
  await chrome.action.setBadgeText({ text: `${percent}` });
  await chrome.action.setBadgeBackgroundColor({ color: "#F44336" });
  console.error(`Critical memory usage: ${percent}%`);
  
  // Store timestamp of critical event
  await storage.set("lastMemoryWarning", Date.now());
}

function startMemoryMonitoring(intervalMs: number = 5000): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
  }
  
  // Initial check
  checkMemoryAndAlert();
  
  // Periodic monitoring
  monitoringInterval = window.setInterval(() => {
    checkMemoryAndAlert();
  }, intervalMs);
}

function stopMemoryMonitoring(): void {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  chrome.action.setBadgeText({ text: "" });
}

// Start monitoring on extension startup
chrome.runtime.onStartup.addListener(() => startMemoryMonitoring(5000));
```

---

## Pattern 3: Enumerating Storage Devices

The `chrome.system.storage` API provides information about connected storage devices. This is useful for detecting available drives, monitoring storage capacity, and warning users about low disk space.

### Listing All Storage Devices

```ts
// background.ts
interface StorageDeviceInfo {
  id: string;
  name: string;
  type: string;  // "fixed", "removable", "unknown"
  totalCapacity: number;
  availableCapacity: number;
}

async function getStorageDevices(): Promise<StorageDeviceInfo[]> {
  const devices = await chrome.system.storage.getInfo();
  
  return devices.map(device => ({
    id: device.id,
    name: device.name,
    type: device.type,
    totalCapacity: device.capacity,
    availableCapacity: device.availableCapacity,
  }));
}

// Example usage
getStorageDevices().then(devices => {
  devices.forEach(device => {
    const used = device.totalCapacity - device.availableCapacity;
    const percent = Math.round((used / device.totalCapacity) * 100);
    console.log(`${device.name}: ${percent}% used (${device.type})`);
  });
});
```

### Using Storage Info with WebExt Messaging

```ts
// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type SystemMessages = {
  "system:storage:list": { request: void; response: StorageDeviceInfo[] };
  "system:storage:getDevice": { request: { id: string }; response: StorageDeviceInfo | null };
};

const messenger = createMessenger<SystemMessages>();

// Handle messages from popup or content scripts
messenger.handle("system:storage:list", async () => {
  return await getStorageDevices();
});

messenger.handle("system:storage:getDevice", async ({ id }) => {
  const devices = await getStorageDevices();
  return devices.find(d => d.id === id) ?? null;
});
```

### Attaching Storage Change Listeners

The storage API can notify when devices are connected or disconnected:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storageSchema = defineSchema({
  knownDevices: { type: "object", default: {} },  // deviceId -> deviceInfo
  lastDeviceChange: { type: "number", default: 0 },
});

const systemStorage = createStorage(storageSchema);

async function handleStorageDeviceAttached(
  device: chrome.system.storage.StorageUnitInfo
): Promise<void> {
  console.log(`Storage device attached: ${device.name} (${device.id})`);
  
  // Update stored device list
  const knownDevices = await systemStorage.get("knownDevices");
  knownDevices[device.id] = {
    name: device.name,
    type: device.type,
    capacity: device.capacity,
    attachedAt: Date.now(),
  };
  
  await systemStorage.set("knownDevices", knownDevices);
  
  // Notify user
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/storage-connected.png",
    title: "Storage Connected",
    message: `${device.name} has been connected`,
  });
}

async function handleStorageDeviceDetached(deviceId: string): Promise<void> {
  console.log(`Storage device detached: ${deviceId}`);
  
  // Remove from stored devices
  const knownDevices = await systemStorage.get("knownDevices");
  delete knownDevices[deviceId];
  
  await systemStorage.set("knownDevices", knownDevices);
}

// Register event listeners
chrome.system.storage.onAttached.addListener(handleStorageDeviceAttached);
chrome.system.storage.onDetached.addListener(handleStorageDeviceDetached);

// Initialize device list on startup
chrome.runtime.onStartup.addListener(async () => {
  const devices = await getStorageDevices();
  const knownDevices: Record<string, unknown> = {};
  
  devices.forEach(device => {
    knownDevices[device.id] = {
      name: device.name,
      type: device.type,
      capacity: device.capacity,
    };
  });
  
  await systemStorage.set("knownDevices", knownDevices);
});
```

---

## Pattern 4: Detecting Display Configuration

The `chrome.system.display` API provides comprehensive information about connected displays, including resolution, DPI, orientation, and work area. This is essential for extensions that need to position windows or adapt UI to different screen configurations.

### Getting Display Information

```ts
// background.ts
interface DisplayInfo {
  id: string;
  name: string;
  bounds: { width: number; height: number; x: number; y: number };
  workArea: { width: number; height: number; x: number; y: number };
  isPrimary: boolean;
  isInternal: boolean;
  dpi: { x: number; y: number };
  rotation: number;
  touchSupport: boolean;
}

async function getDisplayInfo(): Promise<DisplayInfo[]> {
  const displays = await chrome.system.display.getInfo();
  
  return displays.map(display => ({
    id: display.id,
    name: display.name,
    bounds: display.bounds,
    workArea: display.workArea,
    isPrimary: display.isPrimary,
    isInternal: display.isInternal,
    dpi: { x: display.dpi.x, y: display.dpi.y },
    rotation: display.rotation,
    touchSupport: display.touchSupport === "enabled",
  }));
}

// Example: Find primary display
async function getPrimaryDisplay(): Promise<DisplayInfo | null> {
  const displays = await getDisplayInfo();
  return displays.find(d => d.isPrimary) ?? null;
}

// Example: Get total desktop size across all displays
async function getTotalDesktopSize(): Promise<{ width: number; height: number }> {
  const displays = await getDisplayInfo();
  
  let maxX = 0;
  let maxY = 0;
  
  displays.forEach(display => {
    const right = display.bounds.x + display.bounds.width;
    const bottom = display.bounds.y + display.bounds.height;
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });
  
  return { width: maxX, height: maxY };
}
```

### Listening for Display Changes

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const displaySchema = defineSchema({
  primaryDisplayId: { type: "string", default: "" },
  displayCount: { type: "number", default: 1 },
  lastDisplayChange: { type: "number", default: 0 },
});

const storage = createStorage(displaySchema);

async function handleDisplayChanged(
  displayInfo: chrome.system.display.DisplayInfo[]
): Promise<void> {
  console.log("Display configuration changed");
  
  // Update stored display info
  const primary = displayInfo.find(d => d.isPrimary);
  
  await storage.set({
    primaryDisplayId: primary?.id ?? "",
    displayCount: displayInfo.length,
    lastDisplayChange: Date.now(),
  });
  
  // Notify popup if open
  chrome.runtime.sendMessage({
    type: "DISPLAY_CONFIG_CHANGED",
    displays: displayInfo.length,
  });
}

chrome.system.display.onDisplayChanged.addListener(handleDisplayChanged);
```

---

## Pattern 5: Building a System Dashboard Popup

This pattern combines all system APIs into a live dashboard popup that shows real-time CPU, memory, storage, and display information.

### Popup HTML Structure

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      width: 320px; 
      padding: 16px; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
    }
    .card {
      background: white;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .card-title {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .stat-value { font-size: 24px; font-weight: 600; }
    .stat-label { font-size: 12px; color: #999; }
    .progress-bar {
      height: 6px;
      background: #eee;
      border-radius: 3px;
      margin-top: 8px;
      overflow: hidden;
    }
    .progress-fill { height: 100%; transition: width 0.3s; }
    .progress-fill.green { background: #4CAF50; }
    .progress-fill.orange { background: #FF9800; }
    .progress-fill.red { background: #F44336; }
    .device-list { font-size: 12px; }
    .device-item {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid #eee;
    }
    .last-update { font-size: 10px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-title">CPU</div>
    <div class="stat-value" id="cpu-usage">--</div>
    <div class="stat-label" id="cpu-cores">-- cores</div>
    <div class="progress-bar">
      <div class="progress-fill" id="cpu-bar" style="width: 0%"></div>
    </div>
  </div>
  
  <div class="card">
    <div class="card-title">Memory</div>
    <div class="stat-value" id="mem-usage">--</div>
    <div class="stat-label" id="mem-available">-- available</div>
    <div class="progress-bar">
      <div class="progress-fill" id="mem-bar" style="width: 0%"></div>
    </div>
  </div>
  
  <div class="card">
    <div class="card-title">Storage</div>
    <div class="device-list" id="storage-list"></div>
  </div>
  
  <div class="card">
    <div class="card-title">Displays</div>
    <div id="display-info">--</div>
  </div>
  
  <div class="last-update" id="last-update">Last updated: --</div>
  <script src="popup.js" type="module"></script>
</body>
</html>
```

### Popup TypeScript Implementation

```ts
// popup.ts
import { createMessenger, createClient } from "@theluckystrike/webext-messaging";

type DashboardMessages = {
  "dashboard:getStats": { 
    request: void; 
    response: {
      cpu: { usage: number; cores: number; model: string };
      memory: { used: number; total: number; percent: number };
      storage: Array<{ name: string; used: number; total: number; percent: number }>;
      display: { count: number; primary: string };
    }
  };
};

const messenger = createClient<DashboardMessages>();

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function getProgressColor(percent: number): string {
  if (percent >= 90) return "red";
  if (percent >= 70) return "orange";
  return "green";
}

function updateCPU(stats: { usage: number; cores: number; model: string }): void {
  const usageEl = document.getElementById("cpu-usage")!;
  const coresEl = document.getElementById("cpu-cores")!;
  const barEl = document.getElementById("cpu-bar")!;
  
  usageEl.textContent = `${stats.usage}%`;
  coresEl.textContent = `${stats.cores} cores • ${stats.model}`;
  barEl.style.width = `${stats.usage}%`;
  barEl.className = `progress-fill ${getProgressColor(stats.usage)}`;
}

function updateMemory(stats: { used: number; total: number; percent: number }): void {
  const usedEl = document.getElementById("mem-usage")!;
  const availEl = document.getElementById("mem-available")!;
  const barEl = document.getElementById("mem-bar")!;
  
  usedEl.textContent = `${stats.percent}%`;
  availEl.textContent = `${formatBytes(stats.total - stats.used)} available of ${formatBytes(stats.total)}`;
  barEl.style.width = `${stats.percent}%`;
  barEl.className = `progress-fill ${getProgressColor(stats.percent)}`;
}

function updateStorage(
  devices: Array<{ name: string; used: number; total: number; percent: number }>
): void {
  const listEl = document.getElementById("storage-list")!;
  listEl.innerHTML = devices.map(d => `
    <div class="device-item">
      <span>${d.name}</span>
      <span>${d.percent}% used</span>
    </div>
  `).join("");
}

function updateDisplay(stats: { count: number; primary: string }): void {
  const el = document.getElementById("display-info")!;
  el.textContent = `${stats.count} display(s) • Primary: ${stats.primary}`;
}

async function refreshDashboard(): Promise<void> {
  try {
    const stats = await messenger.sendMessage("dashboard:getStats", undefined);
    
    updateCPU(stats.cpu);
    updateMemory(stats.memory);
    updateStorage(stats.storage);
    updateDisplay(stats.display);
    
    document.getElementById("last-update")!.textContent = 
      `Last updated: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    console.error("Failed to get system stats:", error);
  }
}

// Initial load
refreshDashboard();

// Auto-refresh every 5 seconds
setInterval(refreshDashboard, 5000);
```

### Background Service Worker for Dashboard

```ts
// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type DashboardMessages = {
  "dashboard:getStats": { 
    request: void; 
    response: {
      cpu: { usage: number; cores: number; model: string };
      memory: { used: number; total: number; percent: number };
      storage: Array<{ name: string; used: number; total: number; percent: number }>;
      display: { count: number; primary: string };
    }
  };
};

const messenger = createMessenger<DashboardMessages>();

async function getCpuStats(): Promise<{ usage: number; cores: number; model: string }> {
  const cpuInfo = await chrome.system.cpu.getInfo();
  const cores = cpuInfo.numOfProcessors;
  const model = cpuInfo.processors?.[0]?.modelName ?? "Unknown";
  
  // For actual usage, we'd need to track deltas - using a simple approximation
  let totalIdle = 0;
  let totalTotal = 0;
  
  cpuInfo.processors?.forEach(p => {
    totalIdle += p.usage.idle;
    totalTotal += p.usage.total;
  });
  
  const usage = totalTotal > 0 
    ? Math.round(((totalTotal - totalIdle) / totalTotal) * 100)
    : 0;
  
  return { usage, cores, model };
}

async function getMemoryStats(): Promise<{ used: number; total: number; percent: number }> {
  const memInfo = await chrome.system.memory.getInfo();
  const total = memInfo.capacity;
  const available = memInfo.availableCapacity;
  const used = total - available;
  const percent = Math.round((used / total) * 100);
  
  return { used, total, percent };
}

async function getStorageStats(): Promise<Array<{ name: string; used: number; total: number; percent: number }>> {
  const devices = await chrome.system.storage.getInfo();
  
  return devices.map(device => {
    const used = device.capacity - device.availableCapacity;
    const percent = Math.round((used / device.capacity) * 100);
    return {
      name: device.name,
      used,
      total: device.capacity,
      percent,
    };
  });
}

async function getDisplayStats(): Promise<{ count: number; primary: string }> {
  const displays = await chrome.system.display.getInfo();
  const primary = displays.find(d => d.isPrimary);
  
  return {
    count: displays.length,
    primary: primary?.name ?? "Unknown",
  };
}

messenger.handle("dashboard:getStats", async () => {
  const [cpu, memory, storage, display] = await Promise.all([
    getCpuStats(),
    getMemoryStats(),
    getStorageStats(),
    getDisplayStats(),
  ]);
  
  return { cpu, memory, storage, display };
});
```

---

## Pattern 6: Adaptive Behavior Based on System Capabilities

This pattern demonstrates how to adapt extension behavior based on system resources. For example, disabling resource-intensive features when memory is low.

### Low-Memory Mode Implementation

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const settingsSchema = defineSchema({
  lowMemoryModeEnabled: { type: "boolean", default: false },
  lowMemoryThreshold: { type: "number", default: 80 },  // percentage
  features: {
    type: "object",
    default: {
      animationsEnabled: true,
      syncFrequencyMs: 30000,
      maxCachedItems: 100,
      backgroundProcessingEnabled: true,
    },
  },
});

const storage = createStorage(settingsSchema);

interface FeatureFlags {
  animationsEnabled: boolean;
  syncFrequencyMs: number;
  maxCachedItems: number;
  backgroundProcessingEnabled: boolean;
}

async function evaluateSystemCapabilities(): Promise<FeatureFlags> {
  const settings = await storage.get("features");
  const memInfo = await chrome.system.memory.getInfo();
  const cpuInfo = await chrome.system.cpu.getInfo();
  
  const memPercent = Math.round(
    ((memInfo.capacity - memInfo.availableCapacity) / memInfo.capacity) * 100
  );
  
  const isLowMemory = memPercent >= settings.lowMemoryThreshold;
  const hasFewCores = cpuInfo.numOfProcessors <= 2;
  
  await storage.set("lowMemoryModeEnabled", isLowMemory || hasFewCores);
  
  // Adapt features based on system capabilities
  if (isLowMemory || hasFewCores) {
    console.log("Low system capabilities detected - enabling power saving mode");
    return {
      animationsEnabled: false,
      syncFrequencyMs: 60000,  // Less frequent syncs
      maxCachedItems: 20,      // Fewer cached items
      backgroundProcessingEnabled: false,  // Disable background tasks
    };
  }
  
  return settings.features;
}

// Broadcast feature flags to all extension contexts
async function broadcastFeatureFlags(): Promise<void> {
  const flags = await evaluateSystemCapabilities();
  
  // Notify all tabs
  const tabs = await chrome.tabs.query({});
  tabs.forEach(tab => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "FEATURE_FLAGS_UPDATED",
        flags,
      }).catch(() => {});  // Ignore errors for tabs without content script
    }
  });
  
  // Store current flags for popup access
  await storage.set("currentFeatureFlags", flags);
}

// Monitor system and update feature flags
let capabilityCheckInterval: number | null = null;

function startCapabilityMonitoring(): void {
  // Initial evaluation
  broadcastFeatureFlags();
  
  // Check every 30 seconds
  capabilityCheckInterval = window.setInterval(broadcastFeatureFlags, 30000);
}

function stopCapabilityMonitoring(): void {
  if (capabilityCheckInterval) {
    clearInterval(capabilityCheckInterval);
    capabilityCheckInterval = null;
  }
}

// Content script listener for feature flags
/*
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FEATURE_FLAGS_UPDATED") {
    // Update UI based on flags
    if (!message.flags.animationsEnabled) {
      document.documentElement.classList.add("no-animations");
    }
  }
});
*/

chrome.runtime.onStartup.addListener(startCapabilityMonitoring);
chrome.runtime.onInstalled.addListener(startCapabilityMonitoring);
```

### Using Feature Flags in Content Script

```ts
// content-script.ts
interface FeatureFlags {
  animationsEnabled: boolean;
  syncFrequencyMs: number;
  maxCachedItems: number;
  backgroundProcessingEnabled: boolean;
}

let currentFlags: FeatureFlags | null = null;

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === "FEATURE_FLAGS_UPDATED") {
    currentFlags = message.flags;
    applyFeatureFlags();
  }
});

function applyFeatureFlags(): void {
  if (!currentFlags) return;
  
  // Disable CSS animations if not supported
  if (!currentFlags.animationsEnabled) {
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        transition-duration: 0.001ms !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Adjust cached items limit
  console.log(`Max cached items: ${currentFlags.maxCachedItems}`);
}

// Request initial flags
chrome.runtime.sendMessage({ type: "GET_FEATURE_FLAGS" }, (response) => {
  if (response?.flags) {
    currentFlags = response.flags;
    applyFeatureFlags();
  }
});
```

---

## Pattern 7: Storage Capacity Monitoring and User Warnings

Monitor storage devices and warn users when space is running low.

### Storage Warning System

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const storageSchema = defineSchema({
  warningThreshold: { type: "number", default: 90 },  // percentage
  criticalThreshold: { type: "number", default: 95 },  // percentage
  notifiedDevices: { type: "object", default: {} },  // deviceId -> "warning" | "critical" | null
  autoCleanupEnabled: { type: "boolean", default: false },
});

const systemStorage = createStorage(storageSchema);

interface StorageStatus {
  deviceId: string;
  deviceName: string;
  percentUsed: number;
  status: "normal" | "warning" | "critical";
}

async function checkStorageCapacities(): Promise<StorageStatus[]> {
  const devices = await chrome.system.storage.getInfo();
  const settings = await systemStorage.get(["warningThreshold", "criticalThreshold", "notifiedDevices"]);
  
  const results: StorageStatus[] = [];
  const updatedNotifications: Record<string, string> = { ...settings.notifiedDevices };
  
  for (const device of devices) {
    const used = device.capacity - device.availableCapacity;
    const percent = Math.round((used / device.capacity) * 100);
    
    let status: "normal" | "warning" | "critical" = "normal";
    
    if (percent >= settings.criticalThreshold) {
      status = "critical";
    } else if (percent >= settings.warningThreshold) {
      status = "warning";
    }
    
    // Only notify once per threshold crossing
    const lastNotified = settings.notifiedDevices[device.id];
    if (status !== "normal" && status !== lastNotified) {
      await sendStorageNotification(device, percent, status);
      updatedNotifications[device.id] = status;
    } else if (status === "normal" && lastNotified) {
      // Reset notification state when space is freed
      delete updatedNotifications[device.id];
    }
    
    results.push({
      deviceId: device.id,
      deviceName: device.name,
      percentUsed: percent,
      status,
    });
  }
  
  await systemStorage.set("notifiedDevices", updatedNotifications);
  return results;
}

async function sendStorageNotification(
  device: chrome.system.storage.StorageUnitInfo,
  percent: number,
  status: "warning" | "critical"
): Promise<void> {
  const isCritical = status === "critical";
  
  await chrome.notifications.create({
    type: "basic",
    iconUrl: isCritical ? "icons/storage-critical.png" : "icons/storage-warning.png",
    title: isCritical ? "Critical: Low Storage" : "Warning: Storage Running Low",
    message: `${device.name} is ${percent}% full. ${isCritical ? "Free up space immediately." : "Consider freeing up space."}`,
    priority: isCritical ? 2 : 1,
  });
  
  // Update badge
  await chrome.action.setBadgeText({ text: "⚠" });
  await chrome.action.setBadgeBackgroundColor({ 
    color: isCritical ? "#F44336" : "#FF9800" 
  });
}

// Periodic storage check
let storageCheckInterval: number | null = null;

function startStorageMonitoring(intervalMs: number = 60000): void {
  checkStorageCapacities();
  
  storageCheckInterval = window.setInterval(checkStorageCapacities, intervalMs);
}

function stopStorageMonitoring(): void {
  if (storageCheckInterval) {
    clearInterval(storageCheckInterval);
    storageCheckInterval = null;
  }
}

chrome.runtime.onStartup.addListener(() => startStorageMonitoring(60000));
```

---

## Pattern 8: Multi-Display Awareness for Window Positioning

This pattern shows how to position extension windows correctly on multi-monitor setups.

### Display-Aware Window Positioning

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const displaySchema = defineSchema({
  preferredDisplayId: { type: "string", default: "" },
  windowPosition: { type: "string", default: "bottom-right" },  // bottom-right, top-right, etc.
});

const storage = createStorage(displaySchema);

interface PositionConfig {
  displayId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

async function getPositionForDisplay(
  display: chrome.system.display.DisplayInfo,
  windowSize: { width: number; height: number }
): Promise<PositionConfig> {
  const settings = await storage.get("windowPosition");
  
  let x: number;
  let y: number;
  
  // Position within work area (excludes taskbar, dock, etc.)
  const workArea = display.workArea;
  
  switch (settings.windowPosition) {
    case "top-right":
      x = workArea.left + workArea.width - windowSize.width;
      y = workArea.top;
      break;
    case "top-left":
      x = workArea.left;
      y = workArea.top;
      break;
    case "bottom-left":
      x = workArea.left;
      y = workArea.top + workArea.height - windowSize.height;
      break;
    case "bottom-right":
    default:
      x = workArea.left + workArea.width - windowSize.width;
      y = workArea.top + workArea.height - windowSize.height;
      break;
  }
  
  return {
    displayId: display.id,
    x,
    y,
    width: windowSize.width,
    height: windowSize.height,
  };
}

async function openPopupOnCorrectDisplay(
  popupUrl: string,
  windowSize: { width: number; height: number }
): Promise<chrome.windows.Window> {
  const settings = await storage.get("preferredDisplayId");
  const displays = await chrome.system.display.getInfo();
  
  let targetDisplay: chrome.system.display.DisplayInfo;
  
  if (settings.preferredDisplayId) {
    targetDisplay = displays.find(d => d.id === settings.preferredDisplayId) 
      ?? displays.find(d => d.isPrimary)!
      ?? displays[0];
  } else {
    // Default to primary display
    targetDisplay = displays.find(d => d.isPrimary) ?? displays[0];
  }
  
  const position = await getPositionForDisplay(targetDisplay, windowSize);
  
  // Create window on the correct display
  return await chrome.windows.create({
    url: popupUrl,
    type: "popup",
    width: position.width,
    height: position.height,
    left: position.x,
    top: position.y,
    focused: true,
  });
}

// Example: Open dashboard on correct display
async function openDashboard(): Promise<void> {
  await openPopupOnCorrectDisplay("popup.html", { width: 320, height: 480 });
}

// Position a window on a specific display
async function positionWindowOnDisplay(
  windowId: number,
  displayId: string
): Promise<void> {
  const displays = await chrome.system.display.getInfo();
  const targetDisplay = displays.find(d => d.id === displayId);
  
  if (!targetDisplay) {
    throw new Error(`Display not found: ${displayId}`);
  }
  
  const window = await chrome.windows.get(windowId);
  
  await chrome.windows.update(windowId, {
    left: targetDisplay.workArea.left + 50,
    top: targetDisplay.workArea.top + 50,
    width: Math.min(window.width!, targetDisplay.workArea.width - 100),
    height: Math.min(window.height!, targetDisplay.workArea.height - 100),
  });
}
```

### Handling Display Changes for Open Windows

```ts
// background.ts
// Reposition windows when displays change

const openWindows = new Map<number, string>();  // windowId -> position preference

chrome.system.display.onDisplayChanged.addListener(async () => {
  const displays = await chrome.system.display.getInfo();
  
  // Get all extension popup windows
  const windows = await chrome.windows.getAll({ 
    types: ["popup"],
    populate: true,
  });
  
  for (const win of windows) {
    if (!win.id || !win.left || !win.top) continue;
    
    // Find which display this window is on
    let windowDisplay: chrome.system.display.DisplayInfo | undefined;
    
    for (const display of displays) {
      const { left, top, width, height } = display.bounds;
      if (
        win.left >= left &&
        win.left < left + width &&
        win.top >= top &&
        win.top < top + height
      ) {
        windowDisplay = display;
        break;
      }
    }
    
    // If window is now off-screen, reposition it
    if (!windowDisplay) {
      const primaryDisplay = displays.find(d => d.isPrimary) ?? displays[0];
      
      await chrome.windows.update(win.id, {
        left: primaryDisplay.workArea.left + 50,
        top: primaryDisplay.workArea.top + 50,
      });
      
      console.log(`Repositioned window ${win.id} to primary display`);
    }
  }
});
```

---

## Summary Table

| API | Key Methods | Use Case |
|-----|-------------|----------|
| `chrome.system.cpu` | `getInfo()` | Get core count, CPU model, architecture; monitor per-core usage |
| `chrome.system.memory` | `getInfo()` | Monitor available/used memory; implement low-memory adaptive features |
| `chrome.system.storage` | `getInfo()`, `onAttached`, `onDetached` | List storage devices, monitor capacity, detect device changes |
| `chrome.system.display` | `getInfo()`, `onDisplayChanged` | Get display bounds, DPI, orientation; position windows on multi-monitor setups |

### Common Patterns Summary

| Pattern | System APIs Used | Key Technique |
|---------|------------------|---------------|
| CPU Info | `chrome.system.cpu` | Cache static CPU info in storage; poll for usage |
| Memory Monitoring | `chrome.system.memory` | Periodic polling with threshold alerts |
| Storage Devices | `chrome.system.storage` | Event listeners for attach/detach |
| Display Detection | `chrome.system.display` | Handle `onDisplayChanged` for multi-monitor |
| Dashboard | All four APIs | Combine all data via messaging |
| Adaptive Behavior | `chrome.system.memory`, `cpu` | Feature flags based on system capabilities |
| Storage Warnings | `chrome.system.storage` | Threshold-based notifications |
| Window Positioning | `chrome.system.display` | Calculate position from `workArea` |

### Permissions Required

```json
{
  "permissions": [
    "system.cpu",
    "system.memory",
    "system.storage",
    "system.display"
  ]
}
```

---

## Additional Notes

- All `chrome.system.*` APIs are Chrome-only and require Manifest V3
- Memory and storage information may have slight delays; don't rely on real-time precision
- Display info includes `workArea` which accounts for taskbars and docks — use this for window positioning
- Consider privacy implications when collecting system information; explain usage to users if required
- For cross-browser extensions, provide fallbacks or feature detection for non-Chrome browsers
