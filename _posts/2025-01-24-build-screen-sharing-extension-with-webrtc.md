---
layout: post
title: "Build Screen Sharing Extension with WebRTC: Complete Guide"
description: "Learn how to build a powerful screen sharing Chrome extension using WebRTC. This comprehensive guide covers desktop capture API, stream handling, permissions, and real-world implementation patterns for 2025."
date: 2025-01-24
categories: [Chrome-Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "screen sharing chrome extension, webrtc screen capture, share screen extension"
canonical_url: "https://bestchromeextensions.com/2025/01/24/build-screen-sharing-extension-with-webrtc/"
---

Build Screen Sharing Extension with WebRTC: Complete Guide

Screen sharing has become an essential feature for remote collaboration, online education, technical support, and countless other use cases. Whether you are building a video conferencing tool, a remote desktop application, or a productivity enhancer that lets users share their work, implementing screen sharing in a Chrome extension requires understanding WebRTC and the Chrome desktop capture APIs.

This comprehensive guide will walk you through building a production-ready screen sharing Chrome extension from scratch. We will cover the fundamentals of WebRTC screen capture, the Chrome desktopCapture API, permission handling, stream management, and advanced patterns that real-world screen sharing extensions use.

---

Understanding WebRTC Screen Capture {#understanding-webrtc}

WebRTC (Web Real-Time Communication) is a powerful browser API that enables peer-to-peer audio and video communication. At its core, WebRTC provides three main APIs: MediaStream (formerly getUserMedia), RTCPeerConnection, and RTCDataChannel. For screen sharing, we primarily work with the MediaStream API and its ability to capture desktop video.

The key difference between camera capture and screen capture lies in the source. While camera capture uses your webcam, screen capture can record your entire desktop, a specific application window, or a particular browser tab. This flexibility makes screen sharing extensions incredibly versatile for different user needs.

Chrome provides the `chrome.desktopCapture` API specifically for this purpose. This API is only available to Chrome extensions (not regular web pages) and requires specific permissions in your extension's manifest. The API uses the `getMediaSourceTypes()` method to determine what capture sources are available and `chooseDesktopMedia()` to let the user select what they want to share.

---

Chrome Extension Architecture for Screen Sharing {#extension-architecture}

Before diving into code, let us understand how screen sharing fits into Chrome extension architecture. A typical screen sharing extension consists of several components working together.

The manifest file declares the necessary permissions and defines the extension's capabilities. For screen sharing, you need the `desktopCapture` permission and potentially `tabCapture` for advanced scenarios. The background service worker handles the core logic of initiating capture sessions and managing streams. The popup or options page provides the user interface for starting and stopping screen sharing. Finally, content scripts may be needed if you want to inject the video stream into web pages.

This separation of concerns ensures your extension remains responsive and can handle complex capture scenarios efficiently.

---

Setting Up Your Extension Manifest {#manifest-setup}

Let us start by creating the foundation of your screen sharing extension. The manifest file is the most critical component as it defines what your extension can do.

Create a new folder for your extension and add the following `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Screen Share Pro",
  "version": "1.0.0",
  "description": "Share your screen with WebRTC-powered Chrome extension",
  "permissions": [
    "desktopCapture",
    "storage",
    "tabs"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "host_permissions": [
    "<all_urls>"
  ]
}
```

The `desktopCapture` permission is the key here. Without it, your extension cannot access the screen capture APIs. The `host_permissions` field is important if you plan to send the captured stream to remote servers or embed it in web pages.

---

Building the Background Service Worker {#background-worker}

The background service worker acts as the orchestrator for screen capture. It handles the communication between the popup and the desktop capture API. Create a `background.js` file with the following code:

```javascript
// background.js - Main service worker for screen capture

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startCapture') {
    startScreenCapture(message.sourceTypes)
      .then(stream => {
        // Store the stream ID for later use
        const tabId = sender.tab?.id;
        if (tabId) {
          chrome.storage.local.set({ [`stream_${tabId}`]: stream.id });
        }
        sendResponse({ success: true, streamId: stream.id });
      })
      .catch(error => {
        console.error('Screen capture error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'stopCapture') {
    stopScreenCapture(message.streamId)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// Start screen capture with user permission
async function startScreenCapture(sourceTypes) {
  // Determine which source types to offer
  const sources = sourceTypes || ['screen', 'window', 'tab'];
  
  // Request desktop media from the user
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: await chrome.desktopCapture.chooseDesktopMedia(
          sources.map(type => ({
            id: type,
            name: type.charAt(0).toUpperCase() + type.slice(1)
          }))
        )
      }
    }
  });
  
  return stream;
}

// Stop a specific capture stream
async function stopScreenCapture(streamId) {
  // Get all capture streams and stop the matching one
  // In practice, you would manage streams in a Map
  const tracks = await navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => stream.getTracks());
  
  tracks.forEach(track => track.stop());
}
```

This service worker provides the core functionality for initiating and managing screen capture sessions. The `chrome.desktopCapture.chooseDesktopMedia()` method is what triggers the system permission dialog where users can select what they want to share.

---

Creating the Popup Interface {#popup-interface}

The popup provides the user interface for initiating screen capture. Create a simple but functional `popup.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 300px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #333;
    }
    
    .capture-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      transition: background 0.2s;
    }
    
    label:hover {
      background: #f0f0f0;
    }
    
    button {
      width: 100%;
      padding: 12px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .start-btn {
      background: #4285f4;
      color: white;
    }
    
    .start-btn:hover {
      background: #3367d6;
    }
    
    .start-btn:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .stop-btn {
      background: #ea4335;
      color: white;
      margin-top: 12px;
    }
    
    .stop-btn:hover {
      background: #d33426;
    }
    
    #status {
      margin-top: 12px;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      text-align: center;
    }
    
    .status-active {
      background: #e6f4ea;
      color: #137333;
    }
    
    .status-error {
      background: #fce8e6;
      color: #c5221f;
    }
  </style>
</head>
<body>
  <h2>Screen Share Pro</h2>
  
  <div class="capture-options">
    <label>
      <input type="checkbox" id="captureScreen" checked>
      Entire Screen
    </label>
    <label>
      <input type="checkbox" id="captureWindow" checked>
      Application Window
    </label>
    <label>
      <input type="checkbox" id="captureTab" checked>
      Browser Tab
    </label>
  </div>
  
  <button id="startBtn" class="start-btn">Start Sharing</button>
  <button id="stopBtn" class="stop-btn" style="display: none;">Stop Sharing</button>
  
  <div id="status"></div>
  
  <script src="popup.js"></script>
</body>
</html>
```

Now create the `popup.js` to handle user interactions:

```javascript
// popup.js - Handle popup interactions

let currentStreamId = null;

document.getElementById('startBtn').addEventListener('click', startCapture);
document.getElementById('stopBtn').addEventListener('click', stopCapture);

async function startCapture() {
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  
  // Collect source types
  const sourceTypes = [];
  if (document.getElementById('captureScreen').checked) sourceTypes.push('screen');
  if (document.getElementById('captureWindow').checked) sourceTypes.push('window');
  if (document.getElementById('captureTab').checked) sourceTypes.push('tab');
  
  try {
    startBtn.disabled = true;
    statusEl.textContent = 'Selecting capture source...';
    statusEl.className = '';
    
    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: 'startCapture',
      sourceTypes: sourceTypes
    });
    
    if (response.success) {
      currentStreamId = response.streamId;
      statusEl.textContent = 'Screen sharing active!';
      statusEl.className = 'status-active';
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      
      // Store active stream info
      await chrome.storage.local.set({
        isSharing: true,
        streamId: currentStreamId
      });
    } else {
      throw new Error(response.error || 'Unknown error');
    }
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.className = 'status-error';
    console.error('Capture error:', error);
  } finally {
    startBtn.disabled = false;
  }
}

async function stopCapture() {
  const statusEl = document.getElementById('status');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  
  try {
    if (currentStreamId) {
      await chrome.runtime.sendMessage({
        action: 'stopCapture',
        streamId: currentStreamId
      });
    }
    
    currentStreamId = null;
    statusEl.textContent = 'Screen sharing stopped';
    statusEl.className = '';
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    
    await chrome.storage.local.set({ isSharing: false });
  } catch (error) {
    statusEl.textContent = `Error stopping: ${error.message}`;
    statusEl.className = 'status-error';
  }
}
```

---

Implementing Advanced Stream Handling {#stream-handling}

Real-world screen sharing extensions need to handle various scenarios beyond basic capture. Let us explore advanced patterns for managing streams effectively.

Handling Stream Tracks

When you capture a screen, you get a MediaStream containing video tracks. You can manipulate these tracks to create different viewing experiences:

```javascript
// Advanced stream handling
async function handleStreamTracks(stream) {
  const videoTrack = stream.getVideoTracks()[0];
  
  // Get track settings for metadata
  const settings = videoTrack.getSettings();
  console.log('Capture dimensions:', settings.width, 'x', settings.height);
  console.log('Frame rate:', settings.frameRate);
  
  // Listen for track ending (user stops sharing via browser UI)
  videoTrack.onended = () => {
    console.log('User stopped sharing via browser UI');
    // Handle cleanup
    cleanupStream(stream);
  };
  
  // Apply constraints dynamically
  videoTrack.applyConstraints({
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 }
  });
  
  return stream;
}
```

Recording the Stream

Many applications need to record screen shares for later playback. The MediaRecorder API makes this straightforward:

```javascript
// Record screen capture
function startRecording(stream) {
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
    // Download or process the recording
    downloadRecording(url);
  };
  
  mediaRecorder.start(1000); // Capture in 1-second chunks
  
  return mediaRecorder;
}

function downloadRecording(url) {
  const a = document.createElement('a');
  a.href = url;
  a.download = `screen-recording-${Date.now()}.webm`;
  a.click();
}
```

---

WebRTC Integration for Remote Streaming {#webrtc-integration}

If you want to stream screen capture to remote viewers (like in a video conferencing app), you need WebRTC peer connections. Here is how to integrate screen capture with WebRTC:

```javascript
// WebRTC peer connection for remote streaming
class ScreenShareStreamer {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
  }
  
  async startScreenShare() {
    // Capture screen
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          // Use chrome.desktopCapture.chooseDesktopMedia() first
        }
      }
    });
    
    // Create peer connection
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    
    // Add local tracks to peer connection
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });
    
    // Handle incoming ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate to remote peer via signaling server
        this.sendIceCandidate(event.candidate);
      }
    };
    
    // Create and send offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    
    // Send offer to remote peer
    return this.peerConnection.localDescription;
  }
  
  async handleRemoteAnswer(answer) {
    await this.peerConnection.setRemoteDescription(answer);
  }
  
  async addIceCandidate(candidate) {
    await this.peerConnection.addIceCandidate(candidate);
  }
  
  stopScreenShare() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
  }
}
```

---

Permissions and User Privacy {#permissions-privacy}

Screen capture involves significant privacy implications, and Chrome has built-in protections you need to understand.

Permission Prompts

When your extension calls `chrome.desktopCapture.chooseDesktopMedia()`, Chrome displays a system-level dialog asking users to select what they want to share. This dialog cannot be bypassed or customized. it is a security feature that ensures users have full control over what gets captured.

The dialog allows users to select from:
- Entire screen: The entire primary display
- Application windows: Specific windows from running applications
- Browser tabs: Individual tabs (with audio if available)

Best Practices for Privacy

Follow these best practices to build trust with your users:

Always explain clearly what your extension does and what data it accesses. Provide a privacy policy that details how you handle captured content. Never record or transmit screen content without explicit user consent. Implement clear visual indicators when screen sharing is active. Provide easy controls to start and stop sharing at any time.

---

Testing Your Extension {#testing}

Testing screen sharing extensions requires special considerations since you cannot programmatically trigger the permission dialog in automated tests.

Manual Testing

Load your extension in developer mode:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select your extension folder
4. Click your extension icon to open the popup
5. Click "Start Sharing" to trigger the capture dialog

Automated Testing

For automated tests, you can mock the desktop capture API:

```javascript
// Mock for testing
chrome.desktopCapture = {
  chooseDesktopMedia: async (sources) => {
    // Return a mock stream ID for testing
    return 'mock-stream-id';
  }
};

navigator.mediaDevices.getUserMedia = async (constraints) => {
  // Return a mock stream for testing
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const stream = canvas.captureStream(30);
  return stream;
};
```

---

Publishing Your Extension {#publishing}

Once your screen sharing extension is ready, you can publish it to the Chrome Web Store. Prepare the following:

- A compelling description explaining your extension's features
- Promotional screenshots showing the capture dialog and UI
- A privacy policy addressing how you handle captured content
- Proper icon sizes (16, 48, 128 pixels)

The review process for screen sharing extensions may take longer due to the sensitive nature of screen capture permissions. Be thorough in your privacy documentation to avoid delays.

---

Conclusion {#conclusion}

Building a screen sharing Chrome extension with WebRTC opens up tremendous possibilities for collaboration, education, and productivity tools. we covered the essential components: the Chrome desktopCapture API for initiating capture, the WebRTC MediaStream API for handling video tracks, the extension architecture for organizing your code, and advanced patterns for recording and streaming.

Remember that screen sharing carries significant privacy responsibilities. Always prioritize user consent, provide clear controls, and be transparent about how captured content is used. With these principles in place, you can build powerful screen sharing extensions that genuinely help users collaborate and work more effectively.

The techniques covered here form the foundation for more advanced features like multi-source capture, real-time annotation, AI-powered transcription, and integrated video conferencing. As you continue developing your extension, explore these advanced capabilities to create truly differentiated user experiences.

Start building your screen sharing extension today and join the ecosystem of tools that make remote collaboration smooth and intuitive.
