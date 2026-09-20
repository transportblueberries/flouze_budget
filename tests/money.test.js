import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORTED_CURRENCIES,
  formatCurrency,
  normalizeAmount,
  roundMoney,
} from '../js/money.js';

test('supports exactly CHF, EUR, and USD', () => {
  assert.deepEqual(SUPPORTED_CURRENCIES, ['CHF', 'EUR', 'USD']);
});

test('blank money input resolves to zero', () => {
  assert.equal(normalizeAmount(''), 0);
  assert.equal(normalizeAmount('   '), 0);
  assert.equal(normalizeAmount(null), 0);
});

test('accepts decimal comma input', () => {
  assert.equal(normalizeAmount('12,50'), 12.5);
});

test('rejects negative and non-finite values', () => {
  assert.throws(() => normalizeAmount('-1'), /negative/i);
  assert.throws(() => normalizeAmount(Infinity), /valid amount/i);
  assert.throws(() => normalizeAmount('not-a-number'), /valid amount/i);
});

test('rounds normal floating point noise to currency precision', () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(12.345), 12.35);
});

test('rounds negative half-cent values symmetrically', () => {
  assert.equal(roundMoney(-1.005), -1.01);
  assert.equal(roundMoney(-0.005), -0.01);
});

test('formats supported currencies and rejects unsupported currency codes', () => {
  const formatted = formatCurrency(12.5, 'CHF', 'en-CH');
  assert.match(formatted, /12[.,]50/);
  assert.throws(() => formatCurrency(1, 'GBP'), /unsupported currency/i);
});
