## LinkedIn Slides Maker (Local)

Build a minimal, neat web app that helps generate and edit LinkedIn carousel slides.

### Goals
- Generate a carousel deck (4–10 slides) from a short prompt using OpenAI.
- Let users quickly edit slide copy and basic styles (font/size/weight/color/alignment).
- Match a clean dark UI similar to `image.png`: left settings panel, center slide strip, right properties panel, top toolbar.

### Non-goals (for now)
- Full drag-and-drop editor
- Accounts/authentication
- Cloud storage

### Core flows
1. User enters a topic/prompt and clicks Generate.
2. App calls local Bun API (`/api/generate`) which calls OpenAI and returns a deck JSON.
3. User selects a slide, edits title/body, tweaks typography and background.

### Data model
- Deck: title + list of slides
- Slide: title, subtitle (optional), body, bullets (optional), footer (optional)

### Tech constraints
- Frontend: React + Vite + Tailwind + shadcn/ui components.
- Backend: lightweight Bun server with an OpenAI proxy endpoint.
- Config: read `OPENAI_API_KEY` from `.env` (and optional `OPENAI_MODEL`).

### Parked TODOs
- Export deck as PDF (button currently disabled/no-op).
- Improve AI Generate error handling (avoid raw HTML/error dumps in UI).
