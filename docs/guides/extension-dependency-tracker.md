# Building an Extension Dependency Tracker

## Introduction

An Extension Dependency Tracker monitors and visualizes dependencies between browser extensions. This guide covers building a complete MV3 extension with TypeScript and production-ready architecture.

## Architecture Overview

- Popup: Quick dependency status view
- Sidebar: Full visualization and management
- Background Service Worker: Data collection and scheduling

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "Extension Dependency Tracker",
  "version": "1.0.0",
  "permissions": ["management", "storage", "alarms"],
  "background": { "service_worker": "background.js", "type": "module" },
  "action": { "default_popup": "popup.html" },
  "side_panel": { "default_path": "sidebar.html" },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
}
```

## TypeScript Types

```typescript
export interface ExtensionInfo {
  id: string; name: string; version: string; description: string;
  enabled: boolean; permissions: string[]; iconUrl?: string;
}

export interface DependencyNode {
  id: string; extension: ExtensionInfo;
  dependents: string[]; dependencies: string[]; lastUpdated: number;
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Array<{ from: string; to: string }>;
  lastScan: number;
}
```

## Background Service Worker

```typescript
// background/service.ts
import { ExtensionInfo, DependencyGraph } from '../types';

interface TrackerState {
  graph: DependencyGraph; isScanning: boolean; errors: string[];
}

class DependencyTracker {
  private state: TrackerState = {
    graph: { nodes: new Map(), edges: [], lastScan: 0 },
    isScanning: false, errors: []
  };

  async initialize(): Promise<void> {
    await this.loadState();
    chrome.alarms.create('scan', { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener(() => this.scanExtensions());
    chrome.management.onInstalled.addListener(() => this.scanExtensions());
    chrome.management.onUninstalled.addListener(() => this.scanExtensions());
  }

  private async loadState(): Promise<void> {
    const stored = await chrome.storage.local.get('tracker_state');
    if (stored.tracker_state) this.state = stored.tracker_state;
  }

  async scanExtensions(): Promise<DependencyGraph> {
    if (this.state.isScanning) return this.state.graph;
    this.state.isScanning = true;
    try {
      const extensions = await this.getInstalledExtensions();
      this.state.graph = await this.buildGraph(extensions);
      await chrome.storage.local.set({ tracker_state: this.state });
      chrome.runtime.sendMessage({ event: 'scan_complete', data: this.state.graph });
    } catch (e) {
      this.state.errors.push(e instanceof Error ? e.message : 'Error');
    } finally { this.state.isScanning = false; }
    return this.state.graph;
  }

  private getInstalledExtensions(): Promise<ExtensionInfo[]> {
    return new Promise((resolve, reject) => {
      chrome.management.getAll(exts => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(exts.filter(e => e.type === 'extension' && e.id !== chrome.runtime.id)
          .map(e => ({ id: e.id, name: e.name, version: e.version, description: e.description || '',
            enabled: e.enabled, permissions: e.permissions || [], iconUrl: e.icons?.[0]?.url })));
      });
    });
  }

  private async buildGraph(extensions: ExtensionInfo[]): Promise<DependencyGraph> {
    const nodes = new Map<string, DependencyNode>();
    const edges: Array<{ from: string; to: string }> = [];
    const critical = ['storage', 'cookies', 'webRequest', 'tabs', 'bookmarks'];

    extensions.forEach(ext => nodes.set(ext.id, {
      id: ext.id, extension: ext, dependents: [], dependencies: [], lastUpdated: Date.now()
    }));

    for (const ext of extensions) {
      const node = nodes.get(ext.id)!;
      for (const other of extensions) {
        if (ext.id === other.id) continue;
        if (ext.permissions.some(p => other.permissions.includes(p) && critical.includes(p))) {
          node.dependencies.push(other.id);
          nodes.get(other.id)!.dependents.push(ext.id);
          edges.push({ from: ext.id, to: other.id });
        }
      }
    }
    return { nodes, edges, lastScan: Date.now() };
  }

  getGraph(): DependencyGraph { return this.state.graph; }
}

export const tracker = new DependencyTracker();
```

## Message Handling

```typescript
// background/messages.ts
import { tracker } from './service';

const handlers: Record<string, () => Promise<{ success: boolean; data?: unknown }>> = {
  get_graph: async () => ({ success: true, data: tracker.getGraph() }),
  scan: async () => ({ success: true, data: await tracker.scanExtensions() }),
};

chrome.runtime.onMessage.addListener((msg, _, send) => {
  handlers[msg.action]?.().then(send).catch(e => send({ success: false, error: e.message }));
  return true;
});
```

## Popup UI

```typescript
// popup/popup.ts
class PopupController {
  private graph: DependencyGraph | null = null;
  constructor() { this.init(); }

  private async init(): Promise<void> {
    const res = await this.send({ action: 'get_graph' });
    if (res.success) this.graph = res.data as DependencyGraph;
    this.render();
  }

  private send(msg: { action: string }): Promise<{ success: boolean; data?: unknown }> {
    return new Promise(r => chrome.runtime.sendMessage(msg, r || { success: false }));
  }

  private render(): void {
    const el = document.getElementById('app');
    if (!el) return;
    const total = this.graph?.nodes.size || 0;
    const deps = this.graph?.edges.length || 0;
    el.innerHTML = `<h1>Dependency Tracker</h1>
      <div class="stats"><span>${total} Extensions</span><span>${deps} Dependencies</span></div>
      <button id="scan">Scan Now</button>
      <button id="sidebar">Open Full View</button>`;
    document.getElementById('scan')?.addEventListener('click', async () => {
      await this.send({ action: 'scan' });
      this.init();
    });
    document.getElementById('sidebar')?.addEventListener('click', () =>
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT }));
  }
}
document.addEventListener('DOMContentLoaded', () => new PopupController());
```

## Sidebar UI

```typescript
// sidebar/sidebar.ts
class SidebarController {
  private graph: DependencyGraph | null = null;
  constructor() { this.init(); }

  private async init(): Promise<void> {
    const res = await this.send({ action: 'get_graph' });
    if (res.success) this.graph = res.data as DependencyGraph;
    this.render();
    chrome.runtime.onMessage.addListener(msg => {
      if (msg.event === 'scan_complete') {
        this.graph = msg.data as DependencyGraph;
        this.render();
      }
    });
  }

  private send(msg: { action: string }): Promise<{ success: boolean; data?: unknown }> {
    return new Promise(r => chrome.runtime.sendMessage(msg, r || { success: false }));
  }

  private render(): void {
    const el = document.getElementById('sidebar');
    if (!el || !this.graph) return;
    const nodes = Array.from(this.graph.nodes.values());
    el.innerHTML = `<header><h1>Dependency Tracker</h1><button id="refresh">Refresh</button></header>
      <div class="nodes">${nodes.map(n => `<div class="node" data-id="${n.id}">
        <b>${n.extension.name}</b>
        <span>${n.dependencies.length} deps, ${n.dependents.length} used by</span>
      </div>`).join('')}</div>`;
    el.querySelectorAll('.node').forEach(n => n.addEventListener('click', () => this.showDetails(n.getAttribute('data-id')!)));
    document.getElementById('refresh')?.addEventListener('click', () => this.init());
  }

  private showDetails(id: string): void {
    const n = this.graph?.nodes.get(id);
    if (!n) return;
    const el = document.getElementById('details');
    if (el) el.innerHTML = `<h2>${n.extension.name}</h2><p>v${n.extension.version}</p>
      <p>Enabled: ${n.extension.enabled}</p>
      <h3>Permissions</h3><ul>${n.extension.permissions.map(p => `<li>${p}</li>`).join('')}</ul>`;
  }
}
document.addEventListener('DOMContentLoaded', () => new SidebarController());
```

## Chrome APIs

| API | Permission | Purpose |
|-----|------------|---------|
| `chrome.management` | management | List installed extensions |
| `chrome.storage` | storage | Persist graph data |
| `chrome.alarms` | alarms | Schedule periodic scans |
| `chrome.sidePanel` | - | Open sidebar |

## Storage Pattern

```typescript
class Storage<T> {
  constructor(private key: string) {}
  async get(): Promise<T | null> { return (await chrome.storage.local.get(this.key))[this.key] as T; }
  async set(v: T): Promise<void> { await chrome.storage.local.set({ [this.key]: v }); }
}
```

## Error Handling

```typescript
class ExtensionError extends Error {
  constructor(msg: string, public code: string, public recoverable = true) { super(msg); this.name = 'ExtensionError'; }
}
function handleError(e: unknown, ctx: string): ExtensionError {
  const msg = e instanceof Error ? e.message : 'Unknown';
  console.error(`[${ctx}]`, msg);
  return new ExtensionError(msg, 'ERROR', !msg.includes('Permission'));
}
```

## Testing

```typescript
describe('DependencyAnalyzer', () => {
  it('detects shared permissions', () => {
    const a = { id: 'a', permissions: ['storage', 'tabs'], name: 'A', version: '1', description: '', enabled: true };
    const b = { id: 'b', permissions: ['storage'], name: 'B', version: '1', description: '', enabled: true };
    expect(a.permissions.some(p => b.permissions.includes(p) && ['storage','cookies'].includes(p))).toBe(true);
  });
});
```

## Performance Tips

- Debounce scans, don't scan on every permission change
- Cache graph data in chrome.storage.local
- Lazy render only visible items
- Keep service worker cold start minimal

```typescript
function debounce<T extends Function>(fn: T, ms: number): T {
  let t: ReturnType<typeof setTimeout>;
  return ((...a: unknown[]) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }) as T;
}
```

## Publishing Checklist

### Pre-publish
- [ ] Run tests with 80%+ coverage
- [ ] Verify in Chrome, Edge, Brave, Opera
- [ ] Check performance metrics
- [ ] Review and minimize permissions
- [ ] Test edge cases

### Store Assets
- [ ] 128x128 and 440x280 icons (PNG)
- [ ] 1280x800 promo image
- [ ] Detailed description

### Documentation
- [ ] Privacy policy
- [ ] Support contact

### Post-publish
- [ ] Monitor error reports
- [ ] Plan update process
