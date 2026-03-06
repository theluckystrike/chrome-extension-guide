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
- Max utterance length: 32,768 characters
- Events: `start`, `end`, `word`, `sentence`, `marker`, `interrupted`, `cancelled`, `error`, `pause`, `resume`

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

## Using with @theluckystrike/webext-permissions

```ts
import { checkPermission, requestPermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

const result = await checkPermission("tts");
console.log(result.description); // "Use text-to-speech"
console.log(result.granted);

PERMISSION_DESCRIPTIONS.tts; // "Use text-to-speech"

// If using optional_permissions
if (!result.granted) {
  const req = await requestPermission("tts");
  if (!req.granted) return;
}
```

## Using with @theluckystrike/webext-messaging

Pattern: popup or content script requests speech from the background:

```ts
type Messages = {
  speakText: {
    request: { text: string; lang?: string; rate?: number };
    response: { started: boolean };
  };
  stopSpeaking: {
    request: void;
    response: { stopped: boolean };
  };
  getAvailableVoices: {
    request: void;
    response: Array<{ voiceName: string; lang: string; remote: boolean }>;
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";
const msg = createMessenger<Messages>();

msg.onMessage({
  speakText: async ({ text, lang, rate }) => {
    chrome.tts.speak(text, {
      lang: lang || "en-US",
      rate: rate || 1.0,
      onEvent: (e) => {
        if (e.type === "error") console.error("TTS error:", e.errorMessage);
      },
    });
    return { started: true };
  },
  stopSpeaking: async () => {
    chrome.tts.stop();
    return { stopped: true };
  },
  getAvailableVoices: async () => {
    const voices = await chrome.tts.getVoices();
    return voices.map(v => ({
      voiceName: v.voiceName || "",
      lang: v.lang || "",
      remote: v.remote || false,
    }));
  },
});
```

## Using with @theluckystrike/webext-storage

Store voice preferences:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  preferredVoice: "",
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVolume: 1.0,
  preferLocalVoices: true,
});
const storage = createStorage({ schema });

// Apply user preferences when speaking
async function speakWithPreferences(text: string) {
  const voice = await storage.get("preferredVoice");
  const rate = await storage.get("speechRate");
  const pitch = await storage.get("speechPitch");
  const volume = await storage.get("speechVolume");

  chrome.tts.speak(text, {
    voiceName: voice || undefined,
    rate,
    pitch,
    volume,
  });
}

// Watch for preference changes from options page
storage.watch("speechRate", (newRate) => {
  console.log(`Speech rate changed to ${newRate}`);
});
```

## Practical Example: Read Selection Aloud

```ts
// background.ts — context menu + TTS integration
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "read-aloud",
    title: 'Read "%s" aloud',
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "read-aloud" && info.selectionText) {
    // Stop any current speech first
    chrome.tts.stop();

    const voices = await chrome.tts.getVoices();
    const localVoice = voices.find(v => !v.remote && v.lang?.startsWith("en"));

    chrome.tts.speak(info.selectionText, {
      voiceName: localVoice?.voiceName,
      rate: 1.0,
      enqueue: false,
      onEvent: (event) => {
        if (event.type === "end") {
          console.log("Finished reading selection");
        }
      },
    });
  }
});
```

## Gotchas
- **Voice names are system-specific** — never hardcode a voice name. Always check `getVoices()` first and fall back gracefully if the preferred voice is unavailable.
- **No concurrent speech by default** — calling `speak()` while speech is active interrupts it unless you pass `enqueue: true`. If you want queued playback, always set `enqueue`.
- **`getVoices()` may return empty on first call** — voices load asynchronously. If the list is empty, wait and retry, or listen for voice list changes with a short delay.
- **`rate` range differs by platform** — the spec says 0.1-10, but most engines only support a narrower range (e.g., 0.5-2.0). Values outside the engine's range are clamped silently.
- **SSML is supported** — `chrome.tts.speak()` accepts SSML markup. The first argument should be a complete SSML document with an XML header and a top-level `<speak>` tag. Engines that don't support specific SSML tags will ignore them and still speak the underlying text.

## Common Errors
- Voice not found — always check available voices first
- No concurrent speech — new `speak()` interrupts unless `enqueue: true`
- Text length — very long texts may be split internally

## Related
- [Chrome TTS API docs](https://developer.chrome.com/docs/extensions/reference/api/tts)
- [Chrome TTS Engine API docs](https://developer.chrome.com/docs/extensions/reference/api/ttsEngine)
- [contextMenus](contextMenus.md) — trigger TTS from right-click menu
- [storage](storage.md) — persist voice preferences
