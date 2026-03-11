---
layout: post
title: "Chrome Extension Text-to-Speech (TTS) API: Build a Screen Reader"
description: "Learn how to build a chrome extension text to speech screen reader using the chrome.tts API. Complete guide with code examples for chrome extension read aloud functionality."
date: 2025-03-29
categories: [Chrome-Extensions, APIs]
tags: [tts, text-to-speech, chrome-extension]
keywords: "chrome extension text to speech, tts API chrome extension, chrome extension read aloud, screen reader chrome extension, chrome.tts API guide"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/03/29/chrome-extension-text-to-speech-tts-api/"
---

# Chrome Extension Text-to-Speech (TTS) API: Build a Screen Reader

Text-to-speech technology has revolutionized how we interact with digital content. For users with visual impairments, learning disabilities, or those who simply prefer listening to reading, screen readers have become indispensable tools. In this comprehensive guide, we will explore how to build a powerful Chrome extension text to speech feature using the chrome.tts API, enabling you to create a fully functional screen reader directly in your browser.

The chrome.tts API provides developers with a robust interface to synthesize spoken audio from text, opening up possibilities for accessibility tools, language learning applications, and productivity extensions. Whether you want to create a simple chrome extension read aloud button or a sophisticated screen reader chrome extension, this guide will walk you through every step of the development process.

---

## Understanding the Chrome TTS API {#understanding-chrome-tts-api}

The chrome.tts API is one of Chrome's most powerful accessibility features, allowing extensions to speak text using the operating system's speech synthesis capabilities. Before diving into code, it's essential to understand the architecture and capabilities of this API.

### What is chrome.tts?

The chrome.tts API is a programmatic interface that enables Chrome extensions to convert text into spoken words. This API leverages the device's built-in speech synthesis engine, which means it works out of the box without requiring any external services or additional installations. The API supports various languages and voice options, making it versatile for international applications.

When you call chrome.tts.speak(), the API sends your text to the system's speech synthesis engine, which generates audio output. This process happens entirely on the client side, ensuring low latency and offline functionality. The API also provides events to track speech progress, handle errors, and control playback.

### Key Features of the TTS API

The chrome.tts API offers several powerful features that make it ideal for building screen readers. First, it supports voice selection, allowing you to choose from multiple installed voices with different accents and genders. Second, you can control speech rate and pitch, enabling customization for different user preferences. Third, the API provides event callbacks for monitoring speech status, which is crucial for building responsive user interfaces.

Another significant feature is the ability to enqueue multiple utterances. This means you can queue several text segments, and the API will speak them in sequence without overlapping. For a screen reader that needs to read multiple elements or paragraphs, this feature is essential. Additionally, the API supports SSML (Speech Synthesis Markup Language), which enables fine-grained control over pronunciation, emphasis, and pacing.

### Browser Compatibility and Requirements

The chrome.tts API is available in all modern Chromium-based browsers, including Google Chrome, Edge, and Brave. However, it's important to note that this API requires the "tts" permission in your manifest file. Without proper permission declarations, the API calls will fail silently or throw errors.

For the best user experience, ensure your extension handles cases where speech synthesis might not be available. While rare, some systems may have limited or no TTS support. Your code should include appropriate error handling to inform users when speech is unavailable and potentially offer alternative solutions.

---

## Setting Up Your Chrome Extension Project {#setting-up-chrome-extension-project}

Now that you understand the chrome.tts API fundamentals, let's set up the project structure for our screen reader extension. We'll create a complete Chrome extension with all the necessary components.

### Creating the Manifest File

Every Chrome extension begins with a manifest.json file that defines the extension's properties, permissions, and components. For our text-to-speech screen reader, we'll need to declare the "tts" permission and specify the extension's background script and popup interface.

```json
{
  "manifest_version": 3,
  "name": "TTS Screen Reader",
  "version": "1.0",
  "description": "A powerful text-to-speech screen reader for Chrome",
  "permissions": [
    "tts",
    "activeTab",
    "scripting"
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
  }
}
```

The manifest_version 3 is the current standard for Chrome extensions, offering improved security and performance. The "tts" permission is crucial—without it, our extension cannot access the speech synthesis API. The "activeTab" and "scripting" permissions allow us to read content from the current page and inject scripts when needed.

### Project Directory Structure

Create a well-organized directory structure for your extension. This organization makes maintenance easier and helps other developers understand your code. Here's the recommended structure:

```
tts-screen-reader/
├── manifest.json
├── background.js
├── popup.html
├── popup.js
├── content.js
├── styles.css
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

The background.js file handles the service worker, which runs in the background and manages extension-wide state. The popup files create the user interface that appears when clicking the extension icon. Content scripts like content.js run in the context of web pages, allowing us to extract text for speech synthesis.

---

## Building the Core TTS Functionality {#building-core-tts-functionality}

With the project structure in place, let's implement the core text-to-speech functionality. We'll create reusable functions that handle speaking text, managing voices, and controlling speech parameters.

### Initializing the TTS Engine

Before speaking any text, we need to ensure the TTS engine is properly initialized. This involves checking available voices and setting default parameters. Here's a comprehensive initialization function:

```javascript
// background.js - Core TTS initialization

let selectedVoice = null;
let speechRate = 1.0;
let speechPitch = 1.0;
let speechVolume = 1.0;

// Get all available voices
function getVoices() {
  return new Promise((resolve) => {
    chrome.tts.getVoices((voices) => {
      resolve(voices);
    });
  });
}

// Initialize and select a default voice
async function initializeTTS() {
  const voices = await getVoices();
  
  // Prefer English voices by default
  const englishVoice = voices.find(v => v.lang.startsWith('en'));
  selectedVoice = englishVoice || voices[0];
  
  console.log('TTS initialized with voice:', selectedVoice?.name);
}

// Listen for voice changes
chrome.tts.onVoicesChanged.addListener(async () => {
  await initializeTTS();
});

// Initialize on load
initializeTTS();
```

This initialization code runs when the extension loads, automatically detecting available voices and selecting an appropriate default. The voice selection logic prefers English voices but falls back to any available voice if English isn't found.

### Speaking Text with the Chrome TTS API

The core function for speaking text uses chrome.tts.speak(). This function accepts the text to speak and an options object that controls how the text is spoken:

```javascript
// Function to speak text
function speakText(text, options = {}) {
  const speakOptions = {
    voiceName: selectedVoice?.name,
    rate: options.rate || speechRate,
    pitch: options.pitch || speechPitch,
    volume: options.volume || speechVolume,
    onStart: () => {
      console.log('Speech started');
      updateStatus('speaking');
    },
    onEnd: () => {
      console.log('Speech finished');
      updateStatus('idle');
    },
    onError: (error) => {
      console.error('Speech error:', error);
      updateStatus('error');
    },
    onWord: (charIndex, charCount) => {
      // Track word progress for highlighting
      console.log(`Word ${charIndex} of ${charCount}`);
    }
  };

  chrome.tts.speak(text, speakOptions);
}

// Stop current speech
function stopSpeaking() {
  chrome.tts.stop();
  updateStatus('idle');
}

// Pause speech (if supported)
function pauseSpeaking() {
  chrome.tts.pause();
}

// Resume speech
function resumeSpeaking() {
  chrome.tts.resume();
}
```

The options object provides extensive control over speech output. The onStart, onEnd, onError, and onWord callbacks allow you to build responsive interfaces that reflect the current speech state. This is particularly important for screen readers, where users need visual feedback about what's being spoken.

### Handling Voice Selection

For a complete screen reader experience, users should be able to choose their preferred voice. Here's how to implement voice selection:

```javascript
// Get available voices and send to popup
function getAvailableVoices() {
  return new Promise((resolve) => {
    chrome.tts.getVoices((voices) => {
      const voiceList = voices.map(voice => ({
        name: voice.name,
        lang: voice.lang,
        gender: voice.gender
      }));
      resolve(voiceList);
    });
  });
}

// Set the active voice
function setVoice(voiceName) {
  chrome.tts.getVoices((voices) => {
    selectedVoice = voices.find(v => v.name === voiceName);
    console.log('Voice changed to:', selectedVoice?.name);
  });
}

// Set speech rate (0.1 to 10.0)
function setRate(rate) {
  speechRate = Math.max(0.1, Math.min(10.0, rate));
}

// Set speech pitch (0.0 to 2.0)
function setPitch(pitch) {
  speechPitch = Math.max(0.0, Math.min(2.0, pitch));
}

// Set speech volume (0.0 to 1.0)
function setVolume(volume) {
  speechVolume = Math.max(0.0, Math.min(1.0, volume));
}
```

These functions allow complete customization of the speech output. A good screen reader should remember user preferences, so consider storing these settings in chrome.storage for persistence across sessions.

---

## Extracting Text from Web Pages {#extracting-text-from-web-pages}

A screen reader needs to extract text content from web pages. This is where content scripts come in. We'll create a content script that can extract selected text, entire page content, or specific elements.

### Reading Selected Text

The most common use case is reading text that the user has selected. Here's how to implement this:

```javascript
// content.js - Extract selected text

function getSelectedText() {
  const selection = window.getSelection();
  return selection.toString().trim();
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSelectedText') {
    const text = getSelectedText();
    sendResponse({ text: text });
  }
  return true;
});
```

This simple function gets the user's current text selection and returns it to the extension. The message passing system allows communication between content scripts and the background service worker.

### Extracting Full Page Content

For a comprehensive screen reader, you might want to read the entire page. Here's a more sophisticated extraction function:

```javascript
// Extract readable text from the page
function getPageContent() {
  // Remove script and style elements
  const clone = document.body.cloneNode(true);
  const scripts = clone.querySelectorAll('script, style, nav, footer, aside');
  scripts.forEach(el => el.remove());

  // Get main content areas
  const mainContent = clone.querySelector('main, article, [role="main"]');
  
  if (mainContent) {
    return cleanText(mainContent.textContent);
  }
  
  // Fallback to body text
  return cleanText(clone.textContent);
}

// Clean and format extracted text
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/\n\s*\n/g, '\n\n')  // Preserve paragraph breaks
    .trim();
}

// Extract headings for navigation
function getHeadings() {
  const headings = [];
  const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  
  elements.forEach((el, index) => {
    headings.push({
      level: parseInt(el.tagName.substring(1)),
      text: el.textContent.trim(),
      id: index
    });
  });
  
  return headings;
}
```

This code extracts the main content while filtering out navigation, scripts, and other non-essential elements. The getHeadings() function is particularly useful for building a table of contents, allowing users to navigate by headings.

### Reading Specific Elements

For advanced functionality, users might want to read specific elements like paragraphs, links, or form labels:

```javascript
// Read all paragraphs
function getParagraphs() {
  const paragraphs = document.querySelectorAll('p');
  return Array.from(paragraphs)
    .map(p => p.textContent.trim())
    .filter(text => text.length > 0);
}

// Read all links
function getLinks() {
  const links = document.querySelectorAll('a');
  return Array.from(links)
    .map(link => ({
      text: link.textContent.trim(),
      url: link.href
    }))
    .filter(link => link.text.length > 0);
}

// Read form labels
function getFormLabels() {
  const labels = [];
  const inputs = document.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    const label = input.labels?.[0]?.textContent || 
                  input.getAttribute('aria-label') ||
                  input.getAttribute('placeholder') ||
                  input.name;
    if (label) {
      labels.push({
        type: input.type,
        label: label.trim()
      });
    }
  });
  
  return labels;
}
```

These extraction functions enable a truly comprehensive screen reader that can read various types of content. Combined with voice selection and playback controls, you have all the building blocks for a production-quality extension.

---

## Building the User Interface {#building-user-interface}

Now let's create the popup interface that users will interact with. This interface provides controls for playback, voice selection, and speed adjustment.

### The Popup HTML

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>TTS Screen Reader</h1>
    
    <div class="controls">
      <button id="playBtn" class="btn primary">Play</button>
      <button id="pauseBtn" class="btn">Pause</button>
      <button id="stopBtn" class="btn">Stop</button>
    </div>
    
    <div class="settings">
      <label>
        Voice:
        <select id="voiceSelect"></select>
      </label>
      
      <label>
        Rate: <span id="rateValue">1.0</span>
        <input type="range" id="rateSlider" min="0.5" max="2" step="0.1" value="1">
      </label>
      
      <label>
        Pitch: <span id="pitchValue">1.0</span>
        <input type="range" id="pitchSlider" min="0.5" max="2" step="0.1" value="1">
      </label>
      
      <label>
        Volume: <span id="volumeValue">1.0</span>
        <input type="range" id="volumeSlider" min="0" max="1" step="0.1" value="1">
      </label>
    </div>
    
    <div class="status">
      <span id="statusText">Ready</span>
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

This HTML provides a clean, functional interface with playback controls and settings. The range sliders allow users to adjust speech parameters in real-time.

### The Popup JavaScript

```javascript
// popup.js - Handle UI interactions

document.addEventListener('DOMContentLoaded', async () => {
  // Get UI elements
  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const voiceSelect = document.getElementById('voiceSelect');
  const rateSlider = document.getElementById('rateSlider');
  const pitchSlider = document.getElementById('pitchSlider');
  const volumeSlider = document.getElementById('volumeSlider');
  const statusText = document.getElementById('statusText');
  
  // Load available voices
  const loadVoices = () => {
    chrome.tts.getVoices((voices) => {
      voiceSelect.innerHTML = '';
      voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
      });
    });
  };
  
  loadVoices();
  chrome.tts.onVoicesChanged.addListener(loadVoices);
  
  // Play button - get selected text and speak
  playBtn.addEventListener('click', async () => {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script to get selected text
    chrome.tabs.sendMessage(tab.id, { action: 'getSelectedText' }, (response) => {
      if (response && response.text) {
        chrome.runtime.sendMessage({
          action: 'speak',
          text: response.text,
          voice: voiceSelect.value,
          rate: parseFloat(rateSlider.value),
          pitch: parseFloat(pitchSlider.value),
          volume: parseFloat(volumeSlider.value)
        });
        statusText.textContent = 'Speaking...';
      } else {
        statusText.textContent = 'No text selected';
      }
    });
  });
  
  // Stop button
  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stop' });
    statusText.textContent = 'Stopped';
  });
  
  // Pause button
  pauseBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'pause' });
    statusText.textContent = 'Paused';
  });
  
  // Update rate display
  rateSlider.addEventListener('input', (e) => {
    document.getElementById('rateValue').textContent = e.target.value;
  });
  
  // Update pitch display
  pitchSlider.addEventListener('input', (e) => {
    document.getElementById('pitchValue').textContent = e.target.value;
  });
  
  // Update volume display
  volumeSlider.addEventListener('input', (e) => {
    document.getElementById('volumeValue').textContent = e.target.value;
  });
});
```

The popup JavaScript handles user interactions and communicates with the background script. It retrieves selected text from the active tab and sends it for speech synthesis.

---

## Advanced Features and Best Practices {#advanced-features-best-practices}

Now let's explore advanced features that will make your screen reader truly professional and user-friendly.

### SSML Support for Better Speech

SSML (Speech Synthesis Markup Language) enables fine-grained control over speech output. Chrome supports a subset of SSML tags that can improve the naturalness of synthesized speech:

```javascript
// Using SSML for enhanced speech
function speakWithSSML(text) {
  const ssmlText = `
    <speak>
      <prosody rate="1.0" pitch="0Hz">
        ${text}
      </prosody>
      <break time="500ms"/>
      <emphasis level="moderate">This is important!</emphasis>
    </speak>
  `;
  
  chrome.tts.speak(ssmlText, {
    ssml: true,
    onStart: () => console.log('SSML speech started'),
    onEnd: () => console.log('SSML speech ended')
  });
}

// Add punctuation pauses
function speakWithPunctuation(text) {
  // Add natural pauses for punctuation
  const formatted = text
    .replace(/([.!?])\s*/g, '$1<break time="300ms"/>')
    .replace(/([,;:])\s*/g, '$1<break time="150ms"/>');
  
  chrome.tts.speak(formatted, { ssml: true });
}
```

SSML allows you to add pauses, emphasize words, control pitch and rate dynamically, and produce much more natural-sounding speech. This is particularly valuable for accessibility applications where clarity is essential.

### Keyboard Shortcuts for Power Users

Power users appreciate keyboard shortcuts for quick access to functionality. Here's how to implement them:

```javascript
// background.js - Keyboard shortcuts

chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case 'toggle-speech':
      toggleSpeech();
      break;
    case 'stop-speech':
      chrome.tts.stop();
      break;
    case 'read-selection':
      readSelectedText();
      break;
    case 'read-page':
      readFullPage();
      break;
  }
});
```

Add keyboard shortcut definitions to your manifest:

```json
"commands": {
  "toggle-speech": {
    "suggested_key": {
      "default": "Ctrl+Shift+S",
      "mac": "Command+Shift+S"
    },
    "description": "Toggle speech playback"
  },
  "stop-speech": {
    "suggested_key": {
      "default": "Ctrl+Shift+X",
      "mac": "Command+Shift+X"
    },
    "description": "Stop speech"
  },
  "read-selection": {
    "suggested_key": {
      "default": "Ctrl+Shift+R",
      "mac": "Command+Shift+R"
    },
    "description": "Read selected text"
  }
}
```

### Error Handling and User Feedback

Robust error handling is essential for a production-quality extension:

```javascript
// Comprehensive error handling
function speakWithErrorHandling(text, options = {}) {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!text || text.trim().length === 0) {
      reject(new Error('No text provided'));
      return;
    }
    
    // Check if TTS is available
    chrome.tts.isSpeaking((isSpeaking) => {
      if (isSpeaking && options.interrupt) {
        chrome.tts.stop();
      }
    });
    
    chrome.tts.speak(text, {
      ...options,
      onEvent: (event) => {
        if (event.type === 'error') {
          reject(new Error(event.errorMessage || 'Unknown TTS error'));
        } else if (event.type === 'end') {
          resolve();
        }
        // Call original onEvent if provided
        if (options.onEvent) {
          options.onEvent(event);
        }
      }
    });
  });
}
```

---

## Testing and Deployment {#testing-deployment}

Before releasing your extension, thorough testing ensures a smooth user experience.

### Testing Your Extension

Load your extension in Chrome by navigating to chrome://extensions/, enabling Developer mode, and clicking "Load unpacked". Test all features including voice selection, speed adjustment, text extraction, and error handling.

### Publishing to the Chrome Web Store

Once testing is complete, you can publish your extension:

1. Create a ZIP file of your extension directory
2. Go to the Chrome Developer Dashboard
3. Create a new item and upload your ZIP file
4. Add screenshots, descriptions, and category information
5. Submit for review

Ensure your extension complies with Chrome Web Store policies, particularly regarding accessibility features and user data handling.

---

## Conclusion {#conclusion}

Building a Chrome extension text-to-speech screen reader is a rewarding project that can make the web more accessible. The chrome.tts API provides powerful capabilities for synthesizing speech, while content scripts enable extracting text from any web page. By following this guide, you've learned how to create a complete extension with voice selection, playback controls, keyboard shortcuts, and robust error handling.

The screen reader you built can be extended in many ways: adding support for multiple languages, implementing bookmarking for long articles, integrating with translation APIs, or creating custom pronunciation dictionaries. The possibilities are endless, and the chrome.tts API provides a solid foundation for any text-to-speech application.

Remember that accessibility is not just a feature—it's a necessity for many users. By building this screen reader, you're helping make the web more inclusive. Continue refining your extension based on user feedback, and consider contributing to open-source accessibility projects to further improve the experience for everyone.
