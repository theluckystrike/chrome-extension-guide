---
layout: default
title: "Chrome Extension WebRTC. Developer Guide"
description: "Learn Chrome extension webrtc with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/webrtc-extensions/"
---
Chrome Extensions and WebRTC

Overview {#overview}
WebRTC enables peer-to-peer audio/video communication in browsers. Chrome Extensions can use WebRTC for screen recording, tab audio capture, video conferencing, and collaborative tools. This guide covers essential patterns for WebRTC in extension contexts with emphasis on Manifest V3 (MV3) compatibility.
WebRTC in Chrome Extensions

This guide covers implementing real-time communication features in Chrome Extensions using WebRTC APIs, including screen capture, media processing, and peer-to-peer connections.

Overview

Chrome Extensions support WebRTC through several mechanisms:
- Content scripts can use standard `navigator.mediaDevices.getUserMedia()`
- Service workers use `chrome.tabCapture` and `chrome.desktopCapture`
- Offscreen documents provide a bridge for media processing

Manifest Setup {#manifest-setup}
```json
{
  "name": "Screen Recorder Extension",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": ["tabCapture", "desktopCapture", "offscreen"],
  "background": { "service_worker": "background.ts", "type": "module" }
}
```

Using WebRTC APIs from Extension Contexts {#using-webrtc-apis-from-extension-contexts}

chrome.tabCapture {#chrometabcapture}
Captures the visible area of the currently active tab as a MediaStream. Note: `capture()` does not accept a `tabId`. it always captures the active tab. In MV3, consider using `chrome.tabCapture.getMediaStreamId()` instead.
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

chrome.desktopCapture {#chromedesktopcapture}
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

getDisplayMedia() {#getdisplaymedia}
Standard WebRTC API that works in extension contexts:
```ts
async function startScreenShare(): Promise<MediaStream | null> {
Accessing getUserMedia from Extensions

In Content Scripts

Content scripts run in the context of web pages and can use the standard WebRTC API:

```javascript
// content-script.js
async function requestCameraAccess() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    return stream;
  } catch (error) {
    console.error('Camera access denied:', error);
  }
}
```

Screen Capture with chrome.tabCapture and getDisplayMedia {#screen-capture-with-chrometabcapture-and-getdisplaymedia}

Capturing the Active Tab {#capturing-the-active-tab}
```ts
async function captureActiveTab(): Promise<MediaStream> {
  return new Promise((resolve) => {
    chrome.tabCapture.capture({ audio: true, video: true }, (stream) => resolve(stream!));
  });
}
```

Capturing with Display Media {#capturing-with-display-media}
```ts
async function captureWithPicker(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "browser" },
    audio: true,
    systemAudio: "include"
  });
}
```

Handling Stream Tracks {#handling-stream-tracks}
```ts
function handleStream(stream: MediaStream): void {
  stream.getVideoTracks().forEach(track => console.log(`Video: ${track.label}`));
  stream.getAudioTracks().forEach(track => console.log(`Audio: ${track.label}`));
  stream.getTracks().forEach(track => track.stop());
}
```

Tab Audio Capture Patterns {#tab-audio-capture-patterns}

Capturing Tab Audio Only {#capturing-tab-audio-only}
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

Using getMediaStreamId for Tab Capture (MV3) {#using-getmediastreamid-for-tab-capture-mv3}
```ts
async function captureTabWithStreamId(tabId: number): Promise<MediaStream> {
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  return navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
    video: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } }
  });
}
```

MediaRecorder for Recording Tab Content {#mediarecorder-for-recording-tab-content}

Basic Recording Setup {#basic-recording-setup}
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

Recording with Progress {#recording-with-progress}
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

Offscreen Documents for WebRTC in MV3 {#offscreen-documents-for-webrtc-in-mv3}

Service workers in MV3 cannot persist WebRTC connections reliably. Offscreen documents provide a long-lived context:

Creating Offscreen Document {#creating-offscreen-document}
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

Offscreen Document Implementation {#offscreen-document-implementation}
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

Recording in Offscreen {#recording-in-offscreen}
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

Building Screen Recording Extensions {#building-screen-recording-extensions}

Complete Recording Flow {#complete-recording-flow}
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

Popup UI Integration {#popup-ui-integration}
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

Permissions and Privacy Considerations {#permissions-and-privacy-considerations}

Required Permissions {#required-permissions}
```json
{ "permissions": ["tabCapture", "desktopCapture"], "host_permissions": ["<all_urls>"] }
```
These are "restricted" permissions requiring Chrome Web Store review.

User Consent {#user-consent}
```ts
async function setRecordingIndicator(tabId: number, isRecording: boolean): Promise<void> {
  if (isRecording) {
    chrome.action.setBadgeText({ text: "REC" });
    chrome.action.setBadgeBackgroundColor({ color: "#ff0000" });
    await chrome.tabs.update(tabId, { title: " Recording" });
  } else { chrome.action.setBadgeText({ text: "" }); }
}
```

Checking Sensitive Content {#checking-sensitive-content}
```ts
async function checkSensitiveContent(tabId: number): Promise<boolean> {
  const tab = await chrome.tabs.get(tabId);
  const sensitivePatterns = [/banking/, /health/, /medical/, /login/];
  return sensitivePatterns.some(p => p.test(tab.url || ""));
}
```

Privacy Best Practices {#privacy-best-practices}
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

Common Issues and Solutions {#common-issues-and-solutions}

Stream Unavailable After Service Worker Restart {#stream-unavailable-after-service-worker-restart}
```ts
async function ensureOffscreen(): Promise<void> {
  const hasDoc = await chrome.offscreen.hasDocument();
  if (!hasDoc) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["WEB_RTC", "AUDIO_PLAYBACK" as chrome.offscreen.Reason],
      justification: "Maintain WebRTC connection"
    });
Required Permissions

Add required permissions to `manifest.json`:

```json
{
  "permissions": [
    "activeTab",
    "tabCapture",
    "desktopCapture"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

Screen Capture with chrome.tabCapture

The `chrome.tabCapture` API captures the visible area of a tab as a MediaStream:

```javascript
// background.js
chrome.tabCapture.capture({
  audio: true,
  video: true,
  videoConstraints: {
    mandatory: {
      chromeMediaSource: 'tab',
      maxWidth: 1920,
      maxHeight: 1080
    }
  }
}, (stream) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }
  // Use the stream
});
```

Audio Not Being Captured {#audio-not-being-captured}
```ts
async function captureWithFallback(): Promise<MediaStream> {
  let stream = await new Promise<MediaStream>((resolve) => {
    chrome.tabCapture.capture({ audio: true, video: true }, (s) => resolve(s!));
DesktopCapture API

For capturing the entire screen or application windows:

```javascript
async function requestScreenCapture() {
  const sources = await chrome.desktopCapture.getDesktopSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 150, height: 150 }
  });
  
  const sourceId = sources[0].id; // In practice, show a picker UI
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId
      }
    }
  });
}
```

MediaStream in Service Workers

Service workers cannot directly use MediaStream. Use offscreen documents:

```javascript
// background.js - Create offscreen document
async function createMediaProcessingContext() {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WEB_RTC'],
    justification: 'Processing WebRTC media streams'
  });
}

// offscreen.js - Process audio
let audioContext;
function handleStream(stream) {
  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const gain = audioContext.createGain();
  gain.gain.value = 1.5;
  source.connect(gain);
  gain.connect(audioContext.destination);
}
```

Peer Connections from Extension Context

Extensions can create RTCPeerConnection for P2P communication:

```javascript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

const peerConnection = new RTCPeerConnection(configuration);

peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    sendToSignalingServer({ type: 'ice-candidate', candidate: event.candidate });
  }
};

peerConnection.ontrack = (event) => {
  const [remoteStream] = event.streams;
  // Display or process remote stream
};

localStream.getTracks().forEach(track => {
  peerConnection.addTrack(track, localStream);
});
```

Signaling Server Integration

Extensions communicate with signaling servers via WebSocket:

```javascript
class SignalingClient {
  constructor(serverUrl) {
    this.ws = new WebSocket(serverUrl);
    this.ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'offer') {
        await pc.setRemoteDescription(msg.offer);
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        this.send({ type: 'answer', answer: ans });
      }
    };
  }
  send(data) { this.ws.send(JSON.stringify(data)); }
}
```

Recording Streams with MediaRecorder

```javascript
function recordStream(stream, filename = 'recording.webm') {
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];
  
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };
  
  recorder.start(1000);
  return recorder;
}
```

Canvas Manipulation of Video Frames

```javascript
function processVideoFrames(video, canvas) {
  const ctx = canvas.getContext('2d');
  
  function process() {
    ctx.drawImage(video, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    // Apply grayscale
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i+1] + data[i+2]) / 3;
      data[i] = data[i+1] = data[i+2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
    requestAnimationFrame(process);
  }
  process();
}
```

Audio Processing with Web Audio API

```javascript
function createAudioProcessor(stream) {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  const gain = ctx.createGain();
  
  analyser.fftSize = 256;
  gain.gain.value = 1.0;
  
  source.connect(analyser).connect(gain).connect(ctx.destination);
  return { ctx, analyser, gain };
}
```

Building a Screen Recorder Extension

Complete screen recorder example:

```javascript
class ScreenRecorder {
  constructor() { this.recorder = null; this.chunks = []; }
  
  async start(sourceId) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } }
    });
    
    this.recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    this.recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.start(1000);
  }
  
  stop() {
    return new Promise(resolve => {
      this.recorder.onstop = () => resolve(new Blob(this.chunks, { type: 'video/webm' }));
      this.recorder.stop();
    });
  }
}
```

Proper Cleanup {#proper-cleanup}
```ts
function cleanup(stream: MediaStream, recorder: MediaRecorder): void {
  stream.getTracks().forEach(track => track.stop());
  if (recorder && recorder.state !== "inactive") recorder.stop();
}
```

Related Guides {#related-guides}
- [Background Patterns](background-patterns.md)
- [Popup Patterns](popup-patterns.md)
- [MV3 Migration Cheatsheet](mv3-migration-cheatsheet.md)
- [Permissions Best Practices](../permissions/best-practices.md)

Related Articles {#related-articles}

Related Articles

- [WebRTC Screen Sharing](../patterns/webrtc-screen-sharing.md)
- [Desktop Capture](../guides/desktop-capture.md)
---

---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
Building a Video Conferencing Extension

Full P2P video call implementation:

```javascript
class VideoConference {
  constructor() { this.pc = null; this.localStream = null; }
  
  async init() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    
    this.localStream.getTracks().forEach(t => this.pc.addTrack(t, this.localStream));
    this.pc.ontrack = (e) => document.getElementById('remote').srcObject = e.streams[0];
  }
  
  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }
  
  async handleAnswer(ans) { await this.pc.setRemoteDescription(ans); }
  async addIceCandidate(c) { await this.pc.addIceCandidate(c); }
}
```

Reference

- [Chrome TabCapture API](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)
- [Chrome DesktopCapture API](https://developer.chrome.com/docs/extensions/reference/api/desktopCapture)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Offscreen Documents](https://developer.chrome.com/docs/extensions/mv3/offscreen/)
