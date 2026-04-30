const mem = new Map();
export default {
    get(key) {
        const e = mem.get(key);
        return e && e.exp > Date.now() ? e.html : null;
    },
    set(key, html, ttl) {
        mem.set(key, { html, exp: Date.now() + ttl });
    },
};
