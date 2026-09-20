export const SUPPORTED_CURRENCIES = Object.freeze(['CHF', 'EUR', 'USD']);

export function normalizeAmount(raw, { allowBlank = true } = {}) {
  if (
    raw === '' || raw === null || raw === undefined ||
    (typeof raw === 'string' && raw.trim() === '')
  ) {
    if (allowBlank) return 0;
    throw new TypeError('Enter a valid amount.');
  }

  const normalized = typeof raw === 'string'
    ? raw.trim().replace(',', '.')
    : raw;
  const value = Number(normalized);

  if (!Number.isFinite(value)) {
    throw new TypeError('Enter a valid amount.');
  }
  if (value < 0) {
    throw new RangeError('Amount cannot be negative.');
  }

  return value;
}

export function roundMoney(value) {
  if (!Number.isFinite(value)) {
    throw new TypeError('Enter a valid amount.');
  }
  const sign = value < 0 ? -1 : 1;
  const rounded = sign * (Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100);
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatCurrency(value, currency = 'CHF', locale = 'en-CH') {
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new RangeError(`Unsupported currency: ${currency}`);
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(value));
}
