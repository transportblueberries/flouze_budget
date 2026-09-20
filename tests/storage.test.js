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
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test('round-trips versioned saved state', () => {
  const storage = fakeStorage();
  saveState(storage, { currency: 'CHF', income: '3200' });
  assert.deepEqual(loadSavedState(storage), { currency: 'CHF', income: '3200' });
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
