---
layout: default
title: "Chrome Extension Omnibox Api — Best Practices"
description: "Implement custom search suggestions in the Chrome omnibox (address bar)."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/omnibox-api/"
---

# Chrome Extension Omnibox API Patterns

The Chrome Omnibox API allows extensions to integrate deeply with the browser's address bar, providing custom suggestions and commands. This guide covers practical patterns for building powerful omnibox experiences.

## Overview {#overview}

The Omnibox API enables your extension to:
- Provide keyword-triggered suggestions in the address bar
- Execute commands or search through custom data
- Navigate users to specific pages or perform actions

**Manifest Declaration:**
```json
{
  "omnibox": {
    "keyword": "ext"
  }
}
```

---

## Pattern 1: Basic Omnibox Setup {#pattern-1-basic-omnibox-setup}

The foundation of any omnibox implementation involves three core event handlers that manage the user interaction lifecycle.

### Manifest Configuration {#manifest-configuration}

Define the keyword that triggers your extension in the omnibox:

```json
{
  "name": "My Extension",
  "version": "1.0.0",
  "omnibox": {
    "keyword": "ext"
  }
}
```

### Event Handlers {#event-handlers}

The omnibox interaction follows a clear lifecycle: activation → typing → selection.

```typescript
// src/omnibox/index.ts
import { OmniboxService } from '../services/OmniboxService';

const omniboxService = new OmniboxService();

/**
 * Fired when the user starts interacting with your extension's omnibox
 * by typing your keyword and pressing Tab or Space.
 */
chrome.omnibox.onInputStarted.addListener(() => {
  console.log('[Omnibox] Input started - user activated extension');
  omniboxService.onInputStarted();
});

/**
 * Fired whenever the user's input changes. Use this to provide
 * suggestions based on the current input text.
 */
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  omniboxService.onInputChanged(text, suggest);
});

/**
 * Fired when the user accepts one of your suggestions.
 * This is where you execute the actual action.
 */
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  omniboxService.onInputEntered(text, disposition);
});

/**
 * Optional: Handle when the user clears the omnibox
 */
chrome.omnibox.onInputCancelled.addListener(() => {
  console.log('[Omnibox] Input cancelled');
});
```

### Service Implementation {#service-implementation}

```typescript
// src/services/OmniboxService.ts
import { suggest, Suggestion } from '@theluckystrike/webext-omnibox';

export class OmniboxService {
  private defaultSuggestions: Suggestion[] = [
    { content: 'help', description: 'Show help' },
    { content: 'search ', description: 'Search...' },
  ];

  onInputStarted(): void {
    // Initialize any state needed
    console.log('Omnibox session started');
  }

  async onInputChanged(text: string, suggest: (suggestions: Suggestion[]) => void): Promise<void> {
    if (!text) {
      // Show default suggestions when no input
      suggest(this.defaultSuggestions);
      return;
    }

    // Filter suggestions based on input
    const filtered = this.defaultSuggestions.filter(s =>
      s.content.toLowerCase().includes(text.toLowerCase())
    );
    suggest(filtered);
  }

  onInputEntered(text: string, disposition: chrome.omnibox.OnInputEnteredDisposition): void {
    console.log(`User selected: ${text}, disposition: ${disposition}`);
    
    switch (text) {
      case 'help':
        this.openHelpPage();
        break;
      default:
        if (text.startsWith('search ')) {
          this.performSearch(text.replace('search ', ''));
        }
    }
  }

  private openHelpPage(): void {
    chrome.tabs.create({ url: 'pages/help.html' });
  }

  private performSearch(query: string): void {
    chrome.tabs.update({ url: `https://example.com/search?q=${encodeURIComponent(query)}` });
  }
}
```

---

## Pattern 2: Typed Suggestion Provider {#pattern-2-typed-suggestion-provider}

Provide contextual suggestions as users type, with proper XML formatting for rich display.

### SuggestResult Interface {#suggestresult-interface}

```typescript
import { Suggestion } from '@theluckystrike/webext-omnibox';

interface SuggestResult {
  /** The text displayed in the omnibox when selected */
  content: string;
  /** The description shown in the suggestion dropdown - supports XML tags */
  description: string;
  /** Whether the suggestion can be deleted by the user */
  deletable?: boolean;
  /** Optional: URL for navigation suggestions */
  url?: string;
}
```

### XML Formatting Tags {#xml-formatting-tags}

The description supports several XML tags for styling:

- `<match>` - Highlights matching text in bold
- `<dim>` - Displays text in gray/secondary color
- `<url>` - Displays text as a URL (blue, underlined)

```typescript
// src/services/SuggestionProvider.ts

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  type: 'page' | 'bookmark' | 'recent';
}

export class SuggestionProvider {
  /**
   * Convert search results to omnibox suggestions with XML formatting
   */
  resultsToSuggestions(results: SearchResult[], query: string): Suggestion[] {
    return results.slice(0, 5).map((result, index) => ({
      content: result.url,
      description: this.formatDescription(result, query, index === 0),
      deletable: result.type === 'recent',
    }));
  }

  /**
   * Format description with XML tags for rich display
   */
  private formatDescription(result: SearchResult, query: string, isFirst: boolean): string {
    const typeIcon = result.type === 'bookmark' ? '★ ' : result.type === 'recent' ? '⏱ ' : '📄 ';
    const title = this.highlightMatch(result.title, query);
    
    return `${typeIcon}${title}<dim> — ${this.truncateUrl(result.url)}</dim>`;
  }

  /**
   * Highlight matching text using <match> tag
   */
  private highlightMatch(text: string, query: string): string {
    if (!query) return this.escapeXml(text);
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return this.escapeXml(text);
    
    const before = this.escapeXml(text.substring(0, index));
    const match = this.escapeXml(text.substring(index, index + query.length));
    const after = this.escapeXml(text.substring(index + query.length));
    
    return `${before}<match>${match}</match>${after}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Truncate long URLs for display
   */
  private truncateUrl(url: string, maxLength: number = 50): string {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  }
}
```

### Usage Example {#usage-example}

```typescript
// src/omnibox/search.ts
import { SuggestionProvider, SearchResult } from '../services/SuggestionProvider';
import { storage } from '@theluckystrike/webext-storage';

const provider = new SuggestionProvider();

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  if (!text || text.length < 2) {
    suggest([]);
    return;
  }

  // Fetch from storage or search index
  const results = await searchBookmarks(text);
  const suggestions = provider.resultsToSuggestions(results, text);
  
  suggest(suggestions);
});

async function searchBookmarks(query: string): Promise<SearchResult[]> {
  // Search implementation
  return [];
}
```

---

## Pattern 3: Async Search with Debounce {#pattern-3-async-search-with-debounce}

Avoid excessive API calls by debouncing user input and showing loading states.

### Debounce Implementation {#debounce-implementation}

```typescript
// src/utils/debounce.ts

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}
```

### Async Search Service {#async-search-service}

```typescript
// src/services/AsyncSearchService.ts
import { debounce } from '../utils/debounce';
import { Suggestion } from '@theluckystrike/webext-omnibox';
import { storage } from '@theluckystrike/webext-storage';

export interface SearchableItem {
  id: string;
  title: string;
  url: string;
  tags: string[];
}

export class AsyncSearchService {
  private debouncedSearch: ReturnType<typeof debounce>;
  private lastQuery: string = '';

  constructor() {
    // Debounce input changes by 150ms
    this.debouncedSearch = debounce(this.performSearch.bind(this), 150);
  }

  async handleInput(text: string, suggest: (suggestions: Suggestion[]) => void): Promise<void> {
    if (!text.trim()) {
      // Show recent searches when empty
      const recent = await this.getRecentSearches();
      suggest(this.recentToSuggestions(recent));
      return;
    }

    // Show loading placeholder while fetching
    suggest([{
      content: '',
      description: '<dim>Searching...</dim>',
    }]);

    this.lastQuery = text;
    this.debouncedSearch(text, suggest);
  }

  private async performSearch(
    text: string, 
    suggest: (suggestions: Suggestion[]) => void
  ): Promise<void> {
    // Skip if query changed while debouncing
    if (text !== this.lastQuery) return;

    try {
      const results = await this.searchItems(text);
      const suggestions = this.formatResults(results);
      suggest(suggestions);
    } catch (error) {
      console.error('Search failed:', error);
      suggest([{
        content: '',
        description: '<dim>Search failed. Try again.</dim>',
      }]);
    }
  }

  private async searchItems(query: string): Promise<SearchableItem[]> {
    // Example: search from chrome.storage
    const data = await storage.get<{ items: SearchableItem[] }>('searchIndex');
    const items = data?.items ?? [];
    
    const lowerQuery = query.toLowerCase();
    return items.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) ||
      item.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  private formatResults(results: SearchableItem[]): Suggestion[] {
    return results.slice(0, 5).map(item => ({
      content: item.url,
      description: this.escapeXml(item.title),
      deletable: true,
    }));
  }

  private async getRecentSearches(): Promise<string[]> {
    const data = await storage.get<{ recent: string[] }>('recentSearches');
    return data?.recent ?? [];
  }

  private recentToSuggestions(recent: string[]): Suggestion[] {
    return recent.slice(0, 5).map(query => ({
      content: query,
      description: `<dim>Recent:</dim> ${this.escapeXml(query)}`,
    }));
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
```

---

## Pattern 4: Command Router Pattern {#pattern-4-command-router-pattern}

Implement subcommands for a more powerful CLI-like interface in the omnibox.

### Command Router {#command-router}

```typescript
// src/services/CommandRouter.ts

export interface Command {
  name: string;
  description: string;
  usage: string;
  handler: CommandHandler;
}

export type CommandHandler = (
  args: string,
  disposition: chrome.omnibox.OnInputEnteredDisposition
) => void | Promise<void>;

export interface ParsedCommand {
  command: string;
  args: string;
}

export class CommandRouter {
  private commands: Map<string, Command> = new Map();

  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  /**
   * Parse input into command and arguments
   * Input: "search my query" -> { command: "search", args: "my query" }
   */
  parse(input: string): ParsedCommand {
    const parts = input.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase() ?? '';
    const args = parts.slice(1).join(' ');
    return { command, args };
  }

  /**
   * Route input to appropriate command handler
   */
  async route(
    input: string,
    disposition: chrome.omnibox.OnInputEnteredDisposition
  ): Promise<void> {
    const { command, args } = this.parse(input);
    
    const handler = this.commands.get(command);
    if (handler) {
      await handler.handler(args, disposition);
    } else {
      console.warn(`Unknown command: ${command}`);
    }
  }

  /**
   * Get suggestions for command input
   */
  getSuggestions(input: string): Array<{ content: string; description: string }> {
    const { command, args } = this.parse(input);

    if (!command) {
      // Show all available commands
      return Array.from(this.commands.values()).map(cmd => ({
        content: cmd.name,
        description: `${cmd.description} <dim>${cmd.usage}</dim>`,
      }));
    }

    // Filter commands by prefix
    const matches = Array.from(this.commands.values()).filter(cmd =>
      cmd.name.startsWith(command.toLowerCase())
    );

    if (matches.length === 1 && matches[0].name === command) {
      // Show command-specific argument suggestions
      return this.getArgumentSuggestions(matches[0], args);
    }

    return matches.map(cmd => ({
      content: cmd.name,
      description: `${cmd.description} <dim>${cmd.usage}</dim>`,
    }));
  }

  private getArgumentSuggestions(
    command: Command,
    args: string
  ): Array<{ content: string; description: string }> {
    // Override in subclass for custom argument completion
    return [];
  }
}
```

### Complete Implementation {#complete-implementation}

```typescript
// src/omnibox/commands.ts
import { CommandRouter, Command } from '../services/CommandRouter';
import { storage } from '@theluckystrike/webext-storage';
import { messenger } from '@theluckystrike/webext-messaging';

const router = new CommandRouter();

// Register commands
router.register({
  name: 'search',
  description: 'Search bookmarks and history',
  usage: 'search <query>',
  handler: async (args) => {
    if (!args) {
      console.log('Search requires a query');
      return;
    }
    const url = `https://example.com/search?q=${encodeURIComponent(args)}`;
    chrome.tabs.update({ url });
  },
});

router.register({
  name: 'settings',
  description: 'Open extension settings',
  usage: 'settings',
  handler: () => {
    chrome.tabs.create({ url: 'pages/settings.html' });
  },
});

router.register({
  name: 'history',
  description: 'Show recent searches',
  usage: 'history',
  handler: async (_, disposition) => {
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    const recent = await storage.get<{ searches: string[] }>('recentSearches');
    // Display recent in side panel or popup
    messenger.sendToContent('show-history', { searches: recent?.searches ?? [] });
  },
});

router.register({
  name: 'clear',
  description: 'Clear search history',
  usage: 'clear history',
  handler: async () => {
    await storage.set('recentSearches', { searches: [] });
    console.log('History cleared');
  },
});

router.register({
  name: 'open',
  description: 'Open a saved bookmark',
  usage: 'open <name>',
  handler: async (args) => {
    const bookmarks = await storage.get<{ bookmarks: Record<string, string> }>('bookmarks');
    const url = bookmarks?.bookmarks?.[args.toLowerCase()];
    if (url) {
      chrome.tabs.update({ url });
    }
  },
});

// Omnibox event handlers
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const suggestions = router.getSuggestions(text);
  suggest(suggestions);
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  router.route(text, disposition);
});
```

---

## Pattern 5: History and Recent Searches {#pattern-5-history-and-recent-searches}

Store and display recent queries for better user experience.

### History Service {#history-service}

```typescript
// src/services/HistoryService.ts
import { storage } from '@theluckystrike/webext-storage';

const MAX_HISTORY = 20;

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  resultCount: number;
}

export class HistoryService {
  private storageKey = 'omniboxHistory';

  /**
   * Add a search query to history
   */
  async addToHistory(query: string, resultCount: number = 0): Promise<void> {
    if (!query.trim()) return;

    const history = await this.getHistory();
    
    // Remove duplicate if exists
    const filtered = history.filter(entry => entry.query !== query);
    
    // Add new entry at the beginning
    filtered.unshift({
      query: query.trim(),
      timestamp: Date.now(),
      resultCount,
    });

    // Trim to max size
    const trimmed = filtered.slice(0, MAX_HISTORY);
    
    await storage.set(this.storageKey, { history: trimmed });
  }

  /**
   * Get all history entries
   */
  async getHistory(): Promise<SearchHistoryEntry[]> {
    const data = await storage.get<{ history: SearchHistoryEntry[] }>(this.storageKey);
    return data?.history ?? [];
  }

  /**
   * Get recent queries for display
   */
  async getRecentQueries(limit: number = 5): Promise<string[]> {
    const history = await this.getHistory();
    return history.slice(0, limit).map(entry => entry.query);
  }

  /**
   * Clear all history
   */
  async clearHistory(): Promise<void> {
    await storage.set(this.storageKey, { history: [] });
  }

  /**
   * Search within history
   */
  async searchHistory(query: string): Promise<SearchHistoryEntry[]> {
    const history = await this.getHistory();
    const lowerQuery = query.toLowerCase();
    return history.filter(entry => 
      entry.query.toLowerCase().includes(lowerQuery)
    );
  }
}
```

### Integration with Omnibox {#integration-with-omnibox}

```typescript
// src/omnibox/withHistory.ts
import { HistoryService } from '../services/HistoryService';
import { Suggestion } from '@theluckystrike/webext-omnibox';

const historyService = new HistoryService();

export async function handleOmniboxInput(
  text: string,
  suggest: (suggestions: Suggestion[]) => void
): Promise<void> {
  if (!text.trim()) {
    // Show recent searches when empty
    const recent = await historyService.getRecentQueries(5);
    const suggestions: Suggestion[] = recent.map(query => ({
      content: query,
      description: `<dim>Recent search:</dim> ${escapeXml(query)}`,
    }));
    suggest(suggestions);
    return;
  }

  // Regular search with history tracking
  const results = await performSearch(text);
  
  // Add to history when user selects a result
  chrome.omnibox.onInputEntered.addListener((selected, disposition) => {
    if (selected) {
      historyService.addToHistory(text, results.length);
    }
  });
  
  suggest(formatResults(results));
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function performSearch(query: string): Promise<unknown[]> {
  // Implementation
  return [];
}

function formatResults(results: unknown[]): Suggestion[] {
  // Implementation
  return [];
}
```

---

## Pattern 6: Rich Result Formatting {#pattern-6-rich-result-formatting}

Create visually appealing suggestions with proper XML formatting and truncation.

### Formatting Utilities {#formatting-utilities}

```typescript
// src/utils/formatting.ts

export interface FormattedSuggestion {
  content: string;
  description: string;
  deletable?: boolean;
}

/**
 * Escape XML special characters in user-provided text
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Highlight matching text in suggestions
 */
export function highlightMatch(text: string, query: string): string {
  if (!query) return escapeXml(text);
  
  const escaped = escapeXml(text);
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  
  let result = '';
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery);
  
  while (index !== -1) {
    // Add text before match
    result += escapeXml(text.substring(lastIndex, index));
    // Add highlighted match
    result += `<match>${escapeXml(text.substring(index, index + query.length))}</match>`;
    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }
  
  // Add remaining text
  result += escapeXml(text.substring(lastIndex));
  
  return result;
}

/**
 * Truncate text to maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format a URL for display
 */
export function formatUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;
    const display = parsed.hostname + (path !== '/' ? path : '');
    return truncate(display, 50);
  } catch {
    return truncate(url, 50);
  }
}

/**
 * Create a styled suggestion with various elements
 */
export function createSuggestion(
  content: string,
  options: {
    title?: string;
    subtitle?: string;
    url?: string;
    icon?: string;
    match?: string;
    dim?: boolean;
  }
): FormattedSuggestion {
  const parts: string[] = [];

  // Add icon if provided
  if (options.icon) {
    parts.push(options.icon + ' ');
  }

  // Add title with optional match highlighting
  if (options.title) {
    const title = options.match 
      ? highlightMatch(options.title, options.match)
      : escapeXml(options.title);
    parts.push(options.dim ? `<dim>${title}</dim>` : title);
  }

  // Add subtitle
  if (options.subtitle) {
    parts.push(`<dim>${escapeXml(options.subtitle)}</dim>`);
  }

  // Add URL
  if (options.url) {
    parts.push(`<url>${formatUrl(options.url)}</url>`);
  }

  return {
    content,
    description: parts.join(' — '),
  };
}
```

### Complete Example {#complete-example}

```typescript
// src/services/RichSuggestionService.ts
import { 
  FormattedSuggestion, 
  createSuggestion, 
  highlightMatch,
  escapeXml,
  formatUrl 
} from '../utils/formatting';

interface Bookmark {
  id: string;
  title: string;
  url: string;
  folder: string;
}

export class RichSuggestionService {
  /**
   * Convert bookmarks to rich suggestions
   */
  bookmarkToSuggestions(
    bookmarks: Bookmark[], 
    query: string
  ): FormattedSuggestion[] {
    return bookmarks.slice(0, 5).map(bookmark => 
      createSuggestion(bookmark.url, {
        title: bookmark.title,
        subtitle: bookmark.folder,
        url: bookmark.url,
        match: query,
      })
    );
  }

  /**
   * Create suggestion with URL styling
   */
  urlSuggestion(url: string, title?: string): FormattedSuggestion {
    const displayTitle = title || formatUrl(url);
    return {
      content: url,
      description: `<url>${escapeXml(displayTitle)}</url>`,
    };
  }

  /**
   * Create suggestion with dimmed secondary text
   */
  dimmedSuggestion(content: string, primary: string, secondary: string): FormattedSuggestion {
    return {
      content,
      description: `${escapeXml(primary)} <dim>${escapeXml(secondary)}</dim>`,
    };
  }

  /**
   * Create suggestion with match highlighting
   */
  matchingSuggestion(content: string, text: string, query: string): FormattedSuggestion {
    return {
      content,
      description: highlightMatch(text, query),
    };
  }
}
```

---

## Pattern 7: Default Suggestion Management {#pattern-7-default-suggestion-management}

The default suggestion appears in the address bar itself (not in the dropdown) and provides context-aware hints.

### Default Suggestion Service {#default-suggestion-service}

```typescript
// src/services/DefaultSuggestionService.ts

export interface DefaultSuggestion {
  description: string;
}

export class DefaultSuggestionService {
  private currentSuggestion: DefaultSuggestion = {
    description: 'Type to search...',
  };

  /**
   * Set the default suggestion displayed in the omnibox
   */
  setDefaultSuggestion(suggestion: DefaultSuggestion): void {
    this.currentSuggestion = suggestion;
    chrome.omnibox.setDefaultSuggestion(suggestion);
  }

  /**
   * Update based on current input
   */
  updateForInput(text: string): void {
    if (!text) {
      this.setDefaultSuggestion({
        description: 'Type to search or select a command...',
      });
      return;
    }

    const { command } = this.parseCommand(text);
    
    switch (command) {
      case 'search':
        this.setDefaultSuggestion({
          description: 'Press Enter to search for: ' + this.escape(text.replace(/^search\s*/, '')),
        });
        break;
      case 'open':
        this.setDefaultSuggestion({
          description: 'Press Enter to open bookmark: ' + this.escape(text.replace(/^open\s*/, '')),
        });
        break;
      case 'settings':
        this.setDefaultSuggestion({
          description: 'Press Enter to open settings',
        });
        break;
      default:
        this.setDefaultSuggestion({
          description: 'Press Enter to execute',
        });
    }
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.setDefaultSuggestion({
      description: 'Type to search or select a command...',
    });
  }

  private parseCommand(input: string): { command: string; args: string } {
    const parts = input.trim().split(/\s+/);
    return {
      command: parts[0]?.toLowerCase() ?? '',
      args: parts.slice(1).join(' '),
    };
  }

  private escape(text: string): string {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
```

### Integration {#integration}

```typescript
// src/omnibox/defaultSuggestion.ts
import { DefaultSuggestionService } from '../services/DefaultSuggestionService';

const defaultService = new DefaultSuggestionService();

// Update default suggestion on input
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  defaultService.updateForInput(text);
  // ... also provide suggestions
});

// Reset when user cancels
chrome.omnibox.onInputCancelled.addListener(() => {
  defaultService.reset();
});

// Reset when input starts fresh
chrome.omnibox.onInputStarted.addListener(() => {
  defaultService.reset();
});
```

### Context-Aware Examples {#context-aware-examples}

```typescript
// Context-specific default suggestions

const contextDefaults: Record<string, DefaultSuggestion> = {
  empty: { description: 'Type to search bookmarks and history...' },
  search: { description: 'Press Enter to search' },
  command: { description: 'Select a command or press Enter' },
  error: { description: '<dim>No results found. Try different keywords.</dim>' },
};

function getDefaultForContext(input: string, hasResults: boolean): DefaultSuggestion {
  if (!input) return contextDefaults.empty;
  if (!hasResults) return contextDefaults.error;
  
  const cmd = input.split(/\s/)[0].toLowerCase();
  if (cmd === 'search') return contextDefaults.search;
  
  return contextDefaults.command;
}
```

---

## Pattern 8: Omnibox to Tab Navigation {#pattern-8-omnibox-to-tab-navigation}

Handle different ways to open results based on user preference and context.

### Tab Navigation Service {#tab-navigation-service}

```typescript
// src/services/TabNavigationService.ts

export type TabDisposition = 'currentTab' | 'newForegroundTab' | 'newBackgroundTab';

export interface NavigationOptions {
  url: string;
  disposition?: TabDisposition;
  active?: boolean;        // For new tabs: should be active
  pinned?: boolean;         // Pin the new tab
  openerTabId?: number;     // Associate with opener tab
}

export class TabNavigationService {
  /**
   * Navigate to URL with specified disposition
   */
  async navigate(options: NavigationOptions): Promise<chrome.tabs.Tab> {
    const disposition = options.disposition ?? 'currentTab';
    
    switch (disposition) {
      case 'currentTab':
        return this.openInCurrentTab(options.url);
      case 'newForegroundTab':
        return this.openInNewForegroundTab(options.url, options.pinned);
      case 'newBackgroundTab':
        return this.openInNewBackgroundTab(options.url, options.pinned);
      default:
        return this.openInCurrentTab(options.url);
    }
  }

  /**
   * Open URL in the current tab
   */
  async openInCurrentTab(url: string): Promise<chrome.tabs.Tab> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab.id) {
      return chrome.tabs.update(tab.id, { url, active: true });
    }
    
    return chrome.tabs.create({ url, active: true });
  }

  /**
   * Open URL in a new foreground tab
   */
  async openInNewForegroundTab(url: string, pinned: boolean = false): Promise<chrome.tabs.Tab> {
    return chrome.tabs.create({ url, active: true, pinned });
  }

  /**
   * Open URL in a new background tab
   */
  async openInNewBackgroundTab(url: string, pinned: boolean = false): Promise<chrome.tabs.Tab> {
    return chrome.tabs.create({ url, active: false, pinned });
  }

  /**
   * Open extension page
   */
  async openExtensionPage(page: string): Promise<chrome.tabs.Tab> {
    const url = chrome.runtime.getURL(page);
    return this.navigate({ url, disposition: 'currentTab' });
  }

  /**
   * Open with keyboard modifier consideration
   */
  async openWithModifiers(
    url: string, 
    disposition: chrome.omnibox.OnInputEnteredDisposition
  ): Promise<chrome.tabs.Tab> {
    const tabDisposition = this.mapDisposition(disposition);
    return this.navigate({ url, disposition: tabDisposition });
  }

  /**
   * Map omnibox disposition to our type
   */
  private mapDisposition(
    disposition: chrome.omnibox.OnInputEnteredDisposition
  ): TabDisposition {
    switch (disposition) {
      case 'currentTab':
        return 'currentTab';
      case 'newForegroundTab':
        return 'newForegroundTab';
      case 'newBackgroundTab':
        return 'newBackgroundTab';
      default:
        return 'currentTab';
    }
  }
}
```

### Complete Integration {#complete-integration}

```typescript
// src/omnibox/navigation.ts
import { TabNavigationService, NavigationOptions } from '../services/TabNavigationService';
import { messenger } from '@theluckystrike/webext-messaging';

const navService = new TabNavigationService();

interface SearchResult {
  url: string;
  title: string;
  type: 'bookmark' | 'history' | 'page';
}

// Main navigation handler
async function handleSelection(
  result: SearchResult,
  disposition: chrome.omnibox.OnInputEnteredDisposition
): Promise<void> {
  // Handle special result types
  if (result.type === 'bookmark') {
    await navService.openWithModifiers(result.url, disposition);
    return;
  }

  // Handle regular navigation
  const options: NavigationOptions = {
    url: result.url,
    disposition: mapDisposition(disposition),
  };

  await navService.navigate(options);
}

// Handle the omnibox enter event
chrome.omnibox.onInputEntered.addListener((text, disposition) => {
  const result = parseSelectedSuggestion(text);
  if (result) {
    handleSelection(result, disposition);
  }
});

function mapDisposition(
  disposition: chrome.omnibox.OnInputEnteredDisposition
): 'currentTab' | 'newForegroundTab' | 'newBackgroundTab' {
  switch (disposition) {
    case 'currentTab':
      return 'currentTab';
    case 'newForegroundTab':
      return 'newForegroundTab';
    case 'newBackgroundTab':
      return 'newBackgroundTab';
    default:
      return 'currentTab';
  }
}

function parseSelectedSuggestion(text: string): SearchResult | null {
  // Parse the content back to result
  try {
    return JSON.parse(text);
  } catch {
    return { url: text, title: text, type: 'page' };
  }
}
```

### Deep Linking to Extension Pages {#deep-linking-to-extension-pages}

```typescript
// Deep linking utilities

export function createDeepLink(path: string, params?: Record<string, string>): string {
  const url = new URL(chrome.runtime.getURL(path));
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return url.toString();
}

// Example usage in omnibox
router.register({
  name: 'settings',
  description: 'Open settings',
  usage: 'settings',
  handler: () => {
    const url = createDeepLink('pages/settings.html', { tab: 'general' });
    navService.navigate({ url, disposition: 'currentTab' });
  },
});

router.register({
  name: 'help',
  description: 'View help',
  usage: 'help [topic]',
  handler: (args) => {
    const url = createDeepLink('pages/help.html', { topic: args || 'index' });
    navService.navigate({ url, disposition: 'currentTab' });
  },
});
```

---

## Summary Table {#summary-table}

| Pattern | Use Case | Key APIs |
|---------|----------|----------|
| **Basic Setup** | Simple keyword-triggered search | `onInputStarted`, `onInputChanged`, `onInputEntered` |
| **Typed Suggestions** | Rich suggestions with XML formatting | `SuggestResult`, `<match>`, `<dim>`, `<url>` |
| **Async with Debounce** | Search APIs without rate limiting | `setTimeout`, loading placeholders |
| **Command Router** | CLI-like subcommands | Command pattern, parsing |
| **History** | Recent searches | `chrome.storage.session` |
| **Rich Formatting** | Beautiful suggestions | XML tags, truncation |
| **Default Suggestion** | Context-aware hints | `setDefaultSuggestion` |
| **Tab Navigation** | Open results appropriately | `disposition`, tab creation |

### Key Best Practices {#key-best-practices}

1. **Always escape XML** in user-provided content to prevent rendering issues
2. **Limit suggestions** to 5-6 results for optimal UX
3. **Debounce async operations** to avoid excessive API calls
4. **Use `setDefaultSuggestion`** for contextual hints
5. **Handle all dispositions** properly (currentTab, newForegroundTab, newBackgroundTab)
6. **Store recent searches** in session storage for privacy
7. **Provide meaningful defaults** when no input is given
