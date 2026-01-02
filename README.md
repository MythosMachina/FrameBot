# FrameBot

FrameBot is a work in progress. Some features described in the design notes are not implemented yet, and parts of the UI/API are still being built out.

FrameBot is a platform for running Discord bots with a clear, friendly control panel. You can create a bot, turn features on or off, and manage settings without editing code. Each bot runs as its own “automaton” with modular features (“gears”) you can pick and customize.

## Why FrameBot

- **All-in-one control**: manage multiple bots, users, and settings from a single panel.
- **Modular features**: enable only what you need, per bot.
- **Safe by design**: bot tokens are encrypted at rest, sessions are short-lived, and admin-only routes are enforced.
- **Built for growth**: add new feature modules without changing the core system.

## What you can do

- Create and manage bot instances (“automatons”).
- Assign feature modules (“gears”) to each bot.
- Run moderation, utility, media, and alert features as needed.
- Keep logs and audit activity from the admin panel.

## Who it is for

FrameBot is for teams or communities who want Discord automation without maintaining a complex bot codebase. If you prefer a UI-driven setup and predictable controls, this project is a good fit.

## Planned but not yet complete (examples)

- Full admin CRUD flows for users and automatons, plus system settings forms (branding, limits, policies).
- Ticketing and system log views with filters and management actions.
- Per-gear UI panels (moderation policies, audio queue controls, economy dashboards, alert routing).
- Gear metadata extensions like tags, required intents/permissions, and config schemas.
- Hardening work like persistent log retention and guardrails.

## Repository layout

- `apps/api`: Fastify API, Prisma schema/migrations, and Discord automaton runtime
- `apps/panel`: Next.js admin/user control panel
- `packages/shared`: shared TypeScript utilities
- `packages/gear-sdk`: gear module helper package

## Core concepts

- **Automaton**: a Discord bot instance owned by a user.
- **Gears**: modular feature packages loaded per automaton from `apps/api/src/gears/**/manifest.json`.
- **Runtime**: worker-thread process per automaton that logs in with Discord.js and loads assigned gears.

## Environment variables

API (`apps/api`):
- `DATABASE_URL`: Postgres connection string for Prisma.
- `SESSION_SECRET`: cookie signing secret.
- `DISCORD_TOKEN_SECRET`: 32+ char secret used to encrypt bot tokens at rest.
- `SESSION_TTL_HOURS`: optional session lifetime (default 12).
- `PANEL_ORIGIN`: allowed panel origin in production CORS.
- `HOST`: optional bind host (default `0.0.0.0`).
- `PORT`: optional API port (default `3011`).

Panel (`apps/panel`):
- `NEXT_PUBLIC_API_BASE_URL`: API base URL (default `http://localhost:3011`).

## Development

Install dependencies from the repo root:

```bash
pnpm install
```

Run the API:

```bash
pnpm --filter @framebot/api dev
```

Run the panel:

```bash
pnpm --filter @framebot/panel dev
```

## Database

- Prisma schema: `apps/api/prisma/schema.prisma`
- Migrations: `apps/api/prisma/migrations`

Apply migrations locally:

```bash
pnpm --filter @framebot/api prisma migrate dev
```

## Gear modules

Gear modules live under `apps/api/src/gears`. Each gear has a `manifest.json` plus an `index.mjs` entry. On API startup, manifests are synced to the database, and assigned gears are loaded by the automaton runtime.
