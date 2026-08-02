import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findOverlaps } from './calendar.js';

const existingEvents = [
  { id: 'e1', summary: 'Standup', start: { dateTime: '2026-08-10T15:00:00.000Z' }, end: { dateTime: '2026-08-10T15:30:00.000Z' } },
  { id: 'e2', summary: 'All-day offsite', start: { date: '2026-08-10' }, end: { date: '2026-08-11' } },
];

test('finds an event that overlaps the given window', () => {
  const overlaps = findOverlaps(existingEvents, '2026-08-10T15:15:00.000Z', '2026-08-10T15:45:00.000Z');
  assert.equal(overlaps.length, 1);
  assert.equal(overlaps[0].summary, 'Standup');
});

test('finds no overlap when the window is fully before an existing event', () => {
  const overlaps = findOverlaps(existingEvents, '2026-08-10T14:00:00.000Z', '2026-08-10T14:30:00.000Z');
  assert.equal(overlaps.length, 0);
});

test('finds no overlap when the window is fully after an existing event', () => {
  const overlaps = findOverlaps(existingEvents, '2026-08-10T16:00:00.000Z', '2026-08-10T16:30:00.000Z');
  assert.equal(overlaps.length, 0);
});

test('ignores all-day events (date, not dateTime)', () => {
  const overlaps = findOverlaps(existingEvents, '2026-08-10T12:00:00.000Z', '2026-08-10T12:30:00.000Z');
  assert.equal(overlaps.length, 0);
});

test('excludes an event by id (so the just-updated event never conflicts with itself)', () => {
  const overlaps = findOverlaps(existingEvents, '2026-08-10T15:15:00.000Z', '2026-08-10T15:45:00.000Z', 'e1');
  assert.equal(overlaps.length, 0);
});
