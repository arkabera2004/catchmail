import { google } from 'googleapis';
import { supabase } from '../db/supabase.js';
import { decrypt } from '../lib/crypto.js';
import { getOAuthClient } from './gmail.js';

async function getAuthedCalendarClient(user) {
  if (!user.google_refresh_token_enc) {
    throw new Error(`User ${user.id} has no stored Gmail refresh token.`);
  }
  const refreshToken = decrypt(user.google_refresh_token_enc);
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

function buildEvent(task) {
  const event = {
    summary: task.task_text,
    description: task.source_email_link
      ? `Added by CatchMail. Source email: ${task.source_email_link}`
      : 'Added by CatchMail.',
  };

  if (task.deadline) {
    // Tasks have a deadline date/time — represent as a 30-minute event.
    const start = new Date(task.deadline);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    event.start = { dateTime: start.toISOString() };
    event.end = { dateTime: end.toISOString() };
  } else {
    // No deadline — create an all-day event for today so it still shows up.
    const today = new Date().toISOString().slice(0, 10);
    event.start = { date: today };
    event.end = { date: today };
  }

  return event;
}

/**
 * Creates a Google Calendar event for every open task that doesn't already
 * have one (tracked via tasks.calendar_event_id). Returns how many were
 * created vs. already synced.
 */
export async function syncTasksToCalendar(user, tasks) {
  const calendar = await getAuthedCalendarClient(user);

  let created = 0;
  let skipped = 0;

  for (const task of tasks) {
    if (task.calendar_event_id) {
      skipped += 1;
      continue;
    }

    const { data: createdEvent } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: buildEvent(task),
    });

    const { error } = await supabase
      .from('tasks')
      .update({ calendar_event_id: createdEvent.id })
      .eq('id', task.id);
    if (error) throw error;

    created += 1;
  }

  return { created, skipped };
}
