# Build a Focus Mode Extension — Full Tutorial

## What We're Building
- Block distracting websites during focus sessions with `declarativeNetRequest`
- Pomodoro-style timer UI in the popup (25 min focus / 5 min break)
- Badge countdown showing remaining focus time on the extension icon
- Side panel with focus session stats and daily summary
- Desktop notification when a focus session ends
- Configurable block list with `@theluckystrike/webext-storage`
- Daily focus time tracking with IndexedDB for long-term history

## Prerequisites
- Basic Chrome extension knowledge (cross-ref: `docs/guides/extension-architecture.md`)
- Node.js + npm installed
- `npm install @theluckystrike/webext-storage`

---

## Step 1: Project Setup and manifest.json

```bash
mkdir focus-mode-ext && cd focus-mode-ext
npm init -y
npm install @theluckystrike/webext-storage
npm install -D typescript
```

```json
{
  "manifest_version": 3,
  "name": "FocusMode",
  "version": "1.0.0",
  "description": "Block distractions, stay focused, track your productive time.",
  "permissions": [
    "storage",
    "alarms",
    "notifications",
    "declarativeNetRequest",
    "sidePanel"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "declarative_net_request": {
    "rule_resources": [
      {
        "id": "focus_rules",
        "enabled": false,
        "path": "rules.json"
      }
    ]
  },
  "icons": {
    "16": "icon.png",
    "48": "icon.png",
    "128": "icon.png"
  }
}
```

Create an empty static rules file `rules.json` (we use dynamic rules instead):

```json
[]
```

`alarms` schedules timer events that survive service worker restarts. `declarativeNetRequest` blocks sites without broad host permissions. `sidePanel` provides a persistent stats view alongside the page.

---

## Step 2: Block Distracting Sites with declarativeNetRequest

The blocking logic uses dynamic rules so the block list is configurable at runtime. When a focus session starts, rules are added; when it ends, they are removed.

```typescript
// blocking.ts

export async function enableBlocking(sites: string[]): Promise<void> {
  const rules: chrome.declarativeNetRequest.Rule[] = sites.map(
    (site, i) => ({
      id: i + 1,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: { extensionPath: '/blocked.html' }
      },
      condition: {
        urlFilter: `||${site}`,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME
        ]
      }
    })
  );

  // Remove any existing rules, then add the new set
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRules.map(r => r.id),
    addRules: rules
  });
}

export async function disableBlocking(): Promise<void> {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map(r => r.id)
  });
}
```

Create `blocked.html` -- the page users see when they try to visit a blocked site:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      display: flex; align-items: center; justify-content: center;
      height: 100vh; margin: 0; background: #1a1a2e;
      font-family: system-ui, sans-serif; color: #e0e0e0;
    }
    .container { text-align: center; max-width: 400px; }
    h1 { font-size: 48px; margin: 0 0 16px; }
    p { font-size: 18px; color: #888; line-height: 1.6; }
    .timer { font-size: 24px; color: #4285f4; margin-top: 16px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Stay Focused</h1>
    <p>This site is blocked during your focus session. Keep going -- you are doing great.</p>
    <div class="timer" id="remaining"></div>
  </div>
  <script>
    async function updateTimer() {
      const { timerEndTime } = await chrome.storage.local.get('timerEndTime');
      if (timerEndTime) {
        const remaining = Math.max(0, timerEndTime - Date.now());
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        document.getElementById('remaining').textContent =
          `${minutes}:${String(seconds).padStart(2, '0')} remaining`;
      }
    }
    updateTimer();
    setInterval(updateTimer, 1000);
  </script>
</body>
</html>
```

---

## Step 3: Timer UI in Popup (Pomodoro-Style)

```html
<!-- popup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 300px; padding: 20px; font-family: system-ui, sans-serif;
      background: #fafafa; margin: 0;
    }
    h2 { margin: 0 0 16px; font-size: 16px; text-align: center; }
    .timer-display {
      text-align: center; font-size: 48px; font-weight: 700;
      font-variant-numeric: tabular-nums; margin: 16px 0;
      color: #333;
    }
    .timer-display.focus { color: #ea4335; }
    .timer-display.break { color: #34a853; }
    .status { text-align: center; font-size: 13px; color: #888; margin-bottom: 16px; }
    .controls { display: flex; gap: 8px; margin-bottom: 16px; }
    .controls button {
      flex: 1; padding: 10px; border: none; border-radius: 6px;
      font-size: 14px; font-weight: 600; cursor: pointer;
    }
    #start-btn { background: #ea4335; color: white; }
    #start-btn.break { background: #34a853; }
    #stop-btn { background: #f1f3f4; color: #333; }
    .settings { border-top: 1px solid #eee; padding-top: 12px; }
    .settings label {
      display: flex; justify-content: space-between;
      align-items: center; font-size: 13px; margin-bottom: 8px;
    }
    .settings input[type="number"] {
      width: 60px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px;
    }
    .sessions {
      text-align: center; font-size: 13px; color: #666;
      margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;
    }
    .sessions strong { color: #ea4335; }
  </style>
</head>
<body>
  <h2>FocusMode</h2>
  <div class="timer-display" id="timer">25:00</div>
  <div class="status" id="status">Ready to focus</div>
  <div class="controls">
    <button id="start-btn">Start Focus</button>
    <button id="stop-btn">Stop</button>
  </div>
  <div class="settings">
    <label>Focus (min) <input type="number" id="focus-min" value="25" min="1" max="90" /></label>
    <label>Break (min) <input type="number" id="break-min" value="5" min="1" max="30" /></label>
  </div>
  <div class="sessions" id="sessions">Sessions today: <strong>0</strong></div>
  <script src="popup.js"></script>
</body>
</html>
```

---

## Step 4: Background Service Worker -- Timer, Blocking, and Badge

The background script manages timer state, alarms, site blocking, and the badge countdown. `chrome.alarms` ensures the timer continues even if the service worker restarts.

```typescript
// background.ts

import { createStorage, defineSchema } from '@theluckystrike/webext-storage';
import { enableBlocking, disableBlocking } from './blocking';

const schema = defineSchema({
  timerState: 'string',       // 'idle' | 'focus' | 'break'
  timerEndTime: 'number',      // timestamp when current period ends
  focusMinutes: 'number',      // default 25
  breakMinutes: 'number',      // default 5
  sessionsToday: 'number',
  todayDate: 'string',         // YYYY-MM-DD to track daily reset
  blockedSites: 'string'       // JSON array of domain strings
});
const storage = createStorage(schema, 'local');

const DEFAULT_BLOCKED = [
  'twitter.com', 'x.com', 'reddit.com', 'youtube.com',
  'facebook.com', 'instagram.com', 'tiktok.com'
];

// --- Timer management ---

async function getBlockedSites(): Promise<string[]> {
  const raw = await storage.get('blockedSites');
  return raw ? JSON.parse(raw) : DEFAULT_BLOCKED;
}

async function startFocus(): Promise<number> {
  const minutes = (await storage.get('focusMinutes')) || 25;
  const endTime = Date.now() + minutes * 60000;

  await storage.set('timerState', 'focus');
  await storage.set('timerEndTime', endTime);

  chrome.alarms.create('timer-end', { delayInMinutes: minutes });
  chrome.alarms.create('badge-tick', { periodInMinutes: 1 / 60 }); // every second

  const sites = await getBlockedSites();
  await enableBlocking(sites);
  await updateBadge('focus', minutes);

  return endTime;
}

async function startBreak(): Promise<number> {
  const minutes = (await storage.get('breakMinutes')) || 5;
  const endTime = Date.now() + minutes * 60000;

  await storage.set('timerState', 'break');
  await storage.set('timerEndTime', endTime);

  chrome.alarms.create('timer-end', { delayInMinutes: minutes });
  chrome.alarms.create('badge-tick', { periodInMinutes: 1 / 60 });

  await disableBlocking();
  await updateBadge('break', minutes);

  return endTime;
}

async function stopTimer(): Promise<void> {
  await storage.set('timerState', 'idle');
  await storage.set('timerEndTime', 0);
  await chrome.alarms.clear('timer-end');
  await chrome.alarms.clear('badge-tick');
  await disableBlocking();
  await updateBadge('idle');
}

// --- Badge countdown ---

async function updateBadge(
  state: string,
  minutes?: number
): Promise<void> {
  if (state === 'focus') {
    chrome.action.setBadgeText({ text: `${minutes ?? '?'}m` });
    chrome.action.setBadgeBackgroundColor({ color: '#ea4335' });
  } else if (state === 'break') {
    chrome.action.setBadgeText({ text: `${minutes ?? '?'}m` });
    chrome.action.setBadgeBackgroundColor({ color: '#34a853' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

async function tickBadge(): Promise<void> {
  const endTime = await storage.get('timerEndTime');
  const state = await storage.get('timerState');
  if (!endTime || !state || state === 'idle') return;

  const remaining = Math.max(0, endTime - Date.now());
  const minutes = Math.ceil(remaining / 60000);
  chrome.action.setBadgeText({ text: `${minutes}m` });
}

// --- Alarm handlers ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'badge-tick') {
    await tickBadge();
    return;
  }

  if (alarm.name === 'timer-end') {
    const state = await storage.get('timerState');
    await chrome.alarms.clear('badge-tick');

    if (state === 'focus') {
      // Increment daily session count
      const today = new Date().toISOString().slice(0, 10);
      const storedDate = await storage.get('todayDate');
      let sessions = (await storage.get('sessionsToday')) || 0;

      if (storedDate !== today) {
        sessions = 0;
        await storage.set('todayDate', today);
      }
      sessions += 1;
      await storage.set('sessionsToday', sessions);

      // Record to IndexedDB for long-term tracking
      await recordFocusSession(
        (await storage.get('focusMinutes')) || 25
      );

      await disableBlocking();
      await storage.set('timerState', 'idle');
      await updateBadge('idle');

      chrome.notifications.create('focus-complete', {
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Focus Session Complete!',
        message: `Session ${sessions} done. Time for a break!`,
        buttons: [{ title: 'Start Break' }, { title: 'Skip' }]
      });
    } else if (state === 'break') {
      await storage.set('timerState', 'idle');
      await updateBadge('idle');

      chrome.notifications.create('break-complete', {
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Break Over',
        message: 'Ready for another focus session?',
        buttons: [{ title: 'Start Focus' }, { title: 'Skip' }]
      });
    }
  }
});

// --- Notification button handlers ---

chrome.notifications.onButtonClicked.addListener(
  async (notifId, buttonIndex) => {
    if (buttonIndex !== 0) return; // "Skip" does nothing

    if (notifId === 'focus-complete') {
      await startBreak();
    } else if (notifId === 'break-complete') {
      await startFocus();
    }
  }
);

// --- Message handlers (for popup and side panel) ---

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handle = async () => {
    switch (msg.action) {
      case 'START_FOCUS': {
        const endTime = await startFocus();
        return { endTime };
      }
      case 'START_BREAK': {
        const endTime = await startBreak();
        return { endTime };
      }
      case 'STOP': {
        await stopTimer();
        return { ok: true };
      }
      case 'GET_STATUS': {
        const state = (await storage.get('timerState')) || 'idle';
        const endTime = (await storage.get('timerEndTime')) || 0;
        const remaining = Math.max(0, endTime - Date.now());
        const today = new Date().toISOString().slice(0, 10);
        const storedDate = await storage.get('todayDate');
        const sessions = storedDate === today
          ? ((await storage.get('sessionsToday')) || 0) : 0;
        return { state, remaining, sessions };
      }
      case 'SET_OPTIONS': {
        if (msg.focusMinutes) await storage.set('focusMinutes', msg.focusMinutes);
        if (msg.breakMinutes) await storage.set('breakMinutes', msg.breakMinutes);
        return { ok: true };
      }
      case 'GET_BLOCKED_SITES': {
        return { sites: await getBlockedSites() };
      }
      case 'SET_BLOCKED_SITES': {
        await storage.set('blockedSites', JSON.stringify(msg.sites));
        const state = await storage.get('timerState');
        if (state === 'focus') await enableBlocking(msg.sites);
        return { ok: true };
      }
      case 'GET_DAILY_STATS': {
        const stats = await getDailyStats(msg.days || 7);
        return { stats };
      }
      default:
        return { error: 'Unknown action' };
    }
  };

  handle().then(sendResponse);
  return true;
});

// --- Service worker restart recovery ---

chrome.runtime.onStartup.addListener(async () => {
  const state = await storage.get('timerState');
  const endTime = await storage.get('timerEndTime');

  if (state && state !== 'idle' && endTime && endTime > Date.now()) {
    const remaining = (endTime - Date.now()) / 60000;
    chrome.alarms.create('timer-end', { delayInMinutes: remaining });
    chrome.alarms.create('badge-tick', { periodInMinutes: 1 / 60 });

    if (state === 'focus') {
      const sites = await getBlockedSites();
      await enableBlocking(sites);
    }
    await updateBadge(state, Math.ceil(remaining));
  } else if (state && state !== 'idle') {
    await stopTimer();
  }
});
```

---

## Step 5: Popup Logic -- Timer Controls and Status

```typescript
// popup.ts

const timerDisplay = document.getElementById('timer') as HTMLDivElement;
const statusText = document.getElementById('status') as HTMLDivElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
const focusInput = document.getElementById('focus-min') as HTMLInputElement;
const breakInput = document.getElementById('break-min') as HTMLInputElement;
const sessionsDiv = document.getElementById('sessions') as HTMLDivElement;

let tickInterval: ReturnType<typeof setInterval> | null = null;

async function refresh(): Promise<void> {
  const status = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });

  if (status.state === 'focus') {
    timerDisplay.className = 'timer-display focus';
    statusText.textContent = 'Focusing...';
    startBtn.textContent = 'Start Break';
    startBtn.className = 'break';
    startCountdown(status.remaining);
  } else if (status.state === 'break') {
    timerDisplay.className = 'timer-display break';
    statusText.textContent = 'On break';
    startBtn.textContent = 'Start Focus';
    startBtn.className = '';
    startCountdown(status.remaining);
  } else {
    timerDisplay.className = 'timer-display';
    timerDisplay.textContent = `${focusInput.value}:00`;
    statusText.textContent = 'Ready to focus';
    startBtn.textContent = 'Start Focus';
    startBtn.className = '';
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
  }

  sessionsDiv.innerHTML = `Sessions today: <strong>${status.sessions}</strong>`;
}

function startCountdown(remainingMs: number): void {
  if (tickInterval) clearInterval(tickInterval);

  const endTime = Date.now() + remainingMs;

  function tick() {
    const remaining = Math.max(0, endTime - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timerDisplay.textContent =
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (remaining <= 0) {
      if (tickInterval) clearInterval(tickInterval);
      refresh();
    }
  }

  tick();
  tickInterval = setInterval(tick, 1000);
}

startBtn.addEventListener('click', async () => {
  const status = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });

  await chrome.runtime.sendMessage({
    action: 'SET_OPTIONS',
    focusMinutes: parseInt(focusInput.value),
    breakMinutes: parseInt(breakInput.value),
  });

  if (status.state === 'focus') {
    await chrome.runtime.sendMessage({ action: 'START_BREAK' });
  } else {
    await chrome.runtime.sendMessage({ action: 'START_FOCUS' });
  }
  refresh();
});

stopBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'STOP' });
  refresh();
});

focusInput.addEventListener('change', () => {
  chrome.runtime.sendMessage({
    action: 'SET_OPTIONS',
    focusMinutes: parseInt(focusInput.value)
  });
});

breakInput.addEventListener('change', () => {
  chrome.runtime.sendMessage({
    action: 'SET_OPTIONS',
    breakMinutes: parseInt(breakInput.value)
  });
});

refresh();
```

---

## Step 6: Notification When Focus Session Ends

Notifications are created in the background script (Step 4) using `chrome.notifications.create`. The notification includes action buttons:

- After a focus session: "Start Break" or "Skip"
- After a break: "Start Focus" or "Skip"

Clicking "Start Break" or "Start Focus" automatically transitions to the next phase. The `chrome.notifications.onButtonClicked` listener handles this in the background.

See cross-ref: `docs/patterns/notification-patterns.md` for advanced notification patterns including rich notifications and progress indicators.

---

## Step 7: Configurable Block List with @theluckystrike/webext-storage

The block list is stored as a JSON string in `chrome.storage.local` via `@theluckystrike/webext-storage`. The side panel provides the UI for editing the list. Changes take effect immediately if a focus session is active, because the `SET_BLOCKED_SITES` handler updates dynamic rules in real time.

Default blocked sites:
- twitter.com / x.com
- reddit.com
- youtube.com
- facebook.com
- instagram.com
- tiktok.com

Users add sites via the side panel input. Domains are normalized by stripping `https://`, `www.`, and any path components.

---

## Step 8: Side Panel with Stats and Daily Tracking via IndexedDB

The side panel shows a weekly bar chart of focus time, current session status, and the block list editor. IndexedDB provides durable long-term storage that survives `chrome.storage.local` clears.

See cross-ref: `docs/patterns/side-panel.md` for more side panel patterns.

```html
<!-- sidepanel.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; padding: 20px; background: #fafafa; }
    h2 { font-size: 18px; margin-bottom: 16px; }
    h3 { font-size: 14px; margin: 16px 0 8px; color: #555; }
    .stat-card {
      background: white; border-radius: 8px; padding: 16px;
      margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }
    .stat-card .value { font-size: 32px; font-weight: 700; color: #ea4335; }
    .stat-card .label { font-size: 13px; color: #888; margin-top: 4px; }
    .chart { display: flex; align-items: flex-end; gap: 6px; height: 120px; margin: 12px 0; }
    .bar-wrapper { flex: 1; display: flex; flex-direction: column; align-items: center; }
    .bar {
      width: 100%; background: #ea4335; border-radius: 4px 4px 0 0;
      min-height: 2px; transition: height 0.3s;
    }
    .bar-label { font-size: 10px; color: #888; margin-top: 4px; }
    .bar-value { font-size: 10px; color: #333; margin-bottom: 2px; }
    .block-item {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px;
    }
    .remove-btn {
      border: none; background: none; color: #ea4335;
      cursor: pointer; font-size: 12px;
    }
    .add-row { display: flex; gap: 8px; margin-top: 8px; }
    .add-row input {
      flex: 1; padding: 6px 10px; border: 1px solid #ccc;
      border-radius: 4px; font-size: 13px;
    }
    .add-row button {
      padding: 6px 12px; border: none; border-radius: 4px;
      background: #4285f4; color: white; cursor: pointer; font-size: 13px;
    }
    .current-status {
      text-align: center; padding: 12px; background: #f1f3f4;
      border-radius: 8px; margin-bottom: 12px; font-size: 14px; color: #333;
    }
    .current-status.active { background: #fce8e6; color: #ea4335; font-weight: 600; }
  </style>
</head>
<body>
  <h2>FocusMode Stats</h2>
  <div class="current-status" id="current-status">No active session</div>
  <div class="stat-card">
    <div class="value" id="today-minutes">0</div>
    <div class="label">minutes focused today</div>
  </div>
  <h3>This Week</h3>
  <div class="chart" id="weekly-chart"></div>
  <h3>Blocked Sites</h3>
  <div id="block-list"></div>
  <div class="add-row">
    <input type="text" id="add-site" placeholder="example.com" />
    <button id="add-site-btn">Add</button>
  </div>
  <script src="sidepanel.js"></script>
</body>
</html>
```

```typescript
// sidepanel.ts

async function renderStats(): Promise<void> {
  const statusResponse = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
  const statsResponse = await chrome.runtime.sendMessage({
    action: 'GET_DAILY_STATS',
    days: 7
  });

  // Current status
  const statusEl = document.getElementById('current-status') as HTMLDivElement;
  if (statusResponse.state === 'focus') {
    const mins = Math.ceil(statusResponse.remaining / 60000);
    statusEl.textContent = `Focusing -- ${mins} min remaining`;
    statusEl.className = 'current-status active';
  } else if (statusResponse.state === 'break') {
    statusEl.textContent = 'On break';
    statusEl.className = 'current-status';
  } else {
    statusEl.textContent = 'No active session';
    statusEl.className = 'current-status';
  }

  // Today's total
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = statsResponse.stats.find(
    (s: { date: string }) => s.date === today
  );
  const todayEl = document.getElementById('today-minutes') as HTMLDivElement;
  todayEl.textContent = String(todayStats?.totalMinutes || 0);

  // Weekly bar chart
  const chartEl = document.getElementById('weekly-chart') as HTMLDivElement;
  chartEl.innerHTML = '';

  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const maxMinutes = Math.max(
    1,
    ...statsResponse.stats.map((s: { totalMinutes: number }) => s.totalMinutes)
  );

  for (const day of days) {
    const stat = statsResponse.stats.find(
      (s: { date: string }) => s.date === day
    );
    const minutes = stat?.totalMinutes || 0;
    const height = (minutes / maxMinutes) * 100;

    const wrapper = document.createElement('div');
    wrapper.className = 'bar-wrapper';

    const value = document.createElement('div');
    value.className = 'bar-value';
    value.textContent = minutes > 0 ? `${minutes}m` : '';

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(2, height)}%`;

    const label = document.createElement('div');
    label.className = 'bar-label';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    label.textContent = dayNames[new Date(day + 'T12:00').getDay()];

    wrapper.appendChild(value);
    wrapper.appendChild(bar);
    wrapper.appendChild(label);
    chartEl.appendChild(wrapper);
  }
}

async function loadBlockList(): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    action: 'GET_BLOCKED_SITES'
  });

  const listContainer = document.getElementById('block-list') as HTMLDivElement;
  listContainer.innerHTML = '';

  for (const site of response.sites) {
    const row = document.createElement('div');
    row.className = 'block-item';

    const label = document.createElement('span');
    label.textContent = site;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.addEventListener('click', async () => {
      const updated = response.sites.filter((s: string) => s !== site);
      await chrome.runtime.sendMessage({
        action: 'SET_BLOCKED_SITES',
        sites: updated
      });
      loadBlockList();
    });

    row.appendChild(label);
    row.appendChild(removeBtn);
    listContainer.appendChild(row);
  }
}

const addInput = document.getElementById('add-site') as HTMLInputElement;
const addBtn = document.getElementById('add-site-btn') as HTMLButtonElement;

addBtn.addEventListener('click', async () => {
  const site = addInput.value.trim().toLowerCase();
  if (!site) return;

  const domain = site
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');

  const response = await chrome.runtime.sendMessage({
    action: 'GET_BLOCKED_SITES'
  });

  if (!response.sites.includes(domain)) {
    response.sites.push(domain);
    await chrome.runtime.sendMessage({
      action: 'SET_BLOCKED_SITES',
      sites: response.sites
    });
  }

  addInput.value = '';
  loadBlockList();
});

// Initialize and auto-refresh every 5 seconds
renderStats();
loadBlockList();
setInterval(renderStats, 5000);
```

The IndexedDB functions in the background script (Step 4) handle long-term storage:

```typescript
// IndexedDB helpers (in background.ts)

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('FocusModeDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sessions')) {
        const store = db.createObjectStore('sessions', {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function recordFocusSession(minutes: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('sessions', 'readwrite');
  tx.objectStore('sessions').add({
    date: new Date().toISOString().slice(0, 10),
    minutes,
    timestamp: Date.now()
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function getDailyStats(
  days: number
): Promise<Array<{ date: string; totalMinutes: number; sessions: number }>> {
  const db = await openDB();
  const tx = db.transaction('sessions', 'readonly');
  const index = tx.objectStore('sessions').index('date');

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  return new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.lowerBound(cutoffDate));

    request.onsuccess = () => {
      const records = request.result as Array<{
        date: string; minutes: number;
      }>;

      const byDate = new Map<string, { totalMinutes: number; sessions: number }>();
      for (const record of records) {
        const entry = byDate.get(record.date) || { totalMinutes: 0, sessions: 0 };
        entry.totalMinutes += record.minutes;
        entry.sessions += 1;
        byDate.set(record.date, entry);
      }

      const stats = Array.from(byDate.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      db.close();
      resolve(stats);
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
```

---

## Testing

1. Load unpacked from `chrome://extensions` with Developer Mode on
2. Click the extension icon -- verify popup shows the timer at 25:00
3. Click "Start Focus" -- verify countdown begins, badge shows remaining minutes in red
4. Navigate to a blocked site (e.g., reddit.com) -- verify redirect to `blocked.html`
5. Wait for the timer to expire (set focus to 1 min for testing) -- verify notification appears
6. Click "Start Break" in the notification -- verify break timer starts, badge turns green, sites unblocked
7. Open the side panel (right-click icon or via Chrome menu) -- verify stats and block list
8. Add/remove sites from the block list in the side panel
9. Close and reopen Chrome -- verify timer recovers from service worker restart

## What You Learned
- Blocking sites with `chrome.declarativeNetRequest` dynamic rules
- Timer management with `chrome.alarms` that survives service worker restarts
- Badge countdown with `chrome.action.setBadgeText` and periodic alarms
- Side panel for persistent UI alongside web pages (cross-ref: `docs/patterns/side-panel.md`)
- Desktop notifications with action buttons (cross-ref: `docs/patterns/notification-patterns.md`)
- Configurable settings with `@theluckystrike/webext-storage` and `defineSchema`
- Long-term data tracking with IndexedDB in the service worker
