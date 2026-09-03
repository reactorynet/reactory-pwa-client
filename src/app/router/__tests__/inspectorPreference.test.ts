import {
  isRouteInspectorEnabled,
  setRouteInspectorEnabled,
  toggleRouteInspectorEnabled,
  ROUTE_INSPECTOR_STORAGE_KEY,
} from '../inspectorPreference';

describe('inspectorPreference', () => {
  beforeEach(() => {
    localStorage.removeItem(ROUTE_INSPECTOR_STORAGE_KEY);
  });

  it('defaults to enabled when nothing is stored', () => {
    expect(isRouteInspectorEnabled()).toBe(true);
  });

  it('persists the preference in localStorage', () => {
    setRouteInspectorEnabled(false);
    expect(localStorage.getItem(ROUTE_INSPECTOR_STORAGE_KEY)).toBe('false');
    expect(isRouteInspectorEnabled()).toBe(false);
  });

  it('toggles the stored value', () => {
    expect(toggleRouteInspectorEnabled()).toBe(false);
    expect(toggleRouteInspectorEnabled()).toBe(true);
  });
});
