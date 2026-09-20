import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCalendarMonths,
  calculateSavingsGoal,
} from '../js/savings-goal.js';

test('rounds up partial months required to reach a goal', () => {
  const result = calculateSavingsGoal({
    target: 1000,
    current: 200,
    monthlyContribution: 300,
  }, new Date(2026, 8, 20));

  assert.equal(result.remaining, 800);
  assert.equal(result.months, 3);
  assert.deepEqual(
    [result.targetDate.getFullYear(), result.targetDate.getMonth(), result.targetDate.getDate()],
    [2026, 11, 20],
  );
});

test('returns zero months when the goal is already reached', () => {
  const start = new Date(2026, 8, 20);
  const result = calculateSavingsGoal({
    target: 1000,
    current: 1200,
    monthlyContribution: 100,
  }, start);

  assert.equal(result.remaining, 0);
  assert.equal(result.months, 0);
  assert.equal(result.targetDate.getTime(), start.getTime());
});

test('returns no target date when contribution is zero and money remains', () => {
  const result = calculateSavingsGoal({ target: 1000, current: 200, monthlyContribution: 0 });
  assert.equal(result.remaining, 800);
  assert.equal(result.months, null);
  assert.equal(result.targetDate, null);
});

test('clamps month-end dates instead of rolling into the next month', () => {
  const result = addCalendarMonths(new Date(2026, 0, 31), 1);
  assert.deepEqual(
    [result.getFullYear(), result.getMonth(), result.getDate()],
    [2026, 1, 28],
  );
});

test('rejects negative savings inputs', () => {
  assert.throws(() => calculateSavingsGoal({ target: -1, current: 0, monthlyContribution: 10 }), /negative/i);
});
