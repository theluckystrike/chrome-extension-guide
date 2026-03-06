# File Handling API Patterns (chrome.fileSystemProvider)

## Overview

The Chrome File System Provider API (`chrome.fileSystemProvider`) enables extensions to expose a virtual file system to the operating system, allowing users to access files managed by the extension through native file dialogs, file managers, and other system applications. This is particularly powerful for cloud storage connectors, archive managers, and custom storage solutions.

This guide covers eight practical patterns for implementing file system providers in Chrome extensions, from basic mounting to advanced cloud storage connectors with intelligent caching.

---

## Required Permissions

```jsonc
// manifest.json
{
  "permissions": [
    "fileSystemProvider"
  ],
  "file_system_provider_capabilities": {
    "configurable": true,
    "watchable": false,
    "source": "network"
  }
}
```

The `file_system_provider_capabilities` manifest key defines:
- `configurable`: Whether users can adjust mount options
- `watchable`: Whether the provider can notify of external changes
- `source`: Where files originate (`network`, `device`, or `local`)

---

## Pattern 1: Registering a File System Provider

The first step is mounting your file system provider so it appears in the system's file browser. The `chrome.fileSystemProvider.mount()` method registers your provider with the OS.

### Basic Mount Implementation

```ts
// background/service-worker.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

interface FileSystemProviderConfig {
  fileSystemId: string;
  displayName: string;
  writable?: boolean;
}

type ProviderMessages = {
  "provider:mount": { request: FileSystemProviderConfig; response: { success: boolean } };
  "provider:unmount": { request: void; response: { success: boolean } };
};

const messenger = createMessenger<ProviderMessages>();

const FILE_SYSTEM_ID = "my-cloud-storage";

async function mountFileSystem(): Promise<void> {
  try {
    await chrome.fileSystemProvider.mount({
      fileSystemId: FILE_SYSTEM_ID,
      displayName: "Cloud Storage",
      persistentDirectoryId: "root",
    });
    console.log("File system mounted successfully");
  } catch (error) {
    console.error("Failed to mount file system:", error);
    throw error;
  }
}

// Listen for mount requests from popup/options
messenger.handle("provider:mount", async ({ request }) => {
  await mountFileSystem();
  return { success: true };
});

messenger.handle("provider:unmount", async () => {
  await chrome.fileSystemProvider.unmount({ fileSystemId: FILE_SYSTEM_ID });
  return { success: true };
});
```

### Declarative Mount (manifest-based)

You can also declare a file system provider in the manifest for automatic mounting:

```jsonc
// manifest.json
{
  "file_system_provider": {
    "mount_point_name": "cloud-storage",
    "name": "Cloud Storage",
    "Capabilities": {
      "supports_notify_on_created": true,
      "supports_notify_on_deleted": true,
      "supports_read": true,
      "supports_write": true,
      "configurable": true
    }
  }
}
```

---

## Pattern 2: Implementing onReadDirectoryRequested

Directory listing is essential for navigation. The `onReadDirectoryRequested` event fires when the OS needs to list contents of a directory.

### Virtual Directory Structure

First, define your virtual file system structure:

```ts
// lib/file-system/types.ts
export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  modificationTime: number;
  mimeType?: string;
}

export interface VirtualFileSystem {
  [path: string]: FileEntry;
}

export const virtualFileSystem: VirtualFileSystem = {
  "/": {
    name: "root",
    isDirectory: true,
    size: 0,
    modificationTime: Date.now(),
  },
  "/documents": {
    name: "documents",
    isDirectory: true,
    size: 0,
    modificationTime: Date.now(),
  },
  "/documents/readme.txt": {
    name: "readme.txt",
    isDirectory: false,
    size: 1024,
    modificationTime: Date.now() - 86400000,
    mimeType: "text/plain",
  },
  "/images": {
    name: "images",
    isDirectory: true,
    size: 0,
    modificationTime: Date.now(),
  },
  "/images/photo.jpg": {
    name: "photo.jpg",
    isDirectory: false,
    size: 2048000,
    modificationTime: Date.now() - 172800000,
    mimeType: "image/jpeg",
  },
};
```

### Directory Read Handler

```ts
// background/directory-handler.ts
import { virtualFileSystem, FileEntry } from "../lib/file-system/types";

function parseDirectoryPath(path: string): string[] {
  if (!path || path === "/") return [];
  return path.split("/").filter(Boolean);
}

function listDirectory(path: string): FileEntry[] {
  const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
  const entries: FileEntry[] = [];

  for (const [entryPath, entry] of Object.entries(virtualFileSystem)) {
    const pathParts = parseDirectoryPath(entryPath);
    
    // Check if entry is directly in the requested directory
    if (pathParts.length === 0 && normalizedPath === "/") {
      if (entryPath !== "/" && !entryPath.includes("/", 1)) {
        entries.push({ ...entry, isDirectory: entry.isDirectory });
      }
    } else if (pathParts.length > 1) {
      const parentPath = "/" + pathParts.slice(0, -1).join("/");
      if (parentPath === normalizedPath || (normalizedPath === "/" && pathParts.length === 1)) {
        entries.push({ ...entry, isDirectory: entry.isDirectory });
      }
    }
  }

  return entries;
}

chrome.fileSystemProvider.onReadDirectoryRequested.addListener(
  (options, successCallback, errorCallback) => {
    const { fileSystemId, directoryPath, requestId } = options;

    console.log(`Reading directory: ${directoryPath}, requestId: ${requestId}`);

    try {
      if (directoryPath.startsWith("..")) {
        errorCallback(chrome.fileSystemProvider.ERROR_NOT_ALLOWED);
        return;
      }

      const entries = listDirectory(directoryPath);
      successCallback(entries, false); // hasMore = false for complete listing
    } catch (error) {
      console.error("Directory read error:", error);
      errorCallback(chrome.fileSystemProvider.ERROR_FAILED);
    }
  },
  { fileSystemId: ["my-cloud-storage"] }
);
```

---

## Pattern 3: Handling onReadFileRequested

Serving file content is handled by `onReadFileRequested`. This pattern supports streaming for large files.

### File Content Provider

```ts
// background/file-handler.ts
import { virtualFileSystem } from "../lib/file-system/types";

// Simulated file content store
const fileContents: Record<string, ArrayBuffer> = {};

function getFileContents(path: string): ArrayBuffer | null {
  return fileContents[path] || null;
}

function createSampleContent(path: string): ArrayBuffer {
  const sampleData = `Content of ${path}\n\nThis is sample file content for demonstration.`;
  const encoder = new TextEncoder();
  return encoder.encode(sampleData).buffer;
}

// Pre-populate with sample content
fileContents["/documents/readme.txt"] = createSampleContent("/documents/readme.txt");

chrome.fileSystemProvider.onReadFileRequested.addListener(
  (options, successCallback, errorCallback) => {
    const { fileSystemId, filePath, requestId, offset } = options;

    console.log(`Reading file: ${filePath}, offset: ${offset}, requestId: ${requestId}`);

    try {
      // Security: prevent path traversal
      if (filePath.includes("..")) {
        errorCallback(chrome.fileSystemProvider.ERROR_NOT_ALLOWED);
        return;
      }

      const entry = virtualFileSystem[filePath];
      if (!entry) {
        errorCallback(chrome.fileSystemProvider.ERROR_NOT_FOUND);
        return;
      }

      if (entry.isDirectory) {
        errorCallback(chrome.fileSystemProvider.ERROR_NOT_A_FILE);
        return;
      }

      let content = fileContents[filePath];
      if (!content) {
        content = createSampleContent(filePath);
      }

      // Handle offset for partial reads
      let data: ArrayBuffer;
      if (offset > 0) {
        const existingBuffer = new Uint8Array(content);
        const remaining = existingBuffer.byteLength - offset;
        if (remaining <= 0) {
          successCallback(new ArrayBuffer(0), true);
          return;
        }
        data = existingBuffer.slice(offset).buffer;
      } else {
        data = content;
      }

      const hasMore = false; // Set true for streaming large files
      successCallback(data, hasMore);
    } catch (error) {
      console.error("File read error:", error);
      errorCallback(chrome.fileSystemProvider.ERROR_FAILED);
    }
  },
  { fileSystemId: ["my-cloud-storage"] }
);
```

### Streaming Large Files

For large files, implement streaming to avoid memory issues:

```ts
// background/streaming-handler.ts
interface StreamingState {
  [requestId: string]: {
    filePath: string;
    stream: ReadableStream<Uint8Array>;
    offset: number;
  };
}

const activeStreams: StreamingState = {};

chrome.fileSystemProvider.onReadFileRequested.addListener(
  async (options, successCallback, errorCallback) => {
    const { fileSystemId, filePath, requestId, offset } = options;

    try {
      // Create a stream from your data source (API, database, etc.)
      const response = await fetch(`/api/files/${encodeURIComponent(filePath)}`);
      const reader = response.body?.getReader();
      
      if (!reader) {
        errorCallback(chrome.fileSystemProvider.ERROR_FAILED);
        return;
      }

      // Store stream state for subsequent reads
      activeStreams[requestId] = {
        filePath,
        stream: reader,
        offset,
      };

      // Read initial chunk (e.g., 64KB)
      const chunk = await reader.read();
      if (chunk.done) {
        successCallback(new ArrayBuffer(0), false);
        return;
      }

      successCallback(chunk.value.buffer, true); // hasMore = true
    } catch (error) {
      errorCallback(chrome.fileSystemProvider.ERROR_FAILED);
    }
  }
);
```

---

## Pattern 4: Implementing onGetMetadataRequested

File metadata is crucial for the OS to display proper icons, sizes, and timestamps.

### Metadata Handler Implementation

```ts
// background/metadata-handler.ts
import { virtualFileSystem, FileEntry } from "../lib/file-system/types";

chrome.fileSystemProvider.onGetMetadataRequested.addListener(
  (options, successCallback, errorCallback) => {
    const { fileSystemId, filePath, requestId } = options;

    console.log(`Getting metadata for: ${filePath}, requestId: ${requestId}`);

    try {
      // Security check
      if (filePath.includes("..")) {
        errorCallback(chrome.fileSystemProvider.ERROR_NOT_ALLOWED);
        return;
      }

      const entry = virtualFileSystem[filePath];
      if (!entry) {
        errorCallback(chrome.fileSystemProvider.ERROR_NOT_FOUND);
        return;
      }

      // Return metadata in the expected format
      successCallback({
        name: entry.name,
        size: entry.size,
        modificationTime: entry.modificationTime,
        isDirectory: entry.isDirectory,
        mimeType: entry.mimeType,
      });
    } catch (error) {
      console.error("Metadata error:", error);
      errorCallback(chrome.fileSystemProvider.ERROR_FAILED);
    }
  },
  { fileSystemId: ["my-cloud-storage"] }
);
```

### Extended Metadata with Thumbnails

For richer integration, provide thumbnails for quick preview:

```ts
// background/thumbnail-handler.ts

chrome.fileSystemProvider.onGetMetadataRequested.addListener(
  (options, successCallback, errorCallback) => {
    const { fileSystemId, filePath } = options;

    // ... get basic metadata ...

    const metadata: chrome.fileSystemProvider.Metadata = {
      name: entry.name,
      size: entry.size,
      modificationTime: entry.modificationTime,
      isDirectory: entry.isDirectory,
    };

    // Add thumbnail for images
    if (!entry.isDirectory && entry.mimeType?.startsWith("image/")) {
      // Generate or fetch thumbnail (base64 encoded PNG)
      metadata.thumbnail = getThumbnail(filePath);
    }

    successCallback(metadata);
  },
  { fileSystemId: ["my-cloud-storage"] }
);

function getThumbnail(filePath: string): string {
  // Return base64 PNG data URL for thumbnail
  // This is typically a smaller version of the image
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}
```

---

## Pattern 5: Write Support with onWriteFileRequested and onCreateFileRequested

Enabling write capabilities requires implementing create, write, and delete handlers.

### File Creation Handler

```ts
// background/create-handler.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

type StorageMessages = {
  "storage:set": { request: { key: string; value: unknown }; response: void };
};

const storageMessenger = createMessenger<StorageMessages>();

const virtualFileSystem: Record<string, unknown> = {};

chrome.fileSystemProvider.onCreateFileRequested.addListener(
  async (options, successCallback, errorCallback) => {
    const { fileSystemId, filePath, requestId } = options;

    console.log(`Creating file: ${filePath}, requestId: ${requestId}`);

    try {
      if (filePath.includes("..")) {
        errorCallback(chrome.fileSystemProvider.ERROR_NOT_ALLOWED);
        return;
      }

      if (virtualFileSystem[filePath]) {
        errorCallback(chrome.fileSystemProvider.ERROR_EXISTS);
        return;
      }

      // Create empty file entry
      virtualFileSystem[filePath] = {
        name: filePath.split("/").pop(),
        isDirectory: false,
        size: 0,
        modificationTime: Date.now(),
        mimeType: guessMimeType(filePath),
      };

      // Persist using webext-storage
      await storageMessenger.send("storage:set", {
        key: `filesystem:${filePath}`,
        value: virtualFileSystem[filePath],
      });

      successCallback();
    } catch (error) {
      console.error("Create file error:", error);
      errorCallback(chrome.fileSystemProvider.ERROR_FAILED);
    }
  },
  { fileSystemId: ["my-cloud-storage"] }
);

function guessMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    txt: "text/plain",
    json: "application/json",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    pdf: "application/pdf",
    zip: "application/zip",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}
```

### File Write Handler

```ts
// background/write-handler.ts

interface WriteState {
  [requestId: string]: {
    filePath: string;
    buffer: Uint8Array;
  };
}

const writeStates: WriteState = {};

chrome.fileSystemProvider.onWriteFileRequested.addListener(
  async (options, successCallback, errorCallback) => {
    const { fileSystemId, filePath, requestId, offset, data, mode } = options;

    console.log(`Writing to file: ${filePath}, offset: ${offset}, mode: ${mode}`);

    try {
      // mode can be "WRITE" (replace) or "APPEND"
      const isAppend = mode === chrome.fileSystemProvider.MODE_APPEND;

      if (!isAppend && offset === 0) {
        // Full write - initialize new buffer
        writeStates[requestId] = {
          filePath,
          buffer: new Uint8Array(data),
        };
      } else {
        // Append or continue writing
        if (!writeStates[requestId]) {
          errorCallback(chrome.fileSystemProvider.ERROR_INVALID_OPERATION);
          return;
        }

        const existing = writeStates[requestId].buffer;
        const newBuffer = new Uint8Array(existing.length + data.byteLength);
        newBuffer.set(existing, 0);
        newBuffer.set(new Uint8Array(data), existing.length);
        writeStates[requestId].buffer = newBuffer;
      }

      // For streaming writes, you'd finalize here
      // For simplicity, we commit on final write
      const isLastChunk = true; // Implement chunk detection
      if (isLastChunk) {
        const finalData = writeStates[requestId].buffer;
        
        // Store the file content
        fileContents[filePath] = finalData.buffer;
        
        // Update metadata
        virtualFileSystem[filePath] = {
          ...(virtualFileSystem[filePath] as object),
          size: finalData.byteLength,
          modificationTime: Date.now(),
        };

        delete writeStates[requestId];
      }

      successCallback();
    } catch (error) {
      console.error("Write file error:", error);
      errorCallback(chrome.fileSystemProvider.ERROR_FAILED);
    }
  },
  { fileSystemId: ["my-cloud-storage"] }
);
```

---

## Pattern 6: Building a Cloud Storage Connector

This pattern combines all previous patterns into a complete cloud storage connector backed by a remote API.

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Chrome OS      │────▶│  FileSystem      │────▶│  Cloud API  │
│  File Manager   │     │  Provider        │     │  Connector  │
└─────────────────┘     └──────────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  @theluckystrike │
                        │  webext-storage  │
                        └──────────────────┘
```

### Complete Cloud Connector Implementation

```ts
// background/cloud-connector.ts
import { createMessenger } from "@theluckystrike/webext-messaging";

const FILE_SYSTEM_ID = "cloud-connector";

// API Configuration
const API_BASE_URL = "https://api.example-cloud.com/v1";

interface CloudFile {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  mimeType?: string;
}

interface CloudConfig {
  accessToken: string;
  refreshToken: string;
}

// Type-safe messaging for storage operations
type CloudStorageMessages = {
  "storage:get": { request: { key: string }; response: unknown };
  "storage:set": { request: { key: string; value: unknown }; response: void };
  "storage:remove": { request: { key: string }; response: void };
};

const storageMessenger = createMessenger<CloudStorageMessages>();

class CloudFileSystemConnector {
  private fileSystemId: string;
  private config: CloudConfig | null = null;
  private cache: Map<string, CloudFile> = new Map();

  constructor(fileSystemId: string) {
    this.fileSystemId = fileSystemId;
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
    await this.mount();
    console.log("Cloud connector initialized");
  }

  private async loadConfig(): Promise<void> {
    const stored = await storageMessenger.send("storage:get", {
      key: "cloud:config",
    }) as CloudConfig | null;
    this.config = stored;
  }

  private async mount(): Promise<void> {
    await chrome.fileSystemProvider.mount({
      fileSystemId: this.fileSystemId,
      displayName: "My Cloud Storage",
    });
  }

  async syncFileList(): Promise<void> {
    if (!this.config) throw new Error("Not authenticated");

    const response = await fetch(`${API_BASE_URL}/files`, {
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const files: CloudFile[] = await response.json();
    
    // Cache file metadata
    for (const file of files) {
      this.cache.set(file.path, file);
    }

    // Persist cache
    await storageMessenger.send("storage:set", {
      key: "cloud:file-cache",
      value: Array.from(this.cache.entries()),
    });
  }

  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    if (!this.config) throw new Error("Not authenticated");

    // Read local file content
    const response = await fetch(localPath);
    const content = await response.arrayBuffer();

    // Upload to cloud
    const uploadResponse = await fetch(`${API_BASE_URL}/files${remotePath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/octet-stream",
      },
      body: content,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    // Update local cache
    await this.syncFileList();
  }
}

// Initialize the connector
const cloudConnector = new CloudFileSystemConnector(FILE_SYSTEM_ID);

// Handle background initialization
chrome.runtime.onStartup.addListener(async () => {
  await cloudConnector.initialize();
});

// Export for use in other handlers
export { cloudConnector, CloudFileSystemConnector };
```

---

## Pattern 7: Caching File Data Locally

Using `@theluckystrike/webext-storage` and IndexedDB for efficient local caching.

### Storage-Aware Caching Layer

```ts
// lib/cache/manager.ts
import { createStorage } from "@theluckystrike/webext-storage";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  maxAge: number; // milliseconds
  maxSize: number; // number of entries
}

const fileCache = createStorage<Record<string, CacheEntry<ArrayBuffer>>>("file-cache");
const metadataCache = createStorage<Record<string, CacheEntry<unknown>>>("metadata-cache");

class FileCacheManager {
  private config: CacheConfig = {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
  };

  async getCachedFile(path: string): Promise<ArrayBuffer | null> {
    const cache = await fileCache.get();
    const entry = cache[path];

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      // Cache expired
      await this.removeFromCache(path);
      return null;
    }

    return entry.data;
  }

  async setCachedFile(path: string, data: ArrayBuffer): Promise<void> {
    const cache = await fileCache.get();

    // Check size limit
    const keys = Object.keys(cache);
    if (keys.length >= this.config.maxSize) {
      // Remove oldest entry
      const oldestKey = keys.reduce((a, b) => 
        cache[a].timestamp < cache[b].timestamp ? a : b
      );
      await this.removeFromCache(oldestKey);
    }

    cache[path] = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.maxAge,
    };

    await fileCache.set(cache);
  }

  async removeFromCache(path: string): Promise<void> {
    const cache = await fileCache.get();
    delete cache[path];
    await fileCache.set(cache);
  }

  async clearCache(): Promise<void> {
    await fileCache.set({});
  }
}

export const cacheManager = new FileCacheManager();
```

### Integrated Caching with File Handlers

```ts
// background/cached-file-handler.ts
import { cacheManager } from "../lib/cache/manager";

chrome.fileSystemProvider.onReadFileRequested.addListener(
  async (options, successCallback, errorCallback) => {
    const { fileSystemId, filePath, requestId, offset } = options;

    try {
      // Try cache first
      if (offset === 0) {
        const cached = await cacheManager.getCachedFile(filePath);
        if (cached) {
          console.log(`Serving ${filePath} from cache`);
          successCallback(cached, false);
          return;
        }
      }

      // Fetch from source (API, cloud, etc.)
      const content = await fetchFromCloud(filePath);

      // Cache for future reads
      if (offset === 0) {
        await cacheManager.setCachedFile(filePath, content);
      }

      successCallback(content, false);
    } catch (error) {
      errorCallback(chrome.fileSystemProvider.ERROR_FAILED);
    }
  },
  { fileSystemId: ["my-cloud-storage"] }
);

async function fetchFromCloud(path: string): Promise<ArrayBuffer> {
  // Actual implementation would call your cloud API
  const response = await fetch(`/api/files${path}`);
  return response.arrayBuffer();
}
```

---

## Pattern 8: Error Handling and Graceful Unmounting

Proper error handling ensures a robust user experience and prevents resource leaks.

### Comprehensive Error Handler

```ts
// background/error-handler.ts

enum ProviderError {
  NOT_FOUND = "NOT_FOUND",
  SECURITY = "SECURITY",
  ABORT = "ABORT",
  NOT_A_FILE = "NOT_A_FILE",
  NOT_A_DIRECTORY = "NOT_A_DIRECTORY",
  NOT_ALLOWED = "NOT_ALLOWED",
  FAILED = "FAILED",
  IN_PROGRESS = "IN_OPERATION",
  EXISTS = "EXISTS",
  INVALID_OPERATION = "INVALID_OPERATION",
}

function mapError(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case "NOT_FOUND":
        return ProviderError.NOT_FOUND;
      case "PERMISSION_DENIED":
        return ProviderError.SECURITY;
      case "NETWORK_ERROR":
        return ProviderError.FAILED;
      default:
        return ProviderError.FAILED;
    }
  }
  return ProviderError.FAILED;
}

// Global error handler for all provider events
function setupErrorHandlers(): void {
  const events = [
    "onReadDirectoryRequested",
    "onReadFileRequested",
    "onGetMetadataRequested",
    "onWriteFileRequested",
    "onCreateFileRequested",
    "onDeleteEntryRequested",
    "onMoveEntryRequested",
    "onCopyEntryRequested",
    "onOpenFileRequested",
    "onCloseFileRequested",
  ];

  for (const eventName of events) {
    const handler = (chrome.fileSystemProvider as any)[eventName];
    if (handler?.addListener) {
      // Wrap existing listener with error handling
      const originalListeners = handler.getListeners?.() || [];
      handler.getListeners = () => originalListeners.map((wrapper: any) => ({
        ...wrapper,
        wrap: (original: Function) => (...args: any[]) => {
          const callbackIndex = args.findIndex(
            (arg: any) => typeof arg === "function" && arg.name === "successCallback"
          );
          if (callbackIndex !== -1) {
            const originalCallback = args[callbackIndex];
            args[callbackIndex] = (...cbArgs: any[]) => {
              try {
                originalCallback(...cbArgs);
              } catch (err) {
                console.error(`Error in ${eventName} success callback:`, err);
              }
            };
          }
          return original(...args);
        }
      }));
    }
  }
}
```

### Graceful Unmount Handler

```ts
// background/unmount-handler.ts
import { cacheManager } from "../lib/cache/manager";

interface UnmountState {
  isUnmounting: boolean;
  pendingOperations: number;
}

const unmountState: UnmountState = {
  isUnmounting: false,
  pendingOperations: 0,
};

chrome.fileSystemProvider.onUnmountRequested.addListener(
  async (options, successCallback, errorCallback) => {
    const { fileSystemId, requestId } = options;

    console.log(`Unmount requested for ${fileSystemId}, requestId: ${requestId}`);

    try {
      unmountState.isUnmounting = true;

      // Wait for any pending operations
      const maxWait = 5000;
      const waitStart = Date.now();
      
      while (unmountState.pendingOperations > 0) {
        if (Date.now() - waitStart > maxWait) {
          console.warn("Timeout waiting for pending operations");
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Flush caches
      await cacheManager.clearCache();

      // Close any open connections
      await closeAllConnections();

      // Clean up resources
      cleanup();

      successCallback();
      console.log("File system unmounted successfully");
    } catch (error) {
      console.error("Unmount error:", error);
      errorCallback(chrome.fileSystemProvider.ERROR_FAILED);
    } finally {
      unmountState.isUnmounting = false;
    }
  },
  { fileSystemId: ["my-cloud-storage"] }
);

async function closeAllConnections(): Promise<void> {
  // Implement connection cleanup
  console.log("Closing all connections...");
}

function cleanup(): void {
  // Clear in-memory structures
  console.log("Cleaning up resources...");
}

// Utility to track pending operations
export function addPendingOperation(): void {
  unmountState.pendingOperations++;
}

export function removePendingOperation(): void {
  unmountState.pendingOperations = Math.max(0, unmountState.pendingOperations - 1);
}

export function isUnmounting(): boolean {
  return unmountState.isUnmounting;
}
```

### Lifecycle Management

```ts
// background/lifecycle.ts

export class FileSystemLifecycle {
  private static instance: FileSystemLifecycle;
  private initialized = false;

  static getInstance(): FileSystemLifecycle {
    if (!FileSystemLifecycle.instance) {
      FileSystemLifecycle.instance = new FileSystemLifecycle();
    }
    return FileSystemLifecycle.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Register all event handlers
    this.registerHandlers();

    // Mount the file system
    await this.mount();

    this.initialized = true;
  }

  private registerHandlers(): void {
    // Import and register all handlers
    // import "./directory-handler";
    // import "./file-handler";
    // import "./metadata-handler";
    // import "./create-handler";
    // import "./write-handler";
    // import "./error-handler";
    // import "./unmount-handler";
  }

  private async mount(): Promise<void> {
    try {
      await chrome.fileSystemProvider.mount({
        fileSystemId: "my-cloud-storage",
        displayName: "Cloud Storage",
      });
    } catch (error) {
      // May already be mounted
      console.log("Mount check:", error);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await chrome.fileSystemProvider.unmount({
        fileSystemId: "my-cloud-storage",
      });
    } catch (error) {
      console.error("Shutdown error:", error);
    }
    this.initialized = false;
  }
}

// Handle extension lifecycle
chrome.runtime.onStartup.addListener(async () => {
  await FileSystemLifecycle.getInstance().initialize();
});

chrome.runtime.onSuspend.addListener(async () => {
  await FileSystemLifecycle.getInstance().shutdown();
});
```

---

## Summary Table

| Pattern | API Method | Use Case | Key Considerations |
|---------|------------|----------|---------------------|
| **1: Registering Provider** | `chrome.fileSystemProvider.mount()` | Initializing the virtual file system | Declare in manifest or mount dynamically |
| **2: Directory Listing** | `onReadDirectoryRequested` | Browsing folders | Return entries with proper metadata |
| **3: File Reading** | `onReadFileRequested` | Streaming file content | Support offset for partial reads |
| **4: Metadata** | `onGetMetadataRequested` | File info display | Include thumbnails for images |
| **5: Write Support** | `onCreateFileRequested`<br/>`onWriteFileRequested` | Creating/modifying files | Implement buffering for large writes |
| **6: Cloud Connector** | Full integration | Backing FS by remote API | Auth, sync, error recovery |
| **7: Local Caching** | `@theluckystrike/webext-storage`<br/>IndexedDB | Performance optimization | TTL, size limits, invalidation |
| **8: Error Handling** | `onUnmountRequested` | Cleanup and graceful shutdown | Wait for pending ops, flush caches |

### Quick Reference

```ts
// Essential imports
import { createMessenger } from "@theluckystrike/webext-messaging";
import { createStorage } from "@theluckystrike/webext-storage";

// Required manifest permissions
{
  "permissions": ["fileSystemProvider"],
  "file_system_provider_capabilities": {
    "configurable": true,
    "source": "network"
  }
}

// Core event handlers to implement
chrome.fileSystemProvider.onReadDirectoryRequested.addListener(handler);
chrome.fileSystemProvider.onReadFileRequested.addListener(handler);
chrome.fileSystemProvider.onGetMetadataRequested.addListener(handler);
chrome.fileSystemProvider.onCreateFileRequested.addListener(handler);
chrome.fileSystemProvider.onWriteFileRequested.addListener(handler);
chrome.fileSystemProvider.onDeleteEntryRequested.addListener(handler);
chrome.fileSystemProvider.onUnmountRequested.addListener(handler);
```

The File System Provider API opens powerful possibilities for integrating cloud storage, archives, and custom data sources directly into the operating system's file management experience. Start with basic mounting and directory listing, then progressively add write support, caching, and cloud sync as needed.
