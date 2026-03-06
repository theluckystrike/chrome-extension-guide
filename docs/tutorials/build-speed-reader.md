# Build a Speed Reader Extension

## What You'll Build
- RSVP (Rapid Serial Visual Presentation) speed reading
- Extract article text from any web page
- Adjustable speed (WPM), pause/resume
- Reading progress and statistics

## Manifest
- permissions: activeTab, storage, scripting
- action with popup, commands for shortcuts

---

## Step 1: Text Extraction

```javascript
// content-script.js
async function extractArticleText() {
  const article = document.querySelector('article') || document.querySelector('main') || document.body;
  const clone = article.cloneNode(true);
  clone.querySelectorAll('script, style, nav, footer, aside').forEach(el => el.remove());
  return clone.textContent.trim();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractText') sendResponse({ text: extractArticleText() });
});
```

---

## Step 2: RSVP Display

Show one word at a time with ORP (Optimal Recognition Point):

```javascript
// popup.js
class RSVPReader {
  constructor() { this.words = []; this.currentIndex = 0; this.wpm = 250; this.isPlaying = false; }

  getORP(word) {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 3) return 1;
    if (len <= 5) return 2;
    return Math.floor(len * 0.3);
  }

  display(word) {
    const orpIndex = this.getORP(word);
    const before = word.slice(0, orpIndex), pivot = word[orpIndex] || '', after = word.slice(orpIndex + 1);
    document.getElementById('word').innerHTML = `${before}<span class="orp">${pivot}</span>${after}`;
  }

  play() { this.isPlaying = true; this.timer = setInterval(() => this.next(), 60000 / this.wpm); }
  pause() { this.isPlaying = false; clearInterval(this.timer); }

  next() {
    if (this.currentIndex >= this.words.length) { this.pause(); return; }
    this.display(this.words[this.currentIndex++]);
    document.getElementById('progress-bar').style.width = `${(this.currentIndex / this.words.length) * 100}%`;
  }
}
```

---

## Step 3: Speed Controls

```javascript
function adjustWPM(delta) {
  reader.wpm = Math.max(100, Math.min(1000, reader.wpm + delta));
  document.getElementById('wpm-display').textContent = reader.wpm;
  if (reader.isPlaying) { reader.pause(); reader.play(); }
  chrome.storage.local.set({ preferredWPM: reader.wpm });
}

// Adaptive: slow down for long words and punctuation
function getDelay(word) {
  let delay = 60000 / reader.wpm;
  if (word.length > 8) delay *= 1.3;
  if (/[.!?]$/.test(word)) delay *= 1.5;
  if (/[,;:]$/.test(word)) delay *= 1.2;
  return delay;
}
```

---

## Step 4: Progress & Stats

```javascript
// Jump to position by clicking progress bar
document.getElementById('progress-container').addEventListener('click', (e) => {
  const percent = (e.clientX - e.target.getBoundingClientRect().left) / e.target.offsetWidth;
  reader.currentIndex = Math.floor(percent * reader.words.length);
  reader.display(reader.words[reader.currentIndex]);
});

// Stats persistence
const StatsManager = {
  async getStats() {
    const result = await chrome.storage.local.get(['readingStats']);
    return result.readingStats || { totalWordsRead: 0, totalSessions: 0, averageWPM: 0 };
  },
  async updateStats(wordsRead, wpm) {
    const stats = await this.getStats();
    stats.totalWordsRead += wordsRead;
    stats.totalSessions += 1;
    stats.averageWPM = Math.round((stats.averageWPM * (stats.totalSessions - 1) + wpm) / stats.totalSessions);
    await chrome.storage.local.set({ readingStats: stats });
  }
};
```

---

## Step 5: Keyboard Shortcuts

manifest.json:
```json
{
  "commands": {
    "toggle-reader": { "suggested_key": { "default": "Alt+Shift+R" }, "description": "Toggle speed reader" }
  }
}
```

background.js:
```javascript
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: command });
  });
});
```

---

## Related Documentation
- [Permissions: activeTab](../permissions/activeTab.md)
- [Permissions: scripting](../permissions/scripting.md)
- [Content Script Patterns](../guides/content-script-patterns.md)
- [Side Panel Pattern](../patterns/side-panel.md)
