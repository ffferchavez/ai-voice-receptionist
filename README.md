# AI Voice Receptionist (Helion City — Helion Voices)

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
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `anon` public key  
   - `SUPABASE_SERVICE_ROLE_KEY` — `service_role` key (server-only; for webhooks in later phases)

3. **Database**

   Apply the SQL migration in the Supabase SQL editor, or use the CLI:

   ```bash
   npx supabase db push
   # or paste supabase/migrations/20250322000000_initial_schema.sql manually
   ```

   Enable **Email** auth (or your chosen provider) under Authentication → Providers.

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

- **Phase 1** (current): Marketing landing, project skeleton, Supabase client wiring, SQL migration + RLS, placeholder auth pages, health check.
- **Phase 2+**: Auth flows, dashboard, receptionist/knowledge UI, webhooks, OpenAI, call/lead views — see `docs/PROJECT_PLAN.md`.
