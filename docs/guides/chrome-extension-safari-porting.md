---
layout: default
title: "Chrome Extension Safari Porting — Developer Guide"
description: "Learn Chrome extension safari porting with this developer guide covering implementation, best practices, and code examples."
canonical_url: "https://bestchromeextensions.com/guides/chrome-extension-safari-porting/"
---
# Porting Chrome Extensions to Safari Web Extensions

Safari Web Extensions allow you to bring your Chrome extension to Safari on macOS and iOS. While Safari uses a WebExtensions API layer similar to Chrome, there are important differences in tooling, distribution, and API support that you need to understand.

## Conversion Tool {#conversion-tool}

Apple provides the **Safari Web Extension Converter** to automate much of the migration process:

```bash
xcrun safari-web-extension-converter /path/to/your/extension
```

This tool:
- Converts `manifest.json` to Safari format
- Updates API calls to Safari-compatible versions
- Creates the necessary Xcode project structure

After conversion, you'll need to complete the process in Xcode to build and test.

## Xcode Requirement {#xcode-requirement}

Unlike Chrome extensions, Safari extensions must be packaged as **native macOS or iOS applications**. This means:

- You need Xcode installed on a Mac
- Extensions are bundled within a host app
- Distribution requires Apple Developer Program membership
- Build and signing happen through Xcode

## API Compatibility {#api-compatibility}

Safari supports the `browser.*` namespace with Promise-based responses, similar to Firefox. This is the recommended approach for cross-browser compatibility.

### Supported APIs {#supported-apis}

Safari Web Extensions support a subset of Chrome APIs:
- `storage` - local and sync storage
- `tabs` - tab creation, querying, and management
- `runtime` - messaging and extension lifecycle
- `contextMenus` - right-click menu items
- `alarms` - scheduled tasks
- `notifications` - system notifications (limited)

### Unsupported or Limited APIs {#unsupported-or-limited-apis}

Several Chrome APIs are not available or have limited functionality:
- `sidePanel` - not supported
- `declarativeNetRequest` - limited rules, requires explanation during App Store review
- `webRequest` - limited blocking capabilities
- Enterprise APIs - not available

## Manifest Differences {#manifest-differences}

Your `manifest.json` requires Safari-specific configuration:

```json
{
  "manifest_version": 3,
  "browser_specific_settings": {
    "safari": {
      "strict_min_version": "15.0"
    }
  }
}
```

## Content Scripts {#content-scripts}

Content scripts are largely compatible with Chrome, with some considerations:
- Content Security Policy (CSP) may differ from Chrome
- Some DOM APIs behave slightly differently
- Test thoroughly across Safari versions

## Background Scripts {#background-scripts}

Safari uses non-persistent background pages similar to Chrome's event pages:
- Background scripts unload when idle
- Handle lifecycle events appropriately
- Use `browser.runtime.onStartup` for initialization

## iOS Safari Support {#ios-safari-support}

The same extension works on iPhone and iPad with some considerations:
- Requires `declarative_net_request` permission for content blocking
- Must comply with App Store guidelines
- Memory constraints are stricter on mobile

## App Store Distribution {#app-store-distribution}

### Distribution Channels {#distribution-channels}

Extensions are distributed through:
- **Mac App Store** - for Safari on macOS
- **iOS App Store** - for Safari on iPhone/iPad

### Pricing {#pricing}

Unlike Chrome Web Store, you **can charge for your extension** through the App Store. This makes Safari a viable platform for commercial extensions.

### Review Process {#review-process}

Apple's App Store review is stricter than Chrome:
- Detailed explanation required for network request modifications
- Privacy labels mandatory for all extensions
- May require user justification for certain permissions
- Review times vary (typically 1-7 days)

## Testing {#testing}

Use Safari's built-in developer tools:
- **Safari Extension Developer** - enable in Safari preferences
- **Web Inspector** - debug content scripts and background pages
- **Extensions preferences** - manage and test unpacked extensions

## Limitations {#limitations}

Be aware of these Safari-specific limitations:
- No offscreen documents API
- Limited `webRequest` blocking capabilities
- Some advanced Chrome APIs unavailable
- Xcode required for all builds

## Cross-Reference {#cross-reference}

- [Cross-Browser Extension Development](./cross-browser.md)
- [Browser Compatibility Reference](../reference/browser-compatibility.md)
- [Edge Migration Guide](./chrome-extension-migration-edge.md)
- [Firefox Migration Guide](./chrome-extension-migration-firefox.md)

## Related Articles {#related-articles}

## Related Articles

- [Cross-Browser Compatibility](../patterns/cross-browser-compatibility.md)
- [Cross-Browser Guide](../guides/cross-browser.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
