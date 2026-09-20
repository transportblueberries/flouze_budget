import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY } from '../js/storage.js';

class FakeElement {
  constructor(document, id = '') {
    this.ownerDocument = document;
    this._id = '';
    this.id = id;
    this.value = '';
    this.checked = false;
    this.hidden = false;
    this.textContent = '';
    this.className = '';
    this.tabIndex = 0;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
  }

  set id(value) {
    this._id = value;
    if (value) this.ownerDocument?.register(this);
  }
  get id() { return this._id; }

  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, callback) {
    const list = this.listeners.get(type) ?? [];
    list.push(callback);
    this.listeners.set(type, list);
  }
  dispatch(type, event = {}) {
    const fullEvent = {
      key: undefined,
      preventDefault() {},
      ...event,
      target: this,
    };
    for (const callback of this.listeners.get(type) ?? []) callback(fullEvent);
  }
  insertAdjacentElement(_position, element) {
    this.ownerDocument.register(element);
  }
  focus() { this.ownerDocument.activeElement = this; }
}

class FakeDocument {
  constructor() {
    this.byId = new Map();
    this.tabs = [];
    this.activeElement = null;
  }
  register(element) {
    if (element.id) this.byId.set(element.id, element);
    return element;
  }
  make(id) { return new FakeElement(this, id); }
  getElementById(id) { return this.byId.get(id) ?? null; }
  querySelector(selector) {
    if (selector.startsWith('#')) return this.getElementById(selector.slice(1));
    return null;
  }
  querySelectorAll(selector) {
    if (selector === '[role="tab"]') return this.tabs;
    return [];
  }
  createElement() { return new FakeElement(this); }
}

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

const valueIds = [
  'budget-income', 'budget-housing', 'budget-groceries', 'budget-transport',
  'budget-insurance', 'budget-education', 'budget-subscriptions', 'budget-leisure',
  'budget-other', 'budget-planned-savings', 'rule-income',
  'savings-target', 'savings-current', 'savings-monthly',
];

const outputIds = [
  'budget-expenses', 'budget-savings', 'budget-unallocated', 'budget-rate', 'budget-status',
  'rule-needs', 'rule-wants', 'rule-savings',
  'savings-remaining', 'savings-months', 'savings-date',
];

function buildDom() {
  const document = new FakeDocument();
  for (const id of [...valueIds, ...outputIds, 'currency', 'remember-values', 'reset-data']) {
    document.make(id);
  }
  document.getElementById('currency').value = 'CHF';

  for (const [id, panelId, selected] of [
    ['tab-budget', 'panel-budget', true],
    ['tab-rule', 'panel-rule', false],
    ['tab-savings', 'panel-savings', false],
  ]) {
    const tab = document.make(id);
    tab.setAttribute('aria-controls', panelId);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.tabs.push(tab);
    const panel = document.make(panelId);
    panel.hidden = !selected;
  }
  return document;
}

async function loadApp() {
  const document = buildDom();
  const storage = fakeStorage();
  globalThis.document = document;
  globalThis.localStorage = storage;
  await import(`../js/app.js?test=${Date.now()}-${Math.random()}`);
  return { document, storage };
}

test('updates the monthly budget immediately when an input changes', async () => {
  const { document } = await loadApp();
  document.getElementById('budget-income').value = '3000';
  document.getElementById('budget-housing').value = '1200';
  document.getElementById('budget-planned-savings').value = '300';
  document.getElementById('budget-income').dispatch('input');

  assert.match(document.getElementById('budget-expenses').textContent, /1.?200\.00/);
  assert.match(document.getElementById('budget-savings').textContent, /300\.00/);
  assert.match(document.getElementById('budget-unallocated').textContent, /1.?500\.00/);
  assert.equal(document.getElementById('budget-rate').textContent, '10.0%');
  assert.equal(document.getElementById('budget-status').dataset.status, 'surplus');
  assert.match(document.getElementById('budget-status').textContent, /surplus/i);
});

test('shows an inline validation error for a negative amount', async () => {
  const { document } = await loadApp();
  const input = document.getElementById('budget-income');
  input.value = '-1';
  input.dispatch('input');

  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.match(document.getElementById('budget-income-error').textContent, /negative/i);
});

test('only stores financial values after explicit opt-in and clears them on opt-out', async () => {
  const { document, storage } = await loadApp();
  document.getElementById('budget-income').value = '2500';
  document.getElementById('budget-income').dispatch('input');
  assert.equal(storage.getItem(STORAGE_KEY), null);

  const remember = document.getElementById('remember-values');
  remember.checked = true;
  remember.dispatch('change');
  assert.match(storage.getItem(STORAGE_KEY), /2500/);

  remember.checked = false;
  remember.dispatch('change');
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test('keyboard tab navigation activates and focuses the next tool', async () => {
  const { document } = await loadApp();
  const budget = document.getElementById('tab-budget');
  const rule = document.getElementById('tab-rule');
  budget.dispatch('keydown', { key: 'ArrowRight', preventDefault() {} });

  assert.equal(rule.getAttribute('aria-selected'), 'true');
  assert.equal(document.getElementById('panel-rule').hidden, false);
  assert.equal(document.getElementById('panel-budget').hidden, true);
  assert.equal(document.activeElement, rule);
});

test('reset clears form values, persistence, currency, and validation errors', async () => {
  const { document, storage } = await loadApp();
  const remember = document.getElementById('remember-values');
  const income = document.getElementById('budget-income');
  income.value = '-1';
  income.dispatch('input');
  remember.checked = true;
  remember.dispatch('change');
  document.getElementById('currency').value = 'EUR';

  document.getElementById('reset-data').dispatch('click');

  assert.equal(income.value, '');
  assert.equal(income.getAttribute('aria-invalid'), null);
  assert.equal(remember.checked, false);
  assert.equal(document.getElementById('currency').value, 'CHF');
  assert.equal(storage.getItem(STORAGE_KEY), null);
});
