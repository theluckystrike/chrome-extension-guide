# Reading Mode Implementation in Chrome Extensions

## Introduction

Reading mode is a popular feature that transforms cluttered web pages into clean, distraction-free reading experiences. This guide covers building a Chrome extension that extracts article content, applies clean formatting, and provides customizable reading experiences.

## How Reading Mode Works

Reading mode extensions typically:
1. Detect when a user activates the feature (button, keyboard shortcut)
2. Extract the main content from the current page
3. Strip ads, navigation, and other clutter
4. Render a clean, readable version
5. Save user preferences (theme, font size, line height)

## Manifest Configuration

```json
{
  "name": "Reading Mode Pro",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": ["activeTab", "storage", "scripting"],
  "action": {
    "default_icon": "icons/icon.png"
  },
  "commands": {
    "toggle-reading-mode": {
      "suggested_key": "Alt+Shift+R",
      "description": "Toggle reading mode"
    }
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/content.js"],
    "run_at": "document_idle"
  }]
}
```

## Content Extraction Patterns

The core challenge is extracting the main article content while filtering out noise. Here's a solid extraction strategy:

```ts
// content/extractor.ts

interface ExtractionResult {
  title: string;
  content: string;
  byline: string | null;
  siteName: string | null;
  length: number;
}

class ArticleExtractor {
  // Selectors to exclude (ads, navigation, comments, etc.)
  private readonly excludeSelectors = [
    'script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer',
    '.advertisement', '.ad', '.sidebar', '.comments', '.social-share',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
  ];

  // Prefer these selectors for article content
  private readonly articleSelectors = [
    'article', '[role="article"]', '.post-content', '.article-body',
    '.entry-content', '.content-body', '#article-body', 'main'
  ];

  extract(): ExtractionResult {
    const title = this.extractTitle();
    const content = this.extractContent();
    const byline = this.extractByline();
    const siteName = this.extractSiteName();

    return {
      title,
      content,
      byline,
      siteName,
      length: content.length
    };
  }

  private extractTitle(): string {
    // Try multiple sources in order of preference
    const selectors = [
      'h1.article-title',
      'h1.post-title',
      'article h1',
      '.entry-title',
      'h1'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim();
      }
    }

    return document.title;
  }

  private extractContent(): string {
    // Clone document to avoid modifying original
    const clone = document.body.cloneNode(true) as HTMLElement;

    // Remove unwanted elements
    this.excludeSelectors.forEach(selector => {
      clone.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Try to find main article content
    for (const selector of this.articleSelectors) {
      const article = clone.querySelector(selector);
      if (article && article.textContent!.length > 500) {
        return this.cleanHTML(article.innerHTML);
      }
    }

    // Fallback: find largest text block
    return this.extractLargestTextBlock(clone);
  }

  private cleanHTML(html: string): string {
    // Remove inline styles, event handlers, and empty elements
    return html
      .replace(/\s*style="[^"]*"/gi, '')
      .replace(/\s*onclick="[^"]*"/gi, '')
      .replace(/<(\w+)[^>]*>\s*<\/\1>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .trim();
  }

  private extractLargestTextBlock(root: HTMLElement): string {
    const blocks = root.querySelectorAll('div, section');
    let largestBlock = '';
    
    blocks.forEach(block => {
      const text = block.textContent || '';
      if (text.length > largestBlock.length) {
        largestBlock = block.innerHTML;
      }
    });

    return largestBlock || root.innerHTML;
  }

  private extractByline(): string | null {
    const selectors = [
      '.author', '.byline', '[rel="author"]', '.post-author',
      '[itemprop="author"]', '.entry-author'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim();
      }
    }
    return null;
  }

  private extractSiteName(): string | null {
    const ogSiteName = document.querySelector('meta[property="og:site_name"]');
    if (ogSiteName) return ogSiteName.getAttribute('content');

    const appName = document.querySelector('meta[name="application-name"]');
    if (appName) return appName.getAttribute('content');

    return null;
  }
}
```

## Reading Mode UI Controller

The content script manages the reading mode overlay:

```ts
// content/reading-mode.ts

interface ReadingModeOptions {
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  maxWidth: number;
}

const defaultOptions: ReadingModeOptions = {
  theme: 'light',
  fontSize: 18,
  fontFamily: 'Georgia, serif',
  lineHeight: 1.6,
  maxWidth: 680
};

class ReadingModeController {
  private container: HTMLElement | null = null;
  private options: ReadingModeOptions;
  private isActive = false;

  constructor() {
    this.options = { ...defaultOptions };
    this.loadOptions();
  }

  async loadOptions(): Promise<void> {
    const stored = await chrome.storage.local.get('readingModeOptions');
    if (stored.readingModeOptions) {
      this.options = { ...this.options, ...stored.readingModeOptions };
    }
  }

  async saveOptions(): Promise<void> {
    await chrome.storage.local.set({ readingModeOptions: this.options });
  }

  async toggle(article: ExtractionResult): Promise<void> {
    if (this.isActive) {
      this.close();
    } else {
      await this.open(article);
    }
  }

  private async open(article: ExtractionResult): Promise<void> {
    await this.loadOptions();

    this.container = document.createElement('div');
    this.container.id = 'reading-mode-container';
    this.container.innerHTML = this.render(article);
    document.body.appendChild(this.container);
    this.applyStyles();
    this.attachEventListeners();
    
    document.body.style.overflow = 'hidden';
    this.isActive = true;

    // Notify background script
    chrome.runtime.sendMessage({ type: 'READING_MODE_ENABLED' });
  }

  private close(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    document.body.style.overflow = '';
    this.isActive = false;

    chrome.runtime.sendMessage({ type: 'READING_MODE_DISABLED' });
  }

  private render(article: ExtractionResult): string {
    return `
      <div class="rm-toolbar">
        <button class="rm-close" aria-label="Close reading mode"></button>
        <div class="rm-settings">
          <button class="rm-settings-toggle" aria-label="Settings">Aa</button>
          <div class="rm-settings-panel hidden">
            <label>Theme:
              <select class="rm-theme">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="sepia">Sepia</option>
              </select>
            </label>
            <label>Font Size:
              <input type="range" min="14" max="28" value="${this.options.fontSize}" class="rm-font-size">
            </label>
          </div>
        </div>
      </div>
      <div class="rm-content">
        <h1 class="rm-title">${article.title}</h1>
        ${article.byline ? `<p class="rm-byline">${article.byline}</p>` : ''}
        ${article.siteName ? `<p class="rm-site">${article.siteName}</p>` : ''}
        <div class="rm-article">${article.content}</div>
      </div>
    `;
  }

  private applyStyles(): void {
    const themeStyles = this.getThemeStyles();
    const style = document.createElement('style');
    style.textContent = `
      #reading-mode-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483647;
        background: ${themeStyles.background};
        color: ${themeStyles.text};
        overflow-y: auto;
        font-family: ${this.options.fontFamily};
        font-size: ${this.options.fontSize}px;
        line-height: ${this.options.lineHeight};
      }
      .rm-toolbar {
        position: sticky;
        top: 0;
        display: flex;
        justify-content: space-between;
        padding: 12px 24px;
        background: ${themeStyles.background};
        border-bottom: 1px solid ${themeStyles.border};
      }
      .rm-content {
        max-width: ${this.options.maxWidth}px;
        margin: 0 auto;
        padding: 40px 24px;
      }
      .rm-title {
        font-size: 2em;
        margin-bottom: 0.5em;
      }
      .rm-byline, .rm-site {
        color: ${themeStyles.secondary};
        font-size: 0.9em;
        margin-bottom: 2em;
      }
      .rm-article img {
        max-width: 100%;
        height: auto;
      }
      .rm-article p {
        margin-bottom: 1.5em;
      }
      .rm-article h2, .rm-article h3 {
        margin-top: 1.5em;
        margin-bottom: 0.5em;
      }
      .rm-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: ${themeStyles.text};
      }
    `;
    this.container?.appendChild(style);
  }

  private getThemeStyles(): Record<string, string> {
    const themes: Record<string, Record<string, string>> = {
      light: {
        background: '#ffffff',
        text: '#333333',
        secondary: '#666666',
        border: '#e0e0e0'
      },
      dark: {
        background: '#1a1a1a',
        text: '#e0e0e0',
        secondary: '#999999',
        border: '#333333'
      },
      sepia: {
        background: '#f4ecd8',
        text: '#5b4636',
        secondary: '#917c60',
        border: '#d4c4a8'
      }
    };
    return themes[this.options.theme];
  }

  private attachEventListeners(): void {
    // Close button
    this.container?.querySelector('.rm-close')?.addEventListener('click', () => {
      this.close();
    });

    // Settings toggle
    const settingsToggle = this.container?.querySelector('.rm-settings-toggle');
    const settingsPanel = this.container?.querySelector('.rm-settings-panel');
    
    settingsToggle?.addEventListener('click', () => {
      settingsPanel?.classList.toggle('hidden');
    });

    // Theme selector
    const themeSelect = this.container?.querySelector('.rm-theme') as HTMLSelectElement;
    themeSelect?.addEventListener('change', async () => {
      this.options.theme = themeSelect.value as ReadingModeOptions['theme'];
      await this.saveOptions();
      this.applyStyles();
    });

    // Font size slider
    const fontSizeInput = this.container?.querySelector('.rm-font-size') as HTMLInputElement;
    fontSizeInput?.addEventListener('input', async () => {
      this.options.fontSize = parseInt(fontSizeInput.value);
      await this.saveOptions();
      this.applyStyles();
    });

    // Escape key to close
    document.addEventListener('keydown', this.handleKeydown);
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.isActive) {
      this.close();
    }
  };
}
```

## Background Script Integration

Handle keyboard shortcuts and manage state:

```ts
// background.ts

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-reading-mode') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_READING_MODE' });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'READING_MODE_ENABLED') {
    chrome.action.setIcon({ path: 'icons/icon-active.png' });
  } else if (message.type === 'READING_MODE_DISABLED') {
    chrome.action.setIcon({ path: 'icons/icon.png' });
  }
});
```

## Performance Considerations

1. Lazy load content: Only extract content when user activates reading mode
2. Cache extractions: Store extracted content in sessionStorage to avoid re-parsing
3. Debounce settings: Save preferences with a debounce to reduce storage writes

```ts
// Debounce utility for settings
function debounce<T extends (...args: unknown[]) => Promise<void>>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}
```

## Conclusion

Building a reading mode extension requires careful content extraction, thoughtful UI design, and attention to user preferences. The patterns shown here provide a solid foundation for creating a polished reading experience that works across different websites and respects user customization choices.
