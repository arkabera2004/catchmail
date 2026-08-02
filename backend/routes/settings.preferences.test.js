import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePreferencesUpdate } from './settings.js';

test('accepts a valid dashboard_mobile_layout', () => {
  const result = validatePreferencesUpdate({ dashboard_mobile_layout: 'tabs' });
  assert.deepEqual(result, { updates: { dashboard_mobile_layout: 'tabs' } });
});

test('accepts a valid reminder_lead_minutes', () => {
  const result = validatePreferencesUpdate({ reminder_lead_minutes: 60 });
  assert.deepEqual(result, { updates: { reminder_lead_minutes: 60 } });
});

test('accepts both fields together', () => {
  const result = validatePreferencesUpdate({ dashboard_mobile_layout: 'next_up', reminder_lead_minutes: 10 });
  assert.deepEqual(result, { updates: { dashboard_mobile_layout: 'next_up', reminder_lead_minutes: 10 } });
});

test('rejects an invalid dashboard_mobile_layout', () => {
  const result = validatePreferencesUpdate({ dashboard_mobile_layout: 'grid' });
  assert.ok(result.error);
});

test('rejects an invalid reminder_lead_minutes', () => {
  const result = validatePreferencesUpdate({ reminder_lead_minutes: 45 });
  assert.ok(result.error);
});

test('rejects an empty body', () => {
  const result = validatePreferencesUpdate({});
  assert.ok(result.error);
});
