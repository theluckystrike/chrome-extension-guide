# Chrome Extension Tab Capture API

## Introduction

The Chrome Tab Capture API (`chrome.tabCapture`) is a powerful Chrome-specific API that enables extensions to capture the visual and audio content of a browser tab as a MediaStream. This API is essential for building screen recording extensions, tab mirroring solutions, and applications that need to capture tab content for processing or streaming.

Unlike the desktop capture API (`chrome.desktopCapture`), which captures the entire screen or specific windows, tab capture is specifically designed to capture tab content. This makes it ideal for:
- Screen recording extensions
- Tab streaming applications
- Collaborative viewing tools
- Content archiving solutions
- Accessibility tools that capture page content

## Manifest Configuration

To use the Tab Capture API, you need to declare the appropriate permissions in your manifest.json file.

### Required Permissions

```json
{
  "name": "Tab Capture Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "tabCapture"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_title": "Capture Tab"
  }
}
```

### Permission Details

- **tabCapture**: Required permission to access the Tab Capture API. This is a Chrome-specific permission and is not available in other browsers.
- **host_permissions**: Depending on your use case, you may need host permissions to access the captured content or to inject scripts that process the stream.
- **activeTab**: Often used alongside tabCapture for extensions that respond to user clicks, providing a more secure permission model.

## Capturing Tab Audio and Video

### The capture() Method

The primary method for capturing tab content is `chrome.tabCapture.capture()`. This method initiates tab capture and returns a MediaStream.

```javascript
// Basic capture syntax
chrome.tabCapture.capture(options, callback);
```

### Capture Options

The options object allows you to configure what to capture:

```javascript
const captureOptions = {
  audio: true,      // Capture tab audio (default: true)
  video: true,      // Capture tab video (default: true)
  audioConstraints: {
    mandatory: {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: streamId
    }
  },
  videoConstraints: {
    mandatory: {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: streamId,
      maxWidth: 1920,
      maxHeight: 1080,
      maxFrameRate: 30
    }
  }
};

chrome.tabCapture.capture(captureOptions, (stream) => {
  if (chrome.runtime.lastError) {
    console.error('Capture failed:', chrome.runtime.lastError.message);
    return;
  }
  console.log('Stream captured successfully:', stream);
});
```

### Complete Capture Example

Here's a complete example showing how to capture a tab when the user clicks the extension action:

```javascript
// background.js
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // First, get the stream ID for the tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
      tabId: tab.id,
      audio: true,
      video: true
    });

    // Capture the tab with the stream ID
    const stream = await chrome.tabCapture.capture({
      audioConstraints: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      },
      videoConstraints: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
          maxWidth: 1920,
          maxHeight: 1080,
          maxFrameRate: 30
        }
      }
    });

    console.log('Capture started:', stream);
    
    // Send stream ID to content script or popup
    chrome.tabs.sendMessage(tab.id, { streamId: streamId });
    
  } catch (error) {
    console.error('Capture error:', error);
  }
});
```

## MediaStream Handling and Processing

### Working with the Captured Stream

Once you have a MediaStream from tab capture, you can process it in various ways:

```javascript
// Process captured stream in content script
function processTabStream(stream) {
  // Create video element to display or process the stream
  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;
  video.controls = true;
  document.body.appendChild(video);

  // Access individual tracks
  const audioTracks = stream.getAudioTracks();
  const videoTracks = stream.getVideoTracks();

  console.log('Audio tracks:', audioTracks.length);
  console.log('Video tracks:', videoTracks.length);

  // Configure video track settings
  if (videoTracks.length > 0) {
    const settings = videoTracks[0].getSettings();
    console.log('Video dimensions:', settings.width, 'x', settings.height);
    console.log('Frame rate:', settings.frameRate);
  }
}
```

### Recording the Stream

To record tab content, you can use the MediaRecorder API:

```javascript
// Record captured stream
function recordTabStream(stream, filename = 'recording.webm') {
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9'
  });

  const chunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    
    // Download the recording
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  // Start recording (collect data every 1 second)
  mediaRecorder.start(1000);

  return mediaRecorder;
}
```

### Audio-Only and Video-Only Capture

You can capture only audio or only video depending on your needs:

```javascript
// Audio-only capture
async function captureAudioOnly(tabId) {
  const stream = await chrome.tabCapture.capture({
    audio: true,
    video: false
  });
  return stream;
}

// Video-only capture (no audio)
async function captureVideoOnly(tabId) {
  const stream = await chrome.tabCapture.capture({
    audio: false,
    video: true
  });
  return stream;
}

// Selective audio sources
async function captureWithOptions(tabId, options) {
  const streamId = await chrome.tabCapture.getMediaStreamId({
    tabId: tabId,
    audio: options.captureAudio !== false,
    video: options.captureVideo !== false
  });

  return await chrome.tabCapture.capture({
    audioConstraints: options.captureAudio ? {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        // Prefer specific audio constraints
        echoCancellation: true,
        noiseSuppression: true
      }
    } : false,
    videoConstraints: options.captureVideo ? {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        maxWidth: options.maxWidth || 1920,
        maxHeight: options.maxHeight || 1080
      }
    } : false
  });
}
```

### Stream Processing with Web Audio API

You can process the audio from a captured tab using the Web Audio API:

```javascript
// Process tab audio with Web Audio API
function processTabAudio(stream) {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  
  // Create audio processing nodes
  const gainNode = audioContext.createGain();
  const analyserNode = audioContext.createAnalyser();
  
  // Connect the audio graph
  source.connect(gainNode);
  gainNode.connect(analyserNode);
  
  // Adjust volume
  gainNode.gain.value = 1.5; // Increase volume by 50%
  
  // Analyze audio data
  analyserNode.fftSize = 256;
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  function analyze() {
    analyserNode.getByteFrequencyData(dataArray);
    // Process frequency data here
    requestAnimationFrame(analyze);
  }
  
  analyze();
  
  return { audioContext, gainNode, analyserNode };
}
```

## Tab Capture Indicators and User Awareness

### Understanding Chrome's Capture Indicator

When a tab is being captured, Chrome automatically displays a red circle indicator in the tab's favicon area. This is a built-in privacy feature that alerts users when their tab content is being captured.

### Detecting Capture State

You can check if a tab is currently being captured:

```javascript
// Check if tab is being captured
async function isTabCaptured(tabId) {
  const captureInfo = await chrome.tabCapture.getCapturedTabs();
  return captureInfo.some(tab => tab.id === tabId);
}

// Get all captured tabs
async function getCapturedTabs() {
  return await chrome.tabCapture.getCapturedTabs();
}

// Example: Monitor capture state
chrome.tabCapture.onStatusChanged.addListener((status) => {
  console.log(`Tab ${status.tabId} capture status: ${status.status}`);
  // Status can be 'started' or 'stopped'
});
```

### Building a Capture Status Indicator

Create a visual indicator in your extension's popup or UI:

```javascript
// popup.js - Update UI based on capture status
async function updateCaptureStatus(tabId) {
  const capturedTabs = await chrome.tabCapture.getCapturedTabs();
  const isCaptured = capturedTabs.some(t => t.id === tabId);
  
  const statusElement = document.getElementById('status');
  if (isCaptured) {
    statusElement.textContent = '● Recording';
    statusElement.classList.add('recording');
  } else {
    statusElement.textContent = '○ Not Recording';
    statusElement.classList.remove('recording');
  }
}
```

### User Consent and Privacy

When building tab capture extensions, you must consider user privacy:

```javascript
// Request user consent before capturing
async function requestCaptureWithConsent(tabId) {
  // Show a confirmation dialog first
  const confirmed = confirm('Do you want to start recording this tab?');
  
  if (!confirmed) {
    return null;
  }
  
  // Proceed with capture
  return await chrome.tabCapture.getMediaStreamId({
    tabId: tabId,
    audio: true,
    video: true
  });
}

// Alternative: Use chrome.contentSettings to manage capture permissions
function checkCapturePermission(url) {
  chrome.contentSettings['mediaStreamCamera'].get(
    { primaryUrl: url },
    (details) => {
      console.log('Capture setting:', details.setting);
    }
  );
}
```

## getMediaStreamId for Offscreen Document Capture

### Introduction to getMediaStreamId

The `chrome.tabCapture.getMediaStreamId()` method generates a stream ID that can be used to capture tab content in contexts where direct stream access isn't possible, such as in offscreen documents or background scripts.

```javascript
// Get stream ID for a specific tab
async function getStreamId(tabId) {
  const streamId = await chrome.tabCapture.getMediaStreamId({
    tabId: tabId,
    audio: true,
    video: true
  });
  
  console.log('Stream ID:', streamId);
  return streamId;
}
```

### Offscreen Document Capture Pattern

In Manifest V3, service workers cannot maintain persistent MediaStream connections. The solution is to use offscreen documents for long-running capture operations:

```javascript
// background.js - Create offscreen document for capture
async function startOffscreenCapture(tabId) {
  // Create an offscreen document
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Recording tab content in background'
  });

  // Send stream ID to offscreen document
  const streamId = await chrome.tabCapture.getMediaStreamId({
    tabId: tabId,
    audio: true,
    video: true
  });

  // Message the offscreen document
  const clients = await chrome.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ 
      type: 'START_CAPTURE', 
      streamId: streamId 
    });
  });
}

// offscreen.js - Handle capture in offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    startCapture(message.streamId);
  }
});

async function startCapture(streamId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    },
    video: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId
      }
    }
  });

  // Process stream in offscreen document
  const recorder = new MediaRecorder(stream);
  
  recorder.ondataavailable = (event) => {
    // Handle recorded data
    saveRecordingData(event.data);
  };

  recorder.start();
}
```

### Multiple Stream IDs

You can generate multiple stream IDs for different purposes:

```javascript
// Generate separate IDs for preview and recording
async function setupDualStream(tabId) {
  // ID for preview (lower quality)
  const previewId = await chrome.tabCapture.getMediaStreamId({
    tabId: tabId,
    audio: true,
    video: true,
    minWidth: 640,
    minHeight: 360,
    maxFrameRate: 15
  });

  // ID for recording (full quality)
  const recordId = await chrome.tabCapture.getMediaStreamId({
    tabId: tabId,
    audio: true,
    video: true
  });

  return { previewId, recordId };
}
```

## Building a Complete Tab Recording Extension

### Project Structure

```
tab-recorder/
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   └── popup.js
├── content/
│   └── content.js
└── offscreen/
    └── offscreen.html
```

### manifest.json

```json
{
  "name": "Tab Recorder",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": [
    "tabCapture",
    "offscreen"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

### background.js - Main Extension Logic

```javascript
// background.js
let mediaRecorder = null;
let recordedChunks = [];
let currentStreamId = null;

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    await startRecording(tab.id);
  }
});

// Start tab recording
async function startRecording(tabId) {
  try {
    // Get stream ID for the tab
    currentStreamId = await chrome.tabCapture.getMediaStreamId({
      tabId: tabId,
      audio: true,
      video: true
    });

    // Create capture stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: currentStreamId
        }
      },
      video: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: currentStreamId
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
      // Create and download the recording
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      
      URL.revokeObjectURL(url);
      
      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    };

    // Start recording
    mediaRecorder.start(1000);
    
    // Update badge to show recording state
    chrome.action.setBadgeText({ text: 'REC' });
    chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
    
    // Notify content script
    chrome.tabs.sendMessage(tabId, { recording: true });

  } catch (error) {
    console.error('Recording error:', error);
  }
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    
    chrome.action.setBadgeText({ text: '' });
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getStatus') {
    sendResponse({ 
      recording: mediaRecorder && mediaRecorder.state === 'recording' 
    });
  }
});
```

### popup/popup.html

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 200px;
      padding: 16px;
      font-family: system-ui, sans-serif;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ccc;
    }
    .indicator.recording {
      background: #ff0000;
      animation: pulse 1s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    button {
      width: 100%;
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    button.start {
      background: #4CAF50;
      color: white;
    }
    button.stop {
      background: #f44336;
      color: white;
    }
  </style>
</head>
<body>
  <div class="status">
    <div class="indicator" id="indicator"></div>
    <span id="statusText">Ready to record</span>
  </div>
  <button id="recordBtn" class="start">Start Recording</button>
  <script src="popup.js"></script>
</body>
</html>
```

### popup/popup.js

```javascript
// popup/popup.js
const indicator = document.getElementById('indicator');
const statusText = document.getElementById('statusText');
const recordBtn = document.getElementById('recordBtn');

// Check current recording status
async function checkStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response && response.recording) {
      indicator.classList.add('recording');
      statusText.textContent = 'Recording...';
      recordBtn.textContent = 'Stop Recording';
      recordBtn.classList.remove('start');
      recordBtn.classList.add('stop');
    }
  });
}

// Toggle recording on button click
recordBtn.addEventListener('click', async () => {
  // The background script handles the actual recording
  // This just triggers the action click
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.action.setPopup({ tabId: tab.id, popup: '' }); // Remove popup temporarily
  chrome.action.performAction(tab.id, 'click'); // Trigger background handler
  window.close();
});

checkStatus();
```

## Best Practices and Troubleshooting

### Performance Optimization

```javascript
// Optimize capture performance
async function optimizedCapture(tabId) {
  const streamId = await chrome.tabCapture.getMediaStreamId({
    tabId: tabId,
    audio: true,
    video: true,
    // Request lower resolution for better performance
    minWidth: 1280,
    minHeight: 720,
    maxFrameRate: 30
  });

  return await chrome.tabCapture.capture({
    audioConstraints: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        // Reduce audio quality for performance
        sampleRate: 44100,
        channels: 1
      }
    },
    videoConstraints: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
        maxWidth: 1280,
        maxHeight: 720,
        maxFrameRate: 30
      }
    }
  });
}
```

### Common Errors and Solutions

```javascript
// Error handling patterns
async function safeCapture(tabId) {
  try {
    // Check if tab is capturable
    const captureInfo = await chrome.tabCapture.getCapturedTabs();
    const tabInfo = captureInfo.find(t => t.id === tabId);
    
    if (tabInfo && tabInfo.status === 'pending') {
      throw new Error('Tab capture is pending. Please wait.');
    }

    const streamId = await chrome.tabCapture.getMediaStreamId({
      tabId: tabId
    });

    if (!streamId) {
      throw new Error('Failed to generate stream ID');
    }

    return await chrome.tabCapture.capture({
      videoConstraints: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });

  } catch (error) {
    if (error.message.includes('Permission denied')) {
      console.error('User denied capture permission');
    } else if (error.message.includes('Tab not found')) {
      console.error('Tab no longer exists');
    } else {
      console.error('Capture error:', error);
    }
    throw error;
  }
}
```

### Security Considerations

```javascript
// Secure capture implementation
function secureCaptureHandler(tabId, requestedSources) {
  // Validate tab exists
  // Note: Additional validation logic here
  
  // Only capture with explicit user action
  return chrome.tabCapture.getMediaStreamId({
    tabId: tabId,
    audio: requestedSources.includes('audio'),
    video: requestedSources.includes('video')
  });
}
```

## Conclusion

The Chrome Tab Capture API provides powerful capabilities for capturing tab content with both audio and video. Key takeaways:

1. **Permissions**: Requires `tabCapture` permission in manifest.json
2. **Capture Methods**: Use `capture()` for direct streaming or `getMediaStreamId()` for ID-based capture
3. **Media Processing**: Work with standard MediaStream APIs for processing and recording
4. **User Awareness**: Chrome automatically shows capture indicators; always inform users when recording
5. **Offscreen Documents**: Use offscreen documents for persistent capture in Manifest V3
6. **Best Practices**: Implement proper error handling, optimize for performance, and respect user privacy

For more information, refer to the official Chrome Extensions documentation and the chrome.tabCapture API reference.
