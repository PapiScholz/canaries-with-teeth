// Deterministic UDI (0–100)
import { safe } from "./safe";

export function computeUDI(): number {
  let score = 100;
  // LCP
  const lcp = safe(() => {
    const entries = performance.getEntriesByType("largest-contentful-paint");
    return entries && entries.length ? entries[entries.length - 1] : undefined;
  });
  if (lcp && lcp.startTime > 2500) score -= 20;
  // INP (experimental)
  const inp = safe(() => {
    const entries = performance.getEntriesByType("event").filter((e: any) => e.name === "incremental-input");
    return entries && entries.length ? entries[entries.length - 1] : undefined;
  });
  if (inp && inp.duration > 200) score -= 15;
  // Long tasks
  const longTasks = safe(() => performance.getEntriesByType("longtask")) || [];
  if (longTasks.length > 0) score -= Math.min(20, longTasks.length * 2);
  // UI errors
  const errorCount = (window as any).__canariesErrorCount || 0;
  score -= Math.min(20, errorCount * 5);
  // DOM size
  const domSize = safe(() => document.getElementsByTagName("*").length) || 0;
  if (domSize > 1500) score -= 10;
  // Interactive count (focusable elements)
  const interactive = safe(() => document.querySelectorAll("a,button,input,select,textarea,[tabindex]").length) || 0;
  if (interactive > 100) score -= 5;
  return Math.max(0, Math.min(100, score));
}
