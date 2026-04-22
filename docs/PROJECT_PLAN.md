# AI Voice Receptionist — Project Plan (SignalDesk Labs / Voice Ops)

Production-lean MVP: SaaS-style AI receptionist with webhook ingestion, transcripts, summaries, and structured leads. **No** live transfer, calendar booking, outbound voice, or separate backend service in v1.

---

## 1. Full project plan

### Vision
Businesses configure a voice receptionist per **organization** (workspace). A **voice provider** (Vapi, Twilio, etc.) sends webhooks to Next.js **route handlers**. The app stores **raw payloads** for debugging, **normalizes** events to a stable internal shape, persists **call sessions**, **events**, **transcripts**, **summaries**, and **captured leads** (OpenAI extraction). **Supabase Auth** gates the dashboard; **RLS** enforces org isolation. **Service role** is used only in server routes that validate webhooks (bypasses RLS for trusted writes).

### Principles
- Next.js App Router + route handlers only (no FastAPI in v1).
- Provider logic isolated under `src/lib/voice/`.
- Normalize once at ingestion; UI reads internal types.
- Raw webhook payloads stored on `call_events` (and optionally session-level snapshots where useful).

---

## 2. Folder structure

```
src/
  app/
    (marketing)/           # optional group; landing may stay at /
      layout.tsx
    (auth)/
      login/page.tsx
      signup/page.tsx
      auth/callback/route.ts
    (dashboard)/
      layout.tsx           # org context + nav
      dashboard/page.tsx
      receptionist/page.tsx
      knowledge/page.tsx
      calls/page.tsx
      calls/[callId]/page.tsx
      leads/page.tsx
      settings/page.tsx
    api/
      webhooks/
        voice/[provider]/route.ts
      simulate-call/route.ts
      health/route.ts
  components/
    marketing/
    dashboard/
    ui/
  lib/
    supabase/
      client.ts
      server.ts
      middleware.ts
    voice/
      types.ts
      normalize.ts
      providers/
        vapi.ts
        twilio.ts
        index.ts
    openai/
      extract-lead.ts
      summarize.ts
  types/
    database.ts            # generated or hand-maintained Supabase types
middleware.ts
supabase/
  migrations/
    *.sql
```

---

## 3. Supabase schema (tables)

| Table | Purpose |
|-------|---------|
| `profiles` | User display info; 1:1 with `auth.users`. |
| `organizations` | Workspace / tenant (`created_by` ties bootstrap membership to the creator). |
| `organization_members` | User ↔ org with `owner` \| `admin` \| `member`. |
| `receptionist_configs` | Greeting, provider key, webhook secret, JSON settings. |
| `call_sessions` | One row per call; transcript, summary, status, provider ids. |
| `call_events` | Append-only events; `raw_payload`, `normalized` JSON. |
| `captured_leads` | Structured fields + link to `call_session`. |
| `knowledge_snippets` | FAQ / KB snippets for receptionist context. |
| `usage_events` | Metering / analytics (optional in early phases). |

---

## 4. Migrations & RLS

- Single initial migration: extensions, tables, indexes, triggers (`profiles` on signup), helper `is_org_member`, RLS policies.
- **Webhooks**: server routes use `SUPABASE_SERVICE_ROLE_KEY` to insert sessions/events/leads after signature/secret validation (service role bypasses RLS).
- **Dashboard**: browser uses anon key + user JWT; RLS restricts reads/writes to org membership; writes limited by role where noted in migration.

---

## 5. Route-by-route implementation plan

| Route | Responsibility |
|-------|----------------|
| `GET /` | Marketing landing. |
| `GET/POST /login`, `/signup` | Supabase Auth (email or OAuth later). |
| `GET /auth/callback` | OAuth/code exchange if used. |
| `GET /dashboard` | Org overview, recent calls count. |
| `GET/POST/PATCH /receptionist` | Edit `receptionist_configs`; show webhook URL + secret. |
| `GET/POST/PATCH/DELETE /knowledge` | CRUD `knowledge_snippets`. |
| `POST /api/webhooks/voice/[provider]` | Verify provider, store raw, normalize, upsert session, insert events, trigger OpenAI for summary/lead. |
| `POST /api/simulate-call` | Dev/demo: fake payload → same pipeline as webhook (guarded by env). |
| `GET /calls`, `GET /calls/[id]` | List/detail with transcript. |
| `GET /leads` | Table of `captured_leads`. |
| `GET /api/health` | Liveness for deploys. |

---

## 6. UI page breakdown

- **Landing**: Hero (SignalDesk Voice Ops), value props, feature grid, CTA to sign in.
- **Login / Signup**: Minimal forms + Supabase.
- **Dashboard**: Cards (calls, leads), shortcuts.
- **Receptionist**: Form fields + read-only webhook URL + rotate secret.
- **Knowledge**: List + add/edit/delete snippets.
- **Calls**: Sortable list; filters later.
- **Call detail**: Transcript, summary, timeline of normalized events, raw payload viewer (collapsible).
- **Leads**: Table with key columns + link to call.

---

## 7. Development phases

| Phase | Scope |
|-------|--------|
| **1** | Docs, env, migrations, marketing landing, layout, Supabase clients, middleware stub, `lib/voice` types stub, placeholder auth pages. |
| **2** | Auth flows, profile trigger, org create/join, dashboard shell, org switcher. |
| **3** | Receptionist config UI + DB wiring; knowledge CRUD. |
| **4** | Webhook receiver, normalization, `call_sessions` / `call_events` persistence (service role). |
| **5** | OpenAI summary + structured lead extraction; `captured_leads`. |
| **6** | Calls list/detail, leads table, polish. |
| **7** | Simulate-call endpoint, usage_events, README runbooks. |

---

## 8. Suggested environment variables

See `.env.example` in repo root.

---

## 9. README

Setup instructions live in `README.md` (local dev, Supabase link, migrations, deploy notes).

---

## 10. Out of scope (v1 reminder)

- Live agent transfer, calendar, outbound campaigns, multi-region HA, separate Python/Go API.

---

## 11. Reminders (non-blocking)

- **Voice / LLM language**: If callers get replies in the “wrong” language, tighten the agent **system prompt** (e.g. “reply in the same language the caller uses”). Browser voice + ElevenLabs TTS may also benefit from **`eleven_multilingual_v2`** for mixed locales. Defaults were updated in code; agents saved in **localStorage** keep their old prompt until edited.

---

## 12. Production readiness — what’s left

Roughly **Phases 2–7** in §7. Today the **DB migration + RLS** exist, but most product flows are not wired to Postgres yet.

| Area | Current state | Typical next step |
|------|----------------|-------------------|
| **Auth** | Email/password via `createSupabaseBrowserClient`; `/auth/callback` for email links; proxy gates `/dashboard` + `/agents` | OAuth providers, password reset UI, optional server actions |
| **Tenancy** | First visit to an authenticated route calls `ensureDefaultOrganization` (RPC `create_organization_with_owner`) | Org switcher, invite flows, thread `org_id` into product data |
| **Voice agent config** | `AgentManager` persists to **localStorage** | CRUD against `receptionist_configs` (or related table) per org; optional encrypt secrets at rest |
| **Live calls / transcripts** | In-browser Gemini + ElevenLabs demo; `ConversationManager` is **in-memory** | `POST /api/webhooks/voice/[provider]`, normalize payload, insert `call_sessions` / `call_events` with **service role** after verifying signature/secret |
| **Leads / summaries** | Planned | Phase 5: OpenAI extraction → `captured_leads`; transcript summary on session |
| **Ops** | `/api/health` | Production env on Vercel/etc., all secrets in host env, Supabase Auth URLs + redirect config, rate limits on webhooks |

For setup already required before prod: apply **`supabase/migrations/...`**, set env vars from **`.env.example`**, enable Auth provider(s) in Supabase dashboard.
