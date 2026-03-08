---
layout: default
title: "Chrome Extension Multi Account Patterns — Best Practices"
description: "Handle multiple user accounts in extensions."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/multi-account-patterns/"
---

# Multi-Account and Profile Patterns

## Overview {#overview}

Chrome supports multiple user profiles, each with its own set of extensions, storage, and browsing data. Extensions that manage multiple accounts -- whether across Chrome profiles or within a single profile -- need strategies for isolating data, switching contexts, and keeping settings in sync. This guide covers eight patterns for building profile-aware and multi-account extensions in Manifest V3, from detecting the active profile to migrating data between them.

---

## Profile and Account Terminology {#profile-and-account-terminology}

| Concept | Scope | Description |
|---------|-------|-------------|
| Chrome profile | Browser-level | A separate user directory with its own extensions, bookmarks, and cookies |
| Account (within extension) | Extension-level | A logical user identity managed by the extension (e.g., work vs. personal) |
| `chrome.storage.local` | Per-profile | Data isolated to the current Chrome profile |
| `chrome.storage.sync` | Per-Google-account | Data synced across devices for the signed-in Google account |
| `chrome.identity` | Per-profile | OAuth tokens scoped to the profile's Google account |

---

## Pattern 1: Detecting Chrome Profiles {#pattern-1-detecting-chrome-profiles}

Chrome does not expose a direct "profile ID" API, but you can fingerprint the current profile using the signed-in account and session information:

```ts
// lib/profile-detection.ts

interface ProfileInfo {
  profileId: string;
  email: string | null;
  isGuest: boolean;
}

export async function detectProfile(): Promise<ProfileInfo> {
  // chrome.identity.getProfileUserInfo requires the "identity.email" permission
  const userInfo = await chrome.identity.getProfileUserInfo({
    accountStatus: "ANY",
  });

  const isGuest = !userInfo.id;

  // Use the account ID as a stable profile identifier.
  // For guest profiles, fall back to a locally generated UUID.
  let profileId = userInfo.id;
  if (!profileId) {
    const stored = await chrome.storage.local.get("guestProfileId");
    profileId = stored.guestProfileId ?? crypto.randomUUID();
    await chrome.storage.local.set({ guestProfileId: profileId });
  }

  return {
    profileId,
    email: userInfo.email || null,
    isGuest,
  };
}
```

```json
// manifest.json (partial)
{
  "permissions": ["identity", "identity.email"]
}
```

The `identity.email` permission is required to read the signed-in email address. Without it, `getProfileUserInfo` returns empty strings. Guest and incognito profiles have no signed-in user, so the extension generates a local UUID as a fallback.

---

## Pattern 2: Per-Profile Storage Isolation {#pattern-2-per-profile-storage-isolation}

When your extension supports multiple logical accounts within a single Chrome profile, you need to namespace storage keys to prevent collisions:

```ts
// lib/profile-storage.ts

type StorageArea = "local" | "sync" | "session";

class ProfileStorage {
  private prefix: string;

  constructor(private profileId: string) {
    this.prefix = `profile:${profileId}:`;
  }

  private key(name: string): string {
    return `${this.prefix}${name}`;
  }

  async get<T>(name: string, area: StorageArea = "local"): Promise<T | undefined> {
    const fullKey = this.key(name);
    const result = await chrome.storage[area].get(fullKey);
    return result[fullKey] as T | undefined;
  }

  async set<T>(name: string, value: T, area: StorageArea = "local"): Promise<void> {
    await chrome.storage[area].set({ [this.key(name)]: value });
  }

  async remove(name: string, area: StorageArea = "local"): Promise<void> {
    await chrome.storage[area].remove(this.key(name));
  }

  async getAll(area: StorageArea = "local"): Promise<Record<string, unknown>> {
    const all = await chrome.storage[area].get(null);
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith(this.prefix)) {
        result[key.slice(this.prefix.length)] = value;
      }
    }
    return result;
  }

  async clear(area: StorageArea = "local"): Promise<void> {
    const keys = Object.keys(await this.getAll(area)).map((k) => this.key(k));
    if (keys.length > 0) {
      await chrome.storage[area].remove(keys);
    }
  }
}

// Usage
const storage = new ProfileStorage("user-abc-123");
await storage.set("theme", "dark");
await storage.set("lastSync", Date.now());

const theme = await storage.get<string>("theme"); // "dark"
```

This approach keeps all profile data addressable while avoiding the complexity of separate storage databases. The `clear` method removes only keys belonging to that profile, leaving other profiles untouched.

---

## Pattern 3: Account Switching UI in Popup {#pattern-3-account-switching-ui-in-popup}

A common pattern is letting users switch between multiple accounts directly from the popup. The key challenge is updating all UI state without closing the popup:

```ts
// lib/account-manager.ts

interface Account {
  id: string;
  label: string;
  email: string;
  avatarUrl: string;
  color: string;
}

class AccountManager {
  private static STORAGE_KEY = "accounts";
  private static ACTIVE_KEY = "activeAccountId";

  async listAccounts(): Promise<Account[]> {
    const data = await chrome.storage.local.get(AccountManager.STORAGE_KEY);
    return data[AccountManager.STORAGE_KEY] ?? [];
  }

  async getActiveAccount(): Promise<Account | null> {
    const { [AccountManager.ACTIVE_KEY]: activeId } =
      await chrome.storage.local.get(AccountManager.ACTIVE_KEY);
    if (!activeId) return null;

    const accounts = await this.listAccounts();
    return accounts.find((a) => a.id === activeId) ?? null;
  }

  async switchAccount(accountId: string): Promise<void> {
    const accounts = await this.listAccounts();
    const target = accounts.find((a) => a.id === accountId);
    if (!target) throw new Error(`Account ${accountId} not found`);

    await chrome.storage.local.set({
      [AccountManager.ACTIVE_KEY]: accountId,
    });

    // Notify all extension contexts about the switch
    await chrome.runtime.sendMessage({
      type: "ACCOUNT_SWITCHED",
      accountId,
    });

    // Update badge to reflect the active account
    await chrome.action.setBadgeBackgroundColor({ color: target.color });
    await chrome.action.setBadgeText({ text: target.label[0] });
  }

  async addAccount(account: Omit<Account, "id">): Promise<Account> {
    const accounts = await this.listAccounts();
    const newAccount: Account = { ...account, id: crypto.randomUUID() };
    accounts.push(newAccount);
    await chrome.storage.local.set({
      [AccountManager.STORAGE_KEY]: accounts,
    });

    // If this is the first account, make it active
    if (accounts.length === 1) {
      await this.switchAccount(newAccount.id);
    }
    return newAccount;
  }

  async removeAccount(accountId: string): Promise<void> {
    let accounts = await this.listAccounts();
    accounts = accounts.filter((a) => a.id !== accountId);
    await chrome.storage.local.set({
      [AccountManager.STORAGE_KEY]: accounts,
    });

    // Clean up profile-scoped storage
    const profileStorage = new ProfileStorage(accountId);
    await profileStorage.clear("local");
    await profileStorage.clear("sync");
  }
}
```

```html
<!-- popup.html (account switcher fragment) -->
<div id="account-switcher" class="account-switcher">
  <button id="current-account" class="account-button">
    <img id="avatar" class="avatar" alt="Account avatar" />
    <span id="account-label"></span>
    <span class="chevron">&#9662;</span>
  </button>
  <ul id="account-list" class="account-list hidden"></ul>
</div>
```

```ts
// popup.ts (wiring the switcher)

const manager = new AccountManager();

async function renderAccountSwitcher(): void {
  const accounts = await manager.listAccounts();
  const active = await manager.getActiveAccount();
  if (!active) return;

  document.getElementById("avatar")!.setAttribute("src", active.avatarUrl);
  document.getElementById("account-label")!.textContent = active.label;

  const list = document.getElementById("account-list")!;
  list.innerHTML = accounts
    .filter((a) => a.id !== active.id)
    .map(
      (a) =>
        `<li data-id="${a.id}" class="account-item">
          <img src="${a.avatarUrl}" class="avatar-small" alt="${a.label}" />
          <span>${a.label}</span>
        </li>`
    )
    .join("");

  list.addEventListener("click", async (e) => {
    const item = (e.target as HTMLElement).closest<HTMLElement>("[data-id]");
    if (!item) return;
    await manager.switchAccount(item.dataset.id!);
    await renderAccountSwitcher(); // re-render with new active account
  });
}

document.addEventListener("DOMContentLoaded", renderAccountSwitcher);
```

The popup re-renders in place after a switch rather than closing and reopening, which keeps the user's context intact.

---

## Pattern 4: Syncing Settings Across Profiles with chrome.storage.sync {#pattern-4-syncing-settings-across-profiles-with-chromestoragesync}

`chrome.storage.sync` ties data to the signed-in Google account, not the Chrome profile. This means two profiles signed into the same Google account share the same sync storage. Use this intentionally for cross-device settings:

```ts
// lib/sync-settings.ts

interface SyncableSettings {
  theme: "light" | "dark" | "system";
  language: string;
  notifications: boolean;
  dashboardLayout: string[];
}

const DEFAULTS: SyncableSettings = {
  theme: "system",
  language: "en",
  notifications: true,
  dashboardLayout: ["activity", "stats", "recent"],
};

const SYNC_KEY = "userSettings";

export async function loadSettings(): Promise<SyncableSettings> {
  const result = await chrome.storage.sync.get(SYNC_KEY);
  return { ...DEFAULTS, ...(result[SYNC_KEY] ?? {}) };
}

export async function saveSetting<K extends keyof SyncableSettings>(
  key: K,
  value: SyncableSettings[K]
): Promise<void> {
  const current = await loadSettings();
  current[key] = value;
  await chrome.storage.sync.set({ [SYNC_KEY]: current });
}

// Listen for changes from other profiles / devices
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync" || !changes[SYNC_KEY]) return;

  const { newValue, oldValue } = changes[SYNC_KEY];
  const diff: Partial<SyncableSettings> = {};

  for (const key of Object.keys(newValue) as (keyof SyncableSettings)[]) {
    if (JSON.stringify(newValue[key]) !== JSON.stringify(oldValue?.[key])) {
      diff[key] = newValue[key];
    }
  }

  if (Object.keys(diff).length > 0) {
    console.log("[sync] Settings changed from another context:", diff);
    // Broadcast to popup / content scripts
    chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED", diff });
  }
});
```

Keep in mind the `chrome.storage.sync` quota limits: 102,400 bytes total, 8,192 bytes per item, and 1,800 write operations per hour. Store only lightweight settings in sync storage -- large datasets belong in `chrome.storage.local` with your own sync mechanism.

---

## Pattern 5: Multiple OAuth Tokens Management {#pattern-5-multiple-oauth-tokens-management}

When your extension connects to multiple third-party services or manages tokens for several user accounts, you need a token registry with expiry tracking and refresh logic:

```ts
// lib/token-manager.ts

interface TokenEntry {
  accountId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
  scopes: string[];
}

class TokenManager {
  private static STORAGE_KEY = "oauthTokens";

  private async loadAll(): Promise<TokenEntry[]> {
    const result = await chrome.storage.local.get(TokenManager.STORAGE_KEY);
    return result[TokenManager.STORAGE_KEY] ?? [];
  }

  private async saveAll(tokens: TokenEntry[]): Promise<void> {
    await chrome.storage.local.set({ [TokenManager.STORAGE_KEY]: tokens });
  }

  async storeToken(entry: TokenEntry): Promise<void> {
    const tokens = await this.loadAll();
    const index = tokens.findIndex(
      (t) => t.accountId === entry.accountId && t.provider === entry.provider
    );
    if (index >= 0) {
      tokens[index] = entry;
    } else {
      tokens.push(entry);
    }
    await this.saveAll(tokens);
  }

  async getValidToken(
    accountId: string,
    provider: string
  ): Promise<string | null> {
    const tokens = await this.loadAll();
    const entry = tokens.find(
      (t) => t.accountId === accountId && t.provider === provider
    );
    if (!entry) return null;

    // If token expires within the next 60 seconds, refresh it
    if (entry.expiresAt < Date.now() + 60_000) {
      if (entry.refreshToken) {
        return this.refreshAndStore(entry);
      }
      // No refresh token -- remove the stale entry
      await this.removeToken(accountId, provider);
      return null;
    }

    return entry.accessToken;
  }

  private async refreshAndStore(entry: TokenEntry): Promise<string | null> {
    try {
      const response = await fetch(getTokenEndpoint(entry.provider), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: entry.refreshToken!,
          client_id: getClientId(entry.provider),
        }),
      });

      if (!response.ok) {
        await this.removeToken(entry.accountId, entry.provider);
        return null;
      }

      const data = await response.json();
      const updated: TokenEntry = {
        ...entry,
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        refreshToken: data.refresh_token ?? entry.refreshToken,
      };

      await this.storeToken(updated);
      return updated.accessToken;
    } catch {
      return null;
    }
  }

  async removeToken(accountId: string, provider: string): Promise<void> {
    const tokens = await this.loadAll();
    await this.saveAll(
      tokens.filter(
        (t) => !(t.accountId === accountId && t.provider === provider)
      )
    );
  }

  async getTokensForAccount(accountId: string): Promise<TokenEntry[]> {
    const tokens = await this.loadAll();
    return tokens.filter((t) => t.accountId === accountId);
  }
}

// Provider configuration (implement per your needs)
function getTokenEndpoint(provider: string): string {
  const endpoints: Record<string, string> = {
    github: "https://github.com/login/oauth/access_token",
    google: "https://oauth2.googleapis.com/token",
    microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  };
  return endpoints[provider] ?? "";
}

function getClientId(provider: string): string {
  const ids: Record<string, string> = {
    github: "YOUR_GITHUB_CLIENT_ID",
    google: "YOUR_GOOGLE_CLIENT_ID",
    microsoft: "YOUR_MICROSOFT_CLIENT_ID",
  };
  return ids[provider] ?? "";
}
```

When an account is removed, iterate through the token registry and revoke all associated tokens before deleting the entries. See [OAuth and Identity Patterns](oauth-identity.md) for detailed `launchWebAuthFlow` integration.

---

## Pattern 6: Profile-Specific Content Script Behavior {#pattern-6-profile-specific-content-script-behavior}

Content scripts may need to behave differently depending on which account is active -- for example, applying different highlight colors or injecting different toolbars:

```ts
// content-script.ts

interface AccountContext {
  accountId: string;
  highlightColor: string;
  toolbarEnabled: boolean;
}

let currentContext: AccountContext | null = null;

// Request the active account context from the service worker
async function loadContext(): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: "GET_ACCOUNT_CONTEXT",
  });
  if (response?.accountId) {
    applyContext(response as AccountContext);
  }
}

function applyContext(ctx: AccountContext): void {
  // Remove previous profile's styles
  document.getElementById("ext-profile-styles")?.remove();

  currentContext = ctx;

  const style = document.createElement("style");
  style.id = "ext-profile-styles";
  style.textContent = `
    .ext-highlight {
      background-color: ${ctx.highlightColor} !important;
    }
    .ext-toolbar {
      display: ${ctx.toolbarEnabled ? "flex" : "none"} !important;
    }
  `;
  document.head.appendChild(style);
}

// Listen for live account switches
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ACCOUNT_SWITCHED") {
    loadContext(); // Re-fetch and re-apply
  }
});

loadContext();
```

```ts
// background.ts (service worker handler)

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_ACCOUNT_CONTEXT") {
    getActiveAccountContext().then(sendResponse);
    return true; // Keep message channel open for async response
  }
});

async function getActiveAccountContext(): Promise<AccountContext | null> {
  const manager = new AccountManager();
  const active = await manager.getActiveAccount();
  if (!active) return null;

  const storage = new ProfileStorage(active.id);
  return {
    accountId: active.id,
    highlightColor: (await storage.get<string>("highlightColor")) ?? "#ffeb3b",
    toolbarEnabled: (await storage.get<boolean>("toolbarEnabled")) ?? true,
  };
}
```

The content script applies a CSS override scoped to the active account and re-applies it whenever the user switches. This avoids full page reloads while keeping visual state consistent.

---

## Pattern 7: Badge and Icon Per Active Account {#pattern-7-badge-and-icon-per-active-account}

Visual differentiation in the toolbar helps users instantly see which account is active. You can change both the badge text and the extension icon dynamically:

```ts
// lib/badge-manager.ts

interface BadgeConfig {
  text: string;
  color: string;
  iconPath?: string;
}

const ACCOUNT_BADGES: Record<string, BadgeConfig> = {
  work: { text: "W", color: "#1976d2", iconPath: "icons/work" },
  personal: { text: "P", color: "#388e3c", iconPath: "icons/personal" },
  testing: { text: "T", color: "#f57c00", iconPath: "icons/testing" },
};

export async function updateBadgeForAccount(
  accountLabel: string
): Promise<void> {
  const config = ACCOUNT_BADGES[accountLabel.toLowerCase()];
  if (!config) return;

  await Promise.all([
    chrome.action.setBadgeText({ text: config.text }),
    chrome.action.setBadgeBackgroundColor({ color: config.color }),
    chrome.action.setBadgeTextColor({ color: "#ffffff" }),
    config.iconPath
      ? chrome.action.setIcon({
          path: {
            16: `${config.iconPath}-16.png`,
            32: `${config.iconPath}-32.png`,
            48: `${config.iconPath}-48.png`,
            128: `${config.iconPath}-128.png`,
          },
        })
      : Promise.resolve(),
  ]);
}

// Per-tab badges for extensions that show account context on specific tabs
export async function setTabBadge(
  tabId: number,
  accountLabel: string
): Promise<void> {
  const config = ACCOUNT_BADGES[accountLabel.toLowerCase()];
  if (!config) return;

  await Promise.all([
    chrome.action.setBadgeText({ text: config.text, tabId }),
    chrome.action.setBadgeBackgroundColor({ color: config.color, tabId }),
  ]);
}
```

```ts
// background.ts (wire badge updates to account switches)

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "ACCOUNT_SWITCHED") {
    const manager = new AccountManager();
    manager.getActiveAccount().then((account) => {
      if (account) updateBadgeForAccount(account.label);
    });
  }
});
```

For per-tab badges (e.g., showing which account "owns" each tab), pass the `tabId` parameter to the badge APIs. This lets you display different account indicators on different tabs simultaneously.

---

## Pattern 8: Cross-Profile Data Migration {#pattern-8-cross-profile-data-migration}

When a user adds a new Chrome profile or wants to transfer extension data from one account to another, you need a structured export/import mechanism:

```ts
// lib/data-migration.ts

interface ExportPackage {
  version: number;
  exportedAt: string;
  sourceProfileId: string;
  settings: Record<string, unknown>;
  accounts: Account[];
  customData: Record<string, unknown>;
}

const EXPORT_VERSION = 1;

export async function exportProfileData(
  profileId: string
): Promise<ExportPackage> {
  const storage = new ProfileStorage(profileId);
  const settings = await storage.getAll("local");
  const syncSettings = await storage.getAll("sync");

  const manager = new AccountManager();
  const accounts = await manager.listAccounts();

  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    sourceProfileId: profileId,
    settings: { ...settings, ...syncSettings },
    accounts: accounts.map(({ id, label, email, color, avatarUrl }) => ({
      id,
      label,
      email,
      color,
      avatarUrl,
    })),
    customData: {},
  };
}

export async function importProfileData(
  targetProfileId: string,
  pkg: ExportPackage,
  options: { overwrite: boolean } = { overwrite: false }
): Promise<{ imported: number; skipped: number }> {
  if (pkg.version !== EXPORT_VERSION) {
    throw new Error(
      `Unsupported export version: ${pkg.version} (expected ${EXPORT_VERSION})`
    );
  }

  const storage = new ProfileStorage(targetProfileId);
  let imported = 0;
  let skipped = 0;

  for (const [key, value] of Object.entries(pkg.settings)) {
    const existing = await storage.get(key);
    if (existing !== undefined && !options.overwrite) {
      skipped++;
      continue;
    }
    await storage.set(key, value);
    imported++;
  }

  return { imported, skipped };
}

// Trigger export via the popup
export function downloadExport(pkg: ExportPackage): void {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `extension-export-${pkg.sourceProfileId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import from a file input
export async function handleImportFile(
  file: File,
  targetProfileId: string
): Promise<{ imported: number; skipped: number }> {
  const text = await file.text();
  let pkg: ExportPackage;

  try {
    pkg = JSON.parse(text);
  } catch {
    throw new Error("Invalid export file: not valid JSON");
  }

  if (!pkg.version || !pkg.settings) {
    throw new Error("Invalid export file: missing required fields");
  }

  return importProfileData(targetProfileId, pkg, { overwrite: false });
}
```

The export format includes a version number so future releases can handle format migration. Sensitive data like OAuth tokens should be excluded from exports -- users will need to re-authenticate in the new profile.

---

## Cross-References {#cross-references}

- [OAuth and Identity Patterns](oauth-identity.md) -- Token acquisition and refresh flows
- [State Management Patterns](state-management.md) -- Cross-context state synchronization strategies
