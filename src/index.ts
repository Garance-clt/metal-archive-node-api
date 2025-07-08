// index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import bandRoute from "./routes/routes.js";
import albumRoute from "./routes/album-routes.js";
import memberRouter from "./routes/member.js";
import searchRouter from "./routes/search.js";
import { logger } from "hono/logger";

const app = new Hono();
app.route("/", bandRoute);
app.route("/", albumRoute);
app.route("/", memberRouter);
app.route("/", searchRouter);

app.use("*", logger());

serve({ fetch: app.fetch, port: 3000 }, () =>
  console.log("🎸  http://localhost:3000/band/7")
);
