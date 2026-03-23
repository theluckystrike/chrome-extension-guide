---
layout: default
title: "Chrome Extension Project Structure. Developer Guide"
description: "Learn Chrome extension project structure with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-project-structure/"
---
Chrome Extension Project Structure

A well-organized project structure is the foundation of maintainable Chrome extension development. The right structure depends on your extension's complexity, whether you use a build tool, and how your team prefers to work. This guide covers recommended patterns from simple single-file extensions to complex monorepos.

Table of Contents {#table-of-contents}

- [Simple Projects (No Build)](#simple-projects-no-build)
- [Standard Projects (With Build)](#standard-projects-with-build)
- [Large Projects (Monorepo)](#large-projects-monorepo)
- [File Naming Conventions](#file-naming-conventions)
- [Where to Put Special Files](#where-to-put-special-files)
- [TypeScript Project References](#typescript-project-references)

---

Simple Projects (No Build) {#simple-projects-no-build}

For basic extensions that don't require a build step, keep everything flat and simple. This works well for single-purpose utilities, experiments, or prototypes.

```
my-extension/
 manifest.json
 background.js
 popup.html
 popup.js
 popup.css
 content.js
 content.css
 options.html
 options.js
 icons/
     icon-16.png
     icon-48.png
     icon-128.png
```

When This Structure Works {#when-this-structure-works}

- No TypeScript, no minification needed
- Single content script, no complex logic
- Quick prototyping or personal tools
- Total size under 10KB

manifest.json Example {#manifestjson-example}

```json
{
  "manifest_version": 3,
  "name": "My Simple Extension",
  "version": "1.0.0",
  "background": { "service_worker": "background.js" },
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "48": "icons/icon-48.png" }
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["content.css"]
  }],
  "options_page": "options.html",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

---

Standard Projects (With Build) {#standard-projects-with-build}

Most production extensions benefit from a build tool like Vite, esbuild, or webpack. A `src/` directory holds source files, while the build output goes to `dist/` or `build/`. This separation keeps your development files clean and allows for TypeScript, minification, and multi-file organization.

```
my-extension/
 src/
    background/
       index.ts          # Entry point
       events.ts         # Event handlers
       messaging.ts      # Message handling
    popup/
       index.html
       App.tsx           # Main React/Vue component
       components/
          Header.tsx
       styles/
           main.css
    content/
       index.ts
       inject.ts         # DOM injection logic
       utils.ts
    options/
       index.html
       Settings.tsx
    shared/
       types.ts          # Shared TypeScript types
       constants.ts
       utils.ts
    styles/
        global.css
 dist/                     # Build output (gitignored)
 node_modules/
 manifest.json
 package.json
 tsconfig.json
 vite.config.ts
 README.md
```

Why Separate Contexts {#why-separate-contexts}

Chrome extensions run code in multiple isolated contexts: the background service worker, popup pages, content scripts, and options pages. Each context has different capabilities and restrictions. Organizing by context makes it clear which code runs where and prevents accidental dependencies between incompatible contexts.

The `shared/` folder holds code that multiple contexts need, such as type definitions, message schemas, and utility functions. This code gets imported into each context's build, not executed directly.

For a detailed example of this structure with Vite, see [Vite Setup for Chrome Extensions](./vite-extension-setup.md). For more on architecting extensions at scale, see [Extension Architecture Patterns](./architecture-patterns.md).

---

Large Projects (Monorepo) {#large-projects-monorepo}

When maintaining multiple extensions or a companion web application, a monorepo structure shared packages reduce duplication and ensure consistency across projects.

```
monorepo/
 packages/
    shared/
       types/            # Shared TypeScript types
       utils/            # Shared utility functions
       constants/        # Shared constants
       storage/          # Shared storage utilities
    extension-a/
       src/
       manifest.json
       package.json
    extension-b/
       src/
       manifest.json
       package.json
    web/                  # Companion web app
        src/
        package.json
 package.json               # Root package.json with workspaces
 tsconfig.base.json
 README.md
```

package.json Workspaces Configuration {#packagejson-workspaces-configuration}

```json
{
  "name": "my-extensions-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev": "npm run dev --workspaces"
  }
}
```

Benefits of Monorepo {#benefits-of-monorepo}

- Shared code lives in one place, updated in one PR
- Consistent TypeScript configuration across all projects
- Cross-package refactoring with atomic commits
- Easier CI/CD: build and test everything with one command

For a comprehensive guide to TypeScript in extensions, see [TypeScript for Chrome Extensions](./typescript-extensions.md).

---

File Naming Conventions {#file-naming-conventions}

Consistent naming makes your project navigable. Choose a convention and apply it everywhere.

| Pattern | Example | Best For |
|---------|---------|----------|
| kebab-case | `message-handler.ts` | Most projects |
| camelCase | `messageHandler.ts` | TypeScript-heavy teams |
| Context prefix | `bg-messaging.ts`, `popup-App.tsx` | Large projects |

Recommended Patterns {#recommended-patterns}

- `index.ts`. Entry point for each context
- `*.test.ts`. Unit tests alongside source
- `*.d.ts`. Type declarations
- `types.ts`. Shared type definitions
- `constants.ts`. Configuration values

---

Where to Put Special Files {#where-to-put-special-files}

Assets (Images, Fonts, SVGs) {#assets-images-fonts-svgs}

```
src/
  assets/
    images/
      icon-16.png
      icon-48.png
      icon-128.png
    fonts/
      Inter-Regular.woff2
```

Reference in manifest:

```json
{
  "icons": {
    "16": "assets/images/icon-16.png",
    "48": "assets/images/icon-48.png",
    "128": "assets/images/icon-128.png"
  }
}
```

Locales (i18n) {#locales-i18n}

```
src/
  _locales/
    en/
      messages.json
    es/
      messages.json
    zh_CN/
      messages.json
```

Manifest reference:

```json
{
  "default_locale": "en"
}
```

JSON Schemas {#json-schemas}

```
src/
  schemas/
    config-schema.json
    message-schema.json
```

---

TypeScript Project References {#typescript-project-references}

For large projects, TypeScript project references enable incremental builds and strict separation between contexts.

```
tsconfig.json                 # Base config
 tsconfig.background.json
 tsconfig.popup.json
 tsconfig.content.json
 tsconfig.shared.json
```

Base tsconfig.json {#base-tsconfigjson}

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "composite": true
  }
}
```

Context tsconfig (e.g., background.json) {#context-tsconfig-eg-backgroundjson}

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../dist/background",
    "rootDir": "."
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": [".//*.ts"]
}
```

This pattern ensures that changes to shared types trigger rebuilds of all dependent contexts. See [TypeScript for Chrome Extensions](./typescript-extensions.md) for setup details.

---

Choosing the Right Structure {#choosing-the-right-structure}

Start simple and evolve as needed. A flat structure works for single-purpose extensions. Add `src/` and a build tool when TypeScript or multiple files become unwieldy. Move to monorepo when maintaining multiple extensions or a web companion app.

Remember: the goal is maintainability. If you can't find files, or changing one thing breaks another, your structure needs adjustment.

Related Articles {#related-articles}

Related Articles

- [Architecture Patterns](../guides/architecture-patterns.md)
- [Monorepo](../guides/chrome-extension-monorepo.md)
-e 
---


---
Turn Your Extension Into a Business
Ready to monetize? The [Extension Monetization Playbook](https://bestchromeextensions.com/extension-monetization-playbook/) covers freemium models, Stripe integration, subscription architecture, and growth strategies for Chrome extension developers.

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
