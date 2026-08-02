import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePushSubscription } from './push.js';

test('accepts a well-formed subscription', () => {
  const result = validatePushSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'abc', auth: 'def' } });
  assert.equal(result.error, undefined);
});

test('rejects a missing endpoint', () => {
  const result = validatePushSubscription({ keys: { p256dh: 'abc', auth: 'def' } });
  assert.ok(result.error);
});

test('rejects missing keys', () => {
  const result = validatePushSubscription({ endpoint: 'https://fcm.googleapis.com/x' });
  assert.ok(result.error);
});

test('rejects an empty p256dh', () => {
  const result = validatePushSubscription({ endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: '', auth: 'def' } });
  assert.ok(result.error);
});
