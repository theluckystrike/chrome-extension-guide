# Chrome Web Store Publish API

## Introduction
- Automate extension publishing with Chrome Web Store API
- Use cases: CI/CD pipelines, automated releases, multi-extension management

## Prerequisites
- Chrome Web Store developer account ($5 one-time fee)
- Google Cloud project with CWS API enabled
- OAuth2 credentials (client ID + client secret)

## Setting Up API Access
1. Go to Google Cloud Console -> APIs & Services -> Enable "Chrome Web Store API"
2. Create OAuth2 credentials (Desktop app type)
3. Get refresh token using authorization flow:
   ```bash
   # Authorization URL
   https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob
   ```
4. Exchange code for refresh token

## API Endpoints

### Upload a New Version
```bash
curl -X PUT \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "x-goog-api-version: 2" \
  -T extension.zip \
  "https://www.googleapis.com/upload/chromewebstore/v1.1/items/EXTENSION_ID"
```

### Publish an Extension
```bash
curl -X POST \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "x-goog-api-version: 2" \
  -H "Content-Length: 0" \
  "https://www.googleapis.com/chromewebstore/v1.1/items/EXTENSION_ID/publish"
```

### Get Extension Info
```bash
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "x-goog-api-version: 2" \
  "https://www.googleapis.com/chromewebstore/v1.1/items/EXTENSION_ID?projection=DRAFT"
```

## CI/CD Integration

### GitHub Actions Workflow
- Complete example workflow: build -> zip -> upload -> publish
- Using secrets for credentials
- Triggered on version tag push

### npm Script Automation
- `chrome-webstore-upload-cli` npm package
- Configure with environment variables
- Add to `package.json` scripts

## Publishing to Specific Channels
- `"publishTarget": "default"` — public
- `"publishTarget": "trustedTesters"` — beta testers only
- Useful for staged rollouts

## Version Management with the API
- Bump version in `manifest.json` before upload
- API rejects uploads with same or lower version number
- Cross-ref: `docs/publishing/version-management.md` (upcoming)

## Error Handling
- 401: Token expired — refresh the access token
- 403: API not enabled or wrong permissions
- 409: Version conflict — bump the version number
- Review status codes and what they mean

## Rate Limits
- Upload: 20 per day per extension
- Publish: limited (don't publish more than a few times per day)

## Security Best Practices
- Never commit API credentials to source control
- Use CI/CD secrets or environment variables
- Rotate refresh tokens periodically
- Limit OAuth scope to `chromewebstore` only
