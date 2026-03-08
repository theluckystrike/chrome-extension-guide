---
layout: default
title: "Chrome System API Complete Reference"
description: "The Chrome System API provides access to system hardware and resource information including CPU, memory, storage devices, and display configurations."
---

# chrome.system API Reference

The `chrome.system` API provides extensions with access to system hardware and resource information. This API enables extensions to adapt their behavior based on the capabilities and state of the underlying hardware.

## Overview

The chrome.system API is organized into several sub-APIs, each providing access to different system resources:

- **chrome.system.cpu** - CPU information and usage statistics
- **chrome.system.memory** - Physical memory information
- **chrome.system.storage** - Storage device information
- **chrome.system.display** - Display and monitor configuration

Each sub-API requires its own permission in the extension manifest. Request only the permissions you need to minimize the permissions surface of your extension.

## chrome.system.cpu

### Permission

```json
"permissions": ["system.cpu"]
```

### Methods

#### getInfo()

Retrieves information about the CPU on the system.

```javascript
chrome.system.cpu.getInfo(callback)
```

**Parameters:**
- `callback` (function): Called with the CPU information.

**Returns:** A [CpuInfo](#cpuinfo) object containing:
- `numOfProcessors` (number): The number of logical processors on the system.
- `archName` (string): The architecture name (e.g., "x86", "arm").
- `modelName` (string): The CPU model name.
- `features` (string[]): Available CPU features (e.g., "mmx", "sse", "sse2").
- `processors` (ProcessorInfo[]): Array of processor information.

#### ProcessorInfo

Each processor object contains:
- `usage` (object): Cumulative CPU usage statistics
  - `user` (number): Cumulative time in user mode (milliseconds)
  - `kernel` (number): Cumulative time in kernel mode (milliseconds)
  - `idle` (number): Cumulative time in idle mode (milliseconds)
  - `total` (number): Total cumulative time (milliseconds)

### Use Cases

- **Adaptive Performance**: Reduce computational work on systems with weaker CPUs
- **Resource Monitoring**: Display CPU usage information in extension dashboards
- **Performance Profiling**: Collect CPU statistics to optimize extension behavior

## chrome.system.memory

### Permission

```json
"permissions": ["system.memory"]
```

### Methods

#### getInfo()

Retrieves physical memory information.

```javascript
chrome.system.memory.getInfo(callback)
```

**Parameters:**
- `callback` (function): Called with the memory information.

**Returns:** A [MemoryInfo](#memoryinfo) object containing:
- `capacity` (number): Total physical memory in bytes.
- `availableCapacity` (number): Available memory in bytes.

### Use Cases

- **Memory-Aware Caching**: Adjust cache sizes based on available memory
- **Resource Management**: Warn users when memory is low
- **Adaptive Behavior**: Reduce memory footprint on constrained devices

## chrome.system.storage

### Permission

```json
"permissions": ["system.storage"]
```

### Methods

#### getInfo()

Retrieves information about storage devices attached to the system.

```javascript
chrome.system.storage.getInfo(callback)
```

**Returns:** An array of [StorageUnitInfo](#storageunitinfo) objects:
- `id` (string): Unique identifier for the storage device.
- `name` (string): Display name of the storage device.
- `type` (string): Type of storage ("fixed", "removable", or "unknown").
- `capacity` (number): Total storage capacity in bytes.

#### ejectDevice(deviceId)

Ejects a removable storage device.

```javascript
chrome.system.storage.ejectDevice(deviceId, callback)
```

**Parameters:**
- `deviceId` (string): The unique ID of the storage device to eject.
- `callback` (function): Called with the result status ("success", "in_use", "no_such_device", or "failure").

#### getAvailableCapacity(deviceId)

Gets the available capacity for a specific storage device.

```javascript
chrome.system.storage.getAvailableCapacity(deviceId, callback)
```

**Parameters:**
- `deviceId` (string): The unique ID of the storage device.
- `callback` (function): Called with the available capacity.

### Events

#### onAttached

Fired when a removable storage device is attached.

```javascript
chrome.system.storage.onAttached.addListener(callback)
```

#### onDetached

Fired when a removable storage device is detached.

```javascript
chrome.system.storage.onDetached.addListener(callback)
```

### Use Cases

- **Removable Media Management**: Monitor USB drives and SD cards
- **Storage Monitoring**: Display available space to users
- **File Operations**: Direct file I/O to specific storage devices

## chrome.system.display

### Permission

```json
"permissions": ["system.display"]
```

### Methods

#### getInfo(flags?)

Retrieves information about all displays connected to the system.

```javascript
chrome.system.display.getInfo(callback)
chrome.system.display.getInfo({ singleUnified: true }, callback)
```

**Parameters:**
- `flags` (object, optional): Configuration options
  - `singleUnified` (boolean): If true, returns display info in a unified structure for Chrome OS.

**Returns:** An array of [DisplayInfo](#displayinfo) objects:
- `id` (string): Unique identifier for the display.
- `name` (string): Display name (e.g., "HDMI-1", "Built-in display").
- `bounds` (object): Display bounds { x, y, width, height }.
- `workArea` (object): Usable area excluding system UI { x, y, width, height }.
- `dpiX` (number): Horizontal DPI.
- `dpiY` (number): Vertical DPI.
- `rotation` (number): Screen rotation in degrees (0, 90, 180, 270).
- `isPrimary` (boolean): Whether this is the primary display.
- `isEnabled` (boolean): Whether the display is enabled.
- `isInternal` (boolean): Whether the display is internal (e.g., laptop panel).

#### setDisplayProperties(id, info)

Modifies display properties. Most properties only work on Chrome OS.

```javascript
chrome.system.display.setDisplayProperties(id, info, callback)
```

**Parameters:**
- `id` (string): The display identifier.
- `info` (object): Properties to set
  - `mirroringSourceId` (string): Source display ID for mirroring
  - `modeId` (string): Display mode ID
  - `rotation` (number): Screen rotation
  - `boundsOriginX`, `boundsOriginY` (number): Position for extended desktop

### Events

#### onDisplayChanged

Fired when the display configuration changes.

```javascript
chrome.system.display.onDisplayChanged.addListener(callback)
```

### Use Cases

- **Multi-Monitor Aware Extensions**: Position popups and windows appropriately
- **Display Information**: Show users details about their monitor setup
- **DPI-Aware Rendering**: Adjust UI scaling based on DPI

## Manifest Declaration

To use the chrome.system API, declare the required permissions in your manifest:

```json
{
  "name": "My System Extension",
  "version": "1.0",
  "permissions": [
    "system.cpu",
    "system.memory",
    "system.storage",
    "system.display"
  ]
}
```

Request only the specific sub-permissions your extension needs. For example, if you only need CPU information:

```json
{
  "permissions": ["system.cpu"]
}
```

## Code Examples

### Display System Info Dashboard

```javascript
async function showSystemInfo() {
  const cpuInfo = await chrome.system.cpu.getInfo();
  const memInfo = await chrome.system.memory.getInfo();
  
  console.log(`CPU: ${cpuInfo.modelName}`);
  console.log(`Processors: ${cpuInfo.numOfProcessors}`);
  console.log(`Total Memory: ${(memInfo.capacity / 1e9).toFixed(2)} GB`);
  console.log(`Available Memory: ${(memInfo.availableCapacity / 1e9).toFixed(2)} GB`);
}
```

### Adaptive Behavior Based on CPU/Memory

```javascript
async function adaptToSystemCapabilities() {
  const memInfo = await chrome.system.memory.getInfo();
  const memGB = memInfo.capacity / 1e9;
  
  // Adjust caching strategy based on available memory
  if (memGB < 4) {
    setCacheSize(50); // Conservative for low-memory systems
  } else if (memGB < 8) {
    setCacheSize(200);
  } else {
    setCacheSize(1000); // Generous for high-memory systems
  }
}
```

### Monitor Removable Storage Devices

```javascript
// Listen for removable storage attachment
chrome.system.storage.onAttached.addListener((device) => {
  console.log(`Storage attached: ${device.name} (${device.id})`);
});

chrome.system.storage.onDetached.addListener((deviceId) => {
  console.log(`Storage detached: ${deviceId}`);
});

// Get storage info
const devices = await chrome.system.storage.getInfo();
const removable = devices.filter(d => d.type === 'removable');
```

### Multi-Monitor Aware Extension

```javascript
async function positionOnSecondMonitor() {
  const displays = await chrome.system.display.getInfo();
  const primary = displays.find(d => d.isPrimary);
  const secondary = displays.find(d => !d.isPrimary);
  
  if (secondary) {
    // Open side panel on secondary display
    await chrome.sidePanel.setOptions({
      path: 'panel.html',
      tabId: activeTab.id
    });
  }
}
```

## Cross-References

- [Permissions Overview](/docs/permissions/overview.md) - Understanding Chrome extension permissions
- [System Permissions](/docs/permissions/system.md) - Detailed information on system-related permissions

## Additional Resources

- [Chrome System API Official Documentation](https://developer.chrome.com/docs/extensions/system-api)
- [Manifest Permissions Format](/docs/permissions/overview.md)
