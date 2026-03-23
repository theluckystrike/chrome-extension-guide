# Enterprise Chrome Extension Deployment

This guide covers deploying Chrome extensions in enterprise environments using managed storage, force-installation, Group Policy, MDM, and other enterprise-grade deployment mechanisms.

## Table of Contents

1. [Managed Storage with chrome.storage.managed](#managed-storage-with-chromestoragemanaged)
2. [Force-Installing Extensions via Google Admin Console](#force-installing-extensions-via-google-admin-console)
3. [Group Policy Deployment on Windows](#group-policy-deployment-on-windows)
4. [MDM Deployment on macOS](#mdm-deployment-on-macos)
5. [Blocklisting and Allowlisting](#blocklisting-and-allowlisting)
6. [Chrome Browser Cloud Management](#chrome-browser-cloud-management)
7. [Update URLs and Self-Hosted Manifests](#update-urls-and-self-hosted-manifests)
8. [Version Pinning and Rollback](#version-pinning-and-rollback)
9. [Building Enterprise-Ready Extensions](#building-enterprise-ready-extensions)
10. [Testing with Managed Policies Locally](#testing-with-managed-policies-locally)
11. [Code Examples](#code-examples)
12. [References](#references)

---

## Managed Storage with chrome.storage.managed

The `chrome.storage.managed` API allows IT administrators to push configuration to extensions via enterprise policies. Unlike `chrome.storage.local` and `chrome.storage.sync`, managed storage is read-only from the extension's perspective, users cannot modify these values.

### How It Works

1. Administrator defines policies in the Google Admin Console or via Group Policy
2. Chrome pushes these policies to the extension at runtime
3. Extension reads configuration from `chrome.storage.managed`

### manifest.json Configuration

```json
{
  "name": "Enterprise Extension",
  "version": "1.0.0",
  "manifest_version": 3,
  "permissions": ["storage", "management"],
  "managed_storage_schema": {
    "type": "object",
    "properties": {
      "apiEndpoint": {
        "type": "string"
      },
      "features": {
        "type": "object",
        "properties": {
          "enableReporting": {"type": "boolean"},
          "enableAdvancedFeatures": {"type": "boolean"}
        }
      },
      "allowedDomains": {
        "type": "array",
        "items": {"type": "string"}
      }
    }
  }
}
```

### Reading Managed Storage

```javascript
// background.js - Reading managed storage
chrome.storage.managed.get(null, (result) => {
  if (chrome.runtime.lastError) {
    console.error('Managed storage not available:', chrome.runtime.lastError);
    return;
  }
  console.log('Managed configuration:', result);
  initializeExtension(result);
});

// Listen for configuration changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'managed') {
    console.log('Managed storage changed:', changes);
    handleConfigurationUpdate(changes);
  }
});
```

### Best Practices

- Always handle the case where managed storage is not available
- Validate configuration schema at runtime
- Provide sensible defaults when managed config is missing
- Log when enterprise policies are applied for audit purposes

---

Force-Installing Extensions via Google Admin Console

Google Admin Console provides a centralized way to install extensions for all users in your organization.

Prerequisites

- Google Workspace Business, Enterprise, or Education subscription
- Chrome Browser Cloud Management (CBCM) enabled
- Extension published to Chrome Web Store or uploaded as private app

Steps to Force-Install

1. Sign in to Google Admin Console (admin.google.com)
2. Navigate to Devices > Chrome > Apps & Extensions
3. Select the organizational unit (OU) for deployment
4. Click + Add and select Add from Chrome Web Store
5. Search for your extension and click Select
6. Configure installation settings:
   - Force installation: Users cannot disable or remove
   - Allow installation: Optional for users
   - Set sandbox mode: If needed
7. Click Save

Extension Settings Configuration

In the same Admin Console interface, you can configure:

- Extension settings: Set policies that map to `chrome.storage.managed`
- Runtime host permissions: Grant additional permissions
- App launch settings: Configure how the extension starts

Force-Installation Behavior

- Extension is automatically installed on all managed devices
- Users cannot disable, remove, or update the extension
- Updates are controlled by the admin (automatic or manual)
- Installation status is visible in the Admin Console

---

Group Policy Deployment on Windows

Windows Group Policy provides another mechanism for enterprise Chrome extension deployment, especially useful for organizations not using Google Workspace.

Required Policy Files

1. Download Chrome Browser template from [Chrome Enterprise Help](https://chromeenterprise.google/policies/)
2. Import the ADMX files into your Group Policy Management Console

Key Policies for Extensions

| Policy | Description |
|--------|-------------|
| `ExtensionInstallForcelist` | Force-install extensions by ID |
| `ExtensionInstallSources` | Allow extensions from specific URLs |
| `ExtensionInstallBlocklist` | Block specific extensions |
| `UpdatePolicy` | Control extension update behavior |

Configuring Force Installation

```
Computer Configuration > Administrative Templates > Google Chrome > Extensions
```

Set `ExtensionInstallForcelist` with format:

```
[publisher],[extension_id];[publisher],[extension_id];
```

```
google.com;cjpalhdlnbpafiamejdnhcphjbkeiagm;https://clients2.google.com/service/update2/crx
```

The update URL (CRX download URL) is required for automatic updates.

PowerShell Script for Deployment

```powershell
Create registry key for force installation
$policyPath = "HKLM:\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist"

if (-not (Test-Path $policyPath)) {
    New-Item -Path $policyPath -Force | Out-Null
}

Add extension ID with update URL
$extension = "cjpalhdlnbpafiamejdnhcphjbkeiagm;https://clients2.google.com/service/update2/crx"
Set-ItemProperty -Path $policyPath -Name "1" -Value $extension

Set update policy to automatic
$updatePath = "HKLM:\SOFTWARE\Policies\Google\Chrome\Update2"
if (-not (Test-Path $updatePath)) {
    New-Item -Path $updatePath -Force | Out-Null
}
Set-ItemProperty -Path $updatePath -Name "UpdatePolicyOverride" -Value "auto"
```

---

MDM Deployment on macOS

Mobile Device Management (MDM) solutions like Jamf, Microsoft Intune, or Apple Business Manager can deploy Chrome extensions to macOS devices.

Using Configuration Profiles

1. Create a configuration profile with Chrome settings
2. Deploy to target devices via MDM

Profile Structure for Force Installation

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>PayloadType</key>
            <string>com.google.Chrome</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>ExtensionSettings</key>
            <dict>
                <key>EXTENSION_ID</key>
                <dict>
                    <key>ExtensionInstallForcelist</key>
                    <array>
                        <string>EXTENSION_ID;UPDATE_URL</string>
                    </array>
                    <key>InstallationMode</key>
                    <string>force_installed</string>
                    <key>UpdateURL</key>
                    <string>https://clients2.google.com/service/update2/crx</string>
                </dict>
            </dict>
        </dict>
    </array>
    <key>PayloadIdentifier</key>
    <string>com.example.chrome-extension</string>
    <key>PayloadType</key>
    <string>com.apple.ManagedClient.preferences</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>
```

Deploying via Jamf Pro

1. Create a new Configuration Profile in Jamf Pro
2. Add Application & Custom Settings payload
3. Upload the plist with extension settings
4. Scope to target computers

---

Blocklisting and Allowlisting

Organizations can control which extensions users can install through blocklisting and allowlisting.

Blocklisting Extensions

Block specific extensions globally or for certain OUs.

Google Admin Console:
1. Navigate to Devices > Chrome > Apps & Extensions
2. Select the OU
3. Add extensions to the Block apps list

Group Policy:
```
Computer Configuration > Administrative Templates > Google Chrome > Extensions
```
Set `ExtensionInstallBlocklist` to list extension IDs to block.

Allowlisting Extensions

Restrict users to only install extensions you've explicitly approved.

Google Admin Console:
1. Go to Apps > Google Workspace > Chrome Browser
2. Enable "Allow users to install approved apps and extensions only"
3. Create an approved app list

Extension Settings for Allowlist:

```json
{
  "ExtensionSettings": {
    "*": {
      "InstallationMode": "allowed",
      "InstallSources": ["https://example.com/"],
      "AllowedTypes": ["extension"]
    }
  }
}
```

Whitelist by Organizational Unit

```json
{
  "ExtensionSettings": {
    "EXTENSION_ID": {
      "InstallationMode": "force_installed",
      "UpdateURL": "https://your-update-server.com/updates.xml"
    }
  }
}
```

---

Chrome Browser Cloud Management

Chrome Browser Cloud Management (CBCM) provides a cloud-based management console for Chrome Browser and extensions, even for organizations not using Google Workspace.

Setting Up CBCM

1. Sign up at [chromeenterprise.google/management](https://chromeenterprise.google/management/)
2. Enroll your browser instances using the enrollment token
3. Configure policies in the CBCM console

CBCM Features

- Dashboard: View enrolled browsers, extension status, and policy compliance
- Policy Management: Configure and deploy policies to browser instances
- Extension Management: Force-install, allow, or block extensions
- Reporting: Track extension usage, version compliance, and security status

Using CBCM for Extension Deployment

1. In CBCM console, go to Extensions > Add extension
2. Choose from Web Store or upload CRX
3. Configure deployment settings (force install, optional, blocked)
4. Target specific OUs or groups
5. Monitor deployment status

---

Update URLs and Self-Hosted Manifests

For organizations with strict security requirements, you may need to host extensions internally rather than relying on the Chrome Web Store.

Setting Up Self-Hosted Updates

1. Host the extension CRX file on your internal server
2. Create an update manifest XML file

Update Manifest Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="EXTENSION_ID">
    <updatecheck codebase="https://internal.example.com/extensions/my-extension.crx" version="1.0.0" prodversion="120.0.0.1"/>
  </app>
</gupdate>
```

Configuring Extension to Use Custom Update URL

```json
{
  "name": "Enterprise Extension",
  "version": "1.0.0",
  "manifest_version": 3,
  "update_url": "https://internal.example.com/updates.xml"
}
```

Hosting Extensions on Google Drive

For smaller deployments, you can host CRX files on Google Drive:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="EXTENSION_ID">
    <updatecheck 
      codebase="https://drive.google.com/uc?export=download&id=YOUR_FILE_ID" 
      version="1.0.0"/>
  </app>
</gupdate>
```

Security Considerations

- Use HTTPS for all update URLs
- Sign CRX files with your organization's certificate
- Implement certificate pinning for internal servers
- Regularly audit update manifests

---

Version Pinning and Rollback

Enterprise environments often require strict control over which extension versions are deployed.

Pinning Versions

Google Admin Console:
1. Select the extension in Apps & Extensions
2. Disable automatic updates
3. Manually select the version to deploy

Group Policy:
```
Computer Configuration > Administrative Templates > Google Chrome > Extensions
```
Set `UpdatePolicyOverride` to `manual` or `cached`.

Rolling Back Versions

1. In Admin Console, find the extension
2. Select a previous version from the version dropdown
3. Save changes

Implementing Rollback in Self-Hosted

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="EXTENSION_ID">
    <!-- Rollback to version 1.0.0 -->
    <updatecheck 
      codebase="https://internal.example.com/extensions/my-extension-v1.0.0.crx" 
      version="1.0.0"
      rollback="true"/>
  </app>
</gupdate>
```

Version Management Best Practices

- Test new versions in a pilot group before full deployment
- Maintain a version history for rollback
- Use phased rollouts (percentage-based)
- Monitor for issues after updates

---

Building Enterprise-Ready Extensions

Enterprise extensions require additional considerations beyond standard development.

Security Best Practices

```javascript
// background.js - Security best practices

// 1. Validate all data from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate sender origin
  if (!sender.url.startsWith('https://trusted.example.com')) {
    return false;
  }
  
  // Validate message schema
  if (!message.type || !message.payload) {
    return false;
  }
  
  handleMessage(message);
});

// 2. Use strict Content Security Policy
// manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://api.enterprise.com"
  }
}

// 3. Implement request signing
function signRequest(payload, secretKey) {
  const signature = crypto.createHmac('sha256', secretKey)
    .update(JSON.stringify(payload))
    .digest('hex');
  return { ...payload, signature };
}
```

Error Handling and Logging

```javascript
// background.js - Enterprise-grade logging

class EnterpriseLogger {
  constructor() {
    this.buffer = [];
    this.flushInterval = 60000; // 1 minute
  }

  log(level, message, data) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      extensionVersion: chrome.runtime.getManifest().version
    };
    
    this.buffer.push(entry);
    
    // Send to enterprise logging service
    if (level === 'error') {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    
    const logs = [...this.buffer];
    this.buffer = [];
    
    try {
      await fetch('https://logs.enterprise.com/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-ID': await this.getOrganizationId()
        },
        body: JSON.stringify(logs)
      });
    } catch (error) {
      console.error('Failed to send logs:', error);
      this.buffer.unshift(...logs); // Re-add to buffer
    }
  }

  async getOrganizationId() {
    return new Promise((resolve) => {
      chrome.storage.managed.get('organizationId', (result) => {
        resolve(result.organizationId || 'unknown');
      });
    });
  }
}

const logger = new EnterpriseLogger();
```

Supporting Managed Config

```javascript
// background.js - Full managed config support

async function loadManagedConfiguration() {
  return new Promise((resolve) => {
    chrome.storage.managed.get(null, (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Managed storage unavailable, using defaults');
        resolve(getDefaultConfiguration());
        return;
      }
      resolve(validateConfiguration(result));
    });
  });
}

function validateConfiguration(config) {
  const defaults = getDefaultConfiguration();
  
  return {
    apiEndpoint: config.apiEndpoint || defaults.apiEndpoint,
    features: {
      enableReporting: config.features?.enableReporting ?? defaults.features.enableReporting,
      enableAdvancedFeatures: config.features?.enableAdvancedFeatures ?? defaults.features.enableAdvancedFeatures
    },
    allowedDomains: Array.isArray(config.allowedDomains) 
      ? config.allowedDomains 
      : defaults.allowedDomains,
    timeout: config.timeout || defaults.timeout,
    maxRetries: config.maxRetries ?? defaults.maxRetries
  };
}

function getDefaultConfiguration() {
  return {
    apiEndpoint: 'https://api.example.com',
    features: {
      enableReporting: false,
      enableAdvancedFeatures: false
    },
    allowedDomains: ['example.com'],
    timeout: 30000,
    maxRetries: 3
  };
}
```

Testing Enterprise Features

```javascript
// tests/enterprise.test.js

describe('Enterprise Configuration', () => {
  test('should load defaults when managed storage unavailable', async () => {
    // Simulate managed storage unavailable
    chrome.runtime.lastError = { message: 'Managed storage not available' };
    
    const config = await loadManagedConfiguration();
    
    expect(config.apiEndpoint).toBe('https://api.example.com');
    expect(config.features.enableReporting).toBe(false);
  });

  test('should use managed config when available', async () => {
    chrome.storage.managed.get = jest.fn().mockImplementation((keys, callback) => {
      callback({
        apiEndpoint: 'https://managed-api.enterprise.com',
        features: { enableReporting: true }
      });
    });
    
    const config = await loadManagedConfiguration();
    
    expect(config.apiEndpoint).toBe('https://managed-api.enterprise.com');
    expect(config.features.enableReporting).toBe(true);
  });

  test('should validate allowedDomains is array', async () => {
    chrome.storage.managed.get = jest.fn().mockImplementation((keys, callback) => {
      callback({ allowedDomains: 'not-an-array' });
    });
    
    const config = await loadManagedConfiguration();
    
    expect(Array.isArray(config.allowedDomains)).toBe(true);
  });
});
```

---

Testing with Managed Policies Locally

You can test managed storage and policies locally before deploying to production.

Using Chrome Flags

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Find your extension and look for "Inspect views" > "Service worker" or "background page"
4. Right-click and inspect

Simulating Managed Storage

```javascript
// Create a mock managed storage for local testing
// In Chrome console (background page)

const mockManagedConfig = {
  apiEndpoint: 'https://test-api.enterprise.com',
  features: {
    enableReporting: true,
    enableAdvancedFeatures: true
  },
  allowedDomains: ['test.example.com'],
  organizationId: 'test-org-123'
};

// Mock chrome.storage.managed.get
chrome.storage.managed.get = (keys, callback) => {
  const result = {};
  if (!keys || keys.length === 0) {
    Object.assign(result, mockManagedConfig);
  } else {
    (Array.isArray(keys) ? keys : [keys]).forEach(key => {
      if (mockManagedConfig.hasOwnProperty(key)) {
        result[key] = mockManagedConfig[key];
      }
    });
  }
  callback(result);
};

console.log('Mock managed storage configured');
```

Using Enterprise Policy Testing

For Chrome Web Store extensions:
1. Go to `chrome://policy`
2. Look for ExtensionSettings policy
3. Click "Reload policies"

For local development:
```bash
Chrome launch with custom policy
chrome \
  --load-extension=/path/to/extension \
  --policy-user-data-dir=/tmp/chrome-policy-test
```

Testing with group-policy-json

You can create a `gpolicy.json` file to test policies:

```json
{
  "ExtensionSettings": {
    "*": {
      "InstallationMode": "normal_installed",
      "UpdateURL": "https://clients2.google.com/service/update2/crx"
    },
    "YOUR_EXTENSION_ID": {
      "InstallationMode": "force_installed"
    }
  },
  "UpdatePolicyOverride": "auto"
}
```

---

Code Examples

Complete Extension with Enterprise Features

```javascript
// background.js - Complete enterprise extension example

class EnterpriseExtension {
  constructor() {
    this.config = null;
    this.initialize();
  }

  async initialize() {
    // Load configuration
    this.config = await this.loadManagedConfiguration();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start periodic sync
    this.startPeriodicSync();
    
    console.log('Enterprise Extension initialized with config:', this.config);
  }

  async loadManagedConfiguration() {
    return new Promise((resolve) => {
      chrome.storage.managed.get(null, (result) => {
        if (chrome.runtime.lastError) {
          console.warn('Using default config');
          resolve(this.getDefaultConfig());
          return;
        }
        resolve(this.validateConfig(result));
      });
    });
  }

  getDefaultConfig() {
    return {
      apiEndpoint: 'https://api.example.com',
      syncInterval: 300000,
      features: { enableReporting: false },
      allowedDomains: ['example.com']
    };
  }

  validateConfig(config) {
    return {
      apiEndpoint: config.apiEndpoint || this.getDefaultConfig().apiEndpoint,
      syncInterval: config.syncInterval || this.getDefaultConfig().syncInterval,
      features: {
        enableReporting: config.features?.enableReporting ?? false,
        enableAdvancedFeatures: config.features?.enableAdvancedFeatures ?? false
      },
      allowedDomains: Array.isArray(config.allowedDomains) 
        ? config.allowedDomains 
        : this.getDefaultConfig().allowedDomains
    };
  }

  setupEventListeners() {
    // Listen for configuration changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'managed') {
        console.log('Configuration updated:', changes);
        this.handleConfigUpdate(changes);
      }
    });

    // Listen for installation
    chrome.management.onInstalled.addListener((info) => {
      console.log('Extension installed:', info);
      this.onExtensionInstalled(info);
    });

    // Listen for uninstall
    chrome.management.onUninstalled.addListener((id) => {
      console.log('Extension uninstalled:', id);
    });
  }

  handleConfigUpdate(changes) {
    // Reload configuration
    this.loadManagedConfiguration().then(config => {
      this.config = config;
      this.notifyContentScripts('configUpdated', config);
    });
  }

  notifyContentScripts(event, data) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { event, data }).catch(() => {});
      });
    });
  }

  startPeriodicSync() {
    chrome.alarms.create('sync', { 
      periodInMinutes: this.config.syncInterval / 60000 
    });
    
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'sync') {
        this.performSync();
      }
    });
  }

  async performSync() {
    if (!this.config.apiEndpoint) return;
    
    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-ID': await this.getOrganizationId()
        },
        body: JSON.stringify({
          action: 'sync',
          extensionVersion: chrome.runtime.getManifest().version,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync error:', error);
    }
  }

  async getOrganizationId() {
    return new Promise((resolve) => {
      chrome.storage.managed.get('organizationId', (result) => {
        resolve(result.organizationId || 'unknown');
      });
    });
  }

  onExtensionInstalled(info) {
    console.log('Extension installed:', info.id, info.version);
  }
}

// Initialize the extension
new EnterpriseExtension();
```

manifest.json for Enterprise Extension

```json
{
  "manifest_version": 3,
  "name": "Enterprise Sync Extension",
  "version": "1.0.0",
  "description": "Enterprise extension with managed configuration support",
  "permissions": [
    "storage",
    "management",
    "alarms",
    "tabs"
  ],
  "host_permissions": [
    "https://api.enterprise.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "update_url": "https://your-update-server.com/updates.xml",
  "key": "YOUR_EXTENSION_PUBLIC_KEY"
}
```

---

References

- [Chrome Enterprise Deployment Documentation](https://developer.chrome.com/docs/extensions/develop/migration/enterprise)
- [Chrome Browser Cloud Management](https://chromeenterprise.google/management/)
- [Google Admin Console - Apps & Extensions](https://support.google.com/chrome/a/answer/2657289)
- [Group Policy for Chrome](https://support.google.com/chrome/a/answer/2657289?hl=en)
- [chrome.storage.managed API](https://developer.chrome.com/docs/extensions/reference/api/storage#property-managed)
- [Extension Update Protocol](https://developer.chrome.com/docs/extensions/develop/migration/intro-mv2-to-mv3#update-url)
- [Chrome Enterprise Policy List](https://chromeenterprise.google/policies/)

---

Conclusion

Deploying Chrome extensions in enterprise environments requires careful consideration of storage, deployment mechanisms, security, and ongoing management. By implementing `chrome.storage.managed`, supporting force-installation via Admin Console or Group Policy, and following enterprise best practices, you can create solid extensions that meet organizational security and compliance requirements.

Remember to:
- Always test enterprise features in a controlled environment
- Implement proper error handling and logging
- Support rollback capabilities
- Document your deployment process
- Regularly review and update your deployment strategy
