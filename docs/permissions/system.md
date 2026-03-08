---
title: "System.* Permissions (Chrome Extension API)"
description: "The `system.*` permissions provide access to hardware and system information. Each is a separate permission. { "permissions": ["system.cpu"] } No user warning."
permalink: /permissions/system/
category: permissions
order: 40
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/system/"
---

# System.* Permissions (Chrome Extension API)

## Overview
The `system.*` permissions provide access to hardware and system information. Each is a separate permission.

## system.cpu
```json
{ "permissions": ["system.cpu"] }
```
No user warning.
```typescript
const cpuInfo = await chrome.system.cpu.getInfo();
console.log(`Architecture: ${cpuInfo.archName}`);
console.log(`Model: ${cpuInfo.modelName}`);
console.log(`Cores: ${cpuInfo.numOfProcessors}`);
console.log(`Features: ${cpuInfo.features.join(', ')}`);
// Per-processor usage
cpuInfo.processors.forEach((p, i) => {
  const total = p.usage.total;
  const idle = p.usage.idle;
  console.log(`Core ${i}: ${((total - idle) / total * 100).toFixed(1)}% used`);
});
```

## system.memory
```json
{ "permissions": ["system.memory"] }
```
No user warning.
```typescript
const memInfo = await chrome.system.memory.getInfo();
console.log(`Total: ${(memInfo.capacity / 1024 / 1024 / 1024).toFixed(1)} GB`);
console.log(`Available: ${(memInfo.availableCapacity / 1024 / 1024 / 1024).toFixed(1)} GB`);
```

## system.storage
```json
{ "permissions": ["system.storage"] }
```
No user warning.
```typescript
const storageUnits = await chrome.system.storage.getInfo();
for (const unit of storageUnits) {
  console.log(`${unit.name} (${unit.type}): ${(unit.capacity / 1024 / 1024 / 1024).toFixed(1)} GB`);
  // unit.type: 'fixed', 'removable', 'unknown'
}

// Eject removable storage
await chrome.system.storage.ejectDevice(storageId);

// Watch for attach/detach
chrome.system.storage.onAttached.addListener((info) => {
  console.log(`Attached: ${info.name}`);
});
chrome.system.storage.onDetached.addListener((id) => {
  console.log(`Detached: ${id}`);
});
```

## system.display
```json
{ "permissions": ["system.display"] }
```
No user warning.
```typescript
const displays = await chrome.system.display.getInfo();
for (const d of displays) {
  console.log(`${d.name}: ${d.bounds.width}x${d.bounds.height}`);
  console.log(`  Primary: ${d.isPrimary}`);
  console.log(`  Internal: ${d.isInternal}`);
  console.log(`  DPI: ${d.dpiX}x${d.dpiY}`);
  console.log(`  Rotation: ${d.rotation}°`);
}

// Watch for display changes
chrome.system.display.onDisplayChanged.addListener(async () => {
  const displays = await chrome.system.display.getInfo();
  console.log(`Display config changed: ${displays.length} displays`);
});
```

## System Monitor Pattern
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { createMessenger } from '@theluckystrike/webext-messaging';

const schema = defineSchema({ lastCpuUsage: 'number', lastMemUsage: 'number' });
const storage = createStorage(schema, 'local');

type Messages = {
  GET_SYSTEM_INFO: { request: {}; response: { cpu: string; memory: string; storage: string; displays: number } };
};
const m = createMessenger<Messages>();

m.onMessage('GET_SYSTEM_INFO', async () => {
  const cpu = await chrome.system.cpu.getInfo();
  const mem = await chrome.system.memory.getInfo();
  const stor = await chrome.system.storage.getInfo();
  const disp = await chrome.system.display.getInfo();
  return {
    cpu: `${cpu.modelName} (${cpu.numOfProcessors} cores)`,
    memory: `${(mem.availableCapacity / 1024 / 1024 / 1024).toFixed(1)} / ${(mem.capacity / 1024 / 1024 / 1024).toFixed(1)} GB`,
    storage: stor.map(s => `${s.name}: ${(s.capacity / 1024 / 1024 / 1024).toFixed(0)} GB`).join(', '),
    displays: disp.length
  };
});
```

## When to Use
- System monitoring/dashboard extensions
- Hardware information display
- Storage management tools
- Multi-monitor aware extensions
- Performance diagnostics

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const hasCpu = await checkPermission('system.cpu');
const hasMem = await checkPermission('system.memory');
```

## Cross-References
- Guide: `docs/guides/memory-management.md`
- Guide: `docs/guides/performance.md`
