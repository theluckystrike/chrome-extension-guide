# Building Translation Extensions for Chrome

## Introduction

Translation extensions are among the most useful browser extensions, enabling users to instantly translate text across the web. Whether you're building a simple one-way translator or a sophisticated multilingual assistant, understanding the architecture patterns for translation extensions is essential. This guide covers building translation extensions using the Chrome Extension Manifest V3, TypeScript, and modern APIs.

## Architecture Overview

A translation extension typically consists of several key components:

1. **Popup UI** - Quick translation interface accessible from the toolbar
2. **Content Script** - Page-level translation (selections, hover translation)
3. **Background Service Worker** - Handles API calls, caching, and state management
4. **Options Page** - User preferences and language settings

## Core Translation Service

The foundation of any translation extension is the translation service. Here's a robust TypeScript implementation:

```typescript
// src/services/TranslationService.ts

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
}

export interface TranslationResponse {
  translatedText: string;
  detectedLang?: string;
  confidence?: number;
}

export type TranslationProvider = 'google' | 'deepl' | 'libre' | 'custom';

export class TranslationService {
  private apiKeys: Record<TranslationProvider, string>;
  private cache: Map<string, TranslationResponse>;
  private provider: TranslationProvider;

  constructor() {
    this.cache = new Map();
    this.provider = 'libre'; // Default to free/libre provider
    this.apiKeys = {} as Record<TranslationProvider, string>;
  }

  setApiKey(provider: TranslationProvider, key: string): void {
    this.apiKeys[provider] = key;
  }

  setProvider(provider: TranslationProvider): void {
    this.provider = provider;
  }

  private getCacheKey(request: TranslationRequest): string {
    return `${request.sourceLang}:${request.targetLang}:${request.text}`;
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const cacheKey = this.getCacheKey(request);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Call the appropriate provider
    let response: TranslationResponse;
    
    switch (this.provider) {
      case 'deepl':
        response = await this.translateWithDeepL(request);
        break;
      case 'libre':
        response = await this.translateWithLibreTranslate(request);
        break;
      default:
        response = await this.translateWithLibreTranslate(request);
    }

    // Cache the result
    this.cache.set(cacheKey, response);
    return response;
  }

  private async translateWithLibreTranslate(
    request: TranslationRequest
  ): Promise<TranslationResponse> {
    const endpoint = 'https://libretranslate.com/translate';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: request.text,
        source: request.sourceLang,
        target: request.targetLang,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`Translation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      translatedText: data.translatedText,
      detectedLang: data.detectedLanguage?.language
    };
  }

  private async translateWithDeepL(
    request: TranslationRequest
  ): Promise<TranslationResponse> {
    const endpoint = 'https://api-free.deepl.com/v2/translate';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKeys['deepl']}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        text: request.text,
        source_lang: request.sourceLang.toUpperCase(),
        target_lang: request.targetLang.toUpperCase()
      })
    });

    if (!response.ok) {
      throw new Error(`DeepL translation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      translatedText: data.translations[0].text,
      detectedLang: data.translations[0].detected_source_language?.toLowerCase()
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

## Language Detection

Modern translation extensions should auto-detect source language. Here's a language detection implementation:

```typescript
// src/services/LanguageDetection.ts

export interface DetectedLanguage {
  language: string;
  confidence: number;
}

export class LanguageDetector {
  private supportedLanguages = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
    'ar', 'hi', 'nl', 'pl', 'tr', 'vi', 'th', 'id', 'sv', 'da'
  ];

  /**
   * Simple character-based language detection
   * For production, use a proper ML model or API
   */
  detect(text: string): DetectedLanguage {
    // Check for CJK characters
    if (this.hasChineseCharacters(text)) {
      return { language: 'zh', confidence: 0.95 };
    }
    if (this.hasJapaneseCharacters(text)) {
      return { language: 'ja', confidence: 0.9 };
    }
    if (this.hasKoreanCharacters(text)) {
      return { language: 'ko', confidence: 0.9 };
    }
    if (this.hasCyrillic(text)) {
      return { language: 'ru', confidence: 0.85 };
    }
    if (this.hasArabicCharacters(text)) {
      return { language: 'ar', confidence: 0.9 };
    }
    if (this.hasHindiCharacters(text)) {
      return { language: 'hi', confidence: 0.9 };
    }

    // Fallback to common words analysis
    return this.detectByCommonWords(text);
  }

  private hasChineseCharacters(text: string): boolean {
    return /[\u4e00-\u9fff]/.test(text);
  }

  private hasJapaneseCharacters(text: string): boolean {
    return /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
  }

  private hasKoreanCharacters(text: string): boolean {
    return /[\uac00-\ud7af\u1100-\u11ff]/.test(text);
  }

  private hasCyrillic(text: string): boolean {
    return /[\u0400-\u04ff]/.test(text);
  }

  private hasArabicCharacters(text: string): boolean {
    return /[\u0600-\u06ff]/.test(text);
  }

  private hasHindiCharacters(text: string): boolean {
    return /[\u0900-\u097f]/.test(text);
  }

  private detectByCommonWords(text: string): DetectedLanguage {
    const textLower = text.toLowerCase();
    
    const languagePatterns: Record<string, RegExp[]> = {
      en: [/\bthe\b/i, /\band\b/i, /\bis\b/i, /\bto\b/i],
      es: [/\bel\b/i, /\bla\b/i, /\bde\b/i, /\bque\b/i],
      fr: [/\ble\b/i, /\bla\b/i, /\bde\b/i, /\bet\b/i],
      de: [/\bder\b/i, /\bdie\b/i, /\bdas\b/i, /\bund\b/i],
      it: [/\bdi\b/i, /\bche\b/i, /\bè\b/i, /\bla\b/i],
      pt: [/\bo\b/i, /\ba\b/i, /\bde\b/i, /\bem\b/i]
    };

    let bestMatch = { language: 'en', confidence: 0.3 };

    for (const [lang, patterns] of Object.entries(languagePatterns)) {
      let matches = 0;
      for (const pattern of patterns) {
        if (pattern.test(textLower)) matches++;
      }
      const confidence = matches / patterns.length;
      if (confidence > bestMatch.confidence) {
        bestMatch = { language: lang, confidence };
      }
    }

    return bestMatch;
  }

  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }
}
```

## Popup Implementation

The popup provides quick access to translation features:

```typescript
// src/popup/popup.ts

import { TranslationService, TranslationRequest } from '../services/TranslationService';
import { LanguageDetector } from '../services/LanguageDetection';

class PopupController {
  private translationService: TranslationService;
  private languageDetector: LanguageDetector;
  
  private sourceTextarea!: HTMLTextAreaElement;
  private targetTextarea!: HTMLTextAreaElement;
  private sourceLangSelect!: HTMLSelectElement;
  private targetLangSelect!: HTMLSelectElement;
  private swapButton!: HTMLButtonElement;
  private translateButton!: HTMLButtonElement;

  constructor() {
    this.translationService = new TranslationService();
    this.languageDetector = new LanguageDetector();
    this.init();
  }

  private async init(): Promise<void> {
    this.cacheElements();
    this.setupEventListeners();
    await this.loadUserPreferences();
    this.updateTargetLanguages();
  }

  private cacheElements(): void {
    this.sourceTextarea = document.getElementById('source-text') as HTMLTextAreaElement;
    this.targetTextarea = document.getElementById('target-text') as HTMLTextAreaElement;
    this.sourceLangSelect = document.getElementById('source-lang') as HTMLSelectElement;
    this.targetLangSelect = document.getElementById('target-lang') as HTMLSelectElement;
    this.swapButton = document.getElementById('swap-langs') as HTMLButtonElement;
    this.translateButton = document.getElementById('translate-btn') as HTMLButtonElement;
  }

  private setupEventListeners(): void {
    this.sourceTextarea.addEventListener('input', this.onSourceChange.bind(this));
    this.sourceLangSelect.addEventListener('change', this.updateTargetLanguages.bind(this));
    this.targetLangSelect.addEventListener('change', this.savePreferences.bind(this));
    this.swapButton.addEventListener('click', this.swapLanguages.bind(this));
    this.translateButton.addEventListener('click', this.translate.bind(this));

    // Keyboard shortcut: Enter to translate (with Ctrl/Cmd)
    this.sourceTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.translate();
      }
    });
  }

  private async onSourceChange(): Promise<void> {
    const text = this.sourceTextarea.value.trim();
    
    if (text.length > 10) {
      // Auto-detect language
      const detected = this.languageDetector.detect(text);
      if (detected.confidence > 0.5) {
        this.sourceLangSelect.value = detected.language;
      }
    }
  }

  private updateTargetLanguages(): void {
    const sourceLang = this.sourceLangSelect.value;
    const currentTarget = this.targetLangSelect.value;
    
    // Clear and repopulate target languages
    this.targetLangSelect.innerHTML = '';
    
    const languages = this.languageDetector.getSupportedLanguages();
    languages
      .filter(lang => lang !== sourceLang)
      .forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = this.getLanguageName(lang);
        this.targetLangSelect.appendChild(option);
      });

    // Restore previous selection if valid
    if (languages.includes(currentTarget) && currentTarget !== sourceLang) {
      this.targetLangSelect.value = currentTarget;
    } else {
      this.targetLangSelect.value = 'en'; // Default to English
    }
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch',
      it: 'Italiano', pt: 'Português', ru: 'Русский', ja: '日本語',
      ko: '한국어', zh: '中文', ar: 'العربية', hi: 'हिन्दी',
      nl: 'Nederlands', pl: 'Polski', tr: 'Türkçe', vi: 'Tiếng Việt'
    };
    return names[code] || code;
  }

  private async translate(): Promise<void> {
    const text = this.sourceTextarea.value.trim();
    if (!text) return;

    this.translateButton.disabled = true;
    this.translateButton.textContent = 'Translating...';

    try {
      const request: TranslationRequest = {
        text,
        sourceLang: this.sourceLangSelect.value,
        targetLang: this.targetLangSelect.value
      };

      const result = await this.translationService.translate(request);
      this.targetTextarea.value = result.translatedText;
      
      // Update detected language display if available
      if (result.detectedLang) {
        console.log(`Detected source language: ${result.detectedLang}`);
      }
    } catch (error) {
      console.error('Translation error:', error);
      this.targetTextarea.value = 'Translation failed. Please try again.';
    } finally {
      this.translateButton.disabled = false;
      this.translateButton.textContent = 'Translate';
    }
  }

  private swapLanguages(): void {
    const sourceLang = this.sourceLangSelect.value;
    const targetLang = this.targetLangSelect.value;
    const sourceText = this.sourceTextarea.value;
    const targetText = this.targetTextarea.value;

    this.sourceLangSelect.value = targetLang;
    this.targetLangSelect.value = sourceLang;
    this.sourceTextarea.value = targetText;
    this.targetTextarea.value = sourceText;

    this.updateTargetLanguages();
    this.savePreferences();
  }

  private async loadUserPreferences(): Promise<void> {
    const result = await chrome.storage.sync.get(['sourceLang', 'targetLang']);
    if (result.sourceLang) this.sourceLangSelect.value = result.sourceLang;
    if (result.targetLang) this.targetLangSelect.value = result.targetLang;
  }

  private async savePreferences(): Promise<void> {
    await chrome.storage.sync.set({
      sourceLang: this.sourceLangSelect.value,
      targetLang: this.targetLangSelect.value
    });
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
```

## Selection Translation (Content Script)

Allow users to translate selected text on any webpage:

```typescript
// src/content_scripts/selection-translator.ts

class SelectionTranslator {
  private tooltip: HTMLElement | null = null;
  private lastSelection: string = '';

  init(): void {
    document.addEventListener('mouseup', this.handleSelection.bind(this));
    document.addEventListener('mousedown', this.hideTooltip.bind(this));
    
    // Keyboard shortcut: Alt+T to translate selection
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 't') {
        this.translateSelection();
      }
    });
  }

  private handleSelection(event: MouseEvent): void {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 1 && text !== this.lastSelection) {
      this.lastSelection = text;
      this.showTooltip(event, text);
    }
  }

  private showTooltip(event: MouseEvent, text: string): void {
    this.hideTooltip();

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'translation-tooltip';
    this.tooltip.innerHTML = `
      <div class="tooltip-text">${this.escapeHtml(text.substring(0, 100))}${text.length > 100 ? '...' : ''}</div>
      <button class="translate-btn">Translate</button>
    `;

    // Position tooltip near selection
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      this.tooltip.style.position = 'fixed';
      this.tooltip.style.left = `${rect.left + window.scrollX}px`;
      this.tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
    }

    document.body.appendChild(this.tooltip);

    // Add click handler
    const btn = this.tooltip.querySelector('.translate-btn');
    btn?.addEventListener('click', () => this.translateSelection());
  }

  private async translateSelection(): Promise<void> {
    if (!this.lastSelection) return;

    try {
      // Send message to background script for translation
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE_TEXT',
        text: this.lastSelection
      });

      if (response?.translatedText) {
        this.showTranslationResult(response.translatedText);
      }
    } catch (error) {
      console.error('Translation error:', error);
    }
  }

  private showTranslationResult(translatedText: string): void {
    if (!this.tooltip) return;

    this.tooltip.innerHTML = `
      <div class="translation-result">${this.escapeHtml(translatedText)}</div>
      <div class="tooltip-actions">
        <button class="copy-btn">Copy</button>
        <button class="close-btn">×</button>
      </div>
    `;

    // Copy functionality
    this.tooltip.querySelector('.copy-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(translatedText);
      this.showCopyFeedback();
    });

    this.tooltip.querySelector('.close-btn')?.addEventListener('click', () => {
      this.hideTooltip();
    });
  }

  private showCopyFeedback(): void {
    const feedback = document.createElement('div');
    feedback.className = 'copy-feedback';
    feedback.textContent = 'Copied!';
    this.tooltip?.appendChild(feedback);
    setTimeout(() => feedback.remove(), 1500);
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize content script
new SelectionTranslator().init();
```

## Background Service Worker

Handle translation requests from content scripts and popup:

```typescript
// src/background/background.ts

import { TranslationService, TranslationRequest } from '../services/TranslationService';
import { LanguageDetector } from '../services/LanguageDetection';

const translationService = new TranslationService();
const languageDetector = new LanguageDetector();

// Initialize with default API keys from manifest
chrome.runtime.onInstalled.addListener(() => {
  // Load API keys from storage on startup
  chrome.storage.local.get(['apiKeys', 'preferredProvider'], (result) => {
    if (result.apiKeys) {
      Object.entries(result.apiKeys).forEach(([provider, key]) => {
        translationService.setApiKey(provider as any, key as string);
      });
    }
    if (result.preferredProvider) {
      translationService.setProvider(result.preferredProvider);
    }
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRANSLATE_TEXT') {
    handleTranslation(message.text, message.sourceLang, message.targetLang)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (message.type === 'DETECT_LANGUAGE') {
    const result = languageDetector.detect(message.text);
    sendResponse(result);
    return false;
  }

  if (message.type === 'GET_LANGUAGES') {
    sendResponse({
      supported: languageDetector.getSupportedLanguages()
    });
    return false;
  }
});

async function handleTranslation(
  text: string,
  sourceLang?: string,
  targetLang?: string
): Promise<{ translatedText: string; detectedLang?: string }> {
  // Auto-detect source language if not provided
  if (!sourceLang || sourceLang === 'auto') {
    const detection = languageDetector.detect(text);
    sourceLang = detection.language;
  }

  const request: TranslationRequest = {
    text,
    sourceLang,
    targetLang: targetLang || 'en'
  };

  const result = await translationService.translate(request);
  return {
    translatedText: result.translatedText,
    detectedLang: result.detectedLang
  };
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  // Open popup is handled by manifest, but we can do additional setup here
  console.log('Extension icon clicked for tab:', tab.id);
});
```

## Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Universal Translator",
  "version": "1.0.0",
  "description": "Translate text on any webpage instantly",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content_scripts/selection-translator.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "commands": {
    "translate-selection": {
      "suggested_key": {
        "default": "Alt+T",
        "mac": "Alt+T"
      },
      "description": "Translate selected text"
    }
  }
}
```

## Key Features Checklist

- [ ] Popup translation interface with language selectors
- [ ] Auto language detection for source text
- [ ] Selection translation via content script
- [ ] Keyboard shortcuts (Alt+T for selection translation)
- [ ] Translation caching to reduce API calls
- [ ] Multiple translation provider support
- [ ] User preferences persistence via chrome.storage
- [ ] Copy to clipboard functionality
- [ ] Error handling and user feedback

## Best Practices

1. **Use free APIs initially** - Start with LibreTranslate or Google Translate API's free tier
2. **Implement caching** - Reduce API calls and improve response times
3. **Handle rate limits** - Queue requests and show user-friendly errors
4. **Respect user privacy** - Don't send more data than necessary to translation APIs
5. **Support offline** - Cache common translations for offline access
6. **Provide feedback** - Show loading states and clear error messages

## Conclusion

Building a translation extension requires careful consideration of user experience, API integration, and performance. The patterns shown in this guide provide a solid foundation for creating a production-ready translation extension with features like auto-detection, selection translation, and multiple provider support.
