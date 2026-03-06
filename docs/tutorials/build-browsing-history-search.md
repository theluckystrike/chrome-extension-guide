# Build a Browsing History Search Extension

This tutorial guides you through building an enhanced Chrome extension for searching and analyzing your browsing history.

## Step 1: Manifest with History Permission

Create `manifest.json` with the `history` permission:

```json
{
  "manifest_version": 3,
  "name": "History Search Pro",
  "version": "1.0",
  "permissions": ["history"],
  "action": { "default_popup": "popup.html" }
}
```

## Step 2: Popup UI

Create `popup.html` with search input, date filter, and results container:

```html
<input type="text" id="search-input" placeholder="Search history...">
<select id="date-filter">
  <option value="0">All time</option>
  <option value="1">Today</option>
  <option value="86400000">Yesterday</option>
  <option value="604800000">Last week</option>
  <option value="2592000000">Last month</option>
</select>
<button id="export-btn">Export CSV</button>
<div id="results"></div>
```

## Step 3: Search History with Date Range

Use `chrome.history.search()` with query and date filtering:

```javascript
function searchHistory(query, daysBack) {
  const startTime = daysBack ? Date.now() - daysBack : 0;
  chrome.history.search({ text: query, startTime, maxResults: 100 }, displayResults);
}
```

## Step 4: Display Results

Show title, URL, last visit time, and visit count:

```javascript
function displayResults(results) {
  const html = results.map(item => `
    <div class="result-item" data-url="${item.url}">
      <div class="title">${item.title || 'No title'}</div>
      <div class="url">${item.url}</div>
      <div class="meta">Visits: ${item.visitCount} | Last: ${new Date(item.lastVisitTime).toLocaleString()}</div>
    </div>
  `).join('');
  document.getElementById('results').innerHTML = html;
}
```

## Step 5: Domain Grouping

Group results by domain with collapsible sections:

```javascript
function groupByDomain(results) {
  const groups = {};
  results.forEach(item => {
    const domain = new URL(item.url).hostname;
    (groups[domain] = groups[domain] || []).push(item);
  });
  return groups;
}
```

## Step 6: Visit Frequency Chart

Display a bar chart of most visited domains using simple HTML/CSS:

```javascript
function renderChart(results) {
  const counts = {};
  results.forEach(r => counts[new URL(r.url).hostname] = (counts[new URL(r.url).hostname] || 0) + 1);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  // Render bars in #chart-container
}
```

## Step 7: Delete History Items

Delete individual history entries using `chrome.history.deleteUrl()`:

```javascript
function deleteItem(url) {
  chrome.history.deleteUrl(url, () => location.reload());
}
```

## Step 8: Additional Features

**Pagination:** Use `maxResults` parameter for paged results. **Keyboard Navigation:** Implement arrow key navigation through results. **Export CSV:** Generate CSV with title, URL, visit count, and last visit time. **Open in Tab:** Click result to navigate using `chrome.tabs.create({ url })`.

## Chrome History Limitations

- Maximum 50,000 entries returned; `maxResults` capped at 100,000
- Results limited to last 3 months unless `startTime` specified
- Incognito history not accessible

## Performance Tips

- Use `maxResults` to limit query scope and implement debouncing for search input. Cache results when possible and use `chrome.history.deleteUrl()` carefully as deletions are irreversible.

## Related Documentation

- [History API Reference](../api_reference/history-api.md)
- [History Permissions](../permissions/history.md)
- [History Patterns Deep Dive](../patterns/history-deep-dive.md)
