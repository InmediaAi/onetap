/**
 * Tiny IndexedDB stash for the FIFA funnel's OAuth round-trip.
 *
 * The funnel holds the user's photos as data URLs; when a logged-out user taps
 * "Generate" we sign them in via OAuth (a full page redirect) and must restore
 * their selections + photos on return. sessionStorage caps at ~5MB and silently
 * throws on a large photo, so we use IndexedDB (far larger quota) instead.
 */

export interface CampaignStash {
  country: string;
  kitIdx: number;
  momentId: string | null;
  bodyImg: string | null;
  faceImg: string | null;
}

const DB_NAME = "onetap-campaign";
const STORE = "stash";
const KEY = "vf_resume";

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function putStash(value: CampaignStash): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

export async function getStash(): Promise<CampaignStash | null> {
  const db = await openDb();
  if (!db) return null;
  const out = await new Promise<CampaignStash | null>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as CampaignStash) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  db.close();
  return out;
}

export async function clearStash(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}
