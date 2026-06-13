# Personal Assistant Project

## Goal
A private executive personal assistant for managing tasks, notes, contacts, follow-ups, draft communications, and scheduled AI routines. Includes an AI chat panel ("Linda") that acts on the data via tool-calling.

## Stack
- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Zustand for client state
- Cloudflare D1 (SQLite) for storage, accessed via the Cloudflare REST API (`src/lib/d1.ts`)
- Deployed to Cloudflare Workers via @opennextjs/cloudflare; `worker-cron.js` handles the native cron trigger defined in `wrangler.toml`
- AI via OpenRouter using the OpenAI SDK (`src/app/api/ai/route.ts`); model set by `OPENROUTER_MODEL`
- Auth: email/password with JWT sessions (jose), multi-user

## Commands
- `npm run dev` — local dev server
- `npm run build` — Next.js build (type check)
- `npm run deploy` — OpenNext build + `wrangler deploy`

## Architecture Notes
- API routes live under `src/app/api/` (todo, followup, notes, contacts, drafts, routines, users, auth, ai, cron). The active task tracker endpoints are under `api/todo/`; `api/tasks` is the older simple version.
- The database is remote D1 even in local dev — `dev` and production hit the same DB through the REST API. There is no local SQLite file.
- Schema is in `schema.sql`; newer tables (todo groups/tasks/updates, followup groups/items, routines, routine runs) are created by the migrate/init endpoints, not all reflected in `schema.sql`.
- Routines are scheduled AI agents. The canonical Daily Action Summary prompt lives in `src/lib/routine-defaults.ts` — the DB stores routine content, but defaults sync from this file. Schedules sync to Cloudflare Worker cron triggers via `src/lib/cloudflare-schedules.ts`.
- Cron endpoints (`api/cron/*`) are protected by `CRON_SECRET` and run as `CRON_USER_EMAIL`.

## Environment Variables
`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `D1_DATABASE_ID`, `AUTH_SECRET`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `CRON_SECRET`, `CRON_USER_EMAIL`. Never hardcode or expose secrets; always read from env.

## Assistant Behavior
- Be concise and business-oriented.
- Preserve professional tone in drafted emails.
- Always show action items clearly.
- Never delete data without confirmation.
- Never expose secrets or API keys.

## Coding Rules
- Keep components small.
- Use clear names.
- Add error handling.
- Avoid overengineering.
- Task statuses are `not_started | working | done | stuck`; priorities are `low | medium | high | urgent` — keep new code consistent with these enums.

## Future Integrations
Gmail, Google Calendar, Google Drive, CRM, weekly status summary generator.
