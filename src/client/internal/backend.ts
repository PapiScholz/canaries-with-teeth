// Backend batch POST (if configured)
import { BACKEND_URL } from "./constants";
import { safeAsync } from "./safe";
import type { IngestBatchV1 } from "./contracts";

export async function postBatch(events: IngestBatchV1): Promise<boolean> {
  if (!BACKEND_URL) return false;
  return await safeAsync(async () => {
    const res = await fetch(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events),
      keepalive: true,
    });
    return res.ok;
  }, false);
}
