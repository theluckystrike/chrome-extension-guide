---
layout: default
title: "Chrome Extension Built-in AI APIs. Developer Guide"
description: "Learn how to use the Chrome Extension Chrome Built In Ais API with this developer guide covering methods, permissions, and implementation examples."
canonical_url: "https://bestchromeextensions.com/guides/chrome-built-in-ai-apis/"
---
Chrome Built-in AI APIs

Introduction {#introduction}
Chrome ships on-device AI through chrome.ai. These APIs run locally on the user's machine, meaning no data leaves the device. This is a significant improvement for extensions needing AI without external servers.

The on-device approach trades some accuracy for privacy and latency.

Checking API Availability {#checking-api-availability}

```javascript
async function checkAIAvailability() {
  if (!('ai' in chrome)) return { available: false };
  const capabilities = await chrome.ai.canCreatePromptSession();
  return { available: capabilities === 'readily' };
}
```

Returns 'readily', 'after-download', or 'no'.

Prompt API {#prompt-api}
Foundation for on-device language models. Supports sessions, streaming, parameters.

Sessions {#sessions}
Create a session to maintain context:

```javascript
const session = await chrome.ai.createPromptSession({
  context: 'You are a helpful coding assistant.'
});
const response = await session.prompt('How do I filter an array?');
await session.destroy();
```

Streaming {#streaming}
For immediate feedback:

```javascript
const stream = session.promptStreaming('Explain async/await');
for await (const chunk of stream) { updateUI(chunk); }
```

Temperature {#temperature}
Control randomness:

```javascript
const response = await session.prompt('Write a function', {
  temperature: 0.2, maxTokens: 500
});
```

Use 0 for facts, 0.7-0.9 for creative tasks.

Summarizer API {#summarizer-api}
Condenses text into summaries.

Types {#types}
- 'key-points': Main bullet points
- 'tl;dr': One-line summary
- 'teaser': Short preview
- 'headline': Single sentence

```javascript
const summarizer = await chrome.ai.createSummarizer({
  type: 'key-points', length: 'medium'
});
const summary = await summarizer.summarize(longText);
```

Length: 'short', 'medium', 'long'. Content scripts can extract page text directly.

Writer API {#writer-api}
Composes new text:

```javascript
const writer = await chrome.ai.createWriter({ tone: 'formal' });
const drafted = await writer.write('Write a rejection email');
```

Tone: 'formal', 'casual', 'persuasive', 'neutral'.

Rewriter API {#rewriter-api}
Transforms existing text:

```javascript
const rewriter = await chrome.ai.createRewriter({ tone: 'casual' });
const rewritten = await rewriter.rewrite(formalText);
```

Translation API {#translation-api}
On-device translation:

```javascript
const translator = await chrome.ai.createTranslator({
  sourceLanguage: 'en', targetLanguage: 'es'
});
const translated = await translator.translate('Hello');
```

Use BCP-47 codes. Not all pairs available.

Language Detection {#language-detection}

```javascript
const detector = await chrome.ai.createLanguageDetector();
const result = await detector.detect('Bonjour');
console.log(result.detectedLanguage); // 'fr'
```

Extension Context {#extension-context}

Service Worker {#service-worker}
Long-lived sessions in background. Watch for termination.

Content Scripts {#content-scripts}
Analyze page content directly. Good for summarizing articles.

Popup {#popup}
Short lifetime. Create sessions in service worker, pass results via message passing:

```javascript
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'summarize') {
    summarizeInBackground(msg.content).then(sendResponse);
    return true;
  }
});
```

Fallback Patterns {#fallback-patterns}
Build graceful degradation:

```javascript
async function smartSummarize(text) {
  if ('ai' in chrome && await chrome.ai.canCreateSummarizer() === 'readily') {
    return (await chrome.ai.createSummarizer()).summarize(text);
  }
  return fallbackSummarize(text);
}
```

Consider external APIs, keyword extraction, or clear error messaging.

Privacy Benefits {#privacy-benefits}
On-device AI means sensitive data never leaves the machine. Critical for extensions handling passwords, messages, financial data, health records, or proprietary content.

Extensions offer AI features while maintaining trust. No data sent to third parties. No network calls for AI.

This privacy-first approach aligns with Chrome's direction and user expectations. Extensions using on-device AI can market themselves as privacy-respecting alternatives to cloud solutions.

For more advanced AI integration patterns in Chrome extensions, check out the guides at zovo.one.

Related Articles {#related-articles}

Related Articles

- [AI Integration](../guides/ai-llm-integration-extensions.md)
- [First Extension](../guides/chrome-extension-first-extension.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
