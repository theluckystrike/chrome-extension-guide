---
layout: default
title: "Chrome Extension User Scripts Api — Best Practices"
description: "Use the User Scripts API for user-defined scripts."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/user-scripts-api/"
---

# User Scripts API Patterns

## Overview {#overview}

The Chrome User Scripts API (`chrome.userScripts`) enables extensions to dynamically register and manage user-provided scripts at runtime. Unlike traditional `content_scripts` defined in the manifest, user scripts can be added, updated, and removed dynamically by users or the extension itself—similar to how Greasemonkey and Tampermonkey work.

This guide covers practical patterns for building user script management features in your Chrome extension, from basic registration to full Greasemonkey compatibility.

---

## Pattern 1: User Scripts API Basics {#pattern-1-user-scripts-api-basics}

### Understanding the User Scripts API {#understanding-the-user-scripts-api}

The User Scripts API allows dynamic script injection with several key advantages over traditional content scripts:

- **User-configurable**: Users can add their own scripts without reinstalling the extension
- **Dynamic registration**: Scripts can be registered/unregistered at runtime
- **MAIN world execution**: Scripts can access and be accessed by page JavaScript
- **Isolated execution**: Scripts run in the `USER_SCRIPT` world by default, providing isolation

### Required Manifest Configuration {#required-manifest-configuration}

```json
{
  "manifest_version": 3,
  "name": "User Script Manager",
  "version": "1.0.0",
  "permissions": [
    "userScripts"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

The `userScripts` permission is required in the `permissions` array. You'll also need appropriate `host_permissions` for the URLs where scripts should run.

### Basic Registration Example {#basic-registration-example}

```typescript
// types/userScripts.ts

interface UserScript {
  id: string;
  matches: string[];
  js: Array<{
    code: string;
  }>;
  runAt?: 'document_start' | 'document_end' | 'document_idle';
  world?: 'USER_SCRIPT' | 'MAIN';
}

// Background service worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, ready to manage user scripts');
});

// Register a simple user script
async function registerHelloWorldScript(): Promise<void> {
  const scripts: UserScript[] = [
    {
      id: 'hello-world-script',
      matches: ['<all_urls>'],
      js: [{ code: 'console.log("Hello from user script!");' }],
      runAt: 'document_idle',
      world: 'USER_SCRIPT'
    }
  ];

  try {
    await chrome.userScripts.register(scripts);
    console.log('Registered scripts successfully');
  } catch (error) {
    console.error('Failed to register scripts:', error);
  }
}
```

### Difference from Content Scripts {#difference-from-content-scripts}

| Feature | Content Scripts | User Scripts |
|---------|-----------------|--------------|
| **Manifest definition** | Static in manifest.json | Dynamic at runtime |
| **User customization** | Not user-editable | Users can add/edit |
| **World** | Isolated world only | USER_SCRIPT or MAIN |
| **Update without reinstall** | No | Yes |
| **Cross-extension sharing** | Limited | Full access |

---

## Pattern 2: Registering User Scripts at Runtime {#pattern-2-registering-user-scripts-at-runtime}

### The RegisteredUserScript Interface {#the-registereduserscript-interface}

```typescript
// types/userScriptTypes.ts

// Complete RegisteredUserScript interface
interface RegisteredUserScript {
  /** Unique identifier for this script */
  id: string;
  
  /** Match patterns for URLs where this script runs */
  matches: string[];
  
  /** JavaScript files or code to inject */
  js?: Array<{
    file?: string;
    code?: string;
  }>;
  
  /** CSS files to inject */
  css?: Array<{
    file?: string;
    code?: string;
  }>;
  
  /** When to run the script */
  runAt?: 'document_start' | 'document_end' | 'document_idle';
  
  /** Execution world - USER_SCRIPT or MAIN */
  world?: 'USER_SCRIPT' | 'MAIN';
  
  /** How many frames to inject into */
  allFrames?: boolean;
  
  /** Match about:blank and about:srcdoc */
  matchAboutBlank?: boolean;
  
  /** Run only in top frame */
  matchOriginAsFallback?: boolean;
}
```

### Registering Scripts with Code {#registering-scripts-with-code}

```typescript
// services/userScriptManager.ts

import { Storage } from '@theluckystrike/webext-storage';

interface ScriptConfig {
  id: string;
  name: string;
  code: string;
  matches: string[];
  runAt: 'document_start' | 'document_end' | 'document_idle';
  world: 'USER_SCRIPT' | 'MAIN';
  enabled: boolean;
}

class UserScriptManager {
  private storage: Storage;
  private registeredIds: Set<string> = new Set();

  constructor() {
    this.storage = new Storage('user-scripts');
  }

  async registerScript(config: ScriptConfig): Promise<void> {
    const script: RegisteredUserScript = {
      id: config.id,
      matches: config.matches,
      js: [{ code: config.code }],
      runAt: config.runAt,
      world: config.world
    };

    await chrome.userScripts.register([script]);
    this.registeredIds.add(config.id);
  }

  async registerMultipleScripts(
    configs: ScriptConfig[]
  ): Promise<void> {
    const scripts: RegisteredUserScript[] = configs
      .filter(c => c.enabled)
      .map(config => ({
        id: config.id,
        matches: config.matches,
        js: [{ code: config.code }],
        runAt: config.runAt,
        world: config.world
      }));

    await chrome.userScripts.register(scripts);

    configs
      .filter(c => c.enabled)
      .forEach(c => this.registeredIds.add(c.id));
  }
}
```

### Updating Scripts with `update()` {#updating-scripts-with-update}

```typescript
// services/userScriptUpdater.ts

class UserScriptUpdater {
  /**
   * Update existing user scripts with new configuration
   */
  async updateScript(
    id: string,
    updates: Partial<RegisteredUserScript>
  ): Promise<void> {
    await chrome.userScripts.update([
      {
        id,
        ...updates
      }
    ]);
  }

  /**
   * Replace script code while keeping the same ID
   */
  async updateScriptCode(
    id: string,
    newCode: string,
    newMatches?: string[]
  ): Promise<void> {
    const update: RegisteredUserScript = {
      id,
      js: [{ code: newCode }]
    };

    if (newMatches) {
      update.matches = newMatches;
    }

    await chrome.userScripts.update([update]);
  }

  /**
   * Bulk update multiple scripts
   */
  async bulkUpdate(
    updates: Array<{ id: string; updates: Partial<RegisteredUserScript> }>
  ): Promise<void> {
    const scripts = updates.map(({ id, updates: u }) => ({
      id,
      ...u
    }));

    await chrome.userScripts.update(scripts);
  }

  /**
   * Toggle script enabled state
   */
  async toggleScript(id: string, enabled: boolean): Promise<void> {
    if (enabled) {
      // Re-register with original config
      const config = await this.getScriptConfig(id);
      if (config) {
        await chrome.userScripts.register([config]);
      }
    } else {
      await chrome.userScripts.unregister({ ids: [id] });
    }
  }

  private async getScriptConfig(
    id: string
  ): Promise<RegisteredUserScript | null> {
    // Implementation depends on your storage layer
    return null;
  }
}
```

### Unregistering Scripts {#unregistering-scripts}

```typescript
// services/userScriptCleanup.ts

class UserScriptCleanup {
  /**
   * Unregister a single script by ID
   */
  async unregisterScript(id: string): Promise<void> {
    await chrome.userScripts.unregister({ ids: [id] });
  }

  /**
   * Unregister multiple scripts by IDs
   */
  async unregisterMultiple(ids: string[]): Promise<void> {
    await chrome.userScripts.unregister({ ids });
  }

  /**
   * Unregister all user scripts
   */
  async unregisterAll(): Promise<void> {
    await chrome.userScripts.unregister({});
  }

  /**
   * Unregister scripts matching a predicate
   */
  async unregisterWhere(
    predicate: (id: string) => boolean,
    allIds: string[]
  ): Promise<string[]> {
    const toUnregister = allIds.filter(predicate);
    
    if (toUnregister.length > 0) {
      await chrome.userScripts.unregister({ ids: toUnregister });
    }
    
    return toUnregister;
  }

  /**
   * Gracefully handle unregister errors
   */
  async safeUnregister(ids: string[]): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        await this.unregisterScript(id);
        success.push(id);
      } catch (error) {
        failed.push({
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { success, failed };
  }
}
```

---

## Pattern 3: User Script Editor UI {#pattern-3-user-script-editor-ui}

### Options Page with Code Editor {#options-page-with-code-editor}

```typescript
// options/editor.ts

import { Storage } from '@theluckystrike/webext-storage';
import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript/javascript';

interface StoredScript {
  id: string;
  name: string;
  code: string;
  matches: string[];
  runAt: 'document_start' | 'document_end' | 'document_idle';
  world: 'USER_SCRIPT' | 'MAIN';
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

class ScriptEditor {
  private editor: CodeMirror.Editor | null = null;
  private storage: Storage;
  private currentScriptId: string | null = null;

  constructor() {
    this.storage = new Storage('script-editor');
  }

  async initialize(): Promise<void> {
    this.editor = CodeMirror.fromTextArea(
      document.getElementById('code-editor') as HTMLTextAreaElement,
      {
        mode: 'javascript',
        lineNumbers: true,
        theme: 'monokai',
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true
      }
    );

    await this.loadScriptList();
    this.setupEventListeners();
  }

  private async loadScriptList(): Promise<void> {
    const scripts = await this.storage.get<StoredScript[]>('scripts', []);
    this.renderScriptList(scripts);
  }

  private renderScriptList(scripts: StoredScript[]): void {
    const list = document.getElementById('script-list') as HTMLUListElement;
    list.innerHTML = scripts
      .map(
        s => `
      <li data-id="${s.id}" class="${s.enabled ? 'enabled' : 'disabled'}">
        <span class="name">${s.name}</span>
        <button class="delete" data-id="${s.id}">Delete</button>
      </li>
    `
      )
      .join('');

    // Add click handlers
    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.classList.contains('delete')) {
          this.loadScript(li.dataset.id!);
        }
      });
    });
  }

  async loadScript(id: string): Promise<void> {
    const scripts = await this.storage.get<StoredScript[]>('scripts', []);
    const script = scripts.find(s => s.id === id);

    if (script && this.editor) {
      this.currentScriptId = id;
      this.editor.setValue(script.code);
      this.updateUIForScript(script);
    }
  }

  private updateUIForScript(script: StoredScript): void {
    (document.getElementById('script-name') as HTMLInputElement).value =
      script.name;
    (document.getElementById('script-matches') as HTMLInputElement).value =
      script.matches.join('\n');
    (document.getElementById('script-runat') as HTMLSelectElement).value =
      script.runAt;
    (document.getElementById('script-world') as HTMLSelectElement).value =
      script.world;
    (document.getElementById('script-enabled') as HTMLInputElement).checked =
      script.enabled;
  }

  private setupEventListeners(): void {
    document
      .getElementById('save-button')
      ?.addEventListener('click', () => this.saveScript());

    document
      .getElementById('new-script-button')
      ?.addEventListener('click', () => this.createNewScript());

    document
      .getElementById('validate-button')
      ?.addEventListener('click', () => this.validateScript());
  }

  async saveScript(): Promise<void> {
    if (!this.editor || !this.currentScriptId) return;

    const code = this.editor.getValue();
    const validation = this.validateJavaScript(code);

    if (!validation.valid) {
      this.showError(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    const scripts = await this.storage.get<StoredScript[]>('scripts', []);
    const index = scripts.findIndex(s => s.id === this.currentScriptId);

    if (index >= 0) {
      scripts[index] = {
        ...scripts[index],
        code,
        updatedAt: Date.now()
      };
    }

    await this.storage.set('scripts', scripts);
    await this.registerScripts();

    this.showSuccess('Script saved successfully');
  }

  private validateJavaScript(
    code: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      new Function(code);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Syntax error');
    }

    // Check for common issues
    if (code.includes('chrome.runtime.getURL') && !code.includes('web_accessible_resources')) {
      errors.push('Using chrome.runtime.getURL requires web_accessible_resources in manifest');
    }

    return { valid: errors.length === 0, errors };
  }

  private async registerScripts(): Promise<void> {
    const scripts = await this.storage.get<StoredScript[]>('scripts', []);
    const userScriptManager = new UserScriptManager();

    // First unregister all
    await chrome.userScripts.unregister({});

    // Then register enabled scripts
    const enabledScripts = scripts.filter(s => s.enabled);
    await userScriptManager.registerMultipleScripts(enabledScripts);
  }

  private showError(message: string): void {
    // Implementation for showing error UI
    console.error(message);
  }

  private showSuccess(message: string): void {
    // Implementation for showing success UI
    console.log(message);
  }

  private createNewScript(): void {
    this.currentScriptId = `script-${Date.now()}`;
    this.editor?.setValue('// Enter your user script here\n');
    this.updateUIForScript({
      id: this.currentScriptId,
      name: 'New Script',
      code: '',
      matches: ['<all_urls>'],
      runAt: 'document_idle',
      world: 'USER_SCRIPT',
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  private async validateScript(): Promise<void> {
    if (!this.editor) return;

    const code = this.editor.getValue();
    const result = this.validateJavaScript(code);

    if (result.valid) {
      this.showSuccess('Script is valid!');
    } else {
      this.showError(result.errors.join('\n'));
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const editor = new ScriptEditor();
  editor.initialize();
});
```

---

## Pattern 4: Match Pattern Management {#pattern-4-match-pattern-management}

### Match Pattern Validation {#match-pattern-validation}

```typescript
// utils/matchPattern.ts

type MatchPattern = string;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class MatchPatternValidator {
  // Chrome's supported match patterns
  private readonly validPatterns = [
    '<all_urls>',
    'http://*/*',
    'https://*/*',
    'file:///*'
  ];

  /**
   * Validate a single match pattern
   */
  validate(pattern: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!pattern || pattern.trim() === '') {
      errors.push('Pattern cannot be empty');
      return { valid: false, errors, warnings };
    }

    // Check for <all_urls> shorthand
    if (pattern === '<all_urls>') {
      return { valid: true, errors, warnings: ['<all_urls> is very permissive'] };
    }

    // Validate URL scheme
    const schemeMatch = pattern.match(/^(\*|https?|file|ftp):/);
    if (!schemeMatch) {
      errors.push(`Invalid scheme in pattern: ${pattern}`);
      return { valid: false, errors, warnings };
    }

    const scheme = schemeMatch[1];

    // Validate host
    const hostMatch = pattern.match(/^[^/]*:\/\/([^\/]*)\//);
    if (!hostMatch) {
      errors.push(`Invalid host in pattern: ${pattern}`);
      return { valid: false, errors, warnings };
    }

    const host = hostMatch[1];

    // Check for dangerous wildcards
    if (host === '*') {
      warnings.push('Host wildcard (*) matches all domains');
    }

    // Validate path
    const pathStart = pattern.indexOf('/', hostMatch[0].length);
    const path = pathStart >= 0 ? pattern.slice(pathStart) : '/';

    // Check for dangerous path patterns
    if (path === '/*' && (scheme === 'http' || scheme === 'https')) {
      warnings.push('Path /* is very permissive for web URLs');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate multiple patterns
   */
  validateMultiple(patterns: string[]): ValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const pattern of patterns) {
      const result = this.validate(pattern);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * Check if a URL matches a pattern
   */
  matches(url: string, pattern: string): boolean {
    // Convert pattern to regex
    const regex = this.patternToRegex(pattern);
    return regex.test(url);
  }

  /**
   * Convert a match pattern to a RegExp
   */
  private patternToRegex(pattern: string): RegExp {
    if (pattern === '<all_urls>') {
      return /^https?:\/\/.*/;
    }

    let regex = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*') // * -> .*
      .replace(/\?/g, '.'); // ? -> .

    return new RegExp(`^${regex}$`);
  }
}

export const matchPatternValidator = new MatchPatternValidator();
```

### Match Pattern UI Helper {#match-pattern-ui-helper}

```typescript
// components/matchPatternInput.ts

interface PatternPreset {
  name: string;
  pattern: string;
  description: string;
}

const PATTERN_PRESETS: PatternPreset[] = [
  { name: 'All URLs', pattern: '<all_urls>', description: 'Match all URLs' },
  { name: 'All HTTPS', pattern: 'https://*/*', description: 'Match all HTTPS URLs' },
  { name: 'All HTTP', pattern: 'http://*/*', description: 'Match all HTTP URLs' },
  { name: 'Specific Domain', pattern: 'https://example.com/*', description: 'Match example.com and subdomains' },
  { name: 'This Domain', pattern: '*://*.example.com/*', description: 'Match any subdomain of example.com' },
  { name: 'Path Match', pattern: 'https://example.com/path/*', description: 'Match specific path' }
];

class MatchPatternInput {
  private container: HTMLElement;
  private patterns: string[] = [];
  private validator: MatchPatternValidator;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    
    this.container = el;
    this.validator = new MatchPatternValidator();
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="pattern-input-group">
        <label>Match Patterns (one per line):</label>
        <textarea 
          id="match-patterns" 
          rows="4" 
          placeholder="https://example.com/*"
        ><all_urls></textarea>
        <div class="presets">
          <span>Quick presets:</span>
          ${PATTERN_PRESETS.map(p => 
            `<button class="preset-btn" data-pattern="${p.pattern}">${p.name}</button>`
          ).join('')}
        </div>
        <div id="pattern-validation" class="validation-result"></div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const textarea = document.getElementById(
      'match-patterns'
    ) as HTMLTextAreaElement;

    textarea?.addEventListener('input', () => {
      this.patterns = textarea.value
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      this.validatePatterns();
    });

    this.container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pattern = (btn as HTMLButtonElement).dataset.pattern!;
        this.addPattern(pattern);
      });
    });
  }

  private validatePatterns(): void {
    const result = this.validator.validateMultiple(this.patterns);
    const validationEl = document.getElementById('pattern-validation');

    if (!validationEl) return;

    if (result.valid && result.warnings.length === 0) {
      validationEl.innerHTML = '<span class="valid">✓ Valid patterns</span>';
    } else if (result.valid) {
      validationEl.innerHTML = `<span class="warning">⚠ ${result.warnings.join('<br>')}</span>`;
    } else {
      validationEl.innerHTML = `<span class="error">✗ ${result.errors.join('<br>')}</span>`;
    }
  }

  addPattern(pattern: string): void {
    if (!this.patterns.includes(pattern)) {
      this.patterns.push(pattern);
      this.updateTextarea();
    }
  }

  removePattern(pattern: string): void {
    this.patterns = this.patterns.filter(p => p !== pattern);
    this.updateTextarea();
  }

  getPatterns(): string[] {
    return [...this.patterns];
  }

  private updateTextarea(): void {
    const textarea = document.getElementById(
      'match-patterns'
    ) as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = this.patterns.join('\n');
      this.validatePatterns();
    }
  }
}
```

---

## Pattern 5: Script World Configuration {#pattern-5-script-world-configuration}

### Understanding Script Worlds {#understanding-script-worlds}

```typescript
// types/worldTypes.ts

/**
 * USER_SCRIPT world: Isolated from page, limited Chrome API access
 * MAIN world: Same as page JavaScript, full page access
 */
type ScriptWorld = 'USER_SCRIPT' | 'MAIN';

interface WorldConfiguration {
  world: ScriptWorld;
  csp?: string;
}

/**
 * Configure the user script world with custom CSP
 */
async function configureUserScriptWorld(csp: string): Promise<void> {
  try {
    await chrome.userScripts.configureWorld({
      csp
    });
    console.log('World configured with CSP:', csp);
  } catch (error) {
    console.error('Failed to configure world:', error);
  }
}

/**
 * Get current world configuration
 */
async function getWorldConfiguration(): Promise<WorldConfiguration | null> {
  try {
    // Note: There's no direct API to get current config
    // Store it in your extension's storage
    return null;
  } catch (error) {
    console.error('Failed to get world configuration:', error);
    return null;
  }
}
```

### World Selection Strategy {#world-selection-strategy}

```typescript
// services/worldSelector.ts

interface ScriptRequirements {
  needsPageAccess: boolean;      // Needs to access page variables/functions
  needsChromeAPIs: boolean;      // Needs chrome.* APIs in script
  needsDOMAccess: boolean;       // Needs to manipulate page DOM
  needsIsolation: boolean;      // Should be protected from page interference
  usesSensitiveAPIs: boolean;   // Uses XMLHttpRequest, WebSocket, etc.
}

class WorldSelector {
  /**
   * Determine the best world for a script based on its requirements
   */
  selectWorld(requirements: ScriptRequirements): ScriptWorld {
    // If script needs to interact with page JavaScript, use MAIN
    if (requirements.needsPageAccess) {
      return 'MAIN';
    }

    // If script needs Chrome APIs AND isolation, use USER_SCRIPT
    if (requirements.needsChromeAPIs && requirements.needsIsolation) {
      return 'USER_SCRIPT';
    }

    // Default to USER_SCRIPT for security
    if (!requirements.needsPageAccess) {
      return 'USER_SCRIPT';
    }

    // For scripts that need both page access and Chrome APIs,
    // use MAIN but warn about security implications
    return 'MAIN';
  }

  /**
   * Generate recommendation based on script content analysis
   */
  analyzeAndRecommend(code: string): {
    recommendedWorld: ScriptWorld;
    reasons: string[];
    warnings: string[];
  } {
    const reasons: string[] = [];
    const warnings: string[] = [];

    // Check for page access patterns
    const accessesPageVars = /\b(window\.|document\.|Math\.|JSON\.)/.test(code);
    const definesForPage = /^\s*(window\.|document\.)/m.test(code);

    // Check for Chrome API usage
    const usesChromeAPI = /chrome\.(runtime|storage|tabs|extension)/.test(code);
    const usesSensitiveChromeAPI = /chrome\.(webRequest|declarativeNetRequest)/.test(code);

    // Analyze requirements
    const requirements: ScriptRequirements = {
      needsPageAccess: accessesPageVars || definesForPage,
      needsChromeAPIs: usesChromeAPI,
      needsDOMAccess: /document\.(getElementBy|querySelector|createElement)/.test(code),
      needsIsolation: !accessesPageVars,
      usesSensitiveAPIs: usesSensitiveChromeAPI
    };

    const world = this.selectWorld(requirements);

    // Build reasons
    if (accessesPageVars) {
      reasons.push('Script accesses page variables → MAIN world');
    }

    if (usesChromeAPI) {
      reasons.push('Script uses Chrome APIs');
    }

    if (!accessesPageVars && usesChromeAPI) {
      reasons.push('USER_SCRIPT provides isolation');
    }

    // Add warnings
    if (world === 'MAIN' && usesSensitiveChromeAPI) {
      warnings.push(
        'MAIN world with sensitive APIs - ensure script is trusted'
      );
    }

    if (world === 'MAIN' && definesForPage) {
      warnings.push(
        'Script defines globals for page - can be accessed by page scripts'
      );
    }

    return {
      recommendedWorld: world,
      reasons,
      warnings
    };
  }
}

export const worldSelector = new WorldSelector();
```

### CSP Configuration {#csp-configuration}

```typescript
// services/cspManager.ts

interface CSPConfig {
  /**
   * Content Security Policy for user script world
   * Default: "script-src 'self' 'unsafe-eval'; object-src 'self';"
   */
  csp: string;
}

class CSPManager {
  private readonly defaultCSP =
    "script-src 'self' 'unsafe-eval'; object-src 'self';";

  private readonly relaxedCSP =
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'self' blob:;";

  /**
   * Apply CSP for user script world
   */
  async configureCSP(csp: string): Promise<void> {
    await chrome.userScripts.configureWorld({ csp });
  }

  /**
   * Configure CSP for scripts that need inline scripts
   */
  async enableInlineScripts(): Promise<void> {
    await this.configureCSP(this.relaxedCSP);
  }

  /**
   * Configure strict CSP for security-sensitive scripts
   */
  async enableStrictCSP(): Promise<void> {
    await this.configureCSP(this.defaultCSP);
  }

  /**
   * Allow specific external scripts
   */
  async allowExternalScripts(...urls: string[]): Promise<void> {
    const csp = `script-src 'self' 'unsafe-eval' ${urls.join(' ')}; object-src 'self';`;
    await this.configureCSP(csp);
  }
}
```

---

## Pattern 6: User Script Libraries {#pattern-6-user-script-libraries}

### Library Injection System {#library-injection-system}

```typescript
// services/libraryManager.ts

interface Library {
  id: string;
  name: string;
  url: string;
  version?: string;
  loaded: boolean;
}

interface Dependency {
  libraryId: string;
  loadOrder: number;
}

class UserScriptLibraryManager {
  private libraries: Map<string, Library> = new Map();
  private dependencies: Dependency[] = [];
  private storage: Storage;

  constructor() {
    this.storage = new Storage('user-script-libraries');
  }

  /**
   * Register a library for use in user scripts
   */
  async registerLibrary(library: Library): Promise<void> {
    this.libraries.set(library.id, library);
  }

  /**
   * Define load order for libraries
   */
  setDependencies(dependencies: Dependency[]): void {
    this.dependencies = dependencies.sort((a, b) => a.loadOrder - b.loadOrder);
  }

  /**
   * Get all library code combined in load order
   */
  async getCombinedLibraryCode(): Promise<string> {
    const sortedLibs = this.dependencies
      .map(d => this.libraries.get(d.libraryId))
      .filter((l): l is Library => l !== undefined && l.loaded);

    const codes: string[] = [];

    for (const lib of sortedLibs) {
      const code = await this.loadLibraryCode(lib);
      codes.push(`// ===== ${lib.name} =====\n${code}`);
    }

    return codes.join('\n\n');
  }

  /**
   * Load library code from URL
   */
  private async loadLibraryCode(library: Library): Promise<string> {
    // For built-in libraries, return bundled code
    const builtInCode = this.getBuiltInLibraryCode(library.id);
    if (builtInCode) {
      return builtInCode;
    }

    // For external URLs, fetch (requires host permission)
    try {
      const response = await fetch(library.url);
      return await response.text();
    } catch (error) {
      console.error(`Failed to load library ${library.id}:`, error);
      return '';
    }
  }

  /**
   * Get code for built-in utility libraries
   */
  private getBuiltInLibraryCode(libraryId: string): string | null {
    const builtInLibs: Record<string, string> = {
      'utils': `
        const Utils = {
          $(selector) { return document.querySelector(selector); },
          $$(selector) { return document.querySelectorAll(selector); },
          waitFor(selector, timeout = 5000) {
            return new Promise((resolve, reject) => {
              const el = document.querySelector(selector);
              if (el) return resolve(el);
              const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                  observer.disconnect();
                  resolve(el);
                }
              });
              observer.observe(document.body, { childList: true, subtree: true });
              setTimeout(() => {
                observer.disconnect();
                reject(new Error('Timeout waiting for ' + selector));
              }, timeout);
            });
          },
          log(...args) { console.log('[UserScript]', ...args); }
        };
      `
    };

    return builtInLibs[libraryId] || null;
  }

  /**
   * Inject libraries with a user script
   */
  async injectWithLibraries(
    userScriptCode: string,
    libraryIds: string[]
  ): Promise<string> {
    const libraryCode = await this.getLibraryCodeSubset(libraryIds);
    return libraryCode + '\n\n// ===== User Script =====\n' + userScriptCode;
  }

  private async getLibraryCodeSubset(libraryIds: string[]): Promise<string> {
    const codes: string[] = [];

    for (const id of libraryIds) {
      const lib = this.libraries.get(id);
      if (lib && lib.loaded) {
        const code = await this.loadLibraryCode(lib);
        codes.push(`// ${lib.name}\n${code}`);
      }
    }

    return codes.join('\n\n');
  }
}
```

### Shared Utility Pattern {#shared-utility-pattern}

```typescript
// services/sharedUtilities.ts

/**
 * Utilities that can be shared across multiple user scripts
 */
class UserScriptSharedUtils {
  /**
   * Safe DOM manipulation utilities
   */
  static dom = {
    /**
     * Query selector with type safety
     */
    query<T extends Element = Element>(
      selector: string,
      parent: Document | Element = document
    ): T | null {
      return parent.querySelector(selector) as T | null;
    },

    /**
     * Query all elements with type safety
     */
    queryAll<T extends Element = Element>(
      selector: string,
      parent: Document | Element = document
    ): T[] {
      return Array.from(parent.querySelectorAll(selector)) as T[];
    },

    /**
     * Create element with attributes
     */
    create<K extends keyof HTMLElementTagNameMap>(
      tag: K,
      attrs: Record<string, string> = {},
      children: (Node | string)[] = []
    ): HTMLElementTagNameMap[K] {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      children.forEach(c =>
        el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
      );
      return el;
    }
  };

  /**
   * Event utilities
   */
  static events = {
    /**
     * One-time event listener
     */
    once<T extends Event>(
      target: EventTarget,
      type: string,
      handler: (e: T) => void
    ): void {
      target.addEventListener(type, function handlerWrapper(e: Event) {
        target.removeEventListener(type, handlerWrapper);
        handler(e as T);
      });
    },

    /**
     * Delegate event handler
     */
    delegate<T extends Event>(
      target: EventTarget,
      type: string,
      selector: string,
      handler: (e: T, target: Element) => void
    ): void {
      target.addEventListener(type, (e: Event) => {
        const el = (e.target as Element).closest(selector);
        if (el) {
          handler(e as T, el as Element);
        }
      });
    }
  };

  /**
   * Storage utilities (compatible with page context)
   */
  static storage = {
    get<T>(key: string, defaultValue: T): T {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    },

    set<T>(key: string, value: T): void {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Storage error:', e);
      }
    },

    remove(key: string): void {
      localStorage.removeItem(key);
    }
  };
}

// Make available globally in MAIN world
if (typeof window !== 'undefined') {
  (window as any).UserScriptUtils = UserScriptSharedUtils;
}
```

---

## Pattern 7: Greasemonkey/Tampermonkey Compatibility {#pattern-7-greasemonkeytampermonkey-compatibility}

### Userscript Metadata Block Parser {#userscript-metadata-block-parser}

```typescript
// parsers/userscriptMetadata.ts

interface UserscriptMetadata {
  name: string;
  namespace?: string;
  version?: string;
  description?: string;
  author?: string;
  match?: string[];
  include?: string[];
  exclude?: string[];
  require?: string[];
  resource?: Array<{ name: string; url: string }>;
  grant?: string[];
  runAt?: 'document-start' | 'document-end' | 'document-idle';
}

class UserscriptMetadataParser {
  private readonly METADATA_START = '==UserScript==';
  private readonly METADATA_END = '==/UserScript==';

  /**
   * Parse userscript metadata block from code
   */
  parse(code: string): UserscriptMetadata {
    const metadata: UserscriptMetadata = {
      name: 'Untitled Script',
      match: []
    };

    // Extract metadata block
    const startIdx = code.indexOf(this.METADATA_START);
    const endIdx = code.indexOf(this.METADATA_END);

    if (startIdx === -1 || endIdx === -1) {
      return metadata;
    }

    const metadataBlock = code.slice(
      startIdx + this.METADATA_START.length,
      endIdx
    );

    // Parse each line
    const lines = metadataBlock.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) continue;

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      let value = trimmed.slice(colonIdx + 1).trim();

      switch (key) {
        case 'name':
          metadata.name = value;
          break;
        case 'namespace':
          metadata.namespace = value;
          break;
        case 'version':
          metadata.version = value;
          break;
        case 'description':
          metadata.description = value;
          break;
        case 'author':
          metadata.author = value;
          break;
        case 'match':
          metadata.match = this.parseMultiValue(value);
          break;
        case 'include':
          metadata.include = this.parseMultiValue(value);
          break;
        case 'exclude':
          metadata.exclude = this.parseMultiValue(value);
          break;
        case 'require':
          metadata.require = this.parseMultiValue(value);
          break;
        case 'resource':
          metadata.resource = this.parseResources(value);
          break;
        case 'grant':
          metadata.grant = this.parseMultiValue(value);
          break;
        case 'run-at':
          metadata.runAt = value as any;
          break;
      }
    }

    return metadata;
  }

  /**
   * Parse multi-value metadata (supports @value entries)
   */
  private parseMultiValue(value: string): string[] {
    return value.split(/\s+/).filter(v => v.length > 0);
  }

  /**
   * Parse @resource entries
   */
  private parseResources(value: string): Array<{ name: string; url: string }> {
    const resources: Array<{ name: string; url: string }> = [];
    const parts = value.split(/\s+/);

    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] && parts[i + 1]) {
        resources.push({ name: parts[i], url: parts[i + 1] });
      }
    }

    return resources;
  }

  /**
   * Generate metadata block from parsed metadata
   */
  generate(metadata: UserscriptMetadata): string {
    const lines: string[] = [this.METADATA_START];

    lines.push(`@name ${metadata.name}`);
    if (metadata.namespace) lines.push(`@namespace ${metadata.namespace}`);
    if (metadata.version) lines.push(`@version ${metadata.version}`);
    if (metadata.description)
      lines.push(`@description ${metadata.description}`);
    if (metadata.author) lines.push(`@author ${metadata.author}`);

    if (metadata.match) {
      metadata.match.forEach(m => lines.push(`@match ${m}`));
    }
    if (metadata.include) {
      metadata.include.forEach(i => lines.push(`@include ${i}`));
    }
    if (metadata.exclude) {
      metadata.exclude.forEach(e => lines.push(`@exclude ${e}`));
    }
    if (metadata.require) {
      metadata.require.forEach(r => lines.push(`@require ${r}`));
    }
    if (metadata.grant) {
      metadata.grant.forEach(g => lines.push(`@grant ${g}`));
    }
    if (metadata.runAt) lines.push(`@run-at ${metadata.runAt}`);

    lines.push(this.METADATA_END);

    return lines.join('\n');
  }

  /**
   * Check if code has valid metadata block
   */
  hasValidMetadata(code: string): boolean {
    return (
      code.includes(this.METADATA_START) &&
      code.includes(this.METADATA_END)
    );
  }
}

export const metadataParser = new UserscriptMetadataParser();
```

### GM_API Shim Implementation {#gm-api-shim-implementation}

```typescript
// shims/gmApiShim.ts

/**
 * Greasemonkey/Tampermonkey API shims for user scripts
 * These provide compatibility with existing userscripts
 */

class GMApiShim {
  private storage: Storage;

  constructor() {
    this.storage = new Storage('gm-api-storage');
  }

  /**
   * Shim for GM_getValue
   */
  async GM_getValue<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const stored = await this.storage.get<Record<string, any>>('gm-values', {});
    return stored[key] ?? defaultValue;
  }

  /**
   * Shim for GM_setValue
   */
  async GM_setValue<T>(key: string, value: T): Promise<void> {
    const stored = await this.storage.get<Record<string, any>>('gm-values', {});
    stored[key] = value;
    await this.storage.set('gm-values', stored);
  }

  /**
   * Shim for GM_deleteValue
   */
  async GM_deleteValue(key: string): Promise<void> {
    const stored = await this.storage.get<Record<string, any>>('gm-values', {});
    delete stored[key];
    await this.storage.set('gm-values', stored);
  }

  /**
   * Shim for GM_listValues
   */
  async GM_listValues(): Promise<string[]> {
    const stored = await this.storage.get<Record<string, any>>('gm-values', {});
    return Object.keys(stored);
  }

  /**
   * Shim for GM_xmlhttpRequest
   */
  GM_xmlhttpRequest(
    details: {
      method?: string;
      url: string;
      headers?: Record<string, string>;
      data?: string;
      responseType?: string;
      onload?: (response: any) => void;
      onerror?: (response: any) => void;
      onprogress?: (progress: any) => void;
    }
  ): void {
    const xhr = new XMLHttpRequest();

    xhr.open(details.method || 'GET', details.url, true);

    // Set headers
    if (details.headers) {
      Object.entries(details.headers).forEach(([k, v]) => {
        xhr.setRequestHeader(k, v);
      });
    }

    // Set response type
    if (details.responseType) {
      xhr.responseType = details.responseType as any;
    }

    // Event handlers
    xhr.onload = (e) => {
      if (details.onload) {
        details.onload({
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.response,
          responseText: xhr.responseText,
          responseXML: xhr.responseXML,
          readyState: xhr.readyState,
          finalUrl: details.url
        });
      }
    };

    xhr.onerror = (e) => {
      if (details.onerror) {
        details.onload({
          status: xhr.status,
          statusText: xhr.statusText,
          error: e
        });
      }
    };

    if (details.onprogress) {
      xhr.onprogress = (e) => {
        details.onprogress({
          loaded: e.loaded,
          total: e.total,
          lengthComputable: e.lengthComputable
        });
      };
    }

    xhr.send(details.data);
  }

  /**
   * Shim for GM_notification
   */
  GM_notification(
    details: {
      text?: string;
      title?: string;
      image?: string;
      onclick?: () => void;
    } | string,
    ondone?: () => void
  ): void {
    const opts =
      typeof details === 'string'
        ? { text: details, title: 'User Script' }
        : details;

    // Use Chrome's notifications API
    chrome.notifications.create(
      {
        type: 'basic',
        iconUrl: opts.image || 'icons/icon48.png',
        title: opts.title || 'User Script',
        message: opts.text || ''
      },
      () => {
        if (opts.onclick) {
          opts.onclick();
        }
        if (ondone) {
          ondone();
        }
      }
    );
  }

  /**
   * Shim for GM_addStyle
   */
  GM_addStyle(css: string): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return style;
  }

  /**
   * Shim for GM_registerMenuCommand
   */
  GM_registerMenuCommand(
    caption: string,
    commandFunc: () => void,
    accessKey?: string
  ): string {
    const id = `gm-menu-${Date.now()}`;

    chrome.contextMenus.create({
      id,
      title: caption,
      contexts: ['page'],
      accessKeys: accessKey ? { page: accessKey } : undefined
    });

    // Store handler
    this.storage.set(`menu-handler-${id}`, commandFunc.toString());

    return id;
  }

  /**
   * Shim for GM_unregisterMenuCommand
   */
  GM_unregisterMenuCommand(menuCommandId: string): void {
    chrome.contextMenus.remove(menuCommandId);
  }
}

// Create global instance
const gmApiShim = new GMApiShim();

// Inject shims into page context (MAIN world)
function injectGMApiShim(): void {
  const shimCode = `
    const GM_getValue = ${gmApiShim.GM_getValue.toString()};
    const GM_setValue = ${gmApiShim.GM_setValue.toString()};
    const GM_deleteValue = ${gmApiShim.GM_deleteValue.toString()};
    const GM_listValues = ${gmApiShim.GM_listValues.toString()};
    const GM_xmlhttpRequest = ${gmApiShim.GM_xmlhttpRequest.toString()};
    const GM_notification = ${gmApiShim.GM_notification.toString()};
    const GM_addStyle = ${gmApiShim.GM_addStyle.toString()};
  `;

  // Register as user script
  chrome.userScripts.register([
    {
      id: 'gm-api-shim',
      matches: ['<all_urls>'],
      js: [{ code: shimCode }],
      world: 'MAIN'
    }
  ]);
}
```

### Importing .user.js Files {#importing-userjs-files}

```typescript
// services/userscriptImporter.ts

import { metadataParser } from '../parsers/userscriptMetadata';

interface ImportResult {
  success: boolean;
  script?: {
    metadata: UserscriptMetadata;
    code: string;
  };
  error?: string;
}

class UserscriptImporter {
  private storage: Storage;

  constructor() {
    this.storage = new Storage('imported-scripts');
  }

  /**
   * Import a .user.js file from a URL
   */
  async importFromUrl(url: string): Promise<ImportResult> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const code = await response.text();
      return this.importFromCode(code, url);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Import from code string
   */
  importFromCode(code: string, sourceUrl?: string): ImportResult {
    // Parse metadata
    const metadata = metadataParser.parse(code);

    if (!metadata.name || metadata.name === 'Untitled Script') {
      return {
        success: false,
        error: 'Invalid userscript: missing @name in metadata'
      };
    }

    // Validate match patterns
    const matchPatterns = metadata.match || metadata.include || ['<all_urls>'];
    const validator = new MatchPatternValidator();
    const validation = validator.validateMultiple(matchPatterns);

    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid match patterns: ${validation.errors.join(', ')}`
      };
    }

    return {
      success: true,
      script: {
        metadata,
        code
      }
    };
  }

  /**
   * Import multiple scripts from a URL list
   */
  async importFromUrlList(urls: string[]): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    for (const url of urls) {
      const result = await this.importFromUrl(url);
      results.push(result);

      // Save successful imports
      if (result.success && result.script) {
        await this.saveScript(result.script, url);
      }
    }

    return results;
  }

  /**
   * Save imported script to storage
   */
  private async saveScript(
    script: { metadata: UserscriptMetadata; code: string },
    sourceUrl: string
  ): Promise<void> {
    const scripts = await this.storage.get<any[]>('imported-scripts', []);

    const id = `imported-${Date.now()}`;
    scripts.push({
      id,
      name: script.metadata.name,
      code: script.code,
      matches: script.metadata.match || script.metadata.include || ['<all_urls>'],
      runAt: this.mapRunAt(script.metadata.runAt),
      world: 'USER_SCRIPT' as const,
      enabled: false,
      sourceUrl,
      importedAt: Date.now()
    });

    await this.storage.set('imported-scripts', scripts);
  }

  private mapRunAt(
    runAt?: string
  ): 'document_start' | 'document_end' | 'document_idle' {
    switch (runAt) {
      case 'document-start':
        return 'document_start';
      case 'document-end':
        return 'document_end';
      default:
        return 'document_idle';
    }
  }

  /**
   * List all imported scripts
   */
  async listImportedScripts(): Promise<any[]> {
    return this.storage.get<any[]>('imported-scripts', []);
  }

  /**
   * Delete imported script
   */
  async deleteImportedScript(id: string): Promise<void> {
    const scripts = await this.storage.get<any[]>('imported-scripts', []);
    const filtered = scripts.filter(s => s.id !== id);
    await this.storage.set('imported-scripts', filtered);
  }
}
```

---

## Pattern 8: User Script Lifecycle Management {#pattern-8-user-script-lifecycle-management}

### Enable/Disable Without Unregistering {#enabledisable-without-unregistering}

```typescript
// services/scriptLifecycle.ts

interface ScriptLifecycleState {
  id: string;
  enabled: boolean;
  lastEnabled?: number;
  executionCount: number;
  lastExecuted?: number;
  errors: string[];
}

class UserScriptLifecycleManager {
  private storage: Storage;
  private states: Map<string, ScriptLifecycleState> = new Map();
  private enabledIds: Set<string> = new Set();

  constructor() {
    this.storage = new Storage('script-lifecycle');
    this.loadStates();
  }

  private async loadStates(): Promise<void> {
    const saved = await this.storage.get<ScriptLifecycleState[]>(
      'lifecycle-states',
      []
    );

    saved.forEach(state => {
      this.states.set(state.id, state);
      if (state.enabled) {
        this.enabledIds.add(state.id);
      }
    });
  }

  /**
   * Enable a script without full re-registration
   */
  async enableScript(id: string): Promise<void> {
    // Update state
    const state = this.states.get(id) || { id, enabled: false, executionCount: 0, errors: [] };
    state.enabled = true;
    state.lastEnabled = Date.now();
    this.states.set(id, state);
    this.enabledIds.add(id);

    await this.saveStates();
  }

  /**
   * Disable a script without unregistering
   */
  async disableScript(id: string): Promise<void> {
    const state = this.states.get(id);
    if (state) {
      state.enabled = false;
      this.states.set(id, state);
    }

    this.enabledIds.delete(id);
    await this.saveStates();
  }

  /**
   * Check if a script is enabled
   */
  isEnabled(id: string): boolean {
    return this.enabledIds.has(id);
  }

  /**
   * Record script execution
   */
  async recordExecution(id: string, success: boolean, error?: string): Promise<void> {
    const state = this.states.get(id) || { 
      id, 
      enabled: true, 
      executionCount: 0, 
      errors: [] 
    };

    state.executionCount++;
    state.lastExecuted = Date.now();

    if (error) {
      state.errors.push(`${Date.now()}: ${error}`);
      // Keep only last 10 errors
      if (state.errors.length > 10) {
        state.errors = state.errors.slice(-10);
      }
    }

    this.states.set(id, state);
    await this.saveStates();
  }

  /**
   * Get execution statistics
   */
  getStats(id: string): ScriptLifecycleState | undefined {
    return this.states.get(id);
  }

  /**
   * Get all enabled script IDs for registration
   */
  getEnabledIds(): string[] {
    return Array.from(this.enabledIds);
  }

  /**
   * Get all disabled script IDs
   */
  getDisabledIds(allIds: string[]): string[] {
    return allIds.filter(id => !this.enabledIds.has(id));
  }

  private async saveStates(): Promise<void> {
    await this.storage.set('lifecycle-states', Array.from(this.states.values()));
  }
}
```

### Execution Logging and Error Reporting {#execution-logging-and-error-reporting}

```typescript
// services/executionLogger.ts

interface ExecutionLog {
  id: string;
  timestamp: number;
  scriptId: string;
  scriptName: string;
  url: string;
  success: boolean;
  error?: string;
  duration?: number;
}

class UserScriptExecutionLogger {
  private storage: Storage;
  private maxLogs = 1000;

  constructor() {
    this.storage = new Storage('execution-logs');
    this.setupMessageListener();
  }

  /**
   * Listen for execution messages from content scripts
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'userScriptExecution') {
        this.log(message.log);
        sendResponse({ received: true });
      }
      return true;
    });
  }

  /**
   * Log an execution event
   */
  async log(execution: Omit<ExecutionLog, 'id' | 'timestamp'>): Promise<void> {
    const logs = await this.storage.get<ExecutionLog[]>('logs', []);

    const newLog: ExecutionLog = {
      ...execution,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now()
    };

    logs.unshift(newLog);

    // Trim old logs
    if (logs.length > this.maxLogs) {
      logs.length = this.maxLogs;
    }

    await this.storage.set('logs', logs);

    // Notify background error handler if error
    if (!execution.success && execution.error) {
      this.handleScriptError(execution);
    }
  }

  /**
   * Get recent logs with optional filtering
   */
  async getLogs(filter?: {
    scriptId?: string;
    success?: boolean;
    since?: number;
    limit?: number;
  }): Promise<ExecutionLog[]> {
    let logs = await this.storage.get<ExecutionLog[]>('logs', []);

    if (filter) {
      if (filter.scriptId) {
        logs = logs.filter(l => l.scriptId === filter.scriptId);
      }
      if (filter.success !== undefined) {
        logs = logs.filter(l => l.success === filter.success);
      }
      if (filter.since) {
        logs = logs.filter(l => l.timestamp >= filter.since);
      }
      if (filter.limit) {
        logs = logs.slice(0, filter.limit);
      }
    }

    return logs;
  }

  /**
   * Get error summary for a script
   */
  async getErrorSummary(scriptId: string): Promise<{
    totalErrors: number;
    lastError?: string;
    lastErrorTime?: number;
    errorRate: number;
  }> {
    const logs = await this.getLogs({ scriptId });
    const errors = logs.filter(l => !l.success);
    const totalExecutions = logs.length;

    return {
      totalErrors: errors.length,
      lastError: errors[0]?.error,
      lastErrorTime: errors[0]?.timestamp,
      errorRate: totalExecutions > 0 ? errors.length / totalExecutions : 0
    };
  }

  /**
   * Handle script errors - could send to external service
   */
  private handleScriptError(execution: Omit<ExecutionLog, 'id' | 'timestamp'>): void {
    // Could integrate with error tracking service here
    console.error('User script error:', execution.scriptName, execution.error);
  }

  /**
   * Clear old logs
   */
  async clearLogs(olderThan?: number): Promise<number> {
    const logs = await this.storage.get<ExecutionLog[]>('logs', []);
    const cutoff = olderThan || Date.now() - 7 * 24 * 60 * 60 * 1000; // Default: 7 days

    const beforeCount = logs.length;
    const filtered = logs.filter(l => l.timestamp >= cutoff);
    const cleared = beforeCount - filtered.length;

    await this.storage.set('logs', filtered);

    return cleared;
  }
}
```

### Auto-Update from Remote URLs {#auto-update-from-remote-urls}

```typescript
// services/autoUpdater.ts

interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion?: string;
  newVersion?: string;
  newCode?: string;
}

class UserScriptAutoUpdater {
  private storage: Storage;
  private updateInterval = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.storage = new Storage('auto-update');
  }

  /**
   * Check for updates to a user script
   */
  async checkForUpdate(
    scriptId: string,
    updateUrl: string,
    currentVersion: string
  ): Promise<UpdateCheckResult> {
    try {
      const response = await fetch(updateUrl);
      
      if (!response.ok) {
        return { hasUpdate: false };
      }

      const code = await response.text();
      const metadata = this.parseVersionFromCode(code);

      if (!metadata.version) {
        return { hasUpdate: false };
      }

      const needsUpdate = this.compareVersions(metadata.version, currentVersion) > 0;

      return {
        hasUpdate: needsUpdate,
        currentVersion,
        newVersion: metadata.version,
        newCode: needsUpdate ? code : undefined
      };
    } catch (error) {
      console.error('Update check failed:', error);
      return { hasUpdate: false };
    }
  }

  /**
   * Start auto-update polling
   */
  startAutoUpdate(
    checkInterval: number = this.updateInterval,
    onUpdateAvailable: (scriptId: string, result: UpdateCheckResult) => void
  ): void {
    setInterval(async () => {
      await this.checkAllScripts(onUpdateAvailable);
    }, checkInterval);
  }

  /**
   * Check all scripts with update URLs
   */
  private async checkAllScripts(
    onUpdate: (scriptId: string, result: UpdateCheckResult) => void
  ): Promise<void> {
    const scripts = await this.storage.get<Array<{
      id: string;
      version?: string;
      updateUrl?: string;
    }>>('scripts-to-update', []);

    for (const script of scripts) {
      if (script.updateUrl && script.version) {
        const result = await this.checkForUpdate(
          script.id,
          script.updateUrl,
          script.version
        );

        if (result.hasUpdate) {
          onUpdate(script.id, result);
        }
      }
    }
  }

  /**
   * Parse version from userscript metadata
   */
  private parseVersionFromCode(code: string): { version?: string } {
    const match = code.match(/@version\s+(\S+)/);
    return {
      version: match?.[1]
    };
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }

    return 0;
  }

  /**
   * Mark a script for auto-update
   */
  async addToAutoUpdate(
    scriptId: string,
    updateUrl: string,
    version: string
  ): Promise<void> {
    const scripts = await this.storage.get<any[]>('scripts-to-update', []);

    // Remove existing entry if present
    const filtered = scripts.filter(s => s.id !== scriptId);

    filtered.push({ id: scriptId, updateUrl, version });
    await this.storage.set('scripts-to-update', filtered);
  }

  /**
   * Remove from auto-update
   */
  async removeFromAutoUpdate(scriptId: string): Promise<void> {
    const scripts = await this.storage.get<any[]>('scripts-to-update', []);
    const filtered = scripts.filter(s => s.id !== scriptId);
    await this.storage.set('scripts-to-update', filtered);
  }
}
```

---

## Summary Table {#summary-table}

| Pattern | Use Case | Key APIs | Complexity |
|---------|----------|----------|------------|
| **Pattern 1: Basics** | Basic script registration | `chrome.userScripts.register()` | Low |
| **Pattern 2: Runtime Registration** | Dynamic script management | `update()`, `unregister()` | Medium |
| **Pattern 3: Editor UI** | User script editing | CodeMirror/Monaco + storage | High |
| **Pattern 4: Match Patterns** | URL filtering | Match pattern validation | Medium |
| **Pattern 5: World Config** | Script isolation | `configureWorld()`, CSP | Medium |
| **Pattern 6: Libraries** | Shared utilities | `@require` equivalent | Medium |
| **Pattern 7: GM Compatibility** | Userscript migration | Metadata parsing, GM_* shims | High |
| **Pattern 8: Lifecycle** | Script state management | Enable/disable, logging, updates | High |

### Key Takeaways {#key-takeaways}

1. **Start with USER_SCRIPT world** for security; only use MAIN when page access is required
2. **Always validate match patterns** before registration to prevent errors
3. **Use `@theluckystrike/webext-storage`** for persistent script configuration
4. **Implement GM API shims** for maximum compatibility with existing userscripts
5. **Track execution state** to provide users with enable/disable functionality
6. **Consider CSP implications** when enabling inline scripts or external resources

### Additional Resources {#additional-resources}

- [Chrome User Scripts API Reference](https://developer.chrome.com/docs/extensions/mv3/user_scripts/)
- [Match Pattern Syntax](https://developer.chrome.com/docs/extensions/mv3/match_patterns/)
- [Greasemonkey Wiki](https://wiki.greasespot.net/)
- [Tampermonkey Documentation](https://www.tampermonkey.net/documentation.php)
