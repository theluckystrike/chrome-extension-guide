# Chrome Extension Cookies API Patterns

## Overview

The Chrome Cookies API (`chrome.cookies`) provides powerful capabilities for reading, writing, monitoring, and managing cookies across browser sessions and profiles. This guide covers eight practical patterns for building robust cookie handling into your Chrome extension, from basic CRUD operations to advanced debugging tools.

**Key Concepts:**
- Cookies are scoped to domain, path, and secure flag combinations
- The API operates asynchronously and requires specific permissions
- Cookie stores enable separation between normal and incognito profiles
- Real-time monitoring via event listeners enables powerful automation

---

## Required Permissions

```jsonc
// manifest.json (MV3)
{
  "permissions": ["cookies"],
  "host_permissions": [
    // Specific domains to access cookies on
    "https://*.example.com/*",
    "https://example.com/*"
  ],
  // For accessing all URLs (use sparingly - triggers review concerns)
  "host_permissions": ["<all_urls>"]
}
```

**Important Notes:**
- The `cookies` permission is required for any API access
- `host_permissions` determine which cookies you can read/write
- Without matching host permission, `get`, `set`, and `remove` will fail silently
- `getAll` can query cookies without host permissions but with limited results

```typescript
// TypeScript type definitions for cookie-related permissions
interface CookiePermissionConfig {
  permissions: ["cookies"];
  host_permissions: string[];
}
```

---

## Pattern 1: Cookies API Basics

The fundamental operations for reading, writing, and deleting cookies.

### Getting a Specific Cookie

Retrieve a single cookie by name and URL. The URL helps resolve the domain context:

```typescript
// background.ts / popup.ts
interface CookieResult {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "no_restriction" | "lax" | "strict" | "unspecified";
  expirationDate?: number;
  storeId: string;
}

async function getCookie(url: string, name: string): Promise<CookieResult | null> {
  try {
    const cookie = await chrome.cookies.get({ url, name });
    return cookie as CookieResult | null;
  } catch (error) {
    console.error("Failed to get cookie:", error);
    return null;
  }
}

// Usage example
const sessionCookie = await getCookie("https://app.example.com", "session_id");
if (sessionCookie) {
  console.log(`Session expires: ${new Date(sessionCookie.expirationDate! * 1000)}`);
}
```

### Querying Multiple Cookies

Use `getAll` to retrieve cookies matching criteria. Omitting filters returns all cookies:

```typescript
// background.ts
type CookieQuery = {
  domain?: string;
  url?: string;
  name?: string;
  path?: string;
  secure?: boolean;
  session?: boolean;
  storeId?: string;
};

async function getAllCookiesForDomain(domain: string): Promise<CookieResult[]> {
  const cookies = await chrome.cookies.getAll({ domain });
  return cookies as CookieResult[];
}

async function getAllSessionCookies(): Promise<CookieResult[]> {
  return (await chrome.cookies.getAll({ session: true })) as CookieResult[];
}

// Get cookies for a specific URL (includes subdomains based on domain matching)
async function getCookiesForUrl(url: string): Promise<CookieResult[]> {
  return (await chrome.cookies.getAll({ url })) as CookieResult[];
}

// Usage: List all cookies for example.com
const cookies = await getAllCookiesForDomain("example.com");
console.log(`Found ${cookies.length} cookies for example.com`);
for (const cookie of cookies) {
  console.log(`  ${cookie.name}=${cookie.value.substring(0, 20)}...`);
}
```

### Setting a Cookie

Create or update cookies with full control over attributes:

```typescript
// background.ts
interface CookieConfig {
  url: string;
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "no_restriction" | "lax" | "strict" | "unspecified";
  expirationDate?: number;
  storeId?: string;
}

async function setCookie(config: CookieConfig): Promise<CookieResult | null> {
  // For non-secure URLs, Chrome will auto-adjust the secure flag
  // The URL is required; domain is derived from it if not specified
  
  const cookieDetails: chrome.cookies.SetDetails = {
    url: config.url,
    name: config.name,
    value: config.value,
    domain: config.domain,
    path: config.path ?? "/",
    secure: config.secure ?? false,
    httpOnly: config.httpOnly ?? false,
    sameSite: config.sameSite ?? "unspecified",
    expirationDate: config.expirationDate,
    storeId: config.storeId,
  };

  try {
    const cookie = await chrome.cookies.set(cookieDetails);
    return cookie as CookieResult | null;
  } catch (error) {
    console.error("Failed to set cookie:", error);
    return null;
  }
}

// Usage: Set a session cookie that expires in 7 days
const inOneWeek = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
await setCookie({
  url: "https://app.example.com",
  name: "preferences",
  value: JSON.stringify({ theme: "dark", lang: "en" }),
  domain: ".example.com",
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
  expirationDate: inOneWeek,
});

// Usage: Set a session cookie (expires when browser closes)
await setCookie({
  url: "https://app.example.com",
  name: "guest_token",
  value: "abc123xyz",
  secure: true,
});
```

### Removing a Cookie

Delete cookies by specifying the exact URL and name:

```typescript
// background.ts
interface RemoveCookieOptions {
  url: string;
  name: string;
  storeId?: string;
}

async function removeCookie(options: RemoveCookieOptions): Promise<boolean> {
  try {
    const result = await chrome.cookies.remove({
      url: options.url,
      name: options.name,
      storeId: options.storeId,
    });
    return result !== null;
  } catch (error) {
    console.error("Failed to remove cookie:", error);
    return false;
  }
}

// Usage
const removed = await removeCookie({
  url: "https://app.example.com",
  name: "session_id",
});
console.log(removed ? "Cookie removed" : "Cookie not found");
```

### Cookie URL Resolution

Understanding URL requirements is critical. The API uses URLs to determine the cookie's domain and secure flag:

```typescript
// background.ts
// Correct URL format matters for cookie matching
const cookieUrlTests = [
  { url: "https://example.com", domain: ".example.com", works: true },
  { url: "https://example.com/", domain: "example.com", works: true },
  { url: "http://example.com", domain: "example.com", works: true },
  // Subdomain-specific cookies
  { url: "https://api.example.com", domain: ".example.com", works: true },
];

// Domain resolution helper
function resolveCookieUrl(url: string): string {
  // Ensure protocol is present
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}
```

---

## Pattern 2: Cookie Monitoring

Track cookie changes in real-time with the `onChanged` event listener.

### Basic Change Detection

Monitor all cookie changes across the extension's accessible domains:

```typescript
// background.ts
type CookieChangeCause = 
  | "explicit"      // User called set/remove
  | "overwrite"     // Cookie was overwritten by set
  | "expired"       // Cookie expired naturally
  | "evicted"       // Cookie was evicted due to storage limits
  | "expired_overwrite" // Expired cookie was overwritten
  | "unknown";

interface CookieChangeDetails {
  removed: boolean;
  cookie: CookieResult;
  cause: CookieChangeCause;
}

function setupCookieMonitor(): void {
  chrome.cookies.onChanged.addListener((changeInfo: CookieChangeDetails) => {
    const { cookie, cause, removed } = changeInfo;
    
    const action = removed ? "deleted" : (cause === "overwrite" ? "updated" : "created");
    console.log(`Cookie ${action}: ${cookie.name}`);
    console.log(`  Domain: ${cookie.domain}`);
    console.log(`  Cause: ${cause}`);
    console.log(`  Value: ${cookie.value.substring(0, 50)}...`);
  });
}

// Initialize monitor on extension load
setupCookieMonitor();
```

### Filtering Changes by Domain

Focus monitoring on specific domains to reduce noise:

```typescript
// background.ts
class CookieMonitor {
  private watchedDomains: Set<string> = new Set();
  private listeners: Array<(details: CookieChangeDetails) => void> = [];

  constructor(domains: string[]) {
    domains.forEach(d => this.watchedDomains.add(d.toLowerCase()));
    chrome.cookies.onChanged.addListener(this.handleChange.bind(this));
  }

  private handleChange(changeInfo: CookieChangeDetails): void {
    const cookieDomain = changeInfo.cookie.domain.toLowerCase();
    
    // Check if this cookie belongs to any watched domain
    const isMatch = Array.from(this.watchedDomains).some(
      watched => cookieDomain === watched || cookieDomain.endsWith(`.${watched}`)
    );
    
    if (!isMatch) return;

    // Notify listeners
    this.listeners.forEach(listener => listener(changeInfo));
  }

  onChange(callback: (details: CookieChangeDetails) => void): void {
    this.listeners.push(callback);
  }
}

// Usage: Monitor only specific domains
const monitor = new CookieMonitor(["example.com", "api.example.com"]);
monitor.onChange((change) => {
  if (change.removed) {
    console.log(`Cookie removed from ${change.cookie.domain}: ${change.cookie.name}`);
  } else {
    console.log(`Cookie modified in ${change.cookie.domain}: ${change.cookie.name}`);
  }
});
```

### Advanced Pattern: Track Specific Cookie Changes

Monitor for a specific cookie's value changes:

```typescript
// background.ts
class SpecificCookieMonitor {
  private targetUrl: string;
  private targetName: string;
  private lastValue: string | null = null;
  private onChangeCallbacks: Array<(newValue: string, oldValue: string | null) => void> = [];

  constructor(url: string, cookieName: string) {
    this.targetUrl = url;
    this.targetName = cookieName;
    
    // Get initial value
    this.checkCurrentValue();
    
    // Setup listener
    chrome.cookies.onChanged.addListener(this.handleChange.bind(this));
  }

  private async checkCurrentValue(): Promise<void> {
    const cookie = await chrome.cookies.get({ url: this.targetUrl, name: this.targetName });
    this.lastValue = cookie?.value ?? null;
  }

  private handleChange(changeInfo: CookieChangeDetails): void {
    const cookie = changeInfo.cookie;
    
    // Check if this is our target cookie
    if (cookie.name !== this.targetName) return;
    
    const newValue = changeInfo.removed ? null : cookie.value;
    
    // Only trigger if value actually changed
    if (newValue !== this.lastValue) {
      const oldValue = this.lastValue;
      this.lastValue = newValue;
      
      this.onChangeCallbacks.forEach(cb => cb(newValue ?? "", oldValue));
    }
  }

  onValueChange(callback: (newValue: string, oldValue: string | null) => void): void {
    this.onChangeCallbacks.push(callback);
  }
}

// Usage: Monitor session token changes
const sessionMonitor = new SpecificCookieMonitor("https://app.example.com", "session_token");
sessionMonitor.onValueChange((newToken, oldToken) => {
  if (!oldToken && newToken) {
    console.log("User logged in");
  } else if (oldToken && !newToken) {
    console.log("User logged out");
    // Trigger UI update or data cleanup
  } else if (oldToken !== newToken) {
    console.log("Session token refreshed");
  }
});
```

---

## Pattern 3: Cookie Jar Management

Tools for bulk operations on cookies.

### Listing All Cookies for a Domain

```typescript
// background.ts
interface DomainCookieSummary {
  domain: string;
  cookieCount: number;
  totalSizeBytes: number;
  cookies: CookieResult[];
}

async function getDomainCookieSummary(domain: string): Promise<DomainCookieSummary> {
  const cookies = await chrome.cookies.getAll({ domain });
  
  const totalSize = cookies.reduce((sum, c) => sum + c.name.length + c.value.length, 0);
  
  return {
    domain,
    cookieCount: cookies.length,
    totalSizeBytes: totalSize,
    cookies: cookies as CookieResult[],
  };
}

// Usage: Get summary for multiple domains
async function analyzeCookieUsage(domains: string[]): Promise<DomainCookieSummary[]> {
  const summaries: DomainCookieSummary[] = [];
  
  for (const domain of domains) {
    const summary = await getDomainCookieSummary(domain);
    summaries.push(summary);
    console.log(`${domain}: ${summary.cookieCount} cookies, ${summary.totalSizeBytes} bytes`);
  }
  
  return summaries;
}

// Example output
// example.com: 12 cookies, 2048 bytes
// api.example.com: 5 cookies, 512 bytes
```

### Bulk Delete Cookies

Clear all cookies for a domain or entire cookie store:

```typescript
// background.ts
async function clearAllCookiesForDomain(domain: string): Promise<number> {
  const cookies = await chrome.cookies.getAll({ domain });
  
  let deletedCount = 0;
  for (const cookie of cookies) {
    const url = (cookie.secure ? "https://" : "http://") + cookie.domain + cookie.path;
    const removed = await chrome.cookies.remove({
      url,
      name: cookie.name,
      storeId: cookie.storeId,
    });
    if (removed) deletedCount++;
  }
  
  return deletedCount;
}

async function clearAllCookies(storeId?: string): Promise<number> {
  const filter = storeId ? { storeId } : {};
  const cookies = await chrome.cookies.getAll(filter);
  
  let deletedCount = 0;
  for (const cookie of cookies) {
    const url = (cookie.secure ? "https://" : "http://") + cookie.domain + cookie.path;
    const removed = await chrome.cookies.remove({
      url,
      name: cookie.name,
      storeId: cookie.storeId,
    });
    if (removed) deletedCount++;
  }
  
  return deletedCount;
}

// Usage
const deleted = await clearAllCookiesForDomain("example.com");
console.log(`Cleared ${deleted} cookies for example.com`);
```

### Cookie Count and Size Tracking Per Domain

```typescript
// background.ts
interface CookieStats {
  domain: string;
  count: number;
  sizeBytes: number;
  breakdown: {
    session: number;
    persistent: number;
    secure: number;
    httpOnly: number;
  };
}

async function getCookieStats(domain: string): Promise<CookieStats> {
  const cookies = await chrome.cookies.getAll({ domain });
  
  let sessionCount = 0;
  let persistentCount = 0;
  let secureCount = 0;
  let httpOnlyCount = 0;
  let totalSize = 0;
  
  for (const cookie of cookies) {
    totalSize += cookie.name.length + cookie.value.length;
    
    if (cookie.session) sessionCount++;
    else persistentCount++;
    
    if (cookie.secure) secureCount++;
    if (cookie.httpOnly) httpOnlyCount++;
  }
  
  return {
    domain,
    count: cookies.length,
    sizeBytes: totalSize,
    breakdown: {
      session: sessionCount,
      persistent: persistentCount,
      secure: secureCount,
      httpOnly: httpOnlyCount,
    },
  };
}

// Usage: Get stats for current tab's domain
async function getCurrentTabCookieStats(): Promise<CookieStats | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  
  try {
    const url = new URL(tab.url);
    return await getCookieStats(url.hostname);
  } catch {
    return null;
  }
}
```

---

## Pattern 4: Session and Authentication Cookies

Detect login states and manage authentication sessions.

### Detecting Login State

Identify if a user is logged in based on auth cookies:

```typescript
// background.ts
interface AuthState {
  isLoggedIn: boolean;
  userId?: string;
  sessionExpiry?: Date;
  provider?: string;
}

interface AuthCookiePattern {
  namePattern: RegExp;
  valueValidation?: (value: string) => boolean;
  provider: string;
}

const AUTH_COOKIE_PATTERNS: AuthCookiePattern[] = [
  { namePattern: /^session_id$/, provider: "generic" },
  { namePattern: /^auth_token$/, provider: "jwt" },
  { namePattern: /^__cf_bm$/, provider: "cloudflare" },
  { namePattern: /^_ga$/, provider: "google-analytics" },
  { namePattern: /^sb-access-token$/, provider: "supabase" },
  { namePattern: /^next-auth\.session-token$/, provider: "next-auth" },
];

async function detectAuthState(url: string): Promise<AuthState> {
  const urlObj = new URL(url);
  const cookies = await chrome.cookies.getAll({ domain: urlObj.hostname });
  
  // Check for common session/auth tokens
  const authCookies = cookies.filter(c => 
    AUTH_COOKIE_PATTERNS.some(p => p.namePattern.test(c.name))
  );
  
  if (authCookies.length === 0) {
    return { isLoggedIn: false, provider: "unknown" };
  }
  
  // Determine provider
  const provider = AUTH_COOKIE_PATTERNS.find(p => 
    authCookies.some(c => p.namePattern.test(c.name))
  )?.provider ?? "unknown";
  
  // Check for non-session (persistent) cookies which often indicate "remember me"
  const hasPersistentAuth = authCookies.some(c => !c.session);
  
  // Get expiration if available
  const sessionCookie = authCookies.find(c => !c.session);
  const sessionExpiry = sessionCookie?.expirationDate 
    ? new Date(sessionCookie.expirationDate * 1000)
    : undefined;
  
  return {
    isLoggedIn: true,
    provider,
    sessionExpiry,
  };
}

// Usage
const authState = await detectAuthState("https://app.example.com");
if (authState.isLoggedIn) {
  console.log(`Logged in via ${authState.provider}`);
  if (authState.sessionExpiry) {
    console.log(`Session expires: ${authState.sessionExpiry}`);
  }
}
```

### Monitoring Session Expiry

```typescript
// background.ts
class SessionExpiryMonitor {
  private checkInterval: number = 60000; // Check every minute
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: Array<(url: string) => void> = [];

  async addSession(url: string, callback: (url: string) => void): Promise<void> {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const cookies = await chrome.cookies.getAll({ domain });
    
    // Find session cookies with expiration
    const sessionCookies = cookies.filter(c => 
      !c.session && c.expirationDate
    );
    
    if (sessionCookies.length === 0) {
      console.log(`No expiring cookies found for ${domain}`);
      return;
    }
    
    // Get earliest expiry
    const earliestExpiry = Math.min(...sessionCookies.map(c => c.expirationDate!));
    const msUntilExpiry = earliestExpiry * 1000 - Date.now();
    
    if (msUntilExpiry <= 0) {
      callback(url);
      return;
    }
    
    // Set warning 5 minutes before expiry
    const warningTime = msUntilExpiry - 5 * 60 * 1000;
    
    // Schedule warning
    const timerId = setTimeout(() => {
      callback(url);
    }, warningTime > 0 ? warningTime : msUntilExpiry);
    
    this.timers.set(domain, timerId);
    this.callbacks.push(callback);
    
    console.log(`Monitoring session for ${domain}, expires in ${Math.round(msUntilExpiry / 60000)} minutes`);
  }

  removeSession(domain: string): void {
    const timer = this.timers.get(domain);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(domain);
    }
  }

  destroy(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.callbacks = [];
  }
}

// Usage
const sessionMonitor = new SessionExpiryMonitor();
await sessionMonitor.addSession("https://app.example.com", (url) => {
  console.log(`Session expiring soon for ${url}`);
  // Notify user or attempt refresh
});
```

### Auto-Refresh Session Detection

```typescript
// background.ts
class SessionRefreshDetector {
  private refreshCallbacks: Array<() => void> = [];

  constructor() {
    chrome.cookies.onChanged.addListener((changeInfo) => {
      // Detect session token refresh (old cookie deleted, new one set)
      const isAuthCookie = AUTH_COOKIE_PATTERNS.some(p => 
        p.namePattern.test(changeInfo.cookie.name)
      );
      
      if (isAuthCookie) {
        this.refreshCallbacks.forEach(cb => cb());
      }
    });
  }

  onSessionRefresh(callback: () => void): void {
    this.refreshCallbacks.push(callback);
  }
}

// Usage
const refreshDetector = new SessionRefreshDetector();
refreshDetector.onSessionRefresh(() => {
  console.log("Session refreshed - token was updated");
  // Update cached token, notify UI, etc.
});
```

---

## Pattern 5: Cookie Store (Container) Support

Manage cookies across different profiles and containers.

### Listing Cookie Stores

```typescript
// background.ts
interface CookieStore {
  id: string;
  tabIds: number[];
  incognito: boolean;
}

async function listCookieStores(): Promise<CookieStore[]> {
  const stores = await chrome.cookies.getAllCookieStores();
  
  return stores.map(store => ({
    id: store.id,
    tabIds: store.tabIds,
    incognito: store.id !== "default",
  }));
}

// Usage
const stores = await listCookieStores();
for (const store of stores) {
  console.log(`Store: ${store.id} (Incognito: ${store.incognito})`);
  console.log(`  Tabs: ${store.tabIds.length}`);
}
```

### Working with Incognito Cookies

```typescript
// background.ts
async function getCookiesFromIncognito(): Promise<CookieResult[]> {
  const stores = await chrome.cookies.getAllCookieStores();
  const incognitoStore = stores.find(s => s.incognito);
  
  if (!incognitoStore) {
    return [];
  }
  
  return (await chrome.cookies.getAll({ storeId: incognitoStore.id })) as CookieResult[];
}

async function setCookieInIncognito(
  url: string, 
  name: string, 
  value: string
): Promise<CookieResult | null> {
  const stores = await chrome.cookies.getAllCookieStores();
  const incognitoStore = stores.find(s => s.incognito);
  
  if (!incognitoStore) {
    console.warn("No incognito store available");
    return null;
  }
  
  return (await chrome.cookies.set({
    url,
    name,
    value,
    storeId: incognitoStore.id,
  })) as CookieResult | null;
}

// Check if current context is incognito
async function isIncognitoContext(): Promise<boolean> {
  if (!chrome.extension.isIncognitoContext) return false;
  return chrome.extension.isIncognitoContext;
}
```

### Profile Cookie Management

```typescript
// background.ts
interface ProfileInfo {
  id: string;
  name: string;
  isIncognito: boolean;
  cookieCount: number;
}

async function getAllProfileInfo(): Promise<ProfileInfo[]> {
  const stores = await chrome.cookies.getAllCookieStores();
  
  const profiles: ProfileInfo[] = [];
  
  for (const store of stores) {
    const cookies = await chrome.cookies.getAll({ storeId: store.id });
    profiles.push({
      id: store.id,
      name: store.id === "default" ? "Default" : `Profile ${store.id}`,
      isIncognito: store.incognito,
      cookieCount: cookies.length,
    });
  }
  
  return profiles;
}

// Copy cookies between stores (for profile migration)
async function copyCookiesToStore(
  sourceStoreId: string, 
  targetStoreId: string
): Promise<number> {
  const sourceCookies = await chrome.cookies.getAll({ storeId: sourceStoreId });
  let copiedCount = 0;
  
  for (const cookie of sourceCookies) {
    const url = (cookie.secure ? "https://" : "http://") + cookie.domain + cookie.path;
    const result = await chrome.cookies.set({
      url,
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      storeId: targetStoreId,
    });
    
    if (result) copiedCount++;
  }
  
  return copiedCount;
}
```

---

## Pattern 6: Cookie Backup and Restore

Export and import cookies for backup or migration.

### Export Cookies as JSON

```typescript
// background.ts
interface ExportedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expirationDate?: number;
  hostOnly: boolean;
  session: boolean;
}

interface CookieExport {
  version: string;
  exportedAt: string;
  cookies: ExportedCookie[];
}

async function exportCookiesForDomain(domain: string): Promise<CookieExport> {
  const cookies = await chrome.cookies.getAll({ domain });
  
  const exported: ExportedCookie[] = cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    sameSite: c.sameSite,
    expirationDate: c.expirationDate,
    hostOnly: c.hostOnly,
    session: c.session,
  }));
  
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    cookies: exported,
  };
}

async function exportAllCookies(): Promise<CookieExport> {
  const cookies = await chrome.cookies.getAll({});
  
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    cookies: cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      expirationDate: c.expirationDate,
      hostOnly: c.hostOnly,
      session: c.session,
    })),
  };
}

// Download export as file
async function downloadCookieExport(domain?: string): Promise<void> {
  const exportData = domain 
    ? await exportCookiesForDomain(domain)
    : await exportAllCookies();
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
    type: "application/json" 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cookies-${domain || "all"}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Import/Restore Cookies from Backup

```typescript
// background.ts
async function importCookies(exportData: CookieExport): Promise<number> {
  let importedCount = 0;
  
  for (const cookie of exportData.cookies) {
    const url = (cookie.secure ? "https://" : "http://") + cookie.domain + cookie.path;
    
    try {
      const result = await chrome.cookies.set({
        url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite as chrome.cookies.SameSiteStatus,
        expirationDate: cookie.expirationDate,
      });
      
      if (result) importedCount++;
    } catch (error) {
      console.warn(`Failed to import cookie ${cookie.name}:`, error);
    }
  }
  
  return importedCount;
}

// Read uploaded file and import
async function handleCookieFileUpload(file: File): Promise<number> {
  const text = await file.text();
  const exportData: CookieExport = JSON.parse(text);
  
  return await importCookies(exportData);
}

// Selective import - only specific domains
async function importCookiesForDomains(
  exportData: CookieExport, 
  domains: string[]
): Promise<number> {
  const filtered = exportData.cookies.filter(c => 
    domains.some(d => c.domain.includes(d))
  );
  
  let importedCount = 0;
  
  for (const cookie of filtered) {
    const url = (cookie.secure ? "https://" : "http://") + cookie.domain + cookie.path;
    
    try {
      const result = await chrome.cookies.set({
        url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite as chrome.cookies.SameSiteStatus,
        expirationDate: cookie.expirationDate,
      });
      
      if (result) importedCount++;
    } catch (error) {
      console.warn(`Failed to import cookie ${cookie.name}:`, error);
    }
  }
  
  return importedCount;
}
```

### Sync Specific Cookies Across Profiles

```typescript
// background.ts
class CookieSyncManager {
  private sourceStoreId: string;
  private targetStoreId: string;
  private syncPatterns: RegExp[];

  constructor(sourceStoreId: string, targetStoreId: string, cookieNamePatterns: string[]) {
    this.sourceStoreId = sourceStoreId;
    this.targetStoreId = targetStoreId;
    this.syncPatterns = cookieNamePatterns.map(p => new RegExp(p));
  }

  async syncMatchingCookies(): Promise<number> {
    const sourceCookies = await chrome.cookies.getAll({ storeId: this.sourceStoreId });
    
    const toSync = sourceCookies.filter(c => 
      this.syncPatterns.some(p => p.test(c.name))
    );
    
    let syncedCount = 0;
    
    for (const cookie of toSync) {
      const url = (cookie.secure ? "https://" : "http://") + cookie.domain + cookie.path;
      
      try {
        await chrome.cookies.set({
          url,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expirationDate: cookie.expirationDate,
          storeId: this.targetStoreId,
        });
        syncedCount++;
      } catch (error) {
        console.warn(`Failed to sync cookie ${cookie.name}:`, error);
      }
    }
    
    return syncedCount;
  }
}

// Usage: Sync auth cookies to new profile
const syncManager = new CookieSyncManager(
  "default",
  "firefox-default", // In Firefox compatibility scenarios
  [/^session/, /^auth/, /^token/]
);

await syncManager.syncMatchingCookies();
```

---

## Pattern 7: Privacy and Cookie Blocking

Analyze and control cookies for privacy compliance.

### Analyzing Third-Party Cookies

```typescript
// background.ts
interface CookieAnalysis {
  firstParty: number;
  thirdParty: number;
  thirdPartyDomains: Set<string>;
  categories: CookieCategory;
}

type CookieCategory = {
  essential: string[];
  analytics: string[];
  advertising: string[];
  social: string[];
  unknown: string[];
};

// Known tracking cookie patterns
const COOKIE_CATEGORIES: Record<string, RegExp[]> = {
  analytics: [
    /^_ga/, /^_gid/, /^_gat/, /^__utma/, /^__utmz/, /^_pk_/, // Google, Matomo
  ],
  advertising: [
    /^_fbp/, /^fr$/, /^ads/, /^uuid/, // Facebook, ads
    /^__gads/, /^IDE$/, /^test_cookie/, // Google Ads
  ],
  social: [
    /^_twitter/, /^auth_token/, /^twid/, // Twitter
    /^li_/, /^bcookie/, /^bscookie/, // LinkedIn
  ],
};

function categorizeCookie(name: string): string {
  for (const [category, patterns] of Object.entries(COOKIE_CATEGORIES)) {
    if (patterns.some(p => p.test(name))) {
      return category;
    }
  }
  return "unknown";
}

async function analyzePageCookies(tabId: number): Promise<CookieAnalysis> {
  const [tab] = await chrome.tabs.get(tabId);
  if (!tab?.url) throw new Error("No tab URL");
  
  const pageUrl = new URL(tab.url);
  const allCookies = await chrome.cookies.getAll({});
  
  let firstParty = 0;
  let thirdParty = 0;
  const thirdPartyDomains = new Set<string>();
  const categories: CookieCategory = {
    essential: [],
    analytics: [],
    advertising: [],
    social: [],
    unknown: [],
  };
  
  for (const cookie of allCookies) {
    const cookieDomain = cookie.domain.replace(/^\./, "");
    const isThirdParty = !pageUrl.hostname.includes(cookieDomain);
    
    if (isThirdParty) {
      thirdParty++;
      thirdPartyDomains.add(cookieDomain);
    } else {
      firstParty++;
    }
    
    const category = categorizeCookie(cookie.name);
    categories[category as keyof CookieCategory].push(cookie.name);
  }
  
  return { firstParty, thirdParty, thirdPartyDomains, categories };
}

// Usage
const analysis = await analyzePageCookies(12345);
console.log(`First-party: ${analysis.firstParty}, Third-party: ${analysis.thirdParty}`);
console.log(`Analytics: ${analysis.categories.analytics.length}`);
console.log(`Advertising: ${analysis.categories.advertising.length}`);
```

### Cookie Blocking with declarativeNetRequest

Note: Direct cookie blocking requires the Blocking Cookies permission in MV3:

```jsonc
// manifest.json
{
  "permissions": ["declarativeNetRequest", "declarativeNetRequestWithHostAccess"],
  "host_permissions": ["<all_urls>"]
}
```

```typescript
// background.ts
interface BlockingRule {
  id: number;
  priority: number;
  action: {
    type: "cookie" | "block" | "allow";
    cookieToBlock?: string;
  };
  condition: {
    urlFilter: string;
    resourceTypes: string[];
  };
}

async function addCookieBlockingRule(
  domain: string, 
  cookieNamePattern: string
): Promise<void> {
  const rule: BlockingRule = {
    id: 1,
    priority: 1,
    action: {
      type: "cookie",
      cookieToBlock: cookieNamePattern,
    },
    condition: {
      urlFilter: `.*${domain}.*`,
      resourceTypes: ["xmlhttprequest", "image", "script"],
    },
  };
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
  });
}

// Block all third-party analytics cookies
async function blockAnalyticsCookies(): Promise<void> {
  const rules: BlockingRule[] = COOKIE_CATEGORIES.analytics.map((pattern, idx) => ({
    id: idx + 100,
    priority: 1,
    action: {
      type: "cookie",
      cookieToBlock: pattern.source,
    },
    condition: {
      urlFilter: ".*",
      resourceTypes: ["xmlhttprequest", "script", "image", "sub_frame"],
    },
  }));
  
  await chrome.declarativeNetRequest.updateDynamicRules({
    addRules: rules,
  });
}
```

---

## Pattern 8: Cookie Debugging Tools

Build developer tools for cookie inspection and analysis.

### DevTools Panel for Real-Time Cookies

```typescript
// devtools-panel.ts (runs in DevTools page context)

interface CookieDisplay {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expires: string;
  size: number;
}

class CookieDevToolsPanel {
  private panel: HTMLElement;
  private cookies: CookieResult[] = [];
  private currentUrl: string = "";

  constructor(panelElement: HTMLElement) {
    this.panel = panelElement;
    this.setupUI();
    this.setupListeners();
  }

  private setupUI(): void {
    this.panel.innerHTML = `
      <div class="cookie-panel">
        <div class="cookie-header">
          <h3>Cookies</h3>
          <button id="refresh-btn">Refresh</button>
        </div>
        <div class="cookie-stats"></div>
        <div class="cookie-list"></div>
      </div>
    `;
    
    this.panel.querySelector("#refresh-btn")!.addEventListener("click", () => {
      this.refresh();
    });
  }

  private setupListeners(): void {
    // Listen for cookie changes
    chrome.cookies.onChanged.addListener((changeInfo) => {
      this.handleCookieChange(changeInfo);
    });
    
    // Get current tab
    chrome.devtools.inspectedWindow.eval(
      "location.href",
      (result: string) => {
        this.currentUrl = result;
        this.refresh();
      }
    );
  }

  async refresh(): Promise<void> {
    try {
      const url = new URL(this.currentUrl);
      this.cookies = await chrome.cookies.getAll({ domain: url.hostname });
      this.render();
    } catch (error) {
      console.error("Failed to get cookies:", error);
    }
  }

  private handleCookieChange(changeInfo: CookieChangeDetails): void {
    // Update local state based on change type
    const existingIndex = this.cookies.findIndex(
      c => c.name === changeInfo.cookie.name && c.domain === changeInfo.cookie.domain
    );
    
    if (changeInfo.removed) {
      if (existingIndex >= 0) {
        this.cookies.splice(existingIndex, 1);
      }
    } else if (existingIndex >= 0) {
      this.cookies[existingIndex] = changeInfo.cookie;
    } else {
      this.cookies.push(changeInfo.cookie);
    }
    
    this.render();
  }

  private render(): void {
    const statsEl = this.panel.querySelector(".cookie-stats")!;
    const listEl = this.panel.querySelector(".cookie-list")!;
    
    // Stats
    const totalSize = this.cookies.reduce((sum, c) => sum + c.value.length, 0);
    statsEl.textContent = `${this.cookies.length} cookies, ${totalSize} bytes`;
    
    // List
    listEl.innerHTML = this.cookies.map(cookie => `
      <div class="cookie-item">
        <div class="cookie-name">${this.escapeHtml(cookie.name)}</div>
        <div class="cookie-value">${this.escapeHtml(cookie.value.substring(0, 50))}${cookie.value.length > 50 ? "..." : ""}</div>
        <div class="cookie-meta">
          <span class="domain">${cookie.domain}</span>
          <span class="flags">${cookie.secure ? "Secure" : ""} ${cookie.httpOnly ? "HttpOnly" : ""} ${cookie.sameSite}</span>
        </div>
      </div>
    `).join("");
  }

  private escapeHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}

// Initialize when panel loads
document.addEventListener("DOMContentLoaded", () => {
  const panel = document.getElementById("cookie-panel");
  if (panel) {
    new CookieDevToolsPanel(panel);
  }
});
```

### Cookie Diff Between Page Loads

```typescript
// background.ts
class CookieDiff {
  private previousCookies: Map<string, CookieResult> = new Map();
  private url: string;

  constructor(url: string) {
    this.url = url;
    this.captureBaseline();
  }

  async captureBaseline(): Promise<void> {
    const urlObj = new URL(this.url);
    const cookies = await chrome.cookies.getAll({ domain: urlObj.hostname });
    
    this.previousCookies.clear();
    for (const cookie of cookies) {
      const key = `${cookie.name}@${cookie.domain}`;
      this.previousCookies.set(key, cookie);
    }
  }

  async getDiff(): Promise<{
    added: CookieResult[];
    removed: CookieResult[];
    changed: Array<{ old: CookieResult; new: CookieResult }>;
  }> {
    const urlObj = new URL(this.url);
    const currentCookies = await chrome.cookies.getAll({ domain: urlObj.hostname });
    const currentMap = new Map<string, CookieResult>();
    
    for (const cookie of currentCookies) {
      const key = `${cookie.name}@${cookie.domain}`;
      currentMap.set(key, cookie);
    }
    
    const added: CookieResult[] = [];
    const removed: CookieResult[] = [];
    const changed: Array<{ old: CookieResult; new: CookieResult }> = [];
    
    // Find added and changed
    for (const [key, cookie] of currentMap) {
      const prev = this.previousCookies.get(key);
      if (!prev) {
        added.push(cookie);
      } else if (prev.value !== cookie.value) {
        changed.push({ old: prev, new: cookie });
      }
    }
    
    // Find removed
    for (const [key, cookie] of this.previousCookies) {
      if (!currentMap.has(key)) {
        removed.push(cookie);
      }
    }
    
    // Update baseline
    await this.captureBaseline();
    
    return { added, removed, changed };
  }
}

// Usage: Track cookie changes across page navigation
const cookieDiff = new CookieDiff("https://app.example.com");
cookieDiff.getDiff().then(diff => {
  console.log(`Added: ${diff.added.length}, Removed: ${diff.removed.length}, Changed: ${diff.changed.length}`);
});
```

### SameSite, Secure, HttpOnly Analysis

```typescript
// background.ts
interface CookieSecurityAnalysis {
  secureCount: number;
  insecureCount: number;
  httpOnlyCount: number;
  sameSiteNoneCount: number;
  sameSiteLaxCount: number;
  sameSiteStrictCount: number;
  warnings: string[];
}

async function analyzeCookieSecurity(domain: string): Promise<CookieSecurityAnalysis> {
  const cookies = await chrome.cookies.getAll({ domain });
  
  const analysis: CookieSecurityAnalysis = {
    secureCount: 0,
    insecureCount: 0,
    httpOnlyCount: 0,
    sameSiteNoneCount: 0,
    sameSiteLaxCount: 0,
    sameSiteStrictCount: 0,
    warnings: [],
  };
  
  for (const cookie of cookies) {
    if (cookie.secure) analysis.secureCount++;
    else analysis.insecureCount++;
    
    if (cookie.httpOnly) analysis.httpOnlyCount++;
    
    switch (cookie.sameSite) {
      case "no_restriction":
        analysis.sameSiteNoneCount++;
        break;
      case "lax":
        analysis.sameSiteLaxCount++;
        break;
      case "strict":
        analysis.sameSiteStrictCount++;
        break;
    }
    
    // Generate warnings
    if (!cookie.secure && cookie.value.length > 0) {
      analysis.warnings.push(`${cookie.name}: Not secure (can be sent over HTTP)`);
    }
    
    if (cookie.sameSite === "no_restriction" && !cookie.secure) {
      analysis.warnings.push(`${cookie.name}: SameSite=None requires Secure flag`);
    }
  }
  
  return analysis;
}

// Usage
const security = await analyzeCookieSecurity("example.com");
console.log(`Secure: ${security.secureCount}, Insecure: ${security.insecureCount}`);
security.warnings.forEach(w => console.warn(`Warning: ${w}`));
```

### Expiration Timeline Visualization

```typescript
// background.ts
interface CookieExpiryInfo {
  name: string;
  domain: string;
  expiresAt: Date;
  isExpired: boolean;
  daysUntilExpiry?: number;
}

async function getCookieExpiryTimeline(domain: string): Promise<CookieExpiryInfo[]> {
  const cookies = await chrome.cookies.getAll({ domain });
  const now = Date.now();
  
  const expiryInfo: CookieExpiryInfo[] = [];
  
  for (const cookie of cookies) {
    if (cookie.session) {
      expiryInfo.push({
        name: cookie.name,
        domain: cookie.domain,
        expiresAt: new Date(0), // Session cookie
        isExpired: false,
      });
      continue;
    }
    
    if (!cookie.expirationDate) continue;
    
    const expiresAt = new Date(cookie.expirationDate * 1000);
    const isExpired = expiresAt.getTime() < now;
    const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now) / (1000 * 60 * 60 * 24));
    
    expiryInfo.push({
      name: cookie.name,
      domain: cookie.domain,
      expiresAt,
      isExpired,
      daysUntilExpiry: isExpired ? undefined : daysUntilExpiry,
    });
  }
  
  // Sort by expiration (expired first, then soonest to expire)
  return expiryInfo.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
}

// Generate report
async function generateExpiryReport(domain: string): Promise<string> {
  const timeline = await getCookieExpiryTimeline(domain);
  
  const expired = timeline.filter(c => c.isExpired);
  const expiringSoon = timeline.filter(c => !c.isExpired && c.daysUntilExpiry && c.daysUntilExpiry <= 7);
  const sessionCookies = timeline.filter(c => c.expiresAt.getTime() === 0);
  
  let report = `Cookie Expiry Report for ${domain}\n`;
  report += `${"=".repeat(40)}\n\n`;
  
  report += `Total: ${timeline.length} cookies\n`;
  report += `- Expired: ${expired.length}\n`;
  report += `- Expiring within 7 days: ${expiringSoon.length}\n`;
  report += `- Session cookies: ${sessionCookies.length}\n\n`;
  
  if (expired.length > 0) {
    report += "Expired Cookies:\n";
    for (const c of expired) {
      report += `  - ${c.name} (${c.domain})\n`;
    }
    report += "\n";
  }
  
  if (expiringSoon.length > 0) {
    report += "Expiring Soon:\n";
    for (const c of expiringSoon) {
      report += `  - ${c.name}: ${c.daysUntilExpiry} days (${c.expiresAt.toISOString()})\n`;
    }
  }
  
  return report;
}
```

---

## Integration with @theluckystrike/webext-storage

The `@theluckystrike/webext-storage` library provides type-safe local storage for Chrome extensions. Here's how to use it alongside the Cookies API:

```typescript
// storage/cookie-settings.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";

const cookieSettingsSchema = defineSchema({
  monitoredDomains: { type: "array", items: { type: "string" }, default: [] },
  autoBackupEnabled: { type: "boolean", default: false },
  backupInterval: { type: "number", default: 86400000 }, // 24 hours
  blockedCookiePatterns: { type: "array", items: { type: "string" }, default: [] },
  sessionWarningMinutes: { type: "number", default: 5 },
});

export const cookieSettings = createStorage("cookie-settings", cookieSettingsSchema);

// Usage: Store monitored domains
await cookieSettings.set("monitoredDomains", ["example.com", "api.example.com"]);

// Usage: Enable auto-backup
await cookieSettings.set("autoBackupEnabled", true);

// Background script: Auto-backup cookies
async function autoBackup(): Promise<void> {
  const settings = await cookieSettings.get();
  if (!settings.autoBackupEnabled) return;
  
  const cookies = await chrome.cookies.getAll({});
  const backup = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    cookies: cookies,
  };
  
  await createStorage("cookie-backup").set("latest", backup);
}

// Run backup on interval
setInterval(autoBackup, (await cookieSettings.get()).backupInterval);
```

---

## Summary Table

| Pattern | Use Case | Key API Methods | Permission |
|---------|----------|-----------------|------------|
| **1: Basics** | CRUD operations | `get`, `getAll`, `set`, `remove` | `cookies` + `host_permissions` |
| **2: Monitoring** | Real-time tracking | `onChanged` listener | `cookies` |
| **3: Cookie Jar** | Bulk management | `getAll` + iteration | `cookies` |
| **4: Auth** | Session management | Cookie detection + monitoring | `cookies` + `host_permissions` |
| **5: Stores** | Multi-profile | `getAllCookieStores` | `cookies` |
| **6: Backup** | Export/import | `getAll` + `set` | `cookies` + `host_permissions` |
| **7: Privacy** | Blocking/analysis | `declarativeNetRequest` | `declarativeNetRequest` |
| **8: Debugging** | DevTools integration | `onChanged`, `getAll` | `cookies` |

### Quick Reference: Common Operations

```typescript
// Get all cookies for current tab
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const url = new URL(tab.url);
const cookies = await chrome.cookies.getAll({ domain: url.hostname });

// Set a cookie with all options
await chrome.cookies.set({
  url: "https://example.com",
  name: "token",
  value: "abc123",
  domain: ".example.com",
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
  expirationDate: Math.floor(Date.now() / 1000) + 86400 * 7,
});

// Monitor all cookie changes
chrome.cookies.onChanged.addListener(change => {
  console.log(`${change.removed ? "Removed" : "Changed"}: ${change.cookie.name}`);
});
```

---

## Additional Resources

- [Chrome Cookies API Reference](https://developer.chrome.com/docs/extensions/reference/cookies/)
- [MDN: Cookie API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/cookies)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [SameSite Cookie Changes](https://www.chromium.org/updates/same-site)
