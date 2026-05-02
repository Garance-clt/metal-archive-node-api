# metallum-api

Node.js API that scrapes [metal-archives.com](https://www.metal-archives.com) and exposes the data as JSON.  
Built with [Hono](https://hono.dev) + TypeScript. Runs on Node 22.

> **Disclaimer** — I am not the author of Metal Archives. This is the backend for a personal project from a metal fan who wanted an Android app to browse the site more easily. Not affiliated with Metal Archives in any way, not for commercial use.

---

## Requirements

- Node.js 22+
- `curl` installed (used to make requests to MA)

---

## Install

```bash
npm install
```

---

## Development

```bash
npm run dev
```

Starts the server with hot-reload at `http://localhost:3000`.

---

## Production

```bash
npm run build   # compile TypeScript → dist/
npm start       # run dist/index.js
```

Optional environment variable:

```
PORT=3000   # listening port (default: 3000)
```

---

## Docker

```bash
# build
docker build -t metallum-api .

# run
docker run -p 3000:3000 metallum-api
```

Or with docker compose (includes Traefik for deployment):

```bash
docker compose up -d
```

---

## Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/band/:id` | Band info |
| GET | `/band/:id/discog` | Full discography |
| GET | `/band/:id/similar` | Similar bands |
| GET | `/band/:id/links` | External links |
| GET | `/member/:id` | Artist profile |
| GET | `/albums/:id` | Album details |
| GET | `/albums/:id/cover` | Album cover (proxy) |
| GET | `/search/bands?q=` | Search bands |
| GET | `/search/artists?q=` | Search artists |
| GET | `/search/albums?q=` | Search albums |
| GET | `/search/songs?q=` | Search songs |
| GET | `/search/labels?q=` | Search labels |
| GET | `/label/:id` | Label info |
| GET | `/label/:id/roster` | Label bands |
| GET | `/label/:id/releases` | Label releases |
| GET | `/home/upcoming` | Upcoming releases |
| GET | `/home/latest` | Latest releases |
| GET | `/home/random-band` | Random band |
| GET | `/home/bands-by-country` | Bands by country |

---

## Notes

- Responses are cached in memory (TTL 5 min, max 60 MB).
- Cache is automatically cleared when MA returns invalid HTML (Cloudflare rate-limiting).
- Parallel requests to MA are capped at 12 concurrent.
