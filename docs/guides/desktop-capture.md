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

### Basic Usage
```javascript
async function captureScreen() {
  const sources = await chrome.desktopCapture.getDesktopSources({
    types: ['screen'],
    thumbnailSize: { width: 320, height: 180 }
  });
  
  // Select first screen
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sources[0].id
      }
    }
  });
  
  return stream;
}
```

### Using the Built-in Picker
```javascript
async function showPickerAndCapture() {
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window', 'tab'],  // Types to show
    (id) => id  // Optional: custom frame for picker thumbnail
  );
  
  if (!streamId) {
    console.log('User cancelled');
    return null;
  }
  
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });
  
  return stream;
}
```

### With Audio Capture
```javascript
async function captureWithAudio() {
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window', 'tab', 'audio']
  );
  
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
  
  return stream;
}
```

## Source Types Deep Dive

### Screen Capture
```javascript
async function captureEntireScreen() {
  const sources = await chrome.desktopCapture.getDesktopSources({
    types: ['screen'],
    thumbnailSize: { width: 320, height: 180 }
  });
  
  // Filter for primary display (usually first)
  const primaryScreen = sources[0];
  
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: primaryScreen.id,
        // Optional: constrain resolution
        minWidth: 1280,
        maxWidth: 1920,
        minHeight: 720,
        maxHeight: 1080
      }
    }
  });
  
  return stream;
}
```

### Window Capture
```javascript
async function captureWindow() {
  const sources = await chrome.desktopCapture.getDesktopSources({
    types: ['window'],
    thumbnailSize: { width: 320, height: 180 }
  });
  
  // Present UI to let user select window
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(
    ['window'],
    undefined,
    sources.map(s => ({
      id: s.id,
      name: s.name,
      thumbnail: s.thumbnail.toDataURL()
    }))
  );
  
  if (streamId) {
    return navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId
        }
      }
    });
  }
}
```

### Tab Capture
```javascript
async function captureTab(tabId) {
  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: tabId
      }
    }
  };
  
  return navigator.mediaDevices.getUserMedia(constraints);
}

// Alternative: Let user pick
async function pickAndCaptureTab() {
  const sources = await chrome.desktopCapture.getDesktopSources({
    types: ['tab'],
    thumbnailSize: { width: 320, height: 180 }
  });
  
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(['tab']);
  
  if (streamId) {
    return navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });
  }
}
```

## Canceling Capture

### Cancel the Picker
```javascript
let desktopMediaRequestId;

async function requestWithCancel() {
  desktopMediaRequestId = chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window'],
    (id) => desktopMediaRequestId = id
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

// Use in async context
async function startRecording() {
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(['screen']);
  
  if (!streamId) return;
  
  const stream = await getMediaStream(streamId);
  const videoTrack = stream.getVideoTracks()[0];
  
  // Work with track
  console.log('Track settings:', videoTrack.getSettings());
  console.log('Track constraints:', videoTrack.getConstraints());
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
async function captureWithSystemAudio() {
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'audio']
  );
  
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
  
  return stream;
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
chrome.action.onClicked.addListener(async () => {
  try {
    // Request screen capture
    const streamId = await chrome.desktopCapture.chooseDesktopMedia(['screen']);
    
    if (!streamId) return;
    
    // Get stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } }
    });
    
    // Capture frame
    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const bitmap = await imageCapture.takePhoto();
    
    // Stop track
    track.stop();
    
    // Convert to blob
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    ctx.drawImage(bitmap, 0, 0);
    
    canvas.toBlob(async (blob) => {
      // Download
      await chrome.downloads.download({
        url: URL.createObjectURL(blob),
        filename: `screenshot-${Date.now()}.png`
      });
    }, 'image/png');
    
  } catch (err) {
    console.error('Screenshot failed:', err);
  }
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
let mediaRecorder;
let recordedChunks = [];

chrome.action.onClicked.addListener(async () => {
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(['screen', 'audio']);
  
  if (!streamId) return;
  
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId }
    },
    video: {
      mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId }
    }
  });
  
  // Set up MediaRecorder
  recordedChunks = [];
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9'
  });
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  
  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    
    await chrome.downloads.download({
      url: url,
      filename: `recording-${Date.now()}.webm`
    });
    
    // Clean up tracks
    stream.getTracks().forEach(track => track.stop());
  };
  
  mediaRecorder.start(1000); // Record in 1-second chunks
  console.log('Recording started...');
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
async function captureToPiP() {
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(['screen']);
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
}
```

### WebRTC Streaming
```javascript
async function startWebRTCStream() {
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(['screen']);
  
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
  
  return pc;
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

// Use try-finally
async function captureWithCleanup() {
  let stream = null;
  try {
    const streamId = await chrome.desktopCapture.chooseDesktopMedia(['screen']);
    if (!streamId) return;
    
    stream = await navigator.mediaDevices.getUserMedia({
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } }
    });
    
    // Process stream...
    
  } finally {
    cleanupStream(stream);
  }
}
```

### Error Handling
```javascript
async function safeCapture() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }
    
    const streamId = await chrome.desktopCapture.chooseDesktopMedia(['screen']);
    
    if (!streamId) {
      console.log('User cancelled');
      return null;
    }
    
    return await navigator.mediaDevices.getUserMedia({
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } }
    });
    
  } catch (error) {
    console.error('Capture error:', error.name, error.message);
    return null;
  }
}
```

### UI Integration Tips
- Show meaningful thumbnails using `thumbnailSize` option
- Provide clear labels for source selection
- Handle permission denied gracefully
- Test with multiple monitors

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
- `chrome.tabCapture` - Legacy tab capture (deprecated for new use cases)
- `navigator.mediaDevices.getUserMedia` - Core Web API for media capture
- `ImageCapture` - Capture still images from video tracks
- `MediaRecorder` - Record media streams
