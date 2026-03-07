# Chrome Scripting API Guide

The Chrome Scripting API (`chrome.scripting`) is the modern way to inject JavaScript and CSS into web pages in Manifest V3 extensions. It replaces the deprecated `chrome.tabs.executeScript` and `chrome.tabs.insertCSS` methods from Manifest V2.

## Required Permission

Add the `scripting` permission to your `manifest.json`:

```json
{ "permissions": ["scripting"] }
```

## chrome.scripting.executeScript

Inject JavaScript into web pages using files or functions:

```javascript
// Inject a file
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['content-script.js']
}, (results) => console.log(results));

// Inject a function
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => document.title
}, (results) => console.log(results[0].result));

// Inject into all frames
chrome.scripting.executeScript({
  target: { tabId: tab.id, allFrames: true },
  func: () => location.href
});

// Inject into specific frames
chrome.scripting.executeScript({
  target: { tabId: tab.id, frameIds: [0, 2] },
  files: ['frame-script.js']
});
```

## chrome.scripting.insertCSS

Inject CSS into pages:

```javascript
chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  files: ['styles/injected.css']
});

chrome.scripting.insertCSS({
  target: { tabId: tab.id },
  css: '.highlight { background: yellow; }'
});
```

## chrome.scripting.removeCSS

Remove previously injected CSS:

```javascript
chrome.scripting.removeCSS({
  target: { tabId: tab.id },
  css: '.highlight { background: yellow; }'
});
```

## chrome.scripting.registerContentScripts

Register content scripts dynamically at runtime:

```javascript
chrome.scripting.registerContentScripts([{
  id: 'my-script',
  matches: ['https://*.example.com/*'],
  js: ['content-script.js'],
  css: ['styles.css'],
  runAt: 'document_idle'
}], () => console.log('Registered'));
```

## chrome.scripting.unregisterContentScripts

Unregister scripts:

```javascript
chrome.scripting.unregisterContentScripts();
chrome.scripting.unregisterContentScripts({ ids: ['my-script'] });
```

## chrome.scripting.getRegisteredContentScripts

List all registered scripts:

```javascript
chrome.scripting.getRegisteredContentScripts((scripts) => console.log(scripts));
```

## chrome.scripting.updateContentScripts

Update registered scripts:

```javascript
chrome.scripting.updateContentScripts([{
  id: 'my-script',
  excludeMatches: ['https://*.exclude.com/*']
}], () => console.log('Updated'));
```

## InjectionTarget Properties

| Property | Type | Description |
|----------|------|-------------|
| tabId | number | Target tab ID (required) |
| frameIds | number[] | Specific frame IDs |
| allFrames | boolean | Inject into all frames |

## ScriptInjection: files vs func

- **files**: Array of file paths to inject
- **func**: Function to serialize and execute in target context

```javascript
// Use args to pass data to func
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (msg) => console.log(msg),
  args: ['Hello']
});
```

## ExecutionWorld

| World | Description |
|-------|-------------|
| `ISOLATED` | Default. Extension-only scope |
| `MAIN` | Page's main world (page scripts can access) |

```javascript
// Safer - default
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => /* extension-only */
});

// Dangerous - page can see code
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  world: 'MAIN',
  func: () => window.pageVar
});
```

## RunAt

Control script execution timing:

| Value | Description |
|-------|-------------|
| `document_start` | Before DOM construction |
| `document_end` | After DOM, before resources |
| `document_idle` | After DOM complete (default) |

```javascript
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['early.js'],
  runAt: 'document_start'
});
```

## Migrating from chrome.tabs.executeScript (MV2)

**MV2:**
```javascript
chrome.tabs.executeScript(tabId, { file: 'script.js', allFrames: true });
```

**MV3:**
```javascript
chrome.scripting.executeScript({
  target: { tabId, allFrames: true },
  files: ['script.js']
});
```

Changes: API moved to `chrome.scripting`, `file` → `files` (array), target is an object.

## Building a User Script Manager

```javascript
class UserScriptManager {
  async register(script) {
    await chrome.scripting.registerContentScripts([{
      id: script.id,
      matches: script.matches,
      js: script.js || [],
      css: script.css || [],
      runAt: script.runAt || 'document_idle'
    }]);
  }
  async unregister(id) {
    await chrome.scripting.unregisterContentScripts({ ids: [id] });
  }
  async execute(tabId, options) {
    return chrome.scripting.executeScript({
      target: { tabId },
      files: options.js,
      world: options.world || 'ISOLATED'
    });
  }
}
const mgr = new UserScriptManager();
await mgr.register({ id: 'demo', matches: ['<all_urls>'], js: ['main.js'] });
```

## Security Considerations

### Principle of Least Privilege
Request only necessary host permissions:
```json
{ "host_permissions": ["https://*.example.com/*"] }
```

### Avoid MAIN World Execution
Page scripts can access code in MAIN world—use ISOLATED (default) when possible.

### Validate Targets Before Injection
```javascript
async function safeExecute(tabId, script) {
  const tab = await chrome.tabs.get(tabId);
  if (!tab.url.startsWith('http')) throw new Error('Restricted URL');
  return chrome.scripting.executeScript({ target: { tabId }, ...script });
}
```

### Handle CSP Restrictions
Some pages block injection via CSP—handle gracefully:
```javascript
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => { try { return document.body.innerHTML; } catch(e){ return null; } }
});
```

## Complete Example: Text Highlighter

```javascript
chrome.runtime.onMessage.addListener((req, sender) => {
  if (req.action === 'highlight') highlightText(req.text, sender.tab.id);
});

async function highlightText(text, tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    css: '.ext-highlight { background: yellow; }'
  });
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (searchText) => {
      const walker = document.createTreeWalker(
        document.body, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        const idx = node.textContent.indexOf(searchText);
        if (idx >= 0) {
          const span = document.createElement('span');
          span.className = 'ext-highlight';
          span.textContent = searchText;
          const range = document.createRange();
          range.setStart(node, idx);
          range.setEnd(node, idx + searchText.length);
          range.surroundContents(span);
          break;
        }
      }
    },
    args: [text]
  });
}
```

## Reference

- [Chrome Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Content Scripts Guide](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro/)
