---
layout: default
title: "Chrome Extension Webpack Setup — Developer Guide"
description: "Set up your Chrome extension project with this configuration guide covering tools, frameworks, and best practices for development."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/webpack-extension-setup/"
---
# Webpack Setup for Chrome Extensions

## Overview {#overview}

Webpack is a powerful and mature JavaScript bundler that provides excellent flexibility for Chrome extension development. While newer tools like Vite and esbuild offer faster development cycles, Webpack's extensive plugin ecosystem, sophisticated code splitting capabilities, and fine-grained control make it an excellent choice for complex extension projects requiring advanced customization.

This guide covers setting up Webpack 5 for Chrome extension development, configuring multi-entry builds for different extension contexts, and establishing efficient development and production workflows.

## Why Webpack {#why-webpack}

Webpack offers several compelling advantages for Chrome extension development. First, its mature plugin ecosystem provides solutions for nearly any build requirement, from copying static assets to generating dynamic manifests. The code splitting capabilities are particularly powerful, allowing you to extract shared code between content scripts, background scripts, and popup pages into common chunks that reduce overall bundle size.

Webpack's configuration system, while more complex than modern alternatives, offers unparalleled control over the bundling process. You can define complex module rules, implement custom plugins, and configure precise output behaviors that aren't easily achievable with simpler tools. Additionally, Webpack 5's Module Federation enables sophisticated patterns for sharing code between different parts of your extension or even between multiple extensions.

## Project Structure {#project-structure}

A typical Chrome extension project built with Webpack follows a structured directory layout:

```
src/
  background/
    service-worker.ts      # Background service worker entry
  content/
    content-script.ts     # Content script entry
  popup/
    popup.html            # Popup HTML entry
    popup.tsx             # Popup React/Vue component
    popup.css             # Popup styles
  options/
    options.html          # Options page HTML entry
    options.tsx           # Options React/Vue component
    options.css           # Options styles
  shared/
    types.ts              # Shared TypeScript types
    utils.ts              # Shared utility functions
  styles/
    global.css            # Global styles
manifest.json             # Extension manifest
webpack.config.js         # Webpack configuration
package.json              # Dependencies and scripts
tsconfig.json             # TypeScript configuration
```

This structure keeps each extension context isolated while allowing shared code to be imported where needed. The manifest.json stays in the project root and gets copied to the dist folder during the build process.

## Webpack Configuration {#webpack-configuration}

The Webpack configuration for Chrome extensions requires setting up multiple entry points, each corresponding to a different extension context. Here is a comprehensive configuration:

```javascript
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { DefinePlugin } = require('webpack');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDev ? 'development' : 'production',
  entry: {
    popup: './src/popup/popup.tsx',
    options: './src/options/options.tsx',
    background: './src/background/service-worker.ts',
    'content-script': './src/content/content-script.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'src/assets', to: 'assets' },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      template: './src/options/options.html',
      filename: 'options.html',
      chunks: ['options'],
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],
  optimization: {
    minimize: !isDev,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: !isDev,
          },
        },
      }),
    ],
  },
  devtool: isDev ? 'cheap-module-source-map' : 'hidden-source-map',
};
```

This configuration defines four entry points: popup, options, background, and content script. Each entry produces a corresponding JavaScript file in the dist directory.

## Key Plugins {#key-plugins}

Several plugins are essential for Chrome extension builds. The CopyWebpackPlugin copies static assets and the manifest.json to the output directory. Configure patterns to match your project's asset structure:

```javascript
new CopyWebpackPlugin({
  patterns: [
    { from: 'manifest.json', to: '.' },
    { from: 'src/assets', to: 'assets' },
    { from: 'src/_locales', to: '_locales' },
  ],
})
```

The HtmlWebpackPlugin generates HTML pages for popup and options contexts, injecting the bundled JavaScript automatically. Each HTML entry needs its own plugin instance with the chunks option specifying which entry to include.

The MiniCssExtractPlugin extracts CSS into separate files in production builds, which is required for Chrome extensions since inline styles have limitations in certain contexts.

## Module Rules {#module-rules}

TypeScript support requires ts-loader or babel-loader. For best results with TypeScript, use ts-loader with fork-ts-checker-webpack-plugin for type checking during development:

```javascript
{
  test: /\.tsx?$/,
  use: [
    {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
      },
    },
  ],
  exclude: /node_modules/,
}
```

CSS processing uses style-loader for development (enabling hot reloading) and MiniCssExtractPlugin.loader for production. Add css-loader to handle CSS imports and resolve paths:

```javascript
{
  test: /\.css$/,
  use: [
    isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
    'css-loader',
  ],
}
```

Asset modules (Webpack 5 feature) handle images and fonts without additional loaders:

```javascript
{
  test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
  type: 'asset/resource',
}
```

## Development Workflow {#development-workflow}

Webpack's devServer has limitations with Chrome extensions because extensions require specific file structures and cannot use the typical devServer approach. Instead, use watch mode for development:

```json
{
  "scripts": {
    "dev": "webpack --watch --mode development",
    "build": "webpack --mode production",
    "start": "webpack --watch"
  }
}
```

Run `npm run dev` and manually reload the extension in Chrome after each change. For the background service worker, click "Reload" on the extension card in chrome://extensions. For popup and options pages, simply open them again after changes.

Source maps are configured with devtool option. Use `cheap-module-source-map` for development, which provides adequate debugging with reasonable build speed:

```javascript
devtool: isDev ? 'cheap-module-source-map' : 'hidden-source-map'
```

The `hidden-source-map` option generates source maps for production debugging without exposing them in the browser developer tools, keeping your source code private while still allowing error tracking services to parse stack traces.

## Environment Variables {#environment-variables}

Use DefinePlugin to inject environment variables into your code:

```javascript
new DefinePlugin({
  'process.env.API_URL': JSON.stringify(process.env.API_URL || 'http://localhost:3000'),
  'process.env.DEBUG': JSON.stringify(process.env.DEBUG || 'false'),
})
```

Access these in your code via `process.env.API_URL`. Note that DefinePlugin evaluates expressions, so wrap values in JSON.stringify for strings.

## Code Splitting {#code-splitting}

Webpack's code splitting capabilities help reduce bundle size by extracting shared code:

```javascript
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
      },
    },
  },
}
```

For Chrome extensions, be cautious with dynamic imports in content scripts, as Chrome handles them differently than regular web pages.

## Production Optimization {#production-optimization}

Production builds should enable minification and optimize bundle size. TerserPlugin handles JavaScript minification with options to remove console statements in production:

```javascript
new TerserPlugin({
  terserOptions: {
    compress: {
      drop_console: true,
    },
  },
})
```

For CSS minification, use css-minimizer-webpack-plugin in production:

```javascript
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

// In optimization.minimizer
new CssMinimizerPlugin(),
```

## Module Federation {#module-federation}

Webpack 5 Module Federation enables sophisticated code sharing between extension contexts or even between multiple extensions:

```javascript
// In popup/webpack.config.js
plugins: [
  new ModuleFederationPlugin({
    name: 'popup',
    exposes: {
      './SettingsPanel': './src/popup/components/SettingsPanel',
    },
    shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
  }),
]
```

This advanced feature is useful for large extension projects where popup, options, and background scripts share significant functionality.

## Cross-References {#cross-references}

For more information on related topics, see these guides:

- [Vite Extension Setup](./vite-extension-setup.md) - Fast builds with Vite
- [esbuild Extension Setup](./esbuild-extension-setup.md) - Ultra-fast builds with esbuild
- [TypeScript Extensions](./typescript-extensions.md) - TypeScript configuration and type definitions for Chrome APIs

## Related Articles {#related-articles}

## Related Articles

- [Rollup Setup](../guides/rollup-extension-setup.md)
- [Vite Setup](../guides/vite-extension-setup.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
