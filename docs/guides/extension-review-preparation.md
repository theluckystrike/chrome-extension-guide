# Extension Review Preparation

This guide covers everything you need to prepare your Chrome extension for a successful Chrome Web Store (CWS) review. Following these guidelines will help avoid common rejection reasons and ensure a smooth submission process.

## Pre-Submission Checklist

Before submitting your extension, verify each of the following:

- [ ] **Manifest file** is valid and uses Manifest V3
- [ ] **Version number** is incremented from previous submission
- [ ] **Extension icon** meets CWS specifications (128x128, 96x96, 48x48, 32x32, 16x16)
- [ ] **Screenshots** meet requirements (1280x800 or 640x400, PNG/JPEG format)
- [ ] **Privacy policy** is hosted and URL is provided in developer dashboard
- [ ] **All permissions** are justified in the "Next Steps" section
- [ ] **No obfuscated or minified code** in the uploaded package
- [ ] **Content Security Policy** is properly defined
- [ ] **Single purpose** is clearly stated in the description

## Common Rejection Reasons and How to Avoid Them

Understanding frequent rejection reasons helps you prevent them:

### 1. Permission Overreach
**Problem:** Requesting more permissions than necessary for your extension's functionality.

**Solution:** Only request permissions your extension actually needs. Use optional permissions where possible and implement permission downgrades in Manifest V3.

### 2. Single Purpose Violation
**Problem:** Extension tries to do too many unrelated things.

**Solution:** Ensure your extension has one clear purpose. If you need multiple features, consider creating separate extensions or clearly document how features relate to the core purpose.

### 3. Obfuscated Code
**Problem:** Using minified, obfuscated, or packed code that reviewers cannot inspect.

**Solution:** Always submit source code that can be reviewed. If you must use build tools that minify code, ensure source maps are available or keep a non-minified version for submission.

### 4. Misleading Descriptions
**Problem:** Description doesn't match actual functionality.

**Solution:** Your description must accurately reflect what the extension does. Update it if functionality changes.

### 5. Privacy Policy Issues
**Problem:** Missing, inadequate, or inaccessible privacy policy.

**Solution:** Host a comprehensive privacy policy at a stable URL. See [Privacy Policy Template](../publishing/privacy-policy-template.md) for requirements.

## Permission Justification

Every permission must be justified in the CWS developer dashboard. Document why each permission is needed:

| Permission | Common Justification |
|------------|---------------------|
| `tabs` | Accessing tab information for productivity features |
| `activeTab` | Interacting with current page when user invokes extension |
| `storage` | Storing user preferences and settings locally |
| `cookies` | Managing session cookies for authentication features |
| `webRequest` | Modifying network requests for filtering/blocking |
| `scripting` | Injecting content scripts for page manipulation |
| `contextMenus` | Adding right-click menu options |

Always prefer `activeTab` over `tabs` permission when possible—it only grants access when the user explicitly invokes your extension.

## Privacy Policy Requirements

A compliant privacy policy must include:

1. **Data Collection Disclosure**: What data you collect and why
2. **Data Storage**: How and where data is stored
3. **Third-Party Sharing**: Whether data is shared with third parties
4. **User Rights**: How users can access or delete their data
5. **Contact Information**: How users can contact you with privacy concerns

See [Privacy Policy Template](../publishing/privacy-policy-template.md) for a complete template.

## Single Purpose Policy Compliance

Chrome Web Store requires extensions to have a single, clearly defined purpose:

- Define one core function (e.g., "block ads on YouTube")
- All features must support this primary purpose
- Avoid bundling unrelated functionality
- If you need multiple distinct features, consider separate extensions

## No Obfuscated Code Rule

CWS reviewers must be able to inspect your code:

- Submit readable, non-minified JavaScript
- If using build tools, either keep source maps or submit unminified versions
- Avoid code packers, obfuscators, or encryptors
- CSS and HTML should also be human-readable

## Content Security Policy Requirements

Define a proper CSP in your `manifest.json`:

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

Guidelines:
- Use `'self'` for local scripts
- Avoid `unsafe-inline` or `unsafe-eval`
- If you need external scripts, whitelist specific domains
- Manifest V3 has stricter CSP requirements than V2

## Screenshots and Store Listing Requirements

Your store listing must include:

- **At least 1 screenshot** (up to 20)
- **Minimum size**: 640x400 or 1280x800 pixels
- **Formats**: PNG or JPEG
- **Store icon**: 128x128 PNG
- **Description**: Clearly explain functionality
- **Category**: Select appropriate category

See [Screenshot Guidelines](../publishing/screenshot-guidelines.md) and [Listing Optimization](../publishing/listing-optimization.md) for best practices.

## Review Timeline Expectations

CWS review times vary:

- **Typical**: 1-3 business days for new submissions
- **Complex**: Up to 7+ business days for extensions with sensitive permissions
- **Updates**: Usually faster (1-2 days)

Factors affecting timeline:
- Number of permissions requested
- Complexity of functionality
- Previous review history
- Holiday periods

## Handling Rejections

If your extension is rejected:

### Step 1: Understand the Reason
- Check the rejection email for specific issues
- Review [Common Rejections](../publishing/common-rejections.md) guide
- Access detailed feedback in CWS Developer Dashboard

### Step 2: Fix the Issues
- Address each point mentioned in the rejection
- Update code, permissions, or listing as needed
- Document your changes for the resubmission

### Step 3: Appeal or Resubmit
- If you believe rejection was incorrect, use the appeal process
- Provide clear justification for why the extension complies
- For fixes, resubmit with updated "Notes for Reviewer" explaining changes

### Common Fixes for Rejections

| Issue | Fix |
|-------|-----|
| Permission too broad | Switch to optional permissions or activeTab |
| No privacy policy | Add hosted privacy policy URL |
| Obfuscated code | Submit unminified source code |
| Single purpose violation | Remove unrelated features or split extension |
| Misleading description | Update description to match functionality |

## Related Resources

- [Submission Process](../publishing/submission-process.md)
- [Publishing Guide](../publishing/publishing-guide.md)
- [Common Rejections](../publishing/common-rejections.md)
- [Privacy Policy Template](../publishing/privacy-policy-template.md)
- [Listing Optimization](../publishing/listing-optimization.md)
