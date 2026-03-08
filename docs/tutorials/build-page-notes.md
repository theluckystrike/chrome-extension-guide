---
layout: default
title: "Chrome Extension Page Notes — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-page-notes/"
---
# Build a Per-Page Notes Extension

## What You'll Build
Chrome extension saving notes linked to pages with markdown support and full-text search. Notes associate with URLs, render markdown, search across all notes, and sync across devices.

## Manifest
```json
{
  "manifest_version": 3,
  "name": "Page Notes",
  "version": "1.0",
  "permissions": ["activeTab", "storage", "sidePanel"],
  "side_panel": { "default_path": "sidepanel.html" },
  "action": {},
  "background": { "service_worker": "background.js" }
}
```

## Step 1: Side Panel UI
Open side panel on icon click.
```typescript
chrome.sidePanel.setOptions({ path: 'sidepanel.html' });
chrome.action.onClicked.addListener(async (tab) => await chrome.sidePanel.open({ tabId: tab.id }));
```

## Step 2: Storage Schema
Notes keyed by normalized URL with content, timestamp, and tags.
```typescript
interface PageNote { url: string; content: string; tags: string[]; createdAt: number; updatedAt: number; }
```

## Step 3: URL Normalization
Strip query params and anchors for consistent keys.
```typescript
function normalizeUrl(url: string): string { try { const u = new URL(url); return u.origin + u.pathname; } catch { return url; } }
```

## Step 4: Auto-Save with Debounce
```typescript
let saveTimeout: number;
function debouncedSave(note: PageNote): void {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const notes = (await chrome.storage.local.get('pageNotes')).pageNotes || {};
    notes[normalizeUrl(note.url)] = { ...note, updatedAt: Date.now() };
    await chrome.storage.local.set({ pageNotes: notes });
  }, 500);
}
```

## Step 5: Markdown Preview Toggle
Simple parser without eval.
```typescript
function parseMarkdown(text: string): string {
  return text.replace(/^### (.*$)/gm, '<h3>$1</h3>').replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
}
```

## Step 6: Tags for Organization
```typescript
function addTag(note: PageNote, tag: string): PageNote { return note.tags.includes(tag) ? note : { ...note, tags: [...note.tags, tag] }; }
function filterByTag(notes: PageNote[], tag: string): PageNote[] { return notes.filter(n => n.tags.includes(tag)); }
```

## Step 7: Search Across All Notes
```typescript
async function searchNotes(query: string): Promise<PageNote[]> {
  const { pageNotes: notes = {} } = await chrome.storage.local.get('pageNotes');
  const q = query.toLowerCase();
  return Object.values(notes).filter(n => n.content.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q)));
}
```

## Step 8: Note List View & Export
```typescript
async function getAllNotes(): Promise<PageNote[]> {
  const { pageNotes: notes = {} } = await chrome.storage.local.get('pageNotes');
  return Object.values(notes).sort((a, b) => b.updatedAt - a.updatedAt);
}
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status === 'complete' && tab.url) {
    const all = await getAllNotes();
    const count = all.filter(n => n.url === normalizeUrl(tab.url)).length;
    chrome.action.setBadgeText({ tabId, text: count ? String(count) : '' });
  }
});
function exportMarkdown(notes: PageNote[]): string { return notes.map(n => `# ${n.url}\n\nTags: ${n.tags.join(', ')}\n\n${n.content}`).join('\n\n---\n\n'); }
function exportJSON(notes: PageNote[]): string { return JSON.stringify(notes, null, 2); }
```

## Sync Notes
Use `chrome.storage.sync` for cross-device sync (watch ~100KB quota): `await chrome.storage.sync.set({ pageNotes: notes });` or local for larger data.

## Cross-references
- [api-reference/storage-api-deep-dive.md](../api-reference/storage-api-deep-dive.md)
- [mv3/side-panel.md](../mv3/side-panel.md)
- [patterns/throttle-debounce-extensions.md](../patterns/throttle-debounce-extensions.md)
