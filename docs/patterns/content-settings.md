# Chrome Extension Content Settings API Patterns

## Overview

The Chrome Content Settings API (`chrome.contentSettings`) enables extensions to read and modify browser content preferences at a granular level. This API allows you to control JavaScript execution, cookie behavior, image loading, popup blocking, and more—on a per-site or pattern basis.

Key facts:
- **Permission Required**: `"contentSettings"` in manifest
- **API Type**: Background-only API (accessible from service worker)
- **Pattern Matching**: Uses URL patterns with wildcards (`*://*.example.com/*`)
- **Storage**: Use `@theluckystrike/webext-storage` for persisting custom rules
- **Messaging**: Use `@theluckystrike/webext-messaging` to communicate between popup/options and background

The API provides type-specific managers:
- `chrome.contentSettings.javascript` — JavaScript enable/disable
- `chrome.contentSettings.cookies` — Cookie behavior
- `chrome.contentSettings.popups` — Popup blocking
- `chrome.contentSettings.images` — Image loading
- `chrome.contentSettings.notifications` — Notification permissions

---

## Required Permission

```json
{
  "name": "Content Settings Manager",
  "version": "1.0.0",
  "permissions": ["contentSettings", "storage"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.js" }
}
```

---

## Pattern 1: Reading Current Content Settings

The `chrome.contentSettings.*.get()` method retrieves the current setting for a given URL.

### Getting Settings for the Current Page

```ts
// background/contentSettingsReader.ts
interface ContentSettingResult {
  setting: string;
  source: "policy" | "extension" | "user" | "default";
}

async function getContentSettingForUrl(
  contentType: string,
  url: string
): Promise<ContentSettingResult> {
  return new Promise((resolve, reject) => {
    chrome.contentSettings[contentType].get({ primaryUrl: url }, (details) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve({ setting: details.setting, source: details.source });
      }
    });
  });
}

// Usage
async function checkCurrentPageSettings(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url) return;

  const jsSetting = await getContentSettingForUrl("javascript", tab.url);
  const cookieSetting = await getContentSettingForUrl("cookies", tab.url);
  console.log(`JavaScript: ${jsSetting.setting} (source: ${jsSetting.source})`);
  console.log(`Cookies: ${cookieSetting.setting}`);
}
```

### Reading Default Settings

```ts
// background/defaultSettings.ts
async function getDefaultSetting(contentType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.contentSettings[contentType].get({ primaryUrl: "" }, (details) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(details.setting);
    });
  });
}

async function getAllDefaultSettings(): Promise<Record<string, string>> {
  const contentTypes = ["javascript", "cookies", "images", "popups", "notifications"];
  const defaults: Record<string, string> = {};
  for (const type of contentTypes) {
    try { defaults[type] = await getDefaultSetting(type); } catch {}
  }
  return defaults;
}
```

---

## Pattern 2: Setting Per-Site JavaScript Enable/Disable Rules

JavaScript control is one of the most powerful features of the Content Settings API.

### Basic JavaScript Blocking

```ts
// background/javascriptController.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const jsControlSchema = defineSchema({
  blockedPatterns: { type: "array", default: [] },
  enabledPatterns: { type: "array", default: [] },
});
const jsStorage = createStorage(jsControlSchema);

async function setJavascriptSetting(pattern: string, enabled: boolean): Promise<void> {
  const setting = enabled ? "allow" : "block";
  return new Promise((resolve, reject) => {
    chrome.contentSettings.javascript.set({ primaryPattern: pattern, setting }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

async function blockJavascript(domain: string): Promise<void> {
  await setJavascriptSetting(`*://${domain}/*`, false);
}

async function enableJavascript(domain: string): Promise<void> {
  await setJavascriptSetting(`*://${domain}/*`, true);
}
```

### Managing JavaScript Rules with Storage

```ts
// background/javascriptManager.ts
interface JSRulesSchema {
  rules: Array<{ id: string; pattern: string; enabled: boolean; timestamp: number }>;
}

const jsRulesStorage = createStorage<JSRulesSchema>({ rules: { type: "array", default: [] } });

function generateRuleId(): string {
  return `js-rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function addJavascriptRule(pattern: string): Promise<string> {
  const id = generateRuleId();
  const rules = await jsRulesStorage.get("rules");
  const newRule = { id, pattern, enabled: true, timestamp: Date.now() };
  await setJavascriptSetting(pattern, true);
  await jsRulesStorage.set("rules", [...rules.rules, newRule]);
  return id;
}

async function removeJavascriptRule(ruleId: string): Promise<void> {
  const rules = await jsRulesStorage.get("rules");
  const ruleToRemove = rules.rules.find((r) => r.id === ruleId);
  if (ruleToRemove) {
    await clearContentSetting("javascript", ruleToRemove.pattern);
    await jsRulesStorage.set("rules", rules.rules.filter((r) => r.id !== ruleId));
  }
}

async function clearContentSetting(contentType: string, pattern: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contentSettings[contentType].clear({ primaryPattern: pattern }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}
```

---

## Pattern 3: Managing Cookie Settings Per Pattern

The cookie settings API provides granular control over cookie behavior.

### Cookie Setting Configuration

```ts
// background/cookieController.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

export type CookieSettingType = "allow" | "block" | "session_only";

const cookieSchema = defineSchema({
  cookieRules: { type: "array", default: [] },
  defaultCookieSetting: { type: "string", default: "allow" },
});
const cookieStorage = createStorage(cookieSchema);

async function setCookieSetting(
  pattern: string,
  setting: CookieSettingType,
  expiration?: number
): Promise<void> {
  const details: { primaryPattern: string; setting: CookieSettingType; expiration?: number } = {
    primaryPattern: pattern,
    setting,
  };
  if (expiration) details.expiration = expiration;

  return new Promise((resolve, reject) => {
    chrome.contentSettings.cookies.set(details, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

async function blockCookies(domain: string): Promise<void> {
  await setCookieSetting(`*://${domain}/*`, "block");
}

async function setSessionCookies(domain: string): Promise<void> {
  await setCookieSetting(`*://${domain}/*`, "session_only");
}
```

### Third-Party Cookie Control

```ts
// background/thirdPartyCookies.ts
async function setThirdPartyCookieSetting(
  primaryPattern: string,
  setting: "allow" | "block"
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contentSettings.cookies.set(
      { primaryPattern, secondaryPattern: "*://*/*", setting },
      () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      }
    );
  });
}

async function blockThirdPartyCookies(domain: string): Promise<void> {
  await setCookieSetting(`*://${domain}/*`, "allow");
  await setThirdPartyCookieSetting(`*://${domain}/*`, "block");
}
```

---

## Pattern 4: Controlling Popup Blocker Settings

The popup blocker settings API allows you to manage which sites can open popups.

### Popup Setting Management

```ts
// background/popupController.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

interface PopupRule { domain: string; allowed: boolean; createdAt: number; }

const popupSchema = defineSchema({
  allowedPopups: { type: "array", default: [] },
  blockedPopups: { type: "array", default: [] },
});
const popupStorage = createStorage(popupSchema);

async function setPopupSetting(pattern: string, allowed: boolean): Promise<void> {
  const setting = allowed ? "allow" : "block";
  return new Promise((resolve, reject) => {
    chrome.contentSettings.popups.set({ primaryPattern: pattern, setting }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

async function allowPopups(domain: string): Promise<void> {
  await setPopupSetting(`*://${domain}/*`, true);
}

async function blockPopups(domain: string): Promise<void> {
  await setPopupSetting(`*://${domain}/*`, false);
}

async function getPopupSetting(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.contentSettings.popups.get({ primaryUrl: url }, (details) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(details.setting);
    });
  });
}
```

---

## Pattern 5: Managing Image Loading Settings

Image loading control is valuable for bandwidth-conscious browsing.

### Image Setting Configuration

```ts
// background/imageController.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const imageSchema = defineSchema({
  blockedImages: { type: "array", default: [] },
  imageLoadingEnabled: { type: "boolean", default: true },
});
const imageStorage = createStorage(imageSchema);

async function setImageSetting(pattern: string, enabled: boolean): Promise<void> {
  const setting = enabled ? "allow" : "block";
  return new Promise((resolve, reject) => {
    chrome.contentSettings.images.set({ primaryPattern: pattern, setting }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

async function blockImages(domain: string): Promise<void> {
  await setImageSetting(`*://${domain}/*`, false);
}

async function allowImages(domain: string): Promise<void> {
  await setImageSetting(`*://${domain}/*`, true);
}

async function enableDataSaverMode(): Promise<void> {
  await setImageSetting("*://*/*", false);
  await imageStorage.set("imageLoadingEnabled", false);
}

async function disableDataSaverMode(): Promise<void> {
  await setImageSetting("*://*/*", true);
  await imageStorage.set("imageLoadingEnabled", true);
}
```

### Selective Image Blocking

```ts
// background/selectiveImageBlocker.ts
async function blockImagesFromDomain(sourceDomain: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contentSettings.images.set(
      { primaryPattern: `*://${sourceDomain}/*`, setting: "block" },
      () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      }
    );
  });
}
```

---

## Pattern 6: Building a Site-Specific Settings Manager UI

This pattern demonstrates how to create a comprehensive UI for managing content settings per-site.

### Messaging API Setup

```ts
// background/messaging/contentSettingsMessenger.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const messenger = createMessenger();

messenger.onMessage("content-settings:get", async (message) => {
  const { url } = message.payload;
  const [javascript, cookies, images, popups] = await Promise.all([
    getContentSettingForUrl("javascript", url),
    getContentSettingForUrl("cookies", url),
    getContentSettingForUrl("images", url),
    getContentSettingForUrl("popups", url),
  ]);
  return { javascript, cookies, images, popups };
});

messenger.onMessage("content-settings:set", async (message) => {
  const { type, pattern, setting } = message.payload;
  return new Promise((resolve, reject) => {
    chrome.contentSettings[type].set({ primaryPattern: pattern, setting }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve({ success: true });
    });
  });
});
```

### Popup UI Implementation

```ts
// popup/SiteSettingsManager.tsx
import { useState, useEffect } from "react";
import { createMessenger } from "@theluckystrike/webext-messaging";

interface SiteSettings {
  javascript: { setting: string };
  cookies: { setting: string };
  images: { setting: string };
  popups: { setting: string };
}

const messenger = createMessenger();

export function SiteSettingsManager() {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    async function loadCurrentTab() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url) {
        setCurrentUrl(tab.url);
        const result = await messenger.sendMessage("content-settings:get", { url: tab.url });
        setSettings(result);
      }
    }
    loadCurrentTab();
  }, []);

  async function updateSetting(type: string, setting: string) {
    if (!currentUrl) return;
    const urlObj = new URL(currentUrl);
    await messenger.sendMessage("content-settings:set", {
      type,
      pattern: `*://${urlObj.hostname}/*`,
      setting,
    });
    const result = await messenger.sendMessage("content-settings:get", { url: currentUrl });
    setSettings(result);
  }

  if (!settings) return <div>Loading...</div>;

  return (
    <div className="settings-manager">
      <h2>{new URL(currentUrl).hostname}</h2>
      {(["javascript", "cookies", "images", "popups"] as const).map((type) => (
        <div key={type} className="setting-group">
          <label>{type.charAt(0).toUpperCase() + type.slice(1)}</label>
          <select value={settings[type].setting} onChange={(e) => updateSetting(type, e.target.value)}>
            <option value="allow">Allow</option>
            <option value="block">Block</option>
            {type === "cookies" && <option value="session_only">Session Only</option>}
          </select>
        </div>
      ))}
    </div>
  );
}
```

---

## Pattern 7: Bulk Content Settings Import/Export

For enterprise deployments or policy-based management.

### Export Settings

```ts
// background/settingsExporter.ts
interface ExportedContentSettings {
  version: string;
  exportedAt: string;
  settings: {
    javascript: Array<{ pattern: string; setting: string }>;
    cookies: Array<{ pattern: string; setting: string }>;
    popups: Array<{ pattern: string; setting: string }>;
  };
}

async function exportAllContentSettings(): Promise<ExportedContentSettings> {
  const jsRules = await jsStorage.get("blockedPatterns");
  const cookieRules = await cookieStorage.get("cookieRules");
  const popupRules = await popupStorage.get("allowedPopups");

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    settings: {
      javascript: jsRules.blockedPatterns.map((p: string) => ({ pattern: p, setting: "block" })),
      cookies: cookieRules.cookieRules.map((r: any) => ({ pattern: r.pattern, setting: r.setting })),
      popups: popupRules.allowedPopups.map((p: PopupRule) => ({
        pattern: `*://${p.domain}/*`,
        setting: "allow",
      })),
    },
  };
}
```

### Import Settings

```ts
// background/settingsImporter.ts
interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

async function importContentSettings(importData: ExportedContentSettings): Promise<ImportResult> {
  const result: ImportResult = { success: true, imported: 0, failed: 0, errors: [] };

  for (const rule of importData.settings.javascript) {
    try {
      await setJavascriptSetting(rule.pattern, rule.setting === "allow");
      result.imported++;
    } catch (e: any) {
      result.failed++;
      result.errors.push(`JS: ${rule.pattern} - ${e.message}`);
    }
  }

  for (const rule of importData.settings.cookies) {
    try {
      await setCookieSetting(rule.pattern, rule.setting as CookieSettingType);
      result.imported++;
    } catch (e: any) {
      result.failed++;
      result.errors.push(`Cookies: ${rule.pattern} - ${e.message}`);
    }
  }

  for (const rule of importData.settings.popups) {
    try {
      await setPopupSetting(rule.pattern, rule.setting === "allow");
      result.imported++;
    } catch (e: any) {
      result.failed++;
      result.errors.push(`Popups: ${rule.pattern} - ${e.message}`);
    }
  }

  result.success = result.failed === 0;
  return result;
}
```

---

## Pattern 8: Clearing Custom Rules and Restoring Defaults

### Clear Individual Settings

```ts
// background/settingsResetter.ts
async function clearContentSetting(contentType: string, pattern?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contentSettings[contentType].clear(pattern ? { primaryPattern: pattern } : {}, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

async function resetJavascriptSetting(pattern: string): Promise<void> {
  await clearContentSetting("javascript", pattern);
}

async function resetAllJavascriptSettings(): Promise<void> {
  await clearContentSetting("javascript");
}
```

### Bulk Reset with Storage Cleanup

```ts
// background/bulkResetter.ts
interface ResetResult { success: boolean; clearedPatterns: number; }

async function clearAllCustomRules(): Promise<ResetResult> {
  const contentTypes = ["javascript", "cookies", "images", "popups", "notifications"];
  for (const contentType of contentTypes) {
    try { await clearContentSetting(contentType); } catch (e) { console.error(e); }
  }

  await jsStorage.set("blockedPatterns", []);
  await jsStorage.set("enabledPatterns", []);
  await cookieStorage.set("cookieRules", []);
  await popupStorage.set("allowedPopups", []);
  await popupStorage.set("blockedPopups", []);

  return { success: true, clearedPatterns: contentTypes.length };
}

async function resetDomainSettings(domain: string): Promise<void> {
  const pattern = `*://${domain}/*`;
  await Promise.all(["javascript", "cookies", "images", "popups"].map((t) => clearContentSetting(t, pattern)));
}

async function factoryReset(): Promise<void> {
  await clearAllCustomRules();
  await chrome.storage.local.clear();
}
```

---

## Summary Table

| Pattern | API Method | Use Case | Common Settings |
|---------|-----------|----------|-----------------|
| 1. Reading Settings | `chrome.contentSettings.*.get()` | Check current state | All content types |
| 2. JavaScript Control | `chrome.contentSettings.javascript.set()` | Block/enable JS per-site | `allow`, `block` |
| 3. Cookie Management | `chrome.contentSettings.cookies.set()` | Control cookie behavior | `allow`, `block`, `session_only` |
| 4. Popup Control | `chrome.contentSettings.popups.set()` | Manage popup blocking | `allow`, `block` |
| 5. Image Settings | `chrome.contentSettings.images.set()` | Bandwidth/privacy | `allow`, `block` |
| 6. Site Manager UI | `@theluckystrike/webext-messaging` | User-facing interface | All types |
| 7. Import/Export | Custom + `@theluckystrike/webext-storage` | Policy deployment | Bulk operations |
| 8. Clear/Reset | `chrome.contentSettings.*.clear()` | Restore defaults | All content types |

### Key Takeaways

1. **Permission Required**: Always declare `"contentSettings"` in your manifest
2. **Pattern Matching**: Use URL patterns like `*://*.example.com/*` for flexible matching
3. **Persistence**: Track rules in `@theluckystrike/webext-storage` since the API doesn't provide enumeration
4. **Background Only**: Content Settings API is available only from the background/service worker
5. **Clear Defaults**: Use `clear()` with empty pattern to reset all custom rules
6. **Source Tracking**: The `source` property indicates if setting came from policy, extension, or user
