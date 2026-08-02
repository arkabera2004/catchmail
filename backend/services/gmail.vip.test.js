import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesVipSender } from './gmail.js';

test('matches when the from header contains a VIP email', () => {
  assert.equal(matchesVipSender('Jane Boss <boss@company.com>', ['boss@company.com']), true);
});

test('matches case-insensitively', () => {
  assert.equal(matchesVipSender('Jane Boss <Boss@Company.com>', ['boss@company.com']), true);
});

test('does not match when sender is not in the list', () => {
  assert.equal(matchesVipSender('Random Person <random@company.com>', ['boss@company.com']), false);
});

test('returns false for an empty VIP list', () => {
  assert.equal(matchesVipSender('Jane Boss <boss@company.com>', []), false);
});
