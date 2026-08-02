# Meeting awareness, reminders, and dashboard redesign

## Problem

CatchMail's target market is people who receive a high volume of email and
lose track of things buried in it — especially meetings, which are more
costly to miss than a generic task. Today every extracted item is treated
identically (a flat task list, sorted/filtered together), there's no
distinction between "reply to this by Friday" and "call at 3pm Friday," and
there's no reminder mechanism beyond the once-a-day digest email. This
project makes CatchMail meeting-aware end to end: better extraction,
a dashboard that surfaces meetings distinctly, and push/SMS reminders before
they happen.

## Scope

Three layers, each depending on the one before it:

1. **Extraction & data model** — classify each extracted item as a `task` or
   `meeting`, and capture an actual time (not just a date) when the email
   implies one.
2. **Dashboard UI** — a desktop split layout (meetings rail + task list) and
   a user-selectable mobile display mode.
3. **Reminders** — push notifications (free, everyone) and SMS (Pro-only),
   fired ahead of a meeting's start time, with a configurable lead time.

Out of scope for this pass: a native mobile app (PWA only), meeting requests
without any time information ever escalating to a reminder, recurring
meetings/tasks, and any change to the existing daily digest email.

## 1. Extraction & data model

**Classification rule:** an item is a `meeting` only when the email implies
**both** (a) a specific clock time and (b) an intent to meet/call/sync with
someone. Anything else — including "let's grab a call sometime this week"
with no time — stays a `task`. This keeps the rule simple and means every
`meeting` row always has enough information to schedule a reminder against.

**Prompt change** (`backend/services/gemini.js`): extend the structured
output schema so each extracted item includes:

```json
{
  "task": "short actionable phrase",
  "type": "task | meeting",
  "deadline": "ISO datetime or null",
  "confidence": "high | medium | low",
  "reason": "short quote or paraphrase"
}
```

`deadline` already resolves relative dates against the email's received
date; the prompt instructions are extended to also resolve times of day
("3pm", "10:30 in the morning") into the same ISO datetime, and to only
emit `type: "meeting"` when a time is present. If `type` is `meeting` but no
time could be resolved, extraction downgrades it to `task` server-side as a
safety net (never trust the model to have followed the rule perfectly).

**Schema change** (`backend/db/schema.sql`):

```sql
alter table tasks add column type text not null default 'task' check (type in ('task', 'meeting'));
alter table tasks add column reminder_lead_minutes integer; -- null = use account default
alter table tasks add column reminder_sent_at timestamptz;  -- null until a reminder fires; prevents duplicate sends
```

`deadline` (already `timestamptz`) is reused as the meeting start time —
no new column needed there.

## 2. Dashboard UI

**Desktop** (`frontend/src/pages/Dashboard.jsx`): split into two regions
inside the existing card container — a narrower "Upcoming meetings" rail
(sorted soonest-first, showing time + a link if the source email had one)
beside the existing task list (unchanged filtering/sorting/search, now just
scoped to `type = 'task'`). Meetings rail always visible, never affected by
the task list's filter/sort controls — it has one purpose: what's coming up.

**Mobile** (viewport breakpoint, existing Tailwind `sm`/`md` scale): the
split collapses per a new `dashboard_mobile_layout` user setting
(`tabs | stacked | next_up`, default `stacked`):
- `tabs` — two tabs, Meetings and Tasks, meetings tab shows a count badge.
- `stacked` — a compact "Today's meetings" strip on top, full task list
  below (default, since it needs no interaction to see what's urgent).
- `next_up` — a single sticky card for the soonest meeting ("Next: Vendor
  call in 2h"), tapping expands the full meetings list; task list fills the
  rest of the screen.

This is a display preference, not a data change — same underlying query,
just laid out differently. Setting lives on `users.dashboard_mobile_layout`
and is editable from Settings.

## 3. Reminders

**Delivery channels:**
- **Push (PWA)** — free, available to everyone. Requires a service worker
  (`frontend/public/sw.js`) handling the `push` event, a web app manifest,
  and a `push_subscriptions` table storing each browser's subscription:

  ```sql
  create table if not exists push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
  );
  ```

  Permission is requested from a button in Settings ("Enable meeting
  reminders") — never an unprompted browser popup on first load.

- **SMS** — Pro-only, via Twilio. Requires phone number capture + OTP
  verification (new `users.phone_number`, `users.phone_verified` columns
  and two endpoints: `POST /api/settings/phone/send-code`,
  `POST /api/settings/phone/verify`). SMS sending is gated on
  `plan = 'paid' AND phone_verified = true`.

**Lead time:** `users.reminder_lead_minutes` (default `30`) is the account-
wide default, editable in Settings. Each meeting's `tasks.reminder_lead_minutes`
overrides it when set (surfaced as a small control on the meeting row —
e.g. "remind me: [30 min ▾]").

**Scheduling mechanism:** a new cron job (`backend/jobs/reminders.js`),
running every minute alongside the existing 15-minute sync and daily
digest jobs. Each run:
1. Selects open meetings where `reminder_sent_at is null` and
   `deadline - (coalesce(reminder_lead_minutes, users.reminder_lead_minutes) * interval '1 minute') <= now()`.
2. For each, sends a push notification to every row in
   `push_subscriptions` for that user (via the `web-push` npm package),
   and an SMS via Twilio if the user qualifies.
3. Marks `reminder_sent_at = now()` immediately after dispatch attempts
   (best-effort — a failed push/SMS send is logged, not retried, to avoid
   double-sends; consistent with the existing per-message try/catch
   pattern in `gmail.js`).

## Settings page additions

New "Notifications" section in `frontend/src/pages/Settings.jsx`:
- Enable push notifications (button triggers browser permission + subscribes)
- Default reminder lead time (dropdown: 10 / 30 / 60 min)
- Mobile dashboard layout (Tabs / Stacked / Next-up card)
- Phone number + verify (Pro only; shown as an upsell if on free plan,
  consistent with the existing `/coming-soon` treatment for other Pro
  features)

## Error handling

- Extraction: if the model returns `type: "meeting"` without a resolvable
  time, downgrade to `type: "task"` server-side rather than trust the
  model.
- Reminders: a push/SMS send failure is caught and logged per-recipient
  (mirrors `fetchAndProcess`'s per-message try/catch in `gmail.js`) so one
  bad subscription/number can't block reminders for other users in the
  same cron run.
- Push subscriptions that Web Push reports as expired/gone (410/404) are
  deleted from `push_subscriptions` on send failure, so dead endpoints
  don't accumulate.

## Testing

- Extraction: unit tests around the Gemini prompt's JSON parsing already
  exist as a pattern (`stripCodeFences`); extend fixtures to cover
  meeting-with-time, meeting-without-time (expect downgrade to task), and
  plain task cases.
- Reminders: unit test the cron job's selection query logic (which rows
  are "due") independent of actual push/SMS delivery, which is mocked.
- Dashboard: existing sort/filter logic in `Dashboard.jsx` gets a light
  test pass to confirm the meetings rail's query is scoped correctly and
  doesn't leak into the task list's filters.
