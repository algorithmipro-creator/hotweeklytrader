import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAdminToken, getAdminToken, storeAdminToken } from './admin-session.js';

function createStorage(initial = {}) {
  const state = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, value);
    },
    removeItem(key) {
      state.delete(key);
    },
  };
}

function installDocument(initialCookie = '') {
  const state = { value: initialCookie };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      get cookie() {
        return state.value;
      },
      set cookie(nextValue) {
        state.value = nextValue;
      },
    },
  });
  return state;
}

test('getAdminToken reads only admin_token and never falls back to auth_token', () => {
  const storage = createStorage({
    admin_token: '',
    auth_token: 'user-token',
  });

  assert.equal(getAdminToken(storage), null);
});

test('storeAdminToken persists admin token without touching auth token', () => {
  const storage = createStorage({
    auth_token: 'user-token',
  });
  const documentState = installDocument();

  storeAdminToken(storage, 'admin-token');

  assert.equal(storage.getItem('admin_token'), 'admin-token');
  assert.equal(storage.getItem('auth_token'), 'user-token');
  assert.match(documentState.value, /admin_token=admin-token/);
});

test('clearAdminToken removes only admin token', () => {
  const storage = createStorage({
    admin_token: 'admin-token',
    auth_token: 'user-token',
  });
  const documentState = installDocument('admin_token=admin-token');

  clearAdminToken(storage);

  assert.equal(storage.getItem('admin_token'), null);
  assert.equal(storage.getItem('auth_token'), 'user-token');
  assert.match(documentState.value, /admin_token=;/);
});
