---
layout: default
title: "Chrome Extension GitHub PR Reviewer — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/tutorials/build-github-pr-reviewer/"
---
# Build a GitHub PR Review Extension

A Chrome extension that enhances GitHub pull request pages with a floating toolbar,
file tree navigator, comment templates, PR statistics, keyboard shortcuts, review
checklists, and notification badges.

Uses `@theluckystrike/webext-storage` for persistent data and
`@theluckystrike/webext-messaging` for component communication.

---

## Step 1: Manifest Targeting GitHub {#step-1-manifest-targeting-github}

```json
{
  "manifest_version": 3,
  "name": "PR Reviewer",
  "version": "1.0.0",
  "description": "Enhanced PR review tools for GitHub.",
  "permissions": ["storage", "alarms", "activeTab"],
  "host_permissions": ["https://github.com/*"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{
    "matches": ["https://github.com/*/pull/*"],
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png" },
    "default_title": "PR Reviewer"
  },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
}
```

Content scripts only load on `github.com/*/pull/*`. The `alarms` permission enables
periodic PR notification sync.

---

## Step 2: Detecting PR Pages {#step-2-detecting-pr-pages}

```js
// content.js
(function () {
  "use strict";

  const PR_PATTERN = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

  function getPRInfo() {
    const m = window.location.href.match(PR_PATTERN);
    return m ? { owner: m[1], repo: m[2], number: parseInt(m[3], 10) } : null;
  }

  const prInfo = getPRInfo();
  if (!prInfo) return;

  // @theluckystrike/webext-messaging
  chrome.runtime.sendMessage({ type: "PR_PAGE_LOADED", pr: prInfo }).catch(() => {});

  injectToolbar(prInfo);
  if (window.location.href.includes("/files")) injectFileTree();
  initKeyboardShortcuts();
```

`getPRInfo` extracts owner, repo, and PR number from the URL. Each feature
initializes only when the relevant page context is detected.

---

## Step 3: Floating Toolbar {#step-3-floating-toolbar}

A toolbar anchored at the bottom-right provides quick access to all panels:

```js
  function injectToolbar(prInfo) {
    const toolbar = document.createElement("div");
    toolbar.id = "pr-reviewer-toolbar";
    toolbar.innerHTML = `
      <div class="pr-toolbar-inner">
        <button id="prt-files" title="File Tree (Alt+F)">Files</button>
        <button id="prt-stats" title="Stats (Alt+S)">Stats</button>
        <button id="prt-checklist" title="Checklist (Alt+C)">Checklist</button>
        <button id="prt-templates" title="Templates (Alt+T)">Templates</button>
        <span class="prt-divider"></span>
        <span id="prt-label">${prInfo.owner}/${prInfo.repo}#${prInfo.number}</span>
        <button id="prt-collapse">_</button>
      </div>`;
    document.body.appendChild(toolbar);

    document.getElementById("prt-files").addEventListener("click", toggleFileTree);
    document.getElementById("prt-stats").addEventListener("click", toggleStatsPanel);
    document.getElementById("prt-checklist").addEventListener("click", toggleChecklist);
    document.getElementById("prt-templates").addEventListener("click", toggleTemplates);
    document.getElementById("prt-collapse").addEventListener("click", () => {
      toolbar.classList.toggle("collapsed");
    });
  }
```

In `content.css`, the toolbar uses `position: fixed; bottom: 16px; right: 16px;`
with a dark theme (`background: #24292f`) matching GitHub's color scheme. Buttons
use `#30363d` background with `#e6edf3` text. When collapsed, all children except
the collapse button are hidden via CSS.

---

## Step 4: File Tree Navigator {#step-4-file-tree-navigator}

A collapsible sidebar listing all changed files, extracted from GitHub's diff headers:

```js
  let fileTreeVisible = false;

  function toggleFileTree() {
    const el = document.getElementById("pr-file-tree");
    if (el) { el.remove(); fileTreeVisible = false; return; }
    injectFileTree();
  }

  function injectFileTree() {
    const headers = document.querySelectorAll('[data-tagsearch-path]');
    if (headers.length === 0) return;

    const panel = document.createElement("div");
    panel.id = "pr-file-tree";
    panel.innerHTML = `<div class="prt-panel-header">
      <strong>Changed Files (${headers.length})</strong>
      <button id="prt-close-files">X</button>
    </div><ul class="prt-file-list"></ul>`;

    const list = panel.querySelector(".prt-file-list");

    headers.forEach(header => {
      const path = header.getAttribute("data-tagsearch-path");
      const container = header.closest('[id^="diff-"]');
      const addText = container?.querySelector(".diffstat .text-green")?.textContent?.trim() || "";
      const delText = container?.querySelector(".diffstat .text-red")?.textContent?.trim() || "";

      const item = document.createElement("li");
      item.className = "prt-file";
      item.innerHTML = `<span>${path}</span>
        <span class="prt-file-stats">
          <span class="add">${addText}</span> <span class="del">${delText}</span>
        </span>`;
      item.addEventListener("click", () => {
        container?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      list.appendChild(item);
    });

    document.body.appendChild(panel);
    fileTreeVisible = true;
    document.getElementById("prt-close-files").addEventListener("click", () => {
      panel.remove(); fileTreeVisible = false;
    });
  }
```

The file tree panel uses `position: fixed; top: 60px; left: 0; width: 280px` with
dark background. Clicking a file scrolls the diff into view. Addition counts render
in green (`#3fb950`), deletions in red (`#f85149`).

---

## Step 5: Inline Comment Templates {#step-5-inline-comment-templates}

Pre-built templates insert text into GitHub's comment textarea:

```js
  function toggleTemplates() {
    const el = document.getElementById("pr-templates-panel");
    if (el) { el.remove(); return; }

    const templates = [
      { label: "LGTM", text: "LGTM! Looks good to merge. :thumbsup:" },
      { label: "Request Changes", text: "Concerns to address before merging:\n\n- [ ] \n- [ ] " },
      { label: "Suggestion", text: "Suggestion (non-blocking):\n\n```suggestion\n\n```" },
      { label: "Nitpick", text: "Nit: " },
      { label: "Question", text: "Question: Could you explain the reasoning behind this?" },
      { label: "Security", text: "**Security concern:** This may introduce a vulnerability.\n\nDetails: " }
    ];

    const panel = document.createElement("div");
    panel.id = "pr-templates-panel";
    panel.className = "prt-floating-panel";
    panel.innerHTML = `<div class="prt-panel-header">
      <strong>Comment Templates</strong>
      <button id="prt-close-tpl">X</button>
    </div><div class="prt-template-list">${templates.map(t =>
      `<button class="prt-template-item" data-text="${t.text.replace(/"/g, '&quot;')}">${t.label}</button>`
    ).join("")}</div>`;

    document.body.appendChild(panel);
    document.getElementById("prt-close-tpl").addEventListener("click", () => panel.remove());
    panel.querySelector(".prt-template-list").addEventListener("click", (e) => {
      const text = e.target.dataset?.text;
      if (!text) return;
      const box = document.querySelector('textarea[name="comment[body]"]') ||
        document.querySelector('textarea.js-comment-field');
      if (box) {
        box.value += text;
        box.dispatchEvent(new Event("input", { bubbles: true }));
        box.focus();
      }
    });
  }
```

---

## Step 6: PR Statistics Panel {#step-6-pr-statistics-panel}

Displays additions, deletions, files changed, file type breakdown, and estimated
review time (heuristic: ~200 lines/hour for careful review):

```js
  function toggleStatsPanel() {
    const el = document.getElementById("pr-stats-panel");
    if (el) { el.remove(); return; }

    const headers = document.querySelectorAll('[data-tagsearch-path]');
    let additions = 0, deletions = 0;
    const byExt = {};

    headers.forEach(h => {
      const path = h.getAttribute("data-tagsearch-path");
      const ext = path.includes(".") ? "." + path.split(".").pop() : "(none)";
      byExt[ext] = (byExt[ext] || 0) + 1;
      const c = h.closest('[id^="diff-"]');
      additions += parseInt(c?.querySelector(".diffstat .text-green")?.textContent || "0", 10);
      deletions += parseInt(c?.querySelector(".diffstat .text-red")?.textContent || "0", 10);
    });

    const minutes = Math.max(1, Math.round((additions + deletions) / 200 * 60));
    const extRows = Object.entries(byExt)
      .map(([e, n]) => `<div class="prt-ext-row"><span>${e}</span><span>${n}</span></div>`).join("");

    const panel = document.createElement("div");
    panel.id = "pr-stats-panel";
    panel.className = "prt-floating-panel";
    panel.innerHTML = `
      <div class="prt-panel-header"><strong>PR Statistics</strong>
        <button id="prt-close-stats">X</button></div>
      <div class="prt-stats-grid">
        <div class="prt-stat"><span class="val add">+${additions}</span><span class="lbl">Additions</span></div>
        <div class="prt-stat"><span class="val del">-${deletions}</span><span class="lbl">Deletions</span></div>
        <div class="prt-stat"><span class="val">${headers.length}</span><span class="lbl">Files</span></div>
        <div class="prt-stat"><span class="val">${minutes}m</span><span class="lbl">Est. Review</span></div>
      </div>
      <div class="prt-breakdown"><strong>By type:</strong>${extRows}</div>`;
    document.body.appendChild(panel);
    document.getElementById("prt-close-stats").addEventListener("click", () => panel.remove());
  }
```

The stats grid uses `display: grid; grid-template-columns: 1fr 1fr` with centered
stat values. Additions are green, deletions are red.

---

## Step 7: Keyboard Shortcuts {#step-7-keyboard-shortcuts}

Navigate between files and toggle panels without the mouse:

```js
  function initKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName) || e.target.isContentEditable) return;

      if (e.altKey && e.key === "f") { e.preventDefault(); toggleFileTree(); return; }
      if (e.altKey && e.key === "s") { e.preventDefault(); toggleStatsPanel(); return; }
      if (e.altKey && e.key === "c") { e.preventDefault(); toggleChecklist(); return; }
      if (e.altKey && e.key === "t") { e.preventDefault(); toggleTemplates(); return; }
      if (e.key === "n") { navigateFile(1); return; }
      if (e.key === "p") { navigateFile(-1); return; }
      if (e.key === "e") { toggleExpandAll(); }
    });
  }

  function navigateFile(dir) {
    const files = Array.from(document.querySelectorAll('[id^="diff-"]'));
    if (!files.length) return;
    const scrollY = window.scrollY + 80;
    let idx = 0;
    for (let i = 0; i < files.length; i++) { if (files[i].offsetTop <= scrollY) idx = i; }
    const next = Math.max(0, Math.min(files.length - 1, idx + dir));
    files[next].scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleExpandAll() {
    const btns = document.querySelectorAll('button[aria-label="Toggle diff contents"]');
    const shouldExpand = Array.from(btns).some(b =>
      b.closest('[id^="diff-"]')?.querySelector('.js-file-content')?.style.display === "none");
    btns.forEach(b => {
      const content = b.closest('[id^="diff-"]')?.querySelector('.js-file-content');
      if (content && (content.style.display === "none") === shouldExpand) b.click();
    });
  }
```

| Key | Action | | Key | Action |
|-----|--------|-|-----|--------|
| `Alt+F` | File tree | | `n` | Next file |
| `Alt+S` | Statistics | | `p` | Previous file |
| `Alt+C` | Checklist | | `e` | Expand/collapse all |
| `Alt+T` | Templates | | | |

---

## Step 8: Review Checklist {#step-8-review-checklist}

A per-repo checklist persisted via `@theluckystrike/webext-storage`. Template items
are shared across PRs; checked state is per-PR:

```js
  let checklistVisible = false;

  function toggleChecklist() {
    const el = document.getElementById("pr-checklist-panel");
    if (el) { el.remove(); checklistVisible = false; return; }
    checklistVisible = true;

    const pr = getPRInfo();
    const tplKey = `checklist:${pr.owner}/${pr.repo}`;
    const stateKey = `checklist-state:${pr.owner}/${pr.repo}#${pr.number}`;

    chrome.storage.local.get([tplKey, stateKey], (data) => {
      const items = data[tplKey] || [
        "Code follows project style guidelines",
        "Tests added or updated",
        "No hardcoded secrets or credentials",
        "Error handling is appropriate",
        "Documentation updated if needed",
        "No unnecessary console.log statements"
      ];
      const checked = data[stateKey] || {};
      renderChecklist(items, checked, tplKey, stateKey);
    });
  }

  function renderChecklist(items, checked, tplKey, stateKey) {
    let panel = document.getElementById("pr-checklist-panel");
    if (panel) panel.remove();

    const done = Object.values(checked).filter(Boolean).length;
    panel = document.createElement("div");
    panel.id = "pr-checklist-panel";
    panel.className = "prt-floating-panel";
    panel.innerHTML = `
      <div class="prt-panel-header">
        <strong>Checklist (${done}/${items.length})</strong>
        <button id="prt-close-cl">X</button>
      </div>
      <div class="prt-cl-items">${items.map((item, i) => `
        <label class="prt-check-row">
          <input type="checkbox" data-i="${i}" ${checked[i] ? "checked" : ""}>
          <span>${item}</span>
        </label>`).join("")}
      </div>
      <div class="prt-cl-actions">
        <button id="prt-add-item">+ Add</button>
        <button id="prt-save-tpl">Save Template</button>
      </div>`;

    document.body.appendChild(panel);

    panel.querySelector(".prt-cl-items").addEventListener("change", (e) => {
      if (e.target.type !== "checkbox") return;
      checked[e.target.dataset.i] = e.target.checked;
      chrome.storage.local.set({ [stateKey]: checked });
      const count = Object.values(checked).filter(Boolean).length;
      panel.querySelector("strong").textContent = `Checklist (${count}/${items.length})`;
    });

    document.getElementById("prt-add-item").addEventListener("click", () => {
      const text = prompt("New checklist item:");
      if (text) { items.push(text); chrome.storage.local.set({ [tplKey]: items });
        renderChecklist(items, checked, tplKey, stateKey); }
    });
    document.getElementById("prt-save-tpl").addEventListener("click", () => {
      chrome.storage.local.set({ [tplKey]: items });
    });
    document.getElementById("prt-close-cl").addEventListener("click", () => {
      panel.remove(); checklistVisible = false;
    });
  }
```

Close the content script IIFE:

```js
})();
```

---

## Step 9: Background Sync for Notification Badges {#step-9-background-sync-for-notification-badges}

The background worker polls GitHub for pending review requests and updates the
extension badge:

```js
// background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PR_PAGE_LOADED") {
    chrome.action.setBadgeBackgroundColor({ color: "#238636" });
    chrome.action.setBadgeText({ text: "PR", tabId: sender.tab.id });
    sendResponse({ ok: true });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("pr-sync", { periodInMinutes: 5 });
  chrome.storage.local.get(["githubToken"], (d) => {
    if (!d.githubToken) chrome.storage.local.set({ githubToken: "", watchedRepos: [] });
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "pr-sync") return;
  const cfg = await new Promise(r => chrome.storage.local.get(["githubToken", "watchedRepos", "githubUsername"], r));
  if (!cfg.githubToken || !cfg.watchedRepos?.length) return;

  let total = 0;
  for (const repo of cfg.watchedRepos) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=10`,
        { headers: { Authorization: `token ${cfg.githubToken}` } });
      if (!res.ok) continue;
      const pulls = await res.json();
      total += pulls.filter(pr =>
        pr.requested_reviewers?.some(r => r.login === cfg.githubUsername)).length;
    } catch (_) {}
  }

  chrome.action.setBadgeBackgroundColor({ color: total > 0 ? "#da3633" : "#238636" });
  chrome.action.setBadgeText({ text: total > 0 ? String(total) : "" });
  chrome.storage.local.set({ pendingReviews: total, lastSync: Date.now() });
});
```

To enable sync, set `githubToken`, `githubUsername`, and `watchedRepos` (array of
`"owner/repo"` strings) in `chrome.storage.local` via a settings page or the
DevTools console.

---

## Testing {#testing}

1. Load unpacked at `chrome://extensions/` with Developer mode on.
2. Navigate to any GitHub PR (e.g., `github.com/facebook/react/pull/1`).
3. The floating toolbar appears at the bottom-right.
4. Open the "Files changed" tab, then click **Files** for the file tree sidebar.
5. Click **Stats** for addition/deletion counts and estimated review time.
6. Click **Checklist** to manage a per-repo review checklist.
7. Focus a comment textarea and click **Templates** to insert pre-built comments.
8. Press `n`/`p` to navigate files, `e` to expand/collapse all diffs.

---

## Architecture {#architecture}

```
  content.js                         background.js
  (toolbar, file tree, stats,        (badge updates,
   checklist, templates, shortcuts)   PR sync via alarms)
       |                                   |
       +--- chrome.runtime.sendMessage ----+
       |    (@theluckystrike/webext-messaging)
       |                                   |
       +--- chrome.storage.local ----------+
            (@theluckystrike/webext-storage)
```

| Storage Key | Type | Description |
|-------------|------|-------------|
| `checklist:{owner}/{repo}` | array | Template items per repo |
| `checklist-state:{owner}/{repo}#{num}` | object | Checked state per PR |
| `githubToken` | string | PAT for notification sync |
| `watchedRepos` | array | Repos to poll for reviews |
| `pendingReviews` | number | Cached pending review count |

---

## Extending the Extension {#extending-the-extension}

Here are several directions you can take this further:

**Diff annotation layer.** Overlay colored markers on unchanged lines that contain
potential issues (e.g., TODO comments, large functions, missing error handling). Use
the content script to parse the diff DOM and inject inline badges.

**Cross-PR review history.** Store review notes per file path across PRs so you can
see how a file has evolved. Use `@theluckystrike/webext-storage` with keys like
`history:{owner}/{repo}/{filepath}` and display a timeline in the file tree panel.

**Team review assignment.** Add a panel that shows who has reviewed and who still
needs to, pulling data from the GitHub API's review endpoint
(`/repos/{owner}/{repo}/pulls/{number}/reviews`).

**Custom template management.** Build a settings page where users can add, edit,
and reorder comment templates. Store them in `chrome.storage.local` and sync across
devices with `chrome.storage.sync`.

**PR comparison mode.** Let users compare the current PR against a previous version
of the same PR by storing snapshots of file changes. This helps track how a PR has
evolved through review cycles.
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
