export const portable = import.meta.env.VITE_PORTABLE === 'true';
const memory = new Map<string, string>();
const prefix = portable ? 'tracelearn-portable-v1:' : '';

export const preferences = {
  get(key: string): string | null {
    try { return localStorage.getItem(prefix + key) ?? memory.get(prefix + key) ?? null; }
    catch { return memory.get(prefix + key) ?? null; }
  },
  set(key: string, value: string) {
    memory.set(prefix + key, value);
    try { localStorage.setItem(prefix + key, value); } catch { /* Export remains available. */ }
  }
};
