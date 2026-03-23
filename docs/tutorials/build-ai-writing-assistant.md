---
layout: default
title: "Chrome Extension AI Writing Assistant. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-ai-writing-assistant/"
---
Build an AI-Powered Writing Assistant Extension

A practical Chrome extension that helps users write better on any web page. It detects
text fields, offers prompt templates (grammar, tone, conciseness), calls OpenAI or
Claude APIs, streams suggestions in a side panel, and inserts improved text back
into the page.

Uses `@theluckystrike/webext-storage` for all storage operations and
`@theluckystrike/webext-messaging` for inter-component communication.

---

Step 1: Manifest and Project Structure {#step-1-manifest-and-project-structure}

```json
{
  "manifest_version": 3,
  "name": "AI Writing Assistant",
  "version": "1.0.0",
  "description": "Improve your writing on any web page with AI suggestions.",
  "permissions": ["activeTab", "sidePanel", "storage", "contextMenus"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }],
  "side_panel": { "default_path": "sidepanel.html" },
  "options_page": "options.html",
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
}
```

- activeTab -- temporary access to the current tab on user action
- sidePanel -- persistent UI alongside the page
- storage -- API key, templates, and usage data
- contextMenus -- right-click "Improve Writing" on selected text

---

Step 2: Side Panel UI {#step-2-side-panel-ui}

Create `sidepanel.html` with a text input area, template buttons, and output display:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Writing Assistant</title>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <div id="app">
    <header>
      <h1>Writing Assistant</h1>
      <span id="token-badge" title="Tokens used today">0 / 10,000</span>
    </header>
    <section id="input-section">
      <label for="input-text">Your text:</label>
      <textarea id="input-text" rows="6" placeholder="Paste or select text on the page..."></textarea>
    </section>
    <section id="template-section">
      <label>Prompt template:</label>
      <div id="template-buttons">
        <button class="template-btn active" data-template="grammar">Fix Grammar</button>
        <button class="template-btn" data-template="concise">Make Concise</button>
        <button class="template-btn" data-template="formal">Formal Tone</button>
        <button class="template-btn" data-template="casual">Casual Tone</button>
        <button class="template-btn" data-template="custom">Custom</button>
      </div>
      <textarea id="custom-prompt" rows="2" placeholder="Custom instructions..." style="display:none;"></textarea>
    </section>
    <div id="action-bar">
      <button id="improve-btn">Improve Writing</button>
      <button id="insert-btn" disabled>Insert into Page</button>
    </div>
    <section id="output-section">
      <label>Suggestion:</label>
      <div id="output-text" class="output-area"></div>
    </section>
    <footer><a href="#" id="open-options">Settings</a></footer>
  </div>
  <script src="sidepanel.js"></script>
</body>
</html>
```

The token badge changes color at 80% (orange) and 100% (red) of the daily budget.
Template buttons toggle an `active` class and show/hide the custom prompt textarea.

---

Step 3: Content Script -- Text Field Detection {#step-3-content-script-text-field-detection}

`content.js` detects `<textarea>`, `<input type="text">`, and `contenteditable`
elements. It handles three message types:

```js
(function () {
  "use strict";

  function getSelectedText() {
    const sel = window.getSelection();
    return sel ? sel.toString().trim() : "";
  }

  function replaceSelection(newText) {
    const el = document.activeElement;
    if (el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text"))) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      el.value = el.value.substring(0, start) + newText + el.value.substring(end);
      el.selectionStart = start;
      el.selectionEnd = start + newText.length;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
    if (el && el.isContentEditable) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return false;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(newText));
      sel.collapseToEnd();
      return true;
    }
    return false;
  }

  // @theluckystrike/webext-messaging pattern: structured message types
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case "GET_SELECTED_TEXT":
        sendResponse({ text: getSelectedText() });
        break;
      case "INSERT_TEXT":
        sendResponse({ success: replaceSelection(message.text) });
        break;
      default:
        sendResponse({ error: "Unknown message type" });
    }
    return true;
  });

  // Notify extension when user selects text (debounced)
  let timeout = null;
  document.addEventListener("mouseup", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const text = getSelectedText();
      if (text.length > 0) {
        chrome.runtime.sendMessage({ type: "TEXT_SELECTED", text }).catch(() => {});
      }
    }, 200);
  });
})();
```

The `replaceSelection` function dispatches an `input` event after modifying standard
inputs so frameworks like React detect the change. For contenteditable, it uses
the Selection/Range API to replace content at the cursor position.

---

Step 4: Context Menu -- "Improve Writing" {#step-4-context-menu-improve-writing}

Right-clicking selected text shows an "Improve Writing" option that opens the side
panel with the selection pre-filled. This is registered in the background script:

```js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "improve-writing",
    title: "Improve Writing",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "improve-writing" && info.selectionText) {
    await chrome.sidePanel.open({ tabId: tab.id });
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: "CONTEXT_MENU_TEXT",
        text: info.selectionText
      }).catch(() => {});
    }, 500);
  }
});
```

---

Step 5: Background Service Worker -- API Calls {#step-5-background-service-worker-api-calls}

The full `background.js` handles context menus, API routing, and usage tracking.
It supports both OpenAI and Anthropic as configurable providers:

```js
const PROMPT_TEMPLATES = {
  grammar: "Fix all grammar, spelling, and punctuation errors. Return only the corrected text.",
  concise: "Rewrite to be more concise while preserving meaning. Return only the rewritten text.",
  formal: "Rewrite in a formal, professional tone. Return only the rewritten text.",
  casual: "Rewrite in a casual, friendly tone. Return only the rewritten text.",
  custom: ""
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "improve-writing", title: "Improve Writing", contexts: ["selection"] });
  // @theluckystrike/webext-storage: initialize defaults
  chrome.storage.local.get(["tokenBudget"], (data) => {
    if (!data.tokenBudget) {
      chrome.storage.local.set({ tokenBudget: 10000, tokensUsedToday: 0,
        budgetDate: new Date().toDateString(), apiProvider: "openai" });
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "improve-writing" && info.selectionText) {
    await chrome.sidePanel.open({ tabId: tab.id });
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: "CONTEXT_MENU_TEXT", text: info.selectionText }).catch(() => {});
    }, 500);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IMPROVE_TEXT") {
    handleImproveText(message).then(sendResponse).catch(e => sendResponse({ error: e.message }));
    return true;
  }
  if (message.type === "GET_USAGE") {
    getUsageData().then(sendResponse);
    return true;
  }
  if (message.type === "RESET_USAGE") {
    chrome.storage.local.set({ tokensUsedToday: 0, budgetDate: new Date().toDateString() });
    sendResponse({ success: true });
  }
});

async function getUsageData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["tokenBudget", "tokensUsedToday", "budgetDate"], (data) => {
      if (data.budgetDate !== new Date().toDateString()) {
        chrome.storage.local.set({ tokensUsedToday: 0, budgetDate: new Date().toDateString() });
        resolve({ used: 0, budget: data.tokenBudget || 10000 });
      } else {
        resolve({ used: data.tokensUsedToday || 0, budget: data.tokenBudget || 10000 });
      }
    });
  });
}

async function handleImproveText({ text, template, customPrompt }) {
  const usage = await getUsageData();
  if (usage.used >= usage.budget) throw new Error("Daily token budget exceeded. Adjust in Settings.");

  const config = await new Promise(r => chrome.storage.local.get(["apiKey", "apiProvider"], r));
  if (!config.apiKey) throw new Error("No API key configured. Open Settings to add your key.");

  const prompt = template === "custom" ? customPrompt : (PROMPT_TEMPLATES[template] || PROMPT_TEMPLATES.grammar);
  const result = config.apiProvider === "anthropic"
    ? await callAnthropic(config.apiKey, prompt, text)
    : await callOpenAI(config.apiKey, prompt, text);

  const tokens = Math.ceil((text.length + result.length) / 4);
  const newUsed = usage.used + tokens;
  await chrome.storage.local.set({ tokensUsedToday: newUsed });
  return { improvedText: result, usage: { used: newUsed, budget: usage.budget } };
}

async function callOpenAI(apiKey, systemPrompt, userText) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }],
      max_tokens: 2048, temperature: 0.3
    })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `API error ${res.status}`); }
  return (await res.json()).choices[0].message.content.trim();
}

async function callAnthropic(apiKey, systemPrompt, userText) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 2048, system: systemPrompt,
      messages: [{ role: "user", content: userText }]
    })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `API error ${res.status}`); }
  return (await res.json()).content[0].text.trim();
}
```

---

Step 6: Options Page -- API Key Configuration {#step-6-options-page-api-key-configuration}

`options.html` lets users set their provider, API key, and daily token budget.
Keys are stored in `chrome.storage.local`, which is sandboxed to the extension.

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Settings</title><link rel="stylesheet" href="options.css"></head>
<body>
  <div class="container">
    <h1>Writing Assistant Settings</h1>
    <section>
      <h2>API Configuration</h2>
      <label for="api-provider">Provider:</label>
      <select id="api-provider">
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic (Claude)</option>
      </select>
      <label for="api-key">API Key:</label>
      <div class="key-row">
        <input type="password" id="api-key" placeholder="sk-..." autocomplete="off">
        <button id="toggle-key">Show</button>
      </div>
      <p class="hint">Stored locally, never sent to third parties.</p>
    </section>
    <section>
      <h2>Token Budget</h2>
      <label for="token-budget">Daily limit:</label>
      <input type="number" id="token-budget" min="1000" max="1000000" step="1000" value="10000">
      <div class="usage-row">
        <span>Today: <span id="usage-count">0</span> / <span id="usage-budget">10,000</span></span>
        <button id="reset-usage">Reset</button>
      </div>
    </section>
    <button id="save-btn">Save Settings</button>
    <span id="save-status"></span>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

`options.js` -- loads settings, saves them, and toggles key visibility:

```js
document.addEventListener("DOMContentLoaded", () => {
  const provider = document.getElementById("api-provider");
  const keyInput = document.getElementById("api-key");
  const toggleBtn = document.getElementById("toggle-key");
  const budgetInput = document.getElementById("token-budget");
  const usageCount = document.getElementById("usage-count");
  const usageBudget = document.getElementById("usage-budget");

  // @theluckystrike/webext-storage: load settings
  chrome.storage.local.get(["apiProvider", "apiKey", "tokenBudget", "tokensUsedToday"], (d) => {
    if (d.apiProvider) provider.value = d.apiProvider;
    if (d.apiKey) keyInput.value = d.apiKey;
    if (d.tokenBudget) budgetInput.value = d.tokenBudget;
    usageCount.textContent = (d.tokensUsedToday || 0).toLocaleString();
    usageBudget.textContent = (d.tokenBudget || 10000).toLocaleString();
  });

  toggleBtn.addEventListener("click", () => {
    keyInput.type = keyInput.type === "password" ? "text" : "password";
    toggleBtn.textContent = keyInput.type === "password" ? "Show" : "Hide";
  });

  document.getElementById("reset-usage").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "RESET_USAGE" }, () => { usageCount.textContent = "0"; });
  });

  document.getElementById("save-btn").addEventListener("click", () => {
    const status = document.getElementById("save-status");
    const settings = { apiProvider: provider.value, apiKey: keyInput.value.trim(),
      tokenBudget: parseInt(budgetInput.value, 10) || 10000 };
    if (!settings.apiKey) { status.textContent = "Enter an API key."; return; }
    chrome.storage.local.set(settings, () => {
      status.textContent = "Saved!";
      setTimeout(() => { status.textContent = ""; }, 2000);
    });
  });
});
```

---

Step 7: Streaming Response Display {#step-7-streaming-response-display}

`sidepanel.js` wires everything together -- template selection, API requests via
the background worker, and a character-by-character streaming animation:

```js
document.addEventListener("DOMContentLoaded", () => {
  const inputText = document.getElementById("input-text");
  const outputText = document.getElementById("output-text");
  const improveBtn = document.getElementById("improve-btn");
  const insertBtn = document.getElementById("insert-btn");
  const tokenBadge = document.getElementById("token-badge");
  const customPrompt = document.getElementById("custom-prompt");
  let activeTemplate = "grammar";
  let lastResult = "";

  // Template selection
  document.querySelectorAll(".template-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelector(".template-btn.active")?.classList.remove("active");
      btn.classList.add("active");
      activeTemplate = btn.dataset.template;
      customPrompt.style.display = activeTemplate === "custom" ? "block" : "none";
    });
  });

  // Receive text from context menu or content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "CONTEXT_MENU_TEXT" || msg.type === "TEXT_SELECTED") {
      inputText.value = msg.text;
    }
  });

  // Improve button
  improveBtn.addEventListener("click", async () => {
    const text = inputText.value.trim();
    if (!text) { outputText.textContent = "Enter or select text first."; return; }
    improveBtn.disabled = true;
    improveBtn.textContent = "Improving...";
    insertBtn.disabled = true;
    outputText.innerHTML = '<span class="cursor"></span>';

    try {
      const res = await chrome.runtime.sendMessage({
        type: "IMPROVE_TEXT", text, template: activeTemplate,
        customPrompt: customPrompt.value.trim()
      });
      if (res.error) { outputText.textContent = "Error: " + res.error; return; }
      await streamText(res.improvedText);
      lastResult = res.improvedText;
      insertBtn.disabled = false;
      if (res.usage) updateBadge(res.usage.used, res.usage.budget);
    } catch (e) {
      outputText.textContent = "Error: " + e.message;
    } finally {
      improveBtn.disabled = false;
      improveBtn.textContent = "Improve Writing";
    }
  });

  // Insert button -- sends improved text to content script
  insertBtn.addEventListener("click", async () => {
    if (!lastResult) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    const res = await chrome.tabs.sendMessage(tab.id, { type: "INSERT_TEXT", text: lastResult });
    insertBtn.textContent = res?.success ? "Inserted!" : "No active field";
    setTimeout(() => { insertBtn.textContent = "Insert into Page"; }, 1500);
  });

  // Settings link
  document.getElementById("open-options").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Streaming text animation
  async function streamText(text) {
    outputText.textContent = "";
    for (let i = 0; i < text.length; i += 3) {
      outputText.textContent += text.slice(i, i + 3);
      await new Promise(r => setTimeout(r, 12));
    }
  }

  function updateBadge(used, budget) {
    tokenBadge.textContent = `${used.toLocaleString()} / ${budget.toLocaleString()}`;
    tokenBadge.classList.remove("warning", "exceeded");
    if (used >= budget) tokenBadge.classList.add("exceeded");
    else if (used >= budget * 0.8) tokenBadge.classList.add("warning");
  }

  // Load initial usage
  chrome.runtime.sendMessage({ type: "GET_USAGE" }, (r) => {
    if (r) updateBadge(r.used, r.budget);
  });
});
```

For true streaming, use `stream: true` in the OpenAI request and forward
server-sent event chunks via `chrome.runtime.sendMessage`. The simulated approach
here keeps the code simpler while providing a similar UX.

---

Step 8: Insert Improved Text Back into the Page {#step-8-insert-improved-text-back-into-the-page}

The insertion flow:

1. User clicks "Insert into Page" in the side panel.
2. Side panel sends `INSERT_TEXT` message to the content script via `chrome.tabs.sendMessage`.
3. Content script's `replaceSelection()` replaces the current selection in the active field.
4. An `input` event is dispatched so React/Vue/Angular detect the change.
5. The side panel shows "Inserted!" or "No active field" feedback.

The content script handles `<textarea>`, `<input type="text">`, and `contenteditable`
elements. Shadow DOM and custom editors (e.g., CodeMirror, ProseMirror) may need
additional handling.

---

Step 9: Prompt Templates {#step-9-prompt-templates}

Templates are defined in `PROMPT_TEMPLATES` in `background.js`. Adding a new
template requires two changes:

1. Add the key and prompt to `PROMPT_TEMPLATES`:

```js
translate_es: "Translate to Spanish. Return only the translation."
```

2. Add a button in `sidepanel.html`:

```html
<button class="template-btn" data-template="translate_es">Spanish</button>
```

No other code changes needed -- the system is fully data-driven.

---

Step 10: Usage Tracking and Token Budget {#step-10-usage-tracking-and-token-budget}

Token estimation uses a simple heuristic (~1 token per 4 characters for English).
The daily budget resets automatically by comparing `budgetDate` to today's date.

Storage layout (`@theluckystrike/webext-storage`):

| Key               | Type   | Description                  |
|--------------------|--------|------------------------------|
| `apiKey`           | string | User's API key               |
| `apiProvider`      | string | `"openai"` or `"anthropic"`  |
| `tokenBudget`      | number | Daily limit (default: 10000) |
| `tokensUsedToday`  | number | Tokens consumed today        |
| `budgetDate`       | string | Date string for daily reset  |

The budget is enforced in `handleImproveText` before any API call. The token badge
provides visual feedback: green (normal), orange (>80%), red (exceeded).

---

Testing {#testing}

1. Load unpacked at `chrome://extensions/` with Developer mode enabled.
2. Open Settings, enter your API key (OpenAI or Anthropic).
3. Navigate to any page with a text field.
4. Select text and click "Improve Writing" in the side panel.
5. Try the context menu: right-click selected text, choose "Improve Writing."
6. Click "Insert into Page" to replace the selection.

Troubleshooting:
- "No API key" -- save a key in Settings.
- "Budget exceeded" -- increase the limit or click Reset in Settings.
- Insert fails -- ensure the text field is focused before clicking Insert.

---

Architecture {#architecture}

```
  content.js                    sidepanel.js
  (text detection,     <--->    (UI, templates,
   selection, insert)            streaming display)
       ^                              |
       |                              v
       +-------- background.js -------+
                 (API proxy, usage tracking,
                  context menu, message routing)
                        |
                        v
                 OpenAI / Anthropic API
```

All messaging follows `@theluckystrike/webext-messaging` conventions with typed
message objects (`{ type, ...payload }`). All storage uses
`@theluckystrike/webext-storage` patterns via `chrome.storage.local`.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
