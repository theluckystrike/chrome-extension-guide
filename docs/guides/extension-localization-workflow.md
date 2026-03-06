# Extension Localization Workflow

This guide covers the end-to-end localization workflow for Chrome extensions using Chrome's i18n system.

## File Structure

Store translations in the `_locales/{lang}/messages.json` format:

```text
_locales/
  en/
    messages.json
  es/
    messages.json
  zh_CN/
    messages.json
```

## Message Format

Each key in `messages.json` requires `message` and `description` fields:

```json
{
  "extension_name": {
    "message": "My Extension",
    "description": "Name displayed in the Chrome Web Store"
  },
  "welcome_message": {
    "message": "Welcome, $NAME$!",
    "description": "Greeting shown on first install",
    "placeholders": {
      "NAME": {
        "content": "$1",
        "example": "John"
      }
    }
  }
}
```

## Using Translations in Code

### JavaScript
```javascript
const name = chrome.i18n.getMessage('user_name', ['John']);
const greeting = chrome.i18n.getMessage('welcome_message', ['John']);
```

### Manifest and CSS
Use `__MSG_key__` syntax:
```json
"name": "__MSG_extension_name__"
```
```css
.title { content: "__MSG_title_text__"; }
```

## Predefined Messages

Chrome provides built-in messages:
- `@@extension_id`: Unique extension identifier
- `@@ui_locale`: Current UI locale
- `@@bidi_dir`: Text direction ("ltr" or "rtl")

## RTL Support

Use CSS logical properties for RTL compatibility:
```css
margin-inline-start: 10px;
padding-inline-end: 5px;
text-align: start;
```

Use `dir="auto"` for user-generated content to detect direction.

## Localization Workflow

1. **Extract strings**: Identify all hardcoded strings in your codebase
2. **Send for translation**: Export messages.json to translators
3. **Integrate**: Add translated files to _locales directory
4. **Test**: Verify translations appear correctly

## Recommended Tools

- **chrome-i18n-extract**: Automatically extracts strings from JS/TS files
- **i18n-ally**: VS Code extension for inline translation editing

## Handling Plurals and Gender

Chrome i18n doesn't support ICU MessageFormat. Use workarounds:

```javascript
const items = 5;
const msg = chrome.i18n.getMessage(
  items === 1 ? 'item_singular' : 'item_plural', 
  [items]
);
```

## Dynamic Locale Switching

Not supported. Extensions follow the browser's language setting. Use `chrome.i18n.getAcceptLanguages()` to check available locales.

## Testing Locales

- Launch Chrome with `--lang=es` flag
- Navigate to `chrome://settings/languages` to add/test languages

## Common Mistakes

- Hardcoding strings instead of using messages.json
- Concatenating translated fragments ("Hello " + name)
- Missing descriptions for translators

## Fallback Behavior

Set `default_locale` in manifest.json. When a translation is missing, Chrome falls back to the default locale.

## Related Guides

- [Internationalization](./internationalization.md)
- [i18n API Reference](../api-reference/i18n-api.md)
- [Advanced i18n Patterns](../patterns/advanced-i18n.md)
