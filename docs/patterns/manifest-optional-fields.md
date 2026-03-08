---
layout: default
title: "Chrome Extension Manifest Optional Fields — Best Practices"
description: "Explore optional manifest.json fields for enhanced extension functionality."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/manifest-optional-fields/"
---

# Optional Manifest.json Fields

Chrome extension manifest.json includes many optional fields beyond the required ones. Understanding when to use these fields helps you build more powerful and professional extensions.

## Runtime Permissions {#runtime-permissions}

### optional_permissions {#optional-permissions}

Request permissions at runtime instead of install time for progressive disclosure:

```json
{
  "optional_permissions": ["tabs", "bookmarks", "cookies"]
}
```

Users approve these when your extension first needs them, reducing install-time friction and increasing conversion.

### optional_host_permissions {#optional-host-permissions}

Request host permissions on-demand for specific sites:

```json
{
  "optional_host_permissions": ["https://*.example.com/*"]
}
```

Enables features that only apply to certain websites without requiring broad access upfront.

## Security & Messaging {#security-messaging}

### content_security_policy {#content-security-policy}

Customize Content Security Policy for extension pages and sandboxed scripts:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'",
    "sandbox": "sandbox allow-scripts; script-src 'self'"
  }
}
```

### externally_connectable {#externally-connectable}

Allow web pages or other extensions to message yours:

```json
{
  "externally_connectable": {
    "matches": ["https://example.com/*"],
    "ids": ["*"]
  }
}
```

## Extension Modularity {#extension-modularity}

### export / import {#export-import}

Share modules between extensions:

```json
{
  "export": {
    "resources": ["modules/*"]
  },
  "import": [
    {"id": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}
  ]
}
```

Enables extension families and shared libraries.

## Development & Distribution {#development-distribution}

### key {#key}

Maintain consistent extension ID during development:

```json
{
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
}
```

Essential when testing web accessible resources or Chrome Web Store features requiring consistent IDs.

### minimum_chrome_version {#minimum-chrome-version}

Prevent installation on outdated Chrome versions:

```json
{
  "minimum_chrome_version": "120"
}
```

Ensures users have required APIs and security features.

### offline_enabled {#offline-enabled}

Declare offline capability:

```json
{
  "offline_enabled": true
}
```

Indicates the extension functions without internet, shown in Chrome Web Store.

### short_name {#short-name}

Short name for limited-space contexts (max 12 characters):

```json
{
  "short_name": "My Ext"
}
```

Used in the extension toolbar, new tab page, and other constrained UI.

### update_url {#update-url}

Self-hosted extension updates for enterprise distribution:

```json
{
  "update_url": "https://example.com/updates.xml"
}
```

Bypasses Chrome Web Store for enterprise or private distribution.

### version_name {#version-name}

Human-readable version string separate from version code:

```json
{
  "version": "1.0.0",
  "version_name": "1.0 Beta"
}
```

Displayed in chrome://extensions and the Web Store.

## Privacy & Enterprise {#privacy-enterprise}

### incognito {#incognito}

Control incognito mode behavior:

```json
{
  "incognito": "split"
}
```

- `"spanning"`: Single background page, events tagged with incognito flag
- `"split"`: Separate background page per incognito window

### storage.managed_schema {#storagemanaged-schema}

Define enterprise-managed settings schema:

```json
{
  "storage": {
    "managed_schema": "schema.json"
  }
}
```

Allows administrators to push policies via Chrome Enterprise policies.

## See Also {#see-also}

- [Manifest Fields Reference](../reference/manifest-fields.md)
- [Manifest JSON Reference](../guides/manifest-json-reference.md)
- [Manifest V3 Fields](../guides/manifest-v3-fields.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
