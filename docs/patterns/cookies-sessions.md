---
layout: default
title: "Chrome Extension Cookies Sessions. Best Practices"
description: "Manage cookies and sessions in Chrome extensions for authentication."
canonical_url: "https://bestchromeextensions.com/patterns/cookies-sessions/"
last_modified_at: 2026-01-15
---

Cookies and Sessions Patterns

Working with cookies in Chrome extensions gives you fine-grained control over authentication state, tracking analysis, and cookie hygiene. The `chrome.cookies` API surfaces every cookie the browser manages and lets you read, write, delete, and monitor changes in real time.

Prerequisites {#prerequisites}

Declare the `cookies` permission and specify host patterns for the domains you need access to:

```json
{
  "manifest_version": 3,
  "permissions": ["cookies"],
  "host_permissions": ["https://*.example.com/*", "<all_urls>"]
}
```

---

Pattern 1: chrome.cookies API Basics {#pattern-1-chromecookies-api-basics}

The five core operations cover every CRUD action plus change observation.

```typescript
// --- GET a single cookie by name + URL ---
async function getCookie(name: string, url: string): Promise<chrome.cookies.Cookie | null> {
  const cookie = await chrome.cookies.get({ name, url });
  return cookie; // null when not found
}

// --- GET ALL cookies matching a filter ---
async function getAllCookies(domain: string): Promise<chrome.cookies.Cookie[]> {
  return chrome.cookies.getAll({ domain });
}

// --- SET (create or update) a cookie ---
async function setCookie(
  url: string,
  name: string,
  value: string,
  expirationDays: number = 30
): Promise<chrome.cookies.Cookie | null> {
  const expirationDate = Date.now() / 1000 + expirationDays * 86400;
  return chrome.cookies.set({
    url,
    name,
    value,
    expirationDate,
    secure: true,
    sameSite: "lax",
  });
}

// --- REMOVE a cookie ---
async function removeCookie(
  url: string,
  name: string
): Promise<{ url: string; name: string } | null> {
  return chrome.cookies.remove({ url, name });
}

// --- LISTEN for any cookie change ---
chrome.cookies.onChanged.addListener((changeInfo) => {
  const { removed, cookie, cause } = changeInfo;
  console.log(
    `Cookie ${cookie.name} ${removed ? "removed" : "set"}. cause: ${cause}`
  );
});
```

The `cause` field is one of `"evicted"`, `"expired"`, `"explicit"`, `"expired_overwrite"`, or `"overwrite"`.

---

Pattern 2: Session Detection {#pattern-2-session-detection}

Check whether a user is logged in to a site by probing for known authentication cookies.

```typescript
interface SessionCheck {
  domain: string;
  cookieNames: string[];
}

const SESSION_RULES: SessionCheck[] = [
  { domain: ".github.com", cookieNames: ["logged_in", "_gh_sess"] },
  { domain: ".google.com", cookieNames: ["SID", "HSID"] },
  { domain: ".twitter.com", cookieNames: ["auth_token"] },
];

async function isLoggedIn(rule: SessionCheck): Promise<boolean> {
  const cookies = await chrome.cookies.getAll({ domain: rule.domain });
  const names = new Set(cookies.map((c) => c.name));
  return rule.cookieNames.some((n) => names.has(n));
}

async function checkAllSessions(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  await Promise.all(
    SESSION_RULES.map(async (rule) => {
      results[rule.domain] = await isLoggedIn(rule);
    })
  );
  return results;
}

// Surface session state on the badge
async function updateBadge(): Promise<void> {
  const sessions = await checkAllSessions();
  const activeCount = Object.values(sessions).filter(Boolean).length;
  await chrome.action.setBadgeText({ text: String(activeCount) });
  await chrome.action.setBadgeBackgroundColor({
    color: activeCount > 0 ? "#22c55e" : "#ef4444",
  });
}

chrome.cookies.onChanged.addListener(() => {
  updateBadge();
});
```

---

Pattern 3: Cookie Monitoring Dashboard {#pattern-3-cookie-monitoring-dashboard}

Track all cookie changes in real time and expose them to a popup or side panel.

```typescript
interface CookieEvent {
  timestamp: number;
  domain: string;
  name: string;
  action: "set" | "removed";
  cause: chrome.cookies.OnChangedCause;
  secure: boolean;
  sameSite: string;
}

const MAX_EVENTS = 500;
let eventLog: CookieEvent[] = [];

chrome.cookies.onChanged.addListener(({ removed, cookie, cause }) => {
  const entry: CookieEvent = {
    timestamp: Date.now(),
    domain: cookie.domain,
    name: cookie.name,
    action: removed ? "removed" : "set",
    cause,
    secure: cookie.secure,
    sameSite: cookie.sameSite ?? "unspecified",
  };

  eventLog.unshift(entry);
  if (eventLog.length > MAX_EVENTS) {
    eventLog = eventLog.slice(0, MAX_EVENTS);
  }

  // Broadcast to any open popup / side panel
  chrome.runtime.sendMessage({ type: "COOKIE_EVENT", payload: entry }).catch(() => {
    // No listener open. ignore
  });
});

// Popup requests the full log on open
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_COOKIE_LOG") {
    sendResponse(eventLog);
  }
});
```

In the popup, call `chrome.runtime.sendMessage({ type: "GET_COOKIE_LOG" })` to fetch the full log, then listen for `COOKIE_EVENT` messages to append new rows in real time.

---

Pattern 4: Cookie Cleanup {#pattern-4-cookie-cleanup}

Bulk-delete cookies by domain, age, or type. Useful for privacy-focused extensions.

```typescript
type CleanupFilter =
  | { kind: "domain"; domain: string }
  | { kind: "age"; maxAgeDays: number }
  | { kind: "session" }
  | { kind: "third-party"; currentDomain: string };

async function cleanupCookies(filter: CleanupFilter): Promise<number> {
  let cookies: chrome.cookies.Cookie[];

  switch (filter.kind) {
    case "domain":
      cookies = await chrome.cookies.getAll({ domain: filter.domain });
      break;
    case "age": {
      const cutoff = Date.now() / 1000 + filter.maxAgeDays * 86400;
      cookies = (await chrome.cookies.getAll({})).filter(
        (c) => c.expirationDate && c.expirationDate > cutoff
      );
      break;
    }
    case "session":
      cookies = (await chrome.cookies.getAll({})).filter(
        (c) => c.session === true
      );
      break;
    case "third-party":
      cookies = (await chrome.cookies.getAll({})).filter(
        (c) => !c.domain.includes(filter.currentDomain)
      );
      break;
  }

  let removed = 0;
  for (const c of cookies) {
    const protocol = c.secure ? "https" : "http";
    const url = `${protocol}://${c.domain.replace(/^\./, "")}${c.path}`;
    const result = await chrome.cookies.remove({ url, name: c.name });
    if (result) removed++;
  }
  return removed;
}

// Usage: cleanupCookies({ kind: "age", maxAgeDays: 7 });
```

---

Pattern 5: Third-Party Cookie Analysis {#pattern-5-third-party-cookie-analysis}

Identify tracker cookies on the current page by comparing cookie domains to the page domain.

```typescript
interface TrackerReport {
  pageDomain: string;
  firstParty: chrome.cookies.Cookie[];
  thirdParty: chrome.cookies.Cookie[];
  knownTrackers: chrome.cookies.Cookie[];
}

const KNOWN_TRACKER_DOMAINS = [
  ".doubleclick.net",
  ".facebook.com",
  ".google-analytics.com",
  ".scorecardresearch.com",
  ".quantserve.com",
  ".adnxs.com",
];

function extractRootDomain(hostname: string): string {
  const parts = hostname.split(".");
  return parts.slice(-2).join(".");
}

async function analyzePageCookies(tabId: number): Promise<TrackerReport> {
  const tab = await chrome.tabs.get(tabId);
  const url = new URL(tab.url!);
  const pageDomain = extractRootDomain(url.hostname);

  const allCookies = await chrome.cookies.getAll({ url: tab.url! });

  const firstParty: chrome.cookies.Cookie[] = [], thirdParty: chrome.cookies.Cookie[] = [], knownTrackers: chrome.cookies.Cookie[] = [];

  for (const cookie of allCookies) {
    const cookieRoot = extractRootDomain(cookie.domain.replace(/^\./, ""));
    if (cookieRoot === pageDomain) {
      firstParty.push(cookie);
    } else {
      thirdParty.push(cookie);
      if (
        KNOWN_TRACKER_DOMAINS.some((t) => cookie.domain.endsWith(t))
      ) {
        knownTrackers.push(cookie);
      }
    }
  }

  return { pageDomain, firstParty, thirdParty, knownTrackers };
}
```

---

Pattern 6: Cookie Backup and Restore {#pattern-6-cookie-backup-and-restore}

Export all cookies as JSON and import them back later.

```typescript
interface CookieBackup {
  version: 1;
  exportedAt: string;
  cookies: chrome.cookies.Cookie[];
}

async function exportCookies(domain?: string): Promise<CookieBackup> {
  const filter = domain ? { domain } : {};
  const cookies = await chrome.cookies.getAll(filter);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    cookies,
  };
}

async function restoreCookies(backup: CookieBackup): Promise<number> {
  let restored = 0;

  for (const c of backup.cookies) {
    const protocol = c.secure ? "https" : "http";
    const url = `${protocol}://${c.domain.replace(/^\./, "")}${c.path}`;

    try {
      await chrome.cookies.set({
        url,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite as chrome.cookies.SameSiteStatus,
        expirationDate: c.expirationDate,
        storeId: c.storeId,
      });
      restored++;
    } catch (err) {
      console.warn(`Failed to restore ${c.name} for ${c.domain}:`, err);
    }
  }
  return restored;
}
```

---

Pattern 7: Cookie Store Management {#pattern-7-cookie-store-management}

Chrome maintains separate cookie stores for normal and incognito contexts.

```typescript
interface StoreInfo {
  storeId: string;
  tabIds: number[];
  cookieCount: number;
  isIncognito: boolean;
}

async function listCookieStores(): Promise<StoreInfo[]> {
  const stores = await chrome.cookies.getAllCookieStores();
  const results: StoreInfo[] = [];

  for (const store of stores) {
    const cookies = await chrome.cookies.getAll({ storeId: store.id });
    results.push({
      storeId: store.id,
      tabIds: store.tabIds,
      cookieCount: cookies.length,
      // Store ID "1" is the default incognito store
      isIncognito: store.id === "1",
    });
  }
  return results;
}

// Copy a cookie from one store to another
async function copyCookie(
  cookie: chrome.cookies.Cookie,
  targetStoreId: string
): Promise<chrome.cookies.Cookie | null> {
  const protocol = cookie.secure ? "https" : "http";
  const url = `${protocol}://${cookie.domain.replace(/^\./, "")}${cookie.path}`;

  return chrome.cookies.set({
    url,
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite as chrome.cookies.SameSiteStatus,
    expirationDate: cookie.expirationDate,
    storeId: targetStoreId,
  });
}

// Usage: copy all normal-store cookies into incognito
// const stores = await chrome.cookies.getAllCookieStores();
// const cookies = await chrome.cookies.getAll({ storeId: "0" });
// for (const c of cookies) await copyCookie(c, "1");
```

Declare `"incognito": "spanning"` in the manifest to access incognito cookie stores from a single service worker.

---

Pattern 8: SameSite, Secure, and HttpOnly Audit Tool {#pattern-8-samesite-secure-and-httponly-audit-tool}

Audit all cookies for security best practices and flag issues.

```typescript
interface AuditIssue {
  cookie: string;
  domain: string;
  severity: "high" | "medium" | "low";
  issue: string;
  recommendation: string;
}

async function auditCookies(url?: string): Promise<AuditIssue[]> {
  const filter = url ? { url } : {};
  const cookies = await chrome.cookies.getAll(filter);
  const issues: AuditIssue[] = [];

  for (const c of cookies) {
    // High: sensitive-looking cookie without Secure flag
    if (!c.secure && looksLikeAuthCookie(c.name)) {
      issues.push({
        cookie: c.name,
        domain: c.domain,
        severity: "high",
        issue: "Auth cookie transmitted over insecure connection",
        recommendation: "Set the Secure flag on this cookie",
      });
    }

    // High: auth cookie without HttpOnly
    if (!c.httpOnly && looksLikeAuthCookie(c.name)) {
      issues.push({
        cookie: c.name,
        domain: c.domain,
        severity: "high",
        issue: "Auth cookie accessible to JavaScript (XSS risk)",
        recommendation: "Set the HttpOnly flag on this cookie",
      });
    }

    // Medium: SameSite=None without Secure
    if (c.sameSite === "no_restriction" && !c.secure) {
      issues.push({
        cookie: c.name,
        domain: c.domain,
        severity: "medium",
        issue: "SameSite=None requires Secure flag (browsers may reject)",
        recommendation: "Add the Secure flag or change SameSite policy",
      });
    }

    // Low: SameSite unspecified (defaults to Lax in modern browsers)
    if (c.sameSite === "unspecified") {
      issues.push({
        cookie: c.name,
        domain: c.domain,
        severity: "low",
        issue: "SameSite not explicitly set",
        recommendation: "Explicitly set SameSite to Lax or Strict",
      });
    }

    // Medium: very long expiration (> 1 year)
    if (c.expirationDate) {
      const yearsUntilExpiry =
        (c.expirationDate - Date.now() / 1000) / (365 * 86400);
      if (yearsUntilExpiry > 1) {
        issues.push({
          cookie: c.name,
          domain: c.domain,
          severity: "medium",
          issue: `Cookie expires in ${yearsUntilExpiry.toFixed(1)} years`,
          recommendation: "Reduce cookie lifetime to under 1 year",
        });
      }
    }
  }

  return issues.sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity));
}

function looksLikeAuthCookie(name: string): boolean {
  const patterns = [
    /sess/i, /auth/i, /token/i, /sid$/i, /login/i, /csrf/i, /jwt/i,
  ];
  return patterns.some((p) => p.test(name));
}

function severityOrder(s: "high" | "medium" | "low"): number {
  return s === "high" ? 0 : s === "medium" ? 1 : 2;
}
```

---

Summary {#summary}

| # | Pattern | Key API | Use Case |
|---|---------|---------|----------|
| 1 | API basics | `get`, `getAll`, `set`, `remove`, `onChanged` | Foundation for all cookie work |
| 2 | Session detection | `getAll` + domain filter | Check login state across sites |
| 3 | Monitoring dashboard | `onChanged` + runtime messaging | Real-time cookie change feed |
| 4 | Cookie cleanup | `getAll` + `remove` with filters | Bulk privacy cleanup |
| 5 | Third-party analysis | `getAll` + domain comparison | Identify trackers on a page |
| 6 | Backup and restore | `getAll` + `set` + downloads API | Export/import cookie profiles |
| 7 | Cookie store management | `getAllCookieStores` + `storeId` | Incognito vs normal handling |
| 8 | Security audit | Property inspection loop | Flag insecure cookie configs |
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
