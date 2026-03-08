---
layout: default
title: "Chrome TTS API Complete Reference"
description: "The Chrome TTS API synthesizes speech using the operating system's text-to-speech engine, with fine-grained control over voice selection, rate, pitch, and event handling."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/api-reference/tts-api/"
---

# chrome.tts API Reference

The `chrome.tts` API enables extensions to synthesize speech using the operating system's text-to-speech engine. This API is particularly useful for accessibility features, read-aloud functionality, language learning applications, and audio notifications.

## Overview {#overview}

The Text-to-Speech (TTS) API allows Chrome extensions to convert text into spoken words. The API provides fine-grained control over voice selection, speech rate, pitch, volume, and event handling for synchronized visual highlighting.

**Permission Required:** Add `"tts"` to the `permissions` array in your `manifest.json`:

```json
{
  "permissions": ["tts"]
}
```

The API uses the system's available TTS voices, which vary by operating system and installed language packs.

## API Methods {#api-methods}

### chrome.tts.speak() {#chromettsspeak}

Speaks text using the TTS engine.

```javascript
chrome.tts.speak(utterance, options?, callback?)
```

**Parameters:**
- `utterance` (string): The text to speak.
- `options` (optional object): Speech options including:
  - `voiceName` (string): The name of the voice to use.
  - `lang` (string): The language code (e.g., "en-US", "es-ES").
  - `rate` (number): Speech rate from 0.1 to 10 (default: 1).
  - `pitch` (number): Pitch from 0 to 2 (default: 1).
  - `volume` (number): Volume from 0 to 1 (default: 1).
  - `enqueue` (boolean): If true, appends to the queue instead of interrupting.
  - `onEvent` (function): Callback for speech events.
- `callback` (optional function): Called when speaking begins.

**Example:**
```javascript
chrome.tts.speak('Hello, world!', {
  voiceName: 'Google US English',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0
}, () => {
  if (chrome.runtime.lastError) {
    console.error('TTS Error:', chrome.runtime.lastError);
  }
});
```

### chrome.tts.stop() {#chromettsstop}

Immediately stops any ongoing speech and clears the queue.

```javascript
chrome.tts.stop()
```

**Example:**
```javascript
// Stop speaking after 3 seconds
setTimeout(() => {
  chrome.tts.stop();
}, 3000);
```

### chrome.tts.pause() {#chromettspause}

Pauses speech synthesis. Note: Not all TTS engines support pausing.

```javascript
chrome.tts.pause()
```

### chrome.tts.resume() {#chromettsresume}

Resumes paused speech.

```javascript
chrome.tts.resume()
```

### chrome.tts.isSpeaking() {#chromettsisspeaking}

Checks whether the TTS engine is currently speaking.

```javascript
chrome.tts.isSpeaking(callback)
```

**Parameters:**
- `callback` (function): Called with a boolean indicating if speaking.

**Example:**
```javascript
chrome.tts.isSpeaking((speaking) => {
  console.log('Currently speaking:', speaking);
});
```

### chrome.tts.getVoices() {#chromettsgetvoices}

Retrieves the list of available TTS voices.

```javascript
chrome.tts.getVoices(callback)
```

**Parameters:**
- `callback` (function): Called with an array of TtsVoice objects.

**Example:**
```javascript
chrome.tts.getVoices((voices) => {
  voices.forEach(voice => {
    console.log(`${voice.voiceName} (${voice.lang})`);
  });
});
```

## TtsVoice Object {#ttsvoice-object}

Represents a single available voice for speech synthesis.

**Properties:**
- `voiceName` (string): The name of the voice.
- `lang` (string): The language code (e.g., "en-US").
- `remote` (boolean): Whether the voice is a remote network voice.
- `extensionId` (string): ID of the extension providing this voice (if applicable).
- `eventTypes` (array): Supported event types for this voice.

**Example Voice Object:**
```javascript
{
  voiceName: 'Google US English',
  lang: 'en-US',
  remote: true,
  extensionId: 'none',
  eventTypes: ['start', 'end', 'word', 'sentence', 'marker']
}
```

## Speech Events {#speech-events}

The TTS API dispatches events during speech synthesis. Use the `onEvent` callback in `chrome.tts.speak()` to handle these events.

### Event Types {#event-types}

| Event | Description |
|-------|-------------|
| `"start"` | Fired when speech begins. |
| `"end"` | Fired when speech finishes. |
| `"word"` | Fired at the start of each word. Includes `charIndex` and `charLength`. |
| `"sentence"` | Fired at the start of each sentence. Includes `charIndex` and `charLength`. |
| `"marker"` | Fires at SSML markers. Includes `charIndex`. |
| `"interrupted"` | Fired when speech is interrupted by another speak() call or stop(). |
| `"cancelled"` | Fired when speech is removed from the queue before starting. |
| `"error"` | Fired when an error occurs. Includes error message. |

**Example with Event Handling:**
```javascript
chrome.tts.speak('Hello world, this is a test.', {
  onEvent: (event) => {
    if (event.type === 'word') {
      console.log(`Word: "${event.charIndex}"`);
    } else if (event.type === 'end') {
      console.log('Speech finished');
    } else if (event.type === 'error') {
      console.error('TTS Error:', event.errorMessage);
    }
  }
});
```

## Use Cases {#use-cases}

### Accessibility {#accessibility}
- Screen reader support for visually impaired users
- Audio feedback for keyboard navigation
- Voice prompts for complex interfaces

### Read-Aloud Features {#read-aloud-features}
- Reading articles or documents aloud
- Email and message readers
- E-book narration

### Language Learning {#language-learning}
- Pronunciation practice
- Listening comprehension exercises
- Vocabulary audio playback

### Audio Notifications {#audio-notifications}
- Silent push notification alternatives
- Background task completion alerts
- Time-based announcements

## Code Examples {#code-examples}

### Basic TTS Usage {#basic-tts-usage}

```javascript
function speakText(text) {
  chrome.tts.speak(text, () => {
    if (chrome.runtime.lastError) {
      console.error('TTS Error:', chrome.runtime.lastError.message);
    }
  });
}

speakText('Welcome to our extension!');
```

### Voice Selection {#voice-selection}

```javascript
function speakWithVoice(text, voiceName) {
  chrome.tts.getVoices((voices) => {
    const selectedVoice = voices.find(v => v.voiceName === voiceName);
    if (selectedVoice) {
      chrome.tts.speak(text, { voiceName: voiceName });
    } else {
      console.warn('Voice not found, using default');
      chrome.tts.speak(text);
    }
  });
}

speakWithVoice('Hello!', 'Google UK English Male');
```

### Queue Multiple Utterances {#queue-multiple-utterances}

```javascript
function speakQueue(messages) {
  messages.forEach((msg, index) => {
    chrome.tts.speak(msg, {
      enqueue: true,
      onEvent: (event) => {
        if (event.type === 'end' && index === messages.length - 1) {
          console.log('All messages spoken');
        }
      }
    });
  });
}

speakQueue(['First message', 'Second message', 'Third message']);
```

### Word Highlighting with Events {#word-highlighting-with-events}

```javascript
function speakWithHighlighting(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  
  chrome.tts.speak(text, {
    onEvent: (event) => {
      if (event.type === 'word') {
        const word = text.substring(event.charIndex, event.charIndex + event.charLength);
        highlightWord(word); // Custom function to highlight word in UI
        console.log('Current word:', word);
      }
    }
  });
}

function highlightWord(word) {
  // Implementation depends on your UI
  console.log('Highlighting:', word);
}
```

## Cross-References {#cross-references}

- [TTS Permission](../permissions/tts.md) - Configuration and permission details
- [TTS Engine Permission](../permissions/ttsEngine.md) - Custom TTS engine development
- [Accessibility Guide](../guides/accessibility.md) - Building accessible extensions
- [chrome.ttsEngine API](https://developer.chrome.com/docs/extensions/reference/ttsEngine) - Custom TTS engine implementation
