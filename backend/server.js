import path from 'node:path';
import dotenv from 'dotenv';

// .env lives at the repo root, one level up from backend/. This must run
// before anything that reads process.env is imported — static ES module
// imports are hoisted above top-level code, so those imports are deferred
// (dynamic) until after dotenv.config() has run.
dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') });

const cron = (await import('node-cron')).default;
const { createApp } = await import('./app.js');
const { runSync } = await import('./jobs/sync.js');
const { runDigest } = await import('./jobs/digest.js');

const app = createApp();
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`[server] CatchMail backend listening on port ${port}`);
});

// Incremental Gmail sync every 15 minutes.
cron.schedule('*/15 * * * *', () => {
  console.log('[cron] running Gmail sync...');
  runSync().catch((err) => console.error('[cron] sync job crashed:', err));
});

// Daily digest email at 08:00 server time.
cron.schedule('0 8 * * *', () => {
  console.log('[cron] running daily digest...');
  runDigest().catch((err) => console.error('[cron] digest job crashed:', err));
});
