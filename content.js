// Accessibility rules based on WCAG 2.1 guidelines
const accessibilityRules = [
  {
    id: 'img-alt',
    name: 'Image Alt Text',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'IMG') {
        return !!element.alt || element.getAttribute('role') === 'presentation';
      }
      return null;
    },
    message: 'Images must have alt text or be marked as presentation'
  },
  {
    id: 'heading-order',
    name: 'Heading Order',
    level: 'A',
    check: (element) => {
      if (/^H[1-6]$/.test(element.tagName)) {
        const previousHeading = findPreviousHeading(element);
        if (previousHeading) {
          const currentLevel = parseInt(element.tagName[1]);
          const previousLevel = parseInt(previousHeading.tagName[1]);
          if (currentLevel > previousLevel + 1) {
            return `Heading level should not skip from H${previousLevel} to H${currentLevel}`;
          }
        }
      }
      return null;
    }
  },
  {
    id: 'link-name',
    name: 'Link Name',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'A') {
        const hasText = element.textContent.trim().length > 0;
        const hasAriaLabel = element.getAttribute('aria-label') || 
                            element.getAttribute('aria-labelledby');
        return hasText || hasAriaLabel || 'Links must have accessible names';
      }
      return null;
    }
  },
  {
    id: 'button-name',
    name: 'Button Name',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'BUTTON') {
        const hasText = element.textContent.trim().length > 0;
        const hasAriaLabel = element.getAttribute('aria-label');
        return hasText || hasAriaLabel || 'Buttons must have accessible names';
      }
      return null;
    }
  },
  {
    id: 'form-label',
    name: 'Form Label',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'INPUT') {
        const type = element.getAttribute('type');
        if (type === 'hidden' || type === 'submit' || type === 'button') {
          return null;
        }
        const hasLabel = element.getAttribute('aria-label') ||
                        element.getAttribute('aria-labelledby') ||
                        document.querySelector(`label[for="${element.id}"]`);
        return hasLabel || 'Form inputs must have associated labels';
      }
      return null;
    }
  },
  {
    id: 'color-contrast',
    name: 'Color Contrast',
    level: 'AA',
    check: (element) => {
      const style = window.getComputedStyle(element);
      const bgColor = style.backgroundColor;
      const color = style.color;
      
      if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
        return null;
      }
      
      const contrast = calculateContrast(color, bgColor);
      if (contrast < 4.5 && element.tagName !== 'BODY') {
        return `Color contrast ratio is ${contrast.toFixed(2)}, should be at least 4.5:1`;
      }
      return null;
    }
  },
  {
    id: 'focus-visible',
    name: 'Focus Visible',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'BODY') {
        return null;
      }
      const style = window.getComputedStyle(element);
      const outlineStyle = style.outlineStyle;
      const outlineWidth = style.outlineWidth;
      
      if (outlineStyle === 'none' || outlineWidth === '0px') {
        if (element.tabIndex >= 0 && element.tagName !== 'DIV' && element.tagName !== 'SPAN') {
          return 'Interactive elements must have visible focus indicators';
        }
      }
      return null;
    }
  },
  {
    id: 'html-lang',
    name: 'Language Attribute',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'HTML') {
        return element.getAttribute('lang') || 'HTML element must have a lang attribute';
      }
      return null;
    }
  },
  {
    id: 'meta-viewport',
    name: 'Viewport Zoom',
    level: 'A',
    check: (element) => {
      if (element.tagName === 'META') {
        const name = element.getAttribute('name');
        const content = element.getAttribute('content');
        if (name === 'viewport' && content.includes('user-scalable=no')) {
          return 'Do not disable user zooming in viewport meta tag';
        }
      }
      return null;
    }
  }
];

// Helper functions
function findPreviousHeading(element) {
  const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const currentIndex = allHeadings.indexOf(element);
  if (currentIndex > 0) {
    return allHeadings[currentIndex - 1];
  }
  return null;
}

function calculateContrast(color1, color2) {
  const getLuminance = (rgb) => {
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const parseColor = (color) => {
    const match = color.match(/\d+/g);
    return match ? match.slice(0, 3).map(Number) : [0, 0, 0];
  };
  
  const l1 = getLuminance(parseColor(color1));
  const l2 = getLuminance(parseColor(color2));
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Main scanning function
function scanPage() {
  const issues = [];
  const elements = document.querySelectorAll('*');
  
  elements.forEach(element => {
    accessibilityRules.forEach(rule => {
      const result = rule.check(element);
      if (result) {
        issues.push({
          type: rule.name,
          level: rule.level,
          element: element.tagName.toLowerCase() + (element.id ? '#' + element.id : ''),
          message: typeof result === 'string' ? result : rule.message
        });
      }
    });
  });
  
  return issues;
}

// Create visual overlay
function createOverlay() {
  removeOverlay();
  
  const overlay = document.createElement('div');
  overlay.id = 'a11y-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999999;
  `;
  
  const elements = document.querySelectorAll('img:not([alt]), img[alt=""], input:not([aria-label]), button:not([aria-label]), a:not([aria-label])');
  
  elements.forEach(element => {
    const rect = element.getBoundingClientRect();
    const highlight = document.createElement('div');
    highlight.style.cssText = `
      position: absolute;
      border: 2px solid #FF0000;
      background: rgba(255, 0, 0, 0.1);
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
    `;
    overlay.appendChild(highlight);
  });
  
  document.body.appendChild(overlay);
}

function removeOverlay() {
  const existing = document.getElementById('a11y-overlay');
  if (existing) {
    existing.remove();
  }
}

// High contrast mode
function toggleHighContrast() {
  document.body.classList.toggle('a11y-high-contrast');
  
  if (!document.getElementById('a11y-styles')) {
    const style = document.createElement('style');
    style.id = 'a11y-styles';
    style.textContent = `
      .a11y-high-contrast {
        filter: contrast(150%) brightness(110%) !important;
      }
      .a11y-high-contrast * {
        background-color: #FFFFFF !important;
        color: #000000 !important;
        border-color: #000000 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Enhanced focus indicators
function toggleFocusIndicators() {
  document.body.classList.toggle('a11y-focus-mode');
  
  if (!document.getElementById('a11y-focus-styles')) {
    const style = document.createElement('style');
    style.id = 'a11y-focus-styles';
    style.textContent = `
      .a11y-focus-mode *:focus {
        outline: 3px solid #0066CC !important;
        outline-offset: 2px !important;
      }
    `;
    document.head.appendChild(style);
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'scan':
      const issues = scanPage();
      sendResponse({ issues });
      break;
    case 'toggleOverlay':
      const overlay = document.getElementById('a11y-overlay');
      if (overlay) {
        removeOverlay();
      } else {
        createOverlay();
      }
      break;
    case 'highContrast':
      toggleHighContrast();
      break;
    case 'focusIndicator':
      toggleFocusIndicators();
      break;
  }
});
