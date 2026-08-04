# Memory — Kimi AI provider, test generation, UI redesign

Last updated: 2026-08-04 (evening)

## UI redesign (design skill: variance 8, motion 6, density 4)

- Full UX/UI rewrite of all 10 pages. System: zinc off-white base (#fafafa), ONE accent (deep emerald hsl(158 74% 30%)), no gradients (old blue/indigo/purple/pink gradients all removed), no glows, no pure black (zinc-950), hairline borders, diffusion shadows.
- Fonts: Outfit (sans) + JetBrains Mono (mono for codes/numbers), via next/font/google with cyrillic subsets, CSS vars `--font-sans`/`--font-mono` wired in tailwind.config.js fontFamily.
- Motion is pure CSS: `animate-enter` staggered cascade (child sets `style={{'--index': n}}`), `breathing-dot` status pulse, tactile button press (in button.jsx). No framer-motion.
- New shared components in `components/`: `logo-mark.jsx`, `app-header.jsx` (sticky header, owns logout), `empty-state.jsx`, `loading-screen.jsx` (skeleton based).
- shadcn primitives restyled in place: button.jsx (rounded-lg, tactile, emerald), card.jsx, badge.jsx (soft pill variants), input.jsx, textarea.jsx, dialog.jsx (zinc overlay, rounded-2xl), skeleton.jsx.
- Pages keep ALL fetch/state/handler logic identical; only JSX classes/structure changed. Student room page: sticky submit bar with answered count, custom radio rows, X icon replaces "✕", ArrowLeftRight replaces "↔". Login page: dead signup code dropped, split screen (dark zinc-950 brand panel left / form right).
- Verified: `next build` green, `next start` smoke test shows new classes + font vars.



## Standing preferences

- **Package manager: bun, for ALL of the user's apps.** Never use pnpm or npm to install or manage packages. Use `bun install` / `bun add` / `bun remove` / `bun run`. This project's pnpm files were removed; `bun.lock` is the lockfile.

## What was built

- `lib/kimi.js`: OpenAI SDK client pointed at the user's Modal hosted Kimi K3 endpoint (reads `MODAL_PROXY_TOKEN_ID` and `MODAL_PROXY_TOKEN_SECRET` from `.env`). Exports `chat`, `chatCompletion`, `chatCompletionStream`, `parseGeneratedJson`, `DEFAULT_MODEL`.
- `app/api/generate-test/route.js`: streams NDJSON events (`delta`, `done`, `error`) from the model; `done` carries the parsed variants JSON.
- `app/api/generate-test-from-file/route.js`: new. Accepts multipart upload (PDF or DOCX) plus generation fields, extracts text, streams the same NDJSON protocol.
- `lib/extract-text.js`: new. Per page PDF text with `--- Саҳифаи N ---` markers (pdf-parse v2), DOCX text via mammoth.
- `app/teacher/tests/create/page.js`: generation dialog is driven by the real stream (char count, live preview, estimate based progress). Shared `readGenerationStream(res, onDelta)` helper. File upload section with a description input for user instructions (for example page ranges).

## Decisions made

- OpenRouter removed entirely (`lib/groq.js` deleted, `OPENROUTER_API_KEY` dropped from `.env`).
- pdf-parse is v2 (`PDFParse` class API), NOT the old v1 `pdf(buffer)` function.
- pdf-parse and mammoth are in `serverExternalPackages` in next.config.js (needed so bundling does not break pdfjs).
- Generation endpoints stream NDJSON; the final `done` event is the structured JSON `{success, variants}`.

## Current state

- `next build` passes. Both upload paths verified end to end with curl against the dev server: DOCX and PDF produce a `done` event with generated Tajik questions.
- `.env` still has EMPTY `MODAL_PROXY_TOKEN_ID` and `MODAL_PROXY_TOKEN_SECRET`; the endpoint answered during testing anyway, but real values should be filled in.

## Next session starts with

- Fill the Modal proxy tokens in `.env` if generation starts failing with auth errors.

## Open questions

- None open.
