# Building a CSS Grid Debugger Chrome Extension

This guide walks through building a production-ready CSS Grid Debugger extension using Chrome's modern extension APIs. You'll learn architecture patterns, TypeScript implementation, UI design, and deployment strategies.

## Architecture Overview

### Manifest Configuration (manifest.json)

The extension uses Manifest V3 with precise permissions for DOM inspection and script injection:

```json
{
  "manifest_version": 3,
  "name": "CSS Grid Debugger",
  "version": "1.0.0",
  "description": "Visual debugging tool for CSS Grid layouts",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content-script.js"],
    "run_at": "document_idle"
  }],
  "background": {
    "service_worker": "background/background.js",
    "type": "module"
  }
}
```

## Core Implementation with TypeScript

### Project Structure

```
css-grid-debugger/
 src/
    background/
       background.ts
    content/
       content-script.ts
       grid-analyzer.ts
       overlay-renderer.ts
       types.ts
    popup/
       popup.ts
       popup.html
    shared/
       storage.ts
       messaging.ts
    utils/
        dom.ts
        logger.ts
 manifest.json
 tsconfig.json
 webpack.config.js
```

### Type Definitions (src/content/types.ts)

Define clear interfaces for grid analysis data:

```typescript
export interface GridContainer {
  element: HTMLElement;
  computedStyle: ComputedGridStyle;
  rowCount: number;
  columnCount: number;
  rowGap: number;
  columnGap: number;
  templateAreas: string[][];
  autoFlow: string;
}

export interface ComputedGridStyle {
  display: string;
  gridTemplateRows: string;
  gridTemplateColumns: string;
  gridRowGap: string;
  gridColumnGap: string;
  gridTemplateAreas: string;
  gridAutoFlow: string;
}

export interface GridItem {
  element: HTMLElement;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
  area: string | null;
}

export interface GridAnalysis {
  containers: GridContainer[];
  items: Map<HTMLElement, GridItem>;
  selectedElement: HTMLElement | null;
}

export interface DebuggerState {
  isEnabled: boolean;
  showLineNumbers: boolean;
  showAreaNames: boolean;
  highlightColor: string;
  opacity: number;
}

export interface Message {
  type: 'GRID_ANALYSIS' | 'TOGGLE_DEBUG' | 'UPDATE_SETTINGS' | 'SELECT_ELEMENT';
  payload: unknown;
}
```

### Grid Analyzer (src/content/grid-analyzer.ts)

The core analysis engine parses computed styles and identifies grid containers:

```typescript
import { GridContainer, GridItem, GridAnalysis, ComputedGridStyle } from './types';

export class GridAnalyzer {
  private analysis: GridAnalysis;

  constructor() {
    this.analysis = {
      containers: [],
      items: new Map(),
      selectedElement: null,
    };
  }

  analyzeDocument(): GridAnalysis {
    this.analysis.containers = this.findGridContainers();
    this.analysis.items = this.analyzeGridItems();
    return this.analysis;
  }

  private findGridContainers(): GridContainer[] {
    const allElements = document.querySelectorAll<HTMLElement('*');
    const gridContainers: GridContainer[] = [];

    allElements.forEach((element) => {
      const computedStyle = this.getComputedGridStyle(element);
      if (computedStyle.display === 'grid') {
        const container = this.parseGridContainer(element, computedStyle);
        gridContainers.push(container);
      }
    });

    return gridContainers;
  }

  private getComputedGridStyle(element: HTMLElement): ComputedGridStyle {
    const style = window.getComputedStyle(element);
    return {
      display: style.display,
      gridTemplateRows: style.gridTemplateRows,
      gridTemplateColumns: style.gridTemplateColumns,
      gridRowGap: style.rowGap,
      gridColumnGap: style.columnGap,
      gridTemplateAreas: style.gridTemplateAreas,
      gridAutoFlow: style.gridAutoFlow,
    };
  }

  private parseGridContainer(
    element: HTMLElement,
    computedStyle: ComputedGridStyle
  ): GridContainer {
    const rowLines = this.parseTrackList(computedStyle.gridTemplateRows);
    const columnLines = this.parseTrackList(computedStyle.gridTemplateColumns);

    return {
      element,
      computedStyle,
      rowCount: rowLines.length,
      columnCount: columnLines.length,
      rowGap: this.parseGap(computedStyle.gridRowGap),
      columnGap: this.parseGap(computedStyle.gridColumnGap),
      templateAreas: this.parseTemplateAreas(computedStyle.gridTemplateAreas),
      autoFlow: computedStyle.gridAutoFlow,
    };
  }

  private parseTrackList(trackList: string): string[] {
    return trackList.split(' ').filter((track) => track !== 'none' && track !== '');
  }

  private parseGap(gap: string): number {
    return parseFloat(gap) || 0;
  }

  private parseTemplateAreas(areas: string): string[][] {
    if (areas === 'none' || !areas.trim()) return [];
    
    return areas.split('"')
      .filter((s) => s.trim())
      .map((row) => row.trim().split(/\s+/));
  }

  private analyzeGridItems(): Map<HTMLElement, GridItem> {
    const items = new Map<HTMLElement, GridItem>();

    this.analysis.containers.forEach((container) => {
      const children = container.element.children;
      Array.from(children).forEach((child) => {
        if (child instanceof HTMLElement) {
          const item = this.analyzeGridItem(child, container);
          items.set(child, item);
        }
      });
    });

    return items;
  }

  private analyzeGridItem(element: HTMLElement, container: GridContainer): GridItem {
    const style = window.getComputedStyle(element);
    
    return {
      element,
      rowStart: parseInt(style.gridRowStart, 10) || 1,
      rowEnd: parseInt(style.gridRowEnd, 10) || (this.getSpan(style.gridRowEnd) || container.rowCount + 1),
      columnStart: parseInt(style.gridColumnStart, 10) || 1,
      columnEnd: parseInt(style.gridColumnEnd, 10) || (this.getSpan(style.gridColumnEnd) || container.columnCount + 1),
      area: style.gridArea !== 'none' && !style.gridArea.includes('/') 
        ? style.gridArea 
        : null,
    };
  }

  private getSpan(value: string): number | null {
    const spanMatch = value.match(/span\s+(\d+)/);
    return spanMatch ? parseInt(spanMatch[1], 10) : null;
  }

  selectElement(element: HTMLElement): void {
    this.analysis.selectedElement = element;
  }
}
```

### Overlay Renderer (src/content/overlay-renderer.ts)

Creates visual overlays to highlight grid structure:

```typescript
import { GridAnalysis, GridContainer, GridItem, DebuggerState } from './types';

export class OverlayRenderer {
  private state: DebuggerState;
  private overlayContainer: HTMLDivElement | null = null;
  private activeOverlays: HTMLDivElement[] = [];

  constructor(initialState: DebuggerState) {
    this.state = initialState;
  }

  updateState(newState: Partial<DebuggerState>): void {
    this.state = { ...this.state, ...newState };
  }

  render(analysis: GridAnalysis): void {
    this.clearOverlays();
    
    if (!this.state.isEnabled) return;

    this.createOverlayContainer();
    
    analysis.containers.forEach((container) => {
      this.renderGridOverlay(container);
      this.renderGridItems(analysis.items, container);
    });
  }

  private createOverlayContainer(): void {
    if (this.overlayContainer) return;
    
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.id = 'css-grid-debugger-overlay';
    this.overlayContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
    `;
    document.body.appendChild(this.overlayContainer);
  }

  private renderGridOverlay(container: GridContainer): void {
    const rect = container.element.getBoundingClientRect();
    const overlay = document.createElement('div');
    
    overlay.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${this.state.highlightColor};
      background: ${this.state.highlightColor}20;
      pointer-events: none;
      box-sizing: border-box;
    `;

    if (this.state.showLineNumbers) {
      this.addLineNumbers(overlay, container);
    }

    if (this.state.showAreaNames && container.templateAreas.length > 0) {
      this.addAreaLabels(overlay, container);
    }

    this.overlayContainer?.appendChild(overlay);
    this.activeOverlays.push(overlay);
  }

  private addLineNumbers(overlay: HTMLDivElement, container: GridContainer): void {
    for (let row = 1; row <= container.rowCount; row++) {
      for (let col = 1; col <= container.columnCount; col++) {
        const label = document.createElement('div');
        const rowHeight = container.element.offsetHeight / container.rowCount;
        const colWidth = container.element.offsetWidth / container.columnCount;
        
        label.style.cssText = `
          position: absolute;
          top: ${(row - 1) * rowHeight + 4}px;
          left: ${(col - 1) * colWidth + 4}px;
          color: ${this.state.highlightColor};
          font-size: 10px;
          font-family: monospace;
          opacity: ${this.state.opacity};
        `;
        label.textContent = `${row},${col}`;
        overlay.appendChild(label);
      }
    }
  }

  private addAreaLabels(overlay: HTMLDivElement, container: GridContainer): void {
    const rowHeight = container.element.offsetHeight / container.rowCount;
    const colWidth = container.element.offsetWidth / container.columnCount;

    container.templateAreas.forEach((row, rowIndex) => {
      row.forEach((area, colIndex) => {
        if (area !== '.' && area) {
          const label = document.createElement('div');
          label.style.cssText = `
            position: absolute;
            top: ${rowIndex * rowHeight + rowHeight / 2 - 10}px;
            left: ${colIndex * colWidth + colWidth / 2 - 20}px;
            width: 40px;
            text-align: center;
            color: ${this.state.highlightColor};
            font-size: 12px;
            font-weight: bold;
            font-family: monospace;
            opacity: ${this.state.opacity};
          `;
          label.textContent = area;
          overlay.appendChild(label);
        }
      });
    });
  }

  private renderGridItems(
    items: Map<HTMLElement, GridItem>,
    container: GridContainer
  ): void {
    items.forEach((item, element) => {
      if (!container.element.contains(element)) return;
      
      const rect = element.getBoundingClientRect();
      const overlay = document.createElement('div');
      
      overlay.style.cssText = `
        position: absolute;
        top: ${rect.top + window.scrollY + 2}px;
        left: ${rect.left + window.scrollX + 2}px;
        width: ${rect.width - 4}px;
        height: ${rect.height - 4}px;
        border: 1px dashed ${this.state.highlightColor};
        background: ${this.state.highlightColor}10;
        pointer-events: none;
      `;

      if (item.area) {
        const label = document.createElement('div');
        label.style.cssText = `
          position: absolute;
          top: 2px;
          left: 2px;
          color: ${this.state.highlightColor};
          font-size: 10px;
          font-family: monospace;
        `;
        label.textContent = item.area;
        overlay.appendChild(label);
      }

      this.overlayContainer?.appendChild(overlay);
      this.activeOverlays.push(overlay);
    });
  }

  private clearOverlays(): void {
    this.activeOverlays.forEach((overlay) => overlay.remove());
    this.activeOverlays = [];
  }

  destroy(): void {
    this.clearOverlays();
    this.overlayContainer?.remove();
    this.overlayContainer = null;
  }
}
```

## Content Script Entry Point (src/content/content-script.ts)

Connects all components and handles messaging with the background script:

```typescript
import { GridAnalyzer } from './grid-analyzer';
import { OverlayRenderer } from './overlay-renderer';
import { DebuggerState, Message } from './types';
import { Logger } from '../utils/logger';

const logger = new Logger('content-script');

const defaultState: DebuggerState = {
  isEnabled: false,
  showLineNumbers: true,
  showAreaNames: true,
  highlightColor: '#ff6b6b',
  opacity: 0.8,
};

class GridDebugger {
  private analyzer: GridAnalyzer;
  private renderer: OverlayRenderer;
  private state: DebuggerState;
  private port: chrome.runtime.Port | null = null;

  constructor() {
    this.state = { ...defaultState };
    this.analyzer = new GridAnalyzer();
    this.renderer = new OverlayRenderer(this.state);
    
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.loadState();
      this.connectToBackground();
      this.setupMessageListener();
      this.setupClickHandler();
      
      logger.info('Grid Debugger initialized');
    } catch (error) {
      logger.error('Initialization failed', error);
    }
  }

  private async loadState(): Promise<void> {
    const stored = await chrome.storage.local.get('debuggerState');
    if (stored.debuggerState) {
      this.state = { ...this.state, ...stored.debuggerState };
    }
  }

  private connectToBackground(): void {
    this.port = chrome.runtime.connect({ name: 'grid-debugger' });
    
    this.port.onMessage.addListener((message: Message) => {
      this.handleMessage(message);
    });

    this.port.onDisconnect.addListener(() => {
      logger.warn('Disconnected from background script');
      this.port = null;
    });
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener(
      (message: Message, sender, sendResponse) => {
        this.handleMessage(message);
        sendResponse({ success: true });
      }
    );
  }

  private handleMessage(message: Message): void {
    switch (message.type) {
      case 'TOGGLE_DEBUG':
        this.toggleDebug();
        break;
      case 'UPDATE_SETTINGS':
        this.updateSettings(message.payload as Partial<DebuggerState>);
        break;
      case 'SELECT_ELEMENT':
        this.selectElement(message.payload as HTMLElement);
        break;
    }
  }

  private toggleDebug(): void {
    this.state.isEnabled = !this.state.isEnabled;
    this.saveState();
    
    if (this.state.isEnabled) {
      const analysis = this.analyzer.analyzeDocument();
      this.renderer.render(analysis);
    } else {
      this.renderer.clearOverlays();
    }

    this.notifyBackground();
  }

  private updateSettings(settings: Partial<DebuggerState>): void {
    this.state = { ...this.state, ...settings };
    this.saveState();
    this.renderer.updateState(settings);
    
    if (this.state.isEnabled) {
      const analysis = this.analyzer.analyzeDocument();
      this.renderer.render(analysis);
    }
  }

  private selectElement(element: HTMLElement): void {
    this.analyzer.selectElement(element);
    const analysis = this.analyzer.analyzeDocument();
    this.renderer.render(analysis);
  }

  private async saveState(): Promise<void> {
    try {
      await chrome.storage.local.set({ debuggerState: this.state });
    } catch (error) {
      logger.error('Failed to save state', error);
    }
  }

  private notifyBackground(): void {
    if (this.port) {
      this.port.postMessage({ type: 'STATE_CHANGED', payload: this.state });
    }
  }

  private setupClickHandler(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('#css-grid-debugger-overlay')) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new GridDebugger());
} else {
  new GridDebugger();
}
```

## Background Service Worker (src/background/background.ts)

Manages extension state and handles popup communications:

```typescript
import { DebuggerState, Message } from '../content/types';
import { Logger } from '../utils/logger';

const logger = new Logger('background');

chrome.runtime.onInstalled.addListener(() => {
  logger.info('Extension installed');
  
  chrome.storage.local.set({
    debuggerState: {
      isEnabled: false,
      showLineNumbers: true,
      showAreaNames: true,
      highlightColor: '#ff6b6b',
      opacity: 0.8,
    },
  });
});

chrome.runtime.onConnect.addListener((port) => {
  logger.info('Content script connected', port.name);
  
  port.onMessage.addListener((message: Message) => {
    handleMessage(message, port);
  });
});

async function handleMessage(message: Message, port: chrome.runtime.Port): Promise<void> {
  switch (message.type) {
    case 'STATE_CHANGED':
      await chrome.storage.local.set({
        debuggerState: message.payload as DebuggerState,
      });
      break;
      
    case 'GRID_ANALYSIS':
      logger.debug('Grid analysis requested');
      break;
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_DEBUG' });
  } catch (error) {
    logger.error('Failed to toggle debug', error);
  }
});
```

## Popup UI (src/popup/popup.ts)

User interface for quick settings adjustment:

```typescript
interface PopupState extends DebuggerState {}

document.addEventListener('DOMContentLoaded', async () => {
  const state = await loadState();
  initializeUI(state);
});

async function loadState(): Promise<PopupState> {
  const stored = await chrome.storage.local.get('debuggerState');
  return stored.debuggerState || getDefaultState();
}

function getDefaultState(): PopupState {
  return {
    isEnabled: false,
    showLineNumbers: true,
    showAreaNames: true,
    highlightColor: '#ff6b6b',
    opacity: 0.8,
  };
}

function initializeUI(state: PopupState): void {
  const enableToggle = document.getElementById('enable-toggle') as HTMLInputElement;
  const lineNumbersToggle = document.getElementById('line-numbers') as HTMLInputElement;
  const areaNamesToggle = document.getElementById('area-names') as HTMLInputElement;
  const colorPicker = document.getElementById('color-picker') as HTMLInputElement;
  const opacitySlider = document.getElementById('opacity') as HTMLInputElement;

  enableToggle.checked = state.isEnabled;
  lineNumbersToggle.checked = state.showLineNumbers;
  areaNamesToggle.checked = state.showAreaNames;
  colorPicker.value = state.highlightColor;
  opacitySlider.value = String(state.opacity);

  enableToggle.addEventListener('change', () => broadcastUpdate({ isEnabled: enableToggle.checked }));
  lineNumbersToggle.addEventListener('change', () => broadcastUpdate({ showLineNumbers: lineNumbersToggle.checked }));
  areaNamesToggle.addEventListener('change', () => broadcastUpdate({ showAreaNames: areaNamesToggle.checked }));
  colorPicker.addEventListener('input', () => broadcastUpdate({ highlightColor: colorPicker.value }));
  opacitySlider.addEventListener('input', () => broadcastUpdate({ opacity: parseFloat(opacitySlider.value) }));
}

async function broadcastUpdate(partialState: Partial<DebuggerState>): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'UPDATE_SETTINGS',
      payload: partialState,
    });
  }
  
  const stored = await chrome.storage.local.get('debuggerState');
  const currentState = stored.debuggerState || {};
  await chrome.storage.local.set({
    debuggerState: { ...currentState, ...partialState },
  });
}
```

## State Management and Storage Patterns

### Using chrome.storage API

The extension uses `chrome.storage.local` for persistent state:

```typescript
// Storage wrapper for type-safe operations
class StorageManager<T extends Record<string, unknown>> {
  private key: string;

  constructor(key: string) {
    this.key = key;
  }

  async get(): Promise<T | null> {
    const result = await chrome.storage.local.get(this.key);
    return result[this.key] as T | null;
  }

  async set(value: T): Promise<void> {
    await chrome.storage.local.set({ [this.key]: value });
  }

  async clear(): Promise<void> {
    await chrome.storage.local.remove(this.key);
  }

  async update(partial: Partial<T>): Promise<T> {
    const current = await this.get();
    const updated = { ...current, ...partial } as T;
    await this.set(updated);
    return updated;
  }
}
```

### State Synchronization

Keep popup and content script in sync:

```typescript
// Background handles state coordination
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.debuggerState) {
    // Notify all tabs about state change
    chrome.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'STATE_CHANGED',
            payload: changes.debuggerState.newValue,
          }).catch(() => {
            // Tab may not have content script loaded
          });
        }
      });
    });
  }
});
```

## Error Handling and Edge Cases

### Graceful Degradation

```typescript
try {
  const analysis = gridAnalyzer.analyzeDocument();
  overlayRenderer.render(analysis);
} catch (error) {
  logger.error('Analysis failed', error);
  
  // Fallback: analyze individual elements
  try {
    const element = document.querySelector<HTMLElement>('[style*="display: grid"]');
    if (element) {
      renderSimpleOverlay(element);
    }
  } catch (fallbackError) {
    logger.error('Fallback rendering failed', fallbackError);
  }
}
```

### Handling Dynamic Content

```typescript
// Observe DOM changes for dynamically added grids
const observer = new MutationObserver((mutations) => {
  let shouldReanalyze = false;
  
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      shouldReanalyze = true;
    }
  });
  
  if (shouldReanalyze && state.isEnabled) {
    debouncedAnalyze();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

const debouncedAnalyze = debounce(() => {
  const analysis = gridAnalyzer.analyzeDocument();
  overlayRenderer.render(analysis);
}, 250);
```

### Edge Cases to Handle

1. Nested grids: Analyze recursively and render overlays for each container
2. Anonymous grid items: Handle text nodes wrapped in grid containers
3. Subgrid support: Detect and visualize subgrid relationships
4. Responsive grids: Re-analyze on window resize
5. iframe isolation: Cannot access cross-origin iframes
6. Shadow DOM: Use `querySelectorAll` with shadow roots

## Testing Approach

### Unit Testing GridAnalyzer

```typescript
import { GridAnalyzer } from './grid-analyzer';

describe('GridAnalyzer', () => {
  let analyzer: GridAnalyzer;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="grid" style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 100px 100px;">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
        <div>Item 4</div>
      </div>
    `;
    analyzer = new GridAnalyzer();
  });

  it('should detect grid container', () => {
    const analysis = analyzer.analyzeDocument();
    expect(analysis.containers.length).toBe(1);
    expect(analysis.containers[0].columnCount).toBe(2);
    expect(analysis.containers[0].rowCount).toBe(2);
  });

  it('should parse grid items correctly', () => {
    const analysis = analyzer.analyzeDocument();
    expect(analysis.items.size).toBe(4);
  });
});
```

### Integration Testing with Puppeteer

```typescript
import puppeteer from 'puppeteer';

describe('Extension Integration', () => {
  it('should toggle overlay on click', async () => {
    const browser = await puppeteer.launch({
      args: ['--disable-extensions-except=./dist'],
    });
    
    const page = await browser.newPage();
    await page.goto('http://example.com/grid-test.html');
    
    // Click extension icon
    await page.click('#extension-icon');
    
    // Verify overlay appears
    const overlay = await page.$('#css-grid-debugger-overlay');
    expect(overlay).not.toBeNull();
    
    await browser.close();
  });
});
```

## Performance Considerations

### Optimizations

1. Debounce resize handlers: Prevent excessive re-renders
2. Use requestAnimationFrame: Smooth overlay positioning
3. Cache computed styles: Avoid repeated `getComputedStyle` calls
4. Limit DOM queries: Cache element references
5. Use CSS transforms: GPU-accelerated overlay positioning

```typescript
// Efficient overlay positioning
function updateOverlayPosition(overlay: HTMLElement, rect: DOMRect): void {
  requestAnimationFrame(() => {
    overlay.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  });
}

// Throttle grid analysis
const analyzeGrid = throttle(() => {
  const analysis = gridAnalyzer.analyzeDocument();
  overlayRenderer.render(analysis);
}, 100);

window.addEventListener('resize', analyzeGrid);
```

### Memory Management

Always clean up when extension is disabled:

```typescript
class GridDebugger {
  destroy(): void {
    this.observer?.disconnect();
    this.renderer?.destroy();
    this.port?.disconnect();
    this.port = null;
  }
}
```

## Publishing Checklist

### Pre-submission Requirements

- [ ] Test on Chrome, Edge, and Firefox (if supporting MV2)
- [ ] Verify all permissions are minimal and justified
- [ ] Include clear privacy policy
- [ ] Provide distinctive icon sizes (16, 48, 128px)
- [ ] Write comprehensive store listing
- [ ] Set up Google Analytics or tracking (optional)

### Manifest Validation

```bash
# Validate manifest using Chrome's tools
npx @chrome-extension-validator/validate manifest.json
```

### Store Submission

1. Package extension: `chrome.exe --pack-extension=./dist`
2. Upload to Chrome Web Developer Dashboard
3. Complete store listing details
4. Submit for review

### Post-publication

- Monitor error reports in Chrome Developer Dashboard
- Collect and respond to user reviews
- Plan feature updates based on feedback
- Maintain compatibility with Chrome releases

## Conclusion

This guide covered the essential patterns for building a Chrome extension that visualizes CSS Grid layouts. The architecture separates concerns between content scripts, background workers, and the popup UI, while TypeScript provides type safety throughout. 

Key takeaways:
- Use Manifest V3 with minimal permissions
- Implement proper error handling for edge cases
- Test thoroughly with unit and integration tests
- Optimize for performance with throttling and caching
- Follow Chrome's publishing guidelines exactly

With these patterns, you can extend this debugger to support Flexbox, CSS subgrid, or add advanced features like grid template editing.
