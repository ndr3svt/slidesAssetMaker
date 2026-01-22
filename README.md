# LinkedIn Slides Maker

Minimal local LinkedIn carousel generator/editor.

## License
MIT — see `LICENSE`.

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

## Vercel (frontend + serverless API)
- Framework preset: Vite
- Build: `bun run build`
- Output: `dist`
- Add env vars in Vercel:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (optional, default `gpt-5.2`)
- Serverless endpoints live in `api/` (e.g. `POST /api/generate`).


## run tests locally 
This will check for type errors and build errors.
To run tests locally, run the following command:
```bash 
bunx tsc -p tsconfig.json --noEmit && bunx vite build
```
