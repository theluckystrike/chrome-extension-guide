# WebRTC in Chrome Extensions

This guide covers implementing real-time communication features in Chrome Extensions using WebRTC APIs, including screen capture, media processing, and peer-to-peer connections.

## Overview

Chrome Extensions support WebRTC through several mechanisms:
- Content scripts can use standard `navigator.mediaDevices.getUserMedia()`
- Service workers use `chrome.tabCapture` and `chrome.desktopCapture`
- Offscreen documents provide a bridge for media processing

## Accessing getUserMedia from Extensions

### In Content Scripts

Content scripts run in the context of web pages and can use the standard WebRTC API:

```javascript
// content-script.js
async function requestCameraAccess() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    return stream;
  } catch (error) {
    console.error('Camera access denied:', error);
  }
}
```

### Required Permissions

Add required permissions to `manifest.json`:

```json
{
  "permissions": [
    "activeTab",
    "tabCapture",
    "desktopCapture"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

## Screen Capture with chrome.tabCapture

The `chrome.tabCapture` API captures the visible area of a tab as a MediaStream:

```javascript
// background.js
chrome.tabCapture.capture({
  audio: true,
  video: true,
  videoConstraints: {
    mandatory: {
      chromeMediaSource: 'tab',
      maxWidth: 1920,
      maxHeight: 1080
    }
  }
}, (stream) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError);
    return;
  }
  // Use the stream
});
```

## DesktopCapture API

For capturing the entire screen or application windows:

```javascript
async function requestScreenCapture() {
  const sources = await chrome.desktopCapture.getDesktopSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 150, height: 150 }
  });
  
  const sourceId = sources[0].id; // In practice, show a picker UI
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId
      }
    }
  });
}
```

## MediaStream in Service Workers

Service workers cannot directly use MediaStream. Use offscreen documents:

```javascript
// background.js - Create offscreen document
async function createMediaProcessingContext() {
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['WEB_RTC'],
    justification: 'Processing WebRTC media streams'
  });
}

// offscreen.js - Process audio
let audioContext;
function handleStream(stream) {
  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const gain = audioContext.createGain();
  gain.gain.value = 1.5;
  source.connect(gain);
  gain.connect(audioContext.destination);
}
```

## Peer Connections from Extension Context

Extensions can create RTCPeerConnection for P2P communication:

```javascript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

const peerConnection = new RTCPeerConnection(configuration);

peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    sendToSignalingServer({ type: 'ice-candidate', candidate: event.candidate });
  }
};

peerConnection.ontrack = (event) => {
  const [remoteStream] = event.streams;
  // Display or process remote stream
};

localStream.getTracks().forEach(track => {
  peerConnection.addTrack(track, localStream);
});
```

## Signaling Server Integration

Extensions communicate with signaling servers via WebSocket:

```javascript
class SignalingClient {
  constructor(serverUrl) {
    this.ws = new WebSocket(serverUrl);
    this.ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'offer') {
        await pc.setRemoteDescription(msg.offer);
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        this.send({ type: 'answer', answer: ans });
      }
    };
  }
  send(data) { this.ws.send(JSON.stringify(data)); }
}
```

## Recording Streams with MediaRecorder

```javascript
function recordStream(stream, filename = 'recording.webm') {
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];
  
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };
  
  recorder.start(1000);
  return recorder;
}
```

## Canvas Manipulation of Video Frames

```javascript
function processVideoFrames(video, canvas) {
  const ctx = canvas.getContext('2d');
  
  function process() {
    ctx.drawImage(video, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    // Apply grayscale
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i+1] + data[i+2]) / 3;
      data[i] = data[i+1] = data[i+2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
    requestAnimationFrame(process);
  }
  process();
}
```

## Audio Processing with Web Audio API

```javascript
function createAudioProcessor(stream) {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  const gain = ctx.createGain();
  
  analyser.fftSize = 256;
  gain.gain.value = 1.0;
  
  source.connect(analyser).connect(gain).connect(ctx.destination);
  return { ctx, analyser, gain };
}
```

## Building a Screen Recorder Extension

Complete screen recorder example:

```javascript
class ScreenRecorder {
  constructor() { this.recorder = null; this.chunks = []; }
  
  async start(sourceId) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: sourceId } }
    });
    
    this.recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    this.recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.start(1000);
  }
  
  stop() {
    return new Promise(resolve => {
      this.recorder.onstop = () => resolve(new Blob(this.chunks, { type: 'video/webm' }));
      this.recorder.stop();
    });
  }
}
```

## Building a Video Conferencing Extension

Full P2P video call implementation:

```javascript
class VideoConference {
  constructor() { this.pc = null; this.localStream = null; }
  
  async init() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    
    this.localStream.getTracks().forEach(t => this.pc.addTrack(t, this.localStream));
    this.pc.ontrack = (e) => document.getElementById('remote').srcObject = e.streams[0];
  }
  
  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }
  
  async handleAnswer(ans) { await this.pc.setRemoteDescription(ans); }
  async addIceCandidate(c) { await this.pc.addIceCandidate(c); }
}
```

## Reference

- [Chrome TabCapture API](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)
- [Chrome DesktopCapture API](https://developer.chrome.com/docs/extensions/reference/api/desktopCapture)
- [WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Offscreen Documents](https://developer.chrome.com/docs/extensions/mv3/offscreen/)
