---
layout: default
title: "Chrome Extension Regex Tester — Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
---
# Build a Regex Tester Extension

## What You'll Build
- Test regex patterns against text with real-time highlighting
- Display capture groups (numbered and named)
- Save favorite patterns to storage, built-in pattern library

---

## Step 1: Manifest

```json
{ "name": "Regex Tester", "version": "1.0", "manifest_version": 3, "action": { "default_popup": "popup.html" }, "permissions": ["storage"] }
```

---

## Step 2: Popup UI

```html
<input type="text" id="regexInput" placeholder="Regex...">
<div id="flags"><label><input type="checkbox" id="flagG" checked> g</label><label><input type="checkbox" id="flagI"> i</label><label><input type="checkbox" id="flagM"> m</label><label><input type="checkbox" id="flagS"> s</label></div>
<textarea id="testString" placeholder="Test string..."></textarea>
<div id="highlightedOutput"></div><div id="matchInfo"></div><div id="groupsPanel"></div>
<button id="savePattern">Save</button><div id="patternLibrary"></div>
```

---

## Step 3: Real-Time Matching

Debounce for performance (see [patterns/throttle-debounce-extensions.md](../../patterns/throttle-debounce-extensions.md)):

```javascript
const updateMatches = debounce(() => {
  try {
    const regex = new RegExp(regexInput.value, getFlags());
    const matches = [...testString.value.matchAll(regex)];
    renderMatches(matches); updateMatchInfo(matches);
  } catch (e) { showError(e.message); }
}, 150);
```

Wrap `new RegExp()` in try/catch for invalid regex handling.

---

## Step 4: Match Highlighting

```javascript
function renderMatches(matches) {
  let html = testString.value, offset = 0;
  matches.forEach((m, i) => {
    const start = m.index + offset;
    const colored = `<span class="match" style="background:${colors[i%colors.length]}">${m[0]}</span>`;
    html = html.slice(0, start) + colored + html.slice(start + m[0].length);
    offset += colored.length - m[0].length;
  });
  highlightedOutput.innerHTML = html;
}
```

---

## Step 5: Capture Groups

```javascript
function showGroups(match) {
  let html = '';
  match.slice(1).forEach((g, i) => html += `<li>Group ${i+1}: "${g}"</li>`);
  if (match.groups) for (const [n, v] of Object.entries(match.groups)) html += `<li>${n}: "${v}"</li>`;
  groupsPanel.innerHTML = html;
}
```

---

## Step 6: Match Info

```javascript
function updateMatchInfo(matches) {
  matchInfo.innerHTML = `<p>Matches: ${matches.length}</p>`;
  matches.forEach((m, i) => matchInfo.innerHTML += `<p>Match ${i+1}: "${m[0]}" at ${m.index}</p>`);
}
```

---

## Step 7: Save Patterns

Store with chrome.storage (see [api-reference/storage-api-deep-dive.md](../../api-reference/storage-api-deep-dive.md)):

```javascript
document.getElementById('savePattern').addEventListener('click', () => {
  const name = prompt('Name:');
  chrome.storage.local.get({p:[]}, r => chrome.storage.local.set({p:[...r.p,{name,regex:regexInput.value}]}));
});
```

---

## Step 8: Pattern Library

```javascript
const library = [
  {name:'Email',regex:'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'},
  {name:'URL',regex:'https?:\\/\\/[\\w\\-._~:/?#[\\]@!$&\'()*+,;=%]+'},
  {name:'Phone',regex:'\\+?[1-9]\\d{1,14}'},
  {name:'IP',regex:'\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b'}
];
```

---

## Export Matches

JSON: `JSON.stringify(matches.map(m=>({match:m[0],index:m.index,groups:m.slice(1)}))))`

Text: `matches.map((m,i)=>\`Match \${i+1}: \${m[0]}\`).join('\n')`

---

## Related
- [guides/popup-patterns.md](../../guides/popup-patterns.md)
- [api-reference/storage-api-deep-dive.md](../../api-reference/storage-api-deep-dive.md)
- [patterns/throttle-debounce-extensions.md](../../patterns/throttle-debounce-extensions.md)
