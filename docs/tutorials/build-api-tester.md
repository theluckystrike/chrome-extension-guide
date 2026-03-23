---
layout: default
title: "Chrome Extension API Tester. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-api-tester/"
---
# Build a REST API Tester Extension

Build a mini-Postman REST API tester as a Chrome extension. Send HTTP requests and view formatted responses.

Manifest {#manifest}

```json
{
  "name": "API Tester",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": ["<all_urls>"],
  "action": { "default_popup": "popup.html" }
}
```

Sending Requests {#sending-requests}

```typescript
async function sendRequest(req: { url: string; method: string; headers: Record<string,string>; body?: string; }): Promise<{ status: number; statusText: string; body: string; timing: number; }> {
  const start = performance.now();
  const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
  return { status: res.status, statusText: res.statusText, body: await res.text(), timing: Math.round(performance.now() - start) };
}
```

Display Response {#display-response}

```typescript
function displayResponse(res: { status: number; statusText: string; body: string; }): void {
  document.getElementById('status').textContent = `${res.status} ${res.statusText}`;
  const el = document.getElementById('response-body');
  try { el.textContent = JSON.stringify(JSON.parse(res.body), null, 2); }
  catch { el.textContent = res.body; }
}
```

History Storage {#history-storage}

```typescript
async function saveHistory(req: any, res: any): Promise<void> {
  const { history = [] } = await chrome.storage.local.get('history');
  history.unshift({ request: req, response: res, timestamp: Date.now() });
  await chrome.storage.local.set({ history: history.slice(0, 100) });
}
```

Environment Variables {#environment-variables}

{% raw %}
```typescript
function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `{{${k}}}`);
}
```
{% endraw %}

Export/Import {#exportimport}

```typescript
function exportCollection(name: string, requests: any[]): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ name, requests })], { type: 'application/json' }));
  a.download = `${name}.json`; a.click();
}
```

Send Handler {#send-handler}

```typescript
async function handleSend(): Promise<void> {
  const btn = document.getElementById('send-btn') as HTMLButtonElement;
  btn.disabled = true; btn.textContent = 'Sending...';
  try {
    const req = buildRequest();
    const res = await sendRequest(req);
    displayResponse(res);
    await saveHistory(req, res);
  } catch (e) { document.getElementById('error').textContent = (e as Error).message; }
  finally { btn.disabled = false; btn.textContent = 'Send'; }
}
```

UI Structure {#ui-structure}

```html
<div class="url-bar">
  <select id="method"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select>
  <input type="text" id="url" placeholder="Enter request URL" />
  <button id="send-btn">Send</button>
</div>
<div id="status"></div>
<div id="response-body"></div>
<div id="error"></div>
```

Next Steps {#next-steps}

- Add Bearer token and Basic Auth helpers
- Build history browser UI
- Add response search/filter
- Support WebSocket connections

See Also {#see-also}

- [Cross-Origin Requests](/patterns/cross-origin-requests)
- [Popup Patterns](/guides/popup-patterns)
- [Side Panel](/mv3/side-panel)
-e 
---


---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
