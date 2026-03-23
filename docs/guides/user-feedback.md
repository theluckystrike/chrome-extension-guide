# Collecting User Feedback in Chrome Extensions

## Introduction
- User feedback is critical for improving Chrome extensions
- Multiple feedback channels: in-app forms, exit surveys, NPS, bug reports
- This guide covers implementing comprehensive feedback collection
- Reference: https://developer.chrome.com/docs/extensions/develop

## In-Extension Feedback Forms

### Basic Feedback Popup
```javascript
// popup/feedback.js
document.getElementById('submitFeedback').addEventListener('click', async () => {
  const feedback = {
    type: document.querySelector('input[name="feedbackType"]:checked').value,
    message: document.getElementById('feedbackMessage').value,
    rating: document.getElementById('rating').value,
    timestamp: new Date().toISOString(),
    version: chrome.runtime.getManifest().version
  };
  
  // Send to your backend or store locally
  await chrome.storage.local.set({ lastFeedback: feedback });
  await sendToAnalytics('extension_feedback', feedback);
});
```

### Feedback Types
- General feedback: Suggestions, questions
- Bug report: Issues, errors, unexpected behavior
- Feature request: New functionality ideas
- Rating: 1-5 star or thumbs up/down

## setUninstallURL for Exit Surveys

### Setting Up Exit Survey
```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.runtime.setUninstallURL(
    'https://yourdomain.com/uninstall-survey?extension_id=' + 
    chrome.runtime.id
  );
});
```

### Server-Side Survey (HTML)
```html
<!-- https://yourdomain.com/uninstall-survey -->
<!DOCTYPE html>
<html>
<head>
  <title>Help us improve</title>
</head>
<body>
  <h2>Why are you uninstalling?</h2>
  <form action="/api/uninstall-feedback" method="POST">
    <input type="radio" name="reason" value="too_complex"> Too complex
    <input type="radio" name="reason" value="not_working"> Not working
    <input type="radio" name="reason" value="found_alternative"> Found alternative
    <input type="radio" name="reason" value="temporary"> Temporary uninstall
    <textarea name="comments" placeholder="Additional comments..."></textarea>
    <button type="submit">Submit</button>
  </form>
</body>
</html>
```

## NPS Implementation

### Simple NPS Survey
```javascript
// popup/nps.js
function showNPSSurvey() {
  const npsHtml = `
    <div class="nps-survey">
      <h3>How likely are you to recommend this extension?</h3>
      <div class="nps-scale">
        ${[...Array(11)].map((_, i) => 
          `<button class="nps-btn" data-score="${i}">${i}</button>`
        ).join('')}
      </div>
      <div class="nps-feedback" hidden>
        <textarea placeholder="What could we improve?"></textarea>
        <button id="submitNPS">Submit</button>
      </div>
    </div>
  `;
  
  document.getElementById('npsContainer').innerHTML = npsHtml;
  
  document.querySelectorAll('.nps-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const score = parseInt(e.target.dataset.score);
      if (score >= 9) {
        // Promoter: ask for review
        requestChromeReview();
      } else if (score <= 6) {
        // Detractor: show feedback form
        document.querySelector('.nps-feedback').hidden = false;
      }
      saveNPSScore(score);
    });
  });
}

function saveNPSScore(score) {
  chrome.storage.local.set({ 
    npsScore: score, 
    npsDate: Date.now() 
  });
}
```

### NPS Styling
```css
.nps-scale {
  display: flex;
  gap: 4px;
  justify-content: space-between;
}
.nps-btn {
  width: 36px;
  height: 36px;
  border: 1px solid #ccc;
  background: white;
  cursor: pointer;
}
.nps-btn:hover { background: #f0f0f0; }
```

## Bug Reporting with Screenshots

### captureVisibleTab Usage
```javascript
// background.js / popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureScreenshot') {
    chrome.tabs.captureVisibleTab(sender.tab.id, { format: 'png' }, (dataUrl) => {
      sendResponse({ screenshot: dataUrl });
    });
    return true; // async response
  }
});
```

### Full Bug Report Form
```javascript
// popup/bugreport.js
async function submitBugReport(formData) {
  // Capture screenshot first
  const screenshot = await chrome.tabs.captureVisibleTab({ 
    format: 'png',
    quality: 80 
  });
  
  // Collect system info
  const systemInfo = await chrome.system.cpu.getInfo();
  const memoryInfo = await chrome.system.memory.getInfo();
  
  const bugReport = {
    title: formData.title,
    description: formData.description,
    steps: formData.steps,
    expected: formData.expected,
    actual: formData.actual,
    screenshot: screenshot,
    system: {
      os: navigator.platform,
      extensionVersion: chrome.runtime.getManifest().version,
      chromeVersion: navigator.userAgent,
      cpu: systemInfo.modelName,
      memory: `${memoryInfo.capacity / 1024 / 1024 / 1024}GB`
    },
    timestamp: new Date().toISOString(),
    userId: await getAnonymousUserId()
  };
  
  // Send to bug tracking (GitHub Issues, Jira, custom)
  return fetch('https://api.yourdomain.com/bugs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bugReport)
  });
}
```

### Automatic Error Capture
```javascript
// background.js
window.addEventListener('error', (event) => {
  const errorReport = {
    message: event.error.message,
    stack: event.error.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    timestamp: new Date().toISOString()
  };
  
  // Queue for later submission
  chrome.storage.local.get(['errorQueue'], (result) => {
    const queue = result.errorQueue || [];
    queue.push(errorReport);
    chrome.storage.local.set({ errorQueue: queue });
  });
});

// Send queued errors periodically
setInterval(() => {
  chrome.storage.local.get(['errorQueue'], async (result) => {
    if (result.errorQueue?.length > 0) {
      await fetch('https://api.yourdomain.com/errors', {
        method: 'POST',
        body: JSON.stringify(result.errorQueue)
      });
      chrome.storage.local.set({ errorQueue: [] });
    }
  });
}, 5 * 60 * 1000); // Every 5 minutes
```

## Chrome Web Store Review Management

### Responding to Reviews
```javascript
// Using Chrome Web Store Publishing API
// Note: Requires Google Cloud project setup
async function getReviews() {
  const response = await fetch(
    `https://www.googleapis.com/androidpublisher/v3/applications/` +
    `${EXTENSION_ID}/reviews?access_token=${ACCESS_TOKEN}`
  );
  return response.json();
}

async function replyToReview(reviewId, message) {
  return fetch(
    `https://www.googleapis.com/androidpublisher/v3/applications/` +
    `${EXTENSION_ID}/reviews/${reviewId}:reply`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ replyText: message })
    }
  );
}
```

### Review Monitoring
```javascript
// Check for new reviews periodically
setInterval(async () => {
  const reviews = await getReviews();
  const newReviews = reviews.reviews.filter(r => !isProcessed(r.reviewId));
  
  for (const review of newReviews) {
    if (review.starRating <= 2) {
      // Flag for immediate attention
      notifyTeam(review);
    }
    markAsProcessed(review.reviewId);
  }
}, 30 * 60 * 1000); // Check every 30 minutes
```

## Feature Request Collection

### Feature Request Form
```javascript
// popup/featureRequest.js
async function submitFeatureRequest(data) {
  const request = {
    title: data.title,
    description: data.description,
    useCase: data.useCase,
    priority: data.priority || 'medium',
    category: data.category,
    votes: 1, // Initial vote from reporter
    timestamp: new Date().toISOString()
  };
  
  // Option 1: GitHub Issues API
  const issue = await fetch(
    'https://api.github.com/repos/yourname/extension-repo/issues',
    {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        title: request.title,
        body: `Use Case: ${request.useCase}\n\nDescription: ${request.description}`,
        labels: ['feature-request']
      })
    }
  );
  
  return issue;
}
```

### Public Feature Voting
```javascript
// website/feature-votes.js
async function voteForFeature(featureId) {
  const response = await fetch('/api/features/' + featureId + '/vote', {
    method: 'POST'
  });
  return response.json();
}

// Display top requested features
async function showTopFeatures() {
  const features = await fetch('/api/features?sort=votes&limit=10')
    .then(r => r.json());
  
  return features.map(f => `
    <div class="feature-vote">
      <button onclick="voteForFeature('${f.id}')"></button>
      <span>${f.votes}</span>
      <h4>${f.title}</h4>
    </div>
  `).join('');
}
```

## Beta Testing Channels

### Beta Program Setup
```javascript
// manifest.json - Beta version uses separate ID or channel
{
  "name": "My Extension (Beta)",
  "version": "2.0.0-beta.1",
  "channel": "beta" // Upcoming in MV3
}
```

### Beta Tester Management
```javascript
// background.js
const BETA_GROUP_ID = 'beta-testers';

async function checkBetaAccess() {
  const userEmail = await getUserEmail(); // Requires identity permission
  
  const response = await fetch('/api/beta-access?email=' + userEmail);
  return response.json().access === 'granted';
}

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    const hasBetaAccess = await checkBetaAccess();
    if (hasBetaAccess && isBetaVersion()) {
      showBetaWelcome();
    }
  }
});
```

### Beta Feedback Collection
```javascript
// Automatic beta feedback
function initBetaFeedback() {
  const isBeta = isBetaVersion();
  
  if (isBeta) {
    // Show beta-specific feedback button
    document.getElementById('feedbackBtn').textContent = 'Submit Beta Feedback';
    document.getElementById('feedbackBtn').classList.add('beta');
    
    // Auto-collect usage data (with consent)
    collectBetaAnalytics();
  }
}
```

## Best Practices

### Feedback Timing
- Don't ask immediately after install. let users explore first
- Prompt for feedback after successful feature usage
- Space out NPS surveys (once per quarter max)
- Exit surveys only on uninstall, not downgrade

### Privacy Considerations
- Always explain what data is collected
- Get explicit consent for optional data (screenshots, system info)
- Anonymize user data where possible
- Comply with GDPR. allow data deletion requests

### Feedback Analytics
- Track feedback trends over time
- Categorize and tag feedback automatically
- Set up alerts for critical issues
- Create feedback-to-task workflows

## Resources
- https://developer.chrome.com/docs/extensions/develop
- https://developer.chrome.com/docs/webstore/
- https://developer.chrome.com/docs/extensions/mv3/intro/
