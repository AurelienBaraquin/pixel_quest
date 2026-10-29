# PixelQuest: Retro Narrative Console

An AI-driven text adventure in a retro CRT console: Gemini writes each scene as structured JSON (story, choices, damage, items, game over) and illustrates it with generated 1-bit pixel art.

**Live demo: [aurelienb.com/pixel-quest](https://aurelienb.com/pixel-quest)** (the in-game text is in French)

## Features

- **Four themes** to start an adventure: medieval fantasy, cyberpunk, Lovecraftian horror, western.
- **Branching story**: every scene offers several choices, generated on the fly by the model.
- **Dice rolls**: risky choices trigger a 1-5 roll whose result is sent to the model and shapes the outcome (from critical failure to critical success).
- **Health and inventory**: 3 hearts, items gained along the way, and choices that require an item (using it guarantees success).
- **Game over** when health reaches zero or the story turns fatal.
- **Generated illustrations** for every scene, in a 1-bit pixel-art style.
- **Retro presentation**: CRT overlay and scanline effects; progress is saved in the browser (`localStorage`).

## How it works

1. The React client sends the player's action to `POST /pixel-quest/api/story` with the theme, history, inventory, current health and the dice roll (rolled client-side for risky choices).
2. The Express server validates the input (prompt length, 10 kB JSON body limit) and builds a cache key from the full game state.
3. If that exact state was already played, the scene is served from the database cache without calling the model.
4. Otherwise it calls Gemini (`gemini-2.5-flash-lite`) with a system prompt describing the game rules and a **`responseSchema`**, so the reply is guaranteed JSON: text, image prompt, choices (`isUnsafe`, `requiredItem`), `healthChange`, `itemGained`, `isGameOver`. Gemini safety filters are enabled.
5. The client then requests `POST /pixel-quest/api/image` with the scene's image prompt; the server calls `gemini-2.5-flash-image`, resizes and compresses the result to a 768x432 JPEG with **sharp**, and returns it as a data URL.
6. Scenes and images are stored in a libSQL database (Turso in production, a local SQLite file also works), so repeated paths cost no API call.
7. **Security**: the Gemini key stays on the server; `helmet` sets HTTP headers; `express-rate-limit` caps story requests at 20/min and image requests at 4/min per IP (`trust proxy` is set for running behind a reverse proxy).
8. In production a single container serves both the built front-end (static files with SPA fallback) and the API under `/pixel-quest`.

## Tech stack

| Layer | Tools |
|-------|-------|
| Front-end | React 19, TypeScript, Vite 6, Tailwind CSS 3 |
| Back-end | Node.js, Express 5, TypeScript (run with `tsx`) |
| AI | Google Gemini via `@google/genai` (structured JSON output + image generation) |
| Data | libSQL (`@libsql/client`), Turso or local SQLite |
| Images | sharp |
| Security | helmet, express-rate-limit, cors |
| Deployment | Docker (multi-stage, Node 24 Alpine, non-root user), docker compose |

## Run locally

Requirements: Node.js 24 (the Docker base image) and a Gemini API key.

Environment variables, read by the server (put them in `server/.env`):

| Name | Purpose |
|------|---------|
| `API_KEY` | Gemini API key |
| `TURSO_DATABASE_URL` | libSQL URL, e.g. a Turso URL or `file:pixelquest.db` for a local file |
| `TURSO_DATABASE_TOKEN` | Turso auth token (leave empty for a local file) |
| `PORT` | Optional, defaults to `3001` (`3000` in Docker) |

The server serves the built front-end from `server/public`, so build it first:

```bash
# Front-end
npm install
npm run build        # outputs dist/
cp -r dist server/public

# Server
cd server
npm ci
npm start            # http://localhost:3001/pixel-quest/
```

With Docker (expects `server/.env`, exposes the app on port 80):

```bash
docker compose up --build   # http://localhost/pixel-quest/
```

## Project layout

```
.
├── App.tsx              # game state: themes, choices, dice, health, inventory, save
├── apiClient.ts         # calls to /api/story and /api/image
├── types.ts             # StoryNode, Choice, GameState, Theme
├── components/
│   ├── Screen.tsx       # CRT screen: scene text, image, hearts, dice
│   └── Controls.tsx     # choice buttons
├── server/
│   ├── server.ts        # Express app: helmet, CORS, rate limits, routes, static files
│   ├── aiService.ts     # Gemini prompt + response schema, image generation, sharp
│   └── database.ts      # libSQL cache for scenes and images
├── Dockerfile           # multi-stage build: Vite front, then Express runtime
└── docker-compose.yml
```
