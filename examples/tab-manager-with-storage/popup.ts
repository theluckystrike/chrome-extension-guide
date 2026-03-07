import { createMessenger } from "@theluckystrike/webext-messaging";
import {
  checkPermission,
  requestPermission,
} from "@theluckystrike/webext-permissions";

type Messages = {
  saveCurrentTabs: {
    request: { groupName: string };
    response: { success: boolean; groupCount: number };
  };
  getSavedGroups: {
    request: void;
    response: Array<{ name: string; urls: string[]; createdAt: number }>;
  };
  restoreGroup: {
    request: { index: number };
    response: { tabsOpened: number };
  };
  deleteGroup: {
    request: { index: number };
    response: { success: boolean };
  };
};

const msg = createMessenger<Messages>();

// Check tabs permission before saving (needed for tab URLs)
async function ensureTabsPermission(): Promise<boolean> {
  const result = await checkPermission("tabs");
  if (result.granted) return true;

  const req = await requestPermission("tabs");
  return req.granted;
}

// Save current tabs as a group
async function saveGroup(): Promise<void> {
  const hasPermission = await ensureTabsPermission();
  if (!hasPermission) {
    showStatus("Tabs permission required to save tab URLs");
    return;
  }

  const name = prompt("Group name:");
  if (!name) return;

  const result = await msg.send("saveCurrentTabs", { groupName: name });
  if (result.success) {
    showStatus(`Saved! (${result.groupCount} groups total)`);
    await renderGroups();
  } else {
    showStatus("Max groups reached. Delete one first.");
  }
}

// Render saved groups list
async function renderGroups(): Promise<void> {
  const groups = await msg.send("getSavedGroups", undefined);
  const container = document.getElementById("groups")!;

  container.innerHTML = groups
    .map(
      (g, i) => `
    <div class="group">
      <strong>${g.name}</strong> (${g.urls.length} tabs)
      <button data-restore="${i}">Restore</button>
      <button data-delete="${i}">Delete</button>
    </div>
  `
    )
    .join("");

  // Attach handlers
  container.querySelectorAll("[data-restore]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const index = Number((btn as HTMLElement).dataset.restore);
      const result = await msg.send("restoreGroup", { index });
      showStatus(`Opened ${result.tabsOpened} tabs`);
    });
  });

  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const index = Number((btn as HTMLElement).dataset.delete);
      await msg.send("deleteGroup", { index });
      await renderGroups();
    });
  });
}

function showStatus(text: string): void {
  const el = document.getElementById("status")!;
  el.textContent = text;
  setTimeout(() => (el.textContent = ""), 3000);
}

document.getElementById("save-btn")!.addEventListener("click", saveGroup);
renderGroups();
