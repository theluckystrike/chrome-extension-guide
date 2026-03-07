# Creating Chrome Themes

## Overview
Chrome themes allow you to customize the browser's appearance by changing colors, images, and tiling properties. Unlike full extensions, themes are lightweight and focus purely on visual customization without adding functionality.

## Theme Manifest Structure
A Chrome theme requires a `manifest.json` with `theme` declaration:

```json
{
  "manifest_version": 3,
  "name": "My Custom Theme",
  "version": "1.0",
  "description": "A beautiful custom theme",
  "theme": {
    "colors": {
      "frame": [66, 133, 244],
      "toolbar": [255, 255, 255],
      "tab_text": [0, 0, 0],
      "ntp_background": [255, 255, 255],
      "ntp_text": [0, 0, 0]
    },
    "images": {
      "theme_frame": "images/frame.png",
      "theme_toolbar": "images/toolbar.png",
      "ntp_background": "images/ntp-bg.jpg"
    },
    "tints": {
      "buttons": [0.5, 0.5, 0.5],
      "frame": [-1, 0, 1],
      "background_tab": [1, 1, 1]
    },
    "properties": {
      "ntp_background_alignment": "center",
      "ntp_background_repeat": "no-repeat"
    }
  }
}
```

## Colors
Color values use RGB arrays `[red, green, blue]` with values 0-255:

| Property | Description |
|----------|-------------|
| `frame` | Browser frame background |
| `toolbar` | Toolbar area background |
| `tab_text` | Active tab text color |
| `ntp_background` | New Tab Page background |
| `ntp_text` | New Tab Page text |
| `bookmark_text` | Bookmark text color |
| `omnibox_background` | Omnibox background |
| `omnibox_text` | Omnibox text |

## Images
Image paths are relative to the manifest. Recommended sizes:
- `theme_frame`: 1x: 220x34px, 2x: 440x68px
- `theme_toolbar`: 1x: 220x30px, 2x: 440x60px
- `ntp_background`: 1920x1080px recommended

## Tints
Tints use HSL values `[hue, saturation, lightness]`:
- `0.0-1.0` for hue (0=red, 0.33=green, 0.66=blue)
- `0.0-1.0` for saturation
- `-1` means "no tint" / use original

| Property | Description |
|----------|-------------|
| `buttons` | Toolbar button icons |
| `frame` | Browser frame |
| `background_tab` | Inactive tabs |

## Properties
Control background image behavior on New Tab Page:

```json
"properties": {
  "ntp_background_alignment": "center",
  "ntp_background_repeat": "no-repeat"
}
```

Alignment values: `top`, `bottom`, `left`, `right`, `center`
Repeat values: `no-repeat`, `repeat-x`, `repeat-y`, `repeat`

## Creating a Dark Theme
Dark themes are popular and easy to create:

```json
{
  "manifest_version": 3,
  "name": "Dark Mode Theme",
  "version": "1.0",
  "theme": {
    "colors": {
      "frame": [33, 33, 33],
      "toolbar": [42, 42, 42],
      "tab_text": [255, 255, 255],
      "ntp_background": [17, 17, 17],
      "ntp_text": [255, 255, 255],
      "bookmark_text": [200, 200, 200],
      "omnibox_background": [33, 33, 33],
      "omnibox_text": [255, 255, 255]
    },
    "tints": {
      "buttons": [0.67, 0.67, 0.67],
      "frame": [-1, 0, 1],
      "background_tab": [0.5, 0.5, 0.5]
    }
  }
}
```

## Themed Extension with Theme API
Combine themes with extension functionality using the Theme API:

```javascript
// background.js - Change theme dynamically
chrome.themeManagement.updateThemeSettings({
  colors: {
    frame: [66, 133, 244],
    toolbar: [255, 255, 255]
  }
});

// Get current theme
chrome.themeManagement.getThemeSettings((settings) => {
  console.log(settings.colors.frame);
});
```

Required permission in manifest:
```json
{
  "permissions": ["themeManagement"]
}
```

## Theme Best Practices

### Performance
- Use optimized images (WebP preferred)
- Keep theme files under 2MB
- Use CSS gradients instead of images when possible

### Accessibility
- Ensure sufficient contrast (WCAG AA minimum)
- Provide consistent text visibility
- Test with different wallpaper backgrounds

### Design
- Support both light and dark system themes
- Use platform-specific images if needed
- Test on high-DPI displays

## Testing Themes Across Platforms

### Local Testing
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Pack extension" or load unpacked
4. Apply theme in Chrome settings

### Platform Testing Matrix
| Platform | Chrome Version | DPI Scaling |
|----------|---------------|-------------|
| Windows | 90+ | 100%, 125%, 150% |
| macOS | 90+ | @2x images |
| Linux | 90+ | Various |
| ChromeOS | 90+ | High DPI |

### Debugging
- Use Chrome DevTools Theme Inspector
- Check `chrome://theme` for applied colors
- Review console for tint errors

## Packaging and Publishing Themes

### Local Packaging
1. Go to `chrome://extensions`
2. Enable Developer mode
3. Click "Pack extension"
4. Select theme folder

### Publishing to Chrome Web Store
1. Create developer account ($5 one-time)
2. Zip theme files (exclude .git, node_modules)
3. Upload via Chrome Developer Dashboard
4. Add screenshots (1280x800 or 640x400)
5. Submit for review

### Store Listing Tips
- Use 1280x960px images for listing
- Include light/dark preview images
- Add detailed description
- Set appropriate categories

## Theme vs Extension: When to Use Which

### Use Themes When:
- Only changing visual appearance
- No user interaction required
- Lightweight, fast-loading
- Simple color/image customization

### Use Extensions When:
- Adding functionality
- User interaction needed
- Content modification required
- Persistent state management
- Background processing

### Hybrid Approach
Combine both with `theme` and additional capabilities:

```json
{
  "manifest_version": 3,
  "name": "Themed Extension",
  "theme": { ... },
  "background": {
    "service_worker": "background.js"
  },
  "permissions": ["themeManagement"]
}
```

## Code Examples

### Minimal Theme (MV3)
```json
{
  "manifest_version": 3,
  "name": "Minimal Theme",
  "version": "1.0",
  "theme": {
    "colors": {
      "frame": [66, 133, 244],
      "toolbar": [255, 255, 255],
      "tab_text": [0, 0, 0]
    }
  }
}
```

### Full-Featured Theme
```json
{
  "manifest_version": 3,
  "name": "Ocean Theme",
  "version": "1.0",
  "theme": {
    "colors": {
      "frame": [0, 105, 148],
      "toolbar": [240, 248, 255],
      "tab_text": [0, 51, 102],
      "ntp_background": [224, 247, 250],
      "ntp_text": [0, 77, 102],
      "bookmark_text": [0, 64, 128],
      "omnibox_background": [240, 248, 255],
      "omnibox_text": [0, 0, 0]
    },
    "images": {
      "theme_frame": "images/frame.png",
      "theme_toolbar": "images/toolbar.png",
      "ntp_background": "images/ocean.jpg"
    },
    "tints": {
      "buttons": [0.58, 0.58, 0.58],
      "frame": [0.55, 0.55, 0.55],
      "background_tab": [0.9, 0.9, 0.9]
    },
    "properties": {
      "ntp_background_alignment": "center",
      "ntp_background_repeat": "no-repeat"
    }
  }
}
```

## Reference
- Official Documentation: https://developer.chrome.com/docs/extensions/develop/themes
- Theme Manifest: https://developer.chrome.com/docs/extensions/mv3/intro
- Chrome Web Store: https://chrome.google.com/webstore
- Theme Design Guidelines: https://developer.chrome.com/docs/extensions/mv3/user_interface
