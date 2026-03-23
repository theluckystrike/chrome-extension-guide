---
layout: default
title: "Chrome Extension Dev Dashboard — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-dev-dashboard/"
---
# Build a Developer Productivity Dashboard Extension -- Full Tutorial

## What We're Building {#what-were-building}

A new-tab override extension that replaces Chrome's default new tab page with a developer-focused productivity dashboard featuring:

- GitHub contribution heatmap widget (fetched via public API)
- Hacker News top stories feed
- Pomodoro timer backed by `chrome.alarms`
- Quick links manager persisted with `chrome.storage`
- Dark theme using CSS custom properties

## Prerequisites {#prerequisites}

- Chrome 116+ with Manifest V3 support
- Node.js 18+ and npm
- A GitHub username (for the contribution widget)
- Basic TypeScript and Chrome extension knowledge (cross-ref: `docs/guides/extension-architecture.md`)

## Step 1: Project Setup with Vite + TypeScript {#step-1-project-setup-with-vite-typescript}

```bash
mkdir dev-dashboard && cd dev-dashboard
npm init -y
npm install -D vite typescript @types/chrome
mkdir -p src/widgets src/styles public
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["chrome"]
  },
  "include": ["src"]
}
```

`vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, 'newtab.html'),
        background: resolve(__dirname, 'src/background.ts'),
      },
      output: { entryFileNames: '[name].js' },
    },
  },
});
```

Add to `package.json` scripts: `"dev": "vite build --watch"` and `"build": "vite build"`.

## Step 2: Manifest V3 with chrome_url_overrides {#step-2-manifest-v3-with-chrome-url-overrides}

`public/manifest.json` -- the `chrome_url_overrides` key tells Chrome to load our page on every new tab:

```json
{
  "manifest_version": 3,
  "name": "Dev Dashboard",
  "version": "1.0.0",
  "description": "Developer productivity dashboard for your new tab page",
  "permissions": ["storage", "alarms", "notifications"],
  "chrome_url_overrides": { "newtab": "newtab.html" },
  "background": { "service_worker": "background.js" },
  "icons": { "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
}
```

`newtab.html` at the project root (Vite input):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dev Dashboard</title>
  <link rel="stylesheet" href="/src/styles/dashboard.css" />
</head>
<body>
  <div id="app">
    <header class="dashboard-header">
      <h1>Dev Dashboard</h1>
      <span id="clock" class="clock"></span>
    </header>
    <div class="dashboard-grid">
      <section id="github-widget" class="widget">
        <h2>GitHub Contributions</h2>
        <div id="heatmap" class="heatmap-container"></div>
      </section>
      <section id="hn-widget" class="widget">
        <h2>Hacker News</h2>
        <ul id="hn-stories" class="story-list"></ul>
      </section>
      <section id="pomodoro-widget" class="widget">
        <h2>Pomodoro Timer</h2>
        <div id="pomodoro" class="pomodoro-container"></div>
      </section>
      <section id="links-widget" class="widget">
        <h2>Quick Links</h2>
        <div id="quick-links" class="links-container"></div>
      </section>
    </div>
  </div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

`src/background.ts` -- the service worker handles Pomodoro alarm events:

```typescript
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pomodoro-timer') {
    chrome.notifications.create('pomodoro-done', {
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Pomodoro Complete',
      message: 'Time for a break! You completed a focus session.',
    });
  }
});
```

## Step 3: GitHub Contribution Heatmap Widget {#step-3-github-contribution-heatmap-widget}

`src/widgets/github.ts` fetches contribution data and renders a heatmap grid:

```typescript
interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

async function fetchContributions(username: string): Promise<ContributionDay[]> {
  const res = await fetch(
    `https://github-contributions-api.jogruber.de/v4/${username}?y=last`
  );
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const data = await res.json();
  return data.contributions.map((d: any) => ({
    date: d.date,
    count: d.count,
    level: Math.min(d.level, 4) as ContributionDay['level'],
  }));
}

function renderHeatmap(container: HTMLElement, days: ContributionDay[]): void {
  container.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'heatmap-grid';

  // Last 52 weeks arranged in columns of 7 (Sun-Sat)
  days.slice(-364).forEach((day) => {
    const cell = document.createElement('div');
    cell.className = `heatmap-cell level-${day.level}`;
    cell.title = `${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`;
    grid.appendChild(cell);
  });
  container.appendChild(grid);

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const summary = document.createElement('p');
  summary.className = 'heatmap-summary';
  summary.textContent = `${total.toLocaleString()} contributions in the last year`;
  container.appendChild(summary);
}

export async function initGitHubWidget(username: string, container: HTMLElement): Promise<void> {
  container.innerHTML = '<p class="widget-loading">Loading contributions...</p>';
  try {
    const days = await fetchContributions(username);
    renderHeatmap(container, days);
  } catch {
    container.innerHTML = `<p class="widget-error">Could not load contributions for ${username}</p>`;
    const retry = document.createElement('button');
    retry.textContent = 'Retry';
    retry.addEventListener('click', () => initGitHubWidget(username, container));
    container.appendChild(retry);
  }
}
```

## Step 4: Hacker News Top Stories Widget {#step-4-hacker-news-top-stories-widget}

`src/widgets/hackernews.ts` fetches the top 10 stories from the official HN Firebase API:

```typescript
interface HNStory {
  id: number; title: string; url?: string;
  score: number; by: string; time: number; descendants: number;
}

async function fetchTopStories(count = 10): Promise<HNStory[]> {
  const ids: number[] = await (
    await fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
  ).json();
  return Promise.all(
    ids.slice(0, count).map(async (id) => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      return res.json() as Promise<HNStory>;
    })
  );
}

function timeAgo(ts: number): string {
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function renderStories(container: HTMLElement, stories: HNStory[]): void {
  container.innerHTML = '';
  stories.forEach((story, i) => {
    const li = document.createElement('li');
    li.className = 'hn-story';

    const domain = story.url ? new URL(story.url).hostname.replace('www.', '') : '';
    li.innerHTML = `
      <span class="hn-rank">${i + 1}.</span>
      <a href="${story.url || `https://news.ycombinator.com/item?id=${story.id}`}"
         target="_blank" rel="noopener noreferrer" class="hn-title">${story.title}</a>
      <span class="hn-meta">
        ${story.score} pts | by ${story.by} | ${timeAgo(story.time)}
        ${domain ? `| (${domain})` : ''} | ${story.descendants || 0} comments
      </span>`;
    container.appendChild(li);
  });
}

export async function initHNWidget(container: HTMLElement): Promise<void> {
  container.innerHTML = '<p class="widget-loading">Loading stories...</p>';
  try {
    renderStories(container, await fetchTopStories());
  } catch {
    container.innerHTML = '<p class="widget-error">Could not load Hacker News stories</p>';
  }
}
```

## Step 5: Pomodoro Timer with chrome.alarms {#step-5-pomodoro-timer-with-chromealarms}

`src/widgets/pomodoro.ts` -- timer state persists via `chrome.storage.local`, and `chrome.alarms` fires even if the tab is closed:

```typescript
interface PomodoroState {
  endTime: number | null;
  duration: number;
  isRunning: boolean;
}

const STORAGE_KEY = 'pomodoro_state';
const ALARM_NAME = 'pomodoro-timer';
const PRESETS = [
  { label: '25 min', minutes: 25 },
  { label: '15 min', minutes: 15 },
  { label: '5 min', minutes: 5 },
];

async function getState(): Promise<PomodoroState> {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  return r[STORAGE_KEY] || { endTime: null, duration: 25, isRunning: false };
}

async function saveState(s: PomodoroState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: s });
}

function fmt(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function startCountdown(display: HTMLElement, startBtn: HTMLButtonElement, stopBtn: HTMLButtonElement) {
  startBtn.disabled = true;
  stopBtn.disabled = false;

  const tick = async () => {
    const state = await getState();
    if (!state.isRunning || !state.endTime) return;
    const remaining = Math.max(0, state.endTime - Date.now());
    display.textContent = fmt(Math.ceil(remaining / 1000));
    if (remaining <= 0) {
      display.textContent = '00:00';
      display.classList.add('pomodoro-done');
      await saveState({ ...state, isRunning: false, endTime: null });
      startBtn.disabled = false;
      stopBtn.disabled = true;
      setTimeout(() => display.classList.remove('pomodoro-done'), 3000);
      return;
    }
    requestAnimationFrame(() => setTimeout(tick, 250));
  };
  tick();
}

export async function initPomodoroWidget(container: HTMLElement): Promise<void> {
  container.innerHTML = '';

  const display = document.createElement('div');
  display.className = 'pomodoro-display';

  // Preset buttons
  const presetsDiv = document.createElement('div');
  presetsDiv.className = 'pomodoro-presets';
  PRESETS.forEach(({ label, minutes }) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = label;
    btn.addEventListener('click', async () => {
      const s = await getState();
      s.duration = minutes;
      if (!s.isRunning) display.textContent = fmt(minutes * 60);
      await saveState(s);
    });
    presetsDiv.appendChild(btn);
  });

  const startBtn = document.createElement('button');
  startBtn.className = 'pomodoro-btn start';
  startBtn.textContent = 'Start';

  const stopBtn = document.createElement('button');
  stopBtn.className = 'pomodoro-btn stop';
  stopBtn.textContent = 'Stop';

  startBtn.addEventListener('click', async () => {
    const s = await getState();
    s.endTime = Date.now() + s.duration * 60_000;
    s.isRunning = true;
    await saveState(s);
    await chrome.alarms.create(ALARM_NAME, { when: s.endTime });
    startCountdown(display, startBtn, stopBtn);
  });

  stopBtn.addEventListener('click', async () => {
    await chrome.alarms.clear(ALARM_NAME);
    const s = await getState();
    await saveState({ ...s, endTime: null, isRunning: false });
    display.textContent = fmt(s.duration * 60);
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });

  const controls = document.createElement('div');
  controls.className = 'pomodoro-controls';
  controls.append(startBtn, stopBtn);
  container.append(display, presetsDiv, controls);

  // Restore running timer
  const state = await getState();
  if (state.isRunning && state.endTime && state.endTime > Date.now()) {
    display.textContent = fmt(Math.ceil((state.endTime - Date.now()) / 1000));
    startCountdown(display, startBtn, stopBtn);
  } else {
    if (state.isRunning) await saveState({ ...state, isRunning: false, endTime: null });
    display.textContent = fmt(state.duration * 60);
    stopBtn.disabled = true;
  }
}
```

## Step 6: Quick Links Manager with chrome.storage {#step-6-quick-links-manager-with-chromestorage}

`src/widgets/quicklinks.ts` -- links persist via `chrome.storage.sync` so they roam with the user's profile:

```typescript
interface QuickLink { id: string; title: string; url: string; favicon: string }

const LINKS_KEY = 'quick_links';
const getLinks = async (): Promise<QuickLink[]> =>
  ((await chrome.storage.sync.get(LINKS_KEY))[LINKS_KEY] || []);
const saveLinks = (links: QuickLink[]) =>
  chrome.storage.sync.set({ [LINKS_KEY]: links });

function renderLinks(container: HTMLElement, links: QuickLink[], onDelete: (id: string) => void) {
  let grid = container.querySelector<HTMLElement>('.links-grid');
  if (!grid) { grid = document.createElement('div'); grid.className = 'links-grid'; container.appendChild(grid); }
  grid.innerHTML = '';

  links.forEach((link) => {
    const card = document.createElement('a');
    card.href = link.url;
    card.className = 'link-card';
    card.title = link.url;

    const img = document.createElement('img');
    img.src = link.favicon;
    img.width = 24; img.height = 24;
    img.onerror = () => { img.style.display = 'none'; };

    const title = document.createElement('span');
    title.className = 'link-title';
    title.textContent = link.title;

    const del = document.createElement('button');
    del.className = 'link-delete';
    del.textContent = '\u00d7';
    del.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onDelete(link.id); });

    card.append(img, title, del);
    grid!.appendChild(card);
  });
}

export async function initQuickLinksWidget(container: HTMLElement): Promise<void> {
  container.innerHTML = '';

  const form = document.createElement('form');
  form.className = 'add-link-form';
  form.innerHTML = `
    <input type="text" placeholder="Title" required />
    <input type="url" placeholder="https://..." required />
    <button type="submit">Add</button>`;

  const handleDelete = async (id: string) => {
    const links = (await getLinks()).filter((l) => l.id !== id);
    await saveLinks(links);
    renderLinks(container, links, handleDelete);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = form.querySelectorAll('input');
    const [titleVal, urlVal] = [inputs[0].value.trim(), inputs[1].value.trim()];
    const links = await getLinks();
    const domain = new URL(urlVal).hostname;
    links.push({
      id: crypto.randomUUID(),
      title: titleVal,
      url: urlVal,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    });
    await saveLinks(links);
    renderLinks(container, links, handleDelete);
    inputs[0].value = ''; inputs[1].value = '';
  });

  container.appendChild(form);
  renderLinks(container, await getLinks(), handleDelete);
}
```

## Step 7: Dark Theme with CSS Custom Properties {#step-7-dark-theme-with-css-custom-properties}

`src/styles/dashboard.css` -- all colors use custom properties so switching themes is a single class toggle:

```css
:root {
  --bg-primary: #0d1117;   --bg-secondary: #161b22;  --bg-tertiary: #21262d;
  --text-primary: #e6edf3; --text-secondary: #8b949e; --border-color: #30363d;
  --accent: #58a6ff;        --danger: #f85149;         --success: #3fb950;
  --heatmap-0: #161b22; --heatmap-1: #0e4429;
  --heatmap-2: #006d32; --heatmap-3: #26a641; --heatmap-4: #39d353;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg-primary); color: var(--text-primary); font-family: var(--font-sans); min-height: 100vh; }
#app { max-width: 1200px; margin: 0 auto; padding: 2rem; }

.dashboard-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);
}
.dashboard-header h1 { font-size: 1.5rem; }
.clock { font-family: var(--font-mono); font-size: 1.25rem; color: var(--text-secondary); }

.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.widget {
  background: var(--bg-secondary); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 1.25rem;
}
.widget h2 {
  font-size: 1rem; margin-bottom: 1rem; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.widget-loading { color: var(--text-secondary); font-style: italic; }
.widget-error { color: var(--danger); }

/* Heatmap */
.heatmap-grid {
  display: grid; grid-template-rows: repeat(7, 1fr);
  grid-auto-flow: column; gap: 3px;
}
.heatmap-cell { width: 12px; height: 12px; border-radius: 2px; }
.heatmap-cell.level-0 { background: var(--heatmap-0); }
.heatmap-cell.level-1 { background: var(--heatmap-1); }
.heatmap-cell.level-2 { background: var(--heatmap-2); }
.heatmap-cell.level-3 { background: var(--heatmap-3); }
.heatmap-cell.level-4 { background: var(--heatmap-4); }
.heatmap-summary { margin-top: 0.75rem; font-size: 0.85rem; color: var(--text-secondary); }

/* Hacker News */
.story-list { list-style: none; max-height: 400px; overflow-y: auto; }
.hn-story {
  padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem;
}
.hn-story:last-child { border-bottom: none; }
.hn-rank { color: var(--text-secondary); font-size: 0.85rem; min-width: 1.5rem; }
.hn-title { color: var(--text-primary); text-decoration: none; font-size: 0.95rem; flex: 1; }
.hn-title:hover { color: var(--accent); }
.hn-meta { width: 100%; font-size: 0.75rem; color: var(--text-secondary); padding-left: 2rem; }

/* Pomodoro */
.pomodoro-display {
  font-family: var(--font-mono); font-size: 3rem; text-align: center;
  padding: 1rem 0; transition: color 0.3s;
}
.pomodoro-display.pomodoro-done { color: var(--success); }
.pomodoro-presets { display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 1rem; }
.preset-btn {
  background: var(--bg-tertiary); border: 1px solid var(--border-color);
  color: var(--text-secondary); padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer;
}
.preset-btn:hover { color: var(--text-primary); border-color: var(--accent); }
.pomodoro-controls { display: flex; justify-content: center; gap: 0.75rem; }
.pomodoro-btn { padding: 0.5rem 1.5rem; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; }
.pomodoro-btn.start { background: var(--success); color: #fff; }
.pomodoro-btn.stop { background: var(--danger); color: #fff; }
.pomodoro-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Quick Links */
.add-link-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.add-link-form input {
  flex: 1; padding: 0.4rem 0.6rem; border: 1px solid var(--border-color);
  border-radius: 4px; background: var(--bg-tertiary); color: var(--text-primary);
}
.add-link-form input:focus { outline: none; border-color: var(--accent); }
.add-link-form button {
  padding: 0.4rem 1rem; background: var(--accent); color: #fff;
  border: none; border-radius: 4px; cursor: pointer; font-weight: 600;
}
.links-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }
.link-card {
  display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.75rem;
  background: var(--bg-tertiary); border: 1px solid var(--border-color);
  border-radius: 6px; text-decoration: none; color: var(--text-primary); position: relative;
}
.link-card:hover { border-color: var(--accent); }
.link-title { font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.link-delete {
  position: absolute; top: -6px; right: -6px; width: 18px; height: 18px;
  border-radius: 50%; border: none; background: var(--danger); color: #fff;
  font-size: 0.7rem; cursor: pointer; display: none; align-items: center; justify-content: center;
}
.link-card:hover .link-delete { display: flex; }
```

## Step 8: Wire It Up, Build, and Test {#step-8-wire-it-up-build-and-test}

`src/main.ts` initializes all widgets and the clock:

```typescript
import { initGitHubWidget } from './widgets/github';
import { initHNWidget } from './widgets/hackernews';
import { initPomodoroWidget } from './widgets/pomodoro';
import { initQuickLinksWidget } from './widgets/quicklinks';

function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}
updateClock();
setInterval(updateClock, 1000);

async function getGitHubUsername(): Promise<string> {
  const r = await chrome.storage.sync.get('github_username');
  if (r.github_username) return r.github_username;
  const username = prompt('Enter your GitHub username for the contributions widget:');
  if (username) { await chrome.storage.sync.set({ github_username: username.trim() }); return username.trim(); }
  return '';
}

async function init() {
  const heatmap = document.getElementById('heatmap');
  const hn = document.getElementById('hn-stories');
  const pomo = document.getElementById('pomodoro');
  const links = document.getElementById('quick-links');

  if (heatmap) {
    const user = await getGitHubUsername();
    if (user) initGitHubWidget(user, heatmap);
    else heatmap.innerHTML = '<p class="widget-error">No GitHub username set</p>';
  }
  if (hn) initHNWidget(hn);
  if (pomo) initPomodoroWidget(pomo);
  if (links) initQuickLinksWidget(links);
}

init();
```

Build and load:

```bash
npm run build
```

1. Open `chrome://extensions/` and enable Developer mode
2. Click "Load unpacked" and select the `dist/` folder
3. Open a new tab -- the Dev Dashboard appears

### Testing Checklist {#testing-checklist}

- **New tab override**: Opening a new tab shows the dashboard instead of Chrome's default page
- **Clock**: Updates every second in the header
- **GitHub widget**: Heatmap renders for the entered username; hover cells to see dates and counts
- **Hacker News**: 10 stories listed with scores and metadata; links open in new tabs
- **Pomodoro**: Start/stop and presets work; closing and reopening the tab preserves a running timer; alarm notification fires when time expires
- **Quick links**: Add links via the form; click to open; hover to reveal delete; links persist across sessions via `chrome.storage.sync`
- **DevTools**: Open the console on the new tab page for debug output; check `chrome://extensions/` for service worker errors

## Summary {#summary}

This tutorial built a complete new-tab override extension with four independent widgets, persistent state via `chrome.storage`, background alarms via `chrome.alarms`, and a dark theme using CSS custom properties. Each widget is a standalone module in `src/widgets/`, making it straightforward to add new widgets or swap out data sources.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
