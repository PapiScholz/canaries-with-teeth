// Main emitter: dedup, batch, persist, POST
import { observeAll } from "./observers";
import { isDuplicate } from "./dedup";
import { postBatch } from "./backend";
import { appendNDJSON } from "./ndjson-store";
import type { TelemetryV1 } from "./contracts";
import { safeAsync } from "./safe";

let started = false;
let batch: TelemetryV1[] = [];

async function flushBatch() {
  if (!batch.length) return;
  const toSend = batch.slice();
  batch = [];
  const ok = await safeAsync(() => postBatch(toSend), false);
  if (!ok) {
    for (const ev of toSend) await safeAsync(() => appendNDJSON(JSON.stringify(ev)));
  }
}

export function initCanaries() {
  if (started) return;
  started = true;
  observeAll((event) => {
    if (isDuplicate(event.dedupKey)) return;
    batch.push(event);
    if (batch.length >= 10) flushBatch();
  });
  // Periodic flush
  setInterval(flushBatch, 5000);
  // Flush on pagehide/unload
  window.addEventListener("pagehide", flushBatch);
  window.addEventListener("beforeunload", flushBatch);
}
