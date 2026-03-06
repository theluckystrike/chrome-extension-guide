# CSS Injection Techniques for Chrome Extensions

This guide covers various CSS injection methods for Chrome extensions, from static manifest declarations to dynamic runtime injection.

## Static Injection via Manifest

Declare CSS files in `manifest.json` under `content_scripts`. These load before the page's own stylesheets, giving your styles higher cascade priority:

```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "css": ["styles/base.css", "styles/theme.css"]
  }]
}
```

## Dynamic Injection with chrome.scripting.insertCSS()

Inject stylesheets programmatically when needed:

```javascript
chrome.scripting.insertCSS({
  target: { tabId: activeTab.id },
  files: ['styles/dynamic.css']
});
```

Or inject inline CSS:

```javascript
chrome.scripting.insertCSS({
  target: { tabId: activeTab.id },
  css: '.custom-element { color: red !important; }'
});
```

## Removing Injected CSS

Use `chrome.scripting.removeCSS()` to undo dynamic injections:

```javascript
chrome.scripting.removeCSS({
  target: { tabId: activeTab.id },
  css: '.custom-element { color: red !important; }'
});
```

## Content Script Style Injection

Create style elements directly in the content script:

```javascript
const style = document.createElement('style');
style.textContent = `
  .my-extension-button {
    background: #4a90d9;
    padding: 8px 16px;
    border-radius: 4px;
  }
`;
document.head.appendChild(style);
```

## Overriding Page Styles

### Using !important

The nuclear option for winning specificity battles:

```css
.extension-override {
  color: #ff0000 !important;
}
```

### High-Specificity Selectors

Increase specificity to override page styles without !important:

```css
html body div.main-content .sidebar .extension-element {
  background: #ffffff;
}
```

## Shadow DOM Isolation

Injected CSS doesn't penetrate shadow DOM boundaries. Use this for component isolation:

```javascript
const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'open' });
shadow.innerHTML = '<style>.isolated { color: green; }</style><span class="isolated">Isolated</span>';
```

## CSS Custom Properties for Theming

Define variables in your extension CSS for easy theming:

```css
:root {
  --ext-bg: #ffffff;
  --ext-text: #333333;
  --ext-accent: #4a90d9;
}

.ext-button {
  background: var(--ext-bg);
  color: var(--ext-text);
  border: 2px solid var(--ext-accent);
}
```

### Dynamic Theme Injection

```javascript
function applyTheme(theme) {
  const css = `
    :root {
      --ext-bg: ${theme.bg};
      --ext-text: ${theme.text};
      --ext-accent: ${theme.accent};
    }
  `;
  chrome.scripting.insertCSS({ css, target: { tabId } });
}
```

## CSS-Only Dark Mode

Quick dark mode using filters:

```css
.ext-dark-mode {
  filter: invert(1) hue-rotate(180deg);
}
```

This inverts colors and rotates hue to restore correct colors after inversion.

## Scoped Styles

Use unique prefixes to avoid conflicts:

```css
/* Always prefix your classes */
.ext-container { }
.ext-button--primary { }
.ext-button--secondary { }
```

## Performance Considerations

Prefer a single stylesheet over multiple style elements:

```javascript
// Bad: multiple style elements
elements.forEach(prop => {
  const style = document.createElement('style');
  style.textContent = `.ext-${prop} { }`;
  document.head.appendChild(style);
});

// Good: single consolidated stylesheet
const css = props.map(prop => `.ext-${prop} { }`).join('\n');
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
```

## CSP Considerations

Strict Content Security Policy may block inline styles. Use class-based approaches:

```javascript
// Instead of inline styles
element.style.background = 'red';

// Use classes
element.classList.add('ext-highlight');
```

## Related Guides

- [Content Script Patterns](./content-script-patterns.md)
- [Theming: Dark Mode](../patterns/theming-dark-mode.md)
- [Scripting API Reference](../api-reference/scripting-api.md)
