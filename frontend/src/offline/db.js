import { openDB } from "idb";

const DB_NAME = "swep-scanner";
const DB_VERSION = 1;

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("roster")) {
        db.createObjectStore("roster", { keyPath: "session_id" });
      }
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "client_uuid" });
      }
      if (!db.objectStoreNames.contains("recorded")) {
        // Tracks (student_id + direction) already recorded THIS session, for instant local feedback.
        db.createObjectStore("recorded", { keyPath: "key" });
      }
    },
  });
}

export async function cacheRoster(payload) {
  const db = await getDb();
  await db.put("roster", payload);
}

export async function getCachedRoster(sessionId) {
  const db = await getDb();
  return db.get("roster", Number(sessionId));
}

export async function queueScan(scan) {
  const db = await getDb();
  await db.put("queue", scan);
  await db.put("recorded", { key: `${scan.student_id}:${scan.direction}`, scan });
}

export async function getQueuedScans() {
  const db = await getDb();
  return db.getAll("queue");
}

export async function clearQueuedScan(clientUuid) {
  const db = await getDb();
  await db.delete("queue", clientUuid);
}

export async function isAlreadyRecorded(studentId, direction) {
  const db = await getDb();
  const row = await db.get("recorded", `${studentId}:${direction}`);
  return Boolean(row);
}

export async function getRecordedForSession() {
  const db = await getDb();
  return db.getAll("recorded");
}

export async function clearSessionData() {
  const db = await getDb();
  await db.clear("recorded");
  await db.clear("queue");
}
