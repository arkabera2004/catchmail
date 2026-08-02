# Meeting Awareness and Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CatchMail meeting-aware end to end — classify extracted items as `task` or `meeting`, split the dashboard so meetings are never buried, and fire push/SMS reminders before a meeting starts.

**Architecture:** Three dependent layers built bottom-up: (1) a schema + extraction change that classifies items and captures clock time, (2) a dashboard split (desktop rail + mobile layout modes) that reads that classification, (3) a per-minute cron job that fires Web Push (everyone) and SMS (Pro-only, Twilio) reminders ahead of a meeting's start.

**Tech Stack:** Node 20 (backend, ESM), Express, Supabase (Postgres + supabase-js), Gemini (`@google/generative-ai`), React + Vite + Tailwind (frontend), `web-push` (new dep), `twilio` (new dep), Node's built-in `node:test` runner (new — no test framework existed before this plan).

## Global Constraints

- Backend is ESM (`"type": "module"` in `backend/package.json`) — use `import`/`export` throughout, no `require`.
- The backend connects to Supabase with the service-role key only; RLS denies `anon`/`authenticated` entirely (see `backend/db/schema.sql`). Every new table needs a matching `deny_all_*` policy, following the existing pattern.
- Cron jobs follow the existing per-user/per-item `try/catch` pattern (see `backend/jobs/sync.js`, `backend/jobs/digest.js`) so one failure can't abort the whole run.
- All new Express routes requiring auth go through the existing `requireAuth` middleware (`backend/middleware/requireAuth.js`), matching `backend/routes/settings.js`.
- Frontend API calls go through `frontend/src/lib/api.js`'s `request()` helper — don't call `fetch` directly from components.
- Tailwind: reuse the existing slate/indigo palette and dark-mode (`dark:`) pairing already used throughout `Dashboard.jsx` / `Settings.jsx` — don't introduce a new color scheme.
- Meeting classification rule (from spec): an item is `type: "meeting"` only if it has **both** a specific clock time and an intent to meet/call/sync with someone; anything else is `type: "task"`. Never trust the model alone — always re-validate server-side that a `meeting` has a time-bearing deadline, downgrading to `task` if not.
- SMS reminders are gated to `plan === 'paid' && phone_verified === true`; push notifications are available to every plan.
- After every task's commit, push to `origin main` (the user has asked to see changes land continuously): `git push`.

---

## Task 1: Schema migration — meeting classification, reminder tracking, push subscriptions

**Files:**
- Modify: `backend/db/schema.sql`
- Modify: `.env.example` (add the new provider env vars needed by later tasks, so the user can fill them in while this task is fresh)

**Interfaces:**
- Produces: `tasks.type` (`'task' | 'meeting'`, default `'task'`), `tasks.reminder_lead_minutes` (nullable integer), `tasks.reminder_sent_at` (nullable timestamptz), `users.dashboard_mobile_layout` (`'tabs' | 'stacked' | 'next_up'`, default `'stacked'`), `users.reminder_lead_minutes` (integer, default `30`), `users.phone_number` (nullable text), `users.phone_verified` (boolean, default `false`), and a new `push_subscriptions` table (`id`, `user_id`, `endpoint` unique, `p256dh`, `auth`, `created_at`). All later tasks read/write these exact column and table names.

- [ ] **Step 1: Add the new columns and table to `backend/db/schema.sql`**

Append to `backend/db/schema.sql` (after the existing `tasks` table definition, before the `sync_state` table):

```sql
alter table tasks add column if not exists type text not null default 'task' check (type in ('task', 'meeting'));
alter table tasks add column if not exists reminder_lead_minutes integer;
alter table tasks add column if not exists reminder_sent_at timestamptz;

alter table users add column if not exists dashboard_mobile_layout text not null default 'stacked' check (dashboard_mobile_layout in ('tabs', 'stacked', 'next_up'));
alter table users add column if not exists reminder_lead_minutes integer not null default 30;
alter table users add column if not exists phone_number text;
alter table users add column if not exists phone_verified boolean not null default false;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;
create policy "deny_all_push_subscriptions" on push_subscriptions for all to anon, authenticated using (false);
```

- [ ] **Step 2: Apply the migration to the real Supabase project**

This can't be run from the backend (it only holds a REST API key, not a Postgres connection string). Open the Supabase project's SQL editor (same one referenced in the README's setup steps) and run exactly the SQL block from Step 1.

- [ ] **Step 3: Verify the migration landed**

Run this from the repo root (uses the service-role key already in `.env`, reads via the same supabase-js client the backend uses — no new dependency):

```bash
cd backend && node -e "
import('dotenv').then(async ({ default: dotenv }) => {
  dotenv.config({ path: '../.env' });
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.from('tasks').select('type, reminder_lead_minutes, reminder_sent_at').limit(1);
  console.log('tasks columns ok:', !error, error?.message || '');
  const { data: u, error: uErr } = await supabase.from('users').select('dashboard_mobile_layout, reminder_lead_minutes, phone_number, phone_verified').limit(1);
  console.log('users columns ok:', !uErr, uErr?.message || '');
  const { error: pErr } = await supabase.from('push_subscriptions').select('*').limit(1);
  console.log('push_subscriptions table ok:', !pErr, pErr?.message || '');
});
"
```

Expected: all three lines print `ok: true` with no error message.

- [ ] **Step 4: Add new provider env vars to `.env.example`**

Append a new section to `.env.example` (matching the existing section style, e.g. the Razorpay section):

```
# ── Push notifications (Web Push / VAPID) ───────────────────────────────────
# Generate a keypair once with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com

# ── SMS reminders (Twilio, Pro plan only) ───────────────────────────────────
# From your Twilio Console.
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
# A Twilio Verify service (for phone-number OTP verification).
TWILIO_VERIFY_SERVICE_SID=
# The Twilio phone number reminders are sent from.
TWILIO_FROM_NUMBER=
```

- [ ] **Step 5: Commit and push**

```bash
git add backend/db/schema.sql .env.example
git commit -m "Add schema for meeting classification, reminders, and push subscriptions"
git push
```

---

## Task 2: Gemini extraction — classify meeting vs. task, resolve clock time

**Files:**
- Modify: `backend/services/gemini.js`
- Create: `backend/services/gemini.test.js`
- Modify: `backend/package.json` (add `"test": "node --test"` script)

**Interfaces:**
- Consumes: nothing new from other tasks.
- Produces: `extractTasks({ subject, sender, receivedDate, body })` now returns tasks shaped `{ task, type, deadline, confidence, reason }` where `type` is always `'task'` or `'meeting'` and is guaranteed `'meeting'` only when `deadline` carries a time component. Exports `parseExtractionResponse(text)` and `normalizeExtractedTasks(tasks)` as named exports for testing and reuse.

- [ ] **Step 1: Write the failing tests**

Create `backend/services/gemini.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExtractedTasks, parseExtractionResponse } from './gemini.js';

test('normalizeExtractedTasks keeps type "meeting" when deadline has a time component', () => {
  const result = normalizeExtractedTasks([
    { task: 'Call with vendor', type: 'meeting', deadline: '2026-08-10T15:00:00.000Z', confidence: 'high', reason: 'call at 3pm' },
  ]);
  assert.equal(result[0].type, 'meeting');
});

test('normalizeExtractedTasks downgrades "meeting" to "task" when deadline is date-only', () => {
  const result = normalizeExtractedTasks([
    { task: 'Send report', type: 'meeting', deadline: '2026-08-10', confidence: 'medium', reason: 'by Friday' },
  ]);
  assert.equal(result[0].type, 'task');
});

test('normalizeExtractedTasks downgrades "meeting" to "task" when deadline is null', () => {
  const result = normalizeExtractedTasks([
    { task: 'Sync sometime this week', type: 'meeting', deadline: null, confidence: 'low', reason: 'let\'s sync sometime' },
  ]);
  assert.equal(result[0].type, 'task');
});

test('normalizeExtractedTasks defaults a missing/unknown type to "task"', () => {
  const result = normalizeExtractedTasks([
    { task: 'Approve invoice', deadline: '2026-08-10', confidence: 'high', reason: 'approve by Friday' },
  ]);
  assert.equal(result[0].type, 'task');
});

test('parseExtractionResponse strips code fences and normalizes types', () => {
  const raw = '```json\n{"has_task": true, "tasks": [{"task": "Call vendor", "type": "meeting", "deadline": "2026-08-10T15:00:00.000Z", "confidence": "high", "reason": "3pm call"}]}\n```';
  const result = parseExtractionResponse(raw);
  assert.equal(result.has_task, true);
  assert.equal(result.tasks[0].type, 'meeting');
});

test('parseExtractionResponse returns has_task: false on invalid JSON', () => {
  const result = parseExtractionResponse('not json');
  assert.deepEqual(result, { has_task: false, tasks: [] });
});

test('parseExtractionResponse returns has_task: false when shape is wrong', () => {
  const result = parseExtractionResponse('{"has_task": "yes", "tasks": []}');
  assert.deepEqual(result, { has_task: false, tasks: [] });
});
```

- [ ] **Step 2: Add the test script and run to verify it fails**

Add to `backend/package.json`'s `"scripts"`: `"test": "node --test"`.

Run: `cd backend && npm test`
Expected: FAIL — `normalizeExtractedTasks` and `parseExtractionResponse` are not exported yet (current `gemini.js` only exports `extractTasks`).

- [ ] **Step 3: Update the prompt and implementation in `backend/services/gemini.js`**

Replace the `SYSTEM_PROMPT` constant:

```js
const SYSTEM_PROMPT = `You extract actionable tasks and meetings from emails. A task is
anything that implies the recipient needs to do something — a request, a
deadline, a commitment, or a follow-up ask. A meeting is a specific type of
task: it must both (a) have an actual clock time (not just a date) and
(b) involve meeting, calling, or syncing with someone. If either is
missing — no clock time, or no meeting/call intent — classify it as a task,
not a meeting. Ignore newsletters, notifications, and purely informational
emails.

Resolve relative dates AND times (e.g. "by Friday", "end of week", "3pm",
"10:30 in the morning") against the email's actual received date, not
today's date. If a clock time is present, include it in the deadline as a
full ISO datetime, not just a date.

Return ONLY valid JSON, no preamble, no markdown formatting:
{
  "has_task": boolean,
  "tasks": [
    {
      "task": "short actionable phrase",
      "type": "task | meeting",
      "deadline": "ISO date or ISO datetime or null",
      "confidence": "high | medium | low",
      "reason": "short quote or paraphrase of the triggering line"
    }
  ]
}`;
```

Replace the body of the file from `stripCodeFences` onward with:

```js
function stripCodeFences(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

/** An ISO date-only string ("2026-08-10") is 10 characters; anything with a
 * time component (e.g. "2026-08-10T15:00:00.000Z") is longer. */
function hasTimeComponent(deadline) {
  return typeof deadline === 'string' && deadline.length > 10;
}

/** Re-validates the model's "meeting" classification server-side: a meeting
 * must have a time-bearing deadline, or it's downgraded to a task. Never
 * trust the model alone to have followed the classification rule. */
export function normalizeExtractedTasks(tasks) {
  return tasks.map((t) => ({
    ...t,
    type: t.type === 'meeting' && hasTimeComponent(t.deadline) ? 'meeting' : 'task',
  }));
}

/** Parses and validates a raw Gemini response into { has_task, tasks }.
 * Returns { has_task: false, tasks: [] } for anything that doesn't parse or
 * doesn't match the expected shape — pure and testable without an API call. */
export function parseExtractionResponse(text) {
  if (!text) return { has_task: false, tasks: [] };
  try {
    const parsed = JSON.parse(stripCodeFences(text));
    if (typeof parsed.has_task !== 'boolean' || !Array.isArray(parsed.tasks)) {
      return { has_task: false, tasks: [] };
    }
    return { has_task: parsed.has_task, tasks: normalizeExtractedTasks(parsed.tasks) };
  } catch (err) {
    console.warn('[gemini] failed to parse extraction response as JSON:', err.message);
    return { has_task: false, tasks: [] };
  }
}

/**
 * Sends an email's subject/sender/body to Gemini for structured task
 * extraction. Returns { has_task, tasks: [...] } or { has_task: false, tasks: [] }
 * if the response can't be parsed as valid JSON.
 */
export async function extractTasks({ subject, sender, receivedDate, body }) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-flash-latest',
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(buildUserMessage({ subject, sender, receivedDate, body }));
  return parseExtractionResponse(result.response.text());
}
```

(Leave `getClient()` and `buildUserMessage()` at the top of the file unchanged.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS, all 7 tests green.

- [ ] **Step 5: Commit and push**

```bash
git add backend/services/gemini.js backend/services/gemini.test.js backend/package.json
git commit -m "Classify extracted items as task or meeting with server-side time validation"
git push
```

---

## Task 3: Backend — dashboard/reminder preferences endpoint

**Files:**
- Modify: `backend/routes/settings.js`
- Create: `backend/routes/settings.preferences.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `PATCH /api/settings/preferences` accepting `{ dashboard_mobile_layout?, reminder_lead_minutes? }`, returning `{ user }`. Exports `validatePreferencesUpdate(body)` (pure, testable) returning `{ updates }` or `{ error }`.

- [ ] **Step 1: Write the failing test**

Create `backend/routes/settings.preferences.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePreferencesUpdate } from './settings.js';

test('accepts a valid dashboard_mobile_layout', () => {
  const result = validatePreferencesUpdate({ dashboard_mobile_layout: 'tabs' });
  assert.deepEqual(result, { updates: { dashboard_mobile_layout: 'tabs' } });
});

test('accepts a valid reminder_lead_minutes', () => {
  const result = validatePreferencesUpdate({ reminder_lead_minutes: 60 });
  assert.deepEqual(result, { updates: { reminder_lead_minutes: 60 } });
});

test('accepts both fields together', () => {
  const result = validatePreferencesUpdate({ dashboard_mobile_layout: 'next_up', reminder_lead_minutes: 10 });
  assert.deepEqual(result, { updates: { dashboard_mobile_layout: 'next_up', reminder_lead_minutes: 10 } });
});

test('rejects an invalid dashboard_mobile_layout', () => {
  const result = validatePreferencesUpdate({ dashboard_mobile_layout: 'grid' });
  assert.ok(result.error);
});

test('rejects an invalid reminder_lead_minutes', () => {
  const result = validatePreferencesUpdate({ reminder_lead_minutes: 45 });
  assert.ok(result.error);
});

test('rejects an empty body', () => {
  const result = validatePreferencesUpdate({});
  assert.ok(result.error);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL — `validatePreferencesUpdate` is not exported from `settings.js` yet.

- [ ] **Step 3: Implement in `backend/routes/settings.js`**

Add near the top of the file (after the existing imports):

```js
const MOBILE_LAYOUTS = ['tabs', 'stacked', 'next_up'];
const REMINDER_LEAD_OPTIONS = [10, 30, 60];

export function validatePreferencesUpdate(body) {
  const { dashboard_mobile_layout, reminder_lead_minutes } = body;
  const updates = {};
  if (dashboard_mobile_layout !== undefined) {
    if (!MOBILE_LAYOUTS.includes(dashboard_mobile_layout)) {
      return { error: `dashboard_mobile_layout must be one of: ${MOBILE_LAYOUTS.join(', ')}` };
    }
    updates.dashboard_mobile_layout = dashboard_mobile_layout;
  }
  if (reminder_lead_minutes !== undefined) {
    if (!REMINDER_LEAD_OPTIONS.includes(reminder_lead_minutes)) {
      return { error: `reminder_lead_minutes must be one of: ${REMINDER_LEAD_OPTIONS.join(', ')}` };
    }
    updates.reminder_lead_minutes = reminder_lead_minutes;
  }
  if (Object.keys(updates).length === 0) {
    return { error: 'No valid fields to update' };
  }
  return { updates };
}
```

Add the route (anywhere among the other `router.*` calls, e.g. after the `/resume` route):

```js
router.patch('/preferences', async (req, res) => {
  const { updates, error: validationError } = validatePreferencesUpdate(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', req.session.userId)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: data });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS, all 6 new tests green (plus the 7 from Task 2).

- [ ] **Step 5: Manually verify the route end to end**

With the backend dev server running (`cd backend && npm run dev`) and logged in via the browser (so a session cookie exists), this route is easiest to confirm visually in Task 10 once the Settings UI calls it. For now, confirm the server starts without error:

Run: `cd backend && node -e "import('./app.js').then(({ createApp }) => { createApp(); console.log('app loads OK'); })"`
Expected: prints `app loads OK` with no thrown error (confirms `settings.js` has no syntax errors and the router mounts cleanly).

- [ ] **Step 6: Commit and push**

```bash
git add backend/routes/settings.js backend/routes/settings.preferences.test.js
git commit -m "Add dashboard/reminder preferences endpoint"
git push
```

---

## Task 4: Backend — Web Push service and subscribe/unsubscribe endpoints

**Files:**
- Create: `backend/services/push.js`
- Create: `backend/services/push.validation.test.js`
- Modify: `backend/routes/settings.js`
- Modify: `backend/package.json` (add `web-push` dependency)

**Interfaces:**
- Consumes: `push_subscriptions` table from Task 1.
- Produces: `sendPushToUser(userId, payload)` (async, from `backend/services/push.js`) — used by Task 6's reminders job. `POST /api/settings/push/subscribe` (body: `{ endpoint, keys: { p256dh, auth } }`), `POST /api/settings/push/unsubscribe` (body: `{ endpoint }`). Exports `validatePushSubscription(body)` (pure, testable).

- [ ] **Step 1: Install `web-push`**

```bash
cd backend && npm install web-push
```

- [ ] **Step 2: Write the failing test**

Create `backend/services/push.validation.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePushSubscription } from './push.js';

test('accepts a well-formed subscription', () => {
  const result = validatePushSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'abc', auth: 'def' } });
  assert.equal(result.error, undefined);
});

test('rejects a missing endpoint', () => {
  const result = validatePushSubscription({ keys: { p256dh: 'abc', auth: 'def' } });
  assert.ok(result.error);
});

test('rejects missing keys', () => {
  const result = validatePushSubscription({ endpoint: 'https://fcm.googleapis.com/x' });
  assert.ok(result.error);
});

test('rejects an empty p256dh', () => {
  const result = validatePushSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: '', auth: 'def' } });
  assert.ok(result.error);
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL — `backend/services/push.js` doesn't exist yet.

- [ ] **Step 4: Implement `backend/services/push.js`**

```js
import webpush from 'web-push';
import { supabase } from '../db/supabase.js';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY are not set — cannot send push notifications.');
  }
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:support@catchmail.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
}

export function validatePushSubscription(body) {
  const { endpoint, keys } = body || {};
  if (!endpoint || typeof endpoint !== 'string') return { error: 'endpoint is required' };
  if (!keys?.p256dh || !keys?.auth) return { error: 'keys.p256dh and keys.auth are required' };
  return {};
}

/** Sends a push notification to every browser subscription on file for a
 * user. Expired/gone subscriptions (410/404) are deleted so dead endpoints
 * don't accumulate; other send failures are logged, not retried, matching
 * the per-item try/catch pattern used in jobs/sync.js and jobs/digest.js. */
export async function sendPushToUser(userId, payload) {
  ensureConfigured();
  const { data: subscriptions, error } = await supabase.from('push_subscriptions').select('*').eq('user_id', userId);
  if (error) throw error;

  for (const sub of subscriptions || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        console.error(`[push] send failed for subscription ${sub.id}:`, err.message);
      }
    }
  }
}
```

- [ ] **Step 5: Add the routes to `backend/routes/settings.js`**

Add the import at the top: `import { validatePushSubscription } from '../services/push.js';`

Add the routes:

```js
router.post('/push/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body;
  const { error: validationError } = validatePushSubscription(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: req.session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

router.post('/push/unsubscribe', async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint is required' });

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', req.session.userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS, all 4 new tests green.

- [ ] **Step 7: Commit and push**

```bash
git add backend/services/push.js backend/services/push.validation.test.js backend/routes/settings.js backend/package.json backend/package-lock.json
git commit -m "Add Web Push service and subscribe/unsubscribe endpoints"
git push
```

---

## Task 5: Backend — SMS/Twilio phone verification (Pro-gated)

**Files:**
- Create: `backend/services/sms.js`
- Create: `backend/services/sms.validation.test.js`
- Modify: `backend/routes/settings.js`
- Modify: `backend/package.json` (add `twilio` dependency)

**Interfaces:**
- Consumes: `users.phone_number`, `users.phone_verified`, `users.plan` from Task 1's schema (already existed for `plan`).
- Produces: `sendReminderSms(phoneNumber, message)` (async, from `backend/services/sms.js`) — used by Task 6. `POST /api/settings/phone/send-code` (body: `{ phone_number }`, Pro-only), `POST /api/settings/phone/verify` (body: `{ phone_number, code }`, Pro-only, sets `phone_verified = true` on success). Exports `isValidE164(phone)` (pure, testable).

- [ ] **Step 1: Install `twilio`**

```bash
cd backend && npm install twilio
```

- [ ] **Step 2: Write the failing test**

Create `backend/services/sms.validation.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidE164 } from './sms.js';

test('accepts a valid E.164 US number', () => {
  assert.equal(isValidE164('+15551234567'), true);
});

test('accepts a valid E.164 international number', () => {
  assert.equal(isValidE164('+442071838750'), true);
});

test('rejects a number missing the + prefix', () => {
  assert.equal(isValidE164('15551234567'), false);
});

test('rejects a number with letters', () => {
  assert.equal(isValidE164('+1555ABC4567'), false);
});

test('rejects an empty string', () => {
  assert.equal(isValidE164(''), false);
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL — `backend/services/sms.js` doesn't exist yet.

- [ ] **Step 4: Implement `backend/services/sms.js`**

```js
import twilio from 'twilio';

let client;
function getClient() {
  if (!client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN are not set — cannot use Twilio.');
    }
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

export function isValidE164(phone) {
  return typeof phone === 'string' && /^\+[1-9]\d{7,14}$/.test(phone);
}

export async function sendVerificationCode(phoneNumber) {
  const c = getClient();
  await c.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID).verifications.create({ to: phoneNumber, channel: 'sms' });
}

export async function checkVerificationCode(phoneNumber, code) {
  const c = getClient();
  const result = await c.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: phoneNumber, code });
  return result.status === 'approved';
}

export async function sendReminderSms(phoneNumber, message) {
  const c = getClient();
  await c.messages.create({ to: phoneNumber, from: process.env.TWILIO_FROM_NUMBER, body: message });
}
```

- [ ] **Step 5: Add the Pro-gated routes to `backend/routes/settings.js`**

Add the import: `import { isValidE164, sendVerificationCode, checkVerificationCode } from '../services/sms.js';`

Add the routes:

```js
async function requireProPlan(req, res, next) {
  const { data: user, error } = await supabase.from('users').select('plan').eq('id', req.session.userId).maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (user?.plan !== 'paid') return res.status(403).json({ error: 'SMS reminders are a Pro feature' });
  next();
}

router.post('/phone/send-code', requireProPlan, async (req, res) => {
  const { phone_number } = req.body;
  if (!isValidE164(phone_number)) {
    return res.status(400).json({ error: 'phone_number must be in E.164 format, e.g. +15551234567' });
  }
  try {
    await sendVerificationCode(phone_number);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/phone/verify', requireProPlan, async (req, res) => {
  const { phone_number, code } = req.body;
  if (!isValidE164(phone_number) || !code) {
    return res.status(400).json({ error: 'phone_number and code are required' });
  }
  try {
    const approved = await checkVerificationCode(phone_number, code);
    if (!approved) return res.status(400).json({ error: 'Invalid or expired code' });

    const { error } = await supabase
      .from('users')
      .update({ phone_number, phone_verified: true })
      .eq('id', req.session.userId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS, all 5 new tests green.

- [ ] **Step 7: Commit and push**

```bash
git add backend/services/sms.js backend/services/sms.validation.test.js backend/routes/settings.js backend/package.json backend/package-lock.json
git commit -m "Add Twilio phone verification for Pro-tier SMS reminders"
git push
```

---

## Task 6: Reminders cron job

**Files:**
- Create: `backend/jobs/reminders.js`
- Create: `backend/jobs/reminders.test.js`
- Modify: `backend/server.js`

**Interfaces:**
- Consumes: `sendPushToUser` (Task 4), `sendReminderSms` (Task 5), `tasks.type`/`reminder_lead_minutes`/`reminder_sent_at` and `users.reminder_lead_minutes`/`plan`/`phone_verified`/`phone_number` (Task 1).
- Produces: `runReminders()` (async, default export usage matches `runSync`/`runDigest`), `isReminderDue(meeting, user, now)` (pure, testable), both from `backend/jobs/reminders.js`.

- [ ] **Step 1: Write the failing test**

Create `backend/jobs/reminders.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReminderDue } from './reminders.js';

const baseUser = { reminder_lead_minutes: 30 };
const baseMeeting = {
  type: 'meeting',
  status: 'open',
  deadline: '2026-08-10T15:00:00.000Z',
  reminder_lead_minutes: null,
  reminder_sent_at: null,
};

test('is due when now is exactly the lead time before the meeting', () => {
  const now = new Date('2026-08-10T14:30:00.000Z');
  assert.equal(isReminderDue(baseMeeting, baseUser, now), true);
});

test('is not due when more than the lead time remains', () => {
  const now = new Date('2026-08-10T14:00:00.000Z');
  assert.equal(isReminderDue(baseMeeting, baseUser, now), false);
});

test('a per-meeting reminder_lead_minutes overrides the user default', () => {
  const meeting = { ...baseMeeting, reminder_lead_minutes: 60 };
  const now = new Date('2026-08-10T14:15:00.000Z'); // 45 min before — due under 60, not under 30
  assert.equal(isReminderDue(meeting, baseUser, now), true);
});

test('is not due for a plain task, even with a deadline', () => {
  const meeting = { ...baseMeeting, type: 'task' };
  const now = new Date('2026-08-10T14:30:00.000Z');
  assert.equal(isReminderDue(meeting, baseUser, now), false);
});

test('is not due once reminder_sent_at is set', () => {
  const meeting = { ...baseMeeting, reminder_sent_at: '2026-08-10T14:30:00.000Z' };
  const now = new Date('2026-08-10T14:31:00.000Z');
  assert.equal(isReminderDue(meeting, baseUser, now), false);
});

test('is not due for a done meeting', () => {
  const meeting = { ...baseMeeting, status: 'done' };
  const now = new Date('2026-08-10T14:30:00.000Z');
  assert.equal(isReminderDue(meeting, baseUser, now), false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && npm test`
Expected: FAIL — `backend/jobs/reminders.js` doesn't exist yet.

- [ ] **Step 3: Implement `backend/jobs/reminders.js`**

```js
import { supabase } from '../db/supabase.js';
import { sendPushToUser } from '../services/push.js';
import { sendReminderSms } from '../services/sms.js';

/** Pure due-check: a meeting fires its reminder once "now" has reached
 * (deadline - lead time). Per-meeting reminder_lead_minutes overrides the
 * user's account-wide default. */
export function isReminderDue(meeting, user, now = new Date()) {
  if (meeting.type !== 'meeting' || meeting.status !== 'open' || !meeting.deadline || meeting.reminder_sent_at) {
    return false;
  }
  const leadMinutes = meeting.reminder_lead_minutes ?? user.reminder_lead_minutes ?? 30;
  const fireAt = new Date(meeting.deadline).getTime() - leadMinutes * 60 * 1000;
  return fireAt <= now.getTime();
}

/**
 * Runs every minute. Loads every open meeting that hasn't fired a reminder
 * yet, sends push (everyone) + SMS (Pro-only, verified phone) for the ones
 * that are due, then marks reminder_sent_at so it never fires twice.
 */
export async function runReminders() {
  const { data: meetings, error } = await supabase
    .from('tasks')
    .select('*, users!inner(id, plan, phone_number, phone_verified, reminder_lead_minutes)')
    .eq('type', 'meeting')
    .eq('status', 'open')
    .is('reminder_sent_at', null);

  if (error) {
    console.error('[jobs/reminders] failed to load meetings:', error);
    return;
  }

  const now = new Date();
  for (const meeting of meetings) {
    const user = meeting.users;
    if (!isReminderDue(meeting, user, now)) continue;

    const message = `Reminder: "${meeting.task_text}" at ${new Date(meeting.deadline).toLocaleString()}`;

    try {
      await sendPushToUser(user.id, { title: 'Upcoming meeting', body: message });
    } catch (err) {
      console.error(`[jobs/reminders] push failed for user ${user.id}:`, err.message);
    }

    if (user.plan === 'paid' && user.phone_verified && user.phone_number) {
      try {
        await sendReminderSms(user.phone_number, message);
      } catch (err) {
        console.error(`[jobs/reminders] sms failed for user ${user.id}:`, err.message);
      }
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ reminder_sent_at: now.toISOString() })
      .eq('id', meeting.id);
    if (updateError) {
      console.error(`[jobs/reminders] failed to mark reminder sent for task ${meeting.id}:`, updateError.message);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test`
Expected: PASS, all 6 new tests green.

- [ ] **Step 5: Wire the job into `backend/server.js`**

Add near the other dynamic imports at the top:

```js
const { runReminders } = await import('./jobs/reminders.js');
```

Add near the other `cron.schedule` calls at the bottom:

```js
// Meeting reminders — checked every minute so a 10-minute lead time is
// still accurate to within a minute.
cron.schedule('* * * * *', () => {
  runReminders().catch((err) => console.error('[cron] reminders job crashed:', err));
});
```

- [ ] **Step 6: Manually verify the server still starts cleanly**

Run: `cd backend && npm run dev`
Expected: logs `[server] CatchMail backend listening on port 4000` with no crash. Leave it running — later tasks build on it. If `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` aren't set yet in `.env`, that's fine; `runReminders` only throws inside the per-meeting `try/catch` when it actually finds a due meeting, which won't happen with today's data (no `type: 'meeting'` rows exist until Task 2's extraction runs on new email).

- [ ] **Step 7: Commit and push**

```bash
git add backend/jobs/reminders.js backend/jobs/reminders.test.js backend/server.js
git commit -m "Add per-minute reminders cron job for push/SMS meeting notifications"
git push
```

---

## Task 7: Frontend — API client additions and desktop meetings rail

**Files:**
- Modify: `frontend/src/lib/api.js`
- Create: `frontend/src/components/MeetingsRail.jsx`
- Modify: `frontend/src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `task.type` field already present on every row returned by `GET /api/tasks` (Task 1's schema change; no backend route change needed since it already `select('*')`).
- Produces: `MeetingsRail({ meetings })` component (default export) — consumed again in Task 8 for mobile. `api.updatePreferences(updates)` — consumed in Task 10.

- [ ] **Step 1: Add the new API client methods**

In `frontend/src/lib/api.js`, add to the exported `api` object:

```js
updatePreferences: (updates) => request('/api/settings/preferences', { method: 'PATCH', body: JSON.stringify(updates) }),
subscribePush: (subscription) => request('/api/settings/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) }),
unsubscribePush: (endpoint) => request('/api/settings/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
sendPhoneCode: (phone_number) => request('/api/settings/phone/send-code', { method: 'POST', body: JSON.stringify({ phone_number }) }),
verifyPhoneCode: (phone_number, code) => request('/api/settings/phone/verify', { method: 'POST', body: JSON.stringify({ phone_number, code }) }),
```

- [ ] **Step 2: Create `frontend/src/components/MeetingsRail.jsx`**

```jsx
function timeUntil(deadline) {
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return 'now';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

export default function MeetingsRail({ meetings }) {
  const sorted = [...meetings].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">
        Upcoming meetings
      </h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No meetings scheduled.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((m) => (
            <li key={m.id} className="bg-indigo-50 dark:bg-indigo-500/10 rounded-lg px-3 py-2">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{m.task_text}</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                {new Date(m.deadline).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })} ·{' '}
                {timeUntil(m.deadline)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Split the dashboard in `frontend/src/pages/Dashboard.jsx`**

Add the import: `import MeetingsRail from '../components/MeetingsRail.jsx';`

After the `statusFiltered` memo, add a derived meetings list (right after the existing `const statusFiltered = useMemo(...)` block):

```js
const meetings = useMemo(
  () => tasks.filter((t) => t.type === 'meeting' && t.status === 'open'),
  [tasks]
);
const taskOnlyFiltered = useMemo(
  () => statusFiltered.filter((t) => t.type !== 'meeting'),
  [statusFiltered]
);
```

Change every subsequent use of `statusFiltered` in the file (the `fuse` memo's source, and `sortedFlatTasks`) from `statusFiltered` to `taskOnlyFiltered` — this keeps meetings out of the plain task list now that they have their own rail.

Wrap the existing `<main>` content (from the stat cards through the closing task-list `</div>`) in a two-column flex layout. Change:

```jsx
<main className="max-w-4xl mx-auto px-6 py-8">
```

to:

```jsx
<main className="max-w-5xl mx-auto px-6 py-8">
```

and wrap everything from the search bar (`<div className="relative mb-4">`) through the end of the task-list rendering in:

```jsx
<div className="flex flex-col md:flex-row gap-6">
  <div className="md:w-64 md:flex-shrink-0">
    <MeetingsRail meetings={meetings} />
  </div>
  <div className="flex-1 min-w-0">
    {/* search bar, filter/sort controls, sync button, syncMessage, and the
        task list JSX all move inside here, unchanged except statusFiltered
        -> taskOnlyFiltered as noted above */}
  </div>
</div>
```

The stat cards grid stays outside this wrapper, above it, as today.

- [ ] **Step 4: Verify visually in the browser**

Run `cd backend && npm run dev` (if not already running from Task 6) and `cd frontend && npm run dev`, then open `http://localhost:3000/dashboard` (already logged in from an earlier session, or connect Gmail again). Confirm: the meetings rail renders on the left (desktop width) showing "No meetings scheduled" (no `type: 'meeting'` rows exist yet since no new email has been processed since Task 2 shipped), and the task list still works (filter/sort/search unaffected).

- [ ] **Step 5: Commit and push**

```bash
git add frontend/src/lib/api.js frontend/src/components/MeetingsRail.jsx frontend/src/pages/Dashboard.jsx
git commit -m "Split dashboard into a meetings rail and task list"
git push
```

---

## Task 8: Frontend — mobile display modes (tabs / stacked / next_up)

**Files:**
- Create: `frontend/src/components/NextUpCard.jsx`
- Modify: `frontend/src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: `MeetingsRail` (Task 7), `user.dashboard_mobile_layout` (already returned by `GET /auth/me` since it's a plain column on `users`).
- Produces: mobile-specific rendering branches inside `Dashboard.jsx`; `NextUpCard({ meetings })` component (default export).

- [ ] **Step 1: Create `frontend/src/components/NextUpCard.jsx`**

```jsx
import { useState } from 'react';
import MeetingsRail from './MeetingsRail.jsx';

function timeUntil(deadline) {
  const diffMs = new Date(deadline).getTime() - Date.now();
  if (diffMs <= 0) return 'now';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)}d`;
}

export default function NextUpCard({ meetings }) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...meetings].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  if (sorted.length === 0) return null;
  const [next, ...rest] = sorted;

  return (
    <div>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-xl px-4 py-3"
      >
        <p className="text-xs uppercase tracking-wide opacity-80">Next up</p>
        <p className="text-sm font-medium">
          {next.task_text} · {timeUntil(next.deadline)}
        </p>
      </button>
      {expanded && rest.length > 0 && (
        <div className="mt-2">
          <MeetingsRail meetings={rest} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire the layout modes into `frontend/src/pages/Dashboard.jsx`**

Add the import: `import NextUpCard from '../components/NextUpCard.jsx';`

Add state near the other `useState` calls: `const [mobileTab, setMobileTab] = useState('meetings');`

Add a derived value right after the `meetings`/`taskOnlyFiltered` memos: `const mobileLayout = user?.dashboard_mobile_layout || 'stacked';`

Replace the two-column wrapper from Task 7's Step 3 with:

```jsx
{mobileLayout === 'tabs' && (
  <div className="md:hidden flex gap-2 mb-3">
    <button
      onClick={() => setMobileTab('meetings')}
      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
        mobileTab === 'meetings' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
      }`}
    >
      Meetings{meetings.length > 0 ? ` (${meetings.length})` : ''}
    </button>
    <button
      onClick={() => setMobileTab('tasks')}
      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
        mobileTab === 'tasks' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
      }`}
    >
      Tasks
    </button>
  </div>
)}

<div className="flex flex-col md:flex-row gap-6">
  <div
    className={`md:block md:w-64 md:flex-shrink-0 ${
      mobileLayout === 'tabs' ? (mobileTab === 'meetings' ? 'block' : 'hidden') : 'block'
    }`}
  >
    {mobileLayout === 'next_up' ? (
      <>
        <div className="md:hidden">
          <NextUpCard meetings={meetings} />
        </div>
        <div className="hidden md:block">
          <MeetingsRail meetings={meetings} />
        </div>
      </>
    ) : (
      <MeetingsRail meetings={meetings} />
    )}
  </div>
  <div className={`flex-1 min-w-0 ${mobileLayout === 'tabs' && mobileTab === 'meetings' ? 'hidden md:block' : 'block'}`}>
    {/* search bar, filter/sort controls, sync button, syncMessage, and the
        task list JSX from Task 7 stay here unchanged */}
  </div>
</div>
```

- [ ] **Step 3: Verify visually in the browser**

With both dev servers running, open Chrome DevTools' device toolbar (or shrink the window below Tailwind's `md` breakpoint, 768px) on `http://localhost:3000/dashboard`. Since `dashboard_mobile_layout` defaults to `'stacked'` and there's no Settings UI to change it yet (that's Task 10), confirm the default `'stacked'` mode: on narrow width, the meetings rail (or "No meetings scheduled") appears above the task list, both always visible, no tab bar. To check `'tabs'` and `'next_up'` ahead of Task 10's UI, temporarily run in the browser console (on the dashboard page): `fetch('http://localhost:4000/api/settings/preferences', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dashboard_mobile_layout: 'tabs' }) })`, then reload — confirm the tab bar appears and switches views. Repeat with `'next_up'`. Set it back to `'stacked'` when done.

- [ ] **Step 4: Commit and push**

```bash
git add frontend/src/components/NextUpCard.jsx frontend/src/pages/Dashboard.jsx
git commit -m "Add mobile display modes: tabs, stacked, and next-up card"
git push
```

---

## Task 9: Frontend — PWA infrastructure for push notifications

**Files:**
- Create: `frontend/public/manifest.webmanifest`
- Create: `frontend/public/sw.js`
- Create: `frontend/src/lib/push.js`
- Modify: `frontend/index.html`

**Interfaces:**
- Consumes: `api.subscribePush`/`api.unsubscribePush` (Task 7).
- Produces: `registerServiceWorker()` and `subscribeToPush(vapidPublicKey)` (both async, from `frontend/src/lib/push.js`) — consumed by Task 10's Settings button.

- [ ] **Step 1: Create `frontend/public/manifest.webmanifest`**

```json
{
  "name": "CatchMail",
  "short_name": "CatchMail",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#4338ca",
  "icons": []
}
```

- [ ] **Step 2: Create `frontend/public/sw.js`**

```js
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'CatchMail', body: 'You have a new reminder.' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'CatchMail', {
      body: data.body,
      icon: '/favicon.ico',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/dashboard'));
});
```

- [ ] **Step 3: Link the manifest in `frontend/index.html`**

Add inside `<head>`, after the existing `<link rel="icon" ...>`:

```html
<link rel="manifest" href="/manifest.webmanifest" />
```

- [ ] **Step 4: Create `frontend/src/lib/push.js`**

```js
import { api } from './api.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) throw new Error('Service workers are not supported in this browser.');
  return navigator.serviceWorker.register('/sw.js');
}

/** Requests notification permission (if not already granted), subscribes
 * the registered service worker to Web Push, and saves the subscription
 * server-side. Throws if permission is denied. */
export async function subscribeToPush(vapidPublicKey) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was denied.');

  const registration = await registerServiceWorker();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const json = subscription.toJSON();
  await api.subscribePush({ endpoint: json.endpoint, keys: json.keys });
  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await api.unsubscribePush(subscription.endpoint);
  await subscription.unsubscribe();
}
```

- [ ] **Step 5: Verify the service worker registers**

With `cd frontend && npm run dev` running, open `http://localhost:3000/dashboard` in Chrome, open DevTools → Application → Service Workers. Run `import('/src/lib/push.js').then(m => m.registerServiceWorker())` in the DevTools console. Expected: a service worker for `sw.js` appears in the panel with status "activated".

- [ ] **Step 6: Commit and push**

```bash
git add frontend/public/manifest.webmanifest frontend/public/sw.js frontend/src/lib/push.js frontend/index.html
git commit -m "Add PWA manifest, service worker, and push subscription helper"
git push
```

---

## Task 10: Frontend — Settings page Notifications section

**Files:**
- Modify: `frontend/src/pages/Settings.jsx`
- Modify: `.env.example` referenced value note (no file change — see Step 5)

**Interfaces:**
- Consumes: `api.updatePreferences`, `api.subscribePush`/`unsubscribePush` via `subscribeToPush`/`unsubscribeFromPush` (Task 9), `api.sendPhoneCode`/`verifyPhoneCode` (Task 5's endpoints via Task 7's client methods), `import.meta.env.VITE_VAPID_PUBLIC_KEY`.
- Produces: nothing consumed further — this is the last task.

- [ ] **Step 1: Add imports and state to `frontend/src/pages/Settings.jsx`**

Add imports: `import { subscribeToPush, unsubscribeFromPush } from '../lib/push.js';`

Add state inside the component, alongside the existing `useState` calls:

```js
const [pushEnabled, setPushEnabled] = useState(false);
const [phoneInput, setPhoneInput] = useState('');
const [codeInput, setCodeInput] = useState('');
const [codeSent, setCodeSent] = useState(false);
```

Add a check for existing push subscription in the existing `useEffect` (after `setUser(user)`):

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration().then(async (reg) => {
    const sub = await reg?.pushManager.getSubscription();
    setPushEnabled(!!sub);
  });
}
```

- [ ] **Step 2: Add handlers**

```js
async function handleTogglePush() {
  try {
    if (pushEnabled) {
      await unsubscribeFromPush();
      setPushEnabled(false);
      setMessage('Push notifications disabled.');
    } else {
      await subscribeToPush(import.meta.env.VITE_VAPID_PUBLIC_KEY);
      setPushEnabled(true);
      setMessage('Push notifications enabled.');
    }
  } catch (err) {
    setMessage(`Push notifications failed: ${err.message}`);
  }
}

async function handleMobileLayoutChange(value) {
  const { user: updated } = await api.updatePreferences({ dashboard_mobile_layout: value });
  setUser(updated);
}

async function handleReminderLeadChange(value) {
  const { user: updated } = await api.updatePreferences({ reminder_lead_minutes: Number(value) });
  setUser(updated);
}

async function handleSendCode() {
  try {
    await api.sendPhoneCode(phoneInput);
    setCodeSent(true);
    setMessage('Verification code sent.');
  } catch (err) {
    setMessage(`Failed to send code: ${err.message}`);
  }
}

async function handleVerifyCode() {
  try {
    await api.verifyPhoneCode(phoneInput, codeInput);
    setUser((u) => ({ ...u, phone_number: phoneInput, phone_verified: true }));
    setCodeSent(false);
    setCodeInput('');
    setMessage('Phone number verified — SMS reminders are on.');
  } catch (err) {
    setMessage(`Verification failed: ${err.message}`);
  }
}
```

- [ ] **Step 3: Add the Notifications section to the JSX**

Insert this new `<section>` between the existing "Gmail sync" and "Danger zone" sections:

```jsx
<section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
  <h2 className="font-semibold text-slate-900 dark:text-white">Notifications</h2>

  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Push notifications</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Get a browser notification before a meeting starts.</p>
    </div>
    <button
      onClick={handleTogglePush}
      className="border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
    >
      {pushEnabled ? 'Disable' : 'Enable'}
    </button>
  </div>

  <div>
    <label className="text-sm font-medium text-slate-900 dark:text-slate-100 block mb-1">Remind me before a meeting</label>
    <select
      value={user.reminder_lead_minutes}
      onChange={(e) => handleReminderLeadChange(e.target.value)}
      className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value={10}>10 minutes before</option>
      <option value={30}>30 minutes before</option>
      <option value={60}>60 minutes before</option>
    </select>
  </div>

  <div>
    <label className="text-sm font-medium text-slate-900 dark:text-slate-100 block mb-1">Mobile dashboard layout</label>
    <select
      value={user.dashboard_mobile_layout}
      onChange={(e) => handleMobileLayoutChange(e.target.value)}
      className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <option value="stacked">Stacked (meetings on top)</option>
      <option value="tabs">Tabs</option>
      <option value="next_up">Next-up card</option>
    </select>
  </div>

  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">SMS reminders</p>
    {user.plan !== 'paid' ? (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        SMS reminders are a{' '}
        <Link to="/coming-soon" className="text-indigo-500 dark:text-indigo-400 hover:underline">
          Pro
        </Link>{' '}
        feature.
      </p>
    ) : user.phone_verified ? (
      <p className="text-sm text-slate-500 dark:text-slate-400">Verified: {user.phone_number}</p>
    ) : (
      <div className="flex flex-col gap-2 max-w-xs">
        <input
          type="tel"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          placeholder="+15551234567"
          className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {!codeSent ? (
          <button onClick={handleSendCode} className="border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            Send code
          </button>
        ) : (
          <>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="6-digit code"
              className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={handleVerifyCode} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
              Verify
            </button>
          </>
        )}
      </div>
    )}
  </div>
</section>
```

- [ ] **Step 4: Add `VITE_VAPID_PUBLIC_KEY` to the local frontend env**

`frontend/.env` isn't committed (per the README's setup instructions, it only documents `VITE_BACKEND_URL`). Add a line to it locally: `VITE_VAPID_PUBLIC_KEY=<same public key as backend's VAPID_PUBLIC_KEY>`. Update the README's frontend `.env` instructions (the block under "Fill in environment variables") to mention this new line alongside `VITE_BACKEND_URL`.

- [ ] **Step 5: Verify visually in the browser**

With both dev servers running and `VITE_PUBLIC_VAPID_KEY`/backend VAPID keys set (generate with `npx web-push generate-vapid-keys` if not done yet), open `http://localhost:3000/settings`. Confirm: the Notifications section renders, the mobile layout and reminder-lead dropdowns save (check the Network tab for a 200 from `PATCH /api/settings/preferences` and that the value persists after a reload), and clicking "Enable" on push notifications triggers the browser's permission prompt and, once granted, flips the button to "Disable". If not on the Pro plan, confirm the SMS section shows the "Pro feature" upsell link instead of the phone form.

- [ ] **Step 6: Commit and push**

```bash
git add frontend/src/pages/Settings.jsx README.md
git commit -m "Add Notifications section to Settings: push, reminder lead time, mobile layout, SMS"
git push
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 → data model; Task 2 → extraction/classification; Tasks 7–8 → dashboard split + mobile layouts; Tasks 4/5/6/9/10 → push + SMS reminders end to end (subscription storage, delivery services, cron scheduling, PWA plumbing, and the Settings UI to configure it all). Every section of the design spec has a corresponding task.
- **Type consistency verified:** `dashboard_mobile_layout` values (`tabs`/`stacked`/`next_up`) match across Task 1's SQL check constraint, Task 3's `MOBILE_LAYOUTS`, and Task 8/10's frontend selects. `reminder_lead_minutes` options (`10`/`30`/`60`) match across Task 3's `REMINDER_LEAD_OPTIONS` and Task 10's `<select>`. `type` (`task`/`meeting`) matches across Task 1's SQL, Task 2's `normalizeExtractedTasks`, and Task 7's filters. Function names (`isReminderDue`, `sendPushToUser`, `sendReminderSms`, `validatePreferencesUpdate`, `validatePushSubscription`, `isValidE164`) are used identically wherever referenced across tasks.
