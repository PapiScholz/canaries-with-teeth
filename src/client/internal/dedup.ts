// Deduplication logic (memory + sessionStorage)
import { SESSION_STORAGE_KEY, DEDUP_TTL_MS } from "./constants";
import { safe } from "./safe";

const memoryDedup: Record<string, number> = {};

function trimDedup(store: Record<string, number>, now: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k in store) {
    if (now - store[k] < DEDUP_TTL_MS) out[k] = store[k];
  }
  return out;
}

export function isDuplicate(dedupKey: string): boolean {
  const now = Date.now();
  // In-memory check
  if (memoryDedup[dedupKey] && now - memoryDedup[dedupKey] < DEDUP_TTL_MS) return true;
  // sessionStorage check
  const raw = safe(() => sessionStorage.getItem(SESSION_STORAGE_KEY));
  let store: Record<string, number> = {};
  if (raw) {
    try { store = JSON.parse(raw); } catch {}
  }
  if (store[dedupKey] && now - store[dedupKey] < DEDUP_TTL_MS) return true;
  // Set and trim
  memoryDedup[dedupKey] = now;
  store[dedupKey] = now;
  const trimmed = trimDedup(store, now);
  safe(() => sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(trimmed)));
  return false;
}
