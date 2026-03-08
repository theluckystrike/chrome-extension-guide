---
layout: default
title: "Chrome Extension Manifest Content Scripts Config — Best Practices"
description: "Configure content scripts in manifest.json."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/manifest-content-scripts-config/"
---

# Content Script Manifest Configuration Patterns

This guide covers optimization patterns for the `content_scripts` field in `manifest.json`.

## URL Targeting: matches and exclude_matches

The `matches` field uses [match patterns](https://developer.chrome.com/docs/extensions/mv3/match_patterns/) to define which pages load your content script.

```json
{
  "content_scripts": [{
    "matches": ["*://example.com/*", "*://www.example.com/*"],
    "exclude_matches": ["*://example.com/admin/*"],
    "js": ["content.js"]
  }]
}
```

- **`matches`**: Required array of URL patterns to include
- **`exclude_matches`**: Optional array of URL patterns to exclude (takes precedence)

## run_at Options

Controls when the content script injects relative to page load:

| Option | Timing | Use Case |
|--------|--------|----------|
| `document_start` | Before any DOM content | CSS injection, intercepting requests |
| `document_idle` (default) | After DOM ready | Most common, full page access |
| `document_end` | After DOM parsed, resources may still load | Late-stage modifications |

```json
{
  "content_scripts": [{
    "matches": ["*://example.com/*"],
    "run_at": "document_start",
    "js": ["early-inject.js"]
  }]
}
```

## Multiple Content Script Entries

Define separate entries for different sites to keep scripts focused:

```json
{
  "content_scripts": [
    {
      "matches": ["*://site-a.com/*"],
      "js": ["site-a.js"]
    },
    {
      "matches": ["*://site-b.com/*"],
      "js": ["site-b.js"]
    }
  ]
}
```

## CSS Injection

Use the separate `css` array for stylesheet injection:

```json
{
  "content_scripts": [{
    "matches": ["*://example.com/*"],
    "css": ["styles.css"],
    "js": ["content.js"]
  }]
}
```

CSS loads before JS by default. Use `css` for page styling and `js` for interactivity.

## all_frames Option

- `false` (default): Inject only into top-level frame
- `true`: Inject into all frames including iframes

```json
{
  "content_scripts": [{
    "matches": ["*://example.com/*"],
    "all_frames": true,
    "js": ["iframe-handler.js"]
  }]
}
```

## match_about_blank

Injects into `about:blank` frames created by matched pages:

```json
{
  "content_scripts": [{
    "matches": ["*://example.com/*"],
    "match_about_blank": true,
    "js": ["blank-inject.js"]
  }]
}
```

## world Property

Controls the JavaScript execution context:

- `ISOLATED` (default): Separate context, no access to page JS variables
- `MAIN`: Shares context with page's JavaScript

```json
{
  "content_scripts": [{
    "matches": ["*://example.com/*"],
    "world": "MAIN",
    "js": ["page-context.js"]
  }]
}
```

## Multiple JS Files

Multiple files in a single entry load in order and share the same scope:

```json
{
  "content_scripts": [{
    "matches": ["*://example.com/*"],
    "js": ["utils.js", "main.js", "features.js"]
  }]
}
```

## Glob Patterns

Use `include_globs` and `exclude_globs` for finer URL control:

```json
{
  "content_scripts": [{
    "matches": ["*://example.com/*"],
    "include_globs": ["*article*", "*post*"],
    "exclude_globs": ["*draft*"],
    "js": ["content.js"]
  }]
}
```

## Performance Impact

Each content script entry adds overhead on matching pages:
- Keep entries minimal and specific
- Use precise `matches` patterns to avoid unnecessary injections
- Consider the [scripting API](https://developer.chrome.com/docs/extensions/reference/scripting/) for optional features

## Combining Static and Dynamic

- **Manifest (static)**: Always-needed scripts that must be available immediately
- **Scripting API (dynamic)**: Optional features loaded on-demand

See [Dynamic Scripts](../guides/content-script-patterns.md) for implementation details.

## Common Configurations

### Site-Specific
```json
{
  "content_scripts": [{
    "matches": ["*://docs.example.com/*"],
    "js": ["docs-enhancer.js"]
  }]
}
```

### Broad Matching
```json
{
  "content_scripts": [{
    "matches": ["http://*/*", "https://*/*"],
    "js": ["global-tool.js"]
  }]
}
```

### Selective Paths
```json
{
  "content_scripts": [{
    "matches": ["*://example.com/*"],
    "include_globs": ["/api/*"],
    "js": ["api-helper.js"]
  }]
}
```

## Related Resources

- [Manifest Fields Reference](../reference/manifest-fields.md)
- [Content Script Patterns](../guides/content-script-patterns.md)
- [Content Script Lifecycle](../patterns/content-script-lifecycle.md)
