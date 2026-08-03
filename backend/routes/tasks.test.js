import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTaskUpdates } from './tasks.js';

test('accepts a valid status', () => {
  assert.deepEqual(buildTaskUpdates({ status: 'done' }), { updates: { status: 'done' } });
});

test('rejects an invalid status', () => {
  const result = buildTaskUpdates({ status: 'archived' });
  assert.ok(result.error);
});

test('accepts a deadline', () => {
  assert.deepEqual(buildTaskUpdates({ deadline: '2026-08-10T15:00:00.000Z' }), {
    updates: { deadline: '2026-08-10T15:00:00.000Z' },
  });
});

test('accepts a null deadline (clearing it)', () => {
  assert.deepEqual(buildTaskUpdates({ deadline: null }), { updates: { deadline: null } });
});

test('accepts valid feedback values', () => {
  assert.deepEqual(buildTaskUpdates({ feedback: 'up' }), { updates: { feedback: 'up' } });
  assert.deepEqual(buildTaskUpdates({ feedback: 'down' }), { updates: { feedback: 'down' } });
});

test('accepts null feedback (clearing it)', () => {
  assert.deepEqual(buildTaskUpdates({ feedback: null }), { updates: { feedback: null } });
});

test('rejects an invalid feedback value', () => {
  const result = buildTaskUpdates({ feedback: 'meh' });
  assert.ok(result.error);
});

test('rejects an empty body', () => {
  const result = buildTaskUpdates({});
  assert.ok(result.error);
});

test('accepts a snoozed_until timestamp', () => {
  assert.deepEqual(buildTaskUpdates({ snoozed_until: '2026-08-10T00:00:00.000Z' }), {
    updates: { snoozed_until: '2026-08-10T00:00:00.000Z' },
  });
});

test('accepts a null snoozed_until (unsnoozing)', () => {
  assert.deepEqual(buildTaskUpdates({ snoozed_until: null }), { updates: { snoozed_until: null } });
});

test('rejects a malformed deadline string', () => {
  const result = buildTaskUpdates({ deadline: 'not-a-date' });
  assert.ok(result.error);
});

test('rejects a malformed snoozed_until string', () => {
  const result = buildTaskUpdates({ snoozed_until: 'whenever' });
  assert.ok(result.error);
});

test('rejects a non-string, non-null deadline', () => {
  const result = buildTaskUpdates({ deadline: 12345 });
  assert.ok(result.error);
});
