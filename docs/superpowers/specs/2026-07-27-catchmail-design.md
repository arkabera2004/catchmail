# CatchMail — Design Spec (2026-07-27)

## Summary
CatchMail scans a user's Gmail inbox, uses Claude Haiku to detect implicit/explicit
tasks in emails, and surfaces them as a trackable to-do list with deadlines, plus a
daily digest email.

## Tech stack
- Frontend: React + Tailwind CSS → Vercel
- Backend: Node.js + Express → Railway (also hosts cron jobs in-process)
- DB & session store: Supabase Postgres
- AI extraction: Anthropic Claude Haiku
- Email delivery: Resend
- Gmail access: Gmail API (readonly) via Google OAuth 2.0 — OAuth also IS the app login
- Payments: Razorpay subscriptions (test mode)

## Auth
Single "Connect Gmail" button triggers Google OAuth consent for
`https://www.googleapis.com/auth/gmail.readonly` + `openid email profile`. Callback
exchanges the code, upserts a `users` row (refresh token encrypted with AES-256-GCM
using `ENCRYPTION_KEY`), and sets a signed httpOnly session cookie (express-session,
`SESSION_SECRET`). No separate password/magic-link system. All authenticated API
routes derive `user_id` from the session.

## Data flow
1. **Backfill** (on first connect): `messages.list` with `q=newer_than:7d`, fetch each
   message, run through the filter + extraction pipeline, store `sync_state.last_history_id`
   from the current Gmail profile historyId.
2. **Incremental sync** (node-cron, every 15 min, per active non-paused user):
   `users.history.list` since `last_history_id`. If Gmail returns 404 (history expired),
   fall back to a bounded re-backfill (last 7 days) and reset `last_history_id`.
3. **Filter pass** (pre-LLM, cost control): skip messages from no-reply addresses,
   list-unsubscribe/newsletter headers, `text/calendar` parts, and known automated
   notification senders.
4. **Extraction**: surviving messages → Claude Haiku with the exact prompt specified
   by the user → parse JSON → for `has_task: true`, insert one `tasks` row per task
   (dedup by `source_email_id` + task text). Free-tier users capped at 30 extracted
   tasks/month; once hit, remaining emails for that user are marked processed but
   skipped (not queued/retried).
5. **Dashboard**: task list (open/done), inline deadline edit, mark-done, delete,
   link back to the Gmail message.
6. **Digest**: node-cron daily (08:00 server time) — tasks created in the last 24h per
   user, skipped if zero, sent via Resend.
7. **Billing**: Razorpay Checkout from Settings → `/api/webhooks/razorpay`
   (signature-verified) updates `subscriptions` + `users.plan`.
8. **Settings**: pause/resume sync (flag checked by the sync job), disconnect (revoke
   Google token + delete refresh token), delete-all-data (cascade delete).

## Database schema (Supabase Postgres, RLS enabled)
- `users`: id (uuid, pk), email (unique), google_refresh_token_enc (text),
  plan (text: free/paid, default free), paused (bool, default false), created_at
- `tasks`: id (uuid pk), user_id (fk→users), task_text, deadline (timestamptz nullable),
  source_email_id (text), source_email_link (text), confidence (text: high/medium/low),
  status (text: open/done, default open), created_at
- `sync_state`: user_id (fk→users, pk), last_history_id (text), last_synced_at (timestamptz)
- `subscriptions`: user_id (fk→users, pk), razorpay_subscription_id (text),
  status (text), current_period_end (timestamptz)

RLS: backend uses the Supabase service-role key exclusively (frontend never talks to
Supabase directly), so policies restrict by `auth.uid() = user_id` as defense-in-depth
for any future direct client access, keyed off Supabase's own auth.uid() mapped from
our session — since we don't use Supabase Auth, policies are written to only allow
access via the service role; anon/authenticated roles get no access.

## Repo
Public GitHub repo `catchmail`, monorepo with `frontend/` and `backend/` as siblings.

## Env vars
As specified by the user, plus `ENCRYPTION_KEY` (32-byte hex, generated via
`openssl rand -hex 32`, used for AES-256-GCM token encryption).

## Out of scope for v1
- Multi-inbox per user beyond the free-tier cap enforcement (paid tier still one
  connected inbox per user, just unlimited tasks — matches user's stated free/paid
  distinction).
- Team/org accounts, task sharing, mobile app.
