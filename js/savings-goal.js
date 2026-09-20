import { normalizeAmount, roundMoney } from './money.js';

export function addCalendarMonths(startDate, months) {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) {
    throw new TypeError('Enter a valid start date.');
  }
  if (!Number.isInteger(months) || months < 0) {
    throw new RangeError('Months must be a non-negative integer.');
  }

  const result = new Date(startDate.getTime());
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
}

export function calculateSavingsGoal({
  target = 0,
  current = 0,
  monthlyContribution = 0,
} = {}, startDate = new Date()) {
  const normalizedTarget = normalizeAmount(target);
  const normalizedCurrent = normalizeAmount(current);
  const normalizedContribution = normalizeAmount(monthlyContribution);
  const remaining = roundMoney(
    Math.max(normalizedTarget - normalizedCurrent, 0),
  );

  let months;
  let targetDate;

  if (remaining === 0) {
    months = 0;
    targetDate = new Date(startDate.getTime());
  } else if (normalizedContribution === 0) {
    months = null;
    targetDate = null;
  } else {
    months = Math.ceil(remaining / normalizedContribution);
    targetDate = addCalendarMonths(startDate, months);
  }

  return {
    target: roundMoney(normalizedTarget),
    current: roundMoney(normalizedCurrent),
    monthlyContribution: roundMoney(normalizedContribution),
    remaining,
    months,
    targetDate,
  };
}
