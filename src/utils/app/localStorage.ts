/**
 * LocalStorage utility functions
 * @module utils/app/localStorage
 */

/**
 * Set theme in localStorage
 * @param theme - Theme identifier
 */
export const setTheme = (theme: string): void => {
  if (localStorage) {
    localStorage.setItem('theme', theme);
  }
};

/**
 * Get theme from localStorage
 * @returns Theme identifier or null
 */
export const getTheme = (): string | null => {
  if (localStorage) {
    return localStorage.getItem('theme');
  }
  return null;
};

/**
 * Set theme mode (dark/light) in localStorage
 * @param mode - 'dark' or 'light'
 */
export const setThemeMode = (mode: 'dark' | 'light'): void => {
  if (localStorage) {
    localStorage.setItem('$reactory$theme_mode', mode);
  }
};

/**
 * Get theme mode from localStorage
 * @returns Theme mode or null
 */
export const getThemeMode = (): 'dark' | 'light' | null => {
  if (localStorage) {
    const mode = localStorage.getItem('$reactory$theme_mode');
    return mode as 'dark' | 'light' | null;
  }
  return null;
};

/**
 * Set last attempted route in localStorage
 * @param route - Route path
 */
export const setLastAttemptedRoute = (route: string): void => {
  if (localStorage) {
    localStorage.setItem('$reactory.last.attempted.route$', route);
  }
};

/**
 * Get last attempted route from localStorage
 * @returns Route path or null
 */
export const getLastAttemptedRoute = (): string | null => {
  if (localStorage) {
    return localStorage.getItem('$reactory.last.attempted.route$');
  }
  return null;
};

/**
 * Remove last attempted route from localStorage
 */
export const clearLastAttemptedRoute = (): void => {
  if (localStorage) {
    localStorage.removeItem('$reactory.last.attempted.route$');
  }
};

/**
 * Set has refreshed flag in localStorage
 * @param hasRefreshed - Boolean flag
 */
export const setHasRefreshed = (hasRefreshed: boolean): void => {
  if (localStorage) {
    localStorage.setItem('hasRefreshed', hasRefreshed.toString());
  }
};

/**
 * Get has refreshed flag from localStorage
 * @returns Boolean flag
 */
export const getHasRefreshed = (): boolean => {
  if (localStorage) {
    return localStorage.getItem('hasRefreshed') === 'true';
  }
  return false;
};

/**
 * Remove has refreshed flag from localStorage
 */
export const clearHasRefreshed = (): void => {
  if (localStorage) {
    localStorage.removeItem('hasRefreshed');
  }
};

/**
 * Set auth token in localStorage
 * @param token - Authentication token
 */
export const setAuthToken = (token: string): void => {
  if (localStorage) {
    localStorage.setItem('auth_token', token);
  }
};

/**
 * Get auth token from localStorage
 * @returns Authentication token or null
 */
export const getAuthToken = (): string | null => {
  if (localStorage) {
    return localStorage.getItem('auth_token');
  }
  return null;
};

/**
 * Remove auth token from localStorage
 */
export const clearAuthToken = (): void => {
  if (localStorage) {
    localStorage.removeItem('auth_token');
  }
};

export const saveRoutes = (routes: any[]): void => {
  if (localStorage) {
    localStorage.setItem('$reactory$cached_routes$', JSON.stringify(routes));
  }
};

export const loadRoutes = (): any[] | null => {
  if (localStorage) {
    const routesJson = localStorage.getItem('$reactory$cached_routes$');
    if (routesJson) {
      try {
        const routes = JSON.parse(routesJson);
        return routes;
      } catch (error) {
        console.error('Failed to parse cached routes from localStorage', error);
        return null;
      }
    }
  }
  return null;
};