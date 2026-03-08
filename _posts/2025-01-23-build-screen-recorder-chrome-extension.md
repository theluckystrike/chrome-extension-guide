---
layout: post
title: "Build a Screen Recorder Chrome Extension"
description: "Learn how to build a powerful screen recorder Chrome extension using the Display Media API and MediaRecorder. This comprehensive guide covers Manifest V3, screen capture permissions, recording customization, and publishing to the Chrome Web Store."
date: 2025-01-23
categories: [Chrome Extensions, Tutorial]
tags: [chrome-extension, project]
keywords: "screen recorder extension, record screen chrome, screen capture extension, chrome screen recording, chrome extension development, MediaRecorder API, Display Media API"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/23/build-screen-recorder-chrome-extension/
---

# Build a Screen Recorder Chrome Extension

Screen recording has become an essential feature for content creators, educators, software developers, and business professionals. Whether you need to create tutorial videos, capture bug reports, record presentations, or document software workflows, having a dedicated screen recorder extension directly in your browser provides unparalleled convenience. Unlike standalone screen recording software that requires installation and configuration, a Chrome extension integrates seamlessly with your browsing experience and can be activated instantly with a single click.

This comprehensive guide will walk you through building a fully functional screen recorder Chrome extension from the ground up. We will cover everything from understanding the underlying APIs that enable screen capture in modern browsers to implementing advanced features like audio recording, quality settings, and file export functionality. By the end of this tutorial, you will have a production-ready extension that users can install and start using immediately to capture their screens with professional-quality results.

---

## Understanding Screen Recording in Chrome Extensions {#understanding-screen-recording}

Before diving into the implementation details, it is crucial to understand the technologies that power screen recording in web browsers. The Display Media API, which is part of the broader WebRTC ecosystem, provides the foundation for capturing screen content in Chrome and other modern browsers. This API enables websites and extensions to request access to screen, application window, or browser tab content and stream that content in real-time for recording or sharing purposes.

The Display Media API works alongside the MediaRecorder API, which handles the actual recording of media streams. Together, these APIs provide a powerful combination that allows developers to capture screen content and save it as video files entirely within the browser. The MediaRecorder API supports multiple output formats and provides fine-grained control over recording quality, frame rates, and audio tracks. Understanding how these two APIs interact is essential for building a robust screen recorder extension that performs reliably across different use cases.

Chrome extensions benefit from additional capabilities when implementing screen recording. The chrome.desktopCapture API, which is specific to Chrome extensions, provides enhanced permissions management and source selection interfaces that are not available to regular web pages. This API allows your extension to present users with a native picker dialog where they can choose exactly what to capture — whether it is the entire screen, a specific application window, or a particular browser tab. The desktopCapture API also supports capturing system audio and microphone input simultaneously with the screen content, enabling more sophisticated recording scenarios.

---

## Prerequisites and Development Environment Setup {#prerequisites}

To build a screen recorder Chrome extension, you need a solid foundation in web development technologies including HTML, CSS, and JavaScript. While prior experience with Chrome extension development is helpful, it is not strictly necessary as we will cover all the essential concepts from scratch. You will also need Google Chrome installed on your development machine and a code editor such as Visual Studio Code that provides good support for JavaScript development and debugging.

The development environment for a Chrome extension is straightforward to set up. You do not need complex build tools or special frameworks — a simple text editor and Chrome browser are sufficient to get started. However, using a bundler like Webpack or Vite can significantly improve your development workflow when building more complex extensions with multiple files and dependencies. For this tutorial, we will start with a straightforward setup that does not require any build tools, making it easy to understand the core concepts before introducing additional complexity.

Before you begin implementing the extension, create a dedicated project folder on your computer. This folder will contain all the files that make up your extension, including the manifest configuration, HTML popup interface, CSS styles, and JavaScript logic. Organizing your project properly from the start will make it easier to maintain and extend the extension as you add new features. The folder structure should be clean and intuitive, with separate directories for different types of resources such as images, icons, and scripts.

---

## Creating the Manifest File {#manifest-file}

The manifest.json file serves as the foundation of every Chrome extension, defining metadata, permissions, and the components that make up your extension. For a screen recorder extension, we need to declare specific permissions that allow the extension to access screen capture capabilities and manage downloads. Let us create a comprehensive manifest that follows Manifest V3, which is the current standard for Chrome extensions.

```json
{
  "manifest_version": 3,
  "name": "Screen Recorder Pro",
  "version": "1.0.0",
  "description": "Record your screen with audio in high quality. Capture entire screens, windows, or browser tabs instantly.",
  "permissions": [
    "desktopCapture",
    "downloads",
    "storage",
    "notifications"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

The desktopCapture permission is the most critical element in this manifest, as it enables the extension to access the screen capture APIs. The downloads permission allows the extension to save recorded videos to the user's download folder, while storage enables persisting user preferences and settings. The notifications permission will be used to inform users when recording starts, stops, or encounters errors.

It is important to note that requesting the desktopCapture permission will trigger a user consent dialog when the extension is first installed or when recording is initiated. Chrome provides clear visual indicators to users about what is being captured, and the browser's built-in privacy controls ensure that users maintain control over their screen content at all times.

---

## Building the User Interface {#user-interface}

The popup interface serves as the primary interaction point between users and your screen recorder extension. It should be clean, intuitive, and provide quick access to all recording functions. The popup needs controls for starting and stopping recordings, selecting the capture source, adjusting quality settings, and viewing recording status. Let us create a well-designed HTML popup that provides an excellent user experience.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screen Recorder</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>Screen Recorder</h1>
      <span class="status" id="status">Ready</span>
    </header>
    
    <div class="recording-controls">
      <button id="startBtn" class="btn primary">
        <span class="icon">●</span> Start Recording
      </button>
      <button id="stopBtn" class="btn danger" disabled>
        <span class="icon">■</span> Stop Recording
      </button>
    </div>
    
    <div class="settings">
      <div class="setting-group">
        <label for="sourceType">Capture Source</label>
        <select id="sourceType">
          <option value="screen">Entire Screen</option>
          <option value="window">Application Window</option>
          <option value="tab">Browser Tab</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label for="audioType">Audio</label>
        <select id="audioType">
          <option value="none">No Audio</option>
          <option value="system">System Audio</option>
          <option value="microphone">Microphone</option>
          <option value="both">Both</option>
        </select>
      </div>
      
      <div class="setting-group">
        <label for="quality">Quality</label>
        <select id="quality">
          <option value="low">Low (480p)</option>
          <option value="medium" selected>Medium (720p)</option>
          <option value="high">High (1080p)</option>
        </select>
      </div>
    </div>
    
    <div class="recording-info" id="recordingInfo" style="display: none;">
      <div class="timer" id="timer">00:00:00</div>
      <div class="recording-indicator">
        <span class="dot"></span> Recording
      </div>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

The HTML structure separates the interface into logical sections: a header displaying the extension name and current status, recording controls with start and stop buttons, settings for configuring capture options, and a recording information display that appears only during active recordings. This layout provides a clear visual hierarchy and makes it easy for users to understand the extension's functionality at a glance.

---

## Styling the Popup Interface {#styling}

The CSS styles should create a polished, professional appearance that matches Chrome's design language while ensuring the interface is visually appealing and easy to use. We will use modern CSS techniques including flexbox for layout, CSS variables for consistent theming, and smooth transitions for interactive elements. The styling should be clean and unobtrusive, focusing on usability rather than flashy visual effects.

```css
:root {
  --primary-color: #4285f4;
  --danger-color: #ea4335;
  --success-color: #34a853;
  --background: #ffffff;
  --surface: #f8f9fa;
  --text-primary: #202124;
  --text-secondary: #5f6368;
  --border-color: #dadce0;
  --radius: 8px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: var(--background);
  color: var(--text-primary);
  width: 320px;
  padding: 16px;
}

.container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

header h1 {
  font-size: 18px;
  font-weight: 600;
}

.status {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--surface);
  color: var(--text-secondary);
}

.recording-controls {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn:hover {
  opacity: 0.9;
}

.btn:active {
  transform: scale(0.98);
}

.btn.primary {
  background: var(--primary-color);
  color: white;
}

.btn.danger {
  background: var(--danger-color);
  color: white;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--surface);
  border-radius: var(--radius);
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

select {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 13px;
  background: white;
  cursor: pointer;
}

.recording-info {
  text-align: center;
  padding: 16px;
  background: #fef7f7;
  border-radius: var(--radius);
  border: 1px solid #fce8e6;
}

.timer {
  font-size: 24px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  margin-bottom: 8px;
}

.recording-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--danger-color);
  font-size: 12px;
  font-weight: 500;
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--danger-color);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

The styling creates a modern, clean interface with clear visual feedback for different states. The recording indicator uses a pulsing animation to draw attention during active recordings, and the color scheme uses Chrome's brand colors for familiarity. The disabled states clearly indicate when controls are unavailable, preventing user confusion.

---

## Implementing Core Recording Logic {#recording-logic}

The JavaScript file handles all the functionality of the screen recorder extension, including managing the recording lifecycle, interacting with the Display Media API and MediaRecorder API, handling user interactions, and saving recorded content. This is where the magic happens, transforming the static interface into a fully functional screen recording tool. Let us implement the complete recording logic.

```javascript
let mediaRecorder = null;
let recordedChunks = [];
let startTime = null;
let timerInterval = null;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const sourceType = document.getElementById('sourceType');
const audioType = document.getElementById('audioType');
const quality = document.getElementById('quality');
const recordingInfo = document.getElementById('recordingInfo');
const timerEl = document.getElementById('timer');

const qualitySettings = {
  low: { width: 854, height: 480, bitsPerSecond: 1500000 },
  medium: { width: 1280, height: 720, bitsPerSecond: 3000000 },
  high: { width: 1920, height: 1080, bitsPerSecond: 6000000 }
};

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

async function startRecording() {
  try {
    const source = await getCaptureSource();
    if (!source) return;
    
    const audioTracks = await getAudioTracks(audioType.value);
    if (audioTracks.length > 0) {
      source.addTrack(audioTracks[0]);
      if (audioTracks[1]) {
        source.addTrack(audioTracks[1]);
      }
    }
    
    const settings = qualitySettings[quality.value];
    const mimeType = getSupportedMimeType();
    
    mediaRecorder = new MediaRecorder(source, {
      mimeType,
      videoBitsPerSecond: settings.bitsPerSecond
    });
    
    recordedChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = saveRecording;
    mediaRecorder.onerror = (event) => {
      console.error('Recording error:', event.error);
      updateStatus('Error');
      showNotification('Recording failed: ' + event.error.message);
    };
    
    mediaRecorder.start(1000);
    startTime = Date.now();
    startTimer();
    
    updateUIForRecording(true);
    updateStatus('Recording');
    showNotification('Recording started');
    
  } catch (error) {
    console.error('Error starting recording:', error);
    showNotification('Failed to start recording: ' + error.message);
  }
}

async function getCaptureSource() {
  const desktopMediaOptions = {
    types: [],
    mandatory: {}
  };
  
  switch (sourceType.value) {
    case 'screen':
      desktopMediaOptions.types = ['screen'];
      break;
    case 'window':
      desktopMediaOptions.types = ['window'];
      break;
    case 'tab':
      desktopMediaOptions.types = ['tab'];
      break;
  }
  
  return new Promise((resolve, reject) => {
    chrome.desktopCapture.chooseDesktopMedia(
      [sourceType.value],
      (streamId) => {
        if (!streamId) {
          resolve(null);
          return;
        }
        
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: streamId,
              ...qualitySettings[quality.value]
            }
          }
        }).then(resolve).catch(reject);
      }
    );
  });
}

async function getAudioTracks(audioType) {
  const tracks = [];
  
  if (audioType === 'system' || audioType === 'both') {
    try {
      const systemAudio = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop'
          }
        }
      });
      tracks.push(systemAudio.getAudioTracks()[0]);
    } catch (e) {
      console.warn('System audio not available:', e);
    }
  }
  
  if (audioType === 'microphone' || audioType === 'both') {
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      tracks.push(microphone.getAudioTracks()[0]);
    } catch (e) {
      console.warn('Microphone not available:', e);
    }
  }
  
  return tracks;
}

function getSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4'
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  return 'video/webm';
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  
  stopTimer();
  updateUIForRecording(false);
  updateStatus('Processing');
}

async function saveRecording() {
  if (recordedChunks.length === 0) {
    updateStatus('Ready');
    showNotification('No recording data');
    return;
  }
  
  const blob = new Blob(recordedChunks, { type: getSupportedMimeType() });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `screen-recording-${timestamp}.webm`;
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
  
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = async () => {
    const base64data = reader.result.split(',')[1];
    
    try {
      await chrome.downloads.download({
        url: `data:video/webm;base64,${base64data}`,
        filename: filename,
        saveAs: true
      });
      
      updateStatus('Saved');
      showNotification('Recording saved successfully');
      
      setTimeout(() => {
        updateStatus('Ready');
      }, 3000);
      
    } catch (error) {
      console.error('Download error:', error);
      updateStatus('Ready');
    }
  };
}

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    timerEl.textContent = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateUIForRecording(isRecording) {
  startBtn.disabled = isRecording;
  stopBtn.disabled = !isRecording;
  sourceType.disabled = isRecording;
  audioType.disabled = isRecording;
  quality.disabled = isRecording;
  recordingInfo.style.display = isRecording ? 'block' : 'none';
}

function updateStatus(status) {
  statusEl.textContent = status;
}

function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Screen Recorder',
    message: message
  });
}
```

The JavaScript implementation handles the complete recording lifecycle with proper error handling and user feedback. The code manages the Display Media API to capture screen content, the MediaRecorder API to encode and store video data, and the Chrome Downloads API to save the final recording. It also includes a timer that displays recording duration and support for multiple audio capture modes.

---

## Testing Your Extension {#testing}

Before publishing your extension, thorough testing is essential to ensure it works correctly across different scenarios. Load your extension in Chrome's developer mode and test all features including screen capture, window capture, tab capture, and various audio combinations. Verify that recordings save correctly and that the timer displays accurate durations. Test with different quality settings to ensure the extension performs well across various hardware configurations.

Pay special attention to edge cases and error handling. What happens if the user denies screen capture permission? What occurs if the recording runs for an extended period? How does the extension handle system resource limitations? Addressing these scenarios in testing will result in a more robust and reliable extension that users can trust with important recording tasks.

---

## Publishing to the Chrome Web Store {#publishing}

Once your extension is tested and working correctly, you can publish it to the Chrome Web Store to reach millions of users. Prepare promotional assets including screenshots, a compelling description, and relevant keywords. Ensure your extension follows all Chrome Web Store policies, particularly those related to privacy and data handling. The store review process typically takes a few days, and you will receive feedback if any issues need to be addressed before publication.

Consider creating a website or documentation for your extension to help users get the most out of its features. Including video tutorials demonstrating different recording scenarios can significantly improve user adoption and positive reviews. Regularly update your extension based on user feedback and Chrome platform changes to maintain compatibility and add new features.

---

## Conclusion {#conclusion}

Building a screen recorder Chrome extension is an excellent project that combines practical utility with valuable learning opportunities. The extension you have created in this guide demonstrates how modern web APIs can be leveraged within Chrome extensions to build powerful tools that rival standalone software. The skills you have developed — working with the Display Media API, implementing MediaRecorder, managing file downloads, and designing intuitive user interfaces — transfer directly to other extension projects you may undertake in the future.

The screen recording functionality you have implemented opens doors to numerous extensions and applications. You could expand this project to include video editing features, automatic transcription using speech recognition, cloud storage integration, or collaboration features for team environments. The foundation is solid, and the possibilities for extension are virtually unlimited. Continue experimenting, learning, and building — the Chrome extension ecosystem offers tremendous opportunities for developers who create valuable, user-centered tools.
