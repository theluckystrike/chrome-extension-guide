/**
 * Tab Manager with Storage - Popup UI
 *
 * Demonstrates: mv3-messaging (sendToBackground) + chrome-permissions-guard
 */

import { sendToBackground } from "@theluckystrike/mv3-messaging";
import {
  hasPermission,
  requestPermission,
} from "@theluckystrike/chrome-permissions-guard";

interface TabGroup {
  name: string;
  urls: string[];
  createdAt: number;
}

async function ensureTabsPermission(): Promise<boolean> {
  if (await hasPermission("tabs")) return true;
  return requestPermission("tabs");
}

async function saveGroup(): Promise<void> {
  const hasPerm = await ensureTabsPermission();
  if (!hasPerm) {
    showStatus("Tabs permission required to save tab URLs");
    return;
  }

  const name = prompt("Group name:");
  if (!name) return;

  const result = await sendToBackground<
    { groupName: string },
    { success: boolean; groupCount: number }
  >("saveCurrentTabs", { groupName: name });

  if (result.success) {
    showStatus(`Saved! (${result.groupCount} groups total)`);
    await renderGroups();
  } else {
    showStatus("Max groups reached. Delete one first.");
  }
}

async function renderGroups(): Promise<void> {
  const groups = await sendToBackground<void, TabGroup[]>(
    "getSavedGroups",
    undefined as unknown as void
  );
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

  container.querySelectorAll("[data-restore]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const index = Number((btn as HTMLElement).dataset.restore);
      const result = await sendToBackground<
        { index: number },
        { tabsOpened: number }
      >("restoreGroup", { index });
      showStatus(`Opened ${result.tabsOpened} tabs`);
    });
  });

  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const index = Number((btn as HTMLElement).dataset.delete);
      await sendToBackground<{ index: number }, { success: boolean }>(
        "deleteGroup",
        { index }
      );
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
