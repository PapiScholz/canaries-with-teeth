// Observers for errors, long tasks, navigation, paint, LCP, INP
import { TelemetryV1 } from "./contracts";
import { getSessionId } from "./ids";
import { computeUDI } from "./udi";
import { safe } from "./safe";

export type EventCallback = (event: TelemetryV1) => void;

const metrics: { lcp?: any; inp?: any; longtasks: any[]; errors: any[]; paints: any[]; navs: any[] } = {
  longtasks: [], errors: [], paints: [], navs: []
};

export function observeAll(cb: EventCallback) {
  // JS errors
  safe(() => window.addEventListener("error", (e) => {
    (window as any).__canariesErrorCount = ((window as any).__canariesErrorCount || 0) + 1;
    const ev = makeEvent("error", { message: e.message, stack: e.error?.stack, filename: e.filename, lineno: e.lineno, colno: e.colno });
    metrics.errors.push(ev);
    cb(ev);
  }, true));
  // Unhandled promise rejections
  safe(() => window.addEventListener("unhandledrejection", (e) => {
    (window as any).__canariesErrorCount = ((window as any).__canariesErrorCount || 0) + 1;
    const ev = makeEvent("unhandledrejection", { reason: e.reason });
    metrics.errors.push(ev);
    cb(ev);
  }));
  // Long tasks
  safe(() => {
    if ((window as any).PerformanceObserver) {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "longtask") {
            const ev = makeEvent("longtask", { startTime: entry.startTime, duration: entry.duration });
            metrics.longtasks.push(ev);
            cb(ev);
          }
        }
      });
      obs.observe({ entryTypes: ["longtask"] });
    }
  });
  // Navigation timings
  safe(() => {
    for (const nav of performance.getEntriesByType("navigation")) {
      const ev = makeEvent("navigation", nav.toJSON ? nav.toJSON() : nav);
      metrics.navs.push(ev);
      cb(ev);
    }
  });
  // Paint entries
  safe(() => {
    for (const paint of performance.getEntriesByType("paint")) {
      const ev = makeEvent("paint", paint.toJSON ? paint.toJSON() : paint);
      metrics.paints.push(ev);
      cb(ev);
    }
  });
  // LCP
  safe(() => {
    if ((window as any).PerformanceObserver) {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "largest-contentful-paint") {
            const ev = makeEvent("lcp", entry.toJSON ? entry.toJSON() : entry);
            metrics.lcp = ev;
            cb(ev);
          }
        }
      });
      obs.observe({ type: "largest-contentful-paint", buffered: true } as any);
    }
  });
  // INP (experimental)
  safe(() => {
    if ((window as any).PerformanceObserver) {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "event" && entry.name === "incremental-input") {
            const ev = makeEvent("inp", entry.toJSON ? entry.toJSON() : entry);
            metrics.inp = ev;
            cb(ev);
          }
        }
      });
      obs.observe({ type: "event", buffered: true } as any);
    }
  });
}

function makeEvent(type: TelemetryV1["type"], data: Record<string, any>): TelemetryV1 {
  const sessionId = getSessionId();
  const udi = computeUDI();
  const ts = Date.now();
  const dedupKey = `${type}:${JSON.stringify(data)}:${sessionId}`;
  return { v: 1, type, ts, sessionId, dedupKey, udi, data };
}
