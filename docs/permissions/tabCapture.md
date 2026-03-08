---
title: "tabCapture Permission"
description: "Access to the `chrome.tabCapture` API for capturing the visible area of a tab as a media stream (audio and/or video). { "permissions": ["tabCapture"] }"
permalink: /permissions/tabCapture/
category: permissions
order: 41
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/tabCapture/"
---

# tabCapture Permission

## What It Grants {#what-it-grants}
Access to the `chrome.tabCapture` API for capturing the visible area of a tab as a media stream (audio and/or video).

## Manifest {#manifest}
```json
{
  "permissions": ["tabCapture"]
}
```

## User Warning {#user-warning}
"Capture content of your screen" — this triggers a warning.

## API Access {#api-access}
- `chrome.tabCapture.capture(options)` — capture current tab as MediaStream
- `chrome.tabCapture.getMediaStreamId(options)` — get stream ID for use with `getUserMedia`
- `chrome.tabCapture.getCapturedTabs()` — list currently captured tabs

### Events {#events}
- `chrome.tabCapture.onStatusChanged` — capture status changed

## Capture Options {#capture-options}
```typescript
interface CaptureOptions {
  audio: boolean;
  video: boolean;
  audioConstraints?: MediaStreamConstraints;
  videoConstraints?: MediaStreamConstraints;
}
```

## Basic Tab Capture {#basic-tab-capture}

## chrome.tabCapture Basic Usage
```typescript
// Must be called from a user gesture (popup click, action click)
chrome.tabCapture.capture(
  { audio: true, video: true },
  (stream) => {
    if (chrome.runtime.lastError || !stream) {
      console.error('Capture failed:', chrome.runtime.lastError?.message);
      return;
    }
    // Use the MediaStream
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
  }
);
```

## MV3 with getMediaStreamId {#mv3-with-getmediastreamid}
```typescript
// In service worker — get stream ID
chrome.action.onClicked.addListener(async (tab) => {
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });

  // Send to offscreen document or popup to use with getUserMedia
  chrome.runtime.sendMessage({ type: 'START_CAPTURE', streamId });
});

// In offscreen.html or popup
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === 'START_CAPTURE') {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: msg.streamId }
      },
      video: {
        mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: msg.streamId }
      }
    } as any);
    // Record or process the stream
  }
});
```

## Recording Pattern {#recording-pattern}
```typescript
import { createMessenger } from '@theluckystrike/webext-messaging';

type Messages = {
  START_RECORDING: { request: { tabId: number }; response: { streamId: string } };
  STOP_RECORDING: { request: {}; response: { ok: boolean } };
};
const m = createMessenger<Messages>();

m.onMessage('START_RECORDING', async ({ tabId }) => {
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  return { streamId };
});
```

## Capture Status {#capture-status}
```typescript
chrome.tabCapture.onStatusChanged.addListener((info) => {
  console.log(`Tab ${info.tabId}: ${info.status}`);
  // status: 'pending', 'active', 'stopped', 'error'
});

// Check what's currently captured
const captured = await chrome.tabCapture.getCapturedTabs();
captured.forEach(info => {
  console.log(`Tab ${info.tabId}: ${info.status}`);
});
```

## Storage Integration {#storage-integration}
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';

const schema = defineSchema({
  isRecording: 'boolean',
  recordingTabId: 'number',
  recordingStartTime: 'number'
});
const storage = createStorage(schema, 'local');
```

## Key Constraints {#key-constraints}
- Must be initiated from user gesture (popup click, action click, keyboard shortcut)
- Only captures visible tab content
- Cannot capture in incognito unless `incognito: "split"` in manifest
- One capture per tab at a time

## When to Use {#when-to-use}
- Screen/tab recording extensions
- Live streaming tools
- Audio capture for transcription
- Tab mirroring/casting
- Accessibility tools (screen reader enhancement)

## When NOT to Use {#when-not-to-use}
- For screenshots — use `chrome.tabs.captureVisibleTab()` (simpler, no permission needed beyond `activeTab`)
- For desktop capture — use `desktopCapture` permission
- For page content — use content scripts

## Permission Check {#permission-check}
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('tabCapture');
```

## Cross-References {#cross-references}
- Guide: `docs/guides/tab-capture.md`
- Related: `docs/permissions/offscreen.md`, `docs/guides/desktop-capture.md`

## Frequently Asked Questions

### How do I capture tab content?
Use chrome.tabCapture.capture() to capture the visible area of a tab as a media stream. You'll need the tabCapture permission.

### Can I record tab audio?
Yes, include "audio" in the mediaType options to capture both video and audio from the tab.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
