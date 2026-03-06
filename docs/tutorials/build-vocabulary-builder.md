# Build a Vocabulary Builder Extension

Build a vocabulary builder extension that saves words while browsing, provides definitions via dictionary API, and offers flashcard review with spaced repetition for effective learning.

## What You'll Build

- Save words while browsing with automatic definitions
- Flashcard review with spaced repetition algorithm (SM-2)
- Context menu and double-click word capture
- Context sentence preservation and source URL tracking
- Progress statistics and export functionality

## Prerequisites

- Chrome browser or Chromium-based browser
- Basic JavaScript, HTML, and CSS knowledge
- Familiarity with Chrome Extensions API

## Project Structure

```
vocab-builder/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── sidepanel/
│   ├── sidepanel.html
│   ├── sidepanel.css
│   └── sidepanel.js
├── background/
│   └── service-worker.js
├── content/
│   └── content.js
└── icons/
    └── icon.png
```

## Manifest Configuration

Create your `manifest.json` with the required permissions:

```json
{
  "manifest_version": 3,
  "name": "VocabBuilder",
  "version": "1.0.0",
  "description": "Save and learn new vocabulary while browsing",
  "permissions": [
    "storage",
    "contextMenus",
    "activeTab",
    "sidePanel"
  ],
  "side_panel": { "default_path": "sidepanel/sidepanel.html" },
  "action": { "default_popup": "popup/popup.html" },
  "background": { "service_worker": "background/service-worker.js" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/content.js"]
  }],
  "icons": { "16": "icons/icon-16.png", "48": "icons/icon-48.png", "128": "icons/icon-128.png" }
}
```

## Step 1: Word Capture

### Context Menu Integration

Add "Save to VocabBuilder" option when users select text on any page.

```javascript
// background/service-worker.js
chrome.contextMenus.create({
  id: 'saveWord',
  title: 'Save to VocabBuilder',
  contexts: ['selection']
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'saveWord' && info.selectionText) {
    const word = info.selectionText.trim();
    await lookupAndSaveWord(word, tab.url);
  }
});
```

### Double-Click Capture

Listen for double-click events in content scripts to capture words.

```javascript
// content/content.js
document.addEventListener('dblclick', async (e) => {
  const selection = window.getSelection();
  const word = selection.toString().trim();
  
  if (word && word.split(/\s+/).length === 1) {
    const tab = await chrome.runtime.sendMessage({
      type: 'LOOKUP_WORD',
      word: word,
      url: window.location.href
    });
  }
});
```

## Step 2: Dictionary API Integration

### Fetch Definitions

Use dictionaryapi.dev to get word definitions without authentication.

```javascript
// background/service-worker.js
async function lookupWord(word) {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
  );
  
  if (!response.ok) {
    throw new Error('Word not found');
  }
  
  const data = await response.json();
  return parseDictionaryResponse(data, word);
}

function parseDictionaryResponse(data, word) {
  const entry = data[0];
  const definitions = [];
  
  for (const meaning of entry.meanings) {
    for (const def of meaning.definitions) {
      definitions.push({
        partOfSpeech: meaning.partOfSpeech,
        definition: def.definition,
        example: def.example || null
      });
    }
  }
  
  return {
    word: entry.word,
    phonetic: entry.phonetic || '',
    definitions: definitions.slice(0, 3)
  };
}
```

## Step 3: Storage Schema

### Word Data Structure

Store vocabulary with spaced repetition metadata.

```javascript
// background/service-worker.js
const VOCAB_KEY = 'vocabulary';

async function saveWord(wordData, sourceUrl) {
  const vocab = await getVocabulary();
  
  const wordEntry = {
    id: generateId(),
    word: wordData.word,
    phonetic: wordData.phonetic,
    definitions: wordData.definitions,
    sourceUrl: sourceUrl,
    contextSentence: null,
    addedAt: Date.now(),
    // SM-2 algorithm fields
    repetition: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReview: Date.now()
  };
  
  vocab[wordData.word.toLowerCase()] = wordEntry;
  await chrome.storage.local.set({ [VOCAB_KEY]: vocab });
  
  return wordEntry;
}

async function getVocabulary() {
  const result = await chrome.storage.local.get(VOCAB_KEY);
  return result[VOCAB_KEY] || {};
}
```

## Step 4: Popup Word List

### Display Saved Words

Show all saved words with search and filter capabilities.

```html
<!-- popup/popup.html -->
<div class="vocab-popup">
  <input type="text" id="searchInput" placeholder="Search words..." />
  <div id="wordList" class="word-list"></div>
  <div class="stats">
    <span id="totalWords">0</span> words |
    <span id="dueReview">0</span> due for review
  </div>
</div>
```

```javascript
// popup/popup.js
async function renderWordList(filter = '') {
  const vocab = await getVocabulary();
  const words = Object.values(vocab);
  
  const filtered = filter 
    ? words.filter(w => w.word.toLowerCase().includes(filter.toLowerCase()))
    : words;
  
  const wordList = document.getElementById('wordList');
  wordList.innerHTML = filtered.map(word => `
    <div class="word-item" data-word="${word.word}">
      <span class="word">${word.word}</span>
      <span class="phonetic">${word.phonetic}</span>
      <span class="definition">${word.definitions[0]?.definition || ''}</span>
    </div>
  `).join('');
}

document.getElementById('searchInput').addEventListener('input', (e) => {
  renderWordList(e.target.value);
});
```

## Step 5: Flashcard Review (SM-2 Algorithm)

### Spaced Repetition Implementation

Implement the SM-2 algorithm for optimal review scheduling.

```javascript
// sidepanel/sidepanel.js
function calculateNextReview(word, quality) {
  // quality: 0-5 (0-2 = fail, 3-5 = pass)
  let { repetition, interval, easeFactor } = word;
  
  if (quality < 3) {
    repetition = 0;
    interval = 1;
  } else {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetition += 1;
  }
  
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  easeFactor = Math.max(1.3, easeFactor);
  
  return {
    repetition,
    interval,
    easeFactor,
    nextReview: Date.now() + interval * 24 * 60 * 60 * 1000
  };
}

async function getDueCards() {
  const vocab = await getVocabulary();
  const now = Date.now();
  
  return Object.values(vocab)
    .filter(word => word.nextReview <= now)
    .sort((a, b) => a.nextReview - b.nextReview);
}
```

### Flashcard UI

Display cards with rating buttons for review.

```javascript
// sidepanel/sidepanel.js
function showFlashcard(word) {
  const card = document.getElementById('flashcard');
  const front = card.querySelector('.front');
  const back = card.querySelector('.back');
  
  front.textContent = word.word;
  back.innerHTML = `
    <div class="phonetic">${word.phonetic}</div>
    <div class="definitions">
      ${word.definitions.map(d => `
        <p><em>${d.partOfSpeech}</em>: ${d.definition}</p>
      `).join('')}
    </div>
    ${word.sourceUrl ? `<a href="${word.sourceUrl}" target="_blank">Source</a>` : ''}
  `;
  
  card.classList.add('flipped');
}

async function rateCard(wordId, quality) {
  const vocab = await getVocabulary();
  const word = vocab[wordId];
  
  const updates = calculateNextReview(word, quality);
  Object.assign(word, updates);
  
  vocab[wordId] = word;
  await chrome.storage.local.set({ vocabulary: vocab });
  
  showNextCard();
}
```

## Step 6: Progress and Export

### Statistics Dashboard

Show learning progress and upcoming reviews.

```javascript
async function getStats() {
  const vocab = await getVocabulary();
  const words = Object.values(vocab);
  const now = Date.now();
  
  return {
    total: words.length,
    mastered: words.filter(w => w.repetition >= 5).length,
    learning: words.filter(w => w.repetition > 0 && w.repetition < 5).length,
    new: words.filter(w => w.repetition === 0).length,
    dueToday: words.filter(w => w.nextReview <= now).length
  };
}
```

### Export Functionality

Export vocabulary as JSON or CSV.

```javascript
function exportVocabulary(format = 'json') {
  getVocabulary().then(vocab => {
    const words = Object.values(vocab);
    
    if (format === 'json') {
      downloadFile(JSON.stringify(words, null, 2), 'vocabulary.json', 'application/json');
    } else if (format === 'csv') {
      const csv = ['word,phonetic,definition,addedAt,repetition']
        .concat(words.map(w => 
          `"${w.word}","${w.phonetic}","${w.definitions[0]?.definition || ''}","${w.addedAt}",${w.repetition}`
        )).join('\n');
      downloadFile(csv, 'vocabulary.csv', 'text/csv');
    }
  });
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

## Cross-references

- [permissions/contextMenus.md](../permissions/contextmenus.md)
- [permissions/sidePanel.md](../permissions/sidepanel.md)
- [patterns/side-panel.md](../patterns/side-panel.md)
- [patterns/state-management.md](../patterns/state-management.md)
