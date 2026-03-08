---
title: "fontSettings Permission"
description: "Access to the `chrome.fontSettings` API for reading and modifying Chrome's font preferences (default fonts, sizes, per-script fonts). { "permissions": ["fontSettings"]"
permalink: /permissions/fontSettings/
category: permissions
order: 18
---

# fontSettings Permission

## What It Grants
Access to the `chrome.fontSettings` API for reading and modifying Chrome's font preferences (default fonts, sizes, per-script fonts).

## Manifest
```json
{
  "permissions": ["fontSettings"]
}
```

## User Warning
None — this permission does not trigger a warning at install time.

## API Access

### Font Management
- `chrome.fontSettings.getFont({ genericFamily, script? })` — get font for a family/script
- `chrome.fontSettings.setFont({ genericFamily, fontId, script? })` — set font for a family/script
- `chrome.fontSettings.getFontList()` — list all available fonts on the system
- `chrome.fontSettings.clearFont({ genericFamily, script? })` — reset to default

### Font Size Management
- `chrome.fontSettings.getDefaultFontSize()` / `setDefaultFontSize({ pixelSize })`
- `chrome.fontSettings.getDefaultFixedFontSize()` / `setDefaultFixedFontSize({ pixelSize })`
- `chrome.fontSettings.getMinimumFontSize()` / `setMinimumFontSize({ pixelSize })`
- `chrome.fontSettings.clearDefaultFontSize()` / `clearDefaultFixedFontSize()` / `clearMinimumFontSize()`

### Events
- `chrome.fontSettings.onFontChanged`
- `chrome.fontSettings.onDefaultFontSizeChanged`
- `chrome.fontSettings.onDefaultFixedFontSizeChanged`
- `chrome.fontSettings.onMinimumFontSizeChanged`

## Generic Font Families
| Family | Description |
|---|---|
| `standard` | Default body text font |
| `serif` | Serif font (e.g., Times New Roman) |
| `sansserif` | Sans-serif font (e.g., Arial) |
| `fixed` | Monospace font (e.g., Courier New) |
| `cursive` | Cursive/handwriting font |
| `fantasy` | Decorative font |
| `math` | Math font |

## Basic Usage
```typescript
// Get current serif font
const { fontId } = await chrome.fontSettings.getFont({ genericFamily: 'serif' });
console.log(`Current serif font: ${fontId}`);

// Set a new sans-serif font
await chrome.fontSettings.setFont({ genericFamily: 'sansserif', fontId: 'Roboto' });

// Get all available fonts
const fonts = await chrome.fontSettings.getFontList();
fonts.forEach(f => console.log(`${f.fontId}: ${f.displayName}`));

// Set default font size
await chrome.fontSettings.setDefaultFontSize({ pixelSize: 18 });

// Set minimum font size (accessibility)
await chrome.fontSettings.setMinimumFontSize({ pixelSize: 12 });
```

## Script-Specific Fonts
```typescript
// Set font for Japanese text
await chrome.fontSettings.setFont({
  genericFamily: 'standard',
  fontId: 'Noto Sans JP',
  script: 'Jpan'
});

// Set font for Arabic text
await chrome.fontSettings.setFont({
  genericFamily: 'standard',
  fontId: 'Noto Naskh Arabic',
  script: 'Arab'
});
```

## Accessibility Extension Pattern
```typescript
import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { createMessenger } from '@theluckystrike/webext-messaging';

const schema = defineSchema({
  preferredFontSize: 'number',
  preferredFont: 'string',
  dyslexiaMode: 'boolean'
});
const storage = createStorage(schema, 'sync');

type Messages = {
  SET_READING_MODE: { request: { fontSize: number; font: string }; response: { ok: boolean } };
  RESET_FONTS: { request: {}; response: { ok: boolean } };
};
const m = createMessenger<Messages>();

m.onMessage('SET_READING_MODE', async ({ fontSize, font }) => {
  await chrome.fontSettings.setDefaultFontSize({ pixelSize: fontSize });
  await chrome.fontSettings.setFont({ genericFamily: 'standard', fontId: font });
  await chrome.fontSettings.setFont({ genericFamily: 'serif', fontId: font });
  await storage.set('preferredFontSize', fontSize);
  await storage.set('preferredFont', font);
  return { ok: true };
});

m.onMessage('RESET_FONTS', async () => {
  await chrome.fontSettings.clearDefaultFontSize();
  await chrome.fontSettings.clearFont({ genericFamily: 'standard' });
  await chrome.fontSettings.clearFont({ genericFamily: 'serif' });
  return { ok: true };
});
```

## Monitor Font Changes
```typescript
chrome.fontSettings.onFontChanged.addListener((details) => {
  console.log(`Font changed: ${details.genericFamily} → ${details.fontId} (script: ${details.script})`);
});

chrome.fontSettings.onDefaultFontSizeChanged.addListener((details) => {
  console.log(`Font size changed to: ${details.pixelSize}px`);
});
```

## When to Use
- Accessibility extensions (dyslexia-friendly fonts, larger text)
- Reading customization tools
- Typography/font management extensions
- Localization tools (script-specific fonts)

## When NOT to Use
- If you only need to style specific pages — use content scripts with CSS injection
- For temporary font changes — use CSS, not this API (changes are persistent)

## Permission Check
```typescript
import { checkPermission } from '@theluckystrike/webext-permissions';
const granted = await checkPermission('fontSettings');
```

## Cross-References
- Related: `docs/guides/accessibility.md`
