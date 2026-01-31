// Telemetry SDK: Public API
let started = false;

export function initCanaries(): void {
  if (started) return;
  started = true;
  InternalCanaries.init();
}

// --- Internal Implementation (not exported) ---
namespace InternalCanaries {
  // --- Constants ---
  const VERSION = 1;
  const FLUSH_INTERVAL = 5000;
  const DEDUP_TTL = 60000;
  const NDJSON_KEY = "canaries-telemetry-ndjson";
  const SESSION_KEY = "canaries-telemetry-dedup";
  const SESSION_ID_KEY = "canaries-session-id";
  const BUILD_ID = getBuildId();
  const TIME_ORIGIN = performance.timeOrigin || performance.timing.navigationStart || Date.now();

  // --- Types ---
  type EventV1 = {
    v: 1;
    id: string;
    ts: number;
    timeOrigin: number;
    buildId: string;
    sessionId: string;
    page: string;
    url: string;
    dedupKey: string;
    payload: Record<string, any>;
  };

  // --- State ---
  let batch: EventV1[] = [];
  let dedup: Record<string, number> = {};
  let flushTimer: any = null;
  let sessionId = getSessionId();

  // --- Init ---
  export function init() {
    safe(() => {
      window.addEventListener("error", onError, true);
      window.addEventListener("unhandledrejection", onUnhandledRejection);
      observePerformance();
      flushTimer = setInterval(flush, FLUSH_INTERVAL);
      window.addEventListener("pagehide", flush, { once: false });
      window.addEventListener("beforeunload", flush, { once: false });
    });
  }

  // --- Event Capture ---
  function onError(e: ErrorEvent) {
    emit({
      type: "js-error",
      message: e.message,
      stack: e.error?.stack,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno
    });
  }
  function onUnhandledRejection(e: PromiseRejectionEvent) {
    emit({
      type: "unhandledrejection",
      reason: sanitize(e.reason)
    });
  }
  function observePerformance() {
    safe(() => {
      // Navigation
      for (const nav of performance.getEntriesByType("navigation")) {
        emit({ type: "navigation", ...nav.toJSON?.() });
      }
      // Paint
      for (const paint of performance.getEntriesByType("paint")) {
        emit({ type: "paint", ...paint.toJSON?.() });
      }
      // Long Tasks
      if (window.PerformanceObserver) {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "longtask") {
              emit({ type: "longtask", startTime: entry.startTime, duration: entry.duration });
            }
          }
        });
        obs.observe({ entryTypes: ["longtask"] });
      }
      // LCP
      if (window.PerformanceObserver) {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "largest-contentful-paint") {
              emit({ type: "lcp", ...entry.toJSON?.() });
            }
          }
        });
        obs.observe({ type: "largest-contentful-paint", buffered: true } as any);
      }
      // INP (experimental)
      if (window.PerformanceObserver) {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "event" && (entry as any).name === "incremental-input") {
              emit({ type: "inp", ...(entry as any).toJSON?.() });
            }
          }
        });
        obs.observe({ type: "event", buffered: true } as any);
      }
    });
  }

  // --- Emit ---
  function emit(payload: Record<string, any>) {
    safe(() => {
      const now = Date.now();
      const page = safe(() => window.document.title) || "";
      const url = safe(() => window.location.href) || "";
      const dedupKey = makeDedupKey(payload, sessionId, page, url);
      if (isDuplicate(dedupKey, now)) return;
      const event: EventV1 = {
        v: VERSION,
        id: makeId(payload, now, sessionId),
        ts: now,
        timeOrigin: TIME_ORIGIN,
        buildId: BUILD_ID,
        sessionId,
        page,
        url,
        dedupKey,
        payload: sanitize(payload)
      };
      batch.push(event);
      if (batch.length >= 10) flush();
    });
  }

  // --- Deduplication ---
  function isDuplicate(key: string, now: number): boolean {
    trimDedup(now);
    if (dedup[key] && now - dedup[key] < DEDUP_TTL) return true;
    dedup[key] = now;
    safe(() => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(dedup));
    });
    return false;
  }
  function trimDedup(now: number) {
    if (!dedup || typeof dedup !== "object") dedup = {};
    for (const k in dedup) {
      if (now - dedup[k] > DEDUP_TTL) delete dedup[k];
    }
    // Persist
    safe(() => {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(dedup));
    });
  }

  // --- Flush ---
  function flush() {
    safe(() => {
      if (!batch.length) return;
      const toSend = batch.slice();
      batch = [];
      if (hasBackend()) {
        sendBatch(toSend);
      } else {
        persistNDJSON(toSend);
      }
    });
  }

  function sendBatch(events: EventV1[]) {
    safe(() => {
      const url = getBackendUrl();
      if (navigator.sendBeacon && url) {
        try {
          navigator.sendBeacon(url, JSON.stringify(events));
          return;
        } catch {}
      }
      if (url) {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(events),
          keepalive: true
        }).catch(() => {});
      }
    });
  }

  function persistNDJSON(events: EventV1[]) {
    safe(() => {
      const lines = events.map(e => JSON.stringify(e)).join("\n") + "\n";
      // Try IndexedDB
      if (window.indexedDB) {
        const req = indexedDB.open(NDJSON_KEY, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore("events", { autoIncrement: true });
        };
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction("events", "readwrite");
            tx.objectStore("events").add(lines);
          } catch {
            fallbackLocalStorage(lines);
          }
        };
        req.onerror = () => fallbackLocalStorage(lines);
      } else {
        fallbackLocalStorage(lines);
      }
    });
  }
  function fallbackLocalStorage(lines: string) {
    safe(() => {
      const prev = localStorage.getItem(NDJSON_KEY) || "";
      localStorage.setItem(NDJSON_KEY, prev + lines);
    });
  }

  // --- Helpers ---
  function getSessionId(): string {
    let id = safe(() => sessionStorage.getItem(SESSION_ID_KEY));
    if (!id) {
      id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      safe(() => sessionStorage.setItem(SESSION_ID_KEY, id));
    }
    return id || "";
  }
  function getBuildId(): string {
    // Try global, meta, or fallback
    return (
      safe(() => (window as any).CANARIES_BUILD_ID) ||
      safe(() => document.querySelector('meta[name="build-id"]')?.getAttribute("content")) ||
      "dev"
    );
  }
  function getBackendUrl(): string | undefined {
    return safe(() => (window as any).CANARIES_BACKEND_URL) || undefined;
  }
  function hasBackend(): boolean {
    return !!getBackendUrl();
  }
  function makeId(payload: any, ts: number, sessionId: string): string {
    return hash(`${JSON.stringify(payload)}|${ts}|${sessionId}`);
  }
  function makeDedupKey(payload: any, sessionId: string, page: string, url: string): string {
    return hash(`${JSON.stringify(payload)}|${sessionId}|${page}|${url}`);
  }
  function hash(str: string): string {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
    return Math.abs(h).toString(36);
  }
  function sanitize(obj: any): any {
    if (obj == null) return obj;
    if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    if (typeof obj === "object") {
      const out: Record<string, any> = {};
      for (const k in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          try {
            out[k] = sanitize(obj[k]);
          } catch {}
        }
      }
      return out;
    }
    return undefined;
  }
  function safe<T>(fn: () => T, fallback?: T): T | undefined {
    try { return fn(); } catch { return fallback; }
  }
}
