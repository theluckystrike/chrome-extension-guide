# Desktop Capture with chrome.desktopCapture

## Introduction
- `chrome.desktopCapture` enables extensions to capture screen, windows, or tabs as a media stream
- Essential for screenshot tools, screen recorders, video conferencing extensions
- Requires `"desktopCapture"` permission in manifest.json
- Does NOT require `"tabCapture"` or `"tabGroups"` permissions

## manifest.json Configuration
```json
{
  "permissions": ["desktopCapture"],
  "host_permissions": ["<all_urls>"]
}
```
- `host_permissions` needed when streaming to remote servers (WebRTC)
- For local processing only, can omit host_permissions

## Core API Overview

### Source Types
| Source ID | Description |
|-----------|-------------|
| `screen` | Entire screen(s) |
| `window` | Application windows |
| `tab` | Browser tabs |
| `audio` | System/tab audio (Chrome 74+) |

### Key Methods
- `chrome.desktopCapture.chooseDesktopMedia()` - Show picker UI, get stream
- `chrome.desktopCapture.cancelChooseDesktopMedia()` - Cancel picker

## Choosing Desktop Sources

### Using the Built-in Picker

The `chrome.desktopCapture` API does not provide a method to enumerate sources programmatically. Instead, it shows a native picker dialog via `chooseDesktopMedia()`, which lets the user select a screen, window, or tab to share. The method returns a stream ID via callback that you then pass to `getUserMedia()`.

```javascript
function showPickerAndCapture() {
  // chooseDesktopMedia uses a callback, not a promise
  // It returns a request ID (number) that can be used with cancelChooseDesktopMedia
  const requestId = chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window', 'tab'],  // Source types to show in the picker
    async (streamId) => {
      if (!streamId) {
        console.log('User cancelled');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: streamId
          }
        }
      });

      // Use the stream
      console.log('Capture started:', stream);
    }
  );
}
```

### With Audio Capture
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

      console.log('Capture with audio started:', stream);
    }
  );
}
```

## Source Types Deep Dive

### Screen Capture
```javascript
// Use the picker to let the user choose which screen to capture
function captureScreen() {
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen'],
    async (streamId) => {
      if (!streamId) return;

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

### Window Capture
```javascript
// Show only windows in the picker
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

### Tab Capture
```javascript
// Show only tabs in the picker
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

      console.log('Tab capture started:', stream);
    }
  );
}
```

## Canceling Capture

### Cancel the Picker
```javascript
let desktopMediaRequestId;

function requestWithCancel() {
  // chooseDesktopMedia returns the request ID synchronously
  desktopMediaRequestId = chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window'],
    (streamId) => {
      if (streamId) {
        // Use the streamId to get a MediaStream
        console.log('Got stream ID:', streamId);
      }
    }
  );
}

function cancelRequest() {
  if (desktopMediaRequestId) {
    chrome.desktopCapture.cancelChooseDesktopMedia(desktopMediaRequestId);
  }
}

// Bind to keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'cancel-capture') {
    cancelRequest();
  }
});
```

### Handling User Cancellation
```javascript
chrome.desktopCapture.chooseDesktopMedia(
  ['screen', 'window'],
  (streamId) => {
    if (!streamId) {
      console.log('User cancelled or closed picker');
      // Clean up UI, reset state
      return;
    }
    // Proceed with streamId
    startCapture(streamId);
  }
);
```

## Converting to MediaStream

### From streamId to MediaStream
```javascript
async function getMediaStream(streamId) {
  return navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });
}

// Use in a callback from chooseDesktopMedia
function startRecording() {
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen'],
    async (streamId) => {
      if (!streamId) return;

      const stream = await getMediaStream(streamId);
      const videoTrack = stream.getVideoTracks()[0];

      console.log('Track settings:', videoTrack.getSettings());
      console.log('Track constraints:', videoTrack.getConstraints());
    }
  );
}
```

### Working with Video Tracks
```javascript
function processVideoTrack(stream) {
  const videoTrack = stream.getVideoTracks()[0];
  
  // Get track capabilities
  const capabilities = videoTrack.getCapabilities();
  console.log('Width range:', capabilities.width);
  console.log('Height range:', capabilities.height);
  
  // Apply constraints
  videoTrack.applyConstraints({
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  });
  
  // Listen for track end (user stops sharing)
  videoTrack.onended = () => {
    console.log('Capture ended');
  };
  
  return videoTrack;
}
```

### Adding Audio Track
```javascript
function captureWithSystemAudio() {
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'audio'],
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
  
  const audioTrack = stream.getAudioTracks()[0];
  const videoTrack = stream.getVideoTracks()[0];
  
      console.log('Audio label:', audioTrack.label);
      console.log('Video label:', videoTrack.label);
    }
  );
}
```

## Building a Screenshot Extension

### manifest.json
```json
{
  "name": "Quick Screenshot",
  "version": "1.0",
  "permissions": ["desktopCapture", "downloads"],
  "action": {
    "default_icon": "icon.png",
    "default_title": "Take Screenshot"
  }
}
```

### Background Script
```javascript
// Note: Service workers cannot use getUserMedia or DOM APIs directly.
// Use an offscreen document for capture in MV3.
chrome.action.onClicked.addListener((tab) => {
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen'],
    tab,  // Optional: target tab for the picker
    async (streamId) => {
      if (!streamId) return;

      // Send streamId to an offscreen document for processing
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Capture screenshot from desktop'
      });

      chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT',
        streamId: streamId
      });
    }
  );
});
```

## Building a Screen Recorder

### manifest.json
```json
{
  "name": "Screen Recorder",
  "version": "1.0",
  "permissions": ["desktopCapture", "downloads"],
  "background": {
    "service_worker": "background.js"
  }
}
```

### Background Service Worker
```javascript
// Note: Service workers cannot use MediaRecorder or getUserMedia directly.
// Use an offscreen document for recording in MV3.
chrome.action.onClicked.addListener((tab) => {
  chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'audio'],
    tab,
    async (streamId) => {
      if (!streamId) return;

      // Create offscreen document for recording
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Record screen capture'
      });

      chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        streamId: streamId
      });
    }
  );
});
```

### Stop Recording Command
```javascript
// In background.js
chrome.commands.onCommand.addListener((command) => {
  if (command === 'stop-recording' && mediaRecorder) {
    mediaRecorder.stop();
    console.log('Recording stopped');
  }
});
```

## Advanced Techniques

### Picture-in-Picture from Capture
```javascript
function captureToPiP() {
  chrome.desktopCapture.chooseDesktopMedia(['screen'], async (streamId) => {
    if (!streamId) return;
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } }
  });
  
  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  
  await video.play();
  
  // Request PiP
  try {
    await video.requestPictureInPicture();
  } catch (err) {
    console.error('PiP failed:', err);
  }
  
  // Handle PiP closing
    video.onleavepictureinpicture = () => {
      stream.getTracks().forEach(track => track.stop());
    };
  });
}
```

### WebRTC Streaming
```javascript
function startWebRTCStream() {
  chrome.desktopCapture.chooseDesktopMedia(['screen'], async (streamId) => {
    if (!streamId) return;
  
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });
  
  // Create peer connection
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  
  // Add tracks
  stream.getTracks().forEach(track => pc.addTrack(track));
  
  // Create offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  
    // Send offer to signaling server
    // ... signaling logic ...
  });
}
```

## Permissions & Constraints

### Required Permissions Summary
| Feature | Required Permission |
|---------|-------------------|
| Basic capture | `desktopCapture` |
| Stream to web | `host_permissions` |
| Tab audio | Chrome 74+ |

### Platform-Specific Notes
- **Chrome OS**: Full support
- **Linux**: Limited audio support
- **macOS**: Requires user granted screen recording permission in System Preferences
- **Windows**: Works with proper permissions

## Best Practices

### Always Clean Up
```javascript
function cleanupStream(stream) {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('Stopped:', track.kind);
    });
  }
}

// Use try-finally inside the callback
function captureWithCleanup() {
  chrome.desktopCapture.chooseDesktopMedia(['screen'], async (streamId) => {
    if (!streamId) return;

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } }
      });

      // Process stream...

    } finally {
      cleanupStream(stream);
    }
  });
}
```

### Error Handling
```javascript
function safeCapture(callback) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('getUserMedia not supported');
    callback(null);
    return;
  }

  chrome.desktopCapture.chooseDesktopMedia(
    ['screen'],
    async (streamId) => {
      if (!streamId) {
        console.log('User cancelled');
        callback(null);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } }
        });
        callback(stream);
      } catch (error) {
        console.error('Capture error:', error.name, error.message);
        callback(null);
      }
    }
  );
}
```

### UI Integration Tips
- The native picker handles source thumbnails and labels automatically
- Handle permission denied gracefully
- Test with multiple monitors
- Note: `chooseDesktopMedia()` uses a callback pattern, not promises

## Troubleshooting

### Common Issues

**"Permission denied" error**
- Check that `"desktopCapture"` is in permissions
- On macOS, ensure Screen Recording permission in System Preferences
- Verify extension is enabled

**Stream ends immediately**
- User may have stopped sharing via browser UI
- Check `track.onended` handler
- Ensure proper cleanup to prevent zombie processes

**No sources visible**
- Verify at least one screen/window/tab exists
- Check browser has required permissions
- Some extensions may conflict

**Audio not captured**
- Ensure `"audio"` is in types array
- On macOS, may need microphone AND screen recording permissions
- Chrome 74+ required for desktop audio

## Security Considerations

- Always require user interaction to start capture
- Don't store stream IDs longer than necessary
- Clean up resources when done
- Validate stream IDs before use
- Consider privacy implications of screen capture

## Related APIs
- `chrome.tabCapture` - Tab-specific capture API
- `navigator.mediaDevices.getUserMedia` - Core Web API for media capture
- `ImageCapture` - Capture still images from video tracks
- `MediaRecorder` - Record media streams
