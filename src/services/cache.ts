// services/cache.ts
type Entry = { html: string; exp: number; size: number };

const MAX_ENTRIES = 500;
const MAX_BYTES = 60 * 1024 * 1024; // 60 MB max in memory
const mem = new Map<string, Entry>();
let totalBytes = 0;

function evictOldest() {
  const key = mem.keys().next().value!;
  const entry = mem.get(key)!;
  totalBytes -= entry.size;
  mem.delete(key);
}

export default {
  get(key: string) {
    const e = mem.get(key);
    if (!e) return null;
    if (e.exp <= Date.now()) {
      totalBytes -= e.size;
      mem.delete(key);
      return null;
    }
    // LRU : remettre en fin de Map
    mem.delete(key);
    mem.set(key, e);
    return e.html;
  },
  set(key: string, html: string, ttl: number) {
    const size = Buffer.byteLength(html, "utf8");
    if (mem.has(key)) {
      totalBytes -= mem.get(key)!.size;
      mem.delete(key);
    }
    // Éviction si limite entries ou mémoire dépassée
    while (mem.size >= MAX_ENTRIES || totalBytes + size > MAX_BYTES) {
      if (mem.size === 0) break;
      evictOldest();
    }
    mem.set(key, { html, exp: Date.now() + ttl, size });
    totalBytes += size;
  },
  delete(key: string) {
    const entry = mem.get(key);
    if (entry) {
      totalBytes -= entry.size;
      mem.delete(key);
    }
  },
};
