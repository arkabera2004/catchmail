import { google } from 'googleapis';
import { supabase } from '../db/supabase.js';
import { decrypt } from '../lib/crypto.js';
import { getOAuthClient } from './gmail.js';

const MAX_RANGE_DAYS = 366;

/** Validates the start/end query params for listing calendar events. Pure
 * so it's testable without a live Google API call. */
export function validateEventsRange({ start, end }) {
  if (!start) return { error: 'start is required' };
  if (!end) return { error: 'end is required' };

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (Number.isNaN(startMs)) return { error: 'start is not a valid date' };
  if (Number.isNaN(endMs)) return { error: 'end is not a valid date' };
  if (endMs <= startMs) return { error: 'end must be after start' };
  if (endMs - startMs > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) {
    return { error: `range cannot exceed ${MAX_RANGE_DAYS} days` };
  }
  return {};
}

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
 * Lists every event on the user's primary Google Calendar within
 * [timeMin, timeMax), normalized to a lean shape for the frontend calendar
 * views (hourly/daily/weekly/monthly).
 */
export async function listEvents(user, timeMin, timeMax) {
  const calendar = await getAuthedCalendarClient(user);
  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500,
  });

  return (data.items || []).map((e) => ({
    id: e.id,
    summary: e.summary || '(no title)',
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    allDay: !e.start?.dateTime,
    htmlLink: e.htmlLink,
  }));
}

/** Returns every event in `existingEvents` whose time range overlaps
 * [start, end). All-day events (a "date" instead of "dateTime") are ignored
 * — they aren't a scheduling conflict in the sense we care about here.
 * `excludeId` skips an event (e.g. the one just created for this same task)
 * so it never conflicts with itself. */
export function findOverlaps(existingEvents, start, end, excludeId) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  return existingEvents.filter((event) => {
    if (event.id === excludeId) return false;
    if (!event.start?.dateTime || !event.end?.dateTime) return false;
    const eventStart = new Date(event.start.dateTime).getTime();
    const eventEnd = new Date(event.end.dateTime).getTime();
    return eventStart < endMs && eventEnd > startMs;
  });
}

/**
 * Creates a Google Calendar event for every open task that doesn't already
 * have one (tracked via tasks.calendar_event_id). Returns how many were
 * created vs. already synced, plus any scheduling conflicts detected for
 * timed (non all-day) events.
 */
export async function syncTasksToCalendar(user, tasks) {
  const calendar = await getAuthedCalendarClient(user);

  let created = 0;
  let skipped = 0;
  const conflicts = [];

  for (const task of tasks) {
    if (task.calendar_event_id) {
      skipped += 1;
      continue;
    }

    const event = buildEvent(task);

    if (event.start.dateTime) {
      const { data: existing } = await calendar.events.list({
        calendarId: 'primary',
        timeMin: event.start.dateTime,
        timeMax: event.end.dateTime,
        singleEvents: true,
      });
      const overlaps = findOverlaps(existing.items || [], event.start.dateTime, event.end.dateTime);
      if (overlaps.length > 0) {
        conflicts.push({
          task_id: task.id,
          task_text: task.task_text,
          conflictsWith: overlaps.map((e) => e.summary || '(untitled event)'),
        });
      }
    }

    const { data: createdEvent } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    const { error } = await supabase
      .from('tasks')
      .update({ calendar_event_id: createdEvent.id })
      .eq('id', task.id);
    if (error) throw error;

    created += 1;
  }

  return { created, skipped, conflicts };
}
