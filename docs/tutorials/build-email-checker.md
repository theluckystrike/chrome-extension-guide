---
layout: default
title: "Chrome Extension Email Checker — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-email-checker/"
---
# Build an Email Checker Extension

Build a Chrome extension that connects to Gmail via OAuth2, shows your unread email count on the badge, previews messages in a popup, and sends desktop notifications when new mail arrives. Uses **@theluckystrike/webext-storage** for configurable settings and the **Chrome Identity API** for secure authentication.

## Prerequisites {#prerequisites}

- Chrome 116+ with Developer Mode enabled
- Node.js 18+ and npm
- A Google Cloud project with the Gmail API enabled
- Familiarity with Chrome extension basics (manifest, service workers, popups)

---

## Step 1: Project Setup and Manifest {#step-1-project-setup-and-manifest}

```bash
mkdir email-checker && cd email-checker
npm init -y
npm install @theluckystrike/webext-storage
npm install -D typescript @types/chrome
```

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Email Checker",
  "version": "1.0.0",
  "description": "Check Gmail unread count, preview messages, and get desktop notifications.",
  "permissions": [
    "identity",
    "alarms",
    "notifications",
    "storage",
    "offscreen"
  ],
  "host_permissions": [
    "https://www.googleapis.com/*"
  ],
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify"
    ]
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.ts",
    "type": "module"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

`identity` grants access to `chrome.identity.getAuthToken()` for OAuth2 login. `alarms` powers periodic mail checks. `notifications` delivers desktop alerts. `gmail.modify` scope lets us mark messages as read. See [patterns/oauth-identity.md](../patterns/oauth-identity.md) for a deep dive into OAuth flows.

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["chrome"]
  },
  "include": ["src/**/*.ts"]
}
```

---

## Step 2: OAuth2 Login with the Chrome Identity API {#step-2-oauth2-login-with-the-chrome-identity-api}

Create `src/auth.ts` to handle Google sign-in:

```typescript
// src/auth.ts

export async function getAuthToken(interactive: boolean = true): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!token) {
        reject(new Error("No token returned"));
        return;
      }
      resolve(token);
    });
  });
}

export async function revokeToken(): Promise<void> {
  const token = await getAuthToken(false);
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
      resolve();
    });
  });
}

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken(false);
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Token expired -- clear cache and retry once
    await new Promise<void>((resolve) =>
      chrome.identity.removeCachedAuthToken({ token }, resolve)
    );
    const newToken = await getAuthToken(true);
    headers.set("Authorization", `Bearer ${newToken}`);
    return fetch(url, { ...options, headers });
  }

  return response;
}
```

`chrome.identity.getAuthToken` handles the full OAuth2 flow: consent screen, token exchange, and caching. When `interactive` is `true`, Chrome shows the Google sign-in UI. The `authenticatedFetch` wrapper automatically refreshes expired tokens.

---

## Step 3: Gmail API Integration {#step-3-gmail-api-integration}

Create `src/gmail.ts` to interact with the Gmail API:

```typescript
// src/gmail.ts

import { authenticatedFetch } from "./auth";

const GMAIL_API = "https://www.googleapis.com/gmail/v1/users/me";

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: string;
  isUnread: boolean;
}

interface MessageHeader {
  name: string;
  value: string;
}

interface GmailApiMessage {
  id: string;
  threadId: string;
  snippet: string;
  labelIds: string[];
  payload: {
    headers: MessageHeader[];
  };
  internalDate: string;
}

export async function getUnreadCount(): Promise<number> {
  const response = await authenticatedFetch(
    `${GMAIL_API}/labels/INBOX`
  );
  const label = await response.json();
  return label.messagesUnread ?? 0;
}

export async function getUnreadMessages(
  maxResults: number = 10
): Promise<GmailMessage[]> {
  const listResponse = await authenticatedFetch(
    `${GMAIL_API}/messages?labelIds=INBOX&labelIds=UNREAD&maxResults=${maxResults}`
  );
  const list = await listResponse.json();

  if (!list.messages || list.messages.length === 0) {
    return [];
  }

  const messages: GmailMessage[] = await Promise.all(
    list.messages.map(async (m: { id: string }) => {
      const msgResponse = await authenticatedFetch(
        `${GMAIL_API}/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
      );
      const msg: GmailApiMessage = await msgResponse.json();

      const getHeader = (name: string): string =>
        msg.payload.headers.find(
          (h) => h.name.toLowerCase() === name.toLowerCase()
        )?.value ?? "";

      return {
        id: msg.id,
        threadId: msg.threadId,
        snippet: msg.snippet,
        from: getHeader("From"),
        subject: getHeader("Subject"),
        date: getHeader("Date"),
        isUnread: msg.labelIds.includes("UNREAD"),
      };
    })
  );

  return messages;
}

export async function markAsRead(messageId: string): Promise<void> {
  await authenticatedFetch(
    `${GMAIL_API}/messages/${messageId}/modify`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        removeLabelIds: ["UNREAD"],
      }),
    }
  );
}
```

We query the `INBOX` label for the unread count and fetch message metadata (From, Subject, Date) for previews. The `markAsRead` function removes the `UNREAD` label using `messages.modify`.

---

## Step 4: Badge Showing Unread Count {#step-4-badge-showing-unread-count}

Create `src/badge.ts` to update the extension icon badge:

```typescript
// src/badge.ts

export async function updateBadge(count: number): Promise<void> {
  const text = count > 0 ? String(count) : "";
  const color = count > 0 ? "#DB4437" : "#4285F4";

  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });

  const title =
    count > 0
      ? `${count} unread email${count === 1 ? "" : "s"}`
      : "No unread emails";
  await chrome.action.setTitle({ title });
}

export async function setBadgeError(): Promise<void> {
  await chrome.action.setBadgeText({ text: "!" });
  await chrome.action.setBadgeBackgroundColor({ color: "#F4B400" });
  await chrome.action.setTitle({ title: "Email Checker: authentication required" });
}
```

The badge shows the unread count in red. When there are no unread messages, the badge clears. An error state uses a yellow "!" to signal that re-authentication is needed.

---

## Step 5: Popup with Email Preview List {#step-5-popup-with-email-preview-list}

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      width: 360px;
      max-height: 500px;
      margin: 0;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      overflow-y: auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    .header h2 { margin: 0; font-size: 16px; }
    .count-badge {
      background: #DB4437;
      color: #fff;
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: bold;
    }
    .email-item {
      padding: 8px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
    }
    .email-item:hover { background: #f5f5f5; }
    .email-from { font-weight: bold; font-size: 13px; }
    .email-subject { color: #333; margin-top: 2px; }
    .email-snippet { color: #777; font-size: 12px; margin-top: 2px; }
    .email-date { color: #999; font-size: 11px; float: right; }
    .btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
    .btn-login { background: #4285F4; color: #fff; }
    .btn-refresh { background: #e0e0e0; }
    .btn-mark { background: none; border: 1px solid #ccc; font-size: 11px; padding: 2px 6px; margin-top: 4px; }
    .empty { text-align: center; color: #999; padding: 24px 0; }
    #status { color: #999; font-size: 11px; text-align: center; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Email Checker</h2>
    <span id="unreadBadge" class="count-badge" style="display:none"></span>
  </div>
  <div id="loginSection" style="text-align:center; display:none;">
    <p>Sign in with Google to check your email.</p>
    <button id="loginBtn" class="btn btn-login">Sign In</button>
  </div>
  <div id="emailList"></div>
  <div id="status"></div>
  <div style="margin-top: 8px; text-align: center;">
    <button id="refreshBtn" class="btn btn-refresh">Refresh</button>
    <button id="settingsBtn" class="btn btn-refresh">Settings</button>
  </div>
  <script src="popup.js" type="module"></script>
</body>
</html>
```

Create `src/popup.ts`:

```typescript
// src/popup.ts

import { getAuthToken } from "./auth";
import { getUnreadMessages, getUnreadCount, markAsRead, GmailMessage } from "./gmail";

const emailList = document.getElementById("emailList")!;
const loginSection = document.getElementById("loginSection")!;
const unreadBadge = document.getElementById("unreadBadge")!;
const statusEl = document.getElementById("status")!;

async function init(): Promise<void> {
  try {
    await getAuthToken(false);
    loginSection.style.display = "none";
    await loadEmails();
  } catch {
    loginSection.style.display = "block";
    emailList.innerHTML = "";
  }
}

async function loadEmails(): Promise<void> {
  statusEl.textContent = "Checking...";
  try {
    const [count, messages] = await Promise.all([
      getUnreadCount(),
      getUnreadMessages(15),
    ]);

    if (count > 0) {
      unreadBadge.textContent = String(count);
      unreadBadge.style.display = "inline";
    } else {
      unreadBadge.style.display = "none";
    }

    if (messages.length === 0) {
      emailList.innerHTML = '<div class="empty">No unread emails</div>';
    } else {
      emailList.innerHTML = messages.map(renderEmail).join("");
      attachMarkReadHandlers(messages);
    }
    statusEl.textContent = `Last checked: ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    statusEl.textContent = `Error: ${(err as Error).message}`;
  }
}

function renderEmail(msg: GmailMessage): string {
  const fromName = msg.from.replace(/<.*>/, "").trim();
  const date = new Date(msg.date);
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return `
    <div class="email-item" data-id="${msg.id}">
      <span class="email-date">${timeStr}</span>
      <div class="email-from">${escapeHtml(fromName)}</div>
      <div class="email-subject">${escapeHtml(msg.subject)}</div>
      <div class="email-snippet">${escapeHtml(msg.snippet)}</div>
      <button class="btn btn-mark" data-msg-id="${msg.id}">Mark as read</button>
    </div>
  `;
}

function attachMarkReadHandlers(messages: GmailMessage[]): void {
  document.querySelectorAll("[data-msg-id]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const msgId = (btn as HTMLElement).dataset.msgId!;
      await markAsRead(msgId);
      const item = document.querySelector(`[data-id="${msgId}"]`);
      item?.remove();
      chrome.runtime.sendMessage({ type: "REFRESH_BADGE" });
    });
  });

  document.querySelectorAll(".email-item").forEach((item) => {
    item.addEventListener("click", () => {
      const msgId = (item as HTMLElement).dataset.id!;
      const msg = messages.find((m) => m.id === msgId);
      if (msg) {
        chrome.tabs.create({
          url: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId}`,
        });
      }
    });
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById("loginBtn")!.addEventListener("click", async () => {
  try {
    await getAuthToken(true);
    loginSection.style.display = "none";
    await loadEmails();
  } catch (err) {
    statusEl.textContent = `Login failed: ${(err as Error).message}`;
  }
});

document.getElementById("refreshBtn")!.addEventListener("click", loadEmails);

document.getElementById("settingsBtn")!.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

init();
```

Clicking an email opens it in Gmail. The "Mark as read" button removes the UNREAD label and refreshes the badge. The popup auto-loads when opened, showing a login screen if no token is cached.

---

## Step 6: Desktop Notifications for New Emails {#step-6-desktop-notifications-for-new-emails}

Create `src/notifications.ts`:

```typescript
// src/notifications.ts

import type { GmailMessage } from "./gmail";

const NOTIFICATION_ID_PREFIX = "email-checker-";

export function notifyNewEmails(newMessages: GmailMessage[]): void {
  if (newMessages.length === 0) return;

  if (newMessages.length === 1) {
    const msg = newMessages[0];
    const fromName = msg.from.replace(/<.*>/, "").trim();
    chrome.notifications.create(`${NOTIFICATION_ID_PREFIX}${msg.id}`, {
      type: "basic",
      iconUrl: "../icons/icon128.png",
      title: fromName,
      message: msg.subject || "(no subject)",
      contextMessage: msg.snippet,
      buttons: [{ title: "Mark as read" }, { title: "Open in Gmail" }],
      priority: 1,
      requireInteraction: false,
    });
  } else {
    chrome.notifications.create(`${NOTIFICATION_ID_PREFIX}batch`, {
      type: "basic",
      iconUrl: "../icons/icon128.png",
      title: `${newMessages.length} new emails`,
      message: newMessages
        .slice(0, 3)
        .map((m) => m.from.replace(/<.*>/, "").trim())
        .join(", "),
      priority: 1,
    });
  }
}

export function setupNotificationHandlers(): void {
  chrome.notifications.onButtonClicked.addListener(
    async (notificationId, buttonIndex) => {
      if (!notificationId.startsWith(NOTIFICATION_ID_PREFIX)) return;

      const msgId = notificationId.replace(NOTIFICATION_ID_PREFIX, "");

      if (buttonIndex === 0) {
        // Mark as read
        const { markAsRead } = await import("./gmail");
        await markAsRead(msgId);
        chrome.notifications.clear(notificationId);
      } else if (buttonIndex === 1) {
        // Open in Gmail
        chrome.tabs.create({
          url: `https://mail.google.com/mail/u/0/#inbox/${msgId}`,
        });
        chrome.notifications.clear(notificationId);
      }
    }
  );

  chrome.notifications.onClicked.addListener((notificationId) => {
    if (!notificationId.startsWith(NOTIFICATION_ID_PREFIX)) return;
    chrome.tabs.create({ url: "https://mail.google.com" });
    chrome.notifications.clear(notificationId);
  });
}
```

Single new emails show a rich notification with the sender, subject, and snippet. Batch arrivals collapse into a summary. Notification buttons let users mark as read or open in Gmail directly. See [patterns/notification-patterns.md](../patterns/notification-patterns.md) for more notification strategies.

---

## Step 7: Mark as Read from Notification Action {#step-7-mark-as-read-from-notification-action}

The notification handler in Step 6 already wires up the "Mark as read" button. The flow works like this:

1. `chrome.notifications.onButtonClicked` fires with `buttonIndex === 0`
2. We call `markAsRead(msgId)` which sends a `POST` to `messages/{id}/modify`
3. The notification is cleared
4. On the next alarm cycle, the badge count updates automatically

To also trigger an immediate badge refresh after marking as read from a notification:

```typescript
// Add to the buttonIndex === 0 handler in notifications.ts

if (buttonIndex === 0) {
  const { markAsRead } = await import("./gmail");
  const { getUnreadCount } = await import("./gmail");
  const { updateBadge } = await import("./badge");

  await markAsRead(msgId);
  const count = await getUnreadCount();
  await updateBadge(count);
  chrome.notifications.clear(notificationId);
}
```

---

## Step 8: Configurable Check Interval with @theluckystrike/webext-storage {#step-8-configurable-check-interval-with-theluckystrikewebext-storage}

Create `src/settings.ts`:

```typescript
// src/settings.ts

import { createStorage } from "@theluckystrike/webext-storage";

export interface EmailCheckerSettings {
  checkIntervalMinutes: number;
  notificationsEnabled: boolean;
  maxPreviewCount: number;
  soundEnabled: boolean;
}

const defaults: EmailCheckerSettings = {
  checkIntervalMinutes: 5,
  notificationsEnabled: true,
  maxPreviewCount: 15,
  soundEnabled: false,
};

export const settingsStorage = createStorage<EmailCheckerSettings>(
  "emailCheckerSettings",
  defaults
);

export async function getSettings(): Promise<EmailCheckerSettings> {
  return settingsStorage.get();
}

export async function updateSettings(
  partial: Partial<EmailCheckerSettings>
): Promise<void> {
  const current = await settingsStorage.get();
  await settingsStorage.set({ ...current, ...partial });
}
```

Now create the background service worker that ties everything together.

Create `src/background.ts`:

```typescript
// src/background.ts

import { getAuthToken } from "./auth";
import { getUnreadCount, getUnreadMessages, GmailMessage } from "./gmail";
import { updateBadge, setBadgeError } from "./badge";
import { notifyNewEmails, setupNotificationHandlers } from "./notifications";
import { getSettings, settingsStorage } from "./settings";

const ALARM_NAME = "check-email";

let previousMessageIds: Set<string> = new Set();

async function checkEmails(): Promise<void> {
  try {
    await getAuthToken(false);
  } catch {
    await setBadgeError();
    return;
  }

  try {
    const settings = await getSettings();
    const [count, messages] = await Promise.all([
      getUnreadCount(),
      getUnreadMessages(settings.maxPreviewCount),
    ]);

    await updateBadge(count);

    // Detect genuinely new messages
    const currentIds = new Set(messages.map((m) => m.id));
    const newMessages: GmailMessage[] = messages.filter(
      (m) => !previousMessageIds.has(m.id)
    );
    previousMessageIds = currentIds;

    if (settings.notificationsEnabled && newMessages.length > 0) {
      notifyNewEmails(newMessages);
    }
  } catch (err) {
    console.error("[Email Checker] check failed:", err);
  }
}

async function scheduleAlarm(): Promise<void> {
  const settings = await getSettings();
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 0.1,
    periodInMinutes: settings.checkIntervalMinutes,
  });
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkEmails();
  }
});

// Listen for settings changes to reschedule
settingsStorage.onChange(async () => {
  await scheduleAlarm();
});

// Listen for manual refresh from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "REFRESH_BADGE") {
    checkEmails();
  }
});

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  scheduleAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleAlarm();
});

setupNotificationHandlers();
```

The background worker creates an alarm based on the user's configured interval. When the alarm fires, it fetches the unread count and messages, updates the badge, and sends notifications for any genuinely new messages (by comparing against the previous set of message IDs). Changing the interval in settings automatically reschedules the alarm.

---

## Full Project Structure {#full-project-structure}

```
email-checker/
  manifest.json
  tsconfig.json
  package.json
  icons/
    icon16.png
    icon48.png
    icon128.png
  src/
    auth.ts
    gmail.ts
    badge.ts
    notifications.ts
    settings.ts
    background.ts
    popup.ts
  popup/
    popup.html
```

## Google Cloud Setup {#google-cloud-setup}

Before loading the extension:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Gmail API** under APIs & Services
4. Create an **OAuth 2.0 Client ID** of type "Chrome Extension"
5. Enter your extension ID (visible at `chrome://extensions` after loading unpacked)
6. Copy the client ID into `manifest.json` under `oauth2.client_id`

## Key Takeaways {#key-takeaways}

- **chrome.identity.getAuthToken** manages the entire OAuth2 lifecycle -- consent, token exchange, caching, and refresh
- **Gmail API** `labels/INBOX` endpoint is the most efficient way to get unread counts without fetching full messages
- **chrome.alarms** is required for periodic work in MV3 service workers; `setInterval` does not survive worker termination
- **Notification buttons** enable quick actions (mark as read, open) without switching context
- **@theluckystrike/webext-storage** simplifies typed settings with reactive `onChange` listeners that trigger alarm rescheduling

## Cross-references {#cross-references}

- [patterns/oauth-identity.md](../patterns/oauth-identity.md) -- OAuth2 flows and token management
- [patterns/notification-patterns.md](../patterns/notification-patterns.md) -- Desktop notification strategies and best practices
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
