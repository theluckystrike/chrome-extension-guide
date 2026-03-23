---
layout: default
title: "Chrome Extension Gradient Generator. Developer Guide"
description: "Learn how to build a Chrome extension with this step-by-step tutorial covering setup, implementation, and deployment."
canonical_url: "https://bestchromeextensions.com/tutorials/build-gradient-generator/"
---
Build a CSS Gradient Generator Extension

What You'll Build {#what-youll-build}
- Visual gradient builder with live preview | Multiple color stops | Linear/radial/conic types
- One-click CSS copy | Saved gradients library | Random generator | Export CSS/SVG/PNG

Manifest {#manifest}
```json
{"manifest_version":3,"name":"CSS Gradient Generator","version":"1.0","permissions":["storage"],"action":{"default_popup":"popup.html"}}
```

---

Step 1: Popup UI {#step-1-popup-ui}

```html
<div id="gradient-preview"></div>
<div class="controls">
  <div class="gradient-type">
    <button class="type-btn active" data-type="linear">Linear</button>
    <button class="type-btn" data-type="radial">Radial</button>
    <button class="type-btn" data-type="conic">Conic</button>
  </div>
  <div class="color-stops" id="color-stops"></div>
  <button id="add-stop">+ Add Stop</button>
  <label>Angle: <span id="angle-value">90</span>° <input type="range" id="angle-slider" min="0" max="360" value="90"></label>
</div>
<pre id="css-output"></pre>
<button id="copy-btn">Copy CSS</button>
```

---

Step 2: Color Stop Inputs {#step-2-color-stop-inputs}

```javascript
function renderColorStops() {
  const container = document.getElementById('color-stops');
  container.innerHTML = '';
  state.colorStops.forEach((stop, i) => {
    container.innerHTML += `<input type="color" value="${stop.color}" data-index="${i}">
      <input type="range" value="${stop.position}" min="0" max="100" data-index="${i}">
      <button class="remove-stop" data-index="${i}">×</button>`;
  });
}
```

---

Step 3: Gradient String Builder {#step-3-gradient-string-builder}

```javascript
const gradientTypes = { linear: a => `linear-gradient(${a}deg, {s})`, radial: () => `radial-gradient(circle, {s})`, conic: a => `conic-gradient(from ${a}deg, {s})` };
function buildGradientString() {
  const stops = state.colorStops.sort((a,b) => a.position-b.position).map(s => `${s.color} ${s.position}%`).join(', ');
  return gradientTypes[state.type](state.angle).replace('{s}', stops);
}
```

---

Step 4: Live Preview {#step-4-live-preview}

```javascript
function updatePreview() {
  const gradient = buildGradientString();
  document.getElementById('gradient-preview').style.background = gradient;
  document.getElementById('css-output').textContent = `background: ${gradient};`;
}
```

---

Step 5: Copy to Clipboard {#step-5-copy-to-clipboard}

```javascript
document.getElementById('copy-btn').addEventListener('click', async () => {
  await navigator.clipboard.writeText(document.getElementById('css-output').textContent);
});
```

---

Step 6: Saved Gradients {#step-6-saved-gradients}

```javascript
async function saveGradient() {
  const saved = (await chrome.storage.local.get('savedGradients')).savedGradients || [];
  saved.push({ ...state, name: `Gradient ${saved.length + 1}` });
  await chrome.storage.local.set({ savedGradients: saved });
}
```

---

Additional Features {#additional-features}

Random Gradient: `const rc = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');`
`state.colorStops = [{c:rc(),p:0},{c:rc(),p:50},{c:rc(),p:100}]; state.angle = Math.floor(Math.random()*360); updatePreview();`

Export as SVG via `<linearGradient>` or PNG via canvas. Shortcuts: Arrow keys angle, Ctrl+S save, Ctrl+R random.

---

Related {#related}
- [patterns/clipboard-patterns.md](../patterns/clipboard-patterns.md)
- [guides/popup-patterns.md](../guides/popup-patterns.md)
- [api-reference/storage-api-deep detailed look.md](../api-reference/storage-api-deep detailed look.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
