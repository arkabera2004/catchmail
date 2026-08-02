import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidE164 } from './sms.js';

test('accepts a valid E.164 US number', () => {
  assert.equal(isValidE164('+15551234567'), true);
});

test('accepts a valid E.164 international number', () => {
  assert.equal(isValidE164('+442071838750'), true);
});

test('rejects a number missing the + prefix', () => {
  assert.equal(isValidE164('15551234567'), false);
});

test('rejects a number with letters', () => {
  assert.equal(isValidE164('+1555ABC4567'), false);
});

test('rejects an empty string', () => {
  assert.equal(isValidE164(''), false);
});
