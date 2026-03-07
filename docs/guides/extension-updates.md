# Chrome Extension Update Strategies

## Introduction
- Chrome extensions require careful update management to ensure users receive new features, bug fixes, and security patches
- Poor update strategies can lead to user data loss, broken functionality, and negative reviews
- This guide covers auto-updates, versioning, migration, testing, and deployment strategies

## Auto-Update Mechanism

### How Chrome Auto-Updates Work
- Chrome checks for extension updates every few hours (typically 5-6 hours)
- Update check is triggered by the `update_url` in manifest.json
- For Web Store extensions: `https://clients2.google.com/service/update2/crx`
- Chrome downloads the new CRX file, verifies the signature, and installs automatically
- Users are notified via chrome://extensions "Update" button or automatic notification
- Extensions loaded unpacked (`--load-extension`) do NOT auto-update

### Update Check Frequency
```javascript
// Manifest V3 - automatic, no code needed
// Chrome handles update checks internally based on:
// - Extension ID
// - Update URL in manifest
// - Current version
```

## Version Numbering Best Practices

### Semantic Versioning (SemVer) for Extensions
- Format: `MAJOR.MINOR.PATCH` (e.g., 2.1.0)
- MAJOR: Breaking changes, removed features, significant architecture changes
- MINOR: New features, backward-compatible functionality
- PATCH: Bug fixes, performance improvements, security patches
- Pre-release versions: `1.0.0-beta.1`, `1.0.0-rc.2`

### Version Rules in manifest.json
```json
{
  "manifest_version": 3,
  "version": "2.1.0",
  "version_name": "2.1.0 Beta"
}
```
- `version` is required and must be valid (MAJOR.MINOR.PATCH)
- `version_name` is optional for user-facing version display

### Best Practices
- Always increment version for each published update
- Don't skip versions (1.0.0 → 1.0.2 is confusing)
- Use `version_name` for beta/RC releases
- Document version history in CHANGELOG.md

## Breaking Changes Handling

### Identifying Breaking Changes
- Removed APIs or parameters
- Changed data structures
- Incompatible storage schemas
- Modified permissions requirements
- Different content script injection behavior

### Strategies for Safe Breaking Changes
- Deprecation warnings before removal
- Feature flags for gradual rollout
- Backward compatibility layers
- Migration utilities for user data

### Example: Feature Flag Migration
```javascript
// background.js
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    const previousVersion = details.previousVersion;
    
    // Migrate from old feature to new feature
    if (semver.lt(previousVersion, '2.0.0')) {
      await migrateToV2();
    }
    
    // Handle specific version jumps
    if (semver.lt(previousVersion, '2.1.0')) {
      await migrateToV2_1();
    }
  }
});

async function migrateToV2() {
  const oldData = await chrome.storage.local.get('oldSetting');
  if (oldData.oldSetting) {
    await chrome.storage.local.set({
      newSetting: transformSetting(oldData.oldSetting)
    });
    await chrome.storage.local.remove('oldSetting');
  }
}
```

## Data Migration Between Versions

### Storage Migration Pattern
```javascript
// migrations.js - Centralized migration manager
const MIGRATIONS = {
  '1.0.0': migrateFrom1_0_0,
  '1.1.0': migrateFrom1_1_0,
  '2.0.0': migrateFrom2_0_0
};

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    const previousVersion = details.previousVersion;
    const currentVersion = chrome.runtime.getManifest().version;
    
    for (const [version, migrateFn] of Object.entries(MIGRATIONS)) {
      if (semver.lt(previousVersion, version)) {
        console.log(`Running migration for version ${version}`);
        await migrateFn();
      }
    }
  }
});

async function migrateFrom1_1_0() {
  // Example: rename storage keys
  const data = await chrome.storage.local.get(['oldKey1', 'oldKey2']);
  if (data.oldKey1) {
    await chrome.storage.local.set({
      newKey1: data.oldKey1,
      newKey2: data.oldKey2 || 'default'
    });
    await chrome.storage.local.remove(['oldKey1', 'oldKey2']);
  }
}
```

### Migration Checklist
- [ ] Document all storage keys and their purposes
- [ ] Create migration functions for each version
- [ ] Test migration path from oldest supported version
- [ ] Handle migration failures gracefully
- [ ] Provide fallback for corrupted data
- [ ] Log migration status for debugging

## chrome.runtime.onInstalled for Update Detection

### Basic Usage
```javascript
chrome.runtime.onInstalled.addListener((details) => {
  switch (details.reason) {
    case 'install':
      console.log('Extension installed for the first time');
      initializeDefaultSettings();
      showWelcomePage();
      break;
      
    case 'update':
      console.log(`Updated from ${details.previousVersion}`);
      handleUpdate(details.previousVersion);
      break;
      
    case 'chrome_update':
      console.log('Chrome browser updated');
      break;
  }
});

async function handleUpdate(previousVersion) {
  // Show changelog for significant updates
  if (semver.major(previousVersion) !== semver.major(chrome.runtime.getManifest().version)) {
    showMajorUpdateNotification();
  }
}
```

### Detecting Update Type
```javascript
function getUpdateType(previousVersion, currentVersion) {
  const prev = semver.parse(previousVersion);
  const curr = semver.parse(currentVersion);
  
  if (prev.major !== curr.major) return 'major';
  if (prev.minor !== curr.minor) return 'minor';
  return 'patch';
}
```

## Update Notification Patterns

### In-App Notifications
```javascript
// Show update notification in popup or options page
async function showUpdateNotification(previousVersion) {
  const changelog = await fetchChangelog(previousVersion);
  
  const notification = {
    type: 'basic',
    iconUrl: 'images/icon48.png',
    title: 'Extension Updated!',
    message: `Version ${chrome.runtime.getManifest().version} is now available.`,
    priority: 1,
    buttons: [
      { title: 'View Changes' },
      { title: 'Dismiss' }
    ]
  };
  
  chrome.notifications.create('update-notification', notification);
}
```

### Changelog Display
```javascript
// Display changelog to user after update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    // Show changelog in a new tab
    chrome.tabs.create({
      url: 'changelog.html',
      active: false
    });
  }
});

// changelog.html - fetch and display recent changes
(async () => {
  const response = await fetch('CHANGELOG.md');
  const changelog = await response.text();
  document.getElementById('changelog').textContent = changelog;
})();
```

## Staged Rollouts in Chrome Web Store

### Understanding Staged Rollouts
- Chrome Web Store supports gradual rollout percentages
- Start with 1-5% of users, then increase after monitoring
- Allows catching critical bugs before full release
- Available in developer dashboard under "Distribution"

### Staged Rollout Strategy
1. Upload new version as draft
2. Test with trusted testers
3. Publish to 1-5% rollout
4. Monitor crash reports and reviews
5. Increase rollout percentage incrementally
6. Reach 100% after confidence is high

### Monitoring During Rollout
- Check Chrome Web Store developer dashboard
- Monitor chrome://extensions errors
- Review user feedback and ratings
- Track storage error rates in telemetry

## Rollback Strategies

### Preventing Bad Updates
- Always test locally before publishing
- Use staged rollouts to catch issues early
- Keep previous version CRX for emergency rollback
- Maintain a "known good" version reference

### Emergency Rollback Process
1. Go to Chrome Web Store developer dashboard
2. Select the extension
3. Upload previous version CRX
4. Set as active version
5. Push to 100% rollout immediately
6. Monitor for stabilization

### Version Preservation
```bash
# Keep old CRX files for emergency rollback
/extensions/
  ├── myextension-1.0.0.crx
  ├── myextension-1.0.1.crx
  └── myextension-1.1.0.crx
```

## Forced Updates for Security Fixes

### Implementing Forced Updates
```javascript
// Check minimum required version on startup
const MINIMUM_VERSION = '2.1.0';

async function checkForcedUpdate() {
  const currentVersion = chrome.runtime.getManifest().version;
  
  if (semver.lt(currentVersion, MINIMUM_VERSION)) {
    // Show urgent update notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/warning.png',
      title: 'Security Update Required',
      message: 'A critical security update is required. Please update now.',
      priority: 2,
      buttons: [{ title: 'Update Now' }]
    });
    
    // Disable extension functionality until updated
    await chrome.storage.local.set({ extensionEnabled: false });
  }
}
```

### Security Update Checklist
- [ ] Communicate urgency clearly
- [ ] Provide one-click update path
- [ ] Consider auto-update delay (48-72 hours)
- [ ] Have rollback plan ready
- [ ] Document the security vulnerability

## Self-Hosted Extension Updates

### Update Manifest XML Format
For self-hosted extensions, Chrome checks an XML manifest for updates:

```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0' server='prod'>
  <app appid='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'>
    <updatecheck 
      codebase='https://example.com/extensions/myextension.crx'
      version='2.1.0'
      hash='sha256=abc123...'/>
  </app>
</gupdate>
```

### Hosting the Update Manifest
```javascript
// Example: Dynamic XML generation (server-side)
app.get('/update.xml', (req, res) => {
  const updateXml = `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0' server='prod'>
  <app appid='${EXTENSION_ID}'>
    <updatecheck 
      codebase='https://example.com/updates/extension-${latestVersion}.crx'
      version='${latestVersion}'
      hash='sha256=${fileHash}'/>
  </app>
</gupdate>`;
  
  res.type('application/xml').send(updateXml);
});
```

### Manifest.json Update URL
```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "2.1.0",
  "update_url": "https://example.com/update.xml"
}
```

Reference: https://developer.chrome.com/docs/extensions/develop/distribute/host-on-linux

## Testing Updates Locally

### Local Testing Methods
1. Load unpacked extension: `chrome://extensions` → "Load unpacked"
2. Use "Update" button to reload after changes
3. Test `chrome.runtime.onInstalled` by reinstalling
4. Test data migration with development storage

### Simulating Updates
```javascript
// Test migration logic without actual update
async function testMigration() {
  // Set up "old" storage state
  await chrome.storage.local.set({
    oldSetting: 'legacy-value',
    oldData: { items: [1, 2, 3] }
  });
  
  // Simulate update event
  const mockDetails = {
    reason: 'update',
    previousVersion: '1.0.0'
  };
  
  // Run migration
  await handleUpdate(mockDetails);
  
  // Verify migration results
  const result = await chrome.storage.local.get(['newSetting', 'newData']);
  console.log('Migration result:', result);
}
```

### Testing Checklist
- [ ] Test fresh install flow
- [ ] Test update from oldest supported version
- [ ] Test update from each major version
- [ ] Test data migration with real data
- [ ] Test forced update scenario
- [ ] Test rollback behavior

## Update Architecture Best Practices

### Summary Checklist
- [ ] Use semantic versioning consistently
- [ ] Implement robust data migration system
- [ ] Use chrome.runtime.onInstalled for update handling
- [ ] Display changelog after major updates
- [ ] Use staged rollouts in Chrome Web Store
- [ ] Keep previous versions for emergency rollback
- [ ] Implement forced updates for security-critical patches
- [ ] Test all migration paths thoroughly
- [ ] Monitor update success/failure rates
- [ ] Communicate changes clearly to users

### Recommended Tools
- `semver` npm package for version comparison
- Chrome Storage for migration state
- Chrome Web Store publishing API for automation
- CRX viewer for inspecting published extensions
