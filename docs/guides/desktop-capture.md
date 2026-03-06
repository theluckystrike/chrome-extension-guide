# Chrome Extension Desktop Capture API

## Introduction

The Chrome Desktop Capture API (`chrome.desktopCapture`) is a powerful Chrome-specific API that enables extensions to capture screen content, windows, tabs, and audio from the user's desktop. This API is essential for building screen recording extensions, screenshot tools, screen sharing applications, and collaborative tools that need to capture visual content from the user's screen.

Unlike the Tab Capture API (`chrome.tabCapture`) which is specifically designed to capture browser tab content, desktop capture provides access to the entire screen, individual application windows, and can also capture system audio. This makes it ideal for:
- Screen recording and screencasting applications
- Screenshot utilities and annotation tools
- Screen sharing and conferencing integrations
- Remote desktop and support applications
- Game streaming and broadcasting tools
- Document scanning using camera capture

## Manifest Configuration

To use the Desktop Capture API, you need to declare the appropriate permissions in your manifest.json file.

### Required Permissions

```json
{
  "name": "Desktop Capture Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "desktopCapture"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_title": "Capture Screen"
  }
}
```

### Permission Details

- **desktopCapture**: Required permission to access the Desktop Capture API. This is a Chrome-specific permission and is not available in Firefox or Safari without additional polyfills or different APIs.
- **host_permissions**: Depending on your use case, you may need host permissions to display captured content in web pages or to process the captured stream.
- **activeTab**: Often used alongside desktopCapture for extensions that respond to user clicks, providing a more secure permission model.

### Manifest Version Considerations

The Desktop Capture API works in both Manifest V2 and Manifest V3 extensions, but the implementation patterns differ slightly:

**Manifest V2:**
```json
{
  "permissions": [
    "desktopCapture"
  ],
  "background": {
    "scripts": ["background.js"]
  }
}
```

**Manifest V3:**
```json
{
  "permissions": [
    "desktopCapture"
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

## Choosing Capture Sources

### The chooseDesktopMedia() Method

The primary method for initiating desktop capture is `chrome.desktopCapture.chooseDesktopMedia()`. This method displays the Chrome's built-in picker UI that allows users to select what they want to share.

```javascript
// Basic syntax
chrome.desktopCapture.chooseDesktopMedia(sources, callback);
```

### Source Types

The `sources` parameter is an array that specifies which types of capture sources to show the user:

```javascript
const sourceTypes = [
  'screen',      // Entire screen
  'window',      // Application windows
  'tab',         // Browser tabs
  'audio'        // System audio (Chrome 107+)
];

chrome.desktopCapture.chooseDesktopMedia(sourceTypes, (streamId) => {
  if (chrome.runtime.lastError) {
    console.error('Error:', chrome.runtime.lastError.message);
    return;
  }
  console.log('Stream ID:', streamId);
});
```

### Complete Source Selection Example

Here's a comprehensive example showing how to let users choose what to capture:

```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Request screen capture with all source types
    const streamId = await chrome.desktopCapture.chooseDesktopMedia([
      'screen',
      'window',
      'tab',
      'audio'
    ], (streamId) => {
      // This callback is required but we use the promise above instead
    });

    if (!streamId) {
      console.log('User cancelled the picker');
      return;
    }

    console.log('User selected stream ID:', streamId);

    // Send the stream ID to the content script for processing
    chrome.tabs.sendMessage(tab.id, { streamId: streamId });

  } catch (error) {
    console.error('Capture error:', error);
  }
});
```

### Async/Await Pattern

In modern extension code, you can wrap the API in a promise for cleaner async/await syntax:

```javascript
function chooseDesktopMedia(sources) {
  return new Promise((resolve, reject) => {
    chrome.desktopCapture.chooseDesktopMedia(sources, (streamId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(streamId);
      }
    });
  });
}

// Usage
async function startCapture() {
  const streamId = await chooseDesktopMedia(['screen', 'window']);
  if (streamId) {
    // Process the stream
  }
}
```

## Converting to MediaStream

### Using getUserMedia()

Once you have a stream ID from `chooseDesktopMedia()`, you need to use the standard WebRTC `getUserMedia()` API to convert it into a usable MediaStream:

```javascript
// Convert stream ID to MediaStream
async function getDisplayStream(streamId) {
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
        chromeMediaSourceId: streamId,
        // Optional: specify max dimensions
        maxWidth: 1920,
        maxHeight: 1080,
        maxFrameRate: 30
      }
    }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('getUserMedia error:', error);
    throw error;
  }
}
```

### Complete Capture Example

Here's a complete example showing the entire capture flow:

```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Step 1: Show the picker and get stream ID
    const streamId = await new Promise((resolve) => {
      chrome.desktopCapture.chooseDesktopMedia(
        ['screen', 'window', 'tab', 'audio'],
        resolve
      );
    });

    if (!streamId) {
      console.log('User cancelled');
      return;
    }

    // Step 2: Convert stream ID to MediaStream
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

    // Step 3: Send to content script for display/recording
    chrome.tabs.sendMessage(tab.id, { 
      type: 'stream-ready',
      stream: stream
    });

  } catch (error) {
    console.error('Capture failed:', error);
  }
});
```

## Source Types Deep Dive

### Screen Capture

Capturing the entire screen is useful for full-screen recordings:

```javascript
// Only show screen sources
const streamId = await chrome.desktopCapture.chooseDesktopMedia(['screen']);
```

**Use cases:**
- Full-screen application recordings
- Creating tutorials
- Gaming streams
- System demonstrations

### Window Capture

Capturing specific windows allows for more focused content:

```javascript
// Only show window sources
const streamId = await chrome.desktopCapture.chooseDesktopMedia(['window']);
```

**Use cases:**
- Recording specific applications
- Creating focused demos
- Capturing particular documents
- Privacy-focused recording (avoiding sensitive screen areas)

### Tab Capture

Capturing browser tabs provides a more efficient way to record web content:

```javascript
// Only show tab sources
const streamId = await chrome.desktopCapture.chooseDesktopMedia(['tab']);
```

**Benefits over screen capture:**
- Better performance (direct tab rendering vs. screen capture)
- Higher quality (no screen compression artifacts)
- Lower resource usage
- Cleaner audio (only tab audio, not system audio)

### Audio Capture

Chrome 107+ supports capturing system audio alongside video:

```javascript
// Request audio + video
const streamId = await chrome.desktopCapture.chooseDesktopMedia([
  'screen',
  'audio'  // Must be included with a video source
]);

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
```

**Note:** Audio capture may require the `audioCapture' priorityHint` for proper system audio handling in some cases.

## Canceling Capture

### The cancelChooseDesktopMedia() Method

To programmatically cancel an ongoing capture request, use `chrome.desktopCapture.cancelChooseDesktopMedia()`:

```javascript
// Store the desktop media request ID (returned by chooseDesktopMedia)
let currentRequestId = null;

chrome.action.onClicked.addListener(async (tab) => {
  currentRequestId = chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window'],
    (streamId) => {
      // Handle result
    }
  );
});

// Cancel button in popup
function cancelCapture() {
  if (currentRequestId) {
    chrome.desktopCapture.cancelChooseDesktopMedia(currentRequestId);
    currentRequestId = null;
    console.log('Capture cancelled');
  }
}
```

## Building a Screenshot Extension

Here's a practical example of building a screenshot extension using the Desktop Capture API:

### Manifest (manifest.json)

```json
{
  "name": "Screen Capture",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["desktopCapture"],
  "action": {
    "default_title": "Take Screenshot"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

### Background Script (background.js)

```javascript
chrome.action.onClicked.addListener(async (tab) => {
  // Request screen/window capture
  const streamId = await new Promise((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window'],
      resolve
    );
  });

  if (!streamId) return;

  // Get the stream
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

  // Capture frame
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  // Stop all tracks
  stream.getTracks().forEach(track => track.stop());

  // Convert to blob and download
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({
      url: url,
      filename: `screenshot-${Date.now()}.png`
    });
  });
});
```

## Building a Screen Recording Extension

Here's an example of building a screen recording extension:

```javascript
// background.js
let mediaRecorder = null;
let recordedChunks = [];

chrome.action.onClicked.addListener(async (tab) => {
  const streamId = await new Promise((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab', 'audio'],
      resolve
    );
  });

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

  // Create MediaRecorder
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9'
  });

  recordedChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    
    // Download the recording
    chrome.downloads.download({
      url: url,
      filename: `recording-${Date.now()}.webm`
    });

    // Stop all tracks
    stream.getTracks().forEach(track => track.stop());
  };

  // Start recording
  mediaRecorder.start();

  // Notify user that recording started
  chrome.tabs.sendMessage(tab.id, { type: 'recording-started' });

  // Auto-stop after 5 minutes (optional)
  setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      chrome.tabs.sendMessage(tab.id, { type: 'recording-stopped' });
    }
  }, 5 * 60 * 1000);
});
```

## Communicating with Content Scripts

### Sending Stream ID to Content Script

The captured stream ID should be passed to content scripts for processing:

```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  const streamId = await new Promise((resolve) => {
    chrome.desktopCapture.chooseDesktopMedia(['screen'], resolve);
  });

  if (streamId) {
    chrome.tabs.sendMessage(tab.id, { streamId });
  }
});
```

### Processing in Content Script

```javascript
// content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.streamId) {
    startStream(message.streamId);
  }
});

async function startStream(streamId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId
      }
    }
  });

  // Display the stream
  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999';
  document.body.appendChild(video);

  // Store reference for cleanup
  window.currentStream = stream;
}
```

## Best Practices

### User Experience

1. **Always show the picker**: Don't try to capture without user consent. The `chooseDesktopMedia()` method inherently requires user interaction.
2. **Provide clear feedback**: Let users know when recording/capture is active.
3. **Implement stop controls**: Make it easy for users to stop capture at any time.
4. **Handle cancellation gracefully**: Don't show errors when users simply close the picker.

### Performance

1. **Specify constraints**: Set reasonable maxWidth, maxHeight, and maxFrameRate to reduce processing load.
2. **Stop tracks when done**: Always call `stream.getTracks().forEach(t => t.stop())` to release resources.
3. **Use tab capture when possible**: Tab capture is more efficient than screen capture for browser content.

### Security

1. **Validate stream IDs**: Don't store stream IDs long-term; they expire.
2. **Use HTTPS**: The Desktop Capture API requires secure contexts.
3. **Limit host permissions**: Only request host permissions you actually need.
4. **Process locally**: Avoid sending captured content to third-party servers when possible.

### Cross-Browser Considerations

The Desktop Capture API is Chrome-specific. For Firefox, use `navigator.mediaDevices.getDisplayMedia()`. For Safari, the API support is limited and may require polyfills.

```javascript
// Fallback for browsers without desktopCapture
async function getDisplayStream() {
  if (chrome.desktopCapture) {
    // Use Chrome API
    const streamId = await chrome.desktopCapture.chooseDesktopMedia(['screen']);
    return navigator.mediaDevices.getUserMedia({
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: streamId } }
    });
  } else if (navigator.mediaDevices.getDisplayMedia) {
    // Use standard API (Firefox, Safari)
    return navigator.mediaDevices.getDisplayMedia({ video: true });
  } else {
    throw new Error('Screen capture not supported');
  }
}
```

## Troubleshooting

### Common Issues

1. **Picker doesn't appear**: Ensure the API is called from a user-triggered event (like a button click).

2. **Stream is null**: Check that the user didn't cancel the picker - when cancelled, the streamId is null.

3. **Permission denied**: Verify the desktopCapture permission is in the manifest.

4. **Audio not captured**: Ensure 'audio' is included in the sources array and that the system supports audio capture.

5. **Stream expires**: Stream IDs have a limited lifetime. Process them immediately after receiving.

### Debugging Tips

```javascript
// Add error handling
chrome.desktopCapture.chooseDesktopMedia(sources, (streamId) => {
  if (chrome.runtime.lastError) {
    console.error('Desktop capture error:', chrome.runtime.lastError.message);
    return;
  }
  console.log('Stream ID received:', streamId);
});
```

## Conclusion

The Chrome Desktop Capture API provides powerful capabilities for capturing screen content, windows, tabs, and audio. By following the patterns and best practices outlined in this guide, you can build robust screen recording, screenshot, and screen sharing extensions that provide excellent user experiences while maintaining security and performance.

Remember to always test your extension thoroughly with different source types and configurations, and consider providing fallback support for browsers that don't fully support the Desktop Capture API.
