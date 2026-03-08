---
layout: default
title: "Chrome Extension AI & LLM Integration — Developer Guide"
description: "Learn Chrome extension ai & llm integration with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/ai-llm-integration-extensions/"
---
# AI and LLM Integration in Chrome Extensions

## Architecture Overview {#architecture-overview}

Integrating AI and large language models into Chrome extensions requires careful architectural decisions about where API calls happen and how data flows between components.

The background service worker serves as the central hub for AI operations. This is where you make API calls to OpenAI, Anthropic, or other LLM providers. The service worker has the longest lifecycle and can maintain state across browser sessions, making it ideal for managing API keys, handling authentication, and coordinating AI requests from multiple sources.

Content scripts should never make direct API calls to LLM services. They run in the context of web pages and would expose your API keys to the page. Instead, content scripts send messages to the background worker, which handles the AI interaction and returns results.

Popup scripts can provide user-facing AI features, but remember that the popup only lives while the user interacts with it. For long-running AI operations or streaming responses, use the service worker as the intermediary.

## Calling External LLM APIs {#calling-external-llm-apis}

### OpenAI Integration {#openai-integration}

```javascript
// background.js
async function callOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}
```

Store your API key securely and retrieve it only when needed. Never hardcode keys in your extension source.

### Anthropic Integration {#anthropic-integration}

```javascript
// background.js
async function callAnthropic(prompt, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  
  const data = await response.json();
  return data.content[0].text;
}
```

Both APIs follow similar patterns, but response formats differ. Build wrapper functions that normalize the output so your extension works with multiple providers.

## Chrome Built-in AI APIs {#chrome-built-in-ai-apis}

Chrome provides experimental AI APIs that run locally on the user's machine. These offer privacy benefits and no API costs, though capabilities differ from cloud-based LLMs.

### Prompt API {#prompt-api}

The Prompt API lets you interface with on-device language models:

```javascript
// Check availability
if ('ai' in self && 'languageModel' in self.ai) {
  const session = await self.ai.languageModel.create();
  const response = await session.prompt('Summarize this text');
  session.destroy();
}
```

This API requires user permission and may not be available on all systems. Always check for availability and provide fallbacks.

### Summarizer API {#summarizer-api}

For text summarization specifically, the Summarizer API offers a streamlined interface:

```javascript
const summarizer = await self.ai.summarizer.create();
const summary = await summarizer.summarize(document.body.innerText);
```

### Translator API {#translator-api}

The Translator API handles language detection and translation:

```javascript
const translator = await self.ai.translator.create({
  sourceLanguage: 'en',
  targetLanguage: 'es',
});
const translated = await translator.translate('Hello world');
```

These built-in APIs are evolving rapidly. Check Chrome's documentation for the latest capabilities and browser compatibility.

## Streaming Responses {#streaming-responses}

For longer AI responses, streaming provides a better user experience by showing tokens as they arrive:

```javascript
// background.js
async function streamOpenAI(prompt, apiKey, onChunk) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        const data = JSON.parse(line.slice(6));
        const content = data.choices[0]?.delta?.content;
        if (content) onChunk(content);
      }
    }
  }
}
```

Send chunks to content scripts via message passing:

```javascript
// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'streamAI') {
    streamOpenAI(message.prompt, apiKey, (chunk) => {
      chrome.tabs.sendMessage(sender.tab.id, { type: 'chunk', content: chunk });
    });
  }
});
```

## Secure API Key Management {#secure-api-key-management}

Never store API keys in plain text or in localStorage, which content scripts can access. Use chrome.storage.session for sensitive data:

```javascript
// Store key securely on first use
async function saveApiKey(key) {
  await chrome.storage.session.set({ openaiKey: key });
}

// Retrieve key when needed
async function getApiKey() {
  const result = await chrome.storage.session.get('openaiKey');
  return result.openaiKey;
}
```

The session storage is isolated from web page context and clears when the browser closes or the extension reloads. For persistent storage of API keys, consider chrome.storage.local with encryption, though users should be aware that local storage carries some risk.

## Token Usage and Cost Control {#token-usage-and-cost-control}

LLM API calls incur costs based on tokens processed. Track usage to prevent unexpected charges:

```javascript
// Estimate tokens (rough approximation)
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

// Track usage per session
let sessionTokens = 0;
const MAX_TOKENS_PER_DAY = 100000;

async function trackUsage(inputTokens, outputTokens) {
  sessionTokens += inputTokens + outputTokens;
  
  if (sessionTokens > MAX_TOKENS_PER_DAY) {
    throw new Error('Daily token limit exceeded');
  }
  
  await chrome.storage.local.set({ 
    tokensUsed: sessionTokens,
    lastReset: new Date().toDateString()
  });
}
```

Implement rate limiting to space out requests and prevent hitting API quotas:

```javascript
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

async function rateLimitedRequest(fn) {
  const now = Date.now();
  const waitTime = Math.max(0, MIN_REQUEST_INTERVAL - (now - lastRequestTime));
  
  await new Promise(resolve => setTimeout(resolve, waitTime));
  lastRequestTime = Date.now();
  
  return fn();
}
```

## Context Menu AI Actions {#context-menu-ai-actions}

Add AI-powered options to Chrome's right-click menu for quick access to features:

```javascript
// background.js
chrome.contextMenus.create({
  id: 'aiSummarize',
  title: 'Summarize with AI',
  contexts: ['selection'],
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'aiSummarize') {
    const summary = await callOpenAI(
      `Summarize this: ${info.selectionText}`,
      await getApiKey()
    );
    
    chrome.tabs.sendMessage(tab.id, { 
      type: 'showSummary', 
      content: summary 
    });
  }
});
```

## Performance Optimization {#performance-optimization}

### Debouncing {#debouncing}

For AI features that trigger on user input, debounce to avoid excessive API calls:

```javascript
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// In content script
const debouncedAnalyze = debounce(async (text) => {
  chrome.runtime.sendMessage({ type: 'analyze', text });
}, 500);
```

### Caching Responses {#caching-responses}

Cache common queries to reduce API calls and improve response times:

```javascript
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour

async function cachedAIRequest(prompt) {
  const hash = await hashPrompt(prompt);
  const cached = cache.get(hash);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  
  const response = await callOpenAI(prompt, await getApiKey());
  cache.set(hash, { response, timestamp: Date.now() });
  return response;
}
```

### Offline Fallback {#offline-fallback}

When the user is offline or AI services are unavailable, provide graceful degradation:

```javascript
async function smartAIRequest(prompt) {
  try {
    return await callOpenAI(prompt, await getApiKey());
  } catch (error) {
    // Fall back to on-device AI if available
    if ('ai' in self && 'languageModel' in self.ai) {
      const session = await self.ai.languageModel.create();
      const result = await session.prompt(prompt);
      session.destroy();
      return result;
    }
    
    // Final fallback: queue for later
    await chrome.storage.local.set({ pendingRequests: prompt });
    return 'AI request queued for when connection is restored';
  }
}
```

## Best Practices Summary {#best-practices-summary}

Keep your AI extension performant and secure by following these principles. Make API calls from the background service worker only, never expose keys to content scripts, implement streaming for long responses to improve perceived latency, track token usage to control costs, and always provide fallback mechanisms for when AI services are unavailable.

For more advanced patterns and real-world implementations, explore the extensions ecosystem on zovo.one where developers share production-ready solutions for Chrome extension development.

## Related Articles {#related-articles}

- [Chrome Built-in AI APIs](../guides/chrome-built-in-ai-apis.md)
- [OAuth Identity](../guides/identity-oauth.md)
