// Initialize marked with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (err) {}
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true
});

const markdownInput = document.getElementById('markdown-input');
const markdownPreview = document.getElementById('markdown-preview');

// Live preview function
function updatePreview() {
  const markdown = markdownInput.value;
  const html = marked.parse(markdown);
  markdownPreview.innerHTML = html;
}

// Event listener for real-time preview
markdownInput.addEventListener('input', updatePreview);

// Copy HTML button
document.getElementById('copy-html').addEventListener('click', () => {
  const html = markdownPreview.innerHTML;
  navigator.clipboard.writeText(html).then(() => {
    const button = document.getElementById('copy-html');
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => button.textContent = originalText, 1500);
  });
});

// Preview selected text from page
document.getElementById('insert-page').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: getSelection
  }, (results) => {
    if (results && results[0] && results[0].result) {
      markdownInput.value = results[0].result;
      updatePreview();
    }
  });
});

function getSelection() {
  return window.getSelection().toString();
}

// Load sample markdown on startup
markdownInput.value = `# Welcome to Markdown Preview

This is a **live preview** extension for Chrome.

## Features

- Live rendering as you type
- GitHub-flavored markdown support
- Syntax highlighting for code blocks

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

> Blockquotes work too!

- Item 1
- Item 2
- Item 3

[Link to Chrome Extension Guide](https://developer.chrome.com/docs/extensions)
`;

updatePreview();
