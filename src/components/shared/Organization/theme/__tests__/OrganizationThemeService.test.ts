import {
  ACTIVE_ORGANIZATION_MUTATION,
  DEFAULT_ORGANIZATION_STORAGE_KEY,
  OrganizationSwitchError,
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
  mutate?: (mutation: any, variables?: any) => Promise<any>;
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
    graphqlMutation: jest.fn(
      options.mutate
        ?? (async (_mutation: any, variables: any) => ({
          // The canonical mutation returns the organization document, so a
          // caller can re-resolve branding without a second round trip.
          data: { setActiveOrganization: { id: variables?.organizationId, name: 'Organization' } },
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

  it('treats the session\'s active organization as authoritative over a stale browser value', async () => {
    const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-2' });
    const { reactory } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage });

    // The switch is server state (`setActiveOrganization` writes the session's
    // organization), so the session wins. The older contract let a browser-local
    // value override it - exactly the second source of truth this replaced.
    expect(service.getActiveOrganizationId()).toBe('org-1');

    await service.resolve();
    expect(reactory.graphqlQuery.mock.calls[0][1]).toEqual({ id: 'org-1' });
  });

  it('uses the persisted organization when the session has no active organization', async () => {
    const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-2' });
    const user = authenticatedUser();
    const { reactory } = createReactory({
      user: { activeTheme: clientTheme, loggedIn: { ...user.loggedIn, organization: null } },
    });
    const service = new OrganizationThemeService(reactory, { storage });

    // No session organization to defer to: the browser hint is still usable
    // while the user holds a membership for it.
    expect(service.getActiveOrganizationId()).toBe('org-2');
  });

  it('does not fall back to a persisted organization the user is not a member of', async () => {
    const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-other' });
    const user = authenticatedUser();
    const { reactory } = createReactory({
      user: { activeTheme: clientTheme, loggedIn: { ...user.loggedIn, organization: null } },
    });
    const service = new OrganizationThemeService(reactory, { storage });

    expect(service.getActiveOrganizationId()).toBeNull();
  });

  it('ignores a persisted organization the current user is not a member of', async () => {
    const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-other' });
    const { reactory } = createReactory({ user: authenticatedUser() });
    const service = new OrganizationThemeService(reactory, { storage });

    expect(service.getActiveOrganizationId()).toBe('org-1');
  });

  // QF-1 regression: the anonymous session is NOT `loggedIn: null`. The server's
  // `loggedInContext` returns `{ id: 'anon', roles: ['ANON'], memberships: [],
  // organization: null }`, and the shell stores that whole object. A guard that
  // only checks for a null context lets the previous user's persisted
  // organization theme the login screen.
  describe('anonymous session (server shape: non-null context, no memberships)', () => {
    const anonymousUser = {
      activeTheme: null,
      loggedIn: {
        id: 'anon',
        roles: ['ANON'],
        memberships: [],
        organization: null,
      },
    };

    it('does not honour a seeded CoreDefaultOrganization for the anonymous context', async () => {
      const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-prev' });
      const { reactory } = createReactory({ user: anonymousUser });
      const service = new OrganizationThemeService(reactory, { storage });

      expect(service.getPersistedOrganizationId()).toBe('org-prev');
      expect(service.getActiveOrganizationId()).toBeNull();

      const resolution = await service.resolve();

      // Nothing is fetched, so the login screen cannot be branded with the
      // previous user's organization...
      expect(reactory.graphqlQuery).not.toHaveBeenCalled();
      expect(resolution.source).toBe('app');
    });

    it('recognises the anonymous context by id when the role is not carried', () => {
      const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-prev' });
      const { reactory } = createReactory({
        user: { activeTheme: null, loggedIn: { id: 'anon', memberships: [] } },
      });
      const service = new OrganizationThemeService(reactory, { storage });

      expect(service.getActiveOrganizationId()).toBeNull();
    });

    it('treats any ANON- or ANONYMOUS-role session as anonymous', () => {
      const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-prev' });
      const { reactory } = createReactory({
        user: { activeTheme: null, loggedIn: { id: 'session-1', roles: ['anonymous'], memberships: [] } },
      });
      const service = new OrganizationThemeService(reactory, { storage });

      expect(service.getActiveOrganizationId()).toBeNull();
    });

    it('does not fall back to the persisted id for a signed-in session with no memberships', () => {
      // Second line of defence: an authenticated projection that carries no
      // memberships belongs to no organization, so a stale browser value must
      // not theme it either.
      const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-prev' });
      const { reactory } = createReactory({
        user: { activeTheme: clientTheme, loggedIn: { id: 'user-1', roles: ['USER'], memberships: [], organization: null } },
      });
      const service = new OrganizationThemeService(reactory, { storage });

      expect(service.getActiveOrganizationId()).toBeNull();
    });

    it('clears the persisted organization when the session is reset on logout', async () => {
      const storage = createStorage();
      const { reactory } = createReactory();
      const service = new OrganizationThemeService(reactory, { storage });

      // A switch writes the browser hint...
      await service.setActiveOrganization('org-2');
      expect(storage.setItem).toHaveBeenCalledWith(DEFAULT_ORGANIZATION_STORAGE_KEY, 'org-2');

      // ...and logout drops it, so the next (possibly anonymous) boot has
      // nothing to inherit.
      service.reset();

      expect(storage.removeItem).toHaveBeenCalledWith(DEFAULT_ORGANIZATION_STORAGE_KEY);
      expect(service.getPersistedOrganizationId()).toBeNull();
    });
  });

  it('never resolves an organization for an anonymous session, even with a persisted id', async () => {
    const storage = createStorage({ [DEFAULT_ORGANIZATION_STORAGE_KEY]: 'org-2' });
    const { reactory } = createReactory({ user: { activeTheme: null, loggedIn: null } });
    const service = new OrganizationThemeService(reactory, { storage });

    expect(service.getActiveOrganizationId()).toBeNull();

    await service.resolve();
    expect(reactory.graphqlQuery).not.toHaveBeenCalled();
  });

  it('promotes an organization switch: persists through the mutation, re-resolves and emits onThemeChanged', async () => {
    const storage = createStorage();
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage });

    await service.setActiveOrganization({ id: 'org-2', name: 'Beta Incorporated' });

    // The write goes through the canonical document, with the id the server
    // declares as non-null.
    expect(reactory.graphqlMutation).toHaveBeenCalledTimes(1);
    expect(reactory.graphqlMutation.mock.calls[0][0]).toBe(ACTIVE_ORGANIZATION_MUTATION);
    expect(reactory.graphqlMutation.mock.calls[0][1]).toEqual({ organizationId: 'org-2' });
    // ...before the browser mirror and the branding fetch.
    expect(reactory.graphqlMutation.mock.invocationCallOrder[0])
      .toBeLessThan(reactory.graphqlQuery.mock.invocationCallOrder[0]);
    expect(storage.setItem).toHaveBeenCalledWith(DEFAULT_ORGANIZATION_STORAGE_KEY, 'org-2');
    expect(reactory.graphqlQuery.mock.calls[0][1]).toEqual({ id: 'org-2' });
    expect(state.emitted).toContain('onThemeChanged');
    expect(service.getActiveOrganizationId()).toBe('org-2');
  });

  it('leaves the current organization and theme untouched when the switch is refused', async () => {
    const storage = createStorage();
    const { reactory, state } = createReactory({
      mutate: async () => {
        throw new Error('User 1 is not an active member of organization org-9');
      },
    });
    const service = new OrganizationThemeService(reactory, { storage });

    await service.resolve();
    expect((lastOverride(state) as any).name).toBe('acme');
    const overridesBefore = state.overrides.length;
    const emittedBefore = state.emitted.length;

    await expect(service.setActiveOrganization({ id: 'org-9', name: 'Not Mine' }))
      .rejects.toBeInstanceOf(OrganizationSwitchError);

    // No theme change, no re-resolve, no local "persistence" of a value the
    // server refused, and the old organization still resolves.
    expect(state.overrides.length).toBe(overridesBefore);
    expect((lastOverride(state) as any).name).toBe('acme');
    expect(state.emitted.length).toBe(emittedBefore);
    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(1);
    expect(storage.setItem).not.toHaveBeenCalledWith(DEFAULT_ORGANIZATION_STORAGE_KEY, 'org-9');
    expect(service.getActiveOrganizationId()).toBe('org-1');
    expect(state.logs.some((entry) => entry.message.includes('not an active member'))).toBe(true);
  });

  it('refuses to switch when the host cannot persist the mutation (no client-only switch)', async () => {
    const storage = createStorage();
    const { reactory } = createReactory();
    delete (reactory as any).graphqlMutation;
    const service = new OrganizationThemeService(reactory, { storage });

    await expect(service.setActiveOrganization('org-2')).rejects.toBeInstanceOf(OrganizationSwitchError);

    expect(storage.setItem).not.toHaveBeenCalledWith(DEFAULT_ORGANIZATION_STORAGE_KEY, 'org-2');
    expect(reactory.graphqlQuery).not.toHaveBeenCalled();
  });

  it('refuses to switch when the server answers without an organization', async () => {
    const { reactory } = createReactory({
      mutate: async () => ({ data: { setActiveOrganization: null } }),
    });
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await expect(service.setActiveOrganization('org-2')).rejects.toBeInstanceOf(OrganizationSwitchError);
    expect(reactory.graphqlQuery).not.toHaveBeenCalled();
  });

  it('keeps resolving the organization it switched to while the session snapshot is stale', async () => {
    const { reactory } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await service.resolve();
    expect(service.getActiveOrganizationId()).toBe('org-1');

    // The mutation succeeded, but the host has not refreshed `getUser()` yet -
    // it still names org-1. `onThemeChanged` re-application must not go back.
    await service.setActiveOrganization('org-2');

    const reapplied = await service.handleThemeChanged();
    expect(reapplied.organizationId).toBe('org-2');
    expect(service.getActiveOrganizationId()).toBe('org-2');
  });

  it('drops the remembered switch once the session snapshot names it', async () => {
    const storage = createStorage();
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage });

    await service.setActiveOrganization('org-2');
    expect((service as any).switchedOrganizationId).toBe('org-2');

    // The host refreshed the session; the server value now carries the switch.
    const user = authenticatedUser();
    state.user = {
      activeTheme: clientTheme,
      loggedIn: { ...user.loggedIn, organization: { id: 'org-2', name: 'Beta Incorporated' } },
    };

    await service.resolve();

    expect((service as any).switchedOrganizationId).toBeNull();
    expect(service.getActiveOrganizationId()).toBe('org-2');
  });

  it('ignores a switch that names no organization and reports it', async () => {
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await service.resolve();
    const overridesBefore = state.overrides.length;

    const resolution = await service.setActiveOrganization({} as any);

    // Falls back to the current resolution: no mutation, no new fetch, no theme
    // change - an id-less request cannot name a target.
    expect(reactory.graphqlMutation).not.toHaveBeenCalled();
    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(1);
    expect(state.overrides.length).toBe(overridesBefore);
    expect(resolution.organizationId).toBe('org-1');
    expect(state.logs.some((entry) => entry.message.includes('without an id'))).toBe(true);
  });

  it('refuses the switch when the mutation answers with a GraphQL errors array', async () => {
    const storage = createStorage();
    const { reactory, state } = createReactory({
      mutate: async () => ({ data: null, errors: [{ message: 'ORGANIZATION_MEMBERSHIP_REQUIRED' }] }),
    });
    const service = new OrganizationThemeService(reactory, { storage });

    await service.resolve();
    const overridesBefore = state.overrides.length;

    await expect(service.setActiveOrganization('org-9')).rejects.toBeInstanceOf(OrganizationSwitchError);

    expect(state.overrides.length).toBe(overridesBefore);
    expect(storage.setItem).not.toHaveBeenCalledWith(DEFAULT_ORGANIZATION_STORAGE_KEY, 'org-9');
    expect(reactory.graphqlQuery).toHaveBeenCalledTimes(1);
    expect(state.logs.some((entry) => entry.message.includes('ORGANIZATION_MEMBERSHIP_REQUIRED'))).toBe(true);
  });

  it('skips the branding fetch when the caller already holds the full organization document', async () => {
    const { reactory, state } = createReactory();
    const service = new OrganizationThemeService(reactory, { storage: createStorage() });

    await service.setActiveOrganization(organizationDocument({ id: 'org-2' }));

    // Still a server write - the caller holding the document only saves the
    // branding round trip.
    expect(reactory.graphqlMutation).toHaveBeenCalledWith(
      ACTIVE_ORGANIZATION_MUTATION,
      { organizationId: 'org-2' },
    );
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

  // Failure tolerance is part of this service's contract: it runs during boot
  // and during auth transitions, where a thrown error would leave a blank
  // screen. These exercise the hostile-host paths directly.
  describe('failure tolerance', () => {
    it('survives a storage that throws on read, write and remove', async () => {
      const storage = {
        getItem: jest.fn(() => { throw new Error('storage disabled'); }),
        setItem: jest.fn(() => { throw new Error('quota exceeded'); }),
        removeItem: jest.fn(() => { throw new Error('storage disabled'); }),
        clear: jest.fn(),
        key: jest.fn(() => null),
        length: 0,
      } as unknown as Storage;
      const { reactory, state } = createReactory();
      const service = new OrganizationThemeService(reactory, { storage });

      expect(service.getPersistedOrganizationId()).toBeNull();

      const resolution = await service.resolve();
      expect(resolution.source).toBe('organization');

      await service.setActiveOrganization('org-2');
      service.reset();

      expect(state.logs.some((entry) => entry.message.includes('Could not persist the active organization'))).toBe(true);
      expect(state.logs.some((entry) => entry.message.includes('Could not clear the persisted default organization'))).toBe(true);
      expect(state.logs.some((entry) => entry.message.includes('Could not read the persisted default organization'))).toBe(true);
    });

    it('survives a setThemeOverride that throws', async () => {
      const { reactory, state } = createReactory();
      reactory.setThemeOverride = jest.fn(() => { throw new Error('api not ready'); });
      const service = new OrganizationThemeService(reactory, { storage: createStorage() });

      const resolution = await service.resolve();

      // The resolution still returns; the host simply could not be told.
      expect(resolution.source).toBe('organization');
      expect(state.logs.some((entry) => entry.message.includes('Could not publish the resolved organization theme'))).toBe(true);
    });

    it('survives an emit that throws', async () => {
      const { reactory, state } = createReactory();
      reactory.emit = jest.fn(() => { throw new Error('listener exploded'); });
      const service = new OrganizationThemeService(reactory, { storage: createStorage() });

      const resolution = await service.setActiveOrganization('org-2');

      expect(resolution.organizationId).toBe('org-2');
      expect(state.logs.some((entry) => entry.message.includes('Could not emit onThemeChanged'))).toBe(true);
    });

    it('survives a getUser that throws', async () => {
      const { reactory, state } = createReactory();
      reactory.getUser = jest.fn(() => { throw new Error('session unavailable'); });
      reactory.getTheme = jest.fn(() => { throw new Error('no theme yet'); });
      const service = new OrganizationThemeService(reactory, { storage: createStorage() });

      const resolution = await service.resolve();

      expect(resolution.source).toBe('app');
      expect(reactory.graphqlQuery).not.toHaveBeenCalled();
      expect(state.logs.some((entry) => entry.message.includes('Could not read the client theme'))).toBe(true);
    });

    it('falls back to the app theme when there is no user snapshot and getTheme throws', async () => {
      const { reactory } = createReactory({ user: null });
      reactory.getUser = jest.fn(() => null);
      reactory.getTheme = jest.fn(() => { throw new Error('no theme yet'); });
      const service = new OrganizationThemeService(reactory, { storage: createStorage() });

      const resolution = await service.resolve();

      expect(resolution.source).toBe('app');
      expect(resolution.theme).toBeNull();
    });
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
