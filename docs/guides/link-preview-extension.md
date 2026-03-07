# Building a Link Preview Extension

## Overview

A link preview extension displays rich previews of URLs when users hover over links. This guide covers building a production-ready link preview Chrome extension using Manifest V3 and TypeScript.

## Architecture and Manifest Setup

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Link Preview Pro",
  "version": "1.0.0",
  "description": "Display rich link previews on hover",
  "permissions": ["storage", "activeTab", "scripting", "tabs"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.js", "type": "module" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle"
  }],
  "action": { "default_popup": "popup.html" }
}
```

## Core TypeScript Implementation

### Type Definitions

```ts
// src/shared/types.ts
export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  type: 'website' | 'video' | 'article' | 'product';
  fetchedAt: number;
}

export interface PreviewRequest {
  url: string;
  tabId: number;
  position?: { x: number; y: number };
}

export interface StorageSchema {
  enabled: boolean;
  hoverDelay: number;
  showImages: boolean;
  maxCacheAge: number;
  excludedDomains: string[];
}

export type MessageType = 
  | { type: 'GET_PREVIEW'; payload: PreviewRequest }
  | { type: 'PREVIEW_RESULT'; payload: { success: boolean; preview?: LinkPreview } };
```

### Background Service Worker

```ts
// src/background/index.ts
import { fetchLinkMetadata } from './preview';
import { getCache, setCache, isCacheValid } from './cache';

const PREVIEW_CACHE_TTL = 24 * 60 * 60 * 1000;

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'GET_PREVIEW') {
    handlePreviewRequest(message.payload);
  }
  return true;
});

async function handlePreviewRequest(request: PreviewRequest) {
  const { url } = request;
  
  const cached = await getCache(url);
  if (cached && isCacheValid(cached.fetchedAt, PREVIEW_CACHE_TTL)) {
    return { success: true, preview: cached };
  }

  try {
    const preview = await fetchLinkMetadata(url);
    await setCache(url, preview);
    return { success: true, preview };
  } catch (error) {
    console.error('Preview fetch failed:', error);
    return { success: false, error: String(error) };
  }
}
```

### Link Metadata Fetcher

```ts
// src/background/preview.ts
export async function fetchLinkMetadata(url: string): Promise<LinkPreview> {
  const response = await fetch(url, { mode: 'no-cors', credentials: 'omit' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const title = getMeta(doc, 'og:title') || doc.title || 'Untitled';
  const description = getMeta(doc, 'og:description') || getMeta(doc, 'description') || '';
  const image = getMeta(doc, 'og:image');
  const siteName = getMeta(doc, 'og:site_name');
  const favicon = `${new URL(url).origin}/favicon.ico`;

  return {
    url,
    title,
    description: description.slice(0, 300),
    image,
    favicon,
    siteName,
    type: determineType(url),
    fetchedAt: Date.now(),
  };
}

function getMeta(doc: Document, prop: string): string | null {
  const el = doc.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
  return el?.getAttribute('content');
}

function determineType(url: string): LinkPreview['type'] {
  const h = new URL(url).hostname.toLowerCase();
  if (h.includes('youtube') || h.includes('vimeo')) return 'video';
  if (h.includes('amazon') || h.includes('ebay')) return 'product';
  return 'website';
}
```

## UI Design

### Link Detection

```ts
// src/content/detector.ts
export class LinkDetector {
  private observer: MutationObserver;

  constructor(private onLinkHover: (url: string) => void) {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => m.addedNodes.forEach((n) => {
        if (n.nodeType === Node.ELEMENT_NODE) this.processElement(n as Element);
      }));
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('a[href]').forEach((el) => this.processElement(el));
  }

  private processElement(el: Element): void {
    const link = el as HTMLAnchorElement;
    if (link._previewInit || !this.isHttpUrl(link.href)) return;
    link._previewInit = true;
    link.addEventListener('mouseenter', () => this.onLinkHover(link.href));
  }

  private isHttpUrl(s: string): boolean {
    try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; }
    catch { return false; }
  }

  destroy(): void { this.observer.disconnect(); }
}
declare global { interface HTMLAnchorElement { _previewInit?: boolean; } }
```

### Preview Overlay

```ts
// src/content/overlay.ts
const STYLES = `
.lp-overlay { position:absolute; z-index:2147483647; width:300px; background:#fff;
  border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.15); font-family:system-ui;
  opacity:0; transform:translateY(10px); transition:opacity 0.2s,transform 0.2s; }
.lp-overlay.visible { opacity:1; transform:translateY(0); }
.lp-img { width:100%; height:150px; object-fit:cover; }
.lp-content { padding:12px; }
.lp-site { display:flex; align-items:center; gap:6px; font-size:11px; color:#666; }
.lp-title { font-size:14px; font-weight:600; margin:4px 0; display:-webkit-box;
  -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.lp-desc { font-size:12px; color:#555; line-height:1.4; display:-webkit-box;
  -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
`;

export class PreviewOverlay {
  private el: HTMLDivElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'lp-overlay';
    document.body.appendChild(this.injectStyles());
  }

  private injectStyles(): HTMLStyleElement {
    const s = document.createElement('style');
    s.textContent = STYLES;
    document.head.appendChild(s);
    return s;
  }

  show(preview: LinkPreview, target: Element): void {
    const rect = target.getBoundingClientRect();
    let top = rect.bottom + scrollY + 10, left = rect.left + scrollX;
    if (left + 300 > innerWidth) left = innerWidth - 310;
    
    this.el.innerHTML = `
      ${preview.image ? `<img class="lp-img" src="${preview.image}" loading="lazy"/>` : ''}
      <div class="lp-content">
        <div class="lp-site">
          ${preview.favicon ? `<img width="14" src="${preview.favicon}"/>` : ''}
          <span>${preview.siteName || new URL(preview.url).hostname}</span>
        </div>
        <div class="lp-title">${escapeHtml(preview.title)}</div>
        ${preview.description ? `<div class="lp-desc">${escapeHtml(preview.description)}</div>` : ''}
      </div>
    `;
    this.el.style.top = `${top}px`;
    this.el.style.left = `${left}px`;
    this.el.classList.add('visible');
  }

  hide(): void { this.el.classList.remove('visible'); }
  destroy(): void { this.el.remove(); }
}

function escapeHtml(s: string): string {
  const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
}
```

## Chrome APIs and Permissions

| API | Permission | Use Case |
|-----|------------|----------|
| `chrome.storage` | `storage` | Cache previews, user settings |
| `chrome.runtime` | (default) | Message passing |
| `chrome.tabs` | `tabs` | Get active tab info |
| `chrome.scripting` | `scripting` | Inject content scripts |
| `chrome.webNavigation` | `webNavigation` | Track navigation events |

## State Management

```ts
// src/shared/storage.ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  enabled: true,
  hoverDelay: 300,
  showImages: true,
  maxCacheAge: 24 * 60 * 60 * 1000,
  excludedDomains: [] as string[],
});

export const storage = createStorage({ schema, area: 'local' });
```

## Error Handling

```ts
export class PreviewError extends Error {
  constructor(msg: string, public readonly code: string, public retryable = false) {
    super(msg); this.name = 'PreviewError';
  }
}

export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e) { if (i === retries - 1) throw e; await new Promise(r => setTimeout(r, 1000 * 2 ** i)); }
  }
  throw new Error('Unreachable');
}

export function isValidUrl(url: string): boolean {
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}
```

## Testing

```ts
// tests/preview.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchLinkMetadata } from '../src/background/preview';

describe('LinkPreview', () => {
  it('extracts og:title', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<meta property="og:title" content="Test Title"/>'),
    });
    const result = await fetchLinkMetadata('https://example.com');
    expect(result.title).toBe('Test Title');
  });
});
```

## Performance Considerations

- **Debounce** hover events (150-300ms delay)
- **Cache** metadata in chrome.storage (24hr TTL)
- **Lazy load** preview images with `loading="lazy"`
- **Throttle** DOM observations with MutationObserver
- **Limit** concurrent fetches to 3
- **Clean up** overlay on page unload

## Publishing Checklist

- [ ] Manifest V3 compliant (no remote code)
- [ ] Minimal permissions declared
- [ ] Privacy policy if collecting data
- [ ] Screenshots: 1280x800, 640x400 (2-5 images)
- [ ] Icons: 16, 48, 128, 256, 512px
- [ ] Tested on Chrome, Edge, Firefox

```bash
# Package
zip -r release.zip dist/

# Upload via Developer Dashboard or CLI
npx chrome-webstore-upload --source release.zip --extension-id $ID \
  --client-id $CLIENT_ID --client-secret $SECRET --refresh-token $TOKEN --publish
```
