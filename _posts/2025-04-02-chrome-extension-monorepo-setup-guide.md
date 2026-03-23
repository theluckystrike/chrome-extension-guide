---
layout: post
title: "Chrome Extension Monorepo Setup: Manage Multiple Extensions in One Repo"
description: "Learn how to set up a chrome extension monorepo using Turborepo. Manage multiple Chrome extensions in one repository with shared code, efficient builds, and streamlined maintenance."
date: 2025-04-02
categories: [Chrome-Extensions, Architecture]
tags: [monorepo, architecture, chrome-extension]
keywords: "chrome extension monorepo, monorepo chrome extension, turborepo chrome extension, chrome extension workspace, manage multiple extensions"
canonical_url: "https://bestchromeextensions.com/2025/04/02/chrome-extension-monorepo-setup-guide/"
---

# Chrome Extension Monorepo Setup: Manage Multiple Extensions in One Repo

If you are developing multiple Chrome extensions, managing each in a separate repository can quickly become a maintenance nightmare. Duplicated code, inconsistent configurations, and scattered dependencies make it difficult to maintain quality and efficiency across your extension portfolio. This is where a chrome extension monorepo comes into play—a powerful architectural approach that allows you to manage multiple extensions in a single repository while sharing code, reducing redundancy, and streamlining your development workflow.

In this comprehensive guide, we will walk you through setting up a chrome extension monorepo using Turborepo, one of the most popular monorepo tools in the JavaScript ecosystem. Whether you are a solo developer or part of a team building dozens of extensions, this guide will help you understand the benefits, challenges, and practical implementation details of consolidating your Chrome extension development into a unified repository.

---

## Why Use a Monorepo for Chrome Extensions {#why-monorepo}

Before diving into the technical implementation, it is essential to understand why you should consider a monorepo approach for your Chrome extensions. The benefits extend far beyond simple organizational convenience and can significantly impact your development velocity and code quality.

### The Problem with Polyrepo setups

When each Chrome extension lives in its own repository, you inevitably encounter code duplication. Common utilities, shared libraries, authentication helpers, UI components, and testing utilities get copied across repositories. This duplication creates several problems: bug fixes require changes in multiple places, keeping dependencies synchronized becomes tedious, and maintaining consistent code quality across extensions proves challenging.

Additionally, polyrepo setups lead to fragmented tooling. Each repository might use slightly different versions of build tools, testing frameworks, or linting configurations. This inconsistency makes it harder to onboard new team members and creates cognitive overhead when switching between projects.

### Benefits of Chrome Extension Monorepo

A monorepo chrome extension setup addresses these challenges comprehensively. First and foremost, code sharing becomes trivial. You can create a shared packages directory containing common utilities, UI components, and business logic that all your extensions can import directly. This eliminates duplication and ensures that improvements to shared code benefit all extensions immediately.

Dependency management becomes centralized. Instead of updating the same dependency in ten different repositories, you update it once in the monorepo's root, and all extensions automatically receive the update. This dramatically reduces maintenance overhead and ensures consistency across your extension portfolio.

Build efficiency is another significant advantage. Turborepo, the monorepo orchestrator we will use, intelligently caches build outputs and only rebuilds what has changed. If you modify a shared utility, only the extensions that depend on that utility will rebuild—everything else uses cached results. This can reduce build times from minutes to seconds in large monorepos.

Finally, tooling consolidation simplifies your development environment. ESLint, TypeScript, Prettier, Jest, and other tools are configured once at the root level. All extensions inherit these configurations, ensuring consistent code style and quality standards without repetitive setup.

---

## Understanding Turborepo for Chrome Extension Development {#understanding-turborepo}

Turborepo has become the de facto standard for JavaScript monorepos, and it is exceptionally well-suited for Chrome extension development. Its intelligent caching, pipeline system, and zero-config setup make it an ideal choice for managing multiple extensions.

### What Makes Turborepo Special

Turborepo introduces the concept of "tasks" and "pipelines" to monorepo management. A pipeline defines how different scripts relate to each other and which ones can run in parallel. For Chrome extensions, typical pipelines might include building, testing, linting, and packaging. Turborepo automatically determines which tasks need to run based on what files have changed.

The remote caching feature takes this further by caching build outputs in the cloud. If you run a build on your local machine, that cache can be shared with your CI/CD pipeline and even with other developers on your team. This means that once someone builds a particular configuration, everyone else gets instant cached results.

### Alternative Monorepo Tools

While Turborepo is our primary focus, it is worth noting alternatives. Nx is another powerful option with more extensive features, including built-in code generation and advanced analysis tools. However, Nx has a steeper learning curve and more overhead. Yarn Workspaces and npm Workspaces provide basic monorepo functionality without the sophisticated caching and pipeline features of Turborepo. For most Chrome extension projects, Turborepo strikes the best balance between power and simplicity.

---

## Setting Up Your Chrome Extension Monorepo {#setting-up}

Now let us dive into the practical implementation. We will create a monorepo structure that can host multiple Chrome extensions while sharing common code.

### Prerequisites

Before starting, ensure you have Node.js 18 or later installed. You will also need npm, yarn, or pnpm as your package manager. For this guide, we will use pnpm due to its excellent monorepo support and efficient disk space usage, but the concepts apply equally to other package managers.

### Step 1: Initialize the Monorepo

Create a new directory for your monorepo and initialize it with a package.json file. This root package.json will serve as the configuration hub for your entire monorepo.

```bash
mkdir chrome-extension-monorepo
cd chrome-extension-monorepo
npm init -y
```

Next, install Turborepo as a dev dependency:

```bash
npm install -D turbo
```

### Step 2: Configure the Monorepo Structure

Create a turbo.json file at the root of your monorepo. This file defines your build pipelines and caching behavior:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "package": {
      "dependsOn": ["build"],
      "outputs": ["dist/**"]
    }
  }
}
```

This configuration tells Turborepo that the "build" task depends on the "^build" task, meaning it must wait for all dependencies to finish building first. The "outputs" array specifies which directories contain build artifacts that should be cached.

### Step 3: Create the Workspace Configuration

Add workspace configuration to your root package.json. This tells your package manager that the monorepo contains multiple packages:

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
    "test": "turbo run test",
    "lint": "turbo run lint",
    "package": "turbo run package"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

This configuration creates two workspace categories: "apps" for your Chrome extensions and "packages" for shared code libraries.

---

## Creating Chrome Extension Apps {#creating-extensions}

With the monorepo structure in place, we can now create Chrome extension applications. Each extension will be a self-contained app within the monorepo.

### Setting Up Your First Extension

Create a new directory under apps for your first extension:

```bash
mkdir apps/my-first-extension
cd apps/my-first-extension
npm init -y
```

Install the necessary dependencies for Chrome extension development:

```bash
npm install -D typescript @types/chrome webpack webpack-cli webpack-merge html-webpack-plugin css-loader style-loader ts-loader copy-webpack-plugin
```

Create a tsconfig.json for TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Creating the Manifest

Every Chrome extension requires a manifest.json file. Create this file in your extension directory:

```json
{
  "manifest_version": 3,
  "name": "My First Extension",
  "version": "1.0.0",
  "description": "My first Chrome extension in a monorepo",
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  },
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"]
}
```

### Building the Extension

Create a webpack.config.js to bundle your extension:

```javascript
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: {
    popup: './src/popup.ts',
    background: './src/background.ts',
    content: './src/content.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup.html',
      filename: 'popup.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'icon.png', to: 'icon.png' }
      ]
    })
  ]
};
```

Add build scripts to your extension's package.json:

```json
{
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch",
    "package": "zip -r extension.zip dist/"
  }
}
```

---

## Creating Shared Packages {#shared-packages}

The real power of a chrome extension monorepo emerges when you create shared packages that multiple extensions can use. This is where you eliminate code duplication and build a library of reusable components.

### Creating a Shared UI Package

Create a package for shared UI components:

```bash
mkdir packages/ui-components
cd packages/ui-components
npm init -y
```

Install React for building UI components:

```bash
npm install react react-dom
npm install -D @types/react @types/react-dom typescript
```

Create TypeScript configuration and your first component:

```typescript
// packages/ui-components/src/Button.tsx
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  onClick,
  variant = 'primary' 
}) => {
  const baseStyles = 'px-4 py-2 rounded font-medium transition-colors';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300'
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

Export your components from an index file:

```typescript
// packages/ui-components/src/index.ts
export { Button } from './Button';
```

Update the package.json to include TypeScript build configuration:

```json
{
  "name": "@chrome-extensions/ui-components",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### Using Shared Packages in Extensions

Now your extensions can easily import shared components. In your extension's package.json, add a dependency on the shared package:

```json
{
  "dependencies": {
    "@chrome-extensions/ui-components": "*"
  }
}
```

In your extension's code, import and use the shared component:

```typescript
import { Button } from '@chrome-extensions/ui-components';

export const Popup: React.FC = () => {
  return (
    <div className="popup-container">
      <h1>My Extension</h1>
      <Button onClick={() => console.log('Clicked!')}>
        Click Me
      </Button>
    </div>
  );
};
```

---

## Advanced Monorepo Patterns {#advanced-patterns}

As your monorepo grows, you will want to implement additional patterns to maintain organization and efficiency.

### Shared Configuration Packages

Create packages that centralize configuration across all extensions. For example, a types package can define shared TypeScript types:

```bash
mkdir packages/types
cd packages/types
npm init -y
```

Define shared types that all extensions use:

```typescript
// packages/types/src/index.ts
export interface ExtensionConfig {
  apiKey?: string;
  debugMode: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface UserPreferences {
  notifications: boolean;
  autoUpdate: boolean;
  dataRetention: number;
}
```

### Shared Utility Libraries

Create utility packages for common functionality:

```bash
mkdir packages/utils
cd packages/utils
npm init -y
```

Implement shared utilities:

```typescript
// packages/utils/src/storage.ts
export const storage = {
  async get<T>(key: string, defaultValue: T): Promise<T> {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T) ?? defaultValue;
  },
  
  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },
  
  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }
};
```

### Managing Multiple Extensions

A well-structured chrome extension workspace allows you to manage multiple extensions efficiently. Each extension in your apps directory is independent but can leverage shared packages. This architecture scales beautifully—from two extensions to twenty or more.

To add a new extension, simply create a new directory under apps with the same structure as your first extension. It automatically gains access to all shared packages and inherits your monorepo's build configuration.

---

## Best Practices for Chrome Extension Monorepos {#best-practices}

Following established best practices ensures your monorepo remains maintainable as it grows.

### Dependency Management

Keep your root package.json lean. Only add truly global dependencies there. Extension-specific dependencies belong in each app's package.json. Use consistent dependency versions across your monorepo by establishing a central "versions" file or using npm's resolution overrides.

### Build Optimization

Configure Turborepo's caching appropriately. Ensure that your build outputs are correctly specified in the turbo.json so that only changed packages rebuild. Use the "outputs" field strategically—exclude development artifacts and include only production-ready files.

### Code Sharing Guidelines

Establish clear boundaries between shared packages. A good rule is that shared packages should have no knowledge of specific extensions. They should be general-purpose enough that any extension could use them. This prevents tight coupling and makes packages easier to maintain.

### Testing Strategy

Implement tests at both the package level and the extension level. Shared packages should have comprehensive unit tests. Extensions should have integration tests that verify the extension loads correctly and interacts with Chrome APIs as expected.

---

## Common Pitfalls and How to Avoid Them {#pitfalls}

Even well-planned monorepos can run into issues. Here are common problems and solutions.

### Circular Dependencies

Never create circular dependencies between packages. If Package A imports Package B, Package B cannot import Package A. Use dependency analysis tools to detect cycles early. If you find packages that seem to need circular imports, reconsider your package boundaries.

### Version Mismatches

Different extensions might need different versions of the same dependency. While this is one of the trickiest monorepo challenges, solutions include using pnpm's strict peer dependencies, creating version-specific packages, or using package overrides carefully.

### Build Conflicts

If multiple extensions define the same build scripts, there can be conflicts. Use Turborepo's pipeline to orchestrate builds so they run in the correct order. Ensure each extension's webpack configuration outputs to unique directories.

---

## Conclusion {#conclusion}

Setting up a chrome extension monorepo is one of the most impactful architectural decisions you can make for your extension development workflow. By consolidating multiple extensions into a single repository with shared code packages, you eliminate duplication, simplify dependency management, and dramatically improve build times through intelligent caching.

Turborepo provides an excellent foundation for this approach, offering zero-config setup, powerful caching, and seamless integration with modern JavaScript tooling. Whether you are building two extensions or fifty, the monorepo pattern scales to meet your needs.

The initial setup investment pays dividends quickly. Your team can move faster, maintain consistency more easily, and focus on building great extensions rather than managing infrastructure. Shared packages for UI components, utilities, and types become valuable assets that improve with each use.

Start small—perhaps with just one shared utility package—and expand as you identify opportunities for code sharing. Your future self will thank you for the cleaner, more maintainable codebase that a well-organized chrome extension monorepo provides.

Ready to transform your Chrome extension development workflow? Clone a starter template, adapt it to your needs, and experience the benefits of unified extension management today.
