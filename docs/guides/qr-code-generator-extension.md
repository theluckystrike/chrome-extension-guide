Building a QR Code Generator Chrome Extension

A QR code generator extension is an excellent project to learn Chrome extension development because it touches on many core concepts: user interfaces, background processing, storage, permissions, and cross-context communication. This guide walks through building a production-ready QR code generator with TypeScript, covering architecture, implementation, and deployment.

Table of Contents

- [Architecture and Manifest Setup](#architecture-and-manifest-setup)
- [Core Implementation with TypeScript](#core-implementation-with-typescript)
- [UI Design](#ui-design)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management and Storage](#state-management-and-storage)
- [Error Handling and Edge Cases](#error-handling-and-edge-cases)
- [Testing Approach](#testing-approach)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

Architecture and Manifest Setup

Recommended Directory Structure

```
qr-code-generator/
 manifest.json
 background/
    service-worker.ts
 popup/
    popup.html
    popup.ts
    popup.css
    components/
 content/
    content.ts
    overlay.ts
 shared/
    types.ts
    utils.ts
 libs/
    qrcode.min.js
 icons/
    icon-16.png
    icon-48.png
    icon-128.png
 tests/
     ...
```

Manifest Configuration (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "QR Code Generator",
  "version": "1.0.0",
  "description": "Generate QR codes from any text or URL",
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content.js"],
      "css": ["content/overlay.css"]
    }
  ],
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

Build Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": ".",
    "rootDir": ".",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

Core Implementation with TypeScript

Shared Types (shared/types.ts)

```typescript
export interface QRCodeOptions {
  text: string;
  width?: number;
  height?: number;
  colorDark?: string;
  colorLight?: string;
  correctLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface QRCodeResult {
  dataUrl: string;
  text: string;
  timestamp: number;
}

export interface StoredSettings {
  defaultSize: number;
  defaultColorDark: string;
  defaultColorLight: string;
  defaultErrorLevel: 'L' | 'M' | 'Q' | 'H';
  history: QRCodeResult[];
}

export interface ExtensionMessage {
  type: 'GENERATE_QR' | 'QR_GENERATED' | 'COPY_TO_CLIPBOARD' | 'OPEN_OVERLAY';
  payload?: unknown;
}

export type MessageHandler = (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => void;
```

QR Code Generator Service (shared/qrcode.ts)

```typescript
import { QRCodeOptions, QRCodeResult } from './types';

// Using a lightweight QR code library like qrcode-generator
import QRCode from 'qrcode-generator';

export class QRCodeGenerator {
  private static instance: QRCodeGenerator;

  private constructor() {}

  static getInstance(): QRCodeGenerator {
    if (!QRCodeGenerator.instance) {
      QRCodeGenerator.instance = new QRCodeGenerator();
    }
    return QRCodeGenerator.instance;
  }

  generate(options: QRCodeOptions): QRCodeResult {
    const {
      text,
      width = 256,
      height = 256,
      colorDark = '#000000',
      colorLight = '#ffffff',
      correctLevel = 'M'
    } = options;

    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Validate text length for QR code capacity
    const maxLength = this.getMaxLength(correctLevel);
    if (text.length > maxLength) {
      throw new Error(`Text too long for error correction level ${correctLevel}. Max: ${maxLength} characters`);
    }

    const qr = QRCode(correctLevel === 'L' ? 0 : correctLevel === 'M' ? 1 : correctLevel === 'Q' ? 2 : 3);
    qr.addData(text);
    qr.make();

    const cellSize = Math.floor(Math.min(width, height) / qr.getModuleCount());
    const qrWidth = cellSize * qr.getModuleCount();
    const qrHeight = cellSize * qr.getModuleCount();

    const canvas = document.createElement('canvas');
    canvas.width = qrWidth;
    canvas.height = qrHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw QR code
    for (let row = 0; row < qr.getModuleCount(); row++) {
      for (let col = 0; col < qr.getModuleCount(); col++) {
        ctx.fillStyle = qr.isDark(row, col) ? colorDark : colorLight;
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }

    return {
      dataUrl: canvas.toDataURL('image/png'),
      text: text,
      timestamp: Date.now()
    };
  }

  private getMaxLength(level: string): number {
    const limits: Record<string, number> = {
      'L': 2953,
      'M': 2331,
      'Q': 1663,
      'H': 1273
    };
    return limits[level] || 2331;
  }
}
```

Background Service Worker (background/service-worker.ts)

```typescript
import { ExtensionMessage, StoredSettings, QRCodeResult } from '../shared/types';

const DEFAULT_SETTINGS: StoredSettings = {
  defaultSize: 256,
  defaultColorDark: '#000000',
  defaultColorLight: '#ffffff',
  defaultErrorLevel: 'M',
  history: []
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<unknown> {
  switch (message.type) {
    case 'GENERATE_QR':
      return handleGenerateQR(message.payload as { text: string });
    case 'COPY_TO_CLIPBOARD':
      return handleCopyToClipboard(message.payload as { dataUrl: string });
    case 'OPEN_OVERLAY':
      return handleOpenOverlay();
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

async function handleGenerateQR(payload: { text: string }): Promise<QRCodeResult> {
  const { text } = payload;
  
  // Import QRCodeGenerator dynamically (handled by bundler)
  const { QRCodeGenerator } = await import('../shared/qrcode');
  const generator = QRCodeGenerator.getInstance();
  
  const settings = await getSettings();
  const result = generator.generate({
    text,
    width: settings.defaultSize,
    height: settings.defaultSize,
    colorDark: settings.defaultColorDark,
    colorLight: settings.defaultColorLight,
    correctLevel: settings.defaultErrorLevel
  });

  // Save to history
  await saveToHistory(result);
  
  return result;
}

async function handleCopyToClipboard(payload: { dataUrl: string }): Promise<boolean> {
  try {
    const response = await fetch(payload.dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ]);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

async function handleOpenOverlay(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab.id) {
    await chrome.tabs.sendMessage(tab.id, { type: 'OPEN_OVERLAY' });
  }
}

async function getSettings(): Promise<StoredSettings> {
  const result = await chrome.storage.local.get('settings');
  return result.settings || DEFAULT_SETTINGS;
}

async function saveToHistory(result: QRCodeResult): Promise<void> {
  const settings = await getSettings();
  settings.history.unshift(result);
  
  // Keep only last 50 items
  if (settings.history.length > 50) {
    settings.history = settings.history.slice(0, 50);
  }
  
  await chrome.storage.local.set({ settings });
}
```

---

UI Design

Popup Interface (popup/popup.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Code Generator</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>QR Code Generator</h1>
    </header>
    
    <main>
      <div class="input-section">
        <textarea 
          id="qr-text" 
          placeholder="Enter text or URL..."
          rows="4"
        ></textarea>
        <div class="options">
          <label>
            Size:
            <select id="size-select">
              <option value="128">128x128</option>
              <option value="256" selected>256x256</option>
              <option value="512">512x512</option>
            </select>
          </label>
          <label>
            Error Level:
            <select id="error-level">
              <option value="L">Low (7%)</option>
              <option value="M" selected>Medium (15%)</option>
              <option value="Q">Quartile (25%)</option>
              <option value="H">High (30%)</option>
            </select>
          </label>
        </div>
        <button id="generate-btn" class="primary-btn">Generate QR Code</button>
      </div>
      
      <div class="output-section" id="output-section" hidden>
        <canvas id="qr-canvas"></canvas>
        <div class="actions">
          <button id="download-btn" class="secondary-btn">Download</button>
          <button id="copy-btn" class="secondary-btn">Copy to Clipboard</button>
        </div>
      </div>
      
      <div class="error-message" id="error-message" hidden></div>
    </main>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

Popup Controller (popup/popup.ts)

```typescript
document.addEventListener('DOMContentLoaded', () => {
  const qrText = document.getElementById('qr-text') as HTMLTextAreaElement;
  const sizeSelect = document.getElementById('size-select') as HTMLSelectElement;
  const errorLevel = document.getElementById('error-level') as HTMLSelectElement;
  const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
  const outputSection = document.getElementById('output-section') as HTMLElement;
  const qrCanvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
  const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
  const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
  const errorMessage = document.getElementById('error-message') as HTMLElement;

  let currentDataUrl: string = '';

  generateBtn.addEventListener('click', async () => {
    const text = qrText.value.trim();
    
    if (!text) {
      showError('Please enter some text or URL');
      return;
    }

    try {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
      hideError();

      const result = await chrome.runtime.sendMessage({
        type: 'GENERATE_QR',
        payload: { text }
      }) as { dataUrl: string };

      currentDataUrl = result.dataUrl;
      displayQRCode(result.dataUrl);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to generate QR code');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate QR Code';
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (!currentDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = currentDataUrl;
    link.click();
  });

  copyBtn.addEventListener('click', async () => {
    if (!currentDataUrl) return;
    
    const success = await chrome.runtime.sendMessage({
      type: 'COPY_TO_CLIPBOARD',
      payload: { dataUrl: currentDataUrl }
    }) as boolean;

    if (success) {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy to Clipboard';
      }, 2000);
    } else {
      showError('Failed to copy to clipboard');
    }
  });

  function displayQRCode(dataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      qrCanvas.width = img.width;
      qrCanvas.height = img.height;
      qrCanvas.getContext('2d')?.drawImage(img, 0, 0);
      outputSection.hidden = false;
    };
    img.src = dataUrl;
  }

  function showError(message: string): void {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
  }

  function hideError(): void {
    errorMessage.hidden = true;
  }
});
```

Content Script Overlay (content/overlay.ts)

```typescript
// Create a floating QR code overlay on the current page

interface OverlayElements {
  container: HTMLDivElement;
  closeBtn: HTMLButtonElement;
  qrCanvas: HTMLCanvasElement;
}

let overlay: OverlayElements | null = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'OPEN_OVERLAY') {
    createOverlay();
  }
});

function createOverlay(): void {
  if (overlay) {
    overlay.container.style.display = 'flex';
    return;
  }

  overlay = {
    container: document.createElement('div'),
    closeBtn: document.createElement('button'),
    qrCanvas: document.createElement('canvas')
  };

  // Style the container
  Object.assign(overlay.container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '300px',
    padding: '20px',
    background: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: '2147483647',
    fontFamily: 'system-ui, sans-serif'
  });

  overlay.closeBtn.textContent = '×';
  Object.assign(overlay.closeBtn.style, {
    position: 'absolute',
    top: '10px',
    right: '10px',
    border: 'none',
    background: 'transparent',
    fontSize: '24px',
    cursor: 'pointer'
  });
  overlay.closeBtn.onclick = () => {
    overlay!.container.style.display = 'none';
  };

  overlay.container.append(overlay.closeBtn, overlay.qrCanvas);
  document.body.appendChild(overlay.container);

  // Listen for QR code updates
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings?.newValue?.history) {
      const latest = changes.settings.newValue.history[0];
      if (latest) {
        const img = new Image();
        img.onload = () => {
          overlay!.qrCanvas.width = img.width;
          overlay!.qrCanvas.height = img.height;
          overlay!.qrCanvas.getContext('2d')?.drawImage(img, 0, 0);
        };
        img.src = latest.dataUrl;
      }
    }
  });
}
```

---

Chrome APIs and Permissions

Required Permissions Explained

| Permission | Purpose |
|------------|---------|
| `storage` | Save user settings and QR code history |
| `activeTab` | Access current tab for overlay injection |
| `scripting` | Inject content scripts dynamically |

Optional Permissions (for advanced features)

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"  // Only if you need to generate QR from any page content
  ]
}
```

Using chrome.storage

```typescript
// Synchronous access (MV3)
const result = await chrome.storage.local.get(['key']);
const value = result.key;

// Set value
await chrome.storage.local.set({ key: 'value' });

// Remove value
await chrome.storage.local.remove(['key']);

// Clear all
await chrome.storage.local.clear();

// Listen for changes
chrome.storage.onChanged.addListener((changes, area) => {
  console.log('Storage changed:', changes);
});
```

---

State Management and Storage

Using chrome.storage for Settings

```typescript
interface AppState {
  settings: StoredSettings;
  currentQR: QRCodeResult | null;
  isGenerating: boolean;
}

class StateManager {
  private state: AppState = {
    settings: DEFAULT_SETTINGS,
    currentQR: null,
    isGenerating: false
  };

  private listeners: Set<(state: AppState) => void> = new Set();

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  async loadSettings(): Promise<void> {
    const result = await chrome.storage.local.get('settings');
    this.state.settings = result.settings || DEFAULT_SETTINGS;
    this.notify();
  }

  async updateSettings(updates: Partial<StoredSettings>): Promise<void> {
    this.state.settings = { ...this.state.settings, ...updates };
    await chrome.storage.local.set({ settings: this.state.settings });
    this.notify();
  }
}

export const stateManager = new StateManager();
```

Background State Sync

```typescript
// Use message passing to sync state between contexts
async function syncState(): Promise<void> {
  const settings = await chrome.storage.local.get('settings');
  
  // Broadcast to all contexts
  await chrome.runtime.sendMessage({
    type: 'STATE_SYNC',
    payload: settings
  });
}
```

---

Error Handling and Edge Cases

Comprehensive Error Handling

```typescript
class QRErrorHandler {
  static handle(error: unknown): string {
    if (error instanceof Error) {
      return this.mapError(error);
    }
    return 'An unexpected error occurred';
  }

  private static mapError(error: Error): string {
    const errorMap: Record<string, string> = {
      'Text too long': 'The input text exceeds the maximum length for the selected error correction level. Try using a shorter text or higher error correction level.',
      'Text cannot be empty': 'Please enter some text or URL to generate a QR code.',
      'Could not get canvas context': 'Unable to render QR code. Please try again.',
      'Failed to copy': 'Failed to copy QR code to clipboard. Please try downloading instead.'
    };

    return errorMap[error.message] || error.message;
  }
}

// Usage in async functions
try {
  const result = await generateQRCode(text);
  return result;
} catch (error) {
  throw new Error(QRErrorHandler.handle(error));
}
```

Edge Cases to Handle

1. Empty input: Show validation message
2. Very long text: Warn about QR code capacity
3. Invalid characters: Handle Unicode properly
4. Storage quota exceeded: Prune history
5. Clipboard API failure: Provide download fallback
6. Network offline: Generate QR codes offline (library-based)

---

Testing Approach

Unit Testing with Vitest

```typescript
// tests/qrcode.test.ts
import { describe, it, expect } from 'vitest';
import { QRCodeGenerator } from '../shared/qrcode';

describe('QRCodeGenerator', () => {
  const generator = QRCodeGenerator.getInstance();

  it('should generate a valid QR code', () => {
    const result = generator.generate({ text: 'Hello World' });
    expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.text).toBe('Hello World');
  });

  it('should throw error for empty text', () => {
    expect(() => generator.generate({ text: '' })).toThrow('Text cannot be empty');
  });

  it('should handle long text with high error correction', () => {
    const longText = 'a'.repeat(1000);
    const result = generator.generate({ 
      text: longText, 
      correctLevel: 'H' 
    });
    expect(result).toBeDefined();
  });
});
```

Integration Testing

```typescript
// tests/integration.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

describe('Extension Integration', () => {
  beforeAll(async () => {
    // Load extension in test browser
  });

  it('should generate QR code from popup', async () => {
    const popup = await openPopup();
    await popup.fillInput('test@example.com');
    await popup.clickGenerate();
    
    const canvas = await popup.waitForCanvas();
    expect(canvas).toBeVisible();
  });
});
```

---

Performance Considerations

Lazy Loading

```typescript
// Only load QR code library when needed
let qrLibrary: typeof import('qrcode-generator') | null = null;

async function loadQRLibrary() {
  if (!qrLibrary) {
    qrLibrary = await import('qrcode-generator');
  }
  return qrLibrary;
}
```

Caching Strategies

```typescript
// Cache generated QR codes for repeated text
const qrCache = new Map<string, QRCodeResult>();
const CACHE_MAX_SIZE = 100;

export function getCachedQR(text: string): QRCodeResult | undefined {
  return qrCache.get(text);
}

export function cacheQR(text: string, result: QRCodeResult): void {
  if (qrCache.size >= CACHE_MAX_SIZE) {
    const firstKey = qrCache.keys().next().value;
    qrCache.delete(firstKey);
  }
  qrCache.set(text, result);
}
```

Memory Management

```typescript
// Clean up large data in content scripts
function cleanup(): void {
  qrCache.clear();
  if (overlay?.container) {
    overlay.container.remove();
    overlay = null;
  }
}

// Listen for page unload
window.addEventListener('unload', cleanup);
```

---

Publishing Checklist

Pre-submission Requirements

- [ ] Test in Chrome, Edge, and Firefox (if supporting)
- [ ] Verify manifest.json is valid
- [ ] All icons provided (16, 48, 128 px)
- [ ] No console errors
- [ ] Privacy policy URL (if collecting data)
- [ ] Screenshots and description ready

Store Listing

```markdown
Description Template
Generate QR codes instantly from any text or URL. Features:
- Instant QR code generation
- Customizable size and colors
- Download or copy to clipboard
- QR code history
- Works offline

Screenshots Required
- Main popup interface
- QR code generated
- Options/settings (if any)
```

Extension Store Submission

1. Package: `zip -r extension.zip . -x "node_modules/*" -x ".git/*"`
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Upload package
4. Fill in listing details
5. Submit for review

Post-publication

- Monitor for user feedback
- Track crash reports in Developer Dashboard
- Update regularly for Chrome compatibility
- Respond to user reviews

---

Summary

Building a QR code generator Chrome extension demonstrates many essential patterns:

- Manifest V3 architecture with service worker, popup, and content scripts
- TypeScript for type safety across all contexts
- chrome.storage for persistent settings and history
- Message passing between extension contexts
- Error handling with user-friendly messages
- Performance optimization through caching and lazy loading
- Testing strategies from unit to integration tests

This foundation can be extended with features like:
- URL shortening integration
- Batch QR code generation
- QR code scanning via camera
- Custom styling and branding
- Cloud sync of history
