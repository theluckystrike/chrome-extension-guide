# PageCapture and TabCapture API Patterns

## Overview

Chrome extensions provide two powerful APIs for capturing web content: `chrome.pageCapture` for saving complete pages as MHTML archives, and `chrome.tabCapture` for capturing live media streams from tabs. This guide covers eight production-ready patterns for offline page storage, versioned archiving, audio/video recording, live streaming, and screenshot capture.

---

## Required Permissions

```jsonc
// manifest.json
{
  "permissions": [
    "pageCapture",
    "tabCapture",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

The `pageCapture` permission allows saving pages as MHTML. The `tabCapture` permission is required for capturing media streams. Both require user gesture initiation in most contexts.

---

## Pattern 1: PageCapture API Basics

The `chrome.pageCapture.saveAsMHTML()` method captures an entire page including HTML, CSS, images, and embedded resources into a single MHTML file:

```ts
// capture/page-capture.ts
interface CaptureOptions {
  tabId: number;
}

interface CaptureResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

async function capturePageAsMHTML(tabId: number): Promise<CaptureResult> {
  try {
    const blob = await chrome.pageCapture.saveAsMHTML({ tabId });

    if (!blob) {
      return { success: false, error: "No content captured" };
    }

    return { success: true, blob };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// Example: Capture current active tab
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const result = await capturePageAsMHTML(tab.id);

  if (result.success && result.blob) {
    console.log("Captured MHTML blob:", result.blob.size, "bytes");
    // Download or store the blob
    const url = URL.createObjectURL(result.blob);
    chrome.downloads.download({
      url,
      filename: `page-${Date.now()}.mhtml`,
      saveAs: true,
    });
  }
});
```

MHTML (MIME HTML) packages the entire page as a single file with all resources base64-encoded inline. This format is ideal for archival but produces larger files than the original page.

---

## Pattern 2: Save Page for Offline Reading

Capture pages and store them for offline access using IndexedDB or chrome.storage:

```ts
// storage/page-storage.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface PageSnapshot {
  id: string;
  url: string;
  title: string;
  capturedAt: number;
  mhtml: ArrayBuffer;
  size: number;
}

const PageSchema = defineSchema({
  snapshots: {
    type: "array" as const,
    items: {
      type: "object" as const,
      properties: {
        id: { type: "string" as const },
        url: { type: "string" as const },
        title: { type: "string" as const },
        capturedAt: { type: "number" as const },
        mhtml: { type: "string" as const }, // base64 encoded
        size: { type: "number" as const },
      },
    },
  },
});

const pageStorage = createStorage<typeof PageSchema>("local", {
  snapshots: [],
});

class OfflinePageManager {
  async captureAndStore(tabId: number): Promise<PageSnapshot | null> {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || !tab.id) return null;

    // Capture MHTML
    const blob = await chrome.pageCapture.saveAsMHTML({ tabId: tab.id });
    if (!blob) return null;

    // Convert Blob to base64 for storage
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = this.arrayBufferToBase64(arrayBuffer);

    const snapshot: PageSnapshot = {
      id: crypto.randomUUID(),
      url: tab.url,
      title: tab.title || "Untitled",
      capturedAt: Date.now(),
      mhtml: base64,
      size: arrayBuffer.byteLength,
    };

    // Store in chrome.storage
    const existing = await pageStorage.get("snapshots");
    const updated = [snapshot, ...existing.snapshots].slice(0, 100); // Keep last 100
    await pageStorage.set("snapshots", updated);

    return snapshot;
  }

  async getSnapshot(id: string): Promise<PageSnapshot | null> {
    const { snapshots } = await pageStorage.get("snapshots");
    return snapshots.find((s) => s.id === id) || null;
  }

  async listSnapshots(): Promise<PageSnapshot[]> {
    const { snapshots } = await pageStorage.get("snapshots");
    return snapshots;
  }

  async deleteSnapshot(id: string): Promise<void> {
    const { snapshots } = await pageStorage.get("snapshots");
    await pageStorage.set(
      "snapshots",
      snapshots.filter((s) => s.id !== id)
    );
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export const offlineManager = new OfflinePageManager();
```

Create an offline viewer extension page to display stored pages:

```ts
// viewer/offline-viewer.ts
async function loadOfflinePage(snapshotId: string): Promise<void> {
  const snapshot = await offlineManager.getSnapshot(snapshotId);
  if (!snapshot) {
    showError("Page not found");
    return;
  }

  // Decode base64 to blob
  const binaryString = atob(snapshot.mhtml);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "message/rfc822" });

  // Display in iframe
  const url = URL.createObjectURL(blob);
  const iframe = document.getElementById("viewer") as HTMLIFrameElement;
  iframe.src = url;
}
```

---

## Pattern 3: Page Snapshot Archive

Set up periodic page snapshots with versioning and change detection:

```ts
// archive/snapshot-archive.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface ArchivedPage {
  url: string;
  snapshots: PageVersion[];
}

interface PageVersion {
  version: number;
  timestamp: number;
  hash: string;
  size: number;
}

const ArchiveSchema = defineSchema({
  archive: {
    type: "object" as const,
    properties: {},
  },
});

const archiveStorage = createStorage<typeof ArchiveSchema>("local", {
  archive: {},
});

class SnapshotArchive {
  private hashContent(content: ArrayBuffer): Promise<string> {
    return crypto.subtle.digest("SHA-256", content).then((buffer) => {
      const hashArray = Array.from(new Uint8Array(buffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    });
  }

  async captureVersion(tabId: number): Promise<PageVersion | null> {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return null;

    const blob = await chrome.pageCapture.saveAsMHTML({ tabId });
    if (!blob) return null;

    const content = await blob.arrayBuffer();
    const hash = await this.hashContent(content);

    // Get existing archive for this URL
    const { archive } = await archiveStorage.get("archive");
    const existing = archive[tab.url] || { url: tab.url, snapshots: [] };

    // Check if content changed
    const lastSnapshot = existing.snapshots[0];
    if (lastSnapshot && lastSnapshot.hash === hash) {
      console.log("No changes detected, skipping capture");
      return null;
    }

    // Add new version
    const newVersion: PageVersion = {
      version: existing.snapshots.length + 1,
      timestamp: Date.now(),
      hash,
      size: content.byteLength,
    };

    // Keep last 10 versions per URL
    existing.snapshots = [newVersion, ...existing.snapshots].slice(0, 10);

    archive[tab.url] = existing;
    await archiveStorage.set("archive", archive);

    return newVersion;
  }

  async getVersions(url: string): Promise<PageVersion[]> {
    const { archive } = await archiveStorage.get("archive");
    return archive[url]?.snapshots || [];
  }

  async getChangeSummary(url: string): Promise<string> {
    const versions = await this.getVersions(url);
    if (versions.length === 0) return "No snapshots";
    if (versions.length === 1) return "Initial snapshot captured";

    const latest = versions[0];
    const previous = versions[1];
    const sizeDiff = latest.size - previous.size;
    const percentChange = ((sizeDiff / previous.size) * 100).toFixed(1);

    return `Version ${latest.version}: ${sizeDiff >= 0 ? "+" : ""}${sizeDiff} bytes (${percentChange}%)`;
  }
}

export const snapshotArchive = new SnapshotArchive();
```

Set up periodic capture with chrome.alarms:

```ts
// background/scheduler.ts
chrome.alarms.create("page-snapshot", {
  periodInMinutes: 30, // Capture every 30 minutes
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "page-snapshot") {
    // Get active tab or tabs matching specific URLs
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    for (const tab of tabs) {
      if (tab.id) {
        await snapshotArchive.captureVersion(tab.id);
      }
    }
  }
});
```

---

## Pattern 4: TabCapture API Basics

The `chrome.tabCapture.capture()` method returns a MediaStream of the tab's content:

```ts
// capture/tab-capture.ts
interface CaptureConfig {
  audio: boolean | "loopback";
  video: boolean;
  videoConstraints?: MediaTrackConstraints;
}

async function captureTab(
  tabId: number,
  config: CaptureConfig
): Promise<MediaStream | null> {
  try {
    const stream = await chrome.tabCapture.capture({
      audio: config.audio,
      video: config.video,
      ...(config.videoConstraints && { videoConstraints: config.videoConstraints }),
    });

    return stream;
  } catch (err) {
    console.error("Capture failed:", err);
    return null;
  }
}

// Basic capture example
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const stream = await chrome.tabCapture.capture({
    audio: true,
    video: true,
  });

  if (stream) {
    console.log("Captured stream with", stream.getTracks().length, "tracks");
    // Connect to video element or process further
  }
});
```

The `audio` option can be `true` (capture system audio), `"loopback"` (capture audio from other tabs), or `false`. Video captures the tab's rendered content.

---

## Pattern 5: Tab Audio Recording

Record tab audio using MediaRecorder in an offscreen document:

```ts
// recording/audio-recorder.ts
interface RecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
}

class TabAudioRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  async startRecording(tabId: number, options: RecorderOptions = {}): Promise<boolean> {
    // Capture tab audio only
    this.stream = await chrome.tabCapture.capture({
      audio: true,
      video: false,
    });

    if (!this.stream) {
      console.error("Failed to capture audio stream");
      return false;
    }

    const mimeType = options.mimeType || "audio/webm;codecs=opus";
    this.recorder = new MediaRecorder(this.stream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : "audio/webm",
      audioBitsPerSecond: options.audioBitsPerSecond || 128000,
    });

    this.chunks = [];

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.recorder.start(1000); // Collect data every second
    return true;
  }

  async stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.recorder) {
        resolve(null);
        return;
      }

      this.recorder.onstop = () => {
        // Stop all tracks
        this.stream?.getTracks().forEach((track) => track.stop());

        const blob = new Blob(this.chunks, { type: "audio/webm" });
        resolve(blob);
      };

      this.recorder.stop();
    });
  }

  getDuration(): number {
    if (!this.recorder || this.recorder.state === "inactive") return 0;
    return (Date.now() - (this.recorder as any).startTime) / 1000;
  }
}

export const audioRecorder = new TabAudioRecorder();
```

Integrate with offscreen document for background recording:

```ts
// background/record-manager.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type RecordingMessages = {
  "recording:start": { request: { tabId: number }; response: { ok: boolean } };
  "recording:stop": { request: void; response: { blob: ArrayBuffer | null } };
  "recording:status": { request: void; response: { isRecording: boolean; duration: number } };
};

const messenger = createMessenger<RecordingMessages>();
const recorder = new TabAudioRecorder();

async function ensureRecordingOffscreen(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });

  if (contexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen-recording.html",
    reasons: [chrome.offscreen.Reason.MEDIA_RECORDING],
    justification: "Record tab audio in background",
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "recording:start") {
    ensureRecordingOffscreen().then(async () => {
      const ok = await recorder.startRecording(msg.tabId);
      sendResponse({ ok });
    });
    return true;
  }

  if (msg.type === "recording:stop") {
    recorder.stopRecording().then((blob) => {
      if (blob) {
        blob.arrayBuffer().then((buffer) => {
          sendResponse({ blob: buffer });
        });
      } else {
        sendResponse({ blob: null });
      }
    });
    return true;
  }
});
```

---

## Pattern 6: Tab Video Recording

Capture both video and audio with configurable frame rate and resolution:

```ts
// recording/video-recorder.ts
interface VideoRecorderConfig {
  width?: number;
  height?: number;
  frameRate?: number;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

class TabVideoRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;

  async startRecording(tabId: number, config: VideoRecorderConfig = {}): Promise<boolean> {
    const { width = 1920, height = 1080, frameRate = 30 } = config;

    this.stream = await chrome.tabCapture.capture({
      audio: true,
      video: true,
      videoConstraints: {
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: frameRate },
      },
    });

    if (!this.stream) {
      console.error("Failed to capture video stream");
      return false;
    }

    const mimeType = "video/webm;codecs=vp9,opus";
    this.recorder = new MediaRecorder(this.stream, {
      mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : "video/webm",
      videoBitsPerSecond: config.videoBitsPerSecond || 5000000,
      audioBitsPerSecond: config.audioBitsPerSecond || 128000,
    });

    this.chunks = [];
    this.startTime = Date.now();

    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    // Record in chunks every 2 seconds
    this.recorder.start(2000);
    return true;
  }

  async stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.recorder) {
        resolve(null);
        return;
      }

      this.recorder.onstop = () => {
        this.stream?.getTracks().forEach((track) => track.stop());

        const blob = new Blob(this.chunks, { type: "video/webm" });
        resolve(blob);
      };

      this.recorder.stop();
    });
  }

  getRecordingDuration(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  isRecording(): boolean {
    return this.recorder?.state === "recording";
  }
}

export const videoRecorder = new TabVideoRecorder();
```

Save the recording to a file:

```ts
// background/save-recording.ts
async function saveRecording(blob: Blob, filename?: string): Promise<void> {
  const url = URL.createObjectURL(blob);

  const defaultName = `recording-${Date.now()}.webm`;

  await chrome.downloads.download({
    url,
    filename: filename || defaultName,
    saveAs: true,
  });

  // Clean up object URL after download starts
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
```

---

## Pattern 7: Live Tab Streaming

Stream captured tab content to a WebRTC peer or display in Picture-in-Picture:

```ts
// streaming/tab-streamer.ts
class LiveTabStreamer {
  private stream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;

  async startStreaming(tabId: number): Promise<MediaStream | null> {
    this.stream = await chrome.tabCapture.capture({
      audio: true,
      video: true,
      videoConstraints: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
    });

    return this.stream;
  }

  async startWebRTCStreaming(
    tabId: number,
    signalingCallback: (data: RTCSessionDescriptionInit | RTCIceCandidate) => void
  ): Promise<void> {
    this.stream = await chrome.tabCapture.capture({
      audio: true,
      video: true,
    });

    if (!this.stream) throw new Error("Failed to capture tab");

    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Add tracks to peer connection
    this.stream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, this.stream!);
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        signalingCallback(event.candidate);
      }
    };

    // Create and set local description
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    signalingCallback(offer);
  }

  async handleRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(desc);
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;
    await this.peerConnection.addIceCandidate(candidate);
  }

  stopStreaming(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.peerConnection?.close();
    this.stream = null;
    this.peerConnection = null;
  }
}

export const tabStreamer = new LiveTabStreamer();
```

Picture-in-Picture for captured tab:

```ts
// streaming/pip-viewer.ts
class PipViewer {
  private videoElement: HTMLVideoElement | null = null;

  async startPip(tabId: number): Promise<boolean> {
    const stream = await chrome.tabCapture.capture({
      audio: false,
      video: true,
    });

    if (!stream) return false;

    // Create video element
    this.videoElement = document.createElement("video");
    this.videoElement.srcObject = stream;
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;

    await this.videoElement.play();

    try {
      // Request Picture-in-Picture
      const pipWindow = await this.videoElement.requestPictureInPicture();
      console.log("PiP started:", pipWindow.id);
      return true;
    } catch (err) {
      console.error("PiP failed:", err);
      return false;
    }
  }

  async stopPip(): Promise<void> {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
  }
}

export const pipViewer = new PipViewer();
```

Audio level monitoring:

```ts
// streaming/audio-monitor.ts
class AudioLevelMonitor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  analyzeStream(stream: MediaStream): void {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();

    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkLevel = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const level = Math.round((average / 255) * 100);

      console.log("Audio level:", level);

      requestAnimationFrame(checkLevel);
    };

    checkLevel();
  }

  stop(): void {
    this.audioContext?.close();
    this.audioContext = null;
    this.analyser = null;
  }
}

export const audioMonitor = new AudioLevelMonitor();
```

---

## Pattern 8: Screenshot Patterns

Basic screenshot capture and advanced full-page capture with scrolling:

```ts
// capture/screenshot.ts
interface ScreenshotOptions {
  format: "jpeg" | "png";
  quality?: number;
}

async function captureVisibleTab(
  tabId: number,
  options: ScreenshotOptions = { format: "png" }
): Promise<string | null> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(tabId, {
      format: options.format,
      quality: options.quality,
    });

    return dataUrl;
  } catch (err) {
    console.error("Screenshot failed:", err);
    return null;
  }
}

// Full-page screenshot by scrolling and stitching
class FullPageScreenshot {
  private async getPageHeight(): Promise<number> {
    return await chrome.scripting.executeScript({
      target: { tabId: await this.getActiveTabId() },
      func: () => document.documentElement.scrollHeight,
    });
  }

  private async getActiveTabId(): Promise<number> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error("No active tab");
    return tab.id;
  }

  async captureFullPage(tabId: number): Promise<string | null> {
    // Get page dimensions
    const [{ result: pageHeight }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        return {
          width: window.innerWidth,
          height: document.documentElement.scrollHeight,
        };
      },
    });

    // Resize viewport to full height
    await chrome.tabs.setViewport({ tabId, width: 1920, height: pageHeight });

    // Capture at different scroll positions
    const images: string[] = [];
    const scrollStep = window.innerHeight - 100;
    const scrollPositions = [];

    for (let y = 0; y < pageHeight; y += scrollStep) {
      scrollPositions.push(y);
    }

    for (const scrollY of scrollPositions) {
      await chrome.tabs.scroll(tabId, { top: scrollY, left: 0 });
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for render

      const screenshot = await captureVisibleTab(tabId, { format: "png" });
      if (screenshot) {
        images.push(screenshot);
      }
    }

    // Stitch images together
    return this.stitchImages(images);
  }

  private async stitchImages(images: string[]): Promise<string | null> {
    if (images.length === 0) return null;

    // Use canvas to stitch images
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    // Load first image to get dimensions
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = images[0];
    });

    const imgWidth = img.width;
    const imgHeight = img.height * images.length;

    canvas.width = imgWidth;
    canvas.height = imgHeight;

    let y = 0;
    for (const src of images) {
      const image = new Image();
      await new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.src = src;
      });
      ctx.drawImage(image, 0, y);
      y += image.height;
    }

    return canvas.toDataURL("image/png");
  }
}

export const fullPageScreenshot = new FullPageScreenshot();
```

Screenshot annotation before saving:

```ts
// annotation/screenshot-annotator.ts
interface AnnotationOptions {
  color: string;
  lineWidth: number;
  text?: string;
}

class ScreenshotAnnotator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  constructor(imageUrl: string) {
    const img = new Image();
    img.src = imageUrl;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;

    img.onload = () => {
      this.canvas.width = img.width;
      this.canvas.height = img.height;
      this.ctx.drawImage(img, 0, 0);
    };
  }

  startDrawing(x: number, y: number): void {
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
  }

  draw(x: number, y: number, options: AnnotationOptions): void {
    if (!this.isDrawing) return;

    this.ctx.strokeStyle = options.color;
    this.ctx.lineWidth = options.lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
  }

  stopDrawing(): void {
    this.isDrawing = false;
  }

  addText(text: string, x: number, y: number, options: AnnotationOptions): void {
    this.ctx.fillStyle = options.color;
    this.ctx.font = `${options.lineWidth * 4}px Arial`;
    this.ctx.fillText(text, x, y);
  }

  toDataURL(format: "image/png" | "image/jpeg" = "image/png", quality = 0.9): string {
    return this.canvas.toDataURL(format, quality);
  }

  download(filename: string): void {
    const link = document.createElement("a");
    link.download = filename;
    link.href = this.toDataURL();
    link.click();
  }
}

export { ScreenshotAnnotator };
```

---

## Summary

| Pattern | Use Case | Key API |
|---------|----------|----------|
| PageCapture Basics | Save complete pages as MHTML | `chrome.pageCapture.saveAsMHTML()` |
| Offline Reading | Store captured pages for offline access | IndexedDB / chrome.storage |
| Snapshot Archive | Periodic versioning with change detection | `chrome.alarms` + hash comparison |
| TabCapture Basics | Capture tab as MediaStream | `chrome.tabCapture.capture()` |
| Audio Recording | Record tab audio to WebM | MediaRecorder in offscreen |
| Video Recording | Record tab video + audio | Configurable resolution/frame rate |
| Live Streaming | WebRTC streaming, PiP, audio levels | RTCPeerConnection, requestPictureInPicture |
| Screenshots | Single capture or full-page stitching | `chrome.tabs.captureVisibleTab()` |

**Key considerations:**
- PageCapture creates static MHTML archives ideal for offline reading
- TabCapture provides live MediaStream for recording/streaming
- Always handle user gesture requirements for capture APIs
- Use offscreen documents for long-running recording operations
- Store large captures in IndexedDB rather than chrome.storage (5MB limit)
- Consider privacy implications when capturing or storing page content
