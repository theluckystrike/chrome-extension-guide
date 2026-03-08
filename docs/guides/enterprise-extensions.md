---
layout: default
title: "Chrome Extension Enterprise Extensions — Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/guides/enterprise-extensions/"
---
# Enterprise Extensions Guide

This guide covers building, deploying, and managing Chrome extensions for enterprise environments. Enterprise extensions differ from consumer extensions in that they're centrally managed, often force-installed, and configured through IT policies rather than user preferences.

## Overview {#overview}

Enterprise extensions are designed for corporate deployment scenarios where IT administrators need centralized control over extension behavior. Key characteristics include:

- **Policy-based configuration**: Settings managed by IT, not users
- **Force-installation**: Extensions installed automatically for all users
- **Private distribution**: No public Chrome Web Store listing
- **Enhanced security**: Stricter controls suitable for corporate environments

This guide assumes you're familiar with basic Chrome extension development. For foundational concepts, see the [Storage API Reference](../api-reference/storage-api-deep-dive.md) and [Security Best Practices](../guides/security-best-practices.md).

## Managed Storage {#managed-storage}

Chrome provides a special storage area called `chrome.storage.managed` that allows IT administrators to push read-only configuration to extensions. Unlike regular storage, users cannot modify managed storage—only administrators can set values through enterprise policies.

### Manifest Configuration {#manifest-configuration}

To use managed storage, declare the schema in your manifest:

```json
{
  "name": "Enterprise Config Extension",
  "version": "1.0",
  "manifest_version": 3,
  "permissions": ["storage"],
  "storage": {
    "managed_schema": "managed_schema.json"
  }
}
```

The schema file defines what configuration options administrators can set.

### Policy Schema Definition {#policy-schema-definition}

Create `managed_schema.json` in your extension root:

```json
{
  "type": "object",
  "properties": {
    "serverUrl": {
      "type": "string",
      "description": "The backend server URL for API calls"
    },
    "enableFeature": {
      "type": "boolean",
      "description": "Enable the premium feature set"
    },
    "apiKey": {
      "type": "string",
      "description": "API key for enterprise service authentication"
    },
    "allowedDomains": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of domains this extension can access"
    }
  },
  "required": ["serverUrl"]
}
```

### Reading Managed Configuration {#reading-managed-configuration}

Access managed storage the same way as regular storage:

```javascript
// Read configuration from IT policy
chrome.storage.managed.get(['serverUrl', 'enableFeature', 'apiKey'], (config) => {
  if (chrome.runtime.lastError) {
    console.error('Managed storage not available:', chrome.runtime.lastError);
    return;
  }
  
  // Use configuration or fallback to defaults
  const serverUrl = config.serverUrl || 'https://default.enterprise.local';
  const enableFeature = config.enableFeature !== undefined ? config.enableFeature : false;
  
  initializeExtension(serverUrl, enableFeature);
});
```

### Fallback Pattern {#fallback-pattern}

Always provide sensible defaults when no policy is configured:

```javascript
function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.managed.get(null, (config) => {
      if (chrome.runtime.lastError) {
        // No enterprise policy - use defaults
        resolve({
          serverUrl: 'https://default.enterprise.local',
          enableFeature: false,
          apiKey: null,
          allowedDomains: []
        });
        return;
      }
      
      resolve({
        serverUrl: config.serverUrl || 'https://default.enterprise.local',
        enableFeature: config.enableFeature || false,
        apiKey: config.apiKey || null,
        allowedDomains: config.allowedDomains || []
      });
    });
  });
}
```

## Enterprise Distribution {#enterprise-distribution}

Enterprise extensions can be distributed through several channels beyond the public Chrome Web Store.

### Private Chrome Web Store Publishing {#private-chrome-web-store-publishing}

Organizations can publish extensions privately through the Chrome Web Store:

1. Create a Google Workspace or Cloud Identity organization
2. Publish the extension as an "unlisted" or private listing
3. Restrict visibility to your organization only
4. Users install from the private store listing

This provides automatic updates while maintaining privacy.

### Self-Hosted CRX Distribution {#self-hosted-crx-distribution}

Package your extension as a CRX file and host it yourself:

```json
{
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
  "update_url": "https://enterprise.example.com/updates/extension.crx"
}
```

The `key` must match the extension's private key, and the update URL must serve proper update manifests.

### ExtensionInstallForcelist Policy {#extensioninstallforcelist-policy}

Force-install an extension across all managed devices using the `ExtensionInstallForcelist` policy:

**Windows (Group Policy):**
```
HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallForcelist
1: "abcdefghijklmnopabcdefghijklmnop;https://enterprise.example.com/updates/extension.crx"
```

**macOS (Configuration Profile):**
```xml
<key>ExtensionInstallForcelist</key>
<array>
  <string>abcdefghijklmnopabcdefghijklmnop;https://enterprise.example.com/updates/extension.crx</string>
</array>
```

**Linux (policies.json):**
```json
{
  "ExtensionInstallForcelist": [
    "abcdefghijklmnopabcdefghijklmnop;https://enterprise.example.com/updates/extension.crx"
  ]
}
```

The format is: `<extension-id>;<update-url>`

### Additional Installation Policies {#additional-installation-policies}

- **ExtensionInstallAllowlist**: Only allow specific extensions (whitelist approach)
- **ExtensionInstallBlocklist**: Block specific extensions from being installed
- **ExtensionInstallForceList**: Same as ExtensionInstallForcelist (alias)

## Force-Installation Behavior {#force-installation-behavior}

When an extension is force-installed:

- The extension installs automatically on all users' browsers
- Users cannot uninstall the extension (uninstall button is disabled)
- The extension auto-updates when you update the CRX at the update_url
- Extension appears with a briefcase icon indicating enterprise management

Force-installed extensions can still be disabled by users, but they'll reinstall on browser restart if the policy remains.

## Enterprise APIs {#enterprise-apis}

Chrome provides enterprise-specific APIs that require device enrollment:

### chrome.enterprise.platformKeys {#chromeenterpriseplatformkeys}

Manage client certificates for VPN or WiFi authentication:

```javascript
// Get available certificates
chrome.enterprise.platformKeys.getCertificates((certificates) => {
  certificates.forEach((cert) => {
    console.log('Certificate:', cert.subjectName);
  });
});

// Import a certificate
chrome.enterprise.platformKeys.importCertificate({
  certificate: binaryData
}, () => {
  console.log('Certificate imported');
});
```

### chrome.enterprise.deviceAttributes {#chromeenterprisedeviceattributes}

Retrieve device identity information:

```javascript
chrome.enterprise.deviceAttributes.getDeviceSerialNumber((serial) => {
  console.log('Device serial:', serial);
});

chrome.enterprise.deviceAttributes.getDeviceAssetId((assetId) => {
  console.log('Asset ID:', assetId);
});

chrome.enterprise.deviceAttributes.getDeviceHostname((hostname) => {
  console.log('Hostname:', hostname);
});
```

### chrome.enterprise.networkingAttributes {#chromeenterprisenetworkingattributes}

Access network configuration:

```javascript
chrome.enterprise.networkingAttributes.getNetworkDetails((details) => {
  if (details) {
    console.log('Network type:', details.networkType);
    console.log('IP address:', details.ipv4);
  }
});
```

**Note**: These APIs require the device to be enrolled in Chrome Enterprise.

## Security for Enterprise {#security-for-enterprise}

Enterprise extensions often handle sensitive corporate data and must meet elevated security standards.

### Content Security Policy {#content-security-policy}

Extend the default CSP for enterprise needs:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://*.enterprise.local"
  }
}
```

### No Remote Code Execution {#no-remote-code-execution}

Enterprise extensions should never execute remote code:

- Bundle all logic in the extension
- Use server-side APIs for dynamic behavior
- Avoid eval() and Function() constructors

### Audit Logging {#audit-logging}

Implement comprehensive logging for compliance:

```javascript
function logAction(action, details) {
  const entry = {
    timestamp: new Date().toISOString(),
    action: action,
    details: details,
    user: chrome.identity.getProfileUserInfo?.()?.email || 'unknown'
  };
  
  // Send to enterprise logging server
  fetch('https://audit.enterprise.local/log', {
    method: 'POST',
    body: JSON.stringify(entry),
    headers: { 'Content-Type': 'application/json' }
  }).catch(() => {
    // Fallback to local storage if server unavailable
    chrome.storage.local.get(['auditLog'], (result) => {
      const log = result.auditLog || [];
      log.push(entry);
      chrome.storage.local.set({ auditLog: log.slice(-1000) });
    });
  });
}
```

### Certificate Pinning {#certificate-pinning}

Pin certificates for API communications:

```javascript
const PINNED_PUBLIC_KEY = 'sha256/abcdef123456789...';

async function secureFetch(url, options = {}) {
  const response = await fetch(url, options);
  
  // Verify certificate chain (implementation depends on your PKI)
  const cert = await response.certificate;
  if (!verifyPinnedCertificate(cert, PINNED_PUBLIC_KEY)) {
    throw new Error('Certificate pin verification failed');
  }
  
  return response;
}
```

### Data Loss Prevention {#data-loss-prevention}

Consider DLP requirements for extensions that handle sensitive data:

- Scan uploads for sensitive content
- Block clipboard operations in restricted contexts
- Prevent screen capture of sensitive data
- Encrypt data at rest using chrome.storage.session

## Testing Enterprise Extensions {#testing-enterprise-extensions}

### Using chrome://policy {#using-chromepolicy}

Test policy behavior by loading policies manually:

1. Navigate to `chrome://policy`
2. Click "Load Policies"
3. Select a JSON policy file
4. Verify your extension reads the values via `chrome.storage.managed.get()`

### Test Policy File Example {#test-policy-file-example}

```json
{
  "ExtensionInstallForcelist": [
    "abcdefghijklmnopabcdefghijklmnop;https://localhost:8080/extension.crx"
  ],
  "YourCustomPolicy": {
    "serverUrl": "https://test.enterprise.local",
    "enableFeature": true
  }
}
```

### Chrome Enterprise Test Browser {#chrome-enterprise-test-browser}

Google provides Chrome Enterprise test builds with full policy support. Download from the [Chrome Enterprise release page](https://chromeenterprise.google/download/).

## Extension Updates in Enterprise {#extension-updates-in-enterprise}

Enterprise extensions use the same update mechanism as regular extensions. See [Extension Updates](../guides/extension-updates.md) for detailed information.

Key considerations for enterprise updates:

- Update URLs must be accessible from all user locations
- Test updates in staging before production rollout
- Monitor update success through enterprise reporting
- Consider update frequency for large deployments

## Summary {#summary}

Enterprise extensions require special consideration for:

1. **Managed storage** for read-only IT-provided configuration
2. **Private distribution** through organizational store or self-hosted CRX
3. **Force-installation** via ExtensionInstallForcelist policy
4. **Enterprise APIs** for device identity and certificate management
5. **Enhanced security** including audit logging and DLP considerations

For more information, see:
- [Storage API Reference](../api-reference/storage-api-deep-dive.md)
- [Security Best Practices](../guides/security-best-practices.md)
- [Extension Updates](../guides/extension-updates.md)

## Related Articles {#related-articles}

## Related Articles

- [Enterprise Policies](../patterns/enterprise-policies.md)
- [Security Audit](../guides/extension-security-audit.md)
