---
layout: default
title: "Chrome Extension Meeting Notes — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-meeting-notes/"
---
# Build a Meeting Notes Extension

## What You'll Build {#what-youll-build}
A Chrome extension for quick note-taking during online meetings with timestamp tracking and meeting history.

- Quick note-taking during online meetings (Google Meet, Zoom web)
- Side panel for note editing alongside meeting
- Timestamp notes relative to meeting start
- Auto-detect meeting pages

## Manifest {#manifest}
```json
{
  "manifest_version": 3,
  "name": "MeetingNotes",
  "version": "1.0.0",
  "permissions": ["sidePanel", "storage", "activeTab", "tabs"],
  "host_permissions": ["*://meet.google.com/*", "*://*.zoom.us/*"],
  "side_panel": { "default_path": "sidepanel.html" },
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    {
      "matches": ["*://meet.google.com/*", "*://*.zoom.us/*"],
      "js": ["content.js"]
    }
  ],
  "commands": {
    "timestamp": {
      "suggested_key": "Ctrl+T",
      "description": "Insert timestamp"
    }
  },
  "icons": { "16": "icon-16.png", "48": "icon-48.png", "128": "icon-128.png" }
}
```

## Step 1: Meeting Detection {#step-1-meeting-detection}

Content script detects meeting pages via URL pattern and extracts meeting info from the DOM.

```typescript
// content.ts - Detect meeting pages
const MEETING_PATTERNS = [
  /meet\.google\.com/,
  /zoom\.us\/j\/\d+/
];

function detectMeeting(): MeetingInfo | null {
  const url = window.location.href;
  if (!MEETING_PATTERNS.some(p => p.test(url))) return null;

  let title = '';
  
  // Google Meet
  if (url.includes('meet.google.com')) {
    const titleEl = document.querySelector('[data-meeting-title]');
    title = titleEl?.textContent?.trim() || 'Google Meet';
  }
  
  // Zoom
  if (url.includes('zoom.us')) {
    const titleEl = document.querySelector('.meeting-title');
    title = titleEl?.textContent?.trim() || 'Zoom Meeting';
  }

  return { url, title, startTime: Date.now() };
}

// Send message to background to open side panel
const meeting = detectMeeting();
if (meeting) {
  chrome.runtime.sendMessage({ type: 'MEETING_START', meeting });
}
```

In `background.js`, handle the message and open the side panel:

```typescript
// background.js - chrome.sidePanel.open() can only be called from the background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MEETING_START') {
    chrome.sidePanel.open({ tabId: sender.tab?.id });
  }
});
```

## Step 2: Side Panel Note Editor {#step-2-side-panel-note-editor}

Simple rich text editor with meeting title and auto-save functionality.

```typescript
// sidepanel.ts - Note editor UI
class NoteEditor {
  private editor: HTMLElement;
  private meetingInfo: MeetingInfo | null = null;
  private saveTimeout: number | null = null;

  constructor() {
    this.editor = document.getElementById('editor')!;
    this.init();
  }

  private async init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.meetingInfo = await this.getMeetingInfo(tab);
    
    if (this.meetingInfo) {
      this.renderHeader();
      await this.loadNotes();
      this.setupAutoSave();
    }
  }

  private renderHeader() {
    const header = document.getElementById('header');
    header.innerHTML = `
      <h2>${this.meetingInfo?.title || 'Meeting Notes'}</h2>
      <button id="timestamp-btn">Add Timestamp</button>
    `;
    
    document.getElementById('timestamp-btn')?.addEventListener('click', () => {
      this.insertTimestamp();
    });
  }

  private insertTimestamp() {
    if (!this.meetingInfo) return;
    
    const elapsed = Date.now() - this.meetingInfo.startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const timestamp = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
    
    this.editor.focus();
    document.execCommand('insertText', false, timestamp + ' ');
  }

  private setupAutoSave() {
    this.editor.addEventListener('input', () => {
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = window.setTimeout(() => this.saveNotes(), 500);
    });
  }
}
```

## Step 3: Timestamping {#step-3-timestamping}

Track meeting start time and provide quick timestamp insertion via button or keyboard shortcut.

```typescript
// sidepanel.ts - Keyboard shortcut and timestamp utilities
function setupTimestampShortcut() {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'timestamp') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id!, { type: 'INSERT_TIMESTAMP' });
    }
  });
}

// Make timestamps clickable in review mode
function makeTimestampsClickable() {
  const editor = document.getElementById('editor');
  const regex = /\[(\d{2}):(\d{2})\]/g;
  
  editor.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('timestamp')) {
      const time = target.dataset.time;
      // Jump to position in video if available
      chrome.runtime.sendMessage({ type: 'SEEK_VIDEO', time });
    }
  });
}
```

## Step 4: Note Storage {#step-4-note-storage}

Save per-meeting notes using @theluckystrike/webext-storage with auto-save and retention limits.

```typescript
// storage.ts - Note persistence
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const meetingSchema = defineSchema({
  meetings: 'object',      // Map of meetingUrl -> MeetingNotes
  settings: 'object'       // User preferences
});

const storage = createStorage(meetingSchema, 'local');

interface MeetingNotes {
  meetingUrl: string;
  title: string;
  date: number;
  notes: string;
  duration: number;
}

const MAX_MEETINGS = 50;

async function saveMeetingNotes(notes: MeetingNotes) {
  const meetings = await storage.get('meetings') || {};
  meetings[notes.meetingUrl] = notes;
  
  // Enforce retention limit
  const sorted = Object.values(meetings)
    .sort((a, b) => b.date - a.date)
    .slice(0, MAX_MEETINGS);
  
  const trimmed: Record<string, MeetingNotes> = {};
  sorted.forEach(m => trimmed[m.meetingUrl] = m);
  
  await storage.set('meetings', trimmed);
}

async function loadMeetingNotes(url: string): Promise<MeetingNotes | null> {
  const meetings = await storage.get('meetings') || {};
  return meetings[url] || null;
}
```

## Step 5: Meeting History {#step-5-meeting-history}

List past meeting notes in popup with search and delete capabilities.

```typescript
// popup.ts - Meeting history view
async function renderMeetingHistory() {
  const meetings = await storage.get('meetings') || {};
  const sorted = Object.values(meetings).sort((a, b) => b.date - a.date);
  
  const container = document.getElementById('history-list');
  container.innerHTML = sorted.map(meeting => `
    <div class="meeting-item" data-url="${meeting.meetingUrl}">
      <div class="title">${meeting.title}</div>
      <div class="date">${new Date(meeting.date).toLocaleDateString()}</div>
      <div class="preview">${meeting.notes.substring(0, 100)}...</div>
      <button class="delete-btn" data-url="${meeting.meetingUrl}">Delete</button>
    </div>
  `).join('');
}

// Search functionality
function filterMeetings(query: string, meetings: MeetingNotes[]): MeetingNotes[] {
  const lower = query.toLowerCase();
  return meetings.filter(m => 
    m.title.toLowerCase().includes(lower) ||
    m.notes.toLowerCase().includes(lower) ||
    new Date(m.date).toLocaleDateString().includes(lower)
  );
}
```

## Step 6: Export {#step-6-export}

Export notes as markdown, copy to clipboard, or share via email.

```typescript
// export.ts - Export utilities
async function exportAsMarkdown(meeting: MeetingNotes): Promise<string> {
  const date = new Date(meeting.date).toLocaleString();
  return `# ${meeting.title}

**Date:** ${date}
**Duration:** ${Math.round(meeting.duration / 60000)} minutes
**Meeting URL:** ${meeting.meetingUrl}

---

${meeting.notes}
`;
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

function shareViaEmail(meeting: MeetingNotes) {
  const markdown = exportAsMarkdown(meeting);
  const body = encodeURIComponent(markdown);
  window.open(`mailto:?subject=${encodeURIComponent(meeting.title)}&body=${body}`);
}

async function exportAllMeetings() {
  const meetings = await storage.get('meetings') || {};
  const allMarkdown = Object.values(meetings)
    .sort((a, b) => b.date - a.date)
    .map(m => exportAsMarkdown(m))
    .join('\n\n---\n\n');
  
  downloadFile('meeting-notes.md', allMarkdown);
}
```

## Cross-references {#cross-references}

- [Side Panel API](../permissions/sidePanel.md)
- [Side Panel Patterns](../patterns/side-panel.md)
- [Content Script Patterns](../guides/content-script-patterns.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
