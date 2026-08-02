import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeExtractedTasks, parseExtractionResponse } from './gemini.js';

test('normalizeExtractedTasks keeps type "meeting" when deadline has a time component', () => {
  const result = normalizeExtractedTasks([
    { task: 'Call with vendor', type: 'meeting', deadline: '2026-08-10T15:00:00.000Z', confidence: 'high', reason: 'call at 3pm' },
  ]);
  assert.equal(result[0].type, 'meeting');
});

test('normalizeExtractedTasks downgrades "meeting" to "task" when deadline is date-only', () => {
  const result = normalizeExtractedTasks([
    { task: 'Send report', type: 'meeting', deadline: '2026-08-10', confidence: 'medium', reason: 'by Friday' },
  ]);
  assert.equal(result[0].type, 'task');
});

test('normalizeExtractedTasks downgrades "meeting" to "task" when deadline is null', () => {
  const result = normalizeExtractedTasks([
    { task: "Sync sometime this week", type: 'meeting', deadline: null, confidence: 'low', reason: "let's sync sometime" },
  ]);
  assert.equal(result[0].type, 'task');
});

test('normalizeExtractedTasks defaults a missing/unknown type to "task"', () => {
  const result = normalizeExtractedTasks([
    { task: 'Approve invoice', deadline: '2026-08-10', confidence: 'high', reason: 'approve by Friday' },
  ]);
  assert.equal(result[0].type, 'task');
});

test('parseExtractionResponse strips code fences and normalizes types', () => {
  const raw = '```json\n{"has_task": true, "tasks": [{"task": "Call vendor", "type": "meeting", "deadline": "2026-08-10T15:00:00.000Z", "confidence": "high", "reason": "3pm call"}]}\n```';
  const result = parseExtractionResponse(raw);
  assert.equal(result.has_task, true);
  assert.equal(result.tasks[0].type, 'meeting');
});

test('parseExtractionResponse returns has_task: false on invalid JSON', () => {
  const result = parseExtractionResponse('not json');
  assert.deepEqual(result, { has_task: false, tasks: [] });
});

test('parseExtractionResponse returns has_task: false when shape is wrong', () => {
  const result = parseExtractionResponse('{"has_task": "yes", "tasks": []}');
  assert.deepEqual(result, { has_task: false, tasks: [] });
});
