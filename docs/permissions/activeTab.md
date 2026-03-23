---
layout: default
title: "activeTab Permission Reference"
description: "Grants temporary access to the currently active tab when the user invokes the extension (click, keyboard shortcut, context menu) Access is temporary. expire..."
permalink: /permissions/activeTab/
category: permissions
order: 1
canonical_url: "https://bestchromeextensions.com/permissions/activeTab/"
---

activeTab Permission Reference

What It Does {#what-it-does}
- Grants temporary access to the currently active tab when the user invokes the extension (click, keyboard shortcut, context menu)
- Access is temporary. expires when the user navigates away or closes the tab
- Grants: `chrome.scripting.executeScript()` on the active tab, access to the tab's URL/title/favIconUrl, host permission for the tab's origin

Why Use activeTab {#why-use-activetab}
- No scary "Read and change all your data on all websites" warning
- Users trust it more. access only happens on explicit interaction
- Chrome Web Store reviews are faster with narrow permissions

When activeTab Is NOT Enough {#when-activetab-is-not-enough}
- You need access to tabs the user didn't click on
- You need persistent background access to tab content
- You need to inject scripts on page load (use `scripting` + host permissions instead)

Manifest Configuration {#manifest-configuration}
```json
{
  "permissions": ["activeTab"],
  "action": {
    "default_popup": "popup.html"
  }
}
```

No `optional_permissions` needed. `activeTab` is always a required permission.

Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

Checking if granted {#checking-if-granted}
```ts
import { checkPermission } from "@theluckystrike/webext-permissions";

const result = await checkPermission("activeTab");
console.log(result.description);
// "Access the currently active tab when you click the extension"
console.log(result.granted); // true if declared in manifest
```

Description from PERMISSION_DESCRIPTIONS {#description-from-permission-descriptions}
```ts
import { PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

PERMISSION_DESCRIPTIONS.activeTab;
// "Access the currently active tab when you click the extension"
```

Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Common pattern: popup sends message to background, background uses activeTab to execute script on current tab.

```ts
// shared/messages.ts
type Messages = {
  extractPageData: {
    request: void;
    response: { title: string; url: string; text: string };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();

msg.onMessage({
  extractPageData: async (_payload, sender) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => ({
        title: document.title,
        url: location.href,
        text: document.body.innerText.slice(0, 1000),
      }),
    });
    return result.result;
  },
});

// popup.ts
const msg = createMessenger<Messages>();
const data = await msg.send("extractPageData", undefined);
console.log(data.title, data.url);
```

Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Store data extracted via activeTab:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  lastExtractedUrl: "",
  lastExtractedTitle: "",
  extractCount: 0,
});

const storage = createStorage({ schema });

// After extracting data via activeTab
await storage.setMany({
  lastExtractedUrl: data.url,
  lastExtractedTitle: data.title,
});
await storage.set("extractCount", (await storage.get("extractCount")) + 1);
```

Common Patterns {#common-patterns}
1. Click-to-extract (popup + activeTab + scripting)
2. Context menu action (contextMenus + activeTab)
3. Keyboard shortcut trigger (commands + activeTab)

Gotchas {#gotchas}
- activeTab does NOT grant access in the background without user gesture
- Does not work with `chrome.tabs.query()` for non-active tabs
- The permission auto-revokes on navigation. you can't cache it

Related Permissions {#related-permissions}
- [tabs](tabs.md). persistent tab metadata access
- [scripting](scripting.md). inject scripts (needs host permissions without activeTab)

API Reference {#api-reference}
- [Chrome activeTab docs](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
```

Frequently Asked Questions

What does the activeTab permission do?
The activeTab permission grants temporary access to the currently active tab only when the user explicitly invokes your extension (by clicking, using a keyboard shortcut, or context menu). Access is automatically revoked when the user navigates away or closes the tab.

Is activeTab better than host permissions?
Yes, for most use cases. activeTab doesn't trigger the scary "Read and change all your data on all websites" warning in the Chrome Web Store, leading to higher conversion rates and faster review times.

Can I use activeTab with chrome.tabs.query()?
No. activeTab only grants access to the tab the user interacted with. For querying other tabs, you'll need host permissions or the tabs permission.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
