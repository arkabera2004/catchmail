import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getRangeForView, groupEventsByDay, groupEventsByHour, startOfWeek } from './calendarViews.js';

test('startOfWeek rounds back to Sunday', () => {
  // 2026-08-12 is a Wednesday; the Sunday before it is 2026-08-09.
  const result = startOfWeek(new Date('2026-08-12T15:00:00.000Z'));
  assert.equal(result.getDate(), 9);
});

test('getRangeForView("day") covers exactly one day', () => {
  const { start, end } = getRangeForView('day', new Date('2026-08-12T15:00:00.000Z'));
  assert.equal(end.getTime() - start.getTime(), 24 * 60 * 60 * 1000);
});

test('getRangeForView("hour") covers exactly one day, same as "day"', () => {
  const day = getRangeForView('day', new Date('2026-08-12T15:00:00.000Z'));
  const hour = getRangeForView('hour', new Date('2026-08-12T15:00:00.000Z'));
  assert.equal(day.start.getTime(), hour.start.getTime());
  assert.equal(day.end.getTime(), hour.end.getTime());
});

test('getRangeForView("week") covers exactly 7 days starting Sunday', () => {
  const { start, end } = getRangeForView('week', new Date('2026-08-12T15:00:00.000Z'));
  assert.equal(start.getDay(), 0);
  assert.equal(end.getTime() - start.getTime(), 7 * 24 * 60 * 60 * 1000);
});

test('getRangeForView("month") covers the calendar month', () => {
  const { start, end } = getRangeForView('month', new Date('2026-08-12T15:00:00.000Z'));
  assert.equal(start.getDate(), 1);
  assert.equal(start.getMonth(), 7); // August is month index 7
  assert.equal(end.getMonth(), 8); // September 1st
});

test('groupEventsByDay buckets events by their start date', () => {
  const events = [
    { id: '1', start: '2026-08-10T15:00:00.000Z' },
    { id: '2', start: '2026-08-10T18:00:00.000Z' },
    { id: '3', start: '2026-08-11T09:00:00.000Z' },
  ];
  const grouped = groupEventsByDay(events);
  assert.equal(grouped.get('2026-08-10').length, 2);
  assert.equal(grouped.get('2026-08-11').length, 1);
});

test('groupEventsByHour buckets timed events by hour and separates all-day events', () => {
  // Constructed in local time (not UTC) so this test isn't timezone-flaky.
  const events = [
    { id: '1', start: new Date(2026, 7, 10, 9, 30), allDay: false },
    { id: '2', start: new Date(2026, 7, 10, 9, 45), allDay: false },
    { id: '3', start: '2026-08-10', allDay: true },
  ];
  const { hours, allDay } = groupEventsByHour(events);
  assert.equal(hours[9].length, 2);
  assert.equal(allDay.length, 1);
});
