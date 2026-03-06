# ttsEngine Permission

## What It Grants
Allows your extension to register as a text-to-speech engine that other extensions (and Chrome itself) can use via `chrome.tts.speak()`.

## Manifest
```json
{
  "permissions": ["ttsEngine"],
  "tts_engine": {
    "voices": [
      {
        "voice_name": "CustomVoice",
        "lang": "en-US",
        "event_types": ["start", "word", "sentence", "end"]
      }
    ]
  }
}
```

## User Warning
None — this permission does not trigger a warning.

## API Access (Provider Side)
- `chrome.ttsEngine.onSpeak` — request to speak text
- `chrome.ttsEngine.onStop` — request to stop speaking
- `chrome.ttsEngine.onPause` — request to pause
- `chrome.ttsEngine.onResume` — request to resume
- `chrome.ttsEngine.onGetVoices` — request for available voices (Chrome 119+)

## Implementing a TTS Engine
```typescript
chrome.ttsEngine.onSpeak.addListener((utterance, options, sendTtsEvent) => {
  // utterance: string to speak
  // options: { lang, rate, pitch, volume, voiceName }

  sendTtsEvent({ type: 'start', charIndex: 0 });

  // Your speech synthesis logic here
  // Could use Web Audio API, fetch audio from server, etc.
  const audio = synthesizeSpeech(utterance, options);

  audio.onended = () => {
    sendTtsEvent({ type: 'end', charIndex: utterance.length });
  };

  // Report word boundaries
  audio.onword = (charIndex: number) => {
    sendTtsEvent({ type: 'word', charIndex });
  };

  audio.play();
});

chrome.ttsEngine.onStop.addListener(() => {
  stopCurrentAudio();
});

chrome.ttsEngine.onPause.addListener(() => {
  pauseCurrentAudio();
});

chrome.ttsEngine.onResume.addListener(() => {
  resumeCurrentAudio();
});
```

## TTS Event Types
| Event | Description |
|---|---|
| `start` | Speech started |
| `word` | Word boundary reached |
| `sentence` | Sentence boundary reached |
| `marker` | SSML marker reached |
| `end` | Speech finished |
| `interrupted` | Speech was interrupted |
| `cancelled` | Speech was cancelled |
| `error` | An error occurred |

## Voice Registration
```json
{
  "tts_engine": {
    "voices": [
      {
        "voice_name": "Alice",
        "lang": "en-US",
        "event_types": ["start", "word", "sentence", "end"]
      },
      {
        "voice_name": "Marie",
        "lang": "fr-FR",
        "event_types": ["start", "end"]
      }
    ]
  }
}
```

## Consumer Side (Using tts permission)
```typescript
// Other extensions or your own code can use the voice
chrome.tts.speak('Hello world', {
  voiceName: 'CustomVoice',
  rate: 1.0,
  pitch: 1.0,
  onEvent: (event) => {
    if (event.type === 'end') console.log('Done speaking');
    if (event.type === 'error') console.error('TTS error');
  }
});
```

## Storage Integration
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
const schema = defineSchema({
  defaultRate: 'number',
  defaultPitch: 'number',
  defaultVolume: 'number'
});
const storage = createStorage(schema, 'sync');
```

## When to Use
- Custom TTS engine (AI voices, specialized pronunciation)
- Language-specific speech synthesis
- Accessibility tools with custom voices
- Integration with external TTS services (ElevenLabs, Google Cloud TTS, etc.)

## When NOT to Use
- If you just want to speak text — use `tts` permission with `chrome.tts.speak()`
- If built-in voices suffice — no need for custom engine

## Difference: tts vs ttsEngine
| | `tts` | `ttsEngine` |
|---|---|---|
| Role | Consumer (speak text) | Provider (generate speech) |
| API | `chrome.tts.speak()` | `chrome.ttsEngine.onSpeak` |
| Use | Use existing voices | Create new voices |

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('ttsEngine');
```

## Cross-References
- Related: `docs/permissions/tts.md`
- Guide: `docs/guides/accessibility.md`
