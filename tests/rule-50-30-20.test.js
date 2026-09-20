import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRule503020 } from '../js/rule-50-30-20.js';

test('splits income into 50, 30, and 20 percent buckets', () => {
  assert.deepEqual(calculateRule503020(3000), {
    income: 3000,
    needs: 1500,
    wants: 900,
    savings: 600,
  });
});

test('rounds decimal results to money precision', () => {
  assert.deepEqual(calculateRule503020(1000.01), {
    income: 1000.01,
    needs: 500.01,
    wants: 300,
    savings: 200,
  });
});

test('handles zero income', () => {
  assert.deepEqual(calculateRule503020(0), {
    income: 0,
    needs: 0,
    wants: 0,
    savings: 0,
  });
});

test('rejects negative income', () => {
  assert.throws(() => calculateRule503020(-1), /negative/i);
});
