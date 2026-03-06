# Chrome Downloads API Reference

The `chrome.downloads` API lets you initiate, monitor, search, pause, resume, cancel, and manage file downloads. You can also control where files are saved and open downloaded files.

## Permissions

```json
{
  "permissions": ["downloads"]
}
```

For controlling the download shelf (the bar at the bottom of Chrome) or overriding save-as locations, you also need:

```json
{
  "permissions": ["downloads", "downloads.shelf", "downloads.ui"]
}
```

See the [downloads permission reference](../permissions/downloads.md) for details.

## DownloadItem Object

| Property | Type | Description |
|----------|------|-------------|
| `id` | `number` | Unique download identifier |
| `url` | `string` | The URL being downloaded |
| `finalUrl` | `string` | URL after redirects |
| `referrer` | `string` | Referrer URL |
| `filename` | `string` | Full local path of the downloaded file |
| `incognito` | `boolean` | Whether downloaded in incognito |
| `danger` | `DangerType` | Danger classification |
| `mime` | `string` | MIME type |
| `startTime` | `string` | ISO 8601 timestamp when download started |
| `endTime` | `string \| undefined` | ISO 8601 timestamp when download completed |
| `estimatedEndTime` | `string \| undefined` | Estimated completion time |
| `state` | `State` | `"in_progress"`, `"interrupted"`, or `"complete"` |
| `paused` | `boolean` | Whether currently paused |
| `canResume` | `boolean` | Whether the download can be resumed |
| `error` | `InterruptReason \| undefined` | Error code if interrupted |
| `bytesReceived` | `number` | Bytes downloaded so far |
| `totalBytes` | `number` | Total file size (-1 if unknown) |
| `fileSize` | `number` | Actual file size after completion |
| `exists` | `boolean` | Whether the file still exists on disk |

**DangerType values:** `"file"`, `"url"`, `"content"`, `"uncommon"`, `"host"`, `"unwanted"`, `"safe"`, `"accepted"`.

## Core Methods

### chrome.downloads.download(options)

Initiate a new download.

```ts
// Download a file
const downloadId = await chrome.downloads.download({
  url: "https://example.com/file.pdf",
});

// Download with a custom filename
const downloadId = await chrome.downloads.download({
  url: "https://example.com/data",
  filename: "reports/data-export.csv",
});

// Download and prompt "Save As" dialog
const downloadId = await chrome.downloads.download({
  url: "https://example.com/file.zip",
  saveAs: true,
});

// Download with specific headers
const downloadId = await chrome.downloads.download({
  url: "https://api.example.com/export",
  headers: [
    { name: "Authorization", value: "Bearer token123" },
  ],
  filename: "export.json",
});

// Download a data URL (generate a file from content)
const content = JSON.stringify({ key: "value" }, null, 2);
const dataUrl = "data:application/json;base64," + btoa(content);
const downloadId = await chrome.downloads.download({
  url: dataUrl,
  filename: "generated-data.json",
});

// Download with conflict handling
const downloadId = await chrome.downloads.download({
  url: "https://example.com/file.pdf",
  filename: "file.pdf",
  conflictAction: "uniquify", // "uniquify", "overwrite", or "prompt"
});
```

**DownloadOptions:**
| Property | Type | Description |
|----------|------|-------------|
| `url` | `string` | URL to download |
| `filename` | `string` | Suggested path relative to downloads folder |
| `conflictAction` | `string` | `"uniquify"` (default), `"overwrite"`, `"prompt"` |
| `saveAs` | `boolean` | Show Save As dialog |
| `method` | `string` | HTTP method (`"GET"` or `"POST"`) |
| `headers` | `HeaderNameValuePair[]` | Custom HTTP headers |
| `body` | `string` | POST body |

### chrome.downloads.search(query)

Search the download history.

```ts
// All downloads
const all = await chrome.downloads.search({});

// Recent downloads
const recent = await chrome.downloads.search({
  orderBy: ["-startTime"],
  limit: 10,
});

// Find by filename
const pdfDownloads = await chrome.downloads.search({
  filenameRegex: ".*\\.pdf$",
});

// Find by URL
const results = await chrome.downloads.search({
  url: "https://example.com/file.zip",
});

// Active downloads
const active = await chrome.downloads.search({
  state: "in_progress",
});

// Completed downloads from today
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayDownloads = await chrome.downloads.search({
  startedAfter: today.toISOString(),
  state: "complete",
});

// Downloads larger than 100MB
const large = await chrome.downloads.search({
  totalBytesGreater: 100 * 1024 * 1024,
});
```

### chrome.downloads.pause(downloadId) / resume(downloadId) / cancel(downloadId)

Control active downloads.

```ts
// Pause
await chrome.downloads.pause(downloadId);

// Resume
await chrome.downloads.resume(downloadId);

// Cancel
await chrome.downloads.cancel(downloadId);
```

### chrome.downloads.open(downloadId)

Open a downloaded file with the system's default application. Requires user gesture in MV3.

```ts
await chrome.downloads.open(downloadId);
```

### chrome.downloads.show(downloadId)

Show the downloaded file in the system file manager (Finder/Explorer).

```ts
await chrome.downloads.show(downloadId);
```

### chrome.downloads.showDefaultFolder()

Open the default downloads folder.

```ts
chrome.downloads.showDefaultFolder();
```

### chrome.downloads.erase(query)

Remove download entries from the history (does not delete the file).

```ts
// Erase completed downloads from history
await chrome.downloads.erase({ state: "complete" });

// Erase a specific download from history
await chrome.downloads.erase({ id: downloadId });
```

### chrome.downloads.removeFile(downloadId)

Delete the downloaded file from disk.

```ts
await chrome.downloads.removeFile(downloadId);
```

### chrome.downloads.getFileIcon(downloadId, options?)

Get the file's icon as a data URL.

```ts
const iconUrl = await chrome.downloads.getFileIcon(downloadId, { size: 32 });
// iconUrl is a data:image/png;base64,... string
```

### chrome.downloads.setShelfEnabled(enabled) — deprecated

Use `chrome.downloads.setUiOptions()` instead:

```ts
// Hide the download shelf/bubble
await chrome.downloads.setUiOptions({ enabled: false });

// Show it again
await chrome.downloads.setUiOptions({ enabled: true });
```

Requires the `"downloads.ui"` permission.

## Events

### chrome.downloads.onCreated

```ts
chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log(`Download started: ${downloadItem.url}`);
  console.log(`Saving to: ${downloadItem.filename}`);
});
```

### chrome.downloads.onChanged

Fires when any property of a download changes. `changeInfo` only contains the changed properties.

```ts
chrome.downloads.onChanged.addListener((delta) => {
  console.log(`Download ${delta.id} changed`);

  if (delta.state) {
    console.log(`State: ${delta.state.previous} -> ${delta.state.current}`);

    if (delta.state.current === "complete") {
      console.log("Download finished!");
    }
    if (delta.state.current === "interrupted") {
      console.log("Download failed:", delta.error?.current);
    }
  }

  if (delta.filename) {
    console.log(`Filename: ${delta.filename.current}`);
  }
});
```

### chrome.downloads.onDeterminingFilename

Intercept and modify the filename before a download starts. Only one extension can handle this event.

```ts
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  // Organize downloads into folders by MIME type
  const folder = downloadItem.mime.startsWith("image/") ? "images" : "other";
  const filename = downloadItem.filename.split("/").pop() || "download";

  suggest({
    filename: `${folder}/${filename}`,
    conflictAction: "uniquify",
  });
});
```

### chrome.downloads.onErased

```ts
chrome.downloads.onErased.addListener((downloadId) => {
  console.log(`Download ${downloadId} removed from history`);
});
```

## Using with @theluckystrike/webext-messaging

Download manager with progress tracking:

```ts
// shared/messages.ts
type Messages = {
  startDownload: {
    request: { url: string; filename?: string };
    response: { downloadId: number };
  };
  getActiveDownloads: {
    request: void;
    response: Array<{
      id: number;
      filename: string;
      progress: number;
      state: string;
    }>;
  };
  cancelDownload: {
    request: { downloadId: number };
    response: { success: boolean };
  };
};

// background.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const msg = createMessenger<Messages>();

msg.onMessage({
  startDownload: async ({ url, filename }) => {
    const downloadId = await chrome.downloads.download({ url, filename });
    return { downloadId };
  },
  getActiveDownloads: async () => {
    const downloads = await chrome.downloads.search({ state: "in_progress" });
    return downloads.map((d) => ({
      id: d.id,
      filename: d.filename.split("/").pop() || "unknown",
      progress: d.totalBytes > 0 ? Math.round((d.bytesReceived / d.totalBytes) * 100) : -1,
      state: d.paused ? "paused" : "downloading",
    }));
  },
  cancelDownload: async ({ downloadId }) => {
    await chrome.downloads.cancel(downloadId);
    return { success: true };
  },
});
```

## Using with @theluckystrike/webext-storage

Track download statistics:

```ts
import { defineSchema, createStorage } from "@theluckystrike/webext-storage";

const schema = defineSchema({
  downloadStats: {
    totalDownloads: 0,
    totalBytes: 0,
    downloadsByType: {} as Record<string, number>,
  },
});

const storage = createStorage({ schema, area: "local" });

chrome.downloads.onChanged.addListener(async (delta) => {
  if (delta.state?.current !== "complete") return;

  const [item] = await chrome.downloads.search({ id: delta.id });
  if (!item) return;

  const stats = await storage.get("downloadStats");
  const ext = item.filename.split(".").pop()?.toLowerCase() || "unknown";

  await storage.set("downloadStats", {
    totalDownloads: stats.totalDownloads + 1,
    totalBytes: stats.totalBytes + item.fileSize,
    downloadsByType: {
      ...stats.downloadsByType,
      [ext]: (stats.downloadsByType[ext] || 0) + 1,
    },
  });
});
```

## Common Patterns

### Download generated content (export data)

```ts
function downloadAsFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({ url, filename, saveAs: true });
}

// Export settings as JSON
downloadAsFile(
  JSON.stringify(settings, null, 2),
  "settings-backup.json",
  "application/json",
);
```

### Wait for a download to complete

```ts
function waitForDownload(downloadId: number): Promise<chrome.downloads.DownloadItem> {
  return new Promise((resolve, reject) => {
    function listener(delta: chrome.downloads.DownloadDelta) {
      if (delta.id !== downloadId) return;
      if (delta.state?.current === "complete") {
        chrome.downloads.onChanged.removeListener(listener);
        chrome.downloads.search({ id: downloadId }).then(([item]) => resolve(item));
      }
      if (delta.state?.current === "interrupted") {
        chrome.downloads.onChanged.removeListener(listener);
        reject(new Error(delta.error?.current || "Download interrupted"));
      }
    }
    chrome.downloads.onChanged.addListener(listener);
  });
}
```

### Batch download with progress

```ts
async function batchDownload(urls: string[]) {
  const downloads = await Promise.all(
    urls.map((url) => chrome.downloads.download({ url })),
  );
  console.log(`Started ${downloads.length} downloads`);
  return downloads; // array of download IDs
}
```

## Gotchas

1. **`download()` returns immediately** with a download ID. The download happens asynchronously. Use `onChanged` to track completion.

2. **`filename` is relative** to the user's downloads directory. You cannot specify absolute paths or escape the downloads folder.

3. **`open()` requires user gesture** in MV3. You can only call it in response to a user action (click handler, context menu, etc.).

4. **`headers` cannot set all headers.** Forbidden headers like `Cookie`, `Origin`, and `Host` are silently ignored.

5. **`onDeterminingFilename` is exclusive.** Only one extension can use this event. If another extension already handles it, your listener will not fire.

6. **`totalBytes` can be `-1`** if the server doesn't send a `Content-Length` header. Handle this case in progress calculations.

7. **`removeFile` requires the download to be complete.** You cannot delete an in-progress download's partial file — cancel it first.

## Related

- [downloads permission](../permissions/downloads.md)
- [Storage API Deep Dive](storage-api-deep-dive.md)
- [Chrome downloads API docs](https://developer.chrome.com/docs/extensions/reference/api/downloads)
