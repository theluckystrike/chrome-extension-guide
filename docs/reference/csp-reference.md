# Content Security Policy (CSP) Reference

## Default MV3 CSP
```
script-src 'self';
object-src 'self';
```
MV3 does NOT allow `unsafe-inline`, `unsafe-eval`, or remote script sources. Chrome no longer grants `wasm-unsafe-eval` by default — extensions that use WebAssembly must explicitly add `'wasm-unsafe-eval'` to their `extension_pages` CSP declaration.

## Customizing CSP in Manifest
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts allow-forms allow-popups; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'self'"
  }
}
```

## Extension Pages CSP
Applies to popup, options page, side panel, any extension HTML.

### Allowed
- `'self'` — scripts from extension package
- `'wasm-unsafe-eval'` — WebAssembly execution
- `blob:` — blob URLs
- `filesystem:` — filesystem URLs

### NOT Allowed (MV3)
- `'unsafe-inline'` — inline scripts blocked
- `'unsafe-eval'` — eval() blocked
- Remote URLs (`https://cdn.example.com`) — remote scripts blocked
- `data:` URLs for scripts

## Sandbox Pages
Sandbox pages have relaxed CSP — can use `eval()` and inline scripts.
```json
{
  "sandbox": {
    "pages": ["sandbox.html"]
  },
  "content_security_policy": {
    "sandbox": "sandbox allow-scripts; script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  }
}
```
**Limitations**: Sandbox pages cannot use `chrome.*` APIs. Communicate via `postMessage`.

## Content Script CSP
Content scripts are subject to the **page's CSP**, not the extension's. Implications:
- `eval()` may be blocked by the page
- Inline event handlers may not work
- Inject scripts via DOM rather than inline

```typescript
// WRONG — may violate page CSP
element.setAttribute('onclick', 'handleClick()');

// CORRECT
element.addEventListener('click', handleClick);
```

## Common CSP Errors

### "Refused to execute inline script"
```
// Problem: inline <script> in extension HTML
<script>console.log('hello')</script>

// Fix: move to external file
<script src="script.js"></script>
```

### "Refused to evaluate a string as JavaScript"
```
// Problem: using eval() or new Function()
eval('alert("hi")');

// Fix: don't use eval, or use sandbox page
```

### "Refused to load the script because it violates CSP"
```
// Problem: loading remote script
<script src="https://cdn.example.com/lib.js"></script>

// Fix: bundle the script with your extension
```

## Working with Libraries
```typescript
// Libraries that use eval() won't work in MV3
// Options:
// 1. Find CSP-compatible version of the library
// 2. Use sandbox page for eval-dependent code
// 3. Bundle and modify the library to remove eval

// For templating libraries:
// - Use lit-html, Preact, or Vue (CSP-compatible mode)
// - Avoid Handlebars with runtime compilation
```

## Nonce-Based CSP (Not Available in MV3)
MV3 does not support nonce-based inline scripts. All scripts must be in separate files.

## CSP for Web Workers
```typescript
// Workers loaded from extension files work fine
const worker = new Worker('worker.js');

// Workers cannot use eval() either (inherit extension CSP)
```

## Connecting to External Services
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; connect-src 'self' https://api.example.com"
  }
}
```
`connect-src` controls `fetch()`, `XMLHttpRequest`, WebSocket connections.

## Storage/Messaging Integration
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { createMessenger } from '@theluckystrike/webext-messaging';
// These libraries work fine under default CSP — no eval needed
```

## MV2 vs MV3 CSP Differences
| Feature | MV2 | MV3 |
|---|---|---|
| `unsafe-eval` | Allowed (opt-in via CSP relaxation) | Blocked |
| `unsafe-inline` | Blocked by default | Blocked |
| Remote scripts | Allowed (opt-in via CSP relaxation) | Blocked |
| Sandbox pages | Available | Available |
| `wasm-unsafe-eval` | N/A | Available |

## Cross-References
- MV3: `docs/mv3/content-security-policy.md`
- Guide: `docs/guides/security-best-practices.md`
