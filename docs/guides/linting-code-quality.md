# Linting and Code Quality for Chrome Extensions

Maintaining high code quality is essential for Chrome extensions due to their unique security model and Chrome Web Store review requirements. This guide covers linting tools for extension development.

## ESLint Setup

Chrome extensions run in multiple contexts (popup, background, content scripts) with different globals. ESLint needs context-aware configuration.

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install --save-dev eslint-plugin-chrome-extension prettier eslint-config-prettier
```

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'chrome-extension'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 
            'plugin:chrome-extension/recommended', 'prettier'],
  env: { browser: true, es2022: true, webextensions: true },
  overrides: [
    { files: ['src/background/**/*.ts'], env: { webextensions: true } },
    { files: ['src/content/**/*.ts'], env: { browser: true, webextensions: true } }
  ],
  rules: { 'no-eval': 'error', 'no-new-func': 'error', 'no-script-url': 'error' }
};
```

## eslint-plugin-chrome-extension

This plugin provides rules for Chrome extension patterns.

```javascript
rules: {
  'chrome-extension/no-relative-imports': 'error',
  'chrome-extension/manifest-version': ['error', 3],
  'chrome-extension/no-deprecated-api': 'warn',
  'chrome-extension/no-unsafe-content-script-eval': 'error'
}
```

## TypeScript ESLint

Enable type-aware linting for better code analysis.

```javascript
parserOptions: { project: './tsconfig.json', tsconfigRootDir: __dirname },
rules: {
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/prefer-optional-chain': 'error',
  '@typescript-eslint/no-restricted-imports': ['error', {
    paths: [{ name: 'fs', message: 'Use chrome.runtime.getURL()' }]
  }]
}
```

## Prettier Configuration

```json
// .prettierrc
{ "semi": true, "singleQuote": true, "tabWidth": 2, "trailingComma": "es5", "printWidth": 100 }
```

```javascript
extends: ['prettier'],
rules: { 'prettier/prettier': 'error' }
```

## Linting manifest.json

```bash
npm install --save-dev eslint-plugin-jsonc
```

```javascript
overrides: [{
  files: ['manifest.json'], parser: 'jsonc/parser', plugins: ['jsonc'],
  rules: { 'jsonc/indent': ['error', 2], 'jsonc/no-tabs': 'error' }
}]
```

## Security Rules

```javascript
rules: {
  'no-eval': 'error', 'no-new-func': 'error', 'no-script-url': 'error',
  'no-restricted-globals': ['error', { name: 'eval', message: 'eval() not allowed' }]
}
```

## Husky + lint-staged

```bash
npm install --save-dev husky lint-staged && npx husky install
```

```json
{ "lint-staged": { "*.{ts,js}": ["eslint --fix", "prettier --write"], "*.json": ["eslint --fix"] } }
```

```bash
npx husky add .husky/pre-commit "npx lint-staged"
```

## VS Code Integration

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "eslint.validate": ["javascript", "typescript", "json"]
}
```

## GitHub Actions CI

```yaml
name: Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4 with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run lint:eslint && npm run lint:prettier && npm run lint:tsc
```

```json
{ "scripts": { "lint:eslint": "eslint src --ext .ts,.js,.json", "lint:prettier": "prettier --check .", "lint:tsc": "tsc --noEmit" } }
```

## Related Guides

- [CI/CD Pipeline](./ci-cd-pipeline.md) - Automating builds and releases
- [TypeScript Setup](./typescript-setup.md) - TypeScript configuration for extensions
