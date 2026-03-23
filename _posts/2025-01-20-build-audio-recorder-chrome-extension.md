---
layout: post
title: "Build an Audio Recorder Chrome Extension"
description: "Learn how to build a powerful audio recorder Chrome extension using the MediaRecorder API. This comprehensive guide covers Manifest V3, microphone permissions, audio processing, and publishing to the Chrome Web Store."
date: 2025-01-20
categories: [tutorials, chrome-extensions]
tags: [audio recorder extension, chrome extension development, mediarecorder api, voice recorder, manifest v3, tutorial]
keywords: "audio recorder extension, record audio chrome, voice recorder extension, chrome audio recording, MediaRecorder API tutorial"
canonical_url: "https://bestchromeextensions.com/2025/01/20/build-audio-recorder-chrome-extension/"
---

# Build an Audio Recorder Chrome Extension

Audio recording capabilities in web browsers have evolved significantly in recent years. With the MediaRecorder API now widely supported across modern browsers, building an audio recorder extension for Chrome has become an achievable project for developers of all skill levels. Whether you need to capture voice notes, record podcast episodes, document meetings, or create audio tutorials, a custom audio recorder extension gives you complete control over your recording experience without relying on third-party services.

This comprehensive guide will walk you through building a fully functional audio recorder Chrome extension from scratch. We will cover everything from setting up the project structure and configuring Manifest V3 to implementing the MediaRecorder API, handling microphone permissions, processing audio files, and publishing your extension to the Chrome Web Store. By the end of this tutorial, you will have a production-ready extension that users can install and use immediately.

---

## Why Build an Audio Recorder Extension? {#why-build-audio-recorder}

The demand for browser-based audio recording solutions continues to grow across multiple use cases. Professionals need to record meeting notes, students want to capture lecture audio, content creators require voice-over tools, and developers need to document bug reports with verbal explanations. An audio recorder extension provides these capabilities directly within the browser, eliminating the need for separate applications or online services.

Building your own audio recorder extension offers several advantages over using existing solutions. First, you have complete control over the feature set and can customize every aspect of the recording experience. Second, your extension can integrate tightly with other Chrome features like tab management, bookmarks, and the clipboard. Third, you own the data completely — recordings can be saved locally or processed on your own servers rather than being stored on third-party platforms with uncertain privacy policies.

From a development perspective, an audio recorder extension is an excellent project for learning Chrome extension development fundamentals. It introduces you to several important APIs and concepts including the MediaRecorder API for capturing audio, the getUserMedia API for accessing hardware, chrome.storage for persisting settings, and the chrome.downloads API for saving recorded files. These skills transfer directly to other extension projects you might build in the future.

---

## Prerequisites and Project Setup {#prerequisites}

Before we begin building the audio recorder extension, ensure you have a basic understanding of HTML, CSS, and JavaScript. You do not need prior experience with Chrome extension development, but familiarity with these web technologies is essential. You will also need Google Chrome installed on your development machine and a code editor like Visual Studio Code.

Create a new directory for your project and set up the basic folder structure. Your extension will need several files working together: the manifest file that defines extension metadata and permissions, an HTML popup that provides the user interface, CSS styles for visual design, and JavaScript files that handle the recording logic. Let us start by creating the manifest.json file with the necessary configurations for a Manifest V3 extension.

```json
{
  "manifest_version": 3,
  "name": "Audio Recorder Pro",
  "version": "1.0.0",
  "description": "Record audio directly in your browser with high quality.",
  "permissions": [
    "microphone",
    "storage",
    "downloads"
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

The manifest file declares the extension name, version, and description that users will see in the Chrome Web Store. The permissions array is critical — you must include "microphone" to access the user's microphone via the getUserMedia API. The "storage" permission allows you to save user preferences, while "downloads" enables saving recorded audio files. The action property defines the popup that appears when users click your extension icon.

---

## Creating the User Interface {#user-interface}

The popup interface serves as the main interaction point for your audio recorder extension. It needs to display recording controls, show the current recording status, indicate audio levels, and provide options for saving or discarding recordings. Keep the design clean and intuitive since users will interact with it primarily through clicks and taps.

Create the popup.html file with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audio Recorder</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <h1>Audio Recorder</h1>
    
    <div class="status-display">
      <div class="status-indicator" id="statusIndicator"></div>
      <span class="status-text" id="statusText">Ready to record</span>
    </div>
    
    <div class="timer" id="timer">00:00:00</div>
    
    <div class="visualizer" id="visualizer">
      <canvas id="audioCanvas"></canvas>
    </div>
    
    <div class="controls">
      <button id="recordBtn" class="btn btn-record">
        <span class="icon">●</span> Record
      </button>
      <button id="stopBtn" class="btn btn-stop" disabled>
        <span class="icon">■</span> Stop
      </button>
      <button id="saveBtn" class="btn btn-save" disabled>
        <span class="icon">↓</span> Save
      </button>
    </div>
    
    <div class="settings">
      <label for="audioFormat">Format:</label>
      <select id="audioFormat">
        <option value="webm">WebM</option>
        <option value="mp3">MP3 (via codec)</option>
      </select>
    </div>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

The interface includes a status indicator that changes color based on recording state, a timer showing elapsed recording time, a visualizer canvas for displaying audio waveforms, and three main control buttons. The settings section allows users to choose their preferred audio format. This layout provides all necessary functionality while remaining compact enough to fit comfortably in the extension popup.

---

## Styling Your Extension {#styling}

The CSS file transforms the basic HTML structure into an attractive, professional-looking interface. Use a color scheme that clearly communicates the recording state — typically green for ready, red for recording, and neutral gray for disabled states. Apply consistent spacing and clear visual hierarchy so users can quickly understand the current state and available actions.

Create popup.css with these styles:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  width: 320px;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #ffffff;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

h1 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.status-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4ade80;
  transition: background 0.3s ease;
}

.status-indicator.recording {
  background: #ef4444;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.timer {
  font-size: 32px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
}

.visualizer {
  width: 100%;
  height: 60px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  overflow: hidden;
}

#audioCanvas {
  width: 100%;
  height: 100%;
}

.controls {
  display: flex;
  gap: 12px;
  width: 100%;
}

.btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-record {
  background: #ef4444;
  color: white;
}

.btn-record:hover:not(:disabled) {
  background: #dc2626;
}

.btn-stop {
  background: #6b7280;
  color: white;
}

.btn-stop:hover:not(:disabled) {
  background: #4b5563;
}

.btn-save {
  background: #3b82f6;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #2563eb;
}

.settings {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.settings select {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #374151;
  background: #1f2937;
  color: #ffffff;
  font-size: 12px;
}
```

These styles create a modern dark theme with smooth transitions and clear visual feedback. The recording indicator pulses when active, buttons change appearance on hover, and the overall design feels polished and professional. The visualizer canvas sits ready to display audio waveforms during recording.

---

## Implementing Recording Logic {#recording-logic}

The JavaScript file contains the core functionality of your audio recorder extension. It handles microphone access, starts and stops recordings, processes audio data, and manages the user interface updates. Understanding each component is essential for building a reliable recording experience.

Create popup.js with the following implementation:

```javascript
let mediaRecorder = null;
let audioChunks = [];
let startTime = null;
let timerInterval = null;
let audioStream = null;
let audioContext = null;
let analyser = null;

// DOM Elements
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const timerDisplay = document.getElementById('timer');
const audioCanvas = document.getElementById('audioCanvas');
const canvasCtx = audioCanvas.getContext('2d');

// Set canvas size
audioCanvas.width = 280;
audioCanvas.height = 60;

// Event Listeners
recordBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
saveBtn.addEventListener('click', saveRecording);

async function startRecording() {
  try {
    // Request microphone access
    audioStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      } 
    });
    
    // Set up audio visualization
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);
    analyser.fftSize = 256;
    
    // Create MediaRecorder instance
    mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      saveBtn.disabled = false;
    };
    
    // Start recording
    mediaRecorder.start(1000);
    startTime = Date.now();
    
    // Update UI
    updateUI(true);
    startTimer();
    visualize();
    
    statusText.textContent = 'Recording...';
  } catch (error) {
    console.error('Error accessing microphone:', error);
    statusText.textContent = 'Microphone access denied';
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    audioStream.getTracks().forEach(track => track.stop());
    
    if (audioContext) {
      audioContext.close();
    }
    
    clearInterval(timerInterval);
    updateUI(false);
    statusText.textContent = 'Recording stopped';
  }
}

async function saveRecording() {
  if (audioChunks.length === 0) {
    statusText.textContent = 'No recording to save';
    return;
  }
  
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  const url = URL.createObjectURL(audioBlob);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `recording-${timestamp}.webm`;
  
  // Use Chrome downloads API
  const downloadId = await chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  });
  
  statusText.textContent = 'Recording saved!';
  audioChunks = [];
  saveBtn.disabled = true;
}

function updateUI(isRecording) {
  recordBtn.disabled = isRecording;
  stopBtn.disabled = !isRecording;
  
  if (isRecording) {
    statusIndicator.classList.add('recording');
    recordBtn.innerHTML = '<span class="icon">●</span> Recording...';
  } else {
    statusIndicator.classList.remove('recording');
    recordBtn.innerHTML = '<span class="icon">●</span> Record';
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    timerDisplay.textContent = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, 100);
}

function visualize() {
  if (!analyser) return;
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  function draw() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    
    requestAnimationFrame(draw);
    
    analyser.getByteFrequencyData(dataArray);
    
    canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    canvasCtx.fillRect(0, 0, audioCanvas.width, audioCanvas.height);
    
    const barWidth = (audioCanvas.width / bufferLength) * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * audioCanvas.height;
      
      const gradient = canvasCtx.createLinearGradient(0, 0, 0, audioCanvas.height);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(1, '#8b5cf6');
      
      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(x, audioCanvas.height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
  }
  
  draw();
}
```

This JavaScript implementation handles several critical aspects of audio recording. The startRecording function requests microphone access using the getUserMedia API with optimized settings for echo cancellation and noise suppression. It creates an AudioContext and AnalyserNode to process audio data for visualization. The MediaRecorder is configured to capture audio in WebM format with the Opus codec, which provides excellent quality at reasonable file sizes.

The stopRecording function properly terminates the recording session, releases the microphone, and closes the audio context to free system resources. The saveRecording function creates a Blob from the recorded audio chunks, generates a timestamped filename, and uses the Chrome downloads API to trigger a save dialog. The visualize function continuously updates the canvas with frequency data, creating an engaging visual representation of the audio being recorded.

---

## Adding Icon Files {#icons}

Your extension needs icon files to display in the Chrome toolbar and Chrome Web Store. Create a simple icons directory with PNG images at the required sizes: 16x16, 48x48, and 128x128 pixels. You can use any image editing tool to create basic icons, or generate them programmatically. For development purposes, you can use placeholder images, but replace them with professional designs before publishing.

The icons should clearly represent audio recording — a microphone design works well for this purpose. Ensure the icons have transparent backgrounds and are recognizable at small sizes since the 16-pixel version appears in the Chrome toolbar.

---

## Testing Your Extension {#testing}

Before publishing, thoroughly test your extension to ensure it works correctly in various scenarios. Load your extension in Chrome by navigating to chrome://extensions/, enabling Developer mode, and clicking "Load unpacked". Select your extension directory to install it temporarily for testing.

Test the following scenarios: recording audio in a quiet environment, recording with background noise present, stopping and starting recordings multiple times, saving recordings in different locations, and verifying that the extension handles microphone permission denials gracefully. Pay attention to the timer accuracy, visualizer responsiveness, and file save functionality.

Check for any console errors during operation and verify that the extension behaves correctly when Chrome is restarted. Test on different operating systems if possible since microphone access behavior can vary slightly between platforms.

---

## Publishing to Chrome Web Store {#publishing}

Once testing is complete and you are satisfied with your extension, prepare it for publication. Create a detailed product listing with an appealing description, screenshots demonstrating the extension in action, and appropriate category tags. The Chrome Web Store has specific guidelines for extension descriptions — ensure yours is clear, accurate, and free of promotional language.

You will need to pay a one-time developer registration fee of $5 to publish to the Chrome Web Store. After registration, you can upload your extension, complete the store listing, and submit it for review. Google typically reviews submissions within a few hours to a few days. Once approved, your extension becomes available to all Chrome users worldwide.

Consider implementing analytics to track installation numbers and user behavior. The chrome.storage API can also help you collect basic usage statistics. Plan for regular updates to fix bugs, add features, and maintain compatibility with Chrome updates.

---

## Conclusion {#conclusion}

Building an audio recorder Chrome extension is an excellent project that teaches you fundamental skills applicable to many other extension types. You have learned how to request and manage microphone permissions, use the MediaRecorder API for audio capture, process and visualize audio data, save recordings using the Chrome downloads API, and package everything for distribution through the Chrome Web Store.

The extension you built in this guide provides a solid foundation that you can extend with additional features like audio transcription, cloud storage integration, recording scheduling, or audio editing capabilities. The Chrome extension platform provides powerful APIs that enable sophisticated functionality limited primarily by your imagination and programming skills.

As browser technology continues to evolve, audio recording capabilities will only improve. WebCodecs API offers more granular control over audio encoding, and the File System Access API enables direct file manipulation. Stay current with Chrome's developer documentation to leverage these new capabilities as they become stable and widely supported.
