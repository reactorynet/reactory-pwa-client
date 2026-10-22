import Reactory from '@reactorynet/reactory-core';
import {
  IOrganizationBranding,
  IThemeResolution,
  IThemeResolutionInput,
  OrganizationThemeMode,
  OrganizationThemeModePreference,
  ThemeResolutionSource,
} from './types';

const LIGHT: OrganizationThemeMode = 'light';
const DARK: OrganizationThemeMode = 'dark';
const OS: OrganizationThemeModePreference = 'os';

/**
 * Resolves the theme a session should render.
 *
 * Resolution order (ORG-014). It is deliberately deterministic - the first
 * usable candidate wins and nothing is merged from a lower priority source:
 *
 *   1. Organization theme - `organization.theme` looked up by name in
 *      `organization.themes`. The organization's `themeMode` selects the
 *      light/dark option set; `os` follows the caller-supplied system mode.
 *   2. Client theme - `reactory.getTheme()` (i.e. `user.activeTheme`), already
 *      resolved server side for the user's own theme and mode.
 *   3. App default - returns `theme: null`; `App.applyTheme` keeps its existing
 *      `props.appTheme` fallback. This module never invents a theme.
 *
 * An organization pointer that names a theme which is not present on the
 * organization is unhealthy: it is reported through `warning` (the service logs
 * it through `reactory.log`) and resolution continues at step 2. The function
 * never throws and never returns a partially built theme.
 *
 * The mode merge below mirrors the server's `ApiStatus.getActiveTheme`, so an
 * organization theme renders exactly like a client theme in the same mode.
 */
export function resolveOrganizationTheme(input: IThemeResolutionInput = {}): IThemeResolution {
  const organization = input.organization ?? null;
  const clientTheme = isUsableTheme(input.clientTheme) ? (input.clientTheme as Reactory.UX.IReactoryTheme) : null;

  const organizationThemeName = normalizeThemeName(organization?.theme);
  const organizationId = organization?.id ?? null;

  if (organizationThemeName !== null) {
    const organizationTheme = findThemeByName(organization, organizationThemeName);

    if (organizationTheme !== null) {
      const requestedMode = resolveRequestedMode(organization, organizationTheme);
      const mode = requestedMode === OS
        ? toSystemMode(input.systemMode)
        : (requestedMode as OrganizationThemeMode);

      return {
        theme: applyMode(organizationTheme, mode),
        source: 'organization',
        mode,
        requestedMode,
        organizationId,
        organizationThemeName,
      };
    }

    const available = themeNames(organization);
    const label = organization?.name || organizationId || 'the active organization';
    return withClientFallback(
      {
        source: clientTheme === null ? 'app' : 'client',
        theme: clientTheme,
        mode: null,
        requestedMode: null,
        organizationId,
        organizationThemeName,
      },
      `Organization theme "${organizationThemeName}" is not available on ${label}` +
        (available.length > 0 ? ` (known themes: ${available.join(', ')})` : ' (the organization has no themes)') +
        ' - falling back to the client theme.',
    );
  }

  return withClientFallback(
    {
      source: clientTheme === null ? 'app' : 'client',
      theme: clientTheme,
      mode: null,
      requestedMode: null,
      organizationId,
      organizationThemeName: null,
    },
    undefined,
  );
}

/**
 * A theme is usable when it carries more than the `extensions` bag that
 * `ReactoryApi.getTheme()` always adds. A logged-out session returns
 * `{ extensions }`, which must not shadow the app default.
 */
export function isUsableTheme(theme: Reactory.UX.IReactoryTheme | null | undefined): boolean {
  if (theme === null || theme === undefined || typeof theme !== 'object') return false;
  return Object.keys(theme as unknown as Record<string, unknown>).some((key) => key !== 'extensions');
}

function withClientFallback(
  resolution: Omit<IThemeResolution, 'warning'>,
  warning: string | undefined,
): IThemeResolution {
  return warning === undefined ? resolution : { ...resolution, warning };
}

function normalizeThemeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length > 0 ? name : null;
}

/**
 * Looks the pointer up by *name* only. The server accepts a name or an id when
 * writing the pointer, but the ticket defines resolution by name; matching ids
 * as well would make the health check ambiguous when both are present.
 */
function findThemeByName(
  organization: IOrganizationBranding | null,
  name: string,
): Reactory.UX.IReactoryTheme | null {
  const themes = Array.isArray(organization?.themes) ? organization.themes : [];
  const match = themes.find(
    (theme) => theme !== null && theme !== undefined && theme.name === name,
  );
  return match ? (match as Reactory.UX.IReactoryTheme) : null;
}

function themeNames(organization: IOrganizationBranding | null): string[] {
  const themes = Array.isArray(organization?.themes) ? organization.themes : [];
  return themes
    .map((theme) => normalizeThemeName(theme?.name))
    .filter((name): name is string => name !== null);
}

function resolveRequestedMode(
  organization: IOrganizationBranding | null,
  theme: Reactory.UX.IReactoryTheme,
): OrganizationThemeModePreference {
  const organizationMode = normalizeMode(organization?.themeMode);
  if (organizationMode !== null) return organizationMode;

  const themeMode = normalizeMode(theme.defaultThemeMode);
  if (themeMode !== null) return themeMode;

  // The server model defaults `themeMode` to dark; keep that behaviour when an
  // older organization document omits it.
  return DARK;
}

function normalizeMode(value: unknown): OrganizationThemeModePreference | null {
  if (value === LIGHT || value === DARK || value === OS) {
    return value as OrganizationThemeModePreference;
  }
  return null;
}

function toSystemMode(value: unknown): OrganizationThemeMode {
  return normalizeMode(value) === DARK ? DARK : LIGHT;
}

/**
 * Merges the mode's option set into the theme's base options. This is a copy of
 * the server's `ActiveTheme(mode)` logic, including the component merge - keep
 * the two in step so an organization theme and a client theme of the same shape
 * render identically.
 */
function applyMode(
  theme: Reactory.UX.IReactoryTheme,
  mode: OrganizationThemeMode,
): Reactory.UX.IReactoryTheme {
  const baseOptions = isPlainObject(theme.options) ? (theme.options as Record<string, any>) : {};
  const modes = Array.isArray(theme.modes) ? theme.modes : [];
  const modeEntry = modes.find((entry) => entry !== null && entry !== undefined && entry.mode === mode);

  if (!modeEntry || !isPlainObject(modeEntry.options)) {
    return { ...theme, options: baseOptions };
  }

  const modeOptions = modeEntry.options as Record<string, any>;

  return {
    ...theme,
    options: {
      ...baseOptions,
      ...modeOptions,
      components: {
        ...(baseOptions.components || {}),
        ...(modeOptions.components || {}),
      },
      palette: modeOptions.palette || baseOptions.palette,
    },
  };
}

function isPlainObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && Array.isArray(value) === false;
}

/** Re-exported for consumers that want the source union without a second import. */
export type { ThemeResolutionSource };

export default resolveOrganizationTheme;
