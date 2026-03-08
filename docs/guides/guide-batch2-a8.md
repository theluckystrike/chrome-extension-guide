# Email Checker Extension Guide

## Overview

Email checker extensions are powerful tools that help users validate, verify, and manage email addresses directly from their browser. These extensions can detect email addresses on webpages, validate their format, check if they're from disposable email providers, verify if emails are deliverable, and even integrate with email verification APIs. This guide covers the architecture, implementation patterns, and best practices for building a robust email checker extension using TypeScript and Chrome's APIs.

## Core Architecture

An email checker extension typically consists of several key components working together:

1. **Content Script** - Detects and extracts email addresses from webpage content
2. **Background Service Worker** - Handles API calls, caching, and long-running tasks
3. **Popup UI** - Provides user interface for manual email checking
4. **Options Page** - Configures API keys, preferences, and notification settings
5. **Storage Layer** - Persists user preferences and checking history

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Email Checker Pro",
  "version": "1.0.0",
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "contextMenus"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

## Email Detection Pattern

The content script scans webpages for email addresses using regex patterns and DOM traversal:

```typescript
// content/email-detector.ts

interface EmailMatch {
  email: string;
  element: Element;
  position: { x: number; y: number };
}

class EmailDetector {
  private emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private processedElements = new WeakSet<Element>();

  /**
   * Scans the entire page for email addresses
   */
  scanPage(): EmailMatch[] {
    const matches: EmailMatch[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node: Text) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          // Skip script, style, and already processed elements
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'textarea', 'input'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (this.processedElements.has(parent)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return this.emailPattern.test(node.textContent || '') 
            ? NodeFilter.FILTER_ACCEPT 
            : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const text = node.textContent || '';
      let match: RegExpExecArray | null;
      
      // Reset regex state
      this.emailPattern.lastIndex = 0;
      
      while ((match = this.emailPattern.exec(text)) !== null) {
        const parent = node!.parentElement;
        if (parent) {
          this.processedElements.add(parent);
          
          const rect = parent.getBoundingClientRect();
          matches.push({
            email: match[0],
            element: parent,
            position: {
              x: rect.left + window.scrollX,
              y: rect.top + window.scrollY
            }
          });
        }
      }
    }

    return matches;
  }

  /**
   * Adds visual indicators to detected emails
   */
  highlightEmails(matches: EmailMatch[]): void {
    matches.forEach(({ email, element }) => {
      element.classList.add('email-detected');
      element.dataset.originalTitle = element.title || '';
      element.title = `Click to verify: ${email}`;
    });
  }
}

// Initialize when DOM is ready
const detector = new EmailDetector();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'scanPage') {
    const emails = detector.scanPage();
    detector.highlightEmails(emails);
    sendResponse({ emails });
  }
  return true;
});
```

## Email Verification Service Integration

The background service worker handles API calls to email verification services:

```typescript
// background/email-verifier.ts

interface VerificationResult {
  email: string;
  isValid: boolean;
  isDisposable: boolean;
  isRisky: boolean;
  score: number;
  details?: {
    mxRecords: boolean;
    catchAll: boolean;
    roleBased: boolean;
    freeProvider: boolean;
  };
}

interface ApiConfig {
  apiKey: string;
  provider: 'abstractapi' | 'hunter' | 'mailboxlayer' | 'zerobounce';
}

class EmailVerificationService {
  private cache = new Map<string, { result: VerificationResult; timestamp: number }>();
  private cacheDuration = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Verify an email address using external API
   */
  async verifyEmail(email: string, config: ApiConfig): Promise<VerificationResult> {
    // Check cache first
    const cached = this.cache.get(email);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.result;
    }

    let result: VerificationResult;

    switch (config.provider) {
      case 'abstractapi':
        result = await this.verifyWithAbstractApi(email, config.apiKey);
        break;
      case 'hunter':
        result = await this.verifyWithHunter(email, config.apiKey);
        break;
      case 'mailboxlayer':
        result = await this.verifyWithMailboxLayer(email, config.apiKey);
        break;
      case 'zerobounce':
        result = await this.verifyWithZeroBounce(email, config.apiKey);
        break;
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }

    // Cache the result
    this.cache.set(email, { result, timestamp: Date.now() });
    
    // Save to extension storage for persistence
    await this.saveToHistory(email, result);
    
    return result;
  }

  private async verifyWithAbstractApi(email: string, apiKey: string): Promise<VerificationResult> {
    const response = await fetch(
      `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      email,
      isValid: data.is_valid_format.value && data.is_mx_found.value,
      isDisposable: data.is_disposable_email.value,
      isRisky: data.is_risky_email.value,
      score: data.quality_score || 0,
      details: {
        mxRecords: data.is_mx_found.value,
        catchAll: data.is_catch_all_email.value,
        roleBased: data.is_role_based_email.value,
        freeProvider: data.is_free_email.value
      }
    };
  }

  private async verifyWithHunter(email: string, apiKey: string): Promise<VerificationResult> {
    const response = await fetch(
      `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`
    );
    
    const data = await response.json();
    
    return {
      email,
      isValid: data.data?.status === 'valid',
      isDisposable: false, // Hunter doesn't provide this
      isRisky: data.data?.result === 'risky',
      score: data.data?.score ? data.data.score * 100 : 0,
      details: {
        mxRecords: true, // Assumed if valid
        catchAll: data.data?.catch_all || false,
        roleBased: data.data?.role || false,
        freeProvider: data.data?.free || false
      }
    };
  }

  private async verifyWithMailboxLayer(email: string, apiKey: string): Promise<VerificationResult> {
    const response = await fetch(
      `http://apilayer.net/api/check?access_key=${apiKey}&email=${encodeURIComponent(email)}`
    );
    
    const data = await response.json();
    
    return {
      email,
      isValid: data.format_valid && data.smtp_check,
      isDisposable: data.disposable,
      isRisky: !data.smtp_check,
      score: data.score || 0,
      details: {
        mxRecords: data.mx_found,
        catchAll: data.catch_all,
        roleBased: data.role,
        freeProvider: data.free
      }
    };
  }

  private async verifyWithZeroBounce(email: string, apiKey: string): Promise<VerificationResult> {
    const response = await fetch(
      `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`
    );
    
    const data = await response.json();
    
    return {
      email,
      isValid: data.status === 'valid',
      isDisposable: data.sub_status === 'disposable' || data.sub_status === 'toxic',
      isRisky: data.status === 'risky' || data.status === 'do_not_mail',
      score: data.quality_score ? data.quality_score * 100 : 0,
      details: {
        mxRecords: data.mx_found,
        catchAll: data.catch_all,
        roleBased: data.role,
        freeProvider: data.free_email
      }
    };
  }

  /**
   * Save verification result to extension storage
   */
  private async saveToHistory(email: string, result: VerificationResult): Promise<void> {
    const { history = [] } = await chrome.storage.local.get('history');
    
    const newEntry = {
      email,
      result,
      timestamp: Date.now()
    };
    
    // Keep only last 100 entries
    const updatedHistory = [newEntry, ...history].slice(0, 100);
    
    await chrome.storage.local.set({ history: updatedHistory });
  }
}

export const verifier = new EmailVerificationService();
```

## Context Menu Integration

Add email verification to the right-click menu:

```typescript
// background/context-menu.ts

function setupContextMenu(): void {
  chrome.contextMenus.create({
    id: 'verifyEmail',
    title: 'Verify Email Address',
    contexts: ['page', 'selection', 'link']
  });

  chrome.contextMenus.create({
    id: 'verifyAllEmails',
    title: 'Verify All Emails on Page',
    contexts: ['page']
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;

    switch (info.menuItemId) {
      case 'verifyEmail':
        if (info.selectionText && isValidEmail(info.selectionText)) {
          await verifySingleEmail(info.selectionText, tab.id);
        } else if (info.linkUrl && isValidEmail(info.linkUrl)) {
          await verifySingleEmail(info.linkUrl, tab.id);
        }
        break;

      case 'verifyAllEmails':
        await chrome.tabs.sendMessage(tab.id, { action: 'scanPage' });
        break;
    }
  });
}

function isValidEmail(text: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(text.trim());
}

async function verifySingleEmail(email: string, tabId: number): Promise<void> {
  const config = await getApiConfig();
  if (!config?.apiKey) {
    showNotification('Please configure your API key in extension settings');
    return;
  }

  try {
    const result = await verifier.verifyEmail(email, config);
    showResultNotification(result);
  } catch (error) {
    showNotification(`Verification failed: ${error.message}`);
  }
}

function showResultNotification(result: VerificationResult): void {
  const status = result.isValid ? '✅ Valid' : '❌ Invalid';
  const details = [];
  
  if (result.isDisposable) details.push('🚫 Disposable');
  if (result.isRisky) details.push('⚠️ Risky');
  if (result.details?.roleBased) details.push('👤 Role Account');
  if (result.details?.freeProvider) details.push('📧 Free Provider');

  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `Email Verification: ${result.email}`,
    message: `${status}\n${details.join(' • ')}`
  });
}
```

## Popup UI Implementation

```typescript
// popup/popup.ts

interface PopupState {
  email: string;
  isVerifying: boolean;
  result: VerificationResult | null;
}

class PopupController {
  private state: PopupState = {
    email: '',
    isVerifying: false,
    result: null
  };

  constructor() {
    this.bindEvents();
    this.loadLastResult();
  }

  private bindEvents(): void {
    document.getElementById('verifyBtn')?.addEventListener('click', () => this.handleVerify());
    document.getElementById('emailInput')?.addEventListener('input', (e) => {
      this.state.email = (e.target as HTMLInputElement).value;
    });
    
    // Add keyboard shortcut
    document.getElementById('emailInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleVerify();
    });
  }

  private async handleVerify(): Promise<void> {
    if (!this.state.email) return;
    
    this.setLoading(true);

    try {
      const config = await this.getApiConfig();
      if (!config?.apiKey) {
        this.showError('Please configure API key in options');
        return;
      }

      const result = await verifier.verifyEmail(this.state.email, config);
      this.state.result = result;
      this.renderResult(result);
      
      // Also save as last result
      await chrome.storage.local.set({ lastResult: result });
    } catch (error) {
      this.showError(`Verification failed: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  private renderResult(result: VerificationResult): void {
    const container = document.getElementById('result');
    if (!container) return;

    const statusClass = result.isValid ? 'status-valid' : 'status-invalid';
    const statusText = result.isValid ? '✅ Valid Email' : '❌ Invalid Email';

    container.innerHTML = `
      <div class="result-card ${statusClass}">
        <div class="status">${statusText}</div>
        <div class="score">Score: ${result.score}/100</div>
        <ul class="details">
          ${result.isDisposable ? '<li>🚫 Disposable Email</li>' : ''}
          ${result.isRisky ? '<li>⚠️ Risky Email</li>' : ''}
          ${result.details?.roleBased ? '<li>👤 Role-based Account</li>' : ''}
          ${result.details?.freeProvider ? '<li>📧 Free Provider</li>' : ''}
          ${result.details?.catchAll ? '<li>🔄 Catch-all Domain</li>' : ''}
        </ul>
      </div>
    `;
  }

  private setLoading(isLoading: boolean): void {
    this.state.isVerifying = isLoading;
    const btn = document.getElementById('verifyBtn') as HTMLButtonElement;
    if (btn) {
      btn.disabled = isLoading;
      btn.textContent = isLoading ? 'Verifying...' : 'Verify Email';
    }
  }

  private showError(message: string): void {
    const container = document.getElementById('result');
    if (container) {
      container.innerHTML = `<div class="error">${message}</div>`;
    }
  }

  private async getApiConfig(): Promise<ApiConfig | null> {
    const { apiKey, provider } = await chrome.storage.sync.get(['apiKey', 'provider']);
    return apiKey ? { apiKey, provider: provider || 'abstractapi' } : null;
  }

  private async loadLastResult(): Promise<void> {
    const { lastResult } = await chrome.storage.local.get('lastResult');
    if (lastResult) {
      this.state.result = lastResult;
      this.renderResult(lastResult);
    }
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
```

## Best Practices

### 1. API Key Security
Never expose API keys in client-side code. Use Chrome's secure storage or consider a backend proxy:

```typescript
// Use chrome.storage.secure (requires identity permission)
await chrome.storage.secure.set({ apiKey: 'your-key' });
```

### 2. Rate Limiting
Implement request throttling to avoid API rate limits:

```typescript
class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private requestsPerSecond = 5;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        await fn();
        await new Promise(r => setTimeout(r, 1000 / this.requestsPerSecond));
      }
    }
    
    this.processing = false;
  }
}
```

### 3. User Privacy
- Always disclose data collection in your extension's privacy policy
- Provide clear options to opt-out of email tracking
- Consider implementing local-only validation for privacy-sensitive users

### 4. Error Handling
Implement robust error handling for network failures and API issues:

```typescript
try {
  const result = await verifier.verifyEmail(email, config);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Queue for retry later
    await this.queueForRetry(email, config);
  } else if (error.message.includes('network')) {
    // Show offline message
    this.showOfflineMessage();
  }
}
```

## Conclusion

Building an email checker extension requires careful consideration of detection patterns, API integration, user privacy, and error handling. The patterns and code examples in this guide provide a solid foundation for creating a production-ready email verification tool. Remember to always respect user privacy, implement proper caching strategies, and handle API rate limits gracefully for the best user experience.
