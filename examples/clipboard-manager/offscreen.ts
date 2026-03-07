// This runs inside the offscreen document (has DOM access)

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "writeClipboard") {
    const textarea = document.getElementById(
      "clipboard-area"
    ) as HTMLTextAreaElement;
    textarea.value = message.payload.text;
    textarea.select();
    // execCommand works reliably in offscreen documents
    const success = document.execCommand("copy");
    sendResponse({ success });
    return true;
  }

  if (message.type === "readClipboard") {
    const textarea = document.getElementById(
      "clipboard-area"
    ) as HTMLTextAreaElement;
    textarea.value = "";
    textarea.focus();
    document.execCommand("paste");
    sendResponse({ text: textarea.value });
    return true;
  }
});
