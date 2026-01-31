// Canary metrics and stats for universal E2E canary

export class CanaryStats {
  samples: number[] = [];

  addSample(ms: number) {
    this.samples.push(ms);
  }

  p95(): number {
    if (this.samples.length === 0) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    const idx = Math.ceil(0.95 * sorted.length) - 1;
    return sorted[idx];
  }

  assertConservativeP95(maxMs: number = 10000) {
    const p95 = this.p95();
    if (p95 > maxMs) {
      throw new Error(`Canary p95 exceeded: ${p95}ms > ${maxMs}ms`);
    }
  }
}

export async function timedStep<T>(label: string, fn: () => Promise<T>, stats?: CanaryStats): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    return result;
  } finally {
    const elapsed = Date.now() - start;
    if (stats) stats.addSample(elapsed);
    // Optionally log for debug, but silent by default
    // console.log(`[Canary] Step '${label}' took ${elapsed}ms`);
  }
}
