import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findRecurringMatch } from './gmail.js';

const existingMeetings = [
  { id: 'm1', task_text: 'Weekly standup', deadline: '2026-08-03T15:00:00.000Z', type: 'meeting', status: 'open' },
  { id: 'm2', task_text: 'Vendor call', deadline: '2026-08-05T10:00:00.000Z', type: 'meeting', status: 'open' },
];

test('matches a meeting with the same text and same day-of-week/time', () => {
  // 2026-08-10 is also a Monday, same as 2026-08-03 — same weekday and time.
  const match = findRecurringMatch(existingMeetings, 'Weekly standup', '2026-08-10T15:00:00.000Z');
  assert.equal(match?.id, 'm1');
});

test('matches case/whitespace-insensitively on task text', () => {
  const match = findRecurringMatch(existingMeetings, '  weekly STANDUP  ', '2026-08-10T15:00:00.000Z');
  assert.equal(match?.id, 'm1');
});

test('does not match when the time of day differs', () => {
  const match = findRecurringMatch(existingMeetings, 'Weekly standup', '2026-08-10T16:00:00.000Z');
  assert.equal(match, null);
});

test('does not match when the day of week differs', () => {
  // 2026-08-11 is a Tuesday, not a Monday.
  const match = findRecurringMatch(existingMeetings, 'Weekly standup', '2026-08-11T15:00:00.000Z');
  assert.equal(match, null);
});

test('does not match a different task text', () => {
  const match = findRecurringMatch(existingMeetings, 'Something else entirely', '2026-08-10T15:00:00.000Z');
  assert.equal(match, null);
});

test('returns null when there are no existing meetings', () => {
  const match = findRecurringMatch([], 'Weekly standup', '2026-08-10T15:00:00.000Z');
  assert.equal(match, null);
});
