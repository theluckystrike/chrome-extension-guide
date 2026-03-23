---
layout: default
title: "Chrome Extension Platform Detection — Best Practices"
description: "Detect platform and OS for cross-platform extensions."
canonical_url: "https://bestchromeextensions.com/patterns/platform-detection/"
---

# Platform Detection

## Overview {#overview}

Chrome extensions run across Windows, macOS, Linux, and ChromeOS — each with different keyboard shortcuts, file paths, and user expectations. Detecting the platform and system context lets you adapt behavior, UI, and shortcuts for each environment.

---

## Platform Info via chrome.runtime.getPlatformInfo() {#platform-info-via-chromeruntimegetplatforminfo}

The `chrome.runtime.getPlatformInfo()` API returns the OS, architecture, and platform type:

```ts
// utils/platform.ts
export interface PlatformInfo {
  os: "mac" | "win" | "android" | "cros" | "linux" | "openbsd";
  arch: "arm" | "x86-32" | "x86-64" | "arm64";
  nacl_arch: "arm" | "x86-32" | "x86-64";
}

export async function getPlatformInfo(): Promise<PlatformInfo> {
  return chrome.runtime.getPlatformInfo();
}

// Usage
const platform = await getPlatformInfo();
console.log(`Running on ${platform.os}/${platform.arch}`);
```

This runs in any extension context — popup, background, options page.

---

## Chrome Version Detection {#chrome-version-detection}

Detect the Chrome version to gate features or warn users:

```ts
// utils/chrome-version.ts
export function getChromeVersion(): number {
  const match = navigator.userAgent.match(/Chrome\/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

export function isChromeVersionAtLeast(minVersion: number): boolean {
  return getChromeVersion() >= minVersion;
}

// Usage: Gate MV3-only features
if (isChromeVersionAtLeast(110)) {
  // Use side panel API (MV3.9+)
}
```

---

## Environment Detection: Dev vs Production {#environment-detection-dev-vs-production}

Distinguish between development and production contexts:

```ts
// utils/environment.ts
export function isDevelopment(): boolean {
  return (
    chrome.runtime.id?.includes("dev") ||
    !chrome.runtime.id?.match(/^[a-hjkmnp-z]{32}$/) ||
    location.hostname === "localhost"
  );
}

export async function getExtensionId(): Promise<string> {
  return chrome.runtime.id;
}
```

Development extensions have temporary IDs; production extensions have 32-character IDs.

---

## Display and Window Info {#display-and-window-info}

Get display dimensions for positioning popups or side panels:

```ts
// utils/display.ts
export async function getPrimaryDisplay(): Promise<chrome.system.display.DisplayInfo> {
  const displays = await chrome.system.display.getInfo();
  return displays.find((d) => d.isPrimary) ?? displays[0];
}

export async function getWorkArea(): Promise<{ width: number; height: number }> {
  const display = await getPrimaryDisplay();
  return {
    width: display.workArea.width,
    height: display.workArea.height,
  };
}
```

---

## Color Scheme and Reduced Motion {#color-scheme-and-reduced-motion}

Respect user accessibility preferences:

```ts
// utils/preferences.ts
export function getColorScheme(): "light" | "dark" {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function getReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Apply theme
document.documentElement.setAttribute("data-theme", getColorScheme());
```

---

## Language and Locale {#language-and-locale}

Detect user language for i18n:

```ts
// utils/locale.ts
export function getLanguage(): string {
  return navigator.language || "en";
}

export function getLanguages(): string[] {
  return navigator.languages || [navigator.language || "en"];
}

// Usage: Load the right locale file
const lang = getLanguage().split("-")[0]; // "en-US" → "en"
```

---

## Network Type Detection {#network-type-detection}

```ts
// utils/network.ts
export function getNetworkType(): "online" | "offline" | "slow-2g" | "2g" | "3g" | "4g" {
  const connection = (navigator as any).connection;
  if (!navigator.onLine) return "offline";
  if (connection) {
    return connection.effectiveType || "online";
  }
  return "online";
}
```

---

## Platform Utility: Unified Helper {#platform-utility-unified-helper}

Combine all detection into one utility:

```ts
// utils/system.ts
export interface SystemContext {
  platform: PlatformInfo;
  version: number;
  isDev: boolean;
  colorScheme: "light" | "dark";
  reducedMotion: boolean;
  language: string;
  network: "online" | "offline";
}

export async function getSystemContext(): Promise<SystemContext> {
  return {
    platform: await getPlatformInfo(),
    version: getChromeVersion(),
    isDev: isDevelopment(),
    colorScheme: getColorScheme(),
    reducedMotion: getReducedMotion(),
    language: getLanguage(),
    network: getNetworkType(),
  };
}
```

---

## Pattern: Adaptive Shortcuts {#pattern-adaptive-shortcuts}

Different platforms use different modifier keys:

```ts
// utils/shortcuts.ts
export function getModifierKey(): string {
  const platform = getPlatformInfo(); // sync in content scripts
  return platform.os === "mac" ? "Command" : "Ctrl";
}

export function formatShortcut(key: string): string {
  const mod = getModifierKey();
  return `${mod}+${key.toUpperCase()}`;
}
```

In the extension popup, show "Press Ctrl+S on Windows, Command+S on macOS".

---

## Pattern: Platform-Aware UI {#pattern-platform-aware-ui}

Adjust UI based on platform conventions:

```ts
// ui/platform-aware.ts
export function applyPlatformStyles(): void {
  const platformInfo = getPlatformInfo(); // Call from sync context
  const isMac = platformInfo.os === "mac";

  document.body.classList.toggle("is-mac", isMac);
  document.body.classList.toggle("is-windows", !isMac);

  // macOS uses Cmd instead of Ctrl in tooltips
  const tooltips = document.querySelectorAll("[data-ctrl-label]");
  tooltips.forEach((el) => {
    const label = el.getAttribute("data-ctrl-label");
    el.setAttribute("title", label?.replace("Ctrl", isMac ? "Cmd" : "Ctrl") || "");
  });
}
```

---

## See Also {#see-also}

- [System API Reference][api-reference_system-api] — Full chrome.system.* APIs
- [Cross-Browser Compatibility][patterns_cross-browser] — Feature detection and polyfills
- [Accessibility Guide][guides_accessibility] — Color scheme, reduced motion, keyboard nav

[api_reference_system-api]: ../api-reference/system-api.md
[patterns_cross-browser]: ./cross-browser-compatibility.md
[guides_accessibility]: ../guides/accessibility.md
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
