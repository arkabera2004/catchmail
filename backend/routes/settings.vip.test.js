import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePreferencesUpdate } from './settings.js';

test('accepts a valid vip_senders list', () => {
  const result = validatePreferencesUpdate({ vip_senders: ['boss@company.com', 'client@bigcorp.com'] });
  assert.deepEqual(result, { updates: { vip_senders: ['boss@company.com', 'client@bigcorp.com'] } });
});

test('trims and lowercases vip_senders entries', () => {
  const result = validatePreferencesUpdate({ vip_senders: ['  Boss@Company.com  '] });
  assert.deepEqual(result, { updates: { vip_senders: ['boss@company.com'] } });
});

test('drops empty entries from vip_senders', () => {
  const result = validatePreferencesUpdate({ vip_senders: ['boss@company.com', '  ', ''] });
  assert.deepEqual(result, { updates: { vip_senders: ['boss@company.com'] } });
});

test('rejects vip_senders that is not an array', () => {
  const result = validatePreferencesUpdate({ vip_senders: 'boss@company.com' });
  assert.ok(result.error);
});

test('rejects more than 20 vip_senders', () => {
  const result = validatePreferencesUpdate({ vip_senders: Array.from({ length: 21 }, (_, i) => `person${i}@x.com`) });
  assert.ok(result.error);
});
