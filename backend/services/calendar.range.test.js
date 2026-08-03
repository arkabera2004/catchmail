import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEventsRange } from './calendar.js';

test('accepts a valid start/end range', () => {
  const result = validateEventsRange({ start: '2026-08-10T00:00:00.000Z', end: '2026-08-17T00:00:00.000Z' });
  assert.equal(result.error, undefined);
});

test('rejects a missing start', () => {
  const result = validateEventsRange({ end: '2026-08-17T00:00:00.000Z' });
  assert.ok(result.error);
});

test('rejects a missing end', () => {
  const result = validateEventsRange({ start: '2026-08-10T00:00:00.000Z' });
  assert.ok(result.error);
});

test('rejects an unparseable date', () => {
  const result = validateEventsRange({ start: 'not-a-date', end: '2026-08-17T00:00:00.000Z' });
  assert.ok(result.error);
});

test('rejects an end before start', () => {
  const result = validateEventsRange({ start: '2026-08-17T00:00:00.000Z', end: '2026-08-10T00:00:00.000Z' });
  assert.ok(result.error);
});

test('rejects a range longer than 366 days', () => {
  const result = validateEventsRange({ start: '2026-01-01T00:00:00.000Z', end: '2028-01-01T00:00:00.000Z' });
  assert.ok(result.error);
});
