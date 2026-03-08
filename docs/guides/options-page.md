---
layout: default
title: "Chrome Extension Options Page — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/options-page/"
---
# Building an Options Page

## Overview {#overview}
Step-by-step guide to building a production-quality options page. Uses @theluckystrike/webext-storage for persisting settings and @theluckystrike/webext-permissions for managing optional permissions from the settings UI.

## Manifest Setup {#manifest-setup}
```json
{
  "options_page": "options.html",
  "options_ui": {
    "page": "options.html",
    "open_in_tab": true
  },
  "permissions": ["storage"],
  "optional_permissions": ["tabs", "bookmarks", "history"]
}
```

## Step 1: Define Your Settings Schema {#step-1-define-your-settings-schema}

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  theme: "system" as "light" | "dark" | "system",
  fontSize: 14,
  notificationsEnabled: true,
  autoSaveInterval: 5,
  blockedDomains: [] as string[],
  advancedMode: false,
  lastSaved: 0,
});

export const storage = createStorage({ schema, area: "sync" });
```

Explain why `sync` is good for user preferences (follows user across devices).

## Step 2: Load Settings on Page Open {#step-2-load-settings-on-page-open}

```ts
async function loadSettings() {
  const settings = await storage.getAll();

  (document.getElementById("theme") as HTMLSelectElement).value = settings.theme;
  (document.getElementById("fontSize") as HTMLInputElement).value = String(settings.fontSize);
  (document.getElementById("notifications") as HTMLInputElement).checked = settings.notificationsEnabled;
  (document.getElementById("autoSave") as HTMLInputElement).value = String(settings.autoSaveInterval);
  (document.getElementById("advancedMode") as HTMLInputElement).checked = settings.advancedMode;

  renderBlockedDomains(settings.blockedDomains);
}
```

## Step 3: Save Settings on Change {#step-3-save-settings-on-change}

### Auto-save pattern (save on every change): {#auto-save-pattern-save-on-every-change}
```ts
document.getElementById("theme")?.addEventListener("change", async (e) => {
  const value = (e.target as HTMLSelectElement).value as "light" | "dark" | "system";
  await storage.set("theme", value);
  showSaveIndicator();
});
```

### Save button pattern (batch save): {#save-button-pattern-batch-save}
```ts
document.getElementById("save")?.addEventListener("click", async () => {
  await storage.setMany({
    theme: getSelectValue("theme") as "light" | "dark" | "system",
    fontSize: getNumberValue("fontSize"),
    notificationsEnabled: getCheckboxValue("notifications"),
    autoSaveInterval: getNumberValue("autoSave"),
    advancedMode: getCheckboxValue("advancedMode"),
  });
  await storage.set("lastSaved", Date.now());
  showSaveIndicator();
});
```

## Step 4: Reset to Defaults {#step-4-reset-to-defaults}

```ts
document.getElementById("reset")?.addEventListener("click", async () => {
  if (!confirm("Reset all settings to defaults?")) return;
  await storage.clear(); // Removes all schema keys — defaults restored on next get
  await loadSettings(); // Reload UI with defaults
});
```

## Step 5: Manage Optional Permissions {#step-5-manage-optional-permissions}

```ts
import { checkPermissions, requestPermission, removePermission, describePermission } from "@theluckystrike/webext-permissions";

const OPTIONAL_PERMS = ["tabs", "bookmarks", "history"];

async function renderPermissions() {
  const results = await checkPermissions(OPTIONAL_PERMS);
  const container = document.getElementById("permissions")!;

  container.innerHTML = results.map(r => `
    <div class="permission-row">
      <div>
        <strong>${r.permission}</strong>
        <p>${r.description}</p>
      </div>
      <button data-perm="${r.permission}" data-granted="${r.granted}">
        ${r.granted ? "Revoke" : "Grant"}
      </button>
    </div>
  `).join("");
}

container.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest("button");
  if (!btn) return;
  const perm = btn.dataset.perm!;
  const isGranted = btn.dataset.granted === "true";

  if (isGranted) await removePermission(perm);
  else await requestPermission(perm);
  await renderPermissions();
});
```

## Step 6: Live Preview with watch() {#step-6-live-preview-with-watch}

```ts
// In popup or content script — react to options changes in real-time
storage.watch("theme", (newTheme) => {
  document.documentElement.dataset.theme = newTheme;
});

storage.watch("fontSize", (newSize) => {
  document.documentElement.style.fontSize = `${newSize}px`;
});
```

## Step 7: Import/Export Settings {#step-7-importexport-settings}

```ts
document.getElementById("export")?.addEventListener("click", async () => {
  const settings = await storage.getAll();
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "extension-settings.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("import")?.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const text = await file.text();
  const settings = JSON.parse(text);
  await storage.setMany(settings);
  await loadSettings();
});
```

## Step 8: Complete HTML Template {#step-8-complete-html-template}

Provide a minimal but functional options.html with:
- Theme selector (light/dark/system)
- Font size slider
- Toggle switches for boolean settings
- Blocked domains list with add/remove
- Permissions management section
- Save/Reset/Export/Import buttons
- CSS for dark/light theming

## Common Patterns {#common-patterns}
1. Auto-save vs save button (pros/cons of each)
2. Section-based settings (general, appearance, permissions, advanced)
3. Confirmation dialogs for destructive actions (reset, revoke)
4. Settings validation before save
5. Migration from old schema versions

## Gotchas {#gotchas}
- `sync` storage has 8KB per item limit — don't store large arrays
- Permission requests MUST come from user gestures (click handlers)
- `storage.clear()` only removes YOUR schema keys, not all extension storage
- Always `await` storage operations — they're async
- `watch()` fires from ALL contexts — your options page changes trigger watches in popup/content too

## Related Articles {#related-articles}

## Related Articles

- [Options Page Patterns](../patterns/options-page-patterns.md)
- [Accessibility](../guides/accessibility.md)
