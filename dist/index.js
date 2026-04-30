// index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import bandRoute from "./routes/band-routes.js";
import albumRoute from "./routes/album-routes.js";
import memberRouter from "./routes/member.js";
import searchRouter from "./routes/search.js";
import labelRouter from "./routes/label-routes.js";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
const app = new Hono();
app.use("*", logger());
// CORS : autorise uniquement l'app locale et la variable d'env EXPO_PUBLIC_API_URL
const allowedOrigins = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
];
app.use("*", cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    allowMethods: ["GET"],
}));
// Rate limiting : 60 requêtes / minute par IP
const rateCounts = new Map();
app.use("*", async (c, next) => {
    const ip = c.req.header("x-forwarded-for") ?? "unknown";
    const now = Date.now();
    const window = 60_000;
    const max = 60;
    let entry = rateCounts.get(ip);
    if (!entry || now > entry.reset) {
        entry = { count: 0, reset: now + window };
        rateCounts.set(ip, entry);
    }
    entry.count++;
    if (entry.count > max) {
        return c.json({ error: "Too many requests" }, 429);
    }
    // Nettoyage périodique
    if (rateCounts.size > 10_000) {
        for (const [k, v] of rateCounts) {
            if (now > v.reset)
                rateCounts.delete(k);
        }
    }
    return next();
});
app.route("/", bandRoute);
app.route("/", albumRoute);
app.route("/", memberRouter);
app.route("/", searchRouter);
app.route("/", labelRouter);
serve({ fetch: app.fetch, port: 3000 }, () => console.log("🎸  http://localhost:3000/band/7"));
