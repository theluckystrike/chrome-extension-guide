# Chrome Extension Architecture Deep Dive

## The Extension Component Model
- How Chrome loads and isolates extension components
- Process model: each component runs in its own context
- Diagram description: Background SW <-> Content Scripts <-> Popup/Options <-> DevTools

## Background Service Worker
- Entry point defined in `manifest.json` `"background": { "service_worker": "background.js" }`
- Lifecycle: install -> activate -> idle -> terminate -> wake
- No DOM access, no `window` object
- Event-driven: must register listeners at top level
- Persistence: use `chrome.storage` (via `@theluckystrike/webext-storage`) to persist state across restarts
- Example: `const storage = createStorage(defineSchema({ lastRun: 'number' }), 'local')`

## Content Scripts
- Injected into web pages via `manifest.json` `"content_scripts"` or `chrome.scripting.executeScript`
- Isolated world: shares DOM but NOT JavaScript scope with the page
- Can access limited Chrome APIs: `chrome.runtime`, `chrome.storage`
- Communication with background: use `@theluckystrike/webext-messaging`
- Example: `const messenger = createMessenger<MyMessages>(); messenger.sendMessage('getData', { key: 'value' })`

## Popup and Options Pages
- Popup: triggered by clicking extension icon, lives as long as popup is open
- Options: full page for extension settings, opened via right-click -> Options
- Both have full Chrome API access like background
- State management: use `@theluckystrike/webext-storage` `watch()` for reactive updates
- Example: `storage.watch('theme', (newVal, oldVal) => updateUI(newVal))`

## DevTools Pages
- Custom panels in Chrome DevTools
- Access to `chrome.devtools.*` APIs
- Communication pattern: DevTools -> Background -> Content Script

## Inter-Component Communication Patterns
- Popup <-> Background: direct `chrome.runtime` messaging
- Content <-> Background: `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`
- Using `@theluckystrike/webext-messaging` for type-safe messaging across all components:
  ```typescript
  type Messages = {
    getUser: { request: { id: string }; response: User };
    saveData: { request: Data; response: void };
  };
  const messenger = createMessenger<Messages>();
  ```
- Cross-component storage sync via `@theluckystrike/webext-storage` `watch()`

## Manifest.json as the Blueprint
- Structure overview: manifest_version, name, version, permissions, background, content_scripts, action
- How Chrome reads the manifest to wire up components
- Common mistakes: missing permissions, wrong paths, invalid JSON

## Security Boundaries
- Content scripts can't access extension pages directly
- Web pages can't access extension APIs
- Extension pages can't access other extensions
- CSP restrictions in MV3 (cross-ref: `docs/mv3/content-security-policy.md`)
