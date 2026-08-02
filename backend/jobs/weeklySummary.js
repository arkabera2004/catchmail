import { supabase } from '../db/supabase.js';
import { sendWeeklySummaryEmail } from '../services/resend.js';

/**
 * Sends each user a Monday-morning summary of everything due/scheduled in
 * the coming week — a re-engagement hook alongside the daily digest, for
 * users who don't open the app daily. Users with nothing upcoming are
 * skipped.
 */
export async function runWeeklySummary() {
  const { data: users, error } = await supabase.from('users').select('*').eq('paused', false);
  if (error) {
    console.error('[jobs/weeklySummary] failed to load users:', error);
    return;
  }

  const now = new Date().toISOString();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const user of users) {
    try {
      const { data: upcoming, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .gte('deadline', now)
        .lte('deadline', in7Days)
        .order('deadline', { ascending: true });

      if (tasksError) throw tasksError;
      if (!upcoming || upcoming.length === 0) continue;

      const meetings = upcoming.filter((t) => t.type === 'meeting');
      const tasks = upcoming.filter((t) => t.type !== 'meeting');

      await sendWeeklySummaryEmail(user, meetings, tasks);
    } catch (err) {
      console.error(`[jobs/weeklySummary] failed for user ${user.id}:`, err);
    }
  }
}
