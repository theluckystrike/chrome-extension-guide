---
layout: default
title: "Chrome Extension Form Filler — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a Form Filler Extension

## What You'll Build
- Auto-fill forms with saved profiles
- Detect form fields and match to profile data
- Multiple profiles (personal, work, testing)
- Context menu and keyboard shortcut triggers

## Prerequisites
- Basic Chrome extension knowledge (cross-ref: `docs/guides/extension-architecture.md`)
- Node.js + npm installed
- `npm install @theluckystrike/webext-storage`

---

## Step 1: Manifest

```bash
mkdir formfiller-ext && cd formfiller-ext
npm init -y && npm install @theluckystrike/webext-storage
```

```json
{
  "manifest_version": 3,
  "name": "FormFiller Pro",
  "permissions": ["activeTab", "storage", "contextMenus", "scripting"],
  "host_permissions": ["<all_urls>"],
  "action": { "default_popup": "popup.html" },
  "background": { "service_worker": "background.js" },
  "commands": { "fill-form": { "suggested_key": { "default": "Alt+Shift+F" }, "description": "Fill form" } }
}
```

---

## Step 2: Profile Storage (`src/profiles.ts`)

```typescript
import { Storage } from '@theluckystrike/webext-storage';
interface Profile { id: string; name: string; fields: Record<string, string>; isDefault: boolean; }
const KEYS = ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'zip', 'company'];

export async function getProfiles(): Promise<Profile[]> { return Storage.get('profiles') || []; }
export async function saveProfile(p: Profile): Promise<void> {
  const all = await getProfiles();
  const i = all.findIndex(x => x.id === p.id);
  i >= 0 ? all[i] = p : all.push(p);
  await Storage.set('profiles', all);
}
export async function createProfile(name: string): Promise<Profile> {
  const p = { id: crypto.randomUUID(), name, fields: Object.fromEntries(KEYS.map(k => [k, ''])), isDefault: false };
  await saveProfile(p); return p;
}
```

---

## Step 3: Form Detection (`src/content.ts`)

```typescript
interface FieldMatch { element: Element; keys: string[]; }
export function detectFields(): FieldMatch[] {
  const map = { firstName: ['firstname','fname'], lastName: ['lastname','lname'], email: ['email','mail'],
    phone: ['phone','tel'], address: ['address'], city: ['city','town'], zip: ['zip','postal'], company: ['company','org'] };
  return Array.from(document.querySelectorAll('input:not([type=hidden]),select,textarea')).map(el => {
    const s = [el.getAttribute('name'), el.getAttribute('id'), el.getAttribute('autocomplete')].map(v=>v?.toLowerCase()||'');
    const keys = Object.entries(map).filter(([_,p]) => s.some(v => p.some(x => v.includes(x)))).map(([k]) => k);
    return { element: el, keys };
  });
}
```

---

## Step 4: Form Filling (`src/content.ts`)

```typescript
export function fillForm(values: Record<string, string>): number {
  let filled = 0;
  for (const { element, keys } of detectFields()) {
    const el = element as HTMLInputElement;
    for (const key of keys) {
      if (values[key]) {
        if (el.tagName === 'SELECT') {
          const opt = Array.from((el as HTMLSelectElement).options).find(o => o.value === values[key]);
          if (opt) { el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
        } else if (el.type === 'radio' || el.type === 'checkbox') {
          if (el.value === values[key] || values[key] === 'true') { el.checked = true; el.dispatchEvent(new Event('change')); }
        } else { el.value = values[key]; el.dispatchEvent(new Event('input', { bubbles: true })); }
        el.dispatchEvent(new Event('blur', { bubbles: true })); filled++; break;
      }
    }
  }
  return filled;
}
```

---

## Step 5: Background Script (`src/background.ts`)

```typescript
import { getProfiles } from './profiles';
async function fill(tabId: number, profile: any): Promise<void> {
  const vals = Object.fromEntries(profile.fields.map((f: any) => [f.key, f.value]));
  await chrome.scripting.executeScript({ target: { tabId }, func: (v) => { /* use fillForm from content.ts */ }, args: [vals] });
}
chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({ id: 'fill', title: 'Fill form with...', contexts: ['page'] });
  (await getProfiles()).forEach(p => chrome.contextMenus.create({ id: `fill-${p.id}`, parentId: 'fill', title: p.name }));
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (tab?.id && info.parentMenuItemId === 'fill') {
    const p = (await getProfiles()).find(x => x.id === info.menuItemId?.toString().replace('fill-', ''));
    if (p) await fill(tab.id, p);
  }
});
chrome.commands.onCommand.addListener(async (cmd, tab) => {
  if (cmd === 'fill-form' && tab?.id) {
    const p = (await getProfiles()).find(x => x.isDefault) || (await getProfiles())[0];
    if (p) await fill(tab.id, p);
  }
});
```

---

## Step 6: Popup UI

`popup.html`:
```html
<body style="width:280px;padding:16px;font-family:system-ui">
<h3>Profiles</h3><div id="list"></div>
<button id="add" style="background:#4285f4;color:white;padding:6px 12px;border:none;border-radius:4px">Add</button>
<script src="popup.js"></script></body>
```

`popup.ts`:
```typescript
import { getProfiles, createProfile } from './profiles';
async function render() {
  const profiles = await getProfiles();
  document.getElementById('list')!.innerHTML = profiles.map(p => `<div style="padding:6px;border:1px solid #ddd;margin:4px 0">${p.name}</div>`).join('');
}
document.getElementById('add')!.onclick = async () => { const name = prompt('Profile name:'); if (name) { await createProfile(name); await render(); } };
render();
```

---

## Testing
1. Load unpacked in Chrome (`chrome://extensions`)
2. Open DevTools on test form page
3. Test context menu and `Alt+Shift+F` shortcut

See `docs/guides/content-script-patterns.md` and `docs/patterns/form-handling.md` for more.

---

## Summary
- Profile storage with `@theluckystrike/webext-storage`
- Smart field detection with fuzzy matching
- Context menu and keyboard triggers
- Import/export profiles as JSON
