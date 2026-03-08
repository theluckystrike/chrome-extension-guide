---
layout: default
title: "Chrome Extension Tab Capture — Developer Guide"
description: "Learn Chrome extension tab capture with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/tab-capture/"
---
# Chrome Extension Tab Capture API

The Chrome Extension Tab Capture API is a powerful feature that allows extensions to capture the visual and audio content of browser tabs. This API opens up a wide range of possibilities, from building screen recording extensions to creating collaborative whiteboarding tools. In this comprehensive guide, we'll explore every aspect of the Tab Capture API, from basic usage to advanced implementation patterns.

## Overview and Permissions {#overview-and-permissions}

The `chrome.tabCapture` API provides the ability to capture the content of a tab as a media stream. Before using this API, you need to declare the appropriate permissions in your extension's manifest file.

### Manifest Permissions {#manifest-permissions}

To use the Tab Capture API, you must add the `"tabCapture"` permission to your manifest:

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
  ]
}
```

It's important to note that the `"tabCapture"` permission alone doesn't automatically grant access to all tabs. The user must initiate the capture through a user gesture, such as clicking a button in your extension's popup or background script.

### Understanding Capture Constraints {#understanding-capture-constraints}

The Tab Capture API works in conjunction with the Chrome desktopCapture API. When capturing a tab, you can specify various constraints to control what gets captured:

```javascript
const constraints = {
  audio: true,
  video: {
    mandatory: {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: streamId
    }
  }
};
```

## Capturing Tab Audio and Video {#capturing-tab-audio-and-video}

The primary method for capturing a tab is `chrome.tabCapture.capture()`. This method initiates the capture and returns a MediaStream object that you can use in various ways.

### Basic Capture Implementation {#basic-capture-implementation}

Here's a fundamental example of how to capture a tab:

```javascript
async function captureTab(tabId) {
  try {
    const stream = await chrome.tabCapture.capture({
      audio: true,
      video: true
    });
    
    console.log('Capture started successfully');
    return stream;
  } catch (error) {
    console.error('Capture failed:', error);
    throw error;
  }
}
```

### Capture Options {#capture-options}

The `capture()` method accepts an options object with the following properties:

- **audio**: Boolean or AudioConstraints - Whether to capture audio from the tab
- **video**: Boolean or VideoConstraints - Whether to capture video from the tab
- **audioConstraints**: MediaStreamConstraints - Specific constraints for audio capture
- **videoConstraints**: MediaStreamConstraints - Specific constraints for video capture

```javascript
const captureOptions = {
  audio: {
    mandatory: {
      chromeMediaSource: 'tab',
      echoCancellation: true,
      noiseSuppression: true
    }
  },
  video: {
    mandatory: {
      chromeMediaSource: 'tab',
      maxWidth: 1920,
      maxHeight: 1080,
      maxFrameRate: 30
    }
  }
};

const stream = await chrome.tabCapture.capture(captureOptions);
```

## MediaStream Handling and Processing {#mediastream-handling-and-processing}

Once you have a MediaStream from tab capture, you can process it in various ways. The stream behaves like any standard MediaStream, allowing you to work with its tracks using the MediaStream API.

### Accessing Audio and Video Tracks {#accessing-audio-and-video-tracks}

```javascript
function processStream(stream) {
  const audioTracks = stream.getAudioTracks();
  const videoTracks = stream.getVideoTracks();
  
  audioTracks.forEach(track => {
    console.log('Audio track:', track.label);
    // Configure audio processing
    track.enabled = true;
  });
  
  videoTracks.forEach(track => {
    console.log('Video track:', track.label);
    // Configure video processing
    track.enabled = true;
  });
  
  return { audioTracks, videoTracks };
}
```

### Creating Processed Streams {#creating-processed-streams}

You can use MediaStreamTrackProcessor and MediaStreamTrackGenerator (available in modern browsers) to process and transform captured media:

```javascript
async function createProcessedStream(sourceStream) {
  const videoTrack = sourceStream.getVideoTracks()[0];
  const audioTrack = sourceStream.getAudioTracks()[0];
  
  // Create a track processor for video
  const videoProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
  const videoGenerator = new MediaStreamTrackGenerator({ kind: 'video' });
  
  // Transform the video (example: add a filter)
  const transformer = new TransformStream({
    transform(videoFrame, controller) {
      // Apply processing to the frame
      controller.enqueue(videoFrame);
    }
  });
  
  videoProcessor.readable.pipeThrough(transformer).pipeTo(videoGenerator.writable);
  
  // Create new stream with processed tracks
  return new MediaStream([videoGenerator, audioTrack]);
}
```

### Recording Captured Content {#recording-captured-content}

One of the most common use cases for Tab Capture is recording the tab's content. Here's how to implement a basic recorder:

```javascript
class TabRecorder {
  constructor(stream) {
    this.stream = stream;
    this.mediaRecorder = null;
    this.chunks = [];
  }
  
  startRecording() {
    this.chunks = [];
    
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    
    this.mediaRecorder.start(1000); // Collect data every second
    console.log('Recording started');
  }
  
  stopRecording() {
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      this.mediaRecorder.stop();
      console.log('Recording stopped');
    });
  }
  
  downloadRecording(filename = 'recording.webm') {
    return this.stopRecording().then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
```

## Tab Capture Indicators and User Awareness {#tab-capture-indicators-and-user-awareness}

When a tab is being captured, Chrome displays a visual indicator to inform the user. This is an important UX consideration that you should be aware of when building capture extensions.

### Understanding the Recording Indicator {#understanding-the-recording-indicator}

Chrome automatically shows a red recording indicator in the browser's address bar when a tab is being captured. This indicator:
- Appears as a small red circle or dot next to the favicon
- Persists for the duration of the capture
- Cannot be hidden or disabled by the extension

This is a security feature to ensure transparency with users about when their tab content is being recorded.

### Detecting Capture State {#detecting-capture-state}

You can check if a tab is currently being captured using `chrome.tabCapture.getCapturedTabs()`:

```javascript
async function getCapturedTabInfo() {
  const tabs = await chrome.tabCapture.getCapturedTabs();
  
  tabs.forEach(tab => {
    console.log(`Tab ${tab.id}: ${tab.status}`);
  });
  
  return tabs;
}
```

The returned objects contain:
- **tabId**: The ID of the tab
- **status**: Either "connected" or "disconnected"
- **fullscreen**: Whether the tab is in fullscreen mode

### Handling Fullscreen Changes {#handling-fullscreen-changes}

When a user enters fullscreen mode during capture, you need to handle it properly:

```javascript
stream.getVideoTracks()[0].onended = () => {
  console.log('Capture ended - possibly due to fullscreen change');
  // Handle the ended event appropriately
};
```

## getMediaStreamId for Offscreen Document Capture {#getmediastreamid-for-offscreen-document-capture}

In Manifest V3, service workers have limited lifetime, making continuous capture challenging. The `chrome.tabCapture.getMediaStreamId()` method provides a solution by generating a stream ID that can be used in various contexts, including offscreen documents.

### Generating a Stream ID {#generating-a-stream-id}

```javascript
async function getStreamId(tabId) {
  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tabId
  });
  
  console.log('Stream ID:', streamId);
  return streamId;
}
```

The `getMediaStreamId()` method accepts options:
- **targetTabId**: The ID of the tab to capture (optional, defaults to active tab)

### Using Stream ID in Offscreen Documents {#using-stream-id-in-offscreen-documents}

Offscreen documents in Manifest V3 provide a way to handle long-running tasks that don't fit in the service worker lifecycle. Here's how to use Tab Capture with offscreen documents:

First, create an offscreen document:

```javascript
async function createOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  
  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_INTERACTION'],
      justification: 'Recording tab capture for later download'
    });
  }
}
```

Then use the stream ID in your offscreen document:

```javascript
// In offscreen.html/offscreen.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startCapture') {
    const streamId = message.streamId;
    
    navigator.mediaDevices.getUserMedia({
      video: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    }).then(stream => {
      // Process the stream
      sendResponse({ success: true });
    });
    
    return true; // Keep channel open for async response
  }
});
```

## Building a Tab Recording Extension {#building-a-tab-recording-extension}

Now let's put everything together to build a complete tab recording extension. This example demonstrates best practices and real-world implementation patterns.

### Popup Implementation {#popup-implementation}

```javascript
// popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  document.getElementById('startBtn').addEventListener('click', async () => {
    // Request capture
    const stream = await chrome.tabCapture.capture({
      audio: true,
      video: true
    });
    
    if (stream) {
      // Store stream reference for later use
      chrome.storage.local.set({ 
        captureStream: true,
        tabId: tab.id 
      });
      
      // Notify background script
      chrome.runtime.sendMessage({
        action: 'captureStarted',
        tabId: tab.id
      });
      
      updateUI('recording');
    }
  });
  
  document.getElementById('stopBtn').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopCapture' });
    updateUI('stopped');
  });
});

function updateUI(state) {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  
  if (state === 'recording') {
    startBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}
```

### Background Script Handler {#background-script-handler}

```javascript
// background.js
let currentRecorder = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureStarted') {
    handleCaptureStart(message.tabId);
  } else if (message.action === 'stopCapture') {
    handleCaptureStop();
  }
});

async function handleCaptureStart(tabId) {
  const stream = await chrome.tabCapture.capture({
    audio: true,
    video: true
  });
  
  currentRecorder = new TabRecorder(stream);
  currentRecorder.startRecording();
  
  // Store recorder reference
  chrome.storage.local.set({ 
    recorderActive: true 
  });
}

async function handleCaptureStop() {
  if (currentRecorder) {
    await currentRecorder.downloadRecording(`tab-recording-${Date.now()}.webm`);
    currentRecorder = null;
    
    chrome.storage.local.set({ 
      recorderActive: false 
    });
  }
}
```

## Advanced Patterns and Best Practices {#advanced-patterns-and-best-practices}

### Error Handling {#error-handling}

Always implement robust error handling for capture operations:

```javascript
async function safeCapture(tabId) {
  try {
    // Check if tab exists
    const tab = await chrome.tabs.get(tabId);
    if (!tab.id) {
      throw new Error('Tab not found');
    }
    
    // Attempt capture
    const stream = await chrome.tabCapture.capture({
      audio: true,
      video: true
    });
    
    if (!stream) {
      throw new Error('Capture returned no stream');
    }
    
    // Handle stream errors
    stream.getTracks().forEach(track => {
      track.onended = () => {
        console.log('Track ended:', track.kind);
        handleTrackEnd(track);
      };
      
      track.onmute = () => {
        console.log('Track muted:', track.kind);
      };
      
      track.onunmute = () => {
        console.log('Track unmuted:', track.kind);
      };
    });
    
    return stream;
    
  } catch (error) {
    console.error('Capture error:', error);
    throw error;
  }
}

function handleTrackEnd(track) {
  // Clean up resources
  if (track.kind === 'video') {
    // Handle video track end
  } else if (track.kind === 'audio') {
    // Handle audio track end
  }
}
```

### Performance Optimization {#performance-optimization}

For optimal performance when capturing tabs:

```javascript
function optimizeCaptureSettings() {
  return {
    video: {
      mandatory: {
        // Request only what's needed
        minWidth: 1280,
        minHeight: 720,
        maxFrameRate: 30, // Reduce for better performance
        // Use efficient codec
        chromeMediaSource: 'tab'
      }
    },
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        // Disable echo cancellation if not needed
        echoCancellation: false,
        // Disable noise suppression for better CPU usage
        noiseSuppression: false
      }
    }
  };
}
```

### Security Considerations {#security-considerations}

When implementing tab capture, keep these security best practices in mind:

1. **Always require user gesture** - Never start capture without explicit user action
2. **Validate tab ID** - Ensure the tab ID is valid before attempting capture
3. **Clean up resources** - Always stop tracks and release resources when done
4. **Handle permissions gracefully** - Check if the user has granted necessary permissions
5. **Secure the stream** - Don't share stream IDs across untrusted contexts

```javascript
async function secureCapture(tabId) {
  // Validate tab exists and is accessible
  try {
    await chrome.tabs.get(tabId);
  } catch (error) {
    throw new Error('Cannot capture this tab');
  }
  
  // Request capture with user gesture context
  return chrome.tabCapture.capture({
    audio: true,
    video: true
  });
}
```

## Conclusion {#conclusion}

The Chrome Extension Tab Capture API is an incredibly powerful tool that enables a wide range of creative use cases. From building screen recording tools to creating collaborative applications, this API provides the foundation for rich media experiences within Chrome extensions.

Key takeaways from this guide:
- The API requires the `"tabCapture"` permission in your manifest
- Always capture in response to user gestures for better UX
- Use `getMediaStreamId()` for Manifest V3 compatibility with offscreen documents
- Implement proper error handling and resource cleanup
- Respect the recording indicator that Chrome displays to users
- Follow security best practices when handling captured media

With these patterns and best practices, you're well-equipped to build robust tab capture extensions that provide excellent user experiences while respecting browser security and performance considerations.

## Related Articles {#related-articles}

## Related Articles

- [Desktop Capture Patterns](../patterns/desktop-capture.md)
- [Desktop Capture](../guides/desktop-capture.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
