# Web Workers and SharedWorkers in Chrome Extensions

## Overview

Web Workers and SharedWorkers provide powerful background processing capabilities in Chrome Extensions, enabling you to run CPU-intensive tasks without blocking the main thread. This guide covers the essential patterns, differences from service workers, and practical implementation strategies for MV3.

## Service Workers vs Web Workers: Key Differences

Understanding the distinction between these worker types is critical for extension architecture:

| Aspect | Extension Service Worker | Web Worker | SharedWorker |
|--------|-------------------------|------------|--------------|
| Context | Background event handler | Isolated thread | Shared isolated thread |
| Lifecycle | Ephemeral, wakes on events | Created/destroyed by page | Persists while pages connected |
| Chrome APIs | Full access | No direct access | No direct access |
| DOM Access | None | None | None |
| Multiple Instances | One per extension | One per page/context | One across same-origin pages |
| Communication | chrome.runtime APIs | postMessage | postMessage |

The extension service worker (`background.service_worker`) is NOT a Web Worker, it's a special Chrome context that handles extension events. It cannot create Web Workers directly, but can spawn offscreen documents that can.

```javascript
//  This won't work in service worker
const worker = new Worker('worker.js'); // TypeError: Not supported

//  Use offscreen document instead
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['WORKERS'],
  justification: 'Background processing'
});
```

## Creating Web Workers from Extension Pages

Extension pages (popup, options, side panel) can create Web Workers using the standard API:

### Popup / Options Page

```javascript
// popup.js
const worker = new Worker(chrome.runtime.getURL('data-processor.js'));

// Send work to worker
worker.postMessage({
  type: 'process',
  payload: { data: largeDataset, options: { sort: true, limit: 100 } }
});

// Receive results
worker.onmessage = (event) => {
  const { success, result, error } = event.data;
  if (success) {
    renderResults(result);
  } else {
    console.error('Processing failed:', error);
  }
};

// Handle errors
worker.onerror = (error) => {
  console.error('Worker error:', error.message);
  worker.terminate();
};

// Cleanup when popup closes
window.addEventListener('unload', () => {
  worker.terminate();
});
```

### Side Panel

```javascript
// sidepanel.js
const worker = new Worker(chrome.runtime.getURL('analytics-worker.js'), {
  type: 'module'
});

worker.postMessage({ type: 'init', tabId: chrome.devtools?.inspectedWindow?.tabId });

worker.onmessage = (event) => {
  updateDashboard(event.data);
};
```

### Worker File (data-processor.js)

```javascript
// data-processor.js
self.onmessage = (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'process':
      try {
        const result = processData(payload.data, payload.options);
        self.postMessage({ success: true, result });
      } catch (error) {
        self.postMessage({ success: false, error: error.message });
      }
      break;
      
    case 'cancel':
      self.close();
      break;
  }
};

function processData(data, options) {
  let processed = data;
  
  if (options.filter) {
    processed = processed.filter(item => item.active);
  }
  
  if (options.sort) {
    processed = processed.sort((a, b) => b.score - a.score);
  }
  
  if (options.limit) {
    processed = processed.slice(0, options.limit);
  }
  
  return processed;
}
```

## SharedWorker for Sharing State Between Extension Pages

SharedWorkers allow multiple extension pages to share a single worker instance and communicate through it, perfect for sharing state across popup, options, and side panel.

### manifest.json Configuration

```json
{
  "name": "My Extension",
  "version": "1.0",
  "permissions": ["storage"],
  "web_accessible_resources": [
    {
      "resources": ["shared-worker.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Creating SharedWorker

```javascript
// In popup.js, options.js, or sidepanel.js
const sharedWorkerUrl = chrome.runtime.getURL('shared-worker.js');
const sharedWorker = new SharedWorker(sharedWorkerUrl, {
  type: 'module',
  name: 'extension-shared-worker'
});

// Listen for messages from SharedWorker
sharedWorker.port.onmessage = (event) => {
  console.log('From SharedWorker:', event.data);
};

// Send messages to SharedWorker
sharedWorker.port.postMessage({ type: 'getState' });

// Start the port
sharedWorker.port.start();
```

### SharedWorker Implementation

```javascript
// shared-worker.js
// This runs in a single shared context across all extension pages

// Shared state
let extensionState = {
  user: null,
  settings: {},
  cache: new Map()
};

// Track connected ports
const connectedPorts = new Set();

self.onconnect = (event) => {
  const port = event.ports[0];
  connectedPorts.add(port);
  
  // Send current state to new connection
  port.postMessage({ type: 'stateUpdate', state: extensionState });
  
  port.onmessage = async (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
      case 'getState':
        port.postMessage({ type: 'stateUpdate', state: extensionState });
        break;
        
      case 'setUser':
        extensionState.user = payload;
        broadcastState();
        break;
        
      case 'updateSettings':
        extensionState.settings = { ...extensionState.settings, ...payload };
        broadcastState();
        break;
        
      case 'requestStorage':
        // Workers can't access chrome.storage directly
        // But can be called via message from extension context
        port.postMessage({ 
          type: 'storageResponse', 
          data: extensionState.cache.get('storage') 
        });
        break;
        
      case 'cacheData':
        extensionState.cache.set(payload.key, payload.data);
        break;
    }
  };
  
  port.onmessageerror = () => {
    connectedPorts.delete(port);
  };
};

function broadcastState() {
  connectedPorts.forEach(port => {
    try {
      port.postMessage({ type: 'stateUpdate', state: extensionState });
    } catch (e) {
      // Port might be disconnected
      connectedPorts.delete(port);
    }
  });
}
```

### State Synchronization Across Pages

```javascript
// shared-store.js - Utility for extension pages
class SharedStore {
  constructor() {
    this.worker = new SharedWorker(chrome.runtime.getURL('shared-worker.js'), {
      name: 'extension-shared-store'
    });
    this.worker.port.start();
    this.listeners = new Set();
    
    this.worker.port.onmessage = (event) => {
      if (event.data.type === 'stateUpdate') {
        this.listeners.forEach(cb => cb(event.data.state));
      }
    };
  }
  
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  getState() {
    return new Promise((resolve) => {
      const handler = (event) => {
        if (event.data.type === 'stateUpdate') {
          this.worker.port.removeEventListener('message', handler);
          resolve(event.data.state);
        }
      };
      this.worker.port.addEventListener('message', handler);
      this.worker.port.postMessage({ type: 'getState' });
    });
  }
  
  setUser(user) {
    this.worker.port.postMessage({ type: 'setUser', payload: user });
  }
  
  updateSettings(settings) {
    this.worker.port.postMessage({ type: 'updateSettings', payload: settings });
  }
}

// Usage in popup.js
const store = new SharedStore();
store.subscribe((state) => {
  document.getElementById('user').textContent = state.user?.name;
});
```

## Offscreen Documents as DOM-Capable Workers

Offscreen documents provide a background context with DOM access, bridge the gap between service workers and web workers:

```json
{
  "permissions": ["offscreen"]
}
```

### Creating Offscreen Document

```javascript
// background.js (service worker)
async function createProcessingDocument() {
  // Check if already exists
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')]
  });
  
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['WORKERS', 'DOM'],
      justification: 'Heavy data processing and DOM manipulation'
    });
  }
}

// Send message to offscreen document
async function processInOffscreen(data) {
  await createProcessingDocument();
  
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    
    channel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data.result);
      }
    };
    
    chrome.runtime.sendMessage({
      type: 'processData',
      data: data
    }, { port: channel.port2 });
  });
}
```

### Offscreen Document Implementation

```html
<!-- offscreen.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="offscreen.js"></script>
</head>
<body>
  <canvas id="canvas"></canvas>
</body>
</html>
```

```javascript
// offscreen.js
let worker = null;

// Initialize worker
worker = new Worker(chrome.runtime.getURL('image-processor.js'));

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'processData') {
    worker.postMessage(message.data);
    
    worker.onmessage = (event) => {
      sendResponse({ result: event.data });
    };
    
    return true; // Keep message channel open for async response
  }
  
  if (message.type === 'processImage') {
    processImage(message.imageData);
    return true;
  }
});

async function processImage(imageData) {
  // Can use canvas in offscreen document!
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  
  const bitmap = await createImageBitmap(imageData);
  ctx.drawImage(bitmap, 0, 0);
  
  // Apply filters using worker
  worker.postMessage({ 
    type: 'filter', 
    canvasData: ctx.getImageData(0, 0, canvas.width, canvas.height) 
  });
  
  worker.onmessage = (event) => {
    ctx.putImageData(event.data, 0, 0);
    canvas.convertToBlob().then(blob => {
      chrome.runtime.sendMessage({ 
        type: 'imageProcessed', 
        blob: blob 
      });
    });
  };
}
```

## Communication Patterns: postMessage and MessageChannel

### Basic postMessage

```javascript
// Main thread
const worker = new Worker('worker.js');

worker.postMessage({ type: 'start', data: 'hello' });

worker.onmessage = (event) => {
  console.log('Received:', event.data);
};

// Worker
self.onmessage = (event) => {
  if (event.data.type === 'start') {
    self.postMessage({ type: 'response', data: 'world' });
  }
};
```

### MessageChannel for Direct Communication

MessageChannel creates a direct channel between two contexts, useful for popup-to-content-script communication:

```javascript
// popup.js
const channel = new MessageChannel();

// Create port for popup
const popupPort = channel.port1;

// Send port to service worker
chrome.runtime.sendMessage({
  type: 'connectContentScript',
  port: channel.port2
}, { port: popupPort });

popupPort.onmessage = (event) => {
  console.log('From content script:', event.data);
};

popupPort.postMessage({ type: 'ping' });
```

### BroadcastChannel for Same-Origin Communication

```javascript
// BroadcastChannel works across extension pages with same origin
const channel = new BroadcastChannel('extension-events');

channel.postMessage({ type: 'userLoggedIn', user: { id: 1, name: 'John' } });

channel.onmessage = (event) => {
  console.log('Broadcast received:', event.data);
};
```

### Transferable Objects for Performance

```javascript
// Main thread - transfer ArrayBuffer ownership
const largeBuffer = new Uint8Array(1000000).buffer;

worker.postMessage(
  { type: 'process', buffer: largeBuffer },
  [largeBuffer] // Transfer ownership - buffer becomes unusable here
);

// Worker
self.onmessage = (event) => {
  const buffer = event.data.buffer; // Already in worker memory
  // Process...
  
  // Transfer back
  self.postMessage({ type: 'done', buffer }, [buffer]);
};
```

## Use Cases

### Heavy Computation

```javascript
// computation-worker.js
self.onmessage = (event) => {
  const { numbers, operation } = event.data;
  
  let result;
  switch (operation) {
    case 'sum':
      result = numbers.reduce((a, b) => a + b, 0);
      break;
    case 'fibonacci':
      result = fibonacci(numbers[0]);
      break;
    case 'prime':
      result = findPrimes(numbers[0], numbers[1]);
      break;
  }
  
  self.postMessage({ result });
};

function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

function findPrimes(start, end) {
  const primes = [];
  for (let i = start; i <= end; i++) {
    if (isPrime(i)) primes.push(i);
  }
  return primes;
}

function isPrime(n) {
  if (n <= 1) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}
```

### Image Processing

```javascript
// image-worker.js
self.onmessage = (event) => {
  const { imageData, filters } = event.data;
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    if (filters.grayscale) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = data[i + 1] = data[i + 2] = avg;
    }
    
    if (filters.brightness) {
      data[i] = Math.min(255, data[i] * filters.brightness);
      data[i + 1] = Math.min(255, data[i + 1] * filters.brightness);
      data[i + 2] = Math.min(255, data[i + 2] * filters.brightness);
    }
    
    if (filters.contrast) {
      const factor = (259 * (filters.contrast + 255)) / (255 * (259 - filters.contrast));
      data[i] = Math.min(255, factor * (data[i] - 128) + 128);
      data[i + 1] = Math.min(255, factor * (data[i + 1] - 128) + 128);
      data[i + 2] = Math.min(255, factor * (data[i + 2] - 128) + 128);
    }
  }
  
  self.postMessage({ imageData });
};
```

### Data Parsing

```javascript
// parser-worker.js
self.onmessage = (event) => {
  const { content, format, options } = event.data;
  
  let parsed;
  try {
    switch (format) {
      case 'json':
        parsed = parseJSON(content, options);
        break;
      case 'csv':
        parsed = parseCSV(content, options);
        break;
      case 'xml':
        parsed = parseXML(content, options);
        break;
    }
    self.postMessage({ success: true, data: parsed });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};

function parseJSON(content, options) {
  const data = JSON.parse(content);
  
  if (options.transform) {
    return data.map(item => options.transform(item));
  }
  
  return data;
}

function parseCSV(content, options) {
  const lines = content.split('\n');
  const headers = lines[0].split(options.delimiter || ',');
  
  return lines.slice(1).map(line => {
    const values = line.split(options.delimiter || ',');
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i]?.trim();
      return obj;
    }, {});
  });
}
```

## Limitations in MV3

- No Web Workers in Service Worker: Cannot create Web Workers directly in the background service worker
- No Direct Chrome API Access: Workers must communicate via message passing
- Memory Limits: Each extension has memory limits; workers count against this
- No DOM Access: Workers cannot access the DOM; use offscreen documents for DOM tasks
- File URL Restrictions: Worker files must be extension resources, not arbitrary URLs
- Extension Context: Workers share the extension's origin but have isolated JavaScript contexts
- Module Workers: Must use `{ type: 'module' }` for import statements

## Related Guides

- [Offscreen Documents](../mv3/offscreen-documents.md)
- [Message Passing Best Practices](message-passing-best-practices.md)
- [Performance Optimization](performance-optimization.md)
- [Background Service Worker Patterns](background-patterns.md)
