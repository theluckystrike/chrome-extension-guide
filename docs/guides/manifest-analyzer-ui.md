# Building a Manifest Analyzer UI Chrome Extension

A Manifest Analyzer is a developer tool that parses, validates, and provides insights into Chrome extension manifest.json files. This guide covers building a full-featured analyzer with an interactive UI.

## Table of Contents

- [Architecture and Manifest.json Setup](#architecture-and-manifestjson-setup)
- [Core Implementation with TypeScript](#core-implementation-with-typescript)
- [UI Design](#ui-design)
- [Chrome APIs and Permissions](#chrome-apis-and-permissions)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Testing Approach](#testing-approach)
- [Performance Considerations](#performance-considerations)
- [Publishing Checklist](#publishing-checklist)

---

## Architecture and Manifest.json Setup

The Manifest Analyzer follows a standard MV3 architecture:

### Directory Structure

```
manifest-analyzer/
├── manifest.json
├── background/service-worker.ts
├── popup/
│   ├── popup.html
│   ├── popup.ts
│   └── popup.css
├── lib/
│   ├── manifest-parser.ts
│   ├── manifest-validator.ts
│   └── types.ts
└── icons/
```

### Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Manifest Analyzer",
  "version": "1.0.0",
  "description": "Analyze and validate Chrome extension manifests",
  "permissions": ["storage", "tabs", "scripting", "activeTab", "management"],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {"16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png"}
  },
  "background": {"service_worker": "background/service-worker.js", "type": "module"},
  "content_scripts": [{"matches": ["<all_urls>"], "js": ["content.js"]}],
  "side_panel": {"default_path": "sidepanel/sidepanel.html"},
  "icons": {"16": "icons/16.png", "48": "icons/48.png", "128": "icons/128.png"}
}
```

---

## Core Implementation with TypeScript

### Shared Types

```typescript
export interface ChromeManifest {
  manifest_version: number;
  name: string;
  version: string;
  description?: string;
  permissions?: string[];
  host_permissions?: string[];
  content_scripts?: ContentScript[];
  background?: BackgroundConfig;
  [key: string]: unknown;
}

export interface ContentScript {
  matches: string[];
  js?: string[];
  css?: string[];
  run_at?: "document_start" | "document_end" | "document_idle";
}

export interface BackgroundConfig {
  service_worker?: string;
  scripts?: string[];
  page?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
  code: string;
}

export interface ManifestInfo {
  raw: string;
  parsed: ChromeManifest | null;
  errors: ValidationError[];
  warnings: ValidationError[];
  metadata: { fileSize: number; lineCount: number; parsedAt: number };
}
```

### Manifest Parser

```typescript
import { ChromeManifest, ManifestInfo } from "./types";

export class ManifestParser {
  private static instance: ManifestParser;

  static getInstance(): ManifestParser {
    return this.instance ?? (this.instance = new ManifestParser());
  }

  parse(manifestContent: string): ManifestInfo {
    const metadata = {
      fileSize: new Blob([manifestContent]).size,
      lineCount: manifestContent.split('\n').length,
      parsedAt: Date.now(),
    };

    try {
      const parsed = JSON.parse(manifestContent) as ChromeManifest;
      return { raw: manifestContent, parsed, errors: [], warnings: [], metadata };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown parse error';
      return {
        raw: manifestContent,
        parsed: null,
        errors: [{ field: 'json', message: `Parse Error: ${msg}`, severity: 'error', code: 'PARSE_ERROR' }],
        warnings: [],
        metadata,
      };
    }
  }

  async parseFromUrl(url: string): Promise<ManifestInfo> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return this.parse(await response.text());
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Fetch failed';
      return {
        raw: '', parsed: null,
        errors: [{ field: 'fetch', message: msg, severity: 'error', code: 'FETCH_ERROR' }],
        warnings: [], metadata: { fileSize: 0, lineCount: 0, parsedAt: Date.now() }
      };
    }
  }

  async parseFromExtension(extensionId: string): Promise<ManifestInfo> {
    return new Promise((resolve) => {
      chrome.management.get(extensionId, (ext) => {
        if (chrome.runtime.lastError) {
          resolve({
            raw: '', parsed: null,
            errors: [{ field: 'extension', message: chrome.runtime.lastError.message, severity: 'error', code: 'NOT_FOUND' }],
            warnings: [], metadata: { fileSize: 0, lineCount: 0, parsedAt: Date.now() }
          });
          return;
        }
        chrome.runtime.sendMessage(extensionId, { type: 'GET_MANIFEST' }, (response) => {
          if (chrome.runtime.lastError || !response?.manifest) {
            resolve({
              raw: '', parsed: null,
              errors: [{ field: 'manifest', message: 'Could not retrieve manifest', severity: 'error', code: 'RETRIEVAL_FAILED' }],
              warnings: [], metadata: { fileSize: 0, lineCount: 0, parsedAt: Date.now() }
            });
            return;
          }
          const manifestText = JSON.stringify(response.manifest, null, 2);
          const result = this.parse(manifestText);
          result.metadata = { ...result.metadata, extensionId };
          resolve(result);
        });
      });
    });
  }
}
```

### Manifest Validator

```typescript
import { ChromeManifest, ValidationError } from "./types";

export interface ValidationResult {
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class ManifestValidator {
  private static instance: ManifestValidator;

  static getInstance(): ManifestValidator {
    return this.instance ?? (this.instance = new ManifestValidator());
  }

  validate(manifest: ChromeManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required fields
    if (!manifest.name) errors.push({ field: 'name', message: 'Required field missing', severity: 'error', code: 'MISSING_NAME' });
    if (!manifest.version) errors.push({ field: 'version', message: 'Required field missing', severity: 'error', code: 'MISSING_VERSION' });
    if (!manifest.manifest_version) errors.push({ field: 'manifest_version', message: 'Required field missing', severity: 'error', code: 'MISSING_MV' });

    // Version format
    if (manifest.version && !/^\d+(\.\d+)*$/.test(manifest.version)) {
      warnings.push({ field: 'version', message: 'Version should follow semver format', severity: 'warning', code: 'INVALID_VERSION' });
    }

    // Manifest V2 deprecation
    if (manifest.manifest_version === 2) {
      warnings.push({ field: 'manifest_version', message: 'Manifest V2 is deprecated', severity: 'warning', code: 'DEPRECATED_MV2' });
    }

    // Permission checks
    const dangerousPerms = ['<all_urls>', 'http://*/*', 'https://*/*'];
    const perms = manifest.permissions || [];
    const hostPerms = manifest.host_permissions || [];
    if (perms.some(p => dangerousPerms.includes(p))) {
      warnings.push({ field: 'permissions', message: 'Broad permissions may affect review', severity: 'warning', code: 'BROAD_PERMISSIONS' });
    }

    // Content script security
    if (manifest.content_scripts?.some(cs => cs.matches?.includes('<all_urls>') && cs.js?.length)) {
      warnings.push({ field: 'content_scripts', message: 'Avoid injecting scripts on all URLs', severity: 'warning', code: 'OVERLY_BROAD_CS' });
    }

    // Background service worker
    if (manifest.background?.scripts?.length) {
      warnings.push({ field: 'background', message: 'Use service_worker instead of background scripts', severity: 'warning', code: 'BACKGROUND_SCRIPTS' });
    }

    // Icons
    if (!manifest.icons) {
      warnings.push({ field: 'icons', message: 'Icons are recommended', severity: 'info', code: 'NO_ICONS' });
    }

    return { errors, warnings };
  }
}
```

---

## UI Design

### Popup HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manifest Analyzer</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app">
    <header class="header">
      <h1>Manifest Analyzer</h1>
      <div class="tabs">
        <button class="tab active" data-tab="analyze">Analyze</button>
        <button class="tab" data-tab="installed">Installed</button>
        <button class="tab" data-tab="history">History</button>
      </div>
    </header>
    <main class="content">
      <section id="analyze-tab" class="tab-content active">
        <div class="input-group">
          <textarea id="manifest-input" placeholder="Paste manifest.json here..." rows="10"></textarea>
          <div class="actions">
            <button id="analyze-btn" class="btn primary">Analyze</button>
            <button id="clear-btn" class="btn secondary">Clear</button>
            <button id="load-file-btn" class="btn secondary">Load File</button>
          </div>
        </div>
        <div id="results" class="results hidden">
          <div class="summary">
            <div class="stat"><span class="stat-value" id="error-count">0</span><span class="stat-label">Errors</span></div>
            <div class="stat"><span class="stat-value" id="warning-count">0</span><span class="stat-label">Warnings</span></div>
            <div class="stat"><span class="stat-value" id="permission-count">0</span><span class="stat-label">Permissions</span></div>
          </div>
          <div class="details">
            <div class="section"><h3>Validation Results</h3><div id="validation-output" class="output"></div></div>
            <div class="section"><h3>Manifest Tree</h3><div id="manifest-tree" class="tree-view"></div></div>
          </div>
        </div>
      </section>
      <section id="installed-tab" class="tab-content"><div class="extension-list" id="extension-list"></div></section>
      <section id="history-tab" class="tab-content"><div class="history-list" id="history-list"></div></section>
    </main>
  </div>
  <script type="module" src="popup.js"></script>
</body>
</html>
```

### Popup CSS

```css
:root { --primary: #4285f4; --success: #34a853; --warning: #fbbc04; --error: #ea4335; --bg: #ffffff; --surface: #f8f9fa; --border: #e8eaed; --text: #202124; --text-secondary: #5f6368; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 400px; min-height: 500px; background: var(--bg); color: var(--text); }
.header { padding: 16px; border-bottom: 1px solid var(--border); background: var(--surface); }
.header h1 { font-size: 18px; font-weight: 600; margin-bottom: 12px; }
.tabs { display: flex; gap: 8px; }
.tab { flex: 1; padding: 8px 16px; border: none; background: transparent; cursor: pointer; border-radius: 4px; font-size: 13px; font-weight: 500; color: var(--text-secondary); transition: all 0.2s; }
.tab:hover { background: var(--border); }
.tab.active { background: var(--primary); color: white; }
.content { padding: 16px; }
.tab-content { display: none; }
.tab-content.active { display: block; }
.input-group { margin-bottom: 16px; }
textarea { width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-family: 'Monaco', 'Menlo', monospace; font-size: 12px; resize: vertical; margin-bottom: 12px; }
textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2); }
.actions { display: flex; gap: 8px; }
.btn { flex: 1; padding: 10px 16px; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn.primary { background: var(--primary); color: white; }
.btn.primary:hover { background: #3367d6; }
.btn.secondary { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
.btn.secondary:hover { background: var(--border); }
.results { background: var(--surface); border-radius: 8px; padding: 16px; }
.results.hidden { display: none; }
.summary { display: flex; justify-content: space-around; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
.stat { text-align: center; }
.stat-value { display: block; font-size: 24px; font-weight: 600; }
.stat-label { font-size: 12px; color: var(--text-secondary); }
.details .section { margin-bottom: 16px; }
.details h3 { font-size: 14px; margin-bottom: 8px; color: var(--text-secondary); }
.output { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; }
.tree-view { background: white; border: 1px solid var(--border); border-radius: 6px; padding: 8px; font-size: 12px; white-space: pre-wrap; }
.tree-item { padding: 4px 8px; cursor: pointer; }
.tree-key { color: #0451a5; }
.tree-value-string { color: #a31515; }
.error { color: var(--error); }
.warning { color: var(--warning); }
```

### Popup Logic

```typescript
import { ManifestParser } from "../lib/manifest-parser";
import { ManifestValidator } from "../lib/manifest-validator";
import { ManifestInfo, ChromeManifest } from "../lib/types";

class PopupApp {
  private parser = ManifestParser.getInstance();
  private validator = ManifestValidator.getInstance();
  private manifestInfo: ManifestInfo | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.getAttribute('data-tab')!));
    });
    document.getElementById('analyze-btn')?.addEventListener('click', () => this.analyze());
    document.getElementById('clear-btn')?.addEventListener('click', () => this.clear());
    document.getElementById('load-file-btn')?.addEventListener('click', () => this.loadFile());
    this.loadHistory();
  }

  private switchTab(tabName: string): void {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add('active');
    document.getElementById(`${tabName}-tab`)?.classList.add('active');
    if (tabName === 'installed') this.loadInstalledExtensions();
  }

  private analyze(): void {
    const input = (document.getElementById('manifest-input') as HTMLTextAreaElement).value.trim();
    if (!input) return this.showError('Please paste manifest content');
    this.manifestInfo = this.parser.parse(input);
    if (this.manifestInfo.parsed) {
      const validation = this.validator.validate(this.manifestInfo.parsed);
      this.manifestInfo.errors = [...this.manifestInfo.errors, ...validation.errors];
      this.manifestInfo.warnings = [...this.manifestInfo.warnings, ...validation.warnings];
    }
    this.displayResults(this.manifestInfo);
    this.saveToHistory(this.manifestInfo);
  }

  private displayResults(info: ManifestInfo): void {
    const results = document.getElementById('results');
    results?.classList.remove('hidden');
    const errorCount = document.getElementById('error-count');
    const warningCount = document.getElementById('warning-count');
    const permissionCount = document.getElementById('permission-count');
    if (errorCount) errorCount.textContent = String(info.errors.length);
    if (warningCount) warningCount.textContent = String(info.warnings.length);
    if (permissionCount) permissionCount.textContent = String((info.parsed?.permissions?.length ?? 0) + (info.parsed?.host_permissions?.length ?? 0));

    const output = document.getElementById('validation-output');
    if (output) {
      let html = '';
      if (info.errors.length) html += '<div class="errors">' + info.errors.map(e => `<div class="error">❌ ${e.field}: ${e.message}</div>`).join('') + '</div>';
      if (info.warnings.length) html += '<div class="warnings">' + info.warnings.map(w => `<div class="warning">⚠️ ${w.field}: ${w.message}</div>`).join('') + '</div>';
      if (!info.errors.length && !info.warnings.length) html = '<div class="success">✅ Manifest is valid!</div>';
      output.innerHTML = html;
    }
    const tree = document.getElementById('manifest-tree');
    if (tree && info.parsed) tree.innerHTML = `<pre>${JSON.stringify(info.parsed, null, 2)}</pre>`;
  }

  private clear(): void {
    (document.getElementById('manifest-input') as HTMLTextAreaElement).value = '';
    document.getElementById('results')?.classList.add('hidden');
    this.manifestInfo = null;
  }

  private loadFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) (document.getElementById('manifest-input') as HTMLTextAreaElement).value = await file.text();
    });
    input.click();
  }

  private async loadInstalledExtensions(): Promise<void> {
    const list = document.getElementById('extension-list');
    if (!list) return;
    try {
      const extensions = await new Promise<chrome.management.ExtensionInfo[]>(resolve => chrome.management.getAll(resolve));
      const userExtensions = extensions.filter(ext => !ext.isInstalled && ext.type === 'extension');
      list.innerHTML = userExtensions.map(ext => `
        <div class="extension-item" data-id="${ext.id}">
          <div class="extension-icon">${ext.icons?.[48] ? `<img src="${ext.icons[48]}" width="32">` : '📦'}</div>
          <div class="extension-info"><div class="extension-name">${ext.name}</div><div class="extension-id">${ext.id}</div></div>
          <button class="btn analyze-ext-btn" data-id="${ext.id}">Analyze</button>
        </div>`).join('');
      list.querySelectorAll('.analyze-ext-btn').forEach(btn => {
        btn.addEventListener('click', () => this.analyzeExtension(btn.getAttribute('data-id')!));
      });
    } catch { list.innerHTML = '<div class="error">Failed to load extensions</div>'; }
  }

  private async analyzeExtension(extensionId: string): Promise<void> {
    const info = await this.parser.parseFromExtension(extensionId);
    if (info.parsed) {
      const validation = this.validator.validate(info.parsed);
      info.errors = [...info.errors, ...validation.errors];
      info.warnings = [...info.warnings, ...validation.warnings];
    }
    const input = document.getElementById('manifest-input') as HTMLTextAreaElement;
    if (info.parsed) input.value = JSON.stringify(info.parsed, null, 2);
    this.displayResults(info);
    this.switchTab('analyze');
  }

  private async saveToHistory(info: ManifestInfo): Promise<void> {
    const history = await this.getHistory();
    history.unshift({ ...info, savedAt: Date.now() });
    if (history.length > 50) history.pop();
    await chrome.storage.local.set({ manifestHistory: history });
  }

  private async getHistory(): Promise<ManifestInfo[]> {
    const result = await chrome.storage.local.get('manifestHistory');
    return result.manifestHistory || [];
  }

  private async loadHistory(): Promise<void> {
    const history = await this.getHistory();
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = history.length ? history.slice(0, 20).map((h, i) => `<div class="history-item"><div class="history-name">${h.parsed?.name || 'Unknown'}</div><div class="history-version">${h.parsed?.version || '?'}</div><div class="history-errors">${h.errors.length} errors</div></div>`).join('') : '<div class="empty">No analysis history</div>';
  }

  private showError(message: string): void {
    const output = document.getElementById('validation-output');
    if (output) output.innerHTML = `<div class="error">${message}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => new PopupApp());
```

---

## Chrome APIs and Permissions

### Required Permissions

```json
{
  "permissions": ["storage", "tabs", "scripting", "activeTab", "management"],
  "host_permissions": ["<all_urls>"]
}
```

### API Usage Patterns

```typescript
// Storage - Persist analysis history
async function saveAnalysis(result: ManifestInfo): Promise<void> {
  await chrome.storage.local.set({ [`analysis_${Date.now()}`]: result });
}

// Management - List installed extensions
async function getInstalledExtensions(): Promise<chrome.management.ExtensionInfo[]> {
  return new Promise(resolve => chrome.management.getAll(extensions => resolve(extensions.filter(e => e.type === 'extension'))));
}

// Scripting - Extract manifest from tab
async function extractManifestFromTab(tabId: number): Promise<string | null> {
  const results = await chrome.scripting.executeScript({ target: { tabId }, func: () => document.querySelector('script[type="manifest"]')?.textContent });
  return results[0]?.result || null;
}

// Tabs - Get current tab
async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}
```

---

## State Management

### State Store Implementation

```typescript
import { ManifestInfo } from "./types";

interface AppState {
  currentAnalysis: ManifestInfo | null;
  history: ManifestInfo[];
  preferences: UserPreferences;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  autoValidate: boolean;
  showLineNumbers: boolean;
  maxHistoryItems: number;
}

class StateManager {
  private static instance: StateManager;
  private state: AppState;
  private listeners: Set<(state: AppState) => void> = new Set();

  private constructor() {
    this.state = { currentAnalysis: null, history: [], preferences: { theme: 'system', autoValidate: true, showLineNumbers: true, maxHistoryItems: 50 } };
    this.loadState();
  }

  static getInstance(): StateManager {
    return this.instance ?? (this.instance = new StateManager());
  }

  private async loadState(): Promise<void> {
    const stored = await chrome.storage.local.get(['history', 'preferences']);
    if (stored.history) this.state.history = stored.history;
    if (stored.preferences) this.state.preferences = { ...this.state.preferences, ...stored.preferences };
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void { this.listeners.forEach(l => l(this.state)); }

  setCurrentAnalysis(analysis: ManifestInfo): void {
    this.state.currentAnalysis = analysis;
    this.notify();
  }

  async addToHistory(analysis: ManifestInfo): Promise<void> {
    this.state.history.unshift(analysis);
    if (this.state.history.length > this.state.preferences.maxHistoryItems) this.state.history.pop();
    await chrome.storage.local.set({ history: this.state.history });
    this.notify();
  }

  async updatePreferences(prefs: Partial<UserPreferences>): Promise<void> {
    this.state.preferences = { ...this.state.preferences, ...prefs };
    await chrome.storage.local.set({ preferences: this.state.preferences });
    this.notify();
  }

  getState(): AppState { return this.state; }
}
```

---

## Error Handling

### Error Types and Handling

```typescript
class ManifestAnalyzerError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'ManifestAnalyzerError';
  }
}

type Result<T, E = ManifestAnalyzerError> = { success: true; data: T } | { success: false; error: E };

class SafeManifestParser {
  parseManifest(content: string): Result<ManifestInfo> {
    try {
      if (typeof content !== 'string') return { success: false, error: new ManifestAnalyzerError('Invalid input type', 'INVALID_INPUT_TYPE') };
      if (!content.trim()) return { success: false, error: new ManifestAnalyzerError('Content is empty', 'EMPTY_CONTENT') };
      if (content.length > 1024 * 1024) return { success: false, error: new ManifestAnalyzerError('Exceeds 1MB limit', 'SIZE_LIMIT_EXCEEDED') };
      const info = ManifestParser.getInstance().parse(content);
      return { success: true, data: info };
    } catch (error) {
      return { success: false, error: new ManifestAnalyzerError(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'UNEXPECTED_ERROR', error) };
    }
  }

  async fetchManifest(url: string): Promise<Result<ManifestInfo>> {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) return { success: false, error: new ManifestAnalyzerError('Only HTTP/HTTPS', 'INVALID_PROTOCOL') };
      const response = await fetch(url);
      if (!response.ok) return { success: false, error: new ManifestAnalyzerError(`HTTP ${response.status}`, 'FETCH_ERROR') };
      return this.parseManifest(await response.text());
    } catch (error) {
      return { success: false, error: new ManifestAnalyzerError(`Fetch failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'FETCH_FAILED', error) };
    }
  }
}

function handleEdgeCases(manifest: ChromeManifest): ValidationError[] {
  const warnings: ValidationError[] = [];
  if (manifest.manifest_version === 2) warnings.push({ field: 'manifest_version', message: 'Manifest V2 deprecated', severity: 'warning', code: 'DEPRECATED_MV2' });
  const dangerousPerms = ['<all_urls>', 'http://*/*', 'https://*/*'];
  const perms = manifest.permissions || [];
  if (perms.some(p => dangerousPerms.includes(p))) warnings.push({ field: 'permissions', message: 'Broad permissions may affect trust', severity: 'warning', code: 'BROAD_PERMISSIONS' });
  if (!manifest.name || !manifest.version) warnings.push({ field: 'metadata', message: 'Missing required fields', severity: 'error', code: 'MISSING_REQUIRED' });
  if (manifest.version && !/^\d+(\.\d+)*$/.test(manifest.version)) warnings.push({ field: 'version', message: 'Invalid semver format', severity: 'warning', code: 'INVALID_VERSION' });
  return warnings;
}
```

---

## Testing Approach

### Unit Tests with Vitest

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ManifestParser } from '../lib/manifest-parser';
import { ManifestValidator } from '../lib/manifest-validator';
import { ChromeManifest } from '../lib/types';

describe('ManifestParser', () => {
  let parser: ManifestParser;
  beforeEach(() => { parser = ManifestParser.getInstance(); });

  it('parses valid manifest', () => {
    const manifest = { manifest_version: 3, name: 'Test', version: '1.0.0' };
    const result = parser.parse(JSON.stringify(manifest));
    expect(result.parsed).to.deep.equal(manifest);
    expect(result.errors).toHaveLength(0);
  });

  it('handles invalid JSON', () => {
    const result = parser.parse('not valid json');
    expect(result.parsed).toBeNull();
    expect(result.errors[0].code).toBe('PARSE_ERROR');
  });

  it('tracks metadata', () => {
    const result = parser.parse('{"manifest_version":3,"name":"Test","version":"1.0"}');
    expect(result.metadata.lineCount).toBeGreaterThan(0);
    expect(result.metadata.fileSize).toBeGreaterThan(0);
  });
});

describe('ManifestValidator', () => {
  let validator: ManifestValidator;
  beforeEach(() => { validator = ManifestValidator.getInstance(); });

  it('validates valid manifest', () => {
    const manifest: ChromeManifest = { manifest_version: 3, name: 'Test', version: '1.0.0' };
    const result = validator.validate(manifest);
    expect(result.errors).toHaveLength(0);
  });

  it('detects missing required fields', () => {
    const manifest = { manifest_version: 2 } as ChromeManifest;
    const result = validator.validate(manifest);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('warns about deprecated MV2', () => {
    const manifest: ChromeManifest = { manifest_version: 2, name: 'Test', version: '1.0' };
    const result = validator.validate(manifest);
    expect(result.warnings.some(w => w.code === 'DEPRECATED_MV2')).toBe(true);
  });
});
```

### Integration Tests with Playwright

```typescript
import { test, expect } from '@playwright/test';

test.describe('Manifest Analyzer Popup', () => {
  test('analyzes valid manifest', async ({ page }) => {
    await page.goto('popup.html');
    const manifest = { manifest_version: 3, name: 'Test', version: '1.0.0', permissions: ['storage'] };
    await page.fill('#manifest-input', JSON.stringify(manifest, null, 2));
    await page.click('#analyze-btn');
    await expect(page.locator('#results')).toBeVisible();
    expect(await page.locator('#error-count').textContent()).toBe('0');
  });

  test('shows errors for invalid JSON', async ({ page }) => {
    await page.goto('popup.html');
    await page.fill('#manifest-input', 'invalid json');
    await page.click('#analyze-btn');
    await expect(page.locator('#results')).toBeVisible();
    expect(await page.locator('#error-count').textContent()).toBe('1');
  });

  test('loads file', async ({ page }) => {
    await page.goto('popup.html');
    const manifest = { manifest_version: 3, name: 'Test', version: '1.0' };
    await page.evaluate(manifest => {
      const input = document.createElement('input');
      input.type = 'file';
      const file = new File([JSON.stringify(manifest)], 'manifest.json', { type: 'application/json' });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, manifest);
    const value = await page.locator('#manifest-input').inputValue();
    expect(value).toContain('Test');
  });
});
```

---

## Performance Considerations

### Optimizations

```typescript
class PerformanceOptimizer {
  private cache = new Map<string, ManifestInfo>();
  private debounceTimers = new Map<string, number>();

  parseWithCache(content: string, maxCacheSize = 100): ManifestInfo {
    const hash = this.simpleHash(content);
    if (this.cache.has(hash)) return this.cache.get(hash)!;
    const result = ManifestParser.getInstance().parse(content);
    if (this.cache.size >= maxCacheSize) { const firstKey = this.cache.keys().next().value; this.cache.delete(firstKey); }
    this.cache.set(hash, result);
    return result;
  }

  debounce<T extends (...args: unknown[]) => void>(key: string, fn: T, delay = 300): T {
    return ((...args: unknown[]) => {
      const existing = this.debounceTimers.get(key);
      if (existing) clearTimeout(existing);
      const timer = window.setTimeout(() => { fn(...args); this.debounceTimers.delete(key); }, delay);
      this.debounceTimers.set(key, timer);
    }) as T;
  }

  createParserWorker(): Worker {
    const workerCode = `self.onmessage=function(e){try{self.postMessage({success:true,data:JSON.parse(e.data)})}catch(e){self.postMessage({success:false,error:e.message})}}`;
    return new Worker(URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' })));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash = hash & hash; }
    return hash.toString(36);
  }
}
```

---

## Publishing Checklist

### Pre-Submission Requirements

```markdown
## Publishing Checklist

### Code Quality
- [ ] All TypeScript compiles without errors
- [ ] No console.log in production code
- [ ] No hardcoded API keys or secrets
- [ ] Code is minified for production

### Manifest Configuration
- [ ] manifest_version is 3
- [ ] All required fields present
- [ ] Permissions are minimized
- [ ] Description < 132 characters
- [ ] Icons: 16x16, 48x48, 128x128

### Testing
- [ ] Manual testing in Chrome
- [ ] Popup works correctly
- [ ] Storage operations work

### Store Assets
- [ ] Screenshots (1280x800 or 640x400)
- [ ] Promotional tile (440x280)
- [ ] Privacy practices document

### Documentation
- [ ] README with features
- [ ] Installation instructions

### Chrome Web Store Submission
1. Upload zip (max 50MB)
2. Fill store listing
3. Upload assets
4. Set pricing
5. Submit for review
```

### Build Configuration (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup/popup.html'),
        sidepanel: resolve(__dirname, 'sidepanel/sidepanel.html'),
        background: resolve(__dirname, 'background/service-worker.ts'),
      },
    },
  },
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
});
```

---

## Summary

Building a Manifest Analyzer Chrome extension requires attention to:

1. **Architecture**: Standard MV3 structure with clear separation
2. **TypeScript**: Full type safety with shared types across contexts
3. **UI Design**: Intuitive interface with tabs, error display, and tree-view
4. **Chrome APIs**: Use storage, management, scripting appropriately
5. **State Management**: Reactive state with observer pattern
6. **Error Handling**: Result types with proper error feedback
7. **Testing**: Unit tests for logic, integration tests for UI
8. **Performance**: Cache results, debounce operations, use Web Workers
9. **Publishing**: Follow checklist to avoid rejection

This guide provides all the building blocks to create a professional Manifest Analyzer extension for Chrome developers.
