export const ROUTE_INSPECTOR_STORAGE_KEY = '$reactory.routeInspector.enabled';
export const ROUTE_INSPECTOR_PREFERENCE_EVENT = 'onRouteInspectorPreferenceChanged';

const readStoredPreference = (): boolean => {
  try {
    const stored = localStorage.getItem(ROUTE_INSPECTOR_STORAGE_KEY);
    if (stored === null) {
      return true;
    }
    return stored === 'true';
  } catch {
    return true;
  }
};

export const isRouteInspectorEnabled = (): boolean => readStoredPreference();

export const setRouteInspectorEnabled = (
  enabled: boolean,
  reactory?: { emit?: (event: string, payload?: unknown) => void },
): boolean => {
  try {
    localStorage.setItem(ROUTE_INSPECTOR_STORAGE_KEY, String(enabled));
  } catch {
    // localStorage may be unavailable in private mode / tests
  }
  reactory?.emit?.(ROUTE_INSPECTOR_PREFERENCE_EVENT, enabled);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ROUTE_INSPECTOR_PREFERENCE_EVENT, { detail: enabled }));
  }
  return enabled;
};

export const toggleRouteInspectorEnabled = (
  reactory?: { emit?: (event: string, payload?: unknown) => void },
): boolean => setRouteInspectorEnabled(!isRouteInspectorEnabled(), reactory);
