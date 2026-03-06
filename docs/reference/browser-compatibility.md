# Browser Compatibility Reference

Comprehensive reference for browser compatibility of Chrome Extension APIs across Chrome, Firefox, Edge, and Safari.

## Extension API Compatibility Table

| API | Chrome | Firefox | Edge | Safari |
|-----|--------|---------|------|--------|
| `chrome.storage` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.runtime` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.tabs` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.alarms` | ✅ Full | ✅ Full | ✅ Full | ⚠️ Limited |
| `chrome.action` | ✅ Full (MV3) | ✅ Full | ✅ Full | ⚠️ Partial |
| `chrome.scripting` | ✅ Full (MV3) | ⚠️ Limited | ✅ Full | ⚠️ Limited |
| `chrome.sidePanel` | ✅ Chrome only | ❌ No | ✅ Full | ❌ No |
| `chrome.declarativeNetRequest` | ✅ Full | ✅ Full | ✅ Full | ❌ No |
| `chrome.notifications` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.contextMenus` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.commands` | ✅ Full | ✅ Full | ✅ Full | ⚠️ Limited |
| `chrome.bookmarks` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.history` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.downloads` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.cookies` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.webNavigation` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.i18n` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `chrome.identity` | ✅ Full | ✅ Full | ✅ Full | ⚠️ Limited |
| `chrome.offscreen` | ✅ Chrome only | ❌ No | ✅ Full | ❌ No |

## Manifest Version Support

| Feature | MV2 | MV3 |
|---------|-----|-----|
| Service Workers | ❌ No | ✅ Yes |
| `action` API | ⚠️ `browser_action` | ✅ `action` |
| Declarative Net Request | ✅ Yes | ✅ Yes |
| Side Panel | ❌ No | ✅ Yes |
| Offscreen Documents | ❌ No | ✅ Yes |

### Browser Manifest Support

- **Chrome**: MV2 (deprecated), MV3 (current), MV4 (beta)
- **Firefox**: MV2 (supported), MV3 (supported), MV4 (experimental)
- **Edge**: MV2 (deprecated), MV3 (current)
- **Safari**: MV2, MV3 (14+)

## Namespace Differences

| Aspect | Chrome | Firefox | Recommended |
|--------|--------|---------|-------------|
| API Namespace | `chrome.*` | `browser.*` | Use polyfill |
| Callback Style | ✅ Default | ⚠️ Promises | Use polyfill |
| Promise Support | ✅ MV3 | ✅ Default | Use promises |

## Promise Support

All browsers support Promises in Manifest V3. In Manifest V2:

- **Chrome**: Callbacks only (except some newer APIs)
- **Firefox**: Native Promise support
- **Edge**: Callbacks only
- **Safari**: Callbacks only

## Using WebExtension Polyfill

For maximum compatibility, use the [webextension-polyfill](https://github.com/mozilla/webextension-polyfill):

```javascript
import browser from 'webextension-polyfill';

// Instead of chrome.storage
await browser.storage.local.set({ key: 'value' });
const data = await browser.storage.local.get('key');
```

## Safari Specific Considerations

### Web Extension Conversion Tool

Safari requires converting extensions using the [Web Extension Converter](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari).

### Safari Limitations

- No `sidePanel` API support
- No `declarativeNetRequest` API
- Limited `scripting` API
- Limited `identity` API
- `commands` keyboard shortcuts may differ

### Safari-Specific Files

```
_safari/
  Info.plist
  manifest.json
  background.js
```

## Edge Specific Notes

Edge is Chromium-based, offering near-full Chrome compatibility:

- All Chrome APIs work
- Manifest V3 fully supported
- Side Panel supported
- Offscreen documents supported

## Cross-Reference

- [Cross-Browser Development Guide](../guides/cross-browser.md)
- [Cross-Browser Patterns](../patterns/cross-browser-compatibility.md)
