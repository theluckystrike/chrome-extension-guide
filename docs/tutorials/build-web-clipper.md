---
layout: default
title: "Chrome Extension Web Clipper — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-web-clipper/"
---
# Build a Web Clipper Extension -- Full Tutorial

## What We're Building {#what-were-building}

A Notion/Evernote-style web clipper Chrome extension that lets you save content from any page:

- Clip full pages, text selections, or screenshots
- Extract page metadata (title, description, og:image, author)
- Convert selections to Markdown
- Reader-mode article extraction
- Screenshot capture via `chrome.tabs.captureVisibleTab`
- Side panel for managing and browsing saved clips
- Export clips as Markdown or JSON

## Prerequisites {#prerequisites}

- Chrome 116+ with Manifest V3 and Side Panel API support
- Node.js 18+ and npm
- Basic TypeScript and Chrome extension knowledge (cross-ref: `docs/guides/extension-architecture.md`)

```bash
mkdir web-clipper && cd web-clipper
npm init -y
npm install -D typescript @types/chrome
npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging
mkdir -p src public
```

## Step 1: Manifest with activeTab, Storage, and Side Panel Permissions {#step-1-manifest-with-activetab-storage-and-side-panel-permissions}

`public/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Web Clipper",
  "version": "1.0.0",
  "description": "Clip pages, selections, and screenshots from any website",
  "permissions": ["activeTab", "storage", "sidePanel"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
  },
  "background": { "service_worker": "background.js" },
  "side_panel": { "default_path": "sidepanel.html" },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": { "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
}
```

Key permissions:
- `activeTab` -- granted when the user clicks the action button, gives access to the current tab without broad host permissions
- `storage` -- for persisting clips in `chrome.storage.local`
- `sidePanel` -- for the clip manager sidebar

## Step 2: Action Popup with Clip Options {#step-2-action-popup-with-clip-options}

`public/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <h2>Web Clipper</h2>
  <button class="clip-btn" id="clip-page">
    <span class="icon">&#128196;</span>
    <span>
      <span class="label">Clip Full Page</span><br/>
      <span class="desc">Extract article content in reader mode</span>
    </span>
  </button>
  <button class="clip-btn" id="clip-selection">
    <span class="icon">&#9997;</span>
    <span>
      <span class="label">Clip Selection</span><br/>
      <span class="desc">Save highlighted text as Markdown</span>
    </span>
  </button>
  <button class="clip-btn" id="clip-screenshot">
    <span class="icon">&#128247;</span>
    <span>
      <span class="label">Clip Screenshot</span><br/>
      <span class="desc">Capture visible area as image</span>
    </span>
  </button>
  <div class="status" id="status"></div>
  <hr />
  <button class="open-panel" id="open-panel">Open clip manager</button>
  <script src="popup.js"></script>
</body>
</html>
```

`src/popup.ts`:

```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  clipPage: { request: void; response: { success: boolean } };
  clipSelection: { request: void; response: { success: boolean } };
  clipScreenshot: { request: void; response: { success: boolean } };
  openSidePanel: { request: void; response: void };
};

const messenger = createMessenger<Messages>();

function showStatus(msg: string) {
  const el = document.getElementById('status')!;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2000);
}

document.getElementById('clip-page')!.addEventListener('click', async () => {
  const { success } = await messenger.sendMessage('clipPage', undefined);
  showStatus(success ? 'Page clipped!' : 'Failed to clip page');
});

document.getElementById('clip-selection')!.addEventListener('click', async () => {
  const { success } = await messenger.sendMessage('clipSelection', undefined);
  showStatus(success ? 'Selection clipped!' : 'No text selected');
});

document.getElementById('clip-screenshot')!.addEventListener('click', async () => {
  const { success } = await messenger.sendMessage('clipScreenshot', undefined);
  showStatus(success ? 'Screenshot saved!' : 'Failed to capture');
});

document.getElementById('open-panel')!.addEventListener('click', () => {
  messenger.sendMessage('openSidePanel', undefined);
  window.close();
});
```

## Step 3: Content Script -- Extract Page Metadata {#step-3-content-script-extract-page-metadata}

`src/content.ts` runs on every page and responds to messages from the background script. It extracts structured metadata using Open Graph tags and standard meta elements:

```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type ContentMessages = {
  getMetadata: { request: void; response: PageMetadata };
  getSelection: { request: void; response: string };
  getArticle: { request: void; response: ArticleContent };
};

interface PageMetadata {
  title: string;
  description: string;
  url: string;
  ogImage: string;
  author: string;
  siteName: string;
  publishedDate: string;
}

interface ArticleContent {
  title: string;
  content: string;
  textContent: string;
  byline: string;
}

const messenger = createMessenger<ContentMessages>();

function getMeta(name: string): string {
  const selectors = [
    `meta[property="${name}"]`,
    `meta[name="${name}"]`,
    `meta[property="og:${name}"]`,
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLMetaElement>(sel);
    if (el?.content) return el.content;
  }
  return '';
}

messenger.onMessage('getMetadata', async () => {
  return {
    title: document.title || getMeta('og:title'),
    description: getMeta('description') || getMeta('og:description'),
    url: window.location.href,
    ogImage: getMeta('og:image') || getMeta('twitter:image'),
    author: getMeta('author') || getMeta('article:author') ||
            document.querySelector('[rel="author"]')?.textContent?.trim() || '',
    siteName: getMeta('og:site_name'),
    publishedDate: getMeta('article:published_time') || getMeta('datePublished'),
  };
});
```

## Step 4: Selection Clipper with Markdown Conversion {#step-4-selection-clipper-with-markdown-conversion}

Add the selection handler to `src/content.ts`. This converts the selected HTML to Markdown by walking the DOM tree:

```typescript
function htmlToMarkdown(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(walk).join('');

    switch (tag) {
      case 'strong': case 'b': return `**${children}**`;
      case 'em': case 'i': return `*${children}*`;
      case 'code': return `\`${children}\``;
      case 'a': return `[${children}](${(el as HTMLAnchorElement).href})`;
      case 'h1': return `\n# ${children}\n`;
      case 'h2': return `\n## ${children}\n`;
      case 'h3': return `\n### ${children}\n`;
      case 'p': return `\n${children}\n`;
      case 'br': return '\n';
      case 'li': return `- ${children}\n`;
      case 'blockquote': return `\n> ${children.trim()}\n`;
      case 'pre': return `\n\`\`\`\n${el.textContent}\n\`\`\`\n`;
      case 'img': return `![${(el as HTMLImageElement).alt}](${(el as HTMLImageElement).src})`;
      default: return children;
    }
  }

  return walk(div).replace(/\n{3,}/g, '\n\n').trim();
}

messenger.onMessage('getSelection', async () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return '';

  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);

  return htmlToMarkdown(wrapper.innerHTML);
});
```

## Step 5: Full Page Article Extraction (Reader Mode Parsing) {#step-5-full-page-article-extraction-reader-mode-parsing}

Add the article extractor to `src/content.ts`. This is a simplified reader-mode parser that identifies the main content node using scoring heuristics:

```typescript
function extractArticle(): ArticleContent {
  // Score candidate nodes by text density and semantic signals
  const candidates = document.querySelectorAll('article, [role="main"], main, .post-content, .entry-content, .article-body');
  let bestNode: Element | null = null;
  let bestScore = 0;

  if (candidates.length > 0) {
    // Prefer semantic elements
    bestNode = candidates[0];
  } else {
    // Fall back to scoring paragraphs' parent nodes
    const paragraphs = document.querySelectorAll('p');
    const scores = new Map<Element, number>();

    paragraphs.forEach((p) => {
      const parent = p.parentElement;
      if (!parent) return;
      const text = p.textContent || '';
      if (text.length < 25) return;
      const score = (scores.get(parent) || 0) + text.length;
      scores.set(parent, score);
      if (score > bestScore) { bestScore = score; bestNode = parent; }
    });
  }

  const node = bestNode || document.body;
  const title = document.title;
  const byline = getMeta('author') || '';

  // Convert content to markdown
  const content = htmlToMarkdown(node.innerHTML);
  const textContent = node.textContent?.trim() || '';

  return { title, content, textContent, byline };
}

messenger.onMessage('getArticle', async () => {
  return extractArticle();
});
```

## Step 6: Screenshot Capture with chrome.tabs.captureVisibleTab {#step-6-screenshot-capture-with-chrometabscapturevisibletab}

The background service worker handles all clip actions and screenshot capture. `src/background.ts`:

```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

interface Clip {
  id: string;
  type: 'page' | 'selection' | 'screenshot';
  title: string;
  url: string;
  content: string;        // Markdown text or data URL for screenshots
  metadata: {
    description: string;
    ogImage: string;
    author: string;
    siteName: string;
  };
  createdAt: number;
}

const schema = defineSchema({ clips: 'json' as const });
const storage = createStorage(schema, 'local');

type Messages = {
  clipPage: { request: void; response: { success: boolean } };
  clipSelection: { request: void; response: { success: boolean } };
  clipScreenshot: { request: void; response: { success: boolean } };
  openSidePanel: { request: void; response: void };
  getClips: { request: void; response: Clip[] };
  deleteClip: { request: { id: string }; response: void };
  exportClips: { request: { format: 'markdown' | 'json' }; response: string };
};

type ContentMessages = {
  getMetadata: { request: void; response: any };
  getSelection: { request: void; response: string };
  getArticle: { request: void; response: any };
};

const messenger = createMessenger<Messages>();
const contentMessenger = createMessenger<ContentMessages>();

async function getClips(): Promise<Clip[]> {
  const raw = await storage.get('clips');
  return (raw as Clip[] | null) || [];
}

async function saveClip(clip: Clip): Promise<void> {
  const clips = await getClips();
  clips.unshift(clip);
  await storage.set('clips', clips as any);
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Clip full page -- sends message to content script to extract article
messenger.onMessage('clipPage', async () => {
  try {
    const tab = await getActiveTab();
    if (!tab.id) return { success: false };

    const metadata = await chrome.tabs.sendMessage(tab.id, { type: 'getMetadata' });
    const article = await chrome.tabs.sendMessage(tab.id, { type: 'getArticle' });

    const clip: Clip = {
      id: crypto.randomUUID(),
      type: 'page',
      title: article.title || tab.title || 'Untitled',
      url: tab.url || '',
      content: article.content,
      metadata: {
        description: metadata.description,
        ogImage: metadata.ogImage,
        author: metadata.author || article.byline,
        siteName: metadata.siteName,
      },
      createdAt: Date.now(),
    };

    await saveClip(clip);
    return { success: true };
  } catch {
    return { success: false };
  }
});

// Clip selection -- gets selected text as Markdown from content script
messenger.onMessage('clipSelection', async () => {
  try {
    const tab = await getActiveTab();
    if (!tab.id) return { success: false };

    const markdown = await chrome.tabs.sendMessage(tab.id, { type: 'getSelection' });
    if (!markdown) return { success: false };

    const metadata = await chrome.tabs.sendMessage(tab.id, { type: 'getMetadata' });

    const clip: Clip = {
      id: crypto.randomUUID(),
      type: 'selection',
      title: metadata.title || tab.title || 'Untitled',
      url: tab.url || '',
      content: markdown,
      metadata: {
        description: metadata.description,
        ogImage: metadata.ogImage,
        author: metadata.author,
        siteName: metadata.siteName,
      },
      createdAt: Date.now(),
    };

    await saveClip(clip);
    return { success: true };
  } catch {
    return { success: false };
  }
});

// Screenshot -- uses chrome.tabs.captureVisibleTab to grab the viewport
messenger.onMessage('clipScreenshot', async () => {
  try {
    const tab = await getActiveTab();
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId!, { format: 'png' });

    const clip: Clip = {
      id: crypto.randomUUID(),
      type: 'screenshot',
      title: tab.title || 'Screenshot',
      url: tab.url || '',
      content: dataUrl,
      metadata: { description: '', ogImage: '', author: '', siteName: '' },
      createdAt: Date.now(),
    };

    await saveClip(clip);
    return { success: true };
  } catch {
    return { success: false };
  }
});

// Open side panel
messenger.onMessage('openSidePanel', async () => {
  const tab = await getActiveTab();
  await chrome.sidePanel.open({ tabId: tab.id! });
});
```

The `captureVisibleTab` call captures only the currently visible viewport as a PNG data URL. No extra permissions are needed beyond `activeTab` because the capture happens in response to the user clicking the extension action.

## Step 7: Side Panel -- Clip Storage and Management {#step-7-side-panel-clip-storage-and-management}

`public/sidepanel.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="sidepanel.css" />
</head>
<body>
  <h2>Saved Clips</h2>
  <div class="toolbar">
    <input type="text" id="search" placeholder="Search clips..." />
    <select id="filter">
      <option value="all">All</option>
      <option value="page">Pages</option>
      <option value="selection">Selections</option>
      <option value="screenshot">Screenshots</option>
    </select>
    <button id="export-md">Export MD</button>
    <button id="export-json">Export JSON</button>
  </div>
  <ul class="clip-list" id="clip-list"></ul>
  <script src="sidepanel.js"></script>
</body>
</html>
```

`src/sidepanel.ts`:

```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

interface Clip {
  id: string;
  type: 'page' | 'selection' | 'screenshot';
  title: string;
  url: string;
  content: string;
  metadata: { description: string; ogImage: string; author: string; siteName: string };
  createdAt: number;
}

const schema = defineSchema({ clips: 'json' as const });
const storage = createStorage(schema, 'local');

async function getClips(): Promise<Clip[]> {
  const raw = await storage.get('clips');
  return (raw as Clip[] | null) || [];
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function truncate(text: string, len: number): string {
  return text.length > len ? text.slice(0, len) + '...' : text;
}

function renderClips(clips: Clip[], searchQuery: string, typeFilter: string): void {
  const list = document.getElementById('clip-list')!;
  list.innerHTML = '';

  let filtered = clips;
  if (typeFilter !== 'all') filtered = filtered.filter((c) => c.type === typeFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((c) =>
      c.title.toLowerCase().includes(q) || c.content.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty">No clips found</li>';
    return;
  }

  filtered.forEach((clip) => {
    const li = document.createElement('li');
    li.className = 'clip-item';

    const preview = clip.type === 'screenshot'
      ? `<div class="clip-preview"><img src="${clip.content}" alt="screenshot" /></div>`
      : `<div class="clip-preview">${truncate(clip.content.replace(/[#*`>\[\]]/g, ''), 150)}</div>`;

    li.innerHTML = `
      <div class="clip-title">${clip.title}</div>
      <div class="clip-meta">${clip.type} &middot; ${formatDate(clip.createdAt)} &middot;
        <a href="${clip.url}" target="_blank" style="color:#7c83ff">${truncate(clip.url, 40)}</a></div>
      ${preview}
      <div class="clip-actions">
        <button class="btn-copy" data-id="${clip.id}">Copy</button>
        <button class="btn-delete" data-id="${clip.id}">Delete</button>
      </div>`;
    list.appendChild(li);
  });

  // Event delegation for actions
  list.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id!;
      let clips = await getClips();
      clips = clips.filter((c) => c.id !== id);
      await storage.set('clips', clips as any);
      renderClips(clips, searchQuery, typeFilter);
    });
  });

  list.querySelectorAll('.btn-copy').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id!;
      const clip = (await getClips()).find((c) => c.id === id);
      if (clip) await navigator.clipboard.writeText(clip.content);
    });
  });
}

// Initialize
(async () => {
  const clips = await getClips();
  const searchInput = document.getElementById('search') as HTMLInputElement;
  const filterSelect = document.getElementById('filter') as HTMLSelectElement;

  renderClips(clips, '', 'all');

  searchInput.addEventListener('input', async () => {
    renderClips(await getClips(), searchInput.value, filterSelect.value);
  });
  filterSelect.addEventListener('change', async () => {
    renderClips(await getClips(), searchInput.value, filterSelect.value);
  });

  // Export buttons
  document.getElementById('export-md')!.addEventListener('click', () => exportClips('markdown'));
  document.getElementById('export-json')!.addEventListener('click', () => exportClips('json'));
})();
```

## Step 8: Export Clips as Markdown or JSON {#step-8-export-clips-as-markdown-or-json}

Add the export function to `src/sidepanel.ts`:

```typescript
async function exportClips(format: 'markdown' | 'json'): Promise<void> {
  const clips = await getClips();
  let output: string;
  let filename: string;
  let mimeType: string;

  if (format === 'markdown') {
    output = clips.map((clip) => {
      const header = [
        `# ${clip.title}`,
        '',
        `- **URL:** ${clip.url}`,
        `- **Type:** ${clip.type}`,
        `- **Date:** ${formatDate(clip.createdAt)}`,
        clip.metadata.author ? `- **Author:** ${clip.metadata.author}` : '',
        clip.metadata.siteName ? `- **Site:** ${clip.metadata.siteName}` : '',
        '',
        '---',
        '',
      ].filter(Boolean).join('\n');

      if (clip.type === 'screenshot') {
        return `${header}![Screenshot](${clip.content})\n`;
      }
      return `${header}${clip.content}\n`;
    }).join('\n\n');
    filename = 'clips-export.md';
    mimeType = 'text/markdown';
  } else {
    const exportData = clips.map(({ content, ...rest }) => ({
      ...rest,
      // Truncate screenshot data URLs in JSON export for readability
      content: rest.type === 'screenshot' ? '[screenshot data URL]' : content,
    }));
    output = JSON.stringify(exportData, null, 2);
    filename = 'clips-export.json';
    mimeType = 'application/json';
  }

  // Trigger download via Blob URL
  const blob = new Blob([output], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

This produces a clean Markdown file with YAML-like frontmatter for each clip, or a structured JSON array. The download triggers via a temporary Blob URL -- no server needed.

## Build, Load, and Test {#build-load-and-test}

Compile with `npx tsc` or your bundler of choice, targeting entry points `popup.ts`, `content.ts`, `background.ts`, and `sidepanel.ts` alongside the HTML and manifest in `dist/`.

Load the extension:

1. Open `chrome://extensions/` and enable Developer mode
2. Click "Load unpacked" and select the `dist/` folder
3. Navigate to any page and click the extension icon

### Testing Checklist {#testing-checklist}

- **Clip Full Page**: Visit an article, click "Clip Full Page" -- check the side panel for the saved Markdown clip
- **Clip Selection**: Highlight text, click "Clip Selection" -- verify bold, links, and headings survive conversion
- **Clip Screenshot**: Click "Clip Screenshot" -- verify the PNG preview renders in the side panel
- **Side Panel**: Search, filter by type, delete clips, and copy content to clipboard
- **Export**: Click "Export MD" or "Export JSON" -- verify the downloaded file is well-formed
- **Metadata**: Verify title, URL, author, and site name are correctly extracted from meta tags

### Debugging Tips {#debugging-tips}

- Run `chrome.storage.local.get(null, console.log)` in the service worker console to inspect stored clips
- Content script errors appear in the page's DevTools console, not the extension's
- If `captureVisibleTab` fails, ensure the capture runs in response to a user click so `activeTab` is granted

## Summary {#summary}

This tutorial built a complete web clipper extension with three capture modes (full page, selection, screenshot), a content script that extracts metadata and converts HTML to Markdown, a side panel for managing clips, and export functionality. The extension uses `@theluckystrike/webext-storage` for typed persistent storage and `@theluckystrike/webext-messaging` for type-safe communication between popup, background, and content scripts.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
