import client from "../api/client";
import { getQueuedScans, clearQueuedScan } from "./db";

let syncing = false;

export async function trySync() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    const scans = await getQueuedScans();
    if (scans.length === 0) return;

    const { data } = await client.post("/attendance/scans/batch/", { scans });
    for (const clientUuid of data.accepted) {
      await clearQueuedScan(clientUuid);
    }
    // Rejected-as-duplicate entries are also safe to drop locally — the
    // server already has an authoritative record for that direction.
    for (const rejection of data.rejected || []) {
      if (rejection.reason === "duplicate_direction") {
        await clearQueuedScan(rejection.client_uuid);
      }
    }
  } catch {
    // Network hiccup — the queue stays put and the next trySync() retries.
  } finally {
    syncing = false;
  }
}

export function startAutoSync(intervalMs = 5000) {
  const id = setInterval(trySync, intervalMs);
  window.addEventListener("online", trySync);
  return () => {
    clearInterval(id);
    window.removeEventListener("online", trySync);
  };
}
