// index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import bandRoute from "./routes/routes.js";
import albumRoute from "./routes/album-routes.js";
import memberRouter from "./routes/member.js";
import searchRouter from "./routes/search.js";

const app = new Hono();
app.route("/", bandRoute);
app.route("/", albumRoute);
app.route("/", memberRouter);
app.route("/", searchRouter);

serve({ fetch: app.fetch, port: 3000 }, () =>
  console.log("🎸  http://localhost:3000/band/7")
);
