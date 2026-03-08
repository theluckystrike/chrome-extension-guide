---
layout: default
title: "Chrome Extension WebRTC — Developer Guide"
description: "Learn Chrome extension webrtc with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/webrtc-extensions/"
---
# Chrome Extensions and WebRTC

## Overview
WebRTC enables peer-to-peer audio/video communication in browsers. Chrome Extensions can leverage WebRTC for screen recording, tab audio capture, video conferencing, and collaborative tools. This guide covers essential patterns for WebRTC in extension contexts with emphasis on Manifest V3 (MV3) compatibility.

Chrome provides three APIs for media capture: `chrome.tabCapture` for tab audio/video, `chrome.desktopCapture` for lower-level control, and standard `getDisplayMedia()` for screen/window capture.

## Manifest Setup
```json
{
  "name": "Screen Recorder Extension",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": ["tabCapture", "desktopCapture", "offscreen"],
  "background": { "service_worker": "background.ts", "type": "module" }
}
```

## Using WebRTC APIs from Extension Contexts

### chrome.tabCapture
Captures the visible area of the currently active tab as a MediaStream. Note: `capture()` does not accept a `tabId` — it always captures the active tab. In MV3, consider using `chrome.tabCapture.getMediaStreamId()` instead.
```ts
async function captureTab(): Promise<MediaStream | null> {
  return new Promise((resolve) => {
    chrome.tabCapture.capture({
      audio: true,
      video: true,
      videoConstraints: { mandatory: { minWidth: 1280, maxWidth: 1920, frameRate: 30 } }
    }, (stream) => resolve(stream));
  });
}
```

### chrome.desktopCapture
Shows a native picker UI for the user to select a source:
```ts
function chooseSource(callback: (streamId: string) => void) {
  // chooseDesktopMedia uses a callback, not a promise.
  // It returns a request ID that can be passed to cancelChooseDesktopMedia.
  chrome.desktopCapture.chooseDesktopMedia(
    ["window", "screen", "tab"],
    (streamId) => {
      if (streamId) callback(streamId);
    }
  );
}
```

### getDisplayMedia()
Standard WebRTC API that works in extension contexts:
```ts
async function startScreenShare(): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") return null;
    throw error;
  }
}
```

## Screen Capture with chrome.tabCapture and getDisplayMedia

### Capturing the Active Tab
```ts
async function captureActiveTab(): Promise<MediaStream> {
  return new Promise((resolve) => {
    chrome.tabCapture.capture({ audio: true, video: true }, (stream) => resolve(stream!));
  });
}
```

### Capturing with Display Media
```ts
async function captureWithPicker(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "browser" },
    audio: true,
    systemAudio: "include"
  });
}
```

### Handling Stream Tracks
```ts
function handleStream(stream: MediaStream): void {
  stream.getVideoTracks().forEach(track => console.log(`Video: ${track.label}`));
  stream.getAudioTracks().forEach(track => console.log(`Audio: ${track.label}`));
  stream.getTracks().forEach(track => track.stop());
}
```

## Tab Audio Capture Patterns

### Capturing Tab Audio Only
```ts
async function captureTabAudio(): Promise<MediaStream | null> {
  return new Promise((resolve) => {
    chrome.tabCapture.capture({
      audio: true,
      audioConstraints: { mandatory: { chromeMediaSource: "tab", echoCancellation: false } }
    }, (stream) => resolve(stream));
  });
}
```

### Using getMediaStreamId for Tab Capture (MV3)
```ts
async function captureTabWithStreamId(tabId: number): Promise<MediaStream> {
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  return navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
    video: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } }
  });
}
```

## MediaRecorder for Recording Tab Content

### Basic Recording Setup
```ts
class TabRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  
  async startRecording(stream: MediaStream): Promise<void> {
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.mediaRecorder.start(1000);
  }
  
  getSupportedMimeType(): string {
    const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    for (const type of types) { if (MediaRecorder.isTypeSupported(type)) return type; }
    return "video/webm";
  }
  
  stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => resolve(new Blob(this.chunks, { type: this.mediaRecorder!.mimeType }));
      this.mediaRecorder!.stop();
    });
  }
}
```

### Recording with Progress
```ts
async function recordWithProgress(): Promise<Blob> {
  const stream = await new Promise<MediaStream>((resolve) => {
    chrome.tabCapture.capture({ audio: true, video: true }, (s) => resolve(s!));
  });
  const recorder = new MediaRecorder(stream!, { mimeType: "video/webm;codecs=vp9" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  return new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    recorder.start(1000);
  });
}
```

## Offscreen Documents for WebRTC in MV3

Service workers in MV3 cannot persist WebRTC connections reliably. Offscreen documents provide a long-lived context:

### Creating Offscreen Document
```ts
async function createWebRTCOffscreen(): Promise<void> {
  const hasOffscreen = await chrome.offscreen.hasDocument();
  if (!hasOffscreen) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["WEB_RTC" as chrome.offscreen.Reason],
      justification: "WebRTC requires persistent context"
    });
  }
}
```

### Offscreen Document Implementation
```ts
let peerConnection: RTCPeerConnection | null = null;

async function initializeWebRTC(config: RTCConfiguration): Promise<void> {
  peerConnection = new RTCPeerConnection(config);
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) chrome.runtime.sendMessage({ type: "ICE_CANDIDATE", candidate: event.candidate });
  };
  peerConnection.ontrack = (event) => { const [stream] = event.streams; handleIncomingStream(stream); };
}

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  switch (message.type) {
    case "OFFER": handleOffer(message.sdp); break;
    case "ADD_CANDIDATE": addIceCandidate(message.candidate); break;
  }
});
```

### Recording in Offscreen
```ts
class OffscreenRecorder {
  private recorders: Map<string, MediaRecorder> = new Map();
  
  startRecording(sessionId: string, stream: MediaStream): void {
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 5000000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      chrome.runtime.sendMessage({ type: "RECORDING_COMPLETE", sessionId, data: new Blob(chunks, { type: "video/webm" }) });
    };
    recorder.start(1000);
    this.recorders.set(sessionId, recorder);
  }
  
  stopRecording(sessionId: string): void { this.recorders.get(sessionId)?.stop(); }
}
```

## Building Screen Recording Extensions

### Complete Recording Flow
```ts
class ScreenRecorder {
  private sessions: Map<string, RecordingSession> = new Map();
  
  async startRecording(options: RecordingOptions): Promise<RecordingSession> {
    await createWebRTCOffscreen();
    const stream = options.sourceType === "tab" ? await this.captureTab() : await this.captureScreen();
    const sessionId = this.generateId();
    const port = await chrome.runtime.connect({ name: "recorder" });
    port.postMessage({ type: "START_RECORDING", sessionId, stream });
    const session: RecordingSession = { id: sessionId, startTime: Date.now(), sourceType: options.sourceType, status: "recording" };
    this.sessions.set(sessionId, session);
    return session;
  }
  
  async stopRecording(sessionId: string): Promise<Blob> {
    const port = await chrome.runtime.connect({ name: "recorder" });
    return new Promise((resolve) => {
      const handler = (msg: { type: string; data?: Blob }) => {
        if (msg.type === "RECORDING_COMPLETE" && msg.data) { port.disconnect(); resolve(msg.data); }
      };
      port.onMessage.addListener(handler);
      port.postMessage({ type: "STOP_RECORDING", sessionId });
    });
  }
  
  private async captureTab(): Promise<MediaStream> { return new Promise((resolve) => { chrome.tabCapture.capture({ audio: true, video: true }, (s) => resolve(s!)); }); }
  private async captureScreen(): Promise<MediaStream> { return navigator.mediaDevices.getDisplayMedia({ audio: true, video: true }); }
  private generateId(): string { return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; }
}
```

### Popup UI Integration
```ts
document.addEventListener("DOMContentLoaded", async () => {
  const recordBtn = document.getElementById("record") as HTMLButtonElement;
  const stopBtn = document.getElementById("stop") as HTMLButtonElement;
  let currentSession: RecordingSession | null = null;
  const recorder = new ScreenRecorder();
  
  recordBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentSession = await recorder.startRecording({ sourceType: "tab", tabId: tab.id!, captureAudio: true, captureVideo: true });
    recordBtn.disabled = true;
    stopBtn.disabled = false;
  });
  
  stopBtn.addEventListener("click", async () => {
    if (!currentSession) return;
    const blob = await recorder.stopRecording(currentSession.id);
    const url = URL.createObjectURL(blob);
    await chrome.downloads.download({ url, filename: `recording-${Date.now()}.webm`, saveAs: true });
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    currentSession = null;
  });
});
```

## Permissions and Privacy Considerations

### Required Permissions
```json
{ "permissions": ["tabCapture", "desktopCapture"], "host_permissions": ["<all_urls>"] }
```
These are "restricted" permissions requiring Chrome Web Store review.

### User Consent
```ts
async function setRecordingIndicator(tabId: number, isRecording: boolean): Promise<void> {
  if (isRecording) {
    chrome.action.setBadgeText({ text: "REC" });
    chrome.action.setBadgeBackgroundColor({ color: "#ff0000" });
    await chrome.tabs.update(tabId, { title: "🔴 Recording" });
  } else { chrome.action.setBadgeText({ text: "" }); }
}
```

### Checking Sensitive Content
```ts
async function checkSensitiveContent(tabId: number): Promise<boolean> {
  const tab = await chrome.tabs.get(tabId);
  const sensitivePatterns = [/banking/, /health/, /medical/, /login/];
  return sensitivePatterns.some(p => p.test(tab.url || ""));
}
```

### Privacy Best Practices
1. Minimize data collection - only capture what's necessary
2. Provide clear indicators when recording is active
3. Encrypt recorded content if storing locally
4. Allow users to stop recording at any time
5. Implement automatic time limits
6. Be transparent in your privacy policy

```ts
class TimedRecorder {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  startWithTimeout(durationMs: number, onTimeout: () => void): void { this.timeoutId = setTimeout(onTimeout, durationMs); }
  cancel(): void { if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; } }
}
```

## Common Issues and Solutions

### Stream Unavailable After Service Worker Restart
```ts
async function ensureOffscreen(): Promise<void> {
  const hasDoc = await chrome.offscreen.hasDocument();
  if (!hasDoc) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["WEB_RTC", "AUDIO_PLAYBACK" as chrome.offscreen.Reason],
      justification: "Maintain WebRTC connection"
    });
  }
}
```

### Audio Not Being Captured
```ts
async function captureWithFallback(): Promise<MediaStream> {
  let stream = await new Promise<MediaStream>((resolve) => {
    chrome.tabCapture.capture({ audio: true, video: true }, (s) => resolve(s!));
  });
  if (stream.getAudioTracks().length === 0) {
    console.warn("Audio blocked - retrying without audio");
    stream = await new Promise<MediaStream>((resolve) => {
      chrome.tabCapture.capture({ audio: false, video: true }, (s) => resolve(s!));
    });
  }
  return stream;
}
```

### Proper Cleanup
```ts
function cleanup(stream: MediaStream, recorder: MediaRecorder): void {
  stream.getTracks().forEach(track => track.stop());
  if (recorder && recorder.state !== "inactive") recorder.stop();
}
```

## Related Guides
- [Background Patterns](background-patterns.md)
- [Popup Patterns](popup-patterns.md)
- [MV3 Migration Cheatsheet](mv3-migration-cheatsheet.md)
- [Permissions Best Practices](../permissions/best-practices.md)

## Related Articles

- [WebRTC Screen Sharing](../patterns/webrtc-screen-sharing.md)
- [Desktop Capture](../guides/desktop-capture.md)
