# Chrome Extension Desktop Capture API

The Chrome Desktop Capture API is a powerful Chrome Extension API that enables extensions to capture the entire screen, individual windows, or browser tabs as audio/video streams. This comprehensive guide covers everything you need to build screen recording, screenshot, and screencasting extensions.

## Overview

The `chrome.desktopCapture` API provides functionality to capture the user's screen, windows, or tabs. Unlike the Tab Capture API which is limited to browser tabs, Desktop Capture can capture any application window or the entire screen.

### Key Capabilities

- **Screen Capture**: Capture the entire primary display or all displays
- **Window Capture**: Capture specific application windows
- **Tab Capture**: Capture browser tabs (similar to chrome.tabCapture)
- **Audio Capture**: Optionally include system audio or microphone input
- **Stream Processing**: Work with standard MediaStream APIs

### Permissions Required

Add the `desktopCapture` permission to your manifest:

```json
{
  "name": "My Screen Recorder",
  "version": "1.0",
  "permissions": [
    "desktopCapture"
  ]
}
```

## Core API Methods

### chooseDesktopMedia

The primary method for initiating screen capture is `chrome.desktopCapture.chooseDesktopMedia()`. This method displays the Chrome's built-in picker UI where users can select what to share.

```javascript
chrome.desktopCapture.chooseDesktopMedia(
  sources: string[],
  callback: function
): number
```

#### Parameters

- **sources**: An array of source types to show in the picker. Valid values:
  - `'screen'`: Entire screen(s)
  - `'window'`: Application windows
  - `'tab'`: Browser tabs
  - `'audio'`: System audio (desktop audio on Windows, may include microphone on macOS)

- **callback**: Function called with the result. Receives a `streamId` string or `null` if the user cancelled.

#### Return Value

Returns a request ID that can be used with `cancelChooseDesktopMedia()` to dismiss the picker programmatically.

#### Example

```javascript
function startCapture() {
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window', 'tab', 'audio'],
    (streamId) => {
      if (!streamId) {
        console.log('User cancelled the picker');
        return;
      }
      // Use streamId to create a MediaStream
      startStream(streamId);
    }
  );
}

document.getElementById('capture-btn').addEventListener('click', startCapture);
```

### cancelChooseDesktopMedia

Cancels a desktop capture request that is currently showing the picker UI.

```javascript
chrome.desktopCapture.cancelChooseDesktopMedia(requestId: number): void
```

#### Parameters

- **requestId**: The ID returned by `chooseDesktopMedia()`.

```javascript
// Cancel the picker after 10 seconds if user hasn't selected
const requestId = chrome.desktopCapture.chooseDesktopMedia(
  ['screen', 'window'],
  handleStream
);

setTimeout(() => {
  chrome.desktopCapture.cancelChooseDesktopMedia(requestId);
}, 10000);
```

## Converting Stream ID to MediaStream

The `streamId` returned by `chooseDesktopMedia()` is not a direct MediaStream. You need to use `navigator.mediaDevices.getUserMedia()` to convert it into a usable stream.

### Basic Conversion

```javascript
function startStream(streamId) {
  const constraints = {
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
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then((stream) => {
      console.log('Stream captured successfully');
      // Attach to video element for preview
      const video = document.getElementById('preview');
      video.srcObject = stream;
      video.play();
    })
    .catch((error) => {
      console.error('Error capturing stream:', error);
    });
}
```

### Capturing Without Audio

```javascript
function captureVideoOnly(streamId) {
  navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      },
      // Optional: specify resolution
      minWidth: 1280,
      maxWidth: 1920,
      minHeight: 720,
      maxHeight: 1080
    }
  })
  .then((stream) => {
    // Work with video-only stream
  });
}
```

### Capturing Only Audio

```javascript
function captureAudioOnly(streamId) {
  navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  })
  .then((stream) => {
    // Work with audio-only stream
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    // Process audio...
  });
}
```

## Source Types Deep Dive

### Screen Capture ('screen')

Captures the entire screen or multiple monitors. On multi-monitor setups, Chrome shows each display as a separate option.

```javascript
chrome.desktopCapture.chooseDesktopMedia(['screen'], (streamId) => {
  if (streamId) {
    // User selected a screen
    navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId
        }
      }
    }).then(handleStream);
  }
});
```

**Important Notes:**
- On macOS, screen capture requires the extension to be packaged and signed
- System audio capture on Windows requires Windows 10 or later
- Use the `maxWidth` and `maxHeight` constraints to limit resolution

### Window Capture ('window')

Captures a specific application window. Chrome shows all visible windows in the picker.

```javascript
chrome.desktopCapture.chooseDesktopMedia(['window'], (streamId) => {
  if (streamId) {
    // User selected a window
    navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId
        }
      }
    }).then(handleStream);
  }
});
```

**Window vs Screen:**
- Window capture is more privacy-friendly as users can see exactly which window
- Some applications may block window capture (DRM-protected content)
- Window capture excludes system UI elements

### Tab Capture ('tab')

Captures a specific browser tab. This is similar to `chrome.tabCapture.capture()` but uses the desktop capture picker.

```javascript
chrome.desktopCapture.chooseDesktopMedia(['tab'], (streamId) => {
  if (streamId) {
    navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab'
        }
      }
    }).then(handleStream);
  }
});
```

### Audio Capture ('audio')

System audio capture works differently across platforms:

**Windows:**
- Captures system audio output
- Requires Windows 10 or later
- May require additional permissions

**macOS:**
- System audio capture not available
- Can capture microphone input instead
- Check `chrome.systemAudio.getState()` for availability

```javascript
// Check audio availability
chrome.desktopCapture.chooseDesktopMedia(['audio'], (streamId) => {
  if (!streamId) {
    console.log('Audio capture not available on this system');
    return;
  }
  // Capture audio...
});
```

## Building a Screenshot Extension

Here's a practical example of building a screenshot extension using the Desktop Capture API:

### Background Script

```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  // Request screen capture
  const streamId = await chrome.desktopCapture.chooseDesktopMedia([
    'screen',
    'window',
    'tab'
  ]);

  if (!streamId) {
    return; // User cancelled
  }

  // Send stream ID to content script for capture
  chrome.tabs.sendMessage(tab.id, { streamId });
});
```

### Content Script

```javascript
// content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.streamId) {
    captureScreenshot(message.streamId)
      .then(dataUrl => {
        // Download the screenshot
        downloadScreenshot(dataUrl);
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
  }
  return true; // Keep message channel open for async response
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

  // Create video element to capture frame
  const video = document.createElement('video');
  video.srcObject = stream;
  await video.play();

  // Draw to canvas
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  // Stop the stream
  stream.getTracks().forEach(track => track.stop());

  return canvas.toDataURL('image/png');
}

function downloadScreenshot(dataUrl) {
  const link = document.createElement('a');
  link.download = `screenshot-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}
```

## Building a Screen Recorder Extension

A complete screen recorder example:

### Manifest

```json
{
  "manifest_version": 3,
  "name": "Screen Recorder",
  "version": "1.0",
  "permissions": ["desktopCapture", "downloads"],
  "action": {
    "default_popup": "popup.html"
  }
}
```

### Popup Script

```javascript
// popup.js
let mediaRecorder = null;
let recordedChunks = [];
let desktopStream = null;

document.getElementById('start').addEventListener('click', startRecording);
document.getElementById('stop').addEventListener('click', stopRecording);

async function startRecording() {
  const streamId = await chrome.desktopCapture.chooseDesktopMedia([
    'screen',
    'window',
    'tab',
    'audio'
  ]);

  if (!streamId) return;

  desktopStream = await navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    },
    audio: true
  });

  // Create combined stream for preview
  const previewVideo = document.getElementById('preview');
  previewVideo.srcObject = desktopStream;
  await previewVideo.play();

  // Set up MediaRecorder
  const options = { mimeType: 'video/webm; codecs=vp9' };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options.mimeType = 'video/webm; codecs=vp8';
  }

  mediaRecorder = new MediaRecorder(desktopStream, options);
  recordedChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = saveRecording;
  mediaRecorder.start(1000); // Capture in 1-second chunks

  document.getElementById('start').disabled = true;
  document.getElementById('stop').disabled = false;
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  desktopStream.getTracks().forEach(track => track.stop());
}

function saveRecording() {
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download({
    url: url,
    filename: `recording-${Date.now()}.webm`
  });
}
```

## Best Practices

### 1. Always Handle User Cancellation

```javascript
chrome.desktopCapture.chooseDesktopMedia(sources, (streamId) => {
  if (!streamId) {
    // User cancelled - handle gracefully
    console.log('User cancelled screen selection');
    return;
  }
  // Proceed with capture...
});
```

### 2. Clean Up Resources

```javascript
function stopCapture(stream) {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
}

// Call on page unload
window.addEventListener('beforeunload', () => {
  stopCapture(currentStream);
});
```

### 3. Resolution Constraints

```javascript
navigator.mediaDevices.getUserMedia({
  video: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: streamId,
      minWidth: 1280,
      maxWidth: 1920,
      minHeight: 720,
      maxHeight: 1080,
      minFrameRate: 30,
      maxFrameRate: 60
    }
  }
});
```

### 4. Error Handling

```javascript
async function safeCapture(streamId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId
        }
      }
    });
    return stream;
  } catch (error) {
    switch (error.name) {
      case 'NotAllowedError':
        console.error('Permission denied');
        break;
      case 'NotFoundError':
        console.error('No capture device found');
        break;
      case 'NotReadableError':
        console.error('Device in use by another application');
        break;
      default:
        console.error('Capture error:', error);
    }
    throw error;
  }
}
```

### 5. Platform-Specific Considerations

```javascript
function getAvailableSources() {
  const isMac = navigator.platform.includes('Mac');
  const isWindows = navigator.platform.includes('Win');
  const isLinux = navigator.platform.includes('Linux');

  const sources = ['screen', 'window', 'tab'];

  // Add audio only on supported platforms
  if (isWindows) {
    sources.push('audio');
  }

  return sources;
}
```

## Privacy Considerations

1. **Explicit User Consent**: Users must explicitly select what to share via Chrome's picker
2. **Minimize Recording Time**: Don't record longer than necessary
3. **Clear Indication**: Show visual indicators when recording is active
4. **Secure Storage**: Store recordings securely and offer deletion options
5. **Transparency**: Be clear about what data is captured and how it's used

## Common Issues and Solutions

### Issue: Black Screen on Windows

**Solution**: Ensure you're using the correct constraints:

```javascript
{
  video: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: streamId,
      // Required for some Windows configurations
      googLeakyBucket: true
    }
  }
}
```

### Issue: Tab Audio Not Captured

**Solution**: Use 'tab' as the media source:

```javascript
navigator.mediaDevices.getUserMedia({
  audio: {
    mandatory: {
      chromeMediaSource: 'tab'
    }
  },
  video: {
    mandatory: {
      chromeMediaSource: 'tab'
    }
  }
});
```

### Issue: Permission Denied Error

**Solution**: 
- Extension must have desktopCapture permission
- On macOS, the extension must be packaged and signed
- Check that the extension is enabled in chrome://extensions

## Related APIs

- [Tab Capture API](./tab-capture.md): Capture browser tabs only
- [Page Capture API](./page-capture.md): Save pages as MHTML
- [Downloads API](./downloads.md): Save captured content
- [Notifications API](./notifications.md): Notify user when recording starts/stops

## Conclusion

The Chrome Desktop Capture API provides powerful screen capture capabilities for extensions. By following the patterns and best practices in this guide, you can build robust screen recording, screenshot, and screencasting extensions that provide excellent user experiences while respecting privacy and platform limitations.
