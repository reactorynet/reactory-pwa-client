import { resolveOrganizationTheme, isUsableTheme } from '../resolveOrganizationTheme';
import { IOrganizationBranding } from '../types';

const clientTheme: any = {
  id: 'client-theme',
  name: 'Client Theme',
  type: 'material',
  defaultThemeMode: 'light',
  options: { palette: { mode: 'light', primary: { main: '#111111' } } },
};

const organizationTheme: any = {
  id: 'org-theme',
  name: 'acme',
  nameSpace: 'acme',
  version: '1.0.0',
  type: 'material',
  defaultThemeMode: 'light',
  options: {
    palette: { mode: 'light', primary: { main: '#ff0000' } },
    typography: { fontFamily: 'Acme Sans' },
    components: { MuiButton: { defaultProps: { size: 'large' } } },
  },
  modes: [
    {
      id: 'acme-light',
      mode: 'light',
      name: 'Light',
      options: { palette: { mode: 'light', primary: { main: '#ff0000' } } },
    },
    {
      id: 'acme-dark',
      mode: 'dark',
      name: 'Dark',
      options: {
        palette: { mode: 'dark', primary: { main: '#00ff00' } },
        components: { MuiButton: { defaultProps: { size: 'small' } } },
      },
    },
  ],
};

const organization = (overrides: Partial<IOrganizationBranding> = {}): IOrganizationBranding => ({
  id: 'org-1',
  name: 'Acme Corporation',
  theme: 'acme',
  themeMode: 'light',
  themes: [organizationTheme],
  ...overrides,
});

describe('resolveOrganizationTheme', () => {
  it('prefers the organization theme over the client theme', () => {
    const resolution = resolveOrganizationTheme({
      organization: organization(),
      clientTheme,
      systemMode: 'light',
    });

    expect(resolution.source).toBe('organization');
    expect(resolution.organizationThemeName).toBe('acme');
    expect(resolution.organizationId).toBe('org-1');
    expect(resolution.mode).toBe('light');
    expect(resolution.warning).toBeUndefined();
    // The resolved theme is a copy of the organization theme with the mode's
    // palette merged in; the client theme must not leak into it.
    expect(resolution.theme.name).toBe('acme');
    expect(resolution.theme.options.palette.primary.main).toBe('#ff0000');
    expect(resolution.theme.options.typography.fontFamily).toBe('Acme Sans');
  });

  it('uses the client theme when the organization has no theme', () => {
    const resolution = resolveOrganizationTheme({
      organization: organization({ theme: null }),
      clientTheme,
    });

    expect(resolution.source).toBe('client');
    expect(resolution.theme).toBe(clientTheme);
    expect(resolution.mode).toBeNull();
    expect(resolution.organizationThemeName).toBeNull();
    expect(resolution.warning).toBeUndefined();
  });

  it('falls back to the client theme when the organization names a theme it does not have', () => {
    const resolution = resolveOrganizationTheme({
      organization: organization({ theme: 'missing-theme' }),
      clientTheme,
    });

    expect(resolution.source).toBe('client');
    expect(resolution.theme).toBe(clientTheme);
    expect(resolution.organizationThemeName).toBe('missing-theme');
    expect(resolution.warning).toEqual(
      expect.stringContaining('"missing-theme" is not available on Acme Corporation'),
    );
    // The health check lists what was available, so the log is actionable.
    expect(resolution.warning).toEqual(expect.stringContaining('acme'));
  });

  it('reports an empty theme list when the named theme is missing and the organization has none', () => {
    const resolution = resolveOrganizationTheme({
      organization: organization({ theme: 'acme', themes: [] }),
      clientTheme,
    });

    expect(resolution.source).toBe('client');
    expect(resolution.warning).toEqual(
      expect.stringContaining('the organization has no themes'),
    );
  });

  it('follows prefers-color-scheme when themeMode is os', () => {
    const dark = resolveOrganizationTheme({
      organization: organization({ themeMode: 'os' }),
      clientTheme,
      systemMode: 'dark',
    });
    const light = resolveOrganizationTheme({
      organization: organization({ themeMode: 'os' }),
      clientTheme,
      systemMode: 'light',
    });

    expect(dark.requestedMode).toBe('os');
    expect(dark.mode).toBe('dark');
    expect((dark.theme.options as any).palette.mode).toBe('dark');
    // The server merge keeps base typography and merges components per mode.
    expect((dark.theme.options as any).typography.fontFamily).toBe('Acme Sans');
    expect((dark.theme.options as any).components.MuiButton.defaultProps.size).toBe('small');

    expect(light.mode).toBe('light');
    expect((light.theme.options as any).palette.mode).toBe('light');
    expect((light.theme.options as any).components.MuiButton.defaultProps.size).toBe('large');
  });

  it('defaults system mode to light when nothing has been recorded yet', () => {
    const resolution = resolveOrganizationTheme({
      organization: organization({ themeMode: 'os' }),
      clientTheme,
    });

    expect(resolution.mode).toBe('light');
  });

  it('lets the organization mode override the client mode', () => {
    const resolution = resolveOrganizationTheme({
      organization: organization({ themeMode: 'dark' }),
      clientTheme,
      systemMode: 'light',
    });

    expect(resolution.mode).toBe('dark');
    expect((resolution.theme.options as any).palette.mode).toBe('dark');
  });

  it('uses the theme default mode when the organization does not specify one', () => {
    const resolution = resolveOrganizationTheme({
      organization: organization({ themeMode: null }),
      clientTheme,
    });

    expect(resolution.mode).toBe('light');
  });

  it('falls back to dark when neither the organization nor the theme sets a mode', () => {
    const resolution = resolveOrganizationTheme({
      organization: organization({
        themeMode: null,
        themes: [{ ...organizationTheme, defaultThemeMode: null }],
      }),
      clientTheme,
    });

    expect(resolution.mode).toBe('dark');
  });

  it('returns the app fallback when there is no organization and no client theme', () => {
    const resolution = resolveOrganizationTheme({ organization: null, clientTheme: null });

    expect(resolution.source).toBe('app');
    expect(resolution.theme).toBeNull();
    expect(resolution.organizationId).toBeNull();
  });

  it('returns the client theme when there is no organization at all', () => {
    const resolution = resolveOrganizationTheme({ clientTheme });

    expect(resolution.source).toBe('client');
    expect(resolution.theme).toBe(clientTheme);
  });

  it('treats the extensions-only theme returned for a logged-out session as no client theme', () => {
    const loggedOutTheme = { extensions: { reactory: { icons: {} } } } as any;

    const resolution = resolveOrganizationTheme({ clientTheme: loggedOutTheme });

    expect(resolution.source).toBe('app');
    expect(resolution.theme).toBeNull();
  });

  it('never throws on a malformed organization document', () => {
    const resolution = resolveOrganizationTheme({
      organization: { id: 'org-1', theme: '   ', themes: null } as any,
      clientTheme,
    });

    expect(resolution.source).toBe('client');
    expect(resolution.organizationThemeName).toBeNull();
  });

  it('matches the pointer by name only (an id is not a name)', () => {
    const resolution = resolveOrganizationTheme({
      organization: organization({ theme: 'org-theme' }),
      clientTheme,
    });

    expect(resolution.source).toBe('client');
    expect(resolution.warning).toBeDefined();
  });

  it('isUsableTheme rejects nil, extensions-only and non-object themes', () => {
    expect(isUsableTheme(null)).toBe(false);
    expect(isUsableTheme(undefined)).toBe(false);
    expect(isUsableTheme({ extensions: { reactory: {} } } as any)).toBe(false);
    expect(isUsableTheme({ type: 'material' } as any)).toBe(true);
    expect(isUsableTheme({ options: {} } as any)).toBe(true);
  });
});
