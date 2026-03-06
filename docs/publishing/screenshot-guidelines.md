# Chrome Web Store Screenshot Guidelines

## Overview
Screenshots are the first thing users see. Good screenshots dramatically increase install rates.

## Required Dimensions

| Asset | Dimensions | Format | Required |
|-------|-----------|--------|----------|
| Screenshot | 1280x800 or 640x400 | PNG or JPEG | Min 1, max 5 |
| Small promo tile | 440x280 | PNG | Required |
| Marquee promo | 1400x560 | PNG | Optional |

## Screenshot Best Practices

### Do:
1. Show the extension in action (popup open, content script visible)
2. Use real-looking content (not lorem ipsum)
3. Annotate with short callouts explaining features
4. Use consistent branding/colors across all screenshots
5. Show the most impressive feature first
6. Include before/after comparisons if relevant

### Don't:
1. Use blurry or low-res images
2. Show empty/loading states
3. Include personal information or real user data
4. Use too much text — screenshots should be visual
5. Show Chrome's incognito mode or other extensions
6. Mislead about functionality

## Screenshot Sequence Strategy
1. **Screenshot 1**: Hero shot — most impressive feature, popup or main UI
2. **Screenshot 2**: Key feature in use on a real webpage
3. **Screenshot 3**: Settings/options page showing customization
4. **Screenshot 4**: Another feature or use case
5. **Screenshot 5**: Comparison or results view

## Creating Screenshots

### Method 1: Chrome DevTools Device Mode
- Open popup, right-click > Inspect
- Use device toolbar to set exact dimensions
- Capture screenshot via DevTools

### Method 2: macOS Screenshot
- Cmd+Shift+4 for region capture
- Resize to exact dimensions in Preview or image editor

### Method 3: Automated with Puppeteer
Show a basic Puppeteer script to capture extension screenshots programmatically.

## Promotional Tile Design
- Small tile (440x280): Required for store listing
- Marquee tile (1400x560): Optional, used if Chrome editors feature your extension
- Include extension name, icon, and one-line tagline
- High contrast, readable at small sizes
- Dark backgrounds work well

## Store Icon Requirements
- 128x128 PNG (actual artwork 96x96 with 16px transparent padding per side)
- Alpha transparency is supported and recommended (icons without alpha get auto-framed with rounded corners)
- Should work well on both light and dark backgrounds
- Simple, recognizable design
- Looks good at 16x16, 48x48, and 128x128

## Tools for Creating Screenshots
- Figma (free) — design tool for mockups
- CleanShot X (macOS) — screenshot with annotations
- Chrome DevTools — direct capture

## Checklist Before Uploading
- [ ] At least 1 screenshot at 1280x800 or 640x400
- [ ] Screenshots show actual extension functionality
- [ ] No personal/sensitive data visible
- [ ] Text is readable at display size
- [ ] Consistent visual style across screenshots
- [ ] Store icon is 128x128 PNG (96x96 artwork with 16px transparent padding)
- [ ] Small promo tile if you want category placement
