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
