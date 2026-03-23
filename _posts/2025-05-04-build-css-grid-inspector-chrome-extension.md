---
layout: post
title: "Build a CSS Grid Inspector Chrome Extension: Visualize Grid Layouts"
description: "Learn how to build a CSS Grid Inspector Chrome extension to visualize and debug CSS Grid layouts. Complete guide with code examples for overlay visualization."
date: 2025-05-04
categories: [Chrome-Extensions, Developer-Tools]
tags: [css-grid, inspector, chrome-extension]
keywords: "chrome extension css grid, grid inspector chrome, css grid overlay extension, visualize css grid chrome, grid debugging extension"
canonical_url: "https://bestchromeextensions.com/2025/05/04/build-css-grid-inspector-chrome-extension/"
---

Build a CSS Grid Inspector Chrome Extension: Visualize Grid Layouts

CSS Grid has revolutionized web design by providing a powerful two-dimensional layout system. However, debugging grid layouts remains challenging for many developers. Understanding the exact placement of grid tracks, gaps, and areas requires visual tools that most browsers don't provide out of the box. This is where building a custom CSS Grid Inspector Chrome extension becomes invaluable.

we'll walk you through creating a production-ready CSS Grid Inspector extension that visualizes grid layouts with colorful overlays, displays grid line numbers, shows track sizes, and helps developers understand complex grid configurations at a glance.

---

Why You Need a CSS Grid Inspector Extension

Modern web development increasingly relies on CSS Grid for building sophisticated layouts. From dashboard interfaces to magazine-style layouts, grids are everywhere. Yet, the browser's native DevTools, while helpful, don't always provide the quick visual feedback developers need when iterating on designs.

A dedicated CSS Grid Inspector Chrome extension offers several advantages over browser DevTools:

1. Instant Visual Feedback: Toggle grid overlays on/off with a single click without opening DevTools
2. Customizable Visualizations: Choose colors, show/hide specific grid information, and adjust opacity levels
3. Persistent Settings: Remember your preferences across browsing sessions
4. Streamlined Workflow: Access grid debugging directly from the extension popup instead of navigating complex DevTools panels

Whether you're building responsive layouts, working with named grid areas, or experimenting with auto-fill and auto-fit, having a dedicated tool accelerates your development workflow significantly.

---

Project Setup and Manifest Configuration

Every Chrome extension starts with the manifest file. For our CSS Grid Inspector, we'll use Manifest V3, which provides improved security and performance.

manifest.json

```json
{
  "manifest_version": 3,
  "name": "CSS Grid Inspector",
  "version": "1.0.0",
  "description": "Visual debugging tool for CSS Grid layouts - overlay grid lines, show track sizes, and visualize grid areas",
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

This configuration grants the extension the necessary permissions to analyze and modify any webpage. The `activeTab` permission ensures we only run on the current tab when explicitly activated, while `scripting` allows us to inject JavaScript for grid analysis.

---

Core Architecture

Our extension follows a modular architecture with three main components:

1. Content Script: Runs in the context of web pages, detects grid containers, and renders overlays
2. Background Service Worker: Handles communication between content scripts and the popup
3. Popup UI: Provides user controls for toggling visualizations and adjusting settings

Project Structure

```
css-grid-inspector/
 src/
    content/
       content-script.ts    # Main content script entry point
       grid-analyzer.ts    # Grid detection and analysis logic
       overlay-renderer.ts # Drawing grid overlays
       types.ts            # TypeScript type definitions
    popup/
       popup.ts            # Popup logic
       popup.html          # Popup UI
    background/
       background.ts       # Service worker
    shared/
        storage.ts          # Storage utilities
        messaging.ts        # Message handling
 icons/                       # Extension icons
 manifest.json
 tsconfig.json
```

---

Detecting CSS Grid Containers

The heart of our extension lies in accurately detecting CSS Grid containers on any webpage. We need to query elements with `display: grid` or `display: inline-grid` and gather their computed styles.

grid-analyzer.ts

```typescript
interface GridContainer {
  element: HTMLElement;
  computedStyle: CSSStyleDeclaration;
  rowCount: number;
  columnCount: number;
  rowGap: number;
  columnGap: number;
  templateAreas: string[][] | null;
  autoFlow: string;
  gridTemplateRows: string;
  gridTemplateColumns: string;
}

export function findGridContainers(): GridContainer[] {
  const allElements = document.querySelectorAll('*');
  const gridContainers: GridContainer[] = [];

  for (const element of allElements) {
    const computedStyle = window.getComputedStyle(element);
    
    if (computedStyle.display === 'grid' || computedStyle.display === 'inline-grid') {
      const container: GridContainer = {
        element: element as HTMLElement,
        computedStyle,
        rowGap: parseFloat(computedStyle.rowGap) || 0,
        columnGap: parseFloat(computedStyle.columnGap) || 0,
        autoFlow: computedStyle.gridAutoFlow,
        gridTemplateRows: computedStyle.gridTemplateRows,
        gridTemplateColumns: computedStyle.gridTemplateColumns,
        templateAreas: parseTemplateAreas(computedStyle.gridTemplateAreas),
        rowCount: 0,
        columnCount: 0
      };

      // Calculate row and column counts
      const rowTracks = container.gridTemplateRows.split(' ').filter(t => t !== 'none');
      const colTracks = container.gridTemplateColumns.split(' ').filter(t => t !== 'none');
      
      container.rowCount = rowTracks.length;
      container.columnCount = colTracks.length;

      gridContainers.push(container);
    }
  }

  return gridContainers;
}

function parseTemplateAreas(areas: string): string[][] | null {
  if (!areas || areas === 'none') return null;
  
  try {
    return areas.trim().split(/[\n]+/).map(row => 
      row.trim().split(/\s+/).map(cell => cell.replace(/["']/g, ''))
    );
  } catch {
    return null;
  }
}
```

This analyzer efficiently scans the DOM for grid containers and extracts all relevant computed style information. It handles both explicit grid tracks and implicit rows created by auto-placement.

---

Rendering Grid Overlays

Now comes the visual part, rendering colorful overlays that show grid lines, track sizes, and areas. We'll use SVG overlays positioned absolutely over each grid container.

overlay-renderer.ts

```typescript
import { GridContainer } from './grid-analyzer';

interface OverlayOptions {
  showLineNumbers: boolean;
  showTrackSizes: boolean;
  showAreaNames: boolean;
  overlayColor: string;
  overlayOpacity: number;
}

export class OverlayRenderer {
  private container: HTMLElement;
  private options: OverlayOptions;

  constructor(options: OverlayOptions) {
    this.options = options;
    this.container = this.createOverlayContainer();
    document.body.appendChild(this.container);
  }

  private createOverlayContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'css-grid-inspector-overlays';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
    `;
    return container;
  }

  render(gridContainers: GridContainer[]): void {
    this.clear();
    
    for (const grid of gridContainers) {
      this.renderGridOverlay(grid);
    }
  }

  private renderGridOverlay(grid: GridContainer): void {
    const rect = grid.element.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
    `;

    // Render grid lines and tracks
    this.renderTracks(overlay, grid, rect);
    
    // Render area names if present
    if (this.options.showAreaNames && grid.templateAreas) {
      this.renderAreas(overlay, grid, rect);
    }

    // Render line numbers
    if (this.options.showLineNumbers) {
      this.renderLineNumbers(overlay, grid, rect);
    }

    this.container.appendChild(overlay);
  }

  private renderTracks(overlay: HTMLElement, grid: GridContainer, rect: DOMRect): void {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', rect.width.toString());
    svg.setAttribute('height', rect.height.toString());
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';

    // Calculate track positions
    const colTracks = this.parseTrackSizes(grid.gridTemplateColumns, rect.width);
    const rowTracks = this.parseTrackSizes(grid.gridTemplateRows, rect.height);

    // Draw column lines
    let x = 0;
    for (let i = 0; i < colTracks.length; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x.toString());
      line.setAttribute('y1', '0');
      line.setAttribute('x2', x.toString());
      line.setAttribute('y2', rect.height.toString());
      line.setAttribute('stroke', this.options.overlayColor);
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-opacity', this.options.overlayOpacity.toString());
      svg.appendChild(line);
      
      x += colTracks[i];
      if (i < colTracks.length - 1) {
        x += grid.columnGap;
      }
    }

    // Draw row lines
    let y = 0;
    for (let i = 0; i < rowTracks.length; i++) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('y1', y.toString());
      line.setAttribute('x2', rect.width.toString());
      line.setAttribute('y2', y.toString());
      line.setAttribute('stroke', this.options.overlayColor);
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-opacity', this.options.overlayOpacity.toString());
      svg.appendChild(line);
      
      y += rowTracks[i];
      if (i < rowTracks.length - 1) {
        y += grid.rowGap;
      }
    }

    // Draw border around entire grid
    const border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    border.setAttribute('x', '1');
    border.setAttribute('y', '1');
    border.setAttribute('width', (rect.width - 2).toString());
    border.setAttribute('height', (rect.height - 2).toString());
    border.setAttribute('stroke', this.options.overlayColor);
    border.setAttribute('stroke-width', '3');
    border.setAttribute('fill', 'none');
    svg.appendChild(border);

    overlay.appendChild(svg);
  }

  private parseTrackSizes(trackString: string, containerSize: number): number[] {
    const tracks = trackString.split(' ').filter(t => t !== 'none');
    const sizes: number[] = [];
    
    for (const track of tracks) {
      if (track === 'auto') {
        sizes.push(containerSize / tracks.length);
      } else if (track.endsWith('fr')) {
        const fr = parseFloat(track);
        sizes.push(fr); // Will normalize later
      } else if (track.endsWith('px')) {
        sizes.push(parseFloat(track));
      } else if (track.endsWith('%')) {
        const percent = parseFloat(track) / 100;
        sizes.push(containerSize * percent);
      } else if (track === 'minmax(min-content, 1fr)') {
        sizes.push(containerSize / tracks.length);
      } else {
        sizes.push(containerSize / tracks.length); // Default fallback
      }
    }
    
    return sizes;
  }

  private renderLineNumbers(overlay: HTMLElement, grid: GridContainer, rect: DOMRect): void {
    // Column numbers (top)
    for (let i = 1; i <= grid.columnCount; i++) {
      const label = document.createElement('div');
      label.textContent = i.toString();
      label.style.cssText = `
        position: absolute;
        top: -25px;
        left: ${((i - 0.5) / grid.columnCount) * rect.width}px;
        transform: translateX(-50%);
        background: ${this.options.overlayColor};
        color: white;
        padding: 2px 6px;
        font-size: 12px;
        border-radius: 3px;
        font-family: monospace;
      `;
      overlay.appendChild(label);
    }

    // Row numbers (left)
    for (let i = 1; i <= grid.rowCount; i++) {
      const label = document.createElement('div');
      label.textContent = i.toString();
      label.style.cssText = `
        position: absolute;
        left: -30px;
        top: ${((i - 0.5) / grid.rowCount) * rect.height}px;
        transform: translateY(-50%);
        background: ${this.options.overlayColor};
        color: white;
        padding: 2px 6px;
        font-size: 12px;
        border-radius: 3px;
        font-family: monospace;
      `;
      overlay.appendChild(label);
    }
  }

  private renderAreas(overlay: HTMLElement, grid: GridContainer, rect: DOMRect): void {
    if (!grid.templateAreas) return;

    const rowHeight = rect.height / grid.templateAreas.length;
    const colWidth = rect.width / grid.templateAreas[0].length;
    const areas = new Map<string, { row: number; col: number; rowSpan: number; colSpan: number }>();

    // Calculate area positions
    for (let row = 0; row < grid.templateAreas.length; row++) {
      for (let col = 0; col < grid.templateAreas[row].length; col++) {
        const areaName = grid.templateAreas[row][col];
        if (areaName && areaName !== '.' && !areas.has(areaName)) {
          // Find span
          let rowSpan = 1;
          let colSpan = 1;
          
          // Count row span
          for (let r = row + 1; r < grid.templateAreas.length; r++) {
            if (grid.templateAreas[r][col] === areaName) rowSpan++;
            else break;
          }
          
          // Count col span
          for (let c = col + 1; c < grid.templateAreas[row].length; c++) {
            if (grid.templateAreas[row][c] === areaName) colSpan++;
            else break;
          }

          areas.set(areaName, { row, col, rowSpan, colSpan });
        }
      }
    }

    // Render area labels
    areas.forEach((pos, name) => {
      const areaLabel = document.createElement('div');
      areaLabel.textContent = name;
      areaLabel.style.cssText = `
        position: absolute;
        top: ${pos.row * rowHeight + 4}px;
        left: ${pos.col * colWidth + 4}px;
        width: ${pos.colSpan * colWidth - 8}px;
        height: ${pos.rowSpan * rowHeight - 8}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${this.options.overlayColor}40;
        border: 2px solid ${this.options.overlayColor};
        color: ${this.options.overlayColor};
        font-weight: bold;
        font-size: 14px;
        font-family: monospace;
        border-radius: 4px;
      `;
      overlay.appendChild(areaLabel);
    });
  }

  clear(): void {
    this.container.innerHTML = '';
  }

  destroy(): void {
    this.container.remove();
  }
}
```

This renderer creates beautiful SVG-based overlays showing grid lines, track boundaries, area names, and line numbers. The overlays are positioned precisely over each grid container using `getBoundingClientRect()`.

---

Content Script Entry Point

Now we connect everything in the content script:

```typescript
// content-script.ts
import { findGridContainers } from './grid-analyzer';
import { OverlayRenderer } from './overlay-renderer';

let renderer: OverlayRenderer | null = null;
let isEnabled = false;

interface Message {
  action: string;
  payload?: any;
}

interface RuntimeMessage {
  action: string;
  payload?: {
    showLineNumbers?: boolean;
    showTrackSizes?: boolean;
    showAreaNames?: boolean;
    overlayColor?: string;
    overlayOpacity?: number;
  };
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (message.action === 'toggleInspector') {
    if (isEnabled) {
      disableInspector();
    } else {
      enableInspector(message.payload);
    }
  } else if (message.action === 'updateSettings') {
    if (isEnabled && renderer) {
      renderer = new OverlayRenderer(message.payload);
      const grids = findGridContainers();
      renderer.render(grids);
    }
  }
});

function enableInspector(settings: any): void {
  isEnabled = true;
  renderer = new OverlayRenderer({
    showLineNumbers: settings.showLineNumbers ?? true,
    showTrackSizes: settings.showTrackSizes ?? false,
    showAreaNames: settings.showAreaNames ?? true,
    overlayColor: settings.overlayColor ?? '#00ff00',
    overlayOpacity: settings.overlayOpacity ?? 0.8
  });

  const grids = findGridContainers();
  renderer.render(grids);
  
  console.log(`[CSS Grid Inspector] Enabled. Found ${grids.length} grid container(s).`);
}

function disableInspector(): void {
  isEnabled = false;
  if (renderer) {
    renderer.destroy();
    renderer = null;
  }
  console.log('[CSS Grid Inspector] Disabled.');
}
```

---

Building the Popup Interface

The popup provides users with controls to toggle the inspector and customize visualizations:

popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 280px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; }
    h2 { margin: 0 0 16px; font-size: 16px; color: #333; }
    .control { margin-bottom: 12px; }
    label { display: flex; align-items: center; font-size: 13px; cursor: pointer; }
    input[type="checkbox"] { margin-right: 8px; }
    input[type="color"] { margin-left: auto; border: none; width: 30px; height: 20px; }
    input[type="range"] { width: 100%; margin-top: 4px; }
    .toggle-btn {
      width: 100%;
      padding: 12px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .toggle-btn.active { background: #f44336; }
    .toggle-btn:hover { opacity: 0.9; }
    .status { margin-top: 12px; font-size: 11px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <h2>CSS Grid Inspector</h2>
  
  <button id="toggleBtn" class="toggle-btn">Enable Inspector</button>
  
  <div class="control">
    <label>
      Show Line Numbers
      <input type="checkbox" id="showLineNumbers" checked>
    </label>
  </div>
  
  <div class="control">
    <label>
      Show Area Names
      <input type="checkbox" id="showAreaNames" checked>
    </label>
  </div>
  
  <div class="control">
    <label>
      Overlay Color
      <input type="color" id="overlayColor" value="#00ff00">
    </label>
  </div>
  
  <div class="control">
    <label style="margin-bottom: 4px;">Opacity</label>
    <input type="range" id="overlayOpacity" min="0.1" max="1" step="0.1" value="0.8">
  </div>
  
  <div class="status" id="status">Click to inspect grids</div>
  
  <script src="popup.js"></script>
</body>
</html>
```

popup.ts

```typescript
let isEnabled = false;

const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLElement;

const settings = {
  showLineNumbers: true,
  showAreaNames: true,
  overlayColor: '#00ff00',
  overlayOpacity: 0.8
};

function updateSettings(): void {
  settings.showLineNumbers = (document.getElementById('showLineNumbers') as HTMLInputElement).checked;
  settings.showAreaNames = (document.getElementById('showAreaNames') as HTMLInputElement).checked;
  settings.overlayColor = (document.getElementById('overlayColor') as HTMLInputElement).value;
  settings.overlayOpacity = parseFloat((document.getElementById('overlayOpacity') as HTMLInputElement).value);
  
  chrome.storage.local.set({ gridInspectorSettings: settings });
}

toggleBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;
  
  isEnabled = !isEnabled;
  toggleBtn.textContent = isEnabled ? 'Disable Inspector' : 'Enable Inspector';
  toggleBtn.classList.toggle('active', isEnabled);
  statusEl.textContent = isEnabled ? 'Scanning for grids...' : 'Inspector disabled';
  
  updateSettings();
  
  chrome.tabs.sendMessage(tab.id, {
    action: isEnabled ? 'toggleInspector' : 'toggleInspector',
    payload: settings
  });
});

// Load saved settings
chrome.storage.local.get('gridInspectorSettings', (result) => {
  if (result.gridInspectorSettings) {
    Object.assign(settings, result.gridInspectorSettings);
    (document.getElementById('showLineNumbers') as HTMLInputElement).checked = settings.showLineNumbers;
    (document.getElementById('showAreaNames') as HTMLInputElement).checked = settings.showAreaNames;
    (document.getElementById('overlayColor') as HTMLInputElement).value = settings.overlayColor;
    (document.getElementById('overlayOpacity') as HTMLInputElement).value = settings.overlayOpacity.toString();
  }
});

// Event listeners for settings changes
['showLineNumbers', 'showAreaNames'].forEach(id => {
  document.getElementById(id)?.addEventListener('change', updateSettings);
});
document.getElementById('overlayColor')?.addEventListener('change', updateSettings);
document.getElementById('overlayOpacity')?.addEventListener('input', updateSettings);
```

---

Testing Your Extension

Before publishing, thoroughly test your extension:

1. Load Unpacked: Open `chrome://extensions/`, enable Developer mode, click "Load unpacked", and select your extension directory
2. Test on Various Sites: Try the extension on sites with simple and complex grid layouts
3. Verify Overlays: Confirm that grid lines align precisely with actual grid tracks
4. Test Settings: Toggle each option and verify they work as expected
5. Performance Check: Ensure the extension doesn't cause noticeable page slowdowns

---

Advanced Features to Consider

Once you have the basic inspector working, consider adding these advanced features:

- Nested Grid Support: Visualize grids within grids at different nesting levels
- Gap Visualization: Highlight grid gaps with different colors
- Track Size Labels: Show exact pixel/percentage values for each track
- Export Configuration: Copy grid layout as CSS or JSON
- Responsive Preview: Test grid behavior across viewport sizes
- Dark Mode Support: Auto-detect and adapt to dark/light themes

---

Publishing to Chrome Web Store

When ready to share your extension:

1. Create a Developer account at the [Chrome Web Store](https://chrome.google.com/webstore)
2. Package your extension using `chrome://extensions/` → "Pack extension"
3. Upload the .zip file to the Chrome Web Store Developer Dashboard
4. Add screenshots, descriptions, and category information
5. Submit for review (typically takes 1-3 days)

---

Conclusion

Building a CSS Grid Inspector Chrome extension is an excellent project that combines DOM manipulation, SVG graphics, and Chrome extension APIs. The extension we built provides instant visual feedback for grid layouts, making it easier to debug and understand CSS Grid implementations.

The key components we covered include detecting grid containers using computed styles, rendering SVG overlays with precise positioning, creating a user-friendly popup interface, and managing state with Chrome's storage API. This foundation can be extended with additional features like track size annotations, area highlighting, and export functionality.

For the complete implementation details and advanced patterns, check out our [detailed CSS Grid Debugger guide](/docs/guides/css-grid-debugger/) in the chrome-extension-guide documentation. Happy debugging!
