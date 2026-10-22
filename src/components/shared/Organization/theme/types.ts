import Reactory from '@reactorynet/reactory-core';

/**
 * Theme resolution types for runtime organization branding (ORG-014).
 *
 * The server stores an organization's branding as a *name* pointer (`theme`)
 * plus the theme documents themselves (`themes`), exactly like a ReactoryClient
 * does (design decision D1 on the server). The client resolves that pointer to
 * a concrete theme object and hands it to `ReactoryApi.getTheme()`, which stays
 * the single source of truth for `App.applyTheme`.
 */

/** The concrete modes a resolved theme can be rendered in. */
export type OrganizationThemeMode = 'light' | 'dark';

/** Every mode the server accepts for `organization.themeMode`. */
export type OrganizationThemeModePreference = 'light' | 'dark' | 'os';

/** Where the effective theme came from. */
export type ThemeResolutionSource = 'organization' | 'client' | 'app';

/**
 * The subset of the `Organization` document this module needs. Kept structural
 * so tests can use plain objects and so the query can be narrowed without
 * touching the resolver.
 */
export interface IOrganizationBranding {
  id?: string;
  name?: string;
  /** Name of the active theme on the organization, or null when it has none. */
  theme?: string | null;
  /** Light, dark or os. Defaults to `dark` on the server model. */
  themeMode?: OrganizationThemeModePreference | null;
  /** Themes owned by the organization; same shape as client themes. */
  themes?: Array<Reactory.UX.IReactoryTheme | null> | null;
}

export interface IThemeResolutionInput {
  /** The organization the session is currently working in, if any. */
  organization?: IOrganizationBranding | null;
  /** `reactory.getTheme()` - the server-resolved client theme for the user. */
  clientTheme?: Reactory.UX.IReactoryTheme | null;
  /** Current OS colour scheme, used when the organization asks for `os`. */
  systemMode?: OrganizationThemeMode | null;
}

export interface IThemeResolution {
  /**
   * The theme to apply. `null` means "no organization or client theme"; the
   * caller keeps its own default (App.tsx falls back to `props.appTheme`).
   */
  theme: Reactory.UX.IReactoryTheme | null;
  source: ThemeResolutionSource;
  /** Concrete light/dark mode used, only set for organization themes. */
  mode: OrganizationThemeMode | null;
  /** The mode the organization asked for (`light` | `dark` | `os`). */
  requestedMode: OrganizationThemeModePreference | null;
  organizationId: string | null;
  organizationThemeName: string | null;
  /** Set when the organization pointer was unhealthy and we fell back. */
  warning?: string;
}
