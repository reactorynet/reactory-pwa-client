/**
 * localforage mock for Jest/jsdom environment.
 * jsdom does not support IndexedDB, so localforage throws at import time.
 * This stub provides the same API surface with no-op Promise-based methods.
 */

const store = {};

const localforage = {
  getItem: jest.fn((key) => Promise.resolve(store[key] ?? null)),
  setItem: jest.fn((key, value) => {
    store[key] = value;
    return Promise.resolve(value);
  }),
  removeItem: jest.fn((key) => {
    delete store[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    return Promise.resolve();
  }),
  keys: jest.fn(() => Promise.resolve(Object.keys(store))),
  length: jest.fn(() => Promise.resolve(Object.keys(store).length)),
  iterate: jest.fn(() => Promise.resolve()),
  config: jest.fn(),
  createInstance: jest.fn(() => localforage),
  defineDriver: jest.fn(() => Promise.resolve()),
  driver: jest.fn(() => 'mock'),
  ready: jest.fn(() => Promise.resolve()),
  setDriver: jest.fn(() => Promise.resolve()),
  supports: jest.fn(() => false),
  INDEXEDDB: 'asyncStorage',
  LOCALSTORAGE: 'localStorageWrapper',
  WEBSQL: 'webSQLStorage',
};

module.exports = localforage;
