---
layout: default
title: "Chrome Extension Submission Process. Publishing Guide"
description: "Complete step-by-step guide to submitting your Chrome extension to the Chrome Web Store for review and publication."
canonical_url: "https://bestchromeextensions.com/publishing/submission-process/"
---

# Chrome Web Store Submission Process

Overview {#overview}
Step-by-step guide from code to published extension. Covers everything from creating a developer account to passing review.

Prerequisites {#prerequisites}
- Google Developer account ($5 one-time fee)
- Extension built and tested locally
- All required assets (icons, screenshots, descriptions)
- Privacy policy URL (required for most permissions)

Step 1: Create a Developer Account {#step-1-create-a-developer-account}
- Go to Chrome Web Store Developer Dashboard
- Pay $5 registration fee
- Verify email and identity
- Set up payment if planning to charge

Step 2: Prepare Your manifest.json {#step-2-prepare-your-manifestjson}
Ensure your manifest is production-ready:
```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "Brief, clear description under 132 characters",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "permissions": ["storage"],
  "action": { "default_popup": "popup.html" }
}
```

Key rules:
- `name`: max 75 characters, no misleading terms
- `description`: max 132 characters
- `version`: semver format
- Icons: 16x16, 48x48, 128x128 PNG (alpha transparency supported; 96x96 artwork with 16px transparent padding recommended for 128)
- Only request permissions you actually use

Step 3: Package Your Extension {#step-3-package-your-extension}
- Build/bundle your extension
- Create a ZIP of the extension directory (not the parent folder)
- Ensure no unnecessary files (node_modules, .git, tests, source maps)
- Keep ZIP under 50MB

Step 4: Required Store Assets {#step-4-required-store-assets}
| Asset | Size | Required |
|-------|------|----------|
| Store icon | 128x128 PNG | Yes |
| Screenshot 1 | 1280x800 or 640x400 | Yes |
| Screenshots 2-5 | Same sizes | Recommended |
| Promo tile (small) | 440x280 | Required |
| Marquee promo | 1400x560 | Optional |

Step 5: Store Listing Details {#step-5-store-listing-details}
- Detailed description (up to 16,384 characters)
- Category selection
- Language/region targeting
- Website URL
- Support URL or email

Step 6: Privacy Practices {#step-6-privacy-practices}
- Declare which user data you collect
- Explain why each permission is needed (single-purpose description)
- Link to privacy policy
- Certify compliance with Chrome Web Store policies

Step 7: Submit for Review {#step-7-submit-for-review}
- Upload ZIP
- Fill all required fields
- Click "Submit for Review"
- Typical review time: 1-3 business days (can take longer)

Step 8: After Submission {#step-8-after-submission}
- Monitor the Developer Dashboard for review status
- Respond promptly to any reviewer questions
- If rejected, fix issues and resubmit
- Once approved, extension goes live immediately

Tips for Fast Approval {#tips-for-fast-approval}
1. Request minimal permissions
2. Use @theluckystrike/webext-permissions for optional runtime permissions (reduces manifest footprint)
3. Clear, honest description
4. Complete privacy disclosures
5. Include a privacy policy even if not strictly required
6. Test on Chrome stable (not just Canary/Beta)

Using @theluckystrike/webext-* for Better Reviews {#using-theluckystrikewebext-for-better-reviews}

Minimal manifest permissions with runtime requests {#minimal-manifest-permissions-with-runtime-requests}
```ts
// Instead of requiring "tabs" in manifest, request at runtime:
import { requestPermission } from "@theluckystrike/webext-permissions";

document.getElementById("enable-tabs")?.addEventListener("click", async () => {
  const result = await requestPermission("tabs");
  if (result.granted) enableTabFeatures();
});
```

User-friendly permission descriptions {#user-friendly-permission-descriptions}
```ts
import { describePermission } from "@theluckystrike/webext-permissions";

// Show users what they're granting:
const desc = describePermission("tabs");
// "Read information about open tabs"
```

Version Updates {#version-updates}
- Increment version in manifest.json
- Upload new ZIP
- Changes reviewed again (usually faster)
- Auto-update pushes to users within hours

Common Rejection Reasons {#common-rejection-reasons}
- See [Common Rejections](common-rejections.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
