import { supabase } from '../db/supabase.js';
import { sendDigestEmail } from '../services/resend.js';

/**
 * Sends each user a daily summary of tasks created in the last 24 hours.
 * Scheduled once a day. Users with zero new tasks are skipped.
 */
export async function runDigest() {
  const { data: users, error } = await supabase.from('users').select('*').eq('paused', false);
  if (error) {
    console.error('[jobs/digest] failed to load users:', error);
    return;
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  for (const user of users) {
    try {
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) continue;

      await sendDigestEmail(user, tasks);
    } catch (err) {
      console.error(`[jobs/digest] digest failed for user ${user.id}:`, err);
    }
  }
}
