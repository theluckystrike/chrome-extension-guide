---
layout: default
title: "Chrome Extension Keyboard Shortcuts Api. Best Practices"
description: "Configure keyboard shortcuts with the Commands API."
canonical_url: "https://bestchromeextensions.com/patterns/keyboard-shortcuts-api/"
---

# Keyboard Shortcuts API Patterns

Overview {#overview}

The Chrome Commands API (`chrome.commands`) allows extensions to define keyboard shortcuts. This guide covers practical patterns for implementing keyboard shortcuts in Chrome Extensions.

---

Pattern 1: Manifest Commands Declaration {#pattern-1-manifest-commands-declaration}

Define keyboard shortcuts in your `manifest.json`:

```json
{
  "commands": {
    "_execute_action": {
      "suggested_key": { "default": "Ctrl+Shift+E", "mac": "Command+Shift+E" },
      "description": "Toggle the extension popup"
    },
    "toggle-feature": {
      "suggested_key": { "default": "Ctrl+Shift+T", "mac": "Command+Shift+T" },
      "description": "Toggle the main feature on/off"
    },
    "quick-action": {
      "suggested_key": { "default": "Alt+T", "mac": "Alt+T" },
      "description": "Perform a quick action"
    }
  },
}
```

Keyboard Shortcut String Format {#keyboard-shortcut-string-format}

```ts
// Valid formats: Ctrl+Shift+K, Alt+T, CommandOrControl+Shift+E, F12
function isValidShortcut(shortcut: string): boolean {
  const validModifiers = ["Ctrl", "Alt", "Shift", "Command", "CommandOrControl"];
  const parts = shortcut.split("+");
  if (parts.length < 1 || parts.length > 4) return false;
  const modifiers = parts.slice(0, -1);
  const key = parts[parts.length - 1];
  if (modifiers.length === 0) {
    return ["F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","Space","Tab"].includes(key);
  }
  return modifiers.every(m => validModifiers.includes(m));
}
```

---

Pattern 2: Command Event Handling {#pattern-2-command-event-handling}

Use a command map pattern for clean routing:

```ts
// background.ts
import { createStorage, defineSchema } from "@theluckystrike/webext-storage";
import { sendMessage } from "@theluckystrike/webext-messaging";

const storage = createStorage(defineSchema({
  featureEnabled: { type: "boolean", default: true },
  lastCommandTime: { type: "number", default: 0 },
}));

const commandHandlers: Record<string, (tab?: chrome.tabs.Tab) => Promise<void>> = {
  "toggle-feature": async () => {
    const newState = !(await storage.get("featureEnabled"));
    await storage.set("featureEnabled", newState);
    await sendMessage({ type: "FEATURE_TOGGLE", payload: newState });
  },
  "quick-action": async (tab) => {
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "QUICK_ACTION" });
  },
  "open-settings": async () => {
    const url = chrome.runtime.getURL("settings.html");
    const tabs = await chrome.tabs.query({ url });
    if (tabs[0]) await chrome.tabs.update(tabs[0].id, { active: true });
    else await chrome.tabs.create({ url });
  },
  "capture-selection": async (tab) => {
    if (!tab?.id) return;
    const [r] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString() ?? "",
    });
    if (r.result) await storage.set("lastCapture", { text: r.result, url: tab.url, ts: Date.now() });
  },
};

chrome.commands.onCommand.addListener(async (cmd, tab) => {
  const handler = commandHandlers[cmd];
  if (!handler) return;
  await storage.set("lastCommandTime", Date.now());
  await handler(tab);
});
```

---

Pattern 3: Dynamic Shortcut Discovery {#pattern-3-dynamic-shortcut-discovery}

Allow users to see and configure shortcuts:

```ts
// options/shortcuts.ts
async function getAllCommands(): Promise<chrome.commands.Command[]> {
  return chrome.commands.getAll();
}

async function renderShortcutsTable(): Promise<void> {
  const cmds = await getAllCommands();
  const c = document.getElementById("shortcuts-container");
  if (!c) return;
  c.innerHTML = cmds.map(cmd => `<div>${cmd.name}: <code>${cmd.shortcut ?? "Not set"}</code></div>`).join("");
}

function formatShortcut(s: string): string {
  if (!s) return "Not configured";
  return s.replace("CommandOrControl", navigator.platform.includes("Mac") ? "⌘" : "Ctrl")
    .replace("Command", "⌘").replace("Ctrl", "Ctrl").replace("Alt", "⌥").replace("Shift", "⇧");
}

function openShortcutsPage(): void { chrome.tabs.create({ url: "chrome://extensions/shortcuts" }); }

async function detectConflicts(): Promise<string[]> {
  const cmds = await getAllCommands();
  const browserShortcuts = ["Ctrl+Shift+N", "Ctrl+Shift+T", "Command+Option+I"];
  return cmds.filter(c => c.shortcut && browserShortcuts.includes(c.shortcut)).map(c => c.name!);
}
```

---

Pattern 4: Per-Tab Command Behavior {#pattern-4-per-tab-command-behavior}

Execute different actions based on the active tab:

```ts
// background.ts
async function getTabContext(tid: number): Promise<{ url: string; title: string; isVideo: boolean } | null> {
  try {
    const t = await chrome.tabs.get(tid);
    if (!t.url?.startsWith("http")) return null;
    return { url: t.url, title: t.title ?? "", isVideo: t.url.includes("youtube") };
  } catch { return null; }
}

const contextualHandlers: Record<string, (tab: chrome.tabs.Tab) => Promise<void>> = {
  "enhance-page": async (tab) => {
    const ctx = await getTabContext(tab.id!);
    if (!ctx) return;
    const type = ctx.isVideo ? "ENABLE_VIDEO_ENHANCEMENTS" : "ENABLE_PAGE_ENHANCEMENT";
    await chrome.tabs.sendMessage(tab.id!, { type });
  },
  "save-for-later": async (tab) => {
    const ctx = await getTabContext(tab.id!);
    if (!ctx) return;
    const items = (await chrome.storage.local.get("savedItems")).savedItems ?? [];
    items.push({ url: ctx.url, title: ctx.title, savedAt: Date.now() });
    await chrome.storage.local.set({ savedItems: items });
  },
  "share-page": async (tab) => {
    const ctx = await getTabContext(tab.id!);
    if (!ctx?.url) return;
    await chrome.clipboard.writeText(ctx.url);
    await chrome.notifications.create({ type: "basic", title: "Link Copied", message: "URL copied" });
  },
};

chrome.commands.onCommand.addListener(async (cmd, tab) => {
  const h = contextualHandlers[cmd];
  if (h && tab) await h(tab);
});
```

---

Pattern 5: Command Throttling and Debouncing {#pattern-5-command-throttling-and-debouncing}

Prevent rapid-fire command execution:

```ts
// background.ts
function throttle<T extends (...a: unknown[]) => unknown>(fn: T, delay: number): T {
  let lastCall = 0, timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    const now = Date.now(), remaining = delay - (now - lastCall);
    if (remaining <= 0) { if (timeoutId) clearTimeout(timeoutId); lastCall = now; return fn(...args); }
    if (!timeoutId) timeoutId = setTimeout(() => { lastCall = Date.now(); timeoutId = null; fn(...args); }, remaining);
  }) as T;
}

function debounce<T extends (...a: unknown[]) => unknown>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => { fn(...args); timeoutId = null; }, delay);
  }) as T;
}

const throttleStates = new Map<string, { lastExecution: number; isInCooldown: boolean; cooldownDuration: number }>();

function createThrottledHandler(cmd: string, cooldown = 1000) {
  const state = { lastExecution: 0, isInCooldown: false, cooldownDuration: cooldown };
  throttleStates.set(cmd, state);
  return async () => {
    if (state.isInCooldown) return;
    state.lastExecution = Date.now(); state.isInCooldown = true;
    console.log(`Executing: ${cmd}`);
    setTimeout(() => { state.isInCooldown = false; }, cooldown);
  };
}
```

---

Pattern 6: Multi-Key Sequences (Chord Emulation) {#pattern-6-multi-key-sequences-chord-emulation}

Implement two-step shortcuts:

```ts
// background.ts
const chordDefinitions: Record<string, { keys: string[]; handler: () => void | Promise<void> }> = {
  "ctrl+k ctrl+s": { keys: ["Ctrl+K", "Ctrl+S"], handler: async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "QUICK_SAVE" });
  }},
  "ctrl+k ctrl+f": { keys: ["Ctrl+K", "Ctrl+F"], handler: async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "OPEN_FIND" });
  }},
  "g g": { keys: ["g", "g"], handler: async () => { await chrome.tabs.create({ url: "https://github.com" }); }},
};

const chordState = { sequence: [] as string[], timeoutId: null as ReturnType<typeof setTimeout> | null, timeoutDuration: 1500 };

function resetChord() { if (chordState.timeoutId) clearTimeout(chordState.timeoutId); chordState.sequence = []; }

function processChordKey(key: string) {
  chordState.sequence.push(key);
  const current = chordState.sequence.join(" ");
  const match = chordDefinitions[current.toLowerCase()];
  if (match) { match.handler(); resetChord(); return; }
  const partials = Object.keys(chordDefinitions).filter(c => c.startsWith(current.toLowerCase()));
  if (partials.length === 0) { resetChord(); return; }
  if (chordState.timeoutId) clearTimeout(chordState.timeoutId);
  chordState.timeoutId = setTimeout(() => resetChord(), chordState.timeoutDuration);
}

chrome.commands.onCommand.addListener((cmd) => { if (cmd.startsWith("sequence-")) processChordKey(cmd.replace("sequence-", "")); });
```

---

Pattern 7: Shortcut Conflict Detection {#pattern-7-shortcut-conflict-detection}

Detect and warn about conflicts:

```ts
// background.ts
const CHROME_RESERVED = [
  { s: "Ctrl+Shift+N", d: "New incognito" }, { s: "Ctrl+Shift+T", d: "Reopen tab" },
  { s: "Command+Option+I", d: "DevTools (Mac)" }, { s: "CommandOrControl+Shift+K", d: "Omnibox" },
];
const OS_RESERVED: Record<string, string[]> = {
  macOS: ["Command+Q", "Command+W", "Command+T", "Command+Space"],
  Windows: ["Alt+F4", "Alt+Tab", "Win+D"], Linux: ["Ctrl+Alt+T", "Alt+F4"],
};

async function detectConflicts(): Promise<{ has: boolean; list: { cmd: string; shortcut: string; with: string }[] }> {
  const cmds = await chrome.commands.getAll();
  const list: { cmd: string; shortcut: string; with: string }[] = [];
  const plat = navigator.platform.includes("Mac") ? "macOS" : navigator.platform.includes("Win") ? "Windows" : "Linux";
  for (const c of cmds) {
    if (!c.shortcut) continue;
    for (const r of CHROME_RESERVED) { if (c.shortcut === r.s) list.push({ cmd: c.name ?? "", shortcut: c.shortcut, with: r.d }); }
    for (const r of OS_RESERVED[plat] ?? []) { if (c.shortcut === r) list.push({ cmd: c.name ?? "", shortcut: c.shortcut, with: `OS: ${r}` }); }
  }
  return { has: list.length > 0, list };
}

function suggestAlt(s: string): string[] {
  const p = s.split("+"), m = p.slice(0, -1), k = p[p.length - 1], alt: string[] = [];
  if (m.includes("Ctrl")) alt.push([...m.filter(x => x !== "Ctrl"), k].join("+"));
  if (!m.includes("Alt")) alt.push([...m, "Alt", k].join("+"));
  return alt.slice(0, 3);
}
```

---

Pattern 8: Keyboard Shortcut Onboarding {#pattern-8-keyboard-shortcut-onboarding}

Help users discover shortcuts:

```ts
// components/ShortcutOnboarding.ts
const onboardingSteps = [
  { id: "welcome", title: "Welcome", desc: "Learn keyboard shortcuts", shortcut: "" },
  { id: "toggle", title: "Toggle Feature", desc: "Press to toggle", shortcut: "Ctrl+Shift+T" },
  { id: "complete", title: "All Set!", desc: "Customize in Chrome settings", shortcut: "" },
];

class ShortcutOnboarding {
  private key = "shortcut-onboarding-done";
  async shouldShow(): Promise<boolean> { return !(await chrome.storage.local.get(this.key))[this.key]; }
  async complete(): Promise<void> { await chrome.storage.local.set({ [this.key]: true }); }
}

function renderOnboarding(): string {
  return `<div id="onboarding" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999">
    <div style="background:white;border-radius:8px;padding:24px;max-width:400px">
      <h2 id="title"></h2><p id="desc"></p><div id="shortcut"></div>
      <button id="next">Next</button><button id="skip">Skip</button>
    </div></div>`;
}

function formatShort(s: string): string { return s.split("+").map(k => `<kbd>${k}</kbd>`).join("+"); }

async function initOnboarding() {
  const ob = new ShortcutOnboarding();
  if (!(await ob.shouldShow())) return;
  const div = document.createElement("div"); div.innerHTML = renderOnboarding(); document.body.appendChild(div);
  let step = 0;
  const update = () => {
    const s = onboardingSteps[step];
    (document.getElementById("title")!).textContent = s.title;
    (document.getElementById("desc")!).textContent = s.desc;
    (document.getElementById("shortcut")!).innerHTML = s.shortcut ? formatShort(s.shortcut) : "";
  };
  update();
  document.getElementById("next")!.onclick = () => { step++; step >= onboardingSteps.length ? (div.remove(), ob.complete()) : update(); };
  document.getElementById("skip")!.onclick = () => { div.remove(); ob.complete(); };
}

function renderCheatSheet(cmds: chrome.commands.Command[]): string {
  return `<table><tr><th>Action</th><th>Shortcut</th></tr>
    ${cmds.map(c => `<tr><td>${c.description ?? c.name}</td><td><code>${c.shortcut ?? "Not set"}</code></td></tr>`).join("")}
    </table><button id="customize">Customize</button>
    <script>document.getElementById("customize").onclick = () => chrome.tabs.create({url:"chrome://extensions/shortcuts"});</script>`;
}
```

---

Summary Table {#summary-table}

| Pattern | Use Case | Key APIs | Complexity |
|---------|----------|----------|------------|
| Manifest Commands | Define shortcuts | manifest.json | Basic |
| Command Event Handling | Route commands | chrome.commands.onCommand | Basic |
| Dynamic Discovery | Show/manage shortcuts | chrome.commands.getAll() | Intermediate |
| Per-Tab Behavior | Context-aware | chrome.tabs.query | Intermediate |
| Throttling | Prevent rapid fire | setTimeout | Intermediate |
| Multi-Key Sequences | Chord shortcuts | State machine | Advanced |
| Conflict Detection | Warn about conflicts | Platform detection | Advanced |
| Onboarding | First-run tutorial | Storage, UI | Advanced |

---

Key Takeaways {#key-takeaways}

1. Use `CommandOrControl` for cross-platform compatibility
2. Route commands through a centralized map
3. Never hardcode shortcut strings in UI
4. Consider throttling for long-running operations
5. Provide visual feedback and onboarding
6. Test across Windows, macOS, and Linux
7. Use `chrome.commands.getAll()` for dynamic UIs
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
