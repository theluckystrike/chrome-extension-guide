Chrome Extension Desktop Capture API Guide

Overview

The Chrome Desktop Capture API (`chrome.desktopCapture`) enables extensions to capture screen contents, windows, browser tabs, or audio streams. This API is essential for building screenshots, screen recordings, and collaborative sharing features.

Required Permissions

```json
{
  "manifest_version": 3,
  "name": "Screen Capture Extension",
  "permissions": ["desktopCapture"]
}
```

Source Types

Screen (`desktopCaptureSourceType.SCREEN`)

Captures the entire display.

```javascript
async function captureScreen() {
  const sources = await chrome.desktopCapture.getDesktopSources({
    types: ['screen'],
    thumbnailSize: { width: 320, height: 180 }
  });
  return sources[0]?.id;
}
```

Window (`desktopCaptureSourceType.WINDOW`)

Captures a single application window.

```javascript
async function captureWindow() {
  const sources = await chrome.desktopCapture.getDesktopSources({
    types: ['window'],
    thumbnailSize: { width: 320, height: 180 }
  });
  return sources.map(s => ({ id: s.id, name: s.name }));
}
```

Tab (`desktopCaptureSourceType.TAB`)

Captures a browser tab.

```javascript
async function captureTab(tabId) {
  return navigator.mediaDevices.getUserMedia({
    video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: tabId } }
  });
}
```

Audio (`desktopCaptureSourceType.AUDIO`)

Captures system or tab audio.

```javascript
async function captureWithAudio(tabId) {
  return navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: tabId } },
    video: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: tabId } }
  });
}
```

Choosing Capture Sources

chooseDesktopMedia

```javascript
async function startCapture() {
  const streamId = await chrome.desktopCapture.chooseDesktopMedia(
    ['screen', 'window', 'tab']
  );
  return streamId || null;
}
```

Custom Thumbnail Size

```javascript
async function getSources() {
  return chrome.desktopCapture.getDesktopSources({
    types: ['screen', 'window', 'tab'],
    thumbnailSize: { width: 640, height: 360 }
  });
}
```

Canceling Capture

cancelChooseDesktopMedia

```javascript
let currentId = null;

async function requestCapture() {
  currentId = await chrome.desktopCapture.chooseDesktopMedia(['screen', 'window']);
  return currentId;
}

function cancelCapture() {
  if (currentId) {
    chrome.desktopCapture.cancelChooseDesktopMedia(currentId);
    currentId = null;
  }
}

// Auto-cancel with timeout
function captureWithTimeout(ms = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms);
    chrome.desktopCapture.chooseDesktopMedia(['screen'])
      .then(id => { clearTimeout(timer); resolve(id); })
      .catch(e => { clearTimeout(timer); reject(e); });
  });
}
```

Converting to MediaStream

Basic getUserMedia

```javascript
async function getDisplayStream(streamId) {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
        minWidth: 1280, maxWidth: 1920,
        minHeight: 720, maxHeight: 1080
      }
    }
  });
}
```

With Audio

```javascript
async function getStreamWithAudio(streamId) {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
        echoCancellation: true
      }
    },
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
        maxWidth: 1920, maxHeight: 1080
      }
    }
  });
}
```

Capture Manager Class

```javascript
class CaptureManager {
  constructor() { this.stream = null; }
  
  async start(sources = ['screen', 'window', 'tab']) {
    const id = await chrome.desktopCapture.chooseDesktopMedia(sources);
    if (!id) return null;
    
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id } },
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id, maxFrameRate: 30 } }
    });
    
    this.stream.getVideoTracks()[0].onended = () => { this.stream = null; };
    return this.stream;
  }
  
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}
```

Screenshot Extension

Manifest

```json
{
  "manifest_version": 3,
  "name": "Quick Screenshot",
  "permissions": ["desktopCapture", "downloads"],
  "action": { "default_title": "Take Screenshot" },
  "background": { "service_worker": "background.js" }
}
```

Background Script

```javascript
chrome.action.onClicked.addListener(async () => {
  const id = await chrome.desktopCapture.chooseDesktopMedia(['screen', 'window', 'tab']);
  if (!id) return;
  
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id } }
  });
  
  const video = document.createElement('video');
  video.srcObject = stream;
  await video.play();
  
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  
  stream.getTracks().forEach(t => t.stop());
  
  canvas.toBlob(async blob => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    await chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: `screenshot-${ts}.png`,
      saveAs: true
    });
  }, 'image/png');
});
```

Reusable Class

```javascript
class ScreenshotCapture {
  async capture(type = 'all') {
    const types = { screen: ['screen'], window: ['window'], tab: ['tab'], all: ['screen', 'window', 'tab'] }[type];
    const id = await chrome.desktopCapture.chooseDesktopMedia(types);
    if (!id) return null;
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id } }
    });
    
    const v = document.createElement('video');
    v.srcObject = stream;
    await new Promise(r => { v.onloadedmetadata = r; v.play(); });
    
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    stream.getTracks().forEach(t => t.stop());
    return c;
  }
  
  async save(canvas, name) {
    return new Promise(r => {
      canvas.toBlob(async b => {
        await chrome.downloads.download({
          url: URL.createObjectURL(b),
          filename: name || `screenshot-${Date.now()}.png`,
          saveAs: true
        });
        r();
      }, 'image/png');
    });
  }
}
```

Screen Recording Extension

Recorder Class

```javascript
class ScreenRecorder {
  constructor() { this.chunks = []; this.recorder = null; this.stream = null; }
  
  async start(audio = true) {
    const types = audio ? ['screen', 'window', 'tab', 'audio'] : ['screen', 'window', 'tab'];
    const id = await chrome.desktopCapture.chooseDesktopMedia(types);
    if (!id) return;
    
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: audio ? { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id } } : false,
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id, maxWidth: 1920, maxFrameRate: 30 } }
    });
    
    const mime = ['video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) || {};
    this.recorder = new MediaRecorder(this.stream, mime);
    this.chunks = [];
    this.recorder.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.start(1000);
  }
  
  async stop() {
    if (!this.recorder || this.recorder.state === 'inactive') return;
    this.recorder.stop();
    this.stream.getTracks().forEach(t => t.stop());
    
    const blob = new Blob(this.chunks, { type: 'video/webm' });
    await chrome.downloads.download({
      url: URL.createObjectURL(blob),
      filename: `recording-${Date.now()}.webm`,
      saveAs: true
    });
    this.chunks = [];
  }
}
```

Toggle Button

```javascript
let recorder = null;
chrome.action.onClicked.addListener(async () => {
  if (recorder?.recorder?.state === 'recording') {
    await recorder.stop();
    recorder = null;
  } else {
    recorder = new ScreenRecorder();
    await recorder.start(true);
  }
});
```

Best Practices

Request Minimum Required Sources

```javascript
// Good
await chrome.desktopCapture.chooseDesktopMedia(['screen']);
// Avoid
await chrome.desktopCapture.chooseDesktopMedia(['screen', 'window', 'tab', 'audio']);
```

Handle Errors Gracefully

```javascript
try {
  const stream = await getDisplayStream(id);
  stream.getVideoTracks()[0].onended = cleanup;
  return stream;
} catch (e) {
  if (e.name === 'NotAllowedError') console.log('Denied');
  else if (e.name === 'NotFoundError') console.log('No sources');
  throw e;
}
```

Optimize Performance

```javascript
// Limit resolution and frame rate
const constraints = {
  video: {
    mandatory: {
      chromeMediaSource: 'desktop',
      chromeMediaSourceId: id,
      maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30
    }
  }
};
```

Platform Limitations

- System audio: Windows and macOS only
- Tab audio: All platforms (tab must be audible)
- Enterprise environments may block capture

Conclusion

The Chrome Desktop Capture API enables powerful screen capture extensions. Key points:

- Use `chooseDesktopMedia()` for user source selection
- Convert stream IDs to MediaStream via `getUserMedia()`
- Handle stream lifecycle and errors properly
- Request only necessary permissions

Build solid screenshot and recording extensions with these foundations.
