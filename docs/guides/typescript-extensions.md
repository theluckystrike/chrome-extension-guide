---
layout: default
title: "Chrome Extension TypeScript Extensions — Developer Guide"
description: "Learn Chrome extension typescript extensions with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/typescript-extensions/"
---
# TypeScript for Chrome Extensions

TypeScript brings type safety, autocompletion, and confident refactoring to Chrome extension development.

## Overview {#overview}

### Why TypeScript for Extensions {#why-typescript-for-extensions}

- **Type safety** — catch mismatched message shapes at compile time
- **Autocompletion** — `chrome.tabs.query` returns fully typed `Tab[]` objects
- **Confident refactoring** — rename fields, verify with `tsc`

### Chrome API Types {#chrome-api-types}

Install `@types/chrome` for all Chrome extension API types:

```bash
npm install --save-dev @types/chrome
```

## Project Setup {#project-setup}

```bash
mkdir my-extension && cd my-extension
npm init -y
npm install --save-dev typescript @types/chrome esbuild
mkdir src
```

### tsconfig.json {#tsconfigjson}

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["chrome"]
  },
  "include": ["src"]
}
```

## Build Pipeline {#build-pipeline}

### esbuild (Recommended) {#esbuild-recommended}

```typescript
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const entries = [
  { in: 'src/background.ts', out: 'background.js' },
  { in: 'src/popup.ts', out: 'popup.js' },
  { in: 'src/content.ts', out: 'content.js' },
];

const config: esbuild.BuildOptions = {
  bundle: true, sourcemap: true, target: 'chrome110',
  outdir: 'dist', format: 'iife',
};

async function build() {
  if (!existsSync('dist')) mkdirSync('dist');
  copyFileSync('manifest.json', 'dist/manifest.json');
  await Promise.all(entries.map(e =>
    esbuild.build({ ...config, entryPoints: [e.in], outfile: `dist/${e.out}` })
  ));
}
build();
```

## Typing Chrome APIs {#typing-chrome-apis}

### Automatic Types {#automatic-types}

```typescript
const tabs = await chrome.tabs.query({ active: true });
// tabs is typed as chrome.tabs.Tab[]
```

### Typed Message Passing {#typed-message-passing}

Define messages as discriminated unions:

```typescript
type MsgFromContent = { type: 'FETCH_URL'; url: string };
type MsgFromBg = { type: 'URL_DATA'; title: string };
type AllMessages = MsgFromContent | MsgFromBg;

const resp = await chrome.runtime.sendMessage<AllMessages, MsgFromBg>({
  type: 'FETCH_URL', url: 'https://example.com'
});

chrome.runtime.onMessage.addListener((msg: AllMessages, s, reply) => {
  if (msg.type === 'FETCH_URL') reply({ type: 'URL_DATA', title: 'Ex' });
  return true;
});
```

Use `@theluckystrike/webext-messaging` for simpler typed wrappers.

## Typed Storage {#typed-storage}

```typescript
interface ExtensionSettings {
  theme: 'light' | 'dark';
  notifications: boolean;
}

async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get('settings') as { settings?: ExtensionSettings };
  return result.settings ?? { theme: 'light', notifications: true };
}
```

`@theluckystrike/webext-storage` provides typed get/set helpers.

## Context-Specific Types {#context-specific-types}

### Content Scripts (DOM) {#content-scripts-dom}

```json
{ "compilerOptions": { "lib": ["ES2020", "DOM"] } }
```

Access `chrome.runtime`, `chrome.storage`—not `chrome.tabs`. Use messaging.

### Service Workers (WebWorker) {#service-workers-webworker}

```json
{ "compilerOptions": { "lib": ["ES2020", "WebWorker"] } }
```

## Summary {#summary}

1. Install `@types/chrome` for automatic Chrome API typing
2. Use esbuild for fast builds; Vite for framework UIs
3. Define message types as discriminated unions
4. Create storage interfaces instead of using `any`
5. Use separate tsconfigs: DOM for content scripts, WebWorker for service workers

Cross-references:
- `docs/guides/architecture-patterns.md` — structuring extensions
- `docs/guides/ci-cd-pipeline.md` — automated builds
- `docs/guides/debugging-extensions.md` — debugging typed code

## Related Articles {#related-articles}

## Related Articles

- [TypeScript Setup](../guides/typescript-setup.md)
- [Linting & Code Quality](../guides/linting-code-quality.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
