import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBudget } from '../js/budget.js';

test('calculates a normal monthly budget without double-counting savings', () => {
  const result = calculateBudget({
    income: 3000,
    expenses: {
      housing: 1200,
      groceries: 350,
      transport: 100,
      insurance: 250,
      education: 100,
      subscriptions: 50,
      leisure: 200,
      other: 100,
    },
    plannedSavings: 300,
  });

  assert.equal(result.totalExpenses, 2350);
  assert.equal(result.plannedSavings, 300);
  assert.equal(result.unallocated, 350);
  assert.equal(result.savingsRate, 0.1);
  assert.equal(result.status, 'surplus');
});

test('returns deficit when spending plus savings exceeds income', () => {
  const result = calculateBudget({ income: 1000, expenses: { housing: 900 }, plannedSavings: 200 });
  assert.equal(result.unallocated, -100);
  assert.equal(result.status, 'deficit');
});

test('handles zero income safely', () => {
  const result = calculateBudget({ income: 0, expenses: {}, plannedSavings: 0 });
  assert.equal(result.savingsRate, 0);
  assert.equal(result.status, 'balanced');
});

test('uses currency rounding before deciding balanced status', () => {
  const result = calculateBudget({ income: 0.3, expenses: { example: 0.1 + 0.2 }, plannedSavings: 0 });
  assert.equal(result.unallocated, 0);
  assert.equal(result.status, 'balanced');
});

test('rejects a negative value from any budget field', () => {
  assert.throws(() => calculateBudget({ income: 1000, expenses: { housing: -1 }, plannedSavings: 0 }), /negative/i);
});
