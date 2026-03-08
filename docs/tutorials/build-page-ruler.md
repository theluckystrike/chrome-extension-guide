---
layout: default
title: "Chrome Extension Page Ruler — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a Page Ruler Extension

## What You'll Build
- Drag to measure distances on any web page
- Pixel and REM unit support
- Element snap mode to align with page elements
- Crosshair guides for precise alignment
- Toggle ruler mode via browser action
- Canvas-based overlay for smooth rendering
- Dimension display showing width and height
- Unit conversion between px, rem, em, and %
- Color sampling from any point on the page
- Multiple simultaneous measurements
- Keyboard modifiers for precise control

## Manifest
- permissions: activeTab, storage, scripting
- action with popup for settings
- commands for keyboard shortcuts

---

## Step 1: Ruler Overlay System

Create a canvas overlay that covers the entire viewport:

```javascript
// content-script/ruler-overlay.js
class RulerOverlay {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'ruler-overlay';
    this.ctx = this.canvas.getContext('2d');
    this.isActive = false;
    this.measurements = [];
    this.currentUnit = 'px';
  }

  show() {
    this.resize();
    this.canvas.style.display = 'block';
    this.isActive = true;
    document.body.appendChild(this.canvas);
    this.draw();
  }

  hide() {
    this.canvas.style.display = 'none';
    this.isActive = false;
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '999999';
  }
}
```

---

## Step 2: Drag Measurement

Handle mouse events to draw measurement lines:

```javascript
// content-script/ruler-overlay.js (continued)
  handleMouseDown(e) {
    this.startPoint = { x: e.clientX, y: e.clientY };
    this.isDragging = true;
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    this.endPoint = { x: e.clientX, y: e.clientY };
    this.draw();
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    const measurement = this.calculateMeasurement(this.startPoint, this.endPoint);
    this.measurements.push(measurement);
    this.drawMeasurements();
  }

  calculateMeasurement(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const pixels = Math.sqrt(dx * dx + dy * dy);
    return {
      start,
      end,
      pixels,
      rem: pixels / 16,
      em: pixels / 16
    };
  }
```

Enable pointer events only on the overlay:

```javascript
// Create a separate interaction layer
const interactionLayer = document.createElement('div');
interactionLayer.id = 'ruler-interaction';
Object.assign(interactionLayer.style, {
  position: 'fixed',
  top: '0', left: '0',
  width: '100%', height: '100%',
  zIndex: '999998',
  cursor: 'crosshair'
});
interactionLayer.addEventListener('mousedown', (e) => ruler.handleMouseDown(e));
interactionLayer.addEventListener('mousemove', (e) => ruler.handleMouseMove(e));
interactionLayer.addEventListener('mouseup', (e) => ruler.handleMouseUp(e));
```

---

## Step 3: Crosshair Guides

Draw horizontal and vertical guide lines:

```javascript
// content-script/ruler-overlay.js (continued)
  drawCrosshair(x, y, color = 'rgba(255, 0, 0, 0.5)') {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    
    // Horizontal line
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(this.canvas.width, y);
    this.ctx.stroke();
    
    // Vertical line
    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.canvas.height);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]);
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw current measurement
    if (this.startPoint && this.endPoint) {
      this.drawMeasurementLine(this.startPoint, this.endPoint);
    }
    
    // Draw saved measurements
    this.measurements.forEach(m => this.drawMeasurementLine(m.start, m.end));
  }
```

---

## Step 4: Element Snap Mode

Snap to DOM element boundaries:

```javascript
// content-script/ruler-overlay.js (continued)
  enableElementSnap(enabled) {
    this.snapEnabled = enabled;
  }

  findNearestElement(x, y) {
    // Check elements at the cursor position
    const el = document.elementFromPoint(x, y);
    if (!el || el === document.body) return null;
    
    const rect = el.getBoundingClientRect();
    return {
      element: el,
      bounds: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right
      }
    };
  }

  snapToElement(x, y) {
    if (!this.snapEnabled) return { x, y };
    
    const nearest = this.findNearestElement(x, y);
    if (!nearest) return { x, y };
    
    const { bounds } = nearest;
    const snapThreshold = 10;
    
    // Find closest edge
    const distances = [
      { edge: 'left', dist: Math.abs(x - bounds.left), value: bounds.left },
      { edge: 'right', dist: Math.abs(x - bounds.right), value: bounds.right },
      { edge: 'top', dist: Math.abs(y - bounds.top), value: bounds.top },
      { edge: 'bottom', dist: Math.abs(y - bounds.bottom), value: bounds.bottom }
    ];
    
    const closest = distances.reduce((a, b) => a.dist < b.dist ? a : b);
    
    if (closest.dist < snapThreshold) {
      return { x: closest.value, y: closest.edge === 'left' || closest.edge === 'right' ? closest.value : y };
    }
    
    return { x, y };
  }
```

---

## Step 5: Dimension Display

Show measurements with labels:

```javascript
// content-script/ruler-overlay.js (continued)
  drawMeasurementLine(start, end) {
    const { x: sx, y: sy } = this.snapEnabled ? this.snapToElement(start.x, start.y) : start;
    const { x: ex, y: ey } = this.snapEnabled ? this.snapToElement(end.x, end.y) : end;
    
    // Draw line
    this.ctx.strokeStyle = '#0066ff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(sx, sy);
    this.ctx.lineTo(ex, ey);
    this.ctx.stroke();
    
    // Draw endpoints
    this.ctx.fillStyle = '#0066ff';
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    this.ctx.arc(ex, ey, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw dimension label
    const midX = (sx + ex) / 2;
    const midY = (sy + ey) / 2;
    const pixels = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
    const rem = (pixels / 16).toFixed(1);
    
    this.ctx.font = '12px sans-serif';
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(midX - 25, midY - 10, 50, 20);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText(`${Math.round(pixels)}px / ${rem}rem`, midX - 20, midY + 4);
  }
```

---

## Step 6: Unit Conversion & Color Sampling

```javascript
// content-script/utils.js
export function convertUnit(value, fromUnit, toUnit, baseFontSize = 16) {
  // Convert to pixels first
  let pixels;
  switch (fromUnit) {
    case 'px': pixels = value; break;
    case 'rem': pixels = value * baseFontSize; break;
    case 'em': pixels = value * baseFontSize; break;
    case '%': pixels = value * (window.innerWidth / 100); break;
  }
  
  // Convert from pixels to target
  switch (toUnit) {
    case 'px': return pixels;
    case 'rem': return pixels / baseFontSize;
    case 'em': return pixels / baseFontSize;
    case '%': return (pixels / window.innerWidth) * 100;
  }
}

export function sampleColor(x, y) {
  // Create temporary canvas to sample pixel
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1;
  canvas.height = 1;
  
  ctx.drawWindow(window, 0, 0, window.innerWidth, window.innerHeight);
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
  
  return { r, g, b, hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}` };
}
```

---

## Step 7: Keyboard Modifiers

```javascript
// content-script/ruler-overlay.js (continued)
  handleKeyDown(e) {
    switch (e.key) {
      case 'Escape':
        this.hide();
        break;
      case 'Delete':
      case 'Backspace':
        this.measurements = [];
        this.draw();
        break;
      case 'u':
        // Toggle units
        this.currentUnit = { px: 'rem', rem: 'em', em: 'px' }[this.currentUnit];
        break;
      case 's':
        // Toggle snap
        this.snapEnabled = !this.snapEnabled;
        break;
      case 'c':
        // Sample color
        const color = sampleColor(this.endPoint.x, this.endPoint.y);
        navigator.clipboard.writeText(color.hex);
        break;
    }
  }
```

---

## Step 8: Background Script

```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content-script/ruler-overlay.js']
  });
  
  // Toggle via message
  chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-ruler') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
    });
  }
});
```

---

## Usage Tips
1. **Click and drag** to create a measurement
2. **Press S** to toggle element snap mode
3. **Press C** to copy color at endpoint
4. **Press U** to cycle through units
5. **Press Delete** to clear all measurements
6. **Click the extension icon** to toggle ruler on/off

## Cross-References
- [Dynamic Content Injection](../patterns/dynamic-content-injection.md)
- [DOM Observer Patterns](../patterns/dom-observer-patterns.md)
- [Content Script Patterns](../guides/content-script-patterns.md)
