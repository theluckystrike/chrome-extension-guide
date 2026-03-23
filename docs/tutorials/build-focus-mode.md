---
layout: default
title: "Chrome Extension Focus Mode. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-focus-mode/"
---
# Build a Site Blocker / Focus Mode Extension

Build a Chrome extension that blocks distracting sites during focus sessions, runs a Pomodoro timer, tracks daily statistics, and supports scheduled auto-activation. Uses @theluckystrike/webext-storage for persistent data and @theluckystrike/webext-messaging for popup-to-background communication.

Prerequisites {#prerequisites}

- Chrome 116+ with Developer Mode enabled
- Node.js 18+ and npm
- Familiarity with Chrome extension basics (manifest, service workers)

---

Step 1: Manifest and Project Setup {#step-1-manifest-and-project-setup}

```bash
mkdir focus-mode-ext && cd focus-mode-ext
npm init -y
npm install @theluckystrike/webext-storage @theluckystrike/webext-messaging
```

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Focus Mode",
  "version": "1.0.0",
  "description": "Block distracting sites, run Pomodoro timers, and stay focused.",
  "permissions": ["storage", "declarativeNetRequest", "alarms", "tabs", "activeTab"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "background": { "service_worker": "background.js" },
  "options_ui": { "page": "options/options.html", "open_in_tab": false },
  "declarative_net_request": {
    "rule_resources": [{ "id": "focus_rules", "enabled": false, "path": "rules/block_rules.json" }]
  },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
}
```

`declarativeNetRequest` blocks sites at the network level without per-domain host permissions. `alarms` powers the Pomodoro timer and schedule checks. Create `rules/block_rules.json` with `[]` (rules are added dynamically).

---

Step 2: Popup UI with Blocklist Management {#step-2-popup-ui-with-blocklist-management}

Create `popup/popup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><link rel="stylesheet" href="popup.css"></head>
<body>
  <div class="container">
    <h1>Focus Mode</h1>
    <div class="status" id="status-section">
      <span id="status-text">Off</span>
      <span id="timer-display">--:--</span>
    </div>
    <button id="toggle-btn">Start Focus</button>
    <div class="pomodoro-controls">
      <label>Work: <input type="number" id="work-mins" value="25" min="1" max="120"> min</label>
      <label>Break: <input type="number" id="break-mins" value="5" min="1" max="30"> min</label>
    </div>
    <hr>
    <h2>Blocked Sites</h2>
    <div class="add-site">
      <input type="text" id="site-input" placeholder="example.com">
      <button id="add-btn">Add</button>
    </div>
    <ul id="blocklist"></ul>
    <hr>
    <div class="stats">
      <h2>Today</h2>
      <p>Focus time: <span id="stat-time">0</span> min</p>
      <p>Sites blocked: <span id="stat-blocks">0</span></p>
    </div>
    <button id="break-btn" disabled>Take 5-min Break</button>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

Create `popup/popup.css`:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 320px; font-family: system-ui, sans-serif; background: #0d1117; color: #c9d1d9; padding: 16px; }
h1 { font-size: 16px; text-align: center; color: #58a6ff; margin-bottom: 8px; }
h2 { font-size: 13px; color: #8b949e; margin-bottom: 6px; }
hr { border: none; border-top: 1px solid #21262d; margin: 12px 0; }
.status { display: flex; justify-content: space-between; padding: 8px 12px; background: #161b22; border-radius: 6px; margin-bottom: 10px; }
#status-text { font-weight: 600; }
#status-text.active { color: #3fb950; }
#timer-display { font-family: monospace; font-size: 18px; color: #58a6ff; }
#toggle-btn { width: 100%; padding: 10px; border: none; border-radius: 6px; background: #238636; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
#toggle-btn.stop { background: #da3633; }
.pomodoro-controls { display: flex; gap: 12px; margin-top: 8px; }
.pomodoro-controls label { font-size: 12px; color: #8b949e; }
.pomodoro-controls input { width: 48px; padding: 2px 4px; background: #161b22; border: 1px solid #30363d; color: #c9d1d9; border-radius: 4px; }
.add-site { display: flex; gap: 6px; margin-bottom: 8px; }
#site-input { flex: 1; padding: 6px 8px; border: 1px solid #30363d; border-radius: 4px; background: #161b22; color: #c9d1d9; }
#add-btn { padding: 6px 12px; border: none; border-radius: 4px; background: #238636; color: #fff; cursor: pointer; }
#blocklist { list-style: none; max-height: 120px; overflow-y: auto; }
#blocklist li { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; border-bottom: 1px solid #21262d; }
#blocklist li button { background: none; border: none; color: #da3633; cursor: pointer; }
.stats p { font-size: 13px; margin-bottom: 4px; }
.stats span { color: #58a6ff; font-weight: 600; }
#break-btn { width: 100%; margin-top: 10px; padding: 8px; border: 1px solid #30363d; border-radius: 6px; background: #161b22; color: #c9d1d9; cursor: pointer; }
#break-btn:disabled { opacity: 0.4; cursor: default; }
```

---

Step 3: Focus Mode Toggle and Popup Logic {#step-3-focus-mode-toggle-and-popup-logic}

Create `popup/popup.js`:

```javascript
import { createStorage } from '@theluckystrike/webext-storage';
import { sendMessage } from '@theluckystrike/webext-messaging';

const storage = createStorage('focus-mode', {
  blocklist: [], focusActive: false, pomodoroWork: 25, pomodoroBreak: 5,
  stats: { date: '', focusMinutes: 0, blocksCount: 0 },
  schedule: { enabled: false, startHour: 9, endHour: 17, days: [1,2,3,4,5] }
});
const $ = id => document.getElementById(id);
let timerInterval;

async function init() {
  const data = await storage.get();
  renderBlocklist(data.blocklist);
  $('work-mins').value = data.pomodoroWork;
  $('break-mins').value = data.pomodoroBreak;
  $('stat-time').textContent = data.stats.focusMinutes || 0;
  $('stat-blocks').textContent = data.stats.blocksCount || 0;
  updateFocusUI(data.focusActive);
  if (data.focusActive) startTimerDisplay();
}

function renderBlocklist(list) {
  const ul = $('blocklist');
  ul.innerHTML = '';
  for (const site of list) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${site}</span><button data-site="${site}">x</button>`;
    li.querySelector('button').addEventListener('click', () => removeSite(site));
    ul.appendChild(li);
  }
}

async function addSite() {
  const input = $('site-input');
  let site = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!site) return;
  const data = await storage.get();
  if (data.blocklist.includes(site)) return;
  data.blocklist.push(site);
  await storage.set({ blocklist: data.blocklist });
  await sendMessage('update-rules');
  renderBlocklist(data.blocklist);
  input.value = '';
}

async function removeSite(site) {
  const data = await storage.get();
  data.blocklist = data.blocklist.filter(s => s !== site);
  await storage.set({ blocklist: data.blocklist });
  await sendMessage('update-rules');
  renderBlocklist(data.blocklist);
}

async function toggleFocus() {
  const data = await storage.get();
  const active = !data.focusActive;
  await storage.set({ focusActive: active, pomodoroWork: +$('work-mins').value, pomodoroBreak: +$('break-mins').value });
  if (active) { await sendMessage('start-focus'); startTimerDisplay(); }
  else { await sendMessage('stop-focus'); clearInterval(timerInterval); $('timer-display').textContent = '--:--'; }
  updateFocusUI(active);
}

function updateFocusUI(active) {
  $('toggle-btn').textContent = active ? 'Stop Focus' : 'Start Focus';
  $('toggle-btn').className = active ? 'stop' : '';
  $('status-text').textContent = active ? 'Focusing' : 'Off';
  $('status-text').className = active ? 'active' : '';
  $('break-btn').disabled = !active;
}

function startTimerDisplay() {
  const update = async () => {
    const r = await sendMessage('get-timer');
    if (r?.remaining !== undefined) {
      const m = Math.floor(r.remaining / 60), s = r.remaining % 60;
      $('timer-display').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      $('status-text').textContent = r.phase === 'work' ? 'Focusing' : 'Break';
    }
  };
  update();
  timerInterval = setInterval(update, 1000);
}

$('add-btn').addEventListener('click', addSite);
$('site-input').addEventListener('keydown', e => { if (e.key === 'Enter') addSite(); });
$('toggle-btn').addEventListener('click', toggleFocus);
$('break-btn').addEventListener('click', () => sendMessage('take-break'));
init();
```

The popup communicates with the background via `sendMessage`. The timer display polls every second. Site inputs are normalized by stripping protocols and paths.

---

Step 4: declarativeNetRequest Rules and Blocking {#step-4-declarativenetrequest-rules-and-blocking}

Create `background.js` -- this file handles rules, the Pomodoro timer, stats, schedule, and messaging:

```javascript
import { createStorage } from '@theluckystrike/webext-storage';
import { onMessage } from '@theluckystrike/webext-messaging';

const storage = createStorage('focus-mode', {
  blocklist: [], focusActive: false, pomodoroWork: 25, pomodoroBreak: 5,
  stats: { date: '', focusMinutes: 0, blocksCount: 0 },
  schedule: { enabled: false, startHour: 9, endHour: 17, days: [1,2,3,4,5] }
});

let currentPhase = 'work', phaseEndTime = null, breakTemporaryEnd = null;

async function updateBlockRules() {
  const data = await storage.get();
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(r => r.id);
  if (!data.focusActive || !data.blocklist.length || (breakTemporaryEnd && Date.now() < breakTemporaryEnd)) {
    return chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules: [] });
  }
  const rules = data.blocklist.map((site, i) => ({
    id: i + 1, priority: 1,
    action: { type: 'redirect', redirect: { extensionPath: '/blocked.html' } },
    condition: { urlFilter: `||${site}`, resourceTypes: ['main_frame'] }
  }));
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules: rules });
}

async function startFocus() {
  const data = await storage.get();
  currentPhase = 'work';
  phaseEndTime = Date.now() + data.pomodoroWork * 60000;
  breakTemporaryEnd = null;
  [chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization).create('pomodoro-tick', { periodInMinutes: 0.5 }); // Minimum alarm interval is 30 seconds
  [chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization).create('pomodoro-phase', { delayInMinutes: data.pomodoroWork });
  [chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization).create('stats-update', { periodInMinutes: 1 });
  await updateBlockRules();
  updateBadge();
}

async function stopFocus() {
  await storage.set({ focusActive: false });
  phaseEndTime = null; currentPhase = 'work'; breakTemporaryEnd = null;
  [chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization).clearAll();
  await updateBlockRules();
  chrome.action.setBadgeText({ text: '' });
}

async function handlePhaseEnd() {
  const data = await storage.get();
  if (currentPhase === 'work') {
    currentPhase = 'break';
    phaseEndTime = Date.now() + data.pomodoroBreak * 60000;
    [chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization).create('pomodoro-phase', { delayInMinutes: data.pomodoroBreak });
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existing.map(r => r.id), addRules: [] });
  } else {
    currentPhase = 'work';
    phaseEndTime = Date.now() + data.pomodoroWork * 60000;
    [chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization).create('pomodoro-phase', { delayInMinutes: data.pomodoroWork });
    await updateBlockRules();
  }
  updateBadge();
}

function updateBadge() {
  if (!phaseEndTime) { chrome.action.setBadgeText({ text: '' }); return; }
  const remaining = Math.max(0, Math.ceil((phaseEndTime - Date.now()) / 60000));
  chrome.action.setBadgeText({ text: `${remaining}m` });
  chrome.action.setBadgeBackgroundColor({ color: currentPhase === 'work' ? '#238636' : '#58a6ff' });
}

async function updateStats() {
  const data = await storage.get();
  const today = new Date().toISOString().slice(0, 10);
  const stats = data.stats.date === today ? data.stats : { date: today, focusMinutes: 0, blocksCount: 0 };
  if (currentPhase === 'work' && data.focusActive) stats.focusMinutes += 1;
  await storage.set({ stats });
}

async function incrementBlockCount() {
  const data = await storage.get();
  const today = new Date().toISOString().slice(0, 10);
  const stats = data.stats.date === today ? data.stats : { date: today, focusMinutes: 0, blocksCount: 0 };
  stats.blocksCount += 1; stats.date = today;
  await storage.set({ stats });
}

async function checkSchedule() {
  const data = await storage.get();
  if (!data.schedule.enabled) return;
  const now = new Date(), day = now.getDay(), hour = now.getHours();
  const inSchedule = data.schedule.days.includes(day) && hour >= data.schedule.startHour && hour < data.schedule.endHour;
  if (inSchedule && !data.focusActive) { await storage.set({ focusActive: true }); await startFocus(); }
  else if (!inSchedule && data.focusActive) { await stopFocus(); }
}

[chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization).onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'pomodoro-phase') await handlePhaseEnd();
  else if (alarm.name === 'pomodoro-tick') updateBadge();
  else if (alarm.name === 'stats-update') await updateStats();
  else if (alarm.name === 'break-end') { breakTemporaryEnd = null; await updateBlockRules(); }
  else if (alarm.name === 'schedule-check') await checkSchedule();
});

onMessage('update-rules', async () => { await updateBlockRules(); return { ok: true }; });
onMessage('start-focus', async () => { await startFocus(); return { ok: true }; });
onMessage('stop-focus', async () => { await stopFocus(); return { ok: true }; });
onMessage('get-timer', () => {
  if (!phaseEndTime) return { remaining: 0, phase: 'work' };
  return { remaining: Math.max(0, Math.round((phaseEndTime - Date.now()) / 1000)), phase: currentPhase };
});
onMessage('take-break', async () => {
  breakTemporaryEnd = Date.now() + 5 * 60000;
  await updateBlockRules();
  [chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization).create('break-end', { delayInMinutes: 5 });
  return { ok: true };
});

chrome.runtime.onInstalled.addListener(() => {
  [chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization).create('schedule-check', { periodInMinutes: 1 });
});

chrome.webNavigation?.onErrorOccurred?.addListener(async (details) => {
  if (details.frameId === 0) {
    const data = await storage.get();
    if (data.focusActive && data.blocklist.some(site => details.url.includes(site))) await incrementBlockCount();
  }
});
```

Each blocklist entry becomes a dynamic rule with `urlFilter: "||example.com"` targeting `main_frame` resources. The redirect sends users to the extension's `blocked.html` page.

> Important: For `declarativeNetRequest` redirects to extension pages, `blocked.html` must be listed in `web_accessible_resources` in your manifest. Add:
> ```json
> "web_accessible_resources": [{ "resources": ["blocked.html"], "matches": ["<all_urls>"] }]
> ```

---

Step 5: "Stay Focused" Blocked Page {#step-5-stay-focused-blocked-page}

Create `blocked.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><title>Stay Focused</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;
      background: #0d1117; color: #c9d1d9; font-family: system-ui, sans-serif; }
    h1 { font-size: 48px; color: #da3633; margin-bottom: 16px; }
    p { font-size: 18px; color: #8b949e; margin-bottom: 8px; }
    .timer { font-size: 32px; color: #58a6ff; font-family: monospace; margin-top: 24px; }
    .quote { font-style: italic; color: #6e7681; margin-top: 32px; max-width: 400px; text-align: center; }
  </style>
</head>
<body>
  <h1>Stay Focused</h1>
  <p>This site is blocked during your focus session.</p>
  <div class="timer" id="timer">--:--</div>
  <p class="quote" id="quote"></p>
  <script>
    const quotes = [
      'The secret of getting ahead is getting started. -- Mark Twain',
      'Focus on being productive instead of busy. -- Tim Ferriss',
      'Concentrate all your thoughts upon the work at hand. -- Alexander Graham Bell'
    ];
    document.getElementById('quote').textContent = quotes[Math.floor(Math.random() * quotes.length)];
    async function tick() {
      try {
        const r = await chrome.runtime.sendMessage({ type: 'get-timer' });
        if (r?.remaining) {
          const m = Math.floor(r.remaining / 60), s = r.remaining % 60;
          document.getElementById('timer').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} remaining`;
        }
      } catch {}
    }
    tick(); setInterval(tick, 1000);
  </script>
</body>
</html>
```

When `declarativeNetRequest` redirects a blocked URL, users see this page with remaining time and a motivational quote.

---

Step 6: Pomodoro Timer with Work/Break Cycles {#step-6-pomodoro-timer-with-workbreak-cycles}

The Pomodoro logic in `background.js` (Step 4) cycles through phases:

1. Start -- `phaseEndTime = now + workMinutes`, creates `pomodoro-phase` alarm.
2. Work ends -- `handlePhaseEnd()` switches to `'break'`, removes block rules, sets break alarm.
3. Break ends -- switches back to `'work'`, re-enables block rules, sets next work alarm.
4. Repeats until the user stops focus mode.

`[chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization)` is the correct MV3 timer mechanism. Service workers can be terminated at any time, making `setTimeout`/`setInterval` unreliable. The `pomodoro-tick` alarm keeps the badge current. The popup polls `get-timer` every second for its own display.

---

Step 7: Daily Usage Statistics {#step-7-daily-usage-statistics}

Two metrics are tracked per day:

- `focusMinutes` -- incremented every minute during work phases via the `stats-update` alarm.
- `blocksCount` -- incremented when a blocked domain is detected. Note: `declarativeNetRequest` redirects do not trigger `webNavigation.onErrorOccurred` (since it is a redirect, not a network error). For accurate block counting, use `chrome.declarativeNetRequest.onRuleMatchedDebug` (development only) or track redirects to `blocked.html` via `chrome.webNavigation.onCompleted` checking if the URL matches your blocked page.

The stats object auto-resets on date change by comparing `data.stats.date` to today's ISO date string. The popup reads and displays these values on init.

---

Step 8: Allowlist for Breaks {#step-8-allowlist-for-breaks}

The "Take 5-min Break" button calls `sendMessage('take-break')`. The background sets `breakTemporaryEnd` to 5 minutes ahead, clears all block rules, and schedules a `break-end` alarm. When it fires, rules are reinstated. This is independent of the Pomodoro cycle -- blocking lifts but the timer keeps running.

---

Step 9: Badge Showing Remaining Focus Time {#step-9-badge-showing-remaining-focus-time}

`updateBadge()` calculates remaining minutes from `phaseEndTime` and sets badge text (e.g., "23m"). The badge background is green during work phases and blue during breaks. It clears when focus mode stops. The `pomodoro-tick` alarm calls `updateBadge()` regularly.

---

Step 10: Options Page with Schedule {#step-10-options-page-with-schedule}

Create `options/options.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><link rel="stylesheet" href="options.css"></head>
<body>
  <div class="container">
    <h1>Focus Mode Settings</h1>
    <section>
      <h2>Pomodoro Defaults</h2>
      <label>Work: <input type="number" id="work-mins" min="1" max="120" value="25"> min</label>
      <label>Break: <input type="number" id="break-mins" min="1" max="30" value="5"> min</label>
    </section>
    <section>
      <h2>Auto-Schedule</h2>
      <label><input type="checkbox" id="schedule-enabled"> Enable automatic focus during work hours</label>
      <div class="schedule-row">
        <label>Start: <input type="number" id="start-hour" min="0" max="23" value="9">:00</label>
        <label>End: <input type="number" id="end-hour" min="0" max="23" value="17">:00</label>
      </div>
      <div class="days">
        <label><input type="checkbox" class="day-cb" value="1" checked> Mon</label>
        <label><input type="checkbox" class="day-cb" value="2" checked> Tue</label>
        <label><input type="checkbox" class="day-cb" value="3" checked> Wed</label>
        <label><input type="checkbox" class="day-cb" value="4" checked> Thu</label>
        <label><input type="checkbox" class="day-cb" value="5" checked> Fri</label>
        <label><input type="checkbox" class="day-cb" value="6"> Sat</label>
        <label><input type="checkbox" class="day-cb" value="0"> Sun</label>
      </div>
    </section>
    <div id="status"></div>
    <button id="save-btn">Save Settings</button>
  </div>
  <script src="options.js"></script>
</body>
</html>
```

Create `options/options.css`:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: #f5f5f5; color: #333; padding: 24px; max-width: 500px; }
h1 { font-size: 20px; margin-bottom: 16px; }
h2 { font-size: 15px; margin-bottom: 8px; color: #555; }
section { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
label { display: block; font-size: 14px; margin-bottom: 8px; }
input[type="number"] { width: 56px; padding: 4px; border: 1px solid #ccc; border-radius: 4px; }
.schedule-row { display: flex; gap: 16px; margin: 8px 0; }
.days { display: flex; flex-wrap: wrap; gap: 8px; }
.days label { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; }
#save-btn { padding: 10px 24px; border: none; border-radius: 4px; background: #0078d4; color: #fff; font-weight: 600; cursor: pointer; }
#status { font-size: 13px; color: #00aa44; margin-bottom: 8px; min-height: 20px; }
```

Create `options/options.js`:

```javascript
import { createStorage } from '@theluckystrike/webext-storage';

const storage = createStorage('focus-mode', {
  blocklist: [], focusActive: false, pomodoroWork: 25, pomodoroBreak: 5,
  stats: { date: '', focusMinutes: 0, blocksCount: 0 },
  schedule: { enabled: false, startHour: 9, endHour: 17, days: [1,2,3,4,5] }
});
const $ = id => document.getElementById(id);

async function load() {
  const data = await storage.get();
  $('work-mins').value = data.pomodoroWork;
  $('break-mins').value = data.pomodoroBreak;
  $('schedule-enabled').checked = data.schedule.enabled;
  $('start-hour').value = data.schedule.startHour;
  $('end-hour').value = data.schedule.endHour;
  document.querySelectorAll('.day-cb').forEach(cb => cb.checked = data.schedule.days.includes(+cb.value));
}

$('save-btn').addEventListener('click', async () => {
  const days = [...document.querySelectorAll('.day-cb:checked')].map(cb => +cb.value);
  await storage.set({
    pomodoroWork: +$('work-mins').value, pomodoroBreak: +$('break-mins').value,
    schedule: { enabled: $('schedule-enabled').checked, startHour: +$('start-hour').value, endHour: +$('end-hour').value, days }
  });
  $('status').textContent = 'Settings saved.';
  setTimeout(() => $('status').textContent = '', 2000);
});
load();
```

The `schedule-check` alarm runs every minute (registered in `onInstalled`). It compares the current day and hour against saved settings and auto-starts or stops focus mode.

---

Project Structure {#project-structure}

```
focus-mode-ext/
  manifest.json
  background.js
  blocked.html
  rules/block_rules.json
  popup/   (popup.html, popup.css, popup.js)
  options/ (options.html, options.css, options.js)
  icons/   (icon16.png, icon48.png, icon128.png)
```

Bundling {#bundling}

```bash
npm install -D rollup @rollup/plugin-node-resolve
```

```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
export default ['popup/popup.js', 'background.js', 'options/options.js'].map(input => ({
  input, output: { file: `dist/${input}`, format: 'iife' }, plugins: [resolve()]
}));
```

Run `npx rollup -c`, copy static assets to `dist/`, and load it.

Key Takeaways {#key-takeaways}

- `declarativeNetRequest` dynamic rules block sites at the network level without broad host permissions. Add/remove them at runtime based on focus state.
- `[chrome.alarms](https://bestchromeextensions.com/extension-monetization-playbook/monetization/api-monetization)` is the correct MV3 timer. Service workers can terminate at any time, making `setTimeout`/`setInterval` unreliable.
- Redirect to extension pages via `{ type: 'redirect', redirect: { extensionPath: '/blocked.html' } }`.
- `@theluckystrike/webext-messaging` replaces raw `chrome.runtime.sendMessage` with typed `sendMessage`/`onMessage` pairs.
- Badge text gives at-a-glance timer status without opening the popup.
- Auto-scheduling via a periodic alarm lets focus mode activate during configured work hours without user action.
-e 
---


---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers [freemium](https://bestchromeextensions.com/extension-monetization-playbook/monetization/freemium-model) models, [Stripe](https://bestchromeextensions.com/extension-monetization-playbook/monetization/stripe-integration) integration, [subscription](https://bestchromeextensions.com/extension-monetization-playbook/monetization/freemium-model) architecture, and growth strategies for Chrome extension developers.

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
