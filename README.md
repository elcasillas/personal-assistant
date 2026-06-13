# Personal Assistant

A private executive personal assistant for managing tasks, notes, contacts, follow-ups, draft communications, and scheduled routines — with a built-in AI chat panel ("Linda") that can act on your data.

## Features

- **Dashboard** — single-page overview of all modules
- **Task tracker** — grouped task board with statuses, priorities, due dates, owners, drag-and-drop reordering, per-task updates and activity log
- **Follow-up tracker** — track pending follow-ups by contact with grouping, updates, and activity history
- **Notes repository** — tagged notes with search
- **Contacts** — lightweight contact list (name, company, email, phone)
- **Email draft generator** — store and manage draft communications
- **Routines** — scheduled AI agents (e.g. a daily action summary) with cron schedules, run history, and run result review, executed via Cloudflare Workers cron triggers
- **AI assistant** — chat panel backed by an LLM (via OpenRouter) with tool-calling to create and update tasks and other records
- **Auth** — email/password login with JWT sessions (multi-user)

## Stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Zustand for client state
- Cloudflare D1 (SQLite) for storage, accessed through the Cloudflare REST API
- Deployed to Cloudflare Workers via [@opennextjs/cloudflare](https://opennext.js.org/cloudflare)
- OpenRouter (OpenAI SDK-compatible) for the AI assistant and routine execution

## Getting started

```bash
npm install
npm run dev
```

The app runs at http://localhost:3000.

### Environment variables

Create a `.env.local` with:

| Variable | Purpose |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account for the D1 REST API |
| `CLOUDFLARE_API_TOKEN` | API token with D1 (and Workers Schedules) access |
| `D1_DATABASE_ID` | The D1 database ID |
| `AUTH_SECRET` | Secret for signing JWT session tokens |
| `OPENROUTER_API_KEY` | API key for the AI assistant |
| `OPENROUTER_MODEL` | Model to use (OpenRouter model ID) |
| `CRON_SECRET` | Shared secret protecting the cron endpoints |
| `CRON_USER_EMAIL` | User account that scheduled routines run as |

Never commit secrets — all credentials come from environment variables.

### Database

The schema lives in `schema.sql` (tasks, notes, contacts, followups, drafts, users). Apply it to your D1 database, e.g.:

```bash
wrangler d1 execute <database-name> --remote --file=schema.sql
```

## Deployment

```bash
npm run deploy
```

This builds with OpenNext and deploys to Cloudflare Workers using `wrangler.toml`. A native cron trigger (`0 12 * * *`, 7/8 AM Eastern) in `wrangler.toml` invokes `worker-cron.js`, which calls the app's cron endpoints to run scheduled routines such as the daily summary.

## Project structure

```
src/
  app/            Pages (dashboard, login, settings) and API routes
    api/          REST endpoints: todo, followup, notes, contacts, drafts,
                  routines, users, auth, ai, cron
  components/     UI modules: todo, followups, routines, contacts, drafts,
                  notes, ai (assistant panel), auth, settings, ui
  lib/            D1 client, auth/JWT, cron utilities, Cloudflare schedules
                  API, shared types
  store/          Zustand stores (todos, follow-ups, routines, toasts)
schema.sql        D1/SQLite schema
worker-cron.js    Cloudflare Worker entry with the scheduled() cron handler
wrangler.toml     Cloudflare Workers configuration
```

## Roadmap

- Gmail, Google Calendar, and Google Drive integrations
- CRM integration
- Weekly status summary generator
