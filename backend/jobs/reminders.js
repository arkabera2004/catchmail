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
