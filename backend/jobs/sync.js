import { supabase } from '../db/supabase.js';
import { incrementalSync } from '../services/gmail.js';

/**
 * Polls Gmail for every active (non-paused, connected) user using
 * users.history.list for incremental sync. Scheduled every 15 minutes.
 */
export async function runSync() {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('paused', false)
    .not('google_refresh_token_enc', 'is', null);

  if (error) {
    console.error('[jobs/sync] failed to load users:', error);
    return;
  }

  for (const user of users) {
    try {
      await incrementalSync(user);
    } catch (err) {
      console.error(`[jobs/sync] sync failed for user ${user.id}:`, err);
    }
  }
}
