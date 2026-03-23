# Chrome Extension Options Page Patterns

## Introduction
- Options pages allow users to configure extension behavior
- Critical for user experience. poorly designed settings frustrate users
- Modern extensions should support both full-page and embedded options
- Reference: https://developer.chrome.com/docs/extensions/develop/ui/options-page

## Options Page vs options_ui (Embedded)
- Full-page options: Opens in a new tab via `chrome://extensions` > "Extension options"
- Embedded options: Displays inline within the extensions management page
- Configure in manifest.json:

```json
{
  "options_page": "options.html",
  "options_ui": {
    "page": "options.html",
    "open_in_tab": false
  }
}
```

- Use `options_page` for legacy support (MV2) and full-page experience
- Use `options_ui` with `open_in_tab: false` for embedded (MV3)
- Prefer embedded for quick access; full-page for complex settings

## Full Page vs Embedded Options
- Full-page: Opens in new tab, more screen real estate,
- Embedded: Quick access, consistent with Chrome UI, limited space
- Embedded options cannot use certain APIs (e.g., some chrome:// URLs)
- Consider supporting both with responsive design

## Settings Form Patterns
- Group related settings using `<fieldset>` and `<legend>`
- Use semantic HTML: `<input type="checkbox">`, `<select>`, `<input type="range">`
- Store form state in chrome.storage.local or chrome.storage.sync

```javascript
// options.js - Load settings on page load
document.addEventListener('DOMContentLoaded', async () => {
  const settings = await chrome.storage.sync.get(null);
  Object.entries(settings).forEach(([key, value]) => {
    const el = document.getElementById(key);
    if (el) {
      if (el.type === 'checkbox') el.checked = value;
      else el.value = value;
    }
  });
});
```

## Real-time Save with chrome.storage
- Avoid "Save" buttons when possible. use auto-save
- Use `chrome.storage.onChanged` to react to external changes

```javascript
// Auto-save on input change
document.querySelectorAll('input, select, textarea').forEach(el => {
  el.addEventListener('change', async () => {
    const key = el.id || el.name;
    const value = el.type === 'checkbox' ? el.checked : el.value;
    await chrome.storage.sync.set({ [key]: value });
    showSaveIndicator();
  });
});

// React to external changes (e.g., from popup)
chrome.storage.onChanged.addListener((changes, area) => {
  Object.entries(changes).forEach(([key, { newValue }]) => {
    const el = document.getElementById(key);
    if (el) {
      if (el.type === 'checkbox') el.checked = newValue;
      else el.value = newValue;
    }
  });
});
```

- Show visual feedback: "Settings saved" toast or icon

## Import/Export Settings
- Users may want to backup or transfer settings
- Use JSON format for portability

```javascript
// Export settings
document.getElementById('exportBtn').addEventListener('click', async () => {
  const settings = await chrome.storage.sync.get(null);
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'extension-settings.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Import settings
document.getElementById('importBtn').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const text = await file.text();
  const settings = JSON.parse(text);
  await chrome.storage.sync.set(settings);
  location.reload();
});
```

## Settings Sync Across Devices
- Use `chrome.storage.sync` for automatic cloud sync
- Sync is limited to 100KB total, 8KB per key
- For larger data, use `chrome.storage.local` with manual sync

```javascript
// In manifest.json, no special permission needed for sync
{
  "permissions": ["storage"]
}
```

- Sync requires user to be signed into Chrome

## Default Values Handling
- Always define defaults. first-run experience matters
- Use a dedicated defaults object, export for consistency

```javascript
// defaults.js
export const DEFAULT_SETTINGS = {
  theme: 'system',
  notifications: true,
  syncEnabled: true,
  maxResults: 50,
  language: 'en'
};

// Apply defaults if not set
async function initializeSettings() {
  const stored = await chrome.storage.sync.get(null);
  const defaults = DEFAULT_SETTINGS;
  
  // Merge missing keys
  for (const key of Object.keys(defaults)) {
    if (!(key in stored)) {
      await chrome.storage.sync.set({ [key]: defaults[key] });
    }
  }
  return { ...defaults, ...stored };
}
```

## Settings Migration Between Versions
- Version migrations prevent breaking changes when settings schema changes
- Store migration version in storage

```javascript
const CURRENT_VERSION = 2;

async function migrateSettings() {
  const { version = 0 } = await chrome.storage.sync.get('version');
  
  if (version < 1) {
    // Migration from v0 to v1
    const old = await chrome.storage.sync.get('oldSettingName');
    if (old.oldSettingName !== undefined) {
      await chrome.storage.sync.set({
        newSettingName: old.oldSettingName ? 'enabled' : 'disabled'
      });
      await chrome.storage.sync.remove('oldSettingName');
    }
  }
  
  if (version < 2) {
    // Migration from v1 to v2
    await chrome.storage.sync.set({ advancedMode: false });
  }
  
  if (version !== CURRENT_VERSION) {
    await chrome.storage.sync.set({ version: CURRENT_VERSION });
  }
}
```

## Section-based Navigation
- For complex settings, use tabs or accordion navigation
- Use URL hash for deep linking to sections

```javascript
// Tab navigation with hash support
const sections = document.querySelectorAll('.settings-section');
const tabs = document.querySelectorAll('.settings-tab');

function showSection(id) {
  sections.forEach(s => s.hidden = s.id !== id);
  tabs.forEach(t => t.classList.toggle('active', t.dataset.target === id));
  history.replaceState(null, '', `#${id}`);
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => showSection(tab.dataset.target));
});

// On load
const hash = location.hash.slice(1);
if (hash) showSection(hash);
```

## Search Within Settings
- Helpful for extensions with many options
- Implement with client-side filtering

```javascript
document.getElementById('searchInput').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  document.querySelectorAll('.setting-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.hidden = !text.includes(query);
  });
});
```

## Reset to Defaults
- Provide clear reset option, confirm before action

```javascript
document.getElementById('resetBtn').addEventListener('click', async () => {
  if (confirm('Reset all settings to defaults?')) {
    await chrome.storage.sync.clear();
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    location.reload();
  }
});
```

## Settings Validation
- Validate on change, show inline errors
- Common: URL format, number ranges, required fields

```javascript
document.getElementById('apiEndpoint').addEventListener('blur', (e) => {
  const url = e.target.value;
  const valid = url.match(/^https?:\/\/.+/);
  const error = document.getElementById('apiEndpointError');
  
  if (!valid && url) {
    e.target.setCustomValidity('Please enter a valid URL');
    error.textContent = 'Invalid URL format';
  } else {
    e.target.setCustomValidity('');
    error.textContent = '';
  }
});
```

## Accessibility in Settings Pages
- Every input needs a `<label>` with `for` attribute
- Use `aria-describedby` for error messages
- Keyboard-navigable: Tab order, Enter to save, Escape to cancel
- Live regions for save confirmation

```html
<label for="themeSelect">Theme</label>
<select id="themeSelect" aria-describedby="themeHelp">
  <option value="light">Light</option>
  <option value="dark">Dark</option>
</select>
<span id="themeHelp" class="help-text">Choose your preferred color scheme</span>

<div aria-live="polite" id="saveStatus" class="sr-only">Settings saved</div>
```

## Dark Mode for Options Page
- Support system preference and user override
- Use CSS custom properties for theming

```css
:root {
  --bg-color: #ffffff;
  --text-color: #333333;
  --input-bg: #f5f5f5;
  --border-color: #dddddd;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg-color: #1a1a1a;
    --text-color: #e0e0e0;
    --input-bg: #2a2a2a;
    --border-color: #444444;
  }
}

[data-theme="dark"] {
  --bg-color: #1a1a1a;
  --text-color: #e0e0e0;
  --input-bg: #2a2a2a;
  --border-color: #444444;
}

body {
  background: var(--bg-color);
  color: var(--text-color);
}
```

```javascript
// Apply theme from storage
async function applyTheme() {
  const { theme } = await chrome.storage.sync.get('theme');
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}
```

## Best Practices Summary
- Use chrome.storage.sync for user preferences
- Implement auto-save with visual feedback
- Support import/export for backup
- Provide reset to defaults with confirmation
- Ensure accessibility throughout
- Test with keyboard-only navigation
- Support dark mode via system preference + manual override

---
## Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.


*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
