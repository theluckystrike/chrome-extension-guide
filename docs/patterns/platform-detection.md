# Platform Detection Patterns

Detecting the platform and system environment is essential for building extensions that adapt to different operating systems, browsers, and user preferences. This guide covers patterns for platform detection using Chrome APIs and web standards.

---

## Detecting Operating System and Architecture

### Using chrome.runtime.getPlatformInfo()

The `chrome.runtime.getPlatformInfo()` API returns the OS, architecture, and other platform details:

```javascript
async function getPlatformInfo() {
  const platformInfo = await chrome.runtime.getPlatformInfo();
  return {
    os: platformInfo.os,      // 'mac', 'win', 'linux', 'cros', 'android', 'ios'
    arch: platformInfo.arch,  // 'arm', 'x86-32', 'x86-64'
    nacl_arch: platformInfo.nacl_arch  // 'arm', 'x86-32', 'x86-64'
  };
}
```

This API is available in all extension contexts and returns immediately without Promises in older Chrome versions.

### Platform Utility Example

```javascript
// utils/platform.ts
export const Platform = {
  async getInfo() {
    return await chrome.runtime.getPlatformInfo();
  },

  isMac() {
    return chrome.runtime.getPlatformInfo().then(info => info.os === 'mac');
  },

  isWindows() {
    return chrome.runtime.getPlatformInfo().then(info => info.os === 'win');
  },

  isLinux() {
    return chrome.runtime.getPlatformInfo().then(info => info.os === 'linux');
  },

  isMobile() {
    return chrome.runtime.getPlatformInfo().then(
      info => info.os === 'android' || info.os === 'ios'
    );
  }
};
```

---

## Chrome Version Detection

### From Navigator User Agent

```javascript
function getChromeVersion() {
  const match = navigator.userAgent.match(/Chrome\/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      build: parseInt(match[3], 10),
      patch: parseInt(match[4], 10)
    };
  }
  return null;
}
```

### From chrome.runtime.getManifest()

```javascript
function getExtensionVersion() {
  const manifest = chrome.runtime.getManifest();
  return manifest.version;
}
```

Version detection is useful for enabling features conditionally based on Chrome version support.

---

## Development vs Production Detection

```javascript
const isDevelopment = () => {
  return !chrome.runtime.id?.startsWith('abcdef'); // Typical pattern
};

// Or check for unpacked extension
async function isUnpacked() {
  const info = await chrome.management.getSelf();
  return info.installType === 'development';
}
```

---

## Display Information

### Using chrome.system.display

```javascript
async function getDisplayInfo() {
  const displays = await chrome.system.display.getInfo();
  return displays.map(display => ({
    id: display.id,
    name: display.name,
    bounds: display.bounds,
    isPrimary: display.isPrimary,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
    rotation: display.rotation
  }));
}
```

Requires the `system.display` permission in manifest.

---

## Color Scheme and Reduced Motion

### Detecting User Preferences

```javascript
// Listen for color scheme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  const isDark = e.matches;
  console.log('Color scheme changed to:', isDark ? 'dark' : 'light');
});

// Check reduced motion preference
const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};
```

These preferences enable your extension to respect system-level accessibility settings.

---

## Language and Network Detection

### Navigator Language

```javascript
function getLanguageInfo() {
  return {
    language: navigator.language,       // 'en-US'
    languages: navigator.languages,       // ['en-US', 'en']
    isRTL: navigator.language.startsWith('ar') ||
           navigator.language.startsWith('he') ||
           navigator.language.startsWith('fa')
  };
}
```

### Network Information API

```javascript
function getNetworkInfo() {
  const connection = navigator.connection ||
                     navigator.mozConnection ||
                     navigator.webkitConnection;
  
  if (connection) {
    return {
      effectiveType: connection.effectiveType,  // '4g', '3g', '2g', 'slow-2g'
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }
  return null;
}
```

---

## Platform-Specific Behavior

### Adaptive Shortcuts Based on Platform

```javascript
async function setPlatformShortcuts() {
  const platform = await chrome.runtime.getPlatformInfo();
  
  if (platform.os === 'mac') {
    // Mac users expect Cmd-based shortcuts
    await chrome.commands.update({
      name: 'open-panel',
      shortcut: 'Command+Shift+P'
    });
  } else {
    // Windows/Linux use Ctrl-based shortcuts
    await chrome.commands.update({
      name: 'open-panel',
      shortcut: 'Ctrl+Shift+P'
    });
  }
}
```

### Platform-Aware UI

```javascript
function getPlatformStylesheet() {
  chrome.runtime.getPlatformInfo().then(platform => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    
    if (platform.os === 'mac') {
      link.href = 'styles/mac.css';
    } else if (platform.os === 'win') {
      link.href = 'styles/windows.css';
    } else {
      link.href = 'styles/default.css';
    }
    
    document.head.appendChild(link);
  });
}
```

---

## Summary

| Detection Target | API/Method | Permission Required |
|-----------------|------------|---------------------|
| OS & Architecture | `chrome.runtime.getPlatformInfo()` | None |
| Chrome Version | `navigator.userAgent` | None |
| Display Info | `chrome.system.display.getInfo()` | `system.display` |
| Color Scheme | `matchMedia('(prefers-color-scheme: dark)')` | None |
| Reduced Motion | `matchMedia('(prefers-reduced-motion: reduce)')` | None |
| Network | `navigator.connection` | None |

---

## See Also

- [chrome.system API Reference](../api-reference/system-api.md)
- [Cross-Browser Compatibility](./cross-browser-compatibility.md)
- [Accessibility in Chrome Extensions](./accessibility.md)
