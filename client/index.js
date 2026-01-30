// Drop-in Telemetry SDK for MODE 0
// Usage: import { initCanaries } from "canaries-with-teeth/client";
//        initCanaries();

function dedupe(events) {
  const seen = new Set();
  return events.filter(e => {
    const key = JSON.stringify(e);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function emit(event) {
  try {
    const fs = window.require ? window.require('fs') : null;
    if (fs) {
      // Node: persist to NDJSON
      fs.appendFileSync('canaries-artifacts/telemetry.ndjson', JSON.stringify(event) + '\n');
    } else {
      // Browser: localStorage fallback
      const arr = JSON.parse(localStorage.getItem('canaries-telemetry') || '[]');
      arr.push(event);
      localStorage.setItem('canaries-telemetry', JSON.stringify(dedupe(arr)));
    }
  } catch {}
}

function captureErrors() {
  window.addEventListener('error', e => {
    emit({ type: 'js-error', message: e.message, stack: e.error?.stack, ts: Date.now() });
  });
  window.addEventListener('unhandledrejection', e => {
    emit({ type: 'promise-rejection', reason: e.reason, ts: Date.now() });
  });
}

function captureLongTasks() {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.duration > 50) emit({ type: 'long-task', duration: entry.duration, ts: Date.now() });
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {}
  }
}

function captureNavigation() {
  window.addEventListener('DOMContentLoaded', () => {
    emit({ type: 'navigation', timing: performance.timing, ts: Date.now() });
  });
}

function captureWebVitals() {
  // INP/LCP if available
  if (window.INP) emit({ type: 'inp', value: window.INP, ts: Date.now() });
  if (window.LCP) emit({ type: 'lcp', value: window.LCP, ts: Date.now() });
}

function emitUDI() {
  emit({ type: 'udi', id: navigator.userAgent + '-' + Date.now(), ts: Date.now() });
}

function initCanaries() {
  try {
    captureErrors();
    captureLongTasks();
    captureNavigation();
    captureWebVitals();
    emitUDI();
  } catch {}
}

module.exports = { initCanaries };
