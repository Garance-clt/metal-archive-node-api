// services/cache.ts
import { TTL_MS } from "../utils/constants.js";

type Entry = { html: string; exp: number };
const mem = new Map<string, Entry>();

export default {
  get(key: string) {
    const e = mem.get(key);
    return e && e.exp > Date.now() ? e.html : null;
  },
  set(key: string, html: string, ttl: number) {
    mem.set(key, { html, exp: Date.now() + TTL_MS });
  },
};
