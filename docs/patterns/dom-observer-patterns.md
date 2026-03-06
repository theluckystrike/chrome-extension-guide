# DOM Observer Patterns for Content Scripts

This guide covers patterns for observing DOM changes in Chrome extension content scripts using MutationObserver, IntersectionObserver, and ResizeObserver.

## Basic MutationObserver Setup

```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    console.log('Changed:', mutation.type, mutation.target);
  });
});

observer.observe(document.body, {
  childList: true,
  attributes: true,
  subtree: true
});
```

## Waiting for Dynamic Elements

Observe until target element appears, then disconnect:

```javascript
function waitForElement(selector, parent = document) {
  return new Promise((resolve) => {
    if (parent.querySelector(selector)) return resolve(parent.querySelector(selector));
    
    const observer = new MutationObserver(() => {
      const el = parent.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    
    observer.observe(parent, { childList: true, subtree: true });
  });
}
```

## SPA Navigation Detection

For SPAs that don't trigger page reloads, observe URL and body changes:

```javascript
let lastUrl = location.href;
const navObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log('Route changed:', location.href);
    // Handle route change
  }
});
navObserver.observe(document.body, { childList: true, subtree: true });
```

## Efficient Observation

- **Minimize scope**: Observe specific containers, not `document.body`
- **Use attribute filters**: Observe only needed attributes
- **Debounce callbacks**: Prevent performance issues

```javascript
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
```

## Disconnecting Observers

Always disconnect when done to avoid memory leaks:

```javascript
// When element is removed or feature is disabled
observer.disconnect();
```

## Shadow DOM Observation

Observe inside shadow roots by targeting shadow hosts:

```javascript
const shadowHost = document.querySelector('#host');
const shadowRoot = shadowHost.shadowRoot;
const observer = new MutationObserver(callback);
observer.observe(shadowRoot, { childList: true, subtree: true });
```

## Intersection Observer

Trigger when elements enter viewport:

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      console.log('Visible:', entry.target);
    }
  });
}, { threshold: 0.5 });

observer.observe(document.querySelector('.lazy-load'));
```

## Resize Observer

Detect layout changes on specific elements:

```javascript
const resizeObserver = new ResizeObserver((entries) => {
  entries.forEach((entry) => {
    console.log('Size:', entry.contentRect);
  });
});

resizeObserver.observe(document.querySelector('#container'));
```

## Performance Considerations

- Avoid `subtree: true` on complex pages—observe specific containers
- Use `attributeFilter` to watch only needed attributes
- Disconnect observers when features are disabled
- Combine with `requestAnimationFrame` for visual updates

## Related Guides

- [Content Script Patterns](../guides/content-script-patterns.md)
- [Content Script Isolation](../patterns/content-script-isolation.md)
- [Performance Guide](../guides/performance.md)
