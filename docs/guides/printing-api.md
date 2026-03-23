---
layout: default
title: "Chrome Extension Printing API. Developer Guide"
description: "A comprehensive developer guide for building Chrome extensions with practical examples, code patterns, and expert recommendations."
canonical_url: "https://bestchromeextensions.com/guides/printing-api/"
---
Chrome Extension Printing API Guide

Overview {#overview}
- `chrome.printing` API provides programmatic control over print jobs in Chrome extensions
- Available in Chrome 81+ (ChromeOS only)
- Requires enterprise policy or user gesture to function properly
- Cross-ref: `docs/permissions/printing.md`

Permissions & Requirements {#permissions-requirements}
```json
// manifest.json
{
  "permissions": [
    "printing",
    "printingMetrics"
  ],
  "manifest_version": 3
}
```

Important Requirements:
- The API is primarily designed for enterprise-managed devices
- On consumer accounts, users must grant explicit permission each session
- `chrome.printing` requires the extension to be force-installed by enterprise policy OR the user must be interactively prompted
- Print jobs are sent to printers registered with Chrome (cloud printers or local printers)

Listing Available Printers {#listing-available-printers}
```javascript
// Get all available printers
chrome.printing.getPrinters((printers) => {
  printers.forEach(printer => {
    console.log('Printer:', printer.name);
    console.log('ID:', printer.id);
    console.log('Description:', printer.description);
    console.log('---');
  });
});
```

Printer Object Structure:
```typescript
interface Printer {
  id: string;           // Unique printer identifier
  name: string;         // Human-readable name
  description?: string; // Printer description
  printerStatus?: string; // "online", "offline", "error"
}
```

Typical Response:
```javascript
[
  {
    id: "00112233-4455-6677-8899-aabbccddeeff",
    name: "HP LaserJet Pro",
    description: "Office Printer - Floor 2",
    printerStatus: "online"
  },
  {
    id: "aabbccdd-eeff-1122-3344-556677889900",
    name: "Google Cloud Print",
    description: "Cloud Printer",
    printerStatus: "online"
  }
]
```

Understanding Print Tickets {#understanding-print-tickets}
The print ticket defines all job settings. Key components:
```javascript
const printTicket = {
  jobTitle: "My Print Job",
  printerId: "printer-id-here",
  ticket: {
    version: "1.0",
    print: {
      color: { type: "STANDARD_COLOR" },      // or "STANDARD_MONOCHROME"
      duplex: { type: "NO_DUPLEX" },           // "LONG_EDGE", "SHORT_EDGE"
      copies: { copies: 1 },
      mediaSize: {
        widthMicrons: 215900,                  // A4: 210000
        heightMicrons: 279400                  // A4: 297000
      },
      collation: { collate: false },
      orientation: { type: "PORTRAIT" },       // "LANDSCAPE"
      dpi: { horizontalDpi: 600, verticalDpi: 600 },
      margins: {
        topMicrons: 0,
        bottomMicrons: 0,
        leftMicrons: 0,
        rightMicrons: 0
      }
    }
  },
  content: {
    // URL to print (must be a chrome-extension:// or chrome:// resource)
    // Or use document instead
    documentUrl: chrome.runtime.getURL("content/printable.html")
  }
};
```

Common Print Ticket Configurations {#common-print-ticket-configurations}

Basic Black & White Print {#basic-black-white-print}
```javascript
function createBWPrintTicket(printerId) {
  return {
    jobTitle: `Print Job ${Date.now()}`,
    printerId: printerId,
    ticket: {
      version: "1.0",
      print: {
        color: { type: "STANDARD_MONOCHROME" },
        duplex: { type: "NO_DUPLEX" },
        copies: { copies: 1 },
        mediaSize: { widthMicrons: 215900, heightMicrons: 279400 },
        orientation: { type: "PORTRAIT" }
      }
    },
    content: { documentUrl: "" }  // Set dynamically
  };
}
```

Double-Sided (Duplex) Print {#double-sided-duplex-print}
```javascript
function createDuplexPrintTicket(printerId, isLongEdge = true) {
  return {
    jobTitle: "Double-Sided Document",
    printerId: printerId,
    ticket: {
      version: "1.0",
      print: {
        color: { type: "STANDARD_COLOR" },
        duplex: { 
          type: isLongEdge ? "LONG_EDGE" : "SHORT_EDGE" 
        },
        copies: { copies: 1 },
        mediaSize: { widthMicrons: 215900, heightMicrons: 279400 },
        orientation: { type: "PORTRAIT" }
      }
    },
    content: { documentUrl: "" }
  };
}
```

Multiple Copies with Collating {#multiple-copies-with-collating}
```javascript
function createCollatedPrintTicket(printerId, copies = 1) {
  return {
    jobTitle: `Multi-Copy Print (${copies} copies)`,
    printerId: printerId,
    ticket: {
      version: "1.0",
      print: {
        color: { type: "STANDARD_COLOR" },
        duplex: { type: "NO_DUPLEX" },
        copies: { copies: copies },
        collation: { collate: copies > 1 },
        mediaSize: { widthMicrons: 215900, heightMicrons: 279400 }
      }
    },
    content: { documentUrl: "" }
  };
}
```

Different Paper Sizes {#different-paper-sizes}
```javascript
const PAPER_SIZES = {
  A4: { widthMicrons: 210000, heightMicrons: 297000 },
  LETTER: { widthMicrons: 215900, heightMicrons: 279400 },
  LEGAL: { widthMicrons: 215900, heightMicrons: 355600 },
  A3: { widthMicrons: 297000, heightMicrons: 420000 },
  TABLOID: { widthMicrons: 279400, heightMicrons: 431800 }
};

function createPrintTicketWithSize(printerId, paperSize) {
  return {
    jobTitle: `${paperSize} Print Job`,
    printerId: printerId,
    ticket: {
      version: "1.0",
      print: {
        color: { type: "STANDARD_COLOR" },
        duplex: { type: "NO_DUPLEX" },
        copies: { copies: 1 },
        mediaSize: PAPER_SIZES[paperSize] || PAPER_SIZES.A4
      }
    },
    content: { documentUrl: "" }
  };
}
```

Submitting Print Jobs {#submitting-print-jobs}
```javascript
function submitPrintJob(printTicket) {
  chrome.printing.submitJob(printTicket, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error:', chrome.runtime.lastError.message);
      return;
    }
    
    if (response.status === "OK") {
      console.log('Job submitted successfully!');
      console.log('Job ID:', response.jobId);
    } else {
      console.error('Submission failed:', response.status);
    }
  });
}
```

Submit Job Response:
```typescript
interface SubmitJobResponse {
  status: "OK" | "USER_NOT_AUTHENTICATED" | "USER_NOT_AUTHORIZED" | 
          "INVALID_PRINTER_ID" | "INVALID_PRINT_TICKET" | 
          "INVALID_JOB_TITLE" | "INVALID_CONTENT_URL" | 
          "PRINTER_NOT_READY" | "TICKET_CONFLICT" | 
          "UNKNOWN_ERROR";
  jobId?: string;  // Only present if status is "OK"
}
```

Monitoring Job Status {#monitoring-job-status}
```javascript
// Listen for job status changes
chrome.printing.onJobStatusChanged.addListener((jobInfo) => {
  console.log('Job ID:', jobInfo.jobId);
  console.log('Status:', jobInfo.status);
  console.log('Status Info:', jobInfo.statusInfo);
  
  // Job statuses: "queued", "pending", "in_progress", 
  //               "canceled", "printed", "error"
});

/*
Job Status Values:
- QUEUED: Job is queued, waiting for processing
- PENDING: Job is pending user confirmation
- IN_PROGRESS: Job is being sent to printer
- CANCELED: Job was canceled
- PRINTED: Job completed successfully
- ERROR: An error occurred

Job Info Object:
{
  jobId: string,
  status: string,
  statusInfo: string,
  printerId: string
}
*/
```

Complete Print with Status Monitoring {#complete-print-with-status-monitoring}
```javascript
class PrintJobManager {
  constructor() {
    this.activeJobs = new Map();
    this.setupListeners();
  }
  
  setupListeners() {
    chrome.printing.onJobStatusChanged.addListener((jobInfo) => {
      this.handleJobStatusChange(jobInfo);
    });
  }
  
  handleJobStatusChange(jobInfo) {
    const { jobId, status, statusInfo, printerId } = jobInfo;
    
    console.log(`Job ${jobId}: ${status} - ${statusInfo}`);
    
    // Update job tracking
    this.activeJobs.set(jobId, jobInfo);
    
    // Handle completion
    if (status === 'PRINTED') {
      console.log(` Job ${jobId} completed successfully`);
      this.activeJobs.delete(jobId);
    }
    
    // Handle errors
    if (status === 'ERROR') {
      console.error(` Job ${jobId} failed: ${statusInfo}`);
      this.activeJobs.delete(jobId);
    }
    
    // Handle cancellation
    if (status === 'CANCELED') {
      console.log(`Job ${jobId} was canceled`);
      this.activeJobs.delete(jobId);
    }
  }
  
  async submitPrintJob(printTicket) {
    return new Promise((resolve, reject) => {
      chrome.printing.submitJob(printTicket, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response.status === "OK") {
          resolve(response.jobId);
        } else {
          reject(new Error(`Failed: ${response.status}`));
        }
      });
    });
  }
  
  getActiveJobs() {
    return Array.from(this.activeJobs.values());
  }
}

// Usage
const printManager = new PrintJobManager();

const ticket = createBWPrintTicket("printer-id");
ticket.content.documentUrl = chrome.runtime.getURL("printable/page.html");

printManager.submitPrintJob(ticket)
  .then(jobId => console.log('Job started:', jobId))
  .catch(err => console.error(err));
```

Chrome Printing Metrics API {#chrome-printing-metrics-api}
For enterprise environments, track printing usage:
```javascript
// Get printing metrics
chrome.printingMetrics.getPrintJobs((metrics) => {
  metrics.forEach(metric => {
    console.log('Job ID:', metric.jobId);
    console.log('Printer:', metric.printerId);
    console.log('User:', metric.userId);
    console.log('Timestamp:', new Date(metric.timestamp * 1000));
    console.log('Status:', metric.status);
    console.log('Pages Printed:', metric.pagesPrinted);
    console.log('Copies:', metric.copies);
    console.log('---');
  });
});

/*
Print Job Metric Object:
{
  jobId: string,
  printerId: string,
  printerName: string,
  userId: string,
  timestamp: number,      // Unix timestamp
  status: string,         // "success", "failed", "canceled"
  pagesPrinted: number,
  copies: number,
  documentType: string,   // "pdf", "html", etc.
  colorType: string,      // "color", "bw"
  duplex: boolean,
  mediaSize: string       // "letter", "a4", etc.
}
*/
```

Enterprise Usage Tracking Example {#enterprise-usage-tracking-example}
```javascript
class PrintingAnalytics {
  constructor() {
    this.stats = {
      totalJobs: 0,
      totalPages: 0,
      byPrinter: {},
      byUser: {},
      byDay: {}
    };
  }
  
  async loadMetrics() {
    return new Promise((resolve) => {
      chrome.printingMetrics.getPrintJobs((metrics) => {
        this.processMetrics(metrics);
        resolve(this.stats);
      });
    });
  }
  
  processMetrics(metrics) {
    metrics.forEach(job => {
      if (job.status !== 'success') return;
      
      this.stats.totalJobs++;
      this.stats.totalPages += job.pagesPrinted;
      
      // By printer
      if (!this.stats.byPrinter[job.printerName]) {
        this.stats.byPrinter[job.printerName] = { jobs: 0, pages: 0 };
      }
      this.stats.byPrinter[job.printerName].jobs++;
      this.stats.byPrinter[job.printerName].pages += job.pagesPrinted;
      
      // By user
      if (!this.stats.byUser[job.userId]) {
        this.stats.byUser[job.userId] = { jobs: 0, pages: 0 };
      }
      this.stats.byUser[job.userId].jobs++;
      this.stats.byUser[job.userId].pages += job.pagesPrinted;
      
      // By day
      const day = new Date(job.timestamp * 1000).toDateString();
      if (!this.stats.byDay[day]) {
        this.stats.byDay[day] = { jobs: 0, pages: 0 };
      }
      this.stats.byDay[day].jobs++;
      this.stats.byDay[day].pages += job.pagesPrinted;
    });
  }
  
  generateReport() {
    console.log('=== Printing Usage Report ===');
    console.log(`Total Jobs: ${this.stats.totalJobs}`);
    console.log(`Total Pages: ${this.stats.totalPages}`);
    console.log('\nBy Printer:');
    Object.entries(this.stats.byPrinter).forEach(([printer, data]) => {
      console.log(`  ${printer}: ${data.jobs} jobs, ${data.pages} pages`);
    });
  }
}

// Usage
const analytics = new PrintingAnalytics();
analytics.loadMetrics().then(() => analytics.generateReport());
```

Building a Print Management Extension {#building-a-print-management-extension}

Complete Extension Structure {#complete-extension-structure}
```javascript
// background.js - Main service worker
class PrintManager {
  constructor() {
    this.printers = [];
    this.selectedPrinter = null;
    this.initialize();
  }
  
  async initialize() {
    // Load printers on startup
    await this.refreshPrinters();
    
    // Set up listeners
    this.setupMessageListeners();
    this.setupPrintListeners();
  }
  
  async refreshPrinters() {
    return new Promise((resolve) => {
      chrome.printing.getPrinters((printers) => {
        this.printers = printers;
        console.log(`Loaded ${printers.length} printers`);
        resolve(printers);
      });
    });
  }
  
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'GET_PRINTERS':
          sendResponse({ printers: this.printers });
          break;
        case 'REFRESH_PRINTERS':
          this.refreshPrinters().then(printers => {
            sendResponse({ printers: printers });
          });
          return true; // Async response
        case 'SUBMIT_JOB':
          this.submitJob(message.data)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ error: err.message }));
          return true;
        case 'GET_JOB_STATUS':
          // Implementation for checking specific job
          sendResponse({ jobs: this.getActiveJobs() });
          break;
      }
    });
  }
  
  setupPrintListeners() {
    chrome.printing.onJobStatusChanged.addListener((jobInfo) => {
      // Notify all extension views
      chrome.runtime.sendMessage({
        type: 'JOB_STATUS_UPDATE',
        data: jobInfo
      }).catch(() => {
        // Ignore errors when no listeners
      });
      
      // Store for later reference
      this.updateJobCache(jobInfo);
    });
  }
  
  async submitJob(options) {
    const { printerId, documentUrl, ticket, jobTitle } = options;
    
    const printTicket = {
      jobTitle: jobTitle || `Print Job ${Date.now()}`,
      printerId: printerId,
      ticket: ticket,
      content: { documentUrl: documentUrl }
    };
    
    return new Promise((resolve, reject) => {
      chrome.printing.submitJob(printTicket, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response.status === "OK") {
          resolve({ jobId: response.jobId, status: response.status });
        } else {
          reject(new Error(response.status));
        }
      });
    });
  }
  
  updateJobCache(jobInfo) {
    // Implementation for job cache management
  }
  
  getActiveJobs() {
    // Return tracked active jobs
    return [];
  }
}

// Initialize
const printManager = new PrintManager();
```

Popup UI Integration {#popup-ui-integration}
```javascript
// popup.js - Handle UI interactions
document.addEventListener('DOMContentLoaded', async () => {
  const printerSelect = document.getElementById('printer-select');
  const printButton = document.getElementById('print-button');
  const statusDiv = document.getElementById('status');
  
  // Load printers
  async function loadPrinters() {
    const response = await chrome.runtime.sendMessage({ 
      type: 'GET_PRINTERS' 
    });
    
    printerSelect.innerHTML = response.printers
      .map(p => `<option value="${p.id}">${p.name}</option>`)
      .join('');
  }
  
  // Submit print job
  printButton.addEventListener('click', async () => {
    const printerId = printerSelect.value;
    const documentUrl = chrome.runtime.getURL('content/printable.html');
    
    const ticket = createBWPrintTicket(printerId);
    ticket.content.documentUrl = documentUrl;
    
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'SUBMIT_JOB',
        data: {
          printerId: printerId,
          documentUrl: documentUrl,
          ticket: ticket,
          jobTitle: 'My Document'
        }
      });
      
      statusDiv.textContent = `Job submitted: ${result.jobId}`;
    } catch (err) {
      statusDiv.textContent = `Error: ${err.message}`;
    }
  });
  
  // Listen for job updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'JOB_STATUS_UPDATE') {
      statusDiv.textContent = `Job ${message.data.jobId}: ${message.data.status}`;
    }
  });
  
  loadPrinters();
});
```

HTML for Print Content {#html-for-print-content}
```html
<!-- content/printable.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Printable Document</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
    }
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>My Printable Document</h1>
  <p>This content will be printed.</p>
  <p>Date: <span id="date"></span></p>
  
  <script>
    document.getElementById('date').textContent = new Date().toLocaleString();
  </script>
</body>
</html>
```

Best Practices & Error Handling {#best-practices-error-handling}
```javascript
// Solid print job submission with retries
async function submitWithRetry(printTicket, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await submitPrintJob(printTicket);
      return result;
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed: ${error.message}`);
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Validate printer before printing
async function validatePrinter(printerId) {
  const printers = await new Promise(resolve => {
    chrome.printing.getPrinters(resolve);
  });
  
  const printer = printers.find(p => p.id === printerId);
  if (!printer) {
    throw new Error(`Printer not found: ${printerId}`);
  }
  
  if (printer.printerStatus === 'offline') {
    throw new Error('Printer is offline');
  }
  
  return printer;
}

// Complete print workflow
async function printDocument(options) {
  const { 
    printerId, 
    documentUrl, 
    copies = 1, 
    color = true, 
    duplex = false 
  } = options;
  
  // Validate printer
  await validatePrinter(printerId);
  
  // Build ticket
  const ticket = {
    jobTitle: `Print Job ${Date.now()}`,
    printerId: printerId,
    ticket: {
      version: "1.0",
      print: {
        color: { type: color ? "STANDARD_COLOR" : "STANDARD_MONOCHROME" },
        duplex: { type: duplex ? "LONG_EDGE" : "NO_DUPLEX" },
        copies: { copies: copies },
        collation: { collate: copies > 1 },
        mediaSize: { widthMicrons: 215900, heightMicrons: 279400 }
      }
    },
    content: { documentUrl: documentUrl }
  };
  
  // Submit with retry
  return submitWithRetry(ticket);
}
```

Summary {#summary}
The Chrome Printing API enables powerful print management capabilities:
- List printers with `getPrinters()` for user selection
- Configure jobs with flexible ticket options (copies, color, duplex, paper size)
- Submit jobs programmatically with `submitJob()`
- Monitor status via `onJobStatusChanged` for real-time updates
- Track usage with `printingMetrics` for enterprise analytics

Key considerations:
- API requires enterprise policy or user gesture on consumer accounts
- Print content must be from chrome-extension:// or chrome:// URLs
- Always handle errors and provide feedback to users
- Consider implementing job queuing for multiple print requests

Related Articles {#related-articles}

Related Articles

- [System API Reference](../api-reference/system-api.md)
- [Desktop Capture](../guides/desktop-capture.md)
-e 
---

*Part of the Chrome Extension Guide by theluckystrike. Built at zovo.one.*
