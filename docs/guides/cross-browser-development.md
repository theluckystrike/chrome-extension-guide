# Cross-Browser Extension Development

A guide to building browser extensions across Chrome, Firefox, Edge, and Safari using the WebExtensions standard.

---

## WebExtensions Standard Overview

The WebExtensions API provides a cross-browser system for developing extensions. Created by Mozilla for Firefox, adopted by Chrome, Edge, Opera; Safari joined with Safari 14+.

---

Browser Compatibility Table

| API | Chrome | Firefox | Edge | Safari |
|-----|--------|---------|------|--------|
| Manifest V3 | 88+ | 121+ | 79+ | 15.4+ |
| Service Workers | 88+ | 109+ | 79+ | 15.4+ |
| DeclarativeNetRequest | 84+ | 113+ | 84+ | 17.2+ |
| Side Panel | 114+ | 120+ | 114+ | 16.4+ |
| Storage API | Yes | Yes | Yes | Yes |

Reference: https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs

---

webextension-polyfill Setup

```bash
npm install webextension-polyfill
```

```typescript
import browser from 'webextension-polyfill';
const settings = await browser.storage.local.get('theme');
browser.runtime.onMessage.addListener((msg) => console.log(msg));
```

---

Manifest Differences

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "browser_specific_settings": {
    "gecko": { "id": "ext@domain.com", "strict_min_version": "109.0" },
    "safari": { "targets": [{ "platform": "mac", "id": "com.company.ext" }] }
  },
  "background": { "service_worker": "background.js", "type": "module" }
}
```

Firefox requires `browser_specific_settings.gecko.id`. Safari requires Xcode + Apple Developer.

---

API Namespace & Promise Support

```typescript
import browser from 'webextension-polyfill';
await browser.runtime.sendMessage(message);
```

Chrome MV3 and Firefox 121+ have native Promise support. Use webextension-polyfill for older Firefox.

---

Service Worker vs Background Page

| Browser | Service Worker |
|---------|---------------|
| Chrome 88+ | Full |
| Firefox 109+ | Full |
| Safari 15.4+ | Full |

MV3 uses service workers; MV2 used persistent background pages (deprecated in Chrome).

---

DeclarativeNetRequest vs webRequest

```json
{ "permissions": ["declarativeNetRequest"] }
```

```typescript
const rules = [{ id: 1, priority: 1, action: { type: 'block' },
  condition: { urlFilter: '*://ads.example.com/*' } }];
await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
```

DNR: Chrome 84+, Firefox 113+, Safari 17.2+ (no static rules). webRequest works in Firefox/Safari but restricted in Chrome MV3.

---

Side Panel Support

```json
{ "side_panel": { "default_path": "sidepanel.html" }, "permissions": ["sidePanel"] }
```

```typescript
await chrome.sidePanel.setOptions({ path: 'sidepanel.html', enabled: true });
```

Chrome 114+, Firefox 120+, Safari 16.4+.

---

Storage API Compatibility

```typescript
import browser from 'webextension-polyfill';
await browser.storage.local.set({ key: 'value' }); // all browsers
await browser.storage.sync.set({ settings: true }); // not Safari
```

Storage limits: 10MB local, 100KB sync. Safari: local only.

---

Browser Detection

```typescript
const getBrowser = () => {
  if (navigator.userAgent.includes('Edg/')) return 'edge';
  if (navigator.userAgent.includes('Firefox')) return 'firefox';
  return 'chrome';
};
const hasSidePanel = 'sidePanel' in chrome;
```

---

Build System for Multi-Browser

```javascript
module.exports = {
  entry: { background: './src/background.ts' },
  output: { path: __dirname + '/dist/chrome', filename: '[name].js' }
};
```

```json
"scripts": {
  "build:chrome": "webpack --env browser=chrome",
  "build:firefox": "webpack --env browser=firefox"
}
```

---

Multi-Manifest Strategy

```
src/manifest/
 manifest.base.json
 manifest.chrome.json
 manifest.firefox.json
```

```javascript
const fs = require('fs');
const base = JSON.parse(fs.readFileSync('src/manifest/manifest.base.json'));
const browser = JSON.parse(fs.readFileSync(`src/manifest/manifest.${process.argv[2]}.json`));
fs.writeFileSync('dist/manifest.json', JSON.stringify({ ...base, ...browser }, null, 2));
```

---

CI Testing

{% raw %}
```yaml
jobs:
  test:
    strategy:
      matrix:
        browser: [chrome, firefox, edge, safari]
    steps:
      - run: npm test -- --browser=${{ matrix.browser }}
```
{% endraw %}

---

Firefox Add-ons Store Submission

1. Create account at addons.mozilla.org
2. Add `browser_specific_settings.gecko.id` to manifest
3. Upload via web-ext or AMO dashboard

```bash
npm install -g web-ext
web-ext sign --api-key=$AMO_CLIENT_ID --api-secret=$AMO_CLIENT_SECRET --source-dir=./dist/firefox
```

---

Edge Add-ons Store Submission

1. Register at partner.microsoft.com
2. Package as .zip (not .crx)
3. Upload to Partner Center, submit for certification (24-72 hours)

---

Safari Web Extension Conversion

Requirements: macOS with Xcode 15+, Apple Developer Program membership.

1. Create Safari App Extension target in Xcode
2. Copy extension files to Resources folder
3. Update manifest (no `storage.sync`, no static DNR rules)

```json
"browser_specific_settings": {
  "safari": { "targets": [{ "platform": "mac", "id": "com.company.ext" }] }
}
```

---

Safari App Store Submission

1. Create app record in App Store Connect
2. Build: `xcodebuild -workspace MyExtension.xcworkspace -scheme MyExtension -configuration Release archive`
3. Upload via Transporter app
4. Wait for review (1-2 weeks)

---

Code Examples

Universal Messaging

```typescript
import browser from 'webextension-polyfill';

export async function sendMessage(message: object): Promise<void> {
  try {
    await (chrome.runtime?.sendMessage?.(message) || browser.runtime.sendMessage(message));
  } catch (error) {
    console.error('Failed:', error);
  }
}
```

Cross-Browser Storage

```typescript
import browser from 'webextension-polyfill';

export async function getItem<T>(key: string): Promise<T | null> {
  const storage = typeof safari !== 'undefined' ? browser.storage.local : browser.storage.sync;
  const result = await storage.get(key);
  return result[key] ?? null;
}
```

---

Best Practices

1. Use webextension-polyfill for consistent Promise APIs
2. Test early and often in target browsers
3. Use feature detection over browser detection
4. Build separate packages when APIs differ
5. Document browser-specific limitations in README
