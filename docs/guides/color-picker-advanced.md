# Building an Advanced Color Picker Chrome Extension

## Overview

This guide covers building a sophisticated color picker Chrome extension with eye dropper functionality, color history, palette generation, and clipboard integration using TypeScript.

## Architecture and Manifest Setup

### Project Structure
```
color-picker-advanced/
 manifest.json
 src/
    background/service-worker.ts
    popup/popup.html, popup.ts, popup.css
    content-script/eye-dropper.ts
    shared/types.ts, color-utils.ts, storage.ts
 assets/icons/
```

### Manifest Configuration
```json
{
  "manifest_version": 3,
  "name": "Advanced Color Picker",
  "version": "1.0.0",
  "permissions": ["activeTab", "scripting", "storage", "clipboardWrite", "contextMenus"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background/service-worker.js", "type": "module" },
  "action": { "default_popup": "popup/popup.html" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content-script/eye-dropper.js"] }],
  "commands": {
    "pick-color": { "suggested_key": { "default": "Ctrl+Shift+C" }, "description": "Activate color picker" }
  }
}
```

## Core Implementation with TypeScript

### Type Definitions
```ts
// src/shared/types.ts
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'cmyk';

export interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

export interface ColorHistoryItem extends Color {
  id: string;
  timestamp: number;
  source: 'picker' | 'eye-dropper';
}

export interface PickerSettings {
  defaultFormat: ColorFormat;
  historyLimit: number;
}
```

### Color Conversion Utilities
```ts
// src/shared/color-utils.ts
import { Color, ColorFormat } from './types';

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex: ${hex}`);
  return { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function createColor(hex: string): Color {
  const rgb = hexToRgb(hex);
  return { hex: hex.toUpperCase(), rgb, hsl: rgbToHsl(rgb.r, rgb.g, rgb.b) };
}

export function formatColor(color: Color, format: ColorFormat): string {
  switch (format) {
    case 'hex': return color.hex;
    case 'rgb': return `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
    case 'hsl': return `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`;
  }
}
```

## UI Design

### Popup HTML
```html
<!-- src/popup/popup.html -->
<!DOCTYPE html>
<html>
<head><link rel="stylesheet" href="popup.css"></head>
<body>
  <div class="picker-container">
    <header><h1>Color Picker</h1></header>
    <section class="preview">
      <div id="color-preview"></div>
      <div class="color-values">
        <div class="row"><label>HEX</label><input id="hex-value" readonly><button class="copy"></button></div>
        <div class="row"><label>RGB</label><input id="rgb-value" readonly><button class="copy"></button></div>
        <div class="row"><label>HSL</label><input id="hsl-value" readonly><button class="copy"></button></div>
      </div>
    </section>
    <section class="picker">
      <canvas id="color-canvas" width="280" height="180"></canvas>
      <input type="range" id="hue-slider" min="0" max="360" value="0">
    </section>
    <section class="actions">
      <button id="eye-dropper-btn"> Pick from Screen</button>
      <button id="save-btn"> Save</button>
    </section>
    <section class="history">
      <h3>Recent</h3>
      <div id="color-history"></div>
    </section>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

### Content Script Eye Dropper
```ts
// src/content-script/eye-dropper.ts
interface EyeDropperResult { sRGBHex: string; }

export async function pickColorFromScreen(): Promise<string | null> {
  if (!window.EyeDropper) return null;
  try {
    const eyeDropper = new window.EyeDropper();
    const result: EyeDropperResult = await eyeDropper.open();
    return result.sRGBHex;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PICK_COLOR') {
    pickColorFromScreen()
      .then(color => sendResponse({ success: true, color }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});
```

## State Management
```ts
// src/shared/storage.ts
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { ColorHistoryItem } from './types';

const schema = defineSchema({
  settings: { defaultFormat: 'hex' as const, historyLimit: 50 },
  history: [] as ColorHistoryItem[],
  palettes: [] as any[],
});

export const storage = createStorage({ schema });

export async function addToHistory(item: ColorHistoryItem): Promise<void> {
  const { settings, history } = await storage.get('settings', 'history');
  const existing = history.findIndex(c => c.hex === item.hex);
  if (existing !== -1) history.splice(existing, 1);
  history.unshift(item);
  await storage.set('history', history.slice(0, settings.historyLimit));
}
```

## Background Service Worker
```ts
// src/background/service-worker.ts
import { createMessenger } from '@theluckystrike/webext-messaging';
import { storage, addToHistory } from '../shared/storage';
import { createColor } from '../shared/color-utils';

const messenger = createMessenger<any>();

messenger.onMessage({
  getHistory: async () => (await storage.get('history')).history,
  saveColor: async ({ hex }) => {
    const color = createColor(hex);
    await addToHistory({ ...color, id: crypto.randomUUID(), timestamp: Date.now(), source: 'picker' });
    return { success: true };
  },
  copyClipboard: async ({ text }) => { await navigator.clipboard.writeText(text); return { success: true }; }
});

chrome.contextMenus.create({ id: 'pick-color', title: 'Pick Color', contexts: ['page'] });
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'pick-color') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'PICK_COLOR' });
  }
});
```

## Error Handling
```ts
export class ColorError extends Error {
  constructor(message: string, public code: string) { super(message); this.name = 'ColorError'; }
}

export function handleError(error: unknown): ColorError {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return new ColorError('Cancelled', 'CANCELLED');
    if (error.name === 'NotSupportedError') return new ColorError('Not supported', 'NOT_SUPPORTED');
  }
  return new ColorError('Unknown error', 'UNKNOWN');
}

export function isValidHex(hex: string): boolean {
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
}

export function normalizeHex(hex: string): string {
  let n = hex.replace('#', '');
  if (n.length === 3) n = n.split('').map(c => c + c).join('');
  return `#${n.toUpperCase()}`;
}
```

## Testing Approach
```ts
// tests/color-utils.test.ts
import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, rgbToHsl, isValidHex, normalizeHex } from '../src/shared/color-utils';

describe('Color conversions', () => {
  it('hexToRgb converts correctly', () => expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 }));
  it('rgbToHex converts correctly', () => expect(rgbToHex(0, 255, 0)).toBe('#00FF00'));
  it('rgbToHsl handles white', () => expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 }));
  it('isValidHex validates', () => { expect(isValidHex('#FF0000')).toBe(true); expect(isValidHex('invalid')).toBe(false); });
  it('normalizeHex expands 3-digit', () => expect(normalizeHex('#F00')).toBe('#FF0000'));
});
```

## Performance Considerations
```ts
// Debounce for smooth UI
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(...args), delay); }) as T;
}

// Memoize color conversions
const colorCache = new Map<string, Color>();
export function createColorMemoized(hex: string): Color {
  const n = normalizeHex(hex);
  if (colorCache.has(n)) return colorCache.get(n)!;
  const color = createColor(n);
  if (colorCache.size >= 1000) colorCache.delete(colorCache.keys().next().value);
  colorCache.set(n, color);
  return color;
}
```

## Publishing Checklist

1. Manifest: Validate with Chrome Manifest Validator
2. Icons: 16, 32, 48, 128px PNG with transparency
3. Permissions: Use minimum required; document rationale
4. Testing: Chrome, Edge, keyboard shortcuts, eye dropper, storage limits
5. Privacy Policy: Local storage only, no data collection, no external requests
6. Store Listing: Title, description, screenshots, categories, analytics

### Sample Privacy Section
```markdown
## Privacy Policy
This extension stores all data locally. No personal information is collected or transmitted. Color picking only reads pixel data locally. Uninstalling removes all data.
```
