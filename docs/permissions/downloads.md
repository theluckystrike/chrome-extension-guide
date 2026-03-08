---
title: "downloads Permission Reference"
description: "- Grants access to `chrome.downloads` API - Start downloads programmatically from any extension context - Monitor download progress, pause, resume, and cancel"
permalink: /permissions/downloads/
category: permissions
order: 17
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/permissions/downloads/"
---

# downloads Permission Reference

## What It Does {#what-it-does}
- Grants access to `chrome.downloads` API
- Start downloads programmatically from any extension context
- Monitor download progress, pause, resume, and cancel
- Search and manage download history
- Open downloaded files in the system default application
- Show downloaded files in the system file manager

This is a medium-warning permission — users will see a prompt when installing your extension.

## Manifest Configuration {#manifest-configuration}

### Basic downloads permission {#basic-downloads-permission}
```json
{
  "permissions": ["downloads"]
}
```

### With file opening capability {#with-file-opening-capability}
```json
{
  "permissions": ["downloads", "downloads.open"]
}
```

The `downloads` permission is required for all download functionality. The additional `downloads.open` permission is needed only if you want to open files after download completes.

## Using with @theluckystrike/webext-permissions {#using-with-theluckystrikewebext-permissions}

```ts
import { checkPermission, PERMISSION_DESCRIPTIONS } from "@theluckystrike/webext-permissions";

const result = await checkPermission("downloads");
console.log(result.description); // "Manage downloads"
console.log(result.granted);     // true (if in manifest)

PERMISSION_DESCRIPTIONS.downloads; // "Manage downloads"
```

## Using with @theluckystrike/webext-messaging {#using-with-theluckystrikewebext-messaging}

Pattern: Popup or content script triggers downloads via background:

```ts
// shared/messages.ts
type Messages = {
  downloadFile: {
    request: { url: string; filename?: string };
    response: { downloadId: number };
  };
  getDownloadProgress: {
    request: { downloadId: number };
    response: { state: string; bytesReceived?: number; totalBytes?: number };
  };
  searchDownloads: {
    request: { query?: string };
    response: chrome.downloads.DownloadItem[];
  };
  cancelDownload: {
    request: { downloadId: number };
    response: { cancelled: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();

msg.onMessage({
  downloadFile: async ({ url, filename }) => {
    const downloadId = await chrome.downloads.download({
      url,
      filename,
      saveAs: true,
    });
    return { downloadId };
  },
  getDownloadProgress: async ({ downloadId }) => {
    const item = await chrome.downloads.search({ id: downloadId });
    if (!item.length) return { state: "unknown" };
    const [download] = item;
    return {
      state: download.state,
      bytesReceived: download.bytesReceived,
      totalBytes: download.totalBytes,
    };
  },
  searchDownloads: async ({ query }) => {
    return chrome.downloads.search(query ? { query: [query] } : {});
  },
  cancelDownload: async ({ downloadId }) => {
    await chrome.downloads.cancel(downloadId);
    return { cancelled: true };
  },
});
```

### Download event forwarding {#download-event-forwarding}
```ts
// background.ts - Forward download events to popup
chrome.downloads.onChanged.addListener((downloadDelta) => {
  // Broadcast to all contexts that need download progress
  msg.broadcast({ type: "downloadProgress", payload: downloadDelta });
});
```

## Using with @theluckystrike/webext-storage {#using-with-theluckystrikewebext-storage}

Track download preferences and maintain download history:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

// Schema for download preferences and history
const schema = defineSchema({
  defaultDownloadPath: "" as string,
  autoOpenDownloads: false as boolean,
  maxConcurrentDownloads: 3 as number,
  downloadHistory: [] as Array<{
    id: number;
    url: string;
    filename: string;
    completedAt: number;
    bytes: number;
  }>,
});

const storage = createStorage({ schema });

// Log completed downloads via onChanged listener
chrome.downloads.onChanged.addListener(async (downloadDelta) => {
  if (downloadDelta.state?.current === "complete") {
    const items = await chrome.downloads.search({ id: downloadDelta.id });
    if (items.length) {
      const item = items[0];
      const history = await storage.get("downloadHistory");
      history.push({
        id: item.id,
        url: item.url,
        filename: item.filename || "",
        completedAt: Date.now(),
        bytes: item.bytesReceived || 0,
      });
      // Keep only last 100 downloads
      if (history.length > 100) history.shift();
      await storage.set("downloadHistory", history);
    }
  }
});

// React to preference changes
storage.watch("autoOpenDownloads", async (autoOpen) => {
  if (autoOpen) {
    chrome.downloads.onChanged.addListener(openOnComplete);
  } else {
    chrome.downloads.onChanged.removeListener(openOnComplete);
  }
});

async function openOnComplete(downloadDelta: chrome.downloads.DownloadDelta) {
  if (downloadDelta.state?.current === "complete") {
    await chrome.downloads.open(downloadDelta.id);
  }
}
```

## Key API Methods {#key-api-methods}

| Method | Description |
|--------|-------------|
| `downloads.download(options)` | Start a new download, returns downloadId |
| `downloads.search(query)` | Find downloads matching criteria |
| `downloads.pause(downloadId)` | Pause an in-progress download |
| `downloads.resume(downloadId)` | Resume a paused download |
| `downloads.cancel(downloadId)` | Cancel an in-progress download |
| `downloads.erase(query)` | Remove downloads from history |
| `downloads.open(downloadId)` | Open downloaded file (requires `downloads.open` permission) |
| `downloads.show(downloadId)` | Show downloaded file in system file manager |
| `downloads.showDefaultFolder()` | Open default downloads folder |
| `downloads.onCreated` | Event — fires when a download starts |
| `downloads.onChanged` | Event — fires when download state or progress changes |
| `downloads.onErased` | Event — fires when download is removed from history |
| `downloads.onDeterminingFilename` | Event — modify filename before download starts |

## Download Options {#download-options}

```ts
interface DownloadOptions {
  // Required
  url: string;
  
  // Optional
  filename?: string;        // Relative to downloads directory
  saveAs?: boolean;         // Show "Save As" dialog
  conflictAction?: string; // "uniquify", "overwrite", "prompt"
  method?: string;          // "GET" (default) or "POST"
  headers?: HeaderPair[];   // Custom HTTP headers
  body?: string;            // Request body for POST
  incognito?: boolean;      // Download in incognito mode
}

interface HeaderPair {
  name: string;
  value: string;
}
```

### conflictAction options {#conflictaction-options}
- `"uniquify"` (default) — append a unique suffix to avoid conflicts
- `"overwrite"` — replace existing file
- `"prompt"` — ask user via dialog

## Common Patterns {#common-patterns}

### Bulk downloader {#bulk-downloader}
```ts
async function downloadAll(urls: string[], folder: string) {
  const queue = [...urls];
  const results: number[] = [];
  
  while (queue.length > 0) {
    const batch = queue.splice(0, 3); // 3 concurrent
    const promises = batch.map((url, i) => 
      chrome.downloads.download({
        url,
        filename: `${folder}/${i + 1}`,
        saveAs: false,
      })
    );
    const ids = await Promise.all(promises);
    results.push(...ids);
  }
  return results;
}
```

### Download manager UI {#download-manager-ui}
```ts
// In popup or options page
async function renderDownloadManager() {
  const downloads = await chrome.downloads.search({});
  
  const container = document.getElementById("downloads");
  container.innerHTML = downloads.map(d => `
    <div class="download-item" data-id="${d.id}">
      <div class="filename">${d.filename}</div>
      <div class="progress">
        <div class="bar" style="width: ${getProgressPercent(d)}%"></div>
      </div>
      <div class="status">${d.state}</div>
      <div class="actions">
        ${d.state === "in_progress" ? `<button data-action="pause">Pause</button>` : ""}
        ${d.state === "in_progress" ? `<button data-action="cancel">Cancel</button>` : ""}
        ${d.state === "complete" ? `<button data-action="open">Open</button>` : ""}
      </div>
    </div>
  `).join("");
}

function getProgressPercent(download: chrome.downloads.DownloadItem): number {
  if (!download.totalBytes) return 0;
  return Math.round((download.bytesReceived / download.totalBytes) * 100);
}
```

### Export data as file {#export-data-as-file}
```ts
function exportAsJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  return chrome.downloads.download({
    url,
    filename,
    saveAs: true,
  });
}

// Usage
await exportAsJson({ users: ["alice", "bob"] }, "export/users.json");
```

## Gotchas {#gotchas}

- **Filename is relative to downloads directory** — you cannot specify an absolute path. The file will always be saved in the user's default downloads folder or a subfolder within it.

- **`downloads.open` requires separate permission** — if you need to open files after download, add `"downloads.open"` to your permissions array. This triggers an additional permission prompt.

- **Use `onDeterminingFilename` to control final path** — this event fires before the download starts and lets you modify the filename based on MIME type, URL, or other criteria.

- **Downloads persist across extension updates** — the download continues even if your extension updates, but your event listeners must be re-registered after service worker restarts.

- **Service worker termination** — in MV3, the background service worker can terminate. Use `chrome.downloads.onChanged` to track progress; don't rely on in-memory state.

- **`search()` has no pagination** — returns all matches. For large download histories, filter by state or date to reduce results.

- **Blob URLs must be created in the same context** — if creating a download from a blob in a content script, pass the blob URL to the background for download.

- **POST requests with body require `method: "POST"`** — and ensure `body` is properly encoded.

## Related Permissions {#related-permissions}
- [storage](storage.md) — track download history and preferences
- [notifications](notifications.md) — alert user when downloads complete
- [tabs](tabs.md) — get URLs from tabs to feed into downloads

## API Reference {#api-reference}
- [Downloads API Reference](../api-reference/downloads-api.md)
- [Chrome downloads API docs](https://developer.chrome.com/docs/extensions/reference/api/downloads)

## Frequently Asked Questions

### How do I download a file in Chrome extension?
Use chrome.downloads.download() to initiate downloads from your extension. You can specify the URL, filename, and other options.

### Can extensions download files to a custom location?
Yes, but users will be prompted to choose a location, or you can use the downloads API's "saveAs" option set to false with appropriate permissions.
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
