import path from 'node:path';
import dotenv from 'dotenv';
import cron from 'node-cron';

// .env lives at the repo root, one level up from backend/.
dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') });

import { createApp } from './app.js';
import { runSync } from './jobs/sync.js';
import { runDigest } from './jobs/digest.js';

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
