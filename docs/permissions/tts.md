---
layout: default
title: "tts Permission — Chrome Extension Reference"
description: ": (consumer) or (provider) : — use to speak text aloud; — register as speech engine"
permalink: /permissions/tts/
category: permissions
order: 45
canonical_url: "https://bestchromeextensions.com/permissions/tts/"
---

# tts Permission — Chrome Extension Reference

## Overview {#overview}
- **Permission string**: `"tts"` (consumer) or `"ttsEngine"` (provider)
- **What it grants**: `tts` — use `chrome.tts` to speak text aloud; `ttsEngine` — register as speech engine
- **Risk level**: Low — audio output only, no user data access
- `@theluckystrike/webext-permissions`: `describePermission('tts')`

## manifest.json {#manifestjson}
```json
{ "permissions": ["tts"] }
```
For engine providers: add `"ttsEngine"` permission + `"tts_engine"` manifest key with voice definitions.

## Key APIs — chrome.tts {#key-apis-chrometts}

### speak(text, options?, callback?) {#speaktext-options-callback}
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

### stop() / pause() / resume() {#stop-pause-resume}
### isSpeaking(callback) {#isspeakingcallback}
### getVoices(callback) {#getvoicescallback}
```javascript
chrome.tts.getVoices((voices) => {
  voices.forEach(v => console.log(v.voiceName, v.lang, v.remote));
});
```

## chrome.ttsEngine (Provider) {#chromettsengine-provider}
- `onSpeak` listener: receive text, synthesize, send events back
- `onStop` listener: stop current synthesis
- Register voices in manifest `tts_engine.voices` array

## Common Patterns {#common-patterns}

### Screen Reader {#screen-reader}
- Read selected text via context menu
- Highlight words as spoken using `word` events
- Store voice preferences with `@theluckystrike/webext-storage`

### Language Learning {#language-learning}
- Speak foreign text with correct pronunciation
- Use `getVoices()` to find target language voices
- Adjustable speed with `rate`

### Accessibility Helper {#accessibility-helper}
- Auto-read page content
- Voice/rate/pitch preferences stored in sync storage

## Voice Selection Best Practices {#voice-selection-best-practices}
- Check `getVoices()` first — voice names are system-specific
- Prefer local voices (`remote: false`) for speed
- Let users choose, store preference
- Fall back gracefully if voice unavailable

## Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

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

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

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

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

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

## Practical Example: Read Selection Aloud {#practical-example-read-selection-aloud}

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

## Gotchas {#gotchas}
- **Voice names are system-specific** — never hardcode a voice name. Always check `getVoices()` first and fall back gracefully if the preferred voice is unavailable.
- **No concurrent speech by default** — calling `speak()` while speech is active interrupts it unless you pass `enqueue: true`. If you want queued playback, always set `enqueue`.
- **`getVoices()` may return empty on first call** — voices load asynchronously. If the list is empty, wait and retry, or listen for voice list changes with a short delay.
- **`rate` range differs by platform** — the spec says 0.1-10, but most engines only support a narrower range (e.g., 0.5-2.0). Values outside the engine's range are clamped silently.
- **SSML is supported** — `chrome.tts.speak()` accepts SSML markup. The first argument should be a complete SSML document with an XML header and a top-level `<speak>` tag. Engines that don't support specific SSML tags will ignore them and still speak the underlying text.

## Common Errors {#common-errors}
- Voice not found — always check available voices first
- No concurrent speech — new `speak()` interrupts unless `enqueue: true`
- Text length — very long texts may be split internally

## Related {#related}
- [Chrome TTS API docs](https://developer.chrome.com/docs/extensions/reference/api/tts)
- [Chrome TTS Engine API docs](https://developer.chrome.com/docs/extensions/reference/api/ttsEngine)
- [contextMenus](contextMenus.md) — trigger TTS from right-click menu
- [storage](storage.md) — persist voice preferences

## Frequently Asked Questions

### How do I add text-to-speech to Chrome extension?
Use chrome.tts.speak() to make Chrome read text aloud. You can choose voices, rate, pitch, and listen for events.

### Can I use custom voices with the TTS API?
Yes, you can use Chrome's built-in voices or install extension TTS engines for additional voice options.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
