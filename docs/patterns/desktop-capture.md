---
layout: default
title: "Chrome Extension Desktop Capture. Best Practices"
description: "Capture screen and audio with desktopCapture API."
canonical_url: "https://bestchromeextensions.com/patterns/desktop-capture/"
---

# Desktop Capture API Patterns

Overview {#overview}

Chrome's `chrome.desktopCapture` API enables extensions to capture screen content, windows, and tabs. This guide covers eight production-ready patterns for screen recording, screenshots, window picking, audio capture, live preview, WebRTC streaming, and privacy-safe implementation.

---

Required Permissions {#required-permissions}

```jsonc
// manifest.json
{
  "permissions": ["desktopCapture"],
  // Optional: for capturing specific tab audio
  "permissions": ["desktopCapture", "tabs"]
}
```

The `desktopCapture` permission is required in the manifest. Note that this permission doesn't require host permissions. the actual capture is triggered by user action via `chrome.desktopCapture.chooseDesktopMedia()`, which always shows a user picker.

---

Pattern 1: DesktopCapture API Basics {#pattern-1-desktopcapture-api-basics}

The `chrome.desktopCapture.chooseDesktopMedia()` method displays a system picker UI where users select what to share:

```ts
// capture/basic.ts
interface CaptureOptions {
  types: Array<"screen" | "window" | "tab" | "audio">;
  thumbnailSize?: { width: number; height: number };
  normalizeWindowTitle?: boolean;
}

async function startBasicCapture(
  types: Array<"screen" | "window" | "tab"> = ["screen", "window", "tab"]
): Promise<{ streamId: string; stream: MediaStream } | null> {
  // Request capture via the desktop capture picker
  // Note: chooseDesktopMedia is callback-based, not promise-based
  const streamId = await new Promise<string>((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(types, (id) => resolve(id));
  });

  // User cancelled. streamId is empty
  if (!streamId) {
    console.log("User cancelled capture selection");
    return null;
  }

  // Convert streamId to actual MediaStream using getUserMedia
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      // Use the streamId from desktop capture as the media source
      // The mandatory constraint is required for desktop capture
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: streamId,
        // Optionally constrain dimensions
        minWidth: 1280,
        maxWidth: 1920,
        minHeight: 720,
        maxHeight: 1080,
      },
    } as MediaTrackConstraints,
  });

  return { streamId, stream };
}

// Example: simple screen capture button in popup
document.getElementById("capture-screen")!.addEventListener("click", async () => {
  const result = await startBasicCapture(["screen"]);
  if (result) {
    console.log("Capturing screen with stream ID:", result.streamId);
    // Keep reference to stop later
    window.currentStream = result.stream;
  }
});
```

Key points:
- `chooseDesktopMedia()` must be called from a user-initiated context (button click, keyboard shortcut)
- Returns a `streamId` string, not a MediaStream directly
- The `streamId` is converted to a `MediaStream` via `navigator.mediaDevices.getUserMedia()`
- The `chromeMediaSource: "desktop"` and `chromeMediaSourceId` constraints are required
- If the user cancels, the callback receives `null` or an empty string

---

Pattern 2: Screen Recording Extension {#pattern-2-screen-recording-extension}

Recording screen capture to a file requires combining desktop capture with the MediaRecorder API in an offscreen document:

```ts
// capture/recorder.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type RecorderMessages = {
  "recorder:start": {
    request: { streamId: string; mimeType?: string };
    response: { recordingId: string };
  };
  "recorder:stop": {
    request: { recordingId: string };
    response: { blob: Blob; duration: number };
  };
  "recorder:status": {
    request: { recordingId: string };
    response: { isRecording: boolean; duration: number };
  };
};

const messenger = createMessenger<RecorderMessages>();

class ScreenRecorder {
  private activeRecordings = new Map<string, MediaRecorder>();
  private startTimes = new Map<string, number>();

  async startRecording(streamId: string, mimeType = "video/webm;codecs=vp9"):
    Promise<string> {
    // Create media stream from streamId
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: streamId,
        },
      } as MediaTrackConstraints,
    });

    const recordingId = crypto.randomUUID();
    const mimeSupported = MediaRecorder.isTypeSupported(mimeType);
    const actualMimeType = mimeSupported ? mimeType : "video/webm";

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: actualMimeType,
      videoBitsPerSecond: 5000000, // 5 Mbps
    });

    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.start(1000); // Capture in 1-second chunks

    this.activeRecordings.set(recordingId, mediaRecorder);
    this.startTimes.set(recordingId, Date.now());

    // Auto-stop when stream ends (e.g., user stops sharing)
    stream.getVideoTracks()[0].onended = () => {
      this.stopRecording(recordingId);
    };

    return recordingId;
  }

  async stopRecording(recordingId: string): Promise<{ blob: Blob; duration: number }> {
    const recorder = this.activeRecordings.get(recordingId);
    if (!recorder) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const chunks = this.chunks.get(recordingId) ?? [];
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const duration = Date.now() - (this.startTimes.get(recordingId) ?? 0);

        this.activeRecordings.delete(recordingId);
        this.startTimes.delete(recordingId);
        this.chunks.delete(recordingId);

        resolve({ blob, duration });
      };

      recorder.stop();
    });
  }

  private chunks = new Map<string, Blob[]>();
}

const recorder = new ScreenRecorder();

// Offscreen document message handlers
messenger.onMessage("recorder:start", async ({ streamId, mimeType }) => {
  const recordingId = await recorder.startRecording(streamId, mimeType);
  return { recordingId };
});

messenger.onMessage("recorder:stop", async ({ recordingId }) => {
  return recorder.stopRecording(recordingId);
});

messenger.onMessage("recorder:status", ({ recordingId }) => {
  const isRecording = recorder.activeRecordings.has(recordingId);
  const startTime = recorder.startTimes.get(recordingId);
  const duration = startTime ? Date.now() - startTime : 0;
  return { isRecording, duration };
});
```

Service worker integration:

```ts
// background.ts
import { offscreen } from "./offscreen-manager";
import { messenger } from "./capture/recorder";

async function startScreenRecording(): Promise<string> {
  // First, get streamId from the picker
  const streamId = await chrome.desktopCapture.chooseDesktopMedia([
    "screen",
    "window",
  ]);

  if (!streamId) {
    throw new Error("User cancelled capture");
  }

  // Delegate recording to offscreen document
  await offscreen.ensure(
    chrome.offscreen.Reason.MEDIA_RECORDING,
    "Record screen capture to file"
  );

  const result = await messenger.send("recorder:start", {
    streamId,
    mimeType: "video/webm;codecs=vp9",
  });

  return result.recordingId;
}

async function stopScreenRecording(recordingId: string): Promise<Blob> {
  const result = await messenger.send("recorder:stop", { recordingId });
  return result.blob;
}

// Save recorded blob to downloads
async function saveRecording(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({
    url,
    filename,
    saveAs: true,
  });
  URL.revokeObjectURL(url);
}
```

---

Pattern 3: Screenshot from Desktop Capture {#pattern-3-screenshot-from-desktop-capture}

Capture a single frame from a video stream:

```ts
// capture/screenshot.ts
async function captureScreenshot(streamId: string): Promise<Blob> {
  // Create stream with higher resolution for screenshots
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: streamId,
        // Request maximum available resolution
        minWidth: 1920,
        minHeight: 1080,
        maxWidth: 3840,
        maxHeight: 2160,
      },
    } as MediaTrackConstraints,
  });

  const video = document.createElement("video");
  video.srcObject = stream;
  await video.play();

  // Wait for metadata to ensure dimensions are available
  await new Promise<void>((resolve) => {
    if (video.videoWidth > 0) {
      resolve();
    } else {
      video.onloadedmetadata = () => resolve();
    }
  });

  // Create canvas at actual video dimensions
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0);

  // Stop all tracks to release capture
  stream.getTracks().forEach((track) => track.stop());

  // Export as PNG
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });
}

// With crop and annotation support
interface ScreenshotOptions {
  streamId: string;
  crop?: { x: number; y: number; width: number; height: number };
  annotations?: Array<{
    type: "rect" | "text" | "arrow";
    x: number;
    y: number;
    width?: number;
    height?: number;
    text?: string;
    color: string;
  }>;
  format?: "png" | "jpeg";
  quality?: number;
}

async function captureWithOptions(options: ScreenshotOptions): Promise<Blob> {
  const { streamId, crop, annotations, format = "png", quality = 0.92 } = options;

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: streamId,
      },
    } as MediaTrackConstraints,
  });

  const video = document.createElement("video");
  video.srcObject = stream;
  await video.play();
  await new Promise<void>((resolve) => {
    if (video.videoWidth > 0) resolve();
    else video.onloadedmetadata = () => resolve();
  });

  // Determine dimensions (use crop or full video)
  const srcWidth = video.videoWidth;
  const srcHeight = video.videoHeight;
  const cropX = crop?.x ?? 0;
  const cropY = crop?.y ?? 0;
  const cropWidth = crop?.width ?? srcWidth;
  const cropHeight = crop?.height ?? srcHeight;

  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  // Add annotations
  if (annotations) {
    for (const ann of annotations) {
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = 3;

      if (ann.type === "rect" && ann.width && ann.height) {
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === "text" && ann.text) {
        ctx.font = "16px sans-serif";
        ctx.fillText(ann.text, ann.x, ann.y);
      } else if (ann.type === "arrow") {
        // Simple arrow drawing
        ctx.beginPath();
        ctx.moveTo(ann.x, ann.y);
        ctx.lineTo(ann.x + (ann.width ?? 50), ann.y + (ann.height ?? 0));
        ctx.stroke();
      }
    }
  }

  stream.getTracks().forEach((track) => track.stop());

  return new Promise((resolve) => {
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
    const q = format === "jpeg" ? quality : undefined;
    canvas.toBlob((blob) => resolve(blob!), mimeType, q);
  });
}
```

---

Pattern 4: Window Picker UI {#pattern-4-window-picker-ui}

Configure the picker to filter to specific source types:

```ts
// capture/window-picker.ts
interface SourceFilter {
  types: Array<"screen" | "window" | "tab">;
  excludeSources?: Array<"screen" | "window" | "tab">;
  // For tabs: require explicit user gesture via --enable-features=MediaRouter
}

class WindowPicker {
  async pickWindow(): Promise<string | null> {
    // Only show windows (not entire screens)
    return chrome.desktopCapture.chooseDesktopMedia(["window"]);
  }

  async pickScreen(): Promise<string | null> {
    // Only show screens (not windows)
    return chrome.desktopCapture.chooseDesktopMedia(["screen"]);
  }

  async pickTab(): Promise<string | null> {
    // Only show tabs
    return chrome.desktopCapture.chooseDesktopMedia(["tab"]);
  }

  async pickAny(): Promise<string | null> {
    // Show all options: screen, window, tab
    return chrome.desktopCapture.chooseDesktopMedia(["screen", "window", "tab"]);
  }

  // Pick with custom constraints
  async pickWithConstraints(
    types: Array<"screen" | "window" | "tab">,
    options: {
      thumbnailSize?: { width: number; height: number };
      normalizeWindowTitle?: boolean;
    } = {}
  ): Promise<string | null> {
    return chrome.desktopCapture.chooseDesktopMedia(types, undefined, options);
  }

  // Handle user cancellation gracefully
  async safePick(types: Array<"screen" | "window" | "tab">):
    Promise<{ streamId: string; cancelled: boolean }> {
    try {
      const streamId = await chrome.desktopCapture.chooseDesktopMedia(types);
      return { streamId: streamId ?? "", cancelled: !streamId };
    } catch (error) {
      // API may throw on some error conditions
      console.error("Desktop capture error:", error);
      return { streamId: "", cancelled: true };
    }
  }
}

const picker = new WindowPicker();

// Usage in popup
document.getElementById("pick-window")!.addEventListener("click", async () => {
  const result = await picker.safePick(["window"]);
  if (result.cancelled) {
    console.log("User cancelled window selection");
    return;
  }
  console.log("Selected window stream ID:", result.streamId);
});

// Usage: filter to only windows with specific properties
document.getElementById("pick-screen-only")!.addEventListener("click", async () => {
  // Using optional third parameter for thumbnail size
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(
    ["screen"],
    undefined,
    {
      thumbnailSize: { width: 320, height: 180 },
      normalizeWindowTitle: true,
    }
  );

  if (streamId) {
    // Proceed with capture
  }
});
```

> Note: The `chooseDesktopMedia` API doesn't directly support filtering sources client-side. To limit the capture options, pass a filtered array of `DesktopCaptureSourceType` values (e.g., `["screen"]` or `["window"]`). There is no `getSources` method on the `chrome.desktopCapture` API.

---

Pattern 5: Audio Capture {#pattern-5-audio-capture}

Capturing system audio or tab audio requires specific constraints:

```ts
// capture/audio.ts
async function captureWithAudio(
  source: "screen" | "window" | "tab",
  captureSystemAudio: boolean = false
): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: "", // Will be set after picker
      },
    } as MediaTrackConstraints,
  };

  // Get streamId first
  const streamId = await chrome.desktopCapture.chooseDesktopMedia([
    source,
    ...(captureSystemAudio ? ["audio"] : []),
  ]);

  if (!streamId) {
    throw new Error("User cancelled or no sources available");
  }

  // Set the video source
  constraints.video!.mandatory!.chromeMediaSourceId = streamId;

  // Audio constraints differ based on source type
  if (captureSystemAudio) {
    // System audio (all sources)
    constraints.audio = {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: streamId,
        // Echo cancellation must be off for desktop capture
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    } as MediaTrackConstraints;
  } else if (source === "tab") {
    // Tab audio only
    constraints.audio = {
      mandatory: {
        chromeMediaSource: "tab",
        // Specific tab ID would be needed here
      },
    } as MediaTrackConstraints;
  }

  return navigator.mediaDevices.getUserMedia(constraints);
}

// Audio-only capture for system audio
async function captureSystemAudioOnly(): Promise<MediaStream> {
  const streamId = await chrome.desktopCapture.chooseDesktopMedia([
    "screen",
    "window",
    "tab",
    "audio",
  ]);

  if (!streamId) {
    throw new Error("User cancelled");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: streamId,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    } as MediaTrackConstraints,
    video: false,
  });
}

// Audio capture with specific tab
async function captureTabAudio(tabId: number): Promise<MediaStream> {
  // Using chrome.tabCapture with constraints
  return chrome.tabCapture.capture({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceTabId: tabId,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    } as MediaTrackConstraints,
    video: false,
  });
}

// Note: chrome.desktopCapture does not have a getSources method.
// To capture audio, use chooseDesktopMedia with the desired source types
// and request audio in the getUserMedia constraints.
async function captureWithAudio(sourceTypes: chrome.desktopCapture.DesktopCaptureSourceType[]): Promise<string> {
  return new Promise((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(sourceTypes, (streamId) => {
      resolve(streamId);
    });
  });
}
```

> Important: System audio capture is only available on Chrome OS, Linux, and Windows. macOS does not support capturing system audio through the Desktop Capture API.

---

Pattern 6: Live Preview {#pattern-6-live-preview}

Display captured content in the extension popup or a floating PiP window:

```ts
// capture/preview.ts
class CapturePreview {
  private videoElement: HTMLVideoElement | null = null;
  private pipWindow: PictureInPictureWindow | null = null;

  // Show preview in a provided video element
  async showInElement(
    videoElement: HTMLVideoElement,
    streamId: string,
    options: {
      muted?: boolean;
      autoplay?: boolean;
    } = {}
  ): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: streamId,
          // Control frame rate for preview performance
          minFrameRate: 15,
          maxFrameRate: 30,
        },
      } as MediaTrackConstraints,
    });

    videoElement.srcObject = stream;
    videoElement.muted = options.muted ?? true;
    videoElement.autoplay = options.autoplay ?? true;

    this.videoElement = videoElement;
    return stream;
  }

  // Request Picture-in-Picture for floating preview
  async enterPictureInPicture(videoElement: HTMLVideoElement): Promise<void> {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }

      // Ensure video is playing before entering PiP
      if (videoElement.paused) {
        await videoElement.play();
      }

      await videoElement.requestPictureInPicture();
    } catch (error) {
      console.error("Failed to enter PiP:", error);
    }
  }

  // Exit Picture-in-Picture
  async exitPictureInPicture(): Promise<void> {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    }
  }

  // Create a floating preview window (for more control)
  async openFloatingPreview(streamId: string): Promise<Window> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: streamId,
          maxFrameRate: 15, // Lower frame rate for preview
        },
      } as MediaTrackConstraints,
    });

    // Create preview in new window
    const previewWindow = window.open(
      "",
      "Capture Preview",
      "width=640,height=360,menubar=no,toolbar=no"
    );

    if (!previewWindow) {
      throw new Error("Failed to open preview window");
    }

    // Write preview HTML
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; background: #000; overflow: hidden; }
          video { width: 100%; height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <video id="preview" autoplay playsinline></video>
        <script>
          const video = document.getElementById('preview');
          const stream = new MediaStream([
            ...${JSON.stringify(stream.getVideoTracks().map((t) => t.id))}
              .map(id => window.opener.__getTrackById(id))
          ].filter(Boolean));
          video.srcObject = stream;
        </script>
      </body>
      </html>
    `);

    return previewWindow;
  }

  // Clean up preview
  stop(): void {
    if (this.videoElement?.srcObject) {
      const tracks = (this.videoElement.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      this.videoElement.srcObject = null;
    }

    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
    }
  }
}

// Usage in side panel
async function setupSidePanelPreview(sidePanel: chrome.sidePanel) {
  const preview = new CapturePreview();

  document.getElementById("start-preview")!.addEventListener("click", async () => {
    const streamId = await chrome.desktopCapture.chooseDesktopMedia([
      "screen",
      "window",
      "tab",
    ]);

    if (!streamId) return;

    const videoElement = document.getElementById("preview") as HTMLVideoElement;
    await preview.showInElement(videoElement, streamId);
  });

  document.getElementById("pip-button")!.addEventListener("click", async () => {
    const videoElement = document.getElementById("preview") as HTMLVideoElement;
    await preview.enterPictureInPicture(videoElement);
  });

  // Clean up when side panel closes
  sidePanel.onClose.addListener(() => {
    preview.stop();
  });
}
```

---

Pattern 7: Streaming to WebRTC {#pattern-7-streaming-to-webrtc}

Broadcast captured content to remote peers using WebRTC:

```ts
// capture/webrtc.ts
interface PeerConnection {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
}

class DesktopCaptureStreamer {
  private connections: Map<string, PeerConnection> = new Map();
  private localStream: MediaStream | null = null;

  // Configuration for the peer connection
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  async startCaptureAndStream(
    peerId: string,
    sourceTypes: Array<"screen" | "window" | "tab"> = ["screen"]
  ): Promise<string> {
    // Get stream from desktop capture
    const streamId = await chrome.desktopCapture.chooseDesktopMedia(sourceTypes);

    if (!streamId) {
      throw new Error("User cancelled capture selection");
    }

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true, // Include audio if desired
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: streamId,
          maxFrameRate: 30,
        },
      } as MediaTrackConstraints,
    });

    // Create peer connection
    const pc = new RTCPeerConnection(this.rtcConfig);

    // Add local tracks to the connection
    this.localStream.getTracks().forEach((track) => {
      pc.addTrack(track, this.localStream!);
    });

    // Create data channel for metadata/controls
    const dataChannel = pc.createDataChannel("controls", {
      ordered: true,
    });

    dataChannel.onopen = () => {
      console.log(`Data channel open for peer: ${peerId}`);
    };

    dataChannel.onmessage = (event) => {
      this.handleControlMessage(peerId, JSON.parse(event.data));
    };

    // Handle incoming tracks from remote peer (for bi-directional)
    pc.ontrack = (event) => {
      this.onRemoteTrack?.(event.streams[0]);
    };

    // Create and set local description (offer)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // In a real implementation, send offer to signaling server
    // and receive answer from remote peer
    const answer = await this.sendOfferToSignalingServer(pc.localDescription!, peerId);
    await pc.setRemoteDescription(answer);

    this.connections.set(peerId, { pc, dataChannel });
    return streamId;
  }

  private async sendOfferToSignalingServer(
    offer: RTCSessionDescriptionInit,
    peerId: string
  ): Promise<RTCSessionDescriptionInit> {
    // Placeholder for actual signaling server integration
    const response = await fetch("/signaling/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer, peerId }),
    });
    const { answer } = await response.json();
    return answer;
  }

  private handleControlMessage(peerId: string, message: { type: string; value?: unknown }): void {
    switch (message.type) {
      case "pause":
        this.pauseStream(peerId);
        break;
      case "resume":
        this.resumeStream(peerId);
        break;
      case "get-status":
        this.sendStatus(peerId);
        break;
    }
  }

  pauseStream(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (connection) {
      this.localStream?.getTracks().forEach((track) => {
        track.enabled = false;
      });
      connection.dataChannel?.send(JSON.stringify({ type: "paused" }));
    }
  }

  resumeStream(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (connection) {
      this.localStream?.getTracks().forEach((track) => {
        track.enabled = true;
      });
      connection.dataChannel?.send(JSON.stringify({ type: "resumed" }));
    }
  }

  async stopStream(peerId: string): Promise<void> {
    const connection = this.connections.get(peerId);
    if (connection) {
      connection.pc.close();
      this.connections.delete(peerId);
    }
  }

  stopAllStreams(): void {
    this.connections.forEach((_, peerId) => this.stopStream(peerId));

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }

  sendStatus(peerId: string): void {
    const connection = this.connections.get(peerId);
    if (connection?.dataChannel?.readyState === "open") {
      connection.dataChannel.send(
        JSON.stringify({
          type: "status",
          isPlaying: this.localStream?.getTracks()[0]?.enabled ?? false,
          trackCount: this.localStream?.getTracks().length ?? 0,
        })
      );
    }
  }

  // Callback for handling incoming remote streams
  onRemoteTrack?: (stream: MediaStream) => void;
}

// Usage
const streamer = new DesktopCaptureStreamer();

document.getElementById("start-stream")!.addEventListener("click", async () => {
  try {
    const streamId = await streamer.startCaptureAndStream("peer-123", ["screen"]);
    console.log("Started streaming:", streamId);
  } catch (error) {
    console.error("Failed to start streaming:", error);
  }
});

document.getElementById("stop-stream")!.addEventListener("click", () => {
  streamer.stopAllStreams();
});
```

---

Pattern 8: Permission and Privacy Patterns {#pattern-8-permission-and-privacy-patterns}

Privacy-safe implementation with consent indicators and auto-stop:

```ts
// capture/privacy.ts
class PrivacyAwareCapture {
  private activeCapture = false;
  private captureStartTime: number | null = null;

  // Show capture indicator (badge + notification)
  async enableCaptureIndicators(tabId: number): Promise<void> {
    // Set badge to indicate active capture
    chrome.action.setBadgeText({ text: "REC", tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#FF0000", tabId });

    // Show notification that capture is active
    await chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Screen Capture Active",
      message: "Recording or streaming is in progress",
      priority: 1,
    });

    this.activeCapture = true;
    this.captureStartTime = Date.now();
  }

  // Disable indicators
  async disableCaptureIndicators(tabId: number): Promise<void> {
    chrome.action.setBadgeText({ text: "", tabId });

    if (this.captureStartTime) {
      const duration = Date.now() - this.captureStartTime;
      console.log(`Capture duration: ${duration}ms`);
    }

    this.activeCapture = false;
    this.captureStartTime = null;
  }

  // Auto-stop on tab close
  setupTabCloseProtection(tabId: number, stream: MediaStream): void {
    chrome.tabs.onRemoved.addListener((removedTabId) => {
      if (removedTabId === tabId) {
        console.log("Captured tab closed - stopping capture");
        stream.getTracks().forEach((track) => track.stop());
      }
    });

    // Also stop on tab navigation (SPA navigation may not trigger onRemoved)
    chrome.webNavigation?.onCommitted?.addListener((details) => {
      if (details.tabId === tabId && details.frameId === 0) {
        // Check if it's a main frame navigation (not hash change)
        if (details.transitionType !== "reload" && details.transitionType !== "form_submit") {
          console.log("Tab navigated - stopping capture");
          stream.getTracks().forEach((track) => track.stop());
        }
      }
    });
  }

  // User consent verification
  async verifyUserConsent(): Promise<boolean> {
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      return false;
    }

    // Log consent for audit (in production, store in persistent storage)
    console.log(`User initiated capture on tab ${tab.id} at ${new Date().toISOString()}`);

    // Optionally: Show in-extension consent confirmation
    return true;
  }

  // Privacy-safe: never capture without explicit user action
  async captureWithConsent(
    sourceTypes: Array<"screen" | "window" | "tab"> = ["screen", "window", "tab"]
  ): Promise<{ streamId: string; stream: MediaStream } | null> {
    // Verify user gesture (must be called from user-initiated event)
    await this.verifyUserConsent();

    // Show picker (user's explicit choice)
    const streamId = await chrome.desktopCapture.chooseDesktopMedia(sourceTypes);

    if (!streamId) {
      console.log("User cancelled - no capture");
      return null;
    }

    // Convert to stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: streamId,
        },
      } as MediaTrackConstraints,
    });

    return { streamId, stream };
  }

  // Clean capture session
  async endCaptureSession(tabId: number, stream: MediaStream): Promise<void> {
    // Stop all tracks
    stream.getTracks().forEach((track) => track.stop());

    // Disable indicators
    await this.disableCaptureIndicators(tabId);

    // Log session for privacy audit
    if (this.captureStartTime) {
      console.log(`Capture session ended. Duration: ${Date.now() - this.captureStartTime}ms`);
    }
  }

  isCapturing(): boolean {
    return this.activeCapture;
  }

  getCaptureDuration(): number | null {
    return this.captureStartTime ? Date.now() - this.captureStartTime : null;
  }
}

// Service worker implementation with privacy patterns
// background.ts
const captureManager = new PrivacyAwareCapture();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;

  // Check if already capturing
  if (captureManager.isCapturing()) {
    // Toggle off - stop capture
    // Would need to track stream reference in a Map
    return;
  }

  try {
    // Start capture with user consent flow
    const result = await captureManager.captureWithConsent(["screen", "window"]);

    if (!result) {
      // User cancelled
      return;
    }

    // Enable indicators
    await captureManager.enableCaptureIndicators(tab.id);

    // Set up auto-stop on tab close
    captureManager.setupTabCloseProtection(tab.id, result.stream);

    // Store stream reference for later stopping
    activeStreams.set(tab.id, result.stream);

    console.log("Capture started with consent");
  } catch (error) {
    console.error("Capture failed:", error);
  }
});

const activeStreams = new Map<number, MediaStream>();
```

> Privacy Note: Always ensure screen capture is initiated by explicit user action (button click, keyboard shortcut). Never programmatically start capture without user consent. Display clear indicators when capture is active, and provide easy ways for users to stop capture.

---

Summary {#summary}

| Pattern | Use Case | Key APIs |
|---------|----------|----------|
| Basic Capture | Simple screen/window/tab selection | `chrome.desktopCapture.chooseDesktopMedia()` |
| Screen Recording | Record capture to file | `MediaRecorder` API in offscreen document |
| Screenshot | Single frame capture with crop/annotate | Canvas API for image processing |
| Window Picker | Filter capture to specific source types | `chooseDesktopMedia` with source types array |
| Audio Capture | System audio or tab audio | `chromeMediaSource: "desktop"` with audio constraints |
| Live Preview | Show capture in popup/side panel/PiP | `video` element with PiP API |
| WebRTC Streaming | Broadcast to remote peers | `RTCPeerConnection` with captured stream |
| Privacy Patterns | User consent, indicators, auto-stop | Badge API, notifications, event listeners |

The Desktop Capture API requires the `desktopCapture` permission but does not require host permissions. The user must always explicitly select what to capture via the system picker. extensions cannot silently capture without user action. Always implement privacy-safe patterns: show clear indicators when capture is active, provide easy stop mechanisms, and log capture sessions for transparency.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
