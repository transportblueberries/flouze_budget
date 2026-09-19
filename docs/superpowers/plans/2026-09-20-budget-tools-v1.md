# Flouze Budget Tools V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a lightweight, privacy-first single-page student budgeting toolkit with a monthly budget calculator, a 50/30/20 reference calculator, and a savings-goal calculator.

**Architecture:** Use static HTML/CSS plus ES modules. Keep all financial calculations in small pure-function modules, keep persistence behind a localStorage adapter, and keep DOM/event wiring in `js/app.js`. The application must work without a backend and remain hostable as ordinary static files.

**Tech Stack:** HTML5, CSS3, modern browser JavaScript ES modules, Node.js built-in test runner (`node --test`), no production framework, no external test framework.

**Spec:** `docs/superpowers/specs/2026-09-20-budget-tools-design.md`

## Global Constraints

- Plain HTML, CSS and JavaScript; no React, Vue, Svelte or other frontend framework.
- No production dependencies and no backend.
- Calculations run locally in the browser; no financial values are sent to a server.
- Persistence is opt-in and off by default; saved values use localStorage only on the current device.
- CHF is the default display currency; EUR and USD are supported for formatting only, with no FX conversion.
- The 50/30/20 tool is a reference framework, not a rule or personalised recommendation.
- The tools are educational and do not constitute financial advice.
- Use Node's built-in test runner; no external test framework.
- Provide semantic headings, explicit labels, keyboard-operable controls, visible focus states, text-based errors, and status meaning that does not rely on colour alone.
- Do not claim formal WCAG conformance unless separately audited.

## Review Focus

1. **European decimal entry:** a value such as `12,50` should parse as 12.50 rather than fail or become 1250; pinned in Task 1 money tests.
2. **Floating-point near-zero balances:** `0.3 - (0.1 + 0.2)` should render as balanced after currency rounding; pinned in Task 2 budget tests.
3. **Corrupted browser storage:** malformed localStorage JSON should be ignored safely and never prevent the app from loading; pinned in Task 5 storage tests.
4. **Privacy on shared devices:** when remember-values is disabled, financial values must not remain in localStorage; pinned in Task 5 storage tests.
5. **Month-end savings dates:** adding one month to 31 January should clamp to the last day of February instead of rolling into March; pinned in Task 4 savings-goal tests.

---

### Task 1: Money parsing, rounding, formatting, and test harness

**Files:**
- Create: `package.json`
- Create: `js/money.js`
- Create: `tests/money.test.js`

**Interfaces:**
- Produces: `normalizeAmount(raw, options?) -> number`
- Produces: `roundMoney(value) -> number`
- Produces: `formatCurrency(value, currency, locale?) -> string`
- Produces: `SUPPORTED_CURRENCIES = ['CHF', 'EUR', 'USD']`

- [ ] **Step 1: Create the Node test harness and write failing money tests**

Create `package.json`:

```json
{
  "name": "flouze-budget",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

Create `tests/money.test.js`:

```js
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

test('formats supported currencies and rejects unsupported currency codes', () => {
  const formatted = formatCurrency(12.5, 'CHF', 'en-CH');
  assert.match(formatted, /12[.,]50/);
  assert.throws(() => formatCurrency(1, 'GBP'), /unsupported currency/i);
});
```

- [ ] **Step 2: Run the tests and verify they fail because the module does not exist**

Run:

```bash
npm test -- tests/money.test.js
```

Expected: FAIL with a module-not-found error for `js/money.js`.

- [ ] **Step 3: Implement the minimal shared money module**

Create `js/money.js`:

```js
export const SUPPORTED_CURRENCIES = Object.freeze(['CHF', 'EUR', 'USD']);

export function normalizeAmount(raw, { allowBlank = true } = {}) {
  if (raw === '' || raw === null || raw === undefined ||
      (typeof raw === 'string' && raw.trim() === '')) {
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
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
```

- [ ] **Step 4: Run the money tests and verify they pass**

Run:

```bash
npm test -- tests/money.test.js
```

Expected: all money tests PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add package.json js/money.js tests/money.test.js
git commit -m "feat: add shared money utilities"
```

---

### Task 2: Monthly budget calculation engine

**Files:**
- Create: `js/budget.js`
- Create: `tests/budget.test.js`

**Interfaces:**
- Consumes: `normalizeAmount` and `roundMoney` from `js/money.js`
- Produces: `calculateBudget({ income, expenses, plannedSavings }) -> { income, totalExpenses, plannedSavings, unallocated, savingsRate, status }`

- [ ] **Step 1: Write the failing budget tests**

Create `tests/budget.test.js`:

```js
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
  const result = calculateBudget({
    income: 1000,
    expenses: { housing: 900 },
    plannedSavings: 200,
  });
  assert.equal(result.unallocated, -100);
  assert.equal(result.status, 'deficit');
});

test('handles zero income safely', () => {
  const result = calculateBudget({
    income: 0,
    expenses: {},
    plannedSavings: 0,
  });
  assert.equal(result.savingsRate, 0);
  assert.equal(result.status, 'balanced');
});

test('uses currency rounding before deciding balanced status', () => {
  const result = calculateBudget({
    income: 0.3,
    expenses: { example: 0.1 + 0.2 },
    plannedSavings: 0,
  });
  assert.equal(result.unallocated, 0);
  assert.equal(result.status, 'balanced');
});

test('rejects a negative value from any budget field', () => {
  assert.throws(() => calculateBudget({
    income: 1000,
    expenses: { housing: -1 },
    plannedSavings: 0,
  }), /negative/i);
});
```

- [ ] **Step 2: Run the budget tests and verify they fail**

Run:

```bash
npm test -- tests/budget.test.js
```

Expected: FAIL because `calculateBudget` is not implemented.

- [ ] **Step 3: Implement the monthly budget calculation**

Create `js/budget.js`:

```js
import { normalizeAmount, roundMoney } from './money.js';

export function calculateBudget({
  income = 0,
  expenses = {},
  plannedSavings = 0,
} = {}) {
  const normalizedIncome = normalizeAmount(income);
  const normalizedSavings = normalizeAmount(plannedSavings);
  const normalizedExpenses = Object.values(expenses).map(normalizeAmount);

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
```

- [ ] **Step 4: Run the budget tests and verify they pass**

Run:

```bash
npm test -- tests/budget.test.js
```

Expected: all budget tests PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add js/budget.js tests/budget.test.js
git commit -m "feat: add monthly budget calculator"
```

---

### Task 3: 50/30/20 reference calculation engine

**Files:**
- Create: `js/rule-50-30-20.js`
- Create: `tests/rule-50-30-20.test.js`

**Interfaces:**
- Consumes: `normalizeAmount` and `roundMoney` from `js/money.js`
- Produces: `calculateRule503020(income) -> { income, needs, wants, savings }`

- [ ] **Step 1: Write the failing 50/30/20 tests**

Create `tests/rule-50-30-20.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
npm test -- tests/rule-50-30-20.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the reference calculator**

Create `js/rule-50-30-20.js`:

```js
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
```

- [ ] **Step 4: Run the tests and verify they pass**

```bash
npm test -- tests/rule-50-30-20.test.js
```

Expected: all 50/30/20 tests PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add js/rule-50-30-20.js tests/rule-50-30-20.test.js
git commit -m "feat: add 50 30 20 reference calculator"
```

---

### Task 4: Savings-goal calculation engine and stable month arithmetic

**Files:**
- Create: `js/savings-goal.js`
- Create: `tests/savings-goal.test.js`

**Interfaces:**
- Consumes: `normalizeAmount` and `roundMoney` from `js/money.js`
- Produces: `addCalendarMonths(startDate, months) -> Date`
- Produces: `calculateSavingsGoal({ target, current, monthlyContribution }, startDate?) -> { target, current, monthlyContribution, remaining, months, targetDate }`

- [ ] **Step 1: Write the failing savings-goal tests**

Create `tests/savings-goal.test.js`:

```js
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
  const result = calculateSavingsGoal({
    target: 1000,
    current: 200,
    monthlyContribution: 0,
  });

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
  assert.throws(() => calculateSavingsGoal({
    target: -1,
    current: 0,
    monthlyContribution: 10,
  }), /negative/i);
});
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
npm test -- tests/savings-goal.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement savings-goal math and month clamping**

Create `js/savings-goal.js`:

```js
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
```

- [ ] **Step 4: Run the savings-goal tests and verify they pass**

```bash
npm test -- tests/savings-goal.test.js
```

Expected: all savings-goal tests PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add js/savings-goal.js tests/savings-goal.test.js
git commit -m "feat: add savings goal calculator"
```

---

### Task 5: Opt-in local browser persistence

**Files:**
- Create: `js/storage.js`
- Create: `tests/storage.test.js`

**Interfaces:**
- Produces: `STORAGE_KEY = 'flouze-budget:v1'`
- Produces: `loadSavedState(storage) -> object | null`
- Produces: `saveState(storage, state) -> void`
- Produces: `clearState(storage) -> void`
- Produces: `syncSavedState(storage, enabled, state) -> boolean`

- [ ] **Step 1: Write the failing storage tests**

Create `tests/storage.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEY,
  clearState,
  loadSavedState,
  saveState,
  syncSavedState,
} from '../js/storage.js';

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test('round-trips versioned saved state', () => {
  const storage = fakeStorage();
  saveState(storage, { currency: 'CHF', income: '3200' });
  assert.deepEqual(loadSavedState(storage), {
    currency: 'CHF',
    income: '3200',
  });
});

test('ignores corrupted saved JSON instead of throwing', () => {
  const storage = fakeStorage();
  storage.setItem(STORAGE_KEY, '{bad json');
  assert.equal(loadSavedState(storage), null);
});

test('ignores a saved payload with the wrong schema version', () => {
  const storage = fakeStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, state: {} }));
  assert.equal(loadSavedState(storage), null);
});

test('does not retain values when persistence is disabled', () => {
  const storage = fakeStorage();
  saveState(storage, { income: '1000' });
  const persisted = syncSavedState(storage, false, { income: '2000' });
  assert.equal(persisted, false);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test('stores values when persistence is explicitly enabled', () => {
  const storage = fakeStorage();
  const persisted = syncSavedState(storage, true, { income: '2000' });
  assert.equal(persisted, true);
  assert.deepEqual(loadSavedState(storage), { income: '2000' });
});

test('clearState removes saved values', () => {
  const storage = fakeStorage();
  saveState(storage, { income: '1000' });
  clearState(storage);
  assert.equal(loadSavedState(storage), null);
});
```

- [ ] **Step 2: Run the storage tests and verify they fail**

```bash
npm test -- tests/storage.test.js
```

Expected: FAIL because `js/storage.js` does not exist.

- [ ] **Step 3: Implement versioned storage with safe corruption handling**

Create `js/storage.js`:

```js
export const STORAGE_KEY = 'flouze-budget:v1';
const STORAGE_VERSION = 1;

export function loadSavedState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed?.version !== STORAGE_VERSION ||
      !parsed.state ||
      typeof parsed.state !== 'object' ||
      Array.isArray(parsed.state)
    ) {
      return null;
    }
    return parsed.state;
  } catch {
    return null;
  }
}

export function saveState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify({
    version: STORAGE_VERSION,
    state,
  }));
}

export function clearState(storage) {
  storage.removeItem(STORAGE_KEY);
}

export function syncSavedState(storage, enabled, state) {
  if (!enabled) {
    clearState(storage);
    return false;
  }
  saveState(storage, state);
  return true;
}
```

- [ ] **Step 4: Run the storage tests and verify they pass**

```bash
npm test -- tests/storage.test.js
```

Expected: all storage tests PASS.

- [ ] **Step 5: Run the entire calculation/storage suite**

```bash
npm test
```

Expected: all tests from Tasks 1-5 PASS with zero failures.

- [ ] **Step 6: Commit Task 5**

```bash
git add js/storage.js tests/storage.test.js
git commit -m "feat: add opt in local persistence"
```

---

### Task 6: Accessible single-page HTML shell

**Files:**
- Create: `index.html`
- Create: `css/style.css`

**Interfaces:**
- Produces the DOM IDs consumed by `js/app.js` in Task 7.
- Exposes three tab buttons: `tab-budget`, `tab-rule`, `tab-savings`.
- Exposes three panels: `panel-budget`, `panel-rule`, `panel-savings`.
- Exposes global controls: `currency`, `remember-values`, `reset-data`.

- [ ] **Step 1: Create the complete page markup**

Create `index.html` with the following structure and exact IDs:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Free, open-source budgeting tools for students.">
  <title>Flouze Budget Tools</title>
  <link rel="stylesheet" href="./css/style.css">
</head>
<body>
  <header class="site-header">
    <div class="shell">
      <p class="eyebrow">Flouze Budget</p>
      <h1>Simple money tools for students</h1>
      <p class="lede">Plan a monthly budget, explore the 50/30/20 reference, or estimate when you can reach a savings goal.</p>
      <div class="notice" role="note">
        <strong>Private by default.</strong> Your financial data stays in your browser. Flouze does not send it to a server.
      </div>
      <p class="disclaimer">Educational tools only — not personalised financial advice.</p>
    </div>
  </header>

  <main class="shell">
    <section class="preferences" aria-labelledby="preferences-title">
      <h2 id="preferences-title">Preferences</h2>
      <div class="preferences-grid">
        <label for="currency">Display currency
          <select id="currency" name="currency">
            <option value="CHF" selected>CHF</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <label class="checkbox-row" for="remember-values">
          <input id="remember-values" type="checkbox">
          Remember my values on this device
        </label>
        <button id="reset-data" class="button button-secondary" type="button">Reset all data</button>
      </div>
      <p class="shared-device-note">If you enable saving on a shared device, your values remain there until you reset them or clear browser storage.</p>
    </section>

    <nav class="tool-tabs" aria-label="Budget tools" role="tablist">
      <button id="tab-budget" class="tool-tab" type="button" role="tab" aria-selected="true" aria-controls="panel-budget">Monthly budget</button>
      <button id="tab-rule" class="tool-tab" type="button" role="tab" aria-selected="false" aria-controls="panel-rule" tabindex="-1">50 / 30 / 20</button>
      <button id="tab-savings" class="tool-tab" type="button" role="tab" aria-selected="false" aria-controls="panel-savings" tabindex="-1">Savings goal</button>
    </nav>

    <section id="panel-budget" class="tool-panel" role="tabpanel" aria-labelledby="tab-budget">
      <div class="tool-layout">
        <form id="budget-form" novalidate>
          <h2>Monthly budget</h2>
          <p>Enter monthly amounts. Planned savings are kept separate from spending.</p>
          <div class="field-grid">
            <label for="budget-income">Net monthly income<input id="budget-income" inputmode="decimal" autocomplete="off"></label>
            <label for="budget-housing">Housing<input id="budget-housing" inputmode="decimal" autocomplete="off"></label>
            <label for="budget-groceries">Groceries<input id="budget-groceries" inputmode="decimal" autocomplete="off"></label>
            <label for="budget-transport">Transport<input id="budget-transport" inputmode="decimal" autocomplete="off"></label>
            <label for="budget-insurance">Insurance / health<input id="budget-insurance" inputmode="decimal" autocomplete="off"></label>
            <label for="budget-education">Education<input id="budget-education" inputmode="decimal" autocomplete="off"></label>
            <label for="budget-subscriptions">Subscriptions<input id="budget-subscriptions" inputmode="decimal" autocomplete="off"></label>
            <label for="budget-leisure">Leisure<input id="budget-leisure" inputmode="decimal" autocomplete="off"></label>
            <label for="budget-other">Other expenses<input id="budget-other" inputmode="decimal" autocomplete="off"></label>
            <label for="budget-planned-savings">Planned savings<input id="budget-planned-savings" inputmode="decimal" autocomplete="off"></label>
          </div>
        </form>
        <aside class="results-card" aria-live="polite" aria-atomic="true">
          <h3>Monthly summary</h3>
          <dl>
            <div><dt>Expenses</dt><dd id="budget-expenses">CHF 0.00</dd></div>
            <div><dt>Planned savings</dt><dd id="budget-savings">CHF 0.00</dd></div>
            <div><dt>Unallocated</dt><dd id="budget-unallocated">CHF 0.00</dd></div>
            <div><dt>Savings rate</dt><dd id="budget-rate">0.0%</dd></div>
          </dl>
          <p id="budget-status" class="status-text">Balanced: every entered franc is allocated.</p>
        </aside>
      </div>
    </section>

    <section id="panel-rule" class="tool-panel" role="tabpanel" aria-labelledby="tab-rule" hidden>
      <div class="tool-layout">
        <form id="rule-form" novalidate>
          <h2>50 / 30 / 20 reference</h2>
          <p>This is a simple budgeting reference, not a rule or personalised recommendation.</p>
          <label for="rule-income">Net monthly income<input id="rule-income" inputmode="decimal" autocomplete="off"></label>
        </form>
        <aside class="results-card" aria-live="polite" aria-atomic="true">
          <h3>Reference split</h3>
          <dl>
            <div><dt>Needs — 50%</dt><dd id="rule-needs">CHF 0.00</dd></div>
            <div><dt>Wants — 30%</dt><dd id="rule-wants">CHF 0.00</dd></div>
            <div><dt>Savings / debt reduction — 20%</dt><dd id="rule-savings">CHF 0.00</dd></div>
          </dl>
        </aside>
      </div>
    </section>

    <section id="panel-savings" class="tool-panel" role="tabpanel" aria-labelledby="tab-savings" hidden>
      <div class="tool-layout">
        <form id="savings-form" novalidate>
          <h2>Savings goal</h2>
          <div class="field-grid">
            <label for="savings-target">Savings target<input id="savings-target" inputmode="decimal" autocomplete="off"></label>
            <label for="savings-current">Already saved<input id="savings-current" inputmode="decimal" autocomplete="off"></label>
            <label for="savings-monthly">Monthly contribution<input id="savings-monthly" inputmode="decimal" autocomplete="off"></label>
          </div>
        </form>
        <aside class="results-card" aria-live="polite" aria-atomic="true">
          <h3>Goal estimate</h3>
          <dl>
            <div><dt>Remaining</dt><dd id="savings-remaining">CHF 0.00</dd></div>
            <div><dt>Estimated time</dt><dd id="savings-months">Goal already reached</dd></div>
            <div><dt>Approximate date</dt><dd id="savings-date">Today</dd></div>
          </dl>
        </aside>
      </div>
    </section>

    <section class="open-source" aria-labelledby="open-source-title">
      <h2 id="open-source-title">Open source</h2>
      <p>Flouze Budget is MIT licensed. Contributions, bug reports and ideas are welcome.</p>
      <p><a href="https://github.com/transportblueberries/flouze_budget">View the project on GitHub</a> · <a href="./CONTRIBUTING.md">Contribution guide</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <div class="shell">
      <p>Flouze Budget · <a href="./LICENSE">MIT License</a> · <a href="https://flouze.ch">flouze.ch</a></p>
    </div>
  </footer>

  <script type="module" src="./js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the complete mobile-first stylesheet**

Create `css/style.css`:

```css
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #17211b;
  background: #f5f7f4;
  font-synthesis: none;
}

* { box-sizing: border-box; }
body { margin: 0; line-height: 1.5; }
a { color: #174d35; }
a:hover { text-decoration-thickness: 2px; }
button, input, select { font: inherit; }
.shell { width: min(1120px, calc(100% - 2rem)); margin-inline: auto; }
.site-header { padding: 3rem 0 2rem; background: #eef4ef; border-bottom: 1px solid #d9e3dc; }
.eyebrow { margin: 0 0 .5rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; font-size: .8rem; }
h1 { max-width: 760px; margin: 0; font-size: clamp(2rem, 7vw, 4rem); line-height: 1; }
.lede { max-width: 720px; font-size: 1.1rem; }
.notice { max-width: 720px; padding: 1rem; background: #fff; border: 1px solid #c9d8ce; border-radius: .75rem; }
.disclaimer, .shared-device-note { color: #4d5d53; font-size: .925rem; }
.preferences, .open-source { margin: 2rem 0; padding: 1.25rem; background: #fff; border: 1px solid #dce4de; border-radius: 1rem; }
.preferences-grid { display: grid; gap: 1rem; }
.checkbox-row { display: flex; align-items: center; gap: .6rem; }
label { display: grid; gap: .35rem; font-weight: 650; }
input, select { width: 100%; min-height: 44px; padding: .7rem .8rem; border: 1px solid #9caaa1; border-radius: .65rem; background: #fff; color: inherit; }
input:focus-visible, select:focus-visible, button:focus-visible, a:focus-visible { outline: 3px solid #6b8f7a; outline-offset: 2px; }
.field-error { margin: -.15rem 0 .25rem; color: #7a1f1f; font-size: .875rem; font-weight: 600; }
.button, .tool-tab { min-height: 44px; border-radius: .7rem; border: 1px solid #718078; padding: .7rem 1rem; cursor: pointer; }
.button-secondary { background: #fff; color: #17211b; }
.tool-tabs { display: grid; grid-template-columns: 1fr; gap: .5rem; margin: 2rem 0 1rem; }
.tool-tab { background: #fff; color: #17211b; text-align: left; }
.tool-tab[aria-selected="true"] { background: #173c2b; color: #fff; border-color: #173c2b; }
.tool-panel { padding: 1.25rem; background: #fff; border: 1px solid #dce4de; border-radius: 1rem; }
.tool-layout { display: grid; gap: 1.5rem; }
.field-grid { display: grid; gap: 1rem; }
.results-card { padding: 1.25rem; border-radius: .9rem; background: #f0f4f1; align-self: start; }
.results-card h3 { margin-top: 0; }
dl { margin: 0; }
dl div { display: flex; justify-content: space-between; gap: 1rem; padding: .7rem 0; border-bottom: 1px solid #d2dbd5; }
dt { color: #405047; }
dd { margin: 0; font-weight: 750; text-align: right; }
.status-text { margin-bottom: 0; font-weight: 700; }
.status-text[data-status="surplus"]::before { content: "Surplus — "; }
.status-text[data-status="deficit"]::before { content: "Deficit — "; }
.status-text[data-status="balanced"]::before { content: "Balanced — "; }
.site-footer { margin-top: 3rem; padding: 2rem 0; border-top: 1px solid #d9e3dc; color: #4d5d53; }
[hidden] { display: none !important; }

@media (min-width: 720px) {
  .preferences-grid { grid-template-columns: 1fr 1.4fr auto; align-items: end; }
  .tool-tabs { grid-template-columns: repeat(3, 1fr); }
  .tool-tab { text-align: center; }
  .field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tool-layout { grid-template-columns: minmax(0, 1.45fr) minmax(280px, .75fr); }
}
```

- [ ] **Step 3: Run the existing automated suite to ensure the static shell did not disturb calculation code**

```bash
npm test
```

Expected: all calculation and storage tests PASS.

- [ ] **Step 4: Serve the page and verify the static assets resolve**

Run in one terminal:

```bash
python3 -m http.server 4173
```

Then run in another terminal:

```bash
curl -fsS http://127.0.0.1:4173/ | grep -q "Simple money tools for students"
curl -fsS http://127.0.0.1:4173/css/style.css | grep -q "tool-layout"
```

Expected: both commands exit with status 0.

- [ ] **Step 5: Commit Task 6**

```bash
git add index.html css/style.css
git commit -m "feat: add accessible budget tools interface"
```

---

### Task 7: Browser controller, validation, tabs, rendering, and opt-in persistence

**Files:**
- Create: `js/app.js`

**Interfaces:**
- Consumes all calculation modules from Tasks 1-5.
- Consumes the exact DOM IDs defined in Task 6.
- No exported production API is required; `app.js` initializes on module load.

- [ ] **Step 1: Implement the application controller with explicit field validation and rendering**

Create `js/app.js`:

```js
import { calculateBudget } from './budget.js';
import { formatCurrency, normalizeAmount } from './money.js';
import { calculateRule503020 } from './rule-50-30-20.js';
import { calculateSavingsGoal } from './savings-goal.js';
import { clearState, loadSavedState, syncSavedState } from './storage.js';

const budgetFields = [
  'budget-income',
  'budget-housing',
  'budget-groceries',
  'budget-transport',
  'budget-insurance',
  'budget-education',
  'budget-subscriptions',
  'budget-leisure',
  'budget-other',
  'budget-planned-savings',
];

const savingsFields = ['savings-target', 'savings-current', 'savings-monthly'];
const allValueFields = [...budgetFields, 'rule-income', ...savingsFields];
const currencySelect = document.querySelector('#currency');
const rememberCheckbox = document.querySelector('#remember-values');
const resetButton = document.querySelector('#reset-data');
const tabs = [...document.querySelectorAll('[role="tab"]')];

function money(value) {
  return formatCurrency(value, currencySelect.value, 'en-CH');
}

function setFieldError(input, message = '') {
  const errorId = `${input.id}-error`;
  let error = document.getElementById(errorId);

  if (!error && message) {
    error = document.createElement('p');
    error.id = errorId;
    error.className = 'field-error';
    input.insertAdjacentElement('afterend', error);
  }

  if (error) {
    error.textContent = message;
    error.hidden = !message;
  }

  if (message) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorId);
  } else {
    input.removeAttribute('aria-invalid');
    if (input.getAttribute('aria-describedby') === errorId) {
      input.removeAttribute('aria-describedby');
    }
  }
}

function readAmount(id) {
  const input = document.getElementById(id);
  try {
    const value = normalizeAmount(input.value);
    setFieldError(input);
    return value;
  } catch (error) {
    setFieldError(input, error.message);
    return null;
  }
}

function renderBudget() {
  const values = Object.fromEntries(budgetFields.map((id) => [id, readAmount(id)]));
  if (Object.values(values).some((value) => value === null)) return;

  const result = calculateBudget({
    income: values['budget-income'],
    expenses: {
      housing: values['budget-housing'],
      groceries: values['budget-groceries'],
      transport: values['budget-transport'],
      insurance: values['budget-insurance'],
      education: values['budget-education'],
      subscriptions: values['budget-subscriptions'],
      leisure: values['budget-leisure'],
      other: values['budget-other'],
    },
    plannedSavings: values['budget-planned-savings'],
  });

  document.querySelector('#budget-expenses').textContent = money(result.totalExpenses);
  document.querySelector('#budget-savings').textContent = money(result.plannedSavings);
  document.querySelector('#budget-unallocated').textContent = money(result.unallocated);
  document.querySelector('#budget-rate').textContent = `${(result.savingsRate * 100).toFixed(1)}%`;

  const status = document.querySelector('#budget-status');
  status.dataset.status = result.status;
  status.textContent = result.status === 'surplus'
    ? `${money(result.unallocated)} remains unallocated.`
    : result.status === 'deficit'
      ? `Your plan exceeds income by ${money(Math.abs(result.unallocated))}.`
      : 'Every entered amount is allocated.';
}

function renderRule() {
  const income = readAmount('rule-income');
  if (income === null) return;
  const result = calculateRule503020(income);
  document.querySelector('#rule-needs').textContent = money(result.needs);
  document.querySelector('#rule-wants').textContent = money(result.wants);
  document.querySelector('#rule-savings').textContent = money(result.savings);
}

function renderSavings() {
  const target = readAmount('savings-target');
  const current = readAmount('savings-current');
  const monthlyContribution = readAmount('savings-monthly');
  if ([target, current, monthlyContribution].some((value) => value === null)) return;

  const result = calculateSavingsGoal({ target, current, monthlyContribution });
  document.querySelector('#savings-remaining').textContent = money(result.remaining);

  const months = document.querySelector('#savings-months');
  const date = document.querySelector('#savings-date');

  if (result.months === 0) {
    months.textContent = 'Goal already reached';
    date.textContent = 'Today';
  } else if (result.months === null) {
    months.textContent = 'No completion date at the current contribution';
    date.textContent = 'Increase the monthly contribution to calculate a date';
  } else {
    months.textContent = `${result.months} month${result.months === 1 ? '' : 's'}`;
    date.textContent = new Intl.DateTimeFormat('en-CH', { dateStyle: 'medium' })
      .format(result.targetDate);
  }
}

function renderAll() {
  renderBudget();
  renderRule();
  renderSavings();
}

function serialiseState() {
  return {
    currency: currencySelect.value,
    values: Object.fromEntries(allValueFields.map((id) => [id, document.getElementById(id).value])),
  };
}

function persistIfEnabled() {
  syncSavedState(localStorage, rememberCheckbox.checked, serialiseState());
}

function restoreSavedState() {
  const state = loadSavedState(localStorage);
  if (!state) return;

  if (['CHF', 'EUR', 'USD'].includes(state.currency)) {
    currencySelect.value = state.currency;
  }
  if (state.values && typeof state.values === 'object') {
    for (const id of allValueFields) {
      if (typeof state.values[id] === 'string') {
        document.getElementById(id).value = state.values[id];
      }
    }
  }
  rememberCheckbox.checked = true;
}

function activateTab(tab) {
  for (const candidate of tabs) {
    const selected = candidate === tab;
    candidate.setAttribute('aria-selected', String(selected));
    candidate.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(candidate.getAttribute('aria-controls'));
    panel.hidden = !selected;
  }
}

for (const id of allValueFields) {
  document.getElementById(id).addEventListener('input', () => {
    renderAll();
    persistIfEnabled();
  });
}

currencySelect.addEventListener('change', () => {
  renderAll();
  persistIfEnabled();
});

rememberCheckbox.addEventListener('change', () => {
  persistIfEnabled();
});

resetButton.addEventListener('click', () => {
  clearState(localStorage);
  rememberCheckbox.checked = false;
  currencySelect.value = 'CHF';
  for (const id of allValueFields) {
    const input = document.getElementById(id);
    input.value = '';
    setFieldError(input);
  }
  renderAll();
});

for (const tab of tabs) {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = tabs.indexOf(tab);
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : event.key === 'ArrowRight'
          ? (current + 1) % tabs.length
          : (current - 1 + tabs.length) % tabs.length;
    activateTab(tabs[next]);
    tabs[next].focus();
  });
}

restoreSavedState();
renderAll();
```

- [ ] **Step 2: Run the full automated test suite**

```bash
npm test
```

Expected: all pure calculation and storage tests PASS with zero failures.

- [ ] **Step 3: Run a browser smoke test manually against the local server**

Start the server:

```bash
python3 -m http.server 4173
```

Verify these behaviors in a browser:

1. `3'000` is intentionally **not** accepted; enter `3000` or `3000,50` instead.
2. `3000` income, `1200` housing and `300` planned savings update results without a submit button.
3. A negative entry displays an inline text error and marks the field invalid.
4. Currency changes update all displayed amounts but do not alter numeric values.
5. 50/30/20 explicitly displays the reference disclaimer.
6. Savings goal `1000 / 200 / 300` displays 3 months.
7. Enabling “Remember my values” survives a reload; disabling it removes saved data.
8. “Reset all data” clears values, restores CHF, disables persistence and clears errors.
9. Left/right arrow keys move between tool tabs and update the visible panel.
10. The page remains usable at 320 CSS pixels wide and at 200% browser zoom.

- [ ] **Step 4: Commit Task 7**

```bash
git add js/app.js
git commit -m "feat: wire interactive budget tools"
```

---

### Task 8: Project documentation and release verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Documents the actual V1 behavior implemented in Tasks 1-7.
- Does not claim deployment, analytics, user counts, formal accessibility conformance, or features that are not present.

- [ ] **Step 1: Update README with functional-tool documentation**

Add the following sections after the existing project introduction and before the contributor/governance sections:

```markdown
## Budget tools

The public repository now includes three lightweight tools:

- **Monthly budget** — compare net monthly income with common student expense categories and planned savings.
- **50 / 30 / 20 reference** — see a simple needs / wants / savings split. This is a reference framework, not a personalised recommendation.
- **Savings goal** — estimate how many monthly contributions are needed to reach a target, without assuming investment returns or interest.

The tools support CHF, EUR and USD display formatting. Currency selection changes formatting only; Flouze does not perform foreign-exchange conversion.

## Privacy model

The calculators run entirely in the browser. No backend is required and financial values are not sent to a server by this project.

Saving values is optional and disabled by default. If enabled, values are stored in the browser's localStorage on that device. Use **Reset all data** before leaving a shared device.

## Run locally

No application dependencies are required.

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173` in a browser.

## Tests

The calculation and storage modules use Node's built-in test runner:

```bash
npm test
```

## Important note

Flouze Budget provides educational budgeting utilities. It does not provide personalised financial advice, investment advice, credit decisions or bank-account connectivity.
```

- [ ] **Step 2: Run all tests fresh**

```bash
npm test
```

Expected: zero failed tests.

- [ ] **Step 3: Verify every required static file is reachable from the local server**

With `python3 -m http.server 4173` running:

```bash
for path in / /css/style.css /js/app.js /js/budget.js /js/rule-50-30-20.js /js/savings-goal.js /js/storage.js /js/money.js; do
  curl -fsS "http://127.0.0.1:4173${path}" >/dev/null || exit 1
done
```

Expected: command exits 0.

- [ ] **Step 4: Perform final requirement tie-out against the design spec**

Check each item below and do not mark the release complete if any item is false:

```text
[ ] Monthly budget outputs expenses, planned savings, unallocated amount, savings rate, and surplus/balanced/deficit status.
[ ] 50/30/20 shows 50%, 30%, and 20% and visibly states that it is only a reference.
[ ] Savings goal handles already-reached, zero-contribution, and partial-month cases.
[ ] CHF is default; EUR and USD format values without conversion.
[ ] Persistence is off by default and uses localStorage only after explicit opt-in.
[ ] Reset clears local values and form state.
[ ] No backend or analytics dependency exists.
[ ] Negative/invalid values produce text errors rather than crashes.
[ ] Tab controls are keyboard-operable and results do not rely on colour alone.
[ ] README documents privacy, local running, tests, and the educational-use disclaimer.
```

- [ ] **Step 5: Commit Task 8**

```bash
git add README.md
git commit -m "docs: document budget tools v1"
```

---

### Task 9: Preserve community contribution runway for follow-on tools

**Files:**
- No production file changes required.
- Create three GitHub issues after V1 is verified.

**Interfaces:**
- Keeps later calculators outside V1 while making the next open-source contributions concrete.

- [ ] **Step 1: Create an issue for a subscription annual-cost calculator**

Title:

```text
Add a subscription annual-cost calculator
```

Body:

```markdown
## Goal
Help students understand the yearly cost of recurring monthly subscriptions.

## Proposed V2 scope
- Enter one or more subscription names and monthly prices
- Show monthly total and annualised total
- Use the existing CHF/EUR/USD formatting utilities
- Keep all calculations local in the browser
- Add pure-function tests before UI wiring

This should remain a standalone educational calculator and must not add accounts, a backend or recurring-payment integrations.
```

- [ ] **Step 2: Create an issue for an emergency-fund target calculator**

Title:

```text
Add an emergency-fund target calculator
```

Body:

```markdown
## Goal
Provide a simple way to convert essential monthly expenses into an emergency-fund target.

## Proposed V2 scope
- Input essential monthly expenses
- Choose a target number of months
- Output the resulting target amount
- Clearly explain that the chosen number of months is a user assumption, not personalised advice
- Reuse existing money validation, formatting and privacy patterns
```

- [ ] **Step 3: Create an issue for a semester / annual budget converter**

Title:

```text
Add a semester and annual budget converter
```

Body:

```markdown
## Goal
Help students translate costs that occur per semester or per year into comparable monthly amounts.

## Proposed V2 scope
- Accept monthly, semester and annual amounts
- Convert them into monthly and annual equivalents
- Keep the conversion rules explicit in the UI
- Reuse existing money parsing and currency formatting
- No exchange-rate conversion
```

- [ ] **Step 4: Final commit/state check**

Run:

```bash
git status --short
npm test
```

Expected: `git status --short` is empty and the full test suite has zero failures.
