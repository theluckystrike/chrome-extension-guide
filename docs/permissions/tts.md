# tts Permission — Chrome Extension Reference

## Overview
- **Permission string**: `"tts"` (consumer) or `"ttsEngine"` (provider)
- **What it grants**: `tts` — use `chrome.tts` to speak text aloud; `ttsEngine` — register as speech engine
- **Risk level**: Low — audio output only, no user data access
- `@theluckystrike/webext-permissions`: `describePermission('tts')`

## manifest.json
```json
{ "permissions": ["tts"] }
```
For engine providers: add `"ttsEngine"` permission + `"tts_engine"` manifest key with voice definitions.

## Key APIs — chrome.tts

### speak(text, options?, callback?)
```javascript
chrome.tts.speak("Hello!", {
  lang: "en-US", rate: 1.0, pitch: 1.0, volume: 1.0,
  voiceName: "Google US English",
  onEvent: (e) => console.log(e.type, e.charIndex)
});
```
- Options: `lang`, `rate` (0.1-10), `pitch` (0-2), `volume` (0-1), `voiceName`, `enqueue`
- Events: `start`, `word`, `sentence`, `end`, `error`, `interrupted`, `cancelled`

### stop() / pause() / resume()
### isSpeaking(callback)
### getVoices(callback)
```javascript
chrome.tts.getVoices((voices) => {
  voices.forEach(v => console.log(v.voiceName, v.lang, v.remote));
});
```

## chrome.ttsEngine (Provider)
- `onSpeak` listener: receive text, synthesize, send events back
- `onStop` listener: stop current synthesis
- Register voices in manifest `tts_engine.voices` array

## Common Patterns

### Screen Reader
- Read selected text via context menu
- Highlight words as spoken using `word` events
- Store voice preferences with `@theluckystrike/webext-storage`

### Language Learning
- Speak foreign text with correct pronunciation
- Use `getVoices()` to find target language voices
- Adjustable speed with `rate`

### Accessibility Helper
- Auto-read page content
- Voice/rate/pitch preferences stored in sync storage

## Voice Selection Best Practices
- Check `getVoices()` first — voice names are system-specific
- Prefer local voices (`remote: false`) for speed
- Let users choose, store preference
- Fall back gracefully if voice unavailable

## Common Errors
- Voice not found — always check available voices first
- No concurrent speech — new `speak()` interrupts unless `enqueue: true`
- Text length — very long texts may be split internally
