# CatchMail

CatchMail scans your Gmail inbox, uses Gemini to detect implicit and
explicit tasks hidden in emails — "can you send this by Friday?" — and turns
them into a clean, trackable to-do list with deadlines. A daily digest email
summarizes new tasks so nothing slips through.

## How it works

1. **Connect Gmail** — Google OAuth (read-only `gmail.readonly` scope) doubles
   as both sign-in and Gmail access. The refresh token is encrypted
   (AES-256-GCM) before being stored in Supabase.
2. **Backfill** — on first connect, the last 7 days of inbox mail is scanned.
3. **Ongoing sync** — a cron job polls Gmail every 15 minutes using
   `users.history.list` for incremental sync (not a full re-scan).
4. **Extraction** — new emails are filtered (no-reply senders, newsletters,
   calendar invites, automated notifications are skipped before ever calling
   the LLM) then sent to Gemini with a structured-output prompt; the
   parsed JSON becomes rows in the `tasks` table.
5. **Dashboard** — a React app shows tasks with deadline, confidence, status,
   and a link back to the source email; you can mark done, edit the deadline,
   or delete.
6. **Digest** — once a day, Resend sends each user a summary of tasks created
   in the last 24 hours.
7. **Billing** — free tier is 1 connected inbox / 30 extracted tasks per
   month; upgrading via Razorpay Checkout removes the cap. A webhook keeps
   subscription status in sync.

## Project structure

```
catchmail/
├── frontend/          # React + Tailwind app (Vite)
├── backend/            # Express API + cron jobs
│   ├── routes/          # auth, tasks, settings, billing
│   ├── services/        # gmail.js, gemini.js, calendar.js, resend.js, razorpay.js
│   ├── jobs/             # sync.js (15-min poll), digest.js (daily email)
│   └── db/               # supabase client + schema.sql
├── .env.example
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 20+
- A Supabase project
- A Google Cloud project with the Gmail API enabled
- A Gemini API key (free tier, no card required)
- A Resend account with a verified sending domain
- A Razorpay account (test mode is fine)

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/<your-username>/catchmail.git
   cd catchmail
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Fill in environment variables**

   Copy `.env.example` to `.env` at the project root (already done and
   gitignored if you cloned this repo fresh — otherwise: `cp .env.example .env`)
   and fill in every value. See [Environment variables](#environment-variables)
   below for where to get each one. Also create `frontend/.env` with:

   ```
   VITE_BACKEND_URL=http://localhost:4000
   ```

   The backend automatically loads the **root** `.env` file (see
   `backend/server.js`), regardless of which directory you run `npm run dev`
   from.

3. **Run the database migration**

   Open your Supabase project's SQL editor and run the contents of
   `backend/db/schema.sql`. This creates the `users`, `tasks`, `sync_state`,
   and `subscriptions` tables with row-level security enabled.

4. **Start the dev servers** (two terminals)

   ```bash
   # Terminal 1 — backend (http://localhost:4000)
   cd backend && npm run dev

   # Terminal 2 — frontend (http://localhost:3000)
   cd frontend && npm run dev
   ```

5. Visit `http://localhost:3000`, click **Connect Gmail**, and authorize.

## Environment variables

All variables live in `.env.example` at the project root, each with a comment
explaining where to obtain it: Google Cloud Console (OAuth + Gmail API),
Google AI Studio (Gemini API key), Supabase project settings, Resend
dashboard, Razorpay dashboard (test mode), plus a generated `ENCRYPTION_KEY`
and `SESSION_SECRET` (`openssl rand -hex 32` for both).

## Deployment

### Frontend → Vercel

1. Import the repo in Vercel, set the root directory to `frontend/`.
2. Set the environment variable `VITE_BACKEND_URL` to your deployed backend URL.
3. Deploy. Vercel auto-detects the Vite build (`npm run build`, output `dist/`).

### Backend → Railway

1. Create a new Railway project from this repo, set the root directory to `backend/`.
2. Set the start command to `npm start`.
3. Add every variable from `.env.example` in Railway's Variables tab (with
   real values), setting `APP_URL` to your Vercel URL and `BACKEND_URL` to
   Railway's generated domain.
4. Update the Google OAuth client's authorized redirect URI to
   `https://<your-railway-domain>/auth/google/callback`, and set
   `GOOGLE_REDIRECT_URI` to match.
5. Point your Razorpay webhook at `https://<your-railway-domain>/api/billing/webhooks/razorpay`.
6. Deploy. The 15-minute Gmail sync and daily digest cron jobs run inside
   this same process (`node-cron`, wired in `backend/server.js`) — no
   separate scheduler service is needed.

## Notes on cost control

Before any email is sent to Gemini, `backend/services/gmail.js`'s
`shouldSkipMessage` filters out no-reply senders, newsletters (via the
`List-Unsubscribe` header), and calendar invites — these never incur a
Gemini API call.

## License

All rights reserved. This code is proprietary — see [LICENSE](./LICENSE) for
terms. It is not open source; viewing is permitted, reuse is not.
