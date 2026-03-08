---
layout: default
title: "Chrome Extension Release Notes — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/extension-release-notes/"
---
# Writing Effective Release Notes for Chrome Extensions

Release notes are critical for keeping users informed about what's new, improving user experience, and maintaining trust. This guide covers best practices for writing and managing release notes across different platforms.

## Changelog Formats

### CHANGELOG.md
The CHANGELOG.md file in your repository serves as the source of truth for developers. Place it in the root directory and follow a consistent format:

```markdown
## [2.1.0] - 2024-01-15

### Added
- New dark mode toggle in settings

### Changed
- Improved page load performance by 30%

### Fixed
- Fixed login timeout issue on Firefox
```

### Chrome Web Store Version Description
The Chrome Web Store accepts plain text (no HTML) for version descriptions. Keep descriptions under 10,000 characters and focus on user-facing benefits. Update this each time you submit a new version.

### In-App "What's New" Popup
Show users what's new directly in the extension using a popup or dedicated panel. This creates a more engaging experience than relying solely on the Web Store.

## Semantic Versioning for Extensions

Follow Semantic Versioning (SemVer) to communicate the nature of changes:

| Version Type | When to Use | Example |
|--------------|-------------|---------|
| **Major** (x.0.0) | Breaking changes, removed features, UI redesigns | 2.0.0 → 3.0.0 |
| **Minor** (x.y.0) | New features, backward-compatible additions | 2.0.0 → 2.1.0 |
| **Patch** (x.y.z) | Bug fixes, performance improvements, security patches | 2.0.0 → 2.0.1 |

## Automated Changelog Generation

Use Conventional Commits to automatically generate changelogs:

```
feat: add export to PDF functionality
fix: resolve bookmark sync issue
docs: update installation instructions
```

Tools like `standard-version` or `release-please` can parse these commits and generate CHANGELOG.md automatically.

## Showing "What's New" After Update

Use `chrome.runtime.onInstalled` to detect updates and show relevant information:

```javascript
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    const previousVersion = details.previousVersion;
    // Compare versions and show appropriate changelog
    showWhatsNew(previousVersion);
  }
});
```

## In-App Update Notification Patterns

### Banner Notifications
Display a dismissible banner at the top of your extension popup:

```javascript
function showUpdateBanner(changes) {
  return `
    <div class="update-banner">
      We've updated ${changes.join(', ')}
      <a href="/changelog">See details</a>
    </div>
  `;
}
```

### Modal Dialogs
For major updates, show a modal with full changelog and "Don't show again" option.

### Badge Indicators
Use the badge API to draw attention to the update:

```javascript
chrome.action.setBadgeText({ text: 'NEW' });
chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
```

## User-Facing vs Developer-Facing Notes

**User-facing notes** should be:
- Plain language, avoiding technical jargon
- Focused on benefits ("Save time with auto-save")
- Concise and scannable

**Developer-facing notes** (CHANGELOG.md) can include:
- Technical details and API changes
- Code examples
- Migration guides

## Writing for Non-Technical Users

1. **Lead with benefits** - What does this fix/improve for them?
2. **Use active voice** - "You can now export data" not "Data export added"
3. **Avoid version numbers** - Users don't care about v2.1.0
4. **Include visuals** - Screenshots and GIFs for UI changes

## Visual Documentation

Always include screenshots or GIFs when:
- Adding new UI elements
- Changing existing workflows
- Introducing new features that benefit from visual demonstration

## Related Guides

- [Extension Updates](./extension-updates.md) - Managing the update lifecycle
- [Version Management](../publishing/version-management.md) - Publishing and versioning strategies
- [User Onboarding](./user-onboarding.md) - Guiding new users through your extension

## Related Articles

- [Extension Updates](../guides/extension-updates.md)
- [Automated Publishing](../guides/chrome-extension-automated-publishing.md)
