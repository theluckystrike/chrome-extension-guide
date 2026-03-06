# Rollup Setup for Chrome Extensions

Rollup is a powerful JavaScript bundler that excels at producing highly optimized, tree-shaken bundles. While originally designed for libraries, it has become an excellent choice for Chrome extension development due to its fine-grained control over output and minimal bundle sizes.

## Why Choose Rollup?

There are several compelling reasons to use Rollup for Chrome extension development:

- **Tree-shaking**: Rollup statically analyzes your code and removes unused exports, significantly reducing bundle size
- **ES Module Support**: Native ES module output allows for modern JavaScript patterns
- **Smaller Bundles**: Rollup's scope hoisting and module consolidation produce leaner output compared to other bundlers
- **Plugin Ecosystem**: A rich ecosystem of official and community plugins specifically designed for extension development

## Project Setup

First, install the required dependencies:

```bash
npm install --save-dev rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs @rollup/plugin-typescript @rollup/plugin-terser rollup-plugin-chrome-extension rollup-plugin-postcss
npm install typescript
```

## Configuring rollup.config.js

Create a configuration file with multiple entry points for different extension contexts:

```javascript
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import chromeExtension from 'rollup-plugin-chrome-extension';
import postcss from 'rollup-plugin-postcss';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: {
    background: 'src/background/index.ts',
    popup: 'src/popup/index.tsx',
    content: 'src/content/index.ts',
  },
  output: {
    dir: 'dist',
    format: 'es',
    sourcemap: !production,
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
    postcss({
      extract: true,
      minimize: production,
    }),
    chromeExtension(),
    production && terser(),
  ],
};
```

## Understanding Output Formats

Chrome extensions require different output formats for different contexts:

- **Background Scripts**: Use ES modules (`format: 'es'`) for modern async patterns and module support
- **Content Scripts**: Use IIFE (`format: 'iife'`) to run immediately in page context without module overhead
- **Popup/Options Pages**: ES modules work well since they run in their own context

## Handling CSS

Use `rollup-plugin-postcss` to bundle CSS alongside your JavaScript:

```javascript
postcss({
  extract: 'styles.css',
  minimize: production,
  sourceMap: !production,
})
```

This extracts CSS into a separate file that can be referenced in your HTML.

## Copying Static Assets

The `rollup-plugin-chrome-extension` automatically copies your `manifest.json`, icons, and HTML files to the output directory. Ensure your manifest references the correct output filenames:

```json
{
  "content_scripts": [{
    "js": ["content.js"],
    "css": ["styles.css"]
  }]
}
```

## Development Workflow

Enable watch mode for rapid development:

```bash
npx rollup -c -w
```

Combine with Chrome's built-in hot reload by packing the extension in developer mode, or use a dedicated dev server with live reload capabilities.

## Production Builds

Create a production build with minification:

```bash
npm run build
```

Configure your `package.json`:

```json
{
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w"
  }
}
```

## Comparison with Other Bundlers

| Feature | Rollup | Webpack | Vite |
|---------|--------|---------|------|
| Learning Curve | Medium | High | Low |
| Bundle Size | Excellent | Good | Good |
| Dev Speed | Good | Slow | Excellent |
| Plugin Ecosystem | Good | Excellent | Growing |

Rollup offers the best balance of bundle optimization and configuration control, though Webpack provides more flexibility for complex scenarios and Vite excels in developer experience.

## See Also

- [Vite Extension Setup](./vite-extension-setup.md) - Alternative modern bundler
- [ESBuild Extension Setup](./esbuild-extension-setup.md) - Fastest bundler option
- [TypeScript Extensions](./typescript-extensions.md) - Type-safe extension development
