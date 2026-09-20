import { normalizeAmount, roundMoney } from './money.js';

export function calculateRule503020(income = 0) {
  const normalizedIncome = normalizeAmount(income);
  return {
    income: roundMoney(normalizedIncome),
    needs: roundMoney(normalizedIncome * 0.5),
    wants: roundMoney(normalizedIncome * 0.3),
    savings: roundMoney(normalizedIncome * 0.2),
  };
}
