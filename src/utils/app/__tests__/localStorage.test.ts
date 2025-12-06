/**
 * LocalStorage Utility Tests
 */

import * as localStorageUtils from '../localStorage';

describe('localStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('theme functions', () => {
    it('should set and get theme', () => {
      localStorageUtils.setTheme('dark');
      expect(localStorageUtils.getTheme()).toBe('dark');
    });
  });

  describe('themeMode functions', () => {
    it('should set and get theme mode', () => {
      localStorageUtils.setThemeMode('dark');
      expect(localStorageUtils.getThemeMode()).toBe('dark');
    });
  });

  describe('route functions', () => {
    it('should set, get, and clear last attempted route', () => {
      const route = '/dashboard';
      localStorageUtils.setLastAttemptedRoute(route);
      expect(localStorageUtils.getLastAttemptedRoute()).toBe(route);
      
      localStorageUtils.clearLastAttemptedRoute();
      expect(localStorageUtils.getLastAttemptedRoute()).toBeNull();
    });
  });

  describe('hasRefreshed functions', () => {
    it('should set, get, and clear hasRefreshed flag', () => {
      localStorageUtils.setHasRefreshed(true);
      expect(localStorageUtils.getHasRefreshed()).toBe(true);
      
      localStorageUtils.clearHasRefreshed();
      expect(localStorageUtils.getHasRefreshed()).toBe(false);
    });
  });

  describe('auth token functions', () => {
    it('should set, get, and clear auth token', () => {
      const token = 'test-token-123';
      localStorageUtils.setAuthToken(token);
      expect(localStorageUtils.getAuthToken()).toBe(token);
      
      localStorageUtils.clearAuthToken();
      expect(localStorageUtils.getAuthToken()).toBeNull();
    });
  });
});
