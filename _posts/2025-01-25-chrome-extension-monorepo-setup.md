---
layout: post
title: "Chrome Extension Monorepo Setup with Turborepo and pnpm"
description: "Learn how to set up a Chrome extension monorepo using Turborepo and pnpm workspaces. Build scalable, maintainable browser extensions with shared code, efficient builds, and streamlined development workflows."
date: 2025-01-25
categories: [tutorials, chrome-extensions, development-tools]
tags: [chrome extension monorepo, turborepo extension, pnpm workspace extension, monorepo browser extension, Turborepo, pnpm, web development, build tools]
keywords: "chrome extension monorepo, turborepo extension, pnpm workspace extension, monorepo browser extension, Turborepo pnpm, Chrome extension build setup"
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/2025/01/25/chrome-extension-monorepo-setup/"
---

# Chrome Extension Monorepo Setup with Turborepo and pnpm

Building a single Chrome extension is straightforward, but what happens when your project grows? You might find yourself managing multiple extensions that share common functionality, maintaining duplicate code across repositories, or struggling to keep dependencies synchronized. This is exactly where a monorepo approach shines, and combining it with Turborepo and pnpm creates a powerful development environment that scales with your project.

In this comprehensive guide, we will explore how to set up a Chrome extension monorepo using Turborepo for intelligent caching and build orchestration, and pnpm workspaces for efficient package management. By the end, you will have a production-ready monorepo structure that enables code sharing, faster builds, and maintainable extension development.

---

## Why Use a Monorepo for Chrome Extensions? {#why-monorepo}

Before diving into the technical setup, it is essential to understand why a monorepo approach makes sense for Chrome extension development. Many developers start with a single extension repository, but as their projects evolve, they encounter common challenges that a monorepo can solve.

### Code Sharing and Reusability

Chrome extensions often require shared functionality. Whether it is utility functions, common UI components, authentication logic, or API clients, having a single source of truth eliminates duplication. In a monorepo, you can create shared packages that every extension consumes, ensuring consistency and reducing maintenance overhead.

Consider a scenario where you build multiple extensions: a tab manager, a note-taking extension, and a productivity timer. All three likely need similar functionality for local storage, user preferences, and analytics. Instead of copying code across repositories, you maintain a single `@shared/*` package that each extension imports.

### Simplified Dependency Management

Managing dependencies across multiple repositories is painful. You might update a library in one project and forget to update it in another, leading to inconsistencies and potential bugs. With a monorepo, you declare dependencies once at the root level, and all projects share the same versions. pnpm workspaces make this particularly elegant by using symlinks to avoid duplicating node_modules.

### Unified Testing and Deployment

When all your extensions live in one repository, you can run the same test suites across all projects with a single command. CI/CD pipelines become simpler because you have one place to configure build processes, linting, and deployment. Turborepo adds intelligent caching to this, meaning only changed packages and their dependents rebuild, dramatically speeding up your CI/CD pipelines.

### Developer Experience

Developers can work on multiple extensions without constantly switching repositories. Code reviews, pull requests, and issues all live in one place. New team members can understand the entire project scope by exploring a single repository structure.

---

## Prerequisites and Tool Overview {#prerequisites}

Before setting up your monorepo, ensure you have the following tools installed:

- **Node.js** (version 18 or higher)
- **pnpm** (version 8 or higher) — Install via: `npm install -g pnpm`
- **Git** for version control

Now let us understand the key tools we will be using:

### Why pnpm?

pnpm (Performant npm) is a fast, disk space-efficient package manager. Its key advantage is the use of a content-addressable store that saves disk space by hard-linking files that are the same across projects. For monorepos, this means you can have dozens of packages without the massive node_modules folders that npm or yarn produce.

Additionally, pnpm's workspace feature is first-class. You define your workspace in `pnpm-workspace.yaml`, and pnpm automatically links packages within your monorepo. This makes local package development seamless — no need for `npm link` or `yarn link`.

### Why Turborepo?

Turborepo is a build system for monorepos that focuses on speed and efficiency. Its key features include:

- **Intelligent Caching**: Turborepo caches build outputs locally and in the cloud. If a package has not changed since the last build, Turborepo skips it entirely.
- **Pipeline Orchestration**: You define a pipeline in `turbo.json` that specifies which tasks depend on which. Turborepo ensures tasks run in the correct order and only when needed.
- **Remote Caching**: By connecting to Vercel's remote cache (or your own), you can share build caches across your team, further speeding up development.
- **Zero Configuration**: Turborepo works out of the box with most tools, though you can customize as needed.

---

## Step-by-Step Monorepo Setup {#step-by-step-setup}

Let us build our Chrome extension monorepo from scratch. We will create a structure that supports multiple extensions with shared code between them.

### Step 1: Initialize the Repository

Start by creating a new directory for your monorepo and initializing it with Git:

```bash
mkdir chrome-extension-monorepo
cd chrome-extension-monorepo
git init
```

Initialize a new Node.js project:

```bash
pnpm init
```

### Step 2: Configure pnpm Workspaces

Create a `pnpm-workspace.yaml` file at the root of your repository:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

This configuration tells pnpm that all directories under `apps/` and `packages/` are workspace packages. The `apps/` directory will contain your Chrome extensions, while `packages/` will hold shared code.

Create the directory structure:

```bash
mkdir -p apps/extension-a packages/shared apps/extension-b
```

### Step 3: Set Up Turborepo

Install Turborepo as a development dependency:

```bash
pnpm add -Dw turbo
```

Create a `turbo.json` file at the root:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

This pipeline defines how tasks should run. The `build` task depends on `^build`, meaning it waits for all dependencies to build first. The outputs specify what directories should be cached.

### Step 4: Configure Root Package.json

Update your root `package.json` to include scripts that run across the monorepo:

```json
{
  "name": "chrome-extension-monorepo",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

---

## Creating Shared Packages {#shared-packages}

Now let us create a shared package that our extensions will use. This demonstrates the real power of a monorepo.

### Creating the Shared Utils Package

Navigate to the packages directory and create a new shared utilities package:

```bash
cd packages
mkdir -p shared-utils/src
cd shared-utils
```

Initialize the package:

```bash
pnpm init
```

Update the `package.json` with proper naming and TypeScript support:

```json
{
  "name": "@chrome-extensions/shared-utils",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

Install TypeScript:

```bash
pnpm add -D typescript
```

Create a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Now create some useful utility functions in `src/index.ts`:

```typescript
// Storage utilities
export function getFromStorage<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] as T | undefined);
    });
  });
}

export function setToStorage<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      resolve();
    });
  });
}

// Message passing utilities
export function sendMessageToContent<T>(tabId: number, message: T): Promise<unknown> {
  return chrome.tabs.sendMessage(tabId, message);
}

export function sendMessageToBackground<T>(message: T): Promise<unknown> {
  return chrome.runtime.sendMessage(message);
}

// Date utilities
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}
```

Build the shared package:

```bash
pnpm build
```

---

## Creating Chrome Extensions in the Monorepo {#creating-extensions}

Now let us create our first Chrome extension in the `apps/` directory. We will use a simple but complete setup that demonstrates how extensions work within a monorepo.

### Setting Up Extension A

Navigate to the apps directory and create a new extension:

```bash
cd apps/extension-a
mkdir -p src/background src/content src/popup src/shared
```

Initialize the extension:

```bash
pnpm init
```

Update the package.json:

```json
{
  "name": "extension-a",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc && node scripts/build.js",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  },
  "dependencies": {
    "@chrome-extensions/shared-utils": "workspace:*"
  }
}
```

Note the `workspace:*` syntax — this tells pnpm to use the local version of our shared package.

Install dependencies:

```bash
pnpm install
```

Create the manifest file (`src/manifest.json`):

```json
{
  "manifest_version": 3,
  "name": "Extension A - Sample Extension",
  "version": "1.0.0",
  "description": "A sample Chrome extension demonstrating monorepo setup",
  "permissions": [
    "storage",
    "tabs"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}
```

Create a basic TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "../dist/extension-a"
  },
  "include": ["src/**/*"]
}
```

Now create the source files. First, the background script (`src/background/index.ts`):

```typescript
import { getFromStorage, setToStorage } from '@chrome-extensions/shared-utils';

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_DATA') {
    handleGetData(message.key).then(sendResponse);
    return true;
  }
  
  if (message.type === 'SET_DATA') {
    handleSetData(message.key, message.value).then(() => sendResponse({ success: true }));
    return true;
  }
});

async function handleGetData(key: string) {
  const data = await getFromStorage(key);
  return data;
}

async function handleSetData(key: string, value: unknown) {
  await setToStorage(key, value);
}

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension A installed');
  setToStorage('extensionAInstalled', new Date().toISOString());
});
```

Content script (`src/content/index.ts`):

```typescript
import { sendMessageToBackground } from '@chrome-extensions/shared-utils';

// Communicate with the background script
document.addEventListener('DOMContentLoaded', async () => {
  const response = await sendMessageToBackground({ type: 'GET_DATA', key: 'test' });
  console.log('Background response:', response);
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  console.log('Received message from background:', message);
});
```

Popup script (`src/popup/index.ts`):

```typescript
import { getFromStorage, setToStorage, formatDate } from '@chrome-extensions/shared-utils';

document.addEventListener('DOMContentLoaded', async () => {
  const installDate = await getFromStorage<string>('extensionAInstalled');
  
  const displayElement = document.getElementById('install-date');
  if (displayElement && installDate) {
    displayElement.textContent = `Installed: ${formatDate(new Date(installDate))}`;
  }
  
  // Add save functionality
  const saveButton = document.getElementById('save-button');
  saveButton?.addEventListener('click', async () => {
    const input = document.getElementById('user-input') as HTMLInputElement;
    if (input?.value) {
      await setToStorage('userData', input.value);
      alert('Saved!');
    }
  });
});
```

A simple HTML for the popup (`src/popup/popup.html`):

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 300px; padding: 16px; font-family: Arial, sans-serif; }
    input { width: 100%; padding: 8px; margin: 8px 0; }
    button { padding: 8px 16px; background: #4285f4; color: white; border: none; cursor: pointer; }
  </style>
</head>
<body>
  <h2>Extension A</h2>
  <p id="install-date">Loading...</p>
  <input type="text" id="user-input" placeholder="Enter some data">
  <button id="save-button">Save</button>
  <script src="popup.js"></script>
</body>
</html>
```

This demonstrates how the extension uses shared utilities from our monorepo package. The same pattern applies to any additional extensions you create.

---

## Running and Building {#running-building}

Now let us see how to run and build the extensions using Turborepo.

### Development Mode

To run all extensions in development mode:

```bash
pnpm dev
```

This runs the `dev` script in each package. For TypeScript packages, this typically starts a watch mode that recompiles on changes.

### Building All Extensions

To build everything:

```bash
pnpm build
```

Turborepo will analyze the dependency graph and build packages in the correct order. The shared-utils package builds first, then any extensions that depend on it.

Because of our `turbo.json` configuration, if you make changes to only one extension, Turborepo is smart enough to skip rebuilding the unchanged packages. This is the power of Turborepo's caching.

### Building a Specific Extension

To build just one extension:

```bash
pnpm --filter extension-a build
```

The `--filter` flag lets you target specific packages in the workspace.

---

## Adding a Second Extension {#second-extension}

One of the main benefits of the monorepo is easily creating additional extensions. Let us add Extension B that also uses our shared utilities.

```bash
cd apps/extension-b
mkdir -p src/background src/popup
pnpm init
```

Update the package.json to include the shared dependency:

```json
{
  "name": "extension-b",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "tsc && node scripts/build.js",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@chrome-extensions/shared-utils": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

Install and create the extension files following the same pattern as Extension A. Because the shared utilities are already built, the new extension can immediately use them without any additional setup.

---

## Best Practices for Chrome Extension Monorepos {#best-practices}

Now that you have a working monorepo, here are some best practices to keep your project maintainable:

### Organize Shared Code Thoughtfully

Create focused shared packages rather than one massive shared package. Common patterns include:

- `@chrome-extensions/shared-utils` — General utility functions
- `@chrome-extensions/shared-types` — TypeScript types and interfaces
- `@chrome-extensions/shared-ui` — Reusable UI components
- `@chrome-extensions/shared-api` — API clients and communication utilities

### Use Consistent TypeScript Configurations

Create a base TypeScript configuration that all packages extend:

```json
// packages/tsconfig/base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true
  }
}
```

Each package then references this base:

```json
{
  "extends": "../../packages/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

### Configure ESLint and Prettier Globally

Ensure code quality across all packages by configuring linting and formatting at the root level. Install tools as devDependencies at the root and create root-level configuration files that all packages reference.

### Use Turborepo Remote Caching

For teams, set up Turborepo's remote caching to share build outputs. This dramatically speeds up CI/CD pipelines because team members benefit from each other's cached builds.

---

## Troubleshooting Common Issues {#troubleshooting}

Even with a well-structured monorepo, you may encounter some challenges:

### Circular Dependencies

Be careful not to create circular dependencies between your packages. If Package A depends on Package B, Package B should not depend on Package A. Use tools like `dependency-cruiser` to detect circular dependencies early.

### Build Order Issues

If a package fails to build, check that its dependencies are properly configured in package.json. The `workspace:*` syntax should resolve correctly, but verify that TypeScript can find the type definitions.

### Chrome API Types

Make sure you have the appropriate Chrome types installed in packages that use Chrome APIs:

```bash
pnpm add -D @types/chrome
```

---

## Conclusion {#conclusion}

Setting up a Chrome extension monorepo with Turborepo and pnpm provides a scalable foundation for building and maintaining multiple extensions. The combination of pnpm workspaces for efficient package management and Turborepo for intelligent build caching creates a development experience that is both fast and maintainable.

The monorepo approach enables you to share code between extensions, keep dependencies synchronized, and simplify your CI/CD pipelines. As your extension ecosystem grows, this structure scales elegantly — you can add new extensions and shared packages without reorganizing your entire development workflow.

Start with a simple setup like the one in this guide, and evolve it as your needs grow. The initial investment in setting up the monorepo structure pays dividends in reduced maintenance overhead and improved developer productivity.

Remember: the goal is not to use every feature of Turborepo and pnpm at once, but to build a foundation that makes adding new extensions and shared functionality straightforward. Your future self will thank you when you can add a new extension to your monorepo in minutes instead of hours.

---

## Additional Resources {#resources}

To continue learning and improving your Chrome extension monorepo setup, explore these resources:

- [Turborepo Documentation](https://turbo.build/repo/docs) — Official docs for advanced features
- [pnpm Workspaces Guide](https://pnpm.io/workspaces) — Deep dive into workspace configuration
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/) — Official Chrome extension development docs
- [Manifest V3 Migration Guide](/chrome-extension-guide/2025/01/16/manifest-v3-migration-complete-guide-2025/) — Learn about the latest Chrome extension platform

Happy building!
