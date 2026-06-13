# Technology Overview

Technical reference for the Personal Assistant app: what each layer is built with, how the pieces fit together, and where the important code lives.

## Stack at a glance

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4 (PostCSS plugin), `clsx` + `tailwind-merge` |
| Client state | Zustand 5 |
| UI utilities | dnd-kit (drag-and-drop), Floating UI (popovers), lucide-react (icons), date-fns |
| Database | Cloudflare D1 (SQLite), accessed via the Cloudflare REST API |
| Hosting | Cloudflare Workers, built with `@opennextjs/cloudflare` |
| Scheduling | Cloudflare Workers cron triggers (`wrangler.toml` + `worker-cron.js`) |
| AI | OpenRouter through the OpenAI SDK (default model `anthropic/claude-opus-4`) |
| Auth | Email/password, PBKDF2 password hashing, JWT sessions via `jose` |

## Frontend

- **Next.js App Router** with three pages: `/login`, `/dashboard`, and `/settings` (`src/app/`). The dashboard hosts all modules.
- **Feature modules** live in `src/components/`, one directory per domain: `todo/` (task tracker), `followups/`, `routines/`, `notes/`, `contacts/`, `drafts/`, `ai/` (assistant panel), `auth/`, `settings/`, and shared `ui/`.
- **State** is held in Zustand stores (`src/store/`): `useTodoStore`, `useFollowUpStore`, `useRoutineStore`, `useToastStore`. Stores fetch from the API routes and keep optimistic client state.
- **Drag-and-drop** ordering of task groups and rows uses dnd-kit; order is persisted through the `api/todo/reorder` and `api/followup/reorder` endpoints.

## Backend (API routes)

All server logic is in Next.js route handlers under `src/app/api/`:

- `todo/` — task tracker: groups, tasks, task updates, owners, reorder, update counts. (`tasks/` is an older, simpler predecessor kept for the legacy module.)
- `followup/` — follow-up tracker: groups, items, updates, reorder. (`followups/` is the legacy flat version.)
- `notes/`, `contacts/`, `drafts/` — straightforward CRUD.
- `routines/` — scheduled AI agents: CRUD, manual run, run history, schedule management.
- `ai/` — the assistant chat endpoint (see AI section).
- `auth/` — login, logout, me. `users/` — user management and password changes.
- `cron/` — `run-scheduled` and `daily-summary`, called by the Worker cron handler.
- `init/`, `seed/`, `migrate/` — database bootstrap and migrations.

## Database

- **Cloudflare D1** (SQLite-compatible). There is no local database: dev and production both talk to the same remote D1 instance through the Cloudflare REST API.
- The client is a thin wrapper in `src/lib/d1.ts` exposing `d1Query`, `d1Execute`, and a batch helper, authenticated with `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` / `D1_DATABASE_ID`.
- **Schema**: `schema.sql` contains the original six tables (`tasks`, `notes`, `contacts`, `followups`, `drafts`, `users`). The full schema — including `todo_groups`, `todo_tasks`, `todo_task_updates`, `followup_groups`, `followup_items`, `followup_updates`, `routines`, `routine_runs` — is created idempotently by `GET /api/init`.

## Authentication

- Login (`api/auth/login`) verifies the password and sets an HTTP-only session cookie containing a JWT signed with `AUTH_SECRET` (HS256 via `jose`, 7-day expiry). See `src/lib/auth.ts`.
- Passwords are hashed with **PBKDF2** (SHA-256, 100k iterations, random 16-byte salt) using the Web Crypto API (`src/lib/password.ts`) — no native dependencies, so it runs on the Workers runtime.
- `src/middleware.ts` guards every route except a public allowlist (`/login`, auth endpoints, `/api/init`, `/api/seed`, `/api/cron`). Verified user identity is forwarded to route handlers via `x-user-*` request headers.
- Cron endpoints are excluded from cookie auth and instead require `Authorization: Bearer ${CRON_SECRET}`.

## AI assistant ("Linda")

- `src/app/api/ai/route.ts` calls OpenRouter (`https://openrouter.ai/api/v1`) with the OpenAI SDK. The model comes from `OPENROUTER_MODEL` (default `anthropic/claude-opus-4`).
- The chat uses **function tool-calling**: `create_task`, `update_task`, `complete_task`, `delete_task`, `create_followup`. Tool handlers write directly to D1, so the assistant's actions are real data mutations, not text.
- The same OpenRouter pipeline executes **routines** — stored AI prompts run on a schedule or on demand, with results saved to `routine_runs`.

## Routines & scheduling

- A routine is a stored prompt + cron expression in the `routines` table. The canonical Daily Action Summary prompt lives in `src/lib/routine-defaults.ts` and is synced to the DB.
- `wrangler.toml` defines the Worker cron triggers (currently `0 12 * * *` — 7 AM EST / 8 AM EDT). When a user edits a routine's schedule, `src/lib/cloudflare-schedules.ts` updates the Worker's triggers through the Cloudflare API so the platform cron stays in sync with the DB.
- On each tick, the `scheduled()` handler in `worker-cron.js` POSTs to `/api/cron/run-scheduled` with the fired cron expression; matching active routines are executed as `CRON_USER_EMAIL`. If nothing matches, it falls back to the legacy `/api/cron/daily-summary`.

## Build & deployment

- `npm run dev` — local Next.js dev server (still uses remote D1).
- `npm run build` — standard Next.js build / type check.
- `npm run deploy` — `opennextjs-cloudflare build` compiles the app into a Worker bundle (`.open-next/`), then `wrangler deploy` ships it. `worker-cron.js` is the Worker entry point: it re-exports the OpenNext worker's fetch handler and Durable Object bindings, adding the `scheduled()` cron handler on top.
- Static assets are served from `.open-next/assets` via the Workers `ASSETS` binding.

## Environment variables

| Variable | Used by |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `D1_DATABASE_ID` | D1 REST client (`src/lib/d1.ts`) and schedule sync |
| `AUTH_SECRET` | JWT signing (`src/lib/auth.ts`) |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | AI assistant and routine execution |
| `CRON_SECRET` | Authorizes calls to `/api/cron/*` |
| `CRON_USER_EMAIL` | Identity that scheduled routines run as |
