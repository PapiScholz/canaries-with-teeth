// Silent-fail wrappers
// Strict silent-fail helpers
export function safe<T>(fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export async function safeAsync<T>(fn: () => Promise<T>, fallback?: T): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
