import { normalizeAmount, roundMoney } from './money.js';

export function calculateBudget({
  income = 0,
  expenses = {},
  plannedSavings = 0,
} = {}) {
  const normalizedIncome = normalizeAmount(income);
  const normalizedSavings = normalizeAmount(plannedSavings);
  const normalizedExpenses = Object.values(expenses).map((value) => normalizeAmount(value));

  const totalExpenses = roundMoney(
    normalizedExpenses.reduce((sum, value) => sum + value, 0),
  );
  const unallocated = roundMoney(
    normalizedIncome - totalExpenses - normalizedSavings,
  );
  const savingsRate = normalizedIncome > 0
    ? normalizedSavings / normalizedIncome
    : 0;

  const status = unallocated > 0
    ? 'surplus'
    : unallocated < 0
      ? 'deficit'
      : 'balanced';

  return {
    income: roundMoney(normalizedIncome),
    totalExpenses,
    plannedSavings: roundMoney(normalizedSavings),
    unallocated,
    savingsRate,
    status,
  };
}
