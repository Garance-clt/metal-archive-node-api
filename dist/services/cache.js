const MAX_ENTRIES = 500; // ~500 pages max en mémoire
const mem = new Map();
export default {
    get(key) {
        const e = mem.get(key);
        if (!e)
            return null;
        if (e.exp <= Date.now()) {
            mem.delete(key);
            return null;
        }
        // LRU : remettre en fin de Map
        mem.delete(key);
        mem.set(key, e);
        return e.html;
    },
    set(key, html, ttl) {
        if (mem.has(key))
            mem.delete(key);
        // Éviction de l'entrée la plus ancienne si limite atteinte
        if (mem.size >= MAX_ENTRIES) {
            mem.delete(mem.keys().next().value);
        }
        mem.set(key, { html, exp: Date.now() + ttl });
    },
};
