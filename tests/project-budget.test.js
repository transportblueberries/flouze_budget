import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProjectBudget } from '../js/project-budget.js';

const pair = [
  { id: 'mehdi', name: 'Mehdi', weight: 1 },
  { id: 'hanna', name: 'Hanna', weight: 1 },
];

test('splits shared expenses equally and returns the net settlement', () => {
  const result = calculateProjectBudget({
    participants: pair,
    transactions: [
      { description: 'Hotel', amount: 100, rate: 1, payerId: 'mehdi', shared: true },
      { description: 'Dinner', amount: 20, rate: 1, payerId: 'hanna', shared: true },
    ],
  });

  assert.equal(result.totalSpend, 120);
  assert.equal(result.sharedSpend, 120);
  assert.equal(result.personalSpend, 0);
  assert.deepEqual(result.participants.map(({ id, sharedPaid, share, balance }) => ({ id, sharedPaid, share, balance })), [
    { id: 'mehdi', sharedPaid: 100, share: 60, balance: 40 },
    { id: 'hanna', sharedPaid: 20, share: 60, balance: -40 },
  ]);
  assert.deepEqual(result.settlements, [{ from: 'hanna', to: 'mehdi', amount: 40 }]);
});

test('supports weighted splits such as 45.7 / 54.3', () => {
  const result = calculateProjectBudget({
    participants: [
      { id: 'mehdi', name: 'Mehdi', weight: 45.7 },
      { id: 'hanna', name: 'Hanna', weight: 54.3 },
    ],
    transactions: [{ amount: 100, rate: 1, payerId: 'mehdi', shared: true }],
  });

  assert.equal(result.participants[0].share, 45.7);
  assert.equal(result.participants[1].share, 54.3);
  assert.deepEqual(result.settlements, [{ from: 'hanna', to: 'mehdi', amount: 54.3 }]);
});

test('converts each transaction to the reference currency before splitting', () => {
  const result = calculateProjectBudget({
    participants: pair,
    transactions: [{ amount: 10, currency: 'EUR', rate: 0.95, payerId: 'mehdi', shared: true }],
  });

  assert.equal(result.totalSpend, 9.5);
  assert.equal(result.participants[0].share, 4.75);
  assert.equal(result.participants[1].share, 4.75);
  assert.deepEqual(result.settlements, [{ from: 'hanna', to: 'mehdi', amount: 4.75 }]);
});

test('personal transactions count toward trip spend but never create debt', () => {
  const result = calculateProjectBudget({
    participants: pair,
    transactions: [
      { amount: 100, rate: 1, payerId: 'mehdi', shared: true },
      { amount: 24, rate: 1, payerId: 'hanna', shared: false },
    ],
  });

  assert.equal(result.totalSpend, 124);
  assert.equal(result.sharedSpend, 100);
  assert.equal(result.personalSpend, 24);
  assert.equal(result.participants[1].personalPaid, 24);
  assert.deepEqual(result.settlements, [{ from: 'hanna', to: 'mehdi', amount: 50 }]);
});

test('can split one expense only among selected participants', () => {
  const result = calculateProjectBudget({
    participants: [
      { id: 'a', name: 'A', weight: 1 },
      { id: 'b', name: 'B', weight: 1 },
      { id: 'c', name: 'C', weight: 1 },
    ],
    transactions: [
      { amount: 30, rate: 1, payerId: 'a', shared: true, sharedWith: ['a', 'b'] },
    ],
  });

  assert.deepEqual(result.participants.map(({ id, share }) => ({ id, share })), [
    { id: 'a', share: 15 },
    { id: 'b', share: 15 },
    { id: 'c', share: 0 },
  ]);
  assert.deepEqual(result.settlements, [{ from: 'b', to: 'a', amount: 15 }]);
});

test('allocates rounding cents without losing or creating money', () => {
  const result = calculateProjectBudget({
    participants: [
      { id: 'a', name: 'A', weight: 1 },
      { id: 'b', name: 'B', weight: 1 },
      { id: 'c', name: 'C', weight: 1 },
    ],
    transactions: [{ amount: 10, rate: 1, payerId: 'a', shared: true }],
  });

  assert.equal(result.participants.reduce((sum, participant) => sum + participant.share, 0), 10);
  assert.deepEqual(result.participants.map(({ share }) => share), [3.34, 3.33, 3.33]);
});

test('rejects invalid participants, payer ids and conversion rates', () => {
  assert.throws(() => calculateProjectBudget({ participants: [{ id: 'a', weight: 1 }], transactions: [] }), /at least two/i);
  assert.throws(() => calculateProjectBudget({ participants: pair, transactions: [{ amount: 10, rate: 1, payerId: 'missing', shared: true }] }), /payer/i);
  assert.throws(() => calculateProjectBudget({ participants: pair, transactions: [{ amount: 10, rate: 0, payerId: 'mehdi', shared: true }] }), /rate/i);
});

test('tracks planned budget remaining or overrun', () => {
  const result = calculateProjectBudget({
    plannedBudget: 150,
    participants: pair,
    transactions: [{ amount: 120, rate: 1, payerId: 'mehdi', shared: true }],
  });
  assert.equal(result.plannedBudget, 150);
  assert.equal(result.budgetRemaining, 30);
  assert.equal(result.budgetStatus, 'under');

  const over = calculateProjectBudget({
    plannedBudget: 100,
    participants: pair,
    transactions: [{ amount: 120, rate: 1, payerId: 'mehdi', shared: true }],
  });
  assert.equal(over.budgetRemaining, -20);
  assert.equal(over.budgetStatus, 'over');
});

test('aggregates reference-currency spend by category', () => {
  const result = calculateProjectBudget({
    participants: pair,
    transactions: [
      { amount: 100, rate: 1, payerId: 'mehdi', shared: true, category: 'lodging' },
      { amount: 20, rate: 0.95, payerId: 'hanna', shared: true, category: 'food' },
      { amount: 5, rate: 1, payerId: 'hanna', shared: false, category: 'food' },
    ],
  });

  assert.deepEqual(result.byCategory, { lodging: 100, food: 24 });
});
