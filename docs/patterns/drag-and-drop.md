---
layout: default
title: "Chrome Extension Drag And Drop. Best Practices"
description: "Implement drag and drop in extension UIs."
canonical_url: "https://bestchromeextensions.com/patterns/drag-and-drop/"
---

# Drag and Drop in Extensions

Overview {#overview}

Drag and drop brings natural, tactile interaction to extension UIs. sortable bookmark lists in popups, file uploads into side panels, and content script overlays that let users drag page elements into the extension. But extensions add complexity: popups live in isolated windows, content scripts share the DOM with host pages, and cross-context communication requires message passing. This guide covers practical drag-and-drop patterns for every extension surface, from basic sortable lists to accessible keyboard alternatives.

---

Extension Drag-and-Drop Architecture {#extension-drag-and-drop-architecture}

```

  Web Page (Content Script)                           
                                                      
    drag                 
   Draggable >  Drop Overlay               
   Element            (injected)                 
                         
                               message              

  Extension Contexts                                 
                                                     
                     
    Popup         Service Worker                 
   Sortable       (coordinator)                  
    Lists                      
                                         
                                 
                     Side Panel                    
                     Drop Target                   
                                 

```

Key constraints:
- Popup windows close on blur. dragging outside the popup will close it
- Content scripts share the page DOM, so drag listeners compete with host page handlers
- Cross-context drags (page to side panel) require message passing. native drag events do not cross boundaries
- File drops need careful `preventDefault()` to avoid navigating the page away

---

Pattern 1: Sortable Lists in Popup UI {#pattern-1-sortable-lists-in-popup-ui}

Build drag-and-drop reordering for lists in popup or side panel HTML. This pattern tracks the drag source and target using data attributes and swaps elements on drop:

```ts
// popup.ts
interface SortableItem {
  id: string;
  label: string;
  order: number;
}

function initSortableList(container: HTMLUListElement): void {
  let draggedItem: HTMLLIElement | null = null;

  container.addEventListener("dragstart", (e: DragEvent) => {
    const target = e.target as HTMLLIElement;
    if (!target.matches("[data-sortable-id]")) return;

    draggedItem = target;
    target.classList.add("dragging");

    // Required for Firefox. set some data to enable the drag
    e.dataTransfer!.effectAllowed = "move";
    e.dataTransfer!.setData("text/plain", target.dataset.sortableId!);
  });

  container.addEventListener("dragover", (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "move";

    const target = e.target as HTMLElement;
    const overItem = target.closest<HTMLLIElement>("[data-sortable-id]");
    if (!overItem || overItem === draggedItem) return;

    const rect = overItem.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (e.clientY < midY) {
      container.insertBefore(draggedItem!, overItem);
    } else {
      container.insertBefore(draggedItem!, overItem.nextSibling);
    }
  });

  container.addEventListener("dragend", () => {
    if (draggedItem) {
      draggedItem.classList.remove("dragging");
      draggedItem = null;
    }
    persistOrder(container);
  });
}

async function persistOrder(container: HTMLUListElement): Promise<void> {
  const items = container.querySelectorAll<HTMLLIElement>("[data-sortable-id]");
  const order: Record<string, number> = {};

  items.forEach((item, index) => {
    order[item.dataset.sortableId!] = index;
  });

  await chrome.storage.local.set({ sortOrder: order });
}

// Render items
function renderSortableList(
  container: HTMLUListElement,
  items: SortableItem[]
): void {
  container.innerHTML = "";

  items
    .sort((a, b) => a.order - b.order)
    .forEach((item) => {
      const li = document.createElement("li");
      li.draggable = true;
      li.dataset.sortableId = item.id;
      li.textContent = item.label;
      li.setAttribute("role", "listitem");
      container.appendChild(li);
    });

  initSortableList(container);
}
```

Minimal CSS for drag feedback:

```css
/* popup.css */
[data-sortable-id] {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin: 4px 0;
  cursor: grab;
  transition: opacity 0.2s, box-shadow 0.2s;
}

[data-sortable-id].dragging {
  opacity: 0.4;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

[data-sortable-id]:active {
  cursor: grabbing;
}
```

---

Pattern 2: File Drop Into Extension Popup {#pattern-2-file-drop-into-extension-popup}

Accept file drops in the popup for processing. image conversion, text extraction, config imports:

```ts
// popup.ts
interface FileDropOptions {
  accept?: string[];       // MIME types: ["image/png", "application/json"]
  maxSizeMB?: number;
  onFile: (file: File, content: ArrayBuffer | string) => void;
  onError: (message: string) => void;
}

function initFileDrop(
  dropZone: HTMLElement,
  options: FileDropOptions
): void {
  const { accept, maxSizeMB = 10, onFile, onError } = options;

  // Prevent default on the entire popup to stop navigation on missed drops
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => e.preventDefault());

  dropZone.addEventListener("dragenter", (e: DragEvent) => {
    e.preventDefault();

    // Validate that the drag contains files before showing feedback
    const hasFiles = Array.from(e.dataTransfer?.types ?? []).includes("Files");
    if (!hasFiles) return;

    dropZone.classList.add("drop-active");
  });

  dropZone.addEventListener("dragleave", (e: DragEvent) => {
    // Only remove class when leaving the drop zone, not entering children
    const related = e.relatedTarget as Node | null;
    if (related && dropZone.contains(related)) return;
    dropZone.classList.remove("drop-active");
  });

  dropZone.addEventListener("drop", async (e: DragEvent) => {
    e.preventDefault();
    dropZone.classList.remove("drop-active");

    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return;

    for (const file of files) {
      // MIME type validation
      if (accept && !accept.some((t) => file.type.match(t))) {
        onError(`Unsupported file type: ${file.type || "unknown"}`);
        continue;
      }

      // Size validation
      if (file.size > maxSizeMB * 1024 * 1024) {
        onError(`File too large: ${file.name} (max ${maxSizeMB}MB)`);
        continue;
      }

      try {
        const content = file.type.startsWith("text/")
          ? await file.text()
          : await file.arrayBuffer();
        onFile(file, content);
      } catch {
        onError(`Failed to read file: ${file.name}`);
      }
    }
  });
}

// Usage: import a JSON config
const dropZone = document.getElementById("drop-zone")!;

initFileDrop(dropZone, {
  accept: ["application/json"],
  maxSizeMB: 5,
  onFile: async (file, content) => {
    const config = JSON.parse(content as string);
    await chrome.storage.local.set({ userConfig: config });
    showToast(`Imported ${file.name}`);
  },
  onError: (msg) => showToast(msg, "error"),
});
```

---

Pattern 3: Content Script Drag-and-Drop Overlays {#pattern-3-content-script-drag-and-drop-overlays}

Inject a drop overlay onto web pages that captures dragged content. This pattern creates a floating overlay that appears when the user drags items, and relays the dropped data to the service worker:

```ts
// content-script.ts
function createDropOverlay(): HTMLElement {
  const overlay = document.createElement("div");
  overlay.id = "ext-drop-overlay";

  // Shadow DOM isolates styles from the host page
  const shadow = overlay.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    :host {
      position: fixed;
      top: 0;
      right: 0;
      width: 300px;
      height: 100vh;
      z-index: 2147483647;
      pointer-events: none;
      display: none;
    }
    :host(.visible) {
      display: block;
      pointer-events: auto;
    }
    .drop-target {
      width: 100%;
      height: 100%;
      background: rgba(66, 133, 244, 0.1);
      border-left: 3px solid #4285f4;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, sans-serif;
      font-size: 14px;
      color: #4285f4;
    }
    .drop-target.over {
      background: rgba(66, 133, 244, 0.25);
    }
  `;

  const target = document.createElement("div");
  target.className = "drop-target";
  target.textContent = "Drop here to save";

  shadow.appendChild(style);
  shadow.appendChild(target);
  document.body.appendChild(overlay);

  return overlay;
}

function initContentDragListener(): void {
  const overlay = createDropOverlay();
  const target = overlay.shadowRoot!.querySelector(".drop-target")!;

  // Show overlay when a drag enters the page
  let dragCounter = 0;

  document.addEventListener("dragenter", (e: DragEvent) => {
    dragCounter++;
    if (dragCounter === 1) {
      overlay.classList.add("visible");
    }
  });

  document.addEventListener("dragleave", () => {
    dragCounter--;
    if (dragCounter === 0) {
      overlay.classList.remove("visible");
      target.classList.remove("over");
    }
  });

  document.addEventListener("drop", () => {
    dragCounter = 0;
    overlay.classList.remove("visible");
    target.classList.remove("over");
  });

  // Handle drops on the overlay target
  target.addEventListener("dragover", (e: Event) => {
    const de = e as DragEvent;
    de.preventDefault();
    de.stopPropagation();
    de.dataTransfer!.dropEffect = "copy";
    target.classList.add("over");
  });

  target.addEventListener("dragleave", () => {
    target.classList.remove("over");
  });

  target.addEventListener("drop", (e: Event) => {
    const de = e as DragEvent;
    de.preventDefault();
    de.stopPropagation();

    const data = extractDragData(de);
    chrome.runtime.sendMessage({ type: "CONTENT_DROP", payload: data });
  });
}

interface DragPayload {
  text?: string;
  url?: string;
  html?: string;
}

function extractDragData(e: DragEvent): DragPayload {
  const dt = e.dataTransfer!;
  return {
    text: dt.getData("text/plain") || undefined,
    url: dt.getData("text/uri-list") || undefined,
    html: dt.getData("text/html") || undefined,
  };
}

initContentDragListener();
```

---

Pattern 4: Cross-Context Drag (Page to Side Panel) {#pattern-4-cross-context-drag-page-to-side-panel}

Native HTML drag events cannot cross extension context boundaries. This pattern bridges the gap by using `chrome.runtime` messaging to relay drag data from a content script to the side panel:

```ts
// shared/types.ts
interface CrossContextDragMessage {
  type: "DRAG_START" | "DRAG_DATA" | "DRAG_END";
  payload?: {
    text?: string;
    url?: string;
    sourceTabId?: number;
  };
}

// content-script.ts. detect drags and relay via messaging
document.addEventListener("dragstart", (e: DragEvent) => {
  const selection = document.getSelection()?.toString();
  const link = (e.target as HTMLElement).closest("a");

  chrome.runtime.sendMessage({
    type: "DRAG_START",
    payload: {
      text: selection || e.dataTransfer?.getData("text/plain"),
      url: link?.href,
    },
  } satisfies CrossContextDragMessage);
});

document.addEventListener("dragend", () => {
  chrome.runtime.sendMessage({
    type: "DRAG_END",
  } satisfies CrossContextDragMessage);
});

// background.ts. relay to the side panel
chrome.runtime.onMessage.addListener(
  (msg: CrossContextDragMessage, sender) => {
    if (msg.type === "DRAG_START" || msg.type === "DRAG_END") {
      // Forward to all extension views (side panel, popup, etc.)
      chrome.runtime
        .sendMessage({
          ...msg,
          payload: {
            ...msg.payload,
            sourceTabId: sender.tab?.id,
          },
        })
        .catch(() => {
          // Side panel may not be open. ignore
        });
    }
  }
);

// side-panel.ts. receive and display
const dropIndicator = document.getElementById("drop-indicator")!;
const collectedItems = document.getElementById("collected-items")!;

chrome.runtime.onMessage.addListener((msg: CrossContextDragMessage) => {
  switch (msg.type) {
    case "DRAG_START":
      dropIndicator.classList.add("receiving");
      dropIndicator.textContent = msg.payload?.text
        ? `"${msg.payload.text.slice(0, 50)}..."`
        : "Incoming item...";
      break;

    case "DRAG_END":
      dropIndicator.classList.remove("receiving");
      if (msg.payload?.text || msg.payload?.url) {
        addCollectedItem(msg.payload);
      }
      break;
  }
});

function addCollectedItem(
  payload: CrossContextDragMessage["payload"]
): void {
  const li = document.createElement("li");
  if (payload?.url) {
    const a = document.createElement("a");
    a.href = payload.url;
    a.textContent = payload.text || payload.url;
    a.target = "_blank";
    li.appendChild(a);
  } else {
    li.textContent = payload?.text ?? "";
  }
  collectedItems.appendChild(li);
}
```

> Limitation: You cannot detect the actual "drop" moment inside the side panel from a content script drag. The `dragend` event fires when the user releases the mouse, and you relay whatever data was captured at `dragstart`. For true drop semantics, instruct users to click a "Confirm" button in the side panel after the item appears.

---

Pattern 5: Custom Drag Previews and Ghost Images {#pattern-5-custom-drag-previews-and-ghost-images}

Replace the browser's default translucent clone with a custom drag image for better visual communication:

```ts
// popup.ts
function setCustomDragPreview(
  e: DragEvent,
  options: {
    text: string;
    icon?: string;    // emoji or text character
    bgColor?: string;
    width?: number;
  }
): void {
  const { text, icon, bgColor = "#4285f4", width = 200 } = options;

  // Create an offscreen element for the drag image
  const preview = document.createElement("div");
  preview.style.cssText = `
    position: absolute;
    top: -1000px;
    left: -1000px;
    width: ${width}px;
    padding: 8px 12px;
    background: ${bgColor};
    color: white;
    border-radius: 6px;
    font-family: system-ui, sans-serif;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;
  preview.textContent = icon ? `${icon} ${text}` : text;

  document.body.appendChild(preview);

  // Position the cursor at the left-center of the preview
  e.dataTransfer!.setDragImage(preview, 16, preview.offsetHeight / 2);

  // Clean up after the browser captures the snapshot
  requestAnimationFrame(() => {
    document.body.removeChild(preview);
  });
}

// Canvas-based drag image for pixel-perfect rendering
function setCanvasDragPreview(
  e: DragEvent,
  options: { text: string; count?: number }
): void {
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 220 * dpr;
  canvas.height = 40 * dpr;
  canvas.style.width = "220px";
  canvas.style.height = "40px";

  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Draw rounded rect background
  ctx.fillStyle = "#1a73e8";
  ctx.beginPath();
  ctx.roundRect(0, 0, 220, 40, 8);
  ctx.fill();

  // Draw text
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 13px system-ui";
  ctx.fillText(options.text, 12, 25);

  // Draw count badge
  if (options.count && options.count > 1) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(200, 20, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a73e8";
    ctx.font = "600 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(String(options.count), 200, 24);
  }

  // Must be in the DOM for setDragImage to work
  document.body.appendChild(canvas);
  canvas.style.position = "absolute";
  canvas.style.top = "-1000px";

  e.dataTransfer!.setDragImage(canvas, 16, 20);

  requestAnimationFrame(() => document.body.removeChild(canvas));
}
```

---

Pattern 6: Drop Zone Visual Feedback and Validation {#pattern-6-drop-zone-visual-feedback-and-validation}

Provide clear visual indicators for valid, invalid, and active drop states. This pattern validates drag contents before the user drops, using the `dataTransfer.types` array:

```ts
// shared/drop-zone.ts
type DropZoneState = "idle" | "valid" | "invalid" | "over";

interface DropZoneConfig {
  element: HTMLElement;
  acceptTypes: string[];       // e.g., ["Files", "text/uri-list"]
  acceptExtensions?: string[]; // e.g., [".json", ".csv"]
  onDrop: (e: DragEvent) => void;
  onStateChange?: (state: DropZoneState) => void;
}

function createDropZone(config: DropZoneConfig): () => void {
  const { element, acceptTypes, acceptExtensions, onDrop, onStateChange } =
    config;

  let enterCount = 0;

  function setState(state: DropZoneState): void {
    element.dataset.dropState = state;
    onStateChange?.(state);
  }

  function isValidDrag(e: DragEvent): boolean {
    const types = Array.from(e.dataTransfer?.types ?? []);
    return acceptTypes.some((t) => types.includes(t));
  }

  function handleDragEnter(e: DragEvent): void {
    e.preventDefault();
    enterCount++;
    if (enterCount === 1) {
      setState(isValidDrag(e) ? "valid" : "invalid");
    }
  }

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (isValidDrag(e)) {
      e.dataTransfer!.dropEffect = "copy";
      setState("over");
    } else {
      e.dataTransfer!.dropEffect = "none";
    }
  }

  function handleDragLeave(e: DragEvent): void {
    enterCount--;
    if (enterCount === 0) {
      setState("idle");
    }
  }

  function handleDrop(e: DragEvent): void {
    e.preventDefault();
    enterCount = 0;
    setState("idle");

    if (!isValidDrag(e)) return;

    // Validate file extensions if specified
    if (acceptExtensions && e.dataTransfer?.files.length) {
      const files = Array.from(e.dataTransfer.files);
      const allValid = files.every((f) =>
        acceptExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
      );
      if (!allValid) return;
    }

    onDrop(e);
  }

  element.addEventListener("dragenter", handleDragEnter);
  element.addEventListener("dragover", handleDragOver);
  element.addEventListener("dragleave", handleDragLeave);
  element.addEventListener("drop", handleDrop);

  // Return cleanup function
  return () => {
    element.removeEventListener("dragenter", handleDragEnter);
    element.removeEventListener("dragover", handleDragOver);
    element.removeEventListener("dragleave", handleDragLeave);
    element.removeEventListener("drop", handleDrop);
  };
}
```

CSS states driven by `data-drop-state`:

```css
[data-drop-state="idle"] {
  border: 2px dashed #ccc;
  background: transparent;
}

[data-drop-state="valid"] {
  border: 2px dashed #4caf50;
  background: rgba(76, 175, 80, 0.05);
}

[data-drop-state="invalid"] {
  border: 2px dashed #f44336;
  background: rgba(244, 67, 54, 0.05);
  cursor: not-allowed;
}

[data-drop-state="over"] {
  border: 2px solid #4caf50;
  background: rgba(76, 175, 80, 0.12);
  transform: scale(1.01);
  transition: all 0.15s ease;
}
```

---

Pattern 7: Drag Data Types. Text, URLs, Files, and Custom MIME {#pattern-7-drag-data-types-text-urls-files-and-custom-mime}

The `DataTransfer` API supports multiple data formats simultaneously. Set multiple types on drag so different drop targets can consume the most appropriate format:

```ts
// popup.ts. setting multiple data types on a draggable item
interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  tags: string[];
}

function initBookmarkDrag(
  element: HTMLElement,
  bookmark: BookmarkItem
): void {
  element.draggable = true;

  element.addEventListener("dragstart", (e: DragEvent) => {
    const dt = e.dataTransfer!;
    dt.effectAllowed = "copyMove";

    // Plain text. works everywhere
    dt.setData("text/plain", bookmark.url);

    // URL. recognized by browsers and OS drop targets
    dt.setData("text/uri-list", bookmark.url);

    // Rich HTML. pastes nicely into rich text editors
    dt.setData(
      "text/html",
      `<a href="${bookmark.url}">${bookmark.title}</a>`
    );

    // Custom MIME. only your extension understands this
    dt.setData(
      "application/x-ext-bookmark",
      JSON.stringify(bookmark)
    );
  });
}

// Reading multiple types on drop
function handleDrop(e: DragEvent): void {
  e.preventDefault();
  const dt = e.dataTransfer!;

  // Try custom type first, fall back to simpler types
  const custom = dt.getData("application/x-ext-bookmark");
  if (custom) {
    const bookmark: BookmarkItem = JSON.parse(custom);
    console.log("Full bookmark data:", bookmark);
    return;
  }

  const url = dt.getData("text/uri-list");
  if (url) {
    console.log("Got URL:", url);
    return;
  }

  const text = dt.getData("text/plain");
  if (text) {
    console.log("Got plain text:", text);
    return;
  }

  // Handle dropped files
  if (dt.files.length > 0) {
    for (const file of Array.from(dt.files)) {
      console.log("Got file:", file.name, file.type, file.size);
    }
  }
}
```

Data type cheat sheet:

| Type | Set via | Read via | Use case |
|------|---------|----------|----------|
| `text/plain` | `setData("text/plain", ...)` | `getData("text/plain")` | Universal fallback |
| `text/uri-list` | `setData("text/uri-list", ...)` | `getData("text/uri-list")` | URLs, recognized by OS |
| `text/html` | `setData("text/html", ...)` | `getData("text/html")` | Rich content with formatting |
| `Files` | User drags from OS | `e.dataTransfer.files` | File uploads |
| `application/x-*` | `setData("application/x-myapp", ...)` | `getData("application/x-myapp")` | Custom extension data |

> Security note: During `dragover`, you can inspect `dataTransfer.types` (the list of MIME types) but you cannot read the actual data values. Data is only accessible inside the `drop` handler. This is a browser security restriction.

---

Pattern 8: Accessible Drag-and-Drop With Keyboard Alternatives {#pattern-8-accessible-drag-and-drop-with-keyboard-alternatives}

Drag-and-drop is inherently mouse-centric. Every drag interaction must have a keyboard-accessible alternative for users who rely on assistive technology:

```ts
// accessible-sortable.ts
interface AccessibleSortableOptions {
  container: HTMLElement;
  itemSelector: string;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

function initAccessibleSortable(options: AccessibleSortableOptions): void {
  const { container, itemSelector, onReorder } = options;
  let activeItem: HTMLElement | null = null;
  let isReordering = false;

  function getItems(): HTMLElement[] {
    return Array.from(container.querySelectorAll(itemSelector));
  }

  function announceToScreenReader(message: string): void {
    let announcer = document.getElementById("sr-announcer");
    if (!announcer) {
      announcer = document.createElement("div");
      announcer.id = "sr-announcer";
      announcer.setAttribute("role", "status");
      announcer.setAttribute("aria-live", "assertive");
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.cssText = `
        position: absolute;
        width: 1px; height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
      `;
      document.body.appendChild(announcer);
    }
    announcer.textContent = message;
  }

  container.addEventListener("keydown", (e: KeyboardEvent) => {
    const target = (e.target as HTMLElement).closest(
      itemSelector
    ) as HTMLElement | null;
    if (!target) return;

    const items = getItems();
    const index = items.indexOf(target);

    // Space or Enter: toggle reorder mode
    if (e.key === " " || e.key === "Enter") {
      if (!isReordering) {
        e.preventDefault();
        isReordering = true;
        activeItem = target;
        target.classList.add("reordering");
        target.setAttribute("aria-grabbed", "true");
        announceToScreenReader(
          `${target.textContent} grabbed. Use arrow keys to move, Space to drop.`
        );
      } else if (activeItem === target) {
        e.preventDefault();
        isReordering = false;
        target.classList.remove("reordering");
        target.setAttribute("aria-grabbed", "false");
        announceToScreenReader(`${target.textContent} dropped.`);
        activeItem = null;
      }
      return;
    }

    // Escape: cancel reorder
    if (e.key === "Escape" && isReordering) {
      e.preventDefault();
      isReordering = false;
      activeItem?.classList.remove("reordering");
      activeItem?.setAttribute("aria-grabbed", "false");
      announceToScreenReader("Reorder cancelled.");
      activeItem = null;
      return;
    }

    // Arrow keys: move item when in reorder mode
    if (isReordering && activeItem) {
      if (e.key === "ArrowUp" && index > 0) {
        e.preventDefault();
        container.insertBefore(activeItem, items[index - 1]);
        activeItem.focus();
        onReorder(index, index - 1);
        announceToScreenReader(
          `Moved to position ${index} of ${items.length}.`
        );
      } else if (e.key === "ArrowDown" && index < items.length - 1) {
        e.preventDefault();
        container.insertBefore(activeItem, items[index + 1].nextSibling);
        activeItem.focus();
        onReorder(index, index + 1);
        announceToScreenReader(
          `Moved to position ${index + 2} of ${items.length}.`
        );
      }
    }
  });

  // Set ARIA attributes on items
  function setupAria(): void {
    const items = getItems();
    items.forEach((item, index) => {
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "listitem");
      item.setAttribute("aria-grabbed", "false");
      item.setAttribute(
        "aria-label",
        `${item.textContent}, position ${index + 1} of ${items.length}. ` +
        `Press Space to reorder.`
      );
    });
    container.setAttribute("role", "list");
    container.setAttribute(
      "aria-label",
      "Sortable list. Navigate with Tab, reorder with Space and arrow keys."
    );
  }

  setupAria();
}
```

Provide visible keyboard instructions alongside the drag-enabled list:

```ts
// popup.ts
function renderKeyboardHelp(container: HTMLElement): void {
  const help = document.createElement("details");
  help.innerHTML = `
    <summary>Keyboard shortcuts</summary>
    <dl>
      <dt><kbd>Tab</kbd></dt>
      <dd>Navigate between items</dd>
      <dt><kbd>Space</kbd> / <kbd>Enter</kbd></dt>
      <dd>Grab or drop the focused item</dd>
      <dt><kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd></dt>
      <dd>Move the grabbed item</dd>
      <dt><kbd>Escape</kbd></dt>
      <dd>Cancel reorder</dd>
    </dl>
  `;
  container.insertAdjacentElement("beforebegin", help);
}
```

---

Summary {#summary}

| Pattern | Context | Key Technique |
|---------|---------|---------------|
| Sortable lists | Popup / Side Panel | `dragstart` + `dragover` insertion + `dragend` persist |
| File drop | Popup / Side Panel | Global `preventDefault()` + MIME and size validation |
| Content script overlay | Content Script | Shadow DOM overlay + message to service worker |
| Cross-context drag | Content Script + Side Panel | `dragstart` relay via `chrome.runtime.sendMessage` |
| Custom drag preview | Any UI | `setDragImage()` with offscreen element or canvas |
| Drop zone feedback | Any UI | `data-drop-state` attribute + CSS states |
| Multiple data types | Any UI | Set `text/plain`, `text/uri-list`, `text/html`, custom MIME |
| Keyboard accessible | Popup / Side Panel | `aria-grabbed` + arrow key reorder + live region announcements |

Common Pitfalls {#common-pitfalls}

1. Popup closes on external drag. You cannot drag items out of a popup. If you need cross-boundary drag, use the side panel instead.
2. Missing `preventDefault()`. Failing to prevent default on `dragover` means `drop` will never fire. Always call `e.preventDefault()` in your `dragover` handler.
3. `dragenter`/`dragleave` bubbling. These events fire for every child element. Use a counter (`dragCounter++`/`dragCounter--`) to track the real enter/leave boundary.
4. Cannot read data during `dragover`. `dataTransfer.getData()` returns empty strings in `dragover` for security. Only `dataTransfer.types` is available.
5. Firefox requires `setData()`. Firefox will not start a drag unless you call `e.dataTransfer.setData()` with at least one value in the `dragstart` handler.

Related Resources {#related-resources}

- [MDN Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [WAI-ARIA Drag-and-Drop](https://www.w3.org/WAI/ARIA/apg/patterns/drag-and-drop/)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
