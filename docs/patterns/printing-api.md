---
layout: default
title: "Chrome Extension Printing Api — Best Practices"
description: "Handle printing from Chrome extensions with the Printing API."
canonical_url: "https://theluckystrike.github.io/chrome-extension-guide/patterns/printing-api/"
---

# Printing API Patterns

## Overview {#overview}

Chrome extensions can leverage the Printing API to enable powerful document printing capabilities. This guide covers eight practical patterns for triggering prints, generating print-friendly content, injecting print functionality into web pages, creating PDFs, applying custom print styles, printing selections, batch printing, and implementing custom print previews.

---

## Required Permissions {#required-permissions}

```jsonc
// manifest.json
{
  "permissions": ["printing", "printingRead", "pageCapture", "offscreen"],
  "host_permissions": ["<all_urls>"]
}
```

| Permission | Purpose |
|------------|---------|
| `printing` | Submit print jobs to printers (ChromeOS only) |
| `printingRead` | Read printer status and job info |
| `pageCapture` | Save pages as MHTML for PDF generation |
| `offscreen` | Use offscreen documents for canvas operations |

---

## Pattern 1: Basic Print Trigger {#pattern-1-basic-print-trigger}

Different extension contexts require different approaches to trigger printing.

### Extension Popup, Options, or Side Panel {#extension-popup-options-or-side-panel}

```ts
// popup.ts
function openPrintableVersion(): void {
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Document</title>
        <style>
          @media print {
            body { font-size: 12pt; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>My Report</h1>
        <p>Content to print...</p>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `;
  const blob = new Blob([printContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
document.getElementById("print-btn")!.addEventListener("click", openPrintableVersion);
```

### Background Printing (ChromeOS) {#background-printing-chromeos}

```ts
// background.ts
interface PrintJobRequest {
  ticket: {
    version: string;
    printTicket: {
      collate: boolean;
      color: { type: "STANDARD_COLOR" | "STANDARD_MONOCHROME" };
      duplex: { type: "NO_DUPLEX" | "LONG_EDGE" | "SHORT_EDGE" };
      pageOrientation: { type: "PORTRAIT" | "LANDSCAPE" | "AUTO" };
      copies: number;
    };
  };
  content: string;
}

async function submitPrintJob(pdfBase64: string, printerId: string): Promise<{ jobId: string }> {
  const printJob: PrintJobRequest = {
    ticket: { version: "1.0", printTicket: { collate: true, color: { type: "STANDARD_COLOR" }, duplex: { type: "LONG_EDGE" }, pageOrientation: { type: "PORTRAIT" }, copies: 1 } },
    content: pdfBase64,
  };
  return new Promise((resolve, reject) => {
    chrome.printing.submitJob({ job: { ...printJob, printerId, title: 'Print Job', contentType: 'application/pdf', document: new Blob([Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))], { type: 'application/pdf' }) } }, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (response?.jobId) resolve({ jobId: response.jobId });
      else reject(new Error("Print job submission failed"));
    });
  });
}
```

### Print-Specific CSS {#print-specific-css}

```css
/* styles/print.css */
@media print {
  .toolbar, .sidebar, .button-row { display: none !important; }
  body { margin: 0; padding: 0; font-size: 12pt; line-height: 1.5; color: #000; }
  .page-break { page-break-after: always; }
  .print-only { display: block !important; }
}
.print-only { display: none; }
```

---

## Pattern 2: Print-Friendly Page Generation {#pattern-2-print-friendly-page-generation}

Create clean, print-optimized HTML documents by stripping navigation, ads, and interactive elements.

```ts
// utils/print-generator.ts
interface PrintOptions {
  title: string;
  date?: Date;
  header?: string;
  footer?: string;
  showPageNumbers?: boolean;
}

function generatePrintableHTML(content: string, options: PrintOptions): string {
  const { title, date = new Date(), header, footer, showPageNumbers = true } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><title>${title}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12pt; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .print-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 1cm; margin-bottom: 1cm; }
    .print-header h1 { margin: 0 0 0.5cm 0; font-size: 24pt; }
    .print-content img { max-width: 100%; height: auto; page-break-inside: avoid; }
    .print-content table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
    .print-content th, .print-content td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .print-content th { background-color: #f5f5f5; }
    .print-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10pt; color: #666; padding: 0.5cm; border-top: 1px solid #ddd; }
    @media print { .no-print { display: none !important; } .page-break { page-break-after: always; } .no-break { page-break-inside: avoid; } }
    @media screen { body { max-width: 800px; margin: 0 auto; padding: 20px; } }
  </style>
</head>
<body>
  ${header ? `<div class="print-header"><h1>${header}</h1><div class="date">${date.toLocaleDateString()}</div></div>` : ""}
  <div class="print-content">${content}</div>
  ${footer || showPageNumbers ? `<div class="print-footer">${footer || ""}${showPageNumbers ? `<span class="page-number">Page <span class="page-num"></span> of <span class="page-count"></span></span>` : ""}</div>` : ""}
  <script>document.addEventListener("DOMContentLoaded", () => window.print());</script>
</body>
</html>`;
}

async function openPrintPreview(content: string, options: PrintOptions): Promise<void> {
  const printHTML = generatePrintableHTML(content, options);
  const blob = new Blob([printHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");
  if (!printWindow) throw new Error("Failed to open print preview");
  printWindow.addEventListener("load", () => URL.revokeObjectURL(url));
}
```

---

## Pattern 3: Content Script Print Injection {#pattern-3-content-script-print-injection}

Inject a "Print this page" button into web pages and generate clean printable versions.

```ts
// content-script.ts
function injectPrintButton(options: { position?: string; label?: string } = {}): void {
  const { position = "bottom-right", label = "Print" } = options;
  if (document.getElementById("ext-print-button")) return;

  const button = document.createElement("button");
  button.id = "ext-print-button";
  button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg><span>${label}</span>`;
  button.style.cssText = `position:fixed;z-index:999999;padding:10px 16px;background:#4a90d9;color:white;border:none;border-radius:6px;cursor:pointer;font-family:sans-serif;font-size:14px;display:flex;align-items:center;gap:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);`;
  const [vertical, horizontal] = position.split("-");
  button.style[vertical as "top" | "bottom"] = "20px";
  button.style[horizontal as "left" | "right"] = "20px";
  button.addEventListener("click", handlePrintClick);
  document.body.appendChild(button);
}

async function handlePrintClick(): Promise<void> {
  const cleanContent = await generateCleanPrintableContent();
  chrome.runtime.sendMessage({ type: "OPEN_PRINT_PREVIEW", payload: { content: cleanContent, title: document.title, url: window.location.href } });
}

async function generateCleanPrintableContent(): Promise<string> {
  const clone = document.cloneNode(true) as Document;
  const removeSelectors = ["script", "style", "nav", "header", "footer", "aside", ".sidebar", ".advertisement", ".ad", ".social-share", ".comments"];
  removeSelectors.forEach(selector => clone.querySelectorAll(selector).forEach(el => el.remove()));
  const mainContent = clone.querySelector("main") || clone.querySelector("[role='main']") || clone.querySelector(".content") || clone.body;
  return mainContent.innerHTML;
}

// background.ts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "OPEN_PRINT_PREVIEW") {
    const { content, title, url } = message.payload;
    const printHTML = generatePrintableHTML(content, { title, header: title, footer: `Source: ${url}`, showPageNumbers: true });
    chrome.tabs.create({ url: URL.createObjectURL(new Blob([printHTML], { type: "text/html" })), active: true });
    sendResponse({ success: true });
  }
  return true;
});
```

---

## Pattern 4: PDF Generation Patterns {#pattern-4-pdf-generation-patterns}

### Using chrome.pageCapture.saveAsMHTML {#using-chromepagecapturesaveasmhtml}

```ts
// content-script.ts
async function capturePageAsMHTML(tabId: number): Promise<Blob | null> {
  return new Promise(resolve => chrome.pageCapture.saveAsMHTML({ tabId }, blob => resolve(blob)));
}

// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CAPTURE_PAGE_AS_PDF") {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse({ error: "No tab ID" }); return; }
    chrome.pageCapture.saveAsMHTML({ tabId }, blob => {
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ success: true, data: (reader.result as string).split(",")[1] });
        reader.readAsDataURL(blob);
      } else sendResponse({ error: "Failed to capture" });
    });
    return true;
  }
});
```

### Canvas-to-PDF via Offscreen Document {#canvas-to-pdf-via-offscreen-document}

```ts
// background.ts
async function createOffscreenForPDF(): Promise<void> {
  const contexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT] });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({ url: "offscreen.html", reasons: [chrome.offscreen.Reason.DOM_PARSER], justification: "Generate PDF" });
  }
}

async function generatePDFFromCanvas(canvasDataUrl: string): Promise<Blob> {
  await createOffscreenForPDF();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "GENERATE_PDF", payload: { canvasDataUrl } }, response => {
      if (response?.blob) resolve(response.blob);
      else reject(new Error(response?.error || "Failed"));
    });
  });
}
```

### Using jsPDF in Extension Context {#using-jspdf-in-extension-context}

```ts
// offscreen.ts
import jsPDF from "jspdf";

async function createPDF(content: string, options: { title: string; format?: string } = { title: "Document", format: "a4" }): Promise<Blob> {
  const doc = new jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: options.format as any || "a4" });
  doc.setProperties({ title: options.title, author: "Chrome Extension", creator: "Chrome Extension" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = margin;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = content;
  const paragraphs = tempDiv.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li");

  for (const p of paragraphs) {
    const text = p.textContent || "";
    const tagName = p.tagName.toLowerCase();
    if (tagName === "h1") { doc.setFontSize(24); doc.setFont("helvetica", "bold"); yPosition += 10; }
    else if (tagName === "h2") { doc.setFontSize(18); doc.setFont("helvetica", "bold"); yPosition += 6; }
    else { doc.setFontSize(11); doc.setFont("helvetica", "normal"); yPosition += 2; }
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * 5;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(128);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
  }
  return doc.output("blob");
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GENERATE_PDF") {
    createPDF(message.payload.content, message.payload.options)
      .then(blob => { const r = new FileReader(); r.onloadend = () => sendResponse({ success: true, blob }); r.readAsDataURL(blob); })
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});
```

---

## Pattern 5: Custom Print Styles {#pattern-5-custom-print-styles}

Apply comprehensive print styles to hide controls, show print-only content, and manage page breaks.

```css
/* styles/print.css */
@media print {
  :root { --print-font-size: 12pt; --print-line-height: 1.5; --print-margin: 2cm; }
  * { background: white !important; color: black !important; box-shadow: none !important; text-shadow: none !important; }
  .button, .btn, button, .toolbar, .navigation, .menu, .modal { display: none !important; }
  .print-only { display: block !important; }
  .print-only-inline { display: inline !important; }
  body { font-size: var(--print-font-size); line-height: var(--print-line-height); margin: 0; padding: var(--print-margin); }
  h1, h2, h3, h4, h5, h6 { page-break-after: avoid; page-break-inside: avoid; }
  h1 { font-size: 24pt; } h2 { font-size: 18pt; } h3 { font-size: 14pt; }
  a[href]:after { content: " (" attr(href) ")"; font-size: 9pt; color: #666; }
  a[href^="#"]:after, a[href^="javascript"]:after { content: ""; }
  img { max-width: 100% !important; page-break-inside: avoid; }
  table { border-collapse: collapse !important; }
  table, th, td { border: 1px solid #333 !important; }
  th { background-color: #eee !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  pre, code { white-space: pre-wrap !important; word-wrap: break-word !important; }
}

.page-break-before { page-break-before: always; }
.page-break-after { page-break-after: always; }
.no-break { page-break-inside: avoid; }
```

```ts
// utils/print-styles.ts
function setPageBreak(element: HTMLElement, position: "before" | "after" | "inside", type: "auto" | "always" | "avoid" | "left" | "right"): void {
  const propertyMap = { before: "pageBreakBefore", after: "pageBreakAfter", inside: "pageBreakInside" };
  element.style[propertyMap[position] as any] = type;
}
```

---

## Pattern 6: Print Selection Only {#pattern-6-print-selection-only}

Capture user selection and generate printable documents from selected content.

```ts
// content-script.ts
interface SelectionInfo { text: string; html: string; range: Range | null; rects: DOMRect[]; }

function getSelectionInfo(): SelectionInfo | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return null;
  const text = selection.toString();
  const html = getSelectionHTML(selection);
  const rects = Array.from(range.getClientRects());
  return { text, html, range, rects };
}

function getSelectionHTML(selection: Selection): string {
  const container = document.createElement("div");
  container.appendChild(selection.getRangeAt(0).cloneContents());
  return container.innerHTML;
}

function createPrintableFromSelection(): string | null {
  const selectionInfo = getSelectionInfo();
  if (!selectionInfo || !selectionInfo.text.trim()) return null;
  const { text, html } = selectionInfo;
  return `<div class="selection-content">
    <div class="selection-header"><h2>Selected Content</h2><p class="selection-source">Source: <a href="${window.location.href}">${window.location.href}</a></p><p class="selection-date">Selected: ${new Date().toLocaleString()}</p></div>
    <div class="selection-body">${html || `<pre>${text}</pre>`}</div>
    <div class="selection-footer"><p>Total characters: ${text.length}</p></div>
    <style>.selection-content{font-family:sans-serif;padding:20px}.selection-header{border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px}.selection-header h2{margin:0 0 10px;font-size:20px}.selection-source,.selection-date{margin:5px 0;font-size:12px;color:#666}.selection-body{font-size:12pt;line-height:1.6}.selection-body img{max-width:100%}.selection-footer{margin-top:20px;padding-top:15px;border-top:1px solid #ddd;font-size:11px;color:#666}pre{white-space:pre-wrap;word-wrap:break-word;background:#f5f5f5;padding:10px;border-radius:4px}</style>
  </div>`;
}

document.addEventListener("mouseup", () => {
  setTimeout(() => {
    const hasSelection = !window.getSelection()?.isCollapsed;
    chrome.runtime.sendMessage({ type: "SELECTION_CHANGED", payload: { hasSelection } });
  }, 100);
});
```

```ts
// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PRINT_SELECTION") {
    chrome.tabs.sendMessage(sender.tab!.id!, { type: "GET_SELECTION" }, response => {
      if (response?.content) {
        const printHTML = generatePrintableHTML(response.content, { title: "Selected Content", header: "Selected Content", showPageNumbers: true });
        chrome.tabs.create({ url: URL.createObjectURL(new Blob([printHTML], { type: "text/html" })), active: true });
        sendResponse({ success: true });
      } else sendResponse({ error: "No selection" });
    });
    return true;
  }
});

chrome.contextMenus?.create({ id: "print-selection", title: "Print Selection", contexts: ["selection"] });
chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "print-selection" && tab?.id) chrome.tabs.sendMessage(tab.id, { type: "PRINT_SELECTION" });
});
```

---

## Pattern 7: Batch Printing {#pattern-7-batch-printing}

Manage print queues for multiple documents with progress tracking and error handling.

```ts
// utils/print-queue.ts
interface PrintJob { id: string; title: string; content: string; status: "pending" | "printing" | "completed" | "failed"; error?: string; }
type PrintJobOptions = { copies?: number; duplex?: boolean; color?: boolean; orientation?: "portrait" | "landscape"; paperSize?: "a4" | "letter" | "legal"; };

class PrintQueueManager {
  private jobs: Map<string, PrintJob> = new Map();
  private isProcessing = false;
  private listeners: Set<(jobs: PrintJob[]) => void> = new Set();

  addJob(title: string, content: string, options: PrintJobOptions = {}): string {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.jobs.set(id, { id, title, content, status: "pending", ...options as any });
    this.notifyListeners();
    this.processQueue();
    return id;
  }

  removeJob(id: string): boolean { const del = this.jobs.delete(id); if (del) this.notifyListeners(); return del; }
  getJob(id: string): PrintJob | undefined { return this.jobs.get(id); }
  getAllJobs(): PrintJob[] { return Array.from(this.jobs.values()); }
  getStatus(): { pending: number; printing: number; completed: number; failed: number } {
    const jobs = this.getAllJobs();
    return { pending: jobs.filter(j => j.status === "pending").length, printing: jobs.filter(j => j.status === "printing").length, completed: jobs.filter(j => j.status === "completed").length, failed: jobs.filter(j => j.status === "failed").length };
  }
  subscribe(listener: (jobs: PrintJob[]) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  private notifyListeners(): void { this.listeners.forEach(l => l(this.getAllJobs())); }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    while (true) {
      const pending = Array.from(this.jobs.values()).find(j => j.status === "pending");
      if (!pending) break;
      pending.status = "printing";
      this.notifyListeners();
      try { await this.executePrintJob(pending); pending.status = "completed"; }
      catch (e) { pending.status = "failed"; pending.error = e instanceof Error ? e.message : "Unknown"; }
      this.notifyListeners();
    }
    this.isProcessing = false;
  }

  private async executePrintJob(job: PrintJob): Promise<void> {
    const printHTML = generatePrintableHTML(job.content, { title: job.title, showPageNumbers: true });
    const printWindow = window.open(URL.createObjectURL(new Blob([printHTML], { type: "text/html" })), "_blank");
    if (!printWindow) throw new Error("Failed to open print window");
    await new Promise<void>(resolve => { printWindow.addEventListener("load", () => { printWindow.print(); setTimeout(resolve, 2000); }); });
  }

  clearCompleted(): void { for (const [id, job] of this.jobs) if (job.status === "completed") this.jobs.delete(id); this.notifyListeners(); }
  retryFailed(id: string): boolean { const job = this.jobs.get(id); if (job && job.status === "failed") { job.status = "pending"; job.error = undefined; this.notifyListeners(); this.processQueue(); return true; } return false; }
}

export const printQueue = new PrintQueueManager();
```

---

## Pattern 8: Print Preview and Customization {#pattern-8-print-preview-and-customization}

Create custom print previews in extension side panels with user options for paper size, orientation, margins, and save preferences.

```ts
// components/PrintPreview.ts
interface PrintSettings { paperSize: "a4" | "letter" | "legal"; orientation: "portrait" | "landscape"; margins: "normal" | "narrow" | "minimal"; showHeaders: boolean; showFooters: boolean; showPageNumbers: boolean; scale: number; }

class PrintPreviewComponent {
  private container: HTMLElement;
  private settings: PrintSettings = { paperSize: "a4", orientation: "portrait", margins: "normal", showHeaders: true, showFooters: true, showPageNumbers: true, scale: 100 };
  private content = "";
  private currentPage = 1;
  private totalPages = 1;
  private onPrintCallback?: () => void;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.initUI();
    this.loadSettings();
  }

  private initUI(): void {
    this.container.innerHTML = `<div class="print-preview">
      <div class="preview-toolbar">
        <div class="toolbar-section"><label>Paper Size</label><select id="paper-size"><option value="a4">A4</option><option value="letter">Letter</option><option value="legal">Legal</option></select></div>
        <div class="toolbar-section"><label>Orientation</label><select id="orientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div>
        <div class="toolbar-section"><label>Margins</label><select id="margins"><option value="normal">Normal</option><option value="narrow">Narrow</option><option value="minimal">Minimal</option></select></div>
        <div class="toolbar-section"><label>Scale</label><input type="range" id="scale" min="50" max="150" value="100"><span id="scale-value">100%</span></div>
        <div class="toolbar-section"><label><input type="checkbox" id="show-headers" checked>Headers</label><label><input type="checkbox" id="show-footers" checked>Footers</label><label><input type="checkbox" id="show-page-numbers" checked>Page Numbers</label></div>
      </div>
      <div class="preview-content"><div class="preview-page"><div class="page-content"></div></div></div>
      <div class="preview-footer"><button id="prev-page" disabled>Previous</button><span id="page-indicator">Page 1 of 1</span><button id="next-page" disabled>Next</button><button id="print-btn" class="primary-btn">Print</button></div>
    </div>`;
    this.attachEvents();
  }

  private attachEvents(): void {
    document.getElementById("paper-size")!.addEventListener("change", e => { this.settings.paperSize = (e.target as HTMLSelectElement).value as any; this.updatePreview(); this.saveSettings(); });
    document.getElementById("orientation")!.addEventListener("change", e => { this.settings.orientation = (e.target as HTMLSelectElement).value as any; this.updatePreview(); this.saveSettings(); });
    document.getElementById("margins")!.addEventListener("change", e => { this.settings.margins = (e.target as HTMLSelectElement).value as any; this.updatePreview(); this.saveSettings(); });
    document.getElementById("scale")!.addEventListener("input", e => { this.settings.scale = parseInt((e.target as HTMLInputElement).value); document.getElementById("scale-value")!.textContent = `${this.settings.scale}%`; this.updatePreview(); });
    document.getElementById("show-headers")!.addEventListener("change", e => { this.settings.showHeaders = (e.target as HTMLInputElement).checked; this.updatePreview(); this.saveSettings(); });
    document.getElementById("show-footers")!.addEventListener("change", e => { this.settings.showFooters = (e.target as HTMLInputElement).checked; this.updatePreview(); this.saveSettings(); });
    document.getElementById("show-page-numbers")!.addEventListener("change", e => { this.settings.showPageNumbers = (e.target as HTMLInputElement).checked; this.updatePreview(); this.saveSettings(); });
    document.getElementById("prev-page")!.addEventListener("click", () => { if (this.currentPage > 1) { this.currentPage--; this.updatePreview(); } });
    document.getElementById("next-page")!.addEventListener("click", () => { if (this.currentPage < this.totalPages) { this.currentPage++; this.updatePreview(); } });
    document.getElementById("print-btn")!.addEventListener("click", () => this.onPrintCallback?.());
  }

  setContent(content: string): void { this.content = content; this.totalPages = Math.max(1, Math.ceil(content.length / 3000)); this.updatePreview(); }
  onPrint(callback: () => void): void { this.onPrintCallback = callback; }
  getSettings(): PrintSettings { return { ...this.settings }; }

  private updatePreview(): void {
    const page = this.container.querySelector(".preview-page") as HTMLElement;
    const content = this.container.querySelector(".page-content") as HTMLElement;
    const sizes: Record<string, { w: string; h: string }> = { a4: { w: "210mm", h: "297mm" }, letter: { w: "8.5in", h: "11in" }, legal: { w: "8.5in", h: "14in" } };
    const s = sizes[this.settings.paperSize];
    page.style.width = this.settings.orientation === "landscape" ? s.h : s.w;
    page.style.height = this.settings.orientation === "landscape" ? s.w : s.h;
    const margins: Record<string, string> = { normal: "20mm", narrow: "10mm", minimal: "5mm" };
    content.style.padding = margins[this.settings.margins];
    content.style.transform = `scale(${this.settings.scale / 100})`;
    content.style.transformOrigin = "top left";
    const header = this.settings.showHeaders ? `<div class="preview-header">Document</div>` : "";
    const footer = this.settings.showFooters ? `<div class="preview-footer">Chrome Extension</div>` : "";
    const pageNum = this.settings.showPageNumbers ? `<div class="page-number">Page ${this.currentPage} of ${this.totalPages}</div>` : "";
    content.innerHTML = `${header}<div class="content">${this.content}</div>${footer}${pageNum}`;
    document.getElementById("page-indicator")!.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    (document.getElementById("prev-page") as HTMLButtonElement).disabled = this.currentPage <= 1;
    (document.getElementById("next-page") as HTMLButtonElement).disabled = this.currentPage >= this.totalPages;
  }

  private saveSettings(): void { chrome.storage.local.set({ printSettings: this.settings }); }
  private loadSettings(): void {
    chrome.storage.local.get(["printSettings"], r => {
      if (r.printSettings) { this.settings = { ...this.settings, ...r.printSettings }; this.updateUI(); }
    });
  }

  private updateUI(): void {
    (document.getElementById("paper-size") as HTMLSelectElement).value = this.settings.paperSize;
    (document.getElementById("orientation") as HTMLSelectElement).value = this.settings.orientation;
    (document.getElementById("margins") as HTMLSelectElement).value = this.settings.margins;
    (document.getElementById("scale") as HTMLInputElement).value = this.settings.scale.toString();
    (document.getElementById("scale-value")!.textContent = `${this.settings.scale}%`;
    (document.getElementById("show-headers") as HTMLInputElement).checked = this.settings.showHeaders;
    (document.getElementById("show-footers") as HTMLInputElement).checked = this.settings.showFooters;
    (document.getElementById("show-page-numbers") as HTMLInputElement).checked = this.settings.showPageNumbers;
    this.updatePreview();
  }
}
```

### Integration with @theluckystrike/webext-storage {#integration-with-theluckystrikewebext-storage}

```ts
// utils/print-preferences.ts
import { storage } from "@theluckystrike/webext-storage";

interface PrintPreferences {
  defaultPaperSize: "a4" | "letter" | "legal";
  defaultOrientation: "portrait" | "landscape";
  defaultMargins: "normal" | "narrow" | "minimal";
  showPageNumbers: boolean;
  defaultPrinter?: string;
  recentPrinters: string[];
}

const DEFAULTS: PrintPreferences = { defaultPaperSize: "a4", defaultOrientation: "portrait", defaultMargins: "normal", showPageNumbers: true, recentPrinters: [] };

class PrintPreferencesManager {
  async get(): Promise<PrintPreferences> { const s = await storage.get<PrintPreferences>("printPreferences"); return { ...DEFAULTS, ...s }; }
  async save(prefs: Partial<PrintPreferences>): Promise<void> { await storage.set("printPreferences", { ...await this.get(), ...prefs }); }
  async addRecentPrinter(id: string): Promise<void> { const p = await this.get(); p.recentPrinters = [id, ...p.recentPrinters.filter(x => x !== id)].slice(0, 5); await this.save(p); }
  async reset(): Promise<void> { await storage.set("printPreferences", DEFAULTS); }
}

export const printPreferences = new PrintPreferencesManager();
```

---

## Summary {#summary}

| Pattern | Use Case | Key APIs |
|---------|----------|----------|
| Basic Print Trigger | Trigger printing from popup, options, or side panel; ChromeOS background printing | `window.print()`, `chrome.printing.submitJob` |
| Print-Friendly Page Generation | Create clean print documents, strip ads/navigation, add headers/footers | HTML generation, CSS @media print |
| Content Script Print Injection | Add print buttons to web pages, generate clean versions | Content script injection, `chrome.runtime.sendMessage` |
| PDF Generation | Capture pages as PDF, canvas-to-PDF, third-party libraries | `chrome.pageCapture.saveAsMHTML`, jsPDF |
| Custom Print Styles | Hide controls, show print-only content, control page breaks | CSS @media print, page-break-* properties |
| Print Selection Only | Capture user selection, build printable document | `window.getSelection()`, Range API |
| Batch Printing | Print queue management, sequential jobs, progress tracking | Queue manager class, state management |
| Print Preview and Customization | Side panel preview, user options, preference storage | Custom UI components, chrome.storage |

Printing in Chrome extensions requires understanding the different contexts and their capabilities. Use `window.print()` for extension pages, route through content scripts for page injection, and leverage offscreen documents for complex PDF generation. Always handle permission requirements gracefully, provide print preview when possible, and save user preferences for a seamless printing experience.
