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
    values: Object.fromEntries(
      allValueFields.map((id) => [id, document.getElementById(id).value]),
    ),
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
