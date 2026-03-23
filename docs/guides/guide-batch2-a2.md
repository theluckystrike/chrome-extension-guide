PDF Handling in Chrome Extensions

Introduction

PDF handling in Chrome extensions opens up powerful possibilities for document processing, from viewing and annotation to extraction and conversion. Whether you're building a document viewer, form filler, or PDF analyzer, understanding the available APIs and libraries is essential for creating solid extension functionality.

This guide covers the architecture, libraries, and patterns for handling PDFs effectively in Chrome extensions using TypeScript.

Understanding PDF Handling Approaches

Chrome extensions can handle PDFs in several ways, each with distinct trade-offs:

1. Native PDF Viewer Integration - Use Chrome's built-in PDF viewer
2. PDF.js Rendering - Client-side PDF rendering using Mozilla's library
3. PDF-lib Modification - Create and modify PDFs programmatically
4. Backend Processing - Offload heavy processing to a server

Choose based on your use case: viewing needs PDF.js, modification needs PDF-lib, and complex analysis might need backend support.

Architecture Overview

```

                    Chrome Extension                         

  Content      Background       Popup                    
  Script       Service Worker   UI                       

                    PDF Processing Layer                     
        
    PDF.js         PDF-lib        PDF Parser           
    (render)       (modify)       (extract data)       
        

```

Using PDF.js for Rendering

PDF.js is the most popular library for rendering PDFs in the browser. It runs entirely client-side and works well within Chrome extension contexts.

Installation

```bash
npm install pdfjs-dist
```

Basic PDF Rendering in Content Script

```typescript
// content/pdf-renderer.ts
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
  'assets/pdf.worker.min.mjs'
);

interface PDFRenderOptions {
  scale: number;
  canvas: HTMLCanvasElement;
}

async function renderPDFPage(
  pdfData: ArrayBuffer,
  pageNumber: number,
  options: PDFRenderOptions
): Promise<void> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdfDocument = await loadingTask.promise;
  
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale: options.scale });
  
  const canvas = options.canvas;
  const context = canvas.getContext('2d')!;
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };
  
  await page.render(renderContext).promise;
}

// Load PDF from URL
async function loadPDFFromURL(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  return response.arrayBuffer();
}

// Load PDF from downloaded file
async function loadPDFFromTab(tabId: number): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    chrome.downloads.download(
      { url: `chrome-extension://${chrome.runtime.id}/temp/document.pdf` },
      (downloadId) => {
        chrome.downloads.search({ id: downloadId }, (results) => {
          if (results[0]) {
            fetch(results[0].url).then(r => r.arrayBuffer()).then(resolve);
          } else {
            resolve(null);
          }
        });
      }
    );
  });
}
```

Handling Large PDFs Efficiently

```typescript
// content/pdf-viewer.ts
class PDFViewer {
  private pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  private currentPage: number = 1;
  private scale: number = 1.0;
  private renderQueue: Map<number, pdfjsLib.PDFPageProxy> = new Map();

  async loadDocument(data: ArrayBuffer): Promise<number> {
    const loadingTask = pdfjsLib.getDocument({ data });
    this.pdfDocument = await loadingTask.promise;
    return this.pdfDocument.numPages;
  }

  async prefetchPages(pageNumbers: number[]): Promise<void> {
    if (!this.pdfDocument) return;
    
    const promises = pageNumbers.map(async (num) => {
      if (!this.renderQueue.has(num)) {
        const page = await this.pdfDocument!.getPage(num);
        this.renderQueue.set(num, page);
      }
    });
    
    await Promise.all(promises);
  }

  async renderToCanvas(
    canvas: HTMLCanvasElement,
    pageNumber: number
  ): Promise<void> {
    let page = this.renderQueue.get(pageNumber);
    
    if (!page && this.pdfDocument) {
      page = await this.pdfDocument.getPage(pageNumber);
    }
    
    if (!page) return;
    
    const viewport = page.getViewport({ scale: this.scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: canvas.getContext('2d')!,
      viewport: viewport,
    }).promise;
    
    this.currentPage = pageNumber;
  }
}
```

Using PDF-lib for PDF Modification

PDF-lib enables creating and modifying PDFs directly in the browser. This is powerful for features like form filling, watermarking, and merging.

Installation

```bash
npm install pdf-lib
```

Creating and Modifying PDFs

```typescript
// background/pdf-editor.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface PDFModificationOptions {
  watermark?: string;
  fillForm?: Record<string, string>;
  addPageNumbers?: boolean;
}

class PDFEditor {
  /
   * Add a watermark to all pages of a PDF
   */
  async addWatermark(
    pdfData: Uint8Array,
    watermarkText: string
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfData);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const watermarkSize = 50;
    const watermarkColor = rgb(0.7, 0.7, 0.7);
    
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      page.drawText(watermarkText, {
        x: width / 2 - (watermarkText.length * watermarkSize) / 4,
        y: height / 2,
        size: watermarkSize,
        font: font,
        color: watermarkColor,
        opacity: 0.3,
        rotate: 45,
      });
    }
    
    return pdfDoc.save();
  }

  /
   * Fill form fields in a PDF
   */
  async fillFormFields(
    pdfData: Uint8Array,
    formData: Record<string, string>
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(pdfData);
    const form = pdfDoc.getForm();
    
    for (const [fieldName, value] of Object.entries(formData)) {
      try {
        const field = form.getField(fieldName);
        
        if (field instanceof PDFDocument.PDFForm['constructor']['prototype']['getTextField']) {
          field.setText(value);
        } else if (field instanceof PDFDocument.PDFForm['constructor']['prototype']['getCheckBox']) {
          field.check();
        } else if (field instanceof PDFDocument.PDFForm['constructor']['prototype']['getDropdown']) {
          field.select(value);
        }
      } catch (error) {
        console.warn(`Field ${fieldName} not found in form`);
      }
    }
    
    return pdfDoc.save();
  }

  /
   * Merge multiple PDFs into one
   */
  async mergePDFs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();
    
    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    }
    
    return mergedPdf.save();
  }

  /
   * Extract text content from PDF
   */
  async extractText(pdfData: Uint8Array): Promise<string> {
    const pdfDoc = await PDFDocument.load(pdfData);
    const pages = pdfDoc.getPages();
    const textContent: string[] = [];
    
    // Note: PDF-lib doesn't directly extract text
    // Use pdf.js for text extraction instead
    return textContent.join('\n');
  }
}
```

Text Extraction with PDF.js

For extracting text from PDFs, PDF.js provides the getTextContent method:

```typescript
// content/pdf-text-extractor.ts
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
  'assets/pdf.worker.min.mjs'
);

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

class PDFTextExtractor {
  private pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;

  async loadDocument(data: ArrayBuffer): Promise<void> {
    const loadingTask = pdfjsLib.getDocument({ data });
    this.pdfDocument = await loadingTask.promise;
  }

  async extractPageText(pageNumber: number): Promise<string> {
    if (!this.pdfDocument) {
      throw new Error('No document loaded');
    }
    
    const page = await this.pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    const textItems = textContent.items as TextItem[];
    
    // Group text by y-position to reconstruct layout
    const lines: Map<number, string[]> = new Map();
    
    for (const item of textItems) {
      const y = Math.round(item.transform[5]);
      
      if (!lines.has(y)) {
        lines.set(y, []);
      }
      
      lines.get(y)!.push(item.str);
    }
    
    // Sort by y (top to bottom) and join text
    const sortedY = Array.from(lines.keys()).sort((a, b) => b - a);
    
    return sortedY
      .map((y) => lines.get(y)!.join(' '))
      .join('\n');
  }

  async extractAllText(): Promise<string> {
    if (!this.pdfDocument) {
      throw new Error('No document loaded');
    }
    
    const textParts: string[] = [];
    const numPages = this.pdfDocument.numPages;
    
    for (let i = 1; i <= numPages; i++) {
      const pageText = await this.extractPageText(i);
      textParts.push(`--- Page ${i} ---\n${pageText}`);
    }
    
    return textParts.join('\n\n');
  }
}
```

Handling PDF Downloads and Storage

Chrome extensions have specific APIs for handling file downloads and storage:

```typescript
// background/download-manager.ts
class PDFDownloadManager {
  /
   * Save modified PDF to user's downloads
   */
  async savePDF(pdfData: Uint8Array, filename: string): Promise<number> {
    // Convert Uint8Array to Blob
    const blob = new Blob([pdfData], { type: 'application/pdf' });
    
    // Create object URL for download
    const url = URL.createObjectURL(blob);
    
    const downloadId = await new Promise<number>((resolve) => {
      chrome.downloads.download(
        {
          url: url,
          filename: filename,
          saveAs: true,
          conflictAction: 'uniquify',
        },
        (id) => resolve(id)
      );
    });
    
    // Clean up object URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
    return downloadId;
  }

  /
   * Store PDF in extension storage (for small files)
   */
  async storePDFLocally(
    key: string,
    pdfData: Uint8Array
  ): Promise<void> {
    const base64 = this.uint8ArrayToBase64(pdfData);
    await chrome.storage.local.set({ [key]: base64 });
  }

  /
   * Retrieve PDF from extension storage
   */
  async retrievePDF(key: string): Promise<Uint8Array | null> {
    const result = await chrome.storage.local.get(key);
    const base64 = result[key];
    
    if (!base64) return null;
    
    return this.base64ToUint8Array(base64);
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
```

Message Passing for PDF Operations

Coordinate PDF operations between content scripts and background worker:

```typescript
// content/pdf-handler.ts
type PDFMessageType = 
  | 'LOAD_PDF'
  | 'EXTRACT_TEXT'
  | 'ADD_WATERMARK'
  | 'FILL_FORM'
  | 'GET_PAGE_COUNT';

interface PDFMessage {
  type: PDFMessageType;
  payload?: unknown;
}

// Send request to background worker
async function sendPDFMessage(message: PDFMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Handle messages in background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_TEXT') {
    // Handle PDF text extraction
    const extractor = new PDFTextExtractor();
    extractor.loadDocument(message.payload as ArrayBuffer)
      .then(() => extractor.extractAllText())
      .then(text => sendResponse({ success: true, data: text }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Keep message channel open for async response
  }
});
```

Manifest Permissions

Configure your manifest for PDF handling:

```json
{
  "manifest_version": 3,
  "permissions": [
    "downloads",
    "storage"
  ],
  "host_permissions": [
    "*://*.pdf",
    "file://*"
  ],
  "web_accessible_resources": [
    {
      "resources": ["assets/pdf.worker.min.mjs"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

Performance Considerations

Lazy Loading

```typescript
class LazyPDFLoader {
  private loadingPromise: Promise<void> | null = null;
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

  async getDocument(data: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
    if (this.pdfDoc) return this.pdfDoc;
    
    if (!this.loadingPromise) {
      this.loadingPromise = (async () => {
        const loadingTask = pdfjsLib.getDocument({ data });
        this.pdfDoc = await loadingTask.promise;
      })();
    }
    
    await this.loadingPromise;
    return this.pdfDoc!;
  }
}
```

Web Workers

PDF.js uses web workers for parsing. Ensure workers are properly loaded:

```typescript
// Ensure worker is available
const workerSrc = chrome.runtime.getURL('assets/pdf.worker.min.mjs');
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
```

Error Handling

```typescript
async function safePDFOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('PDF operation failed:', error);
    
    if (error instanceof pdfjsLib.InvalidPDFException) {
      throw new Error('Invalid or corrupted PDF file');
    } else if (error instanceof pdfjsLib.MissingPDFException) {
      throw new Error('PDF file not found');
    }
    
    return fallback;
  }
}
```

Best Practices Summary

PDF handling in Chrome extensions requires careful architecture decisions. Use PDF.js for rendering and text extraction, as it runs entirely client-side with no server dependency. Use PDF-lib for document modification like form filling, watermarking, and merging. Implement proper error handling for corrupted or password-protected PDFs, and always consider performance when handling large documents by implementing lazy loading and page prefetching.

For more advanced PDF operations that require server-side processing, consider implementing a backend service that your extension can communicate with securely.

Explore the extensions ecosystem on zovo.one for more production-ready patterns and implementations for Chrome extension development.
