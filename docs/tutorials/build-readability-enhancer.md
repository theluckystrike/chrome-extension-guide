# Build a Readability Enhancer Extension — Full Tutorial

## What We're Building
- Clean article view that extracts main content from any webpage
- Font family (serif/sans-serif/monospace), size slider, line height, max width controls
- Reading progress bar based on scroll position
- Estimated reading time (word count / 200 wpm)
- Dark, sepia, and light theme modes
- Print-friendly styling
- Keyboard shortcuts: toggle reader, increase/decrease font size
- Uses `activeTab`, `storage` permissions

## manifest.json — MV3, activeTab + storage permissions, action with icon

## Step 1: Manifest Configuration
- `activeTab` permission for accessing current page content
- `storage` permission for saving user preferences
- Action with default icon, can add commands for keyboard shortcuts
- Content script registered for all URLs (`<all_urls>`)

```json
{
  "permissions": ["activeTab", "storage"],
  "action": { "default_icon": "icon.png" },
  "commands": {
    "toggle-reader": {
      "suggested_key": "Alt+Shift+R",
      "description": "Toggle reader mode"
    }
  }
}
```

## Step 2: Content Script — Extract Main Article Content
- Heuristic algorithm: find largest text block, `<article>` tag, or `<main>` tag
- Clone the content, remove unwanted elements (ads, navigation, comments)
- Calculate word count for reading time
- Use DOM traversal to identify primary content area

```javascript
// Extract main content using multiple heuristics
function extractArticleContent() {
  // Priority: article > main > largest text block
  const article = document.querySelector('article') || 
                  document.querySelector('main') ||
                  findLargestTextBlock();
  return {
    content: article.cloneNode(true),
    wordCount: article.innerText.split(/\s+/).length
  };
}

function findLargestTextBlock() {
  // Score elements by text density and paragraph count
  const candidates = document.querySelectorAll('div, section');
  // Return element with highest content score
}
```

## Step 3: Reader View Overlay
- Create full-screen overlay with clean typography
- Centered content container with optimal max-width (65-75 characters)
- Typography: Georgia/Merriweather for serif, system-ui for sans-serif
- Hide original page content, show extracted article

```javascript
function createReaderOverlay(content, wordCount) {
  const overlay = document.createElement('div');
  overlay.id = 'reader-view-overlay';
  overlay.innerHTML = `
    <div class="reader-toolbar">...</div>
    <div class="reader-content">${content.innerHTML}</div>
    <div class="reader-progress-bar"></div>
  `;
  document.body.appendChild(overlay);
}
```

## Step 4: Font Controls
- Font family: serif (Georgia), sans-serif (system-ui), monospace (Consolas)
- Size slider: 14px to 28px range
- Line height: 1.4 to 2.0
- Max width: 600px to 900px
- Controls appear in toolbar at top of reader view

```css
.reader-content {
  font-family: var(--reader-font-family, Georgia);
  font-size: var(--reader-font-size, 18px);
  line-height: var(--reader-line-height, 1.6);
  max-width: var(--reader-max-width, 720px);
  margin: 0 auto;
  padding: 2rem;
}
```

## Step 5: Save Preferences to Storage
- Use `chrome.storage.local` for per-device preferences
- Store: fontFamily, fontSize, lineHeight, maxWidth, theme
- Load saved preferences when reader mode activates
- Provide "Reset to defaults" option

```javascript
// Save preferences
async function savePreferences(prefs) {
  await chrome.storage.local.set({ readerPreferences: prefs });
}

// Load preferences
async function loadPreferences() {
  const { readerPreferences } = await chrome.storage.local.get('readerPreferences');
  return readerPreferences || defaultPreferences;
}
```

## Step 6: Reading Progress Bar
- Fixed at top of viewport
- Calculate: `(scrollPosition / (pageHeight - viewportHeight)) * 100`
- Update on scroll event (throttled for performance)
- Visual: thin bar, accent color, smooth transitions

```javascript
function updateProgressBar() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = (scrollTop / docHeight) * 100;
  document.querySelector('.reader-progress-bar').style.width = progress + '%';
}
```

## Step 7: Estimated Reading Time
- Formula: `Math.ceil(wordCount / 200)` minutes
- Display in toolbar: "X min read"
- Update dynamically if content changes

```javascript
function calculateReadingTime(wordCount) {
  const minutes = Math.ceil(wordCount / 200);
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
}
```

## Step 8: Keyboard Shortcuts
- `Alt+Shift+R`: Toggle reader mode on/off
- `Alt+Plus` / `Alt+Minus`: Increase/decrease font size
- `Alt+T`: Cycle through themes (light/sepia/dark)
- Handle via `chrome.commands` in background script

```javascript
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-reader') {
    // Send message to content script to toggle
  }
});
```

## Theme Modes
- Light: white background (#ffffff), dark text (#1a1a1a)
- Sepia: warm background (#f4ecd8), brown text (#5b4636)
- Dark: dark background (#1a1a1a), light text (#e0e0e0)
- Apply via CSS custom properties on overlay

```css
.reader-view-overlay[data-theme="sepia"] {
  --bg-color: #f4ecd8;
  --text-color: #5b4636;
}
```

## Print-Friendly Styling
- Hide toolbar and progress bar
- Force light theme
- Add page breaks between sections if needed
- Use `@media print` query

```css
@media print {
  .reader-toolbar, .reader-progress-bar { display: none !important; }
  .reader-content { max-width: 100% !important; }
}
```

## Edge Cases & Handling
- **Paginated articles**: Detect pagination links, may need user confirmation
- **Infinite scroll**: Extract visible content, note more content below
- **Paywalled content**: Can only read what's rendered; cannot bypass paywalls
- **No main content found**: Show helpful error message to user
- **Images**: Preserve images, add alt text fallback

## Cross-References
- See [guides/content-script-patterns.md](../guides/content-script-patterns.md) for content script architecture
- See [patterns/theming-dark-mode.md](../patterns/theming-dark-mode.md) for theming patterns
- See [guides/accessibility.md](../guides/accessibility.md) for accessibility considerations

## Testing
- Test on various content types: news articles, blog posts, documentation
- Verify reading time accuracy on different word counts
- Test all theme modes and font combinations
- Verify keyboard shortcuts work as expected
- Test print preview and printing functionality

## What You Learned
- Content extraction using DOM heuristics
- Overlay-based UI patterns
- Reading time calculation
- Scroll-based progress tracking
- Theme switching with CSS custom properties
- Keyboard shortcuts in extensions
- Storage API for preferences
