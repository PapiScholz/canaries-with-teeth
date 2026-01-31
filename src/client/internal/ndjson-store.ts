// NDJSON store: IndexedDB preferred, fallback to localStorage
import { NDJSON_STORE_KEY } from "./constants";
import { safe, safeAsync } from "./safe";

function getDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    const req = indexedDB.open("canaries-telemetry", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("events", { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function appendNDJSON(line: string) {
  const db = await safeAsync(() => getDB());
  if (db) {
    await safeAsync(async () => {
      const tx = db.transaction("events", "readwrite");
      tx.objectStore("events").add(line);
    });
    return;
  }
  // Fallback: localStorage
  const prev = safe(() => localStorage.getItem(NDJSON_STORE_KEY)) || "";
  safe(() => localStorage.setItem(NDJSON_STORE_KEY, prev + line + "\n"));
}

export async function getAllNDJSON(): Promise<string[]> {
  const db = await safeAsync(() => getDB());
  if (db) {
    const result = await safeAsync(() => new Promise<string[]>((resolve) => {
      const tx = db.transaction("events", "readonly");
      const store = tx.objectStore("events");
      const req = store.openCursor();
      const lines: string[] = [];
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          lines.push(cursor.value);
          cursor.continue();
        } else {
          resolve(lines);
        }
      };
      req.onerror = () => resolve([]);
    }), [] as string[]);
    return result ?? [];
  }
  // Fallback: localStorage
  const raw = safe(() => localStorage.getItem(NDJSON_STORE_KEY)) || "";
  return raw.split("\n").filter(Boolean);
}
