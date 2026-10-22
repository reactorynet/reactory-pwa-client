import {
  DEFAULT_ORGANIZATION_STORAGE_KEY,
  OrganizationThemeService,
  THEME_MODE_STORAGE_KEY,
} from '../OrganizationThemeService';
import { IOrganizationBranding } from '../types';

const clientTheme: any = {
  id: 'client-theme',
  name: 'Client Theme',
  type: 'material',
  options: { palette: { mode: 'light', primary: { main: '#111111' } } },
};

const organizationTheme: any = {
  id: 'org-theme',
  name: 'acme',
  type: 'material',
  defaultThemeMode: 'light',
  options: { palette: { mode: 'light', primary: { main: '#ff0000' } }, typography: { fontFamily: 'Acme Sans' } },
  modes: [
    { id: 'acme-light', mode: 'light', name: 'Light', options: { palette: { mode: 'light', primary: { main: '#ff0000' } } } },
    { id: 'acme-dark', mode: 'dark', name: 'Dark', options: { palette: { mode: 'dark', primary: { main: '#00ff00' } } } },
  ],
};

const organizationDocument = (overrides: Partial<IOrganizationBranding> = {}): IOrganizationBranding => ({
  id: 'org-1',
  name: 'Acme Corporation',
  theme: 'acme',
  themeMode: 'light',
  themes: [organizationTheme],
  ...overrides,
});

const createStorage = (initial: Record<string, string> = {}) => {
  const values = new Map<string, string>(Object.entries(initial));

  const storage = {
    getItem: jest.fn((key: string) => (values.has(key) ? values.get(key) : null)),
    setItem: jest.fn((key: string, value: string) => {
      values.set(key, String(value));
    }),
    removeItem: jest.fn((key: string) => {
      values.delete(key);
    }),
    clear: jest.fn(() => values.clear()),
    key: jest.fn(() => null),
    get length() {
      return values.size;
    },
  };

  return storage as unknown as Storage;
};

const authenticatedUser = (overrides: any = {}) => ({
  activeTheme: clientTheme,
  loggedIn: {
    organization: { id: 'org-1', name: 'Acme Corporation' },
    memberships: [
      { organization: { id: 'org-1', name: 'Acme Corporation' } },
      { organization: { id: 'org-2', name: 'Beta Incorporated' } },
    ],
  },
  ...overrides,
});

const createReactory = (options: {
  user?: any;
  query?: (query: any, variables?: any) => Promise<any>;
} = {}) => {
  const state = {
    user: options.user === undefined ? authenticatedUser() : options.user,
    overrides: [] as any[],
    emitted: [] as string[],
    logs: [] as Array<{ message: string; params?: unknown; level?: string }>,
  };

  const reactory: any = {
    getUser: jest.fn(() => state.user),
    getTheme: jest.fn(() => state.user?.activeTheme ?? null),
    graphqlQuery: jest.fn(
      options.query
        ?? (async (_query: any, variables: any) => ({
          data: { CoreOrganization: organizationDocument({ id: variables?.id ?? 'org-1' }) },
        })),
    ),
    setThemeOverride: jest.fn((theme: any) => {
      state.overrides.push(theme);
    }),
    emit: jest.fn((event: string) => {
      state.emitted.push(event);
    }),
    log: jest.fn((message: string, params?: unknown, level?: string) => {
      state.logs.push({ message, params, level });
    }),
  };

  return { reactory, state };
};

const lastOverride = (state: { overrides: any[] }) => state.overrides[state.overrides.length - 1];

describe('OrganizationThemeService', () => {
  it('fetches the organization and publishes its theme override', async () => {
    const storage = createStorage();
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage });

    const resolution = await service.resolve();

    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(1);
    expect(reactory.graphqlQuery.mock.calls[0][1]).toEqual({ id: 'org-1' });
    expect(reactory.graphqlQuery.mock.calls[0][0]).toContain('CoreOrganization');
    expect(resolution.source).toBe('organization');
    expect(resolution.mode).toBe('light');
    expect(lastOverride(state)).toEqual(expect.objectContaining({ name: 'acme' }));
    expect((lastOverride(state).options as any).palette.primary.main).toBe('#ff0000');
    expect(state.logs).toHaveLength(0);
  });

  it('falls back to the client theme and logs when the named theme is missing (health check)', async () => {
    const storage = createStorage();
    const { reactory, state } = createReactory({
      user: authenticatedUser(),
      query: async () => ({ data: { CoreOrganization: organizationDocument({ theme: 'gone' }) } }),
    });
    const service = new OrganizationThemeService(reactory, { storage });

    const resolution = await service.resolve();

    expect(resolution.source).toBe('client');
    expect(resolution.theme).toBe(clientTheme);
    expect(lastOverride(state)).toBeNull();
    const warning = state.logs.find((entry) => entry.message.includes('"gone" is not available'));
    expect(warning).toBeDefined();
    expect(warning.level).toBe('warn');
  });

  it('uses the client theme when the organization has no theme and clears the override', async () => {
    const { reactory, state } = createReactory({
      query: async () => ({ data: { CoreOrganization: organizationDocument({ theme: null }) } }),
    });
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    const resolution = await service.resolve();

    expect(resolution.source).toBe('client');
    expect(lastOverride(state)).toBeNull();
    expect(reactory.setThemeOverride).toHaveBeenCalledWith(null);
  });

  it('does not query when the session has no organization', async () => {
    const { reactory } = createReactory({ user: { activeTheme: clientTheme, loggedIn: null } });
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    const resolution = await service.resolve();

    expect(reactory.graphqlQuery).not.toHaveBeenCalled();
    expect(resolution.source).toBe('client');
    expect(service.getActiveOrganizationId()).toBeNull();
  });

  it('resolves the organization persisted by a previous switch when the user is a member', async () => {
    const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-2' });
    const { reactory } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage });

    expect(service.getActiveOrganizationId()).toBe('org-2');

    await service.resolve();
    expect(reactory.graphqlQuery.mock.calls[0][1]).toEqual({ id: 'org-2' });
  });

  it('ignores a persisted organization the current user is not a member of', async () => {
    const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-other' });
    const { reactory } = createReactory({ user: authenticatedUser() });
    const service = new OrganizationThemeService(reactory, { storage });

    expect(service.getActiveOrganizationId()).toBe('org-1');
  });

  it('never resolves an organization for an anonymous session, even with a persisted id', async () => {
    const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-2' });
    const { reactory } = createReactory({ user: { activeTheme: null, loggedIn: null } });
    const service = new OrganizationThemeService(reactory, { storage });

    expect(service.getActiveOrganizationId()).toBeNull();

    await service.resolve();
    expect(reactory.graphqlQuery).not.toHaveBeenCalled();
  });

  it('promotes an organization switch: persists, re-resolves and emits onThemeChanged', async () => {
    const storage = createStorage();
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage });

    await service.setActiveOrganization({ id: 'org-2', name: 'Beta Incorporated' });

    expect(storage.setItem).toHaveBeenCalledWith(DEFAULT_ORGANIZATION_STORAGE_KEY, 'org-2');
    expect(reactory.graphqlQuery.mock.calls[0][1]).toEqual({ id: 'org-2' });
    expect(state.emitted).toContain('onThemeChanged');
    expect(service.getActiveOrganizationId()).toBe('org-2');
  });

  it('skips the fetch when the caller already holds the full organization document', async () => {
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await service.setActiveOrganization(organizationDocument({ id: 'org-2' }));

    expect(reactory.graphqlQuery).not.toHaveBeenCalled();
    expect(state.emitted).toContain('onThemeChanged');
    expect(lastOverride(state)).toEqual(expect.objectContaining({ name: 'acme' }));
  });

  it('re-uses the cached organization document for onThemeChanged re-application', async () => {
    const { reactory } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await service.resolve();
    await service.handleThemeChanged();

    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(1);
  });

  it('de-duplicates concurrent resolutions for the same organization', async () => {
    const { reactory } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await Promise.all([service.resolve(), service.resolve()]);

    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(1);
  });

  it('forces a fresh fetch for refreshOrganizationTheme and emits onThemeChanged', async () => {
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await service.resolve();
    await service.refreshOrganizationTheme();

    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(2);
    expect(state.emitted).toContain('onThemeChanged');
  });

  it('falls back to the client theme and logs when the fetch fails, without rejecting', async () => {
    const { reactory, state } = createReactory({
      query: async () => {
        throw new Error('network down');
      },
    });
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    const resolution = await service.resolve();

    expect(resolution.source).toBe('client');
    expect(resolution.theme).toBe(clientTheme);
    expect(lastOverride(state)).toBeNull();
    expect(state.logs.some((entry) => entry.message.includes('network down'))).toBe(true);
  });

  it('falls back when the server reports GraphQL errors', async () => {
    const { reactory, state } = createReactory({
      query: async () => ({ data: null, errors: [{ message: 'not authorised' }] }),
    });
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    const resolution = await service.resolve();

    expect(resolution.source).toBe('client');
    expect(state.logs.some((entry) => entry.message.includes('not authorised'))).toBe(true);
  });

  it('falls back when no organization document comes back', async () => {
    const { reactory, state } = createReactory({
      query: async () => ({ data: { CoreOrganization: null } }),
    });
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    const resolution = await service.resolve();

    expect(resolution.source).toBe('client');
    expect(state.logs.some((entry) => entry.message.includes('No organization found'))).toBe(true);
  });

  it('bounds a slow branding query so boot is never blocked', async () => {
    const { reactory, state } = createReactory({
      query: () => new Promise(() => { /* never settles */ }),
    });
    const service = new OrganizationThemeService(reactory, { storage: createStorage(), timeoutMs: 10 });

    const resolution = await service.resolve();

    expect(resolution.source).toBe('client');
    expect(lastOverride(state)).toBeNull();
    expect(state.logs.some((entry) => entry.message.includes('timed out'))).toBe(true);
  });

  it('falls back without a transport instead of throwing', async () => {
    const { reactory, state } = createReactory();
    delete reactory.graphqlQuery;
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    const resolution = await service.resolve();

    expect(resolution.source).toBe('client');
    expect(lastOverride(state)).toBeNull();
    expect(state.logs.some((entry) => entry.message.includes('graphqlQuery'))).toBe(true);
  });

  it('re-applies an os-mode theme when the system preference changes', async () => {
    const storage = createStorage({ [THEME_MODE_STORAGE_KEY]: 'light' });
    const { reactory, state } = createReactory({
      query: async () => ({ data: { CoreOrganization: organizationDocument({ themeMode: 'os' }) } }),
    });
    const service = new OrganizationThemeService(reactory, { storage });

    await service.resolve();
    expect(service.getLastResolution().mode).toBe('light');

    (storage.setItem as jest.Mock)(THEME_MODE_STORAGE_KEY, 'dark');
    expect(service.handleSystemModeChanged()).toBe(true);

    expect(service.getLastResolution().mode).toBe('dark');
    expect((lastOverride(state).options as any).palette.mode).toBe('dark');
    // No extra request: the cached organization document is enough.
    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(1);
  });

  it('does not re-apply on a system change when the organization picked a fixed mode', async () => {
    const storage = createStorage({ [THEME_MODE_STORAGE_KEY]: 'light' });
    const { reactory } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage });

    await service.resolve();

    expect(service.handleSystemModeChanged()).toBe(false);
  });

  it('reset drops the organization override so logout shows the client theme', async () => {
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await service.resolve();
    expect(lastOverride(state)).toEqual(expect.objectContaining({ name: 'acme' }));

    // The anon session has no active theme.
    state.user = { activeTheme: null, loggedIn: null };
    const resolution = service.reset();

    expect(resolution.source).toBe('app');
    expect(lastOverride(state)).toBeNull();
  });

  it('discards a slower response for the previous organization after a switch (last request wins)', async () => {
    const storage = createStorage();
    const betaTheme = { ...organizationTheme, name: 'beta', options: { palette: { mode: 'light', primary: { main: '#0000ff' } } } };

    // org-1's branding is slow; org-2's is answered immediately.
    let resolveOrg1: (value: any) => void = () => undefined;
    const org1Response = new Promise((resolve) => {
      resolveOrg1 = resolve;
    });

    const { reactory, state } = createReactory({
      query: (async (_query: any, variables: any) => {
        if (variables.id === 'org-1') return org1Response;
        return {
          data: {
            CoreOrganization: organizationDocument({ id: variables.id, name: 'Beta', theme: 'beta', themes: [betaTheme] }),
          },
        };
      }) as any,
    });
    const service = new OrganizationThemeService(reactory, { storage });

    // Start on org-1 (the persisted default) and leave its request in flight.
    const pending = service.resolve({ organizationId: 'org-1' });

    // The user switches to org-2 before org-1 answers.
    const switched = await service.setActiveOrganization({ id: 'org-2', name: 'Beta' });
    expect(switched.source).toBe('organization');
    expect((switched.theme as any).name).toBe('beta');
    expect((lastOverride(state) as any).name).toBe('beta');

    // Now the slow org-1 response lands. It must not overwrite org-2.
    resolveOrg1({
      data: { CoreOrganization: organizationDocument({ id: 'org-1', name: 'Acme', theme: 'acme', themes: [organizationTheme] }) },
    });
    await pending;

    expect((lastOverride(state) as any).name).toBe('beta');
    expect(service.getLastResolution().organizationId).toBe('org-2');
    expect(state.logs.some((entry) => entry.message.includes('Discarded a stale organization theme response'))).toBe(true);

    // The cache belongs to org-2 as well: a later re-apply does not resurrect
    // org-1's theme.
    await service.handleThemeChanged();
    expect(service.getLastResolution().organizationId).toBe('org-2');
    expect((lastOverride(state) as any).name).toBe('beta');
  });

  it('does not resurrect an organization override after logout', async () => {
    let resolveOrg: (value: any) => void = () => undefined;
    const response = new Promise((resolve) => {
      resolveOrg = resolve;
    });
    const { reactory, state } = createReactory({ query: (async () => response) as any });
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    const pending = service.resolve();

    // Logout while the branding request is still in flight.
    state.user = { activeTheme: null, loggedIn: null };
    service.reset();
    expect(lastOverride(state)).toBeNull();

    resolveOrg({ data: { CoreOrganization: organizationDocument() } });
    await pending;

    // No organization theme on the login screen.
    expect(lastOverride(state)).toBeNull();
  });

  it('does not join an in-flight fetch that a reset invalidated (no stuck client theme)', async () => {
    let resolveFirst: (value: any) => void = () => undefined;
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    let callCount = 0;

    const { reactory, state } = createReactory({
      query: (async () => {
        callCount += 1;
        if (callCount === 1) return firstResponse;
        return { data: { CoreOrganization: organizationDocument() } };
      }) as any,
    });
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    // A boot-time fetch is left in flight...
    const stale = service.resolve();

    // ...then the session restarts (logout/login) and asks again. The second
    // resolve must NOT be handed the stale promise: that promise resolves as
    // discarded and would leave the session on the client theme.
    service.reset();
    const second = await service.resolve();

    expect(second.source).toBe('organization');
    expect((lastOverride(state) as any).name).toBe('acme');
    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(2);

    // The abandoned response lands late and is discarded without effect.
    resolveFirst({ data: { CoreOrganization: organizationDocument() } });
    await stale;

    expect((lastOverride(state) as any).name).toBe('acme');
    expect(service.getLastResolution().source).toBe('organization');
  });

  it('does not discard a forced refresh when a cached re-application lands while it is in flight', async () => {
    let resolveRefresh: (value: any) => void = () => undefined;
    const refreshResponse = new Promise((resolve) => {
      resolveRefresh = resolve;
    });

    const updatedTheme = { ...organizationTheme, name: 'acme-v2' };
    let callCount = 0;
    const { reactory, state } = createReactory({
      query: (async () => {
        callCount += 1;
        if (callCount === 1) return { data: { CoreOrganization: organizationDocument() } };
        return refreshResponse;
      }) as any,
    });
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await service.resolve();
    expect((lastOverride(state) as any).name).toBe('acme');

    // The admin saved a theme; the forced refresh is in flight.
    const refresh = service.refreshOrganizationTheme();

    // A plain theme event re-applies the cached (pre-save) document meanwhile.
    await service.handleThemeChanged();

    // The saved theme still wins when it arrives.
    resolveRefresh({ data: { CoreOrganization: organizationDocument({ theme: 'acme-v2', themes: [updatedTheme] }) } });
    const resolution = await refresh;

    expect((resolution.theme as any).name).toBe('acme-v2');
    expect((lastOverride(state) as any).name).toBe('acme-v2');
    expect(service.getLastResolution().organizationThemeName).toBe('acme-v2');
  });

  it('matches core.OrganizationUpdatedEvent payloads against the active organization', async () => {
    const { reactory } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    // An empty payload (what the server's OrganizationOverviewTab publishes) is
    // treated as relevant: one active organization per session.
    expect(service.matchesOrganizationEvent({})).toBe(true);
    expect(service.matchesOrganizationEvent(undefined)).toBe(true);
    expect(service.matchesOrganizationEvent({ organizationId: 'org-1' })).toBe(true);
    expect(service.matchesOrganizationEvent({ organization: { id: 'org-1' } })).toBe(true);
    expect(service.matchesOrganizationEvent({ id: 'org-1' })).toBe(true);

    // An update for a different organization must not re-resolve.
    expect(service.matchesOrganizationEvent({ organizationId: 'org-2' })).toBe(false);
    expect(service.matchesOrganizationEvent({ organization: { id: 'org-2' } })).toBe(false);
  });

  it('re-resolves from the server on core.OrganizationUpdatedEvent and emits onThemeChanged', async () => {
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await service.resolve();
    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(1);

    // The admin saved a new theme; the server now returns it.
    const updatedTheme = { ...organizationTheme, name: 'acme-v2', options: { palette: { mode: 'light', primary: { main: '#123456' } } } };
    reactory.graphqlQuery.mockResolvedValueOnce({
      data: { CoreOrganization: organizationDocument({ theme: 'acme-v2', themes: [updatedTheme] }) },
    });

    const resolution = await service.handleOrganizationUpdated({ organizationId: 'org-1' });

    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(2);
    expect((resolution as any).theme.name).toBe('acme-v2');
    expect((lastOverride(state) as any).name).toBe('acme-v2');
    expect(state.emitted).toContain('onThemeChanged');
  });

  it('ignores core.OrganizationUpdatedEvent for another organization', async () => {
    const { reactory } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await service.resolve();
    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(1);

    const resolution = await service.handleOrganizationUpdated({ organizationId: 'org-2' });

    expect(resolution).toBeNull();
    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(1);
  });

  it('does not let one organization theme become the fallback for the next', async () => {
    const storage = createStorage();
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage });

    await service.setActiveOrganization(organizationDocument({ id: 'org-1' }));
    expect(lastOverride(state)).toEqual(expect.objectContaining({ name: 'acme' }));

    // The next organization has no theme: the fallback must be the *client*
    // theme from the user snapshot, never the override published for org-1.
    reactory.graphqlQuery.mockResolvedValueOnce({
      data: { CoreOrganization: organizationDocument({ id: 'org-2', theme: null }) },
    });

    const resolution = await service.setActiveOrganization({ id: 'org-2', name: 'Beta' });

    expect(resolution.source).toBe('client');
    expect(resolution.theme).toBe(clientTheme);
  });
});
