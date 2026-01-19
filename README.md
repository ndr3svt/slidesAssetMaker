# LinkedIn Slides Maker

Minimal local LinkedIn carousel generator/editor.

## Setup
1. Copy `.env.example` → `.env` and set `OPENAI_API_KEY`.
2. Install deps: `bun install`

## Dev
- One command: `bun run dev`

Or in separate terminals:
- API: `bun run dev:api`
- UI: `bun run dev:ui`

Open `http://localhost:5173`.

## Build + serve (single Bun server)
1. Build UI: `bun run build`
2. Serve: `bun run start`

Open `http://localhost:3000`.
