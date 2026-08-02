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
