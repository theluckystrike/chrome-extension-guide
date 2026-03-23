Text-to-Speech API Guide

Overview
The Chrome TTS API (`chrome.tts`) enables extensions to synthesize spoken text using the device's speech synthesis capabilities. This is powerful for accessibility features, language learning apps, and screen readers.

Key Capabilities
- Speak text with customizable voice parameters
- Stop or pause ongoing speech
- Query available voices
- Monitor speech events (word boundaries, completion, errors)

Required Permission
Add `"tts"` to your `manifest.json` permissions:
```json
{
  "permissions": ["tts"]
}
```

No special host permissions are required for basic TTS functionality.

chrome.tts.speak. Speaking Text

The primary method for speaking text with optional configuration:
```javascript
chrome.tts.speak(
  text: string,
  options?: TtsOptions,
  callback?: () => void
): void
```

Basic Usage
```javascript
// Simple speech
chrome.tts.speak('Hello, world!');

// With callback
chrome.tts.speak('Speech complete!', () => {
  if (chrome.runtime.lastError) {
    console.error('TTS Error:', chrome.runtime.lastError.message);
  }
});
```

Voice Options
The `TtsOptions` object supports these properties:
```javascript
const options = {
  voiceName: 'Google US English',      // Specific voice
  lang: 'en-US',                        // Language code
  rate: 1.0,                            // Speed (0.1 to 10.0)
  pitch: 1.0,                           // Pitch (0 to 2)
  volume: 1.0,                          // Volume (0 to 1)
  enqueue: false,                       // Queue or interrupt
  gender: 'male',                       // 'male' or 'female'
  eld: null,                            // Event listener for callbacks
  desiredEventProperty: null            // Request specific events
};

chrome.tts.speak('Customized speech!', options);
```

Enqueue vs Interrupt
```javascript
// Enqueue: wait for current speech to finish
chrome.tts.speak('First sentence.', { enqueue: true });
chrome.tts.speak('Second sentence.', { enqueue: true });

// Interrupt: stop current speech immediately
chrome.tts.speak('Important!', { enqueue: false }); // default
```

chrome.tts.stop. Stopping Speech

Immediately halts any ongoing or queued speech:
```javascript
chrome.tts.stop();

// Practical example: stop speech on user action
document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.tts.stop();
});
```

chrome.tts.pause and chrome.tts.resume

Pause and resume speech (if supported by the engine):
```javascript
// Pause
chrome.tts.pause();

// Resume
chrome.tts.resume();

// Check pause state
chrome.tts.isSpeaking((speaking) => {
  if (!speaking) {
    // May be paused or stopped
  }
});
```

chrome.tts.getVoices. Available Voices

Retrieve all available TTS voices on the system:
```javascript
chrome.tts.getVoices((voices) => {
  voices.forEach((voice) => {
    console.log('Voice:', voice.voiceName);
    console.log('Language:', voice.lang);
    console.log('Gender:', voice.gender);
    console.log('Extension ID:', voice.extensionId);
    console.log('Remote:', voice.remote);
  });
});
```

Voice Object Properties
```javascript
interface TtsVoice {
  voiceName: string;      // Display name
  lang: string;           // Language code (e.g., 'en-US')
  gender?: 'male' | 'female';
  extensionId?: string;   // Extension providing the voice
  remote?: boolean;      // True if hosted externally
  localService?: boolean; // True if provided locally
}
```

Filtering Voices
```javascript
chrome.tts.getVoices((voices) => {
  // Get English voices only
  const englishVoices = voices.filter(v => v.lang.startsWith('en'));
  
  // Get voices from a specific extension
  const extensionVoices = voices.filter(v => v.extensionId === 'my-ext-id');
});
```

chrome.tts.isSpeaking. Check Speech State

Determine if speech is currently in progress:
```javascript
chrome.tts.isSpeaking((speaking) => {
  if (speaking) {
    console.log('Currently speaking...');
  } else {
    console.log('Not speaking');
  }
});

// With promise (MV3 service worker)
async function checkSpeaking() {
  return new Promise((resolve) => {
    chrome.tts.isSpeaking(resolve);
  });
}
```

TtsEvent Types. Monitoring Speech

Events provide feedback during speech synthesis. Pass an `onEvent` callback in options:
```javascript
chrome.tts.speak('Hello world! Here is some text to speak.', {
  onEvent: (event) => {
    switch (event.type) {
      case 'start':
        console.log('Speech started');
        break;
        
      case 'word':
        console.log(`Word ${event.charIndex} to ${event.charIndex + event.length}`);
        break;
        
      case 'sentence':
        console.log('Sentence boundary reached');
        break;
        
      case 'end':
        console.log('Speech finished');
        break;
        
      case 'error':
        console.error('TTS Error:', event.errorMessage);
        break;
        
      case 'interrupted':
        console.log('Speech was interrupted');
        break;
        
      case 'cancelled':
        console.log('Speech was cancelled');
        break;
        
      case 'pause':
        console.log('Speech paused');
        break;
        
      case 'resume':
        console.log('Speech resumed');
        break;
    }
  }
});
```

Event Types Reference
| Event | Description |
|-------|-------------|
| `start` | Speech has started |
| `word` | Reached a word boundary; `charIndex` and `length` provided |
| `sentence` | Reached a sentence boundary |
| `end` | Speech completed successfully |
| `error` | An error occurred; `errorMessage` provides details |
| `interrupted` | Speech was interrupted by another speak call |
| `cancelled` | Speech was stopped before completion |
| `pause` | Speech was paused |
| `resume` | Speech was resumed |

Building a Screen Reader Extension

Here's a complete example of a basic screen reader:
```javascript
// background.js
let isEnabled = false;

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'speak') {
    speakText(message.text);
  } else if (message.action === 'stop') {
    chrome.tts.stop();
  } else if (message.action === 'toggle') {
    isEnabled = !isEnabled;
    if (!isEnabled) {
      chrome.tts.stop();
    }
    sendResponse({ enabled: isEnabled });
  }
});

function speakText(text, options = {}) {
  chrome.tts.stop();
  
  chrome.tts.speak(text, {
    rate: options.rate || 1.0,
    pitch: options.pitch || 1.0,
    voiceName: options.voiceName,
    lang: options.lang || 'en-US',
    onEvent: (event) => {
      if (event.type === 'error') {
        console.error('TTS Error:', event.errorMessage);
      }
    }
  });
}

// Content script to read selected text
// content.js
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection().toString();
  if (selection.length > 0) {
    chrome.runtime.sendMessage({
      action: 'speak',
      text: selection
    });
  }
});

// Keyboard shortcut listener
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'r') {
    const selection = window.getSelection().toString();
    chrome.runtime.sendMessage({
      action: 'speak',
      text: selection || 'No text selected'
    });
  }
});
```

Practical Examples

Reading Page Content
```javascript
function readPageHeadings() {
  const headings = document.querySelectorAll('h1, h2, h3');
  const text = Array.from(headings)
    .map((h, i) => `Heading ${i + 1}: ${h.textContent}`)
    .join('. ');
    
  chrome.tts.speak(text, {
    rate: 0.9,
    enqueue: false
  });
}
```

Custom Voice Selection UI
```javascript
function populateVoiceSelector(selectElement) {
  chrome.tts.getVoices((voices) => {
    voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${voice.voiceName} (${voice.lang})`;
      selectElement.appendChild(option);
    });
  });
  
  // Voices may load asynchronously
  chrome.tts.onVoicesChanged.addListener(() => {
    chrome.tts.getVoices(populateVoiceSelector);
  });
}
```

Reading Notifications
```javascript
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.storage.local.get([notificationId], (result) => {
    if (result[notificationId]) {
      chrome.tts.speak(result[notificationId], {
        lang: 'en-US'
      });
    }
  });
});
```

Browser Compatibility
- TTS API is supported in Chrome, Edge, and Opera
- Safari has partial support with `webkitSpeechSynthesis`
- Firefox has limited TTS support

Best Practices
1. Always check for errors using `chrome.runtime.lastError`
2. Provide visual feedback when speech starts/ends
3. Allow voice customization - not all voices are available everywhere
4. Handle interruptions gracefully - users may trigger new speech
5. Test with different rates - default rate may be too fast/slow

Reference
- Official Docs: https://developer.chrome.com/docs/extensions/reference/api/tts
- TtsOptions: https://developer.chrome.com/docs/extensions/reference/api/tts#type-TtsOptions
- TtsVoice: https://developer.chrome.com/docs/extensions/reference/api/tts#type-TtsVoice
- TtsEvent: https://developer.chrome.com/docs/extensions/reference/api/tts#type-TtsEvent
