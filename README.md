# AI Voice Receptionist (SignalDesk Labs — Voice Ops)

Production-lean MVP: businesses configure an AI voice receptionist, ingest provider webhooks in Next.js route handlers, store transcripts and events, and capture structured leads. Stack: **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **Supabase Auth + Postgres**, external voice providers (e.g. Vapi, Twilio), **OpenAI** for extraction/summaries.

See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for architecture, routes, phases, and RLS notes.

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- (Later phases) OpenAI API key; voice provider credentials

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and fill in values:

   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL  
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — preferred public key (`sb_publishable_...`)  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — legacy `anon` public key fallback  
   - `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key (server-only; for webhooks in later phases)

3. **Database**

   This app talks to Supabase over PostgREST using the **default `public` schema** (see `NEXT_PUBLIC_SUPABASE_DB_SCHEMA` in `.env.example`). That avoids `Invalid schema: voices`, which happens when a schema is not enabled for the Data API.

   Apply migrations (includes `public.agent_configs` / branches / publish events for the Agents UI):

   ```bash
   npx supabase db push
   # or run SQL from supabase/migrations/ in the Supabase SQL editor
   ```

   If you intentionally keep voice tables only in a custom schema (e.g. `voices`) **and** expose that schema under **Project Settings → API → Exposed schemas**, set `NEXT_PUBLIC_SUPABASE_DB_SCHEMA=voices` (or `SUPABASE_VOICES_SCHEMA`).

   Enable **Email** auth (or your chosen provider) under Authentication → Providers.

   Under **Authentication → URL configuration**, add **Redirect URLs**:
   `http://localhost:3000/auth/callback` (and your production origin + `/auth/callback` when you deploy). This is required for email confirmation links.

4. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command        | Description        |
|----------------|--------------------|
| `npm run dev`  | Next.js dev server |
| `npm run build`| Production build   |
| `npm run start`| Start production   |
| `npm run lint` | ESLint             |

## Security notes

- Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` to the client.
- Webhook routes (Phase 4+) should verify provider signatures or shared secrets, then write with the service role so RLS does not block trusted server-side ingestion.

## Phase status

- **Done so far**: Marketing + app shell, Supabase client wiring + session refresh (`src/proxy.ts`), SQL migration + RLS, **email/password auth** (login, signup, callback route), **protected** `/dashboard` and `/agents`, **default org** bootstrap via `create_organization_with_owner`, health check, in-browser voice demo (Gemini + ElevenLabs), agents UI (localStorage).
- **Toward production**: Persist agents + receptionist config per org, webhook ingestion, OpenAI lead extraction, calls/leads UI — see **`docs/PROJECT_PLAN.md` §7 and §12**.
