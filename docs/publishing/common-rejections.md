# Common Chrome Web Store Rejections (and How to Fix Them)

## Introduction
- Chrome Web Store review process overview
- Average review times and what to expect
- How rejections work (email notification, dashboard status)

## 1. Excessive Permissions
- **What triggers it**: Requesting permissions your extension doesn't actively use
- **Examples**: Requesting `<all_urls>` when you only need specific domains, requesting `tabs` when you only need `activeTab`
- **Fix**: Audit manifest.json permissions, use `optional_permissions` for non-critical features, use `activeTab` instead of broad host permissions
- Mention `@theluckystrike/webext-permissions` for runtime permission management — `requestPermission()` lets you request permissions on demand instead of upfront

## 2. Missing or Inadequate Privacy Policy
- **What triggers it**: Using permissions like `storage`, `cookies`, `identity`, or any host permissions without a privacy policy
- **Fix**: Add a privacy policy URL in the Developer Dashboard, cover what data is collected/stored/shared
- Cross-reference: see `docs/publishing/privacy-policy-template.md` in this guide

## 3. Misleading Functionality / Deceptive Behavior
- **What triggers it**: Store listing promises features the extension doesn't deliver, or extension does things not described in the listing
- **Fix**: Ensure listing description accurately matches functionality, include screenshots of actual UI

## 4. Remote Code Execution
- **What triggers it**: Using `eval()`, `new Function()`, loading remote scripts via `<script src="...">`, `chrome.scripting.executeScript` with arbitrary strings
- **Fix**: Bundle all code locally, use `chrome.scripting.executeScript` with `files` parameter only, set strict CSP in manifest.json
- MV3 note: MV3 blocks remote code by default — see `docs/mv3/content-security-policy.md`

## 5. Obfuscated Code
- **What triggers it**: Minified/obfuscated source code that reviewers can't read
- **Fix**: Submit readable source code, use standard bundlers (webpack, vite, rollup) with source maps, avoid custom obfuscation

## 6. Single-Purpose Violation
- **What triggers it**: Extension does too many unrelated things (e.g., ad blocker + screenshot tool + weather widget)
- **Fix**: Split into separate extensions, each with a clear single purpose

## 7. User Data Policy Violations
- **What triggers it**: Collecting user data without disclosure, sending data to external servers without consent
- **Fix**: Disclose data collection in privacy policy AND in extension UI, use `chrome.storage` (local) via `@theluckystrike/webext-storage` instead of external servers where possible

## 8. Broken or Non-Functional Extension
- **What triggers it**: Extension crashes, buttons don't work, features fail silently
- **Fix**: Test thoroughly on Chrome stable, handle errors gracefully, use `@theluckystrike/webext-messaging` `MessagingError` for proper error handling between background/content scripts

## 9. Keyword Spam in Listing
- **What triggers it**: Stuffing unrelated keywords in the description, title, or summary
- **Fix**: Write natural descriptions focused on actual features

## 10. Copyright / Trademark Issues
- **What triggers it**: Using brand logos, names, or assets without permission
- **Fix**: Use original branding, get written permission for any third-party assets

## Appeal Process
- How to respond to rejection emails
- Providing justification for permissions
- Resubmission best practices
- Timeline expectations for appeals

## Pre-Submission Checklist
- Permissions audit (only request what you use)
- Privacy policy in place and linked
- All code bundled locally (no remote scripts)
- Store listing matches actual functionality
- Extension tested on Chrome stable
- Screenshots are current and accurate
- Single clear purpose
