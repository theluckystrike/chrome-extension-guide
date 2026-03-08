---
layout: default
title: "Chrome Extension Desktop Capture — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/desktop-capture/"
---
# Chrome Extension Desktop Capture API Guide

The `chrome.desktopCapture` API enables Chrome Extensions to capture screen content, windows, browser tabs, and audio from the user's desktop. This guide covers building screenshot tools, screen recorders, and real-time streaming extensions.

## API Overview {#api-overview}

The `chrome.desktopCapture` API provides methods to capture the user's screen or individual windows and convert them into MediaStream objects for processing, recording, or streaming.

### Required Permissions {#required-permissions}

Add the `desktopCapture` permission to your `manifest.json`:

```json
{
  "name": "My Capture Extension",
  "version": "1.0",
  "permissions": ["desktopCapture"],
  "host_permissions": ["<all_urls>"]
}
```

The `host_permissions` is required when streaming to remote servers via WebRTC. For local processing only, you can omit it.

## Core Methods {#core-methods}

### chooseDesktopMedia() {#choosedesktopmedia}

Displays the native Chrome source picker dialog for users to select a screen, window, or tab to share:

```javascript
chrome.desktopCapture.chooseDesktopMedia(
  sources: string[],    // Source types to display
  callback: function    // Receives streamId or null
): number;             // Returns request ID for cancellation
```

### cancelChooseDesktopMedia() {#cancelchoosedesktopmedia}

Programmatically dismiss the source picker:

```javascript
const requestId = chrome.desktopCapture.chooseDesktopMedia(
  ['screen', 'window'],
  (streamId) => { /* handle result */ }
);
chrome.desktopCapture.cancelChooseDesktopMedia(requestId);
```

## Source Types {#source-types}

### screen - Full Screen Capture {#screen-full-screen-capture}

Captures entire displays or specific monitors:

```javascript
function captureFullScreen() {
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen'],
    async (streamId) => {
      if (!streamId) {
        console.log('User cancelled');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080
          }
        }
      });

      console.log('Screen capture started:', stream);
    }
  );
}
```

### window - Application Window Capture {#window-application-window-capture}

Restricts the picker to show only application windows:

```javascript
function captureWindow() {
  chrome.desktopCapture.chooseDesktopMedia(
    ['window'],
    async (streamId) => {
      if (!streamId) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId
          }
        }
      });

      console.log('Window capture started:', stream);
    }
  );
}
```

### tab - Browser Tab Capture {#tab-browser-tab-capture}

Captures browser tabs with optional tab audio:

```javascript
function captureTab() {
  chrome.desktopCapture.chooseDesktopMedia(
    ['tab'],
    async (streamId) => {
      if (!streamId) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: streamId
          }
        }
      });

      console.log('Tab capture started');
    }
  );
}
```

### audio - System and Tab Audio {#audio-system-and-tab-audio}

Capture system or tab audio (Chrome 74+):

```javascript
function captureWithAudio() {
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window', 'tab', 'audio'],
    async (streamId) => {
      if (!streamId) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId
          }
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId
          }
        }
      });

      console.log('Audio captured:', stream.getAudioTracks()[0].label);
    }
  );
}
```

## Converting Stream ID to MediaStream {#converting-stream-id-to-mediastream}

The `chooseDesktopMedia()` returns a stream ID string that must be passed to `getUserMedia()`:

### Basic Conversion {#basic-conversion}

```javascript
async function getMediaStream(streamId) {
  return await navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });
}
```

### Working with Tracks {#working-with-tracks}

```javascript
function handleStream(stream) {
  const videoTrack = stream.getVideoTracks()[0];
  const audioTrack = stream.getAudioTracks()[0];

  console.log('Video settings:', videoTrack.getSettings());

  videoTrack.onended = () => {
    console.log('Capture ended');
    cleanup(stream);
  };

  return { videoTrack, audioTrack };
}
```

## Building a Screenshot Extension {#building-a-screenshot-extension}

### Manifest Configuration {#manifest-configuration}

```json
{
  "name": "Screenshot Pro",
  "version": "1.0",
  "permissions": ["desktopCapture", "offscreen", "downloads"],
  "action": {
    "default_icon": "icon.png",
    "default_title": "Take Screenshot"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

### Background Script (background.js) {#background-script-backgroundjs}

```javascript
chrome.action.onClicked.addListener(async (tab) => {
  const streamId = await new Promise((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab'],
      (id) => resolve(id)
    );
  });

  if (!streamId) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Capture and save screenshot'
  });

  chrome.runtime.sendMessage({
    type: 'CAPTURE_SCREENSHOT',
    streamId: streamId
  });
});
```

### Offscreen Document (offscreen.html) {#offscreen-document-offscreenhtml}

```html
<!DOCTYPE html>
<html>
<head>
  <script src="offscreen.js"></script>
</head>
<body>
  <video id="video" autoplay></video>
  <canvas id="canvas"></canvas>
</body>
</html>
```

### Offscreen Script (offscreen.js) {#offscreen-script-offscreenjs}

```javascript
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CAPTURE_SCREENSHOT') {
    captureScreenshot(message.streamId);
  }
});

async function captureScreenshot(streamId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });

  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');

  video.srcObject = stream;

  video.onloadedmetadata = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const url = URL.createObjectURL(blob);

      await chrome.downloads.download({
        url: url,
        filename: `screenshot-${Date.now()}.png`,
        saveAs: true
      });

      stream.getTracks().forEach(track => track.stop());
      URL.revokeObjectURL(url);
      window.close();
    }, 'image/png');
  };
}
```

## Building a Screen Recording Extension {#building-a-screen-recording-extension}

### Background Script {#background-script}

```javascript
chrome.action.onClicked.addListener(async (tab) => {
  const streamId = await new Promise((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab', 'audio'],
      (id) => resolve(id)
    );
  });

  if (!streamId) return;

  await chrome.offscreen.createDocument({
    url: 'recorder.html',
    reasons: ['USER_MEDIA'],
    justification: 'Record screen capture'
  });

  chrome.runtime.sendMessage({
    type: 'START_RECORDING',
    streamId: streamId
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'stop-recording') {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  }
});
```

### Recording Logic (recorder.html) {#recording-logic-recorderhtml}

```javascript
let mediaRecorder;
let recordedChunks = [];

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'START_RECORDING') {
    startRecording(message.streamId);
  } else if (message.type === 'STOP_RECORDING') {
    mediaRecorder?.stop();
  }
});

async function startRecording(streamId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });

  const displayStream = await navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });

  const combinedStream = new MediaStream([
    ...displayStream.getVideoTracks(),
    ...stream.getAudioTracks()
  ]);

  mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType: 'video/webm;codecs=vp9'
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = saveRecording;
  mediaRecorder.start(1000);
}

async function saveRecording() {
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url: url,
    filename: `recording-${Date.now()}.webm`,
    saveAs: true
  });

  URL.revokeObjectURL(url);
  window.close();
}
```

## Error Handling and Best Practices {#error-handling-and-best-practices}

### Proper Error Handling {#proper-error-handling}

```javascript
async function safeCapture(sourceTypes) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Media capture not supported');
  }

  return new Promise((resolve, reject) => {
    chrome.desktopCapture.chooseDesktopMedia(
      sourceTypes,
      async (streamId) => {
        if (!streamId) {
          reject(new Error('User cancelled'));
          return;
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: streamId
              }
            }
          });
          resolve(stream);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}
```

### Resource Cleanup {#resource-cleanup}

```javascript
function cleanupStream(stream) {
  if (!stream) return;

  stream.getTracks().forEach(track => {
    track.stop();
    console.log(`Stopped ${track.kind} track`);
  });
}

async function captureWithCleanup() {
  let stream = null;

  try {
    const streamId = await getStreamId();
    stream = await getMediaStream(streamId);
    // Process stream...
  } finally {
    cleanupStream(stream);
  }
}
```

### Handling User Cancellation {#handling-user-cancellation}

```javascript
chrome.desktopCapture.chooseDesktopMedia(
  ['screen', 'window'],
  (streamId) => {
    if (!streamId) {
      console.log('User cancelled - no action needed');
      return;
    }

    processStream(streamId);
  }
);
```

## Platform-Specific Considerations {#platform-specific-considerations}

### macOS Requirements {#macos-requirements}

Users must grant Screen Recording permission in System Preferences > Privacy & Security > Screen Recording. Without this permission, the picker shows no sources.

### Multi-Monitor Support {#multi-monitor-support}

Chrome's picker automatically shows all available screens in multi-monitor setups. Users can select which monitor to capture.

### Linux Considerations {#linux-considerations}

Linux has limited audio capture support. Test thoroughly on target distributions.

## Security Considerations {#security-considerations}

1. Always require user interaction to start capture
2. Minimize stream ID lifetime - process and release quickly
3. Validate stream sources before processing
4. Always stop tracks when done
5. Consider privacy implications

## Related APIs {#related-apis}

- `chrome.tabCapture` - Alternative API for tab-specific capture
- `navigator.mediaDevices.getUserMedia` - Core Web API for media capture
- `MediaRecorder` - Record MediaStream objects
- `RTCPeerConnection` - Stream via WebRTC
- `ImageCapture` - Capture still images from video tracks

## Related Articles {#related-articles}

## Related Articles

- [Desktop Capture Patterns](../patterns/desktop-capture.md)
- [Tab Capture](../guides/tab-capture.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
