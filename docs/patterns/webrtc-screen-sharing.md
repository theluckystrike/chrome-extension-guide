---
layout: default
title: "Chrome Extension Webrtc Screen Sharing — Best Practices"
description: "Implement screen sharing with WebRTC in extensions."
canonical_url: "https://bestchromeextensions.com/patterns/webrtc-screen-sharing/"
---

# WebRTC Screen Sharing Patterns for Chrome Extensions

This guide covers WebRTC-based screen and tab capture patterns for Chrome extensions, including desktop capture, tab capture, and streaming implementations.

## Prerequisites {#prerequisites}

Declare the required permissions in your manifest:

```json
{
  "manifest_version": 3,
  "permissions": ["desktopCapture", "tabCapture"],
  "host_permissions": ["<all_urls>"]
}
```

---

## chrome.desktopCapture.getMediaStreamId() {#chromedesktopcapturegetmediastreamid}

Get a stream ID for tab, screen, or window capture:

```typescript
// utils/capture.ts
// chrome.desktopCapture.chooseDesktopMedia() shows a picker and returns a stream ID.
// It must be called from a user gesture context (e.g., action click).
function chooseDesktopMedia(tabToShareWith: chrome.tabs.Tab): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab'],
      tabToShareWith,
      (streamId) => {
        if (streamId) resolve(streamId);
        else reject(new Error('User cancelled'));
      }
    );
  });
}

// Use stream ID with navigator.mediaDevices.getUserMedia()
async function startCapture(streamId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      // @ts-ignore - Chrome-specific constraint
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });
}
```

---

## chrome.tabCapture.capture() {#chrometabcapturecapture}

Capture a specific tab's audio and video:

```typescript
// utils/tabCapture.ts
// In MV3, use chrome.tabCapture.getMediaStreamId() to get a stream ID,
// then use navigator.mediaDevices.getUserMedia() with the stream ID.
async function captureTab(tabId: number): Promise<MediaStream> {
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    } as any,
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        minWidth: 1280,
        minHeight: 720,
        maxWidth: 1920,
        maxHeight: 1080
      }
    } as any
  });
  return stream;
}
```

---

## getDisplayMedia in Extension Pages {#getdisplaymedia-in-extension-pages}

Use getDisplayMedia in extension contexts (popup, options, side panel):

```typescript
// popup/main.ts
async function startScreenShare(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: true
    });
    
    // Handle user stopping via browser UI
    stream.getVideoTracks()[0].onended = () => {
      console.log('Screen share ended by user');
    };
    
    return stream;
  } catch (err) {
    console.error('Screen share cancelled:', err);
    return null;
  }
}
```

---

## MediaRecorder for Recording {#mediarecorder-for-recording}

Record captured streams locally:

```typescript
// utils/recorder.ts
class StreamRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  startRecording(stream: MediaStream, mimeType: string = 'video/webm;codecs=vp9'): void {
    this.chunks = [];
    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    
    this.mediaRecorder.start(1000); // Capture in 1-second chunks
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        resolve(new Blob(this.chunks, { type: 'video/webm' }));
      };
      this.mediaRecorder.stop();
    });
  }
}
```

---

## Streaming via WebRTC Peer Connections {#streaming-via-webrtc-peer-connections}

Stream captured content to a remote peer:

```typescript
// utils/webrtc-stream.ts
async function streamToPeer(
  captureStream: MediaStream, 
  peerConnection: RTCPeerConnection
): Promise<MediaStreamTrack[]> {
  captureStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, captureStream);
  });
  
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  return peerConnection.getSenders().map(s => s.track);
}
```

---

## Canvas Frame Processing {#canvas-frame-processing}

Process video frames using canvas:

```typescript
// utils/canvas-processor.ts
class FrameProcessor {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.video = document.createElement('video');
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  processFrame(stream: MediaStream): ImageData {
    this.video.srcObject = stream;
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    this.ctx.drawImage(this.video, 0, 0);
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  captureScreenshot(stream: MediaStream): string {
    this.processFrame(stream);
    return this.canvas.toDataURL('image/png');
  }
}
```

---

## MV3 Considerations {#mv3-considerations}

Capture APIs require extension page context. Use offscreen documents for background capture:

```typescript
// background/offscreen.ts
async function createCaptureOffscreen(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen-capture.html',
      reasons: ['USER_MEDIA'],
      justification: 'Background tab capture for streaming'
    });
  }
}
```

---

## Privacy Best Practices {#privacy-best-practices}

- Always display a visual indicator when capture is active
- Show the extension icon in the tab's favicon area during capture
- Use chrome.action.setBadgeText() to indicate recording state
- Clear all tracks and stop captures when the user navigates away

---

## Cross-References {#cross-references}

- [guides/desktop-capture.md](../guides/desktop-capture.md)
- [guides/tab-capture.md](../guides/tab-capture.md)
- [patterns/desktop-capture.md](./desktop-capture.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
